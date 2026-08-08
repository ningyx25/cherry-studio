import { cacheService } from '@data/CacheService'
import { dataApiService } from '@data/DataApiService'
import { isDataApiNotFoundError } from '@shared/data/api/errors'
import type { PresetAgentId } from '@shared/data/presets/presetAgents'

/**
 * Entry-target resolution for the conversation routes (`/app/chat`, the fixed
 * agent modules `/app/pop-science` / `/app/clinic`), called from their
 * `beforeLoad` interceptors on a bare entry (no explicit topicId / sessionId in
 * the URL).
 *
 * Resolution order: the cross-window "last focused" id, validated by its by-id
 * endpoint, then the most-recently-updated conversation. `null` means nothing to
 * resume — the route falls through bare and the page decides what to show.
 *
 * `last_used_*` ids are never cleared on delete, so a remembered id may point at
 * a deleted row — that surfaces as NOT_FOUND here and falls through to latest.
 * These are one-shot reads rather than SWR preloads: the routes do not consume
 * the latest keys through hooks, so retaining a preload there would permanently
 * pin the first response.
 */

export async function resolveChatEntryTopicId(): Promise<string | null> {
  const lastUsedTopicId = cacheService.getPersist('ui.chat.last_used_topic_id')
  if (lastUsedTopicId) {
    try {
      await dataApiService.get(`/topics/${lastUsedTopicId}`)
      return lastUsedTopicId
    } catch (error) {
      if (!isDataApiNotFoundError(error)) throw error
    }
  }

  const { topic } = await dataApiService.get('/topics/latest')
  return topic?.id ?? null
}

/**
 * Per-module first-entry resolution for the fixed agent modules. The cached
 * `last_used_session_id` is global across modules, so it is only reused when the
 * session actually belongs to this module's agent; otherwise we fall through to
 * that module's own latest session (`/agent-sessions/latest?agentId=`).
 */
export async function resolvePresetAgentEntrySessionId(agentId: PresetAgentId): Promise<string | null> {
  const lastUsedSessionId = cacheService.getPersist('ui.agent.last_used_session_id')
  if (lastUsedSessionId) {
    try {
      const session = await dataApiService.get(`/agent-sessions/${lastUsedSessionId}`)
      if (session.agentId === agentId) return lastUsedSessionId
    } catch (error) {
      if (!isDataApiNotFoundError(error)) throw error
    }
  }

  const { session } = await dataApiService.get('/agent-sessions/latest', { query: { agentId } })
  return session?.id ?? null
}
