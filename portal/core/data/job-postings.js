// ============================================================================
// Italian Experience – Job Postings data module (V1 scaffolding)
// ----------------------------------------------------------------------------
// Responsibilities (Phase 1 – read-only scaffolding):
// - Encapsulate minimal job-posting-related Supabase operations:
//   - Read job posting by id
//   - Read job posting by job_offer_id (1:1 in V1)
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.jobPostings
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
//
// IMPORTANT (Phase 1):
// - No create/edit/publish/apply mutations are implemented yet.
// - We only provide the minimal read paths required for the job-offer page UI.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.jobPostings] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/job-postings.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local auth/session + audit helpers (scoped to job-postings module)
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
          "[IEData.jobPostings] getSession error:",
          error.message || error,
          error
        );
        return { data: { session: null, user: null }, error: error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[IEData.jobPostings] Session",
          session && session.user ? "restored" : "none"
        );
      }
      return {
        data: { session: session, user: (session && session.user) || null },
        error: null,
      };
    } catch (err) {
      console.error("[IEData.jobPostings] getSession exception:", err);
      return { data: { session: null, user: null }, error: err };
    }
  }

  /**
   * Internal helper: augment insert payloads with audit fields.
   * - Requires an authenticated user.
   * - Adds created_at/updated_at (ISO string) and created_by/updated_by (user.id).
   * @param {object} row
   * @returns {Promise<object>} merged row
   */
  async function withInsertAuditFields(row) {
    var sessionResult = await getSession();
    var userId =
      sessionResult && sessionResult.data && sessionResult.data.user
        ? sessionResult.data.user.id
        : null;
    if (!userId) {
      var authErr = new Error("Not authenticated");
      console.error("[IEData.jobPostings] withInsertAuditFields:", authErr);
      throw authErr;
    }
    var nowIso = new Date().toISOString();
    return Object.assign({}, row, {
      created_at: nowIso,
      updated_at: nowIso,
      created_by: userId,
      updated_by: userId,
    });
  }

  /**
   * Internal helper: augment update payloads with audit fields.
   * - Requires an authenticated user.
   * - Adds updated_at (ISO string) and updated_by (user.id).
   * @param {object} updates
   * @returns {Promise<object>} merged updates
   */
  async function withUpdateAuditFields(updates) {
    var sessionResult = await getSession();
    if (sessionResult.error) {
      console.error(
        "[IEData.jobPostings] withUpdateAuditFields getSession error:",
        sessionResult.error.message || sessionResult.error,
        sessionResult.error
      );
      throw sessionResult.error;
    }
    var user = sessionResult.data && sessionResult.data.user;
    if (!user || !user.id) {
      var err = new Error("Not authenticated");
      console.error("[IEData.jobPostings] withUpdateAuditFields:", err);
      throw err;
    }
    return Object.assign({}, updates, {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  }

  /**
   * Basic V1 slug generation from title.
   * - Lowercase, strip diacritics, replace non-alphanumerics with "-"
   * - Trim duplicate/edge hyphens
   * - Append a short time-based suffix for basic uniqueness
   * @param {string} title
   * @returns {string}
   */
  function generateSlugFromTitle(title) {
    var base = (title || "").toString().trim().toLowerCase();
    try {
      if (base && typeof base.normalize === "function") {
        base = base
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }
    } catch (_) {
      // ignore normalize errors/fallbacks
    }
    base = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!base) base = "job";
    var suffix = Date.now().toString(36).slice(-4);
    return base + "-" + suffix;
  }

  // ---------------------------------------------------------------------------
  // Job postings – read helpers (V1)
  // ---------------------------------------------------------------------------

  /**
   * Fetch a single job posting by id.
   * @param {string} id - job_postings id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getJobPostingById error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] getJobPostingById exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Fetch a single job posting by slug.
   * This helper is neutral with respect to publication state; callers are
   * responsible for enforcing visibility rules (e.g., is_published = true)
   * in their own context.
   *
   * @param {string} slug - job_postings.slug
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingBySlug(slug) {
    if (!slug) return { data: null, error: new Error("Missing slug") };
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getJobPostingBySlug error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] getJobPostingBySlug exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Fetch a published job posting by slug for public-facing use.
   * Enforces is_published = true at the query level to reduce the risk of
   * accidentally exposing draft/unpublished postings in public contexts.
   *
   * @param {string} slug - job_postings.slug
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getPublishedJobPostingBySlug(slug) {
    if (!slug) return { data: null, error: new Error("Missing slug") };
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getPublishedJobPostingBySlug error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error(
        "[Supabase] getPublishedJobPostingBySlug exception:",
        e
      );
      return { data: null, error: e };
    }
  }

  /**
   * Fetch all job postings for the list page (portal).
   * Order by updated_at descending.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function listJobPostings() {
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .order("updated_at", { ascending: false });
      var data = result && result.data ? result.data : [];
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] listJobPostings error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] listJobPostings exception:", e);
      return { data: [], error: e };
    }
  }

  /**
   * Fetch job postings for multiple job_offer_ids (for list UIs).
   * Returns an array of postings; use job_offer_id to map back to offers.
   * @param {string[]} jobOfferIds - job_offers.id values
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getJobPostingsByJobOfferIds(jobOfferIds) {
    if (!jobOfferIds || !Array.isArray(jobOfferIds) || jobOfferIds.length === 0) {
      return { data: [], error: null };
    }
    var ids = jobOfferIds.filter(function (id) {
      return id != null && String(id).trim() !== "";
    });
    if (ids.length === 0) return { data: [], error: null };
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .in("job_offer_id", ids);
      var data = result && result.data ? result.data : [];
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getJobPostingsByJobOfferIds error:",
          error.message || error,
          error
        );
        return { data: [], error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] getJobPostingsByJobOfferIds exception:", e);
      return { data: [], error: e };
    }
  }

  /**
   * Fetch the (single) job posting associated with a given job_offer_id.
   * V1 enforces 1:1 via a unique constraint on job_offer_id.
   * @param {string} jobOfferId - job_offers.id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingByJobOfferId(jobOfferId) {
    if (!jobOfferId) {
      return { data: null, error: new Error("Missing job_offer_id") };
    }
    try {
      var result = await supabase
        .from("job_postings")
        .select("*")
        .eq("job_offer_id", jobOfferId)
        .maybeSingle();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] getJobPostingByJobOfferId error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data || null, error: null };
    } catch (e) {
      console.error("[Supabase] getJobPostingByJobOfferId exception:", e);
      return { data: null, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Job postings – write helpers (V1 Phase 2)
  // ---------------------------------------------------------------------------

  /**
   * Create a job posting from a job offer.
   * - Enforces the V1 1:1 relationship on job_offer_id.
   * - Copies initial public-facing fields from the given job_offer object.
   * - Initializes publication/apply fields in a safe default state.
   *
   * @param {object} jobOffer - job_offers row as loaded by the portal
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function createJobPostingFromJobOffer(jobOffer) {
    if (!jobOffer || !jobOffer.id) {
      return { data: null, error: new Error("Missing job offer") };
    }

    // V1 – 1:1 safeguard: if a posting already exists, return it instead of
    // attempting to insert a duplicate.
    try {
      var existingResult = await supabase
        .from("job_postings")
        .select("*")
        .eq("job_offer_id", jobOffer.id)
        .maybeSingle();
      var existing = existingResult ? existingResult.data : null;
      var existingError = existingResult ? existingResult.error : null;
      if (existingError) {
        console.error(
          "[Supabase] createJobPostingFromJobOffer pre-check error:",
          existingError.message || existingError,
          existingError
        );
        return { data: null, error: existingError };
      }
      if (existing) {
        return { data: existing, error: null };
      }
    } catch (preCheckErr) {
      console.error(
        "[Supabase] createJobPostingFromJobOffer pre-check exception:",
        preCheckErr
      );
      return { data: null, error: preCheckErr };
    }

    var title =
      jobOffer && jobOffer.title != null
        ? String(jobOffer.title).trim()
        : "";
    if (!title) {
      return {
        data: null,
        error: new Error(
          "This job offer does not have a title. Add a title before creating a public posting."
        ),
      };
    }

    var city = jobOffer.city || "";
    var state = jobOffer.state || "";
    var location = [city, state]
      .filter(function (part) {
        return part;
      })
      .join(", ");

    var baseRow = {
      job_offer_id: jobOffer.id,
      slug: generateSlugFromTitle(title),
      public_title: title,
      public_location: location || null,
      public_description: jobOffer.description || null,
      public_requirements: jobOffer.requirements || null,
      // Notes are considered internal in V1; start benefits empty unless we
      // introduce a dedicated public-safe field later.
      public_benefits: null,
      is_published: false,
      apply_enabled: false,
      apply_deadline: null,
      published_at: null,
    };

    try {
      var rowWithAudit = await withInsertAuditFields(baseRow);
      var insertResult = await supabase
        .from("job_postings")
        .insert(rowWithAudit)
        .select("*")
        .single();
      var data = insertResult ? insertResult.data : null;
      var error = insertResult ? insertResult.error : null;
      if (error) {
        console.error(
          "[Supabase] createJobPostingFromJobOffer insert error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] createJobPostingFromJobOffer exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Update an existing job posting by id.
   * - Phase 2 scope: public-facing content + slug + (optionally) apply_deadline.
   * - Phase 3 extension: safe lifecycle updates for is_published, apply_enabled, published_at.
   *   (Callers are responsible for applying the publish/apply rules; this helper simply
   *   persists the provided values with audit fields.)
   *
   * @param {string} id - job_postings id
   * @param {object} payload - {
   *   public_title?,
   *   public_location?,
   *   public_description?,
   *   public_requirements?,
   *   public_benefits?,
   *   slug?,
   *   apply_deadline?,
   *   is_published?,
   *   apply_enabled?,
   *   published_at?
   * }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobPosting(id, payload) {
    if (!id) return { data: null, error: new Error("Missing id") };

    var baseUpdates = {};

    if (payload.hasOwnProperty("public_title")) {
      // public_title is expected to be a required, non-null field; do not coerce
      // it to null at the data layer. Callers are responsible for validating
      // non-empty values before calling updateJobPosting.
      baseUpdates.public_title = payload.public_title;
    }
    if (payload.hasOwnProperty("public_location")) {
      baseUpdates.public_location = payload.public_location || null;
    }
    if (payload.hasOwnProperty("public_description")) {
      baseUpdates.public_description = payload.public_description || null;
    }
    if (payload.hasOwnProperty("public_requirements")) {
      baseUpdates.public_requirements = payload.public_requirements || null;
    }
    if (payload.hasOwnProperty("public_benefits")) {
      baseUpdates.public_benefits = payload.public_benefits || null;
    }
    if (payload.hasOwnProperty("slug")) {
      // Slug is treated as required in V1; do not force null here. If callers
      // want to change the slug, they must provide a valid string.
      baseUpdates.slug = payload.slug;
    }
    if (payload.hasOwnProperty("apply_deadline")) {
      baseUpdates.apply_deadline = payload.apply_deadline || null;
    }
    if (payload.hasOwnProperty("is_published")) {
      baseUpdates.is_published = payload.is_published;
    }
    if (payload.hasOwnProperty("apply_enabled")) {
      baseUpdates.apply_enabled = payload.apply_enabled;
    }
    if (payload.hasOwnProperty("published_at")) {
      baseUpdates.published_at = payload.published_at || null;
    }

    if (Object.keys(baseUpdates).length === 0) {
      return { data: null, error: new Error("No updatable fields provided") };
    }

    try {
      var updates = await withUpdateAuditFields(baseUpdates);
      var result = await supabase
        .from("job_postings")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] updateJobPosting error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] updateJobPosting exception:", e);
      return { data: null, error: e };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.jobPostings
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.jobPostings = {
    getJobPostingById: getJobPostingById,
    getJobPostingBySlug: getJobPostingBySlug,
    getPublishedJobPostingBySlug: getPublishedJobPostingBySlug,
    getJobPostingByJobOfferId: getJobPostingByJobOfferId,
    getJobPostingsByJobOfferIds: getJobPostingsByJobOfferIds,
    listJobPostings: listJobPostings,
    createJobPostingFromJobOffer: createJobPostingFromJobOffer,
    updateJobPosting: updateJobPosting,
  };
})();

