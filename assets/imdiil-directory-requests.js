// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Directorio VIP · solicitudes de contacto entre miembros
//   Botón "Solicitar contacto" en cada tarjeta, bandeja de solicitudes
//   recibidas/enviadas y contacto compartido al aceptar (servidor).
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!document.getElementById('dynamic-section')) return;

  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var API = function () { return String(window.WEBHOOK_URL || '').replace(/\/$/, ''); };
  var toast = function (kind, a, b) { try { window.Toast && Toast[kind] && Toast[kind](a, b); } catch (e) {} };
  var state = { incoming: [], outgoing: [], pendingIncoming: 0, loaded: false, loading: null };

  async function token() {
    var user = window.__auth && window.__auth.currentUser;
    for (var i = 0; !user && i < 50; i += 1) { await new Promise(function (r) { setTimeout(r, 200); }); user = window.__auth && window.__auth.currentUser; }
    if (!user) throw new Error('Inicia sesión para continuar.');
    return user.getIdToken();
  }
  async function request(path, options) {
    var opts = options || {};
    var headers = Object.assign({ Authorization: 'Bearer ' + await token() }, opts.headers || {});
    if (opts.body) headers['Content-Type'] = 'application/json';
    var res = await fetch(API() + path, Object.assign({ cache: 'no-store' }, opts, { headers: headers }));
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.ok === false) throw new Error(data.error || 'No pudimos completar la operación.');
    return data;
  }

  function load(force) {
    if (window.__isDemoMode) return Promise.resolve(state);
    if (state.loading && !force) return state.loading;
    state.loading = request('/directory/requests').then(function (data) {
      state.incoming = data.incoming || []; state.outgoing = data.outgoing || [];
      state.pendingIncoming = Number(data.pendingIncoming || 0); state.loaded = true;
      paintNavBadge(); paintBar(); decorateCards();
      return state;
    }).catch(function (e) { console.warn('[directorio] Solicitudes no disponibles:', e.message); return state; })
      .finally(function () { state.loading = null; });
    return state.loading;
  }

  function outgoingTo(uid) { return state.outgoing.find(function (r) { return r.to && r.to.uid === uid; }); }

  function paintNavBadge() {
    document.querySelectorAll('[data-section="directorio"]').forEach(function (el) {
      var b = el.querySelector('.dir-req-navbadge');
      if (!state.pendingIncoming) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'nav-item__badge dir-req-navbadge'; el.appendChild(b); }
      b.textContent = state.pendingIncoming;
    });
  }

  function paintBar() {
    var grid = document.getElementById('dir-grid');
    if (!grid) return;
    var bar = document.getElementById('dir-req-bar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'dir-req-bar'; bar.className = 'dir-req-bar';
      grid.parentNode.insertBefore(bar, grid);
    }
    var accepted = state.outgoing.filter(function (r) { return r.status === 'accepted'; }).length;
    bar.innerHTML = '<div class="dir-req-bar__tx"><span class="dir-req-bar__ic"><svg class="ic"><use href="#i-users"/></svg></span><div><strong>Solicitudes de contacto' + (state.pendingIncoming ? '<span class="dir-req-bar__badge">' + state.pendingIncoming + '</span>' : '') + '</strong><small>' +
      (state.pendingIncoming ? state.pendingIncoming + ' por responder' : 'Pide el contacto de otros miembros y responde a quienes te escriben') +
      (accepted ? ' · ' + accepted + ' contacto' + (accepted === 1 ? '' : 's') + ' compartido' + (accepted === 1 ? '' : 's') + ' contigo' : '') + '</small></div></div>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-req-open>Ver solicitudes</button>';
    bar.querySelector('[data-req-open]').addEventListener('click', function () { openInbox(state.pendingIncoming ? 'incoming' : 'outgoing'); });
  }

  function decorateCards() {
    var me = window.UserState && window.UserState.uid;
    document.querySelectorAll('#dir-grid [data-dircard]').forEach(function (card) {
      var uid = card.dataset.dircard;
      if (!uid || uid === me) return;
      var body = card.querySelector('.dir-card__body-m') || card;
      var holder = card.querySelector('.dir-card__ctas');
      if (!holder) {
        holder = document.createElement('div'); holder.className = 'dir-card__ctas';
        var empty = card.querySelector('.dir-card__sincontacto');
        if (empty) empty.replaceWith(holder); else body.appendChild(holder);
      }
      var btn = holder.querySelector('.dir-cta--req');
      if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dir-cta dir-cta--req'; holder.appendChild(btn); }
      var req = outgoingTo(uid);
      btn.classList.remove('is-sent', 'is-ok');
      if (req && req.status === 'accepted') { btn.classList.add('is-ok'); btn.innerHTML = '<svg class="ic"><use href="#i-check"/></svg>Contacto compartido'; }
      else if (req && req.status === 'pending') { btn.classList.add('is-sent'); btn.innerHTML = '<svg class="ic"><use href="#i-clock"/></svg>Solicitud enviada'; }
      else btn.innerHTML = '<svg class="ic"><use href="#i-messages"/></svg>Solicitar contacto';
      btn.onclick = function (e) {
        e.stopPropagation();
        var current = outgoingTo(uid);
        if (current && current.status !== 'declined') openInbox('outgoing');
        else openRequestForm(uid, (card.querySelector('.dir-card__name') || {}).textContent || 'este miembro');
      };
    });
  }

  function openRequestForm(uid, name) {
    if (typeof Modal === 'undefined') return;
    var m = Modal.open({
      id: 'dir-req-form', title: 'Solicitar contacto', subtitle: 'A ' + esc(name), icon: 'i-messages', size: 'sm',
      body: '<div class="dir-req-form"><label for="dir-req-msg" style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;color:var(--text-2)">Mensaje (opcional)</label><textarea id="dir-req-msg" maxlength="280" placeholder="Hola, me gustaría conectar contigo para…"></textarea><small>Si acepta, verás sus datos de contacto aquí en el directorio.</small></div>',
      footer: '<button class="btn btn--ghost" type="button" data-cancel>Cancelar</button><button class="btn btn--accent" type="button" data-send>Enviar solicitud</button>'
    });
    var root = document.querySelector('[data-modal-id="dir-req-form"]');
    root.querySelector('[data-cancel]').addEventListener('click', function () { m.close(); });
    root.querySelector('[data-send]').addEventListener('click', async function (e) {
      var b = e.currentTarget; b.disabled = true; b.textContent = 'Enviando…';
      try {
        await request('/directory/requests', { method: 'POST', body: JSON.stringify({ toUid: uid, message: root.querySelector('#dir-req-msg').value }) });
        m.close(); toast('success', 'Solicitud enviada', 'Te avisaremos aquí cuando responda.');
        load(true);
      } catch (err) { b.disabled = false; b.textContent = 'Enviar solicitud'; toast('error', 'No se pudo enviar', err.message); }
    });
  }

  function avatar(p) {
    var ini = String(p.nombre || '?').trim().slice(0, 2).toUpperCase();
    return '<span class="dir-req-item__av">' + (p.foto ? '<img src="' + esc(p.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(ini)) + '</span>';
  }
  function contactHtml(c) {
    if (!c) return '';
    var parts = [];
    var wa = String(c.whatsapp || '').replace(/[^0-9]/g, '');
    if (wa) parts.push('<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-whatsapp"/></svg>' + esc(c.whatsapp) + '</a>');
    if (c.email) parts.push('<a href="mailto:' + esc(c.email) + '"><svg class="ic"><use href="#i-mail"/></svg>' + esc(c.email) + '</a>');
    if (c.linkedin) parts.push('<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-linkedin"/></svg>LinkedIn</a>');
    if (c.web) parts.push('<a href="' + esc(c.web) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-link"/></svg>Sitio web</a>');
    return '<div class="dir-req-contact">' + (parts.join('') || '<span>Aceptó, pero aún no agrega datos de contacto en su tarjeta.</span>') + '</div>';
  }
  var dateTx = function (v) { return v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''; };

  function inboxHtml(tab) {
    var list = tab === 'incoming' ? state.incoming : state.outgoing;
    var items = list.map(function (r) {
      var p = tab === 'incoming' ? r.from : r.to;
      var stateTx = r.status === 'accepted' ? (tab === 'incoming' ? 'Compartiste tu contacto' : 'Aceptó · contacto compartido') : r.status === 'declined' ? 'No aceptada' : (tab === 'incoming' ? 'Por responder' : 'Esperando respuesta');
      return '<div class="dir-req-item">' + avatar(p) + '<div class="dir-req-item__body"><strong>' + esc(p.nombre) + '</strong><small>' + esc([p.puesto, p.empresa].filter(Boolean).join(' · ') || 'Miembro IMDIIL') + ' · ' + dateTx(r.createdAt) + '</small>' +
        (r.message ? '<p>' + esc(r.message) + '</p>' : '') +
        (tab === 'incoming' && r.status === 'pending'
          ? '<div class="dir-req-item__actions"><button class="btn btn--accent btn--sm" type="button" data-accept="' + esc(r.id) + '">Aceptar y compartir mi contacto</button><button class="btn btn--ghost btn--sm" type="button" data-decline="' + esc(r.id) + '">No por ahora</button></div>'
          : '<div class="dir-req-item__actions"><span class="dir-req-item__state ' + (r.status === 'accepted' ? 'is-ok' : '') + '">' + stateTx + '</span></div>') +
        (tab === 'outgoing' && r.status === 'accepted' ? contactHtml(r.contact) : '') +
        '</div></div>';
    }).join('');
    return '<div class="dir-req-tabs"><button type="button" data-tab="incoming" class="' + (tab === 'incoming' ? 'is-active' : '') + '">Recibidas' + (state.pendingIncoming ? ' (' + state.pendingIncoming + ')' : '') + '</button><button type="button" data-tab="outgoing" class="' + (tab === 'outgoing' ? 'is-active' : '') + '">Enviadas</button></div>' +
      '<div class="dir-req-list">' + (items || '<div class="foro-empty" style="padding:20px">' + (tab === 'incoming' ? 'Nadie te ha solicitado contacto todavía.' : 'Aún no envías solicitudes. Toca "Solicitar contacto" en una tarjeta.') + '</div>') + '</div>';
  }

  function openInbox(tab) {
    if (typeof Modal === 'undefined') return;
    Modal.open({ id: 'dir-req-inbox', title: 'Solicitudes de contacto', subtitle: 'Directorio VIP', icon: 'i-users', body: '<div id="dir-req-inbox-body"></div>' });
    var paint = function (t) {
      var host = document.getElementById('dir-req-inbox-body'); if (!host) return;
      host.innerHTML = inboxHtml(t);
      host.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { paint(b.dataset.tab); }); });
      host.querySelectorAll('[data-accept],[data-decline]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.dataset.accept || b.dataset.decline; b.disabled = true;
          try {
            await request('/directory/requests/' + encodeURIComponent(id) + '/respond', { method: 'POST', body: JSON.stringify({ accept: !!b.dataset.accept }) });
            toast('success', b.dataset.accept ? 'Contacto compartido' : 'Solicitud respondida', b.dataset.accept ? 'Ya puede ver tus datos de contacto.' : '');
            await load(true); paint('incoming');
          } catch (err) { b.disabled = false; toast('error', 'No se pudo responder', err.message); }
        });
      });
    };
    paint(tab || 'incoming');
    load(true).then(function () { if (document.getElementById('dir-req-inbox-body')) paint(tab || 'incoming'); });
  }

  var observer = null;
  function watchGrid() {
    var grid = document.getElementById('dir-grid');
    if (!grid) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function () { observer.disconnect(); decorateCards(); observer.observe(grid, { childList: true }); });
    observer.observe(grid, { childList: true });
    paintBar(); decorateCards(); load();
  }

  function install() {
    if (!window.Sections || !window.Sections.renderers || !window.Sections.renderers.directorio) return false;
    var original = window.Sections.renderers.directorio;
    if (original.__dirRequests) return true;
    var wrapped = function (container) { var out = original(container); setTimeout(watchGrid, 0); return out; };
    wrapped.__dirRequests = true;
    window.Sections.renderers.directorio = wrapped;
    window.IMDIILDirectoryRequests = { load: load, openInbox: openInbox };
    // El directorio avisa cada vez que pinta las tarjetas (VIP primero, básicas después).
    window.addEventListener('imdiil:directorio-painted', function () { if (!document.getElementById('dir-grid')) return; paintBar(); decorateCards(); });
    if (String(location.hash || '') === '#directorio') setTimeout(watchGrid, 400);
    // Contador de solicitudes nuevas en el menú.
    setTimeout(function () { if (window.UserState && window.UserState.uid) load(); }, 4000);
    return true;
  }
  if (!install()) document.addEventListener('DOMContentLoaded', install);
}());
