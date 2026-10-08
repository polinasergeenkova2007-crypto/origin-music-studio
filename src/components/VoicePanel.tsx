import { Knob } from "./Knob";
import { ControlGroups } from "./ControlGroups";
import type { VoiceSettings, VoiceId } from "../state/types";
const controls: [keyof VoiceSettings, string, number, number, number][] = [
  ["volume", "Громкость", 0, 1, 0.01],
  ["filter", "Фильтр", 80, 10000, 10],
  ["resonance", "Резонанс", 0.1, 8, 0.1],
  ["pan", "Панорама", -1, 1, 0.01],
  ["attack", "Атака", 0.005, 3, 0.005],
  ["decay", "Спад", 0.01, 3, 0.01],
  ["sustain", "Удержание", 0, 1, 0.01],
  ["release", "Затухание", 0.02, 5, 0.01],
];
export function VoicePanel({
  id,
  settings,
  change,
}: {
  id: VoiceId;
  settings: VoiceSettings;
  change: (s: VoiceSettings) => void;
}) {
  return (
    <section className={"voice " + id}>
      <div className="voice-heading">
        <span className="index">{id === "body" ? "01" : "02"}</span>
        <div>
          <h2>{id.toUpperCase()}</h2>
          <p>
            {id === "body"
              ? "Низкий, тёплый голос."
              : "Мягкий синусовый голос без дрейфа."}
          </p>
        </div>
        <span className="tag">
          {id === "body" ? "ДВА ГОЛОСА" : "МЯГКИЙ СИНУС"}
        </span>
      </div>
      <ControlGroups
        titles={[
          "Уровень и фильтр",
          "Резонанс и панорама",
          "Атака и спад",
          "Удержание и затухание",
        ]}
      >
        {controls.map(([key, label, min, max, step]) => {
          const name = id + " " + label.toLowerCase();
          const value = settings[key] as number;
          const update = (next: number) =>
            change({ ...settings, [key]: Math.max(min, Math.min(max, next)) });
          if (key === "attack" || key === "decay")
            return (
              <div className="envelope-knob" key={key}>
                <Knob
                  label={name}
                  hideLabel
                  value={value}
                  min={min}
                  max={max}
                  step={step}
                  displayValue={value.toFixed(2)}
                  onChange={update}
                />
              </div>
            );
          if (key === "sustain")
            return (
              <div className="segment-control" key={key}>
                <output>{Math.round(value * 100)}</output>
                <div className="segment-scale" role="group" aria-label={name}>
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={name + " " + i * 10 + "%"}
                      aria-pressed={Math.round(value * 10) === i}
                      className={i <= value * 10 ? "lit" : ""}
                      onClick={() => update(i / 10)}
                    />
                  ))}
                </div>
              </div>
            );
          if (key === "release")
            return (
              <div className="step-control" key={key}>
                <input
                  aria-label={name}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={Number(value.toFixed(2))}
                  onChange={(e) => {
                    if (
                      e.target.value !== "" &&
                      Number.isFinite(e.target.valueAsNumber)
                    )
                      update(e.target.valueAsNumber);
                  }}
                />
                <span className="step-buttons">
                  <button
                    type="button"
                    aria-label={name + " уменьшить"}
                    onClick={() => update(Number((value - 0.1).toFixed(2)))}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label={name + " увеличить"}
                    onClick={() => update(Number((value + 0.1).toFixed(2)))}
                  >
                    +
                  </button>
                </span>
                <small>с</small>
              </div>
            );
          return (
            <label key={key}>
              <span>
                <span className="sr-only">{label}</span>
                <b>
                  {key === "filter"
                    ? settings.filter
                    : typeof settings[key] === "number"
                      ? (settings[key] as number).toFixed(2)
                      : ""}
                </b>
              </span>
              <input
                aria-label={id + " " + label.toLowerCase()}
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={(e) =>
                  change({ ...settings, [key]: +e.target.value })
                }
              />
            </label>
          );
        })}
      </ControlGroups>
      <div className="wave-buttons" role="group" aria-label={id+" форма волны"}>
        {([{value:"sine",name:"Синус",icon:"∿"},{value:"triangle",name:"Треугольник",icon:"△"},{value:"sawtooth",name:"Пила",icon:"⋰"},{value:"square",name:"Прямоугольник",icon:"⊓"}] as const).map(w=><button key={w.value} aria-label={id+" "+w.name} aria-pressed={settings.waveform===w.value} onClick={()=>change({...settings,waveform:w.value})}><span aria-hidden="true">{w.icon}</span></button>)}
      </div>
      <footer>
        {id === "body"
          ? "ДВА ОСЦИЛЛЯТОРА · −7 ЦЕНТОВ · САТУРАЦИЯ"
          : "СИНУС · МЯГКАЯ ОКТАВА · БЕЗ ВИБРАТО"}
      </footer>
    </section>
  );
}
