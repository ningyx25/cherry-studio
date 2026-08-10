import { describe, expect, it } from 'vitest'

import { parseQuestionnaireDefinition } from '../schemas'

const validDefinition = {
  questionnaireId: 'T',
  title: '测试问卷',
  description: 'desc',
  questions: [{ id: 'Q1', text: 'q1', type: 'single_choice', options: [{ label: 'a', value: 'A', score: 0 }] }],
  scoring: { expression: { kind: 'score', question: 'Q1' }, maxScore: 1 }
}

describe('questionnaireDefinitionSchema', () => {
  it('parses a valid single-choice definition', () => {
    const parsed = parseQuestionnaireDefinition(validDefinition)
    expect(parsed.questions[0].type).toBe('single_choice')
    expect(parsed.scoring.maxScore).toBe(1)
  })

  it('rejects a definition with an unknown question type', () => {
    const bad = { ...validDefinition, questions: [{ id: 'Q1', text: 'q', type: 'bad_type' }] }
    expect(() => parseQuestionnaireDefinition(bad)).toThrow()
  })

  it('rejects a scoring expression with an invalid kind', () => {
    const bad = { ...validDefinition, scoring: { expression: { kind: 'sqrt', question: 'Q1' } } }
    expect(() => parseQuestionnaireDefinition(bad)).toThrow()
  })
})
