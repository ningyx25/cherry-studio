import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  error: vi.fn()
}))

vi.mock('@data/DataApiService', () => ({
  dataApiService: { get: mocks.get, patch: mocks.patch }
}))

vi.mock('@logger', () => ({
  loggerService: { withContext: () => ({ error: mocks.error }) }
}))

const { useMessageFeedback } = await import('../useMessageFeedback')

const makeMessage = (feedback?: 'up' | 'down') =>
  ({
    id: 'message-1',
    role: 'assistant',
    topicId: 'agent-session:session-1',
    parentId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'success',
    feedback
  }) as never

describe('useMessageFeedback', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.patch.mockReset()
    mocks.error.mockReset()
    mocks.get.mockResolvedValue({ data: { parts: [{ type: 'text', text: 'hi' }] } })
    mocks.patch.mockResolvedValue({})
  })

  it('seeds from the persisted rating', () => {
    const { result } = renderHook(() => useMessageFeedback(makeMessage('up')))

    expect(result.current.feedback).toBe('up')
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('rates optimistically and merges the rating into the existing data', async () => {
    const { result } = renderHook(() => useMessageFeedback(makeMessage()))

    await act(async () => {
      await result.current.rate('up')
    })

    expect(result.current.feedback).toBe('up')
    expect(mocks.get).toHaveBeenCalledWith('/agent-sessions/session-1/messages/message-1')
    // `parts` survive the write — the PATCH body is a merge, not a replacement.
    expect(mocks.patch).toHaveBeenCalledWith('/agent-sessions/session-1/messages/message-1', {
      body: { data: { parts: [{ type: 'text', text: 'hi' }], feedback: 'up' } }
    })
  })

  it('clears the rating when the active thumb is clicked again', async () => {
    const { result } = renderHook(() => useMessageFeedback(makeMessage('up')))

    await act(async () => {
      await result.current.rate('up')
    })

    expect(result.current.feedback).toBeUndefined()
    expect(mocks.patch).toHaveBeenCalledWith('/agent-sessions/session-1/messages/message-1', {
      body: { data: { parts: [{ type: 'text', text: 'hi' }] } }
    })
  })

  it('switches side without a round trip through clear', async () => {
    const { result } = renderHook(() => useMessageFeedback(makeMessage('up')))

    await act(async () => {
      await result.current.rate('down')
    })

    expect(result.current.feedback).toBe('down')
    expect(mocks.patch).toHaveBeenCalledWith('/agent-sessions/session-1/messages/message-1', {
      body: { data: { parts: [{ type: 'text', text: 'hi' }], feedback: 'down' } }
    })
  })

  it('reverts the optimistic rating when the write fails', async () => {
    mocks.patch.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useMessageFeedback(makeMessage()))

    await act(async () => {
      await expect(result.current.rate('up')).rejects.toThrow('offline')
    })

    expect(result.current.feedback).toBeUndefined()
    expect(mocks.error).toHaveBeenCalled()
  })

  it('survives a refetch that lands mid-write', async () => {
    let resolvePatch: () => void = () => {}
    mocks.patch.mockImplementation(() => new Promise<void>((resolve) => (resolvePatch = resolve)))

    const { result, rerender } = renderHook(({ message }) => useMessageFeedback(message), {
      initialProps: { message: makeMessage() }
    })

    act(() => {
      void result.current.rate('up')
    })
    expect(result.current.feedback).toBe('up')

    // Revalidation resolves with the pre-write row while the PATCH is in flight.
    // A new message object with the same rating must not clobber the optimistic value.
    rerender({ message: makeMessage() })
    expect(result.current.feedback).toBe('up')

    await act(async () => {
      resolvePatch()
    })

    // Once settled the persisted value is authoritative.
    rerender({ message: makeMessage('up') })
    expect(result.current.feedback).toBe('up')
  })
})
