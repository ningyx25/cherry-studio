import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseQuestionnaireDefinition } from '../schemas'
import { evaluateScore } from '../scoring'

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

  it('scores china-dry-eye multi_choice questions by selected subItem count (Q5/Q6/Q7 regression)', () => {
    const raw = JSON.parse(readFileSync(path.join(DEFINITIONS_DIR, 'china-dry-eye.json'), 'utf8'))
    const def = parseQuestionnaireDefinition(raw)
    const expr = def.scoring.expression
    // 勾 2 个部位 + Q1 选 B(1分)：总分 = max(1,0) + 0 + 0 + 2(Q5) = 3
    const answers = { Q1: 'B', Q2: 'A', Q5: ['鼻子', '嘴巴'] }
    expect(evaluateScore(def, expr, answers)).toBe(3)
    // 只勾「无」→ Q5 计 0 分
    expect(evaluateScore(def, { kind: 'count', question: 'Q5' }, { Q5: ['无'] })).toBe(0)
  })
})
