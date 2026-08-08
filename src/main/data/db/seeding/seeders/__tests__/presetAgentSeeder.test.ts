import { agentTable } from '@data/db/schemas/agent'
import { agentSessionTable } from '@data/db/schemas/agentSession'
import { agentWorkspaceTable } from '@data/db/schemas/agentWorkspace'
import { PresetAgentSeeder } from '@data/db/seeding/seeders/presetAgentSeeder'
import { AGENT_WORKSPACE_TYPE } from '@shared/data/api/schemas/agentWorkspaces'
import { PRESET_AGENT_IDS } from '@shared/data/presets/presetAgents'
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

  it('does not re-create or overwrite an agent that already exists', () => {
    new PresetAgentSeeder().run(dbh.db)
    const [existing] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'pop-science')).all()
    const sessionCountBefore = dbh.db
      .select()
      .from(agentSessionTable)
      .where(eq(agentSessionTable.agentId, 'pop-science'))
      .all()

    new PresetAgentSeeder().run(dbh.db)

    const rows = dbh.db.select().from(agentTable).all()
    expect(rows).toHaveLength(PRESET_AGENT_IDS.length)
    const [stillExisting] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'pop-science')).all()
    expect(stillExisting.id).toBe(existing.id)
    const sessionCountAfter = dbh.db
      .select()
      .from(agentSessionTable)
      .where(eq(agentSessionTable.agentId, 'pop-science'))
      .all()
    expect(sessionCountAfter).toHaveLength(sessionCountBefore.length)
  })
})
