// Italian Experience ATS – Applications query layer
// Centralized access to candidate_job_associations and related entities.
// Exposed under window.IEQueries.applications.*

(function () {
  "use strict";

  if (!window.IESupabase || !window.IESupabase.supabase) {
    console.error(
      "[ApplicationsQueries] IESupabase.supabase is not available. Make sure core/supabase.js is loaded first."
    );
    return;
  }

  var supabase = window.IESupabase.supabase;

  var ACTIVE_STATUSES = ["applied", "screening", "interview", "offer", "hired"];

  function normalizeStatus(value) {
    var s = (value || "").toString().toLowerCase();
    // Legacy mapping
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
  }

  function buildApplicationsFilter(query, filters, ignoreStatusFilter) {
    var q = query;
    var f = filters || {};

    if (f.jobOfferId) {
      q = q.eq("job_offer_id", f.jobOfferId);
    }

    if (f.candidateId) {
      q = q.eq("candidate_id", f.candidateId);
    }

    if (f.clientId) {
      q = q.eq("job_offers.clients.id", f.clientId);
    }

    if (!ignoreStatusFilter && f.status) {
      var status = normalizeStatus(f.status);
      if (status) {
        q = q.eq("status", status);
      }
    }

    if (f.dateFrom) {
      q = q.gte("created_at", f.dateFrom);
    }

    if (f.dateTo) {
      q = q.lte("created_at", f.dateTo);
    }

    return q;
  }

  function mapApplicationRow(row) {
    if (!row) return null;
    var candidate = row.candidates || {};
    var job = row.job_offers || {};
    var client = job.clients || {};

    return {
      id: row.id,
      candidate_id: row.candidate_id,
      candidate_name:
        [candidate.first_name, candidate.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || null,
      candidate_position: candidate.position || null,
      candidate_location: candidate.address || null,
      candidate_position: candidate.position || null,
      candidate_notes: candidate.notes || null,
      job_offer_id: row.job_offer_id,
      job_offer_title: job.title || null,
      job_offer_position: job.position || null,
      job_offer_notes: job.notes || null,
      client_id: client.id || null,
      client_name: client.name || null,
      client_notes: client.notes || null,
      status: normalizeStatus(row.status),
      notes: row.notes || null,
      rejection_reason: row.rejection_reason || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
      candidate_experience:
        Array.isArray(candidate.candidate_experience)
          ? candidate.candidate_experience
          : [],
      candidate_skills:
        Array.isArray(candidate.candidate_skills)
          ? candidate.candidate_skills
          : [],
      candidate_languages:
        Array.isArray(candidate.candidate_languages)
          ? candidate.candidate_languages
          : [],
    };
  }

  async function getApplications(opts) {
    var options = opts || {};
    var page = Math.max(1, parseInt(options.page, 10) || 1);
    var limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 25));
    var offset = (page - 1) * limit;

    try {
      var base = supabase
        .from("candidate_job_associations")
        .select(
          [
            "id",
            "candidate_id",
            "job_offer_id",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
            "candidates ( id, first_name, last_name, position, address, notes )",
            "job_offers ( id, title, position, notes, clients ( id, name, notes ) )",
          ].join(",")
        );

      var filtered = buildApplicationsFilter(base, options.filters || {}, false);

      var countQuery = buildApplicationsFilter(
        supabase
          .from("candidate_job_associations")
          .select("id", { count: "exact", head: true }),
        options.filters || {},
        false
      );

      var countPromise = countQuery;
      var dataPromise = filtered
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      var results = await Promise.all([countPromise, dataPromise]);
      var countResult = results[0];
      var dataResult = results[1];

      if (countResult.error) {
        console.error(
          "[ApplicationsQueries] getApplications count error:",
          countResult.error
        );
        return { data: [], totalCount: 0, error: countResult.error };
      }
      if (dataResult.error) {
        console.error(
          "[ApplicationsQueries] getApplications data error:",
          dataResult.error
        );
        return {
          data: [],
          totalCount: countResult.count || 0,
          error: dataResult.error,
        };
      }

      var mapped =
        (dataResult.data || []).map(function (row) {
          return mapApplicationRow(row);
        }) || [];

      return {
        data: mapped,
        totalCount: countResult.count || 0,
        error: null,
      };
    } catch (err) {
      console.error("[ApplicationsQueries] getApplications exception:", err);
      return { data: [], totalCount: 0, error: err };
    }
  }

  async function getApplicationsByCandidate(candidateId) {
    if (!candidateId) {
      return { data: [], error: null };
    }
    try {
      var { data, error } = await supabase
        .from("candidate_job_associations")
        .select(
          [
            "id",
            "candidate_id",
            "job_offer_id",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
            "candidates ( id, first_name, last_name, position, address )",
            "job_offers ( id, title, position, clients ( id, name ) )",
          ].join(",")
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "[ApplicationsQueries] getApplicationsByCandidate error:",
          error
        );
        return { data: [], error: error };
      }

      return {
        data: (data || []).map(mapApplicationRow),
        error: null,
      };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] getApplicationsByCandidate exception:",
        err
      );
      return { data: [], error: err };
    }
  }

  async function getApplicationsByJob(jobOfferId) {
    if (!jobOfferId) {
      return { data: [], error: null };
    }
    try {
      var { data, error } = await supabase
        .from("candidate_job_associations")
        .select(
          [
            "id",
            "candidate_id",
            "job_offer_id",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
            "candidates ( id, first_name, last_name, position, address )",
            "job_offers ( id, title, position, clients ( id, name ) )",
          ].join(",")
        )
        .eq("job_offer_id", jobOfferId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "[ApplicationsQueries] getApplicationsByJob error:",
          error
        );
        return { data: [], error: error };
      }

      return {
        data: (data || []).map(mapApplicationRow),
        error: null,
      };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] getApplicationsByJob exception:",
        err
      );
      return { data: [], error: err };
    }
  }

  async function getApplicationById(id) {
    if (!id) {
      return { data: null, error: new Error("Missing application id") };
    }
    try {
      var { data, error } = await supabase
        .from("candidate_job_associations")
        .select(
          [
            "id",
            "candidate_id",
            "job_offer_id",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
            "candidates ( id, first_name, last_name, position, address, status, notes, candidate_experience ( id, candidate_id, title, company, location, start_date, end_date, description ), candidate_skills ( id, candidate_id, skill ), candidate_languages ( id, candidate_id, language, level ) )",
            "job_offers ( id, title, position, city, state, positions_required, notes, clients ( id, name, city, state, notes ) )",
          ].join(",")
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "[ApplicationsQueries] getApplicationById error:",
          error
        );
        return { data: null, error: error };
      }

      return { data: mapApplicationRow(data), error: null };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] getApplicationById exception:",
        err
      );
      return { data: null, error: err };
    }
  }

  async function getPipelineCounts(filters) {
    var f = filters || {};
    var baseFilters = Object.assign({}, f);
    delete baseFilters.status;

    try {
      var results = await Promise.all(
        ACTIVE_STATUSES.map(function (status) {
          var q = supabase
            .from("candidate_job_associations")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          q = buildApplicationsFilter(q, baseFilters, true);
          return q.then(function (res) {
            return {
              status: status,
              count: res.count || 0,
              error: res.error || null,
            };
          });
        })
      );

      var counts = {};
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        if (r.error) {
          console.error(
            "[ApplicationsQueries] getPipelineCounts error for",
            r.status,
            r.error
          );
        }
        counts[r.status] = r.count;
      }

      return { data: counts, error: null };
    } catch (err) {
      console.error("[ApplicationsQueries] getPipelineCounts exception:", err);
      return { data: {}, error: err };
    }
  }

  async function createApplication(candidateId, jobOfferId, options) {
    if (!candidateId || !jobOfferId) {
      return {
        data: null,
        error: new Error("Missing candidate_id or job_offer_id"),
      };
    }

    var opts = options || {};

    try {
      var sessionResult = await window.IESupabase.getSession();
      var userId =
        sessionResult &&
        sessionResult.data &&
        sessionResult.data.user &&
        sessionResult.data.user.id;

      if (!userId) {
        var authErr = new Error("Not authenticated");
        return { data: null, error: authErr };
      }

      var existing = await supabase
        .from("candidate_job_associations")
        .select("id", { count: "exact" })
        .eq("candidate_id", candidateId)
        .eq("job_offer_id", jobOfferId)
        .limit(1);

      if (existing.error) {
        console.error(
          "[ApplicationsQueries] createApplication duplicate check error:",
          existing.error
        );
        return { data: null, error: existing.error };
      }

      if (Array.isArray(existing.data) && existing.data.length > 0) {
        var dupErr = new Error(
          "This candidate already has an application for this job offer."
        );
        dupErr.code = "DUPLICATE_APPLICATION";
        return { data: null, error: dupErr };
      }

      var insertPayload = {
        candidate_id: candidateId,
        job_offer_id: jobOfferId,
        status: "applied",
        notes: opts.notes || null,
        created_by: userId,
      };

      var insertResult = await supabase
        .from("candidate_job_associations")
        .insert(insertPayload)
        .select()
        .single();

      if (insertResult.error) {
        console.error(
          "[ApplicationsQueries] createApplication insert error:",
          insertResult.error
        );
        return { data: null, error: insertResult.error };
      }

      var association = insertResult.data;

      if (
        typeof window.IESupabase.createAutoLog === "function" &&
        association &&
        association.id
      ) {
        window.IESupabase
          .createAutoLog("application", association.id, {
            event_type: "application_created",
            message: "Application created",
            metadata: {
              candidate_id: candidateId,
              job_offer_id: jobOfferId,
            },
          })
          .catch(function () {});
      }

      return { data: association, error: null };
    } catch (err) {
      console.error("[ApplicationsQueries] createApplication exception:", err);
      return { data: null, error: err };
    }
  }

  async function updateApplicationStatus(id, newStatus, options) {
    if (!id) {
      return { data: null, error: new Error("Missing application id") };
    }
    var status = normalizeStatus(newStatus);
    var opts = options || {};

    try {
      if (
        !window.IESupabase ||
        typeof window.IESupabase.updateCandidateAssociationStatus !== "function"
      ) {
        return {
          data: null,
          error: new Error(
            "updateCandidateAssociationStatus is not available on IESupabase"
          ),
        };
      }

      var result = await window.IESupabase.updateCandidateAssociationStatus(
        id,
        status,
        {
          rejectionReason: opts.rejectionReason || null,
        }
      );

      if (result.error) {
        return { data: null, error: result.error };
      }

      var association = result.data;

      if (typeof window.IESupabase.createAutoLog === "function") {
        var eventType = "status_changed";
        if (status === "rejected") eventType = "application_rejected";
        else if (status === "hired") eventType = "application_hired";
        else if (status === "withdrawn") eventType = "application_withdrawn";

        window.IESupabase
          .createAutoLog("application", id, {
            event_type: eventType,
            message: "Application status changed to " + status,
            metadata: {
              application_id: id,
              status: status,
            },
          })
          .catch(function () {});
      }

      return { data: association, error: null };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] updateApplicationStatus exception:",
        err
      );
      return { data: null, error: err };
    }
  }

  async function getArchivedApplications(opts) {
    var options = opts || {};
    try {
      var q = supabase
        .from("candidate_job_associations")
        .select(
          [
            "id",
            "candidate_id",
            "job_offer_id",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
            "candidates ( id, first_name, last_name, position )",
            "job_offers ( id, title, position, clients ( id, name ) )",
          ].join(",")
        )
        .eq("status", "withdrawn")
        .order("created_at", { ascending: false });

      var res = await q;
      if (res.error) {
        console.error(
          "[ApplicationsQueries] getArchivedApplications error:",
          res.error
        );
        return { data: [], error: res.error };
      }

      return {
        data: (res.data || []).map(mapApplicationRow),
        error: null,
      };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] getArchivedApplications exception:",
        err
      );
      return { data: [], error: err };
    }
  }

  async function deleteApplicationPermanently(id) {
    if (!id) {
      return { data: null, error: new Error("Missing application id") };
    }
    try {
      var result;
      if (
        window.IESupabase &&
        typeof window.IESupabase.deletePermanentRecord === "function"
      ) {
        result = await window.IESupabase.deletePermanentRecord(
          "candidate_job_associations",
          id
        );
      } else {
        result = await supabase
          .from("candidate_job_associations")
          .delete()
          .eq("id", id);
      }
      if (result.error) {
        console.error(
          "[ApplicationsQueries] deleteApplicationPermanently error:",
          result.error
        );
        return { data: null, error: result.error };
      }
      return { data: result.data || null, error: null };
    } catch (err) {
      console.error(
        "[ApplicationsQueries] deleteApplicationPermanently exception:",
        err
      );
      return { data: null, error: err };
    }
  }

  window.IEQueries = window.IEQueries || {};
  window.IEQueries.applications = {
    getApplications: getApplications,
    getApplicationsByCandidate: getApplicationsByCandidate,
    getApplicationsByJob: getApplicationsByJob,
    getApplicationById: getApplicationById,
    getPipelineCounts: getPipelineCounts,
    createApplication: createApplication,
    updateApplicationStatus: updateApplicationStatus,
    getArchivedApplications: getArchivedApplications,
    deleteApplicationPermanently: deleteApplicationPermanently,
  };
})();

