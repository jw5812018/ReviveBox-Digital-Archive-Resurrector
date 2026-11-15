# Requirements Document

## Introduction

EchoShelf 是一个个人知识归档工具，帮助开发者、研究者和学生找回他们遗忘在网上的内容。系统将散落的浏览器书签、RSS 订阅和文本笔记整理成可搜索、可浏览、可重新发现的个人知识架。

EchoShelf 的核心价值在于"复活"经典个人网页门户体验：用户主动选择来源、拥有自己的目录、可以重新发现有价值的资料。系统保留书签 HTML 与 OPML 等可迁移数据的价值，同时提供统一搜索、去重、本地持久化和智能推荐功能。

EchoShelf 第一版聚焦于核心功能：导入现有收藏、管理个人知识库、搜索查找内容、以及基于简单规则的重新发现。系统完全在浏览器本地运行，无需账号、无需云存储、无需 AI API 密钥。

## Glossary

- **Item (条目)**: 系统中的单一内容单位，可以是书签（Bookmark）、文章（Article）或笔记（Note）
- **Bookmark (书签)**: 保存的网页链接，包含标题、URL 和可选的摘要/标签
- **Article (文章)**: 已保存的 RSS/Atom 订阅中的文章内容
- **Note (笔记)**: 用户创建的纯文本内容，支持 Markdown 格式但不渲染
- **Source (来源)**: 条目的来源，包括书签文件、RSS 订阅、手动添加等
- **Feed (订阅)**: RSS 2.0 或 Atom XML 格式的订阅源，包含多个文章条目
- **URL 规范化**: 将 URL 转换为标准格式以进行去重和比较的过程
- **Rediscover (重新发现)**: 系统根据简单规则推荐用户早期保存但尚未阅读的条目
- **IndexedDB**: 浏览器本地数据库，用于持久化存储用户数据
- **Dexie**: 基于 IndexedDB 的轻量级数据库包装库

## Requirements

### Requirement 1: 首次进入与示例库

**User Story:** 作为新用户，我想要在无需登录的情况下快速体验系统，所以系统能够提供示例数据让我了解功能。

#### Acceptance Criteria

1. WHEN 用户首次访问应用，THE System SHALL 显示两个可点击按钮，标签分别为"Try the demo"和"Import your collection"，每个按钮具有可见文本标签和可访问性标签
2. WHEN 用户点击"Try the demo"按钮，THE System SHALL 初始化一个独立的 IndexedDB 数据库（名称为'echoshelf-demo'），包含 exactly 50 条由系统生成的示例内容，每条示例条目包含 source 字段且值为'demo'
3. WHEN 用户点击"Import your collection"按钮，THE System SHALL 显示文件选择对话框，其中文件输入字段的值属性为空字符串
4. WHEN 示例数据库初始化完成，THE System SHALL 为所有示例条目设置 isSample 字段为 true，并在界面上显示名为"Sample"的视觉标记，所有示例条目不发起任何网络请求
5. WHILE 用户处于示例库模式，THE System SHALL 使用独立的 IndexedDB 数据库（'echoshelf-demo'）存储示例数据，并使用独立的 IndexedDB 数据库（'echoshelf-user'）存储个人数据，两个数据库之间不存在任何交叉引用
6. IF 用户触发重置示例库操作，THEN THE System SHALL 清空'echoshelf-demo'数据库中的所有数据，且'echoshelf-user'数据库内容保持不变
7. WHEN 示例内容加载完成，THE System SHALL 显示来源说明文本"示例数据由系统生成"和三个数据统计指标：书签数量、订阅数量、文章数量

### Requirement 2: 导入浏览器书签 HTML

**User Story:** 作为已有收藏的用户，我想要导入浏览器导出的书签 HTML 文件，所以系统能够将我已有的收藏迁移进来。

#### Acceptance Criteria

1. WHEN 用户选择一个书签 HTML 文件导入，THE Parser SHALL 读取文件内容并解析符合 Netscape Bookmark Exchange Format 的 HTML 结构，其中 H3 元素表示文件夹、A 元素表示书签，解析超时不得超过 30 秒
2. WHERE 书签包含长度在 1 到 255 个字符之间的有效标题（去除首尾空白字符后非空），THE Parser SHALL 提取标题作为 Item 的 title 字段
3. WHERE 书签包含有效的 http 或 https URL（长度在 1 到 2048 个字符），THE Parser SHALL 提取 URL 并执行规范化处理，包括：去除末尾斜杠（根路径除外）、转换为小写协议和域名、解码百分号编码
4. WHERE 书签包含保存日期（LAST_MODIFIED 或 ADD_DATE 属性），THE Parser SHALL 按照以下优先顺序处理：先尝试 RFC 3339 格式，再尝试 UNIX 时间戳（秒），最终转换为 UTC 时间
5. WHERE 书签包含文件夹路径（使用正斜杠 / 作为分隔符），THE Parser SHALL 将直接父文件夹作为初始标签添加到 tags 字段，最多添加 100 个标签
6. IF 书签缺少有效标题（长度为 0 或超过 255 字符）或有效 URL（非 http/https 协议或长度超过 2048 字符），THE Parser SHALL 标记为无效记录，并从以下错误类型中选择匹配的错误：MissingTitle、MissingUrl、InvalidUrlProtocol、TitleTooLong、UrlTooLong
7. WHEN 书签文件大小超过 5 MiB，THE Importer SHALL 拒绝导入并说明文件过大
8. WHEN 书签文件包含超过 1000 条记录，THE Importer SHALL 拒绝导入并说明记录数过多
9. IF 书签 URL 协议属于以下列表（javascript:、data:、file:、ftp:、mailto:、tel:、ssh:），THE Parser SHALL 标记为无效记录并返回 InvalidUrlProtocol 错误
10. WHEN 书签导入流程开始，THE System SHALL 显示导入预览界面，展示每条记录的标题、URL、标签列表和解析状态（有效/无效及错误类型），预览会话超时时间为 300 秒

### Requirement 3: 导入订阅与文章

**User Story:** 作为 RSS 订阅用户，我想要导入 OPML 和 RSS/Atom 文件，所以系统能够管理我的订阅源和已保存的文章。

#### Acceptance Criteria

1. WHEN 用户选择 OPML 文件导入，WHERE 文件大小不超过 5 MiB，WHERE 条目数量不超过 1000 个订阅源，THE Parser SHALL 解析订阅源列表并创建 Source 记录；IF 文件超过大小或记录数限制，THE Parser SHALL 拒绝导入并返回 FileTooLarge 或 TooManyRecords 错误
2. WHERE OPML 解析过程中，THE Parser SHALL 提取 feedUrl（长度在 1 到 2048 个字符）和 title（长度在 1 到 255 个字符，去除首尾空白字符后非空）字段；IF 字段缺失或超出长度限制，THE Parser SHALL 标记为无效记录并返回 MissingField、UrlTooLong 或 TitleTooLong 错误
3. WHEN 用户选择 RSS 2.0 或 Atom XML 文件导入，WHERE 文件大小不超过 5 MiB，WHERE 条目数量不超过 1000 个文章，THE Parser SHALL 解析文章条目并创建 Item 记录；IF 文件超过大小或记录数限制，THE Parser SHALL 拒绝导入并返回 FileTooLarge 或 TooManyRecords 错误
4. WHERE 文章条目包含长度在 1 到 255 个字符的标题且 URL 符合 http 或 https 协议（长度在 1 到 2048 个字符），THE Parser SHALL 提取这些字段到 Item；IF 标题或 URL 缺失、超出长度限制或协议无效，THE Parser SHALL 标记为无效记录并返回 MissingField、TitleTooLong、UrlTooLong 或 InvalidUrlProtocol 错误
5. WHERE 文章包含多个时间字段，THE Parser SHALL 按以下优先顺序提取：先尝试 RFC 3339 格式，再尝试 ISO 8601 格式，再尝试 UNIX 时间戳（秒），最终转换为 UTC 时间；IF 所有时间字段缺失或无效，THE Parser SHALL 使用导入开始时的系统时钟时间作为 savedAt；IF 时间字段存在但无法解析，THE Parser SHALL 标记为 InvalidDate 错误
6. WHERE 文章包含摘要或正文字段，THE Parser SHALL 优先提取摘要字段，IF 摘要缺失则提取正文字段，提取内容长度不得超过 100,000 个字符；IF 提取内容超过限制，THE Parser SHALL 截断并标记为 ContentTruncated；IF 正文缺失且摘要也缺失，THE Parser SHALL 标记为 MissingField 错误
7. IF XML 文件格式无效、包含恶意内容（如 XXE 攻击、外部实体注入）、或解析超时超过 30 秒，THE Parser SHALL 标记为无效记录并返回 MalformedXml、SecurityViolation 或 ParserTimeout 错误
8. WHERE 日期字段解析失败或标记为 InvalidDate，THE Parser SHALL 使用导入开始时的系统时钟时间作为 savedAt 字段，并在错误详情中说明"日期解析失败，使用导入时间替代"
9. IF 订阅 URL 使用非 https 协议，THE Importer SHALL 拒绝导入并返回 InvalidUrlProtocol 错误，错误详情中说明"仅支持 HTTPS 协议"
10. WHEN RSS/Atom 导入流程完成，THE System SHALL 显示统计信息：订阅源数量和文章数量，数量精度为整数计数

### Requirement 4: 笔记与单条收藏

**User Story:** 作为用户，我想要手动创建笔记和添加单个书签，所以系统能够记录我的即时想法和收藏。

#### Acceptance Criteria

1. WHEN 用户点击"Add Note"，THE System SHALL 显示一个空文本编辑器，编辑器初始状态为完全清空（无占位符文本、无预填充内容）
2. WHEN 用户在编辑器中输入内容并点击"Save"，THE System SHALL 创建一个 Note 类型的 Item，包含创建时间戳（精确到毫秒）和用户输入的文本内容
3. WHEN 用户点击"Add Bookmark"，THE System SHALL 显示一个包含标题字段和 URL 字段的表单，两个字段初始状态均为空白
4. WHEN 用户输入标题（长度 1-200 字符）和有效的 http/https URL（长度 1-2048 字符）并点击"Save"，THE System SHALL 创建一个 Bookmark 类型的 Item，URL 必须以 "http://" 或 "https://" 开头
5. IF 用户输入的 URL 不以 "http://" 或 "https://" 开头，THE System SHALL 显示错误提示"URL 必须使用 http 或 https 协议"
6. IF 用户输入的 URL 包含 javascript:、data: 或 file: 协议，THE Validator SHALL 显示错误提示"禁止使用危险协议"
7. IF 笔记文本长度超过 100,000 字符，THE System SHALL 显示错误提示"笔记内容过长"
8. WHEN 笔记或书签创建成功，THE System SHALL 在列表视图中立即（响应时间 ≤ 2 秒）显示该 Item
9. WHERE 用户导入 .txt 或 .md 文件（单个文件大小 ≤ 5 MiB），THE Parser SHALL 解析文件内容并创建 Note 类型的 Item
10. IF 导入的文本文件大小超过 5 MiB，THE Parser SHALL 拒绝处理并显示错误提示"文件大小超过 5 MiB 限制"
11. WHEN 书签表单提交时标题字段为空或超过 200 字符，THE System SHALL 显示错误提示"标题长度必须为 1-200 字符"
12. WHEN 书签表单提交时 URL 字段为空或超过 2048 字符，THE System SHALL 显示错误提示"URL 长度必须为 1-2048 字符"

### Requirement 5: 导入预览与去重

**User Story:** 作为用户，我想要在导入前预览结果并避免重复，所以系统能够清楚显示将要创建的新条目、重复条目和无效记录。

#### Acceptance Criteria

1. WHEN 用户选择文件导入，THE System SHALL 先解析并显示预览界面，不直接写入数据库
2. WHERE 预览结果包含新记录、重复记录和无效记录的分类统计，THE System SHALL 显示具体数量
3. WHERE 每条记录都显示来源文件、处理结果（新建/重复/无效）和原因说明，THE System SHALL 提供详细列表
4. IF 记录缺失 title 字段（长度为 0 或超过 255 字符）或缺失 url 字段（非 http/https 协议或长度超过 2048 字符），THE System SHALL 标记为无效记录并返回 MissingTitle、MissingUrl、TitleTooLong、UrlTooLong 或 InvalidUrlProtocol 错误
5. WHERE 用户点击"Confirm Import"，THE System SHALL 执行数据库事务写入所有有效记录，IF 事务失败 THEN THE System SHALL 撤销所有更改并显示错误提示
6. WHERE 条目已存在相同 url 字段（执行规范化处理后），THE System SHALL 将新记录标记为重复，并将来源信息追加到现有 Item 的 sources 数组，不修改 title、tags 和内容字段
7. WHERE 用户取消导入，THE System SHALL 不修改任何数据库内容
8. WHEN 同一文件重复导入，THE System SHALL 通过规范化 URL 识别重复条目，并仅将新的来源信息合并到现有 Item 的 sources 数组
9. WHERE 条目缺失 url 字段但标题和内容（笔记正文或文章摘要）完全相同，THE System SHALL 计算内容指纹（SHA-256 哈希，去除首尾空白字符后进行 UTF-8 编码），如果指纹匹配则标记为重复记录
10. WHEN 单次导入处理超过 1000 条记录，THE Importer SHALL 拒绝处理并说明限制

### Requirement 6: 搜索、筛选与阅读

**User Story:** 作为用户，我想要快速找到需要的内容，所以系统能够提供强大的搜索和筛选功能。

#### Acceptance Criteria

1. WHEN 用户在搜索框输入至少 2 个字符的关键词，THE Searcher SHALL 在标题、摘要、笔记正文、标签和 URL 中搜索匹配，搜索响应时间不得超过 2 秒
2. WHERE 用户选择"Bookmarks"筛选，THE System SHALL 仅显示 Item.kind = "bookmark" 的记录
3. WHERE 用户选择"Articles"筛选，THE System SHALL 仅显示 Item.kind = "article" 的记录
4. WHERE 用户选择"Notes"筛选，THE System SHALL 仅显示 Item.kind = "note" 的记录
5. WHERE 用户选择"Starred"筛选，THE System SHALL 仅显示 Item.starred = true 的记录
6. WHERE 用户选择"Unread"筛选，THE System SHALL 仅显示 Item.readAt = null 的记录
7. WHERE 用户选择多个标签筛选，THE System SHALL 显示包含任一选中标签的记录（逻辑 OR）
8. WHERE 搜索或筛选结果为空，THE System SHALL 显示空状态提示"未找到匹配的结果"和"尝试调整搜索关键词或筛选条件"的恢复操作建议
9. WHEN 用户点击条目标题，THE System SHALL 在详情面板显示完整内容，包括标题、来源、保存日期、标签列表、正文/摘要、收藏状态和已读状态
10. WHEN 用户点击外部链接，THE System SHALL 在新窗口打开链接，使用 rel="noopener noreferrer" 属性，并限制 target="_blank"

### Requirement 7: 本地保存与备份

**User Story:** 作为用户，我想要数据持久化存储并能导出备份，所以系统能够保留我的收藏和笔记。

#### Acceptance Criteria

1. WHEN 用户创建、编辑或删除条目，THE System SHALL 立即（响应时间 ≤ 2 秒）写入 IndexedDB 数据库
2. WHERE 用户刷新浏览器页面，THE System SHALL 从 IndexedDB 恢复所有数据，恢复时间不得超过 5 秒
3. WHERE 用户关闭并重新打开浏览器，THE System SHALL 保留所有数据
4. WHEN 用户点击"Export Data"，THE Exporter SHALL 生成一个包含 schemaVersion（版本号字符串）、items（条目数组）、sources（来源数组）的 JSON 文件，元信息包含 exportTimestamp（RFC 3339 格式）
5. WHERE JSON 导出包含所有条目、来源和必要的元信息（如导入时间戳），THE Exporter SHALL 包含这些字段
6. WHEN 用户导入导出的备份文件，THE Importer SHALL 验证 schemaVersion 是否为支持的版本号（目前仅支持 v1），验证 JSON 结构完整性
7. IF JSON 文件版本未知或格式损坏，THE Importer SHALL 拒绝导入并显示错误提示"备份文件版本不支持或格式已损坏"
8. IF 数据库写入失败，THE System SHALL 显示可见的错误提示且不展示"成功"状态
9. WHERE 用户使用个人数据库（echoshelf-user），THE System SHALL 在首次使用 30 天后显示提示"建议定期导出备份以确保数据安全"
10. WHEN 用户重置示例库，THEN THE System SHALL 清空 echoshelf-demo IndexedDB 数据库中的所有数据，且 echoshelf-user 数据库内容保持不变

### Requirement 8: Rediscover（重新发现）

**User Story:** 作为用户，我想要系统推荐我早期保存但尚未阅读的内容，所以系统能够基于简单规则进行智能推荐。

#### Acceptance Criteria

1. WHERE Rediscover 功能激活，THE System SHALL 查找保存时间超过 30 天且未读的条目，其中"30天"定义为从当前系统时间减去30个自然日（24小时为一日）
2. WHERE 不存在符合条件的条目，THE System SHALL 回退到查找按保存时间（savedAt）升序排列最早的未读条目
3. WHERE 系统展示 Rediscover 结果，THE System SHALL 对每条推荐显示格式化说明"Saved {duration} · Unread"，其中{duration}为当前时间与保存时间的差值，单位为月或天（若差值≥30天则显示"X months ago"，否则显示"X days ago"）
4. WHERE 推荐结果为空，THE System SHALL 显示文本提示"暂无推荐内容"并提供"查看全部未读条目"的可点击操作按钮
5. WHEN 用户标记条目为已读，THE Rediscover List SHALL 在 5 秒内从推荐列表中移除该条目
6. WHEN 用户收藏条目，THE System SHALL 保留该条目在其他筛选视图中的可见性
7. WHERE 多个条目符合 Rediscover 规则，THE System SHALL 使用按 savedAt 字段升序排列的稳定排序算法
8. WHERE 系统计算日期需要确定性时钟，THE System SHALL 提供时钟注入接口用于测试，允许测试框架指定当前时间用于计算
9. WHERE 用户点击 Rediscover 条目，THEN THE System SHALL 标记该条目为已读并在新窗口中打开详情
10. WHEN Rediscover 规则更新，THE System SHALL 在 10 秒内重新计算推荐列表并刷新展示

### Requirement 9: 手动更新 RSS

**User Story:** 作为用户，我想要手动刷新订阅源获取最新文章，所以系统能够发起网络请求并更新内容。

#### Acceptance Criteria

1. WHEN 用户点击"Refresh Feed"按钮，THE System SHALL 发起 HTTPS 请求获取订阅内容，请求超时设置为 8 秒
2. WHERE 订阅 URL 是公共 HTTPS 且有效，THE Fetcher SHALL 成功获取 RSS/Atom 数据，解析时间不得超过 30 秒
3. WHERE 获取成功，THE System SHALL 解析新文章并执行去重后写入数据库，单次更新最多处理 200 篇新文章
4. IF 请求超时（超过 8 秒），THEN THE System SHALL 中止请求并显示错误提示"请求超时，请重试"
5. IF 响应超过大小限制（解压后超过 2 MiB），THE Fetcher SHALL 拒绝并显示错误提示"响应内容过大（超过 2 MiB）"
6. IF 返回内容不是有效的 RSS/Atom 格式，THE Parser SHALL 标记为失败并保留历史内容，显示错误提示"订阅格式无效"
7. IF 重定向超过 3 次，THE Fetcher SHALL 拒绝并显示错误提示"重定向次数过多（超过 3 次）"
8. WHERE 多个订阅同时刷新，THE System SHALL 限制并发请求数不超过 5 个，超出的请求排队等待
9. WHERE 用户多次点击同一订阅的刷新按钮，THE System SHALL 防止重复请求（在 5 秒内不重复发起）
10. IF 数据库写入失败，THE System SHALL 撤销所有更改并显示可见的错误提示

### Requirement 10: 可访问、可演示、可部署

**User Story:** 作为用户和评委，我想要系统在不同设备和辅助技术下都能正常工作，所以系统能够满足可访问性和演示要求。

#### Acceptance Criteria

1. WHERE 用户在桌面浏览器访问且屏幕宽度 ≥ 1024px，THE System SHALL 提供侧边导航（宽度固定 280px）、内容列表区域和详情面板的三栏布局
2. WHERE 用户在窄屏设备访问且屏幕宽度 < 768px，THE System SHALL 折叠侧栏为汉堡菜单，详情面板作为全屏页面或底部抽屉显示
3. EVERY 可点击的交互元素（按钮、链接、可聚焦元素），THE System SHALL 支持键盘 Tab 键顺序导航，且 Enter 键触发主要操作，Space 键触发备用操作（如复选框切换）
4. WHILE 视觉元素渲染时，THE System SHALL 保持所有文本与背景的颜色对比度至少 4.5:1（WCAG AA 级别，适用于正常大小文本）
5. WHERE 用户启用系统 reduced-motion 设置或 CSS prefers-reduced-motion: reduce，THE System SHALL 移除所有非必要动画，保留 150ms 内的过渡效果
6. WHEN 页面内容加载时间超过 200ms，THE System SHALL 显示加载指示器（spinner 或进度条），且加载指示器显示时间不少于 300ms
7. IF 发生网络错误或服务器响应错误（HTTP 4xx/5xx），THEN THE System SHALL 显示错误卡片，包含错误简述、错误代码上下文（如适用），以及"重试"或"返回上一页"的明确操作按钮
8. IF 返回数据为空（列表长度为 0 或详情数据为空对象），THEN THE System SHALL 显示空状态卡片，包含无数据的明确说明、图标和一条建议性操作引导
9. IF 用户使用屏幕阅读器（检测到辅助技术），THEN THE System SHALL 为所有交互控件提供 aria-label 或 aria-labelledby 属性，为动态状态变化提供 aria-live="polite" 区域，并在状态变化时更新 aria-pressed、aria-expanded 等状态属性
10. WHERE 生产构建输出为静态文件（HTML、CSS、JS、资源文件），THEN THE System SHALL 在支持静态文件服务的 Web 服务器（如 Nginx、Apache 或静态文件服务器）上通过根路径访问运行

## Out of Scope

以下功能明确不在第一版范围内：

1. **账号与云同步**：不支持用户注册、登录、跨设备同步
2. **云端存储**：数据仅保存在浏览器 IndexedDB，不上传服务器
3. **AI 功能**：不使用大模型生成摘要、标签或推荐（Rediscover 使用简单确定性规则）
4. **Web 爬虫**：不主动抓取任意网站，仅响应用户手动发起的订阅更新
5. **向量数据库**：不实现语义搜索，仅支持关键词匹配搜索
6. **团队协作**：不支持共享书签、评论、协作编辑
7. **浏览器扩展**：不开发 Chrome/Firefox 扩展
8. **移动原生应用**：仅开发响应式 Web 应用，不开发 iOS/Android 原生应用
9. **后台定时任务**：不自动后台爬取，订阅更新完全由用户手动触发
10. **计费系统**：不涉及支付、订阅、付费内容

## EARS Pattern Compliance

本文档中的所有需求均符合 EARS 格式规范，使用以下模式：

- **Ubiquitous**: THE System SHALL（适用于始终成立的需求）
- **Event-driven**: WHEN [event], THE System SHALL（适用于事件触发的需求）
- **State-driven**: WHILE [condition], THE System SHALL（适用于状态持续期间的需求）
- **Unwanted event**: IF [condition], THEN THE System SHALL（适用于错误处理的需求）
- **Optional feature**: WHERE [option], THE System SHALL（适用于可选功能的需求）