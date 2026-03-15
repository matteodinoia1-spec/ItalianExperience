if (typeof window.debugLog === "function") window.debugLog("ARCHIVED JS ACTIVE - VERSION 1");
/**
 * Archived page – Supabase integration
 * Loads archived candidates, job offers, and clients with pagination, search, and restore.
 * Requires: Supabase CDN, supabase.js, app.js (auth).
 */
(function () {
  "use strict";

  const LIMIT = 10;
  const SECTIONS = {
    candidates: "candidates",
    jobs: "jobs",
    clients: "clients",
    applications: "applications",
  };

  let state = {
    candidates: { page: 1, totalCount: 0, search: "" },
    jobs: { page: 1, totalCount: 0, search: "" },
    clients: { page: 1, totalCount: 0, search: "" },
    applications: { page: 1, totalCount: 0, search: "" },
  };

  function showErrorMessage(message) {
    if (typeof alert === "function") {
      alert(message);
    } else {
      console.error("[Archived] Error:", message);
    }
  }

  function showSuccessMessage(message) {
    if (typeof alert === "function") {
      alert(message);
    } else {
      if (typeof window.debugLog === "function") window.debugLog("[Archived] Success:", message);
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
    return document.querySelector("[data-archived-" + attr + '="' + section + '"]');
  }

  function showState(section, type, message) {
    ["loading", "error", "empty", "table", "pagination"].forEach(function (key) {
      const node = el(key, section);
      if (!node) return;
      if (key === "error") {
        node.classList.toggle("hidden", type !== "error");
        if (type === "error") node.textContent = message || "Loading error.";
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
      showState(section, "error", "Supabase unavailable.");
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
        showState(section, "error", result.error.message || "Error loading candidates.");
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
      console.error("[Archived] loadCandidates", err);
      showState(section, "error", err && err.message ? err.message : "Network error.");
    }
  }

  function renderCandidatesTable(rows) {
    const tbody = el("tbody", SECTIONS.candidates);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = (window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null) || (window.IEListsRuntime && typeof window.IEListsRuntime.renderEntityRow === "function"
      ? window.IEListsRuntime.renderEntityRow
      : null);
    const links = window.IEPortal && window.IEPortal.links ? window.IEPortal.links : null;
    rows.forEach(function (row) {
      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
      const position = row.position || "—";
      const status = row.status || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "candidate",
          id: row.id,
          viewUrl: links
            ? links.candidateView(row.id)
            : "candidate.html?id=" + encodeURIComponent(row.id),
          editUrl: links
            ? links.candidateEdit(row.id)
            : "candidate.html?id=" + encodeURIComponent(row.id) + "&mode=edit",
          title: name,
          isArchived: true,
          archivedList: true,
          actionCellOpts: { showPreviewButton: false },
          leadingCells: [],
          middleCells: [
            '<span class="ie-text-muted">' + escapeHtml(position) + "</span>",
            '<span class="ie-text-muted">' + escapeHtml(status) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5 clickable-row";
        tr.setAttribute("data-entity", "candidate");
        tr.setAttribute("data-id", String(row.id || ""));
        tr.innerHTML =
          '<td class="ie-table-cell ie-table-cell--primary">' + escapeHtml(name) + "</td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(position) + "</span></td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(status) + "</span></td>" +
          '<td class="ie-table-cell ie-table-actions"><div class="flex items-center justify-end gap-2">' +
          '<button type="button" data-action="restore-entity" data-entity="candidate" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-success" title="Restore candidate">Ripristina</button>' +
          '<button type="button" data-action="delete-entity-permanent" data-entity="candidate" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-danger" title="Elimina definitivamente">Elimina definitivamente</button>' +
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
      showState(section, "error", "Supabase unavailable.");
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
        showState(section, "error", result.error.message || "Error loading job offers.");
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
      console.error("[Archived] loadJobs", err);
      showState(section, "error", err && err.message ? err.message : "Network error.");
    }
  }

  function renderJobsTable(rows) {
    const tbody = el("tbody", SECTIONS.jobs);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = (window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null) || (window.IEListsRuntime && typeof window.IEListsRuntime.renderEntityRow === "function"
      ? window.IEListsRuntime.renderEntityRow
      : null);
    const links = window.IEPortal && window.IEPortal.links ? window.IEPortal.links : null;
    rows.forEach(function (row) {
      const title = row.title || "—";
      const client = row.client_name || "—";
      const location = row.location || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "job_offer",
          id: row.id,
          viewUrl: links
            ? links.offerView(row.id)
            : "job-offer.html?id=" + encodeURIComponent(String(row.id)) + "&mode=view",
          editUrl: links
            ? links.offerEdit(row.id)
            : "job-offer.html?id=" + encodeURIComponent(String(row.id)) + "&mode=edit",
          title: title,
          isArchived: true,
          archivedList: true,
          actionCellOpts: { showPreviewButton: false },
          leadingCells: [],
          middleCells: [
            '<span class="ie-text-muted">' + escapeHtml(client) + "</span>",
            '<span class="ie-text-muted">' + escapeHtml(location) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5 clickable-row";
        tr.setAttribute("data-entity", "jobOffer");
        tr.setAttribute("data-id", String(row.id || ""));
        tr.innerHTML =
          '<td class="ie-table-cell ie-table-cell--primary">' + escapeHtml(title) + "</td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(client) + "</span></td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(location) + "</span></td>" +
          '<td class="ie-table-cell ie-table-actions"><div class="flex items-center justify-end gap-2">' +
          '<button type="button" data-action="restore-entity" data-entity="job_offer" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-success" title="Restore job offer">Ripristina</button>' +
          '<button type="button" data-action="delete-entity-permanent" data-entity="job_offer" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-danger" title="Elimina definitivamente">Elimina definitivamente</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      }
    });
  }

  async function loadApplications() {
    const section = SECTIONS.applications;
    showState(section, "loading");
    const IE = getIE();
    if (!IE || !IE.fetchApplicationsPaginated) {
      showState(section, "error", "Supabase unavailable.");
      return;
    }
    const s = state.applications;
    const filters = { status: "withdrawn" };
    try {
      const result = await IE.fetchApplicationsPaginated(filters, { page: s.page, limit: LIMIT });
      if (result.error) {
        showState(section, "error", result.error.message || "Error loading applications.");
        return;
      }
      let data = result.data || [];
      if ((s.search || "").trim()) {
        const term = s.search.trim().toLowerCase();
        data = data.filter(function (row) {
          return (
            (row.candidate_name || "").toLowerCase().indexOf(term) !== -1 ||
            (row.job_offer_title || "").toLowerCase().indexOf(term) !== -1 ||
            (row.client_name || "").toLowerCase().indexOf(term) !== -1
          );
        });
      }
      const totalCount = result.totalCount || 0;
      s.totalCount = totalCount;
      if (data.length === 0 && totalCount === 0) {
        showState(section, "empty");
        return;
      }
      renderApplicationsTable(data);
      updatePaginationUI(section, totalCount, s.page);
      showState(section, "table");
    } catch (err) {
      console.error("[Archived] loadApplications", err);
      showState(section, "error", err && err.message ? err.message : "Network error.");
    }
  }

  function getApplicationStatusBadgeClass(status) {
    if (window.IEPortal && typeof window.IEPortal.getApplicationStatusBadgeClass === "function") {
      return window.IEPortal.getApplicationStatusBadgeClass(status);
    }
    return "badge-withdrawn";
  }
  function formatApplicationStatusLabel(status) {
    if (window.IEPortal && typeof window.IEPortal.formatApplicationStatusLabel === "function") {
      return window.IEPortal.formatApplicationStatusLabel(status);
    }
    return status || "Withdrawn";
  }

  function renderApplicationsTable(rows) {
    const tbody = el("tbody", SECTIONS.applications);
    if (!tbody) return;
    tbody.innerHTML = "";
    const candidateViewUrl = window.IEPortal && window.IEPortal.links && window.IEPortal.links.candidateView
      ? window.IEPortal.links.candidateView
      : function (id) { return "candidate.html?id=" + encodeURIComponent(String(id || "")); };
    rows.forEach(function (row) {
      const tr = document.createElement("tr");
      tr.className = "table-row transition hover:bg-[#c5a059]/5 clickable-row";
      tr.setAttribute("data-entity", "application");
      tr.setAttribute("data-id", String(row.id || ""));
      const withdrawnDate = row.created_at ? new Date(row.created_at).toLocaleDateString("it-IT") : "—";
      tr.innerHTML =
        '<td class="ie-table-cell ie-table-cell--primary"><a href="' + candidateViewUrl(row.candidate_id) + '" class="table-link">' + escapeHtml(row.candidate_name || "—") + "</a></td>" +
        '<td class="ie-table-cell ie-table-cell--secondary">' + escapeHtml(row.job_offer_title || "—") + "</td>" +
        '<td class="ie-table-cell ie-table-cell--secondary">' + escapeHtml(row.client_name || "—") + "</td>" +
        '<td class="ie-table-cell"><span class="badge ' + getApplicationStatusBadgeClass(row.status) + '">' + escapeHtml(formatApplicationStatusLabel(row.status)) + "</span></td>" +
        '<td class="ie-table-cell ie-table-cell--date">' + escapeHtml(withdrawnDate) + "</td>" +
        '<td class="ie-table-cell ie-table-actions"><div class="flex items-center justify-end gap-2">' +
        '<button type="button" data-action="restore-entity" data-entity="application" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-success" title="Restore application">Ripristina</button>' +
        '<button type="button" data-action="delete-entity-permanent" data-entity="application" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-danger" title="Elimina definitivamente">Elimina definitivamente</button>' +
        "</div></td>";
      tbody.appendChild(tr);
    });
  }

  async function loadClients() {
    const section = SECTIONS.clients;
    showState(section, "loading");
    const IE = getIE();
    if (!IE) {
      showState(section, "error", "Supabase unavailable.");
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
        showState(section, "error", result.error.message || "Error loading clients.");
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
      console.error("[Archived] loadClients", err);
      showState(section, "error", err && err.message ? err.message : "Network error.");
    }
  }

  function renderClientsTable(rows) {
    const tbody = el("tbody", SECTIONS.clients);
    if (!tbody) return;
    tbody.innerHTML = "";
    const renderRow = (window.IEPortal && typeof window.IEPortal.renderEntityRow === "function"
      ? window.IEPortal.renderEntityRow
      : null) || (window.IEListsRuntime && typeof window.IEListsRuntime.renderEntityRow === "function"
      ? window.IEListsRuntime.renderEntityRow
      : null);
    const links = window.IEPortal && window.IEPortal.links ? window.IEPortal.links : null;
    rows.forEach(function (row) {
      const name = row.name || "—";
      const city = row.city || "—";
      const stateName = row.state || "—";
      const email = row.email || "—";
      if (renderRow) {
        const tr = renderRow({
          entityType: "client",
          id: row.id,
          viewUrl: links && typeof links.clientView === "function"
            ? links.clientView(row.id)
            : "client.html?id=" + encodeURIComponent(String(row.id)) + "&mode=view",
          editUrl: links && typeof links.clientEdit === "function"
            ? links.clientEdit(row.id)
            : "client.html?id=" + encodeURIComponent(String(row.id)) + "&mode=edit",
          title: name,
          isArchived: true,
          archivedList: true,
          actionCellOpts: { showPreviewButton: false },
          leadingCells: [],
          middleCells: [
            '<span class="ie-text-muted">' + escapeHtml(city) + "</span>",
            '<span class="ie-text-muted">' + escapeHtml(stateName) + "</span>",
            '<span class="ie-text-muted">' + escapeHtml(email) + "</span>",
          ],
          rowClass: "table-row transition hover:bg-[#c5a059]/5",
        });
        tbody.appendChild(tr);
      } else {
        const tr = document.createElement("tr");
        tr.className = "table-row transition hover:bg-[#c5a059]/5 clickable-row";
        tr.setAttribute("data-entity", "client");
        tr.setAttribute("data-id", String(row.id || ""));
        tr.innerHTML =
          '<td class="ie-table-cell ie-table-cell--primary">' + escapeHtml(name) + "</td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(city) + "</span></td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(stateName) + "</span></td>" +
          '<td class="ie-table-cell"><span class="ie-text-muted">' + escapeHtml(email) + "</span></td>" +
          '<td class="ie-table-cell ie-table-actions"><div class="flex items-center justify-end gap-2">' +
          '<button type="button" data-action="restore-entity" data-entity="client" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-success" title="Restore client">Ripristina</button>' +
          '<button type="button" data-action="delete-entity-permanent" data-entity="client" data-id="' + escapeHtml(row.id) + '" class="ie-btn ie-btn-danger" title="Elimina definitivamente">Elimina definitivamente</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      }
    });
  }

  async function loadApplications() {
    const section = SECTIONS.applications;
    showState(section, "loading");
    if (
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.getArchivedApplications !== "function"
    ) {
      showState(section, "error", "Applications API unavailable.");
      return;
    }
    const s = state.applications;
    try {
      const result = await window.IEQueries.applications.getArchivedApplications();
      if (result.error) {
        showState(section, "error", result.error.message || "Error loading applications.");
        return;
      }
      let data = result.data || [];
      if ((s.search || "").trim()) {
        const term = s.search.trim().toLowerCase();
        data = data.filter(function (row) {
          const candidateName = (row.candidate_name || "").toLowerCase();
          const offerTitle = (row.job_offer_title || "").toLowerCase();
          const clientName = (row.client_name || "").toLowerCase();
          return (
            candidateName.indexOf(term) !== -1 ||
            offerTitle.indexOf(term) !== -1 ||
            clientName.indexOf(term) !== -1
          );
        });
      }
      const totalCount = data.length;
      s.totalCount = totalCount;
      if (totalCount === 0) {
        showState(section, "empty");
        return;
      }
      const start = (s.page - 1) * LIMIT;
      const pageRows = data.slice(start, start + LIMIT);
      renderApplicationsTable(pageRows);
      updatePaginationUI(section, totalCount, s.page);
      showState(section, "table");
    } catch (err) {
      console.error("[Archived] loadApplications", err);
      showState(section, "error", err && err.message ? err.message : "Network error.");
    }
  }

  function renderApplicationsTable(rows) {
    const tbody = el("tbody", SECTIONS.applications);
    if (!tbody) return;
    tbody.innerHTML = "";
    rows.forEach(function (row) {
      const candidateName = row.candidate_name || "—";
      const offerTitle = row.job_offer_title || "—";
      const clientName = row.client_name || "—";
      const tr = document.createElement("tr");
      tr.className = "table-row transition hover:bg-[#c5a059]/5 clickable-row";
      tr.setAttribute("data-entity", "application");
      tr.setAttribute("data-id", String(row.id || ""));
      tr.innerHTML =
        '<td class="ie-table-cell ie-table-cell--primary">' +
        escapeHtml(candidateName) +
        "</td>" +
        '<td class="ie-table-cell ie-table-cell--secondary">' +
        escapeHtml(offerTitle) +
        "</td>" +
        '<td class="ie-table-cell ie-table-cell--secondary">' +
        escapeHtml(clientName) +
        "</td>" +
        '<td class="ie-table-cell ie-table-actions"><div class="flex items-center justify-end gap-2">' +
        '<button type="button" data-action="restore-application" data-id="' +
        escapeHtml(row.id) +
        '" class="ie-btn ie-btn-success" title="Restore application">Ripristina</button>' +
        '<button type="button" data-action="delete-application-permanent" data-id="' +
        escapeHtml(row.id) +
        '" class="ie-btn ie-btn-danger" title="Elimina definitivamente">Elimina definitivamente</button>' +
        "</div></td>";
      tbody.appendChild(tr);
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
    if (summaryEl) summaryEl.textContent = "Showing " + from + "–" + to + " of " + totalCount + " results";
    if (pagesEl) pagesEl.textContent = "Page " + page + " of " + totalPages;
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
        } else if (section === SECTIONS.applications) {
          if (state.applications.page > 1) {
            state.applications.page--;
            loadApplications();
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
        } else if (section === SECTIONS.applications) {
          s = state.applications;
          totalPages = Math.ceil(s.totalCount / LIMIT);
          if (s.page < totalPages) {
            s.page++;
            loadApplications();
          }
        }
      });
    }
  }

  function setupSearch(section) {
    var inputId =
      "search-" +
      (section === SECTIONS.candidates
        ? "candidates"
        : section === SECTIONS.jobs
        ? "jobs"
        : section === SECTIONS.clients
        ? "clients"
        : "applications");
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
      } else if (section === SECTIONS.applications) {
        state.applications.search = input.value;
        state.applications.page = 1;
        loadApplications();
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

  document.addEventListener("click", async function (event) {
    const previewAppBtn = event.target.closest(
      "[data-action='preview-entity'][data-entity='application']"
    );
    const restoreAppBtn = event.target.closest(
      "[data-action='restore-application']"
    );
    const deleteAppBtn = event.target.closest(
      "[data-action='delete-application-permanent']"
    );

    if (previewAppBtn) {
      event.preventDefault();
      const id = previewAppBtn.getAttribute("data-id");
      if (!id) return;
      const href = "application.html?id=" + encodeURIComponent(id);
      navigateTo(href);
      return;
    }

    if (restoreAppBtn) {
      event.preventDefault();
      const id = restoreAppBtn.getAttribute("data-id");
      if (!id) return;
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.updateApplicationStatus !== "function"
      ) {
        showErrorMessage("Applications API unavailable.");
        return;
      }
      try {
        const result =
          await window.IEQueries.applications.updateApplicationStatus(
            id,
            "applied",
            {}
          );
        if (result.error) {
          showErrorMessage(
            result.error.message || "Error restoring application."
          );
        } else {
          showSuccessMessage("Application restored.");
          state.applications.page = 1;
          loadApplications();
        }
      } catch (err) {
        console.error("[Archived] restore application error", err);
        showErrorMessage("Error restoring application.");
      }
      return;
    }

    if (deleteAppBtn) {
      event.preventDefault();
      const id = deleteAppBtn.getAttribute("data-id");
      if (!id) return;
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.deleteApplicationPermanently !==
          "function"
      ) {
        showErrorMessage("Applications API unavailable.");
        return;
      }
      if (
        !confirm(
          "Are you sure you want to permanently delete this application?"
        )
      ) {
        return;
      }
      try {
        const result =
          await window.IEQueries.applications.deleteApplicationPermanently(id);
        if (result.error) {
          showErrorMessage(
            result.error.message || "Error deleting application."
          );
        } else {
          showSuccessMessage("Application deleted permanently.");
          state.applications.page = 1;
          loadApplications();
        }
      } catch (err) {
        console.error("[Archived] delete application error", err);
        showErrorMessage("Error deleting application.");
      }
      return;
    }
  });

  async function init() {
    setupPagination(SECTIONS.candidates);
    setupPagination(SECTIONS.jobs);
    setupPagination(SECTIONS.clients);
    setupPagination(SECTIONS.applications);
    setupSearch(SECTIONS.candidates);
    setupSearch(SECTIONS.jobs);
    setupSearch(SECTIONS.clients);
    setupSearch(SECTIONS.applications);

    await Promise.all([loadCandidates(), loadJobs(), loadClients(), loadApplications()]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

