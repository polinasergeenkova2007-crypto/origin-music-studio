export interface MelodySettings {
  bpm: number;
  density: number;
  softness: number;
  space: number;
  echo: number;
  tail: number;
  shimmer: number;
  body: number;
  ghost: number;
  seed: number;
  chime: number;
  bass: number;
  glass: number;
  noise: number;
  pad: number;
  pluck: number;
  machine: number;
  bow: number;
  piano: number;
  tower: number;
}
export const melodyDefaults: MelodySettings = {
  bpm: 108,
  density: 0.58,
  softness: 0.72,
  space: 0.42,
  echo: 0.18,
  tail: 1.7,
  shimmer: 0.22,
  body: 1,
  ghost: 1,
  seed: 17,
  chime: 0.42,
  bass: 0.3,
  glass: 0.3,
  noise: 0.17,
  pad: 0.18,
  pluck: 0.32,
  machine: 0.2,
  bow: 0.4,
  piano: 0.62,
  tower: 0.32,
};
