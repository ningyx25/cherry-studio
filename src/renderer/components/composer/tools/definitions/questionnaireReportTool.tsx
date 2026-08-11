import { QuestionnaireReportToolRuntime } from '@renderer/components/composer/tools/components/QuestionnaireReportTool'
import { defineTool, TopicType } from '@renderer/components/composer/tools/types'

/**
 * 问诊AI（clinic）专属工具：从历史问卷报告中选择一份，作为引用 chip 加入输入框，
 * 发送时完整报告文本（summary）内联进模型上下文——类似选择文件附件。
 */
const questionnaireReportTool = defineTool({
  key: 'questionnaire_report',
  label: '添加问卷报告',
  visibleInScopes: [TopicType.Session],
  condition: (ctx) => ctx.session?.agentId === 'clinic',
  composer: {
    runtime: ({ context }) => <QuestionnaireReportToolRuntime context={context} />
  }
})

export default questionnaireReportTool
