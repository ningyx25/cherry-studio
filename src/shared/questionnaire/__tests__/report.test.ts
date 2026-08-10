import { describe, expect, it } from 'vitest'

import { buildQuestionnaireReport } from '../report'
import type { QuestionnaireAnswers, QuestionnaireDefinition } from '../types'

const def: QuestionnaireDefinition = {
  questionnaireId: 'Q1',
  title: '问卷A',
  description: 'd',
  questions: [
    {
      id: 'q1',
      text: '症状',
      type: 'single_choice',
      options: [
        { label: '无', value: 'A', score: 0 },
        { label: '重', value: 'E', score: 4 }
      ]
    }
  ],
  scoring: {
    expression: { kind: 'score', question: 'q1' },
    maxScore: 4,
    evaluation: [
      { minScore: 0, maxScore: 3, level: '轻度', assessment: 'a', recommendations: ['r1'] },
      { minScore: 4, maxScore: 4, level: '重度', assessment: 'b', recommendations: ['r2'] }
    ]
  }
}

const answers: QuestionnaireAnswers = { Q1: { q1: 'E' } }

describe('buildQuestionnaireReport', () => {
  it('computes score and level', () => {
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'Q1',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [def],
      answers
    })
    expect(report.answeredQuestionnaires[0].totalScore).toBe(4)
    expect(report.answeredQuestionnaires[0].level).toBe('重度')
    expect(report.answeredQuestionnaires[0].recommendations).toEqual(['r2'])
    expect(report.questions['Q1'][0].answer).toBe('E')
  })

  it('includes risk tags from interpretations', () => {
    const tagged: QuestionnaireDefinition = {
      ...def,
      questionnaireId: 'LIFE',
      scoring: { expression: { kind: 'score', question: 'q1' }, interpretations: { E: ['#电子设备'] } }
    }
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'LIFE',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [tagged],
      answers: { LIFE: { q1: 'E' } }
    })
    expect(report.riskTags).toContain('#电子设备')
    expect(report.summary).toContain('#电子设备')
  })
})
