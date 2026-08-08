import type { ConversationAppId } from '@renderer/types/conversation'
import { getSidebarApp, tabBelongsToApp } from '@renderer/utils/sidebar'
import { useCallback } from 'react'

import { useOptionalTabsContext } from './useTabsContext'

export function useCloseConversationTabs() {
  const tabsContext = useOptionalTabsContext()

  return useCallback(
    (appIds: readonly ConversationAppId[], keys: readonly string[]) => {
      if (!tabsContext || keys.length === 0) return

      const keySet = new Set(keys)
      const tabIds: string[] = []
      for (const tab of tabsContext.tabs) {
        if (tab.id === tabsContext.activeTabId) continue
        if (tab.type !== 'route') continue

        for (const appId of appIds) {
          const app = getSidebarApp(appId)
          if (!app?.conversationRoute || !tabBelongsToApp(app, tab.url)) continue

          const key = app.conversationRoute.keyFromUrl(tab.url)
          if (key && keySet.has(key)) {
            tabIds.push(tab.id)
            break
          }
        }
      }

      tabsContext.closeTabs(tabIds)
    },
    [tabsContext]
  )
}
