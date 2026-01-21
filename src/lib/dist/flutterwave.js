"use strict";
/**
 * Flutterwave Integration
 *
 * Pan-African payment gateway supporting:
 * - Card payments (Visa, Mastercard)
 * - Mobile money (MTN, Airtel, Vodafone)
 * - Bank transfers
 * - USSD
 *
 * Target markets: Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda, Rwanda, etc.
 */
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
exports.getSupportedCountries = exports.verifyWebhookSignature = exports.chargeMobileMoney = exports.getBanks = exports.initiateTransfer = exports.verifyTransactionByRef = exports.verifyTransaction = exports.initializePayment = exports.getFlutterwavePublicKey = exports.isFlutterwaveConfigured = void 0;
var axios_1 = require("axios");
var FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
var FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
// Encryption key for card data - used in payment tokenization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var _FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || '';
var BASE_URL = 'https://api.flutterwave.com/v3';
function isFlutterwaveConfigured() {
    return !!FLUTTERWAVE_SECRET_KEY;
}
exports.isFlutterwaveConfigured = isFlutterwaveConfigured;
function getFlutterwavePublicKey() {
    return FLUTTERWAVE_PUBLIC_KEY || null;
}
exports.getFlutterwavePublicKey = getFlutterwavePublicKey;
/**
 * Initialize a standard payment (redirects to Flutterwave checkout)
 */
function initializePayment(request) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, Promise, function () {
        var response, error_1, axiosError, status, responseData, responseStr, ipMatch, ipFromError;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 3, , 4]);
                    console.log('[Flutterwave] Initializing payment for order:', request.orderId);
                    return [4 /*yield*/, axios_1["default"].post(BASE_URL + "/payments", {
                            tx_ref: request.orderId,
                            amount: request.amount,
                            currency: request.currency,
                            redirect_url: request.redirectUrl,
                            payment_options: request.paymentOptions || 'card,mobilemoney,ussd,bank_transfer',
                            customer: {
                                email: request.email,
                                name: request.name,
                                phonenumber: request.phone
                            },
                            customizations: {
                                title: ((_a = request.customizations) === null || _a === void 0 ? void 0 : _a.title) || 'Fashion Marketplace',
                                description: ((_b = request.customizations) === null || _b === void 0 ? void 0 : _b.description) || "Payment for order " + request.orderId,
                                logo: ((_c = request.customizations) === null || _c === void 0 ? void 0 : _c.logo) || process.env.NEXTAUTH_URL + "/logo.png"
                            },
                            meta: request.meta
                        }, {
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY,
                                'Content-Type': 'application/json',
                                'User-Agent': 'Fashion-Marketplace/1.0'
                            },
                            timeout: 10000
                        })];
                case 2:
                    response = _g.sent();
                    console.log('[Flutterwave] Payment initialization successful:', (_d = response.data.data) === null || _d === void 0 ? void 0 : _d.link);
                    return [2 /*return*/, response.data];
                case 3:
                    error_1 = _g.sent();
                    axiosError = error_1;
                    status = (_e = axiosError.response) === null || _e === void 0 ? void 0 : _e.status;
                    responseData = (_f = axiosError.response) === null || _f === void 0 ? void 0 : _f.data;
                    responseStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
                    console.error('[Flutterwave] ❌ FULL ERROR RESPONSE:');
                    console.error('[Flutterwave] Status:', status);
                    console.error('[Flutterwave] Response Body:', responseStr === null || responseStr === void 0 ? void 0 : responseStr.substring(0, 500));
                    ipMatch = responseStr === null || responseStr === void 0 ? void 0 : responseStr.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
                    ipFromError = ipMatch ? ipMatch[1] : null;
                    if (status === 403) {
                        console.error('[Flutterwave] 403 Forbidden');
                        if (ipFromError) {
                            console.error("[Flutterwave] \u26A0\uFE0F  IP may be blocked: " + ipFromError);
                        }
                        else {
                            console.error('[Flutterwave] ⚠️  Check: Account status, Payment method restrictions, Webhook config');
                        }
                    }
                    else if (status === 401) {
                        console.error('[Flutterwave] 401 Unauthorized - Likely invalid API key');
                    }
                    else if (status === 429) {
                        console.error('[Flutterwave] 429 Too Many Requests - Rate limited');
                    }
                    else if ((responseStr === null || responseStr === void 0 ? void 0 : responseStr.includes('Cloudflare')) || (responseStr === null || responseStr === void 0 ? void 0 : responseStr.includes('blocked'))) {
                        console.error('[Flutterwave] Cloudflare blocked request');
                        if (ipFromError) {
                            console.error("[Flutterwave] \u26A0\uFE0F  YOUR CURRENT IP: " + ipFromError);
                        }
                    }
                    throw new Error("Flutterwave payment failed (" + status + "): Check server logs for details");
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.initializePayment = initializePayment;
/**
 * Verify a transaction by reference
 */
function verifyTransaction(transactionId) {
    var _a, _b;
    return __awaiter(this, void 0, Promise, function () {
        var response, error_2, axiosError, status;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(BASE_URL + "/transactions/" + transactionId + "/verify", {
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY,
                                'User-Agent': 'Fashion-Marketplace/1.0'
                            },
                            timeout: 10000
                        })];
                case 2:
                    response = _c.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_2 = _c.sent();
                    axiosError = error_2;
                    status = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status;
                    if (status === 403) {
                        console.error('[Flutterwave] 403 Forbidden - IP may be blocked');
                    }
                    else if (status === 401) {
                        console.error('[Flutterwave] 401 Unauthorized - Invalid API key');
                    }
                    else {
                        console.error('[Flutterwave] Verification error (Status: ' + status + '):', error_2);
                    }
                    throw new Error("Flutterwave verification failed: " + JSON.stringify(((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data) || error_2));
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.verifyTransaction = verifyTransaction;
/**
 * Verify transaction by tx_ref (your order ID)
 */
function verifyTransactionByRef(txRef) {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var response, error_3, axiosError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(BASE_URL + "/transactions", {
                            params: { tx_ref: txRef },
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY
                            }
                        })];
                case 2:
                    response = _b.sent();
                    if (response.data.data && response.data.data.length > 0) {
                        return [2 /*return*/, {
                                status: 'success',
                                message: 'Transaction found',
                                data: response.data.data[0]
                            }];
                    }
                    throw new Error('Transaction not found');
                case 3:
                    error_3 = _b.sent();
                    console.error('Flutterwave ref verification error:', error_3);
                    axiosError = error_3;
                    throw new Error("Flutterwave verification failed: " + JSON.stringify(((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || error_3));
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.verifyTransactionByRef = verifyTransactionByRef;
/**
 * Initiate a bank transfer (for seller payouts)
 */
function initiateTransfer(request) {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var response, error_4, axiosError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].post(BASE_URL + "/transfers", {
                            account_bank: request.bankCode,
                            account_number: request.accountNumber,
                            amount: request.amount,
                            currency: request.currency,
                            narration: request.narration,
                            reference: request.reference,
                            beneficiary_name: request.beneficiaryName,
                            meta: request.meta
                        }, {
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_4 = _b.sent();
                    console.error('Flutterwave transfer error:', error_4);
                    axiosError = error_4;
                    throw new Error("Flutterwave transfer failed: " + JSON.stringify(((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || error_4));
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.initiateTransfer = initiateTransfer;
/**
 * Get list of banks by country
 */
function getBanks(country) {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var response, error_5, axiosError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(BASE_URL + "/banks/" + country, {
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY
                            }
                        })];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_5 = _b.sent();
                    console.error('Flutterwave banks error:', error_5);
                    axiosError = error_5;
                    throw new Error("Flutterwave banks fetch failed: " + JSON.stringify(((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || error_5));
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getBanks = getBanks;
/**
 * Charge mobile money directly (Ghana, Kenya, Uganda, Rwanda, Zambia, Tanzania)
 */
function chargeMobileMoney(request) {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var endpoints, endpoint, response, error_6, axiosError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!isFlutterwaveConfigured()) {
                        throw new Error('Flutterwave is not configured');
                    }
                    endpoints = {
                        GHS: 'charges?type=mobile_money_ghana',
                        KES: 'charges?type=mpesa',
                        UGX: 'charges?type=mobile_money_uganda',
                        RWF: 'charges?type=mobile_money_rwanda',
                        ZMW: 'charges?type=mobile_money_zambia',
                        TZS: 'charges?type=mobile_money_tanzania',
                        XOF: 'charges?type=mobile_money_franco',
                        XAF: 'charges?type=mobile_money_franco'
                    };
                    endpoint = endpoints[request.currency];
                    if (!endpoint) {
                        throw new Error("Unsupported mobile money currency: " + request.currency);
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].post(BASE_URL + "/" + endpoint, {
                            tx_ref: request.orderId,
                            amount: request.amount,
                            currency: request.currency,
                            email: request.email,
                            phone_number: request.phoneNumber,
                            network: request.network,
                            redirect_url: request.redirectUrl
                        }, {
                            headers: {
                                Authorization: "Bearer " + FLUTTERWAVE_SECRET_KEY,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_6 = _b.sent();
                    console.error('Flutterwave mobile money error:', error_6);
                    axiosError = error_6;
                    throw new Error("Flutterwave mobile money failed: " + JSON.stringify(((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || error_6));
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.chargeMobileMoney = chargeMobileMoney;
/**
 * Verify webhook signature
 */
function verifyWebhookSignature(signature, secretHash) {
    return signature === secretHash;
}
exports.verifyWebhookSignature = verifyWebhookSignature;
/**
 * Get supported countries and their currencies
 */
function getSupportedCountries() {
    return [
        { code: 'NG', name: 'Nigeria', currency: 'NGN', methods: ['card', 'bank_transfer', 'ussd'] },
        { code: 'GH', name: 'Ghana', currency: 'GHS', methods: ['card', 'mobile_money'] },
        { code: 'KE', name: 'Kenya', currency: 'KES', methods: ['card', 'mpesa'] },
        { code: 'ZA', name: 'South Africa', currency: 'ZAR', methods: ['card'] },
        { code: 'TZ', name: 'Tanzania', currency: 'TZS', methods: ['card', 'mobile_money'] },
        { code: 'UG', name: 'Uganda', currency: 'UGX', methods: ['card', 'mobile_money'] },
        { code: 'RW', name: 'Rwanda', currency: 'RWF', methods: ['card', 'mobile_money'] },
        { code: 'ZM', name: 'Zambia', currency: 'ZMW', methods: ['card', 'mobile_money'] },
        { code: 'CM', name: 'Cameroon', currency: 'XAF', methods: ['mobile_money'] },
        { code: 'CI', name: 'Ivory Coast', currency: 'XOF', methods: ['mobile_money'] },
        { code: 'SN', name: 'Senegal', currency: 'XOF', methods: ['mobile_money'] },
    ];
}
exports.getSupportedCountries = getSupportedCountries;
