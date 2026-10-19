// SHARED animation families: how each kind of card plays on screen in every mode.
// A card's own look (cards.<id>.look in src/core/cards.js) adds its VFX color and its
// length; everything else about the feel lives here. Ask for changes by name
// ("heavy hitStopMs to 150", "combo punch to 0.2"). Milliseconds unless noted.
//
//   clip       the hero's clip (FIGURES.hero.clips in units.js)
//   clipHit    seconds into that clip where the blow lands; the clip is sped up or
//              slowed so this moment meets the impact
//   hitFrac    where in the card's length the (first) impact lands, 0-1
//   gapMs      between hits of a multi-hit card
//   dash       the hero runs in: 'target' (stops `reach` metres short), 'centre' of
//              the skeletons, or none
//   hitStopMs  everything freezes this long on impact (the "crunch")
//   shake      camera shake in metres;  flash: white screen flash 0-1
//   glow       how bright the struck skeleton lights up in the card's color

export const FAMILIES = {
  light: { clip: 'light', clipHit: 0.42, hitFrac: 0.5, gapMs: 150, dash: 'target', reach: 1.15, hitStopMs: 55, shake: 0.05, flash: 0, glow: 0.45, vfx: ['slash', 'sparks'] },
  heavy: { clip: 'heavy', clipHit: 0.78, hitFrac: 0.6, gapMs: 150, dash: 'target', reach: 1.25, hitStopMs: 130, shake: 0.2, flash: 0.3, glow: 0.65, vfx: ['slash', 'ring', 'sparks', 'light'] },
  area: { clip: 'area', clipHit: 0.32, hitFrac: 0.5, gapMs: 220, dash: 'centre', reach: 0, hitStopMs: 80, shake: 0.12, flash: 0.12, glow: 0.5, vfx: ['ring', 'sparks'] },
  buff: { clip: 'buff', clipHit: 1.0, hitFrac: 0.55, gapMs: 0, dash: null, hitStopMs: 0, shake: 0.03, flash: 0, glow: 0.35, vfx: ['rise'] },
  block: { clip: 'block', clipHit: 0.3, hitFrac: 0.4, gapMs: 0, dash: null, hitStopMs: 30, shake: 0.02, flash: 0, glow: 0.3, vfx: ['bubble'] },
  // Finisher: a directed 2 s shot (the card's look.ms). Times are fractions of it.
  finisher: {
    clip: 'finisher', clipHit: 0.78, hitFrac: 0.52, gapMs: 120, dash: 'target', reach: 1.2, hitStopMs: 260, shake: 0.35, flash: 0.5, glow: 0.8, vfx: ['pillar', 'ring', 'sparks', 'light'],
    leapAt: 0.18, // the hero leaves the ground (the camera cuts to the impact angle on the hit)
    returnAt: 0.74, // the hero walks back
    releaseAt: 0.88, // camera back to the arena, letterbox out
    dim: 0.35, // the arena lights drop to this during the shot
  },
};

// The combo moment: the 3rd card of a turn (rules.combo.at) and every card after it.
export const COMBO = { extraHitStopMs: 45, punch: 0.14, flash: 0.2, bannerMs: 900 };

// A skeleton's turn: its swing lands at hitFrac of pace.enemyMs.
export const ENEMY = { clipHit: 0.45, hitFrac: 0.5, gapMs: 140, reach: 1.2, hitStopMs: 50, shake: 0.09, glow: 0.5, color: '#ff4040' };

// Floating damage numbers and banners.
export const LABELS = { numberMs: 760, numberRise: 0.9, bannerMs: 1100 };
