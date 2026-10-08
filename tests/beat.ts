import { BeatSynth } from "../src/audio/modules/BeatSynth";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
import { melodyDefaults } from "../src/state/melody";
const lines:string[]=[];
function check(ok:boolean,name:string){if(!ok)throw Error(name);lines.push("PASS "+name);}
function rms(b:AudioBuffer,a:number,z:number){const d=b.getChannelData(0);let sum=0;for(let i=Math.floor(a*b.sampleRate);i<z*b.sampleRate;i++)sum+=d[i]*d[i];return Math.sqrt(sum/((z-a)*b.sampleRate));}
async function render(kind:"kick"|"snare"|"hat",action=""){
 const c=new OfflineAudioContext(2,44100,44100),beat=new BeatSynth(c,c.destination);beat.setVolume(.72);beat.play(kind,.02,1);
 if(action){const pause=c.suspend(.08),output=c.startRendering();await pause;if(action==="mute")beat.setVolume(0);else beat.stop();await c.resume();return {buffer:await output,beat};}
 return {buffer:await c.startRendering(),beat};
}
(async()=>{
 for(const kind of ["kick","snare","hat"] as const){const {buffer,beat}=await render(kind);check(rms(buffer,.02,.06)>.005,kind+" generates audible signal");check(beat.activeCount===0,kind+" cleans up sources");}
 const full=await render("kick"),muted=await render("kick","mute"),stopped=await render("kick","stop");
 check(rms(muted.buffer,.2,.3)<rms(full.buffer,.2,.3)*.03,"Volume changes a sounding kick");
 check(rms(stopped.buffer,.2,.3)<.000001,"STOP silences sounding drums");
 const events:{kind:string,time:number}[]=[];const seq=new Sequencer(()=>melodyDefaults,{chime:()=>{},body:()=>{},ghost:()=>{},beat:(kind,time)=>events.push({kind,time})});for(let s=0;s<256;s++)seq.schedule(s,s);
 const intro=events.filter(e=>e.time<64),rise=events.filter(e=>e.time>=128&&e.time<192);
 check(rise.length>intro.length,"Climax has denser rhythm");
 check(events.filter(e=>e.kind==="snare"&&e.time<16).every(e=>e.time===4||e.time===12),"Snare follows backbeat");
 document.querySelector("#results")!.textContent=lines.join("\n")+"\nCOMPLETE";
})().catch(e=>document.querySelector("#results")!.textContent=lines.join("\n")+"\nFAIL "+e);
