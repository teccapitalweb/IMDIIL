// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Admin · Retos (antes "Retos y recompensas" + "Entrenamiento")
// Una sola pestaña con: entrenamiento por miembro (GET /training/admin),
// mini juegos (GET /admin/retos/juegos), casos, flashcards y canjes.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const pages = window.Pages;
  if (!pages) return;
  const CONTENT = window.IMDIIL_TRAINING_CONTENT || { cases: [], cards: [] };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const root = () => document.getElementById('page');
  const isActive = () => ['recompensas', 'entrenamiento'].includes(root()?.dataset.live);
  const state = { loading: false, error: '', members: null, tab: 'miembros', query: '', games: null, gamesError: '', gamesLoading: false, canjes: null, canjesError: '' };
  const TABS = [['miembros', 'Entrenamiento'], ['juegos', 'Mini juegos'], ['casos', 'Casos'], ['flashcards', 'Flashcards'], ['canjes', 'Canjes']];

  async function adminToken() {
    let user = window._fb?.auth?.currentUser;
    if (!user) {
      await new Promise(resolve => {
        const done = () => { window.removeEventListener('adminready', done); resolve(); };
        window.addEventListener('adminready', done, { once: true });
        setTimeout(done, 8000);
      });
      user = window._fb?.auth?.currentUser;
    }
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  }

  async function load() {
    if (state.loading) return;
    state.loading = true; state.error = ''; render();
    try {
      const base = String(pages._webhookUrl || window.WEBHOOK_URL || '').replace(/\/$/, '');
      const response = await fetch(`${base}/training/admin`, { cache: 'no-store', headers: { Authorization: `Bearer ${await adminToken()}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo cargar el entrenamiento.');
      state.members = data.members || [];
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false; render();
    }
  }

  const base = () => String(pages._webhookUrl || window.WEBHOOK_URL || '').replace(/\/$/, '');
  const memberOf = uid => (window.AdminStore?.miembros || []).find(m => m.id === uid || m.uid === uid) || {};

  async function loadGames() {
    if (state.gamesLoading) return;
    state.gamesLoading = true; state.gamesError = ''; render();
    try {
      const response = await fetch(`${base()}/admin/retos/juegos`, { cache: 'no-store', headers: { Authorization: `Bearer ${await adminToken()}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudieron cargar los mini juegos.');
      state.games = data;
    } catch (error) {
      state.gamesError = error.message;
    } finally {
      state.gamesLoading = false; render();
    }
  }

  async function loadCanjes() {
    const fb = window._fb;
    if (!fb?.getDocs) { state.canjesError = 'Firestore no está listo.'; render(); return; }
    try {
      const out = [];
      for (const name of ['credit_redemptions', 'canjes_creditos']) {
        try {
          const snap = await fb.getDocs(fb.query(fb.collection(fb.db, name), fb.limit(150)));
          snap.docs.forEach(d => out.push({ id: d.id, ...d.data() }));
        } catch (e) { /* la colección puede no existir */ }
      }
      const ms = v => v?.toDate ? v.toDate().getTime() : (v?.seconds ? v.seconds * 1000 : (v ? new Date(v).getTime() : 0));
      state.canjes = out.sort((a, b) => ms(b.createdAt || b.fecha) - ms(a.createdAt || a.fecha));
      state.canjesError = '';
    } catch (error) {
      state.canjesError = error.message;
    }
    render();
  }

  const empty = (title, detail) => `<div class="iv2-empty"><svg class="ic"><use href="#i-news"/></svg><strong>${esc(title)}</strong><span>${esc(detail || '')}</span></div>`;

  function membersTable() {
    if (state.loading && !state.members) return empty('Cargando entrenamiento…', 'Consultando el avance de los miembros.');
    if (state.error) return empty('No se pudo cargar', state.error);
    const q = state.query.toLowerCase();
    const rows = (state.members || []).filter(m => !q || `${m.name} ${m.email}`.toLowerCase().includes(q));
    if (!rows.length) return empty('Sin actividad todavía', 'Cuando los miembros resuelvan casos o repasen tarjetas, aparecerán aquí.');
    return `<div class="ta-table"><div class="ta-row ta-row--head"><span>#</span><span>Miembro</span><span>XP</span><span>Racha</span><span>Casos</span><span>Tarjetas</span><span>Última actividad</span></div>${rows.map((m, i) => `<div class="ta-row"><span>${i + 1}</span><span><strong>${esc(m.name || 'Sin nombre')}</strong><small>${esc(m.email || m.uid)}</small></span><span><b>${fmt(m.xp)}</b></span><span>${m.streak} d</span><span>${m.casesCompleted}/${CONTENT.cases.length}</span><span>${m.cardsMastered} dominadas · ${m.cardsReviewed} vistas</span><span>${esc(m.lastActiveDay || '—')}</span></div>`).join('')}</div>`;
  }

  function contentTable() {
    const rows = state.tab === 'casos'
      ? CONTENT.cases.map(item => ({ title: item.title, area: item.area, type: `${item.steps.length} decisiones · ${item.difficulty}` }))
      : CONTENT.cards.map(item => ({ title: item.front, area: item.area, type: 'Flashcard' }));
    const done = state.members || [];
    return `<div class="ta-table"><div class="ta-row ta-row--head ta-row--content"><span>Contenido</span><span>Área</span><span>Tipo</span><span>${state.tab === 'casos' ? 'Resuelto por' : 'Estado'}</span></div>${rows.map((row, i) => {
      const solved = state.tab === 'casos' ? done.filter(m => m.cases && m.cases[CONTENT.cases[i].id]).length : null;
      return `<div class="ta-row ta-row--content"><span><strong>${esc(row.title)}</strong></span><span>${esc(row.area)}</span><span>${esc(row.type)}</span><span>${solved == null ? 'Publicado' : `${solved} miembro${solved === 1 ? '' : 's'}`}</span></div>`;
    }).join('')}</div>`;
  }

  function gamesView() {
    if (state.gamesLoading && !state.games) return empty('Cargando mini juegos…', 'Consultando partidas de los miembros.');
    if (state.gamesError) return empty('No se pudieron cargar', state.gamesError);
    const data = state.games || { totals: {}, games: [], players: [] };
    const t = data.totals || {};
    const top = Math.max(1, ...(data.games || []).map(g => g.wins || 0));
    const games = (data.games || []).map(g => `<article class="ta-game" style="--gc:${esc(g.color || '#F7941D')}"><div class="ta-game__head"><strong>${esc(g.title)}</strong><span>${fmt(g.today)} hoy</span></div><div class="ta-game__bar"><i style="width:${Math.round((g.wins || 0) / top * 100)}%"></i></div><div class="ta-game__meta"><span>${fmt(g.wins)} partidas ganadas</span><span>${fmt(g.players)} jugador${g.players === 1 ? '' : 'es'}</span></div></article>`).join('');
    const q = state.query.toLowerCase();
    const players = (data.players || []).map(pl => { const m = memberOf(pl.uid); return { ...pl, name: m.nombre || m.displayName || '', email: m.email || '' }; })
      .filter(pl => !q || `${pl.name} ${pl.email} ${pl.uid}`.toLowerCase().includes(q));
    const table = players.length
      ? `<div class="ta-table"><div class="ta-row ta-row--head ta-row--games"><span>#</span><span>Miembro</span><span>Ganadas</span><span>Racha</span><span>Hoy</span><span>Última partida</span></div>${players.map((pl, i) => `<div class="ta-row ta-row--games"><span>${i + 1}</span><span><strong>${esc(pl.name || 'Miembro')}</strong><small>${esc(pl.email || pl.uid)}</small></span><span><b>${fmt(pl.wins)}</b></span><span>${fmt(pl.streak)} d</span><span>${pl.today ? `${pl.today} juego${pl.today === 1 ? '' : 's'}` : '—'}</span><span>${esc(pl.lastDay || '—')}</span></div>`).join('')}</div>`
      : empty('Nadie ha jugado todavía', 'Cuando un miembro gane un mini juego aparecerá aquí.');
    return `<div class="ta-mini"><article><span>Jugadores</span><strong>${fmt(t.players)}</strong></article><article><span>Jugaron hoy</span><strong>${fmt(t.today)}</strong></article><article><span>Partidas ganadas</span><strong>${fmt(t.wins)}</strong></article><article><span>Créditos pagados</span><strong>${fmt(t.creditsPaid)}</strong></article></div><div class="ta-games">${games}</div>${table}`;
  }

  function canjesView() {
    if (state.canjesError) return empty('No se pudieron cargar', state.canjesError);
    if (!state.canjes) return empty('Cargando canjes…', 'Consultando Firestore.');
    const q = state.query.toLowerCase();
    const date = v => { const d = v?.toDate ? v.toDate() : (v?.seconds ? new Date(v.seconds * 1000) : (v ? new Date(v) : null)); return d && !isNaN(d) ? d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; };
    const rows = state.canjes.map(c => { const m = memberOf(c.uid); return { ...c, who: c.userEmail || c.email || m.email || c.uid || '—', name: c.userName || m.nombre || '' }; })
      .filter(c => !q || `${c.who} ${c.name} ${c.rewardTitle || c.titulo || ''}`.toLowerCase().includes(q));
    if (!rows.length) return empty('Sin canjes todavía', 'Cuando un miembro cambie créditos por un curso, material o recompensa aparecerá aquí. Los movimientos completos están en Historial de créditos.');
    return `<div class="ta-table"><div class="ta-row ta-row--head ta-row--canje"><span>Recompensa</span><span>Miembro</span><span>Créditos</span><span>Fecha</span></div>${rows.map(c => `<div class="ta-row ta-row--canje"><span><strong>${esc(c.rewardTitle || c.titulo || c.itemTitle || c.tipo || 'Canje')}</strong><small>${esc(c.rewardType || c.kind || c.categoria || '')}</small></span><span><strong>${esc(c.name || '—')}</strong><small>${esc(c.who)}</small></span><span><b>${fmt(Math.abs(Number(c.credits ?? c.creditos ?? c.amount ?? c.cost ?? 0)))}</b></span><span>${date(c.createdAt || c.fecha)}</span></div>`).join('')}</div>`;
  }

  function render() {
    if (!isActive()) return;
    const p = root();
    const members = state.members || [];
    const active7 = members.filter(m => m.lastActiveDay && (Date.now() - new Date(m.lastActiveDay + 'T12:00:00').getTime()) <= 7 * 86400000).length;
    const avgXp = members.length ? Math.round(members.reduce((s, m) => s + m.xp, 0) / members.length) : 0;
    p.innerHTML = `<div class="iv2-shell ta-page">
      <div class="sec-hero"><span class="sec-hero__eyebrow">PARTICIPACIÓN</span><h1 class="sec-hero__title">Retos</h1><p class="sec-hero__sub">Todo lo que los miembros hacen en Retos: entrenamiento, mini juegos, casos, flashcards y canjes de créditos.</p></div>
      <div class="ta-kpis"><article><span>Miembros entrenando</span><strong>${fmt(members.length)}</strong></article><article><span>Activos 7 días</span><strong>${fmt(active7)}</strong></article><article><span>XP promedio</span><strong>${fmt(avgXp)}</strong></article><article><span>Contenido</span><strong>${CONTENT.cases.length} casos · ${CONTENT.cards.length} tarjetas</strong></article></div>
      <section class="iv2-panel ta-panel"><div class="ta-tabs">${TABS.map(([id, label]) => `<button type="button" class="${state.tab === id ? 'is-active' : ''}" data-ta-tab="${id}">${label}</button>`).join('')}
        ${['miembros', 'juegos', 'canjes'].includes(state.tab) ? `<input type="search" placeholder="Buscar miembro…" value="${esc(state.query)}" data-ta-search><button class="btn btn--ghost" type="button" data-ta-refresh><svg class="ic"><use href="#i-refresh"/></svg>Actualizar</button>` : ''}</div>
        ${state.tab === 'miembros' ? membersTable() : state.tab === 'juegos' ? gamesView() : state.tab === 'canjes' ? canjesView() : contentTable()}
      </section>
    </div>`;
    p.querySelectorAll('[data-ta-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.taTab; state.query = ''; render(); ensureTab(); }));
    p.querySelector('[data-ta-refresh]')?.addEventListener('click', () => { if (state.tab === 'juegos') loadGames(); else if (state.tab === 'canjes') { state.canjes = null; render(); loadCanjes(); } else load(); });
    const search = p.querySelector('[data-ta-search]');
    search?.addEventListener('input', event => {
      state.query = event.target.value;
      const caret = event.target.selectionStart;
      render();
      const again = root().querySelector('[data-ta-search]');
      if (again) { again.focus(); again.setSelectionRange(caret, caret); }
    });
  }

  if (!document.getElementById('imdiil-training-admin-css')) {
    const style = document.createElement('style');
    style.id = 'imdiil-training-admin-css';
    style.textContent = `.ta-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}.ta-kpis article{padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}.ta-kpis span{display:block;font:800 9px 'JetBrains Mono',monospace;letter-spacing:1.1px;text-transform:uppercase;color:var(--text-3)}.ta-kpis strong{display:block;margin-top:6px;font:800 20px 'Plus Jakarta Sans',sans-serif;color:var(--text)}
.ta-tabs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px}.ta-tabs>button{padding:8px 14px;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--text-2);font:700 12px 'Inter',sans-serif;cursor:pointer}.ta-tabs>button.is-active{border-color:transparent;background:var(--primary);color:#fff}.ta-tabs input{flex:1;min-width:180px;margin-left:auto;padding:9px 12px;border:1px solid var(--border-2,var(--border));border-radius:10px;background:var(--surface-2);color:var(--text);font:500 13px 'Inter',sans-serif}
.ta-table{display:grid;gap:6px}.ta-row{display:grid;grid-template-columns:36px minmax(0,2fr) 80px 70px 80px minmax(0,1.4fr) 110px;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);font-size:12.5px;color:var(--text)}.ta-row--head{border:0;background:none;padding-top:0;padding-bottom:0;font:800 9px 'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:var(--text-3)}.ta-row strong{display:block;font-weight:700}.ta-row small{display:block;color:var(--text-3);font-size:11px;overflow:hidden;text-overflow:ellipsis}.ta-row b{color:var(--primary)}.ta-row--content{grid-template-columns:minmax(0,2.4fr) 140px 170px 120px}
@media(max-width:900px){.ta-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ta-row,.ta-row--content{grid-template-columns:1fr 1fr}.ta-row--head{display:none}}`;
    style.textContent += `
.ta-mini{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}.ta-mini article{padding:12px 14px;border-radius:14px;background:color-mix(in srgb,#1E3A8A 6%,var(--surface-2));border:1px solid var(--border)}.ta-mini span{display:block;font:800 9px 'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:var(--text-3)}.ta-mini strong{display:block;margin-top:4px;font:800 18px 'Plus Jakarta Sans',sans-serif;color:var(--text)}
.ta-games{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:0 0 16px}.ta-game{padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface);border-top:3px solid var(--gc)}.ta-game__head{display:flex;justify-content:space-between;align-items:center;gap:8px}.ta-game__head strong{font:800 13px 'Plus Jakarta Sans',sans-serif}.ta-game__head span{font:700 10px 'JetBrains Mono',monospace;color:var(--gc)}.ta-game__bar{height:6px;border-radius:99px;background:var(--surface-2);margin:10px 0 8px;overflow:hidden}.ta-game__bar i{display:block;height:100%;border-radius:99px;background:var(--gc)}.ta-game__meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--text-3)}
.ta-row--games{grid-template-columns:36px minmax(0,2fr) 80px 70px 90px 120px}.ta-row--canje{grid-template-columns:minmax(0,2fr) minmax(0,2fr) 90px 120px}
@media(max-width:900px){.ta-mini{grid-template-columns:repeat(2,minmax(0,1fr))}.ta-row--games,.ta-row--canje{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(style);
  }

  function ensureTab() {
    if (state.tab === 'juegos' && !state.games && !state.gamesLoading && !state.gamesError) loadGames();
    if (state.tab === 'canjes' && !state.canjes && !state.canjesError) loadCanjes();
  }

  pages.recompensas = pages.entrenamiento = function () {
    if (window.__retosTab) { state.tab = window.__retosTab; window.__retosTab = null; }
    render();
    if (!state.members) load();
    ensureTab();
  };
}());
