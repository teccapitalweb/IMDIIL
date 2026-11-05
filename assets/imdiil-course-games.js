(function () {
  'use strict';

  const FALLBACK = [
    { q:'¿Qué convierte una observación en evidencia útil?', options:['Una opinión general','Un dato con condición, momento y contexto','Una fotografía sin referencia'], answer:1, explanation:'La evidencia debe poder revisarse y compararse; por eso necesita condición, momento y contexto.' },
    { q:'¿Qué hace verificable una acción de mejora?', options:['Que tenga responsable, fecha y resultado esperado','Que parezca urgente','Que se comunique en una reunión'], answer:0, explanation:'Una acción es verificable cuando se sabe quién la ejecuta, cuándo y qué resultado debe producir.' },
    { q:'¿Cuál es el mejor primer paso ante una desviación?', options:['Cambiar todo el proceso','Confirmar el problema con datos','Buscar un culpable'], answer:1, explanation:'Confirmar el problema con datos evita atacar síntomas o actuar por suposiciones.' },
    { q:'¿Qué ayuda a sostener una mejora en el tiempo?', options:['Una rutina con responsable y evidencia','Depender de la memoria del equipo','Agregar indicadores sin dueño'], answer:0, explanation:'La rutina, el responsable y la evidencia convierten la mejora en una práctica estable.' },
    { q:'¿Qué indicador permite comparar un proceso?', options:['Uno con fórmula, fuente, frecuencia y meta','Cualquier cifra disponible','Uno que cambie cada semana'], answer:0, explanation:'Una definición consistente permite comparar periodos y detectar cambios reales.' },
    { q:'Ante un riesgo importante, ¿qué debe quedar definido?', options:['Acción, responsable y señal de alerta','Sólo una reunión','Esperar a que ocurra'], answer:0, explanation:'El control preventivo necesita una acción concreta, un responsable y una señal que active la respuesta.' }
  ];
  const MODES = ['decision','connect','memory'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const hash = value => [...String(value || '')].reduce((sum,char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 7);
  const seededShuffle = (items, seedValue) => {
    const result = items.slice(); let seed = hash(seedValue) || 1;
    for (let i = result.length - 1; i > 0; i -= 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1); [result[i],result[j]] = [result[j],result[i]];
    }
    return result;
  };
  const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 3h3v11H5V7h3l1-3Z"/><path d="M9 11h6M12 8v6M8 18v2M16 18v2"/></svg>`;
  const helpIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .7-1.5 1.4-1.5 2.5h-4c0-1.1-.5-1.8-1.5-2.5Z"/></svg>`;

  function normalizeQuestion(item) {
    if (!item) return null;
    const q = item.q || item.pregunta || item.question;
    const options = item.options || item.opciones;
    const answer = Number(item.answer ?? item.correcta ?? item.correct ?? 0);
    if (!q || !Array.isArray(options) || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
    return { q:String(q), options:options.map(String), answer, explanation:String(item.explanation || item.explicacion || 'Esta opción aplica el criterio correcto de la clase.') };
  }

  function questionsFor(options) {
    const lesson = options.lesson || {};
    const custom = lesson.quiz || lesson.cuestionario || lesson.ejercicio || lesson.exercise;
    const supplied = Array.isArray(options.questions) ? options.questions : [];
    const editorial = supplied.concat(Array.isArray(custom) ? custom : custom ? [custom] : []).map(normalizeQuestion).filter(Boolean);
    const unique = editorial.filter((item,index,list) => list.findIndex(other => normalize(other.q) === normalize(item.q)) === index);
    const seed = `${options.course?.id || 'course'}:${options.lessonNumber || 1}`;
    const result = unique.slice(0,3);
    seededShuffle(FALLBACK,seed).forEach(item => { if (result.length < 3 && !result.some(other => other.q === item.q)) result.push(item); });
    return result.slice(0,3);
  }

  function lockPage() {
    const x = window.scrollX; const y = window.scrollY;
    const styles = { position:document.body.style.position, top:document.body.style.top, left:document.body.style.left, right:document.body.style.right, width:document.body.style.width, overflow:document.body.style.overflow };
    document.documentElement.classList.add('imdiil-course-game-open'); document.body.classList.add('imdiil-course-game-open');
    document.body.style.position='fixed'; document.body.style.top=`-${y}px`; document.body.style.left=`-${x}px`; document.body.style.right='0'; document.body.style.width='auto'; document.body.style.overflow='hidden';
    return () => { document.documentElement.classList.remove('imdiil-course-game-open'); document.body.classList.remove('imdiil-course-game-open'); Object.assign(document.body.style,styles); window.scrollTo(x,y); };
  }

  function createShell(options, mode, resolve) {
    document.querySelector('.icg-overlay')?.remove();
    const overlay = document.createElement('div'); overlay.className='icg-overlay';
    const lessonTitle = options.lesson?.titulo || `Clase ${options.lessonNumber || 1}`;
    const labels = { decision:'Decisión relámpago', connect:'Conecta conceptos', memory:'Memoria técnica' };
    overlay.innerHTML=`<section class="icg-shell" role="dialog" aria-modal="true" aria-labelledby="icg-title"><header class="icg-head"><span class="icg-head__mark">${icon}</span><div class="icg-head__copy"><span>MINI JUEGO DE CLASE · ${esc(labels[mode])}</span><h2 id="icg-title">${esc(lessonTitle)}</h2><p>${options.practice ? 'Modo práctica · tu avance ya está registrado' : 'Supera el juego para registrar la clase y abrir la siguiente'}</p></div><button class="icg-close" type="button" aria-label="Cerrar">×</button></header><div class="icg-progress"><i style="--progress:0%"></i></div><main class="icg-body"></main><footer class="icg-foot"><div class="icg-assist">${helpIcon}<span>¿Te atoraste? La ayuda completa un paso y no te quita avance.</span></div><div class="icg-actions"><button class="icg-btn icg-btn--help" type="button" data-help>Ayúdame</button><button class="icg-btn icg-btn--primary" type="button" data-next disabled>Siguiente</button></div></footer></section>`;
    document.body.appendChild(overlay);
    const restore = lockPage(); let settled=false;
    const finish = result => { if (settled) return; settled=true; document.removeEventListener('keydown',onKey,true); overlay.classList.add('is-closing'); setTimeout(()=>{ overlay.remove(); restore(); resolve(result); },190); };
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); finish({completed:false,closed:true}); } };
    document.addEventListener('keydown',onKey,true); overlay.querySelector('.icg-close').addEventListener('click',()=>finish({completed:false,closed:true}));
    return { overlay, body:overlay.querySelector('.icg-body'), help:overlay.querySelector('[data-help]'), next:overlay.querySelector('[data-next]'), progress:overlay.querySelector('.icg-progress i'), finish };
  }

  function success(shell, stats, options) {
    const stars = stats.mistakes === 0 ? 3 : stats.mistakes <= 2 ? 2 : 1;
    shell.progress.style.setProperty('--progress','100%'); shell.help.disabled=true;
    shell.body.innerHTML=`<div class="icg-success"><span class="icg-success__mark">✓</span><span class="icg-kicker">JUEGO COMPLETADO</span><h3 class="icg-title">¡Mini juego superado!</h3><p>${options.practice ? 'Terminaste la práctica. Tu avance anterior se mantiene.' : 'Aplicaste el criterio de la clase. Tu avance quedará registrado y la siguiente clase podrá abrirse.'}</p><div class="icg-stars" aria-label="${stars} de 3 estrellas">${[1,2,3].map(n=>`<span class="${n<=stars?'is-on':''}">★</span>`).join('')}</div></div>`;
    shell.next.disabled=false; shell.next.textContent=options.practice?'Terminar práctica':'Continuar';
    shell.next.onclick=()=>shell.finish({completed:true,score:stats.score,total:stats.total,assisted:stats.assisted,mode:stats.mode,mistakes:stats.mistakes}); shell.next.focus();
  }

  function runDecision(shell, questions, options) {
    const stats={score:0,total:questions.length,assisted:0,mistakes:0,mode:'decision'}; let index=0; let answered=false;
    const draw=()=>{ const q=questions[index]; answered=false; shell.progress.style.setProperty('--progress',`${Math.round(index/questions.length*100)}%`); shell.next.disabled=true; shell.next.textContent=index===questions.length-1?'Ver resultado':'Siguiente'; shell.help.disabled=false;
      shell.body.innerHTML=`<span class="icg-kicker">DECISIÓN ${index+1} DE ${questions.length}</span><h3 class="icg-title">${esc(q.q)}</h3><p class="icg-lead">Elige la opción que aplicarías en una situación real.</p><div class="icg-options">${q.options.map((answer,i)=>`<button class="icg-option" type="button" data-answer="${i}"><b>${String.fromCharCode(65+i)}</b><span>${esc(answer)}</span></button>`).join('')}</div><div class="icg-status" aria-live="polite">Analiza el criterio antes de responder.</div>`;
      const answer=(selected,assisted)=>{ if(answered)return; answered=true; const correct=selected===q.answer; if(correct)stats.score+=1; else stats.mistakes+=1; shell.body.querySelectorAll('[data-answer]').forEach(btn=>btn.disabled=true); const chosen=shell.body.querySelector(`[data-answer="${selected}"]`); chosen?.classList.add(correct?'is-correct':'is-wrong'); const good=shell.body.querySelector(`[data-answer="${q.answer}"]`); good?.classList.add('is-correct'); if(assisted)good?.classList.add('is-assisted'); const status=shell.body.querySelector('.icg-status'); status.className=`icg-status ${correct?'is-good':'is-error'}`; status.innerHTML=`<strong>${assisted?'Te ayudamos con este paso.':correct?'Correcto.':'Revisa la opción marcada en verde.'}</strong> ${esc(q.explanation)}`; shell.next.disabled=false; shell.help.disabled=true; };
      shell.body.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>answer(Number(btn.dataset.answer),false))); shell.help.onclick=()=>{stats.assisted+=1;answer(q.answer,true);};
      shell.next.onclick=()=>{ if(!answered)return; if(index<questions.length-1){index+=1;draw();}else success(shell,stats,options); };
    }; draw();
  }

  function runConnect(shell, questions, options) {
    const stats={score:questions.length,total:questions.length,assisted:0,mistakes:0,mode:'connect'}; const pairs=questions.map((q,index)=>({id:String(index),prompt:q.q,answer:q.options[q.answer],explanation:q.explanation})); const answers=seededShuffle(pairs,`${options.course?.id}:answers:${options.lessonNumber}`); const matched=new Set(); let activePrompt=''; let activeAnswer='';
    shell.body.innerHTML=`<span class="icg-kicker">RELACIONA 3 CONCEPTOS</span><h3 class="icg-title">Une cada situación con la decisión correcta</h3><p class="icg-lead">Selecciona una tarjeta de cada columna para formar la pareja.</p><div class="icg-connect"><div class="icg-column"><span>Situaciones</span>${pairs.map(pair=>`<button class="icg-match" type="button" data-prompt="${pair.id}">${esc(pair.prompt)}</button>`).join('')}</div><div class="icg-column"><span>Decisiones</span>${answers.map(pair=>`<button class="icg-match" type="button" data-answer="${pair.id}">${esc(pair.answer)}</button>`).join('')}</div></div><div class="icg-status" aria-live="polite">Elige una situación y después su decisión.</div>`;
    const status=shell.body.querySelector('.icg-status');
    const completePair=(id,assisted)=>{ matched.add(id); shell.body.querySelectorAll('.is-selected').forEach(btn=>btn.classList.remove('is-selected')); shell.body.querySelector(`[data-prompt="${id}"]`)?.classList.add('is-done'); shell.body.querySelector(`[data-answer="${id}"]`)?.classList.add('is-done'); shell.body.querySelectorAll(`[data-prompt="${id}"],[data-answer="${id}"]`).forEach(btn=>{btn.disabled=true;if(assisted)btn.classList.add('is-assisted');}); activePrompt='';activeAnswer=''; status.className='icg-status is-good'; status.textContent=assisted?'Completamos una pareja contigo. Puedes pedir ayuda otra vez.':'Pareja correcta. Continúa con las demás.'; shell.progress.style.setProperty('--progress',`${Math.round(matched.size/pairs.length*100)}%`); if(matched.size===pairs.length){shell.help.disabled=true;shell.next.disabled=false;shell.next.textContent='Ver resultado';} };
    const check=()=>{ if(!activePrompt||!activeAnswer)return; if(activePrompt===activeAnswer){completePair(activePrompt,false);return;} stats.mistakes+=1; const p=shell.body.querySelector(`[data-prompt="${activePrompt}"]`),a=shell.body.querySelector(`[data-answer="${activeAnswer}"]`); p?.classList.add('is-wrong');a?.classList.add('is-wrong');status.className='icg-status is-error';status.textContent='Esa pareja no corresponde. Prueba otra combinación o usa Ayúdame.';setTimeout(()=>{p?.classList.remove('is-wrong','is-selected');a?.classList.remove('is-wrong','is-selected');},420);activePrompt='';activeAnswer=''; };
    shell.body.querySelectorAll('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{shell.body.querySelectorAll('[data-prompt]').forEach(x=>x.classList.remove('is-selected'));activePrompt=btn.dataset.prompt;btn.classList.add('is-selected');check();})); shell.body.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{shell.body.querySelectorAll('[data-answer]').forEach(x=>x.classList.remove('is-selected'));activeAnswer=btn.dataset.answer;btn.classList.add('is-selected');check();}));
    shell.help.onclick=()=>{const pair=pairs.find(item=>!matched.has(item.id));if(!pair){shell.help.disabled=true;return;}stats.assisted+=1;completePair(pair.id,true);}; shell.next.disabled=true;shell.next.onclick=()=>success(shell,stats,options);
  }

  function runMemory(shell, questions, options) {
    const stats={score:questions.length,total:questions.length,assisted:0,mistakes:0,mode:'memory'}; const cards=[]; questions.forEach((q,index)=>{cards.push({id:`q${index}`,pair:String(index),text:q.q});cards.push({id:`a${index}`,pair:String(index),text:q.options[q.answer]});}); const deck=seededShuffle(cards,`${options.course?.id}:memory:${options.lessonNumber}`); const matched=new Set(); let first=''; let locked=false;
    shell.body.innerHTML=`<span class="icg-kicker">ENCUENTRA 3 PAREJAS</span><h3 class="icg-title">Memoria técnica</h3><p class="icg-lead">Relaciona cada situación con la decisión correcta.</p><div class="icg-memory">${deck.map((card,index)=>`<button class="icg-memory-card" type="button" data-card="${card.id}" data-pair="${card.pair}"><span class="icg-memory-card__back">${index+1}</span><span class="icg-memory-card__face">${esc(card.text)}</span></button>`).join('')}</div><div class="icg-status" aria-live="polite">Toca dos tarjetas para buscar una pareja.</div>`;
    const status=shell.body.querySelector('.icg-status');
    const markPair=(pair,assisted)=>{matched.add(pair);shell.body.querySelectorAll(`[data-pair="${pair}"]`).forEach(btn=>{btn.classList.add('is-open','is-matched');btn.disabled=true;if(assisted)btn.querySelector('.icg-memory-card__face')?.classList.add('is-assisted');});status.className='icg-status is-good';status.textContent=assisted?'Encontramos una pareja contigo. Puedes seguir o pedir otra ayuda.':'Pareja correcta.';shell.progress.style.setProperty('--progress',`${Math.round(matched.size/questions.length*100)}%`);if(matched.size===questions.length){shell.help.disabled=true;shell.next.disabled=false;shell.next.textContent='Ver resultado';}};
    shell.body.querySelectorAll('[data-card]').forEach(btn=>btn.addEventListener('click',()=>{if(locked||btn.classList.contains('is-open'))return;btn.classList.add('is-open');if(!first){first=btn.dataset.card;return;}const firstBtn=shell.body.querySelector(`[data-card="${first}"]`);if(firstBtn?.dataset.pair===btn.dataset.pair){markPair(btn.dataset.pair,false);first='';return;}stats.mistakes+=1;locked=true;status.className='icg-status is-error';status.textContent='No forman pareja. Observa los conceptos e intenta otra vez.';setTimeout(()=>{firstBtn?.classList.remove('is-open');btn.classList.remove('is-open');first='';locked=false;},700);}));
    shell.help.onclick=()=>{if(locked)return;const pair=questions.map((_,i)=>String(i)).find(id=>!matched.has(id));if(pair==null){shell.help.disabled=true;return;}stats.assisted+=1;if(first){shell.body.querySelector(`[data-card="${first}"]`)?.classList.remove('is-open');first='';}markPair(pair,true);};shell.next.disabled=true;shell.next.onclick=()=>success(shell,stats,options);
  }

  function play(rawOptions) {
    const options=rawOptions||{}; const questions=questionsFor(options); const mode=options.mode&&MODES.includes(options.mode)?options.mode:MODES[hash(`${options.course?.id}:${options.lessonNumber}`)%MODES.length];
    return new Promise(resolve=>{const shell=createShell(options,mode,resolve);if(mode==='connect')runConnect(shell,questions,options);else if(mode==='memory')runMemory(shell,questions,options);else runDecision(shell,questions,options);});
  }

  window.IMDIILCourseGames={play,questionsFor};
}());
