import { agentTable } from '@data/db/schemas/agent'
import { agentService } from '@data/services/AgentService'
import { agentSessionService } from '@data/services/AgentSessionService'
import { agentTaskService } from '@data/services/AgentTaskService'
import { PRESET_AGENT_IDS } from '@shared/data/presets/presetAgents'
import { notInArray } from 'drizzle-orm'

import type { DbType, ISeeder } from '../../types'

/**
 * One-time cleanup that hard-deletes every agent row that is not one of the two
 * fixed preset agents (科普AI / 问诊AI).
 *
 * The slim build is a two-module product: the sidebared agents are exactly the
 * preset rows, so any other row is legacy residue — the seeded Cherry Assistant
 * (builtin_role='assistant', pre-slim) or user-created agents carried over from
 * before the slim-down. Hard-deleting them (including their sessions and system
 * workspaces) is the "these agents are gone" contract; soft-deleted non-preset
 * rows are removed too so nothing lingers for a later restore.
 *
 * `run-on-change` + a missing journal key runs this exactly once on existing DBs
 * (SeedRunner re-runs whenever the journal version differs). Preset ids are
 * always excluded, so a user soft-deleting a preset agent stays durable.
 */
export class PresetOnlyAgentCleanupSeeder implements ISeeder {
  readonly name = 'presetOnlyAgentCleanup'
  readonly description = 'Hard-delete non-preset agent rows (legacy Cherry Assistant + leftover user agents)'
  readonly executionPolicy = 'run-on-change' as const
  readonly version = '1'

  run(db: DbType): void {
    const nonPresetRows = db
      .select({ id: agentTable.id })
      .from(agentTable)
      .where(notInArray(agentTable.id, [...PRESET_AGENT_IDS]))
      .all()
    if (nonPresetRows.length === 0) return

    const affectedTaskScheduleIds: string[] = []
    db.transaction((tx) => {
      for (const { id } of nonPresetRows) {
        affectedTaskScheduleIds.push(...agentSessionService.getTaskScheduleIdsForAgentTx(tx, id))
        agentSessionService.deleteByAgentIdTx(tx, id, { validateAgent: false })
        agentService.deleteAgentTx(tx, id)
      }
    })
    agentTaskService.notifyReadModelChange(affectedTaskScheduleIds)
  }
}
