// ============================================================================
// Job posting apply_deadline – explicit timezone rule
// ----------------------------------------------------------------------------
// Public posting apply_deadline is interpreted as:
// - Date-only (YYYY-MM-DD) → end of that day 23:59:59 in America/New_York.
// - The posting is treated as closed after that moment.
// Used by: portal card, hero badge, lists, and (duplicated) public page.
// ============================================================================

(function () {
  "use strict";

  var TZ = "America/New_York";

  /**
   * Second Sunday of March (1-based day of month).
   * @param {number} y - year
   * @returns {number}
   */
  function getSecondSundayMarch(y) {
    var d = new Date(y, 2, 1);
    var firstSun = ((8 - d.getDay()) % 7) || 7;
    return firstSun + 7;
  }

  /**
   * First Sunday of November (1-based day of month).
   * @param {number} y - year
   * @returns {number}
   */
  function getFirstSundayNovember(y) {
    var d = new Date(y, 11, 1);
    return ((8 - d.getDay()) % 7) || 7;
  }

  /**
   * Whether the given calendar date (y, m, d) is in DST in America/New_York.
   * @param {number} y - year
   * @param {number} m - month 1-12
   * @param {number} d - day of month
   * @returns {boolean}
   */
  function isDSTEastern(y, m, d) {
    if (m < 3) return false;
    if (m > 11) return false;
    if (m === 3) return d >= getSecondSundayMarch(y);
    if (m === 11) return d < getFirstSundayNovember(y);
    return true;
  }

  /**
   * Converts a date-only string (YYYY-MM-DD) to the end of that day in
   * America/New_York (23:59:59.999) as a Date.
   * @param {string} dateOnlyStr - "YYYY-MM-DD"
   * @returns {Date|null}
   */
  function parseApplyDeadlineEndOfDayNY(dateOnlyStr) {
    if (!dateOnlyStr || typeof dateOnlyStr !== "string") return null;
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnlyStr.trim());
    if (!match) return null;
    var y = parseInt(match[1], 10);
    var m = parseInt(match[2], 10);
    var d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    // End of day NY: 23:59:59 NY → UTC next day 03:59:59 (EDT) or 04:59:59 (EST)
    var offset = isDSTEastern(y, m, d) ? -4 : -5;
    var hourUTC = 23 - offset;
    var dayOffset = hourUTC >= 24 ? 1 : 0;
    if (hourUTC >= 24) hourUTC -= 24;
    var ms = Date.UTC(y, m - 1, d + dayOffset, hourUTC, 59, 59, 999);
    return new Date(ms);
  }

  /**
   * Returns the UTC end-of-day moment for the given date-only string.
   * Used when normalizing before save (portal) so DB stores a consistent value.
   * @param {string} dateOnlyStr - "YYYY-MM-DD"
   * @returns {string|null} ISO string or null
   */
  function applyDeadlineToISOEndOfDayNY(dateOnlyStr) {
    var date = parseApplyDeadlineEndOfDayNY(dateOnlyStr);
    return date ? date.toISOString() : null;
  }

  /**
   * Whether the apply deadline has passed. Accepts either date-only (YYYY-MM-DD)
   * or full ISO string; date-only is interpreted as end of day America/New_York.
   * @param {string|null|undefined} applyDeadlineValue - from job_postings.apply_deadline
   * @returns {boolean}
   */
  function isApplyDeadlinePassed(applyDeadlineValue) {
    if (!applyDeadlineValue) return false;
    var s = String(applyDeadlineValue).trim();
    if (!s) return false;
    var deadlineMs;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var endOfDay = parseApplyDeadlineEndOfDayNY(s);
      deadlineMs = endOfDay ? endOfDay.getTime() : 0;
    } else {
      var d = new Date(s);
      deadlineMs = isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return deadlineMs > 0 && deadlineMs < Date.now();
  }

  window.IEJobPostingDeadline = {
    TZ: TZ,
    parseApplyDeadlineEndOfDayNY: parseApplyDeadlineEndOfDayNY,
    applyDeadlineToISOEndOfDayNY: applyDeadlineToISOEndOfDayNY,
    isApplyDeadlinePassed: isApplyDeadlinePassed,
  };
})();
