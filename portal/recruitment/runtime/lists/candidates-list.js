// Candidates list runtime (delegated from IEListsRuntime shim)
(function () {
  "use strict";

  var shared = window.IEListsSharedHelpers || {};
  var applyCandidateFilters =
    shared.applyCandidateFilters ||
    function (list) {
      return list;
    };
  var renderEntityRow =
    shared.renderEntityRow ||
    function () {
      return document.createElement("tr");
    };
  var updatePaginationUI =
    shared.updatePaginationUI ||
    function () {};
  var clearCandidateSelection =
    shared.clearCandidateSelection ||
    function () {};
  var setCandidateSelected =
    shared.setCandidateSelected ||
    function () {};
  var setCandidatePageIds =
    shared.setCandidatePageIds ||
    function () {};
  var selectAllCandidatesOnCurrentPage =
    shared.selectAllCandidatesOnCurrentPage ||
    function () {};

  var CANDIDATES_PAGE_SIZE = 10;

  function initCandidatesPage() {
    var tbody = document.querySelector("[data-ie-candidates-body]");
    if (!tbody) return;

    var importJsonBtn = document.querySelector(
      "[data-action='candidate-import-json']"
    );
    if (
      importJsonBtn &&
      window.IECandidateImportRuntime &&
      typeof window.IECandidateImportRuntime
        .openCandidateJsonImportModal === "function"
    ) {
      importJsonBtn.addEventListener("click", function () {
        window.IECandidateImportRuntime.openCandidateJsonImportModal();
      });
    }

    if (!tbody.__ieClientLinkBound) {
      tbody.addEventListener("click", function (event) {
        var link = event.target.closest(
          "[data-action='open-client-from-candidate']"
        );
        if (!link) return;
        event.preventDefault();
        var id = link.getAttribute("data-id");
        if (!id) return;
        if (
          typeof IERouter !== "undefined" &&
          IERouter &&
          typeof IERouter.navigateTo === "function"
        ) {
          var targetUrl = id;
          if (
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.clientView === "function"
          ) {
            targetUrl = window.IEPortal.links.clientView(id);
          } else {
            targetUrl =
              "client.html?id=" +
              encodeURIComponent(id) +
              "&mode=view";
          }
          IERouter.navigateTo(targetUrl);
        }
      });
      tbody.__ieClientLinkBound = true;
    }

    var filters = {
      name: "",
      position: "",
      address: "",
      status: "",
      source: "",
      archived: "active",
      jobOfferId: "",
    };
    var currentPage = 1;
    var limit = CANDIDATES_PAGE_SIZE;

    var nameInput = document.querySelector(
      '[data-filter="candidate-name"]'
    );
    var positionInput = document.querySelector(
      '[data-filter="candidate-position"]'
    );
    var addressInput = document.querySelector(
      '[data-filter="candidate-address"]'
    );
    var statusSelect = document.querySelector(
      '[data-filter="candidate-status"]'
    );
    var sourceSelect = document.querySelector(
      '[data-filter="candidate-source"]'
    );
    var archivedSelect = document.querySelector(
      '[data-filter="candidate-archived"]'
    );

    var offerFilterBanner = document.querySelector(
      "[data-ie-offer-filter-banner]"
    );
    var offerFilterTitleEl = document.querySelector(
      "[data-ie-offer-filter-title]"
    );
    var clearOfferFilterBtn = document.querySelector(
      "[data-action='clear-offer-filter']"
    );

    var params = new URLSearchParams(window.location.search);
    var offerFilter = params.get("offer");
    var hasOfferFilter = !!offerFilter;
    if (hasOfferFilter) {
      filters.jobOfferId = offerFilter;
    }
    var statusParam = params.get("status");
    if (statusParam && statusSelect) {
      var normalizedParam =
        statusParam === "new" ? "pending_review" : statusParam;
      filters.status = normalizedParam;
      statusSelect.value = normalizedParam;
    }

    var pendingReviewBanner = document.querySelector(
      "[data-ie-pending-review-banner]"
    );
    var pendingReviewShortcut = document.querySelector(
      "[data-ie-pending-review-shortcut]"
    );
    var selectAllCheckbox = document.querySelector(
      "[data-ie-candidates-select-all]"
    );
    var bulkBar = document.querySelector(
      "[data-ie-candidates-bulkbar]"
    );
    var bulkCountEl = document.querySelector(
      "[data-ie-candidates-bulk-count]"
    );
    var bulkStatusSelect = document.querySelector(
      "[data-ie-candidates-bulk-status]"
    );

    function showPendingReviewBanner() {
      if (!pendingReviewBanner) return;
      if (filters.status === "pending_review") {
        pendingReviewBanner.classList.remove("hidden");
      } else {
        pendingReviewBanner.classList.add("hidden");
      }
    }

    function showOfferFilterBanner() {
      if (!offerFilterBanner || !filters.jobOfferId) return;
      offerFilterBanner.classList.remove("hidden");
      if (offerFilterTitleEl) {
        offerFilterTitleEl.textContent = filters.jobOfferId;
      }
      if (
        window.IESupabase &&
        window.IESupabase.fetchJobOfferById &&
        offerFilterTitleEl
      ) {
        window.IESupabase
          .fetchJobOfferById(filters.jobOfferId)
          .then(function (result) {
            if (result && result.data && result.data.title) {
              offerFilterTitleEl.textContent = result.data.title;
            }
          })
          .catch(function () {});
      }
    }

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderCandidates();
    }

    if (nameInput) {
      nameInput.addEventListener("input", function () {
        filters.name = this.value || "";
        currentPage = 1;
        renderCandidates();
      });
    }
    if (positionInput) {
      positionInput.addEventListener("input", function () {
        filters.position = this.value || "";
        currentPage = 1;
        renderCandidates();
      });
    }
    if (addressInput) {
      addressInput.addEventListener("input", function () {
        filters.address = this.value || "";
        currentPage = 1;
        renderCandidates();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.status = this.value || "";
        currentPage = 1;
        showPendingReviewBanner();
        renderCandidates();
      });
    }

    var clearPendingReviewBtn = document.querySelector(
      "[data-action='clear-pending-review-filter']"
    );
    if (clearPendingReviewBtn) {
      clearPendingReviewBtn.addEventListener("click", function () {
        filters.status = "";
        if (statusSelect) statusSelect.value = "";
        var urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("status");
        var newUrl =
          window.location.pathname +
          (urlParams.toString()
            ? "?" + urlParams.toString()
            : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
        if (pendingReviewBanner) {
          pendingReviewBanner.classList.add("hidden");
        }
        currentPage = 1;
        renderCandidates();
      });
    }

    if (
      pendingReviewShortcut &&
      window.IERouter &&
      typeof window.IERouter.navigateTo === "function"
    ) {
      pendingReviewShortcut.addEventListener("click", function (e) {
        e.preventDefault();
        window.IERouter.navigateTo("candidates", {
          status: "pending_review",
        });
      });
    }
    if (sourceSelect) {
      sourceSelect.addEventListener("change", function () {
        filters.source = this.value || "";
        currentPage = 1;
        renderCandidates();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
        currentPage = 1;
        renderCandidates();
      });
    }

    if (clearOfferFilterBtn) {
      clearOfferFilterBtn.addEventListener("click", function () {
        filters.jobOfferId = "";

        var urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("offer");
        var newUrl =
          window.location.pathname +
          (urlParams.toString()
            ? "?" + urlParams.toString()
            : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);

        if (offerFilterBanner) {
          offerFilterBanner.classList.add("hidden");
        }

        currentPage = 1;
        renderCandidates();
      });
    }

    var paginationEl =
      document
        .querySelector("[data-ie-candidates-body]")      
        ?.closest(".glass-card")
        ?.querySelector("[data-ie-pagination]") || null;

    if (paginationEl) {
      var prevBtn = paginationEl.querySelector(
        "[data-ie-pagination-prev]"
      );
      var nextBtn = paginationEl.querySelector(
        "[data-ie-pagination-next]"
      );
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

    if (hasOfferFilter) {
      showOfferFilterBanner();
    }
    showPendingReviewBanner();

    tbody.addEventListener("click", function (event) {
      var cvBtn = event.target.closest("[data-action='view-cv']");
      if (cvBtn) {
        var id = cvBtn.getAttribute("data-id");
        if (!id || cvBtn.disabled) return;
        if (typeof window.openCandidateCvPreview === "function") {
          window.openCandidateCvPreview(id);
        }
      }
    });

    tbody.addEventListener("change", function (event) {
      var checkbox = event.target.closest(
        "[data-ie-candidate-select]"
      );
      if (!checkbox) return;
      var id = checkbox.getAttribute("data-id");
      if (!id) return;
      setCandidateSelected(id, checkbox.checked);
    });

    var CANDIDATE_SIGNED_PHOTO_CACHE = {};

    function getSelectedCandidateIds() {
      if (
        !window.IEListsRuntime ||
        typeof window.IEListsRuntime.getCandidateSelectionState !==
          "function"
      ) {
        return [];
      }
      try {
        var snapshot =
          window.IEListsRuntime.getCandidateSelectionState() || {};
        return Array.isArray(snapshot.ids) ? snapshot.ids.slice() : [];
      } catch (err) {
        console.error(
          "[IEListsRuntime] getSelectedCandidateIds error:",
          err
        );
        return [];
      }
    }

    function showBulkSummaryMessage(kind, message) {
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
          window.IESupabase.showError(message, "candidatesBulk");
          return;
        }
      } catch (err) {
        console.error(
          "[IEListsRuntime] bulk summary message error:",
          err
        );
      }
      if (kind === "error") {
        window.alert(message);
      } else {
        console.log(message);
      }
    }

    async function runCandidateBulkArchive(selectedIds) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length) return;
      if (
        !window.IESupabase ||
        typeof window.IESupabase.archiveCandidate !== "function"
      ) {
        showBulkSummaryMessage(
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
          var res = await window.IESupabase.archiveCandidate(id);
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] archiveCandidate bulk error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showBulkSummaryMessage(
          "success",
          "Archived " + success + " candidates."
        );
      } else if (success && failed) {
        showBulkSummaryMessage(
          "error",
          "Archived " +
            success +
            " candidates, " +
            failed +
            " failed."
        );
      } else {
        showBulkSummaryMessage(
          "error",
          "Failed to archive selected candidates."
        );
      }
      clearCandidateSelection();
      renderCandidates();
    }

    async function runCandidateBulkChangeStatus(
      selectedIds,
      newStatus
    ) {
      var ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (!ids.length || !newStatus) return;
      if (
        !window.IESupabase ||
        typeof window.IESupabase.updateCandidateProfileStatus !==
          "function"
      ) {
        showBulkSummaryMessage(
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
            await window.IESupabase.updateCandidateProfileStatus(
              id,
              newStatus
            );
          if (res && !res.error) {
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(
            "[IEListsRuntime] updateCandidateProfileStatus bulk error:",
            err
          );
          failed++;
        }
      }
      if (success && !failed) {
        showBulkSummaryMessage(
          "success",
          "Updated status for " + success + " candidates."
        );
      } else if (success && failed) {
        showBulkSummaryMessage(
          "error",
          "Updated status for " +
            success +
            " candidates, " +
            failed +
            " failed."
        );
      } else {
        showBulkSummaryMessage(
          "error",
          "Failed to update status for selected candidates."
        );
      }
      clearCandidateSelection();
      renderCandidates();
    }

    function mapCandidateRow(r) {
      var first_name = r.first_name != null ? r.first_name : "";
      var last_name = r.last_name != null ? r.last_name : "";
      var availability = "available";
      try {
        if (
          window.IEQueries &&
          window.IEQueries.candidates &&
          typeof window.IEQueries.candidates
            .deriveAvailabilityFromApplications === "function"
        ) {
          availability =
            window.IEQueries.candidates.deriveAvailabilityFromApplications(
              r.candidate_job_associations || []
            ) || "available";
        }
      } catch (e) {
        availability = "available";
      }
      return {
        id: r.id,
        first_name: first_name,
        last_name: last_name,
        position: r.position != null ? r.position : "",
        address: r.address != null ? r.address : "",
        availability: availability,
        source: r.source != null ? r.source : "",
        client_name: r.client_name || null,
        foto_url:
          r.foto_url ||
          "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(
              (first_name || "") + "+" + (last_name || "")
            ) +
            "&background=dbeafe&color=1e40af",
        photo_storage_path: r.photo_url || null,
        cv_url:
          typeof r.cv_url === "string" && r.cv_url.trim().length > 0
            ? r.cv_url
            : null,
        created_at: r.created_at,
        is_archived: r.is_archived || false,
        latest_association: r.latest_association || null,
      };
    }

    function renderCandidateRows(rows, targetTbody) {
      targetTbody.innerHTML = "";
      rows.forEach(function (row) {
        var mapped = mapCandidateRow(row);

        var selectionCellHtml =
          '<input type="checkbox" class="ie-table-checkbox" data-ie-candidate-select data-id="' +
          (window.escapeHtml
            ? window.escapeHtml(String(mapped.id != null ? mapped.id : ""))
            : String(mapped.id != null ? mapped.id : "")) +
          '"' +
          ">";

        var createdDate =
          mapped.created_at &&
          typeof window.IEFormatters !== "undefined" &&
          window.IEFormatters &&
          typeof window.IEFormatters.formatDateTime === "function"
            ? window.IEFormatters.formatDateTime(mapped.created_at)
            : mapped.created_at
            ? new Date(mapped.created_at).toLocaleDateString("it-IT")
            : "";

        var profileStatusLabel =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime
            .formatProfileStatusLabel === "function"
            ? window.IEStatusRuntime.formatProfileStatusLabel(
                row.status
              )
            : row.status || "Pending Approval";
        var profileStatusClass =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime
            .getProfileStatusBadgeClass === "function"
            ? window.IEStatusRuntime.getProfileStatusBadgeClass(
                row.status
              )
            : "badge-new";

        var availabilityLabel =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime
            .formatCandidateAvailabilityLabel === "function"
            ? window.IEStatusRuntime.formatCandidateAvailabilityLabel(
                mapped.availability
              )
            : mapped.availability || "available";
        var availabilityClass =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime
            .getCandidateAvailabilityBadgeClass === "function"
            ? window.IEStatusRuntime.getCandidateAvailabilityBadgeClass(
                mapped.availability
              )
            : "badge-open";

        var avatarUrl = mapped.foto_url;
        var signedUrl = null;
        if (
          mapped.photo_storage_path &&
          CANDIDATE_SIGNED_PHOTO_CACHE[mapped.photo_storage_path]
        ) {
          signedUrl =
            CANDIDATE_SIGNED_PHOTO_CACHE[mapped.photo_storage_path];
        }

        var middleCells = [];
        middleCells.push(
          '<div class="flex items-center gap-3">' +
            '<div class="flex-shrink-0">' +
            '<span class="inline-flex h-9 w-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200">' +
            '<img src="' +
            (window.escapeHtml
              ? window.escapeHtml(
                  signedUrl || avatarUrl || ""
                )
              : signedUrl || avatarUrl || "") +
            '" alt="" class="h-full w-full object-cover" loading="lazy">' +
            "</span>" +
            "</div>" +
            "</div>"
        );

        var fullName =
          [mapped.first_name, mapped.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || "—";
        var position =
          mapped.position && mapped.position.trim()
            ? mapped.position.trim()
            : "—";
        var clientName =
          mapped.client_name && mapped.client_name.trim()
            ? mapped.client_name.trim()
            : "—";
        var address =
          mapped.address && mapped.address.trim()
            ? mapped.address.trim()
            : "—";
        var source =
          mapped.source && mapped.source.trim()
            ? mapped.source.trim()
            : "—";

        middleCells.push(
          '<div class="flex flex-col">' +
            '<span class="font-medium text-gray-900">' +
            (window.escapeHtml
              ? window.escapeHtml(fullName)
              : fullName) +
            "</span>" +
            '<span class="text-xs text-gray-500">' +
            (window.escapeHtml
              ? window.escapeHtml(position)
              : position) +
            "</span>" +
            "</div>"
        );

        middleCells.push(
          '<span class="ie-text-muted">' +
            (window.escapeHtml
              ? window.escapeHtml(clientName)
              : clientName) +
            "</span>"
        );
        middleCells.push(
          '<span class="ie-text-muted">' +
            (window.escapeHtml
              ? window.escapeHtml(address)
              : address) +
            "</span>"
        );
        middleCells.push(
          '<span class="badge ' +
            availabilityClass +
            '">' +
            (window.escapeHtml
              ? window.escapeHtml(availabilityLabel)
              : availabilityLabel) +
            "</span>"
        );
        middleCells.push(
          '<span class="ie-text-muted">' +
            (window.escapeHtml ? window.escapeHtml(source) : source) +
            "</span>"
        );
        middleCells.push(
          '<span class="ie-text-muted">' +
            (window.escapeHtml
              ? window.escapeHtml(createdDate)
              : createdDate) +
            "</span>"
        );

        var tr = renderEntityRow({
          entityType: "candidate",
          id: mapped.id,
          viewUrl:
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.candidateView === "function"
              ? window.IEPortal.links.candidateView(mapped.id)
              : "candidate.html?id=" +
                encodeURIComponent(String(mapped.id)) +
                "&mode=view",
          editUrl:
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.candidateEdit === "function"
              ? window.IEPortal.links.candidateEdit(mapped.id)
              : "candidate.html?id=" +
                encodeURIComponent(String(mapped.id)) +
                "&mode=edit",
          title: fullName,
          isArchived: mapped.is_archived,
          archivedList: false,
          actionCellOpts: {
            showPreviewButton: false,
            editTitle: "Edit candidate",
            archiveTitle: "Archive candidate",
          },
          leadingCells: [selectionCellHtml],
          middleCells: middleCells,
          rowTitle: profileStatusLabel,
        });

        targetTbody.appendChild(tr);
      });
    }

    function renderCandidates() {
      var paginationContainer =
        document
          .querySelector("[data-ie-candidates-body]")
          ?.closest(".glass-card")
          ?.querySelector("[data-ie-pagination]") || null;

      clearCandidateSelection();

      if (
        window.IESupabase &&
        window.IESupabase.fetchCandidatesPaginated
      ) {
        tbody.innerHTML =
          '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>';
        window.IESupabase
          .fetchCandidatesPaginated({
            filters: filters,
            page: currentPage,
            limit: limit,
          })
          .then(function (result) {
            if (typeof window.debugLog === "function") {
              window.debugLog(
                "[ItalianExperience] fetchCandidatesPaginated result"
              );
            }
            var rows = result.data || [];
            var totalCount =
              result.totalCount != null ? result.totalCount : 0;
            var totalPages = Math.max(
              1,
              Math.ceil(totalCount / limit)
            );
            if (currentPage > totalPages && totalPages > 0) {
              currentPage = totalPages;
              renderCandidates();
              return;
            }

            tbody.innerHTML = "";

            setCandidatePageIds(
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
                '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">No candidates found.</td></tr>';
              if (paginationContainer) {
                updatePaginationUI(
                  paginationContainer,
                  totalCount,
                  currentPage,
                  limit,
                  0
                );
              }
              return;
            }

            renderCandidateRows(rows, tbody);
            if (paginationContainer) {
              updatePaginationUI(
                paginationContainer,
                totalCount,
                currentPage,
                limit,
                rows.length
              );
            }
          })
          .catch(function (err) {
            console.error(
              "[ItalianExperience] fetchCandidatesPaginated error:",
              err
            );
            tbody.innerHTML =
              '<tr><td colspan="10" class="px-6 py-8 text-center text-red-500">Loading error. Please try again later.</td></tr>';
            if (paginationContainer) {
              updatePaginationUI(
                paginationContainer,
                0,
                1,
                limit,
                0
              );
            }
          });
        return;
      }

      if (typeof window.fetchCandidates === "function") {
        window.fetchCandidates(filters).then(function (rows) {
          rows.sort(function (a, b) {
            return Number(a.is_archived) - Number(b.is_archived);
          });
          tbody.innerHTML = "";

          if (!rows.length) {
            tbody.innerHTML =
              '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">No candidates found.</td></tr>';
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

          setCandidatePageIds(
            pageRows
              .map(function (row) {
                return row && row.id;
              })
              .filter(function (id) {
                return id != null;
              })
          );

          renderCandidateRows(pageRows, tbody);

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

    if (bulkBar && bulkStatusSelect) {
      bulkBar.addEventListener("click", function (event) {
        var archiveBtn = event.target.closest(
          "[data-action='candidates-bulk-archive']"
        );
        var clearBtn = event.target.closest(
          "[data-action='candidates-bulk-clear']"
        );
        var applyStatusBtn = event.target.closest(
          "[data-action='candidates-bulk-apply-status']"
        );

        if (archiveBtn) {
          var idsForArchive = getSelectedCandidateIds();
          if (!idsForArchive.length) return;
          archiveBtn.disabled = true;
          runCandidateBulkArchive(idsForArchive).finally(function () {
            archiveBtn.disabled = false;
          });
          return;
        }

        if (applyStatusBtn) {
          var chosenStatus = bulkStatusSelect.value || "";
          if (!chosenStatus) return;
          var idsForStatus = getSelectedCandidateIds();
          if (!idsForStatus.length) return;
          applyStatusBtn.disabled = true;
          runCandidateBulkChangeStatus(
            idsForStatus,
            chosenStatus
          ).finally(function () {
            applyStatusBtn.disabled = false;
          });
          return;
        }

        if (clearBtn) {
          clearCandidateSelection();
        }
      });
    }

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        if (selectAllCheckbox.checked) {
          selectAllCandidatesOnCurrentPage();
        } else {
          clearCandidateSelection();
        }
      });
    }

    if (typeof window.fetchSignedCandidatePhotoUrl === "function") {
      document.addEventListener("mouseover", function (event) {
        var img = event.target.closest("[data-ie-candidate-photo]");
        if (!img) return;
        var storagePath = img.getAttribute("data-storage-path");
        if (!storagePath || CANDIDATE_SIGNED_PHOTO_CACHE[storagePath]) {
          return;
        }
        CANDIDATE_SIGNED_PHOTO_CACHE[storagePath] =
          "loading-placeholder";
        window
          .fetchSignedCandidatePhotoUrl(storagePath)
          .then(function (url) {
            if (!url) return;
            CANDIDATE_SIGNED_PHOTO_CACHE[storagePath] = url;
            if (img.getAttribute("data-storage-path") === storagePath) {
              img.src = url;
            }
          })
          .catch(function () {
            delete CANDIDATE_SIGNED_PHOTO_CACHE[storagePath];
          });
      });
    }

    renderCandidates();
  }

  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});
  if (typeof runtime.initCandidatesPage !== "function") {
    runtime.initCandidatesPage = initCandidatesPage;
  }

  window.IECandidatesListRuntime = {
    initCandidatesPage: initCandidatesPage,
  };
})();

