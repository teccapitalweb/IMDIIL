(function () {
  'use strict';

  const VERSION = 'v1';
  const STORAGE_PREFIX = `imdiil:onboarding:panel:${VERSION}`;
  const steps = [
    {
      title: 'Bienvenido a tu panel IMDIIL',
      copy: 'Este es tu centro de capacitación en ingeniería industrial. Desde aquí puedes continuar tu aprendizaje, consultar recursos y administrar tu cuenta.',
      selectors: ['.sidebar .brand', '.topbar__left', '.topbar']
    },
    {
      title: 'Tu ruta de cursos',
      copy: 'En Mis cursos encuentras la videoteca de seguridad, calidad, logística y producción. Aquí retomas clases, revisas tu avance y obtienes certificados al completar cada programa.',
      selectors: ['.sidebar .nav-item[data-section="cursos"]', '.mobile-nav__item[data-section="cursos"]', '[data-section="cursos"]']
    },
    {
      title: 'Clases en vivo',
      copy: 'Consulta las próximas sesiones con especialistas de la industria y vuelve cuando quieras para revisar las transmisiones que queden disponibles.',
      selectors: ['.sidebar .nav-item[data-section="webinars"]', '.mobile-nav__item[data-section="webinars"]', '[data-section="webinars"]']
    },
    {
      title: 'PDFs y material técnico',
      copy: 'Aquí están tus plantillas, procedimientos, checklists y formatos descargables para aplicar lo aprendido directamente en planta.',
      selectors: ['.sidebar .nav-item[data-section="pdfs"]', '.mobile-drawer__item[data-section="pdfs"]', '#mobile-nav-more', '.main']
    },
    {
      title: 'Herramientas para la operación',
      copy: 'Usa la Matriz IPER, la calculadora OEE, el generador ATS, la tabla NOM-STPS y los indicadores logísticos para resolver tareas reales con mayor rapidez.',
      selectors: ['.sidebar .nav-item[data-tool="iper"]', '.mobile-drawer__item[data-tool="iper"]', '#mobile-nav-more', '.main']
    },
    {
      title: 'Comunidad industrial',
      copy: 'El Foro y el Directorio VIP te conectan con profesionales para compartir casos de planta, resolver dudas y ampliar tu red.',
      selectors: ['.sidebar .nav-item[data-section="foro"]', '.mobile-drawer__item[data-section="foro"]', '#mobile-nav-more', '.aside']
    },
    {
      title: 'Perfil y configuración',
      copy: 'En Mi perfil actualizas tus datos y preferencias. En Suscripción puedes consultar o gestionar tu plan. Podrás repetir este recorrido desde el botón “Ver recorrido guiado”.',
      selectors: ['.sidebar .nav-item[data-section="perfil"]', '#btn-avatar', '.mobile-drawer__item[data-section="perfil"]', '#mobile-nav-more']
    }
  ];

  const state = { active: false, index: 0, anchor: null, accountId: null, previousFocus: null, previousOverflow: '' };
  let layer;
  let dialog;
  let spotlight;
  let titleEl;
  let copyEl;
  let countEl;
  let fillEl;
  let backBtn;
  let nextBtn;
  let automaticTimer = null;

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
  }

  function resolveAnchor(step) {
    for (const selector of step.selectors) {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (isVisible(candidate)) return candidate;
      }
    }
    return null;
  }

  function availableIndex(from, direction) {
    let index = from;
    while (index >= 0 && index < steps.length) {
      if (resolveAnchor(steps[index])) return index;
      index += direction;
    }
    return -1;
  }

  function accountId() {
    const user = window.UserState || {};
    const id = user.uid || user.email;
    return id ? String(id).trim().toLowerCase() : '';
  }

  function storageKey(id) { return `${STORAGE_PREFIX}:${id}`; }

  function wasSeen(id) {
    if (!id) return false;
    try { return Boolean(localStorage.getItem(storageKey(id))); } catch (error) { return false; }
  }

  function markSeen(reason) {
    if (!state.accountId) return;
    try {
      localStorage.setItem(storageKey(state.accountId), JSON.stringify({ version: VERSION, status: reason, viewedAt: new Date().toISOString() }));
    } catch (error) { /* El recorrido sigue funcionando sin almacenamiento. */ }
  }

  function ensureUi() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'onboarding-tour-layer';
    layer.hidden = true;
    layer.innerHTML = `
      <div class="onboarding-tour-backdrop" aria-hidden="true"></div>
      <div class="onboarding-tour-spotlight" aria-hidden="true"></div>
      <section class="onboarding-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-tour-title" aria-describedby="onboarding-tour-copy" tabindex="-1">
        <div class="onboarding-tour-inner">
          <div class="onboarding-tour-top">
            <span class="onboarding-tour-eyebrow">Recorrido IMDIIL</span>
            <button class="onboarding-tour-skip" type="button">Omitir</button>
          </div>
          <h2 class="onboarding-tour-title" id="onboarding-tour-title"></h2>
          <p class="onboarding-tour-copy" id="onboarding-tour-copy"></p>
          <div class="onboarding-tour-progress-row" aria-live="polite">
            <div class="onboarding-tour-progress" aria-hidden="true"><div class="onboarding-tour-progress-fill"></div></div>
            <span class="onboarding-tour-count"></span>
          </div>
          <div class="onboarding-tour-actions">
            <button class="onboarding-tour-btn onboarding-tour-btn--back" type="button">Anterior</button>
            <button class="onboarding-tour-btn onboarding-tour-btn--next" type="button">Siguiente</button>
          </div>
        </div>
      </section>`;
    document.body.appendChild(layer);
    dialog = layer.querySelector('.onboarding-tour-dialog');
    spotlight = layer.querySelector('.onboarding-tour-spotlight');
    titleEl = layer.querySelector('.onboarding-tour-title');
    copyEl = layer.querySelector('.onboarding-tour-copy');
    countEl = layer.querySelector('.onboarding-tour-count');
    fillEl = layer.querySelector('.onboarding-tour-progress-fill');
    backBtn = layer.querySelector('.onboarding-tour-btn--back');
    nextBtn = layer.querySelector('.onboarding-tour-btn--next');
    layer.querySelector('.onboarding-tour-skip').addEventListener('click', () => finish('omitted'));
    backBtn.addEventListener('click', previous);
    nextBtn.addEventListener('click', next);
  }

  function positionUi() {
    if (!state.active || !state.anchor || !isVisible(state.anchor)) return;
    const rect = state.anchor.getBoundingClientRect();
    const pad = 7;
    const left = Math.max(5, rect.left - pad);
    const top = Math.max(5, rect.top - pad);
    const right = Math.min(innerWidth - 5, rect.right + pad);
    const bottom = Math.min(innerHeight - 5, rect.bottom + pad);
    Object.assign(spotlight.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(2, right - left)}px`, height: `${Math.max(2, bottom - top)}px` });

    if (innerWidth <= 640) {
      dialog.style.removeProperty('left');
      dialog.style.removeProperty('top');
      const targetIsLower = rect.top + (rect.height / 2) > innerHeight / 2;
      dialog.classList.toggle('onboarding-tour-dialog--mobile-top', targetIsLower);
      dialog.classList.toggle('onboarding-tour-dialog--mobile-bottom', !targetIsLower);
      return;
    }
    dialog.classList.remove('onboarding-tour-dialog--mobile-top', 'onboarding-tour-dialog--mobile-bottom');
    const gap = 18;
    const boxW = dialog.offsetWidth;
    const boxH = dialog.offsetHeight;
    let boxLeft;
    let boxTop;
    if (innerWidth - rect.right >= boxW + gap) boxLeft = rect.right + gap;
    else if (rect.left >= boxW + gap) boxLeft = rect.left - boxW - gap;
    else boxLeft = Math.min(Math.max(14, rect.left), innerWidth - boxW - 14);
    boxTop = Math.min(Math.max(14, rect.top), innerHeight - boxH - 14);
    if (rect.left < boxLeft + boxW && rect.right > boxLeft && rect.bottom + gap + boxH <= innerHeight) boxTop = rect.bottom + gap;
    Object.assign(dialog.style, { left: `${boxLeft}px`, top: `${boxTop}px` });
  }

  function show(index, direction) {
    const actual = availableIndex(index, direction || 1);
    if (actual < 0) { finish('completed'); return; }
    state.index = actual;
    state.anchor = resolveAnchor(steps[actual]);
    const step = steps[actual];
    titleEl.textContent = step.title;
    copyEl.textContent = step.copy;
    countEl.textContent = `${actual + 1} de ${steps.length}`;
    fillEl.style.width = `${((actual + 1) / steps.length) * 100}%`;
    backBtn.disabled = availableIndex(actual - 1, -1) < 0;
    nextBtn.textContent = availableIndex(actual + 1, 1) < 0 ? 'Finalizar' : 'Siguiente';
    state.anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(positionUi);
    setTimeout(positionUi, 230);
    nextBtn.focus({ preventScroll: true });
  }

  function next() {
    const target = availableIndex(state.index + 1, 1);
    if (target < 0) finish('completed');
    else show(target, 1);
  }

  function previous() {
    const target = availableIndex(state.index - 1, -1);
    if (target >= 0) show(target, -1);
  }

  function finish(reason) {
    if (!state.active) return;
    markSeen(reason);
    state.active = false;
    layer.hidden = true;
    document.body.classList.remove('onboarding-tour-open');
    document.body.style.overflow = state.previousOverflow;
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', positionUi);
    window.removeEventListener('scroll', positionUi, true);
    if (state.previousFocus && state.previousFocus.isConnected) state.previousFocus.focus({ preventScroll: true });
  }

  function onKeydown(event) {
    if (!state.active) return;
    if (event.key === 'Escape') { event.preventDefault(); finish('omitted'); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); next(); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled])')).filter(isVisible);
    if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function start(options) {
    const opts = options || {};
    if (state.active) return;
    const id = accountId();
    if (opts.automatic && (!id || wasSeen(id))) return;
    ensureUi();
    const first = availableIndex(0, 1);
    if (first < 0) return;
    state.accountId = id;
    state.previousFocus = document.activeElement;
    state.previousOverflow = document.body.style.overflow;
    state.active = true;
    layer.hidden = false;
    document.body.classList.add('onboarding-tour-open');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', positionUi);
    window.addEventListener('scroll', positionUi, true);
    show(first, 1);
  }

  function blockingDialogVisible() {
    const selectors = [
      '[aria-modal="true"]',
      '.modal-backdrop',
      '.modal.active',
      '.modal-overlay.active',
      '.curso-modal-overlay.active',
      '#splash-bienvenida',
      '#splash-completado',
      '#visorOverlay',
      '#imdiil-install-pop'
    ];
    return Array.from(document.querySelectorAll(selectors.join(', ')))
      .some((el) => !el.classList.contains('onboarding-tour-dialog') && isVisible(el));
  }

  function scheduleAutomatic(attempt) {
    const id = accountId();
    const ready = Boolean(id && window.UserState && window.UserState.modo !== 'cargando');
    if (!ready) {
      if (attempt < 80) {
        clearTimeout(automaticTimer);
        automaticTimer = setTimeout(() => scheduleAutomatic(attempt + 1), 500);
      }
      return;
    }
    if (wasSeen(id)) return;
    if (blockingDialogVisible()) {
      clearTimeout(automaticTimer);
      automaticTimer = setTimeout(() => scheduleAutomatic(0), 500);
      return;
    }
    clearTimeout(automaticTimer);
    automaticTimer = setTimeout(() => {
      automaticTimer = null;
      const latestId = accountId();
      const stillReady = Boolean(latestId && latestId === id && window.UserState && window.UserState.modo !== 'cargando');
      if (!stillReady) {
        scheduleAutomatic(attempt + 1);
        return;
      }
      if (wasSeen(latestId)) return;
      if (blockingDialogVisible()) {
        scheduleAutomatic(0);
        return;
      }
      start({ automatic: true });
    }, 650);
  }

  function addLaunchers() {
    const actions = document.querySelector('.topbar__right');
    if (actions && !document.getElementById('imdiil-tour-help')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'imdiil-tour-help';
      button.className = 'icon-btn onboarding-tour-launcher';
      button.setAttribute('aria-label', 'Ver recorrido guiado');
      button.title = 'Recorrido guiado';
      button.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.7"/><path d="M12 17h.01"/></svg>';
      button.addEventListener('click', () => start({ automatic: false }));
      actions.insertBefore(button, actions.firstChild);
    }
    const profileHero = document.querySelector('#dynamic-section .perfil-hero');
    if (profileHero && !document.getElementById('imdiil-tour-profile')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'imdiil-tour-profile';
      button.className = 'btn btn--ghost onboarding-tour-profile-btn';
      button.textContent = 'Ver recorrido guiado';
      button.addEventListener('click', () => start({ automatic: false }));
      profileHero.appendChild(button);
    }
  }

  window.startImdiilOnboarding = () => start({ automatic: false });
  window.__IMDIIL_ONBOARDING_VERSION = VERSION;

  function init() {
    addLaunchers();
    const dynamic = document.getElementById('dynamic-section');
    if (dynamic) new MutationObserver(addLaunchers).observe(dynamic, { childList: true, subtree: true });
    scheduleAutomatic(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
