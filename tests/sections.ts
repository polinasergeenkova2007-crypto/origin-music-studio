import { Sequencer, type Instruments } from "../src/audio/sequencing/Sequencer";
import { melodyDefaults } from "../src/state/melody";
const events:{role:string,step:number}[]=[];
const instruments:Record<string,Function>={};
for(const role of ["piano","chime","body","ghost","bass","glass","noise","pad","bow","pluck","machine","tower","beat"]) instruments[role]=(...args:number[])=>events.push({role,step:args[role==="beat"?1:role==="machine"||role==="noise"?0:1]});
const seq=new Sequencer(()=>melodyDefaults,instruments as unknown as Instruments);
for(let step=0;step<256;step++)seq.schedule(step,step);
const lines:string[]=[];function check(ok:boolean,name:string){if(!ok)throw Error(name);lines.push("PASS "+name);}
function roles(bar:number){return new Set(events.filter(e=>Math.floor(e.step/16)===bar).map(e=>e.role));}
try{
 check([...roles(0)].every(r=>["piano","chime"].includes(r))&&roles(0).size===2,"Opening uses only theme and bells");
 check(roles(1).has("pad")&&!roles(0).has("pad"),"Pad enters in second bar");
 check(roles(2).has("bass")&&!roles(1).has("bass"),"Bass enters after pad");
 check(!roles(2).has("beat")&&roles(3).has("beat"),"Beat enters progressively");
 check(roles(4).has("ghost")&&!roles(3).has("ghost"),"Second synth enters later");
 check(!roles(5).has("ghost")&&roles(5).has("bow"),"Bowed voice answers while second synth rests");
 check(!events.some(e=>e.step>=120&&e.step<128&&["beat","bass","body","machine"].includes(e.role)),"Half-bar rhythmic break before climax");
 check(roles(8).size>roles(0).size+4,"Climax has broader instrumentation");
 check(!roles(10).has("body")&&roles(10).has("ghost"),"BODY rests while GHOST carries dialogue");
 check([12,13,14,15].every(b=>!roles(b).has("beat")),"Ending removes heavy beat");
 check(roles(15).size<roles(8).size,"Ending thins to theme and accents");
 document.querySelector("#results")!.textContent=lines.join("\n")+"\nCOMPLETE";
}catch(e){document.querySelector("#results")!.textContent=lines.join("\n")+"\nFAIL "+e;}
