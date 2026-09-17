import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('single-file payload is valid JavaScript with no external runtime assets',()=>{
 const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));assert.ok(!/<(?:script|img|link|audio)[^>]+(?:src|href)=["']https?:/i.test(html));assert.ok(!scripts[0][1].includes('/*__GAME__*/'));
});
