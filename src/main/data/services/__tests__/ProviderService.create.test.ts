// Load the sibling so it self-registers in the data-service registry (prod loads it via its DataApi handler).
import '@data/services/ProviderRegistryService'

import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

// Stub the registry loader so the preset lookup returns a minimal HuaTuoIN row
// (its gemini / OpenAI endpoints tagged `huatuoin`) without reading the
// shipped providers.json, whose path is mocked away in the test harness.
vi.mock('@huatuostudio/provider-registry/node', () => {
  class RegistryLoader {
    loadProviders() {
      return [
        {
          id: 'huatuoin',
          endpointConfigs: {
            'google-generate-content': { adapterFamily: 'huatuoin', baseUrl: 'https://api.example-gateway.test' },
            'openai-responses': { adapterFamily: 'huatuoin', baseUrl: 'https://api.example-gateway.test' },
            'openai-chat-completions': { adapterFamily: 'huatuoin', baseUrl: 'https://api.example-gateway.test' }
          },
          defaultChatEndpoint: 'openai-chat-completions'
        }
      ]
    }
    loadModels() {
      return []
    }
    loadProviderModels() {
      return []
    }
    findModel() {
      return null
    }
    findOverride() {
      return null
    }
  }
  return { RegistryLoader }
})

describe('ProviderService.create — endpoint config overrides', () => {
  const dbh = setupTestDatabase()

  it('resolves adapterFamily from the preset for a preset-derived instance (custom HuaTuoIN host)', async () => {
    // Mirrors the "add HuaTuoIN instance" flow: user-entered baseUrls only, no
    // adapterFamily. Without read-time resolution the gemini endpoint resolves
    // to openai-compatible and image generation POSTs to /v1/images/generations.
    const created = providerService.create({
      providerId: 'huatuoin-express',
      presetProviderId: 'huatuoin',
      name: 'HuaTuoIn Express',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://enterprise.example-gateway.test' },
        [ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]: { baseUrl: 'https://enterprise.example-gateway.test/v1beta' },
        [ENDPOINT_TYPE.OPENAI_RESPONSES]: { baseUrl: 'https://enterprise.example-gateway.test' }
      }
    })

    // baseUrls are preserved; adapterFamily is derived.
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://enterprise.example-gateway.test/v1beta',
      adapterFamily: 'huatuoin'
    })
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('huatuoin')
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]?.adapterFamily).toBe('huatuoin')

    // The row persists only the user-owned override shape — adapterFamily is
    // registry-owned and supplied at read time, never frozen into the row.
    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'huatuoin-express'))
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://enterprise.example-gateway.test/v1beta'
    })
    expect(row.defaultChatEndpoint).toBeNull()
  })

  it('defaults endpoint families for a preset-less custom provider', async () => {
    const created = providerService.create({
      providerId: 'custom-relay',
      name: 'Custom Relay',
      defaultChatEndpoint: ENDPOINT_TYPE.ANTHROPIC_MESSAGES,
      endpointConfigs: {
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://relay.example.com' },
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://relay.example.com' }
      }
    })

    // No preset → endpoint-type defaults for both public baseUrl-only writes.
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]?.adapterFamily).toBe('anthropic')
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('openai-compatible')
  })
})
