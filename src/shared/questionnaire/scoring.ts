import type { QuestionAnswer, QuestionnaireDefinition, ScoreExpr } from './types'

/** 单份问卷的作答：questionId → 答案（matrix 题为 Record<subId, value>）。 */
export type QuestionAnswers = Record<string, QuestionAnswer>

/** 取某题某选项的得分：优先 convertedScore，其次 score，缺省 0。 */
function optionScore(def: QuestionnaireDefinition, questionId: string, value: QuestionAnswer | undefined): number {
  if (value === undefined || value === null) return 0
  // 子题 id（如 Q5a）的选项挂在父 matrix 题上
  const parent = def.questions.find((x) => x.type === 'matrix' && x.subQuestions.some((s) => s.id === questionId))
  const q = parent ?? def.questions.find((x) => x.id === questionId)
  if (!q) return 0
  if (q.type === 'numeric' || q.type === 'time' || q.type === 'text') return Number(value) || 0
  if (q.type === 'matrix') {
    if (typeof value !== 'string' && typeof value !== 'number') return 0
    const opt = q.options.find((o) => o.value === value)
    return opt?.convertedScore ?? opt?.score ?? 0
  }
  const opt = q.options?.find((o) => o.value === value)
  return opt?.convertedScore ?? opt?.score ?? 0
}

/** "HH:MM" → 当天分钟数；解析失败返回 null。 */
function parseTime(value: QuestionAnswer | undefined): number | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * 求值一个计分表达式。纯函数，只依赖 def/answers（单份问卷的扁平作答）。
 * matrix 题按子题 id 取 answers[parentId][subId] 的得分。
 */
export function evaluateScore(def: QuestionnaireDefinition, expr: ScoreExpr, answers: QuestionAnswers): number {
  switch (expr.kind) {
    case 'score': {
      // matrix 子题引用：expr.question 是 Q5a，父题是 Q5（subQuestions 包含 Q5a）
      const matrixParent = def.questions.find(
        (x) => x.type === 'matrix' && x.subQuestions.some((s) => s.id === expr.question)
      )
      if (matrixParent && matrixParent.type === 'matrix') {
        const parentAnswer = answers[matrixParent.id]
        if (parentAnswer && typeof parentAnswer === 'object' && !Array.isArray(parentAnswer)) {
          const subValue = parentAnswer[expr.question]
          return optionScore(def, expr.question, subValue)
        }
        return 0
      }
      return optionScore(def, expr.question, answers[expr.question])
    }
    case 'sum':
      return expr.items.reduce((acc, item) => acc + evaluateScore(def, item, answers), 0)
    case 'max':
      return Math.max(0, ...expr.items.map((item) => evaluateScore(def, item, answers)))
    case 'mul':
      return evaluateScore(def, expr.expr, answers) * expr.factor
    case 'lookup': {
      const input = evaluateScore(def, expr.input, answers)
      const row = expr.table.find((r) => input >= r.min && input <= r.max)
      return row?.value ?? 0
    }
    case 'efficiency': {
      // 习惯性睡眠效率：eff = Q4 / (Q3 - Q1) * 100
      const bed = parseTime(answers[expr.bedTime])
      const wake = parseTime(answers[expr.wakeTime])
      const hours = Number(answers[expr.sleepHours]) || 0
      if (bed === null || wake === null || hours <= 0) return 0
      // 起床时间可能早于入睡时间（跨午夜）：+1440 分钟按次日算
      let bedSpanMin = wake - bed
      if (bedSpanMin <= 0) bedSpanMin += 24 * 60
      const bedSpan = bedSpanMin / 60 // 分钟 → 小时
      if (bedSpan <= 0) return 0
      const eff = (hours / bedSpan) * 100
      const row = expr.table.find((r) => eff >= r.min && eff <= r.max)
      return row?.value ?? 0
    }
  }
}
