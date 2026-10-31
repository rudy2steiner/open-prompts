## 背景与动机

Open Prompts 账户中心已有管理员 **模板审核队列**，但运营无法查看 **已注册用户**（GitHub / Google OAuth 与邮箱密码登录）。缺少用户目录时，难以处理客服查询、统计贡献或排查问题。本变更交付 Phase 2 任务 **2.12** 中的 **用户目录（只读）** 切片，不等待完整管理后台（举报、收入、审计日志等）。

## 变更内容

- 在账户中心侧边栏新增管理员专用 **Users** 面板（与现有 **Moderation** 审核面板并列）
- 新增管理员 API：分页 **列表**、**搜索**、**详情**（`p_users`，含 OAuth 提供商与模板数量）
- Users 面板顶部展示 **用户总数**、**今日活跃（DAU）**、**今日新增** 监控指标（UTC 自然日），以及 **折线图日趋势**（1 周 / 1 月 / 3 月可选，默认 1 月）
- 列表展示：用户摘要、角色、登录方式（Provider）、注册时间（含分钟）；是否属于 `ADMIN_EMAIL` 管理员（只读标识）
- 在 `messages/en.json`、`messages/zh.json`、`messages/ja.json` 增加面板相关 i18n 键（具体文案不在 SDD 中展开）

## Capabilities

### New Capabilities

- `admin-user-management`：管理员用户列表、搜索、分页、详情（只读）；平台指标与日趋势（用户 / Prompt 新增）

### Modified Capabilities

<!-- 无 — `openspec/specs/` 下暂无已归档主规范 -->

## 影响范围

- **API**：`src/app/[locale]/api/admin/users/`（`GET` 列表含 `stats`、`GET` 详情）
- **UI**：`src/app/[locale]/account/PageComponent.tsx` — 新面板 `users`，指标卡 + 日趋势图 + 表格
- **Lib**：`src/lib/users/admin-user-record.ts`、`src/lib/users/touch-user-activity.ts`
- **DB**：`p_users.last_active_at`（仅用于 DAU，见 migration）
- **i18n**：`messages/*.json` 中 `accountPage.adminUsers.*`

## 非目标

- 用户 **禁用 / 启用**、封禁、登录拦截（后续独立变更）
- 除 `last_active_at` 外的数据库 schema 变更
- 完整管理后台移植（举报、收入、审计日志）— 独立变更
- DB 存储角色 / 审核员 RBAC（任务 2.13）
- 管理员代为重置密码、改邮箱、硬删除用户
- IP 封禁、速率限制配置
