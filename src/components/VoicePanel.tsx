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
        {controls.map(([key, label, min, max, step]) => (
          <label key={key}>
            <span>
              {label}
              <b>
                {key === "filter"
                  ? settings.filter + " Hz"
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
              onChange={(e) => change({ ...settings, [key]: +e.target.value })}
            />
          </label>
        ))}
      </ControlGroups>
      <footer>
        {id === "body"
          ? "ДВА ОСЦИЛЛЯТОРА · −7 ЦЕНТОВ · САТУРАЦИЯ"
          : "СИНУС · МЯГКАЯ ОКТАВА · БЕЗ ВИБРАТО"}
      </footer>
    </section>
  );
}
