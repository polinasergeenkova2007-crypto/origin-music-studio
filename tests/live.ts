import { ChimeSynth } from "../src/audio/modules/ChimeSynth";
import { BodyVoice } from "../src/audio/voices/BodyVoice";
import { defaults } from "../src/state/types";
import { melodyDefaults } from "../src/state/melody";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
const lines: string[] = [];
const check = (ok: boolean, label: string) => {
  lines.push(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) throw Error(label);
};
async function render(
  kind: "bell" | "body",
  key: string,
  value: number | string,
  initial: Record<string, number> = {},
) {
  const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
  const bell = new ChimeSynth(ctx, ctx.destination, {
    ...melodyDefaults,
    space: 0,
    echo: 0,
    tail: 3,
    ...initial,
  });
  const body = new BodyVoice(ctx as unknown as AudioContext, ctx.destination, {
    ...defaults.body,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.7,
    release: 0.2,
    ...initial,
  });
  if (kind === "bell") bell.play(74, 0, 0.7, 0);
  else body.play(62, 0, 1, 0.7);
  const paused = ctx.suspend(0.25);
  const running = ctx.startRendering();
  await paused;
  if (kind === "bell")
    bell.update({
      ...melodyDefaults,
      space: 0,
      echo: 0,
      tail: 3,
      ...initial,
      [key]: value,
    });
  else
    body.update({
      ...defaults.body,
      attack: 0.01,
      decay: 0.05,
      sustain: 0.7,
      release: 0.2,
      ...initial,
      [key]: value,
    });
  if (kind === "body") body.play(62, 1.3, 1, 0.7);
  await ctx.resume();
  return running;
}
function energy(b: AudioBuffer, start = 0.35, end = 1, channel = 0) {
  const d = b.getChannelData(channel);
  let sum = 0;
  for (let i = Math.floor(start * 44100); i < end * 44100; i++)
    sum += d[i] * d[i];
  return Math.sqrt(sum / ((end - start) * 44100));
}
function difference(
  a: AudioBuffer,
  b: AudioBuffer,
  first = 15000,
  last = 44000,
) {
  const x = a.getChannelData(0),
    y = b.getChannelData(0);
  let s = 0;
  for (let i = first; i < last; i++) s += (x[i] - y[i]) ** 2;
  return Math.sqrt(s / (last - first));
}
try {
  const normal = await render("bell", "softness", 0.46);
  for (const [key, value] of [
    ["softness", 1],
    ["shimmer", 0],
    ["space", 1],
    ["echo", 1],
    ["tail", 0.8],
  ] as const) {
    const changed = await render("bell", key, value);
    check(
      difference(normal, changed) > 1e-5,
      `${key} changes an already ringing bell`,
    );
  }
  const short = await render("bell", "tail", 0.8);
  check(
    energy(short, 1.1, 1.5) < energy(normal, 1.1, 1.5) * 0.1,
    "Shorter tail silences the existing ring",
  );
  const longer = await render("bell", "tail", 5, { tail: 1 });
  check(
    energy(longer, 1.5, 2) > 0.00001,
    "Longer tail extends the existing ring",
  );
  const body = await render("body", "volume", defaults.body.volume);
  for (const [key, value] of [
    ["volume", 0],
    ["filter", 80],
    ["resonance", 8],
    ["pan", 1],
    ["waveform", "sine"],
  ] as const) {
    check(
      difference(body, await render("body", key, value)) > 1e-5,
      `${key} changes an active synth note`,
    );
  }
  const pan = await render("body", "pan", 1);
  check(
    energy(pan) < energy(pan, 0.35, 1, 1) * 0.01,
    "Pan actually moves audio to the right channel",
  );
  for (const [key, value] of [
    ["attack", 1],
    ["decay", 1],
    ["sustain", 0],
    ["release", 1],
  ] as const) {
    check(
      difference(body, await render("body", key, value), 57330, 176400) > 1e-5,
      `${key} changes subsequent synth notes without restarting`,
    );
  }
  const counts = (density: number, seed = 17) => {
    const notes: number[] = [];
    const seq = new Sequencer(() => ({ ...melodyDefaults, density, seed }), {
      body: () => {},
      ghost: () => {},
      chime: (n) => notes.push(n),
    });
    for (let i = 0; i < 64; i++) seq.schedule(i, i * 0.14);
    return notes;
  };
  check(
    counts(1).length > counts(0).length,
    "Density changes the melody during the introduction",
  );
  check(
    counts(0.58, 18).join() !== counts(0.58, 17).join(),
    "New variation changes the next notes",
  );
  lines.push("COMPLETE");
} catch (e) {
  lines.push(String(e));
}
document.querySelector("#results")!.textContent = lines.join("\n");
