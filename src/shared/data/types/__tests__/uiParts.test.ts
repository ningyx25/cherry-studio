import type { ReasoningUIPart, TextUIPart } from 'ai'
import { describe, expect, it } from 'vitest'

import type { HuaTuoMessagePart } from '../message'
import {
  createClearContextPart,
  type DiagnosisResult,
  getKnowledgeBaseIdsFromParts,
  hasClearContextPart,
  HuaTuoErrorMetaSchema,
  HuaTuoFileMetaSchema,
  HuaTuoReasoningMetaSchema,
  HuaTuoTextMetaSchema,
  HuaTuoToolMetaSchema,
  KnowledgeScopePartDataSchema,
  readHuaTuoMeta,
  withHuaTuoMeta,
  withKnowledgeScopePart
} from '../uiParts'

const diagnosis: DiagnosisResult = {
  summary: 'OpenAI API key is invalid',
  category: 'auth',
  explanation: 'The server rejected the request because the key is invalid.',
  steps: [{ text: 'Open provider settings and check the key' }]
}

function dataErrorPart(huatuo?: Record<string, unknown>): Extract<HuaTuoMessagePart, { type: 'data-error' }> {
  return {
    type: 'data-error',
    data: { name: 'AuthError', message: 'Unauthorized' },
    ...(huatuo ? { providerMetadata: { huatuo } } : {})
  } as unknown as Extract<HuaTuoMessagePart, { type: 'data-error' }>
}

// ============================================================================
// Schema sanity — declared shape matches expectation
// ============================================================================

describe('HuaTuoTextMetaSchema', () => {
  it('accepts references as array of anything', () => {
    expect(HuaTuoTextMetaSchema.safeParse({ references: [{ category: 'citation' }] }).success).toBe(true)
    expect(HuaTuoTextMetaSchema.safeParse({}).success).toBe(true)
  })
  it('rejects references that is not an array', () => {
    expect(HuaTuoTextMetaSchema.safeParse({ references: 'not-an-array' }).success).toBe(false)
  })
})

describe('HuaTuoReasoningMetaSchema', () => {
  it('accepts thinkingMs as number', () => {
    expect(HuaTuoReasoningMetaSchema.safeParse({ thinkingMs: 1234 }).success).toBe(true)
  })
  it('accepts startedAt as number', () => {
    expect(HuaTuoReasoningMetaSchema.safeParse({ startedAt: 1780913860106 }).success).toBe(true)
  })
  it('rejects thinkingMs that is not a number', () => {
    expect(HuaTuoReasoningMetaSchema.safeParse({ thinkingMs: '1234' }).success).toBe(false)
  })
})

describe('HuaTuoToolMetaSchema', () => {
  it('accepts transport/toolName/tool', () => {
    const ok = HuaTuoToolMetaSchema.safeParse({
      transport: 'claude-agent',
      toolName: 'web_search',
      tool: { serverId: 's1', serverName: 'search', type: 'mcp' }
    })
    expect(ok.success).toBe(true)
  })
  it('rejects tool.type outside the enum', () => {
    const bad = HuaTuoToolMetaSchema.safeParse({ tool: { type: 'pluggable' } })
    expect(bad.success).toBe(false)
  })
})

describe('HuaTuoFileMetaSchema', () => {
  it('accepts fileEntryId, fileTokenSourceId, and the safe composer file kind', () => {
    const ok = HuaTuoFileMetaSchema.safeParse({
      fileEntryId: 'entry-1',
      fileTokenSourceId: 'source-1',
      composerFileKind: 'pasted-text'
    })

    expect(ok.success).toBe(true)
  })

  it('rejects non-string fileTokenSourceId', () => {
    const bad = HuaTuoFileMetaSchema.safeParse({ fileTokenSourceId: 1 })

    expect(bad.success).toBe(false)
  })

  it('rejects unsupported composer file kinds', () => {
    const bad = HuaTuoFileMetaSchema.safeParse({ composerFileKind: 'local-path' })

    expect(bad.success).toBe(false)
  })
})

describe('HuaTuoErrorMetaSchema', () => {
  it('accepts a fully-formed diagnosis and an empty object', () => {
    expect(HuaTuoErrorMetaSchema.safeParse({ diagnosis }).success).toBe(true)
    expect(HuaTuoErrorMetaSchema.safeParse({}).success).toBe(true)
  })

  it('rejects a diagnosis with a non-string summary', () => {
    expect(HuaTuoErrorMetaSchema.safeParse({ diagnosis: { ...diagnosis, summary: 42 } }).success).toBe(false)
  })

  it('rejects a diagnosis whose steps are not step objects', () => {
    expect(HuaTuoErrorMetaSchema.safeParse({ diagnosis: { ...diagnosis, steps: ['plain'] } }).success).toBe(false)
  })
})

describe('knowledge scope parts', () => {
  it('validates, deduplicates, and replaces the aggregate scope part', () => {
    const parts = withKnowledgeScopePart(
      [
        { type: 'text', text: 'hello' },
        { type: 'data-knowledge-scope', data: { baseIds: ['old'] } }
      ] as HuaTuoMessagePart[],
      ['kb-1', 'kb-2', 'kb-1']
    )

    expect(parts).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'data-knowledge-scope', data: { baseIds: ['kb-1', 'kb-2'] } }
    ])
    expect(getKnowledgeBaseIdsFromParts(parts)).toEqual(['kb-1', 'kb-2'])
  })

  it('removes the scope part when the selection is empty', () => {
    const parts = withKnowledgeScopePart(
      [
        { type: 'text', text: 'hello' },
        { type: 'data-knowledge-scope', data: { baseIds: ['kb-1'] } }
      ] as HuaTuoMessagePart[],
      []
    )

    expect(parts).toEqual([{ type: 'text', text: 'hello' }])
    expect(getKnowledgeBaseIdsFromParts(parts)).toBeUndefined()
  })

  it('rejects malformed scope data at the read boundary', () => {
    expect(KnowledgeScopePartDataSchema.safeParse({ baseIds: [''] }).success).toBe(false)
    expect(
      getKnowledgeBaseIdsFromParts([
        { type: 'data-knowledge-scope', data: { baseIds: [42] } } as unknown as HuaTuoMessagePart
      ])
    ).toBeUndefined()
  })
})

describe('clear context parts', () => {
  it('creates and detects a hidden data UI part', () => {
    const part = createClearContextPart()

    expect(part).toEqual({ type: 'data-clear', data: {} })
    expect(hasClearContextPart([{ type: 'text', text: 'before' }, part])).toBe(true)
    expect(hasClearContextPart([{ type: 'text', text: 'before' }])).toBe(false)
    expect(hasClearContextPart(undefined)).toBe(false)
  })
})

// ============================================================================
// readHuaTuoMeta — runtime validation + narrowing
// ============================================================================

describe('readHuaTuoMeta', () => {
  it('reads HuaTuoTextMeta from a TextUIPart with references', () => {
    const part: TextUIPart = {
      type: 'text',
      text: 'hi',
      providerMetadata: { huatuo: { references: [{ category: 'citation' }] } }
    }
    const meta = readHuaTuoMeta(part)
    expect(meta?.references).toEqual([{ category: 'citation' }])
  })

  it('reads HuaTuoReasoningMeta from a ReasoningUIPart with thinking metadata', () => {
    const part: ReasoningUIPart = {
      type: 'reasoning',
      text: 'thinking...',
      providerMetadata: { huatuo: { thinkingMs: 5000, startedAt: 1780913860106 } }
    }
    const meta = readHuaTuoMeta(part)
    expect(meta?.thinkingMs).toBe(5000)
    expect(meta?.startedAt).toBe(1780913860106)
  })

  it('reads HuaTuoToolMeta from a tool-foo part with transport and tool', () => {
    const part = {
      type: 'tool-fetch_url',
      toolCallId: 'tc1',
      providerMetadata: {
        huatuo: { transport: 'claude-agent', tool: { serverId: 's1', type: 'mcp' as const } }
      }
    } as unknown as HuaTuoMessagePart
    const meta = readHuaTuoMeta(part)
    expect(meta).toEqual({
      transport: 'claude-agent',
      tool: { serverId: 's1', type: 'mcp' }
    })
  })

  it('reads HuaTuoToolMeta from a dynamic-tool part', () => {
    const part = {
      type: 'dynamic-tool',
      toolName: 'x',
      toolCallId: 'tc2',
      providerMetadata: { huatuo: { transport: 'claude-agent' } }
    } as unknown as Extract<HuaTuoMessagePart, { type: 'dynamic-tool' }>
    expect(readHuaTuoMeta(part)?.transport).toBe('claude-agent')
  })

  it('reads HuaTuoFileMeta from a file part with token source id', () => {
    const part = {
      type: 'file',
      mediaType: 'application/pdf',
      url: 'file:///tmp/report.pdf',
      filename: 'report.pdf',
      providerMetadata: {
        huatuo: { fileEntryId: 'entry-1', fileTokenSourceId: 'source-1', composerFileKind: 'pasted-text' }
      }
    } as unknown as Extract<HuaTuoMessagePart, { type: 'file' }>

    expect(readHuaTuoMeta(part)).toEqual({
      fileEntryId: 'entry-1',
      fileTokenSourceId: 'source-1',
      composerFileKind: 'pasted-text'
    })
  })

  it('reads HuaTuoErrorMeta diagnosis from a data-error part', () => {
    expect(readHuaTuoMeta(dataErrorPart({ diagnosis }))?.diagnosis).toEqual(diagnosis)
  })

  it('returns undefined for a data-error part with a malformed diagnosis', () => {
    expect(readHuaTuoMeta(dataErrorPart({ diagnosis: { summary: 42 } }))).toBeUndefined()
  })

  it('returns undefined when providerMetadata is missing', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })

  it('returns undefined when huatuo is missing', () => {
    const part: TextUIPart = { type: 'text', text: '', providerMetadata: {} }
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })

  it('returns undefined when huatuo is not an object', () => {
    const part = {
      type: 'text',
      text: '',
      providerMetadata: { huatuo: 'oops' }
    } as unknown as TextUIPart
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })

  it('returns undefined for a part type without a registered schema', () => {
    const part = {
      type: 'data-translation',
      data: { content: 'x', targetLanguage: 'en' },
      providerMetadata: { huatuo: { references: [] } }
    } as unknown as HuaTuoMessagePart
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })

  it('returns undefined when references is the wrong shape', () => {
    const part = {
      type: 'text',
      text: '',
      providerMetadata: { huatuo: { references: 'oops' } }
    } as unknown as TextUIPart
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })

  it('returns undefined when thinkingMs is the wrong shape', () => {
    const part = {
      type: 'reasoning',
      text: '',
      providerMetadata: { huatuo: { thinkingMs: 'oops' } }
    } as unknown as ReasoningUIPart
    expect(readHuaTuoMeta(part)).toBeUndefined()
  })
})

// ============================================================================
// withHuaTuoMeta — typed write boundary
// ============================================================================

describe('withHuaTuoMeta', () => {
  it('writes references onto a TextUIPart', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    const next = withHuaTuoMeta(part, { references: [{ url: 'https://ex.com' }] })
    expect(next.providerMetadata?.huatuo).toEqual({ references: [{ url: 'https://ex.com' }] })
  })

  it('preserves existing huatuo fields when merging', () => {
    const part: TextUIPart = {
      type: 'text',
      text: '',
      providerMetadata: { huatuo: { references: [{ a: 1 }] } }
    }
    const next = withHuaTuoMeta(part, { references: [{ b: 2 }] })
    // shallow merge: new patch overwrites the same key
    expect(next.providerMetadata?.huatuo).toEqual({ references: [{ b: 2 }] })
  })

  it('writes thinking metadata onto a ReasoningUIPart', () => {
    const part: ReasoningUIPart = { type: 'reasoning', text: '' }
    const next = withHuaTuoMeta(part, { thinkingMs: 1234, startedAt: 1780913860106 })
    expect(next.providerMetadata?.huatuo).toEqual({ thinkingMs: 1234, startedAt: 1780913860106 })
  })

  it('writes fileTokenSourceId onto a FileUIPart', () => {
    const part = {
      type: 'file',
      mediaType: 'application/pdf',
      url: 'file:///tmp/report.pdf',
      filename: 'report.pdf'
    } as unknown as Extract<HuaTuoMessagePart, { type: 'file' }>
    const next = withHuaTuoMeta(part, { fileTokenSourceId: 'source-1' })

    expect(next.providerMetadata?.huatuo).toEqual({ fileTokenSourceId: 'source-1' })
  })

  it('round-trips a diagnosis onto a data-error part', () => {
    const next = withHuaTuoMeta(dataErrorPart(), { diagnosis })
    expect(readHuaTuoMeta(next)?.diagnosis).toEqual(diagnosis)
  })

  // ── Compile-time negatives — `tsc --noEmit` enforces these. ──────────
  it('rejects writing thinkingMs to TextUIPart at compile time', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    // @ts-expect-error thinkingMs is not on HuaTuoTextMeta
    withHuaTuoMeta(part, { thinkingMs: 1 })
    expect(true).toBe(true)
  })

  it('rejects writing references to ReasoningUIPart at compile time', () => {
    const part: ReasoningUIPart = { type: 'reasoning', text: '' }
    // @ts-expect-error references is not on HuaTuoReasoningMeta
    withHuaTuoMeta(part, { references: [] })
    expect(true).toBe(true)
  })

  it('rejects writing transport to TextUIPart at compile time', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    // @ts-expect-error transport is not on HuaTuoTextMeta
    withHuaTuoMeta(part, { transport: 'x' })
    expect(true).toBe(true)
  })
})
