import type { ReactNode } from 'react'

import AgentHistoryRecords from './AgentHistoryRecords'
import type { HistoryRecordsMode } from './historyRecordsTypes'

interface HistoryRecordsViewBaseProps {
  mode: HistoryRecordsMode
  open: boolean
  activeRecordId?: string | null
  onClose: () => void
  /** Leading navbar slot (shared sidebar toggle), mirrors ConversationResourceView's toolbarLeading. */
  toolbarLeading?: ReactNode
}

interface HistoryRecordsViewProps extends HistoryRecordsViewBaseProps {
  onRecordSelect?: (sessionId: string | null) => void
}

const HistoryRecordsView = (props: HistoryRecordsViewProps) => {
  if (!props.open) return null

  return (
    <div className="flex min-h-0 flex-1 bg-card [-webkit-app-region:none]" data-testid="history-records-view">
      <AgentHistoryRecords
        activeRecordId={props.activeRecordId}
        onClose={props.onClose}
        onRecordSelect={props.onRecordSelect}
        toolbarLeading={props.toolbarLeading}
      />
    </div>
  )
}

export default HistoryRecordsView
