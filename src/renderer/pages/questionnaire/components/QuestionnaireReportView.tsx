import { Badge, Button } from '@cherrystudio/ui'
import type { QuestionnaireReport, QuestionResult } from '@shared/questionnaire/types'

export function QuestionnaireReportView({
  report,
  onSendToClinic,
  onBack
}: {
  report: QuestionnaireReport
  onSendToClinic: () => void
  onBack: () => void
}) {
  const patientRef = report.patientInfo?.length ? `患者：${report.patientInfo.map((p) => p.value).join('，')}` : ''

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">问卷报告</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            返回
          </Button>
          <Button onClick={onSendToClinic}>发送到问诊AI</Button>
        </div>
      </div>

      {report.patientInfo && report.patientInfo.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 font-medium">患者基本信息</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {report.patientInfo.map((p) => (
              <div key={p.label} className="text-sm">
                <span className="text-muted-foreground">{p.label}：</span>
                <span className="font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.answeredQuestionnaires.map((qr) => (
        <div key={qr.questionnaireId} className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">{qr.title}</div>
            {qr.scored && qr.totalScore !== undefined && (
              <div className="text-muted-foreground text-sm">得分 {qr.totalScore}</div>
            )}
          </div>
          {patientRef && <div className="mt-0.5 text-muted-foreground text-xs">{patientRef}</div>}
          {qr.level && (
            <div className="mt-2">
              <Badge variant="secondary">{qr.level}</Badge>
            </div>
          )}
          {qr.assessment && <div className="mt-1 text-muted-foreground text-sm">{qr.assessment}</div>}
          {qr.recommendations.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {qr.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {qr.riskTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {qr.riskTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-subtle bg-background-subtle px-2 py-0.5 text-muted-foreground text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 border-border border-t pt-3">
            <div className="mb-2 font-medium text-sm">详细作答</div>
            <div className="flex flex-col gap-1.5">
              {(report.questions[qr.questionnaireId] ?? []).map((q) => (
                <QuestionAnswerRow key={q.questionId} q={q} />
              ))}
            </div>
          </div>
        </div>
      ))}

      {report.riskTags.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 font-medium">危险因素</div>
          <div className="flex flex-wrap gap-1.5">
            {report.riskTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border-subtle bg-background-subtle px-2 py-0.5 text-muted-foreground text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 font-medium">综合摘要（发送给问诊AI）</div>
        <pre className="whitespace-pre-wrap font-sans text-muted-foreground text-sm">{report.summary}</pre>
      </div>
    </div>
  )
}

/** 单题作答展示：matrix 用 subAnswers 逐行，其它用 optionLabel/answer + unit。 */
function QuestionAnswerRow({ q }: { q: QuestionResult }) {
  if (q.subAnswers?.length) {
    return (
      <div className="text-sm">
        <div className="font-medium">{q.questionText}</div>
        <div className="mt-1 flex flex-col gap-0.5">
          {q.subAnswers.map((s) => (
            <div key={s.subId} className="text-muted-foreground">
              {s.text}：<span className="text-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  const answerText =
    q.optionLabel !== undefined
      ? q.optionLabel
      : q.answer === undefined || q.answer === null || q.answer === ''
        ? '（未填写）'
        : `${String(q.answer)}${q.unit ?? ''}`
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="font-medium">{q.questionText}</span>
      <span className="text-muted-foreground">回答：</span>
      <span>{answerText}</span>
    </div>
  )
}
