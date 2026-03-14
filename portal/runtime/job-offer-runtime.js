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
    if (window.IEFormatters && typeof window.IEFormatters.escapeHtml === "function") {
      return window.IEFormatters.escapeHtml(text);
    }
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

  function renderCompactApplicationsPipeline(jobOfferId) {
    if (
      !jobOfferId ||
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.getApplicationsByJob !== "function"
    ) {
      return;
    }

    var sectionEl = document.querySelector("[data-ie-joboffer-pipeline-section]");
    var boardEl = document.querySelector("[data-ie-joboffer-pipeline-board]");
    var summaryEl = document.querySelector("[data-ie-joboffer-pipeline-summary]");
    if (!sectionEl || !boardEl || !summaryEl) return;

    window.IEQueries.applications
      .getApplicationsByJob(jobOfferId)
      .then(function (result) {
        if (result.error) {
          console.error("[JobOffer] getApplicationsByJob error:", result.error);
          return;
        }
        var apps = Array.isArray(result.data) ? result.data : [];
        if (!apps.length) {
          sectionEl.style.display = "none";
          return;
        }

        var totals = apps.length;
        summaryEl.textContent =
          totals === 1
            ? "1 application for this job."
            : String(totals) + " applications for this job.";

        var columns = {
          applied: [],
          screening: [],
          interview: [],
          offer: [],
          hired: [],
          rejected: [],
          withdrawn: [],
          not_selected: [],
        };

        var appById = {};
        apps.forEach(function (app) {
          if (!app || !app.id) return;
          appById[String(app.id)] = app;
          var s = (app.status || "").toString().toLowerCase();
          if (s === "new") s = "applied";
          if (s === "offered") s = "offer";
          if (!columns[s]) columns[s] = [];
          columns[s].push(app);
        });

        function normalizeStatus(s) {
          if (!s) return "applied";
          s = (s || "").toString().toLowerCase();
          if (s === "new") return "applied";
          if (s === "offered") return "offer";
          return s;
        }

        var statusLabels = {
          applied: "Applied",
          screening: "Screening",
          interview: "Interview",
          offer: "Offer",
          hired: "Hired",
          rejected: "Rejected",
          withdrawn: "Withdrawn",
          not_selected: "Not selected",
        };

        function renderBoard() {
          boardEl.innerHTML = "";
          Object.keys(columns).forEach(function (statusKey) {
            var statusLabel = statusLabels[statusKey] != null
              ? statusLabels[statusKey]
              : statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace(/_/g, " ");
            var list = columns[statusKey];

            var col = document.createElement("div");
            col.className = "space-y-2";
            col.setAttribute("data-pipeline-status", statusKey);

            var header = document.createElement("div");
            header.className = "flex items-center justify-between gap-2";
            var title = document.createElement("p");
            title.className =
              "text-[11px] font-semibold uppercase tracking-widest text-gray-500";
            title.textContent = statusLabel;
            var countBadge = document.createElement("span");
            countBadge.className =
              "inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700";
            countBadge.textContent = String(list.length);
            header.appendChild(title);
            header.appendChild(countBadge);
            col.appendChild(header);

            if (!list.length) {
              var empty = document.createElement("div");
              empty.className =
                "text-[11px] text-gray-400 italic border border-dashed border-gray-200 rounded-xl p-2 text-center";
              empty.textContent = "No candidates";
              col.appendChild(empty);
            } else {
              list.forEach(function (app) {
                var card = document.createElement("button");
                card.type = "button";
                card.className =
                  "w-full text-left bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition";
                card.setAttribute("data-application-id", String(app.id));
                card.setAttribute("data-application-status", normalizeStatus(app.status));
                card.draggable = true;

                var name = document.createElement("div");
                name.className = "text-xs font-semibold text-gray-900 truncate";
                name.textContent = app.candidate_name || "—";
                card.appendChild(name);

                if (app.candidate_position || app.candidate_location) {
                  var meta = document.createElement("div");
                  meta.className = "mt-0.5 text-[11px] text-gray-600 truncate";
                  var parts = [];
                  if (app.candidate_position) parts.push(app.candidate_position);
                  if (app.candidate_location) parts.push(app.candidate_location);
                  meta.textContent = parts.join(" • ");
                  card.appendChild(meta);
                }

                card.addEventListener("click", function (event) {
                  if (event.defaultPrevented) return;
                  var href;
                  if (
                    window.IEPortal &&
                    window.IEPortal.links &&
                    typeof window.IEPortal.links.applicationView === "function"
                  ) {
                    href = window.IEPortal.links.applicationView(app.id);
                  } else {
                    href = "application.html?id=" + encodeURIComponent(String(app.id));
                  }
                  if (
                    window.IERouter &&
                    typeof window.IERouter.navigateTo === "function"
                  ) {
                    window.IERouter.navigateTo(href);
                  } else {
                    window.location.href = href;
                  }
                });

                card.addEventListener("dragstart", function (e) {
                  try {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(app.id));
                  } catch (_) {}
                  card.classList.add("opacity-60");
                });
                card.addEventListener("dragend", function () {
                  card.classList.remove("opacity-60");
                });

                col.appendChild(card);
              });
            }

            col.addEventListener("dragover", function (e) {
              e.preventDefault();
              if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
              }
              col.classList.add("ring-2", "ring-emerald-300", "ring-offset-1");
            });
            col.addEventListener("dragleave", function () {
              col.classList.remove("ring-2", "ring-emerald-300", "ring-offset-1");
            });
            col.addEventListener("drop", function (e) {
              e.preventDefault();
              col.classList.remove("ring-2", "ring-emerald-300", "ring-offset-1");
              var appId = null;
              try {
                appId = e.dataTransfer ? e.dataTransfer.getData("text/plain") : null;
              } catch (_) {}
              if (!appId) return;
              var app = appById[String(appId)];
              if (!app || !app.id) return;
              var currentStatus = normalizeStatus(app.status);
              var newStatus = statusKey;
              if (!newStatus || newStatus === currentStatus) return;
              app.status = newStatus;
              Object.keys(columns).forEach(function (key) {
                columns[key] = columns[key].filter(function (a) {
                  return String(a.id) !== String(app.id);
                });
              });
              if (!columns[newStatus]) columns[newStatus] = [];
              columns[newStatus].push(app);
              renderBoard();
              if (
                window.IEQueries &&
                window.IEQueries.applications &&
                typeof window.IEQueries.applications.updateApplicationStatus === "function"
              ) {
                window.IEQueries.applications
                  .updateApplicationStatus(app.id, newStatus)
                  .catch(function (err) {
                    console.error(
                      "[JobOffer] updateApplicationStatus error from pipeline drag & drop:",
                      err
                    );
                  });
              }
            });

            boardEl.appendChild(col);
          });
        }

        renderBoard();

        sectionEl.style.display = "";

        // List view: populate tbody and wire bulk actions
        var listEl = sectionEl.querySelector("[data-ie-joboffer-pipeline-list]");
        var listBody = sectionEl.querySelector("[data-ie-joboffer-pipeline-list-body]");
        var boardViewBtn = sectionEl.querySelector("[data-ie-pipeline-view=\"board\"]");
        var listViewBtn = sectionEl.querySelector("[data-ie-pipeline-view=\"list\"]");
        var bulkWrap = sectionEl.querySelector("[data-ie-joboffer-pipeline-bulk-actions]");
        var bulkCountEl = sectionEl.querySelector("[data-ie-pipeline-bulk-count]");
        var bulkStatusSelect = sectionEl.querySelector("[data-ie-pipeline-bulk-status]");
        var bulkApplyBtn = sectionEl.querySelector("[data-ie-pipeline-bulk-apply]");
        var selectAllCheckbox = sectionEl.querySelector("[data-ie-pipeline-select-all]");

        var STATUS_OPTIONS = window.IEStatusRuntime && window.IEStatusRuntime.APPLICATION_STATUS_CANONICAL
          ? window.IEStatusRuntime.APPLICATION_STATUS_CANONICAL.slice()
          : ["applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn", "not_selected"];
        function formatStatusLabel(s) {
          return window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
            ? window.IEStatusRuntime.formatApplicationStatusLabel(s) : String(s || "Applied");
        }
        function getStatusBadgeClass(s) {
          return window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
            ? window.IEStatusRuntime.getApplicationStatusBadgeClass(s) : "badge-applied";
        }
        function formatUpdated(updatedAt) {
          if (!updatedAt) return "—";
          try {
            var d = new Date(updatedAt);
            return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" });
          } catch (_) { return "—"; }
        }

        if (listBody) {
          listBody.innerHTML = "";
          apps.forEach(function (app) {
            var s = (app.status || "").toString().toLowerCase();
            if (s === "new") s = "applied";
            if (s === "offered") s = "offer";
            var tr = document.createElement("tr");
            tr.className = "align-middle";
            tr.setAttribute("data-ie-pipeline-row-id", app.id);
            var tdCheck = document.createElement("td");
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "rounded border-gray-300 ie-pipeline-row-checkbox";
            cb.setAttribute("data-association-id", app.id);
            tdCheck.appendChild(cb);
            tr.appendChild(tdCheck);
            var tdName = document.createElement("td");
            tdName.className = "ie-table-td";
            var nameLink = document.createElement("a");
            nameLink.href = (window.IEPortal && window.IEPortal.links && window.IEPortal.links.applicationView) ? window.IEPortal.links.applicationView(app.id) : "application.html?id=" + encodeURIComponent(app.id);
            nameLink.className = "text-[#1b4332] font-medium hover:underline";
            nameLink.textContent = app.candidate_name || "—";
            nameLink.addEventListener("click", function (e) {
              if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
                e.preventDefault();
                window.IERouter.navigateTo(nameLink.href);
              }
            });
            tdName.appendChild(nameLink);
            tr.appendChild(tdName);
            var tdPos = document.createElement("td");
            tdPos.className = "ie-table-td text-gray-600";
            tdPos.textContent = app.candidate_position || "—";
            tr.appendChild(tdPos);
            var tdStatus = document.createElement("td");
            tdStatus.className = "ie-table-td status-cell";
            var statusSelect = document.createElement("select");
            statusSelect.className = "form-input !py-1 !px-2 text-xs w-full max-w-[140px]";
            statusSelect.setAttribute("data-association-id", app.id);
            STATUS_OPTIONS.forEach(function (opt) {
              var optEl = document.createElement("option");
              optEl.value = opt;
              optEl.textContent = formatStatusLabel(opt);
              if (opt === s) optEl.selected = true;
              statusSelect.appendChild(optEl);
            });
            statusSelect.addEventListener("change", function () {
              var assocId = statusSelect.getAttribute("data-association-id");
              var newStatus = statusSelect.value;
              if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
              window.IESupabase.updateCandidateAssociationStatus(assocId, newStatus).then(function (res) {
                if (res && res.error && window.IESupabase.showError) window.IESupabase.showError(res.error.message || "Error updating status.");
                else renderCompactApplicationsPipeline(jobOfferId);
              });
            });
            tdStatus.appendChild(statusSelect);
            tr.appendChild(tdStatus);
            var tdUpdated = document.createElement("td");
            tdUpdated.className = "ie-table-td text-gray-500 text-xs";
            tdUpdated.textContent = formatUpdated(app.updated_at || app.created_at);
            tr.appendChild(tdUpdated);
            var tdActions = document.createElement("td");
            tdActions.className = "ie-table-td text-right";
            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "text-red-600 text-xs font-medium hover:underline";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", function () {
              if (!window.confirm("Remove this candidate from the job offer?")) return;
              if (!window.IESupabase || typeof window.IESupabase.removeCandidateFromJob !== "function") return;
              window.IESupabase.removeCandidateFromJob(app.id).then(function (unlinkRes) {
                if (unlinkRes && unlinkRes.error && window.IESupabase.showError) window.IESupabase.showError(unlinkRes.error.message || "Error removing.");
                else {
                  renderCompactApplicationsPipeline(jobOfferId);
                  if (window.IEAssociationsRuntime && typeof window.IEAssociationsRuntime.renderAssociatedCandidates === "function") {
                    window.IEAssociationsRuntime.renderAssociatedCandidates(jobOfferId, null, { onPipelineRefresh: function () { renderCompactApplicationsPipeline(jobOfferId); } });
                  }
                }
              });
            });
            tdActions.appendChild(removeBtn);
            tr.appendChild(tdActions);
            listBody.appendChild(tr);
          });
        }

        function setPipelineView(mode) {
          var isList = mode === "list";
          if (boardEl) boardEl.classList.toggle("hidden", isList);
          if (listEl) listEl.classList.toggle("hidden", !isList);
          if (boardViewBtn) { boardViewBtn.setAttribute("aria-pressed", !isList ? "true" : "false"); }
          if (listViewBtn) { listViewBtn.setAttribute("aria-pressed", isList ? "true" : "false"); }
          if (bulkWrap) bulkWrap.classList.toggle("hidden", !isList);
          updateBulkState();
        }
        function updateBulkState() {
          if (!bulkWrap || !listBody) return;
          var checkboxes = listBody.querySelectorAll(".ie-pipeline-row-checkbox:checked");
          var n = checkboxes.length;
          if (bulkCountEl) bulkCountEl.textContent = n + " selected";
          if (bulkStatusSelect) bulkStatusSelect.value = "";
        }
        if (boardViewBtn) {
          boardViewBtn.onclick = function () { setPipelineView("board"); };
        }
        if (listViewBtn) {
          listViewBtn.onclick = function () { setPipelineView("list"); };
        }
        if (selectAllCheckbox && listBody) {
          selectAllCheckbox.onclick = function () {
            var checked = selectAllCheckbox.checked;
            listBody.querySelectorAll(".ie-pipeline-row-checkbox").forEach(function (cb) { cb.checked = checked; });
            updateBulkState();
          };
        }
        listBody.addEventListener("change", function () { updateBulkState(); });
        if (bulkApplyBtn && bulkStatusSelect) {
          bulkApplyBtn.onclick = function () {
            var newStatus = (bulkStatusSelect.value || "").trim();
            if (!newStatus) return;
            var ids = [];
            listBody.querySelectorAll(".ie-pipeline-row-checkbox:checked").forEach(function (cb) {
              var id = cb.getAttribute("data-association-id");
              if (id) ids.push(id);
            });
            if (!ids.length) return;
            if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
            bulkApplyBtn.disabled = true;
            var done = 0;
            ids.forEach(function (id) {
              window.IESupabase.updateCandidateAssociationStatus(id, newStatus).then(function () {
                done += 1;
                if (done === ids.length) {
                  bulkApplyBtn.disabled = false;
                  bulkStatusSelect.value = "";
                  renderCompactApplicationsPipeline(jobOfferId);
                }
              });
            });
          };
        }
        setPipelineView("board");
      })
      .catch(function (err) {
        console.error("[JobOffer] getApplicationsByJob exception:", err);
      });
  }

  // ---------------------------------------------------------------------------
  // Public Job Posting card (Phase 2 – create + edit public fields)
  // Joint guardrails: external apply open only if job_offer.status is active/open
  // and job_posting.is_published, apply_enabled, deadline not passed.
  // ---------------------------------------------------------------------------

  /**
   * Canonical job offer statuses (UI/runtime). Normalizes legacy "active" to "open".
   * Canonical set: open, inprogress, closed, archived.
   */
  function normalizeJobOfferStatus(status) {
    if (status == null || status === "") return "open";
    var s = (status || "").toString().toLowerCase().trim();
    if (s === "active") return "open";
    if (s === "in progress") return "inprogress";
    if (["open", "inprogress", "closed", "archived"].indexOf(s) >= 0) return s;
    return s;
  }

  /**
   * Job offer statuses that allow external apply when posting-side conditions are met.
   * Uses canonical status: only "open" is considered open for apply.
   */
  function isJobOfferOpenForExternalApply(offer) {
    if (!offer || !offer.status) return false;
    var canonical = normalizeJobOfferStatus(offer.status);
    return canonical === "open";
  }

  /**
   * Canonical derived state for "Applications Open" used by portal card, hero badge, and public page.
   * Rule: applications are open only when job_offer.status allows apply (open/active) AND
   * job_posting.is_published AND job_posting.apply_enabled AND (no apply_deadline or deadline not passed).
   * If the offer is closed/archived, apply is effectively closed even if posting flags say otherwise.
   * @param {object|null} offer - job_offer row (or { status } from joined job_offers)
   * @param {object|null} posting - job_postings row or null
   * @returns {{ applyOpen: boolean, blockedByOffer: boolean, isPublished: boolean, applyEnabled: boolean, hasDeadline: boolean, deadlineInPast: boolean, label: string, badgeClass: string }}
   */
  function computeEffectiveApplyState(offer, posting) {
    var offerOpen = isJobOfferOpenForExternalApply(offer);
    var isPublished = posting ? !!posting.is_published : false;
    var applyEnabled = posting ? !!posting.apply_enabled : false;
    var deadlineStr = posting && posting.apply_deadline ? posting.apply_deadline : null;
    var hasDeadline = !!deadlineStr;
    var deadlineInPast = !!(deadlineStr && window.IEJobPostingDeadline && typeof window.IEJobPostingDeadline.isApplyDeadlinePassed === "function"
      ? window.IEJobPostingDeadline.isApplyDeadlinePassed(deadlineStr)
      : (function () {
          if (!deadlineStr) return false;
          var d = new Date(deadlineStr);
          return !isNaN(d.getTime()) && d.getTime() < Date.now();
        })());
    var postingApplyOpen = applyEnabled && (!hasDeadline || !deadlineInPast);
    var applyOpen = offerOpen && postingApplyOpen;
    var blockedByOffer = !offerOpen;

    var label, badgeClass;
    if (!posting) {
      label = "No posting";
      badgeClass = "bg-gray-100 text-gray-600";
    } else if (!offerOpen) {
      label = "Blocked by offer";
      badgeClass = "bg-amber-100 text-amber-800";
    } else if (!isPublished) {
      label = "Draft";
      badgeClass = "bg-gray-100 text-gray-700";
    } else if (postingApplyOpen) {
      label = "Live";
      badgeClass = "bg-emerald-100 text-emerald-800";
    } else {
      label = "Closed";
      badgeClass = "bg-amber-100 text-amber-800";
    }

    return {
      applyOpen: !!applyOpen,
      blockedByOffer: blockedByOffer,
      isPublished: isPublished,
      applyEnabled: applyEnabled,
      hasDeadline: hasDeadline,
      deadlineInPast: deadlineInPast,
      label: label,
      badgeClass: badgeClass,
    };
  }

  /**
   * Compute combined public status for hero badge and card labels (uses canonical effective state).
   * @param {object|null} offer - job_offer row
   * @param {object|null} posting - job_postings row or null
   * @returns {{ label: string, badgeClass: string, applyOpen: boolean, blockedByOffer: boolean }}
   */
  function computeCombinedPublicState(offer, posting) {
    var state = computeEffectiveApplyState(offer, posting);
    return {
      label: state.label,
      badgeClass: state.badgeClass,
      applyOpen: state.applyOpen,
      blockedByOffer: state.blockedByOffer,
    };
  }

  function setJobOfferHeroPublicStatusBadge(offer, posting) {
    var el = document.getElementById("jobOfferPublicStatusBadge");
    if (!el) return;
    var state = computeCombinedPublicState(offer || null, posting || null);
    el.textContent = state.label;
    el.className = "badge " + state.badgeClass;
  }

  /**
   * Canonical "effective live" for public job postings: true when applications are open
   * (same rule as hero badge, job-offers list Public column, and public apply page).
   * Use this for dashboard Live Offers and any other single source of truth.
   * @param {object|null} offer - job_offer row
   * @param {object|null} posting - job_postings row or null
   * @returns {boolean}
   */
  function isEffectiveLive(offer, posting) {
    return !!computeEffectiveApplyState(offer || null, posting || null).applyOpen;
  }

  window.setJobOfferHeroPublicStatusBadge = setJobOfferHeroPublicStatusBadge;
  window.normalizeJobOfferStatus = normalizeJobOfferStatus;
  window.computeEffectiveApplyState = computeEffectiveApplyState;
  window.isEffectiveLive = isEffectiveLive;
  window.renderPublicJobPostingCard = renderPublicJobPostingCard;

  /**
   * Renders the Public Job Posting card (empty state or existing posting).
   * In view mode only the compact summary is shown; in edit mode the full editor is shown as well.
   * @param {string} jobOfferId - job_offers.id
   * @param {object|null} jobOffer - job_offers row (for hero badge and create-from-offer)
   * @param {object|null} [preloadedPosting] - optional job_postings row from related section load
   * @param {string} [pageMode] - "view" or "edit"; if omitted, derived from URL
   */
  function renderPublicJobPostingCard(jobOfferId, jobOffer, preloadedPosting, pageMode) {
    if (!jobOfferId) return;

    if (pageMode !== "view" && pageMode !== "edit") {
      var params = window.IERouter && typeof window.IERouter.getJobOfferPageParams === "function"
        ? window.IERouter.getJobOfferPageParams()
        : {};
      pageMode = (params && params.mode) === "edit" ? "edit" : "view";
    }

    var card = document.querySelector("[data-ie-jobposting-card]");
    if (!card) return;

    var emptyState = card.querySelector("[data-ie-jobposting-empty-state]");
    var existingState = card.querySelector("[data-ie-jobposting-existing-state]");
    var summaryBlock = card.querySelector("[data-ie-jobposting-summary]");
    var editorBlock = card.querySelector("[data-ie-jobposting-editor]");
    var titleEl = card.querySelector("[data-ie-jobposting-title]");
    var slugEl = card.querySelector("[data-ie-jobposting-slug]");
    var publishStatusEl = card.querySelector("[data-ie-jobposting-publish-status]");
    var applyStatusEl = card.querySelector("[data-ie-jobposting-apply-status]");
    var applyDeadlineNoteEl = card.querySelector(
      "[data-ie-jobposting-apply-deadline-note]"
    );
    var formEl = card.querySelector("[data-ie-jobposting-form]");
    var createButton = card.querySelector("[data-ie-jobposting-create]");
    var publishToggleInput = card.querySelector(
      "input[data-ie-jobposting-publish-toggle]"
    );
    var applyToggleInput = card.querySelector(
      "input[data-ie-jobposting-apply-toggle]"
    );
    var applyDisabledReasonEl = card.querySelector(
      "[data-ie-jobposting-apply-disabled-reason]"
    );
    var applySwitchWrap = card.querySelector("[data-ie-jobposting-apply-switch-wrap]");
    var copyLinkButton = card.querySelector("[data-ie-jobposting-copy-link]");
    var openPublicButton = card.querySelector("[data-ie-jobposting-open-public]");

    function getPublicPostingUrl(slug) {
      if (!slug || !String(slug).trim()) return null;
      if (!window.IEConfig || !window.IEConfig.BASE_PATH) {
        console.error(
          "[ItalianExperience] IEConfig.BASE_PATH is required for public job posting URLs (job-offer card)."
        );
        return null;
      }
      var base = window.IEConfig.BASE_PATH;
      base = String(base).replace(/\/$/, "");
      return window.location.origin + base + "/recruitment/jobs/?slug=" + encodeURIComponent(String(slug).trim());
    }

    function getFieldEl(key) {
      if (!formEl) return null;
      return formEl.querySelector('[data-ie-jobposting-field="' + key + '"]');
    }

    function showEmpty() {
      card.style.display = "";
      if (emptyState) emptyState.style.display = "";
      if (existingState) existingState.style.display = "none";
      setJobOfferHeroPublicStatusBadge(jobOffer || null, null);
    }

    function computeApplyState(posting) {
      var state = computeEffectiveApplyState(jobOffer || null, posting || null);
      return {
        isPublished: state.isPublished,
        applyEnabled: state.applyEnabled,
        hasDeadline: state.hasDeadline,
        deadlineInPast: state.deadlineInPast,
        applyOpen: state.applyOpen,
        blockedByOffer: state.blockedByOffer,
      };
    }

    function showExisting(posting) {
      card.style.display = "";
      if (emptyState) emptyState.style.display = "none";
      if (existingState) existingState.style.display = "";
      if (posting && posting.id) {
        card.setAttribute("data-posting-id", String(posting.id));
      } else {
        card.removeAttribute("data-posting-id");
      }
      setJobOfferHeroPublicStatusBadge(jobOffer || null, posting);

      if (summaryBlock) summaryBlock.style.display = "";
      if (editorBlock) editorBlock.style.display = (pageMode === "edit") ? "" : "none";

      var editLink = card.querySelector("[data-ie-jobposting-edit-link]");
      if (editLink && jobOfferId && window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.offerEdit === "function") {
        var editHref = window.IEPortal.links.offerEdit(jobOfferId);
        editLink.href = editHref;
        editLink.onclick = function (e) {
          e.preventDefault();
          if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
            window.IERouter.navigateTo(editHref);
          } else {
            window.location.href = editHref;
          }
        };
      }

      if (titleEl) {
        titleEl.textContent = posting.public_title || "Untitled posting";
      }
      if (slugEl) {
        slugEl.textContent = posting.slug || "—";
      }

      var lifecycle = computeApplyState(posting);
      var isPublished = lifecycle.isPublished;
      var applyEnabled = lifecycle.applyEnabled;
      var blockedByOffer = !!lifecycle.blockedByOffer;

      if (publishStatusEl) {
        var stateLabel;
        var stateClasses;
        if (!isPublished) {
          stateLabel = "Draft \u2013 Not Published";
          stateClasses = "bg-gray-100 text-gray-700";
        } else if (blockedByOffer) {
          stateLabel = "Published \u2013 Blocked by job offer status";
          stateClasses = "bg-amber-100 text-amber-800";
        } else if (lifecycle.applyOpen) {
          stateLabel = "Published \u2013 Applications Open";
          stateClasses = "bg-emerald-100 text-emerald-800";
        } else {
          stateLabel = "Published \u2013 Applications Closed";
          stateClasses = "bg-amber-100 text-amber-800";
        }
        publishStatusEl.textContent = stateLabel;
        publishStatusEl.className =
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
          stateClasses;
      }

      if (applyStatusEl) {
        var applyLabel;
        var applyClasses;

        if (blockedByOffer) {
          applyLabel = "Apply closed (job offer not open)";
          applyClasses = "bg-amber-100 text-amber-800";
        } else if (!isPublished) {
          applyLabel = applyEnabled
            ? "Apply settings saved (posting not published)"
            : "Apply closed (posting not published)";
          applyClasses = "bg-gray-100 text-gray-700";
        } else if (!applyEnabled) {
          applyLabel = "Apply Closed";
          applyClasses = "bg-amber-100 text-amber-800";
        } else if (lifecycle.deadlineInPast) {
          applyLabel = "Apply Closed (deadline passed)";
          applyClasses = "bg-amber-100 text-amber-800";
        } else {
          applyLabel = "Apply Open";
          applyClasses = "bg-emerald-100 text-emerald-800";
        }

        applyStatusEl.textContent = applyLabel;
        applyStatusEl.className =
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
          applyClasses;
      }

      if (applyDeadlineNoteEl) {
        if (!lifecycle.hasDeadline) {
          applyDeadlineNoteEl.textContent = "No apply deadline set.";
        } else if (lifecycle.deadlineInPast) {
          applyDeadlineNoteEl.textContent =
            "Apply deadline has passed; applications remain closed unless you extend the deadline.";
        } else {
          applyDeadlineNoteEl.textContent =
            "Apply deadline is set; applications will be considered closed after the deadline.";
        }
      }

      // Populate inline edit form with current values.
      if (formEl) {
        var titleField = getFieldEl("public_title");
        var locationField = getFieldEl("public_location");
        var descriptionField = getFieldEl("public_description");
        var requirementsField = getFieldEl("public_requirements");
        var benefitsField = getFieldEl("public_benefits");
        var slugField = getFieldEl("slug");
        var applyDeadlineField = getFieldEl("apply_deadline");

        if (titleField) titleField.value = posting.public_title || "";
        if (locationField) locationField.value = posting.public_location || "";
        if (descriptionField)
          descriptionField.value = posting.public_description || "";
        if (requirementsField)
          requirementsField.value = posting.public_requirements || "";
        if (benefitsField) benefitsField.value = posting.public_benefits || "";
        if (slugField) slugField.value = posting.slug || "";
        if (applyDeadlineField) {
          if (posting.apply_deadline) {
            applyDeadlineField.value = posting.apply_deadline.split("T")[0];
          } else {
            applyDeadlineField.value = "";
          }
        }
      }

      // Switch controls: show effective state so labels and switches never contradict.
      // Published switch shows stored is_published; Apply switch shows effective apply-open state.
      if (publishToggleInput) {
        publishToggleInput.checked = !!isPublished;
        publishToggleInput.disabled = false;
      }
      if (applyToggleInput) {
        applyToggleInput.checked = !!lifecycle.applyOpen;
        var applyDisabled = !isPublished || blockedByOffer;
        applyToggleInput.disabled = applyDisabled;
        if (applyDisabledReasonEl) {
          if (applyDisabled) {
            applyDisabledReasonEl.textContent = !isPublished
              ? "Publish the posting first to open applications."
              : "The linked job offer is not open. Open the job offer to allow applications.";
            applyDisabledReasonEl.classList.remove("hidden");
          } else {
            applyDisabledReasonEl.textContent = "";
            applyDisabledReasonEl.classList.add("hidden");
          }
        }
      }
    }

    // If the related section already loaded the posting, show it immediately.
    if (preloadedPosting && preloadedPosting.id) {
      showExisting(preloadedPosting);
      wireSaveHandlers(preloadedPosting);
      wireLifecycleHandlers(preloadedPosting);
      return;
    }

    // Otherwise default to empty state, then loadAndRender() will update.
    showEmpty();
    if (!window.IESupabase || !window.IESupabase.getJobPostingByJobOfferId) {
      return;
    }

    function wireSaveHandlers(currentPosting) {
      // Form is used by the main page Save (entity shell). No separate Save Public Posting button.
    }

    function wireCopyLinkAndOpenPublic(currentPosting) {
      if (!currentPosting) return;
      var slug = currentPosting.slug || null;
      var url = getPublicPostingUrl(slug);

      if (copyLinkButton) {
        copyLinkButton.onclick = function () {
          if (!url) {
            if (window.IESupabase && window.IESupabase.showError) {
              window.IESupabase.showError("No public URL available. Save a slug for this posting first.");
            }
            return;
          }
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(
                function () {
                  if (window.IESupabase && window.IESupabase.showSuccess) {
                    window.IESupabase.showSuccess("Apply link copied to clipboard.");
                  }
                },
                function () { throw new Error("Clipboard write failed"); }
              );
            } else {
              throw new Error("Clipboard not available");
            }
          } catch (e) {
            if (window.IESupabase && window.IESupabase.showError) {
              window.IESupabase.showError("Could not copy link. You can copy the URL from Open Public Page.");
            }
          }
        };
      }
      if (openPublicButton) {
        openPublicButton.onclick = function () {
          if (!url) {
            if (window.IESupabase && window.IESupabase.showError) {
              window.IESupabase.showError("No public URL available. Save a slug for this posting first.");
            }
            return;
          }
          window.open(url, "_blank", "noopener,noreferrer");
        };
      }
    }

    function wireLifecycleHandlers(currentPosting) {
      if (!currentPosting) return;

      wireCopyLinkAndOpenPublic(currentPosting);

      var lifecycle = computeApplyState(currentPosting);
      var isPublished = lifecycle.isPublished;
      var applyOpen = lifecycle.applyOpen;

      if (publishToggleInput) {
        publishToggleInput.checked = !!isPublished;
        publishToggleInput.disabled = false;
        publishToggleInput.onchange = null;
        publishToggleInput.onchange = async function () {
          if (
            !window.IESupabase ||
            !window.IESupabase.updateJobPosting ||
            !currentPosting.id
          ) {
            return;
          }
          var nextPublished = !!publishToggleInput.checked;
          var payload = { is_published: nextPublished };
          if (nextPublished && !currentPosting.published_at) {
            payload.published_at = new Date().toISOString();
          }
          publishToggleInput.disabled = true;
          try {
            var result = await window.IESupabase.updateJobPosting(
              currentPosting.id,
              payload
            );
            if (result && result.error) {
              if (window.IESupabase.showError) {
                window.IESupabase.showError(
                  result.error.message || "Error updating publication status for this posting."
                );
              }
              publishToggleInput.checked = !!isPublished;
              return;
            }
            var updated = (result && result.data) || Object.assign({}, currentPosting, payload);
            showExisting(updated);
            wireSaveHandlers(updated);
            wireLifecycleHandlers(updated);
            if (window.IESupabase.showSuccess) {
              window.IESupabase.showSuccess(
                nextPublished ? "Public job posting published." : "Public job posting unpublished."
              );
            }
          } catch (e) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(e && e.message ? e.message : "Error updating publication status.");
            }
            publishToggleInput.checked = !!isPublished;
          } finally {
            publishToggleInput.disabled = false;
          }
        };
      }

      if (applyToggleInput) {
        applyToggleInput.checked = !!lifecycle.applyOpen;
        var applyDisabled = !isPublished || lifecycle.blockedByOffer;
        applyToggleInput.disabled = applyDisabled;
        if (applyDisabledReasonEl) {
          if (applyDisabled) {
            applyDisabledReasonEl.textContent = !isPublished
              ? "Publish the posting first to open applications."
              : "The linked job offer is not open. Open the job offer to allow applications.";
            applyDisabledReasonEl.classList.remove("hidden");
          } else {
            applyDisabledReasonEl.textContent = "";
            applyDisabledReasonEl.classList.add("hidden");
          }
        }
        applyToggleInput.onchange = null;
        applyToggleInput.onchange = async function () {
          if (applyToggleInput.disabled) return;
          if (
            !window.IESupabase ||
            !window.IESupabase.updateJobPosting ||
            !currentPosting.id
          ) {
            return;
          }
          var nextApplyEnabled = !!applyToggleInput.checked;
          var payload = { apply_enabled: nextApplyEnabled };
          applyToggleInput.disabled = true;
          try {
            var result = await window.IESupabase.updateJobPosting(
              currentPosting.id,
              payload
            );
            if (result && result.error) {
              if (window.IESupabase.showError) {
                window.IESupabase.showError(
                  result.error.message || "Error updating apply status for this posting."
                );
              }
              applyToggleInput.checked = !!lifecycle.applyEnabled;
              return;
            }
            var updated = (result && result.data) || Object.assign({}, currentPosting, payload);
            showExisting(updated);
            wireSaveHandlers(updated);
            wireLifecycleHandlers(updated);
            if (window.IESupabase.showSuccess) {
              window.IESupabase.showSuccess(
                nextApplyEnabled ? "Apply opened for this posting." : "Apply closed for this posting."
              );
            }
          } catch (e) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(e && e.message ? e.message : "Error updating apply status.");
            }
            applyToggleInput.checked = !!lifecycle.applyEnabled;
          } finally {
            applyToggleInput.disabled = false;
          }
        };
      }
    }

    function loadAndRender() {
      window.IESupabase
        .getJobPostingByJobOfferId(jobOfferId)
        .then(function (result) {
          if (result && result.error) {
            console.error(
              "[JobOffer] getJobPostingByJobOfferId error:",
              result.error
            );
            // On error, keep this additive: do not block the rest of the page.
            return;
          }
          var posting = result && result.data ? result.data : null;
          if (!posting) {
            showEmpty();
            return;
          }
          showExisting(posting);
          wireSaveHandlers(posting);
          wireLifecycleHandlers(posting);
        })
        .catch(function (err) {
          console.error("[JobOffer] getJobPostingByJobOfferId exception:", err);
        });
    }

    if (createButton) {
      createButton.onclick = async function () {
        if (!jobOfferId) return;
        if (
          !window.IESupabase ||
          !window.IESupabase.createJobPostingFromJobOffer
        ) {
          return;
        }

        // Duplicate-safe behavior: re-check for an existing posting first.
        try {
          createButton.disabled = true;

          var existingCheck = await window.IESupabase.getJobPostingByJobOfferId(
            jobOfferId
          );
          if (existingCheck && existingCheck.data) {
            loadAndRender();
            if (window.IESupabase.showError) {
              window.IESupabase.showError(
                "A public job posting already exists for this job offer."
              );
            }
            return;
          }
        } catch (checkErr) {
          console.error(
            "[JobOffer] pre-create getJobPostingByJobOfferId exception:",
            checkErr
          );
          // Continue to creation attempt; DB unique constraint will still protect us.
        }

        try {
          var sourceOffer = jobOffer || null;
          if (!sourceOffer) {
            // Fallback: fetch the current job offer if not provided.
            if (
              window.IESupabase &&
              typeof window.IESupabase.getJobOfferById === "function"
            ) {
              var offerResult = await window.IESupabase.getJobOfferById(
                jobOfferId
              );
              if (!offerResult || offerResult.error) {
                if (offerResult && offerResult.error) {
                  console.error(
                    "[JobOffer] getJobOfferById error during posting create:",
                    offerResult.error
                  );
                  if (window.IESupabase.showError) {
                    window.IESupabase.showError(
                      offerResult.error.message ||
                        "Error loading job offer for public posting."
                    );
                  }
                }
                return;
              }
              sourceOffer = offerResult.data || null;
            }
          }

          if (!sourceOffer) {
            if (window.IESupabase && window.IESupabase.showError) {
              window.IESupabase.showError(
                "Job offer not available for creating a public posting."
              );
            }
            return;
          }

          var result = await window.IESupabase.createJobPostingFromJobOffer(
            sourceOffer
          );
          if (result && result.error) {
            console.error(
              "[JobOffer] createJobPostingFromJobOffer error:",
              result.error
            );
            if (window.IESupabase.showError) {
              window.IESupabase.showError(
                result.error.message ||
                  "Error creating public job posting from this offer."
              );
            }
            return;
          }

          var createdPosting = result && result.data ? result.data : null;
          if (createdPosting) {
            showExisting(createdPosting);
            wireSaveHandlers(createdPosting);
            wireLifecycleHandlers(createdPosting);
            if (window.IESupabase.showSuccess) {
              window.IESupabase.showSuccess("Public job posting created.");
            }
            if (sourceOffer && sourceOffer.id && typeof window.IESupabase.createAutoLog === "function") {
              window.IESupabase.createAutoLog("job_offer", sourceOffer.id, {
                event_type: "system_event",
                message: "Public job posting created",
                metadata: { action: "posting_created", job_posting_id: createdPosting.id },
              }).catch(function () {});
            }
          } else {
            // Defensive: if we didn't get a row back, fall back to a fresh load.
            loadAndRender();
          }
        } catch (e) {
          console.error(
            "[JobOffer] createJobPostingFromJobOffer exception:",
            e
          );
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError(
              e && e.message
                ? e.message
                : "Error creating public job posting from this offer."
            );
          }
        } finally {
          createButton.disabled = false;
        }
      };
    }

    loadAndRender();
  }

  function setPageMode(mode, id) {
    const form = document.querySelector("#jobOfferForm");
    // Entity detail page (job-offer.html) has no #jobOfferForm; only add-job-offer.html has the legacy form.
    // When form is null we must not run any form.querySelector / form-only logic or we throw.

    const params = IERouter.getJobOfferPageParams();
    const effectiveMode = (mode || params.mode || "create").toString().toLowerCase();
    const finalMode = effectiveMode === "edit" || effectiveMode === "view" ? effectiveMode : "create";

    // On entity page (job-offer.html) with create mode and no id, send user to the form page.
    if (!form && finalMode === "create" && !(id || (params && params.id))) {
      if (IERouter && typeof IERouter.navigateTo === "function") {
        IERouter.navigateTo("add-job-offer.html?mode=create");
      } else {
        window.location.href = "add-job-offer.html?mode=create";
      }
      return;
    }

    const headerTitleEl = document.querySelector("header h1");
    const docTitleEl = document.querySelector("title");
    const saveButton = form ? form.querySelector('button[type="submit"]') : null;
    const cancelButton = form ? form.querySelector("button[type='button']") : null;
    const actionsContainer = document.querySelector("#jobOfferActions");

    function setTitles(text) {
      if (headerTitleEl) headerTitleEl.textContent = text;
      if (docTitleEl) docTitleEl.textContent = text + " | Italian Experience Recruitment";
    }

    function setFormDisabled(disabled) {
      if (!form) return;
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

      function getViewUrl() {
        if (window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.offerView === "function") {
          return window.IEPortal.links.offerView(offerId);
        }
        return "job-offer.html?id=" + encodeURIComponent(String(offerId || "")) + "&mode=view";
      }

      async function handleSave() {
        var config = window.JobOfferEntityConfig;
        if (!config || !config.data || typeof config.data.buildSavePayload !== "function" || typeof config.data.performSave !== "function") {
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError("Save is not available.");
          }
          return;
        }
        var params = (window.IERouter && typeof window.IERouter.getJobOfferPageParams === "function")
          ? window.IERouter.getJobOfferPageParams()
          : { id: offerId, mode: "edit" };
        var state = { id: offerId, entity: offer || {}, mode: "edit", params: params };
        var payload;
        try {
          payload = await config.data.buildSavePayload(state);
        } catch (errBuild) {
          console.error("[JobOffer] buildSavePayload error:", errBuild);
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError(errBuild && errBuild.message ? errBuild.message : "Error preparing save.");
          }
          return;
        }
        var result;
        try {
          result = await config.data.performSave(state, payload || {});
        } catch (errSave) {
          console.error("[JobOffer] performSave error:", errSave);
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError(errSave && errSave.message ? errSave.message : "Error saving.");
          }
          return;
        }
        if (result && result.haltRedirect) {
          return;
        }
        if (window.IESupabase && window.IESupabase.showSuccess) {
          window.IESupabase.showSuccess("Job offer saved.");
        }
        window.location.href = getViewUrl();
      }

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
          onCancel: function () {
            var target = getViewUrl();
            if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
              window.IERouter.navigateTo(target);
            } else {
              window.location.href = target;
            }
          },
          onSave: effectiveModeForToolbar === "edit" ? handleSave : undefined,
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
                    {
                      populateFormFromOffer: populateFormFromOffer,
                      renderActionButtons: renderActionButtons,
                      onPipelineRefresh: function () {
                        if (typeof renderCompactApplicationsPipeline === "function") {
                          renderCompactApplicationsPipeline(offerId);
                        }
                      },
                    }
                  );
                }
                // Full state refresh: rerender Public Job Posting card and hero badge so they match offer status.
                var posting = null;
                if (window.IESupabase && typeof window.IESupabase.getJobPostingByJobOfferId === "function") {
                  try {
                    var res = await window.IESupabase.getJobPostingByJobOfferId(offerId);
                    if (res && res.data) posting = res.data;
                  } catch (_) {}
                }
                if (typeof window.setJobOfferHeroPublicStatusBadge === "function") {
                  window.setJobOfferHeroPublicStatusBadge(updatedOffer, posting);
                }
                if (typeof window.renderPublicJobPostingCard === "function") {
                  window.renderPublicJobPostingCard(offerId, updatedOffer, posting, "view");
                }
                if (typeof renderCompactApplicationsPipeline === "function") {
                  renderCompactApplicationsPipeline(offerId);
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
      if (!form) return;
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
      if (!form) return; // Entity detail page (job-offer.html) has no form; skip legacy form population.
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
      if (statusEl) statusEl.value = normalizeJobOfferStatus(offer.status);
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

          var activityWrap = document.getElementById("job-offer-activity-section-wrap");
          var activityContainer = document.getElementById("activity-container");
          if (isViewModeForOffer) {
            if (activityWrap) activityWrap.style.display = "";
            if (window.ActivitySection && typeof window.ActivitySection.init === "function" && activityContainer) {
              window.ActivitySection.init({
                entityType: "job_offer",
                entityId: offerId,
                container: activityContainer,
              });
            }
          } else {
            if (activityWrap) activityWrap.style.display = "none";
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
                onPipelineRefresh: function () {
                  if (typeof renderCompactApplicationsPipeline === "function") {
                    renderCompactApplicationsPipeline(offerId);
                  }
                },
              });
            }
            if (typeof renderCompactApplicationsPipeline === "function") {
              renderCompactApplicationsPipeline(offerId);
            }
            if (typeof renderPublicJobPostingCard === "function") {
              renderPublicJobPostingCard(offerId, offer);
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
    // Runs on both job-offer.html (entity detail, no #jobOfferForm) and add-job-offer.html (legacy form).
    // setPageMode guards form absence so entity page never runs form.querySelector on null.
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
    renderCompactApplicationsPipeline: renderCompactApplicationsPipeline,
    renderPublicJobPostingCard: renderPublicJobPostingCard,
  };
})();

