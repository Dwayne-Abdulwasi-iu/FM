"use client"

import { useEffect, useState } from 'react'

interface TierInfo {
  currentTier: string
  tierName: string
  commissionRate: number
  totalEarnings: number
  isProSubscriber: boolean
  nextTier?: string | null
  nextTierThreshold?: number | null
  amountToNextTier?: number | null
  allTiers?: Array<{ key: string; effectiveRate: number }>
}

export function CommissionCalculatorWidget() {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null)
  const [price, setPrice] = useState<string>('100')
  const [shipping, setShipping] = useState<string>('0')
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    async function fetchTier() {
      try {
          const res = await fetch('/api/seller/commission-tier')
          if (!res.ok) return
          const data = await res.json()
          if (mounted) setTierInfo(data as TierInfo)
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTier()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-4 bg-white rounded-lg border border-gray-200">Loading calculator…</div>
  if (!tierInfo) return <div className="p-4 bg-white rounded-lg border border-gray-200">Sign in to view commission calculator</div>

  const unitPrice = parseFloat(price || '0') || 0
  const ship = parseFloat(shipping || '0') || 0
  const saleTotal = (unitPrice * quantity) + ship
  const currentRate = tierInfo.commissionRate || 0

  // Find next tier rate if available
  let nextTierRate = null as number | null
  if (tierInfo.allTiers && tierInfo.nextTier) {
    const next = (tierInfo.allTiers as any[]).find(t => t.key === tierInfo.nextTier)
    if (next) nextTierRate = next.effectiveRate
  }

  const platformFee = saleTotal * currentRate
  const sellerReceives = saleTotal - platformFee
  const nextTierFee = nextTierRate ? (saleTotal * nextTierRate) : null
  const savingsIfNext = nextTierRate ? Math.max(0, platformFee - nextTierFee!) : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">Commission Calculator</h4>
      <p className="text-xs text-gray-600 mb-3">Tier: <strong className="text-gray-800">{tierInfo.tierName}</strong> — Rate: <strong className="text-orange-600">{(tierInfo.commissionRate * 100).toFixed(2)}%</strong></p>

      <div className="space-y-2 text-xs">
        <div>
          <label className="block text-gray-600">Unit Price</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full mt-1 border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-gray-600">Shipping</label>
          <input type="number" value={shipping} onChange={e => setShipping(e.target.value)} className="w-full mt-1 border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-gray-600">Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} className="w-full mt-1 border rounded px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="mt-3 border-t pt-3 text-sm">
        <div className="flex justify-between text-gray-700 mb-1"><span>Total</span><span>₦{saleTotal.toLocaleString()}</span></div>
        <div className="flex justify-between text-gray-700 mb-1"><span>Platform fee ({(currentRate * 100).toFixed(2)}%)</span><span className="text-orange-600">₦{platformFee.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
        <div className="flex justify-between font-medium text-gray-900"><span>Seller receives</span><span>₦{sellerReceives.toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
        {nextTierRate && savingsIfNext !== null && (
          <div className="mt-2 text-xs text-green-700">If you reach the next tier, you could save <strong>₦{savingsIfNext.toLocaleString(undefined,{maximumFractionDigits:2})}</strong> on this sale.</div>
        )}
      </div>
    </div>
  )
}
