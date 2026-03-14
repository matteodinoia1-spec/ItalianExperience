// ============================================================================
// Italian Experience – Supabase client bootstrap
// ----------------------------------------------------------------------------
// Responsibilities:
// - Create a single Supabase client instance from the CDN `window.supabase`.
// - Expose it via `window.IESupabaseClient.supabase`.
// - Provide `getBasePath` used by auth/navigation helpers.
//
// This file must be loaded:
//   1. After the Supabase CDN script
//   2. Before `portal/core/supabase.js`
// ============================================================================

(function () {
  "use strict";

  if (typeof window.IEConfig === "undefined") {
    console.error(
      "[SupabaseClient] window.IEConfig is not defined. " +
        "Ensure assets/js/config.js is loaded before portal/core/supabase-client.js."
    );
    window.IESupabaseClient = null;
    return;
  }

  if (typeof window.supabase === "undefined") {
    console.error(
      "[SupabaseClient] window.supabase not found. Include Supabase JS v2 from CDN before this script."
    );
    window.IESupabaseClient = null;
    return;
  }

  var cfg = window.IEConfig || {};
  var supabaseUrl = (cfg && cfg.SUPABASE_URL) || null;
  var supabaseKey = (cfg && cfg.SUPABASE_ANON_KEY) || null;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[SupabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY in IEConfig. " +
        "Ensure assets/js/config.js defines window.IEConfig correctly."
    );
    window.IESupabaseClient = null;
    return;
  }

  const supabase = window.supabase.createClient(
    String(supabaseUrl).trim(),
    String(supabaseKey).trim()
  );

  function getBasePath() {
    try {
      const url = new URL(".", window.location.href);
      return url.href;
    } catch (e) {
      const path = (window.location.pathname || "").replace(/[^/]+$/, "");
      return (
        window.location.origin +
        (path || "/") +
        (path && !path.endsWith("/") ? "/" : "")
      );
    }
  }

  window.IESupabaseClient = {
    supabase,
    getBasePath,
  };
})();

