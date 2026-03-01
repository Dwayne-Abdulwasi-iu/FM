'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  Loader,
  Download,
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  action: string
  category: string
  actorType: string
  actorEmail: string | null
  targetType: string
  targetId: string
  success: boolean
  errorMessage: string | null
  metadata: any
  createdAt: string
}

type TimeRange = '24h' | '7d' | '30d' | 'all'

export default function AdminAuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])

  const CATEGORIES = [
    'PAYMENT',
    'PAYOUT',
    'REFUND',
    'DISPUTE',
    'STATUS_CHANGE',
    'USER_ACTION',
    'SYSTEM',
  ]

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin')
      return
    }

    fetchLogs()
  }, [status, session, router])

  useEffect(() => {
    applyFilters()
  }, [logs, searchQuery, selectedCategory, selectedAction, timeRange])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/audit-logs?limit=1000')

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs)

      // Extract unique categories and actions
      const uniqueCategories = Array.from(
        new Set(data.logs.map((log: AuditLogEntry) => log.category))
      ) as string[]
      const uniqueActions = Array.from(
        new Set(data.logs.map((log: AuditLogEntry) => log.action))
      ) as string[]

      setCategories(uniqueCategories)
      setActions(uniqueActions)
    } catch (error) {
      toast.error('Failed to load audit logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Time range filter
    const now = new Date()
    const filterDate = new Date()

    switch (timeRange) {
      case '24h':
        filterDate.setHours(now.getHours() - 24)
        break
      case '7d':
        filterDate.setDate(now.getDate() - 7)
        break
      case '30d':
        filterDate.setDate(now.getDate() - 30)
        break
      default:
        filterDate.setFullYear(1970)
    }

    filtered = filtered.filter(
      (log) => new Date(log.createdAt) >= filterDate
    )

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((log) => log.category === selectedCategory)
    }

    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter((log) => log.action === selectedAction)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.actorEmail?.toLowerCase().includes(query) ||
          log.targetId.toLowerCase().includes(query) ||
          (log.errorMessage || '').toLowerCase().includes(query)
      )
    }

    setFilteredLogs(filtered)
  }

  const downloadCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to download')
      return
    }

    const headers = ['Timestamp', 'Action', 'Category', 'Actor', 'Target', 'Status', 'Details']
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.action,
      log.category,
      log.actorEmail || log.actorType,
      `${log.targetType}#${log.targetId}`,
      log.success ? 'SUCCESS' : 'FAILED',
      log.errorMessage || '',
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach((row) => {
      csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n'
    })

    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    )
    element.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Downloaded audit logs')
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-600 mt-1">
                Track all administrative actions and system events
              </p>
            </div>
            <button
              onClick={downloadCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-medium disabled:bg-gray-400"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search action, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-primary-600" size={32} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No audit logs found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.actorEmail || log.actorType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          <span>{log.targetType}</span>
                          <span className="text-xs text-gray-500">
                            {log.targetId.substring(0, 20)}
                            {log.targetId.length > 20 ? '...' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === log.id ? null : log.id)
                          }
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <ChevronDown
                            size={16}
                            className={`transition ${
                              expandedId === log.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Row Details */}
            {expandedId && filteredLogs.find((l) => l.id === expandedId) && (
              <div className="bg-gray-50 border-t border-gray-200 p-6">
                <div className="max-w-4xl">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Details for {filteredLogs.find((l) => l.id === expandedId)?.action}
                  </h3>
                  <div className="bg-white rounded-lg p-4 font-mono text-sm text-gray-700 overflow-x-auto">
                    <pre>
                      {JSON.stringify(
                        filteredLogs.find((l) => l.id === expandedId),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
