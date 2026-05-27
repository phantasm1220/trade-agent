# AI Trade Agent

Yahoo Finance v8 APIからリアルタイム株価を取得し、**Gemini 2.5 Flash Lite** が売買判断を行うデモトレードアプリ。

## 仕組み

```
ブラウザ → Next.js (Vercel) → Yahoo Finance v8 API  (株価・サーバーサイド)
                           → Gemini 2.5 Flash Lite  (売買判断・失敗分析)
```

サーバーサイドで実行するためCORSの問題が一切ない。

---

## 必要なAPIキー

| キー | 用途 | 取得先 | 料金 |
|------|------|--------|------|
| `GEMINI_API_KEY` | AI売買判断・失敗分析 | https://aistudio.google.com/apikey | **無料枠あり（1日1500リクエスト）** |
| `FINNHUB_API_KEY` | 米国株の高速取得（任意） | https://finnhub.io | 無料 |

---

## デプロイ手順（Vercel・無料）

### 1. GitHubにアップロード

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/ai-trade-agent.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. https://vercel.com にアクセス（GitHubアカウントで無料登録）
2. 「New Project」→ GitHubリポジトリを選択 → 「Deploy」

### 3. 環境変数を設定

Vercelダッシュボード → Project → Settings → Environment Variables:

| 変数名 | 値 |
|--------|-----|
| `GEMINI_API_KEY` | `AIzaSy...` |
| `FINNHUB_API_KEY` | （任意）|

設定後「Redeploy」を実行。

### 4. 完成

`https://あなたのプロジェクト名.vercel.app` でアクセス可能。

---

## ローカル開発

```bash
npm install
cp .env.local.example .env.local
# .env.local を編集してGEMINI_API_KEYを設定
npm run dev
# → http://localhost:3000
```

---

## 機能

- 🇯🇵 日本株 10銘柄 / 🇺🇸 米国株 10銘柄
- Yahoo Finance v8 リアルタイム株価（サーバーサイド取得）
- RSI・SMA・EMA・ボリンジャーバンド・MACD 自動計算
- 損切ライン・利益目標・指値のチャート表示
- Gemini 2.5 Flash Lite による売買判断
- 失敗分析 → トレードルール自動追加
- トレーリングストップ・サーキットブレーカー

---

⚠️ デモトレードです。実際の売買は行われません。
