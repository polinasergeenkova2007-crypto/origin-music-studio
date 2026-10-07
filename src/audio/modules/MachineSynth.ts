type Hit = {
  source: AudioBufferSourceNode;
  osc: OscillatorNode;
  gain: GainNode;
  nodes: AudioNode[];
};
export class MachineSynth {
  readonly output: GainNode;
  private buffer: AudioBuffer;
  private hits = new Set<Hit>();
  constructor(
    private context: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0.12;
    this.output.connect(destination);
    this.buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.1),
      context.sampleRate,
    );
    let seed = 91;
    const data = this.buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
  }
  setVolume(value: number) {
    this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
  }
  play(time: number, knock = false) {
    const source = this.context.createBufferSource(),
      osc = this.context.createOscillator(),
      filter = this.context.createBiquadFilter(),
      gain = this.context.createGain(),
      pan = this.context.createStereoPanner(),
      noiseLevel = this.context.createGain();
    source.buffer = this.buffer;
    filter.type = "bandpass";
    filter.frequency.value = knock ? 850 : 3600;
    filter.Q.value = 2;
    noiseLevel.gain.value = 0.12;
    osc.type = "sine";
    osc.frequency.setValueAtTime(knock ? 260 : 1700, time);
    osc.frequency.exponentialRampToValueAtTime(knock ? 90 : 750, time + 0.05);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(knock ? 0.23 : 0.065, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.075);
    pan.pan.value = knock ? -0.25 : 0.35;
    source.connect(noiseLevel).connect(filter).connect(gain);
    osc.connect(gain);
    gain.connect(pan).connect(this.output);
    const hit = {
      source,
      osc,
      gain,
      nodes: [source, osc, filter, gain, pan, noiseLevel],
    };
    this.hits.add(hit);
    let count = 2;
    const ended = () => {
      if (--count === 0) {
        hit.nodes.forEach((n) => n.disconnect());
        this.hits.delete(hit);
      }
    };
    source.onended = ended;
    osc.onended = ended;
    source.start(time);
    osc.start(time);
    source.stop(time + 0.09);
    osc.stop(time + 0.09);
  }
  stop() {
    const t = this.context.currentTime;
    for (const h of this.hits) {
      h.gain.gain.cancelAndHoldAtTime(t);
      h.gain.gain.linearRampToValueAtTime(0, t + 0.02);
      h.source.stop(t + 0.025);
      h.osc.stop(t + 0.025);
    }
  }
  get activeCount() {
    return this.hits.size;
  }
  dispose() {
    this.stop();
    setTimeout(() => this.output.disconnect(), 60);
  }
}
