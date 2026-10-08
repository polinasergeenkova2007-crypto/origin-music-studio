type Cloud = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  nodes: AudioNode[];
};
export class NoiseSynth {
  readonly output: GainNode;
  private buffer: AudioBuffer;
  private clouds = new Set<Cloud>();
  constructor(
    private context: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0.12;
    this.output.connect(destination);
    this.buffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const data = this.buffer.getChannelData(0);
    let seed = 51,
      previous = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      previous = 0.96 * previous + 0.04 * ((seed / 4294967296) * 2 - 1);
      data[i] = previous * 3;
    }
  }
  setVolume(value: number) {
    this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
  }
  play(time: number, duration: number, intensity = 1) {
    const source = this.context.createBufferSource(),
      gain = this.context.createGain(),
      filter = this.context.createBiquadFilter(),
      pan = this.context.createStereoPanner();
    source.buffer = this.buffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 0.8;
    pan.pan.value = 0.45;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.22 * intensity, time + duration * 0.35);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    source.connect(filter).connect(gain).connect(pan).connect(this.output);
    const cloud = { source, gain, nodes: [source, filter, gain, pan] };
    this.clouds.add(cloud);
    source.onended = () => {
      cloud.nodes.forEach((n) => n.disconnect());
      this.clouds.delete(cloud);
    };
    source.start(time);
    source.stop(time + duration + 0.02);
  }
  stop() {
    const t = this.context.currentTime;
    for (const cloud of this.clouds) {
      cloud.gain.gain.cancelAndHoldAtTime(t);
      cloud.gain.gain.linearRampToValueAtTime(0, t + 0.025);
      cloud.source.stop(t + 0.03);
    }
  }
  get activeCount() {
    return this.clouds.size;
  }
  dispose() {
    this.stop();
    setTimeout(() => this.output.disconnect(), 60);
  }
}
