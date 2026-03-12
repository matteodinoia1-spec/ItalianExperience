;(function () {
  "use strict";

  if (!window.CandidateParsers) {
    window.CandidateParsers = {};
  }

  window.CandidateParsers.parseDateOfBirth = function parseDateOfBirth(
    value,
    ctx
  ) {
    if (!value) {
      return null;
    }

    var str = value.toString().trim();
    if (!str) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      var day = match[1].padStart(2, "0");
      var month = match[2].padStart(2, "0");
      var year = match[3];
      return year + "-" + month + "-" + day;
    }

    return ctx && ctx.entity && ctx.entity.date_of_birth
      ? ctx.entity.date_of_birth
      : null;
  };

  window.CandidateParsers.formatDateOfBirth =
    function formatDateOfBirth(value) {
      if (!value) return "";
      try {
        var d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString("it-IT");
      } catch (_) {
        return "";
      }
    };

  function getPageParams() {
    if (
      window.IERouter &&
      typeof window.IERouter.getCandidatePageParams === "function"
    ) {
      return window.IERouter.getCandidatePageParams();
    }

    var search = new URLSearchParams(window.location.search || "");
    var rawId = search.get("id");
    var id = rawId ? rawId.toString() : null;
    var rawMode = (search.get("mode") || "").toString().toLowerCase();
    var mode = rawMode === "edit" ? "edit" : "view";
    return { id: id, mode: mode };
  }

  function navigateToList() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("candidates.html");
    } else {
      window.location.href = "candidates.html";
    }
  }

  function getViewUrl(id) {
    if (!id) {
      return "candidate.html";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.candidateView === "function"
    ) {
      return window.IEPortal.links.candidateView(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityViewUrl === "function"
    ) {
      return window.IERouter.getEntityViewUrl("candidate", id);
    }

    return "candidate.html?id=" + encodeURIComponent(id);
  }

  function getEditUrl(id) {
    if (!id) {
      return "candidate.html?mode=edit";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.candidateEdit === "function"
    ) {
      return window.IEPortal.links.candidateEdit(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityEditUrl === "function"
    ) {
      return window.IERouter.getEntityEditUrl("candidate", id);
    }

    return (
      "candidate.html?id=" +
      encodeURIComponent(id) +
      "&mode=edit"
    );
  }

  function getStatus(candidate) {
    if (!candidate) return null;
    return candidate.is_archived ? "archived" : "active";
  }

  async function archive(candidateId) {
    if (!candidateId) return null;
    if (!window.IESupabase || !window.IESupabase.archiveCandidate) {
      return null;
    }

    var res = await window.IESupabase.archiveCandidate(candidateId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("candidate", candidateId, {
          event_type: "system_event",
          message: "Candidate archived",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  async function reopen(candidateId) {
    if (!candidateId) return null;
    if (!window.IESupabase || !window.IESupabase.unarchiveCandidate) {
      return null;
    }

    var res = await window.IESupabase.unarchiveCandidate(candidateId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("candidate", candidateId, {
          event_type: "system_event",
          message: "Candidate restored",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  function applyMode(mode, context) {
    if (!context || !mode) return;

    var entity = context && context.entity ? context.entity : null;

    if (typeof window.applyModeToProfileFields === "function") {
      window.applyModeToProfileFields(mode);
    }
    if (typeof window.applyHeroContactMode === "function") {
      window.applyHeroContactMode(mode);
    }
    if (typeof window.applyInlineProfileEditVisibility === "function") {
      window.applyInlineProfileEditVisibility(mode);
    }
    if (typeof window.applyActivityVisibility === "function") {
      window.applyActivityVisibility(mode);
    }
    if (typeof window.applyDocumentsMode === "function") {
      window.applyDocumentsMode(mode, entity);
    }
    if (typeof window.applyJsonImportVisibility === "function") {
      window.applyJsonImportVisibility(mode);
    }

    // When the candidate entity page is in edit mode, mount the inline
    // profile repeatable sections (experience, skills, etc.) and wire
    // the JSON import controls so that Add/Remove buttons and parser
    // hydration work as before the entity-page refactor.
    if (mode === "edit") {
      try {
        var profileRoot = document.getElementById("candidateInlineProfileForm");
        if (
          profileRoot &&
          window.IECandidateProfileRuntime &&
          typeof window.IECandidateProfileRuntime.initCandidateProfileSections ===
            "function"
        ) {
          window.IECandidateProfileRuntime.initCandidateProfileSections(
            profileRoot,
            "edit",
            entity
          );
        }

        if (
          profileRoot &&
          window.IECandidateImportRuntime &&
          typeof window.IECandidateImportRuntime.initCandidateJsonImport ===
            "function"
        ) {
          window.IECandidateImportRuntime.initCandidateJsonImport(
            profileRoot,
            { allowExistingCandidate: true }
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[Candidate] mode.apply profile wiring error:",
          err
        );
      }
    }
  }

  function loadEntity(args) {
    args = args || {};
    var id = args.id;
    var mode = args.mode || "view";

    if (!id) {
      return Promise.resolve({ entity: null, mode: mode });
    }

    if (typeof window.loadCandidateCore === "function") {
      return window.loadCandidateCore(id).then(function (result) {
        var candidate =
          result && typeof result === "object" ? result.candidate : null;
        return { entity: candidate || null, mode: mode };
      });
    }

    return Promise.resolve({ entity: null, mode: mode });
  }

  function renderMain(options) {
    options = options || {};
    var entity = options.entity || null;
    var id = options.id;
    var mode = options.mode || "view";

    if (!entity || !id) return;

    if (typeof window.renderCandidateCore === "function") {
      window.renderCandidateCore(entity, id, mode);
    }

    // Hydrate read-only profile sections and documents so that the
    // entity-page shell preserves the legacy candidate.html behaviour.
    try {
      if (typeof window.loadCandidateProfileSections === "function") {
        window.loadCandidateProfileSections(id);
      }
      if (typeof window.renderDocuments === "function") {
        window.renderDocuments(entity);
      }
      if (typeof window.wireAddApplicationButton === "function") {
        console.log(
          "[AddApplicationDebug] renderMain wiring Add Application button",
          {
            candidateId: id,
            mode: mode,
          }
        );
        window.wireAddApplicationButton(id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Candidate] renderMain profile wiring error:", err);
    }
  }

  function onNotFound() {
    if (typeof window.renderNotFound === "function") {
      window.renderNotFound();
    }
  }

  function onSave(state) {
    if (typeof window.saveInlineProfileEdits === "function") {
      return window.saveInlineProfileEdits();
    }
    return null;
  }

  function loadAssociatedOffersSection(state) {
    state = state || {};
    var candidateId = state.id;
    if (!candidateId) {
      return Promise.resolve({ applicationsForAvailability: [] });
    }

    if (
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.getApplicationsByCandidate ===
        "function"
    ) {
      return window.IEQueries.applications
        .getApplicationsByCandidate(candidateId)
        .then(function (result) {
          if (!result || result.error || !Array.isArray(result.data)) {
            return { applicationsForAvailability: [] };
          }
          return { applicationsForAvailability: result.data };
        })
        .catch(function (err) {
          console.error(
            "[Candidate] getApplicationsByCandidate error (related section):",
            err
          );
          return { applicationsForAvailability: [] };
        });
    }

    return Promise.resolve({ applicationsForAvailability: [] });
  }

  function renderAssociatedOffersSection(state, data) {
    state = state || {};
    data = data || {};
    var candidateId = state.id;
    var apps = data.applicationsForAvailability || [];

    try {
      if (
        window.IEQueries &&
        window.IEQueries.candidates &&
        typeof window.IEQueries.candidates
          .deriveAvailabilityFromApplications === "function" &&
        typeof window.applyAvailabilityToHeader === "function"
      ) {
        var availability =
          window.IEQueries.candidates.deriveAvailabilityFromApplications(
            apps
          );
        window.applyAvailabilityToHeader(availability);
      } else if (typeof window.applyAvailabilityToHeader === "function") {
        window.applyAvailabilityToHeader("available");
      }
    } catch (err) {
      console.error(
        "[Candidate] availability derivation error (related section):",
        err
      );
      if (typeof window.applyAvailabilityToHeader === "function") {
        window.applyAvailabilityToHeader("available");
      }
    }

    if (typeof window.renderAssociatedOffers !== "function" || !candidateId) {
      return null;
    }

    return window
      .renderAssociatedOffers(candidateId)
      .catch(function (err) {
        console.error(
          "[Candidate] renderAssociatedOffers error (related section):",
          err
        );
      });
  }

  function buildSavePayload(state) {
    state = state || {};
    var candidate = state.entity || {};

    var payload = {
      first_name: candidate.first_name || "",
      last_name: candidate.last_name || "",
      address: candidate.address || null,
      position: candidate.position || null,
      status: candidate.status || "pending_review",
      source: candidate.source || null,
      notes: candidate.notes || null,
      email: candidate.email || null,
      phone: candidate.phone || null,
      linkedin_url: candidate.linkedin_url || null,
      date_of_birth: candidate.date_of_birth || null,
      summary: candidate.summary || null,
    };

    var edited = {};
    if (typeof window.collectEditableFieldValues === "function") {
      try {
        edited = window.collectEditableFieldValues(candidate) || {};
      } catch (err) {
        console.error(
          "[Candidate] collectEditableFieldValues error from config:",
          err
        );
        edited = {};
      }
    }

    Object.keys(edited).forEach(function (key) {
      payload[key] = edited[key];
    });

    var profile = null;
    try {
      var profileRoot = document.getElementById("candidateInlineProfileForm");
      if (
        profileRoot &&
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.collectCandidateProfileData ===
          "function"
      ) {
        profile =
          window.IECandidateProfileRuntime.collectCandidateProfileData(
            profileRoot
          ) || null;
      }
    } catch (profileErr) {
      console.error(
        "[Candidate] collectCandidateProfileData error from inline edit:",
        profileErr
      );
    }

    var payload = {
      main: payload,
      children: profile,
    };

    try {
      console.log("[CandidateSaveDebug] buildSavePayload result", {
        id: state.id,
        main: payload.main || payload,
        children: payload.children || profile,
      });
    } catch (_) {}

    return payload;
  }

  async function performSave(state, payload) {
    state = state || {};
    payload = payload || {};

    var candidateId = state.id;
    if (!candidateId) {
      return { entity: state.entity || null, haltRedirect: true };
    }

    if (
      !window.IESupabase ||
      typeof window.IESupabase.updateCandidate !== "function"
    ) {
      console.error("[Candidate] IESupabase.updateCandidate not available");
      return { entity: state.entity || null, haltRedirect: true };
    }

    var main = payload.main || {};
    var children = payload.children || null;
    var currentEntity = state.entity || {};

    try {
      console.log("[CandidateSaveDebug] performSave start", {
        candidateId: candidateId,
        main: main,
        children: children,
      });
      var result = await window.IESupabase.updateCandidate(
        candidateId,
        main
      );
      console.log("[CandidateSaveDebug] IESupabase.updateCandidate result", {
        candidateId: candidateId,
        result: result,
      });
      if (!result || result.error) {
        console.error(
          "[Candidate] updateCandidate error from inline edit:",
          result && result.error
        );
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (result &&
              result.error &&
              result.error.message) ||
              "Error while saving candidate profile.",
            "candidateInlineEdit"
          );
        }
        return { entity: currentEntity, haltRedirect: true };
      }

      var updatedCandidate = result.data || currentEntity;

      if (
        children &&
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.saveCandidateProfileChildren ===
          "function"
      ) {
        console.log(
          "[CandidateSaveDebug] saveCandidateProfileChildren input",
          {
            candidateId: candidateId,
            children: children,
          }
        );
        var childrenResult =
          await window.IECandidateProfileRuntime.saveCandidateProfileChildren(
            candidateId,
            children
          );
        console.log(
          "[CandidateSaveDebug] saveCandidateProfileChildren result",
          {
            candidateId: candidateId,
            result: childrenResult,
          }
        );
        if (!childrenResult || childrenResult.ok === false) {
          console.log(
            "[CandidateSaveDebug] saveCandidateProfileChildren returned not ok; halting redirect",
            {
              candidateId: candidateId,
              result: childrenResult,
            }
          );
          return { entity: updatedCandidate, haltRedirect: true };
        }
      }

      if (
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.logCandidateProfileUpdated ===
          "function"
      ) {
        try {
          await window.IECandidateProfileRuntime.logCandidateProfileUpdated(
            candidateId
          );
        } catch (logErr) {
          console.error(
            "[Candidate] logCandidateProfileUpdated error from inline edit:",
            logErr
          );
        }
      }

      console.log("[CandidateSaveDebug] performSave success", {
        candidateId: candidateId,
        updatedEntity: updatedCandidate,
      });
      return { entity: updatedCandidate, haltRedirect: false };
    } catch (err) {
      console.error(
        "[Candidate] updateCandidate exception from inline edit:",
        err
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Unexpected error while saving candidate profile.",
          "candidateInlineEdit"
        );
      }
      return { entity: currentEntity, haltRedirect: true };
    }
  }

  window.CandidateEntityConfig = {
    entityType: "candidate",

    metadata: {
      displayName: "Candidate",
    },

    route: {
      getPageParams: getPageParams,
      navigateToList: navigateToList,
      getViewUrl: getViewUrl,
      getEditUrl: getEditUrl,
    },

    fields: {
      editable: window.CANDIDATE_EDITABLE_FIELDS || null,

      mapping: {
        first_name: {},
        last_name: {},
        position: {},
        email: {},
        phone: {},
        source: {},
        linkedin_url: {},
        address: {},
        summary: {},
        notes: {},

        date_of_birth: {
          parse: window.CandidateParsers.parseDateOfBirth,
          format: window.CandidateParsers.formatDateOfBirth,
        },
      },
    },

    ui: {
      rootId: "candidateProfileRoot",
      toolbarContainerId: "candidateActions",
      activityContainerId: "activity-container",
      statusActionsContainerId: "candidateProfileStatusActions",
      renderMain: renderMain,
      onNotFound: onNotFound,
    },

    lifecycle: {
      getStatus: getStatus,
      archive: archive,
      reopen: reopen,
    },

    mode: {
      apply: applyMode,
    },
    data: {
      loadEntity: loadEntity,
      buildSavePayload: buildSavePayload,
      performSave: performSave,
    },
    save: {
      onSave: onSave,
    },
    related: {
      sections: [
        {
          id: "associated-offers",
          load: loadAssociatedOffersSection,
          render: renderAssociatedOffersSection,
        },
      ],
    },
    // Minimal bulk actions config for candidates (list pages consume selection separately)
    bulkActions: {
      archive: {
        label: "Archive",
      },
      change_status: {
        label: "Change status",
        allowedStatuses: [
          {
            value: "pending_review",
            label:
              (window.IEStatusRuntime &&
                typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
                ? window.IEStatusRuntime.formatProfileStatusLabel("pending_review")
                : "Pending Review"),
          },
          {
            value: "approved",
            label:
              (window.IEStatusRuntime &&
                typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
                ? window.IEStatusRuntime.formatProfileStatusLabel("approved")
                : "Approved"),
          },
          {
            value: "rejected",
            label:
              (window.IEStatusRuntime &&
                typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
                ? window.IEStatusRuntime.formatProfileStatusLabel("rejected")
                : "Rejected"),
          },
        ],
      },
    },
  };
})();

