import { ReverseMetalSynth } from "../src/audio/modules/ReverseMetalSynth";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
import { melodyDefaults } from "../src/state/melody";
const lines:string[]=[];function check(ok:boolean,name:string){if(!ok)throw Error(name);lines.push("PASS "+name);}
function rms(b:AudioBuffer,a:number,z:number){const d=b.getChannelData(0);let sum=0;for(let i=Math.floor(a*b.sampleRate);i<z*b.sampleRate;i++)sum+=d[i]*d[i];return Math.sqrt(sum/((z-a)*b.sampleRate));}
async function render(action="") {const c=new OfflineAudioContext(2,44100*4,44100),v=new ReverseMetalSynth(c,c.destination);v.play(.02,1);if(action){const pause=c.suspend(.5),out=c.startRendering();await pause;if(action==="stop")v.stop();else v.setVolume(0);await c.resume();return {b:await out,v};}return {b:await c.startRendering(),v};}
(async()=>{const full=await render(),mute=await render("mute"),stop=await render("stop");
check(rms(full.b,.8,.95)>rms(full.b,.1,.3)*10,"Breath grows toward the strike");
check(rms(full.b,1.03,1.13)>.02,"Metallic impact is audible");
check(rms(mute.b,.8,.95)<rms(full.b,.8,.95)*.01,"Live volume silences the swell");
check(rms(stop.b,.8,.95)<.000001,"STOP cancels swell and scheduled impact");
check(full.v.activeCount===0,"Sources clean up");
const times:number[]=[];const seq=new Sequencer(()=>melodyDefaults,{body:()=>{},ghost:()=>{},chime:()=>{},reverse:t=>times.push(t)});for(let s=0;s<256;s++)seq.schedule(s,s);
check(times.length===2&&times[0]===120&&times[1]===188,"Only two transition accents occur");
document.querySelector("#results")!.textContent=lines.join("\n")+"\nCOMPLETE";
})().catch(e=>document.querySelector("#results")!.textContent=lines.join("\n")+"\nFAIL "+e);
