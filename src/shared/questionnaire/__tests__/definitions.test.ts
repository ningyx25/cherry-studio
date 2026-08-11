import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseQuestionnaireDefinition } from '../schemas'

const DEFINITIONS_DIR = path.resolve(__dirname, '../../../../resources/questionnaire/definitions')
const FILES = ['china-dry-eye.json', 'lifestyle-dry-eye.json', 'cldeq-8.json', 'psqi.json', 'basic-info.json']

describe('built-in questionnaire definitions', () => {
  for (const file of FILES) {
    it(`parses ${file} against the unified schema`, () => {
      const raw = JSON.parse(readFileSync(path.join(DEFINITIONS_DIR, file), 'utf8'))
      const def = parseQuestionnaireDefinition(raw)
      expect(def.questionnaireId).toBeTruthy()
      expect(def.questions.length).toBeGreaterThan(0)
      if (def.scoring.standardize) {
        expect(def.scoring.standardize.divideBy).toBeGreaterThan(0)
      }
    })
  }
})
