/* IMDIIL · notificaciones web push (misma lógica que IMFRA/SYNOVA)
   Consentimiento explícito, guía para iPhone/iPad instalado, preferencias por
   categoría en Mi perfil, presencia de la app instalada y cola de popups. */
(function () {
  'use strict';

  var API = function () { return String(window.WEBHOOK_URL || 'https://imdiil-webhook-production.up.railway.app').replace(/\/$/, ''); };
  var SYNC_MS = 24 * 60 * 60 * 1000;
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var categories = {
    service: ['Servicio', 'Bienvenida y avisos para usar tu cuenta.'],
    promotions: ['Beneficios VIP', 'Beneficios y promociones de la membresía.'],
    learning: ['Aprendizaje', 'Cursos pendientes y clases en vivo.'],
    activity: ['Créditos y logros', 'Créditos recibidos y certificados listos.'],
    admin: ['Avisos importantes', 'Información administrativa de IMDIIL.']
  };

  function user() { return window.__currentUser || (window.__auth && window.__auth.currentUser) || null; }
  function uid() { var u = user(); return (u && u.uid) || (window.UserState && window.UserState.uid) || ''; }
  function localGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function localSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function answerKey() { return 'imdiil:push:consent:v1:' + uid(); }
  function syncKey() { return 'imdiil:push:sync:' + uid(); }
  function demo() { return window.__isDemoMode || (window.UserState && window.UserState.modo === 'invitado'); }

  function toast(kind, title, detail) {
    if (window.Toast && typeof window.Toast[kind] === 'function') window.Toast[kind](title, detail || '');
    else if (kind === 'error') window.alert(title + (detail ? '\n' + detail : ''));
  }

  function base64ToBytes(value) {
    var padding = '='.repeat((4 - value.length % 4) % 4);
    var binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function api(path, options) {
    options = options || {};
    var current = user();
    if (!current || !current.getIdToken) throw new Error('Tu sesión aún no está lista.');
    var token = await current.getIdToken();
    var response = await fetch(API() + path, {
      method: options.method || 'GET',
      cache: 'no-store',
      headers: Object.assign({ Authorization: 'Bearer ' + token }, options.body ? { 'Content-Type': 'application/json' } : {}),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + response.status));
    return data;
  }

  // ─── Presencia de la app instalada (señales mínimas, sin IP ni user-agent completo) ───
  function browserName() {
    var ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/CriOS\//.test(ua)) return 'Chrome iOS';
    if (/FxiOS\//.test(ua)) return 'Firefox iOS';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Otro';
  }
  function deviceType() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  var presenceSent = false;
  async function reportPresence(source) {
    if (!uid() || demo()) return;
    if (presenceSent && source !== 'installed_event') return;
    presenceSent = true;
    try {
      await api('/api/app-presence', {
        method: 'POST',
        body: {
          source: source || (standalone ? 'standalone_launch' : 'browser_visit'),
          displayMode: standalone ? 'standalone' : 'browser',
          installConfirmed: source === 'installed_event' || standalone,
          notificationPermission: supported ? Notification.permission : 'unsupported',
          platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '',
          deviceType: deviceType(),
          browser: browserName(),
          locale: navigator.language || 'es-MX',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City'
        }
      });
    } catch (_) { presenceSent = false; /* nunca interrumpe la experiencia */ }
  }

  // ─── Suscripción ───
  async function serviceWorker() {
    var registration = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  }

  async function browserSubscription() {
    if (!supported) return null;
    var registration = await navigator.serviceWorker.getRegistration();
    return registration ? registration.pushManager.getSubscription() : null;
  }

  async function subscribe() {
    var registration = await serviceWorker();
    var subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      var response = await fetch(API() + '/api/push/public-key', { cache: 'no-store' });
      var key = await response.json().catch(function () { return {}; });
      if (!response.ok || !key.configured || !key.publicKey) throw new Error(key.error || 'Las notificaciones todavía no están disponibles.');
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key.publicKey) });
    }
    var result = await api('/api/push/subscribe', {
      method: 'POST',
      body: {
        consent: true,
        subscription: subscription.toJSON(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
        locale: navigator.language || 'es-MX',
        platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ''
      }
    });
    localSet(answerKey(), 'yes');
    localSet(syncKey(), String(Date.now()));
    return result;
  }

  async function enable() {
    if (isIOS && !standalone) throw new Error('En iPhone o iPad primero agrega IMDIIL a tu pantalla de inicio y ábrela desde ese ícono.');
    if (!supported) throw new Error('Este navegador no permite notificaciones push.');
    var permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') throw new Error('Las notificaciones están bloqueadas. Puedes permitirlas desde los ajustes del sitio.');
    var result = await subscribe();
    presenceSent = false; reportPresence();
    return result;
  }

  async function disable() {
    localSet(answerKey(), 'no');
    if (!supported) return;
    var subscription = await browserSubscription();
    if (!subscription) return;
    await api('/api/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(function () {});
    await subscription.unsubscribe().catch(function () {});
  }

  async function active() {
    if (!supported || Notification.permission !== 'granted') return false;
    return Boolean(await browserSubscription());
  }

  function status() { return api('/api/push/status'); }
  function savePreferences(preferences) { return api('/api/push/preferences', { method: 'PATCH', body: { preferences: preferences } }); }

  // ─── Popup de consentimiento ───
  function iosGuide(card, finish) {
    card.innerHTML = '<div class="ips-icon">📲</div><h2>Actívalas desde tu pantalla de inicio</h2><p>En iPhone y iPad, Apple permite los avisos web cuando IMDIIL está instalada:</p>' +
      '<div class="ips-list"><span>1. Toca <b>Compartir</b> ↑</span><span>2. Elige <b>Agregar a inicio</b></span><span>3. Abre IMDIIL desde el ícono</span><span>4. Activa los avisos en Mi perfil</span></div>' +
      '<div class="ips-actions" style="grid-template-columns:1fr"><button type="button" data-ips-close>Entendido</button></div>';
    card.querySelector('[data-ips-close]').addEventListener('click', finish);
  }

  function askConsent(done) {
    done = typeof done === 'function' ? done : function () {};
    if (!uid() || document.querySelector('.ips-overlay')) { done(); return false; }
    var overlay = document.createElement('div');
    overlay.className = 'ips-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ips-title');
    overlay.setAttribute('data-imdiil-experience', 'push-consent');
    overlay.innerHTML = '<div class="ips-dialog"><button type="button" class="ips-close" data-ips-close aria-label="Cerrar">×</button><div class="ips-icon">🔔</div><h2 id="ips-title">¿Quieres recibir avisos de IMDIIL?</h2>' +
      '<p>Te acompañamos fuera del panel con mensajes útiles y breves. Tú eliges qué categorías recibir.</p>' +
      '<div class="ips-list"><span>📚 Cursos y clases en vivo</span><span>🏆 Créditos y certificados</span><span>⭐ Beneficios VIP</span><span>📢 Avisos importantes</span></div>' +
      '<div class="ips-actions"><button type="button" data-ips-no>No por ahora</button><button type="button" data-ips-yes>Sí, activar</button></div>' +
      '<span class="ips-note">Puedes desactivarlas o elegir categorías en Mi perfil. No sustituye los correos de tu cuenta.</span></div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    var closed = false;
    var close = function (after) {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('is-open');
      setTimeout(function () { overlay.remove(); done(); if (typeof after === 'function') after(); }, 230);
    };
    // Cerrar sin responder (X, clic fuera o Esc): se vuelve a ofrecer en unos días.
    var later = function () { localSet(answerKey(), 'later:' + Date.now()); close(); };
    var onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); later(); } };
    document.addEventListener('keydown', onKey, true);
    overlay.querySelector('[data-ips-close]').addEventListener('click', later);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) later(); });
    overlay.querySelector('[data-ips-no]').addEventListener('click', function () { localSet(answerKey(), 'no'); close(); });
    overlay.querySelector('[data-ips-yes]').addEventListener('click', async function (event) {
      if (isIOS && !standalone) { localSet(answerKey(), 'ios'); iosGuide(overlay.querySelector('.ips-dialog'), close); return; }
      var button = event.currentTarget;
      button.disabled = true; button.textContent = 'Activando…';
      try {
        await enable();
        close(function () { toast('success', '¡Avisos activados!', 'IMDIIL te avisará en este dispositivo.'); });
      } catch (error) {
        // Nunca deja el popup trabado: se cierra y explica el motivo (visible, ya sin el popup encima).
        localSet(answerKey(), 'later:' + Date.now());
        close(function () { toast('info', 'No se activaron los avisos', (error && error.message) || 'Inténtalo más tarde desde Mi perfil.'); });
      }
    });
    return true;
  }

  function shouldAsk() {
    var answer = localGet(answerKey());
    if (answer === 'yes' || answer === 'no') return false;
    if (answer && answer.indexOf('later:') === 0 && Date.now() - Number(answer.slice(6) || 0) < LATER_MS) return false;
    if (answer === 'ios' && !(isIOS && standalone)) return false;
    if (supported && Notification.permission === 'denied') return false;
    if (!supported && !isIOS) return false;
    return true;
  }

  var LATER_MS = 3 * 24 * 60 * 60 * 1000;
  var reviewed = false;
  function reviewConsent() {
    if (reviewed || demo() || !uid()) return;
    reviewed = true;
    reportPresence();
    if (supported && Notification.permission === 'granted') {
      if (Date.now() - Number(localGet(syncKey()) || 0) > SYNC_MS) subscribe().catch(function () {});
      return;
    }
    if (!shouldAsk()) return;
    // Si el servidor aún no tiene las llaves de notificaciones, no se ofrece el popup.
    fetch(API() + '/api/push/public-key', { cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (key) { if (key && key.configured && key.publicKey) queueConsent(); })
      .catch(function () {});
  }

  function queueConsent() {
    var queue = window.IMDIILExperienceQueue;
    if (queue) {
      // Después del flujo inicial (bienvenida → recorrido → ficha → curso gratis).
      // Deja pasar primero la invitación al curso gratis (sale unos segundos después del flujo).
      var flowDoneAt = 0;
      queue.request({
        key: 'push-consent', priority: 20, maxWait: 15 * 60 * 1000, open: askConsent,
        ready: function () {
          if (!queue.afterInitialFlow()) return false;
          if (!flowDoneAt) flowDoneAt = Date.now();
          return Date.now() - flowDoneAt > 12000 && !document.getElementById('free-course-intro');
        }
      });
      return;
    }
    var attempts = 0;
    (function wait() {
      var busy = document.querySelector('#welcome-gift, #profile-intake-modal, #free-course-intro, #splash-bienvenida, .modal-backdrop.is-open, .v2-modal')
        || document.body.classList.contains('onboarding-tour-open') || window.__IMDIIL_INITIAL_FLOW_DONE !== true;
      if (busy && attempts++ < 200) { setTimeout(wait, 1500); return; }
      askConsent();
    })();
  }

  // ─── Ajustes en Mi perfil ───
  async function mountSettings(host) {
    if (!host || host.dataset.ipsMounted === '1') return;
    host.dataset.ipsMounted = '1';
    var blockedMessage = '';
    if (demo() || !uid()) blockedMessage = 'Inicia sesión con tu cuenta IMDIIL para activar avisos en este dispositivo.';
    else if (isIOS && !standalone) blockedMessage = 'En iPhone/iPad: Compartir → Agregar a inicio; abre IMDIIL desde el ícono y vuelve aquí.';
    else if (!supported) blockedMessage = 'Este navegador no admite notificaciones. Usa Chrome, Edge o Safari actualizado.';
    else if (Notification.permission === 'denied') blockedMessage = 'Los avisos están bloqueados en el navegador. Permítelos en los ajustes de este sitio.';
    host.innerHTML = '<div class="ips-settings"><div class="ips-master"><div><strong>Avisos en este dispositivo</strong><small>Recíbelos aunque el panel esté cerrado.</small></div><label class="ips-switch"><input type="checkbox" data-ips-master aria-label="Activar avisos"><i></i></label></div>' +
      (blockedMessage ? '<div class="ips-message">' + blockedMessage + '</div>' : '') +
      '<div class="ips-categories" data-ips-categories></div><div class="ips-message">Horario tranquilo: las promociones y recordatorios se reservan entre 9:00 p. m. y 8:00 a. m. Los créditos y certificados pueden llegar al momento.</div></div>';
    var master = host.querySelector('[data-ips-master]');
    master.disabled = Boolean(blockedMessage);
    var remote = { preferences: {} };
    if (!demo() && uid()) { try { remote = await status(); } catch (_) {} }
    master.checked = await active().catch(function () { return false; });
    var list = host.querySelector('[data-ips-categories]');
    list.innerHTML = Object.keys(categories).map(function (key) {
      var item = categories[key];
      var checked = !remote.preferences || remote.preferences[key] !== false;
      return '<label class="ips-category"><span><b>' + item[0] + '</b><small>' + item[1] + '</small></span><span class="ips-switch"><input type="checkbox" data-ips-category="' + key + '" ' + (checked ? 'checked' : '') + '><i></i></span></label>';
    }).join('');
    list.querySelectorAll('[data-ips-category]').forEach(function (input) {
      input.disabled = !master.checked;
      input.addEventListener('change', async function () {
        var preferences = {};
        list.querySelectorAll('[data-ips-category]').forEach(function (item) { preferences[item.dataset.ipsCategory] = item.checked; });
        list.querySelectorAll('input').forEach(function (item) { item.disabled = true; });
        try { await savePreferences(preferences); toast('success', 'Preferencias guardadas'); }
        catch (error) { input.checked = !input.checked; toast('error', 'No se pudo guardar', error.message); }
        list.querySelectorAll('input').forEach(function (item) { item.disabled = !master.checked; });
      });
    });
    master.addEventListener('change', async function () {
      var wants = master.checked;
      master.disabled = true;
      try {
        if (wants) await enable(); else await disable();
        list.querySelectorAll('input').forEach(function (item) { item.disabled = !wants; });
        toast('success', wants ? 'Avisos activados' : 'Avisos desactivados', wants ? 'Llegarán a este dispositivo.' : 'Este dispositivo dejó de recibirlos.');
      } catch (error) {
        master.checked = !wants;
        toast('info', 'No se pudo cambiar', error.message);
      } finally { master.disabled = Boolean(blockedMessage); }
    });
  }

  // Inserta la tarjeta "Notificaciones" en Mi perfil sin tocar su renderizador.
  function attachToProfile() {
    var grid = document.querySelector('.perfil-grid');
    if (!grid || grid.querySelector('[data-imdiil-push-settings]')) return;
    var card = document.createElement('div');
    card.className = 'perfil-card';
    card.style.gridColumn = '1/-1';
    card.innerHTML = '<div class="perfil-card__title">Notificaciones</div><div data-imdiil-push-settings><div class="perfil-field"><span class="perfil-field__lbl">Cargando preferencias…</span></div></div>';
    grid.appendChild(card);
    mountSettings(card.querySelector('[data-imdiil-push-settings]'));
  }
  var profileObserver = new MutationObserver(function () { if (document.querySelector('.perfil-grid')) attachToProfile(); });
  function startObserver() { profileObserver.observe(document.body, { childList: true, subtree: true }); attachToProfile(); }
  if (document.body) startObserver(); else document.addEventListener('DOMContentLoaded', startObserver);

  window.addEventListener('appinstalled', function () { standalone = true; reportPresence('installed_event'); });

  // Arranca cuando la sesión está lista.
  var tries = 0;
  (function waitUser() {
    if (uid()) { setTimeout(reviewConsent, 3500); return; }
    if (tries++ < 90) setTimeout(waitUser, 1000);
  })();

  window.IMDIILPush = { enable: enable, disable: disable, active: active, status: status, mountSettings: mountSettings, askConsent: askConsent, reportPresence: reportPresence, supported: supported };
})();
