// Keep gamepad ownership stable when a controller connects or disconnects.
// This is a pure topology calculation; actual input remains sampled by the host.
export function controllerOwners(padIds,twoPlayer,previous=[]){
 const keys=twoPlayer?2:1,owners=Array.from({length:6},(_,i)=>i<keys?{kind:'keyboard',index:i}:{kind:'bot'}),used=new Set();
 for(let i=keys;i<6;i++){const old=previous[i];if(old?.kind==='gamepad'&&padIds.includes(old.index)&&!used.has(old.index)){owners[i]={...old};used.add(old.index);}}
 for(const id of padIds){if(used.has(id))continue;const i=owners.findIndex((o,j)=>j>=keys&&o.kind==='bot');if(i<0)break;owners[i]={kind:'gamepad',index:id};used.add(id);}
 return owners;
}
