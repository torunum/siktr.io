import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
 catch{res.writeHead(400);res.end('Bad request');return;}
 let p=path.resolve(root,'.'+pathname);
 if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403);res.end();return;}
 if(pathname==='/')p=path.join(root,'index.html');
 fs.readFile(p,(e,d)=>{
  if(e){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.png')?'image/png':'text/plain');
  res.setHeader('Cache-Control','no-store');res.end(d);
 });
}).listen(4173,'127.0.0.1',()=>console.log('SIKTR.IO http://127.0.0.1:4173'));
