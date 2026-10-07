import { BowedGlassSynth } from "../modules/BowedGlassSynth";
import { FeltPianoSynth } from "../modules/FeltPianoSynth";
import { PadSynth } from "../modules/PadSynth";
import { PluckSynth } from "../modules/PluckSynth";
import { MachineSynth } from "../modules/MachineSynth";
import { BassSynth } from "../modules/BassSynth";
import { NoiseSynth } from "../modules/NoiseSynth";
import { defaults } from "../../state/types";
import { MasterBus } from "./MasterBus";
import { BodyVoice } from "../voices/BodyVoice";
import { GhostVoice } from "../voices/GhostVoice";
import { ChimeSynth } from "../modules/ChimeSynth";
import { AudioScheduler } from "./AudioScheduler";
import { Sequencer } from "../sequencing/Sequencer";
import { melodyDefaults, type MelodySettings } from "../../state/melody";
import type { VoiceId, VoiceSettings } from "../../state/types";
export class AudioEngine {
  private context?: AudioContext;
  private master?: MasterBus;
  private voices?: { body: BodyVoice; ghost: GhostVoice };
  private chime?: ChimeSynth;
  private bass?: BassSynth;
  private glass?: ChimeSynth;
  private noise?: NoiseSynth;
  private pad?: PadSynth;
  private bow?: BowedGlassSynth;
  private piano?: FeltPianoSynth;
  private pluck?: PluckSynth;
  private machine?: MachineSynth;
  private voiceSettings = { ...defaults };
  private scheduler?: AudioScheduler;
  private melody = { ...melodyDefaults };
  private generation = 0;
  private energy = 0.3;
  async start(settings: Record<VoiceId, VoiceSettings>, volume: number) {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = new MasterBus(this.context);
      this.voices = {
        body: new BodyVoice(this.context, this.master.input, settings.body),
        ghost: new GhostVoice(this.context, this.master.input, settings.ghost),
      };
      this.chime = new ChimeSynth(this.context, this.master.input, this.melody);
      this.bass = new BassSynth(this.context, this.master.input, {
        ...defaults.body,
        waveform: "sine",
        attack: 0.04,
        decay: 0.35,
        sustain: 0.65,
        release: 0.4,
        filter: 250,
        volume: this.melody.bass,
        pan: 0,
      });
      this.glass = new ChimeSynth(this.context, this.master.input, {
        ...this.melody,
        tail: 1.2,
        softness: 0.4,
        space: 0.8,
        echo: 0.12,
      });
      this.noise = new NoiseSynth(this.context, this.master.input);
      this.pad = new PadSynth(this.context, this.master.input, {
        ...defaults.ghost,
        attack: 0.7,
        decay: 0.4,
        sustain: 0.6,
        release: 1.6,
        filter: 1000,
        volume: this.melody.pad,
        pan: 0,
      });
      this.pluck = new PluckSynth(this.context, this.master.input, {
        ...defaults.ghost,
        attack: 0.005,
        decay: 0.14,
        sustain: 0.06,
        release: 0.18,
        filter: 2900,
        volume: this.melody.pluck,
        pan: -0.3,
      });
      this.bow = new BowedGlassSynth(this.context, this.master.input, {
        ...defaults.ghost,
        attack: 0.18,
        decay: 0.3,
        sustain: 0.6,
        release: 1.1,
        filter: 1800,
        volume: this.melody.bow,
        pan: -0.25,
      });
      this.piano = new FeltPianoSynth(this.context, this.master.input, {
        ...defaults.ghost,
        attack: 0.012,
        decay: 0.24,
        sustain: 0.12,
        release: 0.32,
        filter: 2200,
        volume: this.melody.piano,
        pan: -0.08,
      });
      this.machine = new MachineSynth(this.context, this.master.input);
      const seq = new Sequencer(() => this.melody, {
        tone: (energy, time) => this.automateTone(energy, time),
        chime: (n, t, v, p) => this.chime!.play(n, t, v, p),
        body: (n, t, d, v, release) =>
          this.voices!.body.play(n, t, d, v, release),
        ghost: (n, t, d, v, release) =>
          this.voices!.ghost.play(n, t, d, v, release),
        bass: (n, t, d, v) => this.bass!.play(n, t, d, v),
        glass: (n, t, v, p) => this.glass!.play(n, t, v, p),
        noise: (t, d) => this.noise!.play(t, d),
        pad: (n, t, d, v) => this.pad!.play(n, t, d, v),
        pluck: (n, t, d, v) => this.pluck!.play(n, t, d, v),
        piano: (n, t, d, v) => this.piano!.play(n, t, d, v),
        bow: (n, t, d, v) => this.bow!.play(n, t, d, v),
        machine: (t, k) => this.machine!.play(t, k),
      });
      this.scheduler = new AudioScheduler(
        this.context,
        () => this.melody.bpm,
        (s, t) => seq.schedule(s, t),
      );
    }
    this.voiceSettings = { ...settings };
    this.update("body", settings.body);
    this.update("ghost", settings.ghost);
    this.updateMelody(this.melody);
    this.master!.setVolume(volume);
    await this.context.resume();
  }
  async play(
    settings: Record<VoiceId, VoiceSettings>,
    volume: number,
    melody: MelodySettings,
  ) {
    const generation = ++this.generation;
    this.updateMelody(melody);
    await this.start(settings, volume);
    if (generation === this.generation) this.scheduler!.start();
  }
  updateMelody(settings: MelodySettings) {
    const previous = this.melody;
    this.melody = { ...settings };
    if (previous.chime > 0 && settings.chime === 0) this.chime?.stop();
    if (previous.glass > 0 && settings.glass === 0) this.glass?.stop();
    this.chime?.update(settings);
    this.chime?.output.gain.setTargetAtTime(
      settings.chime * 0.72,
      this.context!.currentTime,
      0.025,
    );
    this.glass?.output.gain.setTargetAtTime(
      settings.glass * 0.72,
      this.context!.currentTime,
      0.025,
    );
    this.bass?.setVolume(settings.bass);
    this.noise?.setVolume(settings.noise);
    this.pad?.setVolume(settings.pad);
    this.bow?.setVolume(settings.bow);
    this.piano?.setVolume(settings.piano);
    this.pluck?.setVolume(settings.pluck);
    this.machine?.setVolume(settings.machine);
    if (this.voices) {
      this.update("body", this.voiceSettings.body);
      this.update("ghost", this.voiceSettings.ghost);
    }
  }
  private automateTone(energy: number, time: number) {
    this.energy = energy;
    for (const id of ["body", "ghost"] as const) {
      this.voices?.[id].filter.frequency.setTargetAtTime(
        this.voiceSettings[id].filter * (0.6 + energy * 0.8),
        time,
        0.12,
      );
    }
    this.chime?.setColor(
      this.melody.softness + 0.08 - energy * 0.16,
      this.melody.shimmer * (0.55 + energy * 0.75),
    );
  }
  async audition(settings: Record<VoiceId, VoiceSettings>, volume: number) {
    const generation = this.generation;
    await this.start(settings, volume);
    if (generation === this.generation)
      this.chime?.play(74, this.context!.currentTime + 0.02, 0.7, 0);
  }
  noteOn(id: VoiceId, note: number) {
    this.voices?.[id].noteOn(note);
  }
  noteOff(id: VoiceId, note: number) {
    this.voices?.[id].noteOff(note);
  }
  update(id: VoiceId, settings: VoiceSettings) {
    this.voiceSettings = { ...this.voiceSettings, [id]: settings };
    this.voices?.[id].update({
      ...settings,
      volume: settings.volume * this.melody[id],
      filter: settings.filter * (0.6 + this.energy * 0.8),
    });
  }
  setVolume(value: number) {
    this.master?.setVolume(value);
  }
  stop() {
    this.generation++;
    this.scheduler?.stop();
    this.voices?.body.stop();
    this.voices?.ghost.stop();
    this.chime?.stop();
    this.bass?.stop();
    this.glass?.stop();
    this.noise?.stop();
    this.pad?.stop();
    this.bow?.stop();
    this.piano?.stop();
    this.pluck?.stop();
    this.machine?.stop();
    this.updateMelody(this.melody);
  }
  get position() {
    return this.scheduler?.position ?? 0;
  }
  get analyser() {
    return this.master?.analyser;
  }
  get playing() {
    return this.scheduler?.playing ?? false;
  }
  get activeCount() {
    return (
      (this.voices?.body.activeCount ?? 0) +
      (this.voices?.ghost.activeCount ?? 0) +
      (this.chime?.activeCount ?? 0) +
      (this.bass?.activeCount ?? 0) +
      (this.glass?.activeCount ?? 0) +
      (this.noise?.activeCount ?? 0) +
      (this.pad?.activeCount ?? 0) +
      (this.bow?.activeCount ?? 0) +
      (this.piano?.activeCount ?? 0) +
      (this.pluck?.activeCount ?? 0) +
      (this.machine?.activeCount ?? 0)
    );
  }
  async dispose() {
    this.stop();
    this.voices?.body.dispose();
    this.voices?.ghost.dispose();
    this.chime?.dispose();
    this.bass?.dispose();
    this.glass?.dispose();
    this.noise?.dispose();
    this.pad?.dispose();
    this.bow?.dispose();
    this.piano?.dispose();
    this.pluck?.dispose();
    this.machine?.dispose();
    if (this.context) {
      await new Promise((r) => setTimeout(r, 80));
      this.master?.dispose();
      await this.context.close();
    }
    this.context = undefined;
    this.voices = undefined;
    this.master = undefined;
    this.chime = undefined;
    this.bass = undefined;
    this.glass = undefined;
    this.noise = undefined;
    this.pad = undefined;
    this.bow = undefined;
    this.piano = undefined;
    this.pluck = undefined;
    this.machine = undefined;
    this.scheduler = undefined;
  }
}
