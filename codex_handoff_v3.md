# 🚀 Codex引き継ぎドキュメント v3
## 現在の状態（2026-03-19時点）

---

## ✅ 完了済み

### インフラ
- Vercel デプロイ済み: https://flipr-n4vp.vercel.app/（表示確認済み）
- Supabase プロジェクト作成済み・DBスキーマ適用済み
- GitHub Actions ワークフロー作成済み（`.github/workflows/scraper.yml`）

### コード
- Next.js フロントエンド（`app/`, `components/`, `lib/`）: ルート直下に配置済み
- Supabase クライアント（`lib/supabase.ts`）
- 楽天API スクレイパー（`scraper/rakuten_api.py`）
- 森森買取 スクレイパー（`scraper/morimori.py`）
- 利益計算バッチ（`scraper/profit_calc.py`）
- DBスキーマ（`db/schema.sql`）

### ディレクトリ構成（変更後）
```
Flipr/                          ← リポジトリルート = Next.jsルート
├── app/                        # Next.js App Router
├── components/
├── lib/supabase.ts
├── scraper/
│   ├── rakuten_api.py
│   ├── morimori.py
│   ├── profit_calc.py
│   └── requirements.txt
├── db/schema.sql
├── .github/workflows/scraper.yml
└── vercel.json                 # {"framework": "nextjs"}
```

---

## 🔴 未解決の問題

### 1. 楽天API 認証エラー（最優先）
- **エラー**: `{"error_description":"specify valid applicationId","error":"wrong_parameter"}`
- **原因**: 楽天の新しい開発者ポータル（developers.rakuten.com 系）で発行したアプリIDが、旧来の Rakuten Webservice API（`app.rakuten.co.jp/services/api/`）と互換性がない可能性
- **試したこと**:
  - Application ID（UUID形式: `51beb924-...`）→ NG
  - Access Key → NG
  - ブラウザから直接URLアクセス → 同じエラー
- **未試行の解決策**:
  - 旧ポータル `https://webservice.rakuten.co.jp/app/create` でアプリを新規作成 → 数字のみのアプリIDを取得して試す

### 2. 森森買取スクレイパー 商品リンク0件
- **状況**: カテゴリページ（`/category/0104`, `/category/0101`）にアクセスできているが商品リンクが0件
- **考えられる原因**: JavaScript遅延レンダリング or ボット対策
- **試したこと**: networkidle待ち + 全リンク走査に変更済み
- **未試行の解決策**:
  - ページのHTMLをログに出力して実際のリンク構造を確認
  - User-Agentの変更
  - スクリーンショットを撮ってデバッグ

---

## 🔧 GitHub Secrets（設定済み）

| Name | 内容 |
|------|------|
| `SUPABASE_URL` | SupabaseのProject URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role キー |
| `RAKUTEN_APP_ID` | 楽天アクセスキー（要再確認） |

Vercel 環境変数（設定済み）:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAKUTEN_APP_ID`

---

## 📋 残りのPhase 1タスク

- [ ] 楽天API認証修正 → Nintendo Switch 100件取得
- [ ] 森森買取スクレイパー修正 → DBに買取価格保存
- [ ] JANコード突合・利益計算の動作確認
- [ ] フロントエンドにデータが表示されることを確認
- [ ] SPU倍率設定画面の動作確認（`/settings`）

---

## 💡 デバッグ方法

### 森森買取のHTML構造確認
`scraper/morimori.py` の `scrape_category` 関数内に以下を追加してHTMLを確認:
```python
html = await page.content()
logger.info("HTML先頭500文字: %s", html[:500])
```

### 楽天API動作確認
旧ポータルのアプリID取得後、ブラウザで以下を確認:
```
https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706?applicationId=YOUR_APP_ID&keyword=Nintendo+Switch&hits=1&format=json
```

---

*更新: 2026-03-19*
