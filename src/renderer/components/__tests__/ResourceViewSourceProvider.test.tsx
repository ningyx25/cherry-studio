import {
  ResourceViewSourceProvider,
  shouldLoadResourceViewSource
} from '@renderer/components/ResourceViewSourceProvider'
import type * as ResourceViewSourcesModule from '@renderer/hooks/resourceViewSources'
import { type AgentSessionsSource, useAgentSessionsSource } from '@renderer/hooks/resourceViewSources'
import type * as TabHooksModule from '@renderer/hooks/tab'
import type { Tab } from '@shared/data/cache/cacheValueTypes'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sourceMocks = vi.hoisted(() => ({
  tabs: [] as Tab[],
  activeTabId: null as string | null,
  agentEnabled: [] as Array<boolean | undefined>,
  agentSource: undefined as unknown
}))
const sourceProbeRenders = vi.fn()

vi.mock('@renderer/hooks/tab', async (importOriginal) => {
  const actual = await importOriginal<typeof TabHooksModule>()

  return {
    ...actual,
    useTabs: () => ({ activeTabId: sourceMocks.activeTabId, tabs: sourceMocks.tabs })
  }
})

vi.mock('@renderer/hooks/resourceViewSources', async (importOriginal) => {
  const actual = await importOriginal<typeof ResourceViewSourcesModule>()

  return {
    ...actual,
    useRawAgentSessionsSource: ({ enabled }: { enabled?: boolean } = {}) => {
      sourceMocks.agentEnabled.push(enabled)
      return sourceMocks.agentSource
    }
  }
})

function createTab(id: string, url: string, isDormant = false): Tab {
  return {
    id,
    type: 'route',
    url,
    title: id,
    isDormant
  }
}

function createAgentSource(
  ids: string[],
  {
    complete,
    refreshing = false,
    error,
    pinnedIds = []
  }: {
    complete: boolean
    refreshing?: boolean
    error?: Error
    pinnedIds?: string[]
  }
): AgentSessionsSource {
  const sessions = ids.map((id) => ({ id }))

  return {
    sessions,
    pinIdBySessionId: new Map(pinnedIds.map((id) => [id, `pin-${id}`])),
    total: sessions.length,
    hasMore: !complete,
    error,
    isLoading: ids.length === 0,
    isLoadingMore: !complete && ids.length > 0,
    isValidating: refreshing,
    reload: vi.fn(),
    loadMore: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteSessions: vi.fn(),
    reorderSession: vi.fn(),
    reorderSessions: vi.fn(),
    togglePin: vi.fn(),
    isFullyLoaded: complete,
    isLoadingAll: !complete,
    isPinsLoading: false
  } as unknown as AgentSessionsSource
}

function SourceProbe() {
  sourceProbeRenders()
  const sessionsSource = useAgentSessionsSource()

  return (
    <>
      <span data-testid="session-ids">{sessionsSource.sessions.map((session) => session.id).join(',')}</span>
      <span data-testid="sessions-loading">{String(sessionsSource.isLoadingAll)}</span>
      <span data-testid="sessions-refreshing">{String(sessionsSource.isValidating)}</span>
      <span data-testid="sessions-error">{String(Boolean(sessionsSource.error))}</span>
      <span data-testid="sessions-refresh-error">{String(Boolean(sessionsSource.refreshError))}</span>
      <span data-testid="session-pins">{[...sessionsSource.pinIdBySessionId.keys()].join(',')}</span>
    </>
  )
}

const createProviderTree = () => (
  <ResourceViewSourceProvider>
    <SourceProbe />
  </ResourceViewSourceProvider>
)

describe('ResourceViewSourceProvider', () => {
  beforeEach(() => {
    sourceMocks.tabs = []
    sourceMocks.activeTabId = null
    sourceMocks.agentEnabled = []
    sourceMocks.agentSource = createAgentSource([], { complete: false })
    sourceProbeRenders.mockClear()
  })

  it('publishes progressive agent sessions on cold start and keeps the complete snapshot during refresh', async () => {
    sourceMocks.tabs = [createTab('agent', '/app/agents')]
    sourceMocks.activeTabId = 'agent'
    sourceMocks.agentSource = createAgentSource(['session-partial'], { complete: false })

    const { rerender } = render(createProviderTree())

    expect(screen.getByTestId('session-ids')).toHaveTextContent('session-partial')
    expect(screen.getByTestId('sessions-loading')).toHaveTextContent('true')

    sourceMocks.agentSource = createAgentSource(['session-1', 'session-2'], { complete: true })
    rerender(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1,session-2'))

    sourceMocks.agentSource = createAgentSource(['replacement-partial'], {
      complete: false,
      refreshing: true,
      error: new Error('refresh failed')
    })
    rerender(createProviderTree())

    expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1,session-2')
    expect(screen.getByTestId('sessions-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('sessions-refreshing')).toHaveTextContent('true')
  })

  it('stops reporting refreshing when a failed background refresh goes idle', async () => {
    sourceMocks.tabs = [createTab('agent', '/app/agents')]
    sourceMocks.activeTabId = 'agent'
    sourceMocks.agentSource = createAgentSource(['session-1'], { complete: true })

    const { rerender } = render(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1'))

    // A mid-chain load-all failure leaves the source incomplete and idle. The
    // stale snapshot stays published, but the refreshing flag must clear so
    // consumers (e.g. reorder gating) do not hang on it indefinitely.
    sourceMocks.agentSource = createAgentSource(['replacement-partial'], {
      complete: false,
      refreshing: false,
      error: new Error('refresh failed')
    })
    rerender(createProviderTree())

    expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1')
    expect(screen.getByTestId('sessions-refreshing')).toHaveTextContent('false')
  })

  it('does not publish another snapshot when a refresh resolves to the same references', async () => {
    sourceMocks.tabs = [createTab('agent', '/app/agents')]
    sourceMocks.activeTabId = 'agent'
    const agentSource = createAgentSource(['session-1'], { complete: true })
    sourceMocks.agentSource = agentSource

    const { rerender } = render(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1'))

    sourceMocks.agentSource = { ...agentSource, isFullyLoaded: false, isValidating: true }
    rerender(createProviderTree())

    sourceProbeRenders.mockClear()
    sourceMocks.agentSource = agentSource
    rerender(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('sessions-refreshing')).toHaveTextContent('false'))
    expect(sourceProbeRenders).toHaveBeenCalledTimes(1)
  })

  it('reports a failed background refresh without tearing down the stale snapshot', async () => {
    sourceMocks.tabs = [createTab('agent', '/app/agents')]
    sourceMocks.activeTabId = 'agent'
    sourceMocks.agentSource = createAgentSource(['session-1'], { complete: true })

    const { rerender } = render(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1'))
    expect(screen.getByTestId('sessions-error')).toHaveTextContent('false')

    sourceMocks.agentSource = createAgentSource(['replacement-partial'], {
      complete: false,
      error: new Error('refresh failed')
    })
    rerender(createProviderTree())

    // `error` stays clear so the list is not replaced by an error panel, but
    // the failure has to reach consumers somehow — nothing retries on its own.
    expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1')
    expect(screen.getByTestId('sessions-error')).toHaveTextContent('false')
    expect(screen.getByTestId('sessions-refresh-error')).toHaveTextContent('true')
  })

  it('keeps the published pin state in step with the map togglePin acts on', async () => {
    sourceMocks.tabs = [createTab('agent', '/app/agents')]
    sourceMocks.activeTabId = 'agent'
    sourceMocks.agentSource = createAgentSource(['session-1', 'session-2'], { complete: true })

    const { rerender } = render(createProviderTree())

    await waitFor(() => expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1,session-2'))
    expect(screen.getByTestId('session-pins')).toHaveTextContent('')

    // The pin lands, then the session refresh fails and freezes the snapshot.
    // `togglePin` reads the raw map, so a published snapshot pin state would
    // make the row's button do the opposite of its label on the next click.
    sourceMocks.agentSource = createAgentSource(['session-1', 'session-2'], {
      complete: false,
      error: new Error('refresh failed'),
      pinnedIds: ['session-1']
    })
    rerender(createProviderTree())

    expect(screen.getByTestId('session-ids')).toHaveTextContent('session-1,session-2')
    expect(screen.getByTestId('sessions-refresh-error')).toHaveTextContent('true')
    expect(screen.getByTestId('session-pins')).toHaveTextContent('session-1')
  })

  it('loads only the source owned by the active non-dormant, non-message-only route tab', () => {
    sourceMocks.tabs = [
      createTab('agent-message', '/app/agents?sessionId=session-1&view=message'),
      createTab('agent-dormant', '/app/agents?sessionId=session-2', true),
      createTab('agent', '/app/agents?sessionId=session-3')
    ]
    sourceMocks.activeTabId = 'agent'

    render(createProviderTree())

    expect(sourceMocks.agentEnabled.at(-1)).toBe(true)
    expect(
      shouldLoadResourceViewSource(
        [createTab('malformed-message', '/app/agents?view=message')],
        'malformed-message',
        'agents'
      )
    ).toBe(true)
  })
})
