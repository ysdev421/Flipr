import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const platform = searchParams.get('platform') // 'rakuten' | 'yahoo' | null
  const minProfitRate = Number(searchParams.get('minProfitRate') ?? 0)
  const sortKey = searchParams.get('sortKey') ?? 'profit_rate'
  const sortAsc = searchParams.get('sortAsc') === 'true'

  let query = supabase
    .from('profit_summary')
    .select(`
      id,
      product_id,
      platform,
      sale_price,
      real_price,
      best_kaitori_price,
      best_kaitori_shop,
      profit,
      profit_rate,
      updated_at,
      products!inner (
        name,
        jan_code,
        category
      ),
      sale_prices (
        item_url,
        image_url
      )
    `)

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }

  if (minProfitRate > 0) {
    query = query.gte('profit_rate', minProfitRate)
  }

  const validSortKeys = ['profit_rate', 'profit', 'updated_at']
  const safeSort = validSortKeys.includes(sortKey) ? sortKey : 'profit_rate'
  query = query.order(safeSort, { ascending: sortAsc })

  const { data, error } = await query.limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // フラットに整形
  const items = (data ?? []).map((row: any) => ({
    product_id: row.product_id,
    name: row.products?.name ?? '',
    jan_code: row.products?.jan_code ?? '',
    category: row.products?.category ?? null,
    platform: row.platform,
    sale_price: row.sale_price,
    real_price: row.real_price,
    best_kaitori_price: row.best_kaitori_price,
    best_kaitori_shop: row.best_kaitori_shop,
    profit: row.profit,
    profit_rate: row.profit_rate,
    item_url: row.sale_prices?.[0]?.item_url ?? null,
    image_url: row.sale_prices?.[0]?.image_url ?? null,
    updated_at: row.updated_at,
  }))

  return NextResponse.json(items)
}
