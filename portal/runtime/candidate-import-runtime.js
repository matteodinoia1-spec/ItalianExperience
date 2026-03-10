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

    function assignIfPresent(name, value) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el || !("value" in el)) return;
      if (typeof value !== "string") {
        value = value == null ? "" : String(value);
      }
      el.value = value;
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
        { hasCore: !!(mapped && mapped.core), hasRepeatables: !!(mapped && mapped.repeatables) }
      );
    }
    applyCoreToForm(form, mapped.core || {});
    applyRepeatablesToForm(form, mapped.repeatables || {});
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

  function initCandidateJsonImport(form) {
    if (!form) return;

    var params = getRouterParamsSafe();
    if (params && params.id) {
    return;
    }

  var fileInput = document.getElementById("candidateParserJsonInput");
  if (!fileInput) {
    return;
  }

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

  window.IECandidateImportRuntime = {
    initCandidateJsonImport: initCandidateJsonImport,
  };
})();

