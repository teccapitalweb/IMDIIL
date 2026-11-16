(function () {
  'use strict';

  var pages = window.Pages;
  if (!pages) return;

  var API_ROOT = '/admin/ia-event';
  var state = {
    mode: 'live', filter: '', search: '', orders: [], summary: null,
    nextCursor: '', loading: false, loadingMore: false, exporting: false,
    truncated: false, limitReached: false, dataLimits: null,
    exportTruncated: false, exportLimits: null,
    error: '', requestId: 0, searchTimer: null
  };
  var filters = [
    ['', 'Todos los estados'], ['paid', 'Pagadas'], ['pending_payment', 'Pendientes'],
    ['checkout_open', 'Checkout abierto'], ['creating_checkout', 'Preparando checkout'],
    ['canceled', 'Canceladas'], ['expired', 'Vencidas'],
    ['payment_failed', 'Pago fallido'], ['checkout_error', 'Error de checkout']
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character];
    });
  }
  function num(value) { var parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  function root() { return document.getElementById('page'); }
  function active() { return root()?.dataset.live === 'compras-ia'; }
  function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value.seconds) return new Date(num(value.seconds) * 1000);
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  function date(value, short) {
    var parsed = toDate(value);
    if (!parsed) return '—';
    return parsed.toLocaleString('es-MX', short
      ? { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Mexico_City' }
      : { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Mexico_City' });
  }
  function money(minor, currency) {
    try {
      return new Intl.NumberFormat('es-MX', {
        style:'currency', currency:String(currency || 'MXN').toUpperCase(), maximumFractionDigits:0
      }).format(num(minor) / 100);
    } catch (_) { return '$' + Math.round(num(minor) / 100).toLocaleString('es-MX') + ' MXN'; }
  }
  function integer(value) { return Math.max(0, Math.trunc(num(value))).toLocaleString('es-MX'); }
  function status(value) {
    var key = String(value || 'pending').toLowerCase();
    var labels = {
      paid:'Pagada', confirmed:'Confirmada', pending:'Pendiente', pending_payment:'Pendiente',
      open:'Checkout abierto', checkout_open:'Checkout abierto', creating:'Preparando',
      creating_checkout:'Preparando', canceled:'Cancelada', cancelled:'Cancelada', expired:'Vencida',
      payment_failed:'Pago fallido', checkout_error:'Error de checkout', failed:'Fallida'
    };
    var tone = ['paid', 'confirmed'].includes(key) ? 'success'
      : ['pending', 'pending_payment', 'open', 'checkout_open', 'creating', 'creating_checkout'].includes(key) ? 'warning'
      : ['canceled', 'cancelled', 'expired'].includes(key) ? 'neutral' : 'danger';
    return { key:key, label:labels[key] || key.replace(/_/g, ' '), tone:tone };
  }
  function normalizePass(value) {
    var pass = value || {}, attendee = pass.attendee || {};
    return {
      id:String(pass.id || pass.passId || ''), status:String(pass.status || 'pending'),
      attendeeComplete:pass.attendeeComplete === true,
      attendee:{ name:String(attendee.name || attendee.nombre || ''), email:String(attendee.email || attendee.correo || '') }
    };
  }
  function normalize(value) {
    var order = value || {}, buyer = order.buyer || {}, stripe = order.stripe || {};
    return {
      id:String(order.id || order.reservationId || ''), reservationId:String(order.reservationId || order.id || ''),
      state:String(order.state || order.status || 'pending'), quantity:num(order.quantity || order.seats),
      unitAmount:num(order.unitAmount || order.unitAmountMinor), totalAmount:num(order.totalAmount || order.totalAmountMinor),
      amountPaid:num(order.amountPaid || order.paidAmount), currency:String(order.currency || 'MXN'),
      buyer:{ name:String(buyer.name || buyer.nombre || ''), email:String(buyer.email || buyer.correo || ''), phone:String(buyer.phone || buyer.telefono || '') },
      buyerAttends:order.buyerAttends === true, attendeesComplete:order.attendeesComplete === true,
      createdAt:order.createdAt, updatedAt:order.updatedAt, paidAt:order.paidAt, holdExpiresAt:order.holdExpiresAt,
      stripe:{ sessionId:String(stripe.sessionId || ''), paymentIntentId:String(stripe.paymentIntentId || '') },
      passes:Array.isArray(order.passes) ? order.passes.map(normalizePass) : []
    };
  }
  function summary() {
    var source = state.summary || {};
    var paid = state.orders.filter(function (order) { return status(order.state).tone === 'success'; });
    var pending = state.orders.filter(function (order) { return status(order.state).tone === 'warning'; });
    return {
      orders:source.orders == null ? state.orders.length : num(source.orders),
      paidOrders:source.paidOrders == null ? paid.length : num(source.paidOrders),
      pendingOrders:source.pendingOrders == null ? pending.length : num(source.pendingOrders),
      paidSeats:source.paidSeats == null ? paid.reduce(function (total, order) { return total + order.quantity; }, 0) : num(source.paidSeats),
      paidAmount:source.paidAmount == null ? paid.reduce(function (total, order) { return total + (order.amountPaid || order.totalAmount); }, 0) : num(source.paidAmount),
      currency:source.currency || state.orders[0]?.currency || 'MXN'
    };
  }

  async function authToken() {
    if (typeof pages._getAuthToken === 'function') return pages._getAuthToken();
    var user = window._fb?.auth?.currentUser;
    if (!user) throw new Error('No fue posible restaurar la sesión de administración.');
    return user.getIdToken();
  }
  async function request(path) {
    var token = await authToken();
    var response = await fetch(pages._webhookUrl + path, {
      cache:'no-store', headers:{ Accept:'application/json', Authorization:'Bearer ' + token }
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || data.message || 'No se pudo consultar la información de compras.');
    return data;
  }
  function query(cursor) {
    var params = new URLSearchParams({ mode:state.mode, limit:'50' });
    if (state.filter) params.set('state', state.filter);
    if (state.search.trim()) params.set('search', state.search.trim());
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }
  async function load(append) {
    var requestId = ++state.requestId;
    if (append) state.loadingMore = true;
    else { state.loading = true; state.error = ''; state.nextCursor = ''; }
    render();
    try {
      var data = await request(API_ROOT + '/orders?' + query(append ? state.nextCursor : ''));
      if (requestId !== state.requestId) return;
      var rows = (data.orders || []).map(normalize);
      if (append) {
        var known = new Set(state.orders.map(function (order) { return order.id; }));
        state.orders = state.orders.concat(rows.filter(function (order) { return !known.has(order.id); }));
      } else state.orders = rows;
      state.summary = data.summary || null;
      state.truncated = data.truncated === true;
      state.limitReached = data.limitReached === true;
      state.dataLimits = data.dataLimits || null;
      state.nextCursor = String(data.nextCursor || '');
    } catch (error) {
      if (requestId !== state.requestId) return;
      state.error = error.message;
      if (!append) {
        state.orders = [];
        state.summary = null;
        state.truncated = false;
        state.limitReached = false;
        state.dataLimits = null;
      }
    } finally {
      if (requestId === state.requestId) {
        state.loading = false; state.loadingMore = false; render();
      }
    }
  }

  function badge(value) {
    var meta = status(value);
    return '<span class="iaa-status iaa-status--' + meta.tone + '"><i></i>' + esc(meta.label) + '</span>';
  }
  function row(order) {
    var stripeReady = Boolean(order.stripe.sessionId || order.stripe.paymentIntentId);
    return '<tr><td><div class="iaa-buyer"><strong>' + esc(order.buyer.name || 'Sin nombre') + '</strong><span>' + esc(order.buyer.email || 'Sin correo') + '</span></div></td>' +
      '<td>' + badge(order.state) + '</td><td><strong class="iaa-number">' + esc(integer(order.quantity)) + '</strong><span class="iaa-cell-note">lugar' + (order.quantity === 1 ? '' : 'es') + '</span></td>' +
      '<td><strong class="iaa-money">' + esc(money(order.amountPaid || order.totalAmount, order.currency)) + '</strong><span class="iaa-cell-note">' + (status(order.state).tone === 'success' ? 'confirmado' : 'importe') + '</span></td>' +
      '<td><span class="iaa-date">' + esc(date(order.paidAt || order.createdAt)) + '</span><span class="iaa-cell-note">hora CDMX · ' + esc(order.reservationId || order.id || 'Sin referencia') + '</span></td>' +
      '<td><span class="iaa-stripe-state ' + (stripeReady ? 'is-ready' : '') + '"><i></i>' + (stripeReady ? 'Vinculada' : 'Sin sesión') + '</span></td>' +
      '<td><button class="iaa-view" type="button" data-ia-order="' + esc(order.id) + '"><svg class="ic"><use href="#i-eye"/></svg>Ver</button></td></tr>';
  }
  function card(order) {
    return '<article class="iaa-order-card"><div class="iaa-order-card__head"><div class="iaa-buyer"><strong>' + esc(order.buyer.name || 'Sin nombre') + '</strong><span>' + esc(order.buyer.email || 'Sin correo') + '</span></div>' + badge(order.state) + '</div>' +
      '<div class="iaa-order-card__grid"><div><small>Total</small><strong>' + esc(money(order.amountPaid || order.totalAmount, order.currency)) + '</strong></div><div><small>Lugares</small><strong>' + esc(integer(order.quantity)) + '</strong></div><div><small>Inscripción · hora CDMX</small><strong>' + esc(date(order.paidAt || order.createdAt, true)) + '</strong></div></div>' +
      '<div class="iaa-order-card__foot"><span>' + esc(order.reservationId || order.id || 'Sin referencia') + '</span><button class="iaa-view" type="button" data-ia-order="' + esc(order.id) + '"><svg class="ic"><use href="#i-eye"/></svg>Ver detalle</button></div></article>';
  }

  function results() {
    if (state.loading && !state.orders.length) return '<div class="iaa-loading" role="status"><span></span><strong>Consultando compras…</strong><small>Verificando datos protegidos del evento.</small></div>';
    if (state.error && !state.orders.length) return '<div class="iaa-empty iaa-empty--error"><svg class="ic"><use href="#i-mail"/></svg><strong>No se pudieron cargar las compras</strong><span>' + esc(state.error) + '</span><button class="btn btn--primary" type="button" data-ia-retry>Intentar de nuevo</button></div>';
    if (!state.orders.length) return '<div class="iaa-empty"><svg class="ic"><use href="#i-credit-card"/></svg><strong>No hay compras con estos filtros</strong><span>Prueba otro estado, modo o término de búsqueda.</span></div>';
    return '<div class="iaa-table-wrap"><table class="iaa-table"><thead><tr><th>Comprador</th><th>Estado</th><th>Lugares</th><th>Total</th><th>Inscripción (hora CDMX) / Reserva</th><th>Stripe</th><th></th></tr></thead><tbody>' + state.orders.map(row).join('') + '</tbody></table></div>' +
      '<div class="iaa-mobile-list">' + state.orders.map(card).join('') + '</div>' +
      (state.error ? '<p class="iaa-inline-error">' + esc(state.error) + '</p>' : '') +
      (state.nextCursor ? '<div class="iaa-load-more"><button class="btn btn--ghost" type="button" data-ia-more' + (state.loadingMore ? ' disabled' : '') + '>' + (state.loadingMore ? 'Cargando…' : 'Cargar más compras') + '</button></div>' : '');
  }
  function limitDescription(limits) {
    var values = [];
    if (num(limits?.reservations)) values.push(integer(limits.reservations) + ' compras');
    if (num(limits?.passes)) values.push(integer(limits.passes) + ' pases');
    return values.length ? ' Límite de lectura: ' + values.join(' y ') + '.' : '';
  }
  function truncationWarning() {
    if (!state.truncated && !state.exportTruncated) return '';
    var listText = state.truncated ? 'El listado y sus indicadores pueden ser parciales.' : '';
    var exportText = state.exportTruncated ? ' La última exportación CSV también alcanzó el límite seguro.' : '';
    var limits = state.exportTruncated ? state.exportLimits : state.dataLimits;
    return '<div class="iaa-data-warning" role="status"><svg class="ic"><use href="#i-shield-check"/></svg><div><strong>Resultados parciales</strong><span>' + esc(listText + exportText + limitDescription(limits)) + ' Ajusta los filtros para consultar un segmento más específico.</span></div></div>';
  }
  function render() {
    if (!active()) return;
    var page = root(), totals = summary();
    var options = filters.map(function (option) {
      return '<option value="' + esc(option[0]) + '"' + (state.filter === option[0] ? ' selected' : '') + '>' + esc(option[1]) + '</option>';
    }).join('');
    page.innerHTML = '<div class="iv2-shell iaa-shell"><div class="sec-hero iaa-hero"><span class="sec-hero__eyebrow">VENTAS · IA PARA EMPRESARIOS</span><div class="iaa-hero__row"><div><h1 class="sec-hero__title">Compras del evento</h1><p class="sec-hero__sub">Consulta pagos, compradores y pases desde el panel administrativo de IMDIIL. Los datos de prueba y producción permanecen separados.</p></div><span class="iaa-live-pill iaa-live-pill--' + state.mode + '"><i></i>' + (state.mode === 'live' ? 'Producción' : 'Pruebas') + '</span></div></div>' +
      '<div class="iaa-mode-note iaa-mode-note--' + state.mode + '"><svg class="ic"><use href="#' + (state.mode === 'live' ? 'i-shield-check' : 'i-tools') + '"/></svg><div><strong>' + (state.mode === 'live' ? 'Datos reales de producción' : 'Operaciones de prueba') + '</strong><span>' + (state.mode === 'live' ? 'Los importes corresponden a cobros reales confirmados por el servidor.' : 'Estas operaciones no se suman a los ingresos ni lugares vendidos en producción.') + '</span></div></div>' +
      truncationWarning() +
      '<div class="iv2-grid iv2-grid--4 iaa-kpis"><article class="iv2-stat iaa-kpi iaa-kpi--revenue"><small>Ingreso confirmado</small><strong>' + esc(money(totals.paidAmount, totals.currency)) + '</strong><span>Solo pagos verificados</span></article><article class="iv2-stat iaa-kpi"><small>Compras pagadas</small><strong>' + esc(integer(totals.paidOrders)) + '</strong><span>De ' + esc(integer(totals.orders)) + ' operaciones</span></article><article class="iv2-stat iaa-kpi"><small>Lugares vendidos</small><strong>' + esc(integer(totals.paidSeats)) + '</strong><span>Pases con pago confirmado</span></article><article class="iv2-stat iaa-kpi iaa-kpi--pending"><small>En proceso</small><strong>' + esc(integer(totals.pendingOrders)) + '</strong><span>Pendientes o con checkout abierto</span></article></div>' +
      '<section class="iv2-panel iaa-panel"><div class="iv2-panel__head iaa-panel__head"><div><h2>Registro de compras</h2><p>Compradores, pases y referencias verificables de Stripe.</p></div><button class="btn btn--primary" type="button" data-ia-export' + (state.exporting ? ' disabled' : '') + '><svg class="ic"><use href="#i-download"/></svg>' + (state.exporting ? 'Preparando…' : 'Exportar CSV') + '</button></div>' +
      '<div class="iv2-panel__body iaa-toolbar-wrap"><div class="iv2-toolbar iaa-toolbar"><label class="iv2-search iaa-search"><svg class="ic"><use href="#i-search"/></svg><input type="search" inputmode="search" autocomplete="off" placeholder="Buscar nombre, correo, teléfono o reserva" value="' + esc(state.search) + '" data-ia-search aria-label="Buscar compras"></label><label class="iaa-select"><span>Modo</span><select data-ia-mode aria-label="Modo de Stripe"><option value="live"' + (state.mode === 'live' ? ' selected' : '') + '>Producción</option><option value="test"' + (state.mode === 'test' ? ' selected' : '') + '>Pruebas</option></select></label><label class="iaa-select"><span>Estado</span><select data-ia-state aria-label="Filtrar por estado">' + options + '</select></label><button class="btn btn--ghost iaa-icon-button" type="button" data-ia-refresh><svg class="ic"><use href="#i-refresh"/></svg><span>Actualizar</span></button></div></div>' +
      '<div class="iaa-results" aria-live="polite">' + results() + '</div></section></div>';
    bind();
  }
  function bind() {
    var page = root();
    page.querySelector('[data-ia-mode]')?.addEventListener('change', function (event) { state.mode = event.target.value === 'test' ? 'test' : 'live'; resetAndLoad(); });
    page.querySelector('[data-ia-state]')?.addEventListener('change', function (event) { state.filter = event.target.value; resetAndLoad(); });
    page.querySelector('[data-ia-search]')?.addEventListener('input', function (event) {
      state.search = event.target.value; clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(resetAndLoad, 380);
    });
    page.querySelector('[data-ia-refresh]')?.addEventListener('click', function () { load(false); });
    page.querySelector('[data-ia-retry]')?.addEventListener('click', function () { load(false); });
    page.querySelector('[data-ia-more]')?.addEventListener('click', function () { load(true); });
    page.querySelector('[data-ia-export]')?.addEventListener('click', exportCsv);
    page.querySelectorAll('[data-ia-order]').forEach(function (button) { button.addEventListener('click', function () { openDetail(button.dataset.iaOrder); }); });
  }
  function resetAndLoad() {
    state.orders = []; state.summary = null; state.nextCursor = '';
    state.truncated = false; state.limitReached = false; state.dataLimits = null;
    state.exportTruncated = false; state.exportLimits = null;
    load(false);
  }

  async function exportCsv() {
    if (state.exporting) return;
    state.exporting = true; render();
    try {
      var params = new URLSearchParams({ mode:state.mode });
      if (state.filter) params.set('state', state.filter);
      if (state.search.trim()) params.set('search', state.search.trim());
      var token = await authToken();
      var response = await fetch(pages._webhookUrl + API_ROOT + '/orders.csv?' + params.toString(), { cache:'no-store', headers:{ Accept:'text/csv', Authorization:'Bearer ' + token } });
      if (!response.ok) { var data = await response.json().catch(function () { return {}; }); throw new Error(data.error || 'No se pudo preparar el CSV.'); }
      state.exportTruncated = String(response.headers.get('X-Data-Truncated') || '').toLowerCase() === 'true';
      state.exportLimits = {
        reservations:num(response.headers.get('X-Data-Limit')),
        passes:num(response.headers.get('X-Pass-Data-Limit'))
      };
      var blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'compras-ia-' + state.mode + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (state.exportTruncated) {
        window.Toast?.info('Exportación parcial', 'El CSV alcanzó el límite seguro de datos. Ajusta los filtros para exportar otro segmento.');
      } else window.Toast?.success('Exportación lista', 'El CSV conserva los filtros visibles.');
    } catch (error) { window.Toast?.error('No se pudo exportar', error.message); }
    finally { state.exporting = false; render(); }
  }

  async function openDetail(id) {
    if (!id) return;
    var preview = state.orders.find(function (order) { return order.id === id; }) || normalize({ id:id });
    detail(preview, true, '');
    try {
      var data = await request(API_ROOT + '/orders/' + encodeURIComponent(id) + '?mode=' + encodeURIComponent(state.mode));
      detail(normalize(data.order || data), false, '');
    } catch (error) { detail(preview, false, error.message); }
  }
  function field(label, value) { return '<div class="iaa-detail-field"><small>' + esc(label) + '</small><strong>' + esc(value || '—') + '</strong></div>'; }
  function reference(label, value, index) {
    if (!value) return '<div class="iaa-reference is-empty"><div><small>' + esc(label) + '</small><code>No disponible</code></div></div>';
    return '<div class="iaa-reference"><div><small>' + esc(label) + '</small><code>' + esc(value) + '</code></div><button type="button" data-ia-copy="' + index + '"><svg class="ic"><use href="#i-check"/></svg>Copiar</button></div>';
  }
  function pass(value, index) {
    var item = normalizePass(value), ready = item.attendeeComplete || Boolean(item.attendee.name);
    return '<article class="iaa-pass"><div class="iaa-pass__number">' + String(index + 1).padStart(2, '0') + '</div><div class="iaa-pass__body"><strong>' + esc(item.attendee.name || 'Asistente pendiente') + '</strong><span>' + esc(item.attendee.email || 'Correo pendiente') + '</span>' + (item.id ? '<code>' + esc(item.id) + '</code>' : '') + '</div><span class="iaa-pass__state ' + (ready ? 'is-ready' : '') + '">' + (ready ? 'Completo' : 'Pendiente') + '</span></article>';
  }

  function detail(order, loading, errorMessage) {
    var body = document.createElement('div'), footer = document.createElement('div');
    body.className = 'iaa-detail';
    footer.innerHTML = '<button class="btn btn--primary" type="button" data-ia-detail-close>Cerrar</button>';
    if (loading) {
      body.innerHTML = '<div class="iaa-loading"><span></span><strong>Cargando detalle…</strong><small>Consultando la operación protegida.</small></div>';
    } else {
      var refs = [
        { label:'Stripe Checkout Session', value:order.stripe.sessionId },
        { label:'Stripe Payment Intent', value:order.stripe.paymentIntentId }
      ];
      body.innerHTML = (errorMessage ? '<div class="iaa-detail-warning"><svg class="ic"><use href="#i-mail"/></svg><span>No se pudo actualizar el detalle: ' + esc(errorMessage) + '. Se muestra la información disponible.</span></div>' : '') +
        '<div class="iaa-detail-summary"><div><span>Estado</span>' + badge(order.state) + '</div><div><span>Total</span><strong>' + esc(money(order.amountPaid || order.totalAmount, order.currency)) + '</strong></div><div><span>Lugares</span><strong>' + esc(integer(order.quantity)) + '</strong></div></div>' +
        '<section class="iaa-detail-section"><div class="iaa-detail-section__head"><h3>Comprador</h3><span>' + (order.buyerAttends ? 'También asiste' : 'Compra para asistentes') + '</span></div><div class="iaa-detail-grid">' + field('Nombre', order.buyer.name) + field('Correo', order.buyer.email) + field('Teléfono', order.buyer.phone) + field('Datos de asistentes', order.attendeesComplete ? 'Completos' : 'Pendientes') + '</div></section>' +
        '<section class="iaa-detail-section"><div class="iaa-detail-section__head"><h3>Operación</h3><span>' + esc(status(order.state).label) + '</span></div><div class="iaa-detail-grid">' + field('Reserva', order.reservationId || order.id) + field('Creada · hora CDMX', date(order.createdAt)) + field('Pago confirmado · hora CDMX', date(order.paidAt)) + field('Vigencia de reserva · hora CDMX', date(order.holdExpiresAt)) + field('Precio unitario', money(order.unitAmount, order.currency)) + field('Importe pagado', money(order.amountPaid, order.currency)) + '</div></section>' +
        '<section class="iaa-detail-section"><div class="iaa-detail-section__head"><h3>Referencias Stripe</h3><span>Copiables para conciliación</span></div><div class="iaa-references">' + refs.map(function (item, index) { return reference(item.label, item.value, index); }).join('') + '</div></section>' +
        '<section class="iaa-detail-section"><div class="iaa-detail-section__head"><h3>Pases y asistentes</h3><span>' + esc(integer(order.passes.length || order.quantity)) + ' lugar' + ((order.passes.length || order.quantity) === 1 ? '' : 'es') + '</span></div><div class="iaa-passes">' + (order.passes.length ? order.passes.map(pass).join('') : '<div class="iaa-passes-empty">Los pases aparecerán aquí cuando estén disponibles en el servidor.</div>') + '</div></section>';
      body.querySelectorAll('[data-ia-copy]').forEach(function (button) {
        button.addEventListener('click', function () { var item = refs[num(button.dataset.iaCopy)]; if (item?.value) copy(item.value, button); });
      });
    }
    footer.querySelector('[data-ia-detail-close]').addEventListener('click', function () { window.Modal?.close(); });
    window.Modal?.open({
      title:'Detalle de compra',
      subtitle:(order.reservationId || order.id || 'Operación del evento') + ' · ' + (state.mode === 'live' ? 'Producción' : 'Pruebas'),
      icon:'i-credit-card', body:body, footer:footer
    });
  }
  async function copy(value, button) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        var input = document.createElement('textarea');
        input.value = value; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
      }
      var previous = button.textContent; button.textContent = 'Copiado'; setTimeout(function () { button.textContent = previous; }, 1400);
    } catch (_) { window.Toast?.error('No se pudo copiar', 'Selecciona la referencia y cópiala manualmente.'); }
  }

  pages['compras-ia'] = function () { render(); load(false); };
}());
