export const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function noteNameToMidi(note: string) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (!m) throw new Error("Invalid note");
  const p: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  return (
    (+m[3] + 1) * 12 + p[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
  );
}
export const transpose = (midi: number, semitones: number) =>
  Math.max(0, Math.min(127, midi + semitones));
export const noteLabel = (midi: number) =>
  ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][midi % 12] +
  (Math.floor(midi / 12) - 1);
