> **流程**：先评审 `design.md`，再按序 apply。Design 未通过前勿勾选下方任务。

## 1. 数据访问层

- [x] 1.1 新建 `src/lib/users/admin-user-record.ts`：`listUsers`、`getUserById`、`countTemplatesByUser`
- [x] 1.2 列表支持 `q`（email/name 模糊）、`limit`（默认 20，上限 100）、`offset`，返回 `{ items, total, hasMore }`
- [x] 1.3 列表项批量附带 `providers[]`（`p_accounts` `inArray` 查询）
- [x] 1.4 实现 `getAdminUserStats`（`totalUsers`、`activeToday`、`newToday`，UTC 自然日）

## 2. Schema 与活跃追踪

- [x] 2.1 Migration：`p_users.last_active_at` + 索引（见 design 数据模型）
- [x] 2.2 实现 `src/lib/users/touch-user-activity.ts`（UTC 日最多写一次）
- [x] 2.3 挂钩：`requireAuthSession` + JWT 登录回调

## 3. 管理员用户 API（只读）

- [x] 3.1 实现 `GET /api/admin/users`（管理员守卫、列表 + `stats`）
- [x] 3.2 实现 `GET /api/admin/users/[id]`（详情 + `providers` + `templateCount` + `isEnvAdmin`）
- [x] 3.3 确认 `next.config.mjs` 中 `/api/admin/:path*` 重写已覆盖新路由

## 4. 账户中心 UI

- [x] 4.1 扩展 `Panel` 类型，新增 `users`；侧边栏增加 Users 导航（仅 `isAdmin`）
- [x] 4.2 在 `panelFromSearchParam` 中对 `users` 与 `admin` 同样校验 `isAdmin`
- [x] 4.3 指标卡：用户总数 / 今日活跃 / 今日新增（`stats`，见 design UI）
- [x] 4.4 用户表格：搜索、分页、`isEnvAdmin` 徽章、Provider 列、Joined（含分钟）
- [x] 4.5 行点击详情模态（OAuth 提供商、模板数、Joined 同格式）
- [x] 4.6 loading / empty / error 状态与 Moderation 面板一致

## 5. i18n

- [x] 5.1 在 `messages/en.json` 增加 `accountPage.adminUsers.*`（含 metrics、provider、joined 相关键）
- [x] 5.2 同步至 `messages/zh.json`、`messages/ja.json`

## 6. 验证

- [x] 6.1 手动：管理员列表、搜索、指标、查看详情；非管理员 API 返回 403
- [x] 6.2 手动：非管理员无法通过 `?panel=users` 打开 Users 面板
- [x] 6.3 运行 `npm run build`，修复 TypeScript 错误

## 7. 日趋势（design §9）

- [x] 7.1 `getAdminUserStats` 扩展 `dailyTrend`（7 日 UTC，`newUsers` + `newPrompts`）
- [x] 7.2 Users 面板双柱状图 UI + `account-page.css`
- [x] 7.3 i18n：`trendUsersTitle`、`trendPromptsTitle`、`trendDaysHint`
- [x] 7.4 验证 build
