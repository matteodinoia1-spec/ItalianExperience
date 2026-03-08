// ============================================================================
// Italian Experience Recruitment Portal - Session Ready (boot cache)
// ----------------------------------------------------------------------------
// Minimal abstraction: one shared promise for session during the current page
// load. Reduces repeated getSession() calls during bootstrap.
// Load after core/auth.js; use getSessionReady() instead of getSession() in
// boot paths when the same session is sufficient.
// ============================================================================

(function () {
  "use strict";

  var cachedPromise = null;

  /**
   * Returns a promise that resolves to the current session result (same shape
   * as IESupabase.getSession()). Resolves once per page load; subsequent
   * calls return the same promise.
   * @returns {Promise<{ data: { session: object | null, user: object | null }, error: object | null }>}
   */
  function getSessionReady() {
    if (cachedPromise) return cachedPromise;
    if (!window.IESupabase || typeof window.IESupabase.getSession !== "function") {
      cachedPromise = Promise.resolve({
        data: { session: null, user: null },
        error: new Error("getSession not available"),
      });
      return cachedPromise;
    }
    cachedPromise = window.IESupabase.getSession();
    return cachedPromise;
  }

  window.IESessionReady = {
    getSessionReady: getSessionReady,
  };
})();
