# moomoo リアルタイム株価エージェント

PCのmoomoo OpenDからリアルタイム株価を取得して、VercelのアプリにPUSHします。

## セットアップ手順

### 1. .envファイルを設定する

`pc-agent/.env` をメモ帳で開いて2箇所を書き換えます：

```
VERCEL_URL=https://trade-agent-xxxxx.vercel.app   ← VercelのURL
PUSH_SECRET=mySecret2025abc                        ← 自分で決めたキー（英数字）
```

### 2. Vercelの環境変数に PUSH_SECRET を追加する

Vercelダッシュボード → Project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `PUSH_SECRET` | `.envに設定したのと同じ値` |

設定後「Redeploy」を実行。

### 3. moomoo OpenDを起動する

moomoo OpenDを起動してmoomoo証券アカウントでログイン。
タスクバーに緑の「Connected」表示が出ればOK。

### 4. エージェントを起動する

`start_agent.bat` をダブルクリック。

初回は自動的に `pip install moomoo-api` が実行されます。

起動すると以下のように表示されます：
```
[09:30:00] ✅ 送信先: https://trade-agent.vercel.app
[09:30:00] ✅ OpenD 接続成功
[09:30:00] 📡 監視銘柄: 20銘柄 (JP:10, US:10)
[09:30:01] 📊 取得成功: 20銘柄
[09:30:01] ✅ 送信成功
[09:30:01] 💤 30秒後に次のサイクル...
```

### 5. アプリで確認する

ブラウザでVercelのURLにアクセスして「↻ 株価更新」を押すと、
moomooのリアルタイム価格が表示されます。

マーケットタブでデータソースが `moomoo_live` になっていれば成功です。

## 注意事項

- このエージェントが動いている間だけリアルタイム更新されます
- PCをスリープにするとエージェントが停止します
- 市場が閉まっている時間帯は価格が変化しません（正常）
- moomoo OpenDを先に起動してからエージェントを起動してください
