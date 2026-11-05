// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Entrenamiento (casos prácticos, flashcards, XP y racha)
//
// Misma idea que el Entrenamiento de IMFRA, con contenido de ingeniería
// industrial. El avance se guarda en el servidor (/training/me →
// training_progress/{uid}), así que es el mismo en PC y celular; el
// navegador solo guarda una copia como caché. El XP lo calcula el
// servidor a partir de lo resuelto.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const CONTENT = window.IMDIIL_TRAINING_CONTENT || { cases: [], cards: [], levels: [] };
  const API = () => String(window.WEBHOOK_URL || '').replace(/\/$/, '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#${name}"/></svg>`;
  const today = () => new Date().toISOString().slice(0, 10);
  const fmt = n => Number(n || 0).toLocaleString('es-MX');

  // ─── Estado y reglas (iguales a lib/training.js del webhook) ───
  const emptyState = () => ({ cases: {}, cards: {}, days: [] });
  function xpOf(state) {
    const cases = Object.values(state.cases || {}).reduce((sum, item) => sum + 40 + 10 * (Number(item.score) || 0), 0);
    const cards = Object.values(state.cards || {}).reduce((sum, item) => sum + 4 * (Number(item.confidence) || 0), 0);
    return cases + cards + 5 * (state.days || []).length;
  }
  function streakOf(days) {
    const set = new Set(days || []);
    const cursor = new Date();
    const key = () => cursor.toISOString().slice(0, 10);
    if (!set.has(key())) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let count = 0;
    while (set.has(key())) { count += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
    return count;
  }
  function merge(a, b) {
    const out = emptyState();
    [a, b].forEach(state => {
      if (!state) return;
      Object.entries(state.cases || {}).forEach(([id, item]) => {
        const current = out.cases[id];
        if (!current || Number(item.score) > Number(current.score)) out.cases[id] = { score: Number(item.score) || 0, completedAt: item.completedAt };
      });
      Object.entries(state.cards || {}).forEach(([id, item]) => {
        const current = out.cards[id];
        out.cards[id] = current
          ? { confidence: Math.max(current.confidence, Number(item.confidence) || 0), lastReviewed: String(item.lastReviewed) > String(current.lastReviewed) ? item.lastReviewed : current.lastReviewed }
          : { confidence: Number(item.confidence) || 0, lastReviewed: item.lastReviewed };
      });
      out.days.push(...(state.days || []));
    });
    out.days = [...new Set(out.days)].sort().slice(-90);
    return out;
  }
  function canon(value) {
    const m = merge(value, null);
    const sorted = obj => Object.keys(obj).sort().map(key => [key, obj[key].score ?? obj[key].confidence]);
    return JSON.stringify([sorted(m.cases), sorted(m.cards), m.days]);
  }
  function levelOf(xp) {
    const levels = CONTENT.levels.length ? CONTENT.levels : [{ name: 'En formación', start: 0, next: 100 }];
    return [...levels].reverse().find(item => xp >= item.start) || levels[0];
  }
  function weekStart() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date.getTime();
  }

  // ─── Persistencia: servidor como fuente, navegador como caché ───
  const uid = () => window.UserState?.uid || window.__auth?.currentUser?.uid || '';
  const isDemo = () => !!window.__isDemoMode || window.UserState?.modo === 'invitado' || !uid();
  const cacheKey = () => `imdiil:training:v1:${uid() || 'demo'}`;
  let state = emptyState();
  let serverXp = null;
  let loadedFor = null;
  let syncTimer = null;
  let syncing = null;

  function readCache() { try { return JSON.parse(localStorage.getItem(cacheKey()) || 'null') || emptyState(); } catch (e) { return emptyState(); } }
  function writeCache() { try { localStorage.setItem(cacheKey(), JSON.stringify(state)); } catch (e) {} }

  async function token() {
    let user = window.__auth?.currentUser || window.__currentUser;
    for (let i = 0; !user && i < 50; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      user = window.__auth?.currentUser || window.__currentUser;
    }
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }
  async function request(method, body) {
    const response = await fetch(`${API()}/training/me`, {
      method,
      cache: 'no-store',
      headers: Object.assign({ Authorization: `Bearer ${await token()}` }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo sincronizar el entrenamiento');
    return data.progress || {};
  }
  function applyServer(progress) {
    state = merge(state, progress);
    serverXp = Number(progress.xp);
    writeCache();
  }
  async function load(force) {
    const id = uid() || 'demo';
    if (loadedFor === id && !force) return;
    if (loadedFor !== id) state = readCache();
    loadedFor = id;
    if (isDemo()) return;
    try {
      const remote = await request('GET');
      const remoteCanon = canon(remote);
      applyServer(remote);
      // Si este dispositivo tenía avance que el servidor no, se sube.
      if (canon(state) !== remoteCanon) scheduleSync(0);
    } catch (error) {
      console.warn('[entrenamiento] Usando copia local:', error.message);
    }
  }
  function scheduleSync(delay) {
    writeCache();
    if (isDemo()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (syncing) { scheduleSync(800); return; }
      syncing = request('PUT', state)
        .then(progress => { applyServer(progress); if (view !== 'case') repaint(); })
        .catch(error => console.warn('[entrenamiento] Sincronización pendiente:', error.message))
        .finally(() => { syncing = null; });
    }, delay == null ? 700 : delay);
  }
  function registerDay() {
    if (!state.days.includes(today())) state.days.push(today());
    state.days = [...new Set(state.days)].sort().slice(-90);
  }
  const xp = () => Math.max(xpOf(state), Number.isFinite(serverXp) ? serverXp : 0);

  // Créditos: solo si existe el módulo de créditos (otra parte del panel lo provee).
  function earn(payload) {
    try { window.IMDIILCredits?.earn?.(payload); } catch (e) { console.warn('[entrenamiento] Créditos no disponibles', e); }
  }
  const celebrate = level => { try { window.celebrarImdiil?.(level); } catch (e) {} };

  // ─── Vistas ───
  let container = null;
  let view = 'hub';
  let selected = null;
  let step = 0;
  let answer = null;
  let score = 0;
  let finished = false;
  let cardArea = 'Todas';
  let deck = CONTENT.cards.slice();
  let cardIndex = 0;
  let flipped = false;
  // Embebido dentro de Retos: sin portada propia; las pestañas las pone Retos.
  let embedded = false;
  let onNavigate = null;

  function shell(content) {
    if (embedded) {
      container.innerHTML = `<div class="tr-page tr-page--embedded fade-up">${content}</div>`;
      bind();
      return;
    }
    const total = xp();
    const lvl = levelOf(total);
    const pct = lvl.next === lvl.start ? 100 : Math.min(100, Math.round((total - lvl.start) / (lvl.next - lvl.start) * 100));
    const streak = streakOf(state.days);
    container.innerHTML = `<div class="tr-page fade-up">
      <header class="tr-hero">
        <div class="tr-hero__copy"><span class="tr-kicker">${icon('i-briefcase')}Entrenamiento IMDIIL</span><h1>Practica para <em>la planta real.</em></h1><p>Casos de ingeniería industrial y tarjetas técnicas. Tu avance se guarda en tu cuenta y te sigue en cualquier dispositivo.</p></div>
        <div class="tr-hero__stats"><div><span>Racha</span><strong>${streak} día${streak === 1 ? '' : 's'}</strong></div><div><span>XP formativo</span><strong>${fmt(total)}</strong></div></div>
      </header>
      <section class="tr-level"><div><span>Nivel profesional</span><strong>${esc(lvl.name)}</strong></div><div class="tr-level__bar"><span style="width:${pct}%"></span></div><b>${pct}%</b></section>
      ${content}
    </div>`;
    bind();
  }

  function back(target, label) {
    if (embedded && target === 'hub') return '';
    return `<button class="tr-back" type="button" data-tr-go="${target}"><span aria-hidden="true">←</span> ${esc(label)}</button>`;
  }

  function renderHub() {
    view = 'hub';
    const start = weekStart();
    const casesDone = Object.keys(state.cases).length;
    const cardsSeen = Object.keys(state.cards).length;
    const cardsMastered = Object.values(state.cards).filter(item => item.confidence >= 3).length;
    const casesWeek = Object.values(state.cases).filter(item => new Date(item.completedAt).getTime() >= start).length;
    const cardsWeek = Object.values(state.cards).filter(item => new Date(item.lastReviewed).getTime() >= start).length;
    const missions = [
      { label: 'Resuelve casos de planta', value: Math.min(casesWeek, 2), goal: 2, go: 'cases' },
      { label: 'Repasa tarjetas técnicas', value: Math.min(cardsWeek, 10), goal: 10, go: 'cards' },
      { label: 'Entrena 3 días distintos', value: Math.min(state.days.filter(day => new Date(day + 'T12:00:00').getTime() >= start).length, 3), goal: 3, go: 'cards' }
    ];
    const missionsDone = missions.filter(item => item.value >= item.goal).length;
    const badges = [
      { label: 'Primer diagnóstico', detail: 'Resuelve un caso', done: casesDone >= 1, glyph: '◎' },
      { label: 'Memoria técnica', detail: 'Domina 10 tarjetas', done: cardsMastered >= 10, glyph: '◆' },
      { label: 'Constancia', detail: 'Racha de 3 días', done: streakOf(state.days) >= 3, glyph: '▲' },
      { label: 'Criterio integral', detail: `Resuelve los ${CONTENT.cases.length} casos`, done: casesDone >= CONTENT.cases.length, glyph: '★' },
      { label: 'Precisión', detail: 'Un caso sin errores', done: Object.entries(state.cases).some(([id, item]) => item.score >= (CONTENT.cases.find(c => c.id === id)?.steps.length || 99)), glyph: '✓' },
      { label: 'Experto en conceptos', detail: `Domina las ${CONTENT.cards.length} tarjetas`, done: cardsMastered >= CONTENT.cards.length, glyph: '♛' }
    ];
    shell(`<div class="tr-layout">
      <main class="tr-main">
        <div class="tr-section-head"><div><span>Entrenamiento aplicado</span><h2>Elige una modalidad</h2></div><small>${casesDone} casos · ${cardsSeen} tarjetas estudiadas</small></div>
        <div class="tr-modes">
          <article class="tr-tile tr-tile--case" data-tr-go="cases" tabindex="0">
            <span class="tr-tile__icon">${icon('i-clipboard-check')}</span>
            <h3>Casos de planta</h3>
            <p>Decide con criterio técnico en situaciones reales de OEE, Lean, calidad, mantenimiento, seguridad y logística.</p>
            <span class="tr-tile__stat">${casesDone}/${CONTENT.cases.length} casos resueltos</span>
            <span class="tr-tile__cta">Abrir casos ${icon('i-arrow-right')}</span>
          </article>
          <article class="tr-tile tr-tile--flash" data-tr-go="cards" tabindex="0">
            <span class="tr-tile__icon">${icon('i-book')}</span>
            <h3>Flashcards técnicas</h3>
            <p>Repasa fórmulas, métodos y normas con repetición. Marca cuánto dominas cada concepto.</p>
            <span class="tr-tile__stat">${cardsMastered}/${CONTENT.cards.length} dominadas</span>
            <span class="tr-tile__cta">Repasar ${icon('i-arrow-right')}</span>
          </article>
        </div>
        <section class="tr-achievements"><div class="tr-section-head"><div><span>Progreso verificable</span><h2>Insignias técnicas</h2></div><small>${badges.filter(b => b.done).length}/${badges.length}</small></div>
          <div class="tr-badge-grid">${badges.map(b => `<article class="tr-badge ${b.done ? 'is-earned' : ''}"><i aria-hidden="true">${b.glyph}</i><span>${b.done ? 'Obtenida' : 'Por desbloquear'}</span><strong>${esc(b.label)}</strong><small>${esc(b.detail)}</small></article>`).join('')}</div>
        </section>
      </main>
      <aside class="tr-side">
        <section class="tr-mission"><div class="tr-mission__head"><div>${icon('i-trophy')}</div><span><small>Misión semanal</small><strong>${missionsDone} de ${missions.length} completadas</strong></span></div>
          <div class="tr-mission__progress"><span style="width:${Math.round(missionsDone / missions.length * 100)}%"></span></div>
          <ul>${missions.map(m => `<li class="${m.value >= m.goal ? 'is-done' : ''}" data-tr-go="${m.go}"><b>${m.value >= m.goal ? '✓' : `${m.value}/${m.goal}`}</b><span>${esc(m.label)}</span></li>`).join('')}</ul>
        </section>
        <section class="tr-standard"><span>Cómo ganas XP</span><ul><li><b>+40</b> por caso resuelto, más <b>+10</b> por decisión correcta</li><li><b>+4</b> por nivel de dominio en cada tarjeta</li><li><b>+5</b> por cada día que entrenas</li></ul><p>Tu XP se calcula en tu cuenta: es el mismo en tu PC y en tu celular.</p></section>
      </aside>
    </div>`);
  }

  function renderCases() {
    view = 'cases';
    const areas = [...new Set(CONTENT.cases.map(item => item.area))];
    shell(`${back('hub', 'Centro de entrenamiento')}
      <div class="tr-section-head tr-section-head--page"><div><span>Simulador profesional</span><h2>Casos de planta</h2><p>Escenarios reales para practicar decisiones de ${esc(areas.join(', '))}.</p></div><small>${Object.keys(state.cases).length}/${CONTENT.cases.length} resueltos</small></div>
      <div class="tr-case-grid">${CONTENT.cases.map((item, index) => {
        const result = state.cases[item.id];
        return `<article class="tr-case-card ${result ? 'is-complete' : ''}"><div class="tr-case-card__top"><b>${String(index + 1).padStart(2, '0')}</b><span>${esc(item.area)}</span>${result ? `<em>✓ ${result.score}/${item.steps.length}</em>` : ''}</div><h3>${esc(item.title)}</h3><p>${esc(item.scenario)}</p><div class="tr-case-card__meta"><span>${esc(item.difficulty)}</span><span>${esc(item.duration)}</span></div><button class="tr-btn" type="button" data-tr-case="${item.id}">${result ? 'Resolver de nuevo' : 'Abrir caso'} ${icon('i-arrow-right')}</button></article>`;
      }).join('')}</div>`);
  }

  function renderCase() {
    if (!selected) { renderCases(); return; }
    view = 'case';
    const total = selected.steps.length;
    if (finished) {
      const pct = Math.round(score / total * 100);
      shell(`${back('cases', 'Casos de planta')}
        <section class="tr-case-result"><div class="tr-case-result__score"><strong>${pct}%</strong><span>${score} de ${total}</span></div>
        <div><span class="tr-kicker">Caso completado</span><h2>${esc(selected.title)}</h2><p>${pct === 100 ? 'Tomaste decisiones correctas y fundamentadas en todo el caso.' : 'El caso quedó registrado. Revisa las explicaciones y vuelve a intentarlo para mejorar tu mejor resultado.'}</p>
        <div class="tr-case-result__actions"><button class="tr-btn tr-btn--primary" type="button" data-tr-go="cases">Siguiente caso ${icon('i-arrow-right')}</button><button class="tr-btn" type="button" data-tr-case="${selected.id}">Repetir</button></div></div></section>`);
      return;
    }
    const current = selected.steps[step];
    const options = current.options.map((option, index) => {
      let cls = '';
      if (answer !== null) cls = index === current.correct ? ' is-correct' : index === answer ? ' is-wrong' : ' is-dim';
      return `<button class="tr-option${cls}" type="button" data-tr-answer="${index}" ${answer !== null ? 'disabled' : ''}><b>${String.fromCharCode(65 + index)}</b><span>${esc(option)}</span></button>`;
    }).join('');
    shell(`${back('cases', 'Casos de planta')}
      <section class="tr-case-run"><header><div><span class="tr-kicker">${esc(selected.area)} · ${esc(selected.difficulty)}</span><h2>${esc(selected.title)}</h2></div><b>${step + 1}/${total}</b></header>
        <div class="tr-case-run__bar"><span style="width:${(step + (answer !== null ? 1 : 0)) / total * 100}%"></span></div>
        <div class="tr-case-run__scenario"><span>Situación</span><p>${esc(selected.scenario)}</p><small><b>Objetivo:</b> ${esc(selected.objective)}</small></div>
        <h3>${esc(current.prompt)}</h3>
        <div class="tr-options">${options}</div>
        ${answer !== null ? `<div class="tr-feedback ${answer === current.correct ? 'is-ok' : 'is-bad'}"><strong>${answer === current.correct ? 'Decisión correcta' : 'Revisa el criterio'}</strong><p>${esc(current.explanation)}</p><button class="tr-btn tr-btn--primary" type="button" data-tr-next>${step + 1 < total ? 'Siguiente decisión' : 'Ver resultado'} ${icon('i-arrow-right')}</button></div>` : ''}
      </section>`);
  }

  function rebuildDeck() {
    deck = CONTENT.cards.filter(card => cardArea === 'Todas' || card.area === cardArea);
    cardIndex = 0;
    flipped = false;
  }

  // Ícono y color de cada tema. Las dos caras comparten una composición
  // editorial construida en CSS para verse nítida en cualquier resolución.
  const AREA_ART = {
    'Lean': { icon: 'lean', tone: '#16a34a' },
    'OEE': { icon: 'oee', tone: '#0891b2' },
    'Calidad': { icon: 'calidad', tone: '#2563eb' },
    'Mantenimiento': { icon: 'mantenimiento', tone: '#ea580c' },
    'Tiempos y movimientos': { icon: 'tiempos', tone: '#dc2626' },
    'Seguridad': { icon: 'seguridad', tone: '#ca8a04' },
    'Logística': { icon: 'logistica', tone: '#0d9488' }
  };
  const ART_BASE = 'assets/img/retos/';
  const artOf = area => AREA_ART[area] || { icon: 'reto-diario', tone: '#ff7a2d' };

  function renderCards() {
    view = 'cards';
    if (!deck.length) rebuildDeck();
    const card = deck[cardIndex] || CONTENT.cards[0];
    const areas = ['Todas', ...new Set(CONTENT.cards.map(item => item.area))];
    const level = item => state.cards[item.id]?.confidence || 0;
    const mastered = deck.filter(item => level(item) >= 3).length;
    const learning = deck.filter(item => level(item) > 0 && level(item) < 3).length;
    const fresh = deck.length - mastered - learning;
    const art = artOf(card.area);
    const pct = deck.length ? Math.round((mastered / deck.length) * 100) : 0;
    const countOf = area => (area === 'Todas' ? CONTENT.cards.length : CONTENT.cards.filter(item => item.area === area).length);
    shell(`${back('hub', 'Centro de entrenamiento')}
      <div class="tr-section-head tr-section-head--page"><div><span>Repaso rápido</span><h2>Flashcards técnicas</h2><p>Voltea la tarjeta, califica qué tan bien la dominas y gana XP.</p></div><small>${mastered}/${deck.length} dominadas</small></div>
      <div class="tr-fc-filters" role="toolbar" aria-label="Filtrar por tema">${areas.map(area => `<button type="button" class="${area === cardArea ? 'is-active' : ''}" data-tr-area="${esc(area)}">${area === 'Todas' ? `<b>${countOf(area)}</b>` : `<img src="${ART_BASE}iconos-imdac/${artOf(area).icon}.svg" alt="" width="24" height="24" loading="lazy">`}${esc(area)}${area === 'Todas' ? '' : `<small>${countOf(area)}</small>`}</button>`).join('')}</div>
      <section class="tr-fc-layout">
        <div class="tr-fc-stage">
          <article class="tr-flashcard ${flipped ? 'is-flipped' : ''}" style="--tone:${art.tone}">
            <div class="tr-fc-inner">
              <div class="tr-fc-face tr-fc-front" data-tr-flip role="button" tabindex="0" aria-label="Voltear tarjeta ${esc(card.front)}">
                <div class="tr-fc-top"><span class="tr-fc-cat">${esc(card.area)}</span></div>
                <div class="tr-fc-main"><h3>${esc(card.front)}</h3><p>¿Puedes explicarlo con tus palabras?</p></div>
                <span class="tr-fc-progress">${cardIndex + 1} / ${deck.length}</span>
              </div>
              <div class="tr-fc-face tr-fc-back">
                <div class="tr-fc-top"><span class="tr-fc-cat">${esc(card.area)}</span><span class="tr-fc-answer-label">Respuesta</span></div>
                <div class="tr-fc-answer-copy">
                  <h4>${esc(card.front)}</h4>
                  <span class="tr-fc-separator" aria-hidden="true"></span>
                  <p>${esc(card.back)}</p>
                </div>
                <span class="tr-fc-progress">${cardIndex + 1} / ${deck.length}</span>
              </div>
            </div>
          </article>
          <div class="tr-fc-rate tr-fc-rate--outside"><span>¿Qué tan bien la dominas?</span>
            <div class="tr-flash-actions"><button type="button" data-tr-rate="1"><b>Repasar</b><small>La veré otra vez</small></button><button type="button" data-tr-rate="2"><b>Entendida</b><small>+XP</small></button><button type="button" data-tr-rate="3"><b>Dominada</b><small>+XP · créditos</small></button></div>
          </div>
          <div class="tr-flash-nav">
            <button class="tr-btn" type="button" data-tr-card="-1" ${cardIndex === 0 ? 'disabled' : ''} aria-label="Tarjeta anterior">← Anterior</button>
            <div class="tr-fc-track" aria-hidden="true"><i style="width:${((cardIndex + 1) / deck.length) * 100}%"></i></div>
            <button class="tr-btn" type="button" data-tr-card="1" ${cardIndex >= deck.length - 1 ? 'disabled' : ''} aria-label="Tarjeta siguiente">Siguiente →</button>
          </div>
          <small class="tr-fc-keys">Atajos: espacio para voltear · ← → para avanzar</small>
        </div>
        <aside class="tr-fc-side">
          <div class="tr-fc-stat">
            <div class="tr-fc-ring" style="--p:${pct}"><strong>${pct}%</strong><span>dominado</span></div>
            <ul><li><i class="tr-fc-dot--3"></i>Dominadas<b>${mastered}</b></li><li><i class="tr-fc-dot--1"></i>Repasando<b>${learning}</b></li><li><i class="tr-fc-dot--0"></i>Nuevas<b>${fresh}</b></li></ul>
          </div>
          <div class="tr-fc-list"><span>Mazo ${cardArea === 'Todas' ? 'completo' : esc(cardArea)}</span>
            <ol>${deck.map((item, i) => `<li><button type="button" class="${i === cardIndex ? 'is-now' : ''}" data-tr-jump="${i}"><i class="tr-fc-dot--${level(item)}"></i>${esc(item.front)}</button></li>`).join('')}</ol>
          </div>
        </aside>
      </section>`);
  }

  function repaint() {
    if (!container || !container.isConnected || !container.querySelector('.tr-page')) return;
    if (view === 'cases') renderCases();
    else if (view === 'cards') renderCards();
    else if (view === 'case') renderCase();
    else renderHub();
  }

  function go(target) {
    if (embedded && onNavigate && view === 'hub' && (target === 'cases' || target === 'cards')) { onNavigate(target); return; }
    if (target === 'cases') renderCases();
    else if (target === 'cards') { rebuildDeck(); renderCards(); }
    else renderHub();
    container.querySelector('.tr-page')?.scrollIntoView({ block: 'start' });
  }

  function bind() {
    container.querySelectorAll('[data-tr-go]').forEach(el => {
      const run = () => go(el.dataset.trGo);
      el.addEventListener('click', run);
      el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(); } });
    });
    container.querySelectorAll('[data-tr-case]').forEach(el => el.addEventListener('click', event => {
      event.stopPropagation();
      selected = CONTENT.cases.find(item => item.id === el.dataset.trCase) || null;
      step = 0; answer = null; score = 0; finished = false;
      renderCase();
    }));
    container.querySelectorAll('[data-tr-answer]').forEach(el => el.addEventListener('click', () => {
      if (answer !== null || !selected) return;
      answer = Number(el.dataset.trAnswer);
      if (answer === selected.steps[step].correct) score += 1;
      renderCase();
    }));
    container.querySelector('[data-tr-next]')?.addEventListener('click', () => {
      if (!selected) return;
      if (step + 1 < selected.steps.length) { step += 1; answer = null; renderCase(); return; }
      finished = true;
      const previous = state.cases[selected.id];
      if (!previous || score > previous.score) state.cases[selected.id] = { score, completedAt: previous?.completedAt || new Date().toISOString() };
      registerDay();
      scheduleSync(0);
      if (!previous) earn({ source: 'training-case', id: selected.id, score, total: selected.steps.length });
      celebrate(score === selected.steps.length ? 'grande' : 'normal');
      renderCase();
    });
    container.querySelectorAll('[data-tr-area]').forEach(el => el.addEventListener('click', () => { cardArea = el.dataset.trArea; rebuildDeck(); renderCards(); }));
    const flip = () => { flipped = !flipped; container.querySelector('.tr-flashcard')?.classList.toggle('is-flipped', flipped); };
    container.querySelector('[data-tr-flip]')?.addEventListener('click', flip);
    container.querySelector('[data-tr-flip]')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); flip(); } });
    container.querySelectorAll('[data-tr-jump]').forEach(el => el.addEventListener('click', () => { cardIndex = Number(el.dataset.trJump) || 0; flipped = false; renderCards(); }));
    if (!container.__trKeys) {
      container.__trKeys = true;
      document.addEventListener('keydown', event => {
        if (view !== 'cards' || !container.isConnected || !container.querySelector('.tr-flashcard')) return;
        if (/input|textarea|select/i.test(event.target?.tagName || '')) return;
        if (event.key === ' ' && !event.target?.closest?.('button')) { event.preventDefault(); flipped = !flipped; container.querySelector('.tr-flashcard')?.classList.toggle('is-flipped', flipped); }
        else if (event.key === 'ArrowRight' && cardIndex < deck.length - 1) { cardIndex += 1; flipped = false; renderCards(); }
        else if (event.key === 'ArrowLeft' && cardIndex > 0) { cardIndex -= 1; flipped = false; renderCards(); }
      });
    }
    container.querySelectorAll('[data-tr-card]').forEach(el => el.addEventListener('click', () => {
      cardIndex = Math.max(0, Math.min(deck.length - 1, cardIndex + Number(el.dataset.trCard)));
      flipped = false;
      renderCards();
    }));
    container.querySelectorAll('[data-tr-rate]').forEach(el => el.addEventListener('click', () => {
      const card = deck[cardIndex];
      if (!card) return;
      const confidence = Number(el.dataset.trRate);
      const previous = state.cards[card.id];
      state.cards[card.id] = { confidence: Math.max(previous?.confidence || 0, confidence), lastReviewed: new Date().toISOString() };
      registerDay();
      scheduleSync();
      if (confidence === 3 && (previous?.confidence || 0) < 3) {
        earn({ source: 'training-card', id: card.id });
        celebrate('normal');
      }
      if (cardIndex < deck.length - 1) cardIndex += 1;
      flipped = false;
      renderCards();
    }));
  }

  function renderStart(start) {
    if (start === 'cases') renderCases();
    else if (start === 'cards') { rebuildDeck(); renderCards(); }
    else renderHub();
  }

  async function mount(target, opts) {
    container = target;
    embedded = !!opts?.embedded;
    onNavigate = typeof opts?.onNavigate === 'function' ? opts.onNavigate : null;
    const start = opts?.start || 'hub';
    view = 'hub';
    const known = loadedFor === (uid() || 'demo');
    if (known) renderStart(start);
    else container.innerHTML = '<div class="tr-page"><div class="tr-loading"><i></i>Cargando tu entrenamiento…</div></div>';
    // Siempre se consulta el servidor al entrar: trae lo hecho en otro dispositivo.
    await load(known);
    if (container !== target || !target.isConnected) return;
    if (!known) renderStart(start); else repaint();
  }

  function register() {
    if (!window.Sections?.renderers) return false;
    // Entrenamiento ahora vive dentro de Retos; la ruta anterior abre Retos en "Casos de planta".
    window.Sections.renderers.entrenamiento = target => { if (window.IMDIILRetos) window.IMDIILRetos.render(target, { tab: 'casos' }); else mount(target); };
    // Entrada directa por URL (#entrenamiento) antes de que este archivo cargara.
    if (location.hash === '#entrenamiento' && document.getElementById('dynamic-section') && !document.querySelector('#dynamic-section .tr-page')) {
      setTimeout(() => window.navigateToSection?.('entrenamiento', { reemplazar: true }), 0);
    }
    return true;
  }
  window.IMDIILTraining = { mount, state: () => ({ ...state, xp: xp(), streak: streakOf(state.days) }) };
  if (!register()) document.addEventListener('DOMContentLoaded', register, { once: true });
}());
