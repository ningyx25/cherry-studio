import { agentSessionService } from '@data/services/AgentSessionService'
import { loggerService } from '@logger'
import { Elysia } from 'elysia'
import * as z from 'zod'

const logger = loggerService.withContext('AgentSessionRoutes')

const ListQuerySchema = z.object({
  agentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
})

const CreateSessionBodySchema = z.object({
  agentId: z.string(),
  name: z.string().optional().default('新对话')
})

export const agentSessionRoutes = new Elysia({ prefix: '/agent-sessions' })
  .get(
    '/',
    ({ query }) => {
      try {
        const parsed = ListQuerySchema.parse(query)
        const res = agentSessionService.listByCursor({
          agentId: parsed.agentId,
          limit: parsed.limit ?? 50
        })
        return { sessions: res.items, nextCursor: res.nextCursor }
      } catch (error) {
        logger.error('Failed to list agent sessions', error as Error)
        return { sessions: [], nextCursor: undefined }
      }
    },
    { detail: { hide: true } }
  )
  .get(
    '/:id',
    ({ params }) => {
      return agentSessionService.getById(params.id)
    },
    { detail: { hide: true } }
  )
  .post(
    '/',
    ({ body }) => {
      const parsed = CreateSessionBodySchema.parse(body)
      const session = agentSessionService.create({
        agentId: parsed.agentId,
        name: parsed.name,
        workspace: { type: 'system' }
      })
      return session
    },
    { detail: { hide: true } }
  )
  .delete(
    '/:id',
    ({ params }) => {
      agentSessionService.delete(params.id)
      return { success: true }
    },
    { detail: { hide: true } }
  )
