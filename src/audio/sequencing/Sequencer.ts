import { energyAt } from "../../composition/dynamics";
import { layerPlan, arrangementAt } from "../../composition/afterimage";
import { bellMelody, bellSteps } from "../../composition/bellMelody";

import type { MelodySettings } from "../../state/melody";
export interface Instruments {
  breath?: (time: number, duration: number, intensity: number) => void;
  reverse?: (time: number, duration: number, frequency: number) => void;
  beat?: (
    kind: "kick" | "snare" | "hat",
    time: number,
    velocity: number,
    open?: boolean,
  ) => void;
  tower?: (note: number, time: number, velocity: number) => void;
  piano?: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
  ) => void;
  bow?: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
  ) => void;
  pad?: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
  ) => void;
  pluck?: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
  ) => void;
  machine?: (time: number, knock: boolean) => void;
  tone?: (energy: number, time: number) => void;
  bass?: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
    maxRelease?: number,
  ) => void;
  glass?: (note: number, time: number, velocity: number, pan: number) => void;
  noise?: (time: number, duration: number) => void;
  chime: (note: number, time: number, velocity: number, pan: number) => void;
  body: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
    maxRelease?: number,
  ) => void;
  ghost: (
    note: number,
    time: number,
    duration: number,
    velocity: number,
    maxRelease?: number,
  ) => void;
}
export class Sequencer {
  constructor(
    private settings: () => MelodySettings,
    private instruments: Instruments,
  ) {}
  schedule(step: number, time: number) {
    const s = this.settings(),
      { bar, section, chord } = arrangementAt(step),
      position = step % 16,
      tick = 60 / s.bpm / 4,
      energy = energyAt(step),
      gain = 0.55 + energy * 0.45;
    const active = new Set<string>(layerPlan[bar]);
    // Leave a half-bar breath before the climax, and a beat before the return.
    if ((bar === 7 && position >= 8) || (bar === 11 && position >= 12))
      for (const role of ["beat", "bass", "body", "machine"])
        active.delete(role);
    const instruments: Instruments = {
      ...this.instruments,
      piano: active.has("piano") ? this.instruments.piano : undefined,
      chime: active.has("chime") ? this.instruments.chime : () => {},
      body: active.has("body") ? this.instruments.body : () => {},
      ghost: active.has("ghost") ? this.instruments.ghost : () => {},
      bass: active.has("bass") ? this.instruments.bass : undefined,
      glass: active.has("glass") ? this.instruments.glass : undefined,
      noise: active.has("noise") ? this.instruments.noise : undefined,
      pad: active.has("pad") ? this.instruments.pad : undefined,
      bow: active.has("bow") ? this.instruments.bow : undefined,
      pluck: active.has("pluck") ? this.instruments.pluck : undefined,
      machine: active.has("machine") ? this.instruments.machine : undefined,
      tower: active.has("tower") ? this.instruments.tower : undefined,
      beat: active.has("beat") ? this.instruments.beat : undefined,
    };
    this.instruments.tone?.(energy, time);
    if ((bar < 2 && position === 0) || ([3, 7, 11, 15].includes(bar) && position === 8))
      this.instruments.breath?.(time, tick * (bar < 2 ? 12 : 8), bar < 2 ? 1.9 : 0.75);
    const rise = section.id === "rise";
    const drumGain =
      section.id === "intro" ? 0.7 : section.id === "return" ? 0.65 : 1;
    if ([0, 8, 10].includes(position) || (rise && [6, 14].includes(position)))
      instruments.beat?.(
        "kick",
        time,
        drumGain * (position === 0 || position === 8 ? 1 : 0.8),
      );
    if (
      section.id !== "intro" &&
      ([4, 12].includes(position) ||
        (rise && bar % 4 === 3 && [14, 15].includes(position)))
    )
      instruments.beat?.("snare", time, drumGain * (position === 15 ? 0.6 : 1));
    if (position % 2 === 0 || (rise && position >= 12))
      instruments.beat?.(
        "hat",
        time,
        drumGain * (position % 4 === 2 ? 0.85 : 0.5),
        position === 14,
      );

    // Nabat announces phrase boundaries; the rise adds an answering strike.
    if (
      (position === 0 && bar % 4 === 0) ||
      (section.id === "rise" && bar % 2 === 1 && position === 8)
    )
      instruments.tower?.(chord.bass + 12, time, 0.72 * gain);
    const phraseSteps = bar % 2 === 0 ? bellSteps : [0, 3, 5, 7, 10, 12, 15];
    const bellIndex = phraseSteps.indexOf(position);
    if (bellIndex >= 0) {
      const phrase = bellMelody[bar],
        index =
          s.seed === 17
            ? bellIndex
            : (bellIndex + ((s.seed - 17) % 3) + 1) % phrase.length;
      const note =
        phrase[
          s.seed !== 17 && s.seed % 2 === 0 ? phrase.length - 1 - index : index
        ];
      // Felt keys carry the phrase; celesta glints punctuate its turns.
      instruments.piano?.(
        note - 12,
        time,
        tick * (bellIndex === 6 ? 2 : 0.8),
        ([0, 3].includes(bellIndex) ? 0.75 : 0.52 + bellIndex * 0.015) * gain,
      );
      if ([0, 3, 6].includes(bellIndex))
        instruments.chime(
          note,
          time,
          (bellIndex === 0 ? 0.62 : 0.42) * gain,
          bellIndex === 3 ? -0.18 : 0.18,
        );
    }
    // Low rhythmic BODY, mid-register GHOST, high bell melody: interlocking attacks.
    if (
      [1, 5, 9, 13].includes(position) &&
      (section.id !== "return" || position === 1 || position === 9)
    )
      instruments.body(
        chord.body[Math.floor(position / 4) % 3],
        time,
        tick * 0.7,
        0.38 * gain,
      );
    if (position === 3 || position === 11)
      instruments.ghost(
        chord.ghost[(Math.floor(position / 8) + bar) % 3],
        time,
        tick * 2,
        0.4 * gain,
      );
    if (
      position === 0 ||
      position === 8 ||
      (section.id === "rise" && position === 6)
    )
      instruments.bass?.(chord.bass, time, tick * 2.5, 0.52 * gain);
    if (
      position === 6 &&
      section.id !== "intro" &&
      bar % 4 !== 0 &&
      bar % 4 !== 3
    )
      instruments.glass?.(chord.glass, time, 0.32 * gain, -0.5);
    if (position === 15 && (section.id === "rise" || bar % 2 === 1))
      instruments.glass?.(chord.glass - 12, time, 0.23 * gain, 0.55);
    if (position === 15 && (bar % 2 === 1 || section.id === "rise"))
      instruments.noise?.(time, tick * 0.8);
    // Density decorates the current phrase in every section; the core melody stays intact.
    if (
      (position === 8 && s.density > 0.65) ||
      (position === 6 && s.density > 0.85) ||
      (position === 15 && s.density > 0.95)
    )
      instruments.chime(
        bellMelody[bar][position === 6 ? 2 : 3],
        time,
        (0.12 + s.density * 0.18) * gain,
        position === 6 ? -0.35 : 0.35,
      );
    // Long answers cross a bar line every four bars; shorter replies keep the flow alive.
    const longAnswer = bar % 4 === 0 || bar % 4 === 3;
    if (position === 6 || (position === 13 && bar % 2 === 1 && !longAnswer))
      instruments.bow?.(
        bellMelody[bar][position === 6 ? 2 : 5] - 12,
        time,
        tick * (longAnswer ? 18 : section.id === "rise" ? 4 : 3),
        (longAnswer ? 0.5 : 0.65) * gain,
      );
    // A two-bar foundation breathes beneath the moving parts.
    if (position === 0 && (bar === 1 || bar % 2 === 0)) {
      instruments.pad?.(chord.body[0] + 12, time, tick * 22, 0.32 * gain);
    }
    if (
      [6, 15].includes(position) &&
      section.id !== "intro" &&
      !(longAnswer && position === 6)
    )
      instruments.pluck?.(
        chord.ghost[Math.floor(position / 8) % 3],
        time,
        tick * 0.7,
        0.48 * gain,
      );
    if (
      [3, 11].includes(position) ||
      (section.id === "rise" && [5, 9, 15].includes(position))
    )
      instruments.machine?.(time, position === 11);
  }
}
