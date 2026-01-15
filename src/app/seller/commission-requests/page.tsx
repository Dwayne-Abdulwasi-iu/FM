'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CommissionMessages } from '@/components/commission/CommissionComms';
import { useUnreadMessages, UnreadBadge } from '@/hooks/useUnreadMessages';
import {
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  Send,
  Eye,
  Loader2,
  User,
  AlertCircle,
  ChevronDown,
  Image as ImageIcon,
  Video,
  File,
  MessageSquare,
  ArrowLeft,
  Upload,
  Package,
  RefreshCw,
} from 'lucide-react';

interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
  uploadedAt?: string;
}

interface CommissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  title: string;
  description: string;
  category: string | null;
  budget: string | null;
  deadline: string | null;
  attachments: Attachment[];
  status: string;
  designerQuote: number | null;
  designerDeadline: string | null;
  designerResponse: string | null;
  isPaid: boolean;
  createdAt: string;
  forwardedAt: string | null;
  deliverables: Attachment[];
  revisionNotes: string | null;
  revisionCount: number;
  maxRevisions: number;
  requester: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string;
    image: string | null;
  };
  // Reference design that inspired the commission
  referenceDesignId: string | null;
  referenceDesignUrl: string | null;
  referenceDesignTitle: string | null;
  // Related design object (if still exists in DB)
  referenceDesign: {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl: string | null;
    price: number;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  FORWARDED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-cyan-100 text-cyan-800',
  REVISION: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  FORWARDED: 'New Request',
  QUOTED: 'Quote Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  PAID: 'Paid - Ready to Start',
  IN_PROGRESS: 'In Progress',
  DELIVERED: 'Delivered - Awaiting Approval',
  REVISION: 'Revision Requested',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export default function DesignerCommissionRequestsPage() {
  const { data: _session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CommissionRequest | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<string | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState<'quote' | 'accept' | 'reject'>('quote');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Unread messages hook
  const { commissionsUnread } = useUnreadMessages();
  
  // Deliverables upload state
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverRequest, setDeliverRequest] = useState<CommissionRequest | null>(null);
  const [deliverableFiles, setDeliverableFiles] = useState<File[]>([]);
  const [uploadingDeliverables, setUploadingDeliverables] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [sessionStatus, router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/commission-requests/designer';
      if (statusFilter) url += `?status=${statusFilter}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchRequests();
    }
  }, [sessionStatus, fetchRequests]);

  const openResponseModal = (request: CommissionRequest, type: 'quote' | 'accept' | 'reject') => {
    setSelectedRequest(request);
    setResponseType(type);
    setQuoteAmount(request.designerQuote?.toString() || '');
    setProposedDeadline(request.designerDeadline || '');
    setResponseMessage(request.designerResponse || '');
    setRejectionReason('');
    setError('');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest) return;

    if (responseType === 'quote' && !quoteAmount) {
      setError('Please enter a quote amount');
      return;
    }

    if (responseType === 'reject' && !rejectionReason) {
      setError('Please provide a reason for declining');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        action: responseType,
      };

      if (responseType === 'quote') {
        body.quote = parseFloat(quoteAmount);
        body.deadline = proposedDeadline;
        body.message = responseMessage;
      } else if (responseType === 'accept') {
        body.message = responseMessage;
      } else if (responseType === 'reject') {
        body.reason = rejectionReason;
      }

      const response = await fetch(`/api/commission-requests/${selectedRequest.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setShowResponseModal(false);
        fetchRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit response');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const markInProgress = async (requestId: string) => {
    try {
      const response = await fetch(`/api/commission-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      if (response.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to start work:', err);
    }
  };

  const openDeliverModal = (request: CommissionRequest) => {
    setDeliverRequest(request);
    setDeliverableFiles([]);
    setError('');
    setShowDeliverModal(true);
  };

  const handleDeliverableFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDeliverableFiles((prev) => [...prev, ...files]);
  };

  const removeDeliverableFile = (index: number) => {
    setDeliverableFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitDeliverables = async () => {
    if (!deliverRequest) return;
    if (deliverableFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    setUploadingDeliverables(true);
    setError('');

    try {
      // Upload files to Cloudinary
      const uploadedFiles: Attachment[] = [];

      for (const file of deliverableFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'fashion_marketplace');

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (cloudinaryResponse.ok) {
          const data = await cloudinaryResponse.json();
          uploadedFiles.push({
            url: data.secure_url,
            type: file.type,
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        }
      }

      if (uploadedFiles.length === 0) {
        setError('Failed to upload files. Please try again.');
        setUploadingDeliverables(false);
        return;
      }

      // Determine action: deliver or resubmit based on status
      const action = deliverRequest.status === 'REVISION' ? 'resubmit' : 'deliver';

      const response = await fetch(`/api/commission-requests/${deliverRequest.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          deliverables: uploadedFiles,
        }),
      });

      if (response.ok) {
        setShowDeliverModal(false);
        setDeliverRequest(null);
        setDeliverableFiles([]);
        fetchRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit deliverables');
      }
    } catch (err) {
      console.error('Deliverables upload error:', err);
      setError('Failed to upload deliverables');
    } finally {
      setUploadingDeliverables(false);
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
    });
  };

  const newRequestsCount = requests.filter((r) => r.status === 'FORWARDED').length;
  const paidRequestsCount = requests.filter((r) => r.status === 'PAID').length;

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Commission Requests</h1>
          <p className="text-gray-600 mt-2">
            Manage custom design requests from clients
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{newRequestsCount}</p>
                <p className="text-sm text-gray-500">New Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{paidRequestsCount}</p>
                <p className="text-sm text-gray-500">Ready to Start</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by request status"
                className="pl-4 pr-8 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                <option value="">All Requests</option>
                <option value="FORWARDED">New Requests</option>
                <option value="QUOTED">Quote Sent</option>
                <option value="PAID">Paid - Ready</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Declined</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No commission requests yet</p>
              <p className="text-sm text-gray-400 mt-1">
                When clients request custom work, they&apos;ll appear here
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left - Request Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                        {request.status === 'FORWARDED' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Action Required
                          </span>
                        )}
                        {request.status === 'PAID' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            💰 Ready to Start
                          </span>
                        )}
                        <UnreadBadge count={commissionsUnread.get(request.id) || 0} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-gray-600 mt-1 line-clamp-2">{request.description}</p>

                      {/* Reference Design */}
                      {(request.referenceDesign || request.referenceDesignUrl) && (
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <p className="text-xs text-indigo-600 font-medium mb-2">📌 Based on your design:</p>
                          <div className="flex items-center gap-3">
                            {/* Show design thumbnail if available */}
                            {request.referenceDesign && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-indigo-200">
                                <Image
                                  src={request.referenceDesign.thumbnailUrl || request.referenceDesign.imageUrl}
                                  alt={request.referenceDesign.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={request.referenceDesign ? `/designs/${request.referenceDesign.id}` : (request.referenceDesignUrl || '#')}
                                target="_blank"
                                className="text-sm font-medium text-indigo-700 hover:underline inline-flex items-center gap-1"
                              >
                                {request.referenceDesign?.title || request.referenceDesignTitle || 'View Reference Design'}
                                <Eye className="w-3 h-3" />
                              </Link>
                              {request.referenceDesign && (
                                <p className="text-xs text-indigo-600 mt-0.5">
                                  Original price: ${request.referenceDesign.price.toFixed(2)}
                                </p>
                              )}
                              {!request.referenceDesign && request.referenceDesignTitle && (
                                <p className="text-xs text-gray-500 mt-0.5 italic">
                                  (Original design no longer available)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        {request.category && (
                          <span className="text-gray-500">{request.category}</span>
                        )}
                        {request.budget && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <DollarSign className="w-4 h-4" />
                            Budget: {request.budget}
                          </span>
                        )}
                        {request.deadline && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            Deadline: {request.deadline}
                          </span>
                        )}
                      </div>

                      {/* Quote info if sent */}
                      {request.designerQuote && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm font-medium text-purple-800">
                            Your Quote: ${request.designerQuote.toFixed(2)}
                            {request.designerDeadline && ` • Deadline: ${request.designerDeadline}`}
                          </p>
                        </div>
                      )}

                      {/* Attachments */}
                      {request.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.attachments.slice(0, 3).map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200"
                            >
                              {getFileIcon(file.type)}
                              {file.name.slice(0, 15)}...
                            </a>
                          ))}
                          {request.attachments.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{request.attachments.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right - Client & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      {/* Client info */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {request.requesterName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          {request.requester.image ? (
                            <Image
                              src={request.requester.image}
                              alt=""
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex flex-col gap-2 items-end">
                        {request.status === 'FORWARDED' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openResponseModal(request, 'quote')}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                            >
                              Send Quote
                            </button>
                            <button
                              onClick={() => openResponseModal(request, 'accept')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => openResponseModal(request, 'reject')}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {request.status === 'PAID' && (
                          <button
                            onClick={() => markInProgress(request.id)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                          >
                            Start Work
                          </button>
                        )}
                        {request.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => openDeliverModal(request)}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Deliverables
                          </button>
                        )}
                        {request.status === 'REVISION' && (
                          <div className="text-right">
                            <div className="p-3 bg-orange-50 rounded-lg mb-2 text-left max-w-xs">
                              <p className="text-xs font-medium text-orange-800 mb-1">Revision Requested:</p>
                              <p className="text-sm text-orange-700">{request.revisionNotes}</p>
                              <p className="text-xs text-orange-500 mt-1">
                                Revision {request.revisionCount} of {request.maxRevisions}
                              </p>
                            </div>
                            <button
                              onClick={() => openDeliverModal(request)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Resubmit Deliverables
                            </button>
                          </div>
                        )}
                        {request.status === 'DELIVERED' && (
                          <span className="text-sm text-cyan-600 italic flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            Awaiting client approval
                          </span>
                        )}
                        {request.status === 'QUOTED' && (
                          <span className="text-sm text-gray-500 italic">
                            Waiting for client payment
                          </span>
                        )}
                        {request.status === 'COMPLETED' && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </span>
                        )}
                        {request.status === 'DISPUTED' && (
                          <span className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Under Review
                          </span>
                        )}

                        {/* Message Client Button */}
                        {['FORWARDED', 'QUOTED', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION', 'DISPUTED'].includes(request.status) && (
                          <button
                            onClick={() => setExpandedMessages(expandedMessages === request.id ? null : request.id)}
                            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {expandedMessages === request.id ? 'Hide' : 'Message'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Messages Panel */}
                  {expandedMessages === request.id && (
                    <div className="border-t bg-gray-50 p-4">
                      <CommissionMessages 
                        commissionId={request.id} 
                        commissionStatus={request.status}
                        isDesigner={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Response Modal */}
        {showResponseModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {responseType === 'quote' && 'Send Quote'}
                {responseType === 'accept' && 'Accept Request'}
                {responseType === 'reject' && 'Decline Request'}
              </h2>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {responseType === 'quote' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Client budget: {selectedRequest.budget || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proposed Deadline
                      </label>
                      <input
                        type="text"
                        value={proposedDeadline}
                        onChange={(e) => setProposedDeadline(e.target.value)}
                        placeholder="e.g., 2 weeks, By Feb 15"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}

                {(responseType === 'quote' || responseType === 'accept') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message to Client
                    </label>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Any additional details or questions..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}

                {responseType === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Declining <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please explain why you can't take this project..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${
                    responseType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } disabled:opacity-50`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : responseType === 'quote' ? (
                    'Send Quote'
                  ) : responseType === 'accept' ? (
                    'Accept'
                  ) : (
                    'Decline'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deliverables Upload Modal */}
        {showDeliverModal && deliverRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {deliverRequest.status === 'REVISION' ? 'Resubmit Deliverables' : 'Upload Deliverables'}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Upload the final files for &quot;{deliverRequest.title}&quot;
              </p>

              {deliverRequest.status === 'REVISION' && deliverRequest.revisionNotes && (
                <div className="p-3 bg-orange-50 rounded-lg mb-4">
                  <p className="text-xs font-medium text-orange-800 mb-1">Client Feedback:</p>
                  <p className="text-sm text-orange-700">{deliverRequest.revisionNotes}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* File upload area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Drag files here or click to browse</p>
                <input
                  type="file"
                  multiple
                  onChange={handleDeliverableFilesChange}
                  className="hidden"
                  id="deliverables-upload"
                  accept="image/*,video/*,.pdf,.zip,.psd,.ai,.sketch,.fig"
                />
                <label
                  htmlFor="deliverables-upload"
                  className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm font-medium"
                >
                  Choose Files
                </label>
              </div>

              {/* Selected files list */}
              {deliverableFiles.length > 0 && (
                <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                  {deliverableFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        {getFileIcon(file.type)}
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeDeliverableFile(idx)}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeliverModal(false);
                    setDeliverRequest(null);
                    setDeliverableFiles([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={uploadingDeliverables}
                >
                  Cancel
                </button>
                <button
                  onClick={submitDeliverables}
                  disabled={uploadingDeliverables || deliverableFiles.length === 0}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingDeliverables ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {deliverRequest.status === 'REVISION' ? 'Resubmit' : 'Deliver'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
