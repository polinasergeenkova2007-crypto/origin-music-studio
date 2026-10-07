export class Delay {
  readonly input: DelayNode;
  readonly output: GainNode;
  private feedback: GainNode;
  private filter: BiquadFilterNode;
  constructor(private context: BaseAudioContext) {
    this.input = context.createDelay(2);
    this.output = context.createGain();
    this.feedback = context.createGain();
    this.filter = context.createBiquadFilter();
    this.filter.frequency.value = 2200;
    this.feedback.gain.value = 0.32;
    this.output.gain.value = 0.55;
    this.input.connect(this.filter).connect(this.feedback).connect(this.input);
    this.input.connect(this.output);
  }
  setTempo(bpm: number) {
    this.input.delayTime.setTargetAtTime(
      (60 / bpm) * 0.75,
      this.context.currentTime,
      0.05,
    );
  }
  dispose() {
    [this.input, this.output, this.feedback, this.filter].forEach((n) =>
      n.disconnect(),
    );
  }
}
