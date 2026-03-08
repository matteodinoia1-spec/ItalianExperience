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
    var segments =
      Array.isArray(effectiveMeta.breadcrumbs) && effectiveMeta.breadcrumbs.length
        ? normalizeBreadcrumbs(effectiveMeta.breadcrumbs)
        : getDefaultBreadcrumbs();
    setPageBreadcrumbs(segments);
  }

  // -------------------------------------------------------------------------
  // Phase 2: active nav state, desktop submenus, user menu, logout
  // -------------------------------------------------------------------------

  /** Page key -> nav group for header active state. profile and unknown -> null. */
  var PAGE_KEY_TO_NAV_GROUP = {
    dashboard: "dashboard",
    candidates: "candidates",
    candidate: "candidates",
    "add-candidate": "candidates",
    "job-offers": "job-offers",
    "add-job-offer": "job-offers",
    applications: "applications",
    application: "applications",
    clients: "clients",
    "add-client": "clients",
    archived: "archived",
  };

  function getNavGroupForPageKey(pageKey) {
    return PAGE_KEY_TO_NAV_GROUP[pageKey] || null;
  }

  function applyHeaderActiveState() {
    var pageKey =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : "dashboard";
    var group = getNavGroupForPageKey(pageKey);
    var links = document.querySelectorAll(".portal-header-nav__link[data-nav-group]");
    links.forEach(function (link) {
      var linkGroup = link.getAttribute("data-nav-group");
      if (linkGroup && linkGroup === group) {
        link.classList.add("portal-header-nav__link--active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("portal-header-nav__link--active");
        link.removeAttribute("aria-current");
      }
    });
  }

  function normalizeHeaderLinks() {
    if (!window.IERouter || typeof window.IERouter.derivePortalBasePath !== "function") return;
    var base = window.IERouter.derivePortalBasePath();
    var header = document.querySelector(".portal-header");
    if (!header) return;
    var linkMap = {
      "dashboard.html": "dashboard.html",
      "candidates.html": "candidates.html",
      "add-candidate.html": "add-candidate.html",
      "job-offers.html": "job-offers.html",
      "add-job-offer.html": "add-job-offer.html",
      "applications.html": "applications.html",
      "clients.html": "clients.html",
      "add-client.html": "add-client.html",
      "archived.html": "archived.html",
      "profile.html": "profile.html",
    };
    header.querySelectorAll("a[href]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").trim();
      if (a.hasAttribute("data-action") && a.getAttribute("data-action") === "logout") return;
      var path = href.split("/").pop() || href;
      var target = linkMap[path] || (path.indexOf(".html") !== -1 ? path : null);
      if (target) a.setAttribute("href", base + target);
    });
  }

  function closeUserMenu() {
    var area = document.querySelector(".portal-header-user-area--open");
    if (area) {
      area.classList.remove("portal-header-user-area--open");
      var trigger = area.querySelector("[data-user-menu-trigger]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }
  }

  function closeAllMenus() {
    closeUserMenu();
  }

  var headerNavGlobalListenersBound = false;

  function ensureGlobalMenuListeners() {
    if (headerNavGlobalListenersBound) return;
    headerNavGlobalListenersBound = true;

    document.addEventListener("click", function (e) {
      if (!e.target || !e.target.closest) return;
      var insideHeader = e.target.closest(".portal-header");
      var insideUserArea = e.target.closest(".portal-header-user-area");
      if (!insideHeader) {
        closeAllMenus();
        return;
      }
      if (insideUserArea) return;
      closeAllMenus();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllMenus();
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia && !window.matchMedia("(min-width: 1024px)").matches) {
        closeUserMenu();
      }
    });
  }

  function initUserMenu() {
    var header = document.querySelector(".portal-header");
    if (!header) return;
    var trigger = header.querySelector("[data-user-menu-trigger]");
    var area = header.querySelector(".portal-header-user-area");
    if (!trigger || !area) return;

    function toggleUserMenu() {
      var open = area.classList.toggle("portal-header-user-area--open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      toggleUserMenu();
    });
    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleUserMenu();
      }
    });
  }

  function initHeaderLogout() {
    var header = document.querySelector(".portal-header");
    if (!header) return;
    var logoutLink = header.querySelector('[data-action="logout"]');
    if (!logoutLink) return;

    logoutLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (!window.IEAuth) return;
      (function doLogout() {
        var logoutPromise =
          typeof window.IEAuth.logout === "function" ? window.IEAuth.logout() : Promise.resolve();
        Promise.resolve(logoutPromise).then(function () {
          if (window.IEPortal && typeof window.IEPortal.clearSessionState === "function") {
            window.IEPortal.clearSessionState();
          }
          if (typeof window !== "undefined") window.__IE_AUTH_USER__ = null;
          if (typeof window.IEAuth.redirectToLogin === "function") {
            window.IEAuth.redirectToLogin();
          }
        });
      })();
    });
  }

  function initHeaderNavBehavior() {
    normalizeHeaderLinks();
    applyHeaderActiveState();
    initUserMenu();
    initHeaderLogout();
    ensureGlobalMenuListeners();
  }

  var headerListenerBound = false;

  function bindHeaderLoadedListener() {
    if (headerListenerBound) return;
    headerListenerBound = true;

    document.addEventListener("ie:header-loaded", function () {
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

      initHeaderNavBehavior();
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
    applyHeaderActiveState: applyHeaderActiveState,
  };

  // Ensure header behavior is wired even when the header
  // is loaded early via header-loader before initHeader runs.
  bindHeaderLoadedListener();
})();

