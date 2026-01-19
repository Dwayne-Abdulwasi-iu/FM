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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
var react_2 = require("next-auth/react");
var navigation_1 = require("next/navigation");
var link_1 = require("next/link");
var lucide_react_1 = require("lucide-react");
var NOTIFICATION_ICONS = {
    COMMISSION_MESSAGE: lucide_react_1.MessageSquare,
    ORDER_UPDATE: lucide_react_1.Package,
    PAYMENT: lucide_react_1.CreditCard,
    SYSTEM: lucide_react_1.AlertCircle
};
var NOTIFICATION_COLORS = {
    COMMISSION_MESSAGE: 'bg-blue-100 text-blue-600',
    ORDER_UPDATE: 'bg-purple-100 text-purple-600',
    PAYMENT: 'bg-green-100 text-green-600',
    SYSTEM: 'bg-yellow-100 text-yellow-600'
};
var TYPE_LABELS = {
    COMMISSION_MESSAGE: 'Messages',
    ORDER_UPDATE: 'Orders',
    PAYMENT: 'Payments',
    SYSTEM: 'System'
};
function NotificationsPage() {
    var _this = this;
    var _a = react_2.useSession(), session = _a.data, status = _a.status;
    var router = navigation_1.useRouter();
    var _b = react_1.useState([]), notifications = _b[0], setNotifications = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState('all'), filter = _d[0], setFilter = _d[1];
    var _e = react_1.useState(''), typeFilter = _e[0], setTypeFilter = _e[1];
    var _f = react_1.useState(0), unreadCount = _f[0], setUnreadCount = _f[1];
    react_1.useEffect(function () {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);
    var fetchNotifications = function () { return __awaiter(_this, void 0, void 0, function () {
        var params, res, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, 5, 6]);
                    params = new URLSearchParams();
                    if (filter === 'unread')
                        params.append('unread', 'true');
                    params.append('limit', '50');
                    return [4 /*yield*/, fetch("/api/notifications?" + params)];
                case 1:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unreadCount || 0);
                    _a.label = 3;
                case 3: return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    console.error('Failed to fetch notifications:', error_1);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    react_1.useEffect(function () {
        if (session) {
            fetchNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, filter]);
    var markAsRead = function (notificationId) { return __awaiter(_this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch('/api/notifications', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notificationId: notificationId })
                        })];
                case 1:
                    _a.sent();
                    fetchNotifications();
                    window.dispatchEvent(new CustomEvent('notificationUpdate'));
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Failed to mark as read:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var markAllAsRead = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch('/api/notifications', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ markAllRead: true })
                        })];
                case 1:
                    _a.sent();
                    fetchNotifications();
                    window.dispatchEvent(new CustomEvent('notificationUpdate'));
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('Failed to mark all as read:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var deleteNotification = function (notificationId) { return __awaiter(_this, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch("/api/notifications?id=" + notificationId, { method: 'DELETE' })];
                case 1:
                    _a.sent();
                    fetchNotifications();
                    window.dispatchEvent(new CustomEvent('notificationUpdate'));
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error('Failed to delete notification:', error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var formatTime = function (dateString) {
        var date = new Date(dateString);
        var now = new Date();
        var diffMs = now.getTime() - date.getTime();
        var diffMins = Math.floor(diffMs / 60000);
        var diffHours = Math.floor(diffMins / 60);
        var diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return diffMins + " minute" + (diffMins !== 1 ? 's' : '') + " ago";
        if (diffHours < 24)
            return diffHours + " hour" + (diffHours !== 1 ? 's' : '') + " ago";
        if (diffDays < 7)
            return diffDays + " day" + (diffDays !== 1 ? 's' : '') + " ago";
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };
    var getNotificationLink = function (notification) {
        var _a, _b;
        if ((_a = notification.data) === null || _a === void 0 ? void 0 : _a.commissionId) {
            return '/my-commissions';
        }
        if ((_b = notification.data) === null || _b === void 0 ? void 0 : _b.orderId) {
            return '/profile?tab=orders';
        }
        return null;
    };
    var filteredNotifications = typeFilter
        ? notifications.filter(function (n) { return n.type === typeFilter; })
        : notifications;
    // Get unique notification types for filter
    var notificationTypes = __spreadArrays(new Set(notifications.map(function (n) { return n.type; })));
    if (status === 'loading' || loading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" })));
    }
    return (React.createElement("div", { className: "min-h-screen bg-gray-50 py-8" },
        React.createElement("div", { className: "max-w-3xl mx-auto px-4" },
            React.createElement("div", { className: "flex items-center gap-4 mb-6" },
                React.createElement("button", { onClick: function () { return router.back(); }, className: "p-2 hover:bg-gray-100 rounded-lg transition", "aria-label": "Go back" },
                    React.createElement(lucide_react_1.ArrowLeft, { className: "w-5 h-5 text-gray-600" })),
                React.createElement("div", { className: "flex-1" },
                    React.createElement("h1", { className: "text-2xl font-bold text-gray-900 flex items-center gap-2" },
                        React.createElement(lucide_react_1.Bell, { className: "w-6 h-6" }),
                        "Notifications"),
                    unreadCount > 0 && (React.createElement("p", { className: "text-sm text-gray-500" },
                        unreadCount,
                        " unread notification",
                        unreadCount !== 1 ? 's' : ''))),
                unreadCount > 0 && (React.createElement("button", { onClick: markAllAsRead, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition" },
                    React.createElement(lucide_react_1.CheckCheck, { className: "w-4 h-4" }),
                    "Mark all read"))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6" },
                React.createElement("div", { className: "flex flex-wrap gap-4" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(lucide_react_1.Filter, { className: "w-4 h-4 text-gray-400" }),
                        React.createElement("select", { value: filter, onChange: function (e) { return setFilter(e.target.value); }, className: "text-sm text-gray-900 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500", "aria-label": "Filter by read status" },
                            React.createElement("option", { value: "all" }, "All notifications"),
                            React.createElement("option", { value: "unread" }, "Unread only"))),
                    notificationTypes.length > 1 && (React.createElement("select", { value: typeFilter, onChange: function (e) { return setTypeFilter(e.target.value); }, className: "text-sm text-gray-900 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500", "aria-label": "Filter by notification type" },
                        React.createElement("option", { value: "" }, "All types"),
                        notificationTypes.map(function (type) { return (React.createElement("option", { key: type, value: type }, TYPE_LABELS[type] || type)); }))))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden" }, filteredNotifications.length === 0 ? (React.createElement("div", { className: "p-12 text-center" },
                React.createElement("div", { className: "w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4" },
                    React.createElement(lucide_react_1.Bell, { className: "w-8 h-8 text-gray-400" })),
                React.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-1" }, "No notifications"),
                React.createElement("p", { className: "text-gray-500" }, filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."))) : (React.createElement("div", { className: "divide-y divide-gray-100" }, filteredNotifications.map(function (notification) {
                var IconComponent = NOTIFICATION_ICONS[notification.type] || lucide_react_1.AlertCircle;
                var colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-gray-100 text-gray-600';
                var link = getNotificationLink(notification);
                var content = (React.createElement("div", { className: "flex items-start gap-4 p-4 hover:bg-gray-50 transition " + (!notification.isRead ? 'bg-indigo-50/30' : '') },
                    React.createElement("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + colorClass },
                        React.createElement(IconComponent, { className: "w-5 h-5" })),
                    React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("div", { className: "flex items-start justify-between gap-2" },
                            React.createElement("p", { className: "text-sm " + (!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700') }, notification.title),
                            !notification.isRead && (React.createElement("span", { className: "w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" }))),
                        React.createElement("p", { className: "text-sm text-gray-500 mt-1" }, notification.message),
                        React.createElement("div", { className: "flex items-center gap-4 mt-2" },
                            React.createElement("p", { className: "text-xs text-gray-400" }, formatTime(notification.createdAt)),
                            React.createElement("span", { className: "text-xs text-gray-300" }, "\u2022"),
                            React.createElement("span", { className: "text-xs text-gray-400" }, TYPE_LABELS[notification.type] || notification.type))),
                    React.createElement("div", { className: "flex items-center gap-1 flex-shrink-0" },
                        !notification.isRead && (React.createElement("button", { onClick: function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.id);
                            }, className: "p-2 hover:bg-gray-100 rounded-lg transition", title: "Mark as read" },
                            React.createElement(lucide_react_1.Check, { className: "w-4 h-4 text-gray-400" }))),
                        React.createElement("button", { onClick: function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNotification(notification.id);
                            }, className: "p-2 hover:bg-red-50 rounded-lg transition", title: "Delete notification" },
                            React.createElement(lucide_react_1.Trash2, { className: "w-4 h-4 text-gray-400 hover:text-red-500" })))));
                return link ? (React.createElement(link_1["default"], { key: notification.id, href: link, onClick: function () {
                        if (!notification.isRead)
                            markAsRead(notification.id);
                    }, className: "block" }, content)) : (React.createElement("div", { key: notification.id }, content));
            })))),
            React.createElement("div", { className: "mt-6 flex justify-center gap-4" },
                React.createElement(link_1["default"], { href: "/my-commissions", className: "text-sm text-indigo-600 hover:text-indigo-800" }, "View My Commissions \u2192"),
                React.createElement(link_1["default"], { href: "/seller/commission-requests", className: "text-sm text-indigo-600 hover:text-indigo-800" }, "View Commission Requests \u2192")))));
}
exports["default"] = NotificationsPage;
