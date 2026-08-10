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
    expect(SIDEBAR_FAVORITE_ORDER).toEqual(['pop-science', 'clinic', 'knowledge', 'questionnaire'])
  })

  it('preserves the preference order when reading ordered visible sidebar favorites', () => {
    expect(getOrderedVisibleSidebarFavorites([appFavorite('knowledge'), appFavorite('pop-science')])).toEqual([
      'clinic',
      'questionnaire',
      'knowledge',
      'pop-science'
    ])
  })

  it('sanitizes ordered visible sidebar favorites and keeps required favorites visible', () => {
    expect(
      getOrderedVisibleSidebarFavorites([
        appFavorite('knowledge'),
        { type: 'app', id: 'unknown' } as never,
        appFavorite('knowledge')
      ])
    ).toEqual(['pop-science', 'clinic', 'questionnaire', 'knowledge'])
  })

  it('ignores mini app favorites when reading system sidebar favorites', () => {
    expect(
      getOrderedVisibleSidebarFavorites([
        appFavorite('knowledge'),
        miniAppFavorite('calculator'),
        appFavorite('pop-science')
      ])
    ).toEqual(['clinic', 'questionnaire', 'knowledge', 'pop-science'])
  })

  it('returns the full mixed list interleaved in stored order with required apps forced in', () => {
    expect(getOrderedVisibleSidebarFavoriteItems([appFavorite('knowledge'), miniAppFavorite('calculator')])).toEqual([
      appFavorite('pop-science'),
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('knowledge'),
      miniAppFavorite('calculator')
    ])
  })

  it('does not prepend a required app that is already present at any position', () => {
    expect(getOrderedVisibleSidebarFavoriteItems([miniAppFavorite('calculator'), appFavorite('pop-science')])).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      miniAppFavorite('calculator'),
      appFavorite('pop-science')
    ])
  })

  it('reads mini app favorite ids from typed sidebar favorites', () => {
    expect(
      getSidebarMiniAppFavoriteIds([
        appFavorite('knowledge'),
        miniAppFavorite('calculator'),
        appFavorite('pop-science'),
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
        appFavorite('pop-science'),
        miniAppFavorite('calculator'),
        { type: 'app', id: 'unknown' } as never
      ])
    ).toEqual([appFavorite('knowledge'), miniAppFavorite('calculator'), appFavorite('pop-science')])
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
    const appWithExtra = { type: 'app', id: 'pop-science', badge: 3 } as unknown as SidebarFavoriteItem
    const miniWithExtra = { type: 'mini_app', id: 'calculator', color: '#fff' } as unknown as SidebarFavoriteItem

    expect(getSidebarFavoriteItems([appWithExtra, miniWithExtra])).toEqual([
      { type: 'app', id: 'pop-science', badge: 3 },
      { type: 'mini_app', id: 'calculator', color: '#fff' }
    ])
  })

  it('resolves menu paths for registered apps', () => {
    expect(getSidebarMenuPath('knowledge')).toBe('/app/knowledge')
    expect(getSidebarMenuPath('pop-science')).toBe('/app/pop-science')
    expect(getSidebarMenuPath('clinic')).toBe('/app/clinic')
  })

  it('resolves the active item for query-keyed conversation routes', () => {
    expect(resolveSidebarActiveItem('/app/pop-science?sessionId=xyz')).toBe('pop-science')
    expect(resolveSidebarActiveItem('/app/clinic?sessionId=xyz')).toBe('clinic')
    expect(resolveSidebarActiveItem('/app/knowledge')).toBe('knowledge')
  })

  it('does not match an unknown route as a sidebar app', () => {
    expect(resolveSidebarActiveItem('/app/mini-app')).toBe('')
    expect(resolveSidebarActiveItem('/app/chat')).toBe('')
  })

  it('classifies a message-view URL as message-only only when it carries its conversation id', () => {
    expect(isMessageOnlyConversationUrl('/app/pop-science?sessionId=session&view=message')).toBe(true)
    expect(isMessageOnlyConversationUrl('/app/clinic?sessionId=session&view=message')).toBe(true)
    // Malformed: `view=message` without an id is a bare entry, not a message-only popup.
    expect(isMessageOnlyConversationUrl('/app/pop-science?view=message')).toBe(false)
    expect(isMessageOnlyConversationUrl('/app/pop-science?sessionId=session')).toBe(false)
  })
})

describe('sidebar favorites mutations', () => {
  it('pins an app to the very end of the mixed list', () => {
    // Stored [pop-science, calculator] gains the missing required clinic/questionnaire apps at the front.
    expect(setSidebarAppPinned([appFavorite('pop-science'), miniAppFavorite('calculator')], 'knowledge', true)).toEqual(
      [
        appFavorite('clinic'),
        appFavorite('questionnaire'),
        appFavorite('pop-science'),
        miniAppFavorite('calculator'),
        appFavorite('knowledge')
      ]
    )
  })

  it('unpins an app while preserving mini apps', () => {
    // Stored [pop-science, knowledge, calculator] gains missing required clinic/questionnaire at the front.
    expect(
      setSidebarAppPinned(
        [appFavorite('pop-science'), appFavorite('knowledge'), miniAppFavorite('calculator')],
        'knowledge',
        false
      )
    ).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('pop-science'),
      miniAppFavorite('calculator')
    ])
  })

  it('never unpins a required app', () => {
    expect(
      setSidebarAppPinned(
        [appFavorite('pop-science'), appFavorite('clinic'), appFavorite('questionnaire')],
        'pop-science',
        false
      )
    ).toEqual([appFavorite('pop-science'), appFavorite('clinic'), appFavorite('questionnaire')])
  })

  it('toggles a mini app on and off, preserving apps', () => {
    const added = toggleSidebarMiniApp([appFavorite('pop-science'), miniAppFavorite('calculator')], 'weather')
    expect(added).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('pop-science'),
      miniAppFavorite('calculator'),
      miniAppFavorite('weather')
    ])
    expect(toggleSidebarMiniApp(added, 'calculator')).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('pop-science'),
      miniAppFavorite('weather')
    ])
  })

  it('removes a mini app while preserving apps and other mini apps', () => {
    // Stored [pop-science, calculator, weather] gains missing required clinic/questionnaire at the front.
    expect(
      removeSidebarMiniApp(
        [appFavorite('pop-science'), miniAppFavorite('calculator'), miniAppFavorite('weather')],
        'calculator'
      )
    ).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('pop-science'),
      miniAppFavorite('weather')
    ])
  })

  it('preserves forward-compatible unknown items when mutating favorites', () => {
    const group = {
      type: 'group',
      id: 'g1',
      name: 'Group',
      items: [miniAppFavorite('calculator')]
    } as unknown as SidebarFavoriteItem

    expect(toggleSidebarMiniApp([appFavorite('pop-science'), group], 'weather')).toEqual([
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      appFavorite('pop-science'),
      miniAppFavorite('weather'),
      group
    ])
  })
})

describe('reorderSidebarFavorites (mixed cross-type reorder)', () => {
  it('reorders apps and mini apps together into any interleaved order', () => {
    // Visible list is [pop-science, clinic, questionnaire, knowledge, calculator]; reordering
    // keeps the unrequested required clinic/questionnaire apps at the end.
    expect(
      reorderSidebarFavorites(
        [appFavorite('pop-science'), appFavorite('knowledge'), miniAppFavorite('calculator')],
        [miniAppFavorite('calculator'), appFavorite('pop-science'), appFavorite('knowledge')]
      )
    ).toEqual([
      miniAppFavorite('calculator'),
      appFavorite('pop-science'),
      appFavorite('knowledge'),
      appFavorite('clinic'),
      appFavorite('questionnaire')
    ])
  })

  it('keeps stored favorites missing from a partial order at the end', () => {
    // Visible list is [pop-science, clinic, questionnaire, calculator, stale].
    expect(
      reorderSidebarFavorites(
        [appFavorite('pop-science'), miniAppFavorite('calculator'), miniAppFavorite('stale')],
        [miniAppFavorite('calculator'), appFavorite('pop-science')]
      )
    ).toEqual([
      miniAppFavorite('calculator'),
      appFavorite('pop-science'),
      appFavorite('clinic'),
      appFavorite('questionnaire'),
      miniAppFavorite('stale')
    ])
  })

  it('drops requested items that are not stored favorites', () => {
    // Visible list is [pop-science, clinic, questionnaire, calculator].
    expect(
      reorderSidebarFavorites(
        [appFavorite('pop-science'), miniAppFavorite('calculator')],
        [miniAppFavorite('ghost'), miniAppFavorite('calculator'), appFavorite('pop-science')]
      )
    ).toEqual([
      miniAppFavorite('calculator'),
      appFavorite('pop-science'),
      appFavorite('clinic'),
      appFavorite('questionnaire')
    ])
  })

  it('keeps a required app once when the requested reorder omits it', () => {
    const reordered = reorderSidebarFavorites([appFavorite('knowledge')], [appFavorite('knowledge')])

    expect(reordered).toEqual([
      appFavorite('knowledge'),
      appFavorite('pop-science'),
      appFavorite('clinic'),
      appFavorite('questionnaire')
    ])
    expect(reordered.filter((item) => item.type === 'app' && item.id === 'pop-science')).toHaveLength(1)
    expect(reordered.filter((item) => item.type === 'app' && item.id === 'clinic')).toHaveLength(1)
    expect(reordered.filter((item) => item.type === 'app' && item.id === 'questionnaire')).toHaveLength(1)
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
    const next = reorderLaunchpadApps(['pop-science', 'knowledge'], ['knowledge', 'pop-science'])
    expect(next.slice(0, 2)).toEqual(['knowledge', 'pop-science'])
    expect([...next].sort()).toEqual([...SIDEBAR_FAVORITE_ORDER].sort())
  })

  it('drops unknown ids from a requested reorder', () => {
    const next = reorderLaunchpadApps(['pop-science', 'knowledge'], ['ghost', 'knowledge', 'pop-science'])
    expect(next.slice(0, 2)).toEqual(['knowledge', 'pop-science'])
    expect(next).not.toContain('ghost')
  })
})
