import { BowedGlassSynth } from "../src/audio/modules/BowedGlassSynth";
import { FeltPianoSynth } from "../src/audio/modules/FeltPianoSynth";
import { PadSynth } from "../src/audio/modules/PadSynth";
import { PluckSynth } from "../src/audio/modules/PluckSynth";
import { MachineSynth } from "../src/audio/modules/MachineSynth";
import { GhostVoice } from "../src/audio/voices/GhostVoice";
import { defaults } from "../src/state/types";
const lines: string[] = [];
const check = (ok: boolean, label: string) => {
  lines.push((ok ? "PASS " : "FAIL ") + label);
  if (!ok) throw Error(label);
};
async function render(
  kind: "pad" | "pluck" | "machine" | "ghost" | "bow" | "piano",
  volume = 0.5,
  stop = false,
) {
  const ctx = new OfflineAudioContext(2, 44100 * 4, 44100),
    dest = ctx.destination;
  let synth:
    BowedGlassSynth | PadSynth | PluckSynth | MachineSynth | GhostVoice;
  if (kind === "machine") synth = new MachineSynth(ctx, dest);
  else if (kind === "piano")
    synth = new FeltPianoSynth(ctx as unknown as AudioContext, dest, {
      ...defaults.ghost,
      volume,
      attack: 0.012,
      decay: 0.24,
      sustain: 0.12,
      release: 0.32,
    });
  else if (kind === "bow")
    synth = new BowedGlassSynth(ctx as unknown as AudioContext, dest, {
      ...defaults.ghost,
      volume,
      attack: 0.18,
      release: 0.65,
    });
  else if (kind === "pad")
    synth = new PadSynth(ctx as unknown as AudioContext, dest, {
      ...defaults.ghost,
      volume,
      attack: 0.6,
      release: 1,
    });
  else if (kind === "pluck")
    synth = new PluckSynth(ctx as unknown as AudioContext, dest, {
      ...defaults.ghost,
      volume,
      attack: 0.005,
      decay: 0.14,
      sustain: 0.06,
      release: 0.18,
    });
  else
    synth = new GhostVoice(ctx as unknown as AudioContext, dest, {
      ...defaults.ghost,
      volume,
    });
  if (synth instanceof MachineSynth) {
    synth.setVolume(volume);
    synth.play(0.2, true);
  } else synth.play(62, 0.2, 0.8, 0.7);
  const suspension = stop ? ctx.suspend(0.4) : undefined,
    rendering = ctx.startRendering();
  if (suspension) {
    await suspension;
    synth.stop();
    await ctx.resume();
  }
  const audio = await rendering;
  return { data: audio.getChannelData(0), count: synth.activeCount };
}
const rms = (data: Float32Array, start = 0) =>
  Math.sqrt(
    data.slice(start).reduce((sum, v) => sum + v * v, 0) /
      (data.length - start),
  );
try {
  for (const kind of [
    "pad",
    "pluck",
    "machine",
    "ghost",
    "bow",
    "piano",
  ] as const) {
    const sound = await render(kind),
      muted = await render(kind, 0),
      stopped = await render(kind, 0.5, true);
    check(rms(sound.data) > 0.0001, kind + " produces actual audio");
    check(
      rms(muted.data, 44100 / 2) < 1e-7,
      kind + " independent volume mutes signal",
    );
    check(sound.count === 0, kind + " sources clean up");
    check(
      rms(stopped.data, 44100 * 2) < 1e-7 && stopped.count === 0,
      kind + " STOP silences and cleans sources",
    );
  }
  lines.push("COMPLETE");
} catch (e) {
  lines.push(String(e));
}
document.querySelector("#results")!.textContent = lines.join("\n");
