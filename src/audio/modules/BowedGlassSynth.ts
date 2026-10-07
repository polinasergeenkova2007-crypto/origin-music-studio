import { BaseVoice } from "../voices/BaseVoice";
// A rounded bowed-glass tone: a quiet fundamental with gently coloured harmonics.
export class BowedGlassSynth extends BaseVoice {
  protected sources(frequency: number) {
    const mix = this.context.createGain();
    const oscillators: OscillatorNode[] = [],
      nodes: AudioNode[] = [mix];
    [1, 2, 3].forEach((ratio, i) => {
      const osc = this.context.createOscillator(),
        amp = this.context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency * ratio;
      amp.gain.value = [0.85, 0.16, 0.045][i];
      osc.connect(amp).connect(mix);
      oscillators.push(osc);
      nodes.push(osc, amp);
    });
    return { oscillators, nodes, output: mix };
  }
}
