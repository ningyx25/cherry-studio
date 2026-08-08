import AgentPage from '@renderer/pages/agents/AgentPage'
import { parseAgentRouteSearch } from '@renderer/pages/agents/routeSearch'
import { resolvePresetAgentEntrySessionId } from '@renderer/utils/conversationEntry'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/pop-science')({
  validateSearch: (search) => parseAgentRouteSearch(search),
  // Bare entries resolve their session here, before the page mounts, so the page
  // renders the final conversation in one pass. Explicit targets and the
  // feedback entries pass through untouched. Message-only entries already
  // carry a session id; a stray `view=message` without one is still a bare entry.
  // No resolvable session → fall through bare; the page creates the first session itself.
  beforeLoad: async ({ search }) => {
    if (search.sessionId || search.intent === 'feedback') return
    const sessionId = await resolvePresetAgentEntrySessionId('pop-science')
    if (sessionId) throw redirect({ to: '/app/pop-science', search: { sessionId }, replace: true })
  },
  component: () => <AgentPage moduleId="pop-science" />
})
