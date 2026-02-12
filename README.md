<div align="center">
<img width="1200" alt="GHBanner" src="https://ameng-image-upload.oss-cn-shanghai.aliyuncs.com/img/CleanShot%202026-02-12%20at%2018.27.29%402x.png" />

# Backlink Intel - 外部链接智能分析系统

**一款完全运行在浏览器中的 SEO 外链分析工具，无需服务器，数据本地存储，安全私密。**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

> 这是 **A梦** 自用的外链分析工具，目前还比较初级，会持续更新完善。
> 如果觉得有用，欢迎点击右上角的 **Star** 关注本仓库，第一时间获取更新通知！

</div>

---

## 这个工具能做什么？

如果你在做 SEO（搜索引擎优化），你一定需要分析网站的外部链接（Backlink）。这个工具可以帮你：

- **导入外链数据** — 支持导入 Ahrefs、SEMrush 等主流 SEO 工具导出的 CSV / Excel 文件，拖拽即可导入
- **可视化趋势分析** — 用图表直观查看外链增长趋势（支持 30/90/180/365 天）
- **引荐域名分析** — 查看每个引荐域名的 DR 评分、流量、锚文本等详细信息
- **垃圾链接检测** — 自动识别低质量 / 垃圾外链（DR < 5 或外链密度 > 400）
- **外链资源库（开发中）** — 像 CRM 一样管理你的外链资源，记录价格、状态、联系方式
- **批量导出（开发中）** — 将优质引荐域名一键添加到资源库中

> **隐私友好**：所有数据存储在你自己的浏览器中（IndexedDB），不会上传到任何服务器。

---

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/zh-cn)（推荐 LTS 版本）

### 安装与运行

```bash
# 1. 克隆项目到本地（或在 GitHub 页面点击 Code → Download ZIP 下载解压）
git clone https://github.com/zifeixu85/BacklinkIntel.git

# 2. 进入项目目录
cd BacklinkIntel

# 3. 安装依赖
pnpm install

# 4. 启动项目
pnpm dev
```

启动成功后，在浏览器中打开 **http://localhost:3000/** 即可使用。

---

## 使用指南

### 1. 添加站点并导入数据

```
首页 → 点击「添加站点」 → 输入你要分析的网站域名
```

然后导入你从 SEO 工具导出的 CSV 或 Excel 文件：

1. 在 Ahrefs / SEMrush 等工具中，进入目标网站的 Backlinks 报告，导出 CSV 或 Excel 文件
2. 回到本工具，点击「导入数据」，将文件拖入导入框（或点击选择文件）
3. 预览数据确认无误后，点击确认导入

### 2. 查看分析面板

导入成功后，进入站点面板即可看到：

- **趋势图** — 外链增长的时间趋势，可切换不同时间范围
- **引荐域名列表** — 按 DR 排序的域名列表，点击可展开查看详细信息
- **导入记录** — 查看所有历史导入的 CSV 快照

### 3. 管理外链资源库

在「资源库」页面，你可以：

- 从分析结果中批量导入优质域名
- 记录每个域名的合作状态（未尝试 / 已提交 / 已上线 / 被拒绝 / 维护中）
- 标记价格类型（免费 / 付费 / 未知）
- 保存提交链接、联系方式和备注

---

## 常见问题

<details>
<summary><b>Q: 启动时提示端口 3000 被占用怎么办？</b></summary>

说明你的电脑上有其他程序正在使用 3000 端口。你可以：

- 关闭占用该端口的程序
- 或者修改 `vite.config.ts` 中的端口号：将 `port: 3000` 改为其他数字（如 `3001`）

</details>

<details>
<summary><b>Q: 数据存储在哪里？安全吗？</b></summary>

所有数据都存储在你浏览器的 **IndexedDB** 中（本地存储），不会发送到任何外部服务器。但请注意：

- 清除浏览器数据会导致已导入的数据丢失
- 建议使用固定的浏览器（如 Chrome）访问本工具
- 换一个浏览器或使用隐私模式将看不到之前的数据

</details>

<details>
<summary><b>Q: 支持哪些文件格式？</b></summary>

目前支持 CSV 和 Excel（.xlsx / .xls）格式，文件需包含以下常见字段：

`Referring page URL`、`Domain rating (DR)`、`Nofollow`、`First seen`、`Anchor`、`Page traffic`、`Domain traffic` 等。

Ahrefs、SEMrush 等主流 SEO 工具导出的 Backlinks CSV 或 Excel 文件均可导入。

</details>

<details>
<summary><b>Q: 我没有 Git，怎么下载项目？</b></summary>

你可以直接在 GitHub 项目页面点击绿色的 **「Code」** 按钮，选择 **「Download ZIP」**，下载后解压即可。然后在终端中进入解压后的文件夹，继续执行 `pnpm install`。

</details>

---

## 技术栈

| 技术 | 用途 |
| --- | --- |
| React 18 | 用户界面框架 |
| TypeScript | 类型安全的 JavaScript |
| Vite | 构建工具和开发服务器 |
| Tailwind CSS | 样式框架 |
| Dexie (IndexedDB) | 浏览器本地数据库 |
| Recharts | 数据可视化图表 |
| PapaParse | CSV 文件解析 |
| SheetJS (xlsx) | Excel 文件解析 |

## 项目结构

```text
BacklinkIntel/
├── index.html          # 入口 HTML 文件
├── index.tsx           # React 入口
├── App.tsx             # 根组件（路由、布局）
├── types.ts            # TypeScript 类型定义
├── components/         # 可复用组件
│   ├── ImportModal.tsx  #   CSV/Excel 导入弹窗
│   └── Modal.tsx        #   通用弹窗
├── pages/              # 页面组件
│   ├── IntelList.tsx    #   站点列表（首页）
│   ├── SiteDashboard.tsx#   站点分析面板
│   ├── SnapshotDetail.tsx#  导入快照详情
│   ├── LibraryList.tsx  #   资源库列表
│   ├── LibraryDetail.tsx#   资源库详情
│   ├── ExportToLibrary.tsx# 批量导出到资源库
│   ├── ProjectList.tsx  #   外链计划列表
│   └── ProjectDetail.tsx#   外链计划详情（列表/日历视图）
├── db/
│   └── db.ts           # 数据库定义 (Dexie/IndexedDB)
├── utils/
│   ├── csv-parser.ts   # CSV/Excel 解析器（兼容多平台）
│   └── domain.ts       # 域名工具函数
├── package.json        # 项目配置和依赖
├── vite.config.ts      # Vite 构建配置
└── tsconfig.json       # TypeScript 配置
```

## 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建你的功能分支：`git checkout -b feature/my-feature`
3. 提交你的修改：`git commit -m "feat: 添加某某功能"`
4. 推送到远程分支：`git push origin feature/my-feature`
5. 创建 Pull Request

## 开源协议

本项目基于 [GNU General Public License v3.0](LICENSE) 开源。
