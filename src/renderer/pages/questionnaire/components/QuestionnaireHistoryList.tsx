import { Button, ConfirmDialog } from '@huatuostudio/ui'
import { patientLabel } from '@renderer/utils/questionnaire'
import type { QuestionnaireSession } from '@shared/data/api/schemas/questionnaires'
import type { QuestionnaireAnswers, QuestionnaireDefinition } from '@shared/questionnaire/types'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const titleOf = (s: QuestionnaireSession): string =>
    definitions.find((d) => d.questionnaireId === s.flowQuestionnaireId)?.title ?? s.flowQuestionnaireId

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-base">{t('questionnaire.history.title')}</h2>
        <Button variant="outline" size="sm" disabled={sessions.length === 0} onClick={() => setClearAllOpen(true)}>
          {t('questionnaire.history.clear_all')}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium text-sm">{titleOf(s)}</div>
              <div className="mt-0.5 text-muted-foreground text-xs">
                {patientLabel(s) || t('questionnaire.history.unfilled')}
              </div>
              <div className="mt-0.5 text-muted-foreground text-xs">
                {s.status === 'completed'
                  ? t('questionnaire.history.status_completed')
                  : t('questionnaire.history.status_in_progress')}{' '}
                · {new Date(s.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => onReAnswer(s.answers, s.flowQuestionnaireId)}>
                {t('questionnaire.history.re_answer')}
              </Button>
              {s.report && (
                <Button variant="outline" size="sm" onClick={() => onViewReport(s)}>
                  {t('questionnaire.history.view_report')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('common.delete')}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDeleteId(s.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-muted-foreground text-sm">{t('questionnaire.history.empty')}</div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title={t('questionnaire.history.confirm_delete_title')}
        description={t('questionnaire.history.confirm_delete_desc')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (pendingDeleteId) onDeleteSession(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />

      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={setClearAllOpen}
        title={t('questionnaire.history.clear_all')}
        description={t('questionnaire.history.confirm_clear_desc', { count: sessions.length })}
        confirmText={t('questionnaire.history.clear_confirm')}
        cancelText={t('common.cancel')}
        destructive
        onConfirm={() => {
          onClearAll()
          setClearAllOpen(false)
        }}
      />
    </div>
  )
}
