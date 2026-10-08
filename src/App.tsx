import { InstrumentControl } from "./components/InstrumentControl";
import { ControlGroups } from "./components/ControlGroups";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "./audio/core/AudioEngine";
import { defaults, type VoiceId, type VoiceSettings } from "./state/types";
import { melodyDefaults, type MelodySettings } from "./state/melody";
import { VoicePanel } from "./components/VoicePanel";
import { MelodyControls } from "./components/MelodyControls";
export default function App() {
  const engine = useRef(new AudioEngine());
  const [settings, setSettings] = useState(defaults),
    [melody, setMelody] = useState(melodyDefaults),
    [volume, setVolume] = useState(0.65),
    [playing, setPlaying] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState("");
  const [tempoDraft, setTempoDraft] = useState(String(melodyDefaults.bpm));
  const action = useRef(0);
  const stop = useCallback(() => {
    action.current++;
    engine.current.stop();
    setStarting(false);
    setPlaying(false);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", key);
    const current = engine.current;
    return () => {
      window.removeEventListener("keydown", key);
      void current.dispose();
    };
  }, [stop]);
  const play = async () => {
    if (playing) {
      stop();
      return;
    }
    const token = ++action.current;
    setStarting(true);
    setError("");
    try {
      await engine.current.play(settings, volume, melody);
      if (token === action.current) {
        setPlaying(true);
      }
    } catch (e) {
      if (token === action.current)
        setError("Не удалось включить звук: " + String(e));
    } finally {
      if (token === action.current) setStarting(false);
    }
  };
  const changeMelody = (s: MelodySettings) => {
    setMelody(s);
    setTempoDraft(String(s.bpm));
    engine.current.updateMelody(s);
  };
  const change = (id: VoiceId, s: VoiceSettings) => {
    setSettings((old) => ({ ...old, [id]: s }));
    engine.current.update(id, s);
  };
  return (
    <main>
      <section className="intro">
        <div>
          <p className="eyebrow">ЭЛЕКТРОННЫЙ СИНТЕЗАТОР</p>
          <h1>AFTERIMAGE</h1>
          <p className="description">
            Мягкое электропиано ведёт тему, колокольчики и два синтезатора
            создают движение.
            <br />
            Нажмите «Слушать» — мелодия начнёт играть сама.
          </p>
        </div>
        <span className={"status " + (playing ? "online" : "")}>
          {starting
            ? "Включаем звук…"
            : playing
              ? "Мелодия играет"
              : "Готово к воспроизведению"}
        </span>
      </section>
      <section className="transport">
        <button className="play" aria-label={playing ? "Остановить мелодию" : "Слушать мелодию"} disabled={starting} onClick={play}>
          {playing ? "■" : "▶"}
        </button>
        <button className="stop" aria-label="Стоп" onClick={stop}>
          ■
        </button>
        <label className="tempo">
          Темп{" "}
          <input
            aria-label="Темп"
            type="number"
            min={55}
            max={130}
            value={tempoDraft}
            onChange={(e) => {
              setTempoDraft(e.target.value);
              const value = Number(e.target.value);
              if (
                e.target.value !== "" &&
                Number.isFinite(value) &&
                value >= 55 &&
                value <= 130
              )
                changeMelody({
                  ...melody,
                  bpm: Math.max(55, Math.min(130, value)),
                });
            }}
            onBlur={() => {
              const value = Number(tempoDraft);
              changeMelody({
                ...melody,
                bpm:
                  tempoDraft === "" || !Number.isFinite(value)
                    ? melody.bpm
                    : Math.max(55, Math.min(130, value)),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span>BPM</span>
        </label>
        <label className="master-volume">
          <span className="sr-only">Громкость</span>{" "}
          <input
            aria-label="Общая громкость"
            type="range"
            min={0}
            max={0.8}
            step={0.01}
            value={volume}
            onChange={(e) => {
              setVolume(+e.target.value);
              engine.current.setVolume(+e.target.value);
            }}
          />
          <output>{Math.round((volume / 0.8) * 100)}</output>
        </label>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <MelodyControls settings={melody} change={changeMelody} />
      <section className="primary-voices">
        <h2>Два основных синтезатора</h2>
        <p className="section-hint">
          Громкость, фильтр, панорама меняют текущий звук. ADSR применяется к
          следующим нотам.
        </p>
        <div className="voices">
          {(["body", "ghost"] as const).map((id) => (
            <div key={id}>
              <VoicePanel
                id={id}
                settings={settings[id]}
                change={(s) => change(id, s)}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="melody-panel instrument-panel">
        <h2>Бас и дополнительные звуки</h2>
        <ControlGroups
          size={3}
          titles={["Ритм и основная тема", "Звон и глубина"]}
        >
          {(
            [
              {
                key: "beat",
                name: "Тяжёлый бит",
                description: "Глубокая бочка, резкий снейр и яркие хай-хэты",
              },
              {
                key: "piano",
                name: "Войлочное электропиано",
                description: "Мягкая основная тема с округлой атакой",
              },
              {
                key: "bass",
                name: "Глубокий бас",
                description: "Синусовый саб с мягким верхним тоном",
              },
              {
                key: "tower",
                name: "Большой колокол · набат",
                description:
                  "Тяжёлый удар и долгий низкий гул на границах фраз",
              },
              {
                key: "chime",
                name: "Колокольчики",
                description: "Редкие мягкие акценты над основной темой",
              },
              {
                key: "bow",
                name: "Смычковое стекло",
                description: "Тёплый протяжный ответ между переливами",
              },
            ] as const
          ).map((layer) => (
            <InstrumentControl
              kind={layer.key === "beat" || layer.key === "piano" ? "bar" : layer.key === "bass" || layer.key === "chime" ? "segments" : "step"}
              key={layer.key}
              label={layer.name}
              value={melody[layer.key]}
              onChange={(value) =>
                changeMelody({ ...melody, [layer.key]: value })
              }
            />
          ))}
        </ControlGroups>
        <div className="extra-sounds" role="group" aria-label="Дополнительные звуки">
          {([{key:"pad",name:"Тёплый pad",icon:"☁"},{key:"noise",name:"Шумовой воздух",icon:"≋"},{key:"glass",name:"Стеклянные частицы",icon:"✧"},{key:"pluck",name:"Деревянный pluck",icon:"⌁"},{key:"machine",name:"Механические щелчки",icon:"⋮"}] as const).map(layer=><button key={layer.key} className={"sound-pad sound-"+layer.key} aria-label={layer.name} aria-pressed={melody[layer.key]>0} onClick={()=>changeMelody({...melody,[layer.key]:melody[layer.key]>0?0:melodyDefaults[layer.key]})}><span aria-hidden="true">{layer.icon}</span><i/></button>)}
        </div>
        <button
          className="all-layers"
          aria-label="Включить все слои"
          onClick={() =>
            changeMelody({
              ...melody,
              body: 1,
              ghost: 1,
              chime: melodyDefaults.chime,
              bass: melodyDefaults.bass,
              glass: melodyDefaults.glass,
              noise: melodyDefaults.noise,
              pad: melodyDefaults.pad,
              pluck: melodyDefaults.pluck,
              machine: melodyDefaults.machine,
              bow: melodyDefaults.bow,
              piano: melodyDefaults.piano,
              tower: melodyDefaults.tower,
              beat: melodyDefaults.beat,
            })
          }
        >
          ⊕
        </button>
      </section>
    </main>
  );
}
