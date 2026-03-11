// ============================================================================
// Italian Experience Recruitment Portal - Global App Logic
// ----------------------------------------------------------------------------
// Responsibilities:
// - Navigation between pages (header nav + key CTA buttons)
// - Active menu highlighting based on current URL
// - Shared shell behaviour (header + bottom nav on mobile)
// - Basic form interactions
// - Placeholder functions for future database/API integration
// ============================================================================

(function () {
  "use strict";

  var pageKey = window.IERouterRuntime.getPageKey();

  async function ensureSupabaseSessionReady() {
    if (!window.IESupabase) {
      return;
    }

    try {
      if (typeof window.IESupabase.getSession === "function") {
        await window.IESupabase.getSession();
        return;
      }

      var supabaseClient = window.IESupabase.supabase;
      if (
        supabaseClient &&
        supabaseClient.auth &&
        typeof supabaseClient.auth.getSession === "function"
      ) {
        await supabaseClient.auth.getSession();
      }
    } catch (err) {
      console.error(
        "[ItalianExperience] ensureSupabaseSessionReady failed:",
        err
      );
    }
  }

  function redirectToLoginFailsafe() {
    if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
      window.IEAuth.redirectToLogin();
      return;
    }
    if (window.IESupabase && typeof window.IESupabase.redirectToLogin === "function") {
      window.IESupabase.redirectToLogin();
      return;
    }
    var base = "";
    try {
      base = new URL(".", window.location.href).href;
    } catch (e) {}
    window.location.href = base + "index.html";
  }

  var isProtectedPage = window.IERouterRuntime.isProtectedPage(pageKey);
  if (isProtectedPage) {
    window.__IE_AUTH_GUARD__ = (async function () {
      if (!window.IEAuth || typeof window.IEAuth.checkAuth !== "function") {
        redirectToLoginFailsafe();
        return false;
      }
      if (!window.IESupabase) {
        redirectToLoginFailsafe();
        return false;
      }

      try {
        var sessionResult = null;
        if (
          window.IESessionReady &&
          typeof window.IESessionReady.getSessionReady === "function"
        ) {
          sessionResult = await window.IESessionReady.getSessionReady();
        } else {
          await ensureSupabaseSessionReady();
        }
        var user = await window.IEAuth.checkAuth(sessionResult || undefined);
        if (!user) {
          redirectToLoginFailsafe();
          return false;
        }

        window.__IE_AUTH_USER__ = user;

        if (document && document.body) {
          document.body.style.visibility = "visible";
        }

        return true;
      } catch (err) {
        if (typeof window.debugLog === "function") {
          window.debugLog("[ItalianExperience] Auth bootstrap failed", err);
        }
        redirectToLoginFailsafe();
        return false;
      }
    })();
  } else {
    window.__IE_AUTH_GUARD__ = Promise.resolve(true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Compute and expose the current page key for other modules.
    var currentPageKey =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : pageKey;

    window.IEPortal = window.IEPortal || {};
    window.IEPortal.pageKey = currentPageKey;

    if (window.IEPageBootstrap && typeof window.IEPageBootstrap.init === "function") {
      window.IEPageBootstrap.init(currentPageKey);
    }
  });

  // Candidate temporary file state helper has been moved to
  // runtime/candidate-runtime.js.

  // ---------------------------------------------------------------------------
  // Layout & Sidebar
  // ---------------------------------------------------------------------------

  function initBackButton() {
    var backButtons = document.querySelectorAll("[data-back-button]");
    if (!backButtons || backButtons.length === 0) return;

    backButtons.forEach(function (backButton) {
      var pageKey = window.IERouterRuntime.getPageKey();
      var listingPages = ["dashboard", "candidates", "job-offers", "applications", "clients", "archived"];
      var searchParams = new URLSearchParams(window.location.search || "");
      var hasIdParam = searchParams.has("id");

      var shouldShowBackButton;
      if (pageKey === "profile") {
        shouldShowBackButton = true;
      } else if (hasIdParam) {
        shouldShowBackButton = true;
      } else if (listingPages.indexOf(pageKey) !== -1) {
        shouldShowBackButton = false;
      } else {
        shouldShowBackButton = true;
      }

      backButton.style.display = shouldShowBackButton ? "" : "none";

      backButton.addEventListener("click", function (event) {
        event.preventDefault();

        var defaultHref = backButton.getAttribute("href") || "dashboard.html";

        var path = window.location.pathname || "";
        var lastSegment = path.split("/").filter(Boolean).pop() || "";

        var targetPath = (function () {
          // Entity detail & editor pages should always go back to their listing.
          if (pageKey === "add-candidate" || lastSegment.indexOf("candidate") !== -1) {
            return "candidates.html";
          }
          if (pageKey === "add-client" || lastSegment.indexOf("client") !== -1) {
            return "clients.html";
          }
          if (pageKey === "add-job-offer" || lastSegment.indexOf("job-offer") !== -1) {
            return "job-offers.html";
          }

          if (pageKey === "candidates") return "candidates.html";
          if (pageKey === "clients") return "clients.html";
          if (pageKey === "job-offers") return "job-offers.html";
          if (pageKey === "applications") return "applications.html";
          if (pageKey === "archived") return "archived.html";
          if (pageKey === "dashboard") return "dashboard.html";

          return defaultHref.replace(/^\.\//, "");
        })();

        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(targetPath);
        } else {
          window.location.assign(targetPath);
        }
      });
    });
  }

  // Header defaults, breadcrumbs, and mounting have been extracted to
  // runtime/header-runtime.js. Compatibility wrappers are kept at the bottom
  // of this file via window.IEPortal.* helpers.

  // ---------------------------------------------------------------------------
  // Buttons & Small Interactions
  // ---------------------------------------------------------------------------

  function initButtons() {
    // Primary CTAs that should navigate to form pages
    const addCandidateBtn =
      document.querySelector('[data-action="add-candidate"]') ||
      findButtonByText("add new candidate");
    if (addCandidateBtn) {
      addCandidateBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("add-candidate.html");
      });
    }

    const addOfferBtn =
      document.querySelector('[data-action="add-job-offer"]') ||
      document.querySelector('[data-action="add-offer"]') ||
      findButtonByText("create new job offer");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("add-job-offer.html?mode=create");
      });
    }

    const addClientBtn = document.querySelector('[data-action="add-client"]');
    if (addClientBtn) {
      addClientBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("add-client.html");
      });
    }

    // "Vedi Tutti" button on dashboard -> candidates listing
    const viewAllCandidatesBtn =
      document.querySelector('[data-action="view-all-candidates"]') ||
      findButtonByText("vedi tutti");
    if (viewAllCandidatesBtn) {
      viewAllCandidatesBtn.addEventListener("click", function (event) {
        event.preventDefault();
        if (IERouter && typeof IERouter.navigateTo === "function") {
          IERouter.navigateTo("candidates", { status: "pending_review" });
        } else {
          window.location.href = "candidates.html?status=pending_review";
        }
      });
    }

  }

  // ---------------------------------------------------------------------------
  // Inactivity logout (protected pages only)
  // ---------------------------------------------------------------------------
  function initInactivityTimer() {
    if (
      window.IEPortal &&
      window.IEPortal.session &&
      typeof window.IEPortal.session.initInactivityTimer === "function"
    ) {
      window.IEPortal.session.initInactivityTimer();
    }
  }

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.clearSessionState = function () {
    if (typeof window !== "undefined") {
      window.IE_CURRENT_PROFILE = null;
      window.IE_CURRENT_USER_EMAIL = null;
      window.__IE_AUTH_USER__ = null;
    }
  };

  function findButtonByText(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    const candidates = Array.from(
      document.querySelectorAll("button, a[role='button'], .btn")
    );
    return (
      candidates.find((el) =>
        (el.textContent || "").trim().toLowerCase().includes(normalized)
      ) || null
    );
  }

  // ---------------------------------------------------------------------------
  // Forms & Placeholders for Future Back-end
  // ---------------------------------------------------------------------------
  // Form DOM wiring moved to runtime/forms-runtime.js.
  // Form initialization is invoked via IEFormsRuntime from page-bootstrap.

  function renderCandidateFileState(type, candidate, mode) {
    var section = document.getElementById("candidateDocumentsSection");
    if (!section) return;
    var block = section.querySelector('.candidate-file-block[data-file-type="' + type + '"]');
    if (!block) return;

    var stateEl = block.querySelector(".file-state");
    var actionsEl = block.querySelector(".file-actions");
    var input =
      type === "photo"
        ? block.querySelector('input[name="foto_file"]')
        : block.querySelector('input[name="cv_file"]');

    if (!stateEl || !actionsEl || !input) return;

    var hasCandidate = !!candidate;
    var path = "";
    if (hasCandidate) {
      if (type === "photo") {
        path = candidate.photo_url || "";
      } else {
        path = candidate.cv_url || "";
      }
    }
    if (!path && input.dataset && input.dataset.currentPath) {
      path = input.dataset.currentPath;
    }

    var hasFile = !!path;
    actionsEl.innerHTML = "";

    var isView = mode === "view";
    if (isView) {
      input.disabled = true;
      input.classList.add("hidden");
    } else {
      input.disabled = false;
    }

    if (type === "photo") {
      stateEl.textContent = hasFile ? "Photo uploaded" : "No photo uploaded";
    } else {
      stateEl.textContent = hasFile ? "CV uploaded" : "No CV uploaded";
    }

    function createButton(label, variant) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.className =
        "ie-btn " +
        (variant === "primary" ? "ie-btn-primary" : variant === "danger" ? "ie-btn-danger" : "ie-btn-secondary");
      return btn;
    }

    function resolvePath() {
      var p = path;
      if (!p && input.dataset && input.dataset.currentPath) {
        p = input.dataset.currentPath;
      }
      return p || "";
    }

    function handleDownload() {
      var p = resolvePath();
      if (!p) return;
      if (window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        window.IESupabase
          .createSignedCandidateUrl(p)
          .then(function (signedUrl) {
            var url = signedUrl || p;
            window.open(url, "_blank", "noopener");
          })
          .catch(function () {
            window.open(p, "_blank", "noopener");
          });
      } else {
        window.open(p, "_blank", "noopener");
      }
    }

    function handlePreview() {
      var p = resolvePath();
      if (!p) return;
      if (
        type === "cv" &&
        candidate &&
        candidate.id &&
        window.IEModalsRuntime &&
        typeof window.IEModalsRuntime.openCVPreview === "function"
      ) {
        window.IEModalsRuntime.openCVPreview(candidate.id);
        return;
      }
      handleDownload();
    }

    if (isView) {
      if (hasFile) {
        if (type === "cv") {
          var previewBtnView = createButton("Preview", "primary");
          previewBtnView.addEventListener("click", handlePreview);
          actionsEl.appendChild(previewBtnView);

          var downloadBtnView = createButton("Download", "secondary");
          downloadBtnView.addEventListener("click", handleDownload);
          actionsEl.appendChild(downloadBtnView);
        } else {
          var downloadBtnViewOnly = createButton("Download", "secondary");
          downloadBtnViewOnly.addEventListener("click", handleDownload);
          actionsEl.appendChild(downloadBtnViewOnly);
        }
      }
      return;
    }

    if (hasFile) {
      if (type === "cv") {
        var previewBtn = createButton("Preview", "secondary");
        previewBtn.addEventListener("click", handlePreview);
        actionsEl.appendChild(previewBtn);
      }
      var downloadBtn = createButton("Download", "secondary");
      downloadBtn.addEventListener("click", handleDownload);
      actionsEl.appendChild(downloadBtn);

      var replaceBtn = createButton("Replace", "primary");
      replaceBtn.addEventListener("click", function () {
        input.click();
      });
      actionsEl.appendChild(replaceBtn);

      var removeBtn = createButton("Remove", "danger");
      removeBtn.addEventListener("click", function () {
        if (typeof removeCandidateFile === "function") {
          removeCandidateFile(type);
        }
      });
      actionsEl.appendChild(removeBtn);
    } else {
      var uploadBtn = createButton(type === "photo" ? "Upload photo" : "Upload CV", "primary");
      uploadBtn.addEventListener("click", function () {
        input.click();
      });
      actionsEl.appendChild(uploadBtn);
    }
  }

  async function handleCandidateFileChange(config) {
    var input = config && config.input;
    var type = config && config.type;
    if (!input || !type) return;
    if (!window.IESupabase || !window.IESupabase.uploadCandidateFile) {
      return;
    }

    var files = input.files;
    var file = files && files[0];
    if (!file) return;

    var previewImg = document.getElementById("candidatePhotoPreview");
    var candidateId = null;

    try {
      if (typeof getCandidatePageParams === "function") {
        var params = IERouter.getCandidatePageParams();
        if (params && params.id) {
          candidateId = params.id;
        }
      }
    } catch (e) {
      candidateId = null;
    }

    try {
      if (candidateId) {
        // EDIT mode: upload directly under candidate id
        var currentPath = input.dataset.currentPath || "";
        if (currentPath) {
          var confirmMessage =
            type === "photo"
              ? "Replace the existing candidate photo?"
              : "Replace the existing candidate CV?";
          var proceed = window.confirm(confirmMessage);
          if (!proceed) {
            input.value = "";
            return;
          }
        }

        var finalPath =
          type === "photo"
            ? candidateId + "/photo.jpg"
            : candidateId + "/cv.pdf";

        var uploadOptions =
          type === "photo"
            ? { upsert: true, cacheControl: "3600" }
            : { upsert: true };

        var uploadResult = await window.IESupabase.uploadCandidateFile(
          finalPath,
          file,
          uploadOptions
        );
        if (uploadResult && uploadResult.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              uploadResult.error.message || "Error uploading file.",
              "handleCandidateFileChange"
            );
          }
          return;
        }

        var updatePayload =
          type === "photo"
            ? { photo_url: finalPath }
            : { cv_url: finalPath };

        if (window.IESupabase.updateCandidateFiles) {
          var updateResult = await window.IESupabase.updateCandidateFiles(
            candidateId,
            updatePayload
          );
          if (updateResult && updateResult.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(
                updateResult.error.message || "Error saving candidate.",
                "handleCandidateFileChange"
              );
            }
            return;
          }
        }

        input.dataset.currentPath = finalPath;

        if (typeof renderCandidateFileState === "function") {
          var candidateForState =
            type === "photo"
              ? { photo_url: finalPath }
              : { cv_url: finalPath };
          renderCandidateFileState(type, candidateForState, "edit");
        }

        if (type === "photo" && previewImg && window.IESupabase.createSignedCandidateUrl) {
          var signedUrl = await window.IESupabase.createSignedCandidateUrl(finalPath);
          if (signedUrl) {
            previewImg.src = signedUrl;
            previewImg.dataset.storagePath = finalPath;
          }
        }
      } else {
        // CREATE mode: upload to temp/{uuid}
        var tempId = ensurePendingCandidateTempId();
        var tempPath =
          type === "photo"
            ? "temp/" + tempId + "/photo.jpg"
            : "temp/" + tempId + "/cv.pdf";

        var tempUploadResult = await window.IESupabase.uploadCandidateFile(
          tempPath,
          file,
          { upsert: true }
        );
        if (tempUploadResult && tempUploadResult.error) {
          if (type === "photo") {
            pendingCandidatePhotoPath = null;
          } else {
            pendingCandidateCvPath = null;
          }
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              tempUploadResult.error.message || "Error uploading file.",
              "handleCandidateFileChange"
            );
          }
          return;
        }

        if (type === "photo") {
          pendingCandidatePhotoPath = tempPath;
        } else {
          pendingCandidateCvPath = tempPath;
        }

        if (type === "photo" && previewImg && window.IESupabase.createSignedCandidateUrl) {
          var tempSignedUrl = await window.IESupabase.createSignedCandidateUrl(tempPath);
          if (tempSignedUrl) {
            previewImg.src = tempSignedUrl;
            previewImg.dataset.storagePath = tempPath;
          }
        }
      }
    } catch (err) {
      if (!candidateId) {
        if (type === "photo") {
          pendingCandidatePhotoPath = null;
        } else {
          pendingCandidateCvPath = null;
        }
      }
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Error while uploading file.",
          "handleCandidateFileChange"
        );
      } else {
        console.error("[ItalianExperience] handleCandidateFileChange exception:", err);
      }
    }
  }

  function hydrateJobOfferClientAutocomplete(form) {
    if (
      window.IEJobOfferRuntime &&
      typeof window.IEJobOfferRuntime.hydrateJobOfferClientAutocomplete ===
        "function"
    ) {
      return window.IEJobOfferRuntime.hydrateJobOfferClientAutocomplete(form);
    }
  }

  // ---------------------------------------------------------------------------
  // Modal (forms loaded from existing pages)
  // ---------------------------------------------------------------------------
  // Modal helpers moved to runtime/modals-runtime.js.

  // ---------------------------------------------------------------------------
  // Supabase-only: legacy in-memory store removed.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Profile - My Activity section
  // ---------------------------------------------------------------------------

  // Keep a thin compatibility wrapper so that existing bootstrap helpers
  // can still invoke the My Activity feature without owning its logic.
  async function initProfileMyActivitySection() {
    if (
      window.IEProfileRuntime &&
      typeof window.IEProfileRuntime.initProfileMyActivitySection === "function"
    ) {
      return window.IEProfileRuntime.initProfileMyActivitySection();
    }
  }

  // Supabase-only: removed legacy in-memory store helpers and fetch wrappers.

  // Entity CREATE flows moved to runtime/entity-actions-runtime.js.
  // Thin wrappers for IEFormsRuntimeHelpers compatibility.
  async function saveCandidate(formData, form) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.saveCandidate === "function"
    ) {
      return window.IEEntityActionsRuntime.saveCandidate(formData, form);
    }
  }

  async function saveJobOffer(formData) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.saveJobOffer === "function"
    ) {
      return window.IEEntityActionsRuntime.saveJobOffer(formData);
    }
  }

  async function saveClient(formData) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.saveClient === "function"
    ) {
      return window.IEEntityActionsRuntime.saveClient(formData);
    }
  }

  // ---------------------------------------------------------------------------
  // Page-specific data views (tables + filters)
  // ---------------------------------------------------------------------------

  function initDataViews() {
    const pageKey = window.IERouterRuntime.getPageKey();
    if (pageKey === "dashboard") {
      // Dashboard data is loaded via Supabase helpers (lists runtime module).
      if (window.IEListsRuntime && typeof IEListsRuntime.initDashboardPage === "function") {
        IEListsRuntime.initDashboardPage();
      }
      return;
    }
    if (pageKey === "candidates") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initCandidatesPage === "function") {
        IEListsRuntime.initCandidatesPage();
      }
    } else if (pageKey === "job-offers") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initJobOffersPage === "function") {
        IEListsRuntime.initJobOffersPage();
      }
    } else if (pageKey === "applications") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initApplicationsPage === "function") {
        IEListsRuntime.initApplicationsPage();
      }
    } else if (pageKey === "clients") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initClientsPage === "function") {
        IEListsRuntime.initClientsPage();
      }
    } else if (pageKey === "profile") {
      initProfileMyActivitySection();
    }
  }

  // Inline association UI helpers (debounce, createInlineBadge, renderInlineCandidateRow,
  // renderInlineOfferRow) moved to runtime/associations-runtime.js.

  // ---------------------------------------------------------------------------
  // Candidate profile sections moved to runtime/candidate-profile-runtime.js
  // ---------------------------------------------------------------------------
  // initAddCandidatePage / initAddClientePage removed: page-bootstrap calls
  // IECandidateRuntime.initCandidatePage and IEClientRuntime.initClientPage directly.

  // Entity UPDATE flows moved to runtime/entity-actions-runtime.js.
  // Thin wrappers for IEFormsRuntimeHelpers compatibility.
  function updateCandidateFromForm(id, formData, form) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.updateCandidateFromForm === "function"
    ) {
      return window.IEEntityActionsRuntime.updateCandidateFromForm(id, formData, form);
    }
  }

  function updateClientFromForm(id, formData) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.updateClientFromForm === "function"
    ) {
      return window.IEEntityActionsRuntime.updateClientFromForm(id, formData);
    }
  }

  function updateJobOfferFromForm(id, formData) {
    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.updateJobOfferFromForm === "function"
    ) {
      return window.IEEntityActionsRuntime.updateJobOfferFromForm(id, formData);
    }
  }

  // renderEntityMetadata (and formatDate, getFullName) moved to runtime/associations-runtime.js.
  // IEPortal and IEAssociationsRuntimeHelpers expose it for existing callers.

  // setPageMode removed: only job-offer-runtime uses it internally; no external callers.

  async function openReopenOfferModal(offerId, offer, options) {
    if (
      window.IEJobOfferRuntime &&
      typeof window.IEJobOfferRuntime.openReopenOfferModal === "function"
    ) {
      return await window.IEJobOfferRuntime.openReopenOfferModal(
        offerId,
        offer,
        options
      );
    }
  }

  function openAssociationRejectionModal(config) {
    if (
      window.IEJobOfferRuntime &&
      typeof window.IEJobOfferRuntime.openAssociationRejectionModal === "function"
    ) {
      return window.IEJobOfferRuntime.openAssociationRejectionModal(config);
    }
  }

  // openJobOfferPreviewModal removed: modals-runtime calls IEPortal.ui.openJobOfferPreviewModal directly.

  // ---------------------------------------------------------------------------
  // Associations table rendering (job offers page)
  // ---------------------------------------------------------------------------

  // Legacy renderAssociationsForActiveOffer removed with list-page associations UI.

  window.IEPortal = window.IEPortal || {};

  // renderEntityMetadata lives in associations-runtime; wire IEPortal to it.
  window.IEPortal.renderEntityMetadata =
    (window.IEAssociationsRuntimeHelpers && window.IEAssociationsRuntimeHelpers.renderEntityMetadata) || function () { return ""; };

  // Original-status state lives in entity-actions-runtime; delegate so page
  // controllers (candidate/job-offer edit) still set it before update flows run.
  window.IECandidateRuntimeHelpers = {
    setCandidateOriginalStatus: function (status) {
      if (window.IEEntityActionsRuntime && typeof window.IEEntityActionsRuntime.setCandidateOriginalStatus === "function") {
        window.IEEntityActionsRuntime.setCandidateOriginalStatus(status);
      }
    },
  };
  window.IEJobOfferRuntimeHelpers = {
    setJobOfferOriginalStatus: function (status) {
      if (window.IEEntityActionsRuntime && typeof window.IEEntityActionsRuntime.setJobOfferOriginalStatus === "function") {
        window.IEEntityActionsRuntime.setJobOfferOriginalStatus(status);
      }
    },
  };

  // Expose association helpers still in app-shell (runtime provides inline row/badge + renderEntityMetadata).
  window.IEAssociationsRuntimeHelpers = Object.assign({}, window.IEAssociationsRuntimeHelpers || {}, {
    openAssociationRejectionModal: openAssociationRejectionModal,
    openReopenOfferModal: openReopenOfferModal,
  });

  // Expose form helpers so runtime/forms-runtime.js can invoke save/update logic.
  window.IEFormsRuntimeHelpers = {
    saveCandidate: saveCandidate,
    updateCandidateFromForm: updateCandidateFromForm,
    handleCandidateFileChange: handleCandidateFileChange,
    renderCandidateFileState: renderCandidateFileState,
    saveJobOffer: saveJobOffer,
    updateJobOfferFromForm: updateJobOfferFromForm,
    hydrateJobOfferClientAutocomplete: hydrateJobOfferClientAutocomplete,
    saveClient: saveClient,
    updateClientFromForm: updateClientFromForm,
  };

  // Expose page bootstrap helpers so runtime/page-bootstrap.js can orchestrate
  // the existing initialization pipeline without duplicating logic.
  window.IEPageBootstrapHelpers = {
    initInactivityTimer: initInactivityTimer,
    initBackButton: initBackButton,
    initButtons: initButtons,
    initDataViews: initDataViews,
  };

  window.IEPortal.links = {
    candidateView: function (id) {
      return "candidate.html?id=" + encodeURIComponent(String(id || ""));
    },
    candidateEdit: function (id) {
      return (
        "candidate.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    },
    clientView: function (id) {
      return (
        "client.html?id=" +
        encodeURIComponent(String(id || "")) +
        "&mode=view"
      );
    },
    clientEdit: function (id) {
      return (
        "client.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    },
    offerView: function (id) {
      return (
        "job-offer.html?id=" + encodeURIComponent(String(id || "")) + "&mode=view"
      );
    },
    offerEdit: function (id) {
      return (
        "job-offer.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    },
    applicationView: function (id) {
      return "application.html?id=" + encodeURIComponent(String(id || ""));
    },
    applicationEdit: function (id) {
      return (
        "application.html?id=" +
        encodeURIComponent(String(id || "")) +
        "&mode=edit"
      );
    }
  };

  window.IEPortal.navigateTo = navigateTo;
  window.IEPortal.setPageBreadcrumbs = function (segments) {
    if (
      window.IEHeaderRuntime &&
      typeof window.IEHeaderRuntime.setPageBreadcrumbs === "function"
    ) {
      window.IEHeaderRuntime.setPageBreadcrumbs(segments);
    }
  };
  window.IEPortal.mountPageHeader = function () {
    if (
      window.IEHeaderRuntime &&
      typeof window.IEHeaderRuntime.mountPageHeader === "function"
    ) {
      window.IEHeaderRuntime.mountPageHeader();
    }
  };
  window.IEPortal.getApplicationStatusBadgeClass = function (status) {
    return window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
      ? window.IEStatusRuntime.getApplicationStatusBadgeClass(status)
      : "badge-applied";
  };
  window.IEPortal.formatApplicationStatusLabel = function (status) {
    return window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
      ? window.IEStatusRuntime.formatApplicationStatusLabel(status)
      : String(status || "Applied");
  };
  window.IEPortal.normalizeApplicationStatusForDisplay = function (status) {
    return window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeApplicationStatusForDisplay === "function"
      ? window.IEStatusRuntime.normalizeApplicationStatusForDisplay(status)
      : String(status || "applied");
  };
  window.IEPortal.computeDerivedAvailability = function (applications) {
    return window.IEStatusRuntime && typeof window.IEStatusRuntime.computeDerivedAvailability === "function"
      ? window.IEStatusRuntime.computeDerivedAvailability(applications)
      : "available";
  };
  window.IEPortal.formatAvailabilityLabel = function (candidateOrStatus) {
    return window.IEStatusRuntime && typeof window.IEStatusRuntime.formatAvailabilityLabel === "function"
      ? window.IEStatusRuntime.formatAvailabilityLabel(candidateOrStatus)
      : String(candidateOrStatus || "Available");
  };
  window.IEPortal.renderEntityRow =
    window.IEListsRuntime && typeof IEListsRuntime.renderEntityRow === "function"
      ? IEListsRuntime.renderEntityRow
      : undefined;
})();
