/**
 * WebUI Single Page Application for HuaTuo Studio / Cherry Studio.
 * Serves a modern, responsive, full-featured web client for AI consultation,
 * pop-science Q&A, questionnaire assessment, and knowledge base search.
 */

export function renderWebUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>华佗 AI 智能健康助手 - WebUI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg-main: #f8fafc;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --bg-muted: #f1f5f9;
      --border-color: #e2e8f0;
      --border-subtle: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-subtle: #94a3b8;
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --primary-light: #e0f2fe;
      --primary-text: #0369a1;
      --clinic-primary: #059669;
      --clinic-light: #ecfdf5;
      --science-primary: #6366f1;
      --science-light: #eef2ff;
      --danger: #ef4444;
      --danger-light: #fef2f2;
      --warning: #f59e0b;
      --warning-light: #fffbeb;
      --success: #10b981;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-full: 9999px;
    }

    [data-theme='dark'] {
      --bg-main: #090d16;
      --bg-surface: #111827;
      --bg-card: #1f2937;
      --bg-muted: #1e293b;
      --border-color: #334155;
      --border-subtle: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --primary-light: #082f49;
      --primary-text: #38bdf8;
      --clinic-primary: #34d399;
      --clinic-light: #064e3b;
      --science-primary: #818cf8;
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
      background-color: var(--bg-main);
      color: var(--text-main);
      height: 100vh;
      display: flex;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Layout structure */
    #app-container {
      display: flex;
      width: 100%;
      height: 100%;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background-color: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.2s ease, transform 0.2s ease;
      z-index: 20;
    }

    .brand {
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0284c7 0%, #059669 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.3px;
    }

    .brand-subtitle {
      font-size: 11px;
      color: var(--text-muted);
    }

    .nav-list {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      user-select: none;
    }

    .nav-item:hover {
      background-color: var(--bg-muted);
      color: var(--text-main);
    }

    .nav-item.active {
      background-color: var(--primary-light);
      color: var(--primary-text);
      font-weight: 600;
      border-color: rgba(2, 132, 199, 0.15);
    }

    .nav-item .icon {
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
    }

    .nav-badge {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      background-color: var(--bg-muted);
      color: var(--text-muted);
    }

    .nav-item.active .nav-badge {
      background-color: var(--primary);
      color: white;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .server-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: var(--bg-muted);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: var(--text-muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--success);
      box-shadow: 0 0 6px var(--success);
    }

    .status-dot.offline {
      background-color: var(--danger);
      box-shadow: 0 0 6px var(--danger);
    }

    /* Main Content Area */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    /* Header */
    .top-header {
      height: 60px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-title-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-title {
      font-size: 17px;
      font-weight: 600;
    }

    .header-badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 500;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .model-selector-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--bg-muted);
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-size: 13px;
      border: 1px solid var(--border-color);
    }

    .model-selector {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 13px;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    .btn-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-muted);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      background-color: var(--border-color);
      color: var(--text-main);
    }

    /* Views container */
    .view-content {
      flex: 1;
      height: calc(100% - 60px);
      overflow-y: auto;
      display: none;
    }

    .view-content.active {
      display: flex;
      flex-direction: column;
    }

    /* Chat Views (Clinic & Science) */
    .chat-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 960px;
      margin: 0 auto;
      width: 100%;
      padding: 0 20px;
    }

    .banner-emergency {
      background-color: var(--danger-light);
      border: 1px solid var(--danger);
      color: var(--danger);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message-row {
      display: flex;
      gap: 14px;
      max-width: 85%;
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message-row.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .message-row.assistant {
      align-self: flex-start;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .avatar.user {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: white;
    }

    .avatar.clinic {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
    }

    .avatar.science {
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      color: white;
    }

    .message-bubble {
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      font-size: 14px;
      line-height: 1.6;
      box-shadow: var(--shadow-sm);
    }

    .message-row.user .message-bubble {
      background-color: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message-row.assistant .message-bubble {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      border-bottom-left-radius: 4px;
    }

    /* Markdown styling inside bubbles */
    .message-bubble p {
      margin-bottom: 8px;
    }
    .message-bubble p:last-child {
      margin-bottom: 0;
    }
    .message-bubble ul, .message-bubble ol {
      margin-left: 20px;
      margin-bottom: 8px;
    }
    .message-bubble code {
      background: rgba(0, 0, 0, 0.08);
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
    [data-theme='dark'] .message-bubble code {
      background: rgba(255, 255, 255, 0.15);
    }
    .message-bubble pre {
      background: #1e293b;
      color: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .message-bubble table {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
      font-size: 13px;
    }
    .message-bubble th, .message-bubble td {
      border: 1px solid var(--border-color);
      padding: 6px 10px;
      text-align: left;
    }
    .message-bubble th {
      background: var(--bg-muted);
    }
    .message-bubble blockquote {
      border-left: 3px solid var(--primary);
      padding-left: 10px;
      margin: 6px 0;
      color: var(--text-muted);
    }

    /* Reasoning Think Box */
    .thinking-box {
      margin-bottom: 10px;
      padding: 8px 12px;
      background-color: var(--bg-muted);
      border-left: 3px solid var(--science-primary);
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-muted);
    }
    .thinking-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .thinking-content {
      margin-top: 6px;
      white-space: pre-wrap;
      max-height: 180px;
      overflow-y: auto;
    }

    /* Quick Prompt Chips */
    .quick-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 12px;
    }

    .chip-item {
      padding: 6px 12px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .chip-item:hover {
      background-color: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary-text);
      transform: translateY(-1px);
    }

    /* Composer Area */
    .chat-composer-wrapper {
      padding: 12px 0 20px 0;
      position: relative;
    }

    .composer-box {
      background-color: var(--bg-surface);
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
    }

    .composer-box:focus-within {
      border-color: var(--primary);
    }

    .composer-textarea {
      width: 100%;
      min-height: 50px;
      max-height: 160px;
      border: none;
      padding: 12px 16px;
      background: transparent;
      color: var(--text-main);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      resize: none;
    }

    .composer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-top: 1px solid var(--border-subtle);
    }

    .composer-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-btn {
      padding: 4px 10px;
      font-size: 12px;
      border-radius: var(--radius-md);
      background-color: var(--bg-muted);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .tool-btn:hover {
      background-color: var(--border-color);
      color: var(--text-main);
    }

    .btn-send {
      padding: 6px 18px;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn-send:hover {
      background-color: var(--primary-hover);
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Questionnaire View Styles */
    .questionnaire-container {
      max-width: 860px;
      margin: 24px auto;
      padding: 0 20px;
      width: 100%;
    }

    .q-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 20px;
    }

    .q-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .q-title {
      font-size: 20px;
      font-weight: 700;
    }

    .q-progress-bar-bg {
      width: 100%;
      height: 8px;
      background-color: var(--bg-muted);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .q-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7, #059669);
      width: 0%;
      transition: width 0.3s ease;
    }

    .q-form-group {
      margin-bottom: 22px;
    }

    .q-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-main);
    }

    .q-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .q-options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }

    .q-radio-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background-color: var(--bg-muted);
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
      user-select: none;
    }

    .q-radio-btn:hover {
      border-color: var(--primary);
      background-color: var(--primary-light);
    }

    .q-radio-btn.selected {
      border-color: var(--primary);
      background-color: var(--primary-light);
      color: var(--primary-text);
      font-weight: 600;
    }

    .q-input-text {
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background-color: var(--bg-surface);
      color: var(--text-main);
      font-size: 14px;
      outline: none;
    }

    .q-input-text:focus {
      border-color: var(--primary);
    }

    .q-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 30px;
    }

    .btn-secondary {
      padding: 10px 20px;
      background-color: var(--bg-muted);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary {
      padding: 10px 24px;
      background-color: var(--primary);
      border: none;
      color: white;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
    }

    .btn-primary:hover {
      background-color: var(--primary-hover);
    }

    /* Report View Styles */
    .report-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 28px;
      box-shadow: var(--shadow-md);
    }

    .report-banner {
      padding: 16px 20px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .report-banner.level-negative {
      background-color: var(--clinic-light);
      border: 1px solid var(--clinic-primary);
      color: var(--clinic-primary);
    }

    .report-banner.level-mild {
      background-color: #fef9c3;
      border: 1px solid #eab308;
      color: #854d0e;
    }

    .report-banner.level-moderate {
      background-color: var(--warning-light);
      border: 1px solid var(--warning);
      color: #c2410c;
    }

    .report-banner.level-severe {
      background-color: var(--danger-light);
      border: 1px solid var(--danger);
      color: var(--danger);
    }

    .report-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }

    .risk-tag {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      background-color: var(--warning-light);
      border: 1px solid var(--warning);
      color: #b45309;
    }

    /* Knowledge View */
    .knowledge-container {
      max-width: 960px;
      margin: 24px auto;
      padding: 0 20px;
      width: 100%;
    }

    .kb-search-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .kb-search-input {
      flex: 1;
      padding: 12px 18px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-color);
      background-color: var(--bg-surface);
      color: var(--text-main);
      font-size: 15px;
      outline: none;
    }

    .kb-search-input:focus {
      border-color: var(--primary);
    }

    .kb-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .kb-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.15s ease;
    }

    .kb-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .kb-tag {
      align-self: flex-start;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background-color: var(--science-light);
      color: var(--science-primary);
      font-weight: 600;
    }

    .kb-card-title {
      font-size: 15px;
      font-weight: 600;
    }

    .kb-card-snippet {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .kb-card-action {
      margin-top: auto;
      font-size: 12px;
      color: var(--primary);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Settings View */
    .settings-container {
      max-width: 700px;
      margin: 24px auto;
      padding: 0 20px;
      width: 100%;
    }

    .settings-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 20px;
    }

    .settings-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .settings-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .settings-row label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .settings-row input, .settings-row select, .settings-row textarea {
      padding: 9px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background-color: var(--bg-surface);
      color: var(--text-main);
      font-size: 13px;
      outline: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .mobile-menu-btn {
        display: flex !important;
      }
    }

    .mobile-menu-btn {
      display: none;
    }
  </style>
</head>
<body>
  <div id="app-container">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-icon">🩺</div>
        <div>
          <div class="brand-title">华佗 AI 智能助手</div>
          <div class="brand-subtitle">HuaTuo Studio WebUI</div>
        </div>
      </div>

      <nav class="nav-list">
        <div class="nav-item active" data-view="clinic">
          <span class="icon">🩺</span>
          <span>智能问诊 AI</span>
          <span class="nav-badge">专科</span>
        </div>
        <div class="nav-item" data-view="science">
          <span class="icon">🔬</span>
          <span>科普知识 AI</span>
          <span class="nav-badge">百科</span>
        </div>
        <div class="nav-item" data-view="questionnaire">
          <span class="icon">📋</span>
          <span>干眼问卷评估</span>
          <span class="nav-badge">测评</span>
        </div>
        <div class="nav-item" data-view="knowledge">
          <span class="icon">📚</span>
          <span>专科知识库</span>
        </div>
        <div class="nav-item" data-view="settings">
          <span class="icon">⚙️</span>
          <span>系统与模型设置</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="server-status-pill">
          <span class="status-dot" id="status-dot"></span>
          <span id="status-text">正在连接服务...</span>
        </div>
      </div>
    </aside>

    <!-- Main Workspace -->
    <main class="main-wrapper">
      <!-- Top Header -->
      <header class="top-header">
        <div class="header-left">
          <button class="btn-icon mobile-menu-btn" id="mobile-toggle">☰</button>
          <div class="header-title-container">
            <span class="header-title" id="current-view-title">智能问诊 AI</span>
            <span class="header-badge" id="current-view-badge" style="background: var(--clinic-light); color: var(--clinic-primary);">就医分诊</span>
          </div>
        </div>

        <div class="header-right">
          <div class="model-selector-wrapper">
            <span>🤖 模型:</span>
            <select class="model-selector" id="model-dropdown">
              <option value="pop-science">科普AI (内置模型)</option>
              <option value="clinic">问诊AI (内置模型)</option>
            </select>
          </div>
          <button class="btn-icon" id="theme-toggle" title="切换暗黑/浅色模式">🌓</button>
        </div>
      </header>

      <!-- View: 智能问诊 AI -->
      <section class="view-content active" id="view-clinic">
        <div class="chat-layout">
          <div class="banner-emergency">
            <span>🚨 <strong>就诊提示：</strong>如出现突发视力骤降、剧烈眼痛伴恶心呕吐、化学品溅入眼内或眼部外伤，请立即前往医院急诊就诊！</span>
          </div>

          <div class="chat-messages" id="clinic-messages">
            <!-- Messages inserted here -->
            <div class="message-row assistant">
              <div class="avatar clinic">🩺</div>
              <div class="message-bubble">
                <p>您好！我是<strong>干眼专科问诊助手</strong>。我可以帮助您在就医前梳理眼部不适症状、评估干眼程度、解读问卷报告，并提供分诊建议。</p>
                <p>请问您最近眼睛有什么不舒服？（如干涩、异物感、眼红、晨起睁眼困难等）如果您已完成问卷，可点击下方<strong>「插入问卷报告」</strong>。</p>
              </div>
            </div>
          </div>

          <div class="quick-chips-row" id="clinic-chips">
            <div class="chip-item" onclick="insertPrompt('眼睛经常干涩、有异物感，下午和看电脑时加重，怎么改善？')">👀 眼睛干涩有异物感</div>
            <div class="chip-item" onclick="insertPrompt('戴软性隐形眼镜超过6小时后眼睛很干刺痛，需要停戴吗？')">👓 佩戴隐形眼镜眼干刺痛</div>
            <div class="chip-item" onclick="insertPrompt('早晨起床时眼睛粘着睁不开，眼角有白色分泌物，是什么原因？')">😴 晨起睁眼困难有分泌物</div>
            <div class="chip-item" onclick="insertPrompt('眨眼后看东西能短暂清晰，但过几秒又变模糊，是干眼症吗？')">🌊 视力波动眨眼后清晰</div>
          </div>

          <div class="chat-composer-wrapper">
            <div class="composer-box">
              <textarea class="composer-textarea" id="clinic-input" placeholder="输入您的症状或问题... (Shift + Enter 换行，Enter 发送)"></textarea>
              <div class="composer-actions">
                <div class="composer-tools">
                  <button class="tool-btn" id="btn-insert-report" onclick="insertLatestReport()">📋 插入最新问卷报告</button>
                  <button class="tool-btn" onclick="clearChat('clinic')">🗑️ 清空对话</button>
                </div>
                <button class="btn-send" id="clinic-send-btn" onclick="sendMessage('clinic')">发送 ✈️</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View: 科普知识 AI -->
      <section class="view-content" id="view-science">
        <div class="chat-layout">
          <div class="chat-messages" id="science-messages">
            <div class="message-row assistant">
              <div class="avatar science">🔬</div>
              <div class="message-bubble">
                <p>您好！我是<strong>干眼科普助手</strong>，已接入《Dry-Eye-Syndrome》专科知识库。我可以为您解答干眼症的病因、日常护理、人工泪液选用、用眼健康等科学知识。</p>
                <p>请随时向我提问，或点击下方热门科普主题！</p>
              </div>
            </div>
          </div>

          <div class="quick-chips-row">
            <div class="chip-item" onclick="insertSciencePrompt('干眼症有哪些主要类型？水液缺乏型与脂质异常型有什么区别？')">💡 水液缺乏 vs 脂质异常</div>
            <div class="chip-item" onclick="insertSciencePrompt('人工泪液该如何挑选？含防腐剂和不含防腐剂的有什么区别？')">💧 人工泪液挑选指南</div>
            <div class="chip-item" onclick="insertSciencePrompt('睑板腺热敷的最佳温度和时间是多少？热敷后需要按摩吗？')">🧖‍♀️ 科学热敷与睑板腺护理</div>
            <div class="chip-item" onclick="insertSciencePrompt('什么是「20-20-20」用眼法则？如何有效预防视疲劳？')">⏱️ 20-20-20 用眼法则</div>
          </div>

          <div class="chat-composer-wrapper">
            <div class="composer-box">
              <textarea class="composer-textarea" id="science-input" placeholder="向科普AI提问干眼健康知识..."></textarea>
              <div class="composer-actions">
                <div class="composer-tools">
                  <button class="tool-btn" onclick="clearChat('science')">🗑️ 清空对话</button>
                </div>
                <button class="btn-send" id="science-send-btn" onclick="sendMessage('science')">发送 ✈️</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- View: 问卷评估 -->
      <section class="view-content" id="view-questionnaire">
        <div class="questionnaire-container" id="q-flow-wrapper">
          <!-- Step Form will be rendered here by JS -->
        </div>
      </section>

      <!-- View: 专科知识库 -->
      <section class="view-content" id="view-knowledge">
        <div class="knowledge-container">
          <div class="kb-search-bar">
            <input type="text" class="kb-search-input" id="kb-search-input" placeholder="搜索干眼症专科知识库（如：睑板腺功能障碍、人工泪液、热敷、角膜炎）..." />
            <button class="btn-primary" onclick="searchKnowledge()">🔍 搜索</button>
          </div>

          <div class="kb-grid" id="kb-results-grid">
            <!-- Knowledge cards rendered here -->
          </div>
        </div>
      </section>

      <!-- View: 系统设置 -->
      <section class="view-content" id="view-settings">
        <div class="settings-container">
          <div class="settings-card">
            <div class="settings-title">🌐 API 网关与服务连接</div>
            <div class="settings-row">
              <label>API 服务地址 (Base URL)</label>
              <input type="text" id="setting-base-url" value="" placeholder="http://127.0.0.1:23333" />
            </div>
            <div class="settings-row">
              <label>API Key (可选，无鉴权时可留空)</label>
              <input type="password" id="setting-api-key" placeholder="Bearer Token 或 x-api-key" />
            </div>
            <button class="btn-secondary" onclick="checkConnectionAndRefreshModels()">🔄 测试连接并刷新模型</button>
          </div>

          <div class="settings-card">
            <div class="settings-title">🤖 问诊与科普默认模型配置</div>
            <div class="settings-row">
              <label>问诊AI 模型标识</label>
              <input type="text" id="setting-clinic-model" value="clinic" placeholder="clinic 或 provider:model" />
            </div>
            <div class="settings-row">
              <label>科普AI 模型标识</label>
              <input type="text" id="setting-science-model" value="pop-science" placeholder="pop-science 或 provider:model" />
            </div>
            <div class="settings-row">
              <button class="btn-primary" onclick="saveSettings()">💾 保存配置</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    // Global State
    const state = {
      theme: localStorage.getItem('huatuo_theme') || 'light',
      currentView: 'clinic',
      baseUrl: localStorage.getItem('huatuo_base_url') || window.location.origin,
      apiKey: localStorage.getItem('huatuo_api_key') || '',
      clinicModel: localStorage.getItem('huatuo_clinic_model') || 'clinic',
      scienceModel: localStorage.getItem('huatuo_science_model') || 'pop-science',
      models: [],
      latestReport: localStorage.getItem('huatuo_latest_report') || '',
      chatHistory: {
        clinic: [],
        science: []
      },
      // Questionnaire State
      qStep: 0,
      qAnswers: {
        age: 30,
        gender: 'male',
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
        },
        cldeqScore: 0,
        psqiScore: 0,
        lifestyleRisks: ['长期看屏幕', '空调干燥环境']
      }
    };

    // Apply initial theme
    document.documentElement.setAttribute('data-theme', state.theme);

    // Dom elements
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const modelDropdown = document.getElementById('model-dropdown');

    // Init App
    window.addEventListener('DOMContentLoaded', () => {
      initNavigation();
      initTheme();
      initSettings();
      checkServerHealth();
      renderQuestionnaireStep();
      initKnowledgeBase();
      bindComposerEvents();
    });

    // Theme Toggle
    function initTheme() {
      const toggle = document.getElementById('theme-toggle');
      toggle.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('huatuo_theme', state.theme);
      });
    }

    // Navigation Switch
    function initNavigation() {
      const navItems = document.querySelectorAll('.nav-item');
      const views = document.querySelectorAll('.view-content');
      const viewTitle = document.getElementById('current-view-title');
      const viewBadge = document.getElementById('current-view-badge');

      const viewMeta = {
        clinic: { title: '智能问诊 AI', badge: '就医分诊', badgeBg: 'var(--clinic-light)', badgeColor: 'var(--clinic-primary)' },
        science: { title: '科普知识 AI', badge: '专科百科', badgeBg: 'var(--science-light)', badgeColor: 'var(--science-primary)' },
        questionnaire: { title: '干眼专科问卷评估', badge: '多维测评', badgeBg: 'var(--primary-light)', badgeColor: 'var(--primary)' },
        knowledge: { title: '专科知识库检索', badge: 'Dry-Eye-Syndrome', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-main)' },
        settings: { title: '系统与模型设置', badge: 'API Gateway', badgeBg: 'var(--bg-muted)', badgeColor: 'var(--text-muted)' }
      };

      navItems.forEach(item => {
        item.addEventListener('click', () => {
          const targetView = item.getAttribute('data-view');
          state.currentView = targetView;

          navItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          views.forEach(v => v.classList.remove('active'));
          const targetSection = document.getElementById(\`view-\${targetView}\`);
          if (targetSection) targetSection.classList.add('active');

          const meta = viewMeta[targetView] || { title: targetView, badge: '' };
          viewTitle.textContent = meta.title;
          viewBadge.textContent = meta.badge;
          viewBadge.style.background = meta.badgeBg;
          viewBadge.style.color = meta.badgeColor;

          if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
          }
        });
      });

      document.getElementById('mobile-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Server Health Check & Model Fetching
    async function checkServerHealth() {
      statusText.textContent = '正在检测服务...';
      try {
        const res = await fetch(\`\${state.baseUrl}/health\`);
        if (res.ok) {
          statusDot.className = 'status-dot';
          statusText.textContent = '已连接 API Gateway';
          fetchModels();
        } else {
          throw new Error('Health check non-200');
        }
      } catch (err) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = '未连接 (请启动服务)';
      }
    }

    async function fetchModels() {
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/models\`, {
          headers: state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && Array.isArray(data.data)) {
            state.models = data.data;
            modelDropdown.innerHTML = '';
            
            // Add fixed agents first
            const popOpt = document.createElement('option');
            popOpt.value = 'pop-science';
            popOpt.textContent = '🔬 科普AI (内置预设)';
            modelDropdown.appendChild(popOpt);

            const clinicOpt = document.createElement('option');
            clinicOpt.value = 'clinic';
            clinicOpt.textContent = '🩺 问诊AI (内置预设)';
            modelDropdown.appendChild(clinicOpt);

            data.data.forEach(m => {
              const opt = document.createElement('option');
              opt.value = m.id;
              opt.textContent = \`🤖 \${m.id}\`;
              modelDropdown.appendChild(opt);
            });
          }
        }
      } catch (e) {
        console.warn('Fetch models error:', e);
      }
    }

    // Composer & Chat
    function bindComposerEvents() {
      const clinicInput = document.getElementById('clinic-input');
      clinicInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage('clinic');
        }
      });

      const scienceInput = document.getElementById('science-input');
      scienceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage('science');
        }
      });
    }

    function insertPrompt(text) {
      const input = document.getElementById('clinic-input');
      input.value = text;
      input.focus();
    }

    function insertSciencePrompt(text) {
      const input = document.getElementById('science-input');
      input.value = text;
      input.focus();
    }

    function insertLatestReport() {
      if (!state.latestReport) {
        alert('暂无问卷报告，请先前往「干眼问卷评估」完成测评！');
        return;
      }
      const input = document.getElementById('clinic-input');
      input.value = state.latestReport + '\\n\\n请帮我解读这份问卷报告并给出针对性的分诊就诊建议。';
      input.focus();
    }

    function clearChat(mode) {
      if (confirm('确定要清空当前对话记录吗？')) {
        const container = document.getElementById(\`\${mode}-messages\`);
        const firstMsg = container.firstElementChild;
        container.innerHTML = '';
        if (firstMsg) container.appendChild(firstMsg);
        state.chatHistory[mode] = [];
      }
    }

    async function sendMessage(mode) {
      const inputEl = document.getElementById(\`\${mode}-input\`);
      const text = inputEl.value.trim();
      if (!text) return;

      const sendBtn = document.getElementById(\`\${mode}-send-btn\`);
      sendBtn.disabled = true;
      inputEl.value = '';

      const messagesContainer = document.getElementById(\`\${mode}-messages\`);

      // Append user bubble
      appendMessage(messagesContainer, 'user', text);
      state.chatHistory[mode].push({ role: 'user', content: text });

      // Create assistant bubble placeholder
      const assistantBubble = appendMessage(messagesContainer, 'assistant', '<span style="color:var(--text-muted)">正在思考并组织回答...</span>', mode);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const model = mode === 'clinic' ? state.clinicModel : state.scienceModel;
        const systemPrompt = mode === 'clinic' 
          ? '你是一位干眼症专科问诊AI，主要帮助有干眼症状的患者在就诊前梳理病情、解读问卷报告、判断紧急程度，并给出分诊与就医建议。'
          : '你是一位干眼症科普AI，面向大众把干眼症相关的科学和健康知识讲得简单易懂。优先基于干眼专科医学知识作答。';

        const requestMessages = [
          { role: 'system', content: systemPrompt },
          ...state.chatHistory[mode]
        ];

        const response = await fetch(\`\${state.baseUrl}/v1/chat/completions\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({
            model: model,
            messages: requestMessages,
            stream: true
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(\`HTTP \${response.status}: \${errText}\`);
        }

        let fullText = '';
        let thinkingText = '';
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
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta;
                if (delta?.content) {
                  fullText += delta.content;
                }
                if (delta?.reasoning_content || delta?.thinking) {
                  thinkingText += (delta.reasoning_content || delta.thinking);
                }

                renderAssistantResponse(assistantBubble, fullText, thinkingText);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              } catch (e) {
                // Ignore chunk parse error
              }
            }
          }
        }

        state.chatHistory[mode].push({ role: 'assistant', content: fullText });
      } catch (err) {
        assistantBubble.innerHTML = \`<div style="color:var(--danger)">⚠️ 发生错误: \${err.message}</div>\`;
      } finally {
        sendBtn.disabled = false;
      }
    }

    function appendMessage(container, role, htmlContent, mode = 'clinic') {
      const row = document.createElement('div');
      row.className = \`message-row \${role}\`;

      const avatar = document.createElement('div');
      avatar.className = \`avatar \${role === 'user' ? 'user' : mode}\`;
      avatar.textContent = role === 'user' ? '👤' : (mode === 'clinic' ? '🩺' : '🔬');

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = htmlContent;

      row.appendChild(avatar);
      row.appendChild(bubble);
      container.appendChild(row);
      return bubble;
    }

    function renderAssistantResponse(bubbleEl, content, thinking) {
      let html = '';
      if (thinking) {
        html += \`
          <div class="thinking-box">
            <div class="thinking-title" onclick="this.nextElementSibling.classList.toggle('hidden')">💭 思考过程 (点击展开/折叠)</div>
            <div class="thinking-content">\${escapeHtml(thinking)}</div>
          </div>
        \`;
      }
      html += typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\\n/g, '<br/>');
      bubbleEl.innerHTML = html;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ==========================================
    // Questionnaire Assessment Flow
    // ==========================================
    const Q_SYMPTOMS_LIST = [
      { id: 'dryness', title: '1. 眼睛发干、干涩感' },
      { id: 'foreignBody', title: '2. 异物感、磨痛、沙粒感' },
      { id: 'burning', title: '3. 烧灼感、刺痛或眼周发热' },
      { id: 'redness', title: '4. 眼睛发红、充血或血丝增多' },
      { id: 'fatigue', title: '5. 眼睛疲劳、酸胀、睁眼困难' },
      { id: 'photophobia', title: '6. 怕光、畏风或流泪' },
      { id: 'blurredVision', title: '7. 视力波动（尤其眨眼后短暂看清）' },
      { id: 'frequentBlinking', title: '8. 频繁眨眼或不由自主挤眼' },
      { id: 'readingDiscomfort', title: '9. 看书、阅读时眼部不适' },
      { id: 'screenDiscomfort', title: '10. 看手机、电脑等屏幕时眼部不适' },
      { id: 'drivingDiscomfort', title: '11. 驾驶或夜间外出时眼部不适' },
      { id: 'dryEnvDiscomfort', title: '12. 空调房或干燥环境下眼部不适' }
    ];

    function renderQuestionnaireStep() {
      const container = document.getElementById('q-flow-wrapper');
      const step = state.qStep;

      if (step === 0) {
        // Step 1: Basic info
        container.innerHTML = \`
          <div class="q-card">
            <div class="q-header">
              <div class="q-title">📋 阶段一：患者基本信息</div>
              <div class="nav-badge">步骤 1 / 3</div>
            </div>
            <div class="q-progress-bar-bg"><div class="q-progress-bar-fill" style="width: 33%"></div></div>

            <div class="q-form-group">
              <label class="q-label">年龄段</label>
              <div class="q-options-grid">
                <div class="q-radio-btn \${state.qAnswers.age <= 25 ? 'selected' : ''}" onclick="selectBasic('age', 20)">18-25 岁 (青年学生/初入职场)</div>
                <div class="q-radio-btn \${state.qAnswers.age > 25 && state.qAnswers.age <= 45 ? 'selected' : ''}" onclick="selectBasic('age', 35)">26-45 岁 (中青年办公人群)</div>
                <div class="q-radio-btn \${state.qAnswers.age > 45 ? 'selected' : ''}" onclick="selectBasic('age', 55)">45 岁以上 (中老年人群)</div>
              </div>
            </div>

            <div class="q-form-group">
              <label class="q-label">生理性别</label>
              <div class="q-options-grid">
                <div class="q-radio-btn \${state.qAnswers.gender === 'female' ? 'selected' : ''}" onclick="selectBasic('gender', 'female')">女性</div>
                <div class="q-radio-btn \${state.qAnswers.gender === 'male' ? 'selected' : ''}" onclick="selectBasic('gender', 'male')">男性</div>
              </div>
            </div>

            <div class="q-form-group">
              <label class="q-label">日均使用屏幕（电脑/手机）时长</label>
              <div class="q-options-grid">
                <div class="q-radio-btn \${state.qAnswers.screenHours <= 4 ? 'selected' : ''}" onclick="selectBasic('screenHours', 3)">小于 4 小时</div>
                <div class="q-radio-btn \${state.qAnswers.screenHours > 4 && state.qAnswers.screenHours <= 8 ? 'selected' : ''}" onclick="selectBasic('screenHours', 6)">4 - 8 小时</div>
                <div class="q-radio-btn \${state.qAnswers.screenHours > 8 ? 'selected' : ''}" onclick="selectBasic('screenHours', 10)">大于 8 小时 (高负荷)</div>
              </div>
            </div>

            <div class="q-form-group">
              <label class="q-label">是否佩戴隐形眼镜 / 接触镜？</label>
              <div class="q-options-grid">
                <div class="q-radio-btn \${state.qAnswers.contactLenses === 'yes' ? 'selected' : ''}" onclick="selectBasic('contactLenses', 'yes')">是 (每周佩戴 3 天以上)</div>
                <div class="q-radio-btn \${state.qAnswers.contactLenses === 'no' ? 'selected' : ''}" onclick="selectBasic('contactLenses', 'no')">否 (不戴或偶尔戴)</div>
              </div>
            </div>

            <div class="q-form-group">
              <label class="q-label">是否有明显的失眠、熬夜或睡眠障碍？</label>
              <div class="q-options-grid">
                <div class="q-radio-btn \${state.qAnswers.sleepTrouble === 'yes' ? 'selected' : ''}" onclick="selectBasic('sleepTrouble', 'yes')">是 (常有失眠/睡眠不足)</div>
                <div class="q-radio-btn \${state.qAnswers.sleepTrouble === 'no' ? 'selected' : ''}" onclick="selectBasic('sleepTrouble', 'no')">否 (睡眠基本正常)</div>
              </div>
            </div>

            <div class="q-actions-row">
              <div></div>
              <button class="btn-primary" onclick="nextQStep()">下一步：填写中国干眼问卷 ➔</button>
            </div>
          </div>
        \`;
      } else if (step === 1) {
        // Step 2: China Dry Eye scale
        let symptomsHtml = '';
        Q_SYMPTOMS_LIST.forEach(s => {
          const currentVal = state.qAnswers.symptoms[s.id] ?? 0;
          symptomsHtml += \`
            <div class="q-form-group" style="padding-bottom: 12px; border-bottom: 1px dashed var(--border-subtle)">
              <label class="q-label">\${s.title}</label>
              <div class="q-options-grid" style="grid-template-columns: repeat(5, 1fr);">
                <div class="q-radio-btn \${currentVal === 0 ? 'selected' : ''}" onclick="setSymptomScore('\${s.id}', 0)">0 无症状</div>
                <div class="q-radio-btn \${currentVal === 1 ? 'selected' : ''}" onclick="setSymptomScore('\${s.id}', 1)">1 偶尔/轻度</div>
                <div class="q-radio-btn \${currentVal === 2 ? 'selected' : ''}" onclick="setSymptomScore('\${s.id}', 2)">2 有时/中度</div>
                <div class="q-radio-btn \${currentVal === 3 ? 'selected' : ''}" onclick="setSymptomScore('\${s.id}', 3)">3 经常/明显</div>
                <div class="q-radio-btn \${currentVal === 4 ? 'selected' : ''}" onclick="setSymptomScore('\${s.id}', 4)">4 持续/严重</div>
              </div>
            </div>
          \`;
        });

        container.innerHTML = \`
          <div class="q-card">
            <div class="q-header">
              <div class="q-title">📋 阶段二：中国干眼调查问卷 (12项症状及影响)</div>
              <div class="nav-badge">步骤 2 / 3</div>
            </div>
            <div class="q-progress-bar-bg"><div class="q-progress-bar-fill" style="width: 66%"></div></div>

            <div style="margin-bottom: 20px; font-size: 13px; color: var(--text-muted)">
              请根据您<strong>最近 1 周内</strong>眼睛的真实感受打分（0分=完全无，4分=持续严重发生）：
            </div>

            \${symptomsHtml}

            <div class="q-actions-row">
              <button class="btn-secondary" onclick="prevQStep()">⬅ 返回上一步</button>
              <button class="btn-primary" onclick="calculateAndShowReport()">生成完整评估报告 📊</button>
            </div>
          </div>
        \`;
      } else if (step === 2) {
        // Report view
        renderReportView(container);
      }
    }

    function selectBasic(key, val) {
      state.qAnswers[key] = val;
      renderQuestionnaireStep();
    }

    function setSymptomScore(id, score) {
      state.qAnswers.symptoms[id] = score;
      renderQuestionnaireStep();
    }

    function nextQStep() {
      state.qStep++;
      renderQuestionnaireStep();
    }

    function prevQStep() {
      state.qStep--;
      renderQuestionnaireStep();
    }

    function calculateAndShowReport() {
      let totalScore = 0;
      Object.values(state.qAnswers.symptoms).forEach(v => totalScore += v);

      let level = 'negative';
      let levelText = '阴性 (暂无明显干眼指征)';
      let assessmentDesc = '您的干眼症状总分处于正常范围，暂无干眼症典型体征，建议保持良好的日常用眼习惯。';

      if (totalScore >= 19) {
        level = 'severe';
        levelText = '重度干眼 (Severe Dry Eye)';
        assessmentDesc = '总分显著升高，症状严重且严重干扰日常用眼生活，强烈建议近期前往眼科干眼门诊进行睑板腺与泪膜专业检查。';
      } else if (totalScore >= 13) {
        level = 'moderate';
        levelText = '中度干眼 (Moderate Dry Eye)';
        assessmentDesc = '总分处于中度范围，有明显的眼表不适与视疲劳影响，建议眼科门诊就医并排查脂质异常或水液缺乏。';
      } else if (totalScore >= 7) {
        level = 'mild';
        levelText = '轻度干眼 (Mild Dry Eye)';
        assessmentDesc = '总分已达干眼阳性阈值（≥7分），提示存在早期轻度干眼表现，可通过环境加湿、减少连续屏幕用眼及热敷改善。';
      }

      // Collect risk factors
      const risks = [];
      if (state.qAnswers.screenHours >= 8) risks.push('超长屏幕暴露 (>8h)');
      if (state.qAnswers.contactLenses === 'yes') risks.push('接触镜/隐形眼镜佩戴');
      if (state.qAnswers.sleepTrouble === 'yes') risks.push('睡眠障碍与熬夜');
      if (state.qAnswers.symptoms.dryEnvDiscomfort >= 2) risks.push('空调干燥环境刺激');
      if (state.qAnswers.symptoms.blurredVision >= 2) risks.push('眼表泪膜不稳定');

      state.qReport = {
        totalScore,
        level,
        levelText,
        assessmentDesc,
        risks,
        generatedAt: new Date().toLocaleString()
      };

      // Generate text format for AI prompt
      const reportText = [
        \`患者基本信息：年龄 \${state.qAnswers.age}岁，性别 \${state.qAnswers.gender === 'female' ? '女' : '男'}，日均屏幕 \${state.qAnswers.screenHours}小时，隐形眼镜：\${state.qAnswers.contactLenses === 'yes' ? '佩戴' : '无'}，睡眠状况：\${state.qAnswers.sleepTrouble === 'yes' ? '有困扰' : '正常'}。\`,
        \`问卷流程：中国干眼调查问卷 (12题标准量表)\`,
        \`测评总分：\${totalScore} 分 (满分48分)\`,
        \`临床分级：\${levelText}\`,
        \`危险因素：\${risks.join('、') || '暂无明显外部诱因'}\`,
        \`评估时间：\${state.qReport.generatedAt}\`
      ].join('\\n');

      state.latestReport = reportText;
      localStorage.setItem('huatuo_latest_report', reportText);

      state.qStep = 2;
      renderQuestionnaireStep();
    }

    function renderReportView(container) {
      const r = state.qReport;
      let tagsHtml = r.risks.map(tag => \`<span class="risk-tag">⚠️ \${tag}</span>\`).join('');

      container.innerHTML = \`
        <div class="report-card">
          <div class="q-header">
            <div class="q-title">📊 干眼专科综合评估报告</div>
            <div style="font-size:12px; color:var(--text-muted)">生成时间: \${r.generatedAt}</div>
          </div>

          <div class="report-banner level-\${r.level}">
            <div>
              <div style="font-size:14px; font-weight:600">综合诊断分级</div>
              <div style="font-size:22px; font-weight:700; margin-top:4px">\${r.levelText}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px">中国干眼问卷得分</div>
              <div style="font-size:26px; font-weight:800">\${r.totalScore} <span style="font-size:14px; font-weight:normal">/ 48</span></div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-size:14px; font-weight:600; margin-bottom:8px">📋 临床评估解读</div>
            <div style="font-size:14px; line-height:1.6; color:var(--text-muted)">\${r.assessmentDesc}</div>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-size:14px; font-weight:600; margin-bottom:8px">🚩 筛查出的干眼诱因与危险因素</div>
            <div class="report-tags-row">\${tagsHtml || '<span style="font-size:13px; color:var(--text-muted)">无突出危险因素</span>'}</div>
          </div>

          <div class="q-actions-row" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <button class="btn-secondary" onclick="state.qStep = 0; renderQuestionnaireStep();">🔄 重新测评</button>
            <div style="display:flex; gap:12px">
              <button class="btn-secondary" onclick="copyReportText()">📋 复制报告文本</button>
              <button class="btn-primary" onclick="sendReportToClinic()">🚀 发送到问诊AI进行深入分析</button>
            </div>
          </div>
        </div>
      \`;
    }

    function copyReportText() {
      navigator.clipboard.writeText(state.latestReport);
      alert('评估报告已复制到剪贴板！');
    }

    function sendReportToClinic() {
      // Switch to clinic view
      const clinicNavItem = document.querySelector('[data-view="clinic"]');
      if (clinicNavItem) clinicNavItem.click();
      insertLatestReport();
    }

    // ==========================================
    // Knowledge Base Search
    // ==========================================
    const BUILTIN_KNOWLEDGE_ARTICLES = [
      {
        tag: '基础病理',
        title: '干眼症的分型：水液缺乏型与脂质异常型',
        snippet: '干眼症主要分为水液缺乏型（泪腺分泌不足）和脂质异常型（睑板腺功能障碍 MGD 导致泪膜蒸发过快）。其中脂质异常型占所有干眼病例的 80% 以上。'
      },
      {
        tag: '日常护理',
        title: '睑板腺热敷与眼睑物理清洁指南',
        snippet: '热敷温度建议控制在 40-45℃，每次持续 10-15 分钟，每日 1-2 次，可软化堵塞的睑板腺脂质；热敷后配合自内向外的眼睑边缘擦拭清洁。'
      },
      {
        tag: '用药指引',
        title: '人工泪液的选择与无防腐剂包装说明',
        snippet: '对于中重度干眼或每日需点滴 4 次以上者，应优先选用不含防腐剂的单支装人工泪液（如玻璃酸钠滴眼液、聚乙烯醇滴眼液），避免防腐剂损伤角膜上皮。'
      },
      {
        tag: '检查诊断',
        title: '干眼门诊常见客观检查项目解析',
        snippet: '主要包括：荧光素染色泪膜破裂时间 (FBUT)、Schirmer 泪液分泌试验、共聚焦显微镜及非侵入性睑板腺红外照相评估。'
      },
      {
        tag: '专科治疗',
        title: '强脉冲光 (IPL) 在睑板腺功能障碍中的应用',
        snippet: '强脉冲光通过封闭异常扩张毛细血管、减轻炎症、软化睑酯并杀灭蠕形螨，是目前改善中重度 MGD 蒸发过强型干眼的有效物理疗法。'
      },
      {
        tag: '用眼卫生',
        title: '「20-20-20」护眼法则与屏幕距离建议',
        snippet: '每看屏幕 20 分钟，抬头远眺 20 英尺（约 6 米）外的物体至少 20 秒；同时保持电脑屏幕低于视线 10-15 度，保持室内湿度在 40%-60%。'
      }
    ];

    function initKnowledgeBase() {
      renderKnowledgeGrid(BUILTIN_KNOWLEDGE_ARTICLES);
    }

    function renderKnowledgeGrid(articles) {
      const grid = document.getElementById('kb-results-grid');
      grid.innerHTML = '';
      articles.forEach(art => {
        const card = document.createElement('div');
        card.className = 'kb-card';
        card.innerHTML = \`
          <span class="kb-tag">\${art.tag}</span>
          <div class="kb-card-title">\${art.title}</div>
          <div class="kb-card-snippet">\${art.snippet}</div>
          <div class="kb-card-action" onclick="askScienceFromKnowledge('\${art.title}')">
            <span>向科普AI提问关于此话题 ➔</span>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    async function searchKnowledge() {
      const query = document.getElementById('kb-search-input').value.trim().toLowerCase();
      if (!query) {
        renderKnowledgeGrid(BUILTIN_KNOWLEDGE_ARTICLES);
        return;
      }

      // Try server search first
      try {
        const res = await fetch(\`\${state.baseUrl}/v1/knowledge-bases/search\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey ? { 'Authorization': \`Bearer \${state.apiKey}\` } : {})
          },
          body: JSON.stringify({ query: query, limit: 10 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            const mapped = data.results.map(r => ({
              tag: '知识库检索',
              title: r.document_title || r.title || '专科检索结果',
              snippet: r.content || r.snippet || ''
            }));
            renderKnowledgeGrid(mapped);
            return;
          }
        }
      } catch (e) {
        // Fallback to local filter
      }

      // Local keyword filter
      const filtered = BUILTIN_KNOWLEDGE_ARTICLES.filter(a => 
        a.title.toLowerCase().includes(query) || a.snippet.toLowerCase().includes(query) || a.tag.toLowerCase().includes(query)
      );
      renderKnowledgeGrid(filtered.length > 0 ? filtered : [{
        tag: '提示',
        title: '未找到完全匹配的词条',
        snippet: \`知识库中暂未收录关于「\${query}」的直接词条，建议直接在「科普知识 AI」中向 AI 提问。\`
      }]);
    }

    function askScienceFromKnowledge(title) {
      const scienceNav = document.querySelector('[data-view="science"]');
      if (scienceNav) scienceNav.click();
      insertSciencePrompt(\`请详细科普一下关于「\${title}」的医学知识和日常指导。\`);
    }

    // ==========================================
    // Settings
    // ==========================================
    function initSettings() {
      document.getElementById('setting-base-url').value = state.baseUrl;
      document.getElementById('setting-api-key').value = state.apiKey;
      document.getElementById('setting-clinic-model').value = state.clinicModel;
      document.getElementById('setting-science-model').value = state.scienceModel;
    }

    function saveSettings() {
      state.baseUrl = document.getElementById('setting-base-url').value.trim() || window.location.origin;
      state.apiKey = document.getElementById('setting-api-key').value.trim();
      state.clinicModel = document.getElementById('setting-clinic-model').value.trim() || 'clinic';
      state.scienceModel = document.getElementById('setting-science-model').value.trim() || 'pop-science';

      localStorage.setItem('huatuo_base_url', state.baseUrl);
      localStorage.setItem('huatuo_api_key', state.apiKey);
      localStorage.setItem('huatuo_clinic_model', state.clinicModel);
      localStorage.setItem('huatuo_science_model', state.scienceModel);

      alert('配置已成功保存！');
      checkServerHealth();
    }

    function checkConnectionAndRefreshModels() {
      saveSettings();
    }
  </script>
</body>
</html>`
}
