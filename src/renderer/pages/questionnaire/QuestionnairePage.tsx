import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@cherrystudio/ui'
import {
  getAgentDraftCacheKey,
  writeAgentDraftCache
} from '@renderer/components/composer/variants/agent/agentDraftCache'
import { dataApiService } from '@renderer/data/DataApiService'
import { useQuery } from '@renderer/data/hooks/useDataApi'
import { ipcApi } from '@renderer/ipc'
import { BASIC_INFO_QUESTIONNAIRE_ID } from '@shared/questionnaire/constants'
import { buildQuestionnaireReport } from '@shared/questionnaire/report'
import type { QuestionAnswer, QuestionnaireAnswers, QuestionnaireDefinition } from '@shared/questionnaire/types'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { QuestionnaireForm } from './components/QuestionnaireForm'
import { QuestionnaireReportView } from './components/QuestionnaireReportView'
import { useQuestionnaireFlow } from './hooks/useQuestionnaireFlow'

type View = 'home' | 'form' | 'report'

export default function QuestionnairePage() {
  const [definitions, setDefinitions] = useState<QuestionnaireDefinition[]>([])
  const [view, setView] = useState<View>('home')
  const [startQuestionnaireId, setStartQuestionnaireId] = useState<string | null>(null)
  const [report, setReport] = useState<ReturnType<typeof buildQuestionnaireReport> | null>(null)
  const { data: sessions, mutate: refreshSessions } = useQuery('/questionnaire-sessions')
  const navigate = useNavigate()

  // 加载全部问卷定义（列表页 + 表单流程共用）
  useEffect(() => {
    void ipcApi
      .request('questionnaire.list_definitions')
      .then((summaries) => {
        void Promise.all(
          summaries.map((s) => ipcApi.request('questionnaire.get_definition', { questionnaireId: s.questionnaireId }))
        ).then(setDefinitions)
      })
      .catch(() => setDefinitions([]))
  }, [])

  const flow = useQuestionnaireFlow(startQuestionnaireId ?? '', {
    prependQuestionnaireId: startQuestionnaireId ? BASIC_INFO_QUESTIONNAIRE_ID : undefined
  })

  const currentDefinition = useMemo(
    () => definitions.find((d) => d.questionnaireId === flow.state.currentQuestionnaireId),
    [definitions, flow.state.currentQuestionnaireId]
  )

  /** 当前问卷的题目列表与索引驱动的当前题。 */
  const currentQuestions = currentDefinition?.questions ?? []
  const questionIndex = Math.min(flow.state.questionIndex, Math.max(0, currentQuestions.length - 1))
  const currentQuestion = currentQuestions[questionIndex] ?? null
  const isLastQuestion = questionIndex === currentQuestions.length - 1
  const isCurrentAnswered =
    !!currentQuestion &&
    flow.state.answers[currentDefinition?.questionnaireId ?? '']?.[currentQuestion.id] !== undefined
  // 流程队列中当前问卷之后还有未完成问卷（如患者基本信息后还有实际问卷）→ 末题前进时应切换到下一问卷。
  const hasNextQuestionnaire =
    !!flow.state.currentQuestionnaireId &&
    !!flow.state.flowQueue.find(
      (id) => id !== flow.state.currentQuestionnaireId && !flow.state.completedQuestionnaireIds.includes(id)
    )

  // 答完当前题自动前进：同问卷内前进到下一题；问卷末题且流程还有下一问卷 → 完成本问卷进入下一问卷。
  // 分支命中时不前进（交给分支对话框）；text/numeric/time 自由输入不中断，改由按钮前进。
  const handleAnswer = useCallback(
    (questionId: string, value: unknown) => {
      if (!currentDefinition) return
      const isFreeInput =
        currentQuestion?.type === 'text' || currentQuestion?.type === 'numeric' || currentQuestion?.type === 'time'
      const triggeredBranch = flow.answerQuestion(
        definitions,
        currentDefinition.questionnaireId,
        questionId,
        value as QuestionAnswer
      )
      if (triggeredBranch) return
      if (isFreeInput) return
      if (isLastQuestion) {
        if (hasNextQuestionnaire) flow.completeQuestionnaire(definitions)
        return
      }
      flow.goToNext(definitions)
    },
    [currentDefinition, definitions, flow, isLastQuestion, currentQuestion, hasNextQuestionnaire]
  )

  /** 完成流程：构建报告 → 保存会话（completed）→ 进入报告视图。 */
  const handleComplete = useCallback(async () => {
    if (!startQuestionnaireId) return
    // 参与问卷按流程顺序：患者基本信息在前，再是起点问卷 + 已作答的分支。
    const basicInfoDef = definitions.find((d) => d.questionnaireId === BASIC_INFO_QUESTIONNAIRE_ID)
    const involved = [
      ...(basicInfoDef ? [basicInfoDef] : []),
      ...definitions.filter(
        (d) =>
          d.questionnaireId !== BASIC_INFO_QUESTIONNAIRE_ID &&
          (d.questionnaireId === startQuestionnaireId ||
            flow.state.completedQuestionnaireIds.includes(d.questionnaireId))
      )
    ]
    const built = buildQuestionnaireReport({
      flowQuestionnaireId: startQuestionnaireId,
      completedAt: new Date().toISOString(),
      definitions: involved,
      answers: flow.state.answers,
      patientInfoQuestionnaireId: BASIC_INFO_QUESTIONNAIRE_ID
    })
    setReport(built)
    setView('report')

    try {
      const answers: QuestionnaireAnswers = flow.state.answers
      const existing = (sessions ?? []).find((s) => s.status === 'in_progress')
      if (existing) {
        await dataApiService.patch(`/questionnaire-sessions/${existing.id}`, {
          body: { answers, report: built, status: 'completed' }
        })
      } else {
        const created = await dataApiService.post('/questionnaire-sessions', {
          body: { flowQuestionnaireId: startQuestionnaireId }
        })
        await dataApiService.patch(`/questionnaire-sessions/${created.id}`, {
          body: { answers, report: built, status: 'completed' }
        })
      }
      void refreshSessions()
    } catch {
      // 持久化失败不阻断查看报告
    }
  }, [
    flow.state.answers,
    flow.state.completedQuestionnaireIds,
    refreshSessions,
    sessions,
    startQuestionnaireId,
    definitions
  ])

  /** 发送报告到问诊AI：解析/创建 clinic 会话 → 预填报告草稿 → 导航。 */
  const handleSendToClinic = useCallback(async () => {
    if (!report) return
    try {
      // 解析 clinic 最新会话；无则创建一个空的 system 工作区会话
      let sessionId: string | null = null
      try {
        const { session } = (await dataApiService.get('/agent-sessions/latest', {
          query: { agentId: 'clinic' }
        })) as { session: { id: string } | null }
        sessionId = session?.id ?? null
      } catch {
        sessionId = null
      }
      if (!sessionId) {
        const created = (await dataApiService.post('/agent-sessions', {
          body: { agentId: 'clinic', name: '', workspace: { type: 'system' } }
        })) as { id: string }
        sessionId = created.id
      }
      // 预填报告到 clinic composer 的默认草稿
      writeAgentDraftCache(getAgentDraftCacheKey('clinic'), report.summary, [])
      void navigate({ to: '/app/clinic', search: { sessionId }, replace: false })
    } catch {
      // 发送失败不阻断；用户可手动复制摘要
    }
  }, [navigate, report])

  if (view === 'report' && report) {
    return (
      <QuestionnaireReportView report={report} onSendToClinic={handleSendToClinic} onBack={() => setView('home')} />
    )
  }

  if (view === 'form' && currentDefinition) {
    const progressPercent = currentQuestions.length > 0 ? ((questionIndex + 1) / currentQuestions.length) * 100 : 0
    return (
      <div data-ui="questionnaire.form" className="flex h-full flex-col overflow-auto p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">{currentDefinition.title}</h1>
            <Badge variant="secondary">
              第 {questionIndex + 1}/{currentQuestions.length} 题
            </Badge>
          </div>
          <div className="mt-1 text-muted-foreground text-sm">{currentDefinition.description}</div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        {currentQuestion ? (
          <>
            <QuestionnaireForm
              question={currentQuestion}
              value={flow.state.answers[currentDefinition.questionnaireId]?.[currentQuestion.id]}
              onAnswer={handleAnswer}
            />
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setView('home')}>
                返回
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={questionIndex === 0} onClick={flow.goToPrev}>
                  上一题
                </Button>
                {isLastQuestion && hasNextQuestionnaire ? (
                  <Button disabled={!isCurrentAnswered} onClick={() => flow.completeQuestionnaire(definitions)}>
                    下一题
                  </Button>
                ) : isLastQuestion ? (
                  <Button disabled={!isCurrentAnswered} onClick={() => void handleComplete()}>
                    完成并生成报告
                  </Button>
                ) : (
                  <Button disabled={!isCurrentAnswered} onClick={() => flow.goToNext(definitions)}>
                    下一题
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : hasNextQuestionnaire ? (
          <div className="flex flex-col items-start gap-4">
            <div className="text-muted-foreground text-sm">本问卷已完成。</div>
            <Button onClick={() => flow.completeQuestionnaire(definitions)}>进入下一部分</Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <div className="text-muted-foreground text-sm">本问卷已完成。</div>
            <Button onClick={() => void handleComplete()}>完成并生成报告</Button>
          </div>
        )}

        {/* 分支确认对话框 */}
        <Dialog open={flow.state.pendingBranch !== null} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>继续作答子问卷？</DialogTitle>
              <DialogDescription>{flow.state.pendingBranch?.promptMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={flow.rejectBranch}>
                跳过
              </Button>
              <Button onClick={flow.acceptBranch}>继续</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 首页：问卷卡片 + 历史会话
  return (
    <div data-ui="questionnaire.view" className="flex h-full flex-col overflow-auto p-6">
      <h1 className="mb-4 font-semibold text-lg">问卷</h1>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {definitions
          .filter((d) => d.questionnaireId !== BASIC_INFO_QUESTIONNAIRE_ID)
          .map((d) => (
            <div
              key={d.questionnaireId}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong">
              <div>
                <div className="font-medium">{d.title}</div>
                <div className="mt-1 line-clamp-2 text-muted-foreground text-sm">{d.description}</div>
              </div>
              <Button
                variant="outline"
                className="mt-4 justify-start"
                onClick={() => {
                  setStartQuestionnaireId(d.questionnaireId)
                  setView('form')
                }}>
                开始作答
              </Button>
            </div>
          ))}
      </div>

      <h2 className="mb-3 font-semibold text-base">历史记录</h2>
      <div className="flex flex-col gap-2">
        {(sessions ?? []).map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <div className="font-medium text-sm">{s.flowQuestionnaireId}</div>
              <div className="mt-0.5 text-muted-foreground text-xs">
                {s.status === 'completed' ? '已完成' : '进行中'} · {new Date(s.updatedAt).toLocaleString()}
              </div>
            </div>
            {s.report && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReport(s.report)
                  setView('report')
                }}>
                查看报告
              </Button>
            )}
          </div>
        ))}
        {sessions?.length === 0 && <div className="text-muted-foreground text-sm">暂无历史记录</div>}
      </div>
    </div>
  )
}
