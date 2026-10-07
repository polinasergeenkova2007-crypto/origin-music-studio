import { TowerBellSynth } from "../src/audio/modules/TowerBellSynth";
import { melodyDefaults } from "../src/state/melody";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
const lines: string[] = [];
function check(ok: boolean, text: string) {
  if (!ok) throw new Error(text);
  lines.push("PASS " + text);
}
async function render(mute: boolean, stop: boolean) {
  const ctx = new OfflineAudioContext(2, 8 * 44100, 44100);
  const bell = new TowerBellSynth(ctx, ctx.destination, melodyDefaults);
  bell.play(50, 0.02, 0.7);
  if (mute || stop) {
    const paused = ctx.suspend(0.5);
    const result = ctx.startRendering();
    await paused;
    if (stop) bell.stop();
    else bell.setVolume(0);
    await ctx.resume();
    return { buffer: await result, bell };
  }
  return { buffer: await ctx.startRendering(), bell };
}
function rms(buffer: AudioBuffer, a: number, b: number) {
  const x = buffer.getChannelData(0);
  let sum = 0;
  for (
    let i = Math.floor(a * buffer.sampleRate);
    i < b * buffer.sampleRate;
    i++
  )
    sum += x[i] * x[i];
  return Math.sqrt(sum / ((b - a) * buffer.sampleRate));
}
(async () => {
  const normal = await render(false, false),
    muted = await render(true, false),
    stopped = await render(false, true);
  check(
    rms(normal.buffer, 0.1, 0.4) > 0.005,
    "Tower bell generates a strong struck tone",
  );
  check(
    rms(normal.buffer, 3, 4) > 0.0001,
    "Low bell has a sustained multi-second resonance",
  );
  check(
    rms(muted.buffer, 1, 2) < rms(normal.buffer, 1, 2) * 0.01,
    "Volume mutes an already ringing tower bell",
  );
  check(
    rms(stopped.buffer, 1, 2) < 0.00001,
    "STOP silences bell and reverberation",
  );
  check(normal.bell.activeCount === 0, "Finished bell modes are cleaned up");
  const hits: number[] = [];
  const seq = new Sequencer(() => melodyDefaults, {
    chime: () => {},
    body: () => {},
    ghost: () => {},
    tower: (_n, t) => hits.push(t),
  });
  for (let step = 0; step < 256; step++)
    seq.schedule(step, (step * 60) / 108 / 4);
  check(
    hits.length >= 4 && hits.length <= 8,
    "Nabat punctuates phrases rather than repeating every note",
  );
  document.querySelector("#results")!.textContent =
    lines.join("\n") + "\nCOMPLETE";
})().catch(
  (e) =>
    (document.querySelector("#results")!.textContent =
      lines.join("\n") + "\nFAIL " + e),
);
