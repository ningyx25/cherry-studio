import { agentTable } from '@data/db/schemas/agent'
import { agentSessionTable } from '@data/db/schemas/agentSession'
import { agentWorkspaceTable } from '@data/db/schemas/agentWorkspace'
import { PresetAgentSeeder } from '@data/db/seeding/seeders/presetAgentSeeder'
import { agentSessionService } from '@data/services/AgentSessionService'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

import { createPresetAgentFeedbackSession } from '../createPresetAgentFeedbackSession'

describe('createPresetAgentFeedbackSession', () => {
  const dbh = setupTestDatabase()

  it('creates a fresh system session on the pop-science preset agent without creating any builtin agent', () => {
    new PresetAgentSeeder().run(dbh.db)
    const agentCountBefore = dbh.db.select().from(agentTable).all().length

    const session = createPresetAgentFeedbackSession()

    expect(session).toMatchObject({
      agentId: 'pop-science',
      name: '',
      workspace: { type: 'system' }
    })
    expect(dbh.db.select().from(agentTable).all()).toHaveLength(agentCountBefore)
    expect(dbh.db.select().from(agentSessionTable).all().length).toBe(agentCountBefore + 1)
    expect(dbh.db.select().from(agentWorkspaceTable).all()).toHaveLength(agentCountBefore + 1)
  })

  it('rolls back the created session when session creation fails, leaving the preset agent intact', () => {
    new PresetAgentSeeder().run(dbh.db)
    const originalCreateTx = agentSessionService.createTx.bind(agentSessionService)
    vi.spyOn(agentSessionService, 'createTx').mockImplementationOnce((tx, id, dto) => {
      originalCreateTx(tx, id, dto)
      throw new Error('forced session creation failure')
    })

    expect(() => createPresetAgentFeedbackSession()).toThrow('forced session creation failure')

    const [popScience] = dbh.db.select().from(agentTable).where(eq(agentTable.id, 'pop-science')).all()
    expect(popScience).toBeDefined()
    // The forced failure rolls back only the feedback session; the preset agents'
    // seeded sessions remain.
    expect(dbh.db.select().from(agentSessionTable).all()).toHaveLength(2)
  })
})
