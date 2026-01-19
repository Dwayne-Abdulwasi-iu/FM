'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Filter,
  ExternalLink,
  Mail,
  User,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Video,
  File,
  AlertCircle,
  MapPin,
  Package,
} from 'lucide-react';

interface CommissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  designerId: string;
  designerName: string;
  designerEmail: string | null;
  designerPageUrl: string;
  title: string;
  description: string;
  category: string | null;
  budget: string | null;
  deadline: string | null;
  attachments: { url: string; type: string; name: string; size: number }[];
  status: string;
  adminNotes: string | null;
  forwardedAt: string | null;
  designerResponse: string | null;
  responseAt: string | null;
  createdAt: string;
  isPaid?: boolean;
  payoutStatus?: string | null;
  payoutInitiatedAt?: string | null;
  payoutError?: string | null;
  // Reference design
  referenceDesignId?: string | null;
  referenceDesignUrl?: string | null;
  referenceDesignTitle?: string | null;
  // Physical commission fields
  isPhysical?: boolean;
  deliveryAddress?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } | null;
  deliveryNotes?: string | null;
  deliveryStatus?: string | null;
  requester: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
    image: string | null;
  };
  designer: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
    image: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  FORWARDED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  FORWARDED: 'Forwarded to Designer',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  MANUAL_REQUIRED: 'bg-orange-100 text-orange-800',
};

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Payout Pending',
  PROCESSING: 'Processing Payout',
  COMPLETED: 'Payout Sent',
  FAILED: 'Payout Failed',
  MANUAL_REQUIRED: '⚠️ Manual Payout Required',
};

function AdminCommissionRequestsContent() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const designerIdFilter = searchParams.get('designerId');

  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CommissionRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Check admin access
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [sessionStatus, session, router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/commission-requests?page=${pagination.page}&limit=${pagination.limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (payoutStatusFilter) url += `&payoutStatus=${payoutStatusFilter}`;
      if (designerIdFilter) url += `&designerId=${designerIdFilter}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, payoutStatusFilter, designerIdFilter]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchRequests();
    }
  }, [session, fetchRequests]);

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.title.toLowerCase().includes(query) ||
      req.requesterName.toLowerCase().includes(query) ||
      req.designerName.toLowerCase().includes(query) ||
      req.requesterEmail.toLowerCase().includes(query)
    );
  });

  const openDetail = (request: CommissionRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setShowDetailModal(true);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/commission-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNotes }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? data.request : req))
        );
        if (selectedRequest?.id === id) {
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && session?.user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Commission Requests</h1>
          <p className="text-xs sm:text-base text-gray-900 mt-1 sm:mt-2">
            Review and manage commission requests from users
          </p>
          {designerIdFilter && (
            <div className="mt-2 sm:mt-3 flex items-center gap-2">
              <span className="px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs sm:text-sm">
                Filtering by designer
              </span>
              <Link 
                href="/admin/commission-requests"
                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800"
              >
                Clear filter
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, requester, or designer..."
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Status Filter */}
              <div className="relative flex-1 sm:flex-initial">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="FORWARDED">Forwarded</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Payout Status Filter */}
              <div className="relative flex-1 sm:flex-initial">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <select
                  value={payoutStatusFilter}
                  onChange={(e) => setPayoutStatusFilter(e.target.value)}
                  aria-label="Filter by payout status"
                  className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="">All Payout Statuses</option>
                  <option value="PENDING">Payout Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Payout Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="MANUAL_REQUIRED">⚠️ Manual Required</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'PENDING').length}
                </p>
                <p className="text-xs sm:text-sm text-gray-900">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'FORWARDED').length}
                </p>
                <p className="text-xs sm:text-sm text-gray-900">Forwarded</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'COMPLETED').length}
                </p>
                <p className="text-xs sm:text-sm text-gray-900">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{pagination.total}</p>
                <p className="text-xs sm:text-sm text-gray-900">Total Requests</p>
              </div>
            </div>
          </div>
          {/* Manual Payout Required Alert */}
          {requests.filter((r) => r.payoutStatus === 'MANUAL_REQUIRED').length > 0 && (
            <div className="bg-orange-50 rounded-xl shadow-sm p-3 sm:p-4 border-2 border-orange-300 col-span-2 md:col-span-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm sm:text-lg font-bold text-orange-800">
                    {requests.filter((r) => r.payoutStatus === 'MANUAL_REQUIRED').length} Manual Payout(s) Required
                  </p>
                  <p className="text-xs sm:text-sm text-orange-700">
                    These commissions need manual payment processing.
                  </p>
                </div>
                <button
                  onClick={() => setPayoutStatusFilter('MANUAL_REQUIRED')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs sm:text-sm w-full sm:w-auto"
                >
                  View All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No commission requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider hidden md:table-cell">
                      Designer
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div>
                          <p className="font-medium text-xs sm:text-sm text-gray-900 line-clamp-1">{request.title}</p>
                          <p className="text-[10px] sm:text-sm text-gray-600 line-clamp-1">
                            {request.category || 'No category'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {request.requester.image ? (
                              <Image
                                src={request.requester.image}
                                alt=""
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {request.requesterName}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[80px] sm:max-w-none">{request.requesterEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {request.designer.image ? (
                              <Image
                                src={request.designer.image}
                                alt=""
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900">
                              {request.designerName}
                            </p>
                            <Link
                              href={request.designerPageUrl}
                              target="_blank"
                              className="text-[10px] sm:text-xs text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              View Profile <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {STATUS_LABELS[request.status] || request.status}
                          </span>
                          {request.isPaid && request.payoutStatus && (
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${PAYOUT_STATUS_COLORS[request.payoutStatus] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {PAYOUT_STATUS_LABELS[request.payoutStatus] || request.payoutStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-sm text-gray-900 hidden lg:table-cell">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-right">
                        <button
                          onClick={() => openDetail(request)}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-bold text-gray-900">Commission Request Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close modal"
                >
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                {/* Status Banner */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${STATUS_COLORS[selectedRequest.status] || 'bg-gray-100 text-gray-800'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                    <span className="font-medium text-xs sm:text-sm text-gray-900">
                      Status: {STATUS_LABELS[selectedRequest.status]}
                    </span>
                    {selectedRequest.forwardedAt && (
                      <span className="text-[10px] sm:text-sm text-gray-900">
                        Forwarded: {formatDate(selectedRequest.forwardedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payout Status Banner (if paid) */}
                {selectedRequest.isPaid && selectedRequest.payoutStatus && (
                  <div
                    className={`p-3 sm:p-4 rounded-lg ${PAYOUT_STATUS_COLORS[selectedRequest.payoutStatus] || 'bg-gray-100 text-gray-800'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                      <span className="font-medium text-xs sm:text-sm text-gray-900">
                        {PAYOUT_STATUS_LABELS[selectedRequest.payoutStatus] || selectedRequest.payoutStatus}
                      </span>
                      {selectedRequest.payoutInitiatedAt && (
                        <span className="text-[10px] sm:text-sm text-gray-900">
                          Initiated: {formatDate(selectedRequest.payoutInitiatedAt)}
                        </span>
                      )}
                    </div>
                    {selectedRequest.payoutError && (
                      <p className="mt-2 text-[10px] sm:text-sm text-red-700 bg-red-50 p-2 rounded">
                        Error: {selectedRequest.payoutError}
                      </p>
                    )}
                    {selectedRequest.payoutStatus === 'MANUAL_REQUIRED' && (
                      <p className="mt-2 text-[10px] sm:text-sm font-medium">
                        ⚠️ This commission requires manual payout processing. Contact the designer to arrange payment.
                      </p>
                    )}
                  </div>
                )}

                {/* Request Info */}
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2">
                    {selectedRequest.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-900 mb-3 sm:mb-4">
                    {selectedRequest.category && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {selectedRequest.category}
                      </span>
                    )}
                    {selectedRequest.budget && (
                      <span className="flex items-center gap-1">
                        💰 Budget: {selectedRequest.budget}
                      </span>
                    )}
                    {selectedRequest.deadline && (
                      <span className="flex items-center gap-1">
                        📅 Deadline: {selectedRequest.deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Reference Design Link */}
                {selectedRequest.referenceDesignId && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-indigo-800 mb-2 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Reference Design
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="font-medium text-xs sm:text-sm text-gray-900">
                        {selectedRequest.referenceDesignTitle || 'Untitled Design'}
                      </p>
                      <Link
                        href={selectedRequest.referenceDesignUrl || `/designs/${selectedRequest.referenceDesignId}`}
                        target="_blank"
                        className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-indigo-200 w-fit"
                      >
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        View Design
                      </Link>
                    </div>
                  </div>
                )}

                {/* Physical Commission & Delivery Address */}
                {selectedRequest.isPhysical && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-amber-800 mb-2 sm:mb-3 flex items-center gap-2">
                      <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                      Physical Commission - Delivery Required
                    </p>
                    
                    {selectedRequest.deliveryStatus && (
                      <p className="text-xs sm:text-sm mb-2 sm:mb-3">
                        <span className="font-medium">Delivery Status:</span>{' '}
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {selectedRequest.deliveryStatus}
                        </span>
                      </p>
                    )}
                    
                    {selectedRequest.deliveryAddress ? (
                      <div className="bg-white rounded-lg p-2 sm:p-3 border border-amber-200">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                          Shipping Address
                        </p>
                        <div className="text-xs sm:text-sm text-gray-900 space-y-1">
                          {selectedRequest.deliveryAddress.name && (
                            <p className="font-medium text-gray-900">{selectedRequest.deliveryAddress.name}</p>
                          )}
                          {selectedRequest.deliveryAddress.phone && (
                            <p>📞 {selectedRequest.deliveryAddress.phone}</p>
                          )}
                          {selectedRequest.deliveryAddress.address && (
                            <p>{selectedRequest.deliveryAddress.address}</p>
                          )}
                          <p>
                            {[
                              selectedRequest.deliveryAddress.city,
                              selectedRequest.deliveryAddress.state,
                              selectedRequest.deliveryAddress.postalCode
                            ].filter(Boolean).join(', ')}
                          </p>
                          {selectedRequest.deliveryAddress.country && (
                            <p className="font-medium">{selectedRequest.deliveryAddress.country}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-amber-700 italic">
                        ⚠️ No delivery address provided by customer
                      </p>
                    )}
                    
                    {selectedRequest.deliveryNotes && (
                      <div className="mt-2 sm:mt-3 text-xs sm:text-sm">
                        <p className="font-medium text-gray-700">Delivery Notes:</p>
                        <p className="text-gray-900 mt-1">{selectedRequest.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Requester & Designer */}
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Requester</p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {selectedRequest.requester.image ? (
                          <Image
                            src={selectedRequest.requester.image}
                            alt=""
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                          {selectedRequest.requesterName}
                        </p>
                        <a
                          href={`mailto:${selectedRequest.requesterEmail}`}
                          className="text-[10px] sm:text-sm text-indigo-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">{selectedRequest.requesterEmail}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Designer</p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {selectedRequest.designer.image ? (
                          <Image
                            src={selectedRequest.designer.image}
                            alt=""
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                          {selectedRequest.designerName}
                        </p>
                        <div className="flex gap-2">
                          {selectedRequest.designerEmail && (
                            <a
                              href={`mailto:${selectedRequest.designerEmail}`}
                              className="text-[10px] sm:text-sm text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Email
                            </a>
                          )}
                          <Link
                            href={selectedRequest.designerPageUrl}
                            target="_blank"
                            className="text-[10px] sm:text-sm text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {selectedRequest.attachments.length > 0 && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Attachments</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {selectedRequest.attachments.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <div className="text-gray-500">{getFileIcon(file.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                          </div>
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this request..."
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Designer Response */}
                {selectedRequest.designerResponse && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-green-800 mb-1">
                      Designer Response
                      {selectedRequest.responseAt && (
                        <span className="font-normal text-green-600 ml-2">
                          ({formatDate(selectedRequest.responseAt)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-green-700">{selectedRequest.designerResponse}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
                  {selectedRequest.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateStatus(selectedRequest.id, 'FORWARDED')}
                        disabled={updating}
                        className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        {updating ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <span className="hidden sm:inline">Forward to Designer</span>
                        <span className="sm:hidden">Forward</span>
                      </button>
                      <button
                        onClick={() => updateStatus(selectedRequest.id, 'REJECTED')}
                        disabled={updating}
                        className="px-3 sm:px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedRequest.status === 'FORWARDED' && (
                    <>
                      <button
                        onClick={() => updateStatus(selectedRequest.id, 'IN_PROGRESS')}
                        disabled={updating}
                        className="flex-1 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Mark In Progress</span>
                        <span className="sm:hidden">In Progress</span>
                      </button>
                      <button
                        onClick={() => updateStatus(selectedRequest.id, 'COMPLETED')}
                        disabled={updating}
                        className="flex-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Mark Completed</span>
                        <span className="sm:hidden">Complete</span>
                      </button>
                    </>
                  )}
                  {selectedRequest.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => updateStatus(selectedRequest.id, 'COMPLETED')}
                      disabled={updating}
                      className="flex-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Mark Completed</span>
                      <span className="sm:hidden">Complete</span>
                    </button>
                  )}
                  
                  {/* Message Designer Button - Always visible for admin */}
                  <Link
                    href={`/designers/${selectedRequest.designerId}`}
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Contact Designer</span>
                    <span className="sm:hidden">Contact</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCommissionRequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading commission requests...</p>
        </div>
      </div>
    }>
      <AdminCommissionRequestsContent />
    </Suspense>
  );
}
