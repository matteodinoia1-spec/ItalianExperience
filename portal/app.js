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

  document.addEventListener("DOMContentLoaded", function () {
    initLayout();
    initNavigation();
    initButtons();
    initForms();
  });

  // ---------------------------------------------------------------------------
  // Layout & Sidebar
  // ---------------------------------------------------------------------------

  function initLayout() {
    const sidebar = document.getElementById("sidebar");
    const headerToggleButtons = document.querySelectorAll(
      '[data-toggle="sidebar"], .portal-header-toggle'
    );

    if (!sidebar) return;

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

    // Close sidebar when clicking on the main content (mobile only)
    document.addEventListener("click", function (event) {
      if (window.innerWidth >= 1024) return;
      if (!sidebar.classList.contains("open")) return;

      const clickedInsideSidebar = event.target.closest("#sidebar");
      if (clickedInsideSidebar) return;

      sidebar.classList.remove("open");
    });
  }

  function toggleSidebar(sidebar) {
    sidebar.classList.toggle("open");
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
      case "associazioni.html":
        return "associazioni";
      case "add-candidato":
        return "add-candidato";
      case "add-offerta":
        return "add-offerta";
      case "index.html":
      case "":
        return "login";
      default:
        // Fallback: try to infer from segment without extension
        if (lastSegment.includes("dashboard")) return "dashboard";
        if (lastSegment.includes("candidati")) return "candidati";
        if (lastSegment.includes("offerte")) return "offerte";
        if (lastSegment.includes("associazioni")) return "associazioni";
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
      associazioni: ["associazioni", "associations"],
    };

    const targetSection = (function () {
      if (currentKey === "add-candidato") return "candidati";
      if (currentKey === "add-offerta") return "offerte";
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
      associazioni: "associazioni.html",
    };

    const links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();

      let key = null;
      if (label.includes("dashboard")) key = "dashboard";
      else if (label.includes("candidati") || label.includes("candidate")) key = "candidati";
      else if (label.includes("offerte")) key = "offerte di lavoro";
      else if (label.includes("associazioni")) key = "associazioni";

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
    const { pathname } = window.location;
    if (!pathname) return "";

    const segments = pathname.split("/").filter(Boolean);
    if (!segments.length) return "";

    // Strip the last segment (file name)
    segments.pop();
    return "/" + segments.join("/") + (segments.length ? "/" : "");
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
        navigateTo("add-candidato");
      });
    }

    const addOfferBtn =
      document.querySelector('[data-action="add-offer"]') ||
      findButtonByText("create new job offer");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("add-offerta");
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
    const candidateForm = document.getElementById("candidateForm");
    if (candidateForm) {
      candidateForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(candidateForm);
        saveCandidate(formData);
      });
    }

    const jobOfferForm = document.getElementById("jobOfferForm");
    if (jobOfferForm) {
      jobOfferForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(jobOfferForm);
        saveJobOffer(formData);
      });
    }
  }

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

  function fetchCandidates(filters) {
    console.info(
      "[ItalianExperience] fetchCandidates() placeholder – filters:",
      filters || {}
    );
    // Future: return api.get('/candidates', { params: filters })
    return Promise.resolve([]);
  }

  function fetchJobOffers(filters) {
    console.info(
      "[ItalianExperience] fetchJobOffers() placeholder – filters:",
      filters || {}
    );
    // Future: return api.get('/offers', { params: filters })
    return Promise.resolve([]);
  }

  function saveCandidate(formData) {
    const data = Object.fromEntries(formData.entries());
    console.info("[ItalianExperience] saveCandidate() placeholder – payload:", data);

    // Example simulation – replace with real API call:
    // const api = connectToDatabase();
    // return api.post('/candidates', data);

    alert("Candidato salvato con successo (simulazione)");
  }

  function saveJobOffer(formData) {
    const data = Object.fromEntries(formData.entries());
    console.info("[ItalianExperience] saveJobOffer() placeholder – payload:", data);

    // Example simulation – replace with real API call:
    // const api = connectToDatabase();
    // return api.post('/offers', data);

    alert("Offerta di lavoro creata con successo (simulazione)");
  }
})();

