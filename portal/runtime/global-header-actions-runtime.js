// ============================================================================
// Italian Experience Recruitment Portal - Global Header Actions Runtime
// ----------------------------------------------------------------------------
// Phase 1: Add dropdown. Phase 3A: Global search panel shell.
// Phase 3B: Global search data integration (debounced, unified results list).
// ============================================================================

(function () {
  "use strict";

  var addDropdownListenersBound = false;
  var searchDebounceMs = 280;
  var searchDebounceTimer = null;
  var searchInFlight = false;
  var lastSearchTerm = "";

  function closeAddDropdown() {
    var wrap = document.querySelector(".portal-header-actions__add-wrap");
    var trigger = document.querySelector("[data-global-add-trigger]");
    var menu = document.querySelector(".portal-header-actions__add-menu");
    if (wrap) wrap.classList.remove("portal-header-actions__add-wrap--open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.setAttribute("hidden", "");
  }

  function initAddDropdown() {
    var trigger = document.querySelector("[data-global-add-trigger]");
    var wrap = document.querySelector(".portal-header-actions__add-wrap");
    var menu = document.querySelector(".portal-header-actions__add-menu");
    if (!trigger || !wrap || !menu) return;

    function toggleAddDropdown() {
      var isOpen = wrap.classList.toggle("portal-header-actions__add-wrap--open");
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        menu.removeAttribute("hidden");
      } else {
        menu.setAttribute("hidden", "");
      }
    }

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleAddDropdown();
    });

    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleAddDropdown();
      }
    });

    menu.querySelectorAll(".portal-header-actions__add-item").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var action = link.getAttribute("data-action");
        if (!action) return;
        e.preventDefault();
        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          if (action === "add-candidate") {
            window.IERouter.navigateTo("add-candidate.html");
          } else if (action === "add-job-offer") {
            window.IERouter.navigateTo("add-job-offer.html?mode=create");
          } else if (action === "add-client") {
            window.IERouter.navigateTo("add-client.html");
          }
        } else {
          var href = link.getAttribute("href") || "";
          if (href) window.location.href = href;
        }
        closeAddDropdown();
      });
    });
  }

  function closeSearchPanel() {
    var panel = document.getElementById("portal-header-search-panel");
    var trigger = document.querySelector("[data-global-search-trigger]");
    if (panel) {
      panel.setAttribute("hidden", "");
      panel.classList.remove("portal-header-search-panel--open");
    }
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function openSearchPanel() {
    var panel = document.getElementById("portal-header-search-panel");
    var trigger = document.querySelector("[data-global-search-trigger]");
    var input = document.querySelector("[data-global-search-input]");
    if (!panel || !trigger) return;
    panel.removeAttribute("hidden");
    panel.classList.add("portal-header-search-panel--open");
    trigger.setAttribute("aria-expanded", "true");
    if (input) {
      input.value = "";
      input.focus();
    }
    renderSearchIdle();
  }

  function getSearchResultsContainer() {
    return document.querySelector("[data-global-search-results]");
  }

  function escapeHtml(s) {
    if (window.IEFormatters && typeof window.IEFormatters.escapeHtml === "function") {
      return window.IEFormatters.escapeHtml(s);
    }
    if (s == null) return "";
    var str = String(s);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSearchIdle() {
    var container = getSearchResultsContainer();
    if (!container) return;
    container.innerHTML = "<p class=\"portal-header-search-placeholder\">Start typing to search</p>";
  }

  function renderSearchLoading() {
    var container = getSearchResultsContainer();
    if (!container) return;
    container.innerHTML = "<p class=\"portal-header-search-placeholder\">Searching...</p>";
  }

  function renderSearchEmpty() {
    var container = getSearchResultsContainer();
    if (!container) return;
    container.innerHTML = "<p class=\"portal-header-search-placeholder\">No results found</p>";
  }

  function renderSearchError() {
    var container = getSearchResultsContainer();
    if (!container) return;
    container.innerHTML = "<p class=\"portal-header-search-placeholder portal-header-search-placeholder--error\">Search unavailable</p>";
  }

  function getLinkForResult(item) {
    var id = item.id;
    var links = window.IEPortal && window.IEPortal.links;
    if (links) {
      if (item.type === "candidate" && typeof links.candidateView === "function") return links.candidateView(id);
      if (item.type === "client" && typeof links.clientView === "function") return links.clientView(id);
      if (item.type === "job-offer" && typeof links.offerView === "function") return links.offerView(id);
    }
    if (item.type === "candidate") return "candidate.html?id=" + encodeURIComponent(id);
    if (item.type === "client") return "client.html?id=" + encodeURIComponent(id) + "&mode=view";
    if (item.type === "job-offer") return "job-offer.html?id=" + encodeURIComponent(id) + "&mode=view";
    return "#";
  }

  function renderSearchResults(unified) {
    var container = getSearchResultsContainer();
    if (!container) return;
    if (!unified || unified.length === 0) {
      renderSearchEmpty();
      return;
    }
    var fragment = document.createDocumentFragment();
    var list = document.createElement("div");
    list.className = "portal-header-search-list";
    list.setAttribute("role", "list");
    for (var i = 0; i < unified.length; i++) {
      var item = unified[i];
      var href = getLinkForResult(item);
      var row = document.createElement("a");
      row.className = "portal-header-search-result-row";
      row.setAttribute("href", href);
      row.setAttribute("role", "listitem");
      row.setAttribute("data-type", item.type);
      row.setAttribute("data-id", String(item.id));
      row.setAttribute("data-href", href);
      row.innerHTML =
        "<span class=\"portal-header-search-result-row__title\">" + escapeHtml(item.title || "—") + "</span>" +
        "<span class=\"portal-header-search-result-row__subtitle\">" + escapeHtml(item.subtitle || "") + "</span>";
      list.appendChild(row);
    }
    fragment.appendChild(list);
    container.innerHTML = "";
    container.appendChild(fragment);
  }

  function normalizeCandidate(r) {
    var first = (r && r.first_name) || "";
    var last = (r && r.last_name) || "";
    var title = (first + " " + last).trim() || "—";
    return { type: "candidate", id: r.id, title: title, subtitle: "Candidate", href: "" };
  }

  function normalizeClient(r) {
    return { type: "client", id: r.id, title: (r && r.name) || "—", subtitle: "Client", href: "" };
  }

  function normalizeJobOffer(r) {
    return { type: "job-offer", id: r.id, title: (r && (r.title || r.position)) || "—", subtitle: "Job Offer", href: "" };
  }

  function runGlobalSearch(term) {
    var limit = 5;
    var sb = window.IESupabase;
    if (!sb) return Promise.resolve({ unified: [], error: true });

    var pCandidates =
      typeof sb.searchCandidatesByName === "function"
        ? sb.searchCandidatesByName({ term: term, limit: limit })
        : Promise.resolve({ data: [], error: null });
    var pClients =
      typeof sb.searchClientsByName === "function"
        ? sb.searchClientsByName({ term: term, limit: limit })
        : Promise.resolve({ data: [], error: null });
    var pJobOffers =
      typeof sb.searchJobOffersByTitle === "function"
        ? sb.searchJobOffersByTitle({ term: term, limit: limit })
        : Promise.resolve({ data: [], error: null });

    return Promise.all([pCandidates, pClients, pJobOffers]).then(function (results) {
      var candidateRes = results[0];
      var clientRes = results[1];
      var jobOfferRes = results[2];
      var anyError = (candidateRes && candidateRes.error) || (clientRes && clientRes.error) || (jobOfferRes && jobOfferRes.error);
      if (anyError) return { unified: [], error: true };

      var unified = [];
      var cData = (candidateRes && candidateRes.data) || [];
      var clData = (clientRes && clientRes.data) || [];
      var jData = (jobOfferRes && jobOfferRes.data) || [];
      for (var i = 0; i < cData.length; i++) unified.push(normalizeCandidate(cData[i]));
      for (var j = 0; j < clData.length; j++) unified.push(normalizeClient(clData[j]));
      for (var k = 0; k < jData.length; k++) unified.push(normalizeJobOffer(jData[k]));
      return { unified: unified, error: false };
    });
  }

  function onSearchInput() {
    var input = document.querySelector("[data-global-search-input]");
    if (!input) return;
    var raw = (input.value || "").trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (!raw) {
      lastSearchTerm = "";
      renderSearchIdle();
      return;
    }
    renderSearchLoading();
    searchDebounceTimer = setTimeout(function () {
      searchDebounceTimer = null;
      var term = raw;
      lastSearchTerm = term;
      searchInFlight = true;
      runGlobalSearch(term).then(function (out) {
        searchInFlight = false;
        var currentInput = document.querySelector("[data-global-search-input]");
        var currentTerm = currentInput ? (currentInput.value || "").trim() : "";
        if (currentTerm !== lastSearchTerm) return;
        if (out.error) {
          renderSearchError();
          return;
        }
        if (!out.unified || out.unified.length === 0) {
          renderSearchEmpty();
          return;
        }
        renderSearchResults(out.unified);
      });
    }, searchDebounceMs);
  }

  function onSearchResultClick(e) {
    var row = e.target && e.target.closest && e.target.closest(".portal-header-search-result-row");
    if (!row) return;
    e.preventDefault();
    var href = row.getAttribute("data-href") || row.getAttribute("href") || "";
    if (href && href !== "#") {
      if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
        window.IERouter.navigateTo(href);
      } else {
        window.location.href = href;
      }
    }
    closeSearchPanel();
  }

  function isSearchPanelOpen() {
    var panel = document.getElementById("portal-header-search-panel");
    return panel && !panel.hasAttribute("hidden");
  }

  function bindDocumentListeners() {
    if (addDropdownListenersBound) return;
    addDropdownListenersBound = true;

    document.addEventListener("click", function (e) {
      if (!e.target || !e.target.closest) return;
      var insideActions = e.target.closest(".portal-header-actions");
      if (!insideActions) closeAddDropdown();

      var insideSearchPanel = e.target.closest(".portal-header-search-panel");
      var onSearchTrigger = e.target.closest("[data-global-search-trigger]");
      if (!insideSearchPanel && !onSearchTrigger && isSearchPanelOpen()) {
        closeSearchPanel();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (isSearchPanelOpen()) {
          closeSearchPanel();
        } else {
          closeAddDropdown();
        }
      }
    });
  }

  function initSearchTrigger() {
    var trigger = document.querySelector("[data-global-search-trigger]");
    var panel = document.getElementById("portal-header-search-panel");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isSearchPanelOpen()) {
        closeSearchPanel();
      } else {
        closeAddDropdown();
        if (window.IEHeaderRuntime && typeof window.IEHeaderRuntime.closeCandidatesSubmenu === "function") {
          window.IEHeaderRuntime.closeCandidatesSubmenu();
        }
        openSearchPanel();
      }
    });
  }

  function initSearchInput() {
    var input = document.querySelector("[data-global-search-input]");
    var resultsContainer = getSearchResultsContainer();
    if (input) {
      input.addEventListener("input", onSearchInput);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeSearchPanel();
        }
      });
    }
    if (resultsContainer) {
      resultsContainer.addEventListener("click", onSearchResultClick);
    }
  }

  function init() {
    initAddDropdown();
    initSearchTrigger();
    initSearchInput();
    bindDocumentListeners();
  }

  var listenerBound = false;
  function bindHeaderLoadedListener() {
    if (listenerBound) return;
    listenerBound = true;
    document.addEventListener("ie:header-loaded", init);
  }

  bindHeaderLoadedListener();

  // If header was already loaded (e.g. script loaded late), init immediately.
  if (document.querySelector(".portal-header-actions")) {
    init();
  }
})();
