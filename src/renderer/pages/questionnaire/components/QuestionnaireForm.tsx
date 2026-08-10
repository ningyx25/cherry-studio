import { Button } from '@cherrystudio/ui'
import type { QuestionnaireQuestion } from '@shared/questionnaire/types'

export function QuestionnaireForm({
  question,
  value,
  onAnswer
}: {
  question: QuestionnaireQuestion
  value: unknown
  onAnswer: (questionId: string, value: unknown) => void
}) {
  const renderOptions = (options: QuestionnaireQuestion & { type: 'single_choice' | 'multi_choice' | 'matrix' }) => {
    if (options.type === 'single_choice') {
      return (
        <div className="flex flex-col gap-1.5">
          {options.options.map((opt) => (
            <Button
              key={String(opt.value)}
              variant={value === opt.value ? 'default' : 'outline'}
              className="justify-start"
              onClick={() => onAnswer(options.id, opt.value)}>
              {opt.label}
            </Button>
          ))}
        </div>
      )
    }
    if (options.type === 'multi_choice') {
      return (
        <div className="flex flex-col gap-1.5">
          {options.options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value)
            return (
              <Button
                key={String(opt.value)}
                variant={selected ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => {
                  const current = Array.isArray(value) ? (value as Array<string | number>) : []
                  const next = selected ? current.filter((v) => v !== opt.value) : [...current, opt.value]
                  onAnswer(options.id, next)
                }}>
                {opt.label}
              </Button>
            )
          })}
        </div>
      )
    }
    // matrix: 逐子题选择同一组选项
    return (
      <div className="flex flex-col gap-3">
        {options.subQuestions.map((sub) => (
          <div key={sub.id} className="flex flex-col gap-1">
            <div className="text-sm">{sub.text}</div>
            <div className="flex flex-wrap gap-1.5">
              {options.options.map((opt) => {
                const record =
                  value && typeof value === 'object' && !Array.isArray(value)
                    ? (value as Record<string, string | number>)
                    : {}
                const selected = record[sub.id] === opt.value
                return (
                  <Button
                    key={String(opt.value)}
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onAnswer(options.id, { ...record, [sub.id]: opt.value })}>
                    {opt.label}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium text-base">{question.text}</div>
      {'patientExplanation' in question && question.patientExplanation && (
        <div className="text-sm opacity-60">{question.patientExplanation}</div>
      )}
      {question.type === 'numeric' ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-32 rounded border bg-transparent px-2 py-1"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            placeholder={question.unit ? `单位：${question.unit}` : '请输入'}
          />
          {question.unit && <span className="text-sm opacity-60">{question.unit}</span>}
        </div>
      ) : question.type === 'time' ? (
        <input
          type="time"
          className="w-32 rounded border bg-transparent px-2 py-1"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onAnswer(question.id, e.target.value)}
        />
      ) : (
        renderOptions(question as QuestionnaireQuestion & { type: 'single_choice' | 'multi_choice' | 'matrix' })
      )}
    </div>
  )
}
