/**
 * Vitest Setup File
 * Global test configuration and mocks for @huatuostudio/ai-core package
 */

// Mock Vite SSR helper to avoid Node environment errors
;(globalThis as any).__vite_ssr_exportName__ = (_name: string, value: any) => value

// Note: @huatuostudio/ai-sdk-provider is mocked via alias in vitest.config.ts
