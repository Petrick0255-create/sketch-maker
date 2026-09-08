const tracedWithoutDirection=trace;
function pathCenter(p){
  let x=0,y=0;for(const q of p){x+=q[0];y+=q[1]}
  return [x/p.length,y/p.length];
}
function directionScore(p,mode){
  const [x,y]=pathCenter(p);
  if(mode==='bottom')return -y;
  if(mode==='left')return x;
  if(mode==='right')return -x;
  if(mode==='center')return Math.hypot(x-203,y-360);
  return y;
}
function endpointScore(q,mode){
  if(mode==='bottom')return -q[1];
  if(mode==='left')return q[0];
  if(mode==='right')return -q[0];
  if(mode==='center')return Math.hypot(q[0]-203,q[1]-360);
  return q[1];
}
function applyDirection(){
  const mode=$('#direction').value;
  paths.sort((a,b)=>directionScore(a,mode)-directionScore(b,mode));
  paths.forEach(p=>{
    if(p.length>1&&endpointScore(p[p.length-1],mode)<endpointScore(p[0],mode))p.reverse();
  });
  total=paths.reduce((s,p)=>s+len(p),0);
}
trace=function(im){tracedWithoutDirection(im);applyDirection()};
$('#direction').addEventListener('change',()=>{
  if(!paths.length)return;
  applyDirection();
  draw(0);
  play();
});
