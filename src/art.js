import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const textures=new Map(),materials=new Map(),geometries=new Map();
let anisotropy=4;
export function configureArt(renderer){anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
function rng(seed){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
export function canvasTexture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;return t;}
export function texture(type){
 if(textures.has(type))return textures.get(type);
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');const rand=rng([...type].reduce((s,c)=>s+c.charCodeAt(0),728));
 const image=g.createImageData(512,512);for(let i=0;i<image.data.length;i+=4){const n=184+rand()*55;image.data[i]=n;image.data[i+1]=n;image.data[i+2]=n;image.data[i+3]=255;}g.putImageData(image,0,0);
 const grime=g.createRadialGradient(260,220,30,260,220,370);grime.addColorStop(0,'#6a604b00');grime.addColorStop(1,'#27251850');g.fillStyle=grime;g.fillRect(0,0,512,512);
 for(let i=0;i<850;i++){const x=rand()*512,y=rand()*512,r=rand()*8;g.fillStyle=`rgba(${rand()>.5?'60,55,42':'255,247,220'},${rand()*.11})`;g.beginPath();g.ellipse(x,y,r,r*.3+rand()*2,rand()*3,0,Math.PI*2);g.fill();}
 if(type==='tile'||type==='concrete'){
  g.strokeStyle='#655e5060';g.lineWidth=3;for(let x=0;x<513;x+=128){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke();}for(let z=0;z<513;z+=128){g.beginPath();g.moveTo(0,z);g.lineTo(512,z);g.stroke();}
  g.strokeStyle='#fff3db66';g.lineWidth=1;for(let x=3;x<513;x+=128){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke();}
  for(let i=0;i<12;i++){let x=rand()*512,y=rand()*512;g.strokeStyle='#625c4955';g.lineWidth=.7;g.beginPath();g.moveTo(x,y);for(let j=0;j<5;j++){x+=(rand()-.4)*18;y+=rand()*14;g.lineTo(x,y);}g.stroke();}
 }
 if(type==='brick'||type==='roof'){
  g.strokeStyle='#4b483777';g.lineWidth=6;for(let y=0;y<512;y+=48){g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();for(let x=(y/48%2)*64;x<512;x+=128){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+48);g.stroke();}}
 }
 if(type==='wood'||type==='metal'){
  for(let i=0;i<400;i++){let y=rand()*512;g.strokeStyle=`rgba(40,38,32,${rand()*.12})`;g.lineWidth=rand()*2+.3;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(150,y+rand()*10,300,y-rand()*10,512,y);g.stroke();}
 }
 if(type==='paint'||type==='metal'){
  for(let i=0;i<75;i++){const x=rand()*512,y=rand()*512;g.fillStyle=rand()>.3?'#55483344':'#fff4dc50';g.fillRect(x,y,rand()*15+2,rand()*4+1);}
 }
 if(type==='cloth'){
  g.strokeStyle='#45443622';g.lineWidth=1;for(let i=0;i<512;i+=4){g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.moveTo(0,i);g.lineTo(512,i);g.stroke();}
 }
 const t=canvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;textures.set(type,t);return t;
}
export function material(type='paint',color=0xb4a68f){const k=type+color;if(materials.has(k))return materials.get(k);const m=new THREE.MeshPhysicalMaterial({color,map:texture(type),roughness:type==='metal'?.78:.86,metalness:0,clearcoat:0});if(type==='concrete'||type==='tile'||type==='brick'){m.bumpMap=m.map;m.bumpScale=.045;}materials.set(k,m);return m;}
export function clay(color){const k='clay'+color;if(materials.has(k))return materials.get(k);const map=texture('clay');const m=new THREE.MeshPhysicalMaterial({color,roughness:.83,metalness:0,map,bumpMap:map,bumpScale:.014});materials.set(k,m);return m;}
export function disposeObject(root){const sharedGeo=new Set([sphere,limb,shoeGeo,...geometries.values()]),sharedMat=new Set(materials.values()),sharedTex=new Set(textures.values()),geos=new Set(),mats=new Set(),maps=new Set();root.traverse(o=>{if(o.geometry&&!o.isSprite&&!sharedGeo.has(o.geometry))geos.add(o.geometry);if(o.material&&!sharedMat.has(o.material))mats.add(o.material);});for(const g of geos)g.dispose();for(const m of mats){if(m.map&&!sharedTex.has(m.map))maps.add(m.map);m.dispose();}for(const t of maps)t.dispose();}
export function roundedBox(w,h,d,r=.08,mat){const key=[w,h,d,r].join(',');let geo=geometries.get(key);if(!geo){geo=new RoundedBoxGeometry(w,h,d,2,Math.min(r,Math.min(w,h,d)/2));geometries.set(key,geo);}const mesh=new THREE.Mesh(geo,mat||material());mesh.castShadow=mesh.receiveShadow=true;return mesh;}
export function label(text,w=2,h=.5,opts={}){const c=document.createElement('canvas');c.width=512;c.height=Math.max(64,Math.round(512*h/w));const g=c.getContext('2d');if(opts.bg){g.fillStyle=opts.bg;g.fillRect(0,0,c.width,c.height);}g.textAlign='center';g.textBaseline='middle';g.fillStyle=opts.fg||'#eee7d0';g.font=opts.font||`900 ${Math.floor(c.height*.62)}px Arial`;g.fillText(text,c.width/2,c.height*.52,c.width*.9);const m=new THREE.MeshBasicMaterial({map:canvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);}

const sphere=new THREE.SphereGeometry(1,24,16),limb=new THREE.CapsuleGeometry(.205,.39,5,12),shoeGeo=new THREE.SphereGeometry(1,16,10);
const skinColors=[0xe0a360,0xda553e,0xe5ae7f,0xd7a987,0xd2a170,0xe0b590,0xc58c54];
const outfitColors=[0xe0a832,0xd84536,0x278e92,0x94609b,0x549440,0x416ba5,0xcd753c];
function addScaled(parent,geo,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function smallBall(parent,mat,x,y,z,sx,sy,sz){return addScaled(parent,shoeGeo,mat,x,y,z,sx,sy,sz);}
export function createCharacter(p){
 const root=new THREE.Group(),bodyRig=new THREE.Group();root.add(bodyRig);const a=p.archetype??p.id%7,skin=clay(skinColors[a]),outfit=clay(outfitColors[a]),dark=clay(0x343a37),cream=clay(0xe7dfc9),hair=clay(a===3?0xc3c1b6:0x342f29);
 const torso=new THREE.Group();torso.position.y=1.01;bodyRig.add(torso);addScaled(torso,sphere,a===1?cream:outfit,0,0,0,.55,.63,.40);
 const belly=smallBall(torso,a===1?cream:outfit,0,-.07,.10,.47,.39,.34);
 if(a===5){const shirt=roundedBox(.43,.72,.07,.05,cream);shirt.position.set(0,.1,.333);torso.add(shirt);const tie=roundedBox(.10,.37,.03,.02,dark);tie.position.set(0,.08,.385);tie.rotation.z=.08;torso.add(tie);}
 if(a===0||a===6){for(let i=0;i<3;i++)smallBall(torso,dark,0,.22-i*.14,.358,.022,.022,.022);}
 if(a===2){const zip=roundedBox(.018,.68,.03,.005,cream);zip.position.set(0,.12,.364);torso.add(zip);for(const s of [-1,1]){const string=roundedBox(.012,.2,.016,.004,cream);string.position.set(s*.095,.3,.37);torso.add(string);}}
 if(a===3){for(let j=0;j<9;j++){const th=j*2.4;const x=Math.sin(th)*.37,y=Math.cos(th)*.42;smallBall(torso,clay(0xc894c0),x,y,.305,.045,.045,.026);}}
 const headRig=new THREE.Group();headRig.position.y=.78;torso.add(headRig);const head=addScaled(headRig,sphere,skin,0,0,0,.54,.55,.49);
 for(const side of [-1,1])smallBall(headRig,skin,side*.51,-.05,-.01,.11,.16,.12);
 const nose=smallBall(headRig,skin,0,-.02,.465,.09,.087,.09);
 const faceCanvas=document.createElement('canvas');faceCanvas.width=faceCanvas.height=256;const faceTexture=canvasTexture(faceCanvas);const faceMat=new THREE.MeshBasicMaterial({map:faceTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const face=new THREE.Mesh(new THREE.SphereGeometry(.555,20,12,Math.PI/2-.70,1.40,.83,1.46),faceMat);face.scale.set(.978,1,.89);headRig.add(face);
 if(a===1||a===0||a===6){for(const side of [-1,1]){const moustache=smallBall(headRig,hair,side*.095,-.13,.509,.135,.056,.042);moustache.rotation.z=side*.17;}}
 if(a===0){smallBall(headRig,clay(0xe8b438),0,.38,-.015,.56,.25,.52);const brim=smallBall(headRig,dark,0,.28,.38,.53,.05,.3);const taxi=label('TAKSİ',.38,.12,{fg:'#302e20'});taxi.position.set(0,.44,.446);headRig.add(taxi);}
 else if(a===3){smallBall(headRig,hair,0,.22,-.16,.57,.40,.45);smallBall(headRig,hair,0,.58,-.30,.23,.24,.22);for(let j=0;j<5;j++)smallBall(headRig,hair,-.32+j*.16,.35,.24,.15,.17,.17);const glasses=new THREE.Mesh(new THREE.TorusGeometry(.14,.018,6,18),clay(0x713950));for(const s of [-1,1]){const gl=glasses.clone();gl.position.set(s*.2,.075,.507);headRig.add(gl);}const bridge=roundedBox(.09,.022,.02,.005,clay(0x713950));bridge.position.set(0,.075,.515);headRig.add(bridge);}
 else if(a===2||a===6){smallBall(headRig,hair,0,.28,-.12,.55,.36,.47);for(let j=0;j<4;j++)smallBall(headRig,hair,-.32+j*.2,.35,.29,.19,.17,.16);}
 else if(a===4){const cap=smallBall(headRig,outfit,0,.34,-.02,.56,.29,.50);smallBall(headRig,outfit,0,.23,.4,.51,.045,.28);const bag=roundedBox(.76,.87,.44,.12,material('cloth',0x3c692d));bag.position.set(0,.1,-.43);torso.add(bag);const badge=label('Bİ GETİR',.56,.2,{fg:'#e9e7b9'});badge.position.set(0,.18,-.66);badge.rotation.y=Math.PI;torso.add(badge);for(const s of [-1,1]){const strap=roundedBox(.06,.72,.04,.02,dark);strap.position.set(s*.3,.12,.32);strap.rotation.z=s*.14;torso.add(strap);}}
 else if(a===5){for(const s of [-1,1])smallBall(headRig,hair,s*.46,.02,-.10,.09,.22,.28);}
 const arms=[],legs=[];
 for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.49,.35,.015);torso.add(arm);const mesh=addScaled(arm,limb,a===1?skin:outfit,0,-.25,0,1,1,1);smallBall(arm,skin,0,-.52,.03,.21,.22,.205);arms.push(arm);const leg=new THREE.Group();leg.position.set(s*.235,-.47,0);torso.add(leg);addScaled(leg,limb,a===1?outfit:dark,0,-.2,0,.95,.67,.94);smallBall(leg,a===1?outfit:dark,0,-.41,.09,.225,.16,.31);legs.push(leg);}
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sg=shadowCanvas.getContext('2d'),rad=sg.createRadialGradient(32,32,0,32,32,32);rad.addColorStop(0,'#14201dc0');rad.addColorStop(.5,'#14201d60');rad.addColorStop(1,'#14201d00');sg.fillStyle=rad;sg.fillRect(0,0,64,64);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.3),new THREE.MeshBasicMaterial({map:canvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.50}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;
 const ringMat=new THREE.MeshBasicMaterial({color:p.id===0?0xf4d882:0xabc7d1,transparent:true,opacity:.8,depthWrite:false});const ring=new THREE.Mesh(new THREE.RingGeometry(.65,.69,40),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.022;
 const name=label(p.name||'Misafir',1.9,.26,{fg:p.id===0?'#fff1b0':'#e9e8db',font:'700 54px Arial'});name.material.depthTest=false;name.renderOrder=20;
 const bubbleCanvas=document.createElement('canvas');bubbleCanvas.width=512;bubbleCanvas.height=192;const bubbleMat=new THREE.SpriteMaterial({map:canvasTexture(bubbleCanvas),depthTest:false,transparent:true});const bubble=new THREE.Sprite(bubbleMat);bubble.scale.set(2.1,.79,1);bubble.visible=false;root.add(bubble);bubble.position.y=2.95;
 const sharedGeometry=new Set([sphere,limb,shoeGeo,...geometries.values()]);const sharedMaterial=new Set(materials.values());const ownedGeo=new Set(),ownedMat=new Set();for(const object of [root,shadow,ring,name])object.traverse(o=>{if(o.geometry&&!o.isSprite&&!sharedGeometry.has(o.geometry))ownedGeo.add(o.geometry);if(o.material&&!sharedMaterial.has(o.material))ownedMat.add(o.material);});
 function dispose(){for(const g of ownedGeo)g.dispose();const maps=new Set();for(const m of ownedMat){if(m.map&&!textures.has(m.map))maps.add(m.map);m.dispose();}for(const t of maps)t.dispose();}
 return{root,bodyRig,torso,headRig,head,arms,legs,faceCanvas,faceTexture,faceState:'',shadow,ring,ringMat,name,bubble,bubbleCanvas,bubbleMat,bubbleUntil:0,lastX:p.x,lastZ:p.z,stride:0,a,dispose};
}
export function drawFace(char,state){if(char.faceState===state)return;char.faceState=state;const g=char.faceCanvas.getContext('2d');g.clearRect(0,0,256,256);g.fillStyle='#282722';g.strokeStyle='#282722';g.lineCap='round';g.lineWidth=9;const blink=state==='blink',panic=state==='panic'||state==='shout',dead=state==='dead',angry=state==='angry';for(const x of [66,190]){if(dead){g.beginPath();g.moveTo(x-13,63);g.lineTo(x+13,91);g.moveTo(x+13,63);g.lineTo(x-13,91);g.stroke();}else if(blink){g.beginPath();g.moveTo(x-12,82);g.lineTo(x+12,82);g.stroke();}else{g.beginPath();g.ellipse(x,78,panic?19:14,panic?25:18,0,0,Math.PI*2);g.fill();g.fillStyle='#fff4d4';g.beginPath();g.ellipse(x-3,73,3,4,0,0,Math.PI*2);g.fill();g.fillStyle='#282722';}if(angry){g.beginPath();g.moveTo(x-17,45+(x<100?0:12));g.lineTo(x+17,45+(x<100?12:0));g.stroke();}}
 if(panic||dead){g.beginPath();g.ellipse(128,165,23,32,0,0,Math.PI*2);g.fill();g.fillStyle='#ae6353';g.beginPath();g.ellipse(128,183,15,7,0,0,Math.PI*2);g.fill();}else if(angry){g.fillStyle='#29261f';g.fillRect(93,147,70,32);g.fillStyle='#f0e7cc';g.fillRect(98,151,60,19);g.strokeStyle='#a09179';g.lineWidth=2;for(let x=108;x<158;x+=13){g.beginPath();g.moveTo(x,151);g.lineTo(x,170);g.stroke();}}else{g.lineWidth=6;g.beginPath();g.arc(128,139,23,.22,Math.PI-.22);g.stroke();}char.faceTexture.needsUpdate=true;}
export function speech(char,text,time){const g=char.bubbleCanvas.getContext('2d');g.clearRect(0,0,512,192);g.fillStyle='#f5edda';g.beginPath();g.roundRect(10,8,490,143,30);g.fill();g.beginPath();g.moveTo(228,140);g.lineTo(254,183);g.lineTo(279,140);g.fill();g.fillStyle='#292e25';g.font='italic 900 74px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text||'SIKTR!',256,85,450);char.bubbleMat.map.needsUpdate=true;char.bubble.visible=true;char.bubbleUntil=time+1.3;}
