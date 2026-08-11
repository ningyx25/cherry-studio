/**
 * 问卷模块的纯类型定义。只含类型与纯逻辑，禁止引入 IpcApi/DataApi/SQLite。
 * 主进程与渲染进程共享（跨进程共享类型放 @shared，见 shared-layer-architecture.md）。
 */

/** 计分表达式：声明式，无字符串公式，避免解释器。 */
export type ScoreExpr =
  | { kind: 'score'; question: string } // 取该题所选选项的 score / convertedScore
  | { kind: 'sum'; items: ScoreExpr[] }
  | { kind: 'max'; items: ScoreExpr[] }
  | { kind: 'mul'; expr: ScoreExpr; factor: number }
  | { kind: 'lookup'; input: ScoreExpr; table: LookupRow[] }
  | {
      kind: 'efficiency'
      bedTime: string // time 题 id（Q1 上床）
      wakeTime: string // time 题 id（Q3 起床）
      sleepHours: string // numeric 题 id（Q4 睡眠小时）
      table: LookupRow[]
    }

export type LookupRow =
  | { type: 'range'; min: number; max: number; value: number } // 数值区间 → 分值
  | { type: 'score-sum'; min: number; max: number; value: number } // 得分区间 → 分值

export interface QuestionnaireOption {
  label: string
  value: string | number
  score?: number
  convertedScore?: number
}

export type QuestionnaireQuestion =
  | {
      id: string
      text: string
      type: 'single_choice'
      options: QuestionnaireOption[]
      patientExplanation?: string
      mutuallyExclusiveWith?: string
    }
  | { id: string; text: string; type: 'multi_choice'; subItems: string[]; options: QuestionnaireOption[] }
  | {
      id: string
      text: string
      type: 'matrix'
      subQuestions: { id: string; text: string }[]
      options: QuestionnaireOption[]
    }
  | { id: string; text: string; type: 'numeric'; unit?: string }
  | { id: string; text: string; type: 'time' }
  | { id: string; text: string; type: 'text' }

export interface QuestionnaireSection {
  sectionId: string
  sectionName: string
  questionIds: string[]
}

export interface BasicInfoField {
  id: string
  label: string
  type: 'string' | 'enum' | 'date' | 'integer'
  options?: string[]
  optional?: boolean
}

export interface BranchingRule {
  ruleId: string
  triggerQuestion: string
  condition: 'not_equal' | 'contains_any'
  value: string | string[]
  targetQuestionnaireId: string
  promptMessage: string
}

export interface EvaluationRule {
  minScore: number
  maxScore: number
  level: string
  assessment: string
  recommendations: string[]
}

export interface QuestionnaireScoring {
  expression: ScoreExpr
  maxScore?: number
  /** CLDEQ 标准化：standard = raw / divideBy * multiplyBy */
  standardize?: { divideBy: number; multiplyBy: number }
  evaluation?: EvaluationRule[]
  interpretations?: Record<string, string[]>
}

export interface QuestionnaireDefinition {
  questionnaireId: string
  title: string
  description: string
  sections?: QuestionnaireSection[]
  basicInfoFields?: BasicInfoField[]
  questions: QuestionnaireQuestion[]
  branchingRules?: BranchingRule[]
  scoring: QuestionnaireScoring
}

// ── 答案与报告类型 ──

/** 单题答案：single → value；multi → value；matrix → Record<subId, value>；numeric/time → string */
export type QuestionAnswer = string | string[] | number | Record<string, string | number>

export type QuestionnaireAnswers = Record<string, Record<string, QuestionAnswer>>

export interface QuestionResult {
  questionId: string
  answer: QuestionAnswer | undefined
  optionLabel?: string
  score?: number
  /** 题干，供报告视图渲染完整 Q&A */
  questionText?: string
  /** numeric 题单位 */
  unit?: string
  /** matrix 题逐子题答案 */
  subAnswers?: Array<{ subId: string; text: string; label: string; value: string | number }>
}

export interface QuestionnaireScoreResult {
  questionnaireId: string
  title: string
  totalScore?: number
  /** CLDEQ 标准化分 */
  standardizedScore?: number
  level?: string
  assessment?: string
  recommendations: string[]
  riskTags: string[]
  scored: boolean // false = 计分异常，报告仍展示答案
}

export interface QuestionnaireReport {
  flowQuestionnaireId: string
  completedAt: string
  answeredQuestionnaires: QuestionnaireScoreResult[]
  questions: Record<string, QuestionResult[]>
  riskTags: string[]
  summary: string // 结构化摘要，发送给问诊AI
  /** 患者基本信息（可选，向后兼容旧报告） */
  patientInfo?: Array<{ label: string; value: string }>
}
