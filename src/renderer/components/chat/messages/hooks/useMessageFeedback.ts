import { dataApiService } from '@data/DataApiService'
import { loggerService } from '@logger'
import { extractAgentSessionIdFromTopicId } from '@renderer/utils/agentSession'
import type { ResponseForPath } from '@shared/data/api/paths'
import type { MessageFeedback } from '@shared/data/types/message'
import { useCallback, useEffect, useState } from 'react'

import type { MessageListItem } from '../types'

const logger = loggerService.withContext('useMessageFeedback')

type AgentSessionMessageResponse = ResponseForPath<'/agent-sessions/:sessionId/messages/:messageId', 'GET'>

/**
 * Patient satisfaction rating (👍/👎) for one assistant turn.
 *
 * The rating lives in the row's own `data` JSON as `data.feedback` — no column,
 * no migration, and `UpdateAgentSessionMessageSchema` already carries `data`.
 * PATCH replaces `data` wholesale, so the write re-reads the row first and
 * merges, mirroring the `persistDiagnosis` pattern in `agentMessageListAdapter`.
 *
 * State is optimistic and local: the row's persisted value seeds the initial
 * state, a click flips it immediately, and a failed write reverts it.
 */
export function useMessageFeedback(message: MessageListItem) {
  const [feedback, setFeedback] = useState<MessageFeedback | undefined>(message.feedback)

  // Re-seed when the persisted value changes underneath (refetch, window switch).
  // Keyed on the value, not the message object: a mid-write revalidation returns
  // the pre-write row, which leaves this dependency unchanged, so it cannot
  // clobber the optimistic rating.
  useEffect(() => {
    setFeedback(message.feedback)
  }, [message.feedback])

  const rate = useCallback(
    async (next: MessageFeedback) => {
      const previous = feedback
      // Clicking the active thumb clears the rating.
      const value = previous === next ? undefined : next
      setFeedback(value)

      const sessionId = extractAgentSessionIdFromTopicId(message.topicId)
      const path = `/agent-sessions/${sessionId}/messages/${message.id}` as const

      try {
        const persisted = (await dataApiService.get(path)) as AgentSessionMessageResponse

        const data = { ...persisted.data, feedback: value }
        if (value === undefined) delete data.feedback

        await dataApiService.patch(path, { body: { data } })
      } catch (error) {
        setFeedback(previous)
        logger.error('Failed to persist message feedback', error as Error)
        throw error
      }
    },
    [feedback, message.id, message.topicId]
  )

  return { feedback, rate }
}
