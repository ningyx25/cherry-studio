import type { MessageExportView } from '@renderer/types/messageExport'
import type { HuaTuoMessagePart, HuaTuoUIMessage } from '@shared/data/types/message'

export function exportViewToUIMessage(message: MessageExportView): HuaTuoUIMessage {
  const metadata: HuaTuoUIMessage['metadata'] = {
    status: message.status,
    createdAt: message.createdAt
  }

  if (message.updatedAt) metadata.updatedAt = message.updatedAt
  if (message.parentId !== undefined) metadata.parentId = message.parentId
  if (message.siblingsGroupId !== undefined) metadata.siblingsGroupId = message.siblingsGroupId
  if (message.modelId) metadata.modelId = message.modelId
  if (message.messageSnapshot) metadata.messageSnapshot = message.messageSnapshot
  if (message.stats) {
    metadata.stats = message.stats
    if (message.stats.totalTokens) metadata.totalTokens = message.stats.totalTokens
  }

  return {
    id: message.id,
    role: message.role,
    parts: message.parts as HuaTuoUIMessage['parts'],
    metadata
  } as HuaTuoUIMessage
}

export function createPartsByMessageId(messages: HuaTuoUIMessage[]): Record<string, HuaTuoMessagePart[]> {
  const partsByMessageId: Record<string, HuaTuoMessagePart[]> = {}
  for (const message of messages) {
    partsByMessageId[message.id] = (message.parts ?? []) as HuaTuoMessagePart[]
  }
  return partsByMessageId
}
