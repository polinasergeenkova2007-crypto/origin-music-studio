import { midiToFrequency } from "../utils/notes";
import type { MelodySettings } from "../../state/melody";
import { ChimeSpace } from "../effects/ChimeSpace";
type Ring = {
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  envelopes: GainNode[];
  filter: BiquadFilterNode;
  brightness: GainNode;
  started: number;
};
export class ChimeSynth {
  output: GainNode;
  private space: ChimeSpace;
  private rings = new Set<Ring>();
  constructor(
    private context: BaseAudioContext,
    private destination: AudioNode,
    private settings: MelodySettings,
    private size: "small" | "large" = "small",
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0.72;
    this.space = new ChimeSpace(context, destination);
    this.connectSpace();
    this.update(settings);
  }
  private connectSpace() {
    this.output.connect(this.space.dry);
    this.output.connect(this.space.reverbSend);
    this.output.connect(this.space.delaySend);
  }
  update(settings: MelodySettings) {
    const tailChanged = this.settings.tail !== settings.tail;
    this.settings = { ...settings };
    this.applyColor();
    if (tailChanged) {
      const now = this.context.currentTime;
      for (const ring of this.rings) {
        const end = Math.max(now + 0.04, ring.started + settings.tail);
        ring.envelopes.forEach((amp, i) => {
          const at = Math.max(now, ring.started);
          const partialEnd = Math.max(at + 0.03, end - (end - at) * (i * 0.12));
          amp.gain.cancelAndHoldAtTime(at);
          amp.gain.linearRampToValueAtTime(0, partialEnd);
        });
        ring.oscillators.forEach((osc) => osc.stop(end + 0.05));
      }
    }
    this.space.set(settings.space, settings.echo, settings.bpm);
  }
  setColor(softness: number, shimmer: number) {
    this.settings = {
      ...this.settings,
      softness: Math.max(0, Math.min(1, softness)),
      shimmer: Math.max(0, Math.min(1, shimmer)),
    };
    this.applyColor();
  }
  private applyColor() {
    const t = this.context.currentTime;
    for (const ring of this.rings) {
      ring.filter.frequency.setTargetAtTime(
        2400 + (1 - this.settings.softness) * 7000,
        t,
        0.025,
      );
      ring.brightness.gain.setTargetAtTime(
        0.35 + this.settings.shimmer,
        t,
        0.025,
      );
    }
  }
  play(note: number, time: number, velocity = 0.65, pan = 0) {
    const s = this.settings,
      f = midiToFrequency(note),
      filter = this.context.createBiquadFilter(),
      panner = this.context.createStereoPanner(),
      mix = this.context.createGain(),
      brightness = this.context.createGain();
    brightness.gain.value = 0.35 + s.shimmer;
    brightness.connect(mix);
    filter.type = "lowpass";
    filter.frequency.value = 2400 + (1 - s.softness) * 7000;
    filter.Q.value = 0.5;
    panner.pan.value = pan;
    mix.connect(filter).connect(panner).connect(this.output);
    const ring: Ring = {
      oscillators: [],
      nodes: [mix, filter, panner, brightness],
      filter,
      brightness,
      started: time,
      envelopes: [],
    };
    const duration = s.tail;
    // Bell modes: hum, prime, minor third, fifth, nominal and short strike modes.
    const ratios =
      this.size === "large"
        ? [0.5, 1, 1.19, 1.5, 2.01, 2.74, 3.76, 4.07]
        : [1, 2.76, 5.4, 8.93, 13.34];
    const levels =
      this.size === "large"
        ? [0.36, 0.65, 0.3, 0.16, 0.38, 0.12, 0.06, 0.035]
        : [0.64, 0.48, 0.19, 0.07, 0.025];
    ratios.forEach((ratio, i) => {
      const oscillator = this.context.createOscillator(),
        amp = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = f * ratio;
      const peak = velocity * 0.24 * levels[i];
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(
        peak,
        time + (this.size === "large" ? 0.005 : 0.002) + s.softness * 0.004,
      );
      amp.gain.exponentialRampToValueAtTime(
        0.00001,
        time + duration / (1 + i * (this.size === "large" ? 0.16 : 0.5)),
      );
      amp.gain.linearRampToValueAtTime(0, time + duration + 0.015);
      oscillator.connect(amp).connect(i === 0 ? mix : brightness);
      ring.oscillators.push(oscillator);
      ring.nodes.push(oscillator, amp);
      ring.envelopes.push(amp);
    });
    this.rings.add(ring);
    let remaining = ring.oscillators.length;
    ring.oscillators.forEach((o) => {
      o.onended = () => {
        if (--remaining === 0) {
          ring.nodes.forEach((n) => n.disconnect());
          this.rings.delete(ring);
        }
      };
      o.start(time);
      o.stop(time + duration + 0.05);
    });
  }
  stop() {
    const t = this.context.currentTime;
    for (const r of this.rings) {
      r.envelopes.forEach((g) => {
        g.gain.cancelAndHoldAtTime(t);
        g.gain.linearRampToValueAtTime(0, t + 0.02);
      });
      r.oscillators.forEach((o) => o.stop(t + 0.02));
    }
    const previousOutput = this.output;
    previousOutput.gain.setValueAtTime(previousOutput.gain.value, t);
    previousOutput.gain.linearRampToValueAtTime(0, t + 0.025);
    setTimeout(() => previousOutput.disconnect(), 45);
    this.space.dispose();
    this.output = this.context.createGain();
    this.output.gain.value = 0.72;
    this.space = new ChimeSpace(this.context, this.destination);
    this.connectSpace();
    this.update(this.settings);
  }
  get activeCount() {
    return this.rings.size;
  }
  dispose() {
    this.stop();
    this.output.disconnect();
    this.space.dispose();
  }
}
