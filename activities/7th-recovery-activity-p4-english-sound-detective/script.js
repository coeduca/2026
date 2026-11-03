const phrases=['¿Qué sonido será?','¡Escucha otra vez!','Is it fruit or food?','¡Dibuja tu pista!','Detective, confío en ti.','Hmm... ¿qué palabra escuché?'];
const pad=n=>String(n).padStart(2,'0');
const params=new URLSearchParams(location.search);
const requestedNie=params.get('nie');
let data,mission,nie,state,index=0,audio,playing=false,speechIndex=0;
const $=selector=>document.querySelector(selector);
function save(){localStorage.setItem(`sound-detective-${nie}`,JSON.stringify(state));}
function avatarForStep(position){const offset=Number(nie.slice(-2))%data.avatars.length;return data.avatars[(offset+position*5)%data.avatars.length];}
function render(){
  const clipId=mission.order[index];const clip=data.clips[clipId-1];
  audio.pause();audio.src=clip.audio;audio.load();playing=false;
  $('#clue-heading').textContent=`PISTA ${pad(index+1)} / 20`;
  $('#emoji-hint').textContent=clip.emoji;
  $('#emoji-hint').setAttribute('aria-label',`Emoji de la pista ${pad(index+1)}`);
  $('#board-number').textContent=pad(index+1);
  $('#audio-status').textContent=state.heard.includes(index)?'Ya escuchaste esta pista. Puedes repetirla.':'Toca el botón para escuchar.';
  $('#play-button').disabled=false;$('#play-button').innerHTML='<span aria-hidden="true">▶</span> ESCUCHAR PALABRA';
  $('#previous-button').disabled=index===0;
  $('#next-button').disabled=!state.heard.includes(index);
  $('#next-button').textContent=index===19?'TERMINAR ✓':'SIGUIENTE →';
  $('#heard-count').textContent=`${state.heard.length} / 20`;
  $('#floating-image').src=`images/${avatarForStep(index)}`;
  const dots=$('#step-dots');dots.replaceChildren();
  for(let i=0;i<20;i++){
    const button=document.createElement('button');button.type='button';button.textContent=pad(i+1);button.className=`step-dot ${i===index?'current':''} ${state.heard.includes(i)?'heard':''}`;button.disabled=i>index&&!state.heard.includes(i);button.setAttribute('aria-label',`Ir a la pista ${pad(i+1)}`);button.setAttribute('aria-current',i===index?'step':'false');button.addEventListener('click',()=>{index=i;state.index=i;save();render();});dots.append(button);
  }
}
async function playCurrent(){
  if(playing){audio.currentTime=0;await audio.play();return;}
  try{playing=true;$('#play-button').innerHTML='<span aria-hidden="true">↻</span> REPETIR AUDIO';$('#audio-status').textContent='Escuchando...';await audio.play();}
  catch{playing=false;$('#audio-status').textContent='No se pudo reproducir. Toca el botón de nuevo.';$('#play-button').innerHTML='<span aria-hidden="true">▶</span> REINTENTAR AUDIO';}
}
function next(){if(!state.heard.includes(index))return;if(index===19){$('#completion').hidden=false;$('#completion').scrollIntoView({behavior:'smooth'});return;}index++;state.index=index;save();render();$('#mission').scrollIntoView({behavior:'smooth'});}
function picker(){const list=$('#student-list');Object.entries(data.students).forEach(([id,item])=>{const a=document.createElement('a');a.href=`index.html?nie=${encodeURIComponent(id)}`;a.textContent=item.name;list.append(a);});$('#case-picker').hidden=false;}
function begin(){
  mission=data.students[requestedNie];if(!mission){picker();return;}
  nie=requestedNie;
  try{state=JSON.parse(localStorage.getItem(`sound-detective-${nie}`))||{};}catch{state={};}
  state.heard=Array.isArray(state.heard)?state.heard.filter(n=>Number.isInteger(n)&&n>=0&&n<20):[];
  index=Number.isInteger(state.index)?Math.max(0,Math.min(state.index,19)):0;
  $('#student-name').textContent=mission.name;$('#student-id').textContent=`NIE ${nie}`;
  $('#cover-rigo').src=`images/${mission.avatar}`;
  $('#mission').hidden=false;$('#floating-rigo').hidden=false;
  audio=$('#word-audio');
  audio.addEventListener('ended',()=>{playing=false;if(!state.heard.includes(index)){state.heard.push(index);state.heard.sort((a,b)=>a-b);save();}$('#audio-status').textContent='Pista escuchada. Escríbela y dibújala en tu tablero.';$('#next-button').disabled=false;$('#heard-count').textContent=`${state.heard.length} / 20`;const dot=$('#step-dots').children[index];dot.classList.add('heard');});
  audio.addEventListener('error',()=>{$('#audio-status').textContent='El audio no cargó. Revisa tu conexión e inténtalo de nuevo.';playing=false;});
  $('#play-button').addEventListener('click',playCurrent);
  $('#previous-button').addEventListener('click',()=>{if(index>0){index--;state.index=index;save();render();}});
  $('#next-button').addEventListener('click',next);
  $('#review-button').addEventListener('click',()=>{$('#completion').hidden=true;index=0;state.index=0;save();render();$('#mission').scrollIntoView({behavior:'smooth'});});
  $('#rigo-button').addEventListener('click',()=>{speechIndex=(speechIndex+1)%phrases.length;$('#rigo-speech').textContent=phrases[speechIndex];});
  setInterval(()=>{speechIndex=(speechIndex+1)%phrases.length;$('#rigo-speech').textContent=phrases[speechIndex];},9000);
  render();
}
fetch('missions.json').then(response=>{if(!response.ok)throw new Error('missions');return response.json();}).then(json=>{data=json;begin();}).catch(()=>{$('#student-name').textContent='No se pudo abrir el expediente';});
