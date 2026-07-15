# 投稿受付係（Cloudflare Workers）セットアップ

投稿ページから「公開する」だけ押せるようにする手順です。  
GitHub の鍵は Cloudflare の金庫に置き、画面には出しません。

## 1. GitHub トークンを作る（1回だけ・画面には貼らない）

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. Fine-grained token を作成
3. Repository access: `hainedot/hainedot` のみ
4. Permissions → **Contents: Read and write**
5. 発行された `github_pat_...` をメモ（あとで Cloudflare に入れる）

## 2. Cloudflare アカウント

1. [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) で無料登録
2. ログイン

## 3. Worker を作る

1. 左メニュー **Workers & Pages** → **Create** → **Create Worker**
2. 名前例: `hainedot-publish`
3. **Deploy**
4. **Edit code**
5. エディタの中身をすべて消して、このリポジトリの `worker/publish.js` を全部コピーして貼る
6. **Deploy**

## 4. 金庫（シークレット）を入れる

Worker のページ → **Settings** → **Variables**

| 種類 | 名前 | 値 |
|------|------|-----|
| Secret | `GITHUB_TOKEN` | さっきの GitHub トークン |
| Secret | `PUBLISH_PASSWORD` | あなただけが知る合言葉（例: 好きな短い言葉） |

保存する。

## 5. Worker の URL を控える

Worker 一覧に `https://hainedot-publish.xxxxx.workers.dev` のような URL が出ます。  
それをコピー。

## 6. サイト側の設定

`post/config.js` を開き、次を書き換え:

```js
window.HAINEDOT_PUBLISH_URL = "https://（あなたのWorkerURL）";
```

保存して GitHub に push（または Cursor に「URL入れたから push して」と頼む）。

## 7. 投稿する

1. [https://hainedot.com/post/](https://hainedot.com/post/) を開く
2. 詩と写真を入れる
3. **合言葉**（`PUBLISH_PASSWORD` と同じ）を入れる（初回だけ・PCに保存可）
4. **公開する**

1〜2分後にサイトへ反映されます。

---

## うまくいかないとき

- 「受付係のURLが未設定」→ `post/config.js` を確認
- 「合言葉が違います」→ Cloudflare の `PUBLISH_PASSWORD` と入力が一致しているか
- 「GitHub API エラー」→ トークンの権限・期限を確認
