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
            Last updated: October 27, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded shadow-sm p-3 sm:p-8">
          <div className="space-y-3 sm:space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Scale className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>1. Agreement to Terms</span>
              </h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">
                By accessing and using the Fashion Marketplace platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
              <p className="text-[10px] sm:text-base text-gray-700">
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            {/* Account Terms */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>2. Account Terms</span>
              </h2>
              <ul className="list-disc list-inside text-[10px] sm:text-base text-gray-700 space-y-1 sm:space-y-2">
                <li>You must be 13 years or older to use this Service.</li>
                <li>You must be a human. Accounts registered by "bots" or other automated methods are not permitted.</li>
                <li>You must provide a valid email address and any other information requested in order to complete the signup process.</li>
                <li>You are responsible for maintaining the security of your account and password.</li>
                <li>You are responsible for all content posted and activity that occurs under your account.</li>
                <li>One person or legal entity may not maintain more than one free account.</li>
              </ul>
            </section>

            {/* Content and Uploads */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>3. Content and Uploads</span>
              </h2>
              <div className="space-y-2 sm:space-y-4 text-[10px] sm:text-base text-gray-700">
                <p>
                  <strong>Your Content:</strong> You retain ownership of all content you upload to the platform. However, by uploading content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the platform.
                </p>
                <p>
                  <strong>Content Standards:</strong> All uploaded content must be:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-0.5 sm:space-y-1">
                  <li>Original work or properly licensed</li>
                  <li>Free from copyright infringement</li>
                  <li>Appropriate and non-offensive</li>
                  <li>Fashion or design-related</li>
                  <li>Not containing malicious code or viruses</li>
                </ul>
                <p>
                  <strong>Prohibited Content:</strong> You may not upload content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.
                </p>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>4. Payment Terms</span>
              </h2>
              <div className="space-y-2 sm:space-y-4 text-[10px] sm:text-base text-gray-700">
                <p>
                  <strong>Pricing:</strong> Prices for designs are set by individual designers. The platform takes a commission on each sale as outlined in our seller agreement.
                </p>
                <p>
                  <strong>Payment Processing:</strong> Payments are processed through secure third-party payment processors (Stripe, PayStack). We do not store your payment information.
                </p>
                <p>
                  <strong>Refunds:</strong> Refund policies are determined by individual designers. Digital downloads are generally non-refundable unless the file is corrupted or significantly different from the description.
                </p>
                <p>
                  <strong>Designer Payouts:</strong> Designers are paid according to their chosen payout schedule, minus platform fees and applicable taxes.
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                <span>5. Intellectual Property Rights</span>
              </h2>
              <div className="space-y-2 sm:space-y-4 text-[10px] sm:text-base text-gray-700">
                <p>
                  <strong>Platform Rights:</strong> The Service and its original content, features, and functionality are and will remain the exclusive property of Fashion Marketplace and its licensors.
                </p>
                <p>
                  <strong>User Content:</strong> You acknowledge and agree that you are solely responsible for ensuring that your content does not violate any third-party rights.
                </p>
                <p>
                  <strong>DMCA Compliance:</strong> We respect intellectual property rights and will respond to clear notices of alleged copyright infringement.
                </p>
              </div>
            </section>

            {/* Prohibited Uses */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
                <span>6. Prohibited Uses</span>
              </h2>
              <p className="text-[10px] sm:text-base text-gray-700 mb-2">You may not use our Service:</p>
              <ul className="list-disc list-inside text-[10px] sm:text-base text-gray-700 space-y-1 sm:space-y-2">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
                <li>To upload or transmit viruses or any other type of malicious code</li>
                <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                <li>For any obscene or immoral purpose</li>
                <li>To interfere with or circumvent the security features of the Service</li>
              </ul>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">7. Termination</h2>
              <div className="space-y-2 sm:space-y-4 text-[10px] sm:text-base text-gray-700">
                <p>
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
                <p>
                  If you wish to terminate your account, you may simply discontinue using the Service.
                </p>
              </div>
            </section>

            {/* Disclaimer */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">8. Disclaimer</h2>
              <div className="space-y-2 sm:space-y-4 text-[10px] sm:text-base text-gray-700">
                <p>
                  The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, this Company:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-0.5 sm:space-y-1">
                  <li>Excludes all representations and warranties relating to this website and its contents</li>
                  <li>Excludes all liability for damages arising out of or in connection with your use of this website</li>
                </ul>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">9. Limitation of Liability</h2>
              <p className="text-[10px] sm:text-base text-gray-700">
                In no event shall Fashion Marketplace, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">10. Governing Law</h2>
              <p className="text-[10px] sm:text-base text-gray-700">
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is registered, without regard to its conflict of law provisions.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">11. Changes to Terms</h2>
              <p className="text-[10px] sm:text-base text-gray-700">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-sm sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">12. Contact Information</h2>
              <div className="text-[10px] sm:text-base text-gray-700">
                <p className="mb-1.5 sm:mb-2">If you have any questions about these Terms of Service, please contact us:</p>
                <ul className="space-y-0.5 sm:space-y-1">
                  <li>Email: fashiondwayne@gmail.com</li>
                  <li>Phone: 08104912270</li>
                  <li>WhatsApp: 08104912270</li>
                  <li>Address: Lagos, Nigeria</li>
                </ul>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
          <Link 
            href="/privacy"
            className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-gray-800 border border-gray-300 rounded hover:bg-gray-50 font-medium transition-colors text-[10px] sm:text-sm"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/contact"
            className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium transition-colors text-[10px] sm:text-sm"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}