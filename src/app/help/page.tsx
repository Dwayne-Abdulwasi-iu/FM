'use client'

import { useState, useEffect, type ComponentType, type SVGProps, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Upload,
  ShoppingCart,
  CreditCard,
  User,
  Shield,
  Mail,
  Phone,
  MessageCircle,
  Book,
  Video,
  FileText,
  Palette,
  Printer,
  Award,
  PenTool
} from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

interface HelpCategory {
  id: string
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
}

function HelpPageContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  // Handle URL query parameter for direct category navigation
  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      setSelectedCategory(category)
    }
  }, [searchParams])

  const helpCategories: HelpCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using Fashion Marketplace',
      icon: Book,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'digital-designs',
      title: 'Digital Designs',
      description: 'Buying & selling digital fashion assets',
      icon: Palette,
      color: 'from-violet-500 to-purple-500'
    },
    {
      id: 'commissions',
      title: 'Commissions',
      description: 'Custom design requests and how they work',
      icon: PenTool,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'pod',
      title: 'Print-on-Demand',
      description: 'Create and sell physical products',
      icon: Printer,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'seller-tiers',
      title: 'Seller Tiers',
      description: 'Rewards and benefits for sellers',
      icon: Award,
      color: 'from-yellow-500 to-amber-500'
    },
    {
      id: 'uploads',
      title: 'Uploading Designs',
      description: 'How to upload and manage your fashion designs',
      icon: Upload,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'purchasing',
      title: 'Buying Designs',
      description: 'Find and purchase the perfect designs',
      icon: ShoppingCart,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      description: 'Payment methods, billing, and payouts',
      icon: CreditCard,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'account',
      title: 'Account Management',
      description: 'Manage your profile and account settings',
      icon: User,
      color: 'from-teal-500 to-cyan-500'
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Keep your account and designs secure',
      icon: Shield,
      color: 'from-gray-500 to-slate-500'
    }
  ]

  const faqItems: FAQItem[] = [
    // Getting Started
    {
      id: 'what-is-platform',
      question: 'What is Fashion Marketplace?',
      answer: 'Fashion Marketplace is a digital platform where fashion designers can upload, sell, and discover fashion designs, patterns, illustrations, and other creative content. It connects designers with buyers looking for unique fashion assets. The platform also offers custom commissions and print-on-demand products.',
      category: 'getting-started'
    },
    {
      id: 'how-to-sign-up',
      question: 'How do I create an account?',
      answer: 'Click the "Sign Up" button in the top navigation bar, then fill out the registration form with your email, password, and basic information. You can also sign up using your Google account for faster registration.',
      category: 'getting-started'
    },
    {
      id: 'account-types',
      question: 'What types of accounts are available?',
      answer: 'We offer both buyer and seller accounts. All accounts can purchase designs, but seller accounts can also upload and sell their own designs. You can upgrade to a seller account anytime from your profile settings.',
      category: 'getting-started'
    },
    {
      id: 'platform-features',
      question: 'What features does Fashion Marketplace offer?',
      answer: 'Our platform offers: Digital design marketplace with instant downloads, custom commission system for personalized designs, print-on-demand integration for physical products, seller tier rewards program, secure payment processing, messaging system, and verification badges for trusted designers.',
      category: 'getting-started'
    },

    // Digital Designs
    {
      id: 'what-are-digital-designs',
      question: 'What are digital designs?',
      answer: 'Digital designs are downloadable fashion assets including illustrations, patterns, sketches, technical drawings, embroidery files, and print-ready artwork. Once purchased, you receive instant access to high-resolution files you can use for your fashion projects.',
      category: 'digital-designs'
    },
    {
      id: 'digital-design-types',
      question: 'What types of digital designs are available?',
      answer: 'Categories include: Fashion Illustrations (artistic renderings), Pattern Designs (repeat patterns for fabrics), Technical Drawings (spec sheets and flat sketches), Embroidery Designs (stitch files), Print Designs (ready-to-print graphics), Color Palettes, and Mood Boards.',
      category: 'digital-designs'
    },
    {
      id: 'buying-types-explained',
      question: 'What is the difference between Regular and Ownership purchases?',
      answer: 'Regular Purchase: You get a license to use the design for personal or commercial projects, but the designer retains ownership and can sell to others. Ownership Purchase: You acquire exclusive rights to the design - it becomes yours alone, removed from the marketplace, and the designer transfers all rights to you.',
      category: 'digital-designs'
    },
    {
      id: 'ownership-benefits',
      question: 'When should I choose Ownership purchase?',
      answer: 'Choose Ownership if you want: Exclusive rights (no one else can use it), ability to resell or license the design, full commercial control, or to use it as your brand\'s signature design. Ownership prices are typically 5-20x higher than regular licenses.',
      category: 'digital-designs'
    },
    {
      id: 'download-formats',
      question: 'What file formats do I receive?',
      answer: 'Depending on the design type, you may receive: PNG/JPG (high resolution images), SVG (scalable vector graphics), AI/EPS (Adobe Illustrator files), PSD (Photoshop files), PDF (print-ready), DST/PES (embroidery formats). Check each listing for specific formats included.',
      category: 'digital-designs'
    },
    {
      id: 'digital-license-usage',
      question: 'What can I do with purchased digital designs?',
      answer: 'With a Regular license: Use in your fashion collections, create products for sale, use in marketing materials, modify and adapt for your needs. You cannot resell the original file or claim authorship. With Ownership: Full rights including resale, sublicensing, and claiming as your own work.',
      category: 'digital-designs'
    },

    // Commissions
    {
      id: 'what-are-commissions',
      question: 'What is the Commission system?',
      answer: 'Commissions allow you to request custom, personalized designs from our talented designers. You describe what you need, designers provide quotes, and once you accept and pay, the designer creates your unique design. It\'s perfect for bespoke fashion projects.',
      category: 'commissions'
    },
    {
      id: 'commission-process',
      question: 'How does the commission process work?',
      answer: 'Step 1: Submit a request describing your needs, budget, and deadline. Step 2: Your request is sent to your chosen designer. Step 3: Designer reviews and sends a quote with price and timeline. Step 4: Accept the quote and pay securely. Step 5: Designer works on your project with progress updates. Step 6: Review deliverables and request revisions if needed. Step 7: Approve final work and receive your files.',
      category: 'commissions'
    },
    {
      id: 'commission-payment-protection',
      question: 'How are my commission payments protected?',
      answer: 'All commission payments are held securely in escrow until you approve the final deliverables. If a designer fails to deliver or the work doesn\'t match what was agreed, you can request a refund or file a dispute. The platform mediates all disputes fairly.',
      category: 'commissions'
    },
    {
      id: 'commission-revisions',
      question: 'Can I request revisions on my commission?',
      answer: 'Yes! Most commissions include revision rounds. When you receive deliverables, you can: Approve the work (releases payment to designer), Request revisions (provide feedback for changes), or Dispute (if there are serious issues). Revision limits depend on what the designer specifies in their quote.',
      category: 'commissions'
    },
    {
      id: 'commission-types',
      question: 'What types of commissions can I request?',
      answer: 'Common commission types include: Custom illustrations (fashion figures, technical sketches), Pattern development (unique prints and textiles), Full design collections, Logo and branding for fashion brands, Alterations of existing designs, Rush orders for urgent projects, and Bulk/wholesale design packages.',
      category: 'commissions'
    },
    {
      id: 'commission-pricing',
      question: 'How is commission pricing determined?',
      answer: 'Designers set their own rates based on: Complexity of the work, Time required, Their experience level, Whether it includes source files, and exclusivity. When you submit a request, designers quote based on your specific requirements. Always discuss pricing before accepting.',
      category: 'commissions'
    },
    {
      id: 'physical-commissions',
      question: 'Can I commission physical items?',
      answer: 'Yes! Designers can create physical fashion items like garments, accessories, or samples. For physical commissions, you\'ll provide a delivery address, and once the designer marks it as shipped, delivery is coordinated through our admin team for secure handling.',
      category: 'commissions'
    },
    {
      id: 'commission-communication',
      question: 'How do I communicate with my designer during a commission?',
      answer: 'Each commission has a built-in messaging system. You can send text messages, share reference images, discuss progress, and receive updates. All communication is logged for transparency and dispute resolution if needed.',
      category: 'commissions'
    },
    {
      id: 'become-commission-designer',
      question: 'How do I accept commissions as a designer?',
      answer: 'Go to Seller Dashboard > Commission Settings. Enable "Accept Commissions," set your minimum/maximum budget, typical turnaround time, and the types of work you do. Clients will then be able to send you commission requests.',
      category: 'commissions'
    },

    // Print-on-Demand (POD)
    {
      id: 'what-is-pod',
      question: 'What is Print-on-Demand (POD)?',
      answer: 'Print-on-Demand lets you sell physical products (t-shirts, hoodies, bags, phone cases, etc.) featuring your designs without holding inventory. When a customer orders, the product is printed and shipped directly to them. You earn profit on each sale!',
      category: 'pod'
    },
    {
      id: 'pod-how-it-works',
      question: 'How does POD work on Fashion Marketplace?',
      answer: 'Step 1: Upload your design. Step 2: Enable POD and select products (t-shirts, mugs, etc.). Step 3: Set your markup/profit margin. Step 4: Customers browse and order. Step 5: Our partners (Printful/Printify) print and ship. Step 6: You receive your profit minus production costs.',
      category: 'pod'
    },
    {
      id: 'pod-products-available',
      question: 'What products can I sell through POD?',
      answer: 'Available products include: Apparel (t-shirts, hoodies, tank tops, dresses), Accessories (bags, hats, phone cases), Home & Living (pillows, blankets, mugs, posters), and more. Product availability depends on the POD provider and your region.',
      category: 'pod'
    },
    {
      id: 'pod-pricing',
      question: 'How is POD pricing calculated?',
      answer: 'Final price = Base cost + Your markup. For example: A t-shirt costs $12 to produce. You set a $8 markup. Customer pays $20. You earn $8 profit. We recommend 20-40% markup for competitive pricing while maintaining good profit margins.',
      category: 'pod'
    },
    {
      id: 'pod-shipping',
      question: 'How does POD shipping work?',
      answer: 'Our POD partners handle all production and shipping. Typical delivery: 3-7 business days (domestic), 7-21 days (international). Tracking is provided automatically. Customers receive shipping updates via email.',
      category: 'pod'
    },
    {
      id: 'pod-quality',
      question: 'What is the print quality like?',
      answer: 'We partner with industry-leading providers (Printful, Printify) known for high-quality printing. Methods include DTG (direct-to-garment), sublimation, and embroidery depending on the product. For best results, upload designs at 300 DPI with transparent backgrounds.',
      category: 'pod'
    },
    {
      id: 'pod-returns',
      question: 'How are POD returns handled?',
      answer: 'Returns are handled on a case-by-case basis. If a product arrives damaged or with print defects, the POD partner will reprint or refund. Size exchanges may be available. Contact support with order details and photos of any issues.',
      category: 'pod'
    },
    {
      id: 'pod-vs-digital',
      question: 'Should I offer POD, digital downloads, or both?',
      answer: 'Offer both for maximum reach! Digital downloads provide instant gratification and higher margins. POD reaches customers who want finished products without DIY. Many successful sellers offer the same design as both a digital download and on POD products.',
      category: 'pod'
    },

    // Seller Tiers
    {
      id: 'what-are-seller-tiers',
      question: 'What are Seller Tiers?',
      answer: 'Seller Tiers is our rewards program that reduces platform fees as you sell more. The more you earn, the lower your fees, and the more you keep! There are 7 tiers: Starter (0.1% fee for first $100), New (10%), Bronze (9.5%), Silver (9%), Gold (8.5%), Platinum (8%), and Diamond (7%).',
      category: 'seller-tiers'
    },
    {
      id: 'tier-requirements',
      question: 'What are the tier requirements?',
      answer: 'Tiers are based on your lifetime earnings: STARTER ($0-$99 - nearly free!), NEW ($100-$499), BRONZE ($500-$1,999), SILVER ($2,000-$4,999), GOLD ($5,000-$9,999), PLATINUM ($10,000-$24,999), DIAMOND ($25,000+). Pro subscribers get an additional 1% discount on fees.',
      category: 'seller-tiers'
    },
    {
      id: 'tier-benefits',
      question: 'What benefits do higher tiers provide?',
      answer: 'Higher tiers offer: Lower platform fees (keep more of each sale), priority support, featured placement opportunities, early access to new features, verification badge eligibility, and exclusive seller resources. Diamond sellers may get dedicated account managers.',
      category: 'seller-tiers'
    },
    {
      id: 'tier-fee-comparison',
      question: 'How much do fees differ between tiers?',
      answer: 'Fee comparison per $100 sale: STARTER keeps $99.90, NEW keeps $90, BRONZE keeps $90.50, SILVER keeps $91, GOLD keeps $91.50, PLATINUM keeps $92, DIAMOND keeps $93. Over time, this adds up significantly! A Diamond seller earning $100,000 saves $3,000 compared to a New seller.',
      category: 'seller-tiers'
    },
    {
      id: 'tier-progression',
      question: 'How do I progress through tiers?',
      answer: 'Simply keep selling! Your tier automatically upgrades when your lifetime earnings cross the threshold. Earnings include digital sales, commission work, and POD profits. You never lose your tier - once achieved, it\'s yours.',
      category: 'seller-tiers'
    },
    {
      id: 'tier-pro-subscription',
      question: 'What is the Pro Subscription for sellers?',
      answer: 'Pro subscribers get an extra 1% off platform fees at any tier (minimum 6% fee). Plus: Advanced analytics, priority listing in search, promotional tools, early feature access, and dedicated support. Monthly subscription that pays for itself with just a few sales.',
      category: 'seller-tiers'
    },
    {
      id: 'tier-verification',
      question: 'What are verification badges?',
      answer: 'Verification badges show buyers that a seller is trusted and legitimate. Types include: Verified (identity confirmed), Featured (selected by platform), Top Seller (high sales volume), and Pro (subscription member). Higher tiers have easier access to verification.',
      category: 'seller-tiers'
    },

    // Uploading Designs
    {
      id: 'upload-process',
      question: 'How do I upload a design?',
      answer: 'Go to the Upload page, select your design files, add a title, description, category, and tags. Set your price and choose whether it\'s a free or premium design. Click "Upload Design" to publish it to the marketplace.',
      category: 'uploads'
    },
    {
      id: 'file-formats',
      question: 'What file formats are supported?',
      answer: 'We support JPG, PNG, SVG, PDF, AI, PSD, and other common design file formats. Files should be high-quality and under 50MB each. For best results, upload designs at 300 DPI or higher.',
      category: 'uploads'
    },
    {
      id: 'design-categories',
      question: 'What categories can I upload to?',
      answer: 'Available categories include Fashion Illustrations, Pattern Designs, Digital Designs, Sketches, Technical Drawings, Embroidery Designs, Print Designs, and Color Palettes. Choose the most relevant category for better discoverability.',
      category: 'uploads'
    },
    {
      id: 'pricing-designs',
      question: 'How should I price my designs?',
      answer: 'Consider factors like complexity, time invested, uniqueness, and market demand. Research similar designs for pricing guidance. You can offer both free designs to build followers and premium designs for revenue.',
      category: 'uploads'
    },
    {
      id: 'multiple-media',
      question: 'Can I upload multiple images per design?',
      answer: 'Yes! You can add multiple media files to showcase different views, variations, or included files. Set some as FREE preview and others as PREMIUM (only visible after purchase). This lets buyers see quality while protecting your work.',
      category: 'uploads'
    },

    // Purchasing
    {
      id: 'how-to-buy',
      question: 'How do I purchase a design?',
      answer: 'Browse designs, click on one you like, review the details, and click "Add to Cart". Proceed to checkout, enter your payment information, and complete the purchase. You\'ll receive download links immediately.',
      category: 'purchasing'
    },
    {
      id: 'download-designs',
      question: 'How do I download purchased designs?',
      answer: 'After purchase, go to your Profile > My Purchases or check your email for download links. Downloads are available immediately and remain accessible in your account permanently.',
      category: 'purchasing'
    },
    {
      id: 'license-usage',
      question: 'What license do I get with purchased designs?',
      answer: 'Most designs come with a standard commercial license allowing personal and commercial use. Check individual design descriptions for specific license terms. Some designs may have extended licensing options.',
      category: 'purchasing'
    },

    // Payments
    {
      id: 'payment-methods',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and local payment methods through our secure payment processors Stripe (international) and PayStack (Africa). Mobile money is also supported in select regions.',
      category: 'payments'
    },
    {
      id: 'seller-payouts',
      question: 'How do seller payouts work?',
      answer: 'Sellers receive 85-90% of each sale depending on their tier. Payouts are processed to your connected bank account. For Nigerian sellers, Paystack transfers are automatic. Minimum payout threshold is $20 or ₦10,000.',
      category: 'payments'
    },
    {
      id: 'refund-policy',
      question: 'What is the refund policy?',
      answer: 'Digital downloads are generally non-refundable. However, if a file is corrupted or significantly different from the description, contact support within 7 days for a refund or replacement.',
      category: 'payments'
    },
    {
      id: 'currency-support',
      question: 'What currencies are supported?',
      answer: 'The platform supports USD, NGN (Nigerian Naira), GHS (Ghanaian Cedi), KES (Kenyan Shilling), and ZAR (South African Rand). Prices are automatically converted based on your location. Sellers receive payouts in their local currency.',
      category: 'payments'
    },

    // Account Management
    {
      id: 'edit-profile',
      question: 'How do I edit my profile?',
      answer: 'Go to your Profile page and click "Edit Profile". You can update your name, bio, profile picture, portfolio links, and contact information. Changes are saved automatically.',
      category: 'account'
    },
    {
      id: 'delete-account',
      question: 'How do I delete my account?',
      answer: 'Contact our support team to request account deletion. Note that this will remove all your designs, purchases, and data permanently. Downloaded files will remain accessible.',
      category: 'account'
    },
    {
      id: 'notification-settings',
      question: 'How do I manage notifications?',
      answer: 'Go to Settings > Notifications to control email notifications for sales, new followers, messages, and platform updates. You can customize which notifications you receive.',
      category: 'account'
    },
    {
      id: 'bank-account-setup',
      question: 'How do I set up my bank account for payouts?',
      answer: 'Go to Seller Dashboard > Bank Account. Enter your bank details including account number and bank name. For Nigerian banks, verification is automatic. International sellers may need additional verification steps.',
      category: 'account'
    },

    // Security & Privacy
    {
      id: 'password-reset',
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and check your inbox for a password reset link. Follow the instructions to create a new password.',
      category: 'security'
    },
    {
      id: 'data-privacy',
      question: 'How is my data protected?',
      answer: 'We use industry-standard encryption, secure servers, and strict access controls. Read our Privacy Policy for detailed information about data collection, usage, and protection measures.',
      category: 'security'
    },
    {
      id: 'copyright-protection',
      question: 'How are my designs protected from theft?',
      answer: 'We use watermarks on preview images, DMCA protection, and monitoring systems. Report any copyright infringement immediately. Original creators retain full rights to their uploaded designs.',
      category: 'security'
    },
    {
      id: 'escrow-protection',
      question: 'How does escrow protection work for commissions?',
      answer: 'When you pay for a commission, funds are held securely by our platform until you approve the final work. This protects buyers from non-delivery and ensures designers get paid for completed work. Disputes are mediated by our support team.',
      category: 'security'
    }
  ]

  const filteredFAQs = faqItems.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Back to Home
          </Link>
          
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <HelpCircle className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600 mr-2 sm:mr-3" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Help Center</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 sm:pl-12 pr-3 sm:pr-4 py-1.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          <Link 
            href="/contact"
            className="bg-white p-2 sm:p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
          >
            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm">Support</h3>
            <p className="text-gray-600 text-[10px] sm:text-xs">Get help</p>
          </Link>

          <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm">
            <Video className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm">Videos</h3>
            <p className="text-gray-600 text-[10px] sm:text-xs">Coming Soon</p>
          </div>

          <Link 
            href="/terms"
            className="bg-white p-2 sm:p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mb-1 sm:mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm">Terms</h3>
            <p className="text-gray-600 text-[10px] sm:text-xs">Policies</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    selectedCategory === 'all' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {helpCategories.map((category) => {
                  const IconComponent = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center text-xs sm:text-sm ${
                        selectedCategory === category.id 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">{category.title}</span>
                      <span className="sm:hidden">{category.title.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            {selectedCategory === 'all' && !searchQuery ? (
              <>
                {/* Category Overview */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                  {helpCategories.map((category) => {
                    const IconComponent = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-1.5 sm:mb-2`}>
                          <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm group-hover:text-indigo-700 transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-gray-600 text-[10px] sm:text-xs">
                          {category.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                {/* FAQ List */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-3 sm:p-4 border-b border-gray-200">
                    <h2 className="text-sm sm:text-lg font-semibold text-gray-900">
                      {selectedCategory === 'all' ? 'All' : 
                       helpCategories.find(cat => cat.id === selectedCategory)?.title || 'Questions'}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                      {filteredFAQs.length} found
                    </p>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {filteredFAQs.map((faq) => (
                      <div key={faq.id} className="p-2.5 sm:p-4">
                        <button
                          onClick={() => toggleFAQ(faq.id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <h3 className="font-medium text-gray-900 text-xs sm:text-sm pr-2">
                            {faq.question}
                          </h3>
                          {expandedFAQ === faq.id ? (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        
                        {expandedFAQ === faq.id && (
                          <div className="mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {filteredFAQs.length === 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8 text-center">
                    <Search className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-1">No results</h3>
                    <p className="text-[10px] sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      Try adjusting your search
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('all')
                      }}
                      className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-6">
          <div className="text-center">
            <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600 mx-auto mb-2 sm:mb-4" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Need help?</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 max-w-2xl mx-auto">
              Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              <Link 
                href="/contact"
                className="inline-flex items-center px-3 sm:px-6 py-1.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm"
              >
                <Mail className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                Contact
              </Link>
              <div className="inline-flex items-center px-3 sm:px-6 py-1.5 sm:py-3 bg-white text-gray-800 border border-gray-300 rounded-lg font-medium text-xs sm:text-sm">
                <Phone className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">+1 (555) 123-4567</span>
                <span className="sm:hidden">Call Us</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading help center...</p>
        </div>
      </div>
    }>
      <HelpPageContent />
    </Suspense>
  )
}