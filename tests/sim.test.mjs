import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, step, resolveCollision, MAPS} from '../src/sim.js';

function quietState(map=0) {
  const s=createState(1907,map);
  s.players.forEach((p,i)=>{p.bot=false;p.x=(i-2)*2.2;p.z=-4;p.vx=p.vy=p.vz=0;p.shoutCd=p.buttCd=0;});
  s.props=[];s.powerups=[];
  return s;
}
function run(s,n,input={}) {for(let i=0;i<n;i++)step(s,input);return s;}
function finite(value,path='state') {
  if(typeof value==='number')assert.ok(Number.isFinite(value),path);
  else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))finite(v,path+'.'+k);
}

test('seeded replay survives serialization with identical outcomes',()=>{
  const a=createState(72,0);assert.equal(a.players?.length,6);
  run(a,150);const b=JSON.parse(JSON.stringify(a));
  for(let i=0;i<1200;i++){const input={0:{x:Math.sin(i/110),z:Math.cos(i/110),angle:i/80,shout:i%79===0,butt:i%180===0}};step(a,input);step(b,input);}
  assert.deepEqual(a,b);assert.ok(a.players.some(p=>p.ragdoll>0));
});
test('equal capsule collision conserves momentum and has restitution .6',()=>{
  const a={x:-.5,z:0,y:0,vx:4,vz:1,vy:0,radius:.55,mass:1};
  const b={x:.5,z:0,y:0,vx:-2,vz:-1,vy:0,radius:.55,mass:1};
  resolveCollision(a,b);
  assert.ok(Math.abs(a.vx+b.vx-2)<1e-10);
  assert.ok(Math.abs(b.vx-a.vx-3.6)<1e-10);
  assert.equal(a.vz+b.vz,0);
  assert.ok(b.x-a.x>=1.099);
});
test('shout hits the forward cone, recoils and cannot bypass cooldown',()=>{
  const s=quietState();const [a,b,c]=s.players;
  Object.assign(a,{x:0,z:0,angle:0});Object.assign(b,{x:0,z:2});Object.assign(c,{x:2,z:0});
  step(s,{0:{shout:true,angle:0}});
  assert.ok(b.vz>2);assert.ok(a.vz<0);assert.ok(Math.abs(c.vx)<.01);
  assert.ok(a.shoutCd>1);assert.equal(s.events.filter(e=>e.type==='shout').length,1);
  step(s,{0:{shout:true,angle:0}});assert.equal(s.events.filter(e=>e.type==='shout').length,0);
  run(s,73);step(s,{0:{shout:true,angle:0}});assert.equal(s.events.filter(e=>e.type==='shout').length,1);
});
test('stability never eliminates; falling below the arena does',()=>{
  const s=quietState();const p=s.players[0];p.stability=0;
  run(s,60);assert.equal(p.alive,true);
  Object.assign(p,{x:10,z:0,vx:0,vz:0});run(s,100);
  assert.equal(p.alive,false);assert.ok(p.y< -5);
});
test('headbutt whiff staggers and a hit transfers momentum',()=>{
  const s=quietState();const p=s.players[0];Object.assign(p,{x:0,z:0,angle:0});
  step(s,{0:{butt:true,angle:0}});run(s,16);assert.ok(p.stagger>.5);
  const t=quietState();Object.assign(t.players[0],{x:0,z:0});Object.assign(t.players[1],{x:0,z:1.3});
  step(t,{0:{butt:true,angle:0}});assert.ok(t.players[1].vz>6);assert.ok(t.events.some(e=>e.type==='headbutt'));
});
test('grab follows the hands and charged throw releases the target',()=>{
  const s=quietState();Object.assign(s.players[0],{x:0,z:0,angle:0});Object.assign(s.players[1],{x:0,z:1});
  step(s,{0:{grab:true,angle:0}});assert.equal(s.players[0].holding?.kind,'player');
  run(s,60,{0:{angle:0}});assert.ok(s.players[1].y>.2);
  step(s,{0:{throw:true,angle:0}});assert.equal(s.players[0].holding,null);assert.equal(s.players[1].heldBy,null);assert.ok(s.players[1].vz>8);
});
test('six arenas remain finite and bots cause real ringouts',()=>{
  assert.equal(MAPS.length,6);let eliminations=0;
  for(let map=0;map<6;map++){
    const s=createState(101+map,map);s.players.forEach(p=>p.bot=true);
    for(let i=0;i<14400&&s.phase==='playing';i++){step(s);if(i%120===0)finite(s);eliminations+=s.events.filter(e=>e.type==='eliminate').length;}
    finite(s);assert.ok(s.players.filter(p=>p.alive).length<=2,`map ${map} still has a crowd at 240s`);
  }
  assert.ok(eliminations>=24);
});
test('bot matches have room to brawl before the late-match pressure resolves them',()=>{
  const durations=[];
  for(let seed=1;seed<=7;seed++){
    const s=createState(seed,0);s.players.forEach(p=>p.bot=true);
    for(let i=0;i<14400&&s.phase==='playing';i++)step(s);
    assert.equal(s.phase,'finished');durations.push(s.time);
  }
  durations.sort((a,b)=>a-b);
  assert.ok(durations[3]>=90,`median ${durations[3].toFixed(1)}s is too short`);
  assert.ok(durations[3]<=240);
});
test('wet ground retains momentum and six ragdoll segments recover after settling',()=>{
  const dry=quietState(),slick=quietState();
  for(const s of [dry,slick])Object.assign(s.players[0],{x:0,z:0,vx:5,ragdoll:1});
  slick.puddles=[{x:0,z:0,radius:8,remaining:10}];
  run(dry,30);run(slick,30);assert.ok(slick.players[0].vx>dry.players[0].vx*2);
  run(dry,150);assert.ok(dry.players[0].ragdoll<.1);assert.equal(dry.players[0].segments.length,6);finite(dry.players[0].segments);
});
test('all four pickups apply their advertised state changes',()=>{
  for(const type of ['megaphone','slipper','tea','doner']){
    const s=quietState(),p=s.players[0];p.stability=.1;
    s.powerups=[{id:0,type,x:p.x,z:p.z,alive:true,remaining:20}];step(s);
    assert.ok(s.events.some(e=>e.type==='powerup'&&e.text===type));
    if(type==='doner')assert.equal(p.stability,1);else assert.equal(p.power?.type,type);
    if(type==='tea'){run(s,30);assert.ok(s.puddles.length>0);}
  }
});
test('chaos warns for three seconds and fires on the thirty-second boundary',()=>{
  const s=quietState();run(s,1621);assert.equal(s.phase,'playing');assert.ok(s.chaos.warning>2.9);assert.equal(s.chaos.active,false);
  run(s,181);assert.equal(s.chaos.active,true);assert.equal(s.chaos.type,'earthquake');
});
test('a falling box physically knocks the body below it',()=>{
  const s=quietState(),p=s.players[0];Object.assign(p,{x:0,z:0});
  s.props=[{id:10,type:'box',x:0,y:4,z:0,vx:0,vy:-7,vz:0,angle:0,alive:true,heldBy:null,broken:false,radius:.4,mass:.4,angularVelocity:0}];
  run(s,18);assert.ok(p.ragdoll>.3);assert.ok(Math.hypot(p.vx,p.vz)>.5);
});
test('the full visible metro carriage clears bodies from its lane',()=>{
  const s=quietState(4),p=s.players[0];s.time=18;
  Object.assign(p,{x:5.9,z:-5.65});step(s);
  assert.ok(p.vx>12);assert.ok(s.hazard.active);
});
test('cafe desk bounces bodies and a final ringout identifies the survivor',()=>{
  const s=quietState(3),p=s.players[0];Object.assign(p,{x:0,z:-2.5,vz:-8,stagger:1});step(s);assert.ok(p.vz>0);
  s.players.slice(1).forEach(q=>{q.x=15;q.y=-7.99;q.vy=-8;});step(s);
  assert.equal(s.phase,'finished');assert.equal(s.winner,0);assert.equal(s.slowmo,.35);assert.ok(s.events.some(e=>e.type==='win'));
});
test('visible rooftop parapets and minibus back wall bounce bodies below their tops',()=>{
  for(const map of [0,1]){
    const s=quietState(map),p=s.players[0];Object.assign(p,{x:0,y:map===1?1.5:0,z:-5.3,vz:-8,stagger:1});
    run(s,3);assert.ok(p.vz>0,`map ${map} wall must bounce`);assert.ok(p.z> -5.5);
  }
});
test('airborne throws clear low parapets while loose props bounce off them',()=>{
  const s=quietState(),p=s.players[0];Object.assign(p,{x:0,y:1.5,z:-5.3,vz:-8,vy:2,stagger:1});
  run(s,8);assert.ok(p.z< -6.1);assert.ok(p.vz<0);
  const t=quietState();t.props=[{id:10,type:'box',x:0,y:0,z:-5.3,vx:0,vy:0,vz:-8,angle:0,alive:true,heldBy:null,broken:false,radius:.4,mass:.4,angularVelocity:0}];
  run(t,4);assert.ok(t.props[0].vz>0);
});
test('waiting bots spread around opponents instead of remaining in a central huddle',()=>{
  let crowded=0,samples=0;
  for(const seed of [1,4,7]){
    const s=createState(seed,0);s.players.forEach(p=>p.bot=true);
    for(let i=0;i<3600&&s.phase==='playing';i++){
      step(s);if(i<600||i%60!==0)continue;
      const living=s.players.filter(p=>p.alive);if(living.length<3)continue;
      for(const p of living){
        if(s.time>=p.brain.attackAt||p.stagger>0||p.holding)continue;
        samples++;
        if(living.some(q=>q!==p&&Math.hypot(p.x-q.x,p.z-q.z)<1.4))crowded++;
      }
    }
  }
  assert.ok(samples>100,'enough waiting frames must be observed');
  assert.ok(crowded/samples<.35,`${Math.round(crowded/samples*100)}% of waiting samples remain crowded`);
});
