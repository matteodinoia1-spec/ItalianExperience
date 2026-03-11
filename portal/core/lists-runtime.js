// Lists & dashboard runtime logic extracted from app-shell.js
// This module is responsible for:
// - Dashboard data loading + rendering
// - Entity list pages (candidates, job offers, clients)
// - Shared table wiring helpers (filters, pagination, row rendering)

(function () {
  "use strict";

  var _dashboardPreviewCache = {};

  // ---------------------------------------------------------------------------
  // Filtering + archive helpers
  // ---------------------------------------------------------------------------

  function applyCandidateFilters(list, filters) {
    return list
      .filter((item) => {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter((item) => {
        if (!filters.name) return true;
        const haystack = ((item.first_name || "") + " " + (item.last_name || "")).toLowerCase();
        return haystack.includes(filters.name.toLowerCase());
      })
      .filter((item) => {
        if (!filters.position) return true;
        return (item.position || "")
          .toLowerCase()
          .includes(filters.position.toLowerCase());
      })
      .filter((item) => {
        if (!filters.address) return true;
        return (item.address || "")
          .toLowerCase()
          .includes(filters.address.toLowerCase());
      })
      .filter((item) => {
        if (!filters.status) return true;
        const profileStatus =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
            ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(item.status)
            : (item.status || "pending_review");
        const filterStatus = (filters.status === "new") ? "pending_review" : filters.status;
        return profileStatus === filterStatus;
      })
      .filter((item) => {
        if (!filters.source) return true;
        return (item.source || "") === filters.source;
      });
  }

  function applyJobOfferFilters(list, filters) {
    return list
      .filter((item) => {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter((item) => {
        if (!filters.title) return true;
        return (item.title || "")
          .toLowerCase()
          .includes(filters.title.toLowerCase());
      })
      .filter((item) => {
        if (!filters.clientId) return true;
        return item.client_id === filters.clientId;
      })
      .filter((item) => {
        if (!filters.city) return true;
        return (item.city || "").toLowerCase().includes(filters.city.toLowerCase());
      })
      .filter((item) => {
        if (!filters.state) return true;
        return (item.state || "").toLowerCase().includes(filters.state.toLowerCase());
      })
      .filter((item) => {
        if (!filters.contractType) return true;
        return (item.contract_type || "").toLowerCase() === filters.contractType.toLowerCase();
      })
      .filter((item) => {
        if (!filters.offerStatus) return true;
        const normalized = (item.status || "").toString().toLowerCase();
        if (filters.offerStatus === "active") {
          return normalized === "open" || normalized === "active" || normalized === "inprogress" || normalized === "in progress";
        }
        return normalized === filters.offerStatus.toLowerCase();
      });
  }

  function applyClientFilters(list, filters) {
    return list
      .filter((item) => {
        if (filters.archived === "archived") return !!item.is_archived;
        if (filters.archived === "active") return !item.is_archived;
        return true;
      })
      .filter((item) => {
        if (!filters.name) return true;
        return (item.name || "")
          .toLowerCase()
          .includes(filters.name.toLowerCase());
      })
      .filter((item) => {
        if (!filters.city) return true;
        return (item.city || "")
          .toLowerCase()
          .includes(filters.city.toLowerCase());
      })
      .filter((item) => {
        if (!filters.state) return true;
        return (item.state || "")
          .toLowerCase()
          .includes(filters.state.toLowerCase());
      })
      .filter((item) => {
        if (!filters.country) return true;
        return (item.country || "")
          .toLowerCase()
          .includes(filters.country.toLowerCase());
      });
  }

  // ---------------------------------------------------------------------------
  // Dashboard: load data from Supabase and update cards + tables
  // ---------------------------------------------------------------------------

  async function initDashboardPage() {
    const api = window.IESupabase;
    if (!api) {
      setDashboardCardValues({
        totalCandidates: 0,
        activeJobOffers: 0,
        pendingReviewCount: 0,
        hiredThisMonth: 0,
      });
      renderDashboardRecentCandidates([]);
      renderDashboardSources([]);
      return;
    }

    setDashboardLoading(true);

    try {
      const [
        totalRes,
        activeOffersRes,
        pendingCountRes,
        hiredRes,
        pendingReviewRes,
        bySourceRes,
      ] = await Promise.all([
        api.getTotalCandidates(),
        api.getActiveJobOffers(),
        api.getPendingReviewCount(),
        api.getHiredThisMonth(),
        api.getPendingReviewCandidates(),
        api.getCandidatesBySource(),
      ]);

      setDashboardCardValues({
        totalCandidates: totalRes.error ? 0 : totalRes.data,
        activeJobOffers: activeOffersRes.error ? 0 : activeOffersRes.data,
        pendingReviewCount: pendingCountRes.error ? 0 : pendingCountRes.data,
        hiredThisMonth: hiredRes.error ? 0 : hiredRes.data,
      });

      const pendingList = pendingReviewRes.error ? [] : (pendingReviewRes.data || []);
      const mappedPending = pendingList.map(function (r) {
        return {
          id: r.id,
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          position: r.position || "",
          status: r.status || "pending_review",
          source: r.source || "",
          created_at: r.created_at,
          email: r.email || "",
          phone: r.phone || "",
        };
      });
      renderDashboardPendingReviewQueue(mappedPending);

      const sourceList = bySourceRes.error ? [] : (bySourceRes.data || []);
      renderDashboardSources(sourceList);
    } catch (err) {
      console.error("[ItalianExperience] Dashboard load error:", err);
      setDashboardCardValues({
        totalCandidates: 0,
        activeJobOffers: 0,
        pendingReviewCount: 0,
        hiredThisMonth: 0,
      });
      renderDashboardPendingReviewQueue([]);
      renderDashboardSources([]);
    } finally {
      setDashboardLoading(false);
    }
  }

  function setDashboardLoading(loading) {
    document.querySelectorAll("[data-dashboard-value]").forEach(function (el) {
      var val = el.querySelector(".dashboard-value");
      if (val) val.textContent = loading ? "…" : (val.textContent || "—");
    });
    var tbody = document.querySelector("[data-dashboard='pendingReviewQueue']");
    if (tbody) {
      var placeholder = tbody.querySelector("[data-dashboard-placeholder]");
      if (placeholder) placeholder.style.display = loading ? "" : "none";
    }
    var sourceContainer = document.querySelector("[data-dashboard='candidatesBySource']");
    if (sourceContainer) {
      var ph = sourceContainer.querySelector("[data-dashboard-placeholder]");
      if (ph) ph.style.display = loading ? "" : "none";
    }
  }

  function setDashboardCardValues(values) {
    var totalEl = document.querySelector("[data-dashboard-value='totalCandidates']");
    if (totalEl) {
      var v = totalEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.totalCandidates);
    }
    var activeEl = document.querySelector("[data-dashboard-value='activeJobOffers']");
    if (activeEl) {
      var v = activeEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.activeJobOffers);
    }
    var pendingEl = document.querySelector("[data-dashboard-value='pendingReviewCount']");
    if (pendingEl) {
      var v = pendingEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.pendingReviewCount);
    }
    var hiredEl = document.querySelector("[data-dashboard-value='hiredThisMonth']");
    if (hiredEl) {
      var v = hiredEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.hiredThisMonth);
    }
  }

  function formatInteger(n) {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString("it-IT");
  }

  function ensureDashboardPreviewPopover() {
    var id = "ie-dashboard-candidate-preview-popover";
    var root = document.getElementById(id);
    if (root) return root;
    root = document.createElement("div");
    root.id = id;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Candidate preview");
    root.className = "ie-dashboard-preview-popover fixed z-[100] hidden min-w-[280px] max-w-[360px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden";
    root.innerHTML =
      "<div class=\"p-4 space-y-2\">" +
      "<p class=\"font-semibold text-[#1b4332] text-base\" data-ie-preview-name></p>" +
      "<div class=\"text-sm text-gray-600 space-y-1\">" +
      "<p data-ie-preview-role></p>" +
      "<p data-ie-preview-source></p>" +
      "<p data-ie-preview-status></p>" +
      "<p data-ie-preview-date></p>" +
      "<p data-ie-preview-email></p>" +
      "<p data-ie-preview-phone></p>" +
      "</div>" +
      "<div class=\"pt-2 flex justify-end\">" +
      "<button type=\"button\" data-ie-preview-close class=\"ie-btn ie-btn-secondary !py-1.5 !px-3 text-sm\">Close</button>" +
      "</div>" +
      "</div>";
    document.body.appendChild(root);
    var closeBtn = root.querySelector("[data-ie-preview-close]");
    function close() {
      root.classList.add("hidden");
      root.removeAttribute("data-ie-preview-anchor");
    }
    if (closeBtn) closeBtn.addEventListener("click", close);
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key !== "Escape" || root.classList.contains("hidden")) return;
      close();
      document.removeEventListener("keydown", onKey);
    });
    root._close = close;
    return root;
  }

  function showDashboardCandidatePreview(row, anchorEl) {
    if (!row || !anchorEl) return;
    var popover = ensureDashboardPreviewPopover();
    var fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
    var role = (row.position || "").trim() || "—";
    var source = (row.source || "").trim() || "—";
    var statusLabel = window.IEStatusRuntime && typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
      ? window.IEStatusRuntime.formatProfileStatusLabel(row.status)
      : (row.status ? String(row.status) : "Pending Review");
    var date = row.created_at ? new Date(row.created_at).toLocaleDateString("it-IT") : "—";
    var email = (row.email || "").trim() || "—";
    var phone = (row.phone || "").trim() || "—";
    var escape = window.escapeHtml || function (s) { return String(s); };
    var set = function (sel, text) {
      var el = popover.querySelector(sel);
      if (el) el.textContent = text;
    };
    set("[data-ie-preview-name]", fullName);
    set("[data-ie-preview-role]", "Role: " + escape(role));
    set("[data-ie-preview-source]", "Source: " + escape(source));
    set("[data-ie-preview-status]", "Status: " + escape(statusLabel));
    set("[data-ie-preview-date]", "Date: " + date);
    set("[data-ie-preview-email]", "Email: " + escape(email));
    set("[data-ie-preview-phone]", "Phone: " + escape(phone));
    var rect = anchorEl.getBoundingClientRect();
    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var scrollX = window.scrollX || document.documentElement.scrollLeft;
    popover.style.left = (scrollX + rect.left) + "px";
    popover.style.top = (scrollY + rect.bottom + 6) + "px";
    popover.classList.remove("hidden");
  }

  function renderDashboardPendingReviewQueue(rows) {
    var tbody = document.querySelector("[data-dashboard='pendingReviewQueue']");
    if (!tbody) return;
    var placeholder = tbody.querySelector("[data-dashboard-placeholder]");
    if (placeholder) placeholder.remove();
    tbody.innerHTML = "";
    _dashboardPreviewCache = {};
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan=\"5\" class=\"px-6 py-8 text-center text-gray-400\">No candidates pending review.</td>";
      tbody.appendChild(tr);
      return;
    }
    var statusLabelFn = window.IEStatusRuntime && typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
      ? window.IEStatusRuntime.formatProfileStatusLabel
      : function (s) { return (s ? String(s) : "Pending Review"); };
    var statusClassFn = window.IEStatusRuntime && typeof window.IEStatusRuntime.getProfileStatusBadgeClass === "function"
      ? window.IEStatusRuntime.getProfileStatusBadgeClass
      : function () { return "badge-new"; };
    rows.forEach(function (row) {
      _dashboardPreviewCache[row.id] = row;
      var tr = document.createElement("tr");
      tr.className = "clickable-row table-row transition";
      tr.setAttribute("data-entity", "candidate");
      tr.setAttribute("data-id", String(row.id || ""));
      var fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
      var role = (row.position || "").trim() || "—";
      var source = (row.source || "").trim() || "—";
      var statusLabel = statusLabelFn(row.status);
      tr.title = fullName + (role !== "—" ? " · " + role : "") + (source ? " · " + source : "") + " · " + statusLabel;
      var candidateHref = window.IEPortal && window.IEPortal.links
        ? window.IEPortal.links.candidateView(row.id)
        : "#";
      var createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("it-IT")
        : "";
      var statusClass = statusClassFn(row.status);
      var idEsc = window.escapeHtml ? window.escapeHtml(String(row.id || "")) : String(row.id || "");
      var nameEsc = window.escapeHtml ? window.escapeHtml(fullName) : fullName;
      var roleEsc = window.escapeHtml ? window.escapeHtml(row.position || "—") : (row.position || "—");
      tr.innerHTML =
        "<td class=\"ie-table-cell ie-table-cell--primary\">" +
        "<a href=\"" + candidateHref + "\" data-action=\"dashboard-open-candidate\" data-id=\"" + idEsc + "\" class=\"table-link\">" + nameEsc + "</a>" +
        "</td>" +
        "<td class=\"ie-table-cell ie-table-cell--secondary\">" + roleEsc + "</td>" +
        "<td class=\"ie-table-cell ie-table-cell--date\">" + (window.escapeHtml ? window.escapeHtml(createdDate) : createdDate) + "</td>" +
        "<td class=\"ie-table-cell\"><span class=\"badge " + statusClass + "\">" + (window.escapeHtml ? window.escapeHtml(statusLabel) : statusLabel) + "</span></td>" +
        "<td class=\"ie-table-cell ie-table-actions\">" +
        "<div class=\"flex items-center gap-2\">" +
        "<button type=\"button\" data-action=\"dashboard-preview-candidate\" data-id=\"" + idEsc + "\" class=\"ie-btn ie-btn-secondary !py-1.5 !px-2 text-sm\" title=\"Quick preview\">Preview</button>" +
        "<button type=\"button\" data-action=\"dashboard-approve-candidate\" data-id=\"" + idEsc + "\" class=\"ie-btn ie-btn-success !py-1.5 !px-2 text-sm\">Approve</button>" +
        "<button type=\"button\" data-action=\"dashboard-reject-candidate\" data-id=\"" + idEsc + "\" class=\"ie-btn ie-btn-secondary !py-1.5 !px-2 text-sm\">Reject</button>" +
        "</div></td>";
      tbody.appendChild(tr);
    });
    if (!tbody.__ieDashboardPendingReviewBound) {
      tbody.addEventListener("click", function (event) {
        var target = event.target;
        var previewBtn = target.closest("[data-action='dashboard-preview-candidate']");
        var approveBtn = target.closest("[data-action='dashboard-approve-candidate']");
        var rejectBtn = target.closest("[data-action='dashboard-reject-candidate']");
        var link = target.closest("[data-action='dashboard-open-candidate']");
        if (previewBtn) {
          event.preventDefault();
          event.stopPropagation();
          var previewId = previewBtn.getAttribute("data-id");
          var previewRow = previewId ? _dashboardPreviewCache[previewId] : null;
          if (previewRow) showDashboardCandidatePreview(previewRow, previewBtn);
          return;
        }
        if (approveBtn) {
          event.preventDefault();
          event.stopPropagation();
          var id = approveBtn.getAttribute("data-id");
          if (!id) return;
          if (approveBtn.disabled) return;
          approveBtn.disabled = true;
          if (window.IESupabase && typeof window.IESupabase.updateCandidateProfileStatus === "function") {
            window.IESupabase.updateCandidateProfileStatus(id, "approved").then(function (result) {
              if (result && !result.error) {
                initDashboardPage();
              } else {
                approveBtn.disabled = false;
              }
            }).catch(function () { approveBtn.disabled = false; });
          } else {
            approveBtn.disabled = false;
          }
          return;
        }
        if (rejectBtn) {
          event.preventDefault();
          event.stopPropagation();
          var idR = rejectBtn.getAttribute("data-id");
          if (!idR) return;
          if (rejectBtn.disabled) return;
          rejectBtn.disabled = true;
          if (window.IESupabase && typeof window.IESupabase.updateCandidateProfileStatus === "function") {
            window.IESupabase.updateCandidateProfileStatus(idR, "rejected").then(function (result) {
              if (result && !result.error) {
                initDashboardPage();
              } else {
                rejectBtn.disabled = false;
              }
            }).catch(function () { rejectBtn.disabled = false; });
          } else {
            rejectBtn.disabled = false;
          }
          return;
        }
        if (link) {
          event.preventDefault();
          var idL = link.getAttribute("data-id");
          if (!idL) return;
          if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function" && window.IEPortal && window.IEPortal.links) {
            IERouter.navigateTo(window.IEPortal.links.candidateView(idL));
          }
          return;
        }
        var row = target.closest("tr[data-entity='candidate'][data-id]");
        if (row) {
          var rowId = row.getAttribute("data-id");
          if (rowId && typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function" && window.IEPortal && window.IEPortal.links) {
            IERouter.navigateTo(window.IEPortal.links.candidateView(rowId));
          }
        }
      });
      tbody.__ieDashboardPendingReviewBound = true;
    }
  }

  function renderDashboardSources(items) {
    var container = document.querySelector("[data-dashboard='candidatesBySource']");
    if (!container) return;
    var placeholder = container.querySelector("[data-dashboard-placeholder]");
    if (placeholder) placeholder.remove();
    container.innerHTML = "";
    var sourceLabels = {
      linkedin: "LinkedIn",
      email: "Email Diretta",
      website: "Sito Web",
      facebook: "Facebook / IG",
      instagram: "Facebook / IG",
      other: "Altro",
    };
    var sourceColors = ["bg-blue-600", "bg-[#c5a059]", "bg-green-600", "bg-indigo-500", "bg-gray-400"];
    if (!items.length) {
      var p = document.createElement("p");
      p.className = "text-gray-400 text-sm py-2";
      p.textContent = "No data by source.";
      container.appendChild(p);
      return;
    }
    items.forEach(function (item, idx) {
      var key = (item.source || "other").toLowerCase();
      var label = sourceLabels[key] || key;
      var color = sourceColors[idx % sourceColors.length];
      var div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML =
        "<div class=\"flex justify-between text-xs font-bold uppercase tracking-tight\">" +
        "<span class=\"text-gray-500\">" + (window.escapeHtml ? window.escapeHtml(label) : label) + "</span>" +
        "<span class=\"text-[#1b4332]\">" + (item.percentage || 0) + "%</span>" +
        "</div>" +
        "<div class=\"w-full h-2 bg-gray-100 rounded-full overflow-hidden\">" +
        "<div class=\"h-full " + color + " rounded-full\" style=\"width:" + (item.percentage || 0) + "%\"></div>" +
        "</div>";
      container.appendChild(div);
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
    /* Archived list: no preview button; row click opens entity. Keeps actions consistent. */
    var showPreviewButton = archivedList ? false : (opts.showPreviewButton !== false);
    var entityLabel = getEntityLabel(entityType);
    var editTitle = opts.editTitle != null ? opts.editTitle : (entityLabel ? "Edit " + entityLabel : "Edit");
    var archiveTitle = opts.archiveTitle != null ? opts.archiveTitle : (entityLabel ? "Archive " + entityLabel : "Archive");
    var viewTitle = opts.viewTitle != null ? opts.viewTitle : (entityLabel ? "View " + entityLabel : "View");
    var restoreTitle = opts.restoreTitle != null ? opts.restoreTitle : (entityLabel ? "Restore " + entityLabel : "Restore");
    var idAttr = id ? " data-id=\"" + (window.escapeHtml ? window.escapeHtml(id) : id) + "\"" : "";
    var entityAttr = " data-entity=\"" + (window.escapeHtml ? window.escapeHtml(entityType) : entityType) + "\"";
    var editUrlAttr = editUrl ? " data-edit-url=\"" + (window.escapeHtml ? window.escapeHtml(editUrl) : editUrl) + "\"" : "";

    var html = '<div class="flex items-center justify-end gap-2">';
    if (showPreviewButton) {
      html += '<button type="button" data-action="preview-entity"' + idAttr + entityAttr + ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' + (window.escapeHtml ? window.escapeHtml(viewTitle) : viewTitle) + '">' + ENTITY_ROW_EYE_SVG + "</button>";
    }
    if (!archivedList) {
      html += '<button type="button" data-action="edit-entity"' + idAttr + entityAttr + editUrlAttr + ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' + (window.escapeHtml ? window.escapeHtml(editTitle) : editTitle) + '">' + ENTITY_ROW_EDIT_SVG + "</button>";
      html += '<button type="button" data-action="archive-entity"' + idAttr + entityAttr + ' class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0" title="' + (window.escapeHtml ? window.escapeHtml(archiveTitle) : archiveTitle) + '">' + ENTITY_ROW_ARCHIVE_SVG + "</button>";
    } else {
      html += '<button type="button" data-action="restore-entity"' + idAttr + entityAttr + ' class="ie-btn ie-btn-success" title="' + (window.escapeHtml ? window.escapeHtml(restoreTitle) : restoreTitle) + '">Ripristina</button>';
      html += '<button type="button" data-action="delete-entity-permanent"' + idAttr + entityAttr + ' class="ie-btn ie-btn-danger" title="Delete permanently">Elimina definitivamente</button>';
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
    var rowClass = options.rowClass != null ? options.rowClass : "table-row transition" + (isArchived ? " opacity-60" : "");

    var tr = document.createElement("tr");
    tr.className = rowClass + " clickable-row";
    if (id) tr.setAttribute("data-id", String(id));
    if (rowTitle) tr.title = rowTitle;

    var rowEntity = entityType === "candidate" ? "candidate" : entityType === "job_offer" ? "jobOffer" : entityType === "client" ? "client" : "";
    if (rowEntity) tr.setAttribute("data-entity", rowEntity);

    var titleTd = document.createElement("td");
    titleTd.className = "ie-table-cell ie-table-cell--primary";
    titleTd.textContent = title != null && title !== "" ? title : "—";

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
    var safeEditUrl = (editUrl != null && editUrl !== "") ? editUrl : null;
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

  const CANDIDATES_PAGE_SIZE = 10;
  const JOB_OFFERS_PAGE_SIZE = 10;
  const CLIENTS_PAGE_SIZE = 10;

  function updatePaginationUI(container, totalCount, currentPage, limit, currentRowCount) {
    if (!container) return;
    const summaryEl = container.querySelector("[data-ie-pagination-summary]");
    const pagesEl = container.querySelector("[data-ie-pagination-pages]");
    const prevBtn = container.querySelector("[data-ie-pagination-prev]");
    const nextBtn = container.querySelector("[data-ie-pagination-next]");
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const page = Math.max(1, Math.min(currentPage, totalPages));

    if (summaryEl) {
      summaryEl.textContent = totalCount === 0
        ? "Showing 0 of 0 results"
        : "Showing " + currentRowCount + " of " + Number(totalCount).toLocaleString("en-US") + " results";
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
  // Candidates list
  // ---------------------------------------------------------------------------

  function initCandidatesPage() {
    const tbody = document.querySelector("[data-ie-candidates-body]");
    if (!tbody) return;

    if (!tbody.__ieClientLinkBound) {
      tbody.addEventListener("click", function (event) {
        var link = event.target.closest("[data-action='open-client-from-candidate']");
        if (!link) return;
        event.preventDefault();
        var id = link.getAttribute("data-id");
        if (!id) return;
        if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function") {
          IERouter.navigateTo("add-client.html?id=" + encodeURIComponent(id) + "&mode=view");
        }
      });
      tbody.__ieClientLinkBound = true;
    }

    const filters = {
      name: "",
      position: "",
      address: "",
      status: "",
      source: "",
      archived: "active",
      jobOfferId: "",
    };
    let currentPage = 1;
    const limit = CANDIDATES_PAGE_SIZE;

    const nameInput = document.querySelector('[data-filter="candidate-name"]');
    const positionInput = document.querySelector('[data-filter="candidate-position"]');
    const addressInput = document.querySelector('[data-filter="candidate-address"]');
    const statusSelect = document.querySelector('[data-filter="candidate-status"]');
    const sourceSelect = document.querySelector('[data-filter="candidate-source"]');
    const archivedSelect = document.querySelector('[data-filter="candidate-archived"]');

    const offerFilterBanner = document.querySelector("[data-ie-offer-filter-banner]");
    const offerFilterTitleEl = document.querySelector("[data-ie-offer-filter-title]");
    const clearOfferFilterBtn = document.querySelector("[data-action='clear-offer-filter']");

    const params = new URLSearchParams(window.location.search);
    const offerFilter = params.get("offer");
    const hasOfferFilter = !!offerFilter;
    if (hasOfferFilter) {
      filters.jobOfferId = offerFilter;
    }
    const statusParam = params.get("status");
    if (statusParam && statusSelect) {
      var normalizedParam = statusParam === "new" ? "pending_review" : statusParam;
      filters.status = normalizedParam;
      statusSelect.value = normalizedParam;
    }

    const pendingReviewBanner = document.querySelector("[data-ie-pending-review-banner]");
    const pendingReviewShortcut = document.querySelector("[data-ie-pending-review-shortcut]");

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
      if (window.IESupabase && window.IESupabase.fetchJobOfferById && offerFilterTitleEl) {
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

    const clearPendingReviewBtn = document.querySelector("[data-action='clear-pending-review-filter']");
    if (clearPendingReviewBtn) {
      clearPendingReviewBtn.addEventListener("click", function () {
        filters.status = "";
        if (statusSelect) statusSelect.value = "";
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("status");
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? "?" + urlParams.toString() : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
        pendingReviewBanner && pendingReviewBanner.classList.add("hidden");
        currentPage = 1;
        renderCandidates();
      });
    }

    if (pendingReviewShortcut && window.IERouter && typeof window.IERouter.navigateTo === "function") {
      pendingReviewShortcut.addEventListener("click", function (e) {
        e.preventDefault();
        window.IERouter.navigateTo("candidates", { status: "pending_review" });
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

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("offer");
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? "?" + urlParams.toString() : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);

        if (offerFilterBanner) {
          offerFilterBanner.classList.add("hidden");
        }

        currentPage = 1;
        renderCandidates();
      });
    }

    const paginationEl = document
      .querySelector("[data-ie-candidates-body]")
      ?.closest(".glass-card")
      ?.querySelector("[data-ie-pagination]");
    if (paginationEl) {
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage + 1); });
    }

    if (hasOfferFilter) {
      showOfferFilterBanner();
    }
    showPendingReviewBanner();

    tbody.addEventListener("click", function (event) {
      const cvBtn = event.target.closest("[data-action='view-cv']");
      if (cvBtn) {
        const id = cvBtn.getAttribute("data-id");
        if (!id) return;
        if (cvBtn.disabled) return;
        if (typeof openCandidateCvPreview === "function") {
          openCandidateCvPreview(id);
        }
      }
    });

    const CANDIDATE_SIGNED_PHOTO_CACHE = {};

    function mapCandidateRow(r) {
      const first_name = r.first_name ?? "";
      const last_name = r.last_name ?? "";
      var availability = "available";
      try {
        if (
          window.IEQueries &&
          window.IEQueries.candidates &&
          typeof window.IEQueries.candidates.deriveAvailabilityFromApplications ===
            "function"
        ) {
          availability =
            window.IEQueries.candidates.deriveAvailabilityFromApplications(
              r.candidate_job_associations || []
            ) || "available";
        }
      } catch (e) {
        // Fallback to default availability on error
        availability = "available";
      }
      return {
        id: r.id,
        first_name,
        last_name,
        position: r.position ?? "",
        address: r.address ?? "",
        availability: availability,
        source: r.source ?? "",
        client_name: r.client_name || null,
        foto_url:
          r.foto_url ||
          "https://ui-avatars.com/api/?name=" +
            encodeURIComponent((first_name || "") + "+" + (last_name || "")) +
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

    function renderCandidates() {
      const paginationContainer = document
        .querySelector("[data-ie-candidates-body]")
        ?.closest(".glass-card")
        ?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchCandidatesPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-gray-400\">Loading...</td></tr>";
        window.IESupabase.fetchCandidatesPaginated({
          filters,
          page: currentPage,
          limit,
        }).then(function (result) {
          const rows = (result.data || []).map(mapCandidateRow);
          const totalCount = result.totalCount ?? 0;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            renderCandidates();
            return;
          }
          renderCandidateRows(rows, tbody);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
        }).catch(function (err) {
          console.error("[ItalianExperience] fetchCandidatesPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-red-500\">Loading error. Please try again later.</td></tr>";
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
        return;
      }

      if (typeof fetchCandidates === "function") {
        fetchCandidates(filters).then((rows) => {
          rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
          const totalCount = rows.length;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
          const start = (currentPage - 1) * limit;
          const pageRows = rows.slice(start, start + limit);
          renderCandidateRows(pageRows, tbody);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
        });
      }
    }

    function renderCandidateRows(rows, tbodyEl) {
      const targetBody = tbodyEl || tbody;
      targetBody.innerHTML = "";
      if (!rows.length) {
        targetBody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-gray-400\">No candidates found.</td></tr>";
        return;
      }
      rows.forEach(function (row) {
        const clientName = typeof findClientNameForCandidate === "function"
          ? findClientNameForCandidate(row)
          : row.client_name || null;
        const latestAssoc = row.latest_association || null;
        const availability = row.availability || "available";
        const availabilityLabel =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.formatAvailabilityLabel === "function"
            ? window.IEStatusRuntime.formatAvailabilityLabel(availability)
            : (availability === "working" ? "Working" : availability === "in_process" ? "In process" : "Available");
        const availabilityBadgeClass =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.getAvailabilityBadgeClass === "function"
            ? window.IEStatusRuntime.getAvailabilityBadgeClass(availability)
            : (availability === "working" ? "badge-hired" : availability === "in_process" ? "badge-inprogress" : "badge-open");
        const sourceLabel = (row.source || "").toUpperCase();
        const createdDate = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "";
        var positionCellHtml;
        if (latestAssoc && latestAssoc.job_offer_id) {
          var posText = (window.escapeHtml ? window.escapeHtml(row.position || "—") : (row.position || "—"));
          positionCellHtml = '<span class="entity-link ie-table-cell--secondary" data-entity-type="job-offer" data-entity-id="' + (window.escapeHtml ? window.escapeHtml(String(latestAssoc.job_offer_id)) : String(latestAssoc.job_offer_id)) + '">' + posText + "</span>";
        } else {
          positionCellHtml = '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.position || "—") : (row.position || "—")) + "</span>";
        }
        var assignmentHtml;
        if (latestAssoc && latestAssoc.client_name) {
          if (latestAssoc.client_id) {
            var clientText = (window.escapeHtml ? window.escapeHtml(latestAssoc.client_name) : latestAssoc.client_name);
            assignmentHtml = '<span class="entity-link ie-text-muted" data-entity-type="client" data-entity-id="' + (window.escapeHtml ? window.escapeHtml(String(latestAssoc.client_id)) : String(latestAssoc.client_id)) + '">' + clientText + "</span>";
          } else {
            assignmentHtml =
              '<div class="ie-text-muted">' +
              (window.escapeHtml ? window.escapeHtml(latestAssoc.client_name) : latestAssoc.client_name) +
              "</div>";
          }
        } else {
          assignmentHtml =
            '<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 ie-text-muted text-xs font-semibold">Non assegnato</span>';
        }
        let initialPhotoUrl = "";
        const fallbackAvatarUrl =
          "https://ui-avatars.com/api/?name=" +
          encodeURIComponent((row.first_name || "") + "+" + (row.last_name || "")) +
          "&background=dbeafe&color=1e40af";
        if (row.foto_url && (/^https?:\/\//i.test(row.foto_url) || row.foto_url.charAt(0) === "/")) {
          initialPhotoUrl = row.foto_url;
        } else {
          initialPhotoUrl = fallbackAvatarUrl;
        }
        const photoHtml =
          '<img data-ie-candidate-photo="' +
          (window.escapeHtml ? window.escapeHtml(row.id) : row.id) +
          '" src="' +
          (window.escapeHtml ? window.escapeHtml(initialPhotoUrl) : initialPhotoUrl) +
          '" class="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="' +
          (window.escapeHtml ? window.escapeHtml((row.first_name || "") + " " + (row.last_name || "")) : ((row.first_name || "") + " " + (row.last_name || ""))) +
          '">';
        const candidateViewUrl = (window.IEPortal && window.IEPortal.links && window.IEPortal.links.candidateView) ? window.IEPortal.links.candidateView(row.id) : "candidate.html?id=" + encodeURIComponent(String(row.id));
        const tr = renderEntityRow({
          entityType: "candidate",
          id: row.id,
          viewUrl: candidateViewUrl,
          editUrl: window.IEPortal && window.IEPortal.links ? window.IEPortal.links.candidateEdit(row.id) : "#",
          title: [row.first_name, row.last_name].filter(Boolean).join(" ") || "—",
          isArchived: row.is_archived,
          archivedList: false,
          actionCellOpts: { showPreviewButton: false, editTitle: "Edit candidate", archiveTitle: "Archive candidate" },
          leadingCells: [photoHtml],
          middleCells: [
            positionCellHtml,
            assignmentHtml,
            (row.address || "—"),
            '<span class="badge ' +
              availabilityBadgeClass +
              '" title="Availability">' +
              (window.escapeHtml
                ? window.escapeHtml(availabilityLabel)
                : availabilityLabel) +
              "</span>",
            '<span class="ie-text-muted text-xs font-medium">' + (window.escapeHtml ? window.escapeHtml(sourceLabel || "—") : (sourceLabel || "—")) + "</span>",
            '<span class="ie-table-cell--date">' + (window.escapeHtml ? window.escapeHtml(createdDate) : createdDate) + "</span>",
          ],
          rowTitle: typeof formatLastUpdatedMeta === "function" ? formatLastUpdatedMeta(row) : "",
        });
        targetBody.appendChild(tr);
        resolveCandidatePhoto(row, targetBody, CANDIDATE_SIGNED_PHOTO_CACHE);
      });
    }

    function resolveCandidatePhoto(row, tbodyRef, cache) {
      const tbodyLocal = tbodyRef || tbody;
      const path = row && row.photo_storage_path;
      if (!path) return;
      if (/^https?:\/\//i.test(path) || path.charAt(0) === "/") return;
      if (!window.IESupabase || !window.IESupabase.createSignedCandidateUrl) return;

      const cached = cache[path];
      const selector =
        '[data-ie-candidate-photo="' + String(row.id != null ? row.id : "") + '"]';
      if (cached) {
        const imgCached = tbodyLocal.querySelector(selector);
        if (imgCached) {
          imgCached.src = cached;
          imgCached.dataset.storagePath = path;
        }
        return;
      }

      window.IESupabase
        .createSignedCandidateUrl(path)
        .then(function (signedUrl) {
          if (!signedUrl) return;
          cache[path] = signedUrl;
          const img = tbodyLocal.querySelector(selector);
          if (img) {
            img.src = signedUrl;
            img.dataset.storagePath = path;
          }
        })
        .catch(function () {});
    }

    renderCandidates();
  }

  // ---------------------------------------------------------------------------
  // Job offers list
  // ---------------------------------------------------------------------------

  function initJobOffersPage() {
    const tbody = document.querySelector("[data-ie-joboffers-body]");
    if (!tbody) return;

    const table = tbody.closest("table");
    const headerRow = table?.querySelector("thead tr");
    const candidatesTh = headerRow ? Array.from(headerRow.children).find(function (th) {
      return th.textContent.trim().toLowerCase() === "candidates";
    }) : null;
    if (candidatesTh) {
      const thAssociated = document.createElement("th");
      thAssociated.className = "ie-table-th font-bold";
      thAssociated.textContent = "Associated";
      const thRequired = document.createElement("th");
      thRequired.className = "ie-table-th font-bold";
      thRequired.textContent = "Required";
      candidatesTh.replaceWith(thAssociated, thRequired);
    }

    const filters = {
      title: "",
      clientId: "",
      city: "",
      state: "",
      contractType: "",
      offerStatus: "",
      archived: "active",
      excludeArchivedStatus: true,
    };
    let currentPage = 1;
    const limit = JOB_OFFERS_PAGE_SIZE;

    const titleInput = document.querySelector('[data-filter="offer-title"]');
    const clientSelect = document.querySelector('[data-filter="offer-client"]');
    const statusSelect = document.querySelector('[data-filter="offer-status"]');
    const cityInput = document.querySelector('[data-filter="offer-city"]');
    const stateInput = document.querySelector('[data-filter="offer-state"]');
    const contractSelect = document.querySelector('[data-filter="offer-contract"]');
    const archivedSelect = document.querySelector('[data-filter="offer-archived"]');

    const clientFilterBanner = document.querySelector("[data-ie-client-filter-banner]");
    const clientFilterNameEl = document.querySelector("[data-ie-client-filter-name]");
    const clearClientFilterBtn = document.querySelector("[data-action='clear-client-filter']");

    const params = new URLSearchParams(window.location.search);
    const clientFilter = params.get("client");
    const hasClientFilter = !!clientFilter;
    if (hasClientFilter) {
      filters.clientId = clientFilter;
      filters.offerStatus = "active";
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
      let name = "";
      if (clientSelect) {
        const selected = clientSelect.querySelector('option[value="' + filters.clientId + '"]');
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
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Tutti i clienti";
      clientSelect.innerHTML = "";
      clientSelect.appendChild(defaultOpt);
      if (window.IESupabase && window.IESupabase.fetchClientsPaginated) {
        window.IESupabase.fetchClientsPaginated({ filters: { archived: "active" }, page: 1, limit: 500 })
          .then(function (res) {
            const list = res.data || [];
            list.forEach(function (client) {
              if (client.is_archived) return;
              const opt = document.createElement("option");
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
      } else if (typeof IE_STORE !== "undefined" && IE_STORE && Array.isArray(IE_STORE.clients)) {
        IE_STORE.clients.forEach((client) => {
          if (client.is_archived) return;
          const opt = document.createElement("option");
          opt.value = client.id;
          opt.textContent = client.name;
          clientSelect.appendChild(opt);
        });
        if (filters.clientId) {
          clientSelect.value = filters.clientId;
          updateClientFilterBanner();
        }
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

    const paginationEl = document
      .querySelector("[data-ie-joboffers-body]")
      ?.closest(".glass-card")
      ?.querySelector("[data-ie-pagination]");
    if (paginationEl) {
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage + 1); });
    }

    if (hasClientFilter) {
      if (statusSelect) statusSelect.value = "active";
    }

    if (clearClientFilterBtn) {
      clearClientFilterBtn.addEventListener("click", function () {
        filters.clientId = "";
        filters.offerStatus = "";
        if (clientSelect) clientSelect.value = "";
        if (statusSelect) statusSelect.value = "";

        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("client");
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? "?" + urlParams.toString() : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);

        if (clientFilterBanner) clientFilterBanner.classList.add("hidden");

        currentPage = 1;
        renderOffers();
      });
    }

    tbody.addEventListener("click", function (event) {
      const target = event.target;

      const candidatesBtn = target.closest("[data-action='view-offer-candidates']");
      if (candidatesBtn) {
        const offerId = candidatesBtn.getAttribute("data-id");
        if (!offerId) return;
        if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function") {
          IERouter.navigateTo("candidates.html?offer=" + encodeURIComponent(offerId));
        }
        return;
      }

      const titleBtn = target.closest("[data-action='view-offer-full']");
      if (titleBtn) {
        const fullId =
          titleBtn.getAttribute("data-id") ||
          titleBtn.closest("tr")?.getAttribute("data-id");
        if (!fullId) return;
        if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function" && window.IEPortal && window.IEPortal.links) {
          IERouter.navigateTo(window.IEPortal.links.offerView(fullId));
        }
        return;
      }
    });

    function mapJobOfferRow(r) {
      const location =
        r.location ||
        [r.city, r.state]
          .filter(function (x) {
            return x;
          })
          .join(", ");
      const candidatesCount = (r.candidate_job_associations || []).filter(function (a) {
        return a && a.candidates && !a.candidates.is_archived;
      }).length;
      return {
        id: r.id,
        title: r.title ?? "",
        position: r.position ?? "",
        description: r.description ?? "",
        client_id: r.client_id ?? null,
        client_name: r.client_name ?? "",
        salary: r.salary ?? "",
        city: r.city ?? "",
        state: r.state ?? "",
        location: location,
        deadline: r.deadline ?? null,
        status: r.status ?? "open",
        created_at: r.created_at,
        is_archived: r.is_archived || false,
        candidatesCount: candidatesCount,
        positions: r.positions != null ? Number(r.positions) : 0,
      };
    }

    async function renderOfferRows(rows, tbodyEl) {
      const targetBody = tbodyEl || tbody;
      targetBody.innerHTML = "";
      if (!rows.length) {
        targetBody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-gray-400\">No job offers found.</td></tr>";
        return;
      }
      if (window.IESupabase) window.IE_ACTIVE_JOB_OFFER_ID = rows[0].id;

      const associationResults = await Promise.all(
        rows.map(function (row) {
          return window.IESupabase && window.IESupabase.fetchCandidatesForJobOffer
            ? window.IESupabase.fetchCandidatesForJobOffer(row.id)
            : Promise.resolve({ data: [] });
        })
      );

      rows.forEach(function (row, i) {
        const associations = associationResults[i]?.data || [];
        const associatedActive = associations.filter(function (a) {
          const s = (a.status || "").toString().toLowerCase();
          return s !== "rejected" && s !== "not_selected" && s !== "withdrawn";
        }).length;
        const hiredCount = associations.filter(function (a) {
          const s = (a.status || "").toString().toLowerCase();
          return s === "hired";
        }).length;
        const positions = row.positions || 0;

        const clientValue = row.client_name || "—";
        const locationValue = row.location || "—";
        const createdAtValue = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "—";
        const badgeClass =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.getOfferStatusBadgeClassForList === "function"
            ? window.IEStatusRuntime.getOfferStatusBadgeClassForList(row.status)
            : "badge-open";
        const statusLabel =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.formatOfferStatusLabelForList === "function"
            ? window.IEStatusRuntime.formatOfferStatusLabelForList(row.status)
            : (row.status || "Open");

        const associatedCellHtml =
          '<button type="button" data-action="view-offer-candidates" data-id="' +
          (window.escapeHtml ? window.escapeHtml(row.id) : row.id) +
          '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-bold">' +
          (window.escapeHtml ? window.escapeHtml(String(associatedActive)) : String(associatedActive)) +
          "</button>";
        let countColorClass = "text-green-600";
        if (positions > 0 && hiredCount >= positions) {
          countColorClass = "text-red-500";
        }
        const requiredCellHtml =
          '<span class="' + countColorClass + '">' +
          (window.escapeHtml ? window.escapeHtml(String(hiredCount)) : String(hiredCount)) + " / " + (window.escapeHtml ? window.escapeHtml(String(positions)) : String(positions)) +
          "</span>";

        var jobTitleViewUrl =
          "add-job-offer.html?id=" +
          encodeURIComponent(String(row.id)) +
          "&mode=view";
        var clientCellHtml = row.client_id
          ? '<span class="entity-link ie-text-muted" data-entity-type="client" data-entity-id="' + (window.escapeHtml ? window.escapeHtml(String(row.client_id)) : String(row.client_id)) + '">' + (window.escapeHtml ? window.escapeHtml(clientValue) : clientValue) + "</span>"
          : '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(clientValue) : clientValue) + "</span>";
        const tr = renderEntityRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: jobTitleViewUrl,
          editUrl: window.IEPortal && window.IEPortal.links ? window.IEPortal.links.offerEdit(row.id) : "#",
          title: row.title || "—",
          isArchived: row.is_archived,
          archivedList: false,
          actionCellOpts: { showPreviewButton: false, editTitle: "Edit job offer", archiveTitle: "Archive job offer" },
          leadingCells: [],
          middleCells: [
            '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.position || "—") : (row.position || "—")) + "</span>",
            clientCellHtml,
            '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(locationValue) : locationValue) + "</span>",
            '<span class="badge ' + badgeClass + '">' + (window.escapeHtml ? window.escapeHtml(statusLabel) : statusLabel) + "</span>",
            associatedCellHtml,
            requiredCellHtml,
            '<span class="ie-table-cell--date">' + (window.escapeHtml ? window.escapeHtml(createdAtValue) : createdAtValue) + "</span>",
          ],
          rowTitle: typeof formatLastUpdatedMeta === "function" ? formatLastUpdatedMeta(row) : "",
        });
        targetBody.appendChild(tr);
      });
    }

    function renderOffers() {
      const paginationContainer = document
        .querySelector("[data-ie-joboffers-body]")
        ?.closest(".glass-card")
        ?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchJobOffersPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-gray-400\">Loading...</td></tr>";
        window.IESupabase.fetchJobOffersPaginated({
          filters,
          page: currentPage,
          limit,
        }).then(async function (result) {
          const rows = (result.data || []).map(mapJobOfferRow);
          const totalCount = result.totalCount ?? 0;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            renderOffers();
            return;
          }
          await renderOfferRows(rows, tbody);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
        }).catch(function (err) {
          console.error("[ItalianExperience] fetchJobOffersPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-red-500\">Loading error. Please try again later.</td></tr>";
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
        return;
      }

      if (typeof fetchJobOffers === "function") {
        fetchJobOffers(filters).then(async (rows) => {
          rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
          const totalCount = rows.length;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
          const start = (currentPage - 1) * limit;
          const pageRows = rows.slice(start, start + limit);
          await renderOfferRows(pageRows, tbody);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
        });
      }
    }

    renderOffers();
  }

  // ---------------------------------------------------------------------------
  // Applications list
  // ---------------------------------------------------------------------------

  const APPLICATIONS_PAGE_SIZE = 25;

  function initApplicationsPage() {
    const tbody = document.querySelector("[data-ie-applications-body]");
    if (!tbody) return;

    const filters = {
      status: "",
      job_offer_id: "",
      client_id: "",
      candidate_id: "",
      candidate_name: "",
      date_from: "",
      date_to: "",
    };
    let currentPage = 1;
    const limit = APPLICATIONS_PAGE_SIZE;

    const statusSelect = document.querySelector('[data-filter="application-status"]');
    const offerSelect = document.querySelector('[data-filter="application-offer"]');
    const clientSelect = document.querySelector('[data-filter="application-client"]');
    const candidateInput = document.querySelector('[data-filter="application-candidate"]');
    const dateFromInput = document.querySelector('[data-filter="application-date-from"]');
    const dateToInput = document.querySelector('[data-filter="application-date-to"]');

    var applicationsParams = new URLSearchParams(window.location.search);
    var statusParam = applicationsParams.get("status");
    if (statusParam && statusSelect) {
      filters.status = statusParam;
      statusSelect.value = statusParam;
    }

    function getApplicationStatusBadgeClass(status) {
      if (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function") {
        return window.IEStatusRuntime.getApplicationStatusBadgeClass(status);
      }
      if (window.IEPortal && typeof window.IEPortal.getApplicationStatusBadgeClass === "function") {
        return window.IEPortal.getApplicationStatusBadgeClass(status);
      }
      return "badge-applied";
    }
    function formatApplicationStatusLabel(status) {
      if (window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function") {
        return window.IEStatusRuntime.formatApplicationStatusLabel(status);
      }
      if (window.IEPortal && typeof window.IEPortal.formatApplicationStatusLabel === "function") {
        return window.IEPortal.formatApplicationStatusLabel(status);
      }
      return status || "Applied";
    }

    const paginationContainer = tbody.closest(".glass-card") && tbody.closest(".glass-card").querySelector("[data-ie-pagination]");
    const paginationEl = paginationContainer;

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
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage + 1); });
    }

    if (offerSelect && !offerSelect.dataset.iePopulated) {
      offerSelect.dataset.iePopulated = "true";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "All offers";
      offerSelect.innerHTML = "";
      offerSelect.appendChild(defaultOpt);
      if (window.IESupabase && window.IESupabase.fetchJobOffersPaginated) {
        window.IESupabase.fetchJobOffersPaginated({ filters: { archived: "active" }, page: 1, limit: 500 })
          .then(function (res) {
            (res.data || []).forEach(function (offer) {
              if (offer.is_archived) return;
              const opt = document.createElement("option");
              opt.value = offer.id || "";
              opt.textContent = (offer.title || offer.position || "—").toString();
              offerSelect.appendChild(opt);
            });
          })
          .catch(function () {});
      }
    }
    if (clientSelect && !clientSelect.dataset.iePopulated) {
      clientSelect.dataset.iePopulated = "true";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "All clients";
      clientSelect.innerHTML = "";
      clientSelect.appendChild(defaultOpt);
      if (window.IESupabase && window.IESupabase.fetchClientsPaginated) {
        window.IESupabase.fetchClientsPaginated({ filters: { archived: "active" }, page: 1, limit: 500 })
          .then(function (res) {
            (res.data || []).forEach(function (client) {
              if (client.is_archived) return;
              const opt = document.createElement("option");
              opt.value = client.id || "";
              opt.textContent = (client.name || "—").toString();
              clientSelect.appendChild(opt);
            });
          })
          .catch(function () {});
      }
    }

    function renderApplications() {
      if (!window.IESupabase || !window.IESupabase.fetchApplicationsPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"5\" class=\"px-6 py-8 text-center text-gray-400\">Applications not available.</td></tr>";
        if (paginationContainer) updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        return;
      }

      const filterPayload = {
        status: filters.status || undefined,
        job_offer_id: filters.job_offer_id || undefined,
        client_id: filters.client_id || undefined,
        candidate_id: filters.candidate_id || undefined,
        date_from: filters.date_from ? filters.date_from + "T00:00:00Z" : undefined,
        date_to: filters.date_to ? filters.date_to + "T23:59:59Z" : undefined,
      };

      tbody.innerHTML = "<tr><td colspan=\"5\" class=\"px-6 py-8 text-center text-gray-400\">Loading...</td></tr>";

      window.IESupabase.fetchApplicationsPaginated(filterPayload, { page: currentPage, limit: limit })
        .then(function (result) {
          let rows = result.data || [];
          const totalCount = result.totalCount ?? 0;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            renderApplications();
            return;
          }
          if (filters.candidate_name) {
            const term = filters.candidate_name.toLowerCase();
            rows = rows.filter(function (r) {
              return (r.candidate_name || "").toLowerCase().indexOf(term) !== -1;
            });
          }
          tbody.innerHTML = "";
          const candidateViewUrl = window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.candidateView === "function"
            ? window.IEPortal.links.candidateView
            : function (id) { return "candidate.html?id=" + encodeURIComponent(String(id || "")); };
          const escapeHtml = window.escapeHtml || function (s) { return (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

          if (rows.length === 0) {
            tbody.innerHTML = "<tr><td colspan=\"5\" class=\"px-6 py-8 text-center text-gray-400\">No applications found.</td></tr>";
          } else {
            rows.forEach(function (row) {
              const tr = document.createElement("tr");
              tr.className = "table-row transition clickable-row";
              tr.setAttribute("data-entity", "application");
              tr.setAttribute("data-id", String(row.id || ""));
              const candidateUrl = candidateViewUrl(row.candidate_id);
              tr.innerHTML =
                "<td class=\"ie-table-cell ie-table-cell--primary\"><a href=\"" + escapeHtml(candidateUrl) + "\" class=\"table-link\" data-entity-type=\"candidate\" data-entity-id=\"" + escapeHtml(String(row.candidate_id || "")) + "\">" + escapeHtml(row.candidate_name || "—") + "</a></td>" +
                "<td class=\"ie-table-cell ie-table-cell--secondary\">" + escapeHtml(row.job_offer_title || "—") + "</td>" +
                "<td class=\"ie-table-cell ie-table-cell--secondary\">" + escapeHtml(row.client_name || "—") + "</td>" +
                "<td class=\"ie-table-cell\"><span class=\"badge " + getApplicationStatusBadgeClass(row.status) + "\">" + escapeHtml(formatApplicationStatusLabel(row.status)) + "</span></td>" +
                "<td class=\"ie-table-cell ie-table-cell--date\">" + (row.created_at ? new Date(row.created_at).toLocaleDateString("it-IT") : "—") + "</td>";
              tbody.appendChild(tr);
            });
          }
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
        })
        .catch(function (err) {
          console.error("[ItalianExperience] fetchApplicationsPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"5\" class=\"px-6 py-8 text-center text-red-500\">Loading error. Please try again later.</td></tr>";
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
    }

    renderApplications();
  }

  // ---------------------------------------------------------------------------
  // Clients list
  // ---------------------------------------------------------------------------

  function initClientsPage() {
    const tbody = document.querySelector("[data-ie-clients-body]");
    if (!tbody) return;

    const filters = {
      name: "",
      city: "",
      state: "",
      country: "",
      archived: "active",
    };

    let currentPage = 1;
    const limit = CLIENTS_PAGE_SIZE;

    const nameInput = document.querySelector('[data-filter="client-name"]');
    const cityInput = document.querySelector('[data-filter="client-city"]');
    const stateInput = document.querySelector('[data-filter="client-state"]');
    const countryInput = document.querySelector('[data-filter="client-country"]');
    const archivedSelect = document.querySelector('[data-filter="client-archived"]');

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
      const target = event.target;

      const offersBtn = target.closest("[data-action='view-client-offers']");
      if (offersBtn) {
        const clientId = offersBtn.getAttribute("data-id");
        if (!clientId) return;
        if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function") {
          IERouter.navigateTo("job-offers.html?client=" + encodeURIComponent(clientId));
        }
        return;
      }
    });

    const paginationEl = document
      .querySelector("[data-ie-clients-body]")
      ?.closest(".glass-card")
      ?.querySelector("[data-ie-pagination]");

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderClients();
    }

    if (paginationEl) {
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
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
      const paginationContainer = paginationEl;

      if (window.IESupabase && window.IESupabase.fetchClientsPaginated) {
        tbody.innerHTML = ""
          + "<tr>"
          + '  <td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">'
          + "    Loading clients..."
          + "  </td>"
          + "</tr>";
        window.IESupabase
          .fetchClientsPaginated({
            filters,
            page: currentPage,
            limit,
          })
          .then(function (result) {
            if (typeof window.debugLog === "function") window.debugLog("[ItalianExperience] fetchClientsPaginated result");
            const rows = result.data || [];
            const totalCount = result.totalCount ?? 0;
            const totalPages = Math.max(1, Math.ceil(totalCount / limit));
            if (currentPage > totalPages && totalPages > 0) {
              currentPage = totalPages;
              renderClients();
              return;
            }

            tbody.innerHTML = "";

            if (!rows.length) {
              tbody.innerHTML =
                '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No clients found.</td></tr>';
              updatePaginationUI(paginationContainer, totalCount, currentPage, limit, 0);
              return;
            }

            rows.forEach(function (row) {
              const activeOffersCount = (row.job_offers || []).filter(function (o) {
                if (!o || o.is_archived) return false;
                const status = o.status || "";
                return status === "active" || status === "open" || status === "inprogress" || status === "in progress";
              }).length;
              const activeOffersHtml =
                activeOffersCount > 0
                  ? '<button type="button" data-action="view-client-offers" data-id="' + (window.escapeHtml ? window.escapeHtml(row.id) : row.id) + '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' + (window.escapeHtml ? window.escapeHtml(String(activeOffersCount)) : String(activeOffersCount)) + "</button>"
                  : "0";

const tr = renderEntityRow({
          entityType: "client",
          id: row.id,
          viewUrl:
            "add-client.html?id=" +
            encodeURIComponent(row.id) +
            "&mode=view",
          editUrl: "add-client.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: row.name || "—",
          isArchived: row.is_archived,
          archivedList: false,
          actionCellOpts: { showPreviewButton: false, editTitle: "Edit client", archiveTitle: "Archive client" },
          leadingCells: [],
          middleCells: [
            '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.city || "—") : (row.city || "—")) + "</span>",
            activeOffersHtml,
            '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.email || "—") : (row.email || "—")) + "</span>",
            '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.phone || "—") : (row.phone || "—")) + "</span>",
          ],
          rowTitle: typeof formatLastUpdatedMeta === "function" ? formatLastUpdatedMeta(row) : "",
        });
              tbody.appendChild(tr);
            });

            updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
          })
          .catch(function (err) {
            console.error("[ItalianExperience] fetchClientsPaginated error:", err);
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-sm">Loading error. Please try again later.</td></tr>';
            updatePaginationUI(paginationContainer, 0, 1, limit, 0);
          });

        return;
      }

      if (typeof fetchClients === "function") {
        fetchClients(filters).then((rows) => {
          rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
          tbody.innerHTML = "";

          if (!rows.length) {
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No clients found.</td></tr>';
            if (paginationContainer) {
              updatePaginationUI(paginationContainer, 0, 1, limit, 0);
            }
            return;
          }

          const totalCount = rows.length;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
          const start = (currentPage - 1) * limit;
          const pageRows = rows.slice(start, start + limit);

          pageRows.forEach(function (row) {
            const activeOffersCount = (typeof IE_STORE !== "undefined" && IE_STORE && Array.isArray(IE_STORE.jobOffers) ? IE_STORE.jobOffers : []).filter(function (offer) {
              if (!offer || offer.is_archived) return false;
              if (offer.client_id !== row.id) return false;
              const status = offer.status || "";
              return status === "active" || status === "open" || status === "inprogress" || status === "in progress";
            }).length;
            const activeOffersHtml =
              activeOffersCount > 0
                ? '<button type="button" data-action="view-client-offers" data-id="' + (window.escapeHtml ? window.escapeHtml(row.id) : row.id) + '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' + (window.escapeHtml ? window.escapeHtml(String(activeOffersCount)) : String(activeOffersCount)) + "</button>"
                : "0";

            const tr = renderEntityRow({
              entityType: "client",
              id: row.id,
              viewUrl:
                "add-client.html?id=" +
                encodeURIComponent(row.id) +
                "&mode=view",
              editUrl: "add-client.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
              title: row.name || "—",
              isArchived: row.is_archived,
              archivedList: false,
              actionCellOpts: { showPreviewButton: false, editTitle: "Edit client", archiveTitle: "Archive client" },
              leadingCells: [],
              middleCells: [
                '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.city || "—") : (row.city || "—")) + "</span>",
                activeOffersHtml,
                '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.email || "—") : (row.email || "—")) + "</span>",
                '<span class="ie-text-muted">' + (window.escapeHtml ? window.escapeHtml(row.phone || "—") : (row.phone || "—")) + "</span>",
              ],
              rowTitle: typeof formatLastUpdatedMeta === "function" ? formatLastUpdatedMeta(row) : "",
            });
            tbody.appendChild(tr);
          });

          if (paginationContainer) {
            updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
          }
        });
      }
    }

    renderClients();
  }

  // ---------------------------------------------------------------------------
  // Global export
  // ---------------------------------------------------------------------------

  window.IEListsRuntime = window.IEListsRuntime || {};
  window.IEListsRuntime.initDashboardPage = initDashboardPage;
  window.IEListsRuntime.initCandidatesPage = initCandidatesPage;
  window.IEListsRuntime.initClientsPage = initClientsPage;
  window.IEListsRuntime.initJobOffersPage = initJobOffersPage;
  window.IEListsRuntime.initApplicationsPage = initApplicationsPage;
  window.IEListsRuntime.applyCandidateFilters = applyCandidateFilters;
  window.IEListsRuntime.applyJobOfferFilters = applyJobOfferFilters;
  window.IEListsRuntime.applyClientFilters = applyClientFilters;
  window.IEListsRuntime.renderEntityRow = renderEntityRow;
})();

