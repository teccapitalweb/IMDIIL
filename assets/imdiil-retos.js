// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Retos (una sola sección, como IMFRA / Synova / ICADEM)
//
//   Hoy           · retos del día (3 mini juegos), clasificación y retos rápidos
//   Arcade        · 16 mini juegos de ingeniería industrial con filtros por tema
//   Clasificación · ranking del club por semana, mes e histórico
//   Casos         · casos de planta  (assets/imdiil-training.js, embebido)
//   Flashcards    · tarjetas técnicas (assets/imdiil-training.js, embebido)
//   Progreso      · nivel, insignias y misión semanal
//
// El catálogo viene del servidor (GET /credits/games). Cada partida empieza
// con un token firmado y el servidor valida la respuesta antes de pagar
// créditos (una vez por juego al día). La clasificación sale de
// GET /credits/leaderboard (solo nombre corto, foto y avance).
// Imágenes: assets/img/retos/{portadas,escenas,iconos}/
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const API = () => String(window.WEBHOOK_URL || '').replace(/\/$/, '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#${name}"/></svg>`;
  const guest = () => { const S = window.UserState || {}; return !S.uid || S.modo === 'invitado' || !!window.__isDemoMode; };
  const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const clock = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

  // ─── Imágenes ───
  const IMG = 'assets/img/retos/';
  // URL absoluta para usarla dentro de variables CSS (url() relativo se resolvería desde /assets/).
  const abs = path => { try { return new URL(path, document.baseURI).href; } catch (e) { return path; } };
  const COVER = {
    memorama: 'memorama', sopa: 'sopa-letras', crucigrama: 'crucigrama', ordenar: 'ordena-proceso', clasificar: 'clasifica',
    riesgo: 'detecta-riesgo', adivina: 'adivina-concepto', contra: 'contra-reloj', vf: 'verdadero-falso', oee: 'calcula-oee',
    balanceo: 'balanceo-linea', ishikawa: 'ishikawa', muda: 'encuentra-muda', control: 'grafica-control', pareto: 'pareto', ruta: 'ruta-montacargas'
  };
  const cover = type => `${IMG}portadas/${COVER[type] || 'memorama'}.webp`;
  const iconImg = id => `${IMG}iconos/${id}.webp`;
  const scene = id => `${IMG}escenas/${id}.webp`;

  // Temas (filtros del Arcade) con su ícono 3D.
  const CATS = [
    { id: 'lean', name: 'Lean' }, { id: 'calidad', name: 'Calidad' }, { id: 'seguridad', name: 'Seguridad' },
    { id: 'mantenimiento', name: 'Mantenimiento' }, { id: 'logistica', name: 'Logística' }, { id: 'almacen', name: 'Almacén' },
    { id: '5s', name: '5S' }, { id: 'tiempos', name: 'Tiempos' }, { id: 'oee', name: 'OEE' }, { id: 'contra-reloj', name: 'Contra reloj' }
  ];
  const GAME_CAT = {
    memorama: 'lean', muda: 'lean', adivina: 'lean', ishikawa: 'calidad', control: 'calidad', pareto: 'calidad', vf: 'calidad',
    riesgo: 'seguridad', crucigrama: 'seguridad', clasificar: 'mantenimiento', ruta: 'logistica', sopa: 'almacen',
    ordenar: '5s', balanceo: 'tiempos', oee: 'oee', contra: 'contra-reloj'
  };
  const catOf = type => CATS.find(cat => cat.id === GAME_CAT[type]) || CATS[0];

  // Retos rápidos (mismas respuestas que valida /credits/reto).
  const QUICK = [
    { id: 'flow', label: 'Flujo de proceso', title: 'Detecta el cuello de botella', text: 'A produce 48 piezas/h, B produce 35 y C produce 42. ¿Dónde observar primero?', options: ['Proceso A', 'Proceso B', 'Proceso C'], answer: 1, art: 'tiempos', why: 'B es el proceso más lento (35 pzas/h): marca el ritmo de toda la línea. Ahí se gana capacidad.' },
    { id: 'quality', label: 'Calidad', title: 'Elige la evidencia correcta', text: 'Un turno reporta "muchos defectos". ¿Qué dato convierte la observación en evidencia?', options: ['La sensación del supervisor', 'Cantidad, tipo, lote y momento del defecto', 'Una fotografía sin contexto'], answer: 1, art: 'calidad', why: 'Sin datos estratificados no hay análisis: cantidad, tipo, lote y momento permiten un Pareto y la causa raíz.' },
    { id: 'inventory', label: 'Inventarios', title: 'Prioriza el riesgo', text: 'Un componente crítico tiene proveedor único y 45 días de reposición. ¿Qué haces primero?', options: ['Ignorar mientras haya stock', 'Definir alternativa y punto de alerta', 'Comprar sin límite'], answer: 1, art: 'almacen', why: 'Proveedor único y reposición larga es riesgo de paro: se calcula un punto de reorden con stock de seguridad y se desarrolla una alternativa.' }
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
  let filter = 'todos';
  let period = 'week';
  const boards = {};        // clasificación por periodo { at, data }
  const boardLoading = {};

  function load(force) {
    if (guest()) return Promise.resolve(null);
    if (loading && !force) return loading;
    loading = request('/credits/games').then(result => { data = result; return data; }).catch(error => { console.warn('[retos]', error.message); loading = null; return data; });
    return loading;
  }
  function loadBoard(which, force) {
    if (guest()) return Promise.resolve(null);
    const cached = boards[which];
    if (!force && cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
    if (boardLoading[which] && !force) return boardLoading[which];
    boardLoading[which] = request(`/credits/leaderboard?period=${which}`)
      .then(result => { boards[which] = { at: Date.now(), data: result }; return result; })
      .catch(error => { console.warn('[retos] clasificación', error.message); return null; })
      .finally(() => { boardLoading[which] = null; });
    return boardLoading[which];
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
      balance: data?.balance ?? (Number(window.UserState?.creditos) || 0),
      rank: boards.week?.data?.me?.rank || null
    };
  }

  // ─── Estructura ───
  const TABS = [['hoy', 'Hoy'], ['arcade', 'Arcade'], ['clasificacion', 'Clasificación'], ['casos', 'Casos de planta'], ['flashcards', 'Flashcards'], ['progreso', 'Progreso']];

  function render(target, opts) {
    root = target;
    tab = (opts && opts.tab) || (tab && TABS.some(([key]) => key === tab) ? tab : 'hoy');
    session = null;
    paint();
    Promise.all([load(), loadBoard('week')]).then(() => { if (root === target && target.isConnected && !session) paint(); });
  }

  function paint() {
    if (!root) return;
    const s = combinedStats();
    root.innerHTML = `<div class="rt-page fade-up">
      <header class="rt-hero" style="--hero:url('${abs(`${IMG}retos-hero.webp`)}')">
        <div class="rt-hero__copy">
          <span class="rt-kicker">${icon('i-bolt')}Retos IMDIIL</span>
          <h1>Entrena tu <em>criterio de planta.</em></h1>
          <p>16 juegos, casos reales y clasificación del club. Gana créditos y XP en cada reto.</p>
        </div>
        <div class="rt-hero__stats">
          <div class="rt-stat"><img src="${iconImg('reto-diario')}" alt="" width="40" height="40"><span>Racha</span><strong>${s.streak}<small> día${s.streak === 1 ? '' : 's'}</small></strong></div>
          <div class="rt-stat"><img src="${iconImg('oee')}" alt="" width="40" height="40"><span>XP</span><strong>${fmt(s.xp)}</strong></div>
          <button type="button" class="rt-stat rt-stat--btn" data-rt-goto="clasificacion"><img src="${iconImg('contra-reloj')}" alt="" width="40" height="40"><span>Semana</span><strong>${s.rank ? `#${s.rank}` : '—'}</strong></button>
          <button type="button" class="rt-stat rt-stat--btn rt-stat--coin" data-rt-wallet><i class="credit-coin">C</i><span>Créditos</span><strong>${fmt(s.balance)}</strong></button>
        </div>
      </header>
      <nav class="rt-tabs" role="tablist">${TABS.map(([key, label]) => `<button type="button" role="tab" aria-selected="${key === tab}" class="${key === tab ? 'is-active' : ''}" data-rt-tab="${key}">${esc(label)}</button>`).join('')}</nav>
      <div class="rt-body" data-rt-body></div>
    </div>`;
    root.querySelectorAll('[data-rt-tab]').forEach(btn => btn.addEventListener('click', () => { tab = btn.dataset.rtTab; session = null; paint(); }));
    root.querySelectorAll('[data-rt-goto]').forEach(btn => btn.addEventListener('click', () => { tab = btn.dataset.rtGoto; session = null; paint(); }));
    root.querySelector('[data-rt-wallet]')?.addEventListener('click', () => {
      if (guest()) { window.Toast?.info?.('Inicia sesión', 'Crea tu cuenta para ganar y canjear créditos.'); return; }
      window.IMDIILCredits?.openWallet?.();
    });
    const body = root.querySelector('[data-rt-body]');
    if (tab === 'hoy') paintToday(body);
    else if (tab === 'arcade') paintArcade(body);
    else if (tab === 'clasificacion') paintLeaderboard(body);
    else mountTraining(body, tab === 'casos' ? 'cases' : tab === 'flashcards' ? 'cards' : 'hub');
  }

  function mountTraining(body, start) {
    if (!window.IMDIILTraining?.mount) { body.innerHTML = '<div class="rt-empty">El entrenamiento no está disponible por ahora.</div>'; return; }
    window.IMDIILTraining.mount(body, { embedded: true, start, onNavigate: target => { tab = target === 'cases' ? 'casos' : 'flashcards'; paint(); } });
  }

  // ─── Tarjetas de juego ───
  function gameCard(game, board, opts) {
    const done = doneToday(game.type);
    const credits = Number(data?.gameCredits) || 20;
    const cat = catOf(game.type);
    const won = data?.progress?.perGame?.[game.type]?.boards || [];
    const total = game.boards.length;
    const sub = opts?.daily ? (game.boards[board]?.title || game.description) : game.description;
    return `<article class="rt-card ${opts?.daily ? 'rt-card--daily' : ''} ${done ? 'is-done' : ''}" style="--g:${esc(game.color)}" data-rt-play="${esc(game.type)}" data-rt-board="${Number(board) || 0}" tabindex="0" role="button" aria-label="Jugar ${esc(game.title)}">
      <div class="rt-card__media">
        <img src="${cover(game.type)}" alt="" loading="lazy" decoding="async" width="960" height="600">
        <span class="rt-card__tag">${esc(opts?.daily ? 'Reto del día' : game.label)}</span>
        ${done ? `<span class="rt-card__done">${icon('i-check-circle')}Ganado hoy</span>` : ''}
      </div>
      <div class="rt-card__body">
        <img class="rt-card__icon" src="${iconImg(cat.id)}" alt="${esc(cat.name)}" width="56" height="56" loading="lazy">
        <span class="rt-card__cat">${esc(cat.name)}</span>
        <h3>${esc(game.title)}</h3>
        <p>${esc(sub)}</p>
        <div class="rt-card__foot">
          ${opts?.daily ? `<span class="rt-card__reward"><i class="credit-coin">C</i>+${credits}</span>` : `<span class="rt-card__boards" title="Tableros ganados">${Array.from({ length: total }, (_, i) => `<i class="${won.includes(i) ? 'is-on' : ''}"></i>`).join('')}<small>${won.length}/${total}</small></span>`}
          <em>${done ? 'Jugar otra vez' : 'Jugar'} ${icon('i-arrow-right')}</em>
        </div>
      </div>
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
    const pct = daily.length ? Math.round((dailyDone / daily.length) * 100) : 0;
    body.innerHTML = `
      <section class="rt-block">
        <div class="rt-head"><div class="rt-head__title"><img src="${iconImg('reto-diario')}" alt="" width="44" height="44"><div><span>Cambian cada día</span><h2>Retos del día</h2></div></div>
          ${guest() ? '<small>Crea tu cuenta para ganar créditos</small>' : `<div class="rt-meter"><small>${dailyDone}/${daily.length || 3} completados</small><b style="--p:${pct}%"></b></div>`}</div>
        ${daily.length ? `<div class="rt-grid rt-grid--3">${daily.map(item => gameCard(gameOf(item.type), item.board, { daily: true })).join('')}</div>` : `<div class="rt-empty">${guest() ? 'Inicia sesión para ver los retos del día. Mientras tanto explora el Arcade.' : '<i class="rt-spin"></i>Cargando retos del día…'}</div>`}
      </section>
      <section class="rt-block" data-rt-mini-board></section>
      <section class="rt-block">
        <div class="rt-head"><div class="rt-head__title"><img src="${iconImg('lean')}" alt="" width="44" height="44"><div><span>Decisiones de planta · +25 créditos c/u</span><h2>Retos rápidos</h2></div></div><div class="rt-meter"><small>${doneQuick}/${QUICK.length} resueltos</small><b style="--p:${Math.round((doneQuick / QUICK.length) * 100)}%"></b></div></div>
        <div class="rt-quick">${QUICK.map((item, n) => {
          const done = !!qs[item.id]?.completed;
          return `<article class="rt-q ${done ? 'is-done' : ''}" data-rt-quick="${item.id}">
            <header class="rt-q__head"><img src="${iconImg(item.art)}" alt="" width="52" height="52" loading="lazy"><div><span>Reto ${n + 1} · ${esc(item.label)}</span><h3>${esc(item.title)}</h3></div>${done ? `<b class="rt-q__badge">${icon('i-check-circle')}Resuelto</b>` : '<b class="rt-q__badge rt-q__badge--coin"><i class="credit-coin">C</i>+25</b>'}</header>
            <p class="rt-q__case">${esc(item.text)}</p>
            <div class="rt-q__opts">${item.options.map((option, i) => `<button type="button" data-rt-opt="${i}"><i>${String.fromCharCode(65 + i)}</i><span>${esc(option)}</span></button>`).join('')}</div>
            <div class="rt-q__why" data-rt-why ${done ? '' : 'hidden'}><strong>${icon('i-check-circle')}Criterio</strong><p>${esc(item.why)}</p></div>
          </article>`;
        }).join('')}</div>
      </section>`;
    bindPlay(body);
    paintMiniBoard(body.querySelector('[data-rt-mini-board]'));
    body.querySelectorAll('[data-rt-quick]').forEach(card => {
      const item = QUICK.find(q => q.id === card.dataset.rtQuick);
      card.querySelectorAll('[data-rt-opt]').forEach(btn => btn.addEventListener('click', () => {
        const selected = Number(btn.dataset.rtOpt);
        card.querySelectorAll('[data-rt-opt]').forEach(b => { b.disabled = true; });
        btn.classList.add(selected === item.answer ? 'is-ok' : 'is-bad');
        if (selected === item.answer) card.querySelector(`[data-rt-opt="${item.answer}"]`)?.classList.add('is-ok');
        if (selected === item.answer) {
          const why = card.querySelector('[data-rt-why]');
          if (why) why.hidden = false;
          card.classList.add('is-done');
          const state = quickState();
          state[item.id] = { completed: true, completedAt: state[item.id]?.completedAt || new Date().toISOString() };
          try { localStorage.setItem(quickKey(), JSON.stringify(state)); } catch (e) {}
          window.__scheduleLearningSync?.();
          window.IMDIILCredits?.reto?.(item.id, selected);
          window.Toast?.success?.('Reto resuelto', 'Tu respuesta quedó registrada.');
          try { window.celebrarImdiil?.('normal'); } catch (e) {}
        } else {
          window.Toast?.info?.('Revisa el criterio', 'Vuelve a intentarlo en un momento.');
          setTimeout(() => { if (card.isConnected) card.querySelectorAll('[data-rt-opt]').forEach(b => { b.disabled = false; b.classList.remove('is-ok', 'is-bad'); }); }, 1400);
        }
      }));
    });
  }

  function paintArcade(body) {
    const games = catalog();
    const count = id => games.filter(game => GAME_CAT[game.type] === id).length;
    const visible = filter === 'todos' ? games : games.filter(game => GAME_CAT[game.type] === filter);
    const wins = data?.progress?.perGame || {};
    body.innerHTML = `<section class="rt-block">
      <div class="rt-head"><div class="rt-head__title"><img src="${iconImg('contra-reloj')}" alt="" width="44" height="44"><div><span>Arcade industrial</span><h2>${games.length || 16} mini juegos</h2></div></div><small>${guest() ? 'Juega libre · crea tu cuenta para ganar créditos' : `${(data?.progress?.todayDone || []).length} ganados hoy · +${Number(data?.gameCredits) || 20} créditos por juego al día`}</small></div>
      <div class="rt-filters" role="toolbar" aria-label="Filtrar por tema">
        <button type="button" class="${filter === 'todos' ? 'is-active' : ''}" data-rt-filter="todos"><span class="rt-filters__all">${games.length || 16}</span>Todos</button>
        ${CATS.filter(cat => !games.length || count(cat.id)).map(cat => `<button type="button" class="${filter === cat.id ? 'is-active' : ''}" data-rt-filter="${cat.id}"><img src="${iconImg(cat.id)}" alt="" width="26" height="26" loading="lazy">${esc(cat.name)}</button>`).join('')}
      </div>
      ${games.length ? `<div class="rt-grid">${visible.map(game => gameCard(game, (Number(wins[game.type]?.wins) || 0) % game.boards.length)).join('')}</div>` : `<div class="rt-empty">${guest() ? 'Crea tu cuenta gratis para jugar el Arcade de IMDIIL.' : '<i class="rt-spin"></i>Cargando juegos…'}</div>`}
    </section>`;
    body.querySelectorAll('[data-rt-filter]').forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.rtFilter; paintArcade(body); }));
    bindPlay(body);
  }

  // ─── Clasificación del club ───
  const initials = name => String(name || 'M').split(' ').map(part => part[0]).join('').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2).toUpperCase() || 'M';
  const avatar = (row, size) => row.photo
    ? `<img class="rt-av" src="${esc(row.photo)}" alt="" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rt-av rt-av--txt',textContent:'${esc(initials(row.name))}'}))">`
    : `<span class="rt-av rt-av--txt">${esc(initials(row.name))}</span>`;
  const medal = tier => `<span class="rt-medal rt-medal--${esc(tier?.id || 'aprendiz')}" title="Nivel ${esc(tier?.name || 'Aprendiz')}"><i></i></span>`;
  const PERIOD_LABEL = { week: 'Esta semana', month: 'Este mes', all: 'Histórico' };
  const EARN = [
    { icon: 'contra-reloj', title: 'Gana un mini juego', detail: '16 juegos en el Arcade', xp: 20, go: 'arcade' },
    { icon: 'calidad', title: 'Resuelve un caso de planta', detail: '+10 XP por decisión correcta', xp: 40, go: 'casos' },
    { icon: 'lean', title: 'Domina una flashcard', detail: '52 tarjetas técnicas', xp: 4, go: 'flashcards' },
    { icon: 'reto-diario', title: 'Entrena cada día', detail: 'Mantén tu racha activa', xp: 5, go: 'hoy' }
  ];

  function paintMiniBoard(host) {
    if (!host) return;
    const board = boards.week?.data;
    if (guest() || !board || !board.rows?.length) { host.remove(); return; }
    const top = board.rows.slice(0, 3);
    host.innerHTML = `<div class="rt-mini">
      <div class="rt-mini__head"><img src="${IMG}portadas/pareto.webp" alt="" loading="lazy"><div><span>Clasificación del club</span><h2>Así va la semana</h2><p>${board.me?.rank ? `Vas en el lugar <b>#${board.me.rank}</b> de ${fmt(board.players)}.` : 'Juega un reto para entrar a la clasificación.'}</p></div></div>
      <ol class="rt-mini__list">${top.map(row => `<li class="${row.me ? 'is-me' : ''}"><b class="rt-mini__pos rt-mini__pos--${row.rank}">${row.rank}</b>${avatar(row, 40)}<div><strong>${esc(row.name)}${row.vip ? ' <i class="rt-vip">★ VIP</i>' : ''}</strong><small>${esc(row.tier?.name || '')}</small></div><em>${fmt(row.xp)} XP</em></li>`).join('')}</ol>
      <button type="button" class="rt-btn rt-btn--primary" data-rt-goto="clasificacion">Ver clasificación ${icon('i-arrow-right')}</button>
    </div>`;
    host.querySelector('[data-rt-goto]').addEventListener('click', () => { tab = 'clasificacion'; paint(); });
  }

  function paintLeaderboard(body) {
    const cached = boards[period]?.data;
    const head = `<div class="rt-lb__head">
        <div class="rt-head__title"><img src="${iconImg('reto-diario')}" alt="" width="52" height="52"><div><span>Comunidad IMDIIL</span><h2>Clasificación del club</h2><p>Compite con los miembros del club. La semana y el mes se reinician solos.</p></div></div>
        <div class="rt-seg" role="tablist">${Object.entries(PERIOD_LABEL).map(([key, label]) => `<button type="button" role="tab" class="${key === period ? 'is-active' : ''}" data-rt-period="${key}">${label}</button>`).join('')}</div>
      </div>`;
    if (guest()) {
      body.innerHTML = `<section class="rt-lb">${head}<div class="rt-empty">Crea tu cuenta gratis para aparecer en la clasificación del club.</div></section>`;
    } else if (!cached) {
      body.innerHTML = `<section class="rt-lb">${head}<div class="rt-empty"><i class="rt-spin"></i>Cargando clasificación…</div></section>`;
      loadBoard(period).then(result => {
        if (!body.isConnected || tab !== 'clasificacion' || session) return;
        if (result) { paintLeaderboard(body); return; }
        const empty = body.querySelector('.rt-empty');
        if (empty) empty.textContent = 'No pudimos cargar la clasificación. Intenta de nuevo en un momento.';
      });
    } else {
      const rows = cached.rows || [];
      const me = cached.me || {};
      const podium = [rows[1], rows[0], rows[2]].filter(Boolean);
      const next = me.tier?.next;
      const progress = next ? Math.min(100, Math.round(((me.totalXp || 0) / next.at) * 100)) : 100;
      body.innerHTML = `<section class="rt-lb">${head}
        <div class="rt-lb__me">
          ${avatar(me, 54)}
          <div class="rt-lb__me-copy"><span>Tu posición · ${esc(PERIOD_LABEL[period])}</span>${me.rank ? `<strong>#${me.rank} <small>de ${fmt(cached.players)}</small></strong>` : `<strong class="rt-lb__me-none">Aún sin lugar</strong><button type="button" class="rt-lb__me-cta" data-rt-goto="arcade">Jugar mi primer reto ${icon('i-arrow-right')}</button>`}</div>
          <div class="rt-lb__me-tier">${medal(me.tier)}<div><b>${esc(me.tier?.name || 'Aprendiz')}</b><small>${next ? `${fmt(Math.max(0, next.at - (me.totalXp || 0)))} XP para ${esc(next.name)}` : 'Nivel máximo'}</small><i class="rt-lb__bar"><i style="width:${progress}%"></i></i></div></div>
          <div class="rt-lb__me-xp"><strong>${fmt(me.xp)}</strong><small>XP ${period === 'all' ? 'total' : 'del periodo'}</small></div>
        </div>
        ${rows.length ? `<div class="rt-podium">${podium.map(row => `<div class="rt-podium__col rt-podium__col--${row.rank} ${row.me ? 'is-me' : ''}">
            <div class="rt-podium__who">${row.rank === 1 ? '<span class="rt-crown" aria-hidden="true"></span>' : ''}${avatar(row, row.rank === 1 ? 84 : 68)}${medal(row.tier)}</div>
            <strong>${esc(row.name)}</strong>
            ${row.vip ? '<i class="rt-vip">★ VIP</i>' : '<i class="rt-pill">Miembro</i>'}
            <b class="rt-podium__xp">${fmt(row.xp)} XP</b>
            <div class="rt-podium__step"><span>${row.rank}</span></div>
          </div>`).join('')}</div>
          <ol class="rt-lb__list">${rows.slice(3).map(row => `<li class="${row.me ? 'is-me' : ''}"><b>#${row.rank}</b>${avatar(row, 42)}<div class="rt-lb__name"><strong>${esc(row.name)}</strong><span>${row.vip ? '<i class="rt-vip">★ VIP</i>' : '<i class="rt-pill">Miembro</i>'}<i class="rt-tier rt-tier--${esc(row.tier?.id)}">${esc(row.tier?.name || '')}</i>${row.streak > 1 ? `<i class="rt-pill">${row.streak} días</i>` : ''}</span></div><em>${fmt(row.xp)}<small>XP</small></em></li>`).join('')}</ol>`
          : `<div class="rt-podium rt-podium--empty">${[2, 1, 3].map(rank => `<div class="rt-podium__col rt-podium__col--${rank}">
              <div class="rt-podium__who">${rank === 1 ? '<span class="rt-crown" aria-hidden="true"></span>' : ''}<span class="rt-av rt-av--ghost">?</span></div>
              <strong>Lugar disponible</strong><i class="rt-pill">${rank === 1 ? 'Puede ser tuyo' : 'Sin ocupar'}</i>
              <div class="rt-podium__step"><span>${rank}</span></div>
            </div>`).join('')}</div>
            <p class="rt-lb__empty">${period === 'week' ? 'La semana arrancó en ceros.' : period === 'month' ? 'El mes arrancó en ceros.' : 'Todavía nadie suma XP.'} El primero que juegue se lleva el lugar #1.</p>`}
        <div class="rt-earn">
          <div class="rt-earn__head"><span>Cómo subir en la clasificación</span><small>Todo suma XP automáticamente</small></div>
          <div class="rt-earn__grid">${EARN.map(item => `<button type="button" class="rt-earn__item" data-rt-goto="${item.go}"><img src="${iconImg(item.icon)}" alt="" width="46" height="46" loading="lazy"><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><em>+${item.xp} XP</em></button>`).join('')}</div>
        </div>
        <div class="rt-tiers">${(cached.tiers || []).slice().reverse().map(tier => `<span>${medal(tier)}<b>${esc(tier.name)}</b><small>${tier.min ? `${fmt(tier.min)}+ XP` : 'Inicio'}</small></span>`).join('')}</div>
        <p class="rt-lb__note">Avance sincronizado desde tu actividad. Solo mostramos nombre, foto y avance; nunca datos de contacto.</p>
      </section>`;
    }
    body.querySelectorAll('[data-rt-period]').forEach(btn => btn.addEventListener('click', () => { period = btn.dataset.rtPeriod; paintLeaderboard(body); }));
    body.querySelectorAll('[data-rt-goto]').forEach(btn => btn.addEventListener('click', () => { tab = btn.dataset.rtGoto; session = null; paint(); }));
  }

  // ─── Partida ───
  async function play(type, board) {
    const game = gameOf(type);
    if (!game) return;
    const index = Math.max(0, Math.min(game.boards.length - 1, Number(board) || 0));
    session = { type, board: index, game, data: game.boards[index], startedAt: Date.now(), token: null, minSeconds: 0, finished: false };
    const body = root.querySelector('[data-rt-body]');
    const cat = catOf(type);
    body.innerHTML = `<section class="rt-play" style="--g:${esc(game.color)}">
      <header class="rt-play__banner" style="--cover:url('${abs(cover(type))}')">
        <button type="button" class="rt-back" data-rt-back>← Volver</button>
        <div class="rt-play__title"><img src="${iconImg(cat.id)}" alt="" width="54" height="54"><div><span>${esc(game.label)} · Tablero ${index + 1} de ${game.boards.length}</span><strong>${esc(game.title)}</strong><small>${esc(session.data.title || '')}</small></div></div>
        <div class="rt-play__meta"><b data-rt-timer>0:00</b>${game.boards.length > 1 ? '<button type="button" class="rt-chip" data-rt-next-board>Otro tablero</button>' : ''}</div>
      </header>
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
      el.textContent = clock(Math.floor((Date.now() - current.startedAt) / 1000));
    }, 500);
    if (!guest()) {
      request('/credits/game/start', { method: 'POST', body: JSON.stringify({ type, board: index }) })
        .then(result => { if (session === current) { current.token = result.token; current.minSeconds = Number(result.minSeconds) || 0; } })
        .catch(error => console.warn('[retos] Partida sin token', error.message));
    }
    const stage = body.querySelector('[data-rt-stage]');
    body.querySelector('.rt-play')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    const runners = {
      memorama: runMemory, sopa: runWordsearch, crucigrama: runCrossword, ordenar: runOrder, clasificar: runClassify,
      riesgo: (st, b, d) => (b.scene ? runScene(st, b, d, 'riesgo') : runHazard(st, b, d)), adivina: runGuess,
      contra: (st, b, d) => runQuiz(st, b, d, game), vf: (st, b, d) => runTrueFalse(st, b, d, game), oee: runOee, balanceo: runBalance,
      ishikawa: runIshikawa, muda: (st, b, d) => runScene(st, b, d, 'muda'), control: runControl, pareto: runPareto, ruta: runRoute
    };
    (runners[type] || (() => {}))(stage, session.data, answer => win(current, answer));
  }

  async function win(current, answer) {
    if (session !== current || current.finished) return;
    current.finished = true;
    const stage = root?.querySelector('[data-rt-stage]');
    const seconds = Math.round((Date.now() - current.startedAt) / 1000);
    const panel = document.createElement('div');
    panel.className = 'rt-win';
    panel.innerHTML = `<img class="rt-win__art" src="${iconImg(catOf(current.type).id)}" alt="" width="84" height="84"><span>¡Juego completado!</span><h3>${esc(current.game.title)}</h3><p data-rt-win-msg>${guest() ? 'Crea tu cuenta para ganar créditos con cada juego.' : 'Validando tu partida…'}</p><div class="rt-win__actions"><button type="button" class="rt-btn" data-rt-again>Otro tablero</button><button type="button" class="rt-btn" data-rt-rank>Ver clasificación</button><button type="button" class="rt-btn rt-btn--primary" data-rt-done>Volver a Retos</button></div><small>Tiempo: ${clock(seconds)}</small>`;
    stage?.appendChild(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { window.celebrarImdiil?.('normal'); } catch (e) {}
    panel.querySelector('[data-rt-again]').addEventListener('click', () => play(current.type, (current.board + 1) % current.game.boards.length));
    panel.querySelector('[data-rt-rank]').addEventListener('click', () => { session = null; tab = 'clasificacion'; paint(); });
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
      Object.keys(boards).forEach(key => { delete boards[key]; });
      loadBoard('week', true);
      if (Number(result.credits) > 0) {
        msg.innerHTML = `<b class="rt-win__credits"><i class="credit-coin">C</i>+${fmt(result.credits)} créditos · +20 XP</b>`;
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

  // ─── Utilidades de los juegos nuevos (mismas reglas que el servidor) ───
  function oeeValues(b) {
    const run = b.planned - b.down;
    const pct = value => Math.round(value * 1000) / 10;
    const d = run / b.planned; const r = (b.ideal * b.total) / run; const c = b.good / b.total;
    return { d: pct(d), r: pct(r), c: pct(c), oee: pct(d * r * c) };
  }
  function controlRule(points, cl, sigma) {
    const z = points.map(p => (p - cl) / sigma);
    if (z.some(v => Math.abs(v) > 3)) return 'Un punto fuera de los límites de control (±3σ).';
    for (let i = 2; i < z.length; i += 1) {
      const w = z.slice(i - 2, i + 1);
      if (w.filter(v => v > 2).length >= 2 || w.filter(v => v < -2).length >= 2) return 'Dos de tres puntos seguidos más allá de 2σ del mismo lado.';
    }
    let run = 0; let side = 0;
    for (const v of z) { const s = Math.sign(v); run = s !== 0 && s === side ? run + 1 : (s !== 0 ? 1 : 0); side = s; if (run >= 8) return 'Ocho o más puntos seguidos del mismo lado de la línea central.'; }
    let up = 1; let down = 1;
    for (let i = 1; i < points.length; i += 1) {
      up = points[i] > points[i - 1] ? up + 1 : 1; down = points[i] < points[i - 1] ? down + 1 : 1;
      if (up >= 6 || down >= 6) return 'Seis o más puntos seguidos subiendo o bajando (tendencia).';
    }
    return null;
  }
  function paretoSolution(b) {
    const order = b.items.map((_, i) => i).sort((x, y) => b.items[y][1] - b.items[x][1]);
    const total = b.items.reduce((sum, item) => sum + item[1], 0);
    const vital = []; let acc = 0;
    for (const i of order) { vital.push(i); acc += b.items[i][1]; if (acc / total >= 0.8) break; }
    return { order, vital, total };
  }
  function routeSolution(b) {
    const aisles = [...new Set(b.picks.map(p => p[0]))].sort((x, y) => x - y);
    const order = [];
    aisles.forEach((aisle, k) => {
      const here = b.picks.map((p, i) => ({ i, pos: p[1], aisle: p[0] })).filter(item => item.aisle === aisle);
      here.sort((x, y) => (k % 2 === 0 ? x.pos - y.pos : y.pos - x.pos));
      order.push(...here.map(item => item.i));
    });
    return order;
  }
  const retry = () => { if (session) play(session.type, session.board); };

  // ─── Escena fotográfica: Detecta el riesgo / Encuentra el desperdicio ───
  function runScene(stage, board, done, kind) {
    const found = [];
    let misses = 0;
    let revealed = false;
    const noun = kind === 'muda' ? 'desperdicios' : 'riesgos';
    stage.innerHTML = `<div class="rt-sc">
      <div class="rt-sc__frame" data-sc-frame role="application" aria-label="Escena: ${esc(board.title)}. Toca donde veas ${noun}.">
        <img src="${scene(board.scene)}" alt="${esc(board.title)}" width="1448" height="1086" draggable="false">
        <div class="rt-sc__marks" data-sc-marks></div>
      </div>
      <aside class="rt-sc__side">
        <div class="rt-sc__count"><strong data-sc-count>0/${board.spots.length}</strong><span>${noun} encontrados</span><small>Fallos: <b data-sc-miss>0</b></small></div>
        <ol class="rt-sc__list" data-sc-list></ol>
        <button type="button" class="rt-btn rt-btn--ghost" data-sc-reveal>Mostrar respuestas</button>
      </aside>
    </div>`;
    const frame = stage.querySelector('[data-sc-frame]');
    const marks = stage.querySelector('[data-sc-marks]');
    const pin = (i, cls) => {
      const s = board.spots[i];
      const el = document.createElement('span');
      el.className = `rt-sc__pin ${cls || ''}`;
      el.style.cssText = `left:${s.x}%;top:${s.y}%;width:${s.r * 2}%`;
      el.innerHTML = `<b>${found.includes(i) ? found.indexOf(i) + 1 : '!'}</b>`;
      marks.appendChild(el);
    };
    const paintList = () => {
      stage.querySelector('[data-sc-count]').textContent = `${found.length}/${board.spots.length}`;
      stage.querySelector('[data-sc-miss]').textContent = misses;
      const order = revealed ? [...found, ...board.spots.map((_, i) => i).filter(i => !found.includes(i))] : found;
      stage.querySelector('[data-sc-list]').innerHTML = board.spots.map((_, k) => {
        const i = order[k];
        if (i === undefined) return '<li class="is-empty"><b>?</b><span>Por encontrar</span></li>';
        const s = board.spots[i];
        return `<li class="${found.includes(i) ? 'is-ok' : 'is-missed'}"><b>${k + 1}</b><span><strong>${esc(s.label)}</strong><small>${esc(s.why)}</small></span></li>`;
      }).join('');
    };
    frame.addEventListener('click', event => {
      if (revealed || found.length === board.spots.length) return;
      const rect = frame.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      let best = -1; let bestD = Infinity;
      board.spots.forEach((s, i) => {
        if (found.includes(i)) return;
        const d = Math.hypot(px - (s.x / 100) * rect.width, py - (s.y / 100) * rect.height);
        if (d <= (s.r / 100) * rect.width * 1.15 && d < bestD) { best = i; bestD = d; }
      });
      if (best < 0) {
        misses += 1;
        const miss = document.createElement('span');
        miss.className = 'rt-sc__miss';
        miss.style.cssText = `left:${(px / rect.width) * 100}%;top:${(py / rect.height) * 100}%`;
        marks.appendChild(miss);
        setTimeout(() => miss.remove(), 700);
        paintList();
        return;
      }
      found.push(best);
      pin(best, 'is-ok');
      paintList();
      if (found.length === board.spots.length) done({ found: found.slice() });
    });
    stage.querySelector('[data-sc-reveal]').addEventListener('click', event => {
      if (revealed) { retry(); return; }
      revealed = true;
      board.spots.forEach((_, i) => { if (!found.includes(i)) pin(i, 'is-missed'); });
      event.currentTarget.textContent = 'Intentar de nuevo';
      paintList();
    });
    paintList();
  }

  // ─── Contra reloj ───
  function runQuiz(stage, board, done, game) {
    const limit = Number(game.seconds) || 90;
    const passing = Number(game.passing) || 8;
    const answers = board.questions.map(() => null);
    const start = Date.now();
    let index = 0;
    let over = false;
    let lock = false;
    const left = () => Math.max(0, limit - Math.floor((Date.now() - start) / 1000));
    const score = () => answers.reduce((sum, value, i) => sum + (value === board.questions[i][2] ? 1 : 0), 0);
    const finish = () => {
      if (over) return;
      over = true;
      const ok = score();
      stage.innerHTML = `<div class="rt-qz__end ${ok >= passing ? 'is-win' : ''}"><strong>${ok}/${board.questions.length}</strong><span>${ok >= passing ? '¡Lo lograste a tiempo!' : `Necesitas ${passing} aciertos. ¡Otra vez!`}</span>
        <ol>${board.questions.map((q, i) => `<li class="${answers[i] === q[2] ? 'is-ok' : 'is-bad'}"><b>${i + 1}</b><span>${esc(q[0])}<small>${esc(q[1][q[2]])}</small></span></li>`).join('')}</ol>
        ${ok >= passing ? '' : '<div class="rt-play__actions"><span class="rt-play__note">Las respuestas cambian de orden en cada intento.</span><button type="button" class="rt-btn rt-btn--primary" data-qz-retry>Intentar de nuevo</button></div>'}</div>`;
      stage.querySelector('[data-qz-retry]')?.addEventListener('click', retry);
      if (ok >= passing) done({ answers: answers.map(value => (value === null ? -1 : value)) });
    };
    const paintQ = () => {
      if (over) return;
      if (index >= board.questions.length) { finish(); return; }
      const q = board.questions[index];
      stage.innerHTML = `<div class="rt-qz">
        <div class="rt-qz__time"><i data-qz-bar style="width:${(left() / limit) * 100}%"></i></div>
        <div class="rt-qz__meta"><span>Pregunta ${index + 1} de ${board.questions.length}</span><b data-qz-left>${clock(left())}</b></div>
        <h3>${esc(q[0])}</h3>
        <div class="rt-qz__opts">${q[1].map((option, i) => `<button type="button" data-qz="${i}"><i>${String.fromCharCode(65 + i)}</i>${esc(option)}</button>`).join('')}</div>
        <div class="rt-qz__dots">${board.questions.map((item, i) => `<i class="${i < index ? (answers[i] === item[2] ? 'is-ok' : 'is-bad') : i === index ? 'is-now' : ''}"></i>`).join('')}</div>
      </div>`;
      stage.querySelectorAll('[data-qz]').forEach(btn => btn.addEventListener('click', () => {
        if (lock || over) return;
        lock = true;
        const choice = Number(btn.dataset.qz);
        answers[index] = choice;
        btn.classList.add(choice === q[2] ? 'is-ok' : 'is-bad');
        stage.querySelector(`[data-qz="${q[2]}"]`)?.classList.add('is-ok');
        setTimeout(() => { lock = false; index += 1; paintQ(); }, 550);
      }));
    };
    const tick = setInterval(() => {
      if (!stage.isConnected || over) { clearInterval(tick); return; }
      const bar = stage.querySelector('[data-qz-bar]');
      const label = stage.querySelector('[data-qz-left]');
      if (bar) bar.style.width = `${(left() / limit) * 100}%`;
      if (label) label.textContent = clock(left());
      if (left() <= 0) { clearInterval(tick); finish(); }
    }, 250);
    paintQ();
  }

  // ─── Verdadero o falso ───
  function runTrueFalse(stage, board, done, game) {
    const passing = Number(game.passing) || 8;
    const answers = board.items.map(() => null);
    let checked = false;
    const paintTF = () => {
      const ok = answers.reduce((sum, value, i) => sum + (value === board.items[i][1] ? 1 : 0), 0);
      stage.innerHTML = `<div class="rt-tf">${board.items.map((item, i) => {
        const state = checked && answers[i] !== null ? (answers[i] === item[1] ? 'is-ok' : 'is-bad') : '';
        return `<div class="rt-tf__row ${state}"><b>${i + 1}</b><p>${esc(item[0])}${state === 'is-bad' ? `<small>${esc(item[2])}</small>` : ''}</p><div class="rt-tf__btns"><button type="button" class="${answers[i] === true ? 'is-active' : ''}" data-tf="${i}:1">Verdadero</button><button type="button" class="${answers[i] === false ? 'is-active' : ''}" data-tf="${i}:0">Falso</button></div></div>`;
      }).join('')}</div>
        <div class="rt-play__actions"><span class="rt-play__note">${checked ? `${ok}/${board.items.length} correctas · necesitas ${passing}` : `${answers.filter(v => v !== null).length}/${board.items.length} respondidas`}</span><button type="button" class="rt-btn rt-btn--primary" data-tf-check ${answers.some(v => v === null) ? 'disabled' : ''}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-tf]').forEach(btn => btn.addEventListener('click', () => { const [i, v] = btn.dataset.tf.split(':').map(Number); answers[i] = v === 1; paintTF(); }));
      stage.querySelector('[data-tf-check]').addEventListener('click', () => {
        checked = true;
        const score = answers.reduce((sum, value, i) => sum + (value === board.items[i][1] ? 1 : 0), 0);
        paintTF();
        if (score >= passing) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ answers: answers.slice() }); }
        else window.Toast?.info?.('Casi', `Tienes ${score} correctas. Corrige las marcadas en rojo.`);
      });
    };
    paintTF();
  }

  // ─── Calcula el OEE ───
  function runOee(stage, board, done) {
    const truth = oeeValues(board);
    const run = board.planned - board.down;
    const fields = [['d', 'Disponibilidad', 'Tiempo operativo ÷ tiempo planificado'], ['r', 'Rendimiento', '(Ciclo ideal × piezas totales) ÷ tiempo operativo'], ['c', 'Calidad', 'Piezas buenas ÷ piezas totales'], ['oee', 'OEE', 'Disponibilidad × Rendimiento × Calidad']];
    stage.innerHTML = `<div class="rt-oee">
      <div class="rt-oee__data"><span>${esc(board.title)}</span><p>${esc(board.context)}</p>
        <dl><div><dt>Tiempo planificado</dt><dd>${fmt(board.planned)} min</dd></div><div><dt>Paros no planeados</dt><dd>${fmt(board.down)} min</dd></div><div><dt>Ciclo ideal</dt><dd>${board.ideal} min/pza</dd></div><div><dt>Piezas producidas</dt><dd>${fmt(board.total)}</dd></div><div><dt>Piezas buenas</dt><dd>${fmt(board.good)}</dd></div></dl>
        <details><summary>Ver fórmulas</summary><ul>${fields.map(f => `<li><b>${f[1]}</b> = ${esc(f[2])}</li>`).join('')}<li>Tiempo operativo = planificado − paros</li></ul></details>
      </div>
      <div class="rt-oee__inputs">${fields.map(([key, label]) => `<label class="rt-oee__field" data-oee-field="${key}"><span>${label}</span><div><input type="number" inputmode="decimal" step="0.1" min="0" max="100" data-oee="${key}" placeholder="0.0"><i>%</i></div><small></small></label>`).join('')}
        <button type="button" class="rt-btn rt-btn--primary" data-oee-check>Comprobar</button></div>
    </div>`;
    stage.querySelector('[data-oee-check]').addEventListener('click', () => {
      const values = {};
      let all = true;
      fields.forEach(([key]) => {
        const input = stage.querySelector(`[data-oee="${key}"]`);
        const value = Number(String(input.value).replace(',', '.'));
        values[key] = value;
        const ok = input.value !== '' && Math.abs(value - truth[key]) <= 0.6;
        if (!ok) all = false;
        const box = stage.querySelector(`[data-oee-field="${key}"]`);
        box.classList.toggle('is-ok', ok);
        box.classList.toggle('is-bad', !ok && input.value !== '');
        box.querySelector('small').textContent = ok ? 'Correcto' : (input.value !== '' ? 'Revisa el cálculo' : '');
      });
      if (all) { stage.querySelectorAll('input,button').forEach(el => { el.disabled = true; }); done(values); }
      else window.Toast?.info?.('Revisa', `Tiempo operativo: ${fmt(run)} min. Usa un decimal.`);
    });
  }

  // ─── Balanceo de línea ───
  function runBalance(stage, board, done) {
    const assign = board.tasks.map(() => -1);
    const total = board.tasks.reduce((sum, task) => sum + task[2], 0);
    const index = Object.fromEntries(board.tasks.map((task, i) => [task[0], i]));
    const paintB = errors => {
      const load = Array(board.stations).fill(0);
      board.tasks.forEach((task, i) => { if (assign[i] >= 0) load[assign[i]] += task[2]; });
      stage.innerHTML = `<div class="rt-bal">
        <div class="rt-bal__kpis"><span><b>${board.takt} s</b>Takt time</span><span><b>${board.stations}</b>Estaciones</span><span><b>${total} s</b>Contenido de trabajo</span><span><b>${Math.round((total / (board.stations * board.takt)) * 100)}%</b>Eficiencia meta</span></div>
        <div class="rt-bal__stations">${load.map((value, s) => `<div class="rt-bal__st ${value > board.takt ? 'is-over' : value === board.takt ? 'is-full' : ''}"><span>Estación ${s + 1}</span><div class="rt-bal__bar"><i style="height:${Math.min(100, (value / board.takt) * 100)}%"></i><em style="bottom:100%"></em></div><b>${value}/${board.takt} s</b><small>${board.tasks.map((task, i) => (assign[i] === s ? task[0] : '')).filter(Boolean).join(' · ') || '—'}</small></div>`).join('')}</div>
        <div class="rt-bal__tasks">${board.tasks.map((task, i) => `<div class="rt-bal__task ${errors?.has(i) ? 'is-bad' : ''}"><b>${esc(task[0])}</b><div><strong>${esc(task[1])}</strong><small>${task[2]} s${task[3].length ? ` · después de ${task[3].join(', ')}` : ' · inicio'}</small></div><div class="rt-bal__pick">${Array.from({ length: board.stations }, (_, s) => `<button type="button" class="${assign[i] === s ? 'is-active' : ''}" data-bal="${i}:${s}">E${s + 1}</button>`).join('')}</div></div>`).join('')}</div>
      </div>
      <div class="rt-play__actions"><span class="rt-play__note">Ninguna estación puede pasar del takt. Una tarea va en la misma estación o después que sus antecesoras.</span><button type="button" class="rt-btn rt-btn--primary" data-bal-check ${assign.some(v => v < 0) ? 'disabled' : ''}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-bal]').forEach(btn => btn.addEventListener('click', () => { const [i, s] = btn.dataset.bal.split(':').map(Number); assign[i] = s; paintB(); }));
      stage.querySelector('[data-bal-check]').addEventListener('click', () => {
        const bad = new Set();
        const loads = Array(board.stations).fill(0);
        board.tasks.forEach((task, i) => { loads[assign[i]] += task[2]; });
        board.tasks.forEach((task, i) => {
          if (loads[assign[i]] > board.takt) bad.add(i);
          task[3].forEach(pred => { if (assign[index[pred]] > assign[i]) { bad.add(i); bad.add(index[pred]); } });
        });
        if (!bad.size) { paintB(); stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ assign: assign.slice() }); return; }
        paintB(bad);
        window.Toast?.info?.('Aún no', loads.some(v => v > board.takt) ? 'Hay estaciones arriba del takt time.' : 'Revisa la precedencia de las tareas en rojo.');
      });
    };
    paintB();
  }

  // ─── Diagrama de Ishikawa ───
  const SIX_M = ['Mano de obra', 'Método', 'Máquina', 'Material', 'Medición', 'Medio ambiente'];
  function runIshikawa(stage, board, done) {
    const assign = board.items.map(() => -1);
    let selected = 0;
    let checked = false;
    const chip = i => {
      const state = checked && assign[i] >= 0 ? (assign[i] === board.items[i][1] ? ' is-ok' : ' is-bad') : '';
      return `<button type="button" class="rt-fish__chip${selected === i ? ' is-sel' : ''}${state}" data-fish-item="${i}">${esc(board.items[i][0])}</button>`;
    };
    const bone = m => `<div class="rt-fish__bone rt-fish__bone--${m < 3 ? 'top' : 'bottom'}" data-fish-bone="${m}" role="button" tabindex="0"><span>${SIX_M[m]}</span><div>${board.items.map((_, i) => (assign[i] === m ? chip(i) : '')).join('')}</div></div>`;
    const paintF = () => {
      const pool = board.items.map((_, i) => i).filter(i => assign[i] < 0);
      stage.innerHTML = `<div class="rt-fish">
        <div class="rt-fish__pool"><span>${pool.length ? 'Elige una causa y luego toca su rama' : 'Todas las causas están en una rama'}</span><div>${pool.map(chip).join('')}</div></div>
        <div class="rt-fish__diagram">
          <div class="rt-fish__row">${[0, 1, 2].map(bone).join('')}</div>
          <div class="rt-fish__spine"><i></i><strong>${esc(board.effect)}</strong></div>
          <div class="rt-fish__row">${[3, 4, 5].map(bone).join('')}</div>
        </div>
      </div>
      <div class="rt-play__actions"><span class="rt-play__note">${board.items.length - pool.length}/${board.items.length} causas ubicadas</span><button type="button" class="rt-btn rt-btn--primary" data-fish-check ${pool.length ? 'disabled' : ''}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-fish-item]').forEach(btn => btn.addEventListener('click', event => { event.stopPropagation(); selected = Number(btn.dataset.fishItem); checked = false; paintF(); }));
      stage.querySelectorAll('[data-fish-bone]').forEach(el => {
        const drop = () => {
          if (selected === null) return;
          assign[selected] = Number(el.dataset.fishBone);
          checked = false;
          const rest = board.items.map((_, i) => i).filter(i => assign[i] < 0);
          selected = rest.length ? rest[0] : null;
          paintF();
        };
        el.addEventListener('click', drop);
        el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drop(); } });
      });
      stage.querySelector('[data-fish-check]').addEventListener('click', () => {
        checked = true;
        selected = null;
        const ok = board.items.every((item, i) => assign[i] === item[1]);
        paintF();
        if (ok) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ assign: assign.slice() }); }
        else window.Toast?.info?.('Revisa', 'Toca una causa en rojo y muévela a otra rama.');
      });
    };
    paintF();
  }

  // ─── ¿Está en control? ───
  function chartSvg(points, cl, sigma) {
    const W = 320; const H = 150; const pad = 26;
    const lo = cl - 4.2 * sigma; const hi = cl + 4.2 * sigma;
    const x = i => pad + (i * (W - pad - 8)) / (points.length - 1);
    const y = v => 8 + ((hi - Math.min(hi, Math.max(lo, v))) / (hi - lo)) * (H - 16);
    const line = (v, cls, label) => `<line class="${cls}" x1="${pad}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}"/>${label ? `<text x="2" y="${y(v) + 3}">${label}</text>` : ''}`;
    return `<svg viewBox="0 0 ${W} ${H}" class="rt-ctl__svg" role="img" aria-label="Carta de control">
      ${line(cl + 2 * sigma, 'is-2s')}${line(cl - 2 * sigma, 'is-2s')}${line(cl + 3 * sigma, 'is-lim', 'LSC')}${line(cl - 3 * sigma, 'is-lim', 'LIC')}${line(cl, 'is-cl', 'LC')}
      <polyline points="${points.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>
      ${points.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" class="${Math.abs(v - cl) > 3 * sigma ? 'is-out' : ''}"/>`).join('')}
    </svg>`;
  }
  function runControl(stage, board, done) {
    const assign = board.charts.map(() => -1);
    let checked = false;
    const paintC = () => {
      stage.innerHTML = `<div class="rt-ctl__legend"><span><i class="is-cl"></i>Línea central ${board.cl}</span><span><i class="is-lim"></i>Límites ±3σ</span><span><i class="is-2s"></i>±2σ</span><small>${esc(board.unit)}</small></div>
        <div class="rt-ctl">${board.charts.map((points, i) => {
          const rule = controlRule(points, board.cl, board.sigma);
          const truth = rule ? 1 : 0;
          const state = checked && assign[i] >= 0 ? (assign[i] === truth ? 'is-ok' : 'is-bad') : '';
          return `<div class="rt-ctl__card ${state}"><span>Carta ${i + 1}</span>${chartSvg(points, board.cl, board.sigma)}
            <div class="rt-ctl__btns"><button type="button" class="${assign[i] === 0 ? 'is-active' : ''}" data-ctl="${i}:0">En control</button><button type="button" class="${assign[i] === 1 ? 'is-active' : ''}" data-ctl="${i}:1">Fuera de control</button></div>
            ${checked && state ? `<small>${state === 'is-ok' ? (rule ? esc(rule) : 'Solo variación natural.') : 'Vuelve a revisar los patrones.'}</small>` : ''}</div>`;
        }).join('')}</div>
        <div class="rt-play__actions"><span class="rt-play__note">Busca puntos fuera de límites, rachas de 8 de un lado, tendencias de 6 y 2 de 3 cerca del límite.</span><button type="button" class="rt-btn rt-btn--primary" data-ctl-check ${assign.some(v => v < 0) ? 'disabled' : ''}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-ctl]').forEach(btn => btn.addEventListener('click', () => { const [i, v] = btn.dataset.ctl.split(':').map(Number); assign[i] = v; checked = false; paintC(); }));
      stage.querySelector('[data-ctl-check]').addEventListener('click', () => {
        checked = true;
        const ok = board.charts.every((points, i) => assign[i] === (controlRule(points, board.cl, board.sigma) ? 1 : 0));
        paintC();
        if (ok) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ assign: assign.slice() }); }
        else window.Toast?.info?.('Casi', 'Hay cartas mal evaluadas.');
      });
    };
    paintC();
  }

  // ─── Pareto rápido ───
  function runPareto(stage, board, done) {
    const truth = paretoSolution(board);
    let order = [];
    let step = 1;
    let vital = new Set();
    let wrong = false;
    const paintP = () => {
      if (step === 1) {
        stage.innerHTML = `<div class="rt-par">
          <p class="rt-par__step"><b>Paso 1</b> Toca las causas de mayor a menor (${esc(board.unit)}).</p>
          <div class="rt-par__items">${board.items.map((item, i) => {
            const pos = order.indexOf(i);
            const bad = wrong && pos >= 0 && truth.order[pos] !== i;
            return `<button type="button" class="${pos >= 0 ? 'is-active' : ''} ${bad ? 'is-bad' : ''}" data-par="${i}" ${pos >= 0 ? 'disabled' : ''}><i>${pos >= 0 ? pos + 1 : ''}</i><span>${esc(item[0])}</span><b>${fmt(item[1])}</b></button>`;
          }).join('')}</div>
        </div>
        <div class="rt-play__actions"><button type="button" class="rt-btn" data-par-undo ${order.length ? '' : 'disabled'}>Deshacer</button><button type="button" class="rt-btn rt-btn--primary" data-par-next ${order.length === board.items.length ? '' : 'disabled'}>Comprobar orden</button></div>`;
        stage.querySelectorAll('[data-par]').forEach(btn => btn.addEventListener('click', () => { order.push(Number(btn.dataset.par)); wrong = false; paintP(); }));
        stage.querySelector('[data-par-undo]').addEventListener('click', () => { order.pop(); wrong = false; paintP(); });
        stage.querySelector('[data-par-next]').addEventListener('click', () => {
          if (order.every((v, i) => v === truth.order[i])) { step = 2; paintP(); return; }
          wrong = true;
          const firstBad = order.findIndex((v, i) => v !== truth.order[i]);
          order = order.slice(0, firstBad);
          paintP();
          window.Toast?.info?.('Orden incorrecto', `Desde la posición ${firstBad + 1} el orden no es de mayor a menor.`);
        });
        return;
      }
      let acc = 0;
      const max = board.items[truth.order[0]][1];
      stage.innerHTML = `<div class="rt-par">
        <p class="rt-par__step"><b>Paso 2</b> Marca las pocas causas vitales que suman el 80%.</p>
        <div class="rt-par__chart">${truth.order.map(i => {
          acc += board.items[i][1];
          const cum = Math.round((acc / truth.total) * 1000) / 10;
          return `<button type="button" class="rt-par__bar ${vital.has(i) ? 'is-vital' : ''}" data-vital="${i}"><em class="${cum >= 80 ? 'is-80' : ''}">${cum}%</em><i style="height:${(board.items[i][1] / max) * 100}%"></i><span>${esc(board.items[i][0])}</span><b>${fmt(board.items[i][1])}</b></button>`;
        }).join('')}</div>
      </div>
      <div class="rt-play__actions"><span class="rt-play__note">${vital.size} seleccionadas · el % es acumulado</span><button type="button" class="rt-btn rt-btn--primary" data-par-check ${vital.size ? '' : 'disabled'}>Comprobar</button></div>`;
      stage.querySelectorAll('[data-vital]').forEach(btn => btn.addEventListener('click', () => { const i = Number(btn.dataset.vital); if (vital.has(i)) vital.delete(i); else vital.add(i); paintP(); }));
      stage.querySelector('[data-par-check]').addEventListener('click', () => {
        const ok = vital.size === truth.vital.length && truth.vital.every(i => vital.has(i));
        if (ok) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ order: truth.order.slice(), vital: [...vital] }); }
        else window.Toast?.info?.('Revisa', 'Las vitales son las primeras causas hasta alcanzar el 80% acumulado.');
      });
    };
    paintP();
  }

  // ─── Ruta logística ───
  function runRoute(stage, board, done) {
    const truth = routeSolution(board);
    let order = [];
    const W = 560; const H = 330; const left = 46; const top = 26; const bottom = H - 40;
    const gap = (W - left - 20) / board.aisles;
    const ax = a => left + gap * (a - 0.5);
    const py = p => bottom - ((p - 0.5) * (bottom - top)) / board.positions;
    const start = { x: ax(1) - gap / 2 + 6, y: H - 14 };
    const path = () => {
      const pts = [start];
      order.forEach(i => {
        const [a, p] = board.picks[i];
        const prev = pts[pts.length - 1];
        const target = { x: ax(a), y: py(p) };
        if (Math.abs(prev.x - target.x) > 1) {
          const viaTop = (prev.y - top + 8) + (target.y - top + 8) < (H - 14 - prev.y) + (H - 14 - target.y);
          const cross = viaTop ? top - 12 : H - 14;
          pts.push({ x: prev.x, y: cross }, { x: target.x, y: cross });
        }
        pts.push(target);
      });
      return pts;
    };
    const paintR = bad => {
      const pts = path();
      stage.innerHTML = `<div class="rt-route">
        <svg viewBox="0 0 ${W} ${H}" class="rt-route__map" role="img" aria-label="Mapa del almacén">
          ${Array.from({ length: board.aisles + 1 }, (_, k) => `<rect class="rt-route__rack" x="${left + gap * k - 9}" y="${top}" width="18" height="${bottom - top}" rx="3"/>`).join('')}
          ${Array.from({ length: board.aisles }, (_, k) => `<text class="rt-route__aisle" x="${ax(k + 1)}" y="${top - 14}">P${k + 1}</text>`).join('')}
          <polyline class="rt-route__path" points="${pts.map(p => `${p.x},${p.y}`).join(' ')}"/>
          <g class="rt-route__start"><circle cx="${start.x}" cy="${start.y}" r="7"/><text x="${start.x + 12}" y="${start.y + 4}">Inicio</text></g>
          ${board.picks.map((pick, i) => {
            const pos = order.indexOf(i);
            return `<g class="rt-route__pick ${pos >= 0 ? 'is-on' : ''} ${bad && pos >= 0 && truth[pos] !== i ? 'is-bad' : ''}" data-route="${i}" role="button" tabindex="0"><circle cx="${ax(pick[0])}" cy="${py(pick[1])}" r="12"/><text x="${ax(pick[0])}" y="${py(pick[1]) + 4}">${pos >= 0 ? pos + 1 : ''}</text></g>`;
          }).join('')}
        </svg>
        <div class="rt-route__side"><span>Pedido · ${board.picks.length} ubicaciones</span>
          <ol>${board.picks.map((pick, i) => ({ pick, i })).sort((x, y) => x.pick[0] - y.pick[0] || x.pick[1] - y.pick[1]).map(({ pick, i }) => `<li class="${order.includes(i) ? 'is-on' : ''}"><b>P${pick[0]}·${pick[1]}</b>${esc(pick[2])}</li>`).join('')}</ol>
          <small>Recorre en serpentina: entra al primer pasillo con pedido, avanza hacia el fondo, pasa al siguiente y regresa.</small>
        </div>
      </div>
      <div class="rt-play__actions"><button type="button" class="rt-btn" data-route-undo ${order.length ? '' : 'disabled'}>Deshacer</button><button type="button" class="rt-btn rt-btn--primary" data-route-check ${order.length === board.picks.length ? '' : 'disabled'}>Comprobar ruta</button></div>`;
      stage.querySelectorAll('[data-route]').forEach(el => {
        const pick = () => { const i = Number(el.dataset.route); if (!order.includes(i)) { order.push(i); paintR(); } };
        el.addEventListener('click', pick);
        el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); } });
      });
      stage.querySelector('[data-route-undo]').addEventListener('click', () => { order.pop(); paintR(); });
      stage.querySelector('[data-route-check]').addEventListener('click', () => {
        if (order.every((v, i) => v === truth[i])) { stage.querySelectorAll('button').forEach(b => { b.disabled = true; }); done({ order: order.slice() }); return; }
        paintR(true);
        window.Toast?.info?.('Ruta más larga', 'Las paradas en rojo rompen la serpentina. Deshaz y vuelve a intentar.');
      });
    };
    paintR();
  }

  // ─── Registro de la sección ───
  window.IMDIILRetos = { render, refresh: () => Promise.all([load(true), loadBoard('week', true)]).then(() => { if (root?.isConnected && !session) paint(); }) };
  window.addEventListener('imdiil:credits-changed', event => {
    const balance = Number(event.detail?.balance);
    if (data && Number.isFinite(balance)) data.balance = balance;
  });
}());
