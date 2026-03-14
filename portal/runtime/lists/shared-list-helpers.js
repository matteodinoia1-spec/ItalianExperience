// Shared helpers for dashboard + list pages (filters, row rendering, pagination, selection)
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Filtering + archive helpers
  // ---------------------------------------------------------------------------

  function applyCandidateFilters(list, filters) {
    return list
      .filter(function (item) {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter(function (item) {
        if (!filters.name) return true;
        var haystack =
          ((item.first_name || "") + " " + (item.last_name || "")).toLowerCase();
        return haystack.includes(filters.name.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.position) return true;
        return (item.position || "")
          .toLowerCase()
          .includes(filters.position.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.address) return true;
        return (item.address || "")
          .toLowerCase()
          .includes(filters.address.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.status) return true;
        var profileStatus =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime
            .normalizeProfileStatusFromLegacy === "function"
            ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(
                item.status
              )
            : item.status || "pending_review";
        var filterStatus =
          filters.status === "new" ? "pending_review" : filters.status;
        return profileStatus === filterStatus;
      })
      .filter(function (item) {
        if (!filters.source) return true;
        return (item.source || "") === filters.source;
      });
  }

  function applyJobOfferFilters(list, filters) {
    return list
      .filter(function (item) {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter(function (item) {
        if (!filters.title) return true;
        return (item.title || "")
          .toLowerCase()
          .includes(filters.title.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.clientId) return true;
        return item.client_id === filters.clientId;
      })
      .filter(function (item) {
        if (!filters.city) return true;
        return (item.city || "")
          .toLowerCase()
          .includes(filters.city.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.state) return true;
        return (item.state || "")
          .toLowerCase()
          .includes(filters.state.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.contractType) return true;
        return (
          (item.contract_type || "").toLowerCase() ===
          filters.contractType.toLowerCase()
        );
      })
      .filter(function (item) {
        if (!filters.offerStatus) return true;
        var normalized = (item.status || "").toString().toLowerCase();
        if (filters.offerStatus === "active") {
          return (
            normalized === "open" ||
            normalized === "active" ||
            normalized === "inprogress" ||
            normalized === "in progress"
          );
        }
        return normalized === filters.offerStatus.toLowerCase();
      });
  }

  function applyClientFilters(list, filters) {
    return list
      .filter(function (item) {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter(function (item) {
        if (!filters.name) return true;
        return (item.name || "")
          .toLowerCase()
          .includes(filters.name.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.city) return true;
        return (item.city || "")
          .toLowerCase()
          .includes(filters.city.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.state) return true;
        return (item.state || "")
          .toLowerCase()
          .includes(filters.state.toLowerCase());
      })
      .filter(function (item) {
        if (!filters.country) return true;
        return (item.country || "")
          .toLowerCase()
          .includes(filters.country.toLowerCase());
      });
  }

  // ---------------------------------------------------------------------------
  // Unified entity row renderer (candidates, clients, offers)
  // ---------------------------------------------------------------------------

  var ENTITY_ROW_EYE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
    '<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>' +
    '<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
  var ENTITY_ROW_EDIT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
    '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
  var ENTITY_ROW_ARCHIVE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
    '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';

  function getEntityLabel(entityType) {
    var t = (entityType || "").toString();
    if (t === "candidate") return "candidate";
    if (t === "job_offer") return "job offer";
    if (t === "client") return "client";
    if (t === "application") return "application";
    return "";
  }

  function buildEntityActionsCell(opts) {
    var entityType = opts.entityType;
    var id = opts.id;
    var editUrl = opts.editUrl;
    var isArchived = !!opts.isArchived;
    var archivedList = !!opts.archivedList;
    var showPreviewButton = archivedList ? false : opts.showPreviewButton !== false;
    var entityLabel = getEntityLabel(entityType);
    var editTitle =
      opts.editTitle != null
        ? opts.editTitle
        : entityLabel
        ? "Edit " + entityLabel
        : "Edit";
    var archiveTitle =
      opts.archiveTitle != null
        ? opts.archiveTitle
        : entityLabel
        ? "Archive " + entityLabel
        : "Archive";
    var viewTitle =
      opts.viewTitle != null
        ? opts.viewTitle
        : entityLabel
        ? "View " + entityLabel
        : "View";
    var restoreTitle =
      opts.restoreTitle != null
        ? opts.restoreTitle
        : entityLabel
        ? "Restore " + entityLabel
        : "Restore";
    var idAttr =
      id != null
        ? ' data-id="' +
          (window.escapeHtml ? window.escapeHtml(id) : id) +
          '"'
        : "";
    var entityAttr =
      ' data-entity="' +
      (window.escapeHtml ? window.escapeHtml(entityType) : entityType) +
      '"';
    var editUrlAttr =
      editUrl != null && editUrl !== ""
        ? ' data-edit-url="' +
          (window.escapeHtml ? window.escapeHtml(editUrl) : editUrl) +
          '"'
        : "";

    var html = '<div class="flex items-center justify-end gap-2">';
    if (showPreviewButton) {
      html +=
        '<button type="button" data-action="preview-entity"' +
        idAttr +
        entityAttr +
        ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' +
        (window.escapeHtml ? window.escapeHtml(viewTitle) : viewTitle) +
        '">' +
        ENTITY_ROW_EYE_SVG +
        "</button>";
    }
    if (!archivedList) {
      html +=
        '<button type="button" data-action="edit-entity"' +
        idAttr +
        entityAttr +
        editUrlAttr +
        ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' +
        (window.escapeHtml ? window.escapeHtml(editTitle) : editTitle) +
        '">' +
        ENTITY_ROW_EDIT_SVG +
        "</button>";
      html +=
        '<button type="button" data-action="archive-entity"' +
        idAttr +
        entityAttr +
        ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' +
        (window.escapeHtml ? window.escapeHtml(archiveTitle) : archiveTitle) +
        '">' +
        ENTITY_ROW_ARCHIVE_SVG +
        "</button>";
    } else {
      html +=
        '<button type="button" data-action="restore-entity"' +
        idAttr +
        entityAttr +
        ' class="ie-btn ie-btn-success" title="' +
        (window.escapeHtml ? window.escapeHtml(restoreTitle) : restoreTitle) +
        '">Ripristina</button>';
      html +=
        '<button type="button" data-action="delete-entity-permanent"' +
        idAttr +
        entityAttr +
        ' class="ie-btn ie-btn-danger" title="Delete permanently">Elimina definitivamente</button>';
    }
    html += "</div>";
    return html;
  }

  function renderEntityRow(options) {
    var entityType = options.entityType;
    var id = options.id;
    var viewUrl = options.viewUrl;
    var editUrl = options.editUrl;
    var title = options.title;
    var isArchived = !!options.isArchived;
    var archivedList = !!options.archivedList;
    var leadingCells = options.leadingCells || [];
    var middleCells = options.middleCells || [];
    var rowTitle = options.rowTitle;
    var rowClass =
      options.rowClass != null
        ? options.rowClass
        : "table-row transition" + (isArchived ? " opacity-60" : "");

    var tr = document.createElement("tr");
    tr.className = rowClass + " clickable-row";
    if (id != null) tr.setAttribute("data-id", String(id));
    if (rowTitle) tr.title = rowTitle;

    var rowEntity =
      entityType === "candidate"
        ? "candidate"
        : entityType === "job_offer"
        ? "jobOffer"
        : entityType === "client"
        ? "client"
        : entityType === "application"
        ? "application"
        : "";
    if (rowEntity) tr.setAttribute("data-entity", rowEntity);

    var titleTd = document.createElement("td");
    titleTd.className = "ie-table-cell ie-table-cell--primary";
    titleTd.textContent =
      title != null && title !== "" ? String(title) : "—";

    leadingCells.forEach(function (cellHtml) {
      var td = document.createElement("td");
      td.className = "ie-table-cell";
      td.innerHTML = cellHtml;
      tr.appendChild(td);
    });
    tr.appendChild(titleTd);
    middleCells.forEach(function (cellHtml) {
      var td = document.createElement("td");
      td.className = "ie-table-cell";
      td.innerHTML = cellHtml;
      tr.appendChild(td);
    });
    var actionsTd = document.createElement("td");
    actionsTd.className = "ie-table-cell ie-table-actions";
    var safeEditUrl = editUrl != null && editUrl !== "" ? editUrl : null;
    var actionCellOpts = options.actionCellOpts || {};
    actionsTd.innerHTML = buildEntityActionsCell({
      entityType: entityType,
      id: id,
      editUrl: safeEditUrl,
      isArchived: isArchived,
      archivedList: archivedList,
      showPreviewButton: actionCellOpts.showPreviewButton,
      editTitle: actionCellOpts.editTitle,
      archiveTitle: actionCellOpts.archiveTitle,
    });
    tr.appendChild(actionsTd);
    return tr;
  }

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------

  function updatePaginationUI(
    container,
    totalCount,
    currentPage,
    limit,
    currentRowCount
  ) {
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

  // ---------------------------------------------------------------------------
  // Candidates selection helpers (shared across pages)
  // ---------------------------------------------------------------------------

  var _candidateSelectionState = {
    ids: new Set(),
    pageIds: [],
    listeners: [],
  };

  function getCandidateSelectionSnapshot() {
    return {
      ids: Array.from(_candidateSelectionState.ids),
      pageIds: _candidateSelectionState.pageIds.slice(),
    };
  }

  function notifyCandidateSelectionChange() {
    var snapshot = getCandidateSelectionSnapshot();
    _candidateSelectionState.listeners.forEach(function (fn) {
      try {
        fn(snapshot);
      } catch (err) {
        console.error(
          "[IEListsRuntime] candidate selection listener error:",
          err
        );
      }
    });
  }

  function setCandidateSelectionIds(ids) {
    var next = new Set();
    (ids || []).forEach(function (id) {
      if (id != null) next.add(String(id));
    });
    _candidateSelectionState.ids = next;
    notifyCandidateSelectionChange();
  }

  function clearCandidateSelection() {
    if (_candidateSelectionState.ids.size === 0) return;
    _candidateSelectionState.ids = new Set();
    notifyCandidateSelectionChange();
  }

  function isCandidateSelected(id) {
    if (id == null) return false;
    return _candidateSelectionState.ids.has(String(id));
  }

  function setCandidateSelected(id, selected) {
    if (id == null) return;
    var key = String(id);
    var next = new Set(_candidateSelectionState.ids);
    if (selected) {
      next.add(key);
    } else {
      next.delete(key);
    }
    _candidateSelectionState.ids = next;
    notifyCandidateSelectionChange();
  }

  function setCandidatePageIds(ids) {
    _candidateSelectionState.pageIds = (ids || []).map(function (id) {
      return id == null ? id : String(id);
    });
    if (_candidateSelectionState.ids.size > 0) {
      _candidateSelectionState.ids = new Set();
    }
    notifyCandidateSelectionChange();
  }

  function selectAllCandidatesOnCurrentPage() {
    setCandidateSelectionIds(_candidateSelectionState.pageIds);
  }

  function onCandidateSelectionChange(handler) {
    if (typeof handler !== "function") return function () {};
    _candidateSelectionState.listeners.push(handler);
    try {
      handler(getCandidateSelectionSnapshot());
    } catch (err) {
      console.error(
        "[IEListsRuntime] candidate selection listener error:",
        err
      );
    }
    return function unsubscribe() {
      _candidateSelectionState.listeners =
        _candidateSelectionState.listeners.filter(function (fn) {
          return fn !== handler;
        });
    };
  }

  // ---------------------------------------------------------------------------
  // Public export for shim + list modules
  // ---------------------------------------------------------------------------

  window.IEListsSharedHelpers = {
    // Filters
    applyCandidateFilters: applyCandidateFilters,
    applyJobOfferFilters: applyJobOfferFilters,
    applyClientFilters: applyClientFilters,
    // Row rendering
    renderEntityRow: renderEntityRow,
    updatePaginationUI: updatePaginationUI,
    // Candidate selection
    getCandidateSelectionSnapshot: getCandidateSelectionSnapshot,
    onCandidateSelectionChange: onCandidateSelectionChange,
    clearCandidateSelection: clearCandidateSelection,
    setCandidateSelected: setCandidateSelected,
    setCandidatePageIds: setCandidatePageIds,
    selectAllCandidatesOnCurrentPage: selectAllCandidatesOnCurrentPage,
    isCandidateSelected: isCandidateSelected,
  };
})();

