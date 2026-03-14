;(function () {
  "use strict";

  function getPageParams() {
    if (
      window.IERouter &&
      typeof window.IERouter.getJobOfferPageParams === "function"
    ) {
      return window.IERouter.getJobOfferPageParams();
    }

    var search = new URLSearchParams(window.location.search || "");
    var rawId = search.get("id");
    var id = rawId ? rawId.toString() : null;
    var rawMode = (search.get("mode") || "").toString().toLowerCase();
    var mode = rawMode === "edit" ? "edit" : "view";
    return { id: id, mode: mode };
  }

  function navigateToList() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("job-offers");
    } else {
      window.location.href = "job-offers.html";
    }
  }

  function getViewUrl(id) {
    if (!id) {
      return "job-offer.html";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerView === "function"
    ) {
      return window.IEPortal.links.offerView(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityViewUrl === "function"
    ) {
      return window.IERouter.getEntityViewUrl("jobOffer", id);
    }

    return (
      "job-offer.html?id=" +
      encodeURIComponent(String(id || "")) +
      "&mode=view"
    );
  }

  function getEditUrl(id) {
    if (!id) {
      return "job-offer.html?mode=edit";
    }

    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerEdit === "function"
    ) {
      return window.IEPortal.links.offerEdit(id);
    }

    if (
      window.IERouter &&
      typeof window.IERouter.getEntityEditUrl === "function"
    ) {
      return window.IERouter.getEntityEditUrl("jobOffer", id);
    }

    return (
      "job-offer.html?id=" +
      encodeURIComponent(String(id || "")) +
      "&mode=edit"
    );
  }

  /**
   * Toolbar lifecycle status: active (Edit + Mark as Closed), closed (Reopen), or archived (Reopen).
   * Must use job_offer.status so Mark as Closed / Reopen stay in sync with close/reopen actions.
   */
  function getStatus(offer) {
    if (!offer) return null;
    if (offer.is_archived) return "archived";
    var s = (offer.status || "").toString().toLowerCase().trim();
    if (s === "closed") return "closed";
    if (s === "archived") return "archived";
    return "active";
  }

  async function archive(jobOfferId) {
    if (!jobOfferId) return null;
    if (!window.IESupabase || !window.IESupabase.archiveJobOffer) {
      return null;
    }

    var res = await window.IESupabase.archiveJobOffer(jobOfferId);
    if (!res || res.error) {
      return res || null;
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("job_offer", jobOfferId, {
          event_type: "system_event",
          message: "Job offer archived",
          metadata: null,
        })
        .catch(function () {});
    }

    return res;
  }

  async function close(jobOfferId) {
    if (!jobOfferId) return null;
    if (!window.IESupabase || !window.IESupabase.updateJobOfferStatus) {
      return null;
    }
    var res = await window.IESupabase.updateJobOfferStatus(jobOfferId, "closed");
    if (!res || res.error) {
      return res || null;
    }
    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("job_offer", jobOfferId, {
          event_type: "status_change",
          message: "Job offer closed",
          metadata: { to: "closed" },
        })
        .catch(function () {});
    }
    return res;
  }

  /**
   * Reopen: if archived, unarchive then set status active; if closed, set status active.
   * Caller should full-refresh the page after success (reload or refetch entity + rerender).
   */
  async function reopen(jobOfferId) {
    if (!jobOfferId) return null;
    if (!window.IESupabase || !window.IESupabase.getJobOfferById) {
      return null;
    }
    var offerRes = await window.IESupabase.getJobOfferById(jobOfferId);
    var offer = (offerRes && offerRes.data) || null;
    if (offer && offer.is_archived && window.IESupabase.unarchiveJobOffer) {
      var unarchiveRes = await window.IESupabase.unarchiveJobOffer(jobOfferId);
      if (unarchiveRes && unarchiveRes.error) return unarchiveRes;
    }
    if (!window.IESupabase.updateJobOfferStatus) {
      return null;
    }
    var res = await window.IESupabase.updateJobOfferStatus(jobOfferId, "active");
    if (!res || res.error) {
      return res || null;
    }
    if (
      window.IESupabase &&
      typeof window.IESupabase.createAutoLog === "function"
    ) {
      window.IESupabase
        .createAutoLog("job_offer", jobOfferId, {
          event_type: "system_event",
          message: "Job offer reopened",
          metadata: null,
        })
        .catch(function () {});
    }
    return res;
  }

  async function loadEntity(args) {
    args = args || {};
    var id = args.id;
    var mode = args.mode || "view";

    if (!id) {
      return { entity: null, mode: mode };
    }

    if (!window.IESupabase || !window.IESupabase.getJobOfferById) {
      console.error("[JobOffer] IESupabase.getJobOfferById not available");
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Supabase non disponibile per il caricamento dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }

    try {
      var result = await window.IESupabase.getJobOfferById(id);
      if (!result || result.error) {
        console.error(
          "[JobOffer] getJobOfferById error:",
          result && result.error
        );
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (result &&
              result.error &&
              result.error.message) ||
              "Errore durante il caricamento dell'offerta.",
            "jobOfferEntityPage"
          );
        }
        return { entity: null, mode: mode };
      }

      var offer = result.data || null;

      // Best-effort enrichment for UI: the job_offers detail query returns "*"
      // and may not include a joined client name, while list queries do.
      // If the record only has client_id, fetch the client to display name.
      try {
        if (
          offer &&
          !offer.client_name &&
          offer.client_id &&
          window.IESupabase &&
          typeof window.IESupabase.getClientById === "function"
        ) {
          // eslint-disable-next-line no-await-in-loop
          var clientRes = await window.IESupabase.getClientById(offer.client_id);
          if (clientRes && !clientRes.error && clientRes.data) {
            offer = Object.assign({}, offer, {
              client_name: clientRes.data.name || offer.client_name || null,
            });
          }
        }
      } catch (enrichErr) {
        console.warn("[JobOffer] client enrichment skipped:", enrichErr);
      }

      return { entity: offer, mode: mode };
    } catch (err) {
      console.error("[JobOffer] getJobOfferById exception:", err);
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il caricamento dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: null, mode: mode };
    }
  }

  function getEditableFieldsFromConfig() {
    var editable =
      window.JobOfferEntityConfig &&
      window.JobOfferEntityConfig.fields &&
      Array.isArray(window.JobOfferEntityConfig.fields.editable)
        ? window.JobOfferEntityConfig.fields.editable
        : null;

    if (editable && editable.length) {
      return editable.slice();
    }

    return [
      "title",
      "position",
      "city",
      "state",
      "contract_type",
      "positions",
      "salary",
      "deadline",
      "status",
      "description",
      "requirements",
      "notes",
    ];
  }

  function parseDeadlineValue(value, ctx) {
    if (!value) {
      return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
    }

    var str = value.toString().trim();
    if (!str || str === "—") {
      return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
    }

    // Accept ISO date (YYYY-MM-DD) and keep it.
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Accept Italian-style dates shown in view mode (DD/MM/YYYY).
    var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      var day = match[1].padStart(2, "0");
      var month = match[2].padStart(2, "0");
      var year = match[3];
      return year + "-" + month + "-" + day;
    }

    // Fallback: preserve existing stored deadline if parsing fails.
    return ctx && ctx.entity && ctx.entity.deadline ? ctx.entity.deadline : null;
  }

  function collectEditableFieldValuesSafe(offer, editableFields) {
    if (
      !window.IEEntityFieldMapper ||
      typeof window.IEEntityFieldMapper.collectEditableFieldValues !==
        "function"
    ) {
      return {};
    }

    var rawEdited = {};
    try {
      rawEdited = window.IEEntityFieldMapper.collectEditableFieldValues({
        editableFields: editableFields,
        entity: offer || {},
        fieldParsers: {
          positions: function (value) {
            if (!value) return null;
            var n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return null;
            return n;
          },
          deadline: parseDeadlineValue,
        },
      });
    } catch (err) {
      console.error(
        "[JobOffer] collectEditableFieldValues error from config:",
        err
      );
      rawEdited = {};
    }

    var edited = {};
    editableFields.forEach(function (fieldName) {
      var nodes = document.querySelectorAll(
        '[data-field="' + fieldName + '"]'
      );
      if (!nodes || !nodes.length) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(rawEdited, fieldName)) {
        edited[fieldName] = rawEdited[fieldName];
      }
    });

    return edited;
  }

  /**
   * Collect job posting form values from the Public Job Posting section (when in edit mode).
   * Returns null if no posting form or no posting id on the card.
   */
  function collectJobPostingFormPayload() {
    var card = document.querySelector("[data-ie-jobposting-card]");
    var form = document.querySelector("[data-ie-jobposting-form]");
    if (!card || !form) return null;
    var postingId = card.getAttribute("data-posting-id");
    if (!postingId) return null;

    function getField(key) {
      var el = form.querySelector('[data-ie-jobposting-field="' + key + '"]');
      return el ? el.value : "";
    }

    var titleValue = (getField("public_title") || "").trim();
    var slugValue = (getField("slug") || "").trim();
    if (!titleValue || !slugValue) return null;

    var payload = {
      public_title: titleValue,
      public_location: (getField("public_location") || "").trim() || null,
      public_description: (getField("public_description") || "").trim() || null,
      public_requirements: (getField("public_requirements") || "").trim() || null,
      public_benefits: (getField("public_benefits") || "").trim() || null,
      slug: slugValue,
    };

    var rawDeadline = (getField("apply_deadline") || "").trim();
    if (rawDeadline && window.IEJobPostingDeadline && typeof window.IEJobPostingDeadline.applyDeadlineToISOEndOfDayNY === "function") {
      payload.apply_deadline = window.IEJobPostingDeadline.applyDeadlineToISOEndOfDayNY(rawDeadline);
    } else {
      payload.apply_deadline = rawDeadline || null;
    }

    return { postingId: postingId, payload: payload };
  }

  function buildSavePayload(state) {
    state = state || {};
    var offer = state.entity || {};

    var editableFields = getEditableFieldsFromConfig();
    var edited = collectEditableFieldValuesSafe(offer, editableFields);

    // IMPORTANT:
    // The real `IEData.jobOffers.updateJobOffer()` treats missing fields as null
    // (e.g. `client_id: payload.client_id ?? null`), so we must always preserve
    // non-editable but required columns, otherwise saving would accidentally
    // wipe them out.
    var payload = {
      client_id: offer.client_id ?? null,
    };

    editableFields.forEach(function (fieldName) {
      if (Object.prototype.hasOwnProperty.call(edited, fieldName)) {
        payload[fieldName] = edited[fieldName];
      } else if (Object.prototype.hasOwnProperty.call(offer, fieldName)) {
        payload[fieldName] = offer[fieldName];
      } else {
        // When the entity lacks a value and the field is present in the UI,
        // explicitly send null to avoid "undefined -> null" surprises inside
        // updateJobOffer, while keeping the payload shape predictable.
        payload[fieldName] = null;
      }
    });

    var result = { main: payload };
    var jobPostingForm = collectJobPostingFormPayload();
    if (jobPostingForm) {
      result.jobPostingId = jobPostingForm.postingId;
      result.jobPosting = jobPostingForm.payload;
    }
    return result;
  }

  async function performSave(state, payload) {
    state = state || {};
    payload = payload || {};

    var jobOfferId = state.id;
    var currentEntity = state.entity || {};

    if (!jobOfferId) {
      return { entity: currentEntity, haltRedirect: true };
    }

    if (
      !window.IESupabase ||
      typeof window.IESupabase.updateJobOffer !== "function"
    ) {
      console.error("[JobOffer] IESupabase.updateJobOffer not available");
      return { entity: currentEntity, haltRedirect: true };
    }

    var main = payload.main || {};
    var jobPostingId = payload.jobPostingId || null;
    var jobPostingPayload = payload.jobPosting || null;

    try {
      var result = await window.IESupabase.updateJobOffer(jobOfferId, main);
      if (!result || result.error) {
        console.error(
          "[JobOffer] updateJobOffer error from entity page:",
          result && result.error
        );
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (result &&
              result.error &&
              result.error.message) ||
              "Errore durante il salvataggio dell'offerta.",
            "jobOfferEntityPage"
          );
        }
        return { entity: currentEntity, haltRedirect: true };
      }

      var updatedOffer = result.data || currentEntity;

      if (jobPostingId && jobPostingPayload && window.IESupabase && typeof window.IESupabase.updateJobPosting === "function") {
        try {
          var postingResult = await window.IESupabase.updateJobPosting(jobPostingId, jobPostingPayload);
          if (postingResult && postingResult.error) {
            console.error("[JobOffer] updateJobPosting error from entity page:", postingResult.error);
            if (window.IESupabase.showError) {
              window.IESupabase.showError(postingResult.error.message || "Error saving public posting.");
            }
          } else if (window.IESupabase.showSuccess) {
            window.IESupabase.showSuccess("Job offer and public posting saved.");
          }
        } catch (postingErr) {
          console.error("[JobOffer] updateJobPosting exception:", postingErr);
          if (window.IESupabase.showError) {
            window.IESupabase.showError(postingErr.message || "Error saving public posting.");
          }
        }
      }

      return { entity: updatedOffer, haltRedirect: false };
    } catch (err) {
      console.error(
        "[JobOffer] updateJobOffer exception from entity page:",
        err
      );
      if (
        window.IESupabase &&
        typeof window.IESupabase.showError === "function"
      ) {
        window.IESupabase.showError(
          "Errore imprevisto durante il salvataggio dell'offerta.",
          "jobOfferEntityPage"
        );
      }
      return { entity: currentEntity, haltRedirect: true };
    }
  }

  function loadJobOfferApplicationsSection(state) {
    state = state || {};
    var jobOfferId = state.id;
    if (!jobOfferId) {
      return Promise.resolve({ applications: [] });
    }

    if (
      window.IEQueries &&
      window.IEQueries.applications &&
      typeof window.IEQueries.applications.getApplicationsByJob === "function"
    ) {
      return window.IEQueries.applications
        .getApplicationsByJob(jobOfferId)
        .then(function (result) {
          if (!result || result.error || !Array.isArray(result.data)) {
            return { applications: [] };
          }
          return { applications: result.data };
        })
        .catch(function (err) {
          console.error(
            "[JobOffer] getApplicationsByJob error (related section):",
            err
          );
          return { applications: [] };
        });
    }

    return Promise.resolve({ applications: [] });
  }

  var PIPELINE_VIEW_STORAGE_KEY = "ie-joboffer-pipeline-view";

  function getStoredPipelineView() {
    try {
      var v = (localStorage.getItem(PIPELINE_VIEW_STORAGE_KEY) || "board").toLowerCase();
      return v === "list" ? "list" : "board";
    } catch (e) {
      return "board";
    }
  }

  function renderJobOfferApplicationsSection(state, data) {
    state = state || {};
    data = data || {};
    var apps = data.applications || [];

    var sectionEl = document.querySelector(
      "[data-ie-joboffer-pipeline-section]"
    );
    var boardEl = document.querySelector(
      "[data-ie-joboffer-pipeline-board]"
    );
    var summaryEl = document.querySelector(
      "[data-ie-joboffer-pipeline-summary]"
    );
    var listEl = document.querySelector("[data-ie-joboffer-pipeline-list]");
    var listBodyEl = document.querySelector("[data-ie-joboffer-pipeline-list-body]");
    var toggleBoardBtn = document.querySelector('[data-ie-pipeline-view="board"]');
    var toggleListBtn = document.querySelector('[data-ie-pipeline-view="list"]');

    if (!sectionEl || !boardEl || !summaryEl) {
      return null;
    }

    if (!apps.length) {
      sectionEl.style.display = "none";
      return null;
    }

    function normalizeStatus(status) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime
          .normalizeApplicationStatusForDisplay === "function"
      ) {
        return window.IEStatusRuntime.normalizeApplicationStatusForDisplay(
          status
        );
      }
      var s = (status || "").toString().toLowerCase();
      if (s === "new") return "applied";
      if (s === "offered") return "offer";
      return s;
    }

    function statusLabel(s) {
      if (
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime.formatApplicationStatusLabel ===
          "function"
      ) {
        return window.IEStatusRuntime.formatApplicationStatusLabel(s);
      }
      var labels = {
        applied: "Applied",
        screening: "Screening",
        interview: "Interview",
        offer: "Offer",
        hired: "Hired",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
        not_selected: "Not selected",
      };
      return labels[s] != null
        ? labels[s]
        : s
        ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
        : "—";
    }

    function renderList() {
      if (!listEl || !listBodyEl) return;
      listBodyEl.innerHTML = "";
      var escape = window.escapeHtml || function (x) { return x == null ? "" : String(x); };
      apps.forEach(function (app) {
        var tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/80";
        var name = (app.candidate_name || "—").toString();
        var position = (app.candidate_position || "—").toString();
        var normalized = normalizeStatus(app.status);
        var status = statusLabel(normalized);
        var updated = app.updated_at
          ? new Date(app.updated_at).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "—";
        var badgeClass =
          "badge " +
          (window.IEStatusRuntime &&
          typeof window.IEStatusRuntime.getApplicationStatusBadgeClass ===
            "function"
            ? window.IEStatusRuntime.getApplicationStatusBadgeClass(normalized)
            : "badge-open");
        var viewHref =
          (window.IEPortal && window.IEPortal.links && typeof window.IEPortal.links.applicationView === "function")
            ? window.IEPortal.links.applicationView(app.id)
            : "application.html?id=" + encodeURIComponent(String(app.id));
        tr.innerHTML =
          "<td class=\"ie-table-cell font-medium text-gray-900\">" + escape(name) + "</td>" +
          "<td class=\"ie-table-cell text-gray-600\">" + escape(position) + "</td>" +
          "<td class=\"ie-table-cell\"><span class=\"" + badgeClass + " text-xs\">" + escape(status) + "</span></td>" +
          "<td class=\"ie-table-cell text-gray-500 text-xs\">" + escape(updated) + "</td>" +
          "<td class=\"ie-table-cell text-right\"><a href=\"" + escape(viewHref) + "\" class=\"ie-btn ie-btn-secondary !py-1 !px-2 text-xs\" data-action=\"view-application\">View</a></td>";
        var link = tr.querySelector("[data-action=\"view-application\"]");
        if (link && (window.IERouter && typeof window.IERouter.navigateTo === "function")) {
          link.addEventListener("click", function (e) {
            e.preventDefault();
            window.IERouter.navigateTo(viewHref);
          });
        }
        listBodyEl.appendChild(tr);
      });
    }

    function setPipelineView(view) {
      var v = view === "list" ? "list" : "board";
      try {
        localStorage.setItem(PIPELINE_VIEW_STORAGE_KEY, v);
      } catch (e) {}
      sectionEl.style.display = "";
      if (toggleBoardBtn) {
        toggleBoardBtn.setAttribute("aria-pressed", v === "board" ? "true" : "false");
        toggleBoardBtn.classList.toggle("!bg-[#1b4332] !text-white", v === "board");
        toggleBoardBtn.classList.toggle("ie-btn-secondary", v !== "board");
      }
      if (toggleListBtn) {
        toggleListBtn.setAttribute("aria-pressed", v === "list" ? "true" : "false");
        toggleListBtn.classList.toggle("!bg-[#1b4332] !text-white", v === "list");
        toggleListBtn.classList.toggle("ie-btn-secondary", v !== "list");
      }
      if (boardEl) boardEl.classList.toggle("hidden", v !== "board");
      if (listEl) listEl.classList.toggle("hidden", v !== "list");
      if (v === "list") renderList(); else renderBoard();
    }

    function renderBoard() {
      var total = apps.length;
      summaryEl.textContent =
        total === 1
          ? "1 application for this job."
          : String(total) + " applications for this job.";

      var columns = {
        applied: [],
        screening: [],
        interview: [],
        offer: [],
        hired: [],
        rejected: [],
        withdrawn: [],
        not_selected: [],
      };

      var appById = {};
      apps.forEach(function (app) {
        if (!app || !app.id) return;
        appById[String(app.id)] = app;
        var s = normalizeStatus(app.status);
        if (!columns[s]) columns[s] = [];
        columns[s].push(app);
      });

      boardEl.innerHTML = "";

      var statusLabels = {
        applied: "Applied",
        screening: "Screening",
        interview: "Interview",
        offer: "Offer",
        hired: "Hired",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
        not_selected: "Not selected",
      };
      Object.keys(columns).forEach(function (statusKey) {
        var statusLabel = statusLabels[statusKey] != null
          ? statusLabels[statusKey]
          : statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace(/_/g, " ");
        var list = columns[statusKey];

        var col = document.createElement("div");
        col.className = "space-y-2";
        col.setAttribute("data-pipeline-status", statusKey);

        var header = document.createElement("div");
        header.className = "flex items-center justify-between gap-2";
        var title = document.createElement("p");
        title.className =
          "text-[11px] font-semibold uppercase tracking-widest text-gray-500";
        title.textContent = statusLabel;
        var countBadge = document.createElement("span");
        countBadge.className =
          "inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700";
        countBadge.textContent = String(list.length);
        header.appendChild(title);
        header.appendChild(countBadge);
        col.appendChild(header);

        if (!list.length) {
          var empty = document.createElement("div");
          empty.className =
            "text-[11px] text-gray-400 italic border border-dashed border-gray-200 rounded-xl p-2 text-center";
          empty.textContent = "No candidates";
          col.appendChild(empty);
        } else {
          list.forEach(function (app) {
            var card = document.createElement("button");
            card.type = "button";
            card.className =
              "w-full text-left bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition";
            card.setAttribute("data-application-id", String(app.id));
            card.setAttribute(
              "data-application-status",
              normalizeStatus(app.status)
            );
            card.draggable = true;

            var name = document.createElement("div");
            name.className = "text-xs font-semibold text-gray-900 truncate";
            name.textContent = app.candidate_name || "—";
            card.appendChild(name);

            if (app.candidate_position || app.candidate_location) {
              var meta = document.createElement("div");
              meta.className = "mt-0.5 text-[11px] text-gray-600 truncate";
              var parts = [];
              if (app.candidate_position) parts.push(app.candidate_position);
              if (app.candidate_location) parts.push(app.candidate_location);
              meta.textContent = parts.join(" • ");
              card.appendChild(meta);
            }

            // Click navigates to application detail (when not dragging).
            card.addEventListener("click", function (event) {
              if (event.defaultPrevented) return;
              var href;
              if (
                window.IEPortal &&
                window.IEPortal.links &&
                typeof window.IEPortal.links.applicationView === "function"
              ) {
                href = window.IEPortal.links.applicationView(app.id);
              } else {
                href =
                  "application.html?id=" + encodeURIComponent(String(app.id));
              }
              if (
                window.IERouter &&
                typeof window.IERouter.navigateTo === "function"
              ) {
                window.IERouter.navigateTo(href);
              } else {
                window.location.href = href;
              }
            });

            // Drag & drop handlers.
            card.addEventListener("dragstart", function (e) {
              try {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(app.id));
              } catch (_) {}
              card.classList.add("opacity-60");
            });
            card.addEventListener("dragend", function () {
              card.classList.remove("opacity-60");
            });

            col.appendChild(card);
          });
        }

        // Column drag-over / drop handlers.
        col.addEventListener("dragover", function (e) {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
          }
          col.classList.add("ring-2", "ring-emerald-300", "ring-offset-1");
        });
        col.addEventListener("dragleave", function () {
          col.classList.remove("ring-2", "ring-emerald-300", "ring-offset-1");
        });
        col.addEventListener("drop", function (e) {
          e.preventDefault();
          col.classList.remove("ring-2", "ring-emerald-300", "ring-offset-1");
          var appId = null;
          try {
            appId = e.dataTransfer ? e.dataTransfer.getData("text/plain") : null;
          } catch (_) {}
          if (!appId) return;
          var app = appById[String(appId)];
          if (!app || !app.id) return;

          var currentStatus = normalizeStatus(app.status);
          var newStatus = statusKey;
          if (!newStatus || newStatus === currentStatus) return;

          // Optimistic UI update.
          app.status = newStatus;
          renderBoard();

          // Persist status change.
          if (
            window.IEQueries &&
            window.IEQueries.applications &&
            typeof window.IEQueries.applications.updateApplicationStatus ===
              "function"
          ) {
            window.IEQueries.applications
              .updateApplicationStatus(app.id, newStatus)
              .catch(function (err) {
                console.error(
                  "[JobOffer] updateApplicationStatus error from drag & drop:",
                  err
                );
              });
          }
        });

        boardEl.appendChild(col);
      });

      sectionEl.style.display = "";
    }

    function bindPipelineViewToggle() {
      if (toggleBoardBtn && !toggleBoardBtn.dataset.iePipelineToggleBound) {
        toggleBoardBtn.dataset.iePipelineToggleBound = "true";
        toggleBoardBtn.addEventListener("click", function () { setPipelineView("board"); });
      }
      if (toggleListBtn && !toggleListBtn.dataset.iePipelineToggleBound) {
        toggleListBtn.dataset.iePipelineToggleBound = "true";
        toggleListBtn.addEventListener("click", function () { setPipelineView("list"); });
      }
    }

    setPipelineView(getStoredPipelineView());
    bindPipelineViewToggle();
    return null;
  }

  function renderMain(options) {
    options = options || {};
    var entity = options.entity || null;
    var id = options.id;
    var mode = options.mode || "view";

    if (!entity || !id) return;

    if (typeof window.renderJobOfferCore === "function") {
      window.renderJobOfferCore(entity, id, mode);
    }
  }

  function onNotFound() {
    if (typeof window.renderJobOfferNotFound === "function") {
      window.renderJobOfferNotFound();
      return;
    }
  }

  function applyMode(mode, context) {
    if (!mode) return;
    var entity = context && context.entity ? context.entity : null;

    if (typeof window.applyModeToJobOfferFields === "function") {
      window.applyModeToJobOfferFields(mode, entity);
    }
  }

  window.JobOfferEntityConfig = {
    entityType: "job_offer",

    metadata: {
      displayName: "Job Offer",
    },

    route: {
      getPageParams: getPageParams,
      getViewUrl: getViewUrl,
      getEditUrl: getEditUrl,
      navigateToList: navigateToList,
    },

    fields: {
      editable: [
        "title",
        "position",
        "city",
        "state",
        "contract_type",
        "positions",
        "salary",
        "deadline",
        "status",
        "description",
        "requirements",
        "notes",
      ],
    },
    ui: {
      rootId: "jobOfferProfileRoot",
      toolbarContainerId: "jobOfferActions",
      activityContainerId: "activity-container",
      renderMain: renderMain,
      onNotFound: onNotFound,
    },

    lifecycle: {
      getStatus: getStatus,
      close: close,
      archive: archive,
      reopen: reopen,
    },

    data: {
      loadEntity: loadEntity,
      buildSavePayload: buildSavePayload,
      performSave: performSave,
    },
    mode: {
      apply: applyMode,
    },
    related: {
      sections: [
        {
          id: "job-offer-applications-pipeline",
          load: loadJobOfferApplicationsSection,
          render: renderJobOfferApplicationsSection,
        },
        {
          id: "job-offer-public-posting",
          load: function loadPublicJobPostingSection(state) {
            if (!state || !state.id || !window.IESupabase || typeof window.IESupabase.getJobPostingByJobOfferId !== "function") {
              return Promise.resolve({ posting: null });
            }
            return window.IESupabase.getJobPostingByJobOfferId(state.id).then(function (result) {
              return { posting: (result && result.data) || null };
            }).catch(function () { return { posting: null }; });
          },
          render: function renderPublicJobPostingSection(state, data) {
            if (!state || !state.id) return;
            var posting = (data && data.posting) || null;
            var pageMode = (state.mode === "edit") ? "edit" : "view";
            if (typeof window.renderPublicJobPostingCard === "function") {
              window.renderPublicJobPostingCard(state.id, state.entity || null, posting, pageMode);
            }
            if (typeof window.setJobOfferHeroPublicStatusBadge === "function" && state.entity) {
              window.setJobOfferHeroPublicStatusBadge(state.entity, posting);
            }
          },
        },
      ],
    },
  };
})();

