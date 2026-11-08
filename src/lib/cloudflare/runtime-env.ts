import { getCloudflareContext } from '@opennextjs/cloudflare';

/** 运行时优先读取 Worker binding，Node/本地测试回退到 process.env。 */
export function runtimeEnv(name: string): string | undefined {
  try {
    const value = (getCloudflareContext().env as Record<string, unknown>)[name];
    if (typeof value === 'string') return value;
  } catch {
    // 非 Cloudflare 请求上下文（例如 Node 单测）使用 process.env。
  }
  return process.env[name];
}
