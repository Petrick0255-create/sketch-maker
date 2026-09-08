// v5: extract actual contours, never bright filled regions.
trace=function(im){
  const sc=Math.min(370/im.width,590/im.height),dw=Math.round(im.width*sc),dh=Math.round(im.height*sc);
  const dx=Math.round((406-dw)/2),dy=Math.round((720-dh)/2),step=2,w=Math.ceil(dw/step),h=Math.ceil(dh/step);
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h),a=new Uint8Array(w*h);
  for(let i=0;i<g.length;i++)g[i]=.2126*d[i*4]+.7152*d[i*4+1]+.0722*d[i*4+2];
  // Sobel gradient: filled faces/clothes disappear; only their outlines remain.
  for(let y=1;y<h-1;y++)for(let q=1;q<w-1;q++){
    const i=y*w+q;
    const gx=-g[i-w-1]-2*g[i-1]-g[i+w-1]+g[i-w+1]+2*g[i+1]+g[i+w+1];
    const gy=-g[i-w-1]-2*g[i-w]-g[i-w+1]+g[i+w-1]+2*g[i+w]+g[i+w+1];
    const mag=Math.hypot(gx,gy);
    a[i]=mag>54?1:0;
  }
  thin(a,w,h);
  const used=new Set(),out=[],edge=(a,b,c,d)=>a+','+b+'>'+c+','+d;
  function walk(sx,sy,nx,ny){
    const p=[[sx,sy]];let px=sx,py=sy,X=nx,Y=ny;
    for(let z=0;z<5000;z++){
      used.add(edge(px,py,X,Y));used.add(edge(X,Y,px,py));p.push([X,Y]);
      let ns=near(a,w,h,X,Y).filter(v=>!used.has(edge(X,Y,v[0],v[1])));
      if(!ns.length)break;
      // Continue in the straightest direction instead of jumping across a junction.
      const vx=X-px,vy=Y-py;
      ns.sort((u,v)=>{const du=(u[0]-X)*vx+(u[1]-Y)*vy,dv=(v[0]-X)*vx+(v[1]-Y)*vy;return dv-du});
      px=X;py=Y;X=ns[0][0];Y=ns[0][1];
    }
    return p;
  }
  const starts=[];
  for(let y=1;y<h-1;y++)for(let q=1;q<w-1;q++)if(a[y*w+q]&&near(a,w,h,q,y).length!==2)starts.push([q,y]);
  for(const s of starts)for(const n of near(a,w,h,s[0],s[1]))if(!used.has(edge(s[0],s[1],n[0],n[1]))){const p=walk(s[0],s[1],n[0],n[1]);if(p.length>3)out.push(p)}
  for(let y=1;y<h-1;y++)for(let q=1;q<w-1;q++)if(a[y*w+q]){const n=near(a,w,h,q,y).find(v=>!used.has(edge(q,y,v[0],v[1])));if(n){const p=walk(q,y,n[0],n[1]);if(p.length>3)out.push(p)}}
  paths=out.map(p=>p.filter((_,i)=>i%2===0||i===p.length-1).map(v=>[dx+v[0]*step,dy+v[1]*step]))
    .filter(p=>len(p)>5)
    .sort((a,b)=>a[0][1]-b[0][1]||b.length-a.length);
  total=paths.reduce((s,p)=>s+len(p),0);
};
draw=function(p=1){
  ctx.fillStyle='#020202';ctx.fillRect(0,0,406,720);if(!art)return blank();
  p=Math.max(0,Math.min(1,p));let budget=total*p;
  ctx.strokeStyle='#aaa9a0';ctx.lineWidth=1.18;ctx.lineCap=ctx.lineJoin='round';
  for(const v of paths){if(budget<=0)break;const l=len(v);path(v,Math.min(l,budget));budget-=l}
};
