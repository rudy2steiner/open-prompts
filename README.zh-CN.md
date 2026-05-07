# Open Prompts

一个开源的 Prompt 模板画廊 + AI 图像生成工作台。

- `/${locale}/gallery` 浏览模板
- 点击 “Generate” 跳转到 `/${locale}/create` 并自动选择该模板
- 支持多 Provider（可选在浏览器里保存每个 provider 的 API Key 覆盖）
- 无数据库依赖（MVP），生成历史保存在 `localStorage`

更多细节请看英文版 `README.md`。

## 快速开始（本地）

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认端口是 **3001**，打开 `http://localhost:3001/en`。

## 测试模式（不请求真实 API）

在 `.env.local` 设置：

- `USE_TEST_MODE=true`
- `TEST_IMAGE_URL=<任意图片 URL>`

## Providers & API Key 申请链接

- **当前仅支持 AtlasCloud（已支持）**
  - 注册：[atlascloud.ai](https://www.atlascloud.ai?ref=7METWL)
  - Dashboard：[Atlas Cloud Console](https://www.atlascloud.ai/zh/console/dashboard?ref=7METWL)
  - 创建 API Key：[API Keys](https://www.atlascloud.ai/console/api-keys?ref=7METWL)（文档：[API Keys docs](https://atlascloud.ai/docs/api-keys?ref=7METWL)）

规划中 / 开发中（暂未完全支持）：

- **OpenAI（internal）**：[platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Replicate**：[replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)（文档：[HTTP API reference](https://replicate.com/docs/reference/http)）

