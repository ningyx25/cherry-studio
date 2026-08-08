import type { ResolvedAction } from '@renderer/components/chat/actions/actionTypes'
import type { ResourceEntityRailItem } from '@renderer/components/chat/resourceList/ResourceEntityRail'
import type { AgentSessionsSource } from '@renderer/hooks/resourceViewSources'
import { popup } from '@renderer/services/popup'
import { toast } from '@renderer/services/toast'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentResourceList } from '../AgentResourceList'

const agentDataMocks = vi.hoisted(() => ({
  agents: [
    {
      id: 'agent-1',
      name: 'Agent 1',
      orderKey: 'a',
      configuration: {},
      model: 'anthropic::claude-sonnet-4',
      modelName: 'Claude Sonnet 4'
    }
  ],
  deleteAgent: vi.fn(),
  refetchAgents: vi.fn(),
  toggleAgentPin: vi.fn()
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}))

const preferenceMocks = vi.hoisted(() => ({
  setPreference: vi.fn(),
  values: new Map<string, unknown>()
}))

vi.mock('@cherrystudio/ui', () => ({
  Button: ({ children, onClick, ...props }: { children?: ReactNode; onClick?: () => void }) => (
    <button {...props} type="button" onClick={onClick}>
      {children}
    </button>
  ),
  MenuItem: ({ icon, label, onClick }: { icon?: ReactNode; label: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {icon}
      {label}
    </button>
  ),
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  MenuDivider: () => <hr />,
  MenuList: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@data/hooks/usePreference', () => ({
  usePreference: (key: string) => {
    const defaultValue = key === 'agent.session.display_mode' ? 'agent' : undefined

    return [
      preferenceMocks.values.get(key) ?? defaultValue,
      (value: unknown) => {
        preferenceMocks.values.set(key, value)
        preferenceMocks.setPreference(key, value)
      }
    ]
  }
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => loggerMocks
  }
}))

vi.mock('@renderer/components/EmojiIcon', () => ({
  default: ({ emoji }: { emoji: string }) => <span>{emoji}</span>
}))

vi.mock('@renderer/components/Avatar/ModelAvatar', () => ({
  default: () => <span data-testid="model-avatar" />
}))

vi.mock('@renderer/components/resourceCatalog/dialogs/edit', () => ({
  ResourceEditDialogHost: () => null
}))

vi.mock('@renderer/components/chat/resourceList/useResourceEntityRail', () => ({
  useResourceEntityRail: ({
    activeEntityId,
    entities
  }: {
    activeEntityId?: string | null
    entities: ResourceEntityRailItem[]
  }) => ({
    handleReorder: vi.fn(),
    handleSelect: vi.fn(),
    items: entities,
    listStatus: 'idle',
    selectedId: activeEntityId ?? null
  })
}))

vi.mock('@renderer/components/chat/resourceList/ResourceEntityRail', () => ({
  ResourceEntityRail: ({
    getContextMenuActions,
    groupByGroup,
    headerActions,
    items,
    onContextMenuAction,
    onGroupReorder,
    onReorder,
    reorderEnabled = true,
    resourceMenuItems,
    selectedId
  }: {
    getContextMenuActions?: (item: ResourceEntityRailItem) => readonly ResolvedAction[]
    groupByGroup?: boolean
    headerActions?: ReactNode
    items: readonly ResourceEntityRailItem[]
    onContextMenuAction?: (item: ResourceEntityRailItem, action: ResolvedAction) => void | Promise<void>
    onGroupReorder?: (groupId: string, anchor: { before: string }) => void | Promise<void>
    onReorder?: unknown
    reorderEnabled?: boolean
    resourceMenuItems?: readonly { active?: boolean; id: string }[]
    selectedId?: string | null
  }) => {
    const flattenActions = (actions: readonly ResolvedAction[]): readonly ResolvedAction[] =>
      actions.flatMap((action) => [action, ...flattenActions(action.children)])
    const hasActiveResourceMenuItem = resourceMenuItems?.some((item) => item.active) ?? false

    return (
      <div
        data-testid="resource-entity-rail"
        data-active-resource-menu={String(hasActiveResourceMenuItem)}
        data-group-by-group={String(!!groupByGroup)}
        data-reorder={(onReorder || onGroupReorder) && reorderEnabled ? 'enabled' : 'disabled'}
        data-item-reorder={onReorder && reorderEnabled ? 'enabled' : 'disabled'}
        data-group-reorder={onGroupReorder && reorderEnabled ? 'enabled' : 'disabled'}
        data-sortable-container={onReorder || onGroupReorder ? 'enabled' : 'disabled'}
        data-selected-id={selectedId ?? ''}>
        {headerActions}
        {items.map((item) => {
          const actions = getContextMenuActions?.(item) ?? []
          const renderedActions = flattenActions(actions)

          return (
            <section key={item.id} aria-label={item.name} title={item.tooltip}>
              {item.icon}
              <div data-testid={`${item.id}-context-menu`}>
                {renderedActions.map((action) => (
                  <button
                    key={`context-${action.id}`}
                    type="button"
                    disabled={!action.availability.enabled}
                    onClick={() => onContextMenuAction?.(item, action)}>
                    {action.label}
                  </button>
                ))}
              </div>
              <div data-testid={`${item.id}-more-menu`}>
                {renderedActions.map((action) => (
                  <button
                    key={`more-${action.id}`}
                    type="button"
                    disabled={!action.availability.enabled}
                    onClick={() => onContextMenuAction?.(item, action)}>
                    {action.label}
                  </button>
                ))}
              </div>
              {item.trailingAction}
            </section>
          )
        })}
      </div>
    )
  }
}))

vi.mock('@renderer/hooks/agent/useAgent', () => ({
  useAgents: () => ({
    agents: agentDataMocks.agents,
    deleteAgent: agentDataMocks.deleteAgent,
    error: null,
    isLoading: false,
    refetch: agentDataMocks.refetchAgents
  })
}))

vi.mock('@renderer/hooks/usePins', () => ({
  usePins: () => ({
    isLoading: false,
    isMutating: false,
    isRefreshing: false,
    pinnedIds: [],
    togglePin: agentDataMocks.toggleAgentPin
  })
}))

function createAgentSessionsSource(overrides: Partial<AgentSessionsSource> = {}): AgentSessionsSource {
  return {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteSessions: vi.fn(),
    error: null,
    hasMore: false,
    isFullyLoaded: true,
    isLoading: false,
    isLoadingAll: false,
    isLoadingMore: false,
    isPinsLoading: false,
    isValidating: false,
    loadMore: vi.fn(),
    pinIdBySessionId: new Map(),
    reload: vi.fn(),
    reorderSession: vi.fn(),
    reorderSessions: vi.fn(),
    sessions: [{ id: 'session-1', agentId: 'agent-1', name: 'Session 1' }],
    togglePin: vi.fn(),
    total: 1,
    ...overrides
  } as unknown as AgentSessionsSource
}

vi.mock('@renderer/data/hooks/useDataApi', () => ({
  useMutation: (_method: string, path: string) => ({
    trigger: path === '/agents/:agentId' ? agentDataMocks.deleteAgent : vi.fn()
  })
}))

vi.mock('@renderer/utils/chat/sessionListHelpers', () => ({
  sortSessionsForDisplayGroups: (sessions: unknown[]) => sessions
}))

vi.mock('@renderer/utils/agent', () => ({
  getAgentAvatarFromConfiguration: () => 'A'
}))

vi.mock('@renderer/utils/error', () => ({
  formatErrorMessageWithPrefix: (_error: unknown, prefix: string) => prefix
}))

describe('classic layout entity resource list actions', () => {
  beforeEach(() => {
    agentDataMocks.agents = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        orderKey: 'a',
        configuration: {},
        model: 'anthropic::claude-sonnet-4',
        modelName: 'Claude Sonnet 4'
      }
    ]
    preferenceMocks.values.clear()
    preferenceMocks.setPreference.mockClear()
    agentDataMocks.deleteAgent.mockResolvedValue({ deleted: true, deletedSessionIds: [] })
    agentDataMocks.deleteAgent.mockClear()
    agentDataMocks.refetchAgents.mockResolvedValue(undefined)
    agentDataMocks.refetchAgents.mockClear()
    agentDataMocks.toggleAgentPin.mockResolvedValue(undefined)
    agentDataMocks.toggleAgentPin.mockClear()
    loggerMocks.error.mockClear()
    loggerMocks.info.mockClear()
    loggerMocks.warn.mockClear()
  })

  it('keeps sortable rail containers mounted while refresh temporarily blocks reorder', () => {
    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource({ isValidating: true })}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    expect(screen.getByTestId('resource-entity-rail')).toHaveAttribute('data-sortable-container', 'enabled')
    expect(screen.getByTestId('resource-entity-rail')).toHaveAttribute('data-reorder', 'disabled')
  })

  it('does not report a pin failure when the post-success agent refresh fails', async () => {
    const user = userEvent.setup()
    const refreshError = new Error('transient refresh failure')
    agentDataMocks.refetchAgents.mockRejectedValueOnce(refreshError)

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    await user.click(
      within(screen.getByTestId('agent-1-context-menu')).getByRole('button', { name: 'agent.pin.title' })
    )

    await waitFor(() => expect(agentDataMocks.toggleAgentPin).toHaveBeenCalledWith('agent-1'))
    await waitFor(() =>
      expect(loggerMocks.warn).toHaveBeenCalledWith(
        'Failed to refresh agents after toggling pin from classic-layout rail',
        { agentId: 'agent-1', err: refreshError }
      )
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('reports a pin failure and skips the agent refresh when the pin mutation fails', async () => {
    const user = userEvent.setup()
    agentDataMocks.toggleAgentPin.mockRejectedValueOnce(new Error('pin mutation failed'))

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    await user.click(
      within(screen.getByTestId('agent-1-context-menu')).getByRole('button', { name: 'agent.pin.title' })
    )

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('common.error'))
    expect(agentDataMocks.refetchAgents).not.toHaveBeenCalled()
  })

  it('uses delete-agent actions for the classic layout agent context and more menus', async () => {
    const onActiveAgentDeleted = vi.fn()

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onActiveAgentDeleted={onActiveAgentDeleted}
      />
    )

    expect(screen.getByTestId('agent-1-context-menu')).toHaveTextContent('agent.delete.title')
    expect(screen.getByTestId('agent-1-more-menu')).toHaveTextContent('agent.delete.title')
    expect(screen.getByTestId('agent-1-context-menu')).not.toHaveTextContent('agent.session.agent.delete.trigger')
    expect(screen.getByTestId('agent-1-more-menu')).not.toHaveTextContent('agent.session.agent.delete.trigger')

    fireEvent.click(screen.getAllByRole('button', { name: 'agent.delete.title' })[0])

    await waitFor(() =>
      expect(popup.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'agent.delete.title' }))
    )
    await waitFor(() =>
      expect(agentDataMocks.deleteAgent).toHaveBeenCalledWith({
        params: { agentId: 'agent-1' },
        query: { deleteSessions: true }
      })
    )
    // Classic layout resets via the dedicated callback, never the draft compose.
    await waitFor(() => expect(onActiveAgentDeleted).toHaveBeenCalledWith('agent-1'))
  })

  it('deletes only tasks for the built-in Cherry Assistant in the classic layout', async () => {
    agentDataMocks.agents = [
      {
        id: 'agent-1',
        name: 'Cherry Assistant',
        orderKey: 'a',
        configuration: { builtin_role: 'assistant' },
        model: 'anthropic::claude-sonnet-4',
        modelName: 'Claude Sonnet 4'
      }
    ]
    const deleteSessions = vi.fn().mockResolvedValue({ deletedIds: ['session-1'] })
    const onActiveAgentDeleted = vi.fn()

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource({ deleteSessions })}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onActiveAgentDeleted={onActiveAgentDeleted}
      />
    )

    expect(screen.getByTestId('agent-1-context-menu')).toHaveTextContent('agent.session.agent.delete.trigger')
    expect(screen.getByTestId('agent-1-context-menu')).not.toHaveTextContent('agent.delete.title')

    fireEvent.click(screen.getAllByRole('button', { name: 'agent.session.agent.delete.trigger' })[0])

    await waitFor(() =>
      expect(popup.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'agent.session.agent.delete.title',
          content: 'agent.session.agent.delete.content'
        })
      )
    )
    await waitFor(() => expect(deleteSessions).toHaveBeenCalledWith(['session-1']))
    expect(agentDataMocks.deleteAgent).not.toHaveBeenCalled()
    expect(onActiveAgentDeleted).toHaveBeenCalledWith('agent-1')
  })

  it('creates a new session for the hovered agent row', () => {
    const onCreateSession = vi.fn()

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={onCreateSession}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'agent.session.new' }))

    expect(onCreateSession).toHaveBeenCalledWith('agent-1')
  })

  it('lets the classic agent rail switch icon display mode from the context menu', () => {
    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    expect(screen.getByTestId('agent-1-context-menu')).toHaveTextContent('agent.icon.type')

    fireEvent.click(screen.getAllByRole('button', { name: 'settings.assistant.icon.type.none' })[0])

    expect(preferenceMocks.setPreference).toHaveBeenCalledWith('agent.icon_type', 'none')
  })

  it('lets the classic agent rail switch back to the workdir session view', async () => {
    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'agent.session.display.workdir' }))

    await waitFor(() => {
      expect(preferenceMocks.setPreference).toHaveBeenCalledWith('agent.session.display_mode', 'workdir')
    })
  })

  it('keeps Skill management out of the classic agent rail display menu', () => {
    const onManageSkills = vi.fn()

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        resourceMenuItems={[
          {
            id: 'agent-resource-view',
            label: 'Manage agents',
            onSelect: vi.fn()
          },
          {
            id: 'skill-resource-view',
            label: 'Manage skills',
            onSelect: onManageSkills
          }
        ]}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: 'agent.skill.manage.title' })).not.toBeInTheDocument()
    expect(onManageSkills).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'agent.manage.title' })).toBeInTheDocument()
  })

  it('clears the active agent selection while a resource view is active', () => {
    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        resourceMenuItems={[
          {
            active: true,
            id: 'agent-resource-view',
            label: 'Manage agents',
            onSelect: vi.fn()
          }
        ]}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    expect(screen.getByTestId('resource-entity-rail')).toHaveAttribute('data-selected-id', '')
  })

  it('keeps classic agent rail history in the shared display menu without section toggles', () => {
    const onOpenHistoryRecords = vi.fn()

    render(
      <AgentResourceList
        activeAgentId="agent-1"
        agentSessionsSource={createAgentSessionsSource()}
        onOpenHistoryRecords={onOpenHistoryRecords}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'history.records.shortTitle' }))

    expect(onOpenHistoryRecords).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('agent.session.group.expand_all')).not.toBeInTheDocument()
    expect(screen.queryByText('agent.session.group.collapse_all')).not.toBeInTheDocument()
  })
})
