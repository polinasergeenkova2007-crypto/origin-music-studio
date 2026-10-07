import { BaseVoice } from "../voices/BaseVoice";
export class PluckSynth extends BaseVoice {
  protected sources(frequency: number) {
    const a = this.context.createOscillator(),
      b = this.context.createOscillator(),
      level = this.context.createGain(),
      mix = this.context.createGain();
    a.type = "sine";
    a.frequency.value = frequency;
    b.type = "triangle";
    b.frequency.value = frequency * 3;
    level.gain.value = 0.12;
    a.connect(mix);
    b.connect(level).connect(mix);
    return { oscillators: [a, b], nodes: [a, b, level, mix], output: mix };
  }
}
