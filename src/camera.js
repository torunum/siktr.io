// Fit projected arena corners rather than using a landscape-only zoom heuristic.
export function fitArenaDistance(aspect,fov,direction,look){
 const d=direction,rLen=Math.hypot(d.x,d.z),rx=d.z/rLen,rz=-d.x/rLen,ux=d.y*rz,uy=d.z*rx-d.x*rz,uz=-d.y*rx,tan=Math.tan(fov*Math.PI/360);
 let distance=22;
 // 17 × 13 m arena, with 2.4 m (one full character) of void at every edge.
 for(const x of [-10.9,10.9])for(const z of [-8.9,8.9]){
  const qx=x-look.x,qy=-look.y,qz=z-look.z,depth=qx*d.x+qy*d.y+qz*d.z;
  distance=Math.max(distance,depth+Math.abs(qx*rx+qz*rz)/(tan*aspect),depth+Math.abs(qx*ux+qy*uy+qz*uz)/tan);
 }
 return distance;
}
