// ============================================================================
// Italian Experience – Dashboard data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all dashboard-related Supabase operations:
//   - Aggregate KPIs for candidates and job offers
//   - Recent candidates list
//   - Candidates-by-source distribution
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.dashboard
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.dashboard] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/dashboard.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Dashboard stats (real-time from candidates + job_offers)
  // ---------------------------------------------------------------------------
  // Candidates table: id, first_name, last_name, position, status, source,
  // created_at, is_archived (and created_by)
  // Job offers table: id, status, is_archived, ...

  /**
   * Total count of candidates (non-archived only).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getTotalCandidates() {
    try {
      var q = supabase
        .from("candidates")
        .select("*", { count: "exact", head: true });
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      var result = await q;
      var count = result && typeof result.count === "number" ? result.count : 0;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getTotalCandidates error:",
          error.message || error,
          error
        );
        return { data: 0, error: error };
      }
      return { data: count, error: null };
    } catch (err) {
      console.error("[Supabase] getTotalCandidates exception:", err);
      return { data: 0, error: err };
    }
  }

  /**
   * Count of active job offers (non-archived).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getActiveJobOffers() {
    try {
      var q = supabase
        .from("job_offers")
        .select("*", { count: "exact", head: true });
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      try {
        q = q.in("status", ["open", "active", "inprogress", "in progress"]);
      } catch (_) {}
      var result = await q;
      var count = result && typeof result.count === "number" ? result.count : 0;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getActiveJobOffers error:",
          error.message || error,
          error
        );
        return { data: 0, error: error };
      }
      return { data: count, error: null };
    } catch (err) {
      console.error("[Supabase] getActiveJobOffers exception:", err);
      return { data: 0, error: err };
    }
  }

  /**
   * Count of candidates created today (server date).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getNewCandidatesToday() {
    try {
      var now = new Date();
      var startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      var endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      ).toISOString();
      var result = await supabase
        .from("candidates")
        .select("id")
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getNewCandidatesToday error:",
          error.message || error,
          error
        );
        return { data: 0, error: error };
      }
      return { data: (data || []).length, error: null };
    } catch (err) {
      console.error("[Supabase] getNewCandidatesToday exception:", err);
      return { data: 0, error: err };
    }
  }

  /**
   * Count of candidates with status 'hired' (or similar) created/updated this month.
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getHiredThisMonth() {
    try {
      var now = new Date();
      var startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();
      var endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      ).toISOString();
      var result = await supabase
        .from("candidates")
        .select("id")
        .eq("status", "hired")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getHiredThisMonth error:",
          error.message || error,
          error
        );
        return { data: 0, error: error };
      }
      return { data: (data || []).length, error: null };
    } catch (err) {
      console.error("[Supabase] getHiredThisMonth exception:", err);
      return { data: 0, error: err };
    }
  }

  /**
   * Recent candidates (non-archived, latest first), limit 10.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getRecentCandidates() {
    try {
      var q = supabase
        .from("candidates")
        .select(
          "id, first_name, last_name, position, status, source, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10);
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      var result = await q;
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getRecentCandidates error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] getRecentCandidates exception:", err);
      return { data: [], error: err };
    }
  }

  /**
   * Candidates grouped by source. Returns array of { source: string, count: number }.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidatesBySource() {
    try {
      var result = await supabase
        .from("candidates")
        .select("source")
        .eq("is_archived", false);
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getCandidatesBySource error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }
      var list = data || [];
      var bySource = {};
      list.forEach(function (row) {
        var s = (row.source || "other").toString().trim() || "other";
        bySource[s] = (bySource[s] || 0) + 1;
      });
      var total = list.length;
      var resultList = Object.keys(bySource).map(function (source) {
        var count = bySource[source];
        return {
          source: source,
          count: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });
      resultList.sort(function (a, b) {
        return b.count - a.count;
      });
      return { data: resultList, error: null };
    } catch (err) {
      console.error("[Supabase] getCandidatesBySource exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.dashboard
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.dashboard = {
    getTotalCandidates: getTotalCandidates,
    getActiveJobOffers: getActiveJobOffers,
    getNewCandidatesToday: getNewCandidatesToday,
    getHiredThisMonth: getHiredThisMonth,
    getRecentCandidates: getRecentCandidates,
    getCandidatesBySource: getCandidatesBySource,
  };
})();

