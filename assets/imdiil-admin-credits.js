// ═══════════════════════════════════════════════════════════════════
// IMDIIL Admin · Historial de créditos (como SYNOVA)
// Todos los movimientos: ganados por clases/evaluaciones/retos, bienvenida,
// cortesía y canjes. Lee GET /credits/admin/history del webhook.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var pages = window.Pages;
  if (!pages) return;
  var SECTION = 'creditos-historial';
  var esc = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('es-MX'); };
  var TYPES = [
    ['', 'Todos'], ['earned', 'Ganados'], ['spent', 'Canjes'],
    ['class_complete', 'Clases'], ['quiz_pass', 'Evaluaciones'], ['reto_complete', 'Retos'],
    ['welcome_credits', 'Bienvenida'], ['admin_gift', 'Cortesía']
  ];
  var state = { rows: [], totals: null, type: '', q: '', loading: false, error: '' };

  // Pestaña en el menú, junto a "Retos y recompensas".
  function addNav() {
    if (document.querySelector('.nav-item[data-section="' + SECTION + '"]')) return;
    var anchor = document.querySelector('.nav-item[data-section="recompensas"]');
    if (!anchor) return;
    var link = document.createElement('a');
    link.className = 'nav-item';
    link.dataset.section = SECTION;
    link.innerHTML = '<svg class="ic"><use href="#i-dollar"/></svg>Historial de créditos';
    link.addEventListener('click', function () { window.navigateTo && window.navigateTo(SECTION); });
    anchor.insertAdjacentElement('afterend', link);
  }

  async function token() {
    var user = window._fb && window._fb.auth && window._fb.auth.currentUser;
    for (var i = 0; !user && i < 40; i += 1) { await new Promise(function (r) { setTimeout(r, 200); }); user = window._fb && window._fb.auth && window._fb.auth.currentUser; }
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  }

  async function load() {
    state.loading = true; state.error = ''; draw();
    try {
      var params = new URLSearchParams({ limit: '500' });
      if (state.type) params.set('type', state.type);
      if (state.q) params.set('q', state.q);
      var response = await fetch(String(pages._webhookUrl || window.WEBHOOK_URL || '').replace(/\/$/, '') + '/credits/admin/history?' + params, { cache: 'no-store', headers: { Authorization: 'Bearer ' + await token() } });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo cargar el historial.');
      state.rows = data.rows || []; state.totals = data.totals || null;
    } catch (error) { state.error = error.message; }
    state.loading = false; draw();
  }

  function csv() {
    var lines = [['Fecha', 'Correo', 'Nombre', 'Movimiento', 'Tipo', 'Créditos']].concat(state.rows.map(function (r) { return [r.createdAt || '', r.email || '', r.nombre || '', r.label || '', r.type || '', r.amount]; }));
    var text = lines.map(function (cols) { return cols.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    link.download = 'IMDIIL_historial_creditos.csv';
    document.body.appendChild(link); link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  }

  function draw() {
    var p = document.getElementById('page');
    if (!p || p.dataset.live !== SECTION) return;
    var t = state.totals || { earned: 0, spent: 0 };
    var rows = state.rows;
    var body = state.loading ? '<div class="iv2-empty"><strong>Cargando historial…</strong></div>'
      : state.error ? '<div class="iv2-empty"><strong>No se pudo cargar</strong><span>' + esc(state.error) + '</span></div>'
      : rows.length ? '<div class="ich-table"><div class="ich-row ich-row--head"><span>Fecha</span><span>Miembro</span><span>Movimiento</span><span>Créditos</span></div>' + rows.map(function (r) {
        return '<div class="ich-row"><span>' + (r.createdAt ? new Date(r.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—') + '</span><span><strong>' + esc(r.nombre || r.email || r.uid) + '</strong><small>' + esc(r.nombre ? r.email : '') + '</small></span><span>' + esc(r.label) + '</span><span class="' + (r.amount >= 0 ? 'is-plus' : 'is-minus') + '">' + (r.amount >= 0 ? '+' : '−') + fmt(Math.abs(r.amount)) + '</span></div>';
      }).join('') + '</div>'
      : '<div class="iv2-empty"><strong>Sin movimientos</strong><span>No hay movimientos con este filtro.</span></div>';
    p.innerHTML = '<div class="iv2-shell"><div class="sec-hero"><span class="sec-hero__eyebrow">CRÉDITOS</span><h1 class="sec-hero__title">Historial de créditos</h1><p class="sec-hero__sub">Cada crédito ganado, regalado o canjeado por los miembros, con su fecha.</p></div>'
      + '<div class="iv2-grid iv2-grid--4"><div class="iv2-stat"><small>Movimientos</small><strong>' + fmt(rows.length) + '</strong><span>con este filtro</span></div><div class="iv2-stat"><small>Otorgados</small><strong>+' + fmt(t.earned) + '</strong><span>créditos</span></div><div class="iv2-stat"><small>Canjeados</small><strong>−' + fmt(t.spent) + '</strong><span>créditos</span></div><div class="iv2-stat"><small>Neto</small><strong>' + fmt(t.earned - t.spent) + '</strong><span>créditos</span></div></div>'
      + '<section class="iv2-panel"><div class="ich-tools"><div class="ich-tabs">' + TYPES.map(function (x) { return '<button type="button" data-ich-type="' + x[0] + '" class="' + (state.type === x[0] ? 'is-active' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><input type="search" data-ich-q placeholder="Buscar correo, nombre o movimiento" value="' + esc(state.q) + '"><button type="button" class="btn btn--ghost" data-ich-csv>Exportar CSV</button><button type="button" class="btn btn--ghost" data-ich-refresh>Actualizar</button></div>' + body + '</section></div>';
    p.querySelectorAll('[data-ich-type]').forEach(function (b) { b.addEventListener('click', function () { state.type = b.dataset.ichType; load(); }); });
    var input = p.querySelector('[data-ich-q]'); var timer = null;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { state.q = input.value.trim(); load().then(function () { var i = document.querySelector('[data-ich-q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 450); });
    p.querySelector('[data-ich-csv]').addEventListener('click', csv);
    p.querySelector('[data-ich-refresh]').addEventListener('click', load);
  }

  pages[SECTION] = function (p) { p.dataset.live = SECTION; draw(); load(); };

  var style = document.createElement('style');
  style.textContent = '.ich-tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}.ich-tools input{flex:1;min-width:200px;padding:9px 12px;border:1px solid var(--border-2,var(--border));border-radius:10px;background:var(--surface-2);color:var(--text)}.ich-tabs{display:flex;flex-wrap:wrap;gap:4px}.ich-tabs button{padding:6px 11px;border:1px solid var(--border);border-radius:999px;background:transparent;color:var(--text-2);font-size:12px;cursor:pointer}.ich-tabs button.is-active{background:var(--primary,#FF7A2D);border-color:var(--primary,#FF7A2D);color:#fff}.ich-table{display:grid}.ich-row{display:grid;grid-template-columns:170px minmax(0,1.2fr) minmax(0,1.4fr) 100px;gap:12px;align-items:center;padding:10px 6px;border-bottom:1px solid var(--border);font-size:12.5px}.ich-row--head{font:700 10px "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.8px;color:var(--text-3)}.ich-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ich-row small{color:var(--text-3)}.ich-row .is-plus{color:#16a34a;font-weight:800;text-align:right}.ich-row .is-minus{color:var(--text-2);font-weight:800;text-align:right}.ich-row--head span:last-child{text-align:right}@media(max-width:720px){.ich-row{grid-template-columns:1fr auto}.ich-row>span:nth-child(1){grid-column:1/-1;font-size:11px;color:var(--text-3)}.ich-row--head{display:none}}';
  document.head.appendChild(style);

  addNav();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNav);
}());
