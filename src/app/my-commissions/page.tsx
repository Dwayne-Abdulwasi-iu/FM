'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CommissionMessages, ProgressTimeline } from '@/components/commission/CommissionComms';
import { useUnreadMessages, UnreadBadge } from '@/hooks/useUnreadMessages';

interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
  uploadedAt?: string;
}

interface DeliveryAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

interface CommissionRequest {
  id: string;
  title: string;
  description: string;
  designerId: string;
  designerName: string;
  status: string;
  budget: string | null;
  attachments: Attachment[];
  createdAt: string;
  designerQuote: number | null;
  designerDeadline: string | null;
  designerResponse: string | null;
  isPaid: boolean;
  paidAt: string | null;
  completedAt: string | null;
  deliverables: Attachment[];
  deliveredAt: string | null;
  revisionCount: number;
  maxRevisions: number;
  revisionNotes: string | null;
  clientRating: number | null;
  clientReview: string | null;
  isDisputed: boolean;
  disputeReason: string | null;
  // Physical delivery fields
  isPhysical: boolean;
  deliveryStatus: string | null;
  deliveryAddress: DeliveryAddress | null;
  trackingNumber: string | null;
  courierName: string | null;
  estimatedDeliveryDate: string | null;
  readyForCollectionAt: string | null;
  collectedAt: string | null;
  progressUpdates?: Array<{ message: string; photos: string[]; timestamp: string }>;
  shippedAt: string | null;
  actualDeliveredAt: string | null;
  deliveryConfirmedAt: string | null;
  designer?: {
    id: string;
    name: string;
    displayName: string;
    image: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  FORWARDED: { label: 'Sent to Designer', color: 'bg-blue-100 text-blue-800' },
  QUOTED: { label: 'Quote Received', color: 'bg-purple-100 text-purple-800' },
  PAID: { label: 'Paid - Awaiting Start', color: 'bg-green-100 text-green-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Ready for Review', color: 'bg-cyan-100 text-cyan-800' },
  REVISION: { label: 'Revision Requested', color: 'bg-orange-100 text-orange-800' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  DISPUTED: { label: 'Disputed', color: 'bg-red-100 text-red-800' },
};

export default function MyCommissionRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CommissionRequest | null>(null);
  
  // Unread messages hook
  const { commissionsUnread } = useUnreadMessages();
  
  // Modal states
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Form states
  const [revisionNotes, setRevisionNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/commission-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (requestId: string, action: string, data: Record<string, unknown> = {}) => {
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/commission-requests/${requestId}/client-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      
      if (response.ok) {
        // Close all modals
        setShowRevisionModal(false);
        setShowDisputeModal(false);
        setShowReviewModal(false);
        setShowCancelModal(false);
        setSelectedRequest(null);
        // Reset form states
        setRevisionNotes('');
        setDisputeReason('');
        setCancelReason('');
        setRating(5);
        setReview('');
        // Refresh data
        fetchRequests();
      } else {
        const result = await response.json();
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action error:', err);
      setError('Failed to perform action');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const getStatusBadge = (reqStatus: string) => {
    const config = STATUS_LABELS[reqStatus] || { label: reqStatus, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Group requests by status
  const groupedRequests = {
    needsAction: requests.filter(r => r.status === 'DELIVERED' && !r.isPhysical),
    physicalDelivery: requests.filter(r => 
      r.isPhysical && 
      r.deliveryStatus && 
      ['READY_FOR_COLLECTION', 'COLLECTED_BY_ADMIN', 'IN_TRANSIT', 'DELIVERED'].includes(r.deliveryStatus) &&
      !r.deliveryConfirmedAt
    ),
    active: requests.filter(r => ['PENDING', 'FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 'REVISION'].includes(r.status)),
    completed: requests.filter(r => r.status === 'COMPLETED'),
    cancelled: requests.filter(r => ['REJECTED', 'CANCELLED', 'DISPUTED'].includes(r.status)),
  };

  const DELIVERY_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    READY_FOR_COLLECTION: { label: 'Preparing for Shipment', color: 'bg-yellow-100 text-yellow-800', icon: '📦' },
    COLLECTED_BY_ADMIN: { label: 'Collected by Platform', color: 'bg-blue-100 text-blue-800', icon: '✓' },
    IN_TRANSIT: { label: 'In Transit', color: 'bg-purple-100 text-purple-800', icon: '🚚' },
    DELIVERED: { label: 'Delivered - Confirm Receipt', color: 'bg-green-100 text-green-800', icon: '📍' },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Commission Requests</h1>
            <p className="text-gray-600 mt-1">Track and manage your custom commission requests</p>
          </div>
          <Link
            href="/commission-request"
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
          >
            + New Request
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No commission requests yet</h2>
            <p className="text-gray-600 mb-6">Start by requesting a custom design from one of our talented designers</p>
            <Link
              href="/designers"
              className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
            >
              Browse Designers
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Needs Action - Delivered requests */}
            {groupedRequests.needsAction.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></span>
                  Ready for Review ({groupedRequests.needsAction.length})
                </h2>
                <div className="grid gap-4">
                  {groupedRequests.needsAction.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow-md border-2 border-cyan-200 p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{request.title}</h3>
                            {getStatusBadge(request.status)}
                            <UnreadBadge count={commissionsUnread.get(request.id) || 0} />
                          </div>
                          <p className="text-sm text-gray-600">Designer: {request.designerName}</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ${request.designerQuote?.toLocaleString()}
                        </p>
                      </div>
                      
                      {/* Deliverables preview */}
                      {request.deliverables && request.deliverables.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            {request.deliverables.length} Deliverable(s) Ready:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.deliverables.map((file, idx) => (
                              <a
                                key={idx}
                                href={typeof file === 'string' ? file : file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100"
                              >
                                📎 {typeof file === 'string' ? `File ${idx + 1}` : file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => performAction(request.id, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          ✓ Approve & Complete
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setRevisionNotes('');
                            setError('');
                            setShowRevisionModal(true);
                          }}
                          disabled={request.revisionCount >= request.maxRevisions}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Request Revision ({request.revisionCount}/{request.maxRevisions})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setDisputeReason('');
                            setError('');
                            setShowDisputeModal(true);
                          }}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                        >
                          File Dispute
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Physical Deliveries in Progress */}
            {groupedRequests.physicalDelivery.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  Physical Deliveries ({groupedRequests.physicalDelivery.length})
                </h2>
                <div className="grid gap-4">
                  {groupedRequests.physicalDelivery.map((request) => {
                    const statusConfig = DELIVERY_STATUS_LABELS[request.deliveryStatus || ''] || { label: request.deliveryStatus, color: 'bg-gray-100 text-gray-800', icon: '📦' };
                    return (
                      <div
                        key={request.id}
                        className="bg-white rounded-lg shadow-md border-2 border-purple-200 p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{request.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                                {statusConfig.icon} {statusConfig.label}
                              </span>
                              <UnreadBadge count={commissionsUnread.get(request.id) || 0} />
                            </div>
                            <p className="text-sm text-gray-600">Designer: {request.designerName}</p>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            ${request.designerQuote?.toLocaleString()}
                          </p>
                        </div>

                        {/* Delivery Timeline */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">Delivery Progress</p>
                          <div className="flex items-center gap-2">
                            {/* Step 1: Ready */}
                            <div className={`flex-1 flex flex-col items-center ${request.readyForCollectionAt ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${request.readyForCollectionAt ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {request.readyForCollectionAt ? '✓' : '1'}
                              </div>
                              <span className="text-xs mt-1">Ready</span>
                            </div>
                            <div className={`flex-1 h-1 ${request.collectedAt ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            {/* Step 2: Collected */}
                            <div className={`flex-1 flex flex-col items-center ${request.collectedAt ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${request.collectedAt ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {request.collectedAt ? '✓' : '2'}
                              </div>
                              <span className="text-xs mt-1">Collected</span>
                            </div>
                            <div className={`flex-1 h-1 ${request.shippedAt ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            {/* Step 3: Shipped */}
                            <div className={`flex-1 flex flex-col items-center ${request.shippedAt ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${request.shippedAt ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {request.shippedAt ? '✓' : '3'}
                              </div>
                              <span className="text-xs mt-1">Shipped</span>
                            </div>
                            <div className={`flex-1 h-1 ${request.actualDeliveredAt ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            {/* Step 4: Delivered */}
                            <div className={`flex-1 flex flex-col items-center ${request.actualDeliveredAt ? 'text-green-600' : 'text-gray-400'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${request.actualDeliveredAt ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {request.actualDeliveredAt ? '✓' : '4'}
                              </div>
                              <span className="text-xs mt-1">Delivered</span>
                            </div>
                          </div>
                        </div>

                        {/* Tracking Info */}
                        {request.trackingNumber && (
                          <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-purple-600 font-medium">🚚 Tracking</span>
                            </div>
                            <p className="font-mono text-sm">{request.trackingNumber}</p>
                            <p className="text-xs text-gray-600">via {request.courierName}</p>
                            {request.estimatedDeliveryDate && (
                              <p className="text-sm text-gray-600 mt-1">
                                Estimated delivery: {new Date(request.estimatedDeliveryDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Delivery Address */}
                        {request.deliveryAddress && (
                          <div className="text-sm text-gray-600 mb-4">
                            <span className="font-medium">📍 Delivering to:</span> {request.deliveryAddress.name}, {request.deliveryAddress.city}
                          </div>
                        )}

                        {/* Confirm Delivery Button */}
                        {request.deliveryStatus === 'DELIVERED' && !request.deliveryConfirmedAt && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => performAction(request.id, 'confirm_delivery')}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              ✓ Confirm I Received the Item
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setDisputeReason('');
                                setError('');
                                setShowDisputeModal(true);
                              }}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                            >
                              Report Issue
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Requests */}
            {groupedRequests.active.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Requests ({groupedRequests.active.length})</h2>
                <div className="grid gap-4">
                  {groupedRequests.active.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow p-6 hover:shadow-md transition cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{request.title}</h3>
                            {getStatusBadge(request.status)}
                            <UnreadBadge count={commissionsUnread.get(request.id) || 0} />
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Designer: {request.designerName}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          {request.status === 'QUOTED' && request.designerQuote && (
                            <div className="mb-2">
                              <p className="text-lg font-bold text-green-600">
                                ${request.designerQuote.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">Designer Quote</p>
                            </div>
                          )}
                          {request.budget && request.status !== 'QUOTED' && (
                            <p className="text-sm text-gray-600">Budget: {request.budget}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons based on status */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-xs text-gray-400">
                          Submitted {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          {request.status === 'QUOTED' && !request.isPaid && (
                            <Link
                              href={`/commission-payment/${request.id}`}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Pay ${request.designerQuote?.toLocaleString()}
                            </Link>
                          )}
                          {['PENDING', 'FORWARDED', 'QUOTED'].includes(request.status) && !request.isPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                                setCancelReason('');
                                setError('');
                                setShowCancelModal(true);
                              }}
                              className="px-3 py-2 text-sm text-gray-500 hover:text-red-600"
                            >
                              Cancel
                            </button>
                          )}
                          {request.status === 'IN_PROGRESS' && request.designerDeadline && (
                            <p className="text-sm text-gray-600">
                              Expected: {request.designerDeadline}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Requests */}
            {groupedRequests.completed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Completed ({groupedRequests.completed.length})</h2>
                <div className="grid gap-4">
                  {groupedRequests.completed.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{request.title}</h3>
                            {getStatusBadge(request.status)}
                            {request.clientRating && (
                              <span className="text-yellow-500">
                                {'★'.repeat(request.clientRating)}{'☆'.repeat(5 - request.clientRating)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">Designer: {request.designerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${request.designerQuote?.toLocaleString()}</p>
                          {request.completedAt && (
                            <p className="text-xs text-gray-500">
                              Completed {new Date(request.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Deliverables */}
                      {request.deliverables && request.deliverables.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {request.deliverables.map((file, idx) => (
                              <a
                                key={idx}
                                href={typeof file === 'string' ? file : file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-pink-50 text-pink-600 rounded text-sm hover:bg-pink-100"
                              >
                                📎 Download {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Review button if not reviewed */}
                      {!request.clientRating && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setRating(5);
                              setReview('');
                              setError('');
                              setShowReviewModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                          >
                            ⭐ Leave a Review
                          </button>
                        </div>
                      )}
                      
                      {/* Show review if exists */}
                      {request.clientReview && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 italic">&quot;{request.clientReview}&quot;</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled/Rejected Requests */}
            {groupedRequests.cancelled.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancelled/Rejected ({groupedRequests.cancelled.length})</h2>
                <div className="grid gap-4">
                  {groupedRequests.cancelled.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow p-4 opacity-75"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-700">{request.title}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-500">Designer: {request.designerName}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h2>
                    <p className="text-gray-600">To: {selectedRequest.designerName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Close details"
                    aria-label="Close details"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Description</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>

                  {selectedRequest.budget && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Your Budget</h3>
                      <p className="text-gray-600">${selectedRequest.budget.toLocaleString()}</p>
                    </div>
                  )}

                  {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Your Attachments</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.attachments.map((attachment, idx) => (
                          <a
                            key={idx}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-700 text-sm underline"
                          >
                            {attachment.name || `Attachment ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Designer Response Section */}
                  {selectedRequest.status !== 'PENDING' && selectedRequest.status !== 'FORWARDED' && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Designer Response</h3>
                      
                      {selectedRequest.designerQuote && (
                        <div className="bg-green-50 rounded-lg p-4 mb-3">
                          <p className="text-sm text-gray-600">Quoted Price</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${selectedRequest.designerQuote.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {selectedRequest.designerDeadline && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">Estimated Delivery</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedRequest.designerDeadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {selectedRequest.designerResponse && (
                        <div>
                          <p className="text-sm text-gray-600">Message from Designer</p>
                          <p className="text-gray-900 mt-1">{selectedRequest.designerResponse}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deliverables */}
                  {selectedRequest.deliverables && selectedRequest.deliverables.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Deliverables</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.deliverables.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-pink-50 text-pink-600 rounded-lg text-sm hover:bg-pink-100"
                          >
                            {file.name || `Download ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  {selectedRequest.isPaid && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-green-800 font-medium">
                        ✓ Payment Confirmed
                        {selectedRequest.paidAt && (
                          <span className="font-normal text-sm ml-2">
                            on {new Date(selectedRequest.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Progress Updates */}
                  {selectedRequest.progressUpdates && selectedRequest.progressUpdates.length > 0 && (
                    <div className="border-t pt-4">
                      <ProgressTimeline progressUpdates={selectedRequest.progressUpdates} />
                    </div>
                  )}

                  {/* Messages Section - Show for active commissions */}
                  {['FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION', 'DISPUTED'].includes(selectedRequest.status) && (
                    <div className="border-t pt-4">
                      <CommissionMessages 
                        commissionId={selectedRequest.id} 
                        commissionStatus={selectedRequest.status}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                  {selectedRequest.status === 'QUOTED' && !selectedRequest.isPaid && (
                    <Link
                      href={`/commission-payment/${selectedRequest.id}`}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Pay ${selectedRequest.designerQuote?.toLocaleString()}
                    </Link>
                  )}
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revision Request Modal */}
        {showRevisionModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Request Revision</h2>
              <p className="text-sm text-gray-600 mb-4">
                Revision {selectedRequest.revisionCount + 1} of {selectedRequest.maxRevisions}
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What changes do you need? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Please describe the specific changes you'd like..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRevisionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => performAction(selectedRequest.id, 'revision', { notes: revisionNotes })}
                  disabled={submitting || revisionNotes.length < 10}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Request Revision'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {showDisputeModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">File a Dispute</h2>
              <p className="text-sm text-gray-600 mb-4">
                Disputes are reviewed by our admin team. Please provide details.
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for dispute <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Please explain the issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => performAction(selectedRequest.id, 'dispute', { reason: disputeReason })}
                  disabled={submitting || disputeReason.length < 20}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'File Dispute'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel Request</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel this commission request?
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why are you cancelling?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-gray-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Keep Request
                </button>
                <button
                  onClick={() => performAction(selectedRequest.id, 'cancel', { reason: cancelReason })}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Cancel Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Leave a Review</h2>
              <p className="text-sm text-gray-600 mb-4">
                How was your experience with {selectedRequest.designerName}?
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">{error}</div>
              )}
              
              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl transition ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your review (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => performAction(selectedRequest.id, 'review', { rating, review })}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
