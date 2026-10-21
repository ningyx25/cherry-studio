import { providerService } from '@data/services/ProviderService'
import { loggerService } from '@logger'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'

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

/** Abort in-flight transcription requests that hang (no response), so a slow or
 * unreachable provider surfaces an error instead of leaving the renderer's
 * "transcribing…" state spinning forever. */
const TRANSCRIBE_TIMEOUT_MS = 45_000

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

  let response: Response
  try {
    response = isDeepgramHost(baseUrl)
      ? await transcribeWithDeepgram(fetchImpl, { baseUrl, apiKey, provider, modelId, audio, filename, language })
      : await transcribeOpenAiCompatible(fetchImpl, { baseUrl, apiKey, provider, modelId, audio, filename, language })
  } catch (error) {
    if (error instanceof TranscriptionError) throw error
    logger.error('Transcription request failed', error as Error)
    throw new TranscriptionError(`Transcription request failed: ${(error as Error).message}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const excerpt = body.slice(0, 500)
    throw new TranscriptionError(`Transcription failed with status ${response.status}: ${excerpt}`)
  }

  const json = (await response.json()) as DeepgramListenResponse | { text?: string }
  return { text: readTranscript(json) }
}

interface TranscribeRequestContext {
  baseUrl: string
  apiKey: string | undefined
  provider: Provider
  modelId: string
  audio: Uint8Array
  filename: string
  language?: string
}

/** OpenAI-compatible `POST {base}/audio/transcriptions` with multipart form data. */
async function transcribeOpenAiCompatible(
  fetchImpl: typeof fetch,
  { baseUrl, apiKey, provider, modelId, audio, filename, language }: TranscribeRequestContext
): Promise<Response> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)]), filename)
  form.append('model', modelId)
  if (language) form.append('language', language)

  return fetchImpl(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...getExtraHeaders(provider)
    },
    body: form,
    signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)
  })
}

interface DeepgramListenResponse {
  results?: {
    channels?: Array<{ alternatives?: Array<{ transcript?: string }> }>
  }
}

function isDeepgramHost(url: string): boolean {
  return /deepgram\./i.test(url)
}

/**
 * Deepgram's native prerecorded API: `POST {root}/v1/listen?model=…` with the raw
 * audio as the body (`Authorization: Token …`), returning
 * `results.channels[].alternatives[].transcript`. Containerized webm/mp4 is
 * auto-detected, so no `encoding` parameter is needed.
 */
async function transcribeWithDeepgram(
  fetchImpl: typeof fetch,
  { baseUrl, apiKey, provider, modelId, audio, filename, language }: TranscribeRequestContext
): Promise<Response> {
  const root = baseUrl.replace(/\/v1$/, '')
  const search = new URLSearchParams({ model: modelId })
  // Deepgram accepts the bare ISO language code ("zh", "en"), not a full locale
  // like "zh-CN" — a region-qualified value is rejected with `No such
  // model/language/tier combination found`. The UI preference stores the app's
  // locale-shaped value, so normalize before sending.
  if (language) search.set('language', language.split('-')[0] ?? language)

  return fetchImpl(`${root}/v1/listen?${search.toString()}`, {
    method: 'POST',
    headers: {
      ...(apiKey ? { Authorization: `Token ${apiKey}` } : {}),
      'Content-Type': deepgramContentType(filename),
      ...getExtraHeaders(provider)
    },
    body: new Uint8Array(audio),
    signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)
  })
}

function deepgramContentType(filename: string): string {
  if (filename.endsWith('.m4a')) return 'audio/mp4'
  if (filename.endsWith('.mp3')) return 'audio/mpeg'
  return 'audio/webm'
}

/** Read the transcript out of either response dialect. */
function readTranscript(json: DeepgramListenResponse | { text?: string }): string {
  const channels = (json as DeepgramListenResponse).results?.channels
  if (channels?.length) {
    return channels
      .map((channel) => channel.alternatives?.[0]?.transcript ?? '')
      .filter(Boolean)
      .join(' ')
      .trim()
  }
  return (json as { text?: string }).text ?? ''
}

function getTranscriptionBaseUrl(provider: { endpointConfigs?: Record<string, { baseUrl?: string }> }): string {
  const configs = provider.endpointConfigs ?? {}
  const preferred =
    configs[ENDPOINT_TYPE.OPENAI_AUDIO_TRANSCRIPTION]?.baseUrl ??
    configs[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.baseUrl ??
    Object.values(configs).find((config) => config?.baseUrl)?.baseUrl
  return (preferred ?? '').replace(/\/+$/, '')
}
