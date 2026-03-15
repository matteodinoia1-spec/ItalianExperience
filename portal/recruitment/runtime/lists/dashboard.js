// Dashboard runtime logic (delegated from IEListsRuntime shim)
(function () {
  "use strict";

  var _dashboardPreviewCache = {};

  async function initDashboardPage() {
    var api = window.IESupabase;
    if (!api) {
      setDashboardCardValues({
        totalCandidates: 0,
        activeJobOffers: 0,
        pendingReviewCount: 0,
        hiredThisMonth: 0,
      });
      renderDashboardRecentCandidates([]);
      renderDashboardSources([]);
      renderLiveOffers([]);
      return;
    }

    setDashboardLoading(true);

    try {
      var results = await Promise.all([
        api.getTotalCandidates(),
        api.getActiveJobOffers(),
        api.getPendingReviewCount(),
        api.getHiredThisMonth(),
        api.getCandidatesBySource(),
      ]);

      var totalRes = results[0];
      var activeOffersRes = results[1];
      var pendingCountRes = results[2];
      var hiredRes = results[3];
      var bySourceRes = results[4];

      setDashboardCardValues({
        totalCandidates: totalRes && !totalRes.error ? totalRes.data : 0,
        activeJobOffers:
          activeOffersRes && !activeOffersRes.error ? activeOffersRes.data : 0,
        pendingReviewCount:
          pendingCountRes && !pendingCountRes.error
            ? pendingCountRes.data
            : 0,
        hiredThisMonth: hiredRes && !hiredRes.error ? hiredRes.data : 0,
      });

      var sourceList = bySourceRes && !bySourceRes.error
        ? bySourceRes.data || []
        : [];
      renderDashboardSources(sourceList);

      if (typeof api.getPendingExternalSubmissionsPreview === "function") {
        try {
          var previewRes = await api.getPendingExternalSubmissionsPreview(5);
          var previewRows =
            previewRes && !previewRes.error ? previewRes.data || [] : [];
          renderExternalSubmissionsPreview(previewRows, previewRes.error);
        } catch (previewErr) {
          console.error(
            "[ItalianExperience] Dashboard external submissions preview error:",
            previewErr
          );
          renderExternalSubmissionsPreview([], previewErr);
        }
      }

      if (
        typeof api.getJobOffersWithPostingsForDashboard === "function" &&
        typeof window.isEffectiveLive === "function"
      ) {
        try {
          var liveRes = await api.getJobOffersWithPostingsForDashboard();
          var pairs = liveRes && !liveRes.error ? liveRes.data || [] : [];
          var liveItems = pairs.filter(function (item) {
            return window.isEffectiveLive(item.offer, item.posting);
          });
          renderLiveOffers(liveItems);
        } catch (liveErr) {
          console.error(
            "[ItalianExperience] Dashboard Live Offers error:",
            liveErr
          );
          renderLiveOffers([]);
        }
      } else {
        renderLiveOffers([]);
      }
    } catch (err) {
      console.error("[ItalianExperience] Dashboard load error:", err);
      setDashboardCardValues({
        totalCandidates: 0,
        activeJobOffers: 0,
        pendingReviewCount: 0,
        hiredThisMonth: 0,
      });
      renderDashboardSources([]);
      renderLiveOffers([]);
    } finally {
      setDashboardLoading(false);
    }
  }

  function setDashboardLoading(loading) {
    document
      .querySelectorAll("[data-dashboard-value]")
      .forEach(function (el) {
        var val = el.querySelector(".dashboard-value");
        if (val) val.textContent = loading ? "…" : val.textContent || "—";
      });
    var sourceContainer = document.querySelector(
      "[data-dashboard='candidatesBySource']"
    );
    if (sourceContainer) {
      var ph = sourceContainer.querySelector("[data-dashboard-placeholder]");
      if (ph) ph.style.display = loading ? "" : "none";
    }
  }

  function setDashboardCardValues(values) {
    var totalEl = document.querySelector(
      "[data-dashboard-value='totalCandidates']"
    );
    if (totalEl) {
      var v = totalEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.totalCandidates);
    }
    var activeEl = document.querySelector(
      "[data-dashboard-value='activeJobOffers']"
    );
    if (activeEl) {
      var v2 = activeEl.querySelector(".dashboard-value");
      if (v2) v2.textContent = formatInteger(values.activeJobOffers);
    }
    var pendingEl = document.querySelector(
      "[data-dashboard-value='pendingReviewCount']"
    );
    if (pendingEl) {
      var v3 = pendingEl.querySelector(".dashboard-value");
      if (v3) v3.textContent = formatInteger(values.pendingReviewCount);
    }
    var hiredEl = document.querySelector(
      "[data-dashboard-value='hiredThisMonth']"
    );
    if (hiredEl) {
      var v4 = hiredEl.querySelector(".dashboard-value");
      if (v4) v4.textContent = formatInteger(values.hiredThisMonth);
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
    root.className =
      "ie-dashboard-preview-popover fixed z-[100] hidden min-w-[280px] max-w-[360px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden";
    root.innerHTML =
      '<div class="p-4 space-y-2">' +
      '<p class="font-semibold text-[#1b4332] text-base" data-ie-preview-name></p>' +
      '<div class="text-sm text-gray-600 space-y-1">' +
      '<p data-ie-preview-role></p>' +
      '<p data-ie-preview-source></p>' +
      '<p data-ie-preview-status></p>' +
      '<p data-ie-preview-date></p>' +
      '<p data-ie-preview-email></p>' +
      '<p data-ie-preview-phone></p>' +
      "</div>" +
      '<div class="pt-2 flex justify-end">' +
      '<button type="button" data-ie-preview-close class="ie-btn ie-btn-secondary !py-1.5 !px-3 text-sm">Close</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(root);
    var closeBtn = root.querySelector("[data-ie-preview-close]");
    function close() {
      root.classList.add("hidden");
      root.removeAttribute("data-ie-preview-anchor");
    }
    if (closeBtn) closeBtn.addEventListener("click", close);
    root.addEventListener("click", function (e) {
      if (e.target === root) close();
    });
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
    var fullName =
      [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
    var role = (row.position || "").trim() || "—";
    var source = (row.source || "").trim() || "—";
    var statusLabel =
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
        ? window.IEStatusRuntime.formatProfileStatusLabel(row.status)
        : row.status
        ? String(row.status)
        : "Pending Approval";
    var date = row.created_at
      ? new Date(row.created_at).toLocaleDateString("it-IT")
      : "—";
    var email = (row.email || "").trim() || "—";
    var phone = (row.phone || "").trim() || "—";
    var escapeFn = window.escapeHtml || function (s) { return String(s); };
    function set(sel, text) {
      var el = popover.querySelector(sel);
      if (el) el.textContent = text;
    }
    set("[data-ie-preview-name]", fullName);
    set("[data-ie-preview-role]", "Role: " + escapeFn(role));
    set("[data-ie-preview-source]", "Source: " + escapeFn(source));
    set("[data-ie-preview-status]", "Status: " + escapeFn(statusLabel));
    set("[data-ie-preview-date]", "Date: " + date);
    set("[data-ie-preview-email]", "Email: " + escapeFn(email));
    set("[data-ie-preview-phone]", "Phone: " + escapeFn(phone));
    var rect = anchorEl.getBoundingClientRect();
    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var scrollX = window.scrollX || document.documentElement.scrollLeft;
    popover.style.left = scrollX + rect.left + "px";
    popover.style.top = scrollY + rect.bottom + 6 + "px";
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
      tr.innerHTML =
        '<td colspan="5" class="px-6 py-8 text-center text-gray-400">No internal candidates awaiting approval.</td>';
      tbody.appendChild(tr);
      return;
    }
    var statusLabelFn =
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
        ? window.IEStatusRuntime.formatProfileStatusLabel
        : function (s) {
            return s ? String(s) : "Pending Approval";
          };
    var statusClassFn =
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.getProfileStatusBadgeClass === "function"
        ? window.IEStatusRuntime.getProfileStatusBadgeClass
        : function () {
            return "badge-new";
          };
    rows.forEach(function (row) {
      _dashboardPreviewCache[row.id] = row;
      var trRow = document.createElement("tr");
      trRow.className = "clickable-row table-row transition";
      trRow.setAttribute("data-entity", "candidate");
      trRow.setAttribute("data-id", String(row.id || ""));
      var fullName =
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        "—";
      var role = (row.position || "").trim() || "—";
      var source = (row.source || "").trim() || "—";
      var statusLabel = statusLabelFn(row.status);
      trRow.title =
        fullName +
        (role !== "—" ? " · " + role : "") +
        (source ? " · " + source : "") +
        " · " +
        statusLabel;
      var candidateHref =
        window.IEPortal && window.IEPortal.links
          ? window.IEPortal.links.candidateView(row.id)
          : "#";
      var createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("it-IT")
        : "";
      var statusClass = statusClassFn(row.status);
      var idEsc = window.escapeHtml
        ? window.escapeHtml(String(row.id || ""))
        : String(row.id || "");
      var nameEsc = window.escapeHtml
        ? window.escapeHtml(fullName)
        : fullName;
      var roleEsc = window.escapeHtml
        ? window.escapeHtml(row.position || "—")
        : row.position || "—";
      trRow.innerHTML =
        '<td class="ie-table-cell ie-table-cell--primary">' +
        '<a href="' +
        candidateHref +
        '" data-action="dashboard-open-candidate" data-id="' +
        idEsc +
        '" class="table-link">' +
        nameEsc +
        "</a>" +
        "</td>" +
        '<td class="ie-table-cell ie-table-cell--secondary">' +
        roleEsc +
        "</td>" +
        '<td class="ie-table-cell ie-table-cell--date">' +
        (window.escapeHtml
          ? window.escapeHtml(createdDate)
          : createdDate) +
        "</td>" +
        '<td class="ie-table-cell"><span class="badge ' +
        statusClass +
        '">' +
        (window.escapeHtml
          ? window.escapeHtml(statusLabel)
          : statusLabel) +
        "</span></td>" +
        '<td class="ie-table-cell ie-table-actions">' +
        '<div class="flex items-center gap-2">' +
        '<button type="button" data-action="dashboard-preview-candidate" data-id="' +
        idEsc +
        '" class="ie-btn ie-btn-secondary !py-1.5 !px-2 text-sm" title="Quick preview">Preview</button>' +
        '<button type="button" data-action="dashboard-approve-candidate" data-id="' +
        idEsc +
        '" class="ie-btn ie-btn-success !py-1.5 !px-2 text-sm">Approve</button>' +
        '<button type="button" data-action="dashboard-reject-candidate" data-id="' +
        idEsc +
        '" class="ie-btn ie-btn-secondary !py-1.5 !px-2 text-sm">Reject</button>' +
        "</div></td>";
      tbody.appendChild(trRow);
    });
    if (!tbody.__ieDashboardPendingReviewBound) {
      tbody.addEventListener("click", function (event) {
        var target = event.target;
        var previewBtn = target.closest(
          "[data-action='dashboard-preview-candidate']"
        );
        var approveBtn = target.closest(
          "[data-action='dashboard-approve-candidate']"
        );
        var rejectBtn = target.closest(
          "[data-action='dashboard-reject-candidate']"
        );
        var link = target.closest("[data-action='dashboard-open-candidate']");
        if (previewBtn) {
          event.preventDefault();
          event.stopPropagation();
          var previewId = previewBtn.getAttribute("data-id");
          var previewRow = previewId
            ? _dashboardPreviewCache[previewId]
            : null;
          if (previewRow)
            showDashboardCandidatePreview(previewRow, previewBtn);
          return;
        }
        if (approveBtn) {
          event.preventDefault();
          event.stopPropagation();
          var id = approveBtn.getAttribute("data-id");
          if (!id || approveBtn.disabled) return;
          approveBtn.disabled = true;
          if (
            window.IESupabase &&
            typeof window.IESupabase.updateCandidateProfileStatus ===
              "function"
          ) {
            window.IESupabase
              .updateCandidateProfileStatus(id, "approved")
              .then(function (result) {
                if (result && !result.error) {
                  initDashboardPage();
                } else {
                  approveBtn.disabled = false;
                }
              })
              .catch(function () {
                approveBtn.disabled = false;
              });
          } else {
            approveBtn.disabled = false;
          }
          return;
        }
        if (rejectBtn) {
          event.preventDefault();
          event.stopPropagation();
          var idR = rejectBtn.getAttribute("data-id");
          if (!idR || rejectBtn.disabled) return;
          rejectBtn.disabled = true;
          if (
            window.IESupabase &&
            typeof window.IESupabase.updateCandidateProfileStatus ===
              "function"
          ) {
            window.IESupabase
              .updateCandidateProfileStatus(idR, "rejected")
              .then(function (result) {
                if (result && !result.error) {
                  initDashboardPage();
                } else {
                  rejectBtn.disabled = false;
                }
              })
              .catch(function () {
                rejectBtn.disabled = false;
              });
          } else {
            rejectBtn.disabled = false;
          }
          return;
        }
        if (link) {
          event.preventDefault();
          var idL = link.getAttribute("data-id");
          if (!idL) return;
          if (
            typeof IERouter !== "undefined" &&
            IERouter &&
            typeof IERouter.navigateTo === "function" &&
            window.IEPortal &&
            window.IEPortal.links
          ) {
            IERouter.navigateTo(window.IEPortal.links.candidateView(idL));
          }
          return;
        }
        var row = target.closest("tr[data-entity='candidate'][data-id]");
        if (row) {
          var rowId = row.getAttribute("data-id");
          if (
            rowId &&
            typeof IERouter !== "undefined" &&
            IERouter &&
            typeof IERouter.navigateTo === "function" &&
            window.IEPortal &&
            window.IEPortal.links
          ) {
            IERouter.navigateTo(window.IEPortal.links.candidateView(rowId));
          }
        }
      });
      tbody.__ieDashboardPendingReviewBound = true;
    }
  }

  function renderDashboardSources(items) {
    var container = document.querySelector(
      "[data-dashboard='candidatesBySource']"
    );
    if (!container) return;
    var placeholder = container.querySelector("[data-dashboard-placeholder]");
    if (placeholder) placeholder.remove();
    container.innerHTML = "";
    var sourceLabels =
      (window.IESourceRuntime && window.IESourceRuntime.labels) || {
        public_form: "Public Form",
        linkedin: "LinkedIn",
        facebook: "Facebook",
        direct_email: "Direct Email",
        job_application: "Job Application",
        manual_internal: "Manual Internal",
        other: "Other",
      };
    var sourceColors = [
      "bg-blue-600",
      "bg-[#c5a059]",
      "bg-green-600",
      "bg-indigo-500",
      "bg-gray-400",
    ];
    if (!items.length) {
      var p = document.createElement("p");
      p.className = "text-gray-400 text-sm py-2";
      p.textContent = "No data by source.";
      container.appendChild(p);
      return;
    }
    items.forEach(function (item, idx) {
      var key = (item.source || "other").toLowerCase();
      var label;
      if (
        window.IESourceRuntime &&
        typeof window.IESourceRuntime.sourceToLabel === "function"
      ) {
        label = window.IESourceRuntime.sourceToLabel(item.source || null);
      } else {
        label = sourceLabels[key] || key;
      }
      var color = sourceColors[idx % sourceColors.length];
      var div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML =
        '<div class="flex justify-between text-xs font-bold uppercase tracking-tight">' +
        '<span class="text-gray-500">' +
        (window.escapeHtml ? window.escapeHtml(label) : label) +
        "</span>" +
        '<span class="text-[#1b4332]">' +
        (item.percentage || 0) +
        "%</span>" +
        "</div>" +
        '<div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">' +
        '<div class="h-full ' +
        color +
        ' rounded-full" style="width:' +
        (item.percentage || 0) +
        '%"></div>' +
        "</div>";
      container.appendChild(div);
    });
  }

  function getPublicJobPostingUrl(slug) {
    if (!slug || !String(slug).trim()) return null;
    if (!window.IEConfig || !window.IEConfig.BASE_PATH) {
      console.error(
        "[ItalianExperience] IEConfig.BASE_PATH is required for public job posting URLs (dashboard)."
      );
      return null;
    }
    var base = window.IEConfig.BASE_PATH;
    base = String(base).replace(/\/$/, "");
    return (
      window.location.origin +
      base +
      "/recruitment/jobs/?slug=" +
      encodeURIComponent(String(slug).trim())
    );
  }

  var LIVE_OFFERS_CAP = 5;

  function renderLiveOffers(liveItems) {
    var container = document.querySelector("[data-dashboard='liveOffers']");
    if (!container) return;
    var placeholder = container.querySelector("[data-dashboard-placeholder]");
    var body = container.querySelector("[data-dashboard-live-offers-body]");
    if (!body) return;
    if (placeholder) placeholder.style.display = "none";
    body.classList.remove("hidden");
    body.innerHTML = "";
    var list = Array.isArray(liveItems) ? liveItems : [];
    var escapeFn = window.escapeHtml || function (x) {
      return x == null ? "" : String(x);
    };
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "text-sm text-gray-400";
      empty.textContent = "No live offers at the moment.";
      body.appendChild(empty);
      return;
    }
    var toShow = list.slice(0, LIVE_OFFERS_CAP);
    toShow.forEach(function (item) {
      var offer = item.offer || {};
      var posting = item.posting || null;
      void posting; // kept for parity, no-op
      var title = (offer.title || "—").toString();
      var clientName = (offer.client_name || "—").toString();
      var offerId = offer.id;
      var offerViewUrl =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.offerView === "function"
          ? window.IEPortal.links.offerView(offerId)
          : "job-offer.html?id=" +
            encodeURIComponent(String(offerId)) +
            "&mode=view";

      var row = document.createElement("div");
      row.className =
        "flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0";
      row.innerHTML =
        '<div class="min-w-0 flex-1">' +
        '<a href="' +
        escapeFn(offerViewUrl) +
        '" class="text-sm font-medium text-[#1b4332] hover:underline block truncate" data-action="dashboard-open-job-offer" data-id="' +
        escapeFn(offerId) +
        '">' +
        escapeFn(title) +
        "</a>" +
        '<p class="text-[11px] text-gray-500 truncate">' +
        escapeFn(clientName) +
        "</p>" +
        "</div>" +
        '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">Live</span>';
      var link = row.querySelector(
        "[data-action='dashboard-open-job-offer']"
      );
      if (
        link &&
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          window.IERouter.navigateTo(offerViewUrl);
        });
      }
      body.appendChild(row);
    });
  }

  function renderExternalSubmissionsPreview(items, error) {
    var table = document.querySelector(
      "[data-dashboard='externalSubmissionsPreview']"
    );
    if (!table) return;
    var tbody = table.querySelector("[data-dashboard-body]");
    var placeholder = table.querySelector("[data-dashboard-placeholder]");
    if (!tbody) return;

    if (placeholder) {
      placeholder.remove();
    }

    tbody.innerHTML = "";

    if (error) {
      var trError = document.createElement("tr");
      var tdError = document.createElement("td");
      tdError.colSpan = 5;
      tdError.className =
        "px-6 py-6 text-center text-sm text-red-500 whitespace-pre-line";
      tdError.textContent =
        "Error loading inbound submissions preview.\nPlease try again later.";
      trError.appendChild(tdError);
      tbody.appendChild(trError);
      return;
    }

    var list = Array.isArray(items) ? items : [];
    if (!list.length) {
      var trEmpty = document.createElement("tr");
      var tdEmpty = document.createElement("td");
      tdEmpty.colSpan = 5;
      tdEmpty.className =
        "px-6 py-6 text-center text-sm text-gray-400 whitespace-pre-line";
      tdEmpty.textContent =
        "No external submissions are currently awaiting review.";
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
      return;
    }

    function normalizeStatus(status) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime
          .normalizeExternalSubmissionStatus === "function"
      ) {
        return window.IEStatusRuntime.normalizeExternalSubmissionStatus(
          status
        );
      }
      var s = (status || "").toString().toLowerCase();
      return s || "pending_review";
    }

    function formatStatusLabel(status) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime
          .formatExternalSubmissionStatusLabel === "function"
      ) {
        return window.IEStatusRuntime.formatExternalSubmissionStatusLabel(
          status
        );
      }
      var s = normalizeStatus(status);
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
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime
          .getExternalSubmissionStatusBadgeClass === "function"
      ) {
        return window.IEStatusRuntime.getExternalSubmissionStatusBadgeClass(
          status
        );
      }
      var s = normalizeStatus(status);
      if (s === "pending_review") return "badge-open";
      if (s === "converted") return "badge-hired";
      if (s === "linked_existing") return "badge-inprogress";
      if (s === "rejected") return "badge-rejected";
      return "badge-open";
    }

    function formatDate(value) {
      if (
        window.IEFormatters &&
        typeof window.IEFormatters.formatDate === "function"
      ) {
        return window.IEFormatters.formatDate(value) || "";
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

    function navigateToExternalSubmissionDetail(id) {
      var href =
        "recruitment/external-submission.html?id=" + encodeURIComponent(String(id));
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo(href);
      } else {
        window.location.href = href;
      }
    }

    list.forEach(function (row) {
      var trRow = document.createElement("tr");
      trRow.className =
        "table-row transition hover:bg-gray-50/70 cursor-pointer clickable-row";
      trRow.dataset.id = String(row.id);

      var fullName =
        (row && row.full_name_computed) ||
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        "—";
      var typeLabel =
        (row &&
          row.submission_type &&
          row.submission_type.toString()) ||
        "—";
      var createdAt = formatDate(row && row.created_at);
      var statusNorm = normalizeStatus(row && row.status);
      var statusLabel = formatStatusLabel(statusNorm);
      var badgeClass = getStatusBadgeClass(statusNorm);

      var tdName = document.createElement("td");
      tdName.className = "ie-table-cell ie-table-cell--primary";
      tdName.textContent = fullName;
      trRow.appendChild(tdName);

      var tdType = document.createElement("td");
      tdType.className = "ie-table-cell";
      tdType.textContent = typeLabel;
      trRow.appendChild(tdType);

      var tdDate = document.createElement("td");
      tdDate.className = "ie-table-cell";
      tdDate.innerHTML =
        '<span class="ie-table-cell--date">' +
        (window.escapeHtml
          ? window.escapeHtml(createdAt || "")
          : createdAt || "") +
        "</span>";
      trRow.appendChild(tdDate);

      var tdStatus = document.createElement("td");
      tdStatus.className = "ie-table-cell";
      tdStatus.innerHTML =
        '<span class="badge ' +
        badgeClass +
        '">' +
        (window.escapeHtml
          ? window.escapeHtml(statusLabel)
          : statusLabel) +
        "</span>";
      trRow.appendChild(tdStatus);

      var tdActions = document.createElement("td");
      tdActions.className = "ie-table-cell ie-table-actions text-center";
      tdActions.innerHTML =
        '<button type="button" class="ie-btn ie-btn-secondary ie-btn-xs" data-action="open-external-submission" data-id="' +
        String(row.id) +
        '">Open</button>';
      trRow.appendChild(tdActions);

      tbody.appendChild(trRow);
    });

    tbody.addEventListener("click", function (event) {
      var target = event.target;
      var openBtn = target.closest(
        "[data-action='open-external-submission']"
      );
      if (openBtn) {
        event.stopPropagation();
        var idBtn = openBtn.getAttribute("data-id");
        if (!idBtn) return;
        navigateToExternalSubmissionDetail(idBtn);
        return;
      }

      var row = target.closest("tr[data-id]");
      if (!row) return;
      if (target.closest("button, a, svg, path")) return;
      var id = row.getAttribute("data-id");
      if (!id) return;
      navigateToExternalSubmissionDetail(id);
    });
  }

  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});
  if (typeof runtime.initDashboardPage !== "function") {
    runtime.initDashboardPage = initDashboardPage;
  }

  window.IEDashboardListRuntime = {
    initDashboardPage: initDashboardPage,
  };
})();

