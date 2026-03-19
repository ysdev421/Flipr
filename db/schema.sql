-- Flipr: せどりリサーチツール DBスキーマ

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
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('rakuten', 'yahoo')),
  price INTEGER NOT NULL,
  point_rate FLOAT NOT NULL DEFAULT 0,
  real_price INTEGER NOT NULL,
  item_url TEXT,
  image_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 買取価格
CREATE TABLE IF NOT EXISTS kaitori_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  shop VARCHAR(30) NOT NULL CHECK (shop IN ('morimori', 'kaitoriwiki', 'kaitorishouten')),
  price INTEGER NOT NULL,
  condition VARCHAR(20),
  scraped_at TIMESTAMPTZ DEFAULT NOW()
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー設定（シングルユーザー想定: user_id = 'default'）
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY DEFAULT 'default',
  rakuten_spu_rate FLOAT DEFAULT 0,
  rakuten_campaign_rate FLOAT DEFAULT 0,
  yahoo_store_bonus FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO user_settings (user_id) VALUES ('default') ON CONFLICT DO NOTHING;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sale_prices_product_id ON sale_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_prices_fetched_at ON sale_prices(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_kaitori_prices_product_id ON kaitori_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_kaitori_prices_scraped_at ON kaitori_prices(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_profit_summary_profit_rate ON profit_summary(profit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_profit_summary_profit ON profit_summary(profit DESC);
CREATE INDEX IF NOT EXISTS idx_profit_summary_updated_at ON profit_summary(updated_at DESC);
