(function () {
  "use strict";

  var PAGE_SIZE =
    (window.ExternalSubmissionsApi &&
      window.ExternalSubmissionsApi.PAGE_SIZE) ||
    20;

  function formatDate(value) {
    if (
      window.ExternalSubmissionFormatters &&
      typeof window.ExternalSubmissionFormatters.formatDate === "function"
    ) {
      return window.ExternalSubmissionFormatters.formatDate(value) || "";
    }
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function formatStatus(status) {
    var s = (status || "").toString().toLowerCase();
    if (!s) return "pending_review";
    return s;
  }

  function formatStatusLabel(status) {
    var s = formatStatus(status);
    switch (s) {
      case "pending_review":
        return "Pending Review";
      case "rejected":
        return "Rejected";
      case "linked_existing":
        return "Linked to Existing";
      case "converted":
        return "Converted";
      default:
        return s;
    }
  }

  function getStatusBadgeClass(status) {
    var s = formatStatus(status);
    if (s === "pending_review") return "badge-open";
    if (s === "converted") return "badge-hired";
    if (s === "linked_existing") return "badge-inprogress";
    if (s === "rejected") return "badge-rejected";
    return "badge-open";
  }

  function buildJobOfferBadge(row) {
    var jobOfferId = row && row.job_offer_id;
    if (!jobOfferId) {
      return '<span class="ie-text-muted text-xs">No offer attached</span>';
    }
    var label = "Offer " + String(jobOfferId);
    var href;
    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerView === "function"
    ) {
      href = window.IEPortal.links.offerView(jobOfferId);
    } else {
      href = "job-offer.html?id=" + encodeURIComponent(String(jobOfferId));
    }
    return (
      '<a href="' +
      href +
      '" class="badge badge-open inline-flex items-center gap-1 text-xs" data-action="open-job-offer" data-id="' +
      String(jobOfferId) +
      '">Job Offer<span class="hidden sm:inline">#' +
      String(jobOfferId) +
      "</span></a>"
    );
  }

  function buildRow(submission, selectionState) {
    selectionState = selectionState || {};
    var tr = document.createElement("tr");
    tr.className =
      "table-row transition hover:bg-gray-50/70 cursor-pointer clickable-row";
    tr.dataset.id = String(submission.id);

    var createdAt = formatDate(submission.created_at);
    var statusNorm = formatStatus(submission.status);
    var statusLabel = formatStatusLabel(statusNorm);
    var badgeClass = getStatusBadgeClass(statusNorm);

    var sourceLabel = (submission.source || "—").toString().toUpperCase();
    var fullName = submission.full_name_computed || "—";

    var td;

    td = document.createElement("td");
    td.className = "ie-table-cell w-10 align-middle";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "ie-table-checkbox";
    checkbox.setAttribute("data-ie-external-row-select", "true");
    checkbox.value = String(submission.id);
    if (statusNorm !== "pending_review") {
      checkbox.disabled = true;
      checkbox.title =
        "Bulk actions are only available for submissions in Pending Review.";
    } else if (selectionState.isSelected) {
      checkbox.checked = true;
    }
    td.appendChild(checkbox);
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell ie-table-cell--primary";
    td.textContent = fullName;
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.textContent = submission.email || "—";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.textContent = submission.phone || "—";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.textContent = submission.submission_type || "—";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.innerHTML =
      '<span class="ie-text-muted text-xs font-medium">' +
      (window.escapeHtml ? window.escapeHtml(sourceLabel || "—") : sourceLabel || "—") +
      "</span>";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.innerHTML = buildJobOfferBadge(submission);
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.innerHTML =
      '<span class="ie-table-cell--date">' +
      (window.escapeHtml ? window.escapeHtml(createdAt || "") : createdAt || "") +
      "</span>";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell";
    td.innerHTML =
      '<span class="badge ' +
      badgeClass +
      '">' +
      (window.escapeHtml ? window.escapeHtml(statusLabel) : statusLabel) +
      "</span>";
    tr.appendChild(td);

    td = document.createElement("td");
    td.className = "ie-table-cell ie-table-actions text-center";
    td.innerHTML =
      '<button type="button" class="ie-btn ie-btn-secondary ie-btn-xs" data-action="open-submission" data-id="' +
      String(submission.id) +
      '">Open</button>';
    tr.appendChild(td);

    return tr;
  }

  function updatePaginationUI(container, totalCount, currentPage, limit, currentRowCount) {
    if (!container) return;
    var summaryEl = container.querySelector("[data-ie-pagination-summary]");
    var pagesEl = container.querySelector("[data-ie-pagination-pages]");
    var prevBtn = container.querySelector("[data-ie-pagination-prev]");
    var nextBtn = container.querySelector("[data-ie-pagination-next]");
    var totalPages = Math.max(1, Math.ceil(totalCount / limit));
    var page = Math.max(1, Math.min(currentPage, totalPages));

    if (summaryEl) {
      summaryEl.textContent =
        totalCount === 0
          ? "Showing 0 of 0 results"
          : "Showing " +
            currentRowCount +
            " of " +
            Number(totalCount).toLocaleString("en-US") +
            " results";
    }
    if (pagesEl) {
      pagesEl.textContent = "Page " + page + " of " + totalPages;
    }
    if (prevBtn) {
      prevBtn.disabled = page <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = page >= totalPages || totalCount === 0;
    }
  }

  function initExternalSubmissionsListPage() {
    var tbody = document.querySelector(
      "[data-ie-external-submissions-body]"
    );
    if (!tbody) return;

    var paginationEl = document.querySelector(
      "[data-ie-external-submissions-pagination]"
    );
    var statusSelect = document.querySelector(
      '[data-filter="submission-status"]'
    );

    var bulkBar = document.querySelector("[data-ie-external-bulkbar]");
    var bulkCountEl = document.querySelector(
      "[data-ie-external-bulk-count]"
    );
    var bulkNotesInput = document.querySelector(
      "[data-ie-external-bulk-notes]"
    );
    var bulkRejectBtn = document.querySelector(
      "[data-action='external-bulk-reject']"
    );
    var bulkClearBtn = document.querySelector(
      "[data-action='external-bulk-clear']"
    );
    var bulkMessageEl = document.querySelector(
      "[data-ie-external-bulk-message]"
    );
    var selectAllCheckbox = document.querySelector(
      "[data-ie-external-select-all]"
    );

    var selectedIds = new Set();
    var latestPageIds = [];
    var latestPagePendingIds = [];

    var filters = {
      status: "pending_review",
    };

    var params = new URLSearchParams(window.location.search || "");
    var statusParam = params.get("status");
    if (statusParam && statusParam !== "null") {
      filters.status = statusParam || "";
      if (statusSelect) {
        statusSelect.value = statusParam;
      }
    } else {
      if (statusSelect) {
        statusSelect.value = "pending_review";
      }
    }

    var currentPage = 1;

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderSubmissions();
    }

    function clearBulkSelection() {
      selectedIds.clear();
      latestPageIds.forEach(function (id) {
        var checkbox = tbody.querySelector(
          'input[data-ie-external-row-select][value="' + String(id) + '"]'
        );
        if (checkbox) {
          checkbox.checked = false;
        }
      });
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      if (bulkBar) {
        bulkBar.classList.add("hidden");
      }
      if (bulkMessageEl) {
        bulkMessageEl.classList.add("hidden");
        bulkMessageEl.textContent = "";
      }
    }

    function updateBulkBar() {
      if (!bulkBar || !bulkCountEl) return;
      var count = selectedIds.size;
      bulkCountEl.textContent = String(count);
      if (count > 0) {
        bulkBar.classList.remove("hidden");
      } else {
        bulkBar.classList.add("hidden");
      }

      if (selectAllCheckbox) {
        var pageSelectedCount = latestPagePendingIds.filter(function (id) {
          return selectedIds.has(String(id));
        }).length;
        if (pageSelectedCount === 0) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        } else if (pageSelectedCount === latestPagePendingIds.length) {
          selectAllCheckbox.checked = true;
          selectAllCheckbox.indeterminate = false;
        } else {
          selectAllCheckbox.indeterminate = true;
        }
      }
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.status = this.value || "";
        currentPage = 1;
        renderSubmissions();
      });
    }

    if (paginationEl) {
      var prevBtn = paginationEl.querySelector(
        "[data-ie-pagination-prev]"
      );
      var nextBtn = paginationEl.querySelector(
        "[data-ie-pagination-next]"
      );
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          if (!prevBtn.disabled) goToPage(currentPage - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (!nextBtn.disabled) goToPage(currentPage + 1);
        });
      }
    }

    tbody.addEventListener("click", function (event) {
      var target = event.target;
      var openBtn = target.closest("[data-action='open-submission']");
      if (openBtn) {
        event.stopPropagation();
        var idBtn = openBtn.getAttribute("data-id");
        if (!idBtn) return;
        navigateToDetail(idBtn);
        return;
      }

      var row = target.closest("tr[data-id]");
      if (!row) return;
      if (target.closest("a, button, svg, path, input[type='checkbox']"))
        return;
      var id = row.getAttribute("data-id");
      if (!id) return;
      navigateToDetail(id);
    });

    tbody.addEventListener("change", function (event) {
      var target = event.target;
      if (
        !target ||
        target.type !== "checkbox" ||
        !target.hasAttribute("data-ie-external-row-select")
      ) {
        return;
      }
      var id = target.value;
      if (!id) return;
      if (target.checked) {
        selectedIds.add(String(id));
      } else {
        selectedIds.delete(String(id));
      }
      updateBulkBar();
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        if (!latestPagePendingIds.length) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
          return;
        }
        if (selectAllCheckbox.checked) {
          latestPagePendingIds.forEach(function (id) {
            selectedIds.add(String(id));
          });
        } else {
          latestPagePendingIds.forEach(function (id) {
            selectedIds.delete(String(id));
          });
        }
        latestPagePendingIds.forEach(function (id) {
          var checkbox = tbody.querySelector(
            'input[data-ie-external-row-select][value="' + String(id) + '"]'
          );
          if (checkbox && !checkbox.disabled) {
            checkbox.checked = selectedIds.has(String(id));
          }
        });
        updateBulkBar();
      });
    }

    if (bulkClearBtn) {
      bulkClearBtn.addEventListener("click", function () {
        clearBulkSelection();
      });
    }

    if (bulkRejectBtn) {
      bulkRejectBtn.addEventListener("click", function () {
        if (
          !window.ExternalSubmissionsApi ||
          typeof window.ExternalSubmissionsApi.promoteSubmission !==
            "function"
        ) {
          return;
        }

        if (!selectedIds.size) {
          if (bulkMessageEl) {
            bulkMessageEl.textContent =
              "Select at least one submission to reject.";
            bulkMessageEl.classList.remove("hidden");
            bulkMessageEl.classList.remove("text-emerald-700");
            bulkMessageEl.classList.add("text-red-600");
          }
          return;
        }

        var ids = Array.from(selectedIds).map(function (id) {
          return String(id);
        });

        var pendingIds = ids.filter(function (id) {
          return latestPagePendingIds.indexOf(id) !== -1;
        });

        if (!pendingIds.length) {
          if (bulkMessageEl) {
            bulkMessageEl.textContent =
              "Bulk reject is only available for submissions currently in Pending Review.";
            bulkMessageEl.classList.remove("hidden");
            bulkMessageEl.classList.remove("text-emerald-700");
            bulkMessageEl.classList.add("text-red-600");
          }
          return;
        }

        var noteValue =
          (bulkNotesInput && bulkNotesInput.value) || "";
        var reviewNotes =
          (noteValue && noteValue.trim()) ||
          "Bulk rejected from external submissions inbox.";

        var confirmed = window.confirm(
          "Reject " +
            pendingIds.length +
            " submission(s)? This cannot be undone."
        );
        if (!confirmed) {
          return;
        }

        var successCount = 0;
        var errorCount = 0;

        (async function runSequentialRejects() {
          for (var i = 0; i < pendingIds.length; i++) {
            var id = pendingIds[i];
            try {
              var result =
                await window.ExternalSubmissionsApi.promoteSubmission({
                  submission_id: id,
                  action: "reject_submission",
                  review_notes: reviewNotes,
                });
              if (result && !result.error) {
                successCount++;
              } else {
                errorCount++;
                console.error(
                  "[ExternalSubmissionsList] Bulk reject error for id",
                  id,
                  result && result.error
                );
              }
            } catch (err) {
              errorCount++;
              console.error(
                "[ExternalSubmissionsList] Bulk reject exception for id",
                id,
                err
              );
            }
          }

          if (bulkMessageEl) {
            if (errorCount === 0) {
              bulkMessageEl.textContent =
                "Rejected " + successCount + " submission(s) successfully.";
              bulkMessageEl.classList.remove("hidden");
              bulkMessageEl.classList.remove("text-red-600");
              bulkMessageEl.classList.add("text-emerald-700");
            } else {
              bulkMessageEl.textContent =
                "Rejected " +
                successCount +
                " submission(s). " +
                errorCount +
                " failed. Check the console for details.";
              bulkMessageEl.classList.remove("hidden");
              bulkMessageEl.classList.remove("text-emerald-700");
              bulkMessageEl.classList.add("text-red-600");
            }
          }

          if (
            window.IESupabase &&
            typeof window.IESupabase.showSuccess === "function"
          ) {
            var toastMessage =
              errorCount === 0
                ? "Bulk reject completed successfully."
                : "Bulk reject completed with some errors.";
            window.IESupabase.showSuccess(toastMessage);
          }

          clearBulkSelection();
          renderSubmissions();
        })();
      });
    }

    function navigateToDetail(id) {
      var href =
        "external-submission.html?id=" + encodeURIComponent(String(id));
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo(href);
      } else {
        window.location.href = href;
      }
    }

    function renderSubmissions() {
      if (
        !window.ExternalSubmissionsApi ||
        typeof window.ExternalSubmissionsApi.fetchSubmissions !==
          "function"
      ) {
        tbody.innerHTML =
          '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">External submissions API not available.</td></tr>';
        if (paginationEl) {
          updatePaginationUI(paginationEl, 0, 1, PAGE_SIZE, 0);
        }
        return;
      }

      tbody.innerHTML =
        '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>';

      window.ExternalSubmissionsApi.fetchSubmissions({
        status: filters.status || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      })
        .then(function (result) {
          if (result.error) {
            console.error(
              "[ExternalSubmissionsList] fetchSubmissions error:",
              result.error
            );
            tbody.innerHTML =
              '<tr><td colspan="9" class="px-6 py-8 text-center text-red-500">Error loading submissions.</td></tr>';
            if (paginationEl) {
              updatePaginationUI(paginationEl, 0, 1, PAGE_SIZE, 0);
            }
            return;
          }

          var rows = Array.isArray(result.data) ? result.data.slice() : [];
          tbody.innerHTML = "";
          latestPageIds = [];
          latestPagePendingIds = [];
          if (!rows.length) {
            tbody.innerHTML =
              '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">No submissions found.</td></tr>';
          } else {
            rows.forEach(function (row) {
              var idStr = String(row.id);
              latestPageIds.push(idStr);
              if (formatStatus(row.status) === "pending_review") {
                latestPagePendingIds.push(idStr);
              }
              var isSelected = selectedIds.has(idStr);
              tbody.appendChild(
                buildRow(row, { isSelected: isSelected })
              );
            });
          }

          updateBulkBar();

          if (paginationEl) {
            updatePaginationUI(
              paginationEl,
              result.totalCount || rows.length,
              currentPage,
              PAGE_SIZE,
              rows.length
            );
          }
        })
        .catch(function (err) {
          console.error(
            "[ExternalSubmissionsList] fetchSubmissions exception:",
            err
          );
          tbody.innerHTML =
            '<tr><td colspan="9" class="px-6 py-8 text-center text-red-500">Error loading submissions.</td></tr>';
          if (paginationEl) {
            updatePaginationUI(paginationEl, 0, 1, PAGE_SIZE, 0);
          }
        });
    }

    if (
      window.ExternalSubmissionsApi &&
      typeof window.ExternalSubmissionsApi.ensureAuth === "function"
    ) {
      window.ExternalSubmissionsApi.ensureAuth().then(function (user) {
        if (!user) return;
        renderSubmissions();
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    } else {
      renderSubmissions();
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initExternalSubmissionsListPage();
  });
})();

