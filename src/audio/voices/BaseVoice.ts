import type { VoiceSettings } from "../../state/types";
import { midiToFrequency } from "../utils/notes";
type Note = {
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  amp: GainNode;
  level: number;
  started: number;
  settings: VoiceSettings;
  released: boolean;
};
export class BaseVoice {
  readonly output: GainNode;
  readonly filter: BiquadFilterNode;
  protected pan: StereoPannerNode;
  protected notes = new Set<Note>();
  private held = new Map<number, Note>();
  constructor(
    protected context: AudioContext,
    destination: AudioNode,
    protected settings: VoiceSettings,
  ) {
    this.output = context.createGain();
    this.output.gain.value = settings.volume;
    this.filter = context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = settings.filter;
    this.filter.Q.value = settings.resonance;
    this.pan = context.createStereoPanner();
    this.pan.pan.value = settings.pan;
    this.filter.connect(this.pan).connect(this.output).connect(destination);
    this.update(settings);
  }
  protected sources(frequency: number): {
    oscillators: OscillatorNode[];
    nodes: AudioNode[];
    output: AudioNode;
  } {
    const osc = this.context.createOscillator();
    osc.type = this.settings.waveform;
    osc.frequency.value = frequency;
    return { oscillators: [osc], nodes: [osc], output: osc };
  }
  private createNote(midi: number, velocity: number, t: number) {
    const s = { ...this.settings },
      source = this.sources(midiToFrequency(midi)),
      amp = this.context.createGain(),
      level = Math.max(0, Math.min(1, velocity)) * 0.32;
    source.output.connect(amp).connect(this.filter);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + s.attack);
    amp.gain.linearRampToValueAtTime(level * s.sustain, t + s.attack + s.decay);
    const note: Note = {
      ...source,
      amp,
      level,
      started: t,
      settings: s,
      released: false,
    };
    this.notes.add(note);
    let remaining = source.oscillators.length;
    source.oscillators.forEach((o) => {
      o.onended = () => {
        if (--remaining === 0) {
          note.nodes.forEach((n) => n.disconnect());
          amp.disconnect();
          this.notes.delete(note);
        }
      };
      o.start(t);
    });
    return note;
  }
  noteOn(midi: number, velocity = 0.8) {
    if (this.held.has(midi)) return;
    this.held.set(
      midi,
      this.createNote(midi, velocity, this.context.currentTime),
    );
  }
  play(
    midi: number,
    time: number,
    duration: number,
    velocity = 0.8,
    maxRelease = Infinity,
  ) {
    const note = this.createNote(midi, velocity, time);
    this.release(
      note,
      Math.min(this.settings.release, maxRelease),
      time +
        Math.max(duration, this.settings.attack + this.settings.decay + 0.04),
    );
  }

  private release(note: Note, duration: number, at = this.context.currentTime) {
    if (note.released) return;
    note.released = true;
    const t = at,
      p = note.amp.gain;
    if (typeof p.cancelAndHoldAtTime === "function") p.cancelAndHoldAtTime(t);
    else {
      const e = t - note.started,
        s = note.settings,
        v =
          e < s.attack
            ? (note.level * e) / s.attack
            : e < s.attack + s.decay
              ? note.level * (1 - ((1 - s.sustain) * (e - s.attack)) / s.decay)
              : note.level * s.sustain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(v, t);
    }
    p.linearRampToValueAtTime(0, t + duration);
    note.oscillators.forEach((o) => o.stop(t + duration + 0.025));
  }
  noteOff(midi: number) {
    const note = this.held.get(midi);
    if (note) {
      this.release(note, this.settings.release);
      this.held.delete(midi);
    }
  }
  stop() {
    this.notes.forEach((n) => {
      n.released = false;
      this.release(n, 0.025);
    });
    this.held.clear();
  }
  update(settings: VoiceSettings) {
    this.settings = { ...settings };
    this.notes.forEach((note) => {
      note.oscillators[0].type = settings.waveform;
    });
    const t = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(settings.filter, t, 0.02);
    this.filter.Q.setTargetAtTime(settings.resonance, t, 0.02);
    this.output.gain.setTargetAtTime(settings.volume, t, 0.015);
    this.pan.pan.setTargetAtTime(settings.pan, t, 0.02);
  }
  setAttack(value: number) {
    this.update({ ...this.settings, attack: value });
  }
  setDecay(value: number) {
    this.update({ ...this.settings, decay: value });
  }
  setSustain(value: number) {
    this.update({ ...this.settings, sustain: value });
  }
  setRelease(value: number) {
    this.update({ ...this.settings, release: value });
  }
  setFilter(value: number) {
    this.update({ ...this.settings, filter: value });
  }
  setResonance(value: number) {
    this.update({ ...this.settings, resonance: value });
  }
  setVolume(value: number) {
    this.update({ ...this.settings, volume: value });
  }
  setPan(value: number) {
    this.update({ ...this.settings, pan: value });
  }
  get activeCount() {
    return this.notes.size;
  }
  dispose() {
    this.stop();
    setTimeout(() => {
      this.filter.disconnect();
      this.pan.disconnect();
      this.output.disconnect();
    }, 60);
  }
}
