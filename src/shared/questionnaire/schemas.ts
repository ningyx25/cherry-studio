import * as z from 'zod'

import type { LookupRow, QuestionnaireDefinition, ScoreExpr } from './types'

const lookupRowSchema: z.ZodType<LookupRow> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('range'), min: z.number(), max: z.number(), value: z.number() }),
  z.object({ type: z.literal('score-sum'), min: z.number(), max: z.number(), value: z.number() })
])

const scoreExprSchema: z.ZodType<ScoreExpr> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('score'), question: z.string() }),
    z.object({ kind: z.literal('sum'), items: z.array(scoreExprSchema) }),
    z.object({ kind: z.literal('max'), items: z.array(scoreExprSchema) }),
    z.object({ kind: z.literal('mul'), expr: scoreExprSchema, factor: z.number() }),
    z.object({ kind: z.literal('lookup'), input: scoreExprSchema, table: z.array(lookupRowSchema) }),
    z.object({
      kind: z.literal('efficiency'),
      bedTime: z.string(),
      wakeTime: z.string(),
      sleepHours: z.string(),
      table: z.array(lookupRowSchema)
    })
  ])
)

export const questionnaireOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  score: z.number().optional(),
  convertedScore: z.number().optional()
})

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('single_choice'),
    options: z.array(questionnaireOptionSchema),
    patientExplanation: z.string().optional(),
    mutuallyExclusiveWith: z.string().optional()
  }),
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('multi_choice'),
    subItems: z.array(z.string()),
    options: z.array(questionnaireOptionSchema)
  }),
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('matrix'),
    subQuestions: z.array(z.object({ id: z.string(), text: z.string() })),
    options: z.array(questionnaireOptionSchema)
  }),
  z.object({ id: z.string(), text: z.string(), type: z.literal('numeric'), unit: z.string().optional() }),
  z.object({ id: z.string(), text: z.string(), type: z.literal('time') })
])

export const questionnaireDefinitionSchema: z.ZodType<QuestionnaireDefinition> = z.object({
  questionnaireId: z.string(),
  title: z.string(),
  description: z.string(),
  sections: z
    .array(z.object({ sectionId: z.string(), sectionName: z.string(), questionIds: z.array(z.string()) }))
    .optional(),
  basicInfoFields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['string', 'enum', 'date', 'integer']),
        options: z.array(z.string()).optional(),
        optional: z.boolean().optional()
      })
    )
    .optional(),
  questions: z.array(questionSchema),
  branchingRules: z
    .array(
      z.object({
        ruleId: z.string(),
        triggerQuestion: z.string(),
        condition: z.enum(['not_equal', 'contains_any']),
        value: z.union([z.string(), z.array(z.string())]),
        targetQuestionnaireId: z.string(),
        promptMessage: z.string()
      })
    )
    .optional(),
  scoring: z.object({
    expression: scoreExprSchema,
    maxScore: z.number().optional(),
    standardize: z.object({ divideBy: z.number(), multiplyBy: z.number() }).optional(),
    evaluation: z
      .array(
        z.object({
          minScore: z.number(),
          maxScore: z.number(),
          level: z.string(),
          assessment: z.string(),
          recommendations: z.array(z.string())
        })
      )
      .optional(),
    interpretations: z.record(z.string(), z.array(z.string())).optional()
  })
})

export function parseQuestionnaireDefinition(raw: unknown): QuestionnaireDefinition {
  return questionnaireDefinitionSchema.parse(raw)
}
