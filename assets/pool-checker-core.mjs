// Visual observations and symptom-based triage. No diagnosis or network calls.
export function normalizeRegion(region) {
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(x))?Number(x):a));
  const x=clamp(region.x,0,.95),y=clamp(region.y,0,.95);
  return {x,y,w:clamp(region.w,.05,1-x),h:clamp(region.h,.05,1-y)};
}
function colour(r,g,b){
  r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  if(d===0)return {h:0,s:0,v:max};
  let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
  return {h:(h*60+360)%360,s:max===0?0:d/max,v:max};
}
export function observeWater(image,region){
  const rect=normalizeRegion(region),cols=6,rows=4,cells=[];let usable=0,green=0,amber=0,glare=0;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    let n=0,gCount=0,aCount=0;
    const left=Math.floor((rect.x+rect.w*col/cols)*image.width),right=Math.floor((rect.x+rect.w*(col+1)/cols)*image.width);
    const top=Math.floor((rect.y+rect.h*row/rows)*image.height),bottom=Math.floor((rect.y+rect.h*(row+1)/rows)*image.height);
    const step=Math.max(1,Math.floor(Math.min(right-left,bottom-top)/28));
    for(let y=top;y<bottom;y+=step)for(let x=left;x<right;x+=step){
      const i=(y*image.width+x)*4;if(image.data[i+3]<240)continue;
      const r=image.data[i],g=image.data[i+1],b=image.data[i+2],c=colour(r,g,b);
      if(c.v>.95&&c.s<.12){glare++;continue;}if(c.v<.12)continue;
      usable++;n++;
      if(c.h>=70&&c.h<=165&&c.s>.26&&g>r*1.06&&g>b*1.03){green++;gCount++;}
      if(c.h>=18&&c.h<=65&&c.s>.32){amber++;aCount++;}
    }
    if(n>=12&&(gCount/n>.4||aCount/n>.35))cells.push({kind:gCount/n>=aCount/n?'green':'amber',x:rect.x+rect.w*col/cols,y:rect.y+rect.h*row/rows,w:rect.w/cols,h:rect.h/rows,strength:Math.max(gCount,aCount)/n});
  }
  if(usable<90)return {kind:'unclear',text:'The selected water area is too dark, reflective, or small for a useful colour observation.',cells:[],region:rect};
  const gRatio=green/usable,aRatio=amber/usable;
  if(gRatio>.16)return {kind:'green',text:'Green-toned colour is visible in parts of the water area you marked. Algae, metals, reflections, and the pool finish can look similar in a photo; testing is needed to distinguish them.',cells:cells.filter(c=>c.kind==='green').sort((a,b)=>b.strength-a.strength).slice(0,8),region:rect};
  if(aRatio>.14)return {kind:'amber',text:'Yellow or brown tones are visible in the marked water area. This can relate to debris, staining, the finish, or reflections. The photo cannot establish which is responsible.',cells:cells.filter(c=>c.kind==='amber').sort((a,b)=>b.strength-a.strength).slice(0,8),region:rect};
  return {kind:'no-colour-signal',text:'No strong green or yellow/brown colour pattern was found in the area you marked. This does not establish water clarity, safe chemistry, or healthy equipment.',cells:[],region:rect};
}
const guides={
 water:{title:'Start with water care and circulation',locations:[['Water surface, walls, and steps','Check whether the change is floating debris, a slippery surface, suspended material, or a recurring mark.'],['Filter and return flow','Tell the team whether circulation changed before the water did.']],next:'Share current water-test results, recent treatments, and equipment operation. A photo cannot distinguish every cause of a colour change.',href:'/green-pool-cleaning/',label:'Explore water recovery'},
 flow:{title:'Start at the circulation system',locations:[['Pump and suction side','Low water, air entry, restrictions, or a priming problem can affect flow.'],['Filter and return side','Compare the current gauge reading with the clean baseline at a similar pump setting.']],next:'Record the model, gauge reading, and when flow changed. Do not open a pressurized filter. A running motor is not proof of adequate circulation.',href:'/pool-repair/',label:'Explore equipment diagnosis'},
 loss:{title:'Investigate the water-loss pattern',locations:[['Skimmer, fittings, and equipment pad','Visible drips, repeat stopping levels, and wet areas are clues to report, not proof of a specific leak.'],['Pool and circulation plumbing','Hidden faults need appropriate testing; a picture cannot locate an underground leak.']],next:'Record refills, autofill behaviour, weather, and when loss changes. Request leak detection rather than accepting a location from a photograph alone.',href:'/pool-leak-detection-repair/',label:'Explore leak detection'},
 stain:{title:'Start with the surface and the source',locations:[['Waterline or marked finish','A film, hard crust, rusty mark, and damaged material call for different treatment.'],['Nearby fittings and the wider pool','Note whether the mark returns in the same spot or followed a refill or equipment change.']],next:'Share close-ups and the finish type if known. Avoid an aggressive treatment until the surface and source have been assessed.',href:'/pool-tile-cleaning/',label:'Explore surface clues'},
 heat:{title:'Start with the heater, controls, and flow',locations:[['Heater display and operating mode','Record the exact model, message, setpoint, and whether the pool or spa is affected.'],['Circulation and heating conditions','Flow, schedules, heat loss, and outdoor conditions can change performance.']],next:'Share the symptoms and equipment label. A photo cannot test electrical supply, gas operation, refrigeration, or a failed sensor.',href:'/pool-heating-cooling/',label:'Explore heating diagnosis'},
 routine:{title:'Build a cleaning plan around the pool',locations:[['Surface, steps, benches, and floor','Compare where debris collects with the brushing, skimming, and vacuuming tasks.'],['Baskets, filtration, and water care','A regular routine combines cleaning, circulation checks, and testing.']],next:'Confirm the starting condition and whether an initial cleanup is separate from recurring care.',href:'/pool-cleaning/',label:'Compare cleaning services'}
};
export function buildAdvice(answers,observations=[]){
  const source=Object.hasOwn(guides,answers.issue)?guides[answers.issue]:guides.routine;
  const photoTexts=observations.map(o=>o.text);
  if(answers.hazard==='yes')return {title:'Get direct professional help',priority:'Contact the team directly',locations:[['Equipment area','An electrical concern, gas odour, or damaged equipment needs direct assessment; the photo checker cannot evaluate it.']],next:'Keep people away from the affected equipment. For an active gas smell or immediate danger, leave the area and contact the gas utility or emergency services. Do not keep operating or repeatedly resetting affected equipment.',href:'tel:+19457773345',label:'Call Frisco Pool Services',photoTexts};
  const notices=[];
  if(answers.floor==='no')notices.push('You said the pool floor cannot be seen clearly. Keep swimmers out and arrange a water-condition assessment.');
  if(answers.pump==='dry')notices.push('You reported a pump running dry. Turn it off and request equipment service rather than continuing to operate it.');
  return {...source,priority:notices.length?'Arrange an assessment':'A starting point to discuss',notices,photoTexts};
}
