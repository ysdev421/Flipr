'use client'

interface Props {
  profit: number
  profitRate: number
}

export default function ProfitBadge({ profit, profitRate }: Props) {
  const isPositive = profit > 0
  const color = isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>
        {profitRate.toFixed(1)}%
      </span>
      <span className={`text-sm font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
        {isPositive ? '+' : ''}{profit.toLocaleString()}円
      </span>
    </div>
  )
}
