;(function () {
  "use strict";

  function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function setField(name, value) {
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

  function createDomReader() {
    return function readFieldValue(fieldName) {
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
    };
  }

  function collectEditableFieldValues(config) {
    config = config || {};
    var editableFields = Array.isArray(config.editableFields)
      ? config.editableFields
      : [];
    var entity = config.entity || {};
    var fieldParsers = config.fieldParsers || {};

    var readFieldValue = createDomReader();
    var result = {};

    editableFields.forEach(function (fieldName) {
      var value = readFieldValue(fieldName);

      var parser = fieldParsers && fieldParsers[fieldName];
      if (typeof parser === "function") {
        result[fieldName] = parser(value, {
          fieldName: fieldName,
          entity: entity,
        });
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

  window.IEEntityFieldMapper = {
    safeString: safeString,
    setField: setField,
    collectEditableFieldValues: collectEditableFieldValues,
  };
})();

