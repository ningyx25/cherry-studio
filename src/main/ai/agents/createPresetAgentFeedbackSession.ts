import { application } from '@application'
import { agentSessionService } from '@data/services/AgentSessionService'
import type { AgentSessionEntity } from '@shared/data/api/schemas/agentSessions'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { v4 as uuidv4 } from 'uuid'

/** The fixed preset agent that hosts the About→Feedback conversation. */
const FEEDBACK_AGENT_ID = 'pop-science'

/**
 * Create the isolated system task used by the About→Feedback entry.
 *
 * The feedback conversation runs on the fixed 科普AI preset agent. Its row is
 * seeded by PresetAgentSeeder (run-on-change) and cannot be deleted from the
 * slim module UI, so no restore step is needed here — unlike the former
 * HuaTuo Assistant flow, which recreated a builtin_role='assistant' agent on
 * demand. Renderer callers receive only the standard session they need to open.
 */
export function createPresetAgentFeedbackSession(): AgentSessionEntity {
  const sessionId = uuidv4()
  application.get('DbService').withWriteTx((tx) => {
    agentSessionService.createTx(tx, sessionId, {
      agentId: FEEDBACK_AGENT_ID,
      name: '',
      workspace: { type: AGENT_WORKSPACE_TYPE.SYSTEM }
    })
  })
  return agentSessionService.getById(sessionId)
}
