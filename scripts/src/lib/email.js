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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailConfigured = exports.isSMTPConfigured = exports.isSendGridConfigured = void 0;
/**
 * Email Service for Fashion Marketplace Notifications
 *
 * This service handles sending email notifications for various events.
 * Supports both SendGrid API and SMTP (Nodemailer) - SendGrid takes priority.
 *
 * NOTE: This is a server-only module. Import only in server components and API routes.
 */
// Import and re-export sync config functions
var email_config_1 = require("@/lib/email-config");
Object.defineProperty(exports, "isSendGridConfigured", { enumerable: true, get: function () { return email_config_1.isSendGridConfigured; } });
Object.defineProperty(exports, "isSMTPConfigured", { enumerable: true, get: function () { return email_config_1.isSMTPConfigured; } });
Object.defineProperty(exports, "isEmailConfigured", { enumerable: true, get: function () { return email_config_1.isEmailConfigured; } });
var email_config_2 = require("@/lib/email-config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
var nodemailer = require('nodemailer');
var transportCache = {};
function getSmtpConfig() {
    var host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
    var port = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587';
    var user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
    var pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
    var secure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    return {
        host: host,
        port: parseInt(port, 10),
        user: user,
        pass: pass,
        secure: secure,
    };
    function getProviderTransport(name) {
        if (transportCache[name]) {
            return transportCache[name] || null;
        }
        if (name === 'smtp' && (0, email_config_2.isSMTPConfigured)()) {
            var smtp = getSmtpConfig();
            var t = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: {
                    user: smtp.user,
                    pass: smtp.pass,
                },
            });
            transportCache.smtp = t;
            return t;
        }
        return null;
    }
    function getAvailableTransports() {
        var transports = [];
        var smtp = getProviderTransport('smtp');
        if (smtp) {
            transports.push({ name: 'smtp', transport: smtp });
        }
        return transports;
    }
    var FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@fashionmarketplace.com';
    var APP_NAME = 'Fashion Marketplace';
    var BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    export function sendEmail(options) {
        return __awaiter(this, void 0, void 0, function () {
            var transports, _i, transports_1, _a, name_1, transport, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        transports = getAvailableTransports();
                        if (!transports.length) {
                            console.log("[Email - NOT SENT] To: ".concat(options.to, ", Subject: ").concat(options.subject));
                            console.log("[Email] Configure SENDGRID_API_KEY or SMTP_HOST/PORT/USER/PASS (or EMAIL_SERVER_*) to enable email");
                            return [2 /*return*/, false];
                        }
                        _i = 0, transports_1 = transports;
                        _b.label = 1;
                    case 1:
                        if (!(_i < transports_1.length)) return [3 /*break*/, 6];
                        _a = transports_1[_i], name_1 = _a.name, transport = _a.transport;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, transport.sendMail({
                                from: "\"".concat(APP_NAME, "\" <").concat(FROM_EMAIL, ">"),
                                to: options.to,
                                subject: options.subject,
                                html: options.html,
                                text: options.text,
                            })];
                    case 3:
                        _b.sent();
                        console.log("[Email - SENT via SMTP] To: ".concat(options.to, ", Subject: ").concat(options.subject));
                        return [2 /*return*/, true];
                    case 4:
                        error_1 = _b.sent();
                        console.error("[Email - ERROR via SMTP] Failed to send to ".concat(options.to, ":"), error_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, false];
                }
            });
        });
    }
    // Helper to ensure email is defined
    function getEmail(email, fallback) {
        return email || fallback;
    }
    /**
     * Notify admin when a new commission request is submitted
     */
    export function sendNewRequestToAdmin(data) {
        return __awaiter(this, void 0, void 0, function () {
            var adminEmail, subject, content;
            return __generator(this, function (_a) {
                adminEmail = process.env.ADMIN_EMAIL;
                if (!adminEmail) {
                    console.log('[Email] ADMIN_EMAIL not configured, skipping admin notification');
                    return [2 /*return*/, false];
                }
                subject = "New Commission Request: ".concat(data.title);
                content = "\n    <h2>New Commission Request</h2>\n    <p>A new commission request has been submitted and needs your review.</p>\n    <h3>Request Details</h3>\n    <ul>\n      <li><strong>Title:</strong> ".concat(data.title, "</li>\n      <li><strong>From:</strong> ").concat(data.requesterName, " (").concat(data.requesterEmail, ")</li>\n      <li><strong>For Designer:</strong> ").concat(data.designerName, "</li>\n    </ul>\n    <p>\n      <a href=\"").concat(BASE_URL, "/admin/commission-requests\" class=\"cta-btn\">Review Request</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: adminEmail,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify designer when admin forwards a request to them
     */
    export function sendRequestForwardedToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "New Commission Request: ".concat(data.title);
                content = "\n    <h2>You Have a New Commission Request!</h2>\n    <p>Hello ".concat(data.designerName, ",</p>\n    <p>A client is interested in commissioning custom work from you.</p>\n    <h3>Request Details</h3>\n    <ul>\n      <li><strong>Title:</strong> ").concat(data.title, "</li>\n      <li><strong>Client:</strong> ").concat(data.requesterName, "</li>\n    </ul>\n    <p>Please review the request and provide a quote or response.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/seller/commission-requests\" class=\"cta-btn\">View Requests</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify client when designer sends a quote
     */
    export function sendQuoteToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            var _a;
            return __generator(this, function (_b) {
                subject = "Quote Received for: ".concat(data.title);
                content = "\n    <h2>You've Received a Quote!</h2>\n    <p>Hello ".concat(data.requesterName, ",</p>\n    <p>").concat(data.designerName, " has provided a quote for your commission request.</p>\n    <h3>Quote Details</h3>\n    <ul>\n      <li><strong>Price:</strong> $").concat((_a = data.quote) === null || _a === void 0 ? void 0 : _a.toLocaleString(), "</li>\n      ").concat(data.deadline ? "<li><strong>Estimated Delivery:</strong> ".concat(data.deadline, "</li>") : '', "\n      ").concat(data.message ? "<li><strong>Message:</strong> ".concat(data.message, "</li>") : '', "\n    </ul>\n    <p>If you're happy with the quote, proceed to payment to start the work.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/commission-payment/").concat(data.requestId, "\" class=\"cta-btn\" style=\"background:#10B981;\">Pay Now</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: getEmail(data.requesterEmail, data.designerEmail),
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify client when designer rejects their request
     */
    export function sendRejectionToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Commission Request Update: ".concat(data.title);
                content = "\n    <h2>Commission Request Update</h2>\n    <p>Hello ".concat(data.requesterName, ",</p>\n    <p>Unfortunately, ").concat(data.designerName, " is unable to accept your commission request at this time.</p>\n    ").concat(data.message ? "<p><strong>Reason:</strong> ".concat(data.message, "</p>") : '', "\n    <p>Don't worry! There are many talented designers on our platform. Browse our designers to find another match.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/designers\" class=\"cta-btn\">Browse Designers</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: getEmail(data.requesterEmail, data.designerEmail),
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify designer when payment is received
     */
    export function sendPaymentReceivedToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Payment Received - Start Work: ".concat(data.title);
                content = "\n    <h2>Payment Received! \uD83C\uDF89</h2>\n    <p>Hello ".concat(data.designerName, ",</p>\n    <p>Great news! ").concat(data.requesterName, " has paid for the commission \"").concat(data.title, "\".</p>\n    <p>You can now start working on the commission. Once completed, upload your deliverables.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/seller/commission-requests\" class=\"cta-btn\">Start Working</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify client when designer starts work
     */
    export function sendWorkStartedToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Work Started: ".concat(data.title);
                content = "\n    <h2>Work Has Started!</h2>\n    <p>Hello ".concat(data.requesterName, ",</p>\n    <p>").concat(data.designerName, " has started working on your commission \"").concat(data.title, "\".</p>\n    ").concat(data.deadline ? "<p><strong>Expected Delivery:</strong> ".concat(data.deadline, "</p>") : '', "\n    <p>You'll be notified when the work is ready for your review.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/my-commissions\" class=\"cta-btn\">Track Progress</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: getEmail(data.requesterEmail, data.designerEmail),
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify client when deliverables are ready for review
     */
    export function sendDeliverablesReadyToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Deliverables Ready: ".concat(data.title);
                content = "\n    <h2>Your Commission is Ready for Review! \uD83C\uDFA8</h2>\n    <p>Hello ".concat(data.requesterName, ",</p>\n    <p>").concat(data.designerName, " has completed work on \"").concat(data.title, "\" and uploaded the deliverables for your review.</p>\n    <p>Please review the work and either approve it or request revisions.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/my-commissions\" class=\"cta-btn\" style=\"background:#10B981;\">Review Deliverables</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: getEmail(data.requesterEmail, data.designerEmail),
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify designer when client requests revisions
     */
    export function sendRevisionRequestToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Revision Requested: ".concat(data.title);
                content = "\n    <h2>Revision Requested</h2>\n    <p>Hello ".concat(data.designerName, ",</p>\n    <p>").concat(data.requesterName, " has requested revisions for \"").concat(data.title, "\".</p>\n    ").concat(data.message ? "<p><strong>Feedback:</strong> ".concat(data.message, "</p>") : '', "\n    <p>Please review the feedback and upload updated deliverables.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/seller/commission-requests\" class=\"cta-btn\">View Request</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify designer when client approves and commission is complete
     */
    export function sendApprovalToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Commission Approved! ".concat(data.title);
                content = "\n    <h2>Commission Approved! \uD83C\uDF89</h2>\n    <p>Hello ".concat(data.designerName, ",</p>\n    <p>Congratulations! ").concat(data.requesterName, " has approved your work on \"").concat(data.title, "\".</p>\n    <p>Your earnings will be transferred to your account according to our payment schedule.</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/seller/dashboard\" class=\"cta-btn\" style=\"background:#10B981;\">View Dashboard</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify client that commission is complete
     */
    export function sendCompletionToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, content;
            return __generator(this, function (_a) {
                subject = "Commission Complete: ".concat(data.title);
                content = "\n    <h2>Commission Complete! \uD83C\uDFA8</h2>\n    <p>Hello ".concat(data.requesterName, ",</p>\n    <p>Your commission \"").concat(data.title, "\" is now complete!</p>\n    <p>We hope you love your custom design. Please consider leaving a review for ").concat(data.designerName, ".</p>\n    <p>\n      <a href=\"").concat(BASE_URL, "/my-commissions\" class=\"cta-btn\">Leave a Review</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: getEmail(data.requesterEmail, data.designerEmail),
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Notify admin about a dispute
     */
    export function sendDisputeToAdmin(data) {
        return __awaiter(this, void 0, void 0, function () {
            var adminEmail;
            return __generator(this, function (_a) {
                adminEmail = process.env.ADMIN_EMAIL;
                if (!adminEmail)
                    return [2 /*return*/, false];
                return [2 /*return*/, sendEmail({
                        to: adminEmail,
                        subject: "\u26A0\uFE0F Dispute Filed: ".concat(data.title),
                        html: "\n      <h2>Dispute Filed</h2>\n      <p>A dispute has been filed for commission \"".concat(data.title, "\".</p>\n      \n      <h3>Details</h3>\n      <ul>\n        <li><strong>Client:</strong> ").concat(data.requesterName, " (").concat(data.requesterEmail, ")</li>\n        <li><strong>Designer:</strong> ").concat(data.designerName, " (").concat(data.designerEmail, ")</li>\n        <li><strong>Reason:</strong> ").concat(data.disputeReason, "</li>\n      </ul>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/admin/commission-requests\" style=\"display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px;\">\n          Review Dispute\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    // ============================================
    // Commission Monitoring Email Templates
    // ============================================
    /**
     * Warn designer about approaching deadline
     */
    export function sendDeadlineWarningToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: "\u23F0 Deadline Approaching: ".concat(data.title),
                        html: "\n      <h2>Deadline Approaching!</h2>\n      <p>Hello ".concat(data.designerName, ",</p>\n      <p>Your commission \"<strong>").concat(data.title, "</strong>\" is due in <strong>").concat(data.daysRemaining, " day").concat(data.daysRemaining > 1 ? 's' : '', "</strong>.</p>\n      \n      <p>Please make sure to deliver the work on time to maintain your reputation and avoid disputes.</p>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/seller/commission-requests\" style=\"display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px;\">\n          View Commission\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 12px;\">\n        If you need more time, please communicate with your client to request a deadline extension.\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client that deadline has passed
     */
    export function sendDeadlinePassedToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.requesterEmail,
                        subject: "\u26A0\uFE0F Commission Overdue: ".concat(data.title),
                        html: "\n      <h2>Commission Deadline Passed</h2>\n      <p>Hello ".concat(data.requesterName, ",</p>\n      <p>The deadline for your commission \"<strong>").concat(data.title, "</strong>\" has passed. It is now <strong>").concat(data.daysOverdue, " day").concat(data.daysOverdue > 1 ? 's' : '', "</strong> overdue.</p>\n      \n      <p>Designer ").concat(data.designerName, " should deliver your work soon. If you'd like to:</p>\n      <ul>\n        <li>Contact the designer to check on progress</li>\n        <li>File a dispute if you're unsatisfied with the delay</li>\n      </ul>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/my-commissions\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View Commission\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Warn client about upcoming auto-release
     */
    export function sendAutoReleaseWarningToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.requesterEmail,
                        subject: "\u23F0 Action Required: Confirm Delivery for ".concat(data.title),
                        html: "\n      <h2>Please Confirm Your Delivery</h2>\n      <p>Hello ".concat(data.requesterName, ",</p>\n      <p>Your commission \"<strong>").concat(data.title, "</strong>\" was delivered and is awaiting your confirmation.</p>\n      \n      <p style=\"background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;\">\n        <strong>\u26A0\uFE0F Important:</strong> If you don't respond within <strong>").concat(data.daysRemaining, " day").concat(data.daysRemaining > 1 ? 's' : '', "</strong>, \n        the commission will be automatically marked as complete and payment will be released to the designer.\n      </p>\n      \n      <p>Please review the delivered work and either:</p>\n      <ul>\n        <li>\u2705 <strong>Approve</strong> - If you're satisfied with the work</li>\n        <li>\uD83D\uDD04 <strong>Request Revision</strong> - If changes are needed</li>\n        <li>\u26A0\uFE0F <strong>File Dispute</strong> - If there's a serious issue</li>\n      </ul>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/my-commissions\" style=\"display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;\">\n          Review & Confirm Delivery\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify both parties about auto-completion
     */
    export function sendAutoCompletionNotice(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Notify client
                    return [4 /*yield*/, sendEmail({
                            to: data.requesterEmail,
                            subject: "\u2705 Commission Auto-Completed: ".concat(data.title),
                            html: "\n      <h2>Commission Auto-Completed</h2>\n      <p>Hello ".concat(data.requesterName, ",</p>\n      <p>Your commission \"<strong>").concat(data.title, "</strong>\" has been automatically marked as complete \n      after 14 days of delivery without response.</p>\n      \n      <p>Payment has been released to ").concat(data.designerName, ".</p>\n      \n      <p>If you have any issues with the delivered work, please contact our support team within 7 days.</p>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/my-commissions\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View Commission\n        </a>\n      </p>\n    "),
                        })];
                    case 1:
                        // Notify client
                        _a.sent();
                        // Notify designer
                        return [2 /*return*/, sendEmail({
                                to: data.designerEmail,
                                subject: "\uD83D\uDCB0 Payment Released: ".concat(data.title),
                                html: "\n      <h2>Payment Released!</h2>\n      <p>Hello ".concat(data.designerName, ",</p>\n      <p>Great news! Your commission \"<strong>").concat(data.title, "</strong>\" has been automatically \n      marked as complete and payment has been released to your account.</p>\n      \n      <p>The client did not respond within 14 days of delivery, so the system automatically completed the transaction.</p>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/seller/dashboard\" style=\"display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;\">\n          View Dashboard\n        </a>\n      </p>\n    "),
                            })];
                }
            });
        });
    }
    /**
     * Warn designer about potential abandonment
     */
    export function sendAbandonmentWarningToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.designerEmail,
                        subject: "\uD83D\uDEA8 Urgent: Start Work on ".concat(data.title),
                        html: "\n      <h2>Action Required!</h2>\n      <p>Hello ".concat(data.designerName, ",</p>\n      <p>You received payment for commission \"<strong>").concat(data.title, "</strong>\" but haven't started work yet.</p>\n      \n      <p style=\"background: #FEE2E2; padding: 16px; border-radius: 8px; border-left: 4px solid #EF4444;\">\n        <strong>\u26A0\uFE0F Warning:</strong> If you don't start work within <strong>").concat(data.daysRemaining, " day").concat(data.daysRemaining > 1 ? 's' : '', "</strong>, \n        the commission will be <strong>cancelled and refunded</strong> to the client.\n      </p>\n      \n      <p>Please:</p>\n      <ol>\n        <li>Start working on the commission</li>\n        <li>Mark it as \"In Progress\" in your dashboard</li>\n        <li>Communicate with your client about the timeline</li>\n      </ol>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/seller/commission-requests\" style=\"display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px;\">\n          Start Commission Now\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client about refund due to abandonment
     */
    export function sendRefundNoticeToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.requesterEmail,
                        subject: "\uD83D\uDCB8 Refund Initiated: ".concat(data.title),
                        html: "\n      <h2>Your Refund Has Been Initiated</h2>\n      <p>Hello ".concat(data.requesterName, ",</p>\n      <p>We're sorry to inform you that your commission \"<strong>").concat(data.title, "</strong>\" has been cancelled.</p>\n      \n      <p><strong>Reason:</strong> ").concat(data.reason, "</p>\n      \n      <p>A refund of <strong>$").concat(data.amount.toFixed(2), "</strong> has been initiated. \n      Please allow 5-10 business days for the funds to appear in your account.</p>\n      \n      <p>We apologize for any inconvenience. You can find other talented designers on our platform.</p>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/designers\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          Browse Designers\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 12px;\">\n        If you have questions about your refund, please contact our support team.\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client about dispute resolution
     */
    export function sendDisputeResolvedToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            var refundSection;
            return __generator(this, function (_a) {
                refundSection = data.refundAmount
                    ? "<p><strong>Refund Amount:</strong> $".concat(data.refundAmount.toFixed(2), "</p>\n       <p>Please allow 5-10 business days for the refund to appear in your account.</p>")
                    : "";
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\u2705 Dispute Resolved - Your Commission with ".concat(data.designerName),
                        html: "\n      <h2>Your Dispute Has Been Resolved</h2>\n      <p>Hello ".concat(data.clientName, ",</p>\n      <p>Our team has reviewed your dispute regarding the commission with <strong>").concat(data.designerName, "</strong>.</p>\n      \n      <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n        <p><strong>Resolution:</strong> ").concat(data.resolution, "</p>\n        ").concat(refundSection, "\n        ").concat(data.notes ? "<p><strong>Notes:</strong> ".concat(data.notes, "</p>") : "", "\n      </div>\n      \n      <p>If you have any questions about this resolution, please contact our support team.</p>\n      \n      <p>Thank you for your patience and understanding.</p>\n      \n      <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n        This decision was made by our support team after careful review of all evidence.\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify designer about dispute resolution
     */
    export function sendDisputeResolvedToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            var payoutSection;
            return __generator(this, function (_a) {
                payoutSection = data.payoutAmount
                    ? "<p><strong>Your Payout:</strong> $".concat(data.payoutAmount.toFixed(2), "</p>\n       <p>This amount will be transferred to your registered bank account.</p>")
                    : "";
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\u2705 Dispute Resolved - Commission with ".concat(data.clientName),
                        html: "\n      <h2>Dispute Has Been Resolved</h2>\n      <p>Hello ".concat(data.designerName, ",</p>\n      <p>Our team has reviewed the dispute regarding your commission with <strong>").concat(data.clientName, "</strong>.</p>\n      \n      <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n        <p><strong>Resolution:</strong> ").concat(data.resolution, "</p>\n        ").concat(payoutSection, "\n        ").concat(data.notes ? "<p><strong>Notes:</strong> ".concat(data.notes, "</p>") : "", "\n      </div>\n      \n      <p>If you have any questions about this resolution, please contact our support team.</p>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/seller/commissions\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View Your Commissions\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n        This decision was made by our support team after careful review of all evidence.\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client about new message in commission
     */
    export function sendNewMessageToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\uD83D\uDCAC New Message from ".concat(data.designerName, " - ").concat(data.commissionTitle),
                        html: "\n      <h2>New Message on Your Commission</h2>\n      <p>Hello ".concat(data.clientName, ",</p>\n      <p><strong>").concat(data.designerName, "</strong> sent you a message about your commission \"<strong>").concat(data.commissionTitle, "</strong>\":</p>\n      \n      <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;\">\n        \"").concat(data.messagePreview.substring(0, 200)).concat(data.messagePreview.length > 200 ? "..." : "", "\"\n      </div>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/commissions/").concat(data.commissionId, "\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View & Reply\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify designer about new message in commission
     */
    export function sendNewMessageToDesigner(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\uD83D\uDCAC New Message from ".concat(data.clientName, " - ").concat(data.commissionTitle),
                        html: "\n      <h2>New Message on Commission</h2>\n      <p>Hello ".concat(data.designerName, ",</p>\n      <p><strong>").concat(data.clientName, "</strong> sent you a message about the commission \"<strong>").concat(data.commissionTitle, "</strong>\":</p>\n      \n      <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;\">\n        \"").concat(data.messagePreview.substring(0, 200)).concat(data.messagePreview.length > 200 ? "..." : "", "\"\n      </div>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/seller/commissions/").concat(data.commissionId, "\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View & Reply\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client about progress update from designer
     */
    export function sendProgressUpdateToClient(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\uD83D\uDCF8 Progress Update: ".concat(data.commissionTitle),
                        html: "\n      <h2>Progress Update on Your Commission</h2>\n      <p>Hello ".concat(data.clientName, ",</p>\n      <p><strong>").concat(data.designerName, "</strong> has posted a progress update on your commission:</p>\n      \n      <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n        <p>").concat(data.updateMessage, "</p>\n        ").concat(data.hasPhotos ? "<p>📷 <em>Photos attached - view in your dashboard</em></p>" : "", "\n      </div>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/commissions/").concat(data.commissionId, "\" style=\"display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;\">\n          View Progress\n        </a>\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Notify client when their physical item has been delivered
     */
    export function sendPhysicalDeliveryNotification(data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, sendEmail({
                        to: data.email,
                        subject: "\uD83D\uDCE6 Your Package Has Been Delivered: ".concat(data.commissionTitle),
                        html: "\n      <h2>Your Package Has Been Delivered!</h2>\n      <p>Hello ".concat(data.clientName, ",</p>\n      <p>Great news! Your commissioned item \"<strong>").concat(data.commissionTitle, "</strong>\" has been delivered.</p>\n      \n      ").concat(data.trackingNumber || data.courierName ? "\n        <div style=\"background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n          ".concat(data.courierName ? "<p><strong>Courier:</strong> ".concat(data.courierName, "</p>") : '', "\n          ").concat(data.trackingNumber ? "<p><strong>Tracking Number:</strong> ".concat(data.trackingNumber, "</p>") : '', "\n        </div>\n      ") : '', "\n      \n      <p style=\"background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;\">\n        <strong>\u26A0\uFE0F Important:</strong> Please confirm receipt of your package within <strong>14 days</strong>.\n        If we don't hear from you, the order will be automatically marked as complete and payment will be released to the designer.\n      </p>\n      \n      <p>Once you've received and inspected your item, please:</p>\n      <ul>\n        <li>\u2705 <strong>Confirm Delivery</strong> - If everything is as expected</li>\n        <li>\u26A0\uFE0F <strong>Report Issue</strong> - If there's a problem with the item</li>\n      </ul>\n      \n      <p>\n        <a href=\"").concat(BASE_URL, "/my-commissions\" style=\"display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;\">\n          Confirm Delivery\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 14px; margin-top: 20px;\">\n        Thank you for using Fashion Marketplace!\n      </p>\n    "),
                    })];
            });
        });
    }
    /**
     * Send password reset email
     */
    export function sendPasswordResetEmail(email, userName, resetToken) {
        return __awaiter(this, void 0, void 0, function () {
            var resetUrl, subject, content;
            return __generator(this, function (_a) {
                resetUrl = "".concat(BASE_URL, "/auth/reset-password?token=").concat(resetToken);
                subject = '🔐 Reset Your Password - Fashion Marketplace';
                content = "\n    <h2>Reset Your Password</h2>\n    <p>Hello ".concat(userName || 'there', ",</p>\n    <p>You requested to reset your password. Click the button below to set a new password:</p>\n    <p style=\"text-align: center;\">\n      <a href=\"").concat(resetUrl, "\" class=\"cta-btn\" style=\"background:#4F46E5;\">Reset Password</a>\n    </p>\n    <div class=\"note\" style=\"background:#FEF3C7; border-left:4px solid #F59E0B;\">\n      <strong>\u26A0\uFE0F Important:</strong> This link will expire in <strong>1 hour</strong>.\n    </div>\n    <p class=\"security\">\n      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.\n    </p>\n    <p style=\"font-size:13px; color:#64748b;\">\n      If the button doesn't work, copy and paste this link:<br>\n      <a href=\"").concat(resetUrl, "\" style=\"color:#10B981;\">").concat(resetUrl, "</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: email,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
    /**
     * Send email verification email
     */
    export function sendVerificationEmail(email, userName, verifyToken) {
        return __awaiter(this, void 0, void 0, function () {
            // Branded HTML email wrapper (must be defined before usage)
            export function wrapBrandedEmail(subject, content) {
                return "<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>".concat(subject, "</title>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n    <style>\n      body { background: #f4f4f8; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }\n      .email-container { max-width: 480px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px 24px; }\n      .logo { text-align: center; margin-bottom: 24px; }\n      .logo img { max-width: 120px; }\n      h2 { color: #1e293b; }\n      .cta-btn { display: inline-block; padding: 14px 28px; background: #4F46E5; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 24px 0; }\n      .note, .security { background: #f1f5f9; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 15px; color: #334155; }\n      .footer { color: #64748b; font-size: 13px; text-align: center; margin-top: 32px; }\n      @media (max-width: 600px) {\n        .email-container { padding: 16px 4vw; }\n      }\n    </style>\n  </head>\n  <body>\n    <div class=\"email-container\">\n      <div class=\"logo\">\n        <img src=\"https://fashionmarketplace.store/logo.png\" alt=\"Fashion Marketplace Logo\" />\n      </div>\n      ").concat(content, "\n      <div class=\"footer\">\n        Need help? <a href=\"mailto:support@fashionmarketplace.store\" style=\"color:#4F46E5;\">Contact support</a><br/>\n        &copy; 2026 Fashion Marketplace\n      </div>\n    </div>\n  </body>\n</html>");
            }
            /**
             * Send order confirmation email to buyer
             */
            export function sendOrderConfirmationEmail(email, userName, orderNumber, totalAmount, itemCount, items) {
                return __awaiter(this, void 0, void 0, function () {
                    var orderUrl, itemsHtml;
                    return __generator(this, function (_a) {
                        orderUrl = "".concat(BASE_URL, "/orders");
                        itemsHtml = items.map(function (item) { return "\n    <tr>\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">".concat(item.title, "</td>\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee;\">").concat(item.purchaseType, "</td>\n      <td style=\"padding: 10px; border-bottom: 1px solid #eee; text-align: right;\">$").concat(item.price.toFixed(2), "</td>\n    </tr>\n  "); }).join('');
                        return [2 /*return*/, sendEmail({
                                to: email,
                                subject: "\uD83C\uDF89 Order Confirmed - #".concat(orderNumber),
                                html: "\n      <h2>Thank You for Your Order!</h2>\n      <p>Hello ".concat(userName || 'there', ",</p>\n      <p>Your order has been confirmed and your designs are ready to download.</p>\n      \n      <div style=\"background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n        <p style=\"margin: 0;\"><strong>Order Number:</strong> ").concat(orderNumber, "</p>\n        <p style=\"margin: 10px 0 0;\"><strong>Total:</strong> $").concat(totalAmount.toFixed(2), "</p>\n      </div>\n      \n      <h3>Order Items</h3>\n      <table style=\"width: 100%; border-collapse: collapse;\">\n        <thead>\n          <tr style=\"background: #f0f0f0;\">\n            <th style=\"padding: 10px; text-align: left;\">Design</th>\n            <th style=\"padding: 10px; text-align: left;\">Type</th>\n            <th style=\"padding: 10px; text-align: right;\">Price</th>\n          </tr>\n        </thead>\n        <tbody>\n          ").concat(itemsHtml, "\n        </tbody>\n      </table>\n      \n      <p style=\"text-align: center; margin: 30px 0;\">\n        <a href=\"").concat(orderUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n          View Your Orders\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 14px;\">\n        You can download your purchased designs from your order history at any time.\n      </p>\n    "),
                            })];
                    });
                });
            }
            /**
             * Send sale notification email to seller
             */
            export function sendSaleNotificationEmail(sellerEmail, sellerName, designTitle, saleAmount, sellerEarnings, purchaseType) {
                return __awaiter(this, void 0, void 0, function () {
                    var dashboardUrl;
                    return __generator(this, function (_a) {
                        dashboardUrl = "".concat(BASE_URL, "/seller/dashboard");
                        return [2 /*return*/, sendEmail({
                                to: sellerEmail,
                                subject: "\uD83D\uDCB0 You Made a Sale! - ".concat(designTitle),
                                html: "\n      <h2>\uD83C\uDF89 Congratulations on Your Sale!</h2>\n      <p>Hello ".concat(sellerName || 'Designer', ",</p>\n      <p>Great news! Someone just purchased your design.</p>\n      \n      <div style=\"background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;\">\n        <p style=\"margin: 0;\"><strong>Design:</strong> ").concat(designTitle, "</p>\n        <p style=\"margin: 10px 0 0;\"><strong>Purchase Type:</strong> ").concat(purchaseType, "</p>\n        <p style=\"margin: 10px 0 0;\"><strong>Sale Amount:</strong> $").concat(saleAmount.toFixed(2), "</p>\n        <p style=\"margin: 10px 0 0; font-size: 18px; color: #10B981;\"><strong>Your Earnings:</strong> $").concat(sellerEarnings.toFixed(2), "</p>\n      </div>\n      \n      <p style=\"text-align: center; margin: 30px 0;\">\n        <a href=\"").concat(dashboardUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n          View Dashboard\n        </a>\n      </p>\n      \n      <p style=\"color: #666; font-size: 14px;\">\n        Keep up the great work! Your earnings will be transferred according to your payout schedule.\n      </p>\n    "),
                            })];
                    });
                });
            }
            /**
             * Send POD order status update email
             */
            export function sendPODStatusEmail(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var to, customerName, orderNumber, status, trackingNumber, trackingUrl, carrier, reason, isSeller, orderUrl, statusConfig, config, trackingHtml;
                    return __generator(this, function (_a) {
                        to = data.to, customerName = data.customerName, orderNumber = data.orderNumber, status = data.status, trackingNumber = data.trackingNumber, trackingUrl = data.trackingUrl, carrier = data.carrier, reason = data.reason, isSeller = data.isSeller;
                        orderUrl = isSeller
                            ? "".concat(BASE_URL, "/seller/orders")
                            : "".concat(BASE_URL, "/profile?tab=orders");
                        statusConfig = {
                            'shipped': {
                                emoji: '🚚',
                                title: 'Your Order Has Shipped!',
                                message: isSeller
                                    ? 'Great news! A POD order containing your design has been shipped to the customer.'
                                    : 'Great news! Your order is on its way.',
                                color: '#3B82F6'
                            },
                            'in_production': {
                                emoji: '🏭',
                                title: 'Order In Production',
                                message: isSeller
                                    ? 'A POD order containing your design is now being manufactured.'
                                    : 'Your custom order is now being produced.',
                                color: '#F59E0B'
                            },
                            'delivered': {
                                emoji: '✅',
                                title: 'Order Delivered!',
                                message: isSeller
                                    ? 'A POD order containing your design has been successfully delivered!'
                                    : 'Your order has been delivered successfully!',
                                color: '#10B981'
                            },
                            'canceled': {
                                emoji: '❌',
                                title: 'Order Canceled',
                                message: reason
                                    ? "The order has been canceled. Reason: ".concat(reason)
                                    : 'The order has been canceled.',
                                color: '#EF4444'
                            },
                            'failed': {
                                emoji: '⚠️',
                                title: 'Order Issue',
                                message: isSeller
                                    ? "There was an issue with a POD order containing your design. ".concat(reason || 'Our team is looking into it.')
                                    : "There was an issue with your order. ".concat(reason || 'Our team is looking into it.'),
                                color: '#EF4444'
                            },
                            'returned': {
                                emoji: '📦',
                                title: 'Package Returned',
                                message: 'The package was returned to the sender. This may require reshipment.',
                                color: '#F59E0B'
                            },
                            'delivery_failed': {
                                emoji: '⚠️',
                                title: 'Delivery Issue',
                                message: 'The delivery attempt was unsuccessful. The carrier may attempt redelivery.',
                                color: '#F59E0B'
                            }
                        };
                        config = statusConfig[status] || {
                            emoji: '📦',
                            title: 'Order Update',
                            message: "Your order status has been updated to: ".concat(status),
                            color: '#6B7280'
                        };
                        trackingHtml = '';
                        if (trackingNumber || trackingUrl) {
                            trackingHtml = "\n      <div style=\"background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;\">\n        <p style=\"margin: 0; font-weight: bold;\">Tracking Information</p>\n        ".concat(carrier ? "<p style=\"margin: 5px 0 0;\">Carrier: ".concat(carrier, "</p>") : '', "\n        ").concat(trackingNumber ? "<p style=\"margin: 5px 0 0;\">Tracking Number: <code>".concat(trackingNumber, "</code></p>") : '', "\n        ").concat(trackingUrl ? "\n          <p style=\"margin: 10px 0 0;\">\n            <a href=\"".concat(trackingUrl, "\" style=\"color: #4F46E5; text-decoration: underline;\">Track Your Package \u2192</a>\n          </p>\n        ") : '', "\n      </div>\n    ");
                        }
                        return [2 /*return*/, sendEmail({
                                to: to,
                                subject: "".concat(config.emoji, " ").concat(config.title, " - Order #").concat(orderNumber),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: ".concat(config.color, ";\">").concat(config.emoji, " ").concat(config.title, "</h2>\n        \n        <p>Hello ").concat(customerName, ",</p>\n        <p>").concat(config.message, "</p>\n        \n        <div style=\"background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ").concat(config.color, ";\">\n          <p style=\"margin: 0;\"><strong>Order Number:</strong> #").concat(orderNumber, "</p>\n          <p style=\"margin: 10px 0 0;\"><strong>Status:</strong> ").concat(status.replace(/_/g, ' ').toUpperCase(), "</p>\n        </div>\n        \n        ").concat(trackingHtml, "\n        \n        <p style=\"text-align: center; margin: 30px 0;\">\n          <a href=\"").concat(orderUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n            ").concat(isSeller ? 'View Your Orders' : 'View Order Details', "\n          </a>\n        </p>\n        \n        <hr style=\"border: none; border-top: 1px solid #eee; margin: 30px 0;\">\n        \n        <p style=\"color: #666; font-size: 14px;\">\n          ").concat(isSeller
                                    ? 'You\'re receiving this because your design was included in a Print-on-Demand order.'
                                    : 'If you have any questions about your order, please contact our support team.', "\n        </p>\n        \n        <p style=\"color: #999; font-size: 12px; margin-top: 20px;\">\n          ").concat(APP_NAME, " - Your Fashion Design Marketplace\n        </p>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Send POD alert to admin for critical events (failures, cancellations, issues)
             */
            export function sendAdminPODAlert(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var adminEmail, alertConfig, config, orderUrl;
                    return __generator(this, function (_a) {
                        adminEmail = process.env.ADMIN_EMAIL;
                        if (!adminEmail) {
                            console.log('[Email] ADMIN_EMAIL not configured, skipping admin POD alert');
                            return [2 /*return*/, false];
                        }
                        alertConfig = {
                            'failed': {
                                emoji: '🚨',
                                title: 'POD Order Failed',
                                color: '#EF4444',
                                urgency: 'HIGH'
                            },
                            'canceled': {
                                emoji: '❌',
                                title: 'POD Order Canceled',
                                color: '#F59E0B',
                                urgency: 'MEDIUM'
                            },
                            'returned': {
                                emoji: '📦',
                                title: 'POD Package Returned',
                                color: '#F59E0B',
                                urgency: 'MEDIUM'
                            },
                            'delivery_failed': {
                                emoji: '⚠️',
                                title: 'POD Delivery Failed',
                                color: '#F59E0B',
                                urgency: 'MEDIUM'
                            }
                        };
                        config = alertConfig[data.status] || {
                            emoji: '📋',
                            title: 'POD Order Update',
                            color: '#6B7280',
                            urgency: 'LOW'
                        };
                        orderUrl = "".concat(BASE_URL, "/admin/pod");
                        return [2 /*return*/, sendEmail({
                                to: adminEmail,
                                subject: "".concat(config.emoji, " [").concat(config.urgency, "] ").concat(config.title, " - Order #").concat(data.orderNumber),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <div style=\"background: ".concat(config.color, "; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;\">\n          <h2 style=\"margin: 0;\">").concat(config.emoji, " ").concat(config.title, "</h2>\n          <p style=\"margin: 5px 0 0; opacity: 0.9;\">Urgency: ").concat(config.urgency, "</p>\n        </div>\n        \n        <div style=\"border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;\">\n          <h3 style=\"margin-top: 0;\">Order Details</h3>\n          \n          <table style=\"width: 100%; border-collapse: collapse;\">\n            <tr>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\"><strong>Order Number:</strong></td>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\">#").concat(data.orderNumber, "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\"><strong>POD Provider:</strong></td>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\">").concat(data.provider || 'Unknown', "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\"><strong>Status:</strong></td>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\">\n                <span style=\"background: ").concat(config.color, "; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;\">\n                  ").concat(data.status.toUpperCase().replace(/_/g, ' '), "\n                </span>\n              </td>\n            </tr>\n            ").concat(data.customerEmail ? "\n            <tr>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\"><strong>Customer:</strong></td>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\">".concat(data.customerEmail, "</td>\n            </tr>\n            ") : '', "\n            ").concat(data.totalAmount ? "\n            <tr>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\"><strong>Order Total:</strong></td>\n              <td style=\"padding: 8px 0; border-bottom: 1px solid #eee;\">$".concat(data.totalAmount.toFixed(2), "</td>\n            </tr>\n            ") : '', "\n          </table>\n\n          ").concat(data.reason ? "\n          <div style=\"background: #FEF2F2; border-left: 4px solid ".concat(config.color, "; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;\">\n            <strong>Reason:</strong>\n            <p style=\"margin: 5px 0 0;\">").concat(data.reason, "</p>\n          </div>\n          ") : '', "\n\n          <h3>Recommended Actions</h3>\n          <ul style=\"color: #666;\">\n            ").concat(data.status === 'failed' ? "\n              <li>Check the POD provider dashboard for error details</li>\n              <li>Contact customer about the issue</li>\n              <li>Consider refunding or resubmitting the order</li>\n            " : '', "\n            ").concat(data.status === 'canceled' ? "\n              <li>Verify if refund has been processed</li>\n              <li>Check if customer initiated the cancellation</li>\n            " : '', "\n            ").concat(data.status === 'returned' ? "\n              <li>Contact customer to verify shipping address</li>\n              <li>Arrange for reshipment if needed</li>\n            " : '', "\n            ").concat(data.status === 'delivery_failed' ? "\n              <li>Contact carrier for delivery attempt details</li>\n              <li>Reach out to customer about redelivery</li>\n            " : '', "\n          </ul>\n          \n          <p style=\"text-align: center; margin: 30px 0;\">\n            <a href=\"").concat(orderUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              View POD Orders Dashboard\n            </a>\n          </p>\n        </div>\n        \n        <p style=\"color: #999; font-size: 12px; margin-top: 20px; text-align: center;\">\n          This is an automated alert from ").concat(APP_NAME, " POD System\n        </p>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Send Month 5 notification to seller (Day 120+)
             * Alerts seller that their product is entering the final month of the 180-day cycle
             */
            export function sendMonth5WarehouseNotification(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var productUrl, warehouseUrl;
                    return __generator(this, function (_a) {
                        productUrl = "".concat(BASE_URL, "/seller/boutique/").concat(data.productId);
                        warehouseUrl = "".concat(BASE_URL, "/seller/boutique/warehouse-expiration");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "\u23F0 Action Needed: ".concat(data.productTitle, " Entering Month 5 of Storage"),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #F59E0B; margin-top: 0;\">\u23F0 Action Required: Storage Month 5 Alert</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Your product <strong>\"").concat(data.productTitle, "\"</strong> has been in our warehouse for <strong>").concat(data.daysInWarehouse, " days</strong>. \n            You're now entering the final month (Month 5) of your 180-day storage cycle.\n          </p>\n          \n          <div style=\"background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #92400E; font-weight: bold;\">\u26A0\uFE0F What This Means:</p>\n            <ul style=\"color: #92400E; margin: 10px 0 0 0; padding-left: 20px;\">\n              <li>In <strong>").concat(data.cycleEndDay - data.daysInWarehouse, " days</strong>, we'll automatically deduct 1 unit of inventory</li>\n              <li>You can <strong>repost your product</strong> to reset the 180-day countdown</li>\n              <li>Reposting costs 1 unit (we keep it to cover return shipping)</li>\n              <li>You have <strong>").concat(data.repostsRemaining, "/3 reposts available today</strong></li>\n            </ul>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Your Current Status:</strong><br>\n            \u2022 Days in Warehouse: <strong>").concat(data.daysInWarehouse, "/").concat(data.cycleEndDay, "</strong><br>\n            \u2022 Current Stock: <strong>").concat(data.currentStock, " units</strong><br>\n            \u2022 Status: <strong style=\"color: #F59E0B;\">Month 5 (Final 60 Days)</strong>\n          </p>\n          \n          <div style=\"margin: 30px 0;\">\n            <p style=\"text-align: center;\">\n              <a href=\"").concat(warehouseUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;\">\n                View Warehouse Dashboard\n              </a>\n            </p>\n          </div>\n          \n          <h3 style=\"color: #333; font-size: 15px; margin-top: 20px;\">What You Can Do:</h3>\n          <ol style=\"color: #555; font-size: 14px; line-height: 1.8;\">\n            <li><strong>Repost Your Product</strong> - Keep it selling with 1 unit deducted</li>\n            <li><strong>Reduce Price</strong> - Make it more appealing to buyers</li>\n            <li><strong>Let It Deduct</strong> - Allow automatic deduction at Day 180</li>\n            <li><strong>Monitor Sales</strong> - Check if inventory is moving</li>\n          </ol>\n          \n          <p style=\"color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;\">\n            Questions? Visit your <a href=\"").concat(warehouseUrl, "\" style=\"color: #4F46E5; text-decoration: none;\">warehouse dashboard</a> for more details.\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 15px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Send final warning before stock deduction (Day 173+)
             * Last chance to take action before automatic -1 unit deduction
             */
            export function sendWarehouseFinalWarning(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var warehouseUrl;
                    return __generator(this, function (_a) {
                        warehouseUrl = "".concat(BASE_URL, "/seller/boutique/warehouse-expiration");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "\uD83D\uDEA8 URGENT: ".concat(data.productTitle, " - ").concat(data.daysUntilDeduction, " Days Until Stock Deduction"),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 4px solid #DC2626;\">\n          <h2 style=\"color: #DC2626; margin-top: 0;\">\uD83D\uDEA8 URGENT: Final Warning - Action Required</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6; font-weight: bold;\">\n            Your product <strong>\"").concat(data.productTitle, "\"</strong> will have <strong style=\"color: #DC2626;\">1 unit automatically deducted</strong> in <strong>").concat(data.daysUntilDeduction, " day(s)</strong>.\n          </p>\n          \n          <div style=\"background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #7F1D1D; font-weight: bold;\">This is your last chance to:</p>\n            <ul style=\"color: #7F1D1D; margin: 10px 0 0 0; padding-left: 20px;\">\n              <li><strong>Repost your product</strong> to reset the 180-day countdown</li>\n              <li>Cancel the automatic deduction</li>\n              <li>Keep your product LIVE in our marketplace</li>\n            </ul>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Current Status:</strong><br>\n            \u2022 Days in Warehouse: <strong>").concat(data.daysInWarehouse, "</strong><br>\n            \u2022 Current Stock: <strong>").concat(data.currentStock, " units</strong><br>\n            \u2022 Days Until Deduction: <strong style=\"color: #DC2626;\">").concat(data.daysUntilDeduction, "</strong>\n          </p>\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(warehouseUrl, "\" style=\"display: inline-block; padding: 16px 32px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;\">\n              Repost Now - Don't Lose Stock!\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            If you don't repost or take action before Day 180, we'll automatically deduct 1 unit to offset return shipping costs. \n            Your product will remain LIVE, but with reduced inventory.\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Confirm stock deduction after automatic processing
             * Notifies seller that 1 unit has been deducted per the contract
             */
            export function sendWarehouseDeductionConfirmation(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var productUrl, warehouseUrl;
                    return __generator(this, function (_a) {
                        productUrl = "".concat(BASE_URL, "/seller/boutique/").concat(data.productId);
                        warehouseUrl = "".concat(BASE_URL, "/seller/boutique/warehouse-expiration");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "Stock Deduction Processed: ".concat(data.productTitle),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #4B5563; margin-top: 0;\">Stock Deduction Processed</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Your product <strong>\"").concat(data.productTitle, "\"</strong> has reached the 180-day storage milestone. \n            As per our warehouse agreement, we've automatically deducted <strong>").concat(data.stockDeducted, " unit</strong> to offset return shipping costs.\n          </p>\n          \n          <div style=\"background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #0C4A6E; font-weight: bold;\">What Happened:</p>\n            <ul style=\"color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;\">\n              <li>Automatic deduction completed at Day 180 of storage cycle</li>\n              <li>1 unit deducted per variant</li>\n              <li>Your product remains LIVE and available for sale</li>\n              <li>The 180-day countdown has reset for the next cycle</li>\n            </ul>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Transaction Details:</strong><br>\n            \u2022 Product: <strong>").concat(data.productTitle, "</strong><br>\n            \u2022 Days in Warehouse: <strong>").concat(data.daysInWarehouse, "</strong><br>\n            \u2022 Units Deducted: <strong>").concat(data.stockDeducted, "</strong><br>\n            \u2022 Remaining Stock: <strong>").concat(data.remainingStock, "</strong><br>\n            \u2022 Status: <strong style=\"color: #059669;\">LIVE (Cycle Reset)</strong>\n          </p>\n          \n          ").concat(data.remainingStock <= 1 ? "\n            <div style=\"background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n              <p style=\"margin: 0; color: #0C4A6E; font-weight: bold;\">\u26A0\uFE0F Low Stock Alert:</p>\n              <p style=\"color: #0C4A6E; margin: 8px 0 0 0;\">\n                You have only <strong>".concat(data.remainingStock, " unit(s)</strong> remaining. Consider pricing adjustments or marketing to boost sales.\n              </p>\n            </div>\n          ") : '', "\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(warehouseUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              View Warehouse Dashboard\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            <strong>What's Next?</strong><br>\n            Your product now enters a new 180-day storage cycle. You can repost again in Day 120-179 of this new cycle to prevent further deductions.\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Notify seller when product is delisted from warehouse
             */
            export function sendWarehouseProductDelistedNotification(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var dashboardUrl, reasonText;
                    return __generator(this, function (_a) {
                        dashboardUrl = "".concat(BASE_URL, "/seller/boutique");
                        reasonText = data.reason === 'out_of_stock'
                            ? 'All inventory has been depleted after multiple 180-day cycles and automatic deductions.'
                            : 'You requested the product to be removed from the warehouse.';
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "Product Delisted: ".concat(data.productTitle),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #4B5563; margin-top: 0;\">Product Delisted from Warehouse</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Your product <strong>\"").concat(data.productTitle, "\"</strong> has been delisted from our warehouse inventory system.\n          </p>\n          \n          <div style=\"background-color: #F3E8FF; border-left: 4px solid #9333EA; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #581C87; font-weight: bold;\">Reason for Delisting:</p>\n            <p style=\"color: #581C87; margin: 8px 0 0 0;\">").concat(reasonText, "</p>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Product Details:</strong><br>\n            \u2022 Product: <strong>").concat(data.productTitle, "</strong><br>\n            \u2022 Days Stored: <strong>").concat(data.daysInWarehouse, "</strong><br>\n            \u2022 Status: <strong style=\"color: #DC2626;\">DELISTED</strong>\n          </p>\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(dashboardUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              Back to Dashboard\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            You can reupload this product or create new listings whenever you're ready. \n            Thank you for using ").concat(APP_NAME, "!\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            export function sendWarehouseReturnApprovedNotification(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var dashboardUrl;
                    return __generator(this, function (_a) {
                        dashboardUrl = "".concat(BASE_URL, "/seller/boutique");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "Product Returned from Warehouse: ".concat(data.productTitle),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #4B5563; margin-top: 0;\">Product Returned from Warehouse</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Your product <strong>\"").concat(data.productTitle, "\"</strong> has been successfully returned from the warehouse and the warehouse lock has been released.\n          </p>\n          \n          <div style=\"background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #047857; font-weight: bold;\">What This Means:</p>\n            <p style=\"color: #047857; margin: 8px 0 0 0;\">\n              \u2022 The -1 inventory lock variant has been deleted<br>\n              \u2022 Warehouse metadata has been cleared<br>\n              \u2022 Your product is now independent of the warehouse system<br>\n              \u2022 You can manage this product normally\n            </p>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Product Details:</strong><br>\n            \u2022 Product: <strong>").concat(data.productTitle, "</strong><br>\n            \u2022 Product ID: <strong>").concat(data.productId, "</strong><br>\n            \u2022 Status: <strong style=\"color: #10B981;\">RETURNED</strong>\n          </p>\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(dashboardUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              View Your Products\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            If you need to send this product to the warehouse again, you can do so through your dashboard. \n            Thank you for using ").concat(APP_NAME, "!\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Notify seller when repost request is approved
             */
            export function sendRepostApprovedNotification(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var warehouseUrl;
                    return __generator(this, function (_a) {
                        warehouseUrl = "".concat(BASE_URL, "/seller/boutique/warehouse-expiration");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "\u2705 Repost Approved: ".concat(data.productTitle),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 4px solid #059669;\">\n          <h2 style=\"color: #059669; margin-top: 0;\">\u2705 Repost Request Approved!</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Great news! Your repost request for <strong>\"").concat(data.productTitle, "\"</strong> has been approved by our admin team.\n          </p>\n          \n          <div style=\"background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #0C4A6E; font-weight: bold;\">\u2728 What Happened:</p>\n            <ul style=\"color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;\">\n              <li>Your product remains <strong>LIVE</strong> in the marketplace</li>\n              <li><strong>").concat(data.stockDeducted, " unit(s)</strong> have been deducted (warehouse offset)</li>\n              <li>The 180-day countdown has been <strong>reset</strong></li>\n              <li>You can repost again in Month 5 of the next cycle</li>\n            </ul>\n          </div>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            <strong>Stock Update:</strong><br>\n            \u2022 Previous Stock: <strong>").concat(data.originalStock, " units</strong><br>\n            \u2022 New Stock: <strong style=\"color: #059669;\">").concat(data.newStock, " units</strong><br>\n            \u2022 Deducted: <strong>").concat(data.stockDeducted, " unit(s)</strong>\n          </p>\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(warehouseUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              View Warehouse Dashboard\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            <strong>Next Steps:</strong><br>\n            Your product now enters a new 180-day storage cycle. You'll receive a notification at Day 120 if you want to repost again.\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            /**
             * Notify seller when repost request is rejected
             */
            export function sendRepostRejectedNotification(data) {
                return __awaiter(this, void 0, void 0, function () {
                    var warehouseUrl, dashboardUrl;
                    return __generator(this, function (_a) {
                        warehouseUrl = "".concat(BASE_URL, "/seller/boutique/warehouse-expiration");
                        dashboardUrl = "".concat(BASE_URL, "/seller/boutique");
                        return [2 /*return*/, sendEmail({
                                to: data.sellerEmail,
                                subject: "Repost Request Declined: ".concat(data.productTitle),
                                html: "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;\">\n        <div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n          <h2 style=\"color: #4B5563; margin-top: 0;\">Repost Request Update</h2>\n          \n          <p style=\"color: #333; font-size: 16px; line-height: 1.6;\">\n            Hi <strong>".concat(data.sellerName, "</strong>,\n          </p>\n          \n          <p style=\"color: #555; font-size: 15px; line-height: 1.6;\">\n            Your repost request for <strong>\"").concat(data.productTitle, "\"</strong> has been reviewed and declined at this time.\n          </p>\n          \n          <div style=\"background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n            <p style=\"margin: 0; color: #92400E; font-weight: bold;\">What This Means:</p>\n            <ul style=\"color: #92400E; margin: 10px 0 0 0; padding-left: 20px;\">\n              <li>Your product stock has been <strong>unlocked</strong> to its original level</li>\n              <li>You can submit a new repost request anytime</li>\n              <li>Your product remains in the warehouse</li>\n            </ul>\n          </div>\n          \n          ").concat(data.adminNotes ? "\n            <div style=\"background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;\">\n              <p style=\"margin: 0; color: #0C4A6E; font-weight: bold;\">Admin Notes:</p>\n              <p style=\"color: #0C4A6E; margin: 8px 0 0 0;\">".concat(data.adminNotes, "</p>\n            </div>\n          ") : '', "\n          \n          <div style=\"margin: 30px 0; text-align: center;\">\n            <a href=\"").concat(warehouseUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;\">\n              Try Again\n            </a>\n            <a href=\"").concat(dashboardUrl, "\" style=\"display: inline-block; padding: 14px 28px; background-color: #6B7280; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;\">\n              Dashboard\n            </a>\n          </div>\n          \n          <p style=\"color: #666; font-size: 14px; line-height: 1.6;\">\n            You can always resubmit your repost request during Month 5 (Days 120-179) of your storage cycle. \n            If you have questions, please contact support.\n          </p>\n          \n          <p style=\"color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;\">\n            This is an automated notification from ").concat(APP_NAME, "\n          </p>\n        </div>\n      </div>\n    "),
                            })];
                    });
                });
            }
            var verifyUrl, subject, content;
            return __generator(this, function (_a) {
                verifyUrl = "".concat(BASE_URL, "/auth/verify-email?token=").concat(verifyToken);
                subject = '✉️ Verify Your Email - Fashion Marketplace';
                content = "\n    <h2>Verify Your Email Address</h2>\n    <p>Hello ".concat(userName || 'there', ",</p>\n    <p>Welcome to Fashion Marketplace! Please verify your email address to unlock all features:</p>\n    <p style=\"text-align: center;\">\n      <a href=\"").concat(verifyUrl, "\" class=\"cta-btn\" style=\"background:#10B981;\">Verify Email</a>\n    </p>\n    <div class=\"note\" style=\"background:#E0F2FE; border-left:4px solid #0EA5E9;\">\n      <strong>\u2139\uFE0F Note:</strong> This link will expire in <strong>24 hours</strong>.\n    </div>\n    <ul style=\"color: #475569;\">\n      <li>Purchase designs and access downloads</li>\n      <li>Leave reviews on purchases</li>\n      <li>Become a seller and upload designs</li>\n    </ul>\n    <p style=\"font-size:13px; color:#64748b;\">\n      If the button doesn't work, copy and paste this link:<br>\n      <a href=\"").concat(verifyUrl, "\" style=\"color:#4F46E5;\">").concat(verifyUrl, "</a>\n    </p>\n  ");
                return [2 /*return*/, sendEmail({
                        to: email,
                        subject: subject,
                        html: wrapBrandedEmail(subject, content),
                    })];
            });
        });
    }
}
