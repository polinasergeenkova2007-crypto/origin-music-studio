import { ChimeSynth } from "./ChimeSynth";
import type { MelodySettings } from "../../state/melody";
// A separate tower bell bus controls both the strike and its reverberation.
export class TowerBellSynth extends ChimeSynth {
  private level: GainNode;
  constructor(
    private audio: BaseAudioContext,
    destination: AudioNode,
    settings: MelodySettings,
  ) {
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
    this.level = level;
    this.setVolume(settings.tower);
  }
  setVolume(volume: number) {
    this.level.gain.setTargetAtTime(volume, this.audio.currentTime, 0.025);
  }
  dispose() {
    super.dispose();
    this.level.disconnect();
  }
}
