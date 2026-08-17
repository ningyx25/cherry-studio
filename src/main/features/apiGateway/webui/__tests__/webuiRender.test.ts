// @vitest-environment jsdom
/**
 * Rendering-layer regression tests for the WebUI SPA (the inline script inside
 * `renderWebUiHtml`). These run the REAL page script in jsdom with a stubbed
 * `fetch`, so they catch render-side bugs that service-mocked route tests miss.
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

import { renderWebUiHtml } from '../webuiHtml'

const SESSIONS = [{ id: 'sess-1', agentId: 'clinic', name: '你好' }]
const MESSAGES = [
  {
    id: 'm1',
    sessionId: 'sess-1',
    role: 'user',
    data: { parts: [{ type: 'text', text: '你好' }] },
    status: 'success',
    modelId: null,
    createdAt: '2026-08-16T10:00:00.000Z'
  },
  {
    id: 'm2',
    sessionId: 'sess-1',
    role: 'assistant',
    data: { parts: [{ type: 'text', text: '你好！我是干眼症专科问诊AI助手' }] },
    status: 'success',
    modelId: null,
    createdAt: '2026-08-16T10:01:00.000Z'
  }
]

/** Build an SSE `Response` from a list of `data:` frames (the attach endpoint's shape). */
function sseResponse(window: Window, frames: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new (window as unknown as { ReadableStream: typeof ReadableStream }).ReadableStream({
    start(controller) {
      frames.forEach((f) => controller.enqueue(encoder.encode(f)))
      controller.close()
    }
  })
  return { ok: true, status: 200, body: stream } as unknown as Response
}

/** Boot the real WebUI page with a stubbed backend, then let DOMContentLoaded + fetches settle. */
async function bootPage(messages = MESSAGES): Promise<JSDOM> {
  const dom = new JSDOM(renderWebUiHtml('test-key'), {
    url: 'http://127.0.0.1:23333/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      // The page reads `marked` from a CDN <script> that jsdom cannot fetch; the inline
      // script only calls marked.parse() when rendering assistant content.
      ;(window as unknown as { marked: { parse: (s: string) => string } }).marked = { parse: (s: string) => s }
      window.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        let body: unknown
        if (url.includes('/v1/agent-sessions?agentId=')) {
          body = { sessions: SESSIONS }
        } else if (url.endsWith('/stream')) {
          // Attach endpoint — no live stream in this scenario, so the page falls back
          // to rendering the persisted (interrupted) row with its hint.
          return { ok: false, status: 404, json: async () => ({}) } as Response
        } else if (url.includes('/messages')) {
          body = { messages }
        } else if (url.includes('/v1/models')) {
          body = { object: 'list', data: [] }
        } else if (url.includes('/questionnaire/sessions')) {
          body = { sessions: [] }
        } else if (url.includes('/knowledge-bases')) {
          body = { items: [] }
        } else {
          body = {}
        }
        return { ok: true, status: 200, json: async () => body } as Response
      })
    }
  })
  // Let DOMContentLoaded handlers (initNav/refreshAllData/etc.) and their fetches settle.
  await new Promise((resolve) => setTimeout(resolve, 100))
  return dom
}

describe('WebUI render (inline script)', () => {
  it('renders each persisted message exactly once on initial load', async () => {
    const dom = await bootPage()
    const box = dom.window.document.getElementById('clinic-chat-box')
    const items = box?.querySelectorAll('.message-item') ?? []

    // Regression: refreshAllData() used to fire selectSession() (fire-and-forget) AND then
    // loadSessionMessages() for the same session — two concurrent fetches both resolving
    // after clearChatDisplay() appended the same messages twice (4 items instead of 2).
    expect(items.length).toBe(2)
    const texts = Array.from(items as NodeListOf<Element>).map(
      (el) => el.querySelector('.msg-bubble')?.textContent ?? ''
    )
    expect(texts[0]).toContain('你好')
    expect(texts[1]).toContain('干眼症专科问诊AI助手')
  })

  it('marks an interrupted (non-success) assistant message with a hint on replay', async () => {
    const interrupted = [MESSAGES[0], { ...MESSAGES[1], status: 'pending' }]
    const dom = await bootPage(interrupted)
    const box = dom.window.document.getElementById('clinic-chat-box')
    const items = box?.querySelectorAll('.message-item') ?? []

    expect(items.length).toBe(2)
    const assistantBubble = items[1].querySelector('.msg-bubble')
    expect(assistantBubble?.textContent).toContain('回复已中断')
  })

  it('continues an interrupted reply by re-streaming into the same message row', async () => {
    const interrupted = [
      MESSAGES[0],
      { ...MESSAGES[1], status: 'pending', data: { parts: [{ type: 'text', text: '干眼症是一种' }] } }
    ]
    let startBody: {
      messageId: string
      modelId: string
      messages: Array<{ role: string; content: string }>
      initialText?: string
    } | null = null
    // State machine for the attach endpoint: before the continuation is started there
    // is NO live server stream (the interrupted row is a stale leftover → 404, so the
    // page renders the "继续生成" hint); once the continuation POST lands, the server
    // stream exists and attach streams the new deltas.
    let continuationStarted = false
    const dom = new JSDOM(renderWebUiHtml('test-key'), {
      url: 'http://127.0.0.1:23333/',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      beforeParse(window) {
        ;(window as unknown as { marked: { parse: (s: string) => string } }).marked = { parse: (s: string) => s }
        ;(window as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder
        ;(window as unknown as { ReadableStream: typeof ReadableStream }).ReadableStream = ReadableStream
        window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          // Start the detached continuation stream.
          if (url.endsWith('/messages/stream') && init?.method === 'POST') {
            startBody = JSON.parse(String(init.body))
            continuationStarted = true
            return { ok: true, status: 200, json: async () => ({ messageId: startBody!.messageId }) } as Response
          }
          // Attach to the continuation stream — the server replays the NEW deltas only
          // (the pre-existing partial content is seeded client-side via initialText).
          if (url.endsWith('/stream')) {
            if (!continuationStarted) {
              return { ok: false, status: 404, json: async () => ({}) } as Response
            }
            return sseResponse(window, [
              'data: {"choices":[{"delta":{"content":"常见的眼疾病"}}]}\n\n',
              'data: [DONE]\n\n'
            ])
          }
          let body: unknown
          if (url.includes('/v1/agent-sessions?agentId=')) body = { sessions: SESSIONS }
          else if (url.includes('/messages')) body = { messages: interrupted }
          else if (url.includes('/v1/models')) body = { object: 'list', data: [] }
          else if (url.includes('/questionnaire/sessions')) body = { sessions: [] }
          else if (url.includes('/knowledge-bases')) body = { items: [] }
          else body = {}
          return { ok: true, status: 200, json: async () => body } as Response
        })
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    // The interrupted message offers a "继续生成" button.
    const box = dom.window.document.getElementById('clinic-chat-box')
    const continueBtn = Array.from((box?.querySelectorAll('button') ?? []) as NodeListOf<Element>).find(
      (b) => b.textContent === '继续生成'
    )
    expect(continueBtn).toBeTruthy()

    ;(continueBtn as HTMLElement).click()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // The continuation targets the SAME message row (m2) and seeds the partial content.
    // (Cast to the declared shape: TS narrows `startBody` to `null` because its only
    // assignments happen inside the fetch stub closure, which control-flow cannot see.)
    const start = startBody as unknown as {
      messageId: string
      modelId: string
      messages: Array<{ role: string; content: string }>
      initialText?: string
    }
    expect(start).toBeTruthy()
    expect(start.messageId).toBe('m2')
    expect(start.initialText).toBe('干眼症是一种')
    // The request replays the conversation with the partial reply as assistant context
    // plus an instruction to continue from where it stopped.
    const roles = start.messages.map((m) => m.role)
    expect(roles).toEqual(['system', 'user', 'assistant', 'user'])
    expect(start.messages[2].content).toBe('干眼症是一种')
    expect(start.messages[3].content).toContain('继续')

    // The bubble grows in place: partial content + continuation, no duplicate bubble.
    const items = box?.querySelectorAll('.message-item') ?? []
    expect(items.length).toBe(2)
    const assistantBubble = (items[1] as Element).querySelector('.msg-bubble')
    expect(assistantBubble?.textContent).toContain('干眼症是一种常见的眼疾病')
  })

  it('streams a new reply through the detached server stream (refresh-safe)', async () => {
    // The reply now runs server-side: the client POSTs /messages/stream (which creates
    // the `pending` row and launches the model call in the main process) and observes via
    // GET /messages/:id/stream. A page refresh therefore cannot interrupt the generation —
    // the refreshed page re-attaches to the same running stream.
    let startBody: { messageId: string; modelId: string; messages: Array<{ role: string; content: string }> } | null =
      null
    const dom = new JSDOM(renderWebUiHtml('test-key'), {
      url: 'http://127.0.0.1:23333/',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      beforeParse(window) {
        ;(window as unknown as { marked: { parse: (s: string) => string } }).marked = { parse: (s: string) => s }
        // jsdom implements neither the encoding API nor WHATWG streams; the page's SSE
        // reader needs both. Borrow Node's implementations.
        ;(window as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder
        ;(window as unknown as { ReadableStream: typeof ReadableStream }).ReadableStream = ReadableStream
        window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (url.endsWith('/messages/stream') && init?.method === 'POST') {
            startBody = JSON.parse(String(init.body))
            return { ok: true, status: 200, json: async () => ({ messageId: startBody!.messageId }) } as Response
          }
          if (url.endsWith('/stream')) {
            return sseResponse(window, [
              'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
              'data: {"choices":[{"delta":{"content":"，我是"}}]}\n\n',
              'data: [DONE]\n\n'
            ])
          }
          let body: unknown
          if (url.includes('/v1/agent-sessions?agentId=')) body = { sessions: SESSIONS }
          else if (url.includes('/messages')) body = { messages: [] }
          else if (url.includes('/v1/models')) body = { object: 'list', data: [] }
          else if (url.includes('/questionnaire/sessions')) body = { sessions: [] }
          else if (url.includes('/knowledge-bases')) body = { items: [] }
          else body = {}
          return { ok: true, status: 200, json: async () => body } as Response
        })
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    const input = dom.window.document.getElementById('clinic-text-input') as HTMLInputElement
    input.value = '你好'
    await (dom.window as unknown as { sendChatMessage: (view: string) => Promise<void> }).sendChatMessage('clinic')
    await new Promise((resolve) => setTimeout(resolve, 50))

    // The start request carries a client-generated message id and the chat history.
    // (Cast to the declared shape: TS narrows `startBody` to `null` — its only
    // assignments happen inside the fetch stub closure, unseen by control-flow.)
    const start = startBody as unknown as {
      messageId: string
      modelId: string
      messages: Array<{ role: string; content: string }>
    }
    expect(start).toBeTruthy()
    expect(start.messageId).toMatch(/^[0-9a-f-]{36}$/)
    expect(start.messages.map((m) => m.role)).toEqual(['system', 'user'])

    // The bubble renders the full streamed reply.
    const box = dom.window.document.getElementById('clinic-chat-box')
    const items = box?.querySelectorAll('.message-item') ?? []
    expect(items.length).toBe(2)
    const assistantBubble = (items[1] as Element).querySelector('.msg-bubble')
    expect(assistantBubble?.textContent).toContain('你好，我是')
  })
})
