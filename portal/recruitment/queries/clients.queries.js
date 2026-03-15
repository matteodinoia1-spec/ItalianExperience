// Italian Experience ATS – Clients query helpers
// Thin wrapper around existing IESupabase client APIs for centralized access.

(function () {
  "use strict";

  if (!window.IESupabase) {
    console.error(
      "[ClientsQueries] IESupabase is not available. Make sure core/supabase.js is loaded first."
    );
    return;
  }

  async function getClientsPaginated(options) {
    var opts = options || {};
    if (typeof window.IESupabase.fetchClientsPaginated !== "function") {
      return { data: [], totalCount: 0, error: new Error("fetchClientsPaginated not available") };
    }
    return window.IESupabase.fetchClientsPaginated({
      filters: opts.filters || {},
      page: opts.page || 1,
      limit: opts.limit || 25,
    });
  }

  async function searchClientsByName(term) {
    var name = (term || "").toString().trim();
    if (!name) {
      return { data: [], error: null };
    }
    if (typeof window.IESupabase.searchClientsByName !== "function") {
      return { data: [], error: new Error("searchClientsByName not available") };
    }
    return window.IESupabase.searchClientsByName(name);
  }

  window.IEQueries = window.IEQueries || {};
  window.IEQueries.clients = {
    getClientsPaginated: getClientsPaginated,
    searchClientsByName: searchClientsByName,
  };
})();

