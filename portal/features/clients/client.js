;(function () {
  "use strict";

  var CONFIG = window.ClientEntityConfig || null;
  var _currentClient = null;

  function getEditableFields() {
    if (
      CONFIG &&
      CONFIG.fields &&
      Array.isArray(CONFIG.fields.editable)
    ) {
      return CONFIG.fields.editable.slice();
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

  function safeString(value) {
    if (
      window.IEEntityFieldMapper &&
      typeof window.IEEntityFieldMapper.safeString === "function"
    ) {
      return window.IEEntityFieldMapper.safeString(value);
    }
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function setField(name, value) {
    if (
      window.IEEntityFieldMapper &&
      typeof window.IEEntityFieldMapper.setField === "function"
    ) {
      window.IEEntityFieldMapper.setField(name, value);
      return;
    }

    var elements = document.querySelectorAll('[data-field="' + name + '"]');
    var text = safeString(value).trim() || "—";
    elements.forEach(function (el) {
      if ("value" in el) {
        el.value = text;
      } else {
        el.textContent = text;
      }
    });
  }

  function renderClientCore(client, clientId, mode) {
    _currentClient = client || null;

    var rawName = safeString(client.name).trim();
    var clientName = rawName || (mode === "view" ? "Client name" : "Client");

    setField("name", clientName);

    setField("contact_name", client.contact_name || "");
    setField("email", client.email || "");
    setField("phone", client.phone || "");
    setField("city", client.city || "");
    setField("state", client.state || "");
    setField("country", client.country || "");
    setField("address", client.address || "");
    setField("notes", client.notes || "");

    window.pageMeta = {
      title: clientName,
      subtitle: "Client profile",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Clients", entity: "clients" },
        { label: clientName },
      ],
    };

    if (
      window.IEPortal &&
      typeof window.IEPortal.mountPageHeader === "function"
    ) {
      window.IEPortal.mountPageHeader();
    }
  }

  function renderClientNotFound() {
    var rootId =
      (window.ClientEntityConfig &&
        window.ClientEntityConfig.ui &&
        window.ClientEntityConfig.ui.rootId) ||
      "clientProfileRoot";

    var root = document.getElementById(rootId);
    if (!root) return;

    if (!root.innerHTML) {
      root.innerHTML = "";
    }

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
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("clients");
      } else {
        window.location.href = "clients.html";
      }
    });

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  function applyModeToClientFields(mode) {
    var makeEditable = mode === "edit";
    var editableFields = getEditableFields();

    editableFields.forEach(function (field) {
      var nodes = document.querySelectorAll(
        '[data-field="' + field + '"]'
      );
      nodes.forEach(function (el) {
        if ("readOnly" in el) {
          el.readOnly = !makeEditable;
        }

        if (el.classList && el.classList.contains("field-display")) {
          if (makeEditable) {
            el.classList.remove("field-display");
          }
        } else if (el.classList && !el.classList.contains("field-display")) {
          if (!makeEditable) {
            el.classList.add("field-display");
          }
        }

        if (makeEditable && "value" in el) {
          var currentValue = safeString(el.value).trim();
          if (currentValue === "—") {
            el.value = "";
          }
        }
      });
    });
  }

  window.renderClientCore = renderClientCore;
  window.renderClientNotFound = renderClientNotFound;
  window.applyModeToClientFields = applyModeToClientFields;

  document.addEventListener("DOMContentLoaded", function () {
    if (
      window.EntityPageShell &&
      window.ClientEntityConfig &&
      typeof window.EntityPageShell.init === "function"
    ) {
      EntityPageShell.init(ClientEntityConfig);
      return;
    }
  });
})();

