/**
 * Cookie consent banner — public site only.
 * Loads partials/cookie-banner.html when no consent is stored; persists choice in localStorage.
 * Exposes IECookieConsent.hasAccepted() for future analytics.
 */
(function () {
  var STORAGE_KEY = 'cookie_consent';
  var BANNER_URL = '/ItalianExperience/partials/cookie-banner.html';
  var MOUNT_ID = 'cookie-banner-mount';
  var bannerInjected = false;
  var fetchStarted = false;

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
  }

  function hideBanner() {
    var banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.setAttribute('aria-hidden', 'true');
      banner.style.display = 'none';
    }
  }

  function getOrCreateMount() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      mount = document.createElement('div');
      mount.id = MOUNT_ID;
      document.body.appendChild(mount);
    }
    return mount;
  }

  function attachListeners(banner) {
    if (!banner) return;

    var acceptBtn = banner.querySelector('[data-action="accept"]');
    var rejectBtn = banner.querySelector('[data-action="reject"]');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('accepted');
        hideBanner();
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        setConsent('rejected');
        hideBanner();
      });
    }
  }

  function injectBanner(html) {
    if (bannerInjected) return;
    bannerInjected = true;

    var mount = getOrCreateMount();
    mount.innerHTML = html;

    var banner = document.getElementById('cookie-banner');
    attachListeners(banner);
  }

  function init() {
    if (getConsent() !== null) return;
    if (fetchStarted) return;
    fetchStarted = true;

    fetch(BANNER_URL)
      .then(function (res) { return res.ok ? res.text() : Promise.reject(new Error('Not ok')); })
      .then(function (html) {
        if (getConsent() !== null) return; /* User might have chosen on another tab */
        injectBanner(html);
      })
      .catch(function () {
        fetchStarted = false;
        bannerInjected = false;
      });
  }

  window.IECookieConsent = {
    hasAccepted: function () {
      return localStorage.getItem(STORAGE_KEY) === 'accepted';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
