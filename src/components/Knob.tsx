import { useRef, type CSSProperties } from "react";
export function Knob({
  label,
  displayValue,
  hideLabel = false,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: {
  label: string;
  displayValue?: string;
  hideLabel?: boolean;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const update = (next: number) =>
    onChange(Math.max(min, Math.min(max, Math.round(next / step) * step)));
  return (
    <div className="knob-control" style={{"--knob-angle": `${-135 + ((value-min)/(max-min))*270}deg`} as CSSProperties}>
      <div className="knob-dial" aria-hidden="true"><svg viewBox="0 0 100 100">{Array.from({length:16},(_,i)=>{const angle=(-135+i*18)*Math.PI/180;const x=50+43*Math.sin(angle),y=50-43*Math.cos(angle);return <rect key={i} x={x-5} y={y-3} width="10" height="6" rx=".6" transform={`rotate(${-135+i*18},${x},${y})`} fill={i/15<=(value-min)/(max-min)?"#ef9995":"#deded8"}/>;})}</svg><b>▸</b></div>
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <button
        type="button"
        className="knob"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{
          transform: `rotate(${-135 + ((value - min) / (max - min)) * 270}deg)`,
        }}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, value };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            update(
              drag.current.value +
                ((drag.current.y - e.clientY) / 120) * (max - min),
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (
            [
              "ArrowUp",
              "ArrowRight",
              "ArrowDown",
              "ArrowLeft",
              "Home",
              "End",
            ].includes(e.key)
          ) {
            e.preventDefault();
            update(
              e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : value +
                    (["ArrowUp", "ArrowRight"].includes(e.key) ? step : -step),
            );
          }
        }}
      >
        <i />
      </button>
      <output>
        {displayValue ?? Math.round(((value - min) / (max - min)) * 100)}
      </output>
    </div>
  );
}
