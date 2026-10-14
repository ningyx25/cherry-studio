import { application } from '@application'
import { transcribeAudio } from '@main/ai/audio/transcription'
import { parseUniqueModelId, type UniqueModelId } from '@shared/data/types/model'
import { Elysia } from 'elysia'

import { DOC_DESCRIPTIONS, DOC_TAGS } from '../openapiDocs'

/** Resolve `providerId::modelId` from the body, falling back to the configured voice-input model. */
function resolveModelIds(providerId?: string, modelId?: string): { providerId: string; modelId: string } {
  if (providerId && modelId) return { providerId, modelId }
  const configured = application.get('PreferenceService').get('feature.voice_input.model_id')
  if (!configured) throw new Error('No speech-to-text model configured')
  return parseUniqueModelId(configured as UniqueModelId)
}

/**
 * `POST /v1/audio/transcriptions` — OpenAI-compatible speech-to-text.
 *
 * Multipart body: `file` (required), `model` + `provider_id` (optional; default to
 * the app's `feature.voice_input.model_id` preference), `language` (optional). The
 * WebUI's mic buttons post here — this runs on an external browser, so the model
 * is configured desktop-side rather than in the page.
 */
export const audioRoutes = new Elysia({ prefix: '/audio' }).post(
  '/transcriptions',
  async ({ request }) => {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new Error('Missing `file` field')

    const providerId = typeof form.get('provider_id') === 'string' ? (form.get('provider_id') as string) : undefined
    const modelId = typeof form.get('model') === 'string' ? (form.get('model') as string) : undefined
    const language = typeof form.get('language') === 'string' ? (form.get('language') as string) : undefined

    const resolved = resolveModelIds(providerId, modelId)
    const audio = new Uint8Array(await file.arrayBuffer())
    const { text } = await transcribeAudio({
      providerId: resolved.providerId,
      modelId: resolved.modelId,
      audio,
      filename: file.name || 'audio.webm',
      ...(language ? { language } : {})
    })
    return { text }
  },
  { detail: { tags: [DOC_TAGS.openai], summary: 'Transcriptions', description: DOC_DESCRIPTIONS.transcriptions } }
)
