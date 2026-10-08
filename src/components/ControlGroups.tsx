import { Children, type ReactNode } from "react";
export function ControlGroups({children,size=2,titles}:{children:ReactNode;size?:number;titles:string[]}) {
 const controls=Children.toArray(children);
 return <div className="control-groups">{Array.from({length:Math.ceil(controls.length/size)},(_,index)=><fieldset className="control-group" key={index}><legend>{titles[index] || "Уровни"}</legend><div className="group-controls">{controls.slice(index*size,(index+1)*size)}</div></fieldset>)}</div>;
}
