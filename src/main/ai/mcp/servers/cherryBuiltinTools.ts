/**
 * In-process MCP server exposing HuaTuo Studio's builtin tools to Claude Code.
 *
 * Wraps the same `webLookup` core the AI-SDK builtin tools use, so Claude Code's
 * web search/fetch run identical logic against the user's configured
 * `WebSearchService` provider. Injected by
 * `settingsBuilder` as an `sdk`-type MCP server; Claude calls these tools as
 * `mcp__cherry-tools__web_search`, `…__web_fetch`, and `…__report_artifacts`.
 *
 * These stateless builtins carry no per-agent authorization, so their handlers take
 * only `(args, signal)`. Domain tools that act on behalf of the session's agent are
 * split into sibling providers this server merely aggregates and dispatches to by
 * protocol — it stays unaware of their domain logic:
 * - {@link CherryAutonomyTools} (`…__cron`, `…__notify`, `…__config`) — schedules,
 *   notifies, and self-configures the agent.
 * - {@link CherryKnowledgeTools} (`…__kb_search`, `…__kb_read`, `…__kb_list`,
 *   `…__kb_manage`) — owns knowledge-base exposure and per-call scope authorization.
 * - {@link CherryCliTools} (`…__cli_list`, `…__cli_search`, `…__cli_install`) —
 *   delegates live discovery and approved installation to BinaryManager.
 *
 * Both act on the session's agent via the {@link CherryAgentContext} passed at
 * construction.
 */

import { loggerService } from '@logger'
import {
  fetchWeb,
  searchWeb,
  WEB_FETCH_DESCRIPTION,
  WEB_SEARCH_DESCRIPTION,
  webLookupModelOutput
} from '@main/ai/tools/webLookup'
import { isAbortError } from '@main/utils/error'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js'
import {
  REPORT_ARTIFACTS_DESCRIPTION,
  REPORT_ARTIFACTS_TOOL_NAME,
  reportArtifactsInputSchema,
  WEB_FETCH_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  webFetchInputSchema,
  webSearchInputSchema
} from '@shared/ai/builtinTools'
import * as z from 'zod'

import { type CherryAgentContext, CherryAutonomyTools } from './cherryAutonomyTools'
import { CherryCliTools } from './cherryCliTools'
import { CherryKnowledgeTools } from './cherryKnowledgeTools'

export type { CherryAgentContext }

const logger = loggerService.withContext('McpServer:CherryBuiltinTools')

type ToolModelOutput = { type: 'text'; value: string } | { type: 'json'; value: unknown }

interface ToolHandler {
  description: string
  inputSchema: z.ZodType
  // `signal` is honoured only by handlers whose core supports cancellation (web → WebSearchService).
  run: (args: unknown, signal: AbortSignal) => Promise<ToolModelOutput>
}

const HANDLERS: Record<string, ToolHandler> = {
  [WEB_SEARCH_TOOL_NAME]: {
    description: WEB_SEARCH_DESCRIPTION,
    inputSchema: webSearchInputSchema,
    run: async (args, signal) => {
      const { query } = webSearchInputSchema.parse(args)
      return webLookupModelOutput(await searchWeb(query, signal))
    }
  },
  [WEB_FETCH_TOOL_NAME]: {
    description: WEB_FETCH_DESCRIPTION,
    inputSchema: webFetchInputSchema,
    run: async (args, signal) => {
      const { urls } = webFetchInputSchema.parse(args)
      return webLookupModelOutput(await fetchWeb(urls, signal))
    }
  },
  // Pure declaration tool: the model reports its final deliverable file(s). The value lives in the
  // tool *input* — a data contract for a consumer (a renderer artifacts card) that lands in a
  // separate change; the handler only confirms.
  [REPORT_ARTIFACTS_TOOL_NAME]: {
    description: REPORT_ARTIFACTS_DESCRIPTION,
    inputSchema: reportArtifactsInputSchema,
    run: async (args) => {
      const { artifacts } = reportArtifactsInputSchema.parse(args)
      return { type: 'text', value: `Recorded ${artifacts.length} artifact(s).` }
    }
  }
}

/** Drop the `$schema` marker so strict MCP clients don't reject the advertised input schema. */
function toMcpInputSchema(schema: z.ZodType): Tool['inputSchema'] {
  const json = z.toJSONSchema(schema) as Record<string, unknown>
  delete json.$schema
  return json as Tool['inputSchema']
}

function toMcpResult(output: ToolModelOutput): CallToolResult {
  const text = output.type === 'text' ? output.value : JSON.stringify(output.value)
  return { content: [{ type: 'text', text }] }
}

function resolveHandlers(): Record<string, ToolHandler> {
  return HANDLERS
}

function resolveHandler(name: string): ToolHandler | undefined {
  return HANDLERS[name]
}

/** List the stateless builtin tools (web / report); domain tools live in their providers. */
export function listCherryBuiltinTools(): Tool[] {
  return Object.entries(resolveHandlers()).map(([name, handler]) => ({
    name,
    description: handler.description,
    inputSchema: toMcpInputSchema(handler.inputSchema)
  }))
}

export async function callCherryBuiltinTool(name: string, args: unknown, signal: AbortSignal): Promise<CallToolResult> {
  const handler = resolveHandler(name)
  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
  try {
    return toMcpResult(await handler.run(args ?? {}, signal))
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw error
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    logger.error('cherry-tools call failed', normalizedError, { tool: name })
    const message = normalizedError.message
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
  }
}

export class CherryBuiltinToolsServer {
  public mcpServer: McpServer

  constructor(agentContext: CherryAgentContext) {
    const autonomy = new CherryAutonomyTools(agentContext)
    const knowledge = new CherryKnowledgeTools(agentContext)
    const cli = new CherryCliTools()
    this.mcpServer = new McpServer({ name: 'cherry-tools', version: '1.0.0' }, { capabilities: { tools: {} } })
    this.mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [...listCherryBuiltinTools(), ...knowledge.tools(), ...autonomy.tools(), ...cli.tools()]
    }))
    this.mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const { name } = request.params
      if (cli.handles(name)) {
        return cli.call(name, request.params.arguments)
      }
      if (autonomy.handles(name)) {
        return autonomy.call(name, request.params.arguments ?? {})
      }
      if (knowledge.handles(name)) {
        return knowledge.call(name, request.params.arguments)
      }
      return callCherryBuiltinTool(name, request.params.arguments, extra.signal)
    })
  }
}

export default CherryBuiltinToolsServer
