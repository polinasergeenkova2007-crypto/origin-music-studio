import { BaseVoice } from "../voices/BaseVoice";
export class PadSynth extends BaseVoice {
  protected sources(frequency: number) {
    const mix = this.context.createGain(),
      oscillators: OscillatorNode[] = [],
      nodes: AudioNode[] = [mix];
    [-5, 0, 5].forEach((detune, i) => {
      const osc = this.context.createOscillator(),
        gain = this.context.createGain(),
        pan = this.context.createStereoPanner();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      gain.gain.value = 0.28;
      pan.pan.value = (i - 1) * 0.6;
      osc.connect(gain).connect(pan).connect(mix);
      oscillators.push(osc);
      nodes.push(osc, gain, pan);
    });
    return { oscillators, nodes, output: mix };
  }
}
