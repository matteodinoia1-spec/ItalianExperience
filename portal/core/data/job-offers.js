// ============================================================================
// Italian Experience – Job Offers data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all job-offer-related Supabase operations:
//   - Job-offer CRUD
//   - Job-offer archive / unarchive
//   - Job-offer lists and pagination
//   - Job-offer search
//   - Job-offer detail fetching
//   - Job-offer status updates (including association side-effects)
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.jobOffers
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.jobOffers] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/job-offers.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local auth/session helpers (scoped to job-offers module)
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
        console.error(
          "[IEData.jobOffers] getSession error:",
          error.message || error,
          error
        );
        return { data: { session: null, user: null }, error: error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[IEData.jobOffers] Session",
          session && session.user ? "restored" : "none"
        );
      }
      return {
        data: { session: session, user: (session && session.user) || null },
        error: null,
      };
    } catch (err) {
      console.error("[IEData.jobOffers] getSession exception:", err);
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
        "[IEData.jobOffers] withUpdateAuditFields getSession error:",
        sessionResult.error.message || sessionResult.error,
        sessionResult.error
      );
      throw sessionResult.error;
    }
    var user = sessionResult.data && sessionResult.data.user;
    if (!user || !user.id) {
      var err = new Error("Not authenticated");
      console.error("[IEData.jobOffers] withUpdateAuditFields:", err);
      throw err;
    }
    return Object.assign({}, updates, {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  }

  // ---------------------------------------------------------------------------
  // Job offers – CRUD
  // ---------------------------------------------------------------------------

  /**
   * Insert a new job offer.
   * Expects table: job_offers (id, created_by, title, position, client_id, description,
   * requirements, notes, salary, contract_type, positions, city, state, deadline,
   * status, created_at, ...).
   * @param {object} payload - { client_id, title, position, description, requirements,
   *   notes, salary, contract_type, positions, city, state, deadline, status }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertJobOffer(payload) {
    var sessionResult = await getSession();
    var userId =
      sessionResult && sessionResult.data && sessionResult.data.user
        ? sessionResult.data.user.id
        : null;
    if (!userId) {
      var authErr = new Error("Not authenticated");
      console.error("[Supabase] insertJobOffer:", authErr);
      return { data: null, error: authErr };
    }
    try {
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase] insertJobOffer");
      }
      var row = {
        created_by: userId,
        client_id: payload.client_id || null,
        title: payload.title || "",
        position: payload.position || null,
        description: payload.description || null,
        requirements: payload.requirements || null,
        notes: payload.notes || null,
        salary: payload.salary || null,
        contract_type: payload.contract_type || null,
        positions: payload.positions ?? null,
        positions_required: Math.max(
          1,
          Number(
            payload.positions_required ?? payload.positions ?? 1
          )
        ),
        city: payload.city || null,
        state: payload.state || null,
        deadline: payload.deadline || null,
        status: payload.status || "active",
      };
      var insertResult = await supabase
        .from("job_offers")
        .insert(row)
        .select()
        .single();
      var data = insertResult ? insertResult.data : null;
      var error = insertResult ? insertResult.error : null;
      if (error) {
        console.error(
          "[Supabase] insertJobOffer error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] insertJobOffer exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Fetch a single job offer by id.
   * @param {string} id - job_offer id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobOfferById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var result = await supabase
        .from("job_offers")
        .select("*")
        .eq("id", id)
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error("[Supabase] getJobOfferById error:", error);
        return { data: null, error: error };
      }
      if (!data) {
        return { data: null, error: null };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] getJobOfferById exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Wrapper used by UI code; delegates to getJobOfferById.
   * @param {string} id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function fetchJobOfferById(id) {
    return getJobOfferById(id);
  }

  /**
   * Update an existing job offer by id.
   * @param {string} id - job_offer id
   * @param {object} payload - fields to update (same shape as insertJobOffer payload)
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobOffer(id, payload) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var baseUpdates = {
        client_id: payload.client_id ?? null,
        title: payload.title ?? "",
        position: payload.position ?? null,
        description: payload.description ?? null,
        requirements: payload.requirements ?? null,
        notes: payload.notes ?? null,
        salary: payload.salary ?? null,
        contract_type: payload.contract_type ?? null,
        positions: payload.positions ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        deadline: payload.deadline ?? null,
        status: payload.status ?? "open",
      };
      if (
        payload.positions !== undefined ||
        payload.positions_required !== undefined
      ) {
        baseUpdates.positions_required = Math.max(
          1,
          Number(
            payload.positions_required ?? payload.positions ?? 1
          )
        );
      }
      var updates = await withUpdateAuditFields(baseUpdates);
      var result = await supabase
        .from("job_offers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] updateJobOffer error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] updateJobOffer exception:", e);
      return { data: null, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers – status updates
  // ---------------------------------------------------------------------------

  /**
   * Update only the status of a job offer (lifecycle: active | closed | archived).
   * Mirrors the original core/supabase.js behavior, including side-effects on
   * candidate_job_associations and candidate availability.
   * @param {string} id - job_offer id
   * @param {string} status - "active" | "closed" | "archived"
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobOfferStatus(id, status) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var existingResult = await supabase
        .from("job_offers")
        .select("status")
        .eq("id", id)
        .single();
      var existing = existingResult ? existingResult.data : null;
      var fetchError = existingResult ? existingResult.error : null;

      if (fetchError) {
        console.error(
          "[Supabase] updateJobOfferStatus fetch error:",
          fetchError.message || fetchError,
          fetchError
        );
        return { data: null, error: fetchError };
      }

      var oldStatus = (existing && existing.status) || null;

      var updateResult = await supabase
        .from("job_offers")
        .update({ status: status })
        .eq("id", id)
        .select()
        .single();
      var data = updateResult ? updateResult.data : null;
      var error = updateResult ? updateResult.error : null;

      if (error) {
        console.error(
          "[Supabase] updateJobOfferStatus update error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }

      // Manual close path: when transitioning into "closed", update associations and
      // then recalculate availability for affected candidates.
      if (oldStatus !== "closed" && status === "closed") {
        var assocResult = await supabase
          .from("candidate_job_associations")
          .update({ status: "not_selected" })
          .eq("job_offer_id", id)
          .not("status", "in", "(hired,rejected,not_selected,withdrawn)")
          .select("candidate_id");

        var updatedAssocs = assocResult ? assocResult.data : null;
        var assocError = assocResult ? assocResult.error : null;

        if (assocError) {
          console.error(
            "[Supabase] updateJobOfferStatus associations update error:",
            assocError.message || assocError,
            assocError,
            { jobOfferId: id }
          );
        } else if (Array.isArray(updatedAssocs) && updatedAssocs.length > 0) {
          var candidateIds = Array.from(
            new Set(
              updatedAssocs
                .map(function (row) {
                  return row && row.candidate_id;
                })
                .filter(Boolean)
            )
          );

          // Delegate availability recalculation to the existing global facade
          // helper (to avoid duplicating cross-domain logic here).
          var recalc =
            window.IESupabase &&
            typeof window.IESupabase.recalculateCandidateAvailability ===
              "function"
              ? window.IESupabase.recalculateCandidateAvailability
              : null;

          if (recalc) {
            for (var i = 0; i < candidateIds.length; i++) {
              var candidateId = candidateIds[i];
              try {
                // eslint-disable-next-line no-await-in-loop
                await recalc(candidateId);
              } catch (recalcErr) {
                console.error(
                  "[Supabase] updateJobOfferStatus availability recalc error:",
                  recalcErr,
                  { candidateId: candidateId }
                );
              }
            }
          }
        }
      }

      return { data: data, error: null };
    } catch (err) {
      console.error("[Supabase] updateJobOfferStatus exception:", err);
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers – lists and pagination
  // ---------------------------------------------------------------------------

  /**
   * Fetch all job offers (RLS should restrict if needed).
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchJobOffers() {
    try {
      var result = await supabase
        .from("job_offers")
        .select(
          "\n          *,\n          clients (\n            id,\n            name,\n            city,\n            state\n          )\n        "
        )
        .order("created_at", { ascending: false });
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] fetchJobOffers error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }
      return { data: data || [], error: null };
    } catch (e) {
      console.error("[Supabase] fetchJobOffers exception:", e);
      return { data: [], error: e };
    }
  }

  /**
   * Build job offers query with filters (same logic for count and data).
   * Filters: title, offerStatus, archived (is_archived-based), city, state, clientId,
   * contractType. Archived filter uses is_archived as the source of truth.
   */
  function buildJobOffersQuery(supabaseQuery, filters) {
    var q = supabaseQuery;

    if (filters.archived === "active") {
      q = q.eq("is_archived", false);
    } else if (filters.archived === "archived") {
      q = q.eq("is_archived", true);
    }

    if (filters.excludeArchivedStatus === true) {
      q = q.not("status", "eq", "archived");
    }
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.contractType) q = q.eq("contract_type", filters.contractType);
    if (filters.offerStatus === "active") {
      q = q.in("status", ["open", "inprogress", "active"]);
    } else if (filters.offerStatus) {
      q = q.eq("status", filters.offerStatus);
    }
    var titleTerm = (filters.title || "").trim();
    if (titleTerm) {
      var escapedTitle = titleTerm
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
      q = q.ilike("title", "%" + escapedTitle + "%");
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
    return q;
  }

  /**
   * Fetch job offers with filters and pagination. Returns total count (with same
   * filters) and page of data.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchJobOffersPaginated(opts) {
    var filters = opts && opts.filters ? opts.filters : {};
    var page = Math.max(1, parseInt((opts && opts.page) || 1, 10) || 1);
    var limit = Math.max(
      1,
      Math.min(100, parseInt((opts && opts.limit) || 10, 10) || 10)
    );
    var offset = (page - 1) * limit;

    try {
      var countQuery = buildJobOffersQuery(
        supabase.from("job_offers").select("*", { count: "exact", head: true }),
        filters
      );
      var countResult = await countQuery;
      var count = countResult ? countResult.count : null;
      var countError = countResult ? countResult.error : null;
      if (countError) {
        console.error(
          "[Supabase] fetchJobOffersPaginated count error:",
          countError.message || countError,
          countError
        );
        return { data: [], totalCount: 0, error: countError };
      }
      var totalCount = count != null ? count : 0;

      var dataQuery = buildJobOffersQuery(
        supabase
          .from("job_offers")
          .select(
            "\n            *,\n            clients (\n              id,\n              name,\n              city,\n              state\n            ),\n            candidate_job_associations (\n              id,\n              candidate_id,\n              candidates (\n                id,\n                is_archived\n              )\n            )\n          "
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
          "[Supabase] fetchJobOffersPaginated data error:",
          dataError.message || dataError,
          dataError
        );
        return { data: [], totalCount: totalCount, error: dataError };
      }
      var data = (rows || []).map(function (r) {
        var client = r.clients || null;
        var clientName = r.client_name || (client && client.name) || null;
        var location =
          r.location ||
          [r.city, r.state]
            .filter(function (x) {
              return x;
            })
            .join(", ");
        return {
          id: r.id,
          title: r.title,
          position: r.position,
          client_id: r.client_id,
          client_name: clientName,
          description: r.description,
          requirements: r.requirements,
          notes: r.notes,
          salary: r.salary,
          contract_type: r.contract_type,
          positions: r.positions,
          city: r.city,
          state: r.state,
          location: location,
          deadline: r.deadline,
          status: r.status,
          created_at: r.created_at,
          is_archived: r.is_archived,
          candidate_job_associations: Array.isArray(r.candidate_job_associations)
            ? r.candidate_job_associations
            : [],
        };
      });
      return { data: data, totalCount: totalCount, error: null };
    } catch (e) {
      console.error("[Supabase] fetchJobOffersPaginated exception:", e);
      return { data: [], totalCount: 0, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers – search
  // ---------------------------------------------------------------------------

  /**
   * Search job offers by title (for global header search).
   * @param {{ term: string, limit?: number }} opts
   * @returns {Promise<{ data: Array<{ id: string, title: string, position: string | null }>, error: object | null }>}
   */
  async function searchJobOffersByTitle(opts) {
    var term =
      opts && opts.term != null ? String(opts.term).trim() : "";
    var rawLimit = (opts && opts.limit) || 5;
    var limit = Math.max(1, Math.min(20, parseInt(rawLimit, 10) || 5));

    if (!term) {
      return { data: [], error: null };
    }

    try {
      var escaped = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
      var pattern = "%" + escaped + "%";

      var result = await supabase
        .from("job_offers")
        .select("id, title, position")
        .or("title.ilike." + pattern + ",position.ilike." + pattern)
        .or("is_archived.is.null,is_archived.eq.false")
        .order("title", { ascending: true })
        .limit(limit);
      var data = result ? result.data : null;
      var error = result ? result.error : null;

      if (error) {
        console.error(
          "[Supabase] searchJobOffersByTitle error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }

      var rows = (data || []).map(function (r) {
        return {
          id: r.id,
          title: r.title || r.position || "",
          position: r.position,
        };
      });
      return { data: rows, error: null };
    } catch (e) {
      console.error("[Supabase] searchJobOffersByTitle exception:", e);
      return { data: [], error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers – archive / unarchive
  // ---------------------------------------------------------------------------

  /**
   * Archive a job offer (set is_archived = true). Does not remove the record.
   * Mirrors core/supabase.js archiveJobOffer behavior, but scoped to this module.
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveJobOffer(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var result = await supabase
        .from("job_offers")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] archiveJobOffer error:",
          error.message || error,
          error,
          { id: id }
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] archiveJobOffer exception:", e, { id: id });
      return { data: null, error: e };
    }
  }

  /**
   * Restore a job offer from archive (set is_archived = false).
   * Mirrors core/supabase.js unarchiveJobOffer behavior, but scoped to this module.
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveJobOffer(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var result = await supabase
        .from("job_offers")
        .update({ is_archived: false })
        .eq("id", id)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] unarchiveJobOffer error:",
          error.message || error,
          error,
          { id: id }
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] unarchiveJobOffer exception:", e, { id: id });
      return { data: null, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.jobOffers
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.jobOffers = {
    insertJobOffer: insertJobOffer,
    getJobOfferById: getJobOfferById,
    fetchJobOfferById: fetchJobOfferById,
    updateJobOffer: updateJobOffer,
    updateJobOfferStatus: updateJobOfferStatus,
    archiveJobOffer: archiveJobOffer,
    unarchiveJobOffer: unarchiveJobOffer,
    fetchJobOffers: fetchJobOffers,
    fetchJobOffersPaginated: fetchJobOffersPaginated,
    searchJobOffersByTitle: searchJobOffersByTitle,
  };
})();

