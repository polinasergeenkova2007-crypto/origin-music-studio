import { ControlGroups } from "./ControlGroups";
import type { MelodySettings } from "../state/melody";
const controls: {
  key: keyof MelodySettings;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "density",
    label: "Плотность",
    description: "Добавляет украшения внутри фраз, сохраняя паузы",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "softness",
    label: "Мягкость",
    description: "Приглушает атаку и высокие частоты",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "space",
    label: "Пространство",
    description: "Длинное отражение колокольчиков",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "echo",
    label: "Эхо",
    description: "Тихие повторы в ритме мелодии",
    min: 0,
    max: 1,
    step: 0.01,
  },
];
export function MelodyControls({
  settings,
  change,
}: {
  settings: MelodySettings;
  change: (s: MelodySettings) => void;
}) {
  return (
    <section className="melody-panel">
      <h2>Характер звучания</h2>
      <ControlGroups titles={["Рисунок и мягкость", "Пространство и эхо"]}>
        {controls.map((c) => (
          <label key={c.key}>
            <div className="control-title">
              <span className="sr-only">{c.label}</span>
              <output>
                {c.key === "tail"
                  ? settings[c.key].toFixed(1) + " с"
                  : Math.round(settings[c.key] * 100) + "%"}
              </output>
            </div>
            <input
              aria-label={c.label}
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={settings[c.key]}
              onChange={(e) =>
                change({ ...settings, [c.key]: +e.target.value })
              }
            />
            <small>{c.description}</small>
          </label>
        ))}
      </ControlGroups>
    </section>
  );
}
