// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Invita a un colega (programa de referidos con servidor)
//
//  · Landing / vip-auth: captura ?ref=IMD-XXXXXXXXXX y lo guarda.
//  · Panel: registra el código al entrar (POST /referrals/claim, una vez)
//    y agrega la sección "Invita a un colega" (GET /referrals/me).
//  Los créditos ganados se avisan con el cofre de monedas del panel.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var KEY = 'imdiil_referral_incoming';
  var CODE = /^IMD-[A-F0-9]{10}$/;
  var store = {
    get: function () { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && CODE.test(v.code) ? v : null; } catch (e) { return null; } },
    set: function (code) { try { localStorage.setItem(KEY, JSON.stringify({ code: code, at: Date.now() })); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  // 1) Captura del enlace de invitación (cualquier página que cargue este archivo).
  var incoming = '';
  try { incoming = String(new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase(); } catch (e) {}
  if (CODE.test(incoming)) store.set(incoming);

  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('es-MX'); };
  var API = function () { return String(window.WEBHOOK_URL || '').replace(/\/$/, ''); };

  // 2) vip-auth.html: aviso de invitación en el registro.
  function showInviteNote() {
    var pane = document.getElementById('pane-register');
    if (!pane || !store.get() || pane.querySelector('.imd-ref-note')) return;
    var note = document.createElement('div');
    note.className = 'imd-ref-note';
    note.textContent = '✓ Invitación de un colega aplicada. Al crear tu cuenta recibirás créditos de regalo.';
    var head = pane.querySelector('.pane-head');
    if (head && head.nextSibling) pane.insertBefore(note, head.nextSibling); else pane.insertBefore(note, pane.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showInviteNote); else showInviteNote();

  // A partir de aquí solo aplica dentro del panel VIP.
  if (!document.getElementById('dynamic-section') && !document.querySelector('[data-section="referidos"]')) return;

  async function token() {
    var user = window.__auth && window.__auth.currentUser;
    for (var i = 0; !user && i < 50; i += 1) {
      await new Promise(function (r) { setTimeout(r, 200); });
      user = window.__auth && window.__auth.currentUser;
    }
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

  // 3) Registro del código (una sola vez por cuenta; el servidor valida todo).
  var claiming = false;
  async function claimPending() {
    var pending = store.get();
    if (!pending || claiming || window.__isDemoMode) return;
    claiming = true;
    try {
      var data = await request('/referrals/claim', { method: 'POST', body: JSON.stringify({ code: pending.code }) });
      store.clear(); // aplicado o rechazado por regla (propio, cuenta antigua…): no se reintenta
      if (data.applied) {
        window.Toast && Toast.success && Toast.success('Invitación aplicada', 'Recibiste ' + fmt(data.credits) + ' créditos de regalo.');
        setTimeout(function () { window.__checkCreditNotices && window.__checkCreditNotices(true); }, 2500);
      }
    } catch (e) {
      console.warn('[referidos] Invitación pendiente:', e.message); // se reintenta en la próxima entrada
    } finally { claiming = false; }
  }
  setTimeout(claimPending, 1500);

  // 4) Sección "Invita a un colega".
  function shareText(link) {
    return 'Te invito a IMDIIL VIP: cursos de ingeniería industrial con certificado, herramientas y comunidad. Regístrate con mi enlace y recibe créditos de regalo: ' + link;
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { window.Toast && Toast.success('Enlace copiado', 'Ya puedes compartirlo.'); }, function () { window.prompt('Copia tu enlace:', text); });
    } else window.prompt('Copia tu enlace:', text);
  }

  function render(container) {
    if (window.__isDemoMode) {
      container.innerHTML = '<div class="fade-up imd-ref"><div class="imd-ref__loading">Crea tu cuenta gratis para obtener tu enlace de invitación y ganar créditos por cada colega.</div></div>';
      return;
    }
    container.innerHTML = '<div class="fade-up imd-ref"><div class="imd-ref__loading"><i></i>Cargando tus invitaciones…</div></div>';
    request('/referrals/me').then(function (data) {
      if (!container.isConnected) return;
      var r = data.rewards || {};
      var recent = Array.isArray(data.recent) ? data.recent : [];
      container.innerHTML = '' +
        '<div class="fade-up imd-ref">' +
          '<section class="imd-ref__hero">' +
            '<div class="imd-ref__copy"><span class="imd-ref__kicker">Programa de referidos</span><h1>Invita a un colega y gana créditos.</h1>' +
            '<p>Comparte tu enlace. Ganas <b>' + fmt(r.registrationReferrer) + ' créditos</b> cuando tu colega se registra y <b>' + fmt(r.vipReferrer) + ' más</b> cuando activa su membresía VIP. Tu colega también recibe ' + fmt(r.registrationReferred) + ' al registrarse y ' + fmt(r.vipReferred) + ' al volverse VIP.</p></div>' +
            '<div class="imd-ref__wallet"><span>Créditos ganados</span><strong><i class="imd-ref__coin">C</i>' + fmt(data.creditsEarned) + '</strong><small>por invitaciones</small></div>' +
          '</section>' +
          '<section class="imd-ref__card">' +
            '<div class="imd-ref__link"><span>Tu enlace personal</span><code>' + esc(data.link) + '</code><small>Código: <b>' + esc(data.code) + '</b></small></div>' +
            '<div class="imd-ref__actions"><button class="btn btn--ghost" type="button" data-ref-copy><svg class="ic"><use href="#i-link"/></svg>Copiar enlace</button><button class="btn btn--wa" type="button" data-ref-wa><svg class="ic"><use href="#i-whatsapp"/></svg>Compartir por WhatsApp</button></div>' +
          '</section>' +
          '<div class="imd-ref__stats">' +
            '<div><b>' + fmt(data.registrations) + '</b><span>colegas registrados</span></div>' +
            '<div><b>' + fmt(data.vipConversions) + '</b><span>se hicieron VIP</span></div>' +
            '<div><b>' + fmt(data.creditsEarned) + '</b><span>créditos ganados</span></div>' +
          '</div>' +
          '<section class="imd-ref__steps"><h2>Cómo funciona</h2><ol>' +
            '<li><span>1</span><div><strong>Comparte tu enlace</strong><p>Envíalo por WhatsApp, correo o redes a colegas del sector.</p></div></li>' +
            '<li><span>2</span><div><strong>Tu colega crea su cuenta</strong><p>Al registrarse con tu enlace, ambos reciben créditos.</p></div></li>' +
            '<li><span>3</span><div><strong>Activa su VIP</strong><p>Cuando paga su primera membresía, ganas el bono mayor.</p></div></li>' +
          '</ol></section>' +
          '<section class="imd-ref__recent"><h2>Tus invitaciones</h2>' + (recent.length
            ? '<ul>' + recent.map(function (item) { return '<li><span class="imd-ref__avatar">' + esc(String(item.email || '?').slice(0, 2).toUpperCase()) + '</span><div><strong>' + esc(item.email) + '</strong><small>' + (item.registeredAt ? new Date(item.registeredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + '</small></div><em class="' + (item.vip ? 'is-vip' : '') + '">' + (item.vip ? 'VIP' : 'Registrado') + '</em></li>'; }).join('') + '</ul>'
            : '<div class="imd-ref__empty">Aún no tienes invitaciones. Comparte tu enlace para empezar a ganar créditos.</div>') +
          '</section>' +
        '</div>';
      container.querySelector('[data-ref-copy]').addEventListener('click', function () { copy(data.link); });
      container.querySelector('[data-ref-wa]').addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(shareText(data.link)), '_blank', 'noopener'); });
    }).catch(function (e) {
      if (!container.isConnected) return;
      container.innerHTML = '<div class="fade-up imd-ref"><div class="imd-ref__empty">No pudimos cargar tus invitaciones. ' + esc(e.message) + '</div></div>';
    });
  }

  function install() {
    if (!window.Sections || !window.Sections.renderers) return false;
    window.Sections.renderers.referidos = render;
    // El código local anterior queda reemplazado por el del servidor.
    window.openReferralModal = function () { if (window.navigateToSection) window.navigateToSection('referidos'); };
    if (String(location.hash || '').replace('#', '') === 'referidos') {
      var target = document.getElementById('dynamic-section');
      if (target && !target.querySelector('.imd-ref')) window.navigateToSection && window.navigateToSection('referidos', { reemplazar: true });
    }
    return true;
  }
  if (!install()) document.addEventListener('DOMContentLoaded', install);
}());
