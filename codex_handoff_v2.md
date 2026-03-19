# 🚀 Codex引き継ぎドキュメント v2
## せどりリサーチSaaS — 楽天/Yahoo × 買取屋 利益発見ツール

---

## 📌 プロジェクト概要

楽天市場・Yahoo!ショッピングで販売中の商品を取得し、ポイント還元を考慮した「実質取得価格」と、買取屋3社の買取価格を比較して、**そのまま買取屋に流すだけで利益が出る商品を一覧表示するツール（自分用）**。

---

## 🎯 コアロジック

```
利益 = 最高買取価格 − 実質取得価格（ポイント込み）
実質取得価格 = 販売価格 × (1 - 合計ポイント還元率)
```

---

## 🏗️ インフラ構成（完全無料）

| 役割 | サービス | 備考 |
|------|----------|------|
| フロントエンド | Vercel (Hobbyプラン) | 無料・停止なし・自分用なら商用禁止も無関係 |
| データベース | Supabase (無料枠) | Vercelからのアクセスで2週間停止問題は自然に回避 |
| Cronバッチ | GitHub Actions | 月2000分無料・6時間ごとのcronで余裕 |
| 環境変数 | Vercel環境変数 | 無料 |

**維持費: $0**

---

## 📦 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| DB | Supabase (PostgreSQL) |
| スクレイピング | Python + Playwright |
| スケジューラ | GitHub Actions (cron) |

---

## 🔑 外部API

### 楽天市場API（無料・要アプリID）
- 登録: https://webservice.rakuten.co.jp/app/create
- エンドポイント: `IchibaItem/Search`
- 取得フィールド:
  - `itemName` 商品名
  - `itemPrice` 価格
  - `pointRate` ポイント倍率
  - `janCode` JANコード ※突合に必須
  - `itemUrl` 商品URL
  - `mediumImageUrls` 画像
- レート制限: 1秒1リクエスト → 必ずsleep(1)を入れること

### Yahoo!ショッピングAPI（無料・要クライアントID）
- 登録: https://developer.yahoo.co.jp/
- エンドポイント: `ItemSearch`
- 取得フィールド:
  - `Name` 商品名
  - `Price` 価格
  - `PointAmount` / `PointRate` PayPayポイント情報
  - `Jan` JANコード ※突合に必須
- レート制限: 1日1000リクエスト（無料）

---

## 🏪 買取屋3社のスクレイピング仕様

### 1. 森森買取（morimori-kaitori.jp）★最重要・最優先で実装

**検索URL:**
```
https://www.morimori-kaitori.jp/search?sk={JANコード}
```

**カテゴリURL:**
```
https://www.morimori-kaitori.jp/category/0101   # PS5
https://www.morimori-kaitori.jp/category/0104   # Nintendo Switch
https://www.morimori-kaitori.jp/category/0301   # iPhone
https://www.morimori-kaitori.jp/category/0108   # Xbox Series X
https://www.morimori-kaitori.jp/category/2401   # ポケモンカード
```

**取得フィールド:**
- 商品名
- JAN（ページ上に `JAN:XXXXXXXXXX` 形式で表示）
- 通常買取価格（円）
- 預かり買取価格（円）

---

### 2. 買取wiki（gamekaitori.jp）★ゲーム特化

**特徴:** ゲーム機・ゲームソフト・スマホ専門

**検索:** JANコードで検索可能（人気ワードにJAN実績あり）

**商品URLパターン:**
```
https://gamekaitori.jp/purchase/{商品スラッグ}-{JANコード}
```

**取得フィールド:**
- 商品名
- JAN
- 買取価格（円）

---

### 3. 買取商店（kaitorishouten-co.jp）★スマホ・家電特化

**特徴:** iPhone / Android / タブレット / カメラ が主力

**カテゴリURL:**
```
https://www.kaitorishouten-co.jp/category/1/17   # iPhone
https://www.kaitorishouten-co.jp/category/1/262  # Android
https://www.kaitorishouten-co.jp/category/2/70   # Apple
https://www.kaitorishouten-co.jp/category/2/278  # タブレット
https://www.kaitorishouten-co.jp/category/2/74   # カメラ
```

**備考:** 内部検索あり・JANコード検索の挙動は実装前に要確認

---

### スクレイピング共通ルール
- リクエスト間隔: **最低3秒**（`asyncio.sleep(3)`）
- 取得データはDBにキャッシュ（TTL: 6時間）
- バッチ実行は深夜2:00〜4:00推奨
- robots.txtを必ず事前確認すること

---

## 💰 ポイント計算ロジック

### 楽天ポイント
```python
def calc_rakuten_real_price(price: int, point_rate: float, spu_rate: float, campaign_rate: float) -> int:
    """
    point_rate:    通常ポイント率（通常1.0%）
    spu_rate:      ユーザーのSPU倍率（%）※ユーザー設定
    campaign_rate: キャンペーン倍率（%）※ユーザー設定
    """
    total_rate = (point_rate + spu_rate + campaign_rate) / 100
    return int(price * (1 - total_rate))
```

### Yahoo!ショッピング PayPayポイント
```python
YAHOO_CAMPAIGN_DAYS = [5, 10, 15, 20, 25]  # 毎月5のつく日 +4%

def calc_yahoo_real_price(price: int, base_point_rate: float, store_bonus_rate: float) -> int:
    """
    base_point_rate:  基本PayPayポイント率（通常1%）
    store_bonus_rate: ストアボーナス率（APIから取得）
    """
    from datetime import date
    today = date.today()
    campaign_bonus = 4.0 if today.day in YAHOO_CAMPAIGN_DAYS or today.weekday() == 6 else 0.0
    total_rate = (base_point_rate + store_bonus_rate + campaign_bonus) / 100
    return int(price * (1 - total_rate))
```

---

## 🗄️ DBスキーマ（Supabase / PostgreSQL）

```sql
-- 商品マスタ
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jan_code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 販売価格（楽天/Yahoo）
CREATE TABLE sale_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(10) NOT NULL,  -- 'rakuten' or 'yahoo'
  price INTEGER NOT NULL,
  point_rate FLOAT NOT NULL,
  real_price INTEGER NOT NULL,
  item_url TEXT,
  image_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 買取価格
CREATE TABLE kaitori_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  shop VARCHAR(30) NOT NULL,      -- 'morimori' | 'kaitoriwiki' | 'kaitorishouten'
  price INTEGER NOT NULL,
  condition VARCHAR(20),          -- '新品' | '中古' | '未開封'
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 利益サマリ（計算済みキャッシュ）
CREATE TABLE profit_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(10) NOT NULL,
  sale_price INTEGER NOT NULL,
  real_price INTEGER NOT NULL,
  best_kaitori_price INTEGER NOT NULL,
  best_kaitori_shop VARCHAR(30) NOT NULL,
  profit INTEGER NOT NULL,
  profit_rate FLOAT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー設定
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY,
  rakuten_spu_rate FLOAT DEFAULT 0,
  rakuten_campaign_rate FLOAT DEFAULT 0,
  yahoo_store_bonus FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🖥️ フロントエンドUI仕様

### メイン画面: 商品一覧テーブル

| カラム | 内容 |
|--------|------|
| 商品画像 | サムネイル |
| 商品名 | クリックで販売ページへ |
| 販売価格 | 楽天 or Yahoo |
| 実質価格 | ポイント引き後 |
| 最高買取価格 | 店名付き |
| **粗利（円）** | ハイライト表示 |
| **利益率（%）** | ここでソート |
| 最終更新 | 何時間前か表示 |

### フィルター
- カテゴリ（ゲーム機 / スマホ / カメラ / etc）
- 利益率 XX% 以上
- プラットフォーム（楽天 / Yahoo / 両方）
- ソート: 利益率順 / 粗利額順 / 更新日時順

### 設定画面
- 楽天SPU倍率スライダー（0〜20倍）
- キャンペーン倍率入力
- Yahoo ストアボーナス入力

---

## 📋 MVPスコープ

### Phase 1（まず動くものを作る）
- [ ] 楽天APIでNintendo Switchカテゴリ 100件取得
- [ ] 森森買取のゲームカテゴリをスクレイピング → DB保存
- [ ] JANコードで突合 → 利益計算
- [ ] Next.jsで一覧テーブル表示（ソート・フィルター付き）
- [ ] SPU倍率の手動入力設定画面

### Phase 2
- [ ] Yahoo!ショッピングAPI追加
- [ ] 買取wiki スクレイピング追加
- [ ] 買取商店 スクレイピング追加
- [ ] キャンペーン日カレンダー自動反映

### Phase 3（将来SaaS化するなら）
- [ ] Vercel Pro + Supabase Pro に移行（月$45〜）
- [ ] Stripe 月額課金
- [ ] アラート通知（利益率XX%以上でメール通知）
- [ ] CSVエクスポート

---

## 🗂️ ディレクトリ構成

```
project/
├── frontend/                    # Next.js
│   ├── app/
│   │   ├── page.tsx             # 商品一覧
│   │   ├── settings/page.tsx    # ユーザー設定
│   │   └── api/
│   │       ├── products/route.ts
│   │       └── settings/route.ts
│   └── components/
│       ├── ProductTable.tsx
│       ├── FilterBar.tsx
│       └── ProfitBadge.tsx
│
├── scraper/                     # Python
│   ├── morimori.py              # 森森買取
│   ├── kaitoriwiki.py           # 買取wiki
│   ├── kaitorishouten.py        # 買取商店
│   ├── rakuten_api.py           # 楽天API
│   ├── yahoo_api.py             # Yahoo API
│   └── profit_calc.py           # 利益計算
│
├── db/
│   └── schema.sql
│
└── .env.example
    # SUPABASE_URL=
    # SUPABASE_ANON_KEY=
    # RAKUTEN_APP_ID=
    # YAHOO_CLIENT_ID=
```

---

## 🔗 参考URL

- 楽天API: https://webservice.rakuten.co.jp/documentation/ichiba-item-search
- Yahoo!ショッピングAPI: https://developer.yahoo.co.jp/webapi/shopping/shopping/v3/itemsearch.html
- 森森買取: https://www.morimori-kaitori.jp/
- 買取wiki: https://gamekaitori.jp/
- 買取商店: https://www.kaitorishouten-co.jp/
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs

---

*作成日: 2026-03-17*
