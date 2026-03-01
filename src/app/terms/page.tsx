import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText, Shield, Users, CreditCard, Upload, AlertTriangle, Scale } from 'lucide-react'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.terms)

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3 text-[10px] sm:text-sm"
          >
            <ArrowLeft className="h-3 h-3 sm:h-4 sm:w-4 mr-1.5" />
            Back to Home
          </Link>
          
          <div className="flex items-center mb-2 sm:mb-3 gap-2 sm:gap-3">
            <FileText className="h-5 h-5 sm:h-8 sm:w-8 text-indigo-600 flex-shrink-0" />
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          
          <p className="text-[8px] sm:text-sm text-gray-600">
            Last updated: February 19, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded shadow-sm p-3 sm:p-8">
          <div className="space-y-3 sm:space-y-8">
            
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Scale className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>1. Agreement to Terms</span>
              </h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">
                By accessing and using Fashion Marketplace, you accept these terms in their entirety.
              </p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">2. Platform Overview</h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">Fashion Marketplace connects designers with buyers. Services include:</p>
              <ul className="list-disc list-inside ml-4 text-[10px] sm:text-base text-gray-700 space-y-1">
                <li>Design uploads & portfolios</li>
                <li>Digital design sales (30% commission)</li>
                <li>Print-on-Demand products (40% commission)</li>
                <li>Boutique/physical products (20-30% tiered commission)</li>
                <li>Payment processing & payouts</li>
                <li>Dispute resolution & buyer protection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>3. Account Requirements</span>
              </h2>
              <ul className="list-disc list-inside text-[10px] sm:text-base text-gray-700 space-y-1">
                <li>Must be 13+ years old</li>
                <li>Accounts must be real humans (no bots)</li>
                <li>Accurate information required</li>
                <li>You're responsible for account security and activity</li>
                <li>One account per person/entity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>4. Content & Uploads</span>
              </h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2"><strong>Your Rights:</strong> You retain ownership. We get a license to display and distribute your work.</p>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2"><strong>Requirements:</strong> Content must be original/licensed, high-quality, non-infringing, and fashion-related.</p>
              <p className="text-[10px] sm:text-base text-gray-700"><strong>Prohibited:</strong> Illegal, stolen, pornographic, or infringing content will be removed without notice.</p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>5. Payments & Commissions</span>
              </h2>
              <div className="text-[10px] sm:text-base text-gray-700 space-y-2">
                <p><strong>Pricing:</strong> Designers set prices. Taxes and fees calculated at checkout transparently.</p>
                <p><strong>Payment Processing:</strong> Stripe (USD) and PayStack (NGN) handle transactions securely.</p>
                <p><strong>Refunds:</strong> Digital items non-refundable after delivery. Physical items may be returnable per seller terms (14-30 days).</p>
                <p><strong>Payouts:</strong> Weekly/bi-weekly/monthly to verified bank accounts, minus fees and taxes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>6. Intellectual Property</span>
              </h2>
              <div className="text-[10px] sm:text-base text-gray-700 space-y-2">
                <p><strong>Platform IP:</strong> We own the platform, code, and features.</p>
                <p><strong>Your Responsibility:</strong> Ensure your content doesn't infringe third-party rights.</p>
                <p><strong>DMCA:</strong> Copyright claims handled per DMCA law. Repeat infringers lose accounts.</p>
                <p><strong>Buyer License:</strong> Buyers get personal use license only (unless commercial license purchased). No redistribution allowed.</p>
              </div>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">7. Seller Obligations</h2>
              <p className="text-[10px] sm:text-base text-gray-700"><strong>All Sellers:</strong> Ship/deliver on time, accurate descriptions, respond promptly, handle disputes fairly, comply with laws.</p>
              <p className="text-[10px] sm:text-base text-gray-700 mt-1"><strong>Boutique:</strong> Manage inventory, respect customer returns.</p>
              <p className="text-[10px] sm:text-base text-gray-700 mt-1"><strong>Digital:</strong> Deliver files as promised, honor licenses.</p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">8. Buyer Protections</h2>
              <ul className="list-disc list-inside text-[10px] sm:text-base text-gray-700 space-y-1">
                <li>Money-back if items don't arrive</li>
                <li>Escrow for high-value purchases</li>
                <li>30-day dispute window</li>
                <li>Fraud protection</li>
                <li>Return/refund processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
                <span>9. Prohibited Activities</span>
              </h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">You may NOT:</p>
              <ul className="list-disc list-inside ml-4 text-[10px] sm:text-base text-gray-700 space-y-1">
                <li>Break laws or use for unlawful purposes</li>
                <li>Infringe intellectual property rights</li>
                <li>Harass, abuse, or discriminate</li>
                <li>Submit false information</li>
                <li>Upload malware or viruses</li>
                <li>Spam, phish, or scrape content</li>
                <li>Commit fraud or chargebacks</li>
                <li>Manipulate reviews or ratings</li>
                <li>Use bots without authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">10. Account Termination</h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">We may terminate accounts for: policy violations, fraud, copyright issues, inappropriate content, or payment problems.</p>
              <p className="text-[10px] sm:text-base text-gray-700">Data retained per legal requirements (7 years for financial records).</p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">11. Liability Limits</h2>
              <p className="text-[10px] sm:text-base text-gray-700">Service provided "as-is" without warranties. We're not liable for indirect damages. Our liability capped at amounts you paid in the last 12 months.</p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">12. Other Terms</h2>
              <p className="text-[10px] sm:text-base text-gray-700"><strong>Indemnification:</strong> You protect us from claims related to your use.</p>
              <p className="text-[10px] sm:text-base text-gray-700 mt-1"><strong>Governing Law:</strong> Nigerian law applies.</p>
              <p className="text-[10px] sm:text-base text-gray-700 mt-1"><strong>Changes:</strong> We may update these terms with 30 days notice. Continued use means you accept changes.</p>
            </section>

            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">13. Contact Us</h2>
              <div className="text-[10px] sm:text-base text-gray-700">
                <p className="mb-2">Questions?</p>
                <ul className="space-y-0.5">
                  <li><strong>Email:</strong> support@fashionmarketplace.store</li>
                  <li><strong>Phone:</strong> +234-810-4912-270</li>
                  <li><strong>WhatsApp:</strong> +234-810-4912-270</li>
                  <li><strong>Address:</strong> Lagos, Nigeria</li>
                </ul>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center flex-wrap">
          <Link href="/privacy" className="text-indigo-600 hover:underline text-[10px] sm:text-sm">Privacy Policy</Link>
          <Link href="/help" className="text-indigo-600 hover:underline text-[10px] sm:text-sm">Help & FAQ</Link>
          <Link href="/contact" className="text-indigo-600 hover:underline text-[10px] sm:text-sm">Contact Support</Link>
        </div>
      </div>
    </div>
  )
}


