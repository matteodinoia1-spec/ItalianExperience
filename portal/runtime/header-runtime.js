// ============================================================================
// Italian Experience Recruitment Portal - Header Runtime
// ----------------------------------------------------------------------------
// Page header mounting, title/subtitle defaults, and breadcrumb rendering.
// Extracted from core/app-shell.js.
// ============================================================================

(function () {
  "use strict";

  function getDefaultTitle() {
    var key =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : "dashboard";
    var titles = {
      dashboard: "Dashboard",
      candidates: "Candidates",
      clients: "Clients",
      "job-offers": "Job Offers",
      applications: "Applications",
      archived: "Archived",
      profile: "User Profile",
      "add-candidate": "Add New Candidate",
      "add-job-offer": "Create New Job Offer",
      "add-client": "Add Client",
      candidate: "Candidate",
    };
    return titles[key] || "Dashboard";
  }

  function getDefaultSubtitle() {
    var key =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : "dashboard";
    var subtitles = {
      dashboard: "Overview of your recruitment activity and key metrics.",
      candidates: "Manage and track talent in your exclusive network.",
      clients: "Manage your network of companies and partners.",
      "job-offers": "Manage open positions for clients in your network.",
      applications: "All candidate applications.",
      archived: "Review archived candidates, job offers, and clients.",
      profile: "Manage your personal information and your role in the portal.",
      "add-candidate":
        "Fill in the fields below to add a new candidate to the database.",
      "add-job-offer":
        "Define the parameters for the new hiring search.",
      "add-client": "Enter the company or partner details.",
      candidate: "View and manage candidate details.",
    };
    return subtitles[key] || "";
  }

  function getDefaultBreadcrumbs() {
    var key =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : "dashboard";
    var dashboard = { label: "Dashboard", path: "dashboard.html" };
    switch (key) {
      case "dashboard":
        return [{ label: "Dashboard" }];
      case "candidates":
        return [dashboard, { label: "Candidates" }];
      case "applications":
        return [dashboard, { label: "Applications" }];
      case "clients":
        return [dashboard, { label: "Clients" }];
      case "job-offers":
        return [dashboard, { label: "Job Offers" }];
      case "archived":
        return [dashboard, { label: "Archived" }];
      case "add-candidate":
        return [
          dashboard,
          { label: "Candidates", path: "candidates.html" },
          { label: "Add Candidate" },
        ];
      case "add-job-offer":
        return [
          dashboard,
          { label: "Job Offers", path: "job-offers.html" },
          { label: "Create Job Offer" },
        ];
      case "add-client":
        return [
          dashboard,
          { label: "Clients", path: "clients.html" },
          { label: "Add Client" },
        ];
      case "profile":
        return [dashboard, { label: "Profile" }];
      case "candidate":
        return [
          dashboard,
          { label: "Candidates", path: "candidates.html" },
          { label: "Candidate" },
        ];
      default:
        return [{ label: "Dashboard", path: "dashboard.html" }];
    }
  }

  function normalizeBreadcrumbSegment(seg) {
    if (!seg || !seg.label) return null;
    if (seg.path) return { label: seg.label, path: seg.path };
    var pathMap = {
      dashboard: "dashboard.html",
      candidates: "candidates.html",
      applications: "applications.html",
      clients: "clients.html",
      "job-offers": "job-offers.html",
      archived: "archived.html",
      profile: "profile.html",
    };
    var path = pathMap[(seg.entity || "").toString()];
    return path ? { label: seg.label, path: path } : { label: seg.label };
  }

  function normalizeBreadcrumbs(segments) {
    if (!Array.isArray(segments) || !segments.length) return [];
    return segments.map(normalizeBreadcrumbSegment).filter(Boolean);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function setPageBreadcrumbs(segments) {
    if (!Array.isArray(segments) || !segments.length) return;
    var el = document.getElementById("page-breadcrumbs");
    if (!el) return;
    var parts = [];
    segments.forEach(function (s, i) {
      if (i > 0) {
        parts.push('<span class="breadcrumb-sep">/</span>');
      }
      if (
        s.path &&
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        var path = s.path;
        parts.push(
          '<a class="breadcrumb-link" onclick="event.preventDefault(); IERouter.navigateTo(\'' +
            path.replace(/'/g, "\\'") +
            '\')" href="#">' +
            escapeHtml(s.label) +
            "</a>"
        );
      } else {
        parts.push(
          '<span class="breadcrumb-current">' +
            escapeHtml(s.label) +
            "</span>"
        );
      }
    });
    el.innerHTML = parts.join("");
  }

  function mountPageHeader() {
    var meta = window.pageMeta;
    var headerPageInfo = document.getElementById("portal-header-page-info");
    if (!headerPageInfo) return;
    if (typeof renderHeaderPageInfo !== "function") return;
    var effectiveMeta = {
      title: (meta && meta.title) || getDefaultTitle(),
      subtitle: (meta && meta.subtitle) || getDefaultSubtitle(),
      breadcrumbs:
        meta &&
        Array.isArray(meta.breadcrumbs) &&
        meta.breadcrumbs.length
          ? meta.breadcrumbs
          : getDefaultBreadcrumbs(),
    };
    headerPageInfo.innerHTML = renderHeaderPageInfo(effectiveMeta);
    var segments =
      Array.isArray(effectiveMeta.breadcrumbs) && effectiveMeta.breadcrumbs.length
        ? normalizeBreadcrumbs(effectiveMeta.breadcrumbs)
        : getDefaultBreadcrumbs();
    setPageBreadcrumbs(segments);
  }

  var headerListenerBound = false;

  function bindHeaderLoadedListener() {
    if (headerListenerBound) return;
    headerListenerBound = true;

    document.addEventListener("ie:header-loaded", function () {
      var sidebar = document.getElementById("sidebar");
      if (
        sidebar &&
        window.IELayoutRuntime &&
        typeof window.IELayoutRuntime.initLayout === "function"
      ) {
        window.IELayoutRuntime.initLayout();
      }
      mountPageHeader();

      if (
        window.IEProfileRuntime &&
        typeof window.IEProfileRuntime.ensureHeaderAvatarLinksToProfile ===
          "function"
      ) {
        window.IEProfileRuntime.ensureHeaderAvatarLinksToProfile();
      }
      if (
        window.IEProfileRuntime &&
        typeof window.IEProfileRuntime.updateHeaderUserBlock === "function"
      ) {
        window.IEProfileRuntime.updateHeaderUserBlock();
      }
    });
  }

  /**
   * Initialize header for the current page.
   * - Mounts the header component
   * - Computes and renders breadcrumbs
   * - Applies page title/subtitle
   * - Connects avatar block to profile
   * - Updates header user info
   */
  function initHeader(pageKey) {
    // pageKey is accepted for future use; current logic relies on IERouterRuntime.
    void pageKey;

    // Mount header immediately if possible.
    mountPageHeader();

    // Ensure avatar block and header user block are wired to the profile.
    if (
      window.IEProfileRuntime &&
      typeof window.IEProfileRuntime.ensureHeaderAvatarLinksToProfile ===
        "function"
    ) {
      window.IEProfileRuntime.ensureHeaderAvatarLinksToProfile();
    }
    if (
      window.IEProfileRuntime &&
      typeof window.IEProfileRuntime.updateHeaderUserBlock === "function"
    ) {
      window.IEProfileRuntime.updateHeaderUserBlock();
    }

    // Preserve legacy behavior that also reacts when the header dispatches
    // the custom "ie:header-loaded" event.
    bindHeaderLoadedListener();
  }

  window.IEHeaderRuntime = {
    initHeader: initHeader,
    mountPageHeader: mountPageHeader,
    setPageBreadcrumbs: setPageBreadcrumbs,
    getDefaultTitle: getDefaultTitle,
    getDefaultSubtitle: getDefaultSubtitle,
    getDefaultBreadcrumbs: getDefaultBreadcrumbs,
  };
})();

