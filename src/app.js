import { AudioEngine } from "./audio/core/AudioEngine.js";
import { defaults } from "./state/types.js";
import { melodyDefaults } from "./state/melody.js";

const engine = new AudioEngine();
const voices = structuredClone(defaults);
const melody = { ...melodyDefaults };
let volume = 0.65,
  playing = false,
  generation = 0;
const playButton = document.querySelector(".play");
const error = document.querySelector(".error");
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const named = (name) =>
  [...document.querySelectorAll("[aria-label]")].find(
    (e) => e.getAttribute("aria-label") === name,
  );
function syncPlay() {
  playButton.textContent = playing ? "■" : "▶";
  playButton.setAttribute(
    "aria-label",
    playing ? "Остановить мелодию" : "Слушать мелодию",
  );
}
function stop() {
  generation++;
  engine.stop();
  playing = false;
  playButton.disabled = false;
  syncPlay();
}
playButton.addEventListener("click", async () => {
  if (playing) return stop();
  const token = ++generation;
  playButton.disabled = true;
  error.hidden = true;
  try {
    await engine.play(voices, volume, melody);
    if (token === generation) {
      playing = true;
      syncPlay();
    }
  } catch (e) {
    if (token === generation) {
      error.textContent = "Не удалось включить звук: " + e;
      error.hidden = false;
    }
  } finally {
    if (token === generation) playButton.disabled = false;
  }
});
document.querySelector(".stop").addEventListener("click", stop);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") stop();
});
window.addEventListener("pagehide", () => {
  stop();
  void engine.dispose();
});
function changeMelody(key, value) {
  melody[key] = value;
  engine.updateMelody({ ...melody });
}
function changeVoice(id, key, value) {
  voices[id][key] = value;
  engine.update(id, { ...voices[id] });
}
function range(name, value, format, update) {
  const input = named(name),
    output = input.closest("label").querySelector("output,b");
  const sync = () => {
    output.textContent = format(Number(input.value));
    if (input.closest(".color-bar"))
      input.style.backgroundSize = `${Number(input.value) * 100}% 100%`;
  };
  input.value = value;
  sync();
  input.addEventListener("input", () => {
    sync();
    update(input.valueAsNumber);
  });
  return (v) => {
    input.value = v;
    sync();
  };
}
range(
  "Общая громкость",
  volume,
  (v) => Math.round((v / 0.8) * 100),
  (v) => {
    volume = v;
    engine.setVolume(v);
  },
);
const tempo = named("Темп");
tempo.addEventListener("input", () => {
  if (
    tempo.value !== "" &&
    tempo.valueAsNumber >= 55 &&
    tempo.valueAsNumber <= 130
  )
    changeMelody("bpm", tempo.valueAsNumber);
});
tempo.addEventListener("blur", () => {
  const v =
    tempo.value === "" || !Number.isFinite(tempo.valueAsNumber)
      ? melody.bpm
      : clamp(tempo.valueAsNumber, 55, 130);
  tempo.value = v;
  changeMelody("bpm", v);
});
tempo.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tempo.blur();
});
for (const [key, name] of [
  ["density", "Плотность"],
  ["softness", "Мягкость"],
  ["space", "Пространство"],
  ["echo", "Эхо"],
])
  range(
    name,
    melody[key],
    (v) => Math.round(v * 100),
    (v) => changeMelody(key, v),
  );
function segments(name, value, update) {
  const group = named(name),
    output = group.parentElement.querySelector("output");
  const buttons = [...group.querySelectorAll("button")];
  const sync = (v) => {
    output.textContent = Math.round(v * 100);
    buttons.forEach((b, i) => {
      b.classList.toggle("lit", i <= v * 10);
      b.setAttribute("aria-pressed", Math.round(v * 10) === i);
    });
  };
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      sync(i / 10);
      update(i / 10);
    }),
  );
  sync(value);
  return sync;
}
function stepper(name, value, scale, increment, update) {
  const input = named(name),
    min = Number(input.min) / scale,
    max = Number(input.max) / scale;
  const sync = (v) => (input.value = Number((v * scale).toFixed(2)));
  const set = (v) => {
    if (!Number.isFinite(v)) return;
    v = clamp(Number(v.toFixed(3)), min, max);
    sync(v);
    update(v);
  };
  input.addEventListener("input", () => {
    if (input.value !== "") set(input.valueAsNumber / scale);
  });
  input.addEventListener("blur", () => {
    if (input.value === "") sync(value);
  });
  for (const [suffix, sign] of [
    ["уменьшить", -1],
    ["увеличить", 1],
  ])
    named(name + " " + suffix).addEventListener("click", () =>
      set(Number(input.value) / scale + sign * increment),
    );
  sync(value);
  return sync;
}
function knob(name, value, step, update) {
  const button = named(name),
    container = button.closest(".knob-control"),
    output = container.querySelector("output");
  const min = Number(button.getAttribute("aria-valuemin")),
    max = Number(button.getAttribute("aria-valuemax"));
  let current = value,
    drag;
  const sync = (v) => {
    current = v;
    const ratio = (v - min) / (max - min),
      angle = -135 + ratio * 270;
    button.setAttribute("aria-valuenow", v);
    button.style.transform = `rotate(${angle}deg)`;
    container.style.setProperty("--knob-angle", `${angle}deg`);
    output.textContent = v.toFixed(2);
    container
      .querySelectorAll("rect")
      .forEach((r, i) =>
        r.setAttribute("fill", i / 15 <= ratio ? "#ef9995" : "#edbab5"),
      );
  };
  const set = (v) => {
    v = clamp(Number((Math.round(v / step) * step).toFixed(3)), min, max);
    sync(v);
    update(v);
  };
  button.addEventListener("pointerdown", (e) => {
    drag = { y: e.clientY, value: current };
    button.setPointerCapture(e.pointerId);
  });
  button.addEventListener("pointermove", (e) => {
    if (drag) set(drag.value + ((drag.y - e.clientY) / 120) * (max - min));
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(event, () => {
      drag = null;
    });
  button.addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowUp",
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    set(
      e.key === "Home"
        ? min
        : e.key === "End"
          ? max
          : current +
            (["ArrowUp", "ArrowRight"].includes(e.key) ? step : -step),
    );
  });
  sync(value);
}
for (const id of ["body", "ghost"]) {
  for (const [key, name] of [
    ["volume", "громкость"],
    ["filter", "фильтр"],
    ["resonance", "резонанс"],
    ["pan", "панорама"],
  ])
    range(
      id + " " + name,
      voices[id][key],
      (v) => (key === "filter" ? v : v.toFixed(2)),
      (v) => changeVoice(id, key, v),
    );
  knob(id + " атака", voices[id].attack, 0.005, (v) =>
    changeVoice(id, "attack", v),
  );
  knob(id + " спад", voices[id].decay, 0.01, (v) =>
    changeVoice(id, "decay", v),
  );
  segments(id + " удержание", voices[id].sustain, (v) =>
    changeVoice(id, "sustain", v),
  );
  stepper(id + " затухание", voices[id].release, 1, 0.1, (v) =>
    changeVoice(id, "release", v),
  );
  const waves = [
    ["sine", "Синус"],
    ["triangle", "Треугольник"],
    ["sawtooth", "Пила"],
    ["square", "Прямоугольник"],
  ];
  for (const [wave, name] of waves)
    named(id + " " + name).addEventListener("click", () => {
      changeVoice(id, "waveform", wave);
      for (const [w, n] of waves)
        named(id + " " + n).setAttribute("aria-pressed", wave === w);
    });
}
const syncLayers = {};
for (const [key, name] of [
  ["beat", "Тяжёлый бит"],
  ["piano", "Войлочное электропиано"],
])
  syncLayers[key] = range(
    name,
    melody[key],
    (v) => Math.round(v * 100),
    (v) => changeMelody(key, v),
  );
for (const [key, name] of [
  ["bass", "Глубокий бас"],
  ["chime", "Колокольчики"],
])
  syncLayers[key] = segments(name, melody[key], (v) => changeMelody(key, v));
for (const [key, name] of [
  ["tower", "Большой колокол · набат"],
  ["bow", "Смычковое стекло"],
])
  syncLayers[key] = stepper(name, melody[key], 100, 0.05, (v) =>
    changeMelody(key, v),
  );
const extras = [
  ["pad", "Тёплый pad"],
  ["noise", "Шумовой воздух"],
  ["glass", "Стеклянные частицы"],
  ["pluck", "Деревянный pluck"],
  ["machine", "Механические щелчки"],
];
for (const [key, name] of extras)
  named(name).addEventListener("click", () => {
    changeMelody(key, melody[key] > 0 ? 0 : melodyDefaults[key]);
    named(name).setAttribute("aria-pressed", melody[key] > 0);
  });
document.querySelector(".all-layers").addEventListener("click", () => {
  for (const key of [
    "body",
    "ghost",
    "chime",
    "bass",
    "glass",
    "noise",
    "pad",
    "pluck",
    "machine",
    "bow",
    "piano",
    "tower",
    "beat",
  ])
    melody[key] = melodyDefaults[key];
  engine.updateMelody({ ...melody });
  for (const [key, sync] of Object.entries(syncLayers)) sync(melody[key]);
  for (const [key, name] of extras)
    named(name).setAttribute("aria-pressed", melody[key] > 0);
});
