// Clients list runtime (delegated from IEListsRuntime shim)
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

  var CLIENTS_PAGE_SIZE = 10;

  function initClientsPage() {
    var tbody = document.querySelector("[data-ie-clients-body]");
    if (!tbody) return;

    var selectAllCheckbox = document.querySelector(
      "[data-ie-clients-select-all]"
    );
    var bulkBar = document.querySelector("[data-ie-clients-bulkbar]");
    var bulkCountEl = document.querySelector(
      "[data-ie-clients-bulk-count]"
    );

    // Local selection state for clients (bulk actions)
    var clientSelection = {
      ids: new Set(),
      pageIds: [],
    };

    function getSelectedClientIds() {
      return Array.from(clientSelection.ids);
    }

    function setClientSelected(id, selected) {
      if (id == null) return;
      var key = String(id);
      var next = new Set(clientSelection.ids);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      clientSelection.ids = next;
      syncClientSelectionUI();
    }

    function setClientPageIds(ids) {
      clientSelection.pageIds = (ids || []).map(function (id) {
        return id == null ? id : String(id);
      });
      // Reset selection when a new page is rendered
      if (clientSelection.ids.size > 0) {
        clientSelection.ids = new Set();
      }
      syncClientSelectionUI();
    }

    function clearClientSelection() {
      if (clientSelection.ids.size === 0) return;
      clientSelection.ids = new Set();
      syncClientSelectionUI();
    }

    function selectAllClientsOnCurrentPage() {
      clientSelection.ids = new Set(clientSelection.pageIds);
      syncClientSelectionUI();
    }

    function syncClientSelectionUI() {
      var pageIds = clientSelection.pageIds || [];
      var selectedIds = Array.from(clientSelection.ids);

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
        var tableBody = document.querySelector("[data-ie-clients-body]");
        if (tableBody) {
          var selectedSetForRows = new Set(
            selectedIds.map(function (id) {
              return String(id);
            })
          );
          var checkboxes = tableBody.querySelectorAll(
            "[data-ie-client-select]"
          );
          checkboxes.forEach(function (checkbox) {
            var id = checkbox.getAttribute("data-id");
            if (!id) return;
            checkbox.checked = selectedSetForRows.has(String(id));
          });
        }
      } catch (err) {
        console.error("[IEListsRuntime] client checkbox sync error:", err);
      }
    }

    var filters = {
      name: "",
      city: "",
      state: "",
      country: "",
      archived: "active",
    };

    var currentPage = 1;
    var limit = CLIENTS_PAGE_SIZE;

    var nameInput = document.querySelector('[data-filter="client-name"]');
    var cityInput = document.querySelector('[data-filter="client-city"]');
    var stateInput = document.querySelector('[data-filter="client-state"]');
    var countryInput = document.querySelector(
      '[data-filter="client-country"]'
    );
    var archivedSelect = document.querySelector(
      '[data-filter="client-archived"]'
    );

    if (nameInput) {
      nameInput.addEventListener("input", function () {
        filters.name = this.value || "";
        currentPage = 1;
        renderClients();
      });
    }
    if (cityInput) {
      cityInput.addEventListener("input", function () {
        filters.city = this.value || "";
        currentPage = 1;
        renderClients();
      });
    }
    if (stateInput) {
      stateInput.addEventListener("input", function () {
        filters.state = this.value || "";
        currentPage = 1;
        renderClients();
      });
    }
    if (countryInput) {
      countryInput.addEventListener("input", function () {
        filters.country = this.value || "";
        currentPage = 1;
        renderClients();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
        currentPage = 1;
        renderClients();
      });
    }

    tbody.addEventListener("click", function (event) {
      var target = event.target;

      var offersBtn = target.closest("[data-action='view-client-offers']");
      if (offersBtn) {
        var clientId = offersBtn.getAttribute("data-id");
        if (!clientId) return;
        if (
          typeof IERouter !== "undefined" &&
          IERouter &&
          typeof IERouter.navigateTo === "function"
        ) {
          IERouter.navigateTo("job-offers", { client: clientId });
        }
      }
    });

    // Row checkbox selection wiring (delegated to tbody)
    tbody.addEventListener("change", function (event) {
      var checkbox = event.target.closest("[data-ie-client-select]");
      if (!checkbox) return;
      var id = checkbox.getAttribute("data-id");
      if (!id) return;
      setClientSelected(id, checkbox.checked);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        if (selectAllCheckbox.checked) {
          selectAllClientsOnCurrentPage();
        } else {
          clearClientSelection();
        }
      });
    }

    function showClientBulkSummaryMessage(kind, message) {
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
          window.IESupabase.showError(message, "clientsBulk");
          return;
        }
      } catch (err) {
        console.error("[IEListsRuntime] clients bulk message error:", err);
      }
      if (kind === "error") {
        window.alert(message);
      } else {
        console.log(message);
      }
    }

    async function runClientBulkArchive(selectedIds) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length) return;
      if (
        !window.IESupabase ||
        typeof window.IESupabase.archiveClient !== "function"
      ) {
        showClientBulkSummaryMessage(
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
          var res = await window.IESupabase.archiveClient(id);
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] archiveClient bulk error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showClientBulkSummaryMessage(
          "success",
          "Archived " + success + " clients."
        );
      } else if (success && failed) {
        showClientBulkSummaryMessage(
          "error",
          "Archived " +
            success +
            " clients, " +
            failed +
            " failed."
        );
      } else {
        showClientBulkSummaryMessage(
          "error",
          "Failed to archive selected clients."
        );
      }
      clearClientSelection();
      renderClients();
    }

    if (bulkBar) {
      bulkBar.addEventListener("click", function (event) {
        var archiveBtn = event.target.closest(
          "[data-action='clients-bulk-archive']"
        );
        var clearBtn = event.target.closest(
          "[data-action='clients-bulk-clear']"
        );

        if (archiveBtn) {
          var idsForArchive = getSelectedClientIds();
          if (!idsForArchive.length) return;
          archiveBtn.disabled = true;
          runClientBulkArchive(idsForArchive).finally(function () {
            archiveBtn.disabled = false;
          });
          return;
        }

        if (clearBtn) {
          clearClientSelection();
        }
      });
    }

    var paginationEl =
      document
        .querySelector("[data-ie-clients-body]")
        ?.closest(".glass-card")
        ?.querySelector("[data-ie-pagination]") || null;

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderClients();
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

    function renderClients() {
      var paginationContainer = paginationEl;

      // Reset selection whenever the list is being (re)loaded
      clearClientSelection();

      if (
        window.IESupabase &&
        window.IESupabase.fetchClientsPaginated
      ) {
        tbody.innerHTML =
          "<tr>" +
          '<td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">' +
          "    Loading clients..." +
          "  </td>" +
          "</tr>";
        window.IESupabase.fetchClientsPaginated({
          filters: filters,
          page: currentPage,
          limit: limit,
        })
          .then(function (result) {
            if (typeof window.debugLog === "function") {
              window.debugLog(
                "[ItalianExperience] fetchClientsPaginated result"
              );
            }
            var rows = result.data || [];
            var totalCount = result.totalCount != null ? result.totalCount : 0;
            var totalPages = Math.max(
              1,
              Math.ceil(totalCount / limit)
            );
            if (currentPage > totalPages && totalPages > 0) {
              currentPage = totalPages;
              renderClients();
              return;
            }

            tbody.innerHTML = "";

            // Track IDs present on this page for header "select all"
            setClientPageIds(
              rows
                .map(function (row) {
                  return row && row.id;
                })
                .filter(function (id) {
                  return id != null;
                })
            );

            if (!rows.length) {
              tbody.innerHTML =
                '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No clients found.</td></tr>';
              updatePaginationUI(
                paginationContainer,
                totalCount,
                currentPage,
                limit,
                0
              );
              return;
            }

            rows.forEach(function (row) {
              var activeOffersCount = (row.job_offers || []).filter(
                function (o) {
                  if (!o || o.is_archived) return false;
                  var status = o.status || "";
                  return (
                    status === "active" ||
                    status === "open" ||
                    status === "inprogress" ||
                    status === "in progress"
                  );
                }
              ).length;
              var activeOffersHtml =
                activeOffersCount > 0
                  ? '<button type="button" data-action="view-client-offers" data-id="' +
                    (window.escapeHtml
                      ? window.escapeHtml(row.id)
                      : row.id) +
                    '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' +
                    (window.escapeHtml
                      ? window.escapeHtml(String(activeOffersCount))
                      : String(activeOffersCount)) +
                    "</button>"
                  : "0";

              var selectionCellHtml =
                '<input type="checkbox" class="ie-table-checkbox" data-ie-client-select data-id="' +
                (window.escapeHtml
                  ? window.escapeHtml(
                      String(row.id != null ? row.id : "")
                    )
                  : String(row.id != null ? row.id : "")) +
                '"' +
                (clientSelection.ids.has(String(row.id)) ? " checked" : "") +
                ">";

              var tr = renderEntityRow({
                entityType: "client",
                id: row.id,
                viewUrl:
                  window.IEPortal &&
                  window.IEPortal.links &&
                  typeof window.IEPortal.links.clientView === "function"
                    ? window.IEPortal.links.clientView(row.id)
                    : "client.html?id=" +
                      encodeURIComponent(String(row.id)) +
                      "&mode=view",
                editUrl:
                  window.IEPortal &&
                  window.IEPortal.links &&
                  typeof window.IEPortal.links.clientEdit === "function"
                    ? window.IEPortal.links.clientEdit(row.id)
                    : "client.html?id=" +
                      encodeURIComponent(String(row.id)) +
                      "&mode=edit",
                title: row.name || "—",
                isArchived: row.is_archived,
                archivedList: false,
                actionCellOpts: {
                  showPreviewButton: false,
                  editTitle: "Edit client",
                  archiveTitle: "Archive client",
                },
                leadingCells: [selectionCellHtml],
                middleCells: [
                  '<span class="ie-text-muted">' +
                    (window.escapeHtml
                      ? window.escapeHtml(row.city || "—")
                      : row.city || "—") +
                    "</span>",
                  activeOffersHtml,
                  '<span class="ie-text-muted">' +
                    (window.escapeHtml
                      ? window.escapeHtml(row.email || "—")
                      : row.email || "—") +
                    "</span>",
                  '<span class="ie-text-muted">' +
                    (window.escapeHtml
                      ? window.escapeHtml(row.phone || "—")
                      : row.phone || "—") +
                    "</span>",
                ],
                rowTitle:
                  typeof formatLastUpdatedMeta === "function"
                    ? formatLastUpdatedMeta(row)
                    : "",
              });
              tbody.appendChild(tr);
            });

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
              "[ItalianExperience] fetchClientsPaginated error:",
              err
            );
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-sm">Loading error. Please try again later.</td></tr>';
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

      if (typeof fetchClients === "function") {
        fetchClients(filters).then(function (rows) {
          rows.sort(function (a, b) {
            return Number(a.is_archived) - Number(b.is_archived);
          });
          tbody.innerHTML = "";

          if (!rows.length) {
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No clients found.</td></tr>';
            if (paginationContainer) {
              updatePaginationUI(
                paginationContainer,
                0,
                1,
                limit,
                0
              );
            }
            return;
          }

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

          setClientPageIds(
            pageRows
              .map(function (row) {
                return row && row.id;
              })
              .filter(function (id) {
                return id != null;
              })
          );

          pageRows.forEach(function (row) {
            var activeOffersCount = (row.job_offers || []).filter(
              function (o) {
                if (!o || o.is_archived) return false;
                var status = o.status || "";
                return (
                  status === "active" ||
                  status === "open" ||
                  status === "inprogress" ||
                  status === "in progress"
                );
              }
            ).length;
            var activeOffersHtml =
              activeOffersCount > 0
                ? '<button type="button" data-action="view-client-offers" data-id="' +
                  (window.escapeHtml
                    ? window.escapeHtml(row.id)
                    : row.id) +
                  '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' +
                  (window.escapeHtml
                    ? window.escapeHtml(String(activeOffersCount))
                    : String(activeOffersCount)) +
                  "</button>"
                : "0";

            var selectionCellHtml =
              '<input type="checkbox" class="ie-table-checkbox" data-ie-client-select data-id="' +
              (window.escapeHtml
                ? window.escapeHtml(
                    String(row.id != null ? row.id : "")
                  )
                : String(row.id != null ? row.id : "")) +
              '"' +
              (clientSelection.ids.has(String(row.id)) ? " checked" : "") +
              ">";

            var tr = renderEntityRow({
              entityType: "client",
              id: row.id,
              viewUrl:
                window.IEPortal &&
                window.IEPortal.links &&
                typeof window.IEPortal.links.clientView === "function"
                  ? window.IEPortal.links.clientView(row.id)
                  : "client.html?id=" +
                    encodeURIComponent(String(row.id)) +
                    "&mode=view",
              editUrl:
                window.IEPortal &&
                window.IEPortal.links &&
                typeof window.IEPortal.links.clientEdit === "function"
                  ? window.IEPortal.links.clientEdit(row.id)
                  : "client.html?id=" +
                    encodeURIComponent(String(row.id)) +
                    "&mode=edit",
              title: row.name || "—",
              isArchived: row.is_archived,
              archivedList: false,
              actionCellOpts: {
                showPreviewButton: false,
                editTitle: "Edit client",
                archiveTitle: "Archive client",
              },
              leadingCells: [selectionCellHtml],
              middleCells: [
                '<span class="ie-text-muted">' +
                  (window.escapeHtml
                    ? window.escapeHtml(row.city || "—")
                    : row.city || "—") +
                  "</span>",
                activeOffersHtml,
                '<span class="ie-text-muted">' +
                  (window.escapeHtml
                    ? window.escapeHtml(row.email || "—")
                    : row.email || "—") +
                  "</span>",
                '<span class="ie-text-muted">' +
                  (window.escapeHtml
                    ? window.escapeHtml(row.phone || "—")
                    : row.phone || "—") +
                  "</span>",
              ],
              rowTitle:
                typeof formatLastUpdatedMeta === "function"
                  ? formatLastUpdatedMeta(row)
                  : "",
            });
            tbody.appendChild(tr);
          });

          if (paginationContainer) {
            updatePaginationUI(
              paginationContainer,
              totalCount,
              currentPage,
              limit,
              pageRows.length
            );
          }
        });
      }
    }

    renderClients();
  }

  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});
  if (typeof runtime.initClientsPage !== "function") {
    runtime.initClientsPage = initClientsPage;
  }
})();

