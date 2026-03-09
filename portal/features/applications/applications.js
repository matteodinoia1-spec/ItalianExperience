(function () {
  "use strict";

  var PAGE_SIZE = 25;

  function ensureAuth() {
    return new Promise(function (resolve) {
      if (!window.IESupabase) {
        if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
          window.IEAuth.redirectToLogin();
        } else if (
          window.IESupabase &&
          typeof window.IESupabase.redirectToLogin === "function"
        ) {
          window.IESupabase.redirectToLogin();
        }
        resolve(null);
        return;
      }

      if (typeof window.IESupabase.requireAuth === "function") {
        window.IESupabase
          .requireAuth()
          .then(function (user) {
            if (!user) {
              resolve(null);
            } else {
              resolve(user);
            }
          })
          .catch(function () {
            if (
              typeof window.IESupabase.redirectToLogin === "function"
            ) {
              window.IESupabase.redirectToLogin();
            } else if (
              window.IEAuth &&
              typeof window.IEAuth.redirectToLogin === "function"
            ) {
              window.IEAuth.redirectToLogin();
            }
            resolve(null);
          });
        return;
      }

      if (window.IESupabase.supabase && window.IESupabase.supabase.auth) {
        window.IESupabase.supabase.auth
          .getSession()
          .then(function (sessionResult) {
            if (
              !sessionResult ||
              !sessionResult.data ||
              !sessionResult.data.session
            ) {
              if (
                typeof window.IESupabase.redirectToLogin === "function"
              ) {
                window.IESupabase.redirectToLogin();
              } else if (
                window.IEAuth &&
                typeof window.IEAuth.redirectToLogin === "function"
              ) {
                window.IEAuth.redirectToLogin();
              }
              resolve(null);
            } else {
              resolve(sessionResult.data.session.user || null);
            }
          })
          .catch(function () {
            if (
              typeof window.IESupabase.redirectToLogin === "function"
            ) {
              window.IESupabase.redirectToLogin();
            } else if (
              window.IEAuth &&
              typeof window.IEAuth.redirectToLogin === "function"
            ) {
              window.IEAuth.redirectToLogin();
            }
            resolve(null);
          });
        return;
      }

      resolve(null);
    });
  }

  function initApplicationsPage() {
    var tbody = document.querySelector("[data-ie-applications-body]");
    if (!tbody) return;

    var statusSelect = document.querySelector(
      '[data-filter="application-status"]'
    );
    var offerSelect = document.querySelector(
      '[data-filter="application-offer"]'
    );
    var clientSelect = document.querySelector(
      '[data-filter="application-client"]'
    );
    var candidateInput = document.querySelector(
      '[data-filter="application-candidate"]'
    );
    var dateFromInput = document.querySelector(
      '[data-filter="application-date-from"]'
    );
    var dateToInput = document.querySelector(
      '[data-filter="application-date-to"]'
    );

    var viewModeButtons = document.querySelectorAll(
      "[data-view-mode]"
    );
    var listViewEl = document.querySelector(
      '[data-ie-applications-view="list"]'
    );
    var pipelineViewEl = document.querySelector(
      '[data-ie-applications-view="pipeline"]'
    );

    var pipelineBarEl = document.querySelector(
      "[data-ie-applications-pipeline]"
    );
    var pipelineBoardEl = document.querySelector(
      "[data-ie-applications-pipeline-board]"
    );

    var paginationContainer = document.querySelector(
      "[data-ie-applications-pagination]"
    );

    var filters = {
      status: "",
      jobOfferId: "",
      clientId: "",
      candidateName: "",
      dateFrom: "",
      dateTo: "",
    };

    var currentPage = 1;

    function updateViewMode(mode) {
      viewModeButtons.forEach(function (btn) {
        var btnMode = btn.getAttribute("data-view-mode");
        if (btnMode === mode) {
          btn.classList.add("bg-white", "text-[#1b4332]");
          btn.classList.remove("text-gray-600");
        } else {
          btn.classList.remove("bg-white", "text-[#1b4332]");
          btn.classList.add("text-gray-600");
        }
      });
      if (mode === "pipeline") {
        if (listViewEl) listViewEl.classList.add("hidden");
        if (pipelineViewEl) pipelineViewEl.classList.remove("hidden");
        renderPipelineBoard();
      } else {
        if (pipelineViewEl) pipelineViewEl.classList.add("hidden");
        if (listViewEl) listViewEl.classList.remove("hidden");
        renderApplications();
      }
    }

    viewModeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-view-mode") || "list";
        updateViewMode(mode);
      });
    });

    function attachRowNavigation(tr, application) {
      if (!tr || !application) return;
      tr.addEventListener("click", function (event) {
        var target = event.target;
        if (target.closest("a, button, svg, path")) return;
        var href =
          "application.html?id=" + encodeURIComponent(String(application.id));
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          window.IERouter.navigateTo(href);
        } else {
          window.location.href = href;
        }
      });
    }

    function renderApplications() {
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.getApplications !== "function"
      ) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Applications API not available.</td></tr>';
        return;
      }

      tbody.innerHTML =
        '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>';

      var queryFilters = {
        status: filters.status,
        jobOfferId: filters.jobOfferId || undefined,
        clientId: filters.clientId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      window.IEQueries.applications
        .getApplications({
          filters: queryFilters,
          page: currentPage,
          limit: PAGE_SIZE,
        })
        .then(function (result) {
          if (result.error) {
            console.error(
              "[Applications] getApplications error:",
              result.error
            );
            tbody.innerHTML =
              '<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading applications.</td></tr>';
            updatePaginationUI(0, 0);
            return;
          }

          var rows = Array.isArray(result.data) ? result.data.slice() : [];

          if (filters.candidateName) {
            var term = filters.candidateName.toLowerCase();
            rows = rows.filter(function (app) {
              var name = (app.candidate_name || "").toLowerCase();
              return name.indexOf(term) !== -1;
            });
          }

          renderApplicationRows(rows);
          updatePaginationUI(result.totalCount || rows.length, rows.length);
        })
        .catch(function (err) {
          console.error(
            "[Applications] getApplications exception:",
            err
          );
          tbody.innerHTML =
            '<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading applications.</td></tr>';
          updatePaginationUI(0, 0);
        });
    }

    function getApplicationStatusBadgeClass(status) {
      var s = (status || "").toString().toLowerCase();
      if (s === "new") s = "applied";
      if (s === "offered") s = "offer";
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
        case "not_selected":
          return "badge-neutral";
        default:
          return "badge-applied";
      }
    }

    function renderApplicationRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No applications found.</td></tr>';
        return;
      }

      rows.forEach(function (app) {
        var tr = document.createElement("tr");
        tr.className = "table-row transition clickable-row";

        var tdCandidate = document.createElement("td");
        tdCandidate.className = "ie-table-cell";
        var candidateName = app.candidate_name || "—";
        if (app.candidate_id) {
          var cLink = document.createElement("a");
          cLink.href =
            "candidate.html?id=" +
            encodeURIComponent(String(app.candidate_id));
          cLink.className =
            "text-[#1b4332] font-semibold hover:underline";
          cLink.textContent = candidateName;
          tdCandidate.appendChild(cLink);
        } else {
          tdCandidate.textContent = candidateName;
        }

        var tdOffer = document.createElement("td");
        tdOffer.className = "ie-table-cell";
        var jobTitle = app.job_offer_title || "—";
        if (app.job_offer_id) {
          var oLink = document.createElement("a");
          oLink.href =
            "add-job-offer.html?id=" +
            encodeURIComponent(String(app.job_offer_id)) +
            "&mode=view";
          oLink.className =
            "text-[#1b4332] font-semibold hover:underline";
          oLink.textContent = jobTitle;
          tdOffer.appendChild(oLink);
        } else {
          tdOffer.textContent = jobTitle;
        }

        var tdClient = document.createElement("td");
        tdClient.className = "ie-table-cell";
        var clientName = app.client_name || "—";
        if (app.client_id) {
          var clLink = document.createElement("a");
          clLink.href =
            "add-client.html?id=" +
            encodeURIComponent(String(app.client_id)) +
            "&mode=view";
          clLink.className =
            "text-gray-800 font-medium hover:underline";
          clLink.textContent = clientName;
          tdClient.appendChild(clLink);
        } else {
          tdClient.textContent = clientName;
        }

        var tdStatus = document.createElement("td");
        tdStatus.className = "ie-table-cell";
        var currentStatus = (app.status || "applied").toLowerCase();
        var badgeSpan = document.createElement("span");
        badgeSpan.className =
          "badge " + getApplicationStatusBadgeClass(currentStatus);
        badgeSpan.textContent = currentStatus;
        tdStatus.appendChild(badgeSpan);

        var tdUpdated = document.createElement("td");
        tdUpdated.className = "ie-table-cell text-gray-400";
        var updated = app.updated_at || app.created_at || null;
        tdUpdated.textContent = updated
          ? new Date(updated).toLocaleDateString("it-IT")
          : "—";

        tr.appendChild(tdCandidate);
        tr.appendChild(tdOffer);
        tr.appendChild(tdClient);
        tr.appendChild(tdStatus);
        tr.appendChild(tdUpdated);

        attachRowNavigation(tr, app);

        tbody.appendChild(tr);
      });
    }

    function updatePaginationUI(totalCount, currentCount) {
      if (!paginationContainer) return;
      var summaryEl = paginationContainer.querySelector(
        "[data-ie-pagination-summary]"
      );
      var pagesEl = paginationContainer.querySelector(
        "[data-ie-pagination-pages]"
      );
      var prevBtn = paginationContainer.querySelector(
        "[data-ie-pagination-prev]"
      );
      var nextBtn = paginationContainer.querySelector(
        "[data-ie-pagination-next]"
      );

      var total = Number(totalCount) || 0;
      var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }

      if (summaryEl) {
        summaryEl.textContent =
          total === 0
            ? "Showing 0 of 0 results"
            : "Showing " +
              currentCount +
              " of " +
              total.toLocaleString("en-US") +
              " results";
      }
      if (pagesEl) {
        pagesEl.textContent =
          "Page " + currentPage + " of " + totalPages;
      }
      if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages || total === 0;
      }
    }

    if (paginationContainer) {
      var prevBtn = paginationContainer.querySelector(
        "[data-ie-pagination-prev]"
      );
      var nextBtn = paginationContainer.querySelector(
        "[data-ie-pagination-next]"
      );
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          if (prevBtn.disabled) return;
          currentPage = Math.max(1, currentPage - 1);
          renderApplications();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (nextBtn.disabled) return;
          currentPage = currentPage + 1;
          renderApplications();
        });
      }
    }

    function refreshPipelineCounts() {
      if (
        !pipelineBarEl ||
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.getPipelineCounts !== "function"
      ) {
        return;
      }

      var baseFilters = {
        jobOfferId: filters.jobOfferId || undefined,
        clientId: filters.clientId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      window.IEQueries.applications
        .getPipelineCounts(baseFilters)
        .then(function (result) {
          if (result.error) {
            console.error(
              "[Applications] getPipelineCounts error:",
              result.error
            );
            return;
          }
          var data = result.data || {};
          pipelineBarEl
            .querySelectorAll("[data-pipeline-status]")
            .forEach(function (btn) {
              var st = btn.getAttribute("data-pipeline-status");
              var countSpan = btn.querySelector("[data-pipeline-count]");
              var value = data[st] || 0;
              if (countSpan) {
                countSpan.textContent = String(value);
              }
            });
        })
        .catch(function (err) {
          console.error(
            "[Applications] getPipelineCounts exception:",
            err
          );
        });
    }

    if (pipelineBarEl) {
      pipelineBarEl
        .querySelectorAll("[data-pipeline-status]")
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            var st = btn.getAttribute("data-pipeline-status") || "";
            filters.status = st;
            currentPage = 1;
            renderApplications();
          });
        });
    }

    function renderPipelineBoard() {
      if (
        !pipelineBoardEl ||
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.getApplications !== "function"
      ) {
        return;
      }

      pipelineBoardEl.innerHTML = "";

      var queryFilters = {
        status: "",
        jobOfferId: filters.jobOfferId || undefined,
        clientId: filters.clientId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      window.IEQueries.applications
        .getApplications({
          filters: queryFilters,
          page: 1,
          limit: 500,
        })
        .then(function (result) {
          if (result.error) {
            console.error(
              "[Applications] pipeline getApplications error:",
              result.error
            );
            return;
          }
          var rows = Array.isArray(result.data) ? result.data : [];
          var columns = {
            applied: [],
            screening: [],
            interview: [],
            offer: [],
            hired: [],
          };
          rows.forEach(function (app) {
            var s = (app.status || "").toLowerCase();
            if (s === "new") s = "applied";
            if (s === "offered") s = "offer";
            if (!columns[s]) return;
            columns[s].push(app);
          });

          Object.keys(columns).forEach(function (statusKey) {
            var col = document.createElement("div");
            col.className = "space-y-3";
            var title = document.createElement("div");
            title.className =
              "text-xs font-semibold uppercase tracking-widest text-gray-500";
            title.textContent = statusKey;
            col.appendChild(title);

            var items = columns[statusKey];
            if (!items.length) {
              var empty = document.createElement("div");
              empty.className =
                "text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-xl p-3 text-center";
              empty.textContent = "No applications";
              col.appendChild(empty);
            } else {
              items.forEach(function (app) {
                var card = document.createElement("div");
                card.className =
                  "bg-white rounded-xl border border-gray-100 p-3 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition";
                var name = document.createElement("div");
                name.className =
                  "text-sm font-semibold text-gray-900 truncate";
                name.textContent = app.candidate_name || "—";
                card.appendChild(name);

                var job = document.createElement("div");
                job.className = "text-xs text-gray-600 truncate";
                job.textContent = app.job_offer_title || "—";
                card.appendChild(job);

                card.addEventListener("click", function () {
                  var href =
                    "application.html?id=" +
                    encodeURIComponent(String(app.id));
                  if (
                    window.IERouter &&
                    typeof window.IERouter.navigateTo === "function"
                  ) {
                    window.IERouter.navigateTo(href);
                  } else {
                    window.location.href = href;
                  }
                });

                col.appendChild(card);
              });
            }

            pipelineBoardEl.appendChild(col);
          });
        })
        .catch(function (err) {
          console.error(
            "[Applications] pipeline getApplications exception:",
            err
          );
        });
    }

    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        filters.status = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }

    if (candidateInput) {
      candidateInput.addEventListener("input", function () {
        filters.candidateName = this.value || "";
        currentPage = 1;
        renderApplications();
      });
    }

    if (dateFromInput) {
      dateFromInput.addEventListener("change", function () {
        filters.dateFrom = this.value || "";
        currentPage = 1;
        renderApplications();
        refreshPipelineCounts();
      });
    }

    if (dateToInput) {
      dateToInput.addEventListener("change", function () {
        filters.dateTo = this.value || "";
        currentPage = 1;
        renderApplications();
        refreshPipelineCounts();
      });
    }

    function loadOffersAndClients() {
      if (
        offerSelect &&
        window.IEQueries &&
        window.IEQueries.jobOffers &&
        typeof window.IEQueries.jobOffers.getJobOffersPaginated === "function"
      ) {
        window.IEQueries.jobOffers
          .getJobOffersPaginated({ filters: { archived: "active" }, page: 1, limit: 100 })
          .then(function (res) {
            if (!res.error && Array.isArray(res.data)) {
              res.data.forEach(function (offer) {
                var opt = document.createElement("option");
                opt.value = offer.id;
                opt.textContent = offer.title || offer.position || "Offer " + String(offer.id);
                offerSelect.appendChild(opt);
              });
            }
          })
          .catch(function (err) {
            console.error("[Applications] load offers error:", err);
          });
      }

      if (
        clientSelect &&
        window.IEQueries &&
        window.IEQueries.clients &&
        typeof window.IEQueries.clients.getClientsPaginated === "function"
      ) {
        window.IEQueries.clients
          .getClientsPaginated({ filters: { archived: "active" }, page: 1, limit: 100 })
          .then(function (res) {
            if (!res.error && Array.isArray(res.data)) {
              res.data.forEach(function (client) {
                var opt = document.createElement("option");
                opt.value = client.id;
                opt.textContent = client.name || "Client " + String(client.id);
                clientSelect.appendChild(opt);
              });
            }
          })
          .catch(function (err) {
            console.error("[Applications] load clients error:", err);
          });
      }
    }

    if (offerSelect) {
      offerSelect.addEventListener("change", function () {
        filters.jobOfferId = this.value || "";
        currentPage = 1;
        renderApplications();
        refreshPipelineCounts();
      });
    }

    if (clientSelect) {
      clientSelect.addEventListener("change", function () {
        filters.clientId = this.value || "";
        currentPage = 1;
        renderApplications();
        refreshPipelineCounts();
      });
    }

    loadOffersAndClients();
    renderApplications();
    refreshPipelineCounts();
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureAuth().then(function (user) {
      if (!user) return;
      try {
        initApplicationsPage();
      } finally {
        try {
          document.body.style.visibility = "visible";
        } catch (e) {}
      }
    });
  });
})();

