'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TestTube2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Play, 
  Pause, 
  StopCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface PriceTestDesign {
  id: string
  title: string
  price: number
  imageUrl: string
  totalSales: number
  viewCount: number
  canTest: boolean
  suggestedPriceVariants: number[]
}

interface PriceTestWidgetProps {
  design: PriceTestDesign
  sellerTier?: string | null // Must be VIP_DESIGNER or VVIP_DESIGNER (Tier 3+)
  onTestStart?: (designId: string, variantPrice: number) => void
  onTestStop?: (designId: string) => void
  className?: string
}

// Tier 3+ required for A/B testing
const ALLOWED_TIERS = ['VIP_DESIGNER', 'VVIP_DESIGNER']

export function PriceTestWidget({ 
  design, 
  sellerTier,
  onTestStart, 
  onTestStop,
  className = '' 
}: PriceTestWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [testDuration, setTestDuration] = useState(14)
  const [isLoading, setIsLoading] = useState(false)
  const [testActive, setTestActive] = useState(false)
  
  // Check if seller has Tier 3+ access
  const hasTierAccess = sellerTier && ALLOWED_TIERS.includes(sellerTier)

  const handleStartTest = async () => {
    if (!selectedVariant) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/seller/price-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          variantPrice: selectedVariant,
          durationDays: testDuration,
        }),
      })
      
      if (response.ok) {
        setTestActive(true)
        onTestStart?.(design.id, selectedVariant)
      }
    } catch (error) {
      console.error('Failed to start price test:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopTest = async () => {
    setIsLoading(true)
    try {
      await fetch(`/api/seller/price-test?testId=${design.id}`, {
        method: 'DELETE',
      })
      setTestActive(false)
      onTestStop?.(design.id)
    } catch (error) {
      console.error('Failed to stop price test:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!design.canTest) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <TestTube2 className="w-5 h-5" />
          <span className="text-sm">Need 5+ sales to enable A/B testing</span>
        </div>
      </div>
    )
  }
  
  // Show upgrade prompt for non-VIP sellers
  if (!hasTierAccess) {
    return (
      <div className={`p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <TestTube2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              A/B Price Testing
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Test different price points to maximize your revenue. Available for VIP Designers (Tier 3) and above.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-purple-600 dark:text-purple-400 mb-3">
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                💎 VIP Designer required
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                50+ sales needed
              </span>
            </div>
            <a
              href="/seller/upgrade"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade to VIP
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <TestTube2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            A/B Price Testing
          </span>
          {testActive && (
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
              Active
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
              {testActive ? (
                // Active test view
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 dark:text-green-400 font-medium">
                        Test Running
                      </span>
                    </div>
                    <button
                      onClick={handleStopTest}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop Test
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Control (A)</div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {formatPrice(design.price)}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                      <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Variant (B)</div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {formatPrice(selectedVariant || design.price)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Results will be available after the test completes
                  </div>
                </div>
              ) : (
                // Setup view
                <>
                  {/* How it works section */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">How A/B Price Testing Works</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <p><strong>You set two prices</strong> — your current price (Control) and a test price (Variant)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <p><strong>Visitors are randomly split</strong> — 50% see your current price, 50% see the test price</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <p><strong>Each visitor always sees the same price</strong> — if they come back later, they see the same price they saw before</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <p><strong>After the test period</strong> — we show you which price made more money so you can decide</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>💡 Tip:</strong> A higher price might sell less but make more money overall. 
                        A lower price might sell more but reduce your profit. Test to find the sweet spot!
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Price: <span className="text-primary-600">{formatPrice(design.price)}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {design.suggestedPriceVariants.map((price) => {
                        const diff = ((price - design.price) / design.price) * 100
                        const isHigher = diff > 0
                        return (
                          <button
                            key={price}
                            onClick={() => setSelectedVariant(price)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedVariant === price
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {isHigher ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatPrice(price)}
                              </span>
                            </div>
                            <div className={`text-xs mt-1 ${isHigher ? 'text-green-600' : 'text-red-600'}`}>
                              {isHigher ? '+' : ''}{diff.toFixed(0)}%
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* Custom price option */}
                    <div className="mt-3">
                      <label htmlFor="custom-price" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Or enter a custom test price:
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            id="custom-price"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder={design.price.toString()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              if (val > 0) setSelectedVariant(val)
                            }}
                            className="w-full pl-7 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="test-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Duration
                    </label>
                    <select
                      id="test-duration"
                      value={testDuration}
                      onChange={(e) => setTestDuration(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days (recommended)</option>
                      <option value={21}>21 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>

                  <button
                    onClick={handleStartTest}
                    disabled={!selectedVariant || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start A/B Test
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Price Test Results Component
 */
interface PriceTestResultsProps {
  testId: string
  designTitle: string
  controlPrice: number
  variantPrice: number
  results: {
    control: { views: number; sales: number; revenue: number }
    variant: { views: number; sales: number; revenue: number }
  }
  winner: 'control' | 'variant' | 'inconclusive'
  className?: string
}

export function PriceTestResults({
  designTitle,
  controlPrice,
  variantPrice,
  results,
  winner,
  className = '',
}: PriceTestResultsProps) {
  const controlCR = results.control.views > 0 
    ? (results.control.sales / results.control.views * 100).toFixed(2) 
    : '0'
  const variantCR = results.variant.views > 0 
    ? (results.variant.sales / results.variant.views * 100).toFixed(2) 
    : '0'

  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Test Results: {designTitle}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Control */}
        <div className={`p-4 rounded-lg ${winner === 'control' ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Control (A)</span>
            {winner === 'control' && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">Winner</span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {formatPrice(controlPrice)}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Views</span>
              <span className="font-medium text-gray-900 dark:text-white">{results.control.views}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sales</span>
              <span className="font-medium text-gray-900 dark:text-white">{results.control.sales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Conversion</span>
              <span className="font-medium text-gray-900 dark:text-white">{controlCR}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(results.control.revenue)}</span>
            </div>
          </div>
        </div>

        {/* Variant */}
        <div className={`p-4 rounded-lg ${winner === 'variant' ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Variant (B)</span>
            {winner === 'variant' && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">Winner</span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {formatPrice(variantPrice)}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Views</span>
              <span className="font-medium text-gray-900 dark:text-white">{results.variant.views}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sales</span>
              <span className="font-medium text-gray-900 dark:text-white">{results.variant.sales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Conversion</span>
              <span className="font-medium text-gray-900 dark:text-white">{variantCR}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(results.variant.revenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`p-4 rounded-lg ${
        winner === 'inconclusive' 
          ? 'bg-yellow-50 dark:bg-yellow-900/20' 
          : 'bg-green-50 dark:bg-green-900/20'
      }`}>
        <div className="flex items-start gap-3">
          <DollarSign className={`w-5 h-5 ${
            winner === 'inconclusive' ? 'text-yellow-600' : 'text-green-600'
          }`} />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Recommendation</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {winner === 'control' && `Keep your current price at ${formatPrice(controlPrice)}. It performs better overall.`}
              {winner === 'variant' && `Update your price to ${formatPrice(variantPrice)}. It generates more revenue.`}
              {winner === 'inconclusive' && 'Results are too close to determine a winner. Consider running a longer test or testing a more significant price difference.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
