(function () {
  "use strict";

  function parseJsonArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  function asStringOrNull(v) {
    if (v == null) return null;
    var s = String(v).trim();
    return s ? s : null;
  }

  function formatDateTime(value) {
    if (window.IEFormatters && typeof window.IEFormatters.formatDateTime === "function") {
      return window.IEFormatters.formatDateTime(value) || "";
    }
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function formatDate(value) {
    if (window.IEFormatters && typeof window.IEFormatters.formatDate === "function") {
      return window.IEFormatters.formatDate(value) || "";
    }
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function formatExperienceItems(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var title = asStringOrNull(item.title);
        var company = asStringOrNull(item.company);
        var location = asStringOrNull(item.location);
        var start = asStringOrNull(item.start_date);
        var end = asStringOrNull(item.end_date);
        var description = asStringOrNull(item.description);
        return {
          title: title,
          company: company,
          location: location,
          start_date: start,
          end_date: end,
          description: description,
        };
      })
      .filter(Boolean);
  }

  function formatEducationItems(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var institution = asStringOrNull(item.institution);
        var degree = asStringOrNull(item.degree);
        var field = asStringOrNull(item.field_of_study);
        var startYear =
          item.start_year != null ? Number(item.start_year) || null : null;
        var endYear =
          item.end_year != null ? Number(item.end_year) || null : null;
        return {
          institution: institution,
          degree: degree,
          field_of_study: field,
          start_year: startYear,
          end_year: endYear,
        };
      })
      .filter(Boolean);
  }

  function formatSkills(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (typeof item === "string") return item.trim() || null;
        if (item && typeof item === "object") {
          return asStringOrNull(item.skill);
        }
        return null;
      })
      .filter(Boolean);
  }

  function formatLanguages(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var language = asStringOrNull(item.language);
        var level =
          asStringOrNull(item.level) || asStringOrNull(item.proficiency);
        if (!language && !level) return null;
        return {
          language: language,
          level: level,
        };
      })
      .filter(Boolean);
  }

  function formatCertifications(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var name = asStringOrNull(item.name);
        var issuer = asStringOrNull(item.issuer);
        var year = item.year != null ? Number(item.year) || null : null;
        return {
          name: name,
          issuer: issuer,
          year: year,
        };
      })
      .filter(Boolean);
  }

  function formatHobbies(raw) {
    var items = parseJsonArray(raw);
    return items
      .map(function (item) {
        if (typeof item === "string") return item.trim() || null;
        if (item && typeof item === "object") {
          return asStringOrNull(item.hobby);
        }
        return null;
      })
      .filter(Boolean);
  }

  window.ExternalSubmissionFormatters = {
    parseJsonArray: parseJsonArray,
    asStringOrNull: asStringOrNull,
    formatDateTime: formatDateTime,
    formatDate: formatDate,
    formatExperienceItems: formatExperienceItems,
    formatEducationItems: formatEducationItems,
    formatSkills: formatSkills,
    formatLanguages: formatLanguages,
    formatCertifications: formatCertifications,
    formatHobbies: formatHobbies,
    // File fields for external submissions:
    // - resume_path: path inside "external-candidate-submissions" bucket for CV/resume
    // - photo_path: path inside the same bucket for an additional file (photo or attachment)
  };
})();

