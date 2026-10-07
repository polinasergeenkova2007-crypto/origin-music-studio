import { BaseVoice } from "./BaseVoice";
// Soft rounded voice: no pitch LFO and no resonant nasal edge.
export class GhostVoice extends BaseVoice {
  protected sources(frequency: number) {
    const fundamental = this.context.createOscillator(),
      overtone = this.context.createOscillator(),
      level = this.context.createGain(),
      mix = this.context.createGain();
    fundamental.type = this.settings.waveform;
    fundamental.frequency.value = frequency;
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2;
    level.gain.value = 0.085;
    fundamental.connect(mix);
    overtone.connect(level).connect(mix);
    return {
      oscillators: [fundamental, overtone],
      nodes: [fundamental, overtone, level, mix],
      output: mix,
    };
  }
}
