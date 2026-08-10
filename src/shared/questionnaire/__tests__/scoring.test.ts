import { describe, expect, it } from 'vitest'

import { evaluateScore } from '../scoring'
import type { QuestionnaireAnswers, QuestionnaireDefinition, ScoreExpr } from '../types'

const mkDef = (questions: any[], expression: ScoreExpr, maxScore?: number): QuestionnaireDefinition => ({
  questionnaireId: 'T',
  title: 't',
  description: 'd',
  questions,
  scoring: { expression, maxScore }
})

describe('evaluateScore', () => {
  it('score: returns the selected option score', () => {
    const def = mkDef(
      [
        {
          id: 'Q1',
          text: 'q',
          type: 'single_choice',
          options: [
            { label: 'a', value: 'A', score: 0 },
            { label: 'e', value: 'E', score: 4 }
          ]
        }
      ],
      { kind: 'score', question: 'Q1' }
    )
    expect(evaluateScore(def, { kind: 'score', question: 'Q1' }, { Q1: 'E' })).toBe(4)
  })

  it('sum + max: 中国干眼总分 = max(Q1,Q2) + sum(Q3..Q13)', () => {
    const questions = [
      {
        id: 'Q1',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 2 }
        ]
      },
      {
        id: 'Q2',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 3 }
        ]
      },
      {
        id: 'Q3',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q4',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q5',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q6',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q7',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q8',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q9',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q10',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q11',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q12',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      },
      {
        id: 'Q13',
        text: '',
        type: 'single_choice',
        options: [
          { value: 'A', score: 0 },
          { value: 'B', score: 1 }
        ]
      }
    ]
    const expr: ScoreExpr = {
      kind: 'sum',
      items: [
        {
          kind: 'max',
          items: [
            { kind: 'score', question: 'Q1' },
            { kind: 'score', question: 'Q2' }
          ]
        },
        { kind: 'score', question: 'Q3' },
        { kind: 'score', question: 'Q4' },
        { kind: 'score', question: 'Q5' },
        { kind: 'score', question: 'Q6' },
        { kind: 'score', question: 'Q7' },
        { kind: 'score', question: 'Q8' },
        { kind: 'score', question: 'Q9' },
        { kind: 'score', question: 'Q10' },
        { kind: 'score', question: 'Q11' },
        { kind: 'score', question: 'Q12' },
        { kind: 'score', question: 'Q13' }
      ]
    }
    const answers: QuestionnaireAnswers = {
      Q1: 'B',
      Q2: 'A',
      Q3: 'B',
      Q4: 'B',
      Q5: 'B',
      Q6: 'B',
      Q7: 'B',
      Q8: 'B',
      Q9: 'B',
      Q10: 'B',
      Q11: 'B',
      Q12: 'B',
      Q13: 'B'
    }
    // max(Q1=2, Q2=0)=2 + 11×1 = 13
    expect(evaluateScore(mkDef(questions, expr), expr, answers)).toBe(13)
  })

  it('mul: CLDEQ Q1a + Q1b*2', () => {
    const questions = [
      {
        id: 'Q1a',
        text: '',
        type: 'single_choice',
        options: [
          { value: 3, score: 3 },
          { value: 0, score: 0 }
        ]
      },
      { id: 'Q1b', text: '', type: 'single_choice', options: [{ value: 2, score: 2 }] }
    ]
    const expr: ScoreExpr = {
      kind: 'sum',
      items: [
        { kind: 'score', question: 'Q1a' },
        { kind: 'mul', expr: { kind: 'score', question: 'Q1b' }, factor: 2 }
      ]
    }
    expect(evaluateScore(mkDef(questions, expr), expr, { Q1a: 3, Q1b: 2 })).toBe(7)
  })

  it('lookup: PSQI 入睡分钟数映射', () => {
    const def = mkDef([{ id: 'Q2', text: '', type: 'numeric' }], {
      kind: 'lookup',
      input: { kind: 'score', question: 'Q2' },
      table: [
        { type: 'range', min: 0, max: 15, value: 0 },
        { type: 'range', min: 16, max: 30, value: 1 },
        { type: 'range', min: 31, max: 60, value: 2 },
        { type: 'range', min: 61, max: 999, value: 3 }
      ]
    })
    expect(evaluateScore(def, def.scoring.expression, { Q2: '45' })).toBe(2)
  })

  it('efficiency: PSQI 习惯性睡眠效率（Q4=6h, Q1=22:00, Q3=07:00 → 66.7% → 2）', () => {
    const def = mkDef(
      [
        { id: 'Q1', text: '', type: 'time' },
        { id: 'Q3', text: '', type: 'time' },
        { id: 'Q4', text: '', type: 'numeric' }
      ],
      {
        kind: 'efficiency',
        bedTime: 'Q1',
        wakeTime: 'Q3',
        sleepHours: 'Q4',
        table: [
          { type: 'range', min: 85, max: 999, value: 0 },
          { type: 'range', min: 75, max: 84, value: 1 },
          { type: 'range', min: 65, max: 74, value: 2 },
          { type: 'range', min: 0, max: 64, value: 3 }
        ]
      }
    )
    const answers: QuestionnaireAnswers = { Q1: '22:00', Q3: '07:00', Q4: '6' }
    // bedSpan = 540min = 9h; eff = 6/9*100 = 66.67 → 落在 65-74 → 2
    expect(evaluateScore(def, def.scoring.expression, answers)).toBe(2)
  })

  it('matrix: PSQI Q5a 子题得分', () => {
    const def = mkDef(
      [
        {
          id: 'Q5',
          text: '',
          type: 'matrix',
          subQuestions: [
            { id: 'Q5a', text: '' },
            { id: 'Q5b', text: '' }
          ],
          options: [
            { value: 0, score: 0 },
            { value: 1, score: 1 },
            { value: 3, score: 3 }
          ]
        }
      ],
      { kind: 'score', question: 'Q5a' }
    )
    expect(evaluateScore(def, { kind: 'score', question: 'Q5a' }, { Q5: { Q5a: 1, Q5b: 3 } })).toBe(1)
  })
})
