// An original question / answer composition. All pitched voices share the same harmony.
export type SectionId = "intro" | "dialogue" | "rise" | "return";
export const sections = [
  {
    id: "intro",
    name: "Вступление",
    description:
      "Короткое вступление: тема и звон, затем ритм; полный состав с третьего такта",
  },
  {
    id: "dialogue",
    name: "Диалог",
    description: "Тема развивается, вступают стеклянные акценты",
  },
  {
    id: "rise",
    name: "Подъём",
    description: "Плотный басовый рисунок, высокая мелодия и больше акцентов",
  },
  {
    id: "return",
    name: "Возвращение",
    description: "Аккомпанемент редеет, мелодия возвращается к начальной теме",
  },
] as const;
export const chords = {
  dm: {
    name: "Dm",
    bass: 26,
    body: [50, 57, 53],
    ghost: [69, 72, 65],
    chime: [74, 77, 81],
    glass: 86,
  },
  bb: {
    name: "B♭",
    bass: 34,
    body: [46, 53, 50],
    ghost: [65, 62, 70],
    chime: [70, 74, 77],
    glass: 89,
  },
  am: {
    name: "Am",
    bass: 33,
    body: [45, 52, 48],
    ghost: [64, 60, 69],
    chime: [72, 76, 81],
    glass: 88,
  },
  f: {
    name: "F",
    bass: 29,
    body: [53, 48, 57],
    ghost: [69, 72, 65],
    chime: [72, 77, 81],
    glass: 84,
  },
  c: {
    name: "C",
    bass: 36,
    body: [48, 55, 52],
    ghost: [67, 64, 72],
    chime: [72, 76, 79],
    glass: 88,
  },
};
export type ChordId = keyof typeof chords;
export const harmony: ChordId[] = [
  "dm",
  "f",
  "bb",
  "am",
  "dm",
  "f",
  "bb",
  "c",
  "f",
  "bb",
  "c",
  "am",
  "dm",
  "bb",
  "am",
  "dm",
];
export function arrangementAt(step: number) {
  const bar = Math.floor(step / 16) % 16,
    section = sections[bar < 2 ? 0 : bar < 8 ? 1 : bar < 12 ? 2 : 3],
    chord = chords[harmony[bar]];
  return { bar, section, chord };
}
