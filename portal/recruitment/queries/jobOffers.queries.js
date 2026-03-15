// Italian Experience ATS – Job offers query helpers
// Thin wrapper around existing IESupabase job offer APIs for centralized access.

(function () {
  "use strict";

  if (!window.IESupabase) {
    console.error(
      "[JobOffersQueries] IESupabase is not available. Make sure core/supabase.js is loaded first."
    );
    return;
  }

  async function getJobOffersPaginated(options) {
    var opts = options || {};
    if (typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
      return { data: [], totalCount: 0, error: new Error("fetchJobOffersPaginated not available") };
    }
    return window.IESupabase.fetchJobOffersPaginated({
      filters: opts.filters || {},
      page: opts.page || 1,
      limit: opts.limit || 25,
    });
  }

  async function getJobOfferById(id) {
    if (!id) {
      return { data: null, error: new Error("Missing job offer id") };
    }
    if (typeof window.IESupabase.fetchJobOfferById === "function") {
      return window.IESupabase.fetchJobOfferById(id);
    }
    if (typeof window.IESupabase.getJobOfferById === "function") {
      return window.IESupabase.getJobOfferById(id);
    }
    return { data: null, error: new Error("Job offer fetch API not available") };
  }

  window.IEQueries = window.IEQueries || {};
  window.IEQueries.jobOffers = {
    getJobOffersPaginated: getJobOffersPaginated,
    getJobOfferById: getJobOfferById,
  };
})();

