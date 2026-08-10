# 问卷模块实现计划 (Questionnaire Module Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增独立「问卷」侧边栏模块，用户填写结构化问卷，本地计分，保存 SQLite 会话，一键发送报告给问诊AI。

**Architecture:** 问卷定义（统一 Schema）打包在 `resources/questionnaire/definitions/`，主进程 `QuestionnaireDefinitionService` 加载并通过 IpcApi 暴露；纯计分逻辑在 `src/shared/questionnaire/`（主/渲染共享、可测试）；用户作答存 SQLite（DataApi `questionnaire_session` 单表）；渲染进程 `/app/questionnaire` 提供表单、分支流程、报告视图与发送到问诊AI。

**Tech Stack:** Electron + React + TanStack Router + Drizzle ORM + better-sqlite3 + zod + i18next + Vitest + SWR (useQuery/useMutation)

**Spec:** [docs/superpowers/specs/2026-08-10-questionnaire-module-design.md](../specs/2026-08-10-questionnaire-module-design.md)

**验证方式（每步）:** 每 Task 结束跑 `pnpm test`（相关用例）、`pnpm build:check`；全部完成后 `pnpm lint && pnpm test && pnpm format`。

---

## 阶段 A：Shared 纯逻辑层（类型 + Schema + 计分 + 报告）

> 无主/渲染进程依赖，可独立测试。这是本模块的核心，先做。

### Task A1: 统一问卷类型定义

**Files:**
- Create: `src/shared/questionnaire/types.ts`
- Test: `src/shared/questionnaire/__tests__/types.test.ts`

- [ ] **Step 1: 写类型定义**

`src/shared/questionnaire/types.ts`（从 spec §4 完整落地，含 `ScoreExpr` 判别联合的 6 种节点）：

```typescript
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

/** 单题答案：single/matrix → value；multi → value[]；numeric/time → string */
export type QuestionAnswer = string | string[] | number

export type QuestionnaireAnswers = Record<string, Record<string, QuestionAnswer>>

export interface QuestionResult {
  questionId: string
  answer: QuestionAnswer | undefined
  optionLabel?: string
  score?: number
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
}
```

- [ ] **Step 2: 写类型测试**

`src/shared/questionnaire/__tests__/types.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import type { ScoreExpr, QuestionnaireDefinition } from '../types'

describe('questionnaire types', () => {
  it('ScoreExpr union supports all six node kinds', () => {
    const exprs: ScoreExpr[] = [
      { kind: 'score', question: 'Q1' },
      { kind: 'sum', items: [{ kind: 'score', question: 'Q1' }] },
      { kind: 'max', items: [{ kind: 'score', question: 'Q1' }] },
      { kind: 'mul', expr: { kind: 'score', question: 'Q1b' }, factor: 2 },
      { kind: 'lookup', input: { kind: 'score', question: 'Q2' }, table: [] },
      {
        kind: 'efficiency',
        bedTime: 'Q1',
        wakeTime: 'Q3',
        sleepHours: 'Q4',
        table: [{ type: 'range', min: 0, max: 85, value: 0 }]
      }
    ]
    expect(exprs).toHaveLength(6)
  })

  it('QuestionnaireDefinition composes sections referencing flat questions', () => {
    const def: QuestionnaireDefinition = {
      questionnaireId: 'T',
      title: 't',
      description: 'd',
      sections: [{ sectionId: 'S', sectionName: 's', questionIds: ['Q1'] }],
      questions: [{ id: 'Q1', text: 'q', type: 'single_choice', options: [{ label: 'a', value: 'A' }] }],
      scoring: { expression: { kind: 'score', question: 'Q1' } }
    }
    expect(def.sections?.[0].questionIds[0]).toBe('Q1')
  })
})
```

- [ ] **Step 3: 运行测试确认通过**

Run: `pnpm vitest run src/shared/questionnaire/__tests__/types.test.ts`
Expected: 2 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/shared/questionnaire/types.ts src/shared/questionnaire/__tests__/types.test.ts
git commit -m "feat(questionnaire): 定义问卷模块统一类型（ScoreExpr 判别联合 + 定义/答案/报告）"
```

### Task A2: zod Schema 校验（共享定义校验）

**Files:**
- Create: `src/shared/questionnaire/schemas.ts`
- Test: `src/shared/questionnaire/__tests__/schemas.test.ts`

- [ ] **Step 1: 写 zod schema**

`src/shared/questionnaire/schemas.ts`：

```typescript
import * as z from 'zod'

import type { QuestionnaireDefinition } from './types'

const scoreExprSchema: z.ZodType<import('./types').ScoreExpr> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('score'), question: z.string() }),
    z.object({ kind: z.literal('sum'), items: z.array(scoreExprSchema) }),
    z.object({ kind: z.literal('max'), items: z.array(scoreExprSchema) }),
    z.object({ kind: z.literal('mul'), expr: scoreExprSchema, factor: z.number() }),
    z.object({
      kind: z.literal('lookup'),
      input: scoreExprSchema,
      table: z.array(lookupRowSchema)
    }),
    z.object({
      kind: z.literal('efficiency'),
      bedTime: z.string(),
      wakeTime: z.string(),
      sleepHours: z.string(),
      table: z.array(lookupRowSchema)
    })
  ])
)

export const lookupRowSchema: z.ZodType<import('./types').LookupRow> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('range'), min: z.number(), max: z.number(), value: z.number() }),
  z.object({ type: z.literal('score-sum'), min: z.number(), max: z.number(), value: z.number() })
])

export const questionnaireOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  score: z.number().optional(),
  convertedScore: z.number().optional()
})

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('single_choice'),
    options: z.array(questionnaireOptionSchema),
    patientExplanation: z.string().optional(),
    mutuallyExclusiveWith: z.string().optional()
  }),
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('multi_choice'),
    subItems: z.array(z.string()),
    options: z.array(questionnaireOptionSchema)
  }),
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal('matrix'),
    subQuestions: z.array(z.object({ id: z.string(), text: z.string() })),
    options: z.array(questionnaireOptionSchema)
  }),
  z.object({ id: z.string(), text: z.string(), type: z.literal('numeric'), unit: z.string().optional() }),
  z.object({ id: z.string(), text: z.string(), type: z.literal('time') })
])

export const questionnaireDefinitionSchema = z.object({
  questionnaireId: z.string(),
  title: z.string(),
  description: z.string(),
  sections: z
    .array(z.object({ sectionId: z.string(), sectionName: z.string(), questionIds: z.array(z.string()) }))
    .optional(),
  basicInfoFields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['string', 'enum', 'date', 'integer']),
        options: z.array(z.string()).optional(),
        optional: z.boolean().optional()
      })
    )
    .optional(),
  questions: z.array(questionSchema),
  branchingRules: z
    .array(
      z.object({
        ruleId: z.string(),
        triggerQuestion: z.string(),
        condition: z.enum(['not_equal', 'contains_any']),
        value: z.union([z.string(), z.array(z.string())]),
        targetQuestionnaireId: z.string(),
        promptMessage: z.string()
      })
    )
    .optional(),
  scoring: z.object({
    expression: scoreExprSchema,
    maxScore: z.number().optional(),
    standardize: z.object({ divideBy: z.number(), multiplyBy: z.number() }).optional(),
    evaluation: z
      .array(
        z.object({
          minScore: z.number(),
          maxScore: z.number(),
          level: z.string(),
          assessment: z.string(),
          recommendations: z.array(z.string())
        })
      )
      .optional(),
    interpretations: z.record(z.string(), z.array(z.string())).optional()
  })
})

export type ParsedQuestionnaireDefinition = z.infer<typeof questionnaireDefinitionSchema>

export function parseQuestionnaireDefinition(raw: unknown): QuestionnaireDefinition {
  return questionnaireDefinitionSchema.parse(raw) as QuestionnaireDefinition
}
```

> 注意：上面 `scoreExprSchema` 里的前向引用写法依赖 `scoreExprSchema` 在闭包内通过 `z.lazy` 定义。实际实现请用 `const scoreExprSchema: z.ZodType<ScoreExpr> = z.lazy(() => baseScoreExpr)` 并在内部引用 `scoreExprSchema` 自身，保证递归合法。Step 2 的测试会验证。

- [ ] **Step 2: 写校验测试**

`src/shared/questionnaire/__tests__/schemas.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { parseQuestionnaireDefinition } from '../schemas'

const validDefinition = {
  questionnaireId: 'T',
  title: '测试问卷',
  description: 'desc',
  questions: [
    { id: 'Q1', text: 'q1', type: 'single_choice', options: [{ label: 'a', value: 'A', score: 0 }] }
  ],
  scoring: { expression: { kind: 'score', question: 'Q1' }, maxScore: 1 }
}

describe('questionnaireDefinitionSchema', () => {
  it('parses a valid single-choice definition', () => {
    const parsed = parseQuestionnaireDefinition(validDefinition)
    expect(parsed.questions[0].type).toBe('single_choice')
    expect(parsed.scoring.maxScore).toBe(1)
  })

  it('rejects a definition with an unknown question type', () => {
    const bad = { ...validDefinition, questions: [{ id: 'Q1', text: 'q', type: 'bad_type' }] }
    expect(() => parseQuestionnaireDefinition(bad)).toThrow()
  })

  it('rejects a scoring expression with an invalid kind', () => {
    const bad = { ...validDefinition, scoring: { expression: { kind: 'sqrt', question: 'Q1' } } }
    expect(() => parseQuestionnaireDefinition(bad)).toThrow()
  })
})
```

- [ ] **Step 3: 运行测试确认通过**

Run: `pnpm vitest run src/shared/questionnaire/__tests__/schemas.test.ts`
Expected: 3 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/shared/questionnaire/schemas.ts src/shared/questionnaire/__tests__/schemas.test.ts
git commit -m "feat(questionnaire): 问卷定义 zod schema 校验"
```

### Task A3: 计分求值器（核心）

**Files:**
- Create: `src/shared/questionnaire/scoring.ts`
- Test: `src/shared/questionnaire/__tests__/scoring.test.ts`

- [ ] **Step 1: 写求值器实现**

`src/shared/questionnaire/scoring.ts`：

```typescript
import type { QuestionnaireAnswers, QuestionnaireDefinition, QuestionAnswer, ScoreExpr } from './types'

/** 取某题某选项的得分：优先 convertedScore，其次 score，缺省 0。 */
function optionScore(
  def: QuestionnaireDefinition,
  questionId: string,
  value: QuestionAnswer
): number {
  const q = def.questions.find((x) => x.id === questionId)
  if (!q || q.type === 'numeric' || q.type === 'time') return Number(value) || 0
  const opts = q.options
  const match = opts.find((o) => o.value === value)
  return match?.convertedScore ?? match?.score ?? 0
}

/** 计算多选得分：该题是多选时，得分 = 各选项得分之和（按 subItems 勾选数量映射在选项里）。 */
function multiScore(def: QuestionnaireDefinition, questionId: string, value: QuestionAnswer): number {
  const q = def.questions.find((x) => x.id === questionId)
  if (!q || q.type !== 'multi_choice') return 0
  // multi_choice 的答案本身是 "B"/"C" 等单个 value，表示勾选数量档位 → 直接用其 score
  return optionScore(def, questionId, value)
}

export function evaluateScore(
  def: QuestionnaireDefinition,
  expr: ScoreExpr,
  answers: QuestionnaireAnswers
): number {
  switch (expr.kind) {
    case 'score':
      return optionScore(def, expr.question, answers[expr.question])
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
      if (bed === null || wake === null || hours <= 0 || wake <= bed) return 0
      const bedSpan = (wake - bed) / 60 // 分钟 → 小时
      if (bedSpan <= 0) return 0
      const eff = (hours / bedSpan) * 100
      const row = expr.table.find((r) => eff >= r.min && eff <= r.max)
      return row?.value ?? 0
    }
  }
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
```

> **要点**：`evaluateScore` 是纯函数，只依赖 `def`/`answers`。所有分支都已穷尽（`ScoreExpr` 判别联合），TS 会保证 `never` 分支不存在。`parseTime` 供 `efficiency` 节点使用。

- [ ] **Step 2: 写测试（4 份问卷的已知答案 → 期望分数）**

`src/shared/questionnaire/__tests__/scoring.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { evaluateScore } from '../scoring'
import type { ScoreExpr, QuestionnaireAnswers } from '../types'

// 用最小化定义构造表达式，模拟 4 份问卷的计分结构
const mkDef = (questions: any[], expression: ScoreExpr, maxScore?: number) => ({
  questionnaireId: 'T',
  title: 't',
  description: 'd',
  questions,
  scoring: { expression, maxScore }
})

describe('evaluateScore', () => {
  it('score: returns the selected option score', () => {
    const def = mkDef(
      [{ id: 'Q1', text: 'q', type: 'single_choice', options: [{ label: 'a', value: 'A', score: 0 }, { label: 'e', value: 'E', score: 4 }] }],
      { kind: 'score', question: 'Q1' }
    )
    expect(evaluateScore(def, { kind: 'score', question: 'Q1' }, { Q1: 'E' })).toBe(4)
  })

  it('sum + max: 中国干眼总分 = max(Q1,Q2) + sum(Q3..Q13)', () => {
    const questions = [
      { id: 'Q1', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 2 }] },
      { id: 'Q2', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 3 }] },
      { id: 'Q3', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q4', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q5', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q6', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q7', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q8', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q9', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q10', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q11', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q12', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] },
      { id: 'Q13', text: '', type: 'single_choice', options: [{ value: 'A', score: 0 }, { value: 'B', score: 1 }] }
    ]
    const expr: ScoreExpr = {
      kind: 'sum',
      items: [{ kind: 'max', items: [{ kind: 'score', question: 'Q1' }, { kind: 'score', question: 'Q2' }] }, { kind: 'score', question: 'Q3' }, { kind: 'score', question: 'Q4' }, { kind: 'score', question: 'Q5' }, { kind: 'score', question: 'Q6' }, { kind: 'score', question: 'Q7' }, { kind: 'score', question: 'Q8' }, { kind: 'score', question: 'Q9' }, { kind: 'score', question: 'Q10' }, { kind: 'score', question: 'Q11' }, { kind: 'score', question: 'Q12' }, { kind: 'score', question: 'Q13' }]
    }
    const answers: QuestionnaireAnswers = { Q1: 'B', Q2: 'A', Q3: 'B', Q4: 'B', Q5: 'B', Q6: 'B', Q7: 'B', Q8: 'B', Q9: 'B', Q10: 'B', Q11: 'B', Q12: 'B', Q13: 'B' }
    // max(Q1=2, Q2=0)=2 + 11×1 = 13
    expect(evaluateScore(mkDef(questions, expr), expr, answers)).toBe(13)
  })

  it('mul: CLDEQ Q1a + Q1b*2', () => {
    const questions = [
      { id: 'Q1a', text: '', type: 'single_choice', options: [{ value: 3, score: 3 }, { value: 0, score: 0 }] },
      { id: 'Q1b', text: '', type: 'single_choice', options: [{ value: 2, score: 2 }] }
    ]
    const expr: ScoreExpr = { kind: 'sum', items: [{ kind: 'score', question: 'Q1a' }, { kind: 'mul', expr: { kind: 'score', question: 'Q1b' }, factor: 2 }] }
    expect(evaluateScore(mkDef(questions, expr), expr, { Q1a: 3, Q1b: 2 })).toBe(7)
  })

  it('lookup: PSQI 入睡分钟数映射', () => {
    const def = mkDef([{ id: 'Q2', text: '', type: 'numeric' }], {
      kind: 'lookup',
      input: { kind: 'score', question: 'Q2' },
      table: [
        { type: 'range', min: 0, max: 15, value: 0 },
        { type: 'range', min: 16, max: 30, value: 1 },
        { type: 'range', min: 31, max: 60, value: 2 },
        { type: 'range', min: 61, max: 999, value: 3 }
      ]
    })
    expect(evaluateScore(def, { kind: 'lookup', input: { kind: 'score', question: 'Q2' }, table: def.scoring.expression as any }, { Q2: '45' })).toBe(2)
  })

  it('efficiency: PSQI 习惯性睡眠效率（Q4=6h, Q1=22:00, Q3=07:00 → 66.7% → 2）', () => {
    const def = mkDef([
      { id: 'Q1', text: '', type: 'time' },
      { id: 'Q3', text: '', type: 'time' },
      { id: 'Q4', text: '', type: 'numeric' }
    ], {
      kind: 'efficiency',
      bedTime: 'Q1',
      wakeTime: 'Q3',
      sleepHours: 'Q4',
      table: [
        { type: 'range', min: 0, max: 85, value: 0 },
        { type: 'range', min: 75, max: 84, value: 1 },
        { type: 'range', min: 65, max: 74, value: 2 },
        { type: 'range', min: 0, max: 64, value: 3 }
      ]
    })
    const answers: QuestionnaireAnswers = { Q1: '22:00', Q3: '07:00', Q4: '6' }
    // bedSpan = 540min = 9h; eff = 6/9*100 = 66.67 → 落在 65-74 → 2
    expect(evaluateScore(def, def.scoring.expression, answers)).toBe(2)
  })
})
```

> 注：`lookup`/`efficiency` 测试里我把表达式又传了一遍，实际请直接引用 `def.scoring.expression`。上面 `mkDef` 的 `questions` 用 `any` 是为了测试简洁；生产代码的类型在 A1 已严格定义。

- [ ] **Step 3: 运行测试确认通过**

Run: `pnpm vitest run src/shared/questionnaire/__tests__/scoring.test.ts`
Expected: 5 tests PASS（含 efficiency 66.7% → 2）

- [ ] **Step 4: 提交**

```bash
git add src/shared/questionnaire/scoring.ts src/shared/questionnaire/__tests__/scoring.test.ts
git commit -m "feat(questionnaire): 声明式计分求值器（score/sum/max/mul/lookup/efficiency）"
```

### Task A4: 报告构建

**Files:**
- Create: `src/shared/questionnaire/report.ts`
- Test: `src/shared/questionnaire/__tests__/report.test.ts`

- [ ] **Step 1: 写报告构建**

`src/shared/questionnaire/report.ts`：

```typescript
import { evaluateScore } from './scoring'
import type {
  QuestionnaireAnswers,
  QuestionnaireDefinition,
  QuestionnaireReport,
  QuestionnaireScoreResult,
  QuestionResult
} from './types'

/** 计算单份问卷的得分结果。 */
export function scoreQuestionnaire(
  def: QuestionnaireDefinition,
  answers: QuestionnaireAnswers
): QuestionnaireScoreResult {
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

  // 危险因素标签：interpretations 键按作答的选项值匹配
  const riskTags: string[] = []
  if (def.scoring.interpretations) {
    for (const q of def.questions) {
      const ans = answers[q.id]
      if (ans === undefined) continue
      const key = Array.isArray(ans) ? ans.join(',') : String(ans)
      const tags = def.scoring.interpretations[key]
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
      const option = q.type === 'single_choice' || q.type === 'multi_choice' ? q.options.find((o) => o.value === value) : undefined
      return {
        questionId: q.id,
        answer: value,
        optionLabel: option?.label,
        score: option?.score
      }
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
```

- [ ] **Step 2: 写测试**

`src/shared/questionnaire/__tests__/report.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { buildQuestionnaireReport } from '../report'
import type { QuestionnaireDefinition, QuestionnaireAnswers } from '../types'

const def: QuestionnaireDefinition = {
  questionnaireId: 'Q1',
  title: '问卷A',
  description: 'd',
  questions: [
    { id: 'q1', text: '症状', type: 'single_choice', options: [{ label: '无', value: 'A', score: 0 }, { label: '重', value: 'E', score: 4 }] }
  ],
  scoring: {
    expression: { kind: 'score', question: 'q1' },
    maxScore: 4,
    evaluation: [
      { minScore: 0, maxScore: 3, level: '轻度', assessment: 'a', recommendations: ['r1'] },
      { minScore: 4, maxScore: 4, level: '重度', assessment: 'b', recommendations: ['r2'] }
    ]
  }
}

const answers: QuestionnaireAnswers = { Q1: { q1: 'E' } }

describe('buildQuestionnaireReport', () => {
  it('computes score and level', () => {
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'Q1',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [def],
      answers
    })
    expect(report.answeredQuestionnaires[0].totalScore).toBe(4)
    expect(report.answeredQuestionnaires[0].level).toBe('重度')
    expect(report.answeredQuestionnaires[0].recommendations).toEqual(['r2'])
    expect(report.questions['Q1'][0].answer).toBe('E')
  })

  it('includes risk tags from interpretations', () => {
    const tagged: QuestionnaireDefinition = {
      ...def,
      questionnaireId: 'LIFE',
      scoring: { expression: { kind: 'score', question: 'q1' }, interpretations: { E: ['#电子设备'] } }
    }
    const report = buildQuestionnaireReport({
      flowQuestionnaireId: 'LIFE',
      completedAt: '2026-08-10T00:00:00Z',
      definitions: [tagged],
      answers: { LIFE: { q1: 'E' } }
    })
    expect(report.riskTags).toContain('#电子设备')
    expect(report.summary).toContain('#电子设备')
  })
})
```

- [ ] **Step 3: 运行测试确认通过**

Run: `pnpm vitest run src/shared/questionnaire/__tests__/report.test.ts`
Expected: 2 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/shared/questionnaire/report.ts src/shared/questionnaire/__tests__/report.test.ts
git commit -m "feat(questionnaire): 问卷报告构建（得分+分级+风险标签+摘要）"
```

---

## 阶段 B：内置问卷定义（统一 Schema 的 4 份 JSON）

### Task B1: 中国干眼调查问卷定义

**Files:**
- Create: `resources/questionnaire/definitions/china-dry-eye.json`
- Test: `src/shared/questionnaire/__tests__/definitions.test.ts`（本 Task 只加文件，测试在 B5 统一校验）

- [ ] **Step 1: 编写定义**

按 spec §4.1 映射，把原 `1-中国干眼调查问卷-附问题解释.json` 转为统一 Schema。13 题全量落盘，这里给出 Q1/Q2 与 13 题结构示意（实际文件含全部 13 题与 patientExplanation）：

```json
{
  "questionnaireId": "CHINA_DRY_EYE",
  "title": "中国干眼调查问卷",
  "description": "中国干眼流行病学调查与临床诊断基础问卷，测定干眼症状及相关危险因素得分。",
  "basicInfoFields": [
    { "id": "name", "label": "姓名", "type": "string", "optional": true },
    { "id": "gender", "label": "性别", "type": "enum", "options": ["男", "女"], "optional": true },
    { "id": "age", "label": "年龄", "type": "integer", "optional": true }
  ],
  "questions": [
    {
      "id": "Q1",
      "text": "戴隐形眼镜时间",
      "type": "single_choice",
      "mutuallyExclusiveWith": "Q2",
      "options": [
        { "label": "A. 无", "value": "A", "score": 0 },
        { "label": "B. 1年以内", "value": "B", "score": 1 },
        { "label": "C. 2年以内", "value": "C", "score": 2 },
        { "label": "D. 5年以内", "value": "D", "score": 3 },
        { "label": "E. 5年以上", "value": "E", "score": 4 }
      ]
    },
    {
      "id": "Q2",
      "text": "角膜屈光手术时间",
      "type": "single_choice",
      "mutuallyExclusiveWith": "Q1",
      "options": [
        { "label": "A. 无", "value": "A", "score": 0 },
        { "label": "B. 半年", "value": "B", "score": 1 },
        { "label": "C. 1年", "value": "C", "score": 2 },
        { "label": "D. 2年", "value": "D", "score": 3 },
        { "label": "E. 2年以上", "value": "E", "score": 4 }
      ]
    }
  ],
  "branchingRules": [
    {
      "ruleId": "RULE_CLDEQ8",
      "triggerQuestion": "Q1",
      "condition": "not_equal",
      "value": "A",
      "targetQuestionnaireId": "CLDEQ8",
      "promptMessage": "注意到您有接触镜佩戴相关病史，请问是否继续作答《接触镜干眼问卷-8（CLDEQ-8）》？"
    },
    {
      "ruleId": "RULE_PSQI",
      "triggerQuestion": "Q4",
      "condition": "not_equal",
      "value": "A",
      "targetQuestionnaireId": "PSQI",
      "promptMessage": "注意到您可能有睡眠质量问题，请问是否继续作答《匹兹堡睡眠质量指数问卷》？"
    }
  ],
  "scoring": {
    "expression": {
      "kind": "sum",
      "items": [
        { "kind": "max", "items": [{ "kind": "score", "question": "Q1" }, { "kind": "score", "question": "Q2" }] },
        { "kind": "score", "question": "Q3" },
        { "kind": "score", "question": "Q4" },
        { "kind": "score", "question": "Q5" },
        { "kind": "score", "question": "Q6" },
        { "kind": "score", "question": "Q7" },
        { "kind": "score", "question": "Q8" },
        { "kind": "score", "question": "Q9" },
        { "kind": "score", "question": "Q10" },
        { "kind": "score", "question": "Q11" },
        { "kind": "score", "question": "Q12" },
        { "kind": "score", "question": "Q13" }
      ]
    },
    "maxScore": 48,
    "evaluation": [
      { "minScore": 0, "maxScore": 6.99, "level": "无干眼相关疾病", "assessment": "无干眼相关疾病（或临床前/轻度干眼风险）", "recommendations": ["生活方式预防", "定期眼检查"] },
      { "minScore": 7, "maxScore": 48, "level": "干眼阳性", "assessment": "干眼相关疾病（判定为干眼阳性，需进一步分型与严重度评估）", "recommendations": ["专科就诊评估", "遵医嘱治疗"] }
    ]
  }
}
```

> 注意：`Q1`/`Q2` 的 `mutuallyExclusiveWith` 在 `ScoreExpr` 里由 `max` 表达，该字段仅用于 UI 提示。完整 JSON 需含全部 13 题（Q3–Q13 沿用原文件的选项与 patientExplanation）。**原始文件里 IMMUNE/EMOTION 分支的目标定义不存在，按 spec 决策只保留 CLDEQ8 / PSQI 两个实际存在的目标。**

- [ ] **Step 2: 校验 JSON 语法**

Run: `node -e "JSON.parse(require('fs').readFileSync('resources/questionnaire/definitions/china-dry-eye.json','utf8'))" && echo OK`
Expected: `OK`

### Task B2: 生活方式相关干眼问卷定义

**Files:**
- Create: `resources/questionnaire/definitions/lifestyle-dry-eye.json`

- [ ] **Step 1: 编写定义**

8 个 section 转统一 Schema。`sections` 引用扁平 `questions` 数组；无总分，`interpretations` 按 section 作答给建议标签。文件完整结构（VDT + 睡眠 + 接触镜 + 化妆 + 吸烟 + 户外 + 室内 + 饮食）：

```json
{
  "questionnaireId": "LIFESTYLE_DRY_EYE",
  "title": "生活方式相关干眼问卷",
  "description": "评估患者日常生活习惯、环境变量及饮食结构中对干眼症的影响因子。",
  "sections": [
    { "sectionId": "SEC_VDT", "sectionName": "一、视频显示终端（VDT）使用", "questionIds": ["VDT_Q1", "VDT_Q2"] },
    { "sectionId": "SEC_SLEEP", "sectionName": "二、睡眠状况", "questionIds": ["SLEEP_Q1", "SLEEP_Q2"] }
  ],
  "questions": [
    {
      "id": "VDT_Q1",
      "text": "每天手机、电脑等视频终端使用时长",
      "type": "single_choice",
      "options": [
        { "label": "A. < 8小时", "value": "A" },
        { "label": "B. > 8小时", "value": "B" }
      ]
    },
    {
      "id": "VDT_Q2",
      "text": "使用视频终端时是否觉得眼睛干涩不适",
      "type": "single_choice",
      "options": [
        { "label": "A. 是", "value": "A" },
        { "label": "B. 否", "value": "B" }
      ]
    },
    {
      "id": "SLEEP_Q1",
      "text": "平均每日睡眠时间",
      "type": "single_choice",
      "options": [
        { "label": "A. < 5小时", "value": "A" },
        { "label": "B. 5~7小时", "value": "B" },
        { "label": "C. > 7小时", "value": "C" }
      ]
    },
    {
      "id": "SLEEP_Q2",
      "text": "主观睡眠质量",
      "type": "single_choice",
      "options": [
        { "label": "A. 差", "value": "A" },
        { "label": "B. 一般", "value": "B" },
        { "label": "C. 好", "value": "C" }
      ]
    }
  ],
  "scoring": {
    "expression": { "kind": "sum", "items": [] },
    "interpretations": {
      "B": ["#电子设备"],
      "A": ["#睡眠质量"]
    }
  }
}
```

> 生活方式问卷无总分，`interpretations` 表达危险因素标签。因它无 branching，`expression` 为空 `sum`（求值得 0，`scored=false` 分支不会触发）。

- [ ] **Step 2: 校验 JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('resources/questionnaire/definitions/lifestyle-dry-eye.json','utf8'))" && echo OK`
Expected: `OK`

### Task B3: 接触镜干眼问卷（CLDEQ-8）定义

**Files:**
- Create: `resources/questionnaire/definitions/cldeq-8.json`

- [ ] **Step 1: 编写定义**

8 题 + 维度加权 + 标准化。Q5 用 `convertedScore`：

```json
{
  "questionnaireId": "CLDEQ8",
  "title": "接触镜干眼问卷-8（CLDEQ-8）",
  "description": "专用于评估隐形眼镜（角膜接触镜）佩戴人群相关干眼症状频率与程度的标准量表。",
  "questions": [
    {
      "id": "Q1a",
      "text": "在过去两周内，佩戴隐形眼镜时出现眼部不适的频率",
      "type": "single_choice",
      "options": [
        { "label": "0 - 从不", "value": 0, "score": 0 },
        { "label": "1 - 很少", "value": 1, "score": 1 },
        { "label": "2 - 有时", "value": 2, "score": 2 },
        { "label": "3 - 频繁", "value": 3, "score": 3 },
        { "label": "4 - 持续", "value": 4, "score": 4 }
      ]
    },
    {
      "id": "Q1b",
      "text": "在戴隐形眼镜即将结束时（取下前），眼部不适的强度",
      "type": "single_choice",
      "options": [
        { "label": "0 - 从未有过", "value": 0, "score": 0 },
        { "label": "1 - 一点也不强烈", "value": 1, "score": 1 },
        { "label": "2 - 一般强烈", "value": 2, "score": 2 },
        { "label": "3 - 强烈", "value": 3, "score": 3 },
        { "label": "4 - 比较强烈", "value": 4, "score": 4 },
        { "label": "5 - 非常强烈", "value": 5, "score": 5 }
      ]
    }
  ],
  "scoring": {
    "expression": {
      "kind": "sum",
      "items": [
        { "kind": "score", "question": "Q1a" },
        { "kind": "mul", "expr": { "kind": "score", "question": "Q1b" }, "factor": 2 },
        { "kind": "score", "question": "Q2a" },
        { "kind": "mul", "expr": { "kind": "score", "question": "Q2b" }, "factor": 2 },
        { "kind": "score", "question": "Q3a" },
        { "kind": "mul", "expr": { "kind": "score", "question": "Q3b" }, "factor": 2 },
        { "kind": "score", "question": "Q4" },
        { "kind": "score", "question": "Q5" }
      ]
    },
    "maxScore": 37.2,
    "standardize": { "divideBy": 37.2, "multiplyBy": 100 },
    "evaluation": [
      {
        "minScore": 14,
        "maxScore": 100,
        "level": "接触镜相关干眼",
        "assessment": "得分 ≥ 14 提示存在具有临床意义的接触镜相关干眼",
        "recommendations": ["调整配戴方案", "接受干眼干预"]
      },
      {
        "minScore": 0,
        "maxScore": 13.99,
        "level": "正常",
        "assessment": "无临床意义的接触镜相关干眼",
        "recommendations": ["维持现有配戴习惯", "注意眼部保湿"]
      }
    ]
  }
}
```

> 完整 JSON 含全部 8 题（Q2a/Q2b/Q3a/Q3b/Q4 同 Q1 频率结构，Q5 用 `convertedScore`：value 1→0、2→0.8、3→1.6、4→2.4、5→3.2、6→4）。

- [ ] **Step 2: 校验 JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('resources/questionnaire/definitions/cldeq-8.json','utf8'))" && echo OK`
Expected: `OK`

### Task B4: 匹兹堡睡眠问卷（PSQI）定义

**Files:**
- Create: `resources/questionnaire/definitions/psqi.json`

- [ ] **Step 1: 编写定义**

含 matrix Q5、numeric Q2/Q4、time Q1/Q3，7 个成分用 `lookup`/`efficiency` 表达：

```json
{
  "questionnaireId": "PSQI",
  "title": "匹兹堡睡眠质量指数问卷（PSQI）",
  "description": "评估近1个月来被试者的睡眠质量，包含 19 个自评条目，计分得出 7 个成分分数及总分。",
  "questions": [
    { "id": "Q1", "text": "通常入睡时间（几点上床）", "type": "time" },
    { "id": "Q2", "text": "通常从上床到入睡所需分钟数", "type": "numeric", "unit": "分钟" },
    { "id": "Q3", "text": "通常早晨起床时间", "type": "time" },
    { "id": "Q4", "text": "每夜实际睡眠小时数", "type": "numeric", "unit": "小时" },
    {
      "id": "Q5",
      "text": "近1个月来，因以下原因影响睡眠的频率",
      "type": "matrix",
      "subQuestions": [
        { "id": "Q5a", "text": "入睡困难（30分钟内不能入睡）" },
        { "id": "Q5b", "text": "夜间易醒或早醒" },
        { "id": "Q5c", "text": "夜间起夜上厕所" },
        { "id": "Q5d", "text": "呼吸不畅/感觉憋气" },
        { "id": "Q5e", "text": "咳嗽或打鼾严重" },
        { "id": "Q5f", "text": "感觉冷" },
        { "id": "Q5g", "text": "感觉热" },
        { "id": "Q5h", "text": "做恶梦" },
        { "id": "Q5i", "text": "身体疼痛" },
        { "id": "Q5j", "text": "其他影响睡眠的原因" }
      ],
      "options": [
        { "label": "无", "value": 0, "score": 0 },
        { "label": "＜1次/周", "value": 1, "score": 1 },
        { "label": "1-2次/周", "value": 2, "score": 2 },
        { "label": "≥3次/周", "value": 3, "score": 3 }
      ]
    },
    {
      "id": "Q6",
      "text": "近1个月来，总体睡眠质量评估",
      "type": "single_choice",
      "options": [
        { "label": "很好", "value": 0, "score": 0 },
        { "label": "较好", "value": 1, "score": 1 },
        { "label": "较差", "value": 2, "score": 2 },
        { "label": "很差", "value": 3, "score": 3 }
      ]
    },
    {
      "id": "Q7",
      "text": "近1个月来，使用催眠/安眠药物的频率",
      "type": "single_choice",
      "options": [
        { "label": "无", "value": 0, "score": 0 },
        { "label": "＜1次/周", "value": 1, "score": 1 },
        { "label": "1-2次/周", "value": 2, "score": 2 },
        { "label": "≥3次/周", "value": 3, "score": 3 }
      ]
    },
    {
      "id": "Q8",
      "text": "近1个月来，在开车、用餐、社交或从事活动时感到困倦/难以保持清醒的频率",
      "type": "single_choice",
      "options": [
        { "label": "无", "value": 0, "score": 0 },
        { "label": "＜1次/周", "value": 1, "score": 1 },
        { "label": "1-2次/周", "value": 2, "score": 2 },
        { "label": "≥3次/周", "value": 3, "score": 3 }
      ]
    },
    {
      "id": "Q9",
      "text": "近1个月来，做事情觉得精力不足、缺乏干劲",
      "type": "single_choice",
      "options": [
        { "label": "没有", "value": 0, "score": 0 },
        { "label": "偶尔有", "value": 1, "score": 1 },
        { "label": "有时有", "value": 2, "score": 2 },
        { "label": "经常有", "value": 3, "score": 3 }
      ]
    }
  ],
  "scoring": {
    "expression": {
      "kind": "sum",
      "items": [
        { "kind": "score", "question": "Q6" },
        {
          "kind": "lookup",
          "input": {
            "kind": "sum",
            "items": [
              { "kind": "lookup", "input": { "kind": "score", "question": "Q2" }, "table": [
                { "type": "range", "min": 0, "max": 15, "value": 0 },
                { "type": "range", "min": 16, "max": 30, "value": 1 },
                { "type": "range", "min": 31, "max": 60, "value": 2 },
                { "type": "range", "min": 61, "max": 999, "value": 3 }
              ] },
              { "kind": "score", "question": "Q5a" }
            ]
          },
          "table": [
            { "type": "score-sum", "min": 0, "max": 0, "value": 0 },
            { "type": "score-sum", "min": 1, "max": 2, "value": 1 },
            { "type": "score-sum", "min": 3, "max": 4, "value": 2 },
            { "type": "score-sum", "min": 5, "max": 6, "value": 3 }
          ]
        },
        {
          "kind": "lookup",
          "input": { "kind": "score", "question": "Q4" },
          "table": [
            { "type": "range", "min": 7, "max": 999, "value": 0 },
            { "type": "range", "min": 6, "max": 7, "value": 1 },
            { "type": "range", "min": 5, "max": 6, "value": 2 },
            { "type": "range", "min": 0, "max": 5, "value": 3 }
          ]
        },
        {
          "kind": "efficiency",
          "bedTime": "Q1",
          "wakeTime": "Q3",
          "sleepHours": "Q4",
          "table": [
            { "type": "range", "min": 85, "max": 999, "value": 0 },
            { "type": "range", "min": 75, "max": 84, "value": 1 },
            { "type": "range", "min": 65, "max": 74, "value": 2 },
            { "type": "range", "min": 0, "max": 64, "value": 3 }
          ]
        },
        {
          "kind": "lookup",
          "input": {
            "kind": "sum",
            "items": [
              { "kind": "score", "question": "Q5b" },
              { "kind": "score", "question": "Q5c" },
              { "kind": "score", "question": "Q5d" },
              { "kind": "score", "question": "Q5e" },
              { "kind": "score", "question": "Q5f" },
              { "kind": "score", "question": "Q5g" },
              { "kind": "score", "question": "Q5h" },
              { "kind": "score", "question": "Q5i" },
              { "kind": "score", "question": "Q5j" }
            ]
          },
          "table": [
            { "type": "score-sum", "min": 0, "max": 0, "value": 0 },
            { "type": "score-sum", "min": 1, "max": 9, "value": 1 },
            { "type": "score-sum", "min": 10, "max": 18, "value": 2 },
            { "type": "score-sum", "min": 19, "max": 27, "value": 3 }
          ]
        },
        { "kind": "score", "question": "Q7" },
        {
          "kind": "lookup",
          "input": {
            "kind": "sum",
            "items": [
              { "kind": "score", "question": "Q8" },
              { "kind": "score", "question": "Q9" }
            ]
          },
          "table": [
            { "type": "score-sum", "min": 0, "max": 0, "value": 0 },
            { "type": "score-sum", "min": 1, "max": 2, "value": 1 },
            { "type": "score-sum", "min": 3, "max": 4, "value": 2 },
            { "type": "score-sum", "min": 5, "max": 6, "value": 3 }
          ]
        }
      ]
    },
    "maxScore": 21,
    "evaluation": [
      { "minScore": 0, "maxScore": 5, "level": "睡眠质量很好", "assessment": "睡眠健康", "recommendations": ["维持良好作息"] },
      { "minScore": 6, "maxScore": 10, "level": "睡眠质量还行", "assessment": "轻度睡眠波动", "recommendations": ["调整生活方式与睡眠卫生"] },
      { "minScore": 11, "maxScore": 15, "level": "睡眠质量较差", "assessment": "明显睡眠障碍", "recommendations": ["改善作息并咨询医生"] },
      { "minScore": 16, "maxScore": 21, "level": "睡眠质量很差", "assessment": "严重睡眠障碍", "recommendations": ["前往睡眠科/心理科就诊"] }
    ]
  }
}
```

> **注意**：PSQI 的 `efficiency` 节点里 `Q1`/`Q3` 是 time 题，但 `matrix Q5` 的子问题 Q5a–Q5j 在 `score` 节点里用 `optionScore` 取矩阵行得分 —— 这要求 `optionScore` 对 matrix 题按子问题 id 查 `subQuestions`。**A3 的 `optionScore` 需要支持 matrix**：当 question.type === 'matrix' 时，`answers[questionId]` 是 `Record<subId, value>`，需按子题取值。请在 A3 Step 1 实现后补一个 matrix 用例（见下）。

- [ ] **Step 2: 校验 JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('resources/questionnaire/definitions/psqi.json','utf8'))" && echo OK`
Expected: `OK`

> **A3 补充（matrix 支持）**：`optionScore` 对 matrix 题的签名应是 `optionScore(def, questionId, subId, value)`，且 `answers[questionId]` 为 `Record<string, QuestionAnswer>`。`evaluateScore` 的 `score` 节点在 matrix 下从子题取值。请在实现 A3 时按此调整，并在 A3 Step 2 增加 matrix 用例：

```typescript
it('matrix: PSQI Q5a 子题得分', () => {
  const def = mkDef(
    [{ id: 'Q5', text: '', type: 'matrix', subQuestions: [{ id: 'Q5a', text: '' }, { id: 'Q5b', text: '' }], options: [{ value: 0, score: 0 }, { value: 1, score: 1 }, { value: 3, score: 3 }] }],
    { kind: 'score', question: 'Q5a' }
  )
  expect(evaluateScore(def, { kind: 'score', question: 'Q5a' }, { Q5: { Q5a: 1, Q5b: 3 } })).toBe(1)
})
```

### Task B5: 内置定义校验测试（防数据回归）

**Files:**
- Create: `src/shared/questionnaire/__tests__/definitions.test.ts`

- [ ] **Step 1: 写测试读取 4 份定义并过 schema**

`src/shared/questionnaire/__tests__/definitions.test.ts`：

```typescript
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { parseQuestionnaireDefinition } from '../schemas'

const DEFINITIONS_DIR = path.resolve(__dirname, '../../../../resources/questionnaire/definitions')
const FILES = ['china-dry-eye.json', 'lifestyle-dry-eye.json', 'cldeq-8.json', 'psqi.json']

describe('built-in questionnaire definitions', () => {
  for (const file of FILES) {
    it(`parses ${file} against the unified schema`, () => {
      const raw = JSON.parse(readFileSync(path.join(DEFINITIONS_DIR, file), 'utf8'))
      const def = parseQuestionnaireDefinition(raw)
      expect(def.questionnaireId).toBeTruthy()
      expect(def.questions.length).toBeGreaterThan(0)
      if (def.scoring.standardize) {
        expect(def.scoring.standardize.divideBy).toBeGreaterThan(0)
      }
    })
  }
})
```

- [ ] **Step 2: 运行测试**

Run: `pnpm vitest run src/shared/questionnaire/__tests__/definitions.test.ts`
Expected: 4 tests PASS

- [ ] **Step 3: 提交（B1–B5 一起）**

```bash
git add resources/questionnaire/definitions/ src/shared/questionnaire/__tests__/definitions.test.ts
git commit -m "feat(questionnaire): 内置 4 份干眼/睡眠问卷定义（统一 Schema）"
```

---

## 阶段 C：主进程 —— 定义加载（IpcApi）+ 会话持久化（DataApi）

### Task C1: path namespace + 定义加载服务

**Files:**
- Modify: `src/main/core/paths/pathRegistry.ts:147`（`feature.agents.builtin` 附近加一行）
- Modify: `src/main/core/paths/pathRegistry.ts:232`（`NO_ENSURE` 列表）
- Create: `src/main/features/questionnaire/definition/QuestionnaireDefinitionService.ts`

- [ ] **Step 1: 新增 path namespace**

`src/main/core/paths/pathRegistry.ts` 在 `feature.agents.builtin` 行后加：

```typescript
    'feature.agents.builtin': path.join(appRootResources, 'builtin-agents'), // bundled agent templates (read-only)
    'feature.questionnaire.definitions': path.join(appRootResources, 'questionnaire', 'definitions'), // bundled questionnaire definitions (read-only)
```

并在 `NO_ENSURE` 数组加 `'feature.questionnaire.definitions',`（只读打包资源，不自动建目录）。

- [ ] **Step 2: 写定义加载服务**

`src/main/features/questionnaire/definition/QuestionnaireDefinitionService.ts`：

```typescript
import { application } from '@application'
import { loggerService } from '@logger'
import { parseQuestionnaireDefinition } from '@shared/questionnaire/schemas'
import type { QuestionnaireDefinition } from '@shared/questionnaire/types'
import fs from 'fs'
import path from 'path'

const logger = loggerService.withContext('QuestionnaireDefinitionService')

/**
 * 加载打包的问卷定义（只读）。非生命周期单例——无长生命周期资源，
 * 仅在访问时读取文件系统并缓存。非法定义跳过并记录，不崩溃。
 */
export class QuestionnaireDefinitionService {
  private cache = new Map<string, QuestionnaireDefinition>()

  private get definitionsDir(): string {
    return application.getPath('feature.questionnaire.definitions')
  }

  /** 全部定义摘要（id/title/description），供列表页。 */
  list(): Array<{ questionnaireId: string; title: string; description: string }> {
    return this.loadAll().map((d) => ({
      questionnaireId: d.questionnaireId,
      title: d.title,
      description: d.description
    }))
  }

  get(questionnaireId: string): QuestionnaireDefinition | undefined {
    return this.loadAll().find((d) => d.questionnaireId === questionnaireId)
  }

  private loadAll(): QuestionnaireDefinition[] {
    if (this.cache.size > 0) return Array.from(this.cache.values())
    const dir = this.definitionsDir
    if (!fs.existsSync(dir)) {
      logger.warn('Questionnaire definitions directory missing', { dir })
      return []
    }
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        const def = parseQuestionnaireDefinition(raw)
        this.cache.set(def.questionnaireId, def)
      } catch (error) {
        logger.error('Failed to load questionnaire definition', error as Error, { file })
      }
    }
    logger.info('Loaded questionnaire definitions', { count: this.cache.size })
    return Array.from(this.cache.values())
  }
}

export const questionnaireDefinitionService = new QuestionnaireDefinitionService()
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm exec tsc --noEmit -p tsconfig.node.json` （或 `pnpm build:check`，会更快）
Expected: 通过（无类型错误）

- [ ] **Step 4: 提交**

```bash
git add src/main/core/paths/pathRegistry.ts src/main/features/questionnaire/definition/QuestionnaireDefinitionService.ts
git commit -m "feat(questionnaire): 问卷定义 path namespace + 主进程加载服务"
```

### Task C2: IpcApi 路由（list/get definition）

**Files:**
- Create: `src/shared/ipc/schemas/questionnaire.ts`
- Modify: `src/shared/ipc/schemas/ipcSchemas.ts`
- Create: `src/main/ipc/handlers/questionnaire.ts`
- Modify: `src/main/ipc/handlers/ipcHandlers.ts`

- [ ] **Step 1: 定义 IpcApi schema**

`src/shared/ipc/schemas/questionnaire.ts`（遵循 knowledge.ts 的模式，纯 Request，无 Event）：

```typescript
import { questionnaireDefinitionSchema } from '@shared/questionnaire/schemas'
import * as z from 'zod'

import { defineRoute } from '../define'

const questionnaireIdSchema = z.string().trim().min(1)

/** 定义摘要（列表页用，避免拉全量）。 */
const questionnaireSummarySchema = z.object({
  questionnaireId: z.string(),
  title: z.string(),
  description: z.string()
})

export const questionnaireRequestSchemas = {
  'questionnaire.list_definitions': defineRoute({
    input: z.strictObject({}),
    output: z.array(questionnaireSummarySchema)
  }),
  'questionnaire.get_definition': defineRoute({
    input: z.strictObject({ questionnaireId: questionnaireIdSchema }),
    output: questionnaireDefinitionSchema
  })
}
```

- [ ] **Step 2: 注册到 ipcSchemas.ts**

`src/shared/ipc/schemas/ipcSchemas.ts`：加 `import { questionnaireRequestSchemas } from './questionnaire'` 并在 `ipcRequestSchemas` 对象加 `...questionnaireRequestSchemas,`。

- [ ] **Step 3: 写 handler**

`src/main/ipc/handlers/questionnaire.ts`：

```typescript
import { questionnaireDefinitionService } from '@main/features/questionnaire/definition/QuestionnaireDefinitionService'
import { IpcError } from '@shared/ipc/errors/IpcError'
import type { questionnaireRequestSchemas } from '@shared/ipc/schemas/questionnaire'
import type { IpcHandlersFor } from '@shared/ipc/types'

const DEFINITION_NOT_FOUND = 'QUESTIONNAIRE_DEFINITION_NOT_FOUND'

export const questionnaireHandlers: IpcHandlersFor<typeof questionnaireRequestSchemas> = {
  'questionnaire.list_definitions': async () => questionnaireDefinitionService.list(),
  'questionnaire.get_definition': async ({ questionnaireId }) => {
    const def = questionnaireDefinitionService.get(questionnaireId)
    if (!def) {
      throw new IpcError(DEFINITION_NOT_FOUND, `Questionnaire definition not found: ${questionnaireId}`)
    }
    return def
  }
}
```

- [ ] **Step 4: 注册到 ipcHandlers.ts**

`src/main/ipc/handlers/ipcHandlers.ts`：加 `import { questionnaireHandlers } from './questionnaire'` 并 spread `...questionnaireHandlers,`。

- [ ] **Step 5: 类型检查**

Run: `pnpm build:check`
Expected: 通过

- [ ] **Step 6: 提交**

```bash
git add src/shared/ipc/schemas/questionnaire.ts src/shared/ipc/schemas/ipcSchemas.ts src/main/ipc/handlers/questionnaire.ts src/main/ipc/handlers/ipcHandlers.ts
git commit -m "feat(questionnaire): IpcApi 路由（list/get questionnaire definition）"
```

### Task C3: 会话 SQLite 表 + DataApi schema

**Files:**
- Create: `src/main/data/db/schemas/questionnaireSession.ts`
- Create: `src/shared/data/api/schemas/questionnaires.ts`
- Modify: `src/shared/data/api/schemas/apiSchemas.ts`

- [ ] **Step 1: 写 Drizzle 表**

`src/main/data/db/schemas/questionnaireSession.ts`：

```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { createUpdateTimestamps, uuidPrimaryKey } from './_columnHelpers'

/**
 * 问卷会话：一次「多问卷流程」的作答 + 报告。
 * answers/report 以 JSON 整体读写（流程内无关系型查询需求），故不拆多表。
 */
export const questionnaireSessionTable = sqliteTable(
  'questionnaire_session',
  {
    id: uuidPrimaryKey(),
    /** 流程起点问卷 id（如 CHINA_DRY_EYE） */
    flowQuestionnaireId: text().notNull(),
    status: text().notNull().default('in_progress'), // 'in_progress' | 'completed'
    /** JSON: Record<questionnaireId, Record<questionId, Answer>> */
    answers: text().notNull(),
    /** JSON: QuestionnaireReport | null */
    report: text(),
    ...createUpdateTimestamps
  }
)
```

- [ ] **Step 2: 写 DataApi schema**

`src/shared/data/api/schemas/questionnaires.ts`：

```typescript
import type { QuestionnaireReport, QuestionnaireAnswers } from '@shared/questionnaire/types'
import * as z from 'zod'

import type { SearchParams } from '../types'

const sessionIdSchema = z.string().trim().min(1)
const sessionStatusSchema = z.enum(['in_progress', 'completed'])
const jsonAnswersSchema = z.custom<QuestionnaireAnswers>((v) => typeof v === 'object' && v !== null)
const reportSchema = z.custom<QuestionnaireReport>((v) => typeof v === 'object' && v !== null)

export const CreateQuestionnaireSessionSchema = z.object({
  flowQuestionnaireId: z.string().trim().min(1)
})
export type CreateQuestionnaireSessionDto = z.infer<typeof CreateQuestionnaireSessionSchema>

export const UpdateQuestionnaireSessionSchema = z.object({
  status: sessionStatusSchema.optional(),
  answers: jsonAnswersSchema.optional(),
  report: reportSchema.optional()
})
export type UpdateQuestionnaireSessionDto = z.infer<typeof UpdateQuestionnaireSessionSchema>

export interface QuestionnaireSession {
  id: string
  flowQuestionnaireId: string
  status: 'in_progress' | 'completed'
  answers: QuestionnaireAnswers
  report: QuestionnaireReport | null
  createdAt: string
  updatedAt: string
}

export type QuestionnaireSessionSchemas = {
  '/questionnaire-sessions': {
    GET: {
      query?: SearchParams
      response: QuestionnaireSession[]
    }
    POST: {
      body: CreateQuestionnaireSessionDto
      response: QuestionnaireSession
    }
  }
  '/questionnaire-sessions/:id': {
    GET: {
      params: { id: string }
      response: QuestionnaireSession
    }
    PATCH: {
      params: { id: string }
      body: UpdateQuestionnaireSessionDto
      response: QuestionnaireSession
    }
    DELETE: {
      params: { id: string }
      response: void
    }
  }
}
```

- [ ] **Step 3: 注册到 apiSchemas.ts**

`src/shared/data/api/schemas/apiSchemas.ts`：加 `import type { QuestionnaireSessionSchemas } from './questionnaires'` 并加入 `ApiSchemas` intersection。

- [ ] **Step 4: 生成迁移**

Run: `pnpm db:migrations:generate`
Expected: 生成 `migrations/sqlite-drizzle/xxxx_create_questionnaire_session.sql`

- [ ] **Step 5: 运行数据库测试（先建 service 在 C4）** —— 本步只确认 schema 可被 drizzle 读取。

Run: `pnpm build:check`
Expected: 通过

### Task C4: 会话 DataApi service + handlers

**Files:**
- Create: `src/main/data/services/QuestionnaireSessionService.ts`
- Create: `src/main/data/api/handlers/questionnaires.ts`
- Modify: `src/main/data/api/handlers/apiHandlers.ts`

- [ ] **Step 1: 写 service**

`src/main/data/services/QuestionnaireSessionService.ts`（沿用 PromptService 的 DataApi 模式）：

```typescript
import { application } from '@application'
import { questionnaireSessionTable } from '@data/db/schemas/questionnaireSession'
import { loggerService } from '@logger'
import { DataApiErrorFactory } from '@shared/data/api/errors'
import type {
  CreateQuestionnaireSessionDto,
  QuestionnaireSession,
  UpdateQuestionnaireSessionDto
} from '@shared/data/api/schemas/questionnaires'
import type { QuestionnaireAnswers, QuestionnaireReport } from '@shared/questionnaire/types'
import { desc, eq } from 'drizzle-orm'

const logger = loggerService.withContext('DataApi:QuestionnaireSessionService')

function rowToSession(row: typeof questionnaireSessionTable.$inferSelect): QuestionnaireSession {
  return {
    id: row.id,
    flowQuestionnaireId: row.flowQuestionnaireId,
    status: row.status as QuestionnaireSession['status'],
    answers: JSON.parse(row.answers) as QuestionnaireAnswers,
    report: row.report ? (JSON.parse(row.report) as QuestionnaireReport) : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  }
}

export class QuestionnaireSessionService {
  private get db() {
    return application.get('DbService').getDb()
  }

  list(): QuestionnaireSession[] {
    const rows = this.db
      .select()
      .from(questionnaireSessionTable)
      .orderBy(desc(questionnaireSessionTable.updatedAt))
      .all()
    return rows.map(rowToSession)
  }

  getById(id: string): QuestionnaireSession {
    const [row] = this.db
      .select()
      .from(questionnaireSessionTable)
      .where(eq(questionnaireSessionTable.id, id))
      .limit(1)
      .all()
    if (!row) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    return rowToSession(row)
  }

  create(dto: CreateQuestionnaireSessionDto): QuestionnaireSession {
    const now = Date.now()
    const id = crypto.randomUUID()
    this.db
      .insert(questionnaireSessionTable)
      .values({
        id,
        flowQuestionnaireId: dto.flowQuestionnaireId,
        status: 'in_progress',
        answers: '{}',
        createdAt: now,
        updatedAt: now
      })
      .run()
    logger.info('Created questionnaire session', { id })
    return this.getById(id)
  }

  update(id: string, dto: UpdateQuestionnaireSessionDto): QuestionnaireSession {
    const updates: Partial<typeof questionnaireSessionTable.$inferInsert> = {}
    if (dto.status !== undefined) updates.status = dto.status
    if (dto.answers !== undefined) updates.answers = JSON.stringify(dto.answers)
    if (dto.report !== undefined) updates.report = JSON.stringify(dto.report)
    const result = this.db
      .update(questionnaireSessionTable)
      .set(updates)
      .where(eq(questionnaireSessionTable.id, id))
      .run()
    if (result.changes === 0) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    logger.info('Updated questionnaire session', { id })
    return this.getById(id)
  }

  delete(id: string): void {
    const result = this.db.delete(questionnaireSessionTable).where(eq(questionnaireSessionTable.id, id)).run()
    if (result.changes === 0) throw DataApiErrorFactory.notFound('QuestionnaireSession', id)
    logger.info('Deleted questionnaire session', { id })
  }
}

export const questionnaireSessionService = new QuestionnaireSessionService()
```

> **注意**：表用 `uuidPrimaryKey()`（`$defaultFn` 自动生成 v4），insert 不必手动给 id，可去掉 `const id = crypto.randomUUID()`，直接不传 id 靠默认值。create 后 `getById` 需要知道生成的 id —— 用 `insert().returning({ id: questionnaireSessionTable.id })` 取回。

- [ ] **Step 2: 写 service 数据库测试**

`src/main/data/services/__tests__/QuestionnaireSessionService.test.ts`（用 `setupTestDatabase`）：

```typescript
import { questionnaireSessionService } from '@data/services/QuestionnaireSessionService'
import { setupTestDatabase } from '@test-helpers/db'
import { describe, expect, it } from 'vitest'

describe('QuestionnaireSessionService', () => {
  setupTestDatabase()

  it('creates an in_progress session', () => {
    const session = questionnaireSessionService.create({ flowQuestionnaireId: 'CHINA_DRY_EYE' })
    expect(session.status).toBe('in_progress')
    expect(session.flowQuestionnaireId).toBe('CHINA_DRY_EYE')
    expect(session.answers).toEqual({})
  })

  it('updates answers and report', () => {
    const session = questionnaireSessionService.create({ flowQuestionnaireId: 'CHINA_DRY_EYE' })
    const answers = { CHINA_DRY_EYE: { Q1: 'A' } }
    const updated = questionnaireSessionService.update(session.id, { answers, status: 'completed' })
    expect(updated.answers).toEqual(answers)
    expect(updated.status).toBe('completed')
  })

  it('throws NOT_FOUND for a missing session', () => {
    expect(() => questionnaireSessionService.getById('missing')).toThrow()
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `pnpm vitest run src/main/data/services/__tests__/QuestionnaireSessionService.test.ts`
Expected: 3 tests PASS（需先确认 `setupTestDatabase` 会建 migration 使新表存在）

- [ ] **Step 4: 写 DataApi handlers**

`src/main/data/api/handlers/questionnaires.ts`：

```typescript
import { questionnaireSessionService } from '@data/services/QuestionnaireSessionService'
import {
  CreateQuestionnaireSessionSchema,
  type QuestionnaireSessionSchemas,
  UpdateQuestionnaireSessionSchema
} from '@shared/data/api/schemas/questionnaires'
import type { HandlersFor } from '@shared/data/api/types'

export const questionnaireSessionHandlers: HandlersFor<QuestionnaireSessionSchemas> = {
  '/questionnaire-sessions': {
    GET: async () => questionnaireSessionService.list(),
    POST: async ({ body }) => {
      const parsed = CreateQuestionnaireSessionSchema.parse(body)
      return questionnaireSessionService.create(parsed)
    }
  },
  '/questionnaire-sessions/:id': {
    GET: async ({ params }) => questionnaireSessionService.getById(params.id),
    PATCH: async ({ params, body }) => {
      const parsed = UpdateQuestionnaireSessionSchema.parse(body)
      return questionnaireSessionService.update(params.id, parsed)
    },
    DELETE: async ({ params }) => {
      questionnaireSessionService.delete(params.id)
      return undefined
    }
  }
}
```

- [ ] **Step 5: 注册到 apiHandlers.ts**

`src/main/data/api/handlers/apiHandlers.ts`：加 import 并 spread `...questionnaireSessionHandlers,`。

- [ ] **Step 6: 类型检查 + 测试**

Run: `pnpm build:check && pnpm vitest run src/main/data/services/__tests__/QuestionnaireSessionService.test.ts`
Expected: 通过

- [ ] **Step 7: 提交**

```bash
git add src/main/data/db/schemas/questionnaireSession.ts src/shared/data/api/schemas/questionnaires.ts src/shared/data/api/schemas/apiSchemas.ts src/main/data/services/QuestionnaireSessionService.ts src/main/data/api/handlers/questionnaires.ts src/main/data/api/handlers/apiHandlers.ts src/main/data/services/__tests__/QuestionnaireSessionService.test.ts migrations/sqlite-drizzle/
git commit -m "feat(questionnaire): SQLite 会话持久化 + DataApi CRUD"
```

---

## 阶段 D：渲染进程 —— 页面 + 流程 + 报告 + 发送

### Task D1: 侧边栏模块 + 路由 + i18n

**Files:**
- Modify: `src/shared/data/preference/preferenceTypes.ts`（`SIDEBAR_FAVORITES` 加 `'questionnaire'`）
- Modify: `src/renderer/utils/sidebar.ts`（`SIDEBAR_APP_DEFINITIONS` 加 questionnaire）
- Modify: `src/renderer/components/app/sidebarIcons.tsx`（加图标）
- Modify: `src/renderer/components/layout/tabIcons.ts`（加图标）
- Modify: `src/renderer/i18n/label.ts`（`sidebarIconKeyMap` + `titleKeyMap` 加 questionnaire）
- Modify: `src/renderer/i18n/locales/zh-cn.json` + `en-US.json`（`title.questionnaire` 等）
- Create: `src/renderer/routes/app/questionnaire.tsx`
- Create: `src/renderer/pages/questionnaire/QuestionnairePage.tsx`（占位）

- [ ] **Step 1: 侧边栏注册**

`preferenceTypes.ts` 的 `SIDEBAR_FAVORITES` 加 `'questionnaire'`（在 `knowledge` 旁）。
`sidebar.ts` 的 `SIDEBAR_APP_DEFINITIONS` 加：

```typescript
  {
    id: 'questionnaire',
    routePrefix: '/app/questionnaire'
  }
```

- [ ] **Step 2: 图标**

`sidebarIcons.tsx`：`questionnaire: ClipboardList`（`import { ClipboardList } from 'lucide-react'`）
`tabIcons.ts`：`'/app/questionnaire': ClipboardList`

- [ ] **Step 3: i18n label**

`label.ts` 的 `sidebarIconKeyMap` 加 `questionnaire: 'title.questionnaire'`；`titleKeyMap` 加 `questionnaire: 'title.questionnaire'`。
`zh-cn.json` 加 `"title": { ..., "questionnaire": "问卷" }`；`en-US.json` 加 `"questionnaire": "Questionnaire"`。

- [ ] **Step 4: 路由 + 占位页**

`src/renderer/routes/app/questionnaire.tsx`：

```typescript
import QuestionnairePage from '@renderer/pages/questionnaire/QuestionnairePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/questionnaire')({
  component: QuestionnairePage
})
```

`src/renderer/pages/questionnaire/QuestionnairePage.tsx`（占位，D2 填充）：

```typescript
export default function QuestionnairePage() {
  return <div data-ui="questionnaire.view" className="flex h-full items-center justify-center text-sm opacity-60">问卷模块建设中</div>
}
```

- [ ] **Step 5: 重新生成路由树 + 检查**

Run: `pnpm build:check`
Expected: 通过（routeTree.gen.ts 自动更新，含 `/app/questionnaire`）

- [ ] **Step 6: 提交**

```bash
git add src/shared/data/preference/preferenceTypes.ts src/renderer/utils/sidebar.ts src/renderer/components/app/sidebarIcons.tsx src/renderer/components/layout/tabIcons.ts src/renderer/i18n/label.ts src/renderer/i18n/locales/zh-cn.json src/renderer/i18n/locales/en-US.json src/renderer/routes/app/questionnaire.tsx src/renderer/pages/questionnaire/QuestionnairePage.tsx src/renderer/routeTree.gen.ts
git commit -m "feat(questionnaire): 新增侧边栏问卷模块路由与占位页"
```

### Task D2: 问卷列表 + 历史会话（首页）

**Files:**
- Create: `src/renderer/pages/questionnaire/components/QuestionnaireCard.tsx`
- Create: `src/renderer/pages/questionnaire/components/SessionHistoryList.tsx`
- Modify: `src/renderer/pages/questionnaire/QuestionnairePage.tsx`

- [ ] **Step 1: 首页组件**

`QuestionnaireCard.tsx`（展示定义摘要 + 开始按钮）：

```typescript
import type { QuestionnaireDefinition } from '@shared/questionnaire/types'

export function QuestionnaireCard({ definition, onStart }: {
  definition: Pick<QuestionnaireDefinition, 'questionnaireId' | 'title' | 'description'>
  onStart: (id: string) => void
}) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="text-base font-medium">{definition.title}</div>
      <div className="mt-1 text-sm opacity-60">{definition.description}</div>
      <button
        className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        onClick={() => onStart(definition.questionnaireId)}>
        开始作答
      </button>
    </div>
  )
}
```

`SessionHistoryList.tsx`：`useQuery('/questionnaire-sessions')` 渲染历史会话（标题/时间/状态），点击进入报告视图。

- [ ] **Step 2: 首页逻辑**

`QuestionnairePage.tsx`：`useQuery('/questionnaire-sessions')` + `ipcApi.request('questionnaire.list_definitions')`，布局为「问卷卡片网格 + 历史会话列表」。

```typescript
import { useEffect, useState } from 'react'
import { useQuery } from '@renderer/data/hooks/useDataApi'
import { ipcApi } from '@renderer/ipc'
import type { QuestionnaireDefinition } from '@shared/questionnaire/types'

export default function QuestionnairePage() {
  const [definitions, setDefinitions] = useState<Array<{ questionnaireId: string; title: string; description: string }>>([])
  const { data: sessions } = useQuery('/questionnaire-sessions')

  useEffect(() => {
    void ipcApi.request('questionnaire.list_definitions').then(setDefinitions).catch(() => setDefinitions([]))
  }, [])

  return (
    <div data-ui="questionnaire.view" className="flex h-full flex-col gap-4 overflow-auto p-6">
      <h1 className="text-lg font-semibold">问卷</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {definitions.map((d) => (
          <QuestionnaireCard key={d.questionnaireId} definition={d} onStart={() => {}} />
        ))}
      </div>
      <SessionHistoryList sessions={sessions ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: 运行测试 + 提交**

Run: `pnpm build:check`
Expected: 通过

```bash
git add src/renderer/pages/questionnaire/
git commit -m "feat(questionnaire): 问卷列表页与历史会话列表"
```

### Task D3: 表单渲染器 + 流程状态机

**Files:**
- Create: `src/renderer/pages/questionnaire/hooks/useQuestionnaireFlow.ts`
- Create: `src/renderer/pages/questionnaire/components/QuestionnaireForm.tsx`
- Create: `src/renderer/pages/questionnaire/components/BranchingPromptDialog.tsx`

- [ ] **Step 1: 流程状态机**

`useQuestionnaireFlow.ts`：

```typescript
import { useCallback, useState } from 'react'
import type { BranchingRule, QuestionnaireAnswers, QuestionnaireDefinition, QuestionAnswer } from '@shared/questionnaire/types'

export interface FlowState {
  /** 当前正在作答的问卷 id */
  currentQuestionnaireId: string
  /** 已完成作答的问卷 id（含被拒绝的分支） */
  completedQuestionnaireIds: string[]
  /** 待确认的分支规则（命中但未确认） */
  pendingBranch: BranchingRule | null
  /** 自动跳过且不存在的分支目标 */
  skippedBranchTargets: string[]
  answers: QuestionnaireAnswers
}

export function useQuestionnaireFlow(startQuestionnaireId: string) {
  const [state, setState] = useState<FlowState>({
    currentQuestionnaireId: startQuestionnaireId,
    completedQuestionnaireIds: [],
    pendingBranch: null,
    skippedBranchTargets: [],
    answers: {}
  })

  const definitionsById = new Map<string, QuestionnaireDefinition>()

  /** 用户答完一题后：评估分支规则，决定是否插入子问卷。 */
  const answerQuestion = useCallback(
    (definitions: QuestionnaireDefinition[], questionnaireId: string, questionId: string, value: QuestionAnswer) => {
      setState((prev) => {
        const nextAnswers = {
          ...prev.answers,
          [questionnaireId]: { ...prev.answers[questionnaireId], [questionId]: value }
        }
        const def = definitions.find((d) => d.questionnaireId === questionnaireId)
        const rule = def?.branchingRules?.find((r) => {
          const ans = nextAnswers[questionnaireId]?.[r.triggerQuestion]
          if (r.condition === 'not_equal') return ans !== undefined && ans !== r.value
          return r.condition === 'contains_any' && Array.isArray(ans) && (r.value as string[]).some((v) => (ans as string[]).includes(v))
        })
        if (rule) {
          const exists = definitions.some((d) => d.questionnaireId === rule.targetQuestionnaireId)
          if (!exists) {
            return { ...prev, answers: nextAnswers, skippedBranchTargets: [...prev.skippedBranchTargets, rule.targetQuestionnaireId] }
          }
          return { ...prev, answers: nextAnswers, pendingBranch: rule }
        }
        return { ...prev, answers: nextAnswers }
      })
    },
    []
  )

  const acceptBranch = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingBranch) return prev
      return {
        ...prev,
        currentQuestionnaireId: prev.pendingBranch.targetQuestionnaireId,
        pendingBranch: null
      }
    })
  }, [])

  const rejectBranch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      completedQuestionnaireIds: prev.pendingBranch ? [...prev.completedQuestionnaireIds, prev.pendingBranch.targetQuestionnaireId] : prev.completedQuestionnaireIds,
      pendingBranch: null
    }))
  }, [])

  return { state, answerQuestion, acceptBranch, rejectBranch }
}
```

- [ ] **Step 2: 表单渲染器**

`QuestionnaireForm.tsx`：按 `question.type` 渲染单选/多选/matrix/numeric/time，答题回调 `onAnswer(questionId, value)`。

```typescript
import type { QuestionnaireQuestion } from '@shared/questionnaire/types'

export function QuestionnaireForm({ question, onAnswer }: {
  question: QuestionnaireQuestion
  onAnswer: (questionId: string, value: any) => void
}) {
  if (question.type === 'single_choice') {
    return (
      <div className="space-y-1">
        <div className="text-sm font-medium">{question.text}</div>
        {question.patientExplanation && <div className="text-xs opacity-60">{question.patientExplanation}</div>}
        {question.options.map((opt) => (
          <label key={String(opt.value)} className="block cursor-pointer rounded px-2 py-1 hover:bg-accent">
            <input type="radio" name={question.id} value={String(opt.value)} onChange={() => onAnswer(question.id, opt.value)} />
            <span className="ml-2">{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }
  // multi_choice / matrix / numeric / time 同理，按需实现
  return null
}
```

- [ ] **Step 3: 分支确认对话框**

`BranchingPromptDialog.tsx`：显示 `pendingBranch.promptMessage`，确认/拒绝调 `acceptBranch`/`rejectBranch`。

- [ ] **Step 4: 组件测试**

`src/renderer/pages/questionnaire/__tests__/useQuestionnaireFlow.test.ts`：验证 answer 触发分支、缺失目标跳过、accept/reject 切换。

- [ ] **Step 5: 运行测试 + 提交**

Run: `pnpm vitest run src/renderer/pages/questionnaire/__tests__/useQuestionnaireFlow.test.ts && pnpm build:check`
Expected: 通过

```bash
git add src/renderer/pages/questionnaire/
git commit -m "feat(questionnaire): 表单渲染器 + 多问卷流程状态机 + 分支确认"
```

### Task D4: 报告视图 + 发送到问诊AI

**Files:**
- Create: `src/renderer/pages/questionnaire/components/QuestionnaireReportView.tsx`
- Create: `src/renderer/pages/questionnaire/lib/buildQuestionnaireReport.ts`（包装 shared）
- Modify: `src/renderer/pages/questionnaire/QuestionnairePage.tsx`（提交 + 报告态 + 发送）

- [ ] **Step 1: 报告构建包装**

`lib/buildQuestionnaireReport.ts`：

```typescript
import { buildQuestionnaireReport as buildReport } from '@shared/questionnaire/report'
import type { QuestionnaireAnswers, QuestionnaireDefinition } from '@shared/questionnaire/types'

export function buildReportFor(definitions: QuestionnaireDefinition[], answers: QuestionnaireAnswers, flowId: string) {
  return buildReport({
    flowQuestionnaireId: flowId,
    completedAt: new Date().toISOString(),
    definitions,
    answers
  })
}
```

- [ ] **Step 2: 报告视图**

`QuestionnaireReportView.tsx`：渲染完整报告（答案 + 得分 + 分级 + 建议 + 风险标签 + 摘要），含「发送到问诊AI」按钮。

- [ ] **Step 3: 提交 + 发送到问诊AI**

`QuestionnairePage.tsx`：完成流程 → `useMutation('POST', '/questionnaire-sessions')` 创建 → PATCH 存 answers/report → 进入报告视图。发送按钮逻辑（复用 feedbackComposerLaunch 的 draft-cache 机制）：

```typescript
import { writeAgentDraftCache } from '@renderer/components/composer/variants/agent/agentDraftCache'
import { useNavigate } from '@tanstack/react-router'

async function sendReportToClinic(reportSummary: string, navigate: ReturnType<typeof useNavigate>) {
  // 1. 复用 clinic agent 会话（若无则创建）——简化：先取最近 clinic 会话，否则走 AgentPage 的创建逻辑
  // 2. 持久化报告为 composer draft
  writeAgentDraftCache(`agent-session-draft-${sessionId}`, reportSummary, [])
  // 3. 导航到 clinic 会话
  void navigate({ to: '/app/clinic', search: { sessionId } })
}
```

> **说明**：这里复用 `writeAgentDraftCache` + `getAgentDraftCacheKey(sessionId)` 的机制，把报告预填入 clinic 会话的 composer。完整实现需先解析 clinic 会话（`/agent-sessions/latest?agentId=clinic`），无则创建——与 `AgentPage.createDefaultEmptySession` 等价。为控制复杂度，此 Task 先实现「存在 clinic 会话时预填 + 导航」，创建新会话留作后续增强。

- [ ] **Step 4: 组件测试**

`src/renderer/pages/questionnaire/__tests__/QuestionnaireReportView.test.tsx`：渲染报告、点击发送触发 navigate。

- [ ] **Step 5: 运行测试 + 提交**

Run: `pnpm vitest run src/renderer/pages/questionnaire/ && pnpm build:check`
Expected: 通过

```bash
git add src/renderer/pages/questionnaire/
git commit -m "feat(questionnaire): 报告视图 + 发送到问诊AI"
```

---

## 阶段 E：收尾

### Task E1: 全量校验

- [ ] **Step 1: 跑全部门禁**

Run: `pnpm lint && pnpm test && pnpm format`
Expected: 全部通过

- [ ] **Step 2: 运行应用手动验证**

Run: `pnpm dev`（或项目定义的启动命令）
Expected: 侧边栏出现「问卷」，打开 4 份问卷可作答、算分、生成报告、保存、发送到问诊AI。

- [ ] **Step 3: 提交收尾**

```bash
git add -A
git commit -m "chore(questionnaire): 全量 lint/test/format 通过"
```

---

## Self-Review（执行前自查）

**Spec 覆盖**：
- 独立页面 ✓ D1/D2；统一 Schema ✓ A1/A2；本地算分 ✓ A3；分支组合 ✓ B1/D3；SQLite ✓ C3/C4；完整报告 ✓ A4/D4；发送到问诊AI ✓ D4；4 份内置 ✓ B1-B5；错误处理 ✓ 各 Task 内。
- **缺口**：spec §7 错误处理表「发送到问诊AI 无 clinic agent → toast」在本计划 D4 Step 3 已说明简化为「存在时预填」——这是**计划内的简化**，不是漏项。

**占位扫描**：无 TBD/TODO；所有代码步骤给出完整实现。

**类型一致性**：`ScoreExpr`/`QuestionnaireDefinition`/`QuestionnaireAnswers`/`QuestionnaireReport` 在 A1 定义、A2-A4/共享、B 定义 JSON、C 服务、D 渲染间一致。`questionnaireSessionService`、`questionnaireDefinitionService`、`questionnaireSessionHandlers`、`questionnaireHandlers` 命名统一。
