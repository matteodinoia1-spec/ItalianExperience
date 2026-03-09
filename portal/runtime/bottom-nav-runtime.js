// ============================================================================
// Italian Experience Recruitment Portal - Bottom Nav Runtime
// ----------------------------------------------------------------------------
// Mobile bottom navigation behavior:
// - Link normalization via IERouter.derivePortalBasePath()
// - Active state based on current page key
// - "More" menu toggle (click, outside click, Escape)
// - Logout wiring inside the More panel (shared flow)
// ============================================================================

(function () {
  "use strict";

  /** Page key -> nav group used for bottom-nav active state. */
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
    profile: "profile",
  };

  var lastPageKey = null;
  var globalListenersBound = false;
  var headerLoadedListenerBound = false;

  function getNavGroupForPageKey(pageKey) {
    return PAGE_KEY_TO_NAV_GROUP[pageKey] || null;
  }

  function getCurrentPageKey() {
    if (lastPageKey) return lastPageKey;

    if (window.IEPortal && window.IEPortal.pageKey) {
      return window.IEPortal.pageKey;
    }

    if (
      window.IERouterRuntime &&
      typeof window.IERouterRuntime.getPageKey === "function"
    ) {
      return window.IERouterRuntime.getPageKey();
    }

    return "dashboard";
  }

  function normalizeBottomNavLinks() {
    if (
      !window.IERouter ||
      typeof window.IERouter.derivePortalBasePath !== "function"
    ) {
      return;
    }

    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    var base = window.IERouter.derivePortalBasePath();

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
      "index.html": "index.html",
    };

    nav.querySelectorAll("a[href]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").trim();

      if (a.hasAttribute("data-action") && a.getAttribute("data-action") === "logout") {
        return;
      }

      var path = href.split("/").pop() || href;
      var target =
        linkMap[path] || (path.indexOf(".html") !== -1 ? path : null);
      if (!target) return;

      a.setAttribute("href", base + target);
    });
  }

  function applyBottomNavActiveState(explicitPageKey) {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    var pageKey = explicitPageKey || getCurrentPageKey();
    var group = getNavGroupForPageKey(pageKey);

    var items = nav.querySelectorAll(
      ".portal-bottom-nav__item[data-nav-group]"
    );
    items.forEach(function (item) {
      var itemGroup = item.getAttribute("data-nav-group");
      if (itemGroup && itemGroup === group) {
        item.classList.add("portal-bottom-nav__item--active");
        item.setAttribute("aria-current", "page");
      } else {
        item.classList.remove("portal-bottom-nav__item--active");
        item.removeAttribute("aria-current");
      }
    });

    var moreTrigger = nav.querySelector(
      '.portal-bottom-nav__item[data-nav-group="more"]'
    );
    var morePanel = nav.querySelector(".portal-bottom-nav__more");

    var moreGroups = { clients: true, archived: true, profile: true };
    var isMoreActive = !!(group && moreGroups[group]);

    if (moreTrigger) {
      if (isMoreActive) {
        moreTrigger.classList.add("portal-bottom-nav__item--active");
        moreTrigger.setAttribute("aria-current", "page");
      } else if (!group) {
        moreTrigger.classList.remove("portal-bottom-nav__item--active");
        moreTrigger.removeAttribute("aria-current");
      }
    }

    if (morePanel && isMoreActive) {
      var activeMoreLink = morePanel.querySelector(
        '[data-nav-group="' + group + '"]'
      );
      morePanel
        .querySelectorAll("[data-nav-group]")
        .forEach(function (link) {
          link.classList.remove("portal-bottom-nav__more-link--active");
        });
      if (activeMoreLink) {
        activeMoreLink.classList.add("portal-bottom-nav__more-link--active");
      }
    }
  }

  function setMoreOpen(isOpen) {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    var trigger = nav.querySelector(
      '.portal-bottom-nav__item[data-nav-group="more"]'
    );
    var panel = nav.querySelector(".portal-bottom-nav__more");
    if (!trigger || !panel) return;

    if (isOpen) {
      trigger.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      panel.removeAttribute("hidden");
      nav.classList.add("portal-bottom-nav--more-open");
    } else {
      trigger.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("hidden", "");
      nav.classList.remove("portal-bottom-nav--more-open");
    }
  }

  function toggleMore() {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;
    var trigger = nav.querySelector(
      '.portal-bottom-nav__item[data-nav-group="more"]'
    );
    var panel = nav.querySelector(".portal-bottom-nav__more");
    if (!trigger || !panel) return;

    var expanded = trigger.getAttribute("aria-expanded") === "true";
    setMoreOpen(!expanded);
  }

  function ensureGlobalListeners() {
    if (globalListenersBound) return;
    globalListenersBound = true;

    document.addEventListener("click", function (e) {
      var nav = document.querySelector(".portal-bottom-nav");
      if (!nav) return;
      var trigger = nav.querySelector(
        '.portal-bottom-nav__item[data-nav-group="more"]'
      );
      var panel = nav.querySelector(".portal-bottom-nav__more");
      if (!trigger || !panel) return;

      if (trigger.getAttribute("aria-expanded") !== "true") return;

      if (!e.target || !e.target.closest) return;
      var insideNav = e.target.closest(".portal-bottom-nav");
      if (!insideNav) {
        setMoreOpen(false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setMoreOpen(false);
      }
    });
  }

  function initMoreMenu() {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    var trigger = nav.querySelector(
      '.portal-bottom-nav__item[data-nav-group="more"]'
    );
    var panel = nav.querySelector(".portal-bottom-nav__more");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      toggleMore();
    });

    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMore();
      }
    });

    ensureGlobalListeners();
  }

  function initBottomNavLogout() {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    var logoutLink = nav.querySelector(
      '.portal-bottom-nav__more [data-action="logout"]'
    );
    if (!logoutLink) return;

    logoutLink.addEventListener("click", function (e) {
      if (!window.IEAuth) return;
      e.preventDefault();

      (function doLogout() {
        var logoutPromise =
          typeof window.IEAuth.logout === "function"
            ? window.IEAuth.logout()
            : Promise.resolve();

        Promise.resolve(logoutPromise).then(function () {
          if (
            window.IEPortal &&
            typeof window.IEPortal.clearSessionState === "function"
          ) {
            window.IEPortal.clearSessionState();
          }
          if (typeof window !== "undefined") {
            window.__IE_AUTH_USER__ = null;
          }
          if (
            typeof window.IEAuth.redirectToLogin === "function"
          ) {
            window.IEAuth.redirectToLogin();
          }
        });
      })();
    });
  }

  function initBottomNavDom(explicitPageKey) {
    var nav = document.querySelector(".portal-bottom-nav");
    if (!nav) return;

    normalizeBottomNavLinks();
    applyBottomNavActiveState(explicitPageKey);
    initMoreMenu();
    initBottomNavLogout();
  }

  function bindHeaderLoadedListener() {
    if (headerLoadedListenerBound) return;
    headerLoadedListenerBound = true;

    document.addEventListener("ie:header-loaded", function () {
      initBottomNavDom();
    });
  }

  /**
   * Initialize bottom nav for current page.
   * @param {string} pageKey - Optional explicit page key from bootstrap.
   */
  function initBottomNav(pageKey) {
    if (pageKey) {
      lastPageKey = pageKey;
    }
    bindHeaderLoadedListener();
    initBottomNavDom(pageKey);
  }

  window.IEBottomNavRuntime = {
    initBottomNav: initBottomNav,
    applyBottomNavActiveState: applyBottomNavActiveState,
  };

  bindHeaderLoadedListener();
})();

