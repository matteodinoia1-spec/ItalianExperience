(function () {
  function buildExperienceLetters(root) {
    (root || document).querySelectorAll('.font-ex').forEach(ex => {
      const text = ex.getAttribute('data-text') || '';
      ex.innerHTML = text.split('').map(c => `<span class="letter">${c}</span>`).join('');
    });
  }

  function initHeaderSmartScroll() {
    const header = document.getElementById('main-header');
    if (!header) return;

    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;

    window.addEventListener('scroll', () => {
      const y = window.pageYOffset || document.documentElement.scrollTop;

      if (y > lastScrollY && y > 100) header.classList.add('nav-up');
      else header.classList.remove('nav-up');

      if (y > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');

      lastScrollY = y <= 0 ? 0 : y;
    }, { passive: true });
  }

  function initMobileMenu() {
    const menuBtn = document.getElementById('central-menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (!menuBtn || !closeBtn || !overlay) return;

    let lastFocus = null;

    const lockBody = (locked) => {
      document.body.classList.toggle('menu-open', locked);
    };

    const openMenu = () => {
      lastFocus = document.activeElement;
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      menuBtn.setAttribute('aria-expanded', 'true');
      lockBody(true);
      const firstLink = overlay.querySelector('a, button');
      if (firstLink) firstLink.focus();
    };

    const closeMenu = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
      lockBody(false);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    menuBtn.addEventListener('click', (e) => { e.preventDefault(); openMenu(); });
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); });

    overlay.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('[data-close]')) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function initMobileAccordion() {
    const accBtns = Array.from(document.querySelectorAll('.mobile-acc-btn'));
    if (!accBtns.length) return;

    const setAcc = (btn, open) => {
      const id = btn.getAttribute('aria-controls');
      const panel = id ? document.getElementById(id) : null;
      if (!panel) return;

      btn.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (open) {
        panel.hidden = false;
        const inner = panel.querySelector('.mobile-sub-inner');
        const h = inner ? inner.scrollHeight : 0;
        panel.style.maxHeight = Math.max(80, h + 16) + 'px';
      } else {
        panel.style.maxHeight = '0px';
        window.setTimeout(() => { panel.hidden = true; }, 260);
      }
    };

    accBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        setAcc(btn, !isOpen);
      });
    });

    const refreshOpen = () => {
      accBtns.forEach(btn => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (isOpen) setAcc(btn, true);
      });
    };

    refreshOpen();
    setTimeout(refreshOpen, 150);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(refreshOpen, 120));
    }
  }

  function initActiveNav() {
    const path = (window.location.pathname || '').toLowerCase();

    const section =
      path.includes('/travel/') ? 'travel' :
      path.includes('/recruitment/') ? 'recruitment' :
      path.includes('/flavors/') ? 'flavors' :
      path.includes('/estates/') ? 'estates' :
      path.includes('/contact/') ? 'contact' :
      'home';

    document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));

    const map = { travel: 'm-travel', recruitment: 'm-recruitment', flavors: 'm-flavors' };
    const panelId = map[section];
    if (panelId) {
      const btn = document.querySelector(`.mobile-acc-btn[aria-controls="${panelId}"]`);
      if (btn) {
        btn.setAttribute('aria-expanded', 'true');
        const panel = document.getElementById(panelId);
        if (panel) panel.hidden = false;
      }
    }
  }

  function initLogoMouse(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const it = el.querySelector('.font-it');
    const letters = el.querySelectorAll('.letter');
    if (!it || !letters.length) return;

    const green = getComputedStyle(document.documentElement).getPropertyValue('--it-green').trim();
    const red = getComputedStyle(document.documentElement).getPropertyValue('--it-red').trim();

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;

      const itRect = it.getBoundingClientRect();
      const itX = itRect.left + itRect.width / 2 - r.left;
      const dIt = Math.abs(x - itX);
      const pIt = Math.max(0, (200 - dIt) / 200);

      it.style.textShadow = `0 0 ${15 * pIt}px rgba(197,160,89,0.5)`;
      it.style.transform = `scale(${1 + pIt * 0.05})`;

      letters.forEach(l => {
        const lr = l.getBoundingClientRect();
        const lx = lr.left + lr.width / 2 - r.left;
        const dx = Math.abs(x - lx);

        if (dx < 110) {
          const p = (110 - dx) / 110;
          l.style.color = (x > lx + 14) ? green : (x < lx - 14 ? red : '#FFF');
          l.style.transform = `scale(${1 + p * 0.42}) translateY(${-p * 10}px)`;
          l.style.zIndex = '20';
        } else {
          l.style.color = '';
          l.style.transform = '';
          l.style.zIndex = '10';
        }
      });
    });

    el.addEventListener('mouseleave', () => {
      it.style.textShadow = '';
      it.style.transform = '';
      letters.forEach(l => { l.style.color = ''; l.style.transform = ''; l.style.zIndex = ''; });
    });
  }

  function IEInit(root) {
    buildExperienceLetters(root);
    initActiveNav();
    initMobileAccordion();
    initMobileMenu();
    initHeaderSmartScroll();
    initLogoMouse('logo-header');
    initLogoMouse('logo-footer');
  }

  window.IEInit = IEInit;

  document.addEventListener('DOMContentLoaded', () => {
    IEInit(document);
  });
})();
