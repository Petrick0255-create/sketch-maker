let englishCaption='';
const drawSketchOnly=draw;

function drawCaption(progress){
  if(!englishCaption||progress<0.68)return;
  const alpha=Math.min(1,(progress-0.68)/0.14);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.fillStyle='#020202';
  ctx.fillRect(20,610,366,82);
  ctx.fillStyle='#efeee9';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font='600 18px Pretendard, sans-serif';
  const words=englishCaption.trim().split(/\s+/);
  const lines=[];let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>330&&line){lines.push(line);line=word}
    else line=next;
  }
  if(line)lines.push(line);
  const shown=lines.slice(0,2),start=shown.length===1?651:639;
  shown.forEach((text,i)=>ctx.fillText(text,203,start+i*25));
  ctx.restore();
}

draw=function(progress=1){
  drawSketchOnly(progress);
  drawCaption(Math.max(0,Math.min(1,progress)));
};

async function createEnglishCaption(captionText){
  const response=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key())}`,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:`Translate the following caption into natural English. If it is already English, keep its meaning and lightly polish it. Do not describe or add anything. Output only one concise English caption, without quotation marks or final punctuation. Caption: ${captionText}`}]}],
        generationConfig:{temperature:0.45,maxOutputTokens:40}
      })
    }
  );
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||'영어 문구 생성 실패');
  return (data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'')
    .replace(/^["']|["'.]$/g,'').trim().slice(0,90);
}

async function makeWithCaption(){
  const subject=$('#script').value.trim();
  const captionText=$('#captionInput').value.trim();
  if(!subject)return msg('그리고 싶은 대상을 입력하세요.',true);
  if(!key())return api();
  msg(captionText?'그림을 만들고 글자를 영어로 바꾸고 있습니다…':'그림을 만들고 있습니다…');
  $('#makeBtn').disabled=$('#regenerateBtn').disabled=$('#drawEffect').disabled=true;
  try{
    const results=await Promise.allSettled([
      generate(subject),
      captionText?createEnglishCaption(captionText):Promise.resolve('')
    ]);
    if(results[0].status!=='fulfilled')throw results[0].reason;
    art=results[0].value;
    englishCaption=results[1].status==='fulfilled'?results[1].value:'';
    trace(art);
    if(!effectHasMarks())throw new Error('그림에서 그릴 부분을 찾지 못했습니다. 다시 생성해 주세요.');
    $('#previewBtn').disabled=$('#downloadBtn').disabled=$('#regenerateBtn').disabled=false;
    const effectName=$('#drawEffect').selectedOptions[0].textContent;
    msg(englishCaption?`${effectName} 효과와 영문 문구 “${englishCaption}”를 만들었습니다.`:`${effectName} 효과로 그림을 준비했습니다.`);
    play();
  }catch(error){
    msg(error.message,true);
  }finally{
    $('#makeBtn').disabled=false;
    $('#drawEffect').disabled=false;
    if(art)$('#regenerateBtn').disabled=false;
  }
}

$('#makeBtn').onclick=$('#regenerateBtn').onclick=makeWithCaption;
