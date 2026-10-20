# 构建与发布指南

本文给出**每一步需要执行的命令**。完整链路：

```
环境准备 → 提交前校验 → 编译(out/) → 打包(dist/) → (签名) → 发布
                            ↑
                   GitHub Actions 上同样的命令
```

版本号来源：本地打包取 `package.json` 的 `version`；GitHub Actions 用 workflow 输入 `tag` 覆盖（`npm version` 只改 runner 工作区）。

---

## 1. 环境准备

### 1.1 通用（所有平台）

```bash
# Node 版本由 .node-version 指定（当前 24.11.1），pnpm 由 packageManager 锁定（11.8.0）
corepack enable

# 安装依赖（首次或 lockfile 变更后）
pnpm install

# 构建脚本通过 dotenv 读取 .env
cp .env.example .env        # 已存在则跳过

# 预下载打包内置二进制（mise/bun/uv/ripgrep；Windows 含 MinGit）
# 打包时会自动执行；想提前下载可手动跑：
pnpm download:binaries
```

### 1.2 Linux

```bash
# 打包所需系统依赖（与 CI 一致）：rpm 目标、selection-hook 的 X11 头、deb 的 fakeroot
sudo apt-get update
sudo apt-get install -y build-essential python3 rpm dpkg fakeroot \
  libevdev-dev libxtst-dev libx11-dev libxfixes-dev libwayland-dev
```

### 1.3 macOS

```bash
xcode-select --install                      # 编译工具链
brew install python-setuptools              # node-gyp 依赖（CI 同样执行）
```

### 1.4 Windows（PowerShell）

```powershell
# 仅在需要从源码编译原生模块时才要（能下载到 Electron 预编译包时可不装）
# 安装 "Desktop development with C++" 工作负载：
winget install Microsoft.VisualStudio.2022.BuildTools
```

---

## 2. 提交前校验（不产出安装包）

```bash
pnpm lint                 # oxlint + eslint fix + typecheck + i18n check + biome format
pnpm test                 # 全量单测
pnpm build:check          # 门禁：lint + docs:check-links + test
```

> 只跑单测时注意 ABI：`better-sqlite3` 必须是 **Node ABI**，见 §7.4。

---

## 3. 编译应用（`out/`）

```bash
pnpm build
```

等价于：

```bash
pnpm typecheck                       # 内部会先构建 @huatuostudio/ai-sdk-provider，再并行 typecheck node/web/aicore
pnpm exec electron-vite build        # 输出 out/main、out/preload、out/renderer
```

快速预览编译产物：

```bash
pnpm start        # = pnpm rebuild:electron && electron-vite preview
```

---

## 4. 打包安装包（`dist/`）

### 4.1 一键打包

```bash
# 当前平台
pnpm build:win            # Windows：NSIS + portable（x64 + arm64）
pnpm build:mac            # macOS：dmg + zip（x64 + arm64）
pnpm build:linux          # Linux：AppImage + deb + rpm（x64 + arm64）

# 单架构（省一半时间）
pnpm build:win:x64
pnpm build:win:arm64
pnpm build:mac:x64
pnpm build:mac:arm64
pnpm build:linux:x64
pnpm build:linux:arm64

# 只出未压缩目录，最快验证打包链路
pnpm build:unpack         # → dist/linux-unpacked | win-unpacked | mac[-arm64]
```

### 4.2 分步执行（需要插自定义步骤时）

```bash
# 1) 编译
pnpm build

# 2) 打包（按需选目标与架构）
pnpm exec dotenv -- electron-builder --win --x64 --arm64
pnpm exec dotenv -- electron-builder --mac --arm64 --x64
pnpm exec dotenv -- electron-builder --linux AppImage deb --x64
```

打包过程的钩子（自动执行，无需手动调用）：

| 钩子 | 命令/文件 | 作用 |
| --- | --- | --- |
| `beforePack` | `scripts/before-pack.js` | 校验目标平台 native 预编译包；下载并校验内置二进制 |
| 原生重编 | `@electron/rebuild` | 把 `better-sqlite3` 等按 Electron ABI 重编 |
| `afterPack` | `scripts/after-pack.js` | Windows 删除 Electron 遗留 LICENSE 文件 |
| `afterSign` | `scripts/notarize.js` | macOS 公证 |

### 4.3 产物命名与位置

```
dist/HuaTuo-Studio-<version>-<arch>-setup.exe       # Windows NSIS 安装包
dist/HuaTuo-Studio-<version>-<arch>-portable.exe    # Windows 免安装
dist/HuaTuo-Studio-<version>-<arch>.dmg             # macOS
dist/HuaTuo-Studio-<version>-<arch>.AppImage        # Linux
dist/HuaTuo-Studio-<version>-<arch>.deb
dist/HuaTuo-Studio-<version>-<arch>.rpm
dist/latest*.yml / *.blockmap                       # 自动更新与增量包
```

---

## 5. 代码签名

### 5.1 Windows

```bash
# 仅在设置 WIN_SIGN 时执行 scripts/win-sign.js（signtool + 时间戳重试）
export WIN_SIGN=1
export HUATUO_CERT_PATH=/path/to/cert.pfx     # 证书路径
export HUATUO_CERT_KEY='<key container>'      # 证书私钥容器名
export HUATUO_CERT_CSP='<csp provider>'       # 加密服务提供程序
# 可选：自定义时间戳服务器（逗号分隔）
export WIN_SIGN_TIMESTAMP_URLS='http://timestamp.digicert.com'

pnpm build:win
```

不设置 `WIN_SIGN` 时产出**未签名**安装包（SmartScreen 会提示）。

### 5.2 macOS

```bash
export CSC_LINK=/path/to/cert.p12
export CSC_KEY_PASSWORD='<cert password>'
export APPLE_ID='<apple id>'
export APPLE_APP_SPECIFIC_PASSWORD='<app-specific password>'
export APPLE_TEAM_ID='<team id>'

pnpm build:mac
```

`electron-builder.yml` 里 `mac.notarize: false`，公证由 `afterSign` 钩子按上面的环境变量决定。

### 5.3 构建期内置密钥（可选）

```bash
export MAIN_VITE_MINERU_API_KEY='...'
export RENDERER_VITE_AIHUBMIX_SECRET='...'
export RENDERER_VITE_PPIO_APP_SECRET='...'
```

缺失只会让对应功能不可用，不阻断构建。

---

## 6. 在 GitHub 上构建

### 6.1 启用 Actions（fork 仓库首次需要）

仓库 Settings → Actions → General → **Allow all actions and reusable workflows**，或在 Actions 页面点 “I understand my workflows, go ahead and enable them”。

命令行确认：

```bash
gh api repos/<owner>/<repo>/actions/permissions
# {"enabled":true,"allowed_actions":"all",...}
```

### 6.2 推送代码

```bash
git push -u origin <branch>
```

### 6.3 触发 Release 构建

```bash
# 只打 Windows
gh workflow run release.yml --ref <branch> -f tag=v2.0.0-win-test.1 -f platform=windows

# 其他组合：platform = all | windows | mac | linux
gh workflow run release.yml --ref <branch> -f tag=v2.0.0 -f platform=all
```

### 6.4 查看、下载、发布

```bash
# 查看最近运行
gh run list -R <owner>/<repo> --workflow=release.yml --limit 5

# 实时跟踪（阻塞到结束，失败返回非 0）
gh run watch <run-id> --exit-status

# 查看失败日志
gh run view <run-id> --log-failed

# 下载草稿 Release 产物
gh release download v2.0.0-win-test.1 -R <owner>/<repo> --pattern '*.exe' --dir ./out-win

# 草稿转正式发布
gh release edit v2.0.0-win-test.1 -R <owner>/<repo> --draft=false
```

> Release workflow 会建 **draft** Release（`draft: true`、`allowUpdates: true`、`makeLatest: false`）。同名 tag 重复触发会覆盖资产。
> 只打 Windows 时，日志里 `Artifact pattern dist/*.deb did not match` 之类的警告属正常。

### 6.5 每日构建

```bash
gh workflow run nightly-build.yml --ref main
```

Nightly 只在官方仓库 `huatuostudio/huatuo-studio` 运行（`check-repository` 守卫），产物是 workflow artifacts（保留 14 天），不创建 Release。

---

## 7. 疑难排查

### 7.1 `Missing prebuilt packages for win32-x64`

**原因**：`pnpm-workspace.yaml` 的 `supportedArchitectures.os` 是 `[current]`，pnpm 只安装当前系统的原生包；`scripts/before-pack.js` 会校验目标平台包是否存在。

**不要在 Linux 上直接交叉打 Windows 包**，用对应平台或 GitHub Actions。确需交叉：

```bash
# 1) 临时把目标平台加入 pnpm-workspace.yaml
#    supportedArchitectures:
#      os: [current, win32]
#      cpu: [x64, arm64]

# 2) 必须全新安装（pnpm 只在首次安装读取该配置）
rm -rf node_modules
pnpm install

# 3) 打包（Linux 上通常还需要 wine 处理 exe 资源）
pnpm build:win
```

### 7.2 `X11/extensions/XTest.h: No such file or directory`

```bash
sudo apt-get install -y libxtst-dev libx11-dev libxfixes-dev libevdev-dev libwayland-dev
```

临时绕过（不重编 `selection-hook`，它是 N-API、自带 prebuild）：

```bash
npx --no-install @electron/rebuild -f -o better-sqlite3 -v "$(node -p "require('electron/package.json').version")" --build-from-source
pnpm exec dotenv -- electron-builder --linux AppImage deb --x64 --config.npmRebuild=false
```

### 7.3 `rpmbuild not found`

```bash
sudo apt-get install -y rpm
# 或只打 AppImage/deb
pnpm exec dotenv -- electron-builder --linux AppImage deb --x64
```

### 7.4 `NODE_MODULE_VERSION 145 ... requires 137`（ABI 不匹配）

打包会给 `better-sqlite3` 编 Electron ABI，跑单测要 Node ABI，二者来回切：

```bash
pnpm rebuild:node         # 跑 pnpm test / pnpm build:check 前
pnpm rebuild:electron     # 跑 pnpm dev / pnpm start 前

# 校验当前二进制属于哪个运行时（Electron 能加载 = Electron ABI）
ELECTRON_RUN_AS_NODE=1 node_modules/.bin/electron -e "require('better-sqlite3'); console.log('electron ABI ok')"
node -e "require('better-sqlite3'); console.log('node ABI ok')"
```

### 7.5 钩子里的 `pnpm install` 失败（onnxruntime 下载 302/超时）

```bash
# 跳过 postinstall 脚本完成依赖同步；打包前再单独重建 better-sqlite3
ONNXRUNTIME_NODE_INSTALL=skip pnpm install
npx --no-install @electron/rebuild -f -o better-sqlite3 -v 41.8.0 --build-from-source
```

### 7.6 Actions 报 `Actions has been disabled for this repository`

fork 仓库默认不跑 workflow，按 §6.1 启用即可；若 API 返回 `enabled:true` 仍报错，到 Actions 页面点启用按钮。

---

## 8. 发版检查清单

```bash
# 1) 工作区干净
git status --short

# 2) 门禁通过
pnpm build:check

# 3) 版本号与 CHANGELOG/changeset 就绪
git log --oneline -10

# 4) 推送并触发（标题里的 tag 即产物版本号）
git push -u origin <branch>
gh workflow run release.yml --ref <branch> -f tag=v<version> -f platform=all
gh run watch <run-id> --exit-status

# 5) 校验产物后发布草稿
gh release download v<version> --pattern '*.exe' --dir ./out-win
gh release edit v<version> --draft=false
```
