// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Retos (una sola sección, como IMFRA / Synova / ICADEM)
//
//   Hoy        · retos del día (3 mini juegos) + retos rápidos de decisión
//   Arcade     · 7 mini juegos de ingeniería industrial
//   Casos      · casos de planta  (assets/imdiil-training.js, embebido)
//   Flashcards · tarjetas técnicas (assets/imdiil-training.js, embebido)
//   Progreso   · nivel, insignias y misión semanal
//
// El catálogo de juegos viene del servidor (GET /credits/games). Cada partida
// empieza con un token firmado y el servidor valida la respuesta antes de
// pagar créditos (una vez por juego al día). El avance se guarda por cuenta.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const API = () => String(window.WEBHOOK_URL || '').replace(/\/$/, '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#${name}"/></svg>`;
  const guest = () => { const S = window.UserState || {}; return !S.uid || S.modo === 'invitado' || !!window.__isDemoMode; };
  const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Íconos propios de cada juego (trazo simple, sin imágenes externas).
  const GLYPH = {
    memorama: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="11" rx="2"/><rect x="13" y="9" width="8" height="11" rx="2"/><path d="M7 8v3M17 13v3"/></svg>',
    sopa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h2M11 8h2M15 8h2M7 12h2M11 12h2M15 12h2M7 16h2M11 16h2M15 16h2"/><path d="M6 17 18 7" stroke-width="2.4" opacity=".55"/></svg>',
    crucigrama: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 9h6V3h6v6h6v6h-6v6H9v-6H3z"/><path d="M9 9h6v6H9z"/></svg>',
    ordenar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 5.5 5 4v4M3.5 11h2l-2 2.5h2M3.5 17h2l-1 1.2 1 1.3h-2"/></svg>',
    clasificar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 14h3M14 14h2"/></svg>',
    riesgo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 19.5h19z"/><path d="M12 10v4M12 17h.01"/></svg>',
    adivina: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M9.2 9.2a2 2 0 1 1 2.6 2.4c-.5.2-.8.6-.8 1.1v.3M11 15h.01"/></svg>'
  };

  // Retos rápidos (mismas respuestas que valida /credits/reto).
  const QUICK = [
    { id: 'flow', label: 'Flujo de proceso', title: 'Detecta el cuello de botella', text: 'A produce 48 piezas/h, B produce 35 y C produce 42. ¿Dónde observar primero?', options: ['Proceso A', 'Proceso B', 'Proceso C'], answer: 1 },
    { id: 'quality', label: 'Calidad', title: 'Elige la evidencia correcta', text: 'Un turno reporta "muchos defectos". ¿Qué dato convierte la observación en evidencia?', options: ['La sensación del supervisor', 'Cantidad, tipo, lote y momento del defecto', 'Una fotografía sin contexto'], answer: 1 },
    { id: 'inventory', label: 'Inventarios', title: 'Prioriza el riesgo', text: 'Un componente crítico tiene proveedor único y 45 días de reposición. ¿Qué haces primero?', options: ['Ignorar mientras haya stock', 'Definir alternativa y punto de alerta', 'Comprar sin límite'], answer: 1 }
  ];
  const quickKey = () => `imdiil_v2_challenges_${window.UserState?.uid || 'demo'}`;
  const quickState = () => { try { return JSON.parse(localStorage.getItem(quickKey()) || '{}') || {}; } catch (e) { return {}; } };

  async function idToken() {
    let user = window.__auth?.currentUser || window.__currentUser;
    for (let i = 0; !user && !window.__isDemoMode && i < 50; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
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

  // ─── Estado ───
  let data = null;          // { catalog, daily, progress, balance, gameCredits }
  let loading = null;
  let root = null;
  let tab = 'hoy';
  let session = null;       // partida en curso

  function load(force) {
    if (guest()) return Promise.resolve(null);
    if (loading && !force) return loading;
    loading = request('/credits/games').then(result => { data = result; return data; }).catch(error => { console.warn('[retos]', error.message); loading = null; return data; });
    return loading;
  }
  const catalog = () => (data && Array.isArray(data.catalog) ? data.catalog : []);
  const gameOf = type => catalog().find(game => game.type === type);
  const doneToday = type => !!(data?.progress?.todayDone || []).includes(type);

  function combinedStats() {
    const training = window.IMDIILTraining?.state?.() || {};
    const days = new Set([...(training.days || []), ...((data?.progress?.days) || [])]);
    const today = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
    let streak = 0;
    const cursor = new Date(`${today}T12:00:00Z`);
    if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
    return {
      streak,
      xp: (Number(training.xp) || 0) + (Number(data?.progress?.xp) || 0),
      wins: Number(data?.progress?.totalWins) || 0,
      balance: data?.balance ?? (Number(window.UserState?.creditos) || 0)
    };
  }

  // ─── Estructura ───
  const TABS = [['hoy', 'Hoy'], ['arcade', 'Arcade'], ['casos', 'Casos de planta'], ['flashcards', 'Flashcards'], ['progreso', 'Progreso']];

  function render(target, opts) {
    root = target;
    tab = (opts && opts.tab) || (tab && TABS.some(([key]) => key === tab) ? tab : 'hoy');
    session = null;
    paint();
    load().then(() => { if (root === target && target.isConnected && !session) paint(); });
  }

  function paint() {
    if (!root) return;
    const s = combinedStats();
    root.innerHTML = `<div class="rt-page fade-up">
      <header class="rt-hero">
        <div class="rt-hero__copy"><span class="rt-kicker">${icon('i-bolt')}Retos IMDIIL</span><h1>Entrena tu <em>criterio de planta.</em></h1><p>Mini juegos, casos reales y tarjetas técnicas. Gana créditos y XP; tu avance se guarda en tu cuenta.</p></div>
        <div class="rt-hero__stats">
          <div><span>Racha</span><strong>${s.streak} <small>día${s.streak === 1 ? '' : 's'}</small></strong></div>
          <div><span>XP</span><strong>${fmt(s.xp)}</strong></div>
          <button type="button" class="rt-wallet" data-rt-wallet><span>Créditos</span><strong><i class="credit-coin">C</i>${fmt(s.balance)}</strong><small>Ver mi cartera →</small></button>
        </div>
      </header>
      <nav class="rt-tabs" role="tablist">${TABS.map(([key, label]) => `<button type="button" role="tab" aria-selected="${key === tab}" class="${key === tab ? 'is-active' : ''}" data-rt-tab="${key}">${esc(label)}</button>`).join('')}</nav>
      <div class="rt-body" data-rt-body></div>
    </div>`;
    root.querySelectorAll('[data-rt-tab]').forEach(btn => btn.addEventListener('click', () => { tab = btn.dataset.rtTab; session = null; paint(); }));
    root.querySelector('[data-rt-wallet]')?.addEventListener('click', () => {
      if (guest()) { window.Toast?.info?.('Inicia sesión', 'Crea tu cuenta para ganar y canjear créditos.'); return; }
      window.IMDIILCredits?.openWallet?.();
    });
    const body = root.querySelector('[data-rt-body]');
    if (tab === 'hoy') paintToday(body);
    else if (tab === 'arcade') paintArcade(body);
    else mountTraining(body, tab === 'casos' ? 'cases' : tab === 'flashcards' ? 'cards' : 'hub');
  }

  function mountTraining(body, start) {
    if (!window.IMDIILTraining?.mount) { body.innerHTML = '<div class="rt-empty">El entrenamiento no está disponible por ahora.</div>'; return; }
    window.IMDIILTraining.mount(body, { embedded: true, start, onNavigate: target => { tab = target === 'cases' ? 'casos' : 'flashcards'; paint(); } });
  }

  function gameCard(game, board, opts) {
    const done = doneToday(game.type);
    const credits = Number(data?.gameCredits) || 20;
    return `<article class="rt-game ${done ? 'is-done' : ''}" style="--g:${esc(game.color)}" data-rt-play="${esc(game.type)}" data-rt-board="${Number(board) || 0}" tabindex="0" role="button" aria-label="Jugar ${esc(game.title)}">
      <span class="rt-game__icon">${GLYPH[game.type] || ''}</span>
      <span class="rt-game__label">${esc(game.label)}${opts?.daily ? ' · Reto del día' : ''}</span>
      <h3>${esc(game.title)}</h3>
      <p>${esc(opts?.daily ? game.boards[board]?.title || game.description : game.description)}</p>
      <span class="rt-game__foot">${done ? `<b class="is-done">${icon('i-check-circle')}Ganado hoy</b>` : `<b><i class="credit-coin">C</i>+${credits}</b>`}<em>${done ? 'Jugar otra vez' : 'Jugar'} ${icon('i-arrow-right')}</em></span>
    </article>`;
  }

  function bindPlay(scope) {
    scope.querySelectorAll('[data-rt-play]').forEach(el => {
      const run = () => play(el.dataset.rtPlay, Number(el.dataset.rtBoard) || 0);
      el.addEventListener('click', run);
      el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(); } });
    });
  }

  function paintToday(body) {
    const daily = (data?.daily || []).filter(item => gameOf(item.type));
    const qs = quickState();
    const doneQuick = QUICK.filter(item => qs[item.id]?.completed).length;
    const dailyDone = daily.filter(item => doneToday(item.type)).length;
    body.innerHTML = `
      <section class="rt-block">
        <div class="rt-head"><div><span>Cada día cambian</span><h2>Retos del día</h2></div><small>${guest() ? 'Crea tu cuenta para ganar créditos' : `${dailyDone}/${daily.length || 3} completados hoy`}</small></div>
        ${daily.length ? `<div class="rt-grid rt-grid--3">${daily.map(item => gameCard(gameOf(item.type), item.board, { daily: true })).join('')}</div>` : `<div class="rt-empty">${guest() ? 'Inicia sesión para ver los retos del día. Mientras tanto prueba el Arcade.' : '<i class="rt-spin"></i>Cargando retos del día…'}</div>`}
      </section>
      <section class="rt-block">
        <div class="rt-head"><div><span>Decisiones de planta</span><h2>Retos rápidos</h2></div><small>${doneQuick}/${QUICK.length} resueltos</small></div>
        <div class="rt-quick">${QUICK.map(item => {
          const done = !!qs[item.id]?.completed;
          return `<article class="rt-q ${done ? 'is-done' : ''}" data-rt-quick="${item.id}"><span>${esc(item.label)}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="rt-q__opts">${item.options.map((option, i) => `<button type="button" data-rt-opt="${i}">${String.fromCharCode(65 + i)} · ${esc(option)}</button>`).join('')}</div>${done ? `<small class="rt-q__done">${icon('i-check-circle')}Resuelto · puedes repetirlo</small>` : ''}</article>`;
        }).join('')}</div>
      </section>`;
    bindPlay(body);
    body.querySelectorAll('[data-rt-quick]').forEach(card => {
      const item = QUICK.find(q => q.id === card.dataset.rtQuick);
      card.querySelectorAll('[data-rt-opt]').forEach(btn => btn.addEventListener('click', () => {
        const selected = Number(btn.dataset.rtOpt);
        card.querySelectorAll('[data-rt-opt]').forEach(b => { b.disabled = true; });
        btn.classList.add(selected === item.answer ? 'is-ok' : 'is-bad');
        card.querySelector(`[data-rt-opt="${item.answer}"]`)?.classList.add('is-ok');
        if (selected === item.answer) {
          const state = quickState();
          state[item.id] = { completed: true, completedAt: state[item.id]?.completedAt || new Date().toISOString() };
          try { localStorage.setItem(quickKey(), JSON.stringify(state)); } catch (e) {}
          window.__scheduleLearningSync?.();
          window.IMDIILCredits?.reto?.(item.id, selected);
          window.Toast?.success?.('Reto resuelto', 'Tu respuesta quedó registrada.');
          try { window.celebrarImdiil?.('normal'); } catch (e) {}
        } else {
          window.Toast?.info?.('Revisa el criterio', 'Vuelve a intentarlo en un momento.');
          setTimeout(() => { if (card.isConnected) card.querySelectorAll('[data-rt-opt]').forEach(b => { b.disabled = false; b.classList.remove('is-ok', 'is-bad'); }); }, 1600);
        }
      }));
    });
  }

  function paintArcade(body) {
    const games = catalog();
    const wins = data?.progress?.perGame || {};
    body.innerHTML = `<section class="rt-block">
      <div class="rt-head"><div><span>Arcade industrial</span><h2>Mini juegos</h2></div><small>${guest() ? 'Juega libre · crea tu cuenta para ganar créditos' : `${(data?.progress?.todayDone || []).length}/${games.length || 7} ganados hoy · +${Number(data?.gameCredits) || 20} créditos por juego al día`}</small></div>
      ${games.length ? `<div class="rt-grid">${games.map(game => gameCard(game, (Number(wins[game.type]?.wins) || 0) % game.boards.length)).join('')}</div>` : `<div class="rt-empty">${guest() ? 'Crea tu cuenta gratis para jugar el Arcade de IMDIIL.' : '<i class="rt-spin"></i>Cargando juegos…'}</div>`}
    </section>`;
    bindPlay(body);
  }

  // ─── Partida ───
  async function play(type, board) {
    const game = gameOf(type);
    if (!game) return;
    const index = Math.max(0, Math.min(game.boards.length - 1, Number(board) || 0));
    session = { type, board: index, game, data: game.boards[index], startedAt: Date.now(), token: null, minSeconds: 0, finished: false };
    const body = root.querySelector('[data-rt-body]');
    body.innerHTML = `<section class="rt-play" style="--g:${esc(game.color)}">
      <header class="rt-play__bar"><button type="button" class="rt-back" data-rt-back>← Volver</button><div><span>${esc(game.label)} · ${esc(session.data.title || '')}</span><strong>${esc(game.title)}</strong></div><div class="rt-play__meta"><b data-rt-timer>0:00</b>${game.boards.length > 1 ? `<button type="button" class="rt-chip" data-rt-next-board>Otro tablero</button>` : ''}</div></header>
      <p class="rt-play__hint">${esc(game.description)}</p>
      <div class="rt-play__stage" data-rt-stage></div>
    </section>`;
    body.querySelector('[data-rt-back]').addEventListener('click', () => { session = null; paint(); });
    body.querySelector('[data-rt-next-board]')?.addEventListener('click', () => play(type, (index + 1) % game.boards.length));
    const current = session;
    const timer = setInterval(() => {
      const el = body.querySelector('[data-rt-timer]');
      if (!el || session !== current) { clearInterval(timer); return; }
      if (current.finished) return;
      const s = Math.floor((Date.now() - current.startedAt) / 1000);
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 500);
    if (!guest()) {
      request('/credits/game/start', { method: 'POST', body: JSON.stringify({ type, board: index }) })
        .then(result => { if (session === current) { current.token = result.token; current.minSeconds = Number(result.minSeconds) || 0; } })
        .catch(error => console.warn('[retos] Partida sin token', error.message));
    }
    const stage = body.querySelector('[data-rt-stage]');
    const runners = { memorama: runMemory, sopa: runWordsearch, crucigrama: runCrossword, ordenar: runOrder, clasificar: runClassify, riesgo: runHazard, adivina: runGuess };
    (runners[type] || (() => {}))(stage, session.data, answer => win(current, answer));
  }

  async function win(current, answer) {
    if (session !== current || current.finished) return;
    current.finished = true;
    const stage = root?.querySelector('[data-rt-stage]');
    const seconds = Math.round((Date.now() - current.startedAt) / 1000);
    const panel = document.createElement('div');
    panel.className = 'rt-win';
    panel.innerHTML = `<div class="rt-win__icon">${icon('i-trophy')}</div><span>¡Juego completado!</span><h3>${esc(current.game.title)}</h3><p data-rt-win-msg>${guest() ? 'Crea tu cuenta para ganar créditos con cada juego.' : 'Validando tu partida…'}</p><div class="rt-win__actions"><button type="button" class="rt-btn" data-rt-again>Otro tablero</button><button type="button" class="rt-btn rt-btn--primary" data-rt-done>Volver a Retos</button></div><small>Tiempo: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</small>`;
    stage?.appendChild(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { window.celebrarImdiil?.('normal'); } catch (e) {}
    panel.querySelector('[data-rt-again]').addEventListener('click', () => play(current.type, (current.board + 1) % current.game.boards.length));
    panel.querySelector('[data-rt-done]').addEventListener('click', () => { session = null; tab = tab === 'hoy' ? 'hoy' : 'arcade'; paint(); });
    if (guest()) return;
    const msg = panel.querySelector('[data-rt-win-msg]');
    try {
      for (let i = 0; !current.token && i < 25; i += 1) await new Promise(resolve => setTimeout(resolve, 200));
      if (!current.token) throw new Error('No pudimos registrar la partida. Revisa tu conexión.');
      const wait = current.minSeconds * 1000 - (Date.now() - current.startedAt) + 400;
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      const result = await request('/credits/game', { method: 'POST', body: JSON.stringify({ type: current.type, board: current.board, token: current.token, answer }) });
      if (data) { data.progress = result.progress || data.progress; if (result.balance != null) data.balance = result.balance; }
      if (Number(result.credits) > 0) {
        msg.innerHTML = `<b class="rt-win__credits"><i class="credit-coin">C</i>+${fmt(result.credits)} créditos</b>`;
        if (window.UserState) window.UserState.creditos = Number(result.balance) || window.UserState.creditos;
        window.dispatchEvent(new CustomEvent('imdiil:credits-changed', { detail: { balance: Number(result.balance) || 0 } }));
        setTimeout(() => window.__checkCreditNotices?.(true), 500);
      } else if (result.capped) {
        msg.textContent = 'Partida registrada. Ya alcanzaste el tope de créditos de hoy.';
      } else {
        msg.textContent = 'Partida registrada. Ya ganaste los créditos de este juego hoy; vuelve mañana por más.';
      }
    } catch (error) {
      msg.textContent = error.message || 'No pudimos validar la partida.';
    }
  }

  // ─── Juegos ───
  function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function seeded(seed) { let t = 0; for (const ch of String(seed)) t = (t * 31 + ch.charCodeAt(0)) >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

  function runMemory(stage, board, done) {
    const cards = shuffle(board.pairs.flatMap((pair, i) => [{ pair: i, text: pair[0], kind: 'term' }, { pair: i, text: pair[1], kind: 'def' }]));
    const matched = new Set();
    let open = [];
    let moves = 0;
    let busy = false;
    stage.innerHTML = `<div class="rt-mem__meta"><span>Parejas <b data-mem-pairs>0/${board.pairs.length}</b></span><span>Intentos <b data-mem-moves>0</b></span></div><div class="rt-mem">${cards.map((card, i) => `<button type="button" class="rt-mem__card rt-mem__card--${card.kind}" data-mem="${i}" aria-label="Carta ${i + 1}"><span class="rt-mem__back">IMDIIL</span><span class="rt-mem__front">${esc(card.text)}</span></button>`).join('')}</div>`;
    stage.querySelectorAll('[data-mem]').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.mem);
      if (busy || matched.has(cards[i].pair) || open.includes(i)) return;
      btn.classList.add('is-open');
      open.push(i);
      if (open.length < 2) return;
      moves += 1;
      stage.querySelector('[data-mem-moves]').textContent = moves;
      const [a, b] = open.map(n => cards[n]);
      if (a.pair === b.pair && a.kind !== b.kind) {
        matched.add(a.pair);
        open.forEach(n => stage.querySelector(`[data-mem="${n}"]`).classList.add('is-matched'));
        open = [];
        stage.querySelector('[data-mem-pairs]').textContent = `${matched.size}/${board.pairs.length}`;
        if (matched.size === board.pairs.length) done({ pairs: [...matched], moves });
      } else {
        busy = true;
        setTimeout(() => { open.forEach(n => stage.querySelector(`[data-mem="${n}"]`)?.classList.remove('is-open')); open = []; busy = false; }, 850);
      }
    }));
  }

  function runWordsearch(stage, board, done) {
    const size = 12;
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    const words = board.words.map(norm);
    let rand;
    let grid;
    // Se reintenta con otra semilla hasta colocar todas las palabras (siempre ganable).
    for (let round = 0; round < 30; round += 1) {
      rand = seeded(`sopa|${board.title}|${round}`);
      grid = Array.from({ length: size }, () => Array(size).fill(''));
      if (words.every(word => placeWord(word))) break;
    }
    function placeWord(word) {
      for (let attempt = 0; attempt < 400; attempt += 1) {
        const [dr, dc] = dirs[Math.floor(rand() * (attempt < 200 ? 4 : 8))];
        const r0 = Math.floor(rand() * size);
        const c0 = Math.floor(rand() * size);
        const r1 = r0 + dr * (word.length - 1);
        const c1 = c0 + dc * (word.length - 1);
        if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue;
        let ok = true;
        for (let k = 0; k < word.length; k += 1) { const cell = grid[r0 + dr * k][c0 + dc * k]; if (cell && cell !== word[k]) { ok = false; break; } }
        if (!ok) continue;
        for (let k = 0; k < word.length; k += 1) grid[r0 + dr * k][c0 + dc * k] = word[k];
        return true;
      }
      return false;
    }
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    grid.forEach(row => row.forEach((cell, c) => { if (!cell) row[c] = abc[Math.floor(rand() * abc.length)]; }));
    const found = new Set();
    let start = null;
    stage.innerHTML = `<div class="rt-ws"><div class="rt-ws__grid" style="--n:${size}">${grid.map((row, r) => row.map((ch, c) => `<button type="button" class="rt-ws__cell" data-ws="${r},${c}">${ch}</button>`).join('')).join('')}</div><aside class="rt-ws__words"><span>Encuentra (${words.length})</span><ul>${board.words.map((w, i) => `<li data-ws-word="${words[i]}">${esc(w)}</li>`).join('')}</ul><small>Toca la primera y la última letra de cada palabra.</small></aside></div>`;
    const cell = (r, c) => stage.querySelector(`[data-ws="${r},${c}"]`);
    stage.querySelectorAll('[data-ws]').forEach(btn => btn.addEventListener('click', () => {
      const [r, c] = btn.dataset.ws.split(',').map(Number);
      if (!start) { start = [r, c]; btn.classList.add('is-start'); return; }
      const [r0, c0] = start;
      cell(r0, c0)?.classList.remove('is-start');
      start = null;
      const dr = Math.sign(r - r0);
      const dc = Math.sign(c - c0);
      const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
      if (!(r - r0 === 0 || c - c0 === 0 || Math.abs(r - r0) === Math.abs(c - c0)) || len < 2) return;
      let text = '';
      const cells = [];
      for (let k = 0; k < len; k += 1) { cells.push([r0 + dr * k, c0 + dc * k]); text += grid[r0 + dr * k][c0 + dc * k]; }
      const reversed = text.split('').reverse().join('');
      const word = words.find(w => !found.has(w) && (w === text || w === reversed));
      if (!word) { cells.forEach(([a, b]) => { const el = cell(a, b); el?.classList.add('is-miss'); setTimeout(() => el?.classList.remove('is-miss'), 450); }); return; }
      found.add(word);
      cells.forEach(([a, b]) => cell(a, b)?.classList.add('is-found'));
      stage.querySelector(`[data-ws-word="${word}"]`)?.classList.add('is-found');
      if (found.size === words.length) done({ found: [...found] });
    }));
  }

  function runCrossword(stage, board, done) {
    const rows = board.rows.map(row => ({ ...row, answer: norm(row.answer) }));
    const maxKey = Math.max(...rows.map(row => row.key));
    const width = Math.max(...rows.map(row => maxKey - row.key + row.answer.length));
    stage.innerHTML = `<div class="rt-cw"><div class="rt-cw__grid" style="--w:${width}">${rows.map((row, r) => {
      const pad = maxKey - row.key;
      return `<div class="rt-cw__row" data-cw-row="${r}"><b>${r + 1}</b>${Array.from({ length: width }, (_, c) => {
        const k = c - pad;
        if (k < 0 || k >= row.answer.length) return '<span class="rt-cw__gap"></span>';
        return `<input class="rt-cw__cell ${k === row.key ? 'is-key' : ''}" maxlength="1" autocomplete="off" autocapitalize="characters" data-cw="${r},${k}" aria-label="Fila ${r + 1}, letra ${k + 1}">`;
      }).join('')}</div>`;
    }).join('')}</div><ol class="rt-cw__clues">${rows.map(row => `<li>${esc(row.clue)} <small>(${row.answer.length})</small></li>`).join('')}</ol></div>
      <div class="rt-play__actions"><span class="rt-play__note">La columna marcada forma la palabra clave.</span><button type="button" class="rt-btn rt-btn--primary" data-cw-check>Comprobar</button></div>`;
    const inputs = [...stage.querySelectorAll('[data-cw]')];
    inputs.forEach((input, i) => {
      input.addEventListener('input', () => { input.value = norm(input.value).slice(-1); if (input.value && inputs[i + 1]) inputs[i + 1].focus(); });
      input.addEventListener('keydown', event => { if (event.key === 'Backspace' && !input.value && inputs[i - 1]) inputs[i - 1].focus(); });
    });
    stage.querySelector('[data-cw-check]').addEventListener('click', () => {
      const answers = rows.map((row, r) => inputs.filter(el => el.dataset.cw.startsWith(`${r},`)).map(el => el.value || ' ').join(''));
      let all = true;
      rows.forEach((row, r) => {
        const ok = answers[r] === row.answer;
        if (!ok) all = false;
        stage.querySelector(`[data-cw-row="${r}"]`).classList.toggle('is-ok', ok);
        stage.querySelector(`[data-cw-row="${r}"]`).classList.toggle('is-bad', !ok && answers[r].trim().length > 0);
      });
      if (all) { inputs.forEach(el => { el.disabled = true; }); done({ answers }); }
      else window.Toast?.info?.('Aún no', 'Revisa las filas marcadas en rojo.');
    });
  }

  function runOrder(stage, board, done) {
    let order = shuffle(board.steps.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = order.slice().reverse();
    const paintList = marks => {
      stage.innerHTML = `<ol class="rt-order">${order.map((step, pos) => `<li class="${marks ? (step === pos ? 'is-ok' : 'is-bad') : ''}"><b>${pos + 1}</b><span>${esc(board.steps[step])}</span><div><button type="button" data-ord-up="${pos}" ${pos === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" data-ord-down="${pos}" ${pos === order.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button></div></li>`).join('')}</ol>
        <div class="rt-play__actions"><span class="rt-play__note">Usa las flechas para acomodar los pasos.</span><button type="button" class="rt-btn rt-btn--primary" data-ord-check>Comprobar</button></div>`;
      stage.querySelectorAll('[data-ord-up]').forEach(b => b.addEventListener('click', () => { const p = Number(b.dataset.ordUp); [order[p - 1], order[p]] = [order[p], order[p - 1]]; paintList(); }));
      stage.querySelectorAll('[data-ord-down]').forEach(b => b.addEventListener('click', () => { const p = Number(b.dataset.ordDown); [order[p + 1], order[p]] = [order[p], order[p + 1]]; paintList(); }));
      stage.querySelector('[data-ord-check]').addEventListener('click', () => {
        if (order.every((v, i) => v === i)) { paintList(true); stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ order: order.slice() }); }
        else { paintList(true); window.Toast?.info?.('Casi', 'Los pasos en rojo no están en su lugar.'); }
      });
    };
    paintList();
  }

  function runClassify(stage, board, done) {
    const assign = board.items.map(() => -1);
    const paintBoard = check => {
      stage.innerHTML = `<div class="rt-cls">${board.items.map((item, i) => `<div class="rt-cls__item ${check && assign[i] >= 0 ? (assign[i] === item[1] ? 'is-ok' : 'is-bad') : ''}"><span>${esc(item[0])}</span><div>${board.categories.map((cat, c) => `<button type="button" class="${assign[i] === c ? 'is-active' : ''}" data-cls="${i}:${c}">${esc(cat)}</button>`).join('')}</div></div>`).join('')}</div>
        <div class="rt-play__actions"><span class="rt-play__note">${assign.filter(v => v >= 0).length}/${board.items.length} clasificados</span><button type="button" class="rt-btn rt-btn--primary" data-cls-check ${assign.some(v => v < 0) ? 'disabled' : ''}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-cls]').forEach(b => b.addEventListener('click', () => { const [i, c] = b.dataset.cls.split(':').map(Number); assign[i] = c; paintBoard(); }));
      stage.querySelector('[data-cls-check]').addEventListener('click', () => {
        const ok = board.items.every((item, i) => assign[i] === item[1]);
        paintBoard(true);
        if (ok) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ assign: assign.slice() }); }
        else window.Toast?.info?.('Revisa', 'Corrige los elementos en rojo.');
      });
    };
    paintBoard();
  }

  function runHazard(stage, board, done) {
    const picked = new Set();
    const paintScene = check => {
      stage.innerHTML = `<div class="rt-hz"><div class="rt-hz__scene"><span>Escena</span><strong>${esc(board.title)}</strong><p>Marca solo las condiciones inseguras.</p></div><div class="rt-hz__list">${board.items.map((item, i) => {
        let cls = picked.has(i) ? ' is-picked' : '';
        if (check) cls += item[1] ? (picked.has(i) ? ' is-ok' : ' is-missed') : (picked.has(i) ? ' is-bad' : '');
        return `<button type="button" class="rt-hz__item${cls}" data-hz="${i}" ${check === 'won' ? 'disabled' : ''}><i aria-hidden="true">${picked.has(i) ? '!' : ''}</i><span>${esc(item[0])}${check && (item[1] || picked.has(i)) ? `<small>${esc(item[2])}</small>` : ''}</span></button>`;
      }).join('')}</div></div>
        <div class="rt-play__actions"><span class="rt-play__note">${picked.size} marcadas</span><button type="button" class="rt-btn rt-btn--primary" data-hz-check ${check === 'won' ? 'disabled' : ''}>Verificar</button></div>`;
      stage.querySelectorAll('[data-hz]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.hz); if (picked.has(i)) picked.delete(i); else picked.add(i); paintScene(); }));
      stage.querySelector('[data-hz-check]').addEventListener('click', () => {
        const unsafe = board.items.map((item, i) => (item[1] ? i : -1)).filter(i => i >= 0);
        const ok = unsafe.length === picked.size && unsafe.every(i => picked.has(i));
        paintScene(ok ? 'won' : true);
        if (ok) done({ selected: [...picked] });
        else window.Toast?.info?.('Aún hay riesgos', 'Revisa las explicaciones y vuelve a verificar.');
      });
    };
    paintScene();
  }

  function runGuess(stage, board, done) {
    const word = norm(board.word);
    const guessed = new Set();
    let misses = 0;
    const paintWord = () => {
      const won = word.split('').every(ch => guessed.has(ch));
      const lost = misses >= 6;
      stage.innerHTML = `<div class="rt-gs"><p class="rt-gs__clue"><span>Pista</span>${esc(board.clue)}</p>
        <div class="rt-gs__word">${word.split('').map(ch => `<span class="${guessed.has(ch) || lost ? 'is-on' : ''} ${lost && !guessed.has(ch) ? 'is-lost' : ''}">${guessed.has(ch) || lost ? ch : ''}</span>`).join('')}</div>
        <div class="rt-gs__lives">${Array.from({ length: 6 }, (_, i) => `<i class="${i < misses ? 'is-used' : ''}"></i>`).join('')}<small>${6 - misses} intentos</small></div>
        ${lost ? '<div class="rt-play__actions"><span class="rt-play__note">Se agotaron los intentos.</span><button type="button" class="rt-btn rt-btn--primary" data-gs-retry>Intentar de nuevo</button></div>' : `<div class="rt-gs__keys">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => `<button type="button" data-gs="${ch}" ${guessed.has(ch) || won ? 'disabled' : ''} class="${guessed.has(ch) ? (word.includes(ch) ? 'is-ok' : 'is-bad') : ''}">${ch}</button>`).join('')}</div>`}</div>`;
      stage.querySelectorAll('[data-gs]').forEach(b => b.addEventListener('click', () => {
        const ch = b.dataset.gs;
        guessed.add(ch);
        if (!word.includes(ch)) misses += 1;
        paintWord();
        if (word.split('').every(c => guessed.has(c))) done({ word, misses });
      }));
      stage.querySelector('[data-gs-retry]')?.addEventListener('click', () => { if (session) play(session.type, session.board); });
    };
    paintWord();
  }

  // ─── Registro de la sección ───
  window.IMDIILRetos = { render, refresh: () => load(true).then(() => { if (root?.isConnected && !session) paint(); }) };
  window.addEventListener('imdiil:credits-changed', event => {
    const balance = Number(event.detail?.balance);
    if (data && Number.isFinite(balance)) data.balance = balance;
  });
}());
