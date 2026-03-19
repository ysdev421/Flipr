'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserSettings } from '@/types'

const DEFAULT_SETTINGS: UserSettings = {
  rakuten_spu_rate: 0,
  rakuten_campaign_rate: 0,
  yahoo_store_bonus: 0,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = <K extends keyof UserSettings>(key: K, value: number) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <h1 className="text-lg font-bold text-gray-800">設定</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col gap-6">

          {/* 楽天設定 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">楽天ポイント設定</h2>
            <div className="flex flex-col gap-4">
              <SliderField
                label="SPU倍率"
                unit="倍"
                value={settings.rakuten_spu_rate}
                min={0}
                max={20}
                step={0.5}
                onChange={v => set('rakuten_spu_rate', v)}
              />
              <SliderField
                label="キャンペーン倍率"
                unit="%"
                value={settings.rakuten_campaign_rate}
                min={0}
                max={30}
                step={1}
                onChange={v => set('rakuten_campaign_rate', v)}
              />
            </div>
          </section>

          {/* Yahoo設定 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Yahoo PayPayポイント設定</h2>
            <SliderField
              label="ストアボーナス率"
              unit="%"
              value={settings.yahoo_store_bonus}
              min={0}
              max={20}
              step={0.5}
              onChange={v => set('yahoo_store_bonus', v)}
            />
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : saved ? '保存しました！' : '保存'}
          </button>
        </div>
      </main>
    </div>
  )
}

function SliderField({
  label, unit, value, min, max, step, onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-600">{label}</label>
        <span className="text-sm font-semibold text-blue-600">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-300">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
