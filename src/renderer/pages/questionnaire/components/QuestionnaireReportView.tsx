import { Badge, Button } from '@cherrystudio/ui'
import type { QuestionnaireReport } from '@shared/questionnaire/types'

export function QuestionnaireReportView({
  report,
  onSendToClinic,
  onBack
}: {
  report: QuestionnaireReport
  onSendToClinic: () => void
  onBack: () => void
}) {
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

      {report.answeredQuestionnaires.map((qr) => (
        <div key={qr.questionnaireId} className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">{qr.title}</div>
            {qr.scored && qr.totalScore !== undefined && (
              <div className="text-muted-foreground text-sm">得分 {qr.totalScore}</div>
            )}
          </div>
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
