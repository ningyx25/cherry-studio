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

describe('WebUI Feature', () => {
  it('renders webui html content containing core modules', () => {
    const html = renderWebUiHtml()
    expect(html).toContain('华佗 AI 智能助手')
    expect(html).toContain('智能问诊 AI')
    expect(html).toContain('科普知识 AI')
    expect(html).toContain('干眼专科问卷评估')
    expect(html).toContain('中国干眼调查问卷')
    expect(html).toContain('专科知识库')
  })

  it('serves WebUI SPA on GET /web', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/web'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('华佗 AI 智能助手')
    expect(body).toContain('智能问诊 AI')
  })

  it('serves WebUI SPA on GET /web/', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/web/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('华佗 AI 智能助手')
  })

  it('includes webui endpoint in GET / api info', async () => {
    const app = buildApp()
    const res = await app.handle(new Request('http://127.0.0.1:23333/'))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { endpoints?: Record<string, string> }
    expect(json.endpoints?.webui).toBe('GET /web')
  })
})
