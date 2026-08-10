import { questionnaireSessionService } from '@data/services/QuestionnaireSessionService'
import { setupTestDatabase } from '@test-helpers/db'
import { describe, expect, it } from 'vitest'

describe('QuestionnaireSessionService', () => {
  setupTestDatabase()

  it('creates an in_progress session', () => {
    const session = questionnaireSessionService.create({ flowQuestionnaireId: 'CHINA_DRY_EYE' })
    expect(session.status).toBe('in_progress')
    expect(session.flowQuestionnaireId).toBe('CHINA_DRY_EYE')
    expect(session.answers).toEqual({})
  })

  it('updates answers and report', () => {
    const session = questionnaireSessionService.create({ flowQuestionnaireId: 'CHINA_DRY_EYE' })
    const answers = { CHINA_DRY_EYE: { Q1: 'A' } }
    const updated = questionnaireSessionService.update(session.id, { answers, status: 'completed' })
    expect(updated.answers).toEqual(answers)
    expect(updated.status).toBe('completed')
  })

  it('throws NOT_FOUND for a missing session', () => {
    expect(() => questionnaireSessionService.getById('missing')).toThrow()
  })
})
