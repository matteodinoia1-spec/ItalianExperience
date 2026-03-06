// ============================================================================
// Italian Experience Recruitment Portal - Client Page Runtime
// ----------------------------------------------------------------------------
// Client add/edit/view controller extracted from core/app-shell.js.
// Behavior preserved; app-shell keeps compatibility wrappers.
// ============================================================================

(function () {
  "use strict";

  /**
   * Add/Edit/View client page: create mode (no id), or load client by id and
   * apply lifecycle (edit/view).
   */
  function initAddClientePage() {
    const params = IERouter.getClientPageParams();
    const clientId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#clientForm");
    if (!form) return;

    if (!clientId) {
      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "client",
          entityId: null,
          status: "active",
          mode: "edit",
          containerId: "clientActions",
          formId: "clientForm",
        });
      }
      return;
    }

    if (!window.IESupabase || !window.IESupabase.getClientById) {
      if (window.IESupabase && window.IESupabase.showError)
        window.IESupabase.showError("Supabase non disponibile.");
      return;
    }

    window.IESupabase.getClientById(clientId).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError)
          window.IESupabase.showError(
            result.error.message || "Cliente non trovato."
          );
        return;
      }
      const client = result.data;
      if (!client) {
        if (window.IESupabase.showError) window.IESupabase.showError("Cliente non trovato.");
        return;
      }

      const lifecycleStatus = client.is_archived ? "archived" : "active";
      const effectiveMode = IEToolbar.resolveEntityMode(
        lifecycleStatus,
        requestedMode
      );

      const nameEl = form.querySelector('[name="name"]');
      const cityEl = form.querySelector('[name="city"]');
      const stateEl = form.querySelector('[name="state"]');
      const countryEl = form.querySelector('[name="country"]');
      const emailEl = form.querySelector('[name="email"]');
      const phoneEl = form.querySelector('[name="phone"]');
      const notesEl = form.querySelector('[name="notes"]');
      if (nameEl) nameEl.value = client.name || "";
      if (cityEl) cityEl.value = client.city || "";
      if (stateEl) stateEl.value = client.state || "";
      if (countryEl) countryEl.value = client.country || "";
      if (emailEl) emailEl.value = client.email || "";
      if (phoneEl) phoneEl.value = client.phone || "";
      if (notesEl) notesEl.value = client.notes || "";

      function setFormReadonly(readonly) {
        const fields = form.querySelectorAll("input, textarea, select");
        fields.forEach(function (field) {
          if (field.type === "hidden") return;
          if (field.tagName === "SELECT") {
            field.disabled = !!readonly;
          } else {
            field.readOnly = !!readonly;
            field.disabled = false;
          }
        });
        const saveBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = form.querySelector("[data-edit-cancel]");
        if (saveBtn) {
          saveBtn.style.display = readonly ? "none" : "";
        }
        if (cancelBtn) {
          cancelBtn.textContent = readonly ? "Back" : "Cancel";
        }
      }
      setFormReadonly(effectiveMode === "view");

      var clientHeaderTitle =
        (client.name && String(client.name).trim()) || "Client";
      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = clientHeaderTitle;
      if (docTitleEl)
        docTitleEl.textContent =
          clientHeaderTitle + " | Italian Experience Recruitment";
      window.pageMeta = {
        title: clientHeaderTitle,
        breadcrumbs: [
          { label: "Dashboard", path: "dashboard.html" },
          { label: "Clients", path: "clients.html" },
          { label: clientHeaderTitle },
        ],
      };
      if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
        window.IEPortal.mountPageHeader();
      }

      function onEdit() {
        IERouter.navigateTo(
          "add-client.html?id=" + encodeURIComponent(clientId) + "&mode=edit"
        );
      }
      function onArchive() {
        return window.IESupabase.archiveClient(clientId).then(function (res) {
          if (!res.error) {
            if (
              typeof window !== "undefined" &&
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
            IERouter.navigateTo("clients.html");
          }
        });
      }
      function onReopen() {
        return window.IESupabase.unarchiveClient(clientId).then(function (res) {
          if (!res.error) {
            client.is_archived = false;
            if (
              typeof window !== "undefined" &&
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
            if (typeof renderEntityToolbar === "function") {
              IEToolbar.renderEntityToolbar({
                entityType: "client",
                entityId: clientId,
                status: "active",
                mode: "view",
                containerId: "clientActions",
                formId: "clientForm",
                onEdit: onEdit,
                onArchive: onArchive,
                onReopen: onReopen,
              });
            }
          }
        });
      }

      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "client",
          entityId: clientId,
          status: lifecycleStatus,
          mode: effectiveMode,
          containerId: "clientActions",
          formId: "clientForm",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
        });
      }

      var existingClientMeta = document.getElementById("clientMetadata");
      if (existingClientMeta && existingClientMeta.parentNode) {
        existingClientMeta.parentNode.removeChild(existingClientMeta);
      }

      var metadataContainer = document.createElement("div");
      metadataContainer.id = "clientMetadata";
      if (form && form.parentNode) {
        form.parentNode.appendChild(metadataContainer);
      }
      if (window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
        metadataContainer.innerHTML = window.IEPortal.renderEntityMetadata(client);
      } else {
        metadataContainer.innerHTML = "";
      }

      if (
        window.IEAssociationsRuntime &&
        typeof window.IEAssociationsRuntime.renderClientPositionsSection === "function"
      ) {
        window.IEAssociationsRuntime.renderClientPositionsSection({
          clientId: clientId,
          client: client,
          mode: effectiveMode,
          isArchived: !!client.is_archived,
          insertAfterEl: metadataContainer,
        });
      }

      if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
        window.ActivitySection.init({
          entityType: "client",
          entityId: clientId,
          container: document.getElementById("activity-container"),
        });
      }
    });
  }

  function initClientPage() {
    initAddClientePage();
  }

  window.IEClientRuntime = {
    initClientPage: initClientPage,
  };
})();

