import { evaluateScore, type QuestionAnswers } from './scoring'
import type {
  QuestionAnswer,
  QuestionnaireAnswers,
  QuestionnaireDefinition,
  QuestionnaireReport,
  QuestionnaireScoreResult,
  QuestionResult
} from './types'

/** 计算单份问卷的得分结果。answers 为该问卷的扁平作答（questionId → value）。 */
export function scoreQuestionnaire(def: QuestionnaireDefinition, answers: QuestionAnswers): QuestionnaireScoreResult {
  const expr = def.scoring.expression
  let totalScore: number | undefined
  let standardizedScore: number | undefined
  let scored = true

  try {
    totalScore = evaluateScore(def, expr, answers)
    if (def.scoring.standardize && def.scoring.standardize.divideBy > 0) {
      standardizedScore = (totalScore / def.scoring.standardize.divideBy) * def.scoring.standardize.multiplyBy
    }
  } catch {
    scored = false
  }

  const effectiveScore = standardizedScore ?? totalScore
  const evaluation = def.scoring.evaluation?.find(
    (rule) => effectiveScore !== undefined && rule.minScore <= effectiveScore && effectiveScore <= rule.maxScore
  )

  // 危险因素标签：interpretations 键按「题id:选项值」匹配
  const riskTags: string[] = []
  if (def.scoring.interpretations) {
    for (const q of def.questions) {
      const ans = answers[q.id]
      if (ans === undefined) continue
      const tags = def.scoring.interpretations[`${q.id}:${String(ans)}`]
      if (tags) riskTags.push(...tags)
    }
  }

  return {
    questionnaireId: def.questionnaireId,
    title: def.title,
    totalScore,
    standardizedScore,
    level: evaluation?.level,
    assessment: evaluation?.assessment,
    recommendations: evaluation?.recommendations ?? [],
    riskTags: Array.from(new Set(riskTags)),
    scored
  }
}

/** 汇总完整报告：答案 + 各问卷得分 + 风险标签 + 综合摘要（含完整 Q&A）。 */
export function buildQuestionnaireReport(params: {
  flowQuestionnaireId: string
  completedAt: string
  definitions: QuestionnaireDefinition[]
  answers: QuestionnaireAnswers
  patientInfoQuestionnaireId?: string
}): QuestionnaireReport {
  const { flowQuestionnaireId, completedAt, definitions, answers, patientInfoQuestionnaireId } = params

  const answeredQuestionnaires: QuestionnaireScoreResult[] = []
  const questions: Record<string, QuestionResult[]> = {}
  const patientInfo: Array<{ label: string; value: string }> = []

  for (const def of definitions) {
    const qAnswers = answers[def.questionnaireId]
    if (!qAnswers) continue

    // 患者基本信息：不计分，只进 patientInfo 与 summary
    if (def.questionnaireId === patientInfoQuestionnaireId) {
      for (const q of def.questions) {
        const value = qAnswers[q.id]
        if (value === undefined || value === null || value === '') continue
        patientInfo.push({ label: q.text, value: formatAnswerValue(q, value) })
      }
      continue
    }

    answeredQuestionnaires.push(scoreQuestionnaire(def, qAnswers))

    questions[def.questionnaireId] = def.questions.map((q) => {
      const value = qAnswers[q.id]
      const optionLabel = getOptionLabel(q, value)
      const score = getOptionScore(q, value)
      const result: QuestionResult = { questionId: q.id, answer: value, optionLabel, score, questionText: q.text }
      if (q.type === 'numeric') result.unit = q.unit
      if (q.type === 'matrix' && value && typeof value === 'object' && !Array.isArray(value)) {
        result.subAnswers = q.subQuestions.map((sub) => {
          const subValue = value[sub.id]
          const label = q.options.find((o) => o.value === subValue)?.label ?? String(subValue ?? '')
          return { subId: sub.id, text: sub.text, label, value: subValue ?? '' }
        })
      }
      return result
    })
  }

  const riskTags = Array.from(new Set(answeredQuestionnaires.flatMap((r) => r.riskTags)))
  const patientRef = patientInfo.length ? `（患者：${patientInfo.map((p) => p.value).join('，')}）` : ''

  // 结构化摘要：供发送给问诊AI——完整 Q&A + 患者信息
  const summaryLines: string[] = []
  if (patientInfo.length) {
    summaryLines.push('患者基本信息：')
    for (const p of patientInfo) summaryLines.push(`${p.label}：${p.value}`)
    summaryLines.push('')
  }
  summaryLines.push(`问卷流程：${flowQuestionnaireId}`)
  summaryLines.push(
    ...answeredQuestionnaires.map((r) => {
      const scoreLine = r.scored && r.totalScore !== undefined ? `得分 ${r.totalScore}` : '未计分'
      const levelLine = r.level ? `，分级：${r.level}` : ''
      return `- ${r.title}：${scoreLine}${levelLine}${patientRef}`
    })
  )
  summaryLines.push('')
  summaryLines.push('详细作答：')
  for (const r of answeredQuestionnaires) {
    const qs = questions[r.questionnaireId]
    summaryLines.push(`【${r.title}】`)
    qs.forEach((q, i) => {
      const answerText = formatResultAnswer(q)
      summaryLines.push(`${i + 1}. ${q.questionText ?? q.questionId}：回答 ${answerText}`)
    })
    summaryLines.push('')
  }
  summaryLines.push(riskTags.length ? `危险因素：${riskTags.join('、')}` : '危险因素：无')

  return {
    flowQuestionnaireId,
    completedAt,
    answeredQuestionnaires,
    questions,
    riskTags,
    summary: summaryLines.join('\n').trimEnd(),
    patientInfo
  }
}

/** 把单个题答案格式化为可读文本（供报告/summary 展示）。 */
function formatResultAnswer(q: QuestionResult): string {
  if (q.subAnswers?.length) {
    return q.subAnswers.map((s) => `- ${s.text}：${s.label}`).join('；')
  }
  if (q.optionLabel !== undefined) return q.optionLabel
  if (q.answer === undefined || q.answer === null || q.answer === '') return '（未填写）'
  return `${String(q.answer)}${q.unit ?? ''}`
}

/** 把原始答案值格式化为可读文本（患者信息等）。 */
function formatAnswerValue(q: QuestionnaireDefinition['questions'][number], value: QuestionAnswer): string {
  if (q.type === 'single_choice' || q.type === 'multi_choice') {
    const label = q.options.find((o) => o.value === value)?.label
    return label ?? String(value)
  }
  if (q.type === 'matrix' && typeof value === 'object' && !Array.isArray(value)) {
    return q.subQuestions
      .map(
        (sub) =>
          `${sub.text}：${q.options.find((o) => o.value === value[sub.id])?.label ?? String(value[sub.id] ?? '')}`
      )
      .join('；')
  }
  if (q.type === 'numeric') return `${String(value)}${q.unit ?? ''}`
  return String(value)
}

function getOptionLabel(
  q: QuestionnaireDefinition['questions'][number],
  value: QuestionAnswer | undefined
): string | undefined {
  if (q.type === 'single_choice' || q.type === 'multi_choice') {
    return q.options.find((o) => o.value === value)?.label
  }
  if (q.type === 'matrix' && value && typeof value === 'object' && !Array.isArray(value)) {
    return undefined // matrix 逐子题展示，这里不聚合
  }
  return undefined
}

function getOptionScore(
  q: QuestionnaireDefinition['questions'][number],
  value: QuestionAnswer | undefined
): number | undefined {
  if (q.type === 'single_choice' || q.type === 'multi_choice') {
    return q.options.find((o) => o.value === value)?.score
  }
  return undefined
}
