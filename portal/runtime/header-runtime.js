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
      candidate: "Candidate",
      applications: "Applications",
      application: "Application",
      clients: "Clients",
      client: "Client",
      "job-offers": "Job Offers",
      "job-offer": "Job Offer",
      "job-postings": "Job Postings",
      "job-posting": "Job Posting",
      "external-submissions": "External Submissions",
      "external-submission": "External Submission",
      archived: "Archived",
      profile: "User Profile",
      "add-candidate": "Add New Candidate",
      "add-job-offer": "Create New Job Offer",
      "add-client": "Add Client",
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
      candidate: "View and manage candidate details.",
      applications: "All candidate applications.",
      application: "View and manage application details.",
      clients: "Manage your network of companies and partners.",
      client: "View and manage client details.",
      "job-offers": "Manage open positions for clients in your network.",
      "job-offer": "View and manage job offer details.",
      "job-postings": "Public job postings linked to job offers.",
      "job-posting": "View job posting details and deadline.",
      "external-submissions": "Review submissions from the public application form.",
      "external-submission": "View and manage external submission details.",
      archived: "Review archived candidates, job offers, and clients.",
      profile: "Manage your personal information and your role in the portal.",
      "add-candidate":
        "Fill in the fields below to add a new candidate to the database.",
      "add-job-offer":
        "Define the parameters for the new hiring search.",
      "add-client": "Enter the company or partner details.",
    };
    return subtitles[key] || "";
  }

  function getDefaultBreadcrumbs() {
    var key =
      window.IERouterRuntime && typeof window.IERouterRuntime.getPageKey === "function"
        ? window.IERouterRuntime.getPageKey()
        : "dashboard";
    var dashboard = { label: "Dashboard", path: "recruitment/dashboard.html" };
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
      case "job-postings":
        return [dashboard, { label: "Job Offers", path: "recruitment/job-offers.html" }, { label: "Job Postings" }];
      case "job-posting":
        return [dashboard, { label: "Job Offers", path: "recruitment/job-offers.html" }, { label: "Job Postings", path: "recruitment/job-postings.html" }, { label: "Job Posting" }];
      case "archived":
        return [dashboard, { label: "Archived" }];
      case "add-candidate":
        return [
          dashboard,
          { label: "Candidates", path: "recruitment/candidates.html" },
          { label: "Add Candidate" },
        ];
      case "add-job-offer":
        return [
          dashboard,
          { label: "Job Offers", path: "recruitment/job-offers.html" },
          { label: "Create Job Offer" },
        ];
      case "add-client":
        return [
          dashboard,
          { label: "Clients", path: "recruitment/clients.html" },
          { label: "Add Client" },
        ];
      case "profile":
        return [dashboard, { label: "Profile" }];
      case "candidate":
        return [
          dashboard,
          { label: "Candidates", path: "recruitment/candidates.html" },
          { label: "Candidate" },
        ];
      case "client":
        return [
          dashboard,
          { label: "Clients", path: "recruitment/clients.html" },
          { label: "Client" },
        ];
      case "application":
        return [
          dashboard,
          { label: "Applications", path: "recruitment/applications.html" },
          { label: "Application" },
        ];
      case "job-offer":
        return [
          dashboard,
          { label: "Job Offers", path: "recruitment/job-offers.html" },
          { label: "Job Offer" },
        ];
      case "external-submissions":
        return [dashboard, { label: "External Submissions" }];
      case "external-submission":
        return [
          dashboard,
          { label: "External Submissions", path: "recruitment/external-submissions.html" },
          { label: "Submission" },
        ];
      default:
        return [{ label: "Dashboard", path: "recruitment/dashboard.html" }];
    }
  }

  function normalizeBreadcrumbSegment(seg) {
    if (!seg || !seg.label) return null;
    if (seg.path) return { label: seg.label, path: seg.path };
    var pathMap = {
      dashboard: "recruitment/dashboard.html",
      candidates: "recruitment/candidates.html",
      applications: "recruitment/applications.html",
      clients: "recruitment/clients.html",
      "job-offers": "recruitment/job-offers.html",
      "job-postings": "recruitment/job-postings.html",
      "external-submissions": "recruitment/external-submissions.html",
      archived: "recruitment/archived.html",
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
    if (window.IEFormatters && typeof window.IEFormatters.escapeHtml === "function") {
      return window.IEFormatters.escapeHtml(text);
    }
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
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

    var titleEl = document.getElementById("portal-header-page-title");
    if (titleEl) titleEl.textContent = effectiveMeta.title;
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
    "job-postings": "job-offers",
    "job-offer": "job-offers",
    "job-posting": "job-offers",
    "add-job-offer": "job-offers",
    applications: "applications",
    application: "applications",
    clients: "clients",
    client: "clients",
    "add-client": "clients",
    "external-submissions": "candidates",
    "external-submission": "candidates",
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
      var active = linkGroup && linkGroup === group;
      if (active) {
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
      "hub-dashboard.html": "dashboard.html",
      "dashboard.html": "recruitment/dashboard.html",
      "candidates.html": "recruitment/candidates.html",
      "candidates.html?status=pending_review": "recruitment/candidates.html?status=pending_review",
      "external-submissions.html": "recruitment/external-submissions.html",
      "add-candidate.html": "recruitment/add-candidate.html",
      "job-offers.html": "recruitment/job-offers.html",
      "job-postings.html": "recruitment/job-postings.html",
      "add-job-offer.html": "recruitment/add-job-offer.html",
      "applications.html": "recruitment/applications.html",
      "clients.html": "recruitment/clients.html",
      "add-client.html": "recruitment/add-client.html",
      "archived.html": "recruitment/archived.html",
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

  function closeCandidatesSubmenu() {
    var wrap = document.querySelector("[data-nav-candidates-wrap]");
    if (wrap) {
      wrap.classList.remove("portal-header-nav__item-with-sub--open");
      wrap.setAttribute("aria-expanded", "false");
    }
  }

  function closeJobOffersSubmenu() {
    var wrap = document.querySelector("[data-nav-job-offers-wrap]");
    if (wrap) {
      wrap.classList.remove("portal-header-nav__item-with-sub--open");
      wrap.setAttribute("aria-expanded", "false");
    }
  }

  function closeAllMenus() {
    closeUserMenu();
    closeCandidatesSubmenu();
    closeJobOffersSubmenu();
  }

  var headerNavGlobalListenersBound = false;

  function ensureGlobalMenuListeners() {
    if (headerNavGlobalListenersBound) return;
    headerNavGlobalListenersBound = true;

    document.addEventListener("click", function (e) {
      if (!e.target || !e.target.closest) return;
      var insideHeader = e.target.closest(".portal-header");
      var insideUserArea = e.target.closest(".portal-header-user-area");
      var insideCandidatesWrap = e.target.closest("[data-nav-candidates-wrap]");
      var insideJobOffersWrap = e.target.closest("[data-nav-job-offers-wrap]");
      if (!insideHeader) {
        closeAllMenus();
        return;
      }
      if (insideUserArea) return;
      if (!insideCandidatesWrap) closeCandidatesSubmenu();
      if (!insideJobOffersWrap) closeJobOffersSubmenu();
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

  function initCandidatesSubmenu() {
    var wrap = document.querySelector("[data-nav-candidates-wrap]");
    var menu = document.querySelector("[data-nav-candidates-menu]");
    if (!wrap || !menu) return;

    // Make submenu interaction more forgiving: keep it open while cursor is
    // over the trigger or menu, instead of relying solely on tight hover gaps.
    var closeTimeout = null;

    function openSubmenu() {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
      wrap.classList.add("portal-header-nav__item-with-sub--open");
      wrap.setAttribute("aria-expanded", "true");
    }

    function scheduleClose() {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
      closeTimeout = setTimeout(function () {
        closeCandidatesSubmenu();
      }, 120);
    }

    wrap.addEventListener("mouseenter", openSubmenu);
    menu.addEventListener("mouseenter", openSubmenu);
    wrap.addEventListener("mouseleave", scheduleClose);
    menu.addEventListener("mouseleave", scheduleClose);

    // On touch / non-hover devices, support click-to-toggle so the submenu
    // can be opened and used without relying on hover.
    var supportsHover =
      window.matchMedia &&
      window.matchMedia("(hover: hover)").matches;
    if (!supportsHover) {
      var triggerLink = wrap.querySelector(
        ".portal-header-nav__link[data-nav-group='candidates']"
      );
      if (triggerLink) {
        triggerLink.addEventListener("click", function (e) {
          e.preventDefault();
          var isOpen = wrap.classList.contains(
            "portal-header-nav__item-with-sub--open"
          );
          if (isOpen) {
            closeCandidatesSubmenu();
          } else {
            openSubmenu();
          }
        });
      }
    }

    menu.querySelectorAll("[data-nav-submenu-item]").forEach(function (link) {
      link.addEventListener("click", function () {
        closeCandidatesSubmenu();
      });
    });
  }

  function initJobOffersSubmenu() {
    var wrap = document.querySelector("[data-nav-job-offers-wrap]");
    var menu = document.querySelector("[data-nav-job-offers-menu]");
    if (!wrap || !menu) return;

    var closeTimeout = null;

    function openSubmenu() {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
      wrap.classList.add("portal-header-nav__item-with-sub--open");
      wrap.setAttribute("aria-expanded", "true");
    }

    function scheduleClose() {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
      closeTimeout = setTimeout(function () {
        closeJobOffersSubmenu();
      }, 120);
    }

    wrap.addEventListener("mouseenter", openSubmenu);
    menu.addEventListener("mouseenter", openSubmenu);
    wrap.addEventListener("mouseleave", scheduleClose);
    menu.addEventListener("mouseleave", scheduleClose);

    var supportsHover =
      window.matchMedia &&
      window.matchMedia("(hover: hover)").matches;
    if (!supportsHover) {
      var triggerLink = wrap.querySelector(
        ".portal-header-nav__link[data-nav-group='job-offers']"
      );
      if (triggerLink) {
        triggerLink.addEventListener("click", function (e) {
          e.preventDefault();
          var isOpen = wrap.classList.contains(
            "portal-header-nav__item-with-sub--open"
          );
          if (isOpen) {
            closeJobOffersSubmenu();
          } else {
            openSubmenu();
          }
        });
      }
    }

    menu.querySelectorAll("[data-nav-submenu-item]").forEach(function (link) {
      link.addEventListener("click", function () {
        closeJobOffersSubmenu();
      });
    });
  }

  function initHeaderNavBehavior() {
    normalizeHeaderLinks();
    applyHeaderActiveState();
    initCandidatesSubmenu();
    initJobOffersSubmenu();
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
    closeCandidatesSubmenu: closeCandidatesSubmenu,
    closeJobOffersSubmenu: closeJobOffersSubmenu,
  };

  // Ensure header behavior is wired even when the header
  // is loaded early via header-loader before initHeader runs.
  bindHeaderLoadedListener();
})();

