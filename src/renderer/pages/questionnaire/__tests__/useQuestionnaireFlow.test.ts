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
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.acceptBranch()
    })
    expect(result.current.state.currentQuestionnaireId).toBe('CLDEQ8')
    expect(result.current.state.pendingBranch).toBeNull()
  })

  it('rejectBranch records the target as completed', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.rejectBranch()
    })
    expect(result.current.state.completedQuestionnaireIds).toContain('CLDEQ8')
    expect(result.current.state.pendingBranch).toBeNull()
  })

  it('resets the flow and switches questionnaire when startQuestionnaireId changes', () => {
    const { result, rerender } = renderHook(({ id }: { id: string }) => useQuestionnaireFlow(id), {
      initialProps: { id: 'CHINA_DRY_EYE' }
    })
    // 答了一题并前进，制造进行中的状态
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.goToNext(defs)
    })
    expect(result.current.state.questionIndex).toBe(1)

    // 点击另一份问卷的"开始作答"→ startQuestionnaireId 变化
    act(() => rerender({ id: 'CLDEQ8' }))

    expect(result.current.state.currentQuestionnaireId).toBe('CLDEQ8')
    expect(result.current.state.questionIndex).toBe(0)
    expect(result.current.state.answers).toEqual({})
    expect(result.current.state.pendingBranch).toBeNull()
    expect(result.current.state.completedQuestionnaireIds).toEqual([])
  })

  it('goToNext advances the index and clamps at the last question', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    // CHINA_DRY_EYE 有 2 题
    act(() => {
      result.current.goToNext(defs)
    })
    expect(result.current.state.questionIndex).toBe(1)
    // 末题 no-op
    act(() => {
      result.current.goToNext(defs)
    })
    expect(result.current.state.questionIndex).toBe(1)
  })

  it('goToPrev goes back and clamps at the first question', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.goToNext(defs)
    })
    expect(result.current.state.questionIndex).toBe(1)
    act(() => {
      result.current.goToPrev()
    })
    expect(result.current.state.questionIndex).toBe(0)
    // 首题 no-op
    act(() => {
      result.current.goToPrev()
    })
    expect(result.current.state.questionIndex).toBe(0)
  })

  it('answerQuestion alone does not move the index', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'A')
    })
    expect(result.current.state.questionIndex).toBe(0)
  })

  it('acceptBranch resets the index when switching to the branch questionnaire', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.goToNext(defs)
    })
    act(() => {
      result.current.goToPrev()
    })
    // 制造一个非 0 索引，再 accept 分支
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    expect(result.current.state.pendingBranch?.targetQuestionnaireId).toBe('CLDEQ8')
    act(() => {
      result.current.acceptBranch()
    })
    expect(result.current.state.currentQuestionnaireId).toBe('CLDEQ8')
    expect(result.current.state.questionIndex).toBe(0)
  })

  it('rejectBranch leaves the index unchanged', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE'))
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.goToNext(defs)
    })
    expect(result.current.state.questionIndex).toBe(1)
    act(() => {
      result.current.rejectBranch()
    })
    expect(result.current.state.questionIndex).toBe(1)
  })

  it('starts with the prepended questionnaire when prependQuestionnaireId is set', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE', { prependQuestionnaireId: 'BASIC_INFO' }))
    expect(result.current.state.currentQuestionnaireId).toBe('BASIC_INFO')
    expect(result.current.state.flowQueue).toEqual(['BASIC_INFO', 'CHINA_DRY_EYE'])
  })

  it('advances from prepended questionnaire to the start questionnaire on complete', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE', { prependQuestionnaireId: 'BASIC_INFO' }))
    act(() => {
      result.current.completeQuestionnaire(defs)
    })
    expect(result.current.state.currentQuestionnaireId).toBe('CHINA_DRY_EYE')
  })

  it('still returns to a branch target when completing a queue member', () => {
    const { result } = renderHook(() => useQuestionnaireFlow('CHINA_DRY_EYE', { prependQuestionnaireId: 'BASIC_INFO' }))
    // 完成 BASIC_INFO → 进入 CHINA_DRY_EYE
    act(() => {
      result.current.completeQuestionnaire(defs)
    })
    // 在 CHINA_DRY_EYE 触发分支 → accept → CLDEQ8
    act(() => {
      result.current.answerQuestion(defs, 'CHINA_DRY_EYE', 'Q1', 'B')
    })
    act(() => {
      result.current.acceptBranch()
    })
    expect(result.current.state.currentQuestionnaireId).toBe('CLDEQ8')
    // 完成 CLDEQ8 → 回到队列下一个未完成（CHINA_DRY_EYE）
    act(() => {
      result.current.completeQuestionnaire(defs)
    })
    expect(result.current.state.currentQuestionnaireId).toBe('CHINA_DRY_EYE')
  })
})
