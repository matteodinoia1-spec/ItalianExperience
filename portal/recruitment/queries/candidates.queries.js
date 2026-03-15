// Italian Experience ATS – Candidates query helpers
// Centralized helpers for candidate-related derived data (no direct Supabase access here).

(function () {
  "use strict";

  function deriveAvailabilityFromApplications(applications) {
    var rows = Array.isArray(applications) ? applications : [];
    var hasHired = false;
    var hasActive = false;

    for (var i = 0; i < rows.length; i++) {
      var s = (rows[i] && rows[i].status ? String(rows[i].status) : "").toLowerCase();
      if (!s) continue;
      if (s === "hired") {
        hasHired = true;
        break;
      }
      if (s === "new") s = "applied";
      if (s === "offered") s = "offer";
      if (["applied", "screening", "interview", "offer"].indexOf(s) !== -1) {
        hasActive = true;
      }
    }

    if (hasHired) return "working";
    if (hasActive) return "in_process";
    return "available";
  }

  window.IEQueries = window.IEQueries || {};
  window.IEQueries.candidates = {
    deriveAvailabilityFromApplications: deriveAvailabilityFromApplications,
  };
})();

