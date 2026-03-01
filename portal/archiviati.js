console.log("ARCHIVIATI JS ACTIVE - VERSION 1");
/**
 * Archiviati page – Supabase integration
 * Loads archived candidates, job offers, and clients with pagination, search, and restore.
 * Requires: Supabase CDN, supabase.js, app.js (auth + sidebar).
 */
(function () {
  "use strict";

  const LIMIT = 10;
  const SECTIONS = { candidates: "candidates", jobs: "jobs", clients: "clients" };

  let state = {
    candidates: { page: 1, totalCount: 0, search: "" },
    jobs: { page: 1, totalCount: 0, search: "" },
    clients: { page: 1, totalCount: 0, search: "" },
  };

  function showErrorMessage(message) {
    if (typeof alert === "function") {
      alert(message);
    } else {
      console.error("[Archiviati] Error:", message);
    }
  }

  function showSuccessMessage(message) {
    if (typeof alert === "function") {
      alert(message);
    } else {
      console.log("[Archiviati] Success:", message);
    }
  }

  function getIE() {
    return window.IESupabase;
  }

  function navigateTo(relativePath) {
    if (window.IEPortal && typeof window.IEPortal.navigateTo === "function") {
      window.IEPortal.navigateTo(relativePath);
      return;
    }
    try {
      const base = new URL(".", window.location.href).href;
      window.location.href = base + relativePath;
    } catch (e) {
      window.location.href = relativePath;
    }
  }

  function el(attr, section) {
    return document.querySelector("[data-archived-" + attr + "=\"" + section + "\"]");
  }

  function showState(section, type, message) {
    ["loading", "error", "empty", "table", "pagination"].forEach(function (key) {
      const node = el(key, section);
      if (!node) return;
      if (key === "error") {
        node.classList.toggle("hidden", type !== "error");
        if (type === "error") node.textContent = message || "Errore di caricamento.";
      } else if (key === "loading") {
        node.classList.toggle("hidden", type !== "loading");
      } else if (key === "empty") {
        node.classList.toggle("hidden", type !== "empty");
      } else if (key === "table") {
        node.classList.toggle("hidden", type !== "table");
      } else if (key === "pagination") {
        node.classList.toggle("hidden", type !== "table");
      }
    });
  }

  async function loadCandidates() {
    const section = SECTIONS.candidates;
    showState(section, "loading");
    const IE = getIE();
    if (!IE) {
      showState(section, "error", "Supabase non disponibile.");
      return;
    }
    const s = state.candidates;
    const filters = { archived: "archived" };
    if ((s.search || "").trim()) filters.name = s.search.trim();
    try {
      const result = await IE.fetchCandidatesPaginated({
        filters,
        page: s.page,
        limit: LIMIT,
      });
      if (result.error) {
        showState(section, "error", result.error.message || "Errore caricamento candidati.");
        return;
      }
      const data = result.data || [];
      const totalCount = result.totalCount || 0;
      s.totalCount = totalCount;
      if (data.length === 0 && totalCount === 0) {
        showState(section, "empty");
        return;
      }
      renderCandidatesTable(data);
      updatePaginationUI(section, totalCount, s.page);
      showState(section, "table");
    } catch (err) {
      console.error("[Archiviati] loadCandidates", err);
      showState(section, "error", err && err.message ? err.message : "Errore di rete.");
    }
  }

  function renderCandidatesTable(rows) {
    const tbody = el("tbody", SECTIONS.candidates);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null;
    rows.forEach(function (row) {
      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
      const position = row.position || "—";
      const status = row.status || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "candidate",
          id: row.id,
          viewUrl: "add-candidato.html?id=" + encodeURIComponent(row.id) + "&mode=view",
          editUrl: "add-candidato.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: name,
          isArchived: true,
          archivedList: true,
          leadingCells: [],
          middleCells: [
            "<span class=\"text-gray-600\">" + escapeHtml(position) + "</span>",
            "<span class=\"text-gray-600\">" + escapeHtml(status) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5";
        tr.innerHTML =
          "<td class=\"px-6 py-4\">" + escapeHtml(name) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(position) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(status) + "</td>" +
          "<td class=\"px-6 py-4 text-right\"><div class=\"flex items-center justify-end space-x-2\">" +
          "<button type=\"button\" data-action=\"preview-entity\" data-entity=\"candidate\" data-id=\"" + escapeHtml(row.id) + "\" class=\"p-2 text-gray-400 hover:text-[#1b4332] transition\" title=\"View\">👁</button>" +
          "<button type=\"button\" data-action=\"restore-entity\" data-entity=\"candidate\" data-id=\"" + escapeHtml(row.id) + "\" class=\"px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition\">Ripristina</button>" +
          "<button type=\"button\" data-action=\"delete-entity-permanent\" data-entity=\"candidate\" data-id=\"" + escapeHtml(row.id) + "\" class=\"px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition\">Elimina definitivamente</button>" +
          "</div></td>";
        tbody.appendChild(tr);
      }
    });
  }

  async function loadJobs() {
    const section = SECTIONS.jobs;
    showState(section, "loading");
    const IE = getIE();
    if (!IE) {
      showState(section, "error", "Supabase non disponibile.");
      return;
    }
    const s = state.jobs;
    const filters = { archived: "archived" };
    if ((s.search || "").trim()) filters.title = s.search.trim();
    try {
      const result = await IE.fetchJobOffersPaginated({
        filters,
        page: s.page,
        limit: LIMIT,
      });
      if (result.error) {
        showState(section, "error", result.error.message || "Errore caricamento offerte.");
        return;
      }
      const data = result.data || [];
      const totalCount = result.totalCount || 0;
      s.totalCount = totalCount;
      if (data.length === 0 && totalCount === 0) {
        showState(section, "empty");
        return;
      }
      renderJobsTable(data);
      updatePaginationUI(section, totalCount, s.page);
      showState(section, "table");
    } catch (err) {
      console.error("[Archiviati] loadJobs", err);
      showState(section, "error", err && err.message ? err.message : "Errore di rete.");
    }
  }

  function renderJobsTable(rows) {
    const tbody = el("tbody", SECTIONS.jobs);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null;
    rows.forEach(function (row) {
      const title = row.title || "—";
      const client = row.client_name || "—";
      const location = row.location || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: "add-offerta.html?id=" + encodeURIComponent(row.id) + "&mode=view",
          editUrl: "add-offerta.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: title,
          isArchived: true,
          archivedList: true,
          leadingCells: [],
          middleCells: [
            "<span class=\"text-gray-600\">" + escapeHtml(client) + "</span>",
            "<span class=\"text-gray-600\">" + escapeHtml(location) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5";
        tr.innerHTML =
          "<td class=\"px-6 py-4\">" + escapeHtml(title) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(client) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(location) + "</td>" +
          '<td class="px-6 py-4 text-right">' +
          '<div class="flex items-center justify-end space-x-2">' +
          '<button type="button" data-action="preview-entity" data-entity="job_offer" data-id="' + escapeHtml(row.id) + '" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">👁</button>' +
          '<button type="button" data-action="restore-entity" data-entity="job_offer" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>' +
          '<button type="button" data-action="delete-entity-permanent" data-entity="job_offer" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      }
    });
  }

  async function loadClients() {
    const section = SECTIONS.clients;
    showState(section, "loading");
    const IE = getIE();
    if (!IE) {
      showState(section, "error", "Supabase non disponibile.");
      return;
    }
    const s = state.clients;
    const filters = { archived: "archived" };
    if ((s.search || "").trim()) filters.name = s.search.trim();
    try {
      const result = await IE.fetchClientsPaginated({
        filters,
        page: s.page,
        limit: LIMIT,
      });
      if (result.error) {
        showState(section, "error", result.error.message || "Errore caricamento clienti.");
        return;
      }
      const data = result.data || [];
      const totalCount = result.totalCount || 0;
      s.totalCount = totalCount;
      if (data.length === 0 && totalCount === 0) {
        showState(section, "empty");
        return;
      }
      renderClientsTable(data);
      updatePaginationUI(section, totalCount, s.page);
      showState(section, "table");
    } catch (err) {
      console.error("[Archiviati] loadClients", err);
      showState(section, "error", err && err.message ? err.message : "Errore di rete.");
    }
  }

  function renderClientsTable(rows) {
    const tbody = el("tbody", SECTIONS.clients);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null;
    rows.forEach(function (row) {
      const name = row.name || "—";
      const city = row.city || "—";
      const state = row.state || "—";
      const email = row.email || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "client",
          id: row.id,
          viewUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=view",
          editUrl: "add-cliente.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: name,
          isArchived: true,
          archivedList: true,
          leadingCells: [],
          middleCells: [
            "<span class=\"text-gray-600\">" + escapeHtml(city) + "</span>",
            "<span class=\"text-gray-600\">" + escapeHtml(state) + "</span>",
            "<span class=\"text-gray-600\">" + escapeHtml(email) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5";
        tr.innerHTML =
          "<td class=\"px-6 py-4\">" + escapeHtml(name) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(city) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(state) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(email) + "</td>" +
          '<td class="px-6 py-4 text-right">' +
          '<div class="flex items-center justify-end space-x-2">' +
          '<button type="button" data-action="preview-entity" data-entity="client" data-id="' + escapeHtml(row.id) + '" class="p-2 text-gray-400 hover:text-[#1b4332] transition" title="View">👁</button>' +
          '<button type="button" data-action="restore-entity" data-entity="client" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>' +
          '<button type="button" data-action="delete-entity-permanent" data-entity="client" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      }
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function updatePaginationUI(section, totalCount, page) {
    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
    const from = totalCount === 0 ? 0 : (page - 1) * LIMIT + 1;
    const to = Math.min(page * LIMIT, totalCount);
    const summaryEl = el("summary", section);
    const pagesEl = el("pages", section);
    const prevBtn = el("prev", section);
    const nextBtn = el("next", section);
    if (summaryEl) summaryEl.textContent = "Mostrando " + from + "–" + to + " di " + totalCount + " risultati";
    if (pagesEl) pagesEl.textContent = "Pagina " + page + " di " + totalPages;
    if (prevBtn) {
      prevBtn.disabled = page <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = page >= totalPages;
    }
  }

  function setupPagination(section) {
    const prevBtn = el("prev", section);
    const nextBtn = el("next", section);
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (section === SECTIONS.candidates) {
          if (state.candidates.page > 1) {
            state.candidates.page--;
            loadCandidates();
          }
        } else if (section === SECTIONS.jobs) {
          if (state.jobs.page > 1) {
            state.jobs.page--;
            loadJobs();
          }
        } else if (section === SECTIONS.clients) {
          if (state.clients.page > 1) {
            state.clients.page--;
            loadClients();
          }
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var s, totalPages;
        if (section === SECTIONS.candidates) {
          s = state.candidates;
          totalPages = Math.ceil(s.totalCount / LIMIT);
          if (s.page < totalPages) {
            s.page++;
            loadCandidates();
          }
        } else if (section === SECTIONS.jobs) {
          s = state.jobs;
          totalPages = Math.ceil(s.totalCount / LIMIT);
          if (s.page < totalPages) {
            s.page++;
            loadJobs();
          }
        } else if (section === SECTIONS.clients) {
          s = state.clients;
          totalPages = Math.ceil(s.totalCount / LIMIT);
          if (s.page < totalPages) {
            s.page++;
            loadClients();
          }
        }
      });
    }
  }

  function setupSearch(section) {
    var inputId = "search-" + (section === SECTIONS.candidates ? "candidates" : section === SECTIONS.jobs ? "jobs" : "clients");
    var input = document.getElementById(inputId);
    if (!input) return;
    var timeout;
    function apply() {
      if (section === SECTIONS.candidates) {
        state.candidates.search = input.value;
        state.candidates.page = 1;
        loadCandidates();
      } else if (section === SECTIONS.jobs) {
        state.jobs.search = input.value;
        state.jobs.page = 1;
        loadJobs();
      } else if (section === SECTIONS.clients) {
        state.clients.search = input.value;
        state.clients.page = 1;
        loadClients();
      }
    }
    input.addEventListener("input", function () {
      clearTimeout(timeout);
      timeout = setTimeout(apply, 300);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        clearTimeout(timeout);
        apply();
      }
    });
  }

  async function init() {
    setupPagination(SECTIONS.candidates);
    setupPagination(SECTIONS.jobs);
    setupPagination(SECTIONS.clients);
    setupSearch(SECTIONS.candidates);
    setupSearch(SECTIONS.jobs);
    setupSearch(SECTIONS.clients);

    await Promise.all([loadCandidates(), loadJobs(), loadClients()]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
