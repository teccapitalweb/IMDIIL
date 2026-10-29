(function () {
  'use strict';

  var pages = window.Pages;
  if (!pages) return;

  var esc = window.escHtml || function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char];
    });
  };
  var page = function () { return document.getElementById('page'); };
  var controlSections = ['estado-pagos', 'auditoria', 'creditos-masivos'];
  var paymentState = { data:null, filter:'all', search:'', loading:false, error:'' };
  var auditSequence = 0;
  var bulkState = emptyBulkState();

  function emptyBulkState() {
    return { candidates:[], selected:new Set(), loaded:false, operationId:'', operationSignature:'', history:[] };
  }

  function injectStyles() {
    if (document.getElementById('imdiil-account-control-css')) return;
    var style = document.createElement('style');
    style.id = 'imdiil-account-control-css';
    style.textContent = `
      .ac-shell{max-width:1240px;margin:0 auto}.ac-head{margin-bottom:18px}.ac-head .sec-hero{margin-bottom:14px}
      .ac-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:7px;border:1px solid var(--border);border-radius:17px;background:color-mix(in srgb,var(--surface-2) 88%,transparent);box-shadow:var(--shadow-sm)}
      .ac-tab{display:flex;align-items:center;gap:11px;min-width:0;padding:12px 13px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--text-2);text-align:left;cursor:pointer;transition:.18s ease}.ac-tab:hover{border-color:var(--border-2);background:var(--surface)}.ac-tab[aria-current="page"]{border-color:color-mix(in srgb,var(--primary) 38%,var(--border));background:var(--surface);box-shadow:0 7px 18px color-mix(in srgb,var(--primary) 10%,transparent);color:var(--text)}
      .ac-tab__icon{display:grid;place-items:center;width:35px;height:35px;flex:0 0 auto;border-radius:10px;background:color-mix(in srgb,var(--primary) 12%,var(--surface-2));color:var(--primary)}.ac-tab__icon .ic{width:16px;height:16px}.ac-tab b{display:block;font-size:11.5px}.ac-tab small{display:block;margin-top:3px;font-size:9.5px;line-height:1.35;color:var(--text-3)}
      .ac-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm)}.ac-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 18px;border-bottom:1px solid var(--border)}.ac-card__head h2{margin:0;font-size:15px;color:var(--text)}.ac-card__head p{margin:4px 0 0;font-size:10.5px;line-height:1.5;color:var(--text-3)}
      .ac-actions{display:flex;justify-content:flex-end;align-items:center;gap:9px;flex-wrap:wrap;margin:12px 0}.ac-updated{font-size:10px;color:var(--text-3)}
      .ac-alert{display:flex;align-items:flex-start;gap:10px;padding:13px 15px;margin:12px 0;border:1px solid #F59E0B55;border-radius:13px;background:color-mix(in srgb,#F59E0B 8%,var(--surface));color:#9A5A00}.ac-alert[data-tone="ok"]{border-color:#10B98144;background:color-mix(in srgb,#10B981 7%,var(--surface));color:#047857}.ac-alert[data-tone="danger"]{border-color:#EF444455;background:color-mix(in srgb,#EF4444 7%,var(--surface));color:#B91C1C}.ac-alert__dot{width:9px;height:9px;flex:0 0 auto;margin-top:4px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 12%,transparent)}.ac-alert b{display:block;font-size:11.5px}.ac-alert span{display:block;margin-top:3px;font-size:10.5px;line-height:1.45;color:var(--text-3)}
      .ac-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:14px 0 18px}.ac-kpi{--tone:var(--primary);appearance:none;text-align:left;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:15px;color:inherit}.ac-kpi[data-clickable="1"]{cursor:pointer;transition:.18s}.ac-kpi[data-clickable="1"]:hover,.ac-kpi[data-active="1"]{border-color:var(--tone);box-shadow:0 8px 24px color-mix(in srgb,var(--tone) 12%,transparent);transform:translateY(-1px)}.ac-kpi[data-tone="danger"]{--tone:#DC2626}.ac-kpi[data-tone="warn"]{--tone:#D97706}.ac-kpi[data-tone="info"]{--tone:#2563EB}.ac-kpi[data-tone="ok"]{--tone:#059669}.ac-kpi[data-tone="muted"]{--tone:#64748B}.ac-kpi__n{font:800 24px/1 'Plus Jakarta Sans',sans-serif;color:var(--text)}.ac-kpi__label{margin-top:7px;font-size:11px;font-weight:800;color:var(--text-2)}.ac-kpi__sub{margin-top:4px;font-size:10px;line-height:1.4;color:var(--text-3)}
      .ac-toolbar{display:grid;grid-template-columns:minmax(230px,1fr) auto;gap:10px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:15px 15px 0 0}.ac-filters{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.ac-filter{border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);padding:8px 10px;border-radius:999px;font-size:10px;font-weight:750;cursor:pointer}.ac-filter[data-active="1"]{background:var(--primary);border-color:var(--primary);color:#fff}
      .ac-table-wrap{overflow:auto;max-height:620px;background:var(--surface);border:1px solid var(--border);border-top:0;border-radius:0 0 15px 15px}.ac-table{width:100%;border-collapse:collapse;min-width:840px}.ac-table th,.ac-table td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--border);vertical-align:middle}.ac-table th{position:sticky;top:0;z-index:1;background:var(--surface);font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3)}.ac-table td{font-size:11px;color:var(--text-2)}.ac-table tr:last-child td{border-bottom:0}.ac-person{font-weight:800;font-size:12px;color:var(--text)}.ac-muted{margin-top:3px;font-size:10px;color:var(--text-3);word-break:break-word}.ac-mono{font:600 9.5px/1.45 'JetBrains Mono',monospace;color:var(--text-3);word-break:break-all}
      .ac-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;font-size:9.5px;font-weight:850;white-space:nowrap}.ac-pill:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.ac-pill--danger{color:#B91C1C;background:#FEE2E2}.ac-pill--ok{color:#047857;background:#D1FAE5}.ac-pill--warn{color:#9A5A00;background:#FEF3C7}.ac-pill--info{color:#1D4ED8;background:#DBEAFE}.ac-pill--muted{color:#64748B;background:#F1F5F9}.ac-pill--neutral{color:#475569;background:#E2E8F0}
      .ac-empty{padding:44px 22px;text-align:center;line-height:1.6;color:var(--text-3);background:var(--surface);border:1px dashed var(--border);border-radius:15px}.ac-empty b{display:block;margin-bottom:4px;color:var(--text-2)}.ac-loader{display:inline-block;width:18px;height:18px;border:2px solid var(--border-2);border-top-color:var(--primary);border-radius:50%;animation:acspin .7s linear infinite}@keyframes acspin{to{transform:rotate(360deg)}}
      .ac-review{border:1px solid var(--border);background:var(--surface-2);color:var(--primary);border-radius:9px;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}
      .ac-search{display:grid;grid-template-columns:1fr auto;gap:10px;padding:18px}.ac-search .input{min-height:46px}.ac-identity{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:20px}.ac-identity h2{margin:0;font-size:20px}.ac-verdict{display:inline-flex;padding:8px 12px;border-radius:999px;font-size:10px;font-weight:850}.ac-verdict[data-tone="ok"]{color:#047857;background:#D1FAE5}.ac-verdict[data-tone="warn"]{color:#9A5A00;background:#FEF3C7}.ac-verdict[data-tone="danger"]{color:#B91C1C;background:#FEE2E2}.ac-verdict[data-tone="neutral"]{color:#475569;background:#E2E8F0}
      details.ac-card{margin-top:13px;overflow:hidden}details.ac-card>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;cursor:pointer;list-style:none}details.ac-card>summary::-webkit-details-marker{display:none}details.ac-card>summary:after{content:'›';font-size:20px;color:var(--text-3);transform:rotate(90deg);transition:.18s}details.ac-card[open]>summary{border-bottom:1px solid var(--border)}details.ac-card[open]>summary:after{transform:rotate(-90deg)}.ac-summary-main{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;flex:1}.ac-summary-main b{font-size:13px;color:var(--text)}.ac-count{padding:4px 8px;border-radius:999px;background:color-mix(in srgb,var(--primary) 12%,transparent);font-size:9px;font-weight:800;color:var(--primary)}
      .ac-timeline{padding:7px 18px 14px}.ac-event{position:relative;padding:11px 0 11px 22px;border-bottom:1px solid var(--border)}.ac-event:last-child{border:0}.ac-event:before{content:'';position:absolute;left:2px;top:17px;width:8px;height:8px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 14%,transparent)}.ac-event b{font-size:11.5px;color:var(--text)}.ac-event span{display:block;margin-top:3px;font-size:10px;color:var(--text-3)}
      .ac-bulk-grid{display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr 1fr;gap:10px;padding:18px;align-items:end}.ac-field label{display:block;margin-bottom:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3)}.ac-field .input{width:100%}.ac-card-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 18px 18px}.ac-select-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px}.ac-candidates{padding:0 18px 18px}.ac-candidate{display:grid;grid-template-columns:28px minmax(0,1.2fr) minmax(110px,.7fr) minmax(120px,.7fr);gap:12px;align-items:center;padding:11px 8px;border-top:1px solid var(--border)}.ac-candidate:first-child{border-top:0}.ac-candidate input{width:16px;height:16px;accent-color:var(--primary)}.ac-gift-controls{display:grid;grid-template-columns:1fr 1.6fr auto;gap:10px;align-items:end;padding:16px 18px;border-top:1px solid var(--border);background:var(--surface-2)}.ac-history{display:grid;gap:8px;padding:14px 18px 18px}.ac-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-radius:12px;background:var(--surface-2)}.ac-history-row b{font-size:11px;color:var(--text)}.ac-history-row span{font-size:9.5px;color:var(--text-3)}
      .ac-check{display:flex;align-items:center;gap:8px;font-size:10.5px;color:#047857}.ac-check .ic{width:15px;height:15px}
      @media(max-width:960px){.ac-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-toolbar{grid-template-columns:1fr}.ac-filters{justify-content:flex-start}.ac-bulk-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-bulk-grid .ac-field:first-child{grid-column:1/-1}}
      @media(max-width:700px){.ac-tabs{gap:5px;padding:5px}.ac-tab{justify-content:center;padding:10px 6px;gap:7px}.ac-tab__icon{width:30px;height:30px}.ac-tab b{font-size:9.5px}.ac-tab small{display:none}.ac-search{grid-template-columns:1fr}.ac-search .btn{width:100%;justify-content:center}.ac-bulk-grid{grid-template-columns:1fr}.ac-bulk-grid .ac-field:first-child{grid-column:auto}.ac-candidate{grid-template-columns:28px 1fr auto}.ac-candidate>:nth-child(3){display:none}.ac-gift-controls{grid-template-columns:1fr}.ac-select-head{flex-direction:column}.ac-history-row{align-items:flex-start;flex-direction:column}}
      @media(max-width:520px){.ac-kpis{grid-template-columns:1fr}.ac-actions{align-items:stretch}.ac-actions .btn{width:100%;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function date(value) {
    if (!value) return '—';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('es-MX', { dateStyle:'medium', timeStyle:'short' });
  }

  function money(cents, currency) {
    try { return (Number(cents || 0) / 100).toLocaleString('es-MX', { style:'currency', currency:currency || 'MXN' }); }
    catch (_) { return '$' + (Number(cents || 0) / 100).toFixed(2); }
  }

  async function request(path, options) {
    var token = await pages._getAuthToken();
    if (!token) throw new Error('La sesión de administrador venció. Vuelve a iniciar sesión.');
    var config = Object.assign({ cache:'no-store' }, options || {});
    config.headers = Object.assign({ Authorization:'Bearer ' + token }, config.headers || {});
    var response = await fetch(pages._webhookUrl + path, config);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  }

  function header(active, title, description) {
    var tabs = [
      ['estado-pagos', 'i-dollar', 'Estado de pagos', 'Stripe, accesos y alertas'],
      ['auditoria', 'i-search', 'Auditar una cuenta', 'Expediente y actividad real'],
      ['creditos-masivos', 'i-users', 'Regalar créditos', 'Filtros y lotes seguros']
    ];
    return `<div class="ac-head"><div class="sec-hero"><span class="sec-hero__eyebrow">Control de cuentas</span><h1 class="sec-hero__title">${esc(title)}</h1><p class="sec-hero__sub">${esc(description)}</p></div><nav class="ac-tabs" aria-label="Herramientas de control de cuentas">${tabs.map(function (tab) { return `<button class="ac-tab" type="button" data-ac-nav="${tab[0]}" ${active === tab[0] ? 'aria-current="page"' : ''}><span class="ac-tab__icon"><svg class="ic"><use href="#${tab[1]}"/></svg></span><span><b>${tab[2]}</b><small>${tab[3]}</small></span></button>`; }).join('')}</nav></div>`;
  }

  function bindTabs(root) {
    root.querySelectorAll('[data-ac-nav]').forEach(function (button) {
      button.addEventListener('click', function () { window.navigateTo(button.dataset.acNav); });
    });
  }

  function empty(message, detail) {
    return `<div class="ac-empty"><b>${esc(message)}</b>${esc(detail || '')}</div>`;
  }

  function paymentLabel(state) {
    return {
      duplicate:['Posible duplicado','danger'],
      'paid-active':['Pagó · activa','ok'],
      'payment-problem':['Pago por revisar','warn'],
      'previously-purchased':['Compró antes','neutral'],
      'access-without-stripe':['Acceso sin Stripe','info'],
      'not-purchased':['No ha comprado','muted']
    }[state] || [state || 'Sin clasificar','neutral'];
  }

  pages['estado-pagos'] = function () {
    renderPayments();
    loadPayments(false);
  };

  async function loadPayments(force) {
    if (paymentState.loading || (paymentState.data && !force)) return;
    paymentState.loading = true;
    paymentState.error = '';
    renderPayments();
    try {
      paymentState.data = await request('/admin/payment-overview');
      paymentState.error = '';
      renderPayments();
    } catch (error) {
      if (paymentState.data) {
        renderPayments();
        window.Toast.error('No se pudo actualizar Stripe', error.message);
      } else {
        paymentState.error = error.message || 'No se pudo revisar Stripe.';
      }
    } finally {
      paymentState.loading = false;
      renderPayments();
    }
  }

  function renderPayments() {
    var root = page();
    if (!root || root.dataset.live !== 'estado-pagos') return;
    var data = paymentState.data;
    var counts = data && data.counts || {};
    var cards = [
      ['all','Cuentas revisadas',counts.total || 0,'Registros actuales e históricos','neutral'],
      ['duplicate','Posibles duplicados',counts.duplicate || 0,'Más de una suscripción cobrable','danger'],
      ['payment-problem','Pagos por revisar',counts['payment-problem'] || 0,'Pendientes, vencidos o impagos','warn'],
      ['access-without-stripe','Acceso sin Stripe',counts['access-without-stripe'] || 0,'Cortesías o activaciones manuales','info'],
      ['paid-active','Pagaron y están activas',counts['paid-active'] || 0,'Una suscripción vigente','ok'],
      ['not-purchased','Aún no compran',counts['not-purchased'] || 0,'Sin suscripción de IMDIIL','muted']
    ];
    var attention = Number(counts.duplicate || 0) + Number(counts['payment-problem'] || 0) + Number(counts['access-without-stripe'] || 0);
    var accounts = data && data.accounts || [];
    var rows = accounts.filter(function (account) {
      var matchesFilter = paymentState.filter === 'all' || account.state === paymentState.filter;
      var haystack = `${account.name || ''} ${account.email || ''} ${account.uid || ''}`.toLowerCase();
      return matchesFilter && (!paymentState.search || haystack.includes(paymentState.search));
    });
    var filters = [['all','Todas'],['duplicate','Duplicadas'],['paid-active','Pagaron'],['not-purchased','No compraron'],['payment-problem','Por revisar'],['previously-purchased','Compraron antes'],['access-without-stripe','Sin Stripe']];
    var tableRows = rows.map(function (account) {
      var label = paymentLabel(account.state);
      var subscriptions = (account.subscriptions || []).map(function (sub) { return `${esc(sub.id)} · ${esc(sub.status)}`; }).join('<br>') || '—';
      return `<tr><td><div class="ac-person">${esc(account.name || 'Sin nombre')}</div><div class="ac-muted">${esc(account.email || account.uid || 'Sin correo')}</div></td><td><span class="ac-pill ac-pill--${label[1]}">${esc(label[0])}</span>${account.blockingCount > 1 ? `<div class="ac-muted">${account.blockingCount} suscripciones cobrables</div>` : ''}</td><td><span class="ac-pill ac-pill--${account.localActive ? 'ok' : 'muted'}">${account.localActive ? 'Activo' : 'Inactivo'}</span><div class="ac-muted">${esc(account.localPlan || account.accessSource || '')}</div></td><td><div class="ac-mono">${subscriptions}</div></td><td>${date(account.registeredAt)}</td><td><button class="ac-review" type="button" data-ac-audit="${esc(account.email || account.uid)}">Ver expediente</button></td></tr>`;
    }).join('');
    root.innerHTML = `<div class="fade-up ac-shell">${header('estado-pagos','Estado de pagos','Compara todas las cuentas registradas con Stripe y coloca primero lo que realmente necesita atención.')}<div class="ac-actions"><span class="ac-updated">${data ? 'Revisado ' + date(data.generatedAt) : 'Pendiente de revisión'}</span><button class="btn btn--primary" id="ac-payment-refresh" type="button" ${paymentState.loading ? 'disabled' : ''}>${paymentState.loading ? '<span class="ac-loader"></span> Revisando…' : '<svg class="ic"><use href="#i-refresh"/></svg> Revisar Stripe ahora'}</button></div>${data ? `<div class="ac-alert" data-tone="${attention ? 'warn' : 'ok'}"><span class="ac-alert__dot"></span><div><b>${attention ? `${attention} cuenta${attention === 1 ? '' : 's'} necesita${attention === 1 ? '' : 'n'} atención` : 'Sin alertas de cobro en esta revisión'}</b><span>${attention ? 'Empieza por duplicados, pagos pendientes y accesos que no tienen una suscripción encontrada.' : 'Stripe y los accesos locales no muestran conflictos cobrables.'}</span></div></div><div class="ac-kpis">${cards.map(function (card) { return `<button class="ac-kpi" type="button" data-clickable="1" data-tone="${card[4]}" data-ac-payment-filter="${card[0]}" ${paymentState.filter === card[0] ? 'data-active="1"' : ''}><div class="ac-kpi__n">${Number(card[2]).toLocaleString('es-MX')}</div><div class="ac-kpi__label">${card[1]}</div><div class="ac-kpi__sub">${card[3]}</div></button>`; }).join('')}</div>` : ''}<div id="ac-payment-result">${!data ? (paymentState.error ? empty('No se pudo revisar Stripe',paymentState.error) : empty(paymentState.loading ? 'Conciliando cuentas con Stripe…' : 'La revisión aún no ha comenzado','')) : `<div class="ac-toolbar"><input class="input" id="ac-payment-search" type="search" placeholder="Buscar por nombre, correo o UID" value="${esc(paymentState.search)}"><div class="ac-filters">${filters.map(function (item) { return `<button class="ac-filter" type="button" data-ac-payment-filter="${item[0]}" ${paymentState.filter === item[0] ? 'data-active="1"' : ''}>${item[1]}</button>`; }).join('')}</div></div>${rows.length ? `<div class="ac-table-wrap"><table class="ac-table"><thead><tr><th>Cuenta</th><th>Estado</th><th>Acceso local</th><th>Suscripciones Stripe</th><th>Registro</th><th></th></tr></thead><tbody>${tableRows}</tbody></table></div>` : empty('No hay cuentas con este filtro','Prueba otra búsqueda o cambia el estado.')}`}</div></div>`;
    bindTabs(root);
    root.querySelector('#ac-payment-refresh')?.addEventListener('click', function () { loadPayments(true); });
    root.querySelectorAll('[data-ac-payment-filter]').forEach(function (button) { button.addEventListener('click', function () { paymentState.filter = button.dataset.acPaymentFilter || 'all'; renderPayments(); }); });
    root.querySelector('#ac-payment-search')?.addEventListener('input', function (event) { paymentState.search = String(event.target.value || '').trim().toLowerCase(); renderPayments(); var input = root.querySelector('#ac-payment-search'); if (input) { input.focus(); input.setSelectionRange(input.value.length,input.value.length); } });
    root.querySelectorAll('[data-ac-audit]').forEach(function (button) { button.addEventListener('click', function () { window.__imdiilAuditQuery = button.dataset.acAudit || ''; window.navigateTo('auditoria'); }); });
  }

  pages.auditoria = function () {
    var root = page();
    var initial = window.__imdiilAuditQuery || '';
    root.innerHTML = `<div class="fade-up ac-shell">${header('auditoria','Auditar una cuenta','Comprueba membresía, Stripe, cobros, cursos, materiales, juegos y sesiones en un expediente verificable.')}<section class="ac-card"><form class="ac-search" id="ac-audit-form"><input class="input" id="ac-audit-query" type="search" autocomplete="off" placeholder="Correo o UID de la cuenta" value="${esc(initial)}"><button class="btn btn--primary" id="ac-audit-submit" type="submit"><svg class="ic"><use href="#i-search"/></svg> Revisar cuenta</button></form></section><div id="ac-audit-result" aria-live="polite" style="margin-top:16px">${empty('Busca una cuenta','Verás únicamente evidencia disponible en IMDIIL y Stripe.')}</div></div>`;
    bindTabs(root);
    root.querySelector('#ac-audit-form').addEventListener('submit', function (event) { event.preventDefault(); runAudit(); });
    if (initial) runAudit();
  };

  function auditVerdict(code) {
    return {
      'consistent-active':['Coincide · activa','ok','Sin acción necesaria','Stripe y el acceso de IMDIIL coinciden.'],
      'stripe-active-local-inactive':['Sincronización pendiente','danger','Revisar nuevamente','Stripe está activo; el sistema intentó reparar el acceso local de forma segura.'],
      'local-active-stripe-missing':['Acceso sin Stripe','warn','Confirmar el origen','Verifica si es cortesía o activación manual antes de modificar Stripe.'],
      'duplicate-subscriptions':['Posible duplicado','danger','Resolver en Stripe','Hay más de una suscripción cobrable. Compara fechas y facturas antes de cancelar o reembolsar.'],
      'payment-problem':['Pago por revisar','warn','Revisar la factura','Confirma el estado del pago antes de activar, cancelar o devolver dinero.'],
      inactive:['Inactiva','neutral','Sin cobro activo','Si la persona pagó, solicita el comprobante y vuelve a ejecutar la auditoría.']
    }[code] || ['Revisión manual','neutral','Revisar evidencia','No hay datos suficientes para una conclusión automática.'];
  }

  async function runAudit() {
    var root = page();
    var query = String(root.querySelector('#ac-audit-query')?.value || '').trim();
    if (!query) { window.Toast.info('Falta una cuenta','Escribe un correo o UID.'); return; }
    window.__imdiilAuditQuery = query;
    var requestId = ++auditSequence;
    var result = root.querySelector('#ac-audit-result');
    var submit = root.querySelector('#ac-audit-submit');
    submit.disabled = true; submit.innerHTML = '<span class="ac-loader"></span> Revisando…';
    result.innerHTML = empty('Contrastando IMDIIL con Stripe…','Reuniendo progreso y actividad disponible.');
    try {
      var data = await request('/admin/account-audit?query=' + encodeURIComponent(query));
      if (requestId !== auditSequence) return;
      renderAudit(data);
    } catch (error) {
      if (requestId === auditSequence) result.innerHTML = empty('No se pudo completar la auditoría', error.message);
    } finally {
      if (requestId === auditSequence && submit) { submit.disabled = false; submit.innerHTML = '<svg class="ic"><use href="#i-search"/></svg> Revisar cuenta'; }
    }
  }

  function tableSection(title, count, headings, rows, open) {
    return `<details class="ac-card" ${open ? 'open' : ''}><summary><span class="ac-summary-main"><b>${esc(title)}</b><span class="ac-count">${Number(count || 0).toLocaleString('es-MX')}</span></span></summary>${rows ? `<div class="ac-table-wrap"><table class="ac-table"><thead><tr>${headings.map(function (heading) { return `<th>${esc(heading)}</th>`; }).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : empty('Sin movimientos registrados','')}</details>`;
  }

  function renderAudit(data) {
    var result = document.getElementById('ac-audit-result');
    if (!result) return;
    var identity = data.identity || {};
    var membership = data.membership || {};
    var verdict = auditVerdict(membership.verdict);
    var subscriptions = data.subscriptions || [];
    var payments = data.payments || [];
    var courses = data.courses || [];
    var materials = data.materials || [];
    var games = data.games || [];
    var sessions = data.sessions || [];
    var timeline = data.timeline || [];
    var subscriptionRows = subscriptions.map(function (sub) { return `<tr><td><div class="ac-mono">${esc(sub.id)}</div></td><td><span class="ac-pill ac-pill--${['active','trialing'].includes(sub.status) ? 'ok' : DEFAULT_PROBLEM(sub.status) ? 'warn' : 'neutral'}">${esc(sub.status)}</span></td><td>${money(sub.amount,sub.currency)} · ${esc(sub.interval || '—')}</td><td>${date(sub.currentPeriodEnd)}</td><td>${sub.cancelAtPeriodEnd ? 'Programada' : 'No'}</td></tr>`; }).join('');
    var paymentRows = payments.map(function (item) { return `<tr><td>${date(item.createdAt)}<div class="ac-mono">${esc(item.id)}</div></td><td><span class="ac-pill ac-pill--${item.paid ? 'ok' : 'warn'}">${item.paid ? 'Pagado' : esc(item.status)}</span></td><td>${money(item.amount,item.currency)}</td><td>${esc(item.reason || '—')}</td><td>${item.hostedInvoiceUrl ? `<a class="ac-review" target="_blank" rel="noopener" href="${esc(item.hostedInvoiceUrl)}">Ver factura</a>` : '—'}</td></tr>`; }).join('');
    var courseRows = courses.map(function (course) { return `<tr><td><div class="ac-person">${esc(course.title)}</div><div class="ac-muted">${esc(course.area || '')}</div></td><td><span class="ac-pill ac-pill--${course.available ? 'ok' : 'muted'}">${course.available ? 'Disponible' : 'Bloqueado'}</span></td><td>${course.unlockDay == null ? 'Próximamente' : `Día ${course.unlockDay}`}<div class="ac-muted">${date(course.unlockAt)}</div></td><td>${course.viewedClasses}/${course.totalClasses} clases</td><td>${course.completed ? 'Completado' : 'En progreso'}</td></tr>`; }).join('');
    var materialRows = materials.map(function (item) { return `<tr><td><div class="ac-person">${esc(item.title)}</div><div class="ac-muted">${esc(item.course || item.source || '')}</div></td><td>${date(item.redeemedAt)}</td><td>${item.exactOpenTracking ? 'Sí' : 'No disponible para registros anteriores'}</td></tr>`; }).join('');
    var gameRows = games.map(function (item) { return `<tr><td><div class="ac-person">${esc(item.title)}</div><div class="ac-muted">${esc(item.type)}</div></td><td>${esc(item.courseId || '—')}</td><td>${date(item.playedAt)}</td><td>${esc(item.status || '—')}</td></tr>`; }).join('');
    var sessionRows = sessions.map(function (item) { return `<tr><td>${date(item.startedAt)}</td><td>${esc(item.area)}</td><td>${item.minutes} min</td><td>${Object.keys(item.sections || {}).map(esc).join(', ') || '—'}</td></tr>`; }).join('');
    var timelineRows = timeline.map(function (item) { return `<div class="ac-event"><b>${esc(item.title)}</b><span>${date(item.at)} · ${esc(item.detail || '')}</span></div>`; }).join('');
    var paid = payments.filter(function (item) { return item.paid; }).length;
    result.innerHTML = `<section class="ac-card"><div class="ac-identity"><div><h2>${esc(identity.name || 'Cuenta IMDIIL')}</h2><div class="ac-muted">${esc(identity.email || 'Sin correo')} · UID: ${esc(identity.uid || '—')} · Registro: ${date(identity.createdAt)}</div></div><span class="ac-verdict" data-tone="${verdict[1]}">${verdict[0]}</span></div></section><div class="ac-alert" data-tone="${verdict[1] === 'danger' ? 'danger' : verdict[1] === 'ok' ? 'ok' : 'warn'}"><span class="ac-alert__dot"></span><div><b>${verdict[2]}</b><span>${verdict[3]}</span></div></div>${membership.reconciliation?.repaired ? `<div class="ac-alert" data-tone="ok"><span class="ac-alert__dot"></span><div><b>Acceso reparado automáticamente</b><span>Se sincronizó la única suscripción activa ${esc(membership.reconciliation.subscriptionId)} con la cuenta local.</span></div></div>` : ''}<div class="ac-kpis"><div class="ac-kpi"><div class="ac-kpi__label">IMDIIL</div><div class="ac-kpi__n">${membership.localActive ? 'Activa' : 'Inactiva'}</div><div class="ac-kpi__sub">${esc(membership.plan || membership.accessSource || 'Sin plan')}</div></div><div class="ac-kpi"><div class="ac-kpi__label">Stripe</div><div class="ac-kpi__n">${membership.stripeActive ? 'Activa' : 'Sin activa'}</div><div class="ac-kpi__sub">${membership.blockingCount || 0} suscripción(es) cobrable(s)</div></div><div class="ac-kpi"><div class="ac-kpi__label">Próximo curso</div><div class="ac-kpi__n" style="font-size:15px">${esc(data.nextCourse?.title || '—')}</div><div class="ac-kpi__sub">${data.nextCourse ? date(data.nextCourse.unlockAt) : 'Sin próximo desbloqueo'}</div></div><div class="ac-kpi"><div class="ac-kpi__label">Cobros pagados</div><div class="ac-kpi__n">${paid}</div><div class="ac-kpi__sub">facturas encontradas</div></div><div class="ac-kpi"><div class="ac-kpi__label">Sesiones</div><div class="ac-kpi__n">${sessions.length}</div><div class="ac-kpi__sub">según retención de analítica</div></div><div class="ac-kpi"><div class="ac-kpi__label">Juegos y retos</div><div class="ac-kpi__n">${games.length}</div><div class="ac-kpi__sub">movimientos verificables</div></div></div>${tableSection('Suscripciones en Stripe',subscriptions.length,['Suscripción','Estado','Importe','Fin del periodo','Cancelación'],subscriptionRows,true)}${tableSection('Cobros y facturas',payments.length,['Fecha','Estado','Importe','Motivo','Comprobante'],paymentRows,true)}${tableSection('Cursos, desbloqueos y progreso',courses.length,['Curso','Acceso','Se desbloquea','Uso','Estado'],courseRows,false)}${tableSection('Materiales y canjes',materials.length,['Material','Canjeado','Apertura exacta'],materialRows,false)}${tableSection('Juegos y retos',games.length,['Actividad','Curso','Hora registrada','Estado'],gameRows,false)}${tableSection('Sesiones verificables',sessions.length,['Inicio','Área','Duración','Secciones'],sessionRows,false)}<details class="ac-card"><summary><span class="ac-summary-main"><b>Línea de tiempo verificable</b><span class="ac-count">${timeline.length}</span></span></summary><div class="ac-timeline">${timelineRows || '<div class="ac-empty">Sin eventos con fecha disponible.</div>'}</div></details><div class="ac-alert" data-tone="ok"><span class="ac-alert__dot"></span><div><b>Alcance de la evidencia</b><span>${esc((data.coverage?.limitations || []).join(' '))}</span></div></div>`;
  }

  function DEFAULT_PROBLEM(status) { return ['incomplete','past_due','unpaid','paused'].includes(status); }

  pages['creditos-masivos'] = function () {
    bulkState = emptyBulkState();
    var root = page();
    root.innerHTML = `<div class="fade-up ac-shell">${header('creditos-masivos','Regalar créditos','Filtra cuentas por fecha, membresía e historial; selecciona explícitamente a las personas y confirma el total antes de modificar saldos.')}<section class="ac-card"><div class="ac-card__head"><div><h2>1. Buscar cuentas</h2><p>La vista previa no modifica saldos y nadie se selecciona automáticamente.</p></div><span class="ac-pill ac-pill--warn">Solo vista previa</span></div><div class="ac-bulk-grid"><div class="ac-field"><label for="ac-bulk-search">Nombre, correo o UID</label><input class="input" id="ac-bulk-search" type="search" placeholder="Cuenta concreta"></div><div class="ac-field"><label for="ac-bulk-history">Historial de regalos</label><select class="input" id="ac-bulk-history"><option value="never-gifted">Sin créditos regalados</option><option value="gifted">Ya recibieron regalo</option><option value="all">Todos</option></select></div><div class="ac-field"><label for="ac-bulk-membership">Estado de membresía</label><select class="input" id="ac-bulk-membership"><option value="all">Activas e inactivas</option><option value="active">Solo activas</option><option value="inactive">Solo inactivas</option></select></div><div class="ac-field"><label for="ac-bulk-from">Registrados desde</label><input class="input" id="ac-bulk-from" type="date"></div><div class="ac-field"><label for="ac-bulk-to">Registrados hasta</label><input class="input" id="ac-bulk-to" type="date"></div></div><div class="ac-card-actions"><button class="btn btn--primary" id="ac-bulk-preview" type="button"><svg class="ic"><use href="#i-search"/></svg> Buscar y revisar</button><span class="ac-check" id="ac-bulk-verified" hidden><svg class="ic"><use href="#i-check"/></svg> Historial verificado</span></div></section><section class="ac-card" style="margin-top:16px"><div class="ac-select-head"><div><h2 style="margin:0;font-size:15px">2. Elegir personas</h2><p style="margin:4px 0 0;font-size:10.5px;color:var(--text-3)">Marca únicamente las cuentas que deben recibir el regalo.</p></div><div class="ac-actions" style="margin:0"><button class="btn btn--ghost btn--sm" id="ac-bulk-all" type="button" hidden>Seleccionar coincidencias</button><button class="btn btn--ghost btn--sm" id="ac-bulk-none" type="button" hidden>Quitar selección</button></div></div><div class="ac-candidates" id="ac-bulk-candidates">${empty('Aún no hay una vista previa','Elige filtros y presiona “Buscar y revisar”.')}</div><div class="ac-gift-controls" id="ac-bulk-controls" hidden><div class="ac-field"><label for="ac-bulk-amount">Créditos por cuenta</label><input class="input" id="ac-bulk-amount" type="number" min="1" max="100000" value="100"></div><div class="ac-field"><label for="ac-bulk-note">Nota para el historial</label><input class="input" id="ac-bulk-note" maxlength="200" placeholder="Motivo del regalo"></div><button class="btn btn--primary" id="ac-bulk-review" type="button" disabled>Revisar entrega</button></div></section><section class="ac-card" style="margin-top:16px"><div class="ac-card__head"><div><h2>Historial de lotes</h2><p>Comprueba quién ejecutó cada entrega y cuántas cuentas se modificaron.</p></div></div><div class="ac-history" id="ac-bulk-history-list">${empty('Cargando historial…','')}</div></section></div>`;
    bindTabs(root);
    root.querySelector('#ac-bulk-preview').addEventListener('click', loadBulkPreview);
    root.querySelector('#ac-bulk-search').addEventListener('keydown', function (event) { if (event.key === 'Enter') loadBulkPreview(); });
    root.querySelector('#ac-bulk-all').addEventListener('click', function () { bulkState.selected = new Set(bulkState.candidates.map(function (item) { return item.uid; })); invalidateBulkOperation(); renderBulkCandidates(); });
    root.querySelector('#ac-bulk-none').addEventListener('click', function () { bulkState.selected.clear(); invalidateBulkOperation(); renderBulkCandidates(); });
    root.querySelector('#ac-bulk-amount').addEventListener('input', function () { invalidateBulkOperation(); updateBulkSummary(); });
    root.querySelector('#ac-bulk-note').addEventListener('input', invalidateBulkOperation);
    root.querySelector('#ac-bulk-review').addEventListener('click', reviewBulkGrant);
    loadBulkHistory();
  };

  async function loadBulkPreview() {
    var root = page();
    var button = root.querySelector('#ac-bulk-preview');
    var from = root.querySelector('#ac-bulk-from').value;
    var to = root.querySelector('#ac-bulk-to').value;
    if (from && to && from > to) { window.Toast.error('Rango inválido','La fecha inicial no puede ser posterior a la final.'); return; }
    button.disabled = true; button.innerHTML = '<span class="ac-loader"></span> Buscando…';
    try {
      var data = await request('/admin/creditos/masivos/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ search:root.querySelector('#ac-bulk-search').value, giftStatus:root.querySelector('#ac-bulk-history').value, membershipStatus:root.querySelector('#ac-bulk-membership').value, registeredFrom:from, registeredTo:to }) });
      bulkState.candidates = data.candidates || [];
      bulkState.selected = new Set();
      bulkState.loaded = true;
      invalidateBulkOperation();
      root.querySelector('#ac-bulk-verified').hidden = data.historyVerified !== true;
      renderBulkCandidates();
      if (data.truncated) window.Toast.info('Vista limitada','Se muestran las primeras 1,000 coincidencias. Usa más filtros.');
    } catch (error) {
      window.Toast.error('No se pudo preparar la vista previa',error.message);
    } finally {
      button.disabled = false; button.innerHTML = '<svg class="ic"><use href="#i-search"/></svg> Buscar y revisar';
    }
  }

  function renderBulkCandidates() {
    var root = page();
    if (!root || root.dataset.live !== 'creditos-masivos') return;
    var container = root.querySelector('#ac-bulk-candidates');
    var controls = root.querySelector('#ac-bulk-controls');
    var all = root.querySelector('#ac-bulk-all');
    var none = root.querySelector('#ac-bulk-none');
    controls.hidden = !bulkState.candidates.length;
    all.hidden = !bulkState.candidates.length || bulkState.selected.size === bulkState.candidates.length;
    none.hidden = bulkState.selected.size === 0;
    if (!bulkState.candidates.length) {
      container.innerHTML = empty(bulkState.loaded ? 'No hay coincidencias' : 'Aún no hay una vista previa', bulkState.loaded ? 'Cambia los filtros o el rango de fechas.' : 'Elige filtros y presiona “Buscar y revisar”.');
      updateBulkSummary(); return;
    }
    container.innerHTML = bulkState.candidates.map(function (item) { return `<label class="ac-candidate"><input type="checkbox" data-ac-bulk-uid="${esc(item.uid)}" ${bulkState.selected.has(item.uid) ? 'checked' : ''}><span><span class="ac-person">${esc(item.name || 'Sin nombre')}</span><span class="ac-muted">${esc(item.email || item.uid)}</span></span><span class="ac-pill ac-pill--${item.membershipActive ? 'ok' : 'muted'}">${item.membershipActive ? 'Activa' : 'Inactiva'}</span><span class="ac-muted">${date(item.registeredAt)}</span></label>`; }).join('');
    container.querySelectorAll('[data-ac-bulk-uid]').forEach(function (input) { input.addEventListener('change', function () { if (input.checked) bulkState.selected.add(input.dataset.acBulkUid); else bulkState.selected.delete(input.dataset.acBulkUid); invalidateBulkOperation(); renderBulkCandidates(); }); });
    updateBulkSummary();
  }

  function updateBulkSummary() {
    var root = page();
    if (!root) return;
    var review = root.querySelector('#ac-bulk-review');
    var amount = Math.floor(Number(root.querySelector('#ac-bulk-amount')?.value || 0));
    if (review) { review.disabled = bulkState.selected.size === 0 || amount < 1 || amount > 100000; review.textContent = bulkState.selected.size ? `Revisar ${bulkState.selected.size} cuenta${bulkState.selected.size === 1 ? '' : 's'}` : 'Revisar entrega'; }
  }

  function invalidateBulkOperation() { bulkState.operationId = ''; bulkState.operationSignature = ''; }

  function newOperationId() { return 'gift_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,12); }

  function reviewBulkGrant() {
    var root = page();
    var amount = Math.floor(Number(root.querySelector('#ac-bulk-amount').value));
    var note = String(root.querySelector('#ac-bulk-note').value || '').trim();
    var uids = Array.from(bulkState.selected).sort();
    if (!uids.length || amount < 1 || amount > 100000) return;
    var signature = JSON.stringify({ uids:uids, amount:amount, note:note });
    if (!bulkState.operationId || bulkState.operationSignature !== signature) { bulkState.operationId = newOperationId(); bulkState.operationSignature = signature; }
    var body = `<div class="ac-alert" data-tone="warn"><span class="ac-alert__dot"></span><div><b>Confirma antes de modificar saldos</b><span>Esta acción queda registrada y un reintento con el mismo identificador no duplicará créditos.</span></div></div><div class="ac-kpis" style="grid-template-columns:repeat(3,1fr)"><div class="ac-kpi"><div class="ac-kpi__n">${uids.length}</div><div class="ac-kpi__label">Cuentas</div></div><div class="ac-kpi"><div class="ac-kpi__n">${amount.toLocaleString('es-MX')}</div><div class="ac-kpi__label">Por cuenta</div></div><div class="ac-kpi"><div class="ac-kpi__n">${(uids.length * amount).toLocaleString('es-MX')}</div><div class="ac-kpi__label">Total</div></div></div><p style="font-size:12px;color:var(--text-2)"><b>Nota:</b> ${esc(note || 'Sin nota')}</p>`;
    window.Modal.open({ title:'Confirmar regalo masivo', subtitle:'Créditos IMDIIL', icon:'i-dollar', body:body, footer:'<button class="btn btn--ghost" id="ac-bulk-cancel">Cancelar</button><button class="btn btn--primary" id="ac-bulk-confirm">Confirmar y entregar</button>' });
    document.getElementById('ac-bulk-cancel').addEventListener('click', function () { window.Modal.close(); });
    document.getElementById('ac-bulk-confirm').addEventListener('click', async function () {
      var confirm = document.getElementById('ac-bulk-confirm');
      confirm.disabled = true; confirm.innerHTML = '<span class="ac-loader"></span> Entregando…';
      try {
        var data = await request('/admin/creditos/masivos', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ operationId:bulkState.operationId, uids:uids, amount:amount, note:note }) });
        window.Modal.close();
        window.Toast.success('Créditos entregados',`${data.delivered || 0} cuentas modificadas · ${data.skipped || 0} ya estaban aplicadas`);
        bulkState.selected.clear(); invalidateBulkOperation(); renderBulkCandidates(); loadBulkHistory();
      } catch (error) {
        window.Toast.error('No se pudo completar el lote',error.message);
        confirm.disabled = false; confirm.textContent = 'Reintentar de forma segura';
      }
    });
  }

  async function loadBulkHistory() {
    var root = page();
    var target = root && root.querySelector('#ac-bulk-history-list');
    if (!target) return;
    try {
      var data = await request('/admin/creditos/masivos/historial');
      bulkState.history = data.batches || [];
      target.innerHTML = bulkState.history.length ? bulkState.history.map(function (batch) { var result = batch.result || {}; return `<div class="ac-history-row"><div><b>${Number(batch.amount || result.creditsPerAccount || 0).toLocaleString('es-MX')} créditos × ${Number(result.requested || batch.requested || 0).toLocaleString('es-MX')} cuentas</b><span>${date(batch.createdAt)} · ${esc(batch.adminEmail || 'Administrador')} · ${esc(batch.note || 'Sin nota')}</span></div><span class="ac-pill ac-pill--${batch.status === 'completed' ? 'ok' : 'warn'}">${batch.status === 'completed' ? `${result.delivered || 0} entregados` : 'En proceso'}</span></div>`; }).join('') : empty('Sin lotes todavía','Las entregas confirmadas aparecerán aquí.');
    } catch (error) {
      target.innerHTML = empty('No se pudo cargar el historial',error.message);
    }
  }

  injectStyles();

  var originalNavigate = window.navigateTo;
  window.navigateTo = function (section) {
    originalNavigate(section);
    if (controlSections.includes(section)) {
      document.querySelectorAll('[data-control-hub]').forEach(function (item) { item.classList.add('is-active'); });
    }
  };
})(); // IMDIIL account control




