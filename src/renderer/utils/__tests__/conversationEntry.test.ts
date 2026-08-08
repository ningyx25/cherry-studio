import { DataApiError, ErrorCode } from '@shared/data/api/errors'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPersist: vi.fn(),
  get: vi.fn()
}))

vi.mock('@data/CacheService', () => ({
  cacheService: { getPersist: mocks.getPersist }
}))

vi.mock('@data/DataApiService', () => ({
  dataApiService: { get: mocks.get }
}))

import { resolveChatEntryTopicId, resolvePresetAgentEntrySessionId } from '@renderer/utils/conversationEntry'

const notFoundError = () => new DataApiError(ErrorCode.NOT_FOUND, 'not found', 404)

afterEach(() => {
  vi.clearAllMocks()
})

describe('resolveChatEntryTopicId', () => {
  it('resolves the last-used topic when it still exists', async () => {
    mocks.getPersist.mockReturnValue('topic-last')
    mocks.get.mockResolvedValue({ id: 'topic-last' })

    await expect(resolveChatEntryTopicId()).resolves.toBe('topic-last')
    expect(mocks.getPersist).toHaveBeenCalledWith('ui.chat.last_used_topic_id')
    expect(mocks.get).toHaveBeenCalledWith('/topics/topic-last')
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('falls through to the latest topic when the last-used topic was deleted', async () => {
    mocks.getPersist.mockReturnValue('topic-deleted')
    mocks.get.mockRejectedValueOnce(notFoundError()).mockResolvedValueOnce({ topic: { id: 'topic-latest' } })

    await expect(resolveChatEntryTopicId()).resolves.toBe('topic-latest')
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/topics/latest')
  })

  it('asks for the latest topic when nothing is remembered', async () => {
    mocks.getPersist.mockReturnValue(null)
    mocks.get.mockResolvedValue({ topic: { id: 'topic-latest' } })

    await expect(resolveChatEntryTopicId()).resolves.toBe('topic-latest')
    expect(mocks.get).toHaveBeenCalledWith('/topics/latest')
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('returns null when the library is empty', async () => {
    mocks.getPersist.mockReturnValue(null)
    mocks.get.mockResolvedValue({ topic: null })

    await expect(resolveChatEntryTopicId()).resolves.toBeNull()
  })

  it('performs a fresh latest read on each entry resolution', async () => {
    mocks.getPersist.mockReturnValue(null)
    mocks.get.mockResolvedValueOnce({ topic: { id: 'topic-first' } }).mockResolvedValueOnce({ topic: null })

    await expect(resolveChatEntryTopicId()).resolves.toBe('topic-first')
    await expect(resolveChatEntryTopicId()).resolves.toBeNull()
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })

  it('rethrows non-NOT_FOUND validation errors instead of silently rebinding', async () => {
    mocks.getPersist.mockReturnValue('topic-last')
    const serverError = new DataApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'boom', 500)
    mocks.get.mockRejectedValue(serverError)

    await expect(resolveChatEntryTopicId()).rejects.toBe(serverError)
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })
})

describe('resolvePresetAgentEntrySessionId', () => {
  it('reuses the last-used session when it belongs to the module agent', async () => {
    mocks.getPersist.mockReturnValue('session-last')
    mocks.get.mockResolvedValue({ id: 'session-last', agentId: 'pop-science' })

    await expect(resolvePresetAgentEntrySessionId('pop-science')).resolves.toBe('session-last')
    expect(mocks.getPersist).toHaveBeenCalledWith('ui.agent.last_used_session_id')
    expect(mocks.get).toHaveBeenCalledWith('/agent-sessions/session-last')
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('does not reuse the last-used session when it belongs to another agent', async () => {
    mocks.getPersist.mockReturnValue('session-last')
    mocks.get.mockResolvedValue({ id: 'session-last', agentId: 'clinic' })
    mocks.get.mockResolvedValueOnce({ id: 'session-last', agentId: 'clinic' }).mockResolvedValueOnce({
      session: { id: 'pop-session', agentId: 'pop-science' }
    })

    await expect(resolvePresetAgentEntrySessionId('pop-science')).resolves.toBe('pop-session')
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/agent-sessions/latest', { query: { agentId: 'pop-science' } })
  })

  it('falls through to the module latest session when the last-used session was deleted', async () => {
    mocks.getPersist.mockReturnValue('session-deleted')
    mocks.get.mockRejectedValueOnce(notFoundError()).mockResolvedValueOnce({
      session: { id: 'session-latest', agentId: 'pop-science' }
    })

    await expect(resolvePresetAgentEntrySessionId('pop-science')).resolves.toBe('session-latest')
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/agent-sessions/latest', { query: { agentId: 'pop-science' } })
  })

  it('returns null when the module has no sessions', async () => {
    mocks.getPersist.mockReturnValue(null)
    mocks.get.mockResolvedValue({ session: null })

    await expect(resolvePresetAgentEntrySessionId('clinic')).resolves.toBeNull()
    expect(mocks.get).toHaveBeenCalledWith('/agent-sessions/latest', { query: { agentId: 'clinic' } })
  })
})
