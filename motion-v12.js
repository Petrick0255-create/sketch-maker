// Optional three-frame animation mode. The still-image path remains untouched.
const motionModeSelect=$('#motionMode');
const generateStillImage=generate;
const traceSingleFrame=trace;
const drawStillFrame=draw;
let motionFrames=[];
let motionStates=[];
const motionDrawEnd=.52;
const motionFrameMs=120;

function motionEnabled(){
  return motionModeSelect.value==='gif3';
}

function clonePaths(items){
  return items.map(line=>line.map(point=>[point[0],point[1]]));
}

function captureMotionState(frame){
  return {
    art:frame,
    paths:clonePaths(paths),
    total,
    dotMarks:dotMarks.map(mark=>({...mark})),
    pencilMarks:pencilMarks.map(mark=>({...mark}))
  };
}

function useMotionState(state){
  if(!state)return;
  art=state.art;
  paths=state.paths;
  total=state.total;
  dotMarks=state.dotMarks;
  pencilMarks=state.pencilMarks;
}

function stylePrompt(){
  const style=$('#drawEffect').value;
  if(style==='dots')return 'Use only distinct separated warm-gray circular dots. No connected outlines, solid fills, gradients, text or color.';
  if(style==='pencil')return 'Use short natural warm-gray graphite pencil marks, varied pressure, layered strokes and light crosshatching. No clean vector lines, text or color.';
  return 'Use clean long continuous warm-gray hand-drawn outlines, minimal hatching and no large filled areas, text or color.';
}

async function requestMotionSheet(subject){
  const prompt=`Create one horizontal three-panel animation sprite sheet for: "${subject}".
Exactly three equal vertical panels from left to right, showing three consecutive moments of one continuous action: beginning pose, middle pose, ending pose.
The same subject must keep identical identity, face, hair, clothing, proportions, line style, camera angle, framing and scale in all three panels.
Keep the background pure black and empty. Center the subject separately inside each panel. Show a clear change in body pose or moving parts so the sequence visibly animates when played 1-2-3-2.
Do not add panel borders, gutters, captions, labels, letters, numbers, arrows, watermark or UI. ${stylePrompt()}`;
  const response=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent?key=${encodeURIComponent(key())}`,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{
          responseModalities:['IMAGE'],
          imageConfig:{aspectRatio:'16:9',imageSize:'1K'}
        }
      })
    }
  );
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||'3컷 이미지 생성 실패');
  const part=data.candidates?.[0]?.content?.parts?.find(item=>item.inlineData?.data);
  if(!part)throw new Error('Gemini가 3컷 이미지를 반환하지 않았습니다.');
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('3컷 이미지를 읽지 못했습니다.'));
    image.src=`data:${part.inlineData.mimeType||'image/png'};base64,${part.inlineData.data}`;
  });
}

function splitMotionSheet(sheet){
  const frames=[];
  const panelWidth=sheet.width/3;
  const cropWidth=Math.min(panelWidth,sheet.height*9/16);
  const sourceHeight=Math.min(sheet.height,cropWidth*16/9);
  for(let index=0;index<3;index++){
    const frame=document.createElement('canvas');
    frame.width=576;
    frame.height=1024;
    const surface=frame.getContext('2d');
    surface.fillStyle='#020202';
    surface.fillRect(0,0,frame.width,frame.height);
    const sourceX=index*panelWidth+(panelWidth-cropWidth)/2;
    const sourceY=(sheet.height-sourceHeight)/2;
    surface.drawImage(sheet,sourceX,sourceY,cropWidth,sourceHeight,0,0,frame.width,frame.height);
    frames.push(frame);
  }
  return frames;
}

generate=async function(subject){
  if(!motionEnabled()){
    motionFrames=[];
    motionStates=[];
    return generateStillImage(subject);
  }
  const sheet=await requestMotionSheet(subject);
  motionFrames=splitMotionSheet(sheet);
  motionStates=[];
  return motionFrames[0];
};

function traceAllMotionFrames(){
  motionStates=[];
  for(const frame of motionFrames){
    art=frame;
    traceSingleFrame(frame);
    motionStates.push(captureMotionState(frame));
  }
  useMotionState(motionStates[0]);
}

trace=function(image){
  if(motionEnabled()&&motionFrames.length===3){
    traceAllMotionFrames();
    return;
  }
  traceSingleFrame(image);
};

function motionFrameIndex(progress){
  if(progress<motionDrawEnd)return 0;
  const elapsed=(progress-motionDrawEnd)*ms();
  const sequence=[0,1,2,1];
  return sequence[Math.floor(elapsed/motionFrameMs)%sequence.length];
}

draw=function(progress=1){
  if(!motionEnabled()||motionStates.length!==3)return drawStillFrame(progress);
  const value=Math.max(0,Math.min(1,progress));
  if(value<motionDrawEnd){
    useMotionState(motionStates[0]);
    drawSketchOnly(value/motionDrawEnd);
    drawCaption(value);
    return;
  }
  useMotionState(motionStates[motionFrameIndex(value)]);
  drawSketchOnly(1);
  drawCaption(value);
};

const savedMotionMode=localStorage.getItem('sketch-motion-mode');
if(['still','gif3'].includes(savedMotionMode))motionModeSelect.value=savedMotionMode;

motionModeSelect.addEventListener('change',()=>{
  localStorage.setItem('sketch-motion-mode',motionModeSelect.value);
  if(motionModeSelect.value==='still'&&motionStates.length){
    useMotionState(motionStates[0]);
    drawStillFrame(1);
    msg('정지 그림 모드로 전환했습니다. 새 그림을 만들면 기존 방식으로 생성됩니다.');
  }else if(motionModeSelect.value==='gif3'&&motionStates.length===3){
    useMotionState(motionStates[0]);
    msg('3컷 애니메이션 모드로 전환했습니다.');
    play();
  }else{
    msg(motionModeSelect.value==='gif3'
      ?'GIF 애니메이션을 선택했습니다. 동작을 입력하고 영상 만들기를 눌러 주세요.'
      :'정지 그림을 선택했습니다.');
  }
});

$('#direction').addEventListener('change',()=>{
  if(!motionEnabled()||motionFrames.length!==3)return;
  traceAllMotionFrames();
  play();
});

const makeButton=$('#makeBtn');
const regenerateButton=$('#regenerateBtn');
const originalMakeHandler=makeButton.onclick;
const originalRegenerateHandler=regenerateButton.onclick;
makeButton.onclick=async event=>{
  motionModeSelect.disabled=true;
  if(motionEnabled())msg('Gemini가 같은 대상의 연속 동작 3컷을 그리고 있습니다…');
  try{
    await originalMakeHandler.call(makeButton,event);
    if(motionEnabled()&&motionStates.length===3)msg('연속 3컷의 선을 추출했습니다. 미리보기에서 반복 동작을 확인하세요.');
  }finally{
    motionModeSelect.disabled=false;
  }
};
regenerateButton.onclick=async event=>{
  motionModeSelect.disabled=true;
  if(motionEnabled())msg('다른 연속 동작 3컷을 다시 그리고 있습니다…');
  try{
    await originalRegenerateHandler.call(regenerateButton,event);
    if(motionEnabled()&&motionStates.length===3)msg('새 연속 3컷을 준비했습니다.');
  }finally{
    motionModeSelect.disabled=false;
  }
};
