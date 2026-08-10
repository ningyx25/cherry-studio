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

/** 汇总完整报告：答案 + 各问卷得分 + 风险标签 + 综合摘要。 */
export function buildQuestionnaireReport(params: {
  flowQuestionnaireId: string
  completedAt: string
  definitions: QuestionnaireDefinition[]
  answers: QuestionnaireAnswers
}): QuestionnaireReport {
  const { flowQuestionnaireId, completedAt, definitions, answers } = params

  const answeredQuestionnaires: QuestionnaireScoreResult[] = []
  const questions: Record<string, QuestionResult[]> = {}

  for (const def of definitions) {
    const qAnswers = answers[def.questionnaireId]
    if (!qAnswers) continue
    answeredQuestionnaires.push(scoreQuestionnaire(def, qAnswers))

    questions[def.questionnaireId] = def.questions.map((q) => {
      const value = qAnswers[q.id]
      const optionLabel = getOptionLabel(q, value)
      const score = getOptionScore(q, value)
      return { questionId: q.id, answer: value, optionLabel, score }
    })
  }

  const riskTags = Array.from(new Set(answeredQuestionnaires.flatMap((r) => r.riskTags)))

  // 结构化摘要：供发送给问诊AI
  const summary = [
    `问卷流程：${flowQuestionnaireId}`,
    ...answeredQuestionnaires.map((r) => {
      const scoreLine = r.scored && r.totalScore !== undefined ? `得分 ${r.totalScore}` : '未计分'
      const levelLine = r.level ? `，分级：${r.level}` : ''
      return `- ${r.title}：${scoreLine}${levelLine}`
    }),
    riskTags.length ? `危险因素：${riskTags.join('、')}` : '危险因素：无'
  ].join('\n')

  return {
    flowQuestionnaireId,
    completedAt,
    answeredQuestionnaires,
    questions,
    riskTags,
    summary
  }
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
