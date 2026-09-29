---
feature: anime-personal-blog
status: designed
updated: 2026-09-29
branch: main
commits: 
---

# 二次元个人博客（月月岛）

## Report

## [S1] Problem

需要一个面向「月月岛科技」品牌形象的二次元个人博客：对外展示文章、作品与互动内容，并提供管理员后台维护文章。当前仓库仅有品牌素材（主 Logo、Q 版吉祥物、主视觉背景图），没有应用代码。

## [S2] Design

### 技术栈（已确认）

| 层 | 选型 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + TailwindCSS + React Router + Zustand |
| 后端 | NestJS 10 + Prisma + SQLite + JWT + Multer |
| Markdown | `marked` + `dompurify` 前端渲染 |
| 仓库 | npm workspaces：`frontend/` + `backend/` |

### 视觉方向

- 清透明亮墨绿：浅色底 `#F7FAF9`，墨色字 `#1A2B2A`，主 accent 墨绿 `#2F6F68`，辅助浅绿 `#D8EDE9`
- 圆角卡片、轻投影；首页 Hero 使用主视觉背景图，Q 版吉祥物做浮动装饰
- 支持暗色模式（`class` 策略，Zustand + localStorage）
- 品牌：站点名「月月岛」，英文 `YUEYUEDAO`；规范资源名 `assets/logo.png`、`assets/mascot.png`、`assets/hero.png`（由 `src/png` 素材复制而来）

### 架构

```
frontend (Vite :5173)  --REST /api-->  backend (NestJS :3000)
                                          |
                                       Prisma/SQLite
                                          |
                                       uploads/ 静态文件
```

- 前端开发代理 `/api` 与 `/uploads` 到 `http://localhost:3000`
- 后端生产可 `serve-static` 托管 `frontend/dist`
- 种子数据：管理员账号、示例文章（3+ 篇 Markdown）、标签、评论、友链、项目、画廊、留言板

### 数据模型（Prisma）

- **User**: id, username, passwordHash, displayName
- **Post**: id, title, slug, summary, content, cover, status(`draft`|`published`), publishedAt, createdAt, updatedAt, tags(Tag[])
- **Tag**: id, name, slug, posts(Post[])
- **Comment**: id, postId, nickname, content, createdAt
- **Like**: id, postId, fingerprint, createdAt（同 fingerprint+post 唯一）
- **Guestbook**: id, nickname, content, createdAt
- **FriendLink**: id, name, url, avatar, description, sort
- **Project**: id, title, description, url, techStack, cover, sort
- **GalleryItem**: id, title, imageUrl, description, sort

### API 契约（前缀 `/api`）

公开：

- `GET /posts?tag=&page=&pageSize=` → `{ items, total, page, pageSize }`
- `GET /posts/:slug` → 文章详情（含 tags、likeCount、comments）
- `GET /posts/:slug/comments` → 评论列表
- `POST /posts/:slug/comments` body `{ nickname, content }`
- `POST /posts/:slug/like` body `{ fingerprint }` → `{ likeCount, liked }`
- `GET /tags` → 标签及文章数
- `GET /archive` → 按年月分组的文章摘要
- `GET /guestbook` / `POST /guestbook`
- `GET /friends` / `GET /projects` / `GET /gallery`
- `GET /about` → 关于文案（种子写入，可后续扩展）

管理（`Authorization: Bearer <jwt>`，除登录外）：

- `POST /auth/login` body `{ username, password }` → `{ token, user }`
- `GET /auth/me`
- `GET|POST /admin/posts`，`GET|PATCH|DELETE /admin/posts/:id`
- `POST /admin/upload` multipart `file` → `{ url }`（保存至 `backend/uploads`）
- `POST|PATCH|DELETE /admin/tags|friends|projects|gallery|guestbook/:id?`

错误：统一 `{ statusCode, message }`；401 未登录/token 无效；404 资源不存在；400 校验失败。

### 前端路由

| 路径 | 页面 | 要点 |
|---|---|---|
| `/` | 首页 | Hero + 精选文章 + 最新动态 |
| `/posts` | 文章列表 | 分页、标签筛选 |
| `/posts/:slug` | 文章详情 | Markdown、阅读进度、评论、点赞 |
| `/tags` `/tags/:slug` | 标签 | 云 + 按标签过滤 |
| `/archive` | 归档 | 时间线 |
| `/about` | 关于 | 品牌介绍 |
| `/projects` | 项目 | 作品集卡片 |
| `/gallery` | 画廊 | 插画墙 |
| `/friends` | 友链 | 链接卡片 |
| `/guestbook` | 留言板 | 发言 + 列表 |
| `/admin/login` | 登录 | JWT |
| `/admin` `/admin/posts`… | 后台 | 文章 CRUD、上传、标签等 |

布局：顶栏导航 + 页脚版权；内容区最大宽 `1120px`；移动端汉堡菜单。

### 交互与增强

- 暗色切换、阅读进度条、`highlight` 代码高亮（`marked` + 自定义 code 样式即可）
- 点赞用 `localStorage` fingerprint（UUID）
- 评论/留言需 nickname + content（长度 1–500）

### 测试边界

- 后端：登录、文章 CRUD、评论/点赞/留言 API 的 e2e（supertest）
- 前端：构建通过 + 关键组件/vitest 冒烟（路由渲染、markdown 渲染函数）

## [S3] Out of Scope

- 真实邮件/OAuth 登录、第三方评论（如 Giscus）
- 富文本编辑器（后台用 textarea Markdown）
- 多用户权限、RBAC
- 生产部署/CI/CD、Docker
- 全站 SSR/SEO 深度优化

## Tasks

- [x] T1: 后端骨架 + Prisma schema + 种子数据 — acceptance: `prisma db push && seed` 后可查询到管理员与示例文章 (covers: S2)
- [x] T2: 后端公开 API（posts/tags/archive/comments/like/guestbook/friends/projects/gallery/about） — acceptance: supertest 覆盖主要读写路径且通过 (covers: S2; depends: T1)
- [x] T3: 后端认证与管理 API + 上传 — acceptance: 登录得 JWT，鉴权后可 CRUD 文章并上传封面 (covers: S2; depends: T1)
- [x] T4: 前端应用骨架（Vite/Router/Tailwind/主题/布局/品牌素材） — acceptance: `npm run build -w frontend` 成功，导航可达各占位路由 (covers: S2)
- [x] T5: 前端展示页（首页/列表/详情/标签/归档/关于/项目/画廊/友链/留言板） — acceptance: 对接 API，二次元风格完整可浏览 (covers: S2; depends: T4, T2)
- [x] T6: 前端互动（评论/点赞/阅读进度/暗色） — acceptance: 详情页可点赞评论，主题可切换并持久化 (covers: S2; depends: T5)
- [x] T7: 管理后台（登录/文章管理/上传） — acceptance: 登录后可发布草稿并预览封面 (covers: S2; depends: T3, T5)
- [x] T8: 测试与构建验证 — acceptance: `npm test` 与 `npm run build` 全绿 (covers: S2)
