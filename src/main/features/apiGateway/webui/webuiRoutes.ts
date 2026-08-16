import { application } from '@application'
import { Elysia } from 'elysia'

import { renderWebUiHtml } from './webuiHtml'

function getGatewayApiKey(): string {
  try {
    return application.get('PreferenceService').get('feature.api_gateway.api_key') || ''
  } catch {
    return ''
  }
}

/**
 * WebUI route plugin for Elysia.
 * Serves the Single-Page Application (SPA) at `/web` and `/web/`.
 */
export const webuiRoutes = new Elysia()
  .get(
    '/web',
    () => {
      return new Response(renderWebUiHtml(getGatewayApiKey()), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    },
    { detail: { hide: true } }
  )
  .get(
    '/web/',
    () => {
      return new Response(renderWebUiHtml(getGatewayApiKey()), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    },
    { detail: { hide: true } }
  )
