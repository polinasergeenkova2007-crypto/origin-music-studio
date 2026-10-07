export function randomAt(seed: number, index: number) {
  let x = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export const dMinor = [0, 2, 3, 5, 7, 8, 10];
export function varyNote(note: number, seed: number) {
  const pc = (note - 2 + 120) % 12,
    index = dMinor.indexOf(pc);
  const shift = (seed % 3) - 1;
  return (
    note +
    dMinor[(index + shift + 7) % 7] -
    pc +
    (index + shift < 0 ? -12 : index + shift > 6 ? 12 : 0)
  );
}
