// ============================================================================
// Italian Experience Recruitment Portal - Entity Actions Runtime
// ----------------------------------------------------------------------------
// Global delegated handlers for entity row actions:
// - edit, archive, restore, permanent delete
// - row-level navigation and entity links
// Entity CREATE flows: saveCandidate, saveJobOffer, saveClient
// Entity UPDATE flows: updateCandidateFromForm, updateClientFromForm, updateJobOfferFromForm
// Original-status state for candidate/job_offer used by update flows (status-change logging).
// Extracted from core/app-shell.js with behavior preserved.
// ============================================================================

(function () {
  "use strict";

  var listenersBound = false;
  var candidateOriginalStatus = null;
  var jobOfferOriginalStatus = null;

  // ---------------------------------------------------------------------------
  // Original-status state (used by update flows for status-change auto-log)
  // ---------------------------------------------------------------------------

  function setCandidateOriginalStatus(status) {
    candidateOriginalStatus = status;
  }

  function setJobOfferOriginalStatus(status) {
    jobOfferOriginalStatus = status;
  }

  // ---------------------------------------------------------------------------
  // Entity CREATE flows (extracted from app-shell.js)
  // ---------------------------------------------------------------------------

  async function saveCandidate(formData, form) {
    var profile =
      window.IECandidateProfileRuntime &&
      typeof window.IECandidateProfileRuntime.collectCandidateProfileData ===
        "function"
        ? window.IECandidateProfileRuntime.collectCandidateProfileData(form)
        : {};
    const first_name = (formData.get("first_name") || "").toString().trim();
    const last_name = (formData.get("last_name") || "").toString().trim();
    const position = (formData.get("position") || "").toString().trim();
    const address = (formData.get("address") || "").toString().trim();
    // Manual portal creation: default profile status to approved (external/intake defaults to pending_review in data layer).
    var rawStatus = (formData.get("status") || "").toString().trim();
    var defaultStatus = "approved";
    var status = rawStatus
      ? (window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
          ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(rawStatus)
          : rawStatus)
      : defaultStatus;
    // Do not persist archived as profile status; use rejected for backward compatibility
    if (status === "archived") status = "rejected";
    const notes = (formData.get("notes") || "").toString();
    const source = (formData.get("source") || "").toString();

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertCandidate({
        first_name: first_name,
        last_name: last_name,
        position: position,
        address: address,
        status: status,
        notes: notes,
        source: source,
        email: profile.email || null,
        phone: profile.phone || null,
        linkedin_url: profile.linkedin_url || null,
        date_of_birth: profile.date_of_birth || null,
        summary: profile.summary || null,
      });
      if (error) {
        window.IESupabase.showError(error.message || "Error saving candidate.", "saveCandidate");
        return;
      }

      var pendingCandidatePhotoPath = null;
      var pendingCandidateCvPath = null;
      if (
        window.IECandidateRuntime &&
        typeof window.IECandidateRuntime.getPendingCandidateFileState === "function"
      ) {
        var state = window.IECandidateRuntime.getPendingCandidateFileState();
        pendingCandidatePhotoPath = state.photoPath || null;
        pendingCandidateCvPath = state.cvPath || null;
      }

      try {
        const newId = data && data.id;
        if (newId && (pendingCandidatePhotoPath || pendingCandidateCvPath)) {
          const updates = [];

          if (pendingCandidatePhotoPath && window.IESupabase.moveCandidateFile) {
            const finalPhotoPath = newId + "/photo.jpg";
            const movePhotoResult = await window.IESupabase.moveCandidateFile(
              pendingCandidatePhotoPath,
              finalPhotoPath
            );
            if (!movePhotoResult || !movePhotoResult.error) {
              updates.push({ photo_url: finalPhotoPath });
            }
          }

          if (pendingCandidateCvPath && window.IESupabase.moveCandidateFile) {
            const finalCvPath = newId + "/cv.pdf";
            const moveCvResult = await window.IESupabase.moveCandidateFile(
              pendingCandidateCvPath,
              finalCvPath
            );
            if (!moveCvResult || !moveCvResult.error) {
              updates.push({ cv_url: finalCvPath });
            }
          }

          if (updates.length && window.IESupabase.updateCandidateFiles) {
            const mergedPayload = updates.reduce(function (acc, patch) {
              for (const key in patch) {
                if (Object.prototype.hasOwnProperty.call(patch, key)) {
                  acc[key] = patch[key];
                }
              }
              return acc;
            }, {});
            try {
              await window.IESupabase.updateCandidateFiles(newId, mergedPayload);
            } catch (updateErr) {
              console.error("[ItalianExperience] saveCandidate() file URL update error:", updateErr);
            }
          }

          const tempPathsToDelete = [];
          if (pendingCandidatePhotoPath) tempPathsToDelete.push(pendingCandidatePhotoPath);
          if (pendingCandidateCvPath) tempPathsToDelete.push(pendingCandidateCvPath);
          if (tempPathsToDelete.length && window.IESupabase.deleteCandidateFiles) {
            try {
              await window.IESupabase.deleteCandidateFiles(tempPathsToDelete);
            } catch (deleteErr) {
              console.error("[ItalianExperience] saveCandidate() temp file cleanup error:", deleteErr);
            }
          }
        }
      } catch (finalizeErr) {
        console.error("[ItalianExperience] saveCandidate() file finalization error:", finalizeErr);
      } finally {
        if (
          window.IECandidateRuntime &&
          typeof window.IECandidateRuntime.clearPendingCandidateFileState === "function"
        ) {
          window.IECandidateRuntime.clearPendingCandidateFileState();
        }
      }

      var newId = data && data.id;
      if (newId) {
        var childrenResult =
          window.IECandidateProfileRuntime &&
          typeof window.IECandidateProfileRuntime.saveCandidateProfileChildren ===
            "function"
            ? await window.IECandidateProfileRuntime.saveCandidateProfileChildren(
                newId,
                profile
              )
            : { ok: true };
        if (!childrenResult || childrenResult.ok === false) {
          return;
        }
        if (
          window.IECandidateProfileRuntime &&
          typeof window.IECandidateProfileRuntime.logCandidateProfileUpdated ===
            "function"
        ) {
          await window.IECandidateProfileRuntime.logCandidateProfileUpdated(newId);
        }
      }

      window.IESupabase.showSuccess("Candidato salvato con successo.");
      if (newId) {
        IERouter.redirectToEntityView("candidate", newId);
      } else {
        IERouter.navigateTo("candidates.html");
      }
      return;
    }
  }

  async function saveJobOffer(formData) {
    const title = (formData.get("title") || "").toString().trim();
    const position = (formData.get("position") || "").toString().trim();
    const clientName = (formData.get("client_name") || "").toString().trim();
    let client_id = (formData.get("client_id") || "").toString().trim();
    const description = (formData.get("description") || "").toString();
    const requirements = (formData.get("requirements") || "").toString();
    const notes = (formData.get("notes") || "").toString();
    const salary = (formData.get("salary") || "").toString().trim();
    const contract_type = (formData.get("contract_type") || "").toString().trim();
    const positionsRaw = (formData.get("positions") || "").toString().trim();
    const city = (formData.get("city") || "").toString().trim();
    const state = (formData.get("state") || "").toString().trim();
    const deadline = (formData.get("deadline") || "").toString().trim();
    const status = (formData.get("status") || "open").toString();
    const positions = positionsRaw === "" ? null : Number(positionsRaw);

    if (!client_id && clientName) {
      if (window.IESupabase && window.IESupabase.insertClient) {
        const { data: createdClient, error: clientError } = await window.IESupabase.insertClient({
          name: clientName,
        });
        if (clientError) {
          window.IESupabase.showError(clientError.message || "Error creating client.", "saveJobOffer");
          return;
        }
        client_id = (createdClient && createdClient.id) || "";
      } else {
        console.error("[ItalianExperience] saveJobOffer: Supabase insertClient not available.");
        return;
      }
    }

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertJobOffer({
        client_id: client_id || null,
        title: title,
        position: position,
        description: description || null,
        requirements: requirements || null,
        notes: notes || null,
        salary: salary || null,
        contract_type: contract_type || null,
        positions: Number.isFinite(positions) ? positions : null,
        city: city || null,
        state: state || null,
        deadline: deadline || null,
        status: "active",
      });
      if (error) {
        window.IESupabase.showError(error.message || "Error creating job offer.", "saveJobOffer");
        return;
      }
      var newId = data && data.id;
      window.IESupabase.showSuccess("Job offer created successfully.");
      if (newId) {
        IERouter.redirectToEntityView("job-offer", newId);
      } else {
        IERouter.navigateTo("job-offers.html");
      }
      return;
    }
  }

  async function saveClient(formData) {
    const name = (formData.get("name") || "").toString().trim();
    const city = (formData.get("city") || "").toString().trim();
    const state = (formData.get("state") || "").toString().trim();
    const country = (formData.get("country") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const notes = (formData.get("notes") || "").toString();

    if (!name) {
      if (window.IESupabase) window.IESupabase.showError("Client name is required.", "saveClient");
      else alert("Client name is required.");
      return;
    }

    if (window.IESupabase && window.IESupabase.insertClient) {
      const { data, error } = await window.IESupabase.insertClient({
        name: name,
        city: city || null,
        state: state || null,
        country: country || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      });
      if (error) {
        window.IESupabase.showError(error.message || "Error saving client.", "saveClient");
        return;
      }
      var newId = data && data.id;
      window.IESupabase.showSuccess("Client created successfully.");
      if (newId) {
        IERouter.redirectToEntityView("client", newId);
      } else {
        IERouter.navigateTo("clients.html");
      }
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Entity UPDATE flows (extracted from app-shell.js)
  // ---------------------------------------------------------------------------

  /**
   * Update candidate from edit form (Supabase only).
   */
  function updateCandidateFromForm(id, formData, form) {
    if (!id) return;

    var profile =
      window.IECandidateProfileRuntime &&
      typeof window.IECandidateProfileRuntime.collectCandidateProfileData ===
        "function"
        ? window.IECandidateProfileRuntime.collectCandidateProfileData(form)
        : {};

    var rawStatusEdit = (formData.get("status") || "pending_review").toString();
    var normalizedStatusEdit = (window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function")
      ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(rawStatusEdit)
      : rawStatusEdit;
    // Do not persist archived as profile status; use rejected for backward compatibility
    if (normalizedStatusEdit === "archived") normalizedStatusEdit = "rejected";
    const payload = {
      first_name: (formData.get("first_name") || "").toString().trim(),
      last_name: (formData.get("last_name") || "").toString().trim(),
      address: (formData.get("address") || "").toString().trim(),
      position: (formData.get("position") || "").toString().trim(),
      status: normalizedStatusEdit,
      source: (formData.get("source") || "").toString(),
      notes: (formData.get("notes") || "").toString(),
      email: profile.email || null,
      phone: profile.phone || null,
      linkedin_url: profile.linkedin_url || null,
      date_of_birth: profile.date_of_birth || null,
      summary: profile.summary || null,
    };
    var newStatus = payload.status;
    window.IESupabase.updateCandidate(id, payload).then(async function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error while saving.");
        return;
      }

      var childrenResult =
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.saveCandidateProfileChildren ===
          "function"
          ? await window.IECandidateProfileRuntime.saveCandidateProfileChildren(
              id,
              profile
            )
          : { ok: true };
      if (!childrenResult || childrenResult.ok === false) {
        return;
      }

      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Candidato aggiornato.");

      if (
        typeof window !== "undefined" &&
        window.IESupabase &&
        typeof window.IESupabase.createAutoLog === "function" &&
        candidateOriginalStatus &&
        newStatus &&
        candidateOriginalStatus !== newStatus
      ) {
        window.IESupabase
          .createAutoLog("candidate", id, {
            event_type: "status_change",
            message: "Status changed from " + candidateOriginalStatus + " to " + newStatus,
            metadata: { from: candidateOriginalStatus, to: newStatus },
          })
          .catch(function () {});
      }

      candidateOriginalStatus = newStatus;

      if (window.IESupabase && typeof window.IESupabase.getCandidateById === "function") {
        window.IESupabase
          .getCandidateById(id)
          .then(function (freshResult) {
            if (freshResult && !freshResult.error && freshResult.data) {
              var metadataEl = document.getElementById("candidateMetadata");
              if (metadataEl && window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
                metadataEl.innerHTML = window.IEPortal.renderEntityMetadata(freshResult.data);
              }
            }
          })
          .catch(function () {});
      }

      if (
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.logCandidateProfileUpdated ===
          "function"
      ) {
        await window.IECandidateProfileRuntime.logCandidateProfileUpdated(id);
      }
      IERouter.redirectToEntityView("candidate", id);
    });
  }

  /**
   * Update client from edit form (Supabase only).
   */
  function updateClientFromForm(id, formData) {
    if (!id) return;

    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      city: (formData.get("city") || "").toString().trim(),
      state: (formData.get("state") || "").toString().trim(),
      country: (formData.get("country") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      phone: (formData.get("phone") || "").toString().trim(),
      notes: (formData.get("notes") || "").toString().trim(),
    };
    window.IESupabase.updateClient(id, payload).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error while saving.");
        return;
      }
      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Cliente aggiornato.");

      if (window.IESupabase && typeof window.IESupabase.getClientById === "function") {
        window.IESupabase
          .getClientById(id)
          .then(function (freshResult) {
            if (freshResult && !freshResult.error && freshResult.data) {
              var metadataEl = document.getElementById("clientMetadata");
              if (metadataEl && window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
                metadataEl.innerHTML = window.IEPortal.renderEntityMetadata(freshResult.data);
              }
            }
          })
          .catch(function () {});
      }

      IERouter.redirectToEntityView("client", id);
    });
  }

  function updateJobOfferFromForm(id, formData) {
    if (!id) return;

    const payload = {
      client_id: (formData.get("client_id") || formData.get("client_id_hidden") || formData.get("clientIdHidden") || formData.get("clientId") || "").toString() || null,
      title: (formData.get("title") || "").toString().trim(),
      position: (formData.get("position") || "").toString().trim() || null,
      description: (formData.get("description") || "").toString() || null,
      requirements: (formData.get("requirements") || "").toString() || null,
      notes: (formData.get("notes") || "").toString() || null,
      salary: (formData.get("salary") || "").toString() || null,
      contract_type: (formData.get("contract_type") || "").toString() || null,
      positions: (function () {
        const raw = (formData.get("positions") || "").toString().trim();
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      city: (formData.get("city") || "").toString().trim() || null,
      state: (formData.get("state") || "").toString().trim() || null,
      deadline: (formData.get("deadline") || "").toString() || null,
      status: (formData.get("status") || "open").toString(),
    };

    var newStatus = payload.status;

    if (window.IESupabase && window.IESupabase.updateJobOffer) {
      window.IESupabase.updateJobOffer(id, payload).then(function (result) {
        if (result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(result.error.message || "Error while saving.");
          }
          return;
        }
        if (window.IESupabase.showSuccess) {
          window.IESupabase.showSuccess("Offerta aggiornata.");
        }

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function" &&
          jobOfferOriginalStatus &&
          newStatus &&
          jobOfferOriginalStatus !== newStatus
        ) {
          window.IESupabase
            .createAutoLog("job_offer", id, {
              event_type: "status_change",
              message: "Status changed from " + jobOfferOriginalStatus + " to " + newStatus,
              metadata: { from: jobOfferOriginalStatus, to: newStatus },
            })
            .catch(function () {});
        }

        jobOfferOriginalStatus = newStatus;

        if (typeof window.IESupabase.getJobOfferById === "function") {
          window.IESupabase
            .getJobOfferById(id)
            .then(function (freshResult) {
              if (freshResult && !freshResult.error && freshResult.data) {
                var metadataEl = document.getElementById("jobOfferMetadata");
                if (metadataEl && window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
                  metadataEl.innerHTML = window.IEPortal.renderEntityMetadata(freshResult.data);
                }
              }
            })
            .catch(function () {});
        }
        IERouter.redirectToEntityView("job-offer", id);
      });
      return;
    }

    IERouter.redirectToEntityView("job-offer", id);
  }

  function bindDelegatedEntityActions() {
    // Global event delegation for entity row actions (edit, archive, preview, restore, delete)
    document.addEventListener("click", async function (e) {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;
      const entity = actionBtn.dataset.entity;

      if (!action) return;

      e.preventDefault();
      e.stopPropagation();

      // EDIT
      if (action === "edit-entity") {
        if (actionBtn.dataset.editUrl) {
          IERouter.navigateTo(actionBtn.dataset.editUrl);
        }
        return;
      }

      // ARCHIVE
      if (action === "archive-entity") {
        if (!window.IESupabase) return;

        if (entity === "candidate") {
          const res = await window.IESupabase.archiveCandidate(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", id, {
                event_type: "system_event",
                message: "Candidate archived",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        if (entity === "client") {
          const res = await window.IESupabase.archiveClient(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("client", id, {
                event_type: "system_event",
                message: "Client archived",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        if (entity === "job_offer") {
          const res = await window.IESupabase.archiveJobOffer(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("job_offer", id, {
                event_type: "system_event",
                message: "Job offer archived",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        location.reload();
        return;
      }

      // RESTORE
      if (action === "restore-entity") {
        if (!window.IESupabase) return;

        if (entity === "candidate") {
          const res = await window.IESupabase.unarchiveCandidate(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", id, {
                event_type: "system_event",
                message: "Candidate restored",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        if (entity === "client") {
          const res = await window.IESupabase.unarchiveClient(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("client", id, {
                event_type: "system_event",
                message: "Client restored",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        if (entity === "job_offer") {
          const res = await window.IESupabase.unarchiveJobOffer(id);
          if (
            res &&
            !res.error &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("job_offer", id, {
                event_type: "system_event",
                message: "Job offer restored",
                metadata: null,
              })
              .catch(function () {});
          }
        }

        if (
          entity === "application" &&
          typeof window.IESupabase.restoreApplication === "function"
        ) {
          await window.IESupabase.restoreApplication(id);
        }

        location.reload();
        return;
      }

      // DELETE PERMANENT
      if (action === "delete-entity-permanent") {
        if (!window.IESupabase) return;

        if (!confirm("Sei sicuro? Questa azione è irreversibile.")) return;

        if (
          entity === "application" &&
          typeof window.IESupabase.deleteAssociationPermanently === "function"
        ) {
          await window.IESupabase.deleteAssociationPermanently(id);
          location.reload();
          return;
        }

        const tableMap = {
          candidate: "candidates",
          client: "clients",
          job_offer: "job_offers",
        };

        if (
          entity === "candidate" &&
          window.IESupabase.getCandidateById &&
          window.IESupabase.deleteCandidateFiles
        ) {
          try {
            const candidateResult = await window.IESupabase.getCandidateById(id);
            if (
              candidateResult &&
              !candidateResult.error &&
              candidateResult.data
            ) {
              const candidate = candidateResult.data;
              const paths = [];
              if (candidate.photo_url) paths.push(candidate.photo_url);
              if (candidate.cv_url) paths.push(candidate.cv_url);
              if (paths.length) {
                await window.IESupabase.deleteCandidateFiles(paths);
              }
            }
          } catch (cleanupErr) {
            console.error(
              "[ItalianExperience] Failed to delete candidate files from storage:",
              cleanupErr
            );
          }
        }

        await window.IESupabase.deletePermanentRecord({
          table: tableMap[entity],
          id: id,
        });

        location.reload();
        return;
      }
    });

    // Row click: open main entity via router (ignore clicks on interactive controls).
    document.addEventListener("click", function (e) {
      var row = e.target.closest(".clickable-row");
      if (!row) return;
      // Do not treat clicks on common interactive elements as row navigation.
      if (
        e.target.closest("button") ||
        e.target.closest("a") ||
        e.target.closest("input") ||
        e.target.closest("label") ||
        e.target.closest("select") ||
        e.target.closest("textarea")
      ) {
        return;
      }

      var entity = row.dataset.entity;
      var id = row.dataset.id || row.dataset.entityId;
      if (
        entity &&
        id &&
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        e.preventDefault();
        window.IERouter.navigateTo(entity, id);
      }
    });

    // Entity link navigation: Position → job offer, Client name → client (via router).
    document.addEventListener("click", function (e) {
      var el = e.target.closest(".entity-link");
      if (!el) return;
      var type = el.getAttribute("data-entity-type");
      var id = el.getAttribute("data-entity-id");
      if (
        type &&
        id &&
        window.IERouter &&
        typeof window.IERouter.redirectToEntityView === "function"
      ) {
        e.preventDefault();
        window.IERouter.redirectToEntityView(type, id);
      }
    });
  }

  function init() {
    if (listenersBound) return;
    listenersBound = true;
    bindDelegatedEntityActions();
  }

  window.IEEntityActionsRuntime = {
    init: init,
    saveCandidate: saveCandidate,
    saveJobOffer: saveJobOffer,
    saveClient: saveClient,
    updateCandidateFromForm: updateCandidateFromForm,
    updateClientFromForm: updateClientFromForm,
    updateJobOfferFromForm: updateJobOfferFromForm,
    setCandidateOriginalStatus: setCandidateOriginalStatus,
    setJobOfferOriginalStatus: setJobOfferOriginalStatus,
  };
})();

