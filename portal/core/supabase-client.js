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

  if (typeof window.supabase === "undefined") {
    console.error(
      "[SupabaseClient] window.supabase not found. Include Supabase JS v2 from CDN before this script."
    );
    window.IESupabaseClient = null;
    return;
  }

  const supabaseUrl = "https://xgioojjmrjcurajgirpa.supabase.co".trim();
  const supabaseKey = "sb_publishable_36r1oFbqjUoktzPTCvxDWg_sSwhxhzM";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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

