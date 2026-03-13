(function () {
  "use strict";

  var PAGE_SIZE = 20;

  function getSupabase() {
    if (!window.IESupabaseClient || !window.IESupabaseClient.supabase) {
      console.error(
        "[ExternalSubmissionsApi] IESupabaseClient.supabase not available. Ensure portal/core/supabase-client.js is loaded."
      );
      return null;
    }
    return window.IESupabaseClient.supabase;
  }

  function ensureAuth() {
    return new Promise(function (resolve) {
      if (!window.IESupabase) {
        if (
          window.IEAuth &&
          typeof window.IEAuth.redirectToLogin === "function"
        ) {
          window.IEAuth.redirectToLogin();
        } else if (
          window.IESupabase &&
          typeof window.IESupabase.redirectToLogin === "function"
        ) {
          window.IESupabase.redirectToLogin();
        }
        resolve(null);
        return;
      }

      if (typeof window.IESupabase.requireAuth === "function") {
        window.IESupabase
          .requireAuth()
          .then(function (user) {
            if (!user) {
              resolve(null);
            } else {
              resolve(user);
            }
          })
          .catch(function () {
            if (
              typeof window.IESupabase.redirectToLogin === "function"
            ) {
              window.IESupabase.redirectToLogin();
            } else if (
              window.IEAuth &&
              typeof window.IEAuth.redirectToLogin === "function"
            ) {
              window.IEAuth.redirectToLogin();
            }
            resolve(null);
          });
        return;
      }

      if (window.IESupabase.supabase && window.IESupabase.supabase.auth) {
        window.IESupabase.supabase.auth
          .getSession()
          .then(function (sessionResult) {
            if (
              !sessionResult ||
              !sessionResult.data ||
              !sessionResult.data.session
            ) {
              if (
                typeof window.IESupabase.redirectToLogin === "function"
              ) {
                window.IESupabase.redirectToLogin();
              } else if (
                window.IEAuth &&
                typeof window.IEAuth.redirectToLogin === "function"
              ) {
                window.IEAuth.redirectToLogin();
              }
              resolve(null);
            } else {
              resolve(sessionResult.data.session.user || null);
            }
          })
          .catch(function () {
            if (
              typeof window.IESupabase.redirectToLogin === "function"
            ) {
              window.IESupabase.redirectToLogin();
            } else if (
              window.IEAuth &&
              typeof window.IEAuth.redirectToLogin === "function"
            ) {
              window.IEAuth.redirectToLogin();
            }
            resolve(null);
          });
        return;
      }

      resolve(null);
    });
  }

  function mapSubmissionRow(row) {
    var r = row || {};
    var firstName = (r.first_name || "").toString().trim();
    var lastName = (r.last_name || "").toString().trim();
    var fullName = (firstName + " " + lastName).trim() || "—";
    return Object.assign({}, r, {
      full_name_computed: fullName,
    });
  }

  async function fetchSubmissions(opts) {
    var supabase = getSupabase();
    if (!supabase) {
      return { data: [], totalCount: 0, error: new Error("Supabase not available") };
    }

    var page = (opts && opts.page) || 1;
    var limit = (opts && opts.limit) || PAGE_SIZE;
    var status = opts && opts.status;

    var from = (page - 1) * limit;
    var to = from + limit - 1;

    try {
      var query = supabase
        .from("external_candidate_submissions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      var _a = await query.range(from, to),
        data = _a.data,
        error = _a.error,
        count = _a.count;

      if (error) {
        console.error("[ExternalSubmissionsApi] fetchSubmissions error:", error);
        return { data: [], totalCount: 0, error: error };
      }

      var rows = Array.isArray(data) ? data.map(mapSubmissionRow) : [];
      return {
        data: rows,
        totalCount: typeof count === "number" ? count : rows.length,
        error: null,
      };
    } catch (err) {
      console.error("[ExternalSubmissionsApi] fetchSubmissions exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  async function fetchSubmissionById(id) {
    var supabase = getSupabase();
    if (!supabase) {
      return { data: null, error: new Error("Supabase not available") };
    }
    if (!id) {
      return { data: null, error: new Error("Missing submission id") };
    }
    try {
      var _a = await supabase
          .from("external_candidate_submissions")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        data = _a.data,
        error = _a.error;
      if (error) {
        console.error("[ExternalSubmissionsApi] fetchSubmissionById error:", error);
        return { data: null, error: error };
      }
      if (!data) {
        return { data: null, error: null };
      }
      return { data: mapSubmissionRow(data), error: null };
    } catch (err) {
      console.error("[ExternalSubmissionsApi] fetchSubmissionById exception:", err);
      return { data: null, error: err };
    }
  }

  async function searchDuplicateCandidates(params) {
    var supabase = getSupabase();
    if (!supabase) {
      return { data: [], error: new Error("Supabase not available") };
    }

    var email = (params && params.email) || "";
    var phone = (params && params.phone) || "";
    email = email && email.trim();
    phone = phone && phone.trim();

    try {
      if (email) {
        var _a = await supabase
            .from("candidates")
            .select("id, first_name, last_name, email, phone, status")
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(10),
          data = _a.data,
          error = _a.error;
        if (error) {
          console.error(
            "[ExternalSubmissionsApi] searchDuplicateCandidates (email) error:",
            error
          );
        } else if (Array.isArray(data) && data.length) {
          return { data: data, error: null, strategy: "email" };
        }
      }

      if (phone) {
        var _b = await supabase
            .from("candidates")
            .select("id, first_name, last_name, email, phone, status")
            .eq("phone", phone)
            .order("created_at", { ascending: false })
            .limit(10),
          data2 = _b.data,
          error2 = _b.error;
        if (error2) {
          console.error(
            "[ExternalSubmissionsApi] searchDuplicateCandidates (phone) error:",
            error2
          );
          return { data: [], error: error2, strategy: "phone" };
        }
        return {
          data: Array.isArray(data2) ? data2 : [],
          error: null,
          strategy: "phone",
        };
      }

      return { data: [], error: null, strategy: email ? "email" : "none" };
    } catch (err) {
      console.error(
        "[ExternalSubmissionsApi] searchDuplicateCandidates exception:",
        err
      );
      return { data: [], error: err, strategy: "exception" };
    }
  }

  async function promoteSubmission(payload) {
    var supabase = getSupabase();
    if (!supabase) {
      return { data: null, error: new Error("Supabase not available") };
    }
    if (!payload || !payload.submission_id || !payload.action) {
      return { data: null, error: new Error("Missing required payload fields") };
    }
    try {
      var sessionResult = await supabase.auth.getSession();
      var session = sessionResult &&
        sessionResult.data &&
        sessionResult.data.session
          ? sessionResult.data.session
          : null;
      var accessToken =
        session && session.access_token ? session.access_token : null;

      if (!accessToken) {
        if (typeof console !== "undefined" && console.debug) {
          console.debug(
            "[ExternalSubmissionsApi] promoteSubmission: no access token (source: session); user must sign in again."
          );
        }
        return {
          data: null,
          error: new Error("Not authenticated. Please sign in again."),
        };
      }

      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ExternalSubmissionsApi] promoteSubmission: using access token from session (user id present: " +
            (session && session.user && session.user.id ? "yes" : "no") +
            ")."
        );
      }

      var client = window.IESupabaseClient;
      var functionsBase =
        client &&
        typeof client.getSupabaseUrl === "function" &&
        typeof client.getSupabaseKey === "function"
          ? client.getSupabaseUrl().replace(/\/?$/, "") + "/functions/v1"
          : null;
      var anonKey =
        client && typeof client.getSupabaseKey === "function"
          ? client.getSupabaseKey()
          : null;
      if (!functionsBase || !anonKey) {
        return {
          data: null,
          error: new Error("Portal config missing (functions URL or key)"),
        };
      }

      // DEBUG: JWT used for promote-external-submission (remove after diagnosis)
      if (typeof console !== "undefined" && console.debug) {
        console.debug("SESSION_EXISTS", !!session);
        console.debug("TOKEN_EXISTS", !!accessToken);
        console.debug("TOKEN_LENGTH", accessToken?.length);
        console.debug("TOKEN_PREFIX", accessToken?.slice(0, 10));
        console.debug("TOKEN_EQUALS_ANON", accessToken === anonKey);
      }

      var url = functionsBase + "/promote-external-submission";
      var res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
          apikey: anonKey,
        },
        body: JSON.stringify(payload),
      });

      var json = await res.json().catch(function () {
        return { ok: false, error: { message: "Invalid response", code: "parse_error" } };
      });

      if (!res.ok) {
        var errMsg =
          (json && json.error && json.error.message) || res.statusText || "Request failed";
        var err = new Error(errMsg);
        if (json && json.error && json.error.code) {
          err.code = json.error.code;
        }
        console.error(
          "[ExternalSubmissionsApi] promoteSubmission invoke error:",
          errMsg,
          json
        );
        return { data: null, error: err };
      }
      return { data: json.data !== undefined ? json.data : json, error: null };
    } catch (err) {
      console.error(
        "[ExternalSubmissionsApi] promoteSubmission invoke exception:",
        err
      );
      return { data: null, error: err };
    }
  }

  async function createSignedFileUrl(path, ttlSeconds) {
    var supabase = getSupabase();
    if (!supabase || !path) {
      return null;
    }
    var ttl =
      typeof ttlSeconds === "number" && ttlSeconds > 0 ? ttlSeconds : 300;
    try {
      var result = await supabase.storage
        .from("external-candidate-submissions")
        .createSignedUrl(path, ttl);
      if (result.error) {
        console.error(
          "[ExternalSubmissionsApi] createSignedFileUrl error:",
          result.error
        );
        return null;
      }
      return (result.data && result.data.signedUrl) || null;
    } catch (err) {
      console.error(
        "[ExternalSubmissionsApi] createSignedFileUrl exception:",
        err
      );
      return null;
    }
  }

  window.ExternalSubmissionsApi = {
    ensureAuth: ensureAuth,
    fetchSubmissions: fetchSubmissions,
    fetchSubmissionById: fetchSubmissionById,
    searchDuplicateCandidates: searchDuplicateCandidates,
    promoteSubmission: promoteSubmission,
    createSignedFileUrl: createSignedFileUrl,
    PAGE_SIZE: PAGE_SIZE,
  };
})();

