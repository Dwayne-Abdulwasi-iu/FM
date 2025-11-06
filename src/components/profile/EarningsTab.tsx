"use client"

import React, { useEffect, useState } from 'react'

type Monthly = { month: string; earnings: number }
type Stats = {
  totalEarnings: number
  totalRevenue: number
  platformCommission: number
  monthlyEarnings: Monthly[]
}

export default function EarningsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const res = await fetch('/api/profile/stats')
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setStats(data.stats)
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  const formatPrice = (p: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Earnings</h2>
      <p className="text-sm text-gray-600 mt-2">Payouts, balance, and payout history for your seller account.</p>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading earnings…</div>
        ) : !stats ? (
          <div className="text-sm text-gray-500">No earnings data available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border rounded-md">
              <div className="text-sm text-gray-500">Total Earnings</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.totalEarnings || 0)}</div>
            </div>
            <div className="p-4 bg-white border rounded-md">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue || 0)}</div>
            </div>
            <div className="p-4 bg-white border rounded-md">
              <div className="text-sm text-gray-500">Platform Commission</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.platformCommission || 0)}</div>
            </div>
          </div>
        )}

        {stats?.monthlyEarnings && (
          <div className="mt-6 bg-white border rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-700">Recent monthly earnings</h3>
            <div className="mt-3">
              {/* Sparkline with interactions */}
              <Sparkline data={stats.monthlyEarnings.map(m => m.earnings)} labels={stats.monthlyEarnings.map(m => m.month)} />
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
              {stats.monthlyEarnings.map((m: Monthly) => (
                <div key={m.month} className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">{m.month}</div>
                  <div className="text-sm font-semibold text-gray-900">{formatPrice(m.earnings || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Sparkline({ data, labels }: { data: number[]; labels?: string[] }) {
  // hooks must be declared unconditionally at top of component
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (wrapperRef.current) {
      setContainerWidth(wrapperRef.current.getBoundingClientRect().width)
    }
    const onResize = () => {
      if (wrapperRef.current) setContainerWidth(wrapperRef.current.getBoundingClientRect().width)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!data || data.length === 0) return null

  const width = Math.max(120, (data.length * 24))
  const height = 48
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - 8) + 4
    const y = height - ((d - min) / range) * (height - 12) - 6
    return { x, y }
  })

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ` L ${width-4} ${height-4} L 4 ${height-4} Z`

  const yTicks = 3
  const yValues = Array.from({ length: yTicks }, (_, i) => Math.round((max - (i * range) / (yTicks - 1)) * 100) / 100)

  const handleMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    // find nearest point
    let nearest = 0
    let bestDist = Infinity
    points.forEach((p, idx) => {
      const dx = Math.abs(p.x * (containerWidth > 0 ? (containerWidth / width) : 1) - x)
      if (dx < bestDist) { bestDist = dx; nearest = idx }
    })
    const p = points[nearest]
    setHoverIndex(nearest)
    setHoverPos({ x: p.x, y: p.y })
  }

  const handleLeave = () => {
    setHoverIndex(null)
    setHoverPos(null)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly earnings sparkline" className="w-full h-12" onMouseMove={handleMove} onMouseLeave={handleLeave}>
        {/* Y axis ticks */}
        {yValues.map((v, i) => (
          <text key={i} x={2} y={6 + (i * (height - 12) / (yTicks - 1))} fontSize={9} fill="#6b7280">{v}</text>
        ))}
        <path d={areaPath} fill="#eef2ff" />
        <polyline fill="none" stroke="#6366f1" strokeWidth={2} points={polyPoints} />
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={hoverIndex === idx ? 4 : 2} fill={hoverIndex === idx ? '#4f46e5' : '#6366f1'} />
        ))}
      </svg>

      {hoverIndex !== null && hoverPos && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full bg-gray-800 text-white text-xs px-2 py-1 rounded">
          <div>{labels?.[hoverIndex] ?? ''}</div>
          <div className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data[hoverIndex])}</div>
        </div>
      )}
    </div>
  )
}
