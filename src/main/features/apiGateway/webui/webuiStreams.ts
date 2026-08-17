/**
 * Server-side WebUI reply streams.
 *
 * The WebUI's assistant replies run as DETACHED main-process streams instead of
 * being tied to the browser's HTTP connection: `startWebUiStream` launches an
 * `AiStreamManager` prompt stream whose listener persists every delta into the
 * agent-session message row and buffers the deltas in memory. The browser only
 * observes via `attachWebUiStream` (replay + live SSE), so a page refresh —
 * which kills the browser connection — does NOT interrupt the model call: the
 * stream keeps running in the background and the refreshed page re-attaches to
 * the same stream, exactly like a web chat app.
 *
 * The stream is keyed by the assistant message id (the same id the message row
 * is upserted with), so the row and the stream always agree.
 */

import { application } from '@application'
import { agentSessionMessageService } from '@data/services/AgentSessionMessageService'
import { loggerService } from '@logger'
import type { StreamErrorResult, StreamListener } from '@main/ai/streamManager'
import type { CherryMessagePart } from '@shared/data/types/message'
import type { UniqueModelId } from '@shared/data/types/model'
import type { UIMessageChunk } from 'ai'
import { v4 as uuidv4 } from 'uuid'

import { type InputParamsMap, MessageConverterFactory } from '../adapters'
import { resolveGatewayModelAddress } from '../utils/models'

const logger = loggerService.withContext('WebUiStreams')

/** Upstream idle-chunk timeout for a detached WebUI stream. */
const WEBUI_STREAM_IDLE_TIMEOUT_MS = 20 * 60_000
/** How long a finished stream stays attachable (replay) before eviction. */
const WEBUI_STREAM_RETENTION_MS = 5 * 60_000
/** Bounded delta ring buffer — a chatty model can't grow memory unboundedly. */
const WEBUI_STREAM_MAX_EVENTS = 10_000
/** Throttle for mid-stream persistence; terminal saves always run immediately. */
const WEBUI_PERSIST_INTERVAL_MS = 1_000

/** One observed content delta, replayed verbatim to attaching clients. */
export interface WebUiStreamEvent {
  type: 'text' | 'reasoning'
  delta: string
}

export type WebUiStreamStatus = 'streaming' | 'done' | 'error' | 'paused'

/** One attached SSE observer. The entry fans deltas/terminals out to these. */
interface WebUiStreamSubscriber {
  write: (frame: string) => void
  close: () => void
}

interface WebUiStreamEntry {
  status: WebUiStreamStatus
  events: WebUiStreamEvent[]
  /** Accumulated content, persisted into the message row while streaming. */
  text: string
  reasoning: string
  /** Terminal error message when `status === 'error'`. */
  errorMessage?: string
  /** Set once the terminal persistence has run (idempotent terminal saves). */
  finalized: boolean
  subscribers: Set<WebUiStreamSubscriber>
  evictTimer?: ReturnType<typeof setTimeout>
}

const streams = new Map<string, WebUiStreamEntry>()

/** Test hook: drop all in-memory stream state. */
export function clearWebUiStreams(): void {
  for (const entry of streams.values()) {
    if (entry.evictTimer) clearTimeout(entry.evictTimer)
  }
  streams.clear()
}

/** Whether a stream for this message is still generating (attachable as live). */
export function isWebUiStreamLive(messageId: string): boolean {
  return streams.get(messageId)?.status === 'streaming'
}

/** OpenAI-shaped SSE frame for one content delta. */
function formatDeltaFrame(event: WebUiStreamEvent): string {
  const delta = event.type === 'reasoning' ? { reasoning_content: event.delta } : { content: event.delta }
  return `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
}

function formatErrorFrame(message: string): string {
  return `data: ${JSON.stringify({ error: { message } })}\n\n`
}

/**
 * Start a detached assistant reply stream for the WebUI.
 *
 * Creates the message row as `pending`, launches the model stream, and returns
 * immediately — the caller responds to the browser with the message id and the
 * browser attaches via `attachWebUiStream`. Throws (with `status`) on unknown
 * model / duplicate message id so the route can surface a 4xx.
 */
export function startWebUiStream(input: {
  sessionId: string
  messageId: string
  modelId: string
  /** OpenAI chat-completions shaped messages (what the WebUI already sends). */
  messages: Array<{ role: string; content?: unknown }>
  /** Pre-existing partial content (continue-generation seeds the resumed row). */
  initialText?: string
  initialThinking?: string
}): { messageId: string } {
  const { sessionId, messageId } = input

  const existing = streams.get(messageId)
  if (existing) {
    // A still-running stream owns this message — refuse to double-start it.
    if (existing.status === 'streaming') {
      throw Object.assign(new Error(`A stream for message "${messageId}" is already running`), { status: 409 })
    }
    // A settled (retained) entry — continue-generation re-opens the same message.
    // Drop the stale entry so a fresh stream can take over the row.
    if (existing.evictTimer) clearTimeout(existing.evictTimer)
    streams.delete(messageId)
  }
  let uniqueModelId: UniqueModelId
  try {
    uniqueModelId = resolveGatewayModelAddress(input.modelId).uniqueModelId
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { status: 400 })
  }
  const internalModelId = uniqueModelId

  // Reuse the gateway's OpenAI converter so the WebUI's messages reach the model
  // exactly like `/v1/chat/completions` would shape them. The WebUI sends a loose
  // role/content shape (validated by the route's zod schema); the converter narrows it.
  const uiMessages = MessageConverterFactory.create('openai').toUIMessages({
    model: input.modelId,
    messages: input.messages as InputParamsMap['openai']['messages']
  })

  const entry: WebUiStreamEntry = {
    status: 'streaming',
    events: [],
    text: input.initialText ?? '',
    reasoning: input.initialThinking ?? '',
    finalized: false,
    subscribers: new Set()
  }
  streams.set(messageId, entry)

  /** Upsert the message row with the accumulated parts at the given status. */
  const persistParts = (status: 'pending' | 'success' | 'error' | 'paused'): void => {
    try {
      const parts: CherryMessagePart[] = []
      if (entry.reasoning) parts.push({ type: 'reasoning', text: entry.reasoning })
      if (entry.text) parts.push({ type: 'text', text: entry.text })
      agentSessionMessageService.saveMessage({
        sessionId,
        message: {
          id: messageId,
          role: 'assistant',
          data: { parts },
          status,
          modelId: internalModelId
        }
      })
    } catch (error) {
      logger.warn('Failed to persist WebUI stream message', { sessionId, messageId, status, error })
    }
  }

  // Create the row up-front so even a refresh before the first delta keeps the
  // reply slot (status `pending` → the refreshed page re-attaches to this stream).
  // Continue-generation seeds it with the partial content it is resuming from.
  persistParts('pending')

  let lastPersistAt = 0
  const persistThrottled = (): void => {
    const now = Date.now()
    if (now - lastPersistAt < WEBUI_PERSIST_INTERVAL_MS) return
    lastPersistAt = now
    persistParts('pending')
  }

  const finalize = (status: 'success' | 'error' | 'paused'): void => {
    if (entry.finalized) return
    entry.finalized = true
    if (!entry.text && !entry.reasoning) {
      // Settled with no content at all (empty reply, or a stream that never
      // produced a delta) — drop the placeholder row so the history does not
      // keep an empty message.
      try {
        agentSessionMessageService.deleteSessionMessage(sessionId, messageId)
      } catch (error) {
        logger.warn('Failed to remove empty WebUI stream message', { sessionId, messageId, error })
      }
    } else {
      persistParts(status)
    }
    // Keep the entry around briefly so a late attach can still replay the tail.
    // Unref'd so a pending eviction never holds the process open at shutdown.
    entry.evictTimer = setTimeout(() => streams.delete(messageId), WEBUI_STREAM_RETENTION_MS)
    entry.evictTimer.unref?.()
  }

  /** Close every attached observer with the terminal frames. */
  const notifyTerminal = (): void => {
    for (const subscriber of entry.subscribers) {
      try {
        if (entry.status === 'error') subscriber.write(formatErrorFrame(entry.errorMessage ?? 'stream error'))
        subscriber.write('data: [DONE]\n\n')
      } catch {
        // The observer's connection is already gone — the close below still cleans up.
      }
      subscriber.close()
    }
    entry.subscribers.clear()
  }

  const listener: StreamListener = {
    id: `webui:${messageId}`,
    onChunk: (chunk: UIMessageChunk) => {
      let event: WebUiStreamEvent | undefined
      if (chunk.type === 'text-delta' && chunk.delta) {
        entry.text += chunk.delta
        event = { type: 'text', delta: chunk.delta }
      } else if (chunk.type === 'reasoning-delta' && chunk.delta) {
        entry.reasoning += chunk.delta
        event = { type: 'reasoning', delta: chunk.delta }
      }
      if (!event) return
      if (entry.events.length >= WEBUI_STREAM_MAX_EVENTS) entry.events.shift()
      entry.events.push(event)
      persistThrottled()
      for (const subscriber of entry.subscribers) subscriber.write(formatDeltaFrame(event))
    },
    onDone: () => {
      entry.status = 'done'
      finalize('success')
      notifyTerminal()
      logger.info('WebUI stream completed', { sessionId, messageId })
    },
    onPaused: () => {
      // Pause = idle-timeout / abort, not a clean completion.
      entry.status = 'paused'
      finalize('paused')
      notifyTerminal()
      logger.warn('WebUI stream paused before completion', { sessionId, messageId })
    },
    onError: (result: StreamErrorResult) => {
      entry.status = 'error'
      entry.errorMessage = result.error?.message ?? 'stream error'
      finalize('error')
      notifyTerminal()
      logger.error('WebUI stream errored', result.error as Error, { sessionId, messageId })
    },
    // Detached by design: the stream must survive the browser going away.
    isAlive: () => true
  }

  try {
    application.get('AiStreamManager').streamPrompt({
      streamId: `webui-${uuidv4()}`,
      uniqueModelId: internalModelId,
      messages: uiMessages,
      listener,
      contextOwner: 'caller',
      idleTimeoutMs: WEBUI_STREAM_IDLE_TIMEOUT_MS
    })
  } catch (error) {
    // The stream never opened — settle the row and drop the entry.
    entry.status = 'error'
    entry.errorMessage = error instanceof Error ? error.message : String(error)
    finalize('error')
    streams.delete(messageId)
    throw error
  }

  return { messageId }
}

/**
 * Attach to a WebUI reply stream: replay every delta observed so far, then keep
 * streaming live deltas as OpenAI-shaped SSE until the stream settles. Returns
 * `undefined` when no stream is known for the message (finished + evicted, or
 * never started — e.g. after an app restart).
 */
export function attachWebUiStream(messageId: string, signal?: AbortSignal): Response | undefined {
  const entry = streams.get(messageId)
  if (!entry) return undefined

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const write = (frame: string): void => {
        if (closed) return
        controller.enqueue(encoder.encode(frame))
      }
      // The observer is created up-front (so safeClose can always reference it) and only
      // added to the entry's subscriber set when the stream is still live — for a settled
      // stream the delete below is a harmless no-op.
      const subscriber: WebUiStreamSubscriber = { write, close: () => {} }
      const safeClose = (): void => {
        if (closed) return
        closed = true
        entry.subscribers.delete(subscriber)
        signal?.removeEventListener('abort', onAbort)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      subscriber.close = safeClose
      const onAbort = (): void => {
        // The browser went away — the detached stream keeps running.
        safeClose()
      }

      // Replay everything observed so far, then the terminal marker if it already settled.
      for (const event of entry.events) write(formatDeltaFrame(event))
      let replayedUpTo = entry.events.length
      if (entry.status !== 'streaming') {
        if (entry.status === 'error') write(formatErrorFrame(entry.errorMessage ?? 'stream error'))
        write('data: [DONE]\n\n')
        safeClose()
        return
      }

      // Still live — subscribe for the remaining deltas.
      entry.subscribers.add(subscriber)

      // The stream may have settled between the status check and the subscription
      // (single-threaded, so only a synchronous settle could — re-check anyway so a
      // terminal firing right after registration still reaches this connection).
      if (entry.status !== 'streaming') {
        for (; replayedUpTo < entry.events.length; replayedUpTo += 1) {
          write(formatDeltaFrame(entry.events[replayedUpTo]))
        }
        if (entry.status === 'error') write(formatErrorFrame(entry.errorMessage ?? 'stream error'))
        write('data: [DONE]\n\n')
        safeClose()
        return
      }

      if (signal) {
        if (signal.aborted) onAbort()
        else signal.addEventListener('abort', onAbort, { once: true })
      }
    },
    cancel() {
      // Reader cancelled — nothing to tear down; the detached stream keeps running.
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
