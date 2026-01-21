"use client";
"use strict";
exports.__esModule = true;
exports.Providers = void 0;
var react_1 = require("next-auth/react");
var react_hot_toast_1 = require("react-hot-toast");
var LanguageContext_1 = require("@/contexts/LanguageContext");
var CurrencyProvider_1 = require("@/components/CurrencyProvider");
var OnboardingTour_1 = require("@/components/onboarding/OnboardingTour");
function Providers(_a) {
    var children = _a.children;
    return (React.createElement(react_1.SessionProvider, { basePath: "/api/auth", refetchInterval: 5 * 60, refetchOnWindowFocus: true },
        React.createElement(LanguageContext_1.LanguageProvider, null,
            React.createElement(CurrencyProvider_1.CurrencyProvider, null,
                children,
                React.createElement(OnboardingTour_1.OnboardingTour, null),
                React.createElement(react_hot_toast_1.Toaster, { position: "top-right" })))));
}
exports.Providers = Providers;
