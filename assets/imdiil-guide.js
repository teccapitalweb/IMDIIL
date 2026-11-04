/* Guía virtual de IMDIIL · mismo motor que la guía de SYNOVA, con contenido de ingeniería industrial. */
(() => {
  'use strict';

  const config = window.IMDIIL_GUIDE_CONFIG;
  const knowledge = window.IMDIIL_GUIDE_KNOWLEDGE || {};
  if (!config || document.querySelector('[data-syg-root]')) return;

  const sessionKey = 'imdiil:guide:session:v2';
  const cookieKey = 'imdiil:privacy:consent:v1';
  const welcomeKey = 'imdiil:guide:welcome:v1';
  const positionKey = 'imdiil:guide:position:v2';
  const emergency = /(?:incendio|explosion|fuga\s+de\s+(?:gas|quimico|amoniaco)|derrame\s+(?:quimico|grande)|accidente\s+(?:grave|en\s+planta)|persona\s+(?:atrapada|herida|inconsciente)|no\s+respira|quemadura\s+grave|electrocut)/i;
  const stopwords = new Set(['quiero','curso','cursos','sobre','para','como','algo','una','uno','unos','unas','del','las','los','que','con','por','me','interesa','busco','aprender','capacitacion','tema','pregunta','industrial','industria','ingenieria']);

  let messages = [];
  let quickActions = [];
  let waiting = false;
  let motionTimer = 0;
  let ambientTimer = 0;
  let gazeTimer = 0;
  let ambientIndex = 0;
  let suppressLauncherClick = false;
  let positionBucket = window.innerWidth <= 760 ? 'mobile' : 'desktop';
  let route = { step:-1, answers:[], selections:[], result:[] };

  const courseImages = Object.freeze(Object.fromEntries((config.courses || []).map(course => [course.id, course.image])));
  window.IMDIIL_COURSE_IMAGES = courseImages; // también lo usa la encuesta del landing

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function characterMarkup(alt, variant) {
    const bust = variant === 'bust' && config.bustImage;
    const image = bust ? config.bustImage : config.image;
    const blinkImage = bust ? (config.bustBlinkImage || config.bustImage) : (config.blinkImage || config.image);
    return `<span class="syg-character${bust ? ' syg-character--bust' : ''}">
      <span class="syg-character__motion">
        <img class="syg-character__frame syg-character__frame--open" src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" decoding="async">
        <img class="syg-character__frame syg-character__frame--blink" src="${escapeHtml(blinkImage)}" alt="" aria-hidden="true" decoding="async" fetchpriority="low">
      </span>
    </span>`;
  }

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function timeLabel() {
    try { return new Intl.DateTimeFormat('es-MX', { hour:'2-digit', minute:'2-digit' }).format(new Date()); }
    catch (_) { return ''; }
  }

  function loadSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      if (Array.isArray(saved.messages)) messages = saved.messages.slice(-18);
    } catch (_) { messages = []; }
    if (!messages.length) messages = [{ role:'assistant', text:config.welcome, time:timeLabel() }];
  }

  function saveSession() {
    try { localStorage.setItem(sessionKey, JSON.stringify({ messages:messages.slice(-18) })); } catch (_) {}
  }

  function courseUrl(course) {
    const params = new URLSearchParams({ origen:'guia-imdiil', curso:course.id, programa:course.title });
    return `vip-auth.html?${params.toString()}`;
  }

  function courseImage(course) {
    return courseImages[course.id] || course.image || 'assets/img/banner.jpg';
  }

  function tokens(value) {
    return normalize(value).split(' ').filter(token => token.length > 2 && !stopwords.has(token));
  }

  function rankCourses(terms, limit = 3) {
    const wanted = Array.isArray(terms) ? terms : [terms];
    const queryTokens = [...new Set(wanted.flatMap(tokens))];
    return config.courses.map((course, index) => {
      const title = normalize(course.title);
      const haystack = normalize(`${course.title} ${course.area} ${course.detail} ${(course.tags || []).join(' ')}`);
      const titleWords = new Set(title.split(' '));
      const haystackWords = new Set(haystack.split(' '));
      const hasPhrase = (text, phrase) => (` ${text} `).includes(` ${phrase} `);
      const phraseScore = wanted.reduce((score, term) => {
        const phrase = normalize(term);
        if (!phrase) return score;
        return score + (hasPhrase(title, phrase) ? 14 : hasPhrase(haystack, phrase) ? 7 : 0);
      }, 0);
      const tokenScore = queryTokens.reduce((score, token) => score + (titleWords.has(token) ? 5 : haystackWords.has(token) ? 2 : 0), 0);
      return { course, score:phraseScore + tokenScore, index };
    }).filter(item => item.score > 0).sort((a,b) => b.score - a.score || a.index - b.index).slice(0, limit).map(item => item.course);
  }

  function findNamedCourses(names, limit = 3) {
    const selected = [];
    (names || []).forEach(name => {
      const needle = normalize(name);
      const exact = config.courses.find(course => normalize(course.title) === needle);
      const partial = exact || config.courses.find(course => normalize(course.title).includes(needle) || needle.includes(normalize(course.title)));
      if (partial && !selected.some(course => course.id === partial.id)) selected.push(partial);
    });
    return selected.slice(0, limit);
  }

  const root = document.createElement('div');
  root.className = 'syg-root';
  root.dataset.sygRoot = '';
  root.dataset.motion = 'idle';
  root.dataset.paused = 'false';
  root.innerHTML = `
    <button class="syg-launcher" type="button" aria-label="Abrir la guía virtual de IMDIIL">
      <span class="syg-launcher__halo" aria-hidden="true"></span>
      <span class="syg-launcher__avatar">${characterMarkup('Guía virtual de IMDIIL')}</span>
      <span class="syg-launcher__bubbles" aria-hidden="true">
        <span class="syg-launcher__bubble">¡Hola! Soy tu guía IMDIIL 👋</span>
        <span class="syg-launcher__bubble">Cuéntame qué quieres aprender o resolver.</span>
        <span class="syg-launcher__bubble syg-launcher__bubble--accent">Encuentra tu curso ideal <b>→</b></span>
      </span>
      <span class="syg-launcher__hint">Toca para conversar</span>
    </button>
    <section class="syg-panel" aria-label="Conversación con la guía virtual de IMDIIL" hidden>
      <header class="syg-header">
        <button class="syg-avatar" type="button" aria-label="Saludar a la guía">${characterMarkup('Guía virtual de IMDIIL', 'bust')}</button>
        <span class="syg-header__title"><strong>${escapeHtml(config.assistantName)}</strong><small>${escapeHtml(config.assistantLabel)}</small></span>
        <span class="syg-header__actions">
          <button class="syg-icon-btn" type="button" data-action="reset" aria-label="Empezar de nuevo" title="Empezar de nuevo">↻</button>
          <button class="syg-icon-btn" type="button" data-action="pause" aria-label="Pausar movimiento" title="Pausar movimiento">Ⅱ</button>
          <button class="syg-icon-btn" type="button" data-action="close" aria-label="Minimizar asistente" title="Minimizar">−</button>
        </span>
      </header>
      <div class="syg-disclosure">Orientación educativa con cursos reales de IMDIIL. No sustituye la asesoría técnica, legal o de seguridad de tu empresa. No escribas nombres ni datos identificables.</div>
      <div class="syg-messages" aria-live="polite"></div>
      <div class="syg-quick" aria-label="Opciones rápidas"></div>
      <form class="syg-composer">
        <label for="syg-input">Escribe tu pregunta</label>
        <input class="syg-input" id="syg-input" maxlength="240" autocomplete="off" placeholder="¿Qué te gustaría aprender?">
        <button class="syg-send" type="submit" aria-label="Enviar mensaje">↑</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const launcher = root.querySelector('.syg-launcher');
  const panel = root.querySelector('.syg-panel');
  const messageBox = root.querySelector('.syg-messages');
  const quickBox = root.querySelector('.syg-quick');
  const input = root.querySelector('.syg-input');
  const send = root.querySelector('.syg-send');
  let panelScrollY = 0;
  let panelBackgroundLocked = false;

  function lockPanelBackground() {
    if (window.innerWidth > 760 || panelBackgroundLocked) return;
    panelScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    document.body.style.setProperty('--syg-panel-scroll-top', `-${panelScrollY}px`);
    document.body.classList.add('syg-panel-open');
    panelBackgroundLocked = true;
  }

  function unlockPanelBackground() {
    if (!panelBackgroundLocked) return;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.body.classList.remove('syg-panel-open');
    document.body.style.removeProperty('--syg-panel-scroll-top');
    panelBackgroundLocked = false;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ left:0, top:panelScrollY, behavior:'auto' });
    if (previousScrollBehavior) document.documentElement.style.scrollBehavior = previousScrollBehavior;
    else document.documentElement.style.removeProperty('scroll-behavior');
  }

  function courseCards(items) {
    if (!items?.length) return '';
    return `<div class="syg-course-list">${items.map(course => `
      <a class="syg-course" href="${escapeHtml(courseUrl(course))}" aria-label="Ver ${escapeHtml(course.title)} y registrarme gratis">
        <span class="syg-course__cover"><img src="${escapeHtml(courseImage(course))}" alt="" loading="lazy"></span>
        <span class="syg-course__copy"><small>${escapeHtml(course.area)} · ${course.classes} módulo${course.classes === 1 ? '' : 's'}</small><strong>${escapeHtml(course.title)}</strong><em>${escapeHtml(course.detail)}</em></span>
        <span class="syg-course__arrow" aria-hidden="true">→</span>
      </a>`).join('')}</div>`;
  }

  function sourceCard(source) {
    if (!source?.items?.length) return '';
    return `<div class="syg-source"><span aria-hidden="true">ⓘ</span><span>Fuente: ${escapeHtml(source.name || 'IMDIIL')}. ${source.items.map(item => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Consultar: ${escapeHtml(item.title)}</a>`).join(' · ')}</span></div>`;
  }

  function renderMessages() {
    messageBox.innerHTML = messages.map(message => `
      <div class="syg-message syg-message--${message.role}">
        <div class="syg-message__bubble">
          ${message.role === 'assistant' ? `<span class="syg-message__label">GUÍA IMDIIL · ASISTENTE VIRTUAL</span>` : ''}
          ${escapeHtml(message.text)}
          ${courseCards(message.items)}
          ${sourceCard(message.source)}
          ${message.human ? `<div class="syg-source"><span aria-hidden="true">💬</span><span><a href="${escapeHtml(config.whatsappUrl)}" target="_blank" rel="noreferrer">Abrir WhatsApp con un asesor</a>. La conversación no se transfiere automáticamente.</span></div>` : ''}
          <span class="syg-message__time">${escapeHtml(message.time || '')}</span>
        </div>
      </div>`).join('') + (waiting ? `<div class="syg-message syg-message--assistant"><div class="syg-message__bubble"><span class="syg-message__label">La guía está buscando</span><span class="syg-thinking" aria-label="Preparando respuesta"><i></i><i></i><i></i></span></div></div>` : '');
    requestAnimationFrame(() => { messageBox.scrollTop = messageBox.scrollHeight; });
  }

  function setQuick(actions) {
    quickActions = actions || [];
    quickBox.innerHTML = quickActions.map((action, index) => `<button type="button" class="syg-chip${action.primary ? ' syg-chip--primary' : ''}" data-quick="${escapeHtml(action.value)}" data-index="${index}">${escapeHtml(action.label)}</button>`).join('');
  }

  function homeActions() {
    setQuick([
      { label:'Descubrir mi ruta', value:'route', primary:true },
      { label:'Buscar por tema', value:'courses' },
      { label:'Aprender conceptos', value:'concepts' },
      { label:'Conocer la membresía', value:'membership' },
      { label:'Resolver una duda', value:'question' },
      { label:'Hablar con un asesor', value:'human' }
    ]);
  }

  function setMotion(value, duration = 900) {
    clearTimeout(motionTimer);
    root.dataset.motion = value;
    if (value !== 'idle') motionTimer = window.setTimeout(() => { root.dataset.motion = 'idle'; }, duration);
  }

  function activeCharacter() {
    const host = panel.hidden ? launcher : panel;
    return host.querySelector('.syg-character');
  }

  function resetCharacterGaze(character = activeCharacter()) {
    if (!character) return;
    character.style.setProperty('--syg-look-x', '0px');
    character.style.setProperty('--syg-look-y', '0px');
    character.style.setProperty('--syg-look-r', '0deg');
  }

  function followPointer(event) {
    if (root.dataset.paused === 'true' || root.dataset.dragging === 'true') return;
    const character = activeCharacter();
    if (!character) return;
    const rect = character.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1)));
    const y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 1)));
    character.style.setProperty('--syg-look-x', `${(x * 5).toFixed(2)}px`);
    character.style.setProperty('--syg-look-y', `${(y * 3).toFixed(2)}px`);
    character.style.setProperty('--syg-look-r', `${(x * 1.5).toFixed(2)}deg`);
    window.clearTimeout(gazeTimer);
    gazeTimer = window.setTimeout(() => resetCharacterGaze(character), 650);
  }

  function scheduleAmbientMotion() {
    window.clearTimeout(ambientTimer);
    if (root.dataset.paused === 'true') return;
    const motions = [
      ['look-left', 1000],
      ['nod', 900],
      ['look-right', 1000],
      ['happy', 1050]
    ];
    ambientTimer = window.setTimeout(() => {
      if (root.dataset.paused !== 'true' && root.dataset.motion === 'idle') {
        const [motion, duration] = motions[ambientIndex % motions.length];
        ambientIndex += 1;
        setMotion(motion, duration);
      }
      scheduleAmbientMotion();
    }, 4200 + Math.round(Math.random() * 2400));
  }

  function openAssistant() {
    launcher.hidden = true;
    panel.hidden = false;
    lockPanelBackground();
    restorePosition(panel, 'panel');
    renderMessages();
    if (!quickActions.length) homeActions(); else setQuick(quickActions);
    setMotion('wave');
    window.setTimeout(() => input.focus(), 120);
  }

  function closeAssistant() {
    panel.hidden = true;
    launcher.hidden = false;
    unlockPanelBackground();
    restorePosition(launcher, 'launcher');
    setMotion('wave');
  }

  function readPositions() {
    try { return JSON.parse(localStorage.getItem(positionKey) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function clampPosition(element, left, top) {
    const rect = element.getBoundingClientRect();
    const margin = 8;
    return {
      left:Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin)),
      top:Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))
    };
  }

  function placeElement(element, left, top) {
    if (element === panel && window.innerWidth <= 760) {
      const currentWidth = element.getBoundingClientRect().width;
      if (currentWidth) element.style.width = `${Math.round(currentWidth)}px`;
    }
    const next = clampPosition(element, left, top);
    element.style.left = `${Math.round(next.left)}px`;
    element.style.top = `${Math.round(next.top)}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    return next;
  }

  function restorePosition(element, name) {
    const saved = readPositions()[`${name}:${positionBucket}`];
    if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) {
      element.style.removeProperty('left');
      element.style.removeProperty('top');
      element.style.removeProperty('right');
      element.style.removeProperty('bottom');
      element.style.removeProperty('width');
      return;
    }
    requestAnimationFrame(() => placeElement(element, saved.left, saved.top));
  }

  function savePosition(name, position) {
    try {
      const saved = readPositions();
      saved[`${name}:${positionBucket}`] = position;
      localStorage.setItem(positionKey, JSON.stringify(saved));
    } catch (_) {}
  }

  function makeDraggable(element, handle, name) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (name === 'panel' && event.target.closest('button,a,input'))) return;
      const rect = element.getBoundingClientRect();
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY, left:rect.left, top:rect.top, moved:false };
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      root.dataset.dragging = 'true';
      event.preventDefault();
      placeElement(element, drag.left + dx, drag.top + dy);
    });
    const finish = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const moved = drag.moved;
      drag = null;
      root.dataset.dragging = 'false';
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      if (!moved) return;
      const rect = element.getBoundingClientRect();
      savePosition(name, { left:rect.left, top:rect.top });
      if (name === 'launcher') {
        suppressLauncherClick = true;
        window.setTimeout(() => { suppressLauncherClick = false; }, 80);
      }
      event.preventDefault();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function addMessage(role, text, extra = {}) {
    messages.push({ role, text:String(text || ''), time:timeLabel(), ...extra });
    messages = messages.slice(-18);
    saveSession();
    renderMessages();
  }

  function reply(text, extra = {}) {
    waiting = false;
    send.disabled = false;
    addMessage('assistant', text, extra);
    setMotion(extra.items?.length ? 'course' : 'answer', extra.items?.length ? 1200 : 760);
  }

  function setWaiting(value) {
    waiting = value;
    send.disabled = value;
    renderMessages();
    if (value) setMotion('think', 16000);
  }

  function findConcept(value) {
    const normalized = normalize(value);
    let best = null;
    let bestScore = 0;
    Object.values(knowledge).forEach(concept => {
      (concept.aliases || []).forEach(alias => {
        const key = normalize(alias);
        const score = normalized === key ? 100 : normalized.includes(key) ? 60 + key.length : key.includes(normalized) && normalized.length > 3 ? 30 : 0;
        if (score > bestScore) { best = concept; bestScore = score; }
      });
    });
    return best;
  }

  function explainConcept(concept) {
    const recommendations = findNamedCourses(concept.courses || [], 3);
    const suffix = recommendations.length ? '\n\nPara llevar este tema a la práctica, te recomiendo estos cursos del Club VIP:' : '';
    reply(`${concept.answer}${suffix}`, { items:recommendations });
    setQuick([
      { label:'Explorar otro concepto', value:'concepts' },
      { label:'Buscar otro curso', value:'courses' },
      { label:'Preparar mi ruta', value:'route', primary:true },
      { label:'Volver al menú', value:'home' }
    ]);
  }

  function explainMembership() {
    reply('El Club VIP de IMDIIL reúne el catálogo completo de cursos de ingeniería industrial, logística y normatividad, clases en vivo, materiales, herramientas premium, libros y certificados con folio verificable. Puedes crear una cuenta gratis y después activar la membresía que mejor se adapte a tu ritmo.', { items:config.courses.slice(0, 2) });
    setQuick([
      { label:'Preparar mi ruta', value:'route', primary:true },
      { label:'Explorar cursos', value:'courses' },
      { label:'Hablar con un asesor', value:'human' },
      { label:'Volver al menú', value:'home' }
    ]);
  }

  function showConcepts() {
    reply('Puedo explicar conceptos de ingeniería industrial con lenguaje claro y conectarlos con una ruta de capacitación. Elige uno o escribe cualquier otro tema.');
    setQuick([
      { label:'¿Qué es Lean?', value:'ask:¿Qué es Lean Manufacturing?' },
      { label:'Kaizen', value:'ask:¿Qué es Kaizen?' },
      { label:'OEE', value:'ask:¿Qué es el OEE?' },
      { label:'Six Sigma y DMAIC', value:'ask:Explícame Six Sigma' },
      { label:'Incoterms', value:'ask:¿Qué son los Incoterms?' },
      { label:'Escribir otro tema', value:'question' }
    ]);
  }

  function showCourseTopics() {
    reply('¿Qué área te interesa? Buscaré dentro de los cursos reales que están en el Club VIP.');
    setQuick([
      { label:'Producción y mejora', value:'search:lean kaizen mejora produccion' },
      { label:'Calidad e inspección', value:'search:calidad inspeccion defectos' },
      { label:'Logística y aduanas', value:'search:logistica inventarios aduanas' },
      { label:'Normatividad y seguridad', value:'search:normatividad seguridad stps' },
      { label:'Costos y proyectos', value:'search:costos proyectos compras' },
      { label:'Procesos de manufactura', value:'search:manufactura inyeccion fundicion' }
    ]);
  }

  function searchCourses(value) {
    const results = rankCourses(value, 3);
    if (!results.length) {
      reply('No encontré una coincidencia exacta en el catálogo actual, pero puedo ayudarte a afinar la búsqueda por área o preparar una ruta completa.');
      showCourseTopics();
      return;
    }
    reply(`Encontré ${results.length === 1 ? 'un curso relacionado' : 'estos cursos relacionados'} dentro del Club VIP. Puedes abrir cualquiera para registrarte y ver su acceso:`, { items:results });
    setQuick([
      { label:'Buscar otro tema', value:'courses' },
      { label:'Preparar mi ruta', value:'route', primary:true },
      { label:'Conocer la membresía', value:'membership' }
    ]);
  }

  async function askTopic(value) {
    const related = rankCourses(value, 3);
    const text = related.length
      ? 'Aún no tengo una explicación guardada para ese tema, pero encontré formación relacionada dentro del Club VIP de IMDIIL:'
      : 'Aún no tengo información sobre ese tema. Puedo mostrarte conceptos frecuentes, buscar cursos por área o ponerte en contacto con un asesor.';
    reply(text, { items:related });
    setQuick([{ label:'Ver conceptos', value:'concepts' }, { label:'Buscar cursos', value:'courses' }, { label:'Preparar mi ruta', value:'route', primary:true }, { label:'Hablar con un asesor', value:'human' }]);
  }

  async function handleInput(rawValue) {
    const value = String(rawValue || '').trim().slice(0, 240);
    if (!value || waiting) return;
    addMessage('user', value);
    input.value = '';
    const normalized = normalize(value);

    if (emergency.test(value)) {
      reply('Esto puede ser una emergencia. Llama ahora al 911, avisa a la brigada o al responsable de seguridad de tu planta y sigue su plan de emergencia. No retrases la atención por continuar este chat y actúa solo dentro de tu capacitación.');
      setQuick([{ label:'Hablar con un asesor de cursos', value:'human' }, { label:'Volver al menú', value:'home' }]);
      return;
    }

    if (/ruta|recomienda.*curso|que curso|por donde empiezo/.test(normalized)) { openRoute('welcome'); return; }
    if (/membresia|club vip|precio|suscripcion|que incluye/.test(normalized)) { explainMembership(); return; }
    if (/asesor|persona|whatsapp|contacto/.test(normalized)) { offerHuman(); return; }
    if (/catalogo|buscar curso|cursos de|curso sobre/.test(normalized)) { searchCourses(value); return; }

    const concept = findConcept(value);
    if (concept) { explainConcept(concept); return; }
    await askTopic(value);
  }

  function offerHuman() {
    reply('Puedes hablar con el equipo de IMDIIL por WhatsApp para resolver dudas sobre cursos, acceso o membresía. El botón abre una conversación nueva y no comparte automáticamente lo que escribiste aquí.', { human:true });
    setQuick([{ label:'Preparar mi ruta', value:'route', primary:true }, { label:'Buscar cursos', value:'courses' }, { label:'Volver al menú', value:'home' }]);
  }

  function resetConversation() {
    messages = [{ role:'assistant', text:'¡Hola! Soy la guía virtual de IMDIIL. Puedo explicarte temas de ingeniería industrial, recomendar cursos reales o preparar una ruta personalizada. ¿Qué te gustaría hacer?', time:timeLabel() }];
    saveSession();
    renderMessages();
    homeActions();
    setMotion('wave');
  }

  function runQuick(value) {
    if (value === 'home') { reply('Claro. ¿Qué te gustaría hacer ahora?'); homeActions(); return; }
    if (value === 'route') { openRoute('welcome'); return; }
    if (value === 'courses') { showCourseTopics(); return; }
    if (value === 'concepts') { showConcepts(); return; }
    if (value === 'membership') { explainMembership(); return; }
    if (value === 'human') { offerHuman(); return; }
    if (value === 'question') { reply('Escribe el tema o la definición que quieres consultar. Para proteger tu privacidad, evita nombres, teléfonos y datos identificables.'); setQuick([{ label:'Lean', value:'ask:¿Qué es Lean Manufacturing?' }, { label:'Inventarios', value:'ask:¿Cómo se controlan los inventarios?' }, { label:'STPS y SIRCE', value:'ask:¿Qué es el SIRCE de la STPS?' }]); input.focus(); return; }
    if (value.startsWith('ask:')) { void handleInput(value.slice(4)); return; }
    if (value.startsWith('search:')) { searchCourses(value.slice(7)); return; }
  }

  launcher.addEventListener('click', event => {
    if (suppressLauncherClick) { event.preventDefault(); return; }
    openAssistant();
  });
  makeDraggable(launcher, launcher, 'launcher');
  makeDraggable(panel, root.querySelector('.syg-header'), 'panel');
  launcher.addEventListener('pointermove', followPointer);
  panel.addEventListener('pointermove', followPointer);
  launcher.addEventListener('pointerleave', () => resetCharacterGaze(launcher.querySelector('.syg-character')));
  panel.addEventListener('pointerleave', () => resetCharacterGaze(panel.querySelector('.syg-character')));
  restorePosition(launcher, 'launcher');
  window.addEventListener('resize', () => {
    const visible = panel.hidden ? launcher : panel;
    const nextBucket = window.innerWidth <= 760 ? 'mobile' : 'desktop';
    if (!panel.hidden) {
      if (nextBucket === 'mobile') lockPanelBackground();
      else unlockPanelBackground();
    }
    if (nextBucket !== positionBucket) {
      positionBucket = nextBucket;
      restorePosition(visible, panel.hidden ? 'launcher' : 'panel');
      return;
    }
    const rect = visible.getBoundingClientRect();
    if (rect.width && rect.height) placeElement(visible, rect.left, rect.top);
  }, { passive:true });
  root.querySelector('.syg-avatar').addEventListener('click', () => setMotion('wave'));
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') closeAssistant();
    if (action === 'reset') resetConversation();
    if (action === 'pause') {
      const paused = root.dataset.paused !== 'true';
      root.dataset.paused = String(paused);
      const button = root.querySelector('[data-action="pause"]');
      button.textContent = paused ? '▶' : 'Ⅱ';
      button.setAttribute('aria-label', paused ? 'Reanudar movimiento' : 'Pausar movimiento');
      if (paused) {
        window.clearTimeout(ambientTimer);
        resetCharacterGaze();
      } else {
        setMotion('wave');
        scheduleAmbientMotion();
      }
    }
    const quick = event.target.closest('[data-quick]');
    if (quick) runQuick(quick.dataset.quick);
  });
  root.querySelector('.syg-composer').addEventListener('submit', event => { event.preventDefault(); void handleInput(input.value); });

  const routeRoot = document.createElement('div');
  routeRoot.className = 'syg-route';
  routeRoot.dataset.sygRoute = '';
  routeRoot.hidden = true;
  routeRoot.innerHTML = '<section class="syg-route__dialog" role="dialog" aria-modal="true" aria-labelledby="syg-route-title"><button class="syg-route__close" type="button" aria-label="Cerrar cuestionario">×</button><div class="syg-route__content"></div></section>';
  document.body.appendChild(routeRoot);
  const routeContent = routeRoot.querySelector('.syg-route__content');

  // ── Guardado de la ruta (aparece en el admin: Marketing → Encuestas → Ruta de la guía) ──
  // Un registro por intento, sin nombre ni teléfono: descartada, parcial o completada.
  const RUTA_API = `${config.apiBase}/api/encuesta/ruta`;
  const CLAVES_RUTA = (config.survey.questions || []).map(q => q.id); // profile, experience, interest, goal, need, format, time
  const RUTA_SID_KEY = 'imdiil:guide:sid';
  const RUTA_PEND_KEY = 'imdiil:guide:ruta-pend';
  const nuevoId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  function rutaSid() {
    try { let v = localStorage.getItem(RUTA_SID_KEY); if (!v) { v = nuevoId(); localStorage.setItem(RUTA_SID_KEY, v); } return v; } catch (_) { return nuevoId(); }
  }
  function leerPendRuta() { try { const l = JSON.parse(localStorage.getItem(RUTA_PEND_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; } }
  function escribirPendRuta(l) { try { if (l.length) localStorage.setItem(RUTA_PEND_KEY, JSON.stringify(l.slice(-10))); else localStorage.removeItem(RUTA_PEND_KEY); } catch (_) {} }
  function postRuta(cuerpo) {
    return fetch(RUTA_API, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(cuerpo), keepalive:true })
      .then(r => { if (!r.ok && r.status >= 500) throw new Error('HTTP ' + r.status); return true; });
  }
  function enviarRuta(estado, extra) {
    if (!route.intento) return;
    const respuestas = {};
    (route.selections || []).forEach((sel, i) => { if (sel && CLAVES_RUTA[i]) respuestas[CLAVES_RUTA[i]] = sel.label; });
    const cuerpo = { intentoId:route.intento, sessionId:rutaSid(), estado, respuestas, pagina:(location.pathname.split('/').pop() || 'index.html'), ...(extra || {}) };
    const firma = JSON.stringify(cuerpo);
    if (route.ultimoEnvio === firma) return; // nada nuevo que guardar
    route.ultimoEnvio = firma;
    postRuta(cuerpo).catch(() => {
      // Sin conexión: se guarda y se reintenta en la siguiente visita (el servidor reemplaza el intento, no lo duplica)
      escribirPendRuta([...leerPendRuta().filter(x => !(x.intentoId === cuerpo.intentoId && x.estado === cuerpo.estado)), cuerpo]);
    });
  }
  function reintentarRutas() {
    const pend = leerPendRuta();
    if (!pend.length) return;
    escribirPendRuta([]);
    pend.forEach(c => postRuta(c).catch(() => escribirPendRuta([...leerPendRuta(), c])));
  }
  function guardarAvanceRuta() {
    if (!route.intento || route.completada) return;
    if (route.empezo) enviarRuta('parcial');
    else enviarRuta('descartada');
  }
  window.setTimeout(reintentarRutas, 2500);
  window.addEventListener('pagehide', () => { if (!routeRoot.hidden) guardarAvanceRuta(); });

  function renderRouteWelcome() {
    const survey = config.survey;
    routeContent.innerHTML = `
      <div class="syg-route__mascot">${characterMarkup('Guía virtual de IMDIIL')}</div>
      <p class="syg-route__eyebrow">${escapeHtml(survey.eyebrow)}</p>
      <h2 id="syg-route-title">${escapeHtml(survey.title)}</h2>
      <p class="syg-route__lead">${escapeHtml(survey.detail)}</p>
      <div class="syg-route__badges"><span>Sin nombre</span><span>Sin teléfono</span><span>Resultado inmediato</span><span>7 preguntas</span></div>
      <div class="syg-route__actions"><button class="syg-btn syg-btn--primary" type="button" data-route-action="start">Preparar mi ruta <span aria-hidden="true">→</span></button><button class="syg-btn" type="button" data-route-action="dismiss">Ahora no</button></div>`;
  }

  function renderRouteQuestion() {
    const question = config.survey.questions[route.step];
    const percent = Math.round(((route.step + 1) / config.survey.questions.length) * 100);
    routeContent.innerHTML = `
      <div class="syg-progress"><div class="syg-progress__meta"><span>Pregunta ${route.step + 1} de ${config.survey.questions.length}</span><span>${percent}%</span></div><div class="syg-progress__bar"><span style="width:${percent}%"></span></div></div>
      <div class="syg-route__question">
        <p class="syg-route__eyebrow">${escapeHtml(question.overline)}</p>
        <h2 id="syg-route-title">${escapeHtml(question.title)}</h2>
        <p class="syg-route__lead">${escapeHtml(question.detail)}</p>
        <div class="syg-options">${question.options.map((option, index) => `<button class="syg-option" type="button" data-option="${index}"><span class="syg-option__icon">${escapeHtml(option.icon)}</span><span><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.detail)}</small></span><span class="syg-option__radio" aria-hidden="true"></span></button>`).join('')}</div>
        <div class="syg-route__footer"><button class="syg-btn" type="button" data-route-action="back">← Volver</button><span>Elige una respuesta y avanzamos automáticamente</span></div>
      </div>`;
  }

  function buildRouteProfile() {
    const pick = id => (route.selections || [])[(config.survey.questions || []).findIndex(q => q.id === id)]?.label;
    const identity = pick('profile') || 'Busco cambiar de área';
    const level = pick('experience') || 'Menos de 3 años';
    const objective = pick('goal') || 'Crecer o conseguir un ascenso';
    const challenge = pick('need') || 'Encontrar la causa de los problemas';

    const identityTraits = {
      'Estoy estudiando':['Curiosidad formativa','Estás construyendo bases sólidas y haces preguntas antes de llevarlas a la planta.'],
      'Operador o técnico':['Conocimiento del piso','Conoces el proceso desde adentro, y eso vale oro para cualquier mejora.'],
      'Supervisor o líder de turno':['Visión de equipo','Piensas en metas, personas y seguridad al mismo tiempo.'],
      'Ingeniero o analista':['Pensamiento analítico','Buscas entender el sistema completo y decidir con datos.'],
      'Gerente o dueño de empresa':['Visión de negocio','Conectas la operación con costos, cumplimiento y resultados.'],
      'Busco cambiar de área':['Apertura al aprendizaje','Te atreves a explorar una industria nueva con actitud de crecimiento.']
    };
    const challengeTraits = {
      'Cumplir metas de producción':['Orientación a resultados','Te enfocas en entregar a tiempo y con el equipo disponible.'],
      'Encontrar la causa de los problemas':['Mentalidad de causa raíz','No te conformas con apagar fuegos: quieres corregir de fondo.'],
      'Dominar una técnica o proceso':['Enfoque práctico','Valoras la precisión y la repetición consciente.'],
      'Ordenar documentos y evidencias':['Disciplina y orden','Sabes que lo que no se documenta, no se puede demostrar.'],
      'Liderar a mi equipo':['Liderazgo en formación','Quieres que tu equipo crezca contigo.'],
      'Controlar costos e indicadores':['Decisiones con datos','Mides antes de opinar y cuidas cada recurso.']
    };
    const objectiveTraits = {
      'Crecer o conseguir un ascenso':['Proyección profesional','Ves la capacitación como una vía clara para crecer.'],
      'Certificar lo que sé':['Orientación al logro','Quieres convertir tu experiencia en una evidencia verificable.'],
      'Reducir costos y desperdicios':['Mentalidad de mejora','Buscas resultados medibles que se noten en la planta.'],
      'Cumplir una auditoría o norma':['Compromiso con el cumplimiento','Te anticipas a las revisiones en lugar de reaccionar.'],
      'Conseguir empleo en la industria':['Iniciativa','Te preparas antes de que llegue la oportunidad.']
    };
    const levelGrowth = {
      'Comenzar desde cero':['Fundamentos industriales','Consolida lenguaje, indicadores básicos y la lógica de un proceso antes de subir la dificultad.'],
      'Menos de 3 años':['Del conocimiento a la práctica','Tu siguiente paso es aplicar herramientas a problemas reales de tu área y medir el resultado.'],
      'De 3 a 10 años':['Estandarizar y liderar','Convierte lo que ya sabes en estándares, capacitación para otros y proyectos de mejora.'],
      'Más de 10 años':['Actualización estratégica','Contrasta tu experiencia con metodologías actuales y llévala a decisiones de negocio.']
    };
    const challengeGrowth = {
      'Cumplir metas de producción':['Planeación de la carga','Practica balanceo, priorización y seguimiento por hora para anticipar retrasos.'],
      'Encontrar la causa de los problemas':['Análisis estructurado','Usa Ishikawa, 5 porqués y datos antes de proponer una solución.'],
      'Dominar una técnica o proceso':['Práctica deliberada','Trabaja con listas de verificación y ajusta un parámetro a la vez.'],
      'Ordenar documentos y evidencias':['Trazabilidad','Define formatos, responsables y frecuencias para que la evidencia exista siempre.'],
      'Liderar a mi equipo':['Comunicación y seguimiento','Refuerza juntas breves, metas visibles y retroalimentación oportuna.'],
      'Controlar costos e indicadores':['Indicadores accionables','Elige pocos indicadores, con meta y dueño, y revísalos con disciplina.']
    };

    const strengths = [identityTraits[identity], challengeTraits[challenge], objectiveTraits[objective]].filter(Boolean);
    const improvements = [levelGrowth[level], challengeGrowth[challenge]].filter(Boolean);
    return {
      headline:`Tu perfil combina ${strengths[0]?.[0]?.toLowerCase() || 'motivación'} y ${strengths[1]?.[0]?.toLowerCase() || 'aprendizaje continuo'}.`,
      summary:`Tus respuestas muestran una ruta con intención clara: ${objective.toLowerCase()}. La recomendación prioriza práctica aplicable en planta y un avance acorde con tu punto de partida.`,
      strengths,
      improvements
    };
  }

  function routeRecommendations() {
    const chosenTags = route.answers.flat();
    const wantsShort = chosenTags.includes('short');
    const wantsLong = chosenTags.includes('long');
    return config.courses.map((course, index) => {
      const score = (course.tags || []).reduce((sum, tag) => sum + chosenTags.filter(chosen => chosen === tag).length * 4, 0)
        + (wantsShort && course.classes <= 3 ? 3 : 0)
        + (wantsLong && course.classes >= 4 ? 2 : 0);
      return { course, score, index };
    }).sort((a,b) => b.score - a.score || a.index - b.index).slice(0, 3).map(item => item.course);
  }

  function renderRouteResult() {
    route.result = routeRecommendations();
    route.completada = true;
    enviarRuta('completada', { recomendados:route.result.map(c => c.title) });
    const profile = buildRouteProfile();
    try { localStorage.setItem(welcomeKey, 'completed'); } catch (_) {}
    routeContent.innerHTML = `
      <div class="syg-result__hero">
        <div><p class="syg-route__eyebrow">TU PERFIL FORMATIVO</p><h2 id="syg-route-title">${escapeHtml(profile.headline)}</h2><p>${escapeHtml(profile.summary)}</p></div>
        <div class="syg-result__mascot">${characterMarkup('Guía virtual de IMDIIL celebrando tu ruta')}</div>
      </div>
      <section class="syg-profile" aria-label="Fortalezas y áreas para mejorar">
        <div class="syg-profile__intro"><span>DIAGNÓSTICO DE APRENDIZAJE</span><h3>Lo que ya tienes y tu siguiente oportunidad.</h3><p>Este perfil no califica tu desempeño; convierte tus respuestas en una guía concreta para seguir creciendo.</p></div>
        <div class="syg-profile__grid">
          <article class="syg-profile__column syg-profile__column--strength"><span class="syg-profile__label">Tus cualidades</span>${profile.strengths.map(item => `<div class="syg-profile__item"><b aria-hidden="true">✓</b><span><strong>${escapeHtml(item[0])}</strong><small>${escapeHtml(item[1])}</small></span></div>`).join('')}</article>
          <article class="syg-profile__column syg-profile__column--growth"><span class="syg-profile__label">Lo que te conviene reforzar</span>${profile.improvements.map(item => `<div class="syg-profile__item"><b aria-hidden="true">↗</b><span><strong>${escapeHtml(item[0])}</strong><small>${escapeHtml(item[1])}</small></span></div>`).join('')}</article>
        </div>
      </section>
      <h3 class="syg-result__title">Tu ruta recomendada</h3>
      <p class="syg-result__lead">Seleccionamos cursos reales del Club VIP. Toca cualquier tarjeta para crear tu cuenta gratis y abrir el curso dentro del panel.</p>
      <div class="syg-result__courses">${route.result.map((course, index) => `<a class="syg-result-card${index === 0 ? ' is-featured' : ''}" data-route-course="${escapeHtml(course.title)}" href="${escapeHtml(courseUrl(course))}" aria-label="Ver ${escapeHtml(course.title)} y registrarme gratis"><span class="syg-result-card__cover"><img src="${escapeHtml(courseImage(course))}" alt="" loading="lazy"><em>${index === 0 ? 'MEJOR COINCIDENCIA' : escapeHtml(course.area)}</em></span><span class="syg-result-card__body"><small>${escapeHtml(course.area)} · ${course.classes} módulo${course.classes === 1 ? '' : 's'}</small><strong>${escapeHtml(course.title)}</strong><span>${escapeHtml(course.detail)}</span><b>Ver curso y registrarme gratis <i aria-hidden="true">→</i></b></span></a>`).join('')}</div>
      <div class="syg-route__actions"><button class="syg-btn syg-btn--primary" type="button" data-route-action="chat-result">Hablar con la guía</button><button class="syg-btn" type="button" data-route-action="restart">Repetir diagnóstico</button><a class="syg-btn syg-btn--ink" href="${escapeHtml(config.catalogUrl)}">Entrar al Club VIP →</a></div>`;
  }

  function openRoute(mode = 'welcome') {
    route = { step:mode === 'question' ? 0 : -1, answers:[], selections:[], result:[], intento:nuevoId(), empezo:mode === 'question' };
    routeRoot.hidden = false;
    document.body.classList.add('syg-lock');
    if (route.step < 0) renderRouteWelcome(); else renderRouteQuestion();
    setMotion('wave');
    routeRoot.querySelector('.syg-route__close').focus();
  }

  function closeRoute(dismiss = false) {
    guardarAvanceRuta();
    routeRoot.hidden = true;
    document.body.classList.remove('syg-lock');
    if (dismiss) { try { localStorage.setItem(welcomeKey, 'dismissed'); } catch (_) {} }
  }

  routeRoot.addEventListener('click', event => {
    const tarjeta = event.target.closest('[data-route-course]');
    if (tarjeta) enviarRuta('completada', { recomendados:route.result.map(c => c.title), cursoElegido:tarjeta.dataset.routeCourse });
    if (event.target === routeRoot || event.target.closest('.syg-route__close')) { closeRoute(true); return; }
    const action = event.target.closest('[data-route-action]')?.dataset.routeAction;
    if (action === 'start') { route.step = 0; route.empezo = true; renderRouteQuestion(); setMotion('wave'); return; }
    if (action === 'dismiss') { closeRoute(true); return; }
    if (action === 'back') {
      if (route.step <= 0) { route.step = -1; renderRouteWelcome(); }
      else { route.step -= 1; route.answers.pop(); route.selections.pop(); renderRouteQuestion(); }
      return;
    }
    if (action === 'restart') { route = { step:0, answers:[], selections:[], result:[], intento:nuevoId(), empezo:true }; renderRouteQuestion(); return; }
    if (action === 'chat-result') {
      const result = route.result.slice();
      closeRoute();
      openAssistant();
      reply('Ya tengo tu ruta. Estas son tus tres recomendaciones principales; puedes abrir cada curso y registrarte en el Club VIP:', { items:result });
      setQuick([{ label:'Buscar otro tema', value:'courses' }, { label:'Resolver una duda', value:'question' }, { label:'Hablar con un asesor', value:'human' }]);
      return;
    }
    const optionButton = event.target.closest('[data-option]');
    if (!optionButton) return;
    const question = config.survey.questions[route.step];
    const option = question.options[Number(optionButton.dataset.option)];
    if (!option) return;
    routeRoot.querySelectorAll('.syg-option').forEach(button => button.classList.remove('is-selected'));
    optionButton.classList.add('is-selected');
    route.answers[route.step] = option.tags || [];
    route.selections[route.step] = { label:option.label, detail:option.detail, tags:option.tags || [] };
    setMotion('answer');
    window.setTimeout(() => {
      route.step += 1;
      if (route.step >= config.survey.questions.length) renderRouteResult(); else renderRouteQuestion();
    }, 230);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!routeRoot.hidden) closeRoute(true);
    else if (!panel.hidden) closeAssistant();
  });

  function mountCookieNotice() {
    let accepted = false;
    try { accepted = Boolean(localStorage.getItem(cookieKey)) || /(?:^|;\s*)imdiil_privacy_consent=1(?:;|$)/.test(document.cookie); } catch (_) {}
    if (accepted) return;
    const notice = document.createElement('aside');
    notice.className = 'syg-cookie';
    notice.setAttribute('aria-label', 'Aviso de privacidad y almacenamiento local');
    notice.innerHTML = `<div><strong>Tu privacidad importa</strong><p>Usamos cookies y almacenamiento necesario para recordar tus preferencias, además de medición anónima para mejorar el sitio. ${config.privacyUrl ? `Consulta nuestro <a href="${escapeHtml(config.privacyUrl)}">Aviso de Privacidad</a>.` : ''}</p></div><button type="button">Acepto</button>`;
    document.body.appendChild(notice);
    document.body.classList.add('syg-cookie-open');
    notice.querySelector('button').addEventListener('click', () => {
      try { localStorage.setItem(cookieKey, JSON.stringify({ status:'accepted', at:new Date().toISOString() })); } catch (_) {}
      try { document.cookie = 'imdiil_privacy_consent=1; Max-Age=31536000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (_) {}
      notice.hidden = true;
      document.body.classList.remove('syg-cookie-open');
      window.dispatchEvent(new CustomEvent('imdiil:privacy-consent'));
      try { localStorage.setItem('imdiil-cookie-notice-v1', 'accepted'); } catch (_) {}
    });
  }

  loadSession();
  renderMessages();
  homeActions();
  mountCookieNotice();
  scheduleAmbientMotion();
  window.setTimeout(() => {
    let seen = false;
    try { seen = Boolean(localStorage.getItem(welcomeKey)); } catch (_) {}
    // Si la encuesta del landing está en la página, no se abre otra encuesta encima (la ruta sigue disponible desde la guía)
    if (!seen && panel.hidden && !document.getElementById('encuentra')) openRoute('welcome');
  }, 850);

  window.IMDIILGuide = Object.freeze({ open:openAssistant, openRoute, search:searchCourses, ask:handleInput });
})();
