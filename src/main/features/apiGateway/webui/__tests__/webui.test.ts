import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../app'
import { renderWebUiHtml } from '../webuiHtml'
import { clearWebUiStreams } from '../webuiStreams'

// Captures the StreamListener handed to AiStreamManager.streamPrompt so tests can
// drive chunks/terminals deterministically against the detached WebUI stream.
const streamManagerState = vi.hoisted(() => ({
  capturedListener: null as null | {
    onChunk: (chunk: unknown) => void
    onDone: (result?: unknown) => void
    onPaused: (result?: unknown) => void
    onError: (result: { error: Error }) => void
  },
  streamPromptCalls: [] as Array<{ streamId: string; uniqueModelId: string }>
}))

vi.mock('@application', async () => {
  const { mockApplicationFactory } = await import('@test-mocks/main/application')
  const overrides = {
    PreferenceService: { get: vi.fn(() => 'test-key') },
    ApiGatewayService: { isInternalRequestToken: vi.fn(() => true) },
    AiStreamManager: {
      streamPrompt: vi.fn((input: { streamId: string; uniqueModelId: string; listener: unknown }) => {
        streamManagerState.streamPromptCalls.push({
          streamId: input.streamId,
          uniqueModelId: input.uniqueModelId
        })
        streamManagerState.capturedListener = input.listener as typeof streamManagerState.capturedListener
        return { mode: 'started', executionIds: [] }
      })
    }
  }
  return mockApplicationFactory(overrides)
})

vi.mock('@logger', () => ({
  loggerService: {
    withContext: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
  }
}))

vi.mock('@main/i18n', () => ({
  t: (key: string) => key,
  getAppLanguage: () => 'zh-CN',
  SUPPORTED_LANGUAGES: ['zh-CN', 'en-US']
}))

vi.mock('@data/services/QuestionnaireSessionService', () => ({
  questionnaireSessionService: {
    list: vi.fn(() => [
      {
        id: 'q-session-1',
        flowQuestionnaireId: 'CHINA_DRY_EYE',
        status: 'completed',
        answers: {},
        report: { totalScore: 14, levelText: '中度干眼 (Moderate Dry Eye)' },
        createdAt: '2026-08-16T10:00:00.000Z',
        updatedAt: '2026-08-16T10:00:00.000Z'
      }
    ]),
    getById: vi.fn((id: string) => ({
      id,
      flowQuestionnaireId: 'CHINA_DRY_EYE',
      status: 'completed',
      answers: {},
      report: { totalScore: 14, levelText: '中度干眼 (Moderate Dry Eye)' },
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    create: vi.fn(() => ({
      id: 'q-new-1',
      flowQuestionnaireId: 'CHINA_DRY_EYE',
      status: 'in_progress',
      answers: {},
      report: null,
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    update: vi.fn((id: string, dto: any) => ({
      id,
      flowQuestionnaireId: 'CHINA_DRY_EYE',
      status: dto.status || 'completed',
      answers: dto.answers || {},
      report: dto.report || null,
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    delete: vi.fn()
  }
}))

vi.mock('@data/services/AgentSessionService', () => ({
  agentSessionService: {
    listByCursor: vi.fn(() => ({
      items: [
        {
          id: 'sess-1',
          agentId: 'clinic',
          name: '问诊会话 1',
          createdAt: '2026-08-16T10:00:00.000Z',
          updatedAt: '2026-08-16T10:00:00.000Z'
        }
      ],
      nextCursor: undefined
    })),
    getById: vi.fn((id: string) => ({
      id,
      agentId: 'clinic',
      name: '问诊会话 1',
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    update: vi.fn((id: string, dto: any) => ({
      id,
      agentId: 'clinic',
      name: dto.name || '问诊会话 1',
      description: dto.description,
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    create: vi.fn(() => ({
      id: 'sess-new',
      agentId: 'clinic',
      name: '新会话',
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z'
    })),
    delete: vi.fn()
  }
}))

vi.mock('@data/services/AgentSessionMessageService', () => ({
  agentSessionMessageService: {
    listSessionMessages: vi.fn((sessionId: string) => ({
      // Real service returns items newest-first (descending createdAt)
      items: [
        {
          id: 'msg-2',
          sessionId,
          role: 'assistant',
          data: {
            parts: [
              { type: 'reasoning', reasoning: '思考中' },
              { type: 'text', text: '建议就医' }
            ]
          },
          status: 'success',
          modelId: 'clinic',
          createdAt: '2026-08-16T10:01:00.000Z',
          updatedAt: '2026-08-16T10:01:00.000Z'
        },
        {
          id: 'msg-1',
          sessionId,
          role: 'user',
          data: { parts: [{ type: 'text', text: '眼睛干涩' }] },
          status: 'success',
          modelId: null,
          createdAt: '2026-08-16T10:00:00.000Z',
          updatedAt: '2026-08-16T10:00:00.000Z'
        }
      ],
      nextCursor: undefined
    })),
    saveMessage: vi.fn((params: any) => ({
      id: params.message.id || 'msg-new',
      sessionId: params.sessionId,
      role: params.message.role,
      data: params.message.data,
      status: params.message.status || 'success',
      modelId: params.message.modelId || null,
      createdAt: '2026-08-16T10:02:00.000Z',
      updatedAt: '2026-08-16T10:02:00.000Z'
    })),
    deleteSessionMessage: vi.fn()
  }
}))

vi.mock('../../utils/models', () => ({
  getModels: vi.fn(async () => ({ object: 'list', data: [] })),
  resolveGatewayModelAddress: vi.fn((modelId: string) => {
    if (modelId === 'radeon-cloud:DeepSeek-V4-Flash') {
      return {
        providerId: 'radeon-cloud',
        apiModelId: 'DeepSeek-V4-Flash',
        uniqueModelId: 'radeon-cloud::DeepSeek-V4-Flash'
      }
    }
    throw new Error(`Model "${modelId}" is not available through the API gateway`)
  })
}))

describe('WebUI Feature', () => {
  it('renders webui html content containing desktop-unified layout and shared modules', () => {
    const html = renderWebUiHtml()
    expect(html).toContain('华佗 AI')
    expect(html).toContain('智能问诊 AI')
    expect(html).toContain('科普知识 AI')
    expect(html).toContain('干眼问卷评估')
    expect(html).toContain('中国干眼调查问卷')
    expect(html).toContain('专科知识库')
    expect(html).toContain('历史测评记录 (桌面数据库同步)')
  })

  it('serves WebUI SPA on GET /web', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/web'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('华佗 AI')
    expect(body).toContain('智能问诊 AI')
  })

  it('serves WebUI SPA on GET /web/', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/web/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('华佗 AI')
  })

  it('includes webui endpoint in GET / api info', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/'))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { endpoints?: Record<string, string> }
    expect(json.endpoints?.webui).toBe('GET /web')
  })

  it('shares questionnaire sessions data via /v1/questionnaire/sessions', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/questionnaire/sessions', {
        headers: { Authorization: 'Bearer test-key' }
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { sessions: Array<{ id: string; report: { totalScore: number } }> }
    expect(json.sessions).toHaveLength(1)
    expect(json.sessions[0].id).toBe('q-session-1')
    expect(json.sessions[0].report.totalScore).toBe(14)
  })

  it('shares agent sessions data via /v1/agent-sessions', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions?agentId=clinic', {
        headers: { Authorization: 'Bearer test-key' }
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { sessions: Array<{ id: string; agentId: string }> }
    expect(json.sessions).toHaveLength(1)
    expect(json.sessions[0].agentId).toBe('clinic')
  })

  it('updates agent session title via PATCH /v1/agent-sessions/:id', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: '重命名问诊会话' })
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { id: string; name: string }
    expect(json.id).toBe('sess-1')
    expect(json.name).toBe('重命名问诊会话')
  })

  it('retrieves session messages via GET /v1/agent-sessions/:id/messages', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages', {
        headers: { Authorization: 'Bearer test-key' }
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { messages: Array<{ id: string; role: string }> }
    expect(json.messages).toHaveLength(2)
    // First message in chronological order should be the oldest (user message)
    expect(json.messages[0].role).toBe('user')
    expect(json.messages[1].role).toBe('assistant')
  })

  it('persists message via POST /v1/agent-sessions/:id/messages', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'user',
          data: { parts: [{ type: 'text', text: '新发送的消息' }] },
          status: 'success'
        })
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { id: string; sessionId: string; role: string }
    expect(json.id).toBe('msg-new')
    expect(json.sessionId).toBe('sess-1')
    expect(json.role).toBe('user')
  })

  it('translates the gateway modelId to the internal UniqueModelId when persisting a message', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'assistant',
          data: { parts: [{ type: 'text', text: '回复内容' }] },
          status: 'success',
          modelId: 'radeon-cloud:DeepSeek-V4-Flash'
        })
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { modelId: string | null }
    // The gateway-addressable id (`provider:model`, single colon) must be stored as the
    // internal UniqueModelId (`provider::model`) the `agent_session_message.model_id`
    // FK references — otherwise the insert fails with SQLITE_CONSTRAINT_FOREIGNKEY.
    expect(json.modelId).toBe('radeon-cloud::DeepSeek-V4-Flash')
  })

  it('passes a client-supplied message id through so the WebUI can upsert one row across a stream', async () => {
    const { agentSessionMessageService } = await import('@data/services/AgentSessionMessageService')
    const app = buildApp()
    const messageId = '11111111-2222-4333-8444-555555555555'
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: messageId,
          role: 'assistant',
          data: { parts: [{ type: 'text', text: '部分内容' }] },
          status: 'pending'
        })
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { id: string; status: string }
    // The id must reach saveMessage unchanged — the service upserts on (sessionId, id),
    // which is what lets the WebUI update the same row while streaming instead of
    // inserting a new row per save.
    expect(json.id).toBe(messageId)
    expect(json.status).toBe('pending')
    expect(agentSessionMessageService.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.objectContaining({ id: messageId }) })
    )
  })

  it('degrades an unresolvable modelId to null instead of failing the save', async () => {
    const app = buildApp()
    const res = await app.handle(
      new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'assistant',
          data: { parts: [{ type: 'text', text: '回复内容' }] },
          status: 'success',
          modelId: 'clinic'
        })
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { modelId: string | null }
    expect(json.modelId).toBeNull()
  })

  describe('detached WebUI reply streams (refresh-safe generation)', () => {
    const authHeaders = {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json'
    }

    beforeEach(() => {
      // The stream registry is a module-level singleton; isolate each test and
      // cancel any pending retention timers so they don't keep the runner alive.
      clearWebUiStreams()
      streamManagerState.capturedListener = null
      streamManagerState.streamPromptCalls.length = 0
    })

    async function startStream(app: ReturnType<typeof buildApp>, messageId: string) {
      return app.handle(
        new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages/stream', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            messageId,
            modelId: 'radeon-cloud:DeepSeek-V4-Flash',
            messages: [
              { role: 'system', content: '系统提示' },
              { role: 'user', content: '眼睛干涩怎么办' }
            ]
          })
        })
      )
    }

    it('starts a detached stream: creates the pending row and launches the model stream', async () => {
      const { agentSessionMessageService } = await import('@data/services/AgentSessionMessageService')
      const app = buildApp()
      const messageId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
      const res = await startStream(app, messageId)
      expect(res.status).toBe(200)
      const json = (await res.json()) as { messageId: string }
      expect(json.messageId).toBe(messageId)

      // The row is created up-front as `pending` so a refresh before the first
      // delta still finds the reply slot.
      expect(agentSessionMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          message: expect.objectContaining({ id: messageId, status: 'pending', role: 'assistant' })
        })
      )
      // The model stream runs through AiStreamManager with the INTERNAL model id.
      expect(streamManagerState.streamPromptCalls.at(-1)?.uniqueModelId).toBe('radeon-cloud::DeepSeek-V4-Flash')
    })

    it('rejects an unresolvable model with a 400', async () => {
      const app = buildApp()
      const res = await app.handle(
        new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages/stream', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            messageId: 'ffffffff-0000-4111-8222-333333333333',
            modelId: 'clinic',
            messages: [{ role: 'user', content: '你好' }]
          })
        })
      )
      expect(res.status).toBe(400)
    })

    it('replays deltas observed before attach and streams the rest live (refresh keeps the reply)', async () => {
      const app = buildApp()
      const messageId = '12121212-3434-4567-89ab-cdefabcdefab'
      await startStream(app, messageId)
      const listener = streamManagerState.capturedListener
      expect(listener).toBeTruthy()

      // Two deltas land BEFORE the client attaches — this is the refresh scenario:
      // the page went away and comes back; the server kept generating.
      listener!.onChunk({ type: 'text-delta', delta: '你好，' })
      listener!.onChunk({ type: 'text-delta', delta: '建议先休息。' })

      const attachRes = await app.handle(
        new Request(`http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages/${messageId}/stream`, {
          headers: { Authorization: 'Bearer test-key' }
        })
      )
      expect(attachRes.status).toBe(200)
      expect(attachRes.headers.get('content-type')).toContain('text/event-stream')

      // The replay must contain BOTH pre-attach deltas (each read() pulls one SSE frame,
      // so keep reading until the second replay frame shows up).
      const reader = attachRes.body!.getReader()
      const decoder = new TextDecoder()
      let received = ''
      const readUntil = async (target: string) => {
        const deadline = Date.now() + 2000
        while (!received.includes(target) && Date.now() < deadline) {
          const { value, done } = await reader.read()
          if (done) break
          if (!value) break
          received += decoder.decode(value, { stream: true })
        }
        expect(received).toContain(target)
      }
      await readUntil('建议先休息。')
      expect(received).toContain('你好，')

      // A delta arriving AFTER attach reaches the live connection, then the
      // terminal closes it with [DONE].
      listener!.onChunk({ type: 'text-delta', delta: '如持续不适请就医。' })
      listener!.onDone({ status: 'success' })
      await readUntil('data: [DONE]')
      expect(received).toContain('如持续不适请就医。')
    })

    it('persists the accumulated content as success when the stream completes', async () => {
      const { agentSessionMessageService } = await import('@data/services/AgentSessionMessageService')
      const app = buildApp()
      const messageId = '45454545-6767-489a-bcde-fabcdefabcde'
      await startStream(app, messageId)
      const listener = streamManagerState.capturedListener
      listener!.onChunk({ type: 'text-delta', delta: '完整回复' })
      listener!.onDone({ status: 'success' })

      expect(agentSessionMessageService.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            id: messageId,
            status: 'success',
            data: { parts: [{ type: 'text', text: '完整回复' }] }
          })
        })
      )
    })

    it('returns 404 when attaching to a message with no known stream', async () => {
      const app = buildApp()
      const res = await app.handle(
        new Request('http://127.0.0.1:23333/v1/agent-sessions/sess-1/messages/does-not-exist/stream', {
          headers: { Authorization: 'Bearer test-key' }
        })
      )
      expect(res.status).toBe(404)
    })
  })
})
