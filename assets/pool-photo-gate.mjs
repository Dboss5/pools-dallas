// No photo may be previewed or analysed before every face scan finishes successfully.
export const FACE_API_VERSION='0.22.2';
export const LIBRARY_URL=new URL('./vendor/face-api-0.22.2.min.js',import.meta.url).href;
export const MODEL_ROOT=new URL('./vendor/',import.meta.url).href;
let detectorPromise;
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
function loadLibrary(){return new Promise((resolve,reject)=>{if(globalThis.faceapi){resolve();return}const script=document.createElement('script');script.src=LIBRARY_URL;script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('face-library-unavailable'))};document.head.append(script)})}
export async function loadDetector(){
  if(!detectorPromise)detectorPromise=(async()=>{await loadLibrary();const api=globalThis.faceapi;if(!api)throw new Error('face-library-unavailable');await api.tf.setBackend('cpu');await api.tf.ready();await api.nets.tinyFaceDetector.loadFromUri(MODEL_ROOT);const options=new api.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.25});return {detect:async canvas=>({detections:await api.detectAllFaces(canvas,options)})};})().catch(err=>{detectorPromise=null;throw err;});
  return detectorPromise;
}
export async function verifyFaceScan(scan,{shouldCancel=()=>false,onProgress=()=>{}}={}){
  // Separately exported so the rejection and fail-closed rules can be tested.
  for(let i=0;i<13;i++){
    if(shouldCancel())throw new Error('cancelled');
    onProgress(i+1,13);const result=await scan(i);
    if(!result||!Array.isArray(result.detections))throw new Error('face-check-incomplete');
    if(result.detections.length)return {accepted:false,reason:'face-detected'};
    await yieldUI();
  }
  if(shouldCancel())throw new Error('cancelled');
  return {accepted:true};
}
export function validateStillImage(bytes){
  const text=(start,n)=>String.fromCharCode(...bytes.slice(start,start+n));
  if(bytes[0]===0x89&&text(1,3)==='PNG'){
    let offset=8;
    while(offset+12<=bytes.length){const size=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);const tag=text(offset+4,4);if(tag==='acTL')throw new Error('Use a still photo. Animated PNG and WebP images are not accepted.');if(offset+12+size>bytes.length)throw new Error('Use a valid still PNG photo.');if(tag==='IHDR'&&size>=8){const view=new DataView(bytes.buffer,bytes.byteOffset+offset+8,8);if(view.getUint32(0)*view.getUint32(4)>24_000_000)throw new Error('Use a photo of 24 megapixels or less.');}offset+=12+size;if(tag==='IEND')break;}return;
  }
  if(text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
    let offset=12;
    while(offset+8<=bytes.length){const tag=text(offset,4),size=new DataView(bytes.buffer,bytes.byteOffset+offset+4,4).getUint32(0,true);if(tag==='ANIM'||tag==='ANMF'||tag==='VP8X'&&(bytes[offset+8]&2))throw new Error('Use a still photo. Animated PNG and WebP images are not accepted.');if(offset+8+size>bytes.length)throw new Error('Use a valid still WebP photo.');offset+=8+size+(size%2);}return;
  }
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return;
  throw new Error('Use a still JPEG, PNG, or WebP photo.');
}
export async function inspectPhoto(file,{shouldCancel=()=>false,onProgress=()=>{},detectorFactory=loadDetector,decode=globalThis.createImageBitmap,createCanvas=()=>document.createElement('canvas')}={}){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPEG, PNG, or WebP photo. HEIC, GIF, and SVG are not accepted.');
  if(file.size>10*1024*1024)throw new Error('Choose a photo smaller than 10 MB.');
  if(typeof file.arrayBuffer==='function')validateStillImage(new Uint8Array(await file.arrayBuffer()));
  let bitmap,canvas;
  try{
    // Decode only into private temporary memory. No object URL, preview, storage, or upload.
    const detector=await detectorFactory();if(shouldCancel())throw new Error('cancelled');
    bitmap=await decode(file,{imageOrientation:'from-image'});
    if(bitmap.width*bitmap.height>24_000_000||bitmap.width<160||bitmap.height<160)throw new Error('Use a photo between 160 pixels per side and 24 megapixels.');
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale);
    canvas=createCanvas();canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('This browser could not prepare the photo.');
    const scan=async i=>{
      if(i<4){const quarter=i;canvas.width=quarter%2?h:w;canvas.height=quarter%2?w:h;const c=canvas.getContext('2d');c.translate(canvas.width/2,canvas.height/2);c.rotate(quarter*Math.PI/2);c.drawImage(bitmap,-w/2,-h/2,w,h);}
      else{const n=i-4,side=Math.round(Math.min(bitmap.width,bitmap.height)*.6);canvas.width=640;canvas.height=640;const sx=(bitmap.width-side)*(n%3)/2,sy=(bitmap.height-side)*Math.floor(n/3)/2;canvas.getContext('2d').drawImage(bitmap,sx,sy,side,side,0,0,640,640);}
      return detector.detect(canvas);
    };
    const verdict=await verifyFaceScan(scan,{shouldCancel,onProgress});
    if(!verdict.accepted)return verdict;
    if(shouldCancel())throw new Error('cancelled');
    // Re-encode as pixels only: the retained canvas carries no EXIF or original filename.
    const clean=createCanvas(),outScale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
    clean.width=Math.round(bitmap.width*outScale);clean.height=Math.round(bitmap.height*outScale);clean.getContext('2d').drawImage(bitmap,0,0,clean.width,clean.height);
    return {accepted:true,canvas:clean};
  }finally{if(bitmap)bitmap.close();if(canvas){canvas.width=0;canvas.height=0;}}
}
