## Context

Open Prompts 是一个提示词画廊站点，当前核心路径是“浏览提示词 → 复制 → 去外部工具生成”。本变更将把生成链路迁移到站内，支持用户基于提示词模版（含变量）直接发起生图，并在站内查看任务进度与结果。

UI 现状：
- 已有 landing page 的静态 HTML 模版（含画廊、模态框、以及“立即生图”按钮样式/位置）。实现时优先复用该信息架构与视觉风格，将其组件化到 Next.js + Tailwind，而不是重新设计页面。
- 已有 login page 的静态 HTML 模版（含登录/注册切换、OAuth 按钮、邮箱表单、忘记密码状态、主题与语言切换）。实现时复用 UI/交互，并将认证逻辑接入 Supabase Auth。
- 已有 user center（用户中心/控制台）静态 HTML 模版（侧边栏导航、模板管理、收藏、生图历史入口、credits 流水、订阅管理等信息架构）。实现时复用布局与交互，将数据源接入 Supabase（并受 RLS 保护）。
- 已有 submit page（提交提示词）静态 HTML 模版（三步 wizard + 右侧实时预览 + 图片上传/URL + 提交成功态）。实现时复用该表单体验，并将提交逻辑接入后端审核/入库流程（先最小可行可直接写入待审核表）。
- 已有 admin landing page（管理后台）静态 HTML 模版（待审核队列、全量内容、举报、用户管理、订阅/收入、审计日志等）。实现时复用布局与交互，并增加管理员/审核员 RBAC（Supabase Auth + DB 权限/RLS）以保护后台入口与数据操作。
- landing 参考：[OpenNana Prompt Gallery](https://opennana.com/awesome-prompt-gallery?model=ChatGPT)
  - 参考其高转化的信息架构与模块组合：提示词列表（画廊）+ 搜索 + 模型筛选 + 标签筛选 +（分页/无限滚动）+ 生成记录入口 + 会员计划入口

技术栈约束：
- Next.js（应用与 API routes）
- Supabase（Auth + Postgres + 可选 Storage/Edge Functions）
- Cloudflare R2（图片对象存储，S3 兼容）
- Tailwind CSS（前端 UI）

关键约束：
- 成本与安全：需要支持自托管 API Key（用户自带）与订阅（平台代付）两种模式；避免 Key 泄露、滥用与不可控费用
- 可扩展：不同模型/提供方（例如 OpenAI / Replicate / SD WebUI / 自建推理等）能力差异较大，需要统一抽象
- 可用性：MVP 采用 API 直连 provider + 轮询获取结果，不做持久化；后续迭代再引入可靠状态机、重试、超时与结果持久化策略

## Goals / Non-Goals

**Goals:**
- MVP 提供“发起生成 + 轮询状态 + 展示结果”的 API 能力（不落库）；后续迭代再完善为可持久化的 job 域模型与历史
- 支持提示词模版变量渲染：把模版 + 用户输入渲染为最终 prompt（包含可选负面词）
- 支持多个 provider 的端到端打通，默认内置 `atlascloud` 与 `replicate`，并为后续 provider 预留扩展点
- 支持结果展示与下载（MVP 先使用 provider URL；后续可接 R2）
- 支持自托管 Key 与订阅两种鉴权/配额策略的接入点

**Non-Goals:**
- 不在首版实现复杂的内容安全审核/模型合规体系（仅做基础防滥用与尺寸/并发限制）
- 不追求一次性覆盖所有模型参数（先聚焦通用参数：尺寸/比例、步数、seed、参考图等按 provider 能力逐步补齐）
- 不强依赖某个厂商的专有模版语法（先用站内变量 schema）

## Decisions

- **生成能力采用 Provider 抽象**
  - **Decision**: 定义 `ImageGenerationProvider` 接口（createJob/getJob/cancelJob 或 create/ poll），并内置两个实现：`atlascloud` 与 `replicate`。业务层通过 provider registry 选择 provider；同一套 job 状态机适配所有 provider
  - **Rationale**: 各家 API 差异大（同步/异步、参数命名、返回结果），抽象可避免业务层与 provider 绑定
  - **Alternatives**:
    - 直接在 API route 内写死某家 SDK：最快，但后续迁移/扩展成本高

- **任务域模型：Job + Result，状态机驱动**
  - **Decision**: MVP 不引入持久化 job 表：API 直连 provider 创建任务并返回 provider job id（或 request id）；前端以该 id 轮询查询状态与结果。后续迭代再用 Supabase Postgres 引入 `generation_jobs`/`generation_results` 做历史、重试、并发控制与可观测性
  - **Rationale**: 降低 MVP 复杂度与上线时间；先验证站内生图需求与转化

- **异步执行方式：API 创建 + 后台 worker 轮询/回调**
  - **Decision**: MVP 采用“创建 → 前端轮询”的无状态实现：Next.js API route 创建请求并返回 provider 侧的 job id；提供查询接口（或透传 provider 查询）供前端轮询。后续迭代再引入 worker 推进状态、重试与 webhook
  - **Rationale**: 避免引入后台执行与状态机，缩短交付周期

- **模版变量：结构化 schema + 渲染函数**
  - **Decision**: 用 JSON schema 风格定义变量（name/type/default/enum/constraints/required），渲染时做校验并插入模版字符串；输出最终 prompt 与 negative prompt（若支持）。模版与变量 schema 的存储先支持**本地 JSON 文件**（随代码发布），后续可选演进为 Supabase 表（便于用户自定义与在线编辑）。
  - **Rationale**: 便于前端自动生成表单；比自由文本更可控、可复用、可测试
  - **Alternatives**:
    - 直接让用户编辑最终 prompt：简单但无法复用模版，也难以做参数化与一致体验

- **鉴权与配额：账户级策略层**
  - **Decision**: 生成 API 必须登录（Supabase Auth）；在创建 job 前执行配额检查（每分钟/每日/并发）与模式判定（自托管 Key / 订阅）；Key 仅在服务端使用并加密存储（DB 字段加密 + RLS 限制）
  - **Rationale**: 控制成本与滥用；避免前端暴露 Key

- **结果存储：优先对象存储或 provider 原图链接 + 缓存**
  - **Decision**: MVP 直接使用 provider 返回的可访问 URL（或 base64/临时链接）用于展示与下载，不做落盘。后续迭代再引入 R2 长期存储与签名下载/缓存策略
  - **Rationale**: 降低复杂度；按 provider 能力逐步增强

## Risks / Trade-offs

- **[成本失控]** 用户频繁生成或恶意刷图 → **Mitigation**: 登录必需、速率限制、并发限制、配额/订阅门槛、生成参数上限
- **[Key 泄露]** 自托管 Key 存储不当 → **Mitigation**: 服务端加密存储、最小权限、脱敏展示、审计与撤销入口
- **[Provider 不稳定]** 超时/失败率高 → **Mitigation**: job 超时、指数退避重试、失败可重试、provider 健康检查
- **[图片外链失效]** provider URL 过期 → **Mitigation**: 检测失效并回填对象存储；对关键结果持久化
- **[体验割裂]** 参数太多导致表单复杂 → **Mitigation**: 默认值 + 高级参数折叠；不同模型显示能力子集

