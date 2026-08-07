import type { ReactNode } from 'react'

export type HistoryRecordsMode = 'agent'

export type HistorySourceStatus = 'all' | 'running' | 'completed' | 'failed'

/** A selectable source (assistant / agent, plus the "all" and unlinked sentinels) in the filter bar. */
export interface HistorySourceOption {
  id: string
  label: string
  icon?: ReactNode
}

/** A selectable agent-session status in the filter bar (agent mode only). */
export interface HistoryStatusOption {
  id: HistorySourceStatus
  label: string
  dotClassName?: string
}
