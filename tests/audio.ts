import { BodyVoice } from "../src/audio/voices/BodyVoice";
import { GhostVoice } from "../src/audio/voices/GhostVoice";
import { MasterBus } from "../src/audio/core/MasterBus";
import { defaults, type VoiceSettings } from "../src/state/types";
const lines: string[] = [];
function assert(condition: boolean, label: string) {
  lines.push(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) throw Error(label);
}
const rms = (d: Float32Array, start = 0, end = d.length) =>
  Math.sqrt(d.slice(start, end).reduce((a, v) => a + v * v, 0) / (end - start));
async function render(
  kind: "body" | "ghost" | "both",
  settings?: Partial<VoiceSettings>,
  stop = false,
  masterVolume = 0.55,
) {
  const ctx = new OfflineAudioContext(2, 44100 * 4, 44100),
    bus = new MasterBus(ctx as unknown as AudioContext);
  bus.setVolume(masterVolume);
  const body = new BodyVoice(ctx as unknown as AudioContext, bus.input, {
      ...defaults.body,
      ...settings,
    }),
    ghost = new GhostVoice(ctx as unknown as AudioContext, bus.input, {
      ...defaults.ghost,
      ...settings,
    });
  if (kind !== "ghost") body.noteOn(62);
  if (kind !== "body") ghost.noteOn(62);
  const suspension = ctx.suspend(0.8);
  const rendering = ctx.startRendering();
  await suspension;
  if (stop) {
    body.stop();
    ghost.stop();
  } else {
    body.noteOff(62);
    ghost.noteOff(62);
  }
  await ctx.resume();
  const buffer = await rendering;
  return {
    data: buffer.getChannelData(0),
    count: body.activeCount + ghost.activeCount,
  };
}
try {
  const body = await render("body"),
    ghost = await render("ghost"),
    both = await render("both");
  assert(rms(body.data) > 0.001, "BODY generates actual audio");
  assert(rms(ghost.data) > 0.001, "GHOST generates actual audio");
  assert(
    rms(body.data.map((v, i) => v - ghost.data[i])) > 0.001,
    "BODY and GHOST have distinct signals",
  );
  assert(rms(both.data) > 0.001, "Both voices sound concurrently");
  assert(
    body.count === 0 && ghost.count === 0 && both.count === 0,
    "Released oscillators and LFOs clean up",
  );
  assert(
    rms(body.data, 44100 * 3) < 1e-6 && rms(ghost.data, 44100 * 3) < 1e-6,
    "noteOff releases to silence",
  );
  for (const kind of ["body", "ghost"] as const) {
    const quiet = await render(kind, { volume: 0 }),
      low = await render(kind, { filter: 80 }),
      normal = kind === "body" ? body : ghost;
    assert(
      rms(quiet.data) < 1e-6,
      kind + " individual volume controls actual signal",
    );
    assert(
      rms(low.data) < rms(normal.data) * 0.7,
      kind + " low-pass filter changes actual signal",
    );
    const stopped = await render(kind, undefined, true);
    assert(
      rms(stopped.data, 44100 * 1.3) < 1e-6 && stopped.count === 0,
      kind + " STOP silences and cleans up",
    );
    const slow = await render(kind, { attack: 2 });
    assert(
      rms(slow.data, 0, 4410) < rms(normal.data, 0, 4410),
      kind + " attack changes envelope",
    );
  }
  const silent = await render("both", undefined, false, 0);
  assert(
    rms(silent.data, 44100 / 2) < 1e-6,
    "Master volume controls actual output",
  );
  lines.push("COMPLETE");
} catch (e) {
  lines.push(String(e));
}
document.querySelector("#results")!.textContent = lines.join("\n");
