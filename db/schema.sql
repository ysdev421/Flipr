-- 商品マスタ
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jan_code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 販売価格（楽天/Yahoo）
CREATE TABLE IF NOT EXISTS sale_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform VARCHAR(10) NOT NULL,
  price INTEGER NOT NULL,
  point_rate FLOAT NOT NULL,
  real_price INTEGER NOT NULL,
  item_url TEXT,
  image_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, platform)
);

-- 買取価格
CREATE TABLE IF NOT EXISTS kaitori_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  shop VARCHAR(30) NOT NULL,
  price INTEGER NOT NULL,
  condition VARCHAR(20),
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, shop, condition)
);

-- 利益サマリ（計算済みキャッシュ）
CREATE TABLE IF NOT EXISTS profit_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform VARCHAR(10) NOT NULL,
  sale_price INTEGER NOT NULL,
  real_price INTEGER NOT NULL,
  best_kaitori_price INTEGER NOT NULL,
  best_kaitori_shop VARCHAR(30) NOT NULL,
  profit INTEGER NOT NULL,
  profit_rate FLOAT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, platform)
);

-- ユーザー設定
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rakuten_spu_rate FLOAT DEFAULT 0,
  rakuten_campaign_rate FLOAT DEFAULT 0,
  yahoo_store_bonus FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
