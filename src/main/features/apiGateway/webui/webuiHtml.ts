/**
 * WebUI Single Page Application for HuaTuo Studio / Cherry Studio.
 * Features:
 * 1. Deep UI/UX alignment with Cherry Studio / HuaTuo desktop application
 * 2. Complete data sharing with desktop SQLite database (Chat sessions, Questionnaires, Knowledge bases, Models)
 */

export function renderWebUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>华佗 AI - WebUI 智能工作台</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
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
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08);
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 14px;
      --radius-full: 9999px;
      --sidebar-width: 64px;
      --subsidebar-width: 240px;
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
      display: flex;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    #app-container {
      display: flex;
      width: 100%;
      height: 100%;
    }

    /* Primary Activity Bar (Desktop App Left Rail) */
    .activity-bar {
      width: var(--sidebar-width);
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 0;
      flex-shrink: 0;
      z-index: 30;
      justify-content: space-between;
    }

    .activity-top {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .app-brand-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0284c7 0%, #059669 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 22px;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);
      cursor: pointer;
      margin-bottom: 6px;
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
      transition: all 0.15s ease;
      position: relative;
      user-select: none;
      border: 1px solid transparent;
    }

    .rail-btn:hover {
      background-color: var(--bg-muted);
      color: var(--text-main);
    }

    .rail-btn.active {
      background-color: var(--primary-light);
      color: var(--primary-text);
      border-color: rgba(2, 132, 199, 0.2);
    }

    .rail-btn .icon {
      font-size: 20px;
    }

    .rail-btn .label {
      font-size: 9px;
      margin-top: 2px;
      font-weight: 600;
    }

    .activity-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .user-avatar-rail {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Secondary Sidebar (Conversation / History Rail) */
    .secondary-sidebar {
      width: var(--subsidebar-width);
      background-color: var(--bg-secondary-sidebar);
      border-right: 1px solid var(--border-main);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.2s ease, transform 0.2s ease;
      z-index: 20;
    }

    .secondary-sidebar.hidden {
      display: none;
    }

    .subsidebar-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .subsidebar-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-new-chat {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-new-chat:hover {
      background-color: var(--primary-hover);
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary);
      transition: all 0.15s ease;
      border: 1px solid transparent;
      user-select: none;
    }

    .session-item:hover {
      background-color: var(--bg-muted);
      color: var(--text-main);
    }

    .session-item.active {
      background-color: var(--bg-surface);
      border-color: var(--border-main);
      color: var(--text-main);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    .session-item-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .session-item-delete {
      opacity: 0;
      font-size: 14px;
      padding: 2px 4px;
      color: var(--text-muted);
      transition: opacity 0.15s ease;
    }

    .session-item:hover .session-item-delete {
      opacity: 1;
    }

    .session-item-delete:hover {
      color: var(--danger);
    }

    /* Main Workspace */
    .main-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      position: relative;
      background-color: var(--bg-surface);
    }

    /* Header Bar */
    .top-header {
      height: 52px;
      border-bottom: 1px solid var(--border-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      background-color: var(--bg-surface);
      flex-shrink: 0;
    }

    .header-left-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .view-title-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .view-main-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .header-right-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .model-select-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-size: 12px;
    }

    .model-select {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }

    .btn-header-action {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-header-action:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    /* Views */
    .view-pane {
      flex: 1;
      height: calc(100% - 52px);
      overflow-y: auto;
      display: none;
    }

    .view-pane.active {
      display: flex;
      flex-direction: column;
    }

    /* Chat Layout */
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      padding: 0 20px;
    }

    .triage-alert-banner {
      background-color: var(--danger-light);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--danger);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      margin-top: 12px;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .messages-scroll-area {
      flex: 1;
      overflow-y: auto;
      padding: 18px 0;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .message-item {
      display: flex;
      gap: 12px;
      max-width: 88%;
      animation: messageSlideIn 0.2s ease;
    }

    @keyframes messageSlideIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message-item.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .message-item.assistant {
      align-self: flex-start;
    }

    .msg-avatar {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .msg-avatar.user {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }

    .msg-avatar.clinic {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
    }

    .msg-avatar.science {
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      color: white;
    }

    .msg-bubble-box {
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      font-size: 13.5px;
      line-height: 1.6;
      box-shadow: var(--shadow-sm);
    }

    .message-item.user .msg-bubble-box {
      background-color: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message-item.assistant .msg-bubble-box {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      color: var(--text-main);
      border-bottom-left-radius: 4px;
    }

    .msg-bubble-box p { margin-bottom: 8px; }
    .msg-bubble-box p:last-child { margin-bottom: 0; }
    .msg-bubble-box ul, .msg-bubble-box ol { margin-left: 20px; margin-bottom: 8px; }
    .msg-bubble-box code {
      background: rgba(0, 0, 0, 0.06);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    [data-theme='dark'] .msg-bubble-box code { background: rgba(255, 255, 255, 0.12); }
    .msg-bubble-box table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12.5px; }
    .msg-bubble-box th, .msg-bubble-box td { border: 1px solid var(--border-main); padding: 6px 10px; }
    .msg-bubble-box th { background: var(--bg-muted); }

    .thinking-accordion {
      margin-bottom: 8px;
      padding: 6px 10px;
      background-color: var(--bg-muted);
      border-left: 3px solid var(--science-accent);
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-muted);
    }
    .thinking-accordion summary { cursor: pointer; font-weight: 600; outline: none; }
    .thinking-accordion-content { margin-top: 6px; white-space: pre-wrap; max-height: 160px; overflow-y: auto; }

    .chips-recommend-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-bottom: 8px;
    }

    .prompt-chip {
      padding: 4px 10px;
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-full);
      font-size: 11.5px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .prompt-chip:hover {
      background-color: var(--primary-light);
      color: var(--primary-text);
      border-color: var(--primary);
    }

    .composer-wrapper {
      padding-bottom: 16px;
    }

    .composer-shell {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
    }

    .composer-shell:focus-within {
      border-color: var(--primary);
    }

    .composer-textarea {
      width: 100%;
      min-height: 54px;
      max-height: 180px;
      border: none;
      padding: 12px 14px;
      background: transparent;
      color: var(--text-main);
      font-family: inherit;
      font-size: 13.5px;
      outline: none;
      resize: none;
    }

    .composer-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      border-top: 1px solid var(--border-subtle);
    }

    .composer-tool-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .composer-btn-mini {
      padding: 4px 8px;
      font-size: 11.5px;
      border-radius: var(--radius-md);
      background-color: var(--bg-muted);
      border: 1px solid var(--border-main);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .composer-btn-mini:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .btn-send-main {
      padding: 6px 16px;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-send-main:hover {
      background-color: var(--primary-hover);
    }

    .btn-send-main:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Questionnaire Page */
    .questionnaire-layout {
      max-width: 880px;
      margin: 20px auto;
      padding: 0 20px;
      width: 100%;
    }

    .q-tabs-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--border-main);
      padding-bottom: 10px;
    }

    .q-tab-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .q-tab-btn.active {
      background-color: var(--primary-light);
      color: var(--primary-text);
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
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-main);
    }

    .q-progress-rail {
      width: 100%;
      height: 6px;
      background-color: var(--bg-muted);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 20px;
    }

    .q-progress-rail-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7, #059669);
      transition: width 0.25s ease;
    }

    .q-item-group {
      margin-bottom: 18px;
    }

    .q-item-title {
      font-size: 13.5px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .q-scale-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }

    .q-scale-chip {
      padding: 10px 12px;
      background-color: var(--bg-muted);
      border: 1.5px solid var(--border-main);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      text-align: center;
      user-select: none;
      transition: all 0.15s ease;
    }

    .q-scale-chip:hover {
      border-color: var(--primary);
      background-color: var(--primary-light);
    }

    .q-scale-chip.selected {
      border-color: var(--primary);
      background-color: var(--primary-light);
      color: var(--primary-text);
      font-weight: 700;
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
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .history-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    /* Knowledge & Settings */
    .knowledge-layout, .settings-layout {
      max-width: 900px;
      margin: 20px auto;
      padding: 0 20px;
      width: 100%;
    }

    .kb-search-container {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .kb-input-box {
      flex: 1;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-main);
      background-color: var(--bg-card);
      color: var(--text-main);
      font-size: 13.5px;
      outline: none;
    }

    .kb-articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }

    .kb-article-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kb-article-tag {
      align-self: flex-start;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      background-color: var(--science-light);
      color: var(--science-accent);
      font-weight: 600;
    }

    .settings-group-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-main);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 18px;
    }

    .settings-group-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-main);
    }

    .settings-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .settings-field label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .settings-field input, .settings-field select {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-main);
      background-color: var(--bg-surface);
      color: var(--text-main);
      font-size: 13px;
      outline: none;
    }
  </style>
</head>
<body>
  <div id="app-container">
    <!-- Primary Activity Bar -->
    <nav class="activity-bar">
      <div class="activity-top">
        <div class="app-brand-logo" title="华佗 AI">🩺</div>
        
        <div class="rail-btn active" data-view="clinic" title="智能问诊 AI">
          <span class="icon">🩺</span>
          <span class="label">问诊</span>
        </div>

        <div class="rail-btn" data-view="science" title="科普知识 AI">
          <span class="icon">🔬</span>
          <span class="label">科普</span>
        </div>

        <div class="rail-btn" data-view="questionnaire" title="干眼问卷评估">
          <span class="icon">📋</span>
          <span class="label">问卷</span>
        </div>

        <div class="rail-btn" data-view="knowledge" title="专科知识库">
          <span class="icon">📚</span>
          <span class="label">知识库</span>
        </div>

        <div class="rail-btn" data-view="settings" title="系统与模型设置">
          <span class="icon">⚙️</span>
          <span class="label">设置</span>
        </div>
      </div>

      <div class="activity-bottom">
        <div class="user-avatar-rail" id="user-avatar" title="用户资料">用</div>
      </div>
    </nav>

    <!-- Secondary Conversation Rail (Desktop-Aligned Session Drawer) -->
    <aside class="secondary-sidebar" id="subsidebar">
      <div class="subsidebar-header">
        <span class="subsidebar-title" id="subsidebar-title">问诊会话列表</span>
        <button class="btn-new-chat" onclick="createNewSession()">+ 新对话</button>
      </div>

      <div class="session-list" id="session-list-container">
        <!-- Loaded sessions from DB inserted here -->
      </div>
    </aside>

    <!-- Main Workspace -->
    <main class="main-workspace">
      <!-- Top Header -->
      <header class="top-header">
        <div class="header-left-group">
          <span class="view-main-title" id="header-title">智能问诊 AI</span>
          <span class="view-title-badge" id="header-badge" style="background: var(--clinic-light); color: var(--clinic-accent);">专科分诊</span>
        </div>

        <div class="header-right-group">
          <div class="model-select-box">
            <span>🤖 模型:</span>
            <select class="model-select" id="model-select-el">
              <option value="clinic">问诊AI (专科内置)</option>
              <option value="pop-science">科普AI (专科内置)</option>
            </select>
          </div>
          <button class="btn-header-action" id="theme-toggle-btn" title="切换暗黑/浅色模式">🌓</button>
          <button class="btn-header-action" onclick="refreshAllData()" title="同步桌面数据库数据">🔄</button>
        </div>
      </header>

      <!-- View: 智能问诊 AI -->
      <section class="view-pane active" id="pane-clinic">
        <div class="chat-container">
          <div class="triage-alert-banner">
            <span>🚨 <strong>就诊提示：</strong>如出现突发视力骤降、剧烈眼痛伴恶心呕吐、化学品入眼或角膜明显损伤，请立即前往医院眼科急诊！</span>
          </div>

          <div class="messages-scroll-area" id="clinic-chat-box">
            <div class="message-item assistant">
              <div class="msg-avatar clinic">🩺</div>
              <div class="msg-bubble-box">
                <p>您好！我是<strong>干眼症专科问诊AI</strong>。我已连接桌面端数据库，可帮助您在就医前梳理病情、解读问卷报告，并提供分诊建议。</p>
                <p>请问您最近眼睛有哪些不舒服？（如干涩、异物感、眼红、视疲劳等）</p>
              </div>
            </div>
          </div>

          <div class="chips-recommend-bar">
            <div class="prompt-chip" onclick="applyQuickPrompt('眼睛经常干涩、有磨痛异物感，下午和面对电脑时加重，怎么缓解？')">👀 眼睛干涩有异物感</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('佩戴隐形眼镜超过6小时后眼睛发红刺痛，需要停戴或换镜片吗？')">👓 佩戴接触镜干痛</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('早晨起床时睁眼困难，眼角有黏性白色分泌物，属于什么问题？')">😴 晨起睁眼困难</div>
            <div class="prompt-chip" onclick="applyQuickPrompt('眨眼后看东西能短暂清晰几秒，之后又模糊，是干眼还是近视加深？')">🌊 视力波动眨眼后清晰</div>
          </div>

          <div class="composer-wrapper">
            <div class="composer-shell">
              <textarea class="composer-textarea" id="clinic-text-input" placeholder="输入您的症状描述... (Shift+Enter换行，Enter发送)"></textarea>
              <div class="composer-toolbar">
                <div class="composer-tool-group">
                  <button class="composer-btn-mini" onclick="insertLatestReportIntoComposer()">📋 插入最新问卷报告</button>
                  <button class="composer-btn-mini" onclick="createNewSession()">+ 新建会话</button>
                </div>
                <button class="btn-send-main" id="clinic-send-button" onclick="sendChatMessage('clinic')">发送 ✈️</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View: 科普知识 AI -->
      <section class="view-pane" id="pane-science">
        <div class="chat-container">
          <div class="messages-scroll-area" id="science-chat-box">
            <div class="message-item assistant">
              <div class="msg-avatar science">🔬</div>
              <div class="msg-bubble-box">
                <p>您好！我是<strong>干眼科普助手</strong>，已绑定专科知识库。我可以为您解答干眼症的诱因、分类、人工泪液挑选与日常用眼保健常识。</p>
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
              <textarea class="composer-textarea" id="science-text-input" placeholder="向科普AI提问干眼健康知识..."></textarea>
              <div class="composer-toolbar">
                <div class="composer-tool-group">
                  <button class="composer-btn-mini" onclick="createNewSession()">+ 新建会话</button>
                </div>
                <button class="btn-send-main" id="science-send-button" onclick="sendChatMessage('science')">发送 ✈️</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View: 问卷评估 (支持与桌面 SQLite 历史同步) -->
      <section class="view-pane" id="pane-questionnaire">
        <div class="questionnaire-layout">
          <div class="q-tabs-nav">
            <div class="q-tab-btn active" id="q-tab-form-btn" onclick="switchQTab('form')">📝 开始问卷自测</div>
            <div class="q-tab-btn" id="q-tab-history-btn" onclick="switchQTab('history')">📜 历史测评记录 (桌面数据库同步)</div>
          </div>

          <div id="q-form-area">
            <!-- Dynamic Questionnaire Form / Report rendered by JS -->
          </div>

          <div id="q-history-area" style="display: none;">
            <div id="q-history-list">
              <!-- Loaded questionnaire records from SQLite inserted here -->
            </div>
          </div>
        </div>
      </section>

      <!-- View: 专科知识库 -->
      <section class="view-pane" id="pane-knowledge">
        <div class="knowledge-layout">
          <div class="kb-search-container">
            <input type="text" class="kb-input-box" id="kb-search-box" placeholder="搜索干眼专科知识库（如：睑板腺、人工泪液、强脉冲光、泪膜破裂时间）..." />
            <button class="btn-send-main" onclick="executeKnowledgeSearch()">🔍 检索</button>
          </div>
          <div class="kb-articles-grid" id="kb-grid-area">
            <!-- Knowledge cards -->
          </div>
        </div>
      </section>

      <!-- View: 系统设置 -->
      <section class="view-pane" id="pane-settings">
        <div class="settings-layout">
          <div class="settings-group-card">
            <div class="settings-group-title">🌐 API 网关与桌面端服务同步</div>
            <div class="settings-field">
              <label>API Gateway Base URL</label>
              <input type="text" id="cfg-base-url" placeholder="http://127.0.0.1:23333" />
            </div>
            <div class="settings-field">
              <label>API Key / 鉴权 Token (可选)</label>
              <input type="password" id="cfg-api-key" placeholder="Bearer Token" />
            </div>
            <button class="btn-new-chat" onclick="saveConfiguration()">💾 保存配置并刷新同步</button>
          </div>

          <div class="settings-group-card">
            <div class="settings-group-title">🤖 专科模型标识</div>
            <div class="settings-field">
              <label>问诊AI 模型标识</label>
              <input type="text" id="cfg-clinic-model" value="clinic" />
            </div>
            <div class="settings-field">
              <label>科普AI 模型标识</label>
              <input type="text" id="cfg-science-model" value="pop-science" />
            </div>
            <button class="btn-new-chat" onclick="saveConfiguration()">💾 保存模型设定</button>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    // State Store
    const state = {
      theme: localStorage.getItem('huatuo_theme') || 'light',
      currentView: 'clinic',
      qTab: 'form',
      baseUrl: localStorage.getItem('huatuo_base_url') || window.location.origin,
      apiKey: localStorage.getItem('huatuo_api_key') || '',
      clinicModel: localStorage.getItem('huatuo_clinic_model') || 'clinic',
      scienceModel: localStorage.getItem('huatuo_science_model') || 'pop-science',
      activeSessionId: null,
      sessions: {
        clinic: [],
        'pop-science': []
      },
      messages: [],
      latestReportText: localStorage.getItem('huatuo_latest_report') || '',
      questionnaireHistory: [],
      // Questionnaire Form
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
      document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('huatuo_theme', state.theme);
      });
    }

    function initNav() {
      const railBtns = document.querySelectorAll('.rail-btn');
      const panes = document.querySelectorAll('.view-pane');
      const subsidebar = document.getElementById('subsidebar');
      const headerTitle = document.getElementById('header-title');
      const headerBadge = document.getElementById('header-badge');
      const subsidebarTitle = document.getElementById('subsidebar-title');

      const metaMap = {
        clinic: { title: '智能问诊 AI', badge: '专科分诊', badgeBg: 'var(--clinic-light)', badgeColor: 'var(--clinic-accent)', subTitle: '问诊会话列表', showSub: true },
        science: { title: '科普知识 AI', badge: '专科百科', badgeBg: 'var(--science-light)', badgeColor: 'var(--science-accent)', subTitle: '科普会话列表', showSub: true },
        questionnaire: { title: '干眼专科问卷评估', badge: '多维量表', badgeBg: 'var(--primary-light)', badgeColor: 'var(--primary)', showSub: false },
        knowledge: { title: '专科知识库检索', badge: 'Dry-Eye-Syndrome', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-main)', showSub: false },
        settings: { title: '系统与模型设置', badge: '配置中心', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-muted)', showSub: false }
      };

      railBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.getAttribute('data-view');
          state.currentView = view;

          railBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          panes.forEach(p => p.classList.remove('active'));
          const targetPane = document.getElementById(\`pane-\${view}\`);
          if (targetPane) targetPane.classList.add('active');

          const meta = metaMap[view];
          headerTitle.textContent = meta.title;
          headerBadge.textContent = meta.badge;
          headerBadge.style.background = meta.badgeBg;
          headerBadge.style.color = meta.badgeColor;

          if (meta.showSub) {
            subsidebar.classList.remove('hidden');
            subsidebarTitle.textContent = meta.subTitle;
            loadAgentSessions(view === 'clinic' ? 'clinic' : 'pop-science');
          } else {
            subsidebar.classList.add('hidden');
          }
        });
      });
    }

    async function refreshAllData() {
      await fetchModels();
      if (state.currentView === 'clinic' || state.currentView === 'science') {
        loadAgentSessions(state.currentView === 'clinic' ? 'clinic' : 'pop-science');
      }
      loadQuestionnaireHistory();
    }

    // ==========================================
    // Data Sharing: Agent Sessions (SQLite)
    // ==========================================
    async function loadAgentSessions(agentId) {
      const container = document.getElementById('session-list-container');
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/agent-sessions?agentId=\${agentId}\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          state.sessions[agentId] = data.sessions || [];
          renderSessionList(agentId);
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
        container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px;">暂无历史会话</div>';
        return;
      }

      list.forEach(sess => {
        const item = document.createElement('div');
        item.className = \`session-item \${sess.id === state.activeSessionId ? 'active' : ''}\`;
        item.innerHTML = \`
          <span class="session-item-text">💬 \${sess.name || '新会话'}</span>
          <span class="session-item-delete" onclick="deleteSession('\${sess.id}', event)">✕</span>
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
      if (!confirm('确定删除此会话吗？')) return;
      try {
        await fetch(\`\${state.baseUrl}/v1/agent-sessions/\${id}\`, {
          method: 'DELETE',
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
        if (state.activeSessionId === id) state.activeSessionId = null;
        loadAgentSessions(agentId);
      } catch (err) {
        alert('删除失败: ' + err.message);
      }
    }

    function selectSession(id) {
      state.activeSessionId = id;
      const agentId = state.currentView === 'clinic' ? 'clinic' : 'pop-science';
      renderSessionList(agentId);
    }

    function clearChatDisplay(view) {
      const box = document.getElementById(\`\${view}-chat-box\`);
      const first = box.firstElementChild;
      box.innerHTML = '';
      if (first) box.appendChild(first);
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
        container.innerHTML = '<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:30px;">暂无历史问卷记录</div>';
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
            <div style="font-size:14px; font-weight:700; margin-bottom:4px">
              \${s.flowQuestionnaireId || '干眼综合测评'}
              <span class="history-badge" style="background:var(--primary-light); color:var(--primary-text); margin-left:8px">\${level}</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted)">
              提交时间: \${new Date(s.createdAt).toLocaleString()} | 总分: \${score}
            </div>
          </div>
          <div style="display:flex; gap:8px">
            <button class="composer-btn-mini" onclick="loadHistoryToChat('\${s.id}')">🚀 发送至问诊AI</button>
            <button class="composer-btn-mini" style="color:var(--danger)" onclick="deleteQuestionnaireRecord('\${s.id}')">🗑️ 删除</button>
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
        alert('此记录无完整报告');
        return;
      }
      state.latestReportText = \`患者问卷报告：\${record.report.levelText}，总分 \${record.report.totalScore} 分。\\n\${record.report.assessmentDesc || ''}\`;
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
              <div style="font-size:15px; font-weight:700">阶段一：患者基本信息与背景筛查</div>
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
                <div class="q-scale-chip \${state.qData.screenHours <= 4 ? 'selected' : ''}" onclick="setQField('screenHours', 3)">< 4 小时</div>
                <div class="q-scale-chip \${state.qData.screenHours > 4 && state.qData.screenHours <= 8 ? 'selected' : ''}" onclick="setQField('screenHours', 6)">4 - 8 小时</div>
                <div class="q-scale-chip \${state.qData.screenHours > 8 ? 'selected' : ''}" onclick="setQField('screenHours', 10)">> 8 小时 (高频)</div>
              </div>
            </div>

            <div class="q-item-group">
              <div class="q-item-title">是否佩戴隐形眼镜 / 接触镜？</div>
              <div class="q-scale-row">
                <div class="q-scale-chip \${state.qData.contactLenses === 'yes' ? 'selected' : ''}" onclick="setQField('contactLenses', 'yes')">是 (每周≥3天)</div>
                <div class="q-scale-chip \${state.qData.contactLenses === 'no' ? 'selected' : ''}" onclick="setQField('contactLenses', 'no')">否 (无佩戴)</div>
              </div>
            </div>

            <div class="q-btn-row">
              <div></div>
              <button class="btn-send-main" onclick="state.qStep=1; renderQuestionnaire();">下一步：填写中国干眼问卷 ➔</button>
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
              <div style="font-size:15px; font-weight:700">阶段二：中国干眼调查问卷 (12项症状量表)</div>
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
        assessmentDesc = '总分显著升高，症状严重且严重干扰日常用眼生活，强烈建议近期前往眼科干眼门诊进行睑板腺与泪膜专业检查。';
      } else if (totalScore >= 13) {
        levelText = '中度干眼 (Moderate Dry Eye)';
        assessmentDesc = '总分处于中度范围，有明显的眼表不适与视疲劳影响，建议眼科门诊就医并排查脂质异常或水液缺乏。';
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
        \`问卷流程：中国干眼调查问卷 (12题标准量表)\`,
        \`测评总分：\${totalScore} 分 (满分48分)\`,
        \`临床分级：\${levelText}\`,
        \`危险因素：\${risks.join('、') || '暂无明显外部诱因'}\`
      ].join('\\n');
      localStorage.setItem('huatuo_latest_report', state.latestReportText);

      // Persist to desktop SQLite database via API Gateway!
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
      const r = state.currentReport;
      let tagsHtml = r.risks.map(t => \`<span class="history-badge" style="background:var(--warning-light); color:#b45309; margin-right:6px;">⚠️ \${t}</span>\`).join('');

      container.innerHTML = \`
        <div class="q-card-box">
          <div class="q-step-header">
            <div style="font-size:16px; font-weight:700">📊 干眼专科综合评估报告</div>
            <span class="history-badge" style="background:var(--clinic-light); color:var(--clinic-accent)">已同步至桌面数据库</span>
          </div>

          <div style="background:var(--bg-muted); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
            <div>
              <div style="font-size:12px; color:var(--text-muted)">临床分级</div>
              <div style="font-size:18px; font-weight:800; margin-top:2px">\${r.levelText}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px; color:var(--text-muted)">问卷量表总分</div>
              <div style="font-size:22px; font-weight:800; color:var(--primary)">\${r.totalScore} <span style="font-size:12px; font-weight:normal">/ 48</span></div>
            </div>
          </div>

          <div style="font-size:13.5px; line-height:1.6; margin-bottom:14px;">
            <strong>📋 评估解读：</strong>\${r.assessmentDesc}
          </div>

          <div style="margin-bottom:20px;">
            <strong>🚩 筛查诱因：</strong>\${tagsHtml || '<span style="font-size:12px; color:var(--text-muted)">无突出诱因</span>'}
          </div>

          <div class="q-btn-row" style="border-top:1px solid var(--border-main); padding-top:16px">
            <button class="composer-btn-mini" onclick="state.qStep=0; renderQuestionnaire();">🔄 重新测评</button>
            <div style="display:flex; gap:10px">
              <button class="composer-btn-mini" onclick="navigator.clipboard.writeText(state.latestReportText); alert('已复制到剪贴板！');">📋 复制报告文本</button>
              <button class="btn-send-main" onclick="sendReportToClinicChat()">🚀 发送至问诊AI深入分析</button>
            </div>
          </div>
        </div>
      \`;
    }

    function sendReportToClinicChat() {
      const clinicRail = document.querySelector('[data-view="clinic"]');
      if (clinicRail) clinicRail.click();
      insertLatestReportIntoComposer();
    }

    function insertLatestReportIntoComposer() {
      if (!state.latestReportText) {
        alert('暂无问卷报告，请先完成问卷测评！');
        return;
      }
      const inp = document.getElementById('clinic-text-input');
      inp.value = state.latestReportText + '\\n\\n请帮我解读这份问卷报告，并给出分诊与就诊建议。';
      inp.focus();
    }

    // ==========================================
    // Chat & Model Streaming
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

    function applySciencePrompt(p) {
      const inp = document.getElementById('science-text-input');
      inp.value = p;
      inp.focus();
    }

    async function sendChatMessage(view) {
      const inp = document.getElementById(\`\${view}-text-input\`);
      const text = inp.value.trim();
      if (!text) return;

      const btn = document.getElementById(\`\${view}-send-button\`);
      btn.disabled = true;
      inp.value = '';

      const chatBox = document.getElementById(\`\${view}-chat-box\`);
      appendMessageBubble(chatBox, 'user', text);

      const assistantBubble = appendMessageBubble(chatBox, 'assistant', '<span style="color:var(--text-muted)">正在思考回答...</span>', view);
      chatBox.scrollTop = chatBox.scrollHeight;

      try {
        const model = document.getElementById('model-select-el').value || (view === 'clinic' ? state.clinicModel : state.scienceModel);
        const systemPrompt = view === 'clinic'
          ? '你是一位干眼症专科问诊AI，主要帮助有干眼症状的患者在就诊前梳理病情、解读问卷报告、判断紧急程度，并给出分诊与就医建议。'
          : '你是一位干眼症科普AI，面向大众把干眼症相关的科学和健康知识讲得简单易懂。优先基于干眼专科医学知识作答。';

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ];

        const response = await fetch(\`\${state.baseUrl}/v1/chat/completions\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${await response.text()}\`);
        }

        let fullContent = '';
        let thinkingContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        assistantBubble.innerHTML = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta;
                if (delta?.content) fullContent += delta.content;
                if (delta?.reasoning_content || delta?.thinking) thinkingContent += (delta.reasoning_content || delta.thinking);
                renderAssistantMarkdown(assistantBubble, fullContent, thinkingContent);
                chatBox.scrollTop = chatBox.scrollHeight;
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        assistantBubble.innerHTML = \`<span style="color:var(--danger)">⚠️ 请求出错: \${err.message}</span>\`;
      } finally {
        btn.disabled = false;
      }
    }

    function appendMessageBubble(container, role, html, view = 'clinic') {
      const item = document.createElement('div');
      item.className = \`message-item \${role}\`;

      const avatar = document.createElement('div');
      avatar.className = \`msg-avatar \${role === 'user' ? 'user' : view}\`;
      avatar.textContent = role === 'user' ? '👤' : (view === 'clinic' ? '🩺' : '🔬');

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble-box';
      bubble.innerHTML = html;

      item.appendChild(avatar);
      item.appendChild(bubble);
      container.appendChild(item);
      return bubble;
    }

    function renderAssistantMarkdown(bubble, content, thinking) {
      let out = '';
      if (thinking) {
        out += \`
          <details class="thinking-accordion" open>
            <summary>💭 深度推理过程</summary>
            <div class="thinking-accordion-content">\${escapeHtml(thinking)}</div>
          </details>
        \`;
      }
      out += typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\\n/g, '<br/>');
      bubble.innerHTML = out;
    }

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ==========================================
    // Knowledge Base Sharing
    // ==========================================
    const DEFAULT_KB = [
      { tag: '基础病理', title: '干眼症分型：水液缺乏型与脂质异常型', desc: '干眼症分为水液缺乏型（泪腺分泌不足）和脂质异常型（睑板腺功能障碍 MGD 导致蒸发过快）。' },
      { tag: '日常护理', title: '睑板腺热敷与眼睑清洁指南', desc: '热敷温度建议控制在 40-45℃，每次持续 10-15 分钟，每日 1-2 次，软化堵塞油脂。' },
      { tag: '用药指引', title: '人工泪液挑选与无防腐剂包装说明', desc: '每日点滴超过 4 次者，推荐选用单支无防腐剂人工泪液（如玻璃酸钠、聚乙烯醇等）。' },
      { tag: '专科治疗', title: '强脉冲光 (IPL) 治疗睑板腺功能障碍', desc: '强脉冲光可减轻眼周炎症、封闭异常扩张血管并杀灭蠕形螨，改善蒸发过强型干眼。' }
    ];

    async function initKnowledge() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/knowledge-bases\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.knowledge_bases && data.knowledge_bases.length > 0) {
            renderKnowledgeGrid(data.knowledge_bases.map(kb => ({
              tag: '桌面知识库',
              title: kb.name,
              desc: kb.description || '已同步桌面知识库'
            })));
            return;
          }
        }
      } catch (e) {}
      renderKnowledgeGrid(DEFAULT_KB);
    }

    function renderKnowledgeGrid(items) {
      const grid = document.getElementById('kb-grid-area');
      grid.innerHTML = '';
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'kb-article-card';
        card.innerHTML = \`
          <span class="kb-article-tag">\${it.tag}</span>
          <div style="font-size:14px; font-weight:700">\${it.title}</div>
          <div style="font-size:12.5px; color:var(--text-muted); line-height:1.5">\${it.desc}</div>
          <div style="margin-top:auto; font-size:12px; color:var(--primary); font-weight:600; cursor:pointer" onclick="askKbTopic('\${it.title}')">向科普AI提问关于此话题 ➔</div>
        \`;
        grid.appendChild(card);
      });
    }

    async function executeKnowledgeSearch() {
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
          body: JSON.stringify({ query: q, document_count: 5 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            renderKnowledgeGrid(data.results.map(r => ({
              tag: '检索匹配',
              title: r.document_title || r.title || '专科知识文档',
              desc: r.content || r.snippet || ''
            })));
            return;
          }
        }
      } catch (e) {}

      const match = DEFAULT_KB.filter(k => k.title.includes(q) || k.desc.includes(q));
      renderKnowledgeGrid(match.length > 0 ? match : [{ tag: '提示', title: '未找到匹配词条', desc: \`暂无关于「\${q}」的直接文档，建议在科普AI中提问。\` }]);
    }

    function askKbTopic(t) {
      const sciRail = document.querySelector('[data-view="science"]');
      if (sciRail) sciRail.click();
      applySciencePrompt(\`请科普一下关于「\${t}」的医学知识和日常护理要点。\`);
    }

    // ==========================================
    // Models & Settings
    // ==========================================
    async function fetchModels() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/models\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            const dropdown = document.getElementById('model-select-el');
            dropdown.innerHTML = '';

            const popOpt = document.createElement('option');
            popOpt.value = 'pop-science';
            popOpt.textContent = '🔬 科普AI (专科内置)';
            dropdown.appendChild(popOpt);

            const clinicOpt = document.createElement('option');
            clinicOpt.value = 'clinic';
            clinicOpt.textContent = '🩺 问诊AI (专科内置)';
            dropdown.appendChild(clinicOpt);

            data.data.forEach(m => {
              const opt = document.createElement('option');
              opt.value = m.id;
              opt.textContent = \`🤖 \${m.id}\`;
              dropdown.appendChild(opt);
            });
          }
        }
      } catch (e) {}
    }

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

      alert('配置已成功保存！正在刷新数据...');
      refreshAllData();
    }
  </script>
</body>
</html>`
}
