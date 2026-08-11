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
      scoring: { expression: { kind: 'score', question: 'q1' }, interpretations: { 'q1:E': ['#电子设备'] } }
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

  it('extracts patient basic info without scoring it', () => {
    const basicInfo: QuestionnaireDefinition = {
      questionnaireId: 'BASIC_INFO',
      title: '患者基本信息',
      description: 'd',
      questions: [
        { id: 'name', text: '姓名', type: 'text' },
        { id: 'age', text: '年龄', type: 'numeric', unit: '岁' }
      ],
      scoring: { expression: { kind: 'sum', items: [] } }
    }
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'Q1',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [basicInfo, def],
      answers: { BASIC_INFO: { name: '张三', age: '45' }, Q1: { q1: 'E' } },
      patientInfoQuestionnaireId: 'BASIC_INFO'
    })
    expect(report.patientInfo).toEqual([
      { label: '姓名', value: '张三' },
      { label: '年龄', value: '45岁' }
    ])
    // 基本信息不计分、不进已答问卷列表
    expect(report.answeredQuestionnaires.map((r) => r.questionnaireId)).not.toContain('BASIC_INFO')
    expect(report.summary).toContain('姓名：张三')
    expect(report.summary).toContain('年龄：45岁')
  })

  it('includes full Q&A with question text and option labels in summary', () => {
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'Q1',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [def],
      answers: { Q1: { q1: 'E' } }
    })
    // 题干 + 选项标签
    expect(report.questions['Q1'][0].questionText).toBe('症状')
    expect(report.questions['Q1'][0].optionLabel).toBe('重')
    expect(report.summary).toContain('症状：回答 重')
    expect(report.summary).toContain('详细作答')
  })

  it('renders matrix sub-answers in question results and summary', () => {
    const matrixDef: QuestionnaireDefinition = {
      questionnaireId: 'M',
      title: '矩阵问卷',
      description: 'd',
      questions: [
        {
          id: 'Qm',
          text: '频率',
          type: 'matrix',
          subQuestions: [
            { id: 'Qm_a', text: '入睡困难' },
            { id: 'Qm_b', text: '早醒' }
          ],
          options: [
            { label: '无', value: 0, score: 0 },
            { label: '1-2次', value: 1, score: 1 }
          ]
        }
      ],
      scoring: {
        expression: {
          kind: 'sum',
          items: [
            { kind: 'score', question: 'Qm_a' },
            { kind: 'score', question: 'Qm_b' }
          ]
        }
      }
    }
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'M',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [matrixDef],
      answers: { M: { Qm: { Qm_a: 1, Qm_b: 0 } } }
    })
    expect(report.questions['M'][0].subAnswers).toEqual([
      { subId: 'Qm_a', text: '入睡困难', label: '1-2次', value: 1 },
      { subId: 'Qm_b', text: '早醒', label: '无', value: 0 }
    ])
    expect(report.summary).toContain('入睡困难：1-2次')
  })
})
