import { providerService } from '@data/services/ProviderService'
import { loggerService } from '@logger'
import { ENDPOINT_TYPE } from '@shared/data/types/model'

import { getExtraHeaders } from '../utils/provider'

const logger = loggerService.withContext('Transcription')

export interface TranscribeAudioParams {
  providerId: string
  modelId: string
  /** Recorded audio bytes (webm/opus or mp4). */
  audio: Uint8Array
  /** File name whose extension matches the audio mime type (endpoints sniff by extension). */
  filename?: string
  /** ISO 639-1 language hint, e.g. `zh`. */
  language?: string
}

export interface TranscribeAudioResult {
  text: string
}

export class TranscriptionError extends Error {}

interface TranscribeDeps {
  fetchImpl?: typeof fetch
}

/**
 * Calls an OpenAI-compatible `POST {baseURL}/audio/transcriptions` endpoint with
 * multipart form data. Plain fetch on purpose: `@ai-sdk/openai-compatible` has no
 * transcription model support, so the provider factory cannot serve this call.
 */
export async function transcribeAudio(
  params: TranscribeAudioParams,
  deps: TranscribeDeps = {}
): Promise<TranscribeAudioResult> {
  const { providerId, modelId, audio, filename = 'audio.webm', language } = params
  const fetchImpl = deps.fetchImpl ?? fetch

  const provider = providerService.getByProviderId(providerId)
  const baseUrl = getTranscriptionBaseUrl(provider)
  if (!baseUrl) {
    throw new TranscriptionError(`Provider ${providerId} has no audio transcription base URL configured`)
  }
  const apiKey = providerService.getRotatedApiKey(providerId)

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)]), filename)
  form.append('model', modelId)
  if (language) form.append('language', language)

  let response: Response
  try {
    response = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...getExtraHeaders(provider)
      },
      body: form
    })
  } catch (error) {
    logger.error('Transcription request failed', error as Error)
    throw new TranscriptionError(`Transcription request failed: ${(error as Error).message}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const excerpt = body.slice(0, 500)
    throw new TranscriptionError(`Transcription failed with status ${response.status}: ${excerpt}`)
  }

  const json = (await response.json()) as { text?: string }
  return { text: json.text ?? '' }
}

function getTranscriptionBaseUrl(provider: { endpointConfigs?: Record<string, { baseUrl?: string }> }): string {
  const configs = provider.endpointConfigs ?? {}
  const preferred =
    configs[ENDPOINT_TYPE.OPENAI_AUDIO_TRANSCRIPTION]?.baseUrl ??
    configs[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.baseUrl ??
    Object.values(configs).find((config) => config?.baseUrl)?.baseUrl
  return (preferred ?? '').replace(/\/+$/, '')
}
