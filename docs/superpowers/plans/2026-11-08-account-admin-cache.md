# 用户与管理后台缓存及异步刷新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除已登录 Header 的登录按钮闪烁，并让用户 Billing 与管理后台优先显示最近数据、在后台异步刷新。

**Architecture:** 浏览器只持久化最小账户展示快照，完整后台列表只保存在当前页面内存；服务端为管理员只读查询提供短 TTL stale-while-revalidate 缓存。所有接口先鉴权再读缓存，写操作成功后按命名空间失效，数据库继续作为唯一事实来源。

**Tech Stack:** Next.js 16.4 App Router、React 18、NextAuth 4、TypeScript、Node Test Runner、Drizzle/D1。

**Spec:** `docs/superpowers/specs/2026-11-08-account-admin-cache-design.md`

## Global Constraints

- 不新增 Redis、SWR/React Query 等依赖。
- Header 快照只写 `sessionStorage`，缓存键为 `open-prompts:account:v1`。
- Header 快照只用于视觉连续性，不得提前授予管理员能力。
- 管理汇总 fresh 30 秒、stale 5 分钟；管理列表 fresh 15 秒、stale 2 分钟。
- 用户 Billing 完整数据和管理列表不得写入 `localStorage` 或 `sessionStorage`。
- 敏感 API 响应继续使用 `private, no-store`，不得进入公共 CDN 缓存。
- 登出或账户 ID 变化时清除当前账户的客户端数据。
- 写操作完成后必须失效相关服务端缓存并触发当前视图异步刷新。
- 遵循 TDD：每个任务先看到新增测试因缺失行为而失败，再写最小实现。

## Review Focus

- `sessionStorage` 中存在损坏、旧版本或超时快照时必须忽略并清除；Task 1 覆盖。
- 缓存管理员身份但真实 session 尚在 loading 时不得显示管理入口；Task 2 覆盖。
- 两个并发 stale 请求只能触发一次后台刷新，刷新失败仍返回旧值；Task 3 覆盖。
- 快速切换 Tab/筛选时迟到请求不得覆盖新查询；Task 5、Task 6 覆盖。
- 登出后登录另一个账号不得复用前一账号的 Header 或 Billing 数据；Task 2、Task 5 覆盖。

---

### Task 1: 浏览器账户展示快照

**Files:**
- Create: `src/lib/auth/account-snapshot.ts`
- Create: `tests/account-snapshot.test.ts`

**Interfaces:**
- Consumes: NextAuth `Session['user']` 字段。
- Produces: `AccountDisplaySnapshot`；`readAccountSnapshot(storage, now?)`；`writeAccountSnapshot(storage, snapshot)`；`clearAccountSnapshot(storage)`；常量 `ACCOUNT_SNAPSHOT_KEY`。

- [ ] **Step 1: 写失败测试**

  在 `tests/account-snapshot.test.ts` 覆盖：合法快照往返；损坏 JSON、错误版本、缺少 `userId`、未来时间和超过 12 小时的快照返回 `null` 并删除；`clearAccountSnapshot` 删除键。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/account-snapshot.test.ts`

  Expected: FAIL，原因是 `src/lib/auth/account-snapshot.ts` 尚不存在。

- [ ] **Step 3: 实现最小快照模块**

  `AccountDisplaySnapshot` 固定字段为 `version: 1`、`userId`、`name`、`email`、`image`、`isAdmin`、`balance`、`updatedAt`；读取函数接受 `Pick<Storage, 'getItem' | 'removeItem'>`，写入函数接受 `Pick<Storage, 'setItem'>`，TTL 为 12 小时。

- [ ] **Step 4: 运行测试确认通过**

  Run: `npx tsx --test tests/account-snapshot.test.ts`

  Expected: PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add src/lib/auth/account-snapshot.ts tests/account-snapshot.test.ts
  git commit -m "feat: cache account display snapshot"
  ```

### Task 2: Header 使用缓存用户并后台校验

**Files:**
- Modify: `src/components/open-prompts/OpenPromptsSiteHeader.tsx`
- Modify: `tests/sign-in-flow.test.tsx`

**Interfaces:**
- Consumes: Task 1 的快照读写接口、NextAuth `useSession()`。
- Produces: Header 展示状态：`loading + cached user` 显示头像，`loading + no cache` 显示等宽占位，真实 unauthenticated 显示登录按钮。

- [ ] **Step 1: 写失败测试**

  在 `tests/sign-in-flow.test.tsx` 增加可注入展示状态的 Header 行为测试：缓存用户且 session loading 时 HTML 包含头像容器、不包含 `Sign in`、不包含 Admin；无缓存 loading 时包含占位且不包含 `Sign in`；真实 unauthenticated 时包含 `Sign in`；账户 ID 改变及登出会清除旧快照。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/sign-in-flow.test.tsx`

  Expected: FAIL，缓存展示状态尚未实现。

- [ ] **Step 3: 实现 Header 状态合并**

  在组件内用 `useLayoutEffect` 读取快照；真实 session 优先于快照；仅当 `status === 'authenticated'` 时计算 `isAdmin` 和管理菜单；余额请求成功后同步快照余额；明确 unauthenticated 和 `signOut` 前清除快照。保持右侧区域宽度稳定。

- [ ] **Step 4: 运行测试确认通过**

  Run: `npx tsx --test tests/sign-in-flow.test.tsx tests/account-snapshot.test.ts`

  Expected: PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add src/components/open-prompts/OpenPromptsSiteHeader.tsx tests/sign-in-flow.test.tsx
  git commit -m "fix: keep account header stable during session refresh"
  ```

### Task 3: 通用服务端 stale-while-revalidate 缓存

**Files:**
- Create: `src/lib/cache/stale-while-revalidate.ts`
- Create: `tests/stale-while-revalidate-cache.test.ts`

**Interfaces:**
- Produces: `createStaleCache<T>({ freshMs, staleMs, now? })`，实例方法 `get(key, loader)`、`invalidate(key)`、`invalidatePrefix(prefix)`、`clear()`；`get` 返回 `Promise<T>`。

- [ ] **Step 1: 写失败测试**

  覆盖 cache miss 等待加载、fresh 直接返回、stale 立即返回旧值并后台刷新、并发刷新去重、刷新失败保留旧值、超过 stale 窗口等待加载、前缀失效只删除匹配项。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/stale-while-revalidate-cache.test.ts`

  Expected: FAIL，缓存模块尚不存在。

- [ ] **Step 3: 实现最小通用缓存**

  每个实例使用私有 `Map`；缓存项保存 `value`、`freshUntil`、`staleUntil` 和可选 `refreshing`；后台 Promise 必须捕获异常并在 `finally` 清除 `refreshing`。

- [ ] **Step 4: 运行测试确认通过**

  Run: `npx tsx --test tests/stale-while-revalidate-cache.test.ts`

  Expected: PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add src/lib/cache/stale-while-revalidate.ts tests/stale-while-revalidate-cache.test.ts
  git commit -m "feat: add stale while revalidate cache"
  ```

### Task 4: 管理查询接入服务端缓存与失效

**Files:**
- Create: `src/lib/admin/cache.ts`
- Modify: `src/lib/admin/monitor.ts`
- Modify: `src/app/[locale]/admin/[[...panel]]/page.tsx`
- Modify: `src/app/[locale]/api/admin/users/[id]/route.ts`
- Modify: `src/app/[locale]/api/admin/templates/[id]/route.ts`
- Modify: `src/app/[locale]/api/admin/templates/bulk/route.ts`
- Modify: `src/app/api/stripe/webhook/route.ts`
- Modify: `src/app/[locale]/api/generations/[id]/route.ts`
- Test: `tests/admin-monitor.test.ts`
- Test: `tests/admin-cache-invalidation.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `createStaleCache`。
- Produces: `cachedAdminSummary(loader)`、`cachedAdminPage(key, loader)`、`adminQueryKey(input)`、`invalidateAdminCache(namespace?)`。

- [ ] **Step 1: 写失败测试**

  在 `tests/admin-monitor.test.ts` 断言汇总使用 30 秒/5 分钟实例，列表使用 15 秒/2 分钟实例；键包含 tab、page、pageSize、query、status、trendDays。在 `tests/admin-cache-invalidation.test.ts` 断言额度调整失效 summary/users，模板写操作失效 summary/templates/review，且失效调用只发生在数据库写入成功之后。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/admin-monitor.test.ts tests/admin-cache-invalidation.test.ts`

  Expected: FAIL，管理缓存接口尚不存在或路由未失效缓存。

- [ ] **Step 3: 实现管理缓存边界**

  `src/lib/admin/cache.ts` 持有两个缓存实例；页面必须先完成 `getAuthSession` 和管理员校验，再调用缓存包装器。键使用稳定的 `URLSearchParams` 序列化全部查询条件。

- [ ] **Step 4: 接入写操作失效**

  用户额度写成功后调用 `invalidateAdminCache('users')` 和 summary 失效；模板单项与批量写成功后调用 templates、review 和 summary 失效；支付结算成功后失效 orders、users、summary；生成任务进入终态或退款成功后失效 generations、users、summary。不得在数据库写入失败、无效 webhook 或仍在处理中时失效。

- [ ] **Step 5: 运行测试确认通过**

  Run: `npx tsx --test tests/admin-monitor.test.ts tests/admin-cache-invalidation.test.ts tests/admin-access.test.ts`

  Expected: PASS。

- [ ] **Step 6: 提交**

  ```bash
  git add src/lib/admin/cache.ts src/lib/admin/monitor.ts 'src/app/[locale]/admin/[[...panel]]/page.tsx' 'src/app/[locale]/api/admin/users/[id]/route.ts' 'src/app/[locale]/api/admin/templates/[id]/route.ts' 'src/app/[locale]/api/admin/templates/bulk/route.ts' src/app/api/stripe/webhook/route.ts 'src/app/[locale]/api/generations/[id]/route.ts' tests/admin-monitor.test.ts tests/admin-cache-invalidation.test.ts
  git commit -m "feat: cache admin read models"
  ```

### Task 5: 用户 Billing 旧值优先与异步刷新

**Files:**
- Create: `src/lib/billing/client-cache.ts`
- Create: `src/app/[locale]/api/account/billing/route.ts`
- Modify: `src/components/billing/AccountBilling.tsx`
- Modify: `src/app/[locale]/billing/page.tsx`
- Create: `tests/account-billing-cache.test.tsx`

**Interfaces:**
- Produces: `billingCacheKey(userId, tab, page)`；`createBillingPageCache()` 的 `read`、`write`、`clearForUser`；GET `/[locale]/api/account/billing?tab=&page=` 返回 `loadUserBilling` 结果及 `cache-control: private, no-store`。

- [ ] **Step 1: 写失败测试**

  覆盖缓存键账户隔离；服务端 `initialData` 立即渲染；切回访问过的 Tab 立即显示旧数据并发起请求；刷新期间保留旧表格；有缓存的刷新失败保留内容并显示非阻断提示；迟到请求不覆盖当前 Tab；用户 ID 变化清空旧缓存。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/account-billing-cache.test.tsx`

  Expected: FAIL，客户端 Billing 缓存和刷新接口尚不存在。

- [ ] **Step 3: 实现 Billing API**

  API 必须调用 `getAuthSession()`，无用户返回 401；只接受 `userBillingTab` 和 `userBillingPage` 规范化后的参数；调用 `loadUserBilling(session.user.id, tab, page)`；响应禁止共享缓存。

- [ ] **Step 4: 实现客户端旧值优先视图**

  `AccountBilling` 接收额外 `userId`；首次把服务端 props 写入内存缓存；Tab 使用客户端按钮更新查询，命中缓存后立即渲染并 fetch；每次请求用递增 generation token 或 `AbortController` 拒绝迟到结果；不把完整数据写入 Web Storage。

- [ ] **Step 5: 运行测试确认通过**

  Run: `npx tsx --test tests/account-billing-cache.test.tsx tests/billing-account.test.ts`

  Expected: PASS。

- [ ] **Step 6: 提交**

  ```bash
  git add src/lib/billing/client-cache.ts 'src/app/[locale]/api/account/billing/route.ts' src/components/billing/AccountBilling.tsx 'src/app/[locale]/billing/page.tsx' tests/account-billing-cache.test.tsx
  git commit -m "feat: refresh billing data in background"
  ```

### Task 6: 管理监控 Tab 旧值优先与异步刷新

**Files:**
- Create: `src/app/[locale]/api/admin/monitor/route.ts`
- Create: `src/components/admin/AdminMonitorClient.tsx`
- Modify: `src/components/admin/AdminMonitor.tsx`
- Modify: `src/app/[locale]/admin/[[...panel]]/page.tsx`
- Create: `tests/admin-monitor-client.test.tsx`

**Interfaces:**
- Consumes: Task 4 的缓存查询接口。
- Produces: GET `/[locale]/api/admin/monitor?tab=&page=`；`AdminMonitorClient` 页面生命周期缓存，键为 `tab:page`。

- [ ] **Step 1: 写失败测试**

  覆盖 API 未登录/非管理员拒绝、合法管理员返回私有 no-store 数据；首次使用服务端 props；切换已访问 Tab 立即显示缓存；刷新期间不清空表格；迟到响应不覆盖新 Tab；刷新失败保留旧表格。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/admin-monitor-client.test.tsx`

  Expected: FAIL，管理监控 API 和客户端尚不存在。

- [ ] **Step 3: 实现管理监控 API**

  先执行 `getAuthSession()`、`isSessionAdmin()` 和 `adminAccess()`，再规范化 tab/page，并通过 Task 4 缓存加载 summary 与当前列表；响应头为 `private, no-store`。

- [ ] **Step 4: 实现客户端监控视图**

  保留 `AdminMonitor` 的纯展示职责，将 Tab 状态、页面缓存、请求 generation token 和更新提示放入 `AdminMonitorClient`；服务端页面把当前结果作为 initial props。浏览器 URL 使用 `history.replaceState` 或 `router.replace` 同步，但不得触发整页空白导航。

- [ ] **Step 5: 运行测试确认通过**

  Run: `npx tsx --test tests/admin-monitor-client.test.tsx tests/admin-monitor.test.ts`

  Expected: PASS。

- [ ] **Step 6: 提交**

  ```bash
  git add 'src/app/[locale]/api/admin/monitor/route.ts' src/components/admin/AdminMonitorClient.tsx src/components/admin/AdminMonitor.tsx 'src/app/[locale]/admin/[[...panel]]/page.tsx' tests/admin-monitor-client.test.tsx
  git commit -m "feat: refresh admin monitor in background"
  ```

### Task 7: 模板与用户管理列表保留旧数据刷新

**Files:**
- Modify: `src/app/[locale]/account/PageComponent.tsx`
- Modify: `tests/account-template-panel.test.ts`

**Interfaces:**
- Consumes: 现有 `loadMyTemplates`、`loadAdminTemplates`、`loadAdminUsers`。
- Produces: 每类查询独立的页面生命周期 `Map` 缓存和统一的“有旧值时不清空”错误行为。

- [ ] **Step 1: 写失败测试**

  在 `tests/account-template-panel.test.ts` 覆盖：键包含搜索、状态、页码、页大小和趋势天数；命中缓存先应用旧值再 fetch；模板和用户请求使用独立 generation token；刷新失败且已有数据时不调用清空 setter；无数据失败时仍展示完整错误。

- [ ] **Step 2: 运行测试确认正确失败**

  Run: `npx tsx --test tests/account-template-panel.test.ts`

  Expected: FAIL，现有 loader 只缓存预取下一页，且用户列表失败会清空数据。

- [ ] **Step 3: 实现三个独立查询缓存**

  在组件生命周期创建 `myTemplatesCacheRef`、`adminTemplatesCacheRef`、`adminUsersCacheRef`；缓存值保存数据和 `updatedAt`，不写 Web Storage；每次刷新保留当前值，只有当前查询键没有缓存时才显示完整 loading/错误态。

- [ ] **Step 4: 运行测试确认通过**

  Run: `npx tsx --test tests/account-template-panel.test.ts tests/create-workspace.test.ts`

  Expected: PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add 'src/app/[locale]/account/PageComponent.tsx' tests/account-template-panel.test.ts
  git commit -m "feat: retain account list data while refreshing"
  ```

### Task 8: 全量验证与真实导航验收

**Files:**
- Modify only if verification exposes a defect in the preceding tasks.

**Interfaces:**
- Consumes: Tasks 1–7 全部行为。
- Produces: 可交付的完整实现与验证记录。

- [ ] **Step 1: 运行完整自动化测试**

  Run: `npx tsx --test tests/*.test.ts tests/*.test.tsx`

  Expected: 全部 PASS，不能忽略已有或新增失败。

- [ ] **Step 2: 运行类型和差异检查**

  Run: `npx tsc --noEmit && git diff --check`

  Expected: 两项均成功。

- [ ] **Step 3: 运行生产构建**

  Run: `npm run build`

  Expected: Next.js production build 成功。

- [ ] **Step 4: 使用 Chrome 验收真实交互**

  按项目 `AGENTS.md` 使用 chrome-mcp：登录后在首页、Billing、Admin 间切换，确认 Header 不出现 `Sign in`；切换 Billing 与 Admin Tab，确认旧表格立即存在且后台刷新；模拟一次失败请求确认旧数据不消失；登出后确认头像和账户缓存消失。

- [ ] **Step 5: 检查安全边界**

  以未登录和普通用户分别请求 Billing/Admin 新 API，确认返回 401/404 或项目既有拒绝语义；检查响应头无公共缓存；检查 `sessionStorage` 仅存在账户展示快照，不含订单或管理列表。

- [ ] **Step 6: 最终提交**

  ```bash
  git add <only-files-fixed-during-verification>
  git commit -m "fix: complete account cache verification"
  ```

  如果验证未产生修复，不创建空提交。
