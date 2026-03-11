// ============================================================================
// Italian Experience Recruitment Portal - Candidate JSON Import Runtime
// ----------------------------------------------------------------------------
// Phase 1: Import CV Parser JSON into the Add Candidate form as a prefill layer.
// - No changes to Supabase schema or persistence flows.
// - Applies only to create mode (no candidate id in URL).
// ============================================================================

(function () {
  "use strict";

  function getRouterParamsSafe() {
    try {
      if (
        window.IERouter &&
        typeof window.IERouter.getCandidatePageParams === "function"
      ) {
        return window.IERouter.getCandidatePageParams() || {};
      }
    } catch (e) {}
    return {};
  }

  function showError(message) {
    if (window.IESupabase && typeof window.IESupabase.showError === "function") {
      window.IESupabase.showError(message, "candidateJsonImport");
    } else {
      window.alert(message);
    }
  }

  function showSuccess(message) {
    if (
      window.IESupabase &&
      typeof window.IESupabase.showSuccess === "function"
    ) {
      window.IESupabase.showSuccess(message);
    }
  }

  function validateParserPayload(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        ok: false,
        reason:
          "This JSON does not look like a parser output (expected an object).",
      };
    }

    var hasName = typeof raw.name === "string" && raw.name.trim() !== "";
    var hasEmail =
      typeof raw.email === "string" && raw.email.trim() !== "";
    var hasPhones =
      Array.isArray(raw.phones) &&
      raw.phones.some(function (p) {
        return typeof p === "string" && p.trim() !== "";
      });

    if (!hasName) {
      return {
        ok: false,
        reason:
          "This JSON does not look like a parser output (missing or empty `name`).",
      };
    }

    if (!hasEmail && !hasPhones) {
      return {
        ok: false,
        reason:
          "This JSON does not look like a parser output (missing `email` or `phones`).",
      };
    }

    return { ok: true };
  }

  function splitName(fullName) {
    if (typeof fullName !== "string") {
      return { first_name: "", last_name: "" };
    }
    var trimmed = fullName.trim();
    if (!trimmed) {
      return { first_name: "", last_name: "" };
    }
    var parts = trimmed.split(/\s+/);
    var first = parts.shift() || "";
    var last = parts.join(" ");
    return {
      first_name: first,
      last_name: last,
    };
  }

  function mapParserToFormModel(payload) {
    var nameParts = splitName(payload.name || "");

    function yearFromDate(date) {
      if (typeof date !== "string") return "";
      var m = date.match(/^\d{4}/);
      return m ? m[0] : "";
    }

    var phone = "";
    if (Array.isArray(payload.phones)) {
      for (var i = 0; i < payload.phones.length; i++) {
        var p = payload.phones[i];
        if (typeof p === "string" && p.trim() !== "") {
          phone = p.trim();
          break;
        }
      }
    }

    var notes = "";
    if (Array.isArray(payload.notes) && payload.notes.length > 0) {
      notes = payload.notes
        .filter(function (n) {
          return typeof n === "string" && n.trim() !== "";
        })
        .join("\n\n");
    }

    var core = {
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      position: typeof payload.role === "string" ? payload.role : "",
      email: typeof payload.email === "string" ? payload.email : "",
      phone: phone,
      address:
        typeof payload.location === "string" ? payload.location : "",
      linkedin_url:
        typeof payload.linkedin === "string" ? payload.linkedin : "",
      summary:
        typeof payload.summary === "string" ? payload.summary : "",
      notes: notes,
    };

    var repeatables = {
      skills: [],
      languages: [],
      hobbies: [],
      certifications: [],
      education: [],
      experience: [],
    };

    if (Array.isArray(payload.skills)) {
      repeatables.skills = payload.skills
        .filter(function (s) {
          return typeof s === "string" && s.trim() !== "";
        })
        .map(function (s) {
          return { skill: s };
        });
    }

    if (Array.isArray(payload.languages_items) && payload.languages_items.length) {
      repeatables.languages = payload.languages_items
        .filter(function (item) {
          return item && typeof item === "object";
        })
        .map(function (item) {
          var language =
            typeof item.language === "string" ? item.language.trim() : "";
          if (!language) {
            return null;
          }
          var proficiency =
            typeof item.level === "string" ? item.level.trim() : "";
          return {
            language: language,
            proficiency: proficiency,
          };
        })
        .filter(function (mapped) {
          return !!mapped;
        });

      if (
        typeof console !== "undefined" &&
        console.debug &&
        repeatables.languages.length
      ) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapped structured languages repeatables",
          repeatables.languages
        );
      }
    } else if (Array.isArray(payload.languages)) {
      repeatables.languages = payload.languages
        .filter(function (l) {
          return typeof l === "string" && l.trim() !== "";
        })
        .map(function (l) {
          return { language: l, proficiency: "" };
        });
    }

    if (Array.isArray(payload.hobbies_interests)) {
      repeatables.hobbies = payload.hobbies_interests
        .filter(function (h) {
          return typeof h === "string" && h.trim() !== "";
        })
        .map(function (h) {
          return { hobby: h };
        });
    }

    if (Array.isArray(payload.certifications_items) && payload.certifications_items.length > 0) {
      repeatables.certifications = payload.certifications_items
        .filter(function (item) {
          return item && typeof item === "object";
        })
        .map(function (item) {
          var name = typeof item.name === "string" ? item.name.trim() : "";
          if (!name) {
            return null;
          }
          var issuer =
            typeof item.issuer === "string" ? item.issuer.trim() : "";
          var issue_date =
            typeof item.issue_date === "string" ? item.issue_date.trim() : "";
          var expiry_date =
            typeof item.expiry_date === "string" ? item.expiry_date.trim() : "";
          return {
            name: name,
            issuer: issuer,
            issue_date: issue_date,
            expiry_date: expiry_date,
          };
        })
        .filter(function (mapped) {
          return !!mapped;
        });

      if (
        typeof console !== "undefined" &&
        console.debug &&
        repeatables.certifications.length
      ) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapped structured certifications repeatables",
          repeatables.certifications
        );
      }
    } else if (Array.isArray(payload.certifications) && payload.certifications.length > 0) {
      repeatables.certifications = payload.certifications
        .filter(function (c) {
          return typeof c === "string" && c.trim() !== "";
        })
        .map(function (c) {
          return {
            name: c,
            issuer: "",
            issue_date: "",
            expiry_date: "",
          };
        });
      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapped certifications repeatables",
          repeatables.certifications
        );
      }
    }

    if (Array.isArray(payload.experience)) {
      repeatables.experience = payload.experience
        .filter(function (item) {
          return item && typeof item === "object";
        })
        .map(function (item) {
          var title =
            typeof item.role === "string" ? item.role : "";
          var company =
            typeof item.company === "string" ? item.company : "";
          var location =
            typeof item.location === "string" ? item.location : "";

          var description = "";
          if (
            typeof item.description === "string" &&
            item.description.trim() !== ""
          ) {
            description = item.description;
          } else if (Array.isArray(item.bullets)) {
            description = item.bullets
              .filter(function (b) {
                return typeof b === "string" && b.trim() !== "";
              })
              .join("\n");
          }

          var start_date =
            typeof item.start_date === "string" ? item.start_date : "";
          var end_date =
            typeof item.end_date === "string" ? item.end_date : "";
          var current = !!item.current;

          return {
            title: title,
            company: company,
            location: location,
            start_date: start_date,
            end_date: end_date,
            current: current,
            description: description,
          };
        })
        .filter(function (mapped) {
          return (
            (mapped.title && mapped.title.trim() !== "") ||
            (mapped.company && mapped.company.trim() !== "") ||
            (mapped.location && mapped.location.trim() !== "") ||
            (mapped.description && mapped.description.trim() !== "")
          );
        });

      if (
        typeof console !== "undefined" &&
        console.debug &&
        repeatables.experience.length
      ) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapped experience repeatables",
          repeatables.experience
        );
      }
    }

    if (Array.isArray(payload.education)) {
      repeatables.education = payload.education
        .filter(function (item) {
          return item && typeof item === "object";
        })
        .map(function (item) {
          var institution =
            typeof item.institution === "string" ? item.institution : "";
          var degree = typeof item.degree === "string" ? item.degree : "";
          var fieldOfStudy =
            typeof item.field_of_study === "string" ? item.field_of_study : "";
          var startYear = yearFromDate(item.start_date);
          var endYear = yearFromDate(item.end_date);

          return {
            institution: institution,
            degree: degree,
            field_of_study: fieldOfStudy,
            start_year: startYear,
            end_year: endYear,
          };
        })
        .filter(function (mapped) {
          return (
            (mapped.institution && mapped.institution.trim() !== "") ||
            (mapped.degree && mapped.degree.trim() !== "") ||
            (mapped.field_of_study &&
              mapped.field_of_study.trim() !== "") ||
            (mapped.start_year && mapped.start_year.trim() !== "") ||
            (mapped.end_year && mapped.end_year.trim() !== "")
          );
        });

      if (
        typeof console !== "undefined" &&
        console.debug &&
        repeatables.education.length
      ) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapped education repeatables",
          repeatables.education
        );
      }
    }

    return {
      core: core,
      repeatables: repeatables,
    };
  }

  function applyCoreToForm(form, core) {
    if (!form || !core) return;

    function assignToNodes(selector, value) {
      var nodes = form.querySelectorAll(selector);
      if (!nodes || !nodes.length) return;
      if (typeof value !== "string") {
        value = value == null ? "" : String(value);
      }
      nodes.forEach(function (el) {
        if ("value" in el) {
          el.value = value;
        } else {
          el.textContent = value;
        }
      });
    }

    function assignIfPresent(name, value) {
      assignToNodes('[name="' + name + '"]', value);
      assignToNodes('[data-field="' + name + '"]', value);
    }

    assignIfPresent("first_name", core.first_name);
    assignIfPresent("last_name", core.last_name);
    assignIfPresent("address", core.address);
    assignIfPresent("position", core.position);
    assignIfPresent("email", core.email);
    assignIfPresent("phone", core.phone);
    assignIfPresent("linkedin_url", core.linkedin_url);
    assignIfPresent("summary", core.summary);
    assignIfPresent("notes", core.notes);
  }

  function applyRepeatablesToForm(form, repeatables) {
    if (!form || !repeatables) return;
    if (
      !window.IECandidateProfileRuntime ||
      typeof window.IECandidateProfileRuntime.renderRepeatableSection !==
        "function"
    ) {
      return;
    }

    function renderSection(sectionName, items) {
      window.IECandidateProfileRuntime.renderRepeatableSection({
        sectionName: sectionName,
        items: Array.isArray(items) ? items : [],
        form: form,
        mode: "edit",
      });
    }

    if ("skills" in repeatables) {
      renderSection("skills", repeatables.skills);
    }
    if ("languages" in repeatables) {
      renderSection("languages", repeatables.languages);
    }
    if ("hobbies" in repeatables) {
      renderSection("hobbies", repeatables.hobbies);
    }
    if ("certifications" in repeatables) {
      renderSection("certifications", repeatables.certifications);
    }
    if ("education" in repeatables) {
      renderSection("education", repeatables.education);
    }
    if ("experience" in repeatables) {
      renderSection("experience", repeatables.experience);
    }
  }

  function applyPrefillToForm(form, mapped) {
    if (!form || !mapped) return;
    if (typeof console !== "undefined" && console.debug) {
      console.debug(
        "[ItalianExperience] candidate-import-runtime: applyPrefillToForm",
        {
          hasCore: !!(mapped && mapped.core),
          hasRepeatables: !!(mapped && mapped.repeatables),
        }
      );
    }
    applyCoreToForm(form, mapped.core || {});
    applyRepeatablesToForm(form, mapped.repeatables || {});
  }

  // ---------------------------------------------------------------------------
  // Normalized payload mapping for JSON import (list modal MVP)
  // ---------------------------------------------------------------------------

  function mapParserToNormalizedPayload(payload) {
    // Reuse the existing, battle-tested mapping used for the add-candidate form.
    var formModel = mapParserToFormModel(payload || {});
    var core = formModel && formModel.core ? formModel.core : {};
    var repeatables =
      formModel && formModel.repeatables ? formModel.repeatables : {};

    var main = {
      first_name: core.first_name || "",
      last_name: core.last_name || "",
      position: core.position || "",
      address: core.address || "",
      status: "pending_review",
      source: typeof payload.source === "string" ? payload.source : "",
      notes: core.notes || "",
      email: core.email || "",
      phone: core.phone || "",
      linkedin_url: core.linkedin_url || "",
      date_of_birth:
        typeof payload.date_of_birth === "string"
          ? payload.date_of_birth
          : "",
      summary: core.summary || "",
    };

    var profileChildren = {
      skills: Array.isArray(repeatables.skills) ? repeatables.skills : [],
      languages: Array.isArray(repeatables.languages)
        ? repeatables.languages
        : [],
      hobbies: Array.isArray(repeatables.hobbies) ? repeatables.hobbies : [],
      certifications: Array.isArray(repeatables.certifications)
        ? repeatables.certifications
        : [],
      experience: Array.isArray(repeatables.experience)
        ? repeatables.experience
        : [],
      education: Array.isArray(repeatables.education)
        ? repeatables.education
        : [],
    };

    return {
      main: main,
      profileChildren: profileChildren,
    };
  }

  function buildImportValidationResult(raw) {
    var blockingErrors = [];
    var warnings = [];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      blockingErrors.push(
        "Expected a single candidate object at the top level."
      );
      return {
        blockingErrors: blockingErrors,
        warnings: warnings,
        normalizedPayload: null,
      };
    }

    // Re-use the existing lightweight parser validation as a first gate.
    var basicValidation = validateParserPayload(raw);
    if (!basicValidation.ok) {
      blockingErrors.push(
        basicValidation.reason ||
          "Unsupported JSON format for candidate import."
      );
      return {
        blockingErrors: blockingErrors,
        warnings: warnings,
        normalizedPayload: null,
      };
    }

    var name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
      blockingErrors.push("Missing required `name` field.");
    }

    var email = typeof raw.email === "string" ? raw.email.trim() : "";
    var phones = Array.isArray(raw.phones) ? raw.phones : [];
    var hasPhone = false;
    for (var i = 0; i < phones.length; i++) {
      var p = phones[i];
      if (typeof p === "string" && p.trim() !== "") {
        hasPhone = true;
        break;
      }
    }

    if (!email && !hasPhone) {
      blockingErrors.push(
        "At least one contact is required (email or phone)."
      );
    } else {
      if (!email) {
        warnings.push(
          "No email provided. Only phone contact will be imported."
        );
      }
      if (!hasPhone) {
        warnings.push(
          "No phone numbers provided. Only email contact will be imported."
        );
      }
    }

    // Optional, non-blocking hints about common missing sections.
    if (
      !raw.summary ||
      (typeof raw.summary === "string" && raw.summary.trim() === "")
    ) {
      warnings.push(
        "No summary found in the JSON. You can add it later in the candidate profile."
      );
    }
    if (!Array.isArray(raw.experience) || raw.experience.length === 0) {
      warnings.push(
        "No experience entries found. The experience section will be empty."
      );
    }
    if (!Array.isArray(raw.education) || raw.education.length === 0) {
      warnings.push(
        "No education entries found. The education section will be empty."
      );
    }

    if (blockingErrors.length) {
      return {
        blockingErrors: blockingErrors,
        warnings: warnings,
        normalizedPayload: null,
      };
    }

    var normalized = mapParserToNormalizedPayload(raw);
    return {
      blockingErrors: blockingErrors,
      warnings: warnings,
      normalizedPayload: normalized,
    };
  }

  function handleJsonFileSelected(file, form, fileInput) {
    if (!file || !form) return;

    if (typeof console !== "undefined" && console.debug) {
      console.debug(
        "[ItalianExperience] candidate-import-runtime: handleJsonFileSelected",
        { fileName: file.name, fileType: file.type, fileSize: file.size }
      );
    }

    var reader = new FileReader();
    reader.onload = function (event) {
      var text = event && event.target && event.target.result;
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        showError("Invalid JSON file.");
        if (fileInput) {
          fileInput.value = "";
        }
        return;
      }

      var validation = validateParserPayload(parsed);
      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: validateParserPayload result",
          validation
        );
      }
      if (!validation.ok) {
        showError(validation.reason || "Unsupported JSON format for parser import.");
        if (fileInput) {
          fileInput.value = "";
        }
        return;
      }

      var mapped = mapParserToFormModel(parsed);
      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: mapParserToFormModel produced",
          mapped
        );
      }
      applyPrefillToForm(form, mapped);
      showSuccess("Parser JSON imported. Review the fields and click Save to persist.");
      if (fileInput) {
        fileInput.value = "";
      }
    };
    reader.onerror = function () {
      showError("Unable to read JSON file.");
      if (fileInput) {
        fileInput.value = "";
      }
    };

    reader.readAsText(file);
  }

  function initCandidateJsonImport(form, options) {
    if (!form) return;

    var opts = options || {};
    var params = getRouterParamsSafe();
    if (!opts.allowExistingCandidate && params && params.id) {
      return;
    }

    var fileInput = document.getElementById("candidateParserJsonInput");
    if (!fileInput) {
      return;
    }

    if (fileInput._ieJsonImportBound) {
      return;
    }
    fileInput._ieJsonImportBound = true;

    fileInput.addEventListener("change", function () {
      var files = fileInput.files;
      var file = files && files[0];
      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: file input change",
          { filesLength: files ? files.length : null, hasFile: !!file }
        );
      }
      if (!file) {
        return;
      }
      handleJsonFileSelected(file, form, fileInput);
    });
  }

  function renderListImportModalContent() {
    return (
      '<div class="space-y-6" data-ie-candidate-json-import-root>' +
      '  <div class="space-y-2">' +
      '    <p class="text-sm text-gray-700">' +
      "      Import a single candidate from a JSON file. Parsing and creation will be handled in the next step of the MVP." +
      "    </p>" +
      '    <ol class="flex flex-wrap gap-2 text-xs text-gray-500">' +
      '      <li class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium" data-ie-candidate-json-import-step="upload">' +
      '        <span class="w-5 h-5 flex items-center justify-center rounded-full bg-[#1b4332] text-white text-[11px] font-semibold">1</span>' +
      "        <span>Upload</span>" +
      "      </li>" +
      '      <li class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-500 font-medium" data-ie-candidate-json-import-step="preview">' +
      '        <span class="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-[11px] font-semibold">2</span>' +
      "        <span>Preview</span>" +
      "      </li>" +
      '      <li class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-500 font-medium" data-ie-candidate-json-import-step="confirm">' +
      '        <span class="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-[11px] font-semibold">3</span>' +
      "        <span>Confirm</span>" +
      "      </li>" +
      "    </ol>" +
      "  </div>" +
      '  <div class="space-y-4" data-ie-candidate-json-import-upload>' +
      '    <div>' +
      '      <p class="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">' +
      "        Upload JSON file" +
      "      </p>" +
      '      <p class="text-xs text-gray-500">' +
      "        Select a JSON file representing a single candidate profile. Only one file per import is supported." +
      "      </p>" +
      "    </div>" +
      '    <div class="flex items-center gap-3">' +
      '      <label class="ie-btn ie-btn-primary cursor-pointer" for="candidateListJsonFileInput" data-ie-candidate-json-import-file-label>' +
      "        Choose JSON file" +
      "      </label>" +
      '      <input type="file" id="candidateListJsonFileInput" class="sr-only" accept="application/json,.json" data-ie-candidate-json-import-file />' +
      '      <div class="text-xs text-gray-500" data-ie-candidate-json-import-file-meta>' +
      "        No file selected yet." +
      "      </div>" +
      "    </div>" +
      '    <div class="text-xs text-amber-600" data-ie-candidate-json-import-upload-status></div>' +
      "  </div>" +
      '  <div class="border-t border-gray-100 pt-4 space-y-2" data-ie-candidate-json-import-preview>' +
      '    <p class="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">' +
      "      Preview" +
      "    </p>" +
      '    <div class="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4" data-ie-candidate-json-import-preview-body>' +
      "      Parsed preview of the candidate will appear here once JSON parsing and mapping are implemented." +
      "    </div>" +
      "  </div>" +
      '  <div class="border-t border-gray-100 pt-4 space-y-3" data-ie-candidate-json-import-validation>' +
      '    <p class="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">' +
      "      Validation &amp; status" +
      "    </p>" +
      '    <div class="text-xs text-gray-500" data-ie-candidate-json-import-validation-body>' +
      "      Validation messages and mapping hints will be displayed here once implemented." +
      "    </div>" +
      '    <div class="text-xs text-red-600" data-ie-candidate-json-import-error></div>' +
      "  </div>" +
      '  <div class="border-t border-gray-100 pt-4 flex items-center justify-end gap-2" data-ie-candidate-json-import-actions>' +
      '    <button type="button" class="ie-btn ie-btn-secondary" data-ie-modal-close>' +
      "      Cancel" +
      "    </button>" +
      '    <button type="button" class="ie-btn ie-btn-primary" data-ie-candidate-json-import-confirm disabled>' +
      "      Confirm import" +
      "    </button>" +
      "  </div>" +
      "</div>"
    );
  }

  function bindListImportModalBehavior(root) {
    if (!root) return;
    var fileInput = root.querySelector(
      "[data-ie-candidate-json-import-file]"
    );
    var fileMeta = root.querySelector(
      "[data-ie-candidate-json-import-file-meta]"
    );
    var uploadStatus = root.querySelector(
      "[data-ie-candidate-json-import-upload-status]"
    );
    var confirmBtn = root.querySelector(
      "[data-ie-candidate-json-import-confirm]"
    );
    var previewBody = root.querySelector(
      "[data-ie-candidate-json-import-preview-body]"
    );
    var validationBody = root.querySelector(
      "[data-ie-candidate-json-import-validation-body]"
    );
    var errorBox = root.querySelector(
      "[data-ie-candidate-json-import-error]"
    );
    var stepUpload = root.querySelector(
      '[data-ie-candidate-json-import-step="upload"]'
    );
    var stepPreview = root.querySelector(
      '[data-ie-candidate-json-import-step="preview"]'
    );
    var stepConfirm = root.querySelector(
      '[data-ie-candidate-json-import-step="confirm"]'
    );

    var escapeHtml =
      (typeof window !== "undefined" && window.escapeHtml) ||
      function (value) {
        if (value == null) return "";
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      };

    var state = {
      normalizedPayload: null,
      blockingErrors: [],
      warnings: [],
    };
    var isSubmitting = false;

    function resetState() {
      state.normalizedPayload = null;
      state.blockingErrors = [];
      state.warnings = [];
      isSubmitting = false;
      if (previewBody) {
        previewBody.innerHTML =
          "Parsed preview of the candidate will appear here once JSON parsing and mapping are implemented.";
      }
      if (validationBody) {
        validationBody.textContent =
          "Validation messages and mapping hints will be displayed here once implemented.";
      }
      if (errorBox) {
        errorBox.textContent = "";
      }
      if (confirmBtn) {
        confirmBtn.disabled = true;
      }
      if (stepUpload) {
        stepUpload.classList.add("bg-gray-100", "text-gray-700");
      }
      if (stepPreview) {
        stepPreview.classList.remove("bg-emerald-50", "text-emerald-700");
        stepPreview.classList.add("bg-gray-50", "text-gray-500");
      }
      if (stepConfirm) {
        stepConfirm.classList.remove("bg-emerald-50", "text-emerald-700");
        stepConfirm.classList.add("bg-gray-50", "text-gray-500");
      }
      if (window.IECandidateImportRuntime) {
        window.IECandidateImportRuntime._currentNormalizedImport = null;
      }
    }

    function updateStepsForParsed(hasBlockingErrors) {
      if (stepUpload) {
        stepUpload.classList.add("bg-gray-100", "text-gray-700");
      }
      if (stepPreview) {
        stepPreview.classList.remove("bg-gray-50", "text-gray-500");
        stepPreview.classList.add("bg-emerald-50", "text-emerald-700");
      }
      if (stepConfirm) {
        stepConfirm.classList.remove("bg-emerald-50", "text-emerald-700");
        stepConfirm.classList.add("bg-gray-50", "text-gray-500");
        if (!hasBlockingErrors) {
          stepConfirm.classList.remove("bg-gray-50", "text-gray-500");
          stepConfirm.classList.add("bg-emerald-50", "text-emerald-700");
        }
      }
    }

    function renderPreview(normalized) {
      if (!previewBody) return;
      if (!normalized) {
        previewBody.innerHTML =
          '<div class="text-xs text-red-600">No valid candidate could be parsed from this JSON file.</div>';
        return;
      }

      var main = normalized.main || {};
      var children = normalized.profileChildren || {};

      var fullName = [main.first_name, main.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (!fullName) {
        fullName = "Unnamed candidate";
      }
      var role = main.position || "";
      var location = main.address || "";

      var email = main.email || "";
      var phone = main.phone || "";
      var linkedin = main.linkedin_url || "";
      var summary = main.summary || "";

      var statusLabel = "Pending review (on confirm)";

      function renderList(items, formatter, emptyLabel) {
        if (!Array.isArray(items) || !items.length) {
          return (
            '<p class="text-[11px] text-gray-400 italic">' +
            escapeHtml(emptyLabel || "No items") +
            "</p>"
          );
        }
        var visible = items.slice(0, 3);
        var html = '<ul class="space-y-1 text-[11px] text-gray-700">';
        for (var i = 0; i < visible.length; i++) {
          html += "<li>" + formatter(visible[i], i) + "</li>";
        }
        if (items.length > visible.length) {
          html +=
            '<li class="text-[11px] text-gray-400">+' +
            escapeHtml(String(items.length - visible.length)) +
            " more…</li>";
        }
        html += "</ul>";
        return html;
      }

      var skillsHtml = renderList(
        children.skills,
        function (item) {
          return escapeHtml(item && item.skill ? item.skill : "");
        },
        "No skills in JSON"
      );
      var languagesHtml = renderList(
        children.languages,
        function (item) {
          var label = item && item.language ? item.language : "";
          var level = item && item.proficiency ? item.proficiency : "";
          return escapeHtml(label + (level ? " – " + level : ""));
        },
        "No languages in JSON"
      );
      var experienceHtml = renderList(
        children.experience,
        function (item) {
          var title = item && item.title ? item.title : "";
          var company = item && item.company ? item.company : "";
          return escapeHtml(
            [title, company].filter(Boolean).join(" – ")
          );
        },
        "No experience in JSON"
      );
      var educationHtml = renderList(
        children.education,
        function (item) {
          var institution =
            item && item.institution ? item.institution : "";
          var degree = item && item.degree ? item.degree : "";
          return escapeHtml(
            [institution, degree].filter(Boolean).join(" – ")
          );
        },
        "No education in JSON"
      );

      previewBody.innerHTML =
        '<div class="space-y-4">' +
        '  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">' +
        "    <div>" +
        '      <h3 class="serif text-base font-semibold text-[#1b4332] leading-tight">' +
        escapeHtml(fullName) +
        "</h3>" +
        (role
          ? '<p class="text-xs text-gray-600 mt-0.5">' +
            escapeHtml(role) +
            "</p>"
          : "") +
        (location
          ? '<p class="text-[11px] text-gray-500 mt-0.5">' +
            escapeHtml(location) +
            "</p>"
          : "") +
        "    </div>" +
        '    <div class="text-right space-y-1">' +
        '      <div class="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 text-[11px] font-medium">' +
        escapeHtml(statusLabel) +
        "</div>" +
        (main.source
          ? '<p class="text-[11px] text-gray-500">Source: <span class="font-medium text-gray-700">' +
            escapeHtml(main.source) +
            "</span></p>"
          : "") +
        "    </div>" +
        "  </div>" +
        '  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">' +
        '    <div class="space-y-1">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Contacts</p>' +
        '      <div class="space-y-0.5 text-gray-700">' +
        (email
          ? "<p>Email: " + escapeHtml(email) + "</p>"
          : '<p class="text-gray-400 italic">No email</p>') +
        (phone
          ? "<p>Phone: " + escapeHtml(phone) + "</p>"
          : '<p class="text-gray-400 italic">No phone</p>') +
        (linkedin
          ? "<p>LinkedIn: " + escapeHtml(linkedin) + "</p>"
          : "") +
        "      </div>" +
        "    </div>" +
        '    <div class="space-y-1 md:col-span-2">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Summary</p>' +
        (summary
          ? '<p class="text-gray-700">' +
            escapeHtml(
              summary.length > 260
                ? summary.slice(0, 260) + "…"
                : summary
            ) +
            "</p>"
          : '<p class="text-gray-400 italic">No summary</p>') +
        "    </div>" +
        "  </div>" +
        '  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
        '    <div class="space-y-1">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Skills</p>' +
        skillsHtml +
        "    </div>" +
        '    <div class="space-y-1">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Languages</p>' +
        languagesHtml +
        "    </div>" +
        '    <div class="space-y-1">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Experience</p>' +
        experienceHtml +
        "    </div>" +
        '    <div class="space-y-1">' +
        '      <p class="uppercase tracking-[0.18em] text-gray-400 font-semibold text-[10px]">Education</p>' +
        educationHtml +
        "    </div>" +
        "  </div>" +
        "</div>";
    }

    function renderValidation(stateSnapshot) {
      if (!validationBody || !errorBox) return;

      var blocking = stateSnapshot.blockingErrors || [];
      var warns = stateSnapshot.warnings || [];

      if (!blocking.length && !warns.length) {
        validationBody.innerHTML =
          '<p class="text-xs text-emerald-700">JSON parsed successfully. No issues detected.</p>';
        errorBox.textContent = "";
        return;
      }

      var html = "";
      if (blocking.length) {
        html +=
          '<div class="mb-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800">' +
          '<p class="font-semibold mb-1">Blocking issues</p>' +
          '<ul class="list-disc list-inside space-y-0.5">';
        for (var i = 0; i < blocking.length; i++) {
          html += "<li>" + escapeHtml(blocking[i]) + "</li>";
        }
        html += "</ul></div>";
      }

      if (warns.length) {
        html +=
          '<div class="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">' +
          '<p class="font-semibold mb-1">Warnings</p>' +
          '<ul class="list-disc list-inside space-y-0.5">';
        for (var j = 0; j < warns.length; j++) {
          html += "<li>" + escapeHtml(warns[j]) + "</li>";
        }
        html += "</ul></div>";
      }

      validationBody.innerHTML = html;

      if (blocking.length) {
        errorBox.textContent = blocking[0];
      } else {
        errorBox.textContent = "";
      }
    }

    function updateConfirmEnabled() {
      var canConfirm =
        !!state.normalizedPayload && !state.blockingErrors.length;
      if (confirmBtn) {
        confirmBtn.disabled = !canConfirm || isSubmitting;
      }
    }

    if (!fileInput) return;

    resetState();

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) {
        if (fileMeta) {
          fileMeta.textContent = "No file selected yet.";
        }
        if (uploadStatus) {
          uploadStatus.textContent = "";
        }
        resetState();
        return;
      }

      if (fileMeta) {
        var sizeKb = Math.round(file.size / 1024);
        fileMeta.textContent =
          file.name +
          " (" +
          sizeKb +
          " KB, " +
          (file.type || "application/json") +
          ")";
      }
      if (uploadStatus) {
        uploadStatus.textContent = "Reading and parsing JSON file…";
      }
      resetState();

      var reader = new FileReader();
      reader.onload = function (event) {
        var text = event && event.target && event.target.result;
        if (typeof text !== "string") {
          if (uploadStatus) {
            uploadStatus.textContent =
              "Unable to read file contents as text.";
          }
          state.normalizedPayload = null;
          state.blockingErrors = [
            "Unable to read this file as JSON text.",
          ];
          state.warnings = [];
          renderPreview(null);
          renderValidation(state);
          updateConfirmEnabled();
          updateStepsForParsed(true);
          return;
        }

        var parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          if (uploadStatus) {
            uploadStatus.textContent = "Invalid JSON file.";
          }
          state.normalizedPayload = null;
          state.blockingErrors = ["Invalid JSON file."];
          state.warnings = [];
          renderPreview(null);
          renderValidation(state);
          updateConfirmEnabled();
          updateStepsForParsed(true);
          return;
        }

        // Validate and normalize according to the MVP contract.
        var result = buildImportValidationResult(parsed);
        state.normalizedPayload = result.normalizedPayload;
        state.blockingErrors = result.blockingErrors || [];
        state.warnings = result.warnings || [];

        // Only keep the normalized payload in global memory (no raw JSON).
        if (window.IECandidateImportRuntime) {
          window.IECandidateImportRuntime._currentNormalizedImport =
            state.normalizedPayload || null;
        }

        if (typeof console !== "undefined" && console.debug) {
          console.debug(
            "[ItalianExperience] candidate-import-runtime: list JSON import result",
            {
              hasPayload: !!state.normalizedPayload,
              blockingErrorsCount: state.blockingErrors.length,
              warningsCount: state.warnings.length,
            }
          );
        }

        if (uploadStatus) {
          if (state.blockingErrors.length) {
            uploadStatus.textContent =
              "JSON parsed, but contains blocking issues. Fix them in the source and try again.";
          } else {
            uploadStatus.textContent =
              "JSON parsed successfully. Review the preview and validation before confirming.";
          }
        }

        renderPreview(state.normalizedPayload);
        renderValidation(state);
        updateConfirmEnabled();
        updateStepsForParsed(state.blockingErrors.length > 0);
      };
      reader.onerror = function () {
        if (uploadStatus) {
          uploadStatus.textContent = "Unable to read JSON file.";
        }
        state.normalizedPayload = null;
        state.blockingErrors = ["Unable to read JSON file."];
        state.warnings = [];
        renderPreview(null);
        renderValidation(state);
        updateConfirmEnabled();
        updateStepsForParsed(true);
      };

      reader.readAsText(file);
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async function (event) {
        event.preventDefault();
        if (isSubmitting) {
          return;
        }
        if (!state.normalizedPayload || state.blockingErrors.length) {
          if (errorBox && state.blockingErrors.length) {
            errorBox.textContent = state.blockingErrors[0];
          }
          return;
        }
        if (
          !window.IESupabase ||
          typeof window.IESupabase.insertCandidate !== "function"
        ) {
          if (errorBox) {
            errorBox.textContent =
              "Candidate creation is not available. Please try again later.";
          }
          return;
        }

        var previousLabel = confirmBtn.textContent;
        isSubmitting = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Importing…";

        var normalized = state.normalizedPayload || {};
        var main = normalized.main || {};
        var profileChildren = normalized.profileChildren || {};

        var safeSource =
          typeof main.source === "string" && main.source.trim() !== ""
            ? main.source.trim()
            : "json_import";

        var insertPayload = {
          first_name: main.first_name || "",
          last_name: main.last_name || "",
          position: main.position || "",
          address: main.address || "",
          status: "pending_review",
          source: safeSource,
          notes: main.notes || "",
          email: main.email || null,
          phone: main.phone || null,
          linkedin_url: main.linkedin_url || null,
          date_of_birth: main.date_of_birth || null,
          summary: main.summary || null,
        };

        if (typeof console !== "undefined" && console.debug) {
          console.debug(
            "[ItalianExperience] candidate-import-runtime: confirm import – creating candidate from normalized payload",
            insertPayload
          );
        }

        try {
          var createResult = await window.IESupabase.insertCandidate(
            insertPayload
          );
          if (!createResult || createResult.error || !createResult.data) {
            var message =
              (createResult &&
                createResult.error &&
                createResult.error.message) ||
              "Error creating candidate from JSON.";
            if (window.IESupabase && window.IESupabase.showError) {
              window.IESupabase.showError(
                message,
                "candidateJsonImportCreate"
              );
            }
            if (errorBox) {
              errorBox.textContent = message;
            }
            return;
          }

          var newCandidateId = createResult.data.id;
          if (
            newCandidateId &&
            window.IECandidateProfileRuntime &&
            typeof window.IECandidateProfileRuntime
              .saveCandidateProfileChildren === "function"
          ) {
            var childrenResult =
              await window.IECandidateProfileRuntime.saveCandidateProfileChildren(
                newCandidateId,
                profileChildren
              );
            if (!childrenResult || childrenResult.ok === false) {
              if (errorBox) {
                errorBox.textContent =
                  "Candidate created, but profile details could not be saved. Please try editing the candidate profile.";
              }
              return;
            }
          }

          resetState();
          if (window.IECandidateImportRuntime) {
            window.IECandidateImportRuntime._currentNormalizedImport = null;
          }

          if (
            window.IESupabase &&
            typeof window.IESupabase.showSuccess === "function"
          ) {
            window.IESupabase.showSuccess(
              "Candidate successfully created from JSON import."
            );
          }

          if (
            window.IEModalsRuntime &&
            typeof window.IEModalsRuntime.closeModal === "function"
          ) {
            window.IEModalsRuntime.closeModal();
          } else if (
            window.IEPortal &&
            window.IEPortal.ui &&
            typeof window.IEPortal.ui.closeModal === "function"
          ) {
            window.IEPortal.ui.closeModal();
          }

          if (newCandidateId && window.IERouter) {
            if (
              typeof window.IERouter.redirectToEntityView === "function"
            ) {
              window.IERouter.redirectToEntityView(
                "candidate",
                newCandidateId
              );
            } else if (
              typeof window.IERouter.navigateTo === "function" &&
              window.IEPortal &&
              window.IEPortal.links &&
              typeof window.IEPortal.links.candidateView === "function"
            ) {
              window.IERouter.navigateTo(
                window.IEPortal.links.candidateView(newCandidateId)
              );
            } else if (typeof window.IERouter.navigateTo === "function") {
              window.IERouter.navigateTo(
                "candidate.html?id=" + encodeURIComponent(newCandidateId)
              );
            } else {
              window.location.href =
                "candidate.html?id=" + encodeURIComponent(newCandidateId);
            }
          } else {
            if (
              window.IERouter &&
              typeof window.IERouter.navigateTo === "function"
            ) {
              window.IERouter.navigateTo("candidates.html");
            } else {
              window.location.reload();
            }
          }
        } finally {
          isSubmitting = false;
          if (confirmBtn && document.body.contains(confirmBtn)) {
            confirmBtn.textContent = previousLabel;
            updateConfirmEnabled();
          }
        }
      });
    }
  }

  function openCandidateJsonImportModal() {
    if (
      !window.IEPortal ||
      !window.IEPortal.ui ||
      typeof window.IEPortal.ui.openModal !== "function"
    ) {
      return;
    }

    window.IEPortal.ui.openModal({
      title: "Import Candidate JSON",
      fullPageHref: null,
      render: function (mount) {
        mount.innerHTML = renderListImportModalContent();
        var root = mount.querySelector(
          "[data-ie-candidate-json-import-root]"
        );
        bindListImportModalBehavior(root);
      },
    });
  }

  window.IECandidateImportRuntime = {
    initCandidateJsonImport: initCandidateJsonImport,
    openCandidateJsonImportModal: openCandidateJsonImportModal,
  };
})();

