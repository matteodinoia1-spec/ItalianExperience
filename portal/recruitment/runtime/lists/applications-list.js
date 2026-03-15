// Applications list runtime (delegated from IEListsRuntime shim)
(function () {
  "use strict";

  var shared = window.IEListsSharedHelpers || {};
  var updatePaginationUI =
    shared.updatePaginationUI ||
    function () {};

  var APPLICATIONS_PAGE_SIZE = 25;

  function initApplicationsPage() {
    var tbody = document.querySelector("[data-ie-applications-body]");
    if (!tbody) return;

    var selectAllCheckbox = document.querySelector(
      "[data-ie-applications-select-all]"
    );
    var bulkBar = document.querySelector(
      "[data-ie-applications-bulkbar]"
    );
    var bulkCountEl = document.querySelector(
      "[data-ie-applications-bulk-count]"
    );
    var bulkStatusSelect = document.querySelector(
      "[data-ie-applications-bulk-status]"
    );

    // Local selection state for applications (bulk actions)
    var applicationSelection = {
      ids: new Set(),
      pageIds: [],
    };

    function getSelectedApplicationIds() {
      return Array.from(applicationSelection.ids);
    }

    function setApplicationSelected(id, selected) {
      if (id == null) return;
      var key = String(id);
      var next = new Set(applicationSelection.ids);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      applicationSelection.ids = next;
      syncApplicationSelectionUI();
    }

    function setApplicationPageIds(ids) {
      applicationSelection.pageIds = (ids || []).map(function (id) {
        return id == null ? id : String(id);
      });
      // Reset selection when a new page is rendered
      if (applicationSelection.ids.size > 0) {
        applicationSelection.ids = new Set();
      }
      syncApplicationSelectionUI();
    }

    function clearApplicationSelection() {
      if (applicationSelection.ids.size === 0) return;
      applicationSelection.ids = new Set();
      syncApplicationSelectionUI();
    }

    function selectAllApplicationsOnCurrentPage() {
      applicationSelection.ids = new Set(applicationSelection.pageIds);
      syncApplicationSelectionUI();
    }

    function syncApplicationSelectionUI() {
      var pageIds = applicationSelection.pageIds || [];
      var selectedIds = Array.from(applicationSelection.ids);

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

      // Sync row checkboxes with selection state
      try {
        var tableBody = document.querySelector(
          "[data-ie-applications-body]"
        );
        if (tableBody) {
          var selectedSetForRows = new Set(
            selectedIds.map(function (id) {
              return String(id);
            })
          );
          var checkboxes = tableBody.querySelectorAll(
            "[data-ie-application-select]"
          );
          checkboxes.forEach(function (checkbox) {
            var id = checkbox.getAttribute("data-id");
            if (!id) return;
            checkbox.checked = selectedSetForRows.has(String(id));
          });
        }
      } catch (err) {
        console.error(
          "[IEListsRuntime] application checkbox sync error:",
          err
        );
      }
    }

    var filters = {
      status: "",
      job_offer_id: "",
      client_id: "",
      candidate_id: "",
      candidate_name: "",
      date_from: "",
      date_to: "",
    };
    var currentPage = 1;
    var limit = APPLICATIONS_PAGE_SIZE;

    var statusSelect = document.querySelector(
      '[data-filter="application-status"]'
    );
    var offerSelect = document.querySelector(
      '[data-filter="application-offer"]'
    );
    var clientSelect = document.querySelector(
      '[data-filter="application-client"]'
    );
    var candidateInput = document.querySelector(
      '[data-filter="application-candidate"]'
    );
    var dateFromInput = document.querySelector(
      '[data-filter="application-date-from"]'
    );
    var dateToInput = document.querySelector(
      '[data-filter="application-date-to"]'
    );

    var applicationsParams = new URLSearchParams(window.location.search);
    var statusParam = applicationsParams.get("status");
    if (statusParam && statusSelect) {
      filters.status = statusParam;
      statusSelect.value = statusParam;
    }

    function getApplicationStatusBadgeClass(status) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime.getApplicationStatusBadgeClass ===
          "function"
      ) {
        return window.IEStatusRuntime.getApplicationStatusBadgeClass(status);
      }
      if (
        window.IEPortal &&
        typeof window.IEPortal.getApplicationStatusBadgeClass === "function"
      ) {
        return window.IEPortal.getApplicationStatusBadgeClass(status);
      }
      return "badge-applied";
    }

    function formatApplicationStatusLabel(status) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime.formatApplicationStatusLabel ===
          "function"
      ) {
        return window.IEStatusRuntime.formatApplicationStatusLabel(status);
      }
      if (
        window.IEPortal &&
        typeof window.IEPortal.formatApplicationStatusLabel === "function"
      ) {
        return window.IEPortal.formatApplicationStatusLabel(status);
      }
      return status || "Applied";
    }

    var paginationContainer =
      tbody.closest(".glass-card") &&
      tbody
        .closest(".glass-card")
        .querySelector("[data-ie-pagination]");
    var paginationEl = paginationContainer;

    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.status = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }
    if (offerSelect) {
      offerSelect.addEventListener("change", function () {
        filters.job_offer_id = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }
    if (clientSelect) {
      clientSelect.addEventListener("change", function () {
        filters.client_id = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }
    if (candidateInput) {
      candidateInput.addEventListener("input", function () {
        filters.candidate_name = this.value ? this.value.trim() : "";
        currentPage = 1;
        renderApplications();
      });
    }
    if (dateFromInput) {
      dateFromInput.addEventListener("change", function () {
        filters.date_from = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }
    if (dateToInput) {
      dateToInput.addEventListener("change", function () {
        filters.date_to = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderApplications();
    }

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

    if (offerSelect && !offerSelect.dataset.iePopulated) {
      offerSelect.dataset.iePopulated = "true";
      var defaultOfferOpt = document.createElement("option");
      defaultOfferOpt.value = "";
      defaultOfferOpt.textContent = "All offers";
      offerSelect.innerHTML = "";
      offerSelect.appendChild(defaultOfferOpt);
      if (
        window.IESupabase &&
        window.IESupabase.fetchJobOffersPaginated
      ) {
        window.IESupabase.fetchJobOffersPaginated({
          filters: { archived: "active" },
          page: 1,
          limit: 500,
        })
          .then(function (res) {
            (res.data || []).forEach(function (offer) {
              if (offer.is_archived) return;
              var opt = document.createElement("option");
              opt.value = offer.id || "";
              opt.textContent = (
                offer.title || offer.position || "—"
              ).toString();
              offerSelect.appendChild(opt);
            });
          })
          .catch(function () {});
      }
    }

    if (clientSelect && !clientSelect.dataset.iePopulated) {
      clientSelect.dataset.iePopulated = "true";
      var defaultClientOpt = document.createElement("option");
      defaultClientOpt.value = "";
      defaultClientOpt.textContent = "All clients";
      clientSelect.innerHTML = "";
      clientSelect.appendChild(defaultClientOpt);
      if (
        window.IESupabase &&
        window.IESupabase.fetchClientsPaginated
      ) {
        window.IESupabase.fetchClientsPaginated({
          filters: { archived: "active" },
          page: 1,
          limit: 500,
        })
          .then(function (res) {
            (res.data || []).forEach(function (client) {
              if (client.is_archived) return;
              var opt = document.createElement("option");
              opt.value = client.id || "";
              opt.textContent = (client.name || "—").toString();
              clientSelect.appendChild(opt);
            });
          })
          .catch(function () {});
      }
    }

    // Row checkbox selection wiring (delegated to tbody)
    tbody.addEventListener("change", function (event) {
      var checkbox = event.target.closest("[data-ie-application-select]");
      if (!checkbox) return;
      var id = checkbox.getAttribute("data-id");
      if (!id) return;
      setApplicationSelected(id, checkbox.checked);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        if (selectAllCheckbox.checked) {
          selectAllApplicationsOnCurrentPage();
        } else {
          clearApplicationSelection();
        }
      });
    }

    function showApplicationsBulkSummaryMessage(kind, message) {
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
          window.IESupabase.showError(message, "applicationsBulk");
          return;
        }
      } catch (err) {
        console.error(
          "[IEListsRuntime] applications bulk message error:",
          err
        );
      }
      if (kind === "error") {
        window.alert(message);
      } else {
        console.log(message);
      }
    }

    async function runApplicationsBulkArchive(selectedIds) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length) return;
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.updateApplicationStatus !==
          "function"
      ) {
        showApplicationsBulkSummaryMessage(
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
          var res =
            await window.IEQueries.applications.updateApplicationStatus(
              id,
              "withdrawn",
              {}
            );
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] updateApplicationStatus bulk archive error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showApplicationsBulkSummaryMessage(
          "success",
          "Archived " + success + " applications."
        );
      } else if (success && failed) {
        showApplicationsBulkSummaryMessage(
          "error",
          "Archived " +
            success +
            " applications, " +
            failed +
            " failed."
        );
      } else {
        showApplicationsBulkSummaryMessage(
          "error",
          "Failed to archive selected applications."
        );
      }
      clearApplicationSelection();
      renderApplications();
    }

    async function runApplicationsBulkChangeStatus(selectedIds, newStatus) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length || !newStatus) return;
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.updateApplicationStatus !==
          "function"
      ) {
        showApplicationsBulkSummaryMessage(
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
          var res =
            await window.IEQueries.applications.updateApplicationStatus(
              id,
              newStatus,
              {}
            );
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] updateApplicationStatus bulk status error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showApplicationsBulkSummaryMessage(
          "success",
          "Updated status for " + success + " applications."
        );
      } else if (success && failed) {
        showApplicationsBulkSummaryMessage(
          "error",
          "Updated status for " +
            success +
            " applications, " +
            failed +
            " failed."
        );
      } else {
        showApplicationsBulkSummaryMessage(
          "error",
          "Failed to update status for selected applications."
        );
      }
      clearApplicationSelection();
      renderApplications();
    }

    if (bulkBar) {
      bulkBar.addEventListener("click", function (event) {
        var archiveBtn = event.target.closest(
          "[data-action='applications-bulk-archive']"
        );
        var clearBtn = event.target.closest(
          "[data-action='applications-bulk-clear']"
        );
        var applyStatusBtn = event.target.closest(
          "[data-action='applications-bulk-apply-status']"
        );

        if (archiveBtn) {
          var idsForArchive = getSelectedApplicationIds();
          if (!idsForArchive.length) return;
          archiveBtn.disabled = true;
          runApplicationsBulkArchive(idsForArchive).finally(function () {
            archiveBtn.disabled = false;
          });
          return;
        }

        if (clearBtn) {
          clearApplicationSelection();
          return;
        }

        if (applyStatusBtn) {
          var statusValue = bulkStatusSelect ? bulkStatusSelect.value : "";
          if (!statusValue) {
            showApplicationsBulkSummaryMessage(
              "error",
              "Please select a status to apply."
            );
            return;
          }
          var idsForStatus = getSelectedApplicationIds();
          if (!idsForStatus.length) return;
          applyStatusBtn.disabled = true;
          runApplicationsBulkChangeStatus(idsForStatus, statusValue).finally(
            function () {
              applyStatusBtn.disabled = false;
            }
          );
        }
      });
    }

    function renderApplications() {
      // Reset selection whenever the list is being (re)loaded)
      clearApplicationSelection();

      if (
        !window.IESupabase ||
        !window.IESupabase.fetchApplicationsPaginated
      ) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">Applications not available.</td></tr>';
        if (paginationContainer) {
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        }
        return;
      }

      var filterPayload = {
        status: filters.status || undefined,
        job_offer_id: filters.job_offer_id || undefined,
        client_id: filters.client_id || undefined,
        candidate_id: filters.candidate_id || undefined,
        date_from: filters.date_from
          ? filters.date_from + "T00:00:00Z"
          : undefined,
        date_to: filters.date_to
          ? filters.date_to + "T23:59:59Z"
          : undefined,
      };

      tbody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>';

      window.IESupabase.fetchApplicationsPaginated(filterPayload, {
        page: currentPage,
        limit: limit,
      })
        .then(function (result) {
          var rows = result.data || [];
          var totalCount = result.totalCount != null ? result.totalCount : 0;
          var totalPages = Math.max(
            1,
            Math.ceil(totalCount / limit)
          );
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            renderApplications();
            return;
          }
          if (filters.candidate_name) {
            var term = filters.candidate_name.toLowerCase();
            rows = rows.filter(function (r) {
              return (
                (r.candidate_name || "")
                  .toLowerCase()
                  .indexOf(term) !== -1
              );
            });
          }
          tbody.innerHTML = "";

          setApplicationPageIds(
            rows
              .map(function (row) {
                return row && row.id;
              })
              .filter(function (id) {
                return id != null;
              })
          );
          var candidateViewUrl =
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.candidateView === "function"
              ? window.IEPortal.links.candidateView
              : function (id) {
                  return (
                    "recruitment/candidate.html?id=" +
                    encodeURIComponent(String(id || ""))
                  );
                };
          var escapeHtml =
            window.escapeHtml ||
            function (s) {
              return (s == null ? "" : String(s))
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
            };

          if (rows.length === 0) {
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No applications found.</td></tr>';
          } else {
            rows.forEach(function (row) {
              var tr = document.createElement("tr");
              tr.className = "table-row transition clickable-row";
              tr.setAttribute("data-entity", "application");
              tr.setAttribute("data-id", String(row.id || ""));
              var candidateUrl = candidateViewUrl(row.candidate_id);
              var selectionCellHtml =
                '<td class="ie-table-cell w-10">' +
                '<input type="checkbox" class="ie-table-checkbox" data-ie-application-select data-id="' +
                escapeHtml(String(row.id || "")) +
                '"' +
                (applicationSelection.ids.has(String(row.id))
                  ? " checked"
                  : "") +
                ">" +
                "</td>";

              tr.innerHTML =
                selectionCellHtml +
                '<td class="ie-table-cell ie-table-cell--primary"><a href="' +
                escapeHtml(candidateUrl) +
                '" class="table-link" data-entity-type="candidate" data-entity-id="' +
                escapeHtml(String(row.candidate_id || "")) +
                '">' +
                escapeHtml(row.candidate_name || "—") +
                "</a></td>" +
                '<td class="ie-table-cell ie-table-cell--secondary">' +
                escapeHtml(row.job_offer_title || "—") +
                "</td>" +
                '<td class="ie-table-cell ie-table-cell--secondary">' +
                escapeHtml(row.client_name || "—") +
                "</td>" +
                '<td class="ie-table-cell"><span class="badge ' +
                getApplicationStatusBadgeClass(row.status) +
                '">' +
                escapeHtml(formatApplicationStatusLabel(row.status)) +
                "</span></td>" +
                '<td class="ie-table-cell ie-table-cell--date">' +
                (row.created_at
                  ? new Date(row.created_at).toLocaleDateString("it-IT")
                  : "—") +
                "</td>";
              tbody.appendChild(tr);
            });
          }
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
            "[ItalianExperience] fetchApplicationsPaginated error:",
            err
          );
          tbody.innerHTML =
            '<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Loading error. Please try again later.</td></tr>';
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
    }

    renderApplications();
  }

  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});
  if (typeof runtime.initApplicationsPage !== "function") {
    runtime.initApplicationsPage = initApplicationsPage;
  }
})();

