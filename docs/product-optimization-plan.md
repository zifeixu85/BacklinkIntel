# Backlink Intel 产品优化方案

> 文档版本：v1.1
> 更新日期：2026-02-12
> 状态：待评审

---

## 目录

1. [优化背景](#一优化背景)
2. [模块一：引荐域名展开交互优化](#二模块一引荐域名展开交互优化)
3. [模块二：本地存储 - 数据管理增强](#三模块二本地存储---数据管理增强)
4. [模块三：图表优化 - 日期显示 & 浮层交互](#四模块三图表优化---日期显示--浮层交互)
5. [模块四：外联库页面重构](#五模块四外联库页面重构)
6. [模块五：新增「外链项目」模块 - Todo / 任务管理](#六模块五新增外链项目模块---todo--任务管理)
7. [整体路由结构](#七整体路由结构)
8. [改动范围总结](#八改动范围总结)
9. [附录：日历组件技术选型](#九附录日历组件技术选型)

---

## 一、优化背景

当前 Backlink Intel 作为一个 SEO 外链分析工具，已经实现了以下核心能力：

- 导入 Ahrefs CSV 数据到本地 IndexedDB
- 按站点查看引荐域名趋势、域名列表、导入历史
- 外链资源库的基础管理

但在实际使用中存在以下痛点：

| 痛点 | 描述 |
|------|------|
| **展开交互体验不佳** | 引荐域名可展开查看反向链接，但展开区域的信息展示和交互不够完善 |
| **数据管理能力缺失** | 无法删除站点、快照等数据，无法手动新增外链资源 |
| **图表体验问题** | 日期缺少年份；右侧浮层覆盖内容而非挤压内容 |
| **外联库信息密度低** | 暗色卡片布局浪费空间，关键信息（DR、流量、关联站点）不突出 |
| **缺少执行管理** | 没有从「情报分析」到「外链建设执行」的闭环，缺少 Todo/任务管理功能 |

本方案旨在系统性解决以上问题，共分为 **5 大优化模块**。

---

## 二、模块一：引荐域名展开交互优化

### 2.1 现状

`pages/SiteDashboard.tsx` 的「引荐域名详情」Tab 已支持点击域名行展开查看该域名下所有反向链接（引荐页面 URL、锚文本、首次发现日期）。**不需要新增独立 Tab**，在现有展开交互基础上优化体验即可。

### 2.2 现有展开区域的问题

当前展开区域（`SiteDashboard.tsx:361-400`）存在以下不足：

1. **信息不够完整**：只显示了引荐页面 URL、锚文本、首次发现日期三列，缺少目标 URL、链接类型等关键字段
2. **没有分页**：如果一个域名有大量反向链接，全部渲染会造成性能问题
3. **缺少链接类型标签**：Dofollow / Nofollow / UGC / Sponsored 状态未展示
4. **目标页面不可见**：无法看到对方链接到我方的哪个页面

### 2.3 优化方案

#### 展开区域表格列增强

| 列名 | 字段来源 | 说明 |
|------|---------|------|
| 引荐页面 URL | `refPageUrl` | 可点击跳转外部链接，truncate 显示 |
| 目标页面 | `targetUrl` | **新增**，显示我方被链接的页面路径 |
| 锚文本 | `anchor` | 链接的锚文字 |
| 链接类型 | `nofollow` / `ugc` / `sponsored` | **新增**，标签形式展示（绿色 DOFOLLOW / 灰色 NOFOLLOW 等） |
| 页面流量 | `pageTraffic` | **新增**，引荐页面的流量 |
| 首次发现 | `firstSeen` | 日期格式含年份 |

#### 交互优化

- **分页/限制显示**：默认显示前 10 条，超出部分显示「查看更多」按钮加载
- **链接可点击**：引荐页面 URL 和目标页面 URL 均可点击外部跳转

---

## 三、模块二：本地存储 - 数据管理增强

### 3.1 现状问题

系统已使用 Dexie (IndexedDB) 本地存储，但缺少删除和手动新增的能力。

### 3.2 优化方案

#### 3.2.1 站点删除

- **位置**：`pages/IntelList.tsx` 站点卡片右上角增加删除按钮
- **行为**：级联删除该站点下所有 `snapshots` 和 `backlinks` 记录
- **确认**：弹窗二次确认，显示将要删除的数据量

#### 3.2.2 快照删除

- **位置**：`pages/SiteDashboard.tsx`「导入历史」Tab 每行增加删除按钮
- **行为**：删除对应 `snapshot` 及其所有 `backlinks` 记录
- **确认**：弹窗二次确认

#### 3.2.3 外联库手动新增

- **位置**：`pages/LibraryList.tsx` 右上角 `+` 按钮（当前无功能）
- **行为**：弹出模态框，手动录入域名信息（域名、付费类型、域名类型、备注等）
- **写入**：直接写入 `db.library` 表

#### 3.2.4 外联库条目删除

- **现状**：`pages/LibraryDetail.tsx` 已有删除功能，保持现状即可

---

## 四、模块三：图表优化 - 日期显示 & 浮层交互

> **状态：已完成** ✅

### 4.1 日期显示修复 ✅

#### 现状

```typescript
// SiteDashboard.tsx:110
displayDate: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
// 输出: "1月15日" —— 缺少年份
```

#### 修改方案（已实现）

```typescript
displayDate: new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
// 输出: "2024年1月15日"
```

### 4.2 浮层交互重构 - 挤压式布局 ✅

#### 现状问题

```tsx
// SiteDashboard.tsx:176
<div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[60] ...">
```

当前使用 `fixed` 定位，浮层覆盖在主内容上方，遮挡信息。

#### 优化方案（已实现）

已将整个页面容器改为 `flex` 布局，浮层作为右侧 flex 子元素，主内容区域同步收缩：

```
┌─────────────────────────────────────┬──────────────┐
│                                     │              │
│         主内容区域                    │   浮层面板    │
│     (flex-1, 宽度自适应收缩)          │   (400px)    │
│                                     │              │
│                                     │              │
└─────────────────────────────────────┴──────────────┘
```

**实现要点**：

1. 外层容器使用 `flex` 布局
2. 主内容区域设置 `flex-1 min-w-0`，加上 `transition-all duration-300` 实现平滑过渡
3. 浮层面板 **不使用 `fixed`**，而是作为 flex 子元素，`width: 400px; flex-shrink: 0`
4. 浮层未打开时不渲染，打开时展开
5. 浮层使用 `sticky top-0 h-screen` 保持可见
6. 浮层内容按域名分组，点击展开查看具体外链

---

## 五、模块四：外联库页面重构

### 5.1 现状问题

`pages/LibraryList.tsx` 使用暗色卡片（`bg-[#111827]`）布局，存在以下问题：

- 信息密度极低，三列卡片浪费大量空间
- 显示了 "Resource Index"、"合作类型 Content / Guest"、"最近同步" 等低价值信息
- 缺少关键信息：DR、域名流量、关联站点
- 付费类型和域名类型无法行内快速修改

### 5.2 优化方案 - 改为表格列表

#### 表格列定义

| 列 | 说明 | 交互 |
|----|------|------|
| **域名** | Favicon + 域名名称 | 点击进入详情页 |
| **DR** | 域名评级 | 从 `backlinks` 表聚合，带进度条 |
| **域名流量** | 域名级别流量 | 从 `backlinks` 表聚合 `domainTraffic` |
| **付费类型** | Free / Paid / Unknown | **行内下拉切换**，直接保存 |
| **域名类型** | 博客站 / 目录站 / 新闻站 / 论坛 / 其他 | **行内下拉切换**，直接保存（新增字段） |
| **关联站点** | 哪些被监控站点使用了这个外链 | 标签形式展示站点名，可点击跳转 |
| **操作** | 详情 / Whois / 删除 | 操作按钮组 |

#### 数据模型变更

在 `types.ts` 的 `LinkLibraryDomain` 中新增字段：

```typescript
export type DomainType = 'blog' | 'directory' | 'news' | 'forum' | 'other';

export interface LinkLibraryDomain {
  // ... 现有字段 ...
  domainType: DomainType;  // 新增：域名类型
}
```

同步更新 `db/db.ts` 的 schema，新增 `domainType` 索引。

#### 关联站点查询逻辑

```
对于每个 library 域名：
1. 查询 backlinks 表中 refDomain === domain 的记录
2. 聚合去重 siteId
3. 查询 sites 表获取站点名称
4. 以标签形式展示在表格行中
```

#### 移除内容

- 暗色卡片背景 (`bg-[#111827]`)
- "Resource Index: #xxxx"
- "合作类型 Content / Guest"（硬编码无意义）
- "最近同步" 日期
- 底部 "查看详情" 箭头链接（改为操作列）

---

## 六、模块五：新增「外链项目」模块 - Todo / 任务管理

### 6.1 功能定位

这是最重要的新增模块，实现从 **「外链情报分析」** 到 **「外链建设执行管理」** 的完整闭环。

用户可以：
1. 基于自己的网站创建外链建设项目
2. 从外链资源库中挑选域名，编排到项目中
3. 为每个外链任务设定计划日期
4. 跟踪每条外链的执行状态

### 6.2 数据模型新增

#### OutreachProject（外链项目）

```typescript
export interface OutreachProject {
  id: string;
  name: string;                    // 项目名称，如 "Q1 外链建设计划"
  siteId: string | null;           // 关联的目标站点（可选）
  description: string | null;      // 项目描述
  createdAt: number;
  updatedAt: number;
}
```

#### OutreachTask（外链任务）

```typescript
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OutreachTask {
  id: string;
  projectId: string;               // 所属项目
  libraryDomainId: string | null;   // 关联外链库域名（可选）
  domain: string;                   // 目标外链域名（冗余存储）
  scheduledDate: number | null;     // 计划执行日期
  status: TaskStatus;               // 任务状态
  notes: string | null;             // 任务备注
  createdAt: number;
  updatedAt: number;
}
```

### 6.3 数据库变更

在 `db/db.ts` 中新增两张表：

```typescript
// version(2)
projects: 'id, siteId, createdAt',
outreachTasks: 'id, projectId, libraryDomainId, domain, scheduledDate, status, [projectId+status]'
```

### 6.4 页面设计

#### 6.4.1 项目列表页（`/projects`）

```
┌──────────────────────────────────────────────────┐
│  我的外链计划                        [+ 新建项目]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Q1 外链建设计划                           │    │
│  │ 关联站点: example.com                     │    │
│  │ 进度: ████████░░ 12/15 (80%)             │    │
│  │ 待处理: 3  进行中: 0  已完成: 12           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ 竞品外链跟踪                              │    │
│  │ 关联站点: mysite.com                      │    │
│  │ 进度: ████░░░░░░ 5/20 (25%)              │    │
│  │ 待处理: 14  进行中: 1  已完成: 5           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

**功能**：
- 展示所有项目卡片，包含进度条和状态统计
- 可新建项目（填写名称、选择关联站点、描述）
- 可删除项目（级联删除所有任务）

#### 6.4.2 项目详情页（`/projects/:projectId`）

提供两种视图模式切换：

**视图一：日历视图**

```
┌──────────────────────────────────────────────────┐
│  Q1 外链建设计划           [日历视图] [列表视图]    │
│                            [+ 添加任务]            │
├──────────────────────────────────────────────────┤
│                                                  │
│  2024年3月                                       │
│  ┌────┬────┬────┬────┬────┬────┬────┐           │
│  │ 一 │ 二 │ 三 │ 四 │ 五 │ 六 │ 日 │           │
│  ├────┼────┼────┼────┼────┼────┼────┤           │
│  │    │    │    │    │  1 │  2 │  3 │           │
│  │    │    │    │    │    │    │    │           │
│  ├────┼────┼────┼────┼────┼────┼────┤           │
│  │  4 │  5 │  6 │  7 │  8 │  9 │ 10 │           │
│  │    │blog│    │dir.│    │    │    │           │
│  │    │.com│    │.com│    │    │    │           │
│  ├────┼────┼────┼────┼────┼────┼────┤           │
│  │ ...│    │    │    │    │    │    │           │
│  └────┴────┴────┴────┴────┴────┴────┘           │
│                                                  │
└──────────────────────────────────────────────────┘
```

**视图二：列表视图（按状态分组）**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ○ 待处理 (3)                                    │
│  ├─ techblog.com      计划: 3/5   [开始] [跳过]  │
│  ├─ directory.org     计划: 3/7   [开始] [跳过]  │
│  └─ news-site.com     计划: 3/10  [开始] [跳过]  │
│                                                  │
│  ◐ 进行中 (1)                                    │
│  └─ forum.dev         计划: 3/3   [完成] [退回]  │
│                                                  │
│  ● 已完成 (5)                                    │
│  ├─ awesome-blog.io   完成于: 3/1               │
│  ├─ ref-site.com      完成于: 2/28              │
│  └─ ...                                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### 6.4.3 添加任务流程

```
点击「+ 添加任务」
  → 弹出模态框
  → 从外链资源库搜索/选择域名（支持多选）
  → 为每个域名设定计划日期
  → 确认添加
  → 任务写入 outreachTasks 表
```

#### 6.4.4 快捷入口

在以下位置增加「加入外链计划」的快捷操作：

| 位置 | 入口形式 |
|------|---------|
| SiteDashboard「引荐域名详情」Tab | 每行域名右侧增加「+计划」按钮 |
| 外联库列表页 | 操作列增加「+计划」按钮 |
| 外联库详情页 | 顶部增加「加入外链计划」按钮 |

点击后弹出选择框：选择目标项目 → 设定日期 → 加入。

### 6.5 导航更新

在 `App.tsx` 顶部导航栏新增第三个入口：

```
[ 站点智能 ] [ 资源库 ] [ 外链计划(新) ]
```

---

## 七、整体路由结构

```
/                                    → 重定向到 /intel
/intel                               → 站点列表（增加删除功能）
/intel/:siteId                       → 站点仪表盘
                                       ├─ Tab: 趋势分析（日期含年份，浮层挤压式）
                                       ├─ Tab: 引荐域名详情（展开交互优化）
                                       └─ Tab: 导入历史（增加快照删除）
/intel/:siteId/snapshot/:snapshotId  → 快照详情
/intel/:siteId/export-to-library     → 批量入库
/library                             → 外联库列表（表格重构）
/library/:domainId                   → 域名详情（增加域名类型字段）
/projects                            → 【新增】外链项目列表
/projects/:projectId                 → 【新增】项目详情（日历 + 任务列表）
```

---

## 八、改动范围总结

### 8.1 文件级改动清单

| 类别 | 涉及文件 | 改动程度 | 说明 |
|------|---------|---------|------|
| **数据层** | `types.ts` | 中等 | 新增 `DomainType`、`OutreachProject`、`OutreachTask`、`TaskStatus`；修改 `LinkLibraryDomain` |
| **数据层** | `db/db.ts` | 中等 | 升级到 version(2)，新增 `projects`、`outreachTasks` 两张表，`library` 新增索引 |
| **站点仪表盘** | `pages/SiteDashboard.tsx` | 中等 | 展开区域交互优化（增加列、分页）；日期格式修复；浮层布局重构为挤压式 |
| **外联库列表** | `pages/LibraryList.tsx` | **大改** | 暗色卡片 → 白底表格；行内编辑付费/域名类型；关联站点展示 |
| **外联库详情** | `pages/LibraryDetail.tsx` | 小改 | 新增域名类型选择器；新增「加入外链计划」入口 |
| **站点列表** | `pages/IntelList.tsx` | 小改 | 增加站点删除按钮 + 确认弹窗 |
| **路由 & 导航** | `App.tsx` | 小改 | 新增导航项「外链计划」+ 2 条新路由 |
| **新增页面** | `pages/ProjectList.tsx` | **全新** | 外链项目列表页 |
| **新增页面** | `pages/ProjectDetail.tsx` | **全新** | 项目详情页（日历视图 + 列表视图 + 任务管理） |

### 8.2 开发优先级建议

| 优先级 | 模块 | 理由 |
|--------|------|------|
| **P0** | 模块三：图表日期 + 浮层 | 改动最小，体验提升最直接 |
| **P0** | 模块二：数据删除 | 基础能力缺失，影响日常使用 |
| **P1** | 模块一：展开交互优化 | 现有功能增强，改动量小 |
| **P1** | 模块四：外联库重构 | 信息密度和操作效率大幅提升 |
| **P2** | 模块五：外链项目 | 最大的新增功能，依赖模块四完成后更顺畅 |

---

> **备注**：所有数据仍保持本地 IndexedDB 存储，不引入后端服务。Dexie 数据库版本从 1 升级到 2 时需处理好 migration 逻辑，确保已有数据不丢失。

---

## 九、附录：日历组件技术选型

模块五的项目详情页需要日历视图来展示任务排期。以下是调研的开源方案：

### 候选方案对比

| 方案 | GitHub 仓库 | 特点 | 依赖 | 推荐度 |
| ---- | ----------- | ---- | ---- | ------ |
| **Schedule-X** | [schedule-x/schedule-x](https://github.com/schedule-x/schedule-x) | 轻量、快速加载、日/周/月视图、拖拽支持、响应式设计 | 极少外部依赖 | ★★★★★ |
| **React Big Schedule** | [ansulagrawal/react-big-schedule](https://github.com/ansulagrawal/react-big-schedule) | 功能强大、拖拽排程、资源视图、适合复杂调度 | 较重 | ★★★★ |
| **FullCalendar** | [fullcalendar/fullcalendar](https://github.com/fullcalendar/fullcalendar) | 最成熟的日历库、生态完善、日/周/月/列表视图 | React 适配器 `@fullcalendar/react` | ★★★★ |
| **React Lightweight Calendar** | [nicksmd/react-lightweight-calendar](https://github.com/nicksmd/react-lightweight-calendar) | 极轻量、TypeScript、仅依赖 `date-fns` | 极少 | ★★★ |
| **@cubedoodl/react-simple-scheduler** | [cubedoodl/react-simple-scheduler](https://github.com/cubedoodl/react-simple-scheduler) | 零依赖（仅 React）、类 Google Calendar 交互 | 无 | ★★★ |

### 推荐方案：Schedule-X

**推荐理由**：

1. **轻量**：包体积小，加载快，符合本项目离线工具的定位
2. **月视图**：原生支持月视图，适合按日期编排外链任务的场景
3. **拖拽**：支持拖拽调整任务日期，体验好
4. **框架适配**：提供 React 适配器，集成简单
5. **活跃维护**：近期仍有更新，社区活跃

**备选方案**：如果需要更丰富的视图（如资源甘特图），可考虑 FullCalendar，但体积较大。

### 集成方式

```bash
pnpm add @schedule-x/react @schedule-x/theme-default
```

在项目详情页中引入月视图组件，将 `OutreachTask` 数据映射为日历事件：

```typescript
// 数据映射示意
const calendarEvents = tasks.map(task => ({
  id: task.id,
  title: task.domain,
  start: new Date(task.scheduledDate).toISOString().split('T')[0],
  end: new Date(task.scheduledDate).toISOString().split('T')[0],
  // 根据状态设置颜色
  calendarId: task.status  // pending=灰色, in_progress=蓝色, completed=绿色
}));
```
