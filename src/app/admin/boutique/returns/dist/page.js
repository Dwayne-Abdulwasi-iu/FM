'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var react_1 = require("react");
var react_2 = require("next-auth/react");
var navigation_1 = require("next/navigation");
var link_1 = require("next/link");
var image_1 = require("next/image");
var lucide_react_1 = require("lucide-react");
var react_hot_toast_1 = require("react-hot-toast");
var RETURN_STATUSES = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ITEM_SHIPPED', label: 'Item Shipped' },
    { value: 'ITEM_RECEIVED', label: 'Item Received' },
    { value: 'REFUNDED', label: 'Refunded' },
];
function getStatusBadge(status) {
    switch (status) {
        case 'PENDING':
            return { bg: 'bg-yellow-100 text-yellow-800', icon: lucide_react_1.Clock };
        case 'APPROVED':
            return { bg: 'bg-blue-100 text-blue-800', icon: lucide_react_1.CheckCircle };
        case 'REJECTED':
            return { bg: 'bg-red-100 text-red-800', icon: lucide_react_1.XCircle };
        case 'ITEM_SHIPPED':
            return { bg: 'bg-indigo-100 text-indigo-800', icon: lucide_react_1.Package };
        case 'ITEM_RECEIVED':
            return { bg: 'bg-purple-100 text-purple-800', icon: lucide_react_1.Package };
        case 'REFUNDED':
            return { bg: 'bg-green-100 text-green-800', icon: lucide_react_1.CheckCircle };
        default:
            return { bg: 'bg-gray-100 text-gray-800', icon: lucide_react_1.Clock };
    }
}
function AdminReturnsPage() {
    var _this = this;
    var _a = react_2.useSession(), session = _a.data, status = _a.status;
    var router = navigation_1.useRouter();
    var _b = react_1.useState([]), returns = _b[0], setReturns = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState(''), searchQuery = _d[0], setSearchQuery = _d[1];
    var _e = react_1.useState(''), statusFilter = _e[0], setStatusFilter = _e[1];
    var _f = react_1.useState(null), selectedReturn = _f[0], setSelectedReturn = _f[1];
    var _g = react_1.useState(false), processing = _g[0], setProcessing = _g[1];
    var _h = react_1.useState(''), adminNotes = _h[0], setAdminNotes = _h[1];
    react_1.useEffect(function () {
        if (status === 'loading')
            return;
        if (!session || session.user.role !== 'ADMIN') {
            router.push('/auth/signin');
            return;
        }
        fetchReturns();
    }, [session, status, statusFilter]);
    var fetchReturns = function () { return __awaiter(_this, void 0, void 0, function () {
        var params, res, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    params = new URLSearchParams();
                    if (statusFilter)
                        params.append('status', statusFilter);
                    if (searchQuery)
                        params.append('search', searchQuery);
                    return [4 /*yield*/, fetch("/api/boutique/returns?admin=true&" + params)];
                case 2:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _a.sent();
                    setReturns(data.returns || []);
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_1 = _a.sent();
                    console.error('Failed to fetch returns:', error_1);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleAction = function (returnId, action, notes) { return __awaiter(_this, void 0, void 0, function () {
        var res, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setProcessing(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, 7, 8]);
                    return [4 /*yield*/, fetch('/api/boutique/returns', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                returnId: returnId,
                                action: action,
                                adminNotes: notes || adminNotes
                            })
                        })];
                case 2:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 3];
                    react_hot_toast_1["default"].success("Return " + action + "d successfully");
                    fetchReturns();
                    setSelectedReturn(null);
                    setAdminNotes('');
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, res.json()];
                case 4:
                    data = _a.sent();
                    react_hot_toast_1["default"].error(data.message || 'Failed to update return');
                    _a.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_2 = _a.sent();
                    react_hot_toast_1["default"].error('Failed to update return');
                    return [3 /*break*/, 8];
                case 7:
                    setProcessing(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var formatCurrency = function (amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount);
    };
    var formatDate = function (date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    if (status === 'loading' || loading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" })));
    }
    return (React.createElement("div", { className: "min-h-screen bg-gray-50 py-4 sm:py-8" },
        React.createElement("div", { className: "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8" },
            React.createElement("div", { className: "mb-4 sm:mb-8" },
                React.createElement(link_1["default"], { href: "/admin/boutique", className: "text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-3 text-sm" },
                    React.createElement(lucide_react_1.ChevronLeft, { className: "w-4 h-4" }),
                    "Back to Boutique Admin"),
                React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("div", null,
                        React.createElement("h1", { className: "text-xl sm:text-3xl font-bold text-gray-900" }, "Return Requests"),
                        React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Manage buyer return requests")),
                    React.createElement("button", { onClick: function () { return fetchReturns(); }, className: "p-2 hover:bg-gray-100 rounded-lg", "aria-label": "Refresh returns list" },
                        React.createElement(lucide_react_1.RefreshCw, { className: "w-5 h-5 text-gray-600" })))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6" },
                React.createElement("div", { className: "flex flex-col sm:flex-row gap-4" },
                    React.createElement("form", { onSubmit: function (e) { e.preventDefault(); fetchReturns(); }, className: "flex-1" },
                        React.createElement("div", { className: "relative" },
                            React.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" }),
                            React.createElement("input", { type: "text", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, placeholder: "Search by return number or order...", className: "w-full pl-10 pr-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500" }))),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(lucide_react_1.Filter, { className: "w-5 h-5 text-gray-400" }),
                        React.createElement("select", { value: statusFilter, onChange: function (e) { return setStatusFilter(e.target.value); }, className: "border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500", "aria-label": "Filter by return status" }, RETURN_STATUSES.map(function (s) { return (React.createElement("option", { key: s.value, value: s.value, className: "text-gray-900" }, s.label)); }))))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden" }, returns.length === 0 ? (React.createElement("div", { className: "p-12 text-center" },
                React.createElement(lucide_react_1.RotateCcw, { className: "w-16 h-16 text-gray-300 mx-auto mb-4" }),
                React.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "No return requests"),
                React.createElement("p", { className: "text-gray-500" }, statusFilter ? 'Try adjusting your filters' : 'Return requests will appear here'))) : (React.createElement("div", { className: "divide-y divide-gray-200" }, returns.map(function (ret) {
                var statusInfo = getStatusBadge(ret.status);
                var StatusIcon = statusInfo.icon;
                return (React.createElement("div", { key: ret.id, className: "p-4 hover:bg-gray-50" },
                    React.createElement("div", { className: "flex items-start gap-4" },
                        React.createElement("div", { className: "w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0" }, ret.orderItem.product.thumbnailUrl ? (React.createElement(image_1["default"], { src: ret.orderItem.product.thumbnailUrl, alt: ret.orderItem.product.title, width: 64, height: 64, className: "object-cover w-full h-full" })) : (React.createElement("div", { className: "w-full h-full flex items-center justify-center" },
                            React.createElement(lucide_react_1.Package, { className: "w-8 h-8 text-gray-300" })))),
                        React.createElement("div", { className: "flex-1 min-w-0" },
                            React.createElement("div", { className: "flex items-center justify-between gap-4" },
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-medium text-gray-900" }, ret.returnNumber),
                                    React.createElement("p", { className: "text-sm text-gray-500" },
                                        "Order: ",
                                        ret.order.orderNumber)),
                                React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium " + statusInfo.bg },
                                    React.createElement(StatusIcon, { className: "w-3 h-3" }),
                                    ret.status.replace(/_/g, ' '))),
                            React.createElement("p", { className: "text-sm text-gray-900 mt-1" }, ret.orderItem.product.title),
                            React.createElement("p", { className: "text-sm text-gray-500" },
                                "Buyer: ",
                                ret.user.name || ret.user.email,
                                " \u2022 Qty: ",
                                ret.orderItem.quantity),
                            React.createElement("p", { className: "text-sm text-gray-500" },
                                "Reason: ",
                                React.createElement("span", { className: "text-gray-700" }, ret.reason.replace(/_/g, ' '))),
                            ret.description && (React.createElement("p", { className: "text-sm text-gray-500 mt-1" },
                                "\u201C",
                                ret.description,
                                "\u201D")),
                            React.createElement("div", { className: "flex items-center justify-between mt-2" },
                                React.createElement("p", { className: "text-sm font-medium text-purple-600" },
                                    "Refund: ",
                                    formatCurrency(ret.refundAmount)),
                                React.createElement("p", { className: "text-xs text-gray-500" }, formatDate(ret.createdAt)))),
                        React.createElement("div", { className: "flex flex-col gap-2" },
                            React.createElement("button", { onClick: function () { return setSelectedReturn(ret); }, className: "p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg", "aria-label": "View return details" },
                                React.createElement(lucide_react_1.Eye, { className: "w-5 h-5" })),
                            ret.status === 'PENDING' && (React.createElement(React.Fragment, null,
                                React.createElement("button", { onClick: function () { return handleAction(ret.id, 'approve'); }, disabled: processing, className: "p-2 text-green-600 hover:bg-green-50 rounded-lg", title: "Approve" },
                                    React.createElement(lucide_react_1.CheckCircle, { className: "w-5 h-5" })),
                                React.createElement("button", { onClick: function () { return setSelectedReturn(ret); }, className: "p-2 text-red-600 hover:bg-red-50 rounded-lg", title: "Reject" },
                                    React.createElement(lucide_react_1.XCircle, { className: "w-5 h-5" }))))))));
            })))),
            selectedReturn && (React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" },
                React.createElement("div", { className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" },
                    React.createElement("div", { className: "p-6" },
                        React.createElement("div", { className: "flex items-center justify-between mb-6" },
                            React.createElement("h2", { className: "text-xl font-bold text-gray-900" }, "Return Details"),
                            React.createElement("button", { onClick: function () { return setSelectedReturn(null); }, className: "p-2 hover:bg-gray-100 rounded-lg", "aria-label": "Close modal" },
                                React.createElement(lucide_react_1.XCircle, { className: "w-5 h-5" }))),
                        React.createElement("div", { className: "space-y-4" },
                            React.createElement("div", { className: "grid grid-cols-2 gap-4 text-sm" },
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Return Number"),
                                    React.createElement("p", { className: "font-medium text-gray-900" }, selectedReturn.returnNumber)),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Order Number"),
                                    React.createElement(link_1["default"], { href: "/admin/boutique/orders/" + selectedReturn.order.id, className: "font-medium text-purple-600 hover:underline" }, selectedReturn.order.orderNumber)),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Buyer"),
                                    React.createElement("p", { className: "font-medium text-gray-900" }, selectedReturn.user.name || selectedReturn.user.email)),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Refund Amount"),
                                    React.createElement("p", { className: "font-medium text-gray-900" }, formatCurrency(selectedReturn.refundAmount))),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Reason"),
                                    React.createElement("p", { className: "font-medium text-gray-900" }, selectedReturn.reason.replace(/_/g, ' '))),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "text-gray-500" }, "Status"),
                                    React.createElement("p", { className: "font-medium text-gray-900" }, selectedReturn.status.replace(/_/g, ' ')))),
                            selectedReturn.description && (React.createElement("div", null,
                                React.createElement("p", { className: "text-gray-500 text-sm" }, "Description"),
                                React.createElement("p", { className: "text-gray-900 mt-1" }, selectedReturn.description))),
                            selectedReturn.imageUrls.length > 0 && (React.createElement("div", null,
                                React.createElement("p", { className: "text-gray-500 text-sm mb-2" }, "Evidence Images"),
                                React.createElement("div", { className: "flex gap-2 flex-wrap" }, selectedReturn.imageUrls.map(function (url, idx) { return (React.createElement("a", { key: idx, href: url, target: "_blank", rel: "noopener noreferrer", "aria-label": "View evidence image " + (idx + 1) },
                                    React.createElement(image_1["default"], { src: url, alt: "Evidence " + (idx + 1), width: 100, height: 100, className: "rounded-lg object-cover" }))); })))),
                            selectedReturn.adminNotes && (React.createElement("div", { className: "bg-gray-50 p-3 rounded-lg" },
                                React.createElement("p", { className: "text-gray-500 text-sm" }, "Admin Notes"),
                                React.createElement("p", { className: "text-gray-900 mt-1" }, selectedReturn.adminNotes))),
                            selectedReturn.status === 'PENDING' && (React.createElement("div", { className: "border-t pt-4 mt-4" },
                                React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Admin Notes (required for rejection)"),
                                React.createElement("textarea", { value: adminNotes, onChange: function (e) { return setAdminNotes(e.target.value); }, rows: 3, className: "w-full border rounded-lg px-3 py-2 text-gray-900", placeholder: "Enter notes..." }),
                                React.createElement("div", { className: "flex gap-3 mt-4" },
                                    React.createElement("button", { onClick: function () { return handleAction(selectedReturn.id, 'approve'); }, disabled: processing, className: "flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50" }, "Approve Return"),
                                    React.createElement("button", { onClick: function () {
                                            if (!adminNotes.trim()) {
                                                react_hot_toast_1["default"].error('Please enter a rejection reason');
                                                return;
                                            }
                                            handleAction(selectedReturn.id, 'reject', adminNotes);
                                        }, disabled: processing, className: "flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50" }, "Reject Return")))),
                            selectedReturn.status === 'ITEM_RECEIVED' && (React.createElement("div", { className: "border-t pt-4 mt-4" },
                                React.createElement("button", { onClick: function () { return handleAction(selectedReturn.id, 'complete_refund'); }, disabled: processing, className: "w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50" },
                                    "Complete Refund (",
                                    formatCurrency(selectedReturn.refundAmount),
                                    ")")))))))))));
}
exports["default"] = AdminReturnsPage;
