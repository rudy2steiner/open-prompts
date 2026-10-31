# Open Prompts D1 运维

## 数据库

正式 binding：`DB`；名称：`open-prompts`；ID：`97a63f9c-b95c-4597-952c-0235b1425fde`。仅四张 `p_` 表，旧订单、积分等仍在原 Supabase。业务运行不再使用 PostgreSQL TCP。

## 表结构与开发

- `npx drizzle-kit generate`：生成 SQLite 迁移，不自动改正式库。
- `npx wrangler d1 migrations apply open-prompts --local`：初始化本地库。
- `npx wrangler d1 migrations apply open-prompts --remote`：应用正式 D1 表结构迁移。
- `npm run dev`：使用本地 D1 binding；生产行为用 OpenNext + Wrangler 预览验证。
- seed 脚本默认本地；只有显式 `--remote` 才操作远程。提示词 seed 会更新已有记录，不能代替正式源数据导入。

## 私有数据迁移

1. `npx tsx scripts/d1/export.ts /工作区外的私有目录/snapshot.json`：对源 PostgreSQL 四表进行只读一致性导出；默认读取 `.env.production`，可用 `SOURCE_DATABASE_URL` 指定已核实的源。
2. `npx tsx scripts/d1/migrate.ts /私有目录/snapshot.json`：导入本地并逐表校验。
3. 加 `--remote` 导入远程。目标非空时必须显式 `--replace`，仅能在冻结写入且有备份后使用；该操作替换目标四表，不修改源库。
4. 加 `--verify-only` 只校验，不写数据。校验报告写在私有快照旁边，不放进仓库。
5. `npx tsx scripts/d1/smoke.ts http://localhost:8788`：隔离账号端到端检查，自动清理。

数组以 JSON 字符串存储；UTC 时间转换到整数毫秒（应用 Date 精度）。校验比较转换后的逐字段值，因此不会把合法的存储类型转换当成丢失。源始终保留原始时间精度。长字段用绑定参数，避免 SQL 长度上限。密码哈希、OAuth 令牌和邮箱不得打印到迁移日志。

## 维护与切换

`DB_MIGRATION_MODE=read-only` 时全部 API 返回 503 并提供 Retry-After；应用数据库 client 不可用，兜底阻止 SSR/初始化写入。公开静态页面仍可访问。上线确认维护门禁后，等待旧请求排空，最终重新导出、导入、核对，然后将变量设为 `off` 并重新发布。维护模式下不要把临时 API 503 当成业务异常自动重试写操作。

## 回退

原 Supabase 保留不删。正式恢复写入后，不能直接切回旧库；需先冻结写入、导出 D1 最新数据并回灌切换后变化，再恢复旧版，避免丢失新用户或模板。旧 Worker 版本及原 DATABASE_URL secret 暂时保留回退，业务代码不读取该 secret。

## 验证

`npx tsx --test tests/d1-business.test.ts` 验证真实本地 D1 的类型、约束、关联、参数上限及权限。正式切换必须另做 Worker API 的注册登录、模板 CRUD 和管理统计检查，不能只依赖本地测试。

`npx tsx scripts/d1/admin-smoke.ts https://www.open-prompts.com` 使用 `.env.production` 已配置的管理员凭据验证登录、用户查询、UTC 统计和审核列表；只输出检查结论。不要将凭据放入命令行参数。

## 慢速上传

若发布明确以 `UND_ERR_HEADERS_TIMEOUT` 结束，可只给发布进程加载 `scripts/cloudflare-upload-timeout.cjs`，延长等待响应头的上限。该脚本不改变应用请求或默认开发环境。在项目根目录运行：

```sh
NODE_OPTIONS="--require=./scripts/cloudflare-upload-timeout.cjs" npx opennextjs-cloudflare deploy
```

仍在运行的上传不要因一次观察超时而重复启动；先确认原进程终态。静态缓存已为同一构建准备好时，可以在 `OPEN_NEXT_DEPLOY=true` 下直接运行 Wrangler，避免再次构建。发布成功必须以最终版本回执与正式域名检查为准。
