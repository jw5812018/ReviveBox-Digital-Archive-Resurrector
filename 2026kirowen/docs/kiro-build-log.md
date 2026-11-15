# Kiro Build Log — EchoShelf

按开发指引要求逐阶段记录实际开发过程。

## 2026-11-15 — 规格完成（阶段 0）

- 完成 `.kiro/specs/echoshelf-mvp/` 下 requirements.md（R1–R10，EARS 格式，逐条细化）、design.md、tasks.md（17 个任务组 + 依赖图）。
- 环境确认：Node.js v24.22.1，npm 11.19.1，Windows / PowerShell。
- 工作区与上级目录无 AGENTS.md，以 docs/KIRO_DEVELOPMENT_GUIDE.md 为唯一实施依据。
- 使用的 Kiro 功能：Spec（Requirements-First 工作流）、需求细化子代理（requirement-detailer）、任务状态跟踪（task tools）。

## 2026-11-15 — 基础设施与数据层（阶段 1 进行中）

对应任务：1.1–1.4、2.1–2.3、3.1–3.4、4.1–4.4、5.1–5.3。

实际修改：
- 初始化 React 18.3.1 + TypeScript 7.0.2 + Vite 8.3.8（@vitejs/plugin-react 5.2.0），手动重建骨架（`npm create vite` 为非交互阻塞式，放弃）。
- 目录结构：src/client/{app,features,storage,styles}、src/server/feeds、src/shared/{models,import,urls}、tests/{unit,integration,e2e}、assets/demo、scripts。
- 路径别名 @client/@server/@shared（tsconfig `paths` 不带 baseUrl —— TypeScript 7 已移除该选项；vite.config.ts 用 node:url 解析，node 侧配置拆分为 tsconfig.node.json）。
- Dexie 4：`src/client/storage/db.ts`，两个独立库 echoshelf-user / echoshelf-demo，items 与 sources 表及索引。
- 服务层：itemService.ts、sourceService.ts（CRUD，updateItem 自动更新 updatedAt）。
- 校验器：validateUrl.ts（http/https、长度、危险协议）、limits.ts（5 MiB、1000 条、标题/正文长度）。
- URL 规范化 normalizeUrl.ts。
- 解析器：bookmarkParser.ts（Netscape HTML，DOMParser，H3=文件夹/A=书签）、opmlParser.ts、feedParser.ts（RSS 2.0 + Atom，DOCTYPE 拒绝）、textParser.ts。
- 去重：dedupe.ts（canonicalUrl / SHA-256 指纹）、fingerprint.ts、importResult.ts。

运行的检查：
- `npx tsc --noEmit` 通过；`npx vite build` 通过；`npm run build` 退出码 0。
- 备注：pwsh 运行器对 npm 链式脚本偶发误报退出码 -1，直接运行 npx 或将输出重定向到文件可确认真实结果。

发现的问题与决策：
1. tasks.md 3.2 要求「移除 www 前缀、去除末尾斜杠」，与开发指引 4.2「不要默认合并不同的 www 域名或尾斜杠」冲突。**决策：以开发指引为准**，规范化仅做小写协议/域名、去默认端口、去片段、去跟踪参数（utm_*/fbclid/gclid）。已在 normalizeUrl.ts 注释中说明。
2. TypeScript 7 移除 baseUrl，路径别名改用相对 paths。
3. RSS pubDate 为 RFC 822，超出细化需求列举的格式；实现采用 Date.parse（覆盖 RFC 3339/ISO 8601/RFC 822）+ 数字串按 UNIX 秒处理。

下一步：UI 组件（任务 6–9）、手动添加书签/笔记表单、列表与详情、持久化验证（阶段 1 验收流程）。

Kiro 功能使用：任务工具更新 tasks.md 状态；execute_pwsh 写文件与验证（write_file 工具在本环境不可用）。
## 2026-11-15 — 核心 UI（阶段 1 主体完成）

对应任务：6.1–6.3、7.2–7.4、8.1–8.2（任务组 6、7、8 大部分）。

实际修改：
- 布局：Layout.tsx（侧栏/主区/详情面板网格）、Sidebar.tsx（导航 + 真实计数）、Header.tsx（搜索框 + Add 按钮）。
- 视图：ItemList.tsx（标题/类型/日期/标签/未读点/星标）、ItemDetail.tsx（完整元信息、正文、安全外链 rel="noopener noreferrer"）、RediscoverPanel.tsx（未读条目 + "Saved X ago · Unread" 原因，30 天规则引擎在任务 11 完善）。
- 表单：AddNoteForm.tsx（字数统计、10 万字符上限）、AddBookmarkForm.tsx（复用 validateUrl/TITLE_MAX_FORM，内联错误提示）。
- 状态管理：App.tsx 重写，useState + useMemo 本地状态，存储经 itemService/sourceService；ensureManualSource 为手动条目挂"Manual entry"来源。
- 样式：index.css 全量设计系统（暖纸白底/墨色字/琥珀强调），1024px/768px 断点、窄屏抽屉式侧栏与详情、prefers-reduced-motion 降级。
- 阶段 1 验收流程"添加书签/笔记 → 列表 → 详情 → 刷新后仍在"代码路径已通（IndexedDB 持久化），待浏览器实测（Playwright 在任务 15 引入）。

运行的检查：`npm run build` 通过（34 模块，253 kB JS / 6.5 kB CSS）。

环境备注：已通过 ~/.kiro/settings/permissions.yaml 配置 shell 全信任（用户要求完全访问权限，原文件备份 .bak）。文件写入工具本会话仍不可用，继续用 execute_pwsh 写文件。

下一步：导入流程 UI（8.3、13.x）、Dashboard 首次进入（7.1）与示例库（16.x）、搜索/筛选模块化（10.x）、Rediscover 规则引擎（11.x）、RSS 服务端（12.x）、测试（15.x）。
## 2026-11-15 — 示例库与导入/导出（阶段 2 核心）

对应任务：16.1–16.3、7.1、8.3、13.1–13.4。

实际修改：
- 示例数据：demoData.ts（50 条原创中英文示例：20 书签/18 文章/12 笔记，example.org 保留域名，日期 12–400 天前，混合已读/未读/星标）；demoLibrary.ts（独立 echoshelf-demo 库的初始化与重置，事务写入）。
- Dashboard：首次进入页（Try the demo / Import your collection + 可下载示例文件链接）。
- 导入管线 src/shared/import/pipeline.ts：按扩展名分派（html/opml/xml/rss/atom/txt/md），解析 → 规范化 → 去重（批次内 + 库内）→ 生成写入计划（create/merge）与逐条预览明细；1000 条上限拒绝。
- 合并策略（R5 AC6）：重复条目仅并集 sourceIds 与 tags，不覆盖用户字段。
- 备份 src/shared/import/backup.ts：v1 schemaVersion JSON 导出；导入前校验版本、结构、字段类型、URL 协议、sourceIds 引用完整性，损坏即拒。
- ImportModal.tsx：文件选择 → 预览（新建/重复/无效统计 + 逐条状态）→ 确认后单事务写入（失败整体回滚）；.json 走备份恢复（bulkPut 按 id 合并）。
- App 接入 personal/demo 双模式切换、demo 横幅（统计 + Reset demo + Back to personal）、Sidebar 底部 Import / Export data 按钮。
- 示例输入文件放 public/demo/（开发指引建议 assets/demo；选 public/ 是为了开发与生产构建都能直接下载，构建产物已含）。
- sample-bookmarks.html 故意包含：3 条 utm 变体重复（演示规范化去重）、1 条 javascript: 协议（演示拒绝）、嵌套文件夹（演示父文件夹转标签）。

运行的检查：`npm run build` 通过（285 kB JS）。

发现的问题：App.tsx 一处未使用导入导致构建失败一次，已修复。

下一步：9.x UI 基础组件抽取（当前多为内联实现）、10.x 搜索索引、11.x Rediscover 规则引擎与时钟注入、12.x RSS 服务端、14.x 可访问性补全、15.x 测试体系、17.x 文档。
## 2026-11-15 — Rediscover 规则引擎与 RSS 服务端（阶段 3/4 主体）

对应任务：11.1–11.4、12.1–12.5。

实际修改：
- Rediscover：clock.ts（Clock 接口 + realClock/fixedClock，R8 AC8 时钟注入）；rediscover.ts（>30 天未读 → 回退最早未读 → 空态，savedAt 稳定升序，formatSavedAgo 原因文案）；面板显示当前规则说明；点击 Rediscover 条目即标记已读并打开详情（R8 AC9）。
- 服务端：Express 5 + tsx，POST /api/feeds/fetch。fetchFeed.ts 实现全部出口约束：仅 HTTPS+443、禁 URL 内凭证、禁 localhost/私网/回环/链路本地/保留段（IPv4/IPv6/IPv4-mapped 全覆盖）；DNS 先解析验证全部地址，连接直连已验证 IP（SNI/证书校验仍用原域名，杜绝"验证后重新解析"差异）；重定向≤3 且逐跳重验；总超时 8s；压缩硬上限 16 MiB、解压后 2 MiB；gzip/deflate/br 解压。
- 解析复用共享 feedParser（服务端经 linkedom 提供 DOMParser；DOCTYPE 拒绝防 XXE）。正文提取 htmlToText：只取 textContent 不渲染 HTML（浏览器/linkedom 行为差异已处理：documentElement 优先）。
- 并发：服务端信号量上限 5，超出排队；客户端同订阅 5 秒防重复点击（R9 AC9）。
- 客户端：feedRefresh.ts（状态机映射 timeout/http-error/invalid-format/redirect-limit/network-error，失败只更新状态不动历史内容）；Sidebar 订阅区（名称、状态、Refresh 按钮）。
- 脚本：dev = concurrently 起 Vite + API；start = tsx 起生产服务（同进程供静态文件 + /api）。

真实网络验证记录（guide 阶段 4 要求）：
- 日期：2026-11-15（北京时间约 10:50）
- RSS 2.0：https://hnrss.org/frontpage → 200，解析 20 条全部有效，正文 HTML 已剥离为纯文本
- Atom：https://www.ruanyifeng.com/blog/atom.xml → 200，解析 3 条全部有效，中文标题正常
- SSRF 拦截：http://localhost（协议拒绝）、https://192.168.1.1/feed（私网地址拒绝）均按预期返回错误
- 排查记录：首次失败 "Invalid IP address: undefined" 为旧进程占用 3001 端口所致（非代码缺陷）；linkedom textContent 与浏览器行为差异导致正文为空，已修复

发现的问题与决策：
- package.json dev 脚本引号被 PowerShell 写坏一次，改为 \" 转义后正常。
- 多次遇到 pwsh 运行器吞输出/误报退出码，采用写文件再读回的方式取结果。

下一步：9.x UI 基础组件、10.x 搜索索引、14.x 可访问性补全、15.x 测试体系（Vitest/Playwright）、17.x 文档。
## 2026-11-15 — 测试体系与 E2E 主流程（阶段 4/5 验证层）

对应任务：15.1–15.5（及 E2E 基础设施）。

实际修改：
- 测试栈：Vitest 5.1 + happy-dom（单元/性质）+ Playwright（E2E，Chromium 经 npmmirror CDN 安装）。vitest.config.ts 配路径别名；tests/unit 归客户端 tsconfig，tests/e2e 归 node tsconfig。
- 单元测试 8 文件 48 例：normalizeUrl、bookmarkParser、opmlParser、feedParser、dedupe+fingerprint、filterItems、rediscover、properties。
- 性质测试（fast-check，真实不变量）：
  1. normalize(normalize(url)) = normalize(url)（500 例）
  2. 同一批书签重复导入零新建且全部判重（100 例）
  3. 备份导出→导入深度还原（200 例）
  4. Rediscover 结果始终未读且按 savedAt 升序（300 例）
- **PBT 实际发现**：导入幂等性质抓出批次内重复的合并动作被丢弃的真 bug（目标条目在 createItems 中尚未入库，MergeAction 找不到目标）。已修复：批次内重复直接并入待写入条目，MergeAction 只针对库内已有条目。另修正性质断言（重复数应等于解析记录数而非首轮新建数）。
- 解析器健壮性（测试驱动修复）：书签解析改为祖先遍历取文件夹路径（弃用 :scope，happy-dom 不支持）；feedParser 的 content:encoded 改用 getElementsByTagName（选择器转义在 happy-dom 非法）。
- E2E（3 条，Chromium）：① 示例→导入→预览（4 新/3 重/1 无效）→确认→搜索→收藏→刷新持久→导出校验；② 个人库添加书签→刷新仍在；③ 示例重置不影响个人库。
- 测试发现并修复的真实缺陷：mode 刷新丢失（刷新后从示例库掉回个人库）→ localStorage 持久化 mode；个人库非空后无法进入示例库 → 侧栏常驻 Try the demo 入口。
- 运行方式：npm test（48 例单测，~2s）、npm run test:e2e（3 条，~5s）。全部通过。

下一步：9.x 基础组件抽取、10.x 搜索模块化决策、14.x 可访问性补全（Esc/焦点）、17.x 文档与 README、部署准备。
## 2026-11-15 — 可访问性、lint、文档与 Kiro 配置（阶段 5/6）

对应任务：14.1–14.4、9.3–9.5、10.2–10.4、17.2（及 8.2/8.3 指引要求）。

实际修改：
- 可访问性：Modal.tsx（Esc 关闭、开启时聚焦首个控件、关闭后焦点还原触发元素）；ItemList/RediscoverPanel/App 复用 EmptyState/ErrorCard/LoadingSpinner 组件。
- ESLint 10 flat config（@eslint/js + typescript-eslint + react-hooks）接入 `npm run lint`；发现并修复 react-hooks v6 的 set-state-in-effect 告警（App 初始加载改为 queueMicrotask 延迟）。
- **TypeScript 7.0.2 → 5.9.3 降级**：typescript-eslint 运行时硬拒绝 TS 7.0。依指引"可兼容稳定版本"原则降级，双 tsconfig 全部通过，48 单测 + 3 E2E 回归全绿。
- README.md（英文）：定位、特性、命令表、生产部署说明（静态托管不足以支持实时订阅）、订阅读取规则、数据模型、目录结构。
- LICENSE：MIT。
- `.kiro/steering/`：product.md / tech.md / quality.md（仅收录项目真实遵循的规则）。
- `.kiro/hooks/unit-tests-after-task.json`：PostTaskExec → `npm --prefix 2026kirowen test`。createHook 工具在本会话不可用，按官方 schema 手写；会话内未能确认自动触发（或需 IDE 重载注册），已在 kiro-usage.md 如实记录。
- `docs/kiro-usage.md`：实际使用的 Kiro 功能清单（Specs、任务工具、steering、hooks、终端执行、web fetch），并明确未使用的功能。

范围决策（保持 tasks.md 中开放，不标完成）：
- 9.1/9.2 Button/Input：以 CSS 类（.btn-primary 等）+ 原生语义元素实现，未抽 React 组件，行为需求均已满足。
- 10.1 倒排索引：R6 AC1（<2s 响应）在线性规范化扫描下轻松满足（千级条目 <1ms），按 YAGNI 不建索引；搜索服务由 filterItems 模块承担并有测试覆盖。

验证：lint 0 错误、双 tsc 通过、48 单测、3 E2E、build 全绿。

下一步：生产构建实测（build + start + 页面验证）、demo-script/submission 文案、部署。
## 2026-11-15 — 生产构建实测

- `npm run build` 通过（dist：JS 291 kB / CSS 9.6 kB）。
- `npm start`（tsx 生产服务，3001 端口）实测：GET / → 200 应用页面；GET /demo/sample-bookmarks.html → 200 示例文件可下载；GET /some/client/route → 200 SPA 回退正常；GET /api/health → {"ok":true}。
- 阶段 5 验收点"生产构建能运行"达成。部署剩余事项：选定平台后的实际上线（阶段 6，需用户决策）。