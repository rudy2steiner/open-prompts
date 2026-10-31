# Supabase 迁移到 Cloudflare D1

日期：2026-10-24

## 目标与范围

将 Open Prompts 的正式业务数据库从 Supabase PostgreSQL 迁移到 Cloudflare D1。应用正式读写、登录注册、OAuth 关联、个人模板、后台审核和统计都切到 D1；不以仅复制数据或提供兼容接口作为迁移完成。

已确认应用使用四张表：`p_prompts`、`p_users`、`p_accounts`、`p_verification_tokens`。迁移前继续审计源库其他表与依赖；若存在额外业务数据，纳入迁移或明确归属，不能静默丢弃。

## 数据和兼容策略

- 保留现有主键、用户 ID、提示词 slug、密码哈希、OAuth 关联和令牌、可见性与审核状态。
- PostgreSQL 数组转 JSON 文本，Drizzle 保持 `string[]` 接口。
- UUID 使用文本存储，新记录在应用层生成 UUID。
- 时间统一 UTC，使用整数毫秒存储，Drizzle 对外仍映射 Date，避免日期精度和时区变化。
- 提示词 ID 使用 SQLite INTEGER PRIMARY KEY AUTOINCREMENT，导入后验证新增记录不会覆盖现有 ID。
- PostgreSQL `ILIKE` 和 UTC 日期统计改为 SQLite 等价表达式；保留搜索通配符的转义语义。
- D1 不支持普通交互式事务，不引入依赖多次往返事务的实现；有关联写入使用 D1 batch 或幂等约束。

## 迁移过程

1. 只读核实正式源库、表结构、记录数、索引、约束和空值分布，核实 Cloudflare 账户权限。
2. 保存私有完整导出和逐表校验摘要，备份不进入 Git。
3. 创建独立 D1 数据库，迁移 SQLite 表结构；转换导出并导入，核对逐表记录和字段摘要、外键与唯一约束。
4. 改造 Drizzle schema/client 与 SQL 方言，本地和 Worker 预览验证登录注册、OAuth、模板 CRUD、审核、搜索、统计。
5. 切换期间暂停业务写入，重新导出并核对最后增量，避免丢失复制后的新增、修改和删除。
6. 发布 D1 binding 与应用，验证正式读写和权限隔离，恢复写入。
7. 保留原 Supabase 与私有导出用于回退，最终记录数据库 ID、部署版本和验收结果。

## 回退

上线前失败不切换。上线后若需要回退，先暂停写入，保存 D1 最新快照并将切换后的数据同步回 PostgreSQL，再恢复旧版本，不能直接回退导致新增数据消失。不删除原库，不修改原用户凭据。

## 完成证据

- 正式 Worker 使用 D1 binding，业务运行不再依赖 DATABASE_URL。
- 源与目标四表及审计发现的业务表数据校验一致，包含敏感字段的摘要校验不泄露原值。
- 登录注册、已有用户密码及 OAuth 关联、模板权限、创建修改删除、后台审核搜索和 UTC 趋势统计均有验证记录。
- 公开页面和 API 正常，旧 ID、slug、来源信息保持兼容。
- 迁移脚本、初始化 SQL、配置和中文运维说明可复现，私有备份未进入版本库。

## 当前待核实

`.env.local`/`.dev.vars` 与 `.env.production` 的 DATABASE_URL 指纹不同，必须确认正式数据来源后才能导出并切换；仅根据变量名不能推定生产源库。

## 首轮只读审计结果

- 源库共有 16 张 public 表；当前源码仅访问 4 张 `p_` 表，其余 12 张是否随迁尚待用户确认。
- `p_prompts`：1,482 行，最大 ID 为 1,634；`p_users`：58 行，其中 3 行有密码哈希；`p_accounts`：56 行；`p_verification_tokens`：0 行。
- 账号用户引用和提示词所有者引用均无孤立记录；提示词 slug 与忽略大小写的邮箱均无重复；tags/images 都为数组。
- 两份配置的连接主机不同，但数据库名、角色和全部表记录数相同。迁移导出固定使用 `.env.production`，切换前再次核对正式 Worker 的源库身份。
- 已通过只读可重复读事务导出 16 表及 public 表结构、约束和索引。私有备份位于 `~/.local/share/open-prompts/migrations/2026-10-23T17-51-28-444Z/`，文件权限 0600，目录权限 0700。
- 备份共 4,893,440 字节，SHA-256：`120dacfd2000a6d2b915e0d55e470e231a9a0ca6e85f2be496807437e5eedd11`。
- Cloudflare D1 列表查询已成功，账户中尚无 `open-prompts` 数据库。
- 现有业务需要转换 3 处模块的 `ILIKE`，以及后台 UTC 日趋势的 `to_char(... at time zone ...)`；现有应用认证为 NextAuth JWT，不需要迁移 Supabase Auth 会话系统。

## 第二轮兼容性审计

- 全库数据类型为整数、bigint、文本/varchar、UUID、布尔、UTC 时间戳和 text[]；没有发现需要 PostGIS、向量或自定义类型的列。
- 最大单行 JSON 约 601,805 字节，位于 `p_prompts`。低于 D1 的 2,000,000 字节单行限制，但不得把整行直接拼成超长 SQL；导入工具需采用绑定参数，或对大值使用经验证的导入路径。
- 迁移需保留提示词 status/visibility 的 CHECK 约束、邮箱/slug/OAuth 的唯一约束和账号外键级联删除。
- 旧表包含 414 行旧用户、86 行订单、1,008 行积分、135 行图片生成记录和 1,795 行用量事件。是否保留这些表是迁移范围问题，不能从当前应用没有引用推定允许丢弃。

参考：<https://developers.cloudflare.com/d1/platform/limits/>、<https://developers.cloudflare.com/d1/best-practices/import-export-data/>。

## 用户最终范围确认

2026-10-24 用户确认：“不需要订单只是open prompts用到的表”。最终只迁移 `p_prompts`、`p_users`、`p_accounts`、`p_verification_tokens`。其余 12 表保留在 Supabase，不纳入目标 D1，也不修改。
