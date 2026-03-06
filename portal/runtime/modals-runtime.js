// ============================================================================
// Italian Experience Recruitment Portal - Modals Runtime
// ----------------------------------------------------------------------------
// Centralizes modal and preview orchestration:
// - Candidate & job offer creation modals
// - Entity preview (candidate row modal, job offer preview modal)
// - Candidate CV preview
// - Global click handlers for preview buttons
//
// UI primitives are implemented in:
// - core/ui/modals.js        (window.IEPortal.ui.openModal/closeModal)
// - core/ui/previews.js      (window.IEPortal.ui.openJobOfferPreviewModal)
//
// This runtime coordinates those helpers without changing their behavior.
// ============================================================================

(function () {
  "use strict";

  var hasInitializedGlobalModals = false;

  function openModal(config) {
    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.openModal === "function"
    ) {
      window.IEPortal.ui.openModal(config);
    }
  }

  function closeModal() {
    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.closeModal === "function"
    ) {
      window.IEPortal.ui.closeModal();
    }
  }

  function renderModalLoading() {
    return (
      '<div class="ie-card glass-card rounded-2xl p-6" style="border-radius: 1.25rem;">' +
      '  <div class="text-sm" style="color: rgba(17, 24, 39, 0.7); font-weight: 600;">' +
      "    Loading…" +
      "  </div>" +
      '  <div class="mt-3" style="height: 10px; border-radius: 999px; background: rgba(197, 160, 89, 0.12); overflow: hidden;">' +
      '    <div style="width: 45%; height: 100%; background: rgba(197, 160, 89, 0.45); border-radius: 999px;"></div>' +
      "  </div>" +
      "</div>"
    );
  }

  async function loadFormFragment(url, formSelector) {
    // In modalità file:// evitiamo fetch (bloccato in Safari e in molti browser)
    // e mostriamo un messaggio elegante che invita ad aprire la pagina completa.
    if (window.location.protocol === "file:") {
      var box = document.createElement("div");
      box.className = "ie-card glass-card rounded-2xl p-6";
      box.innerHTML =
        '<div class="text-sm font-semibold text-gray-700 mb-1">Form non disponibile in modalità file locale.</div>' +
        '<p class="text-xs text-gray-500">Apri la pagina completa tramite la sidebar o il pulsante principale per utilizzare questo form.</p>';
      return box;
    }

    try {
      var res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        var boxError = document.createElement("div");
        boxError.className = "ie-card glass-card rounded-2xl p-6";
        boxError.innerHTML =
          '<div class="text-sm font-semibold text-gray-700">Unable to load form.</div>';
        return boxError;
      }

      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, "text/html");

      var form = doc.querySelector(formSelector);
      if (!form) {
        var boxMissing = document.createElement("div");
        boxMissing.className = "ie-card glass-card rounded-2xl p-6";
        boxMissing.innerHTML =
          '<div class="text-sm font-semibold text-gray-700">Form not found in source page.</div>';
        return boxMissing;
      }

      // Try to capture the small intro block above the form (title + subtitle)
      var intro =
        form.previousElementSibling &&
        form.previousElementSibling.matches(".mb-6")
          ? form.previousElementSibling
          : null;

      var wrapper = document.createElement("div");
      wrapper.className = "space-y-6";

      if (intro) wrapper.appendChild(intro.cloneNode(true));
      wrapper.appendChild(form.cloneNode(true));

      return wrapper;
    } catch (error) {
      console.error("[ItalianExperience] Unable to load form fragment", error);
      var boxCatch = document.createElement("div");
      boxCatch.className = "ie-card glass-card rounded-2xl p-6";
      boxCatch.innerHTML =
        '<div class="text-sm font-semibold text-gray-700 mb-1">Unable to load form.</div>' +
        '<p class="text-xs text-gray-500">Se stai eseguendo il portale da file locali, apri la pagina completa dal menu per compilare il form.</p>';
      return boxCatch;
    }
  }

  function openCandidateModal() {
    if (!window.IERouter) return;

    var base = window.IERouter.derivePortalBasePath();
    var fullPage = base + "add-candidate.html";
    var url = fullPage;

    openModal({
      title: "Add New Candidate",
      fullPageHref: fullPage,
      render: async function (mount) {
        mount.innerHTML = renderModalLoading();
        var fragment = await loadFormFragment(url, "#candidateForm");
        mount.innerHTML = "";
        mount.appendChild(fragment);
        if (
          window.IEFormsRuntime &&
          typeof window.IEFormsRuntime.bindFormHandlers === "function"
        ) {
          window.IEFormsRuntime.bindFormHandlers(mount);
        }
        var form = mount.querySelector("#candidateForm");
        if (form && typeof window.initCandidateProfileSections === "function") {
          window.initCandidateProfileSections(form, "create", null);
        }
      },
    });
  }

  function openOfferModal() {
    if (!window.IERouter) return;

    var base = window.IERouter.derivePortalBasePath();
    var fullPage = base + "add-job-offer.html";
    var url = fullPage;

    openModal({
      title: "Create New Job Offer",
      fullPageHref: fullPage,
      render: async function (mount) {
        mount.innerHTML = renderModalLoading();
        var fragment = await loadFormFragment(url, "#jobOfferForm");
        mount.innerHTML = "";
        mount.appendChild(fragment);
        if (
          window.IEFormsRuntime &&
          typeof window.IEFormsRuntime.bindFormHandlers === "function"
        ) {
          window.IEFormsRuntime.bindFormHandlers(mount);
        }
      },
    });
  }

  function openCandidateDetailModalFromRow(rowElement) {
    if (!rowElement) return;

    var photoEl = rowElement.querySelector("td:nth-child(1) img");
    var nameCell = rowElement.querySelector("td:nth-child(2)");
    var positionCell = rowElement.querySelector("td:nth-child(3)");
    var clientCell = rowElement.querySelector("td:nth-child(4)");
    var addressCell = rowElement.querySelector("td:nth-child(5)");
    var statusBadge = rowElement.querySelector("td:nth-child(6) .badge");
    var sourceCell = rowElement.querySelector("td:nth-child(7)");
    var dateCell = rowElement.querySelector("td:nth-child(8)");

    var fullName = nameCell ? nameCell.textContent.trim() : "Candidate details";
    var position = positionCell ? positionCell.textContent.trim() : "";
    var clientName = clientCell ? clientCell.textContent.trim() : "—";
    var address = addressCell ? addressCell.textContent.trim() : "—";
    var source = sourceCell ? sourceCell.textContent.trim() : "—";
    var dateAdded = dateCell ? dateCell.textContent.trim() : "—";
    var statusHtml = statusBadge ? statusBadge.outerHTML : "";
    var statusLabel = statusBadge ? statusBadge.textContent.trim() : "";
    var photoUrl = photoEl ? photoEl.getAttribute("src") : "";

    openModal({
      title: fullName,
      fullPageHref: null,
      render: function (mount) {
        mount.innerHTML =
          '<div class="space-y-6">' +
          '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">' +
          '    <div class="flex items-center gap-4">' +
          '      <div class="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">' +
          (photoUrl
            ? '<img src="' +
              photoUrl +
              '" alt="' +
              fullName +
              '" class="w-full h-full object-cover" />'
            : "") +
          "      </div>" +
          "      <div>" +
          '        <h3 class="serif text-xl font-bold text-[#1b4332] leading-tight">' +
          fullName +
          "</h3>" +
          (position
            ? '<p class="text-sm text-gray-600 mt-1">' + position + "</p>"
            : "") +
          "      </div>" +
          "    </div>" +
          '    <div class="flex flex-col items-start md:items-end gap-2 text-xs">' +
          (statusHtml
            ? '<div class="flex items-center gap-2">' +
              '<span class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Status</span>' +
              statusHtml +
              "</div>"
            : "") +
          (source
            ? '<div class="flex items-center gap-2 text-gray-500">' +
              '<span class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Source</span>' +
              '<span class="font-medium text-gray-700">' +
              source +
              "</span>" +
              "</div>"
            : "") +
          (dateAdded
            ? '<div class="flex items-center gap-2 text-gray-500">' +
              '<span class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Added</span>' +
              '<span class="font-medium text-gray-700">' +
              dateAdded +
              "</span>" +
              "</div>"
            : "") +
          "    </div>" +
          "  </div>" +
          '  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">' +
          '    <div class="space-y-2">' +
          '      <div class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Client</div>' +
          '      <div class="text-gray-800 font-medium">' +
          clientName +
          "</div>" +
          "    </div>" +
          '    <div class="space-y-2">' +
          '      <div class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Location</div>' +
          '      <div class="text-gray-700 italic">' +
          address +
          "</div>" +
          "    </div>" +
          "  </div>" +
          '  <div class="ie-card glass-card rounded-2xl p-6">' +
          '    <dl class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">' +
          '      <div class="space-y-1">' +
          '        <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Client</dt>' +
          '        <dd class="font-medium text-gray-800">' +
          clientName +
          "</dd>" +
          "      </div>" +
          '      <div class="space-y-1">' +
          '        <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Location</dt>' +
          '        <dd class="text-gray-700 italic">' +
          address +
          "</dd>" +
          "      </div>" +
          '      <div class="space-y-1">' +
          '        <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Source</dt>' +
          '        <dd class="text-gray-700">' +
          source +
          "</dd>" +
          "      </div>" +
          '      <div class="space-y-1">' +
          '        <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Date added</dt>' +
          '        <dd class="text-gray-700">' +
          dateAdded +
          "</dd>" +
          "      </div>" +
          "    </dl>" +
          (statusLabel
            ? '<div class="mt-6 text-xs text-gray-500 border-t border-gray-100 pt-4">' +
              "This candidate is currently in <span class='font-semibold text-[#1b4332]'>" +
              statusLabel +
              "</span> status in your pipeline." +
              "</div>"
            : "") +
          "  </div>" +
          "</div>";
      },
    });
  }

  async function openCVPreview(candidateId) {
    if (!candidateId) return;

    var candidate = null;
    if (
      window.IESupabase &&
      typeof window.IESupabase.getCandidateById === "function"
    ) {
      try {
        var result = await window.IESupabase.getCandidateById(candidateId);
        if (result && result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              result.error.message || "Error loading candidate.",
              "openCandidateCvPreview"
            );
          }
          return;
        }
        candidate = result && result.data;
      } catch (err) {
        console.error(
          "[ItalianExperience] openCandidateCvPreview getCandidateById failed:",
          err
        );
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError(
            "Error loading candidate.",
            "openCandidateCvPreview"
          );
        }
        return;
      }
    } else if (
      typeof window.IE_STORE !== "undefined" &&
      window.IE_STORE &&
      Array.isArray(window.IE_STORE.candidates)
    ) {
      candidate = window.IE_STORE.candidates.find(function (c) {
        return c && c.id === candidateId;
      });
    }

    if (!candidate) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Candidato non trovato.",
          "openCandidateCvPreview"
        );
      } else {
        alert("Candidato non trovato.");
      }
      return;
    }

    var rawPath = candidate.cv_url || "";
    if (!rawPath) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "No CV uploaded for this candidate.",
          "openCandidateCvPreview"
        );
      } else {
        alert("No CV uploaded for this candidate.");
      }
      return;
    }

    var finalUrl = rawPath;
    var isAbsolute = /^https?:\/\//i.test(rawPath);
    var isLegacyUploads = /^\/?uploads\//i.test(rawPath);

    if (
      !isAbsolute &&
      !isLegacyUploads &&
      window.IESupabase &&
      window.IESupabase.createSignedCandidateUrl
    ) {
      try {
        var signed = await window.IESupabase.createSignedCandidateUrl(rawPath);
        if (signed) {
          finalUrl = signed;
        }
      } catch (err2) {
        console.error(
          "[ItalianExperience] openCandidateCvPreview signing failed:",
          err2,
          { path: rawPath }
        );
      }
    }

    var fullName =
      ((candidate.first_name || "") + " " + (candidate.last_name || "")).trim();
    var title = fullName ? "CV – " + fullName : "CV Preview";

    openModal({
      title: title,
      fullPageHref: null,
      render: function (mount) {
        mount.innerHTML = "";
        var iframe = document.createElement("iframe");
        iframe.src = finalUrl;
        iframe.style.width = "100%";
        iframe.style.height = "80vh";
        iframe.style.border = "none";
        iframe.loading = "lazy";
        mount.appendChild(iframe);
      },
    });
  }

  function openEntityPreview(entity, id) {
    if (!id) return;
    if (entity === "candidate") {
      var tr = document.querySelector('tr[data-id="' + id + '"]');
      if (tr && typeof openCandidateDetailModalFromRow === "function") {
        openCandidateDetailModalFromRow(tr);
      } else if (
        window.IERouter &&
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.candidateView === "function"
      ) {
        window.IERouter.navigateTo(window.IEPortal.links.candidateView(id));
      }
      return;
    }
    if (entity === "job_offer") {
      if (
        window.IEPortal &&
        window.IEPortal.ui &&
        typeof window.IEPortal.ui.openJobOfferPreviewModal === "function"
      ) {
        window.IEPortal.ui.openJobOfferPreviewModal(id);
      } else if (
        window.IERouter &&
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.offerView === "function"
      ) {
        window.IERouter.navigateTo(window.IEPortal.links.offerView(id));
      }
      return;
    }
    if (entity === "client") {
      if (window.IERouter) {
        window.IERouter.navigateTo(
          "add-client.html?id=" + encodeURIComponent(id) + "&mode=view"
        );
      }
    }
  }

  function initGlobalModals() {
    if (hasInitializedGlobalModals) return;
    hasInitializedGlobalModals = true;

    document.addEventListener("click", function (e) {
      var actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;

      var action = actionBtn.dataset.action;
      var id = actionBtn.dataset.id;
      var entity = actionBtn.dataset.entity;

      if (!action) return;

      if (
        action !== "preview-entity" &&
        action !== "preview-candidate" &&
        action !== "preview-offer" &&
        action !== "preview-cv"
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (action === "preview-cv") {
        if (id) {
          openCVPreview(id);
        }
        return;
      }

      if (action === "preview-candidate") {
        if (id) {
          openEntityPreview("candidate", id);
        }
        return;
      }

      if (action === "preview-offer") {
        if (id) {
          openEntityPreview("job_offer", id);
        }
        return;
      }

      if (action === "preview-entity") {
        if (
          typeof window.IERouter !== "undefined" &&
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          if (
            entity === "candidate" &&
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.candidateView === "function"
          ) {
            window.IERouter.navigateTo(
              window.IEPortal.links.candidateView(id)
            );
            return;
          }
          if (
            entity === "job_offer" &&
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.offerView === "function"
          ) {
            window.IERouter.navigateTo(window.IEPortal.links.offerView(id));
            return;
          }
          if (
            entity === "client" &&
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.clientView === "function"
          ) {
            window.IERouter.navigateTo(window.IEPortal.links.clientView(id));
            return;
          }
        }
        openEntityPreview(entity, id);
      }
    });
  }

  window.IEModalsRuntime = {
    openCandidateModal: openCandidateModal,
    openOfferModal: openOfferModal,
    openEntityPreview: openEntityPreview,
    openCVPreview: openCVPreview,
    initGlobalModals: initGlobalModals,
    closeModal: closeModal,
  };

  // Back-compat for existing code and list runtimes that call this global helper.
  if (typeof window.openCandidateCvPreview !== "function") {
    window.openCandidateCvPreview = openCVPreview;
  }
})();

