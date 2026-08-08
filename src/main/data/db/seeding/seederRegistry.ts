import type { ISeeder } from '../types'
import { CherryAiDefaultModelSeeder } from './seeders/cherryaiDefaultModelSeeder'
import { DefaultAssistantSeeder } from './seeders/defaultAssistantSeeder'
import { LocalModelSeeder } from './seeders/LocalModelSeeder'
import { MiniAppSeeder } from './seeders/miniAppSeeder'
import { PreferenceSeeder } from './seeders/preferenceSeeder'
import { PresetAgentSeeder } from './seeders/presetAgentSeeder'
import { PresetOnlyAgentCleanupSeeder } from './seeders/presetOnlyAgentCleanupSeeder'
import { PresetProviderSeeder } from './seeders/presetProviderSeeder'
import { TranslateLanguageSeeder } from './seeders/translateLanguageSeeder'

/**
 * All seeders in execution order.
 *
 * Keep CherryAiDefaultModelSeeder before DefaultAssistantSeeder because the
 * seeded assistant references the CherryAI default model (FK to user_model).
 *
 * PresetOnlyAgentCleanupSeeder MUST stay last: it hard-deletes every non-preset
 * agent row, so the preset rows must already be seeded (and the bootstrap closed)
 * before it runs — a fresh library then needs no cleanup and keeps only the two
 * fixed agents.
 *
 * To add a new seeder: create an ISeeder class, add it to this array.
 * No changes to DbService needed.
 */
export const seeders: ISeeder[] = [
  new CherryAiDefaultModelSeeder(),
  new DefaultAssistantSeeder(),
  new PreferenceSeeder(),
  new TranslateLanguageSeeder(),
  new PresetProviderSeeder(),
  new LocalModelSeeder(),
  new MiniAppSeeder(),
  new PresetAgentSeeder(),
  new PresetOnlyAgentCleanupSeeder()
]
