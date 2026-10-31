// 仅供慢速网络的 Wrangler 发布进程显式加载，不影响应用或默认开发环境。
// 大包尚未传完时，默认 300 秒响应头超时会提前终止有效上传。
const { Agent, setGlobalDispatcher } = require('undici');
setGlobalDispatcher(new Agent({
  headersTimeout: 30 * 60 * 1000,
  bodyTimeout: 30 * 60 * 1000,
  connect: { timeout: 30 * 1000 },
}));
