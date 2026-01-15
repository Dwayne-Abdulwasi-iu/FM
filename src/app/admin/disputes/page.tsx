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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-gray-600 mt-1">
            Review and resolve commission disputes between clients and designers
          </p>
        </div>
        <Link
          href="/admin"
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { value: "active", label: "Active Disputes" },
            { value: "resolved", label: "Resolved" },
            { value: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filterStatus === tab.value
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">⚖️</div>
          <h3 className="text-lg font-medium text-gray-900">
            No {filterStatus === "active" ? "active " : ""}disputes found
          </h3>
          <p className="text-gray-500 mt-2">
            {filterStatus === "active"
              ? "All disputes have been resolved!"
              : "No disputes match your filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disputed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {dispute.title}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {dispute.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Client:</span>{" "}
                      <span className="font-medium">{dispute.requester.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Designer:</span>{" "}
                      <span className="font-medium">
                        {dispute.designer.sellerProfile?.businessName ||
                          dispute.designer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(dispute.designerQuote)}
                    </div>
                    <div className="text-xs text-gray-500">
                      via {dispute.paymentMethod || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(dispute.disputedAt)}
                    </div>
                    <div className="text-xs text-red-600 max-w-xs truncate">
                      {dispute.disputeReason}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {dispute.disputeResolvedAt ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Resolved
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!dispute.disputeResolvedAt && (
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowResolveModal(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        Resolve
                      </button>
                    )}
                    {dispute.disputeResolvedAt && (
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
                total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchDisputes(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchDisputes(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Details Modal */}
      {selectedDispute && !showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Dispute Details</h2>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Commission</h3>
                  <p className="font-medium">{selectedDispute.title}</p>
                  <p className="text-sm text-gray-600">{selectedDispute.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Client</h3>
                    <p className="font-medium">{selectedDispute.requester.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedDispute.requester.email}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Designer</h3>
                    <p className="font-medium">
                      {selectedDispute.designer.sellerProfile?.businessName ||
                        selectedDispute.designer.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedDispute.designer.email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Dispute Reason</h3>
                  <p className="bg-red-50 text-red-800 p-3 rounded-md">
                    {selectedDispute.disputeReason}
                  </p>
                </div>

                {selectedDispute.disputeResolution && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Resolution</h3>
                    <p className="bg-green-50 text-green-800 p-3 rounded-md">
                      {selectedDispute.disputeResolution}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                    <p className="font-medium">
                      {formatCurrency(selectedDispute.designerQuote)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment</h3>
                    <p className="font-medium">
                      {selectedDispute.paymentMethod || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedDispute.paymentReference}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Disputed At</h3>
                    <p>{formatDate(selectedDispute.disputedAt)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Resolved At</h3>
                    <p>{formatDate(selectedDispute.disputeResolvedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Resolve Dispute</h2>
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">{selectedDispute.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Amount: {formatCurrency(selectedDispute.designerQuote)}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  <strong>Reason:</strong> {selectedDispute.disputeReason}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="dispute-resolution" className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Type
                  </label>
                  <select
                    id="dispute-resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Select resolution...</option>
                    <option value="refund_full">
                      Full Refund to Client (100% back to client)
                    </option>
                    <option value="pay_designer">
                      Pay Designer (Release funds to designer)
                    </option>
                    <option value="refund_partial">
                      Partial Refund (Custom percentage)
                    </option>
                    <option value="split">
                      Split Payment (50/50 by default)
                    </option>
                    <option value="dismiss">
                      Dismiss (No action, keep current status)
                    </option>
                  </select>
                </div>

                {["refund_partial", "split"].includes(resolution) && (
                  <div>
                    <label htmlFor="refund-percentage" className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Percentage to Client: {refundPercentage}%
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
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>
                        Client gets: $
                        {selectedDispute.designerQuote
                          ? ((selectedDispute.designerQuote * refundPercentage) / 100).toFixed(
                              2
                            )
                          : 0}
                      </span>
                      <span>
                        Designer gets: $
                        {selectedDispute.designerQuote
                          ? (
                              (selectedDispute.designerQuote *
                                0.9 *
                                (100 - refundPercentage)) /
                              100
                            ).toFixed(2)
                          : 0}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this resolution..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                    setResolution("");
                    setNotes("");
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolution || resolving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {resolving ? "Processing..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
