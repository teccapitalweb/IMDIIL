(function () {
  'use strict';

  var pages = window.Pages;
  var store = window.AdminStore;
  if (!pages || !store) return;

  var esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char];
    });
  };
  var root = function () { return document.getElementById('page'); };
  var active = function (section) { return document.querySelector('.nav-item.is-active')?.dataset.section === section; };
  var timestamp = function (value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  var formatDate = function (value) {
    var parsed = timestamp(value);
    return parsed ? parsed.toLocaleString('es-MX', { dateStyle:'medium', timeStyle:'short' }) : 'Sin fecha';
  };
  var adminToken = async function () {
    var user = window._fb?.auth?.currentUser;
    if (!user) {
      await new Promise(function (resolve) {
        var done = false;
        var finish = function () { if (done) return; done = true; window.removeEventListener('adminready', finish); resolve(); };
        window.addEventListener('adminready', finish, { once:true });
        window.setTimeout(finish, 8000);
      });
      user = window._fb?.auth?.currentUser;
    }
    if (!user) throw new Error('La sesión de administrador no pudo restaurarse. Recarga la página.');
    return user.getIdToken();
  };
  var request = async function (path, options) {
    var token = await adminToken();
    var config = Object.assign({ cache:'no-store' }, options || {});
    config.headers = Object.assign({ Authorization:'Bearer ' + token }, config.headers || {});
    var response = await fetch(pages._webhookUrl + path, config);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  };
  var hero = function (eyebrow, title, description) {
    return '<div class="sec-hero"><span class="sec-hero__eyebrow">' + esc(eyebrow) + '</span><h1 class="sec-hero__title">' + esc(title) + '</h1><p class="sec-hero__sub">' + esc(description) + '</p></div>';
  };
  var empty = function (title, detail, icon) {
    return '<div class="iv2-empty"><svg class="ic"><use href="#' + (icon || 'i-news') + '"/></svg><strong>' + esc(title) + '</strong><span>' + esc(detail || '') + '</span></div>';
  };
  var stars = function (score) {
    var rounded = Math.round(Number(score) || 0);
    return '<div class="iv2-stars" aria-label="' + rounded + ' de 5 estrellas">' + [1,2,3,4,5].map(function (n) { return '<span aria-hidden="true">' + (n <= rounded ? '★' : '☆') + '</span>'; }).join('') + '</div>';
  };
  var liveBadge = function () { return '<span class="iv2-status">Datos en vivo</span>'; };

  function latestEvents() {
    var rows = [];
    store.miembros.forEach(function (item) { rows.push({ type:'Miembro', title:item.nombre || item.displayName || item.email || 'Nueva cuenta', detail:item.email || 'Registro en IMDIIL', date:item.createdAt || item.fechaRegistro || item.registro }); });
    store.cursos.forEach(function (item) { rows.push({ type:'Curso', title:item.titulo || item.nombre || 'Curso actualizado', detail:item.activo === false ? 'Contenido inactivo' : 'Contenido disponible', date:item.updatedAt || item.fecha || item.createdAt }); });
    store.webinars.forEach(function (item) { rows.push({ type:'Clase', title:item.titulo || item.nombre || 'Clase en vivo', detail:'Agenda de clases', date:item.fecha || item.createdAt }); });
    store.notificaciones.forEach(function (item) { rows.push({ type:'Aviso', title:item.titulo || item.title || 'Notificación', detail:item.mensaje || item.body || 'Comunicado', date:item.createdAt || item.fecha }); });
    return rows.filter(function (item) { return timestamp(item.date); }).sort(function (a,b) { return timestamp(b.date) - timestamp(a.date); }).slice(0,24);
  }

  pages.actividad = function (p) {
    var events = latestEvents();
    var stats = store.stats;
    p.innerHTML = '<div class="iv2-shell">' + hero('OPERACIÓN', 'Actividad del panel', 'Cambios recientes de miembros, cursos, clases y comunicación, reunidos en una sola vista.') +
      '<div class="iv2-grid iv2-grid--4"><div class="iv2-stat"><small>Miembros</small><strong>' + stats.miembrosTotal + '</strong><span>' + stats.miembrosActivos + ' activos</span></div><div class="iv2-stat"><small>Cursos</small><strong>' + stats.cursosTotal + '</strong><span>' + stats.cursosActivos + ' disponibles</span></div><div class="iv2-stat"><small>Clases próximas</small><strong>' + stats.webinarsProx + '</strong><span>Programadas en el calendario</span></div><div class="iv2-stat"><small>Comunicados</small><strong>' + stats.notifTotal + '</strong><span>Notificaciones registradas</span></div></div>' +
      '<section class="iv2-panel"><div class="iv2-panel__head"><div><h2>Movimientos recientes</h2><p>Solo se muestran eventos con fecha comprobable.</p></div>' + liveBadge() + '</div><div class="iv2-list">' + (events.length ? events.map(function (item) { return '<article class="iv2-row"><div><h3>' + esc(item.title) + '</h3><p>' + esc(item.detail) + '</p></div><div class="iv2-row__side">' + esc(item.type) + '</div><div class="iv2-row__side">' + esc(formatDate(item.date)) + '</div></article>'; }).join('') : empty('Aún no hay movimientos fechados', 'La actividad aparecerá conforme se registren cambios.', 'i-clock')) + '</div></section></div>';
  };

  var ratingsState = { data:null, filter:'all', query:'', loading:false, error:'' };
  pages.calificaciones = function () { renderRatings(); loadRatings(); };
  async function loadRatings() {
    if (ratingsState.loading) return;
    ratingsState.loading = true; ratingsState.error = ''; renderRatings();
    try { ratingsState.data = await request('/api/course-ratings'); }
    catch (error) { ratingsState.error = error.message; }
    finally { ratingsState.loading = false; renderRatings(); }
  }
  function renderRatings() {
    if (!active('calificaciones')) return;
    var p = root(); if (!p) return;
    var courses = ratingsState.data?.courses || [];
    var query = ratingsState.query.toLowerCase();
    var filtered = courses.filter(function (course) {
      var matches = !query || String(course.courseTitle || '').toLowerCase().includes(query) || (course.reviews || []).some(function (review) { return String(review.review || review.userEmail || '').toLowerCase().includes(query); });
      if (ratingsState.filter === 'low') matches = matches && course.average > 0 && course.average < 3.5;
      if (ratingsState.filter === 'reviews') matches = matches && course.reviewCount > 0;
      return matches;
    });
    var total = courses.reduce(function (sum, course) { return sum + (Number(course.ratingCount) || 0); }, 0);
    var reviewTotal = courses.reduce(function (sum, course) { return sum + (Number(course.reviewCount) || 0); }, 0);
    var weighted = total ? courses.reduce(function (sum, course) { return sum + Number(course.average || 0) * Number(course.ratingCount || 0); }, 0) / total : 0;
    p.innerHTML = '<div class="iv2-shell">' + hero('CALIDAD ACADÉMICA', 'Calificaciones de cursos', 'Consulta qué formación aporta más valor y revisa cada comentario sin exponerlo a otros miembros.') +
      '<div class="iv2-grid iv2-grid--3"><div class="iv2-stat"><small>Promedio global</small><strong>' + (weighted ? weighted.toFixed(1) : '—') + '</strong><span>De 5 estrellas</span></div><div class="iv2-stat"><small>Valoraciones</small><strong>' + total + '</strong><span>Respuestas verificadas</span></div><div class="iv2-stat"><small>Reseñas escritas</small><strong>' + reviewTotal + '</strong><span>Comentarios opcionales</span></div></div>' +
      '<section class="iv2-panel"><div class="iv2-panel__head"><div><h2>Resultados por curso</h2><p>Ordenados por volumen de respuestas.</p></div><button class="btn btn--ghost" type="button" data-ratings-refresh><svg class="ic"><use href="#i-refresh"/></svg>Actualizar</button></div><div class="iv2-panel__body"><div class="iv2-toolbar"><label class="iv2-search"><svg class="ic"><use href="#i-search"/></svg><input type="search" placeholder="Buscar curso o reseña" value="' + esc(ratingsState.query) + '" data-ratings-search></label><button class="iv2-chip" aria-pressed="' + (ratingsState.filter === 'all') + '" data-ratings-filter="all">Todos</button><button class="iv2-chip" aria-pressed="' + (ratingsState.filter === 'reviews') + '" data-ratings-filter="reviews">Con reseñas</button><button class="iv2-chip" aria-pressed="' + (ratingsState.filter === 'low') + '" data-ratings-filter="low">Por mejorar</button></div></div><div class="iv2-list">' +
      (ratingsState.loading ? empty('Cargando calificaciones…', 'Consultando respuestas verificadas.', 'i-refresh') : ratingsState.error ? empty('No se pudieron cargar', ratingsState.error, 'i-mail') : filtered.length ? filtered.map(renderCourseRating).join('') : empty('Sin resultados todavía', courses.length ? 'Cambia los filtros para ampliar la búsqueda.' : 'Las calificaciones aparecerán cuando los miembros respondan.', 'i-star')) + '</div></section></div>';
    p.querySelector('[data-ratings-refresh]')?.addEventListener('click', loadRatings);
    p.querySelector('[data-ratings-search]')?.addEventListener('input', function (event) { ratingsState.query = event.target.value; renderRatings(); });
    p.querySelectorAll('[data-ratings-filter]').forEach(function (button) { button.addEventListener('click', function () { ratingsState.filter = button.dataset.ratingsFilter; renderRatings(); }); });
  }
  function renderCourseRating(course) {
    var reviews = (course.reviews || []).slice(0, 4);
    return '<article class="iv2-row" style="grid-template-columns:minmax(0,1fr) 130px minmax(220px,.9fr);align-items:start"><div><h3>' + esc(course.courseTitle || 'Curso') + '</h3><p>' + course.ratingCount + ' valoraciones · ' + course.reviewCount + ' reseñas</p><div style="margin-top:8px">' + stars(course.average) + '</div></div><div><div class="iv2-score">' + (course.average ? Number(course.average).toFixed(1) : '—') + '</div><p>de 5</p></div><div>' + (reviews.length ? reviews.map(function (review) { return '<div class="iv2-review"><div class="iv2-review__meta"><strong>' + esc(review.userName || review.userEmail || 'Miembro') + '</strong><span>' + esc(formatDate(review.updatedAt)) + '</span></div><div style="margin-top:6px">' + stars(review.rating) + '</div><p>' + esc(review.review) + '</p></div>'; }).join('') : '<p style="color:#958b7c;font-size:10.5px">Sin reseñas escritas.</p>') + '</div></article>';
  }

  var supportState = { conversations:[], selected:'', thread:null, loading:false, error:'', filter:'open' };
  pages.soporte = function () { renderSupport(); loadConversations(); };
  async function loadConversations() {
    supportState.loading = true; supportState.error = ''; renderSupport();
    try { var data = await request('/support/admin/conversations'); supportState.conversations = data.conversations || []; if (supportState.selected && !supportState.conversations.some(function (item) { return item.uid === supportState.selected; })) supportState.selected = ''; }
    catch (error) { supportState.error = error.message; }
    finally { supportState.loading = false; renderSupport(); }
  }
  async function loadThread(uid) {
    supportState.selected = uid; supportState.thread = null; renderSupport();
    try { supportState.thread = await request('/support/admin/conversations/' + encodeURIComponent(uid)); await loadConversations(); supportState.selected = uid; renderSupport(); }
    catch (error) { supportState.error = error.message; renderSupport(); }
  }
  async function sendReply(message) {
    if (!supportState.selected || !message.trim()) return;
    await request('/support/admin/conversations/' + encodeURIComponent(supportState.selected) + '/messages', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ message:message.trim() }) });
    await loadThread(supportState.selected);
  }
  async function setThreadStatus(status) {
    await request('/support/admin/conversations/' + encodeURIComponent(supportState.selected), { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ status:status }) });
    await loadThread(supportState.selected);
  }
  function renderSupport() {
    if (!active('soporte')) return;
    var p = root(); if (!p) return;
    var visible = supportState.conversations.filter(function (item) { return supportState.filter === 'all' || item.status === supportState.filter; });
    var unread = supportState.conversations.reduce(function (sum,item) { return sum + Number(item.unreadAdmin || 0); }, 0);
    var detail = supportState.thread;
    p.innerHTML = '<div class="iv2-shell">' + hero('ATENCIÓN A MIEMBROS', 'Buzón privado', 'Conversaciones uno a uno sobre membresías, cobros, cuentas y cursos. Solo el miembro correspondiente y la administración pueden leerlas.') +
      '<div class="iv2-grid iv2-grid--3"><div class="iv2-stat"><small>Pendientes</small><strong>' + supportState.conversations.filter(function (x) { return x.status === 'open'; }).length + '</strong><span>Conversaciones abiertas</span></div><div class="iv2-stat"><small>Sin leer</small><strong>' + unread + '</strong><span>Mensajes nuevos</span></div><div class="iv2-stat"><small>Resueltas</small><strong>' + supportState.conversations.filter(function (x) { return x.status === 'closed'; }).length + '</strong><span>Historial conservado</span></div></div>' +
      '<section class="iv2-panel"><div class="iv2-support"><aside class="iv2-inbox"><div class="iv2-inbox__head"><div class="iv2-toolbar"><button class="iv2-chip" aria-pressed="' + (supportState.filter === 'open') + '" data-support-filter="open">Pendientes</button><button class="iv2-chip" aria-pressed="' + (supportState.filter === 'all') + '" data-support-filter="all">Todas</button><button class="iv2-chip" aria-pressed="' + (supportState.filter === 'closed') + '" data-support-filter="closed">Resueltas</button></div></div><div class="iv2-conversations">' +
      (supportState.loading ? empty('Actualizando…', '', 'i-refresh') : supportState.error ? empty('No se pudo abrir el buzón', supportState.error, 'i-mail') : visible.length ? visible.map(function (item) { return '<button class="iv2-thread-item ' + (item.uid === supportState.selected ? 'is-active' : '') + '" type="button" data-support-uid="' + esc(item.uid) + '">' + (item.unreadAdmin ? '<em>' + item.unreadAdmin + '</em>' : '') + '<strong>' + esc(item.userName || item.userEmail) + '</strong><small>' + esc(item.userEmail) + '</small><span>' + esc(item.lastMessage || 'Sin vista previa') + '</span></button>'; }).join('') : empty('Bandeja al día', 'Los mensajes nuevos aparecerán aquí.', 'i-mail')) + '</div></aside>' +
      '<div class="iv2-thread">' + (detail ? renderThread(detail) : empty('Selecciona una conversación', 'Aquí podrás leer el historial completo y responder.', 'i-mail')) + '</div></div></section></div>';
    p.querySelectorAll('[data-support-filter]').forEach(function (button) { button.addEventListener('click', function () { supportState.filter = button.dataset.supportFilter; renderSupport(); }); });
    p.querySelectorAll('[data-support-uid]').forEach(function (button) { button.addEventListener('click', function () { loadThread(button.dataset.supportUid); }); });
    p.querySelector('[data-support-send]')?.addEventListener('submit', async function (event) { event.preventDefault(); var field = event.currentTarget.querySelector('textarea'); try { await sendReply(field.value); } catch (error) { window.Toast?.error('No se pudo enviar', error.message); } });
    p.querySelector('[data-support-status]')?.addEventListener('click', async function (event) { try { await setThreadStatus(event.currentTarget.dataset.supportStatus); } catch (error) { window.Toast?.error('No se pudo actualizar', error.message); } });
  }
  function renderThread(data) {
    var conversation = data.conversation || {};
    var messages = data.messages || [];
    return '<div class="iv2-thread__head"><div><strong>' + esc(conversation.userName || conversation.userEmail) + '</strong><p style="margin-top:3px;color:#8d8275;font-size:9.5px">' + esc(conversation.userEmail) + ' · ' + esc(conversation.topic || 'membresía') + '</p></div><button class="btn btn--ghost" type="button" data-support-status="' + (conversation.status === 'closed' ? 'open' : 'closed') + '">' + (conversation.status === 'closed' ? 'Reabrir' : 'Marcar resuelto') + '</button></div><div class="iv2-messages">' + (messages.length ? messages.map(function (message) { return '<div class="iv2-message ' + (message.sender === 'admin' ? 'iv2-message--admin' : '') + '">' + esc(message.text) + '<small>' + esc(message.sender === 'admin' ? 'Equipo IMDIIL' : conversation.userName) + ' · ' + esc(formatDate(message.createdAt)) + '</small></div>'; }).join('') : empty('Sin mensajes', 'La conversación no tiene contenido.', 'i-mail')) + '</div><form class="iv2-compose" data-support-send><textarea maxlength="3000" placeholder="Escribe una respuesta clara y segura…" required></textarea><button class="btn btn--primary" type="submit">Responder</button></form>';
  }

  pages.metricas = function (p) {
    var stats = store.stats;
    var planCounts = store.miembros.reduce(function (result, member) { var key = String(member.plan || 'sin plan').toLowerCase(); result[key] = (result[key] || 0) + 1; return result; }, {});
    var activeRate = stats.miembrosTotal ? Math.round(stats.miembrosActivos / stats.miembrosTotal * 100) : 0;
    var content = Object.keys(planCounts).sort(function (a,b) { return planCounts[b] - planCounts[a]; }).map(function (key) { return '<article class="iv2-row"><div><h3>' + esc(key === 'sin plan' ? 'Sin plan registrado' : key.charAt(0).toUpperCase() + key.slice(1)) + '</h3><p>Clasificación guardada en la cuenta.</p></div><div class="iv2-score">' + planCounts[key] + '</div><div class="iv2-row__side">' + (stats.miembrosTotal ? Math.round(planCounts[key] / stats.miembrosTotal * 100) : 0) + '%</div></article>'; }).join('');
    p.innerHTML = '<div class="iv2-shell">' + hero('MEDICIÓN', 'Métricas', 'Indicadores operativos calculados con la información real disponible en el panel.') + '<div class="iv2-grid iv2-grid--4"><div class="iv2-stat"><small>Actividad de cuentas</small><strong>' + activeRate + '%</strong><span>Miembros con acceso activo</span></div><div class="iv2-stat"><small>Contenido disponible</small><strong>' + stats.cursosActivos + '</strong><span>Cursos activos</span></div><div class="iv2-stat"><small>Material</small><strong>' + stats.pdfsPubl + '</strong><span>Recursos publicados</span></div><div class="iv2-stat"><small>Certificados</small><strong>' + stats.certEmitidos + '</strong><span>Emisiones registradas</span></div></div><section class="iv2-panel"><div class="iv2-panel__head"><div><h2>Distribución de membresías</h2><p>Se calcula directamente desde las cuentas registradas.</p></div>' + liveBadge() + '</div><div class="iv2-list">' + (content || empty('No hay cuentas para analizar', 'Las métricas aparecerán al cargar miembros.', 'i-chart-bar')) + '</div></section></div>';
  };

  pages.pruebas = function (p) {
    var trials = store.miembros.filter(function (member) { var plan = String(member.plan || member.tipoAcceso || '').toLowerCase(); return plan.includes('prueba') || plan.includes('trial') || plan.includes('regalo') || member.esPrueba === true; });
    p.innerHTML = '<div class="iv2-shell">' + hero('ADQUISICIÓN', 'Pruebas gratuitas', 'Cuentas cuyo registro indica acceso de prueba o regalo, separadas de las membresías de pago.') + '<div class="iv2-grid iv2-grid--3"><div class="iv2-stat"><small>Identificadas</small><strong>' + trials.length + '</strong><span>Prueba o regalo</span></div><div class="iv2-stat"><small>Activas</small><strong>' + trials.filter(function (x) { return x.activo !== false && x.activa !== false; }).length + '</strong><span>Con acceso vigente</span></div><div class="iv2-stat"><small>Total de cuentas</small><strong>' + store.miembros.length + '</strong><span>Base completa</span></div></div><section class="iv2-panel"><div class="iv2-panel__head"><div><h2>Cuentas de prueba</h2><p>Basado en el plan o tipo de acceso guardado.</p></div>' + liveBadge() + '</div><div class="iv2-list">' + (trials.length ? trials.map(function (member) { return '<article class="iv2-row"><div><h3>' + esc(member.nombre || member.displayName || member.email || 'Miembro') + '</h3><p>' + esc(member.email || '') + '</p></div><div class="iv2-row__side">' + esc(member.plan || member.tipoAcceso || 'Regalo') + '</div><div class="iv2-row__side">' + esc(formatDate(member.fechaRegistro || member.createdAt)) + '</div></article>'; }).join('') : empty('No hay pruebas identificadas', 'Ninguna cuenta tiene actualmente una marca de prueba o regalo.', 'i-clock')) + '</div></section></div>';
  };

  function collectionPage(section, eyebrow, title, description, collections, mapper, icon) {
    pages[section] = function (p) {
      p.innerHTML = '<div class="iv2-shell">' + hero(eyebrow, title, description) + '<section class="iv2-panel"><div class="iv2-panel__head"><div><h2>Registro</h2><p>Consultando Firestore con la sesión de administrador.</p></div>' + liveBadge() + '</div><div class="iv2-list">' + empty('Cargando…', 'Verificando datos disponibles.', 'i-refresh') + '</div></section></div>';
      loadCollections(section, collections, mapper, icon);
    };
  }
  async function loadCollections(section, collections, mapper, icon) {
    var fb = window._fb; var rows = []; var errors = [];
    for (var i = 0; i < collections.length; i += 1) {
      try { var snapshot = await fb.getDocs(fb.query(fb.collection(fb.db, collections[i]), fb.limit(200))); snapshot.docs.forEach(function (doc) { rows.push({ id:doc.id, source:collections[i], ...doc.data() }); }); }
      catch (error) { errors.push(error.message); }
    }
    if (!active(section)) return;
    var list = root()?.querySelector('.iv2-list'); if (!list) return;
    list.innerHTML = rows.length ? rows.map(mapper).join('') : empty('Aún no hay registros', errors.length === collections.length ? 'No fue posible consultar esta colección con los permisos actuales.' : 'La sección está lista y mostrará aquí los próximos movimientos.', icon);
  }

  collectionPage('encuestas', 'ESCUCHA', 'Encuestas', 'Respuestas y opiniones registradas por los miembros.', ['survey_responses','encuesta_respuestas','encuestas_respuestas'], function (item) {
    return '<article class="iv2-row"><div><h3>' + esc(item.nombre || item.name || item.email || 'Respuesta') + '</h3><p>' + esc(item.respuesta || item.comentario || item.message || item.objetivo || 'Encuesta registrada') + '</p></div><div class="iv2-row__side">' + esc(item.email || item.source) + '</div><div class="iv2-row__side">' + esc(formatDate(item.createdAt || item.fecha)) + '</div></article>';
  }, 'i-check');

  collectionPage('recompensas', 'PARTICIPACIÓN', 'Retos y recompensas', 'Canjes y movimientos de créditos disponibles para revisar desde administración.', ['credit_redemptions','credit_ledger','canjes_creditos'], function (item) {
    return '<article class="iv2-row"><div><h3>' + esc(item.rewardTitle || item.titulo || item.tipo || 'Movimiento de créditos') + '</h3><p>' + esc(item.userEmail || item.email || item.uid || item.source) + '</p></div><div class="iv2-row__side">' + esc(String(item.credits || item.creditos || item.amount || '—')) + ' créditos</div><div class="iv2-row__side">' + esc(formatDate(item.createdAt || item.fecha)) + '</div></article>';
  }, 'i-zap');

  store.subscribe(function () {
    var section = document.querySelector('.nav-item.is-active')?.dataset.section;
    if (section === 'actividad') pages.actividad(root());
    if (section === 'metricas') pages.metricas(root());
    if (section === 'pruebas') pages.pruebas(root());
  });
})();
