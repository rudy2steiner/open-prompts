# 微信支付人民币结算设计

## 背景

Open Prompts 当前通过 Stripe Checkout 提供美元一次性购买和美元月度订阅。PhotoMaker Stripe 账户已启用微信支付，但该账户的微信支付仅支持人民币（CNY）和港币（HKD）展示币种；现有 USD Checkout 会被 Stripe 自动移除 `wechat_pay`，因此不能只增加支付方式参数。

本变更为一次性套餐增加独立的人民币微信支付入口，按固定汇率 `1 USD = 7.2 CNY` 换算并抹去小数。月度订阅保持美元银行卡支付。

## 目标

- 一次性套餐同时支持美元银行卡付款和人民币微信支付。
- 微信支付人民币价格固定为 ¥35、¥71、¥143。
- 月度订阅继续使用 USD 银行卡，不向用户展示微信支付。
- 订单、Stripe Session 和 webhook 使用同一组实际币种与金额，避免跨币种误判或错误发放积分。
- 本地完成测试模式端到端验证后，才部署 Preview；Preview 仅验证 live 收银台可打开，不付款。

## 非目标

- 不为月度订阅增加微信支付。
- 不实现动态汇率、Adaptive Pricing 或自动汇率同步。
- 不改变积分数量、套餐层级或美元价格。
- 不在正式域名执行支付测试。

## 定价与支付入口

| 套餐 | 积分 | 银行卡价格 | 微信支付价格 |
| --- | ---: | ---: | ---: |
| 入门 | 245 | $4.90 USD | ¥35 CNY |
| 常用 | 619 | $9.90 USD | ¥71 CNY |
| 更多 | 1499 | $19.90 USD | ¥143 CNY |
| 月度 | 619/月 | $9.90 USD | 不支持 |

一次性套餐的购买区域提供两个明确入口：银行卡入口显示美元价格，微信支付入口显示人民币价格。用户必须在创建 Checkout Session 前明确选择支付方式，避免进入收银台后看到与页面不一致的币种。

## 数据模型与接口

### 套餐目录

一次性套餐在现有 USD `amount` 之外增加 CNY 金额，金额仍使用最小货币单位存储：¥35、¥71、¥143 分别保存为 `3500`、`7100`、`14300`。月度套餐没有 CNY 金额。

### Checkout API

`POST /api/checkout` 增加受控字段 `paymentMethod`：

- `card`：沿用套餐 USD 金额，Stripe `payment_method_types` 仅包含 `card`。
- `wechat_pay`：仅允许一次性套餐，使用套餐 CNY 金额，Stripe `payment_method_types` 仅包含 `wechat_pay`，并设置 `payment_method_options.wechat_pay.client = 'web'`。

服务端不接受客户端提交金额或币种，实际值始终从套餐目录推导。月度套餐若请求 `wechat_pay`，返回 `400 invalid_payment_method`，且不创建订单。

### 订单

`p_orders.amount` 保存实际 Checkout 金额，`p_orders.currency` 保存实际币种（`usd` 或 `cny`）。无需增加新列。现有 USD 订单保持兼容。

### Stripe 元数据

Checkout Session 和订阅元数据继续包含 `order_no`、`plan_id`、`owner_id`，并增加 `payment_method`。webhook 的可信价格来源仍是数据库订单，不信任客户端或仅依赖元数据。

## Webhook 与积分发放

- 一次性付款继续处理 `checkout.session.completed`。
- webhook 按 `order_no` 查询订单，要求 Stripe Session 的 `currency`、`amount_total` 与订单的 `currency`、`amount` 完全一致。
- 校验通过后按套餐固定积分发放；支付币种不改变积分数量。
- 金额或币种不一致时将事件标记为失败，不更新订单、不发放积分。
- 微信支付属于客户即时确认方式，不增加异步支付事件处理。
- 订阅 webhook 逻辑保持 USD 和现有事件范围不变。

## 前端交互

- 一次性套餐卡片保留现有银行卡购买按钮，并增加清晰的“微信支付 ¥X”入口。
- 月度卡片只显示订阅按钮。
- 登录提示与匿名购买流程继续复用；确认身份后把原选择的 `paymentMethod` 传给 Checkout API。
- Checkout 创建失败时继续显示现有“结账暂时不可用”错误，不泄露 Stripe 错误详情。

## 错误处理与安全

- Checkout API 对套餐和支付方式做白名单校验。
- 服务端从目录推导金额和币种，客户端无法覆盖。
- live key、webhook secret 继续只存 Cloudflare Secret。
- Preview 继续复用正式 D1，但验证后精确删除本次产生的未支付订单，并主动过期对应 Stripe Checkout Session。
- Stripe Dashboard 的独立 Preview webhook 保持不变。

## 测试与验证

### 自动化测试

- USD 一次性 Checkout：`card`、USD 金额、无微信选项。
- CNY 一次性 Checkout：`wechat_pay`、CNY 固定金额、`client = web`。
- 月度订阅：仅 `card`、USD、拒绝 `wechat_pay`。
- Checkout API：拒绝未知支付方式，拒绝客户端金额或币种干预。
- webhook：USD/CNY 正确金额可各发放一次；金额不符、币种不符和重复事件不发放。
- 全量测试、TypeScript 和生产构建通过。

### 本地端到端

1. Stripe 测试模式启动本地 Preview 和 webhook 转发。
2. 银行卡一次性付款完成并收到积分。
3. 微信支付一次性测试付款完成并收到积分。
4. 月度订阅银行卡付款完成并收到月度积分。
5. 核对订单币种、金额、状态与 webhook 事件。

### Preview 验证

1. 部署独立 Preview Worker，复用正式 D1 和 PhotoMaker live Stripe 配置。
2. 打开 USD 一次性银行卡 `cs_live_` 收银台，不付款。
3. 打开 CNY 一次性微信支付 `cs_live_` 收银台，确认显示微信支付，不付款。
4. 打开 USD 月度订阅 `cs_live_` 收银台，不付款。
5. 过期三个 Checkout Session，并精确删除对应未支付订单。

## 发布前检查

- Preview secrets 完整且未写入仓库。
- 独立 Preview webhook URL、签名密钥和五个订阅事件配置正确。
- 正式 D1 migration 无待执行项。
- Preview 验证记录已清理。
- 微信支付在 Stripe Dashboard 中保持启用。
- 正式发布后不执行真实支付，仅检查页面与监控状态。
