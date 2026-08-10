import { describe, expect, it } from 'vitest'

import type { QuestionnaireDefinition, ScoreExpr } from '../types'

describe('questionnaire types', () => {
  it('ScoreExpr union supports all six node kinds', () => {
    const exprs: ScoreExpr[] = [
      { kind: 'score', question: 'Q1' },
      { kind: 'sum', items: [{ kind: 'score', question: 'Q1' }] },
      { kind: 'max', items: [{ kind: 'score', question: 'Q1' }] },
      { kind: 'mul', expr: { kind: 'score', question: 'Q1b' }, factor: 2 },
      { kind: 'lookup', input: { kind: 'score', question: 'Q2' }, table: [] },
      {
        kind: 'efficiency',
        bedTime: 'Q1',
        wakeTime: 'Q3',
        sleepHours: 'Q4',
        table: [{ type: 'range', min: 0, max: 85, value: 0 }]
      }
    ]
    expect(exprs).toHaveLength(6)
  })

  it('QuestionnaireDefinition composes sections referencing flat questions', () => {
    const def: QuestionnaireDefinition = {
      questionnaireId: 'T',
      title: 't',
      description: 'd',
      sections: [{ sectionId: 'S', sectionName: 's', questionIds: ['Q1'] }],
      questions: [{ id: 'Q1', text: 'q', type: 'single_choice', options: [{ label: 'a', value: 'A' }] }],
      scoring: { expression: { kind: 'score', question: 'Q1' } }
    }
    expect(def.sections?.[0].questionIds[0]).toBe('Q1')
  })
})
