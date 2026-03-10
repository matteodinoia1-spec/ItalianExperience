// ============================================================================
// Italian Experience – Applications / Associations data module
// ----------------------------------------------------------------------------
// Responsibilities:
// - Encapsulate all candidate_job_associations logic:
//   - Linking candidates to job offers
//   - Searching available candidates and active job offers for association
//   - Fetching job history for a candidate
//   - Fetching candidates for a job offer
//   - Paginated applications list
//   - Association status updates (including hired / closed coordination)
//   - Logical withdrawal, restore, and permanent deletion
//   - Candidate availability recalculation helper
// - Use the shared Supabase client from window.IESupabaseClient.supabase
// - Expose a stable internal API via window.IEData.applications
//
// This module is internal to the data layer. UI/runtime code must continue to
// use window.IESupabase.*; portal/core/supabase.js delegates to this module.
// ============================================================================

(function () {
  "use strict";

  var client = window.IESupabaseClient || null;
  if (!client || !client.supabase) {
    console.error(
      "[IEData.applications] window.IESupabaseClient.supabase not found. " +
        "Ensure core/supabase-client.js is loaded before core/data/applications.js."
    );
    return;
  }

  var supabase = client.supabase;

  // ---------------------------------------------------------------------------
  // Local helpers
  // ---------------------------------------------------------------------------

  /**
   * Recalculate a candidate's availability_status based on active associations.
   * Compatibility layer: availability is now derived from applications in the UI;
   * this still writes availability_status for backward compatibility and search filters.
   * A candidate is unavailable if they have ANY association whose status is NOT
   * in ("rejected", "not_selected", "withdrawn"); otherwise they are available.
   * This helper must NOT call updateCandidateAssociationStatus to avoid loops.
   * Mirrors core/supabase.js recalculateCandidateAvailability behavior.
   * @param {string} candidateId
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function recalculateCandidateAvailability(candidateId) {
    if (!candidateId) {
      var error = new Error("Missing candidateId");
      console.error("[Supabase] recalculateCandidateAvailability:", error);
      return { data: null, error: error };
    }
    try {
      var assocResult = await supabase
        .from("candidate_job_associations")
        .select("status")
        .eq("candidate_id", candidateId);
      var rows = assocResult ? assocResult.data : null;
      var assocError = assocResult ? assocResult.error : null;
      if (assocError) {
        console.error(
          "[Supabase] recalculateCandidateAvailability fetch error:",
          assocError.message || assocError,
          { candidateId: candidateId }
        );
        return { data: null, error: assocError };
      }
      var associations = Array.isArray(rows) ? rows : [];
      var hasActive = associations.some(function (row) {
        var raw =
          row && row.status ? String(row.status).toLowerCase() : "";
        if (!raw) return false;
        // Treat anything that is not an explicit terminal status as active.
        return (
          raw !== "rejected" &&
          raw !== "not_selected" &&
          raw !== "withdrawn"
        );
      });
      var availability = hasActive ? "unavailable" : "available";
      var updateResult = await supabase
        .from("candidates")
        .update({ availability_status: availability })
        .eq("id", candidateId)
        .select("id, availability_status")
        .single();
      var updated = updateResult ? updateResult.data : null;
      var updateError = updateResult ? updateResult.error : null;
      if (updateError) {
        console.error(
          "[Supabase] recalculateCandidateAvailability update error:",
          updateError.message || updateError,
          { candidateId: candidateId }
        );
        return { data: null, error: updateError };
      }
      return { data: updated || null, error: null };
    } catch (err) {
      console.error(
        "[Supabase] recalculateCandidateAvailability exception:",
        err,
        { candidateId: candidateId }
      );
      return { data: null, error: err };
    }
  }

  /**
   * Internal helper: sync job_offers.status from hired count (auto-close / auto-reopen).
   * Not exported. When hired_count >= positions_required -> close; when < required and closed -> active.
   * Archived offers are never auto-reopened.
   * Mirrors core/supabase.js syncJobOfferStatusFromHired behavior.
   * @param {string} jobOfferId - job_offers.id
   */
  async function syncJobOfferStatusFromHired(jobOfferId) {
    if (!jobOfferId) return;
    try {
      var hiredResult = await supabase
        .from("candidate_job_associations")
        .select("id", { count: "exact", head: true })
        .eq("job_offer_id", jobOfferId)
        .eq("status", "hired");
      var count =
        hiredResult && typeof hiredResult.count === "number"
          ? hiredResult.count
          : null;

      var offerResult = await supabase
        .from("job_offers")
        .select("positions_required, status")
        .eq("id", jobOfferId)
        .single();
      var offer = offerResult ? offerResult.data : null;
      var offerErr = offerResult ? offerResult.error : null;

      if (offerErr || !offer) return;

      var required =
        typeof offer.positions_required === "number" &&
        !Number.isNaN(offer.positions_required)
          ? offer.positions_required
          : 1;
      var hiredCount = count != null ? count : 0;

      if (offer.status === "archived") return;

      if (
        hiredCount >= required &&
        offer.status !== "closed" &&
        offer.status !== "archived"
      ) {
        var jobUpdateResult = await supabase
          .from("job_offers")
          .update({
            status: "closed",
            closure_note: "Auto-closed: positions filled",
          })
          .eq("id", jobOfferId);
        var jobUpdateError = jobUpdateResult
          ? jobUpdateResult.error
          : null;

        if (jobUpdateError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired job_offers update error:",
            jobUpdateError.message || jobUpdateError,
            jobUpdateError,
            { jobOfferId: jobOfferId }
          );
          return;
        }

        var assocResult = await supabase
          .from("candidate_job_associations")
          .update({ status: "not_selected" })
          .eq("job_offer_id", jobOfferId)
          .not("status", "in", "(hired,rejected,withdrawn)")
          .select("id,candidate_id");
        var updatedAssocs = assocResult ? assocResult.data : null;
        var assocUpdateError = assocResult ? assocResult.error : null;

        if (assocUpdateError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired associations update error:",
            assocUpdateError.message || assocUpdateError,
            assocUpdateError,
            { jobOfferId: jobOfferId }
          );
        } else if (
          Array.isArray(updatedAssocs) &&
          updatedAssocs.length > 0
        ) {
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            updatedAssocs.forEach(function (assoc) {
              if (!assoc || !assoc.id) return;
              window.IESupabase
                .createAutoLog("application", assoc.id, {
                  event_type: "status_changed",
                  message:
                    "Application status changed to not_selected (job closed)",
                  metadata: {
                    job_offer_id: jobOfferId,
                    new_status: "not_selected",
                  },
                })
                .catch(function () {});
            });
          }

          var candidateIds = Array.from(
            new Set(
              updatedAssocs
                .map(function (row) {
                  return row && row.candidate_id;
                })
                .filter(Boolean)
            )
          );

          for (var i = 0; i < candidateIds.length; i++) {
            var candidateId = candidateIds[i];
            // eslint-disable-next-line no-await-in-loop
            await recalculateCandidateAvailability(candidateId);
          }
        }
      } else if (hiredCount < required && offer.status === "closed") {
        var reopenResult = await supabase
          .from("job_offers")
          .update({ status: "active" })
          .eq("id", jobOfferId);
        var reopenError = reopenResult ? reopenResult.error : null;
        if (reopenError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired job_offers reopen error:",
            reopenError.message || reopenError,
            reopenError,
            { jobOfferId: jobOfferId }
          );
          return;
        }

        var reopenedAssocsResult = await supabase
          .from("candidate_job_associations")
          .update({ status: "screening" })
          .eq("job_offer_id", jobOfferId)
          .eq("status", "not_selected")
          .select("id,candidate_id");
        var reopenedAssocs = reopenedAssocsResult
          ? reopenedAssocsResult.data
          : null;
        var reopenedAssocsError = reopenedAssocsResult
          ? reopenedAssocsResult.error
          : null;

        if (reopenedAssocsError) {
          console.error(
            "[Supabase] syncJobOfferStatusFromHired reopen associations error:",
            reopenedAssocsError.message || reopenedAssocsError,
            reopenedAssocsError,
            { jobOfferId: jobOfferId }
          );
        } else if (
          Array.isArray(reopenedAssocs) &&
          reopenedAssocs.length > 0
        ) {
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            reopenedAssocs.forEach(function (assoc) {
              if (!assoc || !assoc.id) return;
              window.IESupabase
                .createAutoLog("application", assoc.id, {
                  event_type: "status_changed",
                  message:
                    "Application status changed to screening (job reopened)",
                  metadata: {
                    job_offer_id: jobOfferId,
                    new_status: "screening",
                  },
                })
                .catch(function () {});
            });
          }

          var candidateIds2 = Array.from(
            new Set(
              reopenedAssocs
                .map(function (row) {
                  return row && row.candidate_id;
                })
                .filter(Boolean)
            )
          );

          for (var j = 0; j < candidateIds2.length; j++) {
            var candidateId2 = candidateIds2[j];
            // eslint-disable-next-line no-await-in-loop
            await recalculateCandidateAvailability(candidateId2);
          }
        }
      }
    } catch (err) {
      console.error(
        "[Supabase] syncJobOfferStatusFromHired exception:",
        err
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Public API – core applications functions (moved from core/supabase.js)
  // ---------------------------------------------------------------------------

  /**
   * Search available, non-archived candidates for association.
   * Primary source of truth for operational availability is availability_status.
   * Excludes candidates with status = 'hired'.
   * @param {object} opts - { term: string, limit?: number, clientId?: string | null, jobOfferId?: string | null }
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function searchAvailableCandidatesForAssociation(opts) {
    var termRaw =
      opts && opts.term ? String(opts.term) : "";
    termRaw = termRaw.trim();
    if (termRaw.length < 2) {
      return { data: [], error: null };
    }
    var limit =
      opts && typeof opts.limit === "number"
        ? Math.max(1, Math.min(50, opts.limit))
        : 20;

    // Escape % and _ for ilike search.
    var escaped = termRaw.replace(/%/g, "\\%").replace(/_/g, "\\_");
    var pattern = "%" + escaped + "%";

    try {
      var q = supabase
        .from("candidates")
        .select(
          "\n          id,\n          first_name,\n          last_name,\n          position,\n          status,\n          availability_status,\n          is_archived\n        "
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

      var result = await q;
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] searchAvailableCandidatesForAssociation error:",
          error.message || error,
          { term: termRaw }
        );
        return { data: [], error: error };
      }
      return {
        data: (data || []).map(function (row) {
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
    var sessionResult = await supabase.auth.getSession();
    var session = sessionResult && sessionResult.data
      ? sessionResult.data.session
      : null;
    var userId = session && session.user ? session.user.id : null;
    if (!userId) {
      var err = new Error("Not authenticated");
      console.error("[Supabase] linkCandidateToJob:", err);
      return { data: null, error: err };
    }
    try {
      var candidateId = payload.candidate_id;
      var candidateResult = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .maybeSingle();
      var candidateRow = candidateResult ? candidateResult.data : null;
      var fetchErr = candidateResult ? candidateResult.error : null;
      if (fetchErr) {
        console.error(
          "[Supabase] linkCandidateToJob fetch candidate error:",
          fetchErr.message,
          fetchErr
        );
        return { data: null, error: fetchErr };
      }
      if (!candidateRow) {
        var notFoundErr = new Error("Candidate not found");
        console.error(
          "[Supabase] linkCandidateToJob:",
          notFoundErr.message
        );
        return { data: null, error: notFoundErr };
      }
      var jobOfferId = payload.job_offer_id;
      var existingResult = await supabase
        .from("candidate_job_associations")
        .select("id, status")
        .eq("candidate_id", candidateId)
        .eq("job_offer_id", jobOfferId)
        .not("status", "in", "(rejected,withdrawn,not_selected)")
        .maybeSingle();
      var existing = existingResult ? existingResult.data : null;
      var existingErr = existingResult ? existingResult.error : null;
      if (existingErr) {
        console.error(
          "[Supabase] linkCandidateToJob duplicate check error:",
          existingErr.message,
          existingErr
        );
        return { data: null, error: existingErr };
      }
      if (existing) {
        var dupErr = new Error(
          "This candidate already has an active application for this job offer."
        );
        dupErr.code = "DUPLICATE_APPLICATION";
        console.warn(
          "[Supabase] linkCandidateToJob duplicate:",
          candidateId,
          jobOfferId
        );
        return { data: null, error: dupErr };
      }
      if (typeof window.debugLog === "function") {
        window.debugLog("[Supabase] linkCandidateToJob");
      }
      var rawStatus = payload.status || "applied";
      var status = rawStatus === "new" ? "applied" : rawStatus;
      var row = {
        candidate_id: candidateId,
        job_offer_id: jobOfferId,
        status: status,
        notes: payload.notes || null,
        created_by: userId,
      };
      var insertResult = await supabase
        .from("candidate_job_associations")
        .insert(row)
        .select()
        .single();
      var data = insertResult ? insertResult.data : null;
      var error = insertResult ? insertResult.error : null;
      if (error) {
        console.error(
          "[Supabase] linkCandidateToJob error:",
          error.message,
          error
        );
        return { data: null, error: error };
      }
      // Any new association (by definition) makes the candidate unavailable.
      await recalculateCandidateAvailability(candidateId);
      return { data: data, error: null };
    } catch (e) {
      console.error("[Supabase] linkCandidateToJob exception:", e);
      return { data: null, error: e };
    }
  }

  /**
   * Search active, non-archived job offers for association.
   * Delegates active/archived semantics to the same filters used by job-offer listing.
   * @param {object} opts - { term?: string, limit?: number, clientId?: string | null }
   * @returns {Promise<{ data: array, error: object | null }>}
   */
  async function searchActiveJobOffersForAssociation(opts) {
    var termRaw = opts && typeof opts.term === "string" ? opts.term : "";
    var term = termRaw.trim();
    var limit =
      opts && typeof opts.limit === "number"
        ? Math.max(1, Math.min(50, opts.limit))
        : 20;
    var clientId =
      opts && opts.clientId ? String(opts.clientId) : null;

    var filters = {
      archived: "active",
      offerStatus: "active",
      title: term || "",
      clientId: clientId || undefined,
    };

    try {
      // Inline variant of buildJobOffersQuery from core/data/job-offers.js
      var baseQuery = supabase
        .from("job_offers")
        .select(
          "\n          id,\n          title,\n          status,\n          is_archived,\n          client_id,\n          clients (\n            id,\n            name\n          )\n        "
        );

      var q = baseQuery;

      if (filters.archived === "active") {
        q = q.eq("is_archived", false);
      } else if (filters.archived === "archived") {
        q = q.eq("is_archived", true);
      }

      if (filters.excludeArchivedStatus === true) {
        q = q.not("status", "eq", "archived");
      }
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.contractType) {
        q = q.eq("contract_type", filters.contractType);
      }
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
        var escapedCity = cityTerm
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");
        q = q.ilike("city", "%" + escapedCity + "%");
      }
      var stateTerm = (filters.state || "").trim();
      if (stateTerm) {
        var escapedState = stateTerm
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");
        q = q.ilike("state", "%" + escapedState + "%");
      }

      var dataResult = await q
        .order("created_at", { ascending: false })
        .range(0, limit - 1);
      var rows = dataResult ? dataResult.data : null;
      var error = dataResult ? dataResult.error : null;

      if (error) {
        console.error(
          "[Supabase] searchActiveJobOffersForAssociation error:",
          error.message || error,
          { term: term, clientId: clientId }
        );
        return { data: [], error: error };
      }

      var data =
        rows && Array.isArray(rows)
          ? rows.map(function (r) {
              var client = r.clients || null;
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

      return { data: data, error: null };
    } catch (err) {
      console.error(
        "[Supabase] searchActiveJobOffersForAssociation exception:",
        err,
        { term: term, clientId: clientId }
      );
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
      var assocResult = await supabase
        .from("candidate_job_associations")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      var assocs = assocResult ? assocResult.data : null;
      var assocError = assocResult ? assocResult.error : null;
      if (assocError) {
        console.error(
          "[Supabase] fetchJobHistoryForCandidate error:",
          assocError.message,
          assocError
        );
        return { data: [], error: assocError };
      }
      if (!assocs || !assocs.length) {
        return { data: [], error: null };
      }
      var offerIds = Array.from(
        new Set(
          assocs
            .map(function (a) {
              return a && a.job_offer_id;
            })
            .filter(Boolean)
        )
      );
      var offerResult = await supabase
        .from("job_offers")
        .select(
          "\n          id,\n          title,\n          position,\n          city,\n          state,\n          salary,\n          deadline,\n          status,\n          clients (\n            id,\n            name,\n            city,\n            state\n          )\n        "
        )
        .in("id", offerIds);
      var offers = offerResult ? offerResult.data : null;
      var offersError = offerResult ? offerResult.error : null;
      if (offersError) {
        console.error(
          "[Supabase] fetchJobHistoryForCandidate job_offers error:",
          offersError.message
        );
        return {
          data: assocs.map(function (a) {
            return { association: a, job_offer: null };
          }),
          error: null,
        };
      }
      var normalizedOffers = (offers || []).map(function (o) {
        var client = o.clients || null;
        var clientName = (client && client.name) || null;
        var location = [o.city, o.state]
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
      var offerMap = normalizedOffers.reduce(function (acc, o) {
        acc[o.id] = o;
        return acc;
      }, {});
      var result = assocs.map(function (a) {
        return {
          association: a,
          job_offer: offerMap[a.job_offer_id] || null,
        };
      });
      return { data: result, error: null };
    } catch (err) {
      console.error(
        "[Supabase] fetchJobHistoryForCandidate exception:",
        err
      );
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
      var result = await supabase
        .from("candidate_job_associations")
        .select(
          "\n          id,\n          status,\n          notes,\n          rejection_reason,\n          created_at,\n          candidates (\n            id,\n            first_name,\n            last_name,\n            position,\n            is_archived,\n            cv_url\n          )\n        "
        )
        .eq("job_offer_id", jobOfferId)
        .order("created_at", { ascending: false });
      var data = result ? result.data : null;
      var error = result ? result.error : null;
      if (error) {
        console.error(
          "[Supabase] fetchCandidatesForJobOffer error:",
          error.message,
          error
        );
        return { data: [], error: error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error(
        "[Supabase] fetchCandidatesForJobOffer exception:",
        err
      );
      return { data: [], error: err };
    }
  }

  /**
   * Fetch applications (candidate_job_associations) paginated with filters.
   * @param {object} filters - { status?, job_offer_id?, client_id?, candidate_id?, date_from?, date_to? }
   * @param {object} pagination - { page: number, limit: number }
   * @returns {Promise<{ data: array, totalCount: number, error: object | null }>}
   */
  async function fetchApplicationsPaginated(filters, pagination) {
    filters = filters || {};
    var page = Math.max(1, (pagination && pagination.page) || 1);
    var limit = Math.max(
      1,
      Math.min(100, (pagination && pagination.limit) || 25)
    );
    var offset = (page - 1) * limit;

    try {
      var query = supabase
        .from("candidate_job_associations")
        .select(
          "\n          id,\n          candidate_id,\n          job_offer_id,\n          status,\n          notes,\n          rejection_reason,\n          created_at,\n          candidates (\n            id,\n            first_name,\n            last_name,\n            position,\n            status,\n            is_archived\n          ),\n          job_offers (\n            id,\n            title,\n            position,\n            status,\n            client_id,\n            clients (\n              id,\n              name\n            )\n          )\n        ",
          { count: "exact" }
        );

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.job_offer_id) {
        query = query.eq("job_offer_id", filters.job_offer_id);
      }
      if (filters.candidate_id) {
        query = query.eq("candidate_id", filters.candidate_id);
      }
      if (filters.client_id) {
        var offersForClient = await supabase
          .from("job_offers")
          .select("id")
          .eq("client_id", filters.client_id);
        var offerIds = offersForClient ? offersForClient.data : null;
        var ids = (offerIds || [])
          .map(function (o) {
            return o && o.id;
          })
          .filter(Boolean);
        if (ids.length === 0) {
          return { data: [], totalCount: 0, error: null };
        }
        query = query.in("job_offer_id", ids);
      }
      if (filters.date_from) {
        query = query.gte("created_at", filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte("created_at", filters.date_to);
      }

      var result = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      var rows = result ? result.data : null;
      var error = result ? result.error : null;
      var count = result && typeof result.count === "number"
        ? result.count
        : null;

      if (error) {
        console.error(
          "[Supabase] fetchApplicationsPaginated error:",
          error.message,
          error
        );
        return { data: [], totalCount: 0, error: error };
      }

      var data = (rows || []).map(function (r) {
        var cand = r.candidates || null;
        var offer = r.job_offers || null;
        var client = offer && offer.clients ? offer.clients : null;
        return {
          id: r.id,
          candidate_id: r.candidate_id,
          job_offer_id: r.job_offer_id,
          status: r.status,
          notes: r.notes,
          rejection_reason: r.rejection_reason,
          created_at: r.created_at,
          candidate_name: cand
            ? [cand.first_name, cand.last_name]
                .filter(Boolean)
                .join(" ")
                .trim() || "—"
            : "—",
          candidate_position: cand && cand.position ? cand.position : null,
          job_offer_title:
            offer && (offer.title || offer.position)
              ? offer.title || offer.position
              : "—",
          client_name: client && client.name ? client.name : "—",
          client_id: offer && offer.client_id ? offer.client_id : null,
        };
      });

      return {
        data: data,
        totalCount: count != null ? count : 0,
        error: null,
      };
    } catch (err) {
      console.error(
        "[Supabase] fetchApplicationsPaginated exception:",
        err
      );
      return { data: [], totalCount: 0, error: err };
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
  async function updateCandidateAssociationStatus(
    associationId,
    status,
    options
  ) {
    options = options || {};
    if (!associationId) {
      var err = new Error("Missing association id");
      console.error("[Supabase] updateCandidateAssociationStatus:", err);
      return { data: null, error: err };
    }
    try {
      var fetchResult = await supabase
        .from("candidate_job_associations")
        .select("candidate_id, job_offer_id, status")
        .eq("id", associationId)
        .single();
      var oldRow = fetchResult ? fetchResult.data : null;
      var fetchErr = fetchResult ? fetchResult.error : null;
      if (fetchErr || !oldRow) {
        console.error(
          "[Supabase] updateCandidateAssociationStatus fetch error:",
          fetchErr && fetchErr.message,
          fetchErr
        );
        return {
          data: null,
          error: fetchErr || new Error("Association not found"),
        };
      }

      var updatePayload = { status: status };
      if (status === "rejected") {
        updatePayload.rejection_reason =
          options.rejectionReason != null
            ? options.rejectionReason
            : null;
      }

      var updateResult = await supabase
        .from("candidate_job_associations")
        .update(updatePayload)
        .eq("id", associationId)
        .select()
        .single();
      var data = updateResult ? updateResult.data : null;
      var error = updateResult ? updateResult.error : null;
      if (error) {
        console.error(
          "[Supabase] updateCandidateAssociationStatus error:",
          error.message,
          error
        );
        return { data: null, error: error };
      }

      // Sync candidate status when hired (pipeline logic only; do not change)
      if (status === "hired" && oldRow.candidate_id) {
        var candUpdateResult = await supabase
          .from("candidates")
          .update({ status: "hired" })
          .eq("id", oldRow.candidate_id);
        var candidateUpdateError = candUpdateResult
          ? candUpdateResult.error
          : null;

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

      if (
        oldRow.candidate_id &&
        window.IESupabase &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        if (status === "rejected") {
          window.IESupabase
            .createAutoLog("candidate", oldRow.candidate_id, {
              event_type: "rejection",
              message: "Application rejected",
              metadata: {
                association_id: associationId,
                job_offer_id: oldRow.job_offer_id,
                rejection_reason:
                  options.rejectionReason != null
                    ? options.rejectionReason
                    : null,
              },
            })
            .catch(function (e) {
              console.warn(
                "[Supabase] createAutoLog rejection:",
                e && e.message
              );
            });
        } else if (status === "hired") {
          window.IESupabase
            .createAutoLog("candidate", oldRow.candidate_id, {
              event_type: "status_change",
              message: "Hired for job offer",
              metadata: {
                association_id: associationId,
                job_offer_id: oldRow.job_offer_id,
              },
            })
            .catch(function (e) {
              console.warn(
                "[Supabase] createAutoLog hired:",
                e && e.message
              );
            });
        } else if (status === "withdrawn") {
          window.IESupabase
            .createAutoLog("candidate", oldRow.candidate_id, {
              event_type: "system_event",
              message: "Application withdrawn",
              metadata: {
                association_id: associationId,
                job_offer_id: oldRow.job_offer_id,
              },
            })
            .catch(function (e) {
              console.warn(
                "[Supabase] createAutoLog withdrawn:",
                e && e.message
              );
            });
        }
      }

      return { data: data, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] updateCandidateAssociationStatus exception:",
        err2
      );
      return { data: null, error: err2 };
    }
  }

  /**
   * Remove a candidate from a job (logical withdrawal: set status to 'withdrawn').
   * Does not delete the row; use deleteAssociationPermanently for admin cleanup.
   * @param {string} associationId - candidate_job_associations.id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function removeCandidateFromJob(associationId) {
    if (!associationId) {
      var err = new Error("Missing association id");
      console.error("[Supabase] removeCandidateFromJob:", err);
      return { data: null, error: err };
    }
    try {
      var updateResult = await supabase
        .from("candidate_job_associations")
        .update({ status: "withdrawn" })
        .eq("id", associationId)
        .select()
        .single();
      var updated = updateResult ? updateResult.data : null;
      var error = updateResult ? updateResult.error : null;
      if (error) {
        console.error(
          "[Supabase] removeCandidateFromJob error:",
          error.message,
          error
        );
        return { data: null, error: error };
      }
      if (updated && updated.candidate_id) {
        await recalculateCandidateAvailability(updated.candidate_id);
      }
      if (updated && updated.job_offer_id) {
        await syncJobOfferStatusFromHired(updated.job_offer_id);
      }
      if (
        updated &&
        updated.candidate_id &&
        window.IESupabase &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("candidate", updated.candidate_id, {
            event_type: "system_event",
            message: "Application withdrawn",
            metadata: {
              association_id: associationId,
              job_offer_id: updated.job_offer_id,
            },
          })
          .catch(function (e) {
            console.warn(
              "[Supabase] createAutoLog withdrawn (remove):",
              e && e.message
            );
          });
      }
      return { data: updated, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] removeCandidateFromJob exception:",
        err2
      );
      return { data: null, error: err2 };
    }
  }

  /**
   * Permanently delete an association (admin only). Use after logical withdrawal when cleanup is required.
   * @param {string} associationId - candidate_job_associations.id
   * @returns {Promise<{ data: array | null, error: object | null }>}
   */
  async function deleteAssociationPermanently(associationId) {
    if (!associationId) {
      var err = new Error("Missing association id");
      console.error("[Supabase] deleteAssociationPermanently:", err);
      return { data: null, error: err };
    }
    try {
      var deleteResult = await supabase
        .from("candidate_job_associations")
        .delete()
        .eq("id", associationId)
        .select();
      var deleted = deleteResult ? deleteResult.data : null;
      var error = deleteResult ? deleteResult.error : null;
      if (error) {
        console.error(
          "[Supabase] deleteAssociationPermanently error:",
          error.message,
          error
        );
        return { data: null, error: error };
      }
      var deletedRow = Array.isArray(deleted) ? deleted[0] : deleted;
      if (deletedRow && deletedRow.job_offer_id) {
        await syncJobOfferStatusFromHired(deletedRow.job_offer_id);
      }
      if (deletedRow && deletedRow.candidate_id) {
        await recalculateCandidateAvailability(deletedRow.candidate_id);
      }
      return { data: deleted || [], error: null };
    } catch (err2) {
      console.error(
        "[Supabase] deleteAssociationPermanently exception:",
        err2
      );
      return { data: null, error: err2 };
    }
  }

  /**
   * Restore a withdrawn application (set status to 'applied').
   * @param {string} associationId - candidate_job_associations.id
   * @returns {Promise<{ data: object | null, error: object | null }>}
   */
  async function restoreApplication(associationId) {
    if (!associationId) {
      var err = new Error("Missing association id");
      console.error("[Supabase] restoreApplication:", err);
      return { data: null, error: err };
    }
    try {
      var updateResult = await supabase
        .from("candidate_job_associations")
        .update({ status: "applied" })
        .eq("id", associationId)
        .select()
        .single();
      var updated = updateResult ? updateResult.data : null;
      var error = updateResult ? updateResult.error : null;
      if (error) {
        console.error(
          "[Supabase] restoreApplication error:",
          error.message,
          error
        );
        return { data: null, error: error };
      }
      if (updated && updated.candidate_id) {
        await recalculateCandidateAvailability(updated.candidate_id);
      }
      if (updated && updated.job_offer_id) {
        await syncJobOfferStatusFromHired(updated.job_offer_id);
      }
      return { data: updated, error: null };
    } catch (err2) {
      console.error(
        "[Supabase] restoreApplication exception:",
        err2
      );
      return { data: null, error: err2 };
    }
  }

  // ---------------------------------------------------------------------------
  // Public internal API – IEData.applications
  // ---------------------------------------------------------------------------

  window.IEData = window.IEData || {};
  window.IEData.applications = {
    recalculateCandidateAvailability: recalculateCandidateAvailability,
    searchAvailableCandidatesForAssociation:
      searchAvailableCandidatesForAssociation,
    linkCandidateToJob: linkCandidateToJob,
    searchActiveJobOffersForAssociation:
      searchActiveJobOffersForAssociation,
    fetchJobHistoryForCandidate: fetchJobHistoryForCandidate,
    fetchCandidatesForJobOffer: fetchCandidatesForJobOffer,
    fetchApplicationsPaginated: fetchApplicationsPaginated,
    updateCandidateAssociationStatus: updateCandidateAssociationStatus,
    removeCandidateFromJob: removeCandidateFromJob,
    deleteAssociationPermanently: deleteAssociationPermanently,
    restoreApplication: restoreApplication,
  };
})();

