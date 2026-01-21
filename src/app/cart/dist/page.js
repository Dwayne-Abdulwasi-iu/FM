'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var navigation_1 = require("next/navigation");
var react_2 = require("next-auth/react");
var lucide_react_1 = require("lucide-react");
var image_1 = require("next/image");
var link_1 = require("next/link");
var CurrencyProvider_1 = require("@/components/CurrencyProvider");
function CartPage() {
    var _this = this;
    var session = react_2.useSession().data;
    var router = navigation_1.useRouter();
    var _a = react_1.useState([]), cartItems = _a[0], setCartItems = _a[1];
    var _b = react_1.useState(true), loading = _b[0], setLoading = _b[1];
    var _c = react_1.useState(null), updating = _c[0], setUpdating = _c[1];
    var _d = react_1.useState(false), checkingOut = _d[0], setCheckingOut = _d[1];
    var _e = react_1.useState(null), errorMessage = _e[0], setErrorMessage = _e[1];
    var _f = react_1.useState('paystack'), paymentMethod = _f[0], setPaymentMethod = _f[1];
    var _g = react_1.useState('NG'), countryCode = _g[0], setCountryCode = _g[1];
    var _h = react_1.useState(false), showShippingForm = _h[0], setShowShippingForm = _h[1];
    var _j = react_1.useState({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'NG',
        phone: ''
    }), shippingAddress = _j[0], setShippingAddress = _j[1];
    react_1.useEffect(function () {
        if (session) {
            fetchCart();
        }
        else {
            setLoading(false);
        }
    }, [session]);
    var fetchCart = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, 6, 7]);
                    setLoading(true);
                    return [4 /*yield*/, fetch('/api/cart')];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setCartItems(data.items);
                    return [3 /*break*/, 4];
                case 3:
                    if (response.status === 401) {
                        setErrorMessage('Please sign in to view your cart.');
                    }
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_1 = _a.sent();
                    console.error('Failed to fetch cart:', error_1);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var removeFromCart = function (itemId) { return __awaiter(_this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setUpdating(itemId);
                    return [4 /*yield*/, fetch("/api/cart?itemId=" + itemId, {
                            method: 'DELETE'
                        })];
                case 1:
                    response = _a.sent();
                    if (response.ok) {
                        setCartItems(function (items) { return items.filter(function (item) { return item.id !== itemId; }); });
                    }
                    return [3 /*break*/, 4];
                case 2:
                    error_2 = _a.sent();
                    console.error('Failed to remove item:', error_2);
                    return [3 /*break*/, 4];
                case 3:
                    setUpdating(null);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var updateQuantity = function (itemId, newQuantity) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (newQuantity < 1) {
                removeFromCart(itemId);
                return [2 /*return*/];
            }
            try {
                setUpdating(itemId);
                // For now, just update locally since we don't have update endpoint
                setCartItems(function (items) {
                    return items.map(function (item) {
                        return item.id === itemId ? __assign(__assign({}, item), { quantity: newQuantity }) : item;
                    });
                });
            }
            catch (error) {
                console.error('Failed to update quantity:', error);
            }
            finally {
                setUpdating(null);
            }
            return [2 /*return*/];
        });
    }); };
    var handleCheckout = function () { return __awaiter(_this, void 0, void 0, function () {
        var hasPOD, required, missing, response, data, error, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    hasPOD = cartItems.some(function (item) { return item.purchaseType === 'POD'; });
                    if (hasPOD && !showShippingForm) {
                        setShowShippingForm(true);
                        return [2 /*return*/];
                    }
                    // Validate shipping address if POD items exist
                    if (hasPOD) {
                        required = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'];
                        missing = required.filter(function (field) { return !shippingAddress[field]; });
                        if (missing.length > 0) {
                            setErrorMessage("Please fill in: " + missing.join(', '));
                            return [2 /*return*/];
                        }
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, 8, 9]);
                    setCheckingOut(true);
                    setErrorMessage(null);
                    return [4 /*yield*/, fetch('/api/checkout', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(__assign({ cartItems: cartItems.map(function (item) { return (__assign(__assign({ designId: item.design.id, quantity: item.quantity, purchaseType: item.purchaseType }, (item.purchaseType === 'POD' ? {
                                    podProductId: item.podProductId,
                                    podProductName: item.podProductName,
                                    podProvider: item.podProvider,
                                    podPrice: item.podPrice
                                } : {})), (item.priceTestVariant ? {
                                    variant: item.priceTestVariant,
                                    testPrice: item.priceTestPrice
                                } : {}))); }), paymentMethod: paymentMethod,
                                countryCode: countryCode }, (hasPOD ? { shippingAddress: shippingAddress } : {})))
                        })];
                case 2:
                    response = _b.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _b.sent();
                    if (data.url) {
                        window.location.href = data.url;
                    }
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, response.json()
                    // If Stripe is not activated, automatically try Paystack
                ];
                case 5:
                    error = _b.sent();
                    // If Stripe is not activated, automatically try Paystack
                    if (paymentMethod === 'stripe' && ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('Stripe not activated'))) {
                        setErrorMessage('Stripe not activated. Switching to Paystack...');
                        setPaymentMethod('paystack');
                        // Retry with Paystack after a brief delay
                        setTimeout(function () {
                            setErrorMessage(null);
                        }, 2000);
                        return [2 /*return*/];
                    }
                    setErrorMessage(error.message || 'Checkout failed. Please try again.');
                    _b.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    error_3 = _b.sent();
                    console.error('Checkout error:', error_3);
                    setErrorMessage('Checkout failed. Please try again.');
                    return [3 /*break*/, 9];
                case 8:
                    setCheckingOut(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var formatPrice = CurrencyProvider_1.useCurrency().formatPrice;
    var calculateTotal = function () {
        return cartItems.reduce(function (sum, item) {
            // Use the same logic as getItemPrice
            var itemPrice = getItemPrice(item);
            return sum + (itemPrice * item.quantity);
        }, 0);
    };
    // Check if cart has any POD items (requires shipping)
    var hasPODItems = cartItems.some(function (item) { return item.purchaseType === 'POD'; });
    var hasDigitalItems = cartItems.some(function (item) { return item.purchaseType !== 'POD'; });
    // Helper to get item price
    var getItemPrice = function (item) {
        // POD items use podPrice
        if (item.purchaseType === 'POD' && item.podPrice) {
            return item.podPrice;
        }
        // A/B test items use the stored test price
        if (item.priceTestVariant && item.priceTestPrice) {
            return item.priceTestPrice;
        }
        // Default to design price
        return item.design.price;
    };
    // Check if item has a test price (for display purposes)
    var hasTestPrice = function (item) {
        return item.priceTestVariant === 'B' && item.priceTestPrice && item.priceTestPrice !== item.design.price;
    };
    // Helper to get item type badge
    var getItemTypeBadge = function (item) {
        if (item.purchaseType === 'POD') {
            return (React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" },
                React.createElement(lucide_react_1.Package, { className: "h-3 w-3" }),
                "Physical Product"));
        }
        if (item.purchaseType === 'OWNERSHIP') {
            return (React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800" }, "Ownership Rights"));
        }
        return (React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" },
            React.createElement(lucide_react_1.Download, { className: "h-3 w-3" }),
            "Digital Download"));
    };
    // const calculatePlatformFee = (total: number) => {
    //   return total * 0.05 // 5% platform fee (deducted from sellers, not added to buyers)
    // }
    if (!session || errorMessage === 'Please sign in to view your cart.') {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "text-center" },
                React.createElement(lucide_react_1.ShoppingBag, { className: "h-16 w-16 text-gray-400 mx-auto mb-4" }),
                React.createElement("h1", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Sign In Required"),
                React.createElement("p", { className: "text-gray-600 mb-6" }, "Please sign in to view your cart"),
                React.createElement("button", { onClick: function () { return router.push('/api/auth/signin'); }, className: "bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700" }, "Sign In"))));
    }
    if (loading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" })));
    }
    var total = calculateTotal();
    // const platformFee = calculatePlatformFee(total)
    return (React.createElement("div", { className: "min-h-screen bg-gray-50 py-8" },
        React.createElement("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" },
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm" },
                React.createElement("div", { className: "px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200" },
                    React.createElement("h1", { className: "text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2" },
                        React.createElement(lucide_react_1.ShoppingBag, { className: "h-5 sm:h-6 w-5 sm:w-6" }),
                        React.createElement("span", null, "Shopping Cart"),
                        React.createElement("span", { className: "text-black" },
                            "(",
                            cartItems.length,
                            ")"))),
                errorMessage && (React.createElement("div", { className: "mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between" },
                    React.createElement("div", { className: "flex items-center" },
                        React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 text-red-600 mr-3" }),
                        React.createElement("span", { className: "text-red-800 font-medium" }, errorMessage)),
                    React.createElement("button", { onClick: function () { return setErrorMessage(null); }, className: "text-red-600 hover:text-red-800", "aria-label": "Close error message" },
                        React.createElement(lucide_react_1.X, { className: "h-4 w-4" })))),
                cartItems.length === 0 ? (React.createElement("div", { className: "p-12 text-center" },
                    React.createElement(lucide_react_1.ShoppingBag, { className: "h-16 w-16 text-gray-400 mx-auto mb-4" }),
                    React.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-2" }, "Your cart is empty"),
                    React.createElement("p", { className: "text-gray-600 mb-6" }, "Start shopping to add items to your cart"),
                    React.createElement(link_1["default"], { href: "/designs", className: "inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" },
                        "Browse Designs",
                        React.createElement(lucide_react_1.ArrowRight, { className: "ml-2 h-4 w-4" })))) : (React.createElement("div", { className: "p-4 sm:p-6" },
                    React.createElement("div", { className: "space-y-3 sm:space-y-4 mb-6 sm:mb-8" },
                        hasPODItems && (React.createElement("div", { className: "p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3" },
                            React.createElement(lucide_react_1.Truck, { className: "h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" }),
                            React.createElement("div", null,
                                React.createElement("p", { className: "text-sm font-medium text-orange-800" }, "Physical Products Require Shipping"),
                                React.createElement("p", { className: "text-sm text-orange-700 mt-1" }, "You have print-on-demand items in your cart. You'll need to provide a shipping address during checkout.")))),
                        cartItems.map(function (item) { return (React.createElement("div", { key: item.id, className: "flex items-start gap-2 p-2 sm:p-3 border rounded " + (item.purchaseType === 'POD'
                                ? 'border-orange-200 bg-orange-50/20'
                                : 'border-gray-200') },
                            React.createElement("div", { className: "w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 relative" },
                                React.createElement(image_1["default"], { src: item.design.thumbnailUrl || item.design.imageUrl, alt: item.design.title, width: 56, height: 56, className: "w-full h-full object-cover rounded" }),
                                item.purchaseType === 'POD' && (React.createElement("div", { className: "absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5" },
                                    React.createElement(lucide_react_1.Package, { className: "h-2.5 w-2.5" })))),
                            React.createElement("div", { className: "flex-1 min-w-0" },
                                React.createElement(link_1["default"], { href: "/designs/" + item.design.id },
                                    React.createElement("h3", { className: "font-semibold text-xs sm:text-sm text-gray-900 hover:text-indigo-600 truncate" }, item.design.title)),
                                item.purchaseType === 'POD' && item.podProductName && (React.createElement("p", { className: "text-[10px] sm:text-xs text-orange-700 font-medium truncate" },
                                    item.podProductName,
                                    item.podProvider && (React.createElement("span", { className: "text-orange-500 ml-1" },
                                        "via ",
                                        item.podProvider)))),
                                React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-600 truncate" },
                                    "by ",
                                    item.design.designer.name || 'Anonymous'),
                                React.createElement("div", { className: "flex items-center gap-1 mt-0.5" }, getItemTypeBadge(item)),
                                React.createElement("p", { className: "font-semibold text-xs sm:text-sm text-gray-900 mt-0.5" },
                                    formatPrice(getItemPrice(item)),
                                    hasTestPrice(item) && (React.createElement("span", { className: "ml-1 text-[9px] text-gray-400 line-through font-normal" }, formatPrice(item.design.price))))),
                            React.createElement("div", { className: "flex items-center gap-1 flex-shrink-0" },
                                item.purchaseType !== 'OWNERSHIP' && (React.createElement(React.Fragment, null,
                                    React.createElement("button", { onClick: function () { return updateQuantity(item.id, item.quantity - 1); }, disabled: updating === item.id, className: "p-0.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50", "aria-label": "Decrease quantity" },
                                        React.createElement(lucide_react_1.Minus, { className: "h-3 w-3" })),
                                    React.createElement("span", { className: "w-6 text-center text-xs font-medium text-black" }, item.quantity),
                                    React.createElement("button", { onClick: function () { return updateQuantity(item.id, item.quantity + 1); }, disabled: updating === item.id, className: "p-0.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50", "aria-label": "Increase quantity" },
                                        React.createElement(lucide_react_1.Plus, { className: "h-3 w-3" })))),
                                item.purchaseType === 'OWNERSHIP' && (React.createElement("span", { className: "text-[10px] text-gray-500" }, "Qty: 1"))),
                            React.createElement("div", { className: "text-right flex-shrink-0" },
                                React.createElement("p", { className: "font-semibold text-xs sm:text-sm text-gray-900" }, formatPrice(getItemPrice(item) * item.quantity)),
                                React.createElement("button", { onClick: function () { return removeFromCart(item.id); }, disabled: updating === item.id, className: "mt-1 text-red-600 hover:text-red-800 disabled:opacity-50", "aria-label": "Remove from cart" },
                                    React.createElement(lucide_react_1.Trash2, { className: "h-3 w-3" }))))); })),
                    React.createElement("div", { className: "border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4" },
                        React.createElement("div", { className: "bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4" },
                            React.createElement("h3", { className: "text-sm sm:text-base font-semibold text-black mb-2 sm:mb-3" }, "Order Summary"),
                            React.createElement("div", { className: "space-y-1" },
                                hasDigitalItems && (React.createElement("div", { className: "flex justify-between text-[11px] sm:text-xs" },
                                    React.createElement("span", { className: "text-gray-700 flex items-center gap-1" },
                                        React.createElement(lucide_react_1.Download, { className: "h-3 w-3" }),
                                        React.createElement("span", null, "Digital Items")),
                                    React.createElement("span", { className: "font-medium text-gray-900" }, formatPrice(cartItems
                                        .filter(function (item) { return item.purchaseType !== 'POD'; })
                                        .reduce(function (sum, item) { return sum + (getItemPrice(item) * item.quantity); }, 0))))),
                                hasPODItems && (React.createElement("div", { className: "flex justify-between text-[11px] sm:text-xs" },
                                    React.createElement("span", { className: "text-gray-700 flex items-center gap-1" },
                                        React.createElement(lucide_react_1.Package, { className: "h-3 w-3" }),
                                        React.createElement("span", null, "Physical Products")),
                                    React.createElement("span", { className: "font-medium text-gray-900" }, formatPrice(cartItems
                                        .filter(function (item) { return item.purchaseType === 'POD'; })
                                        .reduce(function (sum, item) { return sum + (getItemPrice(item) * item.quantity); }, 0))))),
                                hasPODItems && (React.createElement("div", { className: "flex justify-between text-[11px] sm:text-xs" },
                                    React.createElement("span", { className: "text-gray-700 flex items-center gap-1" },
                                        React.createElement(lucide_react_1.Truck, { className: "h-3 w-3" }),
                                        React.createElement("span", null, "Shipping")),
                                    React.createElement("span", { className: "text-gray-600 italic text-[10px] sm:text-[11px]" }, "Calculated at checkout"))),
                                React.createElement("div", { className: "flex justify-between text-[11px] sm:text-xs" },
                                    React.createElement("span", { className: "text-gray-700" }, "Items Total"),
                                    React.createElement("span", { className: "font-medium text-gray-900" }, formatPrice(total))),
                                React.createElement("div", { className: "border-t border-gray-200 pt-1.5 mt-1.5" },
                                    React.createElement("div", { className: "flex justify-between text-xs sm:text-sm" },
                                        React.createElement("span", { className: "font-semibold text-gray-900" }, "You Pay"),
                                        React.createElement("span", { className: "font-semibold text-gray-900" },
                                            formatPrice(total),
                                            hasPODItems && React.createElement("span", { className: "text-[10px] font-normal text-gray-500" }, " + shipping"))),
                                    React.createElement("div", { className: "text-[10px] sm:text-xs text-gray-500 mt-1 space-y-0.5" },
                                        React.createElement("p", null, "\u2022 No additional fees charged to you"),
                                        React.createElement("p", null, "\u2022 Platform takes 7-10% commission from sellers (first $100 free!)"),
                                        React.createElement("p", null, "\u2022 Higher volume sellers pay lower rates"),
                                        hasPODItems && (React.createElement("p", { className: "text-orange-600" }, "\u2022 Physical products will be printed and shipped to your address"))))),
                            React.createElement("div", { className: "mt-4 sm:mt-6 border-t border-gray-200 pt-4 sm:pt-6" },
                                React.createElement("h3", { className: "text-sm sm:text-base font-semibold text-black mb-3 sm:mb-4" }, "Payment Method"),
                                React.createElement("div", { className: "space-y-2" },
                                    React.createElement("label", { className: "flex items-start sm:items-center p-2 sm:p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition" },
                                        React.createElement("input", { type: "radio", name: "paymentMethod", value: "paystack", checked: paymentMethod === 'paystack', onChange: function (e) { return setPaymentMethod(e.target.value); }, className: "mr-2 sm:mr-3 mt-1 sm:mt-0 text-indigo-600" }),
                                        React.createElement("div", { className: "flex items-center flex-1 min-w-0" },
                                            React.createElement("span", { className: "text-lg sm:text-2xl mr-2 flex-shrink-0" }, "\uD83C\uDFE6"),
                                            React.createElement("div", { className: "min-w-0" },
                                                React.createElement("span", { className: "text-xs sm:text-sm font-medium text-gray-700 block" }, "Paystack"),
                                                React.createElement("p", { className: "text-xs text-gray-500" }, "Cards, Bank Transfer, USSD")))),
                                    React.createElement("label", { className: "flex items-start sm:items-center p-2 sm:p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition" },
                                        React.createElement("input", { type: "radio", name: "paymentMethod", value: "stripe", checked: paymentMethod === 'stripe', onChange: function (e) { return setPaymentMethod(e.target.value); }, className: "mr-2 sm:mr-3 mt-1 sm:mt-0 text-indigo-600" }),
                                        React.createElement("div", { className: "flex items-center flex-1 min-w-0" },
                                            React.createElement("span", { className: "text-lg sm:text-2xl mr-2 flex-shrink-0" }, "\uD83D\uDCB3"),
                                            React.createElement("div", { className: "min-w-0" },
                                                React.createElement("span", { className: "text-xs sm:text-sm font-medium text-gray-700 block" }, "Stripe"),
                                                React.createElement("p", { className: "text-xs text-gray-500" }, "International Cards")))))),
                            showShippingForm && hasPODItems && (React.createElement("div", { className: "mt-6 border-t border-gray-200 pt-4" },
                                React.createElement("h3", { className: "text-sm font-medium text-gray-900 mb-3 flex items-center gap-2" },
                                    React.createElement(lucide_react_1.Truck, { className: "h-4 w-4" }),
                                    "Shipping Address"),
                                React.createElement("p", { className: "text-xs text-gray-500 mb-4" }, "Required for physical products. Your items will be printed and shipped to this address."),
                                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("input", { type: "text", placeholder: "Full Name *", value: shippingAddress.fullName, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { fullName: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })),
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("input", { type: "text", placeholder: "Address Line 1 *", value: shippingAddress.addressLine1, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { addressLine1: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })),
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("input", { type: "text", placeholder: "Address Line 2 (Optional)", value: shippingAddress.addressLine2, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { addressLine2: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })),
                                    React.createElement("input", { type: "text", placeholder: "City *", value: shippingAddress.city, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { city: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" }),
                                    React.createElement("input", { type: "text", placeholder: "State/Province *", value: shippingAddress.state, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { state: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" }),
                                    React.createElement("input", { type: "text", placeholder: "Postal Code *", value: shippingAddress.postalCode, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { postalCode: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" }),
                                    React.createElement("select", { value: shippingAddress.country, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { country: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm", "aria-label": "Select shipping country" },
                                        React.createElement("option", { value: "NG" }, "\uD83C\uDDF3\uD83C\uDDEC Nigeria"),
                                        React.createElement("option", { value: "GH" }, "\uD83C\uDDEC\uD83C\uDDED Ghana"),
                                        React.createElement("option", { value: "KE" }, "\uD83C\uDDF0\uD83C\uDDEA Kenya"),
                                        React.createElement("option", { value: "ZA" }, "\uD83C\uDDFF\uD83C\uDDE6 South Africa"),
                                        React.createElement("option", { value: "US" }, "\uD83C\uDDFA\uD83C\uDDF8 United States"),
                                        React.createElement("option", { value: "GB" }, "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom"),
                                        React.createElement("option", { value: "CA" }, "\uD83C\uDDE8\uD83C\uDDE6 Canada"),
                                        React.createElement("option", { value: "AU" }, "\uD83C\uDDE6\uD83C\uDDFA Australia"),
                                        React.createElement("option", { value: "DE" }, "\uD83C\uDDE9\uD83C\uDDEA Germany"),
                                        React.createElement("option", { value: "FR" }, "\uD83C\uDDEB\uD83C\uDDF7 France")),
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("input", { type: "tel", placeholder: "Phone Number *", value: shippingAddress.phone, onChange: function (e) { return setShippingAddress(__assign(__assign({}, shippingAddress), { phone: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" }))))),
                            React.createElement("button", { onClick: handleCheckout, disabled: checkingOut, className: "w-full mt-4 sm:mt-6 bg-indigo-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base" }, checkingOut ? (React.createElement(React.Fragment, null,
                                React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" }),
                                "Processing...")) : hasPODItems && !showShippingForm ? (React.createElement(React.Fragment, null,
                                "Enter Shipping Address",
                                React.createElement(lucide_react_1.Truck, { className: "h-4 w-4" }))) : (React.createElement(React.Fragment, null,
                                "Proceed to Checkout",
                                React.createElement(lucide_react_1.ArrowRight, { className: "h-4 w-4" }))))))))))));
}
exports["default"] = CartPage;
