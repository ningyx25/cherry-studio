import { application } from '@application'
import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import type { ProtoProviderConfig } from '@huatuostudio/provider-registry'
import { RegistryLoader } from '@huatuostudio/provider-registry/node'
import { LOCAL_EMBEDDING_PROVIDER_ID } from '@shared/data/presets/localEmbedding'
import type { AuthConfig } from '@shared/data/types/provider'
import { eq } from 'drizzle-orm'

import type { DbType, ISeeder } from '../../types'

/**
 * Seed rows are DELTA rows: registry-owned connection config
 * (endpointConfigs, apiFeatures, defaultChatEndpoint) is NOT persisted —
 * it resolves from the registry at read time (#17096), so registry updates
 * reach existing installs without reconciliation. Only user-editable
 * scaffolding is seeded: identity, display name, and the auth shell below.
 *
 * Per the v2 invariant in `ProviderSettings/utils/provider.ts` ("Azure/Vertex/Bedrock
 * reuse other vendors' endpoint protocols, so authType is the only reliable
 * discriminator"), vendor URL routing for those providers is driven by
 * `authType` (`iam-azure` → AI SDK `createAzure`, `iam-gcp` → Vertex SDK).
 *
 * Preset rows removed from the registry are pruned here: a canonical preset
 * row (`presetProviderId === providerId`) whose id no longer exists in the
 * registry is hard-deleted (its `user_model` rows cascade). Fully custom
 * providers (`preset_provider_id` null), preset-grouped custom instances
 * (e.g. a `zai` row grouped under `zhipu`), and the LocalModelSeeder-owned
 * `local-embedding` provider are never touched.
 */
function getSeedAuthConfig(providerId: string): AuthConfig | null {
  if (providerId === 'vertexai') {
    return { type: 'iam-gcp', project: '', location: '' }
  }

  if (providerId === 'azure-openai') {
    return { type: 'iam-azure', apiVersion: '' }
  }

  if (providerId === 'aws-bedrock') {
    return { type: 'iam-aws', region: '' }
  }

  return null
}

function toDbRow(p: ProtoProviderConfig) {
  return {
    providerId: p.id,
    presetProviderId: p.presetProviderId ?? p.id,
    name: p.name,
    authConfig: getSeedAuthConfig(p.id)
  }
}

export class PresetProviderSeeder implements ISeeder {
  readonly name = 'presetProvider'
  readonly description = 'Insert preset provider configurations'

  private _loader?: RegistryLoader

  private getLoader(): RegistryLoader {
    if (!this._loader) {
      this._loader = new RegistryLoader({
        models: application.getPath('feature.provider_registry.data', 'models.json'),
        providers: application.getPath('feature.provider_registry.data', 'providers.json'),
        providerModels: application.getPath('feature.provider_registry.data', 'provider-models.json')
      })
    }
    return this._loader
  }

  get version(): string {
    return this.getLoader().getProvidersVersion()
  }

  run(db: DbType): void {
    let rawProviders: ProtoProviderConfig[]
    try {
      rawProviders = this.getLoader().loadProviders()
    } catch (error) {
      throw new Error('PresetProviderSeeder: failed to load registry providers', { cause: error })
    }

    if (rawProviders.length === 0) return

    const rows = rawProviders.map(toDbRow)

    db.transaction((tx) => {
      providerService.batchUpsertTx(tx, rows)
      pruneDroppedPresetProviders(tx, db, rawProviders)
    })
  }
}

/** See the seeder doc block: canonical preset rows dropped from the registry are pruned. */
function pruneDroppedPresetProviders(
  tx: Pick<DbType, 'select' | 'delete'>,
  db: DbType,
  registryProviders: ProtoProviderConfig[]
): void {
  const registryIds = new Set(registryProviders.map((provider) => provider.id))
  const rows = db
    .select({ providerId: userProviderTable.providerId, presetProviderId: userProviderTable.presetProviderId })
    .from(userProviderTable)
    .all()

  for (const row of rows) {
    const isCanonicalPreset = row.presetProviderId != null && row.presetProviderId === row.providerId
    // The local embedding provider is owned by LocalModelSeeder, never the
    // registry — it must survive a registry shrink.
    if (isCanonicalPreset && row.providerId !== LOCAL_EMBEDDING_PROVIDER_ID && !registryIds.has(row.providerId)) {
      tx.delete(userProviderTable).where(eq(userProviderTable.providerId, row.providerId)).run()
    }
  }
}
