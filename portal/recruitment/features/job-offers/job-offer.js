;(function () {
  "use strict";

  var CONFIG = window.JobOfferEntityConfig || null;

  function getEditableFields() {
    if (
      CONFIG &&
      CONFIG.fields &&
      Array.isArray(CONFIG.fields.editable)
    ) {
      return CONFIG.fields.editable.slice();
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

  function renderJobOfferCore(offer, offerId, mode) {
    var rawTitle = safeString(offer.title).trim();
    var title = rawTitle || (mode === "view" ? "Job Title" : "Job Offer");
    var clientName = safeString(offer.client_name || "").trim();

    var headerTitle = title;
    if (clientName) {
      headerTitle = title + " – " + clientName;
    }

    setField("title", offer.title || "");
    setField("position", offer.position || "");
    setField("client_name", clientName || "");
    setField("city", offer.city || "");
    setField("state", offer.state || "");
    setField("contract_type", offer.contract_type || "");

    if (offer.positions != null) {
      setField("positions", String(offer.positions));
    } else {
      setField("positions", "");
    }

    setField("salary", offer.salary || "");

    var deadlineText = "";
    if (offer.deadline) {
      try {
        var d = new Date(offer.deadline);
        if (!Number.isNaN(d.getTime())) {
          deadlineText = d.toLocaleDateString("it-IT");
        }
      } catch (_) {}
    }
    setField("deadline", deadlineText || "");

    // Canonical status: open, inprogress, closed (archived is controlled via lifecycle).
    var normalizedStatus;
    var statusLabel;
    if (
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.normalizeOfferStatus === "function"
    ) {
      normalizedStatus = window.IEStatusRuntime.normalizeOfferStatus(
        offer.status
      );
      if (
        typeof window.IEStatusRuntime.formatOfferStatusLabel === "function"
      ) {
        statusLabel = window.IEStatusRuntime.formatOfferStatusLabel(
          offer.status
        );
      }
    }
    if (!normalizedStatus) {
      var rawStatus = (offer.status || "").toString().toLowerCase().trim();
      if (rawStatus === "active") normalizedStatus = "open";
      else if (rawStatus === "in progress") normalizedStatus = "inprogress";
      else normalizedStatus = rawStatus || "open";
    }
    if (!statusLabel) {
      if (normalizedStatus === "open") statusLabel = "Open";
      else if (normalizedStatus === "inprogress") statusLabel = "In Progress";
      else if (normalizedStatus === "closed") statusLabel = "Closed";
      else if (normalizedStatus === "archived") statusLabel = "Archived";
      else statusLabel = normalizedStatus || "Open";
    }
    var statusSpan = document.querySelector('span.badge[data-field="status"]');
    var statusSelect = document.querySelector('select[data-field="status"]');
    if (statusSpan) statusSpan.textContent = statusLabel;
    if (statusSelect) statusSelect.value = normalizedStatus;

    var badgeNodes = document.querySelectorAll(
      'span.badge[data-field="status"]'
    );
    badgeNodes.forEach(function (el) {
      if (!el || !el.classList) return;
      el.classList.remove("badge-open", "badge-closed", "badge-inprogress");
      if (normalizedStatus === "closed") {
        el.classList.add("badge-closed");
      } else if (normalizedStatus === "inprogress") {
        el.classList.add("badge-inprogress");
      } else {
        el.classList.add("badge-open");
      }
    });
    setField("description", offer.description || "");
    setField("requirements", offer.requirements || "");
    setField("notes", offer.notes || "");

    window.pageMeta = {
      title: headerTitle,
      subtitle: "Job offer",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Job Offers", entity: "job-offers" },
        { label: headerTitle },
      ],
    };

    if (
      window.IEPortal &&
      typeof window.IEPortal.mountPageHeader === "function"
    ) {
      window.IEPortal.mountPageHeader();
    }
  }

  function renderJobOfferNotFound() {
    var rootId =
      (window.JobOfferEntityConfig &&
        window.JobOfferEntityConfig.ui &&
        window.JobOfferEntityConfig.ui.rootId) ||
      "jobOfferProfileRoot";

    var root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = "";
    var card = document.createElement("section");
    card.className =
      "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";

    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Job offer not found";

    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested job offer could not be found or is not accessible.";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to job offers";
    button.addEventListener("click", function () {
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("job-offers");
      } else {
        window.location.href = "job-offers.html";
      }
    });

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  function applyModeToJobOfferFields(mode) {
    var makeEditable = mode === "edit";
    var editableFields = getEditableFields();

    editableFields.forEach(function (field) {
      var nodes = document.querySelectorAll(
        '[data-field="' + field + '"]'
      );
      nodes.forEach(function (el) {
        // Special case: when both a badge and a form control exist for the same
        // field (e.g. status), we toggle their visibility based on mode.
        if (field === "status") {
          if (el.tagName === "SELECT" || el.tagName === "INPUT") {
            if (makeEditable) {
              el.classList.remove("hidden");
            } else if (!el.classList.contains("hidden")) {
              el.classList.add("hidden");
            }
          } else {
            if (makeEditable) {
              el.classList.add("hidden");
            } else {
              el.classList.remove("hidden");
            }
          }
        }

        if ("readOnly" in el) {
          el.readOnly = !makeEditable;
        }
        if ("disabled" in el && (el.tagName === "SELECT" || el.tagName === "INPUT")) {
          // Prefer disabled for selects in view mode.
          el.disabled = !makeEditable && el.tagName === "SELECT";
        }

        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
          if (el.classList) {
            if (makeEditable) {
              el.classList.remove("field-display");
            } else if (!el.classList.contains("field-display")) {
              el.classList.add("field-display");
            }
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

  window.renderJobOfferCore = renderJobOfferCore;
  window.renderJobOfferNotFound = renderJobOfferNotFound;
  window.applyModeToJobOfferFields = applyModeToJobOfferFields;

  document.addEventListener("DOMContentLoaded", function () {
    if (
      window.EntityPageShell &&
      window.JobOfferEntityConfig &&
      typeof window.EntityPageShell.init === "function"
    ) {
      Promise.resolve(
        window.EntityPageShell.init(window.JobOfferEntityConfig)
      ).catch(function (err) {
        console.error("[JobOffer] EntityPageShell.init exception:", err);
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    }
  });
})();

