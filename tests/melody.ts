import { ChimeSynth } from "../src/audio/modules/ChimeSynth";
import { Sequencer } from "../src/audio/sequencing/Sequencer";
import { AudioScheduler } from "../src/audio/core/AudioScheduler";
import { melodyDefaults, type MelodySettings } from "../src/state/melody";
import { randomAt } from "../src/audio/sequencing/Randomizer";
const lines: string[] = [];
const assert = (ok: boolean, label: string) => {
  lines.push(`${ok ? "PASS" : "FAIL"} ${label}`);
  document.querySelector("#results")!.textContent = lines.join("\n");
  if (!ok) throw Error(label);
};
const rms = (d: Float32Array, start = 0, end = d.length) =>
  Math.sqrt(
    d.slice(start, end).reduce((sum, x) => sum + x * x, 0) / (end - start),
  );
async function render(settings: Partial<MelodySettings> = {}, stop = false) {
  const ctx = new OfflineAudioContext(2, 44100 * 7, 44100),
    synth = new ChimeSynth(ctx, ctx.destination, {
      ...melodyDefaults,
      ...settings,
    });
  synth.play(74, 0.1, 0.7, 0.3);
  if (!stop) {
    const buffer = await ctx.startRendering();
    return { data: buffer.getChannelData(0), count: synth.activeCount };
  }
  const suspension = ctx.suspend(0.8),
    rendering = ctx.startRendering();
  await suspension;
  synth.stop();
  await ctx.resume();
  const buffer = await rendering;
  return { data: buffer.getChannelData(0), count: synth.activeCount };
}
document.querySelector("#run")!.addEventListener("click", async () => {
  const ctx = new AudioContext();
  await ctx.resume();
  try {
    const plain = await render({ space: 0, echo: 0 }),
      wet = await render(),
      stopped = await render({}, true),
      short = await render({ tail: 1, space: 0, echo: 0 }),
      soft = await render({ softness: 1, space: 0, echo: 0 }),
      bright = await render({ softness: 0, space: 0, echo: 0 });
    assert(
      rms(plain.data) > 0.001,
      "Chime renders real audible audio (RMS " +
        rms(plain.data).toFixed(5) +
        ")",
    );
    assert(
      rms(plain.data, 0, 4000) < 1e-8,
      "Scheduled onset is silent before audio time",
    );
    assert(
      rms(wet.data, 44100 * 4, 44100 * 5) >
        rms(plain.data, 44100 * 4, 44100 * 5) + 1e-6,
      "Reverb/delay sends produce an audible tail",
    );
    assert(
      rms(stopped.data, 44100 * 2) < 1e-8 && stopped.count === 0,
      "STOP silences notes and effects and cleans all sources",
    );
    assert(
      plain.count === 0 && wet.count === 0,
      "Partial and FM oscillators clean up after their tails",
    );
    assert(
      rms(short.data, 44100 * 2) < 1e-8,
      "Tail control changes note duration",
    );
    assert(
      rms(soft.data.map((x, i) => x - bright.data[i])) > 0.001,
      "Softness changes the actual signal",
    );
    for (let seed = 17; seed < 25; seed++) {
      let count = 0;
      const s = { ...melodyDefaults, seed, density: 1 };
      const seq = new Sequencer(() => s, {
        chime: (n, t) => {
          assert(
            [0, 2, 4, 5, 7, 9, 10].includes(n % 12),
            `Seed ${seed}: MIDI ${n} remains in D minor`,
          );
          if (t < 0) throw Error("invalid time");
          count++;
        },
        body: () => {},
        ghost: () => {},
      });
      for (let i = 0; i < 64; i++) seq.schedule(i, i * 0.15625);
      assert(
        count >= 28 && count <= 32,
        `Seed ${seed}: bounded melodic density`,
      );
    }
    assert(randomAt(17, 52) === randomAt(17, 52), "Randomness is reproducible");
    const events: { step: number; time: number }[] = [];
    await ctx.resume();
    const scheduler = new AudioScheduler(
      ctx,
      () => 96,
      (step, time) => events.push({ step, time }),
    );
    scheduler.start();
    scheduler.start();
    await new Promise((r) => setTimeout(r, 450));
    scheduler.stop();
    const length = events.length;
    await new Promise((r) => setTimeout(r, 160));
    assert(
      length >= 3 && events.length === length,
      "Scheduler starts once and STOP cancels future scheduling",
    );
    assert(
      events
        .slice(1)
        .every((e, i) => Math.abs(e.time - events[i].time - 0.15625) < 1e-8),
      "Scheduler times use exact audio-clock sixteenth intervals",
    );
    await ctx.close();
    lines.push("COMPLETE");
    document.querySelector("#results")!.textContent = lines.join("\n");
  } catch (e) {
    document.querySelector("#results")!.textContent =
      lines.join("\n") + "\n" + String(e);
    await ctx.close();
  }
});
