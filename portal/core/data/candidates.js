// ============================================================================
// Italian Experience – Candidates data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all candidate-related Supabase operations:
//   - Candidate CRUD
//   - Candidate lists and pagination
//   - Candidate search
//   - Candidate profile sections (skills, languages, experience, education,
//     certifications, hobbies)
//   - Candidate file/storage helpers
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.candidates
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.candidates] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/candidates.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local auth/session helpers (scoped to candidates module)
  // ---------------------------------------------------------------------------

  /**
   * Get current user session.
   * Mirrors window.IESupabase.getSession shape:
   *   { data: { session, user }, error }
   * @returns {Promise<{ data: { session: object | null, user: object | null }, error: object | null }>}
   */
  async function getSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("[IEData.candidates] getSession error:", error.message, error);
        return { data: { session: null, user: null }, error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[IEData.candidates] Session",
          session && session.user ? "restored" : "none"
        );
      }
      return { data: { session, user: (session && session.user) || null }, error: null };
    } catch (err) {
      console.error("[IEData.candidates] getSession exception:", err);
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
    const { data, error } = await getSession();
    if (error) {
      console.error(
        "[IEData.candidates] withUpdateAuditFields getSession error:",
        error.message || error,
        error
      );
      throw error;
    }
    const user = data && data.user;
    if (!user || !user.id) {
      const err = new Error("Not authenticated");
      console.error("[IEData.candidates] withUpdateAuditFields:", err);
      throw err;
    }
    return Object.assign({}, updates, {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  }

  /**
   * Get current authenticated user id.
   * Mirrors core/supabase.js getCurrentUserId behavior.
   * @returns {Promise<string>}
   */
  async function getCurrentUserId() {
    const { data: sessionData, error } = await getSession();
    if (error) {
      throw error;
    }
    const userId = sessionData && sessionData.user && sessionData.user.id;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return userId;
  }

  // ---------------------------------------------------------------------------
  // Candidates – CRUD and lists
  // ---------------------------------------------------------------------------

  /**
   * Insert a new candidate (created_by = current user id).
   * Expects table: candidates (id, created_by, first_name, last_name, position, address, status, source, notes, created_at, ...).
   * Client is linked via candidate_job_associations -> job_offers -> clients; do not send client_name.
   * @param {object} payload - { first_name, last_name, position, address, status, source, notes }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertCandidate(payload) {
    const { data: sessionData } = await getSession();
    const userId = sessionData && sessionData.user && sessionData.user.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] insertCandidate:", err);
      return { data: null, error: err };
    }
    try {
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase] insertCandidate");
      }
      const row = {
        created_by: userId,
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        position: payload.position || null,
        address: payload.address || null,
        status: payload.status || "new",
        source: payload.source || null,
        notes: payload.notes || null,
        email: payload.email || null,
        phone: payload.phone || null,
        linkedin_url: payload.linkedin_url || null,
        date_of_birth: payload.date_of_birth || null,
        summary: payload.summary || null,
        is_archived: false,
      };
      const { data, error } = await supabase
        .from("candidates")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] insertCandidate error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] insertCandidate exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch a single candidate by id (for edit page).
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getCandidateById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select(
          `
            *,
            created_by_profile:profiles!candidates_created_by_profiles_fkey(
              id,
              first_name,
              last_name
            ),
            updated_by_profile:profiles!candidates_updated_by_profiles_fkey(
              id,
              first_name,
              last_name
            ),
            candidate_job_associations (
              job_offer_id,
              job_offers (
                id,
                title,
                position,
                city,
                state,
                clients (
                  id,
                  name,
                  city,
                  state
                )
              )
            )
          `
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("[Supabase] getCandidateById error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateById exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Update an existing candidate by id.
   * @param {string} id - candidate id
   * @param {object} payload - { first_name, last_name, position, address, status, source, notes }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateCandidate(id, payload) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const baseUpdates = {
        first_name: payload.first_name ?? "",
        last_name: payload.last_name ?? "",
        position: payload.position ?? null,
        address: payload.address ?? null,
        status: payload.status ?? "new",
        source: payload.source ?? null,
        notes: payload.notes ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        linkedin_url: payload.linkedin_url ?? null,
        date_of_birth: payload.date_of_birth ?? null,
        summary: payload.summary ?? null,
      };
      const updates = await withUpdateAuditFields(baseUpdates);
      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateCandidate error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateCandidate exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch all candidates created by the logged-in user.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchMyCandidates() {
    const { data: sessionData } = await getSession();
    const userId = sessionData && sessionData.user && sessionData.user.id;
    if (!userId) return { data: [], error: null };
    try {
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase] fetchMyCandidates");
      }
      const { data, error } = await supabase
        .from("candidates")
        .select(
          `
          *,
          candidate_job_associations (
            job_offer_id,
            job_offers (
              id,
              title,
              position,
              city,
              state,
              clients (
                id,
                name,
                city,
                state
              )
            )
          )
        `
        )
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase] fetchMyCandidates error:", error.message, error);
        return { data: [], error };
      }
      const rows = (data || []).map(function (r) {
        let clientName = r.client_name || null;
        if (
          !clientName &&
          Array.isArray(r.candidate_job_associations) &&
          r.candidate_job_associations.length > 0
        ) {
          const assoc = r.candidate_job_associations[0];
          const job = assoc && assoc.job_offers;
          const client = job && job.clients;
          if (client && client.name) {
            clientName = client.name;
          }
        }
        return Object.assign({}, r, { client_name: clientName });
      });
      return { data: rows, error: null };
    } catch (err) {
      console.error("[Supabase] fetchMyCandidates exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidates – archive / unarchive
  // ---------------------------------------------------------------------------

  /**
   * Archive a candidate (set is_archived = true). Does not remove the record.
   * Mirrors core/supabase.js archiveCandidate behavior.
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveCandidate(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("candidates")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] archiveCandidate error:", error.message, error, { id });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] archiveCandidate exception:", err, { id });
      return { data: null, error: err };
    }
  }

  /**
   * Restore a candidate from archive (set is_archived = false).
   * Mirrors core/supabase.js unarchiveCandidate behavior.
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveCandidate(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("candidates")
        .update({ is_archived: false })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] unarchiveCandidate error:", error.message, error, { id });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] unarchiveCandidate exception:", err, { id });
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidates – paginated lists and search
  // ---------------------------------------------------------------------------

  /**
   * Build candidates query with filters (same logic for count and data).
   * Filters: name, position, address, status, source, archived.
   * Columns: first_name, last_name, position, address, status, source, is_archived, created_by.
   */
  function buildCandidatesQuery(supabaseQuery, filters) {
    let q = supabaseQuery;
    if (filters.archived === "active") q = q.eq("is_archived", false);
    if (filters.archived === "archived") q = q.eq("is_archived", true);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.source) q = q.eq("source", filters.source);
    const nameTerm = (filters.name || "").trim().replace(/,/g, " ");
    if (nameTerm) {
      const escaped = nameTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const pattern = "%" + escaped + "%";
      q = q.or("first_name.ilike." + pattern + ",last_name.ilike." + pattern);
    }
    const posTerm = (filters.position || "").trim();
    if (posTerm) {
      const escaped = posTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("position", "%" + escaped + "%");
    }
    const addrTerm = (filters.address || "").trim();
    if (addrTerm) {
      const escaped = addrTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("address", "%" + escaped + "%");
    }
    return q;
  }

  /**
   * Fetch candidates with filters and pagination. Returns total count (with same filters) and page of data.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchCandidatesPaginated(opts) {
    const { data: sessionData } = await getSession();
    const userId = sessionData && sessionData.user && sessionData.user.id;
    if (!userId) return { data: [], totalCount: 0, error: null };

    const filters = opts.filters || {};
    const jobOfferId = filters.jobOfferId || null;
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 10));
    const offset = (page - 1) * limit;

    try {
      let candidateIdsForOffer = null;

      if (jobOfferId) {
        const { data: assocRows, error: assocError } = await supabase
          .from("candidate_job_associations")
          .select("candidate_id")
          .eq("job_offer_id", jobOfferId);

        if (assocError) {
          console.error(
            "[Supabase] fetchCandidatesPaginated associations error:",
            assocError.message
          );
          return { data: [], totalCount: 0, error: assocError };
        }

        const candidateIds = Array.isArray(assocRows)
          ? Array.from(
              new Set(
                assocRows
                  .map(function (r) {
                    return r && r.candidate_id;
                  })
                  .filter(function (id) {
                    return !!id;
                  })
              )
            )
          : [];

        if (!candidateIds.length) {
          return { data: [], totalCount: 0, error: null };
        }

        candidateIdsForOffer = candidateIds;
      }

      let baseCountQuery = supabase
        .from("candidates")
        .select("*", { count: "exact", head: true });
      if (candidateIdsForOffer && candidateIdsForOffer.length) {
        baseCountQuery = baseCountQuery.in("id", candidateIdsForOffer);
      }

      const countQuery = buildCandidatesQuery(baseCountQuery, filters);
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error(
          "[Supabase] fetchCandidatesPaginated count error:",
          countError.message
        );
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count != null ? count : 0;

      let baseDataQuery = supabase
        .from("candidates")
        .select(
          `
            *,
            candidate_job_associations (
              id,
              status,
              created_at,
              job_offer_id,
              job_offers (
                id,
                title,
                position,
                city,
                state,
                clients (
                  id,
                  name,
                  city,
                  state
                )
              )
            )
          `
        );

      if (candidateIdsForOffer && candidateIdsForOffer.length) {
        baseDataQuery = baseDataQuery.in("id", candidateIdsForOffer);
      }

      const dataQuery = buildCandidatesQuery(baseDataQuery, filters);
      const { data: rows, error: dataError } = await dataQuery
        .order("created_at", { foreignTable: "candidate_job_associations", ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        console.error(
          "[Supabase] fetchCandidatesPaginated data error:",
          dataError.message
        );
        return { data: [], totalCount, error: dataError };
      }
      function computeDerivedAvailabilityFromAssociations(associations) {
        if (!Array.isArray(associations) || associations.length === 0) return "available";
        const activeStatuses = ["applied", "screening", "interview", "offer", "new", "offered"];
        const hasHired = associations.some(function (a) {
          const s = (a && a.status && String(a.status)).toLowerCase();
          return s === "hired";
        });
        if (hasHired) return "working";
        const hasActive = associations.some(function (a) {
          const s = (a && a.status && String(a.status)).toLowerCase();
          return s === "hired" || activeStatuses.indexOf(s) !== -1;
        });
        if (hasActive) return "in_process";
        return "available";
      }

      const data = (rows || []).map(function (r) {
        let latestAssociation = null;
        if (
          Array.isArray(r.candidate_job_associations) &&
          r.candidate_job_associations.length > 0
        ) {
          latestAssociation = r.candidate_job_associations[0];
        }

        let latestJob =
          latestAssociation && latestAssociation.job_offers
            ? latestAssociation.job_offers
            : null;
        let latestClient = latestJob && latestJob.clients ? latestJob.clients : null;

        const latestClientName =
          r.client_name || (latestClient && latestClient.name) || null;

        const latestJobLocation = latestJob
          ? [latestJob.city, latestJob.state]
              .filter(function (x) {
                return x;
              })
              .join(", ")
          : null;

        const latestAssociationStatus =
          latestAssociation && latestAssociation.status
            ? latestAssociation.status
            : null;

        const derived_availability = computeDerivedAvailabilityFromAssociations(
          r.candidate_job_associations
        );

        return {
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          position: r.position,
          address: r.address,
          status: r.status,
          source: r.source,
          notes: r.notes,
          created_at: r.created_at,
          is_archived: r.is_archived,
          client_name: latestClientName,
          photo_url: r.photo_url,
          cv_url:
            typeof r.cv_url === "string" && r.cv_url.trim().length > 0
              ? r.cv_url
              : null,
          derived_availability: derived_availability,
          latest_association: latestAssociation
            ? {
                id: latestAssociation.id,
                status: latestAssociationStatus,
                created_at: latestAssociation.created_at,
                job_offer_id: latestAssociation.job_offer_id,
                job_title: latestJob ? latestJob.title : null,
                job_location: latestJobLocation,
                client_name: latestClientName,
                client_id: latestClient ? latestClient.id : null,
              }
            : null,
        };
      });
      return { data, totalCount, error: null };
    } catch (err) {
      console.error("[Supabase] fetchCandidatesPaginated exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  /**
   * Search candidates by first or last name (no created_by filter).
   * For autocomplete so candidates appear even after association removal.
   * @param {{ term?: string, limit?: number }} opts
   * @returns {Promise<{ data: Array, error: object | null }>}
   */
  async function searchCandidatesByName(opts) {
    const term =
      opts && opts.term != null ? String(opts.term).trim() : "";
    const limit = Math.max(
      1,
      Math.min(100, parseInt((opts && opts.limit) || 10, 10) || 10)
    );

    if (!term || term.length < 2) {
      return { data: [], error: null };
    }

    try {
      const safeTerm = term.replace(/,/g, " ");
      const escaped = safeTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const pattern = "%" + escaped + "%";

      const { data, error } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, position, is_archived")
        .or("first_name.ilike." + pattern + ",last_name.ilike." + pattern)
        .or("is_archived.is.null,is_archived.eq.false")
        .order("first_name", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("[Supabase] searchCandidatesByName error:", error.message, error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] searchCandidatesByName exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidate file storage helpers (Supabase Storage)
  // ---------------------------------------------------------------------------

  /**
   * Upload a candidate-related file to the private "candidate-files" bucket.
   * @param {string} path - object key inside the bucket (e.g. "123/photo.jpg")
   * @param {File|Blob} file - browser File/Blob instance
   * @param {object} [options] - Supabase storage upload options (upsert, cacheControl, etc.)
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function uploadCandidateFile(path, file, options) {
    if (!path || !file) {
      const err = new Error("Missing path or file");
      console.error("[Supabase Storage] uploadCandidateFile:", err, { path });
      return { data: null, error: err };
    }
    try {
      const opts = Object.assign({ upsert: false }, options || {});
      const { data, error } = await supabase.storage
        .from("candidate-files")
        .upload(path, file, opts);
      if (error) {
        console.error(
          "[Supabase Storage] uploadCandidateFile error:",
          error.message || error,
          { path }
        );
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error(
        "[Supabase Storage] uploadCandidateFile exception:",
        err,
        { path }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Create a short-lived signed URL for a candidate file.
   * @param {string} path - object key inside the "candidate-files" bucket
   * @param {number} [expiresInSeconds=60] - TTL for the signed URL
   * @returns {Promise<string|null>} signed URL or null on error
   */
  async function createSignedCandidateUrl(path, expiresInSeconds) {
    if (!path) return null;
    const ttl =
      typeof expiresInSeconds === "number" && expiresInSeconds > 0
        ? expiresInSeconds
        : 60;
    try {
      const { data, error } = await supabase.storage
        .from("candidate-files")
        .createSignedUrl(path, ttl);
      if (error) {
        console.error(
          "[Supabase Storage] createSignedCandidateUrl error:",
          error.message || error,
          { path }
        );
        return null;
      }
      return (data && data.signedUrl) || null;
    } catch (err) {
      console.error(
        "[Supabase Storage] createSignedCandidateUrl exception:",
        err,
        { path }
      );
      return null;
    }
  }

  /**
   * Delete one or more candidate files from storage.
   * @param {string[]|string} paths - one or more object keys in the bucket
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function deleteCandidateFiles(paths) {
    const raw = Array.isArray(paths) ? paths : [paths];
    const keys = raw
      .map(function (p) {
        return (p || "").toString().trim();
      })
      .filter(function (p) {
        return !!p;
      });
    if (!keys.length) {
      return { data: null, error: null };
    }
    try {
      const { data, error } = await supabase.storage
        .from("candidate-files")
        .remove(keys);
      if (error) {
        console.error(
          "[Supabase Storage] deleteCandidateFiles error:",
          error.message || error,
          { keys }
        );
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error(
        "[Supabase Storage] deleteCandidateFiles exception:",
        err,
        { keys }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Move/rename a candidate file inside the same bucket (e.g. temp -> final path).
   * @param {string} fromPath - current object key
   * @param {string} toPath - new object key
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function moveCandidateFile(fromPath, toPath) {
    if (!fromPath || !toPath) {
      const err = new Error("Missing fromPath or toPath");
      console.error("[Supabase Storage] moveCandidateFile:", err, {
        fromPath,
        toPath,
      });
      return { data: null, error: err };
    }
    try {
      const { data, error } = await supabase.storage
        .from("candidate-files")
        .move(fromPath, toPath);
      if (error) {
        console.error(
          "[Supabase Storage] moveCandidateFile error:",
          error.message || error,
          { fromPath, toPath }
        );
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error(
        "[Supabase Storage] moveCandidateFile exception:",
        err,
        { fromPath, toPath }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Patch candidate row with file-related columns (photo_url, cv_url) plus audit fields.
   * Leaves all other columns untouched.
   * @param {string} id - candidates.id
   * @param {object} payload - partial update (e.g. { photo_url, cv_url })
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateCandidateFiles(id, payload) {
    if (!id) {
      const err = new Error("Missing id");
      console.error("[Supabase] updateCandidateFiles:", err);
      return { data: null, error: err };
    }
    try {
      const basePayload = payload || {};
      const updates = await withUpdateAuditFields(
        Object.assign({}, basePayload)
      );
      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error(
          "[Supabase] updateCandidateFiles error:",
          error.message || error,
          { id }
        );
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateCandidateFiles exception:", err, { id });
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidate profile details (skills, languages, experience, education, certifications, hobbies)
  // ---------------------------------------------------------------------------

  /**
   * Fetch skills for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateSkills(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_skills")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateSkills error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateSkills exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace skills for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} skills
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateSkills(candidateId, skills) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateSkills:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(skills) ? skills : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_skills")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateSkills delete error:",
          deleteError.message || deleteError,
          {
            candidateId,
          }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (skill) {
        return {
          candidate_id: candidateId,
          skill: skill && skill.skill != null ? skill.skill : null,
          created_by: userId,
        };
      });
      const { data, error } = await supabase
        .from("candidate_skills")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateSkills insert error:",
          error.message || error,
          { candidateId }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateSkills exception:",
        err,
        { candidateId }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Fetch languages for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateLanguages(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_languages")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateLanguages error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateLanguages exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace languages for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} languages
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateLanguages(candidateId, languages) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateLanguages:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(languages) ? languages : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_languages")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateLanguages delete error:",
          deleteError.message || deleteError,
          {
            candidateId,
          }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (raw) {
        var lang = raw || {};
        return {
          candidate_id: candidateId,
          created_by: userId,
          // DB columns: language, level
          language:
            lang.language != null ? String(lang.language).trim() || null : null,
          level:
            lang.level != null && String(lang.level).trim() !== ""
              ? String(lang.level).trim()
              : lang.proficiency != null &&
                String(lang.proficiency).trim() !== ""
              ? String(lang.proficiency).trim()
              : null,
        };
      });
      const { data, error } = await supabase
        .from("candidate_languages")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateLanguages insert error:",
          error.message || error,
          { candidateId }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateLanguages exception:",
        err,
        { candidateId }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Fetch work experience for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateExperience(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_experience")
        .select(
          "id, candidate_id, title, company, location, start_date, end_date, description"
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateExperience error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateExperience exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace work experience entries for a candidate (delete then bulk insert).
   * Uses the canonical candidate_experience schema:
   *   candidate_id, title, company, location, start_date, end_date, description.
   * @param {string} candidateId
   * @param {array} experiences
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateExperience(candidateId, experiences) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateExperience:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(experiences) ? experiences : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_experience")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateExperience delete error:",
          deleteError.message || deleteError,
          {
            candidateId,
          }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }

      // Build a sanitized payload that only contains real table columns.
      // Table public.candidate_experience:
      // id, candidate_id, title, company, location, start_date, end_date, description, created_at
      var rows = items.map(function (raw) {
        var exp = raw || {};
        return {
          candidate_id: candidateId,
          title:
            exp.title != null ? String(exp.title).trim() || null : null,
          company:
            exp.company != null ? String(exp.company).trim() || null : null,
          location:
            exp.location != null
              ? String(exp.location).trim() || null
              : null,
          start_date: exp.start_date || null,
          end_date: exp.end_date || null,
          description:
            exp.description != null
              ? String(exp.description).trim() || null
              : null,
        };
      });

      const { data, error } = await supabase
        .from("candidate_experience")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateExperience insert error:",
          error,
          {
            candidateId,
          }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateExperience exception:",
        err,
        {
          candidateId,
        }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Fetch education entries for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateEducation(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_education")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateEducation error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateEducation exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace education entries for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} education
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateEducation(candidateId, education) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateEducation:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(education) ? education : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_education")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateEducation delete error:",
          deleteError.message || deleteError,
          {
            candidateId,
          }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (raw) {
        var edu = raw || {};
        return {
          candidate_id: candidateId,
          created_by: userId,
          institution:
            edu.institution != null
              ? String(edu.institution).trim() || null
              : null,
          degree:
            edu.degree != null ? String(edu.degree).trim() || null : null,
          start_year:
            edu.start_year != null ? Number(edu.start_year) || null : null,
          end_year:
            edu.end_year != null ? Number(edu.end_year) || null : null,
          description:
            edu.description != null
              ? String(edu.description).trim() || null
              : null,
        };
      });
      const { data, error } = await supabase
        .from("candidate_education")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateEducation insert error:",
          error.message || error,
          { candidateId }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateEducation exception:",
        err,
        { candidateId }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Fetch certifications for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateCertifications(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_certifications")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateCertifications error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateCertifications exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace certifications for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} certifications
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateCertifications(candidateId, certifications) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateCertifications:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(certifications) ? certifications : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_certifications")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateCertifications delete error:",
          deleteError.message || deleteError,
          { candidateId }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (raw) {
        var cert = raw || {};

        // candidate_certifications columns: id, candidate_id, name, issuer, year, created_at, created_by
        // Map the UI fields (name, issuer, issue_date/expiry_date) into these columns.
        var year = null;
        if (cert.year != null && String(cert.year).trim() !== "") {
          year = Number(cert.year) || null;
        } else if (cert.issue_date) {
          var d = new Date(cert.issue_date);
          if (!Number.isNaN(d.getTime())) {
            year = d.getUTCFullYear();
          }
        }

        return {
          candidate_id: candidateId,
          created_by: userId,
          name: cert.name != null ? String(cert.name).trim() || null : null,
          issuer:
            cert.issuer != null ? String(cert.issuer).trim() || null : null,
          year: year,
        };
      });
      const { data, error } = await supabase
        .from("candidate_certifications")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateCertifications insert error:",
          error.message || error,
          { candidateId }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateCertifications exception:",
        err,
        { candidateId }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Fetch hobbies for a candidate.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidateHobbies(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      const { data, error } = await supabase
        .from("candidate_hobbies")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(
          "[Supabase] getCandidateHobbies error:",
          error.message || error,
          { candidateId }
        );
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] getCandidateHobbies exception:",
        err,
        { candidateId }
      );
      return { data: [], error: err };
    }
  }

  /**
   * Replace hobbies for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} hobbies
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateHobbies(candidateId, hobbies) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateHobbies:", error, {
        candidateId,
      });
      return { data: null, error };
    }
    const items = Array.isArray(hobbies) ? hobbies : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_hobbies")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error(
          "[Supabase] replaceCandidateHobbies delete error:",
          deleteError.message || deleteError,
          {
            candidateId,
          }
        );
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (raw) {
        var hobby = raw || {};
        return {
          candidate_id: candidateId,
          created_by: userId,
          // Table column is `hobby`; UI uses the same key via data-field="hobby".
          hobby:
            hobby.hobby != null ? String(hobby.hobby).trim() || null : null,
        };
      });
      const { data, error } = await supabase
        .from("candidate_hobbies")
        .insert(rows)
        .select();
      if (error) {
        console.error(
          "[Supabase] replaceCandidateHobbies insert error:",
          error.message || error,
          { candidateId }
        );
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] replaceCandidateHobbies exception:",
        err,
        { candidateId }
      );
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.candidates
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.candidates = {
    insertCandidate,
    getCandidateById,
    updateCandidate,
    archiveCandidate,
    unarchiveCandidate,
    fetchMyCandidates,
    fetchCandidatesPaginated,
    searchCandidatesByName,
    getCandidateSkills,
    replaceCandidateSkills,
    getCandidateLanguages,
    replaceCandidateLanguages,
    getCandidateExperience,
    replaceCandidateExperience,
    getCandidateEducation,
    replaceCandidateEducation,
    getCandidateCertifications,
    replaceCandidateCertifications,
    getCandidateHobbies,
    replaceCandidateHobbies,
    uploadCandidateFile,
    createSignedCandidateUrl,
    deleteCandidateFiles,
    moveCandidateFile,
    updateCandidateFiles,
  };
})();

