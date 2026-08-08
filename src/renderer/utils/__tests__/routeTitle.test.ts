import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock i18n before importing the module
vi.mock('@renderer/i18n/resolver', () => ({
  default: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'title.pop_science': '科普AI',
        'title.clinic': '问诊AI',
        'title.knowledge': '知识库',
        'title.settings': '设置'
      }
      return translations[key] || key
    })
  }
}))

import {
  getDefaultRouteTitle,
  getRouteTitleKey,
  isPageTitledRoute,
  isTopLevelRoute,
  shouldAutoLocalizeRouteTitle
} from '../routeTitle'

describe('routeTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDefaultRouteTitle', () => {
    describe('exact route matches', () => {
      it.each([
        ['/app/pop-science', '科普AI'],
        ['/app/clinic', '问诊AI'],
        ['/app/knowledge', '知识库'],
        ['/settings', '设置']
      ])('should return correct title for %s', (url, expectedTitle) => {
        expect(getDefaultRouteTitle(url)).toBe(expectedTitle)
      })
    })

    describe('nested route matches', () => {
      it('should match base path for nested routes', () => {
        expect(getDefaultRouteTitle('/app/pop-science/session-123')).toBe('科普AI')
        expect(getDefaultRouteTitle('/app/clinic/session-456')).toBe('问诊AI')
        expect(getDefaultRouteTitle('/settings/provider')).toBe('设置')
        expect(getDefaultRouteTitle('/settings/mcp/servers')).toBe('设置')
      })
    })

    describe('URL with query params and hash', () => {
      it('should handle URLs with query parameters', () => {
        expect(getDefaultRouteTitle('/app/pop-science?sessionId=abc')).toBe('科普AI')
        expect(getDefaultRouteTitle('/app/clinic?sessionId=def')).toBe('问诊AI')
        expect(getDefaultRouteTitle('/settings/provider?id=openai')).toBe('设置')
      })

      it('should handle URLs with hash', () => {
        expect(getDefaultRouteTitle('/app/knowledge#section1')).toBe('知识库')
      })

      it('should handle URLs with both query and hash', () => {
        expect(getDefaultRouteTitle('/app/pop-science?sessionId=abc#message-5')).toBe('科普AI')
      })
    })

    describe('unknown routes', () => {
      it('should return last segment for unknown routes', () => {
        expect(getDefaultRouteTitle('/unknown')).toBe('unknown')
        expect(getDefaultRouteTitle('/app/openclaw')).toBe('openclaw')
        expect(getDefaultRouteTitle('/foo/bar/baz')).toBe('baz')
      })

      it('should return pathname for root-like unknown routes', () => {
        expect(getDefaultRouteTitle('/x')).toBe('x')
      })
    })

    describe('edge cases', () => {
      it('should handle trailing slashes', () => {
        expect(getDefaultRouteTitle('/app/pop-science/')).toBe('科普AI')
        expect(getDefaultRouteTitle('/app/clinic/')).toBe('问诊AI')
        expect(getDefaultRouteTitle('/settings/')).toBe('设置')
      })

      it('should handle double slashes (protocol-relative URL)', () => {
        // '//chat' is a protocol-relative URL, so 'chat' becomes the hostname
        // This is expected behavior per URL standard
        expect(getDefaultRouteTitle('//chat')).toBe('/')
      })

      it('should handle relative-like paths', () => {
        // URL constructor with base will normalize these
        expect(getDefaultRouteTitle('app/pop-science')).toBe('科普AI')
        expect(getDefaultRouteTitle('./app/pop-science')).toBe('科普AI')
      })
    })
  })

  describe('getRouteTitleKey', () => {
    describe('exact matches', () => {
      it.each([
        ['/app/pop-science', 'title.pop_science'],
        ['/app/clinic', 'title.clinic'],
        ['/app/knowledge', 'title.knowledge'],
        ['/settings', 'title.settings']
      ])('should return i18n key for %s', (url, expectedKey) => {
        expect(getRouteTitleKey(url)).toBe(expectedKey)
      })
    })

    describe('base path matches', () => {
      it('should return base path key for nested routes', () => {
        expect(getRouteTitleKey('/app/pop-science/session-123')).toBe('title.pop_science')
        expect(getRouteTitleKey('/app/clinic/session-456')).toBe('title.clinic')
        expect(getRouteTitleKey('/settings/provider')).toBe('title.settings')
      })
    })

    describe('unknown routes', () => {
      it('should return undefined for unknown routes', () => {
        expect(getRouteTitleKey('/unknown')).toBeUndefined()
        expect(getRouteTitleKey('/app/openclaw')).toBeUndefined()
        expect(getRouteTitleKey('/foo/bar')).toBeUndefined()
      })
    })
  })

  describe('isTopLevelRoute', () => {
    it('returns true only for bare top-level route tabs', () => {
      expect(isTopLevelRoute('/app/pop-science')).toBe(true)
      expect(isTopLevelRoute('/app/clinic')).toBe(true)
      expect(isTopLevelRoute('/app/knowledge')).toBe(true)
      expect(isTopLevelRoute('/app/pop-science?sessionId=abc&view=message')).toBe(false)
      expect(isTopLevelRoute('/app/pop-science#session')).toBe(false)
      expect(isTopLevelRoute('/app/pop-science/session-123')).toBe(false)
    })
  })

  describe('isPageTitledRoute', () => {
    it('treats fixed-agent module routes as page-titled regardless of query/sub-path', () => {
      expect(isPageTitledRoute('/app/pop-science')).toBe(true)
      expect(isPageTitledRoute('/app/pop-science?sessionId=abc')).toBe(true)
      expect(isPageTitledRoute('/app/clinic?sessionId=abc')).toBe(true)
    })

    it('treats route-titled apps as not page-titled', () => {
      expect(isPageTitledRoute('/app/knowledge')).toBe(false)
      expect(isPageTitledRoute('/settings')).toBe(false)
    })
  })

  describe('shouldAutoLocalizeRouteTitle', () => {
    it.each([
      // Top-level routes always re-localize.
      ['/app/pop-science', true],
      ['/app/clinic', true],
      ['/app/knowledge', true],
      ['/settings', true],
      // Any /settings sub-route re-localizes.
      ['/settings/provider/openai', true],
      // Unknown routes are not auto-localized.
      ['/unknown', false],
      // Non-top-level app sub-routes are not auto-localized.
      ['/app/pop-science/session-123', false],
      ['/app/clinic/session-456', false]
    ])('should return %s -> %s', (url, expected) => {
      expect(shouldAutoLocalizeRouteTitle(url)).toBe(expected)
    })
  })
})
