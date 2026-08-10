import { questionnaireSessionService } from '@data/services/QuestionnaireSessionService'
import {
  CreateQuestionnaireSessionSchema,
  type QuestionnaireSessionSchemas,
  UpdateQuestionnaireSessionSchema
} from '@shared/data/api/schemas/questionnaires'
import type { HandlersFor } from '@shared/data/api/types'

/**
 * 问卷会话 DataApi handlers：SQLite 数据 CRUD。
 * 计分/报告构建在渲染进程调共享纯逻辑后 PATCH 存储，本层只做持久化。
 */
export const questionnaireSessionHandlers: HandlersFor<QuestionnaireSessionSchemas> = {
  '/questionnaire-sessions': {
    GET: async () => questionnaireSessionService.list(),
    POST: async ({ body }) => {
      const parsed = CreateQuestionnaireSessionSchema.parse(body)
      return questionnaireSessionService.create(parsed)
    }
  },

  '/questionnaire-sessions/:id': {
    GET: async ({ params }) => questionnaireSessionService.getById(params.id),
    PATCH: async ({ params, body }) => {
      const parsed = UpdateQuestionnaireSessionSchema.parse(body)
      return questionnaireSessionService.update(params.id, parsed)
    },
    DELETE: async ({ params }) => {
      questionnaireSessionService.delete(params.id)
      return undefined
    }
  }
}
