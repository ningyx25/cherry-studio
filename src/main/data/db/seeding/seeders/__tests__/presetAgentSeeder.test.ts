import { agentTable } from '@data/db/schemas/agent'
import { agentSessionTable } from '@data/db/schemas/agentSession'
import { agentWorkspaceTable } from '@data/db/schemas/agentWorkspace'
import { userModelTable } from '@data/db/schemas/userModel'
import { userProviderTable } from '@data/db/schemas/userProvider'
import { PresetAgentSeeder } from '@data/db/seeding/seeders/presetAgentSeeder'
import { generateOrderKeyBetween } from '@data/services/utils/orderKey'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { PRESET_AGENT_IDS, PRESET_AGENT_SEEDS } from '@shared/data/presets/presetAgents'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

describe('PresetAgentSeeder', () => {
  const dbh = setupTestDatabase()

  it('seeds one fixed agent per module with a seeded system session and workspace', () => {
    new PresetAgentSeeder().run(dbh.db)

    const rows = dbh.db.select().from(agentTable).all()
    expect(rows.map((r) => r.id)).toEqual(PRESET_AGENT_IDS)

    for (const id of PRESET_AGENT_IDS) {
      const [agent] = dbh.db.select().from(agentTable).where(eq(agentTable.id, id)).all()
      expect(agent).toMatchObject({
        id,
        type: 'claude-code',
        name: expect.any(String),
        description: expect.any(String),
        instructions: expect.any(String),
        model: null
      })
      expect(agent.configuration).toMatchObject({ bootstrap_completed: true })

      const [session] = dbh.db.select().from(agentSessionTable).where(eq(agentSessionTable.agentId, id)).all()
      expect(session).toMatchObject({ agentId: id, name: '' })
      const [workspace] = dbh.db
        .select()
        .from(agentWorkspaceTable)
        .where(eq(agentWorkspaceTable.id, session.workspaceId))
        .all()
      expect(workspace).toMatchObject({ type: AGENT_WORKSPACE_TYPE.SYSTEM })
    }
  })

  it('re-running syncs preset-owned instructions but preserves user-owned fields and soft-deletion', async () => {
    new PresetAgentSeeder().run(dbh.db)

    // Simulate an evolved preset: give one active row stale instructions plus a
    // user-owned model, and soft-delete the other preset agent.
    const modelId = 'user-model-1'
    await dbh.db
      .insert(userProviderTable)
      .values({ providerId: 'anthropic', name: 'anthropic', orderKey: generateOrderKeyBetween(null, null) })
      .onConflictDoNothing()
    await dbh.db
      .insert(userModelTable)
      .values({
        id: modelId,
        providerId: 'anthropic',
        modelId: 'claude-3-5-sonnet',
        name: 'claude-3-5-sonnet',
        capabilities: [],
        supportsStreaming: true,
        orderKey: generateOrderKeyBetween(null, null)
      })
      .onConflictDoNothing()
    dbh.db
      .update(agentTable)
      .set({ instructions: 'stale instructions', model: modelId })
      .where(eq(agentTable.id, 'pop-science'))
      .run()
    dbh.db.update(agentTable).set({ deletedAt: Date.now() }).where(eq(agentTable.id, 'clinic')).run()

    new PresetAgentSeeder().run(dbh.db)

    const [synced] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'pop-science')).all()
    const popScienceSeed = PRESET_AGENT_SEEDS.find((s) => s.id === 'pop-science')
    expect(synced.instructions).toBe(popScienceSeed?.instructions)
    expect(synced.name).toBe(popScienceSeed?.name)
    expect(synced.model).toBe(modelId) // user-owned, untouched

    const [softDeleted] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'clinic')).all()
    expect(softDeleted.deletedAt).not.toBeNull() // deletion stays durable

    // No duplicate rows or sessions created on re-run.
    const rows = dbh.db.select().from(agentTable).all()
    expect(rows).toHaveLength(PRESET_AGENT_IDS.length)
    const sessionCountAfter = dbh.db
      .select()
      .from(agentSessionTable)
      .where(eq(agentSessionTable.agentId, 'pop-science'))
      .all()
    expect(sessionCountAfter).toHaveLength(1)
  })
})
