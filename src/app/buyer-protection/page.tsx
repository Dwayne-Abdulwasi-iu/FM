'use client'

import { Shield, CheckCircle, Clock, AlertTriangle, HelpCircle, FileText, RefreshCw, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function BuyerProtectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-10 h-10 md:w-14 md:h-14 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Buyer Protection Guarantee</h1>
              <p className="text-lg md:text-xl text-green-100 max-w-2xl">
                Shop with confidence. Every purchase is protected by our comprehensive buyer protection program.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600">Purchase Protected</div>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">30 Days</div>
              <div className="text-sm text-gray-600">Protection Period</div>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">Full</div>
              <div className="text-sm text-gray-600">Refund Eligible</div>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">24/7</div>
              <div className="text-sm text-gray-600">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* What's Covered */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            What&apos;s Covered
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 text-lg mb-3">Digital Downloads</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>File doesn&apos;t match description or preview</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Corrupted or unopenable files</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Wrong file format delivered</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Missing components promised in listing</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 text-lg mb-3">Custom Commissions</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Designer doesn&apos;t deliver within agreed time</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Final work significantly differs from agreed scope</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Designer becomes unresponsive</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Escrow protection for milestone payments</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 text-lg mb-3">Print-on-Demand Products</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Product arrives damaged or defective</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Print quality doesn&apos;t match preview</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Wrong size or color delivered</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Order lost in transit</span>
                </li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 text-lg mb-3">Boutique Products</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Item doesn&apos;t match listing photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Authenticity guarantee for designer items</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Package lost or damaged in shipping</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Significantly misrepresented condition</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            How It Works
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-blue-200 hidden md:block" />
            
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xl relative z-10">
                  1
                </div>
                <div className="flex-1 bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">Make Your Purchase</h3>
                  <p className="text-gray-600">
                    Every transaction on our platform is automatically protected. No extra steps needed – buyer protection is included with every order.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xl relative z-10">
                  2
                </div>
                <div className="flex-1 bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">Receive Your Order</h3>
                  <p className="text-gray-600">
                    For digital products, download immediately. For physical items, track your shipment. Your protection period begins upon delivery confirmation.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xl relative z-10">
                  3
                </div>
                <div className="flex-1 bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">Report Any Issues</h3>
                  <p className="text-gray-600">
                    If something isn&apos;t right, open a dispute within 30 days. Provide photos or evidence and describe the issue. We&apos;ll review within 48 hours.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xl relative z-10">
                  4
                </div>
                <div className="flex-1 bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">Get Resolved</h3>
                  <p className="text-gray-600">
                    Our team mediates between you and the seller. Valid claims receive a full refund, replacement, or appropriate resolution based on the situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dispute Process */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            Filing a Dispute
          </h2>
          <div className="bg-white border rounded-xl p-8 shadow-sm">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-4">Required Information</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">1</span>
                    <span>Order number and date of purchase</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">2</span>
                    <span>Clear description of the issue</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">3</span>
                    <span>Photos or screenshots as evidence</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">4</span>
                    <span>Any communication with the seller</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-4">Resolution Timeline</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-gray-600">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>24 hours:</strong> Initial review and seller notification</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>48-72 hours:</strong> Seller response period</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>5-7 days:</strong> Final resolution for complex cases</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <DollarSign className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>3-5 business days:</strong> Refund processing time</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Not Covered */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            What&apos;s Not Covered
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Change of mind after download/delivery</span>
              </li>
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Disputes opened after 30-day window</span>
              </li>
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Claims with no supporting evidence</span>
              </li>
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Payments made outside our platform</span>
              </li>
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Subjective quality preferences for custom work</span>
              </li>
              <li className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Unauthorized use or redistribution issues</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Escrow Protection for Commissions */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            Escrow Protection for Commissions
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8">
            <p className="text-gray-700 mb-6 text-lg">
              For custom commissions, your payment is held securely in escrow until you&apos;re satisfied with the work.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Secure Payment</h4>
                <p className="text-sm text-gray-600">Funds held safely until milestones are met</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Milestone Releases</h4>
                <p className="text-sm text-gray-600">Approve each stage before releasing funds</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Dispute Resolution</h4>
                <p className="text-sm text-gray-600">Fair mediation if issues arise</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 md:p-12">
            <Shield className="w-16 h-16 mx-auto mb-6 text-green-400" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Shop with Confidence</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Every purchase on our platform is backed by our buyer protection guarantee. 
              Have questions? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/designs"
                className="inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Shopping
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Note */}
      <div className="bg-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>
            Buyer Protection is subject to our <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>.
            For full policy details, please review our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
