// ============================================================================
// Italian Experience Recruitment Portal - Global App Logic
// ----------------------------------------------------------------------------
// Responsibilities:
// - Navigation between pages (sidebar + key CTA buttons)
// - Active menu highlighting based on current URL
// - Shared sidebar toggle behaviour (desktop + mobile)
// - Basic form interactions
// - Placeholder functions for future database/API integration
// ============================================================================

(function () {
  "use strict";

  var PROTECTED_PAGES = [
    "dashboard",
    "candidati",
    "offerte",
    "clients",
    "clienti",
    "archiviati",
    "profile",
    "add-candidato",
    "add-offerta",
    "add-cliente",
    "settings",
    "sidebar",
  ];

  var pageKey = getCurrentPageKey();
  var isProtectedPage = PROTECTED_PAGES.indexOf(pageKey) !== -1;
  if (isProtectedPage) {
    window.__IE_AUTH_GUARD__ = (async function () {
      if (!window.IESupabase || typeof window.IESupabase.enforceAuthGuard !== "function") {
        var base = "/ItalianExperience/portal/";
        window.location.replace(base + "index.html");
        return false;
      }

      var user = await window.IESupabase.enforceAuthGuard();
      if (!user) {
        return false;
      }

      window.__IE_AUTH_USER__ = user;

      if (document && document.body) {
        document.body.style.visibility = "visible";
      }

      return true;
    })();
  } else {
    window.__IE_AUTH_GUARD__ = Promise.resolve(true);
  }

  // ---------------------------------------------------------------------------
  // Static fallback markup for the sidebar (used when fetch() is unavailable,
  // e.g. Safari / local file://, or when sidebar.html cannot be loaded).
  //
  // IMPORTANT: keep this in sync with portal/sidebar.html.
  // ---------------------------------------------------------------------------

  var SIDEBAR_FALLBACK_HTML = [
    '<aside id="sidebar" class="sidebar h-screen flex flex-col text-white fixed lg:static left-0 top-0 shadow-2xl">',
    '  <div class="p-8">',
    '    <div class="flex items-center space-x-3 mb-10">',
    '      <div',
    '        class="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center text-white font-bold text-xl serif italic"',
    '        aria-hidden="true"',
    "      >",
    "        IE",
    "      </div>",
    "      <div>",
    '        <h2 class="text-lg font-bold serif leading-tight">Italian</h2>',
    '        <p class="text-[10px] uppercase tracking-widest opacity-60">Experience Portal</p>',
    "      </div>",
    "    </div>",
    "",
    '    <nav class="space-y-2" aria-label="Portal navigation">',
    '      <a href="dashboard.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg">',
    '        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '          stroke="currentColor" aria-hidden="true">',
    '          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />',
    "        </svg>",
    '        <span class="text-sm font-medium">Dashboard</span>',
    "      </a>",
    "",
    '      <a href="candidati.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg">',
    '        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '          stroke="currentColor" aria-hidden="true">',
    '          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
    "        </svg>",
    '        <span class="text-sm font-medium">Candidati</span>',
    "      </a>",
    "",
    '      <a href="offerte.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg">',
    '        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '          stroke="currentColor" aria-hidden="true">',
    '          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />',
    "        </svg>",
    '        <span class="text-sm font-medium">Offerte di Lavoro</span>',
    "      </a>",
    "",
    '      <a href="clienti.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg">',
    '        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '          stroke="currentColor" aria-hidden="true">',
    '          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />',
    "        </svg>",
    '        <span class="text-sm font-medium">Clienti</span>',
    "      </a>",
    "",
    '      <a href="archiviati.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg">',
    '        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '          stroke="currentColor" aria-hidden="true">',
    '          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />',
    "        </svg>",
    '        <span class="text-sm font-medium">Archiviati</span>',
    "      </a>",
    "    </nav>",
    "  </div>",
    "",
    '  <div class="mt-auto p-8 border-t border-white/10 sidebar-footer">',
    '    <a href="profile.html" class="nav-link flex items-center space-x-4 py-3 px-4 rounded-r-lg mb-2">',
    '      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '        stroke="currentColor" aria-hidden="true">',
    '        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />',
    '        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />',
    "      </svg>",
    '      <span class="text-sm font-medium">Impostazioni</span>',
    "    </a>",
    '    <a href="index.html"',
    '      class="flex items-center space-x-4 py-3 px-4 text-red-400 hover:text-red-300 transition">',
    '      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"',
    '        stroke="currentColor" aria-hidden="true">',
    '        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
    '          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />',
    "      </svg>",
    '      <span class="text-sm font-medium">Logout</span>',
    "    </a>",
    "  </div>",
    "",
    "</aside>",
    "",
  ].join("\n");

  document.addEventListener("DOMContentLoaded", async function () {
    var guard = window.__IE_AUTH_GUARD__;
    if (guard && typeof guard.then === "function") {
      var allowed = await guard;
      if (!allowed) {
        return;
      }
    }

    if (isProtectedPage) {
      await loadCurrentUserProfile();
      initInactivityTimer();
    }

    ensureSidebarLoaded()
      .then(function () {
        initLayout();
        initNavigation();
        initButtons();
        initForms();
        initDataViews();
        initLogoutLink();
        ensureHeaderAvatarLinksToProfile();
        updateHeaderUserBlock();
      })
      .catch(function (error) {
        console.error("[ItalianExperience] Sidebar loading failed", error);
        initButtons();
        initForms();
        initDataViews();
        initLogoutLink();
        ensureHeaderAvatarLinksToProfile();
        updateHeaderUserBlock();
      });
  });

  // ---------------------------------------------------------------------------
  // Layout & Sidebar
  // ---------------------------------------------------------------------------

  function ensureSidebarLoaded() {
    const container = document.getElementById("sidebar");
    if (!container) {
      return Promise.resolve();
    }

    // Se la sidebar è già presente (ad es. markup statico), non fare nulla
    if (container.children.length && container.querySelector(".sidebar")) {
      return Promise.resolve();
    }

    // In modalità file:// (es. apertura locale in Safari) evitiamo fetch,
    // che è spesso bloccato, e usiamo direttamente il fallback inline.
    if (window.location.protocol === "file:") {
      applySidebarHtml(container, SIDEBAR_FALLBACK_HTML);
      return Promise.resolve();
    }

    const base = derivePortalBasePath();
    const url = base + "sidebar.html";

    return fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("Failed to load sidebar.html (" + res.status + ")");
        }
        return res.text();
      })
      .then(function (html) {
        applySidebarHtml(container, html);
      })
      .catch(function (error) {
        console.error("[ItalianExperience] Unable to load sidebar fragment", error);
        // Fallback silenzioso: usiamo il markup inline così la UI resta funzionale.
        applySidebarHtml(container, SIDEBAR_FALLBACK_HTML);
      });
  }

  function applySidebarHtml(container, html) {
    if (!container || !html) return;

    try {
      const tpl = document.createElement("template");
      tpl.innerHTML = String(html).trim();

      const fetchedAside =
        tpl.content.querySelector("#sidebar") || tpl.content.firstElementChild;

      if (fetchedAside) {
        // Copia classi e attributi (tranne id) dal file sorgente
        if (fetchedAside.className) {
          container.className = fetchedAside.className;
        }
        Array.from(fetchedAside.attributes).forEach(function (attr) {
          if (attr.name === "id" || attr.name === "class") return;
          container.setAttribute(attr.name, attr.value);
        });

        container.innerHTML = fetchedAside.innerHTML;
      } else {
        // Fallback: inietta l'HTML così com'è
        container.innerHTML = html;
      }
    } catch (error) {
      console.error("[ItalianExperience] Failed to apply sidebar HTML", error);
    }
  }

  function initLayout() {
    const sidebar = document.getElementById("sidebar");
    const headerToggleButtons = document.querySelectorAll(
      '[data-toggle="sidebar"], .portal-header-toggle'
    );

    if (!sidebar) return;

    const overlay = ensureSidebarOverlay();

    // Wire toggle buttons if present
    headerToggleButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        toggleSidebar(sidebar);
      });
    });

    // Expose a global toggleSidebar so existing onclick="toggleSidebar()"
    // attributes in the HTML keep working even after removing inline scripts.
    window.toggleSidebar = function () {
      toggleSidebar(sidebar);
    };

    // Backdrop click closes (mobile)
    overlay.addEventListener("click", function () {
      closeSidebar(sidebar);
    });

    // Close sidebar when clicking outside (mobile only)
    document.addEventListener("click", function (event) {
      if (!isMobileViewport()) return;
      if (!isSidebarOpen(sidebar)) return;

      // Ignore clicks inside sidebar
      if (event.target.closest("#sidebar")) return;

      // Ignore clicks on the toggle button itself
      if (event.target.closest('[data-toggle="sidebar"], .portal-header-toggle')) return;

      closeSidebar(sidebar);
    });

    // ESC closes sidebar (mobile)
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!isMobileViewport()) return;
      if (!isSidebarOpen(sidebar)) return;
      closeSidebar(sidebar);
    });

    // If you rotate / resize to desktop, ensure body overlay state is cleared
    window.addEventListener(
      "resize",
      function () {
        if (!isMobileViewport()) {
          document.body.classList.remove("ie-sidebar-open");
          sidebar.classList.remove("open");
        }
      },
      { passive: true }
    );

    // Keep body state in sync even if legacy inline scripts
    // add/remove the `.open` class directly.
    syncBodyWithSidebar(sidebar);
    const mo = new MutationObserver(() => syncBodyWithSidebar(sidebar));
    mo.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
  }

  function toggleSidebar(sidebar) {
    if (isSidebarOpen(sidebar)) closeSidebar(sidebar);
    else openSidebar(sidebar);
  }

  function openSidebar(sidebar) {
    sidebar.classList.add("open");
    document.body.classList.add("ie-sidebar-open");
  }

  function closeSidebar(sidebar) {
    sidebar.classList.remove("open");
    document.body.classList.remove("ie-sidebar-open");
  }

  function isSidebarOpen(sidebar) {
    return sidebar.classList.contains("open") || document.body.classList.contains("ie-sidebar-open");
  }

  function syncBodyWithSidebar(sidebar) {
    if (sidebar.classList.contains("open")) document.body.classList.add("ie-sidebar-open");
    else document.body.classList.remove("ie-sidebar-open");
  }

  function isMobileViewport() {
    return window.innerWidth < 1024;
  }

  function ensureSidebarOverlay() {
    let el = document.querySelector(".ie-sidebar-overlay");
    if (el) return el;

    el = document.createElement("div");
    el.className = "ie-sidebar-overlay";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  // ---------------------------------------------------------------------------
  // Navigation & Active Menu Highlighting
  // ---------------------------------------------------------------------------

  function initNavigation() {
    const currentKey = getCurrentPageKey();
    highlightSidebar(currentKey);
    normalizeSidebarLinks();
  }

  // Determine which logical page we are on from the URL
  function getCurrentPageKey() {
    const path = window.location.pathname || "";
    const lastSegment = path.split("/").filter(Boolean).pop() || "";

    // Handle both GitHub Pages and local hosting where the folder may differ
    switch (lastSegment) {
      case "dashboard.html":
        return "dashboard";
      case "candidati.html":
        return "candidati";
      case "offerte.html":
        return "offerte";
      case "clients.html":
      case "clienti.html":
        return "clients";
      case "archiviati.html":
        return "archiviati";
      case "add-candidato.html":
        return "add-candidato";
      case "add-offerta.html":
        return "add-offerta";
      case "add-cliente.html":
        return "add-cliente";
      case "profile.html":
      case "profile.htm":
        return "profile";
      case "settings.html":
      case "settings.htm":
        return "settings";
      case "index.html":
      case "":
        return "login";
      default:
        // Fallback: try to infer from segment without extension
        if (lastSegment.includes("dashboard")) return "dashboard";
        if (lastSegment.includes("candidati")) return "candidati";
        if (lastSegment.includes("offerte")) return "offerte";
        if (lastSegment.includes("archiviati")) return "archiviati";
        if (lastSegment.includes("profile")) return "profile";
        if (lastSegment.includes("settings")) return "settings";
        return "unknown";
    }
  }

  // Highlight the correct sidebar entry regardless of how the HTML is written
  function highlightSidebar(currentKey) {
    const links = document.querySelectorAll(".sidebar .nav-link");
    if (!links.length) return;

    // Map logical keys to labels that appear in the sidebar text content
    const sectionGroups = {
      dashboard: ["dashboard"],
      candidati: ["candidati", "candidate", "candidates"],
      offerte: ["offerte di lavoro", "job offers", "job offer"],
      clients: ["clienti", "clients"],
      archiviati: ["archiviati", "candidati archiviati", "offerte archiviate"],
      profile: ["impostazioni", "profilo", "settings"],
    };

    const targetSection = (function () {
      if (currentKey === "add-candidato") return "candidati";
      if (currentKey === "add-offerta") return "offerte";
      if (currentKey === "add-cliente") return "clients";
      return currentKey in sectionGroups ? currentKey : null;
    })();

    links.forEach((link) => {
      link.classList.remove("active");

      if (!targetSection) return;

      const label = (link.textContent || "").trim().toLowerCase();
      const candidates = sectionGroups[targetSection] || [];
      const matches = candidates.some((needle) => label.includes(needle));

      if (matches) {
        link.classList.add("active");
      }
    });
  }

  // Ensure sidebar links always point to the right HTML files
  function normalizeSidebarLinks() {
    const base = derivePortalBasePath();
    const routeMapByLabel = {
      dashboard: "dashboard.html",
      candidati: "candidati.html",
      "offerte di lavoro": "offerte.html",
      clienti: "clienti.html",
      archiviati: "archiviati.html",
      impostazioni: "profile.html",
      profilo: "profile.html",
      settings: "profile.html",
    };

    const links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();

      let key = null;
      if (label.includes("dashboard")) key = "dashboard";
      else if (label.includes("candidati archiviati")) key = "candidati archiviati";
      else if (label.includes("candidati") || label.includes("candidate")) key = "candidati";
      else if (label.includes("offerte archiviate")) key = "offerte archiviate";
      else if (label.includes("offerte")) key = "offerte di lavoro";
      else if (label.includes("clienti") || label.includes("clients")) key = "clienti";
      else if (label.includes("archiviati")) key = "archiviati";
      else if (label.includes("impostazioni") || label.includes("profilo") || label.includes("settings")) key = "impostazioni";

      if (!key) return;

      const target = routeMapByLabel[key];
      if (!target) return;

      // Only override "#" or empty links
      const currentHref = link.getAttribute("href") || "";
      if (!currentHref || currentHref === "#") {
        link.setAttribute("href", base + target);
      }
    });
  }

  // Compute the base path where portal HTML files live
  function derivePortalBasePath() {
    try {
      // new URL('.', href) restituisce sempre la directory dell'HTML corrente,
      // includendo protocollo (http/https/file) e host se presenti.
      const url = new URL(".", window.location.href);
      return url.href;
    } catch (error) {
      const pathname = window.location.pathname || "";
      if (!pathname) return "";

      const segments = pathname.split("/").filter(Boolean);
      if (!segments.length) return "";

      // Strip the last segment (file name)
      segments.pop();
      return "/" + segments.join("/") + (segments.length ? "/" : "");
    }
  }

  // Basic helper for programmatic navigation
  function navigateTo(relativePath) {
    const base = derivePortalBasePath();
    window.location.href = base + relativePath;
  }

  /**
   * Normalize entity page state based on URL params.
   * - No id => create
   * - id + invalid mode => default to view
   * - id + valid mode (view/edit) => use it
   *
   * @param {URLSearchParams} params
   * @returns {{ id: string|null, mode: "create"|"view"|"edit" }}
   */
  function resolveEntityPageState(params) {
    const rawId = params.get("id");
    const id = rawId ? rawId.toString() : null;
    const rawMode = (params.get("mode") || "").toString().toLowerCase();

    if (!id) {
      return { id: null, mode: "create" };
    }

    if (rawMode === "view" || rawMode === "edit") {
      return { id, mode: rawMode };
    }

    return { id, mode: "view" };
  }

  // ---------------------------------------------------------------------------
  // Buttons & Small Interactions
  // ---------------------------------------------------------------------------

  function initButtons() {
    // Primary CTAs that should navigate to form pages
    const addCandidateBtn =
      document.querySelector('[data-action="add-candidate"]') ||
      findButtonByText("add new candidate");
    if (addCandidateBtn) {
      addCandidateBtn.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("add-candidato.html");
      });
    }

    const addOfferBtn =
      document.querySelector('[data-action="add-offer"]') ||
      findButtonByText("create new job offer");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("add-offerta.html?mode=create");
      });
    }

    const addClientBtn = document.querySelector('[data-action="add-client"]');
    if (addClientBtn) {
      addClientBtn.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("add-cliente.html");
      });
    }

    // "Vedi Tutti" button on dashboard -> candidates listing
    const viewAllCandidatesBtn =
      document.querySelector('[data-action="view-all-candidates"]') ||
      findButtonByText("vedi tutti");
    if (viewAllCandidatesBtn) {
      viewAllCandidatesBtn.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("candidati.html");
      });
    }

    // Associate Candidate button inside Job Offers
    const associateCandidateButtons = document.querySelectorAll(
      '[data-action="associate-candidate"]'
    );
    associateCandidateButtons.forEach((btn) => {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        openAssociateCandidateModal();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Inactivity logout (protected pages only)
  // ---------------------------------------------------------------------------
  var INACTIVITY_LOGOUT_MS = 30 * 60 * 1000;       // 30 minutes
  var INACTIVITY_WARNING_BEFORE_MS = 1 * 60 * 1000; // 1 minute before logout
  var INACTIVITY_THROTTLE_MS = 1000;               // Throttle mousemove/scroll

  function initInactivityTimer() {
    if (!window.IESupabase) return;

    var logoutTimer = null;
    var warningTimer = null;
    var warningBanner = null;
    var throttleUntil = 0;

    function clearTimers() {
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
      }
    }

    function hideWarning() {
      if (warningBanner && warningBanner.parentNode) {
        warningBanner.parentNode.removeChild(warningBanner);
        warningBanner = null;
      }
    }

    function showWarning() {
      hideWarning();
      var banner = document.createElement("div");
      banner.setAttribute("role", "alert");
      banner.className = "fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg";
      banner.innerHTML =
        '<span class="text-sm font-medium">Sarai disconnesso tra 1 minuto per inattività.</span>' +
        '<button type="button" class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition">Resta connesso</button>';
      var stayBtn = banner.querySelector("button");
      stayBtn.addEventListener("click", function () {
        hideWarning();
        resetTimers();
      });
      document.body.appendChild(banner);
      warningBanner = banner;
    }

    function scheduleTimers() {
      clearTimers();
      warningTimer = setTimeout(function () {
        warningTimer = null;
        showWarning();
      }, INACTIVITY_LOGOUT_MS - INACTIVITY_WARNING_BEFORE_MS);
      logoutTimer = setTimeout(function () {
        logoutTimer = null;
        performLogout();
      }, INACTIVITY_LOGOUT_MS);
    }

    function resetTimers() {
      hideWarning();
      scheduleTimers();
    }

    function performLogout() {
      clearTimers();
      hideWarning();
      window.IESupabase.logout().then(function () {
        window.IESupabase.redirectToLogin();
      }).catch(function () {
        window.IESupabase.redirectToLogin();
      });
    }

    function onActivityThrottled() {
      var now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + INACTIVITY_THROTTLE_MS;
      resetTimers();
    }

    function onActivityImmediate() {
      throttleUntil = 0;
      resetTimers();
    }

    document.addEventListener("mousemove", onActivityThrottled, { passive: true });
    document.addEventListener("scroll", onActivityThrottled, { passive: true });
    document.addEventListener("click", onActivityImmediate);
    document.addEventListener("keydown", onActivityImmediate);

    scheduleTimers();
  }

  function initLogoutLink() {
    const logoutLink = document.querySelector('.sidebar a[href="index.html"], .sidebar-footer a[href="index.html"], #sidebar a[href*="index.html"]');
    const links = document.querySelectorAll('#sidebar a, .sidebar a');
    let logoutEl = null;
    links.forEach(function (a) {
      const href = (a.getAttribute("href") || "").trim();
      const text = (a.textContent || "").toLowerCase();
      if ((href === "index.html" || href.endsWith("/index.html")) && text.includes("logout")) {
        logoutEl = a;
      }
    });
    if (!logoutEl) return;
    logoutEl.addEventListener("click", async function (e) {
      if (!window.IESupabase) return;
      e.preventDefault();
      await window.IESupabase.logout();
      window.IESupabase.redirectToLogin();
    });
  }

  // Ensure the entire header user block (username + avatar) links to profile.html (all portal pages)
  function ensureHeaderAvatarLinksToProfile() {
    const textBlock = document.querySelector("header .text-right");
    const avatarBlock = document.querySelector("header .w-10.h-10.rounded-full");
    if (!textBlock || !avatarBlock || !avatarBlock.querySelector("img")) return;

    const userBlock = textBlock.parentElement;
    if (!userBlock || userBlock.tagName !== "DIV") return;
    if (userBlock.parentElement && userBlock.parentElement.tagName === "A") return;

    // If the avatar was previously wrapped in a link, unwrap it so we have one link around the whole block
    const avatarParent = avatarBlock.parentElement;
    if (avatarParent && avatarParent.tagName === "A") {
      avatarParent.parentNode.insertBefore(avatarBlock, avatarParent);
      avatarParent.remove();
    }

    const base = derivePortalBasePath();
    const link = document.createElement("a");
    link.setAttribute("href", base + "profile.html");
    link.setAttribute("aria-label", "Vai al profilo");
    link.className = "flex items-center space-x-3 border-l pl-6 border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:ring-offset-2 rounded";
    userBlock.parentNode.insertBefore(link, userBlock);
    link.appendChild(userBlock);
  }

  function updateHeaderUserBlock() {
    if (!window.IESupabase) return;
    const displayName = getCurrentUserDisplayName();
    const roleLabel = getCurrentUserRole();
    const nameEl = document.querySelector("header .text-right p.text-sm");
    const roleEl = document.querySelector("header .text-right p:nth-of-type(2)");
    const avatarEl = document.querySelector("header .w-10.h-10.rounded-full img");
    if (nameEl) nameEl.textContent = displayName || "—";
    if (roleEl) roleEl.textContent = roleLabel;
    if (avatarEl && displayName) {
      avatarEl.setAttribute("src", "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName.replace(/\s+/g, "+")) + "&background=1b4332&color=fff");
      avatarEl.setAttribute("alt", displayName);
    }
  }

  function findButtonByText(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    const candidates = Array.from(
      document.querySelectorAll("button, a[role='button'], .btn")
    );
    return (
      candidates.find((el) =>
        (el.textContent || "").trim().toLowerCase().includes(normalized)
      ) || null
    );
  }

  // ---------------------------------------------------------------------------
  // Forms & Placeholders for Future Back-end
  // ---------------------------------------------------------------------------

  function initForms() {
    bindFormHandlers(document);
  }

  function bindFormHandlers(root) {
    const scope = root || document;

    const candidateForm = scope.querySelector("#candidateForm");
    if (candidateForm && !candidateForm.dataset.ieBound) {
      candidateForm.dataset.ieBound = "true";
      candidateForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(candidateForm);
        const candidateParams = new URLSearchParams(window.location.search);
        const candidateId = candidateParams.get("id");
        if (getCurrentPageKey() === "add-candidato" && candidateId && window.IESupabase && window.IESupabase.updateCandidate) {
          updateCandidateFromForm(candidateId, formData);
          return;
        }
        saveCandidate(formData);
      });
      const cancelBtn = candidateForm.querySelector("[data-edit-cancel]");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          navigateTo("candidati.html");
        });
      }
    }

    const jobOfferForm = scope.querySelector("#jobOfferForm");
    if (jobOfferForm && !jobOfferForm.dataset.ieBound) {
      jobOfferForm.dataset.ieBound = "true";
      hydrateJobOfferClientAutocomplete(jobOfferForm);
      jobOfferForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(jobOfferForm);

        const pageKey = getCurrentPageKey();
        if (pageKey === "add-offerta") {
          const params = getJobOfferPageParams();
          if (params.mode === "edit" && params.id) {
            updateJobOfferFromForm(params.id, formData);
            return;
          }
        }

        saveJobOffer(formData);
      });
    }

    const clientForm = scope.querySelector("#clientForm");
    if (clientForm && !clientForm.dataset.ieBound) {
      clientForm.dataset.ieBound = "true";
      clientForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(clientForm);
        const clientParams = new URLSearchParams(window.location.search);
        const clientId = clientParams.get("id");
        if (getCurrentPageKey() === "add-cliente" && clientId && window.IESupabase && window.IESupabase.updateClient) {
          updateClientFromForm(clientId, formData);
          return;
        }
        saveClient(formData);
      });
      const cancelBtn = clientForm.querySelector("[data-edit-cancel]");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          navigateTo("clienti.html");
        });
      }
    }
  }

  function hydrateJobOfferClientAutocomplete(form) {
    if (!form) return;
    const clientInput = form.querySelector("#clientInput");
    const clientIdHidden = form.querySelector("#clientIdHidden");
    const clientSuggestions = form.querySelector("#clientSuggestions");
    if (!clientInput || !clientIdHidden || !clientSuggestions) return;
    if (clientInput.dataset.ieAutocompleteBound === "true") return;
    clientInput.dataset.ieAutocompleteBound = "true";

    let debounceTimer = null;
    let latestQueryToken = 0;

    function clearSuggestions() {
      clientSuggestions.innerHTML = "";
      clientSuggestions.classList.add("hidden");
    }

    function openSuggestions() {
      if (!clientSuggestions.children.length) return;
      clientSuggestions.classList.remove("hidden");
    }

    function renderSuggestions(clients, typedValue) {
      clientSuggestions.innerHTML = "";

      (clients || []).forEach(function (client) {
        if (!client || !client.id) return;
        const item = document.createElement("button");
        item.type = "button";
        item.className = "w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f6f2e7] transition-colors";
        item.textContent = client.name || "—";
        item.addEventListener("mousedown", function (event) {
          event.preventDefault();
          clientInput.value = client.name || "";
          clientIdHidden.value = client.id;
          clearSuggestions();
        });
        clientSuggestions.appendChild(item);
      });

      const normalizedTypedValue = (typedValue || "").trim().toLowerCase();
      const hasExactMatch = (clients || []).some(function (client) {
        return ((client && client.name) || "").trim().toLowerCase() === normalizedTypedValue;
      });

      if (!hasExactMatch) {
        clientIdHidden.value = "";
      }

      openSuggestions();
    }

    async function searchClients(term, queryToken) {
      if (!term) {
        clearSuggestions();
        clientIdHidden.value = "";
        return;
      }

      if (window.IESupabase && window.IESupabase.searchClientsByName) {
        const { data, error } = await window.IESupabase.searchClientsByName({
          term,
          limit: 5,
        });

        if (queryToken !== latestQueryToken) return;
        if (error) {
          clearSuggestions();
          return;
        }
        renderSuggestions(data || [], term);
        return;
      }

      const normalizedTerm = term.toLowerCase();
      const localMatches = IE_STORE.clients
        .filter(function (client) {
          if (!client || client.is_archived) return false;
          return (client.name || "").toLowerCase().indexOf(normalizedTerm) !== -1;
        })
        .slice(0, 5)
        .map(function (client) {
          return { id: client.id, name: client.name };
        });
      if (queryToken !== latestQueryToken) return;
      renderSuggestions(localMatches, term);
    }

    clientInput.addEventListener("input", function () {
      const value = clientInput.value.trim();
      clientIdHidden.value = "";
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        latestQueryToken += 1;
        searchClients(value, latestQueryToken).catch(function () {
          clearSuggestions();
        });
      }, 300);
    });

    clientInput.addEventListener("focus", function () {
      openSuggestions();
    });

    clientInput.addEventListener("blur", function () {
      window.setTimeout(function () {
        clearSuggestions();
      }, 120);
    });
  }

  // ---------------------------------------------------------------------------
  // Modal (forms loaded from existing pages)
  // ---------------------------------------------------------------------------

  function ensureModal() {
    let overlay = document.querySelector(".ie-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "ie-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="ie-modal" role="document">
        <div class="ie-modal-header">
          <div class="ie-modal-title" data-ie-modal-title></div>
          <div class="ie-modal-actions">
            <a class="ie-modal-icon-btn" data-ie-modal-fullpage aria-label="Open full page" title="Open full page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 3h7v7"></path>
                <path d="M10 14L21 3"></path>
                <path d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path>
              </svg>
            </a>
            <button class="ie-modal-icon-btn" type="button" data-ie-modal-close aria-label="Close" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18"></path>
                <path d="M6 6 18 18"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="ie-modal-body" data-ie-modal-body></div>
      </div>
    `;

    // Click outside closes
    overlay.addEventListener("click", function (event) {
      if (!event.target.closest(".ie-modal")) closeModal();
    });

    // Close button
    overlay.addEventListener("click", function (event) {
      if (event.target.closest("[data-ie-modal-close]")) closeModal();
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function openModal(config) {
    const overlay = ensureModal();
    const titleEl = overlay.querySelector("[data-ie-modal-title]");
    const bodyEl = overlay.querySelector("[data-ie-modal-body]");
    const fullPageEl = overlay.querySelector("[data-ie-modal-fullpage]");

    titleEl.textContent = config.title || "";
    bodyEl.innerHTML = "";

    if (config.fullPageHref) {
      fullPageEl.setAttribute("href", config.fullPageHref);
      fullPageEl.setAttribute("target", "_self");
      fullPageEl.style.display = "inline-flex";
    } else {
      fullPageEl.removeAttribute("href");
      fullPageEl.style.display = "none";
    }

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    if (typeof config.render === "function") {
      config.render(bodyEl);
    }

    // ESC closes
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    overlay._ieOnKeyDown = onKeyDown;
    document.addEventListener("keydown", onKeyDown);

    // Prevent background scroll on mobile
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const overlay = document.querySelector(".ie-modal-overlay");
    if (!overlay) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    if (overlay._ieOnKeyDown) {
      document.removeEventListener("keydown", overlay._ieOnKeyDown);
      overlay._ieOnKeyDown = null;
    }

    document.body.style.overflow = "";
  }

  function openCandidateModal() {
    const base = derivePortalBasePath();
    const fullPage = base + "add-candidato.html";
    const url = fullPage;

    openModal({
      title: "Add New Candidate",
      fullPageHref: fullPage,
      render: async (mount) => {
        mount.innerHTML = renderModalLoading();
        const fragment = await loadFormFragment(url, "#candidateForm");
        mount.innerHTML = "";
        mount.appendChild(fragment);
        bindFormHandlers(mount);
      },
    });
  }

  function openOfferModal() {
    const base = derivePortalBasePath();
    const fullPage = base + "add-offerta.html";
    const url = fullPage;

    openModal({
      title: "Create New Job Offer",
      fullPageHref: fullPage,
      render: async (mount) => {
        mount.innerHTML = renderModalLoading();
        const fragment = await loadFormFragment(url, "#jobOfferForm");
        mount.innerHTML = "";
        mount.appendChild(fragment);
        bindFormHandlers(mount);
      },
    });
  }

  function openAssociateCandidateModal() {
    openModal({
      title: "Associate Candidate",
      fullPageHref: null,
      render: async (mount) => {
        const candidateOptions =
          window.IESupabase
            ? (await window.IESupabase.fetchMyCandidates()).data || []
            : IE_STORE.candidates;
        const candidateSelectOptions =
          window.IESupabase
            ? candidateOptions
                .map(function (c) {
                  return "<option value=\"" + (c.id || "") + "\">" + (c.first_name || "") + " " + (c.last_name || "") + " – " + (c.position || "") + "</option>";
                })
                .join("")
            : candidateOptions
                .map(function (c) {
                  return "<option value=\"" + (c.slug || c.id) + "\">" + (c.first_name || "") + " " + (c.last_name || "") + " – " + (c.position || "") + "</option>";
                })
                .join("");
        mount.innerHTML = `
          <div class="space-y-6">
            <div class="glass-card rounded-2xl p-6">
              <h3 class="serif text-lg font-bold text-[#1b4332] mb-4">New Candidate Association</h3>
              <form id="associateCandidateForm" class="space-y-5">
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Select Candidate</label>
                  <select name="candidate" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-[#c5a059] outline-none appearance-none cursor-pointer">
                    <option value="">Choose a candidate...</option>
                    ${candidateSelectOptions}
                  </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Status</label>
                    <select name="status" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-[#c5a059] outline-none appearance-none cursor-pointer">
                      <option value="new">New</option>
                      <option value="interview">Interview</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Position (optional)</label>
                    <input
                      type="text"
                      name="position"
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-[#c5a059] outline-none"
                      placeholder="Es. Head Sommelier"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-[#c5a059] outline-none resize-none"
                    placeholder="Inserisci eventuali note sull'associazione..."
                  ></textarea>
                </div>

                <div class="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    class="px-5 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 transition"
                    data-ie-modal-close
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-6 py-2 rounded-lg bg-[#1b4332] text-white text-xs font-semibold uppercase tracking-widest shadow-md hover:bg-[#1b4332]/90 transition"
                  >
                    Save Association
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;

        const form = mount.querySelector("#associateCandidateForm");
        if (!form) return;

        form.addEventListener("submit", async function (event) {
          event.preventDefault();
          const formData = new FormData(form);
          if (window.IESupabase) {
            const candidateId = (formData.get("candidate") || "").toString().trim();
            const jobOfferId = window.IE_ACTIVE_JOB_OFFER_ID || (await window.IESupabase.fetchJobOffers()).data?.[0]?.id;
            if (!candidateId || !jobOfferId) {
              window.IESupabase.showError("Seleziona un candidato e assicurati che ci sia un'offerta attiva.");
              return;
            }
            const { error } = await window.IESupabase.linkCandidateToJob({
              candidate_id: candidateId,
              job_offer_id: jobOfferId,
              status: (formData.get("status") || "new").toString(),
              notes: (formData.get("notes") || "").toString(),
            });
            if (error) {
              window.IESupabase.showError(error.message || "Errore nel salvataggio dell'associazione.");
              return;
            }
            window.IESupabase.showSuccess("Associazione salvata con successo.");
            closeModal();
            renderAssociationsForActiveOffer();
            return;
          }
          saveCandidateAssociation(formData);
          closeModal();
        });
      },
    });
  }

  function openCandidateDetailModalFromRow(rowElement) {
    if (!rowElement) return;

    const photoEl = rowElement.querySelector("td:nth-child(1) img");
    const nameCell = rowElement.querySelector("td:nth-child(2)");
    const positionCell = rowElement.querySelector("td:nth-child(3)");
    const clientCell = rowElement.querySelector("td:nth-child(4)");
    const addressCell = rowElement.querySelector("td:nth-child(5)");
    const statusBadge = rowElement.querySelector("td:nth-child(6) .badge");
    const sourceCell = rowElement.querySelector("td:nth-child(7)");
    const dateCell = rowElement.querySelector("td:nth-child(8)");

    const fullName = nameCell ? nameCell.textContent.trim() : "Candidate details";
    const position = positionCell ? positionCell.textContent.trim() : "";
    const clientName = clientCell ? clientCell.textContent.trim() : "—";
    const address = addressCell ? addressCell.textContent.trim() : "—";
    const source = sourceCell ? sourceCell.textContent.trim() : "—";
    const dateAdded = dateCell ? dateCell.textContent.trim() : "—";
    const statusHtml = statusBadge ? statusBadge.outerHTML : "";
    const statusLabel = statusBadge ? statusBadge.textContent.trim() : "";
    const photoUrl = photoEl ? photoEl.getAttribute("src") : "";

    openModal({
      title: fullName,
      fullPageHref: null,
      render: (mount) => {
        mount.innerHTML = `
          <div class="space-y-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                  ${
                    photoUrl
                      ? '<img src="' +
                        photoUrl +
                        '" alt="' +
                        fullName +
                        '" class="w-full h-full object-cover" />'
                      : ""
                  }
                </div>
                <div>
                  <h3 class="serif text-xl font-bold text-[#1b4332] leading-tight">${fullName}</h3>
                  ${
                    position
                      ? '<p class="text-sm text-gray-600 mt-1">' + position + "</p>"
                      : ""
                  }
                </div>
              </div>
              <div class="flex flex-col items-start md:items-end gap-2 text-xs">
                ${
                  statusHtml
                    ? '<div class="flex items-center gap-2">' +
                      '<span class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Status</span>' +
                      statusHtml +
                      "</div>"
                    : ""
                }
                <div class="px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c5a059]">
                  Candidate Profile
                </div>
              </div>
            </div>

            <div class="glass-card rounded-2xl p-6">
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div class="space-y-1">
                  <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Client</dt>
                  <dd class="font-medium text-gray-800">${clientName}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Location</dt>
                  <dd class="text-gray-700 italic">${address}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Source</dt>
                  <dd class="text-gray-700">${source}</dd>
                </div>
                <div class="space-y-1">
                  <dt class="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Date added</dt>
                  <dd class="text-gray-700">${dateAdded}</dd>
                </div>
              </dl>

              ${
                statusLabel
                  ? '<div class="mt-6 text-xs text-gray-500 border-t border-gray-100 pt-4">' +
                    "This candidate is currently in <span class='font-semibold text-[#1b4332]'>" +
                    statusLabel +
                    "</span> status in your pipeline." +
                    "</div>"
                  : ""
              }
            </div>
          </div>
        `;
      },
    });
  }

  function renderModalLoading() {
    return `
      <div class="glass-card rounded-2xl p-6" style="border-radius: 1.25rem;">
        <div class="text-sm" style="color: rgba(17, 24, 39, 0.7); font-weight: 600;">
          Loading…
        </div>
        <div class="mt-3" style="height: 10px; border-radius: 999px; background: rgba(197, 160, 89, 0.12); overflow: hidden;">
          <div style="width: 45%; height: 100%; background: rgba(197, 160, 89, 0.45); border-radius: 999px;"></div>
        </div>
      </div>
    `;
  }

  async function loadFormFragment(url, formSelector) {
    // In modalità file:// evitiamo fetch (bloccato in Safari e in molti browser)
    // e mostriamo un messaggio elegante che invita ad aprire la pagina completa.
    if (window.location.protocol === "file:") {
      const box = document.createElement("div");
      box.className = "glass-card rounded-2xl p-6";
      box.innerHTML =
        '<div class="text-sm font-semibold text-gray-700 mb-1">Form non disponibile in modalità file locale.</div>' +
        '<p class="text-xs text-gray-500">Apri la pagina completa tramite la sidebar o il pulsante principale per utilizzare questo form.</p>';
      return box;
    }

    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        const box = document.createElement("div");
        box.className = "glass-card rounded-2xl p-6";
        box.innerHTML =
          '<div class="text-sm font-semibold text-gray-700">Unable to load form.</div>';
        return box;
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const form = doc.querySelector(formSelector);
      if (!form) {
        const box = document.createElement("div");
        box.className = "glass-card rounded-2xl p-6";
        box.innerHTML =
          '<div class="text-sm font-semibold text-gray-700">Form not found in source page.</div>';
        return box;
      }

      // Try to capture the small intro block above the form (title + subtitle)
      const intro =
        form.previousElementSibling && form.previousElementSibling.matches(".mb-6")
          ? form.previousElementSibling
          : null;

      const wrapper = document.createElement("div");
      wrapper.className = "space-y-6";

      if (intro) wrapper.appendChild(intro.cloneNode(true));
      wrapper.appendChild(form.cloneNode(true));

      return wrapper;
    } catch (error) {
      console.error("[ItalianExperience] Unable to load form fragment", error);
      const box = document.createElement("div");
      box.className = "glass-card rounded-2xl p-6";
      box.innerHTML =
        '<div class="text-sm font-semibold text-gray-700 mb-1">Unable to load form.</div>' +
        '<p class="text-xs text-gray-500">Se stai eseguendo il portale da file locali, apri la pagina completa dal menu per compilare il form.</p>';
      return box;
    }
  }

  // ---------------------------------------------------------------------------
  // In-memory data store (placeholder for future Supabase / API)
  // ---------------------------------------------------------------------------

  /**
   * Shape aligned with Supabase tables (English column names).
   *
   * Candidate: id, first_name, last_name, position, address, status, source, notes, cv_url, foto_url, created_at, is_archived, ...
   * Job Offer: id, title, position, client_id, description, requirements, notes, salary,
   *            contract_type, positions, city, state, deadline, status, created_at, is_archived, ...
   * Client: id, name, city, state, country, email, phone, notes, created_at, is_archived, ...
   * Candidate ⇄ Job Offer association: candidate_id, job_offer_id, status, notes, ...
   */

  const IE_STORE = createInitialInMemoryStore();

  function createInitialInMemoryStore() {
    const now = new Date().toISOString();
    const admin = "Matteo Di Noia";

    const clients = [
      {
        id: "client-grand-hotel-milano",
        name: "Grand Hotel Milano",
        address: "Via Montenapoleone 1",
        city: "Milano",
        state: "MI",
        country: "IT",
        email: "hr@grandhotelmilano.it",
        phone: "+39 02 1234 5678",
        notes: "Hotel 5* lusso nel centro di Milano.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-ristorante-cracco",
        name: "Ristorante Cracco",
        address: "Galleria Vittorio Emanuele II",
        city: "Milano",
        state: "MI",
        country: "IT",
        email: "hr@cracco.it",
        phone: "+39 02 8765 4321",
        notes: "Fine dining iconico a Milano.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-hotel-cipriani",
        name: "Hotel Cipriani",
        address: "Giudecca 10",
        city: "Venezia",
        state: "VE",
        country: "IT",
        email: "talent@hotelcipriani.it",
        phone: "+39 041 234 5678",
        notes: "Hotel di riferimento nella laguna.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-pasticceria-marchesi",
        name: "Pasticceria Marchesi",
        address: "Via Santa Maria alla Porta 11/a",
        city: "Roma",
        state: "RM",
        country: "IT",
        email: "hr@marchesi.it",
        phone: "+39 06 9876 5432",
        notes: "Pasticceria storica.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-italian-luxury-villas",
        name: "Italian Luxury Villas",
        address: "Via dei Colli 15",
        city: "Firenze",
        state: "FI",
        country: "IT",
        email: "careers@italianluxuryvillas.it",
        phone: "+39 055 555 1234",
        notes: "Gestione ville di lusso.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
    ];

    const candidates = [
      {
        id: "cand-alessandro-rossi",
        slug: "alessandro-rossi",
        first_name: "Alessandro",
        last_name: "Rossi",
        position: "Sommelier Senior",
        address: "Milano, IT",
        status: "new",
        notes: "",
        source: "linkedin",
        cv_url: "https://example.com/cv/alessandro-rossi.pdf",
        foto_url:
          "https://ui-avatars.com/api/?name=Alessandro+Rossi&background=dbeafe&color=1e40af",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "cand-giulia-bianchi",
        slug: "giulia-bianchi",
        first_name: "Giulia",
        last_name: "Bianchi",
        position: "Chef de Rang",
        address: "Torino, IT",
        status: "hired",
        notes: "",
        source: "website",
        cv_url: "https://example.com/cv/giulia-bianchi.pdf",
        foto_url:
          "https://ui-avatars.com/api/?name=Giulia+Bianchi&background=d1fae5&color=065f46",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "cand-luca-moretti",
        slug: "luca-moretti",
        first_name: "Luca",
        last_name: "Moretti",
        position: "Maître d'Hôtel",
        address: "Venezia, IT",
        status: "interview",
        notes: "",
        source: "email",
        cv_url: "https://example.com/cv/luca-moretti.pdf",
        foto_url:
          "https://ui-avatars.com/api/?name=Luca+Moretti&background=fef3c7&color=92400e",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "cand-elena-martini",
        slug: "elena-martini",
        first_name: "Elena",
        last_name: "Martini",
        position: "Pastry Chef",
        address: "Roma, IT",
        status: "rejected",
        notes: "",
        source: "facebook",
        cv_url: "https://example.com/cv/elena-martini.pdf",
        foto_url:
          "https://ui-avatars.com/api/?name=Elena+Martini&background=fee2e2&color=991b1b",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "cand-marco-villa",
        slug: "marco-villa",
        first_name: "Marco",
        last_name: "Villa",
        position: "Property Manager",
        address: "Firenze, IT",
        status: "new",
        notes: "",
        source: "other",
        cv_url: "https://example.com/cv/marco-villa.pdf",
        foto_url:
          "https://ui-avatars.com/api/?name=Marco+Villa&background=dbeafe&color=1e40af",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
    ];

    const jobOffers = [
      {
        id: "offer-head-sommelier",
        title: "Head Sommelier",
        position: "Head Sommelier",
        client_id: "client-grand-hotel-milano",
        description: "Responsabile della carta vini e del team di sommellerie.",
        salary: "€55.000 - €65.000",
        contract_type: "Full-time",
        positions: 1,
        city: "Milano",
        state: "MI",
        deadline: now.slice(0, 10),
        status: "open",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-executive-chef",
        title: "Executive Chef",
        position: "Executive Chef",
        client_id: "client-ristorante-cracco",
        description: "Guida creativa della cucina e del team.",
        salary: "€70.000 - €85.000",
        contract_type: "Full-time",
        positions: 1,
        city: "Milano",
        state: "MI",
        deadline: now.slice(0, 10),
        status: "inprogress",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-property-manager",
        title: "Property Manager",
        position: "Property Manager",
        client_id: "client-italian-luxury-villas",
        description: "Gestione portafoglio ville di pregio.",
        salary: "€45.000 - €55.000",
        contract_type: "Full-time",
        positions: 1,
        city: "Firenze",
        state: "FI",
        deadline: now.slice(0, 10),
        status: "open",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-maitre",
        title: "Maître d'Hôtel",
        position: "Maître d'Hôtel",
        client_id: "client-hotel-cipriani",
        description: "Coordinamento sala e accoglienza ospiti.",
        salary: "€50.000 - €60.000",
        contract_type: "Full-time",
        positions: 1,
        city: "Venezia",
        state: "VE",
        deadline: now.slice(0, 10),
        status: "closed",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-pastry-chef",
        title: "Pastry Chef",
        position: "Pastry Chef",
        client_id: "client-pasticceria-marchesi",
        description: "Responsabile laboratorio pasticceria.",
        salary: "€40.000 - €50.000",
        contract_type: "Full-time",
        positions: 1,
        city: "Roma",
        state: "RM",
        deadline: now.slice(0, 10),
        status: "inprogress",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
    ];

    const candidateJobAssociations = [
      {
        id: "assoc-alessandro-head-sommelier",
        candidate_id: "cand-alessandro-rossi",
        job_offer_id: "offer-head-sommelier",
        status: "interview",
        notes: "Prima call conoscitiva completata, in attesa di feedback cliente.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
      },
      {
        id: "assoc-giulia-head-sommelier",
        candidate_id: "cand-giulia-bianchi",
        job_offer_id: "offer-head-sommelier",
        status: "hired",
        notes: "Confermata per inserimento presso Grand Hotel Milano.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
      },
      {
        id: "assoc-luca-head-sommelier",
        candidate_id: "cand-luca-moretti",
        job_offer_id: "offer-head-sommelier",
        status: "new",
        notes: "Profilo ricevuto, in fase di valutazione iniziale.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
      },
    ];

    return {
      clients,
      candidates,
      jobOffers,
      candidateJobAssociations,
    };
  }

  let IE_CURRENT_PROFILE = null;
  let IE_CURRENT_USER_EMAIL = null;

  async function loadCurrentUserProfile() {
    if (!window.IESupabase) return;
    try {
      const { data: sessionResult } = await window.IESupabase.getSession();
      const user = sessionResult?.user || null;
      IE_CURRENT_USER_EMAIL = user?.email || null;

      const { data, error } = await window.IESupabase.getProfile();
      if (error) {
        console.error("[Profile] Failed to load profile in header:", error);
        IE_CURRENT_PROFILE = null;
        return;
      }
      IE_CURRENT_PROFILE = data || null;
      console.log("[Profile] Loaded profile:", IE_CURRENT_PROFILE);
    } catch (e) {
      console.error("[Profile] loadCurrentUserProfile exception:", e);
      IE_CURRENT_PROFILE = null;
    }
  }

  function getCurrentUserDisplayName() {
    if (IE_CURRENT_PROFILE) {
      const first = (IE_CURRENT_PROFILE.first_name || "").trim();
      const last = (IE_CURRENT_PROFILE.last_name || "").trim();
      if (first || last) return (first + " " + last).trim();
      if (IE_CURRENT_PROFILE.full_name) return IE_CURRENT_PROFILE.full_name;
      if (IE_CURRENT_PROFILE.email) return IE_CURRENT_PROFILE.email;
    }
    if (IE_CURRENT_USER_EMAIL) return IE_CURRENT_USER_EMAIL;
    return "User";
  }

  function getCurrentUserRole() {
    return (IE_CURRENT_PROFILE && IE_CURRENT_PROFILE.role) ? String(IE_CURRENT_PROFILE.role) : "—";
  }

  function markUpdated(record) {
    record.updated_at = new Date().toISOString();
    record.updated_by = getCurrentUserDisplayName();
  }

  function formatLastUpdatedMeta(record) {
    if (!record || !record.updated_at || !record.updated_by) return "";
    try {
      const date = new Date(record.updated_at);
      return `Last updated by ${record.updated_by} on ${date.toLocaleString("it-IT")}`;
    } catch {
      return `Last updated by ${record.updated_by}`;
    }
  }

  // Expose a readonly snapshot helper for future integrations if needed
  window.ItalianExperienceStore = {
    getSnapshot() {
      return {
        clients: IE_STORE.clients.slice(),
        candidates: IE_STORE.candidates.slice(),
        jobOffers: IE_STORE.jobOffers.slice(),
        candidateJobAssociations: IE_STORE.candidateJobAssociations.slice(),
      };
    },
  };

  // --- Placeholder database / API layer ------------------------------------

  /**
   * Placeholder for a future database or API connection.
   * Customize this to point to your REST API, GraphQL endpoint, or back-end.
   */
  function connectToDatabase() {
    console.info(
      "[ItalianExperience] connectToDatabase() called – configure your API client here."
    );
    // Example (pseudo-code):
    // return createApiClient({ baseUrl: 'https://api.italianexperience.it' });
    return null;
  }

  async function fetchCandidates(filters) {
    if (window.IESupabase) {
      const { data: rows, error } = await window.IESupabase.fetchMyCandidates();
      if (error) {
        console.error("[ItalianExperience] fetchCandidates Supabase error:", error);
        return [];
      }
      const mapped = (rows || []).map(function (r) {
        return {
          id: r.id,
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          position: r.position || "",
          address: r.address || "",
          status: r.status || "new",
          notes: r.notes || "",
          source: r.source || "",
          client_name: r.client_name || null,
          foto_url: r.photo_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent((r.first_name || "") + "+" + (r.last_name || "")) + "&background=dbeafe&color=1e40af",
          created_at: r.created_at,
          is_archived: r.is_archived || false,
        };
      });
      return applyCandidateFilters(mapped, filters || {});
    }
    const base = IE_STORE.candidates.filter((c) => !c._deleted);
    return Promise.resolve(applyCandidateFilters(base, filters || {}));
  }

  async function fetchJobOffers(filters) {
    if (window.IESupabase) {
      const { data: rows, error } = await window.IESupabase.fetchJobOffers();
      if (error) {
        console.error("[ItalianExperience] fetchJobOffers Supabase error:", error);
        return [];
      }
      const mapped = (rows || []).map(function (r) {
        return {
          id: r.id,
          title: r.title || "",
          position: r.position || "",
          client_id: r.client_id || null,
          description: r.description || "",
          requirements: r.requirements || "",
          notes: r.notes || "",
          salary: r.salary || "",
          contract_type: r.contract_type || "",
          positions: r.positions ?? null,
          city: r.city || "",
          state: r.state || "",
          deadline: r.deadline || null,
          status: r.status || "open",
          created_at: r.created_at,
          is_archived: r.is_archived || false,
        };
      });
      return applyJobOfferFilters(mapped, filters || {});
    }
    const base = IE_STORE.jobOffers.filter((o) => !o._deleted);
    return Promise.resolve(applyJobOfferFilters(base, filters || {}));
  }

  function fetchClients(filters) {
    console.info("[ItalianExperience] fetchClients() – filters:", filters || {});
    const base = IE_STORE.clients.filter((c) => !c._deleted);
    return Promise.resolve(applyClientFilters(base, filters || {}));
  }

  async function saveCandidate(formData) {
    const first_name = (formData.get("first_name") || "").toString().trim();
    const last_name = (formData.get("last_name") || "").toString().trim();
    const position = (formData.get("position") || "").toString().trim();
    const address = (formData.get("address") || "").toString().trim();
    const status = (formData.get("status") || "new").toString();
    const notes = (formData.get("notes") || "").toString();
    const source = (formData.get("source") || "").toString();
    // client_name: kept in form for display only; candidates table has no client_name (relationship via job_offers -> clients)

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertCandidate({
        first_name: first_name,
        last_name: last_name,
        position: position,
        address: address,
        status: status,
        notes: notes,
        source: source,
      });
      if (error) {
        window.IESupabase.showError(error.message || "Errore nel salvataggio del candidato.", "saveCandidate");
        return;
      }
      window.IESupabase.showSuccess("Candidato salvato con successo.");
      navigateTo("candidati.html");
      return;
    }

    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();
    const candidate = {
      id: "cand-" + Math.random().toString(36).slice(2, 10),
      slug: null,
      first_name: first_name,
      last_name: last_name,
      position: position,
      address: address,
      status: status,
      notes: notes,
      source: source,
      cv_url: null,
      foto_url: null,
      created_at: now,
      updated_at: now,
      created_by: currentUser,
      updated_by: currentUser,
      is_archived: false,
    };

    const cvFile = formData.get("cv_file");
    if (cvFile && typeof cvFile === "object" && cvFile.name) {
      candidate.cv_url = "/uploads/cv/" + encodeURIComponent(cvFile.name);
    }
    const photoFile = formData.get("foto_file");
    if (photoFile && typeof photoFile === "object" && photoFile.name) {
      candidate.foto_url = "/uploads/foto/" + encodeURIComponent(photoFile.name);
    }
    candidate.slug =
      (candidate.first_name + "-" + candidate.last_name)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || candidate.id;

    IE_STORE.candidates.push(candidate);
    console.info("[ItalianExperience] saveCandidate() – in-memory:", candidate);
    alert("Candidato salvato con successo (simulazione)");
  }

  async function saveJobOffer(formData) {
    const title = (formData.get("title") || "").toString().trim();
    const position = (formData.get("position") || "").toString().trim();
    const clientName = (formData.get("client_name") || "").toString().trim();
    let client_id = (formData.get("client_id") || "").toString().trim();
    const description = (formData.get("description") || "").toString();
    const requirements = (formData.get("requirements") || "").toString();
    const notes = (formData.get("notes") || "").toString();
    const salary = (formData.get("salary") || "").toString().trim();
    const contract_type = (formData.get("contract_type") || "").toString().trim();
    const positionsRaw = (formData.get("positions") || "").toString().trim();
    const city = (formData.get("city") || "").toString().trim();
    const state = (formData.get("state") || "").toString().trim();
    const deadline = (formData.get("deadline") || "").toString().trim();
    const status = (formData.get("status") || "open").toString();
    const positions = positionsRaw === "" ? null : Number(positionsRaw);

    if (!client_id && clientName) {
      if (window.IESupabase && window.IESupabase.insertClient) {
        const { data: createdClient, error: clientError } = await window.IESupabase.insertClient({
          name: clientName,
        });
        if (clientError) {
          window.IESupabase.showError(clientError.message || "Errore nella creazione del cliente.", "saveJobOffer");
          return;
        }
        client_id = (createdClient && createdClient.id) || "";
      } else {
        const nowForClient = new Date().toISOString();
        const currentUserForClient = getCurrentUserDisplayName();
        const localClient = {
          id: "client-" + Math.random().toString(36).slice(2, 10),
          name: clientName,
          city: null,
          state: null,
          country: null,
          email: null,
          phone: null,
          notes: null,
          created_at: nowForClient,
          updated_at: nowForClient,
          created_by: currentUserForClient,
          updated_by: currentUserForClient,
          is_archived: false,
        };
        IE_STORE.clients.push(localClient);
        client_id = localClient.id;
      }
    }

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertJobOffer({
        client_id: client_id || null,
        title: title,
        position: position,
        description: description || null,
        requirements: requirements || null,
        notes: notes || null,
        salary: salary || null,
        contract_type: contract_type || null,
        positions: Number.isFinite(positions) ? positions : null,
        city: city || null,
        state: state || null,
        deadline: deadline || null,
        status: "active",
      });
      if (error) {
        window.IESupabase.showError(error.message || "Errore nella creazione dell'offerta.", "saveJobOffer");
        return;
      }
      window.IESupabase.showSuccess("Offerta di lavoro creata con successo.");
      navigateTo("offerte.html");
      return;
    }

    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();
    const jobOffer = {
      id: "offer-" + Math.random().toString(36).slice(2, 10),
      client_id: client_id || null,
      title: title,
      position: position,
      description: description,
      requirements: requirements || null,
      notes: notes || null,
      salary: salary || null,
      contract_type: contract_type || null,
      positions: Number.isFinite(positions) ? positions : null,
      city: city || null,
      state: state || null,
      deadline: deadline || null,
      status: status,
      created_at: now,
      updated_at: now,
      created_by: currentUser,
      updated_by: currentUser,
      is_archived: false,
    };
    IE_STORE.jobOffers.push(jobOffer);
    console.info("[ItalianExperience] saveJobOffer() – in-memory:", jobOffer);
    alert("Offerta di lavoro creata con successo (simulazione)");
  }

  async function saveClient(formData) {
    const name = (formData.get("name") || "").toString().trim();
    const city = (formData.get("city") || "").toString().trim();
    const state = (formData.get("state") || "").toString().trim();
    const country = (formData.get("country") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const notes = (formData.get("notes") || "").toString();

    if (!name) {
      if (window.IESupabase) window.IESupabase.showError("Il nome del cliente è obbligatorio.", "saveClient");
      else alert("Il nome del cliente è obbligatorio.");
      return;
    }

    if (window.IESupabase && window.IESupabase.insertClient) {
      const { data, error } = await window.IESupabase.insertClient({
        name: name,
        city: city || null,
        state: state || null,
        country: country || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      });
      if (error) {
        window.IESupabase.showError(error.message || "Errore nel salvataggio del cliente.", "saveClient");
        return;
      }
      window.IESupabase.showSuccess("Cliente creato con successo.");
      navigateTo("clienti.html");
      return;
    }

    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();
    const client = {
      id: "client-" + Math.random().toString(36).slice(2, 10),
      name,
      city: city || null,
      state: state || null,
      country: country || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      created_at: now,
      updated_at: now,
      created_by: currentUser,
      is_archived: false,
    };
    IE_STORE.clients.push(client);
    console.info("[ItalianExperience] saveClient() – in-memory:", client);
    alert("Cliente creato con successo (simulazione)");
    navigateTo("clienti.html");
  }

  function saveCandidateAssociation(formData, jobOfferIdOverride) {
    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();

    const candidateSlug = (formData.get("candidate") || "").toString();
    const status = (formData.get("status") || "new").toString();
    const notes = (formData.get("notes") || "").toString();

    const candidate = IE_STORE.candidates.find((c) => c.slug === candidateSlug);
    const jobOfferId =
      jobOfferIdOverride ||
      (IE_STORE.jobOffers.length ? IE_STORE.jobOffers[0].id : null);

    if (!candidate || !jobOfferId) {
      console.warn(
        "[ItalianExperience] saveCandidateAssociation() – missing candidate or job offer context"
      );
      alert("Impossibile salvare l'associazione (manca il contesto).");
      return;
    }

    const association = {
      id: "assoc-" + Math.random().toString(36).slice(2, 10),
      candidate_id: candidate.id,
      job_offer_id: jobOfferId,
      status,
      notes,
      created_at: now,
      updated_at: now,
      created_by: currentUser,
      updated_by: currentUser,
    };

    IE_STORE.candidateJobAssociations.push(association);

    console.info(
      "[ItalianExperience] saveCandidateAssociation() – payload ready for API:",
      association
    );

    alert("Associazione candidato salvata con successo (simulazione)");

    // Best-effort refresh of associations table if present on the page
    renderAssociationsForActiveOffer();
  }

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
        return item.status === filters.status;
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
        return (item.contract_type || "") === filters.contractType;
      })
      .filter((item) => {
        if (!filters.offerStatus) return true;
        const status = item.status || "";
        if (filters.offerStatus === "active") {
          return status === "active" || status === "open" || status === "inprogress" || status === "in progress";
        }
        return status === filters.offerStatus;
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
        return (item.name || "").toLowerCase().includes(filters.name.toLowerCase());
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
        if (!filters.country) return true;
        return (item.country || "")
          .toLowerCase()
          .includes(filters.country.toLowerCase());
      });
  }

  function archiveRecordById(collection, id) {
    const item = collection.find((x) => x.id === id);
    if (!item) return;
    if (item.is_archived) return;
    item.is_archived = true;
    markUpdated(item);
  }

  // ---------------------------------------------------------------------------
  // Page-specific data views (tables + filters)
  // ---------------------------------------------------------------------------

  function initDataViews() {
    const pageKey = getCurrentPageKey();
    if (pageKey === "dashboard") {
      // Dashboard data is loaded via Supabase helpers in this file.
      initDashboardPage();
      return;
    }
    if (pageKey === "candidati") {
      initCandidatesPage();
    } else if (pageKey === "add-candidato") {
      initAddCandidatePage();
    } else if (pageKey === "offerte") {
      initJobOffersPage();
    } else if (pageKey === "clients") {
      initClientsPage();
    } else if (pageKey === "add-cliente") {
      initAddClientePage();
    }
    if (pageKey === "add-offerta") {
      const params = new URLSearchParams(window.location.search);
      const state = resolveEntityPageState(params);
      setPageMode(state.mode, state.id);
    }
  }

  function getCandidatePageParams() {
    const params = new URLSearchParams(window.location.search);
    const state = resolveEntityPageState(params);
    return { mode: state.mode, id: state.id };
  }

  function getClientPageParams() {
    const params = new URLSearchParams(window.location.search);
    const state = resolveEntityPageState(params);
    return { mode: state.mode, id: state.id };
  }

  function getCandidateStatusBadgeClass(status) {
    switch (status) {
      case "new":
        return "badge-new";
      case "interview":
        return "badge-interview";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge-new";
    }
  }

  function formatCandidateStatusLabel(status) {
    switch (status) {
      case "new":
        return "New";
      case "interview":
        return "Interview";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      default:
        return status || "New";
    }
  }

  function getApplicationStatusBadgeClass(status) {
    switch (status) {
      case "applied":
        return "badge-applied";
      case "screening":
        return "badge-screening";
      case "interview":
        return "badge-interview";
      case "offered":
        return "badge-offered";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      case "not_selected":
        return "badge-neutral";
      default:
        return "badge-applied";
    }
  }

  function formatApplicationStatusLabel(status) {
    switch (status) {
      case "applied":
        return "Applied";
      case "screening":
        return "Screening";
      case "interview":
        return "Interview";
      case "offered":
        return "Offered";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      case "not_selected":
        return "Not Selected";
      default:
        return status || "Applied";
    }
  }

  /**
   * Add/Edit/View candidate page: create mode (no id), or load candidate by id and apply lifecycle (edit/view).
   */
  function initAddCandidatePage() {
    const params = getCandidatePageParams();
    const candidateId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#candidateForm");
    if (!form) return;

    if (!candidateId) {
      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = "Add New Candidate";
      if (docTitleEl) docTitleEl.textContent = "Add New Candidate | Italian Experience Recruitment";
      return;
    }

    if (!window.IESupabase || !window.IESupabase.getCandidateById) {
      if (window.IESupabase && window.IESupabase.showError) window.IESupabase.showError("Supabase non disponibile.");
      return;
    }

    window.IESupabase.getCandidateById(candidateId).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Candidato non trovato.");
        return;
      }
      const candidate = result.data;
      if (!candidate) {
        if (window.IESupabase.showError) window.IESupabase.showError("Candidato non trovato.");
        return;
      }

      const lifecycleStatus = candidate.is_archived ? "archived" : "active";
      const effectiveMode = resolveEntityMode(lifecycleStatus, requestedMode);
      console.log("DEBUG CANDIDATE PAGE");
      console.log("requestedMode:", requestedMode);
      console.log("candidate.is_archived:", candidate.is_archived);
      console.log("lifecycleStatus:", lifecycleStatus);
      console.log("effectiveMode:", effectiveMode);

      const firstNameEl = form.querySelector('[name="first_name"]');
      const lastNameEl = form.querySelector('[name="last_name"]');
      const addressEl = form.querySelector('[name="address"]');
      const positionEl = form.querySelector('[name="position"]');
      const statusEl = form.querySelector('[name="status"]');
      const sourceEl = form.querySelector('[name="source"]');
      const notesEl = form.querySelector('[name="notes"]');
      if (firstNameEl) firstNameEl.value = candidate.first_name || "";
      if (lastNameEl) lastNameEl.value = candidate.last_name || "";
      if (addressEl) addressEl.value = candidate.address || "";
      if (positionEl) positionEl.value = candidate.position || "";
      if (statusEl) statusEl.value = candidate.status || "new";
      if (sourceEl) sourceEl.value = candidate.source || "";
      if (notesEl) notesEl.value = candidate.notes || "";

      function setFormReadonly(readonly) {
        const fields = form.querySelectorAll("input, textarea, select");
        fields.forEach(function (field) {
          if (field.type === "hidden") return;
          field.disabled = !!readonly;
        });
        const saveBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = form.querySelector("[data-edit-cancel]");
        if (saveBtn) {
          saveBtn.style.display = readonly ? "none" : "";
        }
        if (cancelBtn) {
          cancelBtn.textContent = readonly ? "Back" : "Cancel";
        }
      }
      setFormReadonly(effectiveMode === "view");

      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = effectiveMode === "view" ? "View Candidate" : "Edit Candidate";
      if (docTitleEl) docTitleEl.textContent = (effectiveMode === "view" ? "View Candidate" : "Edit Candidate") + " | Italian Experience Recruitment";

      function renderCandidateLifecycleActions(status) {
        renderLifecycleActions({
          entityType: "candidate",
          entityId: candidateId,
          status: status,
          mode: effectiveMode,
          containerId: "candidateActions",
          onEdit: function () {
            navigateTo("add-candidato.html?id=" + encodeURIComponent(candidateId) + "&mode=edit");
          },
          onArchive: async function () {
            const res = await window.IESupabase.archiveCandidate(candidateId);
            if (!res.error) navigateTo("candidati.html");
          },
          onReopen: async function () {
            const res = await window.IESupabase.unarchiveCandidate(candidateId);
            if (!res.error) {
              candidate.is_archived = false;
              renderCandidateLifecycleActions("active");
            }
          },
        });
      }
      renderCandidateLifecycleActions(lifecycleStatus);
    });
  }

  /**
   * Add/Edit/View client page: create mode (no id), or load client by id and apply lifecycle (edit/view).
   */
  function initAddClientePage() {
    const params = getClientPageParams();
    const clientId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#clientForm");
    if (!form) return;

    if (!clientId) {
      return;
    }

    if (!window.IESupabase || !window.IESupabase.getClientById) {
      if (window.IESupabase && window.IESupabase.showError) window.IESupabase.showError("Supabase non disponibile.");
      return;
    }

    window.IESupabase.getClientById(clientId).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Cliente non trovato.");
        return;
      }
      const client = result.data;
      if (!client) {
        if (window.IESupabase.showError) window.IESupabase.showError("Cliente non trovato.");
        return;
      }

      const lifecycleStatus = client.is_archived ? "archived" : "active";
      const effectiveMode = resolveEntityMode(lifecycleStatus, requestedMode);

      const nameEl = form.querySelector('[name="name"]');
      const cityEl = form.querySelector('[name="city"]');
      const stateEl = form.querySelector('[name="state"]');
      const countryEl = form.querySelector('[name="country"]');
      const emailEl = form.querySelector('[name="email"]');
      const phoneEl = form.querySelector('[name="phone"]');
      const notesEl = form.querySelector('[name="notes"]');
      if (nameEl) nameEl.value = client.name || "";
      if (cityEl) cityEl.value = client.city || "";
      if (stateEl) stateEl.value = client.state || "";
      if (countryEl) countryEl.value = client.country || "";
      if (emailEl) emailEl.value = client.email || "";
      if (phoneEl) phoneEl.value = client.phone || "";
      if (notesEl) notesEl.value = client.notes || "";

      function setFormReadonly(readonly) {
        const fields = form.querySelectorAll("input, textarea, select");
        fields.forEach(function (field) {
          if (field.type === "hidden") return;
          field.disabled = !!readonly;
        });
        const saveBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = form.querySelector("[data-edit-cancel]");
        if (saveBtn) {
          saveBtn.style.display = readonly ? "none" : "";
        }
        if (cancelBtn) {
          cancelBtn.textContent = readonly ? "Back" : "Annulla";
        }
      }
      setFormReadonly(effectiveMode === "view");

      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = effectiveMode === "view" ? "Visualizza Cliente" : "Modifica Cliente";
      if (docTitleEl) docTitleEl.textContent = (effectiveMode === "view" ? "Visualizza Cliente" : "Modifica Cliente") + " | Italian Experience Recruitment";

      function onEdit() {
        navigateTo("add-cliente.html?id=" + encodeURIComponent(clientId) + "&mode=edit");
      }
      function onArchive() {
        return window.IESupabase.archiveClient(clientId).then(function (res) {
          if (!res.error) navigateTo("clienti.html");
        });
      }
      function onReopen() {
        return window.IESupabase.unarchiveClient(clientId).then(function (res) {
          if (!res.error) {
            client.is_archived = false;
            renderLifecycleActions({
              entityType: "client",
              entityId: clientId,
              status: "active",
              mode: "view",
              containerId: "clientActions",
              onEdit: onEdit,
              onArchive: onArchive,
              onReopen: onReopen,
            });
          }
        });
      }

      renderLifecycleActions({
        entityType: "client",
        entityId: clientId,
        status: lifecycleStatus,
        mode: effectiveMode,
        containerId: "clientActions",
        onEdit: onEdit,
        onArchive: onArchive,
        onReopen: onReopen,
      });
    });
  }

  /**
   * Update candidate from edit form (Supabase only).
   */
  function updateCandidateFromForm(id, formData) {
    const payload = {
      first_name: (formData.get("first_name") || "").toString().trim(),
      last_name: (formData.get("last_name") || "").toString().trim(),
      address: (formData.get("address") || "").toString().trim(),
      position: (formData.get("position") || "").toString().trim(),
      status: (formData.get("status") || "new").toString(),
      source: (formData.get("source") || "").toString(),
      notes: (formData.get("notes") || "").toString(),
    };
    window.IESupabase.updateCandidate(id, payload).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore durante il salvataggio.");
        return;
      }
      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Candidato aggiornato.");
      navigateTo("candidati.html");
    });
  }

  /**
   * Update client from edit form (Supabase only).
   */
  function updateClientFromForm(id, formData) {
    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      city: (formData.get("city") || "").toString().trim(),
      state: (formData.get("state") || "").toString().trim(),
      country: (formData.get("country") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      phone: (formData.get("phone") || "").toString().trim(),
      notes: (formData.get("notes") || "").toString().trim(),
    };
    window.IESupabase.updateClient(id, payload).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore durante il salvataggio.");
        return;
      }
      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Cliente aggiornato.");
      navigateTo("clienti.html");
    });
  }

  function normalizeStatus(status) {
    const s = (status || "active").toString().toLowerCase();
    if (s === "open" || s === "inprogress" || s === "active") return "active";
    if (s === "closed") return "closed";
    if (s === "archived") return "archived";
    return "active";
  }

  function resolveEntityMode(status, requestedMode) {
    var normalizedStatus = normalizeStatus(status);
    if (normalizedStatus !== "active") return "view";
    return requestedMode;
  }

  function renderLifecycleActions(config) {
    var container = config.containerId ? document.getElementById(config.containerId) : null;
    if (!container) return;
    container.innerHTML = "";

    if (config.mode !== "view") {
      return;
    }
    if (!config.entityId) return;

    var normalizedStatus = normalizeStatus(config.status);

    var editBtn, closeBtn, reopenBtn, archiveBtn;
    var btnClass = "px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all";
    var archiveBtnClass = "px-4 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-semibold bg-red-50 hover:bg-red-100 transition-all";

    if (normalizedStatus === "active") {
      if (config.onEdit) {
        editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.className = btnClass;
        editBtn.addEventListener("click", function () {
          config.onEdit();
        });
        container.appendChild(editBtn);
      }
      if (config.entityType === "job_offer" && config.onClose) {
        closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.textContent = "Mark as Closed";
        closeBtn.className = btnClass;
        closeBtn.addEventListener("click", async function () {
          await config.onClose();
        });
        container.appendChild(closeBtn);
      }
      if (config.onArchive) {
        archiveBtn = document.createElement("button");
        archiveBtn.type = "button";
        archiveBtn.textContent = "Archive";
        archiveBtn.className = archiveBtnClass;
        archiveBtn.addEventListener("click", async function () {
          await config.onArchive();
        });
        container.appendChild(archiveBtn);
      }
    } else if (normalizedStatus === "closed") {
      if (config.onReopen) {
        reopenBtn = document.createElement("button");
        reopenBtn.type = "button";
        reopenBtn.textContent = "Reopen";
        reopenBtn.className = btnClass;
        reopenBtn.addEventListener("click", async function () {
          await config.onReopen();
        });
        container.appendChild(reopenBtn);
      }
      if (config.onArchive) {
        archiveBtn = document.createElement("button");
        archiveBtn.type = "button";
        archiveBtn.textContent = "Archive";
        archiveBtn.className = archiveBtnClass;
        archiveBtn.addEventListener("click", async function () {
          await config.onArchive();
        });
        container.appendChild(archiveBtn);
      }
    } else if (normalizedStatus === "archived") {
      if (config.onReopen) {
        reopenBtn = document.createElement("button");
        reopenBtn.type = "button";
        reopenBtn.textContent = "Reopen";
        reopenBtn.className = btnClass;
        reopenBtn.addEventListener("click", async function () {
          await config.onReopen();
        });
        container.appendChild(reopenBtn);
      }
    }
  }

  function getJobOfferPageParams() {
    const params = new URLSearchParams(window.location.search);
    const state = resolveEntityPageState(params);
    return { mode: state.mode, id: state.id };
  }

  function setPageMode(mode, id) {
    const form = document.querySelector("#jobOfferForm");
    if (!form) return;

    const params = getJobOfferPageParams();
    const effectiveMode = (mode || params.mode || "create").toString().toLowerCase();
    const finalMode = effectiveMode === "edit" || effectiveMode === "view" ? effectiveMode : "create";

    const headerTitleEl = document.querySelector("header h1");
    const docTitleEl = document.querySelector("title");
    const saveButton = form.querySelector('button[type="submit"]');
    const cancelButton = form.querySelector("button[type='button']");
    const actionsContainer = document.querySelector("#jobOfferActions");

    function setTitles(text) {
      if (headerTitleEl) headerTitleEl.textContent = text;
      if (docTitleEl) docTitleEl.textContent = text + " | Italian Experience Recruitment";
    }

    function setFormDisabled(disabled) {
      const fields = form.querySelectorAll("input, textarea, select");
      fields.forEach(function (field) {
        if (field.type === "hidden") return;
        field.disabled = !!disabled;
      });
    }

    function setSaveVisibility(visible) {
      if (!saveButton) return;
      if (visible) {
        saveButton.classList.remove("hidden");
        saveButton.disabled = false;
      } else {
        saveButton.classList.add("hidden");
        saveButton.disabled = true;
      }
    }

    function setReadonlyState() {
      setFormDisabled(true);
      setSaveVisibility(false);
      if (cancelButton) {
        cancelButton.classList.add("hidden");
        cancelButton.disabled = true;
      }
    }

    function setEditableState() {
      setFormDisabled(false);
      setSaveVisibility(true);
      if (cancelButton) {
        cancelButton.classList.remove("hidden");
        cancelButton.disabled = false;
      }
    }

    function handleMissingOfferAndRedirect() {
      try {
        window.alert("Offerta non trovata.");
      } catch (e) {
        // ignore
      }
      navigateTo("offerte.html");
    }

    function openReopenOfferModal(offerId, offer, options) {
      var onConfirm = options && typeof options.onConfirm === "function" ? options.onConfirm : null;
      openModal({
        title: "Reopen Job Offer?",
        fullPageHref: null,
        render: function (mount) {
          mount.innerHTML =
            "<p class=\"text-gray-700 text-sm mb-4\">This job offer is closed. Reopen it to edit, add candidates, or mark someone as hired.</p>" +
            "<div class=\"flex gap-3 mt-4\">" +
            "<button type=\"button\" data-reopen-confirm class=\"px-4 py-2.5 rounded-xl bg-[#1b4332] text-white text-sm font-semibold hover:opacity-90 transition-all\">Confirm</button>" +
            "<button type=\"button\" data-ie-modal-close class=\"px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all\">Cancel</button>" +
            "</div>";
          var confirmBtn = mount.querySelector("[data-reopen-confirm]");
          if (confirmBtn && onConfirm) {
            confirmBtn.addEventListener("click", async function () {
              if (confirmBtn.disabled) return;
              confirmBtn.disabled = true;
              try {
                await onConfirm();
                closeModal();
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(e && e.message ? e.message : "Errore.");
                }
              } finally {
                confirmBtn.disabled = false;
              }
            });
          }
        },
      });
    }

    function renderActionButtons(modeToRender, offerId, offer) {
      if (!actionsContainer) return;
      function reloadPage() {
        window.location.reload();
      }
      renderLifecycleActions({
        entityType: "job_offer",
        entityId: offerId,
        status: offer ? offer.status : "active",
        mode: modeToRender,
        containerId: "jobOfferActions",
        onEdit: function () {
          navigateTo("add-offerta.html?id=" + encodeURIComponent(offerId) + "&mode=edit");
        },
        onClose: async function () {
          if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
          var result = await window.IESupabase.updateJobOfferStatus(offerId, "closed");
          if (result && result.error && window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore.");
          else reloadPage();
        },
        onArchive: async function () {
          if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
          var result = await window.IESupabase.updateJobOfferStatus(offerId, "archived");
          if (result && result.error && window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore.");
          else navigateTo("offerte.html");
        },
        onReopen: function () {
          openReopenOfferModal(offerId, offer, {
            onConfirm: async function () {
              if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
              var result = await window.IESupabase.updateJobOfferStatus(offerId, "active");
              if (result && result.error) {
                if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore.");
                throw new Error(result.error.message || "Errore.");
              }
              if (result && result.data) {
                if (offer) {
                  offer.status = result.data.status;
                  if (result.data.positions != null) offer.positions = result.data.positions;
                }
                var updatedOffer = offer || result.data;
                populateFormFromOffer(updatedOffer);
                renderActionButtons("view", offerId, updatedOffer);
                renderAssociatedCandidates(offerId, updatedOffer);
              }
            },
          });
        }
      });
    }

    var STATUS_OPTIONS = [
      "applied",
      "screening",
      "interview",
      "offered",
      "hired",
      "rejected",
      "not_selected"
    ];

    async function renderAssociatedCandidates(jobOfferId, offer) {
      if (!window.IESupabase || !window.IESupabase.fetchCandidatesForJobOffer) return;
      var container = document.getElementById("associated-candidates-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "associated-candidates-container";
        container.className = "mt-8";
        var formActions = document.getElementById("form-action-buttons");
        if (formActions && formActions.nextSibling) {
          formActions.parentNode.insertBefore(container, formActions.nextSibling);
        } else if (formActions) {
          formActions.parentNode.appendChild(container);
        } else {
          var form = document.getElementById("jobOfferForm");
          if (form) form.appendChild(container);
        }
      }
      container.innerHTML = "";
      var result = await window.IESupabase.fetchCandidatesForJobOffer(jobOfferId);
      if (result.error) {
        console.error("[ItalianExperience] fetchCandidatesForJobOffer error:", result.error);
        return;
      }
      var list = result.data || [];
      var associatedCandidateIds = list.map(function (item) {
        var c = item.candidates;
        return c && c.id ? c.id : null;
      }).filter(Boolean);

      var sectionTitle = document.createElement("h3");
      sectionTitle.className = "serif text-xl font-bold text-[#1b4332] section-title mb-4";
      sectionTitle.textContent = "Associated Candidates";
      container.appendChild(sectionTitle);
      if (list.length === 0) {
        var emptyMsg = document.createElement("p");
        emptyMsg.className = "text-gray-500 text-sm";
        emptyMsg.textContent = "No candidates associated yet.";
        container.appendChild(emptyMsg);
      } else {
        var glassCard = document.createElement("div");
        glassCard.className = "glass-card p-6 rounded-3xl overflow-x-auto";
        var table = document.createElement("table");
        table.className = "w-full text-left border-collapse";
        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");
        ["Name", "Position", "Status", "Change", "Remove"].forEach(function (label) {
          var th = document.createElement("th");
          th.className = "pb-3 text-sm font-semibold text-gray-700 border-b border-gray-200";
          th.textContent = label;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        var tbody = document.createElement("tbody");
        list.forEach(function (item) {
          var c = item.candidates || {};
          var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
          var position = (c.position && c.position.toString()) || "—";
          var status = (item.status && item.status.toString()) || "—";
          var tr = document.createElement("tr");
          tr.className = "border-b border-gray-100";
          tr.setAttribute("data-row-association-id", item.id);
          var tdName = document.createElement("td");
          tdName.className = "py-3 text-sm text-gray-800";
          tdName.textContent = name;
          tr.appendChild(tdName);
          var tdPosition = document.createElement("td");
          tdPosition.className = "py-3 text-sm text-gray-600";
          tdPosition.textContent = position;
          tr.appendChild(tdPosition);
          var tdStatus = document.createElement("td");
          tdStatus.className = "py-3 text-sm text-gray-600 status-cell";
          var badge = document.createElement("span");
          badge.className = "badge " + getApplicationStatusBadgeClass(status);
          badge.textContent = formatApplicationStatusLabel(status);
          tdStatus.innerHTML = "";
          tdStatus.appendChild(badge);
          tr.appendChild(tdStatus);
          var tdChange = document.createElement("td");
          tdChange.className = "py-3";
          var select = document.createElement("select");
          select.className = "form-input appearance-none text-sm py-2 pr-8";
          select.setAttribute("data-association-id", item.id);
          STATUS_OPTIONS.forEach(function (opt) {
            var option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            if (opt === status) option.selected = true;
            select.appendChild(option);
          });
          var previousStatus = status;
          select.addEventListener("change", async function () {
            var associationId = select.getAttribute("data-association-id");
            var newStatus = select.value;
            var statusSelect = document.querySelector('#jobOfferForm [name="status"]');
            var normalizedOfferStatus = statusSelect
              ? normalizeStatus(statusSelect.value)
              : "active";
            if (normalizedOfferStatus === "closed" && newStatus === "hired") {
              select.value = previousStatus;
              openReopenOfferModal(jobOfferId, offer, {
                onConfirm: async function () {
                  if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
                  var reopenResult = await window.IESupabase.updateJobOfferStatus(jobOfferId, "active");
                  if (reopenResult && reopenResult.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(reopenResult.error.message || "Errore.");
                    throw new Error(reopenResult.error.message || "Errore.");
                  }
                  if (reopenResult && reopenResult.data && offer) {
                    offer.status = reopenResult.data.status;
                    if (reopenResult.data.positions != null) offer.positions = reopenResult.data.positions;
                    populateFormFromOffer(offer);
                    renderActionButtons("view", jobOfferId, offer);
                  }
                  if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
                  var hireRes = await window.IESupabase.updateCandidateAssociationStatus(associationId, "hired");
                  if (hireRes.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(hireRes.error.message || "Errore aggiornamento stato.");
                    throw new Error(hireRes.error.message || "Errore aggiornamento stato.");
                  }
                  await renderAssociatedCandidates(jobOfferId, offer);
                },
              });
              return;
            }
            if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
            var res = await window.IESupabase.updateCandidateAssociationStatus(associationId, newStatus);
            if (res.error) {
              if (window.IESupabase.showError) window.IESupabase.showError(res.error.message || "Errore aggiornamento stato.");
              return;
            }
            var statusCell = tr.querySelector(".status-cell");
            if (statusCell) {
              statusCell.innerHTML = "";
              var badge = document.createElement("span");
              badge.className = "badge " + getApplicationStatusBadgeClass(newStatus);
              badge.textContent = formatApplicationStatusLabel(newStatus);
              statusCell.appendChild(badge);
            }
          });
          tdChange.appendChild(select);
          tr.appendChild(tdChange);
          var tdRemove = document.createElement("td");
          tdRemove.className = "py-3";
          var removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-all";
          removeBtn.textContent = "Remove";
          removeBtn.addEventListener("click", async function () {
            if (!window.confirm("Remove this candidate from the job offer?")) return;
            var associationId = tr.getAttribute("data-row-association-id");
            if (!window.IESupabase || !window.IESupabase.removeCandidateFromJob) return;
            var result = await window.IESupabase.removeCandidateFromJob(associationId);
            if (!result.error) {
              await renderAssociatedCandidates(jobOfferId, offer);
            } else {
              if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Errore rimozione.");
            }
          });
          tdRemove.appendChild(removeBtn);
          tr.appendChild(tdRemove);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        glassCard.appendChild(table);
        container.appendChild(glassCard);
      }

      var addCandidateWrap = document.createElement("div");
      addCandidateWrap.className = "mt-4";
      var addCandidateBtn = document.createElement("button");
      addCandidateBtn.type = "button";
      addCandidateBtn.className = "px-4 py-2.5 rounded-xl border border-[#1b4332] text-[#1b4332] font-semibold text-sm hover:bg-[#1b4332]/5 transition-all flex items-center gap-2";
      addCandidateBtn.innerHTML = "<span class=\"text-lg leading-none\">+</span> Add Candidate";
      addCandidateBtn.addEventListener("click", function () {
        var existingWrap = container.querySelector("[data-autocomplete-wrap]");
        if (existingWrap) {
          existingWrap.remove();
          addCandidateBtn.setAttribute("aria-expanded", "false");
          return;
        }
        showAddCandidateAutocomplete(container, addCandidateBtn, jobOfferId, associatedCandidateIds, function () {
          renderAssociatedCandidates(jobOfferId, offer);
        });
        addCandidateBtn.setAttribute("aria-expanded", "true");
      });
      addCandidateWrap.appendChild(addCandidateBtn);
      container.appendChild(addCandidateWrap);
    }

    function showAddCandidateAutocomplete(container, triggerBtn, jobOfferId, associatedCandidateIds, onLinked) {
      var wrap = document.createElement("div");
      wrap.className = "mt-3 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm relative";
      wrap.setAttribute("data-autocomplete-wrap", "true");

      var inputRow = document.createElement("div");
      inputRow.className = "flex gap-2 items-center";
      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search candidate by name...";
      input.className = "form-input flex-1 text-sm";
      input.setAttribute("autocomplete", "off");
      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", close);
      inputRow.appendChild(input);
      inputRow.appendChild(cancelBtn);
      wrap.appendChild(inputRow);

      var dropdown = document.createElement("div");
      dropdown.className = "absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto hidden";
      dropdown.setAttribute("data-autocomplete-dropdown", "true");
      wrap.appendChild(dropdown);

      var debounceTimer = null;

      function close() {
        if (triggerBtn) triggerBtn.setAttribute("aria-expanded", "false");
        wrap.remove();
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleEscape);
      }

      function handleOutsideClick(e) {
        if (!wrap.contains(e.target) && e.target !== triggerBtn) close();
      }

      function handleEscape(e) {
        if (e.key === "Escape") close();
      }

      function renderResults(candidates) {
        dropdown.innerHTML = "";
        dropdown.classList.remove("hidden");
        if (!candidates || candidates.length === 0) {
          var empty = document.createElement("div");
          empty.className = "px-4 py-3 text-sm text-gray-500";
          empty.textContent = "No matching candidates";
          dropdown.appendChild(empty);
          return;
        }
        candidates.forEach(function (c) {
          var row = document.createElement("button");
          row.type = "button";
          row.className = "w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors flex flex-col gap-0.5";
          var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
          var position = (c.position && c.position.toString()) || "—";
          row.innerHTML = "<span class=\"font-medium text-gray-800\">" + escapeHtml(name) + "</span><span class=\"text-xs text-gray-500\">" + escapeHtml(position) + "</span>";
          row.addEventListener("click", function () {
            selectCandidate(c);
          });
          dropdown.appendChild(row);
        });
      }

      function escapeHtml(s) {
        var div = document.createElement("div");
        div.textContent = s;
        return div.innerHTML;
      }

      function selectCandidate(c) {
        if (!window.IESupabase || !window.IESupabase.linkCandidateToJob) return;
        if (associatedCandidateIds.indexOf(c.id) !== -1) {
          if (window.IESupabase.showError) window.IESupabase.showError("This candidate is already associated with this job offer.");
          return;
        }
        wrap.querySelector("input").disabled = true;
        window.IESupabase.linkCandidateToJob({
          candidate_id: c.id,
          job_offer_id: jobOfferId,
          status: "applied"
        }).then(function (res) {
          wrap.querySelector("input").disabled = false;
          if (res.error) {
            var msg = res.error.message || "";
            var code = res.error.code || (msg.indexOf("23505") !== -1 ? "23505" : null);
            if (code === "23505" || msg.indexOf("23505") !== -1) {
              alert("Candidate already linked");
              return;
            }
            if (msg.toLowerCase().indexOf("already hired") !== -1) {
              alert(msg);
              return;
            }
            if (window.IESupabase.showError) window.IESupabase.showError(msg || "Errore collegamento.");
            return;
          }
          close();
          if (typeof onLinked === "function") onLinked();
        }).catch(function () {
          wrap.querySelector("input").disabled = false;
        });
      }

      input.addEventListener("input", function () {
        var term = (input.value || "").trim();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (term.length < 2) {
          dropdown.classList.add("hidden");
          dropdown.innerHTML = "";
          return;
        }
        debounceTimer = setTimeout(function () {
          debounceTimer = null;
          if (!window.IESupabase || !window.IESupabase.searchCandidatesByName) return;
          window.IESupabase.searchCandidatesByName({
            term: term,
            limit: 10
          }).then(function (result) {
            if (result.error) {
              renderResults([]);
              return;
            }
            var data = result.data || [];
            var excluded = {};
            associatedCandidateIds.forEach(function (id) { excluded[id] = true; });
            var filtered = data.filter(function (c) { return !excluded[c.id]; });
            renderResults(filtered);
          });
        }, 300);
      });

      input.addEventListener("focus", function () {
        var term = (input.value || "").trim();
        if (term.length >= 2 && dropdown.children.length > 0) dropdown.classList.remove("hidden");
      });

      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
      setTimeout(function () { input.focus(); }, 50);

      triggerBtn.parentNode.insertBefore(wrap, triggerBtn.nextSibling);
    }

    function configureCancel(modeToConfigure, offerId) {
      if (!cancelButton) return;
      cancelButton.onclick = null;

      if (modeToConfigure === "create") {
        cancelButton.addEventListener("click", function () {
          navigateTo("offerte.html");
        });
      } else if (modeToConfigure === "edit" && offerId) {
        cancelButton.addEventListener("click", function () {
          navigateTo("add-offerta.html?id=" + encodeURIComponent(offerId) + "&mode=view");
        });
      }
    }

    function clearForm() {
      const fields = form.querySelectorAll("input, textarea, select");
      fields.forEach(function (field) {
        if (field.type === "hidden") {
          field.value = "";
          return;
        }
        if (field.tagName === "SELECT") {
          if (field.name === "status") {
            field.value = "open";
          } else {
            field.value = "";
          }
          return;
        }
        if (field.tagName === "TEXTAREA") {
          field.value = "";
          return;
        }
        if (field.type === "number") {
          field.value = "";
          return;
        }
        if (field.type === "date") {
          field.value = "";
          return;
        }
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = false;
          return;
        }
        field.value = "";
      });
    }

    function populateFormFromOffer(offer) {
      if (!offer) return;
      const titleEl = form.querySelector('[name="title"]');
      const positionEl = form.querySelector('[name="position"]');
      const clientNameEl = form.querySelector("#clientInput");
      const clientIdHiddenEl = form.querySelector("#clientIdHidden");
      const cityEl = form.querySelector('[name="city"]');
      const stateEl = form.querySelector('[name="state"]');
      const contractTypeEl = form.querySelector('[name="contract_type"]');
      const positionsEl = form.querySelector('[name="positions"]');
      const salaryEl = form.querySelector('[name="salary"]');
      const deadlineEl = form.querySelector('[name="deadline"]');
      const descriptionEl = form.querySelector('[name="description"]');
      const requirementsEl = form.querySelector('[name="requirements"]');
      const notesEl = form.querySelector('[name="notes"]');
      const statusEl = form.querySelector('[name="status"]');

      if (titleEl) titleEl.value = offer.title || "";
      if (positionEl) positionEl.value = offer.position || "";
      if (clientIdHiddenEl) clientIdHiddenEl.value = offer.client_id || "";
      if (clientNameEl) clientNameEl.value = offer.client_name || "";
      if (cityEl) cityEl.value = offer.city || "";
      if (stateEl) stateEl.value = offer.state || "";
      if (contractTypeEl) contractTypeEl.value = offer.contract_type || "";
      if (positionsEl) positionsEl.value = offer.positions != null ? String(offer.positions) : "";
      if (salaryEl) salaryEl.value = offer.salary || "";
      if (deadlineEl) deadlineEl.value = offer.deadline ? offer.deadline.split("T")[0] : "";
      if (descriptionEl) descriptionEl.value = offer.description || "";
      if (requirementsEl) requirementsEl.value = offer.requirements || "";
      if (notesEl) notesEl.value = offer.notes || "";
      if (statusEl) statusEl.value = offer.status || "open";
    }

    if (finalMode === "create") {
      setTitles("Create New Job Offer");
      clearForm();
      setEditableState();
      configureCancel("create", null);
      renderActionButtons("create", null);
      return;
    }

    const offerId = id || params.id;
    if (!offerId) {
      navigateTo("offerte.html");
      return;
    }

    const isViewMode = finalMode === "view";
    setTitles(isViewMode ? "View Job Offer" : "Edit Job Offer");
    configureCancel(finalMode, offerId);
    if (isViewMode) {
      setReadonlyState();
    } else {
      setEditableState();
    }
    renderActionButtons(finalMode, offerId);

    if (window.IESupabase && window.IESupabase.getJobOfferById) {
      window.IESupabase
        .getJobOfferById(offerId)
        .then(function (result) {
          if (result.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Offerta non trovata.");
            }
            handleMissingOfferAndRedirect();
            return;
          }
          const offer = result.data;
          if (!offer) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError("Offerta non trovata.");
            }
            handleMissingOfferAndRedirect();
            return;
          }
          populateFormFromOffer(offer);

          const normalizedStatus = normalizeStatus(offer.status);
          if (normalizedStatus === "archived") {
            navigateTo("archiviati.html");
            return;
          }
          const effectiveModeForOffer = resolveEntityMode(offer.status, finalMode);
          const isViewModeForOffer = effectiveModeForOffer === "view";

          setTitles(isViewModeForOffer ? "View Job Offer" : "Edit Job Offer");
          if (isViewModeForOffer) {
            setReadonlyState();
          } else {
            setEditableState();
          }
          configureCancel(effectiveModeForOffer, offerId);
          renderActionButtons(effectiveModeForOffer, offerId, offer);

          if (isViewModeForOffer) {
            setFormDisabled(true);
            if (normalizedStatus !== "archived") renderAssociatedCandidates(offerId, offer);
          }
        })
        .catch(function (err) {
          console.error("[ItalianExperience] getJobOfferById error:", err);
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError("Errore nel caricamento dell'offerta.");
          }
          handleMissingOfferAndRedirect();
        });
      return;
    }

    const localOffer =
      typeof IE_STORE !== "undefined" && IE_STORE && Array.isArray(IE_STORE.jobOffers)
        ? IE_STORE.jobOffers.find(function (o) {
            return o.id === offerId;
          })
        : null;

    if (!localOffer) {
      navigateTo("offerte.html");
      return;
    }

    populateFormFromOffer(localOffer);

    const normalizedStatus = normalizeStatus(localOffer.status);
    if (normalizedStatus === "archived") {
      navigateTo("archiviati.html");
      return;
    }
    const effectiveModeForOffer = resolveEntityMode(localOffer.status, finalMode);
    const isViewModeForOffer = effectiveModeForOffer === "view";

    setTitles(isViewModeForOffer ? "View Job Offer" : "Edit Job Offer");
    if (isViewModeForOffer) {
      setReadonlyState();
    } else {
      setEditableState();
    }
    configureCancel(effectiveModeForOffer, offerId);
    renderActionButtons(effectiveModeForOffer, offerId, localOffer);

    if (isViewModeForOffer) {
      setFormDisabled(true);
      if (normalizedStatus !== "archived") renderAssociatedCandidates(offerId, localOffer);
    }
  }

  function updateJobOfferFromForm(id, formData) {
    const payload = {
      client_id: (formData.get("client_id") || formData.get("client_id_hidden") || formData.get("clientIdHidden") || formData.get("clientId") || "").toString() || null,
      title: (formData.get("title") || "").toString().trim(),
      position: (formData.get("position") || "").toString().trim() || null,
      description: (formData.get("description") || "").toString() || null,
      requirements: (formData.get("requirements") || "").toString() || null,
      notes: (formData.get("notes") || "").toString() || null,
      salary: (formData.get("salary") || "").toString() || null,
      contract_type: (formData.get("contract_type") || "").toString() || null,
      positions: (function () {
        const raw = (formData.get("positions") || "").toString().trim();
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      city: (formData.get("city") || "").toString().trim() || null,
      state: (formData.get("state") || "").toString().trim() || null,
      deadline: (formData.get("deadline") || "").toString() || null,
      status: (formData.get("status") || "open").toString(),
    };

    if (window.IESupabase && window.IESupabase.updateJobOffer) {
      window.IESupabase.updateJobOffer(id, payload).then(function (result) {
        if (result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(result.error.message || "Errore durante il salvataggio.");
          }
          return;
        }
        if (window.IESupabase.showSuccess) {
          window.IESupabase.showSuccess("Offerta aggiornata.");
        }
        navigateTo("offerte.html");
      });
      return;
    }

    if (typeof IE_STORE !== "undefined" && IE_STORE && Array.isArray(IE_STORE.jobOffers)) {
      const offer = IE_STORE.jobOffers.find(function (o) {
        return o.id === id;
      });
      if (offer) {
        Object.assign(offer, payload, {
          updated_at: new Date().toISOString(),
        });
      }
    }
    navigateTo("offerte.html");
  }

  /**
   * Dashboard: load real data from Supabase and update cards, recent candidates table, and sources.
   */
  async function initDashboardPage() {
    const api = window.IESupabase;
    if (!api) {
      setDashboardCardValues({ totalCandidates: 0, activeJobOffers: 0, newCandidatesToday: 0, hiredThisMonth: 0 });
      renderDashboardRecentCandidates([]);
      renderDashboardSources([]);
      return;
    }

    setDashboardLoading(true);

    try {
      const [
        totalRes,
        activeOffersRes,
        newTodayRes,
        hiredRes,
        recentRes,
        bySourceRes,
      ] = await Promise.all([
        api.getTotalCandidates(),
        api.getActiveJobOffers(),
        api.getNewCandidatesToday(),
        api.getHiredThisMonth(),
        api.getRecentCandidates(),
        api.getCandidatesBySource(),
      ]);

      setDashboardCardValues({
        totalCandidates: totalRes.error ? 0 : totalRes.data,
        activeJobOffers: activeOffersRes.error ? 0 : activeOffersRes.data,
        newCandidatesToday: newTodayRes.error ? 0 : newTodayRes.data,
        hiredThisMonth: hiredRes.error ? 0 : hiredRes.data,
      });

      const recentList = recentRes.error ? [] : (recentRes.data || []);
      const mappedRecent = recentList.map(function (r) {
        return {
          id: r.id,
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          position: r.position || "",
          status: r.status || "new",
          created_at: r.created_at,
        };
      });
      renderDashboardRecentCandidates(mappedRecent);

      const sourceList = bySourceRes.error ? [] : (bySourceRes.data || []);
      renderDashboardSources(sourceList);
    } catch (err) {
      console.error("[ItalianExperience] Dashboard load error:", err);
      setDashboardCardValues({ totalCandidates: 0, activeJobOffers: 0, newCandidatesToday: 0, hiredThisMonth: 0 });
      renderDashboardRecentCandidates([]);
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
    var tbody = document.querySelector("[data-dashboard='recentCandidates']");
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
    var newEl = document.querySelector("[data-dashboard-value='newCandidatesToday']");
    if (newEl) {
      var v = newEl.querySelector(".dashboard-value");
      if (v) v.textContent = formatInteger(values.newCandidatesToday);
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

  function renderDashboardRecentCandidates(rows) {
    var tbody = document.querySelector("[data-dashboard='recentCandidates']");
    if (!tbody) return;
    var placeholder = tbody.querySelector("[data-dashboard-placeholder]");
    if (placeholder) placeholder.remove();
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan=\"4\" class=\"px-6 py-8 text-center text-gray-400\">Nessun candidato recente.</td>";
      tbody.appendChild(tr);
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.className = "table-row transition";
      var fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
      var createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("it-IT")
        : "";
      var statusClass = getDashboardCandidateStatusBadgeClass(row.status);
      var statusLabel = formatDashboardCandidateStatusLabel(row.status);
      tr.innerHTML =
        "<td class=\"px-6 py-4\">" +
        "<a href=\"#\" data-action=\"dashboard-open-candidate\" data-id=\"" + escapeHtml(String(row.id || '')) + "\" class=\"font-semibold text-gray-800 cursor-pointer hover:underline\">" +
        escapeHtml(fullName) +
        "</a>" +
        "</td>" +
        "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(row.position || "—") + "</td>" +
        "<td class=\"px-6 py-4 text-gray-500 text-sm\">" + escapeHtml(createdDate) + "</td>" +
        "<td class=\"px-6 py-4\"><span class=\"badge " + statusClass + "\">" + escapeHtml(statusLabel) + "</span></td>";
      tbody.appendChild(tr);
    });
    if (!tbody.__ieDashboardRecentBound) {
      tbody.addEventListener("click", function (event) {
        var link = event.target.closest("[data-action='dashboard-open-candidate']");
        if (!link) return;
        event.preventDefault();
        var id = link.getAttribute("data-id");
        if (!id) return;
        navigateTo("add-candidato.html?id=" + encodeURIComponent(id) + "&mode=view");
      });
      tbody.__ieDashboardRecentBound = true;
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
      p.textContent = "Nessun dato per sorgente.";
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
        "<div class=\"flex justify-between text-xs font-bold uppercase tracking-tighter\">" +
        "<span class=\"text-gray-500\">" + escapeHtml(label) + "</span>" +
        "<span class=\"text-[#1b4332]\">" + (item.percentage || 0) + "%</span>" +
        "</div>" +
        "<div class=\"w-full h-2 bg-gray-100 rounded-full overflow-hidden\">" +
        "<div class=\"h-full " + color + " rounded-full\" style=\"width:" + (item.percentage || 0) + "%\"></div>" +
        "</div>";
      container.appendChild(div);
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    var s = String(str);
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Unified entity row renderer (candidati, clienti, offerte, archiviati)
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

  function buildEntityActionsCell(opts) {
    var entityType = opts.entityType;
    var id = opts.id;
    var editUrl = opts.editUrl;
    var isArchived = !!opts.isArchived;
    var archivedList = !!opts.archivedList;
    var idAttr = id ? " data-id=\"" + escapeHtml(id) + "\"" : "";
    var entityAttr = " data-entity=\"" + escapeHtml(entityType) + "\"";
    var editUrlAttr = editUrl ? " data-edit-url=\"" + escapeHtml(editUrl) + "\"" : "";

    var html =
      '<div class="flex items-center justify-center space-x-2">' +
      '<button type="button" data-action="preview-entity"' + idAttr + entityAttr + ' class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">' + ENTITY_ROW_EYE_SVG + "</button>";
    if (!archivedList) {
      html += '<button type="button" data-action="edit-entity"' + idAttr + entityAttr + editUrlAttr + ' class="p-2 text-gray-400 hover:text-blue-500 transition" title="Edit">' + ENTITY_ROW_EDIT_SVG + "</button>";
      html += '<button type="button" data-action="archive-entity"' + idAttr + entityAttr + ' class="p-2 text-gray-400 hover:text-red-500 transition" title="' + (isArchived ? "Archiviato" : "Archivia") + '">' + ENTITY_ROW_ARCHIVE_SVG + "</button>";
    } else {
      html += '<button type="button" data-action="restore-entity"' + idAttr + entityAttr + ' class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>';
      html += '<button type="button" data-action="delete-entity-permanent"' + idAttr + entityAttr + ' class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>';
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
    tr.className = rowClass;
    if (id) tr.setAttribute("data-id", id);
    if (rowTitle) tr.title = rowTitle;

    var base = typeof derivePortalBasePath === "function" ? derivePortalBasePath() : "";
    if (options.basePath != null) base = options.basePath;

    var titleTd = document.createElement("td");
    titleTd.className = "px-6 py-4";
    var a = document.createElement("a");
    a.href = base + viewUrl;
    a.className = "cursor-pointer hover:underline font-semibold text-gray-800";
    a.setAttribute("data-entity-title-link", "true");
    a.textContent = title != null && title !== "" ? title : "—";
    titleTd.appendChild(a);

    leadingCells.forEach(function (cellHtml) {
      var td = document.createElement("td");
      td.className = "px-6 py-4";
      td.innerHTML = cellHtml;
      tr.appendChild(td);
    });
    tr.appendChild(titleTd);
    middleCells.forEach(function (cellHtml) {
      var td = document.createElement("td");
      td.className = "px-6 py-4";
      td.innerHTML = cellHtml;
      tr.appendChild(td);
    });
    var actionsTd = document.createElement("td");
    actionsTd.className = "px-6 py-4";
    var safeEditUrl = (editUrl != null && editUrl !== "") ? editUrl : null;
    actionsTd.innerHTML = buildEntityActionsCell({
      entityType: entityType,
      id: id,
      editUrl: safeEditUrl,
      isArchived: isArchived,
      archivedList: archivedList,
    });
    tr.appendChild(actionsTd);
    return tr;
  }

  function getDashboardCandidateStatusBadgeClass(status) {
    switch (status) {
      case "new": return "badge-new";
      case "interview": return "badge-interview";
      case "hired": return "badge-hired";
      case "rejected": return "badge-rejected";
      default: return "badge-new";
    }
  }

  function formatDashboardCandidateStatusLabel(status) {
    switch (status) {
      case "new": return "New";
      case "interview": return "Interview";
      case "hired": return "Hired";
      case "rejected": return "Rejected";
      default: return status ? String(status) : "New";
    }
  }

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
        ? "Mostrando 0 di 0 risultati"
        : "Mostrando " + currentRowCount + " di " + Number(totalCount).toLocaleString("it-IT") + " risultati";
    }
    if (pagesEl) {
      pagesEl.textContent = "Pagina " + page + " di " + totalPages;
    }
    if (prevBtn) {
      prevBtn.disabled = page <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = page >= totalPages || totalCount === 0;
    }
  }

  // Candidates list
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
        navigateTo("add-cliente.html?id=" + encodeURIComponent(id) + "&mode=view");
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
        renderCandidates();
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

    const paginationEl = document.querySelector("[data-ie-candidates-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");
    if (paginationEl) {
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage + 1); });
    }

    if (hasOfferFilter) {
      showOfferFilterBanner();
    }

    tbody.addEventListener("click", function (event) {
      const cvBtn = event.target.closest("[data-action='view-cv']");
      if (cvBtn) {
        const id = cvBtn.getAttribute("data-id");
        if (!id) return;
        const candidate = IE_STORE.candidates.find((c) => c.id === id);
        if (candidate && candidate.cv_url) {
          window.open(candidate.cv_url, "_blank", "noopener");
        } else {
          alert("Nessun CV caricato per questo candidato (simulazione).");
        }
      }
    });

    function mapCandidateRow(r) {
      const first_name = r.first_name ?? "";
      const last_name = r.last_name ?? "";
      return {
        id: r.id,
        first_name,
        last_name,
        position: r.position ?? "",
        address: r.address ?? "",
        status: r.status ?? "new",
        source: r.source ?? "",
        client_name: r.client_name || null,
        foto_url: r.photo_url || r.foto_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent((first_name || "") + "+" + (last_name || "")) + "&background=dbeafe&color=1e40af",
        created_at: r.created_at,
        is_archived: r.is_archived || false,
        latest_association: r.latest_association || null,
      };
    }

    function renderCandidates() {
      const paginationContainer = document.querySelector("[data-ie-candidates-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchCandidatesPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-gray-400\">Caricamento...</td></tr>";
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
          renderCandidateRows(rows);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
        }).catch(function (err) {
          console.error("[ItalianExperience] fetchCandidatesPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-red-500\">Errore nel caricamento. Riprova più tardi.</td></tr>";
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
        return;
      }

      fetchCandidates(filters).then((rows) => {
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
        const totalCount = rows.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        const start = (currentPage - 1) * limit;
        const pageRows = rows.slice(start, start + limit);
        renderCandidateRows(pageRows);
        updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
      });
    }

    function renderCandidateRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-gray-400\">Nessun candidato trovato.</td></tr>";
        return;
      }
      rows.forEach(function (row) {
        const clientName = findClientNameForCandidate(row);
        const latestAssoc = row.latest_association || null;
        const statusBadgeClass = getCandidateStatusBadgeClass(row.status);
        const sourceLabel = (row.source || "").toUpperCase();
        const createdDate = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "";
        let assignmentHtml;
        if (latestAssoc && latestAssoc.client_name) {
          if (latestAssoc.client_id) {
            assignmentHtml =
              '<a href="#" data-action="open-client-from-candidate" data-id="' +
              escapeHtml(String(latestAssoc.client_id)) +
              '" class="text-gray-800 font-medium cursor-pointer hover:underline">' +
              escapeHtml(latestAssoc.client_name) +
              "</a>";
          } else {
            assignmentHtml =
              '<div class="text-gray-800 font-medium">' +
              escapeHtml(latestAssoc.client_name) +
              "</div>";
          }
        } else {
          assignmentHtml =
            '<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Non assegnato</span>';
        }
        const photoHtml = '<img src="' + escapeHtml(row.foto_url || "") + '" class="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="' + escapeHtml((row.first_name || "") + " " + (row.last_name || "")) + '">';
        const viewCvHtml = '<button type="button" data-action="view-cv" data-id="' + escapeHtml(row.id) + '" class="text-[#c5a059] hover:bg-[#c5a059]/10 px-3 py-1.5 rounded-md border border-[#c5a059]/20 transition text-xs font-bold">View CV</button>';
        const tr = renderEntityRow({
          entityType: "candidate",
          id: row.id,
          viewUrl: "add-candidato.html?id=" + encodeURIComponent(row.id) + "&mode=view",
          editUrl: "add-candidato.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: [row.first_name, row.last_name].filter(Boolean).join(" ") || "—",
          isArchived: row.is_archived,
          archivedList: false,
          leadingCells: [photoHtml],
          middleCells: [
            (row.position || "—"),
            assignmentHtml,
            (row.address || "—"),
            '<span class="badge ' + statusBadgeClass + '">' + escapeHtml(formatCandidateStatusLabel(row.status)) + "</span>",
            '<span class="text-xs font-medium text-blue-600">' + escapeHtml(sourceLabel || "—") + "</span>",
            '<span class="text-gray-400">' + escapeHtml(createdDate) + "</span>",
            '<div class="text-center">' + viewCvHtml + "</div>",
          ],
          rowTitle: formatLastUpdatedMeta(row),
        });
        tbody.appendChild(tr);
      });
    }

    function findClientNameForCandidate(candidate) {
      if (candidate.latest_association && candidate.latest_association.client_name) {
        return candidate.latest_association.client_name;
      }
      if (candidate.client_name) return candidate.client_name;
      const assoc = IE_STORE.candidateJobAssociations.find(
        (a) => a.candidate_id === candidate.id
      );
      if (!assoc) return "—";
      const offer = IE_STORE.jobOffers.find((o) => o.id === assoc.job_offer_id);
      if (!offer) return "—";
      const client = IE_STORE.clients.find((c) => c.id === offer.client_id);
      return client ? client.name : "—";
    }

    renderCandidates();
  }

  // ---------------------------------------------------------------------------
  // Job offer quick preview modal (reusable across pages)
  // ---------------------------------------------------------------------------

  let JOB_OFFER_PREVIEW_MODAL = null;
  let JOB_OFFER_PREVIEW_PREV_OVERFLOW = "";

  function ensureJobOfferPreviewModal() {
    if (JOB_OFFER_PREVIEW_MODAL) return JOB_OFFER_PREVIEW_MODAL;

    const root = document.createElement("div");
    root.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");

    root.innerHTML = [
      '<div class="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">',
      '  <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">',
      '    <h2 class="text-lg font-semibold text-[#1b4332]" data-ie-joboffer-preview-title></h2>',
      '    <button type="button" data-ie-joboffer-preview-close class="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" aria-label="Close preview">',
      '      <span class="block text-xl leading-none">&times;</span>',
      "    </button>",
      "  </div>",
      '  <div class="px-6 py-4 space-y-3 text-sm">',
      '    <p class="text-gray-500" data-ie-joboffer-preview-loading>Caricamento offerta...</p>',
      '    <p class="text-sm text-red-500 hidden" data-ie-joboffer-preview-error></p>',
      '    <div class="space-y-2 hidden" data-ie-joboffer-preview-content>',
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Position</span>',
      '        <span class="text-gray-800 font-medium" data-ie-joboffer-preview-position></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Client</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-client></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Location</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-location></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Status</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-status></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Created</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-created></span>',
      "      </div>",
      "    </div>",
      "  </div>",
      '  <div class="px-6 py-4 bg-gray-50 flex items-center justify-end border-t border-gray-100">',
      '    <button type="button" data-ie-joboffer-preview-open-full class="px-4 py-2 rounded-lg bg-[#1b4332] text-white text-xs font-semibold tracking-widest uppercase hover:bg-[#1b4332]/90 transition shadow-sm">',
      "      Open Full Page",
      "    </button>",
      "  </div>",
      "</div>",
    ].join("");

    document.body.appendChild(root);

    const titleEl = root.querySelector("[data-ie-joboffer-preview-title]");
    const loadingEl = root.querySelector(
      "[data-ie-joboffer-preview-loading]"
    );
    const errorEl = root.querySelector("[data-ie-joboffer-preview-error]");
    const contentEl = root.querySelector(
      "[data-ie-joboffer-preview-content]"
    );
    const positionEl = root.querySelector(
      "[data-ie-joboffer-preview-position]"
    );
    const clientEl = root.querySelector("[data-ie-joboffer-preview-client]");
    const locationEl = root.querySelector(
      "[data-ie-joboffer-preview-location]"
    );
    const statusEl = root.querySelector("[data-ie-joboffer-preview-status]");
    const createdEl = root.querySelector("[data-ie-joboffer-preview-created]");
    const closeBtn = root.querySelector("[data-ie-joboffer-preview-close]");
    const openFullBtn = root.querySelector(
      "[data-ie-joboffer-preview-open-full]"
    );

    const state = {
      currentOfferId: null,
    };

    function setLoading(isLoading) {
      if (!loadingEl || !contentEl || !errorEl) return;
      if (isLoading) {
        loadingEl.classList.remove("hidden");
        contentEl.classList.add("hidden");
        errorEl.classList.add("hidden");
      } else {
        loadingEl.classList.add("hidden");
      }
    }

    function setError(message) {
      if (!errorEl || !contentEl || !loadingEl) return;
      loadingEl.classList.add("hidden");
      contentEl.classList.add("hidden");
      errorEl.textContent = message || "Errore nel caricamento dell'offerta.";
      errorEl.classList.remove("hidden");
    }

    function setData(offer) {
      if (!offer) {
        setError("Offerta non trovata.");
        return;
      }
      if (titleEl)
        titleEl.textContent = offer.title || "Job Offer";
      if (positionEl)
        positionEl.textContent = offer.position || "—";
      if (clientEl)
        clientEl.textContent = offer.client_name || "—";
      if (locationEl) {
        const location =
          offer.location ||
          [offer.city, offer.state]
            .filter(function (x) {
              return x;
            })
            .join(", ");
        locationEl.textContent = location || "—";
      }
      if (statusEl)
        statusEl.textContent = offer.status || "—";
      if (createdEl) {
        if (offer.created_at) {
          try {
            const d = new Date(offer.created_at);
            createdEl.textContent = d.toLocaleString("it-IT");
          } catch (_) {
            createdEl.textContent = offer.created_at;
          }
        } else {
          createdEl.textContent = "—";
        }
      }

      if (loadingEl) loadingEl.classList.add("hidden");
      if (errorEl) errorEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
    }

    function open() {
      JOB_OFFER_PREVIEW_PREV_OVERFLOW = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
      root.classList.remove("hidden");
    }

    function close() {
      root.classList.add("hidden");
      document.body.style.overflow = JOB_OFFER_PREVIEW_PREV_OVERFLOW || "";
    }

    root.addEventListener("click", function (event) {
      if (event.target === root) {
        close();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        close();
      });
    }

    if (openFullBtn) {
      openFullBtn.addEventListener("click", function () {
        if (!state.currentOfferId) return;
        close();
        navigateTo(
          "add-offerta.html?id=" +
            encodeURIComponent(state.currentOfferId) +
            "&mode=view"
        );
      });
    }

    JOB_OFFER_PREVIEW_MODAL = {
      root,
      state,
      setLoading,
      setError,
      setData,
      open,
      close,
    };

    return JOB_OFFER_PREVIEW_MODAL;
  }

  function openJobOfferPreviewModal(id) {
    if (!id) return;
    const modal = ensureJobOfferPreviewModal();
    modal.state.currentOfferId = id;
    modal.setLoading(true);
    modal.open();

    const api = window.IESupabase;
    if (!api || (!api.fetchJobOfferById && !api.getJobOfferById)) {
      modal.setError("Supabase non disponibile.");
      return;
    }

    const fetchById = api.fetchJobOfferById || api.getJobOfferById;

    fetchById(id)
      .then(function (result) {
        if (!result || result.error) {
          modal.setError(
            (result && result.error && result.error.message) ||
              "Offerta non trovata."
          );
          return;
        }
        modal.setData(result.data || null);
      })
      .catch(function (err) {
        console.error("[ItalianExperience] fetchJobOfferById error:", err);
        modal.setError("Errore nel caricamento dell'offerta.");
      });
  }

  // Job offers list
  function initJobOffersPage() {
    const tbody = document.querySelector("[data-ie-joboffers-body]");
    if (!tbody) return;

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

    // Populate client filter options from Supabase or store
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
      } else {
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

    const paginationEl = document.querySelector("[data-ie-joboffers-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");
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
        navigateTo("candidati.html?offer=" + encodeURIComponent(offerId));
        return;
      }

      const titleBtn = target.closest("[data-action='view-offer-full']");
      if (titleBtn) {
        const fullId =
          titleBtn.getAttribute("data-id") ||
          titleBtn.closest("tr")?.getAttribute("data-id");
        if (!fullId) return;
        navigateTo(
          "add-offerta.html?id=" + encodeURIComponent(fullId) + "&mode=view"
        );
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
      };
    }

    function renderOfferRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan=\"8\" class=\"px-6 py-8 text-center text-gray-400\">Nessuna offerta trovata.</td></tr>";
        return;
      }
      if (window.IESupabase) window.IE_ACTIVE_JOB_OFFER_ID = rows[0].id;
      rows.forEach(function (row) {
        const clientValue = row.client_name || "—";
        const locationValue = row.location || "—";
        const createdAtValue = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "—";
        const badgeClass = getOfferStatusBadgeClass(row.status);
        const statusLabel = formatOfferStatusLabel(row.status);
        const candidatesCount = typeof row.candidatesCount === "number" ? row.candidatesCount : 0;
        const candidatesCellHtml =
          candidatesCount > 0
            ? '<button type="button" data-action="view-offer-candidates" data-id="' +
              escapeHtml(row.id) +
              '" class="text-[#1b4332] font-semibold hover:underline">' +
              escapeHtml(String(candidatesCount)) +
              "</button>"
            : "0";
        const tr = renderEntityRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: "add-offerta.html?id=" + encodeURIComponent(row.id) + "&mode=view",
          editUrl: "add-offerta.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: row.title || "—",
          isArchived: row.is_archived,
          archivedList: false,
          leadingCells: [],
          middleCells: [
            '<span class="text-gray-600 font-medium">' + escapeHtml(row.position || "—") + "</span>",
            escapeHtml(clientValue),
            escapeHtml(locationValue),
            '<span class="badge ' + badgeClass + '">' + escapeHtml(statusLabel) + "</span>",
            candidatesCellHtml,
            '<span class="text-gray-400">' + escapeHtml(createdAtValue) + "</span>",
          ],
          rowTitle: formatLastUpdatedMeta(row),
        });
        tbody.appendChild(tr);
      });
    }

    function renderOffers() {
      const paginationContainer = document.querySelector("[data-ie-joboffers-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchJobOffersPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"8\" class=\"px-6 py-8 text-center text-gray-400\">Caricamento...</td></tr>";
        window.IESupabase.fetchJobOffersPaginated({
          filters,
          page: currentPage,
          limit,
        }).then(function (result) {
          const rows = (result.data || []).map(mapJobOfferRow);
          const totalCount = result.totalCount ?? 0;
          const totalPages = Math.max(1, Math.ceil(totalCount / limit));
          if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            renderOffers();
            return;
          }
          renderOfferRows(rows);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
          renderAssociationsForActiveOffer();
        }).catch(function (err) {
          console.error("[ItalianExperience] fetchJobOffersPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"8\" class=\"px-6 py-8 text-center text-red-500\">Errore nel caricamento. Riprova più tardi.</td></tr>";
          updatePaginationUI(paginationContainer, 0, 1, limit, 0);
        });
        return;
      }

      fetchJobOffers(filters).then(async (rows) => {
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
        const totalCount = rows.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        const start = (currentPage - 1) * limit;
        const pageRows = rows.slice(start, start + limit);
        renderOfferRows(pageRows);
        updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
        await renderAssociationsForActiveOffer();
      });
    }

    function getOfferStatusBadgeClass(status) {
      switch ((status || "").toString().toLowerCase()) {
        case "open":
        case "active":
          return "badge-open";
        case "inprogress":
          return "badge-inprogress";
        case "closed":
          return "badge-closed";
        default:
          return "badge-open";
      }
    }

    function formatOfferStatusLabel(status) {
      switch ((status || "").toString().toLowerCase()) {
        case "open":
          return "Open";
        case "active":
          return "Active";
        case "inprogress":
          return "In Progress";
        case "closed":
          return "Closed";
        default:
          return status || "Open";
      }
    }

    renderOffers();
  }

  // Clients list
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
        navigateTo("offerte.html?client=" + encodeURIComponent(clientId));
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
        // Loading state
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">
              Caricamento clienti...
            </td>
          </tr>
        `;
        window.IESupabase
          .fetchClientsPaginated({
            filters,
            page: currentPage,
            limit,
          })
          .then(function (result) {
            console.log("[ItalianExperience] fetchClientsPaginated result:", result);
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
                '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">Nessun cliente trovato.</td></tr>';
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
                  ? '<button type="button" data-action="view-client-offers" data-id="' + escapeHtml(row.id) + '" class="text-[#1b4332] font-semibold hover:underline">' + escapeHtml(String(activeOffersCount)) + "</button>"
                  : "0";

              const tr = renderEntityRow({
                entityType: "client",
                id: row.id,
                viewUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=view",
                editUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
                title: row.name || "—",
                isArchived: row.is_archived,
                archivedList: false,
                leadingCells: [],
                middleCells: [
                  escapeHtml(row.city || "—"),
                  activeOffersHtml,
                  escapeHtml(row.email || "—"),
                  escapeHtml(row.phone || "—"),
                ],
                rowTitle: formatLastUpdatedMeta(row),
              });
              tbody.appendChild(tr);
            });

            updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
          })
          .catch(function (err) {
            console.error("[ItalianExperience] fetchClientsPaginated error:", err);
            tbody.innerHTML =
              '<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-sm">Errore nel caricamento. Riprova più tardi.</td></tr>';
            updatePaginationUI(paginationContainer, 0, 1, limit, 0);
          });

        return;
      }

      // Fallback: local in-memory store with simple filtering (no server-side pagination)
      fetchClients(filters).then((rows) => {
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
        tbody.innerHTML = "";

        if (!rows.length) {
          tbody.innerHTML =
            '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">Nessun cliente trovato.</td></tr>';
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
          const activeOffersCount = (IE_STORE.jobOffers || []).filter(function (offer) {
            if (!offer || offer.is_archived) return false;
            if (offer.client_id !== row.id) return false;
            const status = offer.status || "";
            return status === "active" || status === "open" || status === "inprogress" || status === "in progress";
          }).length;
          const activeOffersHtml =
            activeOffersCount > 0
              ? '<button type="button" data-action="view-client-offers" data-id="' + escapeHtml(row.id) + '" class="text-[#1b4332] font-semibold hover:underline">' + escapeHtml(String(activeOffersCount)) + "</button>"
              : "0";

          const tr = renderEntityRow({
            entityType: "client",
            id: row.id,
            viewUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=view",
            editUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
            title: row.name || "—",
            isArchived: row.is_archived,
            archivedList: false,
            leadingCells: [],
            middleCells: [
              escapeHtml(row.city || "—"),
              activeOffersHtml,
              escapeHtml(row.email || "—"),
              escapeHtml(row.phone || "—"),
            ],
            rowTitle: formatLastUpdatedMeta(row),
          });
          tbody.appendChild(tr);
        });

        if (paginationContainer) {
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
        }
      });
    }

    renderClients();
  }

  // ---------------------------------------------------------------------------
  // Associations table rendering (job offers page)
  // ---------------------------------------------------------------------------

  async function renderAssociationsForActiveOffer() {
    const tbody = document.querySelector("[data-ie-associations-body]");
    if (!tbody) return;

    const firstOfferRow = document.querySelector("[data-ie-joboffers-body] tr");
    let activeOfferId = null;
    if (firstOfferRow) activeOfferId = firstOfferRow.getAttribute("data-id");
    if (!activeOfferId && IE_STORE.jobOffers.length) activeOfferId = IE_STORE.jobOffers[0].id;

    if (window.IESupabase && activeOfferId) {
      const { data: assocs } = await window.IESupabase.fetchAssociations({ job_offer_id: activeOfferId });
      const { data: candidates } = await window.IESupabase.fetchMyCandidates();
      const candidateMap = (candidates || []).reduce(function (acc, c) {
        acc[c.id] = c;
        return acc;
      }, {});
      tbody.innerHTML = "";
      (assocs || []).forEach(function (assoc) {
        const c = candidateMap[assoc.candidate_id];
        const fullName = c ? (c.first_name || "") + " " + (c.last_name || "") : "—";
        const positionLabel = c ? (c.position || "—") : "—";
        const tr = document.createElement("tr");
        tr.className = "table-row transition";
        tr.innerHTML =
          "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + fullName + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + positionLabel + "</td>" +
          "<td class=\"px-6 py-4\"><span class=\"badge " + getApplicationStatusBadgeClass(assoc.status) + "\">" + formatApplicationStatusLabel(assoc.status) + "</span></td>" +
          "<td class=\"px-6 py-4 text-gray-500 italic text-xs\">" + (assoc.notes || "—") + "</td>" +
          "<td class=\"px-6 py-4 text-center\"><button type=\"button\" class=\"text-red-500 hover:text-red-600 text-xs font-semibold uppercase tracking-widest\" data-action=\"remove-association\" data-id=\"" + (assoc.id || "") + "\">Remove</button></td>";
        tbody.appendChild(tr);
      });
      return;
    }

    if (!activeOfferId) return;
    const rows = IE_STORE.candidateJobAssociations.filter(
      (assoc) => assoc.job_offer_id === activeOfferId
    );
    tbody.innerHTML = "";
    rows.forEach((assoc) => {
      const candidate = IE_STORE.candidates.find((c) => c.id === assoc.candidate_id);
      if (!candidate) return;
      const tr = document.createElement("tr");
      tr.className = "table-row transition";
      const metaTitle = formatLastUpdatedMeta(assoc);
      if (metaTitle) tr.title = metaTitle;
      tr.innerHTML =
        "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + (candidate.first_name || "") + " " + (candidate.last_name || "") + "</td>" +
        "<td class=\"px-6 py-4 text-gray-600\">" + (candidate.posizione || "—") + "</td>" +
        "<td class=\"px-6 py-4\"><span class=\"badge " + getApplicationStatusBadgeClass(assoc.status) + "\">" + formatApplicationStatusLabel(assoc.status) + "</span></td>" +
        "<td class=\"px-6 py-4 text-gray-500 italic text-xs\">" + (assoc.notes || "—") + "</td>" +
        "<td class=\"px-6 py-4 text-center\"><button type=\"button\" class=\"text-red-500 hover:text-red-600 text-xs font-semibold uppercase tracking-widest\" data-action=\"remove-association\" data-id=\"" + assoc.id + "\">Remove</button></td>";
      tbody.appendChild(tr);
    });

    tbody.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-action='remove-association']");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;
      const confirmed = window.confirm("Vuoi rimuovere questa associazione candidato-offerta? (simulazione)");
      if (!confirmed) return;
      const idx = IE_STORE.candidateJobAssociations.findIndex((a) => a.id === id);
      if (idx >= 0) {
        IE_STORE.candidateJobAssociations.splice(idx, 1);
        renderAssociationsForActiveOffer();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Global event delegation for entity row actions (edit, archive, preview, restore, delete)
  // ---------------------------------------------------------------------------
  function openPreviewModal(entity, id) {
    if (!id) return;
    if (entity === "candidate") {
      const tr = document.querySelector("tr[data-id=\"" + id + "\"]");
      if (tr && typeof openCandidateDetailModalFromRow === "function") {
        openCandidateDetailModalFromRow(tr);
      } else {
        navigateTo("add-candidato.html?id=" + encodeURIComponent(id) + "&mode=view");
      }
      return;
    }
    if (entity === "job_offer") {
      if (typeof openJobOfferPreviewModal === "function") {
        openJobOfferPreviewModal(id);
      } else {
        navigateTo("add-offerta.html?id=" + encodeURIComponent(id) + "&mode=view");
      }
      return;
    }
    if (entity === "client") {
      navigateTo("add-cliente.html?id=" + encodeURIComponent(id) + "&mode=view");
    }
  }

  document.addEventListener("click", async function (e) {
    const actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;
    const entity = actionBtn.dataset.entity;

    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    // PREVIEW
    if (action === "preview-entity") {
      if (typeof openPreviewModal === "function") {
        openPreviewModal(entity, id);
      }
      return;
    }

    // EDIT
    if (action === "edit-entity") {
      if (actionBtn.dataset.editUrl) {
        navigateTo(actionBtn.dataset.editUrl);
      }
      return;
    }

    // ARCHIVE
    if (action === "archive-entity") {
      if (!window.IESupabase) return;

      if (entity === "candidate") {
        await window.IESupabase.archiveCandidate(id);
      }

      if (entity === "client") {
        await window.IESupabase.archiveClient(id);
      }

      if (entity === "job_offer") {
        await window.IESupabase.archiveJobOffer(id);
      }

      location.reload();
      return;
    }

    // RESTORE
    if (action === "restore-entity") {
      if (!window.IESupabase) return;

      if (entity === "candidate") {
        await window.IESupabase.unarchiveCandidate(id);
      }

      if (entity === "client") {
        await window.IESupabase.unarchiveClient(id);
      }

      if (entity === "job_offer") {
        await window.IESupabase.unarchiveJobOffer(id);
      }

      location.reload();
      return;
    }

    // DELETE PERMANENT
    if (action === "delete-entity-permanent") {
      if (!window.IESupabase) return;

      if (!confirm("Sei sicuro? Questa azione è irreversibile.")) return;

      const tableMap = {
        candidate: "candidates",
        client: "clients",
        job_offer: "job_offers"
      };

      await window.IESupabase.deletePermanentRecord({
        table: tableMap[entity],
        id: id
      });

      location.reload();
      return;
    }
  });

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.navigateTo = navigateTo;
  window.IEPortal.renderEntityRow = renderEntityRow;
})();
