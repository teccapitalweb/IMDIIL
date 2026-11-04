(function () {
  'use strict';

  // Catálogo canjeable: la fuente real es el webhook (/rewards/state).
  // Este respaldo sólo se muestra si el webhook no responde.
  const FALLBACK_CATALOG = [
    ['libro-errores-produccion-industrial', 1, 'Errores en la producción industrial', 'Los errores más comunes en planta, cómo detectarlos a tiempo y qué hacer para que no se repitan.'],
    ['libro-50-herramientas-ingenieria-industrial', 2, '50 herramientas de ingeniería industrial que todo profesional debe dominar', 'Las herramientas esenciales del ingeniero industrial explicadas para aplicarse en planta: cuándo usarlas, cómo y qué resultado esperar.'],
    ['libro-diagnostico-fallas-manufactura', 3, 'Diagnóstico de fallas en manufactura', 'Método práctico para identificar la causa raíz de una falla y corregirla con evidencia.'],
    ['libro-lean-manufacturing-30-casos', 4, 'Lean Manufacturing: 30 casos', 'Treinta casos reales para entender y aplicar Lean en el piso de producción.'],
    ['libro-control-calidad-25-problemas', 5, 'Control de calidad industrial: 25 problemas', 'Veinticinco problemas de calidad resueltos paso a paso con herramientas de control.'],
    ['libro-mantenimiento-industrial', 6, 'Mantenimiento industrial: cómo prevenir fallas, paros y costos innecesarios', 'Estrategias de mantenimiento preventivo y predictivo para reducir paros no planeados y controlar el costo de operación.']
  ].map(([id, n, title, description]) => ({ id, type:'book', title, description, area:`Biblioteca técnica · Libro ${n}`, cost:800, ext:'docx', downloadExt:'pdf', format:'Libro digital · PDF', hasCover:true }));

  const QUIZZES = [
    { q:'¿Qué acción ayuda más a conservar una mejora?', options:['Asignar responsable, frecuencia y evidencia','Agregar indicadores sin dueño','Esperar al cierre del mes'], answer:0, explanation:'Una mejora se sostiene cuando tiene una rutina verificable, una persona responsable y evidencia de seguimiento.' },
    { q:'¿Cuál es la mejor evidencia de que una clase fue comprendida?', options:['Abrir el video','Aplicar el criterio correcto en una decisión','Permanecer conectado algunos minutos'], answer:1, explanation:'Comprender implica usar el criterio aprendido para tomar una decisión correcta, no solamente reproducir el contenido.' },
    { q:'Cuando aparece una desviación, ¿qué conviene registrar primero?', options:['Una opinión general','La condición observable y su contexto','Sólo el nombre del área'], answer:1, explanation:'La condición observable y su contexto permiten analizar causas y comparar el resultado después de intervenir.' },
    { q:'¿Qué hace verificable una acción de mejora?', options:['Que sea urgente','Que tenga fecha, responsable y resultado esperado','Que se comunique por chat'], answer:1, explanation:'Fecha, responsable y resultado esperado convierten una intención en una acción que puede comprobarse.' },
    { q:'¿Qué debe ocurrir antes de abrir la siguiente grabación?', options:['Completar la clase y aprobar su evaluación','Recargar la página','Abrir cualquier material'], answer:0, explanation:'La evaluación confirma el aprendizaje de la clase y mantiene el avance en el orden correcto.' },
    { q:'¿Qué indicador es útil para controlar un proceso?', options:['Uno sin definición','Uno con fórmula, fuente, frecuencia y meta','Cualquier cifra disponible'], answer:1, explanation:'Un indicador sólo es comparable cuando su definición, fuente, frecuencia y meta son consistentes.' },
    { q:'Ante un riesgo operativo importante, ¿qué debe definirse?', options:['Una acción, un responsable y una señal de alerta','Sólo una reunión','Esperar a que ocurra'], answer:0, explanation:'El control preventivo necesita una acción concreta, una persona responsable y una señal que active la respuesta.' },
    { q:'¿Cuál es el mejor punto de partida para resolver una falla?', options:['Cambiar todo el proceso','Confirmar el problema con evidencia','Buscar un culpable'], answer:1, explanation:'Confirmar la falla con evidencia evita corregir síntomas o tomar decisiones basadas en suposiciones.' }
  ];

  const CHALLENGES = [
    { id:'flow', icon:'↗', title:'Detecta el cuello de botella', label:'Flujo de proceso', text:'A produce 48 piezas/h, B produce 35 y C produce 42. ¿Dónde observar primero?', options:['Proceso A','Proceso B','Proceso C'], answer:1 },
    { id:'quality', icon:'◎', title:'Elige la evidencia correcta', label:'Calidad', text:'Un turno reporta “muchos defectos”. ¿Qué dato convierte la observación en evidencia?', options:['La sensación del supervisor','Cantidad, tipo, lote y momento del defecto','Una fotografía sin contexto'], answer:1 },
    { id:'inventory', icon:'◇', title:'Prioriza el riesgo', label:'Inventarios', text:'Un componente crítico tiene proveedor único y 45 días de reposición. ¿Qué haces primero?', options:['Ignorar mientras haya stock','Definir alternativa y punto de alerta','Comprar sin límite'], answer:1 }
  ];

  const TOOLS = [
    { route:'tool-iper', cover:'assets/img/tools-pro/matriz-iper.webp', icon:'i-shield-check', title:'Matriz IPER', copy:'Identifica peligros, evalúa riesgos y documenta controles.' },
    { route:'tool-oee', cover:'assets/img/tools-pro/calculadora-oee.webp', icon:'i-gauge', title:'Calculadora OEE', copy:'Mide disponibilidad, rendimiento y calidad por turno.' },
    { route:'tool-ats', cover:'assets/img/tools-pro/generador-ats.webp', icon:'i-clipboard-check', title:'Generador ATS', copy:'Prepara un análisis de trabajo seguro paso a paso.' },
    { route:'tool-noms', cover:'assets/img/tools-pro/tabla-nom-stps.webp', icon:'i-book-2', title:'Tabla NOM-STPS', copy:'Consulta obligaciones y referencias normativas.' },
    { route:'tool-logistica', cover:'assets/img/tools-pro/indicadores-logisticos.webp', icon:'i-chart-bar', title:'Indicadores logísticos', copy:'Calcula y compara métricas operativas esenciales.' }
  ];

  const state = { catalog:FALLBACK_CATALOG.slice(), owned:new Set(), balance:0, history:[], loaded:false, courseFilter:'all', courseSearch:'' };
  let installedOnce = false;
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

  // Espera a que Firebase termine de restaurar la sesión (hasta ~10 s) antes de pedir el token.
  async function userToken() {
    let user = window.__auth?.currentUser || window.__currentUser;
    for (let attempt = 0; !user && !window.__isDemoMode && attempt < 50; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      user = window.__auth?.currentUser || window.__currentUser;
    }
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
      if (data.materialsStatus) window.__IMDIIL_MATERIALS_STATUS = data.materialsStatus;
      // Solo se da por cargado cuando el servidor respondió; si falló, el siguiente render reintenta.
      state.loaded = true;
    } catch (error) {
      console.warn('[IMDIIL 2.1] Créditos en modo local:', error.message);
    }
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

  // ─── Libros y Materiales: canje con confirmación, celebración y visor ───
  const fmt = value => Number(value || 0).toLocaleString('es-MX');
  const isWebTool = item => item?.kind === 'web' || item?.ext === 'web';
  const typeLabel = item => item.type === 'book' ? 'libro' : isWebTool(item) ? 'herramienta' : 'material';
  const typeTitle = item => item.type === 'book' ? 'Libro' : isWebTool(item) ? 'Herramienta' : 'Material';
  const typeIcon = item => item.type === 'book' ? icon('i-book-2') : isWebTool(item) ? icon('i-tools') : icon('i-news');
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Splash de desbloqueo con confeti (misma idea que SYNOVA / ICADEM / IMFRA).
  function celebrateUnlock(item) {
    return new Promise(resolve => {
      document.querySelectorAll('.v2-unlock-splash').forEach(el => el.remove());
      const splash = document.createElement('div');
      splash.className = 'v2-unlock-splash';
      splash.setAttribute('role', 'status');
      const colors = ['#FF7A2D', '#FFB377', '#0B608F', '#37B8C8', '#F1B93B', '#22C55E', '#FFFFFF'];
      const pieces = reducedMotion() ? '' : Array.from({ length: 90 }, (_, i) => {
        const round = i % 4 === 0;
        return `<span class="${round ? 'is-round' : ''}" style="--x:${(Math.random() * 100).toFixed(1)}vw;--w:${(6 + Math.random() * 6).toFixed(0)}px;--h:${(round ? 8 : 10 + Math.random() * 8).toFixed(0)}px;--c:${colors[i % colors.length]};--t:${(1.9 + Math.random() * 1.3).toFixed(2)}s;--d:${(Math.random() * .45).toFixed(2)}s;--r:${(Math.random() * 360).toFixed(0)}deg;--drift:${(Math.random() * 160 - 80).toFixed(0)}px"></span>`;
      }).join('');
      splash.innerHTML = `<div class="celebracion-confetti" aria-hidden="true">${pieces}</div><div class="v2-unlock-splash__card"><div class="v2-unlock-splash__icon">${typeIcon(item)}</div><span>¡${typeTitle(item)} ${item.type === 'book' ? 'desbloqueado' : isWebTool(item) ? 'desbloqueada' : 'desbloqueado'}!</span><h2>${esc(item.title)}</h2><p>Ya es tuyo para siempre. Abriendo…</p><i class="v2-unlock-splash__bar"><b></b></i></div>`;
      document.body.appendChild(splash);
      requestAnimationFrame(() => splash.classList.add('is-visible'));
      const wait = reducedMotion() ? 700 : 2000;
      setTimeout(() => {
        splash.classList.remove('is-visible');
        setTimeout(() => { splash.querySelector('.v2-unlock-splash__card')?.remove(); resolve(); }, 220);
        setTimeout(() => splash.remove(), 2600);
      }, wait);
    });
  }

  function closeViewer() {
    if (document.fullscreenElement && document.querySelector('.v2-doc-viewer')?.contains(document.fullscreenElement)) document.exitFullscreen?.().catch(() => {});
    document.querySelector('.v2-doc-viewer')?.remove();
    document.body.classList.remove('v2-doc-open');
  }

  async function downloadReward(item, button) {
    const original = button?.innerHTML;
    try {
      if (button) { button.disabled = true; button.textContent = 'Descargando…'; }
      const idToken = await userToken();
      if (!idToken) throw new Error('Inicia sesión para continuar.');
      const response = await fetch(`${window.WEBHOOK_URL}/rewards/${encodeURIComponent(item.id)}/file`, { headers:{ Authorization:`Bearer ${idToken}` } });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'No pudimos descargar el archivo.'); }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `IMDIIL_${item.title.replace(/[^\wÁÉÍÓÚÜáéíóúüÑñ]+/g, '_').slice(0, 80)}.${item.downloadExt || item.ext || 'pdf'}`;
      document.body.appendChild(link); link.click();
      setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1500);
    } catch (error) {
      window.Toast?.error?.('No se pudo descargar', error.message);
    } finally {
      if (button) { button.disabled = false; button.innerHTML = original; }
    }
  }

  // Visor a pantalla completa dentro del panel (PDF nativo u Office Online).
  async function openContent(item) {
    closeViewer();
    const viewer = document.createElement('div');
    viewer.className = 'v2-doc-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    const web = isWebTool(item);
    const fsIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    viewer.innerHTML = `<div class="v2-doc-viewer__box"><header class="v2-doc-viewer__bar"><div class="v2-doc-viewer__title"><span>${esc(item.format || (item.type === 'book' ? 'Libro digital' : 'Material'))}</span><strong>${esc(item.title)}</strong></div><div class="v2-doc-viewer__actions"><button class="v2-doc-viewer__btn" type="button" data-doc-fullscreen title="Pantalla completa" aria-label="Pantalla completa">${fsIcon}</button>${web ? '' : `<button class="v2-doc-viewer__btn" type="button" data-doc-download title="Descargar" aria-label="Descargar">${icon('i-download')}</button>`}<button class="v2-doc-viewer__btn v2-doc-viewer__close" type="button" aria-label="Cerrar" title="Cerrar">×</button></div></header><div class="v2-doc-viewer__body"><div class="v2-doc-viewer__loading"><i></i>Preparando tu ${typeLabel(item)}…</div></div></div>`;
    document.body.appendChild(viewer);
    document.body.classList.add('v2-doc-open');
    viewer.querySelector('.v2-doc-viewer__close').addEventListener('click', closeViewer);
    viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); });
    viewer.querySelector('[data-doc-fullscreen]').addEventListener('click', () => {
      const box = viewer.querySelector('.v2-doc-viewer__box');
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else box.requestFullscreen?.().catch(() => {});
    });
    viewer.querySelector('[data-doc-download]')?.addEventListener('click', event => downloadReward(item, event.currentTarget));
    try {
      const idToken = await userToken();
      if (!idToken) throw new Error('Inicia sesión para continuar.');
      const response = await fetch(`${window.WEBHOOK_URL}/rewards/${encodeURIComponent(item.id)}/view`, { method:'POST', headers:{ Authorization:`Bearer ${idToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.embedUrl) throw new Error(data.error || 'No pudimos abrir el documento.');
      if (!document.body.contains(viewer)) return;
      // En teléfonos/tabletas un PDF dentro de un iframe se ve incompleto: se abre en el visor nativo.
      if (data.ext === 'pdf' && window.matchMedia?.('(pointer: coarse)').matches) {
        viewer.querySelector('.v2-doc-viewer__body').innerHTML = `<div class="v2-doc-viewer__native"><div class="v2-unlock-splash__icon">${icon('i-news')}</div><strong>Tu ${typeLabel(item)} está listo</strong><p>Ábrelo en el visor de tu dispositivo para leerlo completo.</p><a class="v2-btn v2-btn--primary" href="${esc(data.url)}" target="_blank" rel="noopener">Abrir PDF</a></div>`;
        return;
      }
      const frame = document.createElement('iframe');
      frame.className = 'v2-doc-viewer__frame';
      frame.title = item.title;
      frame.src = data.embedUrl;
      frame.setAttribute('allowfullscreen', '');
      if (web) frame.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write');
      frame.addEventListener('load', () => viewer.querySelector('.v2-doc-viewer__loading')?.remove(), { once:true });
      viewer.querySelector('.v2-doc-viewer__body').appendChild(frame);
    } catch (error) {
      closeViewer();
      window.Toast?.error?.('No se pudo abrir', error.message);
    }
  }

  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.querySelector('.v2-doc-viewer')) closeViewer(); });

  // Popup de confirmación: costo, saldo actual, si alcanza y saldo restante.
  async function redeem(item, rerender) {
    if (state.owned.has(item.id)) return openContent(item);
    const cost = Number(item.cost) || 0;
    const balance = state.balance;
    const enough = balance >= cost;
    const kind = typeLabel(item);
    const body = `<div class="v2-redeem"><div class="v2-redeem__item"><div class="v2-redeem__art ${item.type === 'book' || toolCoverUrl(item) ? 'has-cover' : ''}">${item.type === 'book' ? `<img src="${esc(localCoverUrl(item))}" alt="" onerror="this.remove()">` : toolCoverUrl(item) ? `<img src="${esc(toolCoverUrl(item))}" alt="" onerror="this.remove()">` : ''}${typeIcon(item)}</div><div><span>${esc(item.format || kind)}</span><strong>${esc(item.title)}</strong></div></div>`
      + `<dl class="v2-redeem__math"><div><dt>Costo</dt><dd>${fmt(cost)} créditos</dd></div><div><dt>Tu saldo</dt><dd>${fmt(balance)} créditos</dd></div><div class="${enough ? 'is-ok' : 'is-short'}"><dt>${enough ? 'Te quedarán' : 'Te faltan'}</dt><dd>${fmt(enough ? balance - cost : cost - balance)} créditos</dd></div></dl>`
      + `<p class="v2-redeem__note ${enough ? 'is-ok' : 'is-short'}">${enough ? `✓ Te alcanza. ${kind === 'herramienta' ? 'La' : 'El'} ${kind} queda en tu cuenta para siempre y se abrirá al confirmar.` : `Aún no te alcanza. Gana créditos completando clases y Retos.`}</p></div>`;
    const footer = enough
      ? `<button class="v2-btn" data-cancel>Cancelar</button><button class="v2-btn v2-btn--primary" data-confirm>Canjear y abrir</button>`
      : `<button class="v2-btn" data-cancel>Cerrar</button><button class="v2-btn v2-btn--primary" data-earn>Ganar créditos</button>`;
    const view = modal(enough ? `¿Canjear ${fmt(cost)} créditos?` : 'Créditos insuficientes', 'Créditos IMDIIL', body, footer);
    view.el.classList.add('v2-modal--redeem');
    view.el.querySelector('[data-cancel]').addEventListener('click', view.close);
    view.el.querySelector('[data-earn]')?.addEventListener('click', () => { view.close(); go('retos'); });
    view.el.querySelector('[data-confirm]')?.addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; button.textContent = 'Canjeando…';
      try {
        const response = await fetch(`${window.WEBHOOK_URL}/rewards/redeem`, { method:'POST', headers:{ Authorization:`Bearer ${await userToken()}`, 'Content-Type':'application/json' }, body:JSON.stringify({ itemId:item.id }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo completar el canje');
        state.owned.add(item.id);
        state.balance = Math.max(0, Number(data.balance || 0));
        if (window.UserState) window.UserState.creditos = state.balance;
        view.close();
        rerender?.();
        if (!data.repeated) await celebrateUnlock(item);
        openContent(item);
        loadRewards(true).then(() => rerender?.());
      } catch (error) { button.disabled = false; button.textContent = 'Canjear y abrir'; window.Toast?.error?.('No se pudo canjear', error.message); }
    });
  }

  const coverUrl = item => `${window.WEBHOOK_URL}/rewards/${encodeURIComponent(item.id)}/cover`;
  const localCoverUrl = item => `assets/img/books/${encodeURIComponent(item.id)}.webp`;

  // Tarjeta de libro (misma estructura que la biblioteca de SYNOVA)
  function bookCard(item) {
    const owned = state.owned.has(item.id);
    const fallback = esc(coverUrl(item));
    const cover = `<span class="book-card__cover"><img src="${esc(localCoverUrl(item))}" alt="Portada de ${esc(item.title)}" loading="lazy" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${fallback}';}else{this.remove();}"><span class="book-badge">${owned ? 'En tu biblioteca' : 'Canjeable'}</span></span>`;
    const cost = owned ? `<span class="book-cost">${icon('i-check-circle')}Canjeado</span>` : `<span class="book-cost"><span class="credit-coin">C</span>${fmt(item.cost)} créditos</span>`;
    return `<article class="book-card ${owned ? 'is-owned' : ''}" data-open-reward="${esc(item.id)}">${cover}<span class="book-card__body"><span class="book-card__tag">${esc(item.area || item.format)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><span class="book-card__foot">${cost}<button class="book-open" type="button" data-reward="${esc(item.id)}" aria-label="${owned ? 'Abrir' : 'Canjear'} ${esc(item.title)}">${icon(owned ? 'i-book-2' : 'i-arrow-right')}</button></span></span></article>`;
  }

  // Tarjeta de material / herramienta (misma estructura que SYNOVA)
  const TOOL_BADGES = { 'oee master pro':'OEE', 'plant design 3d':'3D', 'production ai':'PA', 'quality lab pro':'QL', 'time study pro':'TS', 'maintenance master':'MM', 'process ai studio':'PS' };
  function materialBadge(item) {
    if (!isWebTool(item)) return String(item.downloadExt || item.ext || 'doc').toUpperCase().slice(0, 4);
    const known = TOOL_BADGES[String(item.title || '').toLowerCase()];
    if (known) return known;
    return String(item.title || 'H').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }
  // Portadas de las herramientas premium (assets/img/tools). Ya traen nombre y descripción.
  const TOOL_COVERS = { 'oee master pro':'oee-master-pro', 'plant design 3d':'plant-design-3d', 'production ai':'production-ai', 'quality lab pro':'quality-lab-pro', 'time study pro':'time-study-pro', 'maintenance master':'maintenance-master', 'process ai studio':'process-ai-studio' };
  const toolCoverUrl = item => { const key = TOOL_COVERS[String(item?.title || '').toLowerCase()]; return key ? `assets/img/tools/${key}.webp` : ''; };
  function toolCard(item) {
    const owned = state.owned.has(item.id);
    const label = `${owned ? 'Abrir' : 'Canjear'} ${item.title}`;
    const price = owned
      ? `<span class="tool-card__state is-owned">${icon('i-check-circle')}Desbloqueada</span>`
      : `<span class="tool-card__state"><span class="credit-coin">C</span>${fmt(item.cost)} créditos</span>`;
    return `<article class="tool-card ${owned ? 'is-owned' : ''}" data-open-reward="${esc(item.id)}"><span class="tool-card__cover"><span class="tool-card__frame"><img src="${esc(toolCoverUrl(item))}" alt="${esc(item.title)}: ${esc(item.description)}" loading="lazy" decoding="async"></span></span><span class="tool-card__foot">${price}<button class="tool-card__btn ${owned ? '' : 'is-primary'}" type="button" data-reward="${esc(item.id)}" aria-label="${esc(label)}">${owned ? 'Abrir' : 'Canjear'}</button></span></article>`;
  }

  function materialCard(item) {
    if (isWebTool(item) && toolCoverUrl(item)) return toolCard(item);
    const owned = state.owned.has(item.id);
    const web = isWebTool(item);
    const cost = owned ? `<span class="book-cost">${icon('i-check-circle')}${web ? 'Desbloqueada' : 'Canjeado'}</span>` : `<span class="book-cost"><span class="credit-coin">C</span>${fmt(item.cost)} créditos</span>`;
    return `<article class="mat-item ${owned ? 'is-owned' : ''} ${web ? 'is-web' : ''}" data-open-reward="${esc(item.id)}"><span class="mat-item__icon"><b>${esc(materialBadge(item))}</b></span><span class="mat-item__body"><span class="book-card__tag">${esc(item.area || item.format)}</span><strong>${esc(item.title)}</strong><span class="mat-item__desc">${esc(item.description)}</span><span class="mat-item__foot">${cost}<button class="book-open" type="button" data-reward="${esc(item.id)}" aria-label="${owned ? 'Abrir' : 'Canjear'} ${esc(item.title)}">${icon(owned ? 'i-arrow-right' : 'i-arrow-right')}</button></span></span></article>`;
  }

  function rewardCard(item) {
    if (item.type === 'book') return bookCard(item);
    if (item.type === 'material') return materialCard(item);
    const owned = state.owned.has(item.id);
    const ext = String(item.downloadExt || item.ext || '').toUpperCase();
    const cover = item.hasCover ? `<div class="v2-reward-card__cover"><img src="${esc(coverUrl(item))}" alt="Portada de ${esc(item.title)}" loading="lazy" onerror="this.parentNode.remove()">${owned ? '<b>✓ Tuyo</b>' : ''}</div>` : '';
    return `<article class="v2-reward-card ${owned ? 'is-owned' : ''} ${cover ? 'has-cover' : ''}" data-open-reward="${esc(item.id)}">${cover}<div class="v2-reward-card__top"><div class="v2-reward-card__art">${item.type === 'book' ? icon('i-book-2') : icon('i-news')}</div>${ext ? `<em class="v2-reward-card__ext">${esc(ext)}</em>` : ''}</div><span>${esc(item.area || item.format)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><footer><strong>${owned ? '✓ En tu biblioteca' : `${fmt(item.cost)} créditos`}</strong><button class="v2-btn ${owned ? '' : 'v2-btn--primary'}" data-reward="${esc(item.id)}">${owned ? 'Abrir' : 'Canjear'}</button></footer></article>`;
  }

  async function renderCatalog(target, type) {
    target.innerHTML = `<div class="v2-shell">${compactHero(type === 'book' ? 'Libros' : 'Materiales','')}<div class="v2-loading">Cargando biblioteca…</div></div>`;
    await loadRewards();
    const draw = () => {
      const items = state.catalog.filter(item => item.type === type);
      const isBook = type === 'book';
      if (isBook) {
        target.innerHTML = `<div class="v2-shell"><div class="books-page"><section class="books-hero"><div class="books-hero__copy"><div class="books-kicker">${icon('i-book-2')}Biblioteca IMDIIL</div><h1>Tu biblioteca técnica.</h1><p>Canjea créditos por libros que conservarás en tu cuenta para siempre.</p></div><button class="credit-wallet" type="button" data-go-credits><div class="credit-wallet__label">Saldo</div><div class="credit-wallet__value"><span class="credit-coin">C</span><span>${fmt(state.balance)}</span></div><p class="credit-wallet__sub">Créditos IMDIIL</p></button></section><div class="books-head"><div><span>Catálogo canjeable</span><h2>Elige tu próximo libro</h2></div><div class="books-head__side"><small>${items.length} disponibles · ${items.filter(item => state.owned.has(item.id)).length} canjeados</small><button class="v2-btn" data-refresh>${icon('i-refresh')} Actualizar</button></div></div><div class="book-shelf">${items.map(rewardCard).join('') || '<div class="v2-empty">Muy pronto publicaremos nuevos libros aquí.</div>'}</div></div></div>`;
      } else {
        const owned = items.filter(item => state.owned.has(item.id)).length;
        target.innerHTML = `<div class="v2-shell"><div class="books-page"><section class="books-hero books-hero--tools"><div class="books-hero__copy"><div class="books-kicker">${icon('i-tools')}Herramientas premium IMDIIL</div><h1>Herramientas para tu planta.</h1><p>Canjea créditos por herramientas y plantillas que se abren aquí mismo y quedan en tu cuenta para siempre.</p></div><button class="credit-wallet" type="button" data-go-credits><div class="credit-wallet__label">Saldo</div><div class="credit-wallet__value"><span class="credit-coin">C</span><span>${fmt(state.balance)}</span></div><p class="credit-wallet__sub">Créditos IMDIIL</p></button></section><div class="books-head"><div><span>Catálogo canjeable</span><h2>Elige tu próxima herramienta</h2></div><div class="books-head__side"><small>${items.length} disponibles · ${owned} desbloqueadas</small><button class="v2-btn" data-refresh>${icon('i-refresh')} Actualizar</button></div></div><div class="mat-shelf ${items.some(toolCoverUrl) ? 'mat-shelf--tools' : ''}">${items.map(rewardCard).join('') || '<div class="v2-empty">Muy pronto publicaremos nuevas herramientas aquí.</div>'}</div></div></div>`;
      }
      target.querySelector('[data-go-credits]')?.addEventListener('click', () => (window.IMDIILCredits?.openWallet ? window.IMDIILCredits.openWallet() : go('retos')));
      target.querySelector('[data-refresh]')?.addEventListener('click', async () => { await loadRewards(true); draw(); });
      target.querySelectorAll('[data-open-reward]').forEach(card => card.addEventListener('click', () => {
        const item = state.catalog.find(entry => entry.id === card.dataset.openReward);
        if (item) redeem(item, draw);
      }));
    };
    draw();
  }

  function challengeKey() { return `imdiil_v2_challenges_${window.UserState?.uid || 'demo'}`; }
  function challengeState() { try { return JSON.parse(localStorage.getItem(challengeKey()) || '{}'); } catch (_) { return {}; } }
  function saveChallenges(value) { localStorage.setItem(challengeKey(), JSON.stringify(value)); window.__scheduleLearningSync?.(); }

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
        window.IMDIILCredits?.reto?.(item.id, selected);
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
    target.innerHTML = `<div class="v2-shell">${compactHero('Retos',completed ? 'Sigue aplicando criterio a situaciones reales.' : 'Tres ejercicios breves para poner en práctica lo aprendido.',`<div class="v2-hero-score"><strong>${completed}/${CHALLENGES.length}</strong><span>completados</span></div>`,'dark')}<section class="v2-mission-overview"><div><span class="v2-kicker">RUTA PRÁCTICA</span><h2>Decisiones de planta</h2><p>Resuelve cada situación y conserva tu avance.</p></div><div class="v2-mission-overview__progress"><span><i style="width:${pct}%"></i></span><strong>${pct}%</strong></div></section><div class="v2-mission-grid">${CHALLENGES.map((item,index) => `<article class="v2-mission ${progress[item.id]?.completed ? 'is-complete' : ''}"><div class="v2-mission__icon">${item.icon}</div><div><span>${esc(item.label)} · 0${index + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div><button data-open-challenge="${item.id}">${progress[item.id]?.completed ? 'Repetir' : 'Comenzar'} →</button></article>`).join('')}</div><section class="v2-retos-wallet" data-retos-wallet>${creditSectionsHtml()}</section></div>`;
    target.querySelectorAll('[data-open-challenge]').forEach(button => button.addEventListener('click', () => renderChallengeStage(target, CHALLENGES.find(item => item.id === button.dataset.openChallenge))));
    bindCreditSections(target);
    // Saldo y movimientos reales (como en SYNOVA: la cartera vive dentro de Retos).
    loadRewards(true).then(() => {
      const wallet = target.querySelector('[data-retos-wallet]');
      if (!wallet || !document.body.contains(wallet)) return;
      wallet.innerHTML = creditSectionsHtml();
      bindCreditSections(wallet);
    });
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
      target.innerHTML = `<div class="v2-shell">${compactHero('Mis cursos','Aprende a tu ritmo y continúa desde tu última clase.',`<div class="v2-course-hero-stats"><strong>${rows.length}</strong><span>rutas disponibles</span></div>`,'dark')}<div class="v2-course-controls"><div class="v2-segmented"><button class="${state.courseFilter === 'all' ? 'is-active' : ''}" data-filter="all">Todos</button><button class="${state.courseFilter === 'progress' ? 'is-active' : ''}" data-filter="progress">En curso</button><button class="${state.courseFilter === 'completed' ? 'is-active' : ''}" data-filter="completed">Completados</button></div><label class="v2-search">${icon('i-search')}<input value="${esc(state.courseSearch)}" placeholder="Buscar curso"></label></div>${window.__IMDIIL_FREE_COURSE?.bannerHtml?.() || ''}<div class="v2-course-grid">${visible.map(row => courseCard(row)).join('') || '<div class="v2-empty">No hay cursos con esos filtros.</div>'}</div></div>`;
      target.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.courseFilter = button.dataset.filter; draw(); }));
      target.querySelector('.v2-search input')?.addEventListener('input', event => { state.courseSearch = event.target.value; draw(); requestAnimationFrame(() => { const input = target.querySelector('.v2-search input'); input?.focus(); input?.setSelectionRange(input.value.length,input.value.length); }); });
      target.querySelectorAll('[data-course]').forEach(card => card.addEventListener('click', () => {
        const row = rows.find(entry => String(entry.course.id) === card.dataset.course);
        // Cuenta nueva sin curso gratis elegido: tocar un curso abre la confirmación (igual que IMFRA).
        const freeCourse = window.__IMDIIL_FREE_COURSE;
        if (row && freeCourse?.pendiente?.() && freeCourse.puedeSerGratis?.(row.course)) {
          freeCourse.confirmar(row.course, chosen => go(courseRoute(chosen.id)));
          return;
        }
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

  function quizKey(courseId, lessonNumber) {
    return `imdiil:class-quiz:${window.UserState?.uid || 'demo'}:${courseId}:${lessonNumber}`;
  }

  function normalizeQuizQuestion(item) {
    if (!item) return null;
    const options = item.options || item.opciones;
    const question = item.q || item.pregunta || item.question;
    if (!question || !Array.isArray(options) || options.length < 2) return null;
    const answer = Number(item.answer ?? item.correcta ?? item.correct ?? 0);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
    return {
      q:String(question),
      options:options.map(String),
      answer,
      explanation:String(item.explanation || item.explicacion || 'La respuesta marcada en verde aplica el criterio correcto de esta clase.')
    };
  }

  function lessonQuizQuestions(course, lesson, lessonNumber) {
    const custom = lesson?.quiz || lesson?.cuestionario || lesson?.ejercicio || lesson?.exercise;
    const customList = (Array.isArray(custom) ? custom : custom ? [custom] : []).map(normalizeQuizQuestion).filter(Boolean);
    const seed = [...`${course.id}:${lessonNumber}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const editorial = customList.filter((item, index, list) => list.findIndex(other => other.q === item.q) === index);
    const result = editorial.slice(0,3);
    for (let offset = 0; result.length < 3 && offset < QUIZZES.length * 2; offset += 1) {
      const fallback = QUIZZES[(seed + offset * 3) % QUIZZES.length];
      if (!result.some(item => item.q === fallback.q)) result.push(fallback);
    }
    return result;
  }

  function rememberQuizPass(courseId, lessonNumber, score, total) {
    try { localStorage.setItem(quizKey(courseId,lessonNumber), JSON.stringify({ passed:true, score, total, completedAt:new Date().toISOString() })); } catch (_) { /* almacenamiento opcional */ }
    window.__scheduleLearningSync?.();
  }

  async function renderLesson(course, lessonIndex, target) {
    const api = bridge();
    const lesson = course.sesiones?.[lessonIndex];
    if (!lesson) return go(courseRoute(course.id));
    const status = courseStatus(api,course,lesson,lessonIndex);
    if (!status.unlocked) { window.Toast?.info?.('Clase bloqueada','Completa la clase anterior para continuar'); return go(courseRoute(course.id)); }
    const lessons = course.sesiones || [];
    const nextIndex = lessonIndex + 1 < lessons.length ? lessonIndex + 1 : -1;
    const pct = Math.round((lessonIndex + (status.viewed ? 1 : 0)) / Math.max(1,lessons.length) * 100);
    target.innerHTML = `<div class="v2-shell v2-lesson-page"><button class="v2-back" data-back-course>← ${esc(course.titulo || 'Curso')}</button><div class="v2-lesson-layout"><main><div class="v2-player"><div class="v2-player__status"><span class="v2-spinner"></span><strong>Cargando clase</strong><small>Preparando el reproductor protegido.</small></div><iframe title="${esc(lesson.titulo || 'Clase')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen hidden></iframe></div><section class="v2-lesson-heading"><div><span>CLASE ${String(lessonIndex + 1).padStart(2,'0')} DE ${String(lessons.length).padStart(2,'0')}</span><h1>${esc(lesson.titulo || `Clase ${lessonIndex + 1}`)}</h1><div class="v2-lesson-heading__bar"><i style="width:${pct}%"></i></div></div><button class="v2-complete ${status.viewed ? 'is-complete' : ''}" data-complete>${status.viewed ? 'Repasar evaluación' : 'Completar evaluación →'}</button></section>${nextIndex >= 0 ? `<button class="v2-next-lesson" data-next ${api.lessonUnlocked(course.id,nextIndex,lessons) ? '' : 'disabled'}><span>Después</span><strong>${esc(lessons[nextIndex]?.titulo || `Clase ${nextIndex + 1}`)}</strong><b>→</b></button>` : ''}<section class="v2-lesson-summary"><span class="v2-kicker">RESUMEN</span><h2>En esta clase</h2><p>${esc(lesson.descripcion || course.descripcion || course.desc || 'Revisa el contenido y completa la evaluación para registrar tu avance.')}</p><div><span>01</span><p>Observa el proceso y reconoce los criterios principales del tema.</p></div><div><span>02</span><p>Relaciona la explicación con una decisión real de operación.</p></div></section></main><aside class="v2-study-side"><div class="v2-study-tabs"><button class="is-active" data-study-tab="outline">Temario</button><button data-study-tab="notes">Notas</button><button data-study-tab="quiz">Evaluación</button></div><section class="is-active" data-study-panel="outline"><div class="v2-outline">${lessons.map((entry,index) => { const s = courseStatus(api,course,entry,index); return `<button class="${index === lessonIndex ? 'is-current' : ''} ${s.viewed ? 'is-complete' : ''}" data-outline="${index}" ${s.unlocked ? '' : 'disabled'}><span>${s.viewed ? '✓' : index + 1}</span><strong>${esc(entry.titulo || `Clase ${index + 1}`)}</strong></button>`; }).join('')}</div></section><section data-study-panel="notes"><label class="v2-notes">Mis notas<textarea placeholder="Escribe aquí tus ideas…">${esc(localStorage.getItem(noteKey(course.id,lessonIndex)) || '')}</textarea><small>Se guardan en este dispositivo.</small></label></section><section data-study-panel="quiz"><div class="v2-quiz-intro"><span>✓</span><h3>${status.viewed ? 'Evaluación aprobada' : 'Cierra la clase'}</h3><p>${status.viewed ? 'Tu avance está registrado. Puedes practicar otra vez.' : 'Responde 3 preguntas y acierta al menos 2.'}</p><button data-side-quiz>${status.viewed ? 'Practicar de nuevo' : 'Comenzar evaluación'}</button></div></section></aside></div></div>`;
    target.querySelector('[data-back-course]').addEventListener('click', () => go(courseRoute(course.id)));
    target.querySelectorAll('[data-study-tab]').forEach(button => button.addEventListener('click', () => { target.querySelectorAll('[data-study-tab]').forEach(item => item.classList.toggle('is-active',item === button)); target.querySelectorAll('[data-study-panel]').forEach(panel => panel.classList.toggle('is-active',panel.dataset.studyPanel === button.dataset.studyTab)); }));
    target.querySelectorAll('[data-outline]').forEach(button => button.addEventListener('click', () => go(lessonRoute(course.id,Number(button.dataset.outline)))));
    target.querySelector('.v2-notes textarea')?.addEventListener('input', event => localStorage.setItem(noteKey(course.id,lessonIndex),event.target.value));
    target.querySelector('[data-next]')?.addEventListener('click', () => go(lessonRoute(course.id,nextIndex)));
    const startQuiz = () => runQuiz(course,lesson,status.number,result => {
      if (status.viewed) {
        window.Toast?.success?.('Práctica terminada',`Resultado: ${result.score} de ${result.total}`);
        renderLesson(course,lessonIndex,target);
        return;
      }
      window.marcarClaseVista?.(course.id,status.number);
      window.Toast?.success?.('Clase completada','La siguiente clase ya puede abrirse');
      if (nextIndex >= 0) go(lessonRoute(course.id,nextIndex)); else go(courseRoute(course.id));
    });
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

  function runQuiz(course, lesson, lessonNumber, onPass) {
    const questions = lessonQuizQuestions(course,lesson,lessonNumber);
    let current = 0; let score = 0; let selected = false;
    const view = modal('Evaluación de la clase',`${lesson.titulo || `Clase ${lessonNumber}`} · necesitas 2 de 3.`, '<div data-quiz></div>', '<button class="v2-btn v2-btn--primary" data-next disabled>Siguiente</button>');
    const body = view.el.querySelector('[data-quiz]'); const next = view.el.querySelector('[data-next]');
    const draw = () => {
      const question = questions[current]; selected = false; next.disabled = true; next.textContent = current === questions.length - 1 ? 'Ver resultado' : 'Siguiente';
      body.innerHTML = `<span class="v2-kicker">PREGUNTA ${current + 1} DE ${questions.length}</span><h3>${esc(question.q)}</h3><div class="v2-quiz-options">${question.options.map((option,index) => `<button data-answer="${index}"><b>${String.fromCharCode(65 + index)}</b><span>${esc(option)}</span></button>`).join('')}</div><div class="v2-quiz-feedback" data-feedback aria-live="polite">Elige una respuesta para continuar.</div>`;
      body.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
        if (selected) return;
        selected = true;
        const answer = Number(button.dataset.answer);
        const correct = answer === question.answer;
        if (correct) score += 1;
        body.querySelectorAll('[data-answer]').forEach(item => item.disabled = true);
        button.classList.add(correct ? 'is-correct' : 'is-wrong');
        body.querySelector(`[data-answer="${question.answer}"]`)?.classList.add('is-correct');
        body.querySelector('[data-feedback]').innerHTML = `<strong>${correct ? 'Correcto.' : 'Revisa la respuesta marcada en verde.'}</strong> ${esc(question.explanation)}`;
        next.disabled = false;
      }));
      next.onclick = () => {
        if (!selected) return;
        if (current < questions.length - 1) { current += 1; draw(); return; }
        finish();
      };
    };
    const finish = () => {
      const total = questions.length;
      if (score >= 2) {
        rememberQuizPass(course.id,lessonNumber,score,total);
        body.innerHTML = `<span class="v2-success-mark">✓</span><h3>Evaluación aprobada</h3><p>Obtuviste ${score} de ${total} respuestas correctas. Tu avance quedó protegido.</p>`;
        next.disabled = false;
        next.textContent = 'Continuar';
        next.onclick = () => { view.close(); onPass({ score, total }); };
        return;
      }
      body.innerHTML = `<h3>Repasa e intenta de nuevo</h3><p>Obtuviste ${score} de ${total}. Necesitas al menos 2 respuestas correctas; tu avance anterior se conserva.</p>`;
      next.disabled = false;
      next.textContent = 'Reintentar';
      next.onclick = () => { current = 0; score = 0; draw(); };
    };
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

  // Cartera de créditos: saldo, accesos a premios y movimientos. Se muestra dentro de Retos.
  function creditSectionsHtml() {
    const history = state.history.length
      ? state.history.map(entry => `<article><span class="${Number(entry.amount) >= 0 ? 'is-positive' : ''}">${Number(entry.amount) >= 0 ? '+' : ''}${fmt(entry.amount)}</span><div><strong>${esc(historyLabel(entry))}</strong><small>${entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}) : 'Fecha pendiente'}</small></div></article>`).join('')
      : '<div class="v2-empty">Aún no hay movimientos registrados.</div>';
    return `<div class="v2-section-head"><div><h2>Mi cartera IMDIIL</h2><p>Gana créditos con clases y Retos, y canjéalos por libros y materiales.</p></div><button class="v2-btn" type="button" data-open-wallet>Ver mi cartera →</button></div><div class="v2-credit-layout"><section class="v2-credit-actions"><div class="v2-wallet-balance"><span>Saldo disponible</span><strong>${fmt(state.balance)}</strong><small>créditos</small></div><span class="v2-kicker">USAR CRÉDITOS</span><h2>Elige tu próxima recompensa</h2><div><button data-credit-go="libros"><span>▤</span><div><strong>Libros</strong><small>Biblioteca técnica · 800 créditos</small></div><b>→</b></button><button data-credit-go="pdfs"><span>⌁</span><div><strong>Materiales</strong><small>Herramientas premium · 250 créditos</small></div><b>→</b></button></div></section><section class="v2-credit-history"><div class="v2-section-head"><div><h2>Movimientos</h2><p>Últimos cambios registrados.</p></div></div><div>${history}</div></section></div>`;
  }

  function bindCreditSections(root) {
    root.querySelectorAll('[data-credit-go]').forEach(button => button.addEventListener('click', () => go(button.dataset.creditGo)));
    root.querySelectorAll('[data-open-wallet]').forEach(button => button.addEventListener('click', () => window.IMDIILCredits?.openWallet?.()));
  }

  // Enlaces viejos a #creditos llevan a Retos, donde ahora vive la cartera.
  function renderCredits(target) {
    renderChallenges(target);
    if (window.navigateToSection) setTimeout(() => window.navigateToSection('retos', { reemplazar:true }), 0);
  }


  function renderTools(target) {
    const cards = TOOLS.map(tool => `<article class="tool-card tool-card--pro" data-tool-route="${tool.route}"><span class="tool-card__cover"><span class="tool-card__frame"><img src="${esc(tool.cover)}" alt="${esc(tool.title)}: ${esc(tool.copy)}" loading="lazy" decoding="async"></span></span><span class="tool-card__foot"><span class="tool-card__state">${icon('i-check-circle')}Herramienta pro</span><button class="tool-card__btn is-primary" type="button" aria-label="Abrir ${esc(tool.title)}">Abrir</button></span></article>`).join('');
    target.innerHTML = `<div class="v2-shell">${compactHero('Herramientas','Cinco utilidades profesionales, reunidas en un solo lugar.','','dark')}<div class="mat-shelf mat-shelf--tools">${cards}</div></div>`;
    target.querySelectorAll('[data-tool-route]').forEach(card => card.addEventListener('click', () => go(card.dataset.toolRoute)));
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
    window.Sections.renderers.retos = window.IMDIILRetos?.render || renderChallenges;
    window.Sections.renderers.logros = renderProgress;
    window.Sections.renderers.herramientas = renderTools;
    if (!window.__abrirClaseIMDIILOriginal && typeof window.abrirClaseIMDIIL === 'function') window.__abrirClaseIMDIILOriginal = window.abrirClaseIMDIIL;
    window.abrirClaseIMDIIL = (courseId,lessonIndex) => go(lessonRoute(courseId,Number(lessonIndex) || 0));

    if (!installedOnce) {
      installedOnce = true;
      const current = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
      const v2Sections = new Set(['cursos','pdfs','libros','creditos','retos','logros','herramientas']);
      requestAnimationFrame(() => {
        const target = targetNode();
        if (!target || !current || current === 'inicio') return;
        if (/^curso\//.test(current)) {
          renderRoute(current,target);
          return;
        }
        if (v2Sections.has(current)) {
          target.innerHTML = '';
          window.Sections.renderers[current](target);
        }
      });
    }
  }

  // Cuando el saldo cambia fuera de esta capa (regalo, cortesía), se refleja en las vistas abiertas.
  window.addEventListener('imdiil:credits-changed', event => {
    const balance = Number(event.detail?.balance);
    if (!Number.isFinite(balance)) return;
    state.balance = Math.max(0, balance);
    state.loaded = false;
    document.querySelectorAll('.credit-wallet__value > span:last-child').forEach(el => { el.textContent = fmt(state.balance); });
  });

  window.IMDIILV2 = { openCourse, renderRoute, renderCourses, renderCatalog, renderChallenges, renderProgress, renderCredits, renderTools, install };
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install);
})();
