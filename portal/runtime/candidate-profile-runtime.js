// ============================================================================
// Italian Experience Recruitment Portal - Candidate Profile Runtime
// ----------------------------------------------------------------------------
// Candidate profile sections (contact, summary, repeatable sections) and
// Supabase child-table loaders/savers.
//
// Extracted from core/app-shell.js (behavior preserved).
// ============================================================================

(function () {
  "use strict";

  const PROFILE_SECTIONS = [
    "skills",
    "languages",
    "experience",
    "education",
    "certifications",
    "hobbies",
  ];

  function updateRepeatableEmptyState(sectionEl) {
    if (!sectionEl) return;
    var itemsContainer = sectionEl.querySelector("[data-items]");
    var emptyState = sectionEl.querySelector(".empty-state");
    if (!itemsContainer || !emptyState) return;
    var items = itemsContainer.children.length;
    if (items > 0) {
      emptyState.style.display = "none";
    } else {
      emptyState.style.display = "";
    }
  }

  function getRepeatableSectionConfig(sectionName) {
    switch (sectionName) {
      case "skills":
        return {
          templateId: "skillItemTemplate",
          addAction: "add-skill",
          removeAction: "remove-skill",
        };
      case "languages":
        return {
          templateId: "languageItemTemplate",
          addAction: "add-language",
          removeAction: "remove-language",
        };
      case "experience":
        return {
          templateId: "experienceItemTemplate",
          addAction: "add-experience",
          removeAction: "remove-experience",
        };
      case "education":
        return {
          templateId: "educationItemTemplate",
          addAction: "add-education",
          removeAction: "remove-education",
        };
      case "certifications":
        return {
          templateId: "certificationItemTemplate",
          addAction: "add-certification",
          removeAction: "remove-certification",
        };
      case "hobbies":
        return {
          templateId: "hobbyItemTemplate",
          addAction: "add-hobby",
          removeAction: "remove-hobby",
        };
      default:
        return null;
    }
  }

  function addRepeatableItem(sectionName, form, values) {
    if (!form) return null;
    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return null;

    var sectionEl = form.querySelector(
      '[data-repeatable-section="' + sectionName + '"]'
    );
    if (!sectionEl) return null;
    var itemsContainer = sectionEl.querySelector(
      '[data-items="' + sectionName + '"]'
    );
    if (!itemsContainer) return null;

    var template = document.getElementById(config.templateId);
    if (!template || !template.content || !template.content.firstElementChild)
      return null;

    var row = template.content.firstElementChild.cloneNode(true);
    row.setAttribute("data-item-section", sectionName);

    var fields = row.querySelectorAll("[data-field]");
    fields.forEach(function (el) {
      var key = el.getAttribute("data-field");
      if (!key) return;
      var value =
        values &&
        Object.prototype.hasOwnProperty.call(values, key) &&
        values[key] != null
          ? values[key]
          : "";
      if (value != null && typeof value !== "string") {
        value = String(value);
      }
      if ("value" in el) {
        el.value = value;
      }
    });

    var removeButtons = row.querySelectorAll(
      '[data-action="' + config.removeAction + '"]'
    );
    removeButtons.forEach(function (btn) {
      if (btn.dataset.ieBoundRemove === "true") return;
      btn.dataset.ieBoundRemove = "true";
      btn.addEventListener("click", function () {
        var container = btn.closest("[data-item-section]");
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
        updateRepeatableEmptyState(sectionEl);
      });
    });

    itemsContainer.appendChild(row);
    updateRepeatableEmptyState(sectionEl);
    return row;
  }

  function renderRepeatableSection(options) {
    if (!options) return;
    var sectionName = options.sectionName;
    var form = options.form;
    var mode = options.mode;
    var items = options.items || [];
    if (!sectionName || !form) return;

    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return;

    var sectionEl = form.querySelector(
      '[data-repeatable-section="' + sectionName + '"]'
    );
    if (!sectionEl) return;
    var itemsContainer = sectionEl.querySelector(
      '[data-items="' + sectionName + '"]'
    );
    if (!itemsContainer) return;

    var template = document.getElementById(config.templateId);
    if (!template || !template.content || !template.content.firstElementChild)
      return;

    while (itemsContainer.firstChild) {
      itemsContainer.removeChild(itemsContainer.firstChild);
    }

    var rows = Array.isArray(items) ? items : [];
    rows.forEach(function (item) {
      addRepeatableItem(sectionName, form, item);
    });

    updateRepeatableEmptyState(sectionEl);

    var addBtn = sectionEl.querySelector(
      '[data-action="' + config.addAction + '"]'
    );
    if (addBtn) {
      if (mode === "view") {
        addBtn.style.display = "none";
      } else {
        addBtn.style.display = "";
        if (addBtn.dataset.ieBoundAdd !== "true") {
          addBtn.dataset.ieBoundAdd = "true";
          addBtn.addEventListener("click", function () {
            addRepeatableItem(sectionName, form, null);
          });
        }
      }
    }

    if (mode === "view") {
      var removeButtons = sectionEl.querySelectorAll(
        '[data-action="' + config.removeAction + '"]'
      );
      removeButtons.forEach(function (btn) {
        btn.style.display = "none";
      });
    }
  }

  function collectRepeatableItems(form, sectionName) {
    if (!form) return [];
    var config = getRepeatableSectionConfig(sectionName);
    if (!config) return [];

    var sectionEl = form.querySelector(
      '[data-repeatable-section="' + sectionName + '"]'
    );
    if (!sectionEl) return [];
    var itemsContainer = sectionEl.querySelector(
      '[data-items="' + sectionName + '"]'
    );
    if (!itemsContainer) return [];

    var result = [];
    var children = itemsContainer.children;
    for (var i = 0; i < children.length; i++) {
      var row = children[i];
      var fields = row.querySelectorAll("[data-field]");
      var obj = {};
      var hasNonEmpty = false;

      fields.forEach(function (el) {
        var key = el.getAttribute("data-field");
        if (!key) return;
        var value = "";
        if ("value" in el && el.value != null) {
          value = el.value.toString().trim();
        }
        if (value !== "") {
          hasNonEmpty = true;
        }
        obj[key] = value;
      });

      if (hasNonEmpty) {
        result.push(obj);
      }
    }

    return result;
  }

  function collectCandidateProfileData(form) {
    function readField(name) {
      if (!form) return "";
      var el = form.querySelector('[name="' + name + '"]');
      if (!el || !("value" in el) || el.value == null) return "";
      return el.value.toString().trim();
    }

    var profile = {
      email: readField("email"),
      phone: readField("phone"),
      linkedin_url: readField("linkedin_url"),
      date_of_birth: readField("date_of_birth"),
      summary: readField("summary"),
    };

    PROFILE_SECTIONS.forEach(function (sectionName) {
      profile[sectionName] = collectRepeatableItems(form, sectionName);
    });

    return profile;
  }

  async function saveCandidateProfileChildren(candidateId, profile) {
    if (!candidateId) return { ok: true };
    if (typeof window === "undefined" || !window.IESupabase) return { ok: true };

    var api = window.IESupabase;
    var errorMessage = "Error saving candidate profile.";

    try {
      console.log("[CandidateSaveDebug] saveCandidateProfileChildren called", {
        candidateId: candidateId,
        profile: profile,
      });
    } catch (_) {}

    try {
      if (typeof api.replaceCandidateSkills === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateSkills input",
          {
            candidateId: candidateId,
            skills: (profile && profile.skills) || [],
          }
        );
        var skillsResult = await api.replaceCandidateSkills(
          candidateId,
          (profile && profile.skills) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateSkills result",
          {
            candidateId: candidateId,
            result: skillsResult,
          }
        );
        if (skillsResult && skillsResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateSkills error:",
            skillsResult.error
          );
          if (api.showError) api.showError(errorMessage, "replaceCandidateSkills");
          return { ok: false, error: skillsResult.error };
        }
      }

      if (typeof api.replaceCandidateLanguages === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateLanguages input",
          {
            candidateId: candidateId,
            languages: (profile && profile.languages) || [],
          }
        );
        var languagesResult = await api.replaceCandidateLanguages(
          candidateId,
          (profile && profile.languages) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateLanguages result",
          {
            candidateId: candidateId,
            result: languagesResult,
          }
        );
        if (languagesResult && languagesResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateLanguages error:",
            languagesResult.error
          );
          if (api.showError)
            api.showError(errorMessage, "replaceCandidateLanguages");
          return { ok: false, error: languagesResult.error };
        }
      }

      if (typeof api.replaceCandidateExperience === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateExperience input",
          {
            candidateId: candidateId,
            experience: (profile && profile.experience) || [],
          }
        );
        var experienceResult = await api.replaceCandidateExperience(
          candidateId,
          (profile && profile.experience) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateExperience result",
          {
            candidateId: candidateId,
            result: experienceResult,
          }
        );
        if (experienceResult && experienceResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateExperience error:",
            experienceResult.error
          );
          if (api.showError)
            api.showError(errorMessage, "replaceCandidateExperience");
          return { ok: false, error: experienceResult.error };
        }
      }

      if (typeof api.replaceCandidateEducation === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateEducation input",
          {
            candidateId: candidateId,
            education: (profile && profile.education) || [],
          }
        );
        var educationResult = await api.replaceCandidateEducation(
          candidateId,
          (profile && profile.education) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateEducation result",
          {
            candidateId: candidateId,
            result: educationResult,
          }
        );
        if (educationResult && educationResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateEducation error:",
            educationResult.error
          );
          if (api.showError)
            api.showError(errorMessage, "replaceCandidateEducation");
          return { ok: false, error: educationResult.error };
        }
      }

      if (typeof api.replaceCandidateCertifications === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateCertifications input",
          {
            candidateId: candidateId,
            certifications: (profile && profile.certifications) || [],
          }
        );
        var certificationsResult = await api.replaceCandidateCertifications(
          candidateId,
          (profile && profile.certifications) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateCertifications result",
          {
            candidateId: candidateId,
            result: certificationsResult,
          }
        );
        if (certificationsResult && certificationsResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateCertifications error:",
            certificationsResult.error
          );
          if (api.showError)
            api.showError(errorMessage, "replaceCandidateCertifications");
          return { ok: false, error: certificationsResult.error };
        }
      }

      if (typeof api.replaceCandidateHobbies === "function") {
        console.log(
          "[CandidateSaveDebug] replaceCandidateHobbies input",
          {
            candidateId: candidateId,
            hobbies: (profile && profile.hobbies) || [],
          }
        );
        var hobbiesResult = await api.replaceCandidateHobbies(
          candidateId,
          (profile && profile.hobbies) || []
        );
        console.log(
          "[CandidateSaveDebug] replaceCandidateHobbies result",
          {
            candidateId: candidateId,
            result: hobbiesResult,
          }
        );
        if (hobbiesResult && hobbiesResult.error) {
          console.error(
            "[ItalianExperience] replaceCandidateHobbies error:",
            hobbiesResult.error
          );
          if (api.showError) api.showError(errorMessage, "replaceCandidateHobbies");
          return { ok: false, error: hobbiesResult.error };
        }
      }
    } catch (err) {
      console.error(
        "[ItalianExperience] saveCandidateProfileChildren exception:",
        err
      );
      if (api.showError) api.showError(errorMessage, "saveCandidateProfileChildren");
      try {
        console.log(
          "[CandidateSaveDebug] saveCandidateProfileChildren exception result",
          {
            candidateId: candidateId,
            error: err,
          }
        );
      } catch (_) {}
      return { ok: false, error: err };
    }

    try {
      console.log("[CandidateSaveDebug] saveCandidateProfileChildren success", {
        candidateId: candidateId,
      });
    } catch (_) {}
    return { ok: true };
  }

  async function logCandidateProfileUpdated(candidateId) {
    if (
      !candidateId ||
      typeof window === "undefined" ||
      !window.IESupabase ||
      typeof window.IESupabase.createAutoLog !== "function"
    ) {
      return;
    }

    try {
      await window.IESupabase.createAutoLog("candidate", candidateId, {
        event_type: "system_event",
        message: "Candidate profile updated",
        metadata: null,
      });
    } catch (err) {
      // Logging failures should never block the UI.
      console.error("[ItalianExperience] logCandidateProfileUpdated error:", err);
    }
  }

  function initCandidateProfileSections(form, mode, candidate) {
    if (!form) return;

    // Single-value fields from main candidate row
    var emailEl = form.querySelector('[name="email"]');
    var phoneEl = form.querySelector('[name="phone"]');
    var linkedinEl = form.querySelector('[name="linkedin_url"]');
    var dobEl = form.querySelector('[name="date_of_birth"]');
    var summaryEl = form.querySelector('[name="summary"]');

    if (candidate) {
      if (emailEl) emailEl.value = (candidate.email || "").toString();
      if (phoneEl) phoneEl.value = (candidate.phone || "").toString();
      if (linkedinEl)
        linkedinEl.value = (candidate.linkedin_url || "").toString();
      if (dobEl) dobEl.value = candidate.date_of_birth || "";
      if (summaryEl) summaryEl.value = candidate.summary || "";
    }

    // Initialize repeatable sections with empty state and add handlers.
    PROFILE_SECTIONS.forEach(function (sectionName) {
      renderRepeatableSection({
        sectionName: sectionName,
        items: [],
        form: form,
        mode: mode,
      });
    });

    document.querySelectorAll("[data-repeatable-section]").forEach(function (
      section
    ) {
      updateRepeatableEmptyState(section);
    });

    if (
      mode === "create" ||
      !candidate ||
      !candidate.id ||
      typeof window === "undefined" ||
      !window.IESupabase
    ) {
      return;
    }

    var api = window.IESupabase;
    var candidateId = candidate.id;

    var skillsPromise =
      typeof api.getCandidateSkills === "function"
        ? api.getCandidateSkills(candidateId)
        : Promise.resolve({ data: [], error: null });
    var languagesPromise =
      typeof api.getCandidateLanguages === "function"
        ? api.getCandidateLanguages(candidateId)
        : Promise.resolve({ data: [], error: null });
    var experiencePromise =
      typeof api.getCandidateExperience === "function"
        ? api.getCandidateExperience(candidateId)
        : Promise.resolve({ data: [], error: null });
    var educationPromise =
      typeof api.getCandidateEducation === "function"
        ? api.getCandidateEducation(candidateId)
        : Promise.resolve({ data: [], error: null });
    var certificationsPromise =
      typeof api.getCandidateCertifications === "function"
        ? api.getCandidateCertifications(candidateId)
        : Promise.resolve({ data: [], error: null });
    var hobbiesPromise =
      typeof api.getCandidateHobbies === "function"
        ? api.getCandidateHobbies(candidateId)
        : Promise.resolve({ data: [], error: null });

    Promise.all([
      skillsPromise,
      languagesPromise,
      experiencePromise,
      educationPromise,
      certificationsPromise,
      hobbiesPromise,
    ])
      .then(function (results) {
        var sections = [
          "skills",
          "languages",
          "experience",
          "education",
          "certifications",
          "hobbies",
        ];
        results.forEach(function (result, index) {
          var sectionName = sections[index];
          if (result && result.error) {
            console.error(
              "[ItalianExperience] load candidate " + sectionName + " error:",
              result.error
            );
            if (api.showError) {
              api.showError(
                "Unable to load candidate profile section.",
                "loadCandidate" +
                  sectionName.charAt(0).toUpperCase() +
                  sectionName.slice(1)
              );
            }
            return;
          }
          var items = (result && result.data) || [];
          renderRepeatableSection({
            sectionName: sectionName,
            items: items,
            form: form,
            mode: mode,
          });
        });
      })
      .catch(function (err) {
        console.error(
          "[ItalianExperience] load candidate profile sections error:",
          err
        );
      });
  }

  function initCandidateProfile(form, mode, candidate) {
    if (arguments.length === 0) {
      var inferredForm = document.querySelector("#candidateForm");
      if (!inferredForm) return;
      initCandidateProfileSections(inferredForm, "create", null);
      return;
    }
    initCandidateProfileSections(form, mode, candidate);
  }

  window.IECandidateProfileRuntime = {
    initCandidateProfile: initCandidateProfile,
    initCandidateProfileSections: initCandidateProfileSections,
    collectCandidateProfileData: collectCandidateProfileData,
    saveCandidateProfileChildren: saveCandidateProfileChildren,
    logCandidateProfileUpdated: logCandidateProfileUpdated,
    renderRepeatableSection: renderRepeatableSection,
    addRepeatableItem: addRepeatableItem,
  };

  // Compatibility: used by runtime/modals-runtime.js when a candidate form is
  // mounted inside a modal.
  if (typeof window.initCandidateProfileSections !== "function") {
    window.initCandidateProfileSections = initCandidateProfileSections;
  }
})();

