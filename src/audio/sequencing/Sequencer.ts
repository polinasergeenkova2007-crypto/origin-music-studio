import { energyAt } from "../../composition/dynamics";
import { arrangementAt } from "../../composition/afterimage";
import { bellMelody, bellSteps } from "../../composition/bellMelody";

import type { MelodySettings } from "../../state/melody";
export interface Instruments {
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
    this.instruments.tone?.(energy, time);
    const rise = section.id === "rise";
    const drumGain =
      section.id === "intro" ? 0.7 : section.id === "return" ? 0.65 : 1;
    if ([0, 8, 10].includes(position) || (rise && [6, 14].includes(position)))
      this.instruments.beat?.(
        "kick",
        time,
        drumGain * (position === 0 || position === 8 ? 1 : 0.8),
      );
    if (
      [4, 12].includes(position) ||
      (rise && bar % 4 === 3 && [14, 15].includes(position))
    )
      this.instruments.beat?.(
        "snare",
        time,
        drumGain * (position === 15 ? 0.6 : 1),
      );
    if (position % 2 === 0 || (rise && position >= 12))
      this.instruments.beat?.(
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
      this.instruments.tower?.(chord.bass + 12, time, 0.72 * gain);
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
      this.instruments.piano?.(
        note - 12,
        time,
        tick * (bellIndex === 6 ? 2 : 0.8),
        ([0, 3].includes(bellIndex) ? 0.75 : 0.52 + bellIndex * 0.015) * gain,
      );
      if ([0, 3, 6].includes(bellIndex))
        this.instruments.chime(
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
      this.instruments.body(
        chord.body[Math.floor(position / 4) % 3],
        time,
        tick * 0.7,
        0.38 * gain,
      );
    if (position === 3 || position === 11)
      this.instruments.ghost(
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
      this.instruments.bass?.(chord.bass, time, tick * 2.5, 0.52 * gain);
    if (
      position === 6 &&
      section.id !== "intro" &&
      bar % 4 !== 0 &&
      bar % 4 !== 3
    )
      this.instruments.glass?.(chord.glass, time, 0.32 * gain, -0.5);
    if (position === 15 && (section.id === "rise" || bar % 2 === 1))
      this.instruments.glass?.(chord.glass - 12, time, 0.23 * gain, 0.55);
    if (position === 15 && (bar % 2 === 1 || section.id === "rise"))
      this.instruments.noise?.(time, tick * 0.8);
    // Density decorates the current phrase in every section; the core melody stays intact.
    if (
      (position === 8 && s.density > 0.65) ||
      (position === 6 && s.density > 0.85) ||
      (position === 15 && s.density > 0.95)
    )
      this.instruments.chime(
        bellMelody[bar][position === 6 ? 2 : 3],
        time,
        (0.12 + s.density * 0.18) * gain,
        position === 6 ? -0.35 : 0.35,
      );
    // Long answers cross a bar line every four bars; shorter replies keep the flow alive.
    const longAnswer = bar % 4 === 0 || bar % 4 === 3;
    if (position === 6 || (position === 13 && bar % 2 === 1 && !longAnswer))
      this.instruments.bow?.(
        bellMelody[bar][position === 6 ? 2 : 5] - 12,
        time,
        tick * (longAnswer ? 18 : section.id === "rise" ? 4 : 3),
        (longAnswer ? 0.5 : 0.65) * gain,
      );
    // A two-bar foundation breathes beneath the moving parts.
    if (position === 0 && bar % 2 === 0) {
      this.instruments.pad?.(chord.body[0] + 12, time, tick * 22, 0.32 * gain);
    }
    if (
      [6, 15].includes(position) &&
      section.id !== "intro" &&
      !(longAnswer && position === 6)
    )
      this.instruments.pluck?.(
        chord.ghost[Math.floor(position / 8) % 3],
        time,
        tick * 0.7,
        0.48 * gain,
      );
    if (
      [3, 11].includes(position) ||
      (section.id === "rise" && [5, 9, 15].includes(position))
    )
      this.instruments.machine?.(time, position === 11);
  }
}
