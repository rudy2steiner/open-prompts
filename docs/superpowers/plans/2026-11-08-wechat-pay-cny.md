# 微信支付人民币结算 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为一次性套餐增加固定人民币价格的微信支付 Checkout，同时保留美元银行卡和美元月度订阅。

**Architecture:** 套餐目录同时保存 USD 与可选 CNY 金额，服务端根据白名单支付方式推导实际币种和金额，再把同一组值写入订单与 Stripe Session。前端明确展示两个一次性支付入口；webhook 只信任数据库订单并严格比对 Stripe 的币种与总额。

**Tech Stack:** Next.js 16、TypeScript、React 18、Stripe Checkout、Drizzle ORM、Cloudflare D1、Node test runner + `tsx`。

**Spec:** `docs/superpowers/specs/2026-11-08-wechat-pay-cny-design.md`

## Global Constraints

- 固定汇率为 `1 USD = 7.2 CNY`，确认后的人民币价格固定为 ¥35、¥71、¥143，不运行时换汇。
- 微信支付只适用于一次性套餐；月度订阅保持 USD 银行卡。
- 客户端不得提交或覆盖金额、币种；服务端只从套餐目录推导。
- 本地测试通过后才能部署 Preview；Preview 只打开 live 收银台，不付款。
- Preview 继续复用正式 D1 和独立 webhook；验证记录必须精确清理。
- 新增或修改的项目文档与测试说明使用中文；代码标识和 Stripe 固定字段保留英文。

## Review Focus

- `wechat_pay` 与月度套餐组合必须在创建订单前拒绝，避免遗留无效订单。
- 缺失、未知或非字符串 `paymentMethod` 必须失败关闭；现有调用方显式传 `card`，不依赖模糊默认值。
- CNY 金额和 USD 金额不得交叉写入订单或 Session，尤其是相同套餐 ID 下的两条路径。
- webhook 的金额正确但币种错误、币种正确但金额错误都不得发积分。
- 用户登录提示后继续购买必须保留最初选择的支付方式，不能回退到银行卡。

---

### Task 1: 套餐支付报价与 Checkout 领域模型

**Files:**
- Modify: `src/lib/billing/catalog.ts`
- Modify: `src/lib/billing/checkout.ts`
- Modify: `src/lib/billing/stripe.ts`
- Test: `tests/billing-checkout.test.ts`

**Interfaces:**
- Produces: `PaymentMethod = 'card' | 'wechat_pay'`。
- Produces: `checkoutQuote(plan: PurchasablePlan, paymentMethod: PaymentMethod): { amount: number; currency: 'usd' | 'cny'; paymentMethod: PaymentMethod } | null`。
- Produces: `createCheckout(input: { planId; ownerId; siteUrl; locale?; paymentMethod }, dependencies?)`；非法组合在 `createOrder` 前抛出 `Invalid payment method`。
- Produces: `StripeSessionInput` 包含实际 `currency` 和 `paymentMethod`。
- Produces: Stripe Session metadata 显式写入 `payment_method`，供 webhook 与订单报价交叉校验。

- [ ] **Step 1: 写失败测试，锁定固定人民币报价和非法组合**

在 `tests/billing-checkout.test.ts` 增加断言：三个一次性套餐的 `wechat_pay` 报价分别是 `{ amount: 3500, currency: 'cny' }`、`7100`、`14300`；银行卡仍为现有 USD；月度 `wechat_pay` 返回 `null`。增加 `createCheckout` 用例，断言月度微信支付会 reject 且 `orders`、`sessions` 都保持空数组。

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npx tsx --test tests/billing-checkout.test.ts`

Expected: FAIL，原因是 CNY 报价/`paymentMethod` 接口尚未实现，而不是语法或 fixture 错误。

- [ ] **Step 3: 实现套餐报价和订单实际币种**

在 `src/lib/billing/catalog.ts` 给一次性套餐增加 `cnyAmount`（`3500`、`7100`、`14300`），月度为 `null`，并实现上述 `PaymentMethod` 与 `checkoutQuote`。在 `src/lib/billing/checkout.ts` 使用报价创建订单和 `StripeSessionInput`，把 `PendingOrder.currency` 扩展为 `'usd' | 'cny'`。

- [ ] **Step 4: 写失败测试，锁定 Stripe Session 支付方式参数**

在同一测试文件断言：银行卡 Session 的 `payment_method_types` 为 `['card']` 且无 `wechat_pay` options；微信 Session 为 `['wechat_pay']` 且 `payment_method_options.wechat_pay.client === 'web'`；订阅仍为 `['card']`。

- [ ] **Step 5: 运行测试并确认按预期失败**

Run: `npx tsx --test tests/billing-checkout.test.ts`

Expected: FAIL，现有实现把一次性支付无条件配置为 `card + wechat_pay`。

- [ ] **Step 6: 按 `input.paymentMethod` 生成最小 Stripe 参数**

修改 `stripeCheckoutParams(input: StripeSessionInput): Stripe.Checkout.SessionCreateParams`：`card` 仅发 `['card']`；`wechat_pay` 仅发 `['wechat_pay']` 和 `{ wechat_pay: { client: 'web' } }`；两条路径都把 `input.paymentMethod` 写入 metadata 的 `payment_method`。

- [ ] **Step 7: 运行领域测试**

Run: `npx tsx --test tests/billing-checkout.test.ts`

Expected: PASS，所有 Checkout 用例通过。

- [ ] **Step 8: 提交领域模型**

```bash
git add src/lib/billing/catalog.ts src/lib/billing/checkout.ts src/lib/billing/stripe.ts tests/billing-checkout.test.ts
git commit -m "feat: add CNY WeChat checkout quotes"
```

### Task 2: Checkout API 与定价页双入口

**Files:**
- Modify: `src/app/api/checkout/route.ts`
- Modify: `src/components/billing/PricingPlans.tsx`
- Modify: `src/components/billing/BillingSummary.tsx`
- Modify: `messages/en.json`
- Modify: `messages/zh.json`
- Modify: `messages/ja.json`
- Modify: `messages/ko.json`
- Modify: `messages/fr.json`
- Modify: `messages/de.json`
- Modify: `messages/es.json`
- Modify: `messages/pt.json`
- Test: `tests/billing-checkout.test.ts`
- Test: `tests/expanded-locales.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `PaymentMethod`、`checkoutQuote` 和 `createCheckout(...paymentMethod)`。
- Produces: `parsePaymentMethod(value: unknown): PaymentMethod | null` 纯函数位于 `src/lib/billing/checkout.ts`，API 路由只消费结果。
- Produces: `POST /api/checkout` 请求体 `{ planId, locale, paymentMethod }`；非法支付方式返回 `400 { error: 'invalid_payment_method' }`。
- Produces: `PricingPlans` 的 pending state 同时保存 `planId` 与 `paymentMethod`，登录/匿名分支原样转交。

- [ ] **Step 1: 写失败测试，覆盖不可信支付方式输入**

在 `tests/billing-checkout.test.ts` 为 `src/lib/billing/checkout.ts` 导出的纯解析函数 `parsePaymentMethod(value: unknown): PaymentMethod | null` 增加表格用例：仅 `'card'`、`'wechat_pay'` 有效；`undefined`、空串、对象、`'alipay'` 均为 `null`。断言月度微信组合在订单创建前失败。纯函数与 Next 路由分离，避免单元测试加载鉴权和运行时依赖。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test tests/billing-checkout.test.ts`

Expected: FAIL，`parsePaymentMethod` 尚不存在。

- [ ] **Step 3: 实现 API 白名单和 400 响应**

在 `src/lib/billing/checkout.ts` 实现 `parsePaymentMethod`，由 `src/app/api/checkout/route.ts` 调用；路由先校验字段，再调用 `createCheckout`，由领域层在创建订单前拒绝非法套餐组合。所有现有调用方改为显式发送 `card`，不引入隐式默认。

- [ ] **Step 4: 实现一次性双按钮并保留 pending 选择**

在 `PricingPlans.tsx`：一次性套餐显示现有美元银行卡按钮和 `pricingPage.wechatPay`（参数 `price` 为 `35`、`71`、`143`）按钮；月度只显示订阅按钮。把 `busyId`/`pendingId` 调整为能区分支付方式的状态，匿名继续时使用原选择；`queuePricingClick` 等购买埋点记录实际支付方式、币种和展示价格，避免把 CNY 微信点击记成 USD 银行卡。`BillingSummary.tsx` 的现有快捷购买显式传 `card`，不新增微信快捷按钮。

- [ ] **Step 5: 增加八语言文案并验证消息树**

在八个 `messages/*.json` 的 `OpenPrompts.pricingPage` 增加 `wechatPay`，中文为 `微信支付 ¥{price}`；其他语言自然表达并保留 `{price}`。运行：

`npx tsx --test tests/expanded-locales.test.ts tests/billing-checkout.test.ts`

Expected: PASS，八语言 ICU 与 Checkout 测试全部通过。

- [ ] **Step 6: 提交 API 与 UI**

```bash
git add src/app/api/checkout/route.ts src/components/billing/PricingPlans.tsx src/components/billing/BillingSummary.tsx messages/*.json tests/billing-checkout.test.ts tests/expanded-locales.test.ts
git commit -m "feat: expose WeChat Pay checkout option"
```

### Task 3: 多币种 webhook 严格结算

**Files:**
- Modify: `src/lib/billing/webhook.ts`
- Test: `tests/billing-webhook.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `checkoutQuote(plan, paymentMethod)`。
- Consumes: 订单中的可信 `amount`、`currency`；Stripe Session metadata 的 `payment_method` 仅用于确认所选报价类型。
- Produces: USD 和 CNY 一次性订单均可在严格匹配时调用现有 `addPurchased`，积分数量不变。

- [ ] **Step 1: 写失败测试，覆盖 CNY 成功和双向不匹配**

在 `tests/billing-webhook.test.ts` 增加：CNY 订单 `amount: 3500, currency: 'cny'` 配合相同 Session 可发 245 积分；同订单收到 `3499 cny`、`3500 usd`、缺失/错误 `payment_method` 时均 `ignored`；USD 现有成功用例的 metadata 增加 `payment_method: 'card'`。

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npx tsx --test tests/billing-webhook.test.ts`

Expected: FAIL，现有逻辑要求 `order.amount === plan.amount`，会拒绝合法 CNY 订单。

- [ ] **Step 3: 按订单与目录报价验证事件**

修改 `settleCheckout`：解析 metadata 支付方式，取得 Task 1 报价；要求订单的 product/credits/amount/currency 与报价一致，同时要求 Session 的 paid 状态、amount/currency 与订单一致。任何一项不符均 `ignored` 且不 claim/发积分。

- [ ] **Step 4: 运行 webhook 与 Checkout 测试**

Run: `npx tsx --test tests/billing-webhook.test.ts tests/billing-checkout.test.ts`

Expected: PASS，USD、CNY、重复和不匹配用例全部通过。

- [ ] **Step 5: 提交 webhook 结算**

```bash
git add src/lib/billing/webhook.ts tests/billing-webhook.test.ts
git commit -m "feat: settle Stripe orders in USD or CNY"
```

### Task 4: 本地端到端、Preview 与发布门禁

**Files:**
- Modify if required by verified defects only: files covered by Tasks 1–3
- Verify: `wrangler.jsonc`
- Verify: Cloudflare Preview secrets and Stripe Dashboard endpoint

**Interfaces:**
- Consumes: Tasks 1–3 完整支付流。
- Produces: 本地 test-mode 三条支付结论、Preview live-mode 三个可打开收银台结论、精确清理结果。

- [ ] **Step 1: 运行全量自动化与构建**

Run: `npx tsx --test tests/*.test.ts`

Expected: `fail 0`。

Run: `npm run build`

Expected: exit 0，TypeScript 和 production build 成功。现有非阻断 deprecation warning 记录到交付说明，不扩大范围修复。

- [ ] **Step 2: 启动本地 OpenNext Preview 与 Stripe CLI webhook 转发**

运行 `npx opennextjs-cloudflare build && npx opennextjs-cloudflare preview --env preview`，并把 Stripe 测试模式 webhook 转发到 `http://localhost:8787/api/stripe/webhook`。确认 `.dev.vars` 使用 `sk_test_` 和本次 CLI 返回的 `whsec_`。

- [ ] **Step 3: 完成本地三条端到端付款**

使用 Chrome MCP：完成 USD 银行卡一次性、CNY 微信支付一次性、USD 银行卡月度订阅；核对收银台币种/支付方式、订单 paid 状态、积分池与幂等 webhook。微信支付使用 Stripe 官方测试流程，不使用真实资金。

- [ ] **Step 4: 部署 Preview**

确认本地三条全部通过后运行 `npm run preview:deploy`。若 Wrangler OAuth 报错，只重试 deploy；持续失败则刷新登录，不得绕过到正式环境。记录 Preview URL 与 Version ID。

- [ ] **Step 5: Preview 只打开 live 收银台**

使用 Chrome MCP 分别打开 USD 一次性、CNY 微信一次性、USD 月度订阅，确认均为 `checkout.stripe.com` 且 Session ID 为 `cs_live_`；CNY 页面显示微信支付，月度页面不显示微信支付。不要填写或提交付款。

- [ ] **Step 6: 清理 Preview 验证数据**

通过 live Stripe API 精确过期本次三个 open Checkout Session；按记录的 `order_no` 从正式 D1 删除且仅删除 `status = 'created'` 的三条订单。查询确认剩余数为 0，不删除任何其他记录。

- [ ] **Step 7: 最终验证与交付检查**

重新运行 `npx tsx --test tests/*.test.ts`、`npm run build`、`git diff --check`、`npx wrangler d1 migrations list open-prompts --remote --env preview`、`npx wrangler secret list --env preview`。确认 Stripe Dashboard 中微信支付已启用、独立 Preview webhook URL 正确且五个事件仍启用。

- [ ] **Step 8: 提交验证所需的最后修复（如有）**

若 Step 1–7 暴露代码缺陷，必须为每个缺陷先补失败测试再修复，并单独提交；没有代码修复则不创建空提交。
