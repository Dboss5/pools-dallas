import {inspectPhoto} from './pool-photo-gate.mjs';
import {normalizeRegion,observeWater,buildAdvice} from './pool-checker-core.mjs';
const $=s=>document.querySelector(s);const form=$('#checkerForm'),input=$('#poolPhotos'),gallery=$('#photoGallery'),status=$('#photoStatus'),results=$('#checkerResults');
let photos=[],generation=0,busy=false,serial=0,lastReport='';
const tell=(message,bad=false)=>{status.textContent=message;status.classList.toggle('is-error',bad)};
const invalidate=()=>{results.hidden=true;lastReport='';$('#saveReport').disabled=true};
const element=(tag,text,cls)=>{const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x};
function dispose(photo){photo.image.width=0;photo.image.height=0;if(photo.stage){photo.stage.width=0;photo.stage.height=0}photo.card?.remove()}
function paint(photo){
  const c=photo.stage,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(photo.image,0,0);
  if(photo.kind.value!=='water')return;
  const r=photo.region;ctx.strokeStyle='#ef2446';ctx.lineWidth=Math.max(3,c.width/250);ctx.setLineDash([10,5]);ctx.strokeRect(r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height);ctx.setLineDash([]);
  for(const cell of photo.observation?.cells||[]){ctx.fillStyle='rgba(255,180,0,.23)';ctx.fillRect(cell.x*c.width,cell.y*c.height,cell.w*c.width,cell.h*c.height);ctx.strokeStyle='#ffb400';ctx.strokeRect(cell.x*c.width,cell.y*c.height,cell.w*c.width,cell.h*c.height);}
}
function addPhoto(image){
  const photo={id:++serial,image,region:{x:.2,y:.25,w:.6,h:.5},observation:null};
  const card=element('article',null,'checker-photo');photo.card=card;const top=element('div',null,'photo-top');top.append(element('h3','Photo '+photo.id));const remove=element('button','Remove','checker-text-button');remove.type='button';remove.setAttribute('aria-label','Remove photo '+photo.id);remove.onclick=()=>{photos=photos.filter(p=>p!==photo);dispose(photo);invalidate();tell('Photo removed. '+photos.length+' photo(s) remain in this tab.')};top.append(remove);card.append(top);
  const typeLabel=element('label','What does this photo show?');photo.kind=element('select');photo.kind.id='photoKind'+photo.id;typeLabel.htmlFor=photo.kind.id;
  for(const [value,text]of [['other','Equipment, surface detail, or general view'],['water','Pool water — check visible colour']]){const o=element('option',text);o.value=value;photo.kind.append(o)}card.append(typeLabel,photo.kind);
  const wrap=element('div',null,'checker-canvas-wrap'),c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.setAttribute('role','img');c.setAttribute('aria-label','Accepted photo '+photo.id+'. Water selection can be adjusted using the percentage fields below.');photo.stage=c;wrap.append(c);card.append(wrap);
  const controls=element('div',null,'region-controls');controls.hidden=true;const note=element('p','Drag a box around pool water only, or adjust the percentages below. Leave out trees, grass, people, deck, and strong reflections.','checker-small');controls.append(note);
  const fields=element('div',null,'region-fields');photo.fields={};for(const [key,label]of [['x','Left %'],['y','Top %'],['w','Width %'],['h','Height %']]){const group=element('div'),lab=element('label',label),field=element('input');field.type='number';field.min=key==='x'||key==='y'?'0':'5';field.max='100';field.step='1';field.value=Math.round(photo.region[key]*100);field.id='region-'+photo.id+'-'+key;lab.htmlFor=field.id;photo.fields[key]=field;field.addEventListener('change',()=>{photo.region=normalizeRegion(Object.fromEntries(Object.entries(photo.fields).map(([k,x])=>[k,Number(x.value)/100])));syncRegion(photo);photo.confirm.checked=false;photo.observation=null;photo.note.textContent='';invalidate();paint(photo)});group.append(lab,field);fields.append(group)}controls.append(fields);
  const confirmLabel=element('label',null,'checker-check');photo.confirm=element('input');photo.confirm.type='checkbox';confirmLabel.append(photo.confirm,document.createTextNode('The marked box contains only pool water.'));controls.append(confirmLabel);card.append(controls);photo.note=element('p','','checker-small photo-observation');card.append(photo.note);
  photo.kind.onchange=()=>{c.style.touchAction=photo.kind.value==='water'?'none':'auto';controls.hidden=photo.kind.value!=='water';photo.confirm.checked=false;photo.observation=null;photo.note.textContent='';paint(photo);invalidate()};photo.confirm.onchange=invalidate;
  let start=null;const point=e=>{const b=c.getBoundingClientRect();return{x:Math.min(1,Math.max(0,(e.clientX-b.left)/b.width)),y:Math.min(1,Math.max(0,(e.clientY-b.top)/b.height))}};
  c.onpointerdown=e=>{if(photo.kind.value!=='water')return;start=point(e);c.setPointerCapture(e.pointerId);e.preventDefault()};c.onpointermove=e=>{if(!start)return;const end=point(e);photo.region=normalizeRegion({x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(end.x-start.x),h:Math.abs(end.y-start.y)});photo.observation=null;photo.confirm.checked=false;syncRegion(photo);paint(photo);invalidate()};c.onpointerup=c.onpointercancel=()=>{start=null};
  gallery.append(card);photos.push(photo);paint(photo);invalidate();
}
function syncRegion(photo){for(const [k,field]of Object.entries(photo.fields))field.value=Math.round(photo.region[k]*100)}
input.addEventListener('change',async()=>{
  const files=Array.from(input.files||[]);input.value='';if(!files.length)return;
  if(!$('#peopleFree').checked){tell('Please confirm you are choosing pool-only photos with no people.',true);return;}
  if(busy)return;const remaining=3-photos.length;if(remaining<=0){tell('You can keep up to three photos. Remove one before choosing another.',true);return;}
  const ticket=generation;busy=true;input.disabled=true;$('#photoBusy').hidden=false;invalidate();let accepted=0,rejected=0;
  try{for(const file of files.slice(0,remaining)){
    if(ticket!==generation)break;let cancelled=false,timer;
    try{
      tell('Loading the on-device face check. The photo has not been added.');
      const verdict=await Promise.race([inspectPhoto(file,{shouldCancel:()=>cancelled||ticket!==generation,onProgress:(i,total)=>tell('Checking for faces: '+i+' of '+total+' views. No photo has been added yet.')}),new Promise((_,reject)=>{timer=setTimeout(()=>{cancelled=true;reject(new Error('The face check timed out. This photo was not added. Try again with a smaller pool-only photo.'))},45000)})]);
      clearTimeout(timer);
      if(ticket!==generation){if(verdict.canvas){verdict.canvas.width=0;verdict.canvas.height=0}break;}
      if(!verdict.accepted){rejected++;tell('Photo rejected: a face was detected. It was not added or sent anywhere.',true);const msg=element('p','Photo rejected because a face was detected. Choose an image showing only the pool or equipment.','checker-rejection');$('#photoMessages').append(msg);continue;}
      addPhoto(verdict.canvas);accepted++;
    }catch(err){clearTimeout(timer);cancelled=true;if(ticket===generation){rejected++;const message=err.message==='cancelled'?'Photo check cancelled.':/^(Use a |Choose a |The face check timed out)/.test(err.message)?err.message:'Face checking could not finish in this browser. Try again with a smaller pool-only photo.';const msg=element('p',message+' No unchecked photo was added.','checker-rejection');$('#photoMessages').append(msg);tell('Face check could not complete. The photo was not added. You can still use the symptom guide.',true);}}
  }}finally{busy=false;input.disabled=false;$('#photoBusy').hidden=true;if(ticket===generation)tell(accepted+' photo(s) added; '+rejected+' rejected or unchecked.'+(files.length>remaining?' Extra files were not added: the limit is three photos.':''),rejected>0);}
});
$('#clearPhotos').addEventListener('click',()=>{generation++;for(const p of photos)dispose(p);photos=[];input.value='';$('#photoMessages').replaceChildren();invalidate();tell('Photos cleared from this tab. Any pending photo will not be added.');});
form.addEventListener('change',invalidate);
form.addEventListener('submit',e=>{
  e.preventDefault();if(busy){tell('Wait until the face checks finish before running the checker.',true);return;}if(!form.reportValidity())return;
  const answers=Object.fromEntries(new FormData(form));const observations=[];
  for(const p of photos){
    if(p.kind.value==='water'&&!p.confirm.checked){tell('Confirm the marked water area in Photo '+p.id+', or change it to a general view.',true);p.confirm.focus();return;}
    if(p.kind.value==='water'){try{p.observation=observeWater(p.image.getContext('2d',{willReadFrequently:true}).getImageData(0,0,p.image.width,p.image.height),p.region);observations.push(p.observation);p.note.textContent='Photo observation: '+p.observation.text;paint(p);}catch{p.observation=null;p.note.textContent='This photo could not be read for colour. No visual conclusion was used.';}}
    else{p.observation=null;p.note.textContent='General-view photo accepted. This checker does not identify equipment failures, cracks, or hidden leaks from an image.';paint(p);}
  }
  const advice=buildAdvice(answers,observations);$('#resultTitle').textContent=advice.title;$('#resultPriority').textContent=advice.priority;
  const locations=$('#inspectionAreas');locations.replaceChildren();for(const [title,explanation]of advice.locations){const article=element('article');article.append(element('h3',title),element('p',explanation));locations.append(article)}
  $('#resultNext').textContent=advice.next;const notices=$('#resultNotices');notices.replaceChildren();for(const text of advice.notices||[])notices.append(element('p',text,'checker-rejection'));
  const evidence=$('#photoEvidence');evidence.replaceChildren();if(observations.length){for(const o of observations)evidence.append(element('p',o.text));}else evidence.append(element('p',photos.length?'No water-colour evidence was used. General-view photos do not establish a fault.':'No photo evidence was used. These suggestions come from your answers.'));
  const guide=$('#resultGuide');guide.href=advice.href;guide.textContent=advice.label;$('#resultBasis').textContent='Areas to inspect are suggested from your answers. Highlighted photo boxes show colour patterns only, not confirmed fault locations.';
  lastReport=['Frisco Pool Servicess · POOL PROBLEM CHECKER','Preliminary inspection guide — not a confirmed diagnosis','',advice.title,advice.priority,'',...advice.locations.map(([a,b])=>a+': '+b),'',advice.next,...(advice.notices||[]),'','Photo observations:',...(observations.length?observations.map(o=>o.text):['No water-colour observation used.']),'','Photos remained in the browser and are not included in this report. Automated face checks can miss faces.','Frisco Pool Servicess: 945-777-3345','tel:+19457773345'].join('\n');
  $('#saveReport').disabled=false;results.hidden=false;results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('#resultTitle').focus({preventScroll:true});
});
$('#saveReport').onclick=()=>{if(!lastReport)return;const url=URL.createObjectURL(new Blob([lastReport],{type:'text/plain;charset=utf-8'}));const a=element('a');a.href=url;a.download='frisco-pool-inspection-guide.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
addEventListener('pagehide',()=>{generation++;for(const p of photos)dispose(p);photos=[];lastReport='';gallery.replaceChildren();results.hidden=true;});

$('#runChecker').disabled=false;input.disabled=false;tell('Ready. Choose photos without people; all face checks happen before a photo is added.');
