import { Elysia } from 'elysia'

import { renderWebUiHtml } from './webuiHtml'

/**
 * WebUI route plugin for Elysia.
 * Serves the Single-Page Application (SPA) at `/web` and `/web/`.
 */
export const webuiRoutes = new Elysia()
  .get(
    '/web',
    () => {
      return new Response(renderWebUiHtml(), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    },
    { detail: { hide: true } }
  )
  .get(
    '/web/',
    () => {
      return new Response(renderWebUiHtml(), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    },
    { detail: { hide: true } }
  )
