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
   * Internal helper: augment update payloads with audit fields.
   * - Requires an authenticated user.
   * - Adds updated_at (ISO string) and updated_by (user.id).
   * @param {object} updates
   * @returns {Promise<object>} merged updates
   */
  async function withUpdateAuditFields(updates) {
    const { data, error } = await getSession();
    if (error) {
      console.error("[Supabase] withUpdateAuditFields getSession error:", error.message || error, error);
      throw error;
    }
    const user = data && data.user;
    if (!user || !user.id) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] withUpdateAuditFields:", err);
      throw err;
    }
    return {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
  }

  // ---------------------------------------------------------------------------
  // Activity Logs (internal helpers)
  // ---------------------------------------------------------------------------

  function assertEntity(entityType, entityId) {
    const allowed = ["candidate", "job_offer", "client"];
    if (!allowed.includes(entityType)) {
      throw new Error("Invalid entityType");
    }
    if (typeof entityId !== "string" || !entityId) {
      throw new Error("Invalid entityId");
    }
  }

  function normalizeMessage(message) {
    const cleaned = String(message ?? "").trim();
    if (!cleaned) {
      throw new Error("Message is required");
    }
    if (cleaned.length > 500) {
      throw new Error("Message too long (max 500 chars)");
    }
    return cleaned;
  }

  async function getCurrentUserId() {
    const { data: sessionData, error } = await getSession();
    if (error) {
      throw error;
    }
    const userId = sessionData?.user?.id;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return userId;
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
        email: payload.email || null,
        phone: payload.phone || null,
        linkedin_url: payload.linkedin_url || null,
        date_of_birth: payload.date_of_birth || null,
        summary: payload.summary || null,
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
    const userId = sessionData?.user?.id;
    if (!userId) return { data: [], error: null };
    try {
      console.log("[Supabase] fetchMyCandidates for user id:", userId);
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
        if (!clientName && Array.isArray(r.candidate_job_associations) && r.candidate_job_associations.length > 0) {
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
        positions_required: Math.max(1, Number(payload.positions_required ?? payload.positions ?? 1)),
        city: payload.city || null,
        state: payload.state || null,
        deadline: payload.deadline || null,
        status: payload.status || "active",
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
   * Fetch a single job offer by id (with client join).
   * @param {string} id - job_offer id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getJobOfferById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("job_offers")
        .select(
          `
            *,
            created_by_profile:profiles!job_offers_created_by_profiles_fkey(
              id,
              first_name,
              last_name
            ),
            updated_by_profile:profiles!job_offers_updated_by_profiles_fkey(
              id,
              first_name,
              last_name
            ),
            clients (
              id,
              name,
              city,
              state
            )
          `
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("[Supabase] getJobOfferById error:", error.message, error);
        return { data: null, error };
      }
      if (!data) return { data: null, error: null };
      const client = data.clients || null;
      const normalized = {
        ...data,
        client_name: data.client_name || (client && client.name) || null,
      };
      return { data: normalized, error: null };
    } catch (err) {
      console.error("[Supabase] getJobOfferById exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Fetch a single job offer by id (wrapper used by UI code).
   * Kept separate so different pages (list, modal preview, full view)
   * can share the same loading function without duplicating queries.
   * @param {string} id - job_offer id
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
      const baseUpdates = {
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
      if (payload.positions !== undefined || payload.positions_required !== undefined) {
        baseUpdates.positions_required = Math.max(1, Number(payload.positions_required ?? payload.positions ?? 1));
      }
      const updates = await withUpdateAuditFields(baseUpdates);
      const { data, error } = await supabase
        .from("job_offers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateJobOffer error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateJobOffer exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Update only the status of a job offer (lifecycle: active | closed | archived).
   * @param {string} id - job_offer id
   * @param {string} status - "active" | "closed" | "archived"
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateJobOfferStatus(id, status) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("job_offers")
        .select("status")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("[Supabase] updateJobOfferStatus fetch error:", fetchError.message, fetchError);
        return { data: null, error: fetchError };
      }

      const oldStatus = existing?.status || null;

      const { data, error } = await supabase
        .from("job_offers")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Supabase] updateJobOfferStatus update error:", error.message, error);
        return { data: null, error };
      }

      // Manual close path: when transitioning into "closed", update associations and
      // then recalculate availability for affected candidates.
      if (oldStatus !== "closed" && status === "closed") {
        const { data: updatedAssocs, error: assocError } = await supabase
          .from("candidate_job_associations")
          .update({ status: "not_selected" })
          .eq("job_offer_id", id)
          .not("status", "in", "(hired,rejected,not_selected)")
          .select("candidate_id");

        if (assocError) {
          console.error(
            "[Supabase] updateJobOfferStatus associations update error:",
            assocError.message || assocError,
            assocError,
            { jobOfferId: id }
          );
        } else if (Array.isArray(updatedAssocs) && updatedAssocs.length > 0) {
          const candidateIds = Array.from(
            new Set(
              updatedAssocs
                .map(function (row) {
                  return row && row.candidate_id;
                })
                .filter(Boolean)
            )
          );

          for (const candidateId of candidateIds) {
            await recalculateCandidateAvailability(candidateId);
          }
        }
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateJobOfferStatus exception:", err);
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
        .select(
          `
          *,
          clients (
            id,
            name,
            city,
            state
          )
        `
        )
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
    const userId = sessionData?.user?.id;
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
          console.error("[Supabase] fetchCandidatesPaginated associations error:", assocError.message);
          return { data: [], totalCount: 0, error: assocError };
        }

        const candidateIds =
          Array.isArray(assocRows)
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

      let baseCountQuery = supabase.from("candidates").select("*", { count: "exact", head: true });
      if (candidateIdsForOffer && candidateIdsForOffer.length) {
        baseCountQuery = baseCountQuery.in("id", candidateIdsForOffer);
      }

      const countQuery = buildCandidatesQuery(baseCountQuery, filters, userId);
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("[Supabase] fetchCandidatesPaginated count error:", countError.message);
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count ?? 0;

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

      const dataQuery = buildCandidatesQuery(baseDataQuery, filters, userId);
      const { data: rows, error: dataError } = await dataQuery
        .order("created_at", { foreignTable: "candidate_job_associations", ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        console.error("[Supabase] fetchCandidatesPaginated data error:", dataError.message);
        return { data: [], totalCount, error: dataError };
      }
      const data = (rows || []).map(function (r) {
        let latestAssociation = null;
        if (Array.isArray(r.candidate_job_associations) && r.candidate_job_associations.length > 0) {
          latestAssociation = r.candidate_job_associations[0];
        }

        let latestJob = latestAssociation && latestAssociation.job_offers ? latestAssociation.job_offers : null;
        let latestClient = latestJob && latestJob.clients ? latestJob.clients : null;

        const latestClientName =
          r.client_name ||
          (latestClient && latestClient.name) ||
          null;

        const latestJobLocation = latestJob
          ? [latestJob.city, latestJob.state]
              .filter(function (x) {
                return x;
              })
              .join(", ")
          : null;

        const latestAssociationStatus = latestAssociation && latestAssociation.status ? latestAssociation.status : null;

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
   * Build job offers query with filters (same logic for count and data).
   * Filters: title, offerStatus, archived (is_archived-based), city, state. Columns: title, city, state, status, is_archived.
   * Archived filter uses is_archived as the source of truth.
   */
  function buildJobOffersQuery(supabaseQuery, filters) {
    let q = supabaseQuery;

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
        supabase.from("job_offers").select("*", { count: "exact", head: true }),
        filters
      );
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error("[Supabase] fetchJobOffersPaginated count error:", countError.message);
        return { data: [], totalCount: 0, error: countError };
      }
      const totalCount = count ?? 0;

      const dataQuery = buildJobOffersQuery(
        supabase
          .from("job_offers")
          .select(
            `
            *,
            clients (
              id,
              name,
              city,
              state
            ),
            candidate_job_associations (
              id,
              candidate_id,
              candidates (
                id,
                is_archived
              )
            )
          `
          ),
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
        const client = r.clients || null;
        const clientName = r.client_name || (client && client.name) || null;
        const location =
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

    if (filters.archived === "active") {
      q = q.eq("is_archived", false);
    }
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
   * Get a single client by id.
   * @param {string} id - client id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function getClientById(id) {
    if (!id) return { data: null, error: new Error("Missing id") };
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
            *,
            created_by_profile:profiles!clients_created_by_profiles_fkey(
              id,
              first_name,
              last_name
            ),
            updated_by_profile:profiles!clients_updated_by_profiles_fkey(
              id,
              first_name,
              last_name
            )
          `
        )
        .eq("id", id)
        .single();
      if (error) {
        console.error("[Supabase] getClientById error:", error.message, error);
        return { data: null, error };
      }
      const row = data;
      return {
        data: row
          ? {
              id: row.id,
              name: row.name,
              city: row.city,
              state: row.state,
              country: row.country,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              is_archived: !!row.is_archived,
              created_at: row.created_at,
              updated_at: row.updated_at,
              created_by_profile: row.created_by_profile || null,
              updated_by_profile: row.updated_by_profile || null,
            }
          : null,
        error: null,
      };
    } catch (err) {
      console.error("[Supabase] getClientById exception:", err);
      return { data: null, error: err };
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
      const baseUpdates = {
        name: (payload.name ?? "").toString().trim() || null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        country: payload.country ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        notes: payload.notes ?? null,
      };
      const updates = await withUpdateAuditFields(baseUpdates);
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateClient error:", error.message, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateClient exception:", err);
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
        supabase
          .from("clients")
          .select(
            `
            *,
            job_offers (
              id,
              status,
              is_archived
            )
          `
          ),
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
          // Nested job_offers used by frontend to compute Active Offers per client
          job_offers: Array.isArray(r.job_offers) ? r.job_offers : [],
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

  /**
   * Search candidates by first or last name (no created_by filter).
   * For autocomplete so candidates appear even after association removal.
   * @param {{ term?: string, limit?: number }} opts
   * @returns {Promise<{ data: Array, error: object | null }>}
   */
  async function searchCandidatesByName(opts) {
    const term = (opts && opts.term) != null ? String(opts.term).trim() : "";
    const limit = Math.max(1, Math.min(100, parseInt((opts && opts.limit) || 10, 10) || 10));

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
    try {
      // Soft archive the client itself.
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();

      if (clientError) {
        console.error("[Supabase] archiveClient clients update error:", clientError.message, clientError, { id });
        return { data: null, error: clientError };
      }

      // Soft cascade: archive ALL job offers belonging to this client.
      const { error: offersError } = await supabase
        .from("job_offers")
        .update({ is_archived: true })
        .eq("client_id", id);

      if (offersError) {
        console.error("[Supabase] archiveClient job_offers update error:", offersError.message, offersError, { id });
        return { data: client || null, error: offersError };
      }

      return { data: client || null, error: null };
    } catch (err) {
      console.error("[Supabase] archiveClient exception:", err, { id });
      return { data: null, error: err };
    }
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
   * Recalculate a candidate's availability_status based on active associations.
   * A candidate is unavailable if they have ANY association whose status is NOT
   * in ("rejected", "not_selected"); otherwise they are available.
   * This helper must NOT call updateCandidateAssociationStatus to avoid loops.
   * @param {string} candidateId
   */
  async function recalculateCandidateAvailability(candidateId) {
    if (!candidateId) return;
    try {
      const { count, error } = await supabase
        .from("candidate_job_associations")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", candidateId)
        .not("status", "in", "(rejected,not_selected)");

      if (error) {
        console.error(
          "[Supabase] recalculateCandidateAvailability count error:",
          error.message || error,
          { candidateId }
        );
        return;
      }

      const hasActiveAssociations = (count ?? 0) > 0;
      const { error: updateErr } = await supabase
        .from("candidates")
        .update({ availability_status: hasActiveAssociations ? "unavailable" : "available" })
        .eq("id", candidateId);

      if (updateErr) {
        console.error(
          "[Supabase] recalculateCandidateAvailability update error:",
          updateErr.message || updateErr,
          { candidateId }
        );
      }
    } catch (err) {
      console.error("[Supabase] recalculateCandidateAvailability exception:", err, { candidateId });
    }
  }

  /**
   * Search available, non-archived candidates for association.
   * Primary source of truth for operational availability is availability_status.
   * Excludes candidates with status = 'hired'.
   * @param {object} opts - { term: string, limit?: number, clientId?: string | null, jobOfferId?: string | null }
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function searchAvailableCandidatesForAssociation(opts) {
    const termRaw = (opts && opts.term ? String(opts.term) : "").trim();
    if (termRaw.length < 2) {
      return { data: [], error: null };
    }
    const limit =
      opts && typeof opts.limit === "number"
        ? Math.max(1, Math.min(50, opts.limit))
        : 20;

    // Escape % and _ for ilike search.
    const escaped = termRaw.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const pattern = "%" + escaped + "%";

    try {
      let q = supabase
        .from("candidates")
        .select(
          `
          id,
          first_name,
          last_name,
          position,
          status,
          availability_status,
          is_archived
        `
        )
        .or(
          [
            "first_name.ilike." + pattern,
            "last_name.ilike." + pattern,
          ].join(",")
        )
        .or("is_archived.is.null,is_archived.eq.false")
        .eq("availability_status", "available")
        .not("status", "eq", "hired")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true })
        .limit(limit);

      const { data, error } = await q;
      if (error) {
        console.error(
          "[Supabase] searchAvailableCandidatesForAssociation error:",
          error.message || error,
          { term: termRaw }
        );
        return { data: [], error };
      }
      return {
        data:
          (data || []).map(function (row) {
            return {
              id: row.id,
              first_name: row.first_name,
              last_name: row.last_name,
              position: row.position,
              status: row.status,
              availability_status: row.availability_status,
              is_archived: row.is_archived,
            };
          }),
        error: null,
      };
    } catch (err) {
      console.error(
        "[Supabase] searchAvailableCandidatesForAssociation exception:",
        err,
        { term: termRaw }
      );
      return { data: [], error: err };
    }
  }

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
      const candidateId = payload.candidate_id;
      const { data: candidateRow, error: fetchErr } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .maybeSingle();
      if (fetchErr) {
        console.error("[Supabase] linkCandidateToJob fetch candidate error:", fetchErr.message, fetchErr);
        return { data: null, error: fetchErr };
      }
      if (!candidateRow) {
        const err = new Error("Candidate not found");
        console.error("[Supabase] linkCandidateToJob:", err.message);
        return { data: null, error: err };
      }
      console.log("[Supabase] linkCandidateToJob as user id:", userId, "candidate:", candidateId, "job_offer:", payload.job_offer_id);
      const row = {
        candidate_id: candidateId,
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
      // Any new association (by definition) makes the candidate unavailable.
      await recalculateCandidateAvailability(candidateId);
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] linkCandidateToJob exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Search active, non-archived job offers for association.
   * Delegates active/archived semantics to buildJobOffersQuery.
   * @param {object} opts - { term?: string, limit?: number, clientId?: string | null }
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function searchActiveJobOffersForAssociation(opts) {
    const termRaw = opts && typeof opts.term === "string" ? opts.term : "";
    const term = termRaw.trim();
    const limit =
      opts && typeof opts.limit === "number"
        ? Math.max(1, Math.min(50, opts.limit))
        : 20;
    const clientId = opts && opts.clientId ? String(opts.clientId) : null;

    const filters = {
      archived: "active",
      offerStatus: "active",
      title: term || "",
      clientId: clientId || undefined,
    };

    try {
      let baseQuery = supabase
        .from("job_offers")
        .select(
          `
          id,
          title,
          status,
          is_archived,
          client_id,
          clients (
            id,
            name
          )
        `
        );

      const filteredQuery = buildJobOffersQuery(baseQuery, filters);
      const { data: rows, error } = await filteredQuery
        .order("created_at", { ascending: false })
        .range(0, limit - 1);

      if (error) {
        console.error(
          "[Supabase] searchActiveJobOffersForAssociation error:",
          error.message || error,
          { term, clientId }
        );
        return { data: [], error };
      }

      const data =
        rows && Array.isArray(rows)
          ? rows.map(function (r) {
              const client = r.clients || null;
              return {
                id: r.id,
                title: r.title,
                status: r.status,
                is_archived: r.is_archived,
                client_id: r.client_id,
                client_name:
                  (client && client.name) || r.client_name || null,
              };
            })
          : [];

      return { data, error: null };
    } catch (err) {
      console.error(
        "[Supabase] searchActiveJobOffersForAssociation exception:",
        err,
        { term, clientId }
      );
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
      let q = supabase.from("candidates").select("*", { count: "exact", head: true });
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
      let q = supabase.from("job_offers").select("*", { count: "exact", head: true });
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
        .from("candidates")
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
        .from("candidates")
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
        .from("candidates")
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
        .from("candidates")
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
        .from("job_offers")
        .select(
          `
          id,
          title,
          position,
          city,
          state,
          salary,
          deadline,
          status,
          clients (
            id,
            name,
            city,
            state
          )
        `
        )
        .in("id", offerIds);
      if (offersError) {
        console.error("[Supabase] fetchJobHistoryForCandidate job_offers error:", offersError.message);
        return { data: assocs.map((a) => ({ association: a, job_offer: null })), error: null };
      }
      const normalizedOffers = (offers || []).map(function (o) {
        const client = o.clients || null;
        const clientName = (client && client.name) || null;
        const location = [o.city, o.state]
          .filter(function (x) {
            return x;
          })
          .join(", ");
        return {
          id: o.id,
          title: o.title,
          position: o.position,
          city: o.city,
          state: o.state,
          salary: o.salary,
          deadline: o.deadline,
          status: o.status,
          client_name: clientName,
          location: location,
        };
      });
      const offerMap = normalizedOffers.reduce(function (acc, o) {
        acc[o.id] = o;
        return acc;
      }, {});
      const result = assocs.map((a) => ({ association: a, job_offer: offerMap[a.job_offer_id] || null }));
      return { data: result, error: null };
    } catch (err) {
      console.error("[Supabase] fetchJobHistoryForCandidate exception:", err);
      return { data: [], error: err };
    }
  }

  /**
   * Fetch candidates associated with a job offer (with candidate data).
   * @param {string} jobOfferId - job_offers.id
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchCandidatesForJobOffer(jobOfferId) {
    if (!jobOfferId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from("candidate_job_associations")
        .select(
          `
          id,
          status,
          notes,
          rejection_reason,
          created_at,
          candidates (
            id,
            first_name,
            last_name,
            position,
            is_archived,
            cv_url
          )
        `
        )
        .eq("job_offer_id", jobOfferId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase] fetchCandidatesForJobOffer error:", error.message, error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("[Supabase] fetchCandidatesForJobOffer exception:", err);
      return { data: [], error: err };
    }
  }

  /**
   * Internal helper: sync job_offers.status from hired count (auto-close / auto-reopen).
   * Not exported. When hired_count >= positions_required -> close; when < required and closed -> active.
   * Archived offers are never auto-reopened.
   * @param {string} jobOfferId - job_offers.id
   */
  async function syncJobOfferStatusFromHired(jobOfferId) {
    if (!jobOfferId) return;
    try {
      const { count } = await supabase
        .from("candidate_job_associations")
        .select("id", { count: "exact", head: true })
        .eq("job_offer_id", jobOfferId)
        .eq("status", "hired");

      const { data: offer, error: offerErr } = await supabase
        .from("job_offers")
        .select("positions_required, status")
        .eq("id", jobOfferId)
        .single();

      if (offerErr || !offer) return;

      const required = offer.positions_required ?? 1;
      const hiredCount = count ?? 0;

      if (offer.status === "archived") return;

      if (hiredCount >= required && offer.status !== "closed" && offer.status !== "archived") {
        const { error: jobUpdateError } = await supabase
          .from("job_offers")
          .update({
            status: "closed",
            closure_note: "Auto-closed: positions filled",
          })
          .eq("id", jobOfferId);

        if (jobUpdateError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired job_offers update error:",
            jobUpdateError.message || jobUpdateError,
            jobUpdateError,
            { jobOfferId }
          );
          return;
        }

        const { data: updatedAssocs, error: assocUpdateError } = await supabase
          .from("candidate_job_associations")
          .update({ status: "not_selected" })
          .eq("job_offer_id", jobOfferId)
          .not("status", "in", "(hired,rejected)")
          .select("candidate_id");

        if (assocUpdateError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired associations update error:",
            assocUpdateError.message || assocUpdateError,
            assocUpdateError,
            { jobOfferId }
          );
        } else if (Array.isArray(updatedAssocs) && updatedAssocs.length > 0) {
          const candidateIds = Array.from(
            new Set(
              updatedAssocs
                .map(function (row) {
                  return row && row.candidate_id;
                })
                .filter(Boolean)
            )
          );

          for (const candidateId of candidateIds) {
            await recalculateCandidateAvailability(candidateId);
          }
        }
      } else if (hiredCount < required && offer.status === "closed") {
        await supabase.from("job_offers").update({ status: "active" }).eq("id", jobOfferId);
      }
    } catch (err) {
      console.error("[Supabase] syncJobOfferStatusFromHired exception:", err);
    }
  }

  /**
   * Update the status of a candidate-job association.
   * @param {string} associationId - candidate_job_associations.id
   * @param {string} status
   * @param {object} [options]
   * @param {string|null} [options.rejectionReason]
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateCandidateAssociationStatus(associationId, status, options) {
    options = options || {};
    if (!associationId) {
      const err = new Error("Missing association id");
      console.error("[Supabase] updateCandidateAssociationStatus:", err);
      return { data: null, error: err };
    }
    try {
      const { data: oldRow, error: fetchErr } = await supabase
        .from("candidate_job_associations")
        .select("candidate_id, job_offer_id, status")
        .eq("id", associationId)
        .single();
      if (fetchErr || !oldRow) {
        console.error("[Supabase] updateCandidateAssociationStatus fetch error:", fetchErr?.message, fetchErr);
        return { data: null, error: fetchErr || new Error("Association not found") };
      }

      const updatePayload = { status };
      if (status === "rejected") {
        updatePayload.rejection_reason = options.rejectionReason ?? null;
      }

      const { data, error } = await supabase
        .from("candidate_job_associations")
        .update(updatePayload)
        .eq("id", associationId)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateCandidateAssociationStatus error:", error.message, error);
        return { data: null, error };
      }

      // Sync candidate status when hired (pipeline logic only; do not change)
      if (status === "hired" && oldRow.candidate_id) {
        const { error: candidateUpdateError } = await supabase
          .from("candidates")
          .update({ status: "hired" })
          .eq("id", oldRow.candidate_id);

        if (candidateUpdateError) {
          console.error(
            "[Supabase] Failed to sync candidate status to hired:",
            candidateUpdateError.message
          );
        }
      }

      // Recalculate candidate availability based on all associations.
      if (oldRow.candidate_id) {
        await recalculateCandidateAvailability(oldRow.candidate_id);
      }

      if (oldRow.job_offer_id) {
        await syncJobOfferStatusFromHired(oldRow.job_offer_id);
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateCandidateAssociationStatus exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Remove a candidate from a job (delete association).
   * @param {string} associationId - candidate_job_associations.id
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function removeCandidateFromJob(associationId) {
    if (!associationId) {
      const err = new Error("Missing association id");
      console.error("[Supabase] removeCandidateFromJob:", err);
      return { data: null, error: err };
    }
    try {
      const { data: deleted, error } = await supabase
        .from("candidate_job_associations")
        .delete()
        .eq("id", associationId)
        .select();
      if (error) {
        console.error("[Supabase] removeCandidateFromJob error:", error.message, error);
        return { data: null, error };
      }
      const deletedRow = Array.isArray(deleted) ? deleted[0] : deleted;
      if (deletedRow && deletedRow.job_offer_id) {
        await syncJobOfferStatusFromHired(deletedRow.job_offer_id);
      }
      return { data: deleted || [], error: null };
    } catch (err) {
      console.error("[Supabase] removeCandidateFromJob exception:", err);
      return { data: null, error: err };
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
      const { data, error } = await supabase
        .storage
        .from("candidate-files")
        .upload(path, file, opts);
      if (error) {
        console.error("[Supabase Storage] uploadCandidateFile error:", error.message || error, { path });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase Storage] uploadCandidateFile exception:", err, { path });
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
    const ttl = typeof expiresInSeconds === "number" && expiresInSeconds > 0 ? expiresInSeconds : 60;
    try {
      const { data, error } = await supabase
        .storage
        .from("candidate-files")
        .createSignedUrl(path, ttl);
      if (error) {
        console.error("[Supabase Storage] createSignedCandidateUrl error:", error.message || error, { path });
        return null;
      }
      return (data && data.signedUrl) || null;
    } catch (err) {
      console.error("[Supabase Storage] createSignedCandidateUrl exception:", err, { path });
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
      const { data, error } = await supabase
        .storage
        .from("candidate-files")
        .remove(keys);
      if (error) {
        console.error("[Supabase Storage] deleteCandidateFiles error:", error.message || error, { keys });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase Storage] deleteCandidateFiles exception:", err, { keys });
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
      console.error("[Supabase Storage] moveCandidateFile:", err, { fromPath, toPath });
      return { data: null, error: err };
    }
    try {
      const { data, error } = await supabase
        .storage
        .from("candidate-files")
        .move(fromPath, toPath);
      if (error) {
        console.error("[Supabase Storage] moveCandidateFile error:", error.message || error, { fromPath, toPath });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase Storage] moveCandidateFile exception:", err, { fromPath, toPath });
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
      const updates = await withUpdateAuditFields(Object.assign({}, basePayload));
      const { data, error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateCandidateFiles error:", error.message || error, { id });
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
        console.error("[Supabase] getCandidateSkills error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateSkills exception:", err, { candidateId });
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
      console.error("[Supabase] replaceCandidateSkills:", error, { candidateId });
      return { data: null, error };
    }
    const items = Array.isArray(skills) ? skills : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_skills")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error("[Supabase] replaceCandidateSkills delete error:", deleteError.message || deleteError, {
          candidateId,
        });
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
      const { data, error } = await supabase.from("candidate_skills").insert(rows).select();
      if (error) {
        console.error("[Supabase] replaceCandidateSkills insert error:", error.message || error, { candidateId });
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] replaceCandidateSkills exception:", err, { candidateId });
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
        console.error("[Supabase] getCandidateLanguages error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateLanguages exception:", err, { candidateId });
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
      console.error("[Supabase] replaceCandidateLanguages:", error, { candidateId });
      return { data: null, error };
    }
    const items = Array.isArray(languages) ? languages : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_languages")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error("[Supabase] replaceCandidateLanguages delete error:", deleteError.message || deleteError, {
          candidateId,
        });
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (language) {
        return Object.assign(
          {
            candidate_id: candidateId,
            created_by: userId,
          },
          language || {}
        );
      });
      const { data, error } = await supabase.from("candidate_languages").insert(rows).select();
      if (error) {
        console.error("[Supabase] replaceCandidateLanguages insert error:", error.message || error, { candidateId });
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] replaceCandidateLanguages exception:", err, { candidateId });
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
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[Supabase] getCandidateExperience error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateExperience exception:", err, { candidateId });
      return { data: [], error: err };
    }
  }

  /**
   * Replace work experience entries for a candidate (delete then bulk insert).
   * @param {string} candidateId
   * @param {array} experiences
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function replaceCandidateExperience(candidateId, experiences) {
    if (!candidateId || typeof candidateId !== "string") {
      const error = new Error("Missing candidateId");
      console.error("[Supabase] replaceCandidateExperience:", error, { candidateId });
      return { data: null, error };
    }
    const items = Array.isArray(experiences) ? experiences : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_experience")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error("[Supabase] replaceCandidateExperience delete error:", deleteError.message || deleteError, {
          candidateId,
        });
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (experience) {
        return Object.assign(
          {
            candidate_id: candidateId,
            created_by: userId,
          },
          experience || {}
        );
      });
      const { data, error } = await supabase.from("candidate_experience").insert(rows).select();
      if (error) {
        console.error("[Supabase] replaceCandidateExperience insert error:", error.message || error, { candidateId });
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] replaceCandidateExperience exception:", err, { candidateId });
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
        console.error("[Supabase] getCandidateEducation error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateEducation exception:", err, { candidateId });
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
      console.error("[Supabase] replaceCandidateEducation:", error, { candidateId });
      return { data: null, error };
    }
    const items = Array.isArray(education) ? education : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_education")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error("[Supabase] replaceCandidateEducation delete error:", deleteError.message || deleteError, {
          candidateId,
        });
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (edu) {
        return Object.assign(
          {
            candidate_id: candidateId,
            created_by: userId,
          },
          edu || {}
        );
      });
      const { data, error } = await supabase.from("candidate_education").insert(rows).select();
      if (error) {
        console.error("[Supabase] replaceCandidateEducation insert error:", error.message || error, { candidateId });
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] replaceCandidateEducation exception:", err, { candidateId });
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
        console.error("[Supabase] getCandidateCertifications error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateCertifications exception:", err, { candidateId });
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
      console.error("[Supabase] replaceCandidateCertifications:", error, { candidateId });
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
      const rows = items.map(function (cert) {
        return Object.assign(
          {
            candidate_id: candidateId,
            created_by: userId,
          },
          cert || {}
        );
      });
      const { data, error } = await supabase.from("candidate_certifications").insert(rows).select();
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
      console.error("[Supabase] replaceCandidateCertifications exception:", err, { candidateId });
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
        console.error("[Supabase] getCandidateHobbies error:", error.message || error, { candidateId });
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] getCandidateHobbies exception:", err, { candidateId });
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
      console.error("[Supabase] replaceCandidateHobbies:", error, { candidateId });
      return { data: null, error };
    }
    const items = Array.isArray(hobbies) ? hobbies : [];
    try {
      const { error: deleteError } = await supabase
        .from("candidate_hobbies")
        .delete()
        .eq("candidate_id", candidateId);
      if (deleteError) {
        console.error("[Supabase] replaceCandidateHobbies delete error:", deleteError.message || deleteError, {
          candidateId,
        });
        return { data: null, error: deleteError };
      }
      if (!items.length) {
        return { data: [], error: null };
      }
      const userId = await getCurrentUserId();
      const rows = items.map(function (hobby) {
        return Object.assign(
          {
            candidate_id: candidateId,
            created_by: userId,
          },
          hobby || {}
        );
      });
      const { data, error } = await supabase.from("candidate_hobbies").insert(rows).select();
      if (error) {
        console.error("[Supabase] replaceCandidateHobbies insert error:", error.message || error, { candidateId });
        return { data: null, error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] replaceCandidateHobbies exception:", err, { candidateId });
      return { data: null, error: err };
    }
  }

  // ---------------------------------------------------------------------------
  // Activity Logs
  // ---------------------------------------------------------------------------

  /**
   * Create a manual activity log note for an entity.
   * @param {"candidate"|"job_offer"|"client"} entityType
   * @param {string} entityId
   * @param {string} message
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function createLog(entityType, entityId, message) {
    try {
      assertEntity(entityType, entityId);
      const cleanedMessage = normalizeMessage(message);
      const userId = await getCurrentUserId();

      const row = {
        entity_type: entityType,
        entity_id: entityId,
        message: cleanedMessage,
        created_by: userId,
        event_type: "manual_note",
        metadata: null,
      };

      const { data, error } = await supabase
        .from("activity_logs")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] createLog error:", error.message || error, error, { entityType, entityId });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] createLog exception:", err, { entityType, entityId });
      return { data: null, error: err };
    }
  }

  /**
   * Fetch activity logs for an entity.
   * Default (compact) mode: returns first 20 logs + hasMore computed from 21-row fetch.
   * Full mode: returns all logs.
   * @param {"candidate"|"job_offer"|"client"} entityType
   * @param {string} entityId
   * @param {{ full?: boolean }=} options
   * @returns {Promise<{ data: { logs: array, hasMore: boolean } | null, error: object | null }>}
   */
  async function fetchLogs(entityType, entityId, options) {
    try {
      assertEntity(entityType, entityId);

      const isFull = !!(options && options.full === true);
      let q = supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (!isFull) {
        q = q.limit(21);
      }

      const { data: rows, error } = await q;
      if (error) {
        console.error("[Supabase] fetchLogs error:", error.message || error, error, { entityType, entityId });
        return { data: { logs: [], hasMore: false }, error };
      }

      const allLogs = Array.isArray(rows) ? rows : [];
      const hasMore = !isFull && allLogs.length > 20;
      const logs = !isFull ? allLogs.slice(0, 20) : allLogs;

      const createdByIds = Array.from(
        new Set(
          logs
            .map(function (l) {
              return l && l.created_by;
            })
            .filter(Boolean)
        )
      );

      let profileById = {};
      if (createdByIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", createdByIds);

        if (profilesError) {
          console.error("[Supabase] fetchLogs profiles error:", profilesError.message || profilesError, profilesError);
        } else {
          profileById = (profiles || []).reduce(function (acc, p) {
            if (p && p.id) {
              acc[p.id] = {
                id: p.id,
                first_name: p.first_name ?? null,
                last_name: p.last_name ?? null,
              };
            }
            return acc;
          }, {});
        }
      }

      const normalized = logs.map(function (l) {
        const createdBy = l && l.created_by;
        return Object.assign({}, l, {
          created_by_profile: createdBy ? profileById[createdBy] || null : null,
        });
      });

      return { data: { logs: normalized, hasMore }, error: null };
    } catch (err) {
      console.error("[Supabase] fetchLogs exception:", err, { entityType, entityId });
      return { data: { logs: [], hasMore: false }, error: err };
    }
  }

  /**
   * Thin wrapper returning a flat array of logs for an entity.
   * Matches the simpler `{ data: array, error }` shape expected by some views.
   * @param {"candidate"|"job_offer"|"client"} entityType
   * @param {string} entityId
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function fetchEntityLogs(entityType, entityId) {
    const result = await fetchLogs(entityType, entityId, { full: true });
    const logs = result && result.data && Array.isArray(result.data.logs) ? result.data.logs : [];
    return {
      data: logs,
      error: result ? result.error || null : null,
    };
  }

  /**
   * Thin wrapper to insert a manual note log for an entity.
   * Ignores payload.event_type and delegates to createLog so event_type stays "manual_note".
   * @param {{ entity_type: "candidate"|"job_offer"|"client", entity_id: string, event_type?: string, message: string }} payload
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function insertEntityLog(payload) {
    if (!payload || !payload.entity_type || !payload.entity_id) {
      const error = new Error("Missing entity_type or entity_id");
      console.error("[Supabase] insertEntityLog:", error, payload);
      return { data: null, error };
    }
    return createLog(payload.entity_type, payload.entity_id, payload.message);
  }

  /**
   * Fetch all activity logs created by the logged-in user.
   * Returns a flat array of logs scoped to the current user.
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function fetchMyActivityLogs() {
    const { data: sessionData, error: sessionError } = await getSession();
    if (sessionError) {
      console.error("[Supabase] fetchMyActivityLogs session error:", sessionError.message || sessionError, sessionError);
      return { data: null, error: sessionError };
    }
    const userId = sessionData?.user?.id;
    if (!userId) {
      const err = new Error("Not authenticated");
      console.error("[Supabase] fetchMyActivityLogs:", err);
      return { data: null, error: err };
    }

    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          id,
          entity_type,
          entity_id,
          event_type,
          message,
          created_at,
          updated_at,
          updated_by
        `
        )
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        console.error("[Supabase] fetchMyActivityLogs error:", error.message || error, error);
        return { data: null, error };
      }

      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err) {
      console.error("[Supabase] fetchMyActivityLogs exception:", err);
      return { data: null, error: err };
    }
  }

  /**
   * Update an activity log message.
   * @param {string} logId
   * @param {string} message
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateLog(logId, message) {
    if (!logId) {
      const error = new Error("Missing logId");
      console.error("[Supabase] updateLog:", error);
      return { data: null, error };
    }
    try {
      const cleanedMessage = normalizeMessage(message);
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from("activity_logs")
        .update({
          message: cleanedMessage,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", logId)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] updateLog error:", error.message || error, error, { logId });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateLog exception:", err, { logId });
      return { data: null, error: err };
    }
  }

  /**
   * Update a manual activity log created by the current user.
   * @param {string} id
   * @param {{ message: string }} payload
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function updateMyManualLog(id, payload) {
    if (!id || typeof id !== "string") {
      const error = new Error("Missing id");
      console.error("[Supabase] updateMyManualLog:", error);
      return { data: null, error };
    }

    try {
      const userId = await getCurrentUserId();
      const cleanedMessage = normalizeMessage(payload && payload.message);

      const { data, error } = await supabase
        .from("activity_logs")
        .update({
          message: cleanedMessage,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", id)
        .eq("created_by", userId)
        .eq("event_type", "manual_note")
        .select()
        .single();

      if (error) {
        console.error("[Supabase] updateMyManualLog error:", error.message || error, error, { id });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] updateMyManualLog exception:", err, { id });
      return { data: null, error: err };
    }
  }

  /**
   * Delete an activity log by id.
   * @param {string} logId
   * @returns {Promise<{ data: { success: boolean } | null, error: object | null }>}
   */
  async function deleteLog(logId) {
    if (!logId) {
      const error = new Error("Missing logId");
      console.error("[Supabase] deleteLog:", error);
      return { data: null, error };
    }
    try {
      await getCurrentUserId();

      const { data, error } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", logId)
        .select();

      if (error) {
        console.error("[Supabase] deleteLog error:", error.message || error, error, { logId });
        return { data: { success: false }, error };
      }

      const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (rowCount === 0) {
        const zeroError = new Error("Delete succeeded but 0 rows affected");
        console.error("[Supabase] deleteLog zero rows:", { logId });
        return { data: { success: false }, error: zeroError };
      }

      return { data: { success: true }, error: null };
    } catch (err) {
      console.error("[Supabase] deleteLog exception:", err, { logId });
      return { data: { success: false }, error: err };
    }
  }

  /**
   * Delete a manual activity log created by the current user.
   * @param {string} id
   * @returns {Promise<{ data: { success: boolean } | null, error: object | null }>}
   */
  async function deleteMyManualLog(id) {
    if (!id || typeof id !== "string") {
      const error = new Error("Missing id");
      console.error("[Supabase] deleteMyManualLog:", error);
      return { data: null, error };
    }

    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", id)
        .eq("created_by", userId)
        .eq("event_type", "manual_note")
        .select();

      if (error) {
        console.error("[Supabase] deleteMyManualLog error:", error.message || error, error, { id });
        return { data: { success: false }, error };
      }

      const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (rowCount === 0) {
        const zeroError = new Error("Delete succeeded but 0 rows affected");
        console.error("[Supabase] deleteMyManualLog zero rows:", { id });
        return { data: { success: false }, error: zeroError };
      }

      return { data: { success: true }, error: null };
    } catch (err) {
      console.error("[Supabase] deleteMyManualLog exception:", err, { id });
      return { data: { success: false }, error: err };
    }
  }

  /**
   * Create an automatic/system activity log for an entity.
   * @param {"candidate"|"job_offer"|"client"} entityType
   * @param {string} entityId
   * @param {{ event_type: string, message: string, metadata: object | null }} payload
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function createAutoLog(entityType, entityId, payload) {
    try {
      assertEntity(entityType, entityId);

      const allowedEventTypes = ["status_change", "salary_update", "rejection", "system_event"];
      const eventType = payload && payload.event_type;
      if (!allowedEventTypes.includes(eventType)) {
        const error = new Error("Invalid event_type");
        console.error("[Supabase] createAutoLog:", error, { event_type: eventType });
        return { data: null, error };
      }

      const cleanedMessage = normalizeMessage(payload && payload.message);
      const metadata = payload ? payload.metadata : null;
      if (metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) {
        const error = new Error("Invalid metadata");
        console.error("[Supabase] createAutoLog:", error, { metadataType: typeof metadata });
        return { data: null, error };
      }

      const userId = await getCurrentUserId();

      const row = {
        entity_type: entityType,
        entity_id: entityId,
        message: cleanedMessage,
        created_by: userId,
        event_type: eventType,
        metadata: metadata ?? null,
      };

      const { data, error } = await supabase
        .from("activity_logs")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("[Supabase] createAutoLog error:", error.message || error, error, { entityType, entityId, event_type: eventType });
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("[Supabase] createAutoLog exception:", err, { entityType, entityId });
      return { data: null, error: err };
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
    updateCandidateAssociationStatus,
    removeCandidateFromJob,
    // Dashboard
    getTotalCandidates,
    getActiveJobOffers,
    getNewCandidatesToday,
    getHiredThisMonth,
    getRecentCandidates,
    getCandidatesBySource,
    // Deletes / archive helpers
    deletePermanentRecord: deletePermanentRecord,
    // Helpers
    showError,
    showSuccess,
    getBasePath,
  };
})();
