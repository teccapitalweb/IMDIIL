/* IMDIIL · admin de notificaciones push y app instalada (misma lógica que IMFRA/SYNOVA)
   Agrega al menú "Notificaciones push" y "App instalada" (sección Comunicación)
   sin tocar el HTML del menú. Endpoints: /admin/push*, /admin/app-presence. */
(function () {
  'use strict';

  var pages = window.Pages;
  if (!pages) return;

  var esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  };
  var fmtDate = function (ms) { return ms ? new Date(Number(ms)).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
  var toast = function (kind, title, detail) { if (window.Toast && window.Toast[kind]) window.Toast[kind](title, detail || ''); else if (kind === 'error') alert(title + '\n' + (detail || '')); };

  async function token() {
    var user = window._fb && window._fb.auth && window._fb.auth.currentUser;
    for (var i = 0; !user && i < 40; i += 1) {
      await new Promise(function (r) { setTimeout(r, 200); });
      user = window._fb && window._fb.auth && window._fb.auth.currentUser;
    }
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  }
  async function request(path, options) {
    options = options || {};
    var headers = { Authorization: 'Bearer ' + await token() };
    if (options.body) headers['Content-Type'] = 'application/json';
    var response = await fetch(String(pages._webhookUrl || '').replace(/\/$/, '') + path, {
      method: options.method || 'GET', cache: 'no-store', headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + response.status));
    return data;
  }

  function injectStyles() {
    if (document.getElementById('ipa-styles')) return;
    var style = document.createElement('style');
    style.id = 'ipa-styles';
    style.textContent = [
      '.ipa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:22px}',
      '.ipa-card{padding:20px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}',
      '.ipa-card h3{margin:0 0 4px;font:800 15px "Plus Jakarta Sans",sans-serif;color:var(--text)}.ipa-card>p{margin:0 0 14px;color:var(--text-3);font-size:12px;line-height:1.5}',
      '.ipa-form{display:grid;gap:10px}.ipa-form label{display:grid;gap:5px;font-size:11px;font-weight:700;color:var(--text-2)}',
      '.ipa-form input,.ipa-form select,.ipa-form textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-2,var(--border));border-radius:11px;background:var(--surface-2);color:var(--text);font:500 13px Inter,sans-serif}',
      '.ipa-form textarea{min-height:76px;resize:vertical}.ipa-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.ipa-row>*{flex:1}',
      '.ipa-check{display:flex!important;grid-template-columns:none!important;align-items:center;gap:8px!important;font-weight:600!important}.ipa-check input{width:auto}',
      '.ipa-list{display:grid;gap:8px}.ipa-tpl{display:grid;gap:8px;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface-2)}',
      '.ipa-tpl header{display:flex;justify-content:space-between;align-items:center;gap:10px}.ipa-tpl header b{font-size:12.5px;color:var(--text)}',
      '.ipa-pill{display:inline-block;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);font:700 9.5px "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.6px}',
      '.ipa-pill.is-ok{background:color-mix(in srgb,#16a34a 14%,transparent);color:#16a34a}.ipa-pill.is-bad{background:color-mix(in srgb,#ef4444 14%,transparent);color:#ef4444}',
      '.ipa-table{width:100%;border-collapse:collapse;font-size:12px}.ipa-table th,.ipa-table td{padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;color:var(--text-2)}.ipa-table th{font:700 10px "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.6px;color:var(--text-3)}.ipa-table td strong{color:var(--text)}',
      '.ipa-scroll{overflow-x:auto}.ipa-warn{margin-bottom:18px;padding:14px 16px;border-radius:14px;border:1px solid color-mix(in srgb,#f59e0b 40%,transparent);background:color-mix(in srgb,#f59e0b 10%,var(--surface));color:var(--text-2);font-size:12.5px;line-height:1.55}.ipa-warn code{font-size:11.5px}',
      '@media(max-width:900px){.ipa-grid{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function hero(eyebrow, title, sub) {
    return '<div class="sec-hero"><span class="sec-hero__eyebrow">' + esc(eyebrow) + '</span><h1 class="sec-hero__title">' + esc(title) + '</h1><p class="sec-hero__sub">' + esc(sub) + '</p></div>';
  }
  function kpi(label, value, sub) {
    return '<div class="kpi-card"><div class="kpi-card__label">' + esc(label) + '</div><div class="kpi-card__value">' + esc(value) + '</div>' + (sub ? '<div class="kpi-card__sub">' + esc(sub) + '</div>' : '') + '</div>';
  }
  var STATUS = { sent: 'Entregada', failed: 'Fallida', 'expired-device': 'Dispositivo vencido', scheduled: 'Programado', completed: 'Enviado', sending: 'Enviando' };
  var statusLabel = function (value) { return STATUS[value] || value || '—'; };
  var stillHere = function (section) { var p = document.getElementById('page'); return p && p.dataset.live === section; };

  // ─── Página: Notificaciones push ───
  async function renderPush(page) {
    injectStyles();
    page.innerHTML = hero('Comunicación', 'Notificaciones push', 'Avisos al celular o computadora de los miembros que aceptaron recibirlos.') + '<div class="iv2-empty" style="padding:30px;text-align:center;color:var(--text-3)">Cargando notificaciones…</div>';
    var data;
    try { data = await request('/admin/push'); }
    catch (error) {
      if (!stillHere('push')) return;
      page.innerHTML = hero('Comunicación', 'Notificaciones push', 'Avisos al celular o computadora de los miembros.') + '<div class="ipa-warn">No se pudo cargar: ' + esc(error.message) + '</div>';
      return;
    }
    if (!stillHere('push')) return;
    var c = data.counts || {};
    var templates = data.templates || [];
    var categories = data.categories || {};
    var options = templates.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('');
    page.innerHTML = hero('Comunicación', 'Notificaciones push', 'Avisos al celular o computadora de los miembros que aceptaron recibirlos. Respetan sus categorías y el horario tranquilo (9:00 p. m. a 8:00 a. m.).') +
      (data.configured ? '' : '<div class="ipa-warn"><b>Push sin configurar.</b> Agrega en Railway <code>WEB_PUSH_VAPID_PUBLIC_KEY</code>, <code>WEB_PUSH_VAPID_PRIVATE_KEY</code> y <code>WEB_PUSH_VAPID_SUBJECT</code> (mailto:…). Genéralas con <code>npx web-push generate-vapid-keys</code>.</div>') +
      '<div class="kpi-grid">' + kpi('Miembros suscritos', c.users || 0) + kpi('Dispositivos', c.devices || 0) + kpi('Entregadas', c.sent || 0, 'últimos envíos') + kpi('Fallidas', c.failed || 0) + kpi('Programadas', c.scheduled || 0) + '</div>' +
      '<div class="ipa-grid">' +
        '<section class="ipa-card"><h3>Enviar ahora</h3><p>Usa una plantilla aprobada. Déjalo sin UID para enviarla a todos los suscritos.</p><form class="ipa-form" data-ipa-send>' +
          '<label>Plantilla<select name="templateId">' + options + '</select></label>' +
          '<label>Título (opcional, reemplaza el de la plantilla)<input name="title" maxlength="90"></label>' +
          '<label>Mensaje (opcional)<textarea name="body" maxlength="180"></textarea></label>' +
          '<div class="ipa-row"><label>URL destino<input name="url" placeholder="/vip-panel.html#cursos"></label><label>UID (opcional)<input name="uid" placeholder="Todos"></label></div>' +
          '<label class="ipa-check"><input type="checkbox" name="respectQuietHours" checked> Respetar horario tranquilo</label>' +
          '<button class="btn btn--accent" type="submit">Enviar notificación</button></form></section>' +
        '<section class="ipa-card"><h3>Programar aviso</h3><p>Aviso administrativo para una fecha y hora. Se procesa cada 10 minutos.</p><form class="ipa-form" data-ipa-schedule>' +
          '<label>Título<input name="title" maxlength="90" required></label>' +
          '<label>Mensaje<textarea name="body" maxlength="180" required></textarea></label>' +
          '<div class="ipa-row"><label>Fecha y hora<input name="when" type="datetime-local" required></label><label>UID (opcional)<input name="uid" placeholder="Todos"></label></div>' +
          '<label>URL destino<input name="url" placeholder="/vip-panel.html#inicio"></label>' +
          '<div class="ipa-row"><button class="btn btn--accent" type="submit">Programar</button><button class="btn btn--ghost" type="button" data-ipa-run>Procesar cola ahora</button></div></form></section>' +
      '</div>' +
      '<section class="ipa-card" style="margin-bottom:22px"><h3>Plantillas</h3><p>Ajusta los textos sin cambiar cuándo se envían. Usa {{curso}}, {{creditos}} o {{saldo}} donde aplique.</p><div class="ipa-list">' +
        templates.map(function (t) {
          return '<form class="ipa-tpl ipa-form" data-ipa-tpl="' + esc(t.id) + '"><header><b>' + esc(t.id) + '</b><span class="ipa-pill">' + esc(categories[t.category] || t.category) + '</span></header>' +
            '<div class="ipa-row"><label>Título<input name="title" maxlength="90" value="' + esc(t.title) + '"></label><label>Botón<input name="action" maxlength="32" value="' + esc(t.action) + '"></label></div>' +
            '<label>Mensaje<textarea name="body" maxlength="180">' + esc(t.body) + '</textarea></label>' +
            '<div class="ipa-row"><label>URL<input name="url" value="' + esc(t.url) + '"></label><button class="btn btn--ghost" type="submit" style="flex:0 0 auto;align-self:end">Guardar</button></div></form>';
        }).join('') + '</div></section>' +
      '<div class="ipa-grid">' +
        '<section class="ipa-card"><h3>Últimos envíos</h3><div class="ipa-scroll"><table class="ipa-table"><thead><tr><th>Fecha</th><th>Aviso</th><th>Estado</th></tr></thead><tbody>' +
          ((data.latest || []).map(function (d) {
            var ok = d.status === 'sent';
            return '<tr><td>' + esc(fmtDate(d.sentAtMs)) + '</td><td><strong>' + esc(d.title || d.templateId) + '</strong><br><small>' + esc(d.uid) + '</small></td><td><span class="ipa-pill ' + (ok ? 'is-ok' : 'is-bad') + '">' + esc(statusLabel(d.status)) + '</span></td></tr>';
          }).join('') || '<tr><td colspan="3">Todavía no hay envíos.</td></tr>') + '</tbody></table></div></section>' +
        '<section class="ipa-card"><h3>Avisos programados</h3><div class="ipa-scroll"><table class="ipa-table"><thead><tr><th>Envío</th><th>Aviso</th><th>Estado</th></tr></thead><tbody>' +
          ((data.campaigns || []).map(function (d) {
            return '<tr><td>' + esc(fmtDate(d.sendAtMs)) + '</td><td><strong>' + esc(d.title) + '</strong><br><small>' + esc(d.body) + '</small></td><td><span class="ipa-pill ' + (d.status === 'completed' ? 'is-ok' : d.status === 'failed' ? 'is-bad' : '') + '">' + esc(statusLabel(d.status)) + '</span></td></tr>';
          }).join('') || '<tr><td colspan="3">Sin avisos programados.</td></tr>') + '</tbody></table></div></section>' +
      '</div>';

    var busy = function (form, on, label) { var b = form.querySelector('[type="submit"]'); if (!b) return; b.disabled = on; if (label) b.textContent = label; };
    page.querySelector('[data-ipa-send]').addEventListener('submit', async function (event) {
      event.preventDefault();
      var f = event.currentTarget, fd = new FormData(f);
      if (!confirm(fd.get('uid') ? '¿Enviar esta notificación a ese miembro?' : '¿Enviar esta notificación a todos los miembros suscritos?')) return;
      busy(f, true, 'Enviando…');
      try {
        var r = await request('/admin/push/send', { method: 'POST', body: {
          templateId: fd.get('templateId'), title: fd.get('title') || undefined, body: fd.get('body') || undefined,
          url: fd.get('url') || undefined, uid: fd.get('uid') || '', respectQuietHours: !!fd.get('respectQuietHours')
        } });
        toast('success', 'Notificación procesada', (r.sent || 0) + ' entregadas · ' + (r.queued || 0) + ' en horario tranquilo · ' + (r.failed || 0) + ' fallidas');
        renderPush(page);
      } catch (error) { toast('error', 'No se pudo enviar', error.message); busy(f, false, 'Enviar notificación'); }
    });
    page.querySelector('[data-ipa-schedule]').addEventListener('submit', async function (event) {
      event.preventDefault();
      var f = event.currentTarget, fd = new FormData(f);
      var when = new Date(String(fd.get('when') || '')).getTime();
      if (!when) { toast('error', 'Elige fecha y hora'); return; }
      busy(f, true, 'Programando…');
      try {
        await request('/admin/push/schedule', { method: 'POST', body: { title: fd.get('title'), body: fd.get('body'), url: fd.get('url') || undefined, uid: fd.get('uid') || '', sendAtMs: when } });
        toast('success', 'Aviso programado', fmtDate(when));
        renderPush(page);
      } catch (error) { toast('error', 'No se pudo programar', error.message); busy(f, false, 'Programar'); }
    });
    page.querySelector('[data-ipa-run]').addEventListener('click', async function (event) {
      var b = event.currentTarget; b.disabled = true; b.textContent = 'Procesando…';
      try { await request('/admin/push/run', { method: 'POST' }); toast('success', 'Cola procesada'); renderPush(page); }
      catch (error) { toast('error', 'No se pudo procesar', error.message); b.disabled = false; b.textContent = 'Procesar cola ahora'; }
    });
    page.querySelectorAll('[data-ipa-tpl]').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var fd = new FormData(form);
        busy(form, true, 'Guardando…');
        try {
          await request('/admin/push/templates/' + encodeURIComponent(form.dataset.ipaTpl), { method: 'PATCH', body: { title: fd.get('title'), body: fd.get('body'), action: fd.get('action'), url: fd.get('url') } });
          toast('success', 'Plantilla guardada');
        } catch (error) { toast('error', 'No se pudo guardar', error.message); }
        busy(form, false, 'Guardar');
      });
    });
  }

  // ─── Página: App instalada ───
  var ALERTS = {
    installed_no_push: 'Instalada sin avisos', permission_blocked: 'Avisos bloqueados', inactive_30d: 'Sin abrir 30 días',
    multiple_devices: 'Varios dispositivos', no_evidence: 'Sin datos'
  };
  async function renderPresence(page) {
    injectStyles();
    page.innerHTML = hero('Comunicación', 'App instalada', 'Quién usa IMDIIL como app instalada y quién tiene avisos activos.') + '<div style="padding:30px;text-align:center;color:var(--text-3)">Cargando…</div>';
    var data;
    try { data = await request('/admin/app-presence'); }
    catch (error) {
      if (!stillHere('app-presencia')) return;
      page.innerHTML = hero('Comunicación', 'App instalada', 'Uso de la app instalada.') + '<div class="ipa-warn">No se pudo cargar: ' + esc(error.message) + '</div>';
      return;
    }
    if (!stillHere('app-presencia')) return;
    var c = data.counts || {};
    var rows = data.rows || [];
    page.innerHTML = hero('Comunicación', 'App instalada', 'Señales mínimas que envía el panel: modo de pantalla, permiso de avisos, tipo de equipo y navegador. No se guarda IP ni el user-agent completo.') +
      '<div class="kpi-grid">' + kpi('Miembros', c.members || 0) + kpi('App instalada', c.installed || 0) + kpi('Con avisos', c.pushUsers || 0) + kpi('Instalada sin avisos', c.installedNoPush || 0) + kpi('Activos 7 días', c.active7d || 0) + kpi('Avisos bloqueados', c.permissionDenied || 0) + '</div>' +
      '<section class="ipa-card"><div class="ipa-row" style="margin-bottom:12px"><input type="search" placeholder="Buscar por nombre o correo" data-ipa-search style="padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text)"><select data-ipa-filter style="padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text)"><option value="">Todos</option><option value="installed">App instalada</option><option value="push">Con avisos</option><option value="installed_no_push">Instalada sin avisos</option></select></div>' +
      '<div class="ipa-scroll"><table class="ipa-table"><thead><tr><th>Miembro</th><th>App</th><th>Avisos</th><th>Equipo</th><th>Última vez</th><th>Alertas</th></tr></thead><tbody data-ipa-rows></tbody></table></div></section>';
    var body = page.querySelector('[data-ipa-rows]');
    var draw = function () {
      var q = String(page.querySelector('[data-ipa-search]').value || '').toLowerCase();
      var f = page.querySelector('[data-ipa-filter]').value;
      var list = rows.filter(function (r) {
        if (q && (r.name + ' ' + r.email).toLowerCase().indexOf(q) < 0) return false;
        if (f === 'installed' && !r.installed) return false;
        if (f === 'push' && !r.pushActive) return false;
        if (f === 'installed_no_push' && !(r.installed && !r.pushActive)) return false;
        return true;
      }).slice(0, 400);
      body.innerHTML = list.map(function (r) {
        return '<tr><td><strong>' + esc(r.name) + '</strong><br><small>' + esc(r.email) + '</small></td>' +
          '<td><span class="ipa-pill ' + (r.installed ? 'is-ok' : '') + '">' + (r.installed ? 'Instalada' : 'Navegador') + '</span></td>' +
          '<td><span class="ipa-pill ' + (r.pushActive ? 'is-ok' : r.notificationPermission === 'denied' ? 'is-bad' : '') + '">' + (r.pushActive ? r.pushDevices + ' disp.' : esc(r.notificationPermission === 'denied' ? 'Bloqueados' : 'No')) + '</span></td>' +
          '<td>' + esc([r.deviceType, r.browser, r.platform].filter(Boolean).join(' · ') || '—') + '</td>' +
          '<td>' + esc(fmtDate(r.lastSeenAtMs)) + '</td>' +
          '<td>' + ((r.alerts || []).map(function (a) { return '<span class="ipa-pill">' + esc(ALERTS[a] || a) + '</span>'; }).join(' ') || '—') + '</td></tr>';
      }).join('') || '<tr><td colspan="6">Sin resultados.</td></tr>';
    };
    page.querySelector('[data-ipa-search]').addEventListener('input', draw);
    page.querySelector('[data-ipa-filter]').addEventListener('change', draw);
    draw();
  }

  pages.push = renderPush;
  pages['app-presencia'] = renderPresence;

  // Menú: agrega las dos entradas debajo de "Notificaciones" (sección Comunicación).
  function addNav() {
    if (document.querySelector('.nav-item[data-section="push"]')) return;
    var anchor = document.querySelector('.nav-item[data-section="notificaciones"]');
    if (!anchor) return;
    var make = function (section, iconId, label) {
      var a = document.createElement('a');
      a.className = 'nav-item';
      a.dataset.section = section;
      a.innerHTML = '<svg class="ic"><use href="#' + iconId + '"/></svg>' + label;
      a.addEventListener('click', function () { if (typeof window.navigate === 'function') window.navigate(section); });
      return a;
    };
    var presence = make('app-presencia', 'i-download', 'App instalada');
    var push = make('push', 'i-bell', 'Notificaciones push');
    anchor.after(push);
    push.after(presence);
    // Si se abrió el admin directo en #push o #app-presencia, entrar a esa pestaña.
    var hash = String(location.hash || '').replace(/^#/, '');
    if ((hash === 'push' || hash === 'app-presencia') && typeof window.navigate === 'function') {
      window.addEventListener('adminready', function () { window.navigate(hash, { reemplazar: true }); }, { once: true });
      setTimeout(function () { var p = document.getElementById('page'); if (p && p.dataset.live !== hash) window.navigate(hash, { reemplazar: true }); }, 1500);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNav); else addNav();
})();
