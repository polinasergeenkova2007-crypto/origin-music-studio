import { NoiseSynth } from "./NoiseSynth";
// Two filtered-noise swells form an inhalation and a longer exhalation.
export class BreathSynth extends NoiseSynth {
  breathe(time: number, duration: number, intensity: number) {
    this.play(time, duration * 0.34, intensity);
    this.play(time + duration * 0.43, duration * 0.57, intensity * 0.8);
  }
}
