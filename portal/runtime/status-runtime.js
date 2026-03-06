// ============================================================================
// Italian Experience Recruitment Portal - Status Runtime
// ----------------------------------------------------------------------------
// Centralizes status normalization helpers:
// - candidate status helpers
// - application status helpers
// - job offer status helpers
// - availability computation helpers
// Extracted from core/app-shell.js and core/lists-runtime.js.
// ============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Candidate status
  // ---------------------------------------------------------------------------

  function getCandidateStatusBadgeClass(status) {
    var s = status && typeof status === "string" ? status.trim().toLowerCase() : "";
    switch (s) {
      case "new":
        return "badge-new";
      case "applied":
        return "badge-applied";
      case "screening":
        return "badge-screening";
      case "interview":
        return "badge-interview";
      case "offer":
      case "offered":
        return "badge-offered";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      case "withdrawn":
        return "badge-withdrawn";
      case "not_selected":
        return "badge-neutral";
      default:
        return "badge-new";
    }
  }

  function formatCandidateStatusLabel(status) {
    var s = status && typeof status === "string" ? status.trim() : "";
    if (!s) return "New";
    if (s === "offered") return "Offer";
    switch (s) {
      case "new":
        return "New";
      case "applied":
        return "Applied";
      case "screening":
        return "Screening";
      case "interview":
        return "Interview";
      case "offer":
        return "Offer";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      case "withdrawn":
        return "Withdrawn";
      case "not_selected":
        return "Not Selected";
      default:
        return s;
    }
  }

  function getEffectiveCandidateStatus(candidate) {
    if (!candidate) return "new";

    var assocStatus = candidate.latest_association && candidate.latest_association.status;

    if (assocStatus === "hired") {
      return "hired";
    }

    if (assocStatus) {
      return assocStatus;
    }

    return "new";
  }

  function isCandidateHired(candidate) {
    var s = candidate && candidate.status != null ? String(candidate.status).toLowerCase() : "";
    return s === "hired";
  }

  // Dashboard-only candidate status helpers (legacy, from lists-runtime).
  function getDashboardCandidateStatusBadgeClass(status) {
    switch (status) {
      case "new":
        return "badge-new";
      case "interview":
        return "badge-interview";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge-new";
    }
  }

  function formatDashboardCandidateStatusLabel(status) {
    switch (status) {
      case "new":
        return "New";
      case "interview":
        return "Interview";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      default:
        return status ? String(status) : "New";
    }
  }

  // ---------------------------------------------------------------------------
  // Application status (ATS)
  // ---------------------------------------------------------------------------

  /** Canonical application statuses (ATS). Legacy: new→applied, offered→offer. */
  var APPLICATION_STATUS_CANONICAL = [
    "applied",
    "screening",
    "interview",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
    "not_selected",
  ];

  /**
   * Normalize stored status to canonical for display/UI.
   * @param {string} status - raw value from candidate_job_associations.status
   * @returns {string} canonical status
   */
  function normalizeApplicationStatusForDisplay(status) {
    if (!status || typeof status !== "string") return "applied";
    var s = status.trim().toLowerCase();
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
  }

  function getApplicationStatusBadgeClass(status) {
    var s = normalizeApplicationStatusForDisplay(status);
    switch (s) {
      case "applied":
        return "badge-applied";
      case "screening":
        return "badge-screening";
      case "interview":
        return "badge-interview";
      case "offer":
        return "badge-offered";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      case "withdrawn":
        return "badge-withdrawn";
      case "not_selected":
        return "badge-neutral";
      default:
        return "badge-applied";
    }
  }

  function formatApplicationStatusLabel(status) {
    var s = normalizeApplicationStatusForDisplay(status);
    switch (s) {
      case "applied":
        return "Applied";
      case "screening":
        return "Screening";
      case "interview":
        return "Interview";
      case "offer":
        return "Offer";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      case "withdrawn":
        return "Withdrawn";
      case "not_selected":
        return "Not Selected";
      default:
        return "Applied";
    }
  }

  // ---------------------------------------------------------------------------
  // Job offer status
  // ---------------------------------------------------------------------------

  // App-shell variant (normalizes active→open, "in progress"→inprogress).
  function normalizeOfferStatus(status) {
    var s = (status || "").toString().toLowerCase();
    if (s === "active") return "open";
    if (s === "in progress") return "inprogress";
    return s || "open";
  }

  function getOfferStatusBadgeClass(status) {
    switch (normalizeOfferStatus(status)) {
      case "open":
        return "badge-open";
      case "inprogress":
        return "badge-inprogress";
      case "closed":
        return "badge-closed";
      default:
        return "badge-open";
    }
  }

  function formatOfferStatusLabel(status) {
    switch (normalizeOfferStatus(status)) {
      case "open":
        return "Open";
      case "inprogress":
        return "In Progress";
      case "closed":
        return "Closed";
      default:
        return (status || "Open").toString();
    }
  }

  // Lists/legacy Job Offers list variant (keeps "active" label and does not
  // normalize "in progress" with a space).
  function getOfferStatusBadgeClassForList(status) {
    switch ((status || "").toString().toLowerCase()) {
      case "open":
      case "active":
        return "badge-open";
      case "inprogress":
        return "badge-inprogress";
      case "closed":
        return "badge-closed";
      default:
        return "badge-open";
    }
  }

  function formatOfferStatusLabelForList(status) {
    switch ((status || "").toString().toLowerCase()) {
      case "open":
        return "Open";
      case "active":
        return "Active";
      case "inprogress":
        return "In Progress";
      case "closed":
        return "Closed";
      default:
        return status || "Open";
    }
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  function normalizeAvailabilityStatus(raw) {
    var s = (raw || "").toString().toLowerCase();
    if (s === "available") return "available";
    if (s === "unavailable") return "unavailable";
    return "";
  }

  /**
   * Tri-state derived availability from applications (never stored in DB).
   * working = any application hired; in_process = any in applied/screening/interview/offer; else available.
   */
  function computeDerivedAvailability(applications) {
    if (!applications || !Array.isArray(applications) || applications.length === 0) return "available";
    var activeStatuses = ["applied", "screening", "interview", "offer", "new", "offered"];
    var hasHired = applications.some(function (a) {
      var s = (a && a.status && String(a.status)).toLowerCase();
      return s === "hired";
    });
    if (hasHired) return "working";
    var hasActive = applications.some(function (a) {
      var s = (a && a.status && String(a.status)).toLowerCase();
      return activeStatuses.indexOf(s) !== -1;
    });
    if (hasActive) return "in_process";
    return "available";
  }

  function computeCandidateAvailability(candidate) {
    if (!candidate) return "available";
    if (candidate.derived_availability) {
      return candidate.derived_availability;
    }
    if (candidate.candidate_job_associations && Array.isArray(candidate.candidate_job_associations)) {
      return computeDerivedAvailability(candidate.candidate_job_associations);
    }
    var explicit = normalizeAvailabilityStatus(candidate.availability_status);
    if (explicit) {
      return explicit === "unavailable" ? "in_process" : "available";
    }
    var assocStatus =
      candidate.latest_association && candidate.latest_association.status
        ? String(candidate.latest_association.status).toLowerCase()
        : "";
    if (
      assocStatus &&
      assocStatus !== "rejected" &&
      assocStatus !== "not_selected" &&
      assocStatus !== "withdrawn"
    ) {
      return "in_process";
    }
    return "available";
  }

  function getAvailabilityBadgeClass(candidateOrStatus) {
    var status =
      typeof candidateOrStatus === "string"
        ? candidateOrStatus
        : computeCandidateAvailability(candidateOrStatus);
    if (status === "working") return "badge-hired";
    if (status === "in_process") return "badge-inprogress";
    if (status === "unavailable") return "badge-closed";
    return "badge-open";
  }

  function formatAvailabilityLabel(candidateOrStatus) {
    var status =
      typeof candidateOrStatus === "string"
        ? candidateOrStatus
        : computeCandidateAvailability(candidateOrStatus);
    if (status === "working") return "Working";
    if (status === "in_process") return "In process";
    if (status === "unavailable") return "Unavailable";
    return "Available";
  }

  window.IEStatusRuntime = {
    // Candidate
    getCandidateStatusBadgeClass: getCandidateStatusBadgeClass,
    formatCandidateStatusLabel: formatCandidateStatusLabel,
    getEffectiveCandidateStatus: getEffectiveCandidateStatus,
    isCandidateHired: isCandidateHired,
    // Dashboard candidate
    getDashboardCandidateStatusBadgeClass: getDashboardCandidateStatusBadgeClass,
    formatDashboardCandidateStatusLabel: formatDashboardCandidateStatusLabel,
    // Applications
    APPLICATION_STATUS_CANONICAL: APPLICATION_STATUS_CANONICAL,
    normalizeApplicationStatusForDisplay: normalizeApplicationStatusForDisplay,
    getApplicationStatusBadgeClass: getApplicationStatusBadgeClass,
    formatApplicationStatusLabel: formatApplicationStatusLabel,
    // Job offers
    normalizeOfferStatus: normalizeOfferStatus,
    getOfferStatusBadgeClass: getOfferStatusBadgeClass,
    formatOfferStatusLabel: formatOfferStatusLabel,
    getOfferStatusBadgeClassForList: getOfferStatusBadgeClassForList,
    formatOfferStatusLabelForList: formatOfferStatusLabelForList,
    // Availability
    normalizeAvailabilityStatus: normalizeAvailabilityStatus,
    computeDerivedAvailability: computeDerivedAvailability,
    computeCandidateAvailability: computeCandidateAvailability,
    getAvailabilityBadgeClass: getAvailabilityBadgeClass,
    formatAvailabilityLabel: formatAvailabilityLabel,
  };
})();

