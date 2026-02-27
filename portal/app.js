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
    const pageKey = getCurrentPageKey();

    // Protected pages: require Supabase auth (redirect to login if not authenticated)
    const protectedPages = ["dashboard", "candidati", "offerte", "clients", "clienti", "archiviati", "add-candidato", "add-offerta", "add-cliente", "profile"];
    const isProtected = protectedPages.indexOf(pageKey) !== -1;
    if (isProtected) {
      if (!window.IESupabase) {
        window.location.href = (derivePortalBasePath()) + "index.html";
        return;
      }
      try {
        const user = await window.IESupabase.requireAuth();
        if (!user) return;
        await loadCurrentUserProfile();
        initInactivityTimer();
      } catch (e) {
        window.location.href = (derivePortalBasePath()) + "index.html";
        return;
      }
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
      archiviati: ["archiviati"],
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
      else if (label.includes("candidati") || label.includes("candidate")) key = "candidati";
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
        navigateTo("add-offerta.html");
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
    const roleLabel = (IE_CURRENT_PROFILE && IE_CURRENT_PROFILE.role) ? String(IE_CURRENT_PROFILE.role) : "User";
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
        saveCandidate(formData);
      });
    }

    const jobOfferForm = scope.querySelector("#jobOfferForm");
    if (jobOfferForm && !jobOfferForm.dataset.ieBound) {
      jobOfferForm.dataset.ieBound = "true";
      jobOfferForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(jobOfferForm);
        saveJobOffer(formData);
      });
    }

    const clientForm = scope.querySelector("#clientForm");
    if (clientForm && !clientForm.dataset.ieBound) {
      clientForm.dataset.ieBound = "true";
      clientForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(clientForm);
        saveClient(formData);
      });
    }
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
                  return "<option value=\"" + (c.slug || c.id) + "\">" + (c.nome || "") + " " + (c.cognome || "") + " – " + (c.posizione || "") + "</option>";
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
   * Shape aligned with future Supabase tables.
   *
   * Candidate (candidati):
   * - id (local-only helper)
   * - nome, cognome, posizione, indirizzo
   * - status, note, fonte
   * - cv_url, foto_url
   * - created_at, updated_at, created_by, updated_by
   * - is_archived
   *
   * Job Offer (offerte):
   * - id (local-only helper)
   * - titolo_posizione, client_id, descrizione, paga, tipo_contratto,
   *   numero_posizioni, citta, stato, data_scadenza, stato_offerta
   * - created_at, updated_at, created_by, updated_by
   * - is_archived
   *
   * Client (clienti):
   * - id (local-only helper)
   * - nome, indirizzo, citta, stato, nazione, email, telefono, note
   * - created_at, updated_at, created_by, updated_by
   * - is_archived
   *
   * Candidate ⇄ Job Offer association (candidate_job_associations):
   * - id (local-only helper)
   * - candidate_id, job_offer_id
   * - status, notes
   * - created_at, updated_at, created_by, updated_by
   */

  const IE_STORE = createInitialInMemoryStore();

  function createInitialInMemoryStore() {
    const now = new Date().toISOString();
    const admin = "Matteo Di Noia";

    const clients = [
      {
        id: "client-grand-hotel-milano",
        nome: "Grand Hotel Milano",
        indirizzo: "Via Montenapoleone 1",
        citta: "Milano",
        stato: "MI",
        nazione: "IT",
        email: "hr@grandhotelmilano.it",
        telefono: "+39 02 1234 5678",
        note: "Hotel 5* lusso nel centro di Milano.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-ristorante-cracco",
        nome: "Ristorante Cracco",
        indirizzo: "Galleria Vittorio Emanuele II",
        citta: "Milano",
        stato: "MI",
        nazione: "IT",
        email: "hr@cracco.it",
        telefono: "+39 02 8765 4321",
        note: "Fine dining iconico a Milano.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-hotel-cipriani",
        nome: "Hotel Cipriani",
        indirizzo: "Giudecca 10",
        citta: "Venezia",
        stato: "VE",
        nazione: "IT",
        email: "talent@hotelcipriani.it",
        telefono: "+39 041 234 5678",
        note: "Hotel di riferimento nella laguna.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-pasticceria-marchesi",
        nome: "Pasticceria Marchesi",
        indirizzo: "Via Santa Maria alla Porta 11/a",
        citta: "Roma",
        stato: "RM",
        nazione: "IT",
        email: "hr@marchesi.it",
        telefono: "+39 06 9876 5432",
        note: "Pasticceria storica.",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "client-italian-luxury-villas",
        nome: "Italian Luxury Villas",
        indirizzo: "Via dei Colli 15",
        citta: "Firenze",
        stato: "FI",
        nazione: "IT",
        email: "careers@italianluxuryvillas.it",
        telefono: "+39 055 555 1234",
        note: "Gestione ville di lusso.",
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
        nome: "Alessandro",
        cognome: "Rossi",
        posizione: "Sommelier Senior",
        indirizzo: "Milano, IT",
        status: "new",
        note: "",
        fonte: "linkedin",
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
        nome: "Giulia",
        cognome: "Bianchi",
        posizione: "Chef de Rang",
        indirizzo: "Torino, IT",
        status: "hired",
        note: "",
        fonte: "website",
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
        nome: "Luca",
        cognome: "Moretti",
        posizione: "Maître d'Hôtel",
        indirizzo: "Venezia, IT",
        status: "interview",
        note: "",
        fonte: "email",
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
        nome: "Elena",
        cognome: "Martini",
        posizione: "Pastry Chef",
        indirizzo: "Roma, IT",
        status: "rejected",
        note: "",
        fonte: "facebook",
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
        nome: "Marco",
        cognome: "Villa",
        posizione: "Property Manager",
        indirizzo: "Firenze, IT",
        status: "new",
        note: "",
        fonte: "other",
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
        titolo_posizione: "Head Sommelier",
        client_id: "client-grand-hotel-milano",
        descrizione: "Responsabile della carta vini e del team di sommellerie.",
        paga: "€55.000 - €65.000",
        tipo_contratto: "Full-time",
        numero_posizioni: 1,
        citta: "Milano",
        stato: "MI",
        data_scadenza: "2024-06-30",
        stato_offerta: "open",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-executive-chef",
        titolo_posizione: "Executive Chef",
        client_id: "client-ristorante-cracco",
        descrizione: "Guida creativa della cucina e del team.",
        paga: "€70.000 - €85.000",
        tipo_contratto: "Full-time",
        numero_posizioni: 1,
        citta: "Milano",
        stato: "MI",
        data_scadenza: "2024-06-15",
        stato_offerta: "inprogress",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-property-manager",
        titolo_posizione: "Property Manager",
        client_id: "client-italian-luxury-villas",
        descrizione: "Gestione portafoglio ville di pregio.",
        paga: "€45.000 - €55.000",
        tipo_contratto: "Full-time",
        numero_posizioni: 1,
        citta: "Firenze",
        stato: "FI",
        data_scadenza: "2024-07-10",
        stato_offerta: "open",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-maitre",
        titolo_posizione: "Maître d'Hôtel",
        client_id: "client-hotel-cipriani",
        descrizione: "Coordinamento sala e accoglienza ospiti.",
        paga: "€50.000 - €60.000",
        tipo_contratto: "Full-time",
        numero_posizioni: 1,
        citta: "Venezia",
        stato: "VE",
        data_scadenza: "2024-05-01",
        stato_offerta: "closed",
        created_at: now,
        updated_at: now,
        created_by: admin,
        updated_by: admin,
        is_archived: false,
      },
      {
        id: "offer-pastry-chef",
        titolo_posizione: "Pastry Chef",
        client_id: "client-pasticceria-marchesi",
        descrizione: "Responsabile laboratorio pasticceria.",
        paga: "€40.000 - €50.000",
        tipo_contratto: "Full-time",
        numero_posizioni: 1,
        citta: "Roma",
        stato: "RM",
        data_scadenza: "2024-06-20",
        stato_offerta: "inprogress",
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

  async function loadCurrentUserProfile() {
    if (!window.IESupabase) return;
    const { data } = await window.IESupabase.getProfile();
    IE_CURRENT_PROFILE = data || null;
  }

  function getCurrentUserDisplayName() {
    if (IE_CURRENT_PROFILE) {
      const first = (IE_CURRENT_PROFILE.first_name || "").trim();
      const last = (IE_CURRENT_PROFILE.last_name || "").trim();
      if (first || last) return (first + " " + last).trim();
      if (IE_CURRENT_PROFILE.full_name) return IE_CURRENT_PROFILE.full_name;
      if (IE_CURRENT_PROFILE.email) return IE_CURRENT_PROFILE.email;
    }
    if (window.IESupabase) {
      try {
        const session = window.IESupabase.supabase?.auth?.getSession?.();
        if (session?.data?.session?.user?.email) return session.data.session.user.email;
      } catch (e) {}
    }
    return "User";
  }

  function getCurrentUserRole() {
    return (IE_CURRENT_PROFILE && IE_CURRENT_PROFILE.role) ? String(IE_CURRENT_PROFILE.role) : "User";
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
          nome: r.first_name || "",
          cognome: r.last_name || "",
          posizione: r.position || "",
          indirizzo: r.address || "",
          status: r.status || "new",
          note: r.notes || "",
          fonte: r.source || "",
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
          titolo_posizione: r.title || "",
          client_id: null,
          client_name: r.client_name || null,
          descrizione: r.description || "",
          citta: r.location || "",
          stato: "",
          stato_offerta: r.status || "open",
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
    const nome = (formData.get("nome") || "").toString().trim();
    const cognome = (formData.get("cognome") || "").toString().trim();
    const posizione = (formData.get("posizione") || "").toString().trim();
    const indirizzo = (formData.get("indirizzo") || "").toString().trim();
    const status = (formData.get("status") || "new").toString();
    const note = (formData.get("note") || "").toString();
    const fonte = (formData.get("fonte") || "").toString();
    // client_name: kept in form for display only; candidates table has no client_name (relationship via job_offers -> clients)

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertCandidate({
        first_name: nome,
        last_name: cognome,
        position: posizione,
        address: indirizzo,
        status: status,
        notes: note,
        source: fonte,
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
      nome: nome,
      cognome: cognome,
      posizione: posizione,
      indirizzo: indirizzo,
      status: status,
      note: note,
      fonte: fonte,
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
      (candidate.nome + "-" + candidate.cognome)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || candidate.id;

    IE_STORE.candidates.push(candidate);
    console.info("[ItalianExperience] saveCandidate() – in-memory:", candidate);
    alert("Candidato salvato con successo (simulazione)");
  }

  async function saveJobOffer(formData) {
    const title = (formData.get("titolo_posizione") || "").toString().trim();
    const position = (formData.get("position") || "").toString().trim();
    const client_name = (formData.get("client_name") || "").toString().trim();
    const location = (formData.get("location") || "").toString().trim();
    const description = (formData.get("descrizione") || "").toString();
    const requirements = (formData.get("requirements") || "").toString();
    const notes = (formData.get("notes") || "").toString();
    const status = (formData.get("stato_offerta") || "open").toString();

    if (window.IESupabase) {
      const { data, error } = await window.IESupabase.insertJobOffer({
        title: title,
        position: position,
        client_name: client_name || null,
        location: location || null,
        description: description || null,
        requirements: requirements || null,
        notes: notes || null,
        status: status,
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
    let clientId = null;
    if (client_name) {
      const existing = IE_STORE.clients.find(
        (c) => c.nome.toLowerCase() === client_name.toLowerCase()
      );
      if (existing) clientId = existing.id;
    }
    const jobOffer = {
      id: "offer-" + Math.random().toString(36).slice(2, 10),
      titolo_posizione: title,
      client_id: clientId,
      descrizione: description,
      paga: (formData.get("paga") || "").toString(),
      tipo_contratto: (formData.get("tipo_contratto") || "").toString(),
      numero_posizioni: parseInt(formData.get("numero_posizioni") || "1", 10) || 1,
      citta: location,
      stato: (formData.get("stato") || "").toString().trim(),
      data_scadenza: (formData.get("data_scadenza") || "").toString(),
      stato_offerta: status,
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
    const nome = (formData.get("nome") || "").toString().trim();
    const citta = (formData.get("citta") || "").toString().trim();
    const stato = (formData.get("stato") || "").toString().trim();
    const nazione = (formData.get("nazione") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const telefono = (formData.get("telefono") || "").toString().trim();
    const note = (formData.get("note") || "").toString();

    if (!nome) {
      if (window.IESupabase) window.IESupabase.showError("Il nome del cliente è obbligatorio.", "saveClient");
      else alert("Il nome del cliente è obbligatorio.");
      return;
    }

    if (window.IESupabase && window.IESupabase.insertClient) {
      const { data, error } = await window.IESupabase.insertClient({
        nome: nome,
        citta: citta || null,
        stato: stato || null,
        nazione: nazione || null,
        email: email || null,
        telefono: telefono || null,
        note: note || null,
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
      nome,
      citta: citta || null,
      stato: stato || null,
      nazione: nazione || null,
      email: email || null,
      telefono: telefono || null,
      note: note || null,
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
        const haystack = (item.nome + " " + item.cognome).toLowerCase();
        return haystack.includes(filters.name.toLowerCase());
      })
      .filter((item) => {
        if (!filters.position) return true;
        return (item.posizione || "")
          .toLowerCase()
          .includes(filters.position.toLowerCase());
      })
      .filter((item) => {
        if (!filters.address) return true;
        return (item.indirizzo || "")
          .toLowerCase()
          .includes(filters.address.toLowerCase());
      })
      .filter((item) => {
        if (!filters.status) return true;
        return item.status === filters.status;
      })
      .filter((item) => {
        if (!filters.source) return true;
        return item.fonte === filters.source;
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
        return (item.titolo_posizione || "")
          .toLowerCase()
          .includes(filters.title.toLowerCase());
      })
      .filter((item) => {
        if (!filters.clientId) return true;
        return item.client_id === filters.clientId;
      })
      .filter((item) => {
        if (!filters.city) return true;
        return (item.citta || "").toLowerCase().includes(filters.city.toLowerCase());
      })
      .filter((item) => {
        if (!filters.state) return true;
        return (item.stato || "").toLowerCase().includes(filters.state.toLowerCase());
      })
      .filter((item) => {
        if (!filters.contractType) return true;
        return (item.tipo_contratto || "") === filters.contractType;
      })
      .filter((item) => {
        if (!filters.offerStatus) return true;
        return (item.stato_offerta || "") === filters.offerStatus;
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
        return (item.nome || "").toLowerCase().includes(filters.name.toLowerCase());
      })
      .filter((item) => {
        if (!filters.city) return true;
        return (item.citta || "").toLowerCase().includes(filters.city.toLowerCase());
      })
      .filter((item) => {
        if (!filters.state) return true;
        return (item.stato || "").toLowerCase().includes(filters.state.toLowerCase());
      })
      .filter((item) => {
        if (!filters.country) return true;
        return (item.nazione || "")
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
      // Dashboard data is loaded by portal/dashboard/dashboard.js
      return;
    }
    if (pageKey === "candidati") {
      initCandidatesPage();
    } else if (pageKey === "offerte") {
      initJobOffersPage();
    } else if (pageKey === "clients") {
      initClientsPage();
    }
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
          nome: r.first_name || "",
          cognome: r.last_name || "",
          posizione: r.position || "",
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
      var createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("it-IT")
        : "";
      var statusClass = getDashboardCandidateStatusBadgeClass(row.status);
      var statusLabel = formatDashboardCandidateStatusLabel(row.status);
      tr.innerHTML =
        "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + escapeHtml((row.nome || "") + " " + (row.cognome || "").trim()) + "</td>" +
        "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(row.posizione || "—") + "</td>" +
        "<td class=\"px-6 py-4 text-gray-500 text-sm\">" + escapeHtml(createdDate) + "</td>" +
        "<td class=\"px-6 py-4\"><span class=\"badge " + statusClass + "\">" + escapeHtml(statusLabel) + "</span></td>";
      tbody.appendChild(tr);
    });
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

    const filters = {
      name: "",
      position: "",
      address: "",
      status: "",
      source: "",
      archived: "active",
    };
    let currentPage = 1;
    const limit = CANDIDATES_PAGE_SIZE;

    const nameInput = document.querySelector('[data-filter="candidate-name"]');
    const positionInput = document.querySelector('[data-filter="candidate-position"]');
    const addressInput = document.querySelector('[data-filter="candidate-address"]');
    const statusSelect = document.querySelector('[data-filter="candidate-status"]');
    const sourceSelect = document.querySelector('[data-filter="candidate-source"]');
    const archivedSelect = document.querySelector('[data-filter="candidate-archived"]');

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

    const paginationEl = document.querySelector("[data-ie-candidates-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");
    if (paginationEl) {
      const prevBtn = paginationEl.querySelector("[data-ie-pagination-prev]");
      const nextBtn = paginationEl.querySelector("[data-ie-pagination-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { if (!this.disabled) goToPage(currentPage + 1); });
    }

    tbody.addEventListener("click", function (event) {
      const viewBtn = event.target.closest("[data-action='view-candidate']");
      if (viewBtn) {
        const rowElement = viewBtn.closest("tr");
        if (rowElement) {
          openCandidateDetailModalFromRow(rowElement);
        }
        return;
      }

      const archiveBtn = event.target.closest("[data-action='archive-candidate']");
      if (archiveBtn) {
        const id = archiveBtn.getAttribute("data-id");
        if (!id) return;
        const confirmed = window.confirm(
          "Sei sicuro di voler archiviare questo candidato? Potrai vederlo nella vista 'Archived'."
        );
        if (!confirmed) return;
        archiveRecordById(IE_STORE.candidates, id);
        renderCandidates();
        return;
      }

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
      const nome = r.first_name ?? r.nome ?? "";
      const cognome = r.last_name ?? r.cognome ?? "";
      return {
        id: r.id,
        nome,
        cognome,
        posizione: r.position ?? r.posizione ?? "",
        indirizzo: r.address ?? r.indirizzo ?? "",
        status: r.status ?? "new",
        fonte: r.source ?? r.fonte ?? "",
        client_name: r.client_name || null,
        foto_url: r.photo_url || r.foto_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent((nome || "") + "+" + (cognome || "")) + "&background=dbeafe&color=1e40af",
        created_at: r.created_at,
        is_archived: r.is_archived || false,
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
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
        tr.setAttribute("data-id", row.id);
        const clientName = findClientNameForCandidate(row);
        const statusBadgeClass = getCandidateStatusBadgeClass(row.status);
        const sourceLabel = (row.fonte || "").toUpperCase();
        const createdDate = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "";
        const metaTitle = formatLastUpdatedMeta(row);
        if (metaTitle) tr.title = metaTitle;

        tr.innerHTML = `
            <td class="px-6 py-4">
              <img src="${row.foto_url || ""}" class="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="${row.nome} ${row.cognome}">
            </td>
            <td class="px-6 py-4 font-semibold text-gray-800">${row.nome} ${row.cognome}</td>
            <td class="px-6 py-4 text-gray-600">${row.posizione || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${clientName}</td>
            <td class="px-6 py-4 text-gray-500 italic">${row.indirizzo || "—"}</td>
            <td class="px-6 py-4"><span class="badge ${statusBadgeClass}">${formatCandidateStatusLabel(row.status)}</span></td>
            <td class="px-6 py-4 text-xs font-medium text-blue-600">${sourceLabel || "—"}</td>
            <td class="px-6 py-4 text-gray-400">${createdDate}</td>
            <td class="px-6 py-4 text-center">
              <button type="button" data-action="view-cv" data-id="${row.id}" class="text-[#c5a059] hover:bg-[#c5a059]/10 px-3 py-1.5 rounded-md border border-[#c5a059]/20 transition text-xs font-bold">
                View CV
              </button>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <button type="button" data-action="view-candidate" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
                <button type="button" class="p-2 text-gray-400 hover:text-blue-500 transition" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button type="button" data-action="archive-candidate" data-id="${row.id}" class="p-2 text-gray-400 hover:text-red-500 transition" title="${row.is_archived ? "Archived" : "Archive"}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </td>
          `;
        tbody.appendChild(tr);
      });
    }

    function findClientNameForCandidate(candidate) {
      if (candidate.client_name) return candidate.client_name;
      const assoc = IE_STORE.candidateJobAssociations.find(
        (a) => a.candidate_id === candidate.id
      );
      if (!assoc) return "—";
      const offer = IE_STORE.jobOffers.find((o) => o.id === assoc.job_offer_id);
      if (!offer) return "—";
      const client = IE_STORE.clients.find((c) => c.id === offer.client_id);
      return client ? client.nome : "—";
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

    renderCandidates();
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

    function goToPage(page) {
      currentPage = Math.max(1, page);
      renderOffers();
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
              opt.textContent = client.nome || "—";
              clientSelect.appendChild(opt);
            });
          })
          .catch(function () {});
      } else {
        IE_STORE.clients.forEach((client) => {
          if (client.is_archived) return;
          const opt = document.createElement("option");
          opt.value = client.id;
          opt.textContent = client.nome;
          clientSelect.appendChild(opt);
        });
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

    tbody.addEventListener("click", function (event) {
      const archiveBtn = event.target.closest("[data-action='archive-offer']");
      if (archiveBtn) {
        const id = archiveBtn.getAttribute("data-id");
        if (!id) return;
        const confirmed = window.confirm(
          "Sei sicuro di voler archiviare questa offerta? Potrai vederla nella vista 'Archived'."
        );
        if (!confirmed) return;
        archiveRecordById(IE_STORE.jobOffers, id);
        renderOffers();
      }
    });

    function mapJobOfferRow(r) {
      return {
        id: r.id,
        titolo_posizione: r.title ?? r.titolo_posizione ?? "",
        descrizione: r.description ?? r.descrizione ?? "",
        client_id: r.client_id ?? null,
        client_name: r.client_name ?? null,
        citta: r.location ?? r.citta ?? "",
        stato: r.state ?? r.stato ?? "",
        stato_offerta: r.status ?? r.stato_offerta ?? "open",
        created_at: r.created_at,
        is_archived: r.is_archived || false,
      };
    }

    function renderOfferRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan=\"7\" class=\"px-6 py-8 text-center text-gray-400\">Nessuna offerta trovata.</td></tr>";
        return;
      }
      if (window.IESupabase) window.IE_ACTIVE_JOB_OFFER_ID = rows[0].id;
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
        tr.setAttribute("data-id", row.id);

        const client = IE_STORE.clients.find((c) => c.id === row.client_id);
        const clientName = row.client_name || (client ? client.nome : "—");
        const location = row.citta && row.stato ? `${row.citta}, ${row.stato}` : (row.citta || row.stato || "—");
        const createdDate = row.created_at ? new Date(row.created_at).toLocaleDateString("it-IT") : "";
        const badgeClass = getOfferStatusBadgeClass(row.stato_offerta);
        const statusLabel = formatOfferStatusLabel(row.stato_offerta);
        const metaTitle = formatLastUpdatedMeta(row);
        if (metaTitle) tr.title = metaTitle;

        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-gray-800">${row.titolo_posizione}</td>
            <td class="px-6 py-4 text-gray-600 font-medium">${row.descrizione ? "Role" : "—"}</td>
            <td class="px-6 py-4 text-gray-600">${clientName}</td>
            <td class="px-6 py-4 text-gray-500 italic">${location}</td>
            <td class="px-6 py-4"><span class="badge ${badgeClass}">${statusLabel}</span></td>
            <td class="px-6 py-4 text-gray-400">${createdDate}</td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-center space-x-2">
                <button type="button" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
                <button type="button" class="p-2 text-gray-400 hover:text-blue-500 transition" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button type="button" data-action="archive-offer" data-id="${row.id}" class="p-2 text-gray-400 hover:text-red-500 transition" title="${row.is_archived ? "Archived" : "Archive"}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </td>
          `;
        tbody.appendChild(tr);
      });
    }

    function renderOffers() {
      const paginationContainer = document.querySelector("[data-ie-joboffers-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchJobOffersPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"7\" class=\"px-6 py-8 text-center text-gray-400\">Caricamento...</td></tr>";
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
          tbody.innerHTML = "<tr><td colspan=\"7\" class=\"px-6 py-8 text-center text-red-500\">Errore nel caricamento. Riprova più tardi.</td></tr>";
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
      switch (status) {
        case "open":
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
      switch (status) {
        case "open":
          return "Open";
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
      const archiveBtn = event.target.closest("[data-action='archive-client']");
      if (archiveBtn) {
        const id = archiveBtn.getAttribute("data-id");
        if (!id) return;
        const confirmed = window.confirm(
          "Sei sicuro di voler archiviare questo cliente? Potrai vederlo nella vista 'Archived'."
        );
        if (!confirmed) return;
        if (typeof archiveRecordById === "function" && IE_STORE && IE_STORE.clients) {
          archiveRecordById(IE_STORE.clients, id);
          renderClients();
        }
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
              const tr = document.createElement("tr");
              tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
              tr.setAttribute("data-id", row.id);

              const metaTitle = formatLastUpdatedMeta(row);
              if (metaTitle) tr.title = metaTitle;

              tr.innerHTML = `
                <td class="px-6 py-4 font-semibold text-gray-800">${row.nome || "—"}</td>
                <td class="px-6 py-4 text-gray-600">${row.citta || "—"}</td>
                <td class="px-6 py-4 text-gray-600">${row.stato || "—"}</td>
                <td class="px-6 py-4 text-gray-600">${row.email || "—"}</td>
                <td class="px-6 py-4 text-gray-600">${row.telefono || "—"}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center space-x-2">
                    <button type="button" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button type="button" class="p-2 text-gray-400 hover:text-blue-500 transition" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button type="button" data-action="archive-client" data-id="${
                      row.id
                    }" class="p-2 text-gray-400 hover:text-red-500 transition" title="${
                row.is_archived ? "Archived" : "Archive"
              }">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              `;

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

        pageRows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
          tr.setAttribute("data-id", row.id);

          tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-gray-800">${row.nome}</td>
            <td class="px-6 py-4 text-gray-600">${row.citta || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${row.stato || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${row.email || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${row.telefono || "—"}</td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-center space-x-2">
                <button type="button" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
                <button type="button" class="p-2 text-gray-400 hover:text-blue-500 transition" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button type="button" data-action="archive-client" data-id="${
                  row.id
                }" class="p-2 text-gray-400 hover:text-red-500 transition" title="${
            row.is_archived ? "Archived" : "Archive"
          }">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </td>
          `;

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
        const nome = c ? (c.first_name || "") + " " + (c.last_name || "") : "—";
        const posizione = c ? (c.position || "—") : "—";
        const tr = document.createElement("tr");
        tr.className = "table-row transition";
        tr.innerHTML =
          "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + nome + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + posizione + "</td>" +
          "<td class=\"px-6 py-4\"><span class=\"badge " + getCandidateStatusBadgeClass(assoc.status) + "\">" + formatCandidateStatusLabel(assoc.status) + "</span></td>" +
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
        "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + candidate.nome + " " + candidate.cognome + "</td>" +
        "<td class=\"px-6 py-4 text-gray-600\">" + (candidate.posizione || "—") + "</td>" +
        "<td class=\"px-6 py-4\"><span class=\"badge " + getCandidateStatusBadgeClass(assoc.status) + "\">" + formatCandidateStatusLabel(assoc.status) + "</span></td>" +
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
})();

