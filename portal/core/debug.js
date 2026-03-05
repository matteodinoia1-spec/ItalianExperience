// ============================================================================
// Italian Experience Portal - Development logging
// ----------------------------------------------------------------------------
// debugLog() only logs when ENV === "development". Production builds must not
// expose sensitive data (user id, email, profile, Supabase responses).
// Set window.__IE_ENV__ = "development" only in development (e.g. localhost).
// ============================================================================

(function () {
  "use strict";
  if (typeof window !== "undefined") {
    window.__IE_ENV__ = window.__IE_ENV__ || "production";
    window.debugLog = function () {
      if ((window.__IE_ENV__ || "production") !== "development") return;
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log.apply(console, arguments);
      }
    };
  }
})();
