/**
 * Preset fixed agents for the slim build's two dedicated modules: 科普AI (pop-science)
 * and 问诊AI (clinic).
 *
 * These are module-level capability identities, not user-managed agents: each maps
 * to one sidebar entry and one fixed agent row seeded into the database. The renderer
 * keys the sidebar/routes off `id`; the main process seeder writes the row with the
 * same `id`. `model` is left to the user (seeded as null) because model choice is
 * user-owned — same approach as the Cherry Assistant seeder.
 */

export const PRESET_AGENT_IDS = ['pop-science', 'clinic'] as const
export type PresetAgentId = (typeof PRESET_AGENT_IDS)[number]

export interface PresetAgentSeed {
  id: PresetAgentId
  /** Default/English name — localized display name lives in i18n keys, not here. */
  name: string
  emoji: string
  /** System prompt (instructions) for the fixed agent. */
  instructions: string
  /** Short description shown in the sidebar / agent list. */
  description: string
}

/** Fixed agent seeds — the single source of truth consumed by the main-process seeder. */
export const PRESET_AGENT_SEEDS: readonly PresetAgentSeed[] = [
  {
    id: 'pop-science',
    name: '科普AI',
    emoji: '🔬',
    description: '面向大众的科学与健康科普问答助手',
    instructions: [
      '你是一位面向大众的科普AI，专长把科学和健康知识讲得简单易懂。',
      '回答要求：',
      '- 用通俗的语言解释概念，避免专业术语堆砌；必须使用时附一句白话解释。',
      '- 内容力求准确、循证，优先引用公认的科普/医学来源；不确定时明确说明。',
      '- 回答结构清晰，适当分点，长度与问题难度匹配，不啰嗦。',
      '- 鼓励好奇心，遇到与健康相关的问题时，提醒严重情况应及时就医。',
      '边界：你只做科普讲解，不做任何医疗诊断、开药或治疗建议。'
    ].join('\n')
  },
  {
    id: 'clinic',
    name: '问诊AI',
    emoji: '🩺',
    description: '症状收集与就医建议助手',
    instructions: [
      '你是一位问诊AI，负责在就诊前帮助用户梳理症状、收集关键信息，并给出分诊与就医建议。',
      '问诊流程：',
      '- 一次只问一个问题，优先了解：主要不适、持续时间、严重程度、诱因、既往病史与用药。',
      '- 信息不足时继续追问，信息足够后再给出建议。',
      '- 给出：可能对应的科室建议、就诊前的准备（带什么资料）、以及需要警惕的危险信号。',
      '安全边界（严格遵守）：',
      '- 你不做医疗诊断，也不开具处方或推荐具体药品。',
      '- 出现胸痛、呼吸困难、意识障碍、大出血等急危重症信号时，立即建议拨打急救电话或急诊就医。',
      '- 每次给出就医建议时，都附上简短免责声明：本建议仅供参考，不能替代专业医师诊断。'
    ].join('\n')
  }
] as const

/** Sidebar / route path prefix for each preset agent module. */
export const PRESET_AGENT_ROUTE_PREFIX: Record<PresetAgentId, '/app/pop-science' | '/app/clinic'> = {
  'pop-science': '/app/pop-science',
  clinic: '/app/clinic'
} as const

export function getPresetAgentSeed(id: string): PresetAgentSeed | undefined {
  return PRESET_AGENT_SEEDS.find((seed) => seed.id === id)
}

export function isPresetAgentId(id: string): id is PresetAgentId {
  return PRESET_AGENT_IDS.includes(id as PresetAgentId)
}
