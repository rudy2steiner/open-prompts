# Open Prompts

**Open Prompts** は、**AI 画像プロンプトテンプレート**の発見・共有・再利用のためのオープンソースプラットフォームです。キュレーションされたギャラリーでテンプレートを閲覧し、生成スタジオで開いて、プラガブルなプロバイダーで画像を作成できます。ひとつのワークフローのまま完結します。

リポジトリ：[github.com/rudy2steiner/open-prompts](https://github.com/rudy2steiner/open-prompts)

[Apache License, Version 2.0](LICENSE) の下で提供されています。

**言語：** [English](./README.md) · [简体中文](./README.zh-CN.md) · 日本語

---

## はじめに

多くのチームはプロンプトをドキュメント、スレッド、スプレッドシートに散在させています。**Open Prompts** は、プレビュー画像・タグ・モデル・公開範囲（公開 / 非公開 / 下書き）を備えた **テンプレート** に整理します。ユーザーは次のことができます。

- **ギャラリー** でコミュニティおよびカタログのプロンプトを探索
- テンプレートからワンクリックで **生成**
- 公開プロンプトを **提出** して審査に回す、またはアカウントから **非公開** テンプレートを作成
- **GitHub**、**Google**、または **メール** でサインイン（運用者は管理者資格情報）

アプリは **Next.js**、**next-intl**（英語・中国語・日本語）、**NextAuth**、**Postgres**（例：Supabase）で構築されています。画像生成はサーバー API 経由で、現時点では **Atlas Cloud** に対応（**Replicate** は予定で未対応）、および有料 API 不要の **テストモード** があります。

---

## 主な機能

| 領域 | 内容 |
|------|------|
| **ギャラリー** | モデル・タグで検索・フィルタ。詳細表示から Create へ遷移（プロンプトは事前入力）。 |
| **Create スタジオ** | テンプレートカルーセル、プロンプトエディタ、アスペクト比 / 品質 / バッチ制御、プロバイダー選択、セッション履歴（ブラウザ `localStorage`）。 |
| **Submit フロー** | 単一ページウィザード。ギャラリー公開（公開 → 審査キュー）または `?visibility=private` で **非公開** テンプレートを保存。 |
| **アカウント** | マイテンプレート、管理者 **審査キュー**（承認 / 却下）、クレジット・サブスクリプションのプレースホルダー UI。 |
| **認証** | GitHub / Google OAuth。設定済み管理者向けメール・パスワード。公開の自己登録 UI はなし。 |
| **管理者モデレーション** | 全テンプレートを対象とした審査キュー。ステータスと公開範囲はギャラリー規則に整合。 |
| **X インポート** | Submit で公開ツイート URL を貼り付け、タイトル・説明・プロンプト・画像を事前入力。 |
| **i18n** | ロケールルート：`/`（英語）、`/zh`、`/ja`。共通ヘッダー・フッター。 |
| **セルフホスト** | Apache 2.0。環境変数でプロバイダーと DB を設定。Vercel または任意の Node ホストにデプロイ可能。 |

---

## クイックスタート

### 前提条件

- **Node.js** 18+（20 LTS 推奨）
- **npm**（または pnpm / yarn）
- **Postgres** データベース（[Supabase](https://supabase.com) が適しています）
- 任意：**Atlas Cloud** の API キー（実際の生成用）

### 1. クローンとインストール

```bash
git clone https://github.com/rudy2steiner/open-prompts.git
cd open-prompts
npm install
```

### 2. 環境変数

```bash
cp .env.example .env.local
```

最低限、次を設定します。

| 変数 | 用途 |
|------|------|
| `DATABASE_URL` | Postgres 接続文字列（マイグレーションと管理者クエリには Supabase **Session pooler** ポート **5432** を推奨） |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `NEXT_PUBLIC_SITE_URL` | ローカルでは `NEXTAUTH_URL` と同じ（SEO 用） |

サインインと管理者：

| 変数 | 用途 |
|------|------|
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth アプリ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth クライアント |
| `ADMIN_EMAIL` | 管理者メール（複数はカンマ区切り。ログインメールと完全一致すること） |
| `ADMIN_PASSWORD` | 8 文字以上。起動時 / 管理者ログイン時に DB と同期 |

画像生成（Atlas Cloud またはテストモード）：

| 変数 | 用途 |
|------|------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud`（Replicate は未対応） |
| `ATLASCLOUD_API_KEY` | [Atlas Cloud](https://www.atlascloud.ai) API キー |
| `USE_TEST_MODE` | `true` で実 API をスキップ |
| `TEST_IMAGE_URL` | テストモードで返す画像 URL |

クレジット上限と任意の OpenAI 設定は [`.env.example`](.env.example) を参照してください。

### 3. データベース

Supabase SQL エディタまたは `psql` でマイグレーションを適用し、必要に応じてシードします。

```bash
# 任意：Drizzle で schema を push
npm run db:push

# 同梱データセットからギャラリーテンプレートを投入
npm run seed:prompts

# 管理者パスワードを DB に反映（ログイン失敗時）
npm run seed:admin
```

マイグレーション SQL は `supabase/migrations/` と `scripts/apply-owner-visibility-migration.sql` にあります。

### 4. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます（デフォルトポート **3000**）。

### 5. 本番ビルド（任意）

```bash
npm run build
npm run start
```

---

## Vercel へのデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frudy2steiner%2Fopen-prompts&env=NEXTAUTH_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Required%20secrets%20(minimum)&project-name=open-prompts)

### 1. プロジェクトをインポート

1. このリポジトリを GitHub に push（または fork）。
2. [Vercel](https://vercel.com) → **Add New Project** → リポジトリをインポート。
3. フレームワーク：**Next.js**（デフォルト）。ビルド：`npm run build`。出力：デフォルト。

### 2. 環境変数

**Project → Settings → Environment Variables** で、`.env.local` と同じキーを **Production** に設定（Preview でも OAuth を使う場合は同様）。

**動作に必要な最低限**

| 変数 | 例 / メモ |
|------|-----------|
| `DATABASE_URL` | Supabase pooler URI（ポート **5432**、ユーザー `postgres.<project-ref>`） |
| `NEXTAUTH_URL` | `https://your-app.vercel.app`（末尾スラッシュなし） |
| `NEXTAUTH_SECRET` | 強力なランダム文字列 |
| `NEXT_PUBLIC_SITE_URL` | `NEXTAUTH_URL` と同じ |
| `ADMIN_EMAIL` | 運用者メール（カンマ区切り可） |
| `ADMIN_PASSWORD` | 強力なパスワード。ログイン失敗時は同一 DB に対してローカルで `npm run seed:admin` |

**OAuth（推奨）**

| 変数 | 登録するコールバック URL |
|------|-------------------------|
| `GITHUB_ID` / `GITHUB_SECRET` | `https://your-app.vercel.app/api/auth/callback/github` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `https://your-app.vercel.app/api/auth/callback/google` |

**画像生成**

| 変数 | メモ |
|------|------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud` |
| `ATLASCLOUD_API_KEY` | 実生成に必要（テストモードを除く） |
| または `USE_TEST_MODE=true` + `TEST_IMAGE_URL` | 有料 API なしのデモ |

環境変数変更後は再デプロイしてください。

### 3. Supabase 上のデータベース

1. Supabase プロジェクトを作成し、**Session mode** 接続文字列（ポート **5432**）をコピー。
2. SQL エディタで `supabase/migrations/` を順に実行。
3. ローカル（`DATABASE_URL` がその DB を指す状態）で：

   ```bash
   npm run seed:prompts
   npm run seed:admin
   ```

### 4. 動作確認

- `https://your-app.vercel.app` を開く — ギャラリーにテンプレートが表示されること。
- GitHub / Google または管理者メール・パスワードでサインイン。
- 管理者として `/account` を開き、審査キューを利用。

**メモ：** `ADMIN_EMAIL` と `ADMIN_PASSWORD` が設定されている場合、`instrumentation.ts` がサーバー起動時に管理者ユーザーを初期化します。パスワードリセットは本番の `DATABASE_URL` に対して `npm run seed:admin` を実行してください。

---

## プロバイダー

| プロバイダー | 状態 | 設定 |
|--------------|------|------|
| **Atlas Cloud** | 対応済み | `ATLASCLOUD_API_KEY`、`ATLASCLOUD_BASE_URL` |
| **Replicate** | 予定（未対応） | `.env.example` に将来用の変数あり。現時点では `DEFAULT_IMAGE_PROVIDER=replicate` にしないでください |
| **テストモード** | 開発 / デモ | `USE_TEST_MODE=true`、`TEST_IMAGE_URL` |

Create ページでは、ブラウザ（`localStorage`）で API キーを上書きできます。本番ではサーバー側の環境変数を推奨します。

---

## 技術スタック

- [Next.js 14](https://nextjs.org/)（App Router）
- [next-intl](https://next-intl-docs.vercel.app/) · [NextAuth.js](https://next-auth.js.org/)
- [Drizzle ORM](https://orm.drizzle.team/) + Postgres
- [Tailwind CSS](https://tailwindcss.com/) · [daisyUI](https://daisyui.com/)

---

## コントリビューション

Issue と Pull Request を歓迎します。大きな変更は、まず Issue で方向性を相談してください。

---

## まとめ

**Open Prompts** は **再利用可能な画像プロンプト** の実用的なハブを目指しています。ギャラリーで効果的なプロンプトを見つけ、選んだモデルで生成し、テンプレートをコミュニティに還元する——非公開の下書きと、公開掲載のためのモデレーションを両立します。Fork して Supabase と組み合わせて Vercel にデプロイし、好みの画像 API を接続し、Apache 2.0 の下でチーム向けにワークフローを調整できます。

このプロジェクトが役に立ったら、リポジトリに Star を付け、[GitHub Issues](https://github.com/rudy2steiner/open-prompts/issues) でフィードバックを共有してください。
