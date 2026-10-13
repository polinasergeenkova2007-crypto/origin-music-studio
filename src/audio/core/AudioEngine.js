import { BeatSynth } from "../modules/BeatSynth.js";
import { TowerBellSynth } from "../modules/TowerBellSynth.js";
import { BowedGlassSynth } from "../modules/BowedGlassSynth.js";
import { FeltPianoSynth } from "../modules/FeltPianoSynth.js";
import { PadSynth } from "../modules/PadSynth.js";
import { PluckSynth } from "../modules/PluckSynth.js";
import { MachineSynth } from "../modules/MachineSynth.js";
import { BassSynth } from "../modules/BassSynth.js";
import { NoiseSynth } from "../modules/NoiseSynth.js";
import { defaults } from "../../state/types.js";
import { MasterBus } from "./MasterBus.js";
import { BodyVoice } from "../voices/BodyVoice.js";
import { GhostVoice } from "../voices/GhostVoice.js";
import { ChimeSynth } from "../modules/ChimeSynth.js";
import { AudioScheduler } from "./AudioScheduler.js";
import { Sequencer } from "../sequencing/Sequencer.js";
import { melodyDefaults } from "../../state/melody.js";
export class AudioEngine {
  context;
  master;
  voices;
  chime;
  tower;
  bass;
  glass;
  noise;
  pad;
  bow;
  piano;
  pluck;
  machine;
  beat;
  voiceSettings = { ...defaults };
  scheduler;
  melody = { ...melodyDefaults };
  generation = 0;
  energy = 0.3;
  async start(settings, volume) {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = new MasterBus(this.context);
      this.voices = {
        body: new BodyVoice(this.context, this.master.input, settings.body),
        ghost: new GhostVoice(this.context, this.master.input, settings.ghost),
      };
      this.tower = new TowerBellSynth(
        this.context,
        this.master.input,
        this.melody,
      );
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
      this.beat = new BeatSynth(this.context, this.master.input);
      this.machine = new MachineSynth(this.context, this.master.input);
      const seq = new Sequencer(() => this.melody, {
        tone: (energy, time) => this.automateTone(energy, time),
        tower: (n, t, v) => this.tower.play(n, t, v, 0.08),
        chime: (n, t, v, p) => this.chime.play(n, t, v, p),
        body: (n, t, d, v, release) =>
          this.voices.body.play(n, t, d, v, release),
        ghost: (n, t, d, v, release) =>
          this.voices.ghost.play(n, t, d, v, release),
        bass: (n, t, d, v) => this.bass.play(n, t, d, v),
        glass: (n, t, v, p) => this.glass.play(n, t, v, p),
        noise: (t, d) => this.noise.play(t, d),
        pad: (n, t, d, v) => this.pad.play(n, t, d, v),
        pluck: (n, t, d, v) => this.pluck.play(n, t, d, v),
        piano: (n, t, d, v) => this.piano.play(n, t, d, v),
        bow: (n, t, d, v) => this.bow.play(n, t, d, v),
        beat: (kind, t, velocity, open) =>
          this.beat.play(kind, t, velocity, open),
        machine: (t, k) => this.machine.play(t, k),
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
    this.master.setVolume(volume);
    await this.context.resume();
  }
  async play(settings, volume, melody) {
    const generation = ++this.generation;
    this.updateMelody(melody);
    await this.start(settings, volume);
    if (generation === this.generation) this.scheduler.start();
  }
  updateMelody(settings) {
    const previous = this.melody;
    this.melody = { ...settings };
    if (previous.chime > 0 && settings.chime === 0) this.chime?.stop();
    if (previous.glass > 0 && settings.glass === 0) this.glass?.stop();
    this.chime?.update(settings);
    this.chime?.output.gain.setTargetAtTime(
      settings.chime * 0.72,
      this.context.currentTime,
      0.025,
    );
    this.glass?.output.gain.setTargetAtTime(
      settings.glass * 0.72,
      this.context.currentTime,
      0.025,
    );
    this.bass?.setVolume(settings.bass);
    this.noise?.setVolume(settings.noise);
    this.pad?.setVolume(settings.pad);
    this.bow?.setVolume(settings.bow);
    this.piano?.setVolume(settings.piano);
    if (previous.tower > 0 && settings.tower === 0) this.tower?.stop();
    this.tower?.setVolume(settings.tower);
    this.pluck?.setVolume(settings.pluck);
    this.machine?.setVolume(settings.machine);
    this.beat?.setVolume(settings.beat);
    if (this.voices) {
      this.update("body", this.voiceSettings.body);
      this.update("ghost", this.voiceSettings.ghost);
    }
  }
  automateTone(energy, time) {
    this.energy = energy;
    for (const id of ["body", "ghost"]) {
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
  async audition(settings, volume, tower = false) {
    const generation = this.generation;
    await this.start(settings, volume);
    if (generation === this.generation) {
      if (tower)
        this.tower?.play(50, this.context.currentTime + 0.02, 0.8, 0.08);
      else this.chime?.play(74, this.context.currentTime + 0.02, 0.7, 0);
    }
  }
  noteOn(id, note) {
    this.voices?.[id].noteOn(note);
  }
  noteOff(id, note) {
    this.voices?.[id].noteOff(note);
  }
  update(id, settings) {
    this.voiceSettings = { ...this.voiceSettings, [id]: settings };
    this.voices?.[id].update({
      ...settings,
      volume: settings.volume * this.melody[id],
      filter: settings.filter * (0.6 + this.energy * 0.8),
    });
  }
  setVolume(value) {
    this.master?.setVolume(value);
  }
  stop() {
    this.generation++;
    this.scheduler?.stop();
    this.voices?.body.stop();
    this.voices?.ghost.stop();
    this.tower?.stop();
    this.chime?.stop();
    this.bass?.stop();
    this.glass?.stop();
    this.noise?.stop();
    this.pad?.stop();
    this.bow?.stop();
    this.piano?.stop();
    this.pluck?.stop();
    this.beat?.stop();
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
      (this.tower?.activeCount ?? 0) +
      (this.chime?.activeCount ?? 0) +
      (this.bass?.activeCount ?? 0) +
      (this.glass?.activeCount ?? 0) +
      (this.noise?.activeCount ?? 0) +
      (this.pad?.activeCount ?? 0) +
      (this.bow?.activeCount ?? 0) +
      (this.piano?.activeCount ?? 0) +
      (this.pluck?.activeCount ?? 0) +
      (this.beat?.activeCount ?? 0) +
      (this.machine?.activeCount ?? 0)
    );
  }
  async dispose() {
    this.stop();
    this.voices?.body.dispose();
    this.voices?.ghost.dispose();
    this.tower?.dispose();
    this.chime?.dispose();
    this.bass?.dispose();
    this.glass?.dispose();
    this.noise?.dispose();
    this.pad?.dispose();
    this.bow?.dispose();
    this.piano?.dispose();
    this.pluck?.dispose();
    this.beat?.dispose();
    this.machine?.dispose();
    if (this.context) {
      await new Promise((r) => setTimeout(r, 80));
      this.master?.dispose();
      await this.context.close();
    }
    this.context = undefined;
    this.voices = undefined;
    this.master = undefined;
    this.tower = undefined;
    this.chime = undefined;
    this.bass = undefined;
    this.glass = undefined;
    this.noise = undefined;
    this.pad = undefined;
    this.bow = undefined;
    this.piano = undefined;
    this.pluck = undefined;
    this.beat = undefined;
    this.machine = undefined;
    this.scheduler = undefined;
  }
}
