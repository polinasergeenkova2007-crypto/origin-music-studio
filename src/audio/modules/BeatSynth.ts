type Drum = "kick" | "snare" | "hat";
type Hit = {
  sources: (OscillatorNode | AudioBufferSourceNode)[];
  nodes: AudioNode[];
  amp: GainNode;
};
export class BeatSynth {
  readonly output: GainNode;
  private noise: AudioBuffer;
  private hits = new Set<Hit>();
  constructor(
    private context: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.connect(destination);
    this.noise = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.4),
      context.sampleRate,
    );
    let seed = 482;
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
  }
  setVolume(value: number) {
    this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
  }
  play(kind: Drum, time: number, velocity = 1, open = false) {
    const amp = this.context.createGain(),
      pan = this.context.createStereoPanner();
    pan.pan.value = kind === "hat" ? 0.25 : 0;
    amp.connect(pan).connect(this.output);
    const sources: Hit["sources"] = [],
      nodes: AudioNode[] = [amp, pan];
    const duration =
      kind === "kick" ? 0.32 : kind === "snare" ? 0.21 : open ? 0.18 : 0.045;
    const peak =
      velocity * (kind === "kick" ? 0.65 : kind === "snare" ? 0.32 : 0.11);
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(peak, time + 0.001);
    amp.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    if (kind !== "hat") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(kind === "kick" ? 165 : 210, time);
      osc.frequency.exponentialRampToValueAtTime(
        kind === "kick" ? 46 : 125,
        time + (kind === "kick" ? 0.085 : 0.06),
      );
      const tone = this.context.createGain();
      tone.gain.value = kind === "kick" ? 1 : 0.35;
      osc.connect(tone).connect(amp);
      sources.push(osc);
      nodes.push(osc, tone);
    }
    const noise = this.context.createBufferSource(),
      filter = this.context.createBiquadFilter(),
      noiseAmp = this.context.createGain();
    noise.buffer = this.noise;
    filter.type = kind === "snare" ? "bandpass" : "highpass";
    filter.frequency.value =
      kind === "kick" ? 2800 : kind === "snare" ? 1900 : 6500;
    filter.Q.value = 0.7;
    noiseAmp.gain.setValueAtTime(kind === "kick" ? 0.22 : 1, time);
    if (kind === "kick")
      noiseAmp.gain.exponentialRampToValueAtTime(0.00001, time + 0.012);
    noise.connect(filter).connect(noiseAmp).connect(amp);
    sources.push(noise);
    nodes.push(noise, filter, noiseAmp);
    const hit = { sources, nodes, amp };
    this.hits.add(hit);
    let pending = sources.length;
    for (const source of sources) {
      source.onended = () => {
        if (--pending === 0) {
          nodes.forEach((n) => n.disconnect());
          this.hits.delete(hit);
        }
      };
      source.start(time);
      source.stop(time + duration + 0.01);
    }
  }
  stop() {
    const t = this.context.currentTime;
    for (const h of this.hits) {
      h.amp.gain.cancelAndHoldAtTime(t);
      h.amp.gain.linearRampToValueAtTime(0, t + 0.015);
      h.sources.forEach((s) => s.stop(t + 0.02));
    }
  }
  get activeCount() {
    return this.hits.size;
  }
  dispose() {
    this.stop();
    setTimeout(() => this.output.disconnect(), 40);
  }
}
