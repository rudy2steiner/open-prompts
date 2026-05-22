# Open Prompts

**Open Prompts** 是一个开源平台，用于发现、分享和复用 **AI 图像提示词模板**。在精选画廊中浏览模板，在专注的生成工作台中打开任意模板，并通过可插拔的图像服务生成图片——全程在同一套工作流中完成。

仓库：[github.com/rudy2steiner/open-prompts](https://github.com/rudy2steiner/open-prompts)

采用 [Apache License, Version 2.0](LICENSE) 许可。

**语言：** [English](./README.md) · 简体中文 · [日本語](./README.ja-JP.md)

---

## 简介

许多团队把提示词散落在文档、帖子或表格里。**Open Prompts** 将其整理为带预览图、标签、模型与可见性（公开、私有或草稿）的 **模板**。用户可以：

- 在 **画廊** 中浏览社区与内置目录中的提示词
- 一键 **生成**：从模板跳转到创作页
- **提交** 新的公开提示词进入审核，或在账户中心创建 **私有** 模板
- 使用 **GitHub**、**Google** 或 **邮箱** 登录（运营人员使用管理员凭据）

应用基于 **Next.js**、**next-intl**（中 / 英 / 日）、**NextAuth** 与 **Postgres**（如 Supabase）。图像生成经服务端 API 路由，当前支持 **Atlas Cloud**（**Replicate** 在规划中，尚未支持），并支持无需付费 API 的 **测试模式**。

---

## 主要功能

| 模块 | 说明 |
|------|------|
| **画廊** | 按模型与标签搜索、筛选；查看详情并一键跳转创作页（提示词已预填）。 |
| **创作工作台** | 模板轮播、提示词编辑器、宽高比 / 质量 / 批量控制、服务商选择与本次会话历史（浏览器 `localStorage`）。 |
| **提交流程** | 单页向导：公开提交进入审核队列，或通过 `?visibility=private` 保存 **私有** 模板。 |
| **账户中心** | 我的模板、管理员 **审核队列**（通过 / 拒绝）、积分与订阅占位 UI。 |
| **登录** | GitHub 与 Google OAuth；为配置的管理员提供邮箱密码登录；无公开自助注册入口。 |
| **管理员审核** | 审核队列覆盖全部模板；状态与可见性与画廊展示规则一致。 |
| **X 导入** | 在提交页粘贴公开推文链接，预填标题、描述、提示词与图片。 |
| **多语言** | 语言路由：`/`（英文）、`/zh`、`/ja`；统一的站点页眉与页脚。 |
| **自托管** | Apache 2.0；通过环境变量配置服务商与数据库；可部署到 Vercel 或任意 Node 主机。 |

---

## 快速开始

### 环境要求

- **Node.js** 18+（推荐 20 LTS）
- **npm**（或 pnpm / yarn）
- **Postgres** 数据库（[Supabase](https://supabase.com) 很合适）
- 可选：**Atlas Cloud** API Key，用于真实出图

### 1. 克隆并安装

```bash
git clone https://github.com/rudy2steiner/open-prompts.git
cd open-prompts
npm install
```

### 2. 环境变量

```bash
cp .env.example .env.local
```

至少填写：

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | Postgres 连接串（迁移与管理员查询建议使用 Supabase **Session pooler**，端口 **5432**） |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | 执行 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_SITE_URL` | 本地与 `NEXTAUTH_URL` 相同，用于 SEO 链接 |

登录与管理员：

| 变量 | 用途 |
|------|------|
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth 应用 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端 |
| `ADMIN_EMAIL` | 管理员邮箱，多个用英文逗号分隔（须与登录邮箱完全一致） |
| `ADMIN_PASSWORD` | 至少 8 位；在启动或管理员登录时同步到数据库 |

图像生成（Atlas Cloud 或测试模式）：

| 变量 | 用途 |
|------|------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud`（Replicate 尚未支持） |
| `ATLASCLOUD_API_KEY` | [Atlas Cloud](https://www.atlascloud.ai) API Key |
| `USE_TEST_MODE` | 设为 `true` 可跳过真实 API 调用 |
| `TEST_IMAGE_URL` | 测试模式下返回的图片 URL |

积分上限与可选 OpenAI 配置见 [`.env.example`](.env.example)。

### 3. 数据库

在 Supabase SQL 编辑器或 `psql` 中执行迁移，然后按需填充数据：

```bash
# 可选：通过 Drizzle 推送 schema
npm run db:push

# 从内置数据集填充画廊模板
npm run seed:prompts

# 确保管理员密码写入数据库（登录失败时使用）
npm run seed:admin
```

迁移 SQL 位于 `supabase/migrations/` 与 `scripts/apply-owner-visibility-migration.sql`。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)（默认端口 **3000**）。

### 5. 生产构建（可选）

```bash
npm run build
npm run start
```

---

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frudy2steiner%2Fopen-prompts&env=NEXTAUTH_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Required%20secrets%20(minimum)&project-name=open-prompts)

### 1. 导入项目

1. 将本仓库推送到 GitHub（或 Fork）。
2. 打开 [Vercel](https://vercel.com) → **Add New Project** → 导入仓库。
3. 框架预设：**Next.js**（默认）。构建命令：`npm run build`。输出目录：默认即可。

### 2. 环境变量

在 **Project → Settings → Environment Variables** 中，为 **Production**（若 Preview 环境也使用 OAuth，则一并配置）设置与 `.env.local` 相同的键。

**部署所需最低配置**

| 变量 | 示例 / 说明 |
|------|-------------|
| `DATABASE_URL` | Supabase pooler URI（端口 **5432**，用户 `postgres.<project-ref>`） |
| `NEXTAUTH_URL` | `https://your-app.vercel.app`（末尾不要加 `/`） |
| `NEXTAUTH_SECRET` | 强随机字符串 |
| `NEXT_PUBLIC_SITE_URL` | 与 `NEXTAUTH_URL` 相同 |
| `ADMIN_EMAIL` | 运营邮箱，多个用逗号分隔 |
| `ADMIN_PASSWORD` | 强密码；若登录失败，在本地对同一数据库执行 `npm run seed:admin` |

**OAuth（推荐）**

| 变量 | 需在服务商注册的回调地址 |
|------|--------------------------|
| `GITHUB_ID` / `GITHUB_SECRET` | `https://your-app.vercel.app/api/auth/callback/github` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `https://your-app.vercel.app/api/auth/callback/google` |

**图像生成**

| 变量 | 说明 |
|------|------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud` |
| `ATLASCLOUD_API_KEY` | 真实出图所需（测试模式除外） |
| 或 `USE_TEST_MODE=true` + `TEST_IMAGE_URL` | 演示环境，无需付费 API |

修改环境变量后请重新部署。

### 3. Supabase 数据库

1. 创建 Supabase 项目，复制 **Session mode** 连接串（端口 **5432**）。
2. 在 SQL 编辑器中按顺序执行 `supabase/migrations/` 下的迁移。
3. 在本地机器上（`DATABASE_URL` 指向该库）执行：

   ```bash
   npm run seed:prompts
   npm run seed:admin
   ```

### 4. 验证

- 打开 `https://your-app.vercel.app` — 画廊应能加载模板。
- 使用 GitHub / Google 或管理员邮箱密码登录。
- 以管理员身份打开 `/account` 使用审核队列。

**说明：** 设置 `ADMIN_EMAIL` 与 `ADMIN_PASSWORD` 后，`instrumentation.ts` 会在服务启动时初始化管理员用户。重置密码请对生产环境的 `DATABASE_URL` 执行 `npm run seed:admin`。

---

## 图像服务商

| 服务商 | 状态 | 配置 |
|--------|------|------|
| **Atlas Cloud** | 已支持 | `ATLASCLOUD_API_KEY`、`ATLASCLOUD_BASE_URL` |
| **Replicate** | 规划中（尚未支持） | `.env.example` 中预留变量，暂勿设置 `DEFAULT_IMAGE_PROVIDER=replicate` |
| **测试模式** | 开发 / 演示 | `USE_TEST_MODE=true`、`TEST_IMAGE_URL` |

在创作页，用户可在浏览器中临时覆盖 API Key（`localStorage`）；生产环境建议使用服务端环境变量。

---

## 技术栈

- [Next.js 14](https://nextjs.org/)（App Router）
- [next-intl](https://next-intl-docs.vercel.app/) · [NextAuth.js](https://next-auth.js.org/)
- [Drizzle ORM](https://orm.drizzle.team/) + Postgres
- [Tailwind CSS](https://tailwindcss.com/) · [daisyUI](https://daisyui.com/)

---

## 参与贡献

欢迎提交 Issue 与 Pull Request。较大改动请先开 Issue 讨论方向。

---

## 结语

**Open Prompts** 希望成为 **可复用图像提示词** 的实用枢纽：在画廊中发现有效提示词，用所选模型生成图片，并将模板回馈社区——同时保留私有草稿与公开上架的审核路径。Fork 本项目，配合 Supabase 部署到 Vercel，接入你偏好的图像 API，在 Apache 2.0 下按团队需求定制工作流。

若本项目对你有帮助，欢迎为仓库点 Star，并在 [GitHub Issues](https://github.com/rudy2steiner/open-prompts/issues) 中反馈建议。
