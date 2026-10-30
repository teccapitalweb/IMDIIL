(function(){
  'use strict';
  var API=function(){return window.WEBHOOK_URL||'https://imdiil-webhook-production.up.railway.app';};
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];});}
  function fmt(value){if(!value)return'';var date=new Date(value);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(date);}
  async function token(){var user=window.__auth&&window.__auth.currentUser;for(var attempt=0;!user&&attempt<80;attempt+=1){await new Promise(function(resolve){window.setTimeout(resolve,100);});user=window.__auth&&window.__auth.currentUser;}if(!user)throw new Error('Inicia sesión para usar esta función.');return user.getIdToken();}
  async function request(path,options){var response=await fetch(API()+path,Object.assign({},options||{},{headers:Object.assign({'Authorization':'Bearer '+await token(),'Content-Type':'application/json'},options&&options.headers||{}),cache:'no-store'}));var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');return data;}
  function label(value){return['Elige una calificación','Necesita mejorar','Puede mejorar','Buen curso','Muy buen curso','Excelente curso'][Number(value)||0];}

  function mountRating(options){
    var root=typeof options.container==='string'?document.querySelector(options.container):options.container;if(!root)return;
    var courseId=String(options.courseId||''),title=String(options.courseTitle||'Curso'),selected=0,mine=null;
    root.innerHTML='<div class="imdiil-rating__loading">Cargando calificaciones…</div>';
    if(window.__isDemoMode){render({summary:{ratingCount:0,average:0},mine:null,demo:true});return;}
    request('/api/course-ratings/'+encodeURIComponent(courseId)).then(render).catch(function(error){render({summary:{},mine:null,error:error.message});});
    function render(data){
      var summary=data.summary||{},count=Number(summary.ratingCount)||0,average=Number(summary.average)||0;mine=data.mine||mine;selected=Number(mine&&mine.rating)||selected;
      root.innerHTML='<section class="imdiil-rating"><div class="imdiil-rating__head"><div><span class="imdiil-rating__kicker">TU EXPERIENCIA IMPORTA</span><h2>Califica este curso</h2><p>Tu opinión nos ayuda a conservar los mejores contenidos y mejorar los que lo necesitan. La reseña es opcional.</p></div><div class="imdiil-rating__average"><span>★</span><div><strong>'+(count?average.toFixed(1):'—')+' / 5</strong><small>'+count+' valoraciones</small></div></div></div><form class="imdiil-rating__form"><div class="imdiil-rating__picker"><span class="imdiil-rating__label">Tu calificación</span><div class="imdiil-rating__stars">'+[1,2,3,4,5].map(function(value){return'<button class="imdiil-rating__star'+(value<=selected?' is-active':'')+'" type="button" data-rating="'+value+'" aria-label="'+value+' estrellas">★</button>';}).join('')+'</div><p class="imdiil-rating__hint">'+label(selected)+'</p></div><div><label class="imdiil-rating__label">Reseña opcional</label><textarea maxlength="1000" placeholder="¿Qué te gustó? ¿Qué podríamos mejorar?">'+esc(mine&&mine.review||'')+'</textarea><div class="imdiil-rating__actions"><span class="imdiil-rating__state'+(data.error?' is-error':'')+'">'+esc(data.demo?'Inicia sesión para guardar una valoración.':data.error||'')+'</span><button class="imdiil-rating__save" type="submit" '+(!selected||data.demo?'disabled':'')+'>'+(mine?'Actualizar':'Guardar valoración')+'</button></div></div></form></section>';
      var form=root.querySelector('form'),state=root.querySelector('.imdiil-rating__state'),save=root.querySelector('.imdiil-rating__save'),textarea=root.querySelector('textarea'),hint=root.querySelector('.imdiil-rating__hint');
      root.querySelectorAll('[data-rating]').forEach(function(button){button.addEventListener('click',function(){selected=Number(button.dataset.rating);root.querySelectorAll('[data-rating]').forEach(function(item){item.classList.toggle('is-active',Number(item.dataset.rating)<=selected);});hint.textContent=label(selected);if(!data.demo)save.disabled=false;state.textContent='';});});
      form.addEventListener('submit',async function(event){event.preventDefault();if(!selected)return;save.disabled=true;save.textContent='Guardando…';try{var next=await request('/api/course-ratings/'+encodeURIComponent(courseId),{method:'PUT',body:JSON.stringify({rating:selected,review:textarea.value,courseTitle:title})});mine=next.mine;render(next);root.querySelector('.imdiil-rating__state').textContent='Gracias. Tu valoración quedó guardada.';}catch(error){save.disabled=false;save.textContent=mine?'Actualizar':'Guardar valoración';state.className='imdiil-rating__state is-error';state.textContent=error.message;}});
    }
  }

  var supportState={data:null,loading:false};
  function topicName(value){return({membresia:'Mi membresía',cobros:'Cobros y pagos',cuenta:'Mi cuenta',cursos:'Cursos',otro:'Otro'})[value]||'Mi membresía';}
  function messages(rows){if(!rows||!rows.length)return'<div class="support-empty"><span>✉</span><strong>Inicia una conversación privada</strong><p>Cuéntanos qué ocurrió. Sólo tú y el equipo que administra IMDIIL podrán leerla.</p></div>';return rows.map(function(row){var member=row.sender!=='admin';return'<div class="support-message '+(member?'is-member':'is-admin')+'"><div class="support-message__bubble">'+esc(row.text)+'<small>'+esc(fmt(row.createdAt))+'</small></div></div>';}).join('');}
  async function loadSupport(root,silent){if(supportState.loading)return;supportState.loading=true;try{supportState.data=await request('/support/me');drawSupport(root);}catch(error){if(!silent){root.querySelector('.support-messages').innerHTML='<div class="support-empty"><span>!</span><strong>No pudimos abrir el buzón</strong><p>'+esc(error.message)+'</p></div>';}}finally{supportState.loading=false;}}
  function drawSupport(root){
    var data=supportState.data||{conversation:null,messages:[]},conversation=data.conversation||{},closed=conversation.status==='closed';
    root.innerHTML='<div class="support-page"><section class="support-hero"><div><div class="support-hero__eyebrow">ATENCIÓN PERSONAL</div><h1>Soporte privado</h1><p>Habla directamente con el equipo IMDIIL sobre tu membresía, cobros, acceso o cursos.</p></div><div class="support-privacy">✓ Sólo tú y administración</div></section><div class="support-layout"><aside class="support-info"><div class="support-info__card"><strong>Historial en un solo lugar</strong><p>No tendrás que explicar de nuevo el problema cuando vuelvas.</p></div><div class="support-info__card"><strong>¿Sobre qué necesitas ayuda?</strong><select class="support-topic" '+(conversation.id?'disabled':'')+'><option value="membresia">Mi membresía</option><option value="cobros">Cobros y pagos</option><option value="cuenta">Mi cuenta</option><option value="cursos">Cursos</option><option value="otro">Otro</option></select></div></aside><section class="support-thread"><header class="support-thread__head"><div><strong>Equipo IMDIIL</strong><span>'+(conversation.id?topicName(conversation.topic):'Atención a miembros')+'</span></div><b class="support-status '+(closed?'is-closed':'')+'">'+(closed?'Resuelto':'En seguimiento')+'</b></header><div class="support-messages" aria-live="polite">'+messages(data.messages)+'</div><form class="support-composer"><div class="support-composer__row"><textarea maxlength="3000" placeholder="Escribe tu mensaje…" required></textarea><button type="submit" aria-label="Enviar">➤</button></div><small>No compartas contraseñas ni los datos completos de tu tarjeta.</small></form></section></div></div>';
    var box=root.querySelector('.support-messages');requestAnimationFrame(function(){box.scrollTop=box.scrollHeight;});
    root.querySelector('.support-composer').addEventListener('submit',async function(event){event.preventDefault();var textarea=root.querySelector('.support-composer textarea'),button=root.querySelector('.support-composer button'),message=textarea.value.trim();if(!message)return;button.disabled=true;try{await request('/support/me/messages',{method:'POST',body:JSON.stringify({message:message,topic:root.querySelector('.support-topic').value})});textarea.value='';await loadSupport(root,true);}catch(error){window.Toast&&window.Toast.error('No se pudo enviar',error.message);}finally{button.disabled=false;}});
  }
  function renderSupport(root){drawSupport(root);if(window.__isDemoMode){root.querySelector('.support-messages').innerHTML='<div class="support-empty"><span>✉</span><strong>Buzón privado</strong><p>Inicia sesión con tu cuenta para consultar y enviar mensajes.</p></div>';root.querySelector('.support-composer textarea').disabled=true;root.querySelector('.support-composer button').disabled=true;return;}loadSupport(root,false);}

  function install(){
    if(typeof Sections!=='undefined'&&Sections.renderers)Sections.renderers.soporte=renderSupport;
    window.IMDIILExtensions={mountRating:mountRating,renderSupport:renderSupport};
    var target=document.getElementById('dynamic-section');
    if(target)new MutationObserver(function(){
      var banner=target.querySelector('.v2-course-banner');
      if(!banner||target.querySelector('[data-imdiil-rating-slot]'))return;
      var match=String(location.hash||'').match(/^#curso\/([^/]+)$/);if(!match)return;
      var courseId='';try{courseId=decodeURIComponent(match[1]);}catch(_){courseId=match[1];}
      var rows=window.__IMDIIL_V2_BRIDGE&&window.__IMDIIL_V2_BRIDGE.getCourses?window.__IMDIIL_V2_BRIDGE.getCourses():[];
      var course=rows.find(function(item){return String(item.id)===String(courseId);});if(!course)return;
      var slot=document.createElement('div');slot.setAttribute('data-imdiil-rating-slot','');target.querySelector('.v2-shell')?.appendChild(slot);
      mountRating({container:slot,courseId:course.id,courseTitle:course.titulo||course.nombre||'Curso'});
    }).observe(target,{childList:true,subtree:true});
  }
  install();
})();
