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

async function createEnglishCaption(subject){
  const response=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key())}`,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:`Convert the following Korean visual description into one natural, evocative English caption of at most 8 words. Preserve the meaning. Output only the English caption without quotation marks or punctuation at the end. Description: ${subject}`}]}],
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
  if(!subject)return msg('그리고 싶은 대상을 입력하세요.',true);
  if(!key())return api();
  msg('그림과 영어 문구를 만들고 있습니다…');
  $('#makeBtn').disabled=$('#regenerateBtn').disabled=true;
  try{
    const results=await Promise.allSettled([generate(subject),createEnglishCaption(subject)]);
    if(results[0].status!=='fulfilled')throw results[0].reason;
    art=results[0].value;
    englishCaption=results[1].status==='fulfilled'?results[1].value:'';
    trace(art);
    if(!paths.length)throw new Error('추출할 선이 없습니다. 다시 생성해 주세요.');
    $('#previewBtn').disabled=$('#downloadBtn').disabled=$('#regenerateBtn').disabled=false;
    msg(englishCaption?`연필선과 영문 문구 “${englishCaption}”를 만들었습니다.`:`${paths.length}개의 연필선을 추출했습니다.`);
    play();
  }catch(error){
    msg(error.message,true);
  }finally{
    $('#makeBtn').disabled=false;
    if(art)$('#regenerateBtn').disabled=false;
  }
}

$('#makeBtn').onclick=$('#regenerateBtn').onclick=makeWithCaption;
