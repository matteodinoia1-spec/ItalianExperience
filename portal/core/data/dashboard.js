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
   * Count of external candidate submissions awaiting intake review.
   * Source of truth for dashboard "Inbound Submissions" card.
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getPendingReviewCount() {
    try {
      var result = await supabase
        .from("external_candidate_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");

      var count =
        result && typeof result.count === "number" ? result.count : 0;
      var error = result ? result.error : null;

      if (error) {
        console.error(
          "[Supabase] getPendingReviewCount error:",
          error.message || error,
          error
        );
        return { data: 0, error: error };
      }

      return { data: count, error: null };
    } catch (err) {
      console.error("[Supabase] getPendingReviewCount exception:", err);
      return { data: 0, error: err };
    }
  }

  /**
   * Preview rows for external candidate submissions awaiting review.
   * Used by the dashboard Inbound Submissions table.
   * @param {number} limit
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getPendingExternalSubmissionsPreview(limit) {
    var rowLimit =
      typeof limit === "number" && limit > 0 && limit <= 20 ? limit : 5;
    try {
      var result = await supabase
        .from("external_candidate_submissions")
        .select(
          "id, first_name, last_name, submission_type, status, created_at"
        )
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(rowLimit);

      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getPendingExternalSubmissionsPreview error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }

      var rows = Array.isArray(data) ? data : [];
      var mapped = rows.map(function (row) {
        var r = row || {};
        var first = (r.first_name || "").toString().trim();
        var last = (r.last_name || "").toString().trim();
        var fullName = (first + " " + last).trim() || "—";
        return Object.assign({}, r, {
          full_name_computed: fullName,
        });
      });

      return { data: mapped, error: null };
    } catch (err) {
      console.error(
        "[Supabase] getPendingExternalSubmissionsPreview exception:",
        err
      );
      return { data: [], error: err };
    }
  }

  /**
   * Count of applications (candidate_job_associations) with status 'hired' updated this month.
   * Recruitment pipeline metric; source of truth is candidate_job_associations.status.
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
        .from("candidate_job_associations")
        .select("id")
        .eq("status", "hired")
        .gte("updated_at", startOfMonth)
        .lt("updated_at", endOfMonth);
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
   * Job offers with client name and their job_posting (if any).
   * Used by dashboard Live Offers card; caller filters by effective live using
   * window.isEffectiveLive(offer, posting) (same rule as hero badge and job-offers list).
   * @returns {Promise<{ data: Array<{ offer: object, posting: object | null }>, error: object | null }>}
   */
  async function getJobOffersWithPostingsForDashboard() {
    try {
      var offersResult = await supabase
        .from("job_offers")
        .select("id, title, position, status, client_id, clients(id, name)")
        .or("is_archived.is.null,is_archived.eq.false")
        .order("created_at", { ascending: false })
        .limit(100);
      var offersRows = offersResult && offersResult.data ? offersResult.data : [];
      var offersError = offersResult ? offersResult.error : null;
      if (offersError) {
        console.error(
          "[Supabase] getJobOffersWithPostingsForDashboard offers error:",
          offersError.message || offersError,
          offersError
        );
        return { data: [], error: offersError };
      }
      var offers = (offersRows || []).map(function (r) {
        var client = r.clients || null;
        var clientName = (client && client.name) || null;
        return {
          id: r.id,
          title: r.title,
          position: r.position,
          status: r.status,
          client_id: r.client_id,
          client_name: clientName,
        };
      });
      var ids = offers.map(function (o) { return o.id; }).filter(Boolean);
      if (ids.length === 0) {
        return { data: offers.map(function (o) { return { offer: o, posting: null }; }), error: null };
      }
      var postingsResult = await supabase
        .from("job_postings")
        .select("id, job_offer_id, is_published, apply_enabled, apply_deadline, slug")
        .in("job_offer_id", ids);
      var postingsList = (postingsResult && postingsResult.data) ? postingsResult.data : [];
      var postingsError = postingsResult ? postingsResult.error : null;
      if (postingsError) {
        console.error(
          "[Supabase] getJobOffersWithPostingsForDashboard postings error:",
          postingsError.message || postingsError,
          postingsError
        );
      }
      var postingsByOfferId = {};
      (postingsList || []).forEach(function (p) {
        if (p && p.job_offer_id) {
          postingsByOfferId[String(p.job_offer_id)] = p;
        }
      });
      var data = offers.map(function (offer) {
        return {
          offer: offer,
          posting: postingsByOfferId[String(offer.id)] || null,
        };
      });
      return { data: data, error: null };
    } catch (err) {
      console.error(
        "[Supabase] getJobOffersWithPostingsForDashboard exception:",
        err
      );
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
        var raw = row && row.source != null ? row.source : null;
        var normalized = (function normalizeForDashboard(value) {
          var s = value == null ? "" : value.toString().trim();
          if (!s) return "other";
          try {
            if (
              window.IESourceRuntime &&
              typeof window.IESourceRuntime.normalizeSource === "function"
            ) {
              return window.IESourceRuntime.normalizeSource(s);
            }
          } catch (e) {
            // Fallback to manual normalization below
          }
          var lowered = s.toLowerCase();
          switch (lowered) {
            case "website":
            case "website form":
            case "website public form":
            case "public form":
              return "public_form";
            case "email":
            case "direct email":
              return "direct_email";
            case "linkedin":
              return "linkedin";
            case "facebook":
            case "instagram":
              return "facebook";
            case "job application":
              return "job_application";
            case "manual":
            case "internal":
            case "manual internal":
              return "manual_internal";
            default:
              return "other";
          }
        })(raw);
        bySource[normalized] = (bySource[normalized] || 0) + 1;
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
    getPendingReviewCount: getPendingReviewCount,
    getHiredThisMonth: getHiredThisMonth,
    getRecentCandidates: getRecentCandidates,
    getCandidatesBySource: getCandidatesBySource,
    getPendingExternalSubmissionsPreview: getPendingExternalSubmissionsPreview,
    getJobOffersWithPostingsForDashboard: getJobOffersWithPostingsForDashboard,
  };
})();

