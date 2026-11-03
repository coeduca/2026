const styles = [
  {name:'Skeuomorfismo',className:'skeuo',clue:'Parece un objeto físico.',question:'¿Qué materiales u objetos reales imita?'},
  {name:'Brutalismo',className:'brutal',clue:'Contrastes fuertes y bordes evidentes.',question:'¿Qué decisiones visuales llaman primero la atención?'},
  {name:'Glassmorfismo',className:'glass',clue:'Capas translúcidas como vidrio.',question:'¿Cómo se separa una capa del fondo?'},
  {name:'Claymorfismo',className:'clay',clue:'Formas suaves y volumen redondeado.',question:'¿Qué hacen las sombras y los bordes?'},
  {name:'Neumorfismo',className:'neumo',clue:'Relieve sutil sobre una superficie.',question:'¿Cómo se distinguen botones y fondo?'},
  {name:'Flat Design',className:'flat',clue:'Formas planas y color directo.',question:'¿Qué elementos se simplifican?'},
  {name:'Material Design',className:'material',clue:'Componentes, capas y jerarquía.',question:'¿Qué reglas propone el sistema de Google?'},
  {name:'Aurora UI',className:'aurora',clue:'Color luminoso en degradados.',question:'¿Cómo ayudan los colores a destacar el contenido?'}
];
const menu=document.querySelector('.style-menu');
const specimen=document.querySelector('#specimen');
const number=document.querySelector('#style-number');
const nameEl=document.querySelector('#style-name');
const clue=document.querySelector('#style-clue');
const question=document.querySelector('#style-question');
styles.forEach((style,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='style-tab';
  button.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><strong>${style.name}</strong><span aria-hidden="true">↗</span>`;
  button.addEventListener('click',()=>selectStyle(index));
  menu.append(button);
});
function selectStyle(index){
  const style=styles[index];
  number.textContent=`${String(index+1).padStart(2,'0')} / 08`;
  nameEl.textContent=style.name;
  clue.textContent=style.clue;
  question.textContent=style.question;
  specimen.className=`specimen specimen-${style.className}`;
  specimen.setAttribute('aria-label',`Miniatura visual de ${style.name}`);
  [...menu.children].forEach((button,i)=>{
    button.classList.toggle('active',i===index);
    button.setAttribute('aria-pressed',String(i===index));
  });
}
selectStyle(0);
