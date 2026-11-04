/* IMDIIL · cola de experiencias (misma lógica que SYNOVA)
   Garantiza que los popups del panel nunca se encimen: bienvenida/cofre,
   ficha profesional, curso gratis, recorrido, avisos push e instalación.
   Uso: IMDIILExperienceQueue.request({ key, priority, ready(), open(done) }). */
(function (root) {
  'use strict';

  var pending = [];
  var queued = Object.create(null);
  var active = null;
  var sequence = 0;
  var timer = null;

  // Cualquier ventana visible de estos tipos bloquea la cola.
  var DIALOGS = [
    '#welcome-gift', '#profile-intake-modal', '#free-course-intro', '#splash-bienvenida',
    '.modal-backdrop.is-open', '.v2-modal', '.v2-unlock-splash', '.v2-doc-viewer',
    '#visorOverlay', '.ips-overlay', '#imdiil-install-pop.show', '.onb-overlay'
  ].join(',');

  function visible(element) {
    if (!element || !element.isConnected || !element.getClientRects().length) return false;
    var style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && element.getAttribute('aria-hidden') !== 'true';
  }

  function hasExternalDialog() {
    if (document.body && document.body.classList.contains('onboarding-tour-open')) return true;
    return Array.prototype.some.call(document.querySelectorAll(DIALOGS), function (element) {
      if (active && element.closest('[data-imdiil-experience="' + active.key + '"]')) return false;
      return visible(element);
    });
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(pump, delay == null ? 60 : delay);
  }

  function release(key) {
    if (!active || (key && active.key !== key)) return;
    var finished = active;
    active = null;
    delete queued[finished.key];
    window.dispatchEvent(new CustomEvent('imdiil:experience:end', { detail: { key: finished.key } }));
    schedule(320);
  }

  function pump() {
    if (active || !pending.length) return;
    if (document.visibilityState === 'hidden' || hasExternalDialog()) { schedule(400); return; }
    pending.sort(function (a, b) { return b.priority - a.priority || a.sequence - b.sequence; });
    var item = pending.shift();
    if (typeof item.ready === 'function' && !item.ready()) {
      if (item.expiresAt > Date.now()) pending.push(item);
      else delete queued[item.key];
      schedule(600);
      return;
    }
    active = item;
    window.dispatchEvent(new CustomEvent('imdiil:experience:start', { detail: { key: item.key } }));
    var completed = false;
    function done() {
      if (completed) return;
      completed = true;
      release(item.key);
    }
    try {
      var result = item.open(done);
      if (result === false) done();
      else if (result && typeof result.then === 'function') result.then(function (value) { if (value === false) done(); }, done);
    } catch (error) {
      console.warn('[IMDIIL] experiencia ' + item.key + ':', error && error.message || error);
      done();
    }
  }

  function request(options) {
    options = options || {};
    var key = String(options.key || '').trim();
    if (!key || typeof options.open !== 'function') return false;
    if (queued[key] || (active && active.key === key)) return false;
    queued[key] = true;
    pending.push({
      key: key,
      priority: Number(options.priority || 0),
      sequence: sequence++,
      open: options.open,
      ready: options.ready,
      expiresAt: Date.now() + Math.max(1000, Number(options.maxWait || 180000))
    });
    schedule(0);
    return true;
  }

  window.addEventListener('focus', function () { schedule(0); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') schedule(0); });

  var initialFlowDone = function () { return window.__IMDIIL_INITIAL_FLOW_DONE === true || window.__isDemoMode === true; };

  root.IMDIILExperienceQueue = {
    request: request,
    release: release,
    isBusy: function () { return !!active || hasExternalDialog(); },
    activeKey: function () { return active && active.key || ''; },
    afterInitialFlow: initialFlowDone
  };

  // ─── Invitación a instalar la app (una vez por dispositivo, después del flujo inicial) ───
  function installed() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function installKey() {
    var uid = (window.UserState && window.UserState.uid) || 'anon';
    return 'imdiil:install-invite:v1:' + uid;
  }
  function seenInstall() { try { return !!localStorage.getItem(installKey()); } catch (_) { return true; } }

  function openInstallInvite(done) {
    var pop = document.getElementById('imdiil-install-pop');
    var topbarBtn = document.getElementById('install-app-btn');
    if (!pop || !topbarBtn || installed() || seenInstall()) return false;
    try { localStorage.setItem(installKey(), new Date().toISOString()); } catch (_) {}
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var iosHelp = document.getElementById('iip-ios-help');
    if (iosHelp) iosHelp.style.display = isIOS ? '' : 'none';
    pop.setAttribute('data-imdiil-experience', 'install-app');
    pop.hidden = false;
    pop.classList.add('show');
    var installNow = document.getElementById('iip-install-btn');
    var close = function () {
      pop.classList.remove('show');
      pop.hidden = true;
      observer.disconnect();
      done();
    };
    var observer = new MutationObserver(function () { if (!pop.classList.contains('show')) close(); });
    observer.observe(pop, { attributes: true, attributeFilter: ['class'] });
    if (installNow && !installNow.dataset.imdiilWired) {
      installNow.dataset.imdiilWired = '1';
      installNow.addEventListener('click', function () {
        pop.classList.remove('show');
        topbarBtn.click(); // usa el mismo flujo del botón Instalar (prompt nativo o guía de iOS)
      });
    }
    return true;
  }

  function scheduleInstallInvite() {
    if (installed() || seenInstall() || window.__isDemoMode) return;
    request({
      key: 'install-app',
      priority: 10,
      maxWait: 10 * 60 * 1000,
      ready: function () { return initialFlowDone() && !!document.getElementById('install-app-btn'); },
      open: openInstallInvite
    });
  }

  // Se agenda cuando la sesión está lista; solo si la cuenta ya tiene uid.
  var tries = 0;
  (function waitUser() {
    if (window.UserState && window.UserState.uid) { setTimeout(scheduleInstallInvite, 8000); return; }
    if (tries++ < 60) setTimeout(waitUser, 1000);
  })();
})(window);
