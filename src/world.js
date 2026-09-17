import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// All scenery is generated here. Static dressing is merged by material after
// assembly; the few moving parts retain small local batches of their own.
export function buildWorld(THREE, scene, map, helpers) {
  const ids = ['rooftop', 'minibus', 'wedding', 'cafe', 'metro', 'park'];
  const id = typeof map === 'number' ? ids[map] : (map?.id || map || 'rooftop');
  const group = new THREE.Group(); group.name = `world-${id}`; scene.add(group);
  const still = new THREE.Group(); group.add(still);
  const ownedMaterials = new Set(), ownedTextures = new Set(), sources = new Set();
  const animations = [];
  let seed = 7319;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mat = (type, color) => helpers.material(type, color);
  const concrete = mat('concrete', '#a99f8a'), dark = mat('metal', '#393e3c');
  const rust = mat('metal', '#84624c'), clay = mat('brick', '#956750');
  const ivory = mat('paint', '#cdc7ae'), blue = mat('metal', '#668386');
  const leaf = mat('paint', '#626f43'), wood = mat('wood', '#79634b');
  function ownMaterial(options) { const m = new THREE.MeshStandardMaterial(options); ownedMaterials.add(m); return m; }
  function texture(draw, size = 512) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); draw(ctx, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; ownedTextures.add(t); return t;
  }
  function noise(ctx, n, amount = 9000, alpha = .10) {
    for (let i = 0; i < amount; i++) { const v = rand() > .5 ? 255 : 30;
      ctx.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
      ctx.fillRect(rand() * n, rand() * n, rand() * 3 + .5, rand() * 3 + .5);
    }
  }
  function add(mesh, x = 0, y = 0, z = 0, parent = still) {
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function box(w,h,d,x,y,z,m=concrete,r=.06,parent=still) { return add(helpers.roundedBox(w,h,d,Math.min(r,w*.45,h*.45,d*.45),m),x,y,z,parent); }
  const cylinderGeo = new THREE.CylinderGeometry(1,1,1,24,1);
  const sphereGeo = new THREE.SphereGeometry(1,16,10);
  const coneGeo = new THREE.ConeGeometry(1,1,20);
  const chipGeo=new THREE.DodecahedronGeometry(1,0);
  sources.add(cylinderGeo); sources.add(sphereGeo); sources.add(coneGeo);sources.add(chipGeo);
  function cyl(r,h,x,y,z,m=dark,parent=still,rb=r) {
    const geo = rb === r ? cylinderGeo : new THREE.CylinderGeometry(r,rb,h,24);
    sources.add(geo);
    const mesh = add(new THREE.Mesh(geo,m),x,y,z,parent);
    if(rb === r) mesh.scale.set(r,h,r); return mesh;
  }
  function ball(rx,ry,rz,x,y,z,m=leaf,parent=still) {const a=add(new THREE.Mesh(sphereGeo,m),x,y,z,parent);a.scale.set(rx,ry,rz);return a;}
  function tube(a,b,r,m=dark,parent=still) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta=bv.clone().sub(av);
    const mesh=cyl(r,delta.length(),...av.clone().add(bv).multiplyScalar(.5).toArray(),m,parent);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return mesh;
  }
  function torus(r,t,x,y,z,m=dark,parent=still) {const geo=new THREE.TorusGeometry(r,t,6,32);sources.add(geo);return add(new THREE.Mesh(geo,m),x,y,z,parent);}
  function sign(text,w,h,x,y,z,opts={},parent=still) {
    const a=helpers.label(text,w,h,opts); sources.add(a.geometry); ownedMaterials.add(a.material);
    if(a.material.map)ownedTextures.add(a.material.map);add(a,x,y,z,parent); return a;
  }
  function flat(w,d,x,y,z,m,parent=still) {
    const geo=new THREE.PlaneGeometry(w,d);sources.add(geo);
    const a=add(new THREE.Mesh(geo,m),x,y,z,parent);
    a.rotation.x=-Math.PI/2; a.castShadow=false; return a;
  }
  function animate(parent, fn) { animations.push({parent,fn}); return parent; }
  function dynamic(x=0,y=0,z=0) {const g=new THREE.Group();g.position.set(x,y,z);group.add(g);return g;}
  function merge(root) {
    root.updateMatrixWorld(true);
    const inverse=root.matrixWorld.clone().invert(), buckets=new Map();
    root.traverse(o=>{if(!o.isMesh)return; const key=o.material.uuid;
      if(!buckets.has(key))buckets.set(key,{m:o.material,geos:[],cast:o.castShadow});
      const geometry=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      // Round boxes and primitives use the same position/normal/UV attributes.
      if(geometry.index) {const expanded=geometry.toNonIndexed(); geometry.dispose();buckets.get(key).geos.push(expanded);}
      else buckets.get(key).geos.push(geometry);
    });
    root.clear();
    for(const {m,geos,cast} of buckets.values()) {
      const merged=mergeGeometries(geos,false); for(const g of geos)g.dispose();
      if(!merged)continue;
      const mesh=new THREE.Mesh(merged,m);mesh.castShadow=cast;mesh.receiveShadow=true;root.add(mesh);
    }
  }
  function floorMaterial(kind) {
    const wetSpots=[{u:.135,v:.79,rx:.065,ry:.095},{u:.89,v:.74,rx:.074,ry:.037},{u:.89,v:.27,rx:.034,ry:.115},{u:.24,v:.17,rx:.065,ry:.040}];
    function wetPath(c,n,p){c.beginPath();for(let i=0;i<32;i++){const a=i/32*Math.PI*2,edge=.84+Math.sin(i*1.71+p.u*28)*.11+Math.cos(i*.83)*.07,x=(p.u+Math.cos(a)*p.rx*edge)*n,y=(p.v+Math.sin(a)*p.ry*edge)*n;(i?c.lineTo:c.moveTo).call(c,x,y);}c.closePath();}
    const t=texture((c,n)=>{
      const colors={roof:'#9e9786',tile:'#9c9683',bus:'#727c77',cafe:'#747d74',metro:'#b2b0a0',park:'#aa9a7b'};
      c.fillStyle=colors[kind]||colors.roof;c.fillRect(0,0,n,n);
      if(kind==='roof'){
        const data=c.createImageData(n,n), grids=[8,22,61,193].map(size=>({size,v:Float32Array.from({length:(size+1)*(size+1)},()=>rand())}));
        for(let yy=0;yy<n;yy++)for(let xx=0;xx<n;xx++){
          let f=0;for(let k=0;k<grids.length;k++){const g=grids[k],gx=xx/n*g.size,gy=yy/n*g.size,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,ii=iy*(g.size+1)+ix;
            const v=(g.v[ii]*(1-fx)+g.v[ii+1]*fx)*(1-fy)+(g.v[ii+g.size+1]*(1-fx)+g.v[ii+g.size+2]*fx)*fy;f+=(v-.5)*[79,45,23,14][k];}
          const i=(yy*n+xx)*4;data.data[i]=139+f;data.data[i+1]=136+f;data.data[i+2]=125+f;data.data[i+3]=255;
        }c.putImageData(data,0,0);
      }
      const count=kind==='roof'?13:kind==='metro'?12:kind==='cafe'?10:8, s=n/count;
      for(let y=0;y<count;y++)for(let x=0;x<count;x++){
        c.fillStyle=`rgba(${rand()>.5?'239,226,195':'44,48,39'},${.02+rand()*.09})`;
        c.fillRect(x*s+1,y*s+1,s-2,s-2);
        c.strokeStyle=kind==='roof'?'rgba(36,42,35,.20)':'rgba(36,42,35,.32)';c.lineWidth=kind==='roof'?.9:2.3;c.strokeRect(x*s,y*s,s,s);
        c.strokeStyle=kind==='roof'?'rgba(240,232,207,.09)':'rgba(240,232,207,.20)';c.lineWidth=1;c.strokeRect(x*s+2,y*s+2,s-4,s-4);
      }
      for(let i=0;i<35;i++) {let x=rand()*n,y=rand()*n;c.strokeStyle=`rgba(49,48,36,${.08+rand()*.18})`;c.lineWidth=.4+rand()*1.5;
        c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=(rand()-.5)*30;y+=rand()*16;c.lineTo(x,y);}c.stroke();}
      for(let i=0;i<90;i++){const x=rand()*n,y=rand()*n,r=3+rand()*18;const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(39,38,28,.17)');grad.addColorStop(1,'rgba(39,38,28,0)');c.fillStyle=grad;c.fillRect(x-r,y-r,r*2,r*2);}
      if(kind==='roof'){
        for(let i=0;i<45;i++){
          const x=rand()*n,y=rand()*n,r=5+rand()*40;c.fillStyle=i%3===0?'rgba(55,53,41,.20)':'rgba(204,194,169,.19)';c.beginPath();
          for(let j=0;j<14;j++){const a=j/14*Math.PI*2,rr=r*(.3+rand()*.7);const xx=x+Math.sin(a)*rr,yy=y+Math.cos(a)*rr;(j?c.lineTo:c.moveTo).call(c,xx,yy);}c.closePath();c.fill();
        }
        for(let i=0;i<20;i++){
          let x=rand()*n,y=rand()*n;c.strokeStyle='rgba(34,34,29,.58)';c.lineWidth=.8+rand()*.8;c.beginPath();c.moveTo(x,y);
          for(let j=0;j<12;j++){x+=(rand()-.42)*15;y+=rand()*12;c.lineTo(x,y);if(j===6){c.moveTo(x,y);c.lineTo(x+22,y-4);c.lineTo(x+31,y+7);c.moveTo(x,y);}}c.stroke();
        }
        for(let i=0;i<550;i++){const side=i%4;let x=rand()*n,y=rand()*n;if(side===0)x=rand()*90;if(side===1)x=n-rand()*90;if(side===2)y=rand()*80;if(side===3)y=n-rand()*80;c.fillStyle=rand()>.5?'rgba(39,42,31,.26)':'rgba(220,211,184,.23)';c.fillRect(x,y,1+rand()*10,1+rand()*5);}
      }
      const grd=c.createRadialGradient(n/2,n/2,n*.23,n/2,n/2,n*.70);grd.addColorStop(0,'rgba(20,25,20,0)');grd.addColorStop(1,'rgba(20,25,20,.36)');c.fillStyle=grd;c.fillRect(0,0,n,n);
      noise(c,n,16000,.13);
      if(kind==='roof'){
        // Isolated texture RNG leaves the existing city arrangement unchanged.
        const floorSeed=seed;
        for(const [u,v,r] of [[.11,.85,.14],[.17,.13,.12],[.88,.85,.11],[.88,.14,.12]]){
          const x=u*n,y=v*n,grime=c.createRadialGradient(x,y,n*.012,x,y,n*r);grime.addColorStop(0,'rgba(32,37,29,.51)');grime.addColorStop(.46,'rgba(48,46,32,.28)');grime.addColorStop(1,'rgba(49,45,29,0)');c.fillStyle=grime;c.fillRect(x-n*r,y-n*r,n*r*2,n*r*2);
        }
        for(let i=0;i<180;i++){
          const x=rand()*n,y=rand()*n;c.save();c.translate(x,y);c.rotate(rand()*6.28);c.strokeStyle=`rgba(40,42,34,${.09+rand()*.19})`;c.lineWidth=.5+rand()*2.5;c.beginPath();c.ellipse(0,0,2+rand()*7,8+rand()*18,0,.2,1.8+rand()*2.7);c.stroke();
          if(i%3===0){c.strokeStyle='rgba(222,215,192,.20)';c.lineWidth=.6;c.beginPath();c.moveTo(-3,-15);c.lineTo(4,17);c.moveTo(0,-13);c.lineTo(7,14);c.stroke();}c.restore();
        }
        for(let i=0;i<1600;i++){const x=rand()*n,y=rand()*n;c.fillStyle=rand()>.7?'rgba(231,221,195,.23)':'rgba(34,36,29,.21)';c.beginPath();c.ellipse(x,y,.4+rand()*1.3,.3+rand()*.8,rand()*3,0,Math.PI*2);c.fill();}
        c.fillStyle='rgba(36,48,43,.22)';for(const p of wetSpots){wetPath(c,n,p);c.fill();}
        seed=floorSeed;
      }
    },1024);
    let roughnessMap;
    if(kind==='roof'){
      roughnessMap=texture((c,n)=>{c.fillStyle='#ffffff';c.fillRect(0,0,n,n);for(const p of wetSpots){wetPath(c,n,p);c.fillStyle='#282828';c.fill();}},1024);
      roughnessMap.colorSpace=THREE.NoColorSpace;
    }
    return ownMaterial({map:t,bumpMap:t,bumpScale:kind==='roof'?.06:.025,roughness:kind==='roof'?.83:.91,...(roughnessMap?{roughnessMap}:{}),metalness:0});
  }
  function platform(kind='roof',color='#9c9180') {
    box(17,.52,13,0,-.30,0,mat('concrete',color),.14);
    flat(16.96,12.96,0,-.025,0,floorMaterial(kind));
    box(17.25,.17,13.25,0,-.55,0,mat('concrete','#786f60'),.06);
  }
  function planter(x,z,size=.6,parent=still) {
    cyl(size*.7,size,x,size*.48,z,clay,parent,size*.5);
    const rim=torus(size*.67,size*.075,x,size*.96,z,clay,parent);rim.rotation.x=Math.PI/2;
    cyl(size*.57,.07,x,size*.96,z,mat('concrete','#4f4938'),parent);
    for(let j=0;j<6;j++) {const a=j*2.4;const yy=size*(1.2+rand()*.65);tube([x,size*.9,z],[x+Math.sin(a)*size*.5,yy,z+Math.cos(a)*size*.5],.018,leaf,parent);
      const b=ball(size*.20,size*.45,size*.15,x+Math.sin(a)*size*.4,yy,z+Math.cos(a)*size*.4,leaf,parent);b.rotation.z=Math.sin(a)*.6;}
  }
  let airconMaterial;
  function aircon(x,z,scale=1,parent=still) {
    if(!airconMaterial){const tex=texture((c,n)=>{
      c.fillStyle='#68878b';c.fillRect(0,0,n,n);
      for(let i=0;i<120;i++){const edge=i%4;let x=rand()*n,y=rand()*n;if(i<100){if(edge===0)x=rand()*45;else if(edge===1)x=n-rand()*45;else if(edge===2)y=n-rand()*55;else y=rand()*25;}const r=2+rand()*15;c.fillStyle=i%2?'#80674c':'#9c8060';c.beginPath();for(let j=0;j<11;j++){const a=j/11*Math.PI*2,rr=r*(.2+rand()*.8);(j?c.lineTo:c.moveTo).call(c,x+Math.sin(a)*rr,y+Math.cos(a)*rr);}c.closePath();c.fill();c.fillStyle='rgba(76,48,28,.17)';c.fillRect(x,y,rand()*5+1,20+rand()*65);}
      c.strokeStyle='#393e35';c.lineWidth=9;c.strokeRect(3,3,n-6,n-6);c.strokeStyle='#baaa81';c.lineWidth=3;c.strokeRect(8,8,n-16,n-16);noise(c,n,15000,.20);
    });airconMaterial=ownMaterial({map:tex,bumpMap:tex,bumpScale:.022,roughness:.87});}
    const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(scale);parent.add(p);
    box(1.7,1.18,.83,0,.67,0,airconMaterial,.10,p);
    box(1.78,.08,.93,0,1.28,0,airconMaterial,.03,p);
    box(1.46,.94,.04,0,.70,.44,dark,.02,p);
    cyl(.075,.25,-.56,.12,0,dark,p);cyl(.075,.25,.56,.12,0,dark,p);
    const circle=cyl(.42,.04,-.25,.70,.47,dark,p);circle.rotation.x=Math.PI/2;
    for(let i=0;i<4;i++) {const b=box(.17,.65,.04,-.25,.70,.50,mat('metal','#676f67'),.045,p);b.rotation.z=i*Math.PI/2+.45;}
    for(let i=0;i<5;i++)torus(.12+i*.075,.012,-.25,.70,.535,mat('metal','#a5a99a'),p);
    tube([-.71,.7,.55],[.21,.7,.55],.012,ivory,p);tube([-.25,.23,.55],[-.25,1.16,.55],.012,ivory,p);
    for(let i=0;i<10;i++)box(.33,.025,.03,.55,.32+i*.078,.51,ivory,.006,p);
    sign('VESTEL',.37,.10,.41,1.15,.531,{fg:'#ddd8bc'},p);
    tube([.8,.25,-.2],[1.12,.25,-.2],.05,rust,p);tube([1.12,.25,-.2],[1.12,.06,-.2],.05,rust,p);
  }
  function masonry(x,z,w,d,h=.7) {
    const nx=Math.max(1,Math.floor(w/.60)),nz=Math.max(1,Math.floor(d/.62));
    // Separate lumpy stones interrupt the top silhouette; the lower body keeps
    // the coarse collision footprint intact while chips expose the mortar.
    box(w,h*.64,d,x,h*.32,z,mat('concrete','#938c7b'),.065);
    for(let i=0;i<nx;i++)for(let k=0;k<nz;k++){
      const hh=h*(.83+rand()*.17),stone=box(w/nx-.025,hh,d/nz-.025,x-w/2+(i+.5)*w/nx,hh*.5,z-d/2+(k+.5)*d/nz,rand()>.82?clay:concrete,.045);
      stone.rotation.z=(rand()-.5)*.045;stone.rotation.y=(rand()-.5)*.04;
    }
    for(let j=0;j<2;j++)for(let i=0;i<nx;i++)for(let k=0;k<nz;k++) {
      const xx=x-w/2+(i+.5)*w/nx+(j%2?.07:0), zz=z-d/2+(k+.5)*d/nz;
      if(rand()>.82)box(w/nx-.04,.24,d/nz-.03,xx,.17+j*.28,zz,clay,.035);
    }
    for(let i=0;i<nx;i++)for(let k=0;k<nz;k++){
      if(rand()>.76)continue;
      const cap=box(w/nx-.04-rand()*.12,.12+rand()*.05,d/nz+.07,x-w/2+(i+.5)*w/nx,h-.015+rand()*.08,z-d/2+(k+.5)*d/nz,mat('concrete',rand()>.5?'#aaa28d':'#938d7e'),.045);
      cap.rotation.set((rand()-.5)*.12,(rand()-.5)*.08,(rand()-.5)*.13);
      if(i%2===0){const chip=add(new THREE.Mesh(chipGeo,concrete),cap.position.x+(rand()-.5)*.24,h+.02,cap.position.z+(rand()-.5)*.28);chip.scale.set(.10+rand()*.07,.055,.09);chip.rotation.set(rand(),rand()*3,rand()*.5);}
    }
  }
  function facadeMaterial(color) {
    const t=texture((c,n)=>{c.fillStyle=color;c.fillRect(0,0,n,n);
      const offset=rand()*15;
      for(let y=0;y<8;y++)for(let x=0;x<5;x++){
        const xx=13+x*99+offset,yy=16+y*63;
        c.fillStyle='rgba(50,44,36,.18)';c.fillRect(xx-3,yy-3,57,50);
        c.fillStyle='#a9a18e';c.fillRect(xx,yy,48,40);
        c.fillStyle=rand()>.90?'#beae87':rand()>.7?'#7a817e':'#535f62';c.fillRect(xx+4,yy+3,40,33);
        c.fillStyle='rgba(151,174,178,.2)';c.fillRect(xx+5,yy+4,17,30);
        c.fillStyle='#aba690';c.fillRect(xx+23,yy+3,3,33);c.fillRect(xx,yy+39,50,4);
        if(rand()>.65){c.fillStyle='#9a947e';c.fillRect(xx-5,yy+26,61,19);c.fillStyle='#5c6059';for(let k=0;k<7;k++)c.fillRect(xx+k*8,yy+28,2,16);}
        if(rand()>.80){c.fillStyle='#728080';c.fillRect(xx+48,yy+17,22,18);c.fillStyle='#444d4a';for(let j=0;j<4;j++)c.fillRect(xx+51,yy+20+j*3,16,1);}
        c.fillStyle='rgba(41,35,25,.18)';c.fillRect(xx-3,yy+44,57,4+rand()*25);
      }
      for(let i=0;i<80;i++){c.fillStyle=rand()>.5?'rgba(60,58,45,.16)':'rgba(222,210,183,.17)';c.fillRect(rand()*n,rand()*n,8+rand()*55,3+rand()*18);}
      noise(c,n,9500,.17);
    });return ownMaterial({map:t,roughness:.95,color:'#ffffff'});
  }
  function city() {
    const firstCityChild=still.children.length;
    const waterTexture=texture((c,n)=>{
      c.fillStyle='#547e82';c.fillRect(0,0,n,n);
      for(let i=0;i<2400;i++){c.fillStyle=rand()>.65?'rgba(214,201,167,.15)':'rgba(51,79,83,.12)';c.fillRect(rand()*n,rand()*n,1+rand()*23,.4+rand()*1.1);}
    });const sea=ownMaterial({map:waterTexture,roughness:.52,metalness:0});
    // Finite water/shore strips end below the projected horizon. The sky stays
    // visible above them with the fixed chase camera instead of showing a map.
    flat(205,20,0,-37,-47,sea);
    flat(85,45,0,-21,-.5,mat('concrete','#858774'));
    const landTexture=texture((c,n)=>{
      c.fillStyle='#777d68';c.fillRect(0,0,n,n);
      for(let i=0;i<180;i++){c.fillStyle=rand()>.5?'rgba(162,150,121,.25)':'rgba(45,65,50,.20)';c.fillRect(rand()*n,rand()*n,8+rand()*45,5+rand()*30);}
      c.strokeStyle='#646a5c';c.lineWidth=5;
      for(let j=0;j<12;j++){c.beginPath();c.moveTo(0,j*46);c.bezierCurveTo(n*.3,j*46-17,n*.6,j*46+12,n,j*46+8);c.stroke();}
      noise(c,n,7500,.13);
    });const land=ownMaterial({map:landTexture,roughness:.96});
    const farGround=(x,z)=>{
      const inland=Math.max(0,-z-56);
      const slope=inland<8 ? -36.5+inland*.31 : -34.02-(inland-8)*.44;
      return slope+Math.sin(x*.085)*.45+7.1*Math.exp(-((x+29)*(x+29)/85+(z+80)*(z+80)/48));
    };
    function terrain(zFront,zBack,height){
      const cols=64,rows=20,positions=[],uvs=[],indices=[];
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const x=-104+i/cols*208,t=j/rows,z=zFront+(zBack-zFront)*t+Math.sin(x*.065)*1.1*(1-t);
        positions.push(x,height(x,z),z);uvs.push(i/cols,j/rows);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;indices.push(a,b,d,b,e,d);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();sources.add(geo);add(new THREE.Mesh(geo,land));
    }
    terrain(-55,-99,farGround);
    terrain(-22,-38,(x,z)=>-21-Math.max(0,-z-22)*.96+Math.sin(x*.08)*.15);
    // Pale masonry quay lines make the narrow strait and both banks legible.
    for(let i=0;i<24;i++){
      const x=-100+i*8.5,z=-55+Math.sin(x*.065)*1.1;
      box(8.6,.34,.58,x,-36.62,z,mat('concrete','#a5a18c'),.07);
      box(8.6,.34,.58,x,-36.58,-38+Math.sin(x*.065)*.35,mat('concrete','#999680'),.07);
    }
    const colors=['#a69a88','#a2a597','#b2a38d','#8d9b98','#a49285','#b8ad98','#9c9691','#b2a896'];
    const mats=colors.map(facadeMaterial), roofmats=['#805f4e','#786452','#927a62','#8b8070','#687572'].map(c=>mat('roof',c));
    function building(x,z,w,d,h,top,far=false){
      const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=(rand()-.5)*.26;still.add(p);
      const m=mats[Math.floor(rand()*mats.length)], roof=roofmats[Math.floor(rand()*roofmats.length)];
      box(w,h,d,0,top-h*.5,0,m,.12,p);
      box(w+.17,.19,d+.17,0,top+.04,0,roof,.06,p);
      if(rand()>.52){const g=new THREE.CylinderGeometry(0,1,1,4,1);sources.add(g);const m=add(new THREE.Mesh(g,roof),0,top+.52,0,p);m.rotation.y=Math.PI/4;m.scale.set(w*.76,1,d*.76);}
      else if(rand()>.5)box(w*.67,.55,d*.64,.15,top+.26,.12,m,.08,p);
      if(!far&&rand()>.4){box(.5,.65,.52,w*.2,top+.4,d*.2,concrete,.04,p);cyl(.045,.85,-w*.23,top+.52,-d*.25,dark,p);}
    }
    // Irregular foreground roofs sit well below the fighting surface.
    for(let i=0;i<21;i++){
      const x=(i-10)*6.4+(rand()-.5)*3.8,z=-18+(rand()-.5)*9;
      if(Math.abs(x)<12)continue;
      const top=-11-rand()*4.7;building(x,z,2.7+rand()*2.3,3.0+rand()*3.4,21+top,top);
    }
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const top=-11.2-rand()*4;building(side*(16.4+rand()*4.2),8-i*7,3.3+rand()*2.0,3.5+rand()*2.0,21+top,top);
    }
    // Far hillside silhouettes are broad and subdued, with finer roofs above.
    const hill=mat('paint','#8b9690');
    for(let i=0;i<8;i++)ball(17,6+rand()*3,10,(i-3.5)*24,-43,-86-rand()*4,hill);
    const littleBuildingGeo=helpers.roundedBox(1,1,1,.035,concrete).geometry;
    for(let row=0;row<4;row++)for(let col=0;col<55;col++){
      if(rand()>.93)continue;
      const x=(col-27)*3.25+(rand()-.5)*1.1,z=-64-row*7.5+(rand()-.5)*2.2;
      const w=1.6+rand()*1.4,d=1.8+rand()*1.5,h=3+rand()*4.2,top=farGround(x,z)+h-.22;
      const body=add(new THREE.Mesh(littleBuildingGeo,mats[Math.floor(rand()*mats.length)]),x,top-h/2,z);body.scale.set(w,h,d);body.rotation.y=(rand()-.5)*.18;
      if(rand()>.38){const roofGeo=new THREE.CylinderGeometry(0,1,1,4,1);sources.add(roofGeo);const roof=add(new THREE.Mesh(roofGeo,roofmats[Math.floor(rand()*roofmats.length)]),x,top+.21,z);roof.scale.set(w*.74,.42,d*.74);roof.rotation.y=Math.PI/4+body.rotation.y;}
    }
    // Mosque silhouette: shallow domes, galleries and paired slender minarets.
    const mosqueStart=still.children.length;
    const stone=mat('concrete','#979c93'), dome=mat('metal','#727e79');
    box(8,4,7,-24,-27,-65,stone,.2);
    ball(3.6,2.5,3.6,-24,-24.9,-65,dome);
    for(const dx of [-2.9,2.9])ball(1.65,1.3,1.7,-24+dx,-25.7,-62.7,dome);
    cyl(.1,1.2,-24,-22.3,-65,rust);ball(.24,.24,.24,-24,-21.68,-65,rust);
    for(const x of [-29,-19]){cyl(.34,11,x,-24.3,-65,stone);cyl(.60,.22,x,-21.1,-65,stone);cyl(.25,2.6,x,-19.7,-65,stone);
      const p=add(new THREE.Mesh(coneGeo,dome),x,-17.8,-65);p.scale.set(.42,1.35,.42);}
    const mosque=new THREE.Group();
    for(const child of still.children.slice(mosqueStart)){child.position.sub(new THREE.Vector3(-24,-27,-65));mosque.add(child);}
    mosque.position.set(-29,-31,-80);mosque.scale.setScalar(.60);still.add(mosque);
    // Suspension bridge spans the Bosphorus behind the dense foreground city.
    const bridgeStart=still.children.length;
    box(45,.38,1.4,17,-27.3,-64,mat('concrete','#8e9b98'),.10);
    for(const x of [3,30]){box(.56,14,.60,x,-23.8,-64,dark,.07);box(3.5,.3,.60,x,-19,-64,dark,.06);}
    for(let i=0;i<28;i++){const x=3+i;const yy=-26+7*Math.pow((x-16.5)/13.5,2);tube([x,-27.1,-63.4],[x,yy,-63.4],.035,dark);if(i<27){const y2=-26+7*Math.pow((x+1-16.5)/13.5,2);tube([x,yy,-63.4],[x+1,y2,-63.4],.065,dark);}}
    const bridge=new THREE.Group();for(const child of still.children.slice(bridgeStart)){child.position.sub(new THREE.Vector3(17,-27.3,-64));bridge.add(child);}
    bridge.position.set(23,-32,-80);bridge.scale.setScalar(.60);still.add(bridge);
    // Tiny ferries give the water its scale, their wakes remain matte and soft.
    for(const [x,z] of [[-7,-46],[23,-51]]){
      box(1.9,.17,.58,x,-36.8,z,ivory,.15);box(.9,.34,.42,x,-36.57,z,ivory,.07);box(.7,.14,.43,x,-36.40,z,dark,.03);
      flat(3.6,.16,x-1.6,-36.96,z,ownMaterial({color:'#b4bab0',transparent:true,opacity:.35,roughness:.9}));
    }
    const cityGroup=dynamic();cityGroup.name='istanbul-skyline';
    for(const child of still.children.slice(firstCityChild))cityGroup.add(child);
  }

  function rooftop() {
    platform('roof');city();
    // Full building underneath anchors the arena as a roof, rather than a raft.
    box(16.8,7.5,12.8,0,-4.3,0,facadeMaterial('#b9ae98'),.12);
    box(17.1,.22,13.1,0,-.8,0,concrete,.06);
    masonry(-6.7,-6.17,3.4,.50,.70);masonry(.25,-6.17,4.5,.50,.74);masonry(6.6,-6.17,3.5,.50,.76);
    masonry(-8.18,-3.6,.48,3.3,.55);masonry(8.18,-3.1,.48,3.7,.55);
    masonry(-8.18,3.6,.48,2.7,.38);masonry(8.18,4.0,.48,2.7,.35);
    masonry(-6.9,6.18,2.8,.5,.32);masonry(6.7,6.18,3.1,.5,.38);
    // The parapet deliberately has broad, obvious fall gaps.
    aircon(-6.65,4.55,1.25);aircon(-5.5,-4.75,1.12);aircon(6.55,4.55,.95);
    const tank=mat('metal','#626961');
    cyl(1.0,2.55,6.4,1.62,-4.72,tank);
    ball(1.02,.20,1.02,6.4,2.90,-4.72,tank);cyl(.18,.15,6.4,3.13,-4.72,dark);
    for(const yy of [.48,1.04,2.20,2.83]){const ring=torus(1.02,.045,6.4,yy,-4.72,mat('metal','#858a7a'));ring.rotation.x=Math.PI/2;}
    box(2.05,.40,2.1,6.4,.15,-4.72,concrete,.10);
    sign('SU VAR',1.00,.27,6.4,2.13,-3.69,{fg:'#a5a99a'});
    sign('HAYAT VAR',1.15,.25,6.4,1.74,-3.69,{fg:'#a5a99a'});
    tube([5.40,.65,-4.72],[4.94,.65,-4.72],.075,rust);tube([4.94,.65,-4.72],[4.94,.06,-4.72],.075,rust);
    // Dish with convex matte bowl, feed arm and cable.
    const dish=new THREE.Group();dish.position.set(-7.1,1.90,-4.48);dish.rotation.set(-.20,-.3,0);still.add(dish);
    ball(.87,.99,.12,0,0,0,mat('metal','#c7c4b4'),dish);
    const rim=torus(.87,.035,0,0,.03,ivory,dish);rim.scale.y=1.12;
    sign('VESTEL',.85,.20,0,.07,.13,{fg:'#77796e'},dish);
    tube([0,-.83,.02],[.08,-.46,.75],.035,dark,dish);ball(.10,.12,.11,.08,-.46,.75,dark,dish);
    tube([-7.1,.1,-4.5],[-7.1,1.75,-4.5],.045,dark);tube([-7.7,.04,-4.1],[-7.1,1.10,-4.5],.035,dark);
    // Brick chimney with soot, lips and slightly crooked cap.
    box(.88,2.0,.88,7.56,1.04,-1.65,clay,.06);box(1.07,.15,1.04,7.56,2.10,-1.65,dark,.07);
    for(let j=0;j<6;j++)box(.91,.025,.91,7.56,.24+j*.3,-1.65,mat('concrete','#b1a18b'),.01);
    planter(-3.8,-5.65,.65);planter(4.3,-5.7,.65);planter(7.7,1.0,.53);planter(-7.55,1.8,.48);
    const clothMats=['#6c8d85','#ada991','#94594f','#465b75','#c0b9a5'].map(c=>mat('cloth',c));
    tube([-3.8,0,-6],[-3.8,3.25,-6],.035,dark);tube([3.75,0,-6],[3.75,3.25,-6],.035,dark);
    tube([-3.8,3.10,-6],[3.75,3.10,-6],.016,dark);
    for(let i=0;i<6;i++){
      const g=dynamic(-3.10+i*1.18,3.08,-6);
      box(.80,1.0,.055,0,-.50,0,clothMats[i%5],.07,g);
      if(i%2===0){box(.21,.43,.06,-.47,-.23,0,clothMats[i%5],.045,g);box(.21,.43,.06,.47,-.23,0,clothMats[i%5],.045,g);}
      for(let j=0;j<4;j++)box(.023,.90,.009,-.29+j*.18,-.49,.033,clothMats[(i+1)%5],.004,g);
      box(.04,.12,.06,-.27,-.02,0,wood,.01,g);box(.04,.12,.06,.27,-.02,0,wood,.01,g);
      animate(g,(s,t)=>{g.rotation.x=.10+Math.sin(t*2.2+i)*(.07+(s.hazard?.active ? .20 : 0));g.rotation.z=Math.sin(t*1.7+i)*.025;});
    }
    // Loose stone, cans and cable loops add readable wear without gameplay clutter.
    for(let i=0;i<40;i++){const side=i%2===0?-1:1;const x=side*(7.6+rand()*.35),z=-5.7+rand()*11.4;
      const rock=box(.09+rand()*.2,.08+rand()*.12,.12+rand()*.15,x,.07,z,rand()>.5?concrete:clay,.04);rock.rotation.y=rand()*5;}
    for(let i=0;i<70;i++){
      const side=i%4,t=(rand()-.5),x=side<2?(side===0?-7.85:7.85):t*15.6,z=side<2?t*11.6:(side===2?-5.85:5.85);
      const chip=add(new THREE.Mesh(chipGeo,i%3===0?clay:concrete),x,.023+rand()*.025,z);
      chip.scale.set(.04+rand()*.10,.025+rand()*.035,.04+rand()*.11);chip.rotation.set(rand()*.8,rand()*6.28,rand()*.5);
    }
    for(const [x,z] of [[7,4],[-7.4,3.3],[4.7,-5.5]]){const can=cyl(.07,.21,x,.07,z,mat('metal','#798f87'));can.rotation.z=1.4;}
    const rugTexture=texture((c,n)=>{
      c.fillStyle='#713f38';c.fillRect(0,0,n,n);c.strokeStyle='#b4a383';c.lineWidth=18;c.strokeRect(20,20,n-40,n-40);c.strokeStyle='#2f4949';c.lineWidth=14;c.strokeRect(43,43,n-86,n-86);
      for(let y=80;y<n-50;y+=64)for(let x=78;x<n-50;x+=64){c.fillStyle=(x+y)%3===0?'#baaa81':'#334c4c';c.beginPath();c.moveTo(x,y-23);c.lineTo(x+23,y);c.lineTo(x,y+23);c.lineTo(x-23,y);c.closePath();c.fill();c.fillStyle='#ad785e';c.fillRect(x-5,y-5,10,10);}
      for(let i=0;i<n;i+=4){c.strokeStyle='rgba(28,24,18,.22)';c.lineWidth=1;c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.moveTo(0,i);c.lineTo(n,i);c.stroke();}noise(c,n,12000,.23);
    });const rugmat=ownMaterial({map:rugTexture,roughness:.96,side:THREE.DoubleSide});
    flat(1.65,1.30,4.65,.018,5.95,rugmat);
    const ruggeo=new THREE.PlaneGeometry(1.65,1.15);sources.add(ruggeo);add(new THREE.Mesh(ruggeo,rugmat),4.65,-.59,6.635);
    sign('İSTANBUL HALA GÜZEL',2.7,.54,-.3,-2.4,6.425,{fg:'#635e50'});
    // Small red direction pennant rises before each wind gust.
    tube([3.80,.1,-5.95],[3.80,3.85,-5.95],.032,dark);
    const pennant=dynamic(3.8,3.7,-5.95);box(.8,.26,.035,.4,0,0,mat('cloth','#a3473b'),.04,pennant);
    animate(pennant,(s,t)=>{pennant.rotation.y=Math.atan2(s.hazard?.dz||0,s.hazard?.dx||1);pennant.rotation.z=Math.sin(t*(s.hazard?.warning?14:5))*.15;});
  }

  function minibus() {
    platform('bus','#747d74');city();
    const yellow=mat('paint','#b6a25c'), panel=mat('paint','#b5b5a0'), seat=mat('cloth','#607578');
    box(17.35,1.1,13.25,0,-.95,0,yellow,.28);
    // Open-sided dolmuş deck; broad door gaps remain escape routes.
    for(const side of [-1,1])for(const z of [-4.5,0,4.5]){
      box(.30,3.2,.25,side*8.10,1.55,z,yellow,.08);
      box(.24,.9,2.3,side*8.04,.43,z,panel,.08);
    }
    box(16.9,2.9,.3,0,1.4,-6.15,yellow,.13);
    box(13.8,1.4,.10,0,1.75,-5.97,mat('paint','#6e8d92'),.16);
    box(.11,1.5,.15,0,1.75,-5.88,panel,.03);
    box(15.2,.70,1.15,0,.85,-5.35,mat('paint','#6c756b'),.15);
    sign('34 • KADIKÖY — BEŞİKTAŞ',9,.65,0,2.60,-5.94,{bg:'#ded8b6',fg:'#474d40'});
    const wheel=torus(.43,.055,-5.7,1.36,-4.87,dark);wheel.rotation.x=.9;
    for(let i=0;i<3;i++){const b=tube([-5.7,1.36,-4.87],[-5.7+Math.sin(i*2.09)*.4,1.36+Math.cos(i*2.09)*.25,-4.87],.025,dark);}
    sign('İNİCEK VAR!',2,.43,4.5,1.40,-4.73,{bg:'#b6a25c',fg:'#3d443e'});
    for(const side of [-1,1])for(const z of [-3.1,0,3.1]){
      box(1.1,.22,1.5,side*7.3,.66,z,seat,.15);box(.25,1.23,1.5,side*7.85,1.12,z,seat,.12);
      tube([side*7.4,.05,z-.4],[side*7.4,.55,z-.4],.04,dark);tube([side*7.4,.05,z+.4],[side*7.4,.55,z+.4],.04,dark);
    }
    for(const x of [-6,6]){tube([x,.04,-4.7],[x,3.25,-4.7],.045,ivory);tube([x,3.25,-4.7],[x,3.25,5.3],.045,ivory);}
    const grips=[];
    for(let i=0;i<5;i++){const g=dynamic(i%2?-6:6,3.22,-3+i*1.9);tube([0,0,0],[0,-.34,0],.02,dark,g);torus(.15,.027,0,-.48,0,ivory,g);grips.push(g);animate(g,(s,t)=>{g.rotation.x=Math.sin(t*1.6+i)*.10+(s.hazard?.active ? .6 : 0);});}
    for(const x of [-7.4,7.4])for(const z of [-4.4,4.4]){const w=cyl(.80,.44,x,-1.10,z,dark);w.rotation.z=Math.PI/2;}
    // Blurred road strips scroll below the suspended vehicle.
    const road=dynamic(0,-3,0);box(24,.1,100,0,0,0,mat('concrete','#666d66'),.02,road);
    const stripes=dynamic(0,-2.92,0);for(let i=-7;i<8;i++)box(.16,.02,2.8,0,0,i*6,ivory,.015,stripes);
    animate(stripes,(s,t)=>{stripes.position.z=(t*9)%6;});
  }

  function wedding() {
    platform('tile','#ada18b');
    const cream=mat('cloth','#cabd9f'), burgundy=mat('cloth','#805453'), gold=mat('metal','#b59859');
    box(17,3.5,.35,0,1.65,-6.3,mat('paint','#aaa088'),.12);
    for(const x of [-7.7,-5,5,7.7]){box(.50,3.2,.5,x,1.65,-6.0,cream,.10);cyl(.42,.13,x,3.3,-6,gold);}
    box(10,.32,1.4,0,.12,-5.45,wood,.10);
    sign('SONSUZA KADAR',7.2,1.12,0,2.2,-6.06,{bg:'#a49982',fg:'#eee0bc'});
    sign('AYŞE  ♡  MEHMET',5.8,.65,0,1.32,-6.03,{bg:'#a49982',fg:'#633f3c'});
    // Scalloped curtain swags and soft folds.
    for(let i=0;i<9;i++){ball(.62,.55,.16,-4+i,3.14,-5.98,burgundy);box(.25,2.8,.22,-7.3+i*.15,1.58,-5.92,burgundy,.10);}
    for(let i=0;i<6;i++)box(.26,2.8,.22,6.55+i*.15,1.58,-5.92,burgundy,.11);
    for(const x of [-7.2,7.2])for(const z of [-3.8,3.4]){
      cyl(.84,.16,x,.94,z,cream);cyl(.12,.86,x,.44,z,gold);cyl(.53,.09,x,.06,z,gold);
      cyl(.15,.33,x,1.17,z,gold);for(let i=0;i<5;i++)ball(.16,.15,.16,x+Math.sin(i)*.18,1.46,z+Math.cos(i)*.18,mat('cloth',i%2?'#a98574':'#d6cbb5'));
    }
    const festoon=dynamic();const lampMats=['#d5b579','#8da8a7','#b67c76'].map(c=>ownMaterial({color:c,emissive:c,emissiveIntensity:.5,roughness:.8}));
    tube([-8,3.3,-5.5],[8,3.3,-5.5],.017,dark,festoon);
    for(let i=0;i<18;i++)ball(.065,.095,.065,-7.65+i*.9,3.2,-5.5,lampMats[i%3],festoon);
    animate(festoon,(s,t)=>{lampMats.forEach((m,i)=>m.emissiveIntensity=.45+Math.max(0,Math.sin(t*3+i*2))*.55);});
    for(const side of [-1,1]){box(.65,1.35,.55,side*6.1,.71,-5.3,dark,.12);torus(.23,.025,side*6.1,.66,-4.99,ivory);torus(.10,.025,side*6.1,1.12,-4.99,ivory);}
    const trolley=dynamic(0,0,0);cyl(.72,.14,0,.88,0,gold,trolley);cyl(.1,.77,0,.44,0,dark,trolley);cyl(.53,.10,0,.10,0,gold,trolley);
    for(let i=0;i<5;i++){const a=i*1.256;cyl(.07,.15,Math.sin(a)*.4,1.02,Math.cos(a)*.4,ivory,trolley);}
    animate(trolley,(s,t)=>{trolley.position.set(s.hazard?.x||0,0,s.hazard?.z||0);trolley.rotation.y=t*1.8;});
    for(let i=0;i<70;i++){const x=(rand()-.5)*15,z=(rand()-.5)*11;const a=box(.06,.007,.12,x,.005,z,rand()>.5?gold:burgundy,.003);a.rotation.y=rand()*6;}
  }

  function cafe() {
    platform('cafe','#797e71');
    const wall=mat('paint','#929c83'), desk=mat('wood','#81694e'), plastic=mat('paint','#b9b6a1');
    box(17,3.6,.30,0,1.75,-6.30,wall,.09);
    for(const side of [-1,1])box(.3,2.7,3.2,side*8.15,1.3,-4.7,wall,.09);
    sign('İNTERNET CAFE',7,1,0,2.83,-6.11,{bg:'#303e35',fg:'#bbcf91'});
    sign('SAATİ 10 TL  •  YAZICI  •  ÇAY',5.5,.43,0,2.12,-6.10,{bg:'#929c83',fg:'#4b5945'});
    // Continuous desk is explicitly matched by the simulation collider.
    box(12,.20,1.35,0,1.15,-3.8,desk,.09);
    for(const x of [-5.7,-2,2,5.7]){box(.13,1.08,1.08,x,.55,-3.8,dark,.035);}
    for(let i=0;i<5;i++){
      const x=-4.8+i*2.4;
      // Screens themselves are throwable state.props, drawn by the presentation.
      box(.67,.065,.25,x,1.285,-3.32,plastic,.025);
      for(let j=0;j<3;j++)box(.57,.006,.025,x,1.323,-3.40+j*.06,dark,.003);
      box(.09,.045,.13,x+.49,1.29,-3.34,plastic,.035);
      box(.28,.60,.48,x+.63,.33,-4.0,mat('paint','#767d6c'),.05);
      tube([x+.63,.6,-4.15],[x+.63,1.1,-4.15],.016,dark);
    }
    aircon(-6.7,-5.5,.75);
    sign('VERESİYE YOK',2.2,.53,6.55,1.7,-6.10,{bg:'#c0bca3',fg:'#794a40'});
    const clock=dynamic(-6.1,2.55,-6.05);cyl(.36,.04,0,0,0,ivory,clock).rotation.x=Math.PI/2;torus(.36,.035,0,0,.035,dark,clock);
    tube([0,0,.04],[0,.24,.04],.015,dark,clock);tube([0,0,.04],[.17,-.09,.04],.018,dark,clock);
    for(const x of [-4,4])box(2,.09,.19,x,3.22,-4.8,ownMaterial({color:'#dce0c2',emissive:'#dce0c2',emissiveIntensity:.6,roughness:.8}),.05);
    const fan=dynamic(6.7,2.50,-5.82);for(let i=0;i<3;i++){const b=box(.16,.7,.05,0,0,0,blue,.07,fan);b.rotation.z=i*2.094;}torus(.48,.035,6.7,2.5,-5.76,dark);
    animate(fan,(s,t)=>{fan.rotation.z=t*7;});
  }

  function metro() {
    platform('metro','#b3b2a0');
    const tile=mat('tile','#c2c4b4'), municipal=mat('paint','#728d89'), warning=mat('paint','#c4aa58');
    box(17,3.65,.42,0,1.75,-6.85,tile,.12);
    box(17,.42,.06,0,1.40,-6.60,municipal,.025);
    sign('KADIKÖY',4.9,.86,0,2.49,-6.59,{bg:'#607e7c',fg:'#eee5cc'});
    for(const x of [-6.4,6.4]){box(.50,3.2,.50,x,1.5,-4.4,tile,.10);box(.55,.65,.55,x,.56,-4.4,municipal,.06);}
    // Painted sweep lane is exactly the simulation train danger strip.
    box(17,.05,1.28,0,.018,-5.67,mat('metal','#505d59'),.025);
    for(const z of [-5.17,-6.17])box(17,.065,.09,0,.052,z,dark,.02);
    box(17,.026,.37,0,.025,-4.88,warning,.01);
    for(let i=0;i<64;i++)for(let j=0;j<2;j++)ball(.026,.017,.026,-8.3+i*.26,.051,-4.96+j*.15,warning);
    for(const x of [-5.0,5.0]){box(2.5,.22,.68,x,.62,3.7,municipal,.10);box(2.5,.72,.16,x,1.0,4.0,municipal,.08);for(const dx of [-.9,.9])tube([x+dx,.05,3.7],[x+dx,.55,3.7],.055,dark);}
    sign('SARI ÇİZGİYİ GEÇMEYİN',5.6,.43,0,.25,-4.57,{bg:'#aaa894',fg:'#665f45'}).rotation.x=-Math.PI/2;
    const train=dynamic(-24,0,-5.65), steel=mat('metal','#afbaae');
    box(13,2.9,1.65,0,1.55,0,steel,.32,train);box(13,.32,1.70,0,.62,0,municipal,.08,train);
    for(let i=0;i<8;i++){box(1.06,.90,.045,-5.7+i*1.62,2.04,.842,mat('paint','#435e63'),.12,train);box(.04,1.9,.035,-6.36+i*1.62,1.44,.86,dark,.01,train);}
    for(const x of [-6.51,6.51]){const lamp=ownMaterial({color:'#fff0bd',emissive:'#fff0bd',emissiveIntensity:1.4,roughness:.3});ball(.05,.14,.14,x,1.17,.5,lamp,train);}
    animate(train,(s,t)=>{train.visible=!!s.hazard?.active;train.position.x=s.hazard?.x??-24;});
    const signalMat=ownMaterial({color:'#b64532',emissive:'#e65335',emissiveIntensity:.45});
    ball(.105,.105,.08,7.1,2.6,-6.50,signalMat);
    const signal=dynamic();animate(signal,(s,t)=>{signalMat.emissiveIntensity=s.hazard?.warning?1.4+Math.sin(t*12)*.7:.35;});
    for(const x of [-4.3,4.3])box(2.5,.08,.22,x,3.0,-6.25,ownMaterial({color:'#e5dfba',emissive:'#e5dfba',emissiveIntensity:.4}),.035);
  }

  function park() {
    platform('park','#948c71');city();
    const green=mat('paint','#56716b'), sand=mat('concrete','#aaa17c');
    // Raised edging beds keep the action surface visually clear.
    for(const side of [-1,1]){box(1.1,.15,8,side*7.75,.035,0,mat('concrete','#777c57'),.08);}
    for(const x of [-7.6,7.6])for(const z of [-5.2,4.5]){
      cyl(.24,3.6,x,1.75,z,wood);for(let i=0;i<5;i++){const a=i*2.4;ball(1.1,1.25,1,x+Math.sin(a)*.7,3.4+rand()*.6,z+Math.cos(a)*.7,leaf);}
      cyl(.75,.12,x,.10,z,sand);
    }
    function bench(x,z,angle=0){const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=angle;still.add(p);
      for(let i=0;i<4;i++)box(2.5,.11,.15,0,.60,-.25+i*.18,wood,.04,p);
      for(let i=0;i<3;i++)box(2.5,.15,.11,0,.94+i*.19,.42,wood,.04,p);
      for(const xx of [-.9,.9]){tube([xx,.06,-.22],[xx,.62,-.22],.05,green,p);tube([xx,.05,.37],[xx,1.45,.37],.05,green,p);tube([xx,.9,-.33],[xx,.9,.38],.045,green,p);}}
    bench(4.3,-5.35);bench(4.6,5.65,Math.PI);bench(-3.5,5.65,Math.PI);
    const sx=-6,sz=-3;
    for(const x of [sx-1.35,sx+1.35]){tube([x,0,sz-1.3],[x,3.5,sz],.095,green);tube([x,0,sz+1.3],[x,3.5,sz],.095,green);}
    tube([sx-1.55,3.52,sz],[sx+1.55,3.52,sz],.105,green);
    const swing=dynamic(sx,3.42,sz);
    for(const x of [-.65,.65])tube([x,0,0],[x,-2.75,0],.023,dark,swing);
    box(1.58,.18,.64,0,-2.75,0,mat('paint','#9e6551'),.10,swing);
    animate(swing,(s,t)=>{swing.rotation.x=-Math.sin(s.hazard?.phase??t*1.7)*.8;});
    for(const x of [-3.5,6.6]){tube([x,.04,-5.9],[x,3.6,-5.9],.055,green);ball(.20,.31,.20,x,3.78,-5.9,mat('paint','#c9c5a0'));}
    sign('ÇİMLERE BASMAYIN',3,.6,2.3,.92,-6.0,{bg:'#76866a',fg:'#ded8b9'});
    for(const x of [1.0,3.6])tube([x,0,-6],[x,1.3,-6],.035,wood);
    cyl(.35,.82,7.32,.45,1.7,green);cyl(.40,.07,7.32,.89,1.7,dark);
    for(let i=0;i<25;i++){const a=box(.10,.008,.19,(rand()-.5)*14,.01,(rand()-.5)*10,rand()>.5?leaf:mat('cloth','#9a8050'),.025);a.rotation.y=rand()*6;}
  }

  ({rooftop,minibus,wedding,cafe,metro,park}[id] || rooftop)();
  merge(still);
  for(const {parent} of animations)merge(parent);
  // Nonanimated dynamic local batches (road, clock) are also merged.
  for(const child of group.children)if(child!==still&&!animations.some(a=>a.parent===child))merge(child);
  for(const g of sources)g.dispose();
  return {
    group,
    update(state,time) { for(const a of animations)a.fn(state,time); },
    dispose() {
      scene.remove(group);
      group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
      for(const m of ownedMaterials)m.dispose();for(const t of ownedTextures)t.dispose();
    },
  };
}
