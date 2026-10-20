import type { MessageExportView } from '@renderer/types/messageExport'
import { createPartsByMessageId, exportViewToUIMessage } from '@renderer/utils/message/exportView'
import type { HuaTuoMessagePart, HuaTuoUIMessage } from '@shared/data/types/message'
import { useEffect, useMemo, useState } from 'react'

interface UseMessageImageCaptureMessagesOptions<TMessage> {
  loadMessages: () => Promise<TMessage[]>
  mapMessage?: (message: TMessage) => HuaTuoUIMessage
  onError: (error: unknown) => void
}

export function useMessageImageCaptureMessages<TMessage = MessageExportView>({
  loadMessages,
  mapMessage,
  onError
}: UseMessageImageCaptureMessagesOptions<TMessage>): {
  messages: HuaTuoUIMessage[] | null
  partsByMessageId: Record<string, HuaTuoMessagePart[]>
} {
  const [messages, setMessages] = useState<HuaTuoUIMessage[] | null>(null)

  const toUIMessage = useMemo(
    () => mapMessage ?? ((message: TMessage) => exportViewToUIMessage(message as MessageExportView)),
    [mapMessage]
  )

  useEffect(() => {
    let cancelled = false
    setMessages(null)

    void loadMessages()
      .then((loadedMessages) => {
        if (!cancelled) setMessages(loadedMessages.map(toUIMessage))
      })
      .catch((error) => {
        if (!cancelled) onError(error)
      })

    return () => {
      cancelled = true
    }
  }, [loadMessages, onError, toUIMessage])

  const partsByMessageId = useMemo(() => (messages ? createPartsByMessageId(messages) : {}), [messages])

  return { messages, partsByMessageId }
}
