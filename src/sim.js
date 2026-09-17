// Everything affecting gameplay, including the random generator, lives in state.
// Replay by cloning state and feeding the same ordered 60 Hz input frames.
export const MAPS = [
  {id:'rooftop',name:'ROOFTOP',subtitle:'İstanbul below. Absolutely no railings.'},
  {id:'minibus',name:'MINIBUS',subtitle:'Next stop: the pavement.'},
  {id:'wedding',name:'WEDDING HALL',subtitle:'Someone invited the entire neighbourhood.'},
  {id:'cafe',name:'INTERNET CAFE',subtitle:'Your session has expired.'},
  {id:'metro',name:'METRO STATION',subtitle:'Please stand behind literally anything.'},
  {id:'park',name:'PARK',subtitle:'Municipal equipment. Personal consequences.'}
];
const TAU=Math.PI*2, HALF_X=8.5, HALF_Z=6.5, GRAVITY=18;
const COLORS=['#db4544','#e7ba35','#37a5a0','#9461b0','#62a55a','#427bd1'];
const NAMES=['YOU','ŞOFÖR','BERK','TEYZE','KURYE','MESAİ'];
const CHAOS=['earthquake','wind','boxes','lurch','slick','blackout'];
const POWERS=['megaphone','slipper','tea','doner'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(x,z)=>Math.hypot(x,z);
function random(s){s.seed=(s.seed+0x6D2B79F5)>>>0;let t=s.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function emit(s,type,p,extra={}){s.events.push({type,player:p?.id??-1,x:p?.x??0,y:p?.y??0,z:p?.z??0,...extra});}
function body(id,type,x,z,s){return {id,type,x,y:0,z,vx:0,vy:0,vz:0,angle:random(s)*TAU,alive:true,heldBy:null,broken:false,radius:type==='table'?.95:type==='chair'?.48:.4,mass:type==='table'?1.6:type==='chair'?.6:.4,angularVelocity:0};}
function addProp(s,type,x,z,y=0){const p=body(s.nextProp++,type,x,z,s);p.y=y;s.props.push(p);return p;}
function mapColliders(map){
  // Centers and dimensions match the visible world.js meshes. Tiny pipes,
  // planters, cloth and rubble are dressing; broad fall gaps remain open.
  const list=[],box=(x,z,width,depth,height)=>list.push({x,z,width,depth,height});
  if(map===0){
    for(const [x,z,w,d,h] of [[-6.7,-6.17,3.4,.5,.70],[.25,-6.17,4.5,.5,.74],[6.6,-6.17,3.5,.5,.76],[-8.18,-3.6,.48,3.3,.55],[8.18,-3.1,.48,3.7,.55],[-8.18,3.6,.48,2.7,.38],[8.18,4,.48,2.7,.35],[-6.9,6.18,2.8,.5,.32],[6.7,6.18,3.1,.5,.38]])box(x,z,w,d,h+.1);
    for(const [x,z,k] of [[-6.65,4.55,1.25],[-5.5,-4.75,1.12],[6.55,4.55,.95]])box(x,z,1.78*k,.93*k,1.32*k);
    box(6.4,-4.72,2.05,2.1,3.1);box(7.56,-1.65,1.07,1.04,2.18);
  }
  if(map===1){
    box(0,-6.15,16.9,.3,2.85);box(0,-5.35,15.2,1.15,1.2);
    for(const side of [-1,1])for(const z of [-4.5,0,4.5]){box(side*8.04,z,.24,2.3,.88);box(side*8.1,z,.3,.25,3.15);}
  }
  if(map===2)box(0,-6.3,17,.35,3.4);
  if(map===3){box(0,-6.3,17,.3,3.55);for(const side of [-1,1])box(side*8.15,-4.7,.3,3.2,2.65);}
  if(map===4){box(0,-6.85,17,.42,3.575);for(const x of [-6.4,6.4])box(x,-4.4,.55,.55,3.1);}
  return list;
}
export function createState(seed=12345,map=0){
  map=typeof map==='string'?Math.max(0,MAPS.findIndex(m=>m.id===map)):clamp(Math.floor(map),0,5);
  const s={seed:seed>>>0,tick:0,time:0,map,phase:'playing',players:[],props:[],powerups:[],puddles:[],events:[],winner:null,finishTime:0,slowmo:1,slowmoRemaining:0,pressure:0,nextProp:0,nextPower:0,powerTimer:7,chaos:{next:30,type:'earthquake',warning:0,active:false,remaining:0,dx:1,dz:0},hazard:{type:MAPS[map].id,warning:0,active:false,phase:0,progress:0,dx:1,dz:0,x:0,z:0,cycle:-1,period:map===1?12:map===4?21:18}};
  s.colliders=mapColliders(map);
  for(let i=0;i<6;i++){
    const a=i*TAU/6;
    s.players.push({id:i,name:NAMES[i],bot:i!==0,archetype:[1,0,2,3,4,5][i],color:COLORS[i],x:Math.sin(a)*3.8,y:0,z:Math.cos(a)*3, vx:0,vy:0,vz:0,angle:a+Math.PI,alive:true,mass:1,radius:.55,stability:1,ragdoll:0,shoutCd:.5+i*.13,buttCd:.6,stagger:0,holding:null,heldBy:null,holdTime:0,airborne:false,power:null,segments:Array.from({length:6},()=>({rx:0,rz:0,vx:0,vz:0})),buttActive:0,buttHit:false,buttTargets:[],hitTime:0,teaTimer:0,brain:{next:0,target:-1,aggression:.55+random(s)*.35,side:random(s)<.5?-1:1,input:{}},grabLatch:false,throwLatch:false});
  }
  if(map===0){addProp(s,'chair',-5,1.5);addProp(s,'box',5,-1.8);addProp(s,'box',5.6,-2.4);}
  if(map===1){addProp(s,'box',-4,-1);addProp(s,'box',4,1);}
  if(map===2)for(const [x,z]of [[-4,-2.5],[4,-2.5],[-4,2.5],[4,2.5]]){addProp(s,'table',x,z);addProp(s,'chair',x-1,z+.7);addProp(s,'chair',x+1,z-.7);}
  if(map===3)for(const x of [-4.8,-2.4,0,2.4,4.8]){addProp(s,'monitor',x,-3.8,1.25);addProp(s,'chair',x,-1.8);}
  if(map===4){addProp(s,'box',-5,2);addProp(s,'chair',5,2);}
  if(map===5){addProp(s,'box',4,-2);addProp(s,'chair',4,3);s.puddles.push({x:2,z:1,radius:2.1,remaining:1e6},{x:-3,z:3,radius:1.6,remaining:1e6});}
  return s;
}

// Impulse collision is symmetric for any masses and conserves linear momentum.
// Returns closing speed so audio, stability and prop damage use the same impact.
export function resolveCollision(a,b){
  let dx=b.x-a.x,dz=b.z-a.z;const r=(a.radius??.55)+(b.radius??.55),d2=dx*dx+dz*dz;
  if(d2>=r*r||Math.abs(a.y-b.y)>1.65)return 0;
  let d=Math.sqrt(d2);if(d<1e-7){dx=1;dz=0;d=1;}else{dx/=d;dz/=d;}
  const ia=1/(a.mass??1),ib=1/(b.mass??1),overlap=r-(d2<1e-14?0:d);
  a.x-=dx*overlap*ia/(ia+ib);a.z-=dz*overlap*ia/(ia+ib);b.x+=dx*overlap*ib/(ia+ib);b.z+=dz*overlap*ib/(ia+ib);
  const relative=(b.vx-a.vx)*dx+(b.vz-a.vz)*dz;
  if(relative>=0)return 0;
  const impulse=-1.6*relative/(ia+ib);
  a.vx-=impulse*dx*ia;a.vz-=impulse*dz*ia;b.vx+=impulse*dx*ib;b.vz+=impulse*dz*ib;
  return -relative;
}
function release(s,p,throwing=false){
  if(!p.holding)return;
  const q=(p.holding.kind==='player'?s.players:s.props).find(v=>v.id===p.holding.id);
  if(q){q.heldBy=null;const force=throwing?6+Math.min(2,p.holdTime)*5:1.2;
    q.vx=p.vx+Math.sin(p.angle)*force;q.vz=p.vz+Math.cos(p.angle)*force;q.vy=throwing?4.8:1;
    if(q.segments){q.ragdoll=1;q.stagger=.8;q.stability=Math.max(0,q.stability-.35);}
    if(throwing){p.vx-=Math.sin(p.angle)*1.7;p.vz-=Math.cos(p.angle)*1.7;emit(s,'throw',p,{target:q.id,force});}
  }
  p.holding=null;p.holdTime=0;
}
function impact(s,p,dx,dz,force,up=2.6,source=null){
  if(!p.alive)return;
  p.vx+=dx*force;p.vz+=dz*force;p.vy=Math.max(p.vy,up);
  if(p.segments){p.stability=Math.max(0,p.stability-force*.055);p.ragdoll=Math.max(p.ragdoll,clamp(force/10,.22,1));p.stagger=Math.max(p.stagger,Math.min(.8,force*.048));p.hitTime=.2;
    for(let i=0;i<6;i++){p.segments[i].vx+=dz*force*(i%2?1:-1)*.8;p.segments[i].vz-=dx*force*(i%2?-1:1)*.8;}
    if(p.holding&&force>5)release(s,p);
  }else{p.angularVelocity+=force*.5;}
  emit(s,'impact',p,{target:source?.id,force});
}
function shout(s,p){
  p.shoutCd=1.2;const dx=Math.sin(p.angle),dz=Math.cos(p.angle),boost=p.power?.type==='megaphone'?3:1;
  const pressure=1+s.pressure*.55;
  for(const q of [...s.players,...s.props]){
    if(q===p||!q.alive||q.heldBy!==null||Math.abs(q.y-p.y)>2)continue;
    const x=q.x-p.x,z=q.z-p.z,d=length(x,z);
    if(d<4&&d>.001&&(x*dx+z*dz)/d>=Math.SQRT1_2)impact(s,q,x/d,z/d,(3.2+6.4*(1-d/4))*boost*pressure,2.5,p);
  }
  p.vx-=dx*2.1;p.vz-=dz*2.1;p.ragdoll=Math.max(.15,p.ragdoll);
  const lines=['SIKTR!','NOPE!','OUT!','GET LOST!','GO AWAY!'];emit(s,'shout',p,{force:boost,text:lines[Math.floor(random(s)*lines.length)]});
}
function grab(s,p){
  if(p.holding){release(s,p);return;}
  const dx=Math.sin(p.angle),dz=Math.cos(p.angle);let best=null,bestD=1.65;
  for(const q of [...s.players,...s.props]){
    if(q===p||!q.alive||q.heldBy!==null||Math.abs(q.y-p.y)>1.5)continue;
    const x=q.x-p.x,z=q.z-p.z,d=length(x,z);
    if(d<bestD&&(x*dx+z*dz)>-d*.2){best=q;bestD=d;}
  }
  if(best){p.holding={kind:best.segments?'player':'prop',id:best.id};p.holdTime=0;best.heldBy=p.id;if(best.holding)release(s,best);emit(s,'grab',p,{target:best.id});}
}
function melee(s,p){
  for(const q of [...s.players,...s.props]){
    if(q===p||!q.alive||q.heldBy!==null||p.buttTargets.includes((q.segments?'p':'o')+q.id)||Math.abs(q.y-p.y)>1.6)continue;
    const x=q.x-p.x,z=q.z-p.z,d=length(x,z);
    if(d<1.75&&(x*Math.sin(p.angle)+z*Math.cos(p.angle))/Math.max(.01,d)>.25){
      const slipper=p.power?.type==='slipper',force=(slipper?25:10.5)*(1+s.pressure*.65);
      impact(s,q,Math.sin(p.angle),Math.cos(p.angle),force,slipper?6:3.4,p);p.buttHit=true;p.buttTargets.push((q.segments?'p':'o')+q.id);p.vx*=.55;p.vz*=.55;emit(s,'headbutt',p,{target:q.id,force});if(slipper)p.power=null;
    }
  }
}

export function botInput(s,p){
  const b=p.brain;if(s.time<b.next)return b.input;
  b.next=s.time+.14+random(s)*.13;
  if(b.attackAt===undefined)b.attackAt=3+p.id*.7+random(s)*4;
  const alive=s.players.filter(q=>q.alive&&q!==p);if(!alive.length)return b.input={};
  let target=alive.find(q=>q.id===b.target);
  if(!target||random(s)<.16){target=alive.reduce((a,q)=>length(q.x-p.x,q.z-p.z)-q.ragdoll*.8<length(a.x-p.x,a.z-p.z)-a.ragdoll*.8?q:a);b.target=target.id;}
  let tx=target.x,tz=target.z,dx=tx-p.x,dz=tz-p.z,d=length(dx,dz),angle=Math.atan2(dx,dz);
  const edge=Math.max(Math.abs(p.x)/7.2,Math.abs(p.z)/5.3),panicking=Math.max(Math.abs(p.x+p.vx*.4)/6.5,Math.abs(p.z+p.vz*.4)/4.7)>1||p.y<-.1;
  if(p.holding){
    // Carry captives toward the nearest edge, then aim out and charge a throw.
    const ex=Math.abs(p.x)/8.5>Math.abs(p.z)/6.5?Math.sign(p.x||1):0,ez=ex?0:Math.sign(p.z||1);
    angle=Math.atan2(ex,ez);dx=ex*.7;dz=ez*.7;
    return b.input={x:dx,z:dz,angle,throw:p.holdTime>1.15||edge>.93};
  }
  if(panicking){dx=-p.x*2-p.vx*.8;dz=-p.z*2-p.vz*.8;angle=Math.atan2(target.x-p.x,target.z-p.z);}
  else{
    const desired=s.powerups.find(q=>q.alive&&length(q.x-p.x,q.z-p.z)<4&&!p.power);
    if(desired&&d>2.7){dx=desired.x-p.x;dz=desired.z-p.z;}
    else if(d>1.6||s.time<b.attackAt){
      // Approach from the inside so the target, rather than the attacker, faces the void.
      const outward=length(tx,tz)||1,spacing=s.time<b.attackAt?2.9:.9;
      dx=tx-tx/outward*spacing-p.x;dz=tz-tz/outward*spacing-p.z;
      if(s.time<b.attackAt){
        // Circle the opponent between attacks, leaving room for separate fights.
        const orbit=Math.atan2(p.x-tx,p.z-tz)+b.side*.65;
        dx=clamp(tx+Math.sin(orbit)*2.5,-5.8,5.8)-p.x;
        dz=clamp(tz+Math.cos(orbit)*2.5,-4.1,4.1)-p.z;
        for(const q of alive){const sx=p.x-q.x,sz=p.z-q.z,dist=length(sx,sz);if(dist>.01&&dist<2.1){dx+=sx/dist*(2.1-dist)*1.2;dz+=sz/dist*(2.1-dist)*1.2;}}
      }
      if(s.map===3&&Math.abs(p.z+3.8)<1.4&&Math.abs(p.x)<6.6){dx=Math.sign(p.x||b.side)*2;dz=p.z> -3.8?1:-1;}
    }else{dx*=.3;dz*=.3;}
  }
  const m=Math.max(1,length(dx,dz));dx/=m;dz/=m;
  const blocked=(x,z)=>s.colliders.some(c=>p.y<c.height-.04&&Math.abs(x-c.x)<c.width/2+p.radius+.12&&Math.abs(z-c.z)<c.depth/2+p.radius+.12);
  if(blocked(p.x+dx*.9,p.z+dz*.9)){
    const a=Math.atan2(dx,dz),speed=Math.max(.5,length(dx,dz));
    for(const turn of [.8*b.side,-.8*b.side,1.57*b.side,-1.57*b.side,2.3*b.side]){
      const x=Math.sin(a+turn),z=Math.cos(a+turn);
      if(!blocked(p.x+x*.9,p.z+z*.9)){dx=x*speed;dz=z*speed;break;}
    }
  }
  if(!panicking&&s.time<b.attackAt){dx*=.58;dz*=.58;}
  const attack=!panicking&&s.time>=b.attackAt&&d<3.6&&random(s)<b.aggression;
  const roll=random(s),canGrab=attack&&d<1.5&&roll<.13,canButt=attack&&d<2.2&&p.buttCd<=0&&roll>=.13&&roll<.38;
  const canShout=attack&&!canGrab&&!canButt&&p.shoutCd<=0;
  if(canGrab||canButt||canShout)b.attackAt=s.time+(s.time<120?10+random(s)*10:3+random(s)*4);
  b.input={x:dx,z:dz,angle,shout:canShout,butt:canButt,grab:canGrab,throw:false};
  return b.input;
}

function wet(s,p){return (s.chaos.active&&s.chaos.type==='slick')||s.puddles.some(q=>length(p.x-q.x,p.z-q.z)<q.radius);}
function floorHeight(s,p){
  if(Math.abs(p.x)>HALF_X+.12||Math.abs(p.z)>HALF_Z+.12)return null;
  let top=0;
  for(const c of s.colliders)if(p.y>=c.height-.12&&Math.abs(p.x-c.x)<c.width/2&&Math.abs(p.z-c.z)<c.depth/2)top=Math.max(top,c.height);
  if(s.map===3&&Math.abs(p.x)<6&&Math.abs(p.z+3.8)<.675&&p.y>=1.05)return 1.25;
  return top;
}
function staticCollisions(s,p){
  for(const c of s.colliders){
    if(p.y>=c.height-.035||p.y+(p.segments?2.15:.7)<0)continue;
    const left=c.x-c.width/2,right=c.x+c.width/2,back=c.z-c.depth/2,front=c.z+c.depth/2;
    let dx=p.x-clamp(p.x,left,right),dz=p.z-clamp(p.z,back,front),d=length(dx,dz);
    if(d>=p.radius)continue;
    if(d<1e-8){
      const gaps=[p.x-left,right-p.x,p.z-back,front-p.z],n=gaps.indexOf(Math.min(...gaps));
      dx=n===0?-1:n===1?1:0;dz=n===2?-1:n===3?1:0;
      p.x+=dx*(gaps[n]+p.radius);p.z+=dz*(gaps[n]+p.radius);
    }else{dx/=d;dz/=d;p.x+=dx*(p.radius-d);p.z+=dz*(p.radius-d);}
    const incoming=p.vx*dx+p.vz*dz;
    if(incoming<0){p.vx-=1.6*incoming*dx;p.vz-=1.6*incoming*dz;
      if(p.segments&&incoming< -3){p.ragdoll=Math.max(p.ragdoll,Math.min(.8,-incoming*.065));p.hitTime=.12;emit(s,'impact',p,{force:-incoming});}
    }
  }
}
function deskCollision(s,p,oldX,oldZ){
  if(s.map!==3||p.y>1.15||p.y<-.8||Math.abs(p.x)>6+p.radius||Math.abs(p.z+3.8)>.675+p.radius)return;
  const left=Math.abs(p.x-(-6-p.radius)),right=Math.abs(p.x-(6+p.radius)),front=Math.abs(p.z-(-3.125+p.radius)),back=Math.abs(p.z-(-4.475-p.radius));
  const m=Math.min(left,right,front,back);
  if(m===left){p.x=-6-p.radius;p.vx=-Math.abs(p.vx)*.6;}else if(m===right){p.x=6+p.radius;p.vx=Math.abs(p.vx)*.6;}else if(m===front){p.z=-3.125+p.radius;p.vz=Math.abs(p.vz)*.6;}else{p.z=-4.475-p.radius;p.vz=-Math.abs(p.vz)*.6;}
  if(length(p.vx,p.vz)>4&&p.segments){p.vy=Math.max(p.vy,6.5);p.ragdoll=Math.max(.5,p.ragdoll);}
}
function integrate(s,p,dt){
  const oldY=p.y,oldX=p.x,oldZ=p.z;p.x+=p.vx*dt;p.z+=p.vz*dt;
  p.vy-=GRAVITY*dt;p.y+=p.vy*dt;
  if(!p.segments&&p.vy< -4){
    for(const q of s.players){
      const top=q.y+2.15;
      if(!q.alive||q.heldBy!==null||oldY<top||p.y>top||length(p.x-q.x,p.z-q.z)>p.radius+q.radius)continue;
      let dx=q.x-p.x,dz=q.z-p.z,d=length(dx,dz);
      if(d<.01){dx=Math.sin(p.id*2.4);dz=Math.cos(p.id*2.4);d=1;}
      const force=clamp(-p.vy*.6,4,9);impact(s,q,dx/d,dz/d,force,1.4);p.y=top+.02;p.vy=-p.vy*.28;p.vx-=dx/d*force*.5;p.vz-=dz/d*force*.5;
      break;
    }
  }
  const floor=floorHeight(s,p);
  if(floor!==null&&oldY>=floor-.12&&p.y<floor&&p.vy<0){
    const speed=-p.vy;p.y=floor;p.vy=speed>3.2?speed*.18:0;
    if(p.segments&&speed>4.4){emit(s,'impact',p,{force:speed});p.ragdoll=Math.max(p.ragdoll,Math.min(.9,speed*.08));p.hitTime=.15;}
    if(!p.segments&&speed>9)breakProp(s,p,speed);
  }
  deskCollision(s,p,oldX,oldZ);
  staticCollisions(s,p);
  p.airborne=p.y>(floor??0)+.07||floor===null||p.vy>1;
  if(!p.segments){const damp=Math.exp(-(p.airborne?.12:wet(s,p)?.09:2.3)*dt);p.vx*=damp;p.vz*=damp;p.angle+=p.angularVelocity*dt;p.angularVelocity*=Math.exp(-dt*.9);}
  if(p.y< -8){p.alive=false;if(p.segments){release(s,p);if(p.heldBy!==null)release(s,s.players[p.heldBy]);emit(s,'eliminate',p,{text:'OUT!'});}else p.heldBy=null;}
}
function breakProp(s,p,force){
  if(p.broken||p.type==='box'||s.props.length>64)return;
  p.broken=true;p.radius*=.55;p.mass*=.6;p.angularVelocity+=force;
  for(let i=0;i<3;i++){const fragment=addProp(s,'box',p.x+(random(s)-.5)*.6,p.z+(random(s)-.5)*.6,p.y+.4);fragment.radius=.2;fragment.mass=.2;fragment.broken=true;fragment.vx=p.vx+(random(s)-.5)*5;fragment.vz=p.vz+(random(s)-.5)*5;fragment.vy=3+random(s)*3;}
}
function ragdoll(p,dt){
  const speed=length(p.vx,p.vz),settled=!p.airborne&&speed<3.5&&p.stagger<=0;
  p.ragdoll=Math.max(.035,p.ragdoll-dt*(settled?1/.9:.12));
  p.stability=clamp(p.stability+dt*(settled?.2:.035),0,1);
  const gait=Math.sin(p.walkPhase??0);p.walkPhase=(p.walkPhase??0)+speed*dt*2.6;
  for(let i=0;i<6;i++){
    const seg=p.segments[i],arm=i===2||i===3,leg=i>3;
    const tx=clamp(p.vz*.052,-.6,.6)+(leg?gait*(i===4?1:-1)*.36:arm?-.15+gait*(i===2?-1:1)*.23:0);
    const tz=clamp(-p.vx*.052,-.6,.6)+(arm?(i===2?1:-1)*.16:0);
    const spring=(arm?25:55)*(1-p.ragdoll*.76),damping=arm?4.5:7;
    seg.vx+=((tx-seg.rx)*spring-seg.vx*damping)*dt;seg.vz+=((tz-seg.rz)*spring-seg.vz*damping)*dt;
    seg.rx=clamp(seg.rx+seg.vx*dt,-1.65,1.65);seg.rz=clamp(seg.rz+seg.vz*dt,-1.65,1.65);
  }
}
function timers(p,dt){for(const k of ['shoutCd','buttCd','stagger','hitTime'])p[k]=Math.max(0,p[k]-dt);if(p.power){p.power.remaining-=dt;if(p.power.remaining<=0)p.power=null;}}
function hazard(s,dt){
  const h=s.hazard,id=MAPS[s.map].id;h.phase=s.time;h.warning=0;h.active=false;
  const period=h.period,cycle=Math.floor(s.time/period),local=s.time%period;
  if(cycle!==h.cycle){h.cycle=cycle;const angle=random(s)*TAU;h.dx=Math.sin(angle);h.dz=Math.cos(angle);}
  if(id==='rooftop'||id==='minibus'){
    const duration=id==='minibus'?2.2:3;
    h.warning=local>=period-duration-3&&local<period-duration?period-duration-local:0;h.active=local>=period-duration;h.progress=h.active?(local-(period-duration))/duration:0;
    if(h.active){const force=(id==='minibus'?7:5.3)*(1+s.pressure*.7);for(const p of [...s.players,...s.props])if(p.alive&&p.heldBy===null){p.vx+=h.dx*force*dt;p.vz+=h.dz*force*dt;if(p.segments)p.ragdoll=Math.max(p.ragdoll,.25);}}
  }else if(id==='metro'){
    h.warning=local>=12&&local<15?15-local:0;h.active=local>=15;h.progress=h.active?(local-15)/6:0;h.x=-22+h.progress*44;h.z=-5.65;
    if(h.active)for(const p of [...s.players,...s.props])if(p.alive&&p.heldBy===null&&Math.abs(p.z+5.65)<.9&&Math.abs(p.x-h.x)<6.5&&p.y<2.6&&p.vx<13)impact(s,p,1,-.15,18,5);
  }else if(id==='park'){
    h.phase=s.time*1.7;h.active=true;h.x=-6;h.z=-3+2.75*Math.sin(.8*Math.sin(h.phase));
    for(const p of [...s.players,...s.props])if(p.alive&&p.heldBy===null&&length(p.x-h.x,p.z-h.z)<1&&p.y<1.5&&Math.abs(p.vz)<6)impact(s,p,.1,Math.sign(Math.cos(h.phase)),7.5,3);
  }else if(id==='wedding'){
    h.active=true;h.x=Math.sin(s.time*.48)*5;h.z=Math.cos(s.time*.7)*2.5;h.dx=Math.cos(s.time*.48);h.dz=-Math.sin(s.time*.7);
    for(const p of [...s.players,...s.props])if(p.alive&&p.heldBy===null&&length(p.x-h.x,p.z-h.z)<1.2&&p.y<1&&length(p.vx,p.vz)<5)impact(s,p,h.dx,h.dz,5,2);
  }else if(id==='cafe'){
    // Overloaded desk electrics spit a rolling monitor into the room every 18s.
    h.warning=local>12&&local<15?15-local:0;h.active=local>=15;h.x=Math.sin(cycle*2.4)*4.8;h.z=-3.8;h.progress=h.active?(local-15)/3:0;
    if(h.active&&local-dt<15){const m=addProp(s,'monitor',h.x,-2.6,1.35);m.vz=8;m.vy=2;emit(s,'impact',m,{force:6});}
  }
}
function chaos(s,dt){
  const c=s.chaos;
  if(!c.active){
    c.warning=Math.max(0,c.next-s.time)<=3?Math.max(0,c.next-s.time):0;
    if(s.time>=c.next){c.active=true;c.remaining=c.type==='blackout'?4:c.type==='slick'?7:4;c.warning=0;emit(s,'chaos',null,{text:c.type.toUpperCase()});
      if(c.type==='boxes')for(let i=0;i<7;i++)addProp(s,'box',(random(s)-.5)*13,(random(s)-.5)*9,8+random(s)*5);
      if(c.type==='lurch')for(const p of s.players)if(p.alive)impact(s,p,c.dx,c.dz,5+3*s.pressure,2);
    }
  }else{
    c.remaining-=dt;
    if(c.type==='wind'||c.type==='earthquake')for(const p of [...s.players,...s.props])if(p.alive&&p.heldBy===null){const factor=c.type==='wind'?4.8:Math.sin(s.time*25)*10;p.vx+=c.dx*factor*dt;p.vz+=c.dz*factor*dt;if(p.segments)p.ragdoll=Math.max(.2,p.ragdoll);}
    if(c.remaining<=0){c.active=false;c.remaining=0;c.next+=30;c.type=CHAOS[Math.floor(random(s)*CHAOS.length)];const a=random(s)*TAU;c.dx=Math.sin(a);c.dz=Math.cos(a);}
  }
}
function powerups(s,dt){
  s.powerTimer-=dt;if(s.powerTimer<=0){s.powerTimer=14;const a=random(s)*TAU,r=1.5+random(s)*3;s.powerups.push({id:s.nextPower++,type:POWERS[Math.floor(random(s)*4)],x:Math.sin(a)*r,z:Math.cos(a)*r*.75,alive:true,remaining:24});}
  for(const q of s.powerups){if(!q.alive)continue;q.remaining-=dt;if(q.remaining<=0){q.alive=false;continue;}for(const p of s.players){if(!p.alive||p.y>.8||length(p.x-q.x,p.z-q.z)>.85)continue;q.alive=false;if(q.type==='doner'){p.stability=1;p.ragdoll=.05;p.stagger=0;}else p.power={type:q.type,remaining:q.type==='slipper'?30:10};emit(s,'powerup',p,{text:q.type});break;}}
  for(const p of s.players)if(p.alive&&p.power?.type==='tea'){p.teaTimer-=dt;if(p.teaTimer<=0&&!p.airborne){p.teaTimer=.35;s.puddles.push({x:p.x,z:p.z,radius:.75,remaining:9});}}
  for(const q of s.puddles)q.remaining-=dt;s.puddles=s.puddles.filter(q=>q.remaining>0);
  s.powerups=s.powerups.filter(q=>q.alive);
}

export function step(s,inputs={},dt=1/60){
  // The host accumulates real time and calls once per fixed frame. Slow motion is
  // a presentation/host time multiplier, never a variable simulation timestep.
  dt=clamp(Number.isFinite(dt)?dt:1/60,0,1/30);s.events=[];s.tick++;s.time+=dt;
  s.slowmoRemaining=Math.max(0,s.slowmoRemaining-dt);s.slowmo=s.slowmoRemaining>0?.35:1;
  if(s.phase==='finished'){
    s.finishTime+=dt;for(const p of s.players)if(p.alive){p.vx*=Math.exp(-dt);p.vz*=Math.exp(-dt);integrate(s,p,dt);ragdoll(p,dt);}return s;
  }
  s.pressure=clamp((s.time-120)/90,0,1.5);
  hazard(s,dt);chaos(s,dt);powerups(s,dt);
  for(const p of s.players){
    if(!p.alive)continue;timers(p,dt);
    const input=p.bot?botInput(s,p):(inputs[p.id]??{});
    if(Number.isFinite(input.angle))p.angle=input.angle;
    if(p.heldBy!==null){p.ragdoll=Math.max(.6,p.ragdoll);ragdoll(p,dt);continue;}
    const wetFloor=wet(s,p),hasFloor=floorHeight(s,p)!==null;
    if(p.stagger<=0&&p.buttActive<=0){
      let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0,l=length(x,z);if(l>1){x/=l;z/=l;}
      const speed=p.holding?2.7:4.8,control=p.airborne?.45:wetFloor?.35:8.5,steer=(1-Math.exp(-control*dt))*(1-p.ragdoll*.7);
      p.vx+=(x*speed-p.vx)*steer;p.vz+=(z*speed-p.vz)*steer;
    }else if(!p.airborne){const friction=Math.exp(-(wetFloor?.04:1.35)*dt);p.vx*=friction;p.vz*=friction;}
    if(p.stagger<=0){
      if(input.shout&&p.shoutCd<=0)shout(s,p);
      if(input.butt&&p.buttCd<=0&&!p.holding){p.buttCd=1.5;p.buttActive=.25;p.buttHit=false;p.buttTargets=[];p.vx+=Math.sin(p.angle)*7.5;p.vz+=Math.cos(p.angle)*7.5;p.vy=Math.max(p.vy,.8);}
      if(input.grab&&!p.grabLatch)grab(s,p);
      if(input.throw&&!p.throwLatch)release(s,p,true);
    }
    p.grabLatch=!!input.grab;p.throwLatch=!!input.throw;
    if(p.buttActive>0){melee(s,p);p.buttActive=Math.max(0,p.buttActive-dt);if(p.buttActive===0&&!p.buttHit)p.stagger=.7;}
    integrate(s,p,dt);ragdoll(p,dt);
  }
  const bodies=[...s.players,...s.props].filter(p=>p.alive&&p.heldBy===null);
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],hit=resolveCollision(a,b);
    if(hit>2.8){
      for(const p of [a,b])if(p.segments){p.ragdoll=Math.max(p.ragdoll,Math.min(.9,hit*.08));p.stability=Math.max(0,p.stability-hit*.015);p.hitTime=.12;}
      if(hit>5)emit(s,'impact',a,{target:b.id,force:hit});
      if(hit>8){if(!a.segments)breakProp(s,a,hit);if(!b.segments)breakProp(s,b,hit);}
    }
  }
  for(const p of s.props)if(p.alive&&p.heldBy===null)integrate(s,p,dt);
  for(const p of s.players)if(p.alive&&p.holding){
    const q=(p.holding.kind==='player'?s.players:s.props).find(v=>v.id===p.holding.id);
    if(!q?.alive){release(s,p);continue;}p.holdTime+=dt;
    const x=p.x+Math.sin(p.angle)*1.03,z=p.z+Math.cos(p.angle)*1.03,y=p.y+.85;
    // A damped, compliant hand constraint preserves the captive's wobble.
    const spring=1-Math.exp(-25*dt);q.x+=(x-q.x)*spring;q.z+=(z-q.z)*spring;q.y+=(y-q.y)*spring;q.vx=p.vx;q.vz=p.vz;q.vy=p.vy;
    if(q.segments&&p.holdTime>2.8){release(s,p);p.stagger=.3;}
  }
  s.props=s.props.filter(p=>p.alive);
  const living=s.players.filter(p=>p.alive);
  // .21 simulation seconds at the host's .35 time scale lasts .6 wall seconds.
  if(living.length<=1){s.phase='finished';s.winner=living[0]?.id??null;s.finishTime=0;s.slowmoRemaining=.21;s.slowmo=.35;if(living[0]){living[0].ragdoll=.8;living[0].vy=2.2;}emit(s,'win',living[0],{text:living[0]?.name??'NOBODY'});}
  return s;
}
