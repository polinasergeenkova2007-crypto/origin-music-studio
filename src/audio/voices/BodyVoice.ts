import { BaseVoice } from "./BaseVoice";
export class BodyVoice extends BaseVoice {
  protected sources(frequency: number) {
    const a = this.context.createOscillator(),
      b = this.context.createOscillator(),
      ga = this.context.createGain(),
      gb = this.context.createGain(),
      mix = this.context.createGain();
    a.type = this.settings.waveform;
    b.type = "triangle";
    a.frequency.value = b.frequency.value = frequency;
    b.detune.value = -7;
    ga.gain.value = 0.6;
    gb.gain.value = 0.4;
    a.connect(ga).connect(mix);
    b.connect(gb).connect(mix);
    return { oscillators: [a, b], nodes: [a, b, ga, gb, mix], output: mix };
  }
  constructor(...args: ConstructorParameters<typeof BaseVoice>) {
    super(...args);
    const drive = this.context.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh(1.5 * x) / 1.5;
    }
    drive.curve = curve;
    drive.oversample = "2x";
    this.filter.disconnect();
    this.filter.connect(drive).connect(this.pan);
    this.drive = drive;
  }
  private drive: WaveShaperNode;
  dispose() {
    super.dispose();
    setTimeout(() => this.drive.disconnect(), 60);
  }
}
