# 月月岛 · 二次元个人博客

清透明亮墨绿风格的二次元个人博客，React + NestJS 全栈，统一 SSO 登录。

## 功能

- **展示**：首页 Hero、文章 / 标签 / 归档、项目、画廊、友链、留言板、关于
- **互动**：SSO 登录后评论、点赞、留言板
- **文章**：Markdown、阅读次数、标签管理
- **项目**：GitHub 用户 / 组织监控同步 + 手动项目，可搜索跳转
- **后台**（仅 SSO root）：文章 CRUD、首页文案、标签 / 友链 / 画廊 / 关于、DNS 与受限代理、Git 同步
- **多核**：Node cluster 按 CPU 起 worker

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 · Vite · TypeScript · TailwindCSS · Zustand |
| 后端 | NestJS · Prisma · SQLite · JWT · Multer |
| 登录 | SSO OAuth2 模式 A（授权码 + PKCE） |

## 快速开始

```bash
npm install
cd backend
npx prisma generate
npx prisma db push
npx ts-node --transpile-only prisma/seed.ts
cd ..
npm run dev
```

- 前台：http://localhost:5173
- API：http://localhost:3000

## 环境变量（`backend/.env`）

```bash
SSO_ISSUER=https://mindustry.wiki:1090
SSO_CLIENT_ID=yzfwe-blog
SSO_CLIENT_SECRET=你的客户端密钥
SSO_REDIRECT_URI=http://localhost:5173/auth/sso/callback
SSO_ROOT_USER_IDS=0
JWT_SECRET=随机串
PORT=3000
# 可选
CLUSTER_WORKERS=2
GITHUB_TOKEN=
```

## SSO 说明

- 评论、留言、后台均走统一登录
- 头像与邮箱来自 SSO `/oauth2/profile`
- **后台仅 root**（`user_id = 0` 或 `public_id = 0`）可进入
- 本地密码登录已停用

客户端登记见 SSO 仓库 `clients.d/yzfwe-blog.json`，回调包含：

- `http://localhost:5173/auth/sso/callback`
- `https://mindustry.wiki:1081/auth/sso/callback`
- `https://monthzifang.top:1081/auth/sso/callback`

## 目录结构

```
yzfwe/
  frontend/          # React + Vite
  backend/           # NestJS + Prisma
  assets/            # 品牌图（logo / mascot / hero）
  docs/compose/spec/ # 规格文档
```

## 测试与构建

```bash
npm test
npm run build
```

## 品牌素材

- Logo：月月岛科技 `logo.png`
- 站点头像 / favicon：Q 版吉祥物 `mascot.png`
- 首页主视觉：`hero.png`
