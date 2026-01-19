"use client";
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
exports.Navbar = void 0;
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var react_1 = require("next-auth/react");
var react_2 = require("react");
var NotificationBell_1 = require("./NotificationBell");
var LanguageContext_1 = require("@/contexts/LanguageContext");
function Navbar() {
    var _this = this;
    var _a, _b;
    var session = react_1.useSession().data;
    var router = navigation_1.useRouter();
    var t = LanguageContext_1.useLanguage().t;
    var _c = react_2.useState(0), cartCount = _c[0], setCartCount = _c[1];
    var _d = react_2.useState(0), boutiqueCartCount = _d[0], setBoutiqueCartCount = _d[1];
    var _e = react_2.useState(''), searchQuery = _e[0], setSearchQuery = _e[1];
    var _f = react_2.useState(false), isSearching = _f[0], setIsSearching = _f[1];
    var _g = react_2.useState(false), mobileMenuOpen = _g[0], setMobileMenuOpen = _g[1];
    var _h = react_2.useState(false), communityDropdownOpen = _h[0], setCommunityDropdownOpen = _h[1];
    react_2.useEffect(function () {
        if (session) {
            fetchCartCount();
            fetchBoutiqueCartCount();
            // Retry cart count fetch after a delay if it initially fails
            var retryTimer_1 = setTimeout(function () {
                fetchCartCount();
                fetchBoutiqueCartCount();
            }, 2000);
            return function () { return clearTimeout(retryTimer_1); };
        }
        // Listen for cart updates
        var handleCartUpdate = function () {
            if (session) {
                fetchCartCount();
            }
        };
        var handleBoutiqueCartUpdate = function () {
            if (session) {
                fetchBoutiqueCartCount();
            }
        };
        window.addEventListener('cartUpdated', handleCartUpdate);
        window.addEventListener('boutiqueCartUpdated', handleBoutiqueCartUpdate);
        return function () {
            window.removeEventListener('cartUpdated', handleCartUpdate);
            window.removeEventListener('boutiqueCartUpdated', handleBoutiqueCartUpdate);
        };
    }, [session]);
    var fetchCartCount = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, fetch('/api/cart')];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setCartCount(data.count || 0);
                    return [3 /*break*/, 4];
                case 3:
                    // Silently fail on initial load - cart count will remain 0
                    // Use debug-level logging and avoid noise during test runs.
                    if (process.env.NODE_ENV !== 'test') {
                        console.debug('Cart API not ready yet, skipping cart count fetch');
                    }
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    // Silently handle network errors during development. Use debug logging
                    // and avoid emitting during test runs.
                    void error_1;
                    if (process.env.NODE_ENV !== 'test') {
                        console.debug('Cart fetch failed (normal during development):', error_1 instanceof Error ? error_1.message : 'Unknown error');
                    }
                    setCartCount(0);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var fetchBoutiqueCartCount = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/boutique/cart')];
                case 1:
                    response = _c.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _c.sent();
                    setBoutiqueCartCount(((_b = (_a = data.cart) === null || _a === void 0 ? void 0 : _a.items) === null || _b === void 0 ? void 0 : _b.length) || 0);
                    _c.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_2 = _c.sent();
                    void error_2;
                    setBoutiqueCartCount(0);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSearch = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var searchParams;
        return __generator(this, function (_a) {
            e.preventDefault();
            if (!searchQuery.trim())
                return [2 /*return*/];
            setIsSearching(true);
            searchParams = new URLSearchParams({ q: searchQuery.trim() });
            router.push("/search?" + searchParams.toString());
            setIsSearching(false);
            return [2 /*return*/];
        });
    }); };
    var handleSearchKeyPress = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!searchQuery.trim())
                return;
            setIsSearching(true);
            var searchParams = new URLSearchParams({ q: searchQuery.trim() });
            router.push("/search?" + searchParams.toString());
            setIsSearching(false);
        }
    };
    return (React.createElement("nav", { className: "bg-white border-b border-gray-200 sticky top-0 z-50" },
        React.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" },
            React.createElement("div", { className: "flex justify-between items-center h-16" },
                React.createElement(link_1["default"], { href: "/", className: "flex items-center space-x-2" },
                    React.createElement("div", { className: "w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center" },
                        React.createElement("span", { className: "text-white font-bold text-sm" }, "FM")),
                    React.createElement("span", { className: "font-bold text-xl text-gray-900" }, "Fashion Marketplace")),
                React.createElement("div", { className: "hidden md:flex flex-1 min-w-[200px] mx-4 lg:mx-8" },
                    React.createElement("form", { onSubmit: handleSearch, className: "relative w-full" },
                        React.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }),
                        React.createElement("input", { type: "text", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, onKeyPress: handleSearchKeyPress, placeholder: t('common.search') + '...', className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500", disabled: isSearching }),
                        isSearching && (React.createElement("div", { className: "absolute right-3 top-1/2 transform -translate-y-1/2" },
                            React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" }))))),
                React.createElement("div", { className: "hidden md:flex items-center space-x-6" },
                    React.createElement(link_1["default"], { href: "/designs", className: "text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-1.5" },
                        React.createElement(lucide_react_1.Download, { className: "w-4 h-4" }),
                        t('nav.designs')),
                    React.createElement(link_1["default"], { href: "/boutique", className: "text-gray-800 hover:text-purple-700 font-medium flex items-center gap-1.5" },
                        React.createElement(lucide_react_1.Package, { className: "w-4 h-4" }),
                        t('nav.boutique') || 'Boutique'),
                    React.createElement("div", { className: "relative", onMouseEnter: function () { return setCommunityDropdownOpen(true); }, onMouseLeave: function () { return setCommunityDropdownOpen(false); } },
                        React.createElement("button", { onClick: function () { return setCommunityDropdownOpen(!communityDropdownOpen); }, className: "text-gray-800 hover:text-indigo-700 font-medium flex items-center gap-1" },
                            "Community",
                            React.createElement(lucide_react_1.ChevronDown, { className: "w-4 h-4 transition-transform " + (communityDropdownOpen ? 'rotate-180' : '') })),
                        communityDropdownOpen && (React.createElement("div", { className: "absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50" },
                            React.createElement(link_1["default"], { href: "/contests", onClick: function () { return setCommunityDropdownOpen(false); }, className: "flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700" },
                                React.createElement(lucide_react_1.Trophy, { className: "w-4 h-4" }),
                                "Contests"),
                            React.createElement(link_1["default"], { href: "/forum", onClick: function () { return setCommunityDropdownOpen(false); }, className: "flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700" },
                                React.createElement(lucide_react_1.MessageSquare, { className: "w-4 h-4" }),
                                "Forum"),
                            React.createElement(link_1["default"], { href: "/commissions", onClick: function () { return setCommunityDropdownOpen(false); }, className: "flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700" },
                                React.createElement(lucide_react_1.Palette, { className: "w-4 h-4" }),
                                "Commissions"),
                            React.createElement(link_1["default"], { href: "/designers", onClick: function () { return setCommunityDropdownOpen(false); }, className: "flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700" },
                                React.createElement(lucide_react_1.User, { className: "w-4 h-4" }),
                                "Designers")))),
                    React.createElement(link_1["default"], { href: "/contact", className: "text-gray-800 hover:text-indigo-700 font-medium" }, t('nav.contact')),
                    session && (React.createElement(React.Fragment, null,
                        React.createElement(link_1["default"], { href: "/seller/dashboard", className: "text-gray-800 hover:text-indigo-700 flex items-center gap-1 font-medium" },
                            React.createElement(lucide_react_1.LayoutDashboard, { className: "w-4 h-4" }),
                            t('nav.dashboard')),
                        React.createElement(link_1["default"], { href: "/upload", className: "text-gray-800 hover:text-indigo-700 flex items-center gap-1 font-medium" },
                            React.createElement(lucide_react_1.Upload, { className: "w-4 h-4" }),
                            t('nav.upload') || 'Upload'))),
                    session && React.createElement(NotificationBell_1.NotificationBell, null),
                    React.createElement(link_1["default"], { href: "/cart", className: "text-indigo-700 hover:text-indigo-800 relative", title: "Digital Downloads Cart" },
                        React.createElement(lucide_react_1.Download, { className: "w-5 h-5" }),
                        cartCount > 0 && (React.createElement("span", { className: "absolute -top-2 -right-2 bg-indigo-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" }, cartCount))),
                    React.createElement(link_1["default"], { href: "/boutique/cart", className: "text-purple-700 hover:text-purple-800 relative", title: "Physical Items Cart" },
                        React.createElement(lucide_react_1.Package, { className: "w-5 h-5" }),
                        boutiqueCartCount > 0 && (React.createElement("span", { className: "absolute -top-2 -right-2 bg-purple-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" }, boutiqueCartCount))),
                    session ? (React.createElement("div", { className: "flex items-center space-x-4" },
                        ((_a = session.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN' && (React.createElement(link_1["default"], { href: "/admin", className: "text-gray-800 hover:text-indigo-700 flex items-center gap-1", title: "Admin Dashboard" },
                            React.createElement(lucide_react_1.Shield, { className: "w-4 h-4" }))),
                        React.createElement(link_1["default"], { href: "/profile", className: "text-gray-800 hover:text-indigo-700" },
                            React.createElement(lucide_react_1.User, { className: "w-5 h-5" })),
                        React.createElement("button", { onClick: function () { return react_1.signOut(); }, className: "text-gray-800 hover:text-indigo-700 text-sm font-medium" }, t('nav.signOut')))) : (React.createElement("button", { onClick: function () { return react_1.signIn(); }, className: "bg-indigo-700 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 font-medium" }, t('nav.signIn')))),
                React.createElement("button", { onClick: function () { return setMobileMenuOpen(!mobileMenuOpen); }, className: "md:hidden p-2 rounded-lg hover:bg-gray-100", "aria-label": "Open menu" },
                    React.createElement(lucide_react_1.Menu, { className: "w-6 h-6" }))),
            mobileMenuOpen && (React.createElement("div", { className: "md:hidden pb-2 border-t border-gray-200" },
                React.createElement("div", { className: "space-y-1 py-2" },
                    React.createElement("div", { className: "border-b border-gray-100 pb-2 mb-2" },
                        React.createElement("span", { className: "px-3 text-[10px] font-semibold text-gray-400 uppercase" }, "Shop"),
                        React.createElement(link_1["default"], { href: "/designs", className: "block px-3 py-2 text-xs text-gray-800 hover:bg-indigo-50 rounded-lg flex items-center gap-2", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement("div", { className: "p-1 bg-indigo-100 rounded" },
                                React.createElement(lucide_react_1.Download, { className: "w-3 h-3 text-indigo-700" })),
                            React.createElement("span", null, "Digital Designs"),
                            React.createElement("span", { className: "text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded ml-auto" }, "INSTANT")),
                        React.createElement(link_1["default"], { href: "/boutique", className: "block px-3 py-2 text-xs text-gray-800 hover:bg-purple-50 rounded-lg flex items-center gap-2", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement("div", { className: "p-1 bg-purple-100 rounded" },
                                React.createElement(lucide_react_1.Package, { className: "w-3 h-3 text-purple-700" })),
                            React.createElement("span", null, "Physical Boutique"),
                            React.createElement("span", { className: "text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded ml-auto" }, "SHIPPED"))),
                    React.createElement(link_1["default"], { href: "/contact", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg", onClick: function () { return setMobileMenuOpen(false); } }, "Contact"),
                    React.createElement("div", { className: "border-t border-gray-100 my-2 pt-2" },
                        React.createElement("span", { className: "px-3 text-[10px] font-semibold text-gray-400 uppercase" }, "Community"),
                        React.createElement(link_1["default"], { href: "/contests", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Trophy, { className: "w-3 h-3" }),
                            "Contests"),
                        React.createElement(link_1["default"], { href: "/forum", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.MessageSquare, { className: "w-3 h-3" }),
                            "Forum"),
                        React.createElement(link_1["default"], { href: "/commissions", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Palette, { className: "w-3 h-3" }),
                            "Commissions"),
                        React.createElement(link_1["default"], { href: "/designers", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.User, { className: "w-3 h-3" }),
                            "Designers")),
                    session && (React.createElement(React.Fragment, null,
                        React.createElement(link_1["default"], { href: "/seller/dashboard", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.LayoutDashboard, { className: "w-3 h-3" }),
                            "Seller Dashboard"),
                        React.createElement(link_1["default"], { href: "/upload", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Upload, { className: "w-3 h-3" }),
                            "Upload"))),
                    React.createElement(link_1["default"], { href: "/cart", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-indigo-50 rounded-lg flex items-center justify-between", onClick: function () { return setMobileMenuOpen(false); } },
                        React.createElement("span", { className: "flex items-center gap-2" },
                            React.createElement(lucide_react_1.Download, { className: "w-3 h-3 text-indigo-700" }),
                            "Digital Cart"),
                        cartCount > 0 && (React.createElement("span", { className: "bg-indigo-700 text-white text-[10px] rounded-full px-1.5 py-0.5" }, cartCount))),
                    React.createElement(link_1["default"], { href: "/boutique/cart", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-purple-50 rounded-lg flex items-center justify-between", onClick: function () { return setMobileMenuOpen(false); } },
                        React.createElement("span", { className: "flex items-center gap-2" },
                            React.createElement(lucide_react_1.Package, { className: "w-3 h-3 text-purple-700" }),
                            "Boutique Cart"),
                        boutiqueCartCount > 0 && (React.createElement("span", { className: "bg-purple-700 text-white text-[10px] rounded-full px-1.5 py-0.5" }, boutiqueCartCount))),
                    session ? (React.createElement(React.Fragment, null,
                        ((_b = session.user) === null || _b === void 0 ? void 0 : _b.role) === 'ADMIN' && (React.createElement(link_1["default"], { href: "/admin", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Shield, { className: "w-3 h-3" }),
                            "Admin Dashboard")),
                        React.createElement(link_1["default"], { href: "/boutique/favorites", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-pink-50 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Heart, { className: "w-3 h-3 text-pink-600" }),
                            "My Favorites"),
                        React.createElement(link_1["default"], { href: "/orders", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Receipt, { className: "w-3 h-3" }),
                            "My Orders"),
                        React.createElement(link_1["default"], { href: "/profile", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.User, { className: "w-3 h-3" }),
                            "Profile"),
                        React.createElement(link_1["default"], { href: "/profile/settings", className: "block px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5", onClick: function () { return setMobileMenuOpen(false); } },
                            React.createElement(lucide_react_1.Settings, { className: "w-3 h-3" }),
                            "Settings"),
                        React.createElement("button", { onClick: function () {
                                react_1.signOut();
                                setMobileMenuOpen(false);
                            }, className: "w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-gray-100 rounded-lg font-medium" }, "Sign Out"))) : (React.createElement("button", { onClick: function () {
                            react_1.signIn();
                            setMobileMenuOpen(false);
                        }, className: "w-11/12 mx-auto block bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 font-medium text-xs text-center" }, "Sign In"))))))));
}
exports.Navbar = Navbar;
