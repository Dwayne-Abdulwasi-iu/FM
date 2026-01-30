"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  sellerProfile?: {
    businessName?: string;
  };
}

interface Dispute {
  id: string;
  title: string;
  description: string;
  status: string;
  designerQuote: number | null;
  isDisputed: boolean;
  disputeReason: string | null;
  disputedAt: string | null;
  disputeResolvedAt: string | null;
  disputeResolution: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  requester: User;
  designer: User;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDisputesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Resolution form state
  const [resolution, setResolution] = useState<string>("");
  const [refundPercentage, setRefundPercentage] = useState<number>(50);
  const [notes, setNotes] = useState<string>("");

  const fetchDisputes = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/disputes?status=${filterStatus}&page=${page}&limit=20`
      );
      const data = await response.json();

      if (response.ok) {
        setDisputes(data.disputes);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    fetchDisputes();
  }, [session, authStatus, router, fetchDisputes]);

  const handleResolve = async () => {
    if (!selectedDispute || !resolution) return;

    setResolving(true);
    try {
      const response = await fetch(`/api/admin/disputes/${selectedDispute.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          refundPercentage: ["refund_partial", "split"].includes(resolution)
            ? refundPercentage
            : undefined,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Dispute resolved successfully!");
        setShowResolveModal(false);
        setSelectedDispute(null);
        setResolution("");
        setNotes("");
        fetchDisputes();
      } else {
        alert(data.error || "Failed to resolve dispute");
      }
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return `$${amount.toFixed(2)}`;
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 px-2 sm:px-0">
      <Link
        href="/admin"
        className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 sm:gap-2"
      >
        ← <span className="hidden sm:inline">Back to Admin</span><span className="sm:hidden">Back</span>
      </Link>

      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Dispute Management</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
          Review and resolve commission disputes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 -mx-2 sm:mx-0">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 px-2 sm:px-0 overflow-x-auto">
          {[
            { value: "active", label: "Active Disputes", short: "Active" },
            { value: "resolved", label: "Resolved", short: "Resolved" },
            { value: "all", label: "All", short: "All" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                filterStatus === tab.value
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center">
          <div className="text-gray-400 text-4xl sm:text-6xl mb-2 sm:mb-4">⚖️</div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            No {filterStatus === "active" ? "active " : ""}disputes
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {filterStatus === "active"
              ? "All resolved!"
              : "No matches."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Parties
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amt
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Disputed
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {dispute.title.substring(0, 20)}
                    </div>
                    <div className="text-xs text-gray-500 truncate hidden sm:block">
                      {dispute.description.substring(0, 30)}...
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 hidden sm:table-cell">
                    <div className="text-xs sm:text-sm">
                      <span className="text-gray-500 text-xs">C:</span> <span className="font-medium text-xs truncate">{dispute.requester.name.substring(0, 15)}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500 text-xs">D:</span> <span className="font-medium text-xs truncate">{(dispute.designer.sellerProfile?.businessName || dispute.designer.name).substring(0, 15)}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatCurrency(dispute.designerQuote)}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {dispute.paymentMethod || "N/A"}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 hidden md:table-cell">
                    <div className="text-xs text-gray-900">
                      {formatDate(dispute.disputedAt).substring(0, 10)}
                    </div>
                    <div className="text-xs text-red-600 truncate max-w-xs">
                      {dispute.disputeReason?.substring(0, 20)}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4">
                    {dispute.disputeResolvedAt ? (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <span className="hidden sm:inline">Resolved</span><span className="sm:hidden">✓</span>
                      </span>
                    ) : (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        <span className="hidden sm:inline">Pending</span><span className="sm:hidden">!</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-right">
                    {!dispute.disputeResolvedAt && (
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowResolveModal(true);
                        }}
                        className="bg-indigo-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm font-medium hover:bg-indigo-700"
                      >
                        <span className="hidden sm:inline">Resolve</span><span className="sm:hidden">Fix</span>
                      </button>
                    )}
                    {dispute.disputeResolvedAt && (
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm font-medium"
                      >
                        <span className="hidden sm:inline">View</span><span className="sm:hidden">✓</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-2 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 border-t border-gray-200">
              <div className="text-xs sm:text-sm text-gray-700">
                <span className="hidden sm:inline">Page {pagination.page} of {pagination.totalPages}</span>
                <span className="sm:hidden">Pg {pagination.page}/{pagination.totalPages}</span> ({pagination.total})
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => fetchDisputes(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50"
                >
                  <span className="hidden sm:inline">Previous</span><span className="sm:hidden">←</span>
                </button>
                <button
                  onClick={() => fetchDisputes(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50"
                >
                  <span className="hidden sm:inline">Next</span><span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Details Modal */}
      {selectedDispute && !showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-6">
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold">Dispute Details</h2>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Commission</h3>
                  <p className="text-sm sm:text-base font-medium">{selectedDispute.title}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedDispute.description.substring(0, 100)}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Client</h3>
                    <p className="text-sm font-medium">{selectedDispute.requester.name}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {selectedDispute.requester.email}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Designer</h3>
                    <p className="text-sm font-medium">
                      {(selectedDispute.designer.sellerProfile?.businessName ||
                        selectedDispute.designer.name).substring(0, 30)}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {selectedDispute.designer.email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Dispute Reason</h3>
                  <p className="bg-red-50 text-red-800 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
                    {selectedDispute.disputeReason}
                  </p>
                </div>

                {selectedDispute.disputeResolution && (
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Resolution</h3>
                    <p className="bg-green-50 text-green-800 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
                      {selectedDispute.disputeResolution}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Amount</h3>
                    <p className="text-sm font-medium">
                      {formatCurrency(selectedDispute.designerQuote)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Payment</h3>
                    <p className="text-sm font-medium">
                      {selectedDispute.paymentMethod || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedDispute.paymentReference}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Disputed At</h3>
                    <p className="text-xs sm:text-sm">{formatDate(selectedDispute.disputedAt).substring(0, 16)}</p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase">Resolved At</h3>
                    <p className="text-xs sm:text-sm">{formatDate(selectedDispute.disputeResolvedAt).substring(0, 16)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-md hover:bg-gray-50 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-6">
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold">Resolve</h2>
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium">{selectedDispute.title.substring(0, 40)}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  {formatCurrency(selectedDispute.designerQuote)}
                </p>
                <p className="text-xs sm:text-sm text-red-600 mt-1 sm:mt-2">
                  <strong>Reason:</strong> {selectedDispute.disputeReason?.substring(0, 60)}
                </p>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <div>
                  <label htmlFor="dispute-resolution" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Resolution
                  </label>
                  <select
                    id="dispute-resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-xs sm:text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="refund_full">Full Refund</option>
                    <option value="pay_designer">Pay Designer</option>
                    <option value="refund_partial">Partial Refund</option>
                    <option value="split">Split 50/50</option>
                    <option value="dismiss">Dismiss</option>
                  </select>
                </div>

                {["refund_partial", "split"].includes(resolution) && (
                  <div>
                    <label htmlFor="refund-percentage" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Refund: {refundPercentage}%
                    </label>
                    <input
                      id="refund-percentage"
                      type="range"
                      min="0"
                      max="100"
                      value={refundPercentage}
                      onChange={(e) => setRefundPercentage(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        C: ${selectedDispute.designerQuote
                          ? ((selectedDispute.designerQuote * refundPercentage) / 100).toFixed(2)
                          : 0}
                      </span>
                      <span>
                        D: ${selectedDispute.designerQuote
                          ? ((selectedDispute.designerQuote * 0.9 * (100 - refundPercentage)) / 100).toFixed(2)
                          : 0}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-md p-2 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                    setResolution("");
                    setNotes("");
                  }}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 border rounded-md hover:bg-gray-50 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Cancel</span><span className="sm:hidden">×</span>
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolution || resolving}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">{resolving ? "Processing..." : "Confirm"}</span><span className="sm:hidden">{resolving ? "..." : "OK"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
