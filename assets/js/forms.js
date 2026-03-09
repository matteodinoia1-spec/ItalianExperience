;(function (window, document) {
  function resolveElement(ref, byId, bySelector) {
    if (!ref) return null;
    if (typeof ref === "string") {
      if (byId) return byId(ref);
      if (bySelector) return bySelector(ref);
      return null;
    }
    if (ref instanceof Element || ref === window || ref === document) {
      return ref;
    }
    return null;
  }

  function attachZohoPhoneForm(config) {
    if (!config) return null;

    var form =
      resolveElement(config.form || config.formId, function (id) {
        return document.getElementById(id);
      }) || null;
    if (!form) return null;

    var phoneInput =
      resolveElement(config.phoneInput || config.phoneInputId, function (id) {
        return document.getElementById(id);
      }) || null;

    var phoneHidden =
      resolveElement(config.phoneHidden || config.phoneHiddenId, function (id) {
        return document.getElementById(id);
      }) || null;

    var successMsg =
      resolveElement(
        config.successMessage || config.successMessageId,
        function (id) {
          return document.getElementById(id);
        }
      ) || null;

    var frame =
      resolveElement(
        config.iframe || config.iframeSelector,
        null,
        function (selector) {
          return document.querySelector(selector);
        }
      ) || null;

    var intlOptions =
      config.intlTelInputOptions || {
        initialCountry: "us",
        separateDialCode: true,
        preferredCountries: ["us", "it", "gb", "fr", "de", "es"],
        loadUtils: function () {
          return import(
            "https://cdn.jsdelivr.net/npm/intl-tel-input@25.12.2/build/js/utils.js"
          );
        },
      };

    var iti =
      phoneInput && window.intlTelInput
        ? window.intlTelInput(phoneInput, intlOptions)
        : null;

    var submitted = false;

    function syncPhone() {
      if (!phoneHidden || !phoneInput) return;

      var rawPhone = phoneInput.value ? phoneInput.value.trim() : "";
      if (!rawPhone) {
        phoneHidden.value = "";
        return;
      }

      if (iti) {
        phoneHidden.value = iti.getNumber() || "";
        return;
      }

      phoneHidden.value = rawPhone;
    }

    if (phoneInput) {
      phoneInput.addEventListener("input", syncPhone);
      phoneInput.addEventListener("countrychange", syncPhone);
    }

    form.addEventListener("submit", function () {
      submitted = true;
      syncPhone();
    });

    if (frame) {
      frame.addEventListener("load", function () {
        if (!submitted || !successMsg) return;
        successMsg.classList.add("is-visible");
        form.reset();
        if (iti) iti.setCountry("us");
        syncPhone();
        submitted = false;
      });
    }

    return {
      form: form,
      phoneInput: phoneInput,
      phoneHidden: phoneHidden,
      successMsg: successMsg,
      iframe: frame,
      iti: iti,
    };
  }

  window.IEForms = window.IEForms || {};
  window.IEForms.attachZohoPhoneForm = attachZohoPhoneForm;
})(window, document);

