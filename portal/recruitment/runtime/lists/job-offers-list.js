// Job offers list runtime (delegated from IEListsRuntime shim)
(function () {
  "use strict";

  var shared = window.IEListsSharedHelpers || {};
  var renderEntityRow =
    shared.renderEntityRow ||
    function () {
      return document.createElement("tr");
    };
  var updatePaginationUI =
    shared.updatePaginationUI ||
    function () {};

  var JOB_OFFERS_PAGE_SIZE = 10;

  function initJobOffersPage() {
    var tbody = document.querySelector("[data-ie-joboffers-body]");
    if (!tbody) return;

    var selectAllCheckbox = document.querySelector(
      "[data-ie-joboffers-select-all]"
    );
    var bulkBar = document.querySelector("[data-ie-joboffers-bulkbar]");
    var bulkCountEl = document.querySelector(
      "[data-ie-joboffers-bulk-count]"
    );
    var bulkStatusSelect = document.querySelector(
      "[data-ie-joboffers-bulk-status]"
    );

    // Local selection state for job offers (bulk actions)
    var selection = {
      ids: new Set(),
      pageIds: [],
    };

    function getSelectedJobOfferIds() {
      return Array.from(selection.ids);
    }

    function setJobOfferSelected(id, selected) {
      if (id == null) return;
      var key = String(id);
      var next = new Set(selection.ids);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      selection.ids = next;
      syncJobOfferSelectionUI();
    }

    function setJobOfferPageIds(ids) {
      selection.pageIds = (ids || []).map(function (id) {
        return id == null ? id : String(id);
      });
      // Reset selection when a new page is rendered
      if (selection.ids.size > 0) {
        selection.ids = new Set();
      }
      syncJobOfferSelectionUI();
    }

    function clearJobOfferSelection() {
      if (selection.ids.size === 0) return;
      selection.ids = new Set();
      syncJobOfferSelectionUI();
    }

    function selectAllJobOffersOnCurrentPage() {
      selection.ids = new Set(selection.pageIds);
      syncJobOfferSelectionUI();
    }

    function syncJobOfferSelectionUI() {
      var pageIds = selection.pageIds || [];
      var selectedIds = Array.from(selection.ids);

      if (selectAllCheckbox) {
        if (!pageIds.length) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        } else {
          var selectedSet = new Set(
            selectedIds.map(function (id) {
              return String(id);
            })
          );
          var allOnPageSelected = pageIds.every(function (id) {
            return selectedSet.has(String(id));
          });
          var anyOnPageSelected = pageIds.some(function (id) {
            return selectedSet.has(String(id));
          });
          selectAllCheckbox.checked = allOnPageSelected;
          selectAllCheckbox.indeterminate =
            !allOnPageSelected && anyOnPageSelected;
        }
      }

      var count = selectedIds.length;
      if (bulkBar) {
        if (count > 0) {
          bulkBar.classList.remove("hidden");
        } else {
          bulkBar.classList.add("hidden");
        }
      }
      if (bulkCountEl) {
        bulkCountEl.textContent = String(count);
      }

      // Keep row checkboxes in sync with selection state
      try {
        var tableBody = document.querySelector("[data-ie-joboffers-body]");
        if (tableBody) {
          var selectedSetForRows = new Set(
            selectedIds.map(function (id) {
              return String(id);
            })
          );
          var checkboxes = tableBody.querySelectorAll(
            "[data-ie-joboffer-select]"
          );
          checkboxes.forEach(function (checkbox) {
            var id = checkbox.getAttribute("data-id");
            if (!id) return;
            checkbox.checked = selectedSetForRows.has(String(id));
          });
        }
      } catch (err) {
        console.error("[IEListsRuntime] job offer checkbox sync error:", err);
      }
    }

    var table = tbody.closest("table");
    var headerRow = table && table.querySelector("thead tr");
    var candidatesTh = headerRow
      ? Array.prototype.find.call(headerRow.children, function (th) {
          return th.textContent.trim().toLowerCase() === "candidates";
        })
      : null;
    if (candidatesTh) {
      var thAssociated = document.createElement("th");
      thAssociated.className = "ie-table-th font-bold";
      thAssociated.textContent = "Associated";
      var thRequired = document.createElement("th");
      thRequired.className = "ie-table-th font-bold";
      thRequired.textContent = "Required";
      candidatesTh.replaceWith(thAssociated, thRequired);
    }

    var filters = {
      title: "",
      clientId: "",
      city: "",
      state: "",
      contractType: "",
      offerStatus: "",
      archived: "active",
      excludeArchivedStatus: true,
    };
    var currentPage = 1;
    var limit = JOB_OFFERS_PAGE_SIZE;

    var titleInput = document.querySelector('[data-filter="offer-title"]');
    var clientSelect = document.querySelector('[data-filter="offer-client"]');
    var statusSelect = document.querySelector('[data-filter="offer-status"]');
    var cityInput = document.querySelector('[data-filter="offer-city"]');
    var stateInput = document.querySelector('[data-filter="offer-state"]');
    var contractSelect = document.querySelector(
      '[data-filter="offer-contract"]'
    );
    var archivedSelect = document.querySelector(
      '[data-filter="offer-archived"]'
    );

    var clientFilterBanner = document.querySelector(
      "[data-ie-client-filter-banner]"
    );
    var clientFilterNameEl = document.querySelector(
      "[data-ie-client-filter-name]"
    );
    var clearClientFilterBtn = document.querySelector(
      "[data-action='clear-client-filter']"
    );

    var params = new URLSearchParams(window.location.search);
    var clientFilter = params.get("client");
    var hasClientFilter = !!clientFilter;
    if (hasClientFilter) {
      filters.clientId = clientFilter;
    }

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderOffers();
    }

    function updateClientFilterBanner() {
      if (!clientFilterBanner) return;
      if (!filters.clientId) {
        clientFilterBanner.classList.add("hidden");
        return;
      }
      var name = "";
      if (clientSelect) {
        var selected = clientSelect.querySelector(
          'option[value="' + filters.clientId + '"]'
        );
        if (selected && selected.textContent) {
          name = selected.textContent;
        }
      }
      if (!name) name = filters.clientId;
      if (clientFilterNameEl) {
        clientFilterNameEl.textContent = name;
      }
      clientFilterBanner.classList.remove("hidden");
    }

    if (clientSelect && !clientSelect.dataset.iePopulated) {
      clientSelect.dataset.iePopulated = "true";
      var defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Tutti i clienti";
      clientSelect.innerHTML = "";
      clientSelect.appendChild(defaultOpt);
      if (window.IESupabase && window.IESupabase.fetchClientsPaginated) {
        window.IESupabase.fetchClientsPaginated({
          filters: { archived: "active" },
          page: 1,
          limit: 500,
        })
          .then(function (res) {
            var list = res.data || [];
            list.forEach(function (client) {
              if (client.is_archived) return;
              var opt = document.createElement("option");
              opt.value = client.id || "";
              opt.textContent = client.name || "—";
              clientSelect.appendChild(opt);
            });
            if (filters.clientId) {
              clientSelect.value = filters.clientId;
              updateClientFilterBanner();
            }
          })
          .catch(function () {});
      }
    }

    if (titleInput) {
      titleInput.addEventListener("input", function () {
        filters.title = this.value || "";
        currentPage = 1;
        renderOffers();
      });
    }
    if (clientSelect) {
      clientSelect.addEventListener("change", function () {
        filters.clientId = this.value || "";
        currentPage = 1;
        renderOffers();
        updateClientFilterBanner();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.offerStatus = this.value || "";
        currentPage = 1;
        renderOffers();
      });
    }
    if (cityInput) {
      cityInput.addEventListener("input", function () {
        filters.city = this.value || "";
        currentPage = 1;
        renderOffers();
      });
    }
    if (stateInput) {
      stateInput.addEventListener("input", function () {
        filters.state = this.value || "";
        currentPage = 1;
        renderOffers();
      });
    }
    if (contractSelect) {
      contractSelect.addEventListener("change", function () {
        filters.contractType = this.value || "";
        currentPage = 1;
        renderOffers();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
        currentPage = 1;
        renderOffers();
      });
    }

    var paginationEl =
      document
        .querySelector("[data-ie-joboffers-body]")
        ?.closest(".glass-card")
        ?.querySelector("[data-ie-pagination]") || null;
    if (paginationEl) {
      var prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      var nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          if (!this.disabled) goToPage(currentPage - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (!this.disabled) goToPage(currentPage + 1);
        });
      }
    }

    if (hasClientFilter) {
      // Keep existing status filter value; only client filter is enforced from URL.
    }

    if (clearClientFilterBtn) {
      clearClientFilterBtn.addEventListener("click", function () {
        filters.clientId = "";
        filters.offerStatus = "";
        if (clientSelect) clientSelect.value = "";
        if (statusSelect) statusSelect.value = "";

        var urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("client");
        var newUrl =
          window.location.pathname +
          (urlParams.toString() ? "?" + urlParams.toString() : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);

        if (clientFilterBanner) clientFilterBanner.classList.add("hidden");

        currentPage = 1;
        renderOffers();
      });
    }

    // Row checkbox selection wiring (delegated to tbody)
    tbody.addEventListener("change", function (event) {
      var checkbox = event.target.closest("[data-ie-joboffer-select]");
      if (!checkbox) return;
      var id = checkbox.getAttribute("data-id");
      if (!id) return;
      setJobOfferSelected(id, checkbox.checked);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        if (selectAllCheckbox.checked) {
          selectAllJobOffersOnCurrentPage();
        } else {
          clearJobOfferSelection();
        }
      });
    }

    tbody.addEventListener("click", function (event) {
      var target = event.target;

      var candidatesBtn = target.closest(
        "[data-action='view-offer-candidates']"
      );
      if (candidatesBtn) {
        var offerId = candidatesBtn.getAttribute("data-id");
        if (!offerId) return;
        if (
          typeof IERouter !== "undefined" &&
          IERouter &&
          typeof IERouter.navigateTo === "function"
        ) {
          IERouter.navigateTo("candidates", { offer: offerId });
        }
        return;
      }

      var titleBtn = target.closest("[data-action='view-offer-full']");
      if (titleBtn) {
        var fullId =
          titleBtn.getAttribute("data-id") ||
          (titleBtn.closest("tr") &&
            titleBtn.closest("tr").getAttribute("data-id"));
        if (!fullId) return;
        if (
          typeof IERouter !== "undefined" &&
          IERouter &&
          typeof IERouter.navigateTo === "function" &&
          window.IEPortal &&
          window.IEPortal.links
        ) {
          IERouter.navigateTo(window.IEPortal.links.offerView(fullId));
        }
      }
    });

    function showJobOfferBulkSummaryMessage(kind, message) {
      try {
        if (
          window.IESupabase &&
          typeof window.IESupabase.showSuccess === "function" &&
          kind === "success"
        ) {
          window.IESupabase.showSuccess(message);
          return;
        }
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function" &&
          kind === "error"
        ) {
          window.IESupabase.showError(message, "jobOffersBulk");
          return;
        }
      } catch (err) {
        console.error("[IEListsRuntime] job offers bulk message error:", err);
      }
      if (kind === "error") {
        window.alert(message);
      } else {
        console.log(message);
      }
    }

    async function runJobOfferBulkArchive(selectedIds) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length) return;
      if (
        !window.IESupabase ||
        typeof window.IESupabase.archiveJobOffer !== "function"
      ) {
        showJobOfferBulkSummaryMessage(
          "error",
          "Archive operation is not available."
        );
        return;
      }
      var success = 0;
      var failed = 0;
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        try {
          var res = await window.IESupabase.archiveJobOffer(id);
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] archiveJobOffer bulk error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showJobOfferBulkSummaryMessage(
          "success",
          "Archived " + success + " job offers."
        );
      } else if (success && failed) {
        showJobOfferBulkSummaryMessage(
          "error",
          "Archived " + success + " job offers, " + failed + " failed."
        );
      } else {
        showJobOfferBulkSummaryMessage(
          "error",
          "Failed to archive selected job offers."
        );
      }
      clearJobOfferSelection();
      renderOffers();
    }

    async function runJobOfferBulkChangeStatus(selectedIds, newStatus) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length || !newStatus) return;
      if (
        !window.IESupabase ||
        typeof window.IESupabase.updateJobOffer !== "function"
      ) {
        showJobOfferBulkSummaryMessage(
          "error",
          "Status update operation is not available."
        );
        return;
      }
      var success = 0;
      var failed = 0;
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        try {
          var res = await window.IESupabase.updateJobOffer(id, {
            status: newStatus,
          });
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] updateJobOffer bulk status error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showJobOfferBulkSummaryMessage(
          "success",
          "Updated status for " + success + " job offers."
        );
      } else if (success && failed) {
        showJobOfferBulkSummaryMessage(
          "error",
          "Updated status for " + success + " job offers, " + failed + " failed."
        );
      } else {
        showJobOfferBulkSummaryMessage(
          "error",
          "Failed to update status for selected job offers."
        );
      }
      clearJobOfferSelection();
      renderOffers();
    }

    if (bulkBar) {
      bulkBar.addEventListener("click", function (event) {
        var archiveBtn = event.target.closest(
          "[data-action='joboffers-bulk-archive']"
        );
        var clearBtn = event.target.closest(
          "[data-action='joboffers-bulk-clear']"
        );
        var applyStatusBtn = event.target.closest(
          "[data-action='joboffers-bulk-apply-status']"
        );

        if (archiveBtn) {
          var idsForArchive = getSelectedJobOfferIds();
          if (!idsForArchive.length) return;
          archiveBtn.disabled = true;
          runJobOfferBulkArchive(idsForArchive).finally(function () {
            archiveBtn.disabled = false;
          });
          return;
        }

        if (clearBtn) {
          clearJobOfferSelection();
          return;
        }

        if (applyStatusBtn) {
          var statusValue = bulkStatusSelect ? bulkStatusSelect.value : "";
          if (!statusValue) {
            showJobOfferBulkSummaryMessage(
              "error",
              "Please select a status to apply."
            );
            return;
          }
          var idsForStatus = getSelectedJobOfferIds();
          if (!idsForStatus.length) return;
          applyStatusBtn.disabled = true;
          runJobOfferBulkChangeStatus(idsForStatus, statusValue).finally(
            function () {
              applyStatusBtn.disabled = false;
            }
          );
        }
      });
    }

    function mapJobOfferRow(r) {
      var location =
        r.location ||
        [r.city, r.state]
          .filter(function (x) {
            return x;
          })
          .join(", ");
      var candidatesCount = (r.candidate_job_associations || []).filter(
        function (a) {
          return a && a.candidates && !a.candidates.is_archived;
        }
      ).length;
      return {
        id: r.id,
        title: r.title != null ? r.title : "",
        position: r.position != null ? r.position : "",
        description: r.description != null ? r.description : "",
        client_id: r.client_id != null ? r.client_id : null,
        client_name: r.client_name != null ? r.client_name : "",
        salary: r.salary != null ? r.salary : "",
        city: r.city != null ? r.city : "",
        state: r.state != null ? r.state : "",
        location: location,
        deadline: r.deadline != null ? r.deadline : null,
        status: r.status != null ? r.status : "open",
        created_at: r.created_at,
        is_archived: !!r.is_archived,
        candidatesCount: candidatesCount,
        positions: r.positions != null ? Number(r.positions) : 0,
      };
    }

    /**
     * Normalize job offer status to canonical set: open, inprogress, closed, archived.
     * "active" is treated as "open" for consistency.
     */
    function normalizeJobOfferStatusForList(status) {
      var s = (status || "").toString().toLowerCase().trim();
      if (s === "active") return "open";
      if (s === "in progress") return "inprogress";
      return s || "open";
    }

    /**
     * Compute public posting status for list display.
     * Combines job_postings state and job_offer.status.
     * @param {object} row - job offer row { id, status }
     * @param {object|null} posting - job_postings row or null
     * @returns {{ label: string, dotClass: string }}
     */
    function computePublicPostingStatus(row, posting) {
      var canonical = normalizeJobOfferStatusForList(row.status);
      var isOfferActive = canonical === "open";

      if (!posting) {
        return { label: "Not created", dotClass: "bg-gray-400" };
      }
      if (!isOfferActive) {
        return { label: "Blocked", dotClass: "bg-gray-500" };
      }
      if (!posting.is_published) {
        return { label: "Draft", dotClass: "bg-gray-400" };
      }
      var applyEnabled = !!posting.apply_enabled;
      var deadlineStr = posting.apply_deadline || null;
      var deadlineInPast = false;
      if (deadlineStr) {
        if (
          window.IEJobPostingDeadline &&
          typeof window.IEJobPostingDeadline.isApplyDeadlinePassed ===
            "function"
        ) {
          deadlineInPast =
            window.IEJobPostingDeadline.isApplyDeadlinePassed(deadlineStr);
        } else {
          var d = new Date(deadlineStr);
          deadlineInPast =
            !isNaN(d.getTime()) && d.getTime() < Date.now();
        }
      }
      var applyOpen = applyEnabled && (!deadlineStr || !deadlineInPast);
      if (applyOpen) {
        return { label: "Live", dotClass: "bg-emerald-500" };
      }
      return { label: "Closed", dotClass: "bg-amber-500" };
    }

    async function renderOfferRows(rows, tbodyEl) {
      var targetBody = tbodyEl || tbody;
      targetBody.innerHTML = "";
      if (!rows.length) {
        targetBody.innerHTML =
          '<tr><td colspan="11" class="px-6 py-8 text-center text-gray-400">No job offers found.</td></tr>';
        return;
      }
      if (window.IESupabase) window.IE_ACTIVE_JOB_OFFER_ID = rows[0].id;

      var postingsMap = {};
      if (
        window.IESupabase &&
        typeof window.IESupabase.getJobPostingsByJobOfferIds === "function"
      ) {
        var ids = rows
          .map(function (r) {
            return r.id;
          })
          .filter(Boolean);
        var postingsResult =
          await window.IESupabase.getJobPostingsByJobOfferIds(ids);
        var postingsList =
          postingsResult && postingsResult.data ? postingsResult.data : [];
        postingsList.forEach(function (p) {
          if (p && p.job_offer_id) {
            postingsMap[String(p.job_offer_id)] = p;
          }
        });
      }

      var associationResults = await Promise.all(
        rows.map(function (row) {
          return window.IESupabase &&
            window.IESupabase.fetchCandidatesForJobOffer
            ? window.IESupabase.fetchCandidatesForJobOffer(row.id)
            : Promise.resolve({ data: [] });
        })
      );

      rows.forEach(function (row, i) {
        var associations = (associationResults[i] || {}).data || [];
        var associatedActive = associations.filter(function (a) {
          var s = (a.status || "").toString().toLowerCase();
          return (
            s !== "rejected" &&
            s !== "not_selected" &&
            s !== "withdrawn"
          );
        }).length;
        var hiredCount = associations.filter(function (a) {
          var s = (a.status || "").toString().toLowerCase();
          return s === "hired";
        }).length;
        var positions = row.positions || 0;

        var clientValue = row.client_name || "—";
        var locationValue = row.location || "—";
        var createdAtValue = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "—";
        var badgeClass =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime.getOfferStatusBadgeClassForList ===
            "function"
            ? window.IEStatusRuntime.getOfferStatusBadgeClassForList(
                row.status
              )
            : "badge-open";
        var statusLabel =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime.formatOfferStatusLabelForList ===
            "function"
            ? window.IEStatusRuntime.formatOfferStatusLabelForList(
                row.status
              )
            : row.status || "Open";

        var postingForRow = postingsMap[String(row.id)] || null;
        var publicStatus = computePublicPostingStatus(
          row,
          postingForRow
        );
        var publicCellHtml =
          '<span class="inline-flex items-center gap-1.5" title="Public posting: ' +
          (window.escapeHtml
            ? window.escapeHtml(publicStatus.label)
            : publicStatus.label) +
          '">' +
          '<span class="inline-block w-2 h-2 rounded-full ' +
          publicStatus.dotClass +
          '" aria-hidden="true"></span>' +
          '<span class="text-xs font-medium text-gray-700">' +
          (window.escapeHtml
            ? window.escapeHtml(publicStatus.label)
            : publicStatus.label) +
          "</span>" +
          "</span>";

        var associatedCellHtml =
          '<button type="button" data-action="view-offer-candidates" data-id="' +
          (window.escapeHtml
            ? window.escapeHtml(row.id)
            : row.id) +
          '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-bold">' +
          (window.escapeHtml
            ? window.escapeHtml(String(associatedActive))
            : String(associatedActive)) +
          "</button>";
        var countColorClass = "text-green-600";
        if (positions > 0 && hiredCount >= positions) {
          countColorClass = "text-red-500";
        }
        var requiredCellHtml =
          '<span class="' +
          countColorClass +
          '">' +
          (window.escapeHtml
            ? window.escapeHtml(String(hiredCount))
            : String(hiredCount)) +
          " / " +
          (window.escapeHtml
            ? window.escapeHtml(String(positions))
            : String(positions)) +
          "</span>";

        var jobTitleViewUrl =
          window.IEPortal &&
          window.IEPortal.links &&
          typeof window.IEPortal.links.offerView === "function"
            ? window.IEPortal.links.offerView(row.id)
            : "recruitment/job-offer.html?id=" +
              encodeURIComponent(String(row.id)) +
              "&mode=view";
        var clientCellHtml = row.client_id
          ? '<span class="entity-link ie-text-muted" data-entity-type="client" data-entity-id="' +
            (window.escapeHtml
              ? window.escapeHtml(String(row.client_id))
              : String(row.client_id)) +
            '">' +
            (window.escapeHtml
              ? window.escapeHtml(clientValue)
              : clientValue) +
            "</span>"
          : '<span class="ie-text-muted">' +
            (window.escapeHtml
              ? window.escapeHtml(clientValue)
              : clientValue) +
            "</span>";

        var selectionCellHtml =
          '<input type="checkbox" class="ie-table-checkbox" data-ie-joboffer-select data-id="' +
          (window.escapeHtml
            ? window.escapeHtml(
                String(row.id != null ? row.id : "")
              )
            : String(row.id != null ? row.id : "")) +
          '"' +
          (selection.ids.has(String(row.id)) ? " checked" : "") +
          ">";

        var tr = renderEntityRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: jobTitleViewUrl,
          editUrl:
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.offerEdit === "function"
              ? window.IEPortal.links.offerEdit(row.id)
              : "#",
          title: row.title || "—",
          isArchived: row.is_archived,
          archivedList: false,
          actionCellOpts: {
            showPreviewButton: false,
            editTitle: "Edit job offer",
            archiveTitle: "Archive job offer",
          },
          leadingCells: [selectionCellHtml],
          middleCells: [
            '<span class="ie-text-muted">' +
              (window.escapeHtml
                ? window.escapeHtml(row.position || "—")
                : row.position || "—") +
              "</span>",
            clientCellHtml,
            '<span class="ie-text-muted">' +
              (window.escapeHtml
                ? window.escapeHtml(locationValue)
                : locationValue) +
              "</span>",
            '<span class="badge ' +
              badgeClass +
              '">' +
              (window.escapeHtml
                ? window.escapeHtml(statusLabel)
                : statusLabel) +
              "</span>",
            publicCellHtml,
            associatedCellHtml,
            requiredCellHtml,
            '<span class="ie-table-cell--date">' +
              (window.escapeHtml
                ? window.escapeHtml(createdAtValue)
                : createdAtValue) +
              "</span>",
          ],
          rowTitle:
            typeof formatLastUpdatedMeta === "function"
              ? formatLastUpdatedMeta(row)
              : "",
        });
        targetBody.appendChild(tr);
      });
    }

    function renderOffers() {
      var paginationContainer =
        document
          .querySelector("[data-ie-joboffers-body]")
          ?.closest(".glass-card")
          ?.querySelector("[data-ie-pagination]") || null;

      // Reset selection whenever the list is being (re)loaded
      clearJobOfferSelection();

      if (
        window.IESupabase &&
        window.IESupabase.fetchJobOffersPaginated
      ) {
        tbody.innerHTML =
          '<tr><td colspan="11" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>';
        window.IESupabase.fetchJobOffersPaginated({
          filters: filters,
          page: currentPage,
          limit: limit,
        })
          .then(async function (result) {
            var rows = (result.data || []).map(mapJobOfferRow);
            var totalCount = result.totalCount != null ? result.totalCount : 0;
            var totalPages = Math.max(
              1,
              Math.ceil(totalCount / limit)
            );
            if (currentPage > totalPages && totalPages > 0) {
              currentPage = totalPages;
              renderOffers();
              return;
            }

            // Track IDs present on this page for header "select all"
            setJobOfferPageIds(
              rows
                .map(function (row) {
                  return row && row.id;
                })
                .filter(function (id) {
                  return id != null;
                })
            );

            await renderOfferRows(rows, tbody);
            updatePaginationUI(
              paginationContainer,
              totalCount,
              currentPage,
              limit,
              rows.length
            );
          })
          .catch(function (err) {
            console.error(
              "[ItalianExperience] fetchJobOffersPaginated error:",
              err
            );
            tbody.innerHTML =
              '<tr><td colspan="11" class="px-6 py-8 text-center text-red-500">Loading error. Please try again later.</td></tr>';
            updatePaginationUI(
              paginationContainer,
              0,
              1,
              limit,
              0
            );
          });
        return;
      }

      if (typeof fetchJobOffers === "function") {
        fetchJobOffers(filters).then(async function (rows) {
          rows.sort(function (a, b) {
            return Number(a.is_archived) - Number(b.is_archived);
          });
          var totalCount = rows.length;
          var totalPages = Math.max(
            1,
            Math.ceil(totalCount / limit)
          );
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
          }
          var start = (currentPage - 1) * limit;
          var pageRows = rows.slice(start, start + limit);

          setJobOfferPageIds(
            pageRows
              .map(function (row) {
                return row && row.id;
              })
              .filter(function (id) {
                return id != null;
              })
          );

          await renderOfferRows(pageRows, tbody);
          updatePaginationUI(
            paginationContainer,
            totalCount,
            currentPage,
            limit,
            pageRows.length
          );
        });
      }
    }

    renderOffers();
  }

  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});
  if (typeof runtime.initJobOffersPage !== "function") {
    runtime.initJobOffersPage = initJobOffersPage;
  }
})();

