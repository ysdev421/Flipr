'use client'

import Image from 'next/image'
import { ProfitItem } from '@/types'
import ProfitBadge from './ProfitBadge'

const SHOP_LABELS: Record<string, string> = {
  morimori: '森森',
  kaitoriwiki: '買取wiki',
  kaitorishouten: '買取商店',
}

const PLATFORM_LABELS: Record<string, string> = {
  rakuten: '楽天',
  yahoo: 'Yahoo',
}

interface Props {
  items: ProfitItem[]
  loading: boolean
}

export default function ProductTable({ items, loading }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        データがありません
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-3 text-left w-12">画像</th>
            <th className="px-3 py-3 text-left">商品名</th>
            <th className="px-3 py-3 text-center">媒体</th>
            <th className="px-3 py-3 text-right">販売価格</th>
            <th className="px-3 py-3 text-right">実質価格</th>
            <th className="px-3 py-3 text-right">最高買取</th>
            <th className="px-3 py-3 text-right">粗利 / 利益率</th>
            <th className="px-3 py-3 text-right">更新</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={`${item.product_id}-${item.platform}`} className="hover:bg-gray-50 transition-colors">
              {/* 画像 */}
              <td className="px-3 py-2">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="object-contain rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">
                    No img
                  </div>
                )}
              </td>

              {/* 商品名 */}
              <td className="px-3 py-2 max-w-xs">
                {item.item_url ? (
                  <a
                    href={item.item_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline line-clamp-2"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span className="line-clamp-2">{item.name}</span>
                )}
                <div className="text-xs text-gray-400 mt-0.5">{item.jan_code}</div>
              </td>

              {/* 媒体 */}
              <td className="px-3 py-2 text-center">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  item.platform === 'rakuten'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {PLATFORM_LABELS[item.platform]}
                </span>
              </td>

              {/* 販売価格 */}
              <td className="px-3 py-2 text-right font-medium">
                ¥{item.sale_price.toLocaleString()}
              </td>

              {/* 実質価格 */}
              <td className="px-3 py-2 text-right text-blue-600 font-medium">
                ¥{item.real_price.toLocaleString()}
              </td>

              {/* 最高買取 */}
              <td className="px-3 py-2 text-right">
                <div className="font-medium">¥{item.best_kaitori_price.toLocaleString()}</div>
                <div className="text-xs text-gray-400">{SHOP_LABELS[item.best_kaitori_shop]}</div>
              </td>

              {/* 粗利 / 利益率 */}
              <td className="px-3 py-2 text-right">
                <ProfitBadge profit={item.profit} profitRate={item.profit_rate} />
              </td>

              {/* 更新 */}
              <td className="px-3 py-2 text-right text-xs text-gray-400">
                {formatRelativeTime(item.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.floor(diff / 60000)}分前`
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}
