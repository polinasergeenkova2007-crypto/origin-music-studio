import { BaseVoice } from "../voices/BaseVoice";
// Plucked electronic harp: triangle string, octave and soft upper harmonics.
export class ElectronicHarpSynth extends BaseVoice {
  protected sources(frequency: number) {
    const mix = this.context.createGain();
    const oscillators: OscillatorNode[] = [],
      nodes: AudioNode[] = [mix];
    [1, 2, 3, 5].forEach((ratio, i) => {
      const osc = this.context.createOscillator(),
        amp = this.context.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = frequency * ratio;
      amp.gain.value = [0.68, 0.2, 0.09, 0.035][i];
      osc.connect(amp).connect(mix);
      oscillators.push(osc);
      nodes.push(osc, amp);
    });
    return { oscillators, nodes, output: mix };
  }
}
