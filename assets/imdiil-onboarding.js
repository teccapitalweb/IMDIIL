// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Experiencia inicial del panel (misma secuencia y lógica que IMFRA)
//
//   1. Bienvenida post-pago (splash) o regalo de créditos de bienvenida
//   2. Recorrido guiado (onboarding-tour.js)
//   3. Ficha profesional (nombre, WhatsApp, área, empresa → Directorio VIP)
//   4. Invitación para elegir el curso gratis (vip-panel.html · cursos)
//
// Los avisos de una sola vez se confirman en el servidor (/onboarding) para
// no repetirse al cambiar de navegador o dispositivo.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const celebrate = level => { try { window.celebrarImdiil?.(level === 'big' ? 'grande' : 'normal'); } catch (e) {} };
  const API = () => String(window.WEBHOOK_URL || '').replace(/\/$/, '');

  async function idToken() {
    let user = window.__auth?.currentUser || window.__currentUser;
    for (let i = 0; !user && i < 40; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
      user = window.__auth?.currentUser || window.__currentUser;
    }
    if (!user) throw new Error('Inicia sesión para continuar.');
    return user.getIdToken();
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = Object.assign({ Authorization: `Bearer ${await idToken()}` }, opts.headers || {});
    if (opts.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(API() + path, Object.assign({ cache: 'no-store' }, opts, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'No pudimos completar la operación.'), { status: response.status });
    return data;
  }

  // ─── API de la experiencia inicial ───
  let statePromise = null;
  const Onboarding = {
    // Entrega (una sola vez) y lee el regalo de bienvenida y el saldo.
    hydrate(force) {
      if (!statePromise || force) {
        statePromise = request('/onboarding/state').then(data => {
          const balance = Math.max(0, Number(data.balance) || 0);
          if (window.UserState) window.UserState.creditos = balance;
          window.dispatchEvent(new CustomEvent('imdiil:credits-changed', { detail: { balance } }));
          return data;
        }).catch(error => { statePromise = null; throw error; });
      }
      return statePromise;
    },
    async claimExperience(experience, version) {
      const data = await request('/onboarding/experience/claim', { method: 'POST', body: JSON.stringify({ experience, version }) });
      return data.claimed === true;
    }
  };
  window.IMDIILOnboarding = Onboarding;

  // ═══════════════════════════════════════════════════════════════════
  // Regalo de bienvenida: aviso único, con el monto real del servidor.
  // ═══════════════════════════════════════════════════════════════════
  window.__showWelcomeCreditsGift = async function () {
    const S = window.UserState || {};
    const id = String(S.uid || S.email || '').toLowerCase();
    const finish = reason => window.dispatchEvent(new CustomEvent('imdiil:welcome-credits-finished', { detail: { reason } }));
    if (!id || S.modo === 'invitado' || window.__isDemoMode || document.getElementById('welcome-gift')) { finish('not-applicable'); return false; }
    const key = `imdiil:welcome-credits-pop:v1:${id}`;
    let seenOnThisDevice = false;
    try { seenOnThisDevice = Boolean(localStorage.getItem(key)); } catch (e) {}
    if (seenOnThisDevice) {
      Onboarding.claimExperience('welcome-credits', 'v1').catch(e => console.warn('[bienvenida] Sincronización pendiente', e));
      finish('local');
      return false;
    }
    let amount = 0;
    let balance = 0;
    try {
      const snap = await Onboarding.hydrate();
      amount = Math.max(0, Number(snap?.welcomeCredits) || 0);
      balance = Math.max(0, Number(snap?.balance) || 0);
    } catch (e) { console.warn('[bienvenida] No se pudo leer el saldo', e); }
    if (!amount || document.getElementById('welcome-gift')) { finish('empty'); return false; }
    let firstDisplay = false;
    try {
      firstDisplay = await Onboarding.claimExperience('welcome-credits', 'v1');
    } catch (e) {
      // Si el servidor no puede confirmar el primer uso, no repetimos un aviso dudoso.
      console.warn('[bienvenida] No se pudo confirmar el aviso único', e);
      finish('unavailable');
      return false;
    }
    try { localStorage.setItem(key, new Date().toISOString()); } catch (e) {}
    if (!firstDisplay || document.getElementById('welcome-gift')) { finish('server'); return false; }

    await showCreditChest({
      kicker: 'Regalo de bienvenida',
      titleHtml: `¡Recibiste <em>${fmt(amount)} créditos</em> de bienvenida!`,
      desc: 'Te los damos por unirte a IMDIIL. Ya están en tu saldo y alcanzan para canjear tu primer material; sigue ganando créditos en los retos para desbloquear libros, herramientas y más.',
      amount,
      balance,
      cta: 'Ver materiales para canjear',
      route: 'pdfs'
    });
    finish('shown');
    return true;
  };

  // ═══════════════════════════════════════════════════════════════════
  // Cofre con monedas: se usa para TODO crédito otorgado (bienvenida,
  // cortesía del admin, etc.). Resuelve cuando el usuario lo cierra.
  // ═══════════════════════════════════════════════════════════════════
  function chestMarkup(amount) {
    const coins = Array.from({ length: 14 }, (_, i) => {
      const angle = -150 + (120 / 13) * i + (Math.random() * 8 - 4);
      const dist = 62 + Math.random() * 46;
      const x = Math.cos(angle * Math.PI / 180) * dist;
      const y = Math.sin(angle * Math.PI / 180) * dist;
      return `<span class="cc-coin" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--d:${(0.72 + i * 0.035).toFixed(2)}s;--r:${(Math.random() * 540 - 270).toFixed(0)}deg">C</span>`;
    }).join('');
    return `<div class="cc-chest" aria-hidden="true"><i class="cc-glow"></i><i class="cc-rays"></i><div class="cc-coins">${coins}</div><div class="cc-lid"><i></i></div><div class="cc-box"><i class="cc-band"></i><i class="cc-lock"></i></div><b class="cc-amount">+${fmt(amount)}</b></div>`;
  }

  function showCreditChest(options) {
    const o = options || {};
    return new Promise(resolve => {
      document.getElementById('welcome-gift')?.remove();
      const pop = document.createElement('div');
      pop.id = 'welcome-gift';
      pop.className = 'is-chest';
      pop.innerHTML = `
      <div class="wg-backdrop"></div>
      <section class="wg-card" role="dialog" aria-modal="true" aria-labelledby="wg-title" aria-describedby="wg-desc">
        <button class="wg-close" type="button" aria-label="Cerrar">×</button>
        ${chestMarkup(o.amount)}
        <span class="wg-kicker">${esc(o.kicker || 'Créditos IMDIIL')}</span>
        <h2 id="wg-title">${o.titleHtml || `¡Recibiste <em>${fmt(o.amount)} créditos</em>!`}</h2>
        <p id="wg-desc">${esc(o.desc || 'Ya están en tu saldo. Úsalos para canjear libros, materiales y herramientas.')}</p>
        <div class="wg-balance"><span>Tu saldo actual</span><strong>${fmt(o.balance)} <small>créditos</small></strong></div>
        <div class="wg-actions">
          <button class="wg-later" type="button">Más tarde</button>
          <button class="wg-cta" type="button">${esc(o.cta || 'Ver en qué canjearlos')} <span aria-hidden="true">→</span></button>
        </div>
      </section>`;
      document.body.appendChild(pop);
      const previousFocus = document.activeElement;
      let closed = false;
      const close = goRoute => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        pop.classList.add('is-closing');
        setTimeout(() => {
          pop.remove();
          if (previousFocus && previousFocus.isConnected) previousFocus.focus?.({ preventScroll: true });
          if (goRoute && typeof window.navigateToSection === 'function') window.navigateToSection(goRoute);
          resolve();
        }, 200);
      };
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
      document.addEventListener('keydown', onKey, true);
      pop.querySelector('.wg-close').addEventListener('click', () => close());
      pop.querySelector('.wg-later').addEventListener('click', () => close());
      pop.querySelector('.wg-backdrop').addEventListener('click', () => close());
      pop.querySelector('.wg-cta').addEventListener('click', () => close(o.route || 'pdfs'));
      setTimeout(() => pop.querySelector('.wg-cta')?.focus({ preventScroll: true }), 80);
      setTimeout(() => celebrate('big'), 650);
    });
  }
  window.IMDIILCreditChest = { show: showCreditChest };

  // ─── Créditos otorgados (cortesía del admin, etc.) → cofre con monedas ───
  let noticesBusy = false;
  let noticesCheckedAt = 0;
  const popupOpen = () => !!document.querySelector('#welcome-gift, #profile-intake-modal, #free-course-intro, #splash-bienvenida, .v2-modal, .v2-unlock-splash, .v2-doc-viewer') || document.body.classList.contains('onboarding-tour-open');
  async function checkCreditNotices(force) {
    const S = window.UserState || {};
    if (noticesBusy || !S.uid || S.modo === 'invitado' || window.__isDemoMode) return;
    if (!force && Date.now() - noticesCheckedAt < 60000) return;
    if (popupOpen()) { setTimeout(() => checkCreditNotices(true), 4000); return; }
    noticesBusy = true;
    noticesCheckedAt = Date.now();
    try {
      const data = await request('/onboarding/credit-notices');
      const notices = Array.isArray(data.notices) ? data.notices : [];
      if (!notices.length) return;
      const balance = Math.max(0, Number(data.balance) || 0);
      if (window.UserState) window.UserState.creditos = balance;
      window.dispatchEvent(new CustomEvent('imdiil:credits-changed', { detail: { balance } }));
      const total = notices.reduce((sum, n) => sum + (Number(n.amount) || 0), 0);
      const single = notices.length === 1 ? notices[0] : null;
      // Se marcan vistos antes de mostrarse para no repetir el cofre en otro dispositivo.
      await request('/onboarding/credit-notices/seen', { method: 'POST', body: JSON.stringify({ ids: notices.map(n => n.id) }) }).catch(e => console.warn('[créditos] No se pudo marcar el aviso', e));
      if (popupOpen()) await new Promise(resolve => { const t = setInterval(() => { if (!popupOpen()) { clearInterval(t); resolve(); } }, 1500); });
      await showCreditChest({
        kicker: single ? single.title : 'Créditos acreditados',
        titleHtml: `¡Recibiste <em>${fmt(total)} créditos</em>!`,
        desc: single
          ? (single.note || 'IMDIIL te otorgó estos créditos. Ya están en tu saldo para canjear libros, materiales y herramientas.')
          : `Se acreditaron ${notices.length} asignaciones de créditos a tu cuenta. Ya están en tu saldo para canjear libros, materiales y herramientas.`,
        amount: total,
        balance,
        cta: 'Ver en qué canjearlos',
        route: 'pdfs'
      });
    } catch (e) {
      console.warn('[créditos] Avisos no disponibles', e?.message || e);
    } finally {
      noticesBusy = false;
    }
  }
  window.__checkCreditNotices = checkCreditNotices;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && window.__IMDIIL_INITIAL_FLOW_DONE) checkCreditNotices(); });
  setInterval(() => { if (document.visibilityState === 'visible' && window.__IMDIIL_INITIAL_FLOW_DONE) checkCreditNotices(); }, 3 * 60 * 1000);
  // Respaldo: si por algo el flujo inicial no corre, revisa igual al minuto.
  setTimeout(() => { if (!window.__IMDIIL_INITIAL_FLOW_DONE) checkCreditNotices(true); }, 60000);

  // ═══════════════════════════════════════════════════════════════════
  // Ficha profesional: se pide después de la bienvenida y del recorrido.
  // Se considera completa con nombre y WhatsApp; con ella se crea la
  // tarjeta del Directorio VIP.
  // ═══════════════════════════════════════════════════════════════════
  const DIR_COLORS = ['#FF7A2D', '#10B981', '#60A5FA', '#A78BFA', '#F87171', '#FBBF24', '#38BDF8', '#FB7185'];
  function dirColorFor(uid) {
    let h = 0; const s = String(uid || 'x');
    for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return DIR_COLORS[Math.abs(h) % DIR_COLORS.length];
  }

  // Vincula la ficha con el Directorio VIP sin pisar una tarjeta editada.
  async function linkDirectoryCard(profile) {
    const fs = window.__fs;
    const S = window.UserState || {};
    if (!fs?.setDoc || !fs?.getDoc || !S.uid) return;
    // El servidor refresca nombre, foto y estatus de la tarjeta (idempotente).
    try {
      await request('/directory/bootstrap', { method: 'PUT', body: JSON.stringify({ nombre: profile.nombre }) });
    } catch (e) { console.warn('[directorio] bootstrap', e?.message || e); }
    try {
      const ref = fs.doc(fs.db, 'directorio', S.uid);
      const snap = await fs.getDoc(ref);
      const data = snap.exists() ? snap.data() || {} : {};
      const payload = { uid: S.uid, updatedAt: fs.serverTimestamp() };
      if (!snap.exists()) {
        Object.assign(payload, {
          nombre: profile.nombre.slice(0, 50),
          puesto: profile.especialidad.slice(0, 60),
          empresa: profile.empresa.slice(0, 60),
          sector: '', bio: '',
          whatsapp: profile.whatsapp,
          email: String(S.email || ''),
          linkedin: '', web: '',
          visible: true,
          color: dirColorFor(S.uid),
          autoCreada: true
        });
        if (S.photoURL) payload.foto = S.photoURL;
      } else {
        if (!data.nombre) payload.nombre = profile.nombre.slice(0, 50);
        if (!data.whatsapp) payload.whatsapp = profile.whatsapp;
        if (!data.empresa && profile.empresa) payload.empresa = profile.empresa.slice(0, 60);
        if (!data.puesto && profile.especialidad) payload.puesto = profile.especialidad.slice(0, 60);
        if (!data.email && S.email) payload.email = String(S.email);
      }
      await fs.setDoc(ref, payload, { merge: true });
    } catch (e) { console.warn('[directorio] No se pudo vincular la ficha', e?.message || e); }
  }

  window.__IMDIIL_PROFILE_FLOW_READY = false;
  window.__maybeAskProfile = function () {
    let flowFinished = false;
    const legacyAskName = window.__maybeAskNameLegacy;
    try {
      if (document.getElementById('profile-intake-modal')) return;
      const S = window.UserState || {};
      const md = window.memberData || {};
      let local = {};
      try { local = JSON.parse(localStorage.getItem('imdiil_profile') || '{}') || {}; } catch (e) {}
      const intakeKey = `imdiil:profile-intake:v1:${String(S.uid || S.email || 'guest').toLowerCase()}`;

      const finish = (askLegacy) => {
        if (flowFinished) return;
        flowFinished = true;
        window.__IMDIIL_PROFILE_FLOW_READY = true;
        // Si la ficha no se mostró, se conserva la confirmación de nombre anterior.
        if (askLegacy && typeof legacyAskName === 'function') { try { legacyAskName(); } catch (e) {} }
        window.dispatchEvent(new CustomEvent('imdiil:profile-intake-finished'));
      };

      if (!S.uid || S.modo === 'demo' || S.modo === 'invitado' || window.__isDemoMode) { finish(false); return; }
      const intakeSeen = md.profileIntakeSeen === true || localStorage.getItem(intakeKey) === '1';
      if (intakeSeen) { finish(true); return; }
      const savedWhatsapp = String(md.whatsapp || local.whatsapp || '').trim();
      if (savedWhatsapp) {
        localStorage.setItem(intakeKey, '1');
        finish(true);
        return;
      }

      const email = String(S.email || '');
      const emailPart = email.split('@')[0] || '';
      const currentName = String(md.nombre || S.nombre || S.displayName || local.nombre || '').trim();
      const genericName = !currentName || currentName.toLowerCase() === emailPart.toLowerCase() || ['ingeniero', 'usuario vip', 'usuario'].includes(currentName.toLowerCase());

      const modal = document.createElement('div');
      modal.id = 'profile-intake-modal';
      modal.innerHTML = `
        <div class="pi-backdrop"></div>
        <section class="pi-panel" role="dialog" aria-modal="true" aria-labelledby="pi-title" aria-describedby="pi-intro">
          <button class="pi-close" type="button" aria-label="Completar después">×</button>
          <header class="pi-head">
            <span class="pi-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/><path d="M17 3.5h4M19 1.5v4"/></svg></span>
            <div><span>Un último paso</span><h2 id="pi-title">Completa tu ficha profesional</h2></div>
          </header>
          <p class="pi-intro" id="pi-intro">Así podremos identificar tu cuenta, emitir correctamente tus certificados y brindarte soporte personalizado dentro de IMDIIL.</p>
          <form class="pi-form" novalidate>
            <label class="pi-field"><span>Nombre completo <b>*</b></span><input name="nombre" value="${genericName ? '' : esc(currentName)}" required maxlength="60" autocomplete="name" placeholder="Ej. Ing. Laura Hernández Ruiz"></label>
            <label class="pi-field"><span>Correo de tu cuenta</span><input value="${esc(email)}" readonly disabled></label>
            <label class="pi-field"><span>WhatsApp <b>*</b></span><input name="whatsapp" value="${esc(savedWhatsapp)}" required maxlength="20" inputmode="tel" autocomplete="tel" placeholder="+52 238 123 4567"><small>Lo usaremos para identificar tu ficha y darte soporte.</small></label>
            <div class="pi-grid">
              <label class="pi-field"><span>Área profesional <em>(opcional)</em></span><input name="especialidad" value="${esc(md.especialidad || local.especialidad)}" maxlength="80" placeholder="Ingeniería industrial"></label>
              <label class="pi-field"><span>Empresa <em>(opcional)</em></span><input name="empresa" value="${esc(md.empresa || local.empresa)}" maxlength="80" autocomplete="organization" placeholder="Manufacturas del Centro"></label>
            </div>
            <p class="pi-error" role="alert" hidden></p>
            <p class="pi-privacy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>Tu nombre, correo y WhatsApp aparecerán en tu tarjeta del Directorio VIP; puedes editarlos u ocultarla cuando quieras.</p>
            <div class="pi-actions"><button class="pi-later" type="button">Ahora no</button><button class="pi-save" type="submit">Guardar y continuar <span>→</span></button></div>
          </form>
        </section>`;
      document.body.appendChild(modal);

      const form = modal.querySelector('.pi-form');
      const nameInput = form.elements.nombre;
      const whatsappInput = form.elements.whatsapp;
      const error = modal.querySelector('.pi-error');
      const submit = modal.querySelector('.pi-save');

      const rememberIntake = () => {
        try { localStorage.setItem(intakeKey, '1'); } catch (e) {}
        if (window.memberData) window.memberData.profileIntakeSeen = true;
        const fs = window.__fs;
        if (fs?.setDoc && S.uid) {
          fs.setDoc(fs.doc(fs.db, 'miembros', S.uid), {
            profileIntakeSeen: true,
            profileIntakeSeenAt: fs.serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      };
      const close = () => {
        rememberIntake();
        modal.classList.add('is-closing');
        setTimeout(() => { modal.remove(); finish(true); }, 190);
      };
      modal.querySelector('.pi-close').addEventListener('click', close);
      modal.querySelector('.pi-later').addEventListener('click', close);
      modal.querySelector('.pi-backdrop').addEventListener('click', close);
      setTimeout(() => (genericName ? nameInput : whatsappInput).focus(), 100);

      form.addEventListener('submit', async event => {
        event.preventDefault();
        const nombre = String(nameInput.value || '').trim().replace(/\s+/g, ' ');
        const whatsapp = String(whatsappInput.value || '').trim();
        const especialidad = String(form.elements.especialidad.value || '').trim();
        const empresa = String(form.elements.empresa.value || '').trim();
        error.hidden = true;
        if (nombre.length < 4 || !nombre.includes(' ')) {
          error.textContent = 'Escribe tu nombre y al menos un apellido.'; error.hidden = false; nameInput.focus(); return;
        }
        if (!/^\+?[0-9 ()\-.]{7,20}$/.test(whatsapp)) {
          error.textContent = 'Escribe un número de WhatsApp válido, incluyendo lada.'; error.hidden = false; whatsappInput.focus(); return;
        }
        submit.disabled = true; submit.textContent = 'Guardando…';
        try {
          if (window.__setDisplayName) {
            const authResult = await window.__setDisplayName(nombre);
            if (authResult && authResult.ok === false) throw new Error(authResult.error || 'No pudimos actualizar tu nombre.');
          }
          const fs = window.__fs;
          if (!fs || !fs.setDoc || !S.uid) throw new Error('No pudimos conectar con tu cuenta.');
          await fs.setDoc(fs.doc(fs.db, 'miembros', S.uid), {
            nombre, whatsapp, especialidad, empresa,
            perfilCompletadoAt: fs.serverTimestamp(),
            profileIntakeSeen: true,
            profileIntakeSeenAt: fs.serverTimestamp()
          }, { merge: true });
          Object.assign(S, { nombre, displayName: nombre, whatsapp, especialidad, empresa, iniciales: window.calcIniciales ? window.calcIniciales(nombre) : nombre.slice(0, 2).toUpperCase() });
          window.memberData = Object.assign({}, md, { nombre, whatsapp, especialidad, empresa, profileIntakeSeen: true });
          try {
            localStorage.setItem('imdiil_profile', JSON.stringify(Object.assign({}, local, { nombre, whatsapp, especialidad, empresa })));
            localStorage.setItem('imdiil_name_confirmed', '1');
            localStorage.setItem(intakeKey, '1');
          } catch (e) {}
          await linkDirectoryCard({ nombre, whatsapp, especialidad, empresa });
          if (typeof window.__applyUserState === 'function') window.__applyUserState();
          celebrate('normal');
          modal.classList.add('is-closing');
          setTimeout(() => { modal.remove(); finish(false); }, 210);
        } catch (err) {
          error.textContent = err?.message || 'No pudimos guardar tu ficha. Inténtalo de nuevo.';
          error.hidden = false;
          submit.disabled = false; submit.innerHTML = 'Guardar y continuar <span>→</span>';
        }
      });
    } catch (e) {
      console.warn('maybeAskProfile:', e);
      if (!flowFinished) {
        flowFinished = true;
        window.__IMDIIL_PROFILE_FLOW_READY = true;
        window.dispatchEvent(new CustomEvent('imdiil:profile-intake-finished', { detail: { reason: 'error' } }));
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Coordinador único: evita ventanas superpuestas y mantiene el orden
  // bienvenida → recorrido → ficha profesional → elección del curso gratis.
  // ═══════════════════════════════════════════════════════════════════
  window.__runInitialExperienceFlow = async function () {
    if (window.__IMDIIL_INITIAL_FLOW_STARTED) return;
    window.__IMDIIL_INITIAL_FLOW_STARTED = true;
    // La confirmación de nombre anterior queda como respaldo de la ficha.
    if (!window.__maybeAskNameLegacy && typeof window.__maybeAskName === 'function' && window.__maybeAskName !== window.__maybeAskProfile) {
      window.__maybeAskNameLegacy = window.__maybeAskName;
    }

    // Espera el evento del paso. Si el paso no llega a mostrarse (algo falló),
    // continúa tras `limite` ms, pero nunca mientras ese paso siga en pantalla.
    const waitFor = (eventName, trigger, limite, ocupado) => new Promise(resolve => {
      let timer = null;
      const done = event => { clearTimeout(timer); window.removeEventListener(eventName, done); resolve(event); };
      const check = () => {
        if (ocupado && ocupado()) { timer = setTimeout(check, 2000); return; }
        done(null);
      };
      window.addEventListener(eventName, done);
      if (limite) timer = setTimeout(check, limite);
      try { trigger(); } catch (error) { done(null); }
    });

    const pendingWelcome = window.__pendingWelcomeSplash;
    window.__pendingWelcomeSplash = null;
    if (pendingWelcome && typeof window.__showWelcomeSplash === 'function') {
      await waitFor('imdiil:welcome-splash-finished', () => window.__showWelcomeSplash(pendingWelcome), 20000, () => !!document.getElementById('splash-bienvenida'));
      // El regalo de créditos se entrega igual; el aviso queda para la próxima entrada.
      Onboarding.hydrate().catch(() => {});
    } else {
      await waitFor('imdiil:welcome-credits-finished', () => window.__showWelcomeCreditsGift(), 20000, () => !!document.getElementById('welcome-gift'));
    }

    await waitFor('imdiil:onboarding-finished', () => {
      window.__IMDIIL_ONBOARDING_FLOW_READY = true;
      window.__runAutomaticImdiilOnboarding?.();
    }, 20000, () => document.body.classList.contains('onboarding-tour-open'));

    await waitFor('imdiil:profile-intake-finished', () => window.__maybeAskProfile(), 0);
    window.__IMDIIL_INITIAL_FLOW_DONE = true;
    window.__programarInvitacionCursoGratis?.();
    setTimeout(() => checkCreditNotices(true), 1500);
  };
}());
