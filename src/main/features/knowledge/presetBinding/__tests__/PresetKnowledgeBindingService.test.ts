import { agentTable } from '@data/db/schemas/agent'
import { agentKnowledgeBaseTable } from '@data/db/schemas/assistantRelations'
import { knowledgeBaseTable } from '@data/db/schemas/knowledge'
import { PresetAgentSeeder } from '@data/db/seeding/seeders/presetAgentSeeder'
import { PresetKnowledgeBindingService } from '@main/features/knowledge'
import { PRESET_KNOWLEDGE_BASE_NAME } from '@shared/data/presets/presetAgents'
import { KNOWLEDGE_BASE_ERROR_MISSING_VECTOR_STORE } from '@shared/data/types/knowledge'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

describe('PresetKnowledgeBindingService', () => {
  const dbh = setupTestDatabase()
  // BaseService enforces a single instance per constructor (static registry).
  const service = new PresetKnowledgeBindingService()
  const runBinding = () => {
    ;(service as unknown as { onReady: () => void }).onReady()
  }

  const createDryEyeBase = (name: string = PRESET_KNOWLEDGE_BASE_NAME, status: 'completed' | 'failed' = 'completed') =>
    dbh.db
      .insert(knowledgeBaseTable)
      .values({
        name,
        status,
        // The failed status CHECK requires a non-empty error code.
        error: status === 'failed' ? KNOWLEDGE_BASE_ERROR_MISSING_VECTOR_STORE : null,
        chunkSize: 800,
        chunkOverlap: 100
      })
      .returning()
      .all()[0]

  it('binds the pop-science preset agent to the Dry-Eye-Syndrome base by name', () => {
    new PresetAgentSeeder().run(dbh.db)
    const base = createDryEyeBase()

    runBinding()

    const rows = dbh.db.select().from(agentKnowledgeBaseTable).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].agentId).toBe('pop-science')
    expect(rows[0].knowledgeBaseId).toBe(base.id)
  })

  it('is idempotent and never removes other bindings', () => {
    new PresetAgentSeeder().run(dbh.db)
    createDryEyeBase()
    runBinding()
    runBinding()

    // A second, unrelated binding on the same agent must survive a re-run.
    const otherBase = createDryEyeBase('Other-Base')
    dbh.db.insert(agentKnowledgeBaseTable).values({ agentId: 'pop-science', knowledgeBaseId: otherBase.id }).run()
    runBinding()

    const rows = dbh.db
      .select()
      .from(agentKnowledgeBaseTable)
      .where(eq(agentKnowledgeBaseTable.agentId, 'pop-science'))
      .all()
    expect(rows).toHaveLength(2)
  })

  it('skips silently when the preset base does not exist', () => {
    new PresetAgentSeeder().run(dbh.db)

    runBinding()

    expect(dbh.db.select().from(agentKnowledgeBaseTable).all()).toHaveLength(0)
  })

  it('skips a failed base', () => {
    new PresetAgentSeeder().run(dbh.db)
    createDryEyeBase(PRESET_KNOWLEDGE_BASE_NAME, 'failed')

    runBinding()

    expect(dbh.db.select().from(agentKnowledgeBaseTable).all()).toHaveLength(0)
  })

  it('skips when the preset agent is soft-deleted (deletion stays durable)', () => {
    new PresetAgentSeeder().run(dbh.db)
    createDryEyeBase()
    dbh.db.update(agentTable).set({ deletedAt: Date.now() }).where(eq(agentTable.id, 'pop-science')).run()

    runBinding()

    expect(dbh.db.select().from(agentKnowledgeBaseTable).all()).toHaveLength(0)
  })
})
