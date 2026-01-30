'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Truck, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface Shipment {
  id: string
  shipmentNumber: string
  status: 'PENDING' | 'SHIPPED' | 'RECEIVED_BY_ADMIN' | 'VERIFICATION_PASSED' | 'VERIFICATION_FAILED' | 'DISPUTED'
  productCount: number
  itemsExpected: number
  itemsReceived: number | null
  itemsMissing: number | null
  itemsDamaged: number | null
  hasDiscrepancy: boolean
  createdAt: string
  shippedAt: string | null
  receivedAt: string | null
  trackingNumber: string | null
  notes: string | null
}

export default function BoutiqueShipmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchShipments()
  }, [status, router])

  const fetchShipments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/boutique-shipments')
      if (response.ok) {
        const data = await response.json()
        setShipments(data.shipments || [])
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredShipments = shipments.filter(shipment => {
    return filter === 'all' || shipment.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SHIPPED': return 'bg-blue-100 text-blue-800'
      case 'RECEIVED_BY_ADMIN': return 'bg-indigo-100 text-indigo-800'
      case 'VERIFICATION_PASSED': return 'bg-green-100 text-green-800'
      case 'VERIFICATION_FAILED': return 'bg-red-100 text-red-800'
      case 'DISPUTED': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'SHIPPED': return <Truck className="w-4 h-4" />
      case 'VERIFICATION_PASSED': return <CheckCircle className="w-4 h-4" />
      case 'VERIFICATION_FAILED': return <XCircle className="w-4 h-4" />
      case 'DISPUTED': return <AlertCircle className="w-4 h-4" />
      default: return <Truck className="w-4 h-4" />
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading shipments...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Shipments</h1>
            <p className="text-gray-600">Track your shipments to the admin warehouse</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SHIPPED">Shipped</option>
            <option value="RECEIVED_BY_ADMIN">Received by Admin</option>
            <option value="VERIFICATION_PASSED">Verified ✓</option>
            <option value="VERIFICATION_FAILED">Verification Failed</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </div>

        {/* Shipments Table */}
        {filteredShipments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Shipment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tracking</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Verification</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Shipped</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{shipment.shipmentNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{shipment.trackingNumber || 'Pending'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="font-semibold">{shipment.itemsExpected}</span> expected
                        {shipment.itemsReceived !== null && (
                          <span> / <span className={shipment.itemsReceived === shipment.itemsExpected ? 'text-green-600' : 'text-orange-600'}>{shipment.itemsReceived}</span> received</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {shipment.hasDiscrepancy && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Discrepancy
                          </span>
                        )}
                        {!shipment.hasDiscrepancy && shipment.status === 'VERIFICATION_PASSED' && (
                          <span className="text-green-600 text-xs font-semibold">✓ Passed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
                          {getStatusIcon(shipment.status)}
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleDateString() : 'Not shipped'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/seller/boutique-shipments/${shipment.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {shipments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{shipments.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Shipments</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{shipments.filter(s => s.status === 'SHIPPED').length}</p>
              <p className="text-xs text-gray-600 mt-1">In Transit</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{shipments.filter(s => s.status === 'VERIFICATION_PASSED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Verified</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{shipments.filter(s => s.hasDiscrepancy).length}</p>
              <p className="text-xs text-gray-600 mt-1">Discrepancies</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
