let previousDownloadUrl=null;

function supportedRecorderType(format){
  const candidates=format==='mp4'
    ?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/mp4']
    :['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return candidates.find(type=>MediaRecorder.isTypeSupported(type))||'';
}

async function downloadSelectedFormat(){
  if(!art)return;
  const outputName=$('#outputName').value.trim();
  const projectName=$('#projectName').value.trim();
  const localSave=['localhost','127.0.0.1'].includes(location.hostname);
  if(localSave&&(!/^\d{4} [^/\\.][^/\\]{0,74}$/.test(projectName)||projectName.includes('..'))){
    msg('프로젝트 폴더를 MMDD 제목 형식으로 입력해 주세요. 예: 0920 새 영상 제목',true);
    return;
  }
  if(outputName&&(outputName.includes('/')||outputName.includes('\\')||outputName.includes('..'))){
    msg('파일 이름에는 /, \\ 또는 ..을 넣을 수 없습니다.',true);
    return;
  }
  const format=$('#videoFormat').value;
  const mime=supportedRecorderType(format);
  if(!mime){
    msg(format==='mp4'
      ?'이 브라우저는 MP4 녹화를 지원하지 않습니다. 최신 Chrome 또는 Edge에서 다시 시도하거나 WebM을 선택하세요.'
      :'이 브라우저는 WebM 녹화를 지원하지 않습니다.',true);
    return;
  }

  const width=Number($('#resolution').value)||1080;
  const height=Math.round(width*16/9);
  const sec=$('#duration').value;
  msg(`${width} × ${height} ${format.toUpperCase()} 영상을 만들고 있습니다…`);
  $('#downloadBtn').disabled=true;
  $('#drawEffect').disabled=true;

  let resized=false;
  try{
    C.width=width;
    C.height=height;
    ctx.setTransform(width/406,0,0,height/720,0,0);
    resized=true;
    draw(0);

    const au=await voice().catch(()=>null);
    const canvasStream=C.captureStream(30);
    const stream=new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(au?au.stream.getAudioTracks():[])
    ]);
    const bitrate=width>=2160?35000000:width>=1080?12000000:6000000;
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
    const chunks=[];
    recorder.ondataavailable=event=>event.data.size&&chunks.push(event.data);
    const done=new Promise(resolve=>recorder.onstop=resolve);
    recorder.start(250);
    if(au)au.src.start();
    play();
    await new Promise(resolve=>setTimeout(resolve,ms()+220));
    recorder.stop();
    await done;

    const blob=new Blob(chunks,{type:recorder.mimeType});
    const previousLink=$('#readyDownloadLink');
    if(previousLink)previousLink.remove();
    if(previousDownloadUrl)URL.revokeObjectURL(previousDownloadUrl);
    const link=document.createElement('a');
    previousDownloadUrl=URL.createObjectURL(blob);
    link.id='readyDownloadLink';
    link.href=previousDownloadUrl;
    link.download=`${outputName||`science-sketch-${width}x${height}-${sec}s`}.${format}`;
    link.textContent='완성된 영상 저장하기';
    link.style.cssText='display:block;margin-top:12px;padding:14px;text-align:center;background:#e9544a;color:white;border-radius:9px;font-weight:bold';
    $('#downloadBtn').after(link);
    if(!localSave){
      link.click();
      msg(`${width} × ${height} ${format.toUpperCase()} 영상이 다운로드되었습니다.`);
      return;
    }
    const saveName=outputName||`science-sketch-${width}x${height}-${sec}s`;
    const response=await fetch(`/save-video?project=${encodeURIComponent(projectName)}&name=${encodeURIComponent(saveName+'.'+format)}`,{
      method:'POST',
      headers:{'Content-Type':blob.type},
      body:blob
    });
    if(!response.ok)throw Error(`로컬 저장 서버 오류: ${response.status}`);
    msg(`${width} × ${height} ${format.toUpperCase()} 영상을 작업 폴더에 저장했습니다.`);
  }catch(error){
    msg('영상 저장 실패: '+error.message,true);
  }finally{
    if(resized){
      C.width=406;
      C.height=720;
      ctx.setTransform(1,0,0,1,0,0);
      draw(1);
    }
    $('#downloadBtn').disabled=false;
    $('#drawEffect').disabled=false;
  }
}

download=downloadSelectedFormat;
$('#downloadBtn').onclick=downloadSelectedFormat;
const projectInput=$('#projectName');
projectInput.value=localStorage.getItem('sketch-project-name')||'';
projectInput.addEventListener('input',()=>localStorage.setItem('sketch-project-name',projectInput.value.trim()));
if(!['localhost','127.0.0.1'].includes(location.hostname))projectInput.closest('label').hidden=true;
