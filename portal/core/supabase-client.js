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
  // Must be the anon key for the same project (ref: xgioojjmrjcurajgirpa) so session JWTs
  // are valid for this project's Edge Functions gateway. Do not use a key from another project.
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaW9vamptcmpjdXJhamdpcnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjI3MDksImV4cCI6MjA4NzQ5ODcwOX0.fcJe-f4V_aGEaGEfD2N2el2Y-I2rqy3fO6fURu7Ennk";
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

  function getSupabaseUrl() {
    return supabaseUrl;
  }

  function getSupabaseKey() {
    return supabaseKey;
  }

  window.IESupabaseClient = {
    supabase,
    getBasePath,
    getSupabaseUrl,
    getSupabaseKey,
  };
})();

