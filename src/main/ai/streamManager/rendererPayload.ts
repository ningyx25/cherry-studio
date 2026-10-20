import type { StreamChunkPayload } from '@shared/ai/transport'
import { projectMessagePartsForRenderer, projectStreamChunkForRenderer } from '@shared/ai/transport'
import type { HuaTuoUIMessage } from '@shared/data/types/message'

export function projectStreamMessageForRenderer(topicId: string, message: HuaTuoUIMessage): HuaTuoUIMessage {
  const parts = projectMessagePartsForRenderer(message.parts, topicId, message.id)
  return parts === message.parts ? message : ({ ...message, parts } as HuaTuoUIMessage)
}

export function projectStreamChunkPayloadForRenderer(payload: StreamChunkPayload): StreamChunkPayload {
  const chunk = projectStreamChunkForRenderer(payload.chunk, payload.topicId, payload.anchorMessageId)
  return chunk === payload.chunk ? payload : { ...payload, chunk }
}
