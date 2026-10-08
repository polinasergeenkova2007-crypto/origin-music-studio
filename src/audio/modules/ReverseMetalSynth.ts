type Breath = {
  sources: OscillatorNode[];
  nodes: AudioNode[];
  gains: GainNode[];
};
export class ReverseMetalSynth {
  readonly output: GainNode;
  private breaths = new Set<Breath>();
  constructor(
    private context: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0.55;
    this.output.connect(destination);
  }
  setVolume(value: number) {
    this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
  }
  play(time: number, duration: number, frequency = 146.83) {
    const pan = this.context.createStereoPanner();
    pan.pan.setValueAtTime(-0.35, time);
    pan.pan.linearRampToValueAtTime(0.2, time + duration);
    pan.connect(this.output);
    const hit: Breath = { sources: [], nodes: [pan], gains: [] };
    // Inharmonic resonances swell into a struck, lower metallic response.
    [1, 1.48, 2.09, 2.76, 4.13].forEach((ratio, i) => {
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency * ratio * 2, time);
      osc.frequency.exponentialRampToValueAtTime(
        frequency * ratio,
        time + duration,
      );
      const peak = [0.15, 0.085, 0.06, 0.035, 0.018][i];
      gain.gain.setValueAtTime(0.00001, time);
      gain.gain.exponentialRampToValueAtTime(
        peak * 0.8,
        time + duration - 0.025,
      );
      gain.gain.linearRampToValueAtTime(peak * 1.6, time + duration);
      gain.gain.exponentialRampToValueAtTime(
        0.00001,
        time + duration + 1.5 / (1 + i * 0.3),
      );
      osc.connect(gain).connect(pan);
      hit.sources.push(osc);
      hit.nodes.push(osc, gain);
      hit.gains.push(gain);
    });
    this.breaths.add(hit);
    let pending = hit.sources.length;
    hit.sources.forEach((source) => {
      source.onended = () => {
        if (--pending === 0) {
          hit.nodes.forEach((n) => n.disconnect());
          this.breaths.delete(hit);
        }
      };
      source.start(time);
      source.stop(time + duration + 1.55);
    });
  }
  stop() {
    const t = this.context.currentTime;
    for (const h of this.breaths) {
      h.gains.forEach((g) => {
        g.gain.cancelAndHoldAtTime(t);
        g.gain.linearRampToValueAtTime(0, t + 0.02);
      });
      h.sources.forEach((s) => s.stop(t + 0.025));
    }
  }
  get activeCount() {
    return this.breaths.size;
  }
  dispose() {
    this.stop();
    setTimeout(() => this.output.disconnect(), 50);
  }
}
