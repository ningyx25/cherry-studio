import { Elysia } from 'elysia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Exercises `POST /v1/audio/transcriptions` against the real route with
 * `transcribeAudio` and `PreferenceService` stubbed, wrapped in a bearer-guard
 * app mirroring the production `/v1` scope so auth behavior is covered too.
 */

const { mockTranscribe, mockPreferenceGet } = vi.hoisted(() => ({
  mockTranscribe: vi.fn<(params: unknown) => Promise<{ text: string }>>(),
  mockPreferenceGet: vi.fn<(key: string) => unknown>(() => null)
}))

vi.mock('@main/ai/audio/transcription', () => ({ transcribeAudio: mockTranscribe }))

vi.mock('@application', async () => {
  const { mockApplicationFactory } = await import('@test-mocks/main/application')
  return mockApplicationFactory({ PreferenceService: { get: mockPreferenceGet } })
})

import { audioRoutes } from '../audio'

const app = new Elysia({ prefix: '/v1' })
  .guard({
    as: 'scoped',
    beforeHandle: ({ headers, set }) => {
      if (headers['x-api-key'] !== 'test-key') {
        set.status = 401
        return { error: 'unauthorized' }
      }
      return undefined
    }
  })
  .use(audioRoutes)

function postTranscription(
  fields: Record<string, string | Blob>,
  headers: Record<string, string> = { 'x-api-key': 'test-key' }
) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return app.handle(new Request('http://localhost/v1/audio/transcriptions', { method: 'POST', headers, body: form }))
}

describe('POST /v1/audio/transcriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPreferenceGet.mockReturnValue(null)
    mockTranscribe.mockResolvedValue({ text: '你好世界' })
  })

  it('requires authentication', async () => {
    const res = await postTranscription({ file: new Blob(['audio']) }, {})
    expect(res.status).toBe(401)
  })

  it('transcribes an uploaded file with an explicitly supplied provider + model', async () => {
    const res = await postTranscription({
      file: new Blob(['audio'], { type: 'audio/webm' }),
      provider_id: 'openai',
      model: 'whisper-1',
      language: 'zh'
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: '你好世界' })
    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'openai', modelId: 'whisper-1', language: 'zh' })
    )
  })

  it('falls back to the configured voice-input model when none is posted', async () => {
    mockPreferenceGet.mockReturnValue('relay::sensevoice')

    await postTranscription({ file: new Blob(['audio']) })

    expect(mockTranscribe).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'relay', modelId: 'sensevoice' }))
  })

  it('400s when no file is provided', async () => {
    const res = await postTranscription({ model: 'whisper-1', provider_id: 'openai' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mockTranscribe).not.toHaveBeenCalled()
  })

  it('flips to 500 when no model is configured and none is posted', async () => {
    mockPreferenceGet.mockReturnValue(null)
    const res = await postTranscription({ file: new Blob(['audio']) })
    expect(res.status).toBe(500)
    expect(mockTranscribe).not.toHaveBeenCalled()
  })
})
