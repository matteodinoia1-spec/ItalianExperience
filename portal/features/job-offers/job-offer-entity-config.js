;(function () {
  "use strict";

  function getPageParams() {
    if (
      window.IERouter &&
      typeof window.IERouter.getJobOfferPageParams === "function"
    ) {
      return window.IERouter.getJobOfferPageParams();
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
      window.IERouter.navigateTo("job-offers");
    } else {
      window.location.href = "job-offers.html";
    }
  }

  function getViewUrl(id) {
    if (!id) {
      return "job-offer.html";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerView === "function"
    ) {
      return window.IEPortal.links.offerView(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityViewUrl === "function"
    ) {
      return window.IERouter.getEntityViewUrl("jobOffer", id);
    }

    return (
      "job-offer.html?id=" +
      encodeURIComponent(String(id || "")) +
      "&mode=view"
    );
  }

  function getEditUrl(id) {
    if (!id) {
      return "job-offer.html?mode=edit";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerEdit === "function"
    ) {
      return window.IEPortal.links.offerEdit(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityEditUrl === "function"
    ) {
      return window.IERouter.getEntityEditUrl("jobOffer", id);
    }

    return (
      "job-offer.html?id=" +
      encodeURIComponent(String(id || "")) +
      "&mode=edit"
    );
  }

  function getStatus(offer) {
    if (!offer) return null;
    // Lifecycle toolbar status is based on archive flag,
    // not the business pipeline status field.
    return offer.is_archived ? "archived" : "active";
  }

  async function archive(jobOfferId) {
    if (!jobOfferId) return null;
    if (!window.IESupabase || !window.IESupabase.archiveJobOffer) {
      return null;
    }

    var res = await window.IESupabase.archiveJobOffer(jobOfferId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("job_offer", jobOfferId, {
          event_type: "system_event",
          message: "Job offer archived",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  async function reopen(jobOfferId) {
    if (!jobOfferId) return null;
    if (!window.IESupabase || !window.IESupabase.unarchiveJobOffer) {
      return null;
    }

    var res = await window.IESupabase.unarchiveJobOffer(jobOfferId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("job_offer", jobOfferId, {
          event_type: "system_event",
          message: "Job offer restored",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  async function loadEntity(args) {
    args = args || {};
    var id = args.id;
    var mode = args.mode || "view";

    if (!id) {
      return { entity: null, mode: mode };
    }

    if (!window.IESupabase || !window.IESupabase.getJobOfferById) {
      console.error("[JobOffer] IESupabase.getJobOfferById not available");
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Supabase non disponibile per il caricamento dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }

    try {
      var result = await window.IESupabase.getJobOfferById(id);
      if (!result || result.error) {
        console.error(
          "[JobOffer] getJobOfferById error:",
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
              "Errore durante il caricamento dell'offerta.",
            "jobOfferEntityPage"
          );
        }
        return { entity: null, mode: mode };
      }

      var offer = result.data || null;

      // Best-effort enrichment for UI: the job_offers detail query returns "*"
      // and may not include a joined client name, while list queries do.
      // If the record only has client_id, fetch the client to display name.
      try {
        if (
          offer &&
          !offer.client_name &&
          offer.client_id &&
          window.IESupabase &&
          typeof window.IESupabase.getClientById === "function"
        ) {
          // eslint-disable-next-line no-await-in-loop
          var clientRes = await window.IESupabase.getClientById(offer.client_id);
          if (clientRes && !clientRes.error && clientRes.data) {
            offer = Object.assign({}, offer, {
              client_name: clientRes.data.name || offer.client_name || null,
            });
          }
        }
      } catch (enrichErr) {
        console.warn("[JobOffer] client enrichment skipped:", enrichErr);
      }

      return { entity: offer, mode: mode };
    } catch (err) {
      console.error("[JobOffer] getJobOfferById exception:", err);
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il caricamento dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }
  }

  function getEditableFieldsFromConfig() {
    var editable =
      window.JobOfferEntityConfig &&
      window.JobOfferEntityConfig.fields &&
      Array.isArray(window.JobOfferEntityConfig.fields.editable)
        ? window.JobOfferEntityConfig.fields.editable
        : null;

    if (editable && editable.length) {
      return editable.slice();
    }

    return [
      "title",
      "position",
      "city",
      "state",
      "contract_type",
      "positions",
      "salary",
      "deadline",
      "status",
      "description",
      "requirements",
      "notes",
    ];
  }

  function parseDeadlineValue(value, ctx) {
    if (!value) {
      return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
    }

    var str = value.toString().trim();
    if (!str || str === "—") {
      return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
    }

    // Accept ISO date (YYYY-MM-DD) and keep it.
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Accept Italian-style dates shown in view mode (DD/MM/YYYY).
    var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      var day = match[1].padStart(2, "0");
      var month = match[2].padStart(2, "0");
      var year = match[3];
      return year + "-" + month + "-" + day;
    }

    // Fallback: preserve existing stored deadline if parsing fails.
    return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
  }

  function collectEditableFieldValuesSafe(offer, editableFields) {
    if (
      !window.IEEntityFieldMapper ||
      typeof window.IEEntityFieldMapper.collectEditableFieldValues !==
        "function"
    ) {
      return {};
    }

    var rawEdited = {};
    try {
      rawEdited = window.IEEntityFieldMapper.collectEditableFieldValues({
        editableFields: editableFields,
        entity: offer || {},
        fieldParsers: {
          positions: function (value) {
            if (!value) return null;
            var n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return null;
            return n;
          },
          deadline: parseDeadlineValue,
        },
      });
    } catch (err) {
      console.error(
        "[JobOffer] collectEditableFieldValues error from config:",
        err
      );
      rawEdited = {};
    }

    var edited = {};
    editableFields.forEach(function (fieldName) {
      var nodes = document.querySelectorAll(
        '[data-field="' + fieldName + '"]'
      );
      if (!nodes || !nodes.length) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(rawEdited, fieldName)) {
        edited[fieldName] = rawEdited[fieldName];
      }
    });

    return edited;
  }

  function buildSavePayload(state) {
    state = state || {};
    var offer = state.entity || {};

    var editableFields = getEditableFieldsFromConfig();
    var edited = collectEditableFieldValuesSafe(offer, editableFields);

    // IMPORTANT:
    // The real `IEData.jobOffers.updateJobOffer()` treats missing fields as null
    // (e.g. `client_id: payload.client_id ?? null`), so we must always preserve
    // non-editable but required columns, otherwise saving would accidentally
    // wipe them out.
    var payload = {
      client_id: offer.client_id ?? null,
    };

    editableFields.forEach(function (fieldName) {
      if (Object.prototype.hasOwnProperty.call(edited, fieldName)) {
        payload[fieldName] = edited[fieldName];
      } else if (Object.prototype.hasOwnProperty.call(offer, fieldName)) {
        payload[fieldName] = offer[fieldName];
      } else {
        // When the entity lacks a value and the field is present in the UI,
        // explicitly send null to avoid "undefined -> null" surprises inside
        // updateJobOffer, while keeping the payload shape predictable.
        payload[fieldName] = null;
      }
    });

    return {
      main: payload,
    };
  }

  async function performSave(state, payload) {
    state = state || {};
    payload = payload || {};

    var jobOfferId = state.id;
    var currentEntity = state.entity || {};

    if (!jobOfferId) {
      return { entity: currentEntity, haltRedirect: true };
    }

    if (
      !window.IESupabase ||
      typeof window.IESupabase.updateJobOffer !== "function"
    ) {
      console.error("[JobOffer] IESupabase.updateJobOffer not available");
      return { entity: currentEntity, haltRedirect: true };
    }

    var main = payload.main || {};

    try {
      var result = await window.IESupabase.updateJobOffer(jobOfferId, main);
      if (!result || result.error) {
        console.error(
          "[JobOffer] updateJobOffer error from entity page:",
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
              "Errore durante il salvataggio dell'offerta.",
            "jobOfferEntityPage"
          );
        }
        return { entity: currentEntity, haltRedirect: true };
      }

      var updatedOffer = result.data || currentEntity;
      return { entity: updatedOffer, haltRedirect: false };
    } catch (err) {
      console.error(
        "[JobOffer] updateJobOffer exception from entity page:",
        err
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il salvataggio dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: currentEntity, haltRedirect: true };
    }
  }

  function renderMain(options) {
    options = options || {};
    var entity = options.entity || null;
    var id = options.id;
    var mode = options.mode || "view";

    if (!entity || !id) return;

    if (typeof window.renderJobOfferCore === "function") {
      window.renderJobOfferCore(entity, id, mode);
    }
  }

  function onNotFound() {
    if (typeof window.renderJobOfferNotFound === "function") {
      window.renderJobOfferNotFound();
      return;
    }
  }

  function applyMode(mode, context) {
    if (!mode) return;
    var entity = context && context.entity ? context.entity : null;

    if (typeof window.applyModeToJobOfferFields === "function") {
      window.applyModeToJobOfferFields(mode, entity);
    }
  }

  window.JobOfferEntityConfig = {
    entityType: "job_offer",

    metadata: {
      displayName: "Job Offer",
    },

    route: {
      getPageParams: getPageParams,
      getViewUrl: getViewUrl,
      getEditUrl: getEditUrl,
      navigateToList: navigateToList,
    },

    fields: {
      editable: [
        "title",
        "position",
        "city",
        "state",
        "contract_type",
        "positions",
        "salary",
        "deadline",
        "status",
        "description",
        "requirements",
        "notes",
      ],
    },

    ui: {
      rootId: "jobOfferProfileRoot",
      toolbarContainerId: "jobOfferActions",
      activityContainerId: "activity-container",
      renderMain: renderMain,
      onNotFound: onNotFound,
    },

    lifecycle: {
      getStatus: getStatus,
      archive: archive,
      reopen: reopen,
    },

    data: {
      loadEntity: loadEntity,
      buildSavePayload: buildSavePayload,
      performSave: performSave,
    },

    mode: {
      apply: applyMode,
    },
  };
})();

