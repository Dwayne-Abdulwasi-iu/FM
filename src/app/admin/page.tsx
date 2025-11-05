'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'
import { formatPriceLocalized, type SupportedCurrency } from '@/lib/currency'
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  Trash2, 
  Shield,
  UserCheck,
  UserX,
  Search,
  Mail,
  MessageCircle,
  BookOpen,
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
  _count: {
    designs: number
    orders: number
  }
}

interface AdminStats {
  totalUsers: number
  totalDesigns: number
  totalOrders: number
  totalRevenue: number
  platformEarnings: number
  activeUsers: number
  recentSignups: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  platformFee: number
  createdAt: string
  customer: {
    name: string | null
    email: string
  }
  items: Array<{
    id: string
    quantity: number
    price: number
    purchaseType: 'REGULAR' | 'OWNERSHIP' | string
    design: { id: string; title: string }
  }>
}

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string
  category: string
  isActive: boolean
  createdAt: string
  totalSales: number
  totalRevenue: number
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  isOwned: boolean
  buyingTypes: string
  ownershipPrice: number | null
  designer: {
    name: string | null
    email: string
  }
}

// Row shape for Exclusive Sales table and CSV export
type ExclusiveSale = {
  id: string
  createdAt: string
  purchasePrice: number
  buyer: { id: string; name: string | null; email: string }
  design: { id: string; title: string; imageUrl: string; isActive: boolean; ownedBy: string | null; designer: { id: string; name: string | null; email: string } }
  order: { id?: string; orderNumber?: string; createdAt?: string } | null
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  type AdminTab = 'overview' | 'users' | 'designs' | 'orders' | 'exclusive' | 'resources' | 'contact' | 'requests' | 'chat' | 'earnings'
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  // Orders filters, sorting, pagination
  const [ordBuyerQuery, setOrdBuyerQuery] = useState('')
  const [ordOrderQuery, setOrdOrderQuery] = useState('')
  const [ordStatus, setOrdStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED'>('ALL')
  const [ordFromDate, setOrdFromDate] = useState<string>('')
  const [ordToDate, setOrdToDate] = useState<string>('')
  const [ordMinTotal, setOrdMinTotal] = useState<string>('')
  const [ordMaxTotal, setOrdMaxTotal] = useState<string>('')
  const [ordPurchaseType, setOrdPurchaseType] = useState<'ALL' | 'REGULAR' | 'OWNERSHIP'>('ALL')
  const [ordTimeframe, setOrdTimeframe] = useState<'7d' | '30d' | 'all'>('all')
  const [ordPage, setOrdPage] = useState<number>(1)
  const [ordPageSize, setOrdPageSize] = useState<number>(50)
  const [ordTotal, setOrdTotal] = useState<number>(0)
  const [ordSortBy, setOrdSortBy] = useState<'date' | 'total' | 'customer' | 'orderNumber'>('date')
  const [ordSortOrder, setOrdSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isOrderExporting, setIsOrderExporting] = useState<boolean>(false)

  // Persist Orders page size across sessions
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('admin.orders.pageSize') : null
      if (saved) {
        const n = parseInt(saved, 10)
        if ([10, 25, 50, 100, 200].includes(n)) {
          setOrdPageSize(n)
        }
      }
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin.orders.pageSize', String(ordPageSize))
      }
    } catch {
      // ignore storage errors
    }
  }, [ordPageSize])
  const [exclusiveSales, setExclusiveSales] = useState<ExclusiveSale[]>([])
  // Exclusive Sales pagination meta
  const [exPage, setExPage] = useState<number>(1)
  const [exPageSize, setExPageSize] = useState<number>(50)
  const [exTotal, setExTotal] = useState<number>(0)
  // Exclusive Sales sorting
  const [exSortBy, setExSortBy] = useState<'date' | 'price' | 'buyer' | 'seller' | 'title'>('date')
  const [exSortOrder, setExSortOrder] = useState<'asc' | 'desc'>('desc')
  // Export state
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false)
  // Price range filters (USD as source of truth)
  const [exMinPrice, setExMinPrice] = useState<string>('')
  const [exMaxPrice, setExMaxPrice] = useState<string>('')
  // Exclusive Sales filters
  const [exBuyerQuery, setExBuyerQuery] = useState('')
  const [exSellerQuery, setExSellerQuery] = useState('')
  const [exFromDate, setExFromDate] = useState<string>('')
  const [exToDate, setExToDate] = useState<string>('')
  const [exTimeframe, setExTimeframe] = useState<'7d' | '30d' | 'all'>('all')
  const [exOrderQuery, setExOrderQuery] = useState<string>('')
  // With server-side filtering, the list received is already filtered
  const filteredExclusiveSales = exclusiveSales
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [designFilter, setDesignFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [deletableOnly, setDeletableOnly] = useState<boolean>(false)
  const [filterHasOrders, setFilterHasOrders] = useState<boolean>(false)
  const [filterOwned, setFilterOwned] = useState<boolean>(false)
  const [filterInactive, setFilterInactive] = useState<boolean>(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; userId: string; userEmail: string; inputValue?: string } | null>(null)
  const [adminConfirm, setAdminConfirm] = useState<{ step: number; userId: string; userEmail: string; action: 'makeAdmin' | 'removeAdmin' } | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [locale, setLocale] = useState<string>('en-US')
  interface ContactMessage {
    id: string
    subject: string
    name: string
    email: string
    message: string
    priority: 'high' | 'medium' | 'low'
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
    createdAt: string
    user?: { name: string | null; email: string }
  }
  interface AdminChatSession {
    id: string
    user: { name: string | null; email: string }
    _count: { messages: number }
    messages: Array<{ message: string; createdAt: string }>
    status: 'ACTIVE' | 'CLOSED' | string
    createdAt: string
  }
  interface CareMessage { id: string; message: string; isAdmin: boolean; createdAt: string }

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [chatSessions, setChatSessions] = useState<AdminChatSession[]>([])
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [selectedChatSession, setSelectedChatSession] = useState<AdminChatSession | null>(null)
  const [chatMessages, setChatMessages] = useState<CareMessage[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  // Unread chat counts for admin
  const [unreadTotal, setUnreadTotal] = useState<number>(0)
  const [unreadBySession, setUnreadBySession] = useState<Record<string, number>>({})

  // SafeImage centralizes sanitization and onError fallback

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const fetchData = async () => {
    await fetchAdminData()
  }

  // Check if user is admin
  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, usersRes, designsRes, contactRes, chatRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/designs'),
        fetch('/api/contact'),
        fetch('/api/customer-care/session')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }

      if (designsRes.ok) {
        const designsData = await designsRes.json()
        setDesigns(designsData.designs)
      }

      // Load orders with current filters
      await fetchOrders()

      // Load exclusive sales with current filters after base data loads
      await fetchExclusiveSales()

      if (contactRes.ok) {
        const contactData = await contactRes.json()
        setContactMessages(contactData.messages || [])
      }

      if (chatRes.ok) {
        const chatData = await chatRes.json()
        setChatSessions(chatData.sessions || [])
      }

      // Load unread counts in parallel after sessions
      await fetchUnreadCounts()
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Debounce orders fetch on filters/sort/page change
  useEffect(() => {
    const t = setTimeout(() => {
      fetchOrders()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordBuyerQuery, ordOrderQuery, ordStatus, ordFromDate, ordToDate, ordMinTotal, ordMaxTotal, ordPurchaseType, ordPage, ordPageSize, ordSortBy, ordSortOrder])

  const fetchOrders = async () => {
    const params = new URLSearchParams()
    if (ordBuyerQuery.trim()) params.set('buyer', ordBuyerQuery.trim())
    if (ordOrderQuery.trim()) params.set('order', ordOrderQuery.trim())
    if (ordStatus !== 'ALL') params.set('status', ordStatus)
    if (ordFromDate) params.set('from', ordFromDate)
    if (ordToDate) params.set('to', ordToDate)
    if (ordMinTotal && !Number.isNaN(parseFloat(ordMinTotal))) params.set('minTotal', String(parseFloat(ordMinTotal)))
    if (ordMaxTotal && !Number.isNaN(parseFloat(ordMaxTotal))) params.set('maxTotal', String(parseFloat(ordMaxTotal)))
    if (ordPurchaseType !== 'ALL') params.set('purchaseType', ordPurchaseType)
    params.set('page', String(ordPage))
    params.set('pageSize', String(ordPageSize))
    params.set('sortBy', ordSortBy)
    params.set('sortOrder', ordSortOrder)

    const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders || [])
      if (data.meta) setOrdTotal(Number(data.meta.total) || 0)
      else setOrdTotal((data.orders || []).length)
    }
  }

  const handleOrderSort = (key: 'date' | 'total' | 'customer' | 'orderNumber') => {
    setOrdPage(1)
    if (ordSortBy === key) setOrdSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setOrdSortBy(key)
      setOrdSortOrder(key === 'date' ? 'desc' : 'asc')
    }
  }

  const exportAllOrders = async () => {
    try {
      setIsOrderExporting(true)
      const base = new URLSearchParams()
      if (ordBuyerQuery.trim()) base.set('buyer', ordBuyerQuery.trim())
      if (ordOrderQuery.trim()) base.set('order', ordOrderQuery.trim())
      if (ordStatus !== 'ALL') base.set('status', ordStatus)
      if (ordFromDate) base.set('from', ordFromDate)
      if (ordToDate) base.set('to', ordToDate)
      if (ordMinTotal && !Number.isNaN(parseFloat(ordMinTotal))) base.set('minTotal', String(parseFloat(ordMinTotal)))
      if (ordMaxTotal && !Number.isNaN(parseFloat(ordMaxTotal))) base.set('maxTotal', String(parseFloat(ordMaxTotal)))
      if (ordPurchaseType !== 'ALL') base.set('purchaseType', ordPurchaseType)
      base.set('sortBy', ordSortBy)
      base.set('sortOrder', ordSortOrder)

      const pageSize = 200
      let page = 1
      let total = Infinity
      const rows: Order[] = []
      while (rows.length < total) {
        const p = new URLSearchParams(base)
        p.set('page', String(page))
        p.set('pageSize', String(pageSize))
        const res = await fetch(`/api/admin/orders?${p.toString()}`, { cache: 'no-store' })
        if (!res.ok) break
        const data = await res.json()
        if (Number.isFinite(data?.meta?.total)) total = data.meta.total
        else total = (data?.orders || []).length
        const batch: Order[] = data?.orders || []
        if (batch.length === 0) break
        rows.push(...batch)
        if (batch.length < pageSize) break
        page += 1
        await new Promise(r => setTimeout(r, 50))
      }

      const header = ['OrderNumber','CustomerName','CustomerEmail','Status','ItemCount','Items','TotalUSD','DateISO']
      const escape = (v: string) => '"' + (v ?? '').replaceAll('"', '""') + '"'
      const csv = [
        header.join(','),
        ...rows.map((o) => {
          const itemsText = (o.items || []).map(it => `${it.design.title}${it.purchaseType === 'OWNERSHIP' ? ' (Ownership)' : ''}×${it.quantity}`).join('; ')
          return [
            o.orderNumber,
            o.customer.name || o.customer.email || '',
            o.customer.email || '',
            o.status,
            String((o.items || []).length),
            itemsText,
            String(o.totalAmount ?? ''),
            new Date(o.createdAt).toISOString()
          ].map(x => escape(String(x))).join(',')
        })
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-all-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsOrderExporting(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchAdminData()
  }, [session, status, router, fetchAdminData])

  // Load admin locale/currency for formatting
  useEffect(() => {
    const loadLocale = async () => {
      try {
        const res = await fetch('/api/locale', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setLocale(data.locale || 'en-US')
          setCurrency(data.currency === 'NGN' ? 'NGN' : 'USD')
        }
      } catch {
        // ignore
      }
    }
    loadLocale()
  }, [])

  // Reset page to 1 when filters change
  useEffect(() => {
    setExPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exBuyerQuery, exSellerQuery, exFromDate, exToDate, exMinPrice, exMaxPrice])

  // Debounced server-side fetch when filters, pagination, or sorting change
  useEffect(() => {
    const t = setTimeout(() => {
      fetchExclusiveSales()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exBuyerQuery, exSellerQuery, exFromDate, exToDate, exPage, exPageSize, exSortBy, exSortOrder])

  const formatPrice = (amountUSD: number) => formatPriceLocalized(amountUSD, currency, locale)

  const computePlatformFeeUSD = (order: Order) => {
    const itemsTotal = (order.items || []).reduce((sum, it) => sum + it.price * it.quantity, 0)
    return Number((itemsTotal * 0.05).toFixed(2))
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000) // Auto-hide after 5 seconds
  }

  // Overview quick filters
  const [ovTimeframe, setOvTimeframe] = useState<'7d' | '30d' | 'all'>('7d')
  const [ovStatus, setOvStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED'>('ALL')

  const overviewOrders = useMemo(() => {
    const now = Date.now()
    const minTime = ovTimeframe === '7d' ? now - 7 * 24 * 60 * 60 * 1000
                  : ovTimeframe === '30d' ? now - 30 * 24 * 60 * 60 * 1000
                  : 0
    return (orders || [])
      .filter(o => (ovStatus === 'ALL' ? true : o.status === ovStatus))
      .filter(o => (minTime === 0 ? true : new Date(o.createdAt).getTime() >= minTime))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, ovStatus, ovTimeframe])

  

  const fetchExclusiveSales = async () => {
    const params = new URLSearchParams()
    if (exBuyerQuery.trim()) params.set('buyer', exBuyerQuery.trim())
    if (exSellerQuery.trim()) params.set('seller', exSellerQuery.trim())
    if (exFromDate) params.set('from', exFromDate)
    if (exToDate) params.set('to', exToDate)
    if (exOrderQuery.trim()) params.set('order', exOrderQuery.trim())
  if (exMinPrice && !Number.isNaN(parseFloat(exMinPrice))) params.set('minPrice', String(parseFloat(exMinPrice)))
  if (exMaxPrice && !Number.isNaN(parseFloat(exMaxPrice))) params.set('maxPrice', String(parseFloat(exMaxPrice)))
    // pagination
    params.set('page', String(exPage))
    params.set('pageSize', String(exPageSize))
    // sorting
    params.set('sortBy', exSortBy)
    params.set('sortOrder', exSortOrder)

    const res = await fetch(`/api/admin/exclusive-sales?${params.toString()}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setExclusiveSales(data.exclusiveSales || [])
      if (data.meta) {
        setExTotal(Number(data.meta.total) || 0)
      } else {
        setExTotal(data.exclusiveSales?.length || 0)
      }
    }
  }

  const handleSort = (key: 'date' | 'price' | 'buyer' | 'seller' | 'title') => {
    setExPage(1)
    if (exSortBy === key) {
      setExSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setExSortBy(key)
      // sensible defaults
      setExSortOrder(key === 'date' ? 'desc' : 'asc')
    }
  }

  const exportAllExclusiveSales = async () => {
    try {
      setIsExportingAll(true)
      const params = new URLSearchParams()
      if (exBuyerQuery.trim()) params.set('buyer', exBuyerQuery.trim())
      if (exSellerQuery.trim()) params.set('seller', exSellerQuery.trim())
      if (exFromDate) params.set('from', exFromDate)
      if (exToDate) params.set('to', exToDate)
  if (exOrderQuery.trim()) params.set('order', exOrderQuery.trim())
  if (exMinPrice && !Number.isNaN(parseFloat(exMinPrice))) params.set('minPrice', String(parseFloat(exMinPrice)))
  if (exMaxPrice && !Number.isNaN(parseFloat(exMaxPrice))) params.set('maxPrice', String(parseFloat(exMaxPrice)))
      params.set('sortBy', exSortBy)
      params.set('sortOrder', exSortOrder)

      const pageSize = 200
      let page = 1
      let total = Infinity
      const rows: ExclusiveSale[] = []

      while (rows.length < total) {
        const loopParams = new URLSearchParams(params)
        loopParams.set('page', String(page))
        loopParams.set('pageSize', String(pageSize))
        const res = await fetch(`/api/admin/exclusive-sales?${loopParams.toString()}`, { cache: 'no-store' })
        if (!res.ok) break
        const data = await res.json()
        if (Number.isFinite(data?.meta?.total)) {
          total = data.meta.total
        } else {
          total = data?.exclusiveSales?.length || 0
        }
        const batch: ExclusiveSale[] = data?.exclusiveSales || []
        if (batch.length === 0) break
        rows.push(...batch)
        if (batch.length < pageSize) break
        page += 1
        // small delay to avoid hammering server
        await new Promise(r => setTimeout(r, 50))
      }

      const header = ['OrderNumber','DesignTitle','BuyerName','BuyerEmail','SellerName','SellerEmail','PriceUSD','DateISO']
      const escape = (v: string) => '"' + (v ?? '').replaceAll('"', '""') + '"'
      const csv = [
        header.join(','),
        ...rows.map((r) => [
          r.order?.orderNumber || '',
          r.design.title || '',
          r.buyer.name || r.buyer.email || '',
          r.buyer.email || '',
          r.design.designer.name || r.design.designer.email || '',
          r.design.designer.email || '',
          String(r.purchasePrice ?? ''),
          new Date(r.createdAt).toISOString()
        ].map(x => escape(String(x))).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exclusive-sales-all-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExportingAll(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'verify' | 'unverify' | 'makeAdmin' | 'removeAdmin') => {
    if (action === 'makeAdmin' || action === 'removeAdmin') {
      const user = users.find(u => u.id === userId)
      if (user) {
        setAdminConfirm({ step: 1, userId, userEmail: user.email, action })
      }
      return
    }

    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (response.ok) {
        fetchAdminData() // Refresh data
        showNotification('success', `User ${action} completed successfully`)
      } else {
        showNotification('error', `Failed to ${action} user`)
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error)
      showNotification('error', `Error occurred while ${action} user`)
    }
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setDeleteConfirm({ step: 1, userId, userEmail: user.email })
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return
    
    try {
      console.log('Attempting to delete user:', deleteConfirm.userId)
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteConfirm.userId, action: 'delete' })
      })

      console.log('Delete response status:', response.status)
      const responseData = await response.json()
      console.log('Delete response data:', responseData)

      if (response.ok) {
        fetchAdminData()
        setDeleteConfirm(null)
        showNotification('success', `User account for ${deleteConfirm.userEmail} has been permanently deleted`)
      } else {
        showNotification('error', `Failed to delete user account: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showNotification('error', 'Network error occurred while deleting user account')
    }
  }

  const confirmAdminAction = async () => {
    if (!adminConfirm) return
    
    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminConfirm.userId, action: adminConfirm.action })
      })

      if (response.ok) {
        fetchAdminData()
        setAdminConfirm(null)
        showNotification('success', `User ${adminConfirm.action} completed successfully for ${adminConfirm.userEmail}`)
      } else {
        showNotification('error', `Failed to ${adminConfirm.action} user`)
      }
    } catch (error) {
      console.error(`Error ${adminConfirm.action} user:`, error)
      showNotification('error', `Error occurred during ${adminConfirm.action}`)
    }
  }

  const handleDesignAction = async (designId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      const response = await fetch('/api/admin/designs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId, action })
      })

      if (response.ok) {
        fetchAdminData()
        showNotification('success', `Design ${action} completed successfully`)
        try { window.dispatchEvent(new Event('notificationsUpdated')) } catch {}
      } else {
        showNotification('error', `Failed to ${action} design`)
      }
    } catch (error) {
      console.error(`Error ${action} design:`, error)
      showNotification('error', `Error occurred while ${action} design`)
    }
  }

  const handleDesignApproval = async (designId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/designs/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId,
          action,
          adminUser: session?.user?.email,
        }),
      })

      if (response.ok) {
        showToast(
          `Design ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
          'success'
        )
        await fetchData()
        try { window.dispatchEvent(new Event('notificationsUpdated')) } catch {}
      } else {
        const error = await response.json()
        showToast(`Failed to ${action} design: ${error.message}`, 'error')
      }
    } catch {
      showToast(`Failed to ${action} design`, 'error')
    }
  }

  const updateContactMessageStatus = async (messageId: string, status: string) => {
    try {
      const response = await fetch(`/api/contact/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        showNotification('success', `Message marked as ${status.toLowerCase()}`)
        fetchAdminData()
      } else {
        showNotification('error', 'Failed to update message status')
      }
    } catch {
      showNotification('error', 'Error updating message status')
    }
  }

  const fetchChatMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/customer-care/messages?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
        // Refresh unread counters because viewing marks as read
        fetchUnreadCounts()
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error)
    }
  }

  const sendChatReply = async (sessionId: string) => {
    if (!replyMessage.trim()) return

    try {
      const response = await fetch('/api/customer-care/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: replyMessage,
          isAdmin: true
        })
      })

      if (response.ok) {
        setReplyMessage('')
        fetchChatMessages(sessionId)
        showNotification('success', 'Reply sent successfully')
        // Replies do not change unread from users, but refresh anyway
        fetchUnreadCounts()
      } else {
        showNotification('error', 'Failed to send reply')
      }
    } catch {
      showNotification('error', 'Error sending reply')
    }
  }

  // Fetch unread counts helper
  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch('/api/customer-care/unread', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setUnreadTotal(Number(data.totalUnread || 0))
      const map: Record<string, number> = {}
      for (const row of data.sessions || []) {
        map[row.sessionId] = row.unread || 0
      }
      setUnreadBySession(map)
    } catch {
      // ignore
    }
  }

  // Poll unread counts periodically when on admin page
  useEffect(() => {
    fetchUnreadCounts()
    const t = setInterval(fetchUnreadCounts, 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = userFilter === 'all' || 
                         (userFilter === 'verified' && user.isVerified) ||
                         (userFilter === 'unverified' && !user.isVerified)
    return matchesSearch && matchesFilter
  })

  const filteredDesigns = designs.filter(design => {
    const statusMatch = (
      designFilter === 'all' ||
      (designFilter === 'pending' && design.approvalStatus === 'PENDING') ||
      (designFilter === 'approved' && design.approvalStatus === 'APPROVED') ||
      (designFilter === 'rejected' && design.approvalStatus === 'REJECTED')
    )
    const canDelete = design.totalSales === 0 && !design.isOwned
    const deletableMatch = deletableOnly ? canDelete : true
    const hasOrdersMatch = filterHasOrders ? design.totalSales > 0 : true
    const ownedMatch = filterOwned ? !!design.isOwned : true
    const inactiveMatch = filterInactive ? !design.isActive : true
    return statusMatch && deletableMatch && hasOrdersMatch && ownedMatch && inactiveMatch
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session || session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
  <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 xs:px-2 xs:py-6">
        <div className="mb-8 xs:mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your fashion marketplace platform</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 xs:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 xs:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-xs text-green-600">+{stats.recentSignups} this week</p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 xs:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Designs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDesigns}</p>
                  <p className="text-xs text-blue-600">{stats.activeUsers} active sellers</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 xs:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
                  <p className="text-xs text-green-600">{stats.totalOrders} orders</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 xs:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Earnings (5%)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.platformEarnings)}</p>
                  <p className="text-xs text-purple-600">Commission earned</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 px-4 overflow-x-auto xs:space-x-4 xs:px-3 md:space-x-8 md:px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'designs', label: 'Design Management', icon: ShoppingBag },
                { id: 'orders', label: 'Order Management', icon: ShoppingBag },
                { id: 'exclusive', label: 'Exclusive Sales', icon: TrendingUp },
                { id: 'resources', label: 'Resources', icon: BookOpen },
                { id: 'contact', label: 'Contact Messages', icon: Mail },
                { id: 'requests', label: 'Requests', icon: AlertTriangle },
                { id: 'chat', label: 'Customer Care', icon: MessageCircle },
                { id: 'earnings', label: 'Earnings Report', icon: DollarSign }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span className="relative inline-flex items-center">
                    {tab.label}
                    {tab.id === 'chat' && unreadTotal > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 xs:p-4 md:p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportAllOrders}
                      disabled={isOrderExporting}
                      className={`px-3 py-2 text-sm rounded text-white ${isOrderExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      title="Export all filtered orders"
                    >
                      {isOrderExporting ? 'Exporting…' : 'Export Orders CSV'}
                    </button>
                    <Link href="#orders" onClick={() => setActiveTab('orders')} className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Go to Orders</Link>
                  </div>
                </div>
                {/* Quick filters for overview */}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Time:</span>
                    <button onClick={() => setOvTimeframe('7d')} className={`px-2 py-1 rounded ${ovTimeframe==='7d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>7d</button>
                    <button onClick={() => setOvTimeframe('30d')} className={`px-2 py-1 rounded ${ovTimeframe==='30d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>30d</button>
                    <button onClick={() => setOvTimeframe('all')} className={`px-2 py-1 rounded ${ovTimeframe==='all'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Status:</span>
                    <button onClick={() => setOvStatus('ALL')} className={`px-2 py-1 rounded ${ovStatus==='ALL'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
                    <button onClick={() => setOvStatus('COMPLETED')} className={`px-2 py-1 rounded ${ovStatus==='COMPLETED'?'bg-green-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Completed</button>
                    <button onClick={() => setOvStatus('PENDING')} className={`px-2 py-1 rounded ${ovStatus==='PENDING'?'bg-yellow-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Pending</button>
                    <button onClick={() => setOvStatus('FAILED')} className={`px-2 py-1 rounded ${ovStatus==='FAILED'?'bg-red-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Failed</button>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 xs:p-3">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ov-buyer" className="block text-xs text-gray-600 mb-1">Buyer</label>
                      <input id="ov-buyer" type="text" value={ordBuyerQuery} onChange={(e)=>{ setOrdBuyerQuery(e.target.value); setOrdPage(1); }} placeholder="Name or email" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" aria-label="Filter recent activity by buyer" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ov-order" className="block text-xs text-gray-600 mb-1">Order #</label>
                      <input id="ov-order" type="text" value={ordOrderQuery} onChange={(e)=>{ setOrdOrderQuery(e.target.value); setOrdPage(1); }} placeholder="e.g. ORD-10023" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" aria-label="Filter recent activity by order number" />
                    </div>
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="ov-from" className="block text-xs text-gray-600 mb-1">From</label>
                        <input id="ov-from" type="date" value={ordFromDate} onChange={(e)=>{ setOrdFromDate(e.target.value); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="Start date" aria-label="Start date" />
                      </div>
                      <div>
                        <label htmlFor="ov-to" className="block text-xs text-gray-600 mb-1">To</label>
                        <input id="ov-to" type="date" value={ordToDate} onChange={(e)=>{ setOrdToDate(e.target.value); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="End date" aria-label="End date" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      {ordTotal > 0 ? (()=>{ const start=(ordPage-1)*ordPageSize+1; const end=Math.min(ordPage*ordPageSize, ordTotal); return <span>Showing {start}-{end} of {ordTotal} results</span>; })() : <span>Showing results matching your filters</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{ setOrdBuyerQuery(''); setOrdOrderQuery(''); setOrdFromDate(''); setOrdToDate(''); setOrdMinTotal(''); setOrdMaxTotal(''); setOrdStatus('ALL'); setOrdPurchaseType('ALL'); setOrdSortBy('date'); setOrdSortOrder('desc'); setOrdPageSize(50); setOrdPage(1); fetchOrders(); }} className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Reset all</button>
                    </div>
                  </div>
                </div>
                {/* Compact, scrollable recent orders table */}
                <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Fee</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {overviewOrders.slice(0, 20).map((order) => (
                        <tr key={order.id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">#{order.orderNumber}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                            <div className="truncate max-w-[14rem] md:max-w-[18rem]" title={`${order.customer.name || ''} ${order.customer.email}`}>
                              {order.customer.name || order.customer.email}
                              <span className="text-gray-500">{order.customer.name ? ` — ${order.customer.email}` : ''}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-green-700 text-right">{formatPrice(computePlatformFeeUSD(order))}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{formatPrice(order.totalAmount)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right">
                  <Link href="#orders" onClick={() => setActiveTab('orders')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View all orders →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                      />
                    </div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      title="Filter users by verification status"
                      aria-label="Filter users"
                    >
                      <option value="all">All Users</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                            {user._count.designs} designs, {user._count.orders} orders
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUserAction(user.id, user.isVerified ? 'unverify' : 'verify')}
                                className={`p-1 rounded ${
                                  user.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                                }`}
                                title={user.isVerified ? 'Unverify user' : 'Verify user'}
                              >
                                {user.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              {user.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUserAction(user.id, 'makeAdmin')}
                                  className="p-1 rounded text-purple-600 hover:text-purple-800"
                                  title="Make admin"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}
                              {user.role === 'ADMIN' && user.id !== session.user?.id && (
                                <button
                                  onClick={() => handleUserAction(user.id, 'removeAdmin')}
                                  className="p-1 rounded text-red-600 hover:text-red-800"
                                  title="Remove admin"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}
                              {user.id !== session.user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1 rounded text-red-600 hover:text-red-800"
                                  title="Delete user account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'designs' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Design Management</h3>
                  <div className="flex items-center space-x-3">
                    <select
                      value={designFilter}
                      onChange={(e) => setDesignFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                      title="Filter designs by approval status"
                    >
                      <option value="all">All Designs</option>
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700" title="Show only designs that are safe to delete (no sales and not owned)">
                      <input
                        type="checkbox"
                        checked={deletableOnly}
                        onChange={(e) => setDeletableOnly(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>Show deletable only</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700" title="Filter to designs with completed orders">
                      <input
                        type="checkbox"
                        checked={filterHasOrders}
                        onChange={(e) => setFilterHasOrders(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>Has orders</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700" title="Filter to owned designs">
                      <input
                        type="checkbox"
                        checked={filterOwned}
                        onChange={(e) => setFilterOwned(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>Owned</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700" title="Filter to inactive designs">
                      <input
                        type="checkbox"
                        checked={filterInactive}
                        onChange={(e) => setFilterInactive(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>
                {/* Admin reminder: prefer Deactivate over Delete for sold/owned items */}
                <div className="mb-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                  Reminder: For designs with completed orders or ownership transfers, deletion is disabled. Use <span className="font-medium">Deactivate</span> to remove listings from the marketplace while preserving access for prior purchasers. See{' '}
                  <Link href="/terms" className="underline">Terms</Link>.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredDesigns.map((design) => (
                    <div key={design.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="aspect-square relative">
                        <SafeImage
                          src={design.imageUrl}
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
                          design.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          design.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {design.approvalStatus}
                        </div>
                        {design.totalSales > 0 && (
                          <div className="absolute top-10 right-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold" title="This design has completed orders">
                            Has orders
                          </div>
                        )}
                        {!design.isActive && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <span className="text-white font-semibold">INACTIVE</span>
                          </div>
                        )}
                        {design.isOwned && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            OWNED
                          </div>
                        )}
                      </div>
                      <div className="p-3 md:p-4">
                        <h4 className="font-semibold text-gray-900 truncate">{design.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">by {design.designer.name || design.designer.email}</p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-indigo-600">{formatPrice(design.price)}</span>
                          <span className="text-sm text-gray-500">{design.totalSales} sales</span>
                        </div>
                        {design.buyingTypes === 'BOTH' && design.ownershipPrice && (
                          <div className="mb-2">
                            <span className="text-sm text-purple-600 font-medium">
                              Ownership: {formatPrice(design.ownershipPrice)}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mb-3">
                          Buying Type: {design.buyingTypes}
                        </div>
                        
                        {/* Approval Actions */}
                        {design.approvalStatus === 'PENDING' && (
                          <div className="flex space-x-2 mb-2">
                            <button
                              onClick={() => handleDesignApproval(design.id, 'approve')}
                              className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDesignApproval(design.id, 'reject')}
                              className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <Link
                            href={`/designs/${design.id}?admin=true`}
                            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 rounded flex items-center gap-1"
                            title="View full design details (admin access)"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Link>
                          <button
                            onClick={() => handleDesignAction(design.id, design.isActive ? 'deactivate' : 'activate')}
                            className={`flex-1 px-3 py-1 text-xs rounded ${
                              design.isActive 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {design.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDesignAction(design.id, 'delete')}
                            className={`px-3 py-1 text-xs rounded ${design.totalSales > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                            disabled={design.totalSales > 0}
                            title={design.totalSales > 0 ? 'Cannot delete a design that has orders. Please deactivate instead.' : 'Delete design'}
                          >
                            Delete
                          </button>
                        </div>
                        {design.totalSales > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            Has orders; delete disabled. Use <span className="font-medium">Deactivate</span> to remove from marketplace.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 id="orders" className="text-lg font-semibold text-gray-900 mb-6">Order Management</h3>
                {/* Quick chips: timeframe and status */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Time:</span>
                    <button
                      onClick={() => { setOrdTimeframe('7d'); setOrdFromDate(new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)); setOrdToDate(''); setOrdPage(1) }}
                      className={`px-2 py-1 rounded ${ordTimeframe==='7d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >7d</button>
                    <button
                      onClick={() => { setOrdTimeframe('30d'); setOrdFromDate(new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)); setOrdToDate(''); setOrdPage(1) }}
                      className={`px-2 py-1 rounded ${ordTimeframe==='30d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >30d</button>
                    <button
                      onClick={() => { setOrdTimeframe('all'); setOrdFromDate(''); setOrdToDate(''); setOrdPage(1) }}
                      className={`px-2 py-1 rounded ${ordTimeframe==='all'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >All</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Status:</span>
                    <button onClick={() => { setOrdStatus('ALL'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordStatus==='ALL'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
                    <button onClick={() => { setOrdStatus('COMPLETED'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordStatus==='COMPLETED'?'bg-green-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Completed</button>
                    <button onClick={() => { setOrdStatus('PENDING'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordStatus==='PENDING'?'bg-yellow-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Pending</button>
                    <button onClick={() => { setOrdStatus('FAILED'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordStatus==='FAILED'?'bg-red-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Failed</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Type:</span>
                    <button onClick={() => { setOrdPurchaseType('ALL'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordPurchaseType==='ALL'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
                    <button onClick={() => { setOrdPurchaseType('REGULAR'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordPurchaseType==='REGULAR'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Regular</button>
                    <button onClick={() => { setOrdPurchaseType('OWNERSHIP'); setOrdPage(1) }} className={`px-2 py-1 rounded ${ordPurchaseType==='OWNERSHIP'?'bg-purple-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Ownership</button>
                  </div>
                </div>
                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 xs:p-3">
                  <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ord-buyer" className="block text-xs text-gray-600 mb-1">Buyer</label>
                      <input id="ord-buyer" type="text" value={ordBuyerQuery} onChange={(e)=>{ setOrdBuyerQuery(e.target.value); setOrdPage(1); }} placeholder="Name or email" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" aria-label="Filter by buyer name or email" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ord-order" className="block text-xs text-gray-600 mb-1">Order #</label>
                      <input id="ord-order" type="text" value={ordOrderQuery} onChange={(e)=>{ setOrdOrderQuery(e.target.value); setOrdPage(1); }} placeholder="e.g. ORD-10023" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" aria-label="Filter by order number" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ord-status" className="block text-xs text-gray-600 mb-1">Status</label>
                      <select id="ord-status" value={ordStatus} onChange={(e)=>{ setOrdStatus(e.target.value as 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED'); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="Filter by order status" aria-label="Filter by order status"><option value="ALL">All</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="ord-purchase-type" className="block text-xs text-gray-600 mb-1">Purchase Type</label>
                      <select id="ord-purchase-type" value={ordPurchaseType} onChange={(e)=>{ setOrdPurchaseType(e.target.value as 'ALL' | 'REGULAR' | 'OWNERSHIP'); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="Filter by purchase type" aria-label="Filter by purchase type"><option value="ALL">All</option><option value="REGULAR">Regular</option><option value="OWNERSHIP">Ownership</option></select>
                    </div>
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="ord-from" className="block text-xs text-gray-600 mb-1">From</label>
                        <input id="ord-from" type="date" value={ordFromDate} onChange={(e)=>{ setOrdFromDate(e.target.value); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="Start date" aria-label="Start date" />
                      </div>
                      <div>
                        <label htmlFor="ord-to" className="block text-xs text-gray-600 mb-1">To</label>
                        <input id="ord-to" type="date" value={ordToDate} onChange={(e)=>{ setOrdToDate(e.target.value); setOrdPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="End date" aria-label="End date" />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min Total (USD)</label>
                        <input type="number" min={0} step="0.01" value={ordMinTotal} onChange={(e)=>{ setOrdMinTotal(e.target.value); setOrdPage(1); }} placeholder="e.g. 10" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max Total (USD)</label>
                        <input type="number" min={0} step="0.01" value={ordMaxTotal} onChange={(e)=>{ setOrdMaxTotal(e.target.value); setOrdPage(1); }} placeholder="e.g. 500" className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      {ordTotal > 0 ? (()=>{ const start=(ordPage-1)*ordPageSize+1; const end=Math.min(ordPage*ordPageSize, ordTotal); return <span>Showing {start}-{end} of {ordTotal} results</span>; })() : <span>Showing results matching your filters</span>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={()=>{ setOrdBuyerQuery(''); setOrdOrderQuery(''); setOrdFromDate(''); setOrdToDate(''); setOrdMinTotal(''); setOrdMaxTotal(''); setOrdStatus('ALL'); setOrdPurchaseType('ALL'); setOrdSortBy('date'); setOrdSortOrder('desc'); setOrdPageSize(50); setOrdTimeframe('all'); setOrdPage(1); fetchOrders(); }} className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Reset all</button>
                      <label className="text-xs text-gray-500" htmlFor="ord-page-size">Rows per page</label>
                      <select id="ord-page-size" value={ordPageSize} onChange={(e)=>{ setOrdPageSize(parseInt(e.target.value,10) || 50); setOrdPage(1); }} className="px-2 py-1 border border-gray-300 rounded text-sm text-black" aria-label="Rows per page">{[10,25,50,100,200].map(n=> <option key={n} value={n}>{n}</option>)}</select>
                      {/* Desktop-only quick size chips */}
                      <div className="hidden md:flex items-center gap-1 ml-1" aria-label="Quick rows per page">
                        {[25,50,100].map(sz => (
                          <button
                            key={sz}
                            onClick={() => { setOrdPageSize(sz); setOrdPage(1) }}
                            className={`px-2 py-1 rounded ${ordPageSize===sz?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            title={`Show ${sz} rows per page`}
                          >{sz}</button>
                        ))}
                      </div>
                      <button onClick={()=> setOrdPage(p => Math.max(1, p-1))} disabled={ordPage<=1} className={`px-2 py-1 text-sm rounded ${ordPage<=1?'bg-gray-100 text-gray-400 cursor-not-allowed':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Prev</button>
                      <span className="text-xs text-gray-600 px-1">Page {ordPage}{ordTotal>0?` of ${Math.max(1, Math.ceil(ordTotal/ordPageSize))}`:''}</span>
                      <input type="number" min={1} max={Math.max(1, Math.ceil(ordTotal/ordPageSize))} value={ordPage} onChange={(e)=>{ const v=parseInt(e.target.value||'1',10); if(!Number.isNaN(v)) setOrdPage(Math.min(Math.max(1,v), Math.max(1, Math.ceil(ordTotal/ordPageSize)))) }} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-black" title="Go to page" aria-label="Go to page" />
                      <button onClick={()=> setOrdPage(p => p + 1)} disabled={ordTotal>0 ? ordPage >= Math.ceil(ordTotal/ordPageSize) : orders.length < ordPageSize} className={`px-2 py-1 text-sm rounded ${ordTotal>0 && ordPage >= Math.ceil(ordTotal/ordPageSize) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Next</button>
                      <button onClick={exportAllOrders} disabled={isOrderExporting} className={`px-3 py-2 text-sm rounded text-white ${isOrderExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isOrderExporting ? 'Exporting…' : 'Export all CSV'}</button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>handleOrderSort('orderNumber')} className={`inline-flex items-center gap-1 ${ordSortBy==='orderNumber'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>Order {ordSortBy==='orderNumber' && <span>{ordSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>handleOrderSort('customer')} className={`inline-flex items-center gap-1 ${ordSortBy==='customer'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>Customer {ordSortBy==='customer' && <span>{ordSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>handleOrderSort('total')} className={`inline-flex items-center gap-1 ${ordSortBy==='total'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>Amount {ordSortBy==='total' && <span>{ordSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Fee</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>handleOrderSort('date')} className={`inline-flex items-center gap-1 ${ordSortBy==='date'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>Date {ordSortBy==='date' && <span>{ordSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.customer.name} ({order.customer.email})
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs">
                            <div className="space-y-1">
                              {order.items && order.items.length > 0 ? (
                                order.items.map((item) => (
                                  <div key={item.id} className="truncate" title={`${item.design.title} ×${item.quantity}`}>
                                    {item.design.title}
                                    {item.purchaseType === 'OWNERSHIP' ? ' (Ownership)' : ''}
                                    {` ×${item.quantity}`}
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(order.totalAmount)}
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-green-600">
                            {formatPrice(computePlatformFeeUSD(order))}
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'exclusive' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Exclusive Sales</h3>
                {/* Quick chips: timeframe */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Time:</span>
                    <button
                      onClick={() => { setExTimeframe('7d'); setExFromDate(new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)); setExToDate(''); setExPage(1) }}
                      className={`px-2 py-1 rounded ${exTimeframe==='7d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >7d</button>
                    <button
                      onClick={() => { setExTimeframe('30d'); setExFromDate(new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)); setExToDate(''); setExPage(1) }}
                      className={`px-2 py-1 rounded ${exTimeframe==='30d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >30d</button>
                    <button
                      onClick={() => { setExTimeframe('all'); setExFromDate(''); setExToDate(''); setExPage(1) }}
                      className={`px-2 py-1 rounded ${exTimeframe==='all'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >All</button>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 xs:p-3">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Buyer</label>
                      <input
                        type="text"
                        value={exBuyerQuery}
                        onChange={(e) => setExBuyerQuery(e.target.value)}
                        placeholder="Name or email"
                        title="Filter by buyer name or email"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Seller</label>
                      <input
                        type="text"
                        value={exSellerQuery}
                        onChange={(e) => setExSellerQuery(e.target.value)}
                        placeholder="Name or email"
                        title="Filter by seller name or email"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="date"
                          value={exFromDate}
                          onChange={(e) => setExFromDate(e.target.value)}
                          title="Start date"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="date"
                          value={exToDate}
                          onChange={(e) => setExToDate(e.target.value)}
                          title="End date"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Order #</label>
                      <input
                        type="text"
                        value={exOrderQuery}
                        onChange={(e) => setExOrderQuery(e.target.value)}
                        placeholder="e.g. ORD-10023"
                        title="Filter by order number"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Min Price (USD)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={exMinPrice}
                        onChange={(e) => setExMinPrice(e.target.value)}
                        placeholder="e.g. 50"
                        title="Minimum price in USD"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Max Price (USD)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={exMaxPrice}
                        onChange={(e) => setExMaxPrice(e.target.value)}
                        placeholder="e.g. 500"
                        title="Maximum price in USD"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-black placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      {exTotal > 0 ? (
                        (() => {
                          const start = (exPage - 1) * exPageSize + 1
                          const end = Math.min(exPage * exPageSize, exTotal)
                          return <span>Showing {start}-{end} of {exTotal} results</span>
                        })()
                      ) : (
                        <span>Showing results matching your filters</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setExBuyerQuery(''); setExSellerQuery(''); setExFromDate(''); setExToDate(''); setExMinPrice(''); setExMaxPrice(''); setExOrderQuery(''); fetchExclusiveSales(); }}
                        className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Reset filters
                      </button>
                      <button
                        onClick={() => { setExBuyerQuery(''); setExSellerQuery(''); setExFromDate(''); setExToDate(''); setExMinPrice(''); setExMaxPrice(''); setExOrderQuery(''); setExSortBy('date'); setExSortOrder('desc'); setExPageSize(50); setExPage(1); fetchExclusiveSales(); }}
                        className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        title="Reset all filters, sort, and paging"
                      >
                        Reset all
                      </button>
                      <button
                        onClick={() => { setExSortBy('date'); setExSortOrder('desc'); setExPage(1); fetchExclusiveSales(); }}
                        className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        title="Reset sort"
                      >
                        Reset sort
                      </button>
                      <div className="hidden md:flex items-center gap-2">
                        <label htmlFor="ex-page-size" className="text-xs text-gray-500">Rows per page</label>
                        <select
                          id="ex-page-size"
                          value={exPageSize}
                          onChange={(e) => { setExPageSize(parseInt(e.target.value, 10) || 50); setExPage(1) }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
                          title="Rows per page"
                          aria-label="Rows per page"
                        >
                          {[10, 25, 50, 100, 200].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExPage(p => Math.max(1, p - 1))}
                            disabled={exPage <= 1}
                            className={`px-2 py-1 text-sm rounded ${exPage <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            aria-label="Previous page"
                            title="Previous page"
                          >
                            Prev
                          </button>
                          <span className="text-xs text-gray-600 px-1">
                            Page {exPage}{exTotal > 0 ? ` of ${Math.max(1, Math.ceil(exTotal / exPageSize))}` : ''}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, Math.ceil(exTotal / exPageSize))}
                            value={exPage}
                            onChange={(e) => {
                              const v = parseInt(e.target.value || '1', 10)
                              if (!Number.isNaN(v)) setExPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(exTotal / exPageSize))))
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.currentTarget as HTMLInputElement
                                const v = parseInt(input.value || '1', 10)
                                if (!Number.isNaN(v)) setExPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(exTotal / exPageSize))))
                              }
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-black"
                            title="Go to page"
                            aria-label="Go to page"
                          />
                          <button
                            onClick={() => setExPage(p => p + 1)}
                            disabled={exTotal > 0 ? exPage >= Math.ceil(exTotal / exPageSize) : filteredExclusiveSales.length < exPageSize}
                            className={`px-2 py-1 text-sm rounded ${exTotal > 0 && exPage >= Math.ceil(exTotal / exPageSize) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            aria-label="Next page"
                            title="Next page"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={exportAllExclusiveSales}
                        disabled={isExportingAll}
                        className={`px-3 py-2 text-sm rounded text-white ${isExportingAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                        {isExportingAll ? 'Exporting…' : 'Export all CSV'}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Filtered results table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={() => handleSort('title')} className={`inline-flex items-center gap-1 ${exSortBy === 'title' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Design
                            {exSortBy === 'title' && <span>{exSortOrder === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={() => handleSort('buyer')} className={`inline-flex items-center gap-1 ${exSortBy === 'buyer' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Buyer
                            {exSortBy === 'buyer' && <span>{exSortOrder === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={() => handleSort('seller')} className={`inline-flex items-center gap-1 ${exSortBy === 'seller' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Seller
                            {exSortBy === 'seller' && <span>{exSortOrder === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={() => handleSort('price')} className={`inline-flex items-center gap-1 ${exSortBy === 'price' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Price
                            {exSortBy === 'price' && <span>{exSortOrder === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={() => handleSort('date')} className={`inline-flex items-center gap-1 ${exSortBy === 'date' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Date
                            {exSortBy === 'date' && <span>{exSortOrder === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredExclusiveSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 md:px-6 md:py-8 text-center text-gray-500">No exclusive sales yet</td>
                        </tr>
                      ) : (
                        filteredExclusiveSales.map((ex) => (
                          <tr key={ex.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {ex.order?.orderNumber || '—'}
                            </td>
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs">
                              <Link href={`/designs/${ex.design.id}?admin=true`} className="text-indigo-600 hover:underline" title={ex.design.title}>
                                {ex.design.title}
                              </Link>
                              {!ex.design.isActive && (
                                <span className="ml-2 inline-flex px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Removed from marketplace</span>
                              )}
                            </td>
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-700">
                              {ex.buyer.name || ex.buyer.email}
                              <div className="text-xs text-gray-500">{ex.buyer.email}</div>
                            </td>
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-700">
                              {ex.design.designer.name || ex.design.designer.email}
                              <div className="text-xs text-gray-500">{ex.design.designer.email}</div>
                            </td>
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatPrice(ex.purchasePrice)}
                            </td>
                            <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(ex.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Resource Management</h3>
                  <Link
                    href="/admin/resources"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Manage Resources
                  </Link>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Educational Resources</h4>
                  <p className="text-gray-600 mb-4">
                    Add and manage educational resources for fashion designers including tutorials, guides, tools, and references.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Resources help users learn design fundamentals, color theory, technical drawing, pattern making, and more.
                  </p>
                  <Link
                    href="/admin/resources"
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Go to Resource Manager
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Earnings Report</h3>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-base font-medium text-green-900">Total Commission Earned</h4>
                      <p className="text-2xl font-bold text-green-600">{formatPrice(stats.platformEarnings)}</p>
                      <p className="text-xs text-green-700">5% of all sales</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-base font-medium text-blue-900">Total Sales Volume</h4>
                      <p className="text-2xl font-bold text-blue-600">{formatPrice(stats.totalRevenue)}</p>
                      <p className="text-xs text-blue-700">{stats.totalOrders} orders processed</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="text-base font-medium text-purple-900">Average Order Value</h4>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatPrice(stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders) : 0)}
                      </p>
                      <p className="text-xs text-purple-700">Per transaction</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Messages</h3>
                  <div className="text-sm text-gray-600">
                    {contactMessages.length} total messages
                  </div>
                </div>
                
                {selectedMessage ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ← Back to messages
                        </button>
                        <div className="flex space-x-2">
                          <select
                            value={selectedMessage.status}
                            onChange={(e) => updateContactMessageStatus(selectedMessage.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm text-black"
                            aria-label="Change message status"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedMessage.priority === 'high' ? 'bg-red-100 text-red-800' :
                            selectedMessage.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedMessage.priority} priority
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          From: <strong>{selectedMessage.name}</strong> ({selectedMessage.email})
                          <br />
                          Sent: {new Date(selectedMessage.createdAt).toLocaleString()}
                          {selectedMessage.user && (
                            <><br />User Account: <strong>{selectedMessage.user.name}</strong> ({selectedMessage.user.email})</>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Message:</h5>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contactMessages.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-6 md:px-6 md:py-8 text-center text-gray-500">
                                No contact messages yet
                              </td>
                            </tr>
                          ) : (
                            contactMessages.map((message) => (
                              <tr key={message.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                    {message.subject}
                                  </div>
                                </td>
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{message.name}</div>
                                  <div className="text-sm text-gray-500">{message.email}</div>
                                </td>
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    message.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {message.priority}
                                  </span>
                                </td>
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    message.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                    message.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    message.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {message.status}
                                  </span>
                                </td>
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </td>
                                  <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => setSelectedMessage(message)}
                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                                  >
                                    View
                                  </button>
                                  {message.status === 'OPEN' && (
                                    <button
                                      onClick={() => updateContactMessageStatus(message.id, 'IN_PROGRESS')}
                                      className="text-yellow-600 hover:text-yellow-900"
                                    >
                                      Start
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Deactivation Requests</h3>
                  <div className="text-sm text-gray-600">
                    {(contactMessages || []).filter(m => (m.subject || '').toLowerCase().startsWith('deactivation request')).length} total requests
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contactMessages
                          .filter((m) => (m.subject || '').toLowerCase().startsWith('deactivation request'))
                          .map((message) => {
                            // Attempt to extract Design ID from the message body
                            let designId: string | null = null
                            try {
                              const match = message.message.match(/\bID:\s*([^\s]+)/i)
                              if (match) designId = match[1]
                            } catch {}
                            const designTitle = message.subject.replace(/^Deactivation request:\s*/i, '')
                            return (
                              <tr key={message.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={message.subject}>
                                    {message.subject}
                                  </div>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{message.user?.name || message.name}</div>
                                  <div className="text-sm text-gray-500">{message.user?.email || message.email}</div>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    message.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                    message.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    message.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {message.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm">
                                  <div className="text-gray-900 truncate max-w-[12rem]" title={designTitle}>{designTitle || '—'}</div>
                                  {designId && (
                                    <div className="text-xs text-gray-500">ID: {designId}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-3">
                                    <select
                                      value={message.status}
                                      onChange={(e) => updateContactMessageStatus(message.id, e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
                                      aria-label="Update status"
                                    >
                                      <option value="OPEN">Open</option>
                                      <option value="IN_PROGRESS">In Progress</option>
                                      <option value="RESOLVED">Resolved</option>
                                      <option value="CLOSED">Closed</option>
                                    </select>
                                    {designId ? (
                                      <Link href={`/designs/${designId}?admin=true`} className="text-indigo-600 hover:underline">View design</Link>
                                    ) : (
                                      <span className="text-gray-400">No ID</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        {contactMessages.filter((m) => (m.subject || '').toLowerCase().startsWith('deactivation request')).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 md:px-6 md:py-8 text-center text-gray-500">
                              No deactivation requests yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {activeTab === 'chat' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Care Chat Sessions</h3>
                  <div className="text-sm text-gray-600">
                    {chatSessions.length} active sessions
                  </div>
                </div>
                
                {selectedChatSession ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedChatSession(null)
                            setChatMessages([])
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ← Back to chat sessions
                        </button>
                        <div className="text-sm text-gray-600">
                          Chat with: <strong>{selectedChatSession.user.name || selectedChatSession.user.email}</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-96 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            msg.isAdmin ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.isAdmin ? 'text-indigo-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 p-4">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendChatReply(selectedChatSession.id)
                            }
                          }}
                        />
                        <button
                          onClick={() => sendChatReply(selectedChatSession.id)}
                          disabled={!replyMessage.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                            <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {chatSessions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 md:px-6 md:py-8 text-center text-gray-500">
                                No active chat sessions
                              </td>
                            </tr>
                          ) : (
                            chatSessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{session.user.name || 'Anonymous'}</div>
                                  <div className="text-sm text-gray-500">{session.user.email}</div>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <span>{session._count.messages} messages</span>
                                    {(unreadBySession[session.id] || 0) > 0 && (
                                      <span className="inline-flex items-center justify-center text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white" title={`${unreadBySession[session.id]} unread from user`}>
                                        {unreadBySession[session.id] > 99 ? '99+' : unreadBySession[session.id]}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                  {session.messages[0] ? (
                                    <div>
                                      <div className="truncate max-w-xs">{session.messages[0].message}</div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(session.messages[0].createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ) : (
                                    'No messages yet'
                                  )}
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    session.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    session.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {session.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => {
                                      setSelectedChatSession(session)
                                      fetchChatMessages(session.id)
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Join Chat
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {deleteConfirm.step === 1 ? 'Confirm User Deletion' : 'Final Confirmation'}
            </h3>
            
            {deleteConfirm.step === 1 ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the account for <strong>{deleteConfirm.userEmail}</strong>?
                </p>
                <p className="text-sm text-red-600 mb-6">
                  This action will permanently delete all user data, designs, and order history.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ ...deleteConfirm, step: 2 })}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                        <strong>FINAL WARNING:</strong> You are about to permanently delete {deleteConfirm.userEmail}&apos;s account.
                </p>
                <p className="text-sm text-red-600 mb-6">
                        Type &quot;DELETE&quot; to confirm this irreversible action:
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-4 text-black placeholder-gray-500"
                  id="delete-confirmation-input"
                  onChange={(e) => {
                    setDeleteConfirm(prev => prev ? {
                      ...prev,
                      inputValue: e.target.value
                    } : null);
                  }}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    id="final-delete-btn"
                    onClick={confirmDeleteUser}
                    disabled={deleteConfirm?.inputValue?.toUpperCase() !== 'DELETE'}
                    className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
                      deleteConfirm?.inputValue?.toUpperCase() === 'DELETE'
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Action Confirmation Dialog */}
      {adminConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {adminConfirm.step === 1 ? 'Confirm Admin Action' : 'Final Confirmation'}
            </h3>
            
            {adminConfirm.step === 1 ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to {adminConfirm.action === 'makeAdmin' ? 'grant admin privileges to' : 'remove admin privileges from'} <strong>{adminConfirm.userEmail}</strong>?
                </p>
                <p className="text-sm text-amber-600 mb-6">
                  {adminConfirm.action === 'makeAdmin' 
                    ? 'Admin users will have full platform access and management capabilities.'
                    : 'This user will lose all administrative privileges immediately.'
                  }
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setAdminConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setAdminConfirm({ ...adminConfirm, step: 2 })}
                    className="flex-1 px-4 py-2 text-white bg-amber-600 rounded hover:bg-amber-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  <strong>FINAL CONFIRMATION:</strong> You are about to {adminConfirm.action === 'makeAdmin' ? 'grant admin privileges to' : 'remove admin privileges from'} {adminConfirm.userEmail}.
                </p>
                <p className="text-sm text-amber-600 mb-6">
                  Type &quot;CONFIRM&quot; to proceed:
                </p>
                <input
                  type="text"
                  placeholder="Type CONFIRM to proceed"
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-4 text-black placeholder-gray-500"
                  onChange={(e) => {
                    const confirmBtn = document.getElementById('final-admin-btn') as HTMLButtonElement;
                    if (confirmBtn) {
                      confirmBtn.disabled = e.target.value !== 'CONFIRM';
                    }
                  }}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => setAdminConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    id="final-admin-btn"
                    onClick={confirmAdminAction}
                    disabled={true}
                    className="flex-1 px-4 py-2 text-white bg-amber-600 rounded hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {adminConfirm.action === 'makeAdmin' ? 'GRANT ADMIN' : 'REMOVE ADMIN'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`rounded-lg p-4 shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white hover:text-gray-200"
                title="Close notification"
                aria-label="Close notification"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}