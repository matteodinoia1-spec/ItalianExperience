// ============================================================================
// Italian Experience – Clients data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all client-related Supabase operations:
//   - Client CRUD
//   - Client lists and pagination
//   - Client search
//   - Client archive / unarchive (with job-offer cascade on archive)
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.clients
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.clients] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/clients.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local auth/session helpers (scoped to clients module)
  // ---------------------------------------------------------------------------

  /**
   * Get current user session.
   * Mirrors window.IESupabase.getSession shape:
   *   { data: { session, user }, error }
   * @returns {Promise<{ data: { session: object | null, user: object | null }, error: object | null }>}
   */
  async function getSession() {
    try {
      var result = await supabase.auth.getSession();
      var session = result && result.data ? result.data.session : null;
      var error = result ? result.error : null;
      if (error) {
        console.error("[IEData.clients] getSession error:", error.message || error, error);
        return { data: { session: null, user: null }, error: error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[IEData.clients] Session",
          session && session.user ? "restored" : "none"
        );
      }
      return {
        data: { session: session, user: (session && session.user) || null },
        error: null,
      };
    } catch (err) {
      console.error("[IEData.clients] getSession exception:", err);
      return { data: { session: null, user: null }, error: err };
    }
  }

  /**
   * Internal helper: augment update payloads with audit fields.
   * - Requires an authenticated user.
   * - Adds updated_at (ISO string) and updated_by (user.id).
   * Mirrors core/supabase.js withUpdateAuditFields behavior.
   * @param {object} updates
   * @returns {Promise<object>} merged updates
   */
  async function withUpdateAuditFields(updates) {
    var sessionResult = await getSession();
    if (sessionResult.error) {
      console.error(
        "[IEData.clients] withUpdateAuditFields getSession error:",
        sessionResult.error.message || sessionResult.error,
        sessionResult.error
      );
      throw sessionResult.error;
    }
    var user = sessionResult.data && sessionResult.data.user;
    if (!user || !user.id) {
      var err = new Error("Not authenticated");
      console.error("[IEData.clients] withUpdateAuditFields:", err);
      throw err;
    }
    return Object.assign({}, updates, {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  }

  // ---------------------------------------------------------------------------
  // Clients – filters, CRUD, lists, search
  // ---------------------------------------------------------------------------

  /**
   * Build clients query with filters (same logic for count and data).
   * Filters: name, city, state, country, archived.
   * Columns: name, city, state, country, email, phone, is_archived.
   */
  function buildClientsQuery(supabaseQuery, filters) {
    var q = supabaseQuery;

    if (filters.archived === "active") {
      q = q.eq("is_archived", false);
    }
    if (filters.archived === "archived") q = q.eq("is_archived", true);

    var nameTerm = (filters.name || "").trim();
    if (nameTerm) {
      var escapedName = nameTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("name", "%" + escapedName + "%");
    }

    var cityTerm = (filters.city || "").trim();
    if (cityTerm) {
      var escapedCity = cityTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("city", "%" + escapedCity + "%");
    }

    var stateTerm = (filters.state || "").trim();
    if (stateTerm) {
      var escapedState = stateTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("state", "%" + escapedState + "%");
    }

    var countryTerm = (filters.country || "").trim();
    if (countryTerm) {
      var escapedCountry = countryTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("country", "%" + escapedCountry + "%");
    }

    return q;
  }

  /**
   * Insert a new client. Expects table: clients (id, created_by, name, city, state, country, email, phone, notes, is_archived, created_at).
   * @param {object} payload - { name, city?, state?, country?, email?, phone?, notes? }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertClient(payload) {
    var sessionResult = await getSession();
    var userId = sessionResult && sessionResult.data && sessionResult.data.user
      ? sessionResult.data.user.id
      : null;
    if (!userId) {
      var err = new Error("Not authenticated");
      console.error("[Supabase] insertClient:", err);
      return { data: null, error: err };
    }
    try {
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase] insertClient");
      }
      var row = {
        created_by: userId,
        name: payload.name || "",
        city: payload.city || null,
        state: payload.state || null,
        country: payload.country || null,
        email: payload.email || null,
        phone: payload.phone || null,
        notes: payload.notes || null,
        is_archived: false,
      };
      var insertResult = await supabase.from("clients").insert(row).select().single();
      var data = insertResult ? insertResult.data : null;
      var error = insertResult ? insertResult.error : null;
      if (error) {
        console.error("[Supabase] insertClient error:", error.message || error, error);
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] insertClient exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Get a single client by id.
   * @param {string} id - client id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getClientById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      // Use a simple, robust query shape to avoid join or view issues.
      var result = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error("[Supabase] getClientById error:", error);
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] getClientById exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Update an existing client by id.
   * @param {string} id - client id
   * @param {object} payload - { name, city?, state?, country?, email?, phone?, notes? }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateClient(id, payload) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var baseUpdates = {
        name: (payload.name ?? "").toString().trim() || null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        country: payload.country ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        notes: payload.notes ?? null,
      };
      var updates = await withUpdateAuditFields(baseUpdates);
      var result = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error("[Supabase] updateClient error:", error.message || error, error);
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] updateClient exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Fetch clients with filters and pagination. Returns total count (with same filters) and page of data.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchClientsPaginated(opts) {
    var filters = opts && opts.filters ? opts.filters : {};
    var page = Math.max(1, parseInt(opts && opts.page, 10) || 1);
    var limit = Math.max(1, Math.min(100, parseInt(opts && opts.limit, 10) || 10));
    var offset = (page - 1) * limit;

    try {
      var countQuery = buildClientsQuery(
        supabase.from("clients").select("*", { count: "exact", head: true }),
        filters
      );
      var countResult = await countQuery;
      var count = countResult ? countResult.count : null;
      var countError = countResult ? countResult.error : null;
      if (countError) {
        console.error(
          "[Supabase] fetchClientsPaginated count error:",
          countError.message || countError,
          countError
        );
        return { data: [], totalCount: 0, error: countError };
      }
      var totalCount = count != null ? count : 0;

      var dataQuery = buildClientsQuery(
        supabase
          .from("clients")
          .select(
            "\n            *,\n            job_offers (\n              id,\n              status,\n              is_archived\n            )\n          "
          ),
        filters
      );
      var dataResult = await dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      var rows = dataResult ? dataResult.data : null;
      var dataError = dataResult ? dataResult.error : null;

      if (dataError) {
        console.error(
          "[Supabase] fetchClientsPaginated data error:",
          dataError.message || dataError,
          dataError
        );
        return { data: [], totalCount: totalCount, error: dataError };
      }

      var data = (rows || []).map(function (r) {
        return {
          id: r.id,
          name: r.name,
          city: r.city,
          state: r.state,
          country: r.country,
          email: r.email,
          phone: r.phone,
          notes: r.notes,
          is_archived: !!r.is_archived,
          // Nested job_offers used by frontend to compute Active Offers per client
          job_offers: Array.isArray(r.job_offers) ? r.job_offers : [],
        };
      });

      return { data: data, totalCount: totalCount, error: null };
    } catch (e) {
      console.error("[Supabase] fetchClientsPaginated exception:", e);
      return { data: [], totalCount: 0, error: e };
    }
  }

  /**
   * Lightweight client search by name, for autocomplete widgets.
   * @param {{ term: string, limit?: number }} opts
   * @returns {Promise<{ data: Array<{ id: string, name: string }>, error: object | null }>}
   */
  async function searchClientsByName(opts) {
    var term = (opts && opts.term) || "";
    var rawLimit = (opts && opts.limit) || 5;
    var limit = Math.max(1, Math.min(20, parseInt(rawLimit, 10) || 5));

    if (!term.trim()) {
      return { data: [], error: null };
    }

    try {
      var escaped = term.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
      var pattern = "%" + escaped + "%";

      var result = await supabase
        .from("clients")
        .select("id, name")
        .ilike("name", pattern)
        .order("name", { ascending: true })
        .limit(limit);
      var data = result ? result.data : null;
      var error = result ? result.error : null;

      if (error) {
        console.error("[Supabase] searchClientsByName error:", error.message || error, error);
        return { data: [], error: error };
      }

      var rows = (data || []).map(function (r) {
        return { id: r.id, name: r.name || "" };
      });

      return { data: rows, error: null };
    } catch (e) {
      console.error("[Supabase] searchClientsByName exception:", e);
      return { data: [], error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Clients – archive / unarchive
  // ---------------------------------------------------------------------------

  /**
   * Archive a client (set is_archived = true). Does not remove the record.
   * Also soft-archives all job_offers for this client.
   * Mirrors core/supabase.js archiveClient behavior.
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveClient(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      // Soft archive the client itself.
      var clientResult = await supabase
        .from("clients")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();
      var clientRow = clientResult ? clientResult.data : null;
      var clientError = clientResult ? clientResult.error : null;

      if (clientError) {
        console.error(
          "[Supabase] archiveClient clients update error:",
          clientError.message || clientError,
          clientError,
          { id: id }
        );
        return { data: null, error: clientError };
      }

      // Soft cascade: archive ALL job offers belonging to this client.
      var offersResult = await supabase
        .from("job_offers")
        .update({ is_archived: true })
        .eq("client_id", id);
      var offersError = offersResult ? offersResult.error : null;

      if (offersError) {
        console.error(
          "[Supabase] archiveClient job_offers update error:",
          offersError.message || offersError,
          offersError,
          { id: id }
        );
        return { data: clientRow || null, error: offersError };
      }

      return { data: clientRow || null, error: null };
    } catch (e) {
      console.error("[Supabase] archiveClient exception:", e, { id: id });
      return { data: null, error: e };
    }
  }

  /**
   * Restore a client from archive (set is_archived = false).
   * Mirrors core/supabase.js unarchiveClient behavior (no cascade).
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveClient(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var result = await supabase
        .from("clients")
        .update({ is_archived: false })
        .eq("id", id)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] unarchiveClient error:",
          error.message || error,
          error,
          { id: id }
        );
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] unarchiveClient exception:", e, { id: id });
      return { data: null, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.clients
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.clients = {
    insertClient: insertClient,
    getClientById: getClientById,
    updateClient: updateClient,
    archiveClient: archiveClient,
    unarchiveClient: unarchiveClient,
    fetchClientsPaginated: fetchClientsPaginated,
    searchClientsByName: searchClientsByName,
  };
})();

