'use client'

import { Shield, CheckCircle, Clock, AlertTriangle, HelpCircle, FileText, RefreshCw, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function BuyerProtectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Buyer Protection Guarantee</h1>
              <p className="text-sm md:text-base text-green-100 max-w-2xl">
                Shop with confidence. Every purchase is protected by our comprehensive buyer protection program.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">100%</div>
              <div className="text-xs text-gray-600">Purchase Protected</div>
            </div>
            <div className="p-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">30 Days</div>
              <div className="text-xs text-gray-600">Protection Period</div>
            </div>
            <div className="p-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">Full</div>
              <div className="text-xs text-gray-600">Refund Eligible</div>
            </div>
            <div className="p-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">24/7</div>
              <div className="text-xs text-gray-600">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* What's Covered */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            What&apos;s Covered
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <h3 className="font-semibold text-green-800 text-sm mb-2">Digital Downloads</h3>
              <ul className="space-y-1 text-green-700 text-xs">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">File doesn&apos;t match description or preview</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Corrupted or unopenable files</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Wrong file format delivered</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Missing components promised in listing</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <h3 className="font-semibold text-green-800 text-sm mb-2">Custom Commissions</h3>
              <ul className="space-y-1 text-green-700 text-xs">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Designer doesn&apos;t deliver within agreed time</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Final work significantly differs from agreed scope</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Designer becomes unresponsive</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Escrow protection for milestone payments</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <h3 className="font-semibold text-green-800 text-sm mb-2">Print-on-Demand Products</h3>
              <ul className="space-y-1 text-green-700 text-xs">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Product arrives damaged or defective</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Print quality doesn&apos;t match preview</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Wrong size or color delivered</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Order lost in transit</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <h3 className="font-semibold text-green-800 text-sm mb-2">Boutique Products</h3>
              <ul className="space-y-1 text-green-700 text-xs">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Item doesn&apos;t match listing photos</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Authenticity guarantee for designer items</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Package lost or damaged in shipping</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">Significantly misrepresented condition</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            How It Works
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-blue-200 hidden md:block" />
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg relative z-10">
                  1
                </div>
                <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Make Your Purchase</h3>
                  <p className="text-gray-600 text-xs">
                    Every transaction on our platform is automatically protected. No extra steps needed – buyer protection is included with every order.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg relative z-10">
                  2
                </div>
                <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Receive Your Order</h3>
                  <p className="text-gray-600 text-xs">
                    For digital products, download immediately. For physical items, track your shipment. Your protection period begins upon delivery confirmation.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg relative z-10">
                  3
                </div>
                <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Report Any Issues</h3>
                  <p className="text-gray-600 text-xs">
                    If something isn&apos;t right, open a dispute within 30 days. Provide photos or evidence and describe the issue. We&apos;ll review within 48 hours.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg relative z-10">
                  4
                </div>
                <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Get Resolved</h3>
                  <p className="text-gray-600 text-xs">
                    Our team mediates between you and the seller. Valid claims receive a full refund, replacement, or appropriate resolution based on the situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dispute Process */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            Filing a Dispute
          </h2>
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">Required Information</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                    <span>Order number and date of purchase</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                    <span>Clear description of the issue</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                    <span>Photos or screenshots as evidence</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
                    <span>Any communication with the seller</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">Resolution Timeline</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <Clock className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>24 hours:</strong> Initial review and seller notification</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <Clock className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>48-72 hours:</strong> Seller response period</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <Clock className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>5-7 days:</strong> Final resolution for complex cases</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600 text-xs">
                    <DollarSign className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>3-5 business days:</strong> Refund processing time</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Not Covered */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            What&apos;s Not Covered
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <ul className="grid md:grid-cols-2 gap-2 text-xs">
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Change of mind after download/delivery</span>
              </li>
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Disputes opened after 30-day window</span>
              </li>
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Claims with no supporting evidence</span>
              </li>
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Payments made outside our platform</span>
              </li>
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Subjective quality preferences for custom work</span>
              </li>
              <li className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Unauthorized use or redistribution issues</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Escrow Protection for Commissions */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Escrow Protection for Commissions
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <p className="text-gray-700 mb-4 text-xs">
              For custom commissions, your payment is held securely in escrow until you&apos;re satisfied with the work.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Secure Payment</h4>
                <p className="text-xs text-gray-600">Funds held safely until milestones are met</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Milestone Releases</h4>
                <p className="text-xs text-gray-600">Approve each stage before releasing funds</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Dispute Resolution</h4>
                <p className="text-xs text-gray-600">Fair mediation if issues arise</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 md:p-6">
            <Shield className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <h2 className="text-lg md:text-xl font-bold mb-2">Shop with Confidence</h2>
            <p className="text-gray-300 mb-4 max-w-xl mx-auto text-xs">
              Every purchase on our platform is backed by our buyer protection guarantee. 
              Have questions? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/designs"
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold text-xs rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Shopping
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2 bg-white/10 text-white font-semibold text-xs rounded-lg hover:bg-white/20 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Note */}
      <div className="bg-gray-100 py-3">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-600">
          <p>
            Buyer Protection is subject to our <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>.
            For full policy details, please review our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
