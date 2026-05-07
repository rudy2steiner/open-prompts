# Open Prompts

オープンソースの Prompt テンプレートギャラリー + 画像生成ワークスペースです。

- GitHub: [rudy2steiner/open-prompts](https://github.com/rudy2steiner/open-prompts)

- `/${locale}/gallery` でテンプレートを閲覧
- “Generate” から `/${locale}/create` に移動し、そのテンプレートを自動選択
- Provider 切り替え対応（必要に応じてブラウザに API Key の上書きを保存）
- DB 不要（MVP）、履歴は `localStorage` に保存

詳細は英語版 `README.md` を参照してください。

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

デフォルトは **3001** ポートです。`http://localhost:3001/en` を開いてください。

## テストモード（実 API を呼ばない）

`.env.local` に設定：

- `USE_TEST_MODE=true`
- `TEST_IMAGE_URL=<任意の画像URL>`

## Providers & API Key 取得リンク

- **現在は AtlasCloud のみ対応（supported）**
  - サインアップ：[atlascloud.ai](https://www.atlascloud.ai?ref=7METWL)
  - Dashboard：[Atlas Cloud Console](https://www.atlascloud.ai/zh/console/dashboard?ref=7METWL)
  - API Key 作成：[API Keys](https://www.atlascloud.ai/console/api-keys?ref=7METWL)（Docs：[API Keys docs](https://atlascloud.ai/docs/api-keys?ref=7METWL)）

予定 / 作業中（まだ完全対応していません）：

- **OpenAI（internal）**：[platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Replicate**：[replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)（Docs：[HTTP API reference](https://replicate.com/docs/reference/http)）

