import { Button, ConfirmDialog } from '@cherrystudio/ui'
import type { QuestionnaireSession } from '@shared/data/api/schemas/questionnaires'
import { BASIC_INFO_QUESTIONNAIRE_ID } from '@shared/questionnaire/constants'
import type { QuestionnaireAnswers, QuestionnaireDefinition } from '@shared/questionnaire/types'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export function QuestionnaireHistoryList({
  sessions,
  definitions,
  onDeleteSession,
  onClearAll,
  onViewReport,
  onReAnswer
}: {
  sessions: QuestionnaireSession[]
  definitions: QuestionnaireDefinition[]
  onDeleteSession: (id: string) => void
  onClearAll: () => void
  onViewReport: (session: QuestionnaireSession) => void
  onReAnswer: (answers: QuestionnaireAnswers, flowQuestionnaireId: string) => void
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const patientLabel = (s: QuestionnaireSession): string => {
    // 优先 report.patientInfo，回退到 answers[BASIC_INFO]
    const info = s.report?.patientInfo
    if (info?.length) {
      const getName = (label: string) => info.find((p) => p.label === label)?.value
      const name = getName('姓名')
      const age = getName('年龄')
      const sex = getName('性别')
      return [name, age, sex].filter(Boolean).join(' · ') || '未填写'
    }
    const basic = s.answers[BASIC_INFO_QUESTIONNAIRE_ID]
    if (basic) {
      const name = typeof basic['name'] === 'string' ? basic['name'] : undefined
      const sex = typeof basic['sex'] === 'string' ? basic['sex'] : undefined
      const age = typeof basic['age'] === 'string' ? `${basic['age']}岁` : undefined
      return [name, age, sex].filter(Boolean).join(' · ') || '未填写'
    }
    return '未填写'
  }

  const titleOf = (s: QuestionnaireSession): string =>
    definitions.find((d) => d.questionnaireId === s.flowQuestionnaireId)?.title ?? s.flowQuestionnaireId

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-base">历史记录</h2>
        <Button variant="outline" size="sm" disabled={sessions.length === 0} onClick={() => setClearAllOpen(true)}>
          清空全部历史
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium text-sm">{titleOf(s)}</div>
              <div className="mt-0.5 text-muted-foreground text-xs">{patientLabel(s)}</div>
              <div className="mt-0.5 text-muted-foreground text-xs">
                {s.status === 'completed' ? '已完成' : '进行中'} · {new Date(s.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => onReAnswer(s.answers, s.flowQuestionnaireId)}>
                重新作答
              </Button>
              {s.report && (
                <Button variant="outline" size="sm" onClick={() => onViewReport(s)}>
                  查看报告
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="删除"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDeleteId(s.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && <div className="text-muted-foreground text-sm">暂无历史记录</div>}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title="确认删除"
        description="将删除该条历史记录，此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) onDeleteSession(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />

      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={setClearAllOpen}
        title="清空全部历史"
        description={`将删除全部 ${sessions.length} 条历史记录，此操作不可恢复。`}
        confirmText="清空"
        cancelText="取消"
        destructive
        onConfirm={() => {
          onClearAll()
          setClearAllOpen(false)
        }}
      />
    </div>
  )
}
