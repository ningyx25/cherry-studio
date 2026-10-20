import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js'
import { ContentBlockSchema } from '@modelcontextprotocol/sdk/types.js'
import type { McpServer } from '@shared/data/types/mcpServer'

export const BuiltinMcpServerNames = {
  flomo: '@huatuo/flomo',
  mcpAutoInstall: '@huatuo/mcp-auto-install',
  memory: '@huatuo/memory',
  sequentialThinking: '@huatuo/sequentialthinking',
  braveSearch: '@huatuo/brave-search',
  fetch: '@huatuo/fetch',
  filesystem: '@huatuo/filesystem',
  difyKnowledge: '@huatuo/dify-knowledge',
  python: '@huatuo/python',
  didiMcp: '@huatuo/didi-mcp',
  browser: '@huatuo/browser',
  nowledgeMem: '@huatuo/nowledge-mem',
  hub: '@huatuo/hub'
} as const

export type BuiltinMcpServerName = (typeof BuiltinMcpServerNames)[keyof typeof BuiltinMcpServerNames]

export const BuiltinMcpServerNamesArray = Object.values(BuiltinMcpServerNames)

export const isBuiltinMcpServerName = (name: string): name is BuiltinMcpServerName => {
  return BuiltinMcpServerNamesArray.some((n) => n === name)
}

export type BuiltinMcpServer = McpServer & {
  type: 'inMemory' | 'stdio'
  name: BuiltinMcpServerName
}

export const isInMemoryBuiltinMcpServer = (server: McpServer): server is BuiltinMcpServer & { type: 'inMemory' } => {
  return server.type === 'inMemory' && isBuiltinMcpServerName(server.name)
}

/**
 * Spec-aligned guard for a single MCP `CallToolResult` content block
 * (text / image / audio / resource_link / embedded resource).
 */
export const isMcpContentBlock = (value: unknown): value is ContentBlock => {
  return ContentBlockSchema.safeParse(value).success
}
