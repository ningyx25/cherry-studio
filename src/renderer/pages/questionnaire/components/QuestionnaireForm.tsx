import { Button, Checkbox, Input, RadioGroup, RadioGroupItem } from '@cherrystudio/ui'
import type { QuestionnaireQuestion } from '@shared/questionnaire/types'
import { useTranslation } from 'react-i18next'

export function QuestionnaireForm({
  question,
  value,
  onAnswer
}: {
  question: QuestionnaireQuestion
  value: unknown
  onAnswer: (questionId: string, value: unknown) => void
}) {
  const { t } = useTranslation()
  const renderOptions = (options: QuestionnaireQuestion & { type: 'single_choice' | 'matrix' }) => {
    if (options.type === 'single_choice') {
      return (
        <RadioGroup
          value={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          onValueChange={(next) => {
            const numeric = options.options.find((opt) => String(opt.value) === next)
            onAnswer(options.id, numeric?.value ?? next)
          }}>
          {options.options.map((opt) => {
            const selected = String(opt.value) === String(value)
            return (
              <div
                key={String(opt.value)}
                role="radio"
                aria-checked={selected}
                data-state={selected ? 'checked' : 'unchecked'}
                onClick={() => onAnswer(options.id, opt.value)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:border-primary ${
                  selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent'
                }`}>
                <span className="text-sm">{opt.label}</span>
                <RadioGroupItem value={String(opt.value)} className="pointer-events-none" />
              </div>
            )
          })}
        </RadioGroup>
      )
    }
    // matrix: 逐子题选择同一组选项
    const record =
      value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string | number>) : {}
    return (
      <div className="flex flex-col gap-3">
        {options.subQuestions.map((sub) => (
          <div key={sub.id} className="flex flex-col gap-1.5">
            <div className="font-medium text-sm">{sub.text}</div>
            <div className="flex flex-wrap gap-1.5">
              {options.options.map((opt) => {
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

  /** multi_choice：勾选 subItem，noneSubItem（如「无」）与其余项互斥。答案为选中项数组，不自动前进。 */
  const renderMultiChoice = (question: QuestionnaireQuestion & { type: 'multi_choice' }) => {
    const current = Array.isArray(value) ? (value as string[]) : []
    const none = question.noneSubItem
    const toggle = (item: string) => {
      if (item === none) {
        onAnswer(question.id, current.includes(none) ? [] : [none])
        return
      }
      const withoutNone = current.filter((v) => v !== none)
      const next = withoutNone.includes(item) ? withoutNone.filter((v) => v !== item) : [...withoutNone, item]
      onAnswer(question.id, next)
    }
    return (
      <div className="flex flex-col gap-1.5">
        {question.subItems.map((item) => {
          const selected = current.includes(item)
          return (
            <div
              key={item}
              role="checkbox"
              aria-checked={selected}
              data-state={selected ? 'checked' : 'unchecked'}
              onClick={() => toggle(item)}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:border-primary ${
                selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent'
              }`}>
              <span className="text-sm">{item}</span>
              <Checkbox checked={selected} className="pointer-events-none" />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="font-medium text-base">{question.text}</div>
      {'patientExplanation' in question && question.patientExplanation && (
        <div className="text-muted-foreground text-sm">{question.patientExplanation}</div>
      )}
      {question.type === 'numeric' ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-32"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            placeholder={
              question.unit
                ? t('questionnaire.unit_placeholder', { unit: question.unit })
                : t('questionnaire.input_placeholder')
            }
          />
          {question.unit && <span className="text-muted-foreground text-sm">{question.unit}</span>}
        </div>
      ) : question.type === 'time' ? (
        <Input
          type="time"
          className="w-32"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onAnswer(question.id, e.target.value)}
        />
      ) : question.type === 'text' ? (
        <Input
          type="text"
          className="w-64"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder={t('questionnaire.input_placeholder')}
        />
      ) : question.type === 'multi_choice' ? (
        renderMultiChoice(question)
      ) : (
        renderOptions(question as QuestionnaireQuestion & { type: 'single_choice' | 'matrix' })
      )}
    </div>
  )
}
