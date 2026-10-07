import { BaseVoice } from "../voices/BaseVoice";
// Rounded struck-key tone: fundamental, a quiet triangle body, and a fading octave.
export class FeltPianoSynth extends BaseVoice {
  protected sources(frequency: number) {
    const mix = this.context.createGain();
    const oscillators: OscillatorNode[] = [],
      nodes: AudioNode[] = [mix];
    [1, 1, 2].forEach((ratio, i) => {
      const osc = this.context.createOscillator(),
        amp = this.context.createGain();
      osc.type = i === 1 ? "triangle" : "sine";
      osc.frequency.value = frequency * ratio;
      amp.gain.value = [0.75, 0.18, 0.075][i];
      osc.connect(amp).connect(mix);
      oscillators.push(osc);
      nodes.push(osc, amp);
    });
    return { oscillators, nodes, output: mix };
  }
}
