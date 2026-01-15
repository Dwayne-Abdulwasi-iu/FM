'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, MapPin, Send, CheckCircle, X, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    subject: '',
    message: '',
    priority: 'medium'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(true)
        setFormData({ name: '', email: '', subject: '', message: '', priority: 'medium' })
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to send message')
      }
    } catch (_error) {
      setError('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Contact Us</h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto">
            Have questions? Send us a message or chat with our support team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Get in Touch</h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Email</p>
                    <p className="text-gray-600 text-[10px] sm:text-xs">support@fashionmarketplace.com</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Phone</p>
                    <p className="text-gray-600 text-[10px] sm:text-xs">+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Office</p>
                    <p className="text-gray-600 text-[10px] sm:text-xs">123 Fashion Ave, Style City, SC</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Care Chat */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Need Help?</h3>
              <p className="text-[10px] sm:text-xs text-gray-600 mb-3">
                Chat with our support team.
              </p>
              <button
                onClick={() => router.push('/customer-care')}
                className="w-full bg-indigo-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                Live Chat
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Send us a Message</h2>
              
              {success && (
                <div className="mb-4 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-800 font-medium text-xs sm:text-sm">Message sent! We'll reply soon.</span>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-green-600 hover:text-green-800"
                    title="Close"
                    aria-label="Close"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 font-medium text-xs sm:text-sm">{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                    title="Close"
                    aria-label="Close"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500 text-xs sm:text-sm"
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500 text-xs sm:text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="subject" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500 text-xs sm:text-sm"
                      placeholder="Your inquiry"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white text-xs sm:text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500 text-xs sm:text-sm"
                    placeholder="Describe your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors text-xs sm:text-sm"
                >
                  {loading ? (
                    <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}