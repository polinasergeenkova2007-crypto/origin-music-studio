import { ChimeSynth } from "./ChimeSynth.js";
// A separate tower bell bus controls both the strike and its reverberation.
export class TowerBellSynth extends ChimeSynth {
  audio;
  level;
  constructor(audio, destination, settings) {
    const level = audio.createGain();
    level.connect(destination);
    super(
      audio,
      level,
      {
        ...settings,
        tail: 6.8,
        softness: 0.35,
        shimmer: 0.75,
        echo: 0,
        space: 0.45,
      },
      "large",
    );
    this.audio = audio;
    this.level = level;
    this.setVolume(settings.tower);
  }
  setVolume(volume) {
    this.level.gain.setTargetAtTime(volume, this.audio.currentTime, 0.025);
  }
  dispose() {
    super.dispose();
    this.level.disconnect();
  }
}
