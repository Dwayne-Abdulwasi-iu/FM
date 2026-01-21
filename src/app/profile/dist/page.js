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
var react_2 = require("next-auth/react");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var image_1 = require("next/image");
var link_1 = require("next/link");
var DesignerBadge_1 = require("@/components/DesignerBadge");
var jszip_1 = require("jszip");
function ProfilePage() {
    var _this = this;
    var _a, _b, _c, _d, _e;
    var _f = react_2.useSession(), session = _f.data, status = _f.status;
    var router = navigation_1.useRouter();
    var _g = react_1.useState(null), profile = _g[0], setProfile = _g[1];
    var _h = react_1.useState(null), stats = _h[0], setStats = _h[1];
    var _j = react_1.useState([]), designs = _j[0], setDesigns = _j[1];
    var _k = react_1.useState([]), purchasedDesigns = _k[0], setPurchasedDesigns = _k[1];
    var _l = react_1.useState([]), orders = _l[0], setOrders = _l[1];
    var _m = react_1.useState(true), loading = _m[0], setLoading = _m[1];
    var _o = react_1.useState('overview'), activeTab = _o[0], setActiveTab = _o[1];
    var _p = react_1.useState(null), deleteConfirm = _p[0], setDeleteConfirm = _p[1];
    var _q = react_1.useState(null), successMessage = _q[0], setSuccessMessage = _q[1];
    var _r = react_1.useState(null), errorMessage = _r[0], setErrorMessage = _r[1];
    var _s = react_1.useState(false), isEditingProfile = _s[0], setIsEditingProfile = _s[1];
    var _t = react_1.useState(false), profileSaving = _t[0], setProfileSaving = _t[1];
    var _u = react_1.useState({
        name: '',
        displayName: '',
        bio: '',
        website: '',
        location: ''
    }), profileForm = _u[0], setProfileForm = _u[1];
    react_1.useEffect(function () {
        if (status === 'loading')
            return;
        if (!session) {
            router.push('/auth/signin');
            return;
        }
        fetchProfile();
    }, [session, status, router]);
    var fetchProfile = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, profileRes, statsRes, designsRes, purchasesRes, ordersRes, profileData, statsData, designsData, purchasesData, ordersData, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 14, 15, 16]);
                    setLoading(true);
                    return [4 /*yield*/, Promise.all([
                            fetch('/api/profile'),
                            fetch('/api/profile/stats'),
                            fetch('/api/profile/designs'),
                            fetch('/api/profile/purchases'),
                            fetch('/api/profile/orders')
                        ])];
                case 1:
                    _a = _b.sent(), profileRes = _a[0], statsRes = _a[1], designsRes = _a[2], purchasesRes = _a[3], ordersRes = _a[4];
                    if (!profileRes.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, profileRes.json()];
                case 2:
                    profileData = _b.sent();
                    setProfile(profileData.user);
                    setProfileForm({
                        name: profileData.user.name || '',
                        displayName: profileData.user.displayName || '',
                        bio: profileData.user.bio || '',
                        website: profileData.user.website || '',
                        location: profileData.user.location || ''
                    });
                    _b.label = 3;
                case 3:
                    if (!statsRes.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, statsRes.json()];
                case 4:
                    statsData = _b.sent();
                    setStats(statsData.stats);
                    _b.label = 5;
                case 5:
                    if (!designsRes.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, designsRes.json()];
                case 6:
                    designsData = _b.sent();
                    setDesigns(designsData.designs);
                    _b.label = 7;
                case 7:
                    if (!purchasesRes.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, purchasesRes.json()];
                case 8:
                    purchasesData = _b.sent();
                    setPurchasedDesigns(purchasesData.purchases || []);
                    return [3 /*break*/, 10];
                case 9:
                    console.warn('Failed to fetch purchases:', purchasesRes.status);
                    _b.label = 10;
                case 10:
                    if (!ordersRes.ok) return [3 /*break*/, 12];
                    return [4 /*yield*/, ordersRes.json()];
                case 11:
                    ordersData = _b.sent();
                    setOrders(ordersData.orders || []);
                    return [3 /*break*/, 13];
                case 12:
                    console.warn('Failed to fetch orders:', ordersRes.status);
                    _b.label = 13;
                case 13: return [3 /*break*/, 16];
                case 14:
                    error_1 = _b.sent();
                    console.error('Failed to fetch profile data:', error_1);
                    setErrorMessage('Failed to load profile');
                    return [3 /*break*/, 16];
                case 15:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveProfile = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, 7, 8]);
                    setProfileSaving(true);
                    setErrorMessage(null);
                    return [4 /*yield*/, fetch('/api/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(profileForm)
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setProfile(data.user);
                    setIsEditingProfile(false);
                    setSuccessMessage('Profile updated successfully!');
                    setTimeout(function () { return setSuccessMessage(null); }, 3000);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    error = _a.sent();
                    setErrorMessage(error.message || 'Failed to update profile');
                    _a.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_2 = _a.sent();
                    console.error('Failed to save profile:', error_2);
                    setErrorMessage('Failed to save profile');
                    return [3 /*break*/, 8];
                case 7:
                    setProfileSaving(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var formatPrice = function (price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };
    var formatDate = function (dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    var formatDateWithTime = function (dateString) {
        var date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ' at ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    var handleEditDesign = function (designId) {
        // For now, redirect to upload page with edit mode
        // In a full implementation, you'd create an edit page
        router.push("/upload?edit=" + designId);
    };
    var handleDeleteDesign = function (designId, title) {
        setDeleteConfirm({ designId: designId, title: title });
    };
    var handleDownloadPurchasedDesign = function (purchaseId, designId, designTitle) { return __awaiter(_this, void 0, void 0, function () {
        var response, contentType, data, _i, _a, file, fileUrl, fileResponse, blob, url, a, blob, url, a, error_3;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 14, , 15]);
                    if (!designId) {
                        console.error('Design ID is missing');
                        setErrorMessage('Design ID not found');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fetch("/api/designs/" + designId + "/download?purchaseId=" + purchaseId)];
                case 1:
                    response = _d.sent();
                    if (!response.ok) return [3 /*break*/, 12];
                    contentType = response.headers.get('content-type');
                    if (!(contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json'))) return [3 /*break*/, 9];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _d.sent();
                    if (!(data.files && Array.isArray(data.files))) return [3 /*break*/, 8];
                    _i = 0, _a = data.files;
                    _d.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    file = _a[_i];
                    fileUrl = file.downloadUrl || file.url;
                    if (!fileUrl) {
                        console.warn('No download URL for file:', file);
                        return [3 /*break*/, 7];
                    }
                    return [4 /*yield*/, fetch(fileUrl)];
                case 4:
                    fileResponse = _d.sent();
                    if (!fileResponse.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, fileResponse.blob()];
                case 5:
                    blob = _d.sent();
                    url = window.URL.createObjectURL(blob);
                    a = document.createElement('a');
                    a.href = url;
                    a.download = file.name || designTitle + "-file";
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    // Small delay between downloads
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 500); })];
                case 6:
                    // Small delay between downloads
                    _d.sent();
                    _d.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, response.blob()];
                case 10:
                    blob = _d.sent();
                    url = window.URL.createObjectURL(blob);
                    a = document.createElement('a');
                    a.href = url;
                    a.download = ((_c = (_b = response.headers.get('content-disposition')) === null || _b === void 0 ? void 0 : _b.split('filename=')[1]) === null || _c === void 0 ? void 0 : _c.replace(/"/g, '')) || designTitle;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    _d.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    console.error('Download failed:', response.statusText);
                    setErrorMessage('Download failed');
                    _d.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    error_3 = _d.sent();
                    console.error('Download error:', error_3);
                    setErrorMessage('Download error');
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    }); };
    var handleDownloadOrderDesign = function (designTitle, mediaFiles) { return __awaiter(_this, void 0, void 0, function () {
        var zip, designFolder, _i, mediaFiles_1, file, response, blob, fileName, fileError_1, zipBlob, url, a, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, , 11]);
                    if (!mediaFiles || mediaFiles.length === 0) {
                        setErrorMessage('No files available for download');
                        return [2 /*return*/];
                    }
                    zip = new jszip_1["default"]();
                    designFolder = zip.folder(designTitle) || zip;
                    _i = 0, mediaFiles_1 = mediaFiles;
                    _a.label = 1;
                case 1:
                    if (!(_i < mediaFiles_1.length)) return [3 /*break*/, 8];
                    file = mediaFiles_1[_i];
                    if (!file.fileUrl) {
                        console.warn('No fileUrl for file:', file);
                        return [3 /*break*/, 7];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, fetch(file.fileUrl)];
                case 3:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response.blob()];
                case 4:
                    blob = _a.sent();
                    fileName = file.fileName || "file-" + file.id;
                    designFolder.file(fileName, blob);
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    fileError_1 = _a.sent();
                    console.error('Error downloading file:', fileError_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [4 /*yield*/, designFolder.generateAsync({ type: 'blob' })];
                case 9:
                    zipBlob = _a.sent();
                    url = window.URL.createObjectURL(zipBlob);
                    a = document.createElement('a');
                    a.href = url;
                    a.download = designTitle + ".zip";
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setSuccessMessage('Design downloaded successfully');
                    setTimeout(function () { return setSuccessMessage(null); }, 3000);
                    return [3 /*break*/, 11];
                case 10:
                    error_4 = _a.sent();
                    console.error('Download error:', error_4);
                    setErrorMessage('Download failed');
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); };
    var confirmDelete = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!deleteConfirm)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    return [4 /*yield*/, fetch('/api/profile/designs', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'delete',
                                designId: deleteConfirm.designId
                            })
                        })];
                case 2:
                    response = _b.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    setSuccessMessage('Design deleted successfully');
                    setDesigns(designs.filter(function (d) { return d.id !== deleteConfirm.designId; }));
                    // Update stats
                    fetchProfile();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    error = _b.sent();
                    setErrorMessage(error.message || 'Failed to delete design');
                    _b.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    _a = _b.sent();
                    setErrorMessage('An error occurred while deleting the design');
                    return [3 /*break*/, 8];
                case 7:
                    setDeleteConfirm(null);
                    // Auto-clear messages after 3 seconds
                    setTimeout(function () {
                        setSuccessMessage(null);
                        setErrorMessage(null);
                    }, 3000);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" })));
    }
    if (!profile) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "text-center" },
                React.createElement("h1", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Profile Not Found"),
                React.createElement(link_1["default"], { href: "/", className: "text-indigo-600 hover:text-indigo-800" }, "Go Home"))));
    }
    return (React.createElement("div", { className: "min-h-screen bg-gray-50" },
        React.createElement("div", { className: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" },
            successMessage && (React.createElement("div", { className: "mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center" },
                    React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 text-green-600 mr-3" }),
                    React.createElement("span", { className: "text-green-800 font-medium" }, successMessage)),
                React.createElement("button", { onClick: function () { return setSuccessMessage(null); }, className: "text-green-600 hover:text-green-800", "aria-label": "Close success message" },
                    React.createElement(lucide_react_1.X, { className: "h-4 w-4" })))),
            errorMessage && (React.createElement("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center" },
                    React.createElement(lucide_react_1.X, { className: "h-5 w-5 text-red-600 mr-3" }),
                    React.createElement("span", { className: "text-red-800 font-medium" }, errorMessage)),
                React.createElement("button", { onClick: function () { return setErrorMessage(null); }, className: "text-red-600 hover:text-red-800", "aria-label": "Close error message" },
                    React.createElement(lucide_react_1.X, { className: "h-4 w-4" })))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-3 mb-3" },
                React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2" },
                    React.createElement("div", { className: "flex items-center space-x-2 sm:space-x-3" },
                        React.createElement("div", { className: "w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0" },
                            React.createElement(lucide_react_1.User, { className: "w-6 h-6 sm:w-8 sm:h-8 text-white" })),
                        React.createElement("div", { className: "min-w-0 flex-1" },
                            React.createElement("h1", { className: "text-sm sm:text-xl font-bold text-gray-900 truncate" }, profile.displayName || profile.name || 'Anonymous User'),
                            profile.displayName && profile.name && (React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-500 truncate" }, profile.name)),
                            React.createElement("div", { className: "flex items-center text-gray-600 text-[11px] sm:text-xs mt-0.5" },
                                React.createElement(lucide_react_1.Mail, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" }),
                                React.createElement("span", { className: "truncate" }, profile.email)),
                            React.createElement("div", { className: "flex items-center text-gray-600 text-[11px] sm:text-xs mt-0.5" },
                                React.createElement(lucide_react_1.Calendar, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" }),
                                "Member since ",
                                formatDate(profile.createdAt)))),
                    React.createElement("div", { className: "flex items-center space-x-1.5 mt-1 sm:mt-0 flex-wrap gap-1" },
                        profile.designerTier && (React.createElement(DesignerBadge_1.DesignerProfileBadge, { tier: profile.designerTier })),
                        profile.isVerified && (React.createElement("span", { className: "bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium" }, "Verified")),
                        !profile.designerTier && (React.createElement("span", { className: "bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize" }, profile.role.toLowerCase()))))),
            stats && (React.createElement("div", { className: "grid grid-cols-3 gap-1.5 sm:gap-3 mb-3" },
                React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-2 sm:p-3" },
                    React.createElement("div", { className: "flex flex-col items-center sm:flex-row sm:items-center sm:justify-between" },
                        React.createElement("div", { className: "text-center sm:text-left" },
                            React.createElement("p", { className: "text-[10px] sm:text-xs font-medium text-gray-600" }, "Designs"),
                            React.createElement("p", { className: "text-base sm:text-xl font-bold text-gray-900" }, stats.totalDesigns)),
                        React.createElement(lucide_react_1.Upload, { className: "w-4 h-4 sm:w-6 sm:h-6 text-indigo-600 mt-1 sm:mt-0" }))),
                React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-2 sm:p-3" },
                    React.createElement("div", { className: "flex flex-col items-center sm:flex-row sm:items-center sm:justify-between" },
                        React.createElement("div", { className: "text-center sm:text-left" },
                            React.createElement("p", { className: "text-[10px] sm:text-xs font-medium text-gray-600" }, "Sales"),
                            React.createElement("p", { className: "text-base sm:text-xl font-bold text-gray-900" }, (_a = stats === null || stats === void 0 ? void 0 : stats.totalSales) !== null && _a !== void 0 ? _a : 0)),
                        React.createElement(lucide_react_1.TrendingUp, { className: "w-4 h-4 sm:w-6 sm:h-6 text-green-600 mt-1 sm:mt-0" }))),
                React.createElement("div", { className: "bg-white rounded-lg shadow-sm p-2 sm:p-3" },
                    React.createElement("div", { className: "flex flex-col items-center sm:flex-row sm:items-center sm:justify-between" },
                        React.createElement("div", { className: "text-center sm:text-left" },
                            React.createElement("p", { className: "text-[10px] sm:text-xs font-medium text-gray-600" }, "Earnings"),
                            React.createElement("p", { className: "text-base sm:text-xl font-bold text-gray-900" }, formatPrice((_b = stats === null || stats === void 0 ? void 0 : stats.totalEarnings) !== null && _b !== void 0 ? _b : 0)),
                            React.createElement("p", { className: "text-[8px] sm:text-xs text-gray-500 mt-0.5" }, "After platform fee")),
                        React.createElement(lucide_react_1.DollarSign, { className: "w-4 h-4 sm:w-6 sm:h-6 text-blue-600 mt-1 sm:mt-0 hidden sm:block" }))))),
            React.createElement("div", { className: "bg-white rounded-lg shadow-sm" },
                React.createElement("div", { className: "border-b border-gray-200" },
                    React.createElement("nav", { className: "flex overflow-x-auto scrollbar-hide px-1.5 sm:px-4 -mb-px" }, [
                        { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: lucide_react_1.Eye },
                        { id: 'designs', label: 'My Designs', shortLabel: 'Designs', icon: lucide_react_1.Upload },
                        { id: 'purchases', label: 'Downloads', shortLabel: 'Downloads', icon: lucide_react_1.Download },
                        { id: 'orders', label: 'My Orders', shortLabel: 'Orders', icon: lucide_react_1.Package },
                        { id: 'earnings', label: 'Earnings', shortLabel: 'Earnings', icon: lucide_react_1.DollarSign },
                        { id: 'account', label: 'Bank Account', shortLabel: 'Bank', icon: lucide_react_1.CreditCard }
                    ].map(function (tab) { return (React.createElement("button", { key: tab.id, onClick: function () { return setActiveTab(tab.id); }, className: "flex items-center py-2 sm:py-3 px-1.5 sm:px-2.5 border-b-2 font-medium text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0 " + (activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') },
                        React.createElement(tab.icon, { className: "w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1.5" }),
                        React.createElement("span", { className: "sm:hidden" }, tab.shortLabel),
                        React.createElement("span", { className: "hidden sm:inline" }, tab.label))); }))),
                React.createElement("div", { className: "p-2.5 sm:p-4" },
                    activeTab === 'overview' && (React.createElement("div", null,
                        React.createElement("div", { className: "flex items-center justify-between mb-2" },
                            React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-gray-900" }, "Account Overview"),
                            !isEditingProfile && (React.createElement("button", { onClick: function () { return setIsEditingProfile(true); }, className: "text-indigo-600 hover:text-indigo-700 text-[10px] sm:text-xs font-medium" }, "Edit Profile"))),
                        isEditingProfile ? (React.createElement("div", { className: "space-y-3" },
                            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] sm:text-xs font-medium text-gray-700 mb-1" }, "Full Name"),
                                    React.createElement("input", { type: "text", value: profileForm.name, onChange: function (e) { return setProfileForm(__assign(__assign({}, profileForm), { name: e.target.value })); }, className: "w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Your full name" })),
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] sm:text-xs font-medium text-gray-700 mb-1" }, "Display Name / Nickname"),
                                    React.createElement("input", { type: "text", value: profileForm.displayName, onChange: function (e) { return setProfileForm(__assign(__assign({}, profileForm), { displayName: e.target.value })); }, className: "w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Nickname shown in forum & community" }),
                                    React.createElement("p", { className: "mt-0.5 text-[10px] text-gray-500" }, "This name will be shown in the forum and community sections instead of your full name.")),
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] sm:text-xs font-medium text-gray-700 mb-1" }, "Location"),
                                    React.createElement("input", { type: "text", value: profileForm.location, onChange: function (e) { return setProfileForm(__assign(__assign({}, profileForm), { location: e.target.value })); }, className: "w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "City, Country" })),
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] sm:text-xs font-medium text-gray-700 mb-1" }, "Website"),
                                    React.createElement("input", { type: "url", value: profileForm.website, onChange: function (e) { return setProfileForm(__assign(__assign({}, profileForm), { website: e.target.value })); }, className: "w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "https://yourwebsite.com" }))),
                            React.createElement("div", null,
                                React.createElement("label", { className: "block text-[11px] sm:text-xs font-medium text-gray-700 mb-1" }, "Bio"),
                                React.createElement("textarea", { value: profileForm.bio, onChange: function (e) { return setProfileForm(__assign(__assign({}, profileForm), { bio: e.target.value })); }, rows: 3, className: "w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500", placeholder: "Tell us about yourself..." })),
                            React.createElement("div", { className: "flex gap-2 pt-2" },
                                React.createElement("button", { onClick: handleSaveProfile, disabled: profileSaving, className: "bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-[10px] sm:text-xs disabled:opacity-50" }, profileSaving ? 'Saving...' : 'Save Changes'),
                                React.createElement("button", { onClick: function () {
                                        setIsEditingProfile(false);
                                        setProfileForm({
                                            name: (profile === null || profile === void 0 ? void 0 : profile.name) || '',
                                            displayName: (profile === null || profile === void 0 ? void 0 : profile.displayName) || '',
                                            bio: (profile === null || profile === void 0 ? void 0 : profile.bio) || '',
                                            website: (profile === null || profile === void 0 ? void 0 : profile.website) || '',
                                            location: (profile === null || profile === void 0 ? void 0 : profile.location) || ''
                                        });
                                    }, className: "bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 text-[10px] sm:text-xs" }, "Cancel")))) : (React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4" },
                            React.createElement("div", null,
                                React.createElement("h4", { className: "font-medium text-gray-900 mb-1.5 text-xs sm:text-sm" }, "Profile Information"),
                                React.createElement("div", { className: "space-y-1 text-[11px] sm:text-xs text-gray-900" },
                                    React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Name:"),
                                        " ",
                                        profile.name || 'Not set'),
                                    React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Display Name:"),
                                        " ",
                                        profile.displayName || React.createElement("span", { className: "text-gray-400 italic" }, "Not set")),
                                    React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Email:"),
                                        " ",
                                        profile.email),
                                    React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Role:"),
                                        " ",
                                        profile.role),
                                    React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Verified:"),
                                        " ",
                                        profile.isVerified ? 'Yes' : 'No'),
                                    profile.location && React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Location:"),
                                        " ",
                                        profile.location),
                                    profile.website && React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Website:"),
                                        " ",
                                        profile.website),
                                    profile.bio && React.createElement("p", null,
                                        React.createElement("span", { className: "font-medium" }, "Bio:"),
                                        " ",
                                        profile.bio))),
                            React.createElement("div", null,
                                React.createElement("h4", { className: "font-medium text-gray-900 mb-1.5 text-xs sm:text-sm" }, "Quick Actions"),
                                React.createElement("div", { className: "flex gap-1.5 sm:flex-col sm:space-y-1.5" },
                                    React.createElement(link_1["default"], { href: "/upload", className: "flex-1 bg-indigo-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 text-center text-[10px] sm:text-xs" }, "Upload"),
                                    React.createElement(link_1["default"], { href: "/orders", className: "flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-200 text-center text-[10px] sm:text-xs" }, "Orders"),
                                    React.createElement(link_1["default"], { href: "/profile/settings", className: "flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-200 text-center text-[10px] sm:text-xs flex items-center justify-center gap-1" },
                                        React.createElement(lucide_react_1.Settings, { className: "w-3 h-3" }),
                                        "Settings"))))))),
                    activeTab === 'designs' && (React.createElement("div", null,
                        React.createElement("div", { className: "flex items-center justify-between mb-2 sm:mb-3 gap-2" },
                            React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-gray-900" }, "My Designs"),
                            React.createElement(link_1["default"], { href: "/upload", className: "bg-indigo-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-indigo-700 text-[10px] sm:text-xs whitespace-nowrap" }, "Upload New Design")),
                        designs.length === 0 ? (React.createElement("div", { className: "text-center py-6 sm:py-8" },
                            React.createElement(lucide_react_1.Upload, { className: "w-8 sm:w-10 text-gray-400 mx-auto mb-2" }),
                            React.createElement("h4", { className: "text-xs sm:text-sm font-medium text-gray-900 mb-1" }, "No designs yet"),
                            React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3" }, "Start by uploading your first design to the marketplace"),
                            React.createElement(link_1["default"], { href: "/upload", className: "inline-block bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm" }, "Upload First Design"))) : (React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" }, designs.map(function (design) { return (React.createElement("div", { key: design.id, className: "border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow" },
                            React.createElement("div", { className: "aspect-square bg-gray-100" },
                                React.createElement(image_1["default"], { src: design.imageUrl, alt: design.title, width: 400, height: 400, className: "w-full h-full object-cover" })),
                            React.createElement("div", { className: "p-3 sm:p-4" },
                                React.createElement("h4", { className: "font-medium text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base truncate" }, design.title),
                                React.createElement("p", { className: "text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2" }, design.category),
                                React.createElement("div", { className: "flex items-center justify-between text-xs sm:text-sm" },
                                    React.createElement("span", { className: "font-bold text-indigo-600" }, formatPrice(design.price)),
                                    React.createElement("span", { className: "text-gray-500" },
                                        design.totalSales,
                                        " sales")),
                                React.createElement("div", { className: "mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600" },
                                    "Revenue: ",
                                    formatPrice(design.totalRevenue || 0)),
                                React.createElement("div", { className: "mt-2 flex gap-1 sm:gap-2" },
                                    React.createElement(link_1["default"], { href: "/designs/" + design.id, className: "flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded text-center text-xs hover:bg-gray-200" }, "View"),
                                    React.createElement("button", { onClick: function () { return handleEditDesign(design.id); }, className: "flex-1 bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-1 rounded text-center text-xs hover:bg-indigo-200" }, "Edit"),
                                    React.createElement("button", { onClick: function () { return handleDeleteDesign(design.id, design.title); }, className: "flex-1 bg-red-100 text-red-700 px-2 sm:px-3 py-1 rounded text-center text-xs hover:bg-red-200" }, "Delete"))))); }))))),
                    activeTab === 'earnings' && (React.createElement("div", null,
                        React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3" }, "Earnings Overview"),
                        stats && (React.createElement("div", { className: "bg-gray-50 rounded-lg p-2.5 sm:p-4 mb-2.5 sm:mb-3" },
                            React.createElement("div", { className: "grid grid-cols-3 gap-1.5 sm:gap-4" },
                                React.createElement("div", { className: "text-center" },
                                    React.createElement("p", { className: "text-[9px] sm:text-xs text-gray-600" }, "Revenue"),
                                    React.createElement("p", { className: "text-sm sm:text-lg font-bold text-gray-900" }, formatPrice((_c = stats === null || stats === void 0 ? void 0 : stats.totalRevenue) !== null && _c !== void 0 ? _c : 0))),
                                React.createElement("div", { className: "text-center" },
                                    React.createElement("p", { className: "text-[9px] sm:text-xs text-gray-600" }, "Commission"),
                                    React.createElement("p", { className: "text-sm sm:text-lg font-bold text-red-600" },
                                        "-",
                                        formatPrice(stats.platformCommission))),
                                React.createElement("div", { className: "text-center" },
                                    React.createElement("p", { className: "text-[9px] sm:text-xs text-gray-600" }, "Earnings"),
                                    React.createElement("p", { className: "text-sm sm:text-lg font-bold text-green-600" }, formatPrice((_d = stats === null || stats === void 0 ? void 0 : stats.totalEarnings) !== null && _d !== void 0 ? _d : 0)))))),
                        React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-2 sm:mb-2.5" },
                            React.createElement("h4", { className: "font-semibold text-blue-900 mb-1 text-xs sm:text-sm" }, "View Payment Transfers"),
                            React.createElement("p", { className: "text-[10px] sm:text-xs text-blue-800 mb-2" }, "Check the status of all your seller payments, including successful transfers, pending payments, and retry history."),
                            React.createElement(link_1["default"], { href: "/seller/transfers", className: "inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm" },
                                React.createElement(lucide_react_1.DollarSign, { className: "w-3 h-3 sm:w-4 sm:h-4 mr-1" }),
                                "View My Transfers & Payments")),
                        React.createElement("div", { className: "text-center py-2 sm:py-3 text-gray-500" },
                            React.createElement("p", { className: "text-[9px] sm:text-xs" }, "More detailed earnings breakdown available in transfer dashboard")))),
                    activeTab === 'purchases' && (React.createElement("div", null,
                        React.createElement("h2", { className: "text-xs sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3" }, "My Downloads"),
                        purchasedDesigns.length === 0 && orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).length === 0 ? (React.createElement("div", { className: "text-center py-6 sm:py-8" },
                            React.createElement(lucide_react_1.Download, { className: "w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" }),
                            React.createElement("p", { className: "text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm" }, "No downloads yet"),
                            React.createElement(link_1["default"], { href: "/designs", className: "inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs" }, "Browse Designs"))) : (React.createElement("div", { className: "space-y-4" },
                            orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).length > 0 && (React.createElement("div", null,
                                React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-indigo-700 mb-2" }, "Recent Orders"),
                                React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" }, orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).map(function (order) {
                                    return order.items.map(function (item) {
                                        var _a, _b;
                                        return (React.createElement("div", { key: item.id, className: "bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow" },
                                            React.createElement("div", { className: "relative h-28 sm:h-40 bg-gray-200 overflow-hidden" },
                                                React.createElement(image_1["default"], { src: item.design.imageUrl, alt: item.design.title, fill: true, sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw", className: "object-cover" }),
                                                React.createElement("div", { className: "absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-[9px] sm:text-xs font-medium" }, item.purchaseType === 'OWNERSHIP' ? 'Own' : 'Lic')),
                                            React.createElement("div", { className: "p-2 sm:p-3" },
                                                React.createElement("h3", { className: "font-semibold text-gray-900 mb-0.5 line-clamp-1 text-xs sm:text-sm" }, item.design.title),
                                                React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2" }, item.design.category),
                                                React.createElement("div", { className: "text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2" },
                                                    React.createElement("p", null,
                                                        "By ",
                                                        React.createElement("span", { className: "font-medium truncate" }, item.design.designer.name || 'Unknown'))),
                                                React.createElement("div", { className: "bg-gray-50 rounded p-1.5 sm:p-2 mb-2 sm:mb-2.5 text-[10px] sm:text-xs" },
                                                    React.createElement("p", { className: "text-gray-600" },
                                                        React.createElement("span", { className: "font-medium" }, formatDateWithTime(order.createdAt))),
                                                    React.createElement("p", { className: "text-gray-600 mt-0.5" },
                                                        React.createElement("span", { className: "font-medium text-indigo-600" },
                                                            "$",
                                                            item.price.toFixed(2)))),
                                                React.createElement("button", { onClick: function () { return handleDownloadOrderDesign(item.design.title, item.design.mediaFiles); }, className: "w-full flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs", disabled: !((_b = (_a = item === null || item === void 0 ? void 0 : item.design) === null || _a === void 0 ? void 0 : _a.mediaFiles) === null || _b === void 0 ? void 0 : _b.length) },
                                                    React.createElement(lucide_react_1.Download, { className: "w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" }),
                                                    "Download"))));
                                    });
                                })))),
                            purchasedDesigns.length > 0 && (React.createElement("div", null,
                                orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).length > 0 && (React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-indigo-700 mb-2 mt-4" }, "Individual Purchases")),
                                React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" }, purchasedDesigns.map(function (purchase) {
                                    var _a;
                                    return (React.createElement("div", { key: purchase.purchaseId, className: "bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow" },
                                        React.createElement("div", { className: "relative h-28 sm:h-40 bg-gray-200 overflow-hidden" },
                                            React.createElement(image_1["default"], { src: purchase.design.imageUrl, alt: purchase.design.title, fill: true, sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw", className: "object-cover" }),
                                            React.createElement("div", { className: "absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-[9px] sm:text-xs font-medium" }, purchase.purchaseType === 'OWNERSHIP' ? 'Own' : 'Lic')),
                                        React.createElement("div", { className: "p-2 sm:p-3" },
                                            React.createElement("h3", { className: "font-semibold text-gray-900 mb-0.5 line-clamp-1 text-xs sm:text-sm" }, purchase.design.title),
                                            React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2" }, purchase.design.category),
                                            React.createElement("div", { className: "text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2" },
                                                React.createElement("p", null,
                                                    "By ",
                                                    React.createElement("span", { className: "font-medium truncate" }, purchase.design.designer.name || 'Unknown'))),
                                            React.createElement("div", { className: "bg-gray-50 rounded p-1.5 sm:p-2 mb-2 sm:mb-2.5 text-[10px] sm:text-xs" },
                                                React.createElement("p", { className: "text-gray-600" },
                                                    React.createElement("span", { className: "font-medium" }, formatDate(purchase.purchaseDate))),
                                                React.createElement("p", { className: "text-gray-600 mt-0.5" },
                                                    React.createElement("span", { className: "font-medium text-indigo-600" }, formatPrice(purchase.purchasePrice)))),
                                            React.createElement("button", { onClick: function () { return handleDownloadPurchasedDesign(purchase.purchaseId, purchase.design.id, purchase.design.title); }, className: "w-full flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs", disabled: !((_a = purchase === null || purchase === void 0 ? void 0 : purchase.design) === null || _a === void 0 ? void 0 : _a.id) },
                                                React.createElement(lucide_react_1.Download, { className: "w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" }),
                                                "Download"))));
                                })))))))),
                    activeTab === 'orders' && (React.createElement("div", null,
                        React.createElement("h2", { className: "text-xs sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3" }, "My Orders"),
                        orders.length === 0 ? (React.createElement("div", { className: "text-center py-6 sm:py-8" },
                            React.createElement(lucide_react_1.Package, { className: "w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" }),
                            React.createElement("p", { className: "text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm" }, "No orders yet"),
                            React.createElement(link_1["default"], { href: "/designs", className: "inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs" }, "Browse Designs"))) : (React.createElement("div", { className: "space-y-3 sm:space-y-4" },
                            orders.filter(function (o) { return o.orderType === 'POD'; }).length > 0 && (React.createElement("div", { className: "mb-4" },
                                React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1" },
                                    React.createElement(lucide_react_1.Truck, { className: "w-3.5 h-3.5" }),
                                    "Physical Products (Print-on-Demand)"),
                                React.createElement("div", { className: "space-y-2" }, orders.filter(function (o) { return o.orderType === 'POD'; }).map(function (order) { return (React.createElement("div", { key: order.id, className: "bg-orange-50 border border-orange-200 rounded-lg p-3" },
                                    React.createElement("div", { className: "flex items-start justify-between mb-2" },
                                        React.createElement("div", null,
                                            React.createElement("p", { className: "font-semibold text-xs sm:text-sm text-gray-900" },
                                                "Order #",
                                                order.orderNumber),
                                            React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-500" }, formatDateWithTime(order.createdAt))),
                                        React.createElement("div", { className: "text-right" },
                                            React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium " + (order.podStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                                                    order.podStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                        order.podStatus === 'in_production' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800') }, order.podStatus === 'delivered' ? '✓ Delivered' :
                                                order.podStatus === 'shipped' ? '🚚 Shipped' :
                                                    order.podStatus === 'in_production' ? '🏭 In Production' :
                                                        '⏳ Processing'),
                                            React.createElement("p", { className: "text-xs font-semibold text-orange-700 mt-1" }, formatPrice(order.totalAmount)))),
                                    React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, order.items.map(function (item) { return (React.createElement("div", { key: item.id, className: "flex items-center gap-2 bg-white rounded p-1.5 border border-orange-100" },
                                        React.createElement("div", { className: "w-10 h-10 relative flex-shrink-0" },
                                            React.createElement(image_1["default"], { src: item.design.thumbnailUrl || item.design.imageUrl, alt: item.design.title, fill: true, className: "object-cover rounded" })),
                                        React.createElement("div", { className: "text-[10px] sm:text-xs" },
                                            React.createElement("p", { className: "font-medium text-gray-900 line-clamp-1" }, item.design.title),
                                            item.podProductName && (React.createElement("p", { className: "text-orange-600" }, item.podProductName)),
                                            React.createElement("p", { className: "text-gray-500" },
                                                "Qty: ",
                                                item.quantity)))); })),
                                    React.createElement("div", { className: "flex flex-wrap items-center gap-2 text-[10px] sm:text-xs" },
                                        order.trackingNumber && (React.createElement("a", { href: order.trackingUrl || '#', target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-blue-600 hover:text-blue-800" },
                                            React.createElement(lucide_react_1.ExternalLink, { className: "w-3 h-3" }),
                                            "Track Package")),
                                        order.shipping && (React.createElement("span", { className: "text-gray-500" },
                                            "Ships to: ",
                                            order.shipping.city,
                                            ", ",
                                            order.shipping.country)),
                                        order.podProvider && (React.createElement("span", { className: "text-gray-400" },
                                            "via ",
                                            order.podProvider))))); })))),
                            orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).length > 0 && (React.createElement("div", null,
                                React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1" },
                                    React.createElement(lucide_react_1.Download, { className: "w-3.5 h-3.5" }),
                                    "Digital Downloads"),
                                React.createElement("div", { className: "space-y-2" }, orders.filter(function (o) { return o.orderType === 'DIGITAL'; }).map(function (order) { return (React.createElement("div", { key: order.id, className: "bg-blue-50 border border-blue-200 rounded-lg p-3" },
                                    React.createElement("div", { className: "flex items-start justify-between mb-2" },
                                        React.createElement("div", null,
                                            React.createElement("p", { className: "font-semibold text-xs sm:text-sm text-gray-900" },
                                                "Order #",
                                                order.orderNumber),
                                            React.createElement("p", { className: "text-[10px] sm:text-xs text-gray-500" }, formatDateWithTime(order.createdAt))),
                                        React.createElement("div", { className: "text-right" },
                                            React.createElement("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium " + (order.status === 'COMPLETED' || order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800') }, order.status === 'COMPLETED' || order.status === 'PAID' ? '✓ Complete' : order.status),
                                            React.createElement("p", { className: "text-xs font-semibold text-blue-700 mt-1" }, formatPrice(order.totalAmount)))),
                                    React.createElement("div", { className: "flex flex-wrap gap-2" }, order.items.map(function (item) { return (React.createElement("div", { key: item.id, className: "flex items-center gap-2 bg-white rounded p-1.5 border border-blue-100" },
                                        React.createElement("div", { className: "w-10 h-10 relative flex-shrink-0" },
                                            React.createElement(image_1["default"], { src: item.design.thumbnailUrl || item.design.imageUrl, alt: item.design.title, fill: true, className: "object-cover rounded" })),
                                        React.createElement("div", { className: "text-[10px] sm:text-xs" },
                                            React.createElement("p", { className: "font-medium text-gray-900 line-clamp-1" }, item.design.title),
                                            React.createElement("p", { className: "text-blue-600" }, item.purchaseType === 'OWNERSHIP' ? 'Full Ownership' : 'Standard License')))); })))); })))))))),
                    activeTab === 'account' && (React.createElement(SellerAccountTab, null))))),
        deleteConfirm && (React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" },
            React.createElement("div", { className: "bg-white rounded-lg p-6 max-w-md w-full mx-4" },
                React.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Delete Design"),
                React.createElement("p", { className: "text-gray-600 mb-6" },
                    "Are you sure you want to delete \"", (_e = deleteConfirm === null || deleteConfirm === void 0 ? void 0 : deleteConfirm.title) !== null && _e !== void 0 ? _e : '',
                    "\"? This action cannot be undone."),
                React.createElement("div", { className: "flex space-x-4" },
                    React.createElement("button", { onClick: function () { return setDeleteConfirm(null); }, className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" }, "Cancel"),
                    React.createElement("button", { onClick: confirmDelete, className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" }, "Delete")))))));
}
exports["default"] = ProfilePage;
// Seller Account Management Component
function SellerAccountTab() {
    var _this = this;
    var _a = react_1.useState(null), sellerAccount = _a[0], setSellerAccount = _a[1];
    var _b = react_1.useState([]), banks = _b[0], setBanks = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState(false), saving = _d[0], setSaving = _d[1];
    var _e = react_1.useState(false), verifying = _e[0], setVerifying = _e[1];
    var _f = react_1.useState(false), showForm = _f[0], setShowForm = _f[1];
    var _g = react_1.useState({
        accountNumber: '',
        accountName: '',
        bankCode: '',
        bankName: ''
    }), formData = _g[0], setFormData = _g[1];
    react_1.useEffect(function () {
        fetchSellerAccount();
        fetchBanks();
    }, []);
    var fetchSellerAccount = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/seller/account')];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setSellerAccount(data.sellerAccount);
                    if (data.sellerAccount) {
                        setFormData({
                            accountNumber: data.sellerAccount.accountNumber,
                            accountName: data.sellerAccount.accountName,
                            bankCode: data.sellerAccount.bankCode,
                            bankName: data.sellerAccount.bankName
                        });
                    }
                    _a.label = 3;
                case 3: return [3 /*break*/, 6];
                case 4:
                    error_5 = _a.sent();
                    console.error('Error fetching seller account:', error_5);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var fetchBanks = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/seller/banks')];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setBanks(data.banks);
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_6 = _a.sent();
                    console.error('Error fetching banks:', error_6);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    setSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, fetch('/api/seller/account', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(formData)
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setSellerAccount(data.sellerAccount);
                    setShowForm(false);
                    alert('Bank account added successfully!');
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    error = _a.sent();
                    alert("Error: " + error.message);
                    _a.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    error_7 = _a.sent();
                    console.error('Error saving account:', error_7);
                    alert('Failed to save account. Please try again.');
                    return [3 /*break*/, 9];
                case 8:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var handleBankChange = function (bankCode) {
        var selectedBank = banks.find(function (bank) { return bank.code === bankCode; });
        setFormData(__assign(__assign({}, formData), { bankCode: bankCode, bankName: (selectedBank === null || selectedBank === void 0 ? void 0 : selectedBank.name) || '' }));
    };
    var handleVerifyAccount = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, confirmManual, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setVerifying(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, 10, 11]);
                    return [4 /*yield*/, fetch('/api/seller/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (!data.success) return [3 /*break*/, 4];
                    setSellerAccount(data.sellerAccount);
                    if (data.manualVerification) {
                        alert(data.message + "\n\nNote: " + data.note);
                    }
                    else {
                        alert("Account verified successfully! Bank shows account name as: \"" + data.verifiedName + "\"");
                    }
                    return [3 /*break*/, 8];
                case 4:
                    if (!data.manualVerificationAvailable) return [3 /*break*/, 7];
                    confirmManual = confirm(data.message + "\n\nWould you like to proceed with manual verification? This will allow you to receive payments, and transfer setup will be completed during your first sale.");
                    if (!confirmManual) return [3 /*break*/, 6];
                    return [4 /*yield*/, handleManualVerification()];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    alert("Verification failed: " + data.message);
                    _a.label = 8;
                case 8: return [3 /*break*/, 11];
                case 9:
                    error_8 = _a.sent();
                    console.error('Error verifying account:', error_8);
                    alert('Failed to verify account. Please try again.');
                    return [3 /*break*/, 11];
                case 10:
                    setVerifying(false);
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); };
    var handleManualVerification = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('/api/seller/manual-verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ confirmManualVerification: true })
                        })];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    if (data.success) {
                        setSellerAccount(data.sellerAccount);
                        alert(data.message + "\n\nNote: " + data.note);
                    }
                    else {
                        alert("Manual verification failed: " + data.message);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_9 = _a.sent();
                    console.error('Error with manual verification:', error_9);
                    alert('Failed to complete manual verification. Please try again.');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (React.createElement("div", { className: "p-6 text-center" },
            React.createElement("div", { className: "animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" }),
            React.createElement("p", { className: "mt-2 text-gray-600" }, "Loading account details...")));
    }
    return (React.createElement("div", { className: "p-2.5 sm:p-4" },
        React.createElement("div", { className: "flex items-center justify-between mb-3 gap-2" },
            React.createElement("h3", { className: "text-xs sm:text-sm font-semibold text-gray-900\\" }, "Bank Account for Earnings"),
            !showForm && (React.createElement("button", { onClick: function () { return setShowForm(true); }, className: "bg-indigo-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm whitespace-nowrap" }, sellerAccount ? 'Update' : 'Add Account'))),
        sellerAccount && !showForm ? (React.createElement("div", { className: "bg-gray-50 rounded-lg p-3 sm:p-4" },
            React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "font-medium text-gray-900 text-xs sm:text-sm" }, "Current Account"),
                React.createElement("span", { className: "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs " + (sellerAccount.isVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800') }, sellerAccount.isVerified ? 'Verified' : 'Pending')),
            React.createElement("div", { className: "space-y-1 text-[10px] sm:text-xs" },
                React.createElement("p", null,
                    React.createElement("span", { className: "font-medium\\" }, "Account Name:"),
                    " ",
                    React.createElement("span", { className: "truncate inline-block max-w-xs" }, sellerAccount.accountName)),
                React.createElement("p", null,
                    React.createElement("span", { className: "font-medium\\" }, "Account Number:"),
                    " ",
                    sellerAccount.accountNumber),
                React.createElement("p", null,
                    React.createElement("span", { className: "font-medium\\" }, "Bank:"),
                    " ",
                    React.createElement("span", { className: "truncate inline-block max-w-xs\\" }, sellerAccount.bankName)),
                React.createElement("p", null,
                    React.createElement("span", { className: "font-medium\\" }, "Status:"),
                    " ",
                    sellerAccount.isActive ? 'Active' : 'Inactive')),
            React.createElement("div", { className: "mt-2 sm:mt-3 p-2 sm:p-2.5 bg-blue-50 rounded-lg\\" },
                React.createElement("p", { className: "text-[9px] sm:text-xs text-blue-800 leading-tight" },
                    React.createElement("strong", null, "How it works:"),
                    " When customers make purchases, your earnings (after platform commission of 7-10%) will be automatically transferred to this account. New sellers enjoy their first $100 commission-free!")),
            !sellerAccount.isVerified && (React.createElement("div", { className: "mt-2 sm:mt-3 p-2 sm:p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg\\" },
                React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between" },
                    React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] sm:text-xs text-yellow-800 font-medium\\" }, "Account Not Verified"),
                        React.createElement("p", { className: "text-[9px] sm:text-xs text-yellow-700 mt-0.5\\" }, "Your account needs to be verified to receive payments automatically.")),
                    React.createElement("button", { onClick: handleVerifyAccount, disabled: verifying, className: "bg-yellow-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs whitespace-nowrap\\" }, verifying ? (React.createElement(React.Fragment, null,
                        React.createElement("div", { className: "animate-spin h-3 w-3 border-1.5 border-white border-t-transparent rounded-full inline-block mr-1\\" }),
                        "Verifying...")) : ('Verify Account'))))))) : showForm ? (React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
            React.createElement("div", null,
                React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Bank"),
                React.createElement("select", { value: formData.bankCode, onChange: function (e) { return handleBankChange(e.target.value); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white", "aria-label": "Select Bank", required: true },
                    React.createElement("option", { value: "" }, "Select Bank"),
                    banks.map(function (bank, index) { return (React.createElement("option", { key: bank.code + "-" + index, value: bank.code }, bank.name)); }))),
            React.createElement("div", null,
                React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Account Number"),
                React.createElement("input", { type: "text", value: formData.accountNumber, onChange: function (e) { return setFormData(__assign(__assign({}, formData), { accountNumber: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500", placeholder: "1234567890", maxLength: 10, required: true })),
            React.createElement("div", null,
                React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Account Name"),
                React.createElement("input", { type: "text", value: formData.accountName, onChange: function (e) { return setFormData(__assign(__assign({}, formData), { accountName: e.target.value })); }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500", placeholder: "John Doe", required: true })),
            React.createElement("div", { className: "flex space-x-3" },
                React.createElement("button", { type: "submit", disabled: saving, className: "bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50" }, saving ? 'Saving...' : 'Save Account'),
                React.createElement("button", { type: "button", onClick: function () { return setShowForm(false); }, className: "bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400" }, "Cancel")))) : (React.createElement("div", { className: "text-center py-12" },
            React.createElement(lucide_react_1.CreditCard, { className: "w-12 h-12 text-gray-400 mx-auto mb-4" }),
            React.createElement("h4", { className: "text-lg font-medium text-gray-900 mb-2" }, "No Bank Account Added"),
            React.createElement("p", { className: "text-gray-600 mb-4" }, "Add your bank account to receive earnings from sales")))));
}
