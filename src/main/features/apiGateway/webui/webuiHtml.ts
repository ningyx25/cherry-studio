/**
 * WebUI Single Page Application for HuaTuo Studio.
 * Features:
 * 1. Deep visual UI/UX alignment with HuaTuo desktop application (Activity Rail, Sub-sidebar, Design Tokens, Lucide Icons)
 * 2. Complete data sharing with desktop SQLite database (Agent Sessions, Messages Persistence & Replay, Questionnaires, Knowledge bases, Models)
 */

export function renderWebUiHtml(injectedApiKey: string = ''): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>华佗 AI - 专科智能工作台 (WebUI)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg-app: #f4f5f8;
      --bg-sidebar: #ffffff;
      --bg-secondary-sidebar: #f8fafc;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --bg-muted: #f1f5f9;
      --bg-hover: #e2e8f0;
      --border-main: #e2e8f0;
      --border-subtle: #edf2f7;
      --text-main: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --text-subtle: #94a3b8;
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --primary-light: #e0f2fe;
      --primary-text: #0369a1;
      --clinic-accent: #059669;
      --clinic-light: #ecfdf5;
      --science-accent: #6366f1;
      --science-light: #eef2ff;
      --danger: #ef4444;
      --danger-light: #fef2f2;
      --warning: #f59e0b;
      --warning-light: #fffbeb;
      --success: #10b981;
      --success-light: #ecfdf5;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08);
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-full: 9999px;
      --sidebar-width: 64px;
      --subsidebar-width: 250px;
      --header-height: 56px;
    }

    [data-theme='dark'] {
      --bg-app: #0b0f19;
      --bg-sidebar: #111827;
      --bg-secondary-sidebar: #0e1422;
      --bg-surface: #151d30;
      --bg-card: #1a233a;
      --bg-muted: #1e293b;
      --bg-hover: #2d3748;
      --border-main: #2d3748;
      --border-subtle: #1e293b;
      --text-main: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --primary-light: #082f49;
      --primary-text: #38bdf8;
      --clinic-accent: #34d399;
      --clinic-light: #064e3b;
      --science-accent: #818cf8;
      --science-light: #312e81;
      --danger: #f87171;
      --danger-light: #450a0a;
      --warning: #fbbf24;
      --warning-light: #451a03;
      --success: #34d399;
      --success-light: #064e3b;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background-color: var(--bg-app);
      color: var(--text-main);
      height: 100vh;
      overflow: hidden;
      display: flex;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* App Layout */
    .app-root {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    /* Left Activity Rail (64px) */
    .activity-bar {
      width: var(--sidebar-width);
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      z-index: 30;
      flex-shrink: 0;
    }

    .activity-top, .activity-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .app-brand-logo {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #0284c7 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: 800;
      box-shadow: var(--shadow-md);
      margin-bottom: 8px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .app-brand-logo:hover {
      transform: scale(1.05);
    }

    .rail-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.18s ease-in-out;
      position: relative;
    }

    .rail-btn:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .rail-btn.active {
      background-color: var(--primary-light);
      color: var(--primary);
    }

    .rail-btn.active::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 10px;
      bottom: 10px;
      width: 4px;
      border-radius: 0 4px 4px 0;
      background-color: var(--primary);
    }

    .rail-btn svg {
      width: 22px;
      height: 22px;
      stroke-width: 2;
    }

    .rail-tooltip {
      position: absolute;
      left: 70px;
      background: var(--text-main);
      color: var(--bg-surface);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateX(-4px);
      transition: all 0.15s;
      z-index: 100;
      box-shadow: var(--shadow-md);
    }

    .rail-btn:hover .rail-tooltip {
      opacity: 1;
      transform: translateX(0);
    }

    .user-avatar-rail {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, var(--primary) 0%, var(--clinic-accent) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
    }

    /* Sub-sidebar (250px) */
    .subsidebar {
      width: var(--subsidebar-width);
      background-color: var(--bg-secondary-sidebar);
      border-right: 1px solid var(--border-main);
      display: flex;
      flex-direction: column;
      height: 100%;
      flex-shrink: 0;
      transition: width 0.2s;
    }

    .subsidebar.hidden {
      display: none;
    }

    .subsidebar-header {
      height: var(--header-height);
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-main);
    }

    .subsidebar-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-new-chat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 10px;
      background-color: var(--bg-surface);
      color: var(--primary);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: var(--shadow-sm);
    }

    .btn-new-chat:hover {
      background-color: var(--primary-light);
      border-color: var(--primary);
    }

    .session-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .session-item {
      padding: 9px 12px;
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .session-item:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .session-item.active {
      background-color: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
      border-color: rgba(2, 132, 199, 0.2);
    }

    .session-item-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .session-item-delete {
      opacity: 0;
      padding: 2px 4px;
      border-radius: 4px;
      color: var(--text-muted);
      transition: all 0.15s;
    }

    .session-item:hover .session-item-delete {
      opacity: 0.8;
    }

    .session-item-delete:hover {
      opacity: 1;
      color: var(--danger);
      background-color: var(--danger-light);
    }

    /* Workspace Content Area */
    .workspace-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background-color: var(--bg-app);
      position: relative;
    }

    /* Workspace Top Header (56px) */
    .workspace-header {
      height: var(--header-height);
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      flex-shrink: 0;
      z-index: 10;
    }

    .header-left-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .view-title-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background-color: var(--clinic-light);
      color: var(--clinic-accent);
    }

    .sync-status-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background-color: var(--success-light);
      color: var(--success);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sync-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--success);
    }

    .header-right-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .model-selector-wrapper {
      position: relative;
    }

    .model-selector-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      padding: 6px 12px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      transition: all 0.15s ease;
      box-shadow: var(--shadow-sm);
      user-select: none;
    }

    .model-selector-btn:hover {
      background-color: var(--bg-hover);
      border-color: var(--primary);
    }

    .model-selector-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .model-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 320px;
      max-width: 420px;
      max-height: 420px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow-y: auto;
      z-index: 200;
      display: none;
      flex-direction: column;
      padding: 8px 6px;
      backdrop-filter: blur(12px);
    }

    .model-dropdown-menu.show {
      display: flex;
    }

    .model-group-header {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-muted);
      padding: 8px 10px 4px 10px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.3px;
    }

    .model-group-header:first-child {
      margin-top: 0;
    }

    .model-menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 2px;
      position: relative;
    }

    .model-menu-item:hover {
      background-color: var(--bg-hover);
    }

    .model-menu-item.selected {
      background-color: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }

    .model-item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      overflow: hidden;
    }

    .model-active-indicator {
      width: 3.5px;
      height: 18px;
      border-radius: 2px;
      background-color: var(--clinic-accent);
      flex-shrink: 0;
      margin-left: -6px;
      margin-right: 2px;
    }

    .model-item-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-muted);
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .model-menu-item.selected .model-item-icon {
      background-color: var(--primary);
      color: white;
    }

    .model-item-title {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-main);
    }

    .model-menu-item.selected .model-item-title {
      color: var(--primary);
      font-weight: 600;
    }

    .model-item-badges {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .model-pill-badge {
      font-size: 10.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: var(--bg-muted);
      color: var(--text-muted);
    }

    .btn-header-action {
      background: transparent;
      border: 1px solid var(--border-main);
      padding: 6px 12px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-header-action:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    /* Main View Panes */
    .view-pane {
      flex: 1;
      display: none;
      flex-direction: column;
      height: calc(100vh - var(--header-height));
      overflow: hidden;
    }

    .view-pane.active {
      display: flex;
    }

    /* Chat View Layout */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    .messages-scroll-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      user-select: text;
    }

    /* Welcome / Triage Alert Banner */
    .triage-alert-banner {
      background-color: var(--clinic-light);
      border: 1px solid rgba(5, 150, 105, 0.2);
      border-radius: var(--radius-lg);
      padding: 14px 18px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 13px;
      color: var(--clinic-accent);
      line-height: 1.5;
    }

    .triage-alert-banner strong {
      display: block;
      margin-bottom: 2px;
    }

    /* Chat Message Bubbles */
    .message-item {
      display: flex;
      gap: 12px;
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
    }

    .message-item.user {
      flex-direction: row-reverse;
    }

    .msg-avatar {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }

    .msg-avatar.user {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
    }

    .msg-avatar.clinic {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
    }

    .msg-avatar.science {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }

    .msg-bubble-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 82%;
    }

    .message-item.user .msg-bubble-box {
      align-items: flex-end;
    }

    .msg-bubble {
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      box-shadow: var(--shadow-sm);
    }

    .message-item.user .msg-bubble {
      background-color: var(--primary);
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }

    .message-item.assistant .msg-bubble {
      background-color: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border-main);
      border-bottom-left-radius: 2px;
    }

    /* Markdown Styling Inside Bubble */
    .msg-bubble p {
      margin-bottom: 8px;
    }

    .msg-bubble p:last-child {
      margin-bottom: 0;
    }

    .msg-bubble ul, .msg-bubble ol {
      margin-left: 20px;
      margin-bottom: 8px;
    }

    .msg-bubble li {
      margin-bottom: 4px;
    }

    .msg-bubble code {
      background-color: var(--bg-muted);
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 12.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .msg-bubble pre {
      background-color: var(--bg-muted);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      overflow-x: auto;
      margin: 10px 0;
      border: 1px solid var(--border-main);
    }

    .msg-bubble pre code {
      background: transparent;
      padding: 0;
    }

    .msg-bubble table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      font-size: 13px;
    }

    .msg-bubble th, .msg-bubble td {
      border: 1px solid var(--border-main);
      padding: 6px 10px;
      text-align: left;
    }

    .msg-bubble th {
      background-color: var(--bg-muted);
    }

    /* Reasoning / Thinking Accordion */
    .thinking-accordion {
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-md);
      margin-bottom: 10px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .thinking-accordion-header {
      padding: 7px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      background-color: rgba(0, 0, 0, 0.02);
    }

    .thinking-accordion-header:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .thinking-title-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .thinking-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--primary);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.7; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.7; }
    }

    .thinking-accordion-content {
      padding: 10px 12px;
      font-size: 12.5px;
      color: var(--text-secondary);
      font-family: ui-monospace, monospace;
      line-height: 1.5;
      white-space: pre-wrap;
      max-height: 280px;
      overflow-y: auto;
      border-top: 1px solid var(--border-subtle);
    }

    .msg-footer-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .btn-msg-copy {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      transition: color 0.15s;
    }

    .btn-msg-copy:hover {
      color: var(--primary);
    }

    /* Recommendation Chips Bar */
    .chips-recommend-bar {
      max-width: 860px;
      width: 100%;
      margin: 0 auto 10px auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .prompt-chip {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .prompt-chip:hover {
      background-color: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }

    /* Composer Wrapper & Shell */
    .composer-wrapper {
      padding: 0 24px 20px 24px;
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
      flex-shrink: 0;
    }

    .composer-shell {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .composer-shell:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .composer-textarea {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      padding: 14px 16px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-main);
      resize: none;
      min-height: 56px;
      max-height: 180px;
      line-height: 1.5;
    }

    .composer-toolbar {
      padding: 8px 12px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: var(--bg-surface);
    }

    .composer-tool-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .composer-btn-mini {
      background: transparent;
      border: 1px solid var(--border-main);
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }

    .composer-btn-mini:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .btn-send-main {
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.15s;
      box-shadow: var(--shadow-sm);
    }

    .btn-send-main:hover {
      background-color: var(--primary-hover);
    }

    .btn-send-main:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Questionnaire Page Layout */
    .questionnaire-layout {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      max-width: 920px;
      width: 100%;
      margin: 0 auto;
    }

    .q-tabs-nav {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid var(--border-main);
      margin-bottom: 20px;
    }

    .q-tab-btn {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .q-tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .q-card-box {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 20px;
    }

    .q-step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .q-progress-rail {
      height: 6px;
      background-color: var(--bg-muted);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 20px;
    }

    .q-progress-rail-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary) 0%, var(--clinic-accent) 100%);
      transition: width 0.3s ease;
    }

    .q-item-group {
      margin-bottom: 18px;
    }

    .q-item-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .q-scale-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .q-scale-chip {
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      padding: 10px 12px;
      border-radius: var(--radius-md);
      font-size: 12.5px;
      color: var(--text-secondary);
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .q-scale-chip:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .q-scale-chip.selected {
      background-color: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
      font-weight: 600;
    }

    .q-btn-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }

    .history-session-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: var(--shadow-sm);
    }

    .history-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    /* Knowledge Base Layout */
    .knowledge-layout {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
    }

    .kb-search-container {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
    }

    .kb-search-input {
      flex: 1;
      border: 1px solid var(--border-main);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: 14px;
      background-color: var(--bg-surface);
      color: var(--text-main);
      outline: none;
    }

    .kb-search-input:focus {
      border-color: var(--primary);
    }

    .kb-articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .kb-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .kb-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary);
    }

    .kb-card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .kb-card-desc {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Settings Layout */
    .settings-layout {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
    }

    .settings-group-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }

    .settings-group-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .settings-field label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .settings-field input, .settings-field select {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-main);
      background-color: var(--bg-surface);
      color: var(--text-main);
      font-size: 13.5px;
      outline: none;
    }

    .settings-field input:focus, .settings-field select:focus {
      border-color: var(--primary);
    }
  </style>
</head>
<body>
  <div class="app-root">
    <!-- 1. Left Activity Navigation Rail (64px) -->
    <nav class="activity-bar">
      <div class="activity-top">
        <div class="app-brand-logo" id="brand-logo-btn" title="华佗 AI - 专科工作台">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>

        <div class="rail-btn active" data-view="clinic" title="智能问诊 AI">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
          <div class="rail-tooltip">智能问诊 AI</div>
        </div>

        <div class="rail-btn" data-view="science" title="科普知识 AI">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>
          <div class="rail-tooltip">科普知识 AI</div>
        </div>

        <div class="rail-btn" data-view="questionnaire" title="干眼问卷评估">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
          <div class="rail-tooltip">干眼问卷评估</div>
        </div>

        <div class="rail-btn" data-view="knowledge" title="专科知识库">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          <div class="rail-tooltip">专科知识库</div>
        </div>

        <div class="rail-btn" data-view="settings" title="系统与模型设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          <div class="rail-tooltip">系统设置</div>
        </div>
      </div>

      <div class="activity-bottom">
        <div class="rail-btn" id="theme-toggle-btn" title="切换明暗主题">
          <svg id="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <div class="rail-tooltip">明暗主题</div>
        </div>
        <div class="user-avatar-rail" id="user-avatar" title="用户资料">华</div>
      </div>
    </nav>

    <!-- 2. Sub-sidebar: Session List (250px) -->
    <aside class="subsidebar" id="subsidebar">
      <div class="subsidebar-header">
        <span class="subsidebar-title" id="subsidebar-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          问诊会话列表
        </span>
        <button class="btn-new-chat" id="btn-new-chat" onclick="createNewSession()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          新建
        </button>
      </div>
      <div class="session-list" id="session-list-container">
        <!-- Injected via JavaScript -->
      </div>
    </aside>

    <!-- 3. Main Workspace Area -->
    <main class="workspace-main">
      <header class="workspace-header">
        <div class="header-left-group">
          <span class="header-title" id="header-title">智能问诊 AI</span>
          <span class="view-title-badge" id="header-badge">专科分诊</span>
          <span class="sync-status-badge">
            <span class="sync-status-dot"></span>
            SQLite 数据共享已连接
          </span>
        </div>
        <div class="header-right-group">
          <div class="model-selector-wrapper">
            <button class="model-selector-btn" id="model-selector-trigger" onclick="toggleModelDropdown(event); event.stopPropagation();">
              <span class="model-selector-label">MODEL</span>
              <span id="model-selected-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5 5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Z"/><path d="M12 13a7 7 0 0 0-7 7v2h14v-2a7 7 0 0 0-7-7Z"/></svg>
              </span>
              <span id="model-selected-name">正在加载模型...</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="model-dropdown-menu" id="model-dropdown-menu">
              <!-- Rendered dynamically by JS grouped by Provider -->
            </div>
          </div>
          <button class="btn-header-action" onclick="clearCurrentChat()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            清屏
          </button>
        </div>
      </header>

      <!-- View Pane: Clinic AI -->
      <section class="view-pane active" id="pane-clinic">
        <div class="chat-container">
          <div class="messages-scroll-area" id="clinic-chat-box">
            <div class="triage-alert-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <div>
                <strong>就诊前温馨提示</strong>
                AI 问诊结果仅供辅助参考与预分诊梳理，不能替代眼科执业医师的面诊与处方诊断。如出现眼部剧烈疼痛或视力突降，请立即就医。
              </div>
            </div>

            <div class="message-item assistant">
              <div class="msg-avatar clinic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              </div>
              <div class="msg-bubble-box">
                <div class="msg-bubble">
                  您好！我是华佗专科问诊 AI。您可以向我描述您最近眼部的具体不适症状（如干涩、发红、异物感、畏光等），或在左侧导航栏先完成【干眼问卷自测】，我将结合问卷报告为您进行病情分析与就诊建议。
                </div>
              </div>
            </div>
          </div>

          <div class="chips-recommend-bar">
            <div class="prompt-chip" onclick="applyQuickPrompt('眼睛经常干涩、有磨痛异物感，面对电脑时加重，怎么缓解？')">👀 眼睛干涩有异物感</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('佩戴隐形眼镜超过6小时后眼睛发红刺痛，需要停戴或换镜片吗？')">👓 佩戴接触镜干痛</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('早晨起床时睁眼困难，眼角有黏性白色分泌物，属于什么问题？')">😴 晨起睁眼困难</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('眨眼后看东西能短暂清晰几秒，之后又模糊，是干眼还是近视加深？')">🌊 视力波动眨眼后清晰</div>
          </div>

          <div class="composer-wrapper">
            <div class="composer-shell">
              <textarea class="composer-textarea" id="clinic-text-input" placeholder="输入眼部症状或健康疑问... (Enter 发送，Shift + Enter 换行)"></textarea>
              <div class="composer-toolbar">
                <div class="composer-tool-group">
                  <button class="composer-btn-mini" onclick="insertLatestReportIntoComposer()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    导入自测问卷报告
                  </button>
                </div>
                <button class="btn-send-main" id="clinic-send-button" onclick="sendChatMessage('clinic')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View Pane: Pop-Science AI -->
      <section class="view-pane" id="pane-science">
        <div class="chat-container">
          <div class="messages-scroll-area" id="science-chat-box">
            <div class="message-item assistant">
              <div class="msg-avatar science">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>
              </div>
              <div class="msg-bubble-box">
                <div class="msg-bubble">
                  您好！我是干眼症与眼健康科普 AI。您可以向我咨询干眼症成因、睑板腺功能障碍（MGD）、人工泪液选型、眼睑热敷与日常护眼知识。
                </div>
              </div>
            </div>
          </div>

          <div class="chips-recommend-bar">
            <div class="prompt-chip" onclick="applySciencePrompt('干眼症有哪些类型？水液缺乏型和脂质异常型有什么区别？')">💡 水液缺乏 vs 脂质异常</div>
            <div class="prompt-chip" onclick="applySciencePrompt('如何挑选人工泪液？单支无防腐剂和瓶装有什么区别？')">💧 人工泪液挑选说明</div>
            <div class="prompt-chip" onclick="applySciencePrompt('睑板腺热敷温度多少合适？热敷后需要做眼睑按摩吗？')">🧖‍♀️ 睑板腺热敷与清洁</div>
            <div class="prompt-chip" onclick="applySciencePrompt('什么是「20-20-20」用眼法则？日常如何防范视疲劳？')">⏱️ 20-20-20 用眼法则</div>
          </div>

          <div class="composer-wrapper">
            <div class="composer-shell">
              <textarea class="composer-textarea" id="science-text-input" placeholder="输入科普疑问或眼科医学常识... (Enter 发送)"></textarea>
              <div class="composer-toolbar">
                <div class="composer-tool-group"></div>
                <button class="btn-send-main" id="science-send-button" onclick="sendChatMessage('science')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View Pane: Questionnaire Assessment -->
      <section class="view-pane" id="pane-questionnaire">
        <div class="questionnaire-layout">
          <div class="q-tabs-nav">
            <div class="q-tab-btn active" id="q-tab-form-btn" onclick="switchQTab('form')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              开始问卷自测
            </div>
            <div class="q-tab-btn" id="q-tab-history-btn" onclick="switchQTab('history')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
              历史测评记录 (桌面数据库同步)
            </div>
          </div>

          <div id="q-form-area">
            <!-- Rendered by JS -->
          </div>

          <div id="q-history-area" style="display: none;">
            <div id="q-history-list"></div>
          </div>
        </div>
      </section>

      <!-- View Pane: Knowledge Base Browser -->
      <section class="view-pane" id="pane-knowledge">
        <div class="knowledge-layout">
          <div class="kb-search-container">
            <input type="text" class="kb-search-input" id="kb-search-box" placeholder="搜索专科医学词条（如：泪膜破裂时间、睑板腺、玻璃酸钠）..." oninput="filterKnowledge()" />
            <button class="btn-send-main" onclick="filterKnowledge()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              检索
            </button>
          </div>

          <div class="kb-articles-grid" id="kb-grid-area">
            <!-- Rendered by JS -->
          </div>
        </div>
      </section>

      <!-- View Pane: Settings -->
      <section class="view-pane" id="pane-settings">
        <div class="settings-layout">
          <div class="settings-group-card">
            <div class="settings-group-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              API 网关与桌面端服务同步
            </div>
            <div class="settings-field">
              <label>API Gateway Base URL</label>
              <input type="text" id="cfg-base-url" placeholder="http://127.0.0.1:23333" />
            </div>
            <div class="settings-field">
              <label>网关 API Key (Bearer Token)</label>
              <input type="password" id="cfg-api-key" placeholder="自动注入或手动填入" />
            </div>
          </div>

          <div class="settings-group-card">
            <div class="settings-group-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              专科模型标识配置
            </div>
            <div class="settings-field">
              <label>问诊智能体模型 ID</label>
              <input type="text" id="cfg-clinic-model" value="clinic" />
            </div>
            <div class="settings-field">
              <label>科普智能体模型 ID</label>
              <input type="text" id="cfg-science-model" value="pop-science" />
            </div>
            <button class="btn-send-main" style="margin-top: 8px;" onclick="saveConfiguration()">保存并生效配置</button>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    window.__INJECTED_API_KEY__ = ${JSON.stringify(injectedApiKey)};
    // State Store
    const state = {
      theme: localStorage.getItem('huatuo_theme') || 'light',
      currentView: 'clinic',
      qTab: 'form',
      baseUrl: localStorage.getItem('huatuo_base_url') || window.location.origin,
      apiKey: localStorage.getItem('huatuo_api_key') || window.__INJECTED_API_KEY__ || '',
      clinicModel: localStorage.getItem('huatuo_clinic_model') || 'clinic',
      scienceModel: localStorage.getItem('huatuo_science_model') || 'pop-science',
      selectedModelId: localStorage.getItem('huatuo_current_model') || null,
      availableModels: [],
      activeSessionId: null,
      sessions: {
        clinic: [],
        'pop-science': []
      },
      messages: [],
      latestReportText: localStorage.getItem('huatuo_latest_report') || '',
      questionnaireHistory: [],
      // Questionnaire Form Data
      qStep: 0,
      qData: {
        age: 30,
        gender: 'female',
        screenHours: 8,
        contactLenses: 'no',
        sleepTrouble: 'no',
        symptoms: {
          dryness: 2,
          foreignBody: 1,
          burning: 1,
          redness: 1,
          fatigue: 2,
          photophobia: 0,
          blurredVision: 1,
          frequentBlinking: 1,
          readingDiscomfort: 2,
          screenDiscomfort: 3,
          drivingDiscomfort: 1,
          dryEnvDiscomfort: 2
        }
      }
    };

    document.documentElement.setAttribute('data-theme', state.theme);

    // Dom Ready
    window.addEventListener('DOMContentLoaded', () => {
      initTheme();
      initNav();
      initSettings();
      bindInputs();
      refreshAllData();
      renderQuestionnaire();
      initKnowledge();
    });

    function initTheme() {
      const toggleBtn = document.getElementById('theme-toggle-btn');
      toggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('huatuo_theme', state.theme);
      });
    }

    function initNav() {
      const railBtns = document.querySelectorAll('.rail-btn[data-view]');
      const panes = document.querySelectorAll('.view-pane');
      const subsidebar = document.getElementById('subsidebar');
      const headerTitle = document.getElementById('header-title');
      const headerBadge = document.getElementById('header-badge');
      const subsidebarTitle = document.getElementById('subsidebar-title');

      const metaMap = {
        clinic: { title: '智能问诊 AI', badge: '专科分诊', badgeBg: 'var(--clinic-light)', badgeColor: 'var(--clinic-accent)', subTitle: '问诊会话列表', showSub: true },
        science: { title: '科普知识 AI', badge: '专科百科', badgeBg: 'var(--science-light)', badgeColor: 'var(--science-accent)', subTitle: '科普会话列表', showSub: true },
        questionnaire: { title: '干眼专科问卷评估', badge: '多维量表', badgeBg: 'var(--primary-light)', badgeColor: 'var(--primary)', showSub: false },
        knowledge: { title: '专科知识库检索', badge: '医学知识库', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-main)', showSub: false },
        settings: { title: '系统与模型设置', badge: '配置中心', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-muted)', showSub: false }
      };

      railBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.getAttribute('data-view');
          if (!view) return;
          state.currentView = view;

          railBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          panes.forEach(p => p.classList.remove('active'));
          const targetPane = document.getElementById(\`pane-\${view}\`);
          if (targetPane) targetPane.classList.add('active');

          const meta = metaMap[view];
          if (meta) {
            headerTitle.textContent = meta.title;
            headerBadge.textContent = meta.badge;
            headerBadge.style.backgroundColor = meta.badgeBg;
            headerBadge.style.color = meta.badgeColor;

            if (meta.showSub) {
              subsidebar.classList.remove('hidden');
              subsidebarTitle.innerHTML = \`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                \${meta.subTitle}
              \`;
              const agentId = view === 'clinic' ? 'clinic' : 'pop-science';
              loadAgentSessions(agentId);
            } else {
              subsidebar.classList.add('hidden');
            }
          }
        });
      });
    }

    async function refreshAllData() {
      await fetchModels();
      if (state.currentView === 'clinic' || state.currentView === 'science') {
        const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
        await loadAgentSessions(agentId);
        // If a session is already selected, make sure its messages are on screen.
        if (state.activeSessionId) {
          await loadSessionMessages(state.activeSessionId, state.currentView);
        }
      }
      loadQuestionnaireHistory();
    }

    // ==========================================
    // Data Sharing: Agent Sessions & Messages (SQLite)
    // ==========================================
    async function loadAgentSessions(agentId) {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions?agentId=\${agentId}\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (!res.ok) {
          console.warn('Failed to load agent sessions', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        state.sessions[agentId] = data.sessions || [];
        renderSessionList(agentId);

        // If no active session or active session not in list, pick the first one
        if (state.sessions[agentId].length > 0) {
          const stillActive = state.sessions[agentId].some(s => s.id === state.activeSessionId);
          if (!state.activeSessionId || !stillActive) {
            selectSession(state.sessions[agentId][0].id);
          }
        } else {
          state.activeSessionId = null;
        }
      } catch (e) {
        console.warn('Failed to load agent sessions', e);
      }
    }

    function renderSessionList(agentId) {
      const container = document.getElementById('session-list-container');
      container.innerHTML = '';
      const list = state.sessions[agentId] || [];

      if (list.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:16px; text-align:center;">暂无历史会话，点击新建开启交流</div>';
        return;
      }

      list.forEach(sess => {
        const item = document.createElement('div');
        item.className = \`session-item \${sess.id === state.activeSessionId ? 'active' : ''}\`;
        item.innerHTML = \`
          <span class="session-item-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            \${escapeHtml(sess.name || '新会话')}
          </span>
          <span class="session-item-delete" onclick="deleteSession('\${sess.id}', event)" title="删除会话">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          </span>
        \`;
        item.addEventListener('click', () => selectSession(sess.id));
        container.appendChild(item);
      });
    }

    async function createNewSession() {
      const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({
            agentId,
            name: \`\${agentId === 'clinic' ? '问诊' : '科普'}会话 \${new Date().toLocaleTimeString()}\`
          })
        });
        if (res.ok) {
          const newSess = await res.json();
          state.activeSessionId = newSess.id;
          await loadAgentSessions(agentId);
          clearChatDisplay(state.currentView);
        }
      } catch (e) {
        alert('创建会话失败: ' + e.message);
      }
    }

    async function deleteSession(id, e) {
      e.stopPropagation();
      if (!confirm('确定删除此会话及其所有聊天记录吗？')) return;
      try {
        await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${id}\`, {
          method: 'DELETE',
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
        if (state.activeSessionId === id) {
          state.activeSessionId = null;
          clearChatDisplay(state.currentView);
        }
        loadAgentSessions(agentId);
      } catch (err) {
        alert('删除失败: ' + err.message);
      }
    }

    async function selectSession(id) {
      state.activeSessionId = id;
      const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
      renderSessionList(agentId);
      await loadSessionMessages(id, state.currentView);
    }

    // Per-view monotonically increasing token for loadSessionMessages. Concurrent loads for
    // the same view (e.g. refreshAllData's selectSession() fire-and-forget racing its own
    // explicit reload) would otherwise both append the same messages after the clears, showing
    // every message twice. Only the LATEST load's fetch result may render.
    const messageLoadToken = { clinic: 0, science: 0 };

    async function loadSessionMessages(sessionId, view) {
      const token = ++messageLoadToken[view];
      const chatBox = document.getElementById(\`\${view}-chat-box\`);
      clearChatDisplay(view);

      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${sessionId}/messages\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        // A newer load for this view superseded this one — its result is stale, drop it.
        if (token !== messageLoadToken[view]) return;
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages || [];
          for (const msg of messages) {
            if (token !== messageLoadToken[view]) return;
            if (msg.role === 'user') {
              const text = extractTextFromMessageData(msg.data);
              appendMessageBubble(chatBox, 'user', escapeHtml(text), view);
            } else if (msg.role === 'assistant') {
              const { text, reasoning } = extractTextAndReasoning(msg.data);
              const bubble = appendMessageBubble(chatBox, 'assistant', '', view);
              // A non-success assistant row means the stream did not finish cleanly.
              if (msg.status && msg.status !== 'success') {
                let attached = false;
                if (msg.status === 'pending' || msg.status === 'paused') {
                  // The reply may STILL be generating server-side (the page was refreshed
                  // mid-stream — the detached stream kept running). Re-attach to it so the
                  // bubble keeps streaming live (the server replays every delta from the
                  // start) instead of showing a dead "interrupted" hint.
                  attached = await tryAttachLiveStream(sessionId, msg.id, bubble, view);
                  if (token !== messageLoadToken[view]) return;
                }
                if (!attached) {
                  // The stream is gone (app restarted / already evicted) — the partial
                  // content was kept by the incremental persistence; render it, mark it,
                  // and offer to continue the generation.
                  renderAssistantMarkdown(bubble, text, reasoning);
                  const hintBox = document.createElement('div');
                  hintBox.className = 'interrupted-hint';
                  hintBox.style.cssText = 'margin-top:8px; font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:10px; flex-wrap:wrap;';
                  const hintText = document.createElement('span');
                  hintText.textContent = msg.status === 'error' ? '（回复出错，内容可能不完整）' : '（回复已中断，内容可能不完整）';
                  hintBox.appendChild(hintText);
                  if (msg.status === 'pending' || msg.status === 'paused') {
                    const continueBtn = document.createElement('button');
                    continueBtn.className = 'composer-btn-mini';
                    continueBtn.textContent = '继续生成';
                    continueBtn.onclick = () => continueAssistantMessage(msg.id, view, bubble);
                    hintBox.appendChild(continueBtn);
                  }
                  bubble.appendChild(hintBox);
                }
              } else {
                renderAssistantMarkdown(bubble, text, reasoning);
              }
            }
          }
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      } catch (e) {
        console.warn('Failed to load session messages from SQLite', e);
      }
    }

    function extractTextFromMessageData(data) {
      if (!data) return '';
      if (typeof data === 'string') return data;
      if (data.parts && Array.isArray(data.parts)) {
        return data.parts
          .filter(p => p.type === 'text')
          .map(p => p.text)
          .join('\\n');
      }
      return data.text || '';
    }

    function extractTextAndReasoning(data) {
      let text = '';
      let reasoning = '';
      if (!data) return { text, reasoning };
      if (data.parts && Array.isArray(data.parts)) {
        data.parts.forEach(p => {
          if (p.type === 'text') text += p.text || '';
          // Reasoning parts are stored as { type: 'reasoning', text } (the AI SDK
          // ReasoningUIPart shape the desktop stack uses); tolerate an old client's
          // 'reasoning' field just in case a legacy row exists.
          if (p.type === 'reasoning') reasoning += p.text || p.reasoning || '';
        });
      } else {
        text = data.text || '';
        reasoning = data.reasoning || '';
      }
      return { text, reasoning };
    }

    function clearChatDisplay(view) {
      const box = document.getElementById(\`\${view}-chat-box\`);
      if (!box) return;
      const first = box.firstElementChild;
      box.innerHTML = '';
      if (first) box.appendChild(first);
    }

    function clearCurrentChat() {
      clearChatDisplay(state.currentView);
    }

    // ==========================================
    // Data Sharing: Questionnaire History (SQLite)
    // ==========================================
    async function loadQuestionnaireHistory() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/questionnaire/sessions\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          state.questionnaireHistory = data.sessions || [];
          renderQuestionnaireHistory();
        }
      } catch (e) {
        console.warn('Failed to load questionnaire history', e);
      }
    }

    function renderQuestionnaireHistory() {
      const container = document.getElementById('q-history-list');
      container.innerHTML = '';

      if (state.questionnaireHistory.length === 0) {
        container.innerHTML = '<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:40px;">暂无历史问卷记录，完成自测后将自动同步至桌面端数据库</div>';
        return;
      }

      state.questionnaireHistory.forEach(s => {
        const card = document.createElement('div');
        card.className = 'history-session-card';
        const rep = s.report || {};
        const score = rep.totalScore ?? '未计分';
        const level = rep.levelText || s.status;

        card.innerHTML = \`
          <div>
            <div style="font-size:14.5px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
              \${s.flowQuestionnaireId || '中国干眼综合量表'}
              <span class="history-badge" style="background:var(--primary-light); color:var(--primary-text)">\${escapeHtml(level)}</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted)">
              测评时间: \${new Date(s.createdAt).toLocaleString()} | 总得分: <strong>\${score}</strong> / 48 分
            </div>
          </div>
          <div style="display:flex; gap:8px">
            <button class="composer-btn-mini" onclick="loadHistoryToChat('\${s.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              发送至问诊AI
            </button>
            <button class="composer-btn-mini" style="color:var(--danger)" onclick="deleteQuestionnaireRecord('\${s.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              删除
            </button>
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function deleteQuestionnaireRecord(id) {
      if (!confirm('确定要删除这条问卷记录吗？')) return;
      try {
        await fetch(\`\${state.baseUrl}/v1/questionnaire/sessions/\${id}\`, {
          method: 'DELETE',
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        loadQuestionnaireHistory();
      } catch (e) {
        alert('删除失败: ' + e.message);
      }
    }

    function loadHistoryToChat(id) {
      const record = state.questionnaireHistory.find(r => r.id === id);
      if (!record || !record.report) {
        alert('此记录无完整评估报告');
        return;
      }
      state.latestReportText = \`患者问卷评估报告：\${record.report.levelText}，总分 \${record.report.totalScore} 分。\\n\${record.report.assessmentDesc || ''}\`;
      localStorage.setItem('huatuo_latest_report', state.latestReportText);

      const clinicRail = document.querySelector('[data-view="clinic"]');
      if (clinicRail) clinicRail.click();
      insertLatestReportIntoComposer();
    }

    function switchQTab(tab) {
      state.qTab = tab;
      document.getElementById('q-tab-form-btn').classList.toggle('active', tab === 'form');
      document.getElementById('q-tab-history-btn').classList.toggle('active', tab === 'history');
      document.getElementById('q-form-area').style.display = tab === 'form' ? 'block' : 'none';
      document.getElementById('q-history-area').style.display = tab === 'history' ? 'block' : 'none';
      if (tab === 'history') loadQuestionnaireHistory();
    }

    // ==========================================
    // Questionnaire Logic & Form
    // ==========================================
    const SYMPTOMS_12 = [
      { id: 'dryness', title: '1. 眼睛发干、干涩感' },
      { id: 'foreignBody', title: '2. 异物感、磨痛、沙粒感' },
      { id: 'burning', title: '3. 烧灼感、刺痛或眼周发热' },
      { id: 'redness', title: '4. 眼睛发红、充血或血丝增多' },
      { id: 'fatigue', title: '5. 眼睛疲劳、酸胀、睁眼困难' },
      { id: 'photophobia', title: '6. 怕光、畏风或流泪' },
      { id: 'blurredVision', title: '7. 视力波动（眨眼后短暂看清）' },
      { id: 'frequentBlinking', title: '8. 频繁眨眼或不由自主挤眼' },
      { id: 'readingDiscomfort', title: '9. 看书、阅读时眼部不适' },
      { id: 'screenDiscomfort', title: '10. 看手机、电脑屏幕时眼部不适' },
      { id: 'drivingDiscomfort', title: '11. 驾驶或夜间外出时眼部不适' },
      { id: 'dryEnvDiscomfort', title: '12. 空调房或干燥环境下眼部不适' }
    ];

    function renderQuestionnaire() {
      const container = document.getElementById('q-form-area');
      const step = state.qStep;

      if (step === 0) {
        container.innerHTML = \`
          <div class="q-card-box">
            <div class="q-step-header">
              <div style="font-size:15.5px; font-weight:700">阶段一：患者基本信息与生活习惯筛查</div>
              <span class="view-title-badge" style="background:var(--primary-light); color:var(--primary-text)">第 1 / 3 步</span>
            </div>
            <div class="q-progress-rail"><div class="q-progress-rail-fill" style="width:33%"></div></div>

            <div class="q-item-group">
              <div class="q-item-title">年龄段</div>
              <div class="q-scale-row">
                <div class="q-scale-chip \${state.qData.age <= 25 ? 'selected' : ''}" onclick="setQField('age', 22)">18-25 岁 (学生/青年)</div>
                <div class="q-scale-chip \${state.qData.age > 25 && state.qData.age <= 45 ? 'selected' : ''}" onclick="setQField('age', 35)">26-45 岁 (中青年办公)</div>
                <div class="q-scale-chip \${state.qData.age > 45 ? 'selected' : ''}" onclick="setQField('age', 55)">45 岁以上 (中老年)</div>
              </div>
            </div>

            <div class="q-item-group">
              <div class="q-item-title">生理性别</div>
              <div class="q-scale-row">
                <div class="q-scale-chip \${state.qData.gender === 'female' ? 'selected' : ''}" onclick="setQField('gender', 'female')">女性</div>
                <div class="q-scale-chip \${state.qData.gender === 'male' ? 'selected' : ''}" onclick="setQField('gender', 'male')">男性</div>
              </div>
            </div>

            <div class="q-item-group">
              <div class="q-item-title">日均使用屏幕时长</div>
              <div class="q-scale-row">
                <div class="q-scale-chip \${state.qData.screenHours <= 4 ? 'selected' : ''}" onclick="setQField('screenHours', 3)">&lt; 4 小时</div>
                <div class="q-scale-chip \${state.qData.screenHours > 4 && state.qData.screenHours <= 8 ? 'selected' : ''}" onclick="setQField('screenHours', 6)">4 - 8 小时</div>
                <div class="q-scale-chip \${state.qData.screenHours > 8 ? 'selected' : ''}" onclick="setQField('screenHours', 10)">&gt; 8 小时 (高频暴露)</div>
              </div>
            </div>

            <div class="q-item-group">
              <div class="q-item-title">是否佩戴隐形眼镜 / 美瞳？</div>
              <div class="q-scale-row">
                <div class="q-scale-chip \${state.qData.contactLenses === 'yes' ? 'selected' : ''}" onclick="setQField('contactLenses', 'yes')">是 (每周≥3天)</div>
                <div class="q-scale-chip \${state.qData.contactLenses === 'no' ? 'selected' : ''}" onclick="setQField('contactLenses', 'no')">否 (无佩戴)</div>
              </div>
            </div>

            <div class="q-btn-row">
              <div></div>
              <button class="btn-send-main" onclick="state.qStep=1; renderQuestionnaire();">下一步：填写中国干眼问卷量表 ➔</button>
            </div>
          </div>
        \`;
      } else if (step === 1) {
        let listHtml = '';
        SYMPTOMS_12.forEach(s => {
          const val = state.qData.symptoms[s.id] ?? 0;
          listHtml += \`
            <div class="q-item-group" style="padding-bottom:10px; border-bottom:1px dashed var(--border-subtle)">
              <div class="q-item-title">\${s.title}</div>
              <div class="q-scale-row" style="grid-template-columns:repeat(5, 1fr);">
                <div class="q-scale-chip \${val === 0 ? 'selected' : ''}" onclick="setSymScore('\${s.id}', 0)">0 无</div>
                <div class="q-scale-chip \${val === 1 ? 'selected' : ''}" onclick="setSymScore('\${s.id}', 1)">1 偶尔</div>
                <div class="q-scale-chip \${val === 2 ? 'selected' : ''}" onclick="setSymScore('\${s.id}', 2)">2 有时</div>
                <div class="q-scale-chip \${val === 3 ? 'selected' : ''}" onclick="setSymScore('\${s.id}', 3)">3 经常</div>
                <div class="q-scale-chip \${val === 4 ? 'selected' : ''}" onclick="setSymScore('\${s.id}', 4)">4 持续</div>
              </div>
            </div>
          \`;
        });

        container.innerHTML = \`
          <div class="q-card-box">
            <div class="q-step-header">
              <div style="font-size:15.5px; font-weight:700">阶段二：中国干眼调查问卷 (12项临床症状量表)</div>
              <span class="view-title-badge" style="background:var(--primary-light); color:var(--primary-text)">第 2 / 3 步</span>
            </div>
            <div class="q-progress-rail"><div class="q-progress-rail-fill" style="width:66%"></div></div>

            \${listHtml}

            <div class="q-btn-row">
              <button class="composer-btn-mini" onclick="state.qStep=0; renderQuestionnaire();">⬅ 上一步</button>
              <button class="btn-send-main" onclick="submitAndSaveQuestionnaire()">生成报告并持久化保存 📊</button>
            </div>
          </div>
        \`;
      } else if (step === 2) {
        renderReportCard(container);
      }
    }

    function setQField(k, v) {
      state.qData[k] = v;
      renderQuestionnaire();
    }

    function setSymScore(k, v) {
      state.qData.symptoms[k] = v;
      renderQuestionnaire();
    }

    async function submitAndSaveQuestionnaire() {
      let totalScore = 0;
      Object.values(state.qData.symptoms).forEach(v => totalScore += v);

      let levelText = '阴性 (暂无明显干眼指征)';
      let assessmentDesc = '您的干眼症状总分处于正常范围，暂无干眼症典型体征，建议保持良好的日常用眼习惯。';

      if (totalScore >= 19) {
        levelText = '重度干眼 (Severe Dry Eye)';
        assessmentDesc = '总分显著升高，症状严重且明显干扰日常用眼，强烈建议前往眼科干眼门诊进行睑板腺与泪膜专业检查。';
      } else if (totalScore >= 13) {
        levelText = '中度干眼 (Moderate Dry Eye)';
        assessmentDesc = '总分处于中度范围，有明显的眼表不适与视疲劳影响，建议眼科门诊排查脂质异常或水液缺乏。';
      } else if (totalScore >= 7) {
        levelText = '轻度干眼 (Mild Dry Eye)';
        assessmentDesc = '总分已达干眼阳性阈值（≥7分），提示存在早期轻度干眼表现，可通过环境加湿、减少连续屏幕用眼及热敷改善。';
      }

      const risks = [];
      if (state.qData.screenHours >= 8) risks.push('超长屏幕暴露 (>8h)');
      if (state.qData.contactLenses === 'yes') risks.push('接触镜/隐形眼镜佩戴');
      if (state.qData.symptoms.dryEnvDiscomfort >= 2) risks.push('空调干燥环境');

      const report = {
        totalScore,
        levelText,
        assessmentDesc,
        risks,
        createdAt: new Date().toISOString()
      };

      state.currentReport = report;
      state.latestReportText = [
        \`患者基本信息：年龄 \${state.qData.age}岁，性别 \${state.qData.gender === 'female' ? '女' : '男'}，日均屏幕 \${state.qData.screenHours}小时，隐形眼镜：\${state.qData.contactLenses === 'yes' ? '佩戴' : '无'}。\`,
        \`问卷量表：中国干眼调查问卷 (12题标准量表)\`,
        \`测评总分：\${totalScore} 分 (满分48分)\`,
        \`临床分级：\${levelText}\`,
        \`诱因筛查：\${risks.join('、') || '暂无突出外部诱因'}\`
      ].join('\\n');
      localStorage.setItem('huatuo_latest_report', state.latestReportText);

      // Persist to desktop SQLite database via API Gateway
      try {
        await fetch(\`\${state.baseUrl}/v1/questionnaire/sessions\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({
            flowQuestionnaireId: 'CHINA_DRY_EYE',
            answers: state.qData,
            report: report
          })
        });
        loadQuestionnaireHistory();
      } catch (e) {
        console.warn('Failed to persist questionnaire to backend', e);
      }

      state.qStep = 2;
      renderQuestionnaire();
    }

    function renderReportCard(container) {
      const r = state.currentReport || {};
      const risks = r.risks || [];
      let tagsHtml = risks.map(t => \`<span class="history-badge" style="background:var(--warning-light); color:#b45309; margin-right:6px;">⚠️ \${escapeHtml(t)}</span>\`).join('');

      container.innerHTML = \`
        <div class="q-card-box">
          <div class="q-step-header">
            <div style="font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              干眼专科综合测评报告
            </div>
            <span class="sync-status-badge">已同步至桌面 SQLite 数据库</span>
          </div>

          <div style="background:var(--bg-muted); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
            <div>
              <div style="font-size:12px; color:var(--text-muted)">临床分级结论</div>
              <div style="font-size:18px; font-weight:800; margin-top:2px">\${escapeHtml(r.levelText || '')}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px; color:var(--text-muted)">问卷量表总得分</div>
              <div style="font-size:22px; font-weight:800; color:var(--primary)">\${r.totalScore ?? 0} <span style="font-size:12px; font-weight:normal">/ 48</span></div>
            </div>
          </div>

          <div style="font-size:13.5px; line-height:1.6; margin-bottom:14px;">
            <strong>📋 评估解读：</strong>\${escapeHtml(r.assessmentDesc || '')}
          </div>

          <div style="margin-bottom:20px;">
            <strong>🚩 危险因素：</strong>\${tagsHtml || '<span style="font-size:12px; color:var(--text-muted)">暂无明显外部诱因</span>'}
          </div>

          <div class="q-btn-row" style="border-top:1px solid var(--border-main); padding-top:16px">
            <button class="composer-btn-mini" onclick="state.qStep=0; renderQuestionnaire();">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              重新测评
            </button>
            <div style="display:flex; gap:10px">
              <button class="composer-btn-mini" onclick="copyReportText()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                复制报告文本
              </button>
              <button class="btn-send-main" onclick="sendReportToClinicChat()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                发送至问诊AI深入分析
              </button>
            </div>
          </div>
        </div>
      \`;
    }

    function copyReportText() {
      navigator.clipboard.writeText(state.latestReportText);
      alert('问卷报告已成功复制到剪贴板！');
    }

    function sendReportToClinicChat() {
      const clinicRail = document.querySelector('[data-view="clinic"]');
      if (clinicRail) clinicRail.click();
      insertLatestReportIntoComposer();
    }

    function insertLatestReportIntoComposer() {
      if (!state.latestReportText) {
        alert('暂无自测报告，请先前往【干眼问卷评估】完成自测！');
        return;
      }
      const inp = document.getElementById('clinic-text-input');
      inp.value = state.latestReportText + '\\n\\n请结合我的上述问卷测评报告，帮我深入分析可能的干眼类型及分诊建议。';
      inp.focus();
    }

    // ==========================================
    // Chat & Model Streaming & SQLite Persistence
    // ==========================================
    function bindInputs() {
      const cinp = document.getElementById('clinic-text-input');
      cinp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage('clinic');
        }
      });

      const sinp = document.getElementById('science-text-input');
      sinp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage('science');
        }
      });
    }

    function applyQuickPrompt(p) {
      const inp = document.getElementById('clinic-text-input');
      inp.value = p;
      inp.focus();
    }

    // v4-shaped random uuid for client-supplied message ids. crypto.randomUUID is only
    // available in secure contexts; fall back to a manual v4 shape otherwise.
    function uuidV4ish() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    function applySciencePrompt(p) {
      const inp = document.getElementById('science-text-input');
      inp.value = p;
      inp.focus();
    }

    function getSystemPrompt(view) {
      return view === 'clinic'
        ? '你是一位干眼症专科问诊AI，主要帮助有干眼症状的患者在就诊前梳理病情、解读问卷报告、判断紧急程度，并给出分诊与就医建议。'
        : '你是一位干眼症科普AI，面向大众把干眼症相关的科学和健康知识讲得简单易懂。优先基于干眼专科医学知识作答。';
    }

    // Consume an already-open SSE response from the server-side reply stream:
    // accumulate deltas into the bubble, render markdown live, resolve when the
    // stream settles (reject when the stream reports an error). The server owns
    // persistence — the client only renders.
    //
    // isStale (optional) is re-checked before every render: a fire-and-forget
    // re-attach (page refreshed, then the user switched sessions) must not keep
    // writing into a chat box that no longer shows this conversation.
    async function consumeAssistantStreamResponse(res, bubble, view, seedText, seedThinking, onFinalized, isStale) {
      const chatBox = document.getElementById(\`\${view}-chat-box\`);
      let thinkingAccumulator = seedThinking || '';
      let textAccumulator = seedText || '';
      let streamError = null;

      const handleLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data: ')) return;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          if (json.error) {
            streamError = (json.error && json.error.message) || 'stream error';
            return;
          }
          const delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (!delta) return;
          if (isStale && isStale()) return;
          if (delta.reasoning_content) thinkingAccumulator += delta.reasoning_content;
          if (delta.content) textAccumulator += delta.content;
          renderAssistantMarkdown(bubble, textAccumulator, thinkingAccumulator);
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        } catch (e) {
          // Ignore malformed frames
        }
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';
        for (const line of lines) handleLine(line);
      }
      const tail = decoder.decode();
      if (tail) {
        buffer += tail;
        for (const line of buffer.split('\\n')) handleLine(line);
      }

      if (streamError && !(isStale && isStale())) {
        // Keep whatever streamed so far; append the error instead of wiping the bubble.
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'margin-top:8px; font-size:12px; color:var(--danger);';
        errDiv.textContent = \`请求发生错误: \${streamError}\`;
        bubble.appendChild(errDiv);
        throw new Error(streamError);
      }
      if (onFinalized && !(isStale && isStale())) onFinalized();
    }

    // Fetch + consume the attach endpoint for a server-side reply stream.
    async function consumeAssistantStreamSse(sessionId, messageId, bubble, opts) {
      const { view, initialText, initialThinking, onFinalized } = opts || {};
      const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${sessionId}/messages/\${messageId}/stream\`, {
        headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
      });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      await consumeAssistantStreamResponse(res, bubble, view, initialText || '', initialThinking || '', onFinalized);
    }

    // Stream one assistant reply through a DETACHED server-side stream: the model call
    // runs in the main process (independent of this page's connection) and persists the
    // message row itself, so a page refresh does NOT interrupt the reply — the refreshed
    // page finds the still-'pending' row and re-attaches to the same running stream (see
    // tryAttachLiveStream). Shared by new replies and "continue generation".
    async function streamAssistantReply(opts) {
      const { view, sessionId, messageId, bubble, chatMessages, initialText, initialThinking, onFinalized } = opts;
      const model = getSelectedModelId();
      if (!model) {
        bubble.innerHTML = '<div style="color:var(--danger)">无可用模型</div>';
        return;
      }
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${sessionId}/messages/stream\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({
            messageId,
            modelId: model,
            messages: chatMessages,
            initialText: initialText || undefined,
            initialThinking: initialThinking || undefined
          })
        });
        if (!res.ok) {
          let msg = \`HTTP \${res.status}\`;
          try {
            const j = await res.json();
            if (j && j.error && j.error.message) msg = j.error.message;
          } catch (e) {
            // keep the generic message
          }
          throw new Error(msg);
        }
        // The server replays every delta from the start of the stream, so the client
        // accumulators start empty — except continue-generation, whose pre-existing
        // partial content is NOT in the replay buffer and must seed them.
        await consumeAssistantStreamSse(sessionId, messageId, bubble, {
          view,
          initialText,
          initialThinking,
          onFinalized
        });
      } catch (err) {
        if (!bubble.textContent || !bubble.textContent.trim()) {
          bubble.innerHTML = \`<div style="color:var(--danger)">请求发生错误: \${escapeHtml(err.message)}</div>\`;
        }
      }
    }

    // Try to re-attach to a still-running server-side reply stream (the page was
    // refreshed mid-generation). Returns true when attached — the bubble then keeps
    // streaming live from the full replay; false when the stream is gone (app
    // restarted / already evicted) and the row is just an interrupted leftover.
    async function tryAttachLiveStream(sessionId, messageId, bubble, view) {
      let res;
      try {
        res = await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${sessionId}/messages/\${messageId}/stream\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
      } catch (e) {
        return false;
      }
      if (!res.ok) return false;
      // Attached — rebuild the bubble from the full replay and keep streaming live.
      // If the user switches session/view while the stream runs, stop rendering into
      // the now-hidden bubble (the server keeps generating either way).
      const expectedView = view;
      const expectedSession = sessionId;
      consumeAssistantStreamResponse(res, bubble, view, '', '', null, () => {
        return state.currentView !== expectedView || state.activeSessionId !== expectedSession;
      }).catch(() => {});
      return true;
    }

    async function sendChatMessage(view) {
      const inp = document.getElementById(\`\${view}-text-input\`);
      const text = inp.value.trim();
      if (!text) return;

      const btn = document.getElementById(\`\${view}-send-button\`);
      btn.disabled = true;
      inp.value = '';

      const agentId = view === 'clinic' ? 'clinic' : 'pop-science';
      const chatBox = document.getElementById(\`\${view}-chat-box\`);

      // 1. Ensure an active session exists; auto-create if not
      let currentSessionId = state.activeSessionId;
      if (!currentSessionId) {
        try {
          const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
            },
            body: JSON.stringify({
              agentId,
              name: text.slice(0, 20)
            })
          });
          if (res.ok) {
            const sess = await res.json();
            state.activeSessionId = sess.id;
            currentSessionId = sess.id;
            await loadAgentSessions(agentId);
          }
        } catch (e) {
          console.warn('Failed to auto-create session', e);
        }
      }

      // 2. Append user bubble in UI
      appendMessageBubble(chatBox, 'user', escapeHtml(text), view);

      // 3. Persist user message to SQLite
      if (currentSessionId) {
        try {
          await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${currentSessionId}/messages\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
            },
            body: JSON.stringify({
              role: 'user',
              data: { parts: [{ type: 'text', text }] },
              status: 'success'
            })
          });
        } catch (e) {
          console.warn('Failed to persist user message in SQLite', e);
        }
      }

      // 4. Create assistant bubble placeholder and stream the reply
      const assistantBubble = appendMessageBubble(chatBox, 'assistant', '<span style="color:var(--text-muted)">正在思考回答...</span>', view);
      chatBox.scrollTop = chatBox.scrollHeight;

      try {
        await streamAssistantReply({
          view,
          sessionId: currentSessionId,
          messageId: uuidV4ish(),
          bubble: assistantBubble,
          chatMessages: [
            { role: 'system', content: getSystemPrompt(view) },
            { role: 'user', content: text }
          ],
          onFinalized: async () => {
            // Only update the session name once (from default empty/'新会话') so
            // subsequent messages do not overwrite a user-visible title.
            if (!currentSessionId) return;
            const currentSession = state.sessions[agentId].find(s => s.id === currentSessionId);
            const shouldUpdateName = !currentSession || currentSession.name === '' || currentSession.name.startsWith('新') || currentSession.name.startsWith('问诊会话') || currentSession.name.startsWith('科普会话');
            if (shouldUpdateName) {
              await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${currentSessionId}\`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
                },
                body: JSON.stringify({
                  name: text.slice(0, 18)
                })
              });
            }
            loadAgentSessions(agentId);
          }
        });
      } finally {
        btn.disabled = false;
      }
    }

    // Resume an interrupted (non-success) assistant reply: re-stream from the model with
    // the partial reply as context and keep upserting the SAME message row, so the bubble
    // grows in place instead of appending a second message.
    async function continueAssistantMessage(messageId, view, existingBubble) {
      const sessionId = state.activeSessionId;
      if (!sessionId) return;

      const btn = document.getElementById(\`\${view}-send-button\`);
      btn.disabled = true;

      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${sessionId}/messages\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const data = await res.json();
        const messages = (data.messages || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const target = messages.find(m => m.id === messageId);
        if (!target) return;

        // Rebuild the conversation up to the interrupted reply: every message before it,
        // then the partial reply itself, then an instruction to continue from where it
        // stopped without repeating what was already said.
        const chatMessages = [{ role: 'system', content: getSystemPrompt(view) }];
        for (const m of messages) {
          if (m === target) break;
          if (m.role === 'user') {
            chatMessages.push({ role: 'user', content: extractTextFromMessageData(m.data) });
          } else if (m.role === 'assistant') {
            const { text } = extractTextAndReasoning(m.data);
            if (text) chatMessages.push({ role: 'assistant', content: text });
          }
        }
        const { text: partialText, reasoning: partialThinking } = extractTextAndReasoning(target.data);
        if (partialText) chatMessages.push({ role: 'assistant', content: partialText });
        chatMessages.push({
          role: 'user',
          content: '你上面的回复被中断了。请从被中断的地方继续写下去，直接接着未完成的内容继续，不要重复已经说过的部分。'
        });

        // Reuse the interrupted message's bubble (drop the hint) so the reply grows in
        // place; fall back to a fresh bubble when called without one.
        let bubble = existingBubble;
        if (bubble) {
          const hint = bubble.querySelector('.interrupted-hint');
          if (hint) hint.remove();
        } else {
          const chatBox = document.getElementById(\`\${view}-chat-box\`);
          bubble = appendMessageBubble(chatBox, 'assistant', '', view);
        }
        renderAssistantMarkdown(bubble, partialText, partialThinking);
        const chatBox = document.getElementById(\`\${view}-chat-box\`);
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

        await streamAssistantReply({
          view,
          sessionId,
          messageId,
          bubble,
          chatMessages,
          initialText: partialText,
          initialThinking: partialThinking
        });
      } catch (e) {
        console.warn('Failed to continue assistant message', e);
      } finally {
        btn.disabled = false;
      }
    }

    function appendMessageBubble(container, role, html, view = 'clinic') {
      const item = document.createElement('div');
      item.className = \`message-item \${role}\`;

      const avatar = document.createElement('div');
      avatar.className = \`msg-avatar \${role === 'user' ? 'user' : view}\`;
      avatar.innerHTML = role === 'user'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        : (view === 'clinic'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>');

      const bubbleBox = document.createElement('div');
      bubbleBox.className = 'msg-bubble-box';

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.innerHTML = html;

      bubbleBox.appendChild(bubble);
      item.appendChild(avatar);
      item.appendChild(bubbleBox);
      container.appendChild(item);
      return bubble;
    }

    function renderAssistantMarkdown(bubble, content, thinking) {
      let html = '';
      if (thinking) {
        html += \`
          <div class="thinking-accordion">
            <div class="thinking-accordion-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
              <div class="thinking-title-left">
                <span class="thinking-pulse-dot"></span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5 5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Z"/><path d="M12 13a7 7 0 0 0-7 7v2h14v-2a7 7 0 0 0-7-7Z"/></svg>
                思考链分析
              </div>
              <span>展开/收起 ▾</span>
            </div>
            <div class="thinking-accordion-content">\${escapeHtml(thinking)}</div>
          </div>
        \`;
      }
      if (content) {
        html += marked.parse(content);
      }
      bubble.innerHTML = html || '<span style="color:var(--text-muted)">...</span>';
    }

    function escapeHtml(s) {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ==========================================
    // Knowledge Base Browser
    // ==========================================
    const DEFAULT_KB = [
      { id: '1', title: '中国干眼专家共识：定义与分型', desc: '干眼是多因素引起的慢性眼表疾病，主要分为水液缺乏型、脂质异常型、黏蛋白缺乏型及混合型。' },
      { id: '2', title: '睑板腺功能障碍 (MGD) 诊疗规范', desc: 'MGD 是蒸发过强型干眼最主要的病因，核心物理疗法包括睑板腺恒温热敷（40-45℃）与睑缘清洁。' },
      { id: '3', title: '人工泪液临床选择与使用说明', desc: '轻度干眼优先选用低粘度无防腐剂玻璃酸钠；中重度或伴有角膜上皮损伤可选用卡波姆或自体血清。' },
      { id: '4', title: '20-20-20 视疲劳防护法则', desc: '每用眼 20 分钟，眺望 20 英尺（约 6 米）外的远处至少 20 秒，帮助睫状肌与眼睑泪膜恢复。' }
    ];

    async function initKnowledge() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/knowledge-bases\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          const list = (data.items && data.items.length > 0) ? data.items : DEFAULT_KB;
          renderKnowledgeGrid(list);
        } else {
          renderKnowledgeGrid(DEFAULT_KB);
        }
      } catch (e) {
        renderKnowledgeGrid(DEFAULT_KB);
      }
    }

    function renderKnowledgeGrid(items) {
      const grid = document.getElementById('kb-grid-area');
      grid.innerHTML = '';
      items.forEach(k => {
        const card = document.createElement('div');
        card.className = 'kb-card';
        card.innerHTML = \`
          <div>
            <div class="kb-card-title">\${escapeHtml(k.title || k.name)}</div>
            <div class="kb-card-desc" style="margin-top:8px;">\${escapeHtml(k.desc || k.description || '')}</div>
          </div>
          <button class="composer-btn-mini" onclick="askKbTopic('\${escapeHtml(k.title || k.name)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/></svg>
            在科普AI中探讨此主题
          </button>
        \`;
        grid.appendChild(card);
      });
    }

    async function filterKnowledge() {
      const q = document.getElementById('kb-search-box').value.trim();
      if (!q) {
        initKnowledge();
        return;
      }
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/knowledge-bases/search\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({ query: q, limit: 10 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            renderKnowledgeGrid(data.results.map(r => ({
              id: r.id,
              title: r.documentTitle || r.title || '专科知识条目',
              desc: r.snippet || r.content || ''
            })));
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
      const match = DEFAULT_KB.filter(k => k.title.includes(q) || k.desc.includes(q));
      renderKnowledgeGrid(match);
    }

    function askKbTopic(t) {
      const sciRail = document.querySelector('[data-view="science"]');
      if (sciRail) sciRail.click();
      const sinp = document.getElementById('science-text-input');
      sinp.value = \`请为我详细讲解关于「\${t}」的眼科医学科普知识与护理建议。\`;
      sinp.focus();
    }

    // ==========================================
    // Dynamic Model Registry
    // ==========================================
    async function fetchModels() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/models\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            let models = data.data;
            // Normalize field names from the gateway response
            models = models.map((m) => ({
              ...m,
              name: m.name || m.id,
              provider_name: m.provider_name || m.owned_by || m.provider_id || '本地模型'
            }));
            // Sort providers alphabetically, then models by name
            models.sort((a, b) => {
              const pa = a.provider_name.toLowerCase();
              const pb = b.provider_name.toLowerCase();
              if (pa !== pb) return pa.localeCompare(pb);
              return (a.name || a.id).localeCompare(b.name || b.id);
            });
            state.availableModels = models;

            // If no model selected yet, default to the first one
            if (!state.selectedModelId && models.length > 0) {
              state.selectedModelId = models[0].id;
              localStorage.setItem('huatuo_current_model', state.selectedModelId);
            }

            renderModelDropdown(models, state.selectedModelId);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch models from gateway', e);
      }
    }

    function getSelectedModelId() {
      const fallback = state.availableModels && state.availableModels[0]?.id;
      if (state.selectedModelId) {
        const stillAvailable = state.availableModels.some((m) => m.id === state.selectedModelId);
        if (stillAvailable) return state.selectedModelId;
      }
      return fallback || (state.currentView === 'clinic' ? state.clinicModel : state.scienceModel);
    }

    function renderModelDropdown(models, selectedId) {
      const menu = document.getElementById('model-dropdown-menu');
      menu.innerHTML = '';

      // Group by provider name (human-readable provider label)
      const groups = new Map();
      models.forEach(m => {
        const providerName = m.provider_name || '本地模型';
        if (!groups.has(providerName)) groups.set(providerName, []);
        groups.get(providerName).push(m);
      });

      Array.from(groups.entries()).forEach(([providerName, providerModels]) => {
        const header = document.createElement('div');
        header.className = 'model-group-header';
        header.textContent = providerName;
        menu.appendChild(header);

        providerModels.forEach(m => {
          const isSelected = m.id === selectedId;
          const item = document.createElement('div');
          item.className = \`model-menu-item \${isSelected ? 'selected' : ''}\`;
          item.dataset.modelId = m.id;
          item.onclick = () => selectModel(m.id);

          const left = document.createElement('div');
          left.className = 'model-item-left';

          const indicator = document.createElement('span');
          indicator.className = 'model-active-indicator';
          indicator.style.visibility = isSelected ? 'visible' : 'hidden';

          const icon = document.createElement('span');
          icon.className = 'model-item-icon';
          icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5 5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Z"/><path d="M12 13a7 7 0 0 0-7 7v2h14v-2a7 7 0 0 0-7-7Z"/></svg>';

          const title = document.createElement('span');
          title.className = 'model-item-title';
          title.textContent = m.name || m.id;

          left.appendChild(indicator);
          left.appendChild(icon);
          left.appendChild(title);

          item.appendChild(left);
          menu.appendChild(item);
        });
      });

      updateSelectedModelLabel(selectedId);
    }

    function selectModel(id) {
      state.selectedModelId = id;
      localStorage.setItem('huatuo_current_model', id);
      renderModelDropdown(state.availableModels, id);
      updateSelectedModelLabel(id);
      toggleModelDropdown();
    }

    function updateSelectedModelLabel(id) {
      const selectedNameEl = document.getElementById('model-selected-name');
      const model = state.availableModels.find(m => m.id === id);
      const label = model ? (model.name || model.id) : '选择模型';
      selectedNameEl.textContent = label;
      selectedNameEl.title = id || '';
    }

    function toggleModelDropdown(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('model-dropdown-menu');
      menu.classList.toggle('show');
    }

    // Close model dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrapper = document.querySelector('.model-selector-wrapper');
      const menu = document.getElementById('model-dropdown-menu');
      if (wrapper && !wrapper.contains(e.target) && menu.classList.contains('show')) {
        menu.classList.remove('show');
      }
    });

    // ==========================================
    // Settings Module
    // ==========================================
    function initSettings() {
      document.getElementById('cfg-base-url').value = state.baseUrl;
      document.getElementById('cfg-api-key').value = state.apiKey;
      document.getElementById('cfg-clinic-model').value = state.clinicModel;
      document.getElementById('cfg-science-model').value = state.scienceModel;
    }

    function saveConfiguration() {
      state.baseUrl = document.getElementById('cfg-base-url').value.trim() || window.location.origin;
      state.apiKey = document.getElementById('cfg-api-key').value.trim();
      state.clinicModel = document.getElementById('cfg-clinic-model').value.trim() || 'clinic';
      state.scienceModel = document.getElementById('cfg-science-model').value.trim() || 'pop-science';

      localStorage.setItem('huatuo_base_url', state.baseUrl);
      localStorage.setItem('huatuo_api_key', state.apiKey);
      localStorage.setItem('huatuo_clinic_model', state.clinicModel);
      localStorage.setItem('huatuo_science_model', state.scienceModel);

      alert('配置已成功保存！');
      refreshAllData();
    }
  </script>
</body>
</html>`
}
