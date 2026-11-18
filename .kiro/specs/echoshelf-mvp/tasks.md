# Implementation Plan: EchoShelf MVP

## Overview

EchoShelf MVP 是一个完全在浏览器本地运行的个人知识归档工具。本实现计划按照技术分层组织任务：基础设施 → 数据层 → 核心服务 → UI 组件 → 功能实现 → 测试。所有任务基于需求文档和设计文档，每个任务都标注了关联的需求和验收标准。

## Tasks

- [x] 1. Setup & Infrastructure
  - [x] 1.1 Initialize Vite + React + TypeScript project
    - 创建项目结构，安装必要依赖（vite, react, react-dom, typescript, @types/react）
    - 配置 TypeScript tsconfig.json
    - 配置 Vite 基础配置
    - _Requirements: R10.10 (Deployment)_
  
  - [x] 1.2 Setup project folder structure
    - 创建 src 目录结构（components, hooks, services, utils, types）
    - 配置路径别名（@components, @services, @utils）
    - 配置 CSS Modules 和 CSS Custom Properties
    - _Requirements: R10.10 (Deployment)_
  
  - [x] 1.3 Setup Dexie.js for IndexedDB
    - 安装 dexie 依赖
    - 创建 db.ts 初始化 IndexedDB 连接
    - 配置两个数据库连接：echoshelf-user 和 echoshelf-demo
    - _Requirements: R1.2, R1.5, R7.1_
  
  - [x] 1.4 Create TypeScript interfaces and types
    - 定义 Item 接口（bookmark | article | note）
    - 定义 Source 接口
    - 定义 FilterState 接口
    - 定义 ImportErrorType 枚举
    - _Requirements: R2.1, R3.1, R4.1, Design: Data Models_

- [x] 2. Core Storage Layer (IndexedDB)
  - [x] 2.1 Define database schema with Dexie
    - 创建 Items 表（id, kind, title, canonicalUrl, body, tags, sourceIds, savedAt, readAt, starred, isSample）
    - 创建 Sources 表（id, kind, name, feedUrl, lastFetchAt, lastFetchStatus）
    - 添加索引（canonicalUrl 用于去重，savedAt 用于排序）
    - _Requirements: R7.1, Design: Data Models_
  
  - [x] 2.2 Implement database service layer
    - 实现 getItemById(id: string)
    - 实现 getAllItems(): Promise<Item[]>
    - 实现 addItem(item: Item): Promise<void>
    - 实现 updateItem(id: string, updates: Partial<Item>): Promise<void>
    - 实现 deleteItem(id: string): Promise<void>
    - _Requirements: R7.1, R7.2, R7.3_
  
  - [x] 2.3 Implement source service layer
    - 实现 getSourceById(id: string)
    - 实现 getAllSources(): Promise<Source[]>
    - 实现 addSource(source: Source): Promise<void>
    - 实现 updateSource(id: string, updates: Partial<Source>): Promise<void>
    - _Requirements: R3.1, R9.3_

- [x] 3. Data Validation & URL Normalization
  - [x] 3.1 Implement URL validator
    - 验证 URL 格式和协议（http/https）
    - 拒绝危险协议（javascript:, data:, file:, ftp:, mailto:, tel:, ssh:）
    - 验证 URL 长度限制（1-2048 字符）
    - _Requirements: R2.3, R2.5, R2.11, R3.10, R4.5, R4.6_
  
  - [x] 3.2 Implement URL normalizer
    - 转换为小写协议和域名
    - 去除默认端口、移除 fragment（hash）和跟踪参数
    - 不合并 http/https，不去除 www 和末尾斜杠，不解码百分号编码（以 normalizeUrl.ts 与开发指引 4.2 为准）
    - _Requirements: R2.3, R5.6, R5.8, Design: URL Normalization_
  
  - [x] 3.3 Implement file size validator
    - 检查文件大小不超过 5 MiB
    - 返回 FileTooLarge 错误
    - _Requirements: R2.7, R3.1, R3.3, R4.10_
  
  - [x] 3.4 Implement input length validators
    - 标题长度验证（1-255 字符）
    - URL 长度验证（1-2048 字符）
    - 笔记内容长度验证（max 100,000）
    - _Requirements: R2.2, R3.2, R3.4, R4.7, R4.11, R4.12_

- [x] 4. Import Modules (Parsers)
  - [x] 4.1 Implement HTML bookmark parser (Netscape Format)
    - 解析 <a> 标签提取 URL 和标题
    - 解析 add_date 属性转换为 UTC 时间
    - 解析 tags 属性（逗号分隔）
    - 验证标题和 URL 有效性
    - _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5, R2.6_
  
  - [x] 4.2 Implement OPML parser
    - 解析 <outline> 标签提取 feedUrl 和 title
    - 处理嵌套的文件夹结构
    - 验证字段有效性
    - _Requirements: R3.1, R3.2_
  
  - [x] 4.3 Implement RSS/Atom parser
    - 解析 RSS 2.0 <item> 标签
    - 解析 Atom <entry> 标签
    - 提取 title, link, description, pubDate, guid
    - 验证 XML 格式和安全性（XXE 防护）
    - _Requirements: R3.3, R3.4, R3.5, R3.6, R3.7_
  
  - [x] 4.4 Implement text file parser (.txt, .md)
    - 读取文件内容作为笔记正文
    - 验证文件大小限制
    - _Requirements: R4.9, R4.10_

- [x] 5. Deduplication Logic
  - [x] 5.1 Implement URL-based deduplication
    - 规范化 URL 后进行比较
    - 返回现有条目 ID 或 null
    - _Requirements: R5.6, R5.8_
  
  - [x] 5.2 Implement content-based deduplication with SHA-256
    - 计算 title + body 的 SHA-256 哈希
    - 使用 Web Crypto API
    - 返回现有条目 ID 或 null
    - _Requirements: R5.9_
  
  - [x] 5.3 Implement import result tracking
    - 统计 total, valid, duplicates, invalid
    - 生成 ImportDetail 数组
    - _Requirements: R5.2, R5.3_

- [x] 6. Core UI Components (Layout & Navigation)
  - [x] 6.1 Create layout components
    - 创建 Layout.tsx 主布局容器
    - 创建 Sidebar.tsx 侧边导航
    - 创建 Header.tsx 顶部操作栏
    - _Requirements: R10.1, R10.2 (Responsive)_
  
  - [x] 6.2 Implement sidebar navigation
    - 添加全部/书签/文章/笔记/重新发现按钮
    - 实现键盘 Tab 导航
    - 实现 Enter/Space 键触发
    - _Requirements: R10.3 (Accessibility)_
  
  - [x] 6.3 Implement responsive layout
    - 桌面三栏布局（280px 侧栏）
    - 移动端汉堡菜单折叠
    - 使用 CSS Media Queries
    - _Requirements: R10.1, R10.2 (Responsive)_

- [x] 7. Core UI Components (Views & Lists)
  - [x] 7.1 Create Dashboard view
    - 添加 Try the demo 按钮
    - 添加 Import your collection 按钮
    - 显示使用统计（书签数、订阅数、文章数）
    - _Requirements: R1.1, R1.7, R7.9 (persistent local-storage notice, see 19.5)_
  
  - [x] 7.2 Create ItemList component
    - 渲染条目列表
    - 显示标题、标签、保存日期、已读状态、收藏状态
    - 支持键盘导航
    - _Requirements: R6.9 (Click to open)_
  
  - [x] 7.3 Create ItemDetail panel
    - 显示完整详情（标题、来源、日期、标签、内容）
    - 操作按钮：标记已读、收藏、新窗口打开
    - Slide-out 面板实现
    - _Requirements: R6.9_
  
  - [x] 7.4 Create RediscoverPanel component
    - 显示推荐条目列表
    - 显示格式化时长（"Saved X months/days ago"）
    - 显示 "Unread" 标签
    - _Requirements: R8.3, R8.4_

- [x] 8. Core UI Components (Forms)
  - [x] 8.1 Create AddNoteForm component
    - 文本编辑器（textarea）
    - 字符计数器
    - 验证（max 100,000 字符）
    - _Requirements: R4.1, R4.2, R4.7_
  
  - [x] 8.2 Create AddBookmarkForm component
    - 标题输入框
    - URL 输入框
    - 实时验证反馈
    - _Requirements: R4.3, R4.4, R4.5, R4.6, R4.11, R4.12_
  
  - [x] 8.3 Create ImportForm component
    - 文件上传（拖放支持）
    - 文件验证（大小、格式）
    - 上传预览界面
    - _Requirements: R2.10, R3.1, R3.3_

- [ ] 9. Core UI Components (UI Primitives)
  - [ ] 9.1 Create Button component
    - 支持不同类型（primary, secondary, ghost）
    - 键盘支持（Tab, Enter, Space）
    - 可访问性标签（aria-label）
    - _Requirements: R10.3 (Accessibility)_
  
  - [ ] 9.2 Create Input component
    - 支持不同类型（text, url）
    - 验证状态显示
    - 错误提示
    - _Requirements: R4.5, R4.6, R4.11, R4.12_
  
  - [x] 9.3 Create EmptyState component
    - 显示无数据提示
    - 图标和操作建议
    - _Requirements: R6.8, R10.8_
  
  - [x] 9.4 Create ErrorCard component
    - 显示错误简述和代码
    - 重试按钮
    - _Requirements: R10.7_
  
  - [x] 9.5 Create LoadingSpinner component
    - 支持 reduced motion
    - 最小显示时间（300ms）
    - _Requirements: R10.6, R10.5 (Reduced Motion)_

- [ ] 10. Feature Implementation (Search & Filter)
  - [ ] 10.1 Implement search index builder
    - 提取关键词（标题、摘要、标签、URL）
    - 构建倒排索引
    - 支持中英文
    - _Requirements: R6.1 (Search in 2s)_
  
  - [x] 10.2 Implement search service
    - 处理搜索查询（≥2 字符）
    - 匹配标题、摘要、正文、标签、URL
    - 响应时间 < 2 秒
    - _Requirements: R6.1_
  
  - [ ] 10.3 Implement filter logic
    - 现状：类型与收藏筛选已实现；标签筛选、未读筛选与排序的界面尚未实现
    - 类型筛选（全部/书签/文章/笔记）
    - 标签筛选（OR 逻辑）
    - 收藏筛选（starred: true/false）
    - 未读筛选（readAt: null/not null）
    - _Requirements: R6.2, R6.3, R6.4, R6.5, R6.6, R6.7_
  
  - [x] 10.4 Implement search & filter pipeline
    - 组合搜索和筛选
    - 防抖处理（输入时）
    - _Requirements: R6.1, R6.7_

- [x] 11. Feature Implementation (Rediscover)
  - [x] 11.1 Implement Rediscover algorithm
    - 查找 > 30 天未读条目
    - 回退到最早的未读条目
    - 按 savedAt 升序排序
    - _Requirements: R8.1, R8.2, R8.7_
  
  - [x] 11.2 Implement clock interface for testing
    - 创建 Clock 接口
    - 实现 RealClock（生产用）
    - 实现 TestClock（测试用，支持时间跳跃）
    - _Requirements: R8.8 (Deterministic clock)_
  
  - [x] 11.3 Implement duration formatter
    - 格式化 "Saved X months/days ago"
    - ≥30 天显示月数，否则显示天数
    - _Requirements: R8.3_
  
  - [x] 11.4 Integrate Rediscover with item list
    - 点击条目标记为已读
    - 5 秒内从列表移除
    - _Requirements: R8.5, R8.9_

- [x] 12. Feature Implementation (RSS Refresh)
  - [x] 12.1 Implement HTTPS-only URL validation
    - 仅允许 https:// 协议
    - 返回 InvalidUrlProtocol 错误
    - _Requirements: R3.10, R9.3 (Server-side)_
  
  - [x] 12.2 Implement request timeout and size limits
    - 请求超时 8 秒
    - 响应大小限制 2 MiB
    - _Requirements: R9.1, R9.5_
  
  - [x] 12.3 Implement redirect limit
    - 最大 3 次重定向
    - 超过限制拒绝请求
    - _Requirements: R9.7_
  
  - [x] 12.4 Implement concurrent request limiting
    - 最多 5 个并发请求
    - 队列等待超出请求
    - _Requirements: R9.8_
  
  - [x] 12.5 Implement debounce for refresh button
    - 5 秒内不重复请求
    - _Requirements: R9.9_

- [x] 13. Import/Export Functionality
  - [x] 13.1 Implement data export
    - 生成 JSON 文件（schemaVersion, items, sources, exportTimestamp）
    - 使用 RFC 3339 时间格式
    - _Requirements: R7.4, R7.5_
  
  - [x] 13.2 Implement data import from export
    - 验证 schemaVersion（仅支持 v1）
    - 验证 JSON 结构完整性
    - _Requirements: R7.6, R7.7_
  
  - [x] 13.3 Implement import flow UI
    - 预览界面显示 valid/duplicate/invalid
    - 统计面板
    - 确认/取消操作
    - _Requirements: R5.1, R5.5, R5.7_
  
  - [x] 13.4 Implement database transaction for import
    - 使用 IndexedDB 事务
    - 失败时回滚
    - _Requirements: R5.5_

- [x] 14. Accessibility & Responsive Design
  - [x] 14.1 Implement keyboard navigation
    - Tab 顺序正确
    - Enter 键触发主要操作
    - Space 键触发备用操作
    - _Requirements: R10.3_
  
  - [x] 14.2 Add ARIA attributes
    - aria-label on interactive elements
    - aria-live="polite" for dynamic updates
    - aria-pressed, aria-expanded states
    - _Requirements: R10.9_
  
  - [x] 14.3 Ensure color contrast ≥ 4.5:1
    - 文本与背景对比度
    - 使用 CSS Custom Properties
    - _Requirements: R10.4_
  
  - [x] 14.4 Implement reduced motion support
    - prefers-reduced-motion 媒体查询
    - 过渡时间 ≤ 150ms
    - _Requirements: R10.5_

- [x] 15. Testing
  - [x] 15.1 Write unit tests for parsers
    - HTML bookmark parser tests
    - OPML parser tests
    - RSS/Atom parser tests
    - _Requirements: R2.1, R3.1, R3.3_
  
  - [x] 15.2 Write unit tests for URL normalizer
    - 协议小写转换
    - 默认端口与 fragment 移除、跟踪参数移除
    - 末尾斜杠、www、http/https 保持不变
    - _Requirements: R2.3, R5.6_
  
  - [x] 15.3 Write unit tests for deduplication
    - URL-based deduplication
    - Content-based deduplication (SHA-256)
    - _Requirements: R5.6, R5.8, R5.9_
  
  - [x] 15.4 Write unit tests for search & filter
    - Search index building
    - Filter composition
    - _Requirements: R6.1, R6.2-6.7_
  
  - [x] 15.5 Write property tests for correctness properties
    - **Property 1: Import Round-Trip Preserves Data**
      - **Validates: Requirements R7.4, R7.5, R7.6**
      - 测试导入-导出-再导入的数据一致性
  
    - **Property 2: Deduplication by URL is Idempotent**
      - **Validates: Requirements R5.6, R5.8**
      - 测试相同 URL 不创建重复条目
  
    - **Property 3: Content-Based Deduplication with SHA-256**
      - **Validates: Requirement R5.9**
      - 测试相同内容的哈希匹配
  
    - **Property 4: Search Filter Composability**
      - **Validates: Requirements R6.2, R6.3, R6.4, R6.5, R6.6, R6.7**
      - 测试组合筛选的正确性
  
    - **Property 5: Rediscover Rule Consistency**
      - **Validates: Requirements R8.1, R8.2**
      - 测试推荐规则的一致性
  
    - **Property 6: Database Isolation Between Demo and User**
      - **Validates: Requirements R1.5, R1.6, R7.10**
      - 测试 demo 和 user 数据库隔离
  
    - _Requirements: Design: Correctness Properties_

- [x] 16. Demo Content & Example Library
  - [x] 16.1 Implement demo database initialization
    - 创建 50 条示例条目（混合 bookmark, article, note）
    - 设置 isSample = true
    - 使用独立数据库 echoshelf-demo
    - _Requirements: R1.2, R1.4_
  
  - [x] 16.2 Implement reset demo functionality
    - 清空 echoshelf-demo 数据库
    - 保留 echoshelf-user 数据
    - _Requirements: R1.6, R7.10_
  
  - [x] 16.3 Create sample data generator
    - 随机生成标题、URL、标签
    - 随机时间戳（过去 60 天）
    - 混合有效和无效记录用于测试
    - _Requirements: R1.2, R1.7_

- [ ] 17. Documentation & Polish
  - [ ] 17.1 Add JSDoc comments to all public APIs
    - 服务层函数文档
    - 组件 props 文档
    - _Requirements: Code Quality_
  
  - [x] 17.2 Setup README with setup instructions
    - 依赖安装命令
    - 开发服务器启动命令
    - 构建命令
    - _Requirements: R10.10 (Deployment)_
  
  - [ ] 17.3 Setup linting and formatting
    - ESLint 配置
    - Prettier 配置
    - Git pre-commit hook（lint-staged）
    - _Requirements: Code Quality_

- [ ] 18. Folder Batch Import & Hosted Feed API
  - [x] 18.1 Folder tree and selection logic for bookmark files
    - analyzeBookmarkFile：一次解析，返回全部记录（含无效记录）及其文件夹路径和文件夹树（total / direct 计数）
    - 选择项 { path, scope: subtree | direct }，重叠选择只计一次；超过 1,000 的子树不可整体选择，direct 超过 1,000 时说明原因
    - planImport 接受 folders 选项，先按选择过滤再执行原有去重与上限检查
    - _Requirements: R2.8, R2.11, R2.13, R5.10_

  - [x] 18.2 Folder picker UI with running total and session state
    - 导入弹窗在书签文件超过 1,000 条时显示文件夹树、勾选框与已选合计
    - 确认一批后可继续选择同一文件的其他文件夹，已导入的文件夹做标记
    - 每批来源命名为 <file> (<folders>)
    - _Requirements: R2.8, R2.12_

  - [x] 18.3 Readable import error messages
    - describeImportError 把错误码映射为英文说明，预览只显示说明
    - _Requirements: R5.11_

  - [x] 18.4 Configurable feed API URL and resilient client
    - VITE_FEED_API_URL 构建变量；未配置时调用同源 /api
    - 刷新前 GET /api/health（90 秒超时，显示唤醒状态），抓取请求 30 秒超时
    - 网络错误、超时、非 JSON 响应、未配置都记录为 network-error 并显示原因
    - 页面加载时不发送预热请求
    - 订阅区可按地址添加订阅；保留示例域名的订阅标注 Sample feed，不显示刷新按钮
    - 状态区分超时、HTTP 错误、格式无效、响应过大、安全规则拦截、限频与网络错误
    - _Requirements: R9.13, R9.14, R9.15, R9.16, R9.17, R10.10_

  - [x] 18.5 Server CORS allowlist, per-IP rate limit and queue cap
    - ALLOWED_ORIGINS 精确匹配；只对允许的来源响应预检
    - 每 IP 每 10 分钟 20 次（FEED_RATE_LIMIT），超出返回 429 与 retryAfterSeconds；TRUST_PROXY_HOPS 控制代理层数
    - 等待并发名额的请求超过 20 个返回 503；dist/ 不存在时不提供静态文件
    - _Requirements: R9.11, R9.12_

  - [x] 18.6 Tests for batch import and API limits
    - 单元测试：文件夹树计数、选择过滤、planImport 分批、错误说明、限频器
    - E2E：1,200 条书签文件分两批导入，第二批后共 1,200 条，重复选择不新建
    - _Requirements: R2.8, R2.12, R2.13, R5.11, R9.12_

  - [x] 18.7 Deploy feed API and wire the Pages build
    - 托管在 Railway（Free 计划，单实例），服务地址 https://echoshelf-feeds-production-1c901821.up.railway.app；Render（要求绑卡）和 Vercel（账号审核中）未采用，render.yaml 已在 20.1 删除
    - 部署 src/server/index.ts（API-only，dist/ 不存在）：根目录 `2026kirowen`，启动命令 `npm start`，端口 8080；Build Command 设为 `echo "skip build"`，因为 Railpack 已用 npm install 装好依赖，再跑 npm ci 会报 EBUSY
    - 服务端环境变量：ALLOWED_ORIGINS（Pages 来源）、TRUST_PROXY_HOPS=1、CLIENT_IP_HEADER=x-real-ip（18.8）、FEED_RATE_LIMIT=20、NODE_VERSION=22；网络安全规则未改动
    - Pages 构建读取仓库变量 FEED_API_URL（已设置），workflow_dispatch 运行 44269372343 部署后，线上页面点 Refresh 成功显示文章
    - 验收（2026-11-18 实测）：/api/health 200；允许来源预检 204，其他来源 403；RSS 源 https://hnrss.org/frontpage 抓取成功；Atom 源 https://github.com/nodejs/node/releases.atom 返回 200、ok:true、10 篇；https://127.0.0.1 和 https://169.254.169.254 返回 400 blocked-target，http:// 返回 400 invalid-url
    - 限频验收：设置 CLIENT_IP_HEADER 后，10 分钟内超过 20 次请求返回 429；伪造 X-Real-IP 或 X-Forwarded-For 仍为 429；两个不同出口 IP（直连与本机代理）各有独立限额，直连被限到 429 时代理路径返回 400 blocked-target
    - _Requirements: R9.11, R9.12, R10.10_

  - [x] 18.8 Read the client IP from a host-provided header
    - 新增环境变量 CLIENT_IP_HEADER（例如 x-real-ip）：设置后限频按该请求头取客户端 IP，未设置时保持 req.ip 与 TRUST_PROXY_HOPS 的现有行为
    - 只接受单个合法 IPv4/IPv6 值；请求头缺失或非法时回退到 req.ip，不得让请求绕过限频
    - 原因：Railway 网关覆盖 X-Real-IP，实测 trust proxy = 1 时 22 次请求未触发 429
    - 单元测试覆盖取值与回退；更新 README 和 tech steering 的环境变量说明
    - _Requirements: R9.12_

## Gap Closure (post-MVP alignment)

- [ ] 19. Feature gaps against the development guide
  - [x] 19.1 Hide Refresh when no feed API is configured
    - 静态构建且未设置 VITE_FEED_API_URL 时隐藏 Refresh，并显示说明：在线订阅刷新需要单独部署的订阅服务，或使用本地版
    - 添加订阅和导入 OPML 仍可用
    - _Requirements: R9.13, R10.10_

  - [ ] 19.2 Tag filter, unread filter and sorting
    - 标签多选（OR）、Unread 开关、按保存时间和标题排序，与搜索和类型筛选组合
    - 纯函数放在 filterItems.ts，补单元测试
    - _Requirements: R6.7, R6.11_

  - [ ] 19.3 Edit and delete items
    - 编辑书签和笔记，沿用创建时的校验；删除前确认
    - 示例库与个人库互不影响；补单元测试和一条 E2E
    - _Requirements: R4.13, R4.14_

  - [ ] 19.4 Browse by source and tag in the sidebar
    - 点击订阅来源或标签只显示对应条目，可清除限定
    - _Requirements: R6.12_

  - [ ] 19.5 Local-storage notice in the personal library
    - 个人库持续显示"数据只保存在本浏览器"提示和导出入口；示例库不显示
    - _Requirements: R7.9_

  - [ ] 19.6 Save folder paths and add directory view
    - Item 增加 folderPath，解析器保存完整路径，合并时不覆盖；备份格式保持向后兼容
    - 目录视图按层级浏览，带面包屑，无路径的条目归入 Unfiled
    - _Requirements: R2.14, R6.13_

  - [ ] 19.7 Generate the demo library through the real import pipeline
    - 示例库由 public/demo 的示例文件经 planImport 写入，而不是直接写库
    - _Requirements: R1.2, R1.4_

- [ ] 20. Repository and presentation cleanup
  - [x] 20.1 Remove render.yaml and its references
    - 删除 render.yaml，并同步 tech steering、README、18.7 的描述
    - _Requirements: R10.10_

  - [ ] 20.2 Narrow-screen and contrast checks
    - 在 390px 宽度检查布局并补一条 E2E；次要按钮悬停对比度提高到 4.5:1 以上
    - _Requirements: R10.2, R10.4_

## Checkpoints

- [x] Checkpoint 1 - Core Infrastructure
  - Ensure all setup and infrastructure tasks completed.
  - Database schema and service layer working.
  - Basic layout and navigation components rendered.
  - Ask the user if questions arise.

- [x] Checkpoint 2 - Import/Export & Deduplication
  - Ensure import parsers working for HTML, OPML, RSS/Atom.
  - URL normalization and deduplication logic correct.
  - Import preview and confirmation flow tested.
  - Export/import of backup files functional.
  - Ask the user if questions arise.

- [ ] Checkpoint 3 - Search, Filter & Rediscover
  - Ensure search and filter functionality working.
  - Rediscover algorithm producing correct results.
  - RSS refresh flow with timeout, size limits, and concurrency control.
  - Ask the user if questions arise.

- [ ] Checkpoint 4 - Accessibility, Testing & Demo
  - Ensure all accessibility requirements met (keyboard, ARIA, contrast, reduced motion).
  - All unit tests and property tests passing.
  - Demo content generation working correctly.
  - Ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3", "1.4"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "3.4"]
    },
    {
      "id": 2,
      "tasks": ["4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3"]
    },
    {
      "id": 3,
      "tasks": ["6.1", "6.2", "6.3", "7.1", "7.2", "7.3", "7.4"]
    },
    {
      "id": 4,
      "tasks": ["8.1", "8.2", "8.3", "9.1", "9.2", "9.3", "9.4", "9.5"]
    },
    {
      "id": 5,
      "tasks": ["10.1", "10.2", "10.3", "10.4", "11.1", "11.2", "11.3", "11.4"]
    },
    {
      "id": 6,
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "13.1", "13.2", "13.3", "13.4"]
    },
    {
      "id": 7,
      "tasks": ["14.1", "14.2", "14.3", "14.4", "15.1", "15.2", "15.3", "15.4"]
    },
    {
      "id": 8,
      "tasks": ["15.5", "16.1", "16.2", "16.3", "17.1", "17.2", "17.3"]
    },
    {
      "id": 9,
      "tasks": ["18.1", "18.3", "18.5"]
    },
    {
      "id": 10,
      "tasks": ["18.2", "18.4"]
    },
    {
      "id": 11,
      "tasks": ["18.6"]
    },
    {
      "id": 12,
      "tasks": ["18.7"]
    },
    {
      "id": 13,
      "tasks": ["19.1", "19.2", "19.3", "19.5", "19.7", "20.1", "20.2"]
    },
    {
      "id": 14,
      "tasks": ["19.4", "19.6"]
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (test-related sub-tasks)
- Each task references specific requirements and acceptance criteria for traceability
- Checkpoints ensure incremental validation and user feedback points
- Property tests (in task 15.5) validate universal correctness properties defined in design
- Unit tests validate specific examples and edge cases for individual functions
- All 10 requirements (R1-R10) are covered across the implementation tasks
- Testing tasks (unit, property, integration) are marked optional with `*` where appropriate
- The dependency graph ensures logical build order: setup → storage → parsers → UI → features → testing