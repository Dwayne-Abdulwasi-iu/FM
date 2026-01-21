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
var react_hot_toast_1 = require("react-hot-toast");
var lucide_react_1 = require("lucide-react");
var downloadUtils_1 = require("@/lib/downloadUtils");
var STATUS_CONFIG = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: lucide_react_1.Clock },
    PAID: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: lucide_react_1.CheckCircle },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: lucide_react_1.CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: lucide_react_1.XCircle },
    REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800', icon: lucide_react_1.XCircle },
    PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: lucide_react_1.Package },
    SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: lucide_react_1.Truck },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: lucide_react_1.CheckCircle }
};
function OrdersPage() {
    var _this = this;
    var _a = react_2.useSession(), session = _a.data, authStatus = _a.status;
    var router = navigation_1.useRouter();
    var _b = react_1.useState([]), orders = _b[0], setOrders = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState(''), searchQuery = _d[0], setSearchQuery = _d[1];
    var _e = react_1.useState('all'), statusFilter = _e[0], setStatusFilter = _e[1];
    var _f = react_1.useState('all'), typeFilter = _f[0], setTypeFilter = _f[1];
    var _g = react_1.useState(1), page = _g[0], setPage = _g[1];
    var _h = react_1.useState(1), totalPages = _h[0], setTotalPages = _h[1];
    var _j = react_1.useState(null), downloadingOrderId = _j[0], setDownloadingOrderId = _j[1];
    var handleDownloadAllFiles = function (order) { return __awaiter(_this, void 0, void 0, function () {
        var files_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setDownloadingOrderId(order.id);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    files_1 = [];
                    // Collect all files from all items in the order, organized by design
                    order.items.forEach(function (item) {
                        if (item.design.mediaFiles && item.design.mediaFiles.length > 0) {
                            item.design.mediaFiles.forEach(function (media) {
                                files_1.push({
                                    url: media.fileUrl,
                                    name: media.fileName || item.design.title + "-" + media.id,
                                    folder: item.design.title // Create subfolder for each design
                                });
                            });
                        }
                    });
                    if (files_1.length === 0) {
                        react_hot_toast_1["default"].error('No files available for download');
                        setDownloadingOrderId(null);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, downloadUtils_1.downloadFilesAsZip(files_1, "Order-" + order.orderNumber)];
                case 2:
                    _a.sent();
                    react_hot_toast_1["default"].success("Downloaded " + files_1.length + " file(s) from " + order.items.length + " design(s)");
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error('Download error:', error_1);
                    react_hot_toast_1["default"].error('Failed to download files. Please try again.');
                    return [3 /*break*/, 5];
                case 4:
                    setDownloadingOrderId(null);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    react_1.useEffect(function () {
        if (authStatus === 'loading')
            return;
        if (!session) {
            router.push('/auth/signin');
            return;
        }
        fetchOrders();
    }, [session, authStatus, router, page, statusFilter, typeFilter]);
    var fetchOrders = function () { return __awaiter(_this, void 0, void 0, function () {
        var params, response, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, 5, 6]);
                    setLoading(true);
                    params = new URLSearchParams({
                        page: page.toString(),
                        limit: '10'
                    });
                    if (statusFilter !== 'all')
                        params.append('status', statusFilter);
                    if (typeFilter !== 'all')
                        params.append('type', typeFilter);
                    return [4 /*yield*/, fetch("/api/profile/orders?" + params)];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setOrders(data.orders || []);
                    setTotalPages(data.totalPages || 1);
                    _a.label = 3;
                case 3: return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    console.error('Failed to fetch orders:', error_2);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var filteredOrders = orders.filter(function (order) {
        if (!searchQuery)
            return true;
        var query = searchQuery.toLowerCase();
        return (order.orderNumber.toLowerCase().includes(query) ||
            order.items.some(function (item) { return item.design.title.toLowerCase().includes(query); }));
    });
    var formatDate = function (dateString) {
        var date = new Date(dateString);
        var dateStr = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        var timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        return dateStr + " at " + timeStr;
    };
    var formatCurrency = function (amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    if (authStatus === 'loading' || loading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement(lucide_react_1.Loader2, { className: "w-8 h-8 animate-spin text-indigo-600" })));
    }
    return (React.createElement("div", { className: "min-h-screen bg-gray-50" },
        React.createElement("div", { className: "max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8" },
            React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8" },
                React.createElement("div", null,
                    React.createElement("h1", { className: "text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2" },
                        React.createElement(lucide_react_1.ShoppingBag, { className: "w-5 h-5 sm:w-6 sm:h-6" }),
                        "My Orders"),
                    React.createElement("p", { className: "text-xs sm:text-sm text-gray-600 mt-1" }, "View and manage your digital purchases")),
                React.createElement(link_1["default"], { href: "/boutique/orders", className: "mt-4 sm:mt-0 inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800" },
                    React.createElement(lucide_react_1.Package, { className: "w-4 h-4" }),
                    "View Boutique Orders",
                    React.createElement(lucide_react_1.ExternalLink, { className: "w-3 h-3" }))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6" },
                React.createElement("div", { className: "flex flex-col gap-2 sm:gap-4" },
                    React.createElement("div", { className: "relative flex-1" },
                        React.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }),
                        React.createElement("input", { type: "text", placeholder: "Search orders...", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, className: "w-full pl-8 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" })),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(lucide_react_1.Filter, { className: "w-4 h-4 text-gray-400" }),
                        React.createElement("select", { value: statusFilter, onChange: function (e) { return setStatusFilter(e.target.value); }, className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900", "aria-label": "Filter by order status" },
                            React.createElement("option", { value: "all" }, "All Status"),
                            React.createElement("option", { value: "PENDING" }, "Pending"),
                            React.createElement("option", { value: "PAID" }, "Paid"),
                            React.createElement("option", { value: "COMPLETED" }, "Completed"),
                            React.createElement("option", { value: "CANCELLED" }, "Cancelled"))),
                    React.createElement("select", { value: typeFilter, onChange: function (e) { return setTypeFilter(e.target.value); }, className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900", "aria-label": "Filter by order type" },
                        React.createElement("option", { value: "all" }, "All Types"),
                        React.createElement("option", { value: "DIGITAL" }, "Digital Downloads"),
                        React.createElement("option", { value: "POD" }, "Print-on-Demand")))),
            filteredOrders.length === 0 ? (React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-12 text-center" },
                React.createElement(lucide_react_1.ShoppingBag, { className: "w-16 h-16 text-gray-300 mx-auto mb-4" }),
                React.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "No orders found"),
                React.createElement("p", { className: "text-gray-500 mb-6" }, searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : "You haven't made any purchases yet"),
                React.createElement(link_1["default"], { href: "/designs", className: "inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" }, "Browse Designs"))) : (React.createElement("div", { className: "space-y-2" }, filteredOrders.map(function (order) {
                var statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                var StatusIcon = statusConfig.icon;
                return (React.createElement("div", { key: order.id, className: "bg-white rounded shadow-sm overflow-hidden" },
                    React.createElement("div", { className: "px-3 sm:px-4 py-2 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "text-xs sm:text-sm font-medium text-gray-900" },
                                    "Order #",
                                    order.orderNumber),
                                React.createElement("div", { className: "flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 mt-0.5" },
                                    React.createElement("span", { className: "flex items-center gap-0.5" },
                                        React.createElement(lucide_react_1.Calendar, { className: "w-2.5 h-2.5" }),
                                        formatDate(order.createdAt)),
                                    React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-medium " + (order.orderType === 'POD' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800') }, order.orderType === 'POD' ? 'POD' : 'Digital')))),
                        React.createElement("div", { className: "flex items-center gap-2 sm:gap-3" },
                            React.createElement("span", { className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium " + statusConfig.color },
                                React.createElement(StatusIcon, { className: "w-2.5 h-2.5" }),
                                statusConfig.label),
                            React.createElement("span", { className: "font-semibold text-xs sm:text-sm text-gray-900" }, formatCurrency(order.totalAmount)))),
                    React.createElement("div", { className: "px-3 sm:px-4 py-2" },
                        React.createElement("div", { className: "space-y-1.5" }, order.items.map(function (item) { return (React.createElement("div", { key: item.id, className: "flex items-center gap-2" },
                            React.createElement("div", { className: "w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-gray-100 relative flex-shrink-0" },
                                React.createElement(image_1["default"], { src: item.design.thumbnailUrl || item.design.imageUrl, alt: item.design.title, fill: true, className: "object-cover" })),
                            React.createElement("div", { className: "flex-1 min-w-0" },
                                React.createElement(link_1["default"], { href: "/designs/" + item.design.id, className: "text-xs font-medium text-gray-900 hover:text-indigo-600 truncate block" }, item.design.title),
                                React.createElement("p", { className: "text-[10px] text-gray-500 truncate" },
                                    "by ",
                                    item.design.designer.name || 'Unknown'),
                                React.createElement("div", { className: "flex items-center gap-1 mt-0.5" },
                                    React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded " + (item.purchaseType === 'OWNERSHIP'
                                            ? 'bg-amber-100 text-amber-800'
                                            : item.purchaseType === 'POD'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-gray-100 text-gray-600') }, item.purchaseType === 'OWNERSHIP' ? 'Ownership' : item.purchaseType === 'POD' ? 'POD' : 'License'),
                                    item.podProductName && (React.createElement("span", { className: "text-xs text-gray-500" }, item.podProductName)))),
                            React.createElement("div", { className: "text-right flex-shrink-0" },
                                React.createElement("p", { className: "font-semibold text-xs text-gray-900" }, formatCurrency(item.price)),
                                React.createElement("p", { className: "text-[10px] text-gray-500" },
                                    "Qty: ",
                                    item.quantity)))); }))),
                    React.createElement("div", { className: "px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 flex flex-wrap items-center justify-between gap-1.5" },
                        order.orderType === 'POD' && order.trackingNumber && (React.createElement("div", { className: "flex items-center gap-0.5 text-[10px] sm:text-xs text-gray-600" },
                            React.createElement(lucide_react_1.Truck, { className: "w-2.5 h-2.5" }),
                            React.createElement("span", null,
                                "Tracking: ",
                                order.trackingNumber),
                            order.trackingUrl && (React.createElement("a", { href: order.trackingUrl, target: "_blank", rel: "noopener noreferrer", className: "text-indigo-600 hover:text-indigo-800", "aria-label": "Track shipment" },
                                React.createElement(lucide_react_1.ExternalLink, { className: "w-2.5 h-2.5" }))))),
                        React.createElement("div", { className: "flex items-center gap-1 ml-auto" }, order.orderType === 'DIGITAL' && (order.status === 'PAID' || order.status === 'COMPLETED') && (React.createElement("button", { onClick: function () { return handleDownloadAllFiles(order); }, disabled: downloadingOrderId === order.id, className: "inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed" }, downloadingOrderId === order.id ? (React.createElement(React.Fragment, null,
                            React.createElement(lucide_react_1.Loader2, { className: "w-4 h-4 animate-spin" }),
                            "Downloading...")) : (React.createElement(React.Fragment, null,
                            React.createElement(lucide_react_1.Download, { className: "w-4 h-4" }),
                            "Downloads"))))))));
            }))),
            totalPages > 1 && (React.createElement("div", { className: "flex items-center justify-center gap-2 mt-8" },
                React.createElement("button", { onClick: function () { return setPage(function (p) { return Math.max(1, p - 1); }); }, disabled: page === 1, className: "p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed", "aria-label": "Previous page" },
                    React.createElement(lucide_react_1.ChevronLeft, { className: "w-5 h-5" })),
                React.createElement("span", { className: "px-4 py-2 text-sm text-gray-600" },
                    "Page ",
                    page,
                    " of ",
                    totalPages),
                React.createElement("button", { onClick: function () { return setPage(function (p) { return Math.min(totalPages, p + 1); }); }, disabled: page === totalPages, className: "p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed", "aria-label": "Next page" },
                    React.createElement(lucide_react_1.ChevronRight, { className: "w-5 h-5" })))))));
}
exports["default"] = OrdersPage;
