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
    'material-5s-audit': {
      intro:'Un formato breve para convertir una visita de planta en acciones verificables.',
      sections:[
        ['Cómo usarlo','Recorre cada zona con una escala de 0 a 3. Registra una evidencia concreta, una persona responsable y una fecha de cierre por hallazgo.'],
        ['Qué revisar','Clasificar, ordenar, limpiar, estandarizar y sostener. Evita calificar percepciones: describe la condición observable.'],
        ['Cierre','Revisa los hallazgos abiertos cada semana y vuelve a medir únicamente cuando exista evidencia de corrección.']
      ]
    },
    'material-oee-shift': {
      intro:'Una guía de captura para distinguir pérdidas reales de disponibilidad, velocidad y calidad.',
      sections:[
        ['Datos mínimos','Tiempo planificado, paros, producción total, producción buena y ciclo ideal. Mantén una sola definición por indicador.'],
        ['Cálculo','Disponibilidad × Rendimiento × Calidad. Documenta por separado la causa principal de cada pérdida.'],
        ['Rutina','Compara turnos bajo las mismas reglas y abre una acción solo cuando la causa pueda ser atendida por un responsable.']
      ]
    },
    'material-supply-risk': {
      intro:'Un método para decidir qué riesgos logísticos requieren prevención inmediata.',
      sections:[
        ['Mapa','Ubica proveedor, origen, ruta, almacén y cliente. En cada punto registra evento, probabilidad e impacto.'],
        ['Prioridad','Atiende primero los riesgos de alto impacto sin alternativa disponible. Después reduce tiempo de recuperación.'],
        ['Control','Define señal de alerta, dueño, acción preventiva, plan alterno y evidencia de prueba.']
      ]
    },
    'book-lean-floor': {
      intro:'Lean funciona cuando el equipo puede ver el problema, entenderlo y corregirlo dentro de su rutina.',
      sections:[
        ['Capítulo 1 · Ver el flujo','El inventario entre procesos suele ocultar esperas, defectos y desbalance. Dibuja el recorrido real antes de proponer una mejora.'],
        ['Capítulo 2 · Reducir desperdicio','Empieza con una pérdida repetible y medible. Cambia una condición, observa el resultado y documenta el estándar nuevo.'],
        ['Capítulo 3 · Sostener','Una mejora sin responsable, frecuencia y evidencia vuelve a su estado anterior. La disciplina diaria es parte del diseño.']
      ]
    },
    'book-logistics-decisions': {
      intro:'La confiabilidad logística nace de decisiones explícitas sobre servicio, inventario y capacidad.',
      sections:[
        ['Capítulo 1 · Nivel de servicio','Define qué promesa se hace, a quién y con qué medición. Un promedio general no explica las fallas críticas.'],
        ['Capítulo 2 · Inventario','El stock debe responder a variabilidad y tiempo de reposición, no a una cifra histórica aislada.'],
        ['Capítulo 3 · Rutas','Evalúa costo, cumplimiento y resiliencia juntos. La ruta más barata puede ser la más costosa cuando falla.']
      ]
    },
    'book-quality-system': {
      intro:'La calidad sostenible se construye con reglas simples que muestran las desviaciones a tiempo.',
      sections:[
        ['Capítulo 1 · Estándar útil','El estándar debe poder observarse y enseñarse. Si nadie puede verificarlo, no controla el proceso.'],
        ['Capítulo 2 · Indicadores','Combina una medida de resultado con señales tempranas de proceso para intervenir antes del defecto.'],
        ['Capítulo 3 · Aprendizaje','Cada desviación importante debe actualizar el conocimiento del equipo, no solo cerrar un reporte.']
      ]
    }
  };

  const QUIZZES = [
    {
      q:'¿Qué acción ayuda más a conservar una mejora?',
      options:['Asignar responsable, frecuencia y evidencia','Agregar más indicadores sin dueño','Esperar al cierre del mes'],
      answer:0
    },
    {
      q:'¿Cuál es la mejor evidencia de que una clase fue comprendida?',
      options:['Abrir el video','Aplicar el criterio correcto en una decisión','Permanecer conectado algunos minutos'],
      answer:1
    },
    {
      q:'Cuando aparece una desviación, ¿qué conviene registrar primero?',
      options:['Una opinión general','La condición observable y su contexto','Solo el nombre del área'],
      answer:1
    },
    {
      q:'¿Qué hace verificable una acción de mejora?',
      options:['Que sea urgente','Que tenga fecha, responsable y resultado esperado','Que se comunique por chat'],
      answer:1
    },
    {
      q:'¿Qué debe ocurrir antes de desbloquear la siguiente grabación?',
      options:['Completar la clase y aprobar su quiz','Esperar una recarga de página','Abrir cualquier material'],
      answer:0
    }
  ];

  const CHALLENGES = [
    { id:'flow', title:'Detecta el cuello de botella', text:'El proceso A produce 48 piezas/h, B produce 35 y C produce 42. ¿Dónde debes observar primero?', options:['Proceso A','Proceso B','Proceso C'], answer:1 },
    { id:'quality', title:'Elige la evidencia correcta', text:'Un turno reporta “muchos defectos”. ¿Qué dato convierte la observación en evidencia?', options:['La sensación del supervisor','Cantidad, tipo, lote y momento del defecto','Una fotografía sin contexto'], answer:1 },
    { id:'inventory', title:'Prioriza el riesgo', text:'Un componente crítico tiene proveedor único y 45 días de reposición. ¿Cuál es la primera decisión?', options:['Ignorar mientras haya stock','Definir alternativa y punto de alerta','Comprar sin límite'], answer:1 }
  ];

  const state = { catalog:FALLBACK_CATALOG.slice(), owned:new Set(), balance:0, loaded:false };

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const container = () => document.getElementById('dynamic-section');
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#${name}"/></svg>`;

  function pageHero(title, copy, extra) {
    return `<section class="v2-hero"><div><span class="v2-eyebrow">IMDIIL 2.0</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>${extra || ''}</section>`;
  }

  async function token() {
    const user = window.__auth?.currentUser || window.__currentUser;
    return user ? user.getIdToken() : '';
  }

  async function loadRewards(force) {
    if (state.loaded && !force) return state;
    state.balance = Math.max(0, Number(window.UserState?.creditos || window.memberData?.creditos || 0));
    try {
      const idToken = await token();
      if (!idToken) throw new Error('Sesión no disponible');
      const response = await fetch(`${window.WEBHOOK_URL}/rewards/state`, { headers:{ Authorization:`Bearer ${idToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los canjes');
      state.catalog = Array.isArray(data.catalog) && data.catalog.length ? data.catalog : FALLBACK_CATALOG.slice();
      state.owned = new Set((data.owned || []).map(item => item.id));
      state.balance = Math.max(0, Number(data.balance || 0));
      if (window.UserState) window.UserState.creditos = state.balance;
    } catch (error) {
      console.warn('[IMDIIL 2.0] Catálogo en modo local:', error.message);
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
    const content = CONTENT[item.id] || { intro:item.description, sections:[['Contenido disponible','Este recurso forma parte de tu biblioteca IMDIIL.']] };
    const body = `<p>${esc(content.intro)}</p>${content.sections.map(section => `<h3>${esc(section[0])}</h3><p>${esc(section[1])}</p>`).join('')}`;
    modal(item.title, item.format, body, `<button class="v2-btn v2-btn--primary" data-close>Terminar lectura</button>`).el.querySelector('[data-close]').addEventListener('click', event => event.target.closest('.v2-modal').remove());
  }

  async function redeem(item, rerender) {
    if (state.owned.has(item.id)) return openContent(item);
    const confirmation = modal(
      `Canjear ${item.title}`,
      'El canje es permanente y se registra una sola vez.',
      `<p>Este recurso cuesta <strong>${item.cost} créditos</strong>. Tu saldo actual es <strong>${state.balance}</strong>.</p>`,
      `<button class="v2-btn v2-btn--ghost" data-cancel>Cancelar</button><button class="v2-btn v2-btn--primary" data-confirm ${state.balance < item.cost ? 'disabled' : ''}>Confirmar canje</button>`
    );
    confirmation.el.querySelector('[data-cancel]').addEventListener('click', confirmation.close);
    const confirm = confirmation.el.querySelector('[data-confirm]');
    confirm?.addEventListener('click', async () => {
      confirm.disabled = true;
      confirm.textContent = 'Procesando…';
      try {
        const idToken = await token();
        const response = await fetch(`${window.WEBHOOK_URL}/rewards/redeem`, {
          method:'POST',
          headers:{ Authorization:`Bearer ${idToken}`, 'Content-Type':'application/json' },
          body:JSON.stringify({ itemId:item.id })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo completar el canje');
        state.owned.add(item.id);
        state.balance = Math.max(0, Number(data.balance || 0));
        if (window.UserState) window.UserState.creditos = state.balance;
        confirmation.close();
        window.Toast?.success?.('Canje completado', 'El recurso ya está en tu biblioteca');
        rerender?.();
        openContent(item);
      } catch (error) {
        confirm.disabled = false;
        confirm.textContent = 'Confirmar canje';
        window.Toast?.error?.('No se pudo canjear', error.message);
      }
    });
  }

  function catalogCard(item, rerender) {
    const owned = state.owned.has(item.id);
    const symbol = item.type === 'book' ? '📚' : '📋';
    return `<article class="v2-card"><div class="v2-card__visual"><span class="v2-card__icon">${symbol}</span><span class="v2-card__type">${esc(item.format)}</span></div><div class="v2-card__body"><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="v2-card__footer"><span class="v2-cost">${owned ? 'En tu biblioteca' : `${Number(item.cost)} <span>créditos</span>`}</span><button class="v2-btn ${owned ? '' : 'v2-btn--primary'}" data-reward="${esc(item.id)}">${owned ? 'Abrir' : 'Canjear'}</button></div></div></article>`;
  }

  async function renderCatalog(target, type) {
    target.innerHTML = `<div class="v2-shell">${pageHero(type === 'book' ? 'Biblioteca canjeable' : 'Materiales y recursos', type === 'book' ? 'Libros digitales independientes de tus cursos. Canjéalos una vez y consúltalos cuando quieras.' : 'Recursos nuevos para tu trabajo. Estos materiales no son las diapositivas vinculadas a tus cursos.', '<div class="v2-balance"><small>Saldo disponible</small><strong>…</strong></div>')}<div class="v2-empty"><strong>Cargando tu biblioteca</strong>Estamos verificando tu saldo y tus canjes.</div></div>`;
    await loadRewards();
    const draw = () => {
      const items = state.catalog.filter(item => item.type === type);
      target.innerHTML = `<div class="v2-shell">${pageHero(type === 'book' ? 'Biblioteca canjeable' : 'Materiales y recursos', type === 'book' ? 'Libros digitales independientes de tus cursos. Canjéalos una vez y consúltalos cuando quieras.' : 'Recursos nuevos para tu trabajo. Estos materiales no son las diapositivas vinculadas a tus cursos.', `<div class="v2-balance"><small>Saldo disponible</small><strong>${state.balance} créditos</strong></div>`)}<div class="v2-toolbar"><div class="v2-tabs"><span class="v2-tab is-active">${type === 'book' ? 'Libros' : 'Materiales'}</span><span class="v2-tab">${items.length} disponibles</span><span class="v2-tab">${items.filter(item => state.owned.has(item.id)).length} canjeados</span></div><button class="v2-btn v2-btn--ghost" data-refresh>${icon('i-refresh')} Actualizar</button></div><div class="v2-grid">${items.map(item => catalogCard(item, draw)).join('') || '<div class="v2-empty"><strong>No hay recursos publicados</strong>Vuelve pronto para ver novedades.</div>'}</div></div>`;
      target.querySelectorAll('[data-reward]').forEach(button => button.addEventListener('click', () => {
        const item = state.catalog.find(entry => entry.id === button.dataset.reward);
        if (item) redeem(item, draw);
      }));
      target.querySelector('[data-refresh]')?.addEventListener('click', async () => { await loadRewards(true); draw(); });
    };
    draw();
  }

  function challengeKey() { return `imdiil_v2_challenges_${window.UserState?.uid || 'demo'}`; }
  function challengeState() { try { return JSON.parse(localStorage.getItem(challengeKey()) || '{}'); } catch (_) { return {}; } }
  function saveChallenges(value) { localStorage.setItem(challengeKey(), JSON.stringify(value)); }

  function renderChallenges(target) {
    const progress = challengeState();
    const completed = CHALLENGES.filter(item => progress[item.id]?.completed).length;
    target.innerHTML = `<div class="v2-shell">${pageHero('Retos prácticos','Ejercicios breves para convertir lo aprendido en decisiones. Tu avance se conserva en esta cuenta.', `<div class="v2-balance"><small>Retos completados</small><strong>${completed} / ${CHALLENGES.length}</strong></div>`)}<div class="v2-grid">${CHALLENGES.map((item, index) => `<article class="v2-challenge" data-challenge="${item.id}"><span class="v2-pill ${progress[item.id]?.completed ? 'v2-pill--ok' : ''}">${progress[item.id]?.completed ? 'Completado' : `Reto ${index + 1}`}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="v2-options">${item.options.map((option, optionIndex) => `<button class="v2-option" data-answer="${optionIndex}">${esc(option)}</button>`).join('')}</div><small style="color:var(--text-3)">${progress[item.id]?.completed ? 'Puedes repetirlo cuando quieras.' : 'Elige una respuesta para comprobar tu criterio.'}</small></article>`).join('')}</div></div>`;
    target.querySelectorAll('[data-challenge]').forEach(card => {
      const item = CHALLENGES.find(entry => entry.id === card.dataset.challenge);
      card.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
        card.querySelectorAll('[data-answer]').forEach(option => { option.disabled = true; option.classList.remove('is-correct', 'is-wrong'); });
        const selected = Number(button.dataset.answer);
        button.classList.add(selected === item.answer ? 'is-correct' : 'is-wrong');
        card.querySelector(`[data-answer="${item.answer}"]`)?.classList.add('is-correct');
        if (selected === item.answer) {
          const next = challengeState();
          next[item.id] = { completed:true, completedAt:new Date().toISOString() };
          saveChallenges(next);
          window.Toast?.success?.('Reto completado', 'Tu progreso quedó guardado');
          setTimeout(() => renderChallenges(target), 650);
        } else {
          window.Toast?.info?.('Revisa el criterio', 'La respuesta correcta quedó marcada');
          setTimeout(() => card.querySelectorAll('[data-answer]').forEach(option => { option.disabled = false; option.classList.remove('is-correct', 'is-wrong'); }), 1300);
        }
      }));
    });
  }

  async function renderProgress(target) {
    target.innerHTML = `<div class="v2-shell">${pageHero('Mi progreso','Una vista simple de tus cursos, grabaciones, quizzes, retos y recursos canjeados.')}<div class="v2-empty"><strong>Preparando tu avance</strong>Estamos reuniendo tu historial.</div></div>`;
    await window.__cargarCursosFirestore?.();
    await loadRewards();
    const bridge = window.__IMDIIL_V2_BRIDGE;
    const courses = bridge?.getCourses?.() || [];
    const progress = bridge?.getProgress?.() || {};
    let totalLessons = 0;
    let viewedLessons = 0;
    const rows = courses.map(course => {
      const total = Array.isArray(course.sesiones) ? course.sesiones.length : 0;
      const viewed = (progress[course.id]?.clasesVistas || []).length;
      totalLessons += total;
      viewedLessons += Math.min(viewed, total);
      const pct = total ? Math.round(Math.min(viewed, total) / total * 100) : 0;
      return { course, total, viewed, pct };
    });
    const challengeDone = CHALLENGES.filter(item => challengeState()[item.id]?.completed).length;
    const completedCourses = rows.filter(row => row.total && row.pct === 100).length;
    const overall = totalLessons ? Math.round(viewedLessons / totalLessons * 100) : 0;
    target.innerHTML = `<div class="v2-shell">${pageHero('Mi progreso','Una vista simple de tus cursos, grabaciones, quizzes, retos y recursos canjeados.')}<div class="v2-kpis"><div class="v2-kpi"><small>Avance general</small><strong>${overall}%</strong></div><div class="v2-kpi"><small>Grabaciones</small><strong>${viewedLessons}/${totalLessons}</strong></div><div class="v2-kpi"><small>Cursos terminados</small><strong>${completedCourses}</strong></div><div class="v2-kpi"><small>Retos y recursos</small><strong>${challengeDone + state.owned.size}</strong></div></div><section class="v2-panel"><header class="v2-panel__head"><div><h2>Avance por curso</h2><p>Cada quiz aprobado desbloquea la siguiente grabación.</p></div><span class="v2-pill">${courses.length} cursos</span></header><div>${rows.map(row => `<div class="v2-progress-row"><div><h3>${esc(row.course.titulo || 'Curso')}</h3><p>${row.viewed} de ${row.total} grabaciones completadas</p></div><div class="v2-bar"><span style="width:${row.pct}%"></span></div><strong>${row.pct}%</strong></div>`).join('') || '<div class="v2-empty"><strong>Aún no hay cursos</strong>Cuando se publiquen, aparecerán aquí.</div>'}</div></section></div>`;
  }

  function courseStatus(bridge, course, index, lesson, lessonIndex) {
    const number = Number(lesson.numero || lessonIndex + 1);
    const viewed = (bridge.getCourseProgress(course.id).clasesVistas || []).includes(number);
    const unlocked = bridge.lessonUnlocked(course.id, lessonIndex, course.sesiones);
    const wait = bridge.daysForLesson(course.id, lessonIndex, course.sesiones);
    return { number, viewed, unlocked, wait };
  }

  function openCourse(course, bridge) {
    const target = container();
    if (!target || !course) return false;
    const index = bridge.getCourses().findIndex(item => String(item.id) === String(course.id));
    const progress = bridge.getCourseProgress(course.id);
    const lessons = Array.isArray(course.sesiones) ? course.sesiones : [];
    const materials = Array.isArray(course.materiales) ? course.materiales : [];
    const pct = bridge.courseProgressPct(course.id, lessons.length);
    const cover = String(course.portada || '').replace(/["')]/g, '');
    const nextLesson = lessons.findIndex((lesson, lessonIndex) => {
      const info = courseStatus(bridge, course, index, lesson, lessonIndex);
      return info.unlocked && !info.viewed;
    });

    target.innerHTML = `<div class="v2-shell"><div class="v2-course-top"><button class="v2-back" type="button" data-course-back>← Volver a Mis cursos</button><span class="v2-pill">Curso IMDIIL</span></div><section class="v2-course-cover" style="background-image:url('${cover}')"><div class="v2-course-cover__content"><div class="v2-course-meta"><span>${esc(course.area || 'Ingeniería industrial')}</span><span>${esc(course.nivel || 'Formación profesional')}</span>${course.horas ? `<span>${Number(course.horas)} h</span>` : ''}</div><h1>${esc(course.titulo || 'Curso')}</h1><p>${esc(course.descripcion || course.desc || '')}</p></div></section><div class="v2-course-layout"><main><section class="v2-panel"><header class="v2-panel__head"><div><h2>Grabaciones y clases</h2><p>Completa el quiz de una clase para abrir la siguiente.</p></div><span class="v2-pill">${progress.clasesVistas?.length || 0}/${lessons.length}</span></header><div class="v2-panel__body">${lessons.map((lesson, lessonIndex) => {
      const info = courseStatus(bridge, course, index, lesson, lessonIndex);
      const reason = info.wait > 0 ? `Disponible en ${info.wait} día${info.wait === 1 ? '' : 's'}` : (lessonIndex > 0 ? 'Completa el quiz anterior' : 'Requiere membresía activa');
      return `<article class="v2-lesson ${info.viewed ? 'is-done' : ''} ${!info.unlocked ? 'is-locked' : ''}" data-lesson="${lessonIndex}"><span class="v2-lesson__num">${info.viewed ? '✓' : info.unlocked ? info.number : '🔒'}</span><div><h3>${esc(lesson.titulo || `Clase ${info.number}`)}</h3><p>${info.viewed ? 'Completada · puedes repasarla' : info.unlocked ? 'Disponible · incluye quiz de cierre' : reason}</p></div><span class="v2-lesson__action">${info.unlocked ? '›' : ''}</span></article>`;
    }).join('') || '<div class="v2-empty"><strong>Grabaciones en preparación</strong>Este curso todavía no tiene clases publicadas.</div>'}</div></section><section class="v2-panel"><header class="v2-panel__head"><div><h2>Diapositivas y materiales del curso</h2><p>Estos archivos pertenecen a este curso; no consumen créditos.</p></div><span class="v2-pill">${materials.length} archivos</span></header><div class="v2-panel__body">${materials.map((material, materialIndex) => {
      const unlocked = bridge.materialUnlocked(course.id, materialIndex, material);
      return `<article class="v2-material ${unlocked ? '' : 'is-locked'}" data-material="${materialIndex}"><span class="v2-material__icon">${unlocked ? '▤' : '🔒'}</span><div><strong>${esc(material.titulo || 'Material del curso')}</strong><small>${unlocked ? 'Abrir dentro de IMDIIL' : 'Se habilita con el curso'}</small></div></article>`;
    }).join('') || '<div class="v2-empty"><strong>Sin archivos todavía</strong>Los materiales aparecerán en cuanto sean publicados.</div>'}</div></section></main><aside><section class="v2-panel"><div class="v2-progress-box"><div class="v2-progress-ring" style="--pct:${pct}"><strong>${pct}<span>%</span></strong></div><p class="v2-progress-copy">Tu avance se registra al aprobar el quiz de cada grabación.</p><div class="v2-stat-list"><div class="v2-stat"><span>Grabaciones vistas</span><strong>${progress.clasesVistas?.length || 0} de ${lessons.length}</strong></div><div class="v2-stat"><span>Siguiente paso</span><strong>${nextLesson >= 0 ? esc(lessons[nextLesson]?.titulo || `Clase ${nextLesson + 1}`) : pct === 100 ? 'Curso completado' : 'Esperando desbloqueo'}</strong></div><div class="v2-stat"><span>Ritmo de cursos</span><strong>Cada 6 días</strong></div></div>${nextLesson >= 0 ? `<button class="v2-btn v2-btn--primary" style="width:100%;margin-top:16px" data-continue="${nextLesson}">Continuar curso</button>` : ''}</div></section></aside></div></div>`;
    target.querySelector('[data-course-back]')?.addEventListener('click', () => window.navigateToSection('cursos'));
    target.querySelectorAll('[data-lesson]').forEach(row => row.addEventListener('click', () => window.abrirClaseIMDIIL(course.id, Number(row.dataset.lesson))));
    target.querySelectorAll('[data-material]').forEach(row => row.addEventListener('click', () => window.abrirMaterialIMDIIL(course.id, Number(row.dataset.material))));
    target.querySelector('[data-continue]')?.addEventListener('click', event => window.abrirClaseIMDIIL(course.id, Number(event.currentTarget.dataset.continue)));
    window.scrollTo({ top:0, behavior:'smooth' });
    return true;
  }

  function runQuiz(courseId, lessonNumber, onPass) {
    const seed = [...String(courseId)].reduce((sum, char) => sum + char.charCodeAt(0), Number(lessonNumber) || 0);
    const questions = [0,1,2].map(offset => QUIZZES[(seed + offset) % QUIZZES.length]);
    let current = 0;
    let score = 0;
    const view = modal('Quiz de cierre', `Grabación ${lessonNumber} · necesitas 2 de 3 respuestas correctas.`, '<div data-quiz-body></div>', '<button class="v2-btn v2-btn--primary" data-quiz-next disabled>Siguiente</button>');
    const body = view.el.querySelector('[data-quiz-body]');
    const next = view.el.querySelector('[data-quiz-next]');
    const draw = () => {
      const question = questions[current];
      body.innerHTML = `<span class="v2-pill">Pregunta ${current + 1} de ${questions.length}</span><h3 style="margin-top:16px">${esc(question.q)}</h3><div class="v2-options">${question.options.map((option, index) => `<button class="v2-option" data-quiz-answer="${index}">${esc(option)}</button>`).join('')}</div><p style="margin:0;color:var(--text-3)">Elige una respuesta para continuar.</p>`;
      next.disabled = true;
      next.textContent = current === questions.length - 1 ? 'Ver resultado' : 'Siguiente';
      body.querySelectorAll('[data-quiz-answer]').forEach(button => button.addEventListener('click', () => {
        body.querySelectorAll('[data-quiz-answer]').forEach(option => { option.disabled = true; option.classList.remove('is-correct','is-wrong'); });
        const selected = Number(button.dataset.quizAnswer);
        if (selected === question.answer) score += 1;
        button.classList.add(selected === question.answer ? 'is-correct' : 'is-wrong');
        body.querySelector(`[data-quiz-answer="${question.answer}"]`)?.classList.add('is-correct');
        next.disabled = false;
      }));
    };
    next.addEventListener('click', () => {
      if (current < questions.length - 1) { current += 1; draw(); return; }
      if (score >= 2) {
        body.innerHTML = `<span class="v2-pill v2-pill--ok">Aprobado</span><h3>¡Grabación completada!</h3><p>Obtuviste ${score} de ${questions.length}. La siguiente grabación ya puede desbloquearse.</p>`;
        next.textContent = 'Continuar';
        next.disabled = false;
        next.onclick = () => { view.close(); onPass(); };
      } else {
        body.innerHTML = `<span class="v2-pill">Necesita repaso</span><h3>Obtuviste ${score} de ${questions.length}</h3><p>Repasa la grabación y vuelve a intentarlo. Tu avance anterior se conserva.</p>`;
        next.textContent = 'Intentar de nuevo';
        next.disabled = false;
        next.onclick = () => { current = 0; score = 0; next.onclick = null; draw(); };
      }
    });
    draw();
  }

  function attachQuizGate() {
    const button = document.getElementById('visorMarkAsViewed');
    if (!button || button.dataset.v2QuizGate === '1') return;
    button.dataset.v2QuizGate = '1';
    button.addEventListener('click', event => {
      if (button.disabled) return;
      const courseId = button.dataset.cursoId;
      const lessonNumber = Number(button.dataset.numClase);
      if (!courseId || !lessonNumber) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      runQuiz(courseId, lessonNumber, () => {
        window.marcarClaseVista(courseId, lessonNumber);
        window.cerrarVisor?.();
        window.__refrescarCursoDetalle?.(courseId);
        window.Toast?.success?.('Quiz aprobado', 'La siguiente grabación quedó disponible');
      });
    }, true);
  }

  function patchViewerLabel() {
    const original = window.abrirVisor;
    if (typeof original !== 'function' || original.__v2Patched) return;
    const patched = function (url, title, courseId, lessonNumber) {
      const result = original.apply(this, arguments);
      const button = document.getElementById('visorMarkAsViewed');
      if (button && courseId && lessonNumber && !button.disabled) {
        button.innerHTML = `${icon('i-clipboard-check')} Completar quiz`;
      }
      return result;
    };
    patched.__v2Patched = true;
    window.abrirVisor = patched;
  }

  function install() {
    if (!window.Sections?.renderers) return;
    window.Sections.renderers.pdfs = target => renderCatalog(target, 'material');
    window.Sections.renderers.libros = target => renderCatalog(target, 'book');
    window.Sections.renderers.retos = renderChallenges;
    window.Sections.renderers.logros = renderProgress;
    attachQuizGate();
    patchViewerLabel();
  }

  window.IMDIILV2 = { openCourse, renderCatalog, renderChallenges, renderProgress, install };
  // El archivo se carga al final del documento: instalar de inmediato permite
  // que una URL directa (#libros, #retos, #logros) funcione en el primer render.
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
})();
