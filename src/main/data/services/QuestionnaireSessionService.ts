import { application } from '@application'
import { questionnaireSessionTable } from '@data/db/schemas/questionnaireSession'
import { loggerService } from '@logger'
import { DataApiErrorFactory } from '@shared/data/api/errors'
import type {
  CreateQuestionnaireSessionDto,
  QuestionnaireSession,
  UpdateQuestionnaireSessionDto
} from '@shared/data/api/schemas/questionnaires'
import type { QuestionnaireAnswers, QuestionnaireReport } from '@shared/questionnaire/types'
import { desc, eq } from 'drizzle-orm'

const logger = loggerService.withContext('DataApi:QuestionnaireSessionService')

function rowToSession(row: typeof questionnaireSessionTable.$inferSelect): QuestionnaireSession {
  return {
    id: row.id,
    flowQuestionnaireId: row.flowQuestionnaireId,
    status: row.status as QuestionnaireSession['status'],
    answers: JSON.parse(row.answers) as QuestionnaireAnswers,
    report: row.report ? (JSON.parse(row.report) as QuestionnaireReport) : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  }
}

/**
 * 问卷会话 DataApi 服务：answers/report 为 JSON 整体读写。
 * 计分/报告构建在共享纯逻辑层完成，本服务仅持久化。
 */
export class QuestionnaireSessionService {
  private get db() {
    return application.get('DbService').getDb()
  }

  list(): QuestionnaireSession[] {
    const rows = this.db
      .select()
      .from(questionnaireSessionTable)
      .orderBy(desc(questionnaireSessionTable.updatedAt))
      .all()
    return rows.map(rowToSession)
  }

  getById(id: string): QuestionnaireSession {
    const [row] = this.db
      .select()
      .from(questionnaireSessionTable)
      .where(eq(questionnaireSessionTable.id, id))
      .limit(1)
      .all()
    if (!row) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    return rowToSession(row)
  }

  create(dto: CreateQuestionnaireSessionDto): QuestionnaireSession {
    const now = Date.now()
    const [row] = this.db
      .insert(questionnaireSessionTable)
      .values({
        flowQuestionnaireId: dto.flowQuestionnaireId,
        status: 'in_progress',
        answers: '{}',
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .all()
    if (!row) throw new Error('Insert succeeded but select returned no questionnaire session')
    logger.info('Created questionnaire session', { id: row.id })
    return rowToSession(row)
  }

  update(id: string, dto: UpdateQuestionnaireSessionDto): QuestionnaireSession {
    const updates: Partial<typeof questionnaireSessionTable.$inferInsert> = {}
    if (dto.status !== undefined) updates.status = dto.status
    if (dto.answers !== undefined) updates.answers = JSON.stringify(dto.answers)
    if (dto.report !== undefined) updates.report = JSON.stringify(dto.report)
    const [row] = this.db
      .update(questionnaireSessionTable)
      .set(updates)
      .where(eq(questionnaireSessionTable.id, id))
      .returning()
      .all()
    if (!row) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    logger.info('Updated questionnaire session', { id })
    return rowToSession(row)
  }

  delete(id: string): void {
    const result = this.db.delete(questionnaireSessionTable).where(eq(questionnaireSessionTable.id, id)).run()
    if (result.changes === 0) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    logger.info('Deleted questionnaire session', { id })
  }
}

export const questionnaireSessionService = new QuestionnaireSessionService()
