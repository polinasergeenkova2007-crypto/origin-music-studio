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
        1700 + (1 - this.settings.softness) * 7000,
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
    filter.frequency.value = 1700 + (1 - s.softness) * 7000;
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
    const ratios = [1, 2.01, 2.76, 4.08, 5.43],
      levels = [0.8, 0.26, 0.14, 0.065, 0.035];
    ratios.forEach((ratio, i) => {
      const oscillator = this.context.createOscillator(),
        amp = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = f * ratio;
      const peak = velocity * 0.24 * levels[i];
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(peak, time + 0.009 + s.softness * 0.025);
      amp.gain.exponentialRampToValueAtTime(
        0.00001,
        time + duration / (1 + i * 0.32),
      );
      amp.gain.linearRampToValueAtTime(0, time + duration + 0.015);
      oscillator.connect(amp).connect(i === 0 ? mix : brightness);
      ring.oscillators.push(oscillator);
      ring.nodes.push(oscillator, amp);
      ring.envelopes.push(amp);
    });
    // Low-index FM adds a metallic attack, then quickly becomes a pure ringing fundamental.
    const mod = this.context.createOscillator(),
      index = this.context.createGain();
    mod.frequency.value = f * 1.414;
    index.gain.setValueAtTime(
      f * (0.08 + s.shimmer * 0.28) * (1 - s.softness * 0.6),
      time,
    );
    index.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    mod.connect(index).connect(ring.oscillators[0].frequency);
    ring.oscillators.push(mod);
    ring.nodes.push(mod, index);
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
