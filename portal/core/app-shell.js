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

  // All pages that require authentication. Guard runs before any data/UI logic.
  var PROTECTED_PAGES = [
    "candidate",
    "dashboard",
    "candidates",
    "clients",
    "job-offers",
    "applications",
    "profile",
    "archived",
    "add-candidate",
    "add-job-offer",
    "add-client",
    "settings",
    "sidebar",
  ];

  var pageKey = getCurrentPageKey();
  var pendingCandidateTempId = null;
  var pendingCandidatePhotoPath = null;
  var pendingCandidateCvPath = null;
  var CANDIDATE_PHOTO_SIGNED_URLS = {};

  async function ensureSupabaseSessionReady() {
    if (!window.IESupabase) {
      return;
    }

    try {
      if (typeof window.IESupabase.getSession === "function") {
        await window.IESupabase.getSession();
        return;
      }

      var supabaseClient = window.IESupabase.supabase;
      if (
        supabaseClient &&
        supabaseClient.auth &&
        typeof supabaseClient.auth.getSession === "function"
      ) {
        await supabaseClient.auth.getSession();
      }
    } catch (err) {
      console.error(
        "[ItalianExperience] ensureSupabaseSessionReady failed:",
        err
      );
    }
  }

  function getCandidateDefaultAvatar(firstName, lastName) {
    var first = firstName || "";
    var last = lastName || "";
    var full = (first + " " + last).trim() || "Candidato";
    return (
      "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(full.replace(/\s+/g, "+")) +
      "&background=1b4332&color=fff"
    );
  }
  function redirectToLoginFailsafe() {
    if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
      window.IEAuth.redirectToLogin();
      return;
    }
    if (window.IESupabase && typeof window.IESupabase.redirectToLogin === "function") {
      window.IESupabase.redirectToLogin();
      return;
    }
    var base = "";
    try {
      base = new URL(".", window.location.href).href;
    } catch (e) {}
    window.location.href = base + "index.html";
  }

  var isProtectedPage = PROTECTED_PAGES.indexOf(pageKey) !== -1;
  if (isProtectedPage) {
    window.__IE_AUTH_GUARD__ = (async function () {
      if (!window.IEAuth || typeof window.IEAuth.checkAuth !== "function") {
        redirectToLoginFailsafe();
        return false;
      }
      if (!window.IESupabase) {
        redirectToLoginFailsafe();
        return false;
      }

      try {
        await ensureSupabaseSessionReady();
      } catch (err) {
        if (typeof window.debugLog === "function") {
          window.debugLog("[ItalianExperience] Auth bootstrap failed", err);
        }
        redirectToLoginFailsafe();
        return false;
      }

      var user = await window.IEAuth.checkAuth();
      if (!user) {
        redirectToLoginFailsafe();
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
  // e.g. Safari / local file://, or when layout/sidebar.html cannot be loaded).
  // Ensures navigation and logout remain available when the fragment fetch fails.
  // IMPORTANT: keep in sync with portal/layout/sidebar.html.
  // ---------------------------------------------------------------------------

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
      .then(async function () {
        if (isProtectedPage && window.IEAuth && typeof window.IEAuth.checkAuth === "function") {
          var user = await window.IEAuth.checkAuth();
          if (!user) return;
        }
        initLayout();
        initNavigation();
        initBackButton();
        initButtons();
        initForms();
        initDataViews();
        initLogoutLink();
        ensureHeaderAvatarLinksToProfile();
        updateHeaderUserBlock();
      })
      .catch(async function (error) {
        if (typeof window.debugLog === "function") {
          window.debugLog("[ItalianExperience] Sidebar loading failed", error);
        }
        if (isProtectedPage && window.IEAuth && typeof window.IEAuth.checkAuth === "function") {
          var user = await window.IEAuth.checkAuth();
          if (!user) return;
        }
        initBackButton();
        initButtons();
        initForms();
        initDataViews();
        initLogoutLink();
        ensureHeaderAvatarLinksToProfile();
        updateHeaderUserBlock();
      });
  });

  function ensurePendingCandidateTempId() {
    if (pendingCandidateTempId) {
      return pendingCandidateTempId;
    }
    var id = null;
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        id = window.crypto.randomUUID();
      }
    } catch (e) {
    }
    if (!id) {
      id = "tmp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }
    pendingCandidateTempId = id;
    return pendingCandidateTempId;
  }

  // ---------------------------------------------------------------------------
  // Layout & Sidebar
  // ---------------------------------------------------------------------------

  function initBackButton() {
    var backButtons = document.querySelectorAll("[data-back-button]");
    if (!backButtons || backButtons.length === 0) return;

    backButtons.forEach(function (backButton) {
      var pageKey = getCurrentPageKey();
      var listingPages = ["dashboard", "candidates", "job-offers", "applications", "clients", "archived"];
      var searchParams = new URLSearchParams(window.location.search || "");
      var hasIdParam = searchParams.has("id");

      var shouldShowBackButton;
      if (pageKey === "profile") {
        shouldShowBackButton = true;
      } else if (hasIdParam) {
        shouldShowBackButton = true;
      } else if (listingPages.indexOf(pageKey) !== -1) {
        shouldShowBackButton = false;
      } else {
        shouldShowBackButton = true;
      }

      backButton.style.display = shouldShowBackButton ? "" : "none";

      backButton.addEventListener("click", function (event) {
        event.preventDefault();

        var defaultHref = backButton.getAttribute("href") || "dashboard.html";

        var path = window.location.pathname || "";
        var lastSegment = path.split("/").filter(Boolean).pop() || "";

        var targetPath = (function () {
          // Entity detail & editor pages should always go back to their listing.
          if (pageKey === "add-candidate" || lastSegment.indexOf("candidate") !== -1) {
            return "candidates.html";
          }
          if (pageKey === "add-client" || lastSegment.indexOf("client") !== -1) {
            return "clients.html";
          }
          if (pageKey === "add-job-offer" || lastSegment.indexOf("job-offer") !== -1) {
            return "job-offers.html";
          }

          if (pageKey === "candidates") return "candidates.html";
          if (pageKey === "clients") return "clients.html";
          if (pageKey === "job-offers") return "job-offers.html";
          if (pageKey === "applications") return "applications.html";
          if (pageKey === "archived") return "archived.html";
          if (pageKey === "dashboard") return "dashboard.html";

          return defaultHref.replace(/^\.\//, "");
        })();

        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(targetPath);
        } else {
          window.location.assign(targetPath);
        }
      });
    });
  }

  function ensureSidebarLoaded() {
    const container = document.getElementById("sidebar");
    if (!container) {
      return Promise.resolve();
    }

    // Se la sidebar è già presente (ad es. markup statico), non fare nulla.
    // Il markup sorgente deve comunque provenire da `portal/sidebar.html`.
    if (container.children.length && container.querySelector(".sidebar")) {
      return Promise.resolve();
    }

    const base = IERouter.derivePortalBasePath();
    const url = base + "layout/sidebar.html";

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
        if (typeof window.debugLog === "function") {
          window.debugLog("[ItalianExperience] Unable to load sidebar fragment", error);
        }
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
      if (btn.__ieSidebarToggleBound) return;
      btn.__ieSidebarToggleBound = true;
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

  function getDefaultTitle() {
    var key = getCurrentPageKey();
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
    var key = getCurrentPageKey();
    var subtitles = {
      dashboard: "Overview of your recruitment activity and key metrics.",
      candidates: "Manage and track talent in your exclusive network.",
      clients: "Manage your network of companies and partners.",
      "job-offers": "Manage open positions for clients in your network.",
      applications: "All candidate applications.",
      archived: "Review archived candidates, job offers, and clients.",
      profile: "Manage your personal information and your role in the portal.",
      "add-candidate": "Fill in the fields below to add a new candidate to the database.",
      "add-job-offer": "Define the parameters for the new hiring search.",
      "add-client": "Enter the company or partner details.",
      candidate: "View and manage candidate details.",
    };
    return subtitles[key] || "";
  }

  function normalizeBreadcrumbSegment(seg) {
    if (!seg || !seg.label) return null;
    if (seg.path) return { label: seg.label, path: seg.path };
    var pathMap = {
      dashboard: "dashboard.html",
      candidates: "candidates.html",
      clients: "clients.html",
      "job-offers": "job-offers.html",
      applications: "applications.html",
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

  function mountPageHeader() {
    var meta = window.pageMeta;
    var headerPageInfo = document.getElementById("portal-header-page-info");
    if (!headerPageInfo) return;
    if (typeof renderHeaderPageInfo !== "function") return;
    var effectiveMeta = {
      title: (meta && meta.title) || getDefaultTitle(),
      subtitle: (meta && meta.subtitle) || getDefaultSubtitle(),
      breadcrumbs: (meta && Array.isArray(meta.breadcrumbs) && meta.breadcrumbs.length) ? meta.breadcrumbs : getDefaultBreadcrumbs(),
    };
    headerPageInfo.innerHTML = renderHeaderPageInfo(effectiveMeta);
    var segments = Array.isArray(effectiveMeta.breadcrumbs) && effectiveMeta.breadcrumbs.length
      ? normalizeBreadcrumbs(effectiveMeta.breadcrumbs)
      : getDefaultBreadcrumbs();
    setPageBreadcrumbs(segments);
  }

  document.addEventListener("ie:header-loaded", function () {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      initLayout();
    }
    mountPageHeader();
  });

  function getDefaultBreadcrumbs() {
    var key = getCurrentPageKey();
    var dashboard = { label: "Dashboard", path: "dashboard.html" };
    switch (key) {
      case "dashboard":
        return [{ label: "Dashboard" }];
      case "candidates":
        return [dashboard, { label: "Candidates" }];
      case "clients":
        return [dashboard, { label: "Clients" }];
      case "job-offers":
        return [dashboard, { label: "Job Offers" }];
      case "applications":
        return [dashboard, { label: "Applications" }];
      case "archived":
        return [dashboard, { label: "Archived" }];
      case "add-candidate":
        return [dashboard, { label: "Candidates", path: "candidates.html" }, { label: "Add Candidate" }];
      case "add-job-offer":
        return [dashboard, { label: "Job Offers", path: "job-offers.html" }, { label: "Create Job Offer" }];
      case "add-client":
        return [dashboard, { label: "Clients", path: "clients.html" }, { label: "Add Client" }];
      case "profile":
        return [dashboard, { label: "Profile" }];
      case "candidate":
        return [dashboard, { label: "Candidates", path: "candidates.html" }, { label: "Candidate" }];
      default:
        return [{ label: "Dashboard", path: "dashboard.html" }];
    }
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
      if (s.path && window.IERouter && typeof window.IERouter.navigateTo === "function") {
        var path = s.path;
        parts.push('<a class="breadcrumb-link" onclick="event.preventDefault(); IERouter.navigateTo(\'' + path.replace(/'/g, "\\'") + '\')" href="#">' + escapeHtml(s.label) + "</a>");
      } else {
        parts.push('<span class="breadcrumb-current">' + escapeHtml(s.label) + "</span>");
      }
    });
    el.innerHTML = parts.join("");
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
      case "candidates.html":
        return "candidates";
      case "job-offers.html":
        return "job-offers";
      case "applications.html":
        return "applications";
      case "clients.html":
        return "clients";
      case "archived.html":
        return "archived";
      case "add-candidate.html":
        return "add-candidate";
      case "add-job-offer.html":
        return "add-job-offer";
      case "add-client.html":
        return "add-client";
      case "profile.html":
      case "profile.htm":
        return "profile";
      case "settings.html":
      case "settings.htm":
        return "settings";
      case "candidate.html":
        return "candidate";
      case "index.html":
      case "":
        return "login";
      default:
        // Fallback: try to infer from segment without extension
        if (lastSegment.includes("dashboard")) return "dashboard";
        if (lastSegment.includes("candidates")) return "candidates";
        if (lastSegment.includes("job-offers")) return "job-offers";
        if (lastSegment.includes("applications")) return "applications";
        if (lastSegment.includes("archived")) return "archived";
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
      candidates: ["candidates", "candidate"],
      "job-offers": ["job offers", "job offer"],
      clients: ["clients"],
      archived: ["archived"],
      profile: ["impostazioni", "profilo", "settings"],
    };

    const targetSection = (function () {
      if (currentKey === "add-candidate") return "candidates";
      if (currentKey === "add-job-offer") return "job-offers";
      if (currentKey === "add-client") return "clients";
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
    const base = IERouter.derivePortalBasePath();
    const routeMapByLabel = {
      dashboard: "dashboard.html",
      candidates: "candidates.html",
      "job-offers": "job-offers.html",
      clients: "clients.html",
      archived: "archived.html",
      impostazioni: "profile.html",
      profilo: "profile.html",
      settings: "profile.html",
    };

    const links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();

      let key = null;
      if (label.includes("dashboard")) key = "dashboard";
      else if (label.includes("candidates") || label.includes("candidate")) key = "candidates";
      else if (label.includes("job offers") || label.includes("job offer")) key = "job-offers";
      else if (label.includes("clients")) key = "clients";
      else if (label.includes("archived")) key = "archived";
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
        IERouter.navigateTo("add-candidate.html");
      });
    }

    const addOfferBtn =
      document.querySelector('[data-action="add-job-offer"]') ||
      document.querySelector('[data-action="add-offer"]') ||
      findButtonByText("create new job offer");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("add-job-offer.html?mode=create");
      });
    }

    const addClientBtn = document.querySelector('[data-action="add-client"]');
    if (addClientBtn) {
      addClientBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("add-client.html");
      });
    }

    // "Vedi Tutti" button on dashboard -> candidates listing
    const viewAllCandidatesBtn =
      document.querySelector('[data-action="view-all-candidates"]') ||
      findButtonByText("vedi tutti");
    if (viewAllCandidatesBtn) {
      viewAllCandidatesBtn.addEventListener("click", function (event) {
        event.preventDefault();
        IERouter.navigateTo("candidates.html");
      });
    }

  }

  // ---------------------------------------------------------------------------
  // Inactivity logout (protected pages only)
  // ---------------------------------------------------------------------------
  function initInactivityTimer() {
    if (
      window.IEPortal &&
      window.IEPortal.session &&
      typeof window.IEPortal.session.initInactivityTimer === "function"
    ) {
      window.IEPortal.session.initInactivityTimer();
    }
  }

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.clearSessionState = function () {
    IE_CURRENT_PROFILE = null;
    if (typeof window !== "undefined") window.__IE_AUTH_USER__ = null;
  };

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
      if (!window.IEAuth) return;
      e.preventDefault();
      await window.IEAuth.logout();
      if (window.IEPortal && typeof window.IEPortal.clearSessionState === "function") {
        window.IEPortal.clearSessionState();
      }
      window.__IE_AUTH_USER__ = null;
      window.IEAuth.redirectToLogin();
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
    initEditToolbars();
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
        if (
          getCurrentPageKey() === "add-candidate" &&
          candidateId &&
          window.IESupabase &&
          window.IESupabase.updateCandidate
        ) {
          updateCandidateFromForm(candidateId, formData, candidateForm);
          return;
        }
        saveCandidate(formData, candidateForm);
      });
      const cancelBtn = candidateForm.querySelector("[data-edit-cancel]");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          const params = new URLSearchParams(window.location.search);
          const id = params.get("id");
          if (id) {
            IERouter.redirectToEntityView("candidate", id);
        } else {
          IERouter.navigateTo("candidates.html");
        }
        });
      }

      const cvInput = candidateForm.querySelector('input[name="cv_file"]');
      const photoInput = candidateForm.querySelector('input[name="foto_file"]');

      if (cvInput && cvInput.dataset.ieBoundFile !== "true") {
        cvInput.dataset.ieBoundFile = "true";
        cvInput.addEventListener("change", function () {
          handleCandidateFileChange({
            input: cvInput,
            type: "cv",
          }).catch(function (err) {
            console.error("[ItalianExperience] handleCandidateFileChange (cv) failed:", err);
          });
        });
      }

      if (photoInput && photoInput.dataset.ieBoundFile !== "true") {
        photoInput.dataset.ieBoundFile = "true";
        photoInput.addEventListener("change", function () {
          handleCandidateFileChange({
            input: photoInput,
            type: "photo",
          }).catch(function (err) {
            console.error("[ItalianExperience] handleCandidateFileChange (photo) failed:", err);
          });
        });
      }

      if (typeof renderCandidateFileState === "function") {
        renderCandidateFileState("cv", null, "edit");
        renderCandidateFileState("photo", null, "edit");
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
        if (pageKey === "add-job-offer") {
          const params = IERouter.getJobOfferPageParams();
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
        if (getCurrentPageKey() === "add-client" && clientId && window.IESupabase && window.IESupabase.updateClient) {
          updateClientFromForm(clientId, formData);
          return;
        }
        saveClient(formData);
      });
      const cancelBtn = clientForm.querySelector("[data-edit-cancel]");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          const params = new URLSearchParams(window.location.search);
          const id = params.get("id");
          if (id) {
            IERouter.redirectToEntityView("client", id);
        } else {
          IERouter.navigateTo("clients.html");
        }
        });
      }
    }
  }

  function initEditToolbars() {
    const toolbars = document.querySelectorAll(".portal-toolbar");
    if (!toolbars || toolbars.length === 0) return;

    toolbars.forEach(function (toolbar) {
      var entityIndicator = toolbar.querySelector("[data-entity-mode-indicator]");
      var cancelBtnCandidate = toolbar.querySelector("[data-toolbar-cancel='candidate']");
      var saveBtnCandidate = toolbar.querySelector("[data-toolbar-save='candidate']");
      var cancelBtnClient = toolbar.querySelector("[data-toolbar-cancel='client']");
      var saveBtnClient = toolbar.querySelector("[data-toolbar-save='client']");
      var cancelBtnJob = toolbar.querySelector("[data-toolbar-cancel='job-offer']");
      var saveBtnJob = toolbar.querySelector("[data-toolbar-save='job-offer']");

      // Mode indicator
      if (entityIndicator) {
        var type = entityIndicator.getAttribute("data-entity-mode-indicator");
        var params = new URLSearchParams(window.location.search);
        var state = IERouter.resolveEntityPageState(params);
        var mode = state.mode;
        var hasId = !!state.id;

        var text = "";
        if (mode === "edit" && hasId) {
          if (type === "candidate") text = "Editing Candidate";
          else if (type === "client") text = "Editing Client";
          else if (type === "job-offer") text = "Editing Job Offer";
        } else if (mode === "create" && !hasId) {
          if (type === "candidate") text = "Creating Candidate";
          else if (type === "client") text = "Creating Client";
          else if (type === "job-offer") text = "Creating Job Offer";
        }

        if (text) {
          entityIndicator.textContent = text;
        } else {
          entityIndicator.style.display = "none";
        }
      }

      // Delegate toolbar buttons to form controls
      if (cancelBtnCandidate || saveBtnCandidate) {
        var candidateForm = document.querySelector("#candidateForm");
        if (candidateForm) {
          var formCancel = candidateForm.querySelector("[data-edit-cancel]");
          var formSave = candidateForm.querySelector('button[type="submit"]');
          if (cancelBtnCandidate && formCancel) {
            cancelBtnCandidate.addEventListener("click", function () {
              formCancel.click();
            });
          }
          if (saveBtnCandidate && formSave) {
            saveBtnCandidate.addEventListener("click", function () {
              if (typeof candidateForm.requestSubmit === "function") {
                candidateForm.requestSubmit();
              } else {
                formSave.click();
              }
            });
          }
        }
      }

      if (cancelBtnClient || saveBtnClient) {
        var clientForm = document.querySelector("#clientForm");
        if (clientForm) {
          var clientCancel = clientForm.querySelector("[data-edit-cancel]");
          var clientSave = clientForm.querySelector('button[type="submit"]');
          if (cancelBtnClient && clientCancel) {
            cancelBtnClient.addEventListener("click", function () {
              clientCancel.click();
            });
          }
          if (saveBtnClient && clientSave) {
            saveBtnClient.addEventListener("click", function () {
              if (typeof clientForm.requestSubmit === "function") {
                clientForm.requestSubmit();
              } else {
                clientSave.click();
              }
            });
          }
        }
      }

      if (cancelBtnJob || saveBtnJob) {
        var jobOfferForm = document.querySelector("#jobOfferForm");
        if (jobOfferForm) {
          var jobCancel = jobOfferForm.querySelector("button[type='button']");
          var jobSave = jobOfferForm.querySelector('button[type="submit"]');
          if (cancelBtnJob && jobCancel) {
            cancelBtnJob.addEventListener("click", function () {
              jobCancel.click();
            });
          }
          if (saveBtnJob && jobSave) {
            saveBtnJob.addEventListener("click", function () {
              if (typeof jobOfferForm.requestSubmit === "function") {
                jobOfferForm.requestSubmit();
              } else {
                jobSave.click();
              }
            });
          }
        }
      }
    });
  }

  function renderCandidateFileState(type, candidate, mode) {
    var section = document.getElementById("candidateDocumentsSection");
    if (!section) return;
    var block = section.querySelector('.candidate-file-block[data-file-type="' + type + '"]');
    if (!block) return;

    var stateEl = block.querySelector(".file-state");
    var actionsEl = block.querySelector(".file-actions");
    var input =
      type === "photo"
        ? block.querySelector('input[name="foto_file"]')
        : block.querySelector('input[name="cv_file"]');

    if (!stateEl || !actionsEl || !input) return;

    var hasCandidate = !!candidate;
    var path = "";
    if (hasCandidate) {
      if (type === "photo") {
        path = candidate.photo_url || "";
      } else {
        path = candidate.cv_url || "";
      }
    }
    if (!path && input.dataset && input.dataset.currentPath) {
      path = input.dataset.currentPath;
    }

    var hasFile = !!path;
    actionsEl.innerHTML = "";

    var isView = mode === "view";
    if (isView) {
      input.disabled = true;
      input.classList.add("hidden");
    } else {
      input.disabled = false;
    }

    if (type === "photo") {
      stateEl.textContent = hasFile ? "Photo uploaded" : "No photo uploaded";
    } else {
      stateEl.textContent = hasFile ? "CV uploaded" : "No CV uploaded";
    }

    function createButton(label, variant) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.className =
        "ie-btn " +
        (variant === "primary" ? "ie-btn-primary" : variant === "danger" ? "ie-btn-danger" : "ie-btn-secondary");
      return btn;
    }

    function resolvePath() {
      var p = path;
      if (!p && input.dataset && input.dataset.currentPath) {
        p = input.dataset.currentPath;
      }
      return p || "";
    }

    function handleDownload() {
      var p = resolvePath();
      if (!p) return;
      if (window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        window.IESupabase
          .createSignedCandidateUrl(p)
          .then(function (signedUrl) {
            var url = signedUrl || p;
            window.open(url, "_blank", "noopener");
          })
          .catch(function () {
            window.open(p, "_blank", "noopener");
          });
      } else {
        window.open(p, "_blank", "noopener");
      }
    }

    function handlePreview() {
      var p = resolvePath();
      if (!p) return;
      if (type === "cv" && candidate && candidate.id && typeof openCandidateCvPreview === "function") {
        openCandidateCvPreview(candidate.id);
        return;
      }
      handleDownload();
    }

    if (isView) {
      if (hasFile) {
        if (type === "cv") {
          var previewBtnView = createButton("Preview", "primary");
          previewBtnView.addEventListener("click", handlePreview);
          actionsEl.appendChild(previewBtnView);

          var downloadBtnView = createButton("Download", "secondary");
          downloadBtnView.addEventListener("click", handleDownload);
          actionsEl.appendChild(downloadBtnView);
        } else {
          var downloadBtnViewOnly = createButton("Download", "secondary");
          downloadBtnViewOnly.addEventListener("click", handleDownload);
          actionsEl.appendChild(downloadBtnViewOnly);
        }
      }
      return;
    }

    if (hasFile) {
      if (type === "cv") {
        var previewBtn = createButton("Preview", "secondary");
        previewBtn.addEventListener("click", handlePreview);
        actionsEl.appendChild(previewBtn);
      }
      var downloadBtn = createButton("Download", "secondary");
      downloadBtn.addEventListener("click", handleDownload);
      actionsEl.appendChild(downloadBtn);

      var replaceBtn = createButton("Replace", "primary");
      replaceBtn.addEventListener("click", function () {
        input.click();
      });
      actionsEl.appendChild(replaceBtn);

      var removeBtn = createButton("Remove", "danger");
      removeBtn.addEventListener("click", function () {
        if (typeof removeCandidateFile === "function") {
          removeCandidateFile(type);
        }
      });
      actionsEl.appendChild(removeBtn);
    } else {
      var uploadBtn = createButton(type === "photo" ? "Upload photo" : "Upload CV", "primary");
      uploadBtn.addEventListener("click", function () {
        input.click();
      });
      actionsEl.appendChild(uploadBtn);
    }
  }

  async function handleCandidateFileChange(config) {
    var input = config && config.input;
    var type = config && config.type;
    if (!input || !type) return;
    if (!window.IESupabase || !window.IESupabase.uploadCandidateFile) {
      return;
    }

    var files = input.files;
    var file = files && files[0];
    if (!file) return;

    var previewImg = document.getElementById("candidatePhotoPreview");
    var candidateId = null;

    try {
      if (typeof getCandidatePageParams === "function") {
        var params = IERouter.getCandidatePageParams();
        if (params && params.id) {
          candidateId = params.id;
        }
      }
    } catch (e) {
      candidateId = null;
    }

    try {
      if (candidateId) {
        // EDIT mode: upload directly under candidate id
        var currentPath = input.dataset.currentPath || "";
        if (currentPath) {
          var confirmMessage =
            type === "photo"
              ? "Replace the existing candidate photo?"
              : "Replace the existing candidate CV?";
          var proceed = window.confirm(confirmMessage);
          if (!proceed) {
            input.value = "";
            return;
          }
        }

        var finalPath =
          type === "photo"
            ? candidateId + "/photo.jpg"
            : candidateId + "/cv.pdf";

        var uploadOptions =
          type === "photo"
            ? { upsert: true, cacheControl: "3600" }
            : { upsert: true };

        var uploadResult = await window.IESupabase.uploadCandidateFile(
          finalPath,
          file,
          uploadOptions
        );
        if (uploadResult && uploadResult.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              uploadResult.error.message || "Error uploading file.",
              "handleCandidateFileChange"
            );
          }
          return;
        }

        var updatePayload =
          type === "photo"
            ? { photo_url: finalPath }
            : { cv_url: finalPath };

        if (window.IESupabase.updateCandidateFiles) {
          var updateResult = await window.IESupabase.updateCandidateFiles(
            candidateId,
            updatePayload
          );
          if (updateResult && updateResult.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(
                updateResult.error.message || "Error saving candidate.",
                "handleCandidateFileChange"
              );
            }
            return;
          }
        }

        input.dataset.currentPath = finalPath;

        if (typeof renderCandidateFileState === "function") {
          var candidateForState =
            type === "photo"
              ? { photo_url: finalPath }
              : { cv_url: finalPath };
          renderCandidateFileState(type, candidateForState, "edit");
        }

        if (type === "photo" && previewImg && window.IESupabase.createSignedCandidateUrl) {
          var signedUrl = await window.IESupabase.createSignedCandidateUrl(finalPath);
          if (signedUrl) {
            previewImg.src = signedUrl;
            previewImg.dataset.storagePath = finalPath;
          }
        }
      } else {
        // CREATE mode: upload to temp/{uuid}
        var tempId = ensurePendingCandidateTempId();
        var tempPath =
          type === "photo"
            ? "temp/" + tempId + "/photo.jpg"
            : "temp/" + tempId + "/cv.pdf";

        var tempUploadResult = await window.IESupabase.uploadCandidateFile(
          tempPath,
          file,
          { upsert: true }
        );
        if (tempUploadResult && tempUploadResult.error) {
          if (type === "photo") {
            pendingCandidatePhotoPath = null;
          } else {
            pendingCandidateCvPath = null;
          }
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              tempUploadResult.error.message || "Error uploading file.",
              "handleCandidateFileChange"
            );
          }
          return;
        }

        if (type === "photo") {
          pendingCandidatePhotoPath = tempPath;
        } else {
          pendingCandidateCvPath = tempPath;
        }

        if (type === "photo" && previewImg && window.IESupabase.createSignedCandidateUrl) {
          var tempSignedUrl = await window.IESupabase.createSignedCandidateUrl(tempPath);
          if (tempSignedUrl) {
            previewImg.src = tempSignedUrl;
            previewImg.dataset.storagePath = tempPath;
          }
        }
      }
    } catch (err) {
      if (!candidateId) {
        if (type === "photo") {
          pendingCandidatePhotoPath = null;
        } else {
          pendingCandidateCvPath = null;
        }
      }
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Error while uploading file.",
          "handleCandidateFileChange"
        );
      } else {
        console.error("[ItalianExperience] handleCandidateFileChange exception:", err);
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
        item.className = "ie-btn ie-btn-secondary w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f6f2e7] transition-colors";
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

  function openModal(config) {
    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.openModal === "function"
    ) {
      window.IEPortal.ui.openModal(config);
    }
  }

  function closeModal() {
    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.closeModal === "function"
    ) {
      window.IEPortal.ui.closeModal();
    }
  }

  function openCandidateModal() {
    const base = IERouter.derivePortalBasePath();
    const fullPage = base + "add-candidate.html";
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
        const form = mount.querySelector("#candidateForm");
        if (form) {
          initCandidateProfileSections(form, "create", null);
        }
      },
    });
  }

  async function openCandidateCvPreview(candidateId) {
    if (!candidateId) return;

    let candidate = null;
    if (window.IESupabase && typeof window.IESupabase.getCandidateById === "function") {
      try {
        const result = await window.IESupabase.getCandidateById(candidateId);
        if (result && result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(
              result.error.message || "Error loading candidate.",
              "openCandidateCvPreview"
            );
          }
          return;
        }
        candidate = result && result.data;
      } catch (err) {
        console.error("[ItalianExperience] openCandidateCvPreview getCandidateById failed:", err);
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError(
            "Error loading candidate.",
            "openCandidateCvPreview"
          );
        }
        return;
      }
    } else if (typeof IE_STORE !== "undefined" && IE_STORE && Array.isArray(IE_STORE.candidates)) {
      candidate = IE_STORE.candidates.find(function (c) {
        return c && c.id === candidateId;
      });
    }

    if (!candidate) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Candidato non trovato.",
          "openCandidateCvPreview"
        );
      } else {
        alert("Candidato non trovato.");
      }
      return;
    }

    var rawPath = candidate.cv_url || "";
    if (!rawPath) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "No CV uploaded for this candidate.",
          "openCandidateCvPreview"
        );
      } else {
        alert("No CV uploaded for this candidate.");
      }
      return;
    }

    var finalUrl = rawPath;
    var isAbsolute = /^https?:\/\//i.test(rawPath);
    var isLegacyUploads = /^\/?uploads\//i.test(rawPath);

    if (!isAbsolute && !isLegacyUploads && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
      try {
        var signed = await window.IESupabase.createSignedCandidateUrl(rawPath);
        if (signed) {
          finalUrl = signed;
        }
      } catch (err2) {
        console.error(
          "[ItalianExperience] openCandidateCvPreview signing failed:",
          err2,
          { path: rawPath }
        );
      }
    }

    var fullName = ((candidate.first_name || "") + " " + (candidate.last_name || "")).trim();
    var title = fullName ? "CV \u2013 " + fullName : "CV Preview";

    openModal({
      title: title,
      fullPageHref: null,
      render: function (mount) {
        mount.innerHTML = "";
        var iframe = document.createElement("iframe");
        iframe.src = finalUrl;
        iframe.style.width = "100%";
        iframe.style.height = "80vh";
        iframe.style.border = "none";
        iframe.loading = "lazy";
        mount.appendChild(iframe);
      },
    });
  }

  function openOfferModal() {
    const base = IERouter.derivePortalBasePath();
    const fullPage = base + "add-job-offer.html";
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

            <div class="ie-card glass-card rounded-2xl p-6">
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
      <div class="ie-card glass-card rounded-2xl p-6" style="border-radius: 1.25rem;">
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
      box.className = "ie-card glass-card rounded-2xl p-6";
      box.innerHTML =
        '<div class="text-sm font-semibold text-gray-700 mb-1">Form non disponibile in modalità file locale.</div>' +
        '<p class="text-xs text-gray-500">Apri la pagina completa tramite la sidebar o il pulsante principale per utilizzare questo form.</p>';
      return box;
    }

    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        const box = document.createElement("div");
        box.className = "ie-card glass-card rounded-2xl p-6";
        box.innerHTML =
          '<div class="text-sm font-semibold text-gray-700">Unable to load form.</div>';
        return box;
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const form = doc.querySelector(formSelector);
      if (!form) {
        const box = document.createElement("div");
        box.className = "ie-card glass-card rounded-2xl p-6";
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
      box.className = "ie-card glass-card rounded-2xl p-6";
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
        notes: "Intro call completed; awaiting client feedback.",
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
        notes: "Confirmed for placement at Grand Hotel Milano.",
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
        notes: "Profile received; in initial review.",
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
  let IE_PROFILE_ACTIVITY_LOGS = [];

  async function loadCurrentUserProfile() {
    if (!window.IEAuth) return;
    try {
      const { data: sessionResult } = await window.IEAuth.getSession();
      const user = sessionResult?.user || null;
      IE_CURRENT_USER_EMAIL = user?.email || null;

      const { data, error } = await window.IESupabase.getProfile();
      if (error) {
        console.error("[Profile] Failed to load profile in header:", error);
        IE_CURRENT_PROFILE = null;
        return;
      }
      IE_CURRENT_PROFILE = data || null;
      if (typeof window.debugLog === "function") window.debugLog("[Profile] Loaded profile");
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

  // ---------------------------------------------------------------------------
  // Profile - My Activity section
  // ---------------------------------------------------------------------------

  async function initProfileMyActivitySection() {
    const form = document.getElementById("profileForm");
    if (!form) return;

    let container = document.getElementById("my-activity-section");
    if (!container) {
      const wrapper = document.createElement("section");
      wrapper.className = "entity-activity profile-my-activity ie-card glass-card";

      const header = document.createElement("h3");
      header.className = "entity-activity__title";
      header.textContent = "My Activity";

      container = document.createElement("div");
      container.id = "my-activity-section";
      container.className = "entity-activity__list";

      wrapper.appendChild(header);
      wrapper.appendChild(container);

      const contentWrapper = form.parentElement;
      if (contentWrapper && contentWrapper.parentElement) {
        contentWrapper.parentElement.insertBefore(wrapper, contentWrapper.nextSibling);
      } else if (contentWrapper) {
        contentWrapper.appendChild(wrapper);
      } else {
        form.appendChild(wrapper);
      }
    }

    if (container.__ieProfileActivityBound !== true) {
      container.addEventListener("click", function (event) {
        const editBtn = event.target.closest("[data-action='my-activity-edit']");
        if (editBtn) {
          event.preventDefault();
          const id = editBtn.getAttribute("data-id");
          if (id) {
            handleProfileActivityEdit(id, container);
          }
          return;
        }
        const deleteBtn = event.target.closest("[data-action='my-activity-delete']");
        if (deleteBtn) {
          event.preventDefault();
          const id = deleteBtn.getAttribute("data-id");
          if (id) {
            handleProfileActivityDelete(id, container);
          }
        }
      });
      container.__ieProfileActivityBound = true;
    }

    await loadProfileActivityData(container);
  }

  async function loadProfileActivityData(container) {
    if (!container) return;

    container.innerHTML =
      '<p class="activity-log-loading text-sm text-gray-500">Loading your activity...</p>';

    if (!window.IESupabase || typeof window.IESupabase.fetchMyActivityLogs !== "function") {
      container.innerHTML =
        '<p class="activity-log-error text-sm text-gray-500">Activity not available.</p>';
      return;
    }

    try {
      const result = await window.IESupabase.fetchMyActivityLogs();
      if (result.error) {
        console.error("[Profile] fetchMyActivityLogs error:", result.error);
        container.innerHTML =
          '<p class="activity-log-error text-sm text-gray-500">Unable to load your activity right now.</p>';
        return;
      }

      const rawLogs = Array.isArray(result.data) ? result.data : [];
      if (!rawLogs.length) {
        IE_PROFILE_ACTIVITY_LOGS = [];
        renderMyActivityList(container, IE_PROFILE_ACTIVITY_LOGS);
        return;
      }

      const viewModels = await buildProfileActivityViewModels(rawLogs);
      IE_PROFILE_ACTIVITY_LOGS = viewModels;
      renderMyActivityList(container, IE_PROFILE_ACTIVITY_LOGS);
    } catch (error) {
      console.error("[Profile] loadProfileActivityData exception:", error);
      container.innerHTML =
        '<p class="activity-log-error text-sm text-gray-500">Your activity could not be loaded right now.</p>';
    }
  }

  async function buildProfileActivityViewModels(logs) {
    const candidateIds = new Set();
    const jobOfferIds = new Set();
    const clientIds = new Set();

    logs.forEach(function (log) {
      if (!log || !log.entity_type || !log.entity_id) return;
      if (log.entity_type === "candidate") {
        candidateIds.add(log.entity_id);
      } else if (log.entity_type === "job_offer") {
        jobOfferIds.add(log.entity_id);
      } else if (log.entity_type === "client") {
        clientIds.add(log.entity_id);
      }
    });

    const supabaseClient = window.IESupabase && window.IESupabase.supabase;
    if (!supabaseClient) {
      console.error("[Profile] Supabase client not available for My Activity entity resolution.");
      return [];
    }

    const candidateIdArray = Array.from(candidateIds);
    const jobOfferIdArray = Array.from(jobOfferIds);
    const clientIdArray = Array.from(clientIds);

    try {
      const promises = [];

      if (candidateIdArray.length) {
        promises.push(
          supabaseClient
            .from("candidates")
            .select("id, first_name, last_name")
            .in("id", candidateIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      if (jobOfferIdArray.length) {
        promises.push(
          supabaseClient.from("job_offers").select("id, title").in("id", jobOfferIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      if (clientIdArray.length) {
        promises.push(
          supabaseClient.from("clients").select("id, name").in("id", clientIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      const [candidatesRes, jobOffersRes, clientsRes] = await Promise.all(promises);

      if (candidatesRes.error || jobOffersRes.error || clientsRes.error) {
        console.error("[Profile] My Activity entity fetch error:", {
          candidatesError: candidatesRes.error || null,
          jobOffersError: jobOffersRes.error || null,
          clientsError: clientsRes.error || null,
        });
        throw new Error("Failed to resolve activity entities");
      }

      const candidateMap = (candidatesRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          const first = (row.first_name || "").toString().trim();
          const last = (row.last_name || "").toString().trim();
          const fullName = [first, last].filter(Boolean).join(" ").trim() || "—";
          acc[row.id] = fullName;
        }
        return acc;
      }, {});

      const jobOfferMap = (jobOffersRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          acc[row.id] = (row.title || "—").toString();
        }
        return acc;
      }, {});

      const clientMap = (clientsRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          acc[row.id] = (row.name || "—").toString();
        }
        return acc;
      }, {});

      const viewModels = logs
        .map(function (log) {
          if (!log) return null;
          let entityLabel = null;
          if (log.entity_type === "candidate") {
            entityLabel = candidateMap[log.entity_id];
          } else if (log.entity_type === "job_offer") {
            entityLabel = jobOfferMap[log.entity_id];
          } else if (log.entity_type === "client") {
            entityLabel = clientMap[log.entity_id];
          }
          if (!entityLabel) return null;

          return {
            id: log.id,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            event_type: log.event_type,
            message: log.message,
            created_at: log.created_at,
            updated_at: log.updated_at,
            updated_by: log.updated_by,
            entityLabel: entityLabel,
          };
        })
        .filter(Boolean);

      viewModels.sort(function (a, b) {
        const aTime = a && a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b && b.created_at ? new Date(b.created_at).getTime() : 0;
        if (aTime === bTime) {
          return String(b.id || "").localeCompare(String(a.id || ""));
        }
        return bTime - aTime;
      });

      return viewModels;
    } catch (error) {
      console.error("[Profile] buildProfileActivityViewModels exception:", error);
      return [];
    }
  }

  function renderMyActivityList(container, logs) {
    if (!container) return;

    container.innerHTML = "";

    if (!logs || !logs.length) {
      const empty = document.createElement("p");
      empty.className = "entity-activity__empty";
      empty.textContent = "You don\u2019t have any activity yet.";
      container.appendChild(empty);
      return;
    }

    logs.forEach(function (log) {
      const row = document.createElement("div");
      row.className = "activity-item";
      row.setAttribute("data-log-id", String(log.id || ""));
      row.setAttribute("data-entity-type", String(log.entity_type || ""));
      row.setAttribute("data-event-type", String(log.event_type || ""));

      const dot = document.createElement("span");
      dot.className = "activity-item__dot";
      row.appendChild(dot);

      const content = document.createElement("div");
      content.className = "activity-item__content";

      const headerRow = document.createElement("div");
      headerRow.className = "activity-item__headerRow";

      const badge = document.createElement("span");
      badge.className = "activity-entity-badge";
      let badgeLabel = "";
      if (log.entity_type === "candidate") {
        badge.className += " activity-entity-badge--candidate";
        badgeLabel = "Candidate";
      } else if (log.entity_type === "job_offer") {
        badge.className += " activity-entity-badge--job-offer";
        badgeLabel = "Job Offer";
      } else if (log.entity_type === "client") {
        badge.className += " activity-entity-badge--client";
        badgeLabel = "Client";
      } else {
        badgeLabel = "Activity";
      }
      badge.textContent = badgeLabel;

      const who = document.createElement("span");
      who.className = "activity-item__who";
      who.textContent = log.entityLabel || "—";

      headerRow.appendChild(badge);
      headerRow.appendChild(who);

      var createdText = "";
      if (log.created_at) {
        try {
          createdText = new Date(log.created_at).toLocaleString("it-IT");
        } catch (e) {
          createdText = String(log.created_at);
        }
      }
      var metaText = createdText ? "Created on " + createdText : "";
      if (log.updated_at && log.updated_at !== log.created_at) {
        var updatedText;
        try {
          updatedText = new Date(log.updated_at).toLocaleString("it-IT");
        } catch (e2) {
          updatedText = String(log.updated_at);
        }
        metaText += metaText ? " \u2013 Edited on " + updatedText : "Edited on " + updatedText;
      }

      const timeWrap = document.createElement("span");
      timeWrap.className = "activity-item__timeWrap";
      const ts = document.createElement("span");
      ts.className = "activity-item__timestamp";
      ts.textContent = metaText;
      timeWrap.appendChild(ts);
      headerRow.appendChild(timeWrap);

      content.appendChild(headerRow);

      const messageEl = document.createElement("p");
      messageEl.className = "activity-item__message";
      messageEl.textContent = log.message || "";
      content.appendChild(messageEl);

      const actions = document.createElement("div");
      actions.className = "activity-item__actions";

      if (log.event_type === "manual_note") {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "ie-btn ie-btn-primary activity-item__actionBtn";
        editBtn.setAttribute("data-action", "my-activity-edit");
        editBtn.setAttribute("data-id", String(log.id || ""));
        editBtn.textContent = "Edit";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "ie-btn ie-btn-danger activity-item__actionBtn activity-item__actionBtn--danger";
        deleteBtn.setAttribute("data-action", "my-activity-delete");
        deleteBtn.setAttribute("data-id", String(log.id || ""));
        deleteBtn.textContent = "Delete";

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
      }

      content.appendChild(actions);
      row.appendChild(content);
      container.appendChild(row);
    });
  }

  function canEditManualLog(log) {
    return !!log && log.event_type === "manual_note";
  }

  async function handleProfileActivityEdit(id, container) {
    const log =
      IE_PROFILE_ACTIVITY_LOGS &&
      IE_PROFILE_ACTIVITY_LOGS.find(function (item) {
        return String(item.id) === String(id);
      });
    if (!log || !canEditManualLog(log)) {
      return;
    }

    const row = container.querySelector('[data-log-id="' + String(id) + '"]');
    if (!row) return;

    const messageEl = row.querySelector(".activity-item__message");
    if (!messageEl) return;

    const existingEditor = row.querySelector(".activity-log-editor");
    if (existingEditor) {
      return;
    }

    const originalText = messageEl.textContent || "";
    messageEl.style.display = "none";

    const editor = document.createElement("div");
    editor.className = "activity-log-editor";

    const textarea = document.createElement("textarea");
    textarea.className = "activity-log-editor-input";
    textarea.value = originalText;

    const controls = document.createElement("div");
    controls.className = "activity-log-editor-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "ie-btn ie-btn-primary activity-log-action activity-log-action-save";
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ie-btn ie-btn-secondary activity-log-action activity-log-action-cancel";
    cancelBtn.textContent = "Cancel";

    controls.appendChild(saveBtn);
    controls.appendChild(cancelBtn);

    const errorEl = document.createElement("p");
    errorEl.className = "activity-log-editor-error text-xs text-red-600";
    errorEl.style.display = "none";

    editor.appendChild(textarea);
    editor.appendChild(controls);
    editor.appendChild(errorEl);

    row.appendChild(editor);

    cancelBtn.addEventListener("click", function () {
      row.removeChild(editor);
      messageEl.style.display = "";
    });

    saveBtn.addEventListener("click", async function () {
      const value = textarea.value.trim();
      if (!value) {
        errorEl.textContent = "Message cannot be empty.";
        errorEl.style.display = "";
        return;
      }

      errorEl.style.display = "none";
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      saveBtn.textContent = "Saving\u2026";

      try {
        if (
          !window.IESupabase ||
          typeof window.IESupabase.updateMyManualLog !== "function"
        ) {
          throw new Error("Activity API not available");
        }

        const result = await window.IESupabase.updateMyManualLog(id, { message: value });
        if (result.error) {
          console.error("[Profile] updateMyManualLog error:", result.error);
          errorEl.textContent =
            result.error.message || "Unable to save this note. Please try again.";
          errorEl.style.display = "";
          return;
        }

        await loadProfileActivityData(container);
      } catch (error) {
        console.error("[Profile] handleProfileActivityEdit exception:", error);
        errorEl.textContent = "Unable to save this note. Please try again.";
        errorEl.style.display = "";
      } finally {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    });
  }

  async function handleProfileActivityDelete(id, container) {
    const log =
      IE_PROFILE_ACTIVITY_LOGS &&
      IE_PROFILE_ACTIVITY_LOGS.find(function (item) {
        return String(item.id) === String(id);
      });
    if (!log || !canEditManualLog(log)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );
    if (!confirmed) return;

    try {
      if (
        !window.IESupabase ||
        typeof window.IESupabase.deleteMyManualLog !== "function"
      ) {
        throw new Error("Activity API not available");
      }

      const result = await window.IESupabase.deleteMyManualLog(id);
      if (result.error) {
        console.error("[Profile] deleteMyManualLog error:", result.error);
        // Use a subtle message; avoid blocking the rest of the page.
        const message =
          result.error.message || "Unable to delete this note. Please try again.";
        console.error("[Profile] deleteMyManualLog:", message);
        return;
      }

      await loadProfileActivityData(container);
    } catch (error) {
      console.error("[Profile] handleProfileActivityDelete exception:", error);
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
    if (typeof window.debugLog === "function") {
      window.debugLog("[ItalianExperience] connectToDatabase() – configure your API client here.");
    }
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
          cv_url:
            typeof r.cv_url === "string" && r.cv_url.trim().length > 0
              ? r.cv_url
              : null,
          created_at: r.created_at,
          is_archived: r.is_archived || false,
        };
      });
      if (window.IEListsRuntime && typeof IEListsRuntime.applyCandidateFilters === "function") {
        return IEListsRuntime.applyCandidateFilters(mapped, filters || {});
      }
      return mapped;
    }
    const base = IE_STORE.candidates.filter((c) => !c._deleted);
    if (window.IEListsRuntime && typeof IEListsRuntime.applyCandidateFilters === "function") {
      return Promise.resolve(IEListsRuntime.applyCandidateFilters(base, filters || {}));
    }
    return Promise.resolve(base);
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
      if (window.IEListsRuntime && typeof IEListsRuntime.applyJobOfferFilters === "function") {
        return IEListsRuntime.applyJobOfferFilters(mapped, filters || {});
      }
      return mapped;
    }
    const base = IE_STORE.jobOffers.filter((o) => !o._deleted);
    if (window.IEListsRuntime && typeof IEListsRuntime.applyJobOfferFilters === "function") {
      return Promise.resolve(IEListsRuntime.applyJobOfferFilters(base, filters || {}));
    }
    return Promise.resolve(base);
  }

  function fetchClients(filters) {
    if (typeof window.debugLog === "function") window.debugLog("[ItalianExperience] fetchClients() – filters");
    const base = IE_STORE.clients.filter((c) => !c._deleted);
    if (window.IEListsRuntime && typeof IEListsRuntime.applyClientFilters === "function") {
      return Promise.resolve(IEListsRuntime.applyClientFilters(base, filters || {}));
    }
    return Promise.resolve(base);
  }

  async function saveCandidate(formData, form) {
    var profile = collectCandidateProfileData(form);
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
        email: profile.email || null,
        phone: profile.phone || null,
        linkedin_url: profile.linkedin_url || null,
        date_of_birth: profile.date_of_birth || null,
        summary: profile.summary || null,
      });
      if (error) {
        window.IESupabase.showError(error.message || "Error saving candidate.", "saveCandidate");
        return;
      }

      try {
        const newId = data && data.id;
        if (newId && (pendingCandidatePhotoPath || pendingCandidateCvPath)) {
          const updates = [];

          if (pendingCandidatePhotoPath && window.IESupabase.moveCandidateFile) {
            const finalPhotoPath = newId + "/photo.jpg";
            const movePhotoResult = await window.IESupabase.moveCandidateFile(
              pendingCandidatePhotoPath,
              finalPhotoPath
            );
            if (!movePhotoResult || !movePhotoResult.error) {
              updates.push({ photo_url: finalPhotoPath });
            }
          }

          if (pendingCandidateCvPath && window.IESupabase.moveCandidateFile) {
            const finalCvPath = newId + "/cv.pdf";
            const moveCvResult = await window.IESupabase.moveCandidateFile(
              pendingCandidateCvPath,
              finalCvPath
            );
            if (!moveCvResult || !moveCvResult.error) {
              updates.push({ cv_url: finalCvPath });
            }
          }

          if (updates.length && window.IESupabase.updateCandidateFiles) {
            const mergedPayload = updates.reduce(function (acc, patch) {
              for (const key in patch) {
                if (Object.prototype.hasOwnProperty.call(patch, key)) {
                  acc[key] = patch[key];
                }
              }
              return acc;
            }, {});
            try {
              await window.IESupabase.updateCandidateFiles(newId, mergedPayload);
            } catch (updateErr) {
              console.error("[ItalianExperience] saveCandidate() file URL update error:", updateErr);
            }
          }

          const tempPathsToDelete = [];
          if (pendingCandidatePhotoPath) tempPathsToDelete.push(pendingCandidatePhotoPath);
          if (pendingCandidateCvPath) tempPathsToDelete.push(pendingCandidateCvPath);
          if (tempPathsToDelete.length && window.IESupabase.deleteCandidateFiles) {
            try {
              await window.IESupabase.deleteCandidateFiles(tempPathsToDelete);
            } catch (deleteErr) {
              console.error("[ItalianExperience] saveCandidate() temp file cleanup error:", deleteErr);
            }
          }
        }
      } catch (finalizeErr) {
        console.error("[ItalianExperience] saveCandidate() file finalization error:", finalizeErr);
      } finally {
        pendingCandidateTempId = null;
        pendingCandidatePhotoPath = null;
        pendingCandidateCvPath = null;
      }

      var newId = data && data.id;
      if (newId) {
        var childrenResult = await saveCandidateProfileChildren(newId, profile);
        if (!childrenResult || childrenResult.ok === false) {
          // Error already shown inside saveCandidateProfileChildren.
          return;
        }
        await logCandidateProfileUpdated(newId);
      }

      window.IESupabase.showSuccess("Candidato salvato con successo.");
      if (newId) {
        IERouter.redirectToEntityView("candidate", newId);
      } else {
        IERouter.navigateTo("candidates.html");
      }
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
    if (typeof window.debugLog === "function") window.debugLog("[ItalianExperience] saveCandidate() – in-memory");
    alert("Candidato salvato con successo (simulazione)");
    if (candidate.id) {
      IERouter.redirectToEntityView("candidate", candidate.id);
    } else {
      IERouter.navigateTo("candidates.html");
    }
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
          window.IESupabase.showError(clientError.message || "Error creating client.", "saveJobOffer");
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
        window.IESupabase.showError(error.message || "Error creating job offer.", "saveJobOffer");
        return;
      }
      var newId = data && data.id;
      window.IESupabase.showSuccess("Job offer created successfully.");
      if (newId) {
        IERouter.redirectToEntityView("job-offer", newId);
      } else {
        IERouter.navigateTo("job-offers.html");
      }
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
    if (typeof window.debugLog === "function") window.debugLog("[ItalianExperience] saveJobOffer() – in-memory");
    alert("Job offer created successfully (simulation)");
    if (jobOffer.id) {
      IERouter.redirectToEntityView("job-offer", jobOffer.id);
    } else {
      IERouter.navigateTo("job-offers.html");
    }
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
      if (window.IESupabase) window.IESupabase.showError("Client name is required.", "saveClient");
      else alert("Client name is required.");
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
        window.IESupabase.showError(error.message || "Error saving client.", "saveClient");
        return;
      }
      var newId = data && data.id;
      window.IESupabase.showSuccess("Client created successfully.");
      if (newId) {
        IERouter.redirectToEntityView("client", newId);
      } else {
        IERouter.navigateTo("clients.html");
      }
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
    if (typeof window.debugLog === "function") window.debugLog("[ItalianExperience] saveClient() – in-memory");
    alert("Client created successfully (simulation)");
    if (client.id) {
      IERouter.redirectToEntityView("client", client.id);
    } else {
      IERouter.navigateTo("clients.html");
    }
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
      // Dashboard data is loaded via Supabase helpers (lists runtime module).
      if (window.IEListsRuntime && typeof IEListsRuntime.initDashboardPage === "function") {
        IEListsRuntime.initDashboardPage();
      }
      return;
    }
    if (pageKey === "candidates") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initCandidatesPage === "function") {
        IEListsRuntime.initCandidatesPage();
      }
    } else if (pageKey === "add-candidate") {
      initAddCandidatePage();
    } else if (pageKey === "job-offers") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initJobOffersPage === "function") {
        IEListsRuntime.initJobOffersPage();
      }
    } else if (pageKey === "applications") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initApplicationsPage === "function") {
        IEListsRuntime.initApplicationsPage();
      }
    } else if (pageKey === "clients") {
      if (window.IEListsRuntime && typeof IEListsRuntime.initClientsPage === "function") {
        IEListsRuntime.initClientsPage();
      }
    } else if (pageKey === "add-client") {
      initAddClientePage();
    } else if (pageKey === "profile") {
      initProfileMyActivitySection();
    }
    if (pageKey === "add-job-offer") {
          const params = new URLSearchParams(window.location.search);
          const state = IERouter.resolveEntityPageState(params);
      setPageMode(state.mode, state.id);
    }
  }

  var candidateOriginalStatus = null;
  var jobOfferOriginalStatus = null;

  function getCandidateStatusBadgeClass(status) {
    var s = status && typeof status === "string" ? status.trim().toLowerCase() : "";
    switch (s) {
      case "new":
        return "badge-new";
      case "applied":
        return "badge-applied";
      case "screening":
        return "badge-screening";
      case "interview":
        return "badge-interview";
      case "offer":
      case "offered":
        return "badge-offered";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      case "withdrawn":
        return "badge-withdrawn";
      case "not_selected":
        return "badge-neutral";
      default:
        return "badge-new";
    }
  }

  function formatCandidateStatusLabel(status) {
    var s = status && typeof status === "string" ? status.trim() : "";
    if (!s) return "New";
    if (s === "offered") return "Offer";
    switch (s) {
      case "new":
        return "New";
      case "applied":
        return "Applied";
      case "screening":
        return "Screening";
      case "interview":
        return "Interview";
      case "offer":
        return "Offer";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      case "withdrawn":
        return "Withdrawn";
      case "not_selected":
        return "Not Selected";
      default:
        return s;
    }
  }

  function getEffectiveCandidateStatus(candidate) {
    if (!candidate) return "new";

    const assocStatus = candidate.latest_association?.status;

    if (assocStatus === "hired") {
      return "hired";
    }

    if (assocStatus) {
      return assocStatus;
    }

    return "new";
  }

  /** Canonical application statuses (ATS). Legacy: new→applied, offered→offer. */
  var APPLICATION_STATUS_CANONICAL = [
    "applied",
    "screening",
    "interview",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
    "not_selected"
  ];

  /**
   * Normalize stored status to canonical for display/UI.
   * @param {string} status - raw value from candidate_job_associations.status
   * @returns {string} canonical status
   */
  function normalizeApplicationStatusForDisplay(status) {
    if (!status || typeof status !== "string") return "applied";
    var s = status.trim().toLowerCase();
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
  }

  function getApplicationStatusBadgeClass(status) {
    var s = normalizeApplicationStatusForDisplay(status);
    switch (s) {
      case "applied":
        return "badge-applied";
      case "screening":
        return "badge-screening";
      case "interview":
        return "badge-interview";
      case "offer":
        return "badge-offered";
      case "hired":
        return "badge-hired";
      case "rejected":
        return "badge-rejected";
      case "withdrawn":
        return "badge-withdrawn";
      case "not_selected":
        return "badge-neutral";
      default:
        return "badge-applied";
    }
  }

  function formatApplicationStatusLabel(status) {
    var s = normalizeApplicationStatusForDisplay(status);
    switch (s) {
      case "applied":
        return "Applied";
      case "screening":
        return "Screening";
      case "interview":
        return "Interview";
      case "offer":
        return "Offer";
      case "hired":
        return "Hired";
      case "rejected":
        return "Rejected";
      case "withdrawn":
        return "Withdrawn";
      case "not_selected":
        return "Not Selected";
      default:
        return "Applied";
    }
  }

  // ---------------------------------------------------------------------------
  // Inline association panels (embedded UX)
  // ---------------------------------------------------------------------------

  function debounce(fn, delayMs) {
    var t = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        fn.apply(ctx, args);
      }, delayMs);
    };
  }

  function normalizeOfferStatus(status) {
    var s = (status || "").toString().toLowerCase();
    if (s === "active") return "open";
    if (s === "in progress") return "inprogress";
    return s || "open";
  }

  function getOfferStatusBadgeClass(status) {
    switch (normalizeOfferStatus(status)) {
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
    switch (normalizeOfferStatus(status)) {
      case "open":
        return "Open";
      case "inprogress":
        return "In Progress";
      case "closed":
        return "Closed";
      default:
        return (status || "Open").toString();
    }
  }

  function normalizeAvailabilityStatus(raw) {
    var s = (raw || "").toString().toLowerCase();
    if (s === "available") return "available";
    if (s === "unavailable") return "unavailable";
    return "";
  }

  /**
   * Tri-state derived availability from applications (never stored in DB).
   * working = any application hired; in_process = any in applied/screening/interview/offer; else available.
   */
  function computeDerivedAvailability(applications) {
    if (!applications || !Array.isArray(applications) || applications.length === 0) return "available";
    var activeStatuses = ["applied", "screening", "interview", "offer", "new", "offered"];
    var hasHired = applications.some(function (a) {
      var s = (a && a.status && String(a.status)).toLowerCase();
      return s === "hired";
    });
    if (hasHired) return "working";
    var hasActive = applications.some(function (a) {
      var s = (a && a.status && String(a.status)).toLowerCase();
      return activeStatuses.indexOf(s) !== -1;
    });
    if (hasActive) return "in_process";
    return "available";
  }

  function computeCandidateAvailability(candidate) {
    if (!candidate) return "available";
    if (candidate.derived_availability) {
      return candidate.derived_availability;
    }
    if (candidate.candidate_job_associations && Array.isArray(candidate.candidate_job_associations)) {
      return computeDerivedAvailability(candidate.candidate_job_associations);
    }
    var explicit = normalizeAvailabilityStatus(candidate.availability_status);
    if (explicit) {
      return explicit === "unavailable" ? "in_process" : "available";
    }
    var assocStatus =
      candidate.latest_association && candidate.latest_association.status
        ? String(candidate.latest_association.status).toLowerCase()
        : "";
    if (assocStatus && assocStatus !== "rejected" && assocStatus !== "not_selected" && assocStatus !== "withdrawn") {
      return "in_process";
    }
    return "available";
  }

  function getAvailabilityBadgeClass(candidateOrStatus) {
    var status =
      typeof candidateOrStatus === "string"
        ? candidateOrStatus
        : computeCandidateAvailability(candidateOrStatus);
    if (status === "working") return "badge-hired";
    if (status === "in_process") return "badge-inprogress";
    if (status === "unavailable") return "badge-closed";
    return "badge-open";
  }

  function formatAvailabilityLabel(candidateOrStatus) {
    var status =
      typeof candidateOrStatus === "string"
        ? candidateOrStatus
        : computeCandidateAvailability(candidateOrStatus);
    if (status === "working") return "Working";
    if (status === "in_process") return "In process";
    if (status === "unavailable") return "Unavailable";
    return "Available";
  }

  function isCandidateHired(candidate) {
    var s = candidate && candidate.status != null ? String(candidate.status).toLowerCase() : "";
    return s === "hired";
  }

  function createInlineBadge(label, badgeClass) {
    var el = document.createElement("span");
    el.className = "badge " + (badgeClass || "");
    el.textContent = label || "—";
    return el;
  }

  function renderInlineCandidateRow(candidate, opts) {
    if (!candidate) return null;
    if (isCandidateHired(candidate)) return null;

    var fullName =
      ((candidate.first_name || "") + " " + (candidate.last_name || "")).trim() || "—";
    var position = (candidate.position || "").toString().trim();
    var status = (candidate.status || "new").toString().toLowerCase();
    var availability = computeCandidateAvailability(candidate);

    var row = document.createElement("button");
    row.type = "button";
    row.className =
      "ie-btn ie-btn-secondary w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center justify-between gap-4";
    row.setAttribute("data-id", candidate.id || "");

    var left = document.createElement("div");
    left.className = "min-w-0";
    var nameEl = document.createElement("div");
    nameEl.className = "font-semibold text-gray-800 text-sm truncate";
    nameEl.textContent = fullName;
    left.appendChild(nameEl);
    if (position) {
      var posEl = document.createElement("div");
      posEl.className = "text-xs text-gray-500 truncate";
      posEl.textContent = position;
      left.appendChild(posEl);
    }

    var right = document.createElement("div");
    right.className = "flex items-center gap-2 flex-shrink-0";
    right.appendChild(
      createInlineBadge(formatCandidateStatusLabel(status), getCandidateStatusBadgeClass(status))
    );
    right.appendChild(
      createInlineBadge(formatAvailabilityLabel(availability), getAvailabilityBadgeClass(availability))
    );

    row.appendChild(left);
    row.appendChild(right);

    row.addEventListener("click", function () {
      if (opts && typeof opts.onClick === "function") opts.onClick(candidate);
    });

    return row;
  }

  function renderInlineOfferRow(offer, opts) {
    if (!offer) return null;
    var title = (offer.title || "—").toString();
    var clientName = (offer.client_name || "—").toString();
    var status = offer.status || "open";
    var required = offer.positions_required != null ? Number(offer.positions_required) : null;
    if (!Number.isFinite(required)) {
      required = offer.positions != null ? Number(offer.positions) : null;
    }
    if (!Number.isFinite(required)) required = 1;

    var row = document.createElement("button");
    row.type = "button";
    row.className =
      "ie-btn ie-btn-secondary w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center justify-between gap-4";
    row.setAttribute("data-id", offer.id || "");

    var left = document.createElement("div");
    left.className = "min-w-0";
    var titleEl = document.createElement("div");
    titleEl.className = "font-semibold text-gray-800 text-sm truncate";
    titleEl.textContent = title;
    left.appendChild(titleEl);
    var clientEl = document.createElement("div");
    clientEl.className = "text-xs text-gray-500 truncate";
    clientEl.textContent = clientName;
    left.appendChild(clientEl);

    var right = document.createElement("div");
    right.className = "flex items-center gap-3 flex-shrink-0";
    right.appendChild(
      createInlineBadge(formatOfferStatusLabel(status), getOfferStatusBadgeClass(status))
    );
    var count = document.createElement("div");
    count.className = "text-xs font-semibold text-gray-600";
    count.textContent = "— / " + String(required);
    right.appendChild(count);

    row.appendChild(left);
    row.appendChild(right);

    row.addEventListener("click", function () {
      if (opts && typeof opts.onClick === "function") opts.onClick(offer);
    });

    return row;
  }

  function renderCandidateAvailableOffersSection(opts) {
    var candidateId = opts && opts.candidateId ? String(opts.candidateId) : "";
    var candidate = opts && opts.candidate ? opts.candidate : null;
    var mode = opts && opts.mode ? String(opts.mode) : "view";
    var isArchived = !!(opts && opts.isArchived);
    var insertAfterEl = opts && opts.insertAfterEl ? opts.insertAfterEl : null;

    var existing = document.getElementById("candidateAvailableOffersSection");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    if (!candidateId || !candidate || mode !== "view" || isArchived) {
      return;
    }

    var wrapper = document.createElement("section");
    wrapper.id = "candidateAvailableOffersSection";
    wrapper.className = "mt-8";

    var card = document.createElement("div");
    card.className = "ie-card glass-card p-6 rounded-3xl";

    var header = document.createElement("div");
    header.className = "flex items-center justify-between gap-4 mb-4";
    var title = document.createElement("h3");
    title.className = "serif text-xl font-bold text-[#1b4332] section-title";
    title.textContent = "Available Offers";
    header.appendChild(title);
    card.appendChild(header);

    var searchWrap = document.createElement("div");
    searchWrap.className = "mb-3";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "form-input text-sm";
    input.placeholder = "Search offers by title...";
    input.setAttribute("autocomplete", "off");
    searchWrap.appendChild(input);
    card.appendChild(searchWrap);

    var list = document.createElement("div");
    list.className = "max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
    card.appendChild(list);

    wrapper.appendChild(card);

    // Insert into DOM just after metadata, before activity if possible.
    if (insertAfterEl && insertAfterEl.parentNode) {
      if (insertAfterEl.nextSibling) {
        insertAfterEl.parentNode.insertBefore(wrapper, insertAfterEl.nextSibling);
      } else {
        insertAfterEl.parentNode.appendChild(wrapper);
      }
    } else {
      var activity = document.getElementById("activity-container");
      if (activity && activity.parentNode) {
        activity.parentNode.insertBefore(wrapper, activity);
      } else {
        document.body.appendChild(wrapper);
      }
    }

    var reqSeq = 0;
    var lastTerm = "";

    function getAssociatedOfferIds() {
      var assocs = candidate && Array.isArray(candidate.candidate_job_associations)
        ? candidate.candidate_job_associations
        : [];
      var set = {};
      assocs.forEach(function (a) {
        if (a && a.job_offer_id) set[String(a.job_offer_id)] = true;
      });
      return set;
    }

    async function loadOffers(term) {
      lastTerm = term || "";
      reqSeq += 1;
      var thisReq = reqSeq;

      if (!window.IESupabase || typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
        list.innerHTML =
          '<div class="px-4 py-4 text-sm text-gray-400">Offers API not available.</div>';
        return;
      }

      list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

      var filters = {
        archived: "active",
        offerStatus: "active",
        excludeArchivedStatus: true,
        title: (term || "").toString(),
      };

      try {
        var result = await window.IESupabase.fetchJobOffersPaginated({
          filters: filters,
          page: 1,
          limit: 20,
        });
        if (thisReq !== reqSeq) return;
        if (!result || result.error) {
          list.innerHTML =
            '<div class="px-4 py-4 text-sm text-red-500">Unable to load offers.</div>';
          return;
        }

        var rows = Array.isArray(result.data) ? result.data : [];
        var associated = getAssociatedOfferIds();
        var filtered = rows.filter(function (o) {
          if (!o || !o.id) return false;
          if (associated[String(o.id)]) return false;
          return true;
        });

        list.innerHTML = "";
        if (!filtered.length) {
          list.innerHTML =
            '<div class="px-4 py-4 text-sm text-gray-400">No offers available.</div>';
          return;
        }

        filtered.slice(0, 20).forEach(function (offer) {
          var row = renderInlineOfferRow(offer, {
            onClick: async function (o) {
              if (!o || !o.id) return;
              if (!window.IESupabase || typeof window.IESupabase.linkCandidateToJob !== "function") return;

              row.disabled = true;
              row.classList.add("opacity-60", "cursor-not-allowed");
              try {
                var linkRes = await window.IESupabase.linkCandidateToJob({
                  candidate_id: candidateId,
                  job_offer_id: o.id,
                });
                if (linkRes && linkRes.error) {
                  if (window.IESupabase && window.IESupabase.showError) {
                    window.IESupabase.showError(linkRes.error.message || "Linking error.");
                  }
                  return;
                }

                if (window.IESupabase && typeof window.IESupabase.getCandidateById === "function") {
                  var fresh = await window.IESupabase.getCandidateById(candidateId);
                  if (fresh && !fresh.error && fresh.data) {
                    candidate = fresh.data;
                    var meta = document.getElementById("candidateMetadata");
                    if (meta) meta.innerHTML = renderEntityMetadata(candidate);
                  }
                }

                await loadOffers(lastTerm);
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(e && e.message ? e.message : "Error.");
                }
              } finally {
                row.disabled = false;
                row.classList.remove("opacity-60", "cursor-not-allowed");
              }
            },
          });
          if (row) list.appendChild(row);
        });
      } catch (e) {
        if (thisReq !== reqSeq) return;
        console.error("[ItalianExperience] Candidate Available Offers load error:", e);
        list.innerHTML =
          '<div class="px-4 py-4 text-sm text-red-500">Unable to load offers.</div>';
      }
    }

    input.addEventListener(
      "input",
      debounce(function () {
        loadOffers((input.value || "").trim());
      }, 250)
    );

    loadOffers("");
  }

  function renderClientPositionsSection(opts) {
    var clientId = opts && opts.clientId ? String(opts.clientId) : "";
    var client = opts && opts.client ? opts.client : null;
    var mode = opts && opts.mode ? String(opts.mode) : "view";
    var isArchived = !!(opts && opts.isArchived);
    var insertAfterEl = opts && opts.insertAfterEl ? opts.insertAfterEl : null;

    var existing = document.getElementById("clientPositionsSection");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    if (!clientId || !client || mode !== "view" || isArchived) {
      return;
    }

    var wrapper = document.createElement("section");
    wrapper.id = "clientPositionsSection";
    wrapper.className = "mt-8";

    var card = document.createElement("div");
    card.className = "ie-card glass-card p-6 rounded-3xl";
    wrapper.appendChild(card);

    var header = document.createElement("div");
    header.className = "flex items-center justify-between gap-4 mb-4";
    var title = document.createElement("h3");
    title.className = "serif text-xl font-bold text-[#1b4332] section-title";
    title.textContent = "Client Positions";
    header.appendChild(title);
    card.appendChild(header);

    var content = document.createElement("div");
    card.appendChild(content);

    if (insertAfterEl && insertAfterEl.parentNode) {
      if (insertAfterEl.nextSibling) {
        insertAfterEl.parentNode.insertBefore(wrapper, insertAfterEl.nextSibling);
      } else {
        insertAfterEl.parentNode.appendChild(wrapper);
      }
    } else {
      var activity = document.getElementById("activity-container");
      if (activity && activity.parentNode) {
        activity.parentNode.insertBefore(wrapper, activity);
      } else {
        document.body.appendChild(wrapper);
      }
    }

    var state = {
      expandedOfferId: null,
      offerSearchTerms: {},
    };

    function getRequiredPositions(offer) {
      var required = offer && offer.positions_required != null ? Number(offer.positions_required) : null;
      if (!Number.isFinite(required)) required = offer && offer.positions != null ? Number(offer.positions) : null;
      if (!Number.isFinite(required)) required = 1;
      return required;
    }

    function getAssociatedCandidateIdSet(offer) {
      var assocs = offer && Array.isArray(offer.candidate_job_associations) ? offer.candidate_job_associations : [];
      var set = {};
      assocs.forEach(function (a) {
        if (!a) return;
        if (a.candidate_id) set[String(a.candidate_id)] = true;
      });
      return set;
    }

    async function loadOffers() {
      if (!window.IESupabase || typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
        content.innerHTML = '<div class="text-sm text-gray-400">Offers API not available.</div>';
        return;
      }
      content.innerHTML = '<div class="text-sm text-gray-400 py-2">Loading client offers...</div>';

      try {
        var result = await window.IESupabase.fetchJobOffersPaginated({
          filters: {
            archived: "active",
            excludeArchivedStatus: true,
            clientId: clientId,
          },
          page: 1,
          limit: 20,
        });
        if (!result || result.error) {
          content.innerHTML = '<div class="text-sm text-red-500">Unable to load client offers.</div>';
          return;
        }

        var rows = Array.isArray(result.data) ? result.data : [];
        var active = [];
        var closed = [];
        rows.forEach(function (o) {
          var s = normalizeOfferStatus(o && o.status);
          if (s === "closed") closed.push(o);
          else active.push(o);
        });

        content.innerHTML = "";
        if (!active.length && !closed.length) {
          content.innerHTML = '<div class="text-sm text-gray-400">No job offers found for this client.</div>';
          return;
        }

        function renderDivider(label) {
          var div = document.createElement("div");
          div.className = "my-4 flex items-center gap-3";
          var line1 = document.createElement("div");
          line1.className = "flex-1 h-px bg-gray-200";
          var text = document.createElement("div");
          text.className = "text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold";
          text.textContent = label;
          var line2 = document.createElement("div");
          line2.className = "flex-1 h-px bg-gray-200";
          div.appendChild(line1);
          div.appendChild(text);
          div.appendChild(line2);
          return div;
        }

        function renderOfferCard(offer) {
          var offerId = offer && offer.id ? String(offer.id) : "";
          if (!offerId) return null;

          var outer = document.createElement("div");
          outer.className = "rounded-2xl border border-gray-100 bg-white";
          outer.setAttribute("data-offer-card", offerId);

          var headerBtn = document.createElement("button");
          headerBtn.type = "button";
          headerBtn.className = "ie-btn ie-btn-secondary w-full text-left px-4 py-4 flex items-center justify-between gap-4";

          var left = document.createElement("div");
          left.className = "min-w-0";
          var t = document.createElement("div");
          t.className = "font-semibold text-gray-800 truncate";
          t.textContent = offer.title || "—";
          left.appendChild(t);

          var meta = document.createElement("div");
          meta.className = "mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap";
          meta.appendChild(createInlineBadge(formatOfferStatusLabel(offer.status), getOfferStatusBadgeClass(offer.status)));
          var req = getRequiredPositions(offer);
          var count = document.createElement("span");
          count.className = "text-xs font-semibold text-gray-600";
          count.textContent = "— / " + String(req);
          meta.appendChild(count);
          left.appendChild(meta);

          var chevron = document.createElement("div");
          chevron.className = "text-gray-400 flex-shrink-0 transition-transform transform";
          chevron.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>';

          headerBtn.appendChild(left);
          headerBtn.appendChild(chevron);
          outer.appendChild(headerBtn);

          var expand = document.createElement("div");
          expand.className = "px-4 pb-4 hidden";
          outer.appendChild(expand);

          function setExpanded(expanded) {
            if (expanded) {
              expand.classList.remove("hidden");
              chevron.classList.add("rotate-180");
            } else {
              expand.classList.add("hidden");
              chevron.classList.remove("rotate-180");
            }
          }

          headerBtn.addEventListener("click", function () {
            var isOpen = state.expandedOfferId === offerId;
            state.expandedOfferId = isOpen ? null : offerId;
            loadOffers();
          });

          if (state.expandedOfferId === offerId) {
            setExpanded(true);

            var sectionTitle = document.createElement("div");
            sectionTitle.className = "mt-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400";
            sectionTitle.textContent = "Available Candidates";
            expand.appendChild(sectionTitle);

            var input = document.createElement("input");
            input.type = "text";
            input.className = "form-input text-sm mt-3";
            input.placeholder = "Search candidate by name...";
            input.setAttribute("autocomplete", "off");
            input.value = state.offerSearchTerms[offerId] || "";
            expand.appendChild(input);

            var list = document.createElement("div");
            list.className = "mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
            expand.appendChild(list);

            var excluded = getAssociatedCandidateIdSet(offer);
            var reqSeq = 0;

            async function loadCandidates(term) {
              state.offerSearchTerms[offerId] = term || "";
              reqSeq += 1;
              var thisReq = reqSeq;

              if (!window.IESupabase || typeof window.IESupabase.fetchCandidatesPaginated !== "function") {
                list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Candidates API not available.</div>';
                return;
              }

              list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

              try {
                var res = await window.IESupabase.fetchCandidatesPaginated({
                  filters: { archived: "active", name: (term || "").toString() },
                  page: 1,
                  limit: 20,
                });
                if (thisReq !== reqSeq) return;
                if (!res || res.error) {
                  list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
                  return;
                }
                var rows = Array.isArray(res.data) ? res.data : [];
                var filtered = rows.filter(function (c) {
                  if (!c || !c.id) return false;
                  if (excluded[String(c.id)]) return false;
                  if (isCandidateHired(c)) return false;
                  return computeCandidateAvailability(c) === "available";
                });

                list.innerHTML = "";
                if (!filtered.length) {
                  list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">No candidates available.</div>';
                  return;
                }

                filtered.slice(0, 20).forEach(function (c) {
                  var row = renderInlineCandidateRow(c, {
                    onClick: async function (cand) {
                      if (!cand || !cand.id) return;
                      if (!window.IESupabase || typeof window.IESupabase.linkCandidateToJob !== "function") return;
                      row.disabled = true;
                      row.classList.add("opacity-60", "cursor-not-allowed");
                      try {
                        var linkRes = await window.IESupabase.linkCandidateToJob({
                          candidate_id: cand.id,
                          job_offer_id: offerId,
                        });
                        if (linkRes && linkRes.error) {
                          if (window.IESupabase && window.IESupabase.showError) {
                            window.IESupabase.showError(linkRes.error.message || "Linking error.");
                          }
                          return;
                        }
                        excluded[String(cand.id)] = true;
                        await loadOffers();
                      } catch (e) {
                        if (window.IESupabase && window.IESupabase.showError) {
                          window.IESupabase.showError(e && e.message ? e.message : "Error.");
                        }
                      } finally {
                        row.disabled = false;
                        row.classList.remove("opacity-60", "cursor-not-allowed");
                      }
                    },
                  });
                  if (row) list.appendChild(row);
                });
              } catch (e) {
                if (thisReq !== reqSeq) return;
                console.error("[ItalianExperience] Client offer candidates load error:", e);
                list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
              }
            }

            input.addEventListener(
              "input",
              debounce(function () {
                loadCandidates((input.value || "").trim());
              }, 250)
            );

            loadCandidates((input.value || "").trim());
          } else {
            setExpanded(false);
          }

          return outer;
        }

        active.forEach(function (o) {
          var cardEl = renderOfferCard(o);
          if (cardEl) content.appendChild(cardEl);
        });

        if (active.length && closed.length) {
          content.appendChild(renderDivider("Closed offers"));
        }

        closed.forEach(function (o) {
          var cardEl = renderOfferCard(o);
          if (cardEl) content.appendChild(cardEl);
        });
      } catch (e) {
        console.error("[ItalianExperience] Client Positions load error:", e);
        content.innerHTML = '<div class="text-sm text-red-500">Unable to load client offers.</div>';
      }
    }

    loadOffers();
  }

  // ---------------------------------------------------------------------------
  // Candidate profile sections (contact, summary, repeatable sections)
  // ---------------------------------------------------------------------------

  const PROFILE_SECTIONS = ["skills", "languages", "experience", "education", "certifications", "hobbies"];

  function updateRepeatableEmptyState(sectionEl) {
    if (!sectionEl) return;
    var itemsContainer = sectionEl.querySelector("[data-items]");
    var emptyState = sectionEl.querySelector(".empty-state");
    if (!itemsContainer || !emptyState) return;
    var items = itemsContainer.children.length;
    if (items > 0) {
      emptyState.style.display = "none";
    } else {
      emptyState.style.display = "";
    }
  }

  function getRepeatableSectionConfig(sectionName) {
    switch (sectionName) {
      case "skills":
        return {
          templateId: "skillItemTemplate",
          addAction: "add-skill",
          removeAction: "remove-skill",
        };
      case "languages":
        return {
          templateId: "languageItemTemplate",
          addAction: "add-language",
          removeAction: "remove-language",
        };
      case "experience":
        return {
          templateId: "experienceItemTemplate",
          addAction: "add-experience",
          removeAction: "remove-experience",
        };
      case "education":
        return {
          templateId: "educationItemTemplate",
          addAction: "add-education",
          removeAction: "remove-education",
        };
      case "certifications":
        return {
          templateId: "certificationItemTemplate",
          addAction: "add-certification",
          removeAction: "remove-certification",
        };
      case "hobbies":
        return {
          templateId: "hobbyItemTemplate",
          addAction: "add-hobby",
          removeAction: "remove-hobby",
        };
      default:
        return null;
    }
  }

  function addRepeatableItem(sectionName, form, values) {
    if (!form) return null;
    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return null;

    var sectionEl = form.querySelector('[data-repeatable-section="' + sectionName + '"]');
    if (!sectionEl) return null;
    var itemsContainer = sectionEl.querySelector('[data-items="' + sectionName + '"]');
    if (!itemsContainer) return null;

    var template = document.getElementById(config.templateId);
    if (!template || !template.content || !template.content.firstElementChild) return null;

    var row = template.content.firstElementChild.cloneNode(true);
    row.setAttribute("data-item-section", sectionName);

    var fields = row.querySelectorAll("[data-field]");
    fields.forEach(function (el) {
      var key = el.getAttribute("data-field");
      if (!key) return;
      var value = values && Object.prototype.hasOwnProperty.call(values, key) && values[key] != null ? values[key] : "";
      if (value != null && typeof value !== "string") {
        value = String(value);
      }
      if ("value" in el) {
        el.value = value;
      }
    });

    var removeButtons = row.querySelectorAll('[data-action="' + config.removeAction + '"]');
    removeButtons.forEach(function (btn) {
      if (btn.dataset.ieBoundRemove === "true") return;
      btn.dataset.ieBoundRemove = "true";
      btn.addEventListener("click", function () {
        var container = btn.closest("[data-item-section]");
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
        updateRepeatableEmptyState(sectionEl);
      });
    });

    itemsContainer.appendChild(row);
    updateRepeatableEmptyState(sectionEl);
    return row;
  }

  function renderRepeatableSection(options) {
    if (!options) return;
    var sectionName = options.sectionName;
    var form = options.form;
    var mode = options.mode;
    var items = options.items || [];
    if (!sectionName || !form) return;

    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return;

    var sectionEl = form.querySelector('[data-repeatable-section="' + sectionName + '"]');
    if (!sectionEl) return;
    var itemsContainer = sectionEl.querySelector('[data-items="' + sectionName + '"]');
    if (!itemsContainer) return;

    var template = document.getElementById(config.templateId);
    if (!template || !template.content || !template.content.firstElementChild) return;

    while (itemsContainer.firstChild) {
      itemsContainer.removeChild(itemsContainer.firstChild);
    }

    var rows = Array.isArray(items) ? items : [];
    rows.forEach(function (item) {
      addRepeatableItem(sectionName, form, item);
    });

    updateRepeatableEmptyState(sectionEl);

    var addBtn = sectionEl.querySelector('[data-action="' + config.addAction + '"]');
    if (addBtn) {
      if (mode === "view") {
        addBtn.style.display = "none";
      } else {
        addBtn.style.display = "";
        if (addBtn.dataset.ieBoundAdd !== "true") {
          addBtn.dataset.ieBoundAdd = "true";
          addBtn.addEventListener("click", function () {
            addRepeatableItem(sectionName, form, null);
          });
        }
      }
    }

    if (mode === "view") {
      var removeButtons = sectionEl.querySelectorAll('[data-action="' + config.removeAction + '"]');
      removeButtons.forEach(function (btn) {
        btn.style.display = "none";
      });
    }
  }

  function collectRepeatableItems(form, sectionName) {
    if (!form) return [];
    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return [];

    var sectionEl = form.querySelector('[data-repeatable-section="' + sectionName + '"]');
    if (!sectionEl) return [];
    var itemsContainer = sectionEl.querySelector('[data-items="' + sectionName + '"]');
    if (!itemsContainer) return [];

    var result = [];
    var children = itemsContainer.children;
    for (var i = 0; i < children.length; i++) {
      var row = children[i];
      var fields = row.querySelectorAll("[data-field]");
      var obj = {};
      var hasNonEmpty = false;

      fields.forEach(function (el) {
        var key = el.getAttribute("data-field");
        if (!key) return;
        var value = "";
        if ("value" in el && el.value != null) {
          value = el.value.toString().trim();
        }
        if (value !== "") {
          hasNonEmpty = true;
        }
        obj[key] = value;
      });

      if (hasNonEmpty) {
        result.push(obj);
      }
    }

    return result;
  }

  function collectCandidateProfileData(form) {
    function readField(name) {
      if (!form) return "";
      var el = form.querySelector('[name="' + name + '"]');
      if (!el || !("value" in el) || el.value == null) return "";
      return el.value.toString().trim();
    }

    var profile = {
      email: readField("email"),
      phone: readField("phone"),
      linkedin_url: readField("linkedin_url"),
      date_of_birth: readField("date_of_birth"),
      summary: readField("summary"),
    };

    PROFILE_SECTIONS.forEach(function (sectionName) {
      profile[sectionName] = collectRepeatableItems(form, sectionName);
    });

    return profile;
  }

  async function saveCandidateProfileChildren(candidateId, profile) {
    if (!candidateId) return { ok: true };
    if (typeof window === "undefined" || !window.IESupabase) return { ok: true };

    var api = window.IESupabase;
    var errorMessage = "Error saving candidate profile.";

    try {
      if (typeof api.replaceCandidateSkills === "function") {
        var skillsResult = await api.replaceCandidateSkills(
          candidateId,
          (profile && profile.skills) || []
        );
        if (skillsResult && skillsResult.error) {
          console.error("[ItalianExperience] replaceCandidateSkills error:", skillsResult.error);
          if (api.showError) api.showError(errorMessage, "replaceCandidateSkills");
          return { ok: false, error: skillsResult.error };
        }
      }

      if (typeof api.replaceCandidateLanguages === "function") {
        var languagesResult = await api.replaceCandidateLanguages(
          candidateId,
          (profile && profile.languages) || []
        );
        if (languagesResult && languagesResult.error) {
          console.error("[ItalianExperience] replaceCandidateLanguages error:", languagesResult.error);
          if (api.showError) api.showError(errorMessage, "replaceCandidateLanguages");
          return { ok: false, error: languagesResult.error };
        }
      }

      if (typeof api.replaceCandidateExperience === "function") {
        var experienceResult = await api.replaceCandidateExperience(
          candidateId,
          (profile && profile.experience) || []
        );
        if (experienceResult && experienceResult.error) {
          console.error("[ItalianExperience] replaceCandidateExperience error:", experienceResult.error);
          if (api.showError) api.showError(errorMessage, "replaceCandidateExperience");
          return { ok: false, error: experienceResult.error };
        }
      }

      if (typeof api.replaceCandidateEducation === "function") {
        var educationResult = await api.replaceCandidateEducation(
          candidateId,
          (profile && profile.education) || []
        );
        if (educationResult && educationResult.error) {
          console.error("[ItalianExperience] replaceCandidateEducation error:", educationResult.error);
          if (api.showError) api.showError(errorMessage, "replaceCandidateEducation");
          return { ok: false, error: educationResult.error };
        }
      }

      if (typeof api.replaceCandidateCertifications === "function") {
        var certificationsResult = await api.replaceCandidateCertifications(
          candidateId,
          (profile && profile.certifications) || []
        );
        if (certificationsResult && certificationsResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateCertifications error:",
            certificationsResult.error
          );
          if (api.showError) api.showError(errorMessage, "replaceCandidateCertifications");
          return { ok: false, error: certificationsResult.error };
        }
      }

      if (typeof api.replaceCandidateHobbies === "function") {
        var hobbiesResult = await api.replaceCandidateHobbies(
          candidateId,
          (profile && profile.hobbies) || []
        );
        if (hobbiesResult && hobbiesResult.error) {
          console.error("[ItalianExperience] replaceCandidateHobbies error:", hobbiesResult.error);
          if (api.showError) api.showError(errorMessage, "replaceCandidateHobbies");
          return { ok: false, error: hobbiesResult.error };
        }
      }
    } catch (err) {
      console.error("[ItalianExperience] saveCandidateProfileChildren exception:", err);
      if (api.showError) api.showError(errorMessage, "saveCandidateProfileChildren");
      return { ok: false, error: err };
    }

    return { ok: true };
  }

  async function logCandidateProfileUpdated(candidateId) {
    if (
      !candidateId ||
      typeof window === "undefined" ||
      !window.IESupabase ||
      typeof window.IESupabase.createAutoLog !== "function"
    ) {
      return;
    }

    try {
      await window.IESupabase.createAutoLog("candidate", candidateId, {
        event_type: "updated",
        message: "Candidate profile updated",
        metadata: null,
      });
    } catch (err) {
      // Logging failures should never block the UI.
      console.error("[ItalianExperience] logCandidateProfileUpdated error:", err);
    }
  }

  function initCandidateProfileSections(form, mode, candidate) {
    if (!form) return;

    // Single-value fields from main candidate row
    var emailEl = form.querySelector('[name="email"]');
    var phoneEl = form.querySelector('[name="phone"]');
    var linkedinEl = form.querySelector('[name="linkedin_url"]');
    var dobEl = form.querySelector('[name="date_of_birth"]');
    var summaryEl = form.querySelector('[name="summary"]');

    if (candidate) {
      if (emailEl) emailEl.value = (candidate.email || "").toString();
      if (phoneEl) phoneEl.value = (candidate.phone || "").toString();
      if (linkedinEl) linkedinEl.value = (candidate.linkedin_url || "").toString();
      if (dobEl) dobEl.value = candidate.date_of_birth || "";
      if (summaryEl) summaryEl.value = candidate.summary || "";
    }

    // Initialize repeatable sections with empty state and add handlers.
    PROFILE_SECTIONS.forEach(function (sectionName) {
      renderRepeatableSection({
        sectionName: sectionName,
        items: [],
        form: form,
        mode: mode,
      });
    });

    document.querySelectorAll("[data-repeatable-section]").forEach(function (section) {
      updateRepeatableEmptyState(section);
    });

    if (
      mode === "create" ||
      !candidate ||
      !candidate.id ||
      typeof window === "undefined" ||
      !window.IESupabase
    ) {
      return;
    }

    var api = window.IESupabase;
    var candidateId = candidate.id;

    var skillsPromise =
      typeof api.getCandidateSkills === "function"
        ? api.getCandidateSkills(candidateId)
        : Promise.resolve({ data: [], error: null });
    var languagesPromise =
      typeof api.getCandidateLanguages === "function"
        ? api.getCandidateLanguages(candidateId)
        : Promise.resolve({ data: [], error: null });
    var experiencePromise =
      typeof api.getCandidateExperience === "function"
        ? api.getCandidateExperience(candidateId)
        : Promise.resolve({ data: [], error: null });
    var educationPromise =
      typeof api.getCandidateEducation === "function"
        ? api.getCandidateEducation(candidateId)
        : Promise.resolve({ data: [], error: null });
    var certificationsPromise =
      typeof api.getCandidateCertifications === "function"
        ? api.getCandidateCertifications(candidateId)
        : Promise.resolve({ data: [], error: null });
    var hobbiesPromise =
      typeof api.getCandidateHobbies === "function"
        ? api.getCandidateHobbies(candidateId)
        : Promise.resolve({ data: [], error: null });

    Promise.all([
      skillsPromise,
      languagesPromise,
      experiencePromise,
      educationPromise,
      certificationsPromise,
      hobbiesPromise,
    ])
      .then(function (results) {
        var sections = ["skills", "languages", "experience", "education", "certifications", "hobbies"];
        results.forEach(function (result, index) {
          var sectionName = sections[index];
          if (result && result.error) {
            console.error(
              "[ItalianExperience] load candidate " + sectionName + " error:",
              result.error
            );
            if (api.showError) {
              api.showError(
                "Unable to load candidate profile section.",
                "loadCandidate" + sectionName.charAt(0).toUpperCase() + sectionName.slice(1)
              );
            }
            return;
          }
          var items = (result && result.data) || [];
          renderRepeatableSection({
            sectionName: sectionName,
            items: items,
            form: form,
            mode: mode,
          });
        });
      })
      .catch(function (err) {
        console.error("[ItalianExperience] load candidate profile sections error:", err);
      });
  }

  /**
   * Add/Edit/View candidate page: create mode (no id), or load candidate by id and apply lifecycle (edit/view).
   */
  function initAddCandidatePage() {
    const params = IERouter.getCandidatePageParams();
    const candidateId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#candidateForm");
    if (!form) return;

    if (!candidateId) {
      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = "Add New Candidate";
      if (docTitleEl) docTitleEl.textContent = "Add New Candidate | Italian Experience Recruitment";
      initCandidateProfileSections(form, "create", null);
      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "candidate",
          entityId: null,
          status: "active",
          mode: "edit",
          containerId: "candidateActions",
          formId: "candidateForm",
        });
      }
      return;
    }

    if (!window.IESupabase || !window.IESupabase.getCandidateById) {
      if (window.IESupabase && window.IESupabase.showError) window.IESupabase.showError("Supabase non disponibile.");
      return;
    }

    window.IESupabase.getCandidateById(candidateId).then(function (result) {
      if (result.error) {
        if (window.IESupabase.showError) {
          window.IESupabase.showError(result.error.message || "Candidato non trovato.");
        }
        IERouter.navigateTo("candidates.html");
        return;
      }
      const candidate = result.data;
      if (!candidate) {
        if (window.IESupabase.showError) {
          window.IESupabase.showError("Candidato non trovato.");
        }
        IERouter.navigateTo("candidates.html");
        return;
      }

      candidateOriginalStatus = (candidate.status || "new").toString();

      const lifecycleStatus = candidate.is_archived ? "archived" : "active";
      const effectiveMode = IEToolbar.resolveEntityMode(lifecycleStatus, requestedMode);

      const firstNameEl = form.querySelector('[name="first_name"]');
      const lastNameEl = form.querySelector('[name="last_name"]');
      const addressEl = form.querySelector('[name="address"]');
      const positionEl = form.querySelector('[name="position"]');
      const statusEl = form.querySelector('[name="status"]');
      const sourceEl = form.querySelector('[name="source"]');
      const notesEl = form.querySelector('[name="notes"]');
      const photoInputEl = form.querySelector('[name="foto_file"]');
      const cvInputEl = form.querySelector('[name="cv_file"]');
      const previewImg = document.getElementById("candidatePhotoPreview");
      if (firstNameEl) firstNameEl.value = candidate.first_name || "";
      if (lastNameEl) lastNameEl.value = candidate.last_name || "";
      if (addressEl) addressEl.value = candidate.address || "";
      if (positionEl) positionEl.value = candidate.position || "";
      if (statusEl) statusEl.value = candidate.status || "new";
      if (sourceEl) sourceEl.value = candidate.source || "";
      if (notesEl) notesEl.value = candidate.notes || "";

      if (photoInputEl) {
        photoInputEl.dataset.currentPath = candidate.photo_url || "";
      }
      if (cvInputEl) {
        cvInputEl.dataset.currentPath = candidate.cv_url || "";
      }

      if (previewImg && candidate.photo_url && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        window.IESupabase
          .createSignedCandidateUrl(candidate.photo_url)
          .then(function (signedUrl) {
            if (signedUrl) {
              previewImg.src = signedUrl;
              previewImg.dataset.storagePath = candidate.photo_url;
            }
          })
          .catch(function () {
            // Ignore preview errors to avoid impacting page lifecycle.
          });
      }

      function setFormReadonly(readonly) {
        const fields = form.querySelectorAll("input, textarea, select");
        fields.forEach(function (field) {
          if (field.type === "hidden") return;
          if (field.tagName === "SELECT") {
            field.disabled = !!readonly;
          } else {
            field.readOnly = !!readonly;
            field.disabled = false;
          }
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

      initCandidateProfileSections(form, effectiveMode, candidate);
      setFormReadonly(effectiveMode === "view");

      if (typeof renderCandidateFileState === "function") {
        renderCandidateFileState("photo", candidate, effectiveMode);
        renderCandidateFileState("cv", candidate, effectiveMode);
      }

      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = effectiveMode === "view" ? "View Candidate" : "Edit Candidate";
      if (docTitleEl) docTitleEl.textContent = (effectiveMode === "view" ? "View Candidate" : "Edit Candidate") + " | Italian Experience Recruitment";

      function onEdit() {
        IERouter.navigateTo(window.IEPortal.links.candidateEdit(candidateId));
      }

      async function onArchive() {
        const res = await window.IESupabase.archiveCandidate(candidateId);
        if (!res.error) {
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", candidateId, {
                event_type: "system_event",
                message: "Candidate archived",
                metadata: null,
              })
              .catch(function () {});
          }
          IERouter.navigateTo("candidates.html");
        }
      }

      async function onReopen() {
        const res = await window.IESupabase.unarchiveCandidate(candidateId);
        if (!res.error) {
          candidate.is_archived = false;
          if (
            typeof window !== "undefined" &&
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", candidateId, {
                event_type: "system_event",
                message: "Candidate restored",
                metadata: null,
              })
              .catch(function () {});
          }
          if (typeof renderEntityToolbar === "function") {
            IEToolbar.renderEntityToolbar({
              entityType: "candidate",
              entityId: candidateId,
              status: "active",
              mode: "view",
              containerId: "candidateActions",
              formId: "candidateForm",
              onEdit: onEdit,
              onArchive: onArchive,
              onReopen: onReopen,
            });
          }
        }
      }

      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "candidate",
          entityId: candidateId,
          status: lifecycleStatus,
          mode: effectiveMode,
          containerId: "candidateActions",
          formId: "candidateForm",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
        });
      }

      var existingCandidateMeta = document.getElementById("candidateMetadata");
      if (existingCandidateMeta && existingCandidateMeta.parentNode) {
        existingCandidateMeta.parentNode.removeChild(existingCandidateMeta);
      }

      var metadataContainer = document.createElement("div");
      metadataContainer.id = "candidateMetadata";
      if (form && form.parentNode) {
        form.parentNode.appendChild(metadataContainer);
      }
      metadataContainer.innerHTML = renderEntityMetadata(candidate);

      renderCandidateAvailableOffersSection({
        candidateId: candidateId,
        candidate: candidate,
        mode: effectiveMode,
        isArchived: !!candidate.is_archived,
        insertAfterEl: metadataContainer,
      });

      if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
        window.ActivitySection.init({
          entityType: "candidate",
          entityId: candidateId,
          container: document.getElementById("activity-container"),
        });
      }
    });
  }

  /**
   * Add/Edit/View client page: create mode (no id), or load client by id and apply lifecycle (edit/view).
   */
  function initAddClientePage() {
    const params = IERouter.getClientPageParams();
    const clientId = params.id;
    const requestedMode = params.mode;
    const form = document.querySelector("#clientForm");
    if (!form) return;

    if (!clientId) {
      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "client",
          entityId: null,
          status: "active",
          mode: "edit",
          containerId: "clientActions",
          formId: "clientForm",
        });
      }
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
      const effectiveMode = IEToolbar.resolveEntityMode(lifecycleStatus, requestedMode);

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
          if (field.tagName === "SELECT") {
            field.disabled = !!readonly;
          } else {
            field.readOnly = !!readonly;
            field.disabled = false;
          }
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

      var clientHeaderTitle = (client.name && String(client.name).trim()) || "Client";
      const headerTitleEl = document.querySelector("header h1");
      const docTitleEl = document.querySelector("title");
      if (headerTitleEl) headerTitleEl.textContent = clientHeaderTitle;
      if (docTitleEl) docTitleEl.textContent = clientHeaderTitle + " | Italian Experience Recruitment";
      window.pageMeta = {
        title: clientHeaderTitle,
        breadcrumbs: [
          { label: "Dashboard", path: "dashboard.html" },
          { label: "Clients", path: "clients.html" },
          { label: clientHeaderTitle }
        ]
      };
      if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
        window.IEPortal.mountPageHeader();
      }

      function onEdit() {
        IERouter.navigateTo("add-client.html?id=" + encodeURIComponent(clientId) + "&mode=edit");
      }
      function onArchive() {
        return window.IESupabase.archiveClient(clientId).then(function (res) {
          if (!res.error) {
            if (
              typeof window !== "undefined" &&
              window.IESupabase &&
              typeof window.IESupabase.createAutoLog === "function"
            ) {
              window.IESupabase
                .createAutoLog("client", clientId, {
                  event_type: "system_event",
                  message: "Client archived",
                  metadata: null,
                })
                .catch(function () {});
            }
            IERouter.navigateTo("clients.html");
          }
        });
      }
      function onReopen() {
        return window.IESupabase.unarchiveClient(clientId).then(function (res) {
          if (!res.error) {
            client.is_archived = false;
            if (
              typeof window !== "undefined" &&
              window.IESupabase &&
              typeof window.IESupabase.createAutoLog === "function"
            ) {
              window.IESupabase
                .createAutoLog("client", clientId, {
                  event_type: "system_event",
                  message: "Client restored",
                  metadata: null,
                })
                .catch(function () {});
            }
            if (typeof renderEntityToolbar === "function") {
              IEToolbar.renderEntityToolbar({
                entityType: "client",
                entityId: clientId,
                status: "active",
                mode: "view",
                containerId: "clientActions",
                formId: "clientForm",
                onEdit: onEdit,
                onArchive: onArchive,
                onReopen: onReopen,
              });
            }
          }
        });
      }

      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "client",
          entityId: clientId,
          status: lifecycleStatus,
          mode: effectiveMode,
          containerId: "clientActions",
          formId: "clientForm",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
        });
      }

      var existingClientMeta = document.getElementById("clientMetadata");
      if (existingClientMeta && existingClientMeta.parentNode) {
        existingClientMeta.parentNode.removeChild(existingClientMeta);
      }

      var metadataContainer = document.createElement("div");
      metadataContainer.id = "clientMetadata";
      if (form && form.parentNode) {
        form.parentNode.appendChild(metadataContainer);
      }
      metadataContainer.innerHTML = renderEntityMetadata(client);

      renderClientPositionsSection({
        clientId: clientId,
        client: client,
        mode: effectiveMode,
        isArchived: !!client.is_archived,
        insertAfterEl: metadataContainer,
      });

      if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
        window.ActivitySection.init({
          entityType: "client",
          entityId: clientId,
          container: document.getElementById("activity-container"),
        });
      }
    });
  }

  /**
   * Update candidate from edit form (Supabase only).
   */
  function updateCandidateFromForm(id, formData, form) {
    if (!id) return;

    var profile = collectCandidateProfileData(form);

    const payload = {
      first_name: (formData.get("first_name") || "").toString().trim(),
      last_name: (formData.get("last_name") || "").toString().trim(),
      address: (formData.get("address") || "").toString().trim(),
      position: (formData.get("position") || "").toString().trim(),
      status: (formData.get("status") || "new").toString(),
      source: (formData.get("source") || "").toString(),
      notes: (formData.get("notes") || "").toString(),
      email: profile.email || null,
      phone: profile.phone || null,
      linkedin_url: profile.linkedin_url || null,
      date_of_birth: profile.date_of_birth || null,
      summary: profile.summary || null,
    };
    var newStatus = payload.status;
    window.IESupabase.updateCandidate(id, payload).then(async function (result) {
      if (result.error) {
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error while saving.");
        return;
      }

      var childrenResult = await saveCandidateProfileChildren(id, profile);
      if (!childrenResult || childrenResult.ok === false) {
        // Error already shown inside saveCandidateProfileChildren.
        return;
      }

      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Candidato aggiornato.");

      if (
        typeof window !== "undefined" &&
        window.IESupabase &&
        typeof window.IESupabase.createAutoLog === "function" &&
        candidateOriginalStatus &&
        newStatus &&
        candidateOriginalStatus !== newStatus
      ) {
        window.IESupabase
          .createAutoLog("candidate", id, {
            event_type: "status_change",
            message: "Status changed from " + candidateOriginalStatus + " to " + newStatus,
            metadata: { from: candidateOriginalStatus, to: newStatus },
          })
          .catch(function () {});
      }

      candidateOriginalStatus = newStatus;

      if (window.IESupabase && typeof window.IESupabase.getCandidateById === "function") {
        window.IESupabase
          .getCandidateById(id)
          .then(function (freshResult) {
            if (freshResult && !freshResult.error && freshResult.data) {
              var metadataEl = document.getElementById("candidateMetadata");
              if (metadataEl) {
                metadataEl.innerHTML = renderEntityMetadata(freshResult.data);
              }
            }
          })
          .catch(function () {
            // Ignore metadata refresh errors to avoid impacting save flow.
          });
      }

      await logCandidateProfileUpdated(id);
      IERouter.redirectToEntityView("candidate", id);
    });
  }

  /**
   * Update client from edit form (Supabase only).
   */
  function updateClientFromForm(id, formData) {
    if (!id) return;

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
        if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error while saving.");
        return;
      }
      if (window.IESupabase.showSuccess) window.IESupabase.showSuccess("Cliente aggiornato.");

      if (window.IESupabase && typeof window.IESupabase.getClientById === "function") {
        window.IESupabase
          .getClientById(id)
          .then(function (freshResult) {
            if (freshResult && !freshResult.error && freshResult.data) {
              var metadataEl = document.getElementById("clientMetadata");
              if (metadataEl) {
                metadataEl.innerHTML = renderEntityMetadata(freshResult.data);
              }
            }
          })
          .catch(function () {
            // Ignore metadata refresh errors to avoid impacting save flow.
          });
      }

      IERouter.redirectToEntityView("client", id);
    });
  }

  function renderEntityMetadata(entity) {
    if (!entity) return "";

    function formatDate(value) {
      if (!value) return null;
      try {
        return new Date(value).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
      } catch (_) {
        return value;
      }
    }

    function getFullName(profile) {
      if (!profile) return "";
      var first = (profile.first_name || "").toString().trim();
      var last = (profile.last_name || "").toString().trim();
      var parts = [];
      if (first) parts.push(first);
      if (last) parts.push(last);
      return parts.join(" ");
    }

    var createdDate = formatDate(entity.created_at);
    var createdName = getFullName(entity.created_by_profile);
    var createdParts = [];
    if (createdDate) createdParts.push(createdDate);
    if (createdName) createdParts.push(createdName);
    var createdText = createdParts.length ? createdParts.join(" \u2022 ") : "\u2014";

    var updatedDate = formatDate(entity.updated_at);
    var updatedName = getFullName(entity.updated_by_profile);
    var updatedParts = [];
    if (updatedDate) updatedParts.push(updatedDate);
    if (updatedName) updatedParts.push(updatedName);
    var updatedText = updatedParts.length ? updatedParts.join(" \u2022 ") : "\u2014";

    var html =
      '<div class="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 space-y-1">' +
      '<div><strong>Created:</strong> ' +
      createdText +
      "</div>" +
      '<div><strong>Updated:</strong> ' +
      updatedText +
      "</div>" +
      "</div>"
    ;

    return html;
  }

  function setPageMode(mode, id) {
    const form = document.querySelector("#jobOfferForm");
    if (!form) return;

    const params = IERouter.getJobOfferPageParams();
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
        if (field.tagName === "SELECT") {
          field.disabled = !!disabled;
        } else {
          field.readOnly = !!disabled;
          field.disabled = false;
        }
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
      IERouter.navigateTo("job-offers.html");
  }

  // Expose selected helpers on the global IEPortal namespace for cross-module reuse.
  window.IEPortal = window.IEPortal || {};
  window.IEPortal.renderEntityMetadata = renderEntityMetadata;

  async function openReopenOfferModal(offerId, offer, options) {
      var oldStatus = offer && offer.status ? offer.status.toString() : null;
      var onConfirm = options && typeof options.onConfirm === "function" ? options.onConfirm : null;
      var hiredCount = 0;
      if (window.IESupabase && window.IESupabase.fetchCandidatesForJobOffer) {
        try {
          var result = await window.IESupabase.fetchCandidatesForJobOffer(offerId);
          if (result && result.data && Array.isArray(result.data)) {
            hiredCount = result.data.filter(function (a) { return a.status === "hired"; }).length;
          }
        } catch (e) {
          hiredCount = 0;
        }
      }
      var positionsValue = offer && offer.positions != null ? String(offer.positions) : "";
      openModal({
        title: "Reopen Job Offer?",
        fullPageHref: null,
        render: function (mount) {
          mount.innerHTML =
            "<p class=\"text-gray-700 text-sm mb-4\">This job offer is closed. Reopen it to edit, add candidates, or mark someone as hired.</p>" +
            "<div class=\"mb-4\">" +
            "<label class=\"block text-sm font-medium text-gray-700 mb-1\">Number of positions</label>" +
            "<input type=\"number\" min=\"1\" data-reopen-positions class=\"form-input w-full text-sm py-2 px-3 rounded-lg border border-gray-300\" value=\"" + (positionsValue.replace(/"/g, "&quot;")) + "\" />" +
            "<div data-reopen-error class=\"text-red-500 text-xs hidden mt-1\"></div>" +
            "</div>" +
            "<div class=\"flex gap-3 mt-4\">" +
            "<button type=\"button\" data-reopen-confirm class=\"ie-btn ie-btn-success\">Confirm</button>" +
            "<button type=\"button\" data-ie-modal-close class=\"ie-btn ie-btn-secondary\">Cancel</button>" +
            "</div>";
          var positionsInput = mount.querySelector("[data-reopen-positions]");
          var errorEl = mount.querySelector("[data-reopen-error]");
          var confirmBtn = mount.querySelector("[data-reopen-confirm]");
          function validatePositions() {
            var positions = Number(positionsInput.value);
            var valid = Number.isFinite(positions) && positions >= 1 && positions > hiredCount;
            if (!valid) {
              errorEl.textContent = "You already hired " + hiredCount + " candidate(s). Increase positions above " + hiredCount + ".";
              errorEl.classList.remove("hidden");
              confirmBtn.disabled = true;
              confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
            } else {
              errorEl.textContent = "";
              errorEl.classList.add("hidden");
              confirmBtn.disabled = false;
              confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
          }
          if (positionsInput) positionsInput.addEventListener("input", validatePositions);
          validatePositions();
          if (confirmBtn) {
            confirmBtn.addEventListener("click", async function () {
              var positions = Number(positionsInput.value);
              if (!Number.isFinite(positions) || positions <= hiredCount) return;
              if (confirmBtn.disabled) return;
              confirmBtn.disabled = true;
              try {
                var statusResult = null;
                if (window.IESupabase && window.IESupabase.updateJobOfferStatus) {
                  statusResult = await window.IESupabase.updateJobOfferStatus(offerId, "active");
                  if (statusResult && statusResult.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(statusResult.error.message || "Error.");
                    return;
                  }
                }
                if (window.IESupabase && window.IESupabase.updateJobOffer) {
                  var payload = {
                    client_id: offer && offer.client_id != null ? offer.client_id : null,
                    title: (offer && offer.title != null && offer.title !== undefined) ? offer.title : "",
                    position: (offer && offer.position != null) ? offer.position : null,
                    description: (offer && offer.description != null) ? offer.description : null,
                    requirements: (offer && offer.requirements != null) ? offer.requirements : null,
                    notes: (offer && offer.notes != null) ? offer.notes : null,
                    salary: (offer && offer.salary != null) ? offer.salary : null,
                    contract_type: (offer && offer.contract_type != null) ? offer.contract_type : null,
                    positions: positions,
                    city: (offer && offer.city != null) ? offer.city : null,
                    state: (offer && offer.state != null) ? offer.state : null,
                    deadline: (offer && offer.deadline != null) ? offer.deadline : null,
                    status: "active"
                  };
                  var updateResult = await window.IESupabase.updateJobOffer(offerId, payload);
                  if (updateResult && updateResult.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(updateResult.error.message || "Error updating positions.");
                    var fallbackOffer = (statusResult && statusResult.data)
                      ? Object.assign({}, offer || {}, statusResult.data, { positions: positions })
                      : (offer ? Object.assign({}, offer, { status: "active", positions: positions }) : { status: "active", positions: positions });
                    if (onConfirm) await onConfirm(fallbackOffer);
                    closeModal();
                    return;
                  }
                }
                var newStatus = statusResult && statusResult.data && statusResult.data.status ? statusResult.data.status.toString() : "active";
                if (
                  typeof window !== "undefined" &&
                  window.IESupabase &&
                  typeof window.IESupabase.createAutoLog === "function" &&
                  oldStatus &&
                  newStatus &&
                  oldStatus !== newStatus
                ) {
                  window.IESupabase
                    .createAutoLog("job_offer", offerId, {
                      event_type: "status_change",
                      message: "Status changed from " + oldStatus + " to " + newStatus,
                      metadata: { from: oldStatus, to: newStatus },
                    })
                    .catch(function () {});
                }
                var updatedOffer = offer ? Object.assign({}, offer, { status: "active", positions: positions }) : { status: "active", positions: positions };
                if (statusResult && statusResult.data) {
                  updatedOffer.status = statusResult.data.status;
                  if (statusResult.data.positions != null) updatedOffer.positions = statusResult.data.positions;
                }
                if (onConfirm) await onConfirm(updatedOffer);
                closeModal();
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(e && e.message ? e.message : "Error.");
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
      var oldStatus = offer && offer.status ? offer.status.toString() : null;
      function reloadPage() {
        window.location.reload();
      }
      var effectiveModeForToolbar =
        modeToRender === "view" ? "view" : "edit";
      if (typeof renderEntityToolbar === "function") {
        IEToolbar.renderEntityToolbar({
          entityType: "job-offer",
          entityId: offerId,
          status: offer ? offer.status : "active",
          mode: effectiveModeForToolbar,
          containerId: "jobOfferActions",
          formId: "jobOfferForm",
          onEdit: function () {
            IERouter.navigateTo(window.IEPortal.links.offerEdit(offerId));
          },
          onClose: async function () {
            if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
            var result = await window.IESupabase.updateJobOfferStatus(offerId, "closed");
            if (result && result.error && window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error.");
            } else {
              var newStatus =
                result && result.data && result.data.status
                  ? result.data.status.toString()
                  : "closed";
              if (
                typeof window !== "undefined" &&
                window.IESupabase &&
                typeof window.IESupabase.createAutoLog === "function" &&
                oldStatus &&
                newStatus &&
                oldStatus !== newStatus
              ) {
                window.IESupabase
                  .createAutoLog("job_offer", offerId, {
                    event_type: "status_change",
                    message: "Status changed from " + oldStatus + " to " + newStatus,
                    metadata: { from: oldStatus, to: newStatus },
                  })
                  .catch(function () {});
              }
              reloadPage();
            }
          },
          onArchive: async function () {
            if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) return;
            var result = await window.IESupabase.updateJobOfferStatus(offerId, "archived");
            if (result && result.error && window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error.");
            } else {
              var newStatus =
                result && result.data && result.data.status
                  ? result.data.status.toString()
                  : "archived";
              if (
                typeof window !== "undefined" &&
                window.IESupabase &&
                typeof window.IESupabase.createAutoLog === "function" &&
                oldStatus &&
                newStatus &&
                oldStatus !== newStatus
              ) {
                window.IESupabase
                  .createAutoLog("job_offer", offerId, {
                    event_type: "status_change",
                    message: "Status changed from " + oldStatus + " to " + newStatus,
                    metadata: { from: oldStatus, to: newStatus },
              })
              .catch(function () {});
            }
              IERouter.navigateTo("job-offers.html");
            }
          },
          onReopen: function () {
            openReopenOfferModal(offerId, offer, {
              onConfirm: async function (updatedOffer) {
                populateFormFromOffer(updatedOffer);
                renderActionButtons("view", offerId, updatedOffer);
                renderOfferStatusBadge(updatedOffer.status);
                renderAssociatedCandidates(offerId, updatedOffer);
              },
            });
          },
        });
      }

    }

    function renderOfferStatusBadge(status) {
      var el = document.getElementById("jobOfferHeaderStatus");
      if (!el) return;
      var normalized = IEToolbar.normalizeStatus(status);
      var badgeClass = "badge ";
      var label = "Active";
      if (normalized === "active") {
        badgeClass += "badge-open";
        label = "Active";
      } else if (normalized === "closed") {
        badgeClass += "badge-closed";
        label = "Closed";
      } else if (normalized === "archived") {
        badgeClass += "bg-gray-200 text-gray-600";
        label = "Archived";
      } else {
        badgeClass += "badge-open";
        label = "Active";
      }
      el.innerHTML = "<span class=\"" + badgeClass + "\">" + escapeHtml(label) + "</span>";
    }

    var STATUS_OPTIONS = APPLICATION_STATUS_CANONICAL;

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
        glassCard.className = "ie-card glass-card p-6 rounded-3xl overflow-x-auto";
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
          var candidateId = c && c.id ? c.id : null;
          var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
          var position = (c.position && c.position.toString()) || "—";
          var status = normalizeApplicationStatusForDisplay((item.status && item.status.toString()) || "applied");
          var rejectionReason = item.rejection_reason || null;
          var tr = document.createElement("tr");
          tr.className = "border-b border-gray-100";
          tr.setAttribute("data-row-association-id", item.id);
          var tdName = document.createElement("td");
          tdName.className = "py-3 text-sm";
          if (candidateId) {
            var nameLink = document.createElement("a");
            nameLink.href = window.IEPortal.links.candidateView(candidateId);
            nameLink.className = "text-[#1b4332] font-semibold hover:underline";
            nameLink.textContent = name;
            tdName.appendChild(nameLink);
          } else {
            tdName.textContent = name;
          }
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
            option.textContent = formatApplicationStatusLabel(opt);
            if (opt === status) option.selected = true;
            select.appendChild(option);
          });
          var previousStatus = status;

          var rejectionBtn = null;
          function ensureRejectionButton() {
            if (rejectionBtn) return;
            rejectionBtn = document.createElement("button");
            rejectionBtn.type = "button";
            rejectionBtn.className = "mt-2 text-xs text-[#1b4332] font-semibold hover:underline block text-left";
            rejectionBtn.textContent = rejectionReason ? "View / Edit rejection reason" : "Add rejection reason";
            rejectionBtn.addEventListener("click", function () {
              openAssociationRejectionModal({
                associationId: item.id,
                candidateName: name,
                jobTitle: offer && offer.title ? String(offer.title) : "this job",
                initialReason: rejectionReason,
                onSaved: function (newReason) {
                  rejectionReason = newReason;
                  if (rejectionBtn) {
                    rejectionBtn.textContent = newReason ? "View / Edit rejection reason" : "Add rejection reason";
                  }
                  previousStatus = "rejected";
                  select.value = "rejected";
                  var statusCell = tr.querySelector(".status-cell");
                  if (statusCell) {
                    statusCell.innerHTML = "";
                    var badgeEl = document.createElement("span");
                    badgeEl.className = "badge " + getApplicationStatusBadgeClass("rejected");
                    badgeEl.textContent = formatApplicationStatusLabel("rejected");
                    statusCell.appendChild(badgeEl);
                  }
                },
              });
            });
            tdChange.appendChild(rejectionBtn);
          }

          function removeRejectionButton() {
            if (rejectionBtn && rejectionBtn.parentNode) {
              rejectionBtn.parentNode.removeChild(rejectionBtn);
            }
            rejectionBtn = null;
          }

          if (status === "rejected") {
            ensureRejectionButton();
          }

          select.addEventListener("change", async function () {
            var associationId = select.getAttribute("data-association-id");
            var newStatus = select.value;

            if (newStatus === "rejected") {
              // Keep visual status unchanged until the recruiter confirms in the modal.
              select.value = previousStatus;
              openAssociationRejectionModal({
                associationId: associationId,
                candidateName: name,
                jobTitle: offer && offer.title ? String(offer.title) : "this job",
                initialReason: rejectionReason,
                onSaved: function (newReason) {
                  rejectionReason = newReason;
                  previousStatus = "rejected";
                  select.value = "rejected";
                  var statusCell = tr.querySelector(".status-cell");
                  if (statusCell) {
                    statusCell.innerHTML = "";
                    var badgeEl = document.createElement("span");
                    badgeEl.className = "badge " + getApplicationStatusBadgeClass("rejected");
                    badgeEl.textContent = formatApplicationStatusLabel("rejected");
                    statusCell.appendChild(badgeEl);
                  }
                  ensureRejectionButton();
                  if (rejectionBtn) {
                    rejectionBtn.textContent = newReason ? "View / Edit rejection reason" : "Add rejection reason";
                  }
                },
              });
              return;
            }

            var statusSelect = document.querySelector('#jobOfferForm [name="status"]');
            var normalizedOfferStatus = statusSelect
              ? IEToolbar.normalizeStatus(statusSelect.value)
              : "active";
            if (normalizedOfferStatus === "closed" && newStatus === "hired") {
              select.value = previousStatus;
              openReopenOfferModal(jobOfferId, offer, {
                onConfirm: async function (updatedOffer) {
                  populateFormFromOffer(updatedOffer);
                  renderActionButtons("view", jobOfferId, updatedOffer);
                  if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
                  var hireRes = await window.IESupabase.updateCandidateAssociationStatus(associationId, "hired");
                  if (hireRes.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(hireRes.error.message || "Error updating status.");
                    throw new Error(hireRes.error.message || "Error updating status.");
                  }
                  await renderAssociatedCandidates(jobOfferId, updatedOffer);
                },
              });
              return;
            }
            if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
            var res = await window.IESupabase.updateCandidateAssociationStatus(associationId, newStatus);
            if (res.error) {
              if (window.IESupabase.showError) window.IESupabase.showError(res.error.message || "Error updating status.");
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
            previousStatus = newStatus;
            if (newStatus !== "rejected") {
              removeRejectionButton();
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
              if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error removing.");
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
        var existingWrap = container.querySelector("[data-assoc-inline-wrap='joboffer-add-candidate']");
        if (existingWrap) {
          existingWrap.remove();
          addCandidateBtn.setAttribute("aria-expanded", "false");
          return;
        }
        showAddCandidateInlinePanel(container, addCandidateBtn, jobOfferId, associatedCandidateIds, function () {
          renderAssociatedCandidates(jobOfferId, offer);
        });
        addCandidateBtn.setAttribute("aria-expanded", "true");
      });
      addCandidateWrap.appendChild(addCandidateBtn);
      container.appendChild(addCandidateWrap);
    }

    function showAddCandidateInlinePanel(container, triggerBtn, jobOfferId, associatedCandidateIds, onLinked) {
      var wrap = document.createElement("div");
      wrap.className = "mt-3 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm";
      wrap.setAttribute("data-assoc-inline-wrap", "joboffer-add-candidate");

      var inputRow = document.createElement("div");
      inputRow.className = "flex flex-col sm:flex-row gap-2 sm:items-center";

      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search candidate by name...";
      input.className = "form-input flex-1 text-sm";
      input.setAttribute("autocomplete", "off");

      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all";
      cancelBtn.textContent = "Cancel";

      inputRow.appendChild(input);
      inputRow.appendChild(cancelBtn);
      wrap.appendChild(inputRow);

      var list = document.createElement("div");
      list.className = "mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
      wrap.appendChild(list);

      var excluded = {};
      (associatedCandidateIds || []).forEach(function (id) {
        if (id) excluded[String(id)] = true;
      });

      var reqSeq = 0;
      var lastTerm = "";

      function close() {
        if (triggerBtn) triggerBtn.setAttribute("aria-expanded", "false");
        wrap.remove();
      }

      cancelBtn.addEventListener("click", close);

      async function loadCandidates(term) {
        lastTerm = (term || "").toString();
        reqSeq += 1;
        var thisReq = reqSeq;

        if (!window.IESupabase || typeof window.IESupabase.fetchCandidatesPaginated !== "function") {
          list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Candidates API not available.</div>';
          return;
        }

        list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

        var filters = {
          archived: "active",
          name: lastTerm,
        };

        try {
          var result = await window.IESupabase.fetchCandidatesPaginated({
            filters: filters,
            page: 1,
            limit: 20,
          });
          if (thisReq !== reqSeq) return;
          if (!result || result.error) {
            list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
            return;
          }

          var rows = Array.isArray(result.data) ? result.data : [];
          var filtered = rows.filter(function (c) {
            if (!c || !c.id) return false;
            if (excluded[String(c.id)]) return false;
            if (isCandidateHired(c)) return false;
            return computeCandidateAvailability(c) === "available";
          });

          list.innerHTML = "";
          if (!filtered.length) {
            list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">No candidates available.</div>';
            return;
          }

          filtered.slice(0, 20).forEach(function (c) {
            var row = renderInlineCandidateRow(c, {
              onClick: async function (candidate) {
                if (!candidate || !candidate.id) return;
                if (!window.IESupabase || typeof window.IESupabase.linkCandidateToJob !== "function") return;

                row.disabled = true;
                row.classList.add("opacity-60", "cursor-not-allowed");
                try {
                  var res = await window.IESupabase.linkCandidateToJob({
                    candidate_id: candidate.id,
                    job_offer_id: jobOfferId,
                  });
                  if (res && res.error) {
                    if (window.IESupabase && window.IESupabase.showError) {
                      window.IESupabase.showError(res.error.message || "Linking error.");
                    }
                    return;
                  }
                  excluded[String(candidate.id)] = true;
                  if (typeof onLinked === "function") onLinked();
                  await loadCandidates(lastTerm);
                } catch (e) {
                  if (window.IESupabase && window.IESupabase.showError) {
                    window.IESupabase.showError(e && e.message ? e.message : "Error.");
                  }
                } finally {
                  row.disabled = false;
                  row.classList.remove("opacity-60", "cursor-not-allowed");
                }
              },
            });
            if (row) list.appendChild(row);
          });
        } catch (e) {
          if (thisReq !== reqSeq) return;
          console.error("[ItalianExperience] Add Candidate panel load error:", e);
          list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
        }
      }

      input.addEventListener(
        "input",
        debounce(function () {
          loadCandidates((input.value || "").trim());
        }, 250)
      );

      triggerBtn.parentNode.insertBefore(wrap, triggerBtn.nextSibling);
      setTimeout(function () { input.focus(); }, 50);
      loadCandidates("");
    }

    function configureCancel(modeToConfigure, offerId) {
      if (!cancelButton) return;
      cancelButton.onclick = null;

      if (modeToConfigure === "create") {
        cancelButton.addEventListener("click", function () {
          IERouter.navigateTo("job-offers.html");
        });
      } else if (modeToConfigure === "edit" && offerId) {
        cancelButton.addEventListener("click", function () {
          IERouter.navigateTo(window.IEPortal.links.offerView(offerId));
        });
      }
    }

  function openAssociationRejectionModal(config) {
    var associationId = config && config.associationId;
    if (!associationId) return;

    var candidateName = (config && config.candidateName) || "this candidate";
    var jobTitle = (config && config.jobTitle) || "this job";
    var initialReason = (config && config.initialReason) || "";
    var onSaved = config && typeof config.onSaved === "function" ? config.onSaved : null;

    openModal({
      title: "Confirm Rejection",
      fullPageHref: null,
      render: function (mount) {
        var safeName = String(candidateName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        var safeJobTitle = String(jobTitle || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        mount.innerHTML =
          "<p class=\"text-gray-700 text-sm mb-4\">Mark <strong>" + safeName + "</strong> as rejected for <strong>" + safeJobTitle + "</strong>? You can optionally provide an internal rejection reason.</p>" +
          "<label class=\"block text-sm font-medium text-gray-700 mb-1\" for=\"ie-rejection-reason\">Rejection reason (optional)</label>" +
          "<textarea id=\"ie-rejection-reason\" class=\"form-input w-full text-sm py-2 px-3 rounded-lg border border-gray-300\" rows=\"4\" placeholder=\"Add an internal note about why this candidate was rejected...\"></textarea>" +
          "<div class=\"flex gap-3 mt-4\">" +
          "<button type=\"button\" data-ie-rejection-confirm class=\"ie-btn ie-btn-success\">Confirm</button>" +
          "<button type=\"button\" data-ie-modal-close class=\"ie-btn ie-btn-secondary\">Cancel</button>" +
          "</div>";

        var textarea = mount.querySelector("#ie-rejection-reason");
        var confirmBtn = mount.querySelector("[data-ie-rejection-confirm]");

        if (textarea && initialReason) {
          textarea.value = initialReason;
        }

        if (confirmBtn) {
          confirmBtn.addEventListener("click", async function () {
            if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;

            var value = textarea ? textarea.value.trim() : "";
            var payloadReason = value === "" ? null : value;

            confirmBtn.disabled = true;
            try {
              var res = await window.IESupabase.updateCandidateAssociationStatus(
                associationId,
                "rejected",
                { rejectionReason: payloadReason }
              );
              if (res && res.error) {
                if (window.IESupabase.showError) {
                  window.IESupabase.showError(res.error.message || "Error updating status.");
                }
                return;
              }
              if (onSaved) onSaved(payloadReason);
              closeModal();
            } catch (e) {
              if (window.IESupabase && window.IESupabase.showError) {
                window.IESupabase.showError(e && e.message ? e.message : "Error updating status.");
              }
            } finally {
              confirmBtn.disabled = false;
            }
          });
        }
      },
    });
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
      var headerStatusEl = document.getElementById("jobOfferHeaderStatus");
      if (headerStatusEl) headerStatusEl.innerHTML = "";
      clearForm();
      setEditableState();
      configureCancel("create", null);
      renderActionButtons("create", null);
      return;
    }

    const offerId = id || params.id;
    if (!offerId) {
      IERouter.navigateTo("job-offers.html");
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
          jobOfferOriginalStatus = (offer.status || "open").toString();
          populateFormFromOffer(offer);

    const normalizedStatus = IEToolbar.normalizeStatus(offer.status);
    if (normalizedStatus === "archived") {
      IERouter.navigateTo("archived.html");
      return;
    }
          const effectiveModeForOffer = IEToolbar.resolveEntityMode(offer.status, finalMode);
          const isViewModeForOffer = effectiveModeForOffer === "view";

          var jobTitle = (offer.title && String(offer.title).trim()) || "";
          var clientName = (offer.client_name && String(offer.client_name).trim()) || "";
          var headerTitle = jobTitle ? (jobTitle + (clientName ? " – " + clientName : "")) : (clientName || "Job Offer");
          setTitles(headerTitle);
          window.pageMeta = {
            title: headerTitle,
            breadcrumbs: [
              { label: "Dashboard", path: "dashboard.html" },
              { label: "Job Offers", path: "job-offers.html" },
              { label: headerTitle }
            ]
          };
          if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
            window.IEPortal.mountPageHeader();
          }
          if (isViewModeForOffer) {
            setReadonlyState();
          } else {
            setEditableState();
          }
          configureCancel(effectiveModeForOffer, offerId);
          renderActionButtons(effectiveModeForOffer, offerId, offer);
          renderOfferStatusBadge(offer.status);

          var existingOfferMeta = document.getElementById("jobOfferMetadata");
          if (existingOfferMeta && existingOfferMeta.parentNode) {
            existingOfferMeta.parentNode.removeChild(existingOfferMeta);
          }

          var metadataContainer = document.createElement("div");
          metadataContainer.id = "jobOfferMetadata";
          if (form && form.parentNode) {
            form.parentNode.appendChild(metadataContainer);
          }
          metadataContainer.innerHTML = renderEntityMetadata(offer);

          if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
            window.ActivitySection.init({
              entityType: "job_offer",
              entityId: offerId,
              container: document.getElementById("activity-container"),
            });
          }

          if (isViewModeForOffer) {
            setFormDisabled(true);
            if (normalizedStatus !== "archived") renderAssociatedCandidates(offerId, offer);
          }
        })
        .catch(function (err) {
          console.error("[ItalianExperience] getJobOfferById error:", err);
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError("Error loading job offer.");
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
      IERouter.navigateTo("job-offers.html");
      return;
    }

    jobOfferOriginalStatus = (localOffer.status || "open").toString();
    populateFormFromOffer(localOffer);

    const normalizedStatus = IEToolbar.normalizeStatus(localOffer.status);
    if (normalizedStatus === "archived") {
      IERouter.navigateTo("archived.html");
      return;
    }
    const effectiveModeForOffer = IEToolbar.resolveEntityMode(localOffer.status, finalMode);
    const isViewModeForOffer = effectiveModeForOffer === "view";

    setTitles(isViewModeForOffer ? "View Job Offer" : "Edit Job Offer");
    if (isViewModeForOffer) {
      setReadonlyState();
    } else {
      setEditableState();
    }
    configureCancel(effectiveModeForOffer, offerId);
    renderActionButtons(effectiveModeForOffer, offerId, localOffer);
    renderOfferStatusBadge(localOffer.status);

    if (window.ActivitySection && typeof window.ActivitySection.init === "function") {
      window.ActivitySection.init({
        entityType: "job_offer",
        entityId: offerId,
        container: document.getElementById("activity-container"),
      });
    }

    if (isViewModeForOffer) {
      setFormDisabled(true);
      if (normalizedStatus !== "archived") renderAssociatedCandidates(offerId, localOffer);
    }
  }

  function updateJobOfferFromForm(id, formData) {
    if (!id) return;

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

    var newStatus = payload.status;

    if (window.IESupabase && window.IESupabase.updateJobOffer) {
      window.IESupabase.updateJobOffer(id, payload).then(function (result) {
        if (result.error) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError(result.error.message || "Error while saving.");
          }
          return;
        }
        if (window.IESupabase.showSuccess) {
          window.IESupabase.showSuccess("Offerta aggiornata.");
        }

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function" &&
          jobOfferOriginalStatus &&
          newStatus &&
          jobOfferOriginalStatus !== newStatus
        ) {
          window.IESupabase
            .createAutoLog("job_offer", id, {
              event_type: "status_change",
              message: "Status changed from " + jobOfferOriginalStatus + " to " + newStatus,
              metadata: { from: jobOfferOriginalStatus, to: newStatus },
            })
            .catch(function () {});
        }

        jobOfferOriginalStatus = newStatus;

        if (typeof window.IESupabase.getJobOfferById === "function") {
          window.IESupabase
            .getJobOfferById(id)
            .then(function (freshResult) {
              if (freshResult && !freshResult.error && freshResult.data) {
                var metadataEl = document.getElementById("jobOfferMetadata");
                if (metadataEl) {
                  metadataEl.innerHTML = renderEntityMetadata(freshResult.data);
                }
              }
            })
            .catch(function () {
              // Ignore metadata refresh errors to avoid impacting save flow.
            });
        }
        IERouter.redirectToEntityView("job-offer", id);
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
    IERouter.redirectToEntityView("job-offer", id);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    var s = String(str);
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Unified entity row helpers for archived page now live in IEListsRuntime.

  // LEGACY: old candidates list runtime (superseded by IEListsRuntime.initCandidatesPage)
  function legacyInitCandidatesPage() {
    const tbody = document.querySelector("[data-ie-candidates-body]");
    if (!tbody) return;

    if (!tbody.__ieClientLinkBound) {
      tbody.addEventListener("click", function (event) {
        var link = event.target.closest("[data-action='open-client-from-candidate']");
        if (!link) return;
        event.preventDefault();
        var id = link.getAttribute("data-id");
        if (!id) return;
        IERouter.navigateTo("add-client.html?id=" + encodeURIComponent(id) + "&mode=view");
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
      const target = event.target;
      const cvBtn = target.closest("[data-action='view-cv']");
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
      return {
        id: r.id,
        first_name,
        last_name,
        position: r.position ?? "",
        address: r.address ?? "",
        status: r.status ?? "new",
        source: r.source ?? "",
        client_name: r.client_name || null,
        foto_url: r.foto_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent((first_name || "") + "+" + (last_name || "")) + "&background=dbeafe&color=1e40af",
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
      const paginationContainer = document.querySelector("[data-ie-candidates-body]")?.closest(".glass-card")?.querySelector("[data-ie-pagination]");

      if (window.IESupabase && window.IESupabase.fetchCandidatesPaginated) {
        tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-gray-400\">Loading...</td></tr>";
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
          tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-red-500\">Loading error. Please try again later.</td></tr>";
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
        tbody.innerHTML = "<tr><td colspan=\"10\" class=\"px-6 py-8 text-center text-gray-400\">No candidates found.</td></tr>";
        return;
      }
      rows.forEach(function (row) {
        const clientName = findClientNameForCandidate(row);
        const latestAssoc = row.latest_association || null;
        const effectiveStatus = getEffectiveCandidateStatus(row);
        const statusBadgeClass = getCandidateStatusBadgeClass(effectiveStatus);
        const sourceLabel = (row.source || "").toUpperCase();
        const createdDate = row.created_at
          ? new Date(row.created_at).toLocaleDateString("it-IT")
          : "";
        const candidateViewUrl = window.IEPortal.links.candidateView(row.id);
        let positionCellHtml;
        if (latestAssoc && latestAssoc.job_offer_id) {
          positionCellHtml =
            '<span class="entity-link" data-entity-type="job-offer" data-entity-id="' + escapeHtml(String(latestAssoc.job_offer_id)) + '">' + escapeHtml(row.position || "—") + "</span>";
        } else {
          positionCellHtml = escapeHtml(row.position || "—");
        }
        let assignmentHtml;
        if (latestAssoc && latestAssoc.client_name) {
          if (latestAssoc.client_id) {
            assignmentHtml =
              '<span class="entity-link text-gray-800 font-medium" data-entity-type="client" data-entity-id="' + escapeHtml(String(latestAssoc.client_id)) + '">' + escapeHtml(latestAssoc.client_name) + "</span>";
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
          escapeHtml(row.id) +
          '" src="' +
          escapeHtml(initialPhotoUrl) +
          '" class="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="' +
          escapeHtml((row.first_name || "") + " " + (row.last_name || "")) +
          '">';
        const hasCv = !!row.cv_url;
        const viewCvHtml = hasCv
          ? '<button type="button" data-action="view-cv" data-id="' +
            escapeHtml(row.id) +
            '" class="ie-btn ie-btn-primary">View CV</button>'
          : '<button type="button" data-action="view-cv" data-id="' +
            escapeHtml(row.id) +
            '" class="ie-btn ie-btn-secondary" disabled>View CV</button>';
        const tr = renderEntityRow({
          entityType: "candidate",
          id: row.id,
          viewUrl: candidateViewUrl,
          editUrl: window.IEPortal.links.candidateEdit(row.id),
          title: [row.first_name, row.last_name].filter(Boolean).join(" ") || "—",
          isArchived: row.is_archived,
          archivedList: false,
          leadingCells: [photoHtml],
          middleCells: [
            positionCellHtml,
            assignmentHtml,
            (row.address || "—"),
            '<span class="badge ' + statusBadgeClass + '">' + escapeHtml(formatCandidateStatusLabel(effectiveStatus)) + "</span>",
            '<span class="text-xs font-medium text-blue-600">' + escapeHtml(sourceLabel || "—") + "</span>",
            '<span class="text-gray-400">' + escapeHtml(createdDate) + "</span>",
            '<div class="text-center">' + viewCvHtml + "</div>",
          ],
          rowTitle: formatLastUpdatedMeta(row),
        });
        tbody.appendChild(tr);
        resolveCandidatePhoto(row);
      });
    }

    function resolveCandidatePhoto(row) {
      const path = row && row.photo_storage_path;
      if (!path) return;
      if (/^https?:\/\//i.test(path) || path.charAt(0) === "/") return;
      if (!window.IESupabase || !window.IESupabase.createSignedCandidateUrl) return;

      const cached = CANDIDATE_SIGNED_PHOTO_CACHE[path];
      const selector =
        '[data-ie-candidate-photo="' + String(row.id != null ? row.id : "") + '"]';
      if (cached) {
        const imgCached = tbody.querySelector(selector);
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
          CANDIDATE_SIGNED_PHOTO_CACHE[path] = signedUrl;
          const imgEl = tbody.querySelector(selector);
          if (imgEl) {
            imgEl.src = signedUrl;
            imgEl.dataset.storagePath = path;
          }
        })
        .catch(function (err) {
          console.error(
            "[ItalianExperience] Failed to resolve candidate photo signed URL",
            err,
            { path: path, id: row && row.id }
          );
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

  function openJobOfferPreviewModal(id) {
    if (
      window.IEPortal &&
      window.IEPortal.ui &&
      typeof window.IEPortal.ui.openJobOfferPreviewModal === "function"
    ) {
      window.IEPortal.ui.openJobOfferPreviewModal(id);
    }
  }

  // LEGACY: old job offers list runtime (superseded by IEListsRuntime.initJobOffersPage)
  function legacyInitJobOffersPage() {
    const tbody = document.querySelector("[data-ie-joboffers-body]");
    if (!tbody) return;

    const table = tbody.closest("table");
    const headerRow = table?.querySelector("thead tr");
    const candidatesTh = headerRow ? Array.from(headerRow.children).find(function (th) {
      return th.textContent.trim().toLowerCase() === "candidates";
    }) : null;
    if (candidatesTh) {
      const thAssociated = document.createElement("th");
      thAssociated.className = "px-6 py-5 font-bold";
      thAssociated.textContent = "Associated";
      const thRequired = document.createElement("th");
      thRequired.className = "px-6 py-5 font-bold";
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
      IERouter.navigateTo("candidates.html?offer=" + encodeURIComponent(offerId));
        return;
      }

      const titleBtn = target.closest("[data-action='view-offer-full']");
      if (titleBtn) {
        const fullId =
          titleBtn.getAttribute("data-id") ||
          titleBtn.closest("tr")?.getAttribute("data-id");
        if (!fullId) return;
        IERouter.navigateTo(window.IEPortal.links.offerView(fullId));
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

    async function renderOfferRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-gray-400\">No job offers found.</td></tr>";
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
        const badgeClass = getOfferStatusBadgeClass(row.status);
        const statusLabel = formatOfferStatusLabel(row.status);

        const associatedCellHtml =
          '<button type="button" data-action="view-offer-candidates" data-id="' +
          escapeHtml(row.id) +
          '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-bold">' +
          escapeHtml(String(associatedActive)) +
          "</button>";
        let countColorClass = "text-green-600";
        if (positions > 0 && hiredCount >= positions) {
          countColorClass = "text-red-500";
        }
        const requiredCellHtml =
          '<span class="' + countColorClass + '">' +
          escapeHtml(String(hiredCount)) + " / " + escapeHtml(String(positions)) +
          "</span>";

        const offerViewUrl = "job-offer.html?id=" + encodeURIComponent(String(row.id));
        const clientCellHtml = row.client_id
          ? '<span class="entity-link" data-entity-type="client" data-entity-id="' + escapeHtml(String(row.client_id)) + '">' + escapeHtml(clientValue) + "</span>"
          : escapeHtml(clientValue);
        const tr = renderEntityRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: offerViewUrl,
          editUrl: window.IEPortal.links.offerEdit(row.id),
          title: row.title || "—",
          isArchived: row.is_archived,
          archivedList: false,
          leadingCells: [],
          middleCells: [
            escapeHtml(row.position || "—"),
            clientCellHtml,
            escapeHtml(locationValue),
            '<span class="badge ' + badgeClass + '">' + escapeHtml(statusLabel) + "</span>",
            associatedCellHtml,
            requiredCellHtml,
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
          await renderOfferRows(rows);
          updatePaginationUI(paginationContainer, totalCount, currentPage, limit, rows.length);
        }).catch(function (err) {
          console.error("[ItalianExperience] fetchJobOffersPaginated error:", err);
          tbody.innerHTML = "<tr><td colspan=\"9\" class=\"px-6 py-8 text-center text-red-500\">Loading error. Please try again later.</td></tr>";
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
        await renderOfferRows(pageRows);
        updatePaginationUI(paginationContainer, totalCount, currentPage, limit, pageRows.length);
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

  // LEGACY: old clients list runtime (superseded by IEListsRuntime.initClientsPage)
  function legacyInitClientsPage() {
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
        IERouter.navigateTo("job-offers.html?client=" + encodeURIComponent(clientId));
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
              Loading clients...
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
                  ? '<button type="button" data-action="view-client-offers" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' + escapeHtml(String(activeOffersCount)) + "</button>"
                  : "0";

              const clientViewUrl = "client.html?id=" + encodeURIComponent(String(row.id));
              const tr = renderEntityRow({
                entityType: "client",
                id: row.id,
                viewUrl: clientViewUrl,
                editUrl: "add-client.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
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
              '<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-sm">Loading error. Please try again later.</td></tr>';
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
          const activeOffersCount = (IE_STORE.jobOffers || []).filter(function (offer) {
            if (!offer || offer.is_archived) return false;
            if (offer.client_id !== row.id) return false;
            const status = offer.status || "";
            return status === "active" || status === "open" || status === "inprogress" || status === "in progress";
          }).length;
          const activeOffersHtml =
            activeOffersCount > 0
              ? '<button type="button" data-action="view-client-offers" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-secondary !py-1 !px-2 min-w-0 font-semibold">' + escapeHtml(String(activeOffersCount)) + "</button>"
              : "0";

          const clientViewUrl = "client.html?id=" + encodeURIComponent(String(row.id));
          const tr = renderEntityRow({
            entityType: "client",
            id: row.id,
            viewUrl: clientViewUrl,
            editUrl: "add-client.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
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

  // Legacy renderAssociationsForActiveOffer removed with list-page associations UI.

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
        IERouter.navigateTo(window.IEPortal.links.candidateView(id));
      }
      return;
    }
    if (entity === "job_offer") {
      if (typeof openJobOfferPreviewModal === "function") {
        openJobOfferPreviewModal(id);
      } else {
        IERouter.navigateTo(window.IEPortal.links.offerView(id));
      }
      return;
    }
    if (entity === "client") {
      IERouter.navigateTo("add-client.html?id=" + encodeURIComponent(id) + "&mode=view");
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
      if (typeof IERouter !== "undefined" && IERouter && typeof IERouter.navigateTo === "function") {
        if (entity === "candidate" && window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.candidateView === "function") {
          IERouter.navigateTo(window.IEPortal.links.candidateView(id));
          return;
        }
        if (entity === "job_offer" && window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.offerView === "function") {
          IERouter.navigateTo(window.IEPortal.links.offerView(id));
          return;
        }
        if (entity === "client" && window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.clientView === "function") {
          IERouter.navigateTo(window.IEPortal.links.clientView(id));
          return;
        }
      }
      if (typeof openPreviewModal === "function") {
        openPreviewModal(entity, id);
      }
      return;
    }

    // EDIT
    if (action === "edit-entity") {
      if (actionBtn.dataset.editUrl) {
        IERouter.navigateTo(actionBtn.dataset.editUrl);
      }
      return;
    }

    // ARCHIVE
    if (action === "archive-entity") {
      if (!window.IESupabase) return;

      if (entity === "candidate") {
      const res = await window.IESupabase.archiveCandidate(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("candidate", id, {
            event_type: "system_event",
            message: "Candidate archived",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      if (entity === "client") {
      const res = await window.IESupabase.archiveClient(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("client", id, {
            event_type: "system_event",
            message: "Client archived",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      if (entity === "job_offer") {
      const res = await window.IESupabase.archiveJobOffer(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("job_offer", id, {
            event_type: "system_event",
            message: "Job offer archived",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      location.reload();
      return;
    }

    // RESTORE
    if (action === "restore-entity") {
      if (!window.IESupabase) return;

      if (entity === "candidate") {
      const res = await window.IESupabase.unarchiveCandidate(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("candidate", id, {
            event_type: "system_event",
            message: "Candidate restored",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      if (entity === "client") {
      const res = await window.IESupabase.unarchiveClient(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("client", id, {
            event_type: "system_event",
            message: "Client restored",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      if (entity === "job_offer") {
      const res = await window.IESupabase.unarchiveJobOffer(id);
      if (
        res &&
        !res.error &&
        typeof window.IESupabase.createAutoLog === "function"
      ) {
        window.IESupabase
          .createAutoLog("job_offer", id, {
            event_type: "system_event",
            message: "Job offer restored",
            metadata: null,
          })
          .catch(function () {});
      }
      }

      if (entity === "application" && typeof window.IESupabase.restoreApplication === "function") {
        await window.IESupabase.restoreApplication(id);
      }

      location.reload();
      return;
    }

    // DELETE PERMANENT
    if (action === "delete-entity-permanent") {
      if (!window.IESupabase) return;

      if (!confirm("Sei sicuro? Questa azione è irreversibile.")) return;

      if (entity === "application" && typeof window.IESupabase.deleteAssociationPermanently === "function") {
        await window.IESupabase.deleteAssociationPermanently(id);
        location.reload();
        return;
      }

      const tableMap = {
        candidate: "candidates",
        client: "clients",
        job_offer: "job_offers"
      };

      if (entity === "candidate" && window.IESupabase.getCandidateById && window.IESupabase.deleteCandidateFiles) {
        try {
          const candidateResult = await window.IESupabase.getCandidateById(id);
          if (candidateResult && !candidateResult.error && candidateResult.data) {
            const candidate = candidateResult.data;
            const paths = [];
            if (candidate.photo_url) paths.push(candidate.photo_url);
            if (candidate.cv_url) paths.push(candidate.cv_url);
            if (paths.length) {
              await window.IESupabase.deleteCandidateFiles(paths);
            }
          }
        } catch (cleanupErr) {
          console.error("[ItalianExperience] Failed to delete candidate files from storage:", cleanupErr);
        }
      }

      await window.IESupabase.deletePermanentRecord({
        table: tableMap[entity],
        id: id
      });

      location.reload();
      return;
    }
  });

  window.IEPortal = window.IEPortal || {};

  window.IEPortal.links = {
    candidateView: function (id) {
      return "candidate.html?id=" + encodeURIComponent(String(id || ""));
    },
    candidateEdit: function (id) {
      return (
        "add-candidate.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    },
    clientView: function (id) {
      return (
        "add-client.html?id=" +
        encodeURIComponent(String(id || "")) +
        "&mode=view"
      );
    },
    clientEdit: function (id) {
      return (
        "add-client.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    },
    offerView: function (id) {
      return (
        "add-job-offer.html?id=" + encodeURIComponent(String(id || "")) + "&mode=view"
      );
    },
    offerEdit: function (id) {
      return (
        "add-job-offer.html?id=" + encodeURIComponent(String(id || "")) + "&mode=edit"
      );
    }
  };

  window.IEPortal.navigateTo = navigateTo;
  window.IEPortal.setPageBreadcrumbs = setPageBreadcrumbs;
  window.IEPortal.mountPageHeader = mountPageHeader;
  window.IEPortal.getApplicationStatusBadgeClass = getApplicationStatusBadgeClass;
  window.IEPortal.formatApplicationStatusLabel = formatApplicationStatusLabel;
  window.IEPortal.normalizeApplicationStatusForDisplay = normalizeApplicationStatusForDisplay;
  window.IEPortal.computeDerivedAvailability = computeDerivedAvailability;
  window.IEPortal.formatAvailabilityLabel = formatAvailabilityLabel;
  window.IEPortal.renderEntityRow =
    window.IEListsRuntime && typeof IEListsRuntime.renderEntityRow === "function"
      ? IEListsRuntime.renderEntityRow
      : undefined;

  // Expose CV preview helper so list runtimes can invoke it.
  if (typeof window.openCandidateCvPreview !== "function") {
    window.openCandidateCvPreview = openCandidateCvPreview;
  }

  // Row click: open main entity via router (ignore clicks on button or a).
  document.addEventListener("click", function (e) {
    var row = e.target.closest(".clickable-row");
    if (!row) return;
    if (e.target.closest("button") || e.target.closest("a")) return;

    var entity = row.dataset.entity;
    var id = row.dataset.id;
    if (entity && id && window.IERouter && typeof window.IERouter.navigateTo === "function") {
      e.preventDefault();
      window.IERouter.navigateTo(entity, id);
    }
  });

  // Entity link navigation: Position → job offer, Client name → client (via router).
  document.addEventListener("click", function (e) {
    var el = e.target.closest(".entity-link");
    if (!el) return;
    var type = el.getAttribute("data-entity-type");
    var id = el.getAttribute("data-entity-id");
    if (type && id && window.IERouter && typeof window.IERouter.redirectToEntityView === "function") {
      e.preventDefault();
      window.IERouter.redirectToEntityView(type, id);
    }
  });
})();
