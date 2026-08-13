import { application } from '@application'
import { agentTable } from '@data/db/schemas/agent'
import { agentKnowledgeBaseTable } from '@data/db/schemas/assistantRelations'
import { knowledgeBaseTable } from '@data/db/schemas/knowledge'
import { loggerService } from '@logger'
import { BaseService, Injectable, Phase, ServicePhase } from '@main/core/lifecycle'
import { PRESET_KNOWLEDGE_BASE_NAME } from '@shared/data/presets/presetAgents'
import { and, eq, isNull } from 'drizzle-orm'

const logger = loggerService.withContext('PresetKnowledgeBindingService')

/**
 * The preset agent that owns the companion knowledge base binding (科普AI).
 * Module mode hides agent management, so this binding is product-owned wiring,
 * not a user setting — see resolveKnowledgeBaseScope (binding = scope ceiling).
 */
const PRESET_KNOWLEDGE_BINDING_AGENT_ID = 'pop-science'

/**
 * Boot-time idempotent wiring: bind the 科普AI preset agent to the knowledge base
 * named `Dry-Eye-Syndrome` whenever that base exists, so the agent's kb_* tools
 * see it and answers can be grounded in it.
 *
 * The base is user-created via the knowledge module (its id is a runtime uuid),
 * so the binding resolves by the preset name at startup. Non-destructive: never
 * unbinds, never touches other bindings, and silently skips when the base is
 * missing/failed or the agent row is missing/soft-deleted (deletion stays durable).
 */
@Injectable('PresetKnowledgeBindingService')
@ServicePhase(Phase.WhenReady)
export class PresetKnowledgeBindingService extends BaseService {
  protected onReady(): void {
    this.ensurePresetKnowledgeBinding()
  }

  private ensurePresetKnowledgeBinding(): void {
    const db = application.get('DbService').getDb()

    const [base] = db
      .select({ id: knowledgeBaseTable.id })
      .from(knowledgeBaseTable)
      .where(and(eq(knowledgeBaseTable.name, PRESET_KNOWLEDGE_BASE_NAME), eq(knowledgeBaseTable.status, 'completed')))
      .limit(1)
      .all()
    if (!base) {
      logger.debug('Preset knowledge base not present; skipping binding', { name: PRESET_KNOWLEDGE_BASE_NAME })
      return
    }

    const [agent] = db
      .select({ id: agentTable.id })
      .from(agentTable)
      .where(and(eq(agentTable.id, PRESET_KNOWLEDGE_BINDING_AGENT_ID), isNull(agentTable.deletedAt)))
      .limit(1)
      .all()
    if (!agent) {
      logger.debug('Preset agent missing or soft-deleted; skipping knowledge binding', {
        agentId: PRESET_KNOWLEDGE_BINDING_AGENT_ID
      })
      return
    }

    application.get('DbService').withWriteTx((tx) => {
      tx.insert(agentKnowledgeBaseTable)
        .values({ agentId: PRESET_KNOWLEDGE_BINDING_AGENT_ID, knowledgeBaseId: base.id })
        .onConflictDoNothing()
        .run()
    })
    logger.info('Ensured preset knowledge binding', {
      agentId: PRESET_KNOWLEDGE_BINDING_AGENT_ID,
      knowledgeBaseId: base.id
    })
  }
}
