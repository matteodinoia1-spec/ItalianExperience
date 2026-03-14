// Legacy IEListsRuntime compatibility shim.
// Keeps the public API stable while delegating to the new runtime/lists modules.
(function () {
  "use strict";

  var shared = window.IEListsSharedHelpers || {};
  var runtime = window.IEListsRuntime || (window.IEListsRuntime = {});

  function safeList(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  // Stable init entrypoints (may already be assigned by runtime/lists/*).
  if (typeof runtime.initDashboardPage !== "function") {
    runtime.initDashboardPage = function () {
      if (
        window.IEDashboardListRuntime &&
        typeof window.IEDashboardListRuntime.initDashboardPage === "function"
      ) {
        window.IEDashboardListRuntime.initDashboardPage();
      }
    };
  }

  if (typeof runtime.initCandidatesPage !== "function") {
    runtime.initCandidatesPage = function () {
      if (
        window.IECandidatesListRuntime &&
        typeof window.IECandidatesListRuntime.initCandidatesPage ===
          "function"
      ) {
        window.IECandidatesListRuntime.initCandidatesPage();
      }
    };
  }

  // Job offers, applications, and clients are wired directly by their
  // runtime/lists/* modules, so we only ensure the properties exist.
  if (typeof runtime.initJobOffersPage !== "function") {
    runtime.initJobOffersPage = function () {};
  }
  if (typeof runtime.initApplicationsPage !== "function") {
    runtime.initApplicationsPage = function () {};
  }
  if (typeof runtime.initClientsPage !== "function") {
    runtime.initClientsPage = function () {};
  }

  // Public filtering helpers delegate to shared helpers when available.
  runtime.applyCandidateFilters =
    runtime.applyCandidateFilters ||
    shared.applyCandidateFilters ||
    function (list) {
      return safeList(list);
    };

  runtime.applyJobOfferFilters =
    runtime.applyJobOfferFilters ||
    shared.applyJobOfferFilters ||
    function (list) {
      return safeList(list);
    };

  runtime.applyClientFilters =
    runtime.applyClientFilters ||
    shared.applyClientFilters ||
    function (list) {
      return safeList(list);
    };

  // Shared row renderer.
  runtime.renderEntityRow =
    runtime.renderEntityRow ||
    shared.renderEntityRow ||
    function () {
      return document.createElement("tr");
    };

  // Candidate selection API for bulk actions.
  runtime.getCandidateSelectionState =
    runtime.getCandidateSelectionState ||
    shared.getCandidateSelectionSnapshot ||
    function () {
      return { ids: [], pageIds: [] };
    };

  runtime.onCandidateSelectionChange =
    runtime.onCandidateSelectionChange ||
    shared.onCandidateSelectionChange ||
    function () {
      return function () {};
    };

  runtime.clearCandidateSelection =
    runtime.clearCandidateSelection ||
    shared.clearCandidateSelection ||
    function () {};

  runtime.setCandidateSelected =
    runtime.setCandidateSelected ||
    shared.setCandidateSelected ||
    function () {};
})();
