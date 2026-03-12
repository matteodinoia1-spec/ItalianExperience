// ============================================================================
// Italian Experience Recruitment Portal - Router Runtime
// ----------------------------------------------------------------------------
// Page key detection and protected-page checks. Used by app-shell for auth
// guard and by other runtime modules. Navigation helpers remain in core/router.js.
// ============================================================================

(function () {
  "use strict";

  // All pages that require authentication. Must stay in sync with app-shell usage.
  var PROTECTED_PAGES = new Set([
    "candidate",
    "dashboard",
    "candidates",
    "applications",
    "application",
    "clients",
    "job-offers",
    "profile",
    "archived",
    "add-candidate",
    "add-job-offer",
    "add-client",
    "settings",
    // Fallback: treat unknown pages (like entity detail views)
    // as protected so that auth + profile still run.
    "unknown",
  ]);

  /**
   * Determine which logical page we are on from the URL.
   * Replicates the logic previously in app-shell getCurrentPageKey().
   * @returns {string} Normalized page key (e.g. "dashboard", "candidate", "candidates").
   */
  function getPageKey() {
    var path = window.location.pathname || "";
    var lastSegment = path.split("/").filter(Boolean).pop() || "";

    switch (lastSegment) {
      case "dashboard.html":
        return "dashboard";
      case "candidates.html":
        return "candidates";
      case "applications.html":
        return "applications";
      case "application.html":
        return "application";
      case "job-offers.html":
        return "job-offers";
      case "clients.html":
        return "clients";
      case "archived.html":
        return "archived";
      case "add-candidate.html":
        return "add-candidate";
      case "add-job-offer.html":
        return "add-job-offer";
      case "add-client.html":
        return "add-client";
      case "profile.html":
      case "profile.htm":
        return "profile";
      case "settings.html":
      case "settings.htm":
        return "settings";
      case "candidate.html":
        return "candidate";
      case "index.html":
      case "":
        return "login";
      default:
        if (lastSegment.includes("add-job-offer")) return "add-job-offer";
        if (lastSegment.includes("add-candidate")) return "add-candidate";
        if (lastSegment.includes("add-client")) return "add-client";
        if (lastSegment.includes("dashboard")) return "dashboard";
        if (lastSegment.includes("candidates")) return "candidates";
        if (lastSegment.includes("applications")) return "applications";
        if (lastSegment.includes("job-offers")) return "job-offers";
        if (lastSegment.includes("archived")) return "archived";
        if (lastSegment.includes("profile")) return "profile";
        if (lastSegment.includes("settings")) return "settings";
        return "unknown";
    }
  }

  /**
   * Check if the given page key requires authentication.
   * @param {string} pageKey - Normalized page key from getPageKey().
   * @returns {boolean}
   */
  function isProtectedPage(pageKey) {
    return PROTECTED_PAGES.has(pageKey);
  }

  window.IERouterRuntime = {
    getPageKey: getPageKey,
    isProtectedPage: isProtectedPage,
  };
})();
