import {canvasTexture} from './art.js';

export function createSky(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d'),image=ctx.createImageData(1024,512),data=image.data;
 const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)+72817;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
 function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;}
 function fbm(x,y){return noise(x,y)*.55+noise(x*2.07+7,y*2.07+3)*.27+noise(x*4.1,y*4.1)*.12+noise(x*8.3,y*8.3)*.06;}
 const stops=[[0,[155,165,174]],[.16,[243,191,140]],[.28,[227,191,158]],[.50,[176,182,180]],[1,[156,174,173]]];
 for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
  const yy=y/511;let k=0;while(k<stops.length-2&&yy>stops[k+1][0])k++;const a=stops[k],b=stops[k+1],t=(yy-a[0])/(b[0]-a[0]);
  const n=fbm(x*.009,y*.041),cover=Math.max(0,Math.min(1,(n-.43)*3.6))*Math.max(0,1-yy*2.9),rim=Math.max(0,1-Math.abs(n-.46)*27)*Math.max(0,1-yy*3),sun=Math.exp(-Math.pow((x/1024-.72)*3.0,2))*Math.max(0,1-Math.abs(yy-.16)*4);
  const i=(y*1024+x)*4;for(let c=0;c<3;c++){const base=a[1][c]*(1-t)+b[1][c]*t;const shadow=[107,117,121][c],warm=[22,13,3][c];data[i+c]=base*(1-cover*.70)+shadow*cover*.70+rim*warm+sun*[13,8,1][c];}data[i+3]=255;
 }
 ctx.putImageData(image,0,0);return canvasTexture(canvas);
}
