/* Pointer-led art direction. Content stays usable without this enhancement. */
(() => {
  'use strict';
  const root = document.documentElement;
  const main = document.getElementById('main');
  const nav = document.getElementById('main-nav');
  if (!main || !nav) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const surfaceSelector = [
    '.home-portrait-v18', '.about-snapshot-v18', '.contact-photo-v18', '.portrait-editorial-v13', '.type-card', '.subject-tabs-v14 button',
    '.film-cover', '.book-cover', '.hobbies-v12 .facet-grid article',
    '.life-photo', '.strategy-card', '.education-duo>article',
    '.certificate-cards>button', '.service-grid>article', '.script-card',
    '.trait-spread-v14>article', '.contact-lines>a', '.contact-lines>button',
    '.program-visual', '.feedback-feature', '.platform-chapter', '.battle-process article',
    '.connection-preview', '.subject-panel-v14', '.capability-focus-v14',
    '.software-detail-v14', '.learning-trail>article', '.youtube-metrics>div',
    '.overseas-proof-card', '.evidence-image', '.preview-picture', '.portal-v16>a', '.featured-media', '.featured-manuscript', '.operation-proof>button'
  ].join(',');
  const tiltSelector = '.portrait-editorial-v13,.type-card,.subject-tabs-v14 button,.film-cover,.book-cover,.life-photo,.education-duo>article,.script-card';
  const revealSelector = '.page-heading,.network-title,.about-copy-v13,.portrait-editorial-v13,.section-heading,.trait-spread-v14>article,.type-card,.hobbies-v12 .facet-grid article,.life-photo,.subject-tabs-v14 button,.subject-panel-v14,.program-grid>article,.film-card,.script-card,.book-object,.education-duo>article,.certificate-cards>button,.strategy-card,.service-grid>article,.battle-process article,.contact-prelude,.contact-title-row,.contact-lines,.skills-mode-bar,.skills-studio-v14,.software-studio-v14,.platform-chapter,.learning-trail>article,.featured-works,.operation-spotlight,.portal-v16>a';
  const magneticSelector = '.contact-invitation,.text-link,.all-link,.brand,.scene-toolbar button,.chapter-index-v14 button';
  const decorativeSelector = '.subject-tab-art,.subject-large-art,.entj-prism,.libra-sculpture,.trait-index>i,.education-topline>svg,.reading-mark';
  const states = new Map();
  const returning = new Set();
  const decorations = new Set();
  const observedDecorations = new Set();
  const pendingReveals = new Set();
  const titleLights = new Set();
  let active = null, magnet = null, enabled = false, pointerEnabled = false;
  let raf = 0, refreshFrame = 0, lastTime = 0, scrollDirty = true, navDirty = true;
  let pointerSeen = false, pointerX = innerWidth / 2, pointerY = innerHeight / 2;
  let haloX = pointerX, haloY = pointerY, cursorX = pointerX, cursorY = pointerY;
  let selectedNav = null, cursorMode = '', dragging = false;
  const ambient = document.createElement('div');
  ambient.className = 'kinetic-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = '<i></i><b></b>';
  const cursor = document.createElement('div');
  cursor.className = 'kinetic-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span></span>';
  const progress = document.createElement('div');
  progress.className = 'kinetic-progress';
  progress.setAttribute('aria-hidden', 'true');
  const glider = document.createElement('span');
  glider.className = 'kinetic-nav-glider';
  glider.setAttribute('aria-hidden', 'true');
  nav.append(glider);
  document.body.append(ambient, cursor, progress);

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const requestFrame = () => { if (!raf && !document.hidden && enabled) raf = requestAnimationFrame(frame); };
  const inView = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-kinetic-seen', '');
        inView.unobserve(entry.target);
        pendingReveals.delete(entry.target);
      }
    }
  }, { threshold: 0.06 });
  const scenery = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) decorations.add(entry.target);
      else decorations.delete(entry.target);
    }
    scrollDirty = true;
    requestFrame();
  }, { rootMargin: '80px' });

  function prepare() {
    refreshFrame = 0;
    if (active && !active.isConnected) { active = null; resetMagnet(); }
    for (const [element] of states) {
      if (!element.isConnected) {
        states.delete(element);
        returning.delete(element);
        inView.unobserve(element);
      }
    }
    for (const element of observedDecorations) if (!element.isConnected) {
      scenery.unobserve(element);
      decorations.delete(element);
      observedDecorations.delete(element);
    }
    for (const element of pendingReveals) if (!element.isConnected) {
      inView.unobserve(element);
      pendingReveals.delete(element);
    }
    for (const element of titleLights) if (!element.isConnected) titleLights.delete(element);
    main.querySelectorAll('.page-heading em,.network-title em,.about-copy-v13 h1 em,.contact-title-row em,.books-heading-row em').forEach(element => {
      element.classList.add('kinetic-title-light');
      titleLights.add(element);
    });
    for (const element of main.querySelectorAll(surfaceSelector)) {
      if (states.has(element) || element.closest('.play-stage,.table-scroll,dialog')) continue;
      element.setAttribute('data-kinetic-surface', '');
      if (element.matches(tiltSelector)) element.setAttribute('data-kinetic-tilt', '');
      // One noninteractive highlight layer, separate from the original imagery.
      const sheen = document.createElement('span');
      sheen.className = 'kinetic-sheen';
      sheen.setAttribute('aria-hidden', 'true');
      // Preserve first/last-child styling on existing captions and action rows.
      element.insertBefore(sheen, element.children.length > 1 ? element.lastElementChild : null);
      states.set(element, { x: 0, y: 0, tx: 0, ty: 0, live: false });
    }
    let order = 0;
    for (const element of main.querySelectorAll(revealSelector)) {
      if (element.hasAttribute('data-kinetic-reveal')) continue;
      element.setAttribute('data-kinetic-reveal', '');
      element.style.setProperty('--enter-delay', `${(order++ % 4) * 45}ms`);
      if (!enabled) element.setAttribute('data-kinetic-seen', '');
      else { inView.observe(element); pendingReveals.add(element); }
    }
    for (const element of main.querySelectorAll(decorativeSelector)) {
      if (element.hasAttribute('data-kinetic-depth')) continue;
      element.setAttribute('data-kinetic-depth', '');
      observedDecorations.add(element);
      scenery.observe(element);
    }
    main.querySelectorAll(magneticSelector).forEach(element => element.setAttribute('data-kinetic-magnet', ''));
    document.querySelectorAll('.site-header .brand,.site-header .all-link').forEach(element => element.setAttribute('data-kinetic-magnet', ''));
    navDirty = scrollDirty = true;
    requestFrame();
  }

  function resetSurface(element) {
    const state = states.get(element);
    if (!state) return;
    state.tx = state.ty = 0;
    state.live = false;
    element.removeAttribute('data-kinetic-hover');
    returning.add(element);
  }

  function resetMagnet() {
    if (!magnet) return;
    magnet.style.removeProperty('--magnet-x');
    magnet.style.removeProperty('--magnet-y');
    magnet.removeAttribute('data-magnet-active');
    magnet = null;
  }

  function setCursor(target) {
    let mode = '', label = '';
    if (target.closest('.play-stage')) { mode = 'drag'; label = dragging ? '转动' : '拖动'; }
    else if (target.closest('[data-video]')) { mode = 'view'; label = '播放'; }
    else if (target.closest('[data-book]')) { mode = 'view'; label = '翻阅'; }
    else if (target.closest('[data-image],.strategy-card a')) { mode = 'view'; label = '查看'; }
    else if (target.closest('a,button,summary')) { mode = 'link'; label = '↗'; }
    if (mode !== cursorMode || cursor.textContent !== label) {
      cursorMode = mode;
      cursor.dataset.mode = mode;
      cursor.firstElementChild.textContent = label;
    }
  }

  function pointerMove(event) {
    if (!pointerEnabled || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    pointerX = event.clientX; pointerY = event.clientY;
    if (!pointerSeen) {
      haloX = cursorX = pointerX; haloY = cursorY = pointerY;
      pointerSeen = true;
    }
    root.setAttribute('data-pointer-present', '');
    setCursor(target);
    const next = target.closest('[data-kinetic-surface]');
    if (next !== active) {
      if (active) resetSurface(active);
      active = next;
    }
    if (active && !dragging) {
      const box = active.getBoundingClientRect(), state = states.get(active);
      if (state && box.width && box.height) {
        state.tx = clamp((pointerX - box.left) / box.width * 2 - 1, -1, 1);
        state.ty = clamp((pointerY - box.top) / box.height * 2 - 1, -1, 1);
        state.live = true;
        active.setAttribute('data-kinetic-hover', '');
        returning.add(active);
      }
    }
    const nextMagnet = target.closest('[data-kinetic-magnet]');
    if (nextMagnet !== magnet) { resetMagnet(); magnet = nextMagnet; }
    if (magnet && !dragging) {
      const box = magnet.getBoundingClientRect();
      magnet.style.setProperty('--magnet-x', `${clamp((pointerX - box.left - box.width / 2) * .12, -7, 7)}px`);
      magnet.style.setProperty('--magnet-y', `${clamp((pointerY - box.top - box.height / 2) * .16, -5, 5)}px`);
      magnet.setAttribute('data-magnet-active', '');
    }
    const hoveredNav = target.closest('#main-nav a');
    if (hoveredNav !== selectedNav) { selectedNav = hoveredNav; navDirty = true; }
    requestFrame();
  }

  function frame(time) {
    raf = 0;
    if (!enabled || document.hidden) return;
    const dt = Math.min(48, Math.max(1, time - (lastTime || time - 16)));
    lastTime = time;
    const ease = 1 - Math.exp(-dt / 95), haloEase = 1 - Math.exp(-dt / 240);
    let unsettled = false;
    if (pointerEnabled && pointerSeen) {
      cursorX += (pointerX - cursorX) * ease; cursorY += (pointerY - cursorY) * ease;
      haloX += (pointerX - haloX) * haloEase; haloY += (pointerY - haloY) * haloEase;
      cursor.style.transform = `translate3d(${cursorX.toFixed(2)}px,${cursorY.toFixed(2)}px,0)`;
      ambient.style.transform = `translate3d(${haloX.toFixed(2)}px,${haloY.toFixed(2)}px,0)`;
      for (const element of titleLights) element.style.setProperty('--title-light', `${(clamp(haloX / innerWidth, 0, 1) * 100).toFixed(2)}%`);
      unsettled = Math.abs(haloX - pointerX) + Math.abs(haloY - pointerY) > .2;
    }
    for (const element of returning) {
      const state = states.get(element);
      if (!state || !element.isConnected) { returning.delete(element); continue; }
      state.x += (state.tx - state.x) * ease; state.y += (state.ty - state.y) * ease;
      element.style.setProperty('--light-x', `${((state.x + 1) * 50).toFixed(2)}%`);
      element.style.setProperty('--light-y', `${((state.y + 1) * 50).toFixed(2)}%`);
      element.style.setProperty('--tilt-x', `${(-state.y * 3.2).toFixed(3)}deg`);
      element.style.setProperty('--tilt-y', `${(state.x * 4.2).toFixed(3)}deg`);
      element.style.setProperty('--drift-x', `${(state.x * 7).toFixed(2)}px`);
      element.style.setProperty('--drift-y', `${(state.y * 6).toFixed(2)}px`);
      const pending = Math.abs(state.x - state.tx) + Math.abs(state.y - state.ty) > .002;
      if (pending) unsettled = true;
      else returning.delete(element);
    }
    if (navDirty) {
      navDirty = false;
      const item = selectedNav?.isConnected ? selectedNav : nav.querySelector('[aria-current]');
      if (item) {
        const box = item.getBoundingClientRect(), parent = nav.getBoundingClientRect();
        glider.style.width = `${box.width}px`;
        glider.style.transform = `translateX(${box.left - parent.left + nav.scrollLeft}px)`;
        glider.style.opacity = '1';
      } else glider.style.opacity = '0';
    }
    if (scrollDirty) {
      scrollDirty = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
      root.toggleAttribute('data-page-scrolled', scrollY > 24);
      if (pointerEnabled) for (const element of decorations) {
        if (!element.isConnected) { decorations.delete(element); continue; }
        const box = element.getBoundingClientRect();
        const offset = clamp((innerHeight / 2 - box.top - box.height / 2) / innerHeight, -.8, .8) * 22;
        element.style.setProperty('--scroll-drift', `${offset.toFixed(2)}px`);
      }
    }
    if (unsettled) requestFrame();
  }

  function leave() {
    root.removeAttribute('data-pointer-present');
    if (active) resetSurface(active);
    active = null;
    resetMagnet();
    selectedNav = null; navDirty = true;
    requestFrame();
  }

  function sync() {
    enabled = root.dataset.motion !== 'off' && !reduce.matches;
    // Mobile keeps the artwork and sphere, without continuous decorative scroll work.
    enabled = enabled && innerWidth > 800 && fine.matches;
    pointerEnabled = enabled;
    root.dataset.kinetic = enabled ? 'on' : 'off';
    root.dataset.kineticPointer = pointerEnabled ? 'on' : 'off';
    if (!enabled || !pointerEnabled) {
      leave();
      for (const [element, state] of states) {
        state.x = state.y = state.tx = state.ty = 0;
        element.removeAttribute('data-kinetic-hover');
        for (const key of ['--tilt-x','--tilt-y','--drift-x','--drift-y']) element.style.removeProperty(key);
      }
      returning.clear();
    }
    if (!enabled) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      main.querySelectorAll('[data-kinetic-reveal]').forEach(element => element.setAttribute('data-kinetic-seen', ''));
    } else { navDirty = scrollDirty = true; requestFrame(); }
  }

  document.addEventListener('pointermove', pointerMove, { passive: true });
  document.addEventListener('pointerover', pointerMove, { passive: true });
  document.addEventListener('pointerdown', () => { dragging = true; cursor.classList.add('is-pressed'); }, { passive: true });
  document.addEventListener('pointerup', () => { dragging = false; cursor.classList.remove('is-pressed'); }, { passive: true });
  document.addEventListener('pointercancel', () => { dragging = false; cursor.classList.remove('is-pressed'); leave(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  document.addEventListener('keydown', event => { if (event.key === 'Tab') leave(); });
  window.addEventListener('scroll', () => { scrollDirty = true; requestFrame(); }, { passive: true });
  nav.addEventListener('scroll', () => { navDirty = true; requestFrame(); }, { passive: true });
  window.addEventListener('resize', () => { sync(); scrollDirty = navDirty = true; requestFrame(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; leave(); }
    else { scrollDirty = navDirty = true; requestFrame(); }
  });
  reduce.addEventListener('change', sync);
  fine.addEventListener('change', sync);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  new MutationObserver(records => {
    const changed = records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && !node.classList.contains('kinetic-sheen')) || record.removedNodes.length);
    if (changed && !refreshFrame) refreshFrame = requestAnimationFrame(prepare);
  }).observe(main, { childList: true, subtree: true });
  new MutationObserver(() => { navDirty = true; requestFrame(); }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  sync();
  prepare();
})();
