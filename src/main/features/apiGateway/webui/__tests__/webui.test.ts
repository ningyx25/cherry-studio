import { describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../app'
import { renderWebUiHtml } from '../webuiHtml'

vi.mock('@application', async () => {
  const { mockApplicationFactory } = await import('@test-mocks/main/application')
  const overrides = {
    PreferenceService: { get: vi.fn(() => 'test-key') },
    ApiGatewayService: { isInternalRequestToken: vi.fn(() => true) }
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
})
