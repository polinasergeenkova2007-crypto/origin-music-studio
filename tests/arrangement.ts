import { BowedGlassSynth } from "../src/audio/modules/BowedGlassSynth";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
import { melodyDefaults } from "../src/state/melody";
import { defaults } from "../src/state/types";
import { BodyVoice } from "../src/audio/voices/BodyVoice";
import { GhostVoice } from "../src/audio/voices/GhostVoice";
import { BassSynth } from "../src/audio/modules/BassSynth";
import { NoiseSynth } from "../src/audio/modules/NoiseSynth";
import { ChimeSynth } from "../src/audio/modules/ChimeSynth";
import { MasterBus } from "../src/audio/core/MasterBus";
const lines: string[] = [];
const check = (ok: boolean, label: string) => {
  lines.push(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) throw Error(label);
};
try {
  const tick = 60 / melodyDefaults.bpm / 4,
    events: { role: string; note: number; time: number }[] = [];
  const add = (role: string) => (note: number, time: number) =>
    events.push({ role, note, time });
  const score = new Sequencer(() => melodyDefaults, {
    body: add("body"),
    ghost: add("ghost"),
    chime: add("chime"),
    bass: add("bass"),
    bow: add("bow"),
    glass: add("glass"),
    noise: (t) => events.push({ role: "noise", note: 0, time: t }),
  });
  for (let step = 0; step < 256; step++) score.schedule(step, step * tick);
  const bells = events.filter((e) => e.role === "chime");
  check(
    bells.length >= 112,
    "Bell melody has at least seven scored notes per bar",
  );
  check(bells[0].time === 0, "Bell theme starts immediately");
  check(
    bells.every(
      (e, i) => i === 0 || e.time - bells[i - 1].time <= tick * 4 + 0.001,
    ),
    "No long gaps in the bell theme",
  );
  check(
    events
      .filter((e) => e.role !== "noise")
      .every((e) => [0, 2, 4, 5, 7, 9, 10].includes(e.note % 12)),
    "All pitched layers stay in D natural minor",
  );
  check(
    new Set(events.map((e) => e.role)).size === 7,
    "Seven instrument layers take part in the composition",
  );
  check(
    events
      .filter((e) => e.role === "body")
      .every(
        (e) =>
          !events.some(
            (n) => n.role === "ghost" && Math.abs(n.time - e.time) < 0.001,
          ),
      ),
    "Main synth attacks interlock rather than doubling each other",
  );
  const ctx = new OfflineAudioContext(
      2,
      Math.ceil((256 * tick + 8) * 44100),
      44100,
    ),
    bus = new MasterBus(ctx as unknown as AudioContext),
    body = new BodyVoice(
      ctx as unknown as AudioContext,
      bus.input,
      defaults.body,
    ),
    ghost = new GhostVoice(
      ctx as unknown as AudioContext,
      bus.input,
      defaults.ghost,
    ),
    bass = new BassSynth(ctx as unknown as AudioContext, bus.input, {
      ...defaults.body,
      filter: 250,
      volume: melodyDefaults.bass,
      pan: 0,
    }),
    chime = new ChimeSynth(ctx, bus.input, melodyDefaults),
    glass = new ChimeSynth(ctx, bus.input, {
      ...melodyDefaults,
      tail: 1.2,
      softness: 0.4,
      space: 0.8,
      echo: 0.12,
    }),
    noise = new NoiseSynth(ctx, bus.input),
    bow = new BowedGlassSynth(ctx as unknown as AudioContext, bus.input, {
      ...defaults.ghost,
      attack: 0.18,
      decay: 0.3,
      sustain: 0.6,
      release: 1.1,
      filter: 1800,
      volume: melodyDefaults.bow,
      pan: -0.25,
    });
  chime.output.gain.value = 0.72 * melodyDefaults.chime;
  glass.output.gain.value = 0.72 * melodyDefaults.glass;
  noise.setVolume(melodyDefaults.noise);
  const real = new Sequencer(() => melodyDefaults, {
    tone: (energy, time) => {
      body.filter.frequency.setTargetAtTime(
        defaults.body.filter * (0.6 + energy * 0.8),
        time,
        0.12,
      );
      ghost.filter.frequency.setTargetAtTime(
        defaults.ghost.filter * (0.6 + energy * 0.8),
        time,
        0.12,
      );
      chime.setColor(
        melodyDefaults.softness + 0.08 - energy * 0.16,
        melodyDefaults.shimmer * (0.55 + energy * 0.75),
      );
    },
    body: (n, t, d, v, r) => body.play(n, t, d, v, r),
    ghost: (n, t, d, v, r) => ghost.play(n, t, d, v, r),
    bass: (n, t, d, v) => bass.play(n, t, d, v),
    chime: (n, t, v, p) => chime.play(n, t, v, p),
    glass: (n, t, v, p) => glass.play(n, t, v, p),
    noise: (t, d) => noise.play(t, d),
    bow: (n, t, d, v) => bow.play(n, t, d, v),
  });
  for (let step = 0; step < 256; step++) real.schedule(step, 0.1 + step * tick);
  const audio = await ctx.startRendering(),
    data = audio.getChannelData(0);
  let peak = 0;
  for (const x of data) peak = Math.max(peak, Math.abs(x));
  const rms = (start: number, end: number) => {
    let sum = 0;
    for (let i = start; i < end; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / (end - start));
  };
  const section = (first: number, last: number) =>
    rms(
      Math.floor((0.1 + first * 16 * tick) * 44100),
      Math.floor((0.1 + last * 16 * tick) * 44100),
    );
  check(section(0, 4) > 0.003, "Introduction is audible from the beginning");
  check(
    section(8, 12) > section(0, 4) * 1.12,
    "Peak is audibly stronger than the introduction",
  );
  check(
    section(12, 16) < section(8, 12) * 0.95,
    "Return has a real drop in audio energy",
  );
  check(peak < 0.8, "Dense composition keeps output headroom");
  check(
    body.activeCount +
      ghost.activeCount +
      bass.activeCount +
      chime.activeCount +
      glass.activeCount +
      noise.activeCount +
      bow.activeCount ===
      0,
    "All oscillators and buffers clean up",
  );
  lines.push("COMPLETE");
} catch (e) {
  lines.push(String(e));
}
document.querySelector("#results")!.textContent = lines.join("\n");
