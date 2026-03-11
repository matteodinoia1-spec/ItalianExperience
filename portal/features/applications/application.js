;(function () {
  "use strict";

  var CONFIG = window.ApplicationEntityConfig || null;

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

  function formatDate(value) {
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function normalizeStatus(value) {
    var s = (value || "").toString().toLowerCase();
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
  }

  function applyPipelineHighlight(currentStatus) {
    var container = document.querySelector("[data-app-pipeline]");
    if (!container) return;
    var s = normalizeStatus(currentStatus);
    container
      .querySelectorAll("[data-stage]")
      .forEach(function (el) {
        var stage = el.getAttribute("data-stage");
        if (stage === s) {
          el.classList.remove(
            "border-gray-200",
            "text-gray-600",
            "bg-transparent"
          );
          el.classList.add(
            "border-emerald-200",
            "bg-emerald-50",
            "text-emerald-800"
          );
        } else {
          el.classList.remove(
            "border-emerald-200",
            "bg-emerald-50",
            "text-emerald-800"
          );
          el.classList.add("border-gray-200", "text-gray-600");
        }
      });
  }

  function renderApplicationCore(application, applicationId, mode) {
    var app = application || {};
    var id = applicationId;
    var effectiveMode = mode || "view";

    // Header fields
    var candidateName = app.candidate_name || "—";
    var offerTitle = app.job_offer_title || "—";
    var clientName = app.client_name || "—";

    setField("candidate_name", candidateName);
    setField("job_offer_title", offerTitle);
    setField("client_name", clientName);

    // Root-level data fields for summary cards
    setField("candidate_position", app.candidate_position || "");
    setField("candidate_location", app.candidate_location || "");
    setField("job_offer_position", app.job_offer_position || "");

    // Notes & rejection reason (editable via entity toolbar)
    setField("notes", app.notes || "");
    setField("rejection_reason", app.rejection_reason || "");

    // Dates
    setField("created_at", formatDate(app.created_at));
    setField("updated_at", formatDate(app.updated_at || app.created_at));

    // Page meta + header
    var pageTitle = candidateName !== "—" ? candidateName : "Application";
    window.pageMeta = {
      title: pageTitle,
      subtitle: "Application details",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Applications", entity: "applications" },
        { label: pageTitle },
      ],
    };
    if (
      window.IEPortal &&
      typeof window.IEPortal.mountPageHeader === "function"
    ) {
      window.IEPortal.mountPageHeader();
    }

    // Header labels (legacy data-app-* bindings)
    var headerCandidate = document.querySelector("[data-app-candidate]");
    var headerOffer = document.querySelector("[data-app-offer]");
    var headerClient = document.querySelector("[data-app-client]");
    if (headerCandidate) headerCandidate.textContent = candidateName;
    if (headerOffer) headerOffer.textContent = offerTitle;
    if (headerClient) headerClient.textContent = clientName;

    // Candidate / offer / client links
    var candidateLink = document.querySelector("[data-app-candidate-link]");
    if (candidateLink && app.candidate_id) {
      var cHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.candidateView === "function"
          ? window.IEPortal.links.candidateView(app.candidate_id)
          : "candidate.html?id=" +
            encodeURIComponent(String(app.candidate_id));
      candidateLink.href = cHref;
      candidateLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(cHref);
        }
      });
    }

    var offerLink = document.querySelector("[data-app-offer-link]");
    if (offerLink && app.job_offer_id) {
      var oHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.offerView === "function"
          ? window.IEPortal.links.offerView(app.job_offer_id)
          : "job-offer.html?id=" +
            encodeURIComponent(String(app.job_offer_id)) +
            "&mode=view";
      offerLink.href = oHref;
      offerLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(oHref);
        }
      });
    }

    var clientLink = document.querySelector("[data-app-client-link]");
    if (clientLink && app.client_id) {
      var clHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.clientView === "function"
          ? window.IEPortal.links.clientView(app.client_id)
          : "client.html?id=" +
            encodeURIComponent(String(app.client_id)) +
            "&mode=view";
      clientLink.href = clHref;
      clientLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(clHref);
        }
      });
    }

    // Candidate notes from related entities
    var candidateNotesEl = document.querySelector("[data-app-notes-candidate]");
    var offerNotesEl = document.querySelector("[data-app-notes-offer]");
    var clientNotesEl = document.querySelector("[data-app-notes-client]");
    function normalizeNotes(value) {
      if (value === null || value === undefined) return "—";
      var text = String(value).trim();
      return text || "—";
    }
    if (candidateNotesEl) {
      candidateNotesEl.textContent = normalizeNotes(app.candidate_notes);
    }
    if (offerNotesEl) {
      offerNotesEl.textContent = normalizeNotes(app.job_offer_notes);
    }
    if (clientNotesEl) {
      clientNotesEl.textContent = normalizeNotes(app.client_notes);
    }

    // Pipeline + status select (view-only pipeline; dropdown remains live)
    var statusSelect = document.querySelector("[data-app-status-select]");
    var statusError = document.querySelector("[data-app-status-error]");
    var currentStatus = normalizeStatus(app.status || "applied");

    if (statusSelect) {
      statusSelect.value = currentStatus;
    }
    applyPipelineHighlight(currentStatus);

    if (
      statusSelect &&
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.updateApplicationStatus ===
        "function"
    ) {
      statusSelect.addEventListener("change", function () {
        var nextStatus = normalizeStatus(statusSelect.value || "");
        statusSelect.disabled = true;
        if (statusError) {
          statusError.classList.add("hidden");
          statusError.textContent = "";
        }
        window.IEQueries.applications
          .updateApplicationStatus(app.id, nextStatus, {})
          .then(function (res) {
            if (res.error) {
              console.error(
                "[Application] updateApplicationStatus error:",
                res.error
              );
              if (statusError) {
                statusError.textContent =
                  res.error.message ||
                  "Error updating status. Please try again.";
                statusError.classList.remove("hidden");
              }
              statusSelect.value = currentStatus;
              return;
            }
            currentStatus = nextStatus;
            applyPipelineHighlight(currentStatus);
          })
          .catch(function (err) {
            console.error(
              "[Application] updateApplicationStatus exception:",
              err
            );
            if (statusError) {
              statusError.textContent =
                "Error updating status. Please try again.";
              statusError.classList.remove("hidden");
            }
            statusSelect.value = currentStatus;
          })
          .finally(function () {
            statusSelect.disabled = false;
          });
      });
    }

    // Candidate summary: experience / skills / languages
    try {
      if (typeof window.hydrateCandidateSummary === "function") {
        window.hydrateCandidateSummary(app);
      }
    } catch (e1) {
      console.error("[Application] hydrateCandidateSummary error:", e1);
    }

    // Job offer summary: salary + hired count
    try {
      if (typeof window.hydrateJobOfferSummary === "function") {
        window.hydrateJobOfferSummary(app);
      }
    } catch (e2) {
      console.error("[Application] hydrateJobOfferSummary error:", e2);
    }
  }

  function renderApplicationNotFound() {
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
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("applications.html");
      } else {
        window.location.href = "applications.html";
      }
    });
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  function applyModeToApplicationFields(mode) {
    var makeEditable = mode === "edit";
    var editableFields =
      (CONFIG &&
        CONFIG.fields &&
        Array.isArray(CONFIG.fields.editable) &&
        CONFIG.fields.editable.slice()) ||
      ["notes", "rejection_reason"];

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

  window.renderApplicationCore = renderApplicationCore;
  window.renderApplicationNotFound = renderApplicationNotFound;
  window.applyModeToApplicationFields = applyModeToApplicationFields;

  document.addEventListener("DOMContentLoaded", function () {
    if (
      window.EntityPageShell &&
      window.ApplicationEntityConfig &&
      typeof window.EntityPageShell.init === "function"
    ) {
      Promise.resolve(
        window.EntityPageShell.init(window.ApplicationEntityConfig)
      ).catch(function (err) {
        console.error("[Application] EntityPageShell.init exception:", err);
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    }
  });
})();

