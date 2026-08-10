import { questionnaireDefinitionService } from '@main/features/questionnaire/definition/QuestionnaireDefinitionService'
import { IpcError } from '@shared/ipc/errors/IpcError'
import type { questionnaireRequestSchemas } from '@shared/ipc/schemas/questionnaire'
import type { IpcHandlersFor } from '@shared/ipc/types'

const DEFINITION_NOT_FOUND = 'QUESTIONNAIRE_DEFINITION_NOT_FOUND'

/**
 * Thin adapters for the questionnaire definition routes. These routes act on
 * bundled read-only resources, not the caller's window, so they ignore
 * `IpcContext`.
 */
export const questionnaireHandlers: IpcHandlersFor<typeof questionnaireRequestSchemas> = {
  'questionnaire.list_definitions': async () => questionnaireDefinitionService.list(),
  'questionnaire.get_definition': async ({ questionnaireId }) => {
    const def = questionnaireDefinitionService.get(questionnaireId)
    if (!def) {
      throw new IpcError(DEFINITION_NOT_FOUND, `Questionnaire definition not found: ${questionnaireId}`)
    }
    return def
  }
}
