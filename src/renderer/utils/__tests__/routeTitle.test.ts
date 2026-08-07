import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock i18n before importing the module
vi.mock('@renderer/i18n/resolver', () => ({
  default: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'title.work': '工作',
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
        ['/app/agents', '工作'],
        ['/app/knowledge', '知识库'],
        ['/settings', '设置']
      ])('should return correct title for %s', (url, expectedTitle) => {
        expect(getDefaultRouteTitle(url)).toBe(expectedTitle)
      })
    })

    describe('nested route matches', () => {
      it('should match base path for nested routes', () => {
        expect(getDefaultRouteTitle('/app/agents/session-123')).toBe('工作')
        expect(getDefaultRouteTitle('/settings/provider')).toBe('设置')
        expect(getDefaultRouteTitle('/settings/mcp/servers')).toBe('设置')
      })
    })

    describe('URL with query params and hash', () => {
      it('should handle URLs with query parameters', () => {
        expect(getDefaultRouteTitle('/app/agents?sessionId=abc')).toBe('工作')
        expect(getDefaultRouteTitle('/settings/provider?id=openai')).toBe('设置')
      })

      it('should handle URLs with hash', () => {
        expect(getDefaultRouteTitle('/app/knowledge#section1')).toBe('知识库')
      })

      it('should handle URLs with both query and hash', () => {
        expect(getDefaultRouteTitle('/app/agents?sessionId=abc#message-5')).toBe('工作')
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
        expect(getDefaultRouteTitle('/app/agents/')).toBe('工作')
        expect(getDefaultRouteTitle('/settings/')).toBe('设置')
      })

      it('should handle double slashes (protocol-relative URL)', () => {
        // '//chat' is a protocol-relative URL, so 'chat' becomes the hostname
        // This is expected behavior per URL standard
        expect(getDefaultRouteTitle('//chat')).toBe('/')
      })

      it('should handle relative-like paths', () => {
        // URL constructor with base will normalize these
        expect(getDefaultRouteTitle('app/agents')).toBe('工作')
        expect(getDefaultRouteTitle('./app/agents')).toBe('工作')
      })
    })
  })

  describe('getRouteTitleKey', () => {
    describe('exact matches', () => {
      it.each([
        ['/app/agents', 'title.work'],
        ['/app/knowledge', 'title.knowledge'],
        ['/settings', 'title.settings']
      ])('should return i18n key for %s', (url, expectedKey) => {
        expect(getRouteTitleKey(url)).toBe(expectedKey)
      })
    })

    describe('base path matches', () => {
      it('should return base path key for nested routes', () => {
        expect(getRouteTitleKey('/app/agents/session-123')).toBe('title.work')
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
      expect(isTopLevelRoute('/app/agents')).toBe(true)
      expect(isTopLevelRoute('/app/knowledge')).toBe(true)
      expect(isTopLevelRoute('/app/agents?sessionId=abc&view=message')).toBe(false)
      expect(isTopLevelRoute('/app/agents#session')).toBe(false)
      expect(isTopLevelRoute('/app/agents/session-123')).toBe(false)
    })
  })

  describe('isPageTitledRoute', () => {
    it('treats agent routes as page-titled regardless of query/sub-path', () => {
      expect(isPageTitledRoute('/app/agents')).toBe(true)
      expect(isPageTitledRoute('/app/agents?sessionId=abc')).toBe(true)
    })

    it('treats route-titled apps as not page-titled', () => {
      expect(isPageTitledRoute('/app/knowledge')).toBe(false)
      expect(isPageTitledRoute('/settings')).toBe(false)
    })
  })

  describe('shouldAutoLocalizeRouteTitle', () => {
    it.each([
      // Top-level routes always re-localize.
      ['/app/agents', true],
      ['/app/knowledge', true],
      ['/settings', true],
      // Any /settings sub-route re-localizes.
      ['/settings/provider/openai', true],
      // Unknown routes are not auto-localized.
      ['/unknown', false],
      // Non-top-level app sub-routes are not auto-localized.
      ['/app/agents/session-123', false]
    ])('should return %s -> %s', (url, expected) => {
      expect(shouldAutoLocalizeRouteTitle(url)).toBe(expected)
    })
  })
})
