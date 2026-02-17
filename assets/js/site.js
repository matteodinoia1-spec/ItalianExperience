document.addEventListener('DOMContentLoaded', () => {
  // Build EXPERIENCE letters
  document.querySelectorAll('.font-ex').forEach(ex => {
    const text = ex.getAttribute('data-text') || '';
    ex.innerHTML = text.split('').map(c => `<span class="letter">${c}</span>`).join('');
  });

  // Header smart scroll
  const header = document.getElementById('main-header');
  let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;

  window.addEventListener('scroll', () => {
    const y = window.pageYOffset || document.documentElement.scrollTop;

    if (y > lastScrollY && y > 100) header?.classList.add('nav-up');
    else header?.classList.remove('nav-up');

    if (y > 50) header?.classList.add('scrolled');
    else header?.classList.remove('scrolled');

    lastScrollY = y <= 0 ? 0 : y;
  }, { passive: true });

  // Mobile menu open/close
  const menuBtn = document.getElementById('central-menu-btn');
  const closeBtn = document.getElementById('close-menu');
  const overlay = document.getElementById('mobile-menu-overlay');

  const lockBody = (locked) => {
    document.body.classList.toggle('menu-open', locked);
  };

  const openMenu = () => {
    if (!overlay) return;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    lockBody(true);
  };

  const closeMenu = () => {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    lockBody(false);
  };

  menuBtn?.addEventListener('click', (e) => { e.preventDefault(); openMenu(); });
  closeBtn?.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); });

  overlay?.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('[data-close]')) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Mobile accordion
  const accBtns = Array.from(document.querySelectorAll('.mobile-acc-btn'));

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

  // Active states (desktop + mobile)
  const path = (window.location.pathname || '').toLowerCase();

  const section =
    path.includes('/travel/') ? 'travel' :
    path.includes('/recruitment/') ? 'recruitment' :
    path.includes('/flavors/') ? 'flavors' :
    path.includes('/estates/') ? 'estates' :
    path.includes('/contact/') ? 'contact' :
    'home';

  document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));

  // Optional: auto-open the matching accordion on mobile
  const map = { travel: 'm-travel', recruitment: 'm-recruitment', flavors: 'm-flavors' };
  const panelId = map[section];
  if (panelId) {
    const btn = document.querySelector(`.mobile-acc-btn[aria-controls="${panelId}"]`);
    if (btn) setAcc(btn, true);
  }

  // Logo prism mouse effect (desktop only)
  const initLogoMouse = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const it = el.querySelector('.font-it');
    const letters = el.querySelectorAll('.letter');
    if (!it || !letters.length) return;

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;

      const itRect = it.getBoundingClientRect();
      const itX = itRect.left + itRect.width / 2 - r.left;
      const dIt = Math.abs(x - itX);
      const pIt = Math.max(0, (200 - dIt) / 200);

      it.style.textShadow = `0 0 ${15 * pIt}px rgba(197,160,89,0.5)`;
      it.style.transform = `scale(${1 + pIt * 0.05})`;

      const green = getComputedStyle(document.documentElement).getPropertyValue('--it-green').trim();
      const red = getComputedStyle(document.documentElement).getPropertyValue('--it-red').trim();

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
  };

  initLogoMouse('logo-header');
  initLogoMouse('logo-footer');
});
