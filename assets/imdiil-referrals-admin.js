// IMDIIL · Admin · Referidos ("Invita a un colega")
(function () {
  'use strict';
  var pages = window.Pages;
  if (!pages) return;

  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('es-MX'); };

  async function adminToken() {
    var user = window._fb && window._fb.auth && window._fb.auth.currentUser;
    if (!user) {
      await new Promise(function (resolve) { window.addEventListener('adminready', resolve, { once: true }); setTimeout(resolve, 8000); });
      user = window._fb && window._fb.auth && window._fb.auth.currentUser;
    }
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  }

  pages.referidos = async function (p) {
    var page = p || document.getElementById('page');
    var hero = '<div class="sec-hero"><span class="sec-hero__eyebrow">Crecimiento</span><h1 class="sec-hero__title">Referidos</h1><p class="sec-hero__sub">Miembros que invitan colegas: registros, conversiones a VIP y créditos otorgados por el programa.</p></div>';
    page.innerHTML = '<div class="fade-up">' + hero + '<div class="empty">Cargando referidos…</div></div>';
    try {
      var res = await fetch(String(pages._webhookUrl || '').replace(/\/$/, '') + '/referrals/admin', { headers: { Authorization: 'Bearer ' + await adminToken() }, cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || data.ok === false) throw new Error(data.error || 'HTTP ' + res.status);
      if (page.dataset.live && page.dataset.live !== 'referidos') return;
      var t = data.totals || {}, r = data.rewards || {}, rows = data.rows || [];
      page.innerHTML = '<div class="fade-up">' + hero +
        '<div class="kpi-grid">' +
          '<div class="kpi-card" style="--c1:var(--primary)"><div class="kpi-card__label">Miembros que invitan</div><div class="kpi-card__value">' + fmt(t.activeReferrers) + '</div><div class="kpi-card__sub">' + fmt(t.participants) + ' con código generado</div></div>' +
          '<div class="kpi-card" style="--c1:var(--info)"><div class="kpi-card__label">Registros referidos</div><div class="kpi-card__value">' + fmt(t.registrations) + '</div></div>' +
          '<div class="kpi-card" style="--c1:var(--success)"><div class="kpi-card__label">Nuevos VIP</div><div class="kpi-card__value">' + fmt(t.vipConversions) + '</div></div>' +
          '<div class="kpi-card" style="--c1:var(--warning)"><div class="kpi-card__label">Créditos otorgados</div><div class="kpi-card__value">' + fmt(t.creditsEarned) + '</div><div class="kpi-card__sub">a quienes invitan</div></div>' +
        '</div>' +
        '<p style="margin:14px 0 0;color:var(--text-3);font-size:12px">Recompensas vigentes: quien invita gana ' + fmt(r.registrationReferrer) + ' por registro y ' + fmt(r.vipReferrer) + ' por VIP; el invitado recibe ' + fmt(r.registrationReferred) + ' y ' + fmt(r.vipReferred) + '. Se ajustan con variables de Railway.</p>' +
        '<div style="margin-top:18px;border:1px solid var(--border);border-radius:16px;overflow:auto;background:var(--surface)"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:var(--text-3);font-size:11px;text-transform:uppercase;letter-spacing:.6px"><th style="padding:12px 14px">Miembro</th><th style="padding:12px 14px">Código</th><th style="padding:12px 14px">Registros</th><th style="padding:12px 14px">VIP</th><th style="padding:12px 14px">Créditos</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (x) { return '<tr style="border-top:1px solid var(--border)"><td style="padding:11px 14px"><b>' + esc(x.name || 'Miembro') + '</b><br><span style="color:var(--text-3);font-size:11px">' + esc(x.email) + '</span></td><td style="padding:11px 14px"><code>' + esc(x.code) + '</code></td><td style="padding:11px 14px">' + fmt(x.registrations) + '</td><td style="padding:11px 14px">' + fmt(x.vipConversions) + '</td><td style="padding:11px 14px">' + fmt(x.creditsEarned) + '</td></tr>'; }).join('')
          : '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-3)">Aún no hay invitaciones registradas.</td></tr>') +
        '</tbody></table></div></div>';
    } catch (e) {
      page.innerHTML = '<div class="fade-up">' + hero + '<div class="empty"><b>No pudimos cargar los referidos</b><br>' + esc(e.message) + '</div></div>';
    }
  };
}());
