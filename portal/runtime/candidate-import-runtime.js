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

    if (Array.isArray(payload.languages)) {
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

    if (
      payload.experience ||
      payload.education ||
      payload.certifications
    ) {
      if (typeof console !== "undefined" && console.debug) {
        console.debug(
          "[ItalianExperience] candidate-import-runtime: complex sections present in parser JSON but ignored for Phase 1."
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
  }

  function applyPrefillToForm(form, mapped) {
    if (!form || !mapped) return;
    applyCoreToForm(form, mapped.core || {});
    applyRepeatablesToForm(form, mapped.repeatables || {});
  }

  function handleJsonFileSelected(file, form) {
    if (!file || !form) return;

    var reader = new FileReader();
    reader.onload = function (event) {
      var text = event && event.target && event.target.result;
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        showError("Invalid JSON file.");
        return;
      }

      var validation = validateParserPayload(parsed);
      if (!validation.ok) {
        showError(validation.reason || "Unsupported JSON format for parser import.");
        return;
      }

      var mapped = mapParserToFormModel(parsed);
      applyPrefillToForm(form, mapped);
      showSuccess("Parser JSON imported. Review the fields and click Save to persist.");
    };
    reader.onerror = function () {
      showError("Unable to read JSON file.");
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
    if (!file) {
      return;
    }
    handleJsonFileSelected(file, form);
    fileInput.value = "";
  });
  }

  window.IECandidateImportRuntime = {
    initCandidateJsonImport: initCandidateJsonImport,
  };
})();

