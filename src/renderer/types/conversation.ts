import { isPresetAgentId } from '@shared/data/presets/presetAgents'

/**
 * Apps that carry conversations (agent → session). These are exactly the sidebar
 * apps with a `conversationRoute` — the two fixed agent modules (科普AI / 问诊AI).
 */
export type ConversationAppId = 'pop-science' | 'clinic'

/** All conversation apps — used where an operation must cover every agent module. */
export const ALL_CONVERSATION_APP_IDS: readonly ConversationAppId[] = ['pop-science', 'clinic']

/**
 * Map an agent id to the conversation app it belongs to. Preset ids map to their
 * own module; any other agent (legacy/user-created rows) falls back to the
 * default 科普AI module so cross-module navigation (history / tasks / search)
 * never has to know which agents exist.
 */
export function resolvePresetConversationAppId(agentId: string): ConversationAppId {
  return isPresetAgentId(agentId) ? agentId : 'pop-science'
}
