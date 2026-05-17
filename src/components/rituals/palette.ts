// Paper Trail tones — each ritual fill reads as a highlighter swipe or
// pencil tint over the line-icon, rather than a watercolor wash.
export const WATERCOLOR_PALETTE = [
  '#F4E04D', // highlighter yellow
  '#FFEB9C', // pale highlighter
  '#EBC04C', // golden ochre
  '#D4D0C0', // kraft paper
  '#A8A8A0', // pencil graphite (medium)
  '#C8B89A', // manila
  '#EFE4C0', // parchment
] as const;

export function pickWatercolor(): string {
  return WATERCOLOR_PALETTE[
    Math.floor(Math.random() * WATERCOLOR_PALETTE.length)
  ];
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
