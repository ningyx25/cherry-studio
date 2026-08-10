import { questionnaireDefinitionSchema } from '@shared/questionnaire/schemas'
import * as z from 'zod'

import { defineRoute } from '../define'

const questionnaireIdSchema = z.string().trim().min(1)

/** 定义摘要（列表页用，避免拉全量）。 */
const questionnaireSummarySchema = z.object({
  questionnaireId: z.string(),
  title: z.string(),
  description: z.string()
})

export const questionnaireRequestSchemas = {
  'questionnaire.list_definitions': defineRoute({
    input: z.void(),
    output: z.array(questionnaireSummarySchema)
  }),
  'questionnaire.get_definition': defineRoute({
    input: z.strictObject({ questionnaireId: questionnaireIdSchema }),
    output: questionnaireDefinitionSchema
  })
}
