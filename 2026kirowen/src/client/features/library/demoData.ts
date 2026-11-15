import type { Item, Source } from '@shared/models/types'

/**
 * Original demo content for the EchoShelf sample library (R1 AC2/AC4).
 * All links use the reserved example.org domain and are clearly fictional.
 * Dates are relative to seeding time so Rediscover always has candidates.
 */

export const DEMO_SOURCES: Array<Omit<Source, 'id'>> = [
  { kind: 'demo', name: 'Sample bookmark file' },
  { kind: 'demo', name: 'Sample feed (Demo)' },
  { kind: 'demo', name: 'Sample notes' },
]

interface DemoEntry {
  kind: Item['kind']
  title: string
  url?: string
  body?: string
  tags: string[]
  daysAgo: number
  read: boolean
  starred: boolean
  sourceIndex: 0 | 1 | 2
}

const ENTRIES: DemoEntry[] = [
  // --- Bookmarks (sourceIndex 0) ---
  { kind: 'bookmark', title: 'CSS Grid complete guide', url: 'https://example.org/articles/css-grid-guide', tags: ['css', 'frontend'], daysAgo: 240, read: false, starred: true, sourceIndex: 0 },
  { kind: 'bookmark', title: 'IndexedDB API 中文教程', url: 'https://example.org/tutorials/indexeddb-zh', tags: ['web', '中文'], daysAgo: 210, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'The Mother of All Demos (1968)', url: 'https://example.org/history/mother-of-all-demos', tags: ['history', 'computing'], daysAgo: 400, read: true, starred: true, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Regex cheat sheet', url: 'https://example.org/reference/regex-cheatsheet', tags: ['reference', 'tools'], daysAgo: 150, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: '如何进行文献综述：研究方法笔记', url: 'https://example.org/research/literature-review-zh', tags: ['research', '中文'], daysAgo: 320, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Vite vs webpack: build tool comparison', url: 'https://example.org/dev/vite-vs-webpack', tags: ['tools', 'frontend'], daysAgo: 90, read: true, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'OPML 2.0 specification', url: 'https://example.org/specs/opml-2', tags: ['specs', 'rss'], daysAgo: 280, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: ' accessible color palettes', url: 'https://example.org/design/accessible-colors', tags: ['design', 'a11y'], daysAgo: 45, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: '浏览器存储方案比较：localStorage vs IndexedDB', url: 'https://example.org/web/storage-comparison-zh', tags: ['web', '中文'], daysAgo: 120, read: true, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Unix timestamp converter', url: 'https://example.org/tools/unix-timestamp', tags: ['tools'], daysAgo: 200, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'A brief history of RSS', url: 'https://example.org/history/rss-history', tags: ['history', 'rss'], daysAgo: 260, read: false, starred: true, sourceIndex: 0 },
  { kind: 'bookmark', title: 'TypeScript 类型体操入门', url: 'https://example.org/ts/type-gymnastics-zh', tags: ['typescript', '中文'], daysAgo: 75, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Wayback Machine search tricks', url: 'https://example.org/research/wayback-tricks', tags: ['research', 'web'], daysAgo: 180, read: true, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Netscape bookmark file format reference', url: 'https://example.org/specs/netscape-bookmarks', tags: ['specs', 'bookmarks'], daysAgo: 300, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: '学术搜索引擎使用技巧', url: 'https://example.org/research/scholar-tips-zh', tags: ['research', '中文'], daysAgo: 140, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'DOMParser security notes', url: 'https://example.org/security/domparser-notes', tags: ['security', 'web'], daysAgo: 60, read: true, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Personal knowledge management survey', url: 'https://example.org/research/pkm-survey', tags: ['research', 'pkm'], daysAgo: 100, read: false, starred: true, sourceIndex: 0 },
  { kind: 'bookmark', title: '早期的个人门户网站回顾', url: 'https://example.org/history/personal-portals-zh', tags: ['history', '中文'], daysAgo: 350, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Keyboard-first UI design patterns', url: 'https://example.org/design/keyboard-first', tags: ['design', 'a11y'], daysAgo: 30, read: false, starred: false, sourceIndex: 0 },
  { kind: 'bookmark', title: 'Feed reader comparison 2025', url: 'https://example.org/reviews/feed-readers', tags: ['rss', 'tools'], daysAgo: 20, read: false, starred: false, sourceIndex: 0 },

  // --- Articles from the sample feed (sourceIndex 1) ---
  { kind: 'article', title: 'Understanding content-addressed storage', url: 'https://example.org/feed/content-addressed', body: 'Content-addressed systems identify data by a hash of its contents rather than by location. This sample article explains why that makes deduplication natural: identical content always maps to the same identifier.', tags: ['storage', 'concepts'], daysAgo: 95, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'RSS 订阅的未来：开放协议没有消亡', url: 'https://example.org/feed/rss-future-zh', body: '很多人以为 RSS 已经死了，但独立博客和播客生态仍然建立在开放订阅协议之上。这篇示例文章讨论了为什么"拥有自己的目录"在算法推荐时代反而更重要。', tags: ['rss', '中文'], daysAgo: 85, read: false, starred: true, sourceIndex: 1 },
  { kind: 'article', title: 'How search indexing works', url: 'https://example.org/feed/search-indexing', body: 'Inverted indexes map terms to the documents containing them. This sample article walks through building a tiny index by hand and shows why normalization (casing, Unicode forms) matters for CJK text.', tags: ['search', 'concepts'], daysAgo: 70, read: true, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Digital gardens vs blogs', url: 'https://example.org/feed/digital-gardens', body: 'A digital garden is a collection of evolving notes rather than reverse-chronological posts. This sample piece compares the two publishing styles and their archival qualities.', tags: ['pkm', 'writing'], daysAgo: 160, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: '什么是规范化 URL？', url: 'https://example.org/feed/url-normalization-zh', body: '同一个网页可能有十几个不同的 URL：带跟踪参数的、大小写不同的、带 www 或不带的。规范化就是选定一种标准写法。本文是示例内容，介绍常见的规范化取舍。', tags: ['web', '中文'], daysAgo: 55, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'The reading habit: queue vs pile', url: 'https://example.org/feed/reading-habit', body: 'Some people process a strict reading queue; others keep an honest pile. This sample article argues that rediscovery tools matter more than capture tools for the second group.', tags: ['reading', 'habits'], daysAgo: 130, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Local-first software principles', url: 'https://example.org/feed/local-first', body: 'Local-first software keeps your data on your devices and treats the network as an enhancement, not a requirement. This sample article summarizes the seven ideals from the well-known Ink & Switch paper.', tags: ['local-first', 'concepts'], daysAgo: 190, read: true, starred: true, sourceIndex: 1 },
  { kind: 'article', title: 'Atom 与 RSS 2.0 格式对比', url: 'https://example.org/feed/atom-vs-rss-zh', body: 'Atom 是 IETF 标准化的订阅格式，RSS 2.0 则由规范文档固定下来。两者在日期格式、内容模型、扩展机制上有明显差异。本文为示例内容。', tags: ['rss', '中文'], daysAgo: 110, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Why plain text endures', url: 'https://example.org/feed/plain-text', body: 'Plain text files from the 1970s are still readable today. This sample article reflects on format longevity and what it means for personal archives.', tags: ['archiving', 'writing'], daysAgo: 220, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Designing empty states', url: 'https://example.org/feed/empty-states', body: 'Empty states are the first screen many users see. This sample article covers honest empty states: say what is missing, why, and what to do next.', tags: ['design', 'ux'], daysAgo: 40, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: '书签去重的三种策略', url: 'https://example.org/feed/dedup-strategies-zh', body: '按 URL 精确匹配、按规范化 URL 匹配、按内容指纹匹配——三种策略的误报率依次递减，计算成本依次递增。这篇示例文章分析各自适用场景。', tags: ['web', '中文'], daysAgo: 65, read: true, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Timeouts are user interface', url: 'https://example.org/feed/timeouts-ux', body: 'A hung request is the worst error message. This sample article discusses choosing timeout budgets and communicating them honestly in the UI.', tags: ['ux', 'engineering'], daysAgo: 25, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'The semver spec, annotated', url: 'https://example.org/feed/semver-annotated', body: 'Semantic versioning is short enough to read in one sitting. This sample article annotates each rule with the failure mode it prevents.', tags: ['specs', 'engineering'], daysAgo: 170, read: true, starred: false, sourceIndex: 1 },
  { kind: 'article', title: '渐进增强的网页设计哲学', url: 'https://example.org/feed/progressive-enhancement-zh', body: '先让内容可用，再逐层增强体验。这篇示例文章回顾了渐进增强原则在个人工具开发中的应用。', tags: ['web', '中文'], daysAgo: 145, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'Data portability as a feature', url: 'https://example.org/feed/data-portability', body: 'Export formats are a product decision, not an afterthought. This sample article argues that honest export is the foundation of user trust.', tags: ['archiving', 'product'], daysAgo: 80, read: false, starred: true, sourceIndex: 1 },
  { kind: 'article', title: 'Rediscovering your own bookmarks', url: 'https://example.org/feed/rediscovery', body: 'Saving is easy; refinding is hard. This sample article surveys simple rediscovery heuristics — age, read state, recency — and why transparent rules beat opaque ranking.', tags: ['pkm', 'reading'], daysAgo: 50, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: 'The 5 MiB question: input limits', url: 'https://example.org/feed/input-limits', body: 'Every importer needs limits. This sample article explains how to pick file-size and record-count caps and how to fail visibly instead of silently truncating.', tags: ['engineering', 'ux'], daysAgo: 15, read: false, starred: false, sourceIndex: 1 },
  { kind: 'article', title: '纸质笔记本与数字归档', url: 'https://example.org/feed/paper-vs-digital-zh', body: '纸质笔记的优势是随意，数字归档的优势是检索。这篇示例文章讨论两者如何互补，而不是互相取代。', tags: ['pkm', '中文'], daysAgo: 105, read: true, starred: false, sourceIndex: 1 },

  // --- Notes (sourceIndex 2) ---
  { kind: 'note', title: '阅读清单：2026 年春季', body: '1. The Design of Everyday Things\n2. 编码：隐匿在计算机软硬件背后的语言\n3. A Pattern Language\n4. 如何阅读一本书', tags: ['reading', '中文'], daysAgo: 250, read: false, starred: true, sourceIndex: 2 },
  { kind: 'note', title: 'Conference talk ideas', body: 'Possible topics:\n- Rediscovery over capture: PKM tools that surface old saves\n- Local-first without the hype\n- What 90s portals got right', tags: ['ideas', 'talks'], daysAgo: 115, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: '书架整理规则', body: '每月第一个周末整理一次：\n- 未读超过半年的链接要么读要么删\n- 标签合并同类项\n- 导出一次备份', tags: ['habits', '中文'], daysAgo: 200, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: 'Interesting CSS tricks to try', body: '- :has() for parent-aware styling\n- container queries for component layouts\n- scroll-driven animations (check reduced-motion)', tags: ['css', 'frontend'], daysAgo: 35, read: true, starred: false, sourceIndex: 2 },
  { kind: 'note', title: '研究问题备忘', body: '为什么人们收藏了却不回看？\n假设：收藏动作本身给了"已处理"的错觉。\n可以验证：统计收藏后 30 天内的打开率。', tags: ['research', '中文'], daysAgo: 88, read: false, starred: true, sourceIndex: 2 },
  { kind: 'note', title: 'Gift ideas for readers', body: '- Mechanical pencil\n- Book darts (line markers)\n- Reading journal\n- 一盏暖光台灯', tags: ['ideas'], daysAgo: 150, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: 'Weekend project backlog', body: '1. CLI tool to lint my bookmarks\n2. Static site for reading notes\n3. Script that exports OPML from my subscriptions', tags: ['ideas', 'projects'], daysAgo: 62, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: '摘抄：关于记忆', body: '"我们记住的不是信息本身，而是找到信息的路径。"\n——出处待查，可能转引自一篇关于外脑的文章', tags: ['quotes', '中文'], daysAgo: 180, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: 'Meeting notes: book club 2026-10', body: 'Discussed: The Diamond Age\nNext: 万历十五年\nAction: bring the reading list comparison', tags: ['notes'], daysAgo: 28, read: true, starred: false, sourceIndex: 2 },
  { kind: 'note', title: '工具评测记录', body: '试了三个稍后读工具。共同问题：都在优化"收藏"，没有优化"找回"。搜索只搜标题的居多，能搜保存时页面快照的很少。', tags: ['tools', '中文'], daysAgo: 92, read: false, starred: true, sourceIndex: 2 },
  { kind: 'note', title: 'Ideas: better import preview', body: 'Show per-record status before writing:\n- new (green)\n- duplicate (amber, show what merges)\n- invalid (red, show reason)\nCancel must never write anything.', tags: ['ideas', 'ux'], daysAgo: 42, read: false, starred: false, sourceIndex: 2 },
  { kind: 'note', title: '年度回顾提纲', body: '今年读了多少？收藏了多少？回看率多少？\n三个数字放在一起很能说明问题：收藏远多于阅读。\n明年的目标不是多收藏，而是多回看。', tags: ['review', '中文'], daysAgo: 12, read: false, starred: false, sourceIndex: 2 },
]

export interface DemoData {
  sources: Source[]
  items: Item[]
}

const DAY_MS = 86_400_000

/** Builds the demo dataset with fresh ids and dates relative to `now`. */
export function buildDemoData(now: Date = new Date()): DemoData {
  const sources: Source[] = DEMO_SOURCES.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
  }))
  const items: Item[] = ENTRIES.map((entry) => {
    const savedAt = new Date(now.getTime() - entry.daysAgo * DAY_MS)
    const readAt = entry.read
      ? new Date(savedAt.getTime() + 2 * DAY_MS)
      : null
    return {
      id: crypto.randomUUID(),
      kind: entry.kind,
      title: entry.title.trim(),
      originalUrl: entry.url,
      canonicalUrl: entry.url,
      body: entry.body,
      tags: entry.tags,
      sourceIds: [sources[entry.sourceIndex].id],
      createdAt: savedAt.toISOString(),
      updatedAt: savedAt.toISOString(),
      savedAt: savedAt.toISOString(),
      readAt: readAt ? readAt.toISOString() : null,
      starred: entry.starred,
      isSample: true,
      dateSource: 'original',
    }
  })
  return { sources, items }
}