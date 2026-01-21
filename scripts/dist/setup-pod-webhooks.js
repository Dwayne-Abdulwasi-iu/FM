"use strict";
/**
 * POD Webhook Setup Script
 *
 * Run with: npx tsx scripts/setup-pod-webhooks.ts
 *
 * This script registers webhooks with Printful and Printify
 * and outputs the secrets to add to your .env file.
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
var crypto_1 = require("crypto");
var dotenv_1 = require("dotenv");
// Load environment variables
dotenv_1.config();
// Force production URL for webhook registration
var BASE_URL = 'https://fm-wtit.onrender.com';
function setupPrintfulWebhook() {
    var _a, _b;
    return __awaiter(this, void 0, Promise, function () {
        var apiKey, existingResponse, existingData, _existingWebhooks, existingUrl, secret, webhookUrl, response, error, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    apiKey = process.env.PRINTFUL_API_KEY;
                    if (!apiKey) {
                        return [2 /*return*/, { success: false, error: 'PRINTFUL_API_KEY not set' }];
                    }
                    console.log('\n📦 Setting up Printful webhook...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, fetch('https://api.printful.com/webhooks', {
                            method: 'GET',
                            headers: { 'Authorization': "Bearer " + apiKey }
                        })];
                case 2:
                    existingResponse = _c.sent();
                    if (!existingResponse.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, existingResponse.json()];
                case 3:
                    existingData = _c.sent();
                    _existingWebhooks = ((_a = existingData.result) === null || _a === void 0 ? void 0 : _a.types) || [];
                    existingUrl = (_b = existingData.result) === null || _b === void 0 ? void 0 : _b.url;
                    if (!existingUrl) return [3 /*break*/, 5];
                    console.log("   Removing old webhook: " + existingUrl);
                    return [4 /*yield*/, fetch('https://api.printful.com/webhooks', {
                            method: 'DELETE',
                            headers: {
                                'Authorization': "Bearer " + apiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ url: existingUrl })
                        })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    secret = crypto_1["default"].randomBytes(32).toString('hex');
                    webhookUrl = BASE_URL + "/api/webhooks/printful";
                    console.log("   Registering webhook: " + webhookUrl);
                    return [4 /*yield*/, fetch('https://api.printful.com/webhooks', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer " + apiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                url: webhookUrl,
                                types: [
                                    'package_shipped',
                                    'package_returned',
                                    'order_created',
                                    'order_updated',
                                    'order_failed',
                                    'order_canceled'
                                ]
                            })
                        })];
                case 6:
                    response = _c.sent();
                    if (!response.ok) return [3 /*break*/, 7];
                    console.log('   ✅ Printful webhook registered successfully!');
                    return [2 /*return*/, { success: true, secret: secret }];
                case 7: return [4 /*yield*/, response.json()["catch"](function () { return ({}); })];
                case 8:
                    error = _c.sent();
                    console.log('   ❌ Printful registration failed:', error);
                    return [2 /*return*/, { success: false, error: JSON.stringify(error) }];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_1 = _c.sent();
                    console.log('   ❌ Error:', error_1);
                    return [2 /*return*/, { success: false, error: String(error_1) }];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function setupPrintifyWebhook() {
    return __awaiter(this, void 0, Promise, function () {
        var apiKey, shopId, existingResponse, existingWebhooks, _i, existingWebhooks_1, webhook, secret, webhookUrl, topics, successCount, _a, topics_1, topic, response, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    apiKey = process.env.PRINTIFY_API_KEY;
                    shopId = process.env.PRINTIFY_SHOP_ID;
                    if (!apiKey || !shopId) {
                        return [2 /*return*/, { success: false, error: 'PRINTIFY_API_KEY or PRINTIFY_SHOP_ID not set' }];
                    }
                    console.log('\n🖨️  Setting up Printify webhook...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 14, , 15]);
                    return [4 /*yield*/, fetch("https://api.printify.com/v1/shops/" + shopId + "/webhooks.json", {
                            method: 'GET',
                            headers: { 'Authorization': "Bearer " + apiKey }
                        })];
                case 2:
                    existingResponse = _b.sent();
                    if (!existingResponse.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, existingResponse.json()];
                case 3:
                    existingWebhooks = _b.sent();
                    _i = 0, existingWebhooks_1 = existingWebhooks;
                    _b.label = 4;
                case 4:
                    if (!(_i < existingWebhooks_1.length)) return [3 /*break*/, 7];
                    webhook = existingWebhooks_1[_i];
                    if (!webhook.id) return [3 /*break*/, 6];
                    console.log("   Removing old webhook: " + webhook.topic + " - " + webhook.url);
                    return [4 /*yield*/, fetch("https://api.printify.com/v1/shops/" + shopId + "/webhooks/" + webhook.id + ".json", {
                            method: 'DELETE',
                            headers: { 'Authorization': "Bearer " + apiKey }
                        })];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    secret = crypto_1["default"].randomBytes(32).toString('hex');
                    webhookUrl = BASE_URL + "/api/webhooks/printify";
                    topics = [
                        'order:created',
                        'order:updated',
                        'order:shipped',
                        'order:send-to-production',
                        'order:canceled',
                        'order:delivery:completed',
                        'order:delivery:failed' // For failed deliveries
                    ];
                    console.log("   Registering webhooks for " + topics.length + " event types...");
                    successCount = 0;
                    _a = 0, topics_1 = topics;
                    _b.label = 8;
                case 8:
                    if (!(_a < topics_1.length)) return [3 /*break*/, 13];
                    topic = topics_1[_a];
                    return [4 /*yield*/, fetch("https://api.printify.com/v1/shops/" + shopId + "/webhooks.json", {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer " + apiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                topic: topic,
                                url: webhookUrl,
                                secret: secret
                            })
                        })];
                case 9:
                    response = _b.sent();
                    if (!response.ok) return [3 /*break*/, 10];
                    successCount++;
                    console.log("   \u2705 " + topic);
                    return [3 /*break*/, 12];
                case 10: return [4 /*yield*/, response.json()["catch"](function () { return ({}); })];
                case 11:
                    error = _b.sent();
                    console.log("   \u274C " + topic + ": " + JSON.stringify(error));
                    _b.label = 12;
                case 12:
                    _a++;
                    return [3 /*break*/, 8];
                case 13:
                    if (successCount > 0) {
                        console.log("   \u2705 Printify webhooks registered (" + successCount + "/" + topics.length + ")!");
                        return [2 /*return*/, { success: true, secret: secret }];
                    }
                    else {
                        return [2 /*return*/, { success: false, error: 'No webhooks registered' }];
                    }
                    return [3 /*break*/, 15];
                case 14:
                    error_2 = _b.sent();
                    console.log('   ❌ Error:', error_2);
                    return [2 /*return*/, { success: false, error: String(error_2) }];
                case 15: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var printfulResult, printifyResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🔧 POD Webhook Setup Script');
                    console.log('============================');
                    console.log("Base URL: " + BASE_URL);
                    return [4 /*yield*/, setupPrintfulWebhook()];
                case 1:
                    printfulResult = _a.sent();
                    return [4 /*yield*/, setupPrintifyWebhook()];
                case 2:
                    printifyResult = _a.sent();
                    console.log('\n============================');
                    console.log('📋 RESULTS');
                    console.log('============================\n');
                    if (printfulResult.success || printifyResult.success) {
                        console.log('Add these to your .env file:\n');
                        if (printfulResult.success && printfulResult.secret) {
                            console.log("PRINTFUL_WEBHOOK_SECRET=" + printfulResult.secret);
                        }
                        if (printifyResult.success && printifyResult.secret) {
                            console.log("PRINTIFY_WEBHOOK_SECRET=" + printifyResult.secret);
                        }
                        console.log('\n');
                    }
                    if (!printfulResult.success) {
                        console.log("\u274C Printful: " + printfulResult.error);
                    }
                    if (!printifyResult.success) {
                        console.log("\u274C Printify: " + printifyResult.error);
                    }
                    // Return secrets for programmatic use
                    return [2 /*return*/, {
                            printful: printfulResult,
                            printify: printifyResult
                        }];
            }
        });
    });
}
main()["catch"](console.error);
