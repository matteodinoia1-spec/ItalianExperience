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

  function getIE() {
    return window.IESupabase;
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
    tbody.innerHTML = rows
      .map(function (row) {
        const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
        const position = row.position || "—";
        const status = row.status || "—";
        return (
          '<tr class="table-row transition hover:bg-[#c5a059]/5">' +
          "<td class=\"px-6 py-4\">" + escapeHtml(name) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(position) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(status) + "</td>" +
          '<td class="px-6 py-4 text-right">' +
          '<div class="flex items-center justify-end space-x-2">' +
          '<button type="button" data-action="restore-candidate" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>' +
          '<button type="button" data-action="delete-candidate-permanent" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>' +
          "</div></td></tr>"
        );
      })
      .join("");
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
    tbody.innerHTML = rows
      .map(function (row) {
        const title = row.title || "—";
        const client = row.client_name || "—";
        const location = row.location || "—";
        return (
          '<tr class="table-row transition hover:bg-[#c5a059]/5">' +
          "<td class=\"px-6 py-4\">" + escapeHtml(title) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(client) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(location) + "</td>" +
          '<td class="px-6 py-4 text-right">' +
          '<div class="flex items-center justify-end space-x-2">' +
          '<button type="button" data-action="restore-job" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>' +
          '<button type="button" data-action="delete-job-permanent" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>' +
          "</div></td></tr>"
        );
      })
      .join("");
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
    tbody.innerHTML = rows
      .map(function (row) {
        const name = row.name || "—";
        const city = row.city || "—";
        const state = row.state || "—";
        const email = row.email || "—";
        return (
          '<tr class="table-row transition hover:bg-[#c5a059]/5">' +
          "<td class=\"px-6 py-4\">" + escapeHtml(name) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(city) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(state) + "</td>" +
          "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(email) + "</td>" +
          '<td class="px-6 py-4 text-right">' +
          '<div class="flex items-center justify-end space-x-2">' +
          '<button type="button" data-action="restore-client" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 transition">Ripristina</button>' +
          '<button type="button" data-action="delete-client-permanent" data-id="' + escapeHtml(row.id) + '" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition">Elimina definitivamente</button>' +
          "</div></td></tr>"
        );
      })
      .join("");
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

  async function restoreCandidate(id) {
    const IE = getIE();
    if (!IE || !IE.unarchiveCandidate) return;
    try {
      const { error } = await IE.unarchiveCandidate(id);
      if (error) {
        IE.showError && IE.showError(error.message || "Ripristino non riuscito.");
        return;
      }
      IE.showSuccess && IE.showSuccess("Candidato ripristinato.");
      await loadCandidates();
    } catch (err) {
      console.error("[Archiviati] restoreCandidate", err);
      IE.showError && IE.showError(err && err.message ? err.message : "Errore di rete.");
    }
  }

  async function restoreJob(id) {
    const IE = getIE();
    if (!IE || !IE.unarchiveJobOffer) return;
    try {
      const { error } = await IE.unarchiveJobOffer(id);
      if (error) {
        IE.showError && IE.showError(error.message || "Ripristino non riuscito.");
        return;
      }
      IE.showSuccess && IE.showSuccess("Offerta ripristinata.");
      await loadJobs();
    } catch (err) {
      console.error("[Archiviati] restoreJob", err);
      IE.showError && IE.showError(err && err.message ? err.message : "Errore di rete.");
    }
  }

  async function restoreClient(id) {
    const IE = getIE();
    if (!IE || !IE.unarchiveClient) return;
    try {
      const { error } = await IE.unarchiveClient(id);
      if (error) {
        IE.showError && IE.showError(error.message || "Ripristino non riuscito.");
        return;
      }
      IE.showSuccess && IE.showSuccess("Cliente ripristinato.");
      await loadClients();
    } catch (err) {
      console.error("[Archiviati] restoreClient", err);
      IE.showError && IE.showError(err && err.message ? err.message : "Errore di rete.");
    }
  }

  async function deletePermanently(id, tableName, section) {
    const IE = getIE();
  
    if (!IE || !IE.supabase) {
      console.error("[Archiviati] deletePermanently: Supabase non disponibile.");
      if (IE && IE.showError) {
        IE.showError("Supabase non disponibile. Impossibile eliminare definitivamente.");
      } else if (typeof alert === "function") {
        alert("Errore durante eliminazione definitiva.");
      }
      return;
    }
  
    try {
      const { data, error, status } = await IE.supabase
        .from(tableName)
        .delete()
        .eq("id", id);
  
      console.log("DELETE DEBUG →", {
        tableName,
        id,
        data,
        error,
        status
      });
  
      if (error) {
        console.error("[Archiviati] Permanent delete failed:", error);
        if (IE.showError) {
          IE.showError(error.message || "Errore durante eliminazione definitiva.");
        } else if (typeof alert === "function") {
          alert("Errore durante eliminazione definitiva.");
        }
        return;
      }
  
      if (IE.showSuccess) {
        IE.showSuccess("Record eliminato definitivamente.");
      }
  
      if (section === SECTIONS.candidates) {
        await loadCandidates();
      } else if (section === SECTIONS.jobs) {
        await loadJobs();
      } else if (section === SECTIONS.clients) {
        await loadClients();
      }
  
    } catch (err) {
      console.error("[Archiviati] deletePermanently exception:", err);
      if (IE && IE.showError) {
        IE.showError(
          (err && err.message) || "Errore durante eliminazione definitiva."
        );
      } else if (typeof alert === "function") {
        alert("Errore durante eliminazione definitiva.");
      }
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

  function setupRestoreDelegation() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action='restore-candidate']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id) restoreCandidate(id);
        return;
      }
      btn = e.target.closest("[data-action='restore-job']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id) restoreJob(id);
        return;
      }
      btn = e.target.closest("[data-action='restore-client']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id) restoreClient(id);
        return;
      }

      btn = e.target.closest("[data-action='delete-candidate-permanent']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id && window.confirm("Sei sicuro? Questa azione è irreversibile.")) {
          deletePermanently(id, "candidates", SECTIONS.candidates);
        }
        return;
      }

      btn = e.target.closest("[data-action='delete-job-permanent']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id && window.confirm("Sei sicuro? Questa azione è irreversibile.")) {
          deletePermanently(id, "job_offers", SECTIONS.jobs);
        }
        return;
      }

      btn = e.target.closest("[data-action='delete-client-permanent']");
      if (btn) {
        var id = btn.getAttribute("data-id");
        if (id && window.confirm("Sei sicuro? Questa azione è irreversibile.")) {
          deletePermanently(id, "clients", SECTIONS.clients);
        }
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
    setupRestoreDelegation();

    await Promise.all([loadCandidates(), loadJobs(), loadClients()]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
