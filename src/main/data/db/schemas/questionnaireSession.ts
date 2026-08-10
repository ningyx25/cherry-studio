import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { createUpdateTimestamps, uuidPrimaryKey } from './_columnHelpers'

/**
 * 问卷会话：一次「多问卷流程」的作答 + 报告。
 * answers/report 以 JSON 整体读写（流程内无关系型查询需求），故不拆多表。
 */
export const questionnaireSessionTable = sqliteTable('questionnaire_session', {
  id: uuidPrimaryKey(),
  /** 流程起点问卷 id（如 CHINA_DRY_EYE） */
  flowQuestionnaireId: text().notNull(),
  status: text().notNull().default('in_progress'), // 'in_progress' | 'completed'
  /** JSON: Record<questionnaireId, Record<questionId, Answer>> */
  answers: text().notNull(),
  /** JSON: QuestionnaireReport | null */
  report: text(),
  ...createUpdateTimestamps
})
