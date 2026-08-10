import QuestionnairePage from '@renderer/pages/questionnaire/QuestionnairePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/questionnaire')({
  component: QuestionnairePage
})
