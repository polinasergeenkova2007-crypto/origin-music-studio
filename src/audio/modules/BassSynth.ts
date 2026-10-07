import { BaseVoice } from "../voices/BaseVoice";
export class BassSynth extends BaseVoice {
  protected sources(frequency: number) {
    const sub = this.context.createOscillator(),
      harmonic = this.context.createOscillator(),
      level = this.context.createGain(),
      mix = this.context.createGain();
    sub.type = "sine";
    sub.frequency.value = frequency;
    harmonic.type = "triangle";
    harmonic.frequency.value = frequency * 2;
    level.gain.value = 0.18;
    sub.connect(mix);
    harmonic.connect(level).connect(mix);
    return {
      oscillators: [sub, harmonic],
      nodes: [sub, harmonic, level, mix],
      output: mix,
    };
  }
}
