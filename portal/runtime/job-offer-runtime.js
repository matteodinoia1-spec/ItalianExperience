// ============================================================================
// Italian Experience Recruitment Portal - Job Offer Page Runtime
// ----------------------------------------------------------------------------
// Job offer add/edit/view controller extracted from core/app-shell.js.
// Includes page mode controller, toolbar wiring, reopen offer modal, and
// association rejection modal.
//
// Behavior preserved; app-shell keeps compatibility wrappers/exports.
// ============================================================================

(function () {
  "use strict";

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function handleMissingOfferAndRedirect() {
    try {
      window.alert("Offerta non trovata.");
    } catch (e) {
      // ignore
    }
    IERouter.navigateTo("job-offers.html");
  }

  async function openReopenOfferModal(offerId, offer, options) {
    var oldStatus = offer && offer.status ? offer.status.toString() : null;
    var onConfirm =
      options && typeof options.onConfirm === "function" ? options.onConfirm : null;
    var hiredCount = 0;
    if (window.IESupabase && window.IESupabase.fetchCandidatesForJobOffer) {
      try {
        var result = await window.IESupabase.fetchCandidatesForJobOffer(offerId);
        if (result && result.data && Array.isArray(result.data)) {
          hiredCount = result.data.filter(function (a) {
            return a.status === "hired";
          }).length;
        }
      } catch (e) {
        hiredCount = 0;
      }
    }
    var positionsValue = offer && offer.positions != null ? String(offer.positions) : "";
    if (!window.IEModalsRuntime || typeof window.IEModalsRuntime.openModal !== "function") {
      if (
        window.IEPortal &&
        window.IEPortal.ui &&
        typeof window.IEPortal.ui.openModal === "function"
      )
        window.IEPortal.ui.openModal({
          title: "Reopen Job Offer?",
          fullPageHref: null,
          render: function (mount) {
            mount.innerHTML =
              '<p class="text-gray-700 text-sm mb-4">This job offer is closed. Reopen it to edit, add candidates, or mark someone as hired.</p>' +
              '<div class="mb-4">' +
              '<label class="block text-sm font-medium text-gray-700 mb-1">Number of positions</label>' +
              '<input type="number" min="1" data-reopen-positions class="form-input w-full text-sm py-2 px-3 rounded-lg border border-gray-300" value="' +
              positionsValue.replace(/"/g, "&quot;") +
              '" />' +
              '<div data-reopen-error class="text-red-500 text-xs hidden mt-1"></div>' +
              "</div>" +
              '<div class="flex gap-3 mt-4">' +
              '<button type="button" data-reopen-confirm class="ie-btn ie-btn-success">Confirm</button>' +
              '<button type="button" data-ie-modal-close class="ie-btn ie-btn-secondary">Cancel</button>' +
              "</div>";
          },
        });
      return;
    }

    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.openModal === "function"
    )
      window.IEPortal.ui.openModal({
        title: "Reopen Job Offer?",
        fullPageHref: null,
        render: function (mount) {
          mount.innerHTML =
            '<p class="text-gray-700 text-sm mb-4">This job offer is closed. Reopen it to edit, add candidates, or mark someone as hired.</p>' +
            '<div class="mb-4">' +
            '<label class="block text-sm font-medium text-gray-700 mb-1">Number of positions</label>' +
            '<input type="number" min="1" data-reopen-positions class="form-input w-full text-sm py-2 px-3 rounded-lg border border-gray-300" value="' +
            positionsValue.replace(/\"/g, "&quot;") +
            '" />' +
            '<div data-reopen-error class="text-red-500 text-xs hidden mt-1"></div>' +
            "</div>" +
            '<div class="flex gap-3 mt-4">' +
            '<button type="button" data-reopen-confirm class="ie-btn ie-btn-success">Confirm</button>' +
            '<button type="button" data-ie-modal-close class="ie-btn ie-btn-secondary">Cancel</button>' +
            "</div>";
          var positionsInput = mount.querySelector("[data-reopen-positions]");
          var errorEl = mount.querySelector("[data-reopen-error]");
          var confirmBtn = mount.querySelector("[data-reopen-confirm]");
          function validatePositions() {
            var positions = Number(positionsInput.value);
            var valid =
              Number.isFinite(positions) && positions >= 1 && positions > hiredCount;
            if (!valid) {
              errorEl.textContent =
                "You already hired " +
                hiredCount +
                " candidate(s). Increase positions above " +
                hiredCount +
                ".";
              errorEl.classList.remove("hidden");
              confirmBtn.disabled = true;
              confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
            } else {
              errorEl.textContent = "";
              errorEl.classList.add("hidden");
              confirmBtn.disabled = false;
              confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
          }
          if (positionsInput) positionsInput.addEventListener("input", validatePositions);
          validatePositions();
          if (confirmBtn) {
            confirmBtn.addEventListener("click", async function () {
              var positions = Number(positionsInput.value);
              if (!Number.isFinite(positions) || positions <= hiredCount) return;
              if (confirmBtn.disabled) return;
              confirmBtn.disabled = true;
              try {
                var statusResult = null;
                if (window.IESupabase && window.IESupabase.updateJobOfferStatus) {
                  statusResult = await window.IESupabase.updateJobOfferStatus(
                    offerId,
                    "active"
                  );
                  if (statusResult && statusResult.error) {
                    if (window.IESupabase.showError)
                      window.IESupabase.showError(
                        statusResult.error.message || "Error."
                      );
                    return;
                  }
                }
                if (window.IESupabase && window.IESupabase.updateJobOffer) {
                  var payload = {
                    client_id: offer && offer.client_id != null ? offer.client_id : null,
                    title:
                      offer && offer.title != null && offer.title !== undefined
                        ? offer.title
                        : "",
                    position: offer && offer.position != null ? offer.position : null,
                    description:
                      offer && offer.description != null ? offer.description : null,
                    requirements:
                      offer && offer.requirements != null ? offer.requirements : null,
                    notes: offer && offer.notes != null ? offer.notes : null,
                    salary: offer && offer.salary != null ? offer.salary : null,
                    contract_type:
                      offer && offer.contract_type != null ? offer.contract_type : null,
                    positions: positions,
                    city: offer && offer.city != null ? offer.city : null,
                    state: offer && offer.state != null ? offer.state : null,
                    deadline: offer && offer.deadline != null ? offer.deadline : null,
                    status: "active",
                  };
                  var updateResult = await window.IESupabase.updateJobOffer(
                    offerId,
                    payload
                  );
                  if (updateResult && updateResult.error) {
                    if (window.IESupabase.showError)
                      window.IESupabase.showError(
                        updateResult.error.message || "Error updating positions."
                      );
                    var fallbackOffer = statusResult && statusResult.data
                      ? Object.assign({}, offer || {}, statusResult.data, {
                          positions: positions,
                        })
                      : offer
                        ? Object.assign({}, offer, {
                            status: "active",
                            positions: positions,
                          })
                        : { status: "active", positions: positions };
                    if (onConfirm) await onConfirm(fallbackOffer);
                    if (
                      window.IEPortal &&
                      window.IEPortal.ui &&
                      typeof window.IEPortal.ui.closeModal === "function"
                    )
                      window.IEPortal.ui.closeModal();
                    return;
                  }
                }
                var newStatus =
                  statusResult &&
                  statusResult.data &&
                  statusResult.data.status
                    ? statusResult.data.status.toString()
                    : "active";
                if (
                  typeof window !== "undefined" &&
                  window.IESupabase &&
                  typeof window.IESupabase.createAutoLog === "function" &&
                  oldStatus &&
                  newStatus &&
                  oldStatus !== newStatus
                ) {
                  window.IESupabase
                    .createAutoLog("job_offer", offerId, {
                      event_type: "status_change",
                      message: "Status changed from " + oldStatus + " to " + newStatus,
                      metadata: { from: oldStatus, to: newStatus },
                    })
                    .catch(function () {});
                }
                var updatedOffer = offer
                  ? Object.assign({}, offer, { status: "active", positions: positions })
                  : { status: "active", positions: positions };
                if (statusResult && statusResult.data) {
                  updatedOffer.status = statusResult.data.status;
                  if (statusResult.data.positions != null)
                    updatedOffer.positions = statusResult.data.positions;
                }
                if (onConfirm) await onConfirm(updatedOffer);
                if (
                  window.IEPortal &&
                  window.IEPortal.ui &&
                  typeof window.IEPortal.ui.closeModal === "function"
                )
                  window.IEPortal.ui.closeModal();
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(
                    e && e.message ? e.message : "Error."
                  );
                }
              } finally {
                confirmBtn.disabled = false;
              }
            });
          }
        },
      });
  }

  function openAssociationRejectionModal(config) {
    var associationId = config && config.associationId;
    if (!associationId) return;

    var candidateName = (config && config.candidateName) || "this candidate";
    var jobTitle = (config && config.jobTitle) || "this job";
    var initialReason = (config && config.initialReason) || "";
    var onSaved = config && typeof config.onSaved === "function" ? config.onSaved : null;

    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.openModal === "function"
    )
      window.IEPortal.ui.openModal({
        title: "Confirm Rejection",
        fullPageHref: null,
        render: function (mount) {
          var safeName = String(candidateName || "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          var safeJobTitle = String(jobTitle || "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          mount.innerHTML =
            '<p class="text-gray-700 text-sm mb-4">Mark <strong>' +
            safeName +
            "</strong> as rejected for <strong>" +
            safeJobTitle +
            "</strong>? You can optionally provide an internal rejection reason.</p>" +
            '<label class="block text-sm font-medium text-gray-700 mb-1" for="ie-rejection-reason">Rejection reason (optional)</label>' +
            '<textarea id="ie-rejection-reason" class="form-input w-full text-sm py-2 px-3 rounded-lg border border-gray-300" rows="4" placeholder="Add an internal note about why this candidate was rejected..."></textarea>' +
            '<div class="flex gap-3 mt-4">' +
            '<button type="button" data-ie-rejection-confirm class="ie-btn ie-btn-success">Confirm</button>' +
            '<button type="button" data-ie-modal-close class="ie-btn ie-btn-secondary">Cancel</button>' +
            "</div>";

          var textarea = mount.querySelector("#ie-rejection-reason");
          var confirmBtn = mount.querySelector("[data-ie-rejection-confirm]");

          if (textarea && initialReason) {
            textarea.value = initialReason;
          }

          if (confirmBtn) {
            confirmBtn.addEventListener("click", async function () {
              if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus)
                return;

              var value = textarea ? textarea.value.trim() : "";
              var payloadReason = value === "" ? null : value;

              confirmBtn.disabled = true;
              try {
                var res = await window.IESupabase.updateCandidateAssociationStatus(
                  associationId,
                  "rejected",
                  { rejectionReason: payloadReason }
                );
                if (res && res.error) {
                  if (window.IESupabase.showError) {
                    window.IESupabase.showError(
                      res.error.message || "Error updating status."
                    );
                  }
                  return;
                }
                if (onSaved) onSaved(payloadReason);
                if (
                  window.IEPortal &&
                  window.IEPortal.ui &&
                  typeof window.IEPortal.ui.closeModal === "function"
                )
                  window.IEPortal.ui.closeModal();
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(
                    e && e.message ? e.message : "Error updating status."
                  );
                }
              } finally {
                confirmBtn.disabled = false;
              }
            });
          }
        },
      });
  }

  function hydrateJobOfferClientAutocomplete(form) {
    if (!form) return;
    const clientInput = form.querySelector("#clientInput");
    const clientIdHidden = form.querySelector("#clientIdHidden");
    const clientSuggestions = form.querySelector("#clientSuggestions");
    if (!clientInput || !clientIdHidden || !clientSuggestions) return;
    if (clientInput.dataset.ieAutocompleteBound === "true") return;
    clientInput.dataset.ieAutocompleteBound = "true";

    let debounceTimer = null;
    let latestQueryToken = 0;

    function clearSuggestions() {
      clientSuggestions.innerHTML = "";
      clientSuggestions.classList.add("hidden");
    }

    function openSuggestions() {
      if (!clientSuggestions.children.length) return;
      clientSuggestions.classList.remove("hidden");
    }

    function renderSuggestions(clients, typedValue) {
      clientSuggestions.innerHTML = "";

      (clients || []).forEach(function (client) {
        if (!client || !client.id) return;
        const item = document.createElement("button");
        item.type = "button";
        item.className =
          "ie-btn ie-btn-secondary w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f6f2e7] transition-colors";
        item.textContent = client.name || "—";
        item.addEventListener("mousedown", function (event) {
          event.preventDefault();
          clientInput.value = client.name || "";
          clientIdHidden.value = client.id;
          clearSuggestions();
        });
        clientSuggestions.appendChild(item);
      });

      const normalizedTypedValue = (typedValue || "").trim().toLowerCase();
      const hasExactMatch = (clients || []).some(function (client) {
        return (
          ((client && client.name) || "")
            .trim()
            .toLowerCase() === normalizedTypedValue
        );
      });

      if (!hasExactMatch) {
        clientIdHidden.value = "";
      }

      openSuggestions();
    }

    async function searchClients(term, queryToken) {
      if (!term) {
        clearSuggestions();
        clientIdHidden.value = "";
        return;
      }

      if (window.IESupabase && window.IESupabase.searchClientsByName) {
        const { data, error } = await window.IESupabase.searchClientsByName({
          term,
          limit: 5,
        });

        if (queryToken !== latestQueryToken) return;
        if (error) {
          clearSuggestions();
          return;
        }
        renderSuggestions(data || [], term);
        return;
      }
      if (queryToken !== latestQueryToken) return;
      clearSuggestions();
    }

    clientInput.addEventListener("input", function () {
      const value = clientInput.value.trim();
      clientIdHidden.value = "";
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        latestQueryToken += 1;
        searchClients(value, latestQueryToken).catch(function () {
          clearSuggestions();
        });
      }, 300);
    });

    clientInput.addEventListener("focus", function () {
      openSuggestions();
    });

    clientInput.addEventListener("blur", function () {
      window.setTimeout(function () {
        clearSuggestions();
      }, 120);
    });
  }

  function setPageMode(mode, id) {
    const form = document.querySelector("#jobOfferForm");
    if (!form) return;

    const params = IERouter.getJobOfferPageParams();
    const effectiveMode = (mode || params.mode || "create").toString().toLowerCase();
    const finalMode = effectiveMode === "edit" || effectiveMode === "view" ? effectiveMode : "create";

    const headerTitleEl = document.querySelector("header h1");
    const docTitleEl = document.querySelector("title");
    const saveButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector("button[type='button']");
    const actionsContainer = document.querySelector("#jobOfferActions");

    function setTitles(text) {
      if (headerTitleEl) headerTitleEl.textContent = text;
      if (docTitleEl) docTitleEl.textContent = text + " | Italian Experience Recruitment";
    }

    function setFormDisabled(disabled) {
      const fields = form.querySelectorAll("input, textarea, select");
      fields.forEach(function (field) {
        if (field.type === "hidden") return;
        if (field.tagName === "SELECT") {
          field.disabled = !!disabled;
        } else {
          field.readOnly = !!disabled;
          field.disabled = false;
        }
      });
    }

    function setSaveVisibility(visible) {
      if (!saveButton) return;
      if (visible) {
        saveButton.classList.remove("hidden");
        saveButton.disabled = false;
      } else {
        saveButton.classList.add("hidden");
        saveButton.disabled = true;
      }
    }

    function setReadonlyState() {
      setFormDisabled(true);
      setSaveVisibility(false);
      if (cancelButton) {
        cancelButton.classList.add("hidden");
        cancelButton.disabled = true;
      }
    }

    function setEditableState() {
      setFormDisabled(false);
      setSaveVisibility(true);
      if (cancelButton) {
        cancelButton.classList.remove("hidden");
        cancelButton.disabled = false;
      }
    }

    function renderActionButtons(modeToRender, offerId, offer) {
      if (!actionsContainer) return;
      var oldStatus = offer && offer.status ? offer.status.toString() : null;
      function reloadPage() {
        window.location.reload();
      }
      var effectiveModeForToolbar = modeToRender === "view" ? "view" : "edit";
      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "job-offer",
          entityId: offerId,
          status: offer ? offer.status : "active",
          mode: effectiveModeForToolbar,
          containerId: "jobOfferActions",
          formId: "jobOfferForm",
          onEdit: function () {
            IERouter.navigateTo(window.IEPortal.links.offerEdit(offerId));
          },
          onClose: async function () {
            if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
            var result = await window.IESupabase.updateJobOfferStatus(offerId, "closed");
            if (result && result.error && window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error.");
            } else {
              var newStatus =
                result && result.data && result.data.status ? result.data.status.toString() : "closed";
              if (
                typeof window !== "undefined" &&
                window.IESupabase &&
                typeof window.IESupabase.createAutoLog === "function" &&
                oldStatus &&
                newStatus &&
                oldStatus !== newStatus
              ) {
                window.IESupabase
                  .createAutoLog("job_offer", offerId, {
                    event_type: "status_change",
                    message: "Status changed from " + oldStatus + " to " + newStatus,
                    metadata: { from: oldStatus, to: newStatus },
                  })
                  .catch(function () {});
              }
              reloadPage();
            }
          },
          onArchive: async function () {
            if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
            var result = await window.IESupabase.updateJobOfferStatus(offerId, "archived");
            if (result && result.error && window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error.");
            } else {
              var newStatus =
                result && result.data && result.data.status ? result.data.status.toString() : "archived";
              if (
                typeof window !== "undefined" &&
                window.IESupabase &&
                typeof window.IESupabase.createAutoLog === "function" &&
                oldStatus &&
                newStatus &&
                oldStatus !== newStatus
              ) {
                window.IESupabase
                  .createAutoLog("job_offer", offerId, {
                    event_type: "status_change",
                    message: "Status changed from " + oldStatus + " to " + newStatus,
                    metadata: { from: oldStatus, to: newStatus },
                  })
                  .catch(function () {});
              }
              IERouter.navigateTo("job-offers.html");
            }
          },
          onReopen: function () {
            openReopenOfferModal(offerId, offer, {
              onConfirm: async function (updatedOffer) {
                populateFormFromOffer(updatedOffer);
                renderActionButtons("view", offerId, updatedOffer);
                renderOfferStatusBadge(updatedOffer.status);
                if (
                  window.IEAssociationsRuntime &&
                  typeof window.IEAssociationsRuntime.renderAssociatedCandidates === "function"
                ) {
                  await window.IEAssociationsRuntime.renderAssociatedCandidates(
                    offerId,
                    updatedOffer,
                    { populateFormFromOffer: populateFormFromOffer, renderActionButtons: renderActionButtons }
                  );
                }
              },
            });
          },
        });
      }
    }

    function renderOfferStatusBadge(status) {
      var el = document.getElementById("jobOfferHeaderStatus");
      if (!el) return;
      var normalized = IEToolbar.normalizeStatus(status);
      var badgeClass = "badge ";
      var label = "Active";
      if (normalized === "active") {
        badgeClass += "badge-open";
        label = "Active";
      } else if (normalized === "closed") {
        badgeClass += "badge-closed";
        label = "Closed";
      } else if (normalized === "archived") {
        badgeClass += "bg-gray-200 text-gray-600";
        label = "Archived";
      } else {
        badgeClass += "badge-open";
        label = "Active";
      }
      el.innerHTML =
        '<span class="' + badgeClass + '">' + escapeHtml(label) + "</span>";
    }

    function configureCancel(modeToConfigure, offerId) {
      if (!cancelButton) return;
      cancelButton.onclick = null;

      if (modeToConfigure === "create") {
        cancelButton.addEventListener("click", function () {
          IERouter.navigateTo("job-offers.html");
        });
      } else if (modeToConfigure === "edit" && offerId) {
        cancelButton.addEventListener("click", function () {
          IERouter.navigateTo(window.IEPortal.links.offerView(offerId));
        });
      }
    }

    function clearForm() {
      const fields = form.querySelectorAll("input, textarea, select");
      fields.forEach(function (field) {
        if (field.type === "hidden") {
          field.value = "";
          return;
        }
        if (field.tagName === "SELECT") {
          if (field.name === "status") {
            field.value = "open";
          } else {
            field.value = "";
          }
          return;
        }
        if (field.tagName === "TEXTAREA") {
          field.value = "";
          return;
        }
        if (field.type === "number") {
          field.value = "";
          return;
        }
        if (field.type === "date") {
          field.value = "";
          return;
        }
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = false;
          return;
        }
        field.value = "";
      });
    }

    function populateFormFromOffer(offer) {
      if (!offer) return;
      const titleEl = form.querySelector('[name="title"]');
      const positionEl = form.querySelector('[name="position"]');
      const clientNameEl = form.querySelector("#clientInput");
      const clientIdHiddenEl = form.querySelector("#clientIdHidden");
      const cityEl = form.querySelector('[name="city"]');
      const stateEl = form.querySelector('[name="state"]');
      const contractTypeEl = form.querySelector('[name="contract_type"]');
      const positionsEl = form.querySelector('[name="positions"]');
      const salaryEl = form.querySelector('[name="salary"]');
      const deadlineEl = form.querySelector('[name="deadline"]');
      const descriptionEl = form.querySelector('[name="description"]');
      const requirementsEl = form.querySelector('[name="requirements"]');
      const notesEl = form.querySelector('[name="notes"]');
      const statusEl = form.querySelector('[name="status"]');

      if (titleEl) titleEl.value = offer.title || "";
      if (positionEl) positionEl.value = offer.position || "";
      if (clientIdHiddenEl) clientIdHiddenEl.value = offer.client_id || "";
      if (clientNameEl) clientNameEl.value = offer.client_name || "";
      if (cityEl) cityEl.value = offer.city || "";
      if (stateEl) stateEl.value = offer.state || "";
      if (contractTypeEl) contractTypeEl.value = offer.contract_type || "";
      if (positionsEl)
        positionsEl.value = offer.positions != null ? String(offer.positions) : "";
      if (salaryEl) salaryEl.value = offer.salary || "";
      if (deadlineEl) deadlineEl.value = offer.deadline ? offer.deadline.split("T")[0] : "";
      if (descriptionEl) descriptionEl.value = offer.description || "";
      if (requirementsEl) requirementsEl.value = offer.requirements || "";
      if (notesEl) notesEl.value = offer.notes || "";
      if (statusEl) statusEl.value = offer.status || "open";
    }

    if (finalMode === "create") {
      setTitles("Create New Job Offer");
      var headerStatusEl = document.getElementById("jobOfferHeaderStatus");
      if (headerStatusEl) headerStatusEl.innerHTML = "";
      clearForm();
      setEditableState();
      configureCancel("create", null);
      renderActionButtons("create", null);
      return;
    }

    const offerId = id || params.id;
    if (!offerId) {
      IERouter.navigateTo("job-offers.html");
      return;
    }

    const isViewMode = finalMode === "view";
    setTitles(isViewMode ? "View Job Offer" : "Edit Job Offer");
    configureCancel(finalMode, offerId);
    if (isViewMode) {
      setReadonlyState();
    } else {
      setEditableState();
    }
    renderActionButtons(finalMode, offerId);

    if (window.IESupabase && window.IESupabase.getJobOfferById) {
      window.IESupabase
        .getJobOfferById(offerId)
        .then(function (result) {
          if (result.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Offerta non trovata.");
            }
            handleMissingOfferAndRedirect();
            return;
          }
          const offer = result.data;
          if (!offer) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError("Offerta non trovata.");
            }
            handleMissingOfferAndRedirect();
            return;
          }

          if (
            window.IEJobOfferRuntimeHelpers &&
            typeof window.IEJobOfferRuntimeHelpers.setJobOfferOriginalStatus === "function"
          ) {
            window.IEJobOfferRuntimeHelpers.setJobOfferOriginalStatus(
              (offer.status || "open").toString()
            );
          }

          populateFormFromOffer(offer);

          const normalizedStatus = IEToolbar.normalizeStatus(offer.status);
          if (normalizedStatus === "archived") {
            IERouter.navigateTo("archived.html");
            return;
          }
          const effectiveModeForOffer = IEToolbar.resolveEntityMode(offer.status, finalMode);
          const isViewModeForOffer = effectiveModeForOffer === "view";

          var jobTitle = (offer.title && String(offer.title).trim()) || "";
          var clientName = (offer.client_name && String(offer.client_name).trim()) || "";
          var headerTitle = jobTitle
            ? jobTitle + (clientName ? " – " + clientName : "")
            : clientName || "Job Offer";
          setTitles(headerTitle);
          window.pageMeta = {
            title: headerTitle,
            breadcrumbs: [
              { label: "Dashboard", path: "dashboard.html" },
              { label: "Job Offers", path: "job-offers.html" },
              { label: headerTitle },
            ],
          };
          if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
            window.IEPortal.mountPageHeader();
          }
          if (isViewModeForOffer) {
            setReadonlyState();
          } else {
            setEditableState();
          }
          configureCancel(effectiveModeForOffer, offerId);
          renderActionButtons(effectiveModeForOffer, offerId, offer);
          renderOfferStatusBadge(offer.status);

          var existingOfferMeta = document.getElementById("jobOfferMetadata");
          if (existingOfferMeta && existingOfferMeta.parentNode) {
            existingOfferMeta.parentNode.removeChild(existingOfferMeta);
          }

          var metadataContainer = document.createElement("div");
          metadataContainer.id = "jobOfferMetadata";
          if (form && form.parentNode) {
            form.parentNode.appendChild(metadataContainer);
          }
          if (window.IEPortal && typeof window.IEPortal.renderEntityMetadata === "function") {
            metadataContainer.innerHTML = window.IEPortal.renderEntityMetadata(offer);
          } else {
            metadataContainer.innerHTML = "";
          }

          if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
            window.ActivitySection.init({
              entityType: "job_offer",
              entityId: offerId,
              container: document.getElementById("activity-container"),
            });
          }

          if (isViewModeForOffer) {
            setFormDisabled(true);
            if (
              normalizedStatus !== "archived" &&
              window.IEAssociationsRuntime &&
              typeof window.IEAssociationsRuntime.renderAssociatedCandidates === "function"
            ) {
              window.IEAssociationsRuntime.renderAssociatedCandidates(offerId, offer, {
                populateFormFromOffer: populateFormFromOffer,
                renderActionButtons: renderActionButtons,
              });
            }
          }
        })
        .catch(function (err) {
          console.error("[ItalianExperience] getJobOfferById error:", err);
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError("Error loading job offer.");
          }
          handleMissingOfferAndRedirect();
        });
      return;
    }
    handleMissingOfferAndRedirect();
  }

  function initJobOfferPage() {
    // Controller lives on add-job-offer.html (create/edit/view).
    try {
      const params = new URLSearchParams(window.location.search);
      const state = IERouter.resolveEntityPageState(params);
      setPageMode(state.mode, state.id);
    } catch (_) {
      // Fall back to invoking the controller without resolved state.
      setPageMode(null, null);
    }
  }

  window.IEJobOfferRuntime = {
    initJobOfferPage: initJobOfferPage,
    setPageMode: setPageMode,
    openReopenOfferModal: openReopenOfferModal,
    openAssociationRejectionModal: openAssociationRejectionModal,
    hydrateJobOfferClientAutocomplete: hydrateJobOfferClientAutocomplete,
  };
})();

