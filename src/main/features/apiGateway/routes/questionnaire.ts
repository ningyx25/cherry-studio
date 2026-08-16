import { questionnaireSessionService } from '@data/services/QuestionnaireSessionService'
import { loggerService } from '@logger'
import { Elysia } from 'elysia'
import * as z from 'zod'

const logger = loggerService.withContext('QuestionnaireRoutes')

const CreateSessionBodySchema = z.object({
  flowQuestionnaireId: z.string().default('BASIC_INFO'),
  answers: z.record(z.string(), z.any()).optional().default({}),
  report: z.record(z.string(), z.any()).nullable().optional()
})

const UpdateSessionBodySchema = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  answers: z.record(z.string(), z.any()).optional(),
  report: z.record(z.string(), z.any()).nullable().optional()
})

export const questionnaireRoutes = new Elysia({ prefix: '/questionnaire' })
  .get(
    '/sessions',
    () => {
      try {
        const items = questionnaireSessionService.list()
        return { sessions: items }
      } catch (error) {
        logger.error('Failed to list questionnaire sessions', error as Error)
        return { sessions: [] }
      }
    },
    { detail: { hide: true } }
  )
  .get(
    '/sessions/:id',
    ({ params }) => {
      return questionnaireSessionService.getById(params.id)
    },
    { detail: { hide: true } }
  )
  .post(
    '/sessions',
    ({ body }) => {
      const parsed = CreateSessionBodySchema.parse(body)
      const session = questionnaireSessionService.create({
        flowQuestionnaireId: parsed.flowQuestionnaireId
      })
      if (parsed.answers || parsed.report) {
        return questionnaireSessionService.update(session.id, {
          status: parsed.report ? 'completed' : 'in_progress',
          answers: parsed.answers as any,
          report: parsed.report as any
        })
      }
      return session
    },
    { detail: { hide: true } }
  )
  .put(
    '/sessions/:id',
    ({ params, body }) => {
      const parsed = UpdateSessionBodySchema.parse(body)
      return questionnaireSessionService.update(params.id, parsed as any)
    },
    { detail: { hide: true } }
  )
  .delete(
    '/sessions/:id',
    ({ params }) => {
      questionnaireSessionService.delete(params.id)
      return { success: true }
    },
    { detail: { hide: true } }
  )
