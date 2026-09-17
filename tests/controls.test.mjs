import test from 'node:test';
import assert from 'node:assert/strict';
import {controllerOwners} from '../src/controls.js';
test('disconnect returns the abandoned body to a bot without stealing another controller',()=>{
 const before=controllerOwners([0,1],false);assert.equal(before[1].index,0);assert.equal(before[2].index,1);
 const after=controllerOwners([1],false,before);assert.equal(after[1].kind,'bot');assert.deepEqual(after[2],{kind:'gamepad',index:1});assert.equal(after.filter(o=>o.kind==='keyboard').length,1);
});
test('split keyboard reserves two distinct bodies before controllers join',()=>{
 const owners=controllerOwners([2,4],true);assert.deepEqual(owners.slice(0,2),[{kind:'keyboard',index:0},{kind:'keyboard',index:1}]);assert.deepEqual(owners[2],{kind:'gamepad',index:2});assert.equal(owners[4].kind,'bot');
});
