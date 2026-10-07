export class MasterBus {
  readonly input: GainNode;
  readonly analyser: AnalyserNode;
  private gain: GainNode;
  private filter: BiquadFilterNode;
  private limiter: DynamicsCompressorNode;
  constructor(private context: AudioContext) {
    this.input = context.createGain();
    this.input.gain.value = 0.4;
    this.filter = context.createBiquadFilter();
    this.filter.frequency.value = 18000;
    this.gain = context.createGain();
    this.gain.gain.value = 0.55;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -9;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.analyser = context.createAnalyser();
    this.input
      .connect(this.filter)
      .connect(this.gain)
      .connect(this.limiter)
      .connect(this.analyser)
      .connect(context.destination);
  }
  setVolume(value: number) {
    this.gain.gain.setTargetAtTime(
      Math.max(0, Math.min(0.8, value)),
      this.context.currentTime,
      0.015,
    );
  }
  dispose() {
    [this.input, this.filter, this.gain, this.limiter, this.analyser].forEach(
      (n) => n.disconnect(),
    );
  }
}
