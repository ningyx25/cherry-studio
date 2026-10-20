import { UpdateAgentSessionMessageSchema } from '@shared/data/api/schemas/agentSessionMessages'
import type { HuaTuoMessagePart } from '@shared/data/types/message'
import { type DiagnosisResult, readHuaTuoMeta } from '@shared/data/types/uiParts'
import { describe, expect, it } from 'vitest'

import { withMessagePartDiagnosis } from '../messageDiagnosis'

const diagnosis: DiagnosisResult = {
  summary: 'OpenAI API key is invalid',
  category: 'auth',
  explanation: 'The server rejected the request because the key is invalid.',
  steps: [{ text: 'Open provider settings and check the key' }]
}

const errorParts = (): HuaTuoMessagePart[] =>
  [{ type: 'data-error', data: { name: 'AuthError', message: 'Unauthorized' } }] as unknown as HuaTuoMessagePart[]

describe('withMessagePartDiagnosis', () => {
  it('writes the diagnosis under providerMetadata.huatuo.diagnosis without mutating the input', () => {
    const parts = errorParts()
    const next = withMessagePartDiagnosis(parts, 0, diagnosis)

    expect(next).not.toBeNull()
    const updated = next![0] as { providerMetadata?: { huatuo?: { diagnosis?: unknown } } }
    expect(updated.providerMetadata?.huatuo?.diagnosis).toEqual(diagnosis)
    // original untouched
    expect('providerMetadata' in parts[0]).toBe(false)
  })

  it('returns null for an out-of-range index', () => {
    expect(withMessagePartDiagnosis(errorParts(), -1, diagnosis)).toBeNull()
    expect(withMessagePartDiagnosis(errorParts(), 5, diagnosis)).toBeNull()
  })

  it('survives the PATCH API boundary and stays readable via readHuaTuoMeta', () => {
    const next = withMessagePartDiagnosis(errorParts(), 0, diagnosis)
    expect(next).not.toBeNull()

    // The DataApi PATCH body is validated by UpdateAgentSessionMessageSchema →
    // MessageDataSchema, a shallow z.custom that must not strip huatuo meta.
    const parsed = UpdateAgentSessionMessageSchema.parse({ data: { parts: next } })
    const parsedPart = (parsed.data.parts as HuaTuoMessagePart[])[0] as Extract<
      HuaTuoMessagePart,
      { type: 'data-error' }
    >

    expect(readHuaTuoMeta(parsedPart)?.diagnosis).toEqual(diagnosis)
  })
})
