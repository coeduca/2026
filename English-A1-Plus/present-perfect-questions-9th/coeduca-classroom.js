/* Optional Classroom transport. No teacher tokens; only the publication capability. */
(function (global) {
 'use strict';
 const config=global.COEDUCA_CLASSROOM_CONFIG;
 if(!config) return;
 const endpoint='https://pxoxmcyyhjpjggbseqcr.supabase.co/functions/v1/worksheets-student';
 const pendingKey='worksheets-outbox:'+config.publicationId;
 const revisionKey='worksheets-revision:'+config.publicationId;
 let currentState=null, sending=null, statusEl=null, button=null, displayKey='', beforeSnapshot=()=>{};
 const cache=new Map();
 const received=new Map();
 async function request(action, data) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),90_000);
  try {
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action,publicationId:config.publicationId,token:config.token},data)),signal:controller.signal});
   const result=await response.json(); if(!response.ok) throw new Error(result.error||'No se pudo registrar la nota.'); return result;
  } finally { clearTimeout(timer); }
 }
 function storageRead() { try{return JSON.parse(localStorage.getItem(pendingKey)||'[]');}catch(_){return [];} }
 function storageWrite(values) { localStorage.setItem(pendingKey,JSON.stringify(values)); }
 function snapshot(state) {
  if(!state.student) throw new Error('Ingresa tu NIE antes de enviar.');
  const partners=state.partners|| (state.partner?[state.partner]:[]);
  const team=[state.student].concat(partners).map(s=>String(s.nie).trim());
  if(team.length>5||new Set(team).size!==team.length) throw new Error('Revisa los integrantes del equipo.');
  const answers={}; Object.keys(state.answers||{}).sort().forEach(k=>{
   const a=state.answers[k]; if(a.userAnswer==null) throw new Error('Revisa de nuevo los ejercicios para registrar sus respuestas.');
   answers[k]={userAnswer:a.userAnswer};
  });
  const submission={team,pool:state.poolVersion||'A',answers,gameResult:state.gameResult||null,balloonBonus:state.balloonBonus===1?1:0};
  // Two transport actions reuse the revision; regrading an exercise creates a new academic attempt,
  // even when its answers happen to be identical to an earlier attempt.
  const signature=JSON.stringify([submission,Object.keys(answers).map(k=>state.answers[k].completedAt||0)]);
  let saved;try{saved=JSON.parse(localStorage.getItem(revisionKey)||'null');}catch(_){}
  if(!saved||saved.signature!==signature) {
   const bytes=global.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
   const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
   saved={signature,revision:hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20)};
   localStorage.setItem(revisionKey,JSON.stringify(saved));
  }
  return Object.assign(submission,{revision:saved.revision});
 }
 function message(value) { if(statusEl) statusEl.textContent=value; }
 function describe(result) {
  const members=result.members||[], sent=members.filter(m=>m.state==='SENT').length;
  if(members.length&&sent===members.length) return 'Nota registrada en Classroom para '+sent+' estudiante'+(sent===1?'':'s')+'. Entrega también tu comprobante.';
  if(members.some(m=>m.state==='REVIEW')) return 'Envío recibido; '+sent+'/'+members.length+' notas registradas. Hay notas que requieren revisión docente.';
  return 'Envío guardado; '+sent+'/'+members.length+' notas registradas. Las restantes están pendientes de Classroom.';
 }
 async function transmit(item) {
  const result=await request('submit',{submission:item.submission});
  // Remove only the successfully received snapshot. A newer revision stays pending.
  storageWrite(storageRead().filter(v=>v.key!==item.key));
  received.set(item.key,result);
  if(displayKey===item.key) message(describe(result));
  let polls=0;
  const poll=async()=>{
   if(++polls>6||displayKey!==item.key||!currentState||currentState.student?.nie!==item.submission.team[0]) return;
   try {const status=await request('status',{receipt:result.receipt}); received.set(item.key,status); if(displayKey!==item.key)return; message(describe(status));
    if(status.members.some(m=>['PENDING','ERROR','PROCESSING'].includes(m.state))) setTimeout(poll,15_000);
   }catch(_){/* Durable queue retains failures; keep the last truthful status. */}
  };
  if(result.members.some(m=>['PENDING','ERROR','PROCESSING'].includes(m.state))) setTimeout(poll,15_000);
 }
 async function send() {
  if(sending) return sending;
  try {
   beforeSnapshot();
   const submission=snapshot(currentState), key=JSON.stringify(submission);
   displayKey=key;
   if(received.has(key)&&received.get(key).members.every(m=>['SENT','REVIEW'].includes(m.state))) {message(describe(received.get(key)));return;}
   const item={key,submission};
   const items=storageRead(); if(!items.some(v=>v.key===key)) {
    const names=[currentState.student].concat(currentState.partners||[]).map(s=>s.name+' ('+s.nie+')').join('\n');
    if(!received.has(key)&&submission.team.length>1&&!global.confirm('Enviar la misma nota para estos integrantes:\n'+names+'\n\n¿Son los integrantes correctos?')) return;
    // Store BEFORE network access so a timeout or browser closure can be retried.
    if(items.length>=20) throw new Error('Hay varios envíos pendientes. Conéctate y reintenta antes de crear otro.');
    storageWrite(items.concat(item));
   }
   message('Registrando nota…'); if(button) button.disabled=true;
   sending=transmit(item);
   await sending;
  }catch(error){message((error.message||'No hay conexión.')+' El PDF puede descargarse por separado. Puedes reintentar con Enviar nota.');}
  finally {sending=null;if(button)button.disabled=false;}
 }
 global.COEDUCA_CLASSROOM={
  lookup:async function(nie){
   const clean=String(nie||'').trim(); if(clean.length<4)return null;
   if(cache.has(clean))return cache.get(clean);
   try {const result=await request('lookup',{nie:clean});cache.set(clean,result.student);return result.student;}
   catch(error){if(error.message.includes('NIE no encontrado'))return null;throw error;}
  },
  snapshot,
  mount:function(state,refreshBonus){
   currentState=state;
   beforeSnapshot=refreshBonus||(()=>{});
   const pdf=document.getElementById('coeduca-pdf-btn')||document.getElementById('civica-pdf-btn');
   if(!pdf||document.getElementById('worksheets-send-grade'))return;
   button=document.createElement('button');button.type='button';button.id='worksheets-send-grade';button.className=pdf.className;button.textContent='Enviar nota';
   const actions=pdf.parentNode,row=document.createElement('div');row.id='worksheets-result-actions';
   row.style.cssText='display:flex;flex-direction:row;align-items:stretch;justify-content:center;gap:8px;width:100%;max-width:560px;margin:0 auto;';
   actions.insertBefore(row,pdf);row.appendChild(pdf);row.appendChild(button);
   pdf.textContent='Descargar PDF';
   for(const action of [pdf,button]) {
    action.style.cssText+='flex:1 1 0;min-width:0;min-height:44px;box-sizing:border-box;padding-left:10px;padding-right:10px;white-space:normal;overflow-wrap:anywhere;';
   }
   button.addEventListener('click',send);
   statusEl=document.createElement('small');statusEl.setAttribute('role','status');statusEl.setAttribute('aria-live','polite');
   statusEl.style.cssText='display:block;flex-basis:100%;font-size:12px;margin:8px 0;';
   actions.appendChild(statusEl);
   message('Enviar nota registra el resultado; entrega el PDF o una captura en Classroom.');
   // Do not await: preserve the direct user gesture needed by Safari's PDF handler.
   pdf.addEventListener('click',()=>{void send();},{capture:true});
   const retry=async()=>{
    if(sending||!navigator.onLine)return;
    const items=storageRead().filter(v=>v.submission.team[0]===state.student?.nie);
    for(const item of items) {try {displayKey=item.key;sending=transmit(item);await sending;}catch(_){message('Hay un envío pendiente. Pulsa Enviar nota al recuperar la conexión.');break;}finally{sending=null;}}
   };
   global.addEventListener('online',retry);void retry();
  }
 };
})(window);
