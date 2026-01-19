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
var image_1 = require("next/image");
var link_1 = require("next/link");
var lucide_react_1 = require("lucide-react");
function ResourcesPage() {
    var _this = this;
    var _a;
    var _b = react_1.useState(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = react_1.useState('all'), selectedCategory = _c[0], setSelectedCategory = _c[1];
    var _d = react_1.useState('all'), selectedType = _d[0], setSelectedType = _d[1];
    var _e = react_1.useState('all'), selectedDifficulty = _e[0], setSelectedDifficulty = _e[1];
    var _f = react_1.useState([]), resources = _f[0], setResources = _f[1];
    // const [loading, setLoading] = useState(true)
    react_1.useEffect(function () {
        fetchResources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, selectedType, selectedDifficulty]);
    var fetchResources = function () { return __awaiter(_this, void 0, void 0, function () {
        var params, response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    params = new URLSearchParams();
                    if (selectedCategory !== 'all')
                        params.append('category', selectedCategory);
                    if (selectedType !== 'all')
                        params.append('type', selectedType);
                    if (selectedDifficulty !== 'all')
                        params.append('difficulty', selectedDifficulty);
                    return [4 /*yield*/, fetch("/api/admin/resources?" + params.toString())];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setResources(data.resources || []);
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Failed to fetch resources:', error_1);
                    setResources([]);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var getCategoryCount = function (categoryId) {
        return resources.filter(function (resource) { return resource.category === categoryId; }).length;
    };
    var categories = [
        {
            id: 'design-fundamentals',
            title: 'Design Fundamentals',
            description: 'Basic principles of fashion design',
            icon: lucide_react_1.Brush,
            color: 'from-pink-500 to-rose-500',
            count: getCategoryCount('design-fundamentals')
        },
        {
            id: 'color-theory',
            title: 'Color Theory',
            description: 'Understanding color in fashion',
            icon: lucide_react_1.Palette,
            color: 'from-purple-500 to-indigo-500',
            count: getCategoryCount('color-theory')
        },
        {
            id: 'technical-drawing',
            title: 'Technical Drawing',
            description: 'Fashion illustration and flats',
            icon: lucide_react_1.Ruler,
            color: 'from-blue-500 to-cyan-500',
            count: getCategoryCount('technical-drawing')
        },
        {
            id: 'pattern-making',
            title: 'Pattern Making',
            description: 'Creating and modifying patterns',
            icon: lucide_react_1.Scissors,
            color: 'from-green-500 to-emerald-500',
            count: getCategoryCount('pattern-making')
        },
        {
            id: 'digital-tools',
            title: 'Digital Tools',
            description: 'Software and digital design',
            icon: lucide_react_1.Monitor,
            color: 'from-orange-500 to-red-500',
            count: getCategoryCount('digital-tools')
        },
        {
            id: 'photography',
            title: 'Fashion Photography',
            description: 'Capturing your designs',
            icon: lucide_react_1.Camera,
            color: 'from-yellow-500 to-orange-500',
            count: getCategoryCount('photography')
        }
    ];
    var filteredResources = resources.filter(function (resource) {
        var matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.tags.toLowerCase().includes(searchQuery.toLowerCase());
        var matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
        var matchesType = selectedType === 'all' || resource.type === selectedType;
        var matchesDifficulty = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty;
        return matchesSearch && matchesCategory && matchesType && matchesDifficulty;
    });
    var featuredResources = resources.filter(function (resource) { return resource.featured; });
    var getDifficultyColor = function (difficulty) {
        switch (difficulty) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    var getTypeIcon = function (type) {
        switch (type) {
            case 'guide': return lucide_react_1.FileText;
            case 'template': return lucide_react_1.Download;
            case 'tool': return lucide_react_1.Monitor;
            case 'tutorial': return lucide_react_1.Video;
            case 'reference': return lucide_react_1.BookOpen;
            case 'inspiration': return lucide_react_1.Heart;
            default: return lucide_react_1.FileText;
        }
    };
    var getFormatIcon = function (format) {
        switch (format) {
            case 'pdf': return lucide_react_1.FileText;
            case 'video': return lucide_react_1.Video;
            case 'web': return lucide_react_1.Globe;
            case 'download': return lucide_react_1.Download;
            case 'article': return lucide_react_1.BookOpen;
            default: return lucide_react_1.FileText;
        }
    };
    return (React.createElement("div", { className: "min-h-screen bg-gray-50" },
        React.createElement("div", { className: "max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8" },
            React.createElement("div", { className: "mb-4 sm:mb-6 md:mb-8" },
                React.createElement(link_1["default"], { href: "/", className: "inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm" },
                    React.createElement(lucide_react_1.ArrowLeft, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" }),
                    "Back to Home"),
                React.createElement("div", { className: "text-center mb-4 sm:mb-6 md:mb-8" },
                    React.createElement("div", { className: "flex items-center justify-center mb-2 sm:mb-3 md:mb-4" },
                        React.createElement(lucide_react_1.BookOpen, { className: "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-indigo-600 mr-2 sm:mr-3" }),
                        React.createElement("h1", { className: "text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900" }, "Design Resources")),
                    React.createElement("p", { className: "text-xs sm:text-sm md:text-lg text-gray-900 max-w-3xl mx-auto" }, "Discover tools, guides, templates, and tutorials to enhance your fashion design skills and workflow")),
                React.createElement("div", { className: "max-w-4xl mx-auto" },
                    React.createElement("div", { className: "flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6" },
                        React.createElement("div", { className: "relative flex-1" },
                            React.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" }),
                            React.createElement("input", { type: "text", placeholder: "Search resources...", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, className: "w-full pl-10 pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 text-xs sm:text-sm" })),
                        React.createElement("div", { className: "flex flex-wrap gap-1 sm:gap-2" },
                            React.createElement("select", { value: selectedCategory, onChange: function (e) { return setSelectedCategory(e.target.value); }, title: "Filter by category", "aria-label": "Filter resources by category", className: "px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-xs sm:text-sm" },
                                React.createElement("option", { value: "all" }, "All Categories"),
                                categories.map(function (cat) { return (React.createElement("option", { key: cat.id, value: cat.id }, cat.title)); })),
                            React.createElement("select", { value: selectedType, onChange: function (e) { return setSelectedType(e.target.value); }, title: "Filter by resource type", "aria-label": "Filter resources by type", className: "px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-xs sm:text-sm" },
                                React.createElement("option", { value: "all" }, "All Types"),
                                React.createElement("option", { value: "guide" }, "Guides"),
                                React.createElement("option", { value: "template" }, "Templates"),
                                React.createElement("option", { value: "tool" }, "Tools"),
                                React.createElement("option", { value: "tutorial" }, "Tutorials"),
                                React.createElement("option", { value: "reference" }, "References"),
                                React.createElement("option", { value: "inspiration" }, "Inspiration")),
                            React.createElement("select", { value: selectedDifficulty, onChange: function (e) { return setSelectedDifficulty(e.target.value); }, title: "Filter by difficulty level", "aria-label": "Filter resources by difficulty level", className: "px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-xs sm:text-sm" },
                                React.createElement("option", { value: "all" }, "All Levels"),
                                React.createElement("option", { value: "beginner" }, "Beginner"),
                                React.createElement("option", { value: "intermediate" }, "Intermediate"),
                                React.createElement("option", { value: "advanced" }, "Advanced")))))),
            searchQuery === '' && selectedCategory === 'all' && selectedType === 'all' && selectedDifficulty === 'all' && (React.createElement("div", { className: "mb-6 sm:mb-8 md:mb-12" },
                React.createElement("h2", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 flex items-center" },
                    React.createElement(lucide_react_1.Star, { className: "h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mr-2" }),
                    "Featured Resources"),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6" }, featuredResources.map(function (resource) {
                    var TypeIcon = getTypeIcon(resource.type);
                    var FormatIcon = getFormatIcon(resource.format);
                    return (React.createElement("div", { key: resource.id, className: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group" },
                        React.createElement("div", { className: "aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden" },
                            React.createElement(image_1["default"], { src: resource.thumbnail, alt: resource.title, width: 400, height: 225, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" }),
                            React.createElement("div", { className: "absolute top-2 left-2" },
                                React.createElement("span", { className: "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full " + getDifficultyColor(resource.difficulty) }, resource.difficulty)),
                            React.createElement("div", { className: "absolute top-2 right-2" },
                                React.createElement("div", { className: "bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center" },
                                    React.createElement(FormatIcon, { className: "h-3 w-3 mr-1" }),
                                    resource.format))),
                        React.createElement("div", { className: "p-3 sm:p-4" },
                            React.createElement("div", { className: "flex items-center mb-2" },
                                React.createElement(TypeIcon, { className: "h-4 w-4 text-indigo-600 mr-2" }),
                                React.createElement("span", { className: "text-[10px] sm:text-xs md:text-sm text-indigo-600 font-medium capitalize" }, resource.type)),
                            React.createElement("h3", { className: "font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-2 text-xs sm:text-sm md:text-base" }, resource.title),
                            React.createElement("p", { className: "text-[10px] sm:text-xs md:text-sm text-gray-900 mb-2 sm:mb-3 line-clamp-2" }, resource.description),
                            React.createElement("div", { className: "flex items-center justify-between text-[10px] sm:text-xs text-gray-900 mb-2 sm:mb-3" },
                                React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Eye, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                    resource.views.toLocaleString()),
                                React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Star, { className: "h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1" }),
                                    resource.rating),
                                resource.duration && (React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Clock, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                    resource.duration))),
                            React.createElement("div", { className: "flex gap-2" }, resource.downloadUrl ? (React.createElement("a", { href: resource.downloadUrl, className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm transition-colors" },
                                React.createElement(lucide_react_1.Download, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                "Download")) : resource.url ? (React.createElement("a", { href: resource.url, target: "_blank", rel: "noopener noreferrer", className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm transition-colors" },
                                React.createElement(lucide_react_1.ExternalLink, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                "View")) : (React.createElement("button", { className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium text-xs sm:text-sm transition-colors" }, "Coming Soon"))))));
                })))),
            searchQuery === '' && selectedCategory === 'all' && selectedType === 'all' && selectedDifficulty === 'all' && (React.createElement("div", { className: "mb-6 sm:mb-8 md:mb-12" },
                React.createElement("h2", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6" }, "Browse by Category"),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6" }, categories.map(function (category) {
                    var IconComponent = category.icon;
                    return (React.createElement("button", { key: category.id, onClick: function () { return setSelectedCategory(category.id); }, className: "bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-left group" },
                        React.createElement("div", { className: "w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br " + category.color + " rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4" },
                            React.createElement(IconComponent, { className: "h-5 w-5 sm:h-6 sm:w-6 text-white" })),
                        React.createElement("h3", { className: "font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-indigo-700 transition-colors text-sm sm:text-base" }, category.title),
                        React.createElement("p", { className: "text-gray-900 text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3" }, category.description),
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("span", { className: "text-[10px] sm:text-xs text-gray-900" },
                                category.count,
                                " resources"),
                            React.createElement(lucide_react_1.ChevronRight, { className: "h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" }))));
                })))),
            React.createElement("div", null,
                React.createElement("div", { className: "flex items-center justify-between mb-3 sm:mb-4 md:mb-6" },
                    React.createElement("h2", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900" }, selectedCategory !== 'all'
                        ? ((_a = categories.find(function (cat) { return cat.id === selectedCategory; })) === null || _a === void 0 ? void 0 : _a.title) || 'Resources'
                        : 'All Resources'),
                    React.createElement("span", { className: "text-gray-900 text-xs sm:text-sm" },
                        filteredResources.length,
                        " ",
                        filteredResources.length === 1 ? 'resource' : 'resources')),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6" }, filteredResources.map(function (resource) {
                    var TypeIcon = getTypeIcon(resource.type);
                    var FormatIcon = getFormatIcon(resource.format);
                    return (React.createElement("div", { key: resource.id, className: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group" },
                        React.createElement("div", { className: "aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden" },
                            React.createElement(image_1["default"], { src: resource.thumbnail, alt: resource.title, width: 400, height: 225, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" }),
                            React.createElement("div", { className: "absolute top-2 left-2" },
                                React.createElement("span", { className: "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full " + getDifficultyColor(resource.difficulty) }, resource.difficulty)),
                            React.createElement("div", { className: "absolute top-2 right-2" },
                                React.createElement("div", { className: "bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center" },
                                    React.createElement(FormatIcon, { className: "h-3 w-3 mr-1" }),
                                    resource.format)),
                            resource.featured && (React.createElement("div", { className: "absolute bottom-2 left-2" },
                                React.createElement("div", { className: "bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center" },
                                    React.createElement(lucide_react_1.Star, { className: "h-3 w-3 mr-1" }),
                                    "Featured")))),
                        React.createElement("div", { className: "p-3 sm:p-4" },
                            React.createElement("div", { className: "flex items-center mb-2" },
                                React.createElement(TypeIcon, { className: "h-4 w-4 text-indigo-600 mr-2" }),
                                React.createElement("span", { className: "text-[10px] sm:text-xs md:text-sm text-indigo-600 font-medium capitalize" }, resource.type)),
                            React.createElement("h3", { className: "font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-2 text-xs sm:text-sm md:text-base" }, resource.title),
                            React.createElement("p", { className: "text-[10px] sm:text-xs md:text-sm text-gray-900 mb-2 sm:mb-3 line-clamp-2" }, resource.description),
                            React.createElement("div", { className: "flex items-center justify-between text-[10px] sm:text-xs text-gray-900 mb-2 sm:mb-3" },
                                React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Eye, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                    resource.views.toLocaleString()),
                                React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Star, { className: "h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1" }),
                                    resource.rating),
                                resource.duration && (React.createElement("div", { className: "flex items-center" },
                                    React.createElement(lucide_react_1.Clock, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                    resource.duration))),
                            React.createElement("div", { className: "flex gap-2" }, resource.downloadUrl ? (React.createElement("a", { href: resource.downloadUrl, className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm transition-colors" },
                                React.createElement(lucide_react_1.Download, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                "Download")) : resource.url ? (React.createElement("a", { href: resource.url, target: "_blank", rel: "noopener noreferrer", className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs sm:text-sm transition-colors" },
                                React.createElement(lucide_react_1.ExternalLink, { className: "h-3 w-3 sm:h-4 sm:w-4 mr-1" }),
                                "View")) : (React.createElement("button", { className: "flex-1 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium text-xs sm:text-sm transition-colors" }, "Coming Soon"))))));
                })),
                filteredResources.length === 0 && (React.createElement("div", { className: "text-center py-6 sm:py-8 md:py-12" },
                    React.createElement(lucide_react_1.Search, { className: "h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" }),
                    React.createElement("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2" }, "No resources found"),
                    React.createElement("p", { className: "text-gray-900 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base" }, "Try adjusting your search criteria or browse different categories"),
                    React.createElement("button", { onClick: function () {
                            setSearchQuery('');
                            setSelectedCategory('all');
                            setSelectedType('all');
                            setSelectedDifficulty('all');
                        }, className: "inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm md:text-base" }, "Clear All Filters")))),
            React.createElement("div", { className: "mt-8 sm:mt-12 md:mt-16 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-6 md:p-8" },
                React.createElement(lucide_react_1.TrendingUp, { className: "h-10 w-10 sm:h-12 sm:w-12 text-indigo-600 mx-auto mb-2 sm:mb-3 md:mb-4" }),
                React.createElement("h2", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4" }, "Have a resource to share?"),
                React.createElement("p", { className: "text-gray-900 mb-4 sm:mb-5 md:mb-6 max-w-2xl mx-auto text-xs sm:text-sm md:text-base" }, "Help the community grow by suggesting valuable resources, tools, or tutorials that have helped you in your design journey."),
                React.createElement("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center" },
                    React.createElement(link_1["default"], { href: "/contact", className: "inline-flex items-center justify-center px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm md:text-base" },
                        React.createElement(lucide_react_1.Link, { className: "h-4 w-4 sm:h-5 sm:w-5 mr-2" }),
                        "Suggest Resource"),
                    React.createElement(link_1["default"], { href: "/help", className: "inline-flex items-center justify-center px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-xs sm:text-sm md:text-base" }, "Need Help?"))))));
}
exports["default"] = ResourcesPage;
