import { NoiseSynth } from "./NoiseSynth";
export class BreathSynth extends NoiseSynth {
    breathe(time: number, duration: number, intensity: number) {
        this.play(time, duration * 0.34, intensity);
        this.play(time + duration * 0.43, duration * 0.57, intensity * 0.8);
    }
}
