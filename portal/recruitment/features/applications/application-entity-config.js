;(function () {
  "use strict";

  function getPageParams() {
    var search = new URLSearchParams(window.location.search || "");
    var rawId = search.get("id");
    var id = rawId ? rawId.toString() : null;
    var rawMode = (search.get("mode") || "").toString().toLowerCase();
    var mode = rawMode === "edit" ? "edit" : "view";
    return { id: id, mode: mode };
  }

  function navigateToList() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("applications.html");
    } else {
      window.location.href = "applications.html";
    }
  }

  function getViewUrl(id) {
    if (!id) {
      return "application.html";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.applicationView === "function"
    ) {
      return window.IEPortal.links.applicationView(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityViewUrl === "function"
    ) {
      return window.IERouter.getEntityViewUrl("application", id);
    }

    return "application.html?id=" + encodeURIComponent(String(id));
  }

  function getEditUrl(id) {
    if (!id) {
      return "application.html?mode=edit";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.applicationEdit === "function"
    ) {
      return window.IEPortal.links.applicationEdit(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityEditUrl === "function"
    ) {
      return window.IERouter.getEntityEditUrl("application", id);
    }

    return (
      "application.html?id=" +
      encodeURIComponent(String(id)) +
      "&mode=edit"
    );
  }

  function getStatus(application) {
    if (!application) return null;
    var raw = (application.status || "").toString().toLowerCase();
    if (raw === "withdrawn") return "archived";
    return "active";
  }

  async function archive(applicationId) {
    if (!applicationId) return null;
    if (
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.updateApplicationStatus !==
        "function"
    ) {
      console.error(
        "[ApplicationEntityConfig] IEQueries.applications.updateApplicationStatus not available"
      );
      return null;
    }

    var res = await window.IEQueries.applications.updateApplicationStatus(
      applicationId,
      "withdrawn",
      {}
    );
    if (res && res.error) {
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          res.error.message ||
            "Errore durante l'archiviazione della candidatura.",
          "applicationEntityPage"
        );
      }
    }
    return res || null;
  }

  async function reopen(applicationId) {
    if (!applicationId) return null;
    if (
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.updateApplicationStatus !==
        "function"
    ) {
      console.error(
        "[ApplicationEntityConfig] IEQueries.applications.updateApplicationStatus not available"
      );
      return null;
    }

    var res = await window.IEQueries.applications.updateApplicationStatus(
      applicationId,
      "applied",
      {}
    );
    if (res && res.error) {
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          res.error.message ||
            "Errore durante il ripristino della candidatura.",
          "applicationEntityPage"
        );
      }
    }
    return res || null;
  }

  async function loadEntity(args) {
    args = args || {};
    var id = args.id;
    var mode = args.mode || "view";

    try {
      console.log("[ApplicationHydrationDebug] loadEntity invoked", {
        id: id,
        mode: mode,
      });
    } catch (_) {}

    if (!id) {
      return { entity: null, mode: mode };
    }

    if (
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.getApplicationById !== "function"
    ) {
      console.error(
        "[ApplicationEntityConfig] IEQueries.applications.getApplicationById not available"
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Impossibile caricare la candidatura.",
          "applicationEntityPage"
        );
      }
      try {
        console.log(
          "[ApplicationHydrationDebug] loadEntity missing IEQueries.applications.getApplicationById",
          {
            id: id,
            mode: mode,
          }
        );
      } catch (_) {}
      return { entity: null, mode: mode };
    }

    try {
      var result = await window.IEQueries.applications.getApplicationById(id);
      if (!result || result.error) {
        console.error(
          "[ApplicationEntityConfig] getApplicationById error:",
          result && result.error
        );
        try {
          console.log("[ApplicationHydrationDebug] loadEntity error result", {
            id: id,
            mode: mode,
            error: result && result.error,
          });
        } catch (_) {}
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (result &&
              result.error &&
              result.error.message) ||
              "Errore durante il caricamento della candidatura.",
            "applicationEntityPage"
          );
        }
        return { entity: null, mode: mode };
      }

      try {
        console.log("[ApplicationHydrationDebug] loadEntity success", {
          id: id,
          mode: mode,
          application: result && result.data,
        });
      } catch (_) {}

      return { entity: result.data || null, mode: mode };
    } catch (err) {
      console.error(
        "[ApplicationEntityConfig] getApplicationById exception:",
        err
      );
      try {
        console.log("[ApplicationHydrationDebug] loadEntity exception", {
          id: id,
          mode: mode,
          error: err,
        });
      } catch (_) {}
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il caricamento della candidatura.",
          "applicationEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }
  }

  function getEditableFields() {
    var config = window.ApplicationEntityConfig;
    if (
      config &&
      config.fields &&
      Array.isArray(config.fields.editable)
    ) {
      return config.fields.editable.slice();
    }
    return ["notes", "rejection_reason"];
  }

  function collectEditableFieldValuesSafe(application, editableFields) {
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
        entity: application || {},
      });
    } catch (err) {
      console.error(
        "[ApplicationEntityConfig] collectEditableFieldValues error:",
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
    var application = state.entity || {};

    var editableFields = getEditableFields();
    var edited = collectEditableFieldValuesSafe(application, editableFields);

    var payload = {};

    editableFields.forEach(function (fieldName) {
      if (Object.prototype.hasOwnProperty.call(edited, fieldName)) {
        payload[fieldName] = edited[fieldName];
      } else if (
        Object.prototype.hasOwnProperty.call(application, fieldName)
      ) {
        payload[fieldName] = application[fieldName];
      }
    });

    return {
      main: payload,
    };
  }

  async function performSave(state, payload) {
    state = state || {};
    payload = payload || {};

    var applicationId = state.id;
    var currentEntity = state.entity || {};

    if (!applicationId) {
      return { entity: currentEntity, haltRedirect: true };
    }

    if (
      !window.IESupabase ||
      !window.IESupabase.supabase
    ) {
      console.error(
        "[ApplicationEntityConfig] IESupabase.supabase not available"
      );
      return { entity: currentEntity, haltRedirect: true };
    }

    var main = payload.main || {};
    var supabase = window.IESupabase.supabase;

    try {
      var updateResult = await supabase
        .from("candidate_job_associations")
        .update({
          notes:
            Object.prototype.hasOwnProperty.call(main, "notes")
              ? main.notes
              : currentEntity.notes || null,
          rejection_reason:
            Object.prototype.hasOwnProperty.call(main, "rejection_reason")
              ? main.rejection_reason
              : currentEntity.rejection_reason || null,
        })
        .eq("id", applicationId)
        .select()
        .single();

      if (updateResult.error) {
        console.error(
          "[ApplicationEntityConfig] update application error:",
          updateResult.error
        );
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            updateResult.error.message ||
              "Errore durante il salvataggio della candidatura.",
            "applicationEntityPage"
          );
        }
        return { entity: currentEntity, haltRedirect: true };
      }

      var refreshed = currentEntity;
      try {
        if (
          window.IEQueries &&
          window.IEQueries.applications &&
          typeof window.IEQueries.applications.getApplicationById ===
            "function"
        ) {
          var refreshedResult =
            await window.IEQueries.applications.getApplicationById(
              applicationId
            );
          if (!refreshedResult.error && refreshedResult.data) {
            refreshed = refreshedResult.data;
          }
        }
      } catch (refreshErr) {
        console.warn(
          "[ApplicationEntityConfig] getApplicationById after save failed:",
          refreshErr
        );
        refreshed = Object.assign({}, currentEntity, updateResult.data || {});
      }

      return { entity: refreshed, haltRedirect: false };
    } catch (err) {
      console.error(
        "[ApplicationEntityConfig] performSave exception:",
        err
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il salvataggio della candidatura.",
          "applicationEntityPage"
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

    if (typeof window.renderApplicationCore === "function") {
      window.renderApplicationCore(entity, id, mode);
    }
  }

  function onNotFound() {
    if (typeof window.renderApplicationNotFound === "function") {
      window.renderApplicationNotFound();
      return;
    }

    var rootId =
      (window.ApplicationEntityConfig &&
        window.ApplicationEntityConfig.ui &&
        window.ApplicationEntityConfig.ui.rootId) ||
      "applicationProfileRoot";

    var root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = "";
    var card = document.createElement("section");
    card.className =
      "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";

    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Application not found";

    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested application could not be found or is not accessible.";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to applications";
    button.addEventListener("click", function () {
      navigateToList();
    });

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  function applyMode(mode, context) {
    if (!mode) return;
    var entity = context && context.entity ? context.entity : null;

    if (typeof window.applyModeToApplicationFields === "function") {
      window.applyModeToApplicationFields(mode, entity);
    }
  }

  window.ApplicationEntityConfig = {
    entityType: "application",

    metadata: {
      displayName: "Application",
    },

    route: {
      getPageParams: getPageParams,
      getViewUrl: getViewUrl,
      getEditUrl: getEditUrl,
      navigateToList: navigateToList,
    },

    fields: {
      editable: ["notes", "rejection_reason"],
    },

    ui: {
      rootId: "applicationProfileRoot",
      toolbarContainerId: "applicationActions",
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

