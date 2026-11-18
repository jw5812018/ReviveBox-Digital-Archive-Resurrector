# EchoShelf 开发进度

更新于 2026-11-18（北京时间）。本地与远程同步，Pages 最新一次部署成功，线上 Refresh 已连到 Railway 上的订阅服务。

- 仓库：https://github.com/jw5812018/ReviveBox-Digital-Archive-Resurrector
- 线上演示：https://jw5812018.github.io/ReviveBox-Digital-Archive-Resurrector/
- 参赛截止：2026-12-05 06:00（北京时间），无延期
- 规格：`.kiro/specs/echoshelf-mvp/`；逐日开发记录：`2026kirowen/docs/kiro-build-log.md`
- tasks.md：106 项中 85 项完成，21 项未完成（见"下一步待办"）

## 已完成

**功能（R1–R10）**
- 首页两个入口：Try the demo / Import your collection。示例库有 50 条中英文条目，单独存放在 `echoshelf-demo` 数据库，重置不影响个人库。
- 导入：书签 HTML、OPML、RSS 2.0 / Atom、txt / md、JSON 备份。先预览（新建 / 重复 / 无效，附英文原因），确认后在一个事务里写入，取消不写入任何数据。
- 书签文件超过 1,000 条时按文件夹分批导入：显示文件夹树和条数，已选合计不超过 1,000 才能继续；导完一批可接着选其他文件夹；重复导入只显示为重复。
- 去重：带链接的条目按规范化 URL，笔记按 SHA-256 内容指纹；合并时不覆盖用户的标题、标签、星标和已读状态。
- 搜索（支持中文连续文本）、类型和星标筛选、条目详情、外链安全打开。
- Rediscover：保存超过 30 天的未读条目优先，按保存时间从早到晚排列，没有时回退到最早的未读条目；每张卡片写明推荐原因；时钟可注入。
- 订阅：按地址添加或导入 OPML，手动刷新；示例域名的订阅标为 Sample，不能刷新；错误按类型分别显示（超时、HTTP 错误、格式无效、响应过大、被安全规则拦截、限频、保存失败、网络错误）。
- 备份：带 schemaVersion 的 JSON；写入前校验版本、结构、URL 和来源引用。
- 界面：暖纸色"数字档案馆"风格、桌面三栏和窄屏抽屉、Esc 关闭弹窗并把焦点还给触发按钮、支持 reduced-motion。

**订阅服务（服务端）**
- `POST /api/feeds/fetch` 的限制：
  - 只接受 HTTPS 和标准端口，拒绝内网、回环、链路本地和保留地址（IPv4、IPv6、IPv4 映射 IPv6），连接固定到已校验的 IP；
  - 最多 3 次重定向，每一跳都重新校验；
  - 总超时 8 秒，解压后上限 2 MiB，最多 200 篇，并发 5 个。
- CORS 白名单（`ALLOWED_ORIGINS`）、每个 IP 每 10 分钟 20 次、排队上限 20 个；目录里没有 `dist/` 时只提供 API。
- 本地实测：允许的来源预检返回 204，其他来源返回 403；真实 RSS 抓取成功；私网 IP 被拦截；超过频率返回 429。

**测试与工程**
- 单元测试 12 个文件、71 例，包括 5 条属性测试：URL 规范化幂等、重复导入不新建、备份往返不变、Rediscover 只返回未读且有序、分批导入与一次导入结果相同。
- E2E 6 条（Playwright Chromium）：示例主流程、个人库持久化、示例库重置隔离、弹窗键盘操作、1,200 条书签分两批导入、订阅失败状态显示。
- `npm run lint`、`npm run typecheck`、`npm test`、`npm run test:e2e`、`npm run build` 全部通过，失败时返回非零。
- GitHub Actions 自动部署到 Pages；构建时读取仓库变量 `FEED_API_URL`，已指向 Railway 上的订阅服务。

**Kiro**
- 规格按 Requirements-First 流程编写（需求先经过逐条细化）；后续每次新增功能都先改规格再写代码。
- 3 份 steering：product、tech、quality。
- `docs/kiro-usage.md` 如实列出用到的 Kiro 功能，没用的不写。

## 改了哪些文件

全部在 Git 中（`git ls-files` 共 98 个）。

| 位置 | 内容 |
| --- | --- |
| `.kiro/specs/echoshelf-mvp/` | requirements.md、design.md、tasks.md、tasks.meta.json、.config.kiro |
| `.kiro/steering/` | product.md、tech.md、quality.md |
| `.kiro/hooks/unit-tests-after-task.json` | PostTaskExec 钩子（**未验证会自动触发**） |
| `.github/workflows/pages.yml` | 构建并部署到 GitHub Pages |
| `README.md`、`LICENSE`、`PROGRESS.md` | 仓库根目录说明 |
| `2026kirowen/src/client/app/` | App、Layout、Sidebar、Header、Dashboard、Modal、States、main |
| `2026kirowen/src/client/features/import/` | ImportModal、FolderPicker |
| `2026kirowen/src/client/features/library/` | 列表、详情、两个表单、筛选、示例数据、示例库、手动来源 |
| `2026kirowen/src/client/features/rediscover/` | 规则引擎、时钟、面板 |
| `2026kirowen/src/client/features/sources/` | Subscriptions、feedApi（服务调用）、feedRefresh |
| `2026kirowen/src/client/storage/` | Dexie 双库、条目和来源的读写 |
| `2026kirowen/src/client/styles/index.css` | 设计系统 |
| `2026kirowen/src/server/` | index（Express 入口）、feeds/fetchFeed、feeds/rateLimit、feeds/limits |
| `2026kirowen/src/shared/import/` | 四种解析器、导入管线、文件夹分批、去重、指纹、备份、上限、错误说明 |
| `2026kirowen/src/shared/urls/` | validateUrl、normalizeUrl、feedUrls |
| `2026kirowen/src/shared/models/types.ts` | 数据模型 |
| `2026kirowen/tests/unit/`、`tests/e2e/` | 12 个单元测试文件、1 个 E2E 文件 |
| `2026kirowen/public/demo/` | 可下载的示例书签、OPML、RSS 和笔记文件 |
| `2026kirowen/docs/` | 开发指引、开发记录、Kiro 使用说明 |
| `2026kirowen/` 其余文件 | 包配置、锁文件、各项工具配置 |

## 关键决策与约束

- **规范化以开发指引为准**：不合并 http 和 https、不去掉 www 和末尾斜杠，只去掉跟踪参数、默认端口和片段。需求 R2 AC3 仍写着"去除末尾斜杠"，与实现不一致，待修正。
- **网络安全规则不能放宽**：这是 tech steering 的硬性约束。所以排除了只提供 fetch 的平台（Cloudflare Workers、Deno Deploy）：它们无法把连接固定到已校验的 IP。
- **单批上限保持 1,000 条**：超出时按文件夹分批，不提高上限。
- **TypeScript 从 7.0.2 降到 5.9.3**：typescript-eslint 不支持 TS 7。
- **Playwright 浏览器从 npmmirror 下载**：默认的下载地址连不上。
- **没做的组件和功能**：9.1 / 9.2 用 CSS 类代替组件；10.1 倒排索引不做，线性扫描已足够快。
- **订阅服务托管在 Railway**（Free 计划，单实例，任务 18.7）：根目录 `2026kirowen`，Build Command 设为 `echo "skip build"`（再跑 npm ci 会报 EBUSY），启动 `npm start`；Pages 构建通过仓库变量 `FEED_API_URL` 指向它，线上 Refresh 已实测可用。
  - 之前未成功的平台：Render 要求绑卡（`render.yaml` 已在 20.1 删除）；Vercel 账号转入人工审核；Koyeb、Hugging Face Docker Space 免费方案对新用户不可用。
- **客户端 IP 取自 `X-Real-IP`（任务 18.8）**：Railway 上只用 `TRUST_PROXY_HOPS=1` 时限频失效（每次请求落到不同的代理地址）；改为 `CLIENT_IP_HEADER=x-real-ip` 后实测第 21 次返回 429，伪造请求头换不到新限额，两个出口 IP 各有独立限额。
- **环境注意事项**：
  - git 推送依赖本机代理 127.0.0.1:7897；
  - gh 的授权已包含 `workflow` 权限；
  - 终端工具会吞掉输出，检查结果要写入文件再读；
  - 改文件时用整文件写入，或在替换没命中时直接报错。曾因 CRLF 导致替换静默失败、改动没进提交。

## 下一步待办

**需要用户决定或操作**
1. 在 Kiro 的 Hooks 界面创建或启用一个 hook，并亲眼看到它跑一次。现在的 hook 文件是手写的，从没确认过会自动触发。

**功能缺口（对照开发指引必需项）**
2. 标签筛选、未读筛选和排序的界面（任务 10.3，R6）。
3. 编辑和删除条目，包括编辑笔记（R4）。
4. 侧栏按来源和标签浏览，点一个订阅只看它的文章。
5. 示例库改为通过真实的导入流程生成（指引 3.3），现在是代码直接写入数据库。
6. 个人库加上"数据只保存在本浏览器，建议定期导出"的提示（R7 AC9）。
7. 目录视图：按书签文件夹逐级浏览。需要先在 Item 上保存完整的文件夹路径，现在只保存了直接父文件夹作为标签。

**规格与实现对齐**
8. 修改需求里与实现不一致的地方：
    - R2 AC3：末尾斜杠和百分号解码；
    - R1 AC7：中文提示文案；
    - R8 AC9：需求写的是在新窗口打开详情；
    - R7 AC9：30 天提醒；
    - 另外，把 tasks.md 里的 Checkpoint 1–4 按实际情况勾选。

**质量与展示**
9. 在 390px 窄屏上检查一遍（E2E 只跑了桌面尺寸）。
10. 次要按钮悬停时的对比度约 4.1:1，低于 AA 的 4.5:1。
11. README 加截图；仓库 About 栏填上线上地址和 topics；说明仓库名 ReviveBox 和产品名 EchoShelf 是同一个项目。
12. 17.1 JSDoc、17.3 Prettier：可选，可以不做。

**参赛材料（产品定型后）**
13. `docs/demo-script.md`：英文演示脚本，不超过 3 分钟。
14. 录演示视频并上传 YouTube（用户操作）。
15. `docs/submission.md`：Devpost 英文文案和 Kiro 使用说明，回答官方列出的问题。例如属性测试抓到了单元测试漏掉的 bug：同一文件内重复记录的合并被丢弃。
16. 更新 `docs/kiro-usage.md`。
17. 提交前再核对一次官方规则。博客奖和社交媒体奖是可选项，需要用户本人发布。