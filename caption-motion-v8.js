function captionLayout(boxHeight){
  const position=$('#captionPosition').value;
  const boxY=position==='top'?82:position==='middle'?(720-boxHeight)/2:720-boxHeight-32;
  return {boxY,textY:boxY+boxHeight/2};
}

function captionLines(){
  if(!englishCaption)return [];
  const weight=$('#captionWeight').value;
  const size=Number($('#captionSize').value)||18;
  ctx.font=`${weight} ${size}px Pretendard, sans-serif`;
  const words=englishCaption.trim().split(/\s+/);
  const lines=[];let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>342&&line){lines.push(line);line=word}
    else line=next;
  }
  if(line)lines.push(line);
  return lines.slice(0,2);
}

drawCaption=function(progress){
  const timing=$('#captionTiming').value;
  const ranges={early:[0.08,0.34],middle:[0.36,0.30],late:[0.62,0.32]};
  const [start,duration]=ranges[timing]||ranges.late;
  if(!englishCaption||progress<start)return;
  const writeProgress=Math.min(1,(progress-start)/duration);
  const size=Number($('#captionSize').value)||18;
  const weight=$('#captionWeight').value;
  const lines=captionLines();
  const lineHeight=Math.round(size*1.38);
  const boxHeight=Math.max(58,lines.length*lineHeight+28);
  const {boxY,textY}=captionLayout(boxHeight);
  const totalChars=Math.max(1,lines.reduce((sum,line)=>sum+line.length,0));
  let remaining=totalChars*writeProgress;

  ctx.save();
  ctx.fillStyle='rgba(2,2,2,.94)';
  ctx.fillRect(20,boxY,366,boxHeight);
  ctx.fillStyle='#efeee9';
  ctx.textAlign='left';
  ctx.textBaseline='middle';
  ctx.font=`${weight} ${size}px Pretendard, sans-serif`;

  lines.forEach((line,index)=>{
    if(remaining<=0)return;
    const lineY=textY+(index-(lines.length-1)/2)*lineHeight;
    const fullWidth=ctx.measureText(line).width;
    const startX=203-fullWidth/2;
    const charsToShow=Math.min(line.length,remaining);
    const whole=Math.floor(charsToShow);
    const fraction=charsToShow-whole;
    const completed=line.slice(0,whole);
    if(completed)ctx.fillText(completed,startX,lineY);
    if(fraction>0&&whole<line.length){
      const char=line[whole];
      const beforeWidth=ctx.measureText(completed).width;
      const charWidth=Math.max(1,ctx.measureText(char).width);
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX+beforeWidth-1,lineY-size*.8,charWidth*fraction+2,size*1.6);
      ctx.clip();
      ctx.fillText(char,startX+beforeWidth,lineY);
      ctx.restore();
    }
    remaining-=line.length;
  });
  ctx.restore();
};

function refreshCaptionPreview(){
  if(!art)return;
  draw(0);
  play();
}
$('#captionPosition').addEventListener('change',refreshCaptionPreview);
$('#captionWeight').addEventListener('change',refreshCaptionPreview);
$('#captionSize').addEventListener('change',refreshCaptionPreview);
$('#captionTiming').addEventListener('change',refreshCaptionPreview);
