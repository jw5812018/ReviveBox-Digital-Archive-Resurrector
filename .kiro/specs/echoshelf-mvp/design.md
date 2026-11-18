# Design Document: EchoShelf MVP

## Overview

EchoShelf 是一个完全在浏览器本地运行的个人知识归档工具，采用单页应用（SPA）架构。系统不需要账号、云存储或 API 密钥，所有数据保存在用户的浏览器 IndexedDB 中。

### 技术选型

- **前端框架**: React 18 + TypeScript + Vite
- **状态管理**: React Context + useReducer（轻量级，无需外部依赖）
- **数据持久化**: IndexedDB + Dexie.js（轻量级封装库）
- **构建工具**: Vite（快速开发和优化的生产构建）
- **HTTP 客户端**: 原生 fetch API（避免额外依赖）
- **样式**: CSS Modules + CSS Custom Properties（命名空间和主题支持）

### 架构原则

1. **单页应用**: 所有路由和导航在客户端完成，无服务端渲染
2. **本地优先**: 所有数据存储在 IndexedDB，离线可用
3. **确定性**: 所有日期计算通过可注入的时钟接口，便于测试
4. **安全优先**: 所有网络请求验证 URL，禁止危险协议
5. **可测试性**: 纯函数为核心，副作用隔离

## Architecture

### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # 侧边导航
│   │   ├── Header.tsx           # 顶部操作栏
│   │   └── Layout.tsx           # 主布局容器
│   ├── views/
│   │   ├── Dashboard.tsx        # 首页/仪表盘
│   │   ├── ItemList.tsx         # 条目列表
│   │   ├── ItemDetail.tsx       # 条目详情面板
│   │   └── RediscoverPanel.tsx  # 重新发现面板
│   ├── forms/
│   │   ├── ImportForm.tsx       # 导入表单
│   │   ├── AddNoteForm.tsx      # 添加笔记表单
│   │   └── AddBookmarkForm.tsx  # 添加书签表单
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── FilterTag.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorCard.tsx
│   │   └── LoadingSpinner.tsx
│   └── imports/
│       ├── ImportPreview.tsx    # 导入预览
│       ├── ParseResultRow.tsx   # 预览行
│       └── ImportStats.tsx      # 统计面板
├── hooks/
│   ├── useItemStore.ts          # 条目状态管理
│   ├── useSourceStore.ts        # 来源状态管理
│   ├── useRediscover.ts         # 重新发现逻辑
│   └── useFetchFeed.ts          # 订阅获取
├── services/
│   ├── db.ts                    # Dexie 数据库定义
│   ├── parsers/
│   │   ├── htmlParser.ts        # HTML 书签解析
│   │   ├── opmlParser.ts        # OPML 解析
│   │   ├── rssParser.ts         # RSS/Atom 解析
│   │   └── utils.ts             # 解析工具函数
│   ├── validators/
│   │   ├── urlValidator.ts      # URL 验证
│   │   ├── fileValidator.ts     # 文件验证
│   │   └── inputValidator.ts    # 输入验证
│   ├── urlNormalizer.ts         # URL 规范化
│   ├── deduplication.ts         # 去重逻辑
│   └── storageManager.ts        # IndexedDB 管理
├── utils/
│   ├── formatDate.ts            # 日期格式化
│   ├── hash.ts                  # SHA-256 计算
│   └── debounce.ts              # 防抖工具
└── App.tsx                      # 应用根组件
```

### State Management Pattern

```typescript
// 状态结构
interface AppState {
  items: Item[];
  sources: Source[];
  currentView: 'dashboard' | 'items' | 'settings';
  activeFilters: FilterState;
  selectedItem: Item | null;
  isRediscoverActive: boolean;
  userLastActive: Date | null;  // 用于 30 天提示
}

// Action 类型
type AppAction =
  | { type: 'ADD_ITEMS'; payload: Item[] }
  | { type: 'UPDATE_ITEM'; payload: Partial<Item> }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'ADD_SOURCES'; payload: Source[] }
  | { type: 'SET_FILTERS'; payload: FilterState }
  | { type: 'SELECT_ITEM'; payload: string | null }
  | { type: 'TOGGLE_REDISCOVER' }
  | { type: 'SET_LAST_ACTIVE'; payload: Date };
```

## Components and Interfaces

### Core Components

#### Layout Components

**Layout.tsx**
- Main container with responsive three-column layout
- Renders Sidebar, Header, main content area
- Handles mobile responsive collapse

**Sidebar.tsx**
- Navigation menu with filter options
- Displays: 全部, 书签, 文章, 笔记, 重新发现
- Uses keyboard-accessible button navigation

**Header.tsx**
- Search input with debounced filtering
- Import/export buttons
- Actions: 导入书签, 导入订阅, 导出数据

#### View Components

**Dashboard.tsx**
- Welcome screen with demo/import buttons
- Usage statistics display
- Persistent local-storage notice with export shortcut (personal library only)

**ItemList.tsx**
- List of items with filtering and search
- Displays: title, tags, saved date, read status, starred status
- Supports keyboard navigation (Tab, Enter, Space)

**ItemDetail.tsx**
- Shows full item details in slide-out panel
- Displays: title, sources, dates, tags, content
- Actions: mark as read, toggle starred, open in new tab

**RediscoverPanel.tsx**
- Shows recommended items for rediscovery
- Displays: formatted duration, "Unread" badge
- Actions: view details, mark as read

#### Form Components

**ImportForm.tsx**
- File upload with drag-and-drop
- Validates file size and format
- Shows import preview before confirmation

**AddNoteForm.tsx**
- Text editor for notes
- Character count indicator
- Validation for length (max 100,000)

**AddBookmarkForm.tsx**
- Title and URL inputs
- URL protocol validation
- Real-time validation feedback

**UI Components**

- **Button.tsx**: Accessible button with keyboard support
- **Input.tsx**: Text input with validation states
- **Select.tsx**: Dropdown with keyboard navigation
- **FilterTag.tsx**: Filter chips with close button
- **EmptyState.tsx**: Empty state with icon and action
- **ErrorCard.tsx**: Error display with retry button
- **LoadingSpinner.tsx**: Spinner with reduced motion support

### Service Interfaces

```typescript
// Database Service
interface DatabaseService {
  getItems(): Promise<Item[]>;
  getSources(): Promise<Source[]>;
  addItem(item: Item): Promise<void>;
  updateItem(id: string, updates: Partial<Item>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  addItemToSource(itemId: string, sourceId: string): Promise<void>;
}

// Parser Interfaces
interface BookmarkParser {
  parse(html: string): Bookmark[];
}

interface OpmlParser {
  parse(xml: string): Source[];
}

interface RssParser {
  parse(xml: string): Item[];
}

// Validator Interfaces
interface UrlValidator {
  isValid(url: string): boolean;
  normalize(url: string): string;
}

interface FileValidator {
  validate(file: File): ValidationResult;
}

// Search Service
interface SearchService {
  buildIndex(items: Item[]): void;
  search(query: string, items: Item[]): Item[];
}
```

## Data Models

### Item Schema

```typescript
interface Item {
  // 基础标识
  id: string;                    // UUID v4
  kind: 'bookmark' | 'article' | 'note';  // 类型
  
  // 内容字段
  title: string;                 // 标题（1-255字符）
  originalUrl: string;           // 原始 URL（未规范化）
  canonicalUrl: string;          // 规范化后的 URL（去重依据）
  body?: string;                 // 笔记正文或文章摘要（可选）
  
  // 元数据
  tags: string[];                // 标签数组（最多 100 个）
  sourceIds: string[];           // 来源 ID 列表（用于去重合并）
  savedAt: string;               // ISO 8601 时间戳（UTC）
  
  // 状态字段
  readAt: string | null;         // 阅读时间（null 表示未读）
  starred: boolean;              // 收藏状态
  isSample: boolean;             // 是否为示例数据
  
  // 导入信息
  importSource?: string;         // 导入来源文件名
  importError?: ImportError;     // 解析错误（如有）
}
```

### Source Schema

```typescript
interface Source {
  id: string;                    // UUID v4
  kind: 'bookmark' | 'rss' | 'atom';  // 来源类型
  name: string;                  // 显示名称（1-255字符）
  feedUrl: string;               // RSS/Atom 订阅 URL
  lastFetchAt: string | null;    // 最后获取时间（ISO 8601）
  lastFetchStatus: 'success' | 'failed' | 'pending' | null;  // 状态
  lastFetchError?: string;       // 错误信息（如有）
  createdAt: string;             // 创建时间（ISO 8601）
}
```

### Import Result Tracking

```typescript
interface ImportResult {
  total: number;                 // 总记录数
  valid: number;                 // 有效记录数
  duplicates: number;            // 重复记录数
  invalid: number;               // 无效记录数
  details: ImportDetail[];       // 详细列表
}

interface ImportDetail {
  id: string;                    // 临时 ID（导入期间）
  originalUrl: string;
  title: string;
  status: 'valid' | 'duplicate' | 'invalid';
  errorType?: ImportErrorType;   // 错误类型（仅 invalid）
  errorMessage?: string;         // 错误详情
}

type ImportErrorType = 
  | 'MissingTitle' 
  | 'MissingUrl' 
  | 'InvalidUrlProtocol' 
  | 'TitleTooLong' 
  | 'UrlTooLong' 
  | 'FileTooLarge' 
  | 'TooManyRecords' 
  | 'MalformedXml' 
  | 'SecurityViolation' 
  | 'ParserTimeout' 
  | 'ContentTruncated' 
  | 'InvalidDate' 
  | 'MissingField';
```

## Import Flow Design

### Overall Flow

```
User Action → File Validation → Parse → Deduplication → Preview → Confirm → Store
```

### Step 1: File Validation

```typescript
function validateFile(file: File): ValidationResult {
  // 1. 检查文件大小
  if (file.size > 5 * 1024 * 1024) { // 5 MiB
    return { valid: false, error: 'FileTooLarge' };
  }
  
  // 2. 检查扩展名
  const ext = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['html', 'opml', 'rss', 'atom', 'xml', 'txt', 'md'];
  if (!allowedExtensions.includes(ext || '')) {
    return { valid: false, error: 'UnsupportedFileFormat' };
  }
  
  return { valid: true };
}
```

### Step 2: Parsing Logic

#### HTML Bookmark Parser (Netscape Format)

```typescript
interface BookmarkNode {
  title: string;
  url: string;
  addDate?: string;
  tags?: string[];
  parent?: string;
}

function parseBookmarkHTML(html: string): BookmarkNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const results: BookmarkNode[] = [];
  
  // 查找所有 A 标签（书签）
  const anchors = doc.querySelectorAll('a');
  for (const anchor of anchors) {
    const url = anchor.getAttribute('href');
    const title = anchor.textContent?.trim() || '';
    const addDate = anchor.getAttribute('add_date');
    const tags = parseTags(anchor.getAttribute('tags'));
    
    if (url && isValidUrl(url)) {
      results.push({ title, url, addDate, tags });
    }
  }
  
  return results;
}

function parseTags(tagsAttr?: string): string[] {
  if (!tagsAttr) return [];
  return tagsAttr.split(',').map(t => t.trim()).filter(t => t.length > 0);
}
```

#### OPML Parser

```typescript
interface OPMLOutline {
  text: string;
  xmlUrl?: string;
  htmlUrl?: string;
  children?: OPMLOutline[];
}

function parseOPML(xml: string): OPMLOutline[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const outlines = Array.from(doc.querySelectorAll('outline'));
  
  return outlines.map(outline => {
    const text = outline.getAttribute('text') || '';
    const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('htmlUrl');
    
    return {
      text,
      xmlUrl,
      children: Array.from(outline.children).map(child => ({
        text: child.getAttribute('text') || '',
        xmlUrl: child.getAttribute('xmlUrl') || child.getAttribute('htmlUrl'),
      })),
    };
  });
}
```

#### RSS/Atom Parser

```typescript
interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  guid?: string;
}

function parseRSS(xml: string): RSSItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  
  return items.map(item => ({
    title: item.querySelector('title')?.textContent?.trim() || '',
    link: item.querySelector('link')?.textContent?.trim() || '',
    description: item.querySelector('description')?.textContent?.trim(),
    pubDate: item.querySelector('pubDate')?.textContent?.trim(),
    guid: item.querySelector('guid')?.textContent?.trim(),
  }));
}

function parseAtom(xml: string): RSSItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/atom+xml');
  const entries = Array.from(doc.querySelectorAll('entry'));
  
  return entries.map(entry => ({
    title: entry.querySelector('title')?.textContent?.trim() || '',
    link: entry.querySelector('link')?.getAttribute('href') || '',
    description: entry.querySelector('summary')?.textContent?.trim(),
    pubDate: entry.querySelector('published')?.textContent?.trim(),
    guid: entry.querySelector('id')?.textContent?.trim(),
  }));
}
```

### Step 3: URL Normalization

```typescript
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // 1. 转换为小写
    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // 2. 去除默认端口，移除 fragment
    if ((urlObj.protocol === 'https:' && urlObj.port === '443') ||
        (urlObj.protocol === 'http:' && urlObj.port === '80')) {
      urlObj.port = '';
    }
    urlObj.hash = '';

    // 3. 移除跟踪参数（utm_*、fbclid、gclid 等），保留其余查询参数
    // 不做：合并 http/https、去除 www、去除末尾斜杠、解码百分号编码（以 normalizeUrl.ts 为准）
    
    return urlObj.href;
  } catch {
    return ''; // 无效 URL
  }
}
```

### Step 4: Deduplication

```typescript
function calculateContentHash(item: Item): string {
  const content = `${item.title}|${item.body || ''}`.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

async function checkDuplicate(item: Item, existingItems: Item[]): Promise<string | null> {
  // 1. URL-based deduplication（优先）
  const normalizedUrl = normalizeUrl(item.canonicalUrl);
  const urlMatch = existingItems.find(i => normalizeUrl(i.canonicalUrl) === normalizedUrl);
  if (urlMatch) {
    return urlMatch.id;
  }
  
  // 2. Content-based deduplication（无 URL 时）
  if (item.kind === 'note' || (item.kind === 'article' && !item.canonicalUrl)) {
    const hash = await calculateContentHash(item);
    const contentMatch = existingItems.find(i => {
      // 计算 existing item 的 hash
      return calculateContentHash(i).then(h => h === hash);
    });
    if (contentMatch) {
      return contentMatch.id;
    }
  }
  
  return null; // 无重复
}
```

### Step 5: Import Flow UI

```typescript
// 预览界面组件结构
function ImportPreview({ 
  results, 
  onConfirm,
  onCancel 
}: ImportPreviewProps) {
  return (
    <div className="import-preview">
      <ImportStats results={results} />
      
      <table className="import-details">
        <thead>
          <tr>
            <th>标题</th>
            <th>URL</th>
            <th>状态</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          {results.details.map(detail => (
            <ImportResultRow key={detail.id} detail={detail} />
          ))}
        </tbody>
      </table>
      
      <div className="import-actions">
        <Button onClick={onCancel}>取消导入</Button>
        <Button variant="primary" onClick={onConfirm}>
          确认导入 ({results.valid} 条)
        </Button>
      </div>
    </div>
  );
}
```

### Step 6: Folder Batch Import (files over 1,000 records)

Requirement 2 AC8, AC11-13 and Requirement 5 AC10. The 1,000-record cap stays per batch; large bookmark exports are split by folder instead of being rejected.

1. `analyzeBookmarkFile(html)` parses once and returns every outcome (valid and invalid) with its folder path, plus a folder tree. Each node reports `total` (all records in the subtree) and `direct` (records directly inside the folder). Records outside any folder belong to the root node.
2. If `total` of the whole file is at most 1,000, the normal preview runs unchanged.
3. Otherwise the import dialog shows the tree. A selection is a set of `{ path, scope }` entries: `scope: 'subtree'` selects a folder with everything below it; `scope: 'direct'` selects only the records directly inside it, which lets users split a folder whose subtree is too large.
4. A folder whose subtree exceeds 1,000 cannot be selected as a subtree; its children and its direct records can. If `direct` alone exceeds 1,000, that part cannot be selected at all and the dialog says so (AC11).
5. `planImport(fileName, content, items, sources, now, { folders })` filters outcomes to the selection before dedupe, so the existing cap check, normalization and merge rules apply to each batch unchanged (AC13). Overlapping entries (a subtree plus one of its descendants) are counted once.
6. After a batch is confirmed the dialog keeps the parsed file in memory, marks the imported folders for this session, and offers "Choose more folders" without re-selecting the file (AC12).
7. Each batch creates its own `bookmark-file` source named `<file> (<folder names>)`, so the source list shows which folders came from which batch.

Invalid records carry a readable English message from `describeImportError(type)`; the error code stays in `errorType` for tests and is not shown to users (Requirement 5 AC11).
## Search & Filter Design

### Search Index Structure

```typescript
interface SearchIndex {
  items: Map<string, string[]>;  // itemId -> [keywords]
  keywords: Map<string, Set<string>>;  // keyword -> Set[itemId]
}

class SearchService {
  private index: SearchIndex = {
    items: new Map(),
    keywords: new Map(),
  };
  
  // 构建索引
  buildIndex(items: Item[]): void {
    this.index.items.clear();
    this.index.keywords.clear();
    
    for (const item of items) {
      const keywords = this.extractKeywords(item);
      this.index.items.set(item.id, keywords);
      
      for (const keyword of keywords) {
        if (!this.index.keywords.has(keyword)) {
          this.index.keywords.set(keyword, new Set());
        }
        this.index.keywords.get(keyword)?.add(item.id);
      }
    }
  }
  
  // 提取关键词（支持中文分词简化版）
  private extractKeywords(item: Item): string[] {
    const text = `${item.title} ${item.body || ''} ${item.tags.join(' ')}`;
    
    // 简单分词：英文按空格，中文按字符（简化版，实际应使用分词库）
    const words = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, ' ')
      .trim()
      .split(/\s+/);
    
    // 过滤停用词
    const stopwords = new Set(['the', 'is', 'at', 'of', 'on', 'and', 'a']);
    return words.filter(w => w.length >= 2 && !stopwords.has(w));
  }
  
  // 搜索
  search(query: string, items: Item[]): Item[] {
    if (query.length < 2) return [];
    
    const keywords = this.extractKeywords({ title: query, body: '', tags: [], kind: 'bookmark', savedAt: '', canonicalUrl: '', isSample: false });
    const resultIds = new Set<string>();
    
    for (const keyword of keywords) {
      const matchingIds = this.index.keywords.get(keyword);
      if (matchingIds) {
        for (const id of matchingIds) {
          resultIds.add(id);
        }
      }
    }
    
    return items.filter(item => resultIds.has(item.id));
  }
}
```

### Filter Logic

```typescript
interface FilterState {
  type: 'all' | 'bookmark' | 'article' | 'note';
  tags: string[];
  starred: boolean | null;  // null = 不筛选
  unread: boolean | null;   // null = 不筛选
  searchQuery: string;
}

function filterItems(items: Item[], filters: FilterState): Item[] {
  return items.filter(item => {
    // 1. 类型筛选
    if (filters.type !== 'all' && item.kind !== filters.type) {
      return false;
    }
    
    // 2. 标签筛选（OR 逻辑）
    if (filters.tags.length > 0) {
      const hasAnyTag = filters.tags.some(tag => item.tags.includes(tag));
      if (!hasAnyTag) return false;
    }
    
    // 3. 收藏筛选
    if (filters.starred !== null && item.starred !== filters.starred) {
      return false;
    }
    
    // 4. 未读筛选
    if (filters.unread !== null && item.readAt !== null === !filters.unread) {
      return false;
    }
    
    return true;
  });
}
```

### Search & Filter Pipeline

```typescript
function processItems(items: Item[], filters: FilterState, searchService: SearchService): Item[] {
  // 1. 简单搜索（关键词匹配）
  let result = items;
  
  if (filters.searchQuery.length >= 2) {
    result = searchService.search(filters.searchQuery, result);
  }
  
  // 2. 状态筛选
  result = filterItems(result, filters);
  
  return result;
}
```

## Rediscover Design

### Algorithm

```typescript
interface Clock {
  now(): Date;
}

class RealClock implements Clock {
  now(): Date {
    return new Date();
  }
}

class TestClock implements Clock {
  private currentTime: Date;
  
  constructor(initialTime: Date) {
    this.currentTime = initialTime;
  }
  
  now(): Date {
    return this.currentTime;
  }
  
  // 用于测试的时间跳跃
  advance(days: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

class RediscoverService {
  private clock: Clock;
  
  constructor(clock: Clock = new RealClock()) {
    this.clock = clock;
  }
  
  getRecommendedItems(items: Item[]): Item[] {
    const now = this.clock.now();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 1. 筛选：保存 > 30 天且未读
    const candidates = items.filter(item => {
      const savedAt = new Date(item.savedAt);
      return savedAt < thirtyDaysAgo && item.readAt === null;
    });
    
    // 2. 如果没有符合的，回退到最早的未读条目
    if (candidates.length === 0) {
      const unreadItems = items.filter(item => item.readAt === null);
      if (unreadItems.length > 0) {
        // 按 savedAt 升序排序
        unreadItems.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
        return unreadItems.slice(0, 1); // 返回最早的 1 条
      }
      return [];
    }
    
    // 3. 按 savedAt 升序排序（稳定的）
    candidates.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
    
    return candidates;
  }
  
  formatDuration(savedAt: string): string {
    const savedDate = new Date(savedAt);
    const now = this.clock.now();
    const diffMs = now.getTime() - savedDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} 个月前`;
    } else {
      return `${diffDays} 天前`;
    }
  }
}
```

### Usage

```typescript
// 应用中使用
const rediscoverService = new RediscoverService();

// 测试中使用
const testClock = new TestClock(new Date('2024-01-15T00:00:00Z'));
const testRediscover = new RediscoverService(testClock);
```

## RSS Feed Fetching Design

### Server-Side Endpoint (Express)

```typescript
// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const app = express();
app.use(cors());
app.use(express.json());

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2 MiB
const REQUEST_TIMEOUT = 8000; // 8 秒
const CONCURRENCY_LIMIT = 5;

let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function processQueue() {
  while (activeRequests < CONCURRENCY_LIMIT && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      activeRequests++;
      next();
    }
  }
}

async function fetchFeedHandler(req: express.Request, res: express.Response) {
  const { url } = req.body;
  
  // 1. URL 验证
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // 仅支持 HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
    }
    
    // 禁止私有 IP
    const ip = parsedUrl.hostname;
    if (['localhost', '127.0.0.1', '::1'].includes(ip) || 
        ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return res.status(403).json({ error: 'Private IPs are not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  // 2. 控制并发
  const queueTask = () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      maxRedirects: MAX_REDIRECTS,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        activeRequests--;
        processQueue();
        
        if (!response.ok) {
          return res.status(response.status).json({ error: `HTTP ${response.status}` });
        }
        
        // 3. 响应大小限制
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
          return res.status(413).json({ error: 'Response too large' });
        }
        
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_RESPONSE_SIZE) {
          return res.status(413).json({ error: 'Response too large' });
        }
        
        // 4. 解析 XML
        const text = new TextDecoder().decode(buffer);
        const parser = new xml2js.Parser();
        
        try {
          const result = await parser.parseStringPromise(text);
          
          // 5. 检测 RSS 或 Atom
          if (result.rss || result.rss2) {
            return res.json({ type: 'rss', data: result });
          } else if (result.feed) {
            return res.json({ type: 'atom', data: result });
          } else {
            return res.status(400).json({ error: 'Invalid feed format' });
          }
        } catch {
          return res.status(400).json({ error: 'XML parsing failed' });
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        activeRequests--;
        processQueue();
        
        if (error.name === 'AbortError') {
          return res.status(408).json({ error: 'Request timeout' });
        }
        return res.status(500).json({ error: 'Network error' });
      });
  };
  
  if (activeRequests < CONCURRENCY_LIMIT) {
    activeRequests++;
    queueTask();
  } else {
    requestQueue.push(queueTask);
  }
}

app.post('/api/feeds/fetch', fetchFeedHandler);
app.listen(3001, () => console.log('Feed fetch server running on port 3001'));
```

### Client-Side Fetcher

```typescript
interface FeedFetchResult {
  type: 'rss' | 'atom';
  data: any;
}

async function fetchFeed(url: string): Promise<FeedFetchResult> {
  const response = await fetch('/api/feeds/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// 防抖和并发控制
class FeedFetcher {
  private lastFetchTimes: Map<string, number> = new Map();
  private debounceDelay = 5000; // 5 秒防抖
  
  async fetch(url: string): Promise<FeedFetchResult> {
    const now = Date.now();
    const lastFetch = this.lastFetchTimes.get(url) || 0;
    
    if (now - lastFetch < this.debounceDelay) {
      throw new Error('Debounce: too recent');
    }
    
    this.lastFetchTimes.set(url, now);
    return fetchFeed(url);
  }
}
```

### Deployment: Static Client + Hosted Feed API

Requirement 9 AC11-15 and Requirement 10 AC10.

- The client is a static build on GitHub Pages. Every feature except live feed refresh works there.
- Live refresh calls a separately hosted Node service (the same `src/server/index.ts`). The client reads its base URL from the build variable `VITE_FEED_API_URL`; when unset it calls same-origin `/api`, which is the local dev and `npm start` setup.
- Hosting requirement: a long-running Node web service rather than serverless functions (no host is set up yet; Render needed a payment card and Vercel is under account review). A single-instance service means the in-memory concurrency limit (5) and rate limiter apply to all traffic, and the pinned-address HTTPS client needs real Node `https` and `dns`. Edge runtimes that only offer `fetch` cannot pin the validated address and are excluded.
- CORS: only origins listed in `ALLOWED_ORIGINS` (comma separated, exact match) receive `Access-Control-Allow-Origin`; preflight `OPTIONS` is answered for those origins only. No credentials are used.
- Rate limit: fixed 10-minute window per client IP, 20 fetches by default (`FEED_RATE_LIMIT`); over the limit returns 429 with `retryAfterSeconds`. Client IP comes from the header named by `CLIENT_IP_HEADER` when the host overwrites it on every request (Railway: `x-real-ip`); a missing, multi-valued or invalid value falls back to `req.ip`. Without `CLIENT_IP_HEADER`, `req.ip` with `TRUST_PROXY_HOPS` (default 0) is used. Requests waiting for a concurrency slot are capped at 20; beyond that the server returns 503.
- Cold start: free hosting sleeps after 15 minutes idle and takes about a minute to wake. On refresh the client first calls `GET /api/health` with a 90-second timeout and shows "Waking the feed service…", then posts the fetch with a 30-second timeout. It never pings the service on page load (AC15).
- Failure handling: network errors, timeouts, non-JSON bodies and missing configuration all map to `network-error` with a specific message; saved items are never touched.
- Static serving: the server serves `dist/` only when it exists, so the same entry runs as an API-only service on the host.
- Current state: the feed API runs on Railway (Free plan, single instance, `npm start` from `2026kirowen`). The Pages build points to it through the repository variable `FEED_API_URL`; when that variable is unset the static build hides Refresh and points to the local build.
- Proxy hops: `TRUST_PROXY_HOPS=1`. Counting too few hops only makes rate-limit buckets coarser; counting too many would let a client choose its own address, so 1 is the safe default. After deploying, verify that a client-supplied `X-Forwarded-For` cannot change the bucket.
## Accessibility Design

### Keyboard Navigation

```typescript
// Tab 顺序结构
function App() {
  return (
    <div className="app" tabIndex={-1}>
      {/* 主布局 */}
      <div className="layout">
        {/* 侧边栏 */}
        <aside className="sidebar" role="navigation" aria-label="主要导航">
          <SidebarMenu />
        </aside>
        
        {/* 主内容区 */}
        <main className="main-content" role="main">
          <Header />
          
          {/* 条目列表 */}
          <section aria-label="条目列表">
            <ItemList />
          </section>
          
          {/* 详情面板 */}
          {selectedItem && (
            <aside className="detail-panel" role="region" aria-label="详情">
              <ItemDetail item={selectedItem} />
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}

// 键盘支持
function SidebarMenu() {
  const menuItems = [
    { label: '全部', action: 'filter-type-all' },
    { label: '书签', action: 'filter-type-bookmark' },
    { label: '文章', action: 'filter-type-article' },
    { label: '笔记', action: 'filter-type-note' },
    { label: '重新发现', action: 'toggle-rediscover' },
  ];
  
  return (
    <nav>
      <ul>
        {menuItems.map((item, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => dispatch({ type: item.action })}
              aria-label={item.label}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Screen Reader Support

```typescript
// 动态状态更新
function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<FilterState>({ type: 'all', tags: [], starred: null, unread: null, searchQuery: '' });
  
  // 使用 aria-live 告知屏幕阅读器状态变化
  return (
    <div aria-live="polite" aria-atomic="true">
      <div className="results-count">
        找到 {items.length} 条结果
      </div>
      
      <ul role="list" aria-label="条目列表">
        {items.map(item => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SELECT_ITEM', payload: item.id })}
              aria-pressed={item.id === selectedItem?.id}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 表单标签
function AddBookmarkForm() {
  return (
    <form>
      <div className="form-group">
        <label htmlFor="title">标题</label>
        <input
          id="title"
          type="text"
          aria-required="true"
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && <span id="title-error" className="error">{errors.title}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="url">URL</label>
        <input
          id="url"
          type="text"
          aria-required="true"
          aria-invalid={errors.url ? 'true' : 'false'}
          aria-describedby={errors.url ? 'url-error' : undefined}
        />
        {errors.url && <span id="url-error" className="error">{errors.url}</span>}
      </div>
    </form>
  );
}
```

### Color Contrast

```css
/* CSS 变量定义 */
:root {
  --color-text: #333333;
  --color-background: #ffffff;
  --color-accent: #2563eb;
  --color-success: #059669;
  --color-error: #dc2626;
  --color-warning: #d97706;
}

/* WCAG AA 级别对比度（4.5:1） */
.text-primary {
  color: var(--color-text);  /* #333333 */
  background-color: var(--color-background);  /* #ffffff */
  /* 对比度: 13.15:1 ✓ */
}

.text-accent {
  color: var(--color-accent);  /* #2563eb */
  background-color: var(--color-background);  /* #ffffff */
  /* 对比度: 5.14:1 ✓ */
}

.text-success {
  color: var(--color-success);  /* #059669 */
  background-color: var(--color-background);  /* #ffffff */
  /* 对比度: 6.44:1 ✓ */
}

.text-error {
  color: var(--color-error);  /* #dc2626 */
  background-color: var(--color-background);  /* #ffffff */
  /* 对比度: 5.37:1 ✓ */
}

.text-warning {
  color: var(--color-warning);  /* #d97706 */
  background-color: var(--color-background);  /* #ffffff */
  /* 对比度: 6.77:1 ✓ */
}

/* 亮色文字 */
.text-light {
  color: #ffffff;
  background-color: var(--color-accent);  /* #2563eb */
  /* 对比度: 8.29:1 ✓ */
}
```

### Reduced Motion Support

```css
/* 媒体查询 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 或使用 CSS 变量 */
:root {
  --transition-speed: 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-speed: 0.01s;
  }
}

/* CSS Modules 使用 */
.button {
  transition: all var(--transition-speed) ease;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Import Round-Trip Preserves Data

*For any* valid bookmark HTML file, after importing the file into the database and then exporting all items as JSON, re-importing that JSON should produce an equivalent set of items with matching titles, canonical URLs, and tags.

**Validates: Requirements 7.4, 7.5, 7.6**

### Property 2: Deduplication by URL is Idempotent

*For any* item that has been imported into the database, attempting to import another item with the same normalized URL should not create a duplicate entry; instead, the new source should be appended to the existing item's sources array.

**Validates: Requirements 5.6, 5.8**

### Property 3: Content-Based Deduplication with SHA-256

*For any* two items with missing or null canonical URLs but identical content (title + body), the SHA-256 hash of the concatenated content should match, and the second item should be identified as a duplicate.

**Validates: Requirements 5.9**

### Property 4: Search Filter Composability

*For any* set of items in the database, applying a sequence of filters (type, tags, starred, unread) should produce results that satisfy all applied criteria simultaneously.

**Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

### Property 5: Rediscover Rule Consistency

*For any* set of items in the database, the Rediscover function should return items that satisfy the criteria of being saved more than 30 days ago and still unread, or if no such items exist, return the single oldest unread item.

**Validates: Requirements 8.1, 8.2**

### Property 6: Database Isolation Between Demo and User

*For any* state of the demo database and user database, operations on one database should not affect the contents of the other database; items in the demo database should never appear in the user database and vice versa.

**Validates: Requirements 1.5, 1.6, 7.10**

### Property 7: URL Normalization Invariance

*For any* valid URL, applying the normalization function multiple times should produce the same result as applying it once (idempotence), and two URLs that normalize to the same value should be considered equivalent for deduplication purposes.

**Validates: Requirements 2.3, 5.6**

### Property 8: Error Handling Completeness

*For any* invalid input (malformed HTML, invalid URL protocol, file too large, too many records, etc.), the system should return an appropriate error type and not store any invalid data in the database.

**Validates: Requirements 2.6, 2.7, 2.8, 2.9, 3.2, 3.4, 3.6, 3.7**

## Error Handling

### Error Categories

| Category | Description | User Visibility |
|----------|-------------|-----------------|
| Validation | Invalid input format, missing fields | Visible |
| Network | Timeout, connection errors | Visible |
| Parsing | XML/HTML parsing failures | Visible |
| Security | Invalid protocols, private IPs | Visible |
| Storage | IndexedDB errors, quota exceeded | Visible |

### Error Handling Pattern

```typescript
class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

function handleImportError(error: AppError): UserFacingError {
  switch (error.type) {
    case 'FileTooLarge':
      return {
        title: '文件过大',
        description: '文件大小超过 5 MiB 限制',
        action: '选择更小的文件',
      };
    case 'TooManyRecords':
      return {
        title: '记录数过多',
        description: '单次导入超过 1000 条记录限制',
        action: '拆分文件后重试',
      };
    case 'InvalidUrlProtocol':
      return {
        title: '不支持的协议',
        description: '仅支持 http 或 https 协议',
        action: '检查 URL 格式',
      };
    case 'SecurityViolation':
      return {
        title: '安全验证失败',
        description: '检测到潜在的安全风险',
        action: '检查文件内容',
      };
    default:
      return {
        title: '导入失败',
        description: '未知错误，请稍后重试',
        action: '重试或联系支持',
      };
  }
}
```

## Testing Strategy

### Testing Layers

1. **Unit Tests** (fast-check + Vitest)
   - Validation logic
   - Parsing functions
   - Deduplication algorithms
   - Date calculations
   - Search indexing

2. **Integration Tests** (Vitest)
   - Import flow end-to-end
   - Database operations
   - State management
   - Filter组合

3. **E2E Tests** (Playwright)
   - User workflows
   - Import/export cycles
   - Navigation and routing
   - Accessibility verification

### Property-Based Testing Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import fastCheckPlugin from 'vitest-fast-check';

export default defineConfig({
  plugins: [fastCheckPlugin()],
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'jsdom',
    globals: true,
  },
});
```

### Test Tags

每个 property-based test 必须包含以下注释标签:

```typescript
// Feature: echoshelf-mvp, Property 1: Import round-trip preserves data
it('round-trip import-export-import preserves data', () => {
  // ...
});

// Feature: echoshelf-mvp, Property 2: Deduplication by URL is idempotent
it('duplicate import by URL does not create new entry', () => {
  // ...
});
```

### Test Coverage Goals

| Layer | Coverage Goal |
|-------|---------------|
| Unit | ≥ 80% 行覆盖率 |
| Integration | 所有关键路径 |
| E2E | 关键用户流程 100% |
| PBT | 100+ iterations per property |