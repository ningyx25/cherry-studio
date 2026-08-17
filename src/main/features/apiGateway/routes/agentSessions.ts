import { agentSessionMessageService } from '@data/services/AgentSessionMessageService'
import { agentSessionService } from '@data/services/AgentSessionService'
import { loggerService } from '@logger'
import { Elysia } from 'elysia'
import * as z from 'zod'

import { resolveGatewayModelAddress } from '../utils/models'
import { attachWebUiStream, startWebUiStream } from '../webui'

const logger = loggerService.withContext('AgentSessionRoutes')

const ListQuerySchema = z.object({
  agentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
})

const CreateSessionBodySchema = z.object({
  agentId: z.string(),
  name: z.string().optional().default('新对话')
})

const UpdateSessionBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional()
})

const ListMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional()
})

const SaveMessageBodySchema = z.object({
  // Optional client-supplied message id so the WebUI can upsert one assistant message
  // across a stream (create as `pending`, update parts while streaming, finish as
  // `success`) instead of only persisting once the stream completes — a refresh mid
  // stream would otherwise lose the reply. Without an id each POST inserts a new row.
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  data: z.any().default({ parts: [] }),
  status: z.enum(['pending', 'success', 'error', 'paused']).optional().default('success'),
  modelId: z.string().nullable().optional()
})

const StartStreamBodySchema = z.object({
  // Client-generated assistant message id — the stream and the message row share it,
  // so a refreshed page finds the `pending` row and re-attaches to the same stream.
  messageId: z.string().min(1),
  modelId: z.string().min(1),
  // OpenAI chat-completions shaped history (system/user/assistant).
  messages: z.array(z.object({ role: z.string(), content: z.any() })).min(1),
  // Continue-generation seeds: the partial content the resumed stream builds on.
  initialText: z.string().optional(),
  initialThinking: z.string().optional()
})

/**
 * Map the gateway-addressable model id (`providerId:apiModelId`, single colon —
 * the shape `/v1/models` advertises) to the internal `UniqueModelId`
 * (`providerId::modelId`) that `agent_session_message.model_id` FK references.
 * The WebUI picks its model from `/v1/models`, so without this translation the
 * FK lookup against `user_model.id` fails and the message insert is rejected.
 * Unresolvable ids (e.g. the WebUI's `clinic`/`pop-science` agent-id fallbacks)
 * degrade to `null` rather than failing the save — matching the desktop app's
 * user messages, which persist with a null model id.
 */
function toInternalModelId(modelId: string | null | undefined): string | null {
  if (!modelId) return null
  try {
    return resolveGatewayModelAddress(modelId).uniqueModelId
  } catch (error) {
    logger.warn('Agent session message saved without model attribution (unresolvable modelId)', {
      modelId,
      error
    })
    return null
  }
}

export const agentSessionRoutes = new Elysia({ prefix: '/agent-sessions' })
  .get(
    '/',
    ({ query }) => {
      try {
        const parsed = ListQuerySchema.parse(query)
        const res = agentSessionService.listByCursor({
          agentId: parsed.agentId,
          limit: parsed.limit ?? 50
        })
        return { sessions: res.items, nextCursor: res.nextCursor }
      } catch (error) {
        logger.error('Failed to list agent sessions', error as Error)
        return { sessions: [], nextCursor: undefined }
      }
    },
    { detail: { hide: true } }
  )
  .get(
    '/:id',
    ({ params }) => {
      return agentSessionService.getById(params.id)
    },
    { detail: { hide: true } }
  )
  .patch(
    '/:id',
    ({ params, body }) => {
      const parsed = UpdateSessionBodySchema.parse(body)
      return agentSessionService.update(params.id, parsed)
    },
    { detail: { hide: true } }
  )
  .post(
    '/',
    ({ body }) => {
      const parsed = CreateSessionBodySchema.parse(body)
      const session = agentSessionService.create({
        agentId: parsed.agentId,
        name: parsed.name,
        workspace: { type: 'system' }
      })
      return session
    },
    { detail: { hide: true } }
  )
  .delete(
    '/:id',
    ({ params }) => {
      agentSessionService.delete(params.id)
      return { success: true }
    },
    { detail: { hide: true } }
  )
  .get(
    '/:id/messages',
    ({ params, query }) => {
      try {
        const parsed = ListMessagesQuerySchema.parse(query)
        const res = agentSessionMessageService.listSessionMessages(params.id, {
          limit: parsed.limit ?? 100,
          cursor: parsed.cursor
        })
        // Reverse newest-first order so messages are chronological (oldest to newest)
        const messages = [...res.items].reverse()
        return { messages, nextCursor: res.nextCursor }
      } catch (error) {
        logger.error('Failed to list agent session messages', error as Error)
        return { messages: [], nextCursor: undefined }
      }
    },
    { detail: { hide: true } }
  )
  .post(
    '/:id/messages',
    ({ params, body }) => {
      const parsed = SaveMessageBodySchema.parse(body)
      const entity = agentSessionMessageService.saveMessage({
        sessionId: params.id,
        message: {
          id: parsed.id,
          role: parsed.role,
          data: parsed.data,
          status: parsed.status,
          modelId: toInternalModelId(parsed.modelId)
        }
      })
      return entity
    },
    { detail: { hide: true } }
  )
  // Start a DETACHED assistant reply stream. The model call runs in the main
  // process independent of the browser connection, and the message row is
  // persisted incrementally — so a page refresh does not interrupt the reply.
  // Returns the message id; the client then observes it via the GET …/stream
  // endpoint (and a refreshed page re-attaches to the same running stream).
  .post(
    '/:id/messages/stream',
    ({ params, body }) => {
      const parsed = StartStreamBodySchema.parse(body)
      try {
        return startWebUiStream({
          sessionId: params.id,
          messageId: parsed.messageId,
          modelId: parsed.modelId,
          messages: parsed.messages,
          initialText: parsed.initialText,
          initialThinking: parsed.initialThinking
        })
      } catch (error) {
        const status = (error as { status?: number }).status ?? 500
        logger.error('Failed to start WebUI stream', error as Error)
        return new Response(JSON.stringify({ error: { message: (error as Error).message } }), {
          status,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    },
    { detail: { hide: true } }
  )
  // Attach to a running (or recently finished) WebUI reply stream as SSE.
  // Replays every delta observed so far, then streams live deltas until the
  // stream settles. 404 when no stream is known (evicted / app restarted).
  .get(
    '/:id/messages/:messageId/stream',
    ({ params, request }) => {
      const response = attachWebUiStream(params.messageId, request.signal)
      if (!response) {
        return new Response(JSON.stringify({ error: { message: 'No active stream for this message' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return response
    },
    { detail: { hide: true } }
  )
  .delete(
    '/:id/messages/:messageId',
    ({ params }) => {
      agentSessionMessageService.deleteSessionMessage(params.id, params.messageId)
      return { success: true }
    },
    { detail: { hide: true } }
  )
