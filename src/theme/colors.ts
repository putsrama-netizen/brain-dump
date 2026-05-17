// "Paper Trail" palette — creamy off-white paper, ink-black text,
// highlighter-yellow and pencil-graphite accents.
//
// Existing semantic tokens (sage/sand/slate/postit/etc.) are kept so consumers
// don't need to rename — only the values change. Approximate mapping:
//   sage      → highlighter yellow (positive accent / "marked")
//   sageDeep  → pencil graphite deep (active state)
//   sand      → highlighter yellow surface (Keep button background)
//   sandDeep  → ochre (pressed/deeper highlight)
//   slate     → ink black (primary text + dark button bg)
//   slateMut  → pencil graphite (muted text + inactive tabs)
//   postit    → subtle paper variants (parchment / manila / ivory)

export const colors = {
  // Surfaces
  paper: '#F5F5F0',        // creamy off-white background
  card: '#FFFEF9',         // raised paper (slight cream)

  // Highlights & graphite (Paper Trail accents)
  sage: '#F4E04D',         // highlighter yellow — positive / "marked"
  sageDeep: '#3A3A3A',     // pencil graphite deep — active / focus
  sand: '#F4E04D',         // highlighter yellow surface
  sandDeep: '#C4A82A',     // ochre — pressed highlight
  slate: '#1A1A1A',        // ink black — primary dark
  slateMut: '#6B6B6B',     // pencil graphite — muted

  // Paper-toned note surfaces (subtle parchment variants)
  postit: ['#FFFDF4', '#FAF6E8', '#F2EDE0', '#FAF0E0', '#F0EDE7'] as const,

  // Semantic
  text: '#1A1A1A',         // ink black
  textMuted: '#5C5C5C',    // graphite
  divider: 'rgba(26, 26, 26, 0.14)',   // hand-drawn ink line
  shadow: 'rgba(0, 0, 0, 0.08)',       // light paper shadow
  overlay: 'rgba(26, 26, 26, 0.5)',
};

export type PostItColor = (typeof colors.postit)[number];
