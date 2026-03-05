// ============================================================================
// Italian Experience Recruitment Portal - Auth Facade
// ----------------------------------------------------------------------------
// Thin wrapper around Supabase auth utilities exposed via window.IESupabase.
// Centralizes authentication/session access for the portal.
// ============================================================================

(function () {
  "use strict";

  if (!window.IESupabase) {
    console.error("[IEAuth] IESupabase is not available. Supabase client not loaded.");
    window.IEAuth = null;
    return;
  }

  /**
   * Check authentication for the current user.
   * Delegates to IESupabase.requireAuth(), which enforces a redirect when needed.
   * @returns {Promise<object|undefined>} authenticated user or undefined if redirecting
   */
  async function checkAuth() {
    try {
      if (typeof window.IESupabase.requireAuth === "function") {
        return await window.IESupabase.requireAuth();
      }
      if (typeof window.IESupabase.enforceAuthGuard === "function") {
        return await window.IESupabase.enforceAuthGuard();
      }
      return undefined;
    } catch (err) {
      console.error("[IEAuth] checkAuth error:", err);
      if (typeof window.IESupabase.redirectToLogin === "function") {
        window.IESupabase.redirectToLogin();
      }
      return undefined;
    }
  }

  /**
   * Logout current user.
   * @returns {Promise<{ error: object | null }>}
   */
  async function logout() {
    if (typeof window.IESupabase.logout !== "function") {
      console.error("[IEAuth] logout not available on IESupabase.");
      return { error: new Error("Logout not available") };
    }
    return window.IESupabase.logout();
  }

  /**
   * Get current user session.
   * @returns {Promise<{ data: { session: object | null, user: object | null }, error: object | null }>}
   */
  async function getSession() {
    if (typeof window.IESupabase.getSession !== "function") {
      console.error("[IEAuth] getSession not available on IESupabase.");
      return { data: { session: null, user: null }, error: new Error("getSession not available") };
    }
    return window.IESupabase.getSession();
  }

  /**
   * Get current authenticated user convenience helper.
   * @returns {Promise<object|null>} user or null
   */
  async function getCurrentUser() {
    const { data, error } = await getSession();
    if (error) return null;
    return data && data.user ? data.user : null;
  }

  /**
   * Redirect to login page.
   */
  function redirectToLogin() {
    if (typeof window.IESupabase.redirectToLogin === "function") {
      window.IESupabase.redirectToLogin();
      return;
    }
    try {
      const base = (function () {
        const url = new URL(".", window.location.href);
        return url.href;
      })();
      window.location.href = base + "index.html";
    } catch {
      window.location.href = "index.html";
    }
  }

  window.IEAuth = {
    checkAuth,
    logout,
    getSession,
    getCurrentUser,
    redirectToLogin,
  };
})();

