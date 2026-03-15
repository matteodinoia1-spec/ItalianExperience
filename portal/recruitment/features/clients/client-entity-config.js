;(function () {
  "use strict";

  function getPageParams() {
    if (
      window.IERouter &&
      typeof window.IERouter.getClientPageParams === "function"
    ) {
      return window.IERouter.getClientPageParams();
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
      window.IERouter.navigateTo("clients");
    } else {
      window.location.href = "clients.html";
    }
  }

  function getViewUrl(id) {
    if (!id) {
      return "client.html";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.clientView === "function"
    ) {
      return window.IEPortal.links.clientView(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityViewUrl === "function"
    ) {
      return window.IERouter.getEntityViewUrl("client", id);
    }

    return "client.html?id=" + encodeURIComponent(String(id));
  }

  function getEditUrl(id) {
    if (!id) {
      return "client.html?mode=edit";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.clientEdit === "function"
    ) {
      return window.IEPortal.links.clientEdit(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityEditUrl === "function"
    ) {
      return window.IERouter.getEntityEditUrl("client", id);
    }

    return (
      "client.html?id=" +
      encodeURIComponent(String(id)) +
      "&mode=edit"
    );
  }

  function getStatus(client) {
    if (!client) return null;
    return client.is_archived ? "archived" : "active";
  }

  async function archive(clientId) {
    if (!clientId) return null;
    if (!window.IESupabase || !window.IESupabase.archiveClient) {
      return null;
    }

    var res = await window.IESupabase.archiveClient(clientId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("client", clientId, {
          event_type: "system_event",
          message: "Client archived",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  async function reopen(clientId) {
    if (!clientId) return null;
    if (!window.IESupabase || !window.IESupabase.unarchiveClient) {
      return null;
    }

    var res = await window.IESupabase.unarchiveClient(clientId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("client", clientId, {
          event_type: "system_event",
          message: "Client restored",
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

    if (!window.IESupabase || !window.IESupabase.getClientById) {
      console.error("[Client] IESupabase.getClientById not available");
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Supabase non disponibile per il caricamento del cliente.",
          "clientEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }

    try {
      var result = await window.IESupabase.getClientById(id);
      if (!result || result.error) {
        console.error("[Client] getClientById error:", result && result.error);
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (result &&
              result.error &&
              result.error.message) ||
              "Errore durante il caricamento del cliente.",
            "clientEntityPage"
          );
        }
        return { entity: null, mode: mode };
      }

      return { entity: result.data || null, mode: mode };
    } catch (err) {
      console.error("[Client] getClientById exception:", err);
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il caricamento del cliente.",
          "clientEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }
  }

  function getEditableFieldsFromConfig() {
    var editable =
      window.ClientEntityConfig &&
      window.ClientEntityConfig.fields &&
      Array.isArray(window.ClientEntityConfig.fields.editable)
        ? window.ClientEntityConfig.fields.editable
        : null;

    if (editable && editable.length) {
      return editable.slice();
    }

    return [
      "name",
      "contact_name",
      "email",
      "phone",
      "city",
      "state",
      "country",
      "address",
      "notes",
    ];
  }

  function collectEditableFieldValuesSafe(client, editableFields) {
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
        entity: client || {},
      });
    } catch (err) {
      console.error(
        "[Client] collectEditableFieldValues error from config:",
        err
      );
      rawEdited = {};
    }

    // Only keep fields that actually have a DOM representation to avoid
    // accidentally nulling out server-side columns that are not present
    // on the page.
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
    var client = state.entity || {};

    var editableFields = getEditableFieldsFromConfig();
    var edited = collectEditableFieldValuesSafe(client, editableFields);

    // Build a minimal payload: only fields that are actually editable on
    // this page. Columns without a corresponding DOM field are left
    // untouched in the database by the updateClient implementation.
    var payload = {};

    editableFields.forEach(function (fieldName) {
      if (Object.prototype.hasOwnProperty.call(edited, fieldName)) {
        payload[fieldName] = edited[fieldName];
      } else if (Object.prototype.hasOwnProperty.call(client, fieldName)) {
        payload[fieldName] = client[fieldName];
      }
    });

    return {
      main: payload,
    };
  }

  async function performSave(state, payload) {
    state = state || {};
    payload = payload || {};

    var clientId = state.id;
    var currentEntity = state.entity || {};

    if (!clientId) {
      return { entity: currentEntity, haltRedirect: true };
    }

    if (
      !window.IESupabase ||
      typeof window.IESupabase.updateClient !== "function"
    ) {
      console.error("[Client] IESupabase.updateClient not available");
      return { entity: currentEntity, haltRedirect: true };
    }

    var main = payload.main || {};

    try {
      var result = await window.IESupabase.updateClient(clientId, main);
      if (!result || result.error) {
        console.error(
          "[Client] updateClient error from entity page:",
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
              "Errore durante il salvataggio del cliente.",
            "clientEntityPage"
          );
        }
        return { entity: currentEntity, haltRedirect: true };
      }

      var updatedClient = result.data || currentEntity;
      return { entity: updatedClient, haltRedirect: false };
    } catch (err) {
      console.error(
        "[Client] updateClient exception from entity page:",
        err
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il salvataggio del cliente.",
          "clientEntityPage"
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

    if (typeof window.renderClientCore === "function") {
      window.renderClientCore(entity, id, mode);
    }
  }

  function onNotFound() {
    if (typeof window.renderClientNotFound === "function") {
      window.renderClientNotFound();
      return;
    }

    var rootId = "clientProfileRoot";
    if (
      window.ClientEntityConfig &&
      window.ClientEntityConfig.ui &&
      window.ClientEntityConfig.ui.rootId
    ) {
      rootId = window.ClientEntityConfig.ui.rootId;
    }

    var root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = "";
    var card = document.createElement("section");
    card.className =
      "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";

    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Client not found";

    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested client could not be found or is not accessible.";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to clients";
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

    if (typeof window.applyModeToClientFields === "function") {
      window.applyModeToClientFields(mode, entity);
    }
  }

  window.ClientEntityConfig = {
    entityType: "client",

    metadata: {
      displayName: "Client",
    },

    route: {
      getPageParams: getPageParams,
      getViewUrl: getViewUrl,
      getEditUrl: getEditUrl,
      navigateToList: navigateToList,
    },

    fields: {
      editable: [
        "name",
        "contact_name",
        "email",
        "phone",
        "city",
        "state",
        "country",
        "address",
        "notes",
      ],
    },

    ui: {
      rootId: "clientProfileRoot",
      toolbarContainerId: "clientActions",
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

