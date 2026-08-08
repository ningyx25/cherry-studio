import { agentTable } from '@data/db/schemas/agent'
import { agentService } from '@data/services/AgentService'
import { agentSessionService } from '@data/services/AgentSessionService'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { PRESET_AGENT_SEEDS, type PresetAgentId } from '@shared/data/presets/presetAgents'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

import type { DbType, ISeeder } from '../../types'

/**
 * Seed the two fixed module agents (科普AI / 问诊AI) that back the split sidebar
 * entries. Unlike user-managed agents, these are identified by a stable preset id
 * (`pop-science` / `clinic`) rather than `builtin_role`: they carry no reserved
 * assistant capability — just their own system prompt and identity.
 *
 * `run-on-change` keeps the seed re-applicable if the preset definition evolves.
 * A seeded empty session makes the agent visible in the sidebar without a user
 * having to create one first. `model` is null — the user owns model selection.
 */
export class PresetAgentSeeder implements ISeeder {
  readonly name = 'presetAgents'
  readonly description = 'Insert the two fixed module agents (科普AI / 问诊AI)'
  readonly executionPolicy = 'run-on-change' as const
  readonly version = '1'

  run(db: DbType): void {
    db.transaction((tx) => {
      for (const preset of PRESET_AGENT_SEEDS) {
        this.ensureAgent(tx, preset.id, preset.name, preset.description, preset.instructions)
      }
    })
  }

  private ensureAgent(tx: DbType, id: PresetAgentId, name: string, description: string, instructions: string): void {
    // Find an existing row by fixed id, including deleted ones so a prior user
    // deletion stays durable (matching the builtin-agent seed policy).
    const existing = tx.select().from(agentTable).where(eq(agentTable.id, id)).limit(1).all()[0]
    if (existing) return

    const agentId = id
    const row = agentService.createAgentTx(tx, agentId, {
      id: agentId,
      type: 'claude-code',
      name,
      description,
      instructions,
      // The managed CherryAI model cannot run the agent runtime; model choice is
      // user-owned and assigned via the agent settings UI (same as CherryAssistantSeeder).
      model: null,
      configuration: {
        avatar: PRESET_AGENT_SEEDS.find((seed) => seed.id === id)?.emoji,
        bootstrap_completed: true
      }
    })

    if (!row) {
      throw new Error(`insert succeeded but select returned no fixed agent row: ${id}`)
    }

    // One seeded session makes the agent visible in the sidebar. This does not
    // self-heal after user deletion — the empty-session create path in the renderer
    // is the intentional way back.
    agentSessionService.createTx(tx, uuidv4(), {
      agentId,
      name: '',
      workspace: { type: AGENT_WORKSPACE_TYPE.SYSTEM }
    })
  }
}
