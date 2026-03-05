(function () {
  "use strict";

  var ALLOWED_STATUSES = [
    "applied",
    "screening",
    "interview",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
    "not_selected",
  ];

  function normalizeStatus(value) {
    var s = (value || "").toString().toLowerCase();
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
  }

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

  function applyPipelineHighlight(currentStatus) {
    var container = document.querySelector("[data-app-pipeline]");
    if (!container) return;
    var s = normalizeStatus(currentStatus);
    container
      .querySelectorAll("[data-stage]")
      .forEach(function (el) {
        var stage = el.getAttribute("data-stage");
        if (stage === s) {
          el.classList.remove(
            "border-gray-200",
            "text-gray-600",
            "bg-transparent"
          );
          el.classList.add(
            "border-emerald-200",
            "bg-emerald-50",
            "text-emerald-800"
          );
        } else {
          el.classList.remove(
            "border-emerald-200",
            "bg-emerald-50",
            "text-emerald-800"
          );
          el.classList.add("border-gray-200", "text-gray-600");
        }
      });
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "—";
    }
  }

  function safeInnerText(el, value) {
    if (!el) return;
    el.textContent = value || "—";
  }

  function initApplicationDetailPage() {
    var params = new URLSearchParams(window.location.search || "");
    var id = params.get("id");
    if (!id) {
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("applications.html");
      } else {
        window.location.href = "applications.html";
      }
      return;
    }

    if (
      !window.IEQueries ||
      !window.IEQueries.applications ||
      typeof window.IEQueries.applications.getApplicationById !== "function"
    ) {
      console.error(
        "[ApplicationDetail] IEQueries.applications.getApplicationById not available"
      );
      return;
    }

    window.IEQueries.applications
      .getApplicationById(id)
      .then(function (res) {
        if (res.error || !res.data) {
          console.error(
            "[ApplicationDetail] getApplicationById error:",
            res.error
          );
          renderNotFound();
          return;
        }
        renderApplication(res.data);
      })
      .catch(function (err) {
        console.error(
          "[ApplicationDetail] getApplicationById exception:",
          err
        );
        renderNotFound();
      });

    loadApplicationLogs(id).catch(function (err) {
      console.error("[ApplicationDetail] loadApplicationLogs exception:", err);
    });
  }

  function renderNotFound() {
    var root = document.getElementById("applicationDetailRoot");
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("section");
    card.className =
      "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";
    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Application not found";
    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested application could not be found or is not accessible.";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to applications";
    button.addEventListener("click", function () {
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("applications.html");
      } else {
        window.location.href = "applications.html";
      }
    });
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  function renderApplication(app) {
    var candidateName = app.candidate_name || "—";
    var offerTitle = app.job_offer_title || "—";
    var clientName = app.client_name || "—";

    var headerCandidate = document.querySelector("[data-app-candidate]");
    var headerOffer = document.querySelector("[data-app-offer]");
    var headerClient = document.querySelector("[data-app-client]");

    if (headerCandidate) {
      headerCandidate.textContent = candidateName;
    }
    if (headerOffer) {
      headerOffer.textContent = offerTitle;
    }
    if (headerClient) {
      headerClient.textContent = clientName;
    }

    var candidateCardName = document.querySelector(
      "[data-app-candidate-name]"
    );
    var candidateCardPosition = document.querySelector(
      "[data-app-candidate-position]"
    );
    var candidateLink = document.querySelector(
      "[data-app-candidate-link]"
    );

    safeInnerText(candidateCardName, candidateName);
    safeInnerText(
      candidateCardPosition,
      app.candidate_position || ""
    );

    if (candidateLink && app.candidate_id) {
      var cHref =
        "candidate.html?id=" +
        encodeURIComponent(String(app.candidate_id));
      candidateLink.href = cHref;
      candidateLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(cHref);
        }
      });
    }

    var offerCardTitle = document.querySelector("[data-app-offer-title]");
    var offerCardPosition = document.querySelector(
      "[data-app-offer-position]"
    );
    var offerLink = document.querySelector("[data-app-offer-link]");

    safeInnerText(offerCardTitle, offerTitle);
    safeInnerText(
      offerCardPosition,
      app.job_offer_position || ""
    );

    if (offerLink && app.job_offer_id) {
      var oHref =
        "job-offer.html?id=" +
        encodeURIComponent(String(app.job_offer_id));
      offerLink.href = oHref;
      offerLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(oHref);
        }
      });
    }

    var clientCardName = document.querySelector("[data-app-client-name]");
    var clientLink = document.querySelector("[data-app-client-link]");

    safeInnerText(clientCardName, clientName);

    if (clientLink && app.client_id) {
      var clHref =
        "client.html?id=" +
        encodeURIComponent(String(app.client_id));
      clientLink.href = clHref;
      clientLink.addEventListener("click", function (event) {
        if (
          window.IERouter &&
          typeof window.IERouter.navigateTo === "function"
        ) {
          event.preventDefault();
          window.IERouter.navigateTo(clHref);
        }
      });
    }

    var createdEl = document.querySelector("[data-app-created]");
    var updatedEl = document.querySelector("[data-app-updated]");
    if (createdEl) {
      createdEl.textContent = formatDate(app.created_at);
    }
    if (updatedEl) {
      updatedEl.textContent = formatDate(app.updated_at || app.created_at);
    }

    var notesEl = document.querySelector("[data-app-notes]");
    if (notesEl) {
      var notes = app.notes || "";
      notesEl.textContent = notes || "—";
    }

    var statusSelect = document.querySelector(
      "[data-app-status-select]"
    );
    var statusError = document.querySelector(
      "[data-app-status-error]"
    );

    var currentStatus = normalizeStatus(app.status || "applied");
    if (statusSelect) {
      statusSelect.value = ALLOWED_STATUSES.indexOf(currentStatus) !== -1
        ? currentStatus
        : "applied";
    }
    applyPipelineHighlight(currentStatus);

    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        var nextStatus = normalizeStatus(statusSelect.value || "");
        if (ALLOWED_STATUSES.indexOf(nextStatus) === -1) {
          statusSelect.value = currentStatus;
          return;
        }
        if (
          !window.IEQueries ||
          !window.IEQueries.applications ||
          typeof window.IEQueries.applications.updateApplicationStatus !==
            "function"
        ) {
          return;
        }
        statusSelect.disabled = true;
        if (statusError) {
          statusError.classList.add("hidden");
          statusError.textContent = "";
        }
        window.IEQueries.applications
          .updateApplicationStatus(app.id, nextStatus, {})
          .then(function (res) {
            if (res.error) {
              console.error(
                "[ApplicationDetail] updateApplicationStatus error:",
                res.error
              );
              if (statusError) {
                statusError.textContent =
                  res.error.message ||
                  "Error updating status. Please try again.";
                statusError.classList.remove("hidden");
              }
              statusSelect.value = currentStatus;
              return;
            }
            currentStatus = nextStatus;
            applyPipelineHighlight(currentStatus);
          })
          .catch(function (err) {
            console.error(
              "[ApplicationDetail] updateApplicationStatus exception:",
              err
            );
            if (statusError) {
              statusError.textContent =
                "Error updating status. Please try again.";
              statusError.classList.remove("hidden");
            }
            statusSelect.value = currentStatus;
          })
          .finally(function () {
            statusSelect.disabled = false;
          });
      });
    }
  }

  async function loadApplicationLogs(applicationId) {
    if (!applicationId) return;
    if (typeof window === "undefined" || !window.IESupabase) return;

    var list = document.getElementById("applicationLogList");
    var empty = document.getElementById("applicationLogEmpty");
    if (!list) return;

    list.innerHTML = "";
    if (empty) {
      empty.classList.add("hidden");
    }

    var logs = [];
    try {
      if (typeof window.IESupabase.fetchEntityLogs === "function") {
        var result = await window.IESupabase.fetchEntityLogs(
          "application",
          applicationId
        );
        logs = (result && result.data) || [];
      } else if (typeof window.IESupabase.fetchLogs === "function") {
        var result2 = await window.IESupabase.fetchLogs(
          "application",
          applicationId,
          { full: true }
        );
        logs =
          (result2 &&
            result2.data &&
            result2.data.logs) ||
          [];
      } else {
        return;
      }
    } catch (err) {
      console.error(
        "[ApplicationDetail] loadApplicationLogs fetch error:",
        err
      );
      return;
    }

    if (!Array.isArray(logs) || !logs.length) {
      if (empty) {
        empty.classList.remove("hidden");
      }
      return;
    }

    function safeToLocaleString(isoDateString) {
      if (!isoDateString) return "";
      try {
        return new Date(isoDateString).toLocaleString();
      } catch (_) {
        return String(isoDateString);
      }
    }

    function getDisplayNameForLog(log) {
      if (!log) return "—";
      var p = log.created_by_profile;
      if (p && (p.first_name || p.last_name)) {
        var name = [p.first_name, p.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (name) return name;
      }
      if (log.created_by) {
        return String(log.created_by).slice(0, 8) + "…";
      }
      return "—";
    }

    logs.forEach(function (log) {
      var item = document.createElement("div");
      item.className = "activity-item";

      var dot = document.createElement("div");
      dot.className = "activity-item__dot";
      item.appendChild(dot);

      var content = document.createElement("div");
      content.className = "activity-item__content";

      var headerRow = document.createElement("div");
      headerRow.className = "activity-item__headerRow";

      var who = document.createElement("span");
      who.className = "activity-item__who";
      who.textContent = getDisplayNameForLog(log);
      headerRow.appendChild(who);

      var ts = document.createElement("span");
      ts.className = "activity-item__timestamp";
      ts.textContent = safeToLocaleString(log && log.created_at);
      headerRow.appendChild(ts);

      content.appendChild(headerRow);

      var message = document.createElement("div");
      message.className = "activity-item__message";
      message.textContent = (log && log.message) || "";
      content.appendChild(message);

      var actions = document.createElement("div");
      actions.className = "activity-item__actions";
      content.appendChild(actions);

      item.appendChild(content);
      list.appendChild(item);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureAuth().then(function (user) {
      if (!user) return;
      try {
        initApplicationDetailPage();
      } finally {
        try {
          document.body.style.visibility = "visible";
        } catch (e) {}
      }
    });
  });
})();

