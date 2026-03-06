// ============================================================================
// Italian Experience Recruitment Portal - Page Bootstrap Runtime
// ----------------------------------------------------------------------------
// Centralizes the portal startup pipeline:
// - Auth guard completion
// - Session inactivity wiring (protected pages only)
// - Layout + sidebar initialization
// - Page-specific initialization (lists, forms, buttons, profile header)
//
// NOTE:
// - This module orchestrates existing helpers defined in core/app-shell.js
//   via the IEPageBootstrapHelpers global.
// - Supabase/session/auth logic remains implemented in core modules; we
//   simply wait for the existing __IE_AUTH_GUARD__ promise.
// ============================================================================

(function () {
  "use strict";

  /**
   * Run form initialization based on page key.
   * Forms runtime handles DOM wiring; business logic stays in app-shell.
   */
  function runFormInitializers(pageKey) {
    if (!window.IEFormsRuntime) return;

    switch (pageKey) {
      case "add-candidate":
      case "candidate":
        if (typeof window.IEFormsRuntime.initCandidateForm === "function") {
          window.IEFormsRuntime.initCandidateForm(document);
        }
        break;
      case "add-job-offer":
        if (typeof window.IEFormsRuntime.initJobOfferForm === "function") {
          window.IEFormsRuntime.initJobOfferForm(document);
        }
        break;
      case "add-client":
        if (typeof window.IEFormsRuntime.initClientForm === "function") {
          window.IEFormsRuntime.initClientForm(document);
        }
        break;
      default:
        break;
    }

    if (typeof window.IEFormsRuntime.initEditToolbars === "function") {
      window.IEFormsRuntime.initEditToolbars();
    }
  }

  /**
   * Run page controllers extracted from app-shell.
   * These should remain behavior-preserving orchestrators.
   */
  function runPageControllers(pageKey) {
    switch (pageKey) {
      case "candidate":
      case "add-candidate":
        if (
          window.IECandidateRuntime &&
          typeof window.IECandidateRuntime.initCandidatePage === "function"
        ) {
          window.IECandidateRuntime.initCandidatePage();
        }
        break;
      case "client":
      case "add-client":
        if (
          window.IEClientRuntime &&
          typeof window.IEClientRuntime.initClientPage === "function"
        ) {
          window.IEClientRuntime.initClientPage();
        }
        break;
      case "job-offer":
      case "add-job-offer":
        if (
          window.IEJobOfferRuntime &&
          typeof window.IEJobOfferRuntime.initJobOfferPage === "function"
        ) {
          window.IEJobOfferRuntime.initJobOfferPage();
        }
        break;
      case "profile":
        if (
          window.IECandidateProfileRuntime &&
          typeof window.IECandidateProfileRuntime.initCandidateProfile ===
            "function"
        ) {
          window.IECandidateProfileRuntime.initCandidateProfile();
        }
        break;
      default:
        break;
    }
  }

  /**
   * Run the common per-page initializers exposed by app-shell.
   * This delegates to helpers without changing their behavior.
   */
  function runPageInitializers(pageKey) {
    var helpers = window.IEPageBootstrapHelpers || {};

    if (typeof helpers.initBackButton === "function") {
      helpers.initBackButton();
    }
    if (typeof helpers.initButtons === "function") {
      helpers.initButtons();
    }
    runFormInitializers(pageKey);
    runPageControllers(pageKey);
    runDataViews(pageKey);
  }

  /**
   * Initialize page-specific data views (lists, dashboard, profile activity)
   * based on the current pageKey.
   */
  function runDataViews(pageKey) {
    if (pageKey === "dashboard") {
      // Dashboard data is loaded via Supabase helpers (lists runtime module).
      if (
        window.IEListsRuntime &&
        typeof window.IEListsRuntime.initDashboardPage === "function"
      ) {
        window.IEListsRuntime.initDashboardPage();
      }
      return;
    }

    if (pageKey === "candidates") {
      if (
        window.IEListsRuntime &&
        typeof window.IEListsRuntime.initCandidatesPage === "function"
      ) {
        window.IEListsRuntime.initCandidatesPage();
      }
    } else if (pageKey === "job-offers") {
      if (
        window.IEListsRuntime &&
        typeof window.IEListsRuntime.initJobOffersPage === "function"
      ) {
        window.IEListsRuntime.initJobOffersPage();
      }
    } else if (pageKey === "applications") {
      if (
        window.IEListsRuntime &&
        typeof window.IEListsRuntime.initApplicationsPage === "function"
      ) {
        window.IEListsRuntime.initApplicationsPage();
      }
    } else if (pageKey === "clients") {
      if (
        window.IEListsRuntime &&
        typeof window.IEListsRuntime.initClientsPage === "function"
      ) {
        window.IEListsRuntime.initClientsPage();
      }
    } else if (pageKey === "profile") {
      if (
        window.IEProfileRuntime &&
        typeof window.IEProfileRuntime.initProfileMyActivitySection ===
          "function"
      ) {
        window.IEProfileRuntime.initProfileMyActivitySection();
      }
    }
  }

  /**
   * Main bootstrap entrypoint.
   * @param {string} pageKey - Normalized page key from IERouterRuntime.getPageKey().
   */
  async function init(pageKey) {
    var isProtectedPage =
      !!(
        window.IERouterRuntime &&
        typeof window.IERouterRuntime.isProtectedPage === "function" &&
        window.IERouterRuntime.isProtectedPage(pageKey)
      );

    if (
      window.IEModalsRuntime &&
      typeof window.IEModalsRuntime.initGlobalModals === "function"
    ) {
      window.IEModalsRuntime.initGlobalModals();
    }

    if (
      window.IEEntityActionsRuntime &&
      typeof window.IEEntityActionsRuntime.init === "function"
    ) {
      window.IEEntityActionsRuntime.init();
    }

    // -----------------------------------------------------------------------
    // Step A/B – Auth guard + Supabase session (existing __IE_AUTH_GUARD__)
    // -----------------------------------------------------------------------
    var guard = window.__IE_AUTH_GUARD__;
    if (guard && typeof guard.then === "function") {
      var allowed = await guard;
      if (!allowed) {
        return;
      }
    }

    // -----------------------------------------------------------------------
    // Step E – Session inactivity + profile (protected pages only)
    // -----------------------------------------------------------------------
    if (isProtectedPage) {
      if (
        window.IEProfileRuntime &&
        typeof window.IEProfileRuntime.loadCurrentUserProfile === "function"
      ) {
        await window.IEProfileRuntime.loadCurrentUserProfile();
      }
      if (
        window.IEPageBootstrapHelpers &&
        typeof window.IEPageBootstrapHelpers.initInactivityTimer === "function"
      ) {
        window.IEPageBootstrapHelpers.initInactivityTimer();
      }
    }

    // -----------------------------------------------------------------------
    // Step C – Layout & Sidebar initialization
    // -----------------------------------------------------------------------
    if (
      window.IESidebarRuntime &&
      typeof window.IESidebarRuntime.ensureSidebarLoaded === "function"
    ) {
      try {
        await window.IESidebarRuntime.ensureSidebarLoaded();

        // Extra defense-in-depth: re-validate auth for protected pages.
        if (
          isProtectedPage &&
          window.IEAuth &&
          typeof window.IEAuth.checkAuth === "function"
        ) {
          var user = await window.IEAuth.checkAuth();
          if (!user) return;
        }

        if (
          window.IELayoutRuntime &&
          typeof window.IELayoutRuntime.initLayout === "function"
        ) {
          window.IELayoutRuntime.initLayout();
        }

        if (
          window.IEHeaderRuntime &&
          typeof window.IEHeaderRuntime.initHeader === "function"
        ) {
          window.IEHeaderRuntime.initHeader(pageKey);
        }

        // -------------------------------------------------------------------
        // Step F – Page initialization (then branch)
        // -------------------------------------------------------------------
        runPageInitializers(pageKey);
      } catch (error) {
        if (typeof window.debugLog === "function") {
          window.debugLog(
            "[ItalianExperience] Sidebar loading failed",
            error
          );
        }

        if (
          isProtectedPage &&
          window.IEAuth &&
          typeof window.IEAuth.checkAuth === "function"
        ) {
          var userAfterError = await window.IEAuth.checkAuth();
          if (!userAfterError) return;
        }

        // Fallback: run header + page initializers even if sidebar loading
        // failed. (Matches previous .catch() behavior in app-shell).
        if (
          window.IEHeaderRuntime &&
          typeof window.IEHeaderRuntime.initHeader === "function"
        ) {
          window.IEHeaderRuntime.initHeader(pageKey);
        }
        runPageInitializers(pageKey);
      }
    } else {
      // No sidebar runtime available: keep behavior safe by running
      // header + initializers after an optional auth re-check.
      if (
        isProtectedPage &&
        window.IEAuth &&
        typeof window.IEAuth.checkAuth === "function"
      ) {
        var userNoSidebar = await window.IEAuth.checkAuth();
        if (!userNoSidebar) return;
      }
      if (
        window.IEHeaderRuntime &&
        typeof window.IEHeaderRuntime.initHeader === "function"
      ) {
        window.IEHeaderRuntime.initHeader(pageKey);
      }
      runPageInitializers(pageKey);
    }
  }

  window.IEPageBootstrap = {
    init: init,
    runDataViews: runDataViews,
  };
})();

