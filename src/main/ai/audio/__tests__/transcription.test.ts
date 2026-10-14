import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock ProviderService at the module boundary to avoid the DB, and stub fetch
// via deps injection to capture the exact URL / headers / FormData sent.
const { getByProviderIdMock, getRotatedApiKeyMock } = vi.hoisted(() => ({
  getByProviderIdMock: vi.fn(),
  getRotatedApiKeyMock: vi.fn()
}))

vi.mock('@main/data/services/ProviderService', () => ({
  providerService: {
    getByProviderId: getByProviderIdMock,
    getRotatedApiKey: getRotatedApiKeyMock
  }
}))

const { transcribeAudio, TranscriptionError } = await import('../transcription')

const provider = {
  id: 'openai',
  endpointConfigs: {
    'openai-chat-completions': { baseUrl: 'https://api.openai.com/v1' }
  }
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

beforeEach(() => {
  vi.clearAllMocks()
  getByProviderIdMock.mockReturnValue(provider)
  getRotatedApiKeyMock.mockReturnValue('sk-test')
})

describe('transcribeAudio', () => {
  it('posts multipart form to the provider transcription URL with bearer auth', async () => {
    const fetchImpl = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
    fetchImpl.mockResolvedValue(okResponse({ text: '你好世界' }))

    const result = await transcribeAudio(
      { providerId: 'openai', modelId: 'whisper-1', audio: new Uint8Array([1, 2, 3]), language: 'zh' },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    )

    expect(result).toEqual({ text: '你好世界' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBe('Bearer sk-test')
    const form = init?.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('model')).toBe('whisper-1')
    expect(form.get('language')).toBe('zh')
    const file = form.get('file') as File
    expect(file.name).toBe('audio.webm')
  })

  it('prefers the audio-transcription endpoint config when present and strips trailing slashes', async () => {
    getByProviderIdMock.mockReturnValue({
      id: 'relay',
      endpointConfigs: {
        'openai-audio-transcription': { baseUrl: 'https://relay.example.com/v1/' },
        'openai-chat-completions': { baseUrl: 'https://chat.example.com/v1' }
      }
    })
    const fetchImpl = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
    fetchImpl.mockResolvedValue(okResponse({ text: 'ok' }))

    await transcribeAudio(
      { providerId: 'relay', modelId: 'sensevoice', audio: new Uint8Array([0]) },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    )

    expect(fetchImpl.mock.calls[0][0]).toBe('https://relay.example.com/v1/audio/transcriptions')
  })

  it('throws TranscriptionError when the provider has no base URL', async () => {
    getByProviderIdMock.mockReturnValue({ id: 'empty', endpointConfigs: {} })

    await expect(
      transcribeAudio({ providerId: 'empty', modelId: 'whisper-1', audio: new Uint8Array([0]) })
    ).rejects.toBeInstanceOf(TranscriptionError)
  })

  it('throws with status and body excerpt on non-200', async () => {
    const fetchImpl = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
    fetchImpl.mockResolvedValue(new Response('{"error":"bad model"}', { status: 400 }))

    await expect(
      transcribeAudio(
        { providerId: 'openai', modelId: 'nope', audio: new Uint8Array([0]) },
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toThrow('status 400')
  })

  it('wraps network failures in TranscriptionError', async () => {
    const fetchImpl = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
    fetchImpl.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(
      transcribeAudio(
        { providerId: 'openai', modelId: 'whisper-1', audio: new Uint8Array([0]) },
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toBeInstanceOf(TranscriptionError)
  })
})
