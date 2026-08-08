import { agentTable } from '@data/db/schemas/agent'
import { agentSessionTable } from '@data/db/schemas/agentSession'
import { PresetAgentSeeder } from '@data/db/seeding/seeders/presetAgentSeeder'
import { PresetOnlyAgentCleanupSeeder } from '@data/db/seeding/seeders/presetOnlyAgentCleanupSeeder'
import { SeedRunner } from '@data/db/seeding/SeedRunner'
import { agentService } from '@data/services/AgentService'
import { agentSessionService } from '@data/services/AgentSessionService'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { PRESET_AGENT_IDS } from '@shared/data/presets/presetAgents'
import { setupTestDatabase } from '@test-helpers/db'
import { eq, inArray } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

const dbh = setupTestDatabase()

function insertAgent(id: string, name: string, configuration: Record<string, unknown> = {}) {
  agentService.createAgentTx(dbh.db, id, {
    id,
    type: 'claude-code',
    name,
    description: '',
    instructions: '',
    model: null,
    configuration
  })
}

function insertSession(agentId: string, id: string) {
  agentSessionService.createTx(dbh.db, id, {
    agentId,
    name: '',
    workspace: { type: AGENT_WORKSPACE_TYPE.SYSTEM }
  })
}

describe('PresetOnlyAgentCleanupSeeder', () => {
  it('hard-deletes non-preset agents with their sessions and workspaces, keeping only presets', () => {
    new PresetAgentSeeder().run(dbh.db)
    insertAgent('legacy-cherry', 'Cherry Assistant', { builtin_role: 'assistant' })
    insertAgent('test-agent', '测试')
    insertSession('legacy-cherry', 'legacy-session-1')
    insertSession('test-agent', 'test-session-1')

    new PresetOnlyAgentCleanupSeeder().run(dbh.db)

    const ids = dbh.db
      .select({ id: agentTable.id })
      .from(agentTable)
      .all()
      .map((r) => r.id)
    expect(ids.sort()).toEqual([...PRESET_AGENT_IDS].sort())
    // The non-preset sessions are gone; only the preset agents' seeded sessions remain.
    const nonPresetSessions = dbh.db
      .select()
      .from(agentSessionTable)
      .where(inArray(agentSessionTable.agentId, ['legacy-cherry', 'test-agent']))
      .all()
    expect(nonPresetSessions).toHaveLength(0)
    const allSessions = dbh.db.select().from(agentSessionTable).all()
    expect(allSessions).toHaveLength(PRESET_AGENT_IDS.length)
  })

  it('also removes soft-deleted non-preset rows', () => {
    new PresetAgentSeeder().run(dbh.db)
    insertAgent('legacy-cherry', 'Cherry Assistant', { builtin_role: 'assistant' })
    dbh.db.update(agentTable).set({ deletedAt: Date.now() }).where(eq(agentTable.id, 'legacy-cherry')).run()

    new PresetOnlyAgentCleanupSeeder().run(dbh.db)

    const ids = dbh.db
      .select({ id: agentTable.id })
      .from(agentTable)
      .all()
      .map((r) => r.id)
    expect(ids.sort()).toEqual([...PRESET_AGENT_IDS].sort())
  })

  it('is idempotent across repeated SeedRunner runs', () => {
    const runner = new SeedRunner(dbh.db)
    new PresetAgentSeeder().run(dbh.db)
    insertAgent('legacy-cherry', 'Cherry Assistant', { builtin_role: 'assistant' })

    runner.runAll([new PresetAgentSeeder(), new PresetOnlyAgentCleanupSeeder()])
    runner.runAll([new PresetAgentSeeder(), new PresetOnlyAgentCleanupSeeder()])

    const ids = dbh.db
      .select({ id: agentTable.id })
      .from(agentTable)
      .all()
      .map((r) => r.id)
    expect(ids.sort()).toEqual([...PRESET_AGENT_IDS].sort())
  })

  it('never touches preset rows, including a user soft-deleted preset', () => {
    new PresetAgentSeeder().run(dbh.db)
    insertSession('pop-science', 'preset-session-1')
    dbh.db.update(agentTable).set({ deletedAt: Date.now() }).where(eq(agentTable.id, 'clinic')).run()

    new PresetOnlyAgentCleanupSeeder().run(dbh.db)

    const [popScience] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'pop-science')).all()
    expect(popScience.deletedAt).toBeNull()
    expect(popScience).toBeDefined()
    const [clinic] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'clinic')).all()
    expect(clinic.deletedAt).not.toBeNull()
    const sessions = dbh.db.select().from(agentSessionTable).where(eq(agentSessionTable.agentId, 'pop-science')).all()
    // Seeder-session + the extra session inserted above — both survive cleanup.
    expect(sessions).toHaveLength(2)
  })
})
