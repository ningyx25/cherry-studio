import { useQuery } from '@data/hooks/useDataApi'
import { COMPOSER_INPUT_MAX_LENGTH } from '@renderer/components/composer/composerDraft'
import { ComposerPanelSymbol } from '@renderer/components/composer/quickPanel'
import type { ComposerToolLauncher } from '@renderer/components/composer/toolLauncher'
import type { ToolRenderContext } from '@renderer/components/composer/tools/types'
import type { QuickPanelListItem } from '@renderer/components/QuickPanel'
import { useQuickPanel } from '@renderer/components/QuickPanel'
import { toast } from '@renderer/services/toast'
import { patientLabel } from '@renderer/utils/questionnaire'
import type { QuestionnaireSession } from '@shared/data/api/schemas/questionnaires'
import { ClipboardList } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'

export const QUESTIONNAIRE_REPORT_LAUNCHER_ID = 'questionnaire-report'

type QuestionnaireReportToolContext = ToolRenderContext<readonly [], readonly []>

/** 报告标题：优先已答问卷标题，回退 flowQuestionnaireId。 */
export function reportTitle(s: QuestionnaireSession): string {
  return s.report?.answeredQuestionnaires?.[0]?.title ?? s.flowQuestionnaireId
}

/** 构建可插入的报告 summary（完整报告文本，含患者信息与 Q&A）。 */
export function reportSummary(s: QuestionnaireSession): string {
  return s.report?.summary ?? ''
}

/** 过滤出可插入的已答卷（completed 且带报告）。 */
export function filterReportSessions(sessions: readonly QuestionnaireSession[]): QuestionnaireSession[] {
  return sessions.filter((s) => s.status === 'completed' && s.report != null)
}

export function QuestionnaireReportToolRuntime({ context }: { context: QuestionnaireReportToolContext }) {
  const { launcher, t } = context
  const { isVisible, symbol, updateList } = useQuickPanel()
  const { data: sessions } = useQuery('/questionnaire-sessions')

  const panelItems = useMemo<QuickPanelListItem[]>(() => {
    const reports = filterReportSessions(sessions ?? [])
    if (reports.length === 0) {
      return [
        {
          id: 'questionnaire-report:empty',
          label: t('questionnaire.report_tool.empty'),
          icon: <ClipboardList />,
          disabled: true
        }
      ]
    }

    return reports.map((s) => {
      const title = reportTitle(s)
      const patient = patientLabel(s)
      return {
        id: `questionnaire-report:${s.id}`,
        label: title,
        description: patient
          ? `${patient} · ${new Date(s.updatedAt).toLocaleString()}`
          : new Date(s.updatedAt).toLocaleString(),
        filterText: `${title} ${patient} ${t('questionnaire.report_tool.filter_keywords')}`,
        searchAliases: t('questionnaire.report_tool.filter_keywords').split(' ').concat(['questionnaire', 'report']),
        icon: <ClipboardList />,
        action: ({ inputAdapter }) => {
          if (!inputAdapter) return
          const summary = reportSummary(s)
          const remaining = COMPOSER_INPUT_MAX_LENGTH - inputAdapter.getText().length
          if (summary.length > remaining) {
            toast.error(t('chat.input.reference_panel.no_room'))
            return
          }
          // 插入 reference token：完整报告文本作为 promptText，随消息发送时内联进模型上下文。
          if (inputAdapter.insertToken) {
            inputAdapter.insertToken({
              id: `reference:report:${s.id}`,
              kind: 'reference',
              label: title,
              description: patient ? `${title} · ${patient}` : title,
              promptText: summary,
              payload: {
                questionnaireSessionId: s.id,
                title,
                completedAt: s.report?.completedAt
              }
            })
          } else {
            inputAdapter.insertText(summary)
          }
          inputAdapter.focus()
        }
      }
    })
  }, [sessions, t])

  useEffect(() => {
    if (isVisible && symbol === ComposerPanelSymbol.QuestionnaireReport) {
      updateList(panelItems)
    }
  }, [isVisible, panelItems, symbol, updateList])

  const openQuestionnaireReportPanel = useCallback<NonNullable<ComposerToolLauncher['action']>>(
    ({ parentPanel, queryAnchor, quickPanel, triggerInfo }) => {
      quickPanel.open({
        title: t('questionnaire.report_tool.add'),
        list: panelItems,
        symbol: ComposerPanelSymbol.QuestionnaireReport,
        parentPanel,
        queryAnchor,
        triggerInfo: triggerInfo ?? { type: 'button' }
      })
    },
    [panelItems, t]
  )

  useEffect(() => {
    return launcher.registerLaunchers([
      {
        id: QUESTIONNAIRE_REPORT_LAUNCHER_ID,
        kind: 'panel',
        sources: ['root-panel', 'popover'],
        order: 75,
        label: t('questionnaire.report_tool.add'),
        description: t('questionnaire.report_tool.description'),
        icon: <ClipboardList />,
        panelSymbol: ComposerPanelSymbol.QuestionnaireReport,
        action: openQuestionnaireReportPanel
      }
    ])
  }, [launcher, openQuestionnaireReportPanel, t])

  return null
}
