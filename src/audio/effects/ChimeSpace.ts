import { Reverb } from "./Reverb";
import { Delay } from "./Delay";
export class ChimeSpace {
  readonly dry: GainNode;
  readonly reverbSend: GainNode;
  readonly delaySend: GainNode;
  private reverb: Reverb;
  private delay: Delay;
  private wet: GainNode;
  private gate: GainNode;
  constructor(
    private context: BaseAudioContext,
    private destination: AudioNode,
  ) {
    this.dry = context.createGain();
    this.dry.gain.value = 0.8;
    this.reverbSend = context.createGain();
    this.reverbSend.gain.value = 0;
    this.delaySend = context.createGain();
    this.delaySend.gain.value = 0;
    this.reverb = new Reverb(context);
    this.delay = new Delay(context);
    this.wet = context.createGain();
    this.gate = context.createGain();
    this.gate.connect(destination);
    this.dry.connect(this.gate);
    this.reverbSend.connect(this.reverb.input);
    this.reverb.output.connect(this.wet);
    this.delaySend.connect(this.delay.input);
    this.delay.output.connect(this.wet);
    this.wet.connect(this.gate);
  }
  set(space: number, echo: number, bpm: number) {
    this.reverbSend.gain.setTargetAtTime(
      space * 0.85,
      this.context.currentTime,
      0.03,
    );
    this.delaySend.gain.setTargetAtTime(
      echo * 0.65,
      this.context.currentTime,
      0.03,
    );
    this.dry.gain.setTargetAtTime(0.8, this.context.currentTime, 0.03);
    this.delay.setTempo(bpm);
  }
  dispose() {
    const t = this.context.currentTime;
    this.gate.gain.cancelScheduledValues(t);
    this.gate.gain.setValueAtTime(this.gate.gain.value, t);
    this.gate.gain.linearRampToValueAtTime(0, t + 0.025);
    setTimeout(() => {
      [this.dry, this.reverbSend, this.delaySend, this.wet, this.gate].forEach(
        (n) => n.disconnect(),
      );
      this.reverb.dispose();
      this.delay.dispose();
    }, 45);
  }
}
