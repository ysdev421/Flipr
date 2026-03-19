export type Platform = 'rakuten' | 'yahoo'
export type KaitoriShop = 'morimori' | 'kaitoriwiki' | 'kaitorishouten'
export type SortKey = 'profit_rate' | 'profit' | 'updated_at'

export interface ProfitItem {
  product_id: string
  name: string
  category: string | null
  jan_code: string
  platform: Platform
  sale_price: number
  real_price: number
  best_kaitori_price: number
  best_kaitori_shop: KaitoriShop
  profit: number
  profit_rate: number
  item_url: string | null
  image_url: string | null
  updated_at: string
}

export interface UserSettings {
  rakuten_spu_rate: number
  rakuten_campaign_rate: number
  yahoo_store_bonus: number
}

export interface FilterState {
  platform: Platform | 'all'
  minProfitRate: number
  sortKey: SortKey
  sortAsc: boolean
}
