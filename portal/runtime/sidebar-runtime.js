// ============================================================================
// Italian Experience Recruitment Portal - Sidebar Runtime
// ----------------------------------------------------------------------------
// Sidebar loading, fallback markup, navigation highlighting, link normalization,
// and logout wiring. Extracted from app-shell.js.
// ============================================================================

(function () {
  "use strict";

  // Static fallback markup when layout/sidebar.html cannot be loaded.
  // Keep in sync with portal/layout/sidebar.html.
  var SIDEBAR_FALLBACK_HTML =
    '<aside id="sidebar" class="sidebar h-screen flex flex-col text-white fixed lg:static left-0 top-0 shadow-2xl">' +
    '<div class="p-8"><div class="flex items-center space-x-3 mb-10"><div class="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center text-white font-bold text-xl serif italic" aria-hidden="true">IE</div>' +
    '<div><h2 class="text-lg font-bold serif leading-tight">Italian</h2><p class="text-[10px] uppercase tracking-widest opacity-60">Experience Portal</p></div></div>' +
    '<nav class="space-y-2" aria-label="Portal navigation">' +
    '<a href="dashboard.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg"><span class="text-sm font-medium">Dashboard</span></a>' +
    '<a href="candidates.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg"><span class="text-sm font-medium">Candidates</span></a>' +
    '<a href="job-offers.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg"><span class="text-sm font-medium">Job offers</span></a>' +
    '<a href="clients.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg"><span class="text-sm font-medium">Clients</span></a>' +
    '<a href="archived.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg"><span class="text-sm font-medium">Archived</span></a>' +
    '</nav></div>' +
    '<div class="mt-auto p-8 border-t border-white/10 sidebar-footer">' +
    '<a href="profile.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg mb-2"><span class="text-sm font-medium">Profile</span></a>' +
    '<a href="index.html" class="flex items-center space-x-4 py-3 px-4 text-red-400 hover:text-red-300 transition"><span class="text-sm font-medium">Logout</span></a>' +
    '</div></aside>';

  function applySidebarHtml(container, html) {
    if (!container || !html) return;

    try {
      var tpl = document.createElement("template");
      tpl.innerHTML = String(html).trim();

      var fetchedAside =
        tpl.content.querySelector("#sidebar") || tpl.content.firstElementChild;

      if (fetchedAside) {
        if (fetchedAside.className) {
          container.className = fetchedAside.className;
        }
        Array.from(fetchedAside.attributes).forEach(function (attr) {
          if (attr.name === "id" || attr.name === "class") return;
          container.setAttribute(attr.name, attr.value);
        });

        container.innerHTML = fetchedAside.innerHTML;
      } else {
        container.innerHTML = html;
      }
    } catch (error) {
      console.error("[ItalianExperience] Failed to apply sidebar HTML", error);
    }
  }

  function highlightSidebar(currentKey) {
    var links = document.querySelectorAll(".sidebar .nav-link");
    if (!links.length) return;

    var sectionGroups = {
      dashboard: ["dashboard"],
      candidates: ["candidates", "candidate"],
      "job-offers": ["job offers", "job offer"],
      clients: ["clients"],
      archived: ["archived"],
      profile: ["impostazioni", "profilo", "settings"],
    };

    var targetSection = (function () {
      if (currentKey === "add-candidate") return "candidates";
      if (currentKey === "add-job-offer") return "job-offers";
      if (currentKey === "add-client") return "clients";
      return currentKey in sectionGroups ? currentKey : null;
    })();

    links.forEach(function (link) {
      link.classList.remove("active");

      if (!targetSection) return;

      var label = (link.textContent || "").trim().toLowerCase();
      var candidates = sectionGroups[targetSection] || [];
      var matches = candidates.some(function (needle) {
        return label.indexOf(needle) !== -1;
      });

      if (matches) {
        link.classList.add("active");
      }
    });
  }

  function normalizeSidebarLinks() {
    if (!window.IERouter || typeof window.IERouter.derivePortalBasePath !== "function") return;
    var base = window.IERouter.derivePortalBasePath();
    var routeMapByLabel = {
      dashboard: "dashboard.html",
      candidates: "candidates.html",
      "job-offers": "job-offers.html",
      clients: "clients.html",
      archived: "archived.html",
      impostazioni: "profile.html",
      profilo: "profile.html",
      settings: "profile.html",
    };

    var links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach(function (link) {
      var label = (link.textContent || "").trim().toLowerCase();

      var key = null;
      if (label.indexOf("dashboard") !== -1) key = "dashboard";
      else if (label.indexOf("candidates") !== -1 || label.indexOf("candidate") !== -1) key = "candidates";
      else if (label.indexOf("job offers") !== -1 || label.indexOf("job offer") !== -1) key = "job-offers";
      else if (label.indexOf("clients") !== -1) key = "clients";
      else if (label.indexOf("archived") !== -1) key = "archived";
      else if (label.indexOf("impostazioni") !== -1 || label.indexOf("profilo") !== -1 || label.indexOf("settings") !== -1) key = "impostazioni";

      if (!key) return;

      var target = routeMapByLabel[key];
      if (!target) return;

      var currentHref = link.getAttribute("href") || "";
      if (!currentHref || currentHref === "#") {
        link.setAttribute("href", base + target);
      }
    });
  }

  function initLogoutLink() {
    var links = document.querySelectorAll("#sidebar a, .sidebar a");
    var logoutEl = null;
    links.forEach(function (a) {
      var href = (a.getAttribute("href") || "").trim();
      var text = (a.textContent || "").toLowerCase();
      if ((href === "index.html" || href.indexOf("index.html") === href.length - 10) && text.indexOf("logout") !== -1) {
        logoutEl = a;
      }
    });
    if (!logoutEl) return;
    logoutEl.addEventListener("click", async function (e) {
      if (!window.IEAuth) return;
      e.preventDefault();
      await window.IEAuth.logout();
      if (window.IEPortal && typeof window.IEPortal.clearSessionState === "function") {
        window.IEPortal.clearSessionState();
      }
      if (typeof window !== "undefined") window.__IE_AUTH_USER__ = null;
      window.IEAuth.redirectToLogin();
    });
  }

  function ensureSidebarLoaded() {
    var container = document.getElementById("sidebar");
    if (!container) {
      return Promise.resolve();
    }

    if (container.children.length && container.querySelector(".sidebar")) {
      var currentKey = window.IERouterRuntime ? window.IERouterRuntime.getPageKey() : "dashboard";
      highlightSidebar(currentKey);
      normalizeSidebarLinks();
      initLogoutLink();
      return Promise.resolve();
    }

    if (!window.IERouter || typeof window.IERouter.derivePortalBasePath !== "function") {
      applySidebarHtml(container, SIDEBAR_FALLBACK_HTML);
      var currentKey = window.IERouterRuntime ? window.IERouterRuntime.getPageKey() : "dashboard";
      highlightSidebar(currentKey);
      normalizeSidebarLinks();
      initLogoutLink();
      return Promise.resolve();
    }

    var base = window.IERouter.derivePortalBasePath();
    var url = base + "layout/sidebar.html";

    return fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("Failed to load sidebar.html (" + res.status + ")");
        }
        return res.text();
      })
      .then(function (html) {
        applySidebarHtml(container, html);
        var currentKey = window.IERouterRuntime ? window.IERouterRuntime.getPageKey() : "dashboard";
        highlightSidebar(currentKey);
        normalizeSidebarLinks();
        initLogoutLink();
      })
      .catch(function (error) {
        if (typeof window.debugLog === "function") {
          window.debugLog("[ItalianExperience] Unable to load sidebar fragment", error);
        }
        applySidebarHtml(container, SIDEBAR_FALLBACK_HTML);
        var currentKey = window.IERouterRuntime ? window.IERouterRuntime.getPageKey() : "dashboard";
        highlightSidebar(currentKey);
        normalizeSidebarLinks();
        initLogoutLink();
      });
  }

  window.IESidebarRuntime = {
    ensureSidebarLoaded: ensureSidebarLoaded,
  };
})();
