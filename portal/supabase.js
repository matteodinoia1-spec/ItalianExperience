// ============================================================================
// Italian Experience – Supabase integration
// ----------------------------------------------------------------------------
// Load this AFTER the Supabase CDN script:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Uses publishable (anon) key only. RLS must be configured in Supabase.
//
// Expected table/column names (adjust if your DB differs):
//   profiles: id (uuid, = auth.users.id), email, full_name
//   candidates: id, created_by (uuid), first_name, last_name, position,
//               address, status, source, notes, created_at
//               (no client_name; relationship is via candidate_job_associations -> job_offers -> clients)
//   job_offers: id, created_by, title, position, client_name, location,
//               description, requirements, notes, status, created_at
//   candidate_job_associations: id, candidate_id, job_offer_id, status, notes,
//                               created_by, created_at
// ============================================================================

(function () {
  "use strict";

  if (typeof window.supabase === "undefined") {
    console.error("[Supabase] window.supabase not found. Include Supabase JS v2 from CDN before this script.");
    window.IESupabase = null;
    return;
  }

  const supabaseUrl = "https://xgioojjmrjcurajgirpa.supabase.co".trim();
  const supabaseKey = "sb_publishable_36r1oFbqjUoktzPTCvxDWg_sSwhxhzM";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

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
      return { data: { session, user: session?.user ?? null }, error: null };
    } catch (err) {
      console.error("[Supabase Auth] getSession exception:", err);
      return { data: { session: null, user: null }, error: err };
    }
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
   */
  async function requireAuth() {
    const { data } = await getSession();
    if (!data?.user) redirectToLogin();
    return data.user;
  }

  function getBasePath() {
    try {
      const url = new URL(".", window.location.href);
      return url.href;
    } catch (e) {
      const path = (window.location.pathname || "").replace(/[^/]+$/, "");
      return window.location.origin + (path || "/") + (path && !path.endsWith("/") ? "/" : "");
    }
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

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || null,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Supabase] ensureProfile insert error:", insertError.message, insertError);
        return { data: null, error: insertError };
      }
      return { data: inserted, error: null };
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
    const userId = sessionData?.user?.id;
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
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] getProfile exception:", err);
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidates
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
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] insertCandidate:", err);
      return { data: null, error: err };
    }
    try {
      const row = {
        created_by: userId,
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        position: payload.position || null,
        address: payload.address || null,
        status: payload.status || "new",
        source: payload.source || null,
        notes: payload.notes || null,
      };
      const { data, error } = await supabase.from("candidates").insert(row).select().single();
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
   * Fetch all candidates created by the logged-in user.
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchMyCandidates() {
    const { data: sessionData } = await getSession();
    const userId = sessionData?.user?.id;
    if (!userId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase] fetchMyCandidates error:", error.message, error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] fetchMyCandidates exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Job offers
  // ---------------------------------------------------------------------------

  /**
   * Insert a new job offer.
   * Expects table: job_offers (id, created_by, title, position, client_name, location, description, status, created_at, ...)
   * @param {object} payload - { title, position, client_name, location, description, requirements, notes, status }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertJobOffer(payload) {
    const { data: sessionData } = await getSession();
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] insertJobOffer:", err);
      return { data: null, error: err };
    }
    try {
      const row = {
        created_by: userId,
        title: payload.title || "",
        position: payload.position || null,
        client_name: payload.client_name || null,
        location: payload.location || null,
        description: payload.description || null,
        requirements: payload.requirements || null,
        notes: payload.notes || null,
        status: payload.status || "open",
      };
      const { data, error } = await supabase.from("job_offers").insert(row).select().single();
      if (error) {
        console.error("[Supabase] insertJobOffer error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] insertJobOffer exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch all job offers (RLS should restrict if needed).
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchJobOffers() {
    try {
      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase] fetchJobOffers error:", error.message, error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] fetchJobOffers exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Candidate–Job associations
  // ---------------------------------------------------------------------------

  /**
   * Link a candidate to a job offer.
   * Table: candidate_job_associations (candidate_id, job_offer_id, status, notes, created_by, ...)
   * @param {object} payload - { candidate_id, job_offer_id, status, notes }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function linkCandidateToJob(payload) {
    const { data: sessionData } = await getSession();
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] linkCandidateToJob:", err);
      return { data: null, error: err };
    }
    try {
      const row = {
        candidate_id: payload.candidate_id,
        job_offer_id: payload.job_offer_id,
        status: payload.status || "new",
        notes: payload.notes || null,
        created_by: userId,
      };
      const { data, error } = await supabase
        .from("candidate_job_associations")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] linkCandidateToJob error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] linkCandidateToJob exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch associations (optionally for a job_offer_id or candidate_id).
   * @param {object} opts - { job_offer_id?: string, candidate_id?: string }
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchAssociations(opts = {}) {
    try {
      let q = supabase.from("candidate_job_associations").select("*");
      if (opts.job_offer_id) q = q.eq("job_offer_id", opts.job_offer_id);
      if (opts.candidate_id) q = q.eq("candidate_id", opts.candidate_id);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase] fetchAssociations error:", error.message, error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] fetchAssociations exception:", err);
      return { data: [], error: err };
    }
  }

  /**
   * Fetch job history for a candidate (associations with job_offers joined).
   * Returns list of { association, job_offer } if job_offers has title/client_name etc.
   * @param {string} candidateId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchJobHistoryForCandidate(candidateId) {
    if (!candidateId) return { data: [], error: null };
    try {
      const { data: assocs, error: assocError } = await supabase
        .from("candidate_job_associations")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (assocError) {
        console.error("[Supabase] fetchJobHistoryForCandidate error:", assocError.message, assocError);
        return { data: [], error: assocError };
      }
      if (!assocs?.length) return { data: [], error: null };
      const offerIds = [...new Set(assocs.map((a) => a.job_offer_id))];
      const { data: offers, error: offersError } = await supabase
        .from("job_offers")
        .select("id, title, client_name, location, status")
        .in("id", offerIds);
      if (offersError) {
        console.error("[Supabase] fetchJobHistoryForCandidate job_offers error:", offersError.message);
        return { data: assocs.map((a) => ({ association: a, job_offer: null })), error: null };
      }
      const offerMap = (offers || []).reduce((acc, o) => { acc[o.id] = o; return acc; }, {});
      const result = assocs.map((a) => ({ association: a, job_offer: offerMap[a.job_offer_id] || null }));
      return { data: result, error: null };
    } catch (err) {
      console.error("[Supabase] fetchJobHistoryForCandidate exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // User feedback helper
  // ---------------------------------------------------------------------------

  function showError(message, context) {
    console.error("[Supabase]", context || "", message);
    if (typeof alert === "function") alert(message);
  }

  function showSuccess(message) {
    if (typeof alert === "function") alert(message);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.IESupabase = {
    supabase,
    // Auth
    login,
    logout,
    getSession,
    redirectToDashboard,
    redirectToLogin,
    redirectToDashboardIfAuthenticated,
    requireAuth,
    // Profile
    ensureProfile,
    getProfile,
    // Candidates
    insertCandidate,
    fetchMyCandidates,
    // Job offers
    insertJobOffer,
    fetchJobOffers,
    // Associations
    linkCandidateToJob,
    fetchAssociations,
    fetchJobHistoryForCandidate,
    // Helpers
    showError,
    showSuccess,
    getBasePath,
  };
})();
