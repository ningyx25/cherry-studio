import type { QuestionnaireSession } from '@shared/data/api/schemas/questionnaires'
import { describe, expect, it } from 'vitest'

import { filterReportSessions, patientLabel, reportSummary, reportTitle } from '../components/QuestionnaireReportTool'

const completedSession = (overrides: Partial<QuestionnaireSession> = {}): QuestionnaireSession =>
  ({
    id: 's1',
    flowQuestionnaireId: 'CHINA_DRY_EYE',
    status: 'completed',
    answers: {},
    report: {
      flowQuestionnaireId: 'CHINA_DRY_EYE',
      completedAt: '2026-08-10T00:00:00Z',
      answeredQuestionnaires: [{ questionnaireId: 'CHINA_DRY_EYE', title: '中国干眼调查问卷' }],
      questions: {},
      riskTags: [],
      summary:
        '患者基本信息：\n姓名：张三\n\n问卷流程：CHINA_DRY_EYE\n详细作答：\n【中国干眼调查问卷】\n1. 症状：回答 无',
      patientInfo: [
        { label: '姓名', value: '张三' },
        { label: '年龄', value: '45岁' }
      ]
    },
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    ...overrides
  }) as QuestionnaireSession

describe('questionnaireReportTool helpers', () => {
  it('filters to completed sessions that carry a report', () => {
    const inProgress = completedSession({ id: 's2', status: 'in_progress' })
    const noReport = completedSession({ id: 's3', report: null })
    const ok = completedSession()

    const result = filterReportSessions([inProgress, noReport, ok])
    expect(result.map((s) => s.id)).toEqual(['s1'])
  })

  it('resolves the report title from answered questionnaires, falling back to flow id', () => {
    expect(reportTitle(completedSession())).toBe('中国干眼调查问卷')
    expect(
      reportTitle(completedSession({ report: { ...completedSession().report!, answeredQuestionnaires: [] } }))
    ).toBe('CHINA_DRY_EYE')
  })

  it('builds a patient label from report.patientInfo', () => {
    expect(patientLabel(completedSession())).toBe('张三 · 45岁')
    expect(patientLabel(completedSession({ report: { ...completedSession().report!, patientInfo: [] } }))).toBe('')
  })

  it('exposes the full report summary for insertion', () => {
    expect(reportSummary(completedSession())).toContain('姓名：张三')
    expect(reportSummary(completedSession())).toContain('详细作答')
  })
})
