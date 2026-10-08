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
    pan.pan.value = kind === "hat" ? 0.18 : kind === "snare" ? -0.12 : 0;
    const damping = this.context.createBiquadFilter();
    damping.type = "lowpass";
    damping.frequency.value = kind === "kick" ? 700 : kind === "snare" ? 1500 : 3400;
    damping.Q.value = 0.5;
    amp.connect(damping).connect(pan).connect(this.output);
    const sources: Hit["sources"] = [],
      nodes: AudioNode[] = [amp, pan, damping];
    const duration =
      kind === "kick" ? 0.38 : kind === "snare" ? 0.18 : open ? 0.14 : 0.065;
    const peak =
      velocity * (kind === "kick" ? 0.65 : kind === "snare" ? 0.48 : 0.22);
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(peak, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    if (kind !== "hat") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(kind === "kick" ? 95 : 310, time);
      osc.frequency.exponentialRampToValueAtTime(
        kind === "kick" ? 43 : 180,
        time + (kind === "kick" ? 0.045 : 0.028),
      );
      const tone = this.context.createGain();
      tone.gain.value = kind === "kick" ? 1 : 0.7;
      osc.connect(tone).connect(amp);
      sources.push(osc);
      nodes.push(osc, tone);
    }
    if (kind === "snare") {
      // Inharmonic, damped membrane mode makes the backbeat hollow rather than bright.
      const cavity = this.context.createOscillator(), level = this.context.createGain();
      cavity.type = "sine";
      cavity.frequency.setValueAtTime(527, time);
      cavity.frequency.exponentialRampToValueAtTime(391, time + 0.045);
      level.gain.setValueAtTime(0.28, time);
      level.gain.exponentialRampToValueAtTime(0.00001, time + 0.075);
      cavity.connect(level).connect(amp);
      sources.push(cavity); nodes.push(cavity, level);
    }
    const noise = this.context.createBufferSource(),
      filter = this.context.createBiquadFilter(),
      noiseAmp = this.context.createGain();
    noise.buffer = this.noise;
    filter.type = "bandpass";
    filter.frequency.value =
      kind === "kick" ? 420 : kind === "snare" ? 900 : 2300;
    filter.Q.value = kind === "hat" ? 1.8 : 0.9;
    noiseAmp.gain.setValueAtTime(kind === "kick" ? 0.08 : kind === "snare" ? 0.45 : 1, time);
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
