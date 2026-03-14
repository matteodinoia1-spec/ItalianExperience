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
    "client",
    "dashboard",
    "candidates",
    "applications",
    "application",
    "clients",
    "job-offers",
    "job-postings",
    "job-offer",
    "job-posting",
    "external-submissions",
    "external-submission",
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
      case "job-postings.html":
        return "job-postings";
      case "job-posting.html":
        return "job-posting";
      case "clients.html":
        return "clients";
      case "archived.html":
        return "archived";
      case "add-candidate.html":
        return "add-candidate";
      case "job-offer.html":
        return "job-offer";
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
      case "client.html":
        return "client";
      case "external-submissions.html":
        return "external-submissions";
      case "external-submission.html":
        return "external-submission";
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
        if (lastSegment.includes("job-postings")) return "job-postings";
        if (lastSegment.includes("job-posting")) return "job-posting";
        if (lastSegment.includes("job-offer")) return "job-offer";
        if (lastSegment.includes("client")) return "client";
        if (lastSegment.includes("external-submissions")) return "external-submissions";
        if (lastSegment.includes("external-submission")) return "external-submission";
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
