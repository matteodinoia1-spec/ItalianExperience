// ============================================================================
// Italian Experience Recruitment Portal - Forms Runtime
// ----------------------------------------------------------------------------
// Form initialization and DOM wiring for candidate, job offer, and client forms.
// Business logic (save, update, validation) remains in core/app-shell.js and
// is invoked via window.IEFormsRuntimeHelpers.
// ============================================================================

(function () {
  "use strict";

  var helpers = function () {
    return window.IEFormsRuntimeHelpers || {};
  };

  function bindCandidateForm(scope) {
    var form = scope.querySelector("#candidateForm");
    if (!form || form.dataset.ieBound === "true") return;

    form.dataset.ieBound = "true";
    var h = helpers();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var candidateParams = new URLSearchParams(window.location.search);
      var candidateId = candidateParams.get("id");
      if (
        window.IERouterRuntime &&
        window.IERouterRuntime.getPageKey() === "add-candidate" &&
        candidateId &&
        window.IESupabase &&
        window.IESupabase.updateCandidate
      ) {
        if (typeof h.updateCandidateFromForm === "function") {
          h.updateCandidateFromForm(candidateId, formData, form);
        }
        return;
      }
      if (typeof h.saveCandidate === "function") {
        h.saveCandidate(formData, form);
      }
    });

    var cancelBtn = form.querySelector("[data-edit-cancel]");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        var params = new URLSearchParams(window.location.search);
        var id = params.get("id");
        if (window.IERouter) {
          if (id) {
            window.IERouter.redirectToEntityView("candidate", id);
          } else {
            window.IERouter.navigateTo("candidates.html");
          }
        }
      });
    }

    var cvInput = form.querySelector('input[name="cv_file"]');
    var photoInput = form.querySelector('input[name="foto_file"]');

    if (cvInput && cvInput.dataset.ieBoundFile !== "true") {
      cvInput.dataset.ieBoundFile = "true";
      cvInput.addEventListener("change", function () {
        if (typeof h.handleCandidateFileChange === "function") {
          h.handleCandidateFileChange({ input: cvInput, type: "cv" }).catch(function (err) {
            console.error("[ItalianExperience] handleCandidateFileChange (cv) failed:", err);
          });
        }
      });
    }

    if (photoInput && photoInput.dataset.ieBoundFile !== "true") {
      photoInput.dataset.ieBoundFile = "true";
      photoInput.addEventListener("change", function () {
        if (typeof h.handleCandidateFileChange === "function") {
          h.handleCandidateFileChange({ input: photoInput, type: "photo" }).catch(function (err) {
            console.error("[ItalianExperience] handleCandidateFileChange (photo) failed:", err);
          });
        }
      });
    }

    if (typeof h.renderCandidateFileState === "function") {
      h.renderCandidateFileState("cv", null, "edit");
      h.renderCandidateFileState("photo", null, "edit");
    }
  }

  function bindJobOfferForm(scope) {
    var form = scope.querySelector("#jobOfferForm");
    if (!form || form.dataset.ieBound === "true") return;

    form.dataset.ieBound = "true";
    var h = helpers();

    if (typeof h.hydrateJobOfferClientAutocomplete === "function") {
      h.hydrateJobOfferClientAutocomplete(form);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var pageKey = window.IERouterRuntime ? window.IERouterRuntime.getPageKey() : "";
      if (pageKey === "add-job-offer" && window.IERouter && typeof window.IERouter.getJobOfferPageParams === "function") {
        var params = window.IERouter.getJobOfferPageParams();
        if (params.mode === "edit" && params.id) {
          if (typeof h.updateJobOfferFromForm === "function") {
            h.updateJobOfferFromForm(params.id, formData);
          }
          return;
        }
      }
      if (typeof h.saveJobOffer === "function") {
        h.saveJobOffer(formData);
      }
    });
  }

  function bindClientForm(scope) {
    var form = scope.querySelector("#clientForm");
    if (!form || form.dataset.ieBound === "true") return;

    form.dataset.ieBound = "true";
    var h = helpers();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var clientParams = new URLSearchParams(window.location.search);
      var clientId = clientParams.get("id");
      if (
        window.IERouterRuntime &&
        window.IERouterRuntime.getPageKey() === "add-client" &&
        clientId &&
        window.IESupabase &&
        window.IESupabase.updateClient
      ) {
        if (typeof h.updateClientFromForm === "function") {
          h.updateClientFromForm(clientId, formData);
        }
        return;
      }
      if (typeof h.saveClient === "function") {
        h.saveClient(formData);
      }
    });

    var cancelBtn = form.querySelector("[data-edit-cancel]");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        var params = new URLSearchParams(window.location.search);
        var id = params.get("id");
        if (window.IERouter) {
          if (id) {
            window.IERouter.redirectToEntityView("client", id);
          } else {
            window.IERouter.navigateTo("clients.html");
          }
        }
      });
    }
  }

  function initCandidateForm(scope) {
    bindCandidateForm(scope || document);
  }

  function initJobOfferForm(scope) {
    bindJobOfferForm(scope || document);
  }

  function initClientForm(scope) {
    bindClientForm(scope || document);
  }

  /**
   * Bind all form handlers in the given scope (document or modal mount).
   * Used when dynamically loading forms (e.g. modals).
   */
  function bindFormHandlers(root) {
    var scope = root || document;
    bindCandidateForm(scope);
    bindJobOfferForm(scope);
    bindClientForm(scope);
  }

  function initEditToolbars() {
    /* Mode indicator: set "Editing Candidate" / "Creating Candidate" etc. from URL state */
    var entityIndicator = document.querySelector("[data-entity-mode-indicator]");
    if (entityIndicator) {
      var type = entityIndicator.getAttribute("data-entity-mode-indicator");
      var params = new URLSearchParams(window.location.search);
      var state = window.IERouter && typeof window.IERouter.resolveEntityPageState === "function"
        ? window.IERouter.resolveEntityPageState(params)
        : { mode: "", id: "" };
      var mode = state.mode;
      var hasId = !!state.id;

      var text = "";
      if (mode === "edit" && hasId) {
        if (type === "candidate") text = "Editing Candidate";
        else if (type === "client") text = "Editing Client";
        else if (type === "job-offer") text = "Editing Job Offer";
      } else if (mode === "create" && !hasId) {
        if (type === "candidate") text = "Creating Candidate";
        else if (type === "client") text = "Creating Client";
        else if (type === "job-offer") text = "Creating Job Offer";
      }

      if (text) {
        entityIndicator.textContent = text;
      } else {
        entityIndicator.style.display = "none";
      }
    }
  }

  window.IEFormsRuntime = {
    initCandidateForm: initCandidateForm,
    initJobOfferForm: initJobOfferForm,
    initClientForm: initClientForm,
    bindFormHandlers: bindFormHandlers,
    initEditToolbars: initEditToolbars,
  };
})();
