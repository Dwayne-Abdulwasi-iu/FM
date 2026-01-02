'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
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
  FileText
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

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const helpCategories: HelpCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using Fashion Marketplace',
      icon: Book,
      color: 'from-blue-500 to-cyan-500'
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
      color: 'from-pink-500 to-rose-500'
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
      answer: 'Fashion Marketplace is a digital platform where fashion designers can upload, sell, and discover fashion designs, patterns, illustrations, and other creative content. It connects designers with buyers looking for unique fashion assets.',
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
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and local payment methods through our secure payment processors Stripe and PayStack.',
      category: 'payments'
    },
    {
      id: 'seller-payouts',
      question: 'How do seller payouts work?',
      answer: 'Sellers receive 70-85% of each sale (depending on volume). Payouts are processed weekly to your connected bank account or PayPal. Minimum payout threshold is $20.',
      category: 'payments'
    },
    {
      id: 'refund-policy',
      question: 'What is the refund policy?',
      answer: 'Digital downloads are generally non-refundable. However, if a file is corrupted or significantly different from the description, contact support within 7 days for a refund or replacement.',
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