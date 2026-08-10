# 问卷模块设计（Questionnaire Module）

> Date: 2026-08-10
> Status: Draft (awaiting review)
> Branch: `feat/slim-agents-knowledge`

## 1. 背景与目标

当前应用已精简为三个侧边栏模块：科普AI（`pop-science`）、问诊AI（`clinic`）、知识库。问诊AI 目前通过纯对话收集症状并给出分诊建议。

**目标**：新增一个独立「问卷」模块，用于帮助问诊AI 辅助诊断。用户填写结构化问卷，本地计算评分与诊断分级，保存问卷会话记录，并可一键把完整报告发送给问诊AI 做个性化解读。

**参考数据**：`resources/questionnaire/` 下已有 4 份干眼/睡眠问卷 JSON（结构互不一致）与一份规则说明 README。它们是本模块的内置数据来源。

## 2. 范围

**In scope**：
- 新的侧边栏问卷模块（`/app/questionnaire`）
- 统一问卷 Schema + 4 份内置问卷定义（重写为统一结构）
- 本地计分求值器（声明式表达式树）——支持维度加权、查表、成分求和、标准化、阈值分级
- 分支跳转（branching_rules）驱动的多问卷流程组合
- 问卷会话 SQLite 持久化（答案 + 完整报告）
- 完整报告视图 + 「发送到问诊AI」
- 单元/组件/数据库测试

**Out of scope**：
- 用户编辑/新建问卷（定义只读内置）
- 医疗诊断结论（报告仅评分与建议，不做诊断）
- 问诊AI 侧的系统提示词改动（报告经用户确认后作为普通用户消息进入对话）
- 问卷间非 branching 的任意组合 UI（只有规则定义的分支流程）

## 3. 架构总览

```
resources/questionnaire/definitions/*.json   ← 统一 schema 的 4 份内置问卷定义（只读打包资源）
        ↓ 主进程启动加载 + zod 校验
src/shared/questionnaire/                    ← 纯逻辑：类型 + 计分求值器 + 分支规则 + 报告构建（无副作用）
        ↓
src/main/features/questionnaire/
  ├─ QuestionnaireDefinitionService           ← 非生命周期单例：加载/校验/缓存定义，经 IpcApi 暴露
  ├─ QuestionnaireSessionService              ← DataApi 服务：SQLite 会话 CRUD
  └─ ipc/handlers/questionnaire.ts            ← IpcApi 路由：list_definitions / get_definition
        ↓                    ↓
   IpcApi 路由                 DataApi 端点 (/questionnaire-sessions)
        ↓
src/renderer/pages/questionnaire/            ← 表单渲染 + 流程导航 + 报告视图 + 发送到问诊AI
src/renderer/routes/app/questionnaire.tsx    ← 新路由
```

**分层约束**：
- `src/shared/questionnaire/` 只含纯逻辑与类型，无 IpcApi/DataApi/SQLite 依赖，可在主进程与渲染进程共享。
- 问卷定义是只读打包资源（`resources/questionnaire/definitions/`），运行时经主进程加载，不落数据库。
- 用户作答数据（会话 + 答案 + 报告）落 SQLite（DataApi）。

## 4. 统一问卷 Schema

4 份原始 JSON 结构互不一致，需要归一化为一份统一 Schema。核心是用**声明式计分表达式树**表达所有计分方式，避免实现通用公式解释器。

类型定义放在 `src/shared/questionnaire/types.ts`，配套 zod schema 放 `src/shared/questionnaire/schemas.ts`（供定义加载校验与 IPC/DataApi 复用）。

```typescript
// src/shared/questionnaire/types.ts

/** 计分表达式：声明式，无字符串公式，避免解释器。 */
type ScoreExpr =
  | { kind: 'score'; question: string }                        // 取该题所选选项的 score / convertedScore
  | { kind: 'sum'; items: ScoreExpr[] }                        // 求和
  | { kind: 'max'; items: ScoreExpr[] }                        // 取最大（中国干眼 Q1/Q2 互斥）
  | { kind: 'mul'; expr: ScoreExpr; factor: number }           // 加权（CLDEQ Q1b*2）
  | { kind: 'lookup'; input: ScoreExpr; table: LookupRow[] }   // 查表映射（PSQI 成分 B/E/G）
  | { kind: 'efficiency'; bedTime: string; wakeTime: string; sleepHours: string; table: LookupRow[] }
    // 习惯性睡眠效率（PSQI 成分 D）：eff = sleepHours / (wakeTime - bedTime)，再查表映射

type LookupRow =
  | { type: 'range'; min: number; max: number; value: number }     // 数值区间 → 分值
  | { type: 'score-sum'; min: number; max: number; value: number } // 得分区间 → 分值

interface QuestionnaireOption {
  label: string
  value: string | number
  /** 该选项的基础得分（CLDEQ/PSQI 用） */
  score?: number
  /** 线性转换后的得分（CLDEQ Q5: (raw-1)*0.8） */
  convertedScore?: number
}

type QuestionnaireQuestion =
  | { id: string; text: string; type: 'single_choice'; options: QuestionnaireOption[]; patientExplanation?: string; mutuallyExclusiveWith?: string }
  | { id: string; text: string; type: 'multi_choice'; subItems: string[]; options: QuestionnaireOption[] }
  | { id: string; text: string; type: 'matrix'; subQuestions: { id: string; text: string }[]; options: QuestionnaireOption[] }
  | { id: string; text: string; type: 'numeric'; unit?: string }
  | { id: string; text: string; type: 'time' }

interface QuestionnaireSection {
  sectionId: string
  sectionName: string
  questionIds: string[]           // 引用扁平 questions 数组中的题，简化渲染与取值
}

interface BasicInfoField {
  id: string
  label: string
  type: 'string' | 'enum' | 'date' | 'integer'
  options?: string[]
  /** 敏感字段（如电话）默认可选，不影响提交 */
  optional?: boolean
}

interface BranchingRule {
  ruleId: string
  triggerQuestion: string
  /** not_equal / contains_any（中国干眼 Q1/Q4/Q5/Q7 用） */
  condition: 'not_equal' | 'contains_any'
  value: string | string[]
  targetQuestionnaireId: string
  promptMessage: string
}

interface EvaluationRule {
  minScore: number
  maxScore: number
  level: string            // 分级名（如「无干眼相关疾病」「睡眠质量较差」）
  assessment: string       // 评估描述
  recommendations: string[] // 建议列表
}

interface QuestionnaireDefinition {
  questionnaireId: string
  title: string
  description: string
  /** 生活方式问卷的分组；无分组问卷省略 */
  sections?: QuestionnaireSection[]
  /** 中国干眼问卷的头部基本信息（姓名/性别/年龄等），可选 */
  basicInfoFields?: BasicInfoField[]
  questions: QuestionnaireQuestion[]
  branchingRules?: BranchingRule[]
  scoring: {
    expression: ScoreExpr
    maxScore?: number
    /** 标准化公式，CLDEQ 用：standard = raw / max * 100 */
    standardize?: { divideBy: number; multiplyBy: number }
    evaluation?: EvaluationRule[]
    /** 危险因素标签 → 生活建议（生活方式问卷用） */
    interpretations?: Record<string, string[]>
  }
}
```

### 4.1 四份问卷的 Schema 映射

| 问卷 | questions 数 | 计分表达式 | 分级 |
| :-- | :-- | :-- | :-- |
| 中国干眼调查问卷 | 13 | `sum([max(Q1,Q2), Q3..Q13])`，max 48 | 阈值：<7 无/临床前，≥7 阳性 |
| 生活方式相关干眼问卷 | 8 sections 各 2-4 题 | 无总分，`interpretations` 按作答给危险因素标签 + 生活建议 | 无 |
| 接触镜干眼问卷（CLDEQ-8） | 8（Q1a..Q5） | `sum([Q1a, mul(Q1b,2), Q2a, mul(Q2b,2), Q3a, mul(Q3b,2), Q4, Q5_converted])`，raw max 37.2，standard = raw/37.2*100 | 标准分 ≥14 有临床意义 |
| 匹兹堡睡眠问卷（PSQI） | 9 组（含 matrix Q5、numeric Q2/Q4、time Q1/Q3） | 7 个成分查表求和 → 总分 | 0-5 / 6-10 / 11-15 / 16-21 |

**PSQI 细节**：`component_scoring_rules` 里的 `q2_mapping`（入睡分钟数 → 0-3）、`sum_mapping`（Q2分+Q5a分 → 成分B）、`mapping`（Q4小时、Q5b..j 和、Q8+Q9 → 各成分）全部表达为 `lookup` 节点。习惯性睡眠效率（成分D）由时间输入 Q1/Q3 与睡眠小时 Q4 经专用 `efficiency` 节点计算后查表映射。总分 = 7 个成分的 `sum`。

## 5. 主进程

### 5.1 定义加载：`QuestionnaireDefinitionService`

- 位置：`src/main/features/questionnaire/definition/QuestionnaireDefinitionService.ts`
- 类型：非生命周期直接导入单例（`export const questionnaireDefinitionService = new QuestionnaireDefinitionService()`，符合「Non-Lifecycle Services」决策指南——只读资源加载，无长生命周期资源/副作用）。
- 数据源：`application.getPath('feature.questionnaire.definitions')` → 新增 path namespace → `path.join(appRootResources, 'questionnaire', 'definitions')`（打包只读，加入 `NO_ENSURE` 列表）。
- 启动时扫描目录下所有 `.json`，逐个 `schema.parse()`，非法定义记 `logger.error` 并跳过（不崩溃）。
- 暴露 `list()`, `get(questionnaireId)`, `getByFlow(flowQuestionnaireId)`。

### 5.2 IpcApi 路由

`src/shared/ipc/schemas/questionnaire.ts`（加入 `ipcSchemas.ts`）：
- `questionnaire.list_definitions` → 全部定义摘要列表（id/title/description）
- `questionnaire.get_definition` → 单份完整定义（按需加载，避免一次拉全部）

`src/main/ipc/handlers/questionnaire.ts` 实现。

### 5.3 会话持久化：`QuestionnaireSessionService`

- 表 `questionnaire_session`（Drizzle，`src/main/data/db/schemas/questionnaireSession.ts`）：
  - `id` (uuid PK)
  - `flowQuestionnaireId` (text, notNull) —— 流程起点问卷（中国干眼）
  - `status` (text: `'in_progress' | 'completed'`)
  - `answers` (text JSON, notNull) —— `Record<questionnaireId, Record<questionId, Answer>>`，含分支触发记录
  - `report` (text JSON, nullable) —— 完成后的完整报告
  - `createdAt`, `updatedAt` (ISO)
- DataApi schema `src/shared/data/api/schemas/questionnaires.ts`：
  - `GET /questionnaire-sessions` —— 列表（按 updatedAt 倒序）
  - `POST /questionnaire-sessions` —— 创建（status=in_progress）
  - `GET /questionnaire-sessions/:id` —— 详情
  - `PATCH /questionnaire-sessions/:id` —— 更新 answers / status / report（存草稿 + 提交共用）
  - `DELETE /questionnaire-sessions/:id` —— 删除
- 服务 `QuestionnaireSessionService`（DataApi 服务，`src/main/data/services/`）：答案/报告整体读写，JSON 列无需拆多表。

**计分在何处执行**：为保持纯逻辑可测，计分求值器在 `src/shared/questionnaire/scoring.ts`（渲染进程可调用）。主进程的 `QuestionnaireSessionService` 仅持久化；完成时报告由渲染进程调用 shared 求值器构建后 PATCH 存储。这保证计分逻辑只写一份、可在主/渲染两端测试。

## 6. 渲染进程

### 6.1 路由与侧边栏

- `src/renderer/routes/app/questionnaire.tsx` → `<QuestionnairePage />`
- `src/renderer/utils/sidebar.ts`：`SIDEBAR_APP_DEFINITIONS` 追加 `{ id: 'questionnaire', routePrefix: '/app/questionnaire' }`（无 conversationRoute，纯页面模块，类似 knowledge）
- `src/renderer/components/app/sidebarIcons.tsx`：`questionnaire: ClipboardList`（lucide）
- `src/renderer/components/layout/tabIcons.ts`：`'/app/questionnaire': ClipboardList`
- `src/renderer/i18n/label.ts` + `src/renderer/i18n/locales/zh-cn.json` / `en-US.json`：新增 `title.questionnaire` / 模块标题「问卷」
- 跑 `pnpm build:check` 重新生成 `routeTree.gen.ts`

### 6.2 页面结构 `src/renderer/pages/questionnaire/`

```
QuestionnairePage.tsx            ← 路由容器，选问卷 / 流程 / 历史
components/
  QuestionnaireCard.tsx          ← 首页问卷卡片（标题/描述/开始）
  QuestionnaireForm.tsx          ← 表单渲染器（按 question.type）
  BranchingPromptDialog.tsx      ← 命中分支规则时的确认对话框（沿用 promptMessage）
  QuestionnaireReportView.tsx    ← 完整报告视图
  SessionHistoryList.tsx         ← 历史会话列表
hooks/
  useQuestionnaireFlow.ts        ← 流程状态机：当前问卷/题目、分支触发、答案存储
lib/
  buildQuestionnaireReport.ts    ← 调 shared 求值器构建完整报告（主/渲染两端一致）
```

**流程状态机**（`useQuestionnaireFlow`）：
1. 起始问卷（flow 起点）逐题作答。
2. 每题答完，`scoring` 求值 → 命中某 `branchingRule`（如 Q1≠A → CLDEQ-8）→ 弹确认框「注意到您有接触镜佩戴相关病史，是否继续作答《接触镜干眼问卷-8》？」。
3. 用户确认 → 插入子问卷，继续作答；拒绝 → 跳过，标记分支已拒绝。
4. 目标定义不存在（IMMUNE_DRY_EYE / EMOTION_DRY_EYE 不在内置集）→ 自动跳过并记录（不打扰用户）。
5. 所有问卷答完 → 构建报告 → 保存 `status=completed`。

**报告构建**（`buildQuestionnaireReport`）：
- 每份已作答问卷：标题、逐题答案、得分、分级、建议
- 危险因素标签聚合（生活方式问卷）
- 综合摘要（结构化文本，供发送给问诊AI）
- 元数据：作答时间、涉及问卷列表

### 6.3 发送到问诊AI

复用 `feedbackComposerLaunch` 机制（`src/renderer/pages/agents/feedbackComposerLaunch.ts`），将其泛化为通用 composer launch（或为问卷新建等价小工具）：
1. 报告生成后 → 解析/复用 clinic agent 的会话（`createDefaultEmptySession` 等价逻辑）。
2. 持久化一条带报告文本的 draft launch（`writeAgentDraftCache`）。
3. 导航到 `/app/clinic?sessionId=X`，AgentPage 现有 launch 读取逻辑自动预填报告到输入框，用户确认后发送。

## 7. 错误处理

| 场景 | 处理 |
| :-- | :-- |
| 定义加载失败 / 非法 JSON | `logger.error` + 跳过该问卷；页面该问卷卡片显示不可用 |
| 必答题未答 | 提交前校验，提示未完成题目（basicInfoFields 可选字段除外） |
| 计分异常（缺选项得分） | 该问卷分数标记不可用，报告仍展示已填答案 |
| 分支目标定义缺失 | 自动跳过 + 记录，不弹窗 |
| 发送到问诊AI 时无 clinic agent | toast 提示「问诊AI 不可用，请先检查智能体配置」 |
| 会话保存失败 | toast 错误，保留本地草稿状态，可重试 |

## 8. 测试

- **计分求值器**（核心）：`src/shared/questionnaire/__tests__/scoring.test.ts` —— 对 4 份问卷各构造已知答案集 → 断言期望分数/分级。含 PSQI 查表、CLDEQ 加权与标准化、中国干眼 max+sum。
- **分支规则**：`branching.test.ts` —— 命中/跳过/目标缺失三种路径。
- **报告构建**：`report.test.ts` —— 答案+评分+建议+摘要。
- **持久化**：`QuestionnaireSessionService` 用 `setupTestDatabase()` 走真实 SQLite，验证 CRUD 与 JSON 列往返。
- **定义校验**：`definition.test.ts` —— 内置 4 份定义通过 schema 校验（防止数据回归）。
- **渲染组件**：`QuestionnaireForm.test.tsx`、`BranchingPromptDialog.test.tsx` —— 表单渲染与分支交互。

## 9. 打开问题（默认决策）

1. **basic info 敏感字段**：保留为**可选**填写，不影响提交（本地应用可接受）。如用户希望彻底移除，去掉 `basicInfoFields` 即可。
2. **缺失的子问卷**（IMMUNE_DRY_EYE / EMOTION_DRY_EYE）：规则命中时**自动跳过并记录**。
3. **数据文件组织**：`resources/questionnaire/` 现有 4 份原始 JSON 保留为参考；新增 `resources/questionnaire/definitions/` 存放统一 schema 的 4 份定义。原始文件不打包（避免冗余）。
