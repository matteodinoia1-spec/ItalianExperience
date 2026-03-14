// ============================================================================
// Italian Experience – Supabase compatibility façade
// ----------------------------------------------------------------------------
// This file now acts as a thin compatibility layer:
// - obtains the Supabase client from `window.IESupabaseClient`
// - delegates domain operations to `window.IEData.*` modules
// - exposes a stable `window.IESupabase` API used by existing runtime code
//
// Load this AFTER the Supabase CDN script and core/supabase-client.js:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="portal/core/supabase-client.js"></script>
// Uses publishable (anon) key only.
//
// SECURITY – RLS is mandatory:
// - All table access is subject to Row Level Security (RLS) in Supabase.
// - Authorization must use auth.uid() (or equivalent); do not rely on
//   client-supplied user ids for access control.
// - Do not run Supabase data queries before authentication; the portal
//   runs the auth guard before any data or UI logic.
//
// Expected table/column names (adjust if your DB differs):
//   profiles: id (uuid, = auth.users.id), email, first_name, last_name, role
//   candidates: id, created_by (uuid), first_name, last_name, position,
//               address, status, source, notes, created_at, is_archived
//               (no client_name; relationship is via candidate_job_associations -> job_offers -> clients)
//   job_offers: id, created_by, title, position, client_id, description,
//               requirements, notes, salary, contract_type, positions, city,
//               state, deadline, status, created_at
//   candidate_job_associations: id, candidate_id, job_offer_id, status, notes,
//                               created_by, created_at
//   clients: id, created_by (optional for RLS), name, city, state, country,
//            email, phone, notes, is_archived, created_at
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[Supabase] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded after the Supabase CDN and before core/supabase.js."
    );
    window.IESupabase = null;
    return;
  }

  const supabase = client.supabase;
  const getBasePath =
    typeof client.getBasePath === "function"
      ? client.getBasePath
      : function () {
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
        };

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  /**
   * Centralized authentication guard.
   * - If there is no active session, performs a hard redirect to the portal login page.
   * - If authenticated, returns the current session object.
   * @returns {Promise<object|null>} session or null if redirecting
   */
  async function enforceAuthGuard() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.user) {
        const base = getBasePath();
        const target = base + "index.html";
        if (window.location.href !== target) {
          window.location.replace(target);
        }
        return null;
      }

      return session;
    } catch (_) {
      const base = getBasePath();
      const target = base + "index.html";
      window.location.replace(target);
      return null;
    }
  }

  /**
   * Login with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[Supabase Auth] Login error:", error.message, error);
        return { data: null, error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase Auth] Login success.");
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase Auth] Login exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Logout current user.
   * @returns {Promise<{ error: object | null }>}
   */
  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[Supabase Auth] Logout error:", error.message, error);
        return { error };
      }
      return { error: null };
    } catch (err) {
      console.error("[Supabase Auth] Logout exception:", err);
      return { error: err };
    }
  }

  /**
   * Get current user session.
   * @returns {Promise<{ data: { session: object | null, user: object | null }, error: object | null }>}
   */
  async function getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[Supabase Auth] getSession error:", error.message, error);
        return { data: { session: null, user: null }, error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase Auth] Session", session?.user ? "restored" : "none");
      }
      return { data: { session, user: session?.user ?? null }, error: null };
    } catch (err) {
      console.error("[Supabase Auth] getSession exception:", err);
      return { data: { session: null, user: null }, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Activity Logs (delegated to portal/core/data/activity.js)
  // ---------------------------------------------------------------------------

  function getActivityModule() {
    if (!window.IEData || !window.IEData.activity) {
      console.error(
        "[Supabase] IEData.activity not found. Ensure portal/core/data/activity.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.activity;
  }

  /**
   * Redirect to dashboard (portal root-relative path).
   */
  function redirectToDashboard() {
    const base = getBasePath();
    window.location.href = base + "dashboard.html";
  }

  /**
   * Redirect to login.
   */
  function redirectToLogin() {
    const base = getBasePath();
    window.location.href = base + "index.html";
  }

  /**
   * If user is authenticated, redirect to dashboard. Call on login page only.
   */
  async function redirectToDashboardIfAuthenticated() {
    const { data } = await getSession();
    if (data?.user) redirectToDashboard();
  }

  /**
   * If user is not authenticated, redirect to login. Call on protected pages.
   * Returns the current user or undefined; after redirect, caller should not continue.
   */
  async function requireAuth() {
    const user = await enforceAuthGuard();
    if (!user) return undefined;
    return user;
  }

  // ---------------------------------------------------------------------------
  // Profile (auto-create on first login)
  // ---------------------------------------------------------------------------

  /**
   * Ensure a profile row exists for the current user. Call after login.
   * Uses auth user id and email; inserts into "profiles" if missing.
   * @param {object} user - Supabase auth user
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function ensureProfile(user) {
    if (!user?.id) return { data: null, error: new Error("No user id") };
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[Supabase] ensureProfile fetch error:", fetchError.message, fetchError);
        return { data: null, error: fetchError };
      }
      if (existing) return { data: existing, error: null };

      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const parts = String(fullName).trim().split(/\s+/);
      const derivedFirst = parts[0] || "";
      const derivedLast = parts.slice(1).join(" ") || null;
      const first_name = (user.user_metadata?.first_name || "").trim() || derivedFirst;
      const last_name = (user.user_metadata?.last_name || "").trim() || derivedLast;

      if (typeof window.debugLog === "function") window.debugLog("[Profile] Creating profile");

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || null,
          first_name,
          last_name,
          role: null,
        });

      if (insertError) {
        console.error("[Supabase] ensureProfile insert error:", insertError.message, insertError);
        return { data: null, error: insertError };
      }
      // Re-fetch to return the full row shape (defensive; should now exist and be unique).
      const { data: createdProfile, error: fetchCreatedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchCreatedError) {
        console.error("[Supabase] ensureProfile post-insert fetch error:", fetchCreatedError.message, fetchCreatedError);
        return { data: null, error: fetchCreatedError };
      }

      return { data: createdProfile || null, error: null };
    } catch (err) {
      console.error("[Supabase] ensureProfile exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Get profile for current user.
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getProfile() {
    const { data: sessionData } = await getSession();
    const user = sessionData?.user || null;
    const userId = user?.id;
    if (!userId) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("[Supabase] getProfile error:", error.message, error);
        return { data: null, error };
      }
      if (!data) {
        if (typeof window.debugLog === "function") window.debugLog("[Profile] No profile found, ensuring profile");
        const { data: ensured, error: ensureError } = await ensureProfile(user);
        if (ensureError) {
          console.error("[Supabase] getProfile ensureProfile error:", ensureError.message || ensureError, ensureError);
          return { data: null, error: ensureError };
        }
        return { data: ensured || null, error: null };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] getProfile exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Update profile for current user (first_name, last_name).
   * @param {object} payload - { first_name?: string, last_name?: string }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateProfile(payload) {
    const { data: sessionData } = await getSession();
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] updateProfile:", err);
      return { data: null, error: err };
    }
    try {
      if (typeof window.debugLog === "function") window.debugLog("[Profile] Updating profile");
      const updates = {
        updated_at: new Date().toISOString(),
      };
      if (payload.first_name !== undefined) updates.first_name = payload.first_name;
      if (payload.last_name !== undefined) updates.last_name = payload.last_name;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) {
        console.error("[Supabase] updateProfile error:", error.message, error);
        return { data: null, error };
      }
      // Re-fetch the latest profile so callers always receive fresh data.
      const { data: refreshedProfile, error: fetchError } = await getProfile();
      if (fetchError) {
        console.error("[Supabase] updateProfile getProfile error:", fetchError.message || fetchError, fetchError);
        return { data: null, error: fetchError };
      }
      return { data: refreshedProfile || null, error: null };
    } catch (err) {
      console.error("[Supabase] updateProfile exception:", err);
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidates (delegated to portal/core/data/candidates.js)
  // ---------------------------------------------------------------------------

  function getCandidatesModule() {
    if (!window.IEData || !window.IEData.candidates) {
      console.error(
        "[Supabase] IEData.candidates not found. Ensure portal/core/data/candidates.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.candidates;
  }

  async function insertCandidate(payload) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.insertCandidate !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.insertCandidate(payload);
  }

  async function getCandidateById(id) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateById !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.getCandidateById(id);
  }

  async function updateCandidate(id, payload) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.updateCandidate !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    try {
      console.log("[CandidateSaveDebug] IESupabase.updateCandidate request", {
        candidateId: id,
        payloadMain: payload,
      });
    } catch (_) {}
    const result = await mod.updateCandidate(id, payload);
    try {
      console.log("[CandidateSaveDebug] IESupabase.updateCandidate response", {
        candidateId: id,
        data: result && result.data,
        error: result && result.error,
      });
      if (result && result.error) {
        console.error(
          "[CandidateSaveDebug] IESupabase.updateCandidate Supabase error",
          result.error
        );
      }
    } catch (_) {}
    return result;
  }

  async function updateCandidateProfileStatus(id, status) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.updateCandidateProfileStatus !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.updateCandidateProfileStatus(id, status);
  }

  async function fetchMyCandidates() {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.fetchMyCandidates !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.fetchMyCandidates();
  }

  async function archiveCandidate(id) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.archiveCandidate !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.archiveCandidate(id);
  }

  async function unarchiveCandidate(id) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.unarchiveCandidate !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.unarchiveCandidate(id);
  }

  async function fetchCandidatesPaginated(opts) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.fetchCandidatesPaginated !== "function") {
      return { data: [], totalCount: 0, error: new Error("Candidates module not available") };
    }
    return mod.fetchCandidatesPaginated(opts);
  }

  async function searchCandidatesByName(opts) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.searchCandidatesByName !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.searchCandidatesByName(opts);
  }

  async function getCandidateSkills(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateSkills !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateSkills(candidateId);
  }

  async function replaceCandidateSkills(candidateId, skills) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateSkills !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateSkills(candidateId, skills);
  }

  async function getCandidateLanguages(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateLanguages !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateLanguages(candidateId);
  }

  async function replaceCandidateLanguages(candidateId, languages) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateLanguages !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateLanguages(candidateId, languages);
  }

  async function getCandidateExperience(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateExperience !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateExperience(candidateId);
  }

  async function replaceCandidateExperience(candidateId, experiences) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateExperience !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateExperience(candidateId, experiences);
  }

  async function getCandidateEducation(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateEducation !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateEducation(candidateId);
  }

  async function replaceCandidateEducation(candidateId, education) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateEducation !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateEducation(candidateId, education);
  }

  async function getCandidateCertifications(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateCertifications !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateCertifications(candidateId);
  }

  async function replaceCandidateCertifications(candidateId, certifications) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateCertifications !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateCertifications(candidateId, certifications);
  }

  async function getCandidateHobbies(candidateId) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.getCandidateHobbies !== "function") {
      return { data: [], error: new Error("Candidates module not available") };
    }
    return mod.getCandidateHobbies(candidateId);
  }

  async function replaceCandidateHobbies(candidateId, hobbies) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.replaceCandidateHobbies !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.replaceCandidateHobbies(candidateId, hobbies);
  }

  async function uploadCandidateFile(path, file, options) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.uploadCandidateFile !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.uploadCandidateFile(path, file, options);
  }

  async function createSignedCandidateUrl(path, expiresInSeconds) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.createSignedCandidateUrl !== "function") {
      return null;
    }
    return mod.createSignedCandidateUrl(path, expiresInSeconds);
  }

  async function deleteCandidateFiles(paths) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.deleteCandidateFiles !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.deleteCandidateFiles(paths);
  }

  async function moveCandidateFile(fromPath, toPath) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.moveCandidateFile !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.moveCandidateFile(fromPath, toPath);
  }

  async function updateCandidateFiles(id, payload) {
    const mod = getCandidatesModule();
    if (!mod || typeof mod.updateCandidateFiles !== "function") {
      return { data: null, error: new Error("Candidates module not available") };
    }
    return mod.updateCandidateFiles(id, payload);
  }

  // ---------------------------------------------------------------------------
  // Job offers
  // ---------------------------------------------------------------------------

  function getJobOffersModule() {
    if (!window.IEData || !window.IEData.jobOffers) {
      console.error(
        "[Supabase] IEData.jobOffers not found. Ensure portal/core/data/job-offers.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.jobOffers;
  }

  // ---------------------------------------------------------------------------
  // Job postings (V1 – public layer on top of job_offers)
  // ---------------------------------------------------------------------------

  function getJobPostingsModule() {
    if (!window.IEData || !window.IEData.jobPostings) {
      console.error(
        "[Supabase] IEData.jobPostings not found. Ensure portal/core/data/job-postings.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.jobPostings;
  }

  /**
   * Insert a new job offer.
   * Expects table: job_offers (id, created_by, title, position, client_id, description, requirements, notes, salary, contract_type, positions, city, state, deadline, status, created_at, ...)
   * @param {object} payload - { client_id, title, position, description, requirements, notes, salary, contract_type, positions, city, state, deadline, status }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertJobOffer(payload) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.insertJobOffer !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.insertJobOffer(payload);
  }

  /**
   * Fetch a single job offer by id (with client join).
   * @param {string} id - job_offer id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobOfferById(id) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.getJobOfferById !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.getJobOfferById(id);
  }

  /**
   * Fetch a single job offer by id (wrapper used by UI code).
   * Kept separate so different pages (list, modal preview, full view)
   * can share the same loading function without duplicating queries.
   * @param {string} id - job_offer id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function fetchJobOfferById(id) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.fetchJobOfferById !== "function") {
      // Fallback to getJobOfferById if dedicated wrapper is not present.
      return getJobOfferById(id);
    }
    return mod.fetchJobOfferById(id);
  }

  /**
   * Update an existing job offer by id.
   * @param {string} id - job_offer id
   * @param {object} payload - fields to update (same shape as insertJobOffer payload)
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobOffer(id, payload) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.updateJobOffer !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.updateJobOffer(id, payload);
  }

  /**
   * Update only the status of a job offer (lifecycle: active | closed | archived).
   * @param {string} id - job_offer id
   * @param {string} status - "active" | "closed" | "archived"
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobOfferStatus(id, status) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.updateJobOfferStatus !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.updateJobOfferStatus(id, status);
  }

  /**
   * Fetch all job offers (RLS should restrict if needed).
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchJobOffers() {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.fetchJobOffers !== "function") {
      return { data: [], error: new Error("Job-offers module not available") };
    }
    return mod.fetchJobOffers();
  }

  // ---------------------------------------------------------------------------
  // Job postings – read helpers (V1)
  // ---------------------------------------------------------------------------

  /**
   * Fetch a single job posting by id.
   * Delegates to IEData.jobPostings.getJobPostingById.
   * @param {string} id - job_postings id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingById(id) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.getJobPostingById !== "function") {
      return {
        data: null,
        error: new Error("Job-postings module not available"),
      };
    }
    return mod.getJobPostingById(id);
  }

  /**
   * Fetch a single job posting by slug.
   * Delegates to IEData.jobPostings.getJobPostingBySlug.
   * This helper is neutral with respect to publication state; callers must
   * enforce visibility rules as appropriate for their context.
   *
   * @param {string} slug - job_postings.slug
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingBySlug(slug) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.getJobPostingBySlug !== "function") {
      return {
        data: null,
        error: new Error("Job-postings module not available"),
      };
    }
    return mod.getJobPostingBySlug(slug);
  }

  /**
   * Fetch a published job posting by slug for public-facing reads.
   * Delegates to IEData.jobPostings.getPublishedJobPostingBySlug, which
   * enforces is_published = true at the query level.
   *
   * @param {string} slug - job_postings.slug
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getPublishedJobPostingBySlug(slug) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.getPublishedJobPostingBySlug !== "function") {
      return {
        data: null,
        error: new Error("Job-postings module not available"),
      };
    }
    return mod.getPublishedJobPostingBySlug(slug);
  }

  /**
   * Fetch the (single) job posting associated with a job offer.
   * V1 assumes a 1:1 relationship enforced by a unique constraint on job_offer_id.
   * Delegates to IEData.jobPostings.getJobPostingByJobOfferId.
   * @param {string} jobOfferId - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobPostingByJobOfferId(jobOfferId) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.getJobPostingByJobOfferId !== "function") {
      return { data: null, error: new Error("Job-postings module not available") };
    }
    return mod.getJobPostingByJobOfferId(jobOfferId);
  }

  /**
   * Fetch job postings for multiple job_offer_ids (for list UIs).
   * Delegates to IEData.jobPostings.getJobPostingsByJobOfferIds.
   * @param {string[]} jobOfferIds - job_offers.id values
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getJobPostingsByJobOfferIds(jobOfferIds) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.getJobPostingsByJobOfferIds !== "function") {
      return { data: [], error: new Error("Job-postings module not available") };
    }
    return mod.getJobPostingsByJobOfferIds(jobOfferIds);
  }

  /**
   * List all job postings (for job-postings list page).
   * Delegates to IEData.jobPostings.listJobPostings.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function listJobPostings() {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.listJobPostings !== "function") {
      return { data: [], error: new Error("Job-postings module not available") };
    }
    return mod.listJobPostings();
  }

  /**
   * Create a job posting from a job offer.
   * - Delegates initial data copy + audit to IEData.jobPostings.createJobPostingFromJobOffer.
   * @param {object} jobOffer - job_offers row as loaded by the portal
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function createJobPostingFromJobOffer(jobOffer) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.createJobPostingFromJobOffer !== "function") {
      return { data: null, error: new Error("Job-postings module not available") };
    }
    return mod.createJobPostingFromJobOffer(jobOffer);
  }

  /**
   * Update an existing job posting by id.
   * - Phase 2 scope: only public-facing content + slug + (optionally) apply_deadline.
   * @param {string} id - job_postings id
   * @param {object} payload
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobPosting(id, payload) {
    const mod = getJobPostingsModule();
    if (!mod || typeof mod.updateJobPosting !== "function") {
      return { data: null, error: new Error("Job-postings module not available") };
    }
    return mod.updateJobPosting(id, payload);
  }

  // ---------------------------------------------------------------------------
  // Clients (delegated to portal/core/data/clients.js)
  // ---------------------------------------------------------------------------

  function getClientsModule() {
    if (!window.IEData || !window.IEData.clients) {
      console.error(
        "[Supabase] IEData.clients not found. Ensure portal/core/data/clients.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.clients;
  }

  async function insertClient(payload) {
    const mod = getClientsModule();
    if (!mod || typeof mod.insertClient !== "function") {
      return { data: null, error: new Error("Clients module not available") };
    }
    return mod.insertClient(payload);
  }

  async function getClientById(id) {
    const mod = getClientsModule();
    if (!mod || typeof mod.getClientById !== "function") {
      return { data: null, error: new Error("Clients module not available") };
    }
    return mod.getClientById(id);
  }

  async function updateClient(id, payload) {
    const mod = getClientsModule();
    if (!mod || typeof mod.updateClient !== "function") {
      return { data: null, error: new Error("Clients module not available") };
    }
    return mod.updateClient(id, payload);
  }

  async function fetchClientsPaginated(opts) {
    const mod = getClientsModule();
    if (!mod || typeof mod.fetchClientsPaginated !== "function") {
      return {
        data: [],
        totalCount: 0,
        error: new Error("Clients module not available"),
      };
    }
    return mod.fetchClientsPaginated(opts);
  }

  async function searchClientsByName(opts) {
    const mod = getClientsModule();
    if (!mod || typeof mod.searchClientsByName !== "function") {
      return { data: [], error: new Error("Clients module not available") };
    }
    return mod.searchClientsByName(opts);
  }

  /**
   * Search job offers by title (for global header search).
   * @param {{ term: string, limit?: number }} opts
   * @returns {Promise<{ data: Array<{ id: string, title: string }>, error: object | null }>}
   */
  async function searchJobOffersByTitle(opts) {
    const term = (opts && opts.term) != null ? String(opts.term).trim() : "";
    const rawLimit = (opts && opts.limit) || 5;
    const limit = Math.max(1, Math.min(20, parseInt(rawLimit, 10) || 5));

    if (!term) {
      return { data: [], error: null };
    }

    try {
      const escaped = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const pattern = "%" + escaped + "%";

      const { data, error } = await supabase
        .from("job_offers")
        .select("id, title, position")
        .or("title.ilike." + pattern + ",position.ilike." + pattern)
        .or("is_archived.is.null,is_archived.eq.false")
        .order("title", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("[Supabase] searchJobOffersByTitle error:", error.message, error);
        return { data: [], error };
      }

      const rows = (data || []).map(function (r) {
        return { id: r.id, title: r.title || r.position || "", position: r.position };
      });
      return { data: rows, error: null };
    } catch (err) {
      console.error("[Supabase] searchJobOffersByTitle exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers – paginated lists (delegated to IEData.jobOffers)
  // ---------------------------------------------------------------------------

  /**
   * Fetch job offers with filters and pagination. Returns total count (with same filters) and page of data.
   * Delegates to portal/core/data/job-offers.js via IEData.jobOffers.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchJobOffersPaginated(opts) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.fetchJobOffersPaginated !== "function") {
      return {
        data: [],
        totalCount: 0,
        error: new Error("Job-offers module not available"),
      };
    }
    return mod.fetchJobOffersPaginated(opts);
  }

  // ---------------------------------------------------------------------------
  // DELETE / ARCHIVE HELPERS
  // ---------------------------------------------------------------------------

  const ARCHIVABLE_TABLES = ["candidates", "clients", "job_offers"];
  const PERMANENT_DELETE_TABLES = [
    "candidates",
    "clients",
    "job_offers",
    "candidate_job_associations",
  ];

  /**
   * Generic soft archive helper: set is_archived = true on a single row.
   * @param {{ table: string, id: string }} params
   * @returns {Promise<{ data: any, error: any }>}
   */
  async function archiveRecord(params) {
    const table = params && params.table;
    const id = params && params.id;

    if (!table || !id) {
      const error = new Error("Missing table or id");
      console.error("[Supabase] archiveRecord:", error, { table, id });
      return { data: null, error };
    }

    if (ARCHIVABLE_TABLES.indexOf(table) === -1) {
      const error = new Error("Table not allowed for archive");
      console.error("[Supabase] archiveRecord:", error, { table, id });
      return { data: null, error };
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Supabase] archiveRecord error:", error.message, error, { table, id });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] archiveRecord exception:", err, { table, id });
      return { data: null, error: err };
    }
  }

  /**
   * Generic unarchive helper: set is_archived = false on a single row.
   * @param {{ table: string, id: string }} params
   * @returns {Promise<{ data: any, error: any }>}
   */
  async function unarchiveRecord(params) {
    const table = params && params.table;
    const id = params && params.id;

    if (!table || !id) {
      const error = new Error("Missing table or id");
      console.error("[Supabase] unarchiveRecord:", error, { table, id });
      return { data: null, error };
    }

    if (ARCHIVABLE_TABLES.indexOf(table) === -1) {
      const error = new Error("Table not allowed for unarchive");
      console.error("[Supabase] unarchiveRecord:", error, { table, id });
      return { data: null, error };
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .update({ is_archived: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Supabase] unarchiveRecord error:", error.message, error, { table, id });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] unarchiveRecord exception:", err, { table, id });
      return { data: null, error: err };
    }
  }

  /**
   * Generic permanent delete helper.
   * - Performs a hard delete on the given table by primary key.
   * - Never reports success when 0 rows were deleted.
   *
   * @param {{ table: string, id: string }} params
   * @returns {Promise<{ data: any, error: any }>}
   */
  async function deletePermanent(params) {
    const table = params && params.table;
    const id = params && params.id;

    if (!table || !id) {
      const error = new Error("Missing table or id");
      console.error("[Supabase] deletePermanent:", error, { table, id });
      return { data: null, error };
    }

    if (PERMANENT_DELETE_TABLES.indexOf(table) === -1) {
      const error = new Error("Table not allowed for permanent delete");
      console.error("[Supabase] deletePermanent:", error, { table, id });
      return { data: null, error };
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("[Supabase] deletePermanent error:", error.message, error, { table, id });
        return { data: null, error };
      }

      const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (rowCount === 0) {
        const zeroError = new Error("Delete succeeded but 0 rows affected");
        console.error("[Supabase] deletePermanent zero rows:", { table, id });
        return { data: null, error: zeroError };
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] deletePermanent exception:", err, { table, id });
      return { data: null, error: err };
    }
  }

  /**
   * Wrapper for permanent deletes that first cleans up related activity_logs.
   * - Deletes activity_logs for the resolved entityType/entity_id pair.
   * - Only proceeds to the underlying deletePermanent helper if log cleanup succeeds.
   * - Falls back to deletePermanent when entityType cannot be resolved from table.
   *
   * @param {{ table: string, id: string, entityType?: "candidate"|"job_offer"|"client" }} params
   * @returns {Promise<{ data: any, error: any }>}
   */
  async function deletePermanentRecord(params) {
    const table = params && params.table;
    const id = params && params.id;

    if (!table || !id) {
      const error = new Error("Missing table or id");
      console.error("[Supabase] deletePermanentRecord:", error, { table, id });
      return { data: null, error };
    }

    if (PERMANENT_DELETE_TABLES.indexOf(table) === -1) {
      const error = new Error("Table not allowed for permanent delete");
      console.error("[Supabase] deletePermanentRecord:", error, { table, id });
      return { data: null, error };
    }

    let entityType = params && params.entityType;

    if (!entityType) {
      if (table === "candidates") {
        entityType = "candidate";
      } else if (table === "job_offers") {
        entityType = "job_offer";
      } else if (table === "clients") {
        entityType = "client";
      }
    }

    if (!entityType) {
      // Unknown table mapping: fall back to original behavior without log cleanup.
      return deletePermanent({ table, id });
    }

    try {
      const { error: logError } = await supabase
        .from("activity_logs")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_id", id);

      if (logError) {
        console.error(
          "[Supabase] deletePermanentRecord log cleanup error:",
          logError.message || logError,
          logError,
          { entityType, entity_id: id, table }
        );
        return { data: null, error: logError };
      }
    } catch (err) {
      console.error("[Supabase] deletePermanentRecord log cleanup exception:", err, {
        entityType,
        entity_id: id,
        table,
      });
      return { data: null, error: err };
    }

    return deletePermanent({ table, id });
  }

  // ---------------------------------------------------------------------------
  // Archive (soft delete) – entity-specific wrappers
  // ---------------------------------------------------------------------------

  /**
   * Archive a job offer (set is_archived = true). Does not remove the record.
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveJobOffer(id) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.archiveJobOffer !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.archiveJobOffer(id);
  }

  /**
   * Archive a client (set is_archived = true). Does not remove the record.
   * Delegates to IEData.clients.archiveClient for implementation.
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveClient(id) {
    const mod = getClientsModule();
    if (!mod || typeof mod.archiveClient !== "function") {
      return { data: null, error: new Error("Clients module not available") };
    }
    return mod.archiveClient(id);
  }

  // ---------------------------------------------------------------------------
  // Restore (unarchive) – set is_archived = false for Archiviati page
  // ---------------------------------------------------------------------------

  // archiveCandidate and unarchiveCandidate are delegated to IEData.candidates via the
  // facade wrappers defined in the Candidates section above.

  /**
   * Restore a job offer from archive (set is_archived = false).
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveJobOffer(id) {
    const mod = getJobOffersModule();
    if (!mod || typeof mod.unarchiveJobOffer !== "function") {
      return { data: null, error: new Error("Job-offers module not available") };
    }
    return mod.unarchiveJobOffer(id);
  }

  /**
   * Restore a client from archive (set is_archived = false).
   * Delegates to IEData.clients.unarchiveClient for implementation.
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveClient(id) {
    const mod = getClientsModule();
    if (!mod || typeof mod.unarchiveClient !== "function") {
      return { data: null, error: new Error("Clients module not available") };
    }
    return mod.unarchiveClient(id);
  }

  // ---------------------------------------------------------------------------
  // Candidate–Job associations
  // ---------------------------------------------------------------------------

  function getApplicationsModule() {
    if (!window.IEData || !window.IEData.applications) {
      console.error(
        "[Supabase] IEData.applications not found. Ensure portal/core/data/applications.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.applications;
  }

  // recalculateCandidateAvailability is deprecated in favor of derived availability from applications.
  async function recalculateCandidateAvailability(candidateId) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.recalculateCandidateAvailability !== "function"
    ) {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.recalculateCandidateAvailability(candidateId);
  }

  async function searchAvailableCandidatesForAssociation(opts) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.searchAvailableCandidatesForAssociation !== "function"
    ) {
      return {
        data: [],
        error: new Error("Applications module not available"),
      };
    }
    return mod.searchAvailableCandidatesForAssociation(opts);
  }

  async function linkCandidateToJob(payload) {
    const mod = getApplicationsModule();
    if (!mod || typeof mod.linkCandidateToJob !== "function") {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.linkCandidateToJob(payload);
  }

  async function searchActiveJobOffersForAssociation(opts) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.searchActiveJobOffersForAssociation !== "function"
    ) {
      return {
        data: [],
        error: new Error("Applications module not available"),
      };
    }
    return mod.searchActiveJobOffersForAssociation(opts);
  }

  // ---------------------------------------------------------------------------
  // Dashboard stats (delegated to portal/core/data/dashboard.js)
  // ---------------------------------------------------------------------------
  // Candidates table: id, first_name, last_name, position, status, source,
  // created_at, is_archived (and created_by)
  // Job offers table: id, status, is_archived, ...

  function getDashboardModule() {
    if (!window.IEData || !window.IEData.dashboard) {
      console.error(
        "[Supabase] IEData.dashboard not found. Ensure portal/core/data/dashboard.js is loaded before core/supabase.js."
      );
      return null;
    }
    return window.IEData.dashboard;
  }

  /**
   * Total count of candidates (non-archived only).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getTotalCandidates() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getTotalCandidates !== "function") {
      return { data: 0, error: new Error("Dashboard module not available") };
    }
    return mod.getTotalCandidates();
  }

  /**
   * Count of active job offers (non-archived).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getActiveJobOffers() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getActiveJobOffers !== "function") {
      return { data: 0, error: new Error("Dashboard module not available") };
    }
    return mod.getActiveJobOffers();
  }

  /**
   * Count of candidates created today (server date).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getNewCandidatesToday() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getNewCandidatesToday !== "function") {
      return { data: 0, error: new Error("Dashboard module not available") };
    }
    return mod.getNewCandidatesToday();
  }

  /**
   * Count of external candidate submissions awaiting intake review.
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getPendingReviewCount() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getPendingReviewCount !== "function") {
      return { data: 0, error: new Error("Dashboard module not available") };
    }
    return mod.getPendingReviewCount();
  }

  /**
   * Preview rows for external candidate submissions awaiting review.
   * Used by the dashboard Inbound Submissions table.
   * @param {number} limit
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getPendingExternalSubmissionsPreview(limit) {
    const mod = getDashboardModule();
    if (
      !mod ||
      typeof mod.getPendingExternalSubmissionsPreview !== "function"
    ) {
      return { data: [], error: new Error("Dashboard module not available") };
    }
    return mod.getPendingExternalSubmissionsPreview(limit);
  }

  /**
   * Job offers with postings for dashboard Live Offers card.
   * Caller must filter by window.isEffectiveLive(offer, posting) for canonical live state.
   * @returns {Promise<{ data: Array<{ offer: object, posting: object | null }>, error: object | null }>}
   */
  async function getJobOffersWithPostingsForDashboard() {
    const mod = getDashboardModule();
    if (
      !mod ||
      typeof mod.getJobOffersWithPostingsForDashboard !== "function"
    ) {
      return { data: [], error: new Error("Dashboard module not available") };
    }
    return mod.getJobOffersWithPostingsForDashboard();
  }

  /**
   * Count of applications (candidate_job_associations) with status 'hired' updated this month.
   * Recruitment pipeline metric; source of truth is candidate_job_associations.status.
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getHiredThisMonth() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getHiredThisMonth !== "function") {
      return { data: 0, error: new Error("Dashboard module not available") };
    }
    return mod.getHiredThisMonth();
  }

  /**
   * Recent candidates (non-archived, latest first), limit 10.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getRecentCandidates() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getRecentCandidates !== "function") {
      return { data: [], error: new Error("Dashboard module not available") };
    }
    return mod.getRecentCandidates();
  }

  /**
   * Candidates grouped by source. Returns array of { source: string, count: number }.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function getCandidatesBySource() {
    const mod = getDashboardModule();
    if (!mod || typeof mod.getCandidatesBySource !== "function") {
      return { data: [], error: new Error("Dashboard module not available") };
    }
    return mod.getCandidatesBySource();
  }

  /**
   * Fetch job history for a candidate (associations with job_offers joined).
   * Returns list of { association, job_offer }.
   */
  async function fetchJobHistoryForCandidate(candidateId) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.fetchJobHistoryForCandidate !== "function"
    ) {
      return {
        data: [],
        error: new Error("Applications module not available"),
      };
    }
    return mod.fetchJobHistoryForCandidate(candidateId);
  }

  async function fetchCandidatesForJobOffer(jobOfferId) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.fetchCandidatesForJobOffer !== "function"
    ) {
      return {
        data: [],
        error: new Error("Applications module not available"),
      };
    }
    return mod.fetchCandidatesForJobOffer(jobOfferId);
  }

  async function fetchApplicationsPaginated(filters, pagination) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.fetchApplicationsPaginated !== "function"
    ) {
      return {
        data: [],
        totalCount: 0,
        error: new Error("Applications module not available"),
      };
    }
    return mod.fetchApplicationsPaginated(filters, pagination);
  }

  async function updateCandidateAssociationStatus(
    associationId,
    status,
    options
  ) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.updateCandidateAssociationStatus !== "function"
    ) {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.updateCandidateAssociationStatus(
      associationId,
      status,
      options
    );
  }

  async function removeCandidateFromJob(associationId) {
    const mod = getApplicationsModule();
    if (!mod || typeof mod.removeCandidateFromJob !== "function") {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.removeCandidateFromJob(associationId);
  }

  async function deleteAssociationPermanently(associationId) {
    const mod = getApplicationsModule();
    if (
      !mod ||
      typeof mod.deleteAssociationPermanently !== "function"
    ) {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.deleteAssociationPermanently(associationId);
  }

  async function restoreApplication(associationId) {
    const mod = getApplicationsModule();
    if (!mod || typeof mod.restoreApplication !== "function") {
      return {
        data: null,
        error: new Error("Applications module not available"),
      };
    }
    return mod.restoreApplication(associationId);
  }

  // ---------------------------------------------------------------------------
  // Candidate file storage helpers (Supabase Storage)
  // ---------------------------------------------------------------------------

  // Candidate file storage helpers are implemented in portal/core/data/candidates.js and
  // exposed via IEData.candidates.

  // ---------------------------------------------------------------------------
  // Candidate profile details (skills, languages, experience, education, certifications, hobbies)
  // ---------------------------------------------------------------------------

  // Candidate profile detail helpers (skills, languages, experience, education, certifications, hobbies)
  // are now implemented in portal/core/data/candidates.js and exposed via IEData.candidates.

  // ---------------------------------------------------------------------------
  // Activity Logs
  // ---------------------------------------------------------------------------

  /**
   * Create a manual activity log note for an entity.
   * Delegates to IEData.activity.createLog.
   */
  async function createLog(entityType, entityId, message) {
    const mod = getActivityModule();
    if (!mod || typeof mod.createLog !== "function") {
      return { data: null, error: new Error("Activity module not available") };
    }
    return mod.createLog(entityType, entityId, message);
  }

  /**
   * Fetch activity logs for an entity.
   * Delegates to IEData.activity.fetchLogs.
   */
  async function fetchLogs(entityType, entityId, options) {
    const mod = getActivityModule();
    if (!mod || typeof mod.fetchLogs !== "function") {
      return {
        data: { logs: [], hasMore: false },
        error: new Error("Activity module not available"),
      };
    }
    return mod.fetchLogs(entityType, entityId, options);
  }

  /**
   * Thin wrapper returning a flat array of logs for an entity.
   * Delegates to IEData.activity.fetchEntityLogs.
   */
  async function fetchEntityLogs(entityType, entityId) {
    const mod = getActivityModule();
    if (!mod || typeof mod.fetchEntityLogs !== "function") {
      return { data: [], error: new Error("Activity module not available") };
    }
    return mod.fetchEntityLogs(entityType, entityId);
  }

  /**
   * Thin wrapper to insert a manual note log for an entity.
   * Delegates to IEData.activity.insertEntityLog.
   */
  async function insertEntityLog(payload) {
    const mod = getActivityModule();
    if (!mod || typeof mod.insertEntityLog !== "function") {
      return { data: null, error: new Error("Activity module not available") };
    }
    return mod.insertEntityLog(payload);
  }

  /**
   * Fetch all activity logs created by the logged-in user.
   * Delegates to IEData.activity.fetchMyActivityLogs.
   */
  async function fetchMyActivityLogs() {
    const mod = getActivityModule();
    if (!mod || typeof mod.fetchMyActivityLogs !== "function") {
      return { data: null, error: new Error("Activity module not available") };
    }
    return mod.fetchMyActivityLogs();
  }

  /**
   * Update an activity log message.
   * Delegates to IEData.activity.updateLog.
   */
  async function updateLog(logId, message) {
    const mod = getActivityModule();
    if (!mod || typeof mod.updateLog !== "function") {
      return { data: null, error: new Error("Activity module not available") };
    }
    return mod.updateLog(logId, message);
  }

  /**
   * Update a manual activity log created by the current user.
   * Delegates to IEData.activity.updateMyManualLog.
   */
  async function updateMyManualLog(id, payload) {
    const mod = getActivityModule();
    if (!mod || typeof mod.updateMyManualLog !== "function") {
      return { data: null, error: new Error("Activity module not available") };
    }
    return mod.updateMyManualLog(id, payload);
  }

  /**
   * Delete an activity log by id.
   * Delegates to IEData.activity.deleteLog.
   */
  async function deleteLog(logId) {
    const mod = getActivityModule();
    if (!mod || typeof mod.deleteLog !== "function") {
      return {
        data: { success: false },
        error: new Error("Activity module not available"),
      };
    }
    return mod.deleteLog(logId);
  }

  /**
   * Delete a manual activity log created by the current user.
   * Delegates to IEData.activity.deleteMyManualLog.
   */
  async function deleteMyManualLog(id) {
    const mod = getActivityModule();
    if (!mod || typeof mod.deleteMyManualLog !== "function") {
      return {
        data: { success: false },
        error: new Error("Activity module not available"),
      };
    }
    return mod.deleteMyManualLog(id);
  }

  /**
   * Create an automatic/system activity log for an entity.
   * Delegates to IEData.activity.createAutoLog.
   */
  async function createAutoLog(entityType, entityId, payload) {
    const mod = getActivityModule();
    if (!mod || typeof mod.createAutoLog !== "function") {
      // Auto-logs must never block the main flow (saves/updates).
      // When the activity module is missing, treat logging as a no-op.
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[Supabase] Skipping auto activity log; activity module not available."
        );
      }
      return { data: null, error: null };
    }
    return mod.createAutoLog(entityType, entityId, payload);
  }

  // ---------------------------------------------------------------------------
  // User feedback helper
  // ---------------------------------------------------------------------------

  function showError(message, context) {
    console.error("[Supabase]", context || "", message);
  }

  function showSuccess(message) {
    if (typeof window.debugLog === "function") window.debugLog("[Supabase] Success:", message);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.IESupabase = Object.assign(window.IESupabase || {}, {
    supabase,
    // Auth
    login,
    logout,
    getSession,
    enforceAuthGuard,
    redirectToDashboard,
    redirectToLogin,
    redirectToDashboardIfAuthenticated,
    requireAuth,
    // Profile
    ensureProfile,
    getProfile,
    updateProfile,
    // Candidates
    insertCandidate,
    getCandidateById,
    updateCandidate,
    updateCandidateProfileStatus,
    archiveCandidate,
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
    // Job offers
    insertJobOffer,
    getJobOfferById,
    fetchJobOfferById,
    updateJobOffer,
    updateJobOfferStatus,
    archiveJobOffer,
    fetchJobOffers,
    fetchJobOffersPaginated,
    searchJobOffersByTitle,
    // Job postings (V1 – read + Phase 2 writes)
    getJobPostingById,
    getJobPostingBySlug,
    getPublishedJobPostingBySlug,
    getJobPostingByJobOfferId,
    getJobPostingsByJobOfferIds,
    listJobPostings,
    createJobPostingFromJobOffer,
    updateJobPosting,
    // Clients
    insertClient,
    getClientById,
    updateClient,
    archiveClient,
    fetchClientsPaginated,
    searchClientsByName,
    // Activity Logs
    fetchMyActivityLogs,
    fetchEntityLogs,
    insertEntityLog,
    createLog,
    fetchLogs,
    updateLog,
    deleteLog,
    createAutoLog,
    updateMyManualLog,
    deleteMyManualLog,
    // Restore (unarchive) for Archiviati page
    unarchiveCandidate,
    unarchiveJobOffer,
    unarchiveClient,
    // Associations
    linkCandidateToJob,
    searchAvailableCandidatesForAssociation,
    searchActiveJobOffersForAssociation,
    fetchJobHistoryForCandidate,
    fetchCandidatesForJobOffer,
    fetchApplicationsPaginated,
    updateCandidateAssociationStatus,
    removeCandidateFromJob,
    recalculateCandidateAvailability,
    restoreApplication,
    deleteAssociationPermanently,
    // Dashboard
    getTotalCandidates,
    getActiveJobOffers,
    getNewCandidatesToday,
    getPendingReviewCount,
    getHiredThisMonth,
    getRecentCandidates,
    getCandidatesBySource,
    getPendingExternalSubmissionsPreview,
    getJobOffersWithPostingsForDashboard,
    // Deletes / archive helpers
    deletePermanentRecord: deletePermanentRecord,
    // Helpers
    showError,
    showSuccess,
    getBasePath,
  });
})();
