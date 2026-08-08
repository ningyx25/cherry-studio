import { application } from '@application'
import { loggerService } from '@logger'
import { isDev } from '@main/core/platform'
import { session } from 'electron'
import { join } from 'path'

const logger = loggerService.withContext('devtools')

/**
 * Install the development-only DevTools extensions (React DevTools + the
 * bundled Cherry DevTools panels) into the default session.
 *
 * Must be called after the `app` `ready` event, and — per Electron's contract —
 * ideally before the first page loads so the extensions attach to it. Callers
 * fire this without awaiting (best-effort): a slow or failed install (React
 * DevTools may download from the Chrome Web Store on first run) must never
 * block or delay window creation. No-op outside development.
 */
export async function installDevtoolsExtensions(): Promise<void> {
  if (!isDev) return
  await Promise.allSettled([installReactDevtools(), installBundledDevtools('data-api', 'DataApi')])
}

async function installReactDevtools() {
  try {
    // Lazy import: electron-devtools-installer calls app.getPath() at module load
    // time, so a static import would run that side effect for anything importing
    // this module (e.g. MainWindowService) — even in production, where this dev-only
    // library is never needed. Importing it here keeps it off the production path.
    //
    // The package is CommonJS with `__esModule`. When Rollup inlines it (dev-mode
    // default), the bundler normalizes `default` to the install function. When it is
    // externalized (see electron.vite.config.ts), Node's native `import()` surfaces the
    // raw CommonJS exports object as `default`, so the function lives at `default.default`.
    // Normalize both shapes here so the module resolves regardless of bundling mode.
    const mod = (await import('electron-devtools-installer')) as {
      default?: { default?: unknown; REACT_DEVELOPER_TOOLS?: unknown }
      REACT_DEVELOPER_TOOLS?: unknown
    }
    const installExtension = (mod.default?.default ?? mod.default) as (ext: unknown) => Promise<string>
    const REACT_DEVELOPER_TOOLS = mod.default?.REACT_DEVELOPER_TOOLS ?? mod.REACT_DEVELOPER_TOOLS
    if (typeof installExtension !== 'function') {
      throw new Error('electron-devtools-installer did not expose an install function')
    }
    const name = await installExtension(REACT_DEVELOPER_TOOLS)
    logger.info(`Added Extension: ${name}`)
  } catch (error) {
    logger.error('Failed to install React Developer Tools extension', error as Error)
  }
}

/**
 * Load a bundled DevTools panel from `resources/devtools/<directoryName>` into the
 * default session. The generic mechanism core owns: a concrete devtool (e.g. the
 * main-network monitor) calls this to install its own panel and, via `onInstalled`,
 * act on the resolved extension (for instance to allowlist its origin). Best-effort:
 * failures are logged, never thrown. Dev-only gating is the caller's responsibility.
 */
export async function installBundledDevtools(
  directoryName: string,
  displayName: string,
  onInstalled?: (extension: { id: string; name: string }) => void
) {
  try {
    const devtoolsPath = join(application.getPath('app.root.resources'), 'devtools', directoryName)
    // Loads into the default session, so every default-session BrowserWindow can inspect bundled panels.
    const extension = await session.defaultSession.extensions.loadExtension(devtoolsPath)
    onInstalled?.({ id: extension.id, name: extension.name })
    logger.info(`Added Extension: ${extension.name}`)
  } catch (error) {
    logger.error(`Failed to install ${displayName} DevTools extension`, error as Error)
  }
}
