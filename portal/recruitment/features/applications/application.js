;(function () {
  "use strict";

  var CONFIG = window.ApplicationEntityConfig || null;

  function safeString(value) {
    if (
      window.IEEntityFieldMapper &&
      typeof window.IEEntityFieldMapper.safeString === "function"
    ) {
      return window.IEEntityFieldMapper.safeString(value);
    }
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function setField(name, value) {
    if (
      window.IEEntityFieldMapper &&
      typeof window.IEEntityFieldMapper.setField === "function"
    ) {
      window.IEEntityFieldMapper.setField(name, value);
      return;
    }
    var elements = document.querySelectorAll('[data-field="' + name + '"]');
    var text = safeString(value).trim() || "—";
    elements.forEach(function (el) {
      if ("value" in el) {
        el.value = text;
      } else {
        el.textContent = text;
      }
    });
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function normalizeStatus(value) {
    if (
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.normalizeApplicationStatusForDisplay ===
        "function"
    ) {
      return window.IEStatusRuntime.normalizeApplicationStatusForDisplay(value);
    }
    var s = (value || "").toString().toLowerCase();
    if (s === "new") return "applied";
    if (s === "offered") return "offer";
    return s;
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

  function renderApplicationCore(application, applicationId, mode) {
    var app = application || {};
    var id = applicationId;
    var effectiveMode = mode || "view";

    try {
      console.log("[ApplicationHydrationDebug] renderApplicationCore", {
        applicationId: id,
        mode: effectiveMode,
        candidate_id: app && app.candidate_id,
        job_offer_id: app && app.job_offer_id,
        client_id: app && app.client_id,
        candidate_name: app && app.candidate_name,
        job_offer_title: app && app.job_offer_title,
        client_name: app && app.client_name,
      });
    } catch (_) {}

    // Header fields
    var candidateName = app.candidate_name || "—";
    var offerTitle = app.job_offer_title || "—";
    var clientName = app.client_name || "—";

    setField("candidate_name", candidateName);
    setField("job_offer_title", offerTitle);
    setField("client_name", clientName);

    // Root-level data fields for summary cards
    setField("candidate_position", app.candidate_position || "");
    setField("candidate_location", app.candidate_location || "");
    setField("job_offer_position", app.job_offer_position || "");

    // Notes & rejection reason (editable via entity toolbar)
    setField("notes", app.notes || "");
    setField("rejection_reason", app.rejection_reason || "");

    // Dates
    setField("created_at", formatDate(app.created_at));
    setField("updated_at", formatDate(app.updated_at || app.created_at));

    // Page meta + header
    var pageTitle = candidateName !== "—" ? candidateName : "Application";
    window.pageMeta = {
      title: pageTitle,
      subtitle: "Application details",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Applications", entity: "applications" },
        { label: pageTitle },
      ],
    };
    if (
      window.IEPortal &&
      typeof window.IEPortal.mountPageHeader === "function"
    ) {
      window.IEPortal.mountPageHeader();
    }

    // Header labels (legacy data-app-* bindings)
    var headerCandidate = document.querySelector("[data-app-candidate]");
    var headerOffer = document.querySelector("[data-app-offer]");
    var headerClient = document.querySelector("[data-app-client]");
    if (headerCandidate) headerCandidate.textContent = candidateName;
    if (headerOffer) headerOffer.textContent = offerTitle;
    if (headerClient) headerClient.textContent = clientName;

    // Candidate / offer / client links
    var candidateLink = document.querySelector("[data-app-candidate-link]");
    if (candidateLink && app.candidate_id) {
      var cHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.candidateView === "function"
          ? window.IEPortal.links.candidateView(app.candidate_id)
          : "candidate.html?id=" +
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

    var offerLink = document.querySelector("[data-app-offer-link]");
    if (offerLink && app.job_offer_id) {
      var oHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.offerView === "function"
          ? window.IEPortal.links.offerView(app.job_offer_id)
          : "job-offer.html?id=" +
            encodeURIComponent(String(app.job_offer_id)) +
            "&mode=view";
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

    var clientLink = document.querySelector("[data-app-client-link]");
    if (clientLink && app.client_id) {
      var clHref =
        window.IEPortal &&
        window.IEPortal.links &&
        typeof window.IEPortal.links.clientView === "function"
          ? window.IEPortal.links.clientView(app.client_id)
          : "client.html?id=" +
            encodeURIComponent(String(app.client_id)) +
            "&mode=view";
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

    // Candidate notes from related entities
    var candidateNotesEl = document.querySelector("[data-app-notes-candidate]");
    var offerNotesEl = document.querySelector("[data-app-notes-offer]");
    var clientNotesEl = document.querySelector("[data-app-notes-client]");
    function normalizeNotes(value) {
      if (value === null || value === undefined) return "—";
      var text = String(value).trim();
      return text || "—";
    }
    if (candidateNotesEl) {
      candidateNotesEl.textContent = normalizeNotes(app.candidate_notes);
    }
    if (offerNotesEl) {
      offerNotesEl.textContent = normalizeNotes(app.job_offer_notes);
    }
    if (clientNotesEl) {
      clientNotesEl.textContent = normalizeNotes(app.client_notes);
    }

    // Pipeline + status select (view-only pipeline; dropdown remains live)
    var statusSelect = document.querySelector("[data-app-status-select]");
    var statusError = document.querySelector("[data-app-status-error]");
    var currentStatus = normalizeStatus(app.status || "applied");

    if (statusSelect) {
      statusSelect.value = currentStatus;
    }
    applyPipelineHighlight(currentStatus);

    if (
      statusSelect &&
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.updateApplicationStatus ===
        "function"
    ) {
      statusSelect.addEventListener("change", function () {
        var nextStatus = normalizeStatus(statusSelect.value || "");
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
                "[Application] updateApplicationStatus error:",
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
              "[Application] updateApplicationStatus exception:",
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

    // Candidate summary: experience / skills / languages
    try {
      if (typeof window.hydrateCandidateSummary === "function") {
        window.hydrateCandidateSummary(app);
      }
    } catch (e1) {
      console.error("[Application] hydrateCandidateSummary error:", e1);
    }

    // Job offer summary: salary + hired count
    try {
      if (typeof window.hydrateJobOfferSummary === "function") {
        window.hydrateJobOfferSummary(app);
      }
    } catch (e2) {
      console.error("[Application] hydrateJobOfferSummary error:", e2);
    }
  }

  /**
   * Shared helpers for hydrating the candidate and job-offer cards on the
   * application page. These are exposed on window so that both the new
   * EntityPageShell-powered application.html and any legacy callers can
   * reuse the same logic.
   */
  function hydrateCandidateSummary(app) {
    try {
      console.log("[ApplicationHydrationDebug] hydrateCandidateSummary start", {
        applicationId: app && app.id,
        candidate_id: app && app.candidate_id,
      });
    } catch (_) {}

    var positionEl = document.querySelector("[data-app-candidate-position]");
    var locationEl = document.querySelector("[data-app-candidate-location]");
    var experienceListEl = document.querySelector(
      "[data-app-candidate-experience-list]"
    );
    var skillsEl = document.querySelector("[data-app-candidate-skills]");
    var languagesEl = document.querySelector("[data-app-candidate-languages]");
    var cvLinkEl = document.querySelector("[data-app-candidate-cv]");

    function safeInnerText(el, value) {
      if (!el) return;
      el.textContent = value || "—";
    }

    if (!app || !app.candidate_id) {
      safeInnerText(positionEl, "—");
      safeInnerText(locationEl, "—");
      if (experienceListEl) {
        experienceListEl.innerHTML = "<p>—</p>";
      }
      if (skillsEl) {
        skillsEl.innerHTML = "<span>—</span>";
      }
      if (languagesEl) {
        languagesEl.innerHTML = "<p>—</p>";
      }
      if (cvLinkEl) {
        cvLinkEl.style.display = "none";
      }
      try {
        console.log(
          "[ApplicationHydrationDebug] hydrateCandidateSummary missing candidate_id; using placeholders"
        );
      } catch (_) {}
      return;
    }

    var candidateId = app.candidate_id;

    // Basic position and location from application payload when available
    if (positionEl) {
      positionEl.textContent = app.candidate_position || "—";
    }
    if (locationEl) {
      locationEl.textContent = app.candidate_location || "—";
    }

    function renderExperienceBlocks(experiences) {
      if (!experienceListEl) return;
      experienceListEl.innerHTML = "";
      var items = Array.isArray(experiences) ? experiences.slice() : [];
      if (!items.length) {
        experienceListEl.innerHTML = "<p>—</p>";
        return;
      }

      items.sort(function (a, b) {
        var as = (a && a.start_date) || "";
        var bs = (b && b.start_date) || "";
        if (as < bs) return 1;
        if (as > bs) return -1;
        return 0;
      });

      items.forEach(function (exp) {
        var title = (exp && exp.title) || "";
        var company = (exp && exp.company) || "";
        var start = (exp && exp.start_date) || "";
        var end = (exp && exp.end_date) || "";
        if (!title && !company && !start && !end) return;

        var block = document.createElement("div");
        block.className = "space-y-0.5";

        var titleEl = document.createElement("p");
        titleEl.className = "text-xs font-semibold text-gray-900";
        titleEl.textContent = title || "—";
        block.appendChild(titleEl);

        if (company) {
          var companyEl = document.createElement("p");
          companyEl.className = "text-[11px] text-gray-500";
          companyEl.textContent = company;
          block.appendChild(companyEl);
        }

        if (start || end) {
          var datesEl = document.createElement("p");
          datesEl.className = "text-[11px] text-gray-500";
          var startYear = String(start).slice(0, 4);
          var endYear = end ? String(end).slice(0, 4) : "Present";
          datesEl.textContent =
            (startYear || "—") + " – " + (endYear || "Present");
          block.appendChild(datesEl);
        }

        experienceListEl.appendChild(block);
      });

      if (!experienceListEl.children.length) {
        experienceListEl.innerHTML = "<p>—</p>";
      }
    }

    function renderSkills(skills) {
      if (!skillsEl) return;
      skillsEl.innerHTML = "";
      var items = Array.isArray(skills) ? skills : [];
      if (!items.length) {
        skillsEl.innerHTML = "<span>—</span>";
        return;
      }
      items.forEach(function (item) {
        var label = (item && item.skill) || "";
        label = String(label).trim();
        if (!label) return;
        var badge = document.createElement("span");
        badge.className =
          "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-100";
        badge.textContent = label;
        skillsEl.appendChild(badge);
      });
      if (!skillsEl.children.length) {
        skillsEl.innerHTML = "<span>—</span>";
      }
    }

    function renderLanguages(languages) {
      if (!languagesEl) return;
      languagesEl.innerHTML = "";
      var items = Array.isArray(languages) ? languages : [];
      if (!items.length) {
        languagesEl.innerHTML = "<p>—</p>";
        return;
      }
      items.forEach(function (item) {
        var name = (item && item.language) || "";
        var level = (item && item.level) || "";
        var text = String(name).trim();
        var lvl = String(level).trim();
        if (text && lvl) {
          text = text + " — " + lvl;
        } else if (!text && lvl) {
          text = lvl;
        }
        if (!text) return;
        var row = document.createElement("p");
        row.className = "text-xs text-gray-700";
        row.textContent = text;
        languagesEl.appendChild(row);
      });
      if (!languagesEl.children.length) {
        languagesEl.innerHTML = "<p>—</p>";
      }
    }

    // Prefer data from the main application query when available
    if (Array.isArray(app.candidate_experience)) {
      renderExperienceBlocks(app.candidate_experience);
    } else {
      renderExperienceBlocks([]);
      if (
        window.IESupabase &&
        typeof window.IESupabase.getCandidateExperience === "function"
      ) {
        window.IESupabase
          .getCandidateExperience(candidateId)
          .then(function (res) {
            if (!res || res.error || !Array.isArray(res.data)) {
              if (res && res.error) {
                console.error(
                  "[ApplicationHydrationDebug] getCandidateExperience error",
                  res.error
                );
              }
              return;
            }
            renderExperienceBlocks(res.data);
          })
          .catch(function (err) {
            console.error(
              "[ApplicationHydrationDebug] getCandidateExperience exception",
              err
            );
          });
      }
    }

    if (Array.isArray(app.candidate_skills)) {
      renderSkills(app.candidate_skills);
    } else {
      renderSkills([]);
      if (
        window.IESupabase &&
        typeof window.IESupabase.getCandidateSkills === "function"
      ) {
        window.IESupabase
          .getCandidateSkills(candidateId)
          .then(function (res) {
            if (!res || res.error || !Array.isArray(res.data)) {
              if (res && res.error) {
                console.error(
                  "[ApplicationHydrationDebug] getCandidateSkills error",
                  res.error
                );
              }
              return;
            }
            renderSkills(res.data);
          })
          .catch(function (err) {
            console.error(
              "[ApplicationHydrationDebug] getCandidateSkills exception",
              err
            );
          });
      }
    }

    if (Array.isArray(app.candidate_languages)) {
      renderLanguages(app.candidate_languages);
    } else {
      renderLanguages([]);
      if (
        window.IESupabase &&
        typeof window.IESupabase.getCandidateLanguages === "function"
      ) {
        window.IESupabase
          .getCandidateLanguages(candidateId)
          .then(function (res) {
            if (!res || res.error || !Array.isArray(res.data)) {
              if (res && res.error) {
                console.error(
                  "[ApplicationHydrationDebug] getCandidateLanguages error",
                  res.error
                );
              }
              return;
            }
            renderLanguages(res.data);
          })
          .catch(function (err) {
            console.error(
              "[ApplicationHydrationDebug] getCandidateLanguages exception",
              err
            );
          });
      }
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.getCandidateById === "function"
    ) {
      window.IESupabase
        .getCandidateById(candidateId)
        .then(function (res) {
          if (!res || res.error || !res.data) {
            if (res && res.error) {
              console.error(
                "[ApplicationHydrationDebug] getCandidateById error",
                res.error
              );
            }
            return;
          }
          var candidate = res.data;
          if (locationEl && !app.candidate_location) {
            locationEl.textContent = candidate.address || "—";
          }

          if (
            cvLinkEl &&
            candidate.cv_url &&
            typeof window.IESupabase.createSignedCandidateUrl === "function"
          ) {
            window.IESupabase
              .createSignedCandidateUrl(candidate.cv_url)
              .then(function (signed) {
                if (!signed) {
                  cvLinkEl.style.display = "none";
                  return;
                }
                cvLinkEl.href = signed;
                cvLinkEl.style.display = "";
              })
              .catch(function (err) {
                console.error(
                  "[ApplicationHydrationDebug] createSignedCandidateUrl exception",
                  err
                );
                cvLinkEl.style.display = "none";
              });
          } else if (cvLinkEl) {
            cvLinkEl.style.display = "none";
          }
        })
        .catch(function (err) {
          console.error(
            "[ApplicationHydrationDebug] getCandidateById exception",
            err
          );
        });
    }
  }

  function hydrateJobOfferSummary(app) {
    try {
      console.log("[ApplicationHydrationDebug] hydrateJobOfferSummary start", {
        applicationId: app && app.id,
        job_offer_id: app && app.job_offer_id,
      });
    } catch (_) {}

    var salaryEl = document.querySelector("[data-app-offer-salary]");
    var hiredCountEl = document.querySelector("[data-app-offer-hired-count]");

    if (!app || !app.job_offer_id) {
      if (salaryEl) salaryEl.textContent = "—";
      if (hiredCountEl) hiredCountEl.textContent = "—";
      return;
    }

    var jobOfferId = app.job_offer_id;

    if (
      window.IESupabase &&
      typeof window.IESupabase.fetchJobOfferById === "function"
    ) {
      window.IESupabase
        .fetchJobOfferById(jobOfferId)
        .then(function (res) {
          if (!res || res.error || !res.data) {
            if (res && res.error) {
              console.error(
                "[ApplicationHydrationDebug] fetchJobOfferById error",
                res.error
              );
            }
            if (salaryEl) salaryEl.textContent = "—";
            return;
          }
          var offer = res.data;
          if (salaryEl) {
            salaryEl.textContent = offer.salary || "—";
          }
        })
        .catch(function (err) {
          console.error(
            "[ApplicationHydrationDebug] fetchJobOfferById exception",
            err
          );
          if (salaryEl) salaryEl.textContent = "—";
        });
    } else if (salaryEl) {
      salaryEl.textContent = "—";
    }

    if (
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.getApplicationsByJob === "function"
    ) {
      window.IEQueries.applications
        .getApplicationsByJob(jobOfferId)
        .then(function (res) {
          if (!res || res.error || !Array.isArray(res.data)) {
            if (res && res.error) {
              console.error(
                "[ApplicationHydrationDebug] getApplicationsByJob error",
                res.error
              );
            }
            if (hiredCountEl) hiredCountEl.textContent = "—";
            return;
          }
          var count = 0;
          res.data.forEach(function (row) {
            var s = (row && row.status ? String(row.status) : "").toLowerCase();
            if (s === "hired") count++;
          });
          if (hiredCountEl) {
            hiredCountEl.textContent = String(count);
          }
        })
        .catch(function (err) {
          console.error(
            "[ApplicationHydrationDebug] getApplicationsByJob exception",
            err
          );
          if (hiredCountEl) hiredCountEl.textContent = "—";
        });
    } else if (hiredCountEl) {
      hiredCountEl.textContent = "—";
    }
  }

  function renderApplicationNotFound() {
    var rootId =
      (window.ApplicationEntityConfig &&
        window.ApplicationEntityConfig.ui &&
        window.ApplicationEntityConfig.ui.rootId) ||
      "applicationProfileRoot";

    var root = document.getElementById(rootId);
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

  function applyModeToApplicationFields(mode) {
    var makeEditable = mode === "edit";
    var editableFields =
      (CONFIG &&
        CONFIG.fields &&
        Array.isArray(CONFIG.fields.editable) &&
        CONFIG.fields.editable.slice()) ||
      ["notes", "rejection_reason"];

    editableFields.forEach(function (field) {
      var nodes = document.querySelectorAll(
        '[data-field="' + field + '"]'
      );
      nodes.forEach(function (el) {
        if ("readOnly" in el) {
          el.readOnly = !makeEditable;
        }

        if (el.classList && el.classList.contains("field-display")) {
          if (makeEditable) {
            el.classList.remove("field-display");
          }
        } else if (el.classList && !el.classList.contains("field-display")) {
          if (!makeEditable) {
            el.classList.add("field-display");
          }
        }

        if (makeEditable && "value" in el) {
          var currentValue = safeString(el.value).trim();
          if (currentValue === "—") {
            el.value = "";
          }
        }
      });
    });
  }

  window.renderApplicationCore = renderApplicationCore;
  window.renderApplicationNotFound = renderApplicationNotFound;
  window.applyModeToApplicationFields = applyModeToApplicationFields;
  window.hydrateCandidateSummary = window.hydrateCandidateSummary || hydrateCandidateSummary;
  window.hydrateJobOfferSummary = window.hydrateJobOfferSummary || hydrateJobOfferSummary;

  document.addEventListener("DOMContentLoaded", function () {
    if (
      window.EntityPageShell &&
      window.ApplicationEntityConfig &&
      typeof window.EntityPageShell.init === "function"
    ) {
      Promise.resolve(
        window.EntityPageShell.init(window.ApplicationEntityConfig)
      ).catch(function (err) {
        console.error("[Application] EntityPageShell.init exception:", err);
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    }
  });
})();

