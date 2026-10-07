import { BassSynth } from "../src/audio/modules/BassSynth";
import { NoiseSynth } from "../src/audio/modules/NoiseSynth";
import { defaults } from "../src/state/types";
const lines: string[] = [];
const rms = (data: Float32Array, start = 0) =>
  Math.sqrt(
    data.slice(start).reduce((sum, x) => sum + x * x, 0) /
      (data.length - start),
  );
const check = (ok: boolean, name: string) => {
  lines.push((ok ? "PASS " : "FAIL ") + name);
  if (!ok) throw Error(name);
};
async function render(kind: "bass" | "noise", volume: number, stop = false) {
  const ctx = new OfflineAudioContext(2, 44100 * 3, 44100);
  const synth =
    kind === "bass"
      ? new BassSynth(ctx as unknown as AudioContext, ctx.destination, {
          ...defaults.body,
          filter: 250,
          volume,
          attack: 0.03,
          release: 0.3,
        })
      : new NoiseSynth(ctx, ctx.destination);
  if (synth instanceof BassSynth) synth.play(26, 0.1, 0.8, 0.7);
  else {
    synth.setVolume(volume);
    synth.play(0.1, 1.5);
  }
  const suspended = stop ? ctx.suspend(0.5) : undefined,
    rendering = ctx.startRendering();
  if (suspended) {
    await suspended;
    synth.stop();
    await ctx.resume();
  }
  const buffer = await rendering;
  return { data: buffer.getChannelData(0), count: synth.activeCount };
}
try {
  for (const kind of ["bass", "noise"] as const) {
    const normal = await render(kind, 0.5),
      quiet = await render(kind, 0),
      stop = await render(kind, 0.5, true);
    check(rms(normal.data) > 0.001, kind + " generates actual signal");
    check(
      rms(quiet.data, 44100 / 2) < 1e-7,
      kind + " volume silences actual signal",
    );
    check(normal.count === 0, kind + " source cleanup");
    check(
      stop.count === 0 && rms(stop.data, 44100) < 1e-7,
      kind + " STOP cleanup and silence",
    );
  }
  lines.push("COMPLETE");
} catch (e) {
  lines.push(String(e));
}
document.querySelector("#results")!.textContent = lines.join("\n");
