// ============================================================================
// Italian Experience – Activity Logs data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all activity_logs-related Supabase operations:
//   - Manual log creation (createLog, insertEntityLog)
//   - Automatic/system log creation (createAutoLog)
//   - Entity-scoped log fetching (fetchLogs, fetchEntityLogs)
//   - User-scoped log fetching (fetchMyActivityLogs)
//   - Log updates and deletions (updateLog, updateMyManualLog, deleteLog, deleteMyManualLog)
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.activity
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.activity] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/activity.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local auth/session helpers (scoped to activity module)
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
          "[IEData.activity] getSession error:",
          error.message || error,
          error
        );
        return { data: { session: null, user: null }, error: error };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog(
          "[IEData.activity] Session",
          session && session.user ? "restored" : "none"
        );
      }
      return {
        data: { session: session, user: (session && session.user) || null },
        error: null,
      };
    } catch (err) {
      console.error("[IEData.activity] getSession exception:", err);
      return { data: { session: null, user: null }, error: err };
    }
  }

  /**
   * Get current authenticated user id.
   * Mirrors core/supabase.js getCurrentUserId behavior.
   * @returns {Promise<string>}
   */
  async function getCurrentUserId() {
    var sessionResult = await getSession();
    if (sessionResult.error) {
      throw sessionResult.error;
    }
    var userId =
      sessionResult.data && sessionResult.data.user
        ? sessionResult.data.user.id
        : null;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return userId;
  }

  // ---------------------------------------------------------------------------
  // Activity Logs (internal helpers)
  // ---------------------------------------------------------------------------

  function assertEntity(entityType, entityId) {
    var allowed = ["candidate", "job_offer", "client", "application"];
    if (allowed.indexOf(entityType) === -1) {
      throw new Error("Invalid entityType");
    }
    if (typeof entityId !== "string" || !entityId) {
      throw new Error("Invalid entityId");
    }
  }

  function normalizeMessage(message) {
    var cleaned = String(message == null ? "" : message).trim();
    if (!cleaned) {
      throw new Error("Message is required");
    }
    if (cleaned.length > 500) {
      throw new Error("Message too long (max 500 chars)");
    }
    return cleaned;
  }

  // ---------------------------------------------------------------------------
  // Activity Logs – core operations (moved from core/supabase.js)
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
      var cleanedMessage = normalizeMessage(message);
      var userId = await getCurrentUserId();

      var row = {
        entity_type: entityType,
        entity_id: entityId,
        message: cleanedMessage,
        created_by: userId,
        event_type: "manual_note",
        metadata: null,
      };

      var result = await supabase
        .from("activity_logs")
        .insert(row)
        .select()
        .single();
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] createLog error:",
          error.message || error,
          error,
          { entityType: entityType, entityId: entityId }
        );
        return { data: null, error: error };
      }
      return { data: data, error: null };
    } catch (err) {
      console.error(
        "[Supabase] createLog exception:",
        err,
        { entityType: entityType, entityId: entityId }
      );
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

      var isFull = !!(options && options.full === true);
      var q = supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (!isFull) {
        q = q.limit(21);
      }

      var result = await q;
      var rows = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] fetchLogs error:",
          error.message || error,
          error,
          { entityType: entityType, entityId: entityId }
        );
        return { data: { logs: [], hasMore: false }, error: error };
      }

      var allLogs = Array.isArray(rows) ? rows : [];
      var hasMore = !isFull && allLogs.length > 20;
      var logs = !isFull ? allLogs.slice(0, 20) : allLogs;

      var createdByIds = Array.from(
        new Set(
          logs
            .map(function (l) {
              return l && l.created_by;
            })
            .filter(Boolean)
        )
      );

      var profileById = {};
      if (createdByIds.length) {
        var profilesResult = await supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", createdByIds);
        var profiles = profilesResult ? profilesResult.data : null;
        var profilesError = profilesResult ? profilesResult.error : null;
        if (profilesError) {
          console.error(
            "[Supabase] fetchLogs profiles error:",
            profilesError.message || profilesError,
            profilesError
          );
        } else {
          profileById = (profiles || []).reduce(function (acc, p) {
            if (p && p.id) {
              acc[p.id] = {
                id: p.id,
                first_name: p.first_name == null ? null : p.first_name,
                last_name: p.last_name == null ? null : p.last_name,
              };
            }
            return acc;
          }, {});
        }
      }

      var normalized = logs.map(function (l) {
        var createdBy = l && l.created_by;
        return Object.assign({}, l, {
          created_by_profile: createdBy ? profileById[createdBy] || null : null,
        });
      });

      return { data: { logs: normalized, hasMore: hasMore }, error: null };
    } catch (err) {
      console.error(
        "[Supabase] fetchLogs exception:",
        err,
        { entityType: entityType, entityId: entityId }
      );
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
    var result = await fetchLogs(entityType, entityId, { full: true });
    var logs =
      result && result.data && Array.isArray(result.data.logs)
        ? result.data.logs
        : [];
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
      var error = new Error("Missing entity_type or entity_id");
      console.error("[Supabase] insertEntityLog:", error, payload);
      return { data: null, error: error };
    }
    return createLog(payload.entity_type, payload.entity_id, payload.message);
  }

  /**
   * Fetch all activity logs created by the logged-in user.
   * Returns a flat array of logs scoped to the current user.
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function fetchMyActivityLogs() {
    var sessionResult = await getSession();
    var sessionError = sessionResult.error;
    if (sessionError) {
      console.error(
        "[Supabase] fetchMyActivityLogs session error:",
        sessionError.message || sessionError,
        sessionError
      );
      return { data: null, error: sessionError };
    }
    var userId =
      sessionResult.data && sessionResult.data.user
        ? sessionResult.data.user.id
        : null;
    if (!userId) {
      var err = new Error("Not authenticated");
      console.error("[Supabase] fetchMyActivityLogs:", err);
      return { data: null, error: err };
    }

    try {
      var result = await supabase
        .from("activity_logs")
        .select(
          "\n          id,\n          entity_type,\n          entity_id,\n          event_type,\n          message,\n          created_at,\n          updated_at,\n          updated_by\n        "
        )
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] fetchMyActivityLogs error:",
          error.message || error,
          error
        );
        return { data: null, error: error };
      }

      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (err2) {
      console.error("[Supabase] fetchMyActivityLogs exception:", err2);
      return { data: null, error: err2 };
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
      var error = new Error("Missing logId");
      console.error("[Supabase] updateLog:", error);
      return { data: null, error: error };
    }
    try {
      var cleanedMessage = normalizeMessage(message);
      var userId = await getCurrentUserId();

      var result = await supabase
        .from("activity_logs")
        .update({
          message: cleanedMessage,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", logId)
        .select()
        .single();
      var data = result ? result.data : null;
      var err = result ? result.error : null;
      if (err) {
        console.error(
          "[Supabase] updateLog error:",
          err.message || err,
          err,
          { logId: logId }
        );
        return { data: null, error: err };
      }
      return { data: data, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] updateLog exception:",
        err2,
        { logId: logId }
      );
      return { data: null, error: err2 };
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
      var error = new Error("Missing id");
      console.error("[Supabase] updateMyManualLog:", error);
      return { data: null, error: error };
    }

    try {
      var userId = await getCurrentUserId();
      var cleanedMessage = normalizeMessage(payload && payload.message);

      var result = await supabase
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
      var data = result ? result.data : null;
      var err = result ? result.error : null;

      if (err) {
        console.error(
          "[Supabase] updateMyManualLog error:",
          err.message || err,
          err,
          { id: id }
        );
        return { data: null, error: err };
      }

      return { data: data, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] updateMyManualLog exception:",
        err2,
        { id: id }
      );
      return { data: null, error: err2 };
    }
  }

  /**
   * Delete an activity log by id.
   * @param {string} logId
   * @returns {Promise<{ data: { success: boolean } | null, error: object | null }>}
   */
  async function deleteLog(logId) {
    if (!logId) {
      var error = new Error("Missing logId");
      console.error("[Supabase] deleteLog:", error);
      return { data: null, error: error };
    }
    try {
      await getCurrentUserId();

      var result = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", logId)
        .select();
      var data = result ? result.data : null;
      var err = result ? result.error : null;

      if (err) {
        console.error(
          "[Supabase] deleteLog error:",
          err.message || err,
          err,
          { logId: logId }
        );
        return { data: { success: false }, error: err };
      }

      var rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (rowCount === 0) {
        var zeroError = new Error("Delete succeeded but 0 rows affected");
        console.error("[Supabase] deleteLog zero rows:", { logId: logId });
        return { data: { success: false }, error: zeroError };
      }

      return { data: { success: true }, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] deleteLog exception:",
        err2,
        { logId: logId }
      );
      return { data: { success: false }, error: err2 };
    }
  }

  /**
   * Delete a manual activity log created by the current user.
   * @param {string} id
   * @returns {Promise<{ data: { success: boolean } | null, error: object | null }>}
   */
  async function deleteMyManualLog(id) {
    if (!id || typeof id !== "string") {
      var error = new Error("Missing id");
      console.error("[Supabase] deleteMyManualLog:", error);
      return { data: null, error: error };
    }

    try {
      var userId = await getCurrentUserId();

      var result = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", id)
        .eq("created_by", userId)
        .eq("event_type", "manual_note")
        .select();
      var data = result ? result.data : null;
      var err = result ? result.error : null;

      if (err) {
        console.error(
          "[Supabase] deleteMyManualLog error:",
          err.message || err,
          err,
          { id: id }
        );
        return { data: { success: false }, error: err };
      }

      var rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (rowCount === 0) {
        var zeroError = new Error("Delete succeeded but 0 rows affected");
        console.error("[Supabase] deleteMyManualLog zero rows:", { id: id });
        return { data: { success: false }, error: zeroError };
      }

      return { data: { success: true }, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] deleteMyManualLog exception:",
        err2,
        { id: id }
      );
      return { data: { success: false }, error: err2 };
    }
  }

  /**
   * Create an automatic/system activity log for an entity.
   * @param {"candidate"|"job_offer"|"client"|"application"} entityType
   * @param {string} entityId
   * @param {{ event_type: string, message: string, metadata: object | null }} payload
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function createAutoLog(entityType, entityId, payload) {
    try {
      assertEntity(entityType, entityId);

      var allowedEventTypes = [
        "status_change",
        "salary_update",
        "rejection",
        "system_event",
        "status_changed",
        "application_created",
        "application_rejected",
        "application_hired",
        "application_withdrawn",
      ];
      var eventType = payload && payload.event_type;
      if (allowedEventTypes.indexOf(eventType) === -1) {
        var error = new Error("Invalid event_type");
        console.error("[Supabase] createAutoLog:", error, {
          event_type: eventType,
        });
        return { data: null, error: error };
      }

      var cleanedMessage = normalizeMessage(payload && payload.message);
      var metadata = payload ? payload.metadata : null;
      if (
        metadata !== null &&
        (typeof metadata !== "object" || Array.isArray(metadata))
      ) {
        var metaError = new Error("Invalid metadata");
        console.error("[Supabase] createAutoLog:", metaError, {
          metadataType: typeof metadata,
        });
        return { data: null, error: metaError };
      }

      var userId = await getCurrentUserId();

      var row = {
        entity_type: entityType,
        entity_id: entityId,
        message: cleanedMessage,
        created_by: userId,
        event_type: eventType,
        metadata: metadata == null ? null : metadata,
      };

      var result = await supabase
        .from("activity_logs")
        .insert(row)
        .select()
        .single();
      var data = result ? result.data : null;
      var err = result ? result.error : null;
      if (err) {
        console.error(
          "[Supabase] createAutoLog error:",
          err.message || err,
          err,
          { entityType: entityType, entityId: entityId, event_type: eventType }
        );
        return { data: null, error: err };
      }
      return { data: data, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] createAutoLog exception:",
        err2,
        { entityType: entityType, entityId: entityId }
      );
      return { data: null, error: err2 };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.activity
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.activity = {
    createLog: createLog,
    fetchLogs: fetchLogs,
    fetchEntityLogs: fetchEntityLogs,
    insertEntityLog: insertEntityLog,
    fetchMyActivityLogs: fetchMyActivityLogs,
    updateLog: updateLog,
    deleteLog: deleteLog,
    createAutoLog: createAutoLog,
    updateMyManualLog: updateMyManualLog,
    deleteMyManualLog: deleteMyManualLog,
  };
})();

