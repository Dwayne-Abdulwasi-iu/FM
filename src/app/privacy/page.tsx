import Link from 'next/link'
import { ArrowLeft, Shield, Eye, Lock, Database, Users, Mail, Globe, AlertCircle, FileText } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          
          <p className="text-gray-600">
            Last updated: October 27, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-6 w-6 mr-2 text-indigo-600" />
                1. Introduction
              </h2>
              <p className="text-gray-700 mb-4">
                Fashion Marketplace (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-gray-700">
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="h-6 w-6 mr-2 text-indigo-600" />
                2. Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <p className="text-gray-700 mb-2">We may collect personal information that you provide to us, including:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Name and contact information (email address, phone number)</li>
                    <li>Account credentials (username, password)</li>
                    <li>Profile information (bio, profile picture, portfolio details)</li>
                    <li>Payment information (processed securely through third-party providers)</li>
                    <li>Design uploads and associated metadata</li>
                    <li>Communication preferences</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Automatically Collected Information</h3>
                  <p className="text-gray-700 mb-2">When you visit our website, we automatically collect certain information:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>IP address and location data</li>
                    <li>Browser type and version</li>
                    <li>Operating system</li>
                    <li>Pages viewed and time spent on pages</li>
                    <li>Referring website</li>
                    <li>Device information (mobile device identifier, screen resolution)</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-6 w-6 mr-2 text-indigo-600" />
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">We use the information we collect for various purposes, including:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Provide Services:</strong> To create and manage your account, process transactions, and deliver purchased designs</li>
                <li><strong>Communication:</strong> To send you updates, newsletters, marketing materials, and respond to inquiries</li>
                <li><strong>Improvement:</strong> To analyze usage patterns and improve our website functionality and user experience</li>
                <li><strong>Security:</strong> To monitor for fraudulent activity and ensure platform security</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                <li><strong>Personalization:</strong> To customize content and recommendations based on your preferences</li>
                <li><strong>Support:</strong> To provide customer support and technical assistance</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-6 w-6 mr-2 text-indigo-600" />
                4. Information Sharing and Disclosure
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>We may share your information in the following situations:</p>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Service Providers</h3>
                  <p>We may share your data with third-party service providers who perform services on our behalf, including:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Payment processors (Stripe, PayStack)</li>
                    <li>Cloud storage providers (Cloudinary)</li>
                    <li>Email service providers</li>
                    <li>Analytics providers</li>
                    <li>Customer support platforms</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Legal Requirements</h3>
                  <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Business Transfers</h3>
                  <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Public Information</h3>
                  <p>Information you choose to make public (such as your profile, uploaded designs, and reviews) will be visible to other users.</p>
                </div>
              </div>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="h-6 w-6 mr-2 text-indigo-600" />
                5. Data Security
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p>Security measures include:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure payment processing through certified providers</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection</li>
                </ul>
                <p>
          However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                </p>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
              <div className="space-y-4 text-gray-700">
                <p>We use cookies and similar tracking technologies to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Provide personalized content and advertisements</li>
                  <li>Improve website functionality</li>
                  <li>Maintain your session and keep you logged in</li>
                </ul>
                <p>
                  You can control cookies through your browser settings. However, disabling cookies may affect website functionality.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-indigo-600" />
                7. Your Privacy Rights
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Depending on your location, you may have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                  <li><strong>Restriction:</strong> Request restriction of processing under certain circumstances</li>
                  <li><strong>Objection:</strong> Object to processing of your personal information</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent for processing where applicable</li>
                </ul>
                <p>
                  To exercise these rights, please contact us using the information provided in the &quot;Contact Us&quot; section.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <div className="space-y-4 text-gray-700">
                <p>We retain your personal information for as long as necessary to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Provide our services to you</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes</li>
                  <li>Enforce our agreements</li>
                </ul>
                <p>
                  When we no longer need your personal information, we will securely delete or anonymize it.
                </p>
              </div>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="h-6 w-6 mr-2 text-orange-600" />
                10. Children&apos;s Privacy
              </h2>
              <p className="text-gray-700">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided personal information, please contact us to have it removed.
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Links</h2>
              <p className="text-gray-700">
                Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party websites you visit.
              </p>
            </section>

            {/* Updates to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Updates to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-6 w-6 mr-2 text-indigo-600" />
                13. Contact Us
              </h2>
              <div className="text-gray-700">
                <p className="mb-4">If you have any questions about this Privacy Policy or our privacy practices, please contact us:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> privacy@fashionmarketplace.com</li>
                    <li><strong>Phone:</strong> +1 (555) 123-4567</li>
                    <li><strong>Mail:</strong> Fashion Marketplace Privacy Team<br />
                        123 Fashion Street<br />
                        Design City, DC 12345</li>
                  </ul>
                </div>
                <p className="mt-4">
                  For data protection inquiries in the EU, you may also contact our Data Protection Officer at: dpo@fashionmarketplace.com
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/terms"
            className="inline-flex items-center justify-center px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Terms of Service
          </Link>
          <Link 
            href="/contact"
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}