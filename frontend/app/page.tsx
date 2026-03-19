'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import FilterBar from '@/components/FilterBar'
import ProductTable from '@/components/ProductTable'
import { FilterState, ProfitItem } from '@/types'

const DEFAULT_FILTER: FilterState = {
  platform: 'all',
  minProfitRate: 0,
  sortKey: 'profit_rate',
  sortAsc: false,
}

export default function HomePage() {
  const [items, setItems] = useState<ProfitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)

  const fetchItems = useCallback(async (f: FilterState) => {
    setLoading(true)
    const params = new URLSearchParams({
      platform: f.platform,
      minProfitRate: String(f.minProfitRate),
      sortKey: f.sortKey,
      sortAsc: String(f.sortAsc),
    })
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems(filter)
  }, [filter, fetchItems])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            Flipr <span className="text-sm font-normal text-gray-400">せどりリサーチ</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{items.length}件</span>
            <Link
              href="/settings"
              className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50 text-gray-600"
            >
              設定
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
        <FilterBar filter={filter} onChange={setFilter} />
        <ProductTable items={items} loading={loading} />
      </main>
    </div>
  )
}
