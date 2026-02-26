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
    initDataViews();
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
      case "clients.html":
      case "clienti.html":
        return "clients";
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
      clients: ["clienti", "clients"],
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
      clienti: "clients.html",
    };

    const links = document.querySelectorAll(".sidebar .nav-link");
    links.forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();

      let key = null;
      if (label.includes("dashboard")) key = "dashboard";
      else if (label.includes("candidati") || label.includes("candidate")) key = "candidati";
      else if (label.includes("offerte")) key = "offerte di lavoro";
      else if (label.includes("clienti") || label.includes("clients")) key = "clienti";

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

  function getCurrentUserDisplayName() {
    // In a real app, this will read from auth/session.
    return "Matteo Di Noia";
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

  function fetchCandidates(filters) {
    console.info("[ItalianExperience] fetchCandidates() – filters:", filters || {});
    const base = IE_STORE.candidates.filter((c) => !c._deleted);
    return Promise.resolve(applyCandidateFilters(base, filters || {}));
  }

  function fetchJobOffers(filters) {
    console.info("[ItalianExperience] fetchJobOffers() – filters:", filters || {});
    const base = IE_STORE.jobOffers.filter((o) => !o._deleted);
    return Promise.resolve(applyJobOfferFilters(base, filters || {}));
  }

  function fetchClients(filters) {
    console.info("[ItalianExperience] fetchClients() – filters:", filters || {});
    const base = IE_STORE.clients.filter((c) => !c._deleted);
    return Promise.resolve(applyClientFilters(base, filters || {}));
  }

  function saveCandidate(formData) {
    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();

    const candidate = {
      id: "cand-" + Math.random().toString(36).slice(2, 10),
      slug: null,
      nome: (formData.get("nome") || "").toString().trim(),
      cognome: (formData.get("cognome") || "").toString().trim(),
      posizione: (formData.get("posizione") || "").toString().trim(),
      indirizzo: (formData.get("indirizzo") || "").toString().trim(),
      status: (formData.get("status") || "new").toString(),
      note: (formData.get("note") || "").toString(),
      fonte: (formData.get("fonte") || "").toString(),
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
      candidate.cv_url = `/uploads/cv/${encodeURIComponent(cvFile.name)}`;
    }

    const photoFile = formData.get("foto_file");
    if (photoFile && typeof photoFile === "object" && photoFile.name) {
      candidate.foto_url = `/uploads/foto/${encodeURIComponent(photoFile.name)}`;
    }

    candidate.slug =
      (candidate.nome + "-" + candidate.cognome)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || candidate.id;

    IE_STORE.candidates.push(candidate);

    console.info("[ItalianExperience] saveCandidate() – payload ready for API:", candidate);

    alert("Candidato salvato con successo (simulazione)");
  }

  function saveJobOffer(formData) {
    const now = new Date().toISOString();
    const currentUser = getCurrentUserDisplayName();

    const clientName = (formData.get("client_name") || "").toString().trim();
    let clientId = null;
    if (clientName) {
      const existing = IE_STORE.clients.find(
        (c) => c.nome.toLowerCase() === clientName.toLowerCase()
      );
      if (existing) {
        clientId = existing.id;
      }
    }

    const jobOffer = {
      id: "offer-" + Math.random().toString(36).slice(2, 10),
      titolo_posizione: (formData.get("titolo_posizione") || "").toString().trim(),
      client_id: clientId,
      descrizione: (formData.get("descrizione") || "").toString(),
      paga: (formData.get("paga") || "").toString(),
      tipo_contratto: (formData.get("tipo_contratto") || "").toString(),
      numero_posizioni: parseInt(formData.get("numero_posizioni") || "1", 10) || 1,
      citta: (formData.get("citta") || "").toString().trim(),
      stato: (formData.get("stato") || "").toString().trim(),
      data_scadenza: (formData.get("data_scadenza") || "").toString(),
      stato_offerta: (formData.get("stato_offerta") || "open").toString(),
      created_at: now,
      updated_at: now,
      created_by: currentUser,
      updated_by: currentUser,
      is_archived: false,
    };

    IE_STORE.jobOffers.push(jobOffer);

    console.info("[ItalianExperience] saveJobOffer() – payload ready for API:", jobOffer);

    alert("Offerta di lavoro creata con successo (simulazione)");
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
    if (pageKey === "candidati") {
      initCandidatesPage();
    } else if (pageKey === "offerte") {
      initJobOffersPage();
    } else if (pageKey === "clients") {
      initClientsPage();
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

    const nameInput = document.querySelector('[data-filter="candidate-name"]');
    const positionInput = document.querySelector('[data-filter="candidate-position"]');
    const addressInput = document.querySelector('[data-filter="candidate-address"]');
    const statusSelect = document.querySelector('[data-filter="candidate-status"]');
    const sourceSelect = document.querySelector('[data-filter="candidate-source"]');
    const archivedSelect = document.querySelector('[data-filter="candidate-archived"]');

    if (nameInput) {
      nameInput.addEventListener("input", function () {
        filters.name = this.value || "";
        renderCandidates();
      });
    }
    if (positionInput) {
      positionInput.addEventListener("input", function () {
        filters.position = this.value || "";
        renderCandidates();
      });
    }
    if (addressInput) {
      addressInput.addEventListener("input", function () {
        filters.address = this.value || "";
        renderCandidates();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.status = this.value || "";
        renderCandidates();
      });
    }
    if (sourceSelect) {
      sourceSelect.addEventListener("change", function () {
        filters.source = this.value || "";
        renderCandidates();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
        renderCandidates();
      });
    }

    tbody.addEventListener("click", function (event) {
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

    function renderCandidates() {
      fetchCandidates(filters).then((rows) => {
        // Active first, then archived
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));

        tbody.innerHTML = "";
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
          if (metaTitle) {
            tr.title = metaTitle;
          }

          tr.innerHTML = `
            <td class="px-6 py-4">
              <img src="${row.foto_url || ""}" class="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="${row.nome} ${row.cognome}">
            </td>
            <td class="px-6 py-4 font-semibold text-gray-800">${row.nome} ${row.cognome}</td>
            <td class="px-6 py-4 text-gray-600">${row.posizione || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${clientName}</td>
            <td class="px-6 py-4 text-gray-500 italic">${row.indirizzo || "—"}</td>
            <td class="px-6 py-4"><span class="badge ${statusBadgeClass}">${formatCandidateStatusLabel(
            row.status
          )}</span></td>
            <td class="px-6 py-4 text-xs font-medium text-blue-600">${sourceLabel || "—"}</td>
            <td class="px-6 py-4 text-gray-400">${createdDate}</td>
            <td class="px-6 py-4 text-center">
              <button type="button" data-action="view-cv" data-id="${
                row.id
              }" class="text-[#c5a059] hover:bg-[#c5a059]/10 px-3 py-1.5 rounded-md border border-[#c5a059]/20 transition text-xs font-bold">
                View CV
              </button>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
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
                <button type="button" data-action="archive-candidate" data-id="${
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
      });
    }

    function findClientNameForCandidate(candidate) {
      // Attempt to infer client from associations
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

    const titleInput = document.querySelector('[data-filter="offer-title"]');
    const clientSelect = document.querySelector('[data-filter="offer-client"]');
    const statusSelect = document.querySelector('[data-filter="offer-status"]');
    const cityInput = document.querySelector('[data-filter="offer-city"]');
    const stateInput = document.querySelector('[data-filter="offer-state"]');
    const contractSelect = document.querySelector('[data-filter="offer-contract"]');
    const archivedSelect = document.querySelector('[data-filter="offer-archived"]');

    // Populate client filter options from store (if the element exists)
    if (clientSelect && !clientSelect.dataset.iePopulated) {
      clientSelect.dataset.iePopulated = "true";
      const defaultOption = clientSelect.querySelector("option[value='']");
      clientSelect.innerHTML = "";
      if (defaultOption) clientSelect.appendChild(defaultOption);
      IE_STORE.clients.forEach((client) => {
        if (client.is_archived) return;
        const opt = document.createElement("option");
        opt.value = client.id;
        opt.textContent = client.nome;
        clientSelect.appendChild(opt);
      });
    }

    if (titleInput) {
      titleInput.addEventListener("input", function () {
        filters.title = this.value || "";
        renderOffers();
      });
    }
    if (clientSelect) {
      clientSelect.addEventListener("change", function () {
        filters.clientId = this.value || "";
        renderOffers();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.offerStatus = this.value || "";
        renderOffers();
      });
    }
    if (cityInput) {
      cityInput.addEventListener("input", function () {
        filters.city = this.value || "";
        renderOffers();
      });
    }
    if (stateInput) {
      stateInput.addEventListener("input", function () {
        filters.state = this.value || "";
        renderOffers();
      });
    }
    if (contractSelect) {
      contractSelect.addEventListener("change", function () {
        filters.contractType = this.value || "";
        renderOffers();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
        renderOffers();
      });
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

    function renderOffers() {
      fetchJobOffers(filters).then((rows) => {
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
        tbody.innerHTML = "";

        rows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
          tr.setAttribute("data-id", row.id);

          const client = IE_STORE.clients.find((c) => c.id === row.client_id);
          const clientName = client ? client.nome : "—";
          const location = row.citta && row.stato ? `${row.citta}, ${row.stato}` : "—";
          const createdDate = row.created_at
            ? new Date(row.created_at).toLocaleDateString("it-IT")
            : "";
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
                <button type="button" data-action="archive-offer" data-id="${
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

        // Keep associated candidates section in sync with first visible offer
        renderAssociationsForActiveOffer();
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

    const nameInput = document.querySelector('[data-filter="client-name"]');
    const cityInput = document.querySelector('[data-filter="client-city"]');
    const stateInput = document.querySelector('[data-filter="client-state"]');
    const countryInput = document.querySelector('[data-filter="client-country"]');
    const archivedSelect = document.querySelector('[data-filter="client-archived"]');

    if (nameInput) {
      nameInput.addEventListener("input", function () {
        filters.name = this.value || "";
        renderClients();
      });
    }
    if (cityInput) {
      cityInput.addEventListener("input", function () {
        filters.city = this.value || "";
        renderClients();
      });
    }
    if (stateInput) {
      stateInput.addEventListener("input", function () {
        filters.state = this.value || "";
        renderClients();
      });
    }
    if (countryInput) {
      countryInput.addEventListener("input", function () {
        filters.country = this.value || "";
        renderClients();
      });
    }
    if (archivedSelect) {
      archivedSelect.addEventListener("change", function () {
        filters.archived = this.value || "active";
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
        archiveRecordById(IE_STORE.clients, id);
        renderClients();
      }
    });

    function renderClients() {
      fetchClients(filters).then((rows) => {
        rows.sort((a, b) => Number(a.is_archived) - Number(b.is_archived));
        tbody.innerHTML = "";

        rows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.className = "table-row transition" + (row.is_archived ? " opacity-60" : "");
          tr.setAttribute("data-id", row.id);

          const location =
            row.citta && row.stato
              ? `${row.citta}, ${row.stato}`
              : row.citta || row.stato || "—";
          const metaTitle = formatLastUpdatedMeta(row);
          if (metaTitle) tr.title = metaTitle;

          tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-gray-800">${row.nome}</td>
            <td class="px-6 py-4 text-gray-600">${location}</td>
            <td class="px-6 py-4 text-gray-600">${row.nazione || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${row.email || "—"}</td>
            <td class="px-6 py-4 text-gray-600">${row.telefono || "—"}</td>
            <td class="px-6 py-4 text-gray-500 text-xs italic">${row.note || "—"}</td>
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
      });
    }

    renderClients();
  }

  // ---------------------------------------------------------------------------
  // Associations table rendering (job offers page)
  // ---------------------------------------------------------------------------

  function renderAssociationsForActiveOffer() {
    const tbody = document.querySelector("[data-ie-associations-body]");
    if (!tbody) return;

    const firstOfferRow = document.querySelector("[data-ie-joboffers-body] tr");
    let activeOfferId = null;
    if (firstOfferRow) {
      activeOfferId = firstOfferRow.getAttribute("data-id");
    }
    if (!activeOfferId && IE_STORE.jobOffers.length) {
      activeOfferId = IE_STORE.jobOffers[0].id;
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

      tr.innerHTML = `
        <td class="px-6 py-4 font-semibold text-gray-800">${candidate.nome} ${
        candidate.cognome
      }</td>
        <td class="px-6 py-4 text-gray-600">${candidate.posizione || "—"}</td>
        <td class="px-6 py-4">
          <span class="badge ${getCandidateStatusBadgeClass(assoc.status)}">${formatCandidateStatusLabel(
        assoc.status
      )}</span>
        </td>
        <td class="px-6 py-4 text-gray-500 italic text-xs">
          ${assoc.notes || "—"}
        </td>
        <td class="px-6 py-4 text-center">
          <button
            type="button"
            class="text-red-500 hover:text-red-600 text-xs font-semibold uppercase tracking-widest"
            data-action="remove-association"
            data-id="${assoc.id}"
          >
            Remove
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-action='remove-association']");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;
      const confirmed = window.confirm(
        "Vuoi rimuovere questa associazione candidato-offerta? (simulazione)"
      );
      if (!confirmed) return;
      const idx = IE_STORE.candidateJobAssociations.findIndex((a) => a.id === id);
      if (idx >= 0) {
        IE_STORE.candidateJobAssociations.splice(idx, 1);
        renderAssociationsForActiveOffer();
      }
    });
  }
})();

