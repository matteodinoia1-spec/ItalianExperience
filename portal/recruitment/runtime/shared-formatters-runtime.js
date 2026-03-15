// ============================================================================
// Italian Experience Recruitment Portal - Shared Formatters Runtime
// ----------------------------------------------------------------------------
// Canonical escapeHtml, formatDate, formatDateTime for lists, header, and
// feature modules. Load before header-runtime, lists-runtime, and any module
// that builds HTML or formats dates.
// ============================================================================

(function () {
  "use strict";

  function escapeHtml(text) {
    if (text == null) return "";
    var div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Format a date value for display.
   * @param {string|number|Date|null|undefined} value - Date to format
   * @param {{ locale?: string, fallback?: string, day?: string, month?: string, year?: string }} [options] - Optional. Default: locale "it-IT", fallback "". For en-GB short month (e.g. job postings), pass { locale: "en-GB", day: "2-digit", month: "short", year: "numeric", fallback: "—" }.
   * @returns {string}
   */
  function formatDate(value, options) {
    var opts = options || {};
    var fallback = opts.fallback != null ? opts.fallback : "";
    if (!value) return fallback;
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return fallback;
      if (opts.locale === "en-GB" && (opts.month === "short" || opts.day)) {
        return d.toLocaleDateString("en-GB", {
          day: opts.day || "2-digit",
          month: opts.month || "short",
          year: opts.year || "numeric",
        });
      }
      return d.toLocaleDateString(opts.locale || "it-IT");
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Format a date-time value for display.
   * @param {string|number|Date|null|undefined} value - Date to format
   * @param {{ locale?: string, fallback?: string }} [options] - Optional. Default: locale "it-IT", fallback "".
   * @returns {string}
   */
  function formatDateTime(value, options) {
    var opts = options || {};
    var fallback = opts.fallback != null ? opts.fallback : "";
    if (!value) return fallback;
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return fallback;
      return d.toLocaleString(opts.locale || "it-IT");
    } catch (_) {
      return fallback;
    }
  }

  window.IEFormatters = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
  };

  if (typeof window.escapeHtml !== "function") {
    window.escapeHtml = escapeHtml;
  }
})();
