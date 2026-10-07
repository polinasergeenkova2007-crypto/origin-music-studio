import { useEffect, useRef } from "react";
import type { AudioEngine } from "../audio/core/AudioEngine";
export function OutputMeter({
  engine,
  enabled,
}: {
  engine: AudioEngine;
  enabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const data = new Uint8Array(256);
    const draw = () => {
      const analyser = engine.analyser;
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        let square = 0;
        for (const value of data) square += ((value - 128) / 128) ** 2;
        const rms = Math.sqrt(square / data.length);
        if (ref.current) {
          ref.current.style.width = Math.min(100, rms * 800) + "%";
          ref.current.parentElement?.setAttribute(
            "aria-valuenow",
            String(Math.round(rms * 100)),
          );
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [engine, enabled]);
  return (
    <div className="meter-row">
      <span>Уровень звука</span>
      <div
        className="meter"
        role="meter"
        aria-label="Уровень реального аудиосигнала"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div ref={ref} />
      </div>
    </div>
  );
}
