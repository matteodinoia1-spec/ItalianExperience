// ============================================================================
// Italian Experience Recruitment Portal - Layout Runtime
// ----------------------------------------------------------------------------
// Sidebar toggle, overlay, responsive layout, and resize handling.
// Extracted from app-shell.js.
// ============================================================================

(function () {
  "use strict";

  function isMobileViewport() {
    return window.innerWidth < 1024;
  }

  function isSidebarOpen(sidebar) {
    return sidebar.classList.contains("open") || document.body.classList.contains("ie-sidebar-open");
  }

  function openSidebar(sidebar) {
    sidebar.classList.add("open");
    document.body.classList.add("ie-sidebar-open");
  }

  function closeSidebar(sidebar) {
    sidebar.classList.remove("open");
    document.body.classList.remove("ie-sidebar-open");
  }

  function toggleSidebar(sidebar) {
    if (isSidebarOpen(sidebar)) closeSidebar(sidebar);
    else openSidebar(sidebar);
  }

  function syncBodyWithSidebar(sidebar) {
    if (sidebar.classList.contains("open")) {
      document.body.classList.add("ie-sidebar-open");
    } else {
      document.body.classList.remove("ie-sidebar-open");
    }
  }

  function ensureSidebarOverlay() {
    var el = document.querySelector(".ie-sidebar-overlay");
    if (el) return el;

    el = document.createElement("div");
    el.className = "ie-sidebar-overlay";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  var layoutInitialized = false;

  function initLayout() {
    var sidebar = document.getElementById("sidebar");
    var headerToggleButtons = document.querySelectorAll(
      '[data-toggle="sidebar"], .portal-header-toggle'
    );

    if (!sidebar) return;

    // When already initialized, only bind any new toggle buttons (e.g. in header
    // injected after bootstrap). Avoids duplicate document/window/overlay listeners.
    if (layoutInitialized) {
      headerToggleButtons.forEach(function (btn) {
        if (btn.__ieSidebarToggleBound) return;
        btn.__ieSidebarToggleBound = true;
        btn.addEventListener("click", function () {
          toggleSidebar(sidebar);
        });
      });
      return;
    }

    var overlay = ensureSidebarOverlay();

    headerToggleButtons.forEach(function (btn) {
      if (btn.__ieSidebarToggleBound) return;
      btn.__ieSidebarToggleBound = true;
      btn.addEventListener("click", function () {
        toggleSidebar(sidebar);
      });
    });

    window.toggleSidebar = toggleSidebarPublic;

    overlay.addEventListener("click", function () {
      closeSidebar(sidebar);
    });

    document.addEventListener("click", function (event) {
      if (!isMobileViewport()) return;
      if (!isSidebarOpen(sidebar)) return;

      if (event.target.closest("#sidebar")) return;
      if (event.target.closest('[data-toggle="sidebar"], .portal-header-toggle')) return;

      closeSidebar(sidebar);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!isMobileViewport()) return;
      if (!isSidebarOpen(sidebar)) return;
      closeSidebar(sidebar);
    });

    window.addEventListener(
      "resize",
      function () {
        if (!isMobileViewport()) {
          document.body.classList.remove("ie-sidebar-open");
          sidebar.classList.remove("open");
        }
      },
      { passive: true }
    );

    syncBodyWithSidebar(sidebar);
    var mo = new MutationObserver(function () {
      syncBodyWithSidebar(sidebar);
    });
    mo.observe(sidebar, { attributes: true, attributeFilter: ["class"] });

    layoutInitialized = true;
  }

  function toggleSidebarPublic() {
    var s = document.getElementById("sidebar");
    if (s) toggleSidebar(s);
  }

  window.IELayoutRuntime = {
    initLayout: initLayout,
    toggleSidebar: toggleSidebarPublic,
  };
})();
