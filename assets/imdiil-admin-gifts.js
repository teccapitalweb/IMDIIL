// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Admin · Regalar créditos (como SYNOVA / ICADEM)
//   1) "Regalar créditos" a un miembro desde Acciones del miembro.
//   2) "Quién ya recibió créditos" dentro de Regalar créditos (lotes).
// Usa el mismo servicio seguro del lote (/admin/creditos/masivos): cada
// regalo queda en credit_ledger (admin_gift) y el miembro ve el cofre.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('es-MX'); };
  var when = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  var P = function () { return window.Pages || {}; };

  async function request(path, options) {
    var token = P()._getAuthToken ? await P()._getAuthToken() : '';
    if (!token) throw new Error('La sesión de administrador venció. Vuelve a iniciar sesión.');
    var cfg = Object.assign({ cache: 'no-store' }, options || {});
    cfg.headers = Object.assign({ Authorization: 'Bearer ' + token }, cfg.headers || {});
    var res = await fetch(String(P()._webhookUrl || '').replace(/\/$/, '') + path, cfg);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.ok === false) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  }

  var cache = null;
  async function loadGifts(force) {
    if (cache && !force) return cache;
    cache = await request('/admin/creditos/regalados');
    return cache;
  }

  // ─── 1) Regalo a un solo miembro ───
  function openGift(member) {
    if (!window.Modal) return;
    var uid = String(member && (member.uid || member.id) || '');
    if (!uid) { window.Toast && Toast.error('Miembro sin identificador', 'Actualiza la lista e inténtalo de nuevo.'); return; }
    var name = member.nombre || member.displayName || member.email || 'Este miembro';
    var opId = 'gift1_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    var body = document.createElement('div');
    body.className = 'igf';
    body.innerHTML =
      '<div class="igf-who"><span class="igf-coin">C</span><div><b>' + esc(name) + '</b><small>' + esc(member.email || uid) + '</small></div></div>' +
      '<label class="igf-lbl">Créditos a regalar</label>' +
      '<div class="igf-presets">' + [50, 100, 250, 500, 1000].map(function (n) { return '<button type="button" data-igf-n="' + n + '">' + fmt(n) + '</button>'; }).join('') + '</div>' +
      '<input class="igf-in" id="igf-amount" type="number" min="1" max="100000" step="1" placeholder="Otra cantidad">' +
      '<label class="igf-lbl" for="igf-note">Motivo (lo verá el miembro en su cofre)</label>' +
      '<input class="igf-in" id="igf-note" maxlength="200" placeholder="Ej. Cortesía por participar en el webinar">' +
      '<div class="igf-prev" id="igf-prev"></div>' +
      '<p class="igf-hint">Se suma a su saldo al instante y le aparece el cofre con monedas la próxima vez que entre al panel.</p>';
    var footer = document.createElement('div');
    footer.innerHTML = '<button class="btn btn--ghost" id="igf-cancel">Cancelar</button><button class="btn btn--primary" id="igf-ok" disabled>Regalar créditos</button>';
    Modal.open({ title: 'Regalar créditos', subtitle: 'Créditos de cortesía', icon: 'i-dollar', body: body, footer: footer });
    var amountEl = body.querySelector('#igf-amount');
    var ok = footer.querySelector('#igf-ok');
    var amount = function () { return Math.floor(Number(amountEl.value || 0)); };
    var refresh = function () {
      var n = amount();
      var valid = n >= 1 && n <= 100000;
      ok.disabled = !valid;
      ok.textContent = valid ? 'Regalar ' + fmt(n) + ' créditos' : 'Regalar créditos';
      body.querySelectorAll('[data-igf-n]').forEach(function (b) { b.classList.toggle('is-on', Number(b.dataset.igfN) === n); });
      var prev = body.querySelector('#igf-prev');
      var mine = cache && (cache.members || []).find(function (x) { return x.uid === uid; });
      prev.innerHTML = mine ? 'Ya recibió <b>' + fmt(mine.total) + '</b> créditos de cortesía (' + mine.count + (mine.count === 1 ? ' vez' : ' veces') + '); la última: ' + esc(when(mine.lastAt)) : '';
    };
    body.querySelectorAll('[data-igf-n]').forEach(function (b) { b.addEventListener('click', function () { amountEl.value = b.dataset.igfN; refresh(); }); });
    amountEl.addEventListener('input', refresh);
    loadGifts().then(refresh).catch(function () {});
    footer.querySelector('#igf-cancel').addEventListener('click', function () { Modal.close(); });
    ok.addEventListener('click', async function () {
      var n = amount();
      if (!(n >= 1 && n <= 100000)) return;
      ok.disabled = true; ok.textContent = 'Regalando…';
      try {
        var data = await request('/admin/creditos/masivos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationId: opId, uids: [uid], amount: n, note: String(body.querySelector('#igf-note').value || '').trim() })
        });
        Modal.close();
        var applied = Number(data.delivered || 0) > 0 || data.repeated;
        window.Toast && Toast.success(applied ? 'Créditos regalados' : 'Ya estaba aplicado', fmt(n) + ' créditos para ' + name);
        cache = null;
        paintGiftList();
      } catch (error) {
        ok.disabled = false; ok.textContent = 'Reintentar';
        window.Toast && Toast.error('No se pudo regalar', error.message);
      }
    });
    refresh();
  }
  window.IMDIILCreditGift = { open: openGift, reload: function () { cache = null; return loadGifts(true); } };

  // Conecta la acción "creditos" del modal de Acciones del miembro.
  function patchActions() {
    var pages = window.Pages;
    if (!pages || !pages._ejecutarAccion || pages._ejecutarAccion.__gifts) return !!(pages && pages._ejecutarAccion);
    var original = pages._ejecutarAccion;
    pages._ejecutarAccion = function (m, accion) {
      if (accion === 'creditos') return openGift(m);
      return original.apply(this, arguments);
    };
    pages._ejecutarAccion.__gifts = true;
    return true;
  }

  // ─── 2) Lista de quién ya recibió créditos (en la página Regalar créditos) ───
  var listState = { q: '', view: 'members' };
  function giftSectionHtml() {
    return '<section class="ac-card igl" id="igl"><div class="ac-card__head"><div><h2>Quién ya recibió créditos</h2><p>Todas las cortesías entregadas, individuales o por lote.</p></div>' +
      '<button type="button" class="btn btn--ghost" id="igl-refresh">Actualizar</button></div>' +
      '<div class="igl-kpis" id="igl-kpis"></div>' +
      '<div class="igl-tools"><div class="igl-tabs"><button type="button" data-igl-view="members" class="is-on">Por miembro</button><button type="button" data-igl-view="gifts">Cada regalo</button></div>' +
      '<input class="igf-in igl-q" id="igl-q" placeholder="Buscar nombre o correo"></div>' +
      '<div id="igl-list" class="igl-list"><div class="igl-empty">Cargando…</div></div></section>';
  }

  async function paintGiftList(force) {
    var host = document.getElementById('igl');
    if (!host) return;
    var list = host.querySelector('#igl-list');
    try {
      var data = await loadGifts(force);
      var t = data.totals || {};
      host.querySelector('#igl-kpis').innerHTML =
        '<div><b>' + fmt(t.people) + '</b><span>miembros</span></div><div><b>' + fmt(t.gifts) + '</b><span>regalos</span></div><div><b>+' + fmt(t.credits) + '</b><span>créditos regalados</span></div>';
      var q = listState.q.toLowerCase();
      var match = function (x) { return !q || (String(x.name || '') + ' ' + String(x.email || '') + ' ' + String(x.uid || '')).toLowerCase().indexOf(q) !== -1; };
      if (listState.view === 'members') {
        var rows = (data.members || []).filter(match);
        list.innerHTML = rows.length ? '<div class="igl-row igl-row--h"><span>Miembro</span><span>Veces</span><span>Total</span><span>Último</span></div>' + rows.map(function (x) {
          return '<div class="igl-row"><span><b>' + esc(x.name || 'Sin nombre') + '</b><small>' + esc(x.email || x.uid) + '</small></span><span>' + fmt(x.count) + '</span><span class="igl-plus">+' + fmt(x.total) + '</span><span>' + esc(when(x.lastAt)) + '</span></div>';
        }).join('') : '<div class="igl-empty">' + (q ? 'Sin coincidencias.' : 'Aún no se han regalado créditos.') + '</div>';
      } else {
        var gifts = (data.gifts || []).filter(match);
        list.innerHTML = gifts.length ? '<div class="igl-row igl-row--h igl-row--g"><span>Fecha</span><span>Miembro</span><span>Motivo</span><span>Créditos</span></div>' + gifts.map(function (x) {
          return '<div class="igl-row igl-row--g"><span>' + esc(when(x.createdAt)) + '</span><span><b>' + esc(x.name || 'Sin nombre') + '</b><small>' + esc(x.email || x.uid) + '</small></span><span>' + esc(x.note || '—') + (x.adminEmail ? '<small>por ' + esc(x.adminEmail) + '</small>' : '') + '</span><span class="igl-plus">+' + fmt(x.amount) + '</span></div>';
        }).join('') : '<div class="igl-empty">' + (q ? 'Sin coincidencias.' : 'Aún no se han regalado créditos.') + '</div>';
      }
    } catch (error) {
      list.innerHTML = '<div class="igl-empty">No se pudo cargar: ' + esc(error.message) + '</div>';
    }
  }

  function mountGiftList() {
    if (document.getElementById('igl')) return;
    var anchor = document.getElementById('ac-bulk-history-list');
    if (!anchor) return;
    var card = anchor.closest('.ac-card') || anchor.parentNode;
    card.insertAdjacentHTML('beforebegin', giftSectionHtml());
    var host = document.getElementById('igl');
    host.querySelector('#igl-refresh').addEventListener('click', function () { cache = null; paintGiftList(true); });
    host.querySelector('#igl-q').addEventListener('input', function (e) { listState.q = e.target.value || ''; paintGiftList(); });
    host.querySelectorAll('[data-igl-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        listState.view = b.dataset.iglView;
        host.querySelectorAll('[data-igl-view]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paintGiftList();
      });
    });
    paintGiftList(true);
  }

  new MutationObserver(function () { mountGiftList(); }).observe(document.documentElement, { childList: true, subtree: true });
  (function wait(tries) { if (!patchActions() && tries < 100) setTimeout(function () { wait(tries + 1); }, 150); })(0);

  var css = document.createElement('style');
  css.textContent = [
    '.igf-who{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--primary,#FF7A2D) 7%,var(--surface,#fff))}',
    '.igf-who b{display:block;font-size:14px}.igf-who small{color:var(--text-3);font-size:12px}',
    '.igf-coin{flex:0 0 38px;height:38px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#ffe6a1,#d7a323);color:#513700;font:900 15px "JetBrains Mono",monospace;box-shadow:0 4px 10px rgba(0,0,0,.15)}',
    '.igf-lbl{display:block;margin:12px 0 6px;font:700 11px "JetBrains Mono",monospace;letter-spacing:.6px;text-transform:uppercase;color:var(--text-3)}',
    '.igf-presets{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:8px}',
    '.igf-presets button{height:40px;border:1px solid var(--border);border-radius:11px;background:var(--surface,#fff);color:var(--text);font:700 13px Inter,sans-serif;cursor:pointer}',
    '.igf-presets button.is-on,.igf-presets button:hover{border-color:var(--primary,#FF7A2D);color:var(--primary,#FF7A2D);background:color-mix(in srgb,var(--primary,#FF7A2D) 8%,transparent)}',
    '.igf-in{width:100%;box-sizing:border-box;height:42px;padding:0 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2,#faf6ef);color:var(--text);font:500 14px Inter,sans-serif}',
    '.igf-prev{margin-top:12px;font-size:12.5px;color:var(--text-2)}.igf-prev:empty{display:none}',
    '.igf-hint{margin:10px 0 0;font-size:12px;color:var(--text-3)}',
    '.igl{margin-top:18px}.igl-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 14px}',
    '.igl-kpis div{padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface,#fff)}.igl-kpis b{display:block;font:800 22px "Plus Jakarta Sans",sans-serif}.igl-kpis span{color:var(--text-3);font-size:12px}',
    '.igl-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.igl-q{flex:1;min-width:200px}',
    '.igl-tabs{display:flex;gap:6px}.igl-tabs button{height:36px;padding:0 14px;border:1px solid var(--border);border-radius:999px;background:var(--surface,#fff);color:var(--text-2);font:600 12.5px Inter,sans-serif;cursor:pointer}.igl-tabs button.is-on{background:var(--primary,#FF7A2D);border-color:var(--primary,#FF7A2D);color:#fff}',
    '.igl-list{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface,#fff)}',
    '.igl-row{display:grid;grid-template-columns:2fr .6fr .8fr 1.2fr;gap:12px;align-items:center;padding:11px 14px;border-top:1px solid var(--border);font-size:13px}',
    '.igl-row--g{grid-template-columns:1.1fr 1.7fr 1.7fr .7fr}',
    '.igl-row:first-child{border-top:0}.igl-row--h{background:var(--surface-2,#faf6ef);font:700 10.5px "JetBrains Mono",monospace;letter-spacing:.6px;text-transform:uppercase;color:var(--text-3)}',
    '.igl-row b{display:block}.igl-row small{display:block;color:var(--text-3);font-size:11.5px}.igl-plus{color:#16a34a;font-weight:800;text-align:right}',
    '.igl-empty{padding:26px;text-align:center;color:var(--text-3);font-size:13px}',
    '@media(max-width:720px){.igf-presets{grid-template-columns:repeat(3,1fr)}.igl-row,.igl-row--g{grid-template-columns:1fr auto}.igl-row>span:nth-child(2),.igl-row>span:nth-child(4):not(.igl-plus){display:none}.igl-row--g>span:nth-child(1),.igl-row--g>span:nth-child(3){display:none}.igl-row--g>span:nth-child(4){display:block}.igl-row--h{display:none}}'
  ].join('\n');
  document.head.appendChild(css);
})();
