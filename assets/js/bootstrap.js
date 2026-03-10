;(function () {
  const base = (window.IEConfig && window.IEConfig.BASE_PATH) || '/ItalianExperience';

  function inject(el, html) {
    if (el) el.innerHTML = html;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initPage(doc) {
    const d = doc || document;
    const headerMount = d.getElementById('site-header');
    const footerMount = d.getElementById('site-footer');

    try {
      const [headerHtml, footerHtml] = await Promise.all([
        fetch(base + '/partials/header.html').then((r) => {
          if (!r.ok) throw new Error('Header ' + r.status);
          return r.text();
        }),
        fetch(base + '/partials/footer.html').then((r) => {
          if (!r.ok) throw new Error('Footer ' + r.status);
          return r.text();
        }),
      ]);

      inject(headerMount, headerHtml);
      inject(footerMount, footerHtml);

      await loadScript(base + '/assets/js/site.js');

      if (window.IEInit) {
        window.IEInit(document);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function run() {
    initPage(document);
  }

  window.IEBootstrap = window.IEBootstrap || {};
  window.IEBootstrap.initPage = initPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

