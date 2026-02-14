'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, TrendingUp, Users, Lock, Activity, Shield } from 'lucide-react'

interface SecurityEvent {
  id: string
  type: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | '2FA_ENABLE' | '2FA_DISABLE' | 'SUSPICIOUS_ACTIVITY' | 'FRAUD_ALERT'
  userId: string
  userEmail: string
  userName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  ipAddress: string
  userAgent: string
  status: 'ACTIVE' | 'INVESTIGATED' | 'RESOLVED' | 'FALSE_POSITIVE'
  createdAt: string
  notes?: string
}

interface FraudAlert {
  id: string
  type: 'DUPLICATE_ACCOUNT' | 'PAYMENT_ABUSE' | 'CHARGEBACKS' | 'CONTENT_VIOLATION' | 'SUSPICIOUS_PATTERN'
  userId: string
  userEmail: string
  userName: string
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number
  indicators: string[]
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE'
  createdAt: string
}

interface SecurityMetrics {
  totalEvents24h: number
  highSeverityEvents: number
  activeFraudAlerts: number
  uniqueAttackers: number
  suspiciousCountries: number
  bannedIPs: number
}

export default function AdminSecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin')
      return
    }

    fetchSecurityData()
  }, [status, session, router])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      const [metricsRes, eventsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/security/metrics'),
        fetch('/api/admin/security/events'),
        fetch('/api/admin/security/fraud-alerts'),
      ])

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data.metrics)
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data.events || [])
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      })

      if (response.ok) {
        await fetchSecurityData()
        setSelectedEvent(null)
      }
    } catch (error) {
      console.error('Failed to resolve event:', error)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/fraud-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      })

      if (response.ok) {
        await fetchSecurityData()
        setSelectedAlert(null)
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const handleBlockIP = async (ip: string) => {
    if (!confirm(`Block IP ${ip}?`)) return

    try {
      const response = await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: ip }),
      })

      if (response.ok) {
        await fetchSecurityData()
      }
    } catch (error) {
      console.error('Failed to block IP:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading security data...</div>
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-red-50 border-red-200'
      case 'UNDER_REVIEW':
        return 'bg-yellow-50 border-yellow-200'
      case 'RESOLVED':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Monitoring</h1>
            <p className="text-gray-600 mt-1">Real-time fraud detection and security events</p>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Events (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEvents24h}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">High Severity</p>
              <p className="text-2xl font-bold text-red-600">{metrics.highSeverityEvents}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">Fraud Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.activeFraudAlerts}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Banned IPs</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.bannedIPs}</p>
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        {alerts.filter((a) => a.severity === 'CRITICAL').length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  {alerts.filter((a) => a.severity === 'CRITICAL').length} Critical Alert
                  {alerts.filter((a) => a.severity === 'CRITICAL').length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-red-800">
                  Immediate investigation required. These indicate potential security threats.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fraud Alerts Tab */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Fraud Alerts
                </h2>
              </div>

              {selectedAlert ? (
                <div className="p-6">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-4"
                  >
                    ← Back to list
                  </button>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{selectedAlert.userName}</h3>
                      <p className="text-sm text-gray-600">{selectedAlert.userEmail}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Alert Type</p>
                        <p className="text-sm font-medium text-gray-900">{selectedAlert.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Risk Score</p>
                        <p className="text-sm font-medium text-gray-900">{selectedAlert.score}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Indicators</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlert.indicators.map((ind, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedAlert.status === 'ACTIVE' && (
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleResolveAlert(selectedAlert.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => setSelectedAlert(null)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Keep Investigating
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No fraud alerts</div>
                  ) : (
                    alerts.map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition border ${getStatusColor(
                          alert.status
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{alert.userName}</p>
                            <p className="text-xs text-gray-600 mt-1">{alert.type}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Security Events */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Security Events
                </h2>
              </div>

              {selectedEvent ? (
                <div className="p-6">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-4"
                  >
                    ← Back to list
                  </button>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{selectedEvent.userName}</h3>
                      <p className="text-sm text-gray-600">{selectedEvent.userEmail}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Event Type</p>
                        <p className="text-sm font-medium text-gray-900">{selectedEvent.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">IP Address</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{selectedEvent.ipAddress}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Description</p>
                      <p className="text-sm text-gray-900">{selectedEvent.description}</p>
                    </div>
                    {selectedEvent.status === 'ACTIVE' && (
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleResolveEvent(selectedEvent.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => handleBlockIP(selectedEvent.ipAddress)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          Block IP
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {events.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No recent security events</div>
                  ) : (
                    events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition border ${getStatusColor(
                          event.status
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{event.description}</p>
                            <p className="text-xs text-gray-600 mt-1">{event.userName}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Quick Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unique Attackers</span>
                  <span className="font-medium text-gray-900">{metrics?.uniqueAttackers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suspicious Countries</span>
                  <span className="font-medium text-gray-900">{metrics?.suspiciousCountries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Rules</span>
                  <span className="font-medium text-gray-900">24</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-2 text-xs">
                <div className="pb-2 border-b border-gray-100">
                  <p className="text-gray-600">Suspicious login detected</p>
                  <p className="text-gray-400 mt-1">2 minutes ago</p>
                </div>
                <div className="pb-2 border-b border-gray-100">
                  <p className="text-gray-600">Payment chargebacks reported</p>
                  <p className="text-gray-400 mt-1">1 hour ago</p>
                </div>
                <div className="pb-2">
                  <p className="text-gray-600">IP address blocked</p>
                  <p className="text-gray-400 mt-1">3 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
