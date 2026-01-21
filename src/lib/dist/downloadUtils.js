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
exports.downloadFilesAsZip = void 0;
var jszip_1 = require("jszip");
function downloadFilesAsZip(files, folderName) {
    if (folderName === void 0) { folderName = 'downloads'; }
    return __awaiter(this, void 0, Promise, function () {
        var zip_1, fetchPromises, results, zipBlob, url, a, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!files || files.length === 0) {
                        console.warn('No files to download');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    zip_1 = new jszip_1["default"]();
                    console.log("Starting ZIP creation with " + files.length + " file(s)...");
                    fetchPromises = files.map(function (file, index) { return __awaiter(_this, void 0, void 0, function () {
                        var response, blob, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    console.log("Fetching file " + (index + 1) + "/" + files.length + ": " + file.name);
                                    return [4 /*yield*/, fetch(file.url, {
                                            headers: {
                                                'User-Agent': 'Mozilla/5.0'
                                            }
                                        })];
                                case 1:
                                    response = _a.sent();
                                    if (!response.ok) {
                                        console.warn("Failed to fetch " + file.name + ": " + response.status);
                                        return [2 /*return*/, null];
                                    }
                                    return [4 /*yield*/, response.blob()];
                                case 2:
                                    blob = _a.sent();
                                    console.log("Downloaded " + file.name + " (" + (blob.size / 1024).toFixed(2) + " KB)");
                                    return [2 /*return*/, { blob: blob, name: file.name, folder: file.folder }];
                                case 3:
                                    error_2 = _a.sent();
                                    console.error("Error fetching " + file.name + ":", error_2);
                                    return [2 /*return*/, null];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(fetchPromises)
                        // Add successful downloads to ZIP with folder structure
                    ];
                case 2:
                    results = _a.sent();
                    // Add successful downloads to ZIP with folder structure
                    results.forEach(function (result) {
                        if (result) {
                            var filePath = result.folder
                                ? result.folder + "/" + result.name
                                : result.name;
                            zip_1.file(filePath, result.blob);
                        }
                    });
                    console.log('Generating ZIP file...');
                    return [4 /*yield*/, zip_1.generateAsync({ type: 'blob' })];
                case 3:
                    zipBlob = _a.sent();
                    console.log("ZIP created successfully (" + (zipBlob.size / 1024 / 1024).toFixed(2) + " MB)");
                    url = URL.createObjectURL(zipBlob);
                    a = document.createElement('a');
                    a.href = url;
                    a.download = folderName + ".zip";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log("ZIP download triggered: " + folderName + ".zip");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error creating ZIP file:', error_1);
                    throw new Error('Failed to create ZIP file. Please try again.');
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.downloadFilesAsZip = downloadFilesAsZip;
