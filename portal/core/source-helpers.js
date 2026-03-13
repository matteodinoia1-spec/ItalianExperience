(function () {
  "use strict";

  var SOURCE_VALUES = [
    "public_form",
    "linkedin",
    "facebook",
    "direct_email",
    "job_application",
    "manual_internal",
    "other",
  ];

  var SOURCE_LABELS = {
    public_form: "Public Form",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    direct_email: "Direct Email",
    job_application: "Job Application",
    manual_internal: "Manual Internal",
    other: "Other",
  };

  function normalizeRawString(raw) {
    if (raw == null) return null;
    var s = String(raw).trim().toLowerCase();
    if (!s) return null;
    return s;
  }

  function normalizeSource(raw) {
    var normalized = normalizeRawString(raw);
    if (!normalized) return "other";

    if (SOURCE_VALUES.indexOf(normalized) !== -1) {
      return normalized;
    }

    // Treat underscores and multiple spaces as equivalent.
    var key = normalized.replace(/[_\s]+/g, " ").trim();

    switch (key) {
      // Public form / website
      case "website public form":
      case "website form":
      case "website":
      case "public form":
        return "public_form";

      // Direct email
      case "email":
      case "direct email":
        return "direct_email";

      // Social
      case "linkedin":
        return "linkedin";
      case "facebook":
      case "instagram":
        return "facebook";

      // Job application
      case "job application":
        return "job_application";

      // Manual / internal
      case "manual":
      case "internal":
      case "manual internal":
        return "manual_internal";

      default:
        return "other";
    }
  }

  function sourceToLabel(raw) {
    var key = normalizeSource(raw);
    return SOURCE_LABELS[key] || "Other";
  }

  window.IESourceRuntime = {
    values: SOURCE_VALUES.slice(),
    labels: SOURCE_LABELS,
    normalizeSource: normalizeSource,
    sourceToLabel: sourceToLabel,
  };
})();

