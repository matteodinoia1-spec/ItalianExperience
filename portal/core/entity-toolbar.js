function normalizeStatus(status) {
  const s = (status || "active").toString().toLowerCase();
  if (s === "open" || s === "inprogress" || s === "active") return "active";
  if (s === "closed") return "closed";
  if (s === "archived") return "archived";
  return "active";
}

function resolveEntityMode(status, requestedMode) {
  var normalizedStatus = normalizeStatus(status);
  if (normalizedStatus !== "active") return "view";
  return requestedMode;
}

function renderLifecycleActions(config) {
  var container = config.containerId ? document.getElementById(config.containerId) : null;
  if (!container) return;
  container.innerHTML = "";

  if (config.mode !== "view") {
    return;
  }
  if (!config.entityId) return;

  var normalizedStatus = normalizeStatus(config.status);

  var editBtn, closeBtn, reopenBtn, archiveBtn;
  var btnClass = "ie-btn ie-btn-secondary";
  var archiveBtnClass = "ie-btn ie-btn-danger";

  if (normalizedStatus === "active") {
    if (config.onEdit) {
      editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.className = btnClass;
      editBtn.addEventListener("click", function () {
        config.onEdit();
      });
      container.appendChild(editBtn);
    }
    if (config.entityType === "job_offer" && config.onClose) {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "Mark as Closed";
      closeBtn.className = btnClass;
      closeBtn.addEventListener("click", async function () {
        await config.onClose();
      });
      container.appendChild(closeBtn);
    }
    if (config.onArchive) {
      archiveBtn = document.createElement("button");
      archiveBtn.type = "button";
      archiveBtn.textContent = "Archive";
      archiveBtn.className = archiveBtnClass;
      archiveBtn.addEventListener("click", async function () {
        await config.onArchive();
      });
      container.appendChild(archiveBtn);
    }
  } else if (normalizedStatus === "closed") {
    if (config.onReopen) {
      reopenBtn = document.createElement("button");
      reopenBtn.type = "button";
      reopenBtn.textContent = "Reopen";
      reopenBtn.className = btnClass;
      reopenBtn.addEventListener("click", async function () {
        await config.onReopen();
      });
      container.appendChild(reopenBtn);
    }
    if (config.onArchive) {
      archiveBtn = document.createElement("button");
      archiveBtn.type = "button";
      archiveBtn.textContent = "Archive";
      archiveBtn.className = archiveBtnClass;
      archiveBtn.addEventListener("click", async function () {
        await config.onArchive();
      });
      container.appendChild(archiveBtn);
    }
  } else if (normalizedStatus === "archived") {
    if (config.onReopen) {
      reopenBtn = document.createElement("button");
      reopenBtn.type = "button";
      reopenBtn.textContent = "Reopen";
      reopenBtn.className = btnClass;
      reopenBtn.addEventListener("click", async function () {
        await config.onReopen();
      });
      container.appendChild(reopenBtn);
    }
  }
}

function getEntityViewUrl(entityType, entityId) {
  var type = (entityType || "").toString();
  var hasId = entityId !== null && entityId !== undefined && String(entityId) !== "";

  if (typeof window !== "undefined" && window.IEPortal && window.IEPortal.links) {
    var links = window.IEPortal.links;
    if (type === "candidate" && hasId && typeof links.candidateView === "function") {
      return links.candidateView(entityId);
    }
    if (type === "job-offer" && hasId && typeof links.offerView === "function") {
      return links.offerView(entityId);
    }
    if (type === "client" && hasId && typeof links.clientView === "function") {
      return links.clientView(entityId);
    }
  }

  if (type === "candidate") {
    return hasId
      ? "candidate.html?id=" + encodeURIComponent(String(entityId))
      : "candidates.html";
  }
  if (type === "job-offer") {
    return hasId
      ? "add-job-offer.html?id=" + encodeURIComponent(String(entityId)) + "&mode=view"
      : "job-offers.html";
  }
  if (type === "client") {
    return hasId
      ? "add-client.html?id=" +
          encodeURIComponent(String(entityId)) +
          "&mode=view"
      : "clients.html";
  }

  return null;
}

function renderEntityToolbar(config) {
  if (!config || !config.containerId) return;
  var container = document.getElementById(config.containerId);
  if (!container) {
    console.warn("Toolbar container not found:", config.containerId);
    return;
  }

  container.innerHTML = "";

  var rawMode = (config.mode || "view").toString().toLowerCase();
  var mode = rawMode === "edit" || rawMode === "create" ? "edit" : "view";
  var status = normalizeStatus(config.status || "active");

  var entityType = config.entityType;
  var entityId = config.entityId;

  function defaultEdit() {
    if (entityId === null || entityId === undefined || entityId === "") return;

    var editLinks =
      typeof window !== "undefined" &&
      window.IEPortal &&
      window.IEPortal.links
        ? window.IEPortal.links
        : null;

    if (!editLinks) return;

    if (entityType === "candidate" && typeof editLinks.candidateEdit === "function") {
      navigateTo(editLinks.candidateEdit(entityId));
    }

    if (entityType === "client" && typeof editLinks.clientEdit === "function") {
      navigateTo(editLinks.clientEdit(entityId));
    }

    if (entityType === "job-offer" && typeof editLinks.offerEdit === "function") {
      navigateTo(editLinks.offerEdit(entityId));
    }
  }

  if (mode === "edit") {
    var form = config.formId ? document.getElementById(config.formId) : null;

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "ie-btn ie-btn-secondary";
    cancelBtn.addEventListener("click", function () {
      if (typeof config.onCancel === "function") {
        config.onCancel();
        return;
      }
      var targetUrl = getEntityViewUrl(config.entityType, config.entityId);
      if (targetUrl) {
        navigateTo(targetUrl);
      }
    });
    container.appendChild(cancelBtn);

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.className = "ie-btn ie-btn-primary ml-2";
    saveBtn.addEventListener("click", function () {
      if (typeof config.onSave === "function") {
        config.onSave();
        return;
      }
      if (!form) return;
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        var defaultSubmit =
          form.querySelector('button[type="submit"], input[type="submit"]');
        if (defaultSubmit && typeof defaultSubmit.click === "function") {
          defaultSubmit.click();
        } else {
          form.submit();
        }
      }
    });
    container.appendChild(saveBtn);

    return;
  }

  renderLifecycleActions({
    entityType: config.entityType === "job-offer" ? "job_offer" : config.entityType,
    entityId: config.entityId,
    status: status,
    mode: "view",
    containerId: config.containerId,
    onEdit: config.onEdit || defaultEdit,
    onClose: config.onClose,
    onArchive: config.onArchive,
    onReopen: config.onReopen,
  });
}

window.IEToolbar = window.IEToolbar || {};
window.IEToolbar.normalizeStatus = normalizeStatus;
window.IEToolbar.resolveEntityMode = resolveEntityMode;
window.IEToolbar.renderLifecycleActions = renderLifecycleActions;
window.IEToolbar.renderEntityToolbar = renderEntityToolbar;
window.IEToolbar.getEntityViewUrl = getEntityViewUrl;

window.normalizeStatus = normalizeStatus;

