const CASES = {
  '19934099': {name:'Bryan Wilfredo',photo:'rigo-goku.webp',order:[0,3,8,5,1,6,2,4,7]},
  '19967161': {name:'Rocío Azucena',photo:'rigo-billy.webp',order:[7,1,5,2,4,8,0,6,3]},
  '4210276': {name:'María Fernanda',photo:'rigo-granjero.webp',order:[4,6,2,0,7,3,5,8,1]}
};
const CLUES = [
  {id:'species',category:'APARIENCIA',question:'I have ___ many colors.',options:['tried','try','trying'],answer:'tried',statement:'I have always been a green chameleon.'},
  {id:'hero',category:'FOTOGRAFÍA',question:'I have ___ a new costume.',options:['worn','wore','wear'],answer:'worn',statement:'I have worn an orange hero costume.',image:'rigo-goku.webp'},
  {id:'farmer',category:'FOTOGRAFÍA',question:'I have ___ vegetables.',options:['grown','growed','growing'],answer:'grown',statement:'I have grown carrots in a field.',image:'rigo-granjero.webp'},
  {id:'tricycle',category:'FOTOGRAFÍA',question:'I have ___ a small bike.',options:['ridden','rode','ride'],answer:'ridden',statement:'I have ridden a red tricycle in a silly costume.',image:'rigo-billy.webp'},
  {id:'home',category:'HOGAR',question:'I have ___ near a garden.',options:['lived','live','living'],answer:'lived',statement:'I have lived beside a sunny garden since I was little.'},
  {id:'food',category:'COMIDA',question:'I have ___ a mango.',options:['eaten','ate','eat'],answer:'eaten',statement:'I have always loved ripe mangoes.'},
  {id:'hobby',category:'AFICIÓN',question:'I have ___ a map.',options:['drawn','drew','drawing'],answer:'drawn',statement:'I have drawn maps of places I have visited.'},
  {id:'habit',category:'HÁBITO',question:'I have ___ my friends.',options:['helped','help','helping'],answer:'helped',statement:'I have helped friends whenever they have felt lost.'},
  {id:'impostor',category:'MENSAJE',question:'I have ___ a secret.',options:['kept','keeped','keeping'],answer:'kept',statement:'I have never worn a costume in my life.'}
];
const params=new URLSearchParams(location.search);
const nie=params.get('nie');
const activeCase=CASES[nie]||CASES['19934099'];
const caseNie=CASES[nie]?nie:'19934099';
const storageKey=`rigo-secret-identity-${caseNie}`;
let state;
try{state=JSON.parse(localStorage.getItem(storageKey))||{};}catch{state={};}
state.solved=Array.isArray(state.solved)?state.solved:[];
state.suspect=typeof state.suspect==='string'?state.suspect:null;
const save=()=>localStorage.setItem(storageKey,JSON.stringify(state));
document.querySelector('#student-name').textContent=activeCase.name;
document.querySelector('#case-number').textContent=`CASO ${caseNie}`;
for(const id of ['hero-rigo','floating-image'])document.querySelector(`#${id}`).src=`images/${activeCase.photo}`;
const grid=document.querySelector('#clue-grid');
const suspectList=document.querySelector('#suspect-list');
const feedback=document.querySelector('#report-feedback');
function render(){
  grid.replaceChildren();suspectList.replaceChildren();
  activeCase.order.forEach((clueIndex,position)=>{
    const clue=CLUES[clueIndex];const solved=state.solved.includes(clue.id);
    const card=document.createElement('article');card.className=`clue-card surface ${solved?'solved':''}`;
    const header=document.createElement('div');header.className='clue-header';
    header.innerHTML=`<span>REGISTRO ${String(position+1).padStart(2,'0')}</span><span>${solved?clue.category:'BLOQUEADO'}</span>`;
    card.append(header);
    if(solved){
      if(clue.image){const img=document.createElement('img');img.className='clue-photo';img.src=`images/${clue.image}`;img.alt=`Fotografía de Rigo: ${clue.category.toLowerCase()}`;card.append(img);}
      const sentence=document.createElement('p');sentence.className='revealed';sentence.textContent=clue.statement;card.append(sentence);
      const note=document.createElement('p');note.className='record-note';note.textContent='Anota este dato en tu pasaporte.';card.append(note);
    }else{
      const label=document.createElement('p');label.className='grammar-label';label.textContent='ELIGE EL PARTICIPIO';card.append(label);
      const question=document.createElement('h3');question.textContent=clue.question;card.append(question);
      const answers=document.createElement('div');answers.className='answers';
      const message=document.createElement('p');message.className='answer-message';message.setAttribute('aria-live','polite');
      clue.options.forEach(option=>{const button=document.createElement('button');button.type='button';button.textContent=option;button.addEventListener('click',()=>{if(option===clue.answer){state.solved.push(clue.id);save();render();}else{message.textContent='Esa forma no es el participio. Intenta otra vez.';button.classList.add('wrong');}});answers.append(button);});
      card.append(answers,message);
    }
    grid.append(card);
    const suspectButton=document.createElement('button');suspectButton.type='button';suspectButton.className='suspect-button';suspectButton.textContent=`${String(position+1).padStart(2,'0')} · ${solved?clue.category:'Sin descubrir'}`;suspectButton.disabled=!solved||state.solved.length<9;suspectButton.setAttribute('aria-pressed',String(state.suspect===clue.id));if(state.suspect===clue.id)suspectButton.classList.add('selected');suspectButton.addEventListener('click',()=>{state.suspect=clue.id;save();render();});suspectList.append(suspectButton);
  });
  const count=state.solved.length;
  document.querySelector('#progress-count').textContent=`${count} / 9`;
  document.querySelector('#progress-fill').style.width=`${Math.round(count/9*100)}%`;
  feedback.textContent=count<9?`Descubre ${9-count} pista${9-count===1?'':'s'} más antes de elegir.`:state.suspect?`Has marcado un registro. Anota su número y dos pruebas en tu pasaporte; tu docente revisará la explicación.`:'Ya puedes marcar el registro que consideras del impostor.';
}
render();
const sayings=['¿Quién soy?','¿Dónde estoy?','¿Qué hago acá?','¿Quién inventó la rueda? xd','I have forgotten something...','Have I worn this costume before?','Creo que he visto esa pista...'];
let sayingIndex=0;const speech=document.querySelector('#rigo-speech');
function nextSaying(){sayingIndex=(sayingIndex+1)%sayings.length;speech.textContent=sayings[sayingIndex];}
document.querySelector('#rigo-button').addEventListener('click',nextSaying);
setInterval(nextSaying,8500);

