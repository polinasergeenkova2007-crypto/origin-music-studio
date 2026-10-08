import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "./audio/core/AudioEngine";
import { defaults, type VoiceId, type VoiceSettings } from "./state/types";
import { melodyDefaults, type MelodySettings } from "./state/melody";
import { VoicePanel } from "./components/VoicePanel";
import { MelodyControls } from "./components/MelodyControls";
import { energyAt } from "./composition/dynamics";
import { arrangementAt, sections } from "./composition/afterimage";
import { OutputMeter } from "./components/OutputMeter";
export default function App() {
  const engine = useRef(new AudioEngine());
  const [settings, setSettings] = useState(defaults),
    [melody, setMelody] = useState(melodyDefaults),
    [volume, setVolume] = useState(0.65),
    [playing, setPlaying] = useState(false),
    [ready, setReady] = useState(false),
    [starting, setStarting] = useState(false),
    [error, setError] = useState("");
  const [position, setPosition] = useState(0);
  const [tempoDraft, setTempoDraft] = useState(String(melodyDefaults.bpm));
  const arrangement = arrangementAt(position);
  useEffect(() => {
    if (!playing) {
      setPosition(0);
      return;
    }
    const timer = setInterval(() => setPosition(engine.current.position), 250);
    return () => clearInterval(timer);
  }, [playing]);
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
        setReady(true);
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
      <header>
        <span className="brand">ORIGIN</span>
        <span className="header-label">Музыкальная студия</span>
      </header>
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
        <button className="play" disabled={starting} onClick={play}>
          {playing ? "■ Остановить мелодию" : "▶ Слушать мелодию"}
        </button>
        <button className="stop" onClick={stop}>
          ■ Стоп
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
          Громкость{" "}
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
          <output>{Math.round((volume / 0.8) * 100)}%</output>
        </label>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="composition-card">
        <div>
          <span className="pill">Ре минор</span>
          <span className="pill">16 тактов</span>
          <span className="pill">
            {melody.seed === 17
              ? "Исходная фраза"
              : "Вариация " + (melody.seed - 17)}
          </span>
          <div className="signal-orbit" aria-hidden="true">
            {[12,20,31,18,40,56,34,67,45,30,53,72,48,35,62,40,25,49,36,61,32,18,28,14].map((height,index)=><i key={index} style={{height}} />)}
          </div>
          <h2>Тема, развитие и кульминация</h2>
          <p>
            Электропиано — мелодия. Колокольчики — акценты. BODY — ритм, GHOST —
            второй голос. Бас, стекло и шум добавляют глубину и акценты.
          </p>
        </div>
        <div className="phrase-actions">
          <button
            onClick={() => changeMelody({ ...melody, seed: melody.seed + 1 })}
          >
            Новая вариация ↻
          </button>
          <button
            onClick={async () => {
              try {
                engine.current.updateMelody(melody);
                await engine.current.audition(settings, volume);
                setReady(true);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Один колокольчик
          </button>
          <button
            onClick={async () => {
              try {
                engine.current.updateMelody(melody);
                await engine.current.audition(settings, volume, true);
                setReady(true);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Удар набата
          </button>
        </div>
      </section>
      <section className="arrangement-strip">
        <div className="arrangement-label">
          <strong>{arrangement.section.name}</strong>
          <span>
            Такт {arrangement.bar + 1} / 16 · {arrangement.chord.name}
          </span>
        </div>
        <p>{arrangement.section.description}</p>
        <div className="energy-row">
          <span>Напряжение · {Math.round(energyAt(position) * 100)}%</span>
          <div className="energy-track">
            <div style={{ width: `${energyAt(position) * 100}%` }} />
          </div>
        </div>
        <div className="section-stages">
          {sections.map((section) => (
            <span
              key={section.id}
              className={arrangement.section.id === section.id ? "current" : ""}
            >
              {section.name}
            </span>
          ))}
        </div>
        <div className="part-roles">
          <span>BODY · ритмическая партия</span>
          <span>GHOST · второй голос</span>
          <span>PIANO · главная мелодия</span>
        </div>
      </section>
      <MelodyControls settings={melody} change={changeMelody} />
      <div className="utility-row">
        <OutputMeter engine={engine.current} enabled={ready} />
        <button
          className="reset"
          onClick={() => {
            changeMelody({ ...melodyDefaults });
            setSettings(defaults);
            setVolume(0.65);
            engine.current.setVolume(0.65);
            engine.current.update("body", defaults.body);
            engine.current.update("ghost", defaults.ghost);
          }}
        >
          Вернуть исходное звучание
        </button>
      </div>
      <section className="primary-voices">
        <h2>Два основных синтезатора</h2>
        <p className="section-hint">
          Громкость, фильтр, панорама и форма волны меняют текущий звук. ADSR
          применяется к следующим нотам.
        </p>
        <div className="voices">
          {(["body", "ghost"] as const).map((id) => (
            <div key={id}>
              <div className="layer-switch">
                <button
                  aria-pressed={melody[id] > 0}
                  onClick={() =>
                    changeMelody({ ...melody, [id]: melody[id] > 0 ? 0 : 1 })
                  }
                >
                  {id.toUpperCase()} · {melody[id] > 0 ? "Включён" : "Выключен"}
                </button>
                <button
                  onClick={() =>
                    changeMelody({
                      ...melody,
                      body: 0,
                      ghost: 0,
                      chime: 0,
                      bass: 0,
                      glass: 0,
                      noise: 0,
                      pad: 0,
                      pluck: 0,
                      machine: 0,
                      bow: 0,
                      piano: 0,
                      tower: 0,
                      beat: 0,
                      [id]: 1,
                    })
                  }
                >
                  Слушать отдельно {id.toUpperCase()}
                </button>
              </div>
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
        <div className="macro-grid">
          {(
            [
              {
                key: "beat",
                name: "Тяжёлый бит",
                description: "Глубокая бочка, резкий снейр и яркие хай-хэты",
              },
              {
                key: "tower",
                name: "Большой колокол · набат",
                description:
                  "Тяжёлый удар и долгий низкий гул на границах фраз",
              },
              {
                key: "piano",
                name: "Войлочное электропиано",
                description: "Мягкая основная тема с округлой атакой",
              },
              {
                key: "bow",
                name: "Смычковое стекло",
                description: "Тёплый протяжный ответ между переливами",
              },
              {
                key: "chime",
                name: "Колокольчики",
                description: "Редкие мягкие акценты над основной темой",
              },
              {
                key: "bass",
                name: "Глубокий бас",
                description: "Синусовый саб с мягким верхним тоном",
              },
              {
                key: "glass",
                name: "Стеклянные частицы",
                description: "Редкие высокие вспышки в стерео",
              },
              {
                key: "noise",
                name: "Шумовой воздух",
                description: "Плавные фильтрованные шумовые волны",
              },
              {
                key: "pad",
                name: "Тёплый pad",
                description: "Мягкое стереофоническое облако под темой",
              },
              {
                key: "pluck",
                name: "Деревянный pluck",
                description: "Короткие округлые ноты между фразами",
              },
              {
                key: "machine",
                name: "Механические щелчки",
                description: "Тихие стуки и цифровые акценты",
              },
            ] as const
          ).map((layer) => (
            <label key={layer.key}>
              <div className="control-title">
                <span>{layer.name}</span>
                <output>{Math.round(melody[layer.key] * 100)}%</output>
              </div>
              <input
                type="range"
                aria-label={layer.name}
                min={0}
                max={1}
                step={0.01}
                value={melody[layer.key]}
                onChange={(e) =>
                  changeMelody({ ...melody, [layer.key]: +e.target.value })
                }
              />
              <small>{layer.description}</small>
            </label>
          ))}
        </div>
        <button
          className="all-layers"
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
          Включить все слои
        </button>
      </section>
      <footer className="page-footer">
        <span>Оригинальная мелодия · атмосферные колокольчики</span>
        <span>Esc — остановить</span>
      </footer>
    </main>
  );
}
