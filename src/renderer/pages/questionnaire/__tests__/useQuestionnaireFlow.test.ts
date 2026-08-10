import type { QuestionnaireDefinition } from '@shared/questionnaire/types'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useQuestionnaireFlow } from '../hooks/useQuestionnaireFlow'

const chDef: QuestionnaireDefinition = {
  questionnaireId: 'CHINA_DRY_EYE',
  title: '中国干眼',
  description: 'd',
  questions: [
    {
      id: 'Q1',
      text: '隐形眼镜',
      type: 'single_choice',
      options: [
        { label: '无', value: 'A' },
        { label: '有', value: 'B' }
      ]
    },
    {
      id: 'Q4',
      text: '睡眠',
      type: 'single_choice',
      options: [
        { label: '好', value: 'A' },
        { label: '差', value: 'B' }
      ]
    }
  ],
  branchingRules: [
    {
      ruleId: 'RULE_CLDEQ8',
      triggerQuestion: 'Q1',
      condition: 'not_equal',
      value: 'A',
      targetQuestionnaireId: 'CLDEQ8',
      promptMessage: '继续 CLDEQ8？'
    }
  ],
  scoring: { expression: { kind: 'score', question: 'Q1' } }
}

const cldeqDef: QuestionnaireDefinition = {
  questionnaireId: 'CLDEQ8',
  title: 'CLDEQ-8',
  description: 'd',
  questions: [{ id: 'Q1a', text: '不适', type: 'single_choice', options: [{ label: '0', value: 0, score: 0 }] }],
  scoring: { expression: { kind: 'score', question: 'Q1a' } }
}

const defs = [chDef, cldeqDef]

describe('useQuestionnaireFlow', () => {
  beforeEach(() => {})

  it('answers a question and does not trigger branch when condition unmet', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'A')
    })
    expect(result.current.state.answers['CHINA_DRY_EYE'].Q1).toBe('A')
    expect(result.current.state.pendingBranch).toBeNull()
  })

  it('triggers a pending branch when condition met and target exists', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    expect(result.current.state.pendingBranch?.targetQuestionnaireId).toBe('CLDEQ8')
  })

  it('auto-skips a branch target that does not exist in definitions', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    // CLDEQ8 从 defs 移除 → 目标不存在 → 自动跳过
    act(() => {
      result.current.answerQuestion([chDef], 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    expect(result.current.state.pendingBranch).toBeNull()
    expect(result.current.state.skippedBranchTargets).toContain('CLDEQ8')
  })

  it('acceptBranch switches to the target questionnaire', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B'))
    act(() => result.current.acceptBranch())
    expect(result.current.state.currentQuestionnaireId).toBe('CLDEQ8')
    expect(result.current.state.pendingBranch).toBeNull()
  })

  it('rejectBranch records the target as completed', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B'))
    act(() => result.current.rejectBranch())
    expect(result.current.state.completedQuestionnaireIds).toContain('CLDEQ8')
    expect(result.current.state.pendingBranch).toBeNull()
  })
})
