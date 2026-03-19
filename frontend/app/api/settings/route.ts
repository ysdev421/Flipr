import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('rakuten_spu_rate, rakuten_campaign_rate, yahoo_store_bonus')
    .eq('user_id', 'default')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rakuten_spu_rate, rakuten_campaign_rate, yahoo_store_bonus } = body

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: 'default',
      rakuten_spu_rate: Number(rakuten_spu_rate ?? 0),
      rakuten_campaign_rate: Number(rakuten_campaign_rate ?? 0),
      yahoo_store_bonus: Number(yahoo_store_bonus ?? 0),
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
