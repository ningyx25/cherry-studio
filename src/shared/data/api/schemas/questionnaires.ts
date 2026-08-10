import type { QuestionnaireAnswers, QuestionnaireReport } from '@shared/questionnaire/types'
import * as z from 'zod'

const sessionStatusSchema = z.enum(['in_progress', 'completed'])
const jsonAnswersSchema = z.custom<QuestionnaireAnswers>((v) => typeof v === 'object' && v !== null)
const reportSchema = z.custom<QuestionnaireReport>((v) => typeof v === 'object' && v !== null)

export const CreateQuestionnaireSessionSchema = z.object({
  flowQuestionnaireId: z.string().trim().min(1)
})
export type CreateQuestionnaireSessionDto = z.infer<typeof CreateQuestionnaireSessionSchema>

export const UpdateQuestionnaireSessionSchema = z.object({
  status: sessionStatusSchema.optional(),
  answers: jsonAnswersSchema.optional(),
  report: reportSchema.optional()
})
export type UpdateQuestionnaireSessionDto = z.infer<typeof UpdateQuestionnaireSessionSchema>

export interface QuestionnaireSession {
  id: string
  flowQuestionnaireId: string
  status: 'in_progress' | 'completed'
  answers: QuestionnaireAnswers
  report: QuestionnaireReport | null
  createdAt: string
  updatedAt: string
}

export type QuestionnaireSessionSchemas = {
  '/questionnaire-sessions': {
    GET: {
      query?: { search?: string }
      response: QuestionnaireSession[]
    }
    POST: {
      body: CreateQuestionnaireSessionDto
      response: QuestionnaireSession
    }
  }

  '/questionnaire-sessions/:id': {
    GET: {
      params: { id: string }
      response: QuestionnaireSession
    }
    PATCH: {
      params: { id: string }
      body: UpdateQuestionnaireSessionDto
      response: QuestionnaireSession
    }
    DELETE: {
      params: { id: string }
      response: void
    }
  }
}
