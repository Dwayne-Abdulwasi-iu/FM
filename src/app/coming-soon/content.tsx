'use client'

import { useState, useEffect } from 'react'
import { Mail, Instagram, Twitter, Facebook, Copy, Check, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function ComingSoonContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralUrl, setReferralUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Get referral code from URL and track page view
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) {
      setReferralCode(ref);
    }

    // Track page view
    fetch('/api/coming-soon/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'view',
        referralCode: ref,
      }),
    }).catch(err => console.warn('Analytics tracking failed:', err));
  }, [searchParams])

  // Calculate countdown (you can adjust the target date)
  useEffect(() => {
    const targetDate = new Date('2026-03-31').getTime()
    
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate - now

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/coming-soon/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          referralCode: referralCode || undefined,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Subscription failed. Please try again.')
        return
      }

      setSubscribed(true)
      if (data.referralUrl) {
        setReferralUrl(data.referralUrl);
      }
      setEmail('')
      setTimeout(() => setSubscribed(false), 5000)
    } catch (_err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8 fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 mb-6 mx-auto shadow-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-pink-400 tracking-widest uppercase mb-4">Fashion Marketplace</h3>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 mb-6 leading-tight fadeIn animation-delay-200">
            Something Beautiful
            <br />
            is Coming
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-purple-200 mb-8 max-w-2xl mx-auto leading-relaxed fadeIn animation-delay-400">
            The premier destination for fashion designers, illustrations, and creative professionals is launching soon. Get early access to exclusive features and be part of the revolution.
          </p>

          {/* Countdown Timer */}
          <div className="mb-12 fadeIn animation-delay-600">
            <div className="inline-grid grid-cols-4 gap-4 sm:gap-6 mb-6">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Seconds', value: timeLeft.seconds }
              ].map((item) => (
                <div key={item.label} className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20 hover:border-pink-400/50 transition-colors">
                  <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-purple-300 uppercase tracking-wider">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-purple-300 text-sm">Until launch</p>
          </div>

          {/* Email Subscription */}
          <div className="mb-12 fadeIn animation-delay-800">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center">
              <div className="flex-1 sm:max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                  className="w-full px-6 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all disabled:opacity-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:shadow-2xl hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribed ? (
                  <>
                    <span>✓ Subscribed!</span>
                  </>
                ) : loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>Notify Me</span>
                  </>
                )}
              </button>
            </form>
            {subscribed && (
              <p className="text-green-400 text-sm mt-3 animate-pulse">
                Thanks for subscribing! We'll keep you updated.
              </p>
            )}
            {error && (
              <p className="text-red-400 text-sm mt-3">
                {error}
              </p>
            )}

            {/* Referral Share Card */}
            {referralUrl && (
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-400/30 backdrop-blur-md fadeIn">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>✨</span> Share with a Friend
                </h3>
                <p className="text-purple-200 text-sm mb-4">
                  Invite your friends to get early access and build the community together.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all group"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 group-hover:text-pink-400 transition-colors" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <div className="flex gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=Check%20out%20Fashion%20Marketplace%20-%20a%20platform%20for%20designers%20to%20showcase%20and%20sell%20their%20work!&url=${encodeURIComponent(referralUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-white/10 hover:bg-blue-500/20 border border-white/20 text-white transition-all hover:border-blue-400/50"
                      title="Share on Twitter"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-white/10 hover:bg-blue-600/20 border border-white/20 text-white transition-all hover:border-blue-500/50"
                      title="Share on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a
                      href={`mailto:?subject=Check%20out%20Fashion%20Marketplace&body=I%20found%20this%20amazing%20platform%20for%20fashion%20designers:%20${encodeURIComponent(referralUrl)}`}
                      className="p-3 rounded-lg bg-white/10 hover:bg-purple-500/20 border border-white/20 text-white transition-all hover:border-purple-400/50"
                      title="Share via Email"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 fadeIn animation-delay-1000">
            {[
              {
                icon: '🎨',
                title: 'Showcase Designs',
                description: 'Display your fashion illustrations to a global audience'
              },
              {
                icon: '💼',
                title: 'Monetize Talent',
                description: 'Earn from commissions and exclusive design sales'
              },
              {
                icon: '🌍',
                title: 'Connect Globally',
                description: 'Join a thriving community of fashion creatives'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-pink-400/50 transition-colors hover:bg-white/10"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-purple-200">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mx-auto mb-8"></div>

          {/* Social Links */}
          <div className="flex justify-center gap-6 fadeIn animation-delay-1200">
            {[
              { icon: Instagram, href: '#', label: 'Instagram' },
              { icon: Twitter, href: '#', label: 'Twitter' },
              { icon: Facebook, href: '#', label: 'Facebook' }
            ].map((social, idx) => (
              <a
                key={idx}
                href={social.href}
                aria-label={social.label}
                className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-purple-300 hover:text-pink-400 hover:border-pink-400/50 hover:bg-white/20 transition-all"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-950 via-transparent to-transparent"></div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }

        .animation-delay-1200 {
          animation-delay: 1.2s;
        }
      `}</style>
    </div>
  )
}
