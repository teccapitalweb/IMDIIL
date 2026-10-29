(function () {
  'use strict';

  const FALLBACK_CATALOG = [
    { id:'material-5s-audit', type:'material', title:'Kit de auditoría 5S', description:'Lista de verificación, matriz de hallazgos y plan de seguimiento.', cost:120, format:'Plantilla práctica' },
    { id:'material-oee-shift', type:'material', title:'Control OEE por turno', description:'Guía para capturar disponibilidad, rendimiento y calidad.', cost:160, format:'Guía + formato' },
    { id:'material-supply-risk', type:'material', title:'Mapa de riesgos logísticos', description:'Método para priorizar riesgos de abastecimiento y distribución.', cost:190, format:'Manual de trabajo' },
    { id:'book-lean-floor', type:'book', title:'Lean en el piso de producción', description:'Lectura IMDIIL sobre flujo, desperdicio y mejora diaria.', cost:240, format:'Libro digital' },
    { id:'book-logistics-decisions', type:'book', title:'Decisiones para una logística confiable', description:'Casos y criterios para inventario, rutas y nivel de servicio.', cost:280, format:'Libro digital' },
    { id:'book-quality-system', type:'book', title:'Calidad que sí se sostiene', description:'Un sistema práctico de hábitos, indicadores y estandarización.', cost:320, format:'Libro digital' }
  ];

  const CONTENT = {
    'material-5s-audit': [['Cómo usarlo','Recorre cada zona con una escala de 0 a 3. Registra evidencia, responsable y fecha de cierre.'],['Qué revisar','Clasificar, ordenar, limpiar, estandarizar y sostener. Describe siempre una condición observable.']],
    'material-oee-shift': [['Datos mínimos','Tiempo planificado, paros, producción total, producción buena y ciclo ideal.'],['Rutina','Compara turnos bajo las mismas reglas y abre una acción sólo cuando tenga responsable.']],
    'material-supply-risk': [['Mapa','Ubica proveedor, origen, ruta, almacén y cliente. Registra evento, probabilidad e impacto.'],['Control','Define señal de alerta, dueño, acción preventiva, plan alterno y evidencia de prueba.']],
    'book-lean-floor': [['Ver el flujo','El inventario entre procesos suele ocultar esperas, defectos y desbalance.'],['Sostener','Una mejora sin responsable, frecuencia y evidencia vuelve a su estado anterior.']],
    'book-logistics-decisions': [['Nivel de servicio','Define qué promesa se hace, a quién y con qué medición.'],['Rutas','Evalúa costo, cumplimiento y resiliencia juntos.']],
    'book-quality-system': [['Estándar útil','El estándar debe poder observarse, verificarse y enseñarse.'],['Aprendizaje','Cada desviación importante debe actualizar el conocimiento del equipo.']]
  };

  const QUIZZES = [
    { q:'¿Qué acción ayuda más a conservar una mejora?', options:['Asignar responsable, frecuencia y evidencia','Agregar indicadores sin dueño','Esperar al cierre del mes'], answer:0 },
    { q:'¿Cuál es la mejor evidencia de que una clase fue comprendida?', options:['Abrir el video','Aplicar el criterio correcto en una decisión','Permanecer conectado algunos minutos'], answer:1 },
    { q:'Cuando aparece una desviación, ¿qué conviene registrar primero?', options:['Una opinión general','La condición observable y su contexto','Sólo el nombre del área'], answer:1 },
    { q:'¿Qué hace verificable una acción de mejora?', options:['Que sea urgente','Que tenga fecha, responsable y resultado esperado','Que se comunique por chat'], answer:1 },
    { q:'¿Qué debe ocurrir antes de abrir la siguiente grabación?', options:['Completar la clase y aprobar su quiz','Recargar la página','Abrir cualquier material'], answer:0 }
  ];

  const CHALLENGES = [
    { id:'flow', icon:'↗', title:'Detecta el cuello de botella', label:'Flujo de proceso', text:'A produce 48 piezas/h, B produce 35 y C produce 42. ¿Dónde observar primero?', options:['Proceso A','Proceso B','Proceso C'], answer:1 },
    { id:'quality', icon:'◎', title:'Elige la evidencia correcta', label:'Calidad', text:'Un turno reporta “muchos defectos”. ¿Qué dato convierte la observación en evidencia?', options:['La sensación del supervisor','Cantidad, tipo, lote y momento del defecto','Una fotografía sin contexto'], answer:1 },
    { id:'inventory', icon:'◇', title:'Prioriza el riesgo', label:'Inventarios', text:'Un componente crítico tiene proveedor único y 45 días de reposición. ¿Qué haces primero?', options:['Ignorar mientras haya stock','Definir alternativa y punto de alerta','Comprar sin límite'], answer:1 }
  ];

  const TOOLS = [
    { route:'tool-iper', icon:'i-shield-check', title:'Matriz IPER', copy:'Identifica peligros, evalúa riesgos y documenta controles.' },
    { route:'tool-oee', icon:'i-gauge', title:'Calculadora OEE', copy:'Mide disponibilidad, rendimiento y calidad por turno.' },
    { route:'tool-ats', icon:'i-clipboard-check', title:'Generador ATS', copy:'Prepara un análisis de trabajo seguro paso a paso.' },
    { route:'tool-noms', icon:'i-book-2', title:'Tabla NOM-STPS', copy:'Consulta obligaciones y referencias normativas.' },
    { route:'tool-logistica', icon:'i-chart-bar', title:'Indicadores logísticos', copy:'Calcula y compara métricas operativas esenciales.' }
  ];

  const state = { catalog:FALLBACK_CATALOG.slice(), owned:new Set(), balance:0, history:[], loaded:false, courseFilter:'all', courseSearch:'' };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#${name}"/></svg>`;
  const targetNode = () => document.getElementById('dynamic-section');
  const bridge = () => window.__IMDIIL_V2_BRIDGE;
  const go = route => window.navigateToSection?.(route);
  const courseRoute = id => `curso/${encodeURIComponent(String(id))}`;
  const lessonRoute = (id, index) => `${courseRoute(id)}/clase/${index + 1}`;

  function compactHero(title, copy, side, tone) {
    return `<section class="v2-route-hero ${tone ? `v2-route-hero--${tone}` : ''}"><div><span class="v2-kicker">IMDIIL · ÁREA DE MIEMBRO</span><h1>${esc(title)}</h1>${copy ? `<p>${esc(copy)}</p>` : ''}</div>${side || ''}</section>`;
  }

  async function userToken() {
    const user = window.__auth?.currentUser || window.__currentUser;
    return user ? user.getIdToken() : '';
  }

  async function loadRewards(force) {
    if (state.loaded && !force) return state;
    state.balance = Math.max(0, Number(window.UserState?.creditos || window.memberData?.creditos || 0));
    try {
      const idToken = await userToken();
      if (!idToken) throw new Error('Sesión no disponible');
      const response = await fetch(`${window.WEBHOOK_URL}/rewards/state`, { headers:{ Authorization:`Bearer ${idToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los créditos');
      state.catalog = Array.isArray(data.catalog) && data.catalog.length ? data.catalog : FALLBACK_CATALOG.slice();
      state.owned = new Set((data.owned || []).map(item => item.id));
      state.balance = Math.max(0, Number(data.balance || 0));
      state.history = Array.isArray(data.history) ? data.history : [];
      if (window.UserState) window.UserState.creditos = state.balance;
    } catch (error) {
      console.warn('[IMDIIL 2.1] Créditos en modo local:', error.message);
    }
    state.loaded = true;
    return state;
  }

  function modal(title, subtitle, body, footer) {
    document.querySelector('.v2-modal')?.remove();
    const el = document.createElement('div');
    el.className = 'v2-modal';
    el.innerHTML = `<section class="v2-modal__box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="v2-modal__head"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="v2-modal__close" type="button" aria-label="Cerrar">×</button></header><div class="v2-modal__body">${body}</div>${footer ? `<footer class="v2-modal__foot">${footer}</footer>` : ''}</section>`;
    document.body.appendChild(el);
    const close = () => el.remove();
    el.querySelector('.v2-modal__close').addEventListener('click', close);
    el.addEventListener('click', event => { if (event.target === el) close(); });
    return { el, close };
  }

  function openContent(item) {
    const sections = CONTENT[item.id] || [['Contenido disponible',item.description || 'Este recurso forma parte de tu biblioteca IMDIIL.']];
    const body = sections.map(section => `<h3>${esc(section[0])}</h3><p>${esc(section[1])}</p>`).join('');
    const view = modal(item.title, item.format, body, '<button class="v2-btn v2-btn--primary" data-close>Terminar lectura</button>');
    view.el.querySelector('[data-close]').addEventListener('click', view.close);
  }

  async function redeem(item, rerender) {
    if (state.owned.has(item.id)) return openContent(item);
    const view = modal(`Canjear ${item.title}`,'El canje se registra una sola vez.',`<p>Cuesta <strong>${Number(item.cost)} créditos</strong>. Tu saldo es <strong>${state.balance}</strong>.</p>`,`<button class="v2-btn" data-cancel>Cancelar</button><button class="v2-btn v2-btn--primary" data-confirm ${state.balance < item.cost ? 'disabled' : ''}>Confirmar</button>`);
    view.el.querySelector('[data-cancel]').addEventListener('click', view.close);
    view.el.querySelector('[data-confirm]')?.addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; button.textContent = 'Procesando…';
      try {
        const response = await fetch(`${window.WEBHOOK_URL}/rewards/redeem`, { method:'POST', headers:{ Authorization:`Bearer ${await userToken()}`, 'Content-Type':'application/json' }, body:JSON.stringify({ itemId:item.id }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo completar el canje');
        state.owned.add(item.id); state.balance = Math.max(0, Number(data.balance || 0)); state.loaded = false;
        view.close(); window.Toast?.success?.('Canje completado','El recurso ya está en tu biblioteca');
        await loadRewards(true); rerender?.(); openContent(item);
      } catch (error) { button.disabled = false; button.textContent = 'Confirmar'; window.Toast?.error?.('No se pudo canjear',error.message); }
    });
  }

  function rewardCard(item) {
    const owned = state.owned.has(item.id);
    return `<article class="v2-reward-card"><div class="v2-reward-card__art">${item.type === 'book' ? '▤' : '⌁'}</div><span>${esc(item.format)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><footer><strong>${owned ? 'En tu biblioteca' : `${Number(item.cost)} créditos`}</strong><button class="v2-btn ${owned ? '' : 'v2-btn--primary'}" data-reward="${esc(item.id)}">${owned ? 'Abrir' : 'Canjear'}</button></footer></article>`;
  }

  async function renderCatalog(target, type) {
    target.innerHTML = `<div class="v2-shell">${compactHero(type === 'book' ? 'Libros' : 'Materiales',type === 'book' ? 'Lecturas canjeables para ampliar tu biblioteca.' : 'Recursos independientes de las diapositivas de tus cursos.')}<div class="v2-loading">Cargando biblioteca…</div></div>`;
    await loadRewards();
    const draw = () => {
      const items = state.catalog.filter(item => item.type === type);
      target.innerHTML = `<div class="v2-shell">${compactHero(type === 'book' ? 'Libros' : 'Materiales',type === 'book' ? 'Lecturas canjeables para ampliar tu biblioteca.' : 'Recursos independientes de las diapositivas de tus cursos.',`<button class="v2-credit-chip" data-go-credits><span>Saldo</span><strong>${state.balance}</strong> créditos</button>`)}<div class="v2-section-head"><div><h2>${type === 'book' ? 'Biblioteca' : 'Recursos disponibles'}</h2><p>${items.filter(item => state.owned.has(item.id)).length} canjeados · ${items.length} publicados</p></div><button class="v2-btn" data-refresh>${icon('i-refresh')} Actualizar</button></div><div class="v2-card-grid">${items.map(rewardCard).join('') || '<div class="v2-empty">Aún no hay recursos publicados.</div>'}</div></div>`;
      target.querySelector('[data-go-credits]')?.addEventListener('click', () => go('creditos'));
      target.querySelector('[data-refresh]')?.addEventListener('click', async () => { await loadRewards(true); draw(); });
      target.querySelectorAll('[data-reward]').forEach(button => button.addEventListener('click', () => { const item = state.catalog.find(entry => entry.id === button.dataset.reward); if (item) redeem(item, draw); }));
    };
    draw();
  }

  function challengeKey() { return `imdiil_v2_challenges_${window.UserState?.uid || 'demo'}`; }
  function challengeState() { try { return JSON.parse(localStorage.getItem(challengeKey()) || '{}'); } catch (_) { return {}; } }
  function saveChallenges(value) { localStorage.setItem(challengeKey(), JSON.stringify(value)); }

  function renderChallengeStage(target, item) {
    const done = !!challengeState()[item.id]?.completed;
    target.innerHTML = `<div class="v2-shell v2-shell--narrow"><button class="v2-back" data-back-retos>← Volver a Retos</button><section class="v2-challenge-stage"><div class="v2-challenge-stage__icon">${item.icon}</div><span class="v2-kicker">${esc(item.label)}</span><h1>${esc(item.title)}</h1><p>${esc(item.text)}</p><div class="v2-challenge-stage__answers">${item.options.map((option,index) => `<button data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${esc(option)}</button>`).join('')}</div><footer>${done ? 'Reto completado · puedes repetirlo' : 'Selecciona una respuesta'}</footer></section></div>`;
    target.querySelector('[data-back-retos]').addEventListener('click', () => renderChallenges(target));
    target.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      target.querySelectorAll('[data-answer]').forEach(option => { option.disabled = true; option.classList.remove('is-correct','is-wrong'); });
      const selected = Number(button.dataset.answer);
      button.classList.add(selected === item.answer ? 'is-correct' : 'is-wrong');
      target.querySelector(`[data-answer="${item.answer}"]`)?.classList.add('is-correct');
      if (selected === item.answer) {
        const progress = challengeState(); progress[item.id] = { completed:true, completedAt:new Date().toISOString() }; saveChallenges(progress);
        window.Toast?.success?.('Reto completado','El resultado quedó guardado');
        setTimeout(() => renderChallenges(target), 800);
      } else {
        window.Toast?.info?.('Revisa el criterio','La respuesta correcta quedó marcada');
        setTimeout(() => target.querySelectorAll('[data-answer]').forEach(option => { option.disabled = false; option.classList.remove('is-correct','is-wrong'); }), 1400);
      }
    }));
  }

  function renderChallenges(target) {
    const progress = challengeState();
    const completed = CHALLENGES.filter(item => progress[item.id]?.completed).length;
    const pct = Math.round(completed / CHALLENGES.length * 100);
    target.innerHTML = `<div class="v2-shell">${compactHero('Retos',completed ? 'Sigue aplicando criterio a situaciones reales.' : 'Tres ejercicios breves para poner en práctica lo aprendido.',`<div class="v2-hero-score"><strong>${completed}/${CHALLENGES.length}</strong><span>completados</span></div>`,'dark')}<section class="v2-mission-overview"><div><span class="v2-kicker">RUTA PRÁCTICA</span><h2>Decisiones de planta</h2><p>Resuelve cada situación y conserva tu avance.</p></div><div class="v2-mission-overview__progress"><span><i style="width:${pct}%"></i></span><strong>${pct}%</strong></div></section><div class="v2-mission-grid">${CHALLENGES.map((item,index) => `<article class="v2-mission ${progress[item.id]?.completed ? 'is-complete' : ''}"><div class="v2-mission__icon">${item.icon}</div><div><span>${esc(item.label)} · 0${index + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div><button data-open-challenge="${item.id}">${progress[item.id]?.completed ? 'Repetir' : 'Comenzar'} →</button></article>`).join('')}</div></div>`;
    target.querySelectorAll('[data-open-challenge]').forEach(button => button.addEventListener('click', () => renderChallengeStage(target, CHALLENGES.find(item => item.id === button.dataset.openChallenge))));
  }

  function getCourseRows() {
    const api = bridge();
    const courses = api?.getCourses?.() || [];
    return courses.map((course,index) => {
      const lessons = Array.isArray(course.sesiones) ? course.sesiones : [];
      const seen = api.getCourseProgress(course.id).clasesVistas || [];
      const completed = lessons.length > 0 && seen.length >= lessons.length;
      const pct = lessons.length ? Math.round(Math.min(seen.length, lessons.length) / lessons.length * 100) : 0;
      return { course,index,lessons,seen,completed,pct,unlocked:api.courseUnlocked(index,course),wait:api.daysForCourse(index,course) };
    });
  }

  async function renderCourses(target) {
    target.innerHTML = `<div class="v2-shell">${compactHero('Mis cursos','Aprende a tu ritmo y continúa desde tu última clase.','','dark')}<div class="v2-loading">Cargando cursos…</div></div>`;
    await window.__cargarCursosFirestore?.();
    const draw = () => {
      const rows = getCourseRows();
      const visible = rows.filter(row => {
        if (state.courseFilter === 'progress' && !(row.pct > 0 && !row.completed)) return false;
        if (state.courseFilter === 'completed' && !row.completed) return false;
        const q = state.courseSearch.trim().toLowerCase();
        return !q || `${row.course.titulo || ''} ${row.course.instructor || ''} ${row.course.area || ''}`.toLowerCase().includes(q);
      });
      target.innerHTML = `<div class="v2-shell">${compactHero('Mis cursos','Aprende a tu ritmo y continúa desde tu última clase.',`<div class="v2-course-hero-stats"><strong>${rows.length}</strong><span>rutas disponibles</span></div>`,'dark')}<div class="v2-course-controls"><div class="v2-segmented"><button class="${state.courseFilter === 'all' ? 'is-active' : ''}" data-filter="all">Todos</button><button class="${state.courseFilter === 'progress' ? 'is-active' : ''}" data-filter="progress">En curso</button><button class="${state.courseFilter === 'completed' ? 'is-active' : ''}" data-filter="completed">Completados</button></div><label class="v2-search">${icon('i-search')}<input value="${esc(state.courseSearch)}" placeholder="Buscar curso"></label></div><div class="v2-course-grid">${visible.map(row => courseCard(row)).join('') || '<div class="v2-empty">No hay cursos con esos filtros.</div>'}</div></div>`;
      target.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.courseFilter = button.dataset.filter; draw(); }));
      target.querySelector('.v2-search input')?.addEventListener('input', event => { state.courseSearch = event.target.value; draw(); requestAnimationFrame(() => { const input = target.querySelector('.v2-search input'); input?.focus(); input?.setSelectionRange(input.value.length,input.value.length); }); });
      target.querySelectorAll('[data-course]').forEach(card => card.addEventListener('click', () => {
        const row = rows.find(entry => String(entry.course.id) === card.dataset.course);
        if (!row?.unlocked) {
          if (window.UserState?.modo !== 'vip') window.__showPaywallModal?.({ title:'Curso exclusivo para miembros', sub:'Activa tu membresía para continuar tu ruta de aprendizaje.', cta:'Ir a Suscripción' });
          else window.Toast?.info?.(row.wait === 1 ? 'Disponible mañana' : `Disponible en ${row.wait || 0} días`,'Los cursos se habilitan de forma progresiva');
          return;
        }
        go(courseRoute(row.course.id));
      }));
    };
    draw();
  }

  function courseCard(row) {
    const course = row.course;
    const cover = esc(course.portada || '');
    const lock = row.unlocked ? '' : '<span class="v2-course-card__lock">Bloqueado</span>';
    return `<article class="v2-course-card ${row.unlocked ? '' : 'is-locked'}" data-course="${esc(course.id)}"><div class="v2-course-card__cover" style="background-image:linear-gradient(180deg,rgba(8,11,14,.06),rgba(8,11,14,.68)),url('${cover}')">${lock}<span>${row.completed ? 'Completado' : row.pct ? `${row.pct}% avanzado` : row.unlocked ? 'Disponible' : 'Próximamente'}</span></div><div class="v2-course-card__body"><div><small>${esc(course.area || 'Ingeniería industrial')}</small><h3>${esc(course.titulo || 'Curso')}</h3></div><p>${row.lessons.length} clases${course.instructor ? ` · ${esc(course.instructor)}` : ''}</p><div class="v2-bar"><i style="width:${row.pct}%"></i></div></div></article>`;
  }

  function courseStatus(api, course, lesson, index) {
    const number = Number(lesson.numero || index + 1);
    const viewed = (api.getCourseProgress(course.id).clasesVistas || []).includes(number);
    return { number, viewed, unlocked:api.lessonUnlocked(course.id,index,course.sesiones), wait:api.daysForLesson(course.id,index,course.sesiones) };
  }

  function renderCourse(course, target) {
    const api = bridge();
    const lessons = Array.isArray(course.sesiones) ? course.sesiones : [];
    const materials = Array.isArray(course.materiales) ? course.materiales : [];
    const progress = api.getCourseProgress(course.id);
    const pct = api.courseProgressPct(course.id,lessons.length);
    const next = lessons.findIndex((lesson,index) => { const status = courseStatus(api,course,lesson,index); return status.unlocked && !status.viewed; });
    target.innerHTML = `<div class="v2-shell"><button class="v2-back" data-back-courses>← Mis cursos</button><section class="v2-course-banner" style="--course-image:url('${esc(course.portada || '')}')"><div><span>${esc(course.area || 'IMDIIL')}</span><h1>${esc(course.titulo || 'Curso')}</h1><p>${esc(course.descripcion || course.desc || '')}</p><div class="v2-course-banner__meta"><b>${lessons.length} clases</b><b>${materials.length} materiales</b><b>${pct}% completado</b></div></div>${next >= 0 ? `<button data-start-lesson="${next}">${pct ? 'Continuar' : 'Empezar'} ${icon('i-play')}</button>` : ''}</section><div class="v2-study-layout"><main><div class="v2-section-head"><div><h2>Clases</h2><p>Avanza en orden y valida cada tema con un quiz.</p></div><span>${progress.clasesVistas?.length || 0}/${lessons.length}</span></div><div class="v2-lesson-list">${lessons.map((lesson,index) => lessonRow(api,course,lesson,index)).join('') || '<div class="v2-empty">Las clases están en preparación.</div>'}</div><div class="v2-section-head v2-section-head--spaced"><div><h2>Material del curso</h2><p>Diapositivas y archivos incluidos, sin usar créditos.</p></div><span>${materials.length}</span></div><div class="v2-material-list">${materials.map((material,index) => { const unlocked = api.materialUnlocked(course.id,index,material); return `<button data-material="${index}" ${unlocked ? '' : 'disabled'}><span>${unlocked ? '▤' : '⌁'}</span><div><strong>${esc(material.titulo || 'Material')}</strong><small>${unlocked ? 'Abrir archivo' : 'Aún bloqueado'}</small></div></button>`; }).join('') || '<div class="v2-empty">Aún no hay archivos publicados.</div>'}</div></main><aside class="v2-progress-card"><div class="v2-progress-ring" style="--pct:${pct}"><strong>${pct}<small>%</small></strong></div><h3>Tu avance</h3><p>${pct === 100 ? 'Completaste esta ruta.' : 'Aprueba el quiz para abrir la siguiente clase.'}</p><div><span>Clases vistas <b>${progress.clasesVistas?.length || 0}/${lessons.length}</b></span><span>Ritmo <b>Cada 6 días</b></span></div></aside></div></div>`;
    target.querySelector('[data-back-courses]').addEventListener('click', () => go('cursos'));
    target.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => go(lessonRoute(course.id,Number(button.dataset.lesson)))));
    target.querySelector('[data-start-lesson]')?.addEventListener('click', event => go(lessonRoute(course.id,Number(event.currentTarget.dataset.startLesson))));
    target.querySelectorAll('[data-material]').forEach(button => button.addEventListener('click', () => window.abrirMaterialIMDIIL?.(course.id,Number(button.dataset.material))));
  }

  function lessonRow(api, course, lesson, index) {
    const status = courseStatus(api,course,lesson,index);
    const copy = status.viewed ? 'Completada' : status.unlocked ? 'Lista para estudiar' : status.wait > 0 ? `Disponible en ${status.wait} días` : 'Completa la anterior';
    return `<button class="v2-lesson-row ${status.viewed ? 'is-complete' : ''}" data-lesson="${index}" ${status.unlocked ? '' : 'disabled'}><span>${status.viewed ? '✓' : String(index + 1).padStart(2,'0')}</span><div><strong>${esc(lesson.titulo || `Clase ${index + 1}`)}</strong><small>${copy}</small></div>${icon(status.unlocked ? 'i-play' : 'i-lock')}</button>`;
  }

  async function embedUrl(course, lessonIndex) {
    const lesson = course.sesiones?.[lessonIndex];
    if (!lesson) throw new Error('Clase no encontrada');
    if (!lesson.videoId) {
      if (!lesson.url) throw new Error('Esta clase todavía no tiene video');
      const url = String(lesson.url);
      if (url.includes('drive.google.com/open?id=')) { const id = url.split('id=')[1].split('&')[0]; return `https://drive.google.com/file/d/${id}/preview`; }
      return url.replace(/\/view(\?.*)?$/,'/preview').replace(/\/edit(\?.*)?$/,'/preview');
    }
    const idToken = await userToken();
    const headers = { 'Content-Type':'application/json' };
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    const response = await fetch(`${window.WEBHOOK_URL}/api/bunny/embed-token`, { method:'POST', headers, body:JSON.stringify({ videoId:lesson.videoId, courseId:course.id, sessionIndex:lessonIndex }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.embedUrl) throw new Error(data.error || 'No se pudo autorizar el video');
    return data.embedUrl;
  }

  function noteKey(courseId, lessonIndex) { return `imdiil_note_${window.UserState?.uid || 'demo'}_${courseId}_${lessonIndex}`; }

  async function renderLesson(course, lessonIndex, target) {
    const api = bridge();
    const lesson = course.sesiones?.[lessonIndex];
    if (!lesson) return go(courseRoute(course.id));
    const status = courseStatus(api,course,lesson,lessonIndex);
    if (!status.unlocked) { window.Toast?.info?.('Clase bloqueada','Completa la clase anterior para continuar'); return go(courseRoute(course.id)); }
    const lessons = course.sesiones || [];
    const nextIndex = lessonIndex + 1 < lessons.length ? lessonIndex + 1 : -1;
    const pct = Math.round((lessonIndex + (status.viewed ? 1 : 0)) / Math.max(1,lessons.length) * 100);
    target.innerHTML = `<div class="v2-shell v2-lesson-page"><button class="v2-back" data-back-course>← ${esc(course.titulo || 'Curso')}</button><div class="v2-lesson-layout"><main><div class="v2-player"><div class="v2-player__status"><span class="v2-spinner"></span><strong>Cargando clase</strong><small>Preparando el reproductor protegido.</small></div><iframe title="${esc(lesson.titulo || 'Clase')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen hidden></iframe></div><section class="v2-lesson-heading"><div><span>CLASE ${String(lessonIndex + 1).padStart(2,'0')} DE ${String(lessons.length).padStart(2,'0')}</span><h1>${esc(lesson.titulo || `Clase ${lessonIndex + 1}`)}</h1><div class="v2-lesson-heading__bar"><i style="width:${pct}%"></i></div></div><button class="v2-complete ${status.viewed ? 'is-complete' : ''}" data-complete ${status.viewed ? 'disabled' : ''}>${status.viewed ? '✓ Completada' : 'Completar quiz →'}</button></section>${nextIndex >= 0 ? `<button class="v2-next-lesson" data-next ${api.lessonUnlocked(course.id,nextIndex,lessons) ? '' : 'disabled'}><span>Después</span><strong>${esc(lessons[nextIndex]?.titulo || `Clase ${nextIndex + 1}`)}</strong><b>→</b></button>` : ''}<section class="v2-lesson-summary"><span class="v2-kicker">RESUMEN</span><h2>En esta clase</h2><p>${esc(lesson.descripcion || course.descripcion || course.desc || 'Revisa el contenido y completa el quiz para registrar tu avance.')}</p><div><span>01</span><p>Observa el proceso y reconoce los criterios principales del tema.</p></div><div><span>02</span><p>Relaciona la explicación con una decisión real de operación.</p></div></section></main><aside class="v2-study-side"><div class="v2-study-tabs"><button class="is-active" data-study-tab="outline">Temario</button><button data-study-tab="notes">Notas</button><button data-study-tab="quiz">Quiz</button></div><section class="is-active" data-study-panel="outline"><div class="v2-outline">${lessons.map((entry,index) => { const s = courseStatus(api,course,entry,index); return `<button class="${index === lessonIndex ? 'is-current' : ''} ${s.viewed ? 'is-complete' : ''}" data-outline="${index}" ${s.unlocked ? '' : 'disabled'}><span>${s.viewed ? '✓' : index + 1}</span><strong>${esc(entry.titulo || `Clase ${index + 1}`)}</strong></button>`; }).join('')}</div></section><section data-study-panel="notes"><label class="v2-notes">Mis notas<textarea placeholder="Escribe aquí tus ideas…">${esc(localStorage.getItem(noteKey(course.id,lessonIndex)) || '')}</textarea><small>Se guardan en este dispositivo.</small></label></section><section data-study-panel="quiz"><div class="v2-quiz-intro"><span>✓</span><h3>${status.viewed ? 'Quiz aprobado' : 'Cierra la clase'}</h3><p>${status.viewed ? 'Tu avance ya quedó registrado.' : 'Responde 3 preguntas y acierta al menos 2.'}</p><button data-side-quiz ${status.viewed ? 'disabled' : ''}>${status.viewed ? 'Completado' : 'Comenzar quiz'}</button></div></section></aside></div></div>`;
    target.querySelector('[data-back-course]').addEventListener('click', () => go(courseRoute(course.id)));
    target.querySelectorAll('[data-study-tab]').forEach(button => button.addEventListener('click', () => { target.querySelectorAll('[data-study-tab]').forEach(item => item.classList.toggle('is-active',item === button)); target.querySelectorAll('[data-study-panel]').forEach(panel => panel.classList.toggle('is-active',panel.dataset.studyPanel === button.dataset.studyTab)); }));
    target.querySelectorAll('[data-outline]').forEach(button => button.addEventListener('click', () => go(lessonRoute(course.id,Number(button.dataset.outline)))));
    target.querySelector('.v2-notes textarea')?.addEventListener('input', event => localStorage.setItem(noteKey(course.id,lessonIndex),event.target.value));
    target.querySelector('[data-next]')?.addEventListener('click', () => go(lessonRoute(course.id,nextIndex)));
    const startQuiz = () => runQuiz(course.id,status.number,() => { window.marcarClaseVista?.(course.id,status.number); window.Toast?.success?.('Clase completada','La siguiente clase ya puede abrirse'); if (nextIndex >= 0) go(lessonRoute(course.id,nextIndex)); else go(courseRoute(course.id)); });
    target.querySelector('[data-complete]')?.addEventListener('click', startQuiz);
    target.querySelector('[data-side-quiz]')?.addEventListener('click', startQuiz);
    try {
      const url = await embedUrl(course,lessonIndex);
      if (!target.isConnected) return;
      const frame = target.querySelector('.v2-player iframe'); const statusEl = target.querySelector('.v2-player__status');
      frame.src = url; frame.hidden = false; statusEl.hidden = true;
    } catch (error) {
      const statusEl = target.querySelector('.v2-player__status');
      if (statusEl) statusEl.innerHTML = `<span class="v2-player__empty">▶</span><strong>Video no disponible</strong><small>${esc(error.message)}</small>`;
    }
  }

  function runQuiz(courseId, lessonNumber, onPass) {
    const seed = [...String(courseId)].reduce((sum,char) => sum + char.charCodeAt(0),Number(lessonNumber) || 0);
    const questions = [0,1,2].map(offset => QUIZZES[(seed + offset) % QUIZZES.length]);
    let current = 0; let score = 0; let selected = false;
    const view = modal('Quiz de cierre',`Clase ${lessonNumber} · necesitas 2 de 3.`, '<div data-quiz></div>', '<button class="v2-btn v2-btn--primary" data-next disabled>Siguiente</button>');
    const body = view.el.querySelector('[data-quiz]'); const next = view.el.querySelector('[data-next]');
    const draw = () => {
      const question = questions[current]; selected = false; next.disabled = true;
      body.innerHTML = `<span class="v2-kicker">PREGUNTA ${current + 1} DE 3</span><h3>${esc(question.q)}</h3><div class="v2-quiz-options">${question.options.map((option,index) => `<button data-answer="${index}">${esc(option)}</button>`).join('')}</div>`;
      body.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => { if (selected) return; selected = true; const answer = Number(button.dataset.answer); if (answer === question.answer) score += 1; body.querySelectorAll('[data-answer]').forEach(item => item.disabled = true); button.classList.add(answer === question.answer ? 'is-correct' : 'is-wrong'); body.querySelector(`[data-answer="${question.answer}"]`)?.classList.add('is-correct'); next.disabled = false; }));
    };
    next.addEventListener('click', () => {
      if (current < 2) { current += 1; draw(); return; }
      if (score >= 2) { body.innerHTML = `<span class="v2-success-mark">✓</span><h3>Clase completada</h3><p>Obtuviste ${score} de 3 respuestas correctas.</p>`; next.textContent = 'Continuar'; next.onclick = () => { view.close(); onPass(); }; }
      else { body.innerHTML = `<h3>Repasa e intenta de nuevo</h3><p>Obtuviste ${score} de 3. Tu avance anterior se conserva.</p>`; next.textContent = 'Reintentar'; next.onclick = () => { current = 0; score = 0; next.onclick = null; draw(); }; }
    });
    draw();
  }

  async function renderProgress(target) {
    target.innerHTML = `<div class="v2-shell"><div class="v2-loading">Preparando tu progreso…</div></div>`;
    await window.__cargarCursosFirestore?.(); await loadRewards();
    const rows = getCourseRows();
    const total = rows.reduce((sum,row) => sum + row.lessons.length,0);
    const seen = rows.reduce((sum,row) => sum + Math.min(row.seen.length,row.lessons.length),0);
    const overall = total ? Math.round(seen / total * 100) : 0;
    const complete = rows.filter(row => row.completed).length;
    const current = rows.filter(row => row.pct > 0 && !row.completed);
    target.innerHTML = `<div class="v2-shell">${compactHero('Mi progreso','Tu avance, sin ruido.',`<div class="v2-progress-hero-ring" style="--pct:${overall}"><strong>${overall}<small>%</small></strong></div>`,'dark')}<section class="v2-progress-overview"><div class="v2-progress-overview__lead"><span class="v2-kicker">PANORAMA</span><h2>${overall ? 'Sigue construyendo tu ruta' : 'Tu ruta comienza aquí'}</h2><p>${seen} de ${total} clases completadas.</p><button data-go-courses>${current.length ? 'Continuar aprendiendo' : 'Explorar cursos'} →</button></div><div class="v2-progress-metrics"><div><strong>${complete}</strong><span>Cursos terminados</span></div><div><strong>${CHALLENGES.filter(item => challengeState()[item.id]?.completed).length}</strong><span>Retos resueltos</span></div><div><strong>${state.owned.size}</strong><span>Recursos canjeados</span></div><div><strong>${state.balance}</strong><span>Créditos disponibles</span></div></div></section><div class="v2-section-head"><div><h2>Ruta de aprendizaje</h2><p>Abre un curso para continuar.</p></div><span>${rows.length} cursos</span></div><div class="v2-progress-grid">${rows.map(row => `<button data-progress-course="${esc(row.course.id)}"><div class="v2-progress-grid__top"><span>${esc(row.course.area || 'IMDIIL')}</span><strong>${row.pct}%</strong></div><h3>${esc(row.course.titulo || 'Curso')}</h3><p>${row.seen.length} de ${row.lessons.length} clases</p><div class="v2-bar"><i style="width:${row.pct}%"></i></div></button>`).join('') || '<div class="v2-empty">Aún no hay cursos publicados.</div>'}</div></div>`;
    target.querySelector('[data-go-courses]').addEventListener('click', () => go('cursos'));
    target.querySelectorAll('[data-progress-course]').forEach(button => button.addEventListener('click', () => go(courseRoute(button.dataset.progressCourse))));
  }

  function historyLabel(entry) {
    if (entry.type === 'reward_redemption') return entry.itemTitle || 'Canje de recurso';
    if (entry.type === 'admin_gift') return entry.note || 'Créditos regalados';
    return entry.note || 'Movimiento de créditos';
  }

  async function renderCredits(target) {
    target.innerHTML = `<div class="v2-shell"><div class="v2-loading">Consultando tus créditos…</div></div>`;
    await loadRewards(true);
    target.innerHTML = `<div class="v2-shell">${compactHero('Créditos','Tu saldo y tus movimientos en un solo lugar.',`<div class="v2-credit-total"><strong>${state.balance}</strong><span>disponibles</span></div>`,'dark')}<div class="v2-credit-layout"><section class="v2-credit-actions"><span class="v2-kicker">USAR CRÉDITOS</span><h2>Elige tu próxima recompensa</h2><div><button data-credit-go="pdfs"><span>⌁</span><div><strong>Materiales</strong><small>Plantillas y guías prácticas</small></div><b>→</b></button><button data-credit-go="libros"><span>▤</span><div><strong>Libros</strong><small>Lecturas para tu biblioteca</small></div><b>→</b></button></div></section><section class="v2-credit-history"><div class="v2-section-head"><div><h2>Movimientos</h2><p>Últimos cambios registrados.</p></div></div><div>${state.history.length ? state.history.map(entry => `<article><span class="${Number(entry.amount) >= 0 ? 'is-positive' : ''}">${Number(entry.amount) >= 0 ? '+' : ''}${Number(entry.amount || 0)}</span><div><strong>${esc(historyLabel(entry))}</strong><small>${entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}) : 'Fecha pendiente'}</small></div></article>`).join('') : '<div class="v2-empty">Aún no hay movimientos registrados.</div>'}</div></section></div></div>`;
    target.querySelectorAll('[data-credit-go]').forEach(button => button.addEventListener('click', () => go(button.dataset.creditGo)));
  }

  function renderTools(target) {
    target.innerHTML = `<div class="v2-shell">${compactHero('Herramientas','Cinco utilidades profesionales, reunidas en un solo lugar.','','dark')}<div class="v2-tool-grid">${TOOLS.map((tool,index) => `<button data-tool-route="${tool.route}"><span>${icon(tool.icon)}</span><small>0${index + 1}</small><h3>${esc(tool.title)}</h3><p>${esc(tool.copy)}</p><b>Abrir herramienta →</b></button>`).join('')}</div></div>`;
    target.querySelectorAll('[data-tool-route]').forEach(button => button.addEventListener('click', () => go(button.dataset.toolRoute)));
  }

  async function renderRoute(route, target) {
    target = target || targetNode();
    target.innerHTML = `<div class="v2-shell"><div class="v2-loading">Abriendo contenido…</div></div>`;
    await window.__cargarCursosFirestore?.();
    const parts = String(route).split('/');
    const id = decodeURIComponent(parts[1] || '');
    const api = bridge();
    const courses = api?.getCourses?.() || [];
    const course = courses.find(item => String(item.id) === id);
    if (!course) { target.innerHTML = '<div class="v2-shell"><div class="v2-empty">No encontramos este curso.</div></div>'; return; }
    const courseIndex = courses.findIndex(item => String(item.id) === id);
    if (!api.courseUnlocked(courseIndex,course)) {
      if (window.UserState?.modo !== 'vip') window.__showPaywallModal?.({ title:'Curso exclusivo para miembros', sub:'Activa tu membresía para continuar tu ruta de aprendizaje.', cta:'Ir a Suscripción' });
      else window.Toast?.info?.('Curso aún bloqueado','Se habilitará de acuerdo con tu calendario de membresía');
      go('cursos');
      return;
    }
    if (parts[2] === 'clase') return renderLesson(course,Math.max(0,Number(parts[3] || 1) - 1),target);
    return renderCourse(course,target);
  }

  function openCourse(course) { if (!course) return false; go(courseRoute(course.id)); return true; }

  function install() {
    if (!window.Sections?.renderers) return;
    window.Sections.renderers.cursos = renderCourses;
    window.Sections.renderers.pdfs = target => renderCatalog(target,'material');
    window.Sections.renderers.libros = target => renderCatalog(target,'book');
    window.Sections.renderers.creditos = renderCredits;
    window.Sections.renderers.retos = renderChallenges;
    window.Sections.renderers.logros = renderProgress;
    window.Sections.renderers.herramientas = renderTools;
    if (!window.__abrirClaseIMDIILOriginal && typeof window.abrirClaseIMDIIL === 'function') window.__abrirClaseIMDIILOriginal = window.abrirClaseIMDIIL;
    window.abrirClaseIMDIIL = (courseId,lessonIndex) => go(lessonRoute(courseId,Number(lessonIndex) || 0));
  }

  window.IMDIILV2 = { openCourse, renderRoute, renderCourses, renderCatalog, renderChallenges, renderProgress, renderCredits, renderTools, install };
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install);
})();
