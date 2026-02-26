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
      case "add-candidato.html":
        return "add-candidato";
      case "add-offerta.html":
        return "add-offerta";
      case "index.html":
      case "":
        return "login";
      default:
        // Fallback: try to infer from segment without extension
        if (lastSegment.includes("dashboard")) return "dashboard";
        if (lastSegment.includes("candidati")) return "candidati";
        if (lastSegment.includes("offerte")) return "offerte";
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
    };

    const links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();

      let key = null;
      if (label.includes("dashboard")) key = "dashboard";
      else if (label.includes("candidati") || label.includes("candidate")) key = "candidati";
      else if (label.includes("offerte")) key = "offerte di lavoro";

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
        openCandidateModal();
      });
    }

    const addOfferBtn =
      document.querySelector('[data-action="add-offer"]') ||
      findButtonByText("create new job offer");
    if (addOfferBtn) {
      addOfferBtn.addEventListener("click", function (event) {
        event.preventDefault();
        openOfferModal();
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
      render: (mount) => {
        mount.innerHTML = `
          <div class="space-y-6">
            <div class="glass-card rounded-2xl p-6">
              <h3 class="serif text-lg font-bold text-[#1b4332] mb-4">New Candidate Association</h3>
              <form id="associateCandidateForm" class="space-y-5">
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Select Candidate</label>
                  <select name="candidate" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-1 focus:ring-[#c5a059] outline-none appearance-none cursor-pointer">
                    <option value="">Choose a candidate...</option>
                    <option value="alessandro-rossi">Alessandro Rossi – Sommelier Senior</option>
                    <option value="giulia-bianchi">Giulia Bianchi – Chef de Rang</option>
                    <option value="luca-moretti">Luca Moretti – Maître d'Hôtel</option>
                    <option value="elena-martini">Elena Martini – Pastry Chef</option>
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

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          const formData = new FormData(form);
          saveCandidateAssociation(formData);
          closeModal();
        });
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
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      const box = document.createElement("div");
      box.className = "glass-card rounded-2xl p-6";
      box.innerHTML = `<div class="text-sm font-semibold text-gray-700">Unable to load form.</div>`;
      return box;
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const form = doc.querySelector(formSelector);
    if (!form) {
      const box = document.createElement("div");
      box.className = "glass-card rounded-2xl p-6";
      box.innerHTML = `<div class="text-sm font-semibold text-gray-700">Form not found in source page.</div>`;
      return box;
    }

    // Try to capture the small intro block above the form (title + subtitle)
    const intro = form.previousElementSibling && form.previousElementSibling.matches(".mb-6")
      ? form.previousElementSibling
      : null;

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-6";

    if (intro) wrapper.appendChild(intro.cloneNode(true));
    wrapper.appendChild(form.cloneNode(true));

    return wrapper;
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

  function saveCandidateAssociation(formData) {
    const data = Object.fromEntries(formData.entries());
    console.info(
      "[ItalianExperience] saveCandidateAssociation() placeholder – payload:",
      data
    );

    // Future: send to API and refresh associated candidates table
    alert("Associazione candidato salvata con successo (simulazione)");
  }
})();

