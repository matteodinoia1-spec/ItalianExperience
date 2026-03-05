// -----------------------------------------------------------------------------
// Italian Experience Recruitment Portal - Session & Inactivity Utilities
// -----------------------------------------------------------------------------

(function () {
  "use strict";

  var INACTIVITY_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes
  var INACTIVITY_WARNING_BEFORE_MS = 1 * 60 * 1000; // 1 minute before logout
  var INACTIVITY_THROTTLE_MS = 1000; // Throttle mousemove/scroll

  function initInactivityTimer() {
    if (!window.IEAuth) return;
    if (window.__IE_INACTIVITY_INIT__) return;
    window.__IE_INACTIVITY_INIT__ = true;

    var logoutTimer = null;
    var warningTimer = null;
    var warningBanner = null;
    var throttleUntil = 0;

    function clearTimers() {
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
      }
    }

    function hideWarning() {
      if (warningBanner && warningBanner.parentNode) {
        warningBanner.parentNode.removeChild(warningBanner);
        warningBanner = null;
      }
    }

    function showWarning() {
      hideWarning();
      var banner = document.createElement("div");
      banner.setAttribute("role", "alert");
      banner.className =
        "fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg";
      banner.innerHTML =
        '<span class="text-sm font-medium">Sarai disconnesso tra 1 minuto per inattività.</span>' +
        '<button type="button" class="ie-btn ie-btn-secondary">Resta connesso</button>';
      var stayBtn = banner.querySelector("button");
      stayBtn.addEventListener("click", function () {
        hideWarning();
        resetTimers();
      });
      document.body.appendChild(banner);
      warningBanner = banner;
    }

    function scheduleTimers() {
      clearTimers();
      warningTimer = setTimeout(function () {
        warningTimer = null;
        showWarning();
      }, INACTIVITY_LOGOUT_MS - INACTIVITY_WARNING_BEFORE_MS);
      logoutTimer = setTimeout(function () {
        logoutTimer = null;
        performLogout();
      }, INACTIVITY_LOGOUT_MS);
    }

    function resetTimers() {
      hideWarning();
      scheduleTimers();
    }

    function performLogout() {
      clearTimers();
      hideWarning();
      if (!window.IEAuth) {
        if (
          window.IESupabase &&
          typeof window.IESupabase.redirectToLogin === "function"
        ) {
          window.IESupabase.redirectToLogin();
        }
        return;
      }
      window.IEAuth.logout()
        .then(function () {
          if (window.IEPortal && typeof window.IEPortal.clearSessionState === "function") {
            window.IEPortal.clearSessionState();
          }
          window.__IE_AUTH_USER__ = null;
          window.IEAuth.redirectToLogin();
        })
        .catch(function () {
          if (window.IEPortal && typeof window.IEPortal.clearSessionState === "function") {
            window.IEPortal.clearSessionState();
          }
          window.__IE_AUTH_USER__ = null;
          window.IEAuth.redirectToLogin();
        });
    }

    function onActivityThrottled() {
      var now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + INACTIVITY_THROTTLE_MS;
      resetTimers();
    }

    function onActivityImmediate() {
      throttleUntil = 0;
      resetTimers();
    }

    document.addEventListener("mousemove", onActivityThrottled, {
      passive: true,
    });
    document.addEventListener("scroll", onActivityThrottled, { passive: true });
    document.addEventListener("click", onActivityImmediate);
    document.addEventListener("keydown", onActivityImmediate);

    scheduleTimers();
  }

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.session = window.IEPortal.session || {};
  window.IEPortal.session.initInactivityTimer = initInactivityTimer;
})();

