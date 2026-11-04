/* ═══════════════════ CRECIMIENTO · Correos de seguimiento y cupones ═══════════════════
   Misma lógica que IMFRA / SYNOVA: serie de 3 correos para cuentas registradas que aún
   no activan VIP (beneficios → $50 MXN → $100 MXN). Sin pruebas gratuitas.
   Fuentes: GET/PATCH/POST /admin/conversion-emails/* del webhook.
   ═══════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const Pages = window.Pages;
  if (!Pages) return;

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const base = () => Pages._webhookUrl || 'https://imdiil-webhook-production.up.railway.app';
  const toast = (kind, title, body) => window.Toast?.[kind]?.(title, body || '');
  const STEPS = {
    1: { name: 'Beneficios', when: '12 h después del registro', detail: 'Presenta cursos, herramientas premium, libros y certificados.' },
    2: { name: '$50 MXN de descuento', when: '24 h después del registro', detail: 'Código personal de un solo uso, válido 24 horas.' },
    3: { name: 'Último llamado · $100 MXN', when: '48 h después del registro', detail: 'Código personal de un solo uso, válido 24 horas.' }
  };
  const fmtDate = ms => (ms ? new Date(ms).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const money = cents => `$${(Number(cents || 0) / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  async function token() {
    for (let i = 0; i < 60 && !window._fb?.auth?.currentUser; i++) await new Promise(r => setTimeout(r, 250));
    const user = window._fb?.auth?.currentUser;
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  }
  async function api(path, options) {
    const opts = Object.assign({ cache: 'no-store' }, options || {});
    opts.headers = Object.assign({ Authorization: `Bearer ${await token()}` }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {});
    const response = await fetch(base() + path, opts);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  }

  const state = { data: null, coupons: null, selected: new Set(), filter: '', tab: 'serie' };
  const alive = () => document.getElementById('page')?.dataset.live === 'correos';

  function kpis(d) {
    const c = d.counts || {};
    const item = (label, value, hint) => `<div class="ce-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
    return `<div class="ce-kpis">${item('En la serie', c.receiving || 0, 'cuentas que recibirán el siguiente correo')}${item('Recibieron algún correo', c.sent || 0)}${item('Se hicieron VIP', c.converted || 0, 'después de recibir la serie')}${item('Enviados hoy', `${d.sentToday || 0} / ${d.dailyLimit || 60}`, 'límite diario')}${item('Dados de baja', c.unsubscribed || 0)}</div>`;
  }

  function statusCard(d) {
    const on = d.mode === 'active';
    const cfg = d.configured || {};
    const missing = [!cfg.resend && 'RESEND_API_KEY', !cfg.secret && 'CONVERSION_EMAIL_SECRET'].filter(Boolean);
    return `<section class="ce-card ce-status ${on ? 'is-on' : ''}"><div><span class="ce-kicker">Estado de la campaña</span><h3>${on ? 'Activa · se revisa cada 15 minutos' : 'Apagada · no se envía nada'}</h3><p>${on ? `Envío automático encendido${d.autoActivatedAtMs ? ' desde el despliegue' : ''}. Incluye cuentas registradas desde el ${esc(fmtDate(d.startedAtMs))}` : 'Al activarla solo entran las cuentas que se registren a partir de ese momento.'}</p>${missing.length ? `<p class="ce-warn">Falta configurar en Railway: ${missing.map(esc).join(', ')}</p>` : ''}</div><div class="ce-status__actions"><button class="btn ${on ? 'btn--ghost' : 'btn--accent'}" data-ce-mode="${on ? 'off' : 'active'}">${on ? 'Apagar campaña' : 'Activar campaña'}</button><button class="btn btn--ghost" data-ce-run ${on ? '' : 'disabled'}>Procesar ahora</button></div></section>`;
  }

  function stepsCard() {
    return `<section class="ce-card"><span class="ce-kicker">La serie</span><h3>Tres correos por cuenta</h3><ol class="ce-steps">${[1, 2, 3].map(n => `<li><b>${n}</b><div><strong>${esc(STEPS[n].name)}</strong><span>${esc(STEPS[n].when)} · ${esc(STEPS[n].detail)}</span></div><button class="btn btn--ghost" data-ce-test="${n}">Enviarme prueba</button></li>`).join('')}</ol><p class="ce-note">Los códigos de descuento se crean en Stripe al enviar el correo (un solo uso, primera compra). Al abrir el enlace, el descuento ya queda aplicado en el checkout.</p></section>`;
  }

  function table(rows, columns, emptyText) {
    if (!rows.length) return `<div class="ce-empty">${esc(emptyText)}</div>`;
    return `<div class="ce-table"><table><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const who = r => `<strong>${esc(r.name || 'Sin nombre')}</strong><small>${esc(r.email || '')}</small>`;

  function serieTab(d) {
    return `${statusCard(d)}${kpis(d)}<div class="ce-grid">${stepsCard()}<section class="ce-card"><span class="ce-kicker">Próximos envíos</span><h3>En cola</h3>${table(d.upcoming || [], [
      { label: 'Cuenta', render: who },
      { label: 'Correo', render: r => esc(STEPS[r.step]?.name || r.step) },
      { label: 'Cuándo', render: r => esc(fmtDate(r.dueMs)) }
    ], 'No hay envíos pendientes.')}</section></div><section class="ce-card"><span class="ce-kicker">Historial</span><h3>Últimos envíos</h3>${table(d.latest || [], [
      { label: 'Cuenta', render: who },
      { label: 'Último correo', render: r => esc(STEPS[r.step]?.name || r.step) + (r.completed ? ' · serie terminada' : '') },
      { label: 'Enviado', render: r => esc(fmtDate(r.sentMs)) }
    ], 'Aún no se ha enviado ningún correo.')}</section>`;
  }

  function manualTab(d) {
    const q = state.filter.toLowerCase();
    const rows = (d.prospects || []).filter(r => !q || `${r.name} ${r.email}`.toLowerCase().includes(q));
    return `<section class="ce-card"><span class="ce-kicker">Envío manual</span><h3>Elige cuentas sin membresía</h3><p class="ce-note">Máximo 50 por lote. Se omiten automáticamente las cuentas VIP y las que se dieron de baja.</p><div class="ce-toolbar"><input class="ce-input" type="search" placeholder="Buscar por nombre o correo" value="${esc(state.filter)}" data-ce-filter><select class="ce-input" data-ce-step>${[1, 2, 3].map(n => `<option value="${n}">${n}. ${esc(STEPS[n].name)}</option>`).join('')}</select><button class="btn btn--accent" data-ce-bulk ${state.selected.size ? '' : 'disabled'}>Enviar a ${state.selected.size} seleccionadas</button></div>${table(rows, [
      { label: '', render: r => r.unsubscribed ? '' : `<input type="checkbox" data-ce-pick="${esc(r.uid)}" ${state.selected.has(r.uid) ? 'checked' : ''}>` },
      { label: 'Cuenta', render: who },
      { label: 'Registro', render: r => esc(fmtDate(r.registeredMs)) },
      { label: 'Serie', render: r => r.unsubscribed ? '<span class="ce-tag is-off">Dada de baja</span>' : `<span class="ce-tag">${r.step ? `Recibió ${r.step} de 3` : 'Sin correos'}</span>` }
    ], 'No hay cuentas sin membresía que coincidan.')}</section>`;
  }

  function couponsTab() {
    const c = state.coupons;
    if (!c) return '<div class="ce-empty">Cargando canjes…</div>';
    const k = c.counts || {};
    return `<div class="ce-kpis"><div class="ce-kpi"><span>Canjes registrados</span><strong>${esc(k.recorded || 0)}</strong></div><div class="ce-kpi"><span>Personas</span><strong>${esc(k.people || 0)}</strong></div><div class="ce-kpi"><span>Hoy</span><strong>${esc(k.today || 0)}</strong></div><div class="ce-kpi"><span>Descuento otorgado</span><strong>${esc(money(k.discountCents))}</strong></div><div class="ce-kpi"><span>Ingreso con cupón</span><strong>${esc(money(k.revenueCents))}</strong></div></div><section class="ce-card"><span class="ce-kicker">Cupones</span><h3>Historial de canjes</h3>${table(c.history || [], [
      { label: 'Cuenta', render: r => `<strong>${esc(r.name || r.email || 'Sin nombre')}</strong><small>${esc(r.email || '')}</small>` },
      { label: 'Código', render: r => `<code>${esc(r.code || '—')}</code>` },
      { label: 'Plan', render: r => esc(r.plan || '—') },
      { label: 'Descuento', render: r => esc(money(r.amountDiscount)) },
      { label: 'Pagado', render: r => esc(money(r.amountTotal)) },
      { label: 'Fecha', render: r => esc(fmtDate(r.redeemedAtMs)) }
    ], 'Todavía no hay compras con cupón.')}</section>`;
  }

  function draw(p) {
    const d = state.data;
    const tabs = [['serie', 'Serie automática'], ['manual', 'Envío manual'], ['cupones', 'Cupones']];
    p.innerHTML = `<div class="sec-hero"><span class="sec-hero__eyebrow">Crecimiento</span><h1 class="sec-hero__title">Correos de seguimiento</h1><p class="sec-hero__sub">Serie de 3 correos para cuentas registradas que aún no activan IMDIIL VIP.</p></div><div class="ce-tabs">${tabs.map(([id, label]) => `<button class="ce-tab ${state.tab === id ? 'is-active' : ''}" data-ce-tab="${id}">${esc(label)}</button>`).join('')}<button class="btn btn--ghost ce-refresh" data-ce-refresh>Actualizar</button></div><div class="ce-body">${!d ? '<div class="ce-empty">Cargando campaña…</div>' : state.tab === 'manual' ? manualTab(d) : state.tab === 'cupones' ? couponsTab() : serieTab(d)}</div>`;
    bind(p);
  }

  async function load(p, silent) {
    try {
      state.data = await api('/admin/conversion-emails');
      if (alive()) draw(p);
    } catch (error) {
      if (!alive()) return;
      p.querySelector('.ce-body').innerHTML = `<div class="ce-empty">No se pudo cargar la campaña: ${esc(error.message)}</div>`;
      if (!silent) toast('error', 'Correos de seguimiento', error.message);
    }
  }
  async function loadCoupons(p) {
    try { state.coupons = await api('/admin/conversion-emails/coupons'); }
    catch (error) { state.coupons = { counts: {}, history: [] }; toast('error', 'Cupones', error.message); }
    if (alive() && state.tab === 'cupones') draw(p);
  }

  function busy(button, text) { const original = button.textContent; button.disabled = true; button.textContent = text; return () => { button.disabled = false; button.textContent = original; }; }

  function bind(p) {
    p.querySelectorAll('[data-ce-tab]').forEach(b => b.addEventListener('click', () => {
      state.tab = b.dataset.ceTab; draw(p);
      if (state.tab === 'cupones' && !state.coupons) loadCoupons(p);
    }));
    p.querySelector('[data-ce-refresh]')?.addEventListener('click', () => { state.coupons = null; load(p); if (state.tab === 'cupones') loadCoupons(p); });
    p.querySelector('[data-ce-mode]')?.addEventListener('click', async e => {
      const mode = e.currentTarget.dataset.ceMode;
      if (mode === 'active' && window.adminConfirm && !(await window.adminConfirm('¿Activar los correos de seguimiento?', 'Solo se incluyen las cuentas que se registren a partir de ahora. Puedes apagarla cuando quieras.'))) return;
      const done = busy(e.currentTarget, 'Guardando…');
      try { await api('/admin/conversion-emails/mode', { method: 'PATCH', body: JSON.stringify({ mode }) }); toast('success', mode === 'active' ? 'Campaña activada' : 'Campaña apagada'); await load(p, true); }
      catch (error) { done(); toast('error', 'No se pudo cambiar', error.message); }
    });
    p.querySelector('[data-ce-run]')?.addEventListener('click', async e => {
      const done = busy(e.currentTarget, 'Procesando…');
      try { const r = await api('/admin/conversion-emails/run', { method: 'POST' }); toast('success', 'Campaña procesada', r.skipped ? `Sin cambios (${r.skipped})` : `${r.sent || 0} enviados · ${r.failed || 0} con error`); await load(p, true); }
      catch (error) { done(); toast('error', 'No se pudo procesar', error.message); }
    });
    p.querySelectorAll('[data-ce-test]').forEach(b => b.addEventListener('click', async e => {
      const done = busy(e.currentTarget, 'Enviando…');
      try { const r = await api('/admin/conversion-emails/send', { method: 'POST', body: JSON.stringify({ step: Number(b.dataset.ceTest) }) }); toast('success', 'Prueba enviada', `A ${r.to}${r.code ? ` · código ${r.code}` : ''}`); }
      catch (error) { toast('error', 'No se pudo enviar', error.message); }
      done();
    }));
    p.querySelector('[data-ce-filter]')?.addEventListener('input', e => {
      state.filter = e.target.value; const pos = e.target.selectionStart; draw(p);
      const input = p.querySelector('[data-ce-filter]'); input.focus(); input.setSelectionRange(pos, pos);
    });
    p.querySelectorAll('[data-ce-pick]').forEach(c => c.addEventListener('change', () => {
      if (c.checked) { if (state.selected.size >= 50) { c.checked = false; toast('info', 'Máximo 50 por lote'); return; } state.selected.add(c.dataset.cePick); }
      else state.selected.delete(c.dataset.cePick);
      const b = p.querySelector('[data-ce-bulk]'); b.disabled = !state.selected.size; b.textContent = `Enviar a ${state.selected.size} seleccionadas`;
    }));
    p.querySelector('[data-ce-bulk]')?.addEventListener('click', async e => {
      const step = Number(p.querySelector('[data-ce-step]').value);
      if (window.adminConfirm && !(await window.adminConfirm(`¿Enviar el correo "${STEPS[step].name}"?`, `Se enviará a ${state.selected.size} cuentas. Los descuentos generan códigos personales en Stripe.`))) return;
      const done = busy(e.currentTarget, 'Enviando…');
      try {
        const r = await api('/admin/conversion-emails/send-bulk', { method: 'POST', body: JSON.stringify({ uids: [...state.selected], step }) });
        toast(r.failed ? 'info' : 'success', 'Lote enviado', `${r.sent} enviados · ${r.failed} omitidos`);
        state.selected.clear(); await load(p, true);
      } catch (error) { done(); toast('error', 'No se pudo enviar el lote', error.message); }
    });
  }

  Pages.correos = p => { state.selected.clear(); draw(p); load(p); };
}());
