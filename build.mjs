import {build} from 'esbuild';
import fs from 'node:fs';
import vm from 'node:vm';

const result=await build({entryPoints:['src/main.js'],bundle:true,format:'iife',minify:true,write:false,target:'es2022',legalComments:'inline'});
const payload=result.outputFiles[0].text;
// Validate before writing, and use a callback so $&/$` inside vendor code are literal.
new vm.Script(payload);
const shell=fs.readFileSync('src/shell.html','utf8');
const license=fs.readFileSync('node_modules/three/LICENSE','utf8');
const html=shell.replace('/*__GAME__*/',()=>`/* Three.js license\n${license}\n*/\n${payload}`.replaceAll('</script','<\\/script'));
fs.writeFileSync('index.html',html);
console.log(`Built self-contained index.html (${(Buffer.byteLength(html)/1024).toFixed(0)} KiB).`);
