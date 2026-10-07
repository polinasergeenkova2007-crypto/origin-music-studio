export type VoiceId = "body" | "ghost";
export interface VoiceSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filter: number;
  resonance: number;
  volume: number;
  pan: number;
  waveform: OscillatorType;
}
export const defaults: Record<VoiceId, VoiceSettings> = {
  body: {
    attack: 0.025,
    decay: 0.3,
    sustain: 0.7,
    release: 0.22,
    filter: 650,
    resonance: 1.2,
    volume: 0.45,
    pan: -0.12,
    waveform: "sawtooth",
  },
  ghost: {
    attack: 0.07,
    decay: 0.4,
    sustain: 0.45,
    release: 0.4,
    filter: 1400,
    resonance: 0.5,
    volume: 0.26,
    pan: 0.18,
    waveform: "sine",
  },
};
