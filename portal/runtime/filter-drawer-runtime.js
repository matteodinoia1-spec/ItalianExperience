/**
 * Filter drawer behavior for pages using .page-layout-with-filters.
 * On mobile: open drawer via [data-toggle-filter-drawer], close via [data-close-filter-drawer] or backdrop.
 * No-op when the layout is not present.
 */
(function () {
  "use strict";

  function init() {
    var layout = document.querySelector(".page-layout-with-filters");
    if (!layout) return;

    var toggle = document.querySelector("[data-toggle-filter-drawer]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        layout.classList.toggle("filter-drawer-open");
      });
    }

    document.querySelectorAll("[data-close-filter-drawer]").forEach(function (el) {
      el.addEventListener("click", function () {
        layout.classList.remove("filter-drawer-open");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
