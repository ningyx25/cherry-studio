import { getToolsForScope } from '@renderer/components/composer/tools/builtinTools'
import { TopicType } from '@renderer/components/composer/tools/types'
import { describe, expect, it, vi } from 'vitest'

const { mockIsReasoningModel, mockIsSupportedToolUse } = vi.hoisted(() => ({
  mockIsReasoningModel: vi.fn(),
  mockIsSupportedToolUse: vi.fn()
}))

vi.mock('@renderer/utils/model', () => ({
  isReasoningModel: (...args: unknown[]) => mockIsReasoningModel(...args)
}))

vi.mock('@renderer/utils/assistant', () => ({
  isSupportedToolUse: (...args: unknown[]) => mockIsSupportedToolUse(...args)
}))

vi.mock('@renderer/components/composer/tools/components/KnowledgeBaseButton', () => ({
  KnowledgeBaseToolRuntime: () => null
}))

vi.mock('@renderer/components/composer/tools/components/QuickPhrasesButton', () => ({
  QuickPhrasesToolRuntime: () => null
}))

vi.mock('@renderer/components/composer/tools/components/WebSearchButton', () => ({
  WebSearchToolRuntime: () => null
}))

vi.mock('@renderer/hooks/agent/useAgent', () => ({
  useAgent: () => ({ agent: undefined })
}))

vi.mock('@renderer/hooks/useMcpRuntimeStatus', () => ({
  useMcpRuntimeStatusMap: () => ({})
}))

vi.mock('@renderer/hooks/useMcpServer', () => ({
  useMcpServers: () => ({ mcpServers: [] })
}))

describe('composer tool visibility', () => {
  it('keeps assistant core capabilities discoverable when the current model cannot enable them', () => {
    mockIsReasoningModel.mockReturnValue(false)
    mockIsSupportedToolUse.mockReturnValue(false)

    const tools = getToolsForScope(TopicType.Chat, {
      assistant: {
        id: 'assistant-1',
        settings: {},
        mcpServerIds: [],
        knowledgeBaseIds: []
      } as any,
      model: {
        id: 'text-only',
        providerId: 'provider-1',
        name: 'Text only'
      } as any
    })

    expect(tools.map((tool) => tool.key)).toEqual(expect.arrayContaining(['knowledge_base']))
  })

  it('shows MCP status in chat and agent session scopes only', () => {
    const model = {
      id: 'text-only',
      providerId: 'provider-1',
      name: 'Text only'
    } as any

    expect(getToolsForScope(TopicType.Chat, { model }).map((tool) => tool.key)).toContain('mcp_status')
    expect(getToolsForScope(TopicType.Session, { model }).map((tool) => tool.key)).toContain('mcp_status')
    expect(getToolsForScope('quick-assistant', { model }).map((tool) => tool.key)).not.toContain('mcp_status')
  })

  it('makes knowledge selection discoverable in Agent Session scope', () => {
    const tools = getToolsForScope(TopicType.Session, {
      model: { id: 'agent-model', providerId: 'provider-1', name: 'Agent model' } as any,
      session: { agentId: 'agent-1', knowledgeBaseIds: [] }
    })

    expect(tools.map((tool) => tool.key)).toContain('knowledge_base')
  })

  it('scopes the questionnaire report tool to the clinic agent in Session scope', () => {
    const model = { id: 'agent-model', providerId: 'provider-1', name: 'Agent model' } as any

    // clinic agent → 工具可见
    const clinicTools = getToolsForScope(TopicType.Session, {
      model,
      session: { agentId: 'clinic' }
    })
    expect(clinicTools.map((tool) => tool.key)).toContain('questionnaire_report')

    // 其它 agent（如 pop-science）→ 工具不可见
    const otherTools = getToolsForScope(TopicType.Session, {
      model,
      session: { agentId: 'pop-science' }
    })
    expect(otherTools.map((tool) => tool.key)).not.toContain('questionnaire_report')

    // Chat scope（非 Session）→ 不可见
    const chatTools = getToolsForScope(TopicType.Chat, { model })
    expect(chatTools.map((tool) => tool.key)).not.toContain('questionnaire_report')
  })
})
