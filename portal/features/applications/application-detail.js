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

    if (
      window.ActivitySection &&
      typeof window.ActivitySection.init === "function"
    ) {
      var container = document.getElementById("activity-container");
      if (container) {
        window.ActivitySection.init({
          entityType: "application",
          entityId: id,
          container: container,
        });
      }
    }
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

    var candidateLink = document.querySelector(
      "[data-app-candidate-link]"
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
        "add-job-offer.html?id=" +
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

    var clientCardName = document.querySelector("[data-app-client-name]");
    var clientLink = document.querySelector("[data-app-client-link]");

    safeInnerText(clientCardName, clientName);

    if (clientLink && app.client_id) {
      var clHref =
        "add-client.html?id=" +
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

    var createdEl = document.querySelector("[data-app-created]");
    var updatedEl = document.querySelector("[data-app-updated]");
    if (createdEl) {
      createdEl.textContent = formatDate(app.created_at);
    }
    if (updatedEl) {
      updatedEl.textContent = formatDate(app.updated_at || app.created_at);
    }

    // Notes from all related entities (candidate, job offer, client, application)
    var candidateNotesEl = document.querySelector("[data-app-notes-candidate]");
    var offerNotesEl = document.querySelector("[data-app-notes-offer]");
    var clientNotesEl = document.querySelector("[data-app-notes-client]");
    var appNotesDisplayEl = document.querySelector(
      "[data-app-notes-display]"
    );
    var appNotesEditor = document.querySelector("[data-app-notes-editor]");
    var appNotesEditBtn = document.querySelector("[data-app-notes-edit]");
    var appNotesActions = document.querySelector("[data-app-notes-actions]");
    var appNotesSaveBtn = document.querySelector("[data-app-notes-save]");
    var appNotesCancelBtn = document.querySelector("[data-app-notes-cancel]");

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
    if (appNotesDisplayEl) {
      appNotesDisplayEl.textContent = normalizeNotes(app.notes);
    }

    if (appNotesEditor) {
      appNotesEditor.value = app.notes || "";
    }

    function enterAppNotesEditMode() {
      if (!appNotesEditor || !appNotesDisplayEl) return;
      appNotesEditor.value = app.notes || "";
      appNotesEditor.classList.remove("hidden");
      if (appNotesActions) {
        appNotesActions.classList.remove("hidden");
      }
      appNotesDisplayEl.classList.add("hidden");
      if (appNotesEditBtn) {
        appNotesEditBtn.classList.add("hidden");
      }
    }

    function exitAppNotesEditMode() {
      if (!appNotesEditor || !appNotesDisplayEl) return;
      appNotesEditor.classList.add("hidden");
      if (appNotesActions) {
        appNotesActions.classList.add("hidden");
      }
      appNotesDisplayEl.classList.remove("hidden");
      if (appNotesEditBtn) {
        appNotesEditBtn.classList.remove("hidden");
      }
    }

    if (appNotesEditBtn && appNotesEditor && appNotesDisplayEl) {
      appNotesEditBtn.addEventListener("click", function () {
        enterAppNotesEditMode();
      });
    }

    if (appNotesCancelBtn && appNotesEditor && appNotesDisplayEl) {
      appNotesCancelBtn.addEventListener("click", function () {
        exitAppNotesEditMode();
      });
    }

    if (
      appNotesSaveBtn &&
      appNotesEditor &&
      appNotesDisplayEl &&
      window.IESupabase &&
      window.IESupabase.supabase
    ) {
      appNotesSaveBtn.addEventListener("click", function () {
        var notes = appNotesEditor.value || null;
        var supabaseClient = window.IESupabase.supabase;

        appNotesSaveBtn.disabled = true;

        supabaseClient
          .from("candidate_job_associations")
          .update({ notes: notes })
          .eq("id", app.id)
          .select("notes")
          .single()
          .then(function (res) {
            if (!res || res.error) {
              console.error(
                "[ApplicationDetail] Error updating application notes:",
                res && res.error
              );
              return;
            }

            var savedNotes = res.data && res.data.notes;
            app.notes = savedNotes;
            appNotesDisplayEl.textContent = normalizeNotes(savedNotes);
            exitAppNotesEditMode();
          })
          .catch(function (err) {
            console.error(
              "[ApplicationDetail] Exception updating application notes:",
              err
            );
          })
          .finally(function () {
            appNotesSaveBtn.disabled = false;
          });
      });
    }

    var statusSelect = document.querySelector(
      "[data-app-status-select]"
    );
    var statusError = document.querySelector(
      "[data-app-status-error]"
    );

    var currentStatus = normalizeStatus(app.status || "applied");
    if (statusSelect) {
      statusSelect.value =
        ALLOWED_STATUSES.indexOf(currentStatus) !== -1
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

    hydrateCandidateSummary(app);
    hydrateJobOfferSummary(app);
    initApplicationToolbar(app);
  }

  function initApplicationToolbar(app) {
    var container = document.getElementById("applicationActions");
    if (!container || !app || !app.id) return;

    container.innerHTML = "";

    var archiveBtn = document.createElement("button");
    archiveBtn.type = "button";
    archiveBtn.className = "ie-btn ie-btn-secondary";
    archiveBtn.textContent = "Archive";

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ie-btn ie-btn-danger";
    deleteBtn.textContent = "Delete";

    archiveBtn.addEventListener("click", function () {
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.updateApplicationStatus !==
          "function"
      ) {
        return;
      }

      var statusSelect = document.querySelector(
        "[data-app-status-select]"
      );
      var statusError = document.querySelector(
        "[data-app-status-error]"
      );

      archiveBtn.disabled = true;
      if (statusSelect) statusSelect.disabled = true;
      if (statusError) {
        statusError.classList.add("hidden");
        statusError.textContent = "";
      }

      window.IEQueries.applications
        .updateApplicationStatus(app.id, "withdrawn", {})
        .then(function (res) {
          if (res.error) {
            console.error(
              "[ApplicationDetail] archive application error:",
              res.error
            );
            if (statusError) {
              statusError.textContent =
                res.error.message ||
                "Error archiving application. Please try again.";
              statusError.classList.remove("hidden");
            }
            return;
          }
          if (statusSelect) {
            statusSelect.value = "withdrawn";
          }
          applyPipelineHighlight("withdrawn");
        })
        .catch(function (err) {
          console.error(
            "[ApplicationDetail] archive application exception:",
            err
          );
          if (statusError) {
            statusError.textContent =
              "Error archiving application. Please try again.";
            statusError.classList.remove("hidden");
          }
        })
        .finally(function () {
          archiveBtn.disabled = false;
          if (statusSelect) statusSelect.disabled = false;
        });
    });

    deleteBtn.addEventListener("click", function () {
      if (
        !window.IEQueries ||
        !window.IEQueries.applications ||
        typeof window.IEQueries.applications.deleteApplicationPermanently !==
          "function"
      ) {
        return;
      }
      if (
        !window.confirm(
          "Are you sure you want to permanently delete this application?"
        )
      ) {
        return;
      }

      deleteBtn.disabled = true;

      window.IEQueries.applications
        .deleteApplicationPermanently(app.id)
        .then(function (res) {
          if (res.error) {
            console.error(
              "[ApplicationDetail] deleteApplicationPermanently error:",
              res.error
            );
            deleteBtn.disabled = false;
            return;
          }

          var target = "applications.html";
          if (
            window.IERouter &&
            typeof window.IERouter.navigateTo === "function"
          ) {
            window.IERouter.navigateTo(target);
          } else {
            window.location.href = target;
          }
        })
        .catch(function (err) {
          console.error(
            "[ApplicationDetail] deleteApplicationPermanently exception:",
            err
          );
          deleteBtn.disabled = false;
        });
    });

    container.appendChild(archiveBtn);
    container.appendChild(deleteBtn);
  }

  function hydrateCandidateSummary(app) {
    var positionEl = document.querySelector(
      "[data-app-candidate-position]"
    );
    var locationEl = document.querySelector(
      "[data-app-candidate-location]"
    );
    var experienceListEl = document.querySelector(
      "[data-app-candidate-experience-list]"
    );
    var skillsEl = document.querySelector(
      "[data-app-candidate-skills]"
    );
    var languagesEl = document.querySelector(
      "[data-app-candidate-languages]"
    );
    var cvLinkEl = document.querySelector("[data-app-candidate-cv]");

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
      return;
    }

    var candidateId = app.candidate_id;

    // Basic position and location from application payload when available
    if (positionEl) {
      positionEl.textContent =
        app.candidate_position || "—";
    }
    if (locationEl) {
      locationEl.textContent =
        app.candidate_location || "—";
    }

    // Render experience blocks from application payload or fallback to API
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
            (startYear || "—") + " \u2013 " + (endYear || "Present");
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
        skillsEl.innerHTML = "<span>\u2014</span>";
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
        skillsEl.innerHTML = "<span>\u2014</span>";
      }
    }

    function renderLanguages(languages) {
      if (!languagesEl) return;
      languagesEl.innerHTML = "";
      var items = Array.isArray(languages) ? languages : [];
      if (!items.length) {
        languagesEl.innerHTML = "<p>\u2014</p>";
        return;
      }
      items.forEach(function (item) {
        var name = (item && item.language) || "";
        var level = (item && item.level) || "";
        var text = String(name).trim();
        var lvl = String(level).trim();
        if (text && lvl) {
          text = text + " \u2014 " + lvl;
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
        languagesEl.innerHTML = "<p>\u2014</p>";
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
            if (!res || res.error || !Array.isArray(res.data)) return;
            renderExperienceBlocks(res.data);
          })
          .catch(function () {});
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
            if (!res || res.error || !Array.isArray(res.data)) return;
            renderSkills(res.data);
          })
          .catch(function () {});
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
            if (!res || res.error || !Array.isArray(res.data)) return;
            renderLanguages(res.data);
          })
          .catch(function () {});
      }
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.getCandidateById === "function"
    ) {
      window.IESupabase
        .getCandidateById(candidateId)
        .then(function (res) {
          if (!res || res.error || !res.data) return;
          var candidate = res.data;
          if (locationEl && !app.candidate_location) {
            locationEl.textContent = candidate.address || "—";
          }

          if (
            cvLinkEl &&
            candidate.cv_url &&
            typeof window.IESupabase.createSignedCandidateUrl ===
              "function"
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
              .catch(function () {
                cvLinkEl.style.display = "none";
              });
          } else if (cvLinkEl) {
            cvLinkEl.style.display = "none";
          }
        })
        .catch(function () {});
    }
  }

  function hydrateJobOfferSummary(app) {
    var salaryEl = document.querySelector("[data-app-offer-salary]");
    var hiredCountEl = document.querySelector(
      "[data-app-offer-hired-count]"
    );

    if (!app || !app.job_offer_id) {
      if (salaryEl) salaryEl.textContent = "—";
      if (hiredCountEl) hiredCountEl.textContent = "—";
      return;
    }

    var jobOfferId = app.job_offer_id;

    if (
      window.IEQueries &&
      window.IEQueries.jobOffers &&
      typeof window.IEQueries.jobOffers.getJobOfferById === "function"
    ) {
      window.IEQueries.jobOffers
        .getJobOfferById(jobOfferId)
        .then(function (res) {
          if (!res || res.error || !res.data) {
            if (salaryEl) salaryEl.textContent = "—";
            return;
          }
          var offer = res.data;
          if (salaryEl) {
            salaryEl.textContent = offer.salary || "—";
          }
        })
        .catch(function () {
          if (salaryEl) salaryEl.textContent = "—";
        });
    } else if (salaryEl) {
      salaryEl.textContent = "—";
    }

    if (
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.getApplicationsByJob ===
        "function"
    ) {
      window.IEQueries.applications
        .getApplicationsByJob(jobOfferId)
        .then(function (res) {
          if (!res || res.error || !Array.isArray(res.data)) {
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
        .catch(function () {
          if (hiredCountEl) hiredCountEl.textContent = "—";
        });
    } else if (hiredCountEl) {
      hiredCountEl.textContent = "—";
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

