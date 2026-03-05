// -----------------------------------------------------------------------------
// Italian Experience Recruitment Portal - Modal UI Helpers
// -----------------------------------------------------------------------------

(function () {
  "use strict";

  function ensureModal() {
    var overlay = document.querySelector(".ie-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "ie-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="ie-modal" role="document">' +
      '  <div class="ie-modal-header">' +
      '    <div class="ie-modal-title" data-ie-modal-title></div>' +
      '    <div class="ie-modal-actions">' +
      '      <a class="ie-modal-icon-btn" data-ie-modal-fullpage aria-label="Open full page" title="Open full page">' +
      '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '          <path d="M14 3h7v7"></path>' +
      '          <path d="M10 14L21 3"></path>' +
      '          <path d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path>' +
      "        </svg>" +
      "      </a>" +
      '      <button class="ie-btn ie-btn-secondary ie-modal-icon-btn" type="button" data-ie-modal-close aria-label="Close" title="Close">' +
      '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '          <path d="M18 6 6 18"></path>' +
      '          <path d="M6 6 18 18"></path>' +
      "        </svg>" +
      "      </button>" +
      "    </div>" +
      "  </div>" +
      '  <div class="ie-modal-body" data-ie-modal-body></div>' +
      "</div>";

    // Click outside closes
    overlay.addEventListener("click", function (event) {
      if (!event.target.closest(".ie-modal")) closeModal();
    });

    // Close button
    overlay.addEventListener("click", function (event) {
      if (event.target.closest("[data-ie-modal-close]")) closeModal();
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function openModal(config) {
    var overlay = ensureModal();
    var titleEl = overlay.querySelector("[data-ie-modal-title]");
    var bodyEl = overlay.querySelector("[data-ie-modal-body]");
    var fullPageEl = overlay.querySelector("[data-ie-modal-fullpage]");

    titleEl.textContent = config.title || "";
    bodyEl.innerHTML = "";

    if (config.fullPageHref) {
      fullPageEl.setAttribute("href", config.fullPageHref);
      fullPageEl.setAttribute("target", "_self");
      fullPageEl.style.display = "inline-flex";
    } else {
      fullPageEl.removeAttribute("href");
      fullPageEl.style.display = "none";
    }

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    if (typeof config.render === "function") {
      config.render(bodyEl);
    }

    var onKeyDown = function (event) {
      if (event.key === "Escape") closeModal();
    };
    overlay._ieOnKeyDown = onKeyDown;
    document.addEventListener("keydown", onKeyDown);

    // Prevent background scroll on mobile
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var overlay = document.querySelector(".ie-modal-overlay");
    if (!overlay) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    if (overlay._ieOnKeyDown) {
      document.removeEventListener("keydown", overlay._ieOnKeyDown);
      overlay._ieOnKeyDown = null;
    }

    document.body.style.overflow = "";
  }

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.ui = window.IEPortal.ui || {};
  window.IEPortal.ui.openModal = openModal;
  window.IEPortal.ui.closeModal = closeModal;
})();

