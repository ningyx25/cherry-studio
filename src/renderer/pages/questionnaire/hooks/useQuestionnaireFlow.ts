import type {
  BranchingRule,
  QuestionAnswer,
  QuestionnaireAnswers,
  QuestionnaireDefinition
} from '@shared/questionnaire/types'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface QuestionnaireFlowState {
  /** 当前正在作答的问卷 id */
  currentQuestionnaireId: string
  /** 当前问卷内的题目索引（0-based） */
  questionIndex: number
  /** 已完成作答的问卷 id（含被拒绝的分支） */
  completedQuestionnaireIds: string[]
  /** 待确认的分支规则（命中但未确认） */
  pendingBranch: BranchingRule | null
  /** 自动跳过且不存在的分支目标 */
  skippedBranchTargets: string[]
  answers: QuestionnaireAnswers
}

/**
 * 多问卷流程状态机：按 branching_rules 跳转子问卷。
 * - 命中规则且目标定义存在 → 弹确认（pendingBranch）
 * - 目标定义不存在 → 自动跳过并记录
 */
export function useQuestionnaireFlow(startQuestionnaireId: string) {
  const [state, setState] = useState<QuestionnaireFlowState>({
    currentQuestionnaireId: startQuestionnaireId,
    questionIndex: 0,
    completedQuestionnaireIds: [],
    pendingBranch: null,
    skippedBranchTargets: [],
    answers: {}
  })
  // useState 只在首次渲染取初始值。`startQuestionnaireId` 是外部驱动的"开始作答"
  // 目标：每当它变化（通常是用户点击开始作答）就重置为一份全新流程。
  const startQuestionnaireIdRef = useRef(startQuestionnaireId)
  useEffect(() => {
    if (startQuestionnaireIdRef.current === startQuestionnaireId) return
    startQuestionnaireIdRef.current = startQuestionnaireId
    setState({
      currentQuestionnaireId: startQuestionnaireId,
      questionIndex: 0,
      completedQuestionnaireIds: [],
      pendingBranch: null,
      skippedBranchTargets: [],
      answers: {}
    })
  }, [startQuestionnaireId])

  /** 用户答完一题后：评估分支规则，决定是否插入子问卷。返回是否命中了分支（调用方据此决定是否前进）。 */
  const answerQuestion = useCallback(
    (
      definitions: QuestionnaireDefinition[],
      questionnaireId: string,
      questionId: string,
      value: QuestionAnswer
    ): boolean => {
      const currentQ = state.answers[questionnaireId] ?? {}
      const nextAnswers: QuestionnaireAnswers = {
        ...state.answers,
        [questionnaireId]: { ...currentQ, [questionId]: value }
      }
      const def = definitions.find((d) => d.questionnaireId === questionnaireId)
      const rule = def?.branchingRules?.find((r) => {
        const ans = nextAnswers[questionnaireId]?.[r.triggerQuestion]
        if (r.condition === 'not_equal') return ans !== undefined && ans !== r.value
        if (r.condition === 'contains_any') {
          if (!Array.isArray(ans)) return false
          return (r.value as string[]).some((v) => ans.includes(v))
        }
        return false
      })
      if (rule) {
        const exists = definitions.some((d) => d.questionnaireId === rule.targetQuestionnaireId)
        if (!exists) {
          setState((prev) => ({
            ...prev,
            answers: nextAnswers,
            skippedBranchTargets: [...prev.skippedBranchTargets, rule.targetQuestionnaireId]
          }))
          return false
        }
        setState((prev) => ({ ...prev, answers: nextAnswers, pendingBranch: rule }))
        return true
      }
      setState((prev) => ({ ...prev, answers: nextAnswers }))
      return false
    },
    [state]
  )

  const acceptBranch = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingBranch) return prev
      // 切到子问卷，从第 1 题开始。
      return {
        ...prev,
        currentQuestionnaireId: prev.pendingBranch.targetQuestionnaireId,
        questionIndex: 0,
        pendingBranch: null
      }
    })
  }, [])

  const rejectBranch = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingBranch) return prev
      return {
        ...prev,
        completedQuestionnaireIds: [...prev.completedQuestionnaireIds, prev.pendingBranch.targetQuestionnaireId],
        pendingBranch: null
      }
    })
  }, [])

  /** 完成当前问卷，前进到下一个尚未作答的问卷（若还有）。 */
  const completeQuestionnaire = useCallback((definitions: QuestionnaireDefinition[]) => {
    setState((prev) => {
      const done = [...prev.completedQuestionnaireIds, prev.currentQuestionnaireId]
      const next = definitions.find((d) => !done.includes(d.questionnaireId))
      return {
        ...prev,
        completedQuestionnaireIds: done,
        questionIndex: 0,
        currentQuestionnaireId: next?.questionnaireId ?? prev.currentQuestionnaireId
      }
    })
  }, [])

  /** 下一题：索引 +1，末题 no-op。只移动索引，不做分支评估。 */
  const goToNext = useCallback((definitions: QuestionnaireDefinition[]) => {
    setState((prev) => {
      const questions = definitions.find((d) => d.questionnaireId === prev.currentQuestionnaireId)?.questions ?? []
      if (prev.questionIndex >= questions.length - 1) return prev
      return { ...prev, questionIndex: prev.questionIndex + 1 }
    })
  }, [])

  /** 上一题：索引 -1，首题 no-op。 */
  const goToPrev = useCallback(() => {
    setState((prev) => {
      if (prev.questionIndex <= 0) return prev
      return { ...prev, questionIndex: prev.questionIndex - 1 }
    })
  }, [])

  return { state, answerQuestion, acceptBranch, rejectBranch, completeQuestionnaire, goToNext, goToPrev }
}
