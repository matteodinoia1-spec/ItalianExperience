// ============================================================================
// Italian Experience – Supabase integration
// ----------------------------------------------------------------------------
// Load this AFTER the Supabase CDN script:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Uses publishable (anon) key only. RLS must be configured in Supabase.
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
   * Centralized authentication guard.
   * - If there is no active session, performs a hard redirect to the portal login page.
   * - If authenticated, returns the current user object.
   * @returns {Promise<object|null>} user or null if redirecting
   */
  async function enforceAuthGuard() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.user) {
        const base = "/ItalianExperience/portal/";
        const target = base + "index.html";
        if (window.location.pathname + (window.location.search || "") + (window.location.hash || "") !== target) {
          window.location.replace(target);
        }
        return null;
      }

      return session.user;
    } catch (_) {
      const base = "/ItalianExperience/portal/";
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
      // Auth success: log user id so we can verify auth.uid() will be non-null on queries.
      if (data?.user?.id) {
        console.log("[Supabase Auth] Login success. User id:", data.user.id);
      } else {
        console.log("[Supabase Auth] Login success but user object missing.");
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
      if (session?.user?.id) {
        // Session restored on page load (or still valid): useful to confirm persistence across navigation.
        console.log("[Supabase Auth] Session restored for user id:", session.user.id);
      } else {
        console.log("[Supabase Auth] No active session found.");
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
   * Returns the current user or undefined; after redirect, caller should not continue.
   */
  async function requireAuth() {
    const user = await enforceAuthGuard();
    if (!user) return undefined;
    return user;
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

      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const parts = String(fullName).trim().split(/\s+/);
      const derivedFirst = parts[0] || "";
      const derivedLast = parts.slice(1).join(" ") || null;
      const first_name = (user.user_metadata?.first_name || "").trim() || derivedFirst;
      const last_name = (user.user_metadata?.last_name || "").trim() || derivedLast;

      console.log("[Profile] Creating profile for user:", user.id);

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
        console.log("[Profile] No profile found for user, ensuring profile exists:", userId);
        const { data: ensured, error: ensureError } = await ensureProfile(user);
        if (ensureError) {
          console.error("[Supabase] getProfile ensureProfile error:", ensureError.message || ensureError, ensureError);
          return { data: null, error: ensureError };
        }
        console.log("[Profile] Loaded profile:", ensured);
        return { data: ensured || null, error: null };
      }
      console.log("[Profile] Loaded profile:", data);
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
      console.log("[Profile] Updating profile for user:", userId, "payload:", payload);
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
      console.log("[Supabase] insertCandidate as user id:", userId);
      const row = {
        created_by: userId,
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        position: payload.position || null,
        address: payload.address || null,
        status: payload.status || "new",
        source: payload.source || null,
        notes: payload.notes || null,
        is_archived: false,
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
   * Fetch a single candidate by id (for edit page).
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getCandidateById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("candidates_with_client")
        .select("*")
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
      const updates = {
        first_name: payload.first_name ?? "",
        last_name: payload.last_name ?? "",
        position: payload.position ?? null,
        address: payload.address ?? null,
        status: payload.status ?? "new",
        source: payload.source ?? null,
        notes: payload.notes ?? null,
      };
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
    const userId = sessionData?.user?.id;
    if (!userId) return { data: [], error: null };
    try {
      console.log("[Supabase] fetchMyCandidates for user id:", userId);
      const { data, error } = await supabase
        .from("candidates_with_client")
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
   * Expects table: job_offers (id, created_by, title, position, client_id, description, requirements, notes, salary, contract_type, positions, city, state, deadline, status, created_at, ...)
   * @param {object} payload - { client_id, title, position, description, requirements, notes, salary, contract_type, positions, city, state, deadline, status }
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
      console.log("[Supabase] insertJobOffer as user id:", userId);
      const row = {
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
        city: payload.city || null,
        state: payload.state || null,
        deadline: payload.deadline || null,
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
        .from("job_offers_with_client")
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

  /**
   * Build candidates query with filters (same logic for count and data).
   * Filters: name, position, address, status, source, archived.
   * Columns: first_name, last_name, position, address, status, source, is_archived, created_by.
   */
  function buildCandidatesQuery(supabaseQuery, filters, userId) {
    let q = supabaseQuery.eq("created_by", userId);
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
    const userId = sessionData?.user?.id;
    if (!userId) return { data: [], totalCount: 0, error: null };

    const filters = opts.filters || {};
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 10));
    const offset = (page - 1) * limit;

    try {
      console.log("[Supabase] fetchCandidatesPaginated for user id:", userId, "page:", page, "limit:", limit);
      const countQuery = buildCandidatesQuery(
        supabase.from("candidates_with_client").select("*", { count: "exact", head: true }),
        filters,
        userId
      );
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("[Supabase] fetchCandidatesPaginated count error:", countError.message);
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count ?? 0;

      const dataQuery = buildCandidatesQuery(
        supabase.from("candidates_with_client").select("*"),
        filters,
        userId
      );
      const { data: rows, error: dataError } = await dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        console.error("[Supabase] fetchCandidatesPaginated data error:", dataError.message);
        return { data: [], totalCount, error: dataError };
      }
      const data = (rows || []).map(function (r) {
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
          client_name: r.client_name,
          photo_url: r.photo_url,
        };
      });
      return { data, totalCount, error: null };
    } catch (err) {
      console.error("[Supabase] fetchCandidatesPaginated exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  /**
   * Build job offers query with filters (same logic for count and data).
   * Filters: title, offerStatus, archived, city, state. Columns: title, city, state, status, is_archived.
   */
  function buildJobOffersQuery(supabaseQuery, filters) {
    let q = supabaseQuery;
    if (filters.archived === "active") q = q.eq("is_archived", false);
    if (filters.archived === "archived") q = q.eq("is_archived", true);
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.contractType) q = q.eq("contract_type", filters.contractType);
    if (filters.offerStatus) q = q.eq("status", filters.offerStatus);
    const titleTerm = (filters.title || "").trim();
    if (titleTerm) {
      const escaped = titleTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("title", "%" + escaped + "%");
    }
    const cityTerm = (filters.city || "").trim();
    if (cityTerm) {
      const escaped = cityTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("city", "%" + escaped + "%");
    }
    const stateTerm = (filters.state || "").trim();
    if (stateTerm) {
      const escaped = stateTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("state", "%" + escaped + "%");
    }
    return q;
  }

  /**
   * Fetch job offers with filters and pagination. Returns total count (with same filters) and page of data.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchJobOffersPaginated(opts) {
    const filters = opts.filters || {};
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 10));
    const offset = (page - 1) * limit;

    try {
      const countQuery = buildJobOffersQuery(
        supabase.from("job_offers_with_client").select("*", { count: "exact", head: true }),
        filters
      );
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("[Supabase] fetchJobOffersPaginated count error:", countError.message);
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count ?? 0;

      const dataQuery = buildJobOffersQuery(
        supabase.from("job_offers_with_client").select("*"),
        filters
      );
      const { data: rows, error: dataError } = await dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        console.error("[Supabase] fetchJobOffersPaginated data error:", dataError.message);
        return { data: [], totalCount, error: dataError };
      }
      const data = (rows || []).map(function (r) {
        return {
          id: r.id,
          title: r.title,
          position: r.position,
          client_id: r.client_id,
          client_name: r.client_name,
          description: r.description,
          requirements: r.requirements,
          notes: r.notes,
          salary: r.salary,
          contract_type: r.contract_type,
          positions: r.positions,
          city: r.city,
          state: r.state,
          location: r.location,
          deadline: r.deadline,
          status: r.status,
          created_at: r.created_at,
          is_archived: r.is_archived,
        };
      });
      return { data, totalCount, error: null };
    } catch (err) {
      console.error("[Supabase] fetchJobOffersPaginated exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------

  /**
   * Build clients query with filters (same logic for count and data).
   * Filters: name, city, state, country, archived.
   * Columns: name, city, state, country, email, phone, is_archived.
   */
  function buildClientsQuery(supabaseQuery, filters) {
    let q = supabaseQuery;

    if (filters.archived === "active") q = q.eq("is_archived", false);
    if (filters.archived === "archived") q = q.eq("is_archived", true);

    const nameTerm = (filters.name || "").trim();
    if (nameTerm) {
      const escaped = nameTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("name", "%" + escaped + "%");
    }

    const cityTerm = (filters.city || "").trim();
    if (cityTerm) {
      const escaped = cityTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("city", "%" + escaped + "%");
    }

    const stateTerm = (filters.state || "").trim();
    if (stateTerm) {
      const escaped = stateTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("state", "%" + escaped + "%");
    }

    const countryTerm = (filters.country || "").trim();
    if (countryTerm) {
      const escaped = countryTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.ilike("country", "%" + escaped + "%");
    }

    return q;
  }

  /**
   * Insert a new client. Expects table: clients (id, created_by, name, city, state, country, email, phone, notes, is_archived, created_at).
   * @param {object} payload - { name, city?, state?, country?, email?, phone?, notes? }
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertClient(payload) {
    const { data: sessionData } = await getSession();
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] insertClient:", err);
      return { data: null, error: err };
    }
    try {
      console.log("[Supabase] insertClient as user id:", userId);
      const row = {
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
      const { data, error } = await supabase.from("clients").insert(row).select().single();
      if (error) {
        console.error("[Supabase] insertClient error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] insertClient exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch clients with filters and pagination. Returns total count (with same filters) and page of data.
   * @param {object} opts - { filters: object, page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchClientsPaginated(opts) {
    const filters = opts.filters || {};
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 10));
    const offset = (page - 1) * limit;

    try {
      const countQuery = buildClientsQuery(
        supabase.from("clients").select("*", { count: "exact", head: true }),
        filters
      );
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("[Supabase] fetchClientsPaginated count error:", countError.message, countError);
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count ?? 0;

      const dataQuery = buildClientsQuery(
        supabase.from("clients").select("*"),
        filters
      );
      const { data: rows, error: dataError } = await dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        console.error("[Supabase] fetchClientsPaginated data error:", dataError.message, dataError);
        return { data: [], totalCount, error: dataError };
      }

      const data = (rows || []).map(function (r) {
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
        };
      });

      return { data, totalCount, error: null };
    } catch (err) {
      console.error("[Supabase] fetchClientsPaginated exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  /**
   * Lightweight client search by name, for autocomplete widgets.
   * @param {{ term: string, limit?: number }} opts
   * @returns {Promise<{ data: Array<{ id: string, name: string }>, error: object | null }>}
   */
  async function searchClientsByName(opts) {
    const term = (opts && opts.term) || "";
    const rawLimit = (opts && opts.limit) || 5;
    const limit = Math.max(1, Math.min(20, parseInt(rawLimit, 10) || 5));

    if (!term.trim()) {
      return { data: [], error: null };
    }

    try {
      const escaped = term.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
      const pattern = "%" + escaped + "%";

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .ilike("name", pattern)
        .order("name", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("[Supabase] searchClientsByName error:", error.message, error);
        return { data: [], error };
      }

      const rows = (data || []).map(function (r) {
        return { id: r.id, name: r.name || "" };
      });

      return { data: rows, error: null };
    } catch (err) {
      console.error("[Supabase] searchClientsByName exception:", err);
      return { data: [], error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE / ARCHIVE HELPERS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Archive (soft delete) – entity-specific wrappers
  // ---------------------------------------------------------------------------

  /**
   * Archive a candidate (set is_archived = true). Does not remove the record.
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveCandidate(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return archiveRecord({ table: "candidates", id });
  }

  /**
   * Archive a job offer (set is_archived = true). Does not remove the record.
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveJobOffer(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return archiveRecord({ table: "job_offers", id });
  }

  /**
   * Archive a client (set is_archived = true). Does not remove the record.
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function archiveClient(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return archiveRecord({ table: "clients", id });
  }

  // ---------------------------------------------------------------------------
  // Restore (unarchive) – set is_archived = false for Archiviati page
  // ---------------------------------------------------------------------------

  /**
   * Restore a candidate from archive (set is_archived = false).
   * @param {string} id - candidate id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveCandidate(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return unarchiveRecord({ table: "candidates", id });
  }

  /**
   * Restore a job offer from archive (set is_archived = false).
   * @param {string} id - job_offers id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveJobOffer(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return unarchiveRecord({ table: "job_offers", id });
  }

  /**
   * Restore a client from archive (set is_archived = false).
   * @param {string} id - clients id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function unarchiveClient(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    return unarchiveRecord({ table: "clients", id });
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
      console.log("[Supabase] linkCandidateToJob as user id:", userId, "candidate:", payload.candidate_id, "job_offer:", payload.job_offer_id);
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

  // ---------------------------------------------------------------------------
  // Dashboard stats (real-time from candidates + job_offers)
  // ---------------------------------------------------------------------------
  // Candidates table: id, first_name, last_name, position, status, source, created_at, is_archived (and created_by)
  // Job offers table: id, status, is_archived, ...

  /**
   * Total count of candidates (non-archived only).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function getTotalCandidates() {
    try {
      let q = supabase.from("candidates_with_client").select("*", { count: "exact", head: true });
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      const { count, error } = await q;
      if (error) {
        console.error("[Supabase] getTotalCandidates error:", error.message, error);
        return { data: 0, error };
      }
      return { data: count ?? 0, error: null };
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
      let q = supabase.from("job_offers_with_client").select("*", { count: "exact", head: true });
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      const { count, error } = await q;
      if (error) {
        console.error("[Supabase] getActiveJobOffers error:", error.message, error);
        return { data: 0, error };
      }
      return { data: count ?? 0, error: null };
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
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const { data, error } = await supabase
        .from("candidates_with_client")
        .select("id")
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);
      if (error) {
        console.error("[Supabase] getNewCandidatesToday error:", error.message, error);
        return { data: 0, error };
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
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const { data, error } = await supabase
        .from("candidates_with_client")
        .select("id")
        .eq("status", "hired")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);
      if (error) {
        console.error("[Supabase] getHiredThisMonth error:", error.message, error);
        return { data: 0, error };
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
      let q = supabase
        .from("candidates_with_client")
        .select("id, first_name, last_name, position, status, source, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      try {
        q = q.eq("is_archived", false);
      } catch (_) {}
      const { data, error } = await q;
      if (error) {
        console.error("[Supabase] getRecentCandidates error:", error.message, error);
        return { data: [], error };
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
      const { data, error } = await supabase
        .from("candidates_with_client")
        .select("source")
        .eq("is_archived", false);
      if (error) {
        console.error("[Supabase] getCandidatesBySource error:", error.message, error);
        return { data: [], error };
      }
      const list = data || [];
      const bySource = {};
      list.forEach((row) => {
        const s = (row.source || "other").toString().trim() || "other";
        bySource[s] = (bySource[s] || 0) + 1;
      });
      const total = list.length;
      const result = Object.entries(bySource).map(([source, count]) => ({
        source,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
      result.sort((a, b) => b.count - a.count);
      return { data: result, error: null };
    } catch (err) {
      console.error("[Supabase] getCandidatesBySource exception:", err);
      return { data: [], error: err };
    }
  }

  /**
   * Fetch job history for a candidate (associations with job_offers joined).
   * Returns list of { association, job_offer }.
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
        .from("job_offers_with_client")
        .select("id, title, position, city, state, salary, deadline, status, client_name, location")
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
  }

  function showSuccess(message) {
    console.log("[Supabase] Success:", message);
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
    archiveCandidate,
    fetchMyCandidates,
    fetchCandidatesPaginated,
    // Job offers
    insertJobOffer,
    archiveJobOffer,
    fetchJobOffers,
    fetchJobOffersPaginated,
    // Clients
    insertClient,
    archiveClient,
    fetchClientsPaginated,
    searchClientsByName,
    // Restore (unarchive) for Archiviati page
    unarchiveCandidate,
    unarchiveJobOffer,
    unarchiveClient,
    // Associations
    linkCandidateToJob,
    fetchAssociations,
    fetchJobHistoryForCandidate,
    // Dashboard
    getTotalCandidates,
    getActiveJobOffers,
    getNewCandidatesToday,
    getHiredThisMonth,
    getRecentCandidates,
    getCandidatesBySource,
    // Deletes / archive helpers
    deletePermanentRecord: deletePermanent,
    // Helpers
    showError,
    showSuccess,
    getBasePath,
  };
})();
