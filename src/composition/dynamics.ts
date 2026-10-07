// A slow inhale / exhale. The final bar meets the next introduction softly.
const contour = [
  0.45, 0.52, 0.56, 0.6, 0.68, 0.74, 0.82, 0.86, 0.94, 1, 1, 0.88, 0.65, 0.48,
  0.38, 0.32, 0.45,
];
export function energyAt(step: number) {
  const position = ((step % 256) + 256) % 256,
    bar = Math.floor(position / 16),
    fraction = (position % 16) / 16;
  const smooth = fraction * fraction * (3 - 2 * fraction);
  return contour[bar] + (contour[bar + 1] - contour[bar]) * smooth;
}
