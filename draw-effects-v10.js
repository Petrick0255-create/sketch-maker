// The original contour renderer remains the default. These effects only change
// how its extracted paths appear, so switching effects never regenerates art.
const drawClassicSketch=draw;
const traceWithDirection=trace;
const applyOriginalDirection=applyDirection;
const effectSelect=$('#drawEffect');
let effectDots=[];

function prepareEffectDots(){
  effectDots=[];
  let offset=0;
  for(const points of paths){
    if(points.length<2)continue;
    let distance=0,next=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],segment=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(!segment)continue;
      while(next<=distance+segment){
        const t=Math.max(0,(next-distance)/segment);
        const index=effectDots.length;
        effectDots.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,
          offset+next,.78+(index*37%11)/27]);
        next+=3.25;
      }
      distance+=segment;
    }
    offset+=distance;
  }
}

applyDirection=function(){applyOriginalDirection();prepareEffectDots()};
trace=function(im){traceWithDirection(im);prepareEffectDots()};

function drawDots(progress){
  ctx.fillStyle='#020202';ctx.fillRect(0,0,406,720);
  if(!art)return;
  const budget=total*Math.max(0,Math.min(1,progress));
  ctx.fillStyle='#b7b5a9';ctx.beginPath();
  for(const [x,y,at,radius] of effectDots){
    if(at>budget)break;
    ctx.moveTo(x+radius,y);
    ctx.arc(x,y,radius,0,Math.PI*2);
  }
  ctx.fill();
}

function texturedPath(points,remaining,seed){
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(let i=1;i<points.length&&remaining>0;i++){
    const a=points[i-1],b=points[i],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(!distance)continue;
    const part=Math.min(1,remaining/distance);
    const x=a[0]+(b[0]-a[0])*part,y=a[1]+(b[1]-a[1])*part;
    const jitter=.95;
    ctx.lineTo(x+jitter*Math.sin(i*12.7+seed),y+jitter*Math.cos(i*8.3+seed));
    remaining-=distance;
  }
  ctx.stroke();
}

function drawPencil(progress){
  ctx.fillStyle='#020202';ctx.fillRect(0,0,406,720);
  if(!art)return;
  let budget=total*Math.max(0,Math.min(1,progress));
  ctx.save();ctx.lineCap=ctx.lineJoin='round';
  for(let i=0;i<paths.length&&budget>0;i++){
    const points=paths[i],length=len(points),visible=Math.min(length,budget);
    ctx.strokeStyle='#99978e';ctx.globalAlpha=.22;ctx.lineWidth=2.65;
    path(points,visible);
    ctx.strokeStyle='#d0cec2';ctx.globalAlpha=.84;ctx.lineWidth=.78;
    texturedPath(points,visible,i*2.31);
    ctx.strokeStyle='#aaa89d';ctx.globalAlpha=.42;ctx.lineWidth=.66;
    ctx.setLineDash([8,1.5,2,1]);
    texturedPath(points,visible,i*2.31+4.7);
    ctx.setLineDash([]);
    budget-=length;
  }
  ctx.restore();
}

draw=function(progress=1){
  const effect=effectSelect.value;
  if(effect==='dots')return drawDots(progress);
  if(effect==='pencil')return drawPencil(progress);
  return drawClassicSketch(progress);
};

const savedEffect=localStorage.getItem('sketch-draw-effect');
if(['classic','dots','pencil'].includes(savedEffect))effectSelect.value=savedEffect;
effectSelect.addEventListener('change',()=>{
  localStorage.setItem('sketch-draw-effect',effectSelect.value);
  if(art)play();
});
