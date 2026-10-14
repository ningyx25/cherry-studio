import { BASIC_INFO_QUESTIONNAIRE_ID } from '@shared/questionnaire/constants'
import type { QuestionnaireAnswers, QuestionnaireReport } from '@shared/questionnaire/types'

/** 患者一行标签（姓名 · 年龄 · 性别）：优先 report.patientInfo，回退 BASIC_INFO 原始答案；无则空串。 */
export function patientLabel(session: { report?: QuestionnaireReport | null; answers: QuestionnaireAnswers }): string {
  const info = session.report?.patientInfo
  if (info?.length) {
    const get = (label: string) => info.find((p) => p.label === label)?.value
    return [get('姓名'), get('年龄'), get('性别')].filter(Boolean).join(' · ') || ''
  }
  const basic = session.answers[BASIC_INFO_QUESTIONNAIRE_ID]
  if (basic) {
    const name = typeof basic['name'] === 'string' ? basic['name'] : undefined
    const sex = typeof basic['sex'] === 'string' ? basic['sex'] : undefined
    const age = typeof basic['age'] === 'string' ? `${basic['age']}岁` : undefined
    return [name, age, sex].filter(Boolean).join(' · ') || ''
  }
  return ''
}
