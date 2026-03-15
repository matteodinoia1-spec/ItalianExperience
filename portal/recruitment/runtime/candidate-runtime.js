// ============================================================================
// Italian Experience Recruitment Portal - Candidate Page Runtime
// ----------------------------------------------------------------------------
// Candidate add/edit/view controller extracted from core/app-shell.js.
// Behavior preserved; app-shell keeps compatibility wrappers.
// ============================================================================

(function () {
  "use strict";

  // Temporary candidate file state used during create/edit flows.
  var pendingCandidateTempId = null;
  var pendingCandidatePhotoPath = null;
  var pendingCandidateCvPath = null;

  function ensurePendingCandidateTempId() {
    if (pendingCandidateTempId) {
      return pendingCandidateTempId;
    }
    var id = null;
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        id = window.crypto.randomUUID();
      }
    } catch (e) {
    }
    if (!id) {
      id =
        "tmp-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);
    }
    pendingCandidateTempId = id;
    return pendingCandidateTempId;
  }

  function getPendingCandidateFileState() {
    return {
      tempId: pendingCandidateTempId,
      photoPath: pendingCandidatePhotoPath,
      cvPath: pendingCandidateCvPath,
    };
  }

  function clearPendingCandidateFileState() {
    pendingCandidateTempId = null;
    pendingCandidatePhotoPath = null;
    pendingCandidateCvPath = null;
  }

  /**
   * Remove a candidate file (photo or CV) for the current page context.
   * For existing candidates it clears the corresponding DB column via updateCandidateFiles.
   * For create flows it just clears the pending temp path and local UI state.
   */
  async function removeCandidateFile(type) {
    var isPhoto = type === "photo";

    var section = document.getElementById("candidateDocumentsSection");
    if (!section) return;

    var block = section.querySelector(
      '.candidate-file-block[data-file-type="' + type + '"]'
    );
    if (!block) return;

    var input =
      isPhoto
        ? block.querySelector('input[name="foto_file"]')
        : block.querySelector('input[name="cv_file"]');

    if (!input) return;

    var candidateId = null;
    try {
      if (
        window.IERouter &&
        typeof window.IERouter.getCandidatePageParams === "function"
      ) {
        var params = window.IERouter.getCandidatePageParams();
        if (params && params.id) {
          candidateId = params.id;
        }
      }
    } catch (e) {
      candidateId = null;
    }

    if (candidateId && window.IESupabase && window.IESupabase.updateCandidateFiles) {
      var confirmMessage = isPhoto
        ? "Remove the existing candidate photo?"
        : "Remove the existing candidate CV?";
      var proceed = window.confirm(confirmMessage);
      if (!proceed) return;

      try {
        var payload = isPhoto ? { photo_url: null } : { cv_url: null };
        var result = await window.IESupabase.updateCandidateFiles(
          candidateId,
          payload
        );
        if (result && result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              result.error.message || "Error removing file.",
              "removeCandidateFile"
            );
          }
          return;
        }

        // Clear current path so subsequent uploads use a clean state.
        input.dataset.currentPath = "";
        input.value = "";

        // Update inline file state UI in edit mode.
        if (typeof renderCandidateFileState === "function") {
          var candidateForState = isPhoto
            ? { photo_url: null }
            : { cv_url: null };
          renderCandidateFileState(type, candidateForState, "edit");
        }

        // Reset hero photo preview to a neutral avatar when photo is removed.
        if (isPhoto) {
          var previewImg = document.getElementById("candidatePhotoPreview");
          if (previewImg) {
            var fallbackSrc =
              previewImg.dataset &&
              previewImg.dataset.originalSrc
                ? previewImg.dataset.originalSrc
                : "https://ui-avatars.com/api/?name=Candidate&background=1b4332&color=fff";
            previewImg.src = fallbackSrc;
            if (previewImg.dataset) {
              previewImg.dataset.storagePath = "";
            }
          }
        }
      } catch (err) {
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError(
            "Error while removing file.",
            "removeCandidateFile"
          );
        } else {
          // eslint-disable-next-line no-console
          console.error(
            "[ItalianExperience] removeCandidateFile exception:",
            err
          );
        }
      }
      return;
    }

    // Create mode (no candidate id yet): just clear pending temp state and UI.
    if (isPhoto) {
      pendingCandidatePhotoPath = null;
    } else {
      pendingCandidateCvPath = null;
    }
    input.dataset.currentPath = "";
    input.value = "";

    if (typeof renderCandidateFileState === "function") {
      var candidateForCreateState = isPhoto
        ? { photo_url: null }
        : { cv_url: null };
      renderCandidateFileState(type, candidateForCreateState, "edit");
    }

    if (isPhoto) {
      var previewImgCreate = document.getElementById("candidatePhotoPreview");
      if (previewImgCreate) {
        var createFallbackSrc =
          previewImgCreate.dataset && previewImgCreate.dataset.originalSrc
            ? previewImgCreate.dataset.originalSrc
            : "https://ui-avatars.com/api/?name=Candidate&background=1b4332&color=fff";
        previewImgCreate.src = createFallbackSrc;
        if (previewImgCreate.dataset) {
          previewImgCreate.dataset.storagePath = "";
        }
      }
    }
  }

  function renderCandidateFileState(type, candidate, mode) {
    var section = document.getElementById("candidateDocumentsSection");
    if (!section) return;
    var block = section.querySelector(
      '.candidate-file-block[data-file-type="' + type + '"]'
    );
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
        (variant === "primary"
          ? "ie-btn-primary"
          : variant === "danger"
          ? "ie-btn-danger"
          : "ie-btn-secondary");
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
      var uploadBtn = createButton(
        type === "photo" ? "Upload photo" : "Upload CV",
        "primary"
      );
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
      if (
        window.IERouter &&
        typeof window.IERouter.getCandidatePageParams === "function"
      ) {
        var params = window.IERouter.getCandidatePageParams();
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
          type === "photo" ? candidateId + "/photo.jpg" : candidateId + "/cv.pdf";

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
          type === "photo" ? { photo_url: finalPath } : { cv_url: finalPath };

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

        if (
          type === "photo" &&
          previewImg &&
          window.IESupabase.createSignedCandidateUrl
        ) {
          var signedUrl = await window.IESupabase.createSignedCandidateUrl(
            finalPath
          );
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

        if (
          type === "photo" &&
          previewImg &&
          window.IESupabase.createSignedCandidateUrl
        ) {
          var tempSignedUrl = await window.IESupabase.createSignedCandidateUrl(
            tempPath
          );
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
        console.error(
          "[ItalianExperience] handleCandidateFileChange exception:",
          err
        );
      }
    }
  }

  /**
   * Add/Edit/View candidate page: create mode (no id), or load candidate by id
   * and apply lifecycle (edit/view).
   */
  function initAddCandidatePage() {
    if (!window.IERouter || typeof window.IERouter.getCandidatePageParams !== "function") {
      return;
    }

    const params = window.IERouter.getCandidatePageParams();
    const candidateId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#candidateForm");
    if (!form) return;

    function initProfileSections(mode, candidate) {
      if (
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.initCandidateProfileSections === "function"
      ) {
        window.IECandidateProfileRuntime.initCandidateProfileSections(form, mode, candidate);
        return;
      }
      if (typeof window.initCandidateProfileSections === "function") {
        window.initCandidateProfileSections(form, mode, candidate);
      }
    }

    if (!candidateId) {
      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = "Add New Candidate";
      if (docTitleEl) {
        docTitleEl.textContent =
          "Add New Candidate | Italian Experience Recruitment";
      }
      initProfileSections("create", null);
      if (
        window.IECandidateImportRuntime &&
        typeof window.IECandidateImportRuntime.initCandidateJsonImport ===
          "function"
      ) {
        window.IECandidateImportRuntime.initCandidateJsonImport(form);
      }
      if (typeof window.renderEntityToolbar === "function" && window.IEToolbar) {
        window.IEToolbar.renderEntityToolbar({
          entityType: "candidate",
          entityId: null,
          status: "active",
          mode: "edit",
          containerId: "candidateActions",
          formId: "candidateForm",
        });
      }
      return;
    }

    if (!window.IESupabase || !window.IESupabase.getCandidateById) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError("Supabase non disponibile.");
      }
      return;
    }

    window.IESupabase.getCandidateById(candidateId).then(function (result) {
      if (result.error) {
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError(
            result.error.message || "Candidato non trovato."
          );
        }
        window.IERouter.navigateTo("candidates.html");
        return;
      }
      const candidate = result.data;
      if (!candidate) {
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError("Candidato non trovato.");
        }
        window.IERouter.navigateTo("candidates.html");
        return;
      }

      if (
        window.IECandidateRuntimeHelpers &&
        typeof window.IECandidateRuntimeHelpers.setCandidateOriginalStatus === "function"
      ) {
        window.IECandidateRuntimeHelpers.setCandidateOriginalStatus(
          (candidate.status || "new").toString()
        );
      }

      const lifecycleStatus = candidate.is_archived ? "archived" : "active";
      const effectiveMode = window.IEToolbar.resolveEntityMode(
        lifecycleStatus,
        requestedMode
      );

      const firstNameEl = form.querySelector('[name="first_name"]');
      const lastNameEl = form.querySelector('[name="last_name"]');
      const addressEl = form.querySelector('[name="address"]');
      const positionEl = form.querySelector('[name="position"]');
      const statusEl = form.querySelector('[name="status"]');
      const sourceEl = form.querySelector('[name="source"]');
      const notesEl = form.querySelector('[name="notes"]');
      const photoInputEl = form.querySelector('[name="foto_file"]');
      const cvInputEl = form.querySelector('[name="cv_file"]');
      const previewImg = document.getElementById("candidatePhotoPreview");
      if (firstNameEl) firstNameEl.value = candidate.first_name || "";
      if (lastNameEl) lastNameEl.value = candidate.last_name || "";
      if (addressEl) addressEl.value = candidate.address || "";
      if (positionEl) positionEl.value = candidate.position || "";
      if (statusEl) {
        var raw = candidate.status || "";
        var profileStatus = (window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function")
          ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(raw)
          : (raw || "pending_review");
        // Archived is not a profile status option in the form; show Rejected for legacy archived
        if (profileStatus === "archived") profileStatus = "rejected";
        statusEl.value = profileStatus;
      }
      if (sourceEl) sourceEl.value = candidate.source || "";
      if (notesEl) notesEl.value = candidate.notes || "";

      if (photoInputEl) {
        photoInputEl.dataset.currentPath = candidate.photo_url || "";
      }
      if (cvInputEl) {
        cvInputEl.dataset.currentPath = candidate.cv_url || "";
      }

      if (
        previewImg &&
        candidate.photo_url &&
        window.IESupabase &&
        window.IESupabase.createSignedCandidateUrl
      ) {
        window.IESupabase
          .createSignedCandidateUrl(candidate.photo_url)
          .then(function (signedUrl) {
            if (signedUrl) {
              previewImg.src = signedUrl;
              previewImg.dataset.storagePath = candidate.photo_url;
            }
          })
          .catch(function () {
            // Ignore preview errors to avoid impacting page lifecycle.
          });
      }

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

      initProfileSections(effectiveMode, candidate);
      setFormReadonly(effectiveMode === "view");

      if (
        window.IEFormsRuntimeHelpers &&
        typeof window.IEFormsRuntimeHelpers.renderCandidateFileState === "function"
      ) {
        window.IEFormsRuntimeHelpers.renderCandidateFileState(
          "photo",
          candidate,
          effectiveMode
        );
        window.IEFormsRuntimeHelpers.renderCandidateFileState(
          "cv",
          candidate,
          effectiveMode
        );
      }

      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) {
        headerTitleEl.textContent =
          effectiveMode === "view" ? "View Candidate" : "Edit Candidate";
      }
      if (docTitleEl) {
        docTitleEl.textContent =
          (effectiveMode === "view" ? "View Candidate" : "Edit Candidate") +
          " | Italian Experience Recruitment";
      }

      function onEdit() {
        window.IERouter.navigateTo(window.IEPortal.links.candidateEdit(candidateId));
      }

      async function onArchive() {
        const res = await window.IESupabase.archiveCandidate(candidateId);
        if (!res.error) {
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", candidateId, {
                event_type: "system_event",
                message: "Candidate archived",
                metadata: null,
              })
              .catch(function () {});
          }
          window.IERouter.navigateTo("candidates.html");
        }
      }

      async function onReopen() {
        const res = await window.IESupabase.unarchiveCandidate(candidateId);
        if (!res.error) {
          candidate.is_archived = false;
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", candidateId, {
                event_type: "system_event",
                message: "Candidate restored",
                metadata: null,
              })
              .catch(function () {});
          }
          if (typeof window.renderEntityToolbar === "function" && window.IEToolbar) {
            window.IEToolbar.renderEntityToolbar({
              entityType: "candidate",
              entityId: candidateId,
              status: "active",
              mode: "view",
              containerId: "candidateActions",
              formId: "candidateForm",
              onEdit: onEdit,
              onArchive: onArchive,
              onReopen: onReopen,
            });
          }
        }
      }

      if (typeof window.renderEntityToolbar === "function" && window.IEToolbar) {
        window.IEToolbar.renderEntityToolbar({
          entityType: "candidate",
          entityId: candidateId,
          status: lifecycleStatus,
          mode: effectiveMode,
          containerId: "candidateActions",
          formId: "candidateForm",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
        });
      }

      var existingCandidateMeta = document.getElementById("candidateMetadata");
      if (existingCandidateMeta && existingCandidateMeta.parentNode) {
        existingCandidateMeta.parentNode.removeChild(existingCandidateMeta);
      }

      var metadataContainer = document.createElement("div");
      metadataContainer.id = "candidateMetadata";
      if (form && form.parentNode) {
        form.parentNode.appendChild(metadataContainer);
      }
      if (window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
        metadataContainer.innerHTML = window.IEPortal.renderEntityMetadata(candidate);
      } else {
        metadataContainer.innerHTML = "";
      }

      if (
        window.IEAssociationsRuntime &&
        typeof window.IEAssociationsRuntime.renderCandidateAvailableOffersSection === "function"
      ) {
        window.IEAssociationsRuntime.renderCandidateAvailableOffersSection({
          candidateId: candidateId,
          candidate: candidate,
          mode: effectiveMode,
          isArchived: !!candidate.is_archived,
          insertAfterEl: metadataContainer,
        });
      }

      var activityWrap = document.getElementById("candidate-activity-section-wrap");
      var activityContainer = document.getElementById("activity-container");
      if (effectiveMode === "edit") {
        if (activityWrap) activityWrap.style.display = "none";
      } else {
        if (activityWrap) activityWrap.style.display = "";
        if (window.ActivitySection && typeof window.ActivitySection.init === "function" && activityContainer) {
          window.ActivitySection.init({
            entityType: "candidate",
            entityId: candidateId,
            container: activityContainer,
          });
        }
      }
    });
  }

  function initCandidatePage() {
    // Currently, the candidate controller lives on add-candidate.html.
    // Keep a page-agnostic entrypoint as requested.
    initAddCandidatePage();
  }

  window.IECandidateRuntime = {
    initCandidatePage: initCandidatePage,
    renderCandidateFileState: renderCandidateFileState,
    handleCandidateFileChange: handleCandidateFileChange,
    getPendingCandidateFileState: getPendingCandidateFileState,
    clearPendingCandidateFileState: clearPendingCandidateFileState,
    removeCandidateFile: removeCandidateFile,
  };
})();

