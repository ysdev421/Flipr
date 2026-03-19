'use client'

import { FilterState, Platform, SortKey } from '@/types'

interface Props {
  filter: FilterState
  onChange: (f: FilterState) => void
}

export default function FilterBar({ filter, onChange }: Props) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filter, [key]: value })

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white rounded-lg shadow-sm border">
      {/* プラットフォーム */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 font-medium">プラットフォーム</label>
        <select
          className="text-sm border rounded px-2 py-1"
          value={filter.platform}
          onChange={e => set('platform', e.target.value as Platform | 'all')}
        >
          <option value="all">すべて</option>
          <option value="rakuten">楽天</option>
          <option value="yahoo">Yahoo</option>
        </select>
      </div>

      {/* 利益率フィルター */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 font-medium">利益率</label>
        <select
          className="text-sm border rounded px-2 py-1"
          value={filter.minProfitRate}
          onChange={e => set('minProfitRate', Number(e.target.value))}
        >
          <option value={0}>すべて</option>
          <option value={1}>1%以上</option>
          <option value={3}>3%以上</option>
          <option value={5}>5%以上</option>
          <option value={10}>10%以上</option>
        </select>
      </div>

      {/* ソート */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 font-medium">ソート</label>
        <select
          className="text-sm border rounded px-2 py-1"
          value={filter.sortKey}
          onChange={e => set('sortKey', e.target.value as SortKey)}
        >
          <option value="profit_rate">利益率順</option>
          <option value="profit">粗利額順</option>
          <option value="updated_at">更新日時順</option>
        </select>
        <button
          className="text-sm border rounded px-2 py-1 hover:bg-gray-50"
          onClick={() => set('sortAsc', !filter.sortAsc)}
        >
          {filter.sortAsc ? '↑ 昇順' : '↓ 降順'}
        </button>
      </div>
    </div>
  )
}
