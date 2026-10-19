// Mode B, PLAN THEN WATCH: every number this mode uses. Ask for changes by name
// ("pace.cardGapMs to 300", "rules.energy to 4"). The cards, skeletons and fights are
// SHARED with modes A and C (src/core/cards.js), copied in so ?tune reaches them.
import { HERO, CARDS, STARTER_DECK, REWARD_POOL, ENEMIES, FIGHTS } from '../core/cards.js';

export const PLAN = {
  mode: 'plan',
  hero: HERO,
  cards: CARDS,
  starterDeck: STARTER_DECK,
  rewardPool: REWARD_POOL,
  enemies: ENEMIES,
  fights: FIGHTS,

  // Turn rules (the sim): the same as mode A, so only the pace differs.
  rules: {
    energy: 3,
    draw: 5,
    handMax: 10,
    combo: {
      at: 3,
      bonus: {
        light: { dmgPct: 25 },
        heavy: { dmgPct: 25 },
        area: { dmgPct: 25 },
        finisher: { dmgPct: 25 },
        block: { blockPct: 50 },
        buff: { str: 1, draw: 1 },
      },
    },
    exposePct: 50,
    rewardChoices: 3,
    healAfterFight: 0,
    maxTurns: 30,
  },

  // Balance is information only for this practice run (see CLAUDE.md).
  targets: {
    runWinRate: { aim: 62, min: 55, max: 70 },
    fightTurns: { min: 4, max: 7 },
  },

  bot: {
    killBonus: 10,
    blockWeight: 1.3,
    drawValue: 5,
    exposeValue: 6,
    strTurnsDiv: 18,
    pickMin: 3,
    pick: { heavy: 9, whirl: 8, verdict: 8, twin: 7, cry: 7, sweep: 6, bash: 6, wall: 6, comet: 6, sunder: 5, focus: 5, jab: 4 },
  },

  // On screen only (the sim ignores these). Milliseconds.
  pace: {
    cardMs: 1.25, // each card's look.ms is stretched this much: the watched turn breathes more than A
    cardGapMs: 180, // a beat of stillness between cards, where the camera cuts
    director: true, // a camera cut per card (src/view/stage.js shots), back to the arena for the skeletons
    enemyMs: 700,
    turnGapMs: 300,
    fightGapMs: 900,
  },

  simRuns: 300,
};
