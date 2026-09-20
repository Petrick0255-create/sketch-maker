// Classic uses the original traced contours. Dot and pencil modes sample the
// generated bitmap independently; neither renderer draws the classic paths.
const drawClassicSketch=draw;
const traceWithDirection=trace;
const applyOriginalDirection=applyDirection;
const effectSelect=$('#drawEffect');
let dotMarks=[],pencilMarks=[];

function noise(x,y){
  const n=Math.sin(x*127.1+y*311.7)*43758.5453;
  return n-Math.floor(n);
}

function imageLuminance(im){
  const width=406,height=720,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const surface=canvas.getContext('2d',{willReadFrequently:true});
  surface.fillStyle='#020202';surface.fillRect(0,0,width,height);
  const scale=Math.min(370/im.width,590/im.height);
  const w=im.width*scale,h=im.height*scale;
  surface.drawImage(im,(width-w)/2,(height-h)/2,w,h);
  const data=surface.getImageData(0,0,width,height).data;
  const luma=new Uint8Array(width*height);
  for(let i=0;i<luma.length;i++){
    luma[i]=Math.round(.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2]);
  }
  return luma;
}

function sample(luma,x,y){
  return luma[Math.max(0,Math.min(719,y))*406+Math.max(0,Math.min(405,x))];
}

function buildDotMarks(luma){
  dotMarks=[];
  const cell=5;
  for(let top=0;top<720;top+=cell)for(let left=0;left<406;left+=cell){
    let energy=0,sx=0,sy=0,peak=0,hits=0;
    for(let y=top;y<Math.min(top+cell,720);y++)for(let x=left;x<Math.min(left+cell,406);x++){
      const light=sample(luma,x,y),weight=Math.max(0,light-27);
      if(weight){energy+=weight;sx+=x*weight;sy+=y*weight;hits++;peak=Math.max(peak,light)}
    }
    if(peak<48||!hits)continue;
    const x=sx/energy,y=sy/energy;
    const radius=1.08+peak/255*1.24+Math.min(.3,hits*.018);
    dotMarks.push({x,y,radius,shade:peak<95?0:peak<170?1:2});
  }
}

function buildPencilMarks(luma){
  pencilMarks=[];
  const cell=2;
  for(let top=2;top<718;top+=cell)for(let left=2;left<404;left+=cell){
    let energy=0,sx=0,sy=0,peak=0;
    for(let y=top;y<top+cell;y++)for(let x=left;x<left+cell;x++){
      const light=sample(luma,x,y),weight=Math.max(0,light-22);
      if(weight){energy+=weight;sx+=x*weight;sy+=y*weight;peak=Math.max(peak,light)}
    }
    if(peak<38||!energy)continue;
    const x=sx/energy,y=sy/energy;
    const px=Math.round(x),py=Math.round(y);
    const gx=sample(luma,px+2,py)-sample(luma,px-2,py);
    const gy=sample(luma,px,py+2)-sample(luma,px,py-2);
    const angle=Math.hypot(gx,gy)>13
      ?Math.atan2(gx,-gy)+(noise(left,top)-.5)*.32
      :-.55+(noise(left,top)-.5)*.8;
    const length=4.8+peak/255*5.2;
    const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2;
    const shade=peak<85?0:peak<165?1:2;
    pencilMarks.push({x,y,x1:x-dx,y1:y-dy,x2:x+dx,y2:y+dy,shade,
      cross:shade===2&&noise(left+19,top+7)>.74});
  }
}

function sortEffectMarks(){
  const mode=$('#direction').value;
  const order=(a,b)=>directionScore([a.x,a.y],mode)-directionScore([b.x,b.y],mode);
  dotMarks.sort(order);pencilMarks.sort(order);
}

applyDirection=function(){applyOriginalDirection();sortEffectMarks()};
trace=function(im){
  traceWithDirection(im);
  const luma=imageLuminance(im);
  buildDotMarks(luma);buildPencilMarks(luma);sortEffectMarks();
};

function effectHasMarks(){
  if(effectSelect.value==='dots')return dotMarks.length>0;
  if(effectSelect.value==='pencil')return pencilMarks.length>0;
  return paths.length>0;
}

function drawDots(progress){
  ctx.fillStyle='#020202';ctx.fillRect(0,0,406,720);
  if(!art)return;
  const count=Math.ceil(dotMarks.length*Math.max(0,Math.min(1,progress)));
  ctx.save();ctx.fillStyle='#d9d6ca';
  for(let shade=0;shade<3;shade++){
    ctx.globalAlpha=[.58,.78,.96][shade];ctx.beginPath();
    for(let i=0;i<count;i++){
      const dot=dotMarks[i];if(dot.shade!==shade)continue;
      ctx.moveTo(dot.x+dot.radius,dot.y);
      ctx.arc(dot.x,dot.y,dot.radius,0,Math.PI*2);
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawPencil(progress){
  ctx.fillStyle='#020202';ctx.fillRect(0,0,406,720);
  if(!art)return;
  const count=Math.ceil(pencilMarks.length*Math.max(0,Math.min(1,progress)));
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle='#77746c';ctx.lineWidth=2.4;ctx.globalAlpha=.28;ctx.beginPath();
  for(let i=0;i<count;i++){
    const mark=pencilMarks[i];ctx.moveTo(mark.x1,mark.y1);ctx.lineTo(mark.x2,mark.y2);
  }
  ctx.stroke();
  const colors=['#8a877e','#b4b0a5','#e0dccf'];
  const widths=[.65,.86,1.06],alphas=[.52,.72,.88];
  for(let shade=0;shade<3;shade++){
    ctx.strokeStyle=colors[shade];ctx.lineWidth=widths[shade];ctx.globalAlpha=alphas[shade];
    ctx.beginPath();
    for(let i=0;i<count;i++){
      const mark=pencilMarks[i];if(mark.shade!==shade)continue;
      ctx.moveTo(mark.x1,mark.y1);ctx.lineTo(mark.x2,mark.y2);
    }
    ctx.stroke();
  }
  ctx.strokeStyle='#aaa69b';ctx.lineWidth=.45;ctx.globalAlpha=.38;ctx.beginPath();
  for(let i=0;i<count;i++){
    const mark=pencilMarks[i];if(!mark.cross)continue;
    ctx.moveTo(mark.x-1.5,mark.y+1.5);ctx.lineTo(mark.x+1.5,mark.y-1.5);
  }
  ctx.stroke();ctx.restore();
}

draw=function(progress=1){
  if(effectSelect.value==='dots')return drawDots(progress);
  if(effectSelect.value==='pencil')return drawPencil(progress);
  return drawClassicSketch(progress);
};

const savedEffect=localStorage.getItem('sketch-draw-effect');
if(['classic','dots','pencil'].includes(savedEffect))effectSelect.value=savedEffect;
effectSelect.addEventListener('change',()=>{
  localStorage.setItem('sketch-draw-effect',effectSelect.value);
  if(!art)return;
  msg('기존 그림에 효과를 적용했습니다. 효과 전용 그림을 원하면 ‘그림만 다시 생성’을 누르세요.');
  play();
});
$('#direction').addEventListener('change',()=>{
  if(!art||effectSelect.value==='classic')return;
  sortEffectMarks();play();
});
