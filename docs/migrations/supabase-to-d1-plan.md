# Open Prompts D1 迁移实施计划

> 执行方式：本会话逐项实施并验证，使用 executing-plans；最后进行独立代码评审。

**目标：** 将 Open Prompts 正式业务读写从 Supabase 切换到 D1。
**设计：** [迁移设计](./supabase-to-d1-design.md)。用户确认仅迁移四张 p_ 表，旧订单、积分等表留在 Supabase。
**架构：** Drizzle SQLite schema + D1 binding，数组 JSON、时间整数毫秒、UUID 文本。迁移脚本从只读一致性快照转换数据，以绑定参数导入并校验。正式切换保留原数据库。

## 全局约束

不得丢失主键、用户凭据、关联、权限、审核状态。私有数据不进入 Git。切换前控制写入并再次同步；旧表不写、不删。导入大行使用绑定参数。回退需先保存切换后的写入。

## 实施与验证

- [x] 建立 D1 schema/client、初始化 SQL 与 binding；测试 JSON 数组、UUID、时间、ID 自增、唯一及 CHECK/外键约束。
- [x] 替换 ILIKE、UTC 日统计和 PostgreSQL 错误码；更新 seed/admin 工具及文档；类型检查证明调用链兼容。
- [x] 创建独立 D1 库；实现私有快照导入/逐表摘要校验，验证 600KB 级字段无截断。
- [x] Worker 预览验证注册、已有密码、OAuth 数据完整性、模板 CRUD/权限、搜索、审核、统计；独立评审后修复。
- [x] 启用短暂写入维护，捕获最新源数据，核对后发布正式 D1 版本；恢复写入并验证正式端点和数据。
- [x] 保存迁移版本、校验报告与回退说明；仅在正式应用切换及验证完成后判定目标完成。

## 风险与验证重点

空数组/null 与 JSON 编码；UTC 边界与毫秒精度；OAuth 重复关联；所有者与管理员权限；导入后新增 ID；长文本/图片字段；源库切换期间并发修改；开发与 Worker 绑定差异。

## 执行记录

- 2026-10-24：用户批准范围为 Open Prompts 使用的四张 p_ 表。此前全 public 私有备份保留不动。

- Ruling：源库与新库不做双写。先发布维护模式（API 503 + getDb 不可用），停止应用数据库写入，待旧请求结束后重新导出四表并替换目标，核对后关闭维护模式。维护版本继续提供静态公开页面，避免切换期间产生两个写入源。
- 追加目标：迁移完成后优化 Gallery 首开，记录线上首字节/FCP/可见内容，不以 D1 导入完成代替整个目标完成。

## 已有验证证据

- 独立远程 D1：`open-prompts`，ID `97a63f9c-b95c-4597-952c-0235b1425fde`，亚太区域。
- 初始四表本地/远程导入均已逐字段归一化摘要一致（含 JSON 数组、毫秒时间及敏感字段，不输出原值）。私有校验报告随源快照存放。
- `tests/d1-business.test.ts`：真实本地 D1 验证大字段、OAuth 复用、唯一/CHECK/外键、日期、搜索、100 条批量审核及删除所有者隔离。
- 全套 30 项 Node 测试通过；Cloudflare 构建通过。
- `scripts/d1/smoke.ts` 在 Worker 预览完成注册、密码会话、私有模板 CRUD、匿名隔离及新 ID 检查，已清理合成记录。
- 维护模式预览：API 返回 503，公开 Motion 页面返回 200。
- 正在发布维护版本，正式最终同步及停用维护模式尚未完成。

## 正式切换进度

- 维护版本：`a63cd949-8420-48fd-9a93-fb4e1005d4e0`，正式域名与 workers.dev 的 `/api/auth/register` 均已验证 503 + migration 响应。
- 等待旧请求后，源 PostgreSQL 活跃 p_ 业务查询计数为 0。
- 最终四表私有快照：`~/.local/share/open-prompts/migrations/d1-cutover-20261024/final.json`；导出时间 `2026-10-23T18:14:42.234Z`（北京时间 2026-10-24 02:14）；SHA-256 `1d3b639f822dd67cdb101d900b6f9c10704385bcb1683bb8300aab97d34ac5c7`。
- 当前远程最终同步进程运行中，日志 `/tmp/open-prompts-d1-final-import.log`。完成并核对后才可发布恢复版本。
- 恢复版本已构建完成，日志 `/tmp/open-prompts-d1-final-build.log`；本地 wrangler.jsonc 的 DB_MIGRATION_MODE 已设为 off，尚未发布恢复版本。

- 最终远程同步完成：四表字段摘要全部一致，无外键异常；报告为私有 `final.json.remote-verification.json`。最终同步日志 `/tmp/open-prompts-d1-final-import.log`。
- 恢复版本正在发布，日志 `/tmp/open-prompts-d1-final-deploy.log`；此阶段尚不可声称服务已恢复。

## Gallery 性能观察（待迁移恢复后重新测基线）

维护期公开 Gallery 使用原静态目录兜底，Chrome 前台一次测量：TTFB 1,500ms，HTML 下载 813ms，解压 HTML 498,212 字节，FCP 2,328ms。该样本不是正式 D1 数据目录性能验收，必须恢复后重测。

- D1 正式读写版本已发布：`df52a530-6a7f-406b-82ac-eda68b40d845`，Wrangler 确认 DB binding 存在且 DB_MIGRATION_MODE=off。维护已解除。
- 当前正式端到端验证运行中，日志 `/tmp/open-prompts-d1-production-smoke.log`，使用隔离账号并在结束后自动清理。
- 本地 3103 已切换到 Wrangler D1 预览，日志 `/tmp/open-prompts-d1-local-3103.log`。

## 数据库迁移阶段验收

正式域名隔离账号端到端验证已通过，脚本直接读取目标 D1 确认 HTTP 新用户 ID 与会话 ID 一致，覆盖注册、密码登录、会话、私有模板创建/查询/修改/删除、匿名拒绝、非管理员拒绝和新 ID；测试记录已清理。正式版本 `df52a530-6a7f-406b-82ac-eda68b40d845`，维护模式 off。旧 Supabase 四表保留用于回退，其余旧订单/积分表未迁移未改动。整个线程目标仍需完成 Gallery 发布与性能验收。

## Gallery 优化实施与本地证据

- 默认与模型/分类 URL 均先查 18 条；初始 HTML 不带长正文。完整目录在首屏后低优先级请求，保留正文搜索与原分类推断逻辑。
- 首批轻量公开 bootstrap 使用按构建版本隔离的 30 秒边缘缓存，查询故障走原静态目录回退且不缓存故障结果。
- Gallery 卡片使用首次即可显示的 CSS 分批瀑布流，图片不再 opacity=0 等 React onLoad；批次追加不重排已有批次（图片比例修正仍可能影响批次内部布局）。
- 本地实际 D1 Worker：FCP 276ms，HTML 约 385KB；首批 18 张，前三张图片加载后 opacity=1。线上优化前：HTML 2,826,519 字节、FCP 21,996ms（包含该次连接延迟）。
- 33 项测试通过，类型检查及 Cloudflare 构建通过；独立复审通过。测试工具已脱离 .open-next/assets 依赖，可在构建前运行真实 D1 测试。
- 当前 Gallery 优化版本发布中，日志 `/tmp/gallery-speed-deploy.log`。尚未完成线上性能验收，不得宣称整个目标完成。

- Gallery 优化版本已发布：`510269f3-75c4-4cf2-b430-e4a5b2453645`，DB_MIGRATION_MODE=off。正在正式域名验收。
- 两份源连接配置使用相同 Supabase 项目级角色、密码和数据库名，区别为连接主机；确认不是误选另一套用户/业务库。

## Gallery 首轮线上复测及继续优化

首轮正式版本 `510269f3-75c4-4cf2-b430-e4a5b2453645`：首次连接 FCP 3,044ms，复用连接 FCP 1,176ms；HTML 388,583 字节，传输约 63KB。首次 TCP 489ms、TLS 253ms；剩余后端/往返仍需优化，不能把复用连接样本冒充首次连接表现。

将公开 bootstrap 缓存改为本域的构建隔离 key，TTL 300秒（完整目录仍独立实时加载），新增共用公开预览 API `/api/gallery-bootstrap`，通过 `X-Gallery-Cache` 和 `Server-Timing` 验证缓存而非猜测。本地 MISS 15ms、HIT 1ms，35项测试与构建通过。第二轮优化版本发布中，日志 `/tmp/gallery-edge-deploy.log`；仍待正式域名性能验收。

- 第二轮正式版本：`54be62e4-b7f6-492f-9195-c001957f80ee`。正式域名预览 API 验证：MISS 252ms、HIT 6ms，均返回18张、总数1,419、正文为空。缓存命中已得到实际响应头证明。
- 图片额外优化：列表 X 媒体封面请求 medium（最长边1200px），原 images 数组不变，详情与创建仍使用原图。浏览器验证首图从1776×2368变为900×1200且成功加载；源库没有需要特殊处理的旧式冒号后缀媒体URL。
- 37项测试及构建通过，缩略图最终版本发布中，日志 `/tmp/gallery-final-deploy.log`。

- 本地 D1 状态目录 `.wrangler` 已设为仅当前用户可访问（0700），并被 Git 忽略；私有快照仍保存在工作区外。

- 缩略图版本已发布：`274d3e5a-daab-495d-9919-bdc9fc92b717`，正式密码/模板端到端检查再次通过。
- 忽略浏览器资源缓存的一次正式 trace：FCP 3,108ms，TTFB 1,697ms，HTML 388,613字节；首批4图均成功使用medium。与缓存命中时19ms处理、1,576ms总往返对照，链路延迟仍存在，不能宣称任意网络首次连接小于1秒。
- 补充站内首开路径：共用桌面/移动导航的 Gallery 入口改用 Next Link，只有非 Gallery 页主动预取首批 RSC 数据；其它入口维持原导航行为，减少整页跳转和白屏。构建通过，发布日志 `/tmp/gallery-navigation-deploy.log`。
- 本地导航检查：Motion → Gallery 保持同一文档并显示18张；带摄影分类 URL → 顶部 Gallery 正确清除筛选并恢复1,419条总数。验证浏览器处于后台，未将后台定时器的点击耗时用作性能结论。
- 额外正式只读管理员冒烟检查通过：已配置管理员密码登录、用户查询、30天 UTC 日统计、待审核模板列表。脚本 `scripts/d1/admin-smoke.ts`，日志 `/tmp/d1-admin-production-smoke.log`。脚本初版误读返回键 userStats，按路由实际 stats 修正后通过；不是线上统计故障。
- 最终额外脚本类型检查和 `git diff --check` 通过；37项业务与 Gallery 测试已通过。
- 最终独立范围复审通过：导出/导入仅四张 p_ 表，逐表摘要一致、运行时不再引用 PostgreSQL，正式业务与管理员检查均通过，无迁移阻断。
- 窄屏浏览器检查（Chrome 最小视口500px）：顶部首页/画廊/动效/分类/创作/分享入口均在屏幕范围内，页面无横向溢出。未将其写成390px真机验证。

## 最终发布与验收

- 最终版本 `45ec916d-4de4-4986-acef-757a6323f79a` 已发布，Cloudflare 确认 DB binding、维护关闭；上传455.69秒，发布触发器1.50秒。日志 `/tmp/gallery-navigation-deploy.log`。
- 正式域名已加载新导航脚本；Motion → Gallery 保持同一文档、显示画廊标题和18张卡片、顶部导航可见。旧路由由框架隐藏保留，不是整页重新加载。
- 最终正式 HTML：388,258字节，实际压缩传输75,900字节，HTTP200，首字节2.041秒、完成2.239秒。此前浏览器实际FCP样本1.176–3.108秒；不能承诺冷连接稳定低于1秒。
- 最终版本管理员登录、用户查询、30天UTC统计和审核列表再次通过，日志 `/tmp/d1-admin-release-smoke.log`。37项测试、类型检查、生产构建、独立复审均通过；原库及私有快照保留回退。
- 数据迁移与本轮性能优化已完成发布；“所有首次访问稳定秒开”尚未得到证据支持，网络往返仍是后续性能限制。

## 首开继续优化：整页边缘缓存

前一轮属于有进展：完成D1迁移、减小HTML、部署并发现网络与SSR剩余开销。继续检查正式响应发现，数据缓存命中后仍重新生成HTML，且整页为private/no-store，因此增加仅公开无筛选列表的60秒HTML边缘缓存。

- `worker.ts` 使用 OpenNext 官方 custom-worker 入口包装；`BUILD_ID` Text 模块隔离每次构建。原处理器与DO导出保持可用。
- 缓存key包含域名、构建ID、路径、Accept-Language和NEXT_LOCALE。会话/未知Cookie、授权、RSC及所有路由预取头、筛选查询、API和非GET请求全部绕过。仅允许语言Cookie从缓存副本移除并在返回时恢复，任何其它Set-Cookie、错误和重定向不缓存。浏览器响应仍private/no-store。
- 新增4项针对性测试：缓存命中绕过渲染、语言/部署隔离、会话/RSC/筛选绕过、错误及缓存故障降级；先确认缺少实现失败，再实现通过。合计41项测试、类型检查和生产构建通过；独立复审未发现阻断。
- 真实本地Worker：MISS总耗时277ms（处理263ms），HIT总耗时7.45ms（处理1ms）；不是mock性能。中文HTML lang=zh，语言cookie访问默认路径仍307到中文，伪造会话/RSC/分类请求均无HTML缓存头。
- 发布日志 `/tmp/gallery-html-deploy.log`，正式验收尚待发布结束。

- 首轮整页缓存版本已发布 `6cfd9fac-3524-4778-94ad-eb1865b202d4`。正式域名连续请求：MISS 1,860ms（含首次连接），HIT 375/388ms（处理6/5ms），均200、388,258字节、lang=en。日志 `/tmp/gallery-html-production-probe.log`。
- 正式中文/语言重定向/伪会话/RSC/筛选隔离通过；正式隔离账号注册、登录和模板CRUD再次通过（`/tmp/gallery-html-business-smoke.log`）。
- 发现 `/api/auth/session` 给匿名访客也设置 `next-auth.csrf-token`、`next-auth.callback-url`，不是登录会话。精确允许这两个名字（及安全前缀）穿过公开缓存，依旧绕过会话和未知Cookie；新增断言先红后绿，真实Worker的匿名CSRF请求MISS→HIT通过，独立安全复审通过。
- 修正后41项测试、类型检查及构建再次通过；发布日志 `/tmp/gallery-html-final-deploy.log`。
- Chrome当前document.visibilityState=hidden，截图报image readback failed，无本轮有效FCP；未把HTTP完整返回时间冒充首次绘制。仍需可绘制的前台环境检验首开画面。

- 最终修正版已发布：`68476f79-3089-4600-ae32-1617eb7b8623`，DB绑定正常、维护关闭；上传393.03秒。匿名CSRF/callback Cookie正式请求：MISS总2,332ms，HIT总614/371ms（处理8/4ms）。中文同样MISS→HIT且lang=zh；管理员查询/统计再次PASS。
- 新建连接且HTML命中样本：首字节1,114ms、完整返回1,324ms，处理18ms。对比探针时必须统一Accept-Language：Node fetch默认`*`，curl默认无该头，二者按设计不同缓存key，不能把不同key的MISS误判成缓存不工作。
- 正式Chrome画廊标题和18张卡片已存在，当前为已登录状态（无登录入口），HTTP缓存按设计绕过。仍hidden且无FCP记录；已通过异步问题请求恢复前台，尚未收到答复。
- 本轮属于实质进展：新增整页缓存及匿名Cookie兼容、完成两轮正式发布与安全/业务/性能检查。首开<1秒的浏览器证据仍缺失，目标未标记完成。

## 恢复前台后的真实绘制复测

用户确认已恢复前台，Chrome visibility=visible。正式中文Gallery实际FCP=2,916ms、TTFB=1,063ms、HTML完成=5,067ms，18张卡片及前4张预览图显示且opacity=1。仍未达标，不能按此前HTTP样本结项。

对照同一浏览器请求：携带Cookie无HTML缓存头，不带Cookie可MISS，确认原Cookie保守绕过导致真实浏览器没有受益。当前网络估计3g、RTT300ms，必须减少公开HTML路径的额外工作。

- 公开canonical列表现在先复制请求并去掉全部Cookie和Authorization，仅保留NEXT_LOCALE，再交给源渲染器。即使已登录也只能生成匿名公开HTML，身份信息不参与缓存；账户状态继续由SessionProvider独立查会话。API/RSC/查询筛选/个人页保留原始请求与身份。
- 新增源render收不到会话和Authorization、原Request不变、不同会话共用匿名HTML的测试，先红再绿；补充绕过请求身份保留的断言。42项测试与构建通过，独立权限复审通过。
- 真实本地Worker带会话/未知Cookie/Authorization请求MISS→HIT、lang=zh、无身份串入。增强管理员只读检查确认登录/匿名公开HTML逐字节一致且缓存HIT后会话、用户查询、UTC统计和审核列表均正常。初版邮箱字符串断言碰到公开翻译中的固定示例，已改为更强的两种身份HTML逐字节对照，不把固定示例误报为身份泄漏。
- 发布日志 `/tmp/gallery-public-identity-deploy.log`，仍待正式前台FCP验收。
- 首次发布以exit1和`fetch failed`结束，属于确认终止而非观测超时；已用同一构建重试，日志 `/tmp/gallery-public-identity-deploy-retry.log`。未重复构建或宣称失败尝试已上线。
- 重试会话66242仍在运行，Wrangler进程10953，约17分钟时仍S状态且有上传TCP连接。持续观察同一进程，没有因等待时间重启。后续先轮询此会话；只有终态后才决定重试或验收。一次只读minify dry-run仅缩小约22%，未改发布配置，私有临时产物已清理。
- 会话66242随后以exit1结束。定向检查Wrangler日志确认两次`UND_ERR_HEADERS_TIMEOUT`；本机CLI代码默认响应头等待300秒。新增仅显式加载于发布进程的Undici Agent等待延长脚本，使用相同构建直接Wrangler重试（静态缓存已准备且skew protection关闭），会话60851，日志 `/tmp/gallery-public-identity-deploy-long-timeout.log`。没有在活跃上传期间重复启动。
- 会话60851以exit0结束，版本`66d5b7e2-dfe4-4d75-942d-e002cf9c8aab`，上传622.05秒、触发器0.91秒；DB绑定正常且维护关闭。延长等待的发布方法已成功使用。
- 正式Chrome实际携带Cookie请求已HIT，处理6ms。前台重新加载命中处理7ms，但首字节7,508ms、首次绘制13,248ms、HTML完成42,246ms，18张卡片存在；不能宣称秒开。无Service Worker，浏览器估计3g、RTT500ms。
- 增强正式管理员检查首次CSRF收到非JSON；独立检查随后确认该端点200/application-json。复测进行到已登录公开Gallery时30秒超时；不是权限断言失败，但不足以验收本版真实登录兼容。Chrome简单DOM读取也两次超时，测试链路不稳定。
- Chrome控制工具不能读取chrome://内部设置，已关闭诊断页而未绕过限制；异步请求用户检查Network是否No throttling，并请求可用时切换稳定网络。当前目标仍未完成，需要稳定可绘制环境与正式业务复测。
