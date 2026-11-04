// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Admin · Entrenamiento
// Resumen de XP, racha, casos y tarjetas por miembro (GET /training/admin)
// y vista del contenido publicado (casos y flashcards).
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const pages = window.Pages;
  if (!pages) return;
  const CONTENT = window.IMDIIL_TRAINING_CONTENT || { cases: [], cards: [] };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const root = () => document.getElementById('page');
  const isActive = () => root()?.dataset.live === 'entrenamiento';
  const state = { loading: false, error: '', members: null, tab: 'miembros', query: '' };

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

  function render() {
    if (!isActive()) return;
    const p = root();
    const members = state.members || [];
    const active7 = members.filter(m => m.lastActiveDay && (Date.now() - new Date(m.lastActiveDay + 'T12:00:00').getTime()) <= 7 * 86400000).length;
    const avgXp = members.length ? Math.round(members.reduce((s, m) => s + m.xp, 0) / members.length) : 0;
    p.innerHTML = `<div class="iv2-shell ta-page">
      <div class="sec-hero"><span class="sec-hero__eyebrow">CONTENIDO DE APRENDIZAJE</span><h1 class="sec-hero__title">Entrenamiento</h1><p class="sec-hero__sub">Casos prácticos y flashcards de ingeniería industrial. Consulta el XP, la racha y el avance de cada miembro (se guarda en su cuenta y es el mismo en todos sus dispositivos).</p></div>
      <div class="ta-kpis"><article><span>Miembros entrenando</span><strong>${fmt(members.length)}</strong></article><article><span>Activos 7 días</span><strong>${fmt(active7)}</strong></article><article><span>XP promedio</span><strong>${fmt(avgXp)}</strong></article><article><span>Contenido</span><strong>${CONTENT.cases.length} casos · ${CONTENT.cards.length} tarjetas</strong></article></div>
      <section class="iv2-panel ta-panel"><div class="ta-tabs">${[['miembros', 'Miembros'], ['casos', 'Casos'], ['flashcards', 'Flashcards']].map(([id, label]) => `<button type="button" class="${state.tab === id ? 'is-active' : ''}" data-ta-tab="${id}">${label}</button>`).join('')}
        ${state.tab === 'miembros' ? `<input type="search" placeholder="Buscar miembro…" value="${esc(state.query)}" data-ta-search><button class="btn btn--ghost" type="button" data-ta-refresh><svg class="ic"><use href="#i-refresh"/></svg>Actualizar</button>` : ''}</div>
        ${state.tab === 'miembros' ? membersTable() : contentTable()}
      </section>
    </div>`;
    p.querySelectorAll('[data-ta-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.taTab; render(); }));
    p.querySelector('[data-ta-refresh]')?.addEventListener('click', load);
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
    document.head.appendChild(style);
  }

  pages.entrenamiento = function () { render(); if (!state.members) load(); };
}());
