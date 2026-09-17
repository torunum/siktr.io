import test from 'node:test';
import assert from 'node:assert/strict';
import {fitArenaDistance} from '../src/camera.js';

test('all arena corners plus a full body-length fall margin remain visible in wide and narrow windows',()=>{
 const length=Math.hypot(.1,.72,1),d={x:.1/length,y:.72/length,z:1/length},look={x:.65,y:.9,z:.5};
 const right={x:d.z/Math.hypot(d.x,d.z),z:-d.x/Math.hypot(d.x,d.z)},up={x:d.y*right.z,y:d.z*right.x-d.x*right.z,z:-d.y*right.x};
 for(const aspect of [16/9,4/3,652/698,9/16]){const dist=fitArenaDistance(aspect,40,d,look);for(const x of [-10.9,10.9])for(const z of [-8.9,8.9]){const q={x:x-look.x,y:-look.y,z:z-look.z},depth=dist-q.x*d.x-q.y*d.y-q.z*d.z;const h=(q.x*right.x+q.z*right.z)/(depth*Math.tan(20*Math.PI/180)*aspect);const v=(q.x*up.x+q.y*up.y+q.z*up.z)/(depth*Math.tan(20*Math.PI/180));assert.ok(Math.abs(h)<=1.00001,`horizontal clipping at ${aspect}`);assert.ok(Math.abs(v)<=1.00001,`vertical clipping at ${aspect}`);}}
});
