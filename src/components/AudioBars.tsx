import { useEffect, useRef } from "react";
import type { AudioEngine } from "../audio/core/AudioEngine";
export function AudioBars({engine,playing}:{engine:AudioEngine;playing:boolean}) {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const bars=Array.from(ref.current?.children??[]) as HTMLElement[];
  if(!playing){bars.forEach(bar=>bar.style.height="5px");return;}
  let frame=0; const data=new Uint8Array(engine.analyser?.frequencyBinCount??256);
  const draw=()=>{const analyser=engine.analyser;if(analyser){analyser.getByteFrequencyData(data);bars.forEach((bar,i)=>{const start=Math.floor(i*data.length/3/bars.length),end=Math.max(start+1,Math.floor((i+1)*data.length/3/bars.length));let sum=0;for(let j=start;j<end;j++)sum+=data[j];bar.style.height=(5+sum/(end-start)/255*55)+"px";});}frame=requestAnimationFrame(draw);};draw();return()=>cancelAnimationFrame(frame);
 },[engine,playing]);
 return <div className="audio-bars" ref={ref} aria-label={playing?"Визуализация звучащей музыки":"Музыка остановлена"} role="img">{Array.from({length:24},(_,i)=><i key={i}/>)}</div>;
}
