import type { SidebarFavorite, SidebarFavoriteItem } from '@shared/data/preference/preferenceTypes'
import { describe, expect, it } from 'vitest'

import {
  getOrderedLaunchpadApps,
  getOrderedVisibleSidebarFavoriteItems,
  getOrderedVisibleSidebarFavorites,
  getSidebarFavoriteItems,
  getSidebarMenuPath,
  getSidebarMiniAppFavoriteIds,
  isMessageOnlyConversationUrl,
  removeSidebarMiniApp,
  reorderLaunchpadApps,
  reorderSidebarFavorites,
  resolveSidebarActiveItem,
  setSidebarAppPinned,
  SIDEBAR_FAVORITE_ORDER,
  toggleSidebarMiniApp
} from '../sidebar'

const appFavorite = (id: SidebarFavorite): SidebarFavoriteItem => ({ type: 'app', id })
const miniAppFavorite = (id: string): SidebarFavoriteItem => ({ type: 'mini_app', id })

describe('sidebar config helpers', () => {
  it('keeps the fixed sidebar app order available', () => {
    expect(SIDEBAR_FAVORITE_ORDER).toEqual(['agents', 'knowledge'])
  })

  it('preserves the preference order when reading ordered visible sidebar favorites', () => {
    expect(getOrderedVisibleSidebarFavorites([appFavorite('knowledge'), appFavorite('agents')])).toEqual([
      'knowledge',
      'agents'
    ])
  })

  it('sanitizes ordered visible sidebar favorites and keeps required favorites visible', () => {
    expect(
      getOrderedVisibleSidebarFavorites([
        appFavorite('knowledge'),
        { type: 'app', id: 'unknown' } as never,
        appFavorite('knowledge')
      ])
    ).toEqual(['agents', 'knowledge'])
  })

  it('ignores mini app favorites when reading system sidebar favorites', () => {
    expect(
      getOrderedVisibleSidebarFavorites([
        appFavorite('knowledge'),
        miniAppFavorite('calculator'),
        appFavorite('agents')
      ])
    ).toEqual(['knowledge', 'agents'])
  })

  it('returns the full mixed list interleaved in stored order with required apps forced in', () => {
    expect(getOrderedVisibleSidebarFavoriteItems([appFavorite('knowledge'), miniAppFavorite('calculator')])).toEqual([
      appFavorite('agents'),
      appFavorite('knowledge'),
      miniAppFavorite('calculator')
    ])
  })

  it('does not prepend a required app that is already present at any position', () => {
    expect(getOrderedVisibleSidebarFavoriteItems([miniAppFavorite('calculator'), appFavorite('agents')])).toEqual([
      miniAppFavorite('calculator'),
      appFavorite('agents')
    ])
  })

  it('reads mini app favorite ids from typed sidebar favorites', () => {
    expect(
      getSidebarMiniAppFavoriteIds([
        appFavorite('knowledge'),
        miniAppFavorite('calculator'),
        appFavorite('agents'),
        miniAppFavorite('calculator'),
        miniAppFavorite('weather')
      ])
    ).toEqual(['calculator', 'weather'])
  })

  it('dedupes favorites and drops unknown app favorites', () => {
    expect(
      getSidebarFavoriteItems([
        appFavorite('knowledge'),
        miniAppFavorite('calculator'),
        appFavorite('agents'),
        miniAppFavorite('calculator'),
        { type: 'app', id: 'unknown' } as never
      ])
    ).toEqual([appFavorite('knowledge'), miniAppFavorite('calculator'), appFavorite('agents')])
  })

  it('drops unknown favorite types from visible reads while keeping surrounding leaves', () => {
    const group = { type: 'group', id: 'g1', name: 'Group', items: [] } as unknown as SidebarFavoriteItem

    expect(getSidebarFavoriteItems([appFavorite('knowledge'), group, miniAppFavorite('calculator')])).toEqual([
      appFavorite('knowledge'),
      miniAppFavorite('calculator')
    ])
  })

  it('preserves extra per-item fields through normalization (non-lossy round-trip)', () => {
    // Future per-item params must survive the normalize round-trip instead of being
    // rebuilt away from just the id.
    const appWithExtra = { type: 'app', id: 'agents', badge: 3 } as unknown as SidebarFavoriteItem
    const miniWithExtra = { type: 'mini_app', id: 'calculator', color: '#fff' } as unknown as SidebarFavoriteItem

    expect(getSidebarFavoriteItems([appWithExtra, miniWithExtra])).toEqual([
      { type: 'app', id: 'agents', badge: 3 },
      { type: 'mini_app', id: 'calculator', color: '#fff' }
    ])
  })

  it('resolves menu paths for registered apps', () => {
    expect(getSidebarMenuPath('knowledge')).toBe('/app/knowledge')
    expect(getSidebarMenuPath('agents')).toBe('/app/agents')
  })

  it('resolves the active item for query-keyed conversation routes', () => {
    expect(resolveSidebarActiveItem('/app/agents?sessionId=xyz')).toBe('agents')
    expect(resolveSidebarActiveItem('/app/knowledge')).toBe('knowledge')
  })

  it('does not match an unknown route as a sidebar app', () => {
    expect(resolveSidebarActiveItem('/app/mini-app')).toBe('')
    expect(resolveSidebarActiveItem('/app/chat')).toBe('')
  })

  it('classifies a message-view URL as message-only only when it carries its conversation id', () => {
    expect(isMessageOnlyConversationUrl('/app/agents?sessionId=session&view=message')).toBe(true)
    // Malformed: `view=message` without an id is a bare entry, not a message-only popup.
    expect(isMessageOnlyConversationUrl('/app/agents?view=message')).toBe(false)
    expect(isMessageOnlyConversationUrl('/app/agents?sessionId=session')).toBe(false)
  })
})

describe('sidebar favorites mutations', () => {
  it('pins an app to the very end of the mixed list', () => {
    expect(setSidebarAppPinned([appFavorite('agents'), miniAppFavorite('calculator')], 'knowledge', true)).toEqual([
      appFavorite('agents'),
      miniAppFavorite('calculator'),
      appFavorite('knowledge')
    ])
  })

  it('unpins an app while preserving mini apps', () => {
    expect(
      setSidebarAppPinned(
        [appFavorite('agents'), appFavorite('knowledge'), miniAppFavorite('calculator')],
        'knowledge',
        false
      )
    ).toEqual([appFavorite('agents'), miniAppFavorite('calculator')])
  })

  it('never unpins a required app', () => {
    expect(setSidebarAppPinned([appFavorite('agents'), appFavorite('knowledge')], 'agents', false)).toEqual([
      appFavorite('agents'),
      appFavorite('knowledge')
    ])
  })

  it('toggles a mini app on and off, preserving apps', () => {
    const added = toggleSidebarMiniApp([appFavorite('agents'), miniAppFavorite('calculator')], 'weather')
    expect(added).toEqual([appFavorite('agents'), miniAppFavorite('calculator'), miniAppFavorite('weather')])
    expect(toggleSidebarMiniApp(added, 'calculator')).toEqual([appFavorite('agents'), miniAppFavorite('weather')])
  })

  it('removes a mini app while preserving apps and other mini apps', () => {
    expect(
      removeSidebarMiniApp(
        [appFavorite('agents'), miniAppFavorite('calculator'), miniAppFavorite('weather')],
        'calculator'
      )
    ).toEqual([appFavorite('agents'), miniAppFavorite('weather')])
  })

  it('preserves forward-compatible unknown items when mutating favorites', () => {
    const group = {
      type: 'group',
      id: 'g1',
      name: 'Group',
      items: [miniAppFavorite('calculator')]
    } as unknown as SidebarFavoriteItem

    expect(toggleSidebarMiniApp([appFavorite('agents'), group], 'weather')).toEqual([
      appFavorite('agents'),
      miniAppFavorite('weather'),
      group
    ])
  })
})

describe('reorderSidebarFavorites (mixed cross-type reorder)', () => {
  it('reorders apps and mini apps together into any interleaved order', () => {
    expect(
      reorderSidebarFavorites(
        [appFavorite('agents'), appFavorite('knowledge'), miniAppFavorite('calculator')],
        [miniAppFavorite('calculator'), appFavorite('agents'), appFavorite('knowledge')]
      )
    ).toEqual([miniAppFavorite('calculator'), appFavorite('agents'), appFavorite('knowledge')])
  })

  it('keeps stored favorites missing from a partial order at the end', () => {
    expect(
      reorderSidebarFavorites(
        [appFavorite('agents'), miniAppFavorite('calculator'), miniAppFavorite('stale')],
        [miniAppFavorite('calculator'), appFavorite('agents')]
      )
    ).toEqual([miniAppFavorite('calculator'), appFavorite('agents'), miniAppFavorite('stale')])
  })

  it('drops requested items that are not stored favorites', () => {
    expect(
      reorderSidebarFavorites(
        [appFavorite('agents'), miniAppFavorite('calculator')],
        [miniAppFavorite('ghost'), miniAppFavorite('calculator'), appFavorite('agents')]
      )
    ).toEqual([miniAppFavorite('calculator'), appFavorite('agents')])
  })

  it('keeps a required app once when the requested reorder omits it', () => {
    const reordered = reorderSidebarFavorites([appFavorite('knowledge')], [appFavorite('knowledge')])

    expect(reordered).toEqual([appFavorite('knowledge'), appFavorite('agents')])
    expect(reordered.filter((item) => item.type === 'app' && item.id === 'agents')).toHaveLength(1)
  })
})

describe('launchpad app order (independent from sidebar favorites)', () => {
  it('falls back to the canonical order when the store is empty', () => {
    expect(getOrderedLaunchpadApps(undefined)).toEqual(SIDEBAR_FAVORITE_ORDER)
    expect(getOrderedLaunchpadApps([])).toEqual(SIDEBAR_FAVORITE_ORDER)
  })

  it('keeps the stored order first and appends missing apps in canonical order', () => {
    const ordered = getOrderedLaunchpadApps(['knowledge'])
    expect(ordered.slice(0, 1)).toEqual(['knowledge'])
    expect([...ordered].sort()).toEqual([...SIDEBAR_FAVORITE_ORDER].sort())
    expect(new Set(ordered).size).toBe(ordered.length)
  })

  it('drops unknown and duplicate stored ids', () => {
    const ordered = getOrderedLaunchpadApps(['knowledge', 'ghost', 'knowledge'])
    expect(ordered.slice(0, 1)).toEqual(['knowledge'])
    expect(ordered).not.toContain('ghost')
    expect(new Set(ordered).size).toBe(ordered.length)
  })

  it('reorders to the requested order and keeps missing apps at the end', () => {
    const next = reorderLaunchpadApps(['agents', 'knowledge'], ['knowledge', 'agents'])
    expect(next.slice(0, 2)).toEqual(['knowledge', 'agents'])
    expect([...next].sort()).toEqual([...SIDEBAR_FAVORITE_ORDER].sort())
  })

  it('drops unknown ids from a requested reorder', () => {
    const next = reorderLaunchpadApps(['agents', 'knowledge'], ['ghost', 'knowledge', 'agents'])
    expect(next.slice(0, 2)).toEqual(['knowledge', 'agents'])
    expect(next).not.toContain('ghost')
  })
})
