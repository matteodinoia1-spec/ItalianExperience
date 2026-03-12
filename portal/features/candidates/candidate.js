(function () {
  "use strict";

  var _candidatePageParams = null;
  var EDITABLE_FIELDS = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "position",
    "source",
    "linkedin_url",
    "date_of_birth",
    "address",
    "summary",
    "notes",
  ];
  var CONFIG = window.CandidateEntityConfig || null;
  window.CANDIDATE_EDITABLE_FIELDS = EDITABLE_FIELDS;
  var _currentCandidate = null;

  function getRoot() {
    var rootId =
      CONFIG && CONFIG.ui && CONFIG.ui.rootId
        ? CONFIG.ui.rootId
        : "candidateProfileRoot";
    return document.getElementById(rootId);
  }

  function safeString(value) {
    if (window.IEEntityFieldMapper && typeof window.IEEntityFieldMapper.safeString === "function") {
      return window.IEEntityFieldMapper.safeString(value);
    }
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function getCandidatePageParamsSafe() {
    if (_candidatePageParams) return _candidatePageParams;

    var params = null;

    if (
      CONFIG &&
      CONFIG.route &&
      typeof CONFIG.route.getPageParams === "function"
    ) {
      params = CONFIG.route.getPageParams();
    } else if (
      window.IERouter &&
      typeof window.IERouter.getCandidatePageParams === "function"
    ) {
      params = window.IERouter.getCandidatePageParams();
    } else {
      var search = new URLSearchParams(window.location.search || "");
      var rawId = search.get("id");
      var id = rawId ? rawId.toString() : null;
      var rawMode = (search.get("mode") || "").toString().toLowerCase();
      var mode = rawMode === "edit" ? "edit" : "view";
      params = { id: id, mode: mode };
    }

    _candidatePageParams = params || { id: null, mode: "view" };
    return _candidatePageParams;
  }

  function isViewMode() {
    return getCandidatePageParamsSafe().mode === "view";
  }

  function isEditMode() {
    return getCandidatePageParamsSafe().mode === "edit";
  }

  function applyModeToProfileFields(mode) {
    var makeEditable = mode === "edit";
    EDITABLE_FIELDS.forEach(function (field) {
      var nodes = document.querySelectorAll('[data-field="' + field + '"]');
      nodes.forEach(function (el) {
        if ("readOnly" in el) {
          el.readOnly = !makeEditable;
        }

        // View-mode styling uses the "field-display" class plus the readonly
        // attribute to make inputs look like plain text and disable interaction
        // via pointer-events. In edit mode we must remove that class so the
        // same elements become truly editable without changing layout.
        if (makeEditable) {
          if (el.classList && el.classList.contains("field-display")) {
            el.classList.remove("field-display");
          }
        } else {
          if (el.classList && !el.classList.contains("field-display")) {
            el.classList.add("field-display");
          }
        }

        // When entering edit mode, clear the visual "—" placeholder so that
        // native input placeholders can appear instead and the save logic
        // still reads an empty value for untouched fields.
        if (makeEditable && "value" in el) {
          var currentValue = safeString(el.value).trim();
          if (currentValue === "—") {
            el.value = "";
          }
        }
      });
    });
  }

  function applyHeroContactMode(mode) {
    var isEdit = mode === "edit";

    var nameView = document.querySelector("[data-hero-name-view]");
    var nameEdit = document.querySelector("[data-hero-name-edit]");
    if (nameView && nameEdit) {
      if (isEdit) {
        nameView.classList.add("hidden");
        nameEdit.classList.remove("hidden");
      } else {
        nameView.classList.remove("hidden");
        nameEdit.classList.add("hidden");
      }
    }

    function swap(viewSelector, inputSelector) {
      var viewEl = document.querySelector(viewSelector);
      var inputEl = document.querySelector(inputSelector);
      if (!viewEl || !inputEl) return;
      if (isEdit) {
        viewEl.classList.add("hidden");
        inputEl.classList.remove("hidden");
      } else {
        viewEl.classList.remove("hidden");
        inputEl.classList.add("hidden");
      }
    }

    swap("[data-hero-email-view]", "[data-hero-email-input]");
    swap("[data-hero-phone-view]", "[data-hero-phone-input]");
    swap("[data-hero-source-view]", "[data-hero-source-input]");
  }

  function applyInlineProfileEditVisibility(mode) {
    var isEdit = mode === "edit";
    var sections = [
      "experience",
      "education",
      "skills",
      "hobbies",
      "languages",
      "certifications",
    ];

    sections.forEach(function (sectionName) {
      var listEl = document.querySelector('[data-list="' + sectionName + '"]');
      var emptyEl = document.querySelector('[data-empty="' + sectionName + '"]');
      var repeatableEl = document.querySelector(
        '[data-repeatable-section="' + sectionName + '"]'
      );

      if (listEl) {
        listEl.style.display = isEdit ? "none" : "";
      }
      if (emptyEl) {
        emptyEl.style.display = isEdit ? "none" : "";
      }
      if (repeatableEl) {
        repeatableEl.style.display = isEdit ? "" : "none";
      }
    });
  }

  function applyActivityVisibility(mode) {
    var activitySection = document.getElementById("candidateActivityLog");
    if (!activitySection) return;
    if (mode === "edit") {
      activitySection.classList.add("hidden");
    } else {
      activitySection.classList.remove("hidden");
    }
  }

  function applyJsonImportVisibility(mode) {
    var controls = document.getElementById("candidateJsonImportControls");
    if (!controls) return;
    if (mode === "edit") {
      controls.classList.remove("hidden");
    } else {
      controls.classList.add("hidden");
    }
  }

  function applyDocumentsMode(mode, candidate) {
    var documentsSection = document.getElementById("candidateDocumentsSection");
    if (!documentsSection) return;

    var isEdit = mode === "edit";

    // In edit mode, hide the simple view-only CV/photo placeholders inside
    // the Documents subsection to avoid duplicate controls; hero photo and
    // view-mode CV link are still managed separately by renderDocuments.
    var cvLinkEl = document.querySelector('[data-doc-link="cv"]');
    var cvEmptyEl = document.querySelector('[data-doc-empty="cv"]');
    var photoEmptyEl = document.querySelector('[data-doc-empty="photo"]');

    if (isEdit) {
      documentsSection.classList.remove("hidden");
      if (cvLinkEl) cvLinkEl.style.display = "none";
      if (cvEmptyEl) cvEmptyEl.style.display = "none";
      if (photoEmptyEl) photoEmptyEl.style.display = "none";
    } else {
      documentsSection.classList.add("hidden");
      if (cvLinkEl) cvLinkEl.style.display = "";
      if (cvEmptyEl) cvEmptyEl.style.display = "";
      if (photoEmptyEl) photoEmptyEl.style.display = "";
      return;
    }

    if (!candidate || !window.IECandidateRuntime) return;

    try {
      var cvInput = documentsSection.querySelector('input[name="cv_file"]');
      var photoInput = documentsSection.querySelector('input[name="foto_file"]');

      if (cvInput && candidate.cv_url) {
        cvInput.dataset.currentPath = candidate.cv_url;
      }
      if (photoInput && candidate.photo_url) {
        photoInput.dataset.currentPath = candidate.photo_url;
      }

      if (
        typeof window.IECandidateRuntime.renderCandidateFileState === "function"
      ) {
        window.IECandidateRuntime.renderCandidateFileState(
          "cv",
          candidate,
          "edit"
        );
        window.IECandidateRuntime.renderCandidateFileState(
          "photo",
          candidate,
          "edit"
        );
      }

      function bindInput(inputEl, type) {
        if (!inputEl || inputEl._ieDocBound) return;
        inputEl._ieDocBound = true;
        inputEl.addEventListener("change", function () {
          if (
            window.IECandidateRuntime &&
            typeof window.IECandidateRuntime.handleCandidateFileChange ===
              "function"
          ) {
            window.IECandidateRuntime.handleCandidateFileChange({
              input: inputEl,
              type: type,
            });
          }
        });
      }

      bindInput(cvInput, "cv");
      bindInput(photoInput, "photo");
    } catch (err) {
      console.error("[Candidate] applyDocumentsMode error:", err);
    }
  }

  function collectEditableFieldValues(candidate) {
    if (
      window.IEEntityFieldMapper &&
      typeof window.IEEntityFieldMapper.collectEditableFieldValues === "function"
    ) {
      return window.IEEntityFieldMapper.collectEditableFieldValues({
        editableFields: EDITABLE_FIELDS,
        entity: candidate || {},
        fieldParsers: {
          date_of_birth: function (value, ctx) {
            if (
              window.CandidateParsers &&
              typeof window.CandidateParsers.parseDateOfBirth === "function"
            ) {
              return window.CandidateParsers.parseDateOfBirth(value, ctx);
            }

            if (!value) {
              return null;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return value;
            }
            var m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) {
              var day = m[1].padStart(2, "0");
              var month = m[2].padStart(2, "0");
              var year = m[3];
              return year + "-" + month + "-" + day;
            }
            return ctx && ctx.entity && ctx.entity.date_of_birth
              ? ctx.entity.date_of_birth
              : null;
          },
        },
      });
    }

    var result = {};

    function readFieldValue(fieldName) {
      var nodes = document.querySelectorAll('[data-field="' + fieldName + '"]');
      if (!nodes || !nodes.length) return "";

      var raw = "";
      nodes.forEach(function (el) {
        var v = "";
        if ("value" in el && el.value != null) {
          v = el.value.toString();
        } else if (el.textContent != null) {
          v = el.textContent.toString();
        }
        if (!raw && v) {
          raw = v;
        }
      });

      var trimmed = safeString(raw).trim();
      if (trimmed === "—") return "";
      return trimmed;
    }

    EDITABLE_FIELDS.forEach(function (fieldName) {
      var value = readFieldValue(fieldName);

      if (fieldName === "date_of_birth") {
        if (
          window.CandidateParsers &&
          typeof window.CandidateParsers.parseDateOfBirth === "function"
        ) {
          result.date_of_birth = window.CandidateParsers.parseDateOfBirth(
            value,
            { entity: candidate || {} }
          );
          return;
        }

        if (!value) {
          result.date_of_birth = null;
          return;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          result.date_of_birth = value;
          return;
        }
        var m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          var day = m[1].padStart(2, "0");
          var month = m[2].padStart(2, "0");
          var year = m[3];
          result.date_of_birth = year + "-" + month + "-" + day;
          return;
        }
        result.date_of_birth =
          candidate && candidate.date_of_birth ? candidate.date_of_birth : null;
        return;
      }

      if (value) {
        result[fieldName] = value;
      } else {
        result[fieldName] = null;
      }
    });

    return result;
  }

  async function saveInlineProfileEdits() {
    var params = getCandidatePageParamsSafe();
    var candidateId = params && params.id;
    if (!candidateId) return;

    if (
      window.CandidateEntityConfig &&
      window.CandidateEntityConfig.data &&
      typeof window.CandidateEntityConfig.data.buildSavePayload === "function" &&
      typeof window.CandidateEntityConfig.data.performSave === "function"
    ) {
      var state = {
        id: candidateId,
        mode: params.mode || "edit",
        entity: _currentCandidate || {},
        params: params,
        config: window.CandidateEntityConfig,
      };

      var payload;
      try {
        payload = await window.CandidateEntityConfig.data.buildSavePayload(
          state
        );
      } catch (errBuild) {
        console.error(
          "[Candidate] buildSavePayload exception from inline edit:",
          errBuild
        );
        return;
      }

      var result;
      try {
        result = await window.CandidateEntityConfig.data.performSave(
          state,
          payload || {}
        );
      } catch (errSave) {
        console.error(
          "[Candidate] performSave exception from inline edit:",
          errSave
        );
        return;
      }

      if (result && result.entity) {
        _currentCandidate = result.entity;
      }

      if (result && result.haltRedirect) {
        return;
      }

      if (
        window.IERouter &&
        typeof window.IERouter.redirectToEntityView === "function"
      ) {
        window.IERouter.redirectToEntityView("candidate", candidateId);
      } else {
        window.location.href =
          "candidate.html?id=" + encodeURIComponent(candidateId);
      }

      return;
    }

    if (
      !window.IESupabase ||
      typeof window.IESupabase.updateCandidate !== "function"
    ) {
      console.error("[Candidate] IESupabase.updateCandidate not available");
      return;
    }

    var candidate = _currentCandidate || {};

    var payloadLegacy = {
      first_name: candidate.first_name || "",
      last_name: candidate.last_name || "",
      address: candidate.address || null,
      position: candidate.position || null,
      status: candidate.status || "pending_review",
      source: candidate.source || null,
      notes: candidate.notes || null,
      email: candidate.email || null,
      phone: candidate.phone || null,
      linkedin_url: candidate.linkedin_url || null,
      date_of_birth: candidate.date_of_birth || null,
      summary: candidate.summary || null,
    };

    var edited = collectEditableFieldValues(candidate);
    Object.keys(edited).forEach(function (key) {
      payloadLegacy[key] = edited[key];
    });

    var profile = null;
    try {
      var profileRoot = document.getElementById("candidateInlineProfileForm");
      if (
        profileRoot &&
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.collectCandidateProfileData ===
          "function"
      ) {
        profile =
          window.IECandidateProfileRuntime.collectCandidateProfileData(
            profileRoot
          ) || null;
      }
    } catch (profileErr) {
      console.error(
        "[Candidate] collectCandidateProfileData error from inline edit:",
        profileErr
      );
    }

    try {
      var resultLegacy = await window.IESupabase.updateCandidate(
        candidateId,
        payloadLegacy
      );
      if (!resultLegacy || resultLegacy.error) {
        console.error(
          "[Candidate] updateCandidate error from inline edit:",
          resultLegacy && resultLegacy.error
        );
        if (
          window.IESupabase &&
          typeof window.IESupabase.showError === "function"
        ) {
          window.IESupabase.showError(
            (resultLegacy &&
              resultLegacy.error &&
              resultLegacy.error.message) ||
              "Error while saving candidate profile.",
            "candidateInlineEdit"
          );
        }
        return;
      }

      _currentCandidate = resultLegacy.data || candidate;

      if (
        profile &&
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.saveCandidateProfileChildren ===
          "function"
      ) {
        var childrenResult =
          await window.IECandidateProfileRuntime.saveCandidateProfileChildren(
            candidateId,
            profile
          );
        if (!childrenResult || childrenResult.ok === false) {
          return;
        }
      }

      if (
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.logCandidateProfileUpdated ===
          "function"
      ) {
        try {
          await window.IECandidateProfileRuntime.logCandidateProfileUpdated(
            candidateId
          );
        } catch (logErr) {
          console.error(
            "[Candidate] logCandidateProfileUpdated error from inline edit:",
            logErr
          );
        }
      }

      if (
        window.IERouter &&
        typeof window.IERouter.redirectToEntityView === "function"
      ) {
        window.IERouter.redirectToEntityView("candidate", candidateId);
      } else {
        window.location.href =
          "candidate.html?id=" + encodeURIComponent(candidateId);
      }
    } catch (err) {
      console.error("[Candidate] updateCandidate exception from inline edit:", err);
      if (window.IESupabase && typeof window.IESupabase.showError === "function") {
        window.IESupabase.showError(
          "Unexpected error while saving candidate profile.",
          "candidateInlineEdit"
        );
      }
    }
  }

  function escapeHtml(str) {
    if (str == null) return "";
    var s = String(str);
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function setField(name, value) {
    if (window.IEEntityFieldMapper && typeof window.IEEntityFieldMapper.setField === "function") {
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

  function formatMonth(value) {
    if (!value) return "";
    // Expecting YYYY-MM or full ISO. Fallback to date parsing.
    var asDate;
    if (/^\d{4}-\d{2}$/.test(value)) {
      asDate = new Date(value + "-01T00:00:00Z");
    } else {
      asDate = new Date(value);
    }
    if (Number.isNaN(asDate.getTime())) return "";
    return asDate.toLocaleDateString("it-IT", { month: "2-digit", year: "numeric" });
  }

  function formatYear(value) {
    if (!value) return "";
    var n = Number(value);
    if (!n) return safeString(value);
    return String(n);
  }

  function getProfileStatusBadgeClasses(status) {
    if (window.IEStatusRuntime && typeof window.IEStatusRuntime.getProfileStatusBadgeClass === "function") {
      var cls = window.IEStatusRuntime.getProfileStatusBadgeClass(status);
      var base = "px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center badge " + cls;
      return base;
    }
    return "px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center bg-gray-50 text-gray-700 border-gray-200";
  }

  function navigateToCandidates() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("candidates.html");
    } else {
      window.location.href = "candidates.html";
    }
  }

  function renderNotFound() {
    var root = getRoot();
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("section");
    card.className = "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";
    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Candidate not found";
    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested candidate could not be found or is not accessible.";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to candidates";
    button.addEventListener("click", function () {
      navigateToCandidates();
    });
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  async function loadCandidateCore(candidateId) {
    if (!window.IESupabase || !window.IESupabase.getCandidateById) {
      console.error("[Candidate] IESupabase.getCandidateById not available");
      return { candidate: null };
    }
    try {
      var result = await window.IESupabase.getCandidateById(candidateId);
      if (result.error) {
        console.error("[Candidate] getCandidateById error:", result.error);
        if (window.IESupabase.showError) {
          window.IESupabase.showError(
            result.error.message || "Error loading candidate.",
            "candidateProfile"
          );
        }
        return { candidate: null };
      }
      return { candidate: result.data || null };
    } catch (err) {
      console.error("[Candidate] getCandidateById exception:", err);
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Unexpected error while loading candidate.",
          "candidateProfile"
        );
      }
      return { candidate: null };
    }
  }

  function renderCandidateCore(candidate, candidateId, mode) {
    _currentCandidate = candidate || null;
    var first = safeString(candidate.first_name).trim();
    var last = safeString(candidate.last_name).trim();
    var fullName = first + (last ? " " + last : "");
    var candidateName =
      fullName ||
      (mode === "view" ? "First Name Last Name" : "Candidate");
    setField("full-name", candidateName);
    window.pageMeta = {
      title: candidateName,
      subtitle: "Candidate profile",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Candidates", entity: "candidates" },
        { label: candidateName }
      ]
    };
    if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
      window.IEPortal.mountPageHeader();
    }
    var rawPosition = safeString(candidate.position).trim();
    var displayPosition =
      rawPosition || (mode === "view" ? "Role / Position" : "");
    setField("position", displayPosition);
    setField("first_name", candidate.first_name || "");
    setField("last_name", candidate.last_name || "");
    // Email/phone shown in hero only; not duplicated in Candidate Information card
    setField("linkedin_url", candidate.linkedin_url || "");
    setField("address", candidate.address || "");
    setField("summary", candidate.summary || "");
    setField("email", candidate.email || "");
    setField("phone", candidate.phone || "");
    setField("source", candidate.source || "");
    // Internal notes (separate from activity log)
    setField("notes", candidate.notes || "");

    var dobText = candidate.date_of_birth ? formatDate(candidate.date_of_birth) : "";
    setField("date_of_birth", dobText || "");

    // Profile status: discreet ribbon in hero top-right (hidden when approved — no need to emphasize)
    var normalizedStatus =
      window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
        ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(candidate.status)
        : String(candidate.status || "").toLowerCase();
    var statusRibbonEl = document.querySelector("[data-field=\"status-ribbon\"]");
    var heroInner = document.querySelector(".candidate-hero-inner");
    if (statusRibbonEl) {
      if (normalizedStatus === "approved") {
        statusRibbonEl.hidden = true;
        if (heroInner) heroInner.classList.add("candidate-hero-inner--no-ribbon");
      } else {
        statusRibbonEl.hidden = false;
        if (heroInner) heroInner.classList.remove("candidate-hero-inner--no-ribbon");
        var profileStatusLabel =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
            ? window.IEStatusRuntime.formatProfileStatusLabel(candidate.status)
            : (candidate.status || "Pending Review").toString();
        statusRibbonEl.textContent = profileStatusLabel;
        var ribbonClass =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.getProfileStatusBadgeClass === "function"
            ? window.IEStatusRuntime.getProfileStatusBadgeClass(candidate.status)
            : "";
        statusRibbonEl.className =
          "candidate-hero-status-ribbon absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium border z-10 pointer-events-none " +
          (ribbonClass ? ribbonClass.replace(/rounded-full|text-xs|px-3|py-1/gi, "").trim() : "bg-gray-100/90 text-gray-600 border-gray-200/80");
      }
    }

    // Compact contact in hero: email (mailto), phone, optional source
    var heroEmailEl = document.querySelector("[data-hero-email]");
    var heroPhoneEl = document.querySelector("[data-hero-phone]");
    var heroEmailWrap = document.querySelector("[data-hero-email-wrap]");
    var heroPhoneWrap = document.querySelector("[data-hero-phone-wrap]");
    var heroSourceEl = document.querySelector("[data-hero-source]");
    var heroSourceWrap = document.querySelector("[data-hero-source-wrap]");
    if (heroEmailEl && heroEmailWrap) {
      var email = safeString(candidate.email).trim();
      if (email) {
        heroEmailEl.href = "mailto:" + email;
        heroEmailEl.textContent = email;
      } else {
        heroEmailEl.textContent = "No email provided";
        heroEmailEl.removeAttribute("href");
      }
      heroEmailWrap.style.display = "";
    }
    if (heroPhoneEl && heroPhoneWrap) {
      var phone = safeString(candidate.phone).trim();
      if (phone) {
        heroPhoneEl.textContent = phone;
      } else {
        heroPhoneEl.textContent = "No phone number";
      }
      heroPhoneWrap.style.display = "";
    }
    if (heroSourceEl && heroSourceWrap) {
      var source = safeString(candidate.source).trim();
      if (source) {
        heroSourceEl.textContent = source;
      } else {
        heroSourceEl.textContent = "Source not specified";
      }
      heroSourceWrap.style.display = "";
    }

    // Buttons
    var editBtn = document.querySelector('[data-action="edit-candidate"]');
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        var target;
        if (window.IEPortal && window.IEPortal.links && window.IEPortal.links.candidateEdit) {
          target = window.IEPortal.links.candidateEdit(candidateId);
        } else {
          target =
            "candidate.html?id=" + encodeURIComponent(candidateId) + "&mode=edit";
        }
        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(target);
        } else {
          window.location.href = target;
        }
      });
    }

    var backBtn = document.querySelector('[data-action="back-to-list"]');
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        navigateToCandidates();
      });
    }
  }

  function applyAvailabilityToHeader(availability) {
    var value = (availability || "available").toString().toLowerCase();
    var label =
      window.IEStatusRuntime && typeof window.IEStatusRuntime.formatAvailabilityLabel === "function"
        ? window.IEStatusRuntime.formatAvailabilityLabel(value)
        : (value === "working" ? "Working" : value === "in_process" ? "In process" : "Available");
    var dotEl = document.querySelector("[data-availability-dot]");
    var labelEl = document.querySelector("[data-availability-label]");
    var pillEl = document.querySelector("[data-availability-pill]");
    if (labelEl) labelEl.textContent = label;
    if (dotEl) {
      dotEl.className = "availability-dot w-2 h-2 rounded-full " +
        (value === "working"
          ? "bg-emerald-500"
          : value === "in_process"
          ? "bg-amber-500"
          : "bg-sky-500");
    }
    if (pillEl) {
      pillEl.className = "availability-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border " +
        (value === "working"
          ? "bg-emerald-50 text-emerald-800 border-emerald-100"
          : value === "in_process"
          ? "bg-amber-50 text-amber-800 border-amber-100"
          : "bg-sky-50 text-sky-800 border-sky-100");
    }
  }

  async function renderDocuments(candidate) {
    if (!candidate) return;
    var photoEl = document.querySelector("[data-doc-photo]");
    var photoEmptyEl = document.querySelector('[data-doc-empty="photo"]');
    var cvLinkEl = document.querySelector('[data-doc-link="cv"]');
    var cvEmptyEl = document.querySelector('[data-doc-empty="cv"]');

    // CV
    if (cvLinkEl && cvEmptyEl) {
      if (candidate.cv_url && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        try {
          var signedCv = await window.IESupabase.createSignedCandidateUrl(candidate.cv_url);
          if (signedCv) {
            cvLinkEl.href = signedCv;
            cvLinkEl.classList.remove("hidden");
            cvEmptyEl.style.display = "none";
          }
        } catch (err) {
          console.error("[Candidate] CV signed URL error:", err);
        }
      }
    }

    // Photo
    if (photoEl && photoEmptyEl) {
      var hasPhoto = !!candidate.photo_url;
      var fallbackName =
        (candidate.first_name || "") + " " + (candidate.last_name || "");
      if (hasPhoto && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        try {
          var signedPhoto = await window.IESupabase.createSignedCandidateUrl(
            candidate.photo_url
          );
          if (signedPhoto) {
            photoEl.src = signedPhoto;
            photoEmptyEl.style.display = "none";
          }
        } catch (err2) {
          console.error("[Candidate] Photo signed URL error:", err2);
        }
      } else if (fallbackName.trim()) {
        photoEl.src =
          "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(fallbackName.trim()) +
          "&background=1b4332&color=fff";
      }
    }
  }

  async function loadCandidateProfileSections(candidateId) {
    if (!window.IESupabase) return;
    var api = window.IESupabase;

    try {
      var results = await Promise.all([
        api.getCandidateSkills ? api.getCandidateSkills(candidateId) : { data: [] },
        api.getCandidateLanguages ? api.getCandidateLanguages(candidateId) : { data: [] },
        api.getCandidateCertifications
          ? api.getCandidateCertifications(candidateId)
          : { data: [] },
        api.getCandidateExperience
          ? api.getCandidateExperience(candidateId)
          : { data: [] },
        api.getCandidateEducation
          ? api.getCandidateEducation(candidateId)
          : { data: [] },
        api.getCandidateHobbies ? api.getCandidateHobbies(candidateId) : { data: [] },
      ]);

      var skills = (results[0] && results[0].data) || [];
      var languages = (results[1] && results[1].data) || [];
      var certs = (results[2] && results[2].data) || [];
      var experience = (results[3] && results[3].data) || [];
      var education = (results[4] && results[4].data) || [];
      var hobbies = (results[5] && results[5].data) || [];

      renderSimpleList("skills", skills, function (item) {
        return safeString(item.skill || "").trim();
      });

      renderSimpleList("languages", languages, function (item) {
        var name = safeString(item.language || "").trim();
        var level = safeString(item.level || "").trim();
        if (name && level) return name + " — " + level;
        return name || level;
      });

      renderSimpleList("certifications", certs, function (item) {
        var name = safeString(item.name || "").trim();
        var issuer = safeString(item.issuer || "").trim();
        var issueDate = item.issue_date ? formatDate(item.issue_date) : "";
        var expiryDate = item.expiry_date ? formatDate(item.expiry_date) : "";
        var parts = [];
        if (name) parts.push(name);
        if (issuer) parts.push(" — " + issuer);
        var dates = "";
        if (issueDate && expiryDate) {
          dates = issueDate + " → " + expiryDate;
        } else if (issueDate) {
          dates = issueDate;
        } else if (expiryDate) {
          dates = "until " + expiryDate;
        }
        if (dates) parts.push(" (" + dates + ")");
        return parts.join("");
      });

      renderExperience(experience);
      renderEducation(education);
      renderSimpleList("hobbies", hobbies, function (item) {
        return safeString(item.hobby || "").trim();
      });
    } catch (err) {
      console.error("[Candidate] loadCandidateProfileSections exception:", err);
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Impossibile caricare tutte le sezioni del profilo candidato.",
          "candidateProfileSections"
        );
      }
    }
  }

  function renderSimpleList(sectionName, items, formatter) {
    var listEl = document.querySelector('[data-list="' + sectionName + '"]');
    var emptyEl = document.querySelector('[data-empty="' + sectionName + '"]');
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var text = formatter(item);
      if (!text) return;
      var li = document.createElement("li");
      li.textContent = text;
      listEl.appendChild(li);
    });

    if (!listEl.children.length) {
      emptyEl.style.display = "";
    }
  }

  function renderExperience(items) {
    var container = document.querySelector('[data-list="experience"]');
    var emptyEl = document.querySelector('[data-empty="experience"]');
    if (!container || !emptyEl) return;
    container.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "border border-gray-100 rounded-2xl p-4 space-y-2";

      var titleRow = document.createElement("div");
      titleRow.className = "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var roleTitle = document.createElement("p");
      roleTitle.className = "font-semibold text-sm text-gray-900";
      roleTitle.textContent = safeString(item.title || "Role").trim();
      var company = document.createElement("p");
      company.className = "text-xs text-gray-500";
      company.textContent = safeString(item.company || "").trim();
      left.appendChild(roleTitle);
      if (company.textContent) {
        left.appendChild(company);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right space-y-1";
      var location = safeString(item.location || "").trim();
      if (location) {
        var locEl = document.createElement("p");
        locEl.textContent = location;
        right.appendChild(locEl);
      }
      var start = item.start_date ? formatMonth(item.start_date) : "";
      var end = item.end_date ? formatMonth(item.end_date) : "";
      if (start || end) {
        var datesEl = document.createElement("p");
        datesEl.textContent = start && end ? start + " → " + end : start || end;
        right.appendChild(datesEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      var desc = safeString(item.description || "").trim();
      if (desc) {
        var descEl = document.createElement("p");
        descEl.className = "text-xs text-gray-700 whitespace-pre-line";
        descEl.textContent = desc;
        card.appendChild(descEl);
      }

      container.appendChild(card);
    });

    if (!container.children.length) {
      emptyEl.style.display = "";
    }
  }

  function renderEducation(items) {
    var container = document.querySelector('[data-list="education"]');
    var emptyEl = document.querySelector('[data-empty="education"]');
    if (!container || !emptyEl) return;
    container.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "border border-gray-100 rounded-2xl p-4 space-y-2";

      var titleRow = document.createElement("div");
      titleRow.className = "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var institution = document.createElement("p");
      institution.className = "font-semibold text-sm text-gray-900";
      institution.textContent = safeString(item.institution || "Institution").trim();
      var degree = document.createElement("p");
      degree.className = "text-xs text-gray-500";
      var degreeParts = [];
      if (item.degree) degreeParts.push(safeString(item.degree).trim());
      if (item.field_of_study) {
        degreeParts.push(safeString(item.field_of_study).trim());
      }
      degree.textContent = degreeParts.join(" • ");
      left.appendChild(institution);
      if (degree.textContent) {
        left.appendChild(degree);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right";
      var startYear = item.start_year ? formatYear(item.start_year) : "";
      var endYear = item.end_year ? formatYear(item.end_year) : "";
      if (startYear || endYear) {
        var yearsEl = document.createElement("p");
        yearsEl.textContent =
          startYear && endYear ? startYear + " → " + endYear : startYear || endYear;
        right.appendChild(yearsEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      container.appendChild(card);
    });

    if (!container.children.length) {
      emptyEl.style.display = "";
    }
  }

  /**
   * Show or hide the pending-review visual cue based on normalized profile status.
   * Cue is shown only when status is pending_review; hidden for approved, rejected, or legacy archived.
   */
  function setPendingReviewCueVisibility(normalizedStatus) {
    var cueEl = document.getElementById("candidatePendingReviewCue");
    if (!cueEl) return;
    var isPending =
      normalizedStatus != null &&
      String(normalizedStatus).toLowerCase() === "pending_review";
    if (isPending) {
      cueEl.classList.remove("hidden");
    } else {
      cueEl.classList.add("hidden");
    }
  }

  /**
   * Returns which profile-status actions to show. Approve/Reject only when pending_review (initial review).
   * Once approved or rejected, no quick-action buttons; changes via Edit. No profile-status "Archive" (use toolbar is_archived).
   * @param {string} normalizedStatus - one of pending_review, approved, rejected (legacy: archived)
   * @returns {{ approve: boolean, reject: boolean }}
   */
  function getProfileStatusActionsForStatus(normalizedStatus) {
    switch (normalizedStatus) {
      case "pending_review":
        return { approve: true, reject: true };
      case "archived":
        // Legacy: allow Approve/Reject so recruiter can fix without going to Edit
        return { approve: true, reject: true };
      case "approved":
      case "rejected":
      default:
        return { approve: false, reject: false };
    }
  }

  /**
   * Renders Approve / Reject Candidate buttons only when profile status is pending_review (initial review).
   * Updates candidates.status only; does not touch application pipeline or is_archived. No Archive button (use toolbar).
   */
  function renderProfileStatusActions(candidateId, currentStatus, onStatusUpdated) {
    var container = document.getElementById("candidateProfileStatusActions");
    if (!container) return;

    container.innerHTML = "";
    var normalized =
      window.IEStatusRuntime &&
      typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
        ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(currentStatus)
        : (currentStatus || "pending_review").toString().toLowerCase();
    var actions = getProfileStatusActionsForStatus(normalized);
    if (!actions.approve && !actions.reject) return;

    function makeButton(label, newStatus, btnClass) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = btnClass || "ie-btn ie-btn-secondary";
      btn.textContent = label;
      return btn;
    }

    function runUpdate(newStatus, label) {
      if (
        !window.IESupabase ||
        typeof window.IESupabase.updateCandidateProfileStatus !== "function"
      ) {
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError(
            "Profile status update is not available.",
            "candidateProfileStatus"
          );
        }
        return Promise.resolve(null);
      }
      return window.IESupabase
        .updateCandidateProfileStatus(candidateId, newStatus)
        .then(function (result) {
          if (result && result.error) {
            if (
              window.IESupabase &&
              typeof window.IESupabase.showError === "function"
            ) {
              window.IESupabase.showError(
                result.error.message || "Failed to update profile status.",
                "candidateProfileStatus"
              );
            }
            return null;
          }
          if (
            window.IESupabase &&
            typeof window.IESupabase.createAutoLog === "function"
          ) {
            window.IESupabase
              .createAutoLog("candidate", candidateId, {
                event_type: "system_event",
                message: "Profile status set to " + label,
                metadata: null,
              })
              .catch(function () {});
          }
          if (typeof onStatusUpdated === "function") {
            onStatusUpdated(newStatus);
          }
          return result;
        });
    }

    if (actions.approve) {
      var approveBtn = makeButton(
        "Approve Candidate",
        "approved",
        "ie-btn ie-btn-primary"
      );
      approveBtn.addEventListener("click", function () {
        approveBtn.disabled = true;
        runUpdate("approved", "Approved").finally(function () {
          approveBtn.disabled = false;
        });
      });
      container.appendChild(approveBtn);
    }
    if (actions.reject) {
      var rejectBtn = makeButton(
        "Reject Candidate",
        "rejected",
        "ie-btn ie-btn-danger"
      );
      rejectBtn.addEventListener("click", function () {
        rejectBtn.disabled = true;
        runUpdate("rejected", "Rejected").finally(function () {
          rejectBtn.disabled = false;
        });
      });
      container.appendChild(rejectBtn);
    }
  }

  function setDerivedAvailabilityFromAssociations(applications) {
    var state = "available";
    if (window.IEPortal && typeof window.IEPortal.computeDerivedAvailability === "function") {
      state = window.IEPortal.computeDerivedAvailability(applications);
    }
    applyAvailabilityToHeader(state);
  }

  function wireAddApplicationButton(candidateId) {
    try {
      console.log("[AddApplicationDebug] Attempting to wire Add Application button", {
        candidateId: candidateId,
      });

      var addAppBtn = document.querySelector('[data-action="add-application"]');
      if (!addAppBtn) {
        console.log(
          "[AddApplicationDebug] Add Application button not found in DOM"
        );
        return;
      }

      if (addAppBtn._ieBound) {
        console.log(
          "[AddApplicationDebug] Add Application button already wired; skipping",
          { candidateId: candidateId }
        );
        return;
      }

      addAppBtn._ieBound = true;

      addAppBtn.addEventListener("click", function () {
        console.log("[AddApplicationDebug] Click handler invoked", {
          candidateId: candidateId,
        });

        if (
          !window.IEPortal ||
          !window.IEPortal.ui ||
          typeof window.IEPortal.ui.openModal !== "function"
        ) {
          console.warn(
            "[AddApplicationDebug] IEPortal.ui.openModal not available",
            {
              hasIEPortal: !!window.IEPortal,
              hasUi: !!(window.IEPortal && window.IEPortal.ui),
            }
          );
          return;
        }

        window.IEPortal.ui.openModal({
          title: "Add Application",
          render: function (bodyEl) {
            console.log(
              "[AddApplicationDebug] Rendering Add Application modal content",
              { candidateId: candidateId }
            );

            var container = document.createElement("div");
            container.className = "space-y-4";

            var help = document.createElement("p");
            help.className = "text-sm text-gray-600";
            help.textContent =
              "Select a job offer to create a new application for this candidate.";
            container.appendChild(help);

            var selectWrapper = document.createElement("div");
            selectWrapper.className = "space-y-2";
            var label = document.createElement("label");
            label.className = "form-label";
            label.textContent = "Job Offer";
            selectWrapper.appendChild(label);

            var select = document.createElement("select");
            select.className = "form-input";
            select.innerHTML =
              '<option value="">Select a job offer...</option>';
            selectWrapper.appendChild(select);
            container.appendChild(selectWrapper);

            var errorEl = document.createElement("p");
            errorEl.className = "text-sm text-red-600 hidden";
            container.appendChild(errorEl);

            var actions = document.createElement("div");
            actions.className = "flex justify-end gap-2 pt-4";
            var cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "ie-btn ie-btn-secondary";
            cancelBtn.textContent = "Cancel";
            cancelBtn.addEventListener("click", function () {
              console.log(
                "[AddApplicationDebug] Cancel clicked, closing modal",
                { candidateId: candidateId }
              );
              if (
                window.IEPortal &&
                window.IEPortal.ui &&
                typeof window.IEPortal.ui.closeModal === "function"
              ) {
                window.IEPortal.ui.closeModal();
              }
            });
            var createBtn = document.createElement("button");
            createBtn.type = "button";
            createBtn.className = "ie-btn ie-btn-primary";
            createBtn.textContent = "Create Application";
            actions.appendChild(cancelBtn);
            actions.appendChild(createBtn);
            container.appendChild(actions);

            bodyEl.appendChild(container);

            // Load active offers into the select
            (async function loadOffers() {
              console.log(
                "[AddApplicationDebug] Loading active job offers for modal",
                { candidateId: candidateId }
              );
              try {
                if (
                  window.IESupabase &&
                  typeof window.IESupabase
                    .searchActiveJobOffersForAssociation === "function"
                ) {
                  var res =
                    await window.IESupabase.searchActiveJobOffersForAssociation(
                      { term: "", limit: 50 }
                    );
                  if (!res.error && Array.isArray(res.data)) {
                    res.data.forEach(function (offer) {
                      var opt = document.createElement("option");
                      opt.value = offer.id;
                      opt.textContent =
                        offer.title ||
                        offer.position ||
                        "Offer " + String(offer.id);
                      select.appendChild(opt);
                    });
                    console.log(
                      "[AddApplicationDebug] Loaded job offers into select",
                      {
                        candidateId: candidateId,
                        count: res.data.length,
                      }
                    );
                  } else {
                    console.warn(
                      "[AddApplicationDebug] No offers loaded or error from searchActiveJobOffersForAssociation",
                      {
                        candidateId: candidateId,
                        error: res && res.error,
                      }
                    );
                  }
                } else {
                  console.warn(
                    "[AddApplicationDebug] searchActiveJobOffersForAssociation not available",
                    { candidateId: candidateId }
                  );
                }
              } catch (err) {
                console.error(
                  "[AddApplicationDebug] loadOffers exception",
                  err
                );
              }
            })();

            createBtn.addEventListener("click", async function () {
              if (!candidateId) {
                console.error(
                  "[AddApplicationDebug] Missing candidateId on create click"
                );
                return;
              }
              var jobOfferId = select.value || "";
              console.log(
                "[AddApplicationDebug] Create Application clicked",
                {
                  candidateId: candidateId,
                  jobOfferId: jobOfferId || null,
                }
              );
              if (!jobOfferId) {
                errorEl.textContent = "Please select a job offer.";
                errorEl.classList.remove("hidden");
                return;
              }
              createBtn.disabled = true;
              errorEl.classList.add("hidden");
              try {
                var associationResult = null;

                // Prefer the core Supabase facade if available
                if (
                  window.IESupabase &&
                  typeof window.IESupabase.linkCandidateToJob === "function"
                ) {
                  console.log(
                    "[AddApplicationDebug] Creating association via IESupabase.linkCandidateToJob",
                    {
                      candidateId: candidateId,
                      jobOfferId: jobOfferId,
                    }
                  );
                  associationResult =
                    await window.IESupabase.linkCandidateToJob({
                      candidate_id: candidateId,
                      job_offer_id: jobOfferId,
                    });
                } else if (
                  window.IEQueries &&
                  window.IEQueries.applications &&
                  typeof window.IEQueries.applications
                    .createApplication === "function"
                ) {
                  console.log(
                    "[AddApplicationDebug] Creating association via IEQueries.applications.createApplication",
                    {
                      candidateId: candidateId,
                      jobOfferId: jobOfferId,
                    }
                  );
                  associationResult =
                    await window.IEQueries.applications.createApplication(
                      candidateId,
                      jobOfferId,
                      {}
                    );
                } else {
                  throw new Error(
                    "Application creation API not available"
                  );
                }

                if (associationResult && associationResult.error) {
                  var apiError = associationResult.error;
                  var msg =
                    apiError.code === "DUPLICATE_APPLICATION"
                      ? "This candidate already has an application for this job offer."
                      : apiError.message || "Error creating application.";
                  console.warn(
                    "[AddApplicationDebug] Application creation returned error",
                    {
                      candidateId: candidateId,
                      jobOfferId: jobOfferId,
                      error: apiError,
                    }
                  );
                  errorEl.textContent = msg;
                  errorEl.classList.remove("hidden");
                  createBtn.disabled = false;
                  return;
                }

                console.log(
                  "[AddApplicationDebug] Application created successfully",
                  {
                    candidateId: candidateId,
                    jobOfferId: jobOfferId,
                    result: associationResult,
                  }
                );

                if (
                  window.IEPortal &&
                  window.IEPortal.ui &&
                  typeof window.IEPortal.ui.closeModal === "function"
                ) {
                  window.IEPortal.ui.closeModal();
                }

                // Reload offers section and availability
                await renderAssociatedOffers(candidateId);

                // Recompute availability from fresh applications
                try {
                  if (
                    window.IEQueries &&
                    window.IEQueries.applications &&
                    typeof window.IEQueries.applications
                      .getApplicationsByCandidate === "function" &&
                    window.IEQueries.candidates &&
                    typeof window.IEQueries.candidates
                      .deriveAvailabilityFromApplications === "function"
                  ) {
                    console.log(
                      "[AddApplicationDebug] Refreshing availability after application creation",
                      { candidateId: candidateId }
                    );
                    var apps =
                      await window.IEQueries.applications.getApplicationsByCandidate(
                        candidateId
                      );
                    if (!apps.error && Array.isArray(apps.data)) {
                      var availability =
                        window.IEQueries.candidates.deriveAvailabilityFromApplications(
                          apps.data
                        );
                      applyAvailabilityToHeader(availability);
                    }
                  }
                } catch (e2) {
                  console.error(
                    "[AddApplicationDebug] Availability refresh error after application creation",
                    e2
                  );
                }
              } catch (err) {
                console.error(
                  "[AddApplicationDebug] createApplication exception from modal",
                  err
                );
                errorEl.textContent =
                  "Error creating application. Please try again.";
                errorEl.classList.remove("hidden");
                createBtn.disabled = false;
              }
            });
          },
        });
      });
    } catch (err) {
      console.error(
        "[AddApplicationDebug] Add Application button wiring error:",
        err
      );
    }
  }

  async function renderAssociatedOffers(candidateId) {
    var listEl = document.querySelector('[data-list="associated-offers"]');
    var emptyEl = document.querySelector('[data-empty="associated-offers"]');
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";

    if (!window.IESupabase || !window.IESupabase.fetchJobHistoryForCandidate) {
      emptyEl.style.display = "";
      setDerivedAvailabilityFromAssociations([]);
      return;
    }

    try {
      var result = await window.IESupabase.fetchJobHistoryForCandidate(candidateId);
      if (result.error) {
        console.error("[Candidate] fetchJobHistoryForCandidate error:", result.error);
        emptyEl.style.display = "";
        setDerivedAvailabilityFromAssociations([]);
        return;
      }
      var rows = (result.data || []).slice();
      if (!rows.length) {
        emptyEl.style.display = "";
        setDerivedAvailabilityFromAssociations([]);
        return;
      }
      emptyEl.style.display = "none";

      var applications = rows.map(function (row) {
        var assoc = row.association || row;
        return { status: assoc && assoc.status ? assoc.status : null };
      });
      setDerivedAvailabilityFromAssociations(applications);

      rows.forEach(function (row) {
        var assoc = row.association || row; // fallback if already flat
        var offer = row.job_offer || null;

        var tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/70 cursor-pointer";
        tr.dataset.associationId = assoc && assoc.id ? String(assoc.id) : "";

        var tdOffer = document.createElement("td");
        tdOffer.className = "px-4 py-2 align-top";
        var title = safeString(offer && offer.title ? offer.title : "").trim();
        var position = safeString(offer && offer.position ? offer.position : "").trim();
        var label = title || position || "—";

        if (offer && offer.id) {
          var href;
          if (
            window.IEPortal &&
            window.IEPortal.links &&
            window.IEPortal.links.offerView
          ) {
            href = window.IEPortal.links.offerView(offer.id);
          } else {
            href =
              "job-offer.html?id=" + encodeURIComponent(offer.id) + "&mode=view";
          }

          var a = document.createElement("a");
          a.href = href;
          a.className = "text-[#1b4332] font-semibold hover:underline";
          a.textContent = label;

          a.addEventListener("click", function (e) {
            if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
              e.preventDefault();
              window.IERouter.navigateTo(href);
            }
          });

          tdOffer.appendChild(a);
        } else {
          tdOffer.textContent = label;
        }

        var tdClient = document.createElement("td");
        tdClient.className = "px-4 py-2 align-top text-gray-700";
        tdClient.textContent =
          safeString(offer && offer.client_name ? offer.client_name : "").trim() || "—";

        var tdStatus = document.createElement("td");
        tdStatus.className = "px-4 py-2 align-top";
        var rawStatus = (assoc && assoc.status) || (offer && offer.status) || "";
        var badge = document.createElement("span");
        if (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function") {
          var normalized = window.IEStatusRuntime.normalizeApplicationStatusForDisplay(rawStatus || "applied");
          badge.className = "badge " + window.IEStatusRuntime.getApplicationStatusBadgeClass(normalized);
          badge.textContent = window.IEStatusRuntime.formatApplicationStatusLabel(normalized);
        } else if (window.IEPortal && typeof window.IEPortal.getApplicationStatusBadgeClass === "function") {
          var normalized = window.IEPortal.normalizeApplicationStatusForDisplay(rawStatus || "applied");
          badge.className = "badge " + window.IEPortal.getApplicationStatusBadgeClass(normalized);
          badge.textContent = window.IEPortal.formatApplicationStatusLabel(normalized);
        } else {
          badge.className = "badge badge-applied";
          badge.textContent = rawStatus || "Applied";
        }
        tdStatus.appendChild(badge);

        var tdDate = document.createElement("td");
        tdDate.className = "px-4 py-2 align-top text-gray-700";
        var applied = assoc && assoc.created_at ? formatDate(assoc.created_at) : "";
        tdDate.textContent = applied || "—";

        tr.appendChild(tdOffer);
        tr.appendChild(tdClient);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);

        tr.addEventListener("click", function (event) {
          var target = event.target;
          if (target.closest("a, button")) {
            return;
          }
          var id = tr.dataset.associationId;
          if (!id) return;
          var href;
          if (
            window.IEPortal &&
            window.IEPortal.links &&
            typeof window.IEPortal.links.applicationView === "function"
          ) {
            href = window.IEPortal.links.applicationView(id);
          } else {
            href = "application.html?id=" + encodeURIComponent(id);
          }
          if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
            window.IERouter.navigateTo(href);
          } else {
            window.location.href = href;
          }
        });

        listEl.appendChild(tr);
      });
    } catch (err) {
      console.error("[Candidate] renderAssociatedOffers exception:", err);
      emptyEl.style.display = "";
    }
  }

  async function loadCandidatePage(candidateId, mode) {
    var effectiveMode = mode || "view";
    var core = await loadCandidateCore(candidateId);
    var candidate = core.candidate;
    if (!candidate) {
      renderNotFound();
      return;
    }

    _currentCandidate = candidate;

    renderCandidateCore(candidate, candidateId, effectiveMode);

    applyModeToProfileFields(effectiveMode);
    applyHeroContactMode(effectiveMode);
    applyActivityVisibility(effectiveMode);
    applyDocumentsMode(effectiveMode, candidate);
    applyJsonImportVisibility(effectiveMode);

    try {
      if (
        effectiveMode === "edit" &&
        window.IECandidateProfileRuntime &&
        typeof window.IECandidateProfileRuntime.initCandidateProfileSections ===
          "function"
      ) {
        var profileRoot = document.getElementById("candidateInlineProfileForm");
        if (profileRoot) {
          window.IECandidateProfileRuntime.initCandidateProfileSections(
            profileRoot,
            "edit",
            candidate
          );
        }
        applyInlineProfileEditVisibility("edit");
      } else {
        applyInlineProfileEditVisibility("view");
      }
    } catch (profileInitErr) {
      console.error(
        "[Candidate] initCandidateProfileSections error from inline edit:",
        profileInitErr
      );
    }

    // Load applications for availability and associated offers
    var applicationsForAvailability = [];
    try {
      if (
        window.IEQueries &&
        window.IEQueries.applications &&
        typeof window.IEQueries.applications.getApplicationsByCandidate === "function"
      ) {
        var appsResult =
          await window.IEQueries.applications.getApplicationsByCandidate(candidateId);
        if (!appsResult.error && Array.isArray(appsResult.data)) {
          applicationsForAvailability = appsResult.data;
        }
      }
    } catch (err) {
      console.error("[Candidate] getApplicationsByCandidate exception:", err);
    }

    try {
      if (
        window.IEQueries &&
        window.IEQueries.candidates &&
        typeof window.IEQueries.candidates.deriveAvailabilityFromApplications ===
          "function"
      ) {
        var availability =
          window.IEQueries.candidates.deriveAvailabilityFromApplications(
            applicationsForAvailability
          );
        applyAvailabilityToHeader(availability);
      } else {
        applyAvailabilityToHeader("available");
      }
    } catch (err2) {
      console.error("[Candidate] availability derivation exception:", err2);
      applyAvailabilityToHeader("available");
    }

    // Lifecycle toolbar wiring for candidate profile
    try {
      var lifecycleStatus = candidate && candidate.is_archived ? "archived" : "active";

      function onEdit() {
        var target;
        if (
          window.IEPortal &&
          window.IEPortal.links &&
          typeof window.IEPortal.links.candidateEdit === "function"
        ) {
          target = window.IEPortal.links.candidateEdit(candidateId);
        } else {
          target =
            "candidate.html?id=" + encodeURIComponent(candidateId) + "&mode=edit";
        }
        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(target);
        } else {
          window.location.href = target;
        }
      }

      async function onArchive() {
        if (!window.IESupabase || !window.IESupabase.archiveCandidate) return;
        var res = await window.IESupabase.archiveCandidate(candidateId);
        if (!res || res.error) return;

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function"
        ) {
          window.IESupabase
            .createAutoLog("candidate", candidateId, {
              event_type: "system_event",
              message: "Candidate archived",
              metadata: null,
            })
            .catch(function () {});
        }

        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo("candidates.html");
        } else {
          window.location.href = "candidates.html";
        }
      }

      async function onReopen() {
        if (!window.IESupabase || !window.IESupabase.unarchiveCandidate) return;
        var res = await window.IESupabase.unarchiveCandidate(candidateId);
        if (!res || res.error) return;

        candidate.is_archived = false;

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function"
        ) {
          window.IESupabase
            .createAutoLog("candidate", candidateId, {
              event_type: "system_event",
              message: "Candidate restored",
              metadata: null,
            })
            .catch(function () {});
        }

        if (typeof renderEntityToolbar === "function") {
          renderEntityToolbar({
            entityType: "candidate",
            entityId: candidateId,
            status: "active",
            mode: effectiveMode,
            containerId: "candidateActions",
            onEdit: onEdit,
            onArchive: onArchive,
            onReopen: onReopen,
            onSave: effectiveMode === "edit" ? saveInlineProfileEdits : undefined,
          });
        }
      }

      if (typeof renderEntityToolbar === "function") {
        renderEntityToolbar({
          entityType: "candidate",
          entityId: candidateId,
          status: lifecycleStatus,
          mode: effectiveMode,
          containerId: "candidateActions",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
          onSave: effectiveMode === "edit" ? saveInlineProfileEdits : undefined,
        });
      }

      // Profile status actions (Approve / Reject / Archive) — update candidates.status only
      var currentProfileStatus = candidate.status || "pending_review";
      var normalizedProfileStatus =
        window.IEStatusRuntime &&
        typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
          ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(currentProfileStatus)
          : String(currentProfileStatus).toLowerCase();
      setPendingReviewCueVisibility(normalizedProfileStatus);

      function onProfileStatusUpdated(newStatus) {
        currentProfileStatus = newStatus;
        var normalizedNew =
          window.IEStatusRuntime &&
          typeof window.IEStatusRuntime.normalizeProfileStatusFromLegacy === "function"
            ? window.IEStatusRuntime.normalizeProfileStatusFromLegacy(newStatus)
            : String(newStatus).toLowerCase();
        setPendingReviewCueVisibility(normalizedNew);
        // Update hero status ribbon and inner padding (hidden when approved — no reserved space)
        var statusRibbonEl = document.querySelector("[data-field=\"status-ribbon\"]");
        var heroInner = document.querySelector(".candidate-hero-inner");
        if (statusRibbonEl) {
          if (normalizedNew === "approved") {
            statusRibbonEl.hidden = true;
            if (heroInner) heroInner.classList.add("candidate-hero-inner--no-ribbon");
          } else {
            statusRibbonEl.hidden = false;
            if (heroInner) heroInner.classList.remove("candidate-hero-inner--no-ribbon");
            var profileStatusLabel =
              window.IEStatusRuntime &&
              typeof window.IEStatusRuntime.formatProfileStatusLabel === "function"
                ? window.IEStatusRuntime.formatProfileStatusLabel(newStatus)
                : String(newStatus);
            statusRibbonEl.textContent = profileStatusLabel;
            var ribbonClass =
              window.IEStatusRuntime && typeof window.IEStatusRuntime.getProfileStatusBadgeClass === "function"
                ? window.IEStatusRuntime.getProfileStatusBadgeClass(newStatus)
                : "";
            statusRibbonEl.className =
              "candidate-hero-status-ribbon absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium border z-10 pointer-events-none " +
              (ribbonClass ? ribbonClass.replace(/rounded-full|text-xs|px-3|py-1/gi, "").trim() : "bg-gray-100/90 text-gray-600 border-gray-200/80");
          }
        }
        renderProfileStatusActions(candidateId, newStatus, onProfileStatusUpdated);
      }
      renderProfileStatusActions(candidateId, currentProfileStatus, onProfileStatusUpdated);
    } catch (err) {
      console.error("[Candidate] renderEntityToolbar error:", err);
    }

    await Promise.all([
      loadCandidateProfileSections(candidateId),
      renderAssociatedOffers(candidateId),
      renderDocuments(candidate),
    ]);

    try {
      if (
        effectiveMode === "edit" &&
        window.IECandidateImportRuntime &&
        typeof window.IECandidateImportRuntime.initCandidateJsonImport ===
          "function"
      ) {
        var profileRoot = document.getElementById("candidateInlineProfileForm");
        if (profileRoot) {
          window.IECandidateImportRuntime.initCandidateJsonImport(
            profileRoot,
            { allowExistingCandidate: true }
          );
        }
      }
    } catch (jsonErr) {
      console.error(
        "[Candidate] initCandidateJsonImport error on candidate.html:",
        jsonErr
      );
    }

    try {
      var activityContainer = document.getElementById("activity-container");
      if (
        effectiveMode === "view" &&
        activityContainer &&
        window.ActivitySection &&
        typeof window.ActivitySection.init === "function"
      ) {
        window.ActivitySection.init({
          entityType: "candidate",
          entityId: candidateId,
          container: activityContainer,
        });
      }
    } catch (err3) {
      console.error("[Candidate] ActivitySection init error:", err3);
    }
  }

  async function initCandidateProfilePage() {
    var state = getCandidatePageParamsSafe();
    var candidateId = state.id;
    var mode = state.mode || "view";

    if (!candidateId) {
      navigateToCandidates();
      return;
    }

    if (!window.IESupabase) {
      console.error("[Candidate] window.IESupabase not available");
      if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
        window.IEAuth.redirectToLogin();
      } else if (
        window.IESupabase &&
        typeof window.IESupabase.redirectToLogin === "function"
      ) {
        window.IESupabase.redirectToLogin();
      }
      return;
    }

    // Require authentication before loading any data
    if (typeof window.IESupabase.requireAuth === "function") {
      var user = await window.IESupabase.requireAuth();
      if (!user) {
        // requireAuth handles redirect
        return;
      }
    } else if (window.IESupabase.supabase && window.IESupabase.supabase.auth) {
      try {
        var sessionResult = await window.IESupabase.supabase.auth.getSession();
        if (!sessionResult || !sessionResult.data || !sessionResult.data.session) {
          if (typeof window.IESupabase.redirectToLogin === "function") {
            window.IESupabase.redirectToLogin();
          } else if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
            window.IEAuth.redirectToLogin();
          }
          return;
        }
      } catch (err) {
        console.error("[Candidate] auth guard exception:", err);
        if (typeof window.IESupabase.redirectToLogin === "function") {
          window.IESupabase.redirectToLogin();
        } else if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
          window.IEAuth.redirectToLogin();
        }
        return;
      }
    }

    await loadCandidatePage(candidateId, mode);

    wireAddApplicationButton(candidateId);

    // Reveal the page once data loading has at least been attempted.
    try {
      document.body.style.visibility = "visible";
    } catch (_) {}
  }

  // Expose candidate helpers for the Entity Page Shell and config.
  window.applyModeToProfileFields = applyModeToProfileFields;
  window.applyHeroContactMode = applyHeroContactMode;
  window.applyInlineProfileEditVisibility = applyInlineProfileEditVisibility;
  window.applyActivityVisibility = applyActivityVisibility;
  window.applyDocumentsMode = applyDocumentsMode;
  window.applyJsonImportVisibility = applyJsonImportVisibility;
  window.collectEditableFieldValues = collectEditableFieldValues;
  window.saveInlineProfileEdits = saveInlineProfileEdits;
  window.loadCandidateCore = loadCandidateCore;
  window.renderCandidateCore = renderCandidateCore;
  window.renderNotFound = renderNotFound;
  window.renderAssociatedOffers = renderAssociatedOffers;
  window.applyAvailabilityToHeader = applyAvailabilityToHeader;
  window.loadCandidateProfileSections = loadCandidateProfileSections;
  window.renderDocuments = renderDocuments;
  window.wireAddApplicationButton = wireAddApplicationButton;

  document.addEventListener("DOMContentLoaded", function () {
    if (
      window.EntityPageShell &&
      window.CandidateEntityConfig &&
      typeof window.EntityPageShell.init === "function"
    ) {
      Promise.resolve(
        window.EntityPageShell.init(window.CandidateEntityConfig)
      ).catch(function (err) {
        console.error("[Candidate] EntityPageShell.init exception:", err);
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    } else {
      initCandidateProfilePage().catch(function (err) {
        console.error("[Candidate] initCandidateProfilePage exception:", err);
        try {
          document.body.style.visibility = "visible";
        } catch (_) {}
      });
    }
  });
})();

