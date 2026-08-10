import type {
  BranchingRule,
  QuestionAnswer,
  QuestionnaireAnswers,
  QuestionnaireDefinition
} from '@shared/questionnaire/types'
import { useCallback, useState } from 'react'

export interface QuestionnaireFlowState {
  /** 当前正在作答的问卷 id */
  currentQuestionnaireId: string
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
    completedQuestionnaireIds: [],
    pendingBranch: null,
    skippedBranchTargets: [],
    answers: {}
  })

  /** 用户答完一题后：评估分支规则，决定是否插入子问卷。 */
  const answerQuestion = useCallback(
    (definitions: QuestionnaireDefinition[], questionnaireId: string, questionId: string, value: QuestionAnswer) => {
      setState((prev) => {
        const currentQ = prev.answers[questionnaireId] ?? {}
        const nextAnswers: QuestionnaireAnswers = {
          ...prev.answers,
          [questionnaireId]: { ...currentQ, [questionId]: value }
        }
        const def = definitions.find((d) => d.questionnaireId === questionnaireId)
        const rule = def?.branchingRules?.find((r) => {
          const ans = nextAnswers[questionnaireId]?.[r.triggerQuestion]
          if (r.condition === 'not_equal') return ans !== undefined && ans !== r.value
          if (r.condition === 'contains_any') {
            if (!Array.isArray(ans)) return false
            return (r.value as string[]).some((v) => (ans as string[]).includes(v))
          }
          return false
        })
        if (rule) {
          const exists = definitions.some((d) => d.questionnaireId === rule.targetQuestionnaireId)
          if (!exists) {
            return {
              ...prev,
              answers: nextAnswers,
              skippedBranchTargets: [...prev.skippedBranchTargets, rule.targetQuestionnaireId]
            }
          }
          return { ...prev, answers: nextAnswers, pendingBranch: rule }
        }
        return { ...prev, answers: nextAnswers }
      })
    },
    []
  )

  const acceptBranch = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingBranch) return prev
      return { ...prev, currentQuestionnaireId: prev.pendingBranch.targetQuestionnaireId, pendingBranch: null }
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
        currentQuestionnaireId: next?.questionnaireId ?? prev.currentQuestionnaireId
      }
    })
  }, [])

  return { state, answerQuestion, acceptBranch, rejectBranch, completeQuestionnaire }
}
