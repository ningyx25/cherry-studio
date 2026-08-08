import type {
  ConversationResourceMenuItem,
  ResourceListRevealRequest
} from '@renderer/components/chat/resourceList/base'
import { ConversationNavigationPane } from '@renderer/components/chat/shell/ConversationNavigationPane'
import type { AgentSessionsSource } from '@renderer/hooks/resourceViewSources'
import type { AgentSessionEntity } from '@shared/data/api/schemas/agentSessions'
import type { TopicTabPosition } from '@shared/data/preference/preferenceTypes'
import type { PresetAgentId } from '@shared/data/presets/presetAgents'

import Sessions from './components/Sessions'
import type { CreateAgentSessionDefaults } from './types'

interface AgentSidePanelProps {
  activeSessionId: string | null
  dataEnabled?: boolean
  historyRecordsActive?: boolean
  /** Fixed-agent module mode: the list is bound to one agent (科普AI / 问诊AI). */
  fixedAgentId?: PresetAgentId
  agentSessionsSource: AgentSessionsSource
  onActiveAgentDeleted?: (agentId: string) => void | Promise<void>
  onOpenHistoryRecords?: () => void
  onSetPanePosition?: (position: TopicTabPosition) => void | Promise<void>
  onCreateSession?: (
    defaults: CreateAgentSessionDefaults
  ) => AgentSessionEntity | null | void | Promise<AgentSessionEntity | null | void>
  onShowMissingAgentSelection?: () => void | Promise<void>
  panePosition?: TopicTabPosition
  revealRequest?: ResourceListRevealRequest
  resourceMenuItems?: readonly ConversationResourceMenuItem[]
  setActiveSessionId: (id: string | null, session?: AgentSessionEntity | null) => void
}

const AgentSidePanel = ({
  activeSessionId,
  dataEnabled,
  historyRecordsActive,
  fixedAgentId,
  agentSessionsSource,
  onActiveAgentDeleted,
  onOpenHistoryRecords,
  onSetPanePosition,
  onCreateSession,
  onShowMissingAgentSelection,
  panePosition,
  revealRequest,
  resourceMenuItems,
  setActiveSessionId
}: AgentSidePanelProps) => {
  return (
    <ConversationNavigationPane>
      <Sessions
        agentSessionsSource={agentSessionsSource}
        activeSessionId={activeSessionId}
        dataEnabled={dataEnabled}
        fixedAgentId={fixedAgentId}
        historyRecordsActive={historyRecordsActive}
        setActiveSessionId={setActiveSessionId}
        onActiveAgentDeleted={onActiveAgentDeleted}
        onOpenHistoryRecords={onOpenHistoryRecords}
        onSetPanePosition={onSetPanePosition}
        panePosition={panePosition}
        revealRequest={revealRequest}
        resourceMenuItems={resourceMenuItems}
        onCreateSession={onCreateSession}
        onShowMissingAgentSelection={onShowMissingAgentSelection}
      />
    </ConversationNavigationPane>
  )
}

export default AgentSidePanel
