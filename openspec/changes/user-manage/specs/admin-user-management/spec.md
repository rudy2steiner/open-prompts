## ADDED Requirements

### Requirement: 管理员可分页列出平台用户

系统 MUST 提供管理员专用接口，从 `p_users` 返回分页用户列表；默认按 `created_at` 降序。

#### Scenario: 管理员获取用户列表

- **WHEN** 已登录管理员请求 `GET /api/admin/users` 且会话有效
- **THEN** 系统返回 `{ items, total, hasMore, stats }`，每项至少包含 `id`、`email`、`name`、`image`、`createdAt`、`isEnvAdmin`、`providers`（字符串数组，来自 `p_accounts`）

#### Scenario: 非管理员被拒绝

- **WHEN** 非管理员已登录用户请求 `GET /api/admin/users`
- **THEN** 系统返回 HTTP 403

#### Scenario: 分页参数

- **WHEN** 管理员请求 `GET /api/admin/users?limit=20&offset=0`
- **THEN** 系统最多返回 20 条记录，并正确设置 `total` 与 `hasMore`

#### Scenario: 超过上限的 limit

- **WHEN** 管理员请求 `GET /api/admin/users?limit=500`
- **THEN** 系统将 `limit` 截断为配置上限（默认 100）后再查询

### Requirement: 管理员可按邮箱或姓名搜索用户

系统 MUST 支持列表接口可选参数 `q`，对 `email` 与 `name` 做不区分大小写的部分匹配。

#### Scenario: 按邮箱片段搜索

- **WHEN** 管理员请求 `GET /api/admin/users?q=example`
- **THEN** 系统仅返回 `email` 或 `name` 包含 `example`（不区分大小写）的用户

### Requirement: 管理员可查看用户详情

系统 MUST 提供 `GET /api/admin/users/:id` 返回扩展信息。

#### Scenario: 查看存在的用户

- **WHEN** 管理员请求 `GET /api/admin/users/:id` 且 id 存在
- **THEN** 系统返回资料字段、`isEnvAdmin`、OAuth 提供商名称列表（来自 `p_accounts.provider`）、`templateCount`（`p_prompts.submitted_by = id` 的数量）

#### Scenario: 用户不存在

- **WHEN** 管理员请求不存在的 `:id`
- **THEN** 系统返回 HTTP 404

### Requirement: 用户管理 API 为只读

系统 MUST NOT 在本能力下提供修改用户状态的写接口（如 `PATCH`、`DELETE` `/api/admin/users/:id`）。

#### Scenario: 写操作不可用

- **WHEN** 管理员对 `/api/admin/users/:id` 发送 `PATCH` 或 `DELETE`
- **THEN** 系统返回 HTTP 405 或该路由不存在

### Requirement: 账户中心提供管理员 Users 面板

系统 MUST 在 `/account` 为管理员展示 **Users** 侧边栏入口与对应面板（面板 id：`users`）。

#### Scenario: 管理员打开 Users 面板

- **WHEN** 管理员在账户中心选择 Users 面板
- **THEN** UI 展示可搜索、可分页的只读用户表格；列含 User、Role、Provider、Joined（注册时间含分钟，随 locale 格式化）；无禁用/启用操作

#### Scenario: 行点击展示详情

- **WHEN** 管理员点击某一用户行
- **THEN** UI 通过 `GET /api/admin/users/:id` 展示详情（抽屉或模态，含提供商与模板数）

#### Scenario: 非管理员不可访问 Users 面板

- **WHEN** 非管理员加载 `/account` 或通过 `?panel=users` 访问
- **THEN** 侧边栏不显示 Users 入口，且面板状态强制为 `overview`（或等价默认面板）

### Requirement: 管理员可查看用户平台指标

系统 MUST 在 `GET /api/admin/users` 响应中返回全平台 `stats` 对象，且不受列表搜索参数 `q` 影响。

#### Scenario: 获取用户统计

- **WHEN** 管理员请求 `GET /api/admin/users`
- **THEN** 响应包含 `stats.totalUsers`（`p_users` 总行数）、`stats.activeToday`（`last_active_at` 落在当前 UTC 自然日的用户数）、`stats.newToday`（`created_at` 落在当前 UTC 自然日的用户数）

#### Scenario: 记录用户活跃

- **WHEN** 已登录用户成功登录或调用需 `requireAuthSession` 的 API，且该用户当日尚未写入活跃时间
- **THEN** 系统更新 `p_users.last_active_at` 为当前时间（同一 UTC 自然日不重复写入）

### Requirement: Users 面板展示监控指标

系统 MUST 在 Users 面板表格上方展示用户总数、今日活跃、今日新增三项指标。

#### Scenario: 管理员打开 Users 面板

- **WHEN** 管理员进入 Users 面板并成功加载列表
- **THEN** UI 展示与 `stats` 对应的三个指标卡，并保留下方可搜索、可分页的用户表格

### Requirement: 管理员可查看用户与 Prompt 日趋势

系统 MUST 在 `stats.dailyTrend` 中返回近 7 个 UTC 自然日（含当日）的每日新增序列，并在 Users 面板以柱状图展示。

#### Scenario: 获取日趋势数据

- **WHEN** 管理员请求 `GET /api/admin/users`
- **THEN** `stats.dailyTrend` 为长度 7 的数组，每项含 `date`（`YYYY-MM-DD`）、`newUsers`、`newPrompts`；无数据的日期计数为 `0`

#### Scenario: 面板展示双趋势图

- **WHEN** 管理员打开 Users 面板且 `dailyTrend` 已加载
- **THEN** UI 在指标卡下方并排展示「用户新增」与「Prompt 新增」两个 7 日柱状图，柱顶或 tooltip 可查看当日精确数量

### Requirement: Users 面板支持多语言

系统 MUST 为 Users 面板提供 en / zh / ja 文案，键名位于 `messages/*.json`（如 `accountPage.adminUsers.*`）。

#### Scenario: 中文或日文 locale 下展示面板

- **WHEN** 管理员在 `/zh/account` 或 `/ja/account` 打开 Users 面板
- **THEN** 表头、空状态与错误提示使用当前 locale 文案
