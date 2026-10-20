// Mode C, SPIRIT COMBO (Baten Kaitos-style; the screen calls it Spirit Combo): every number
// this mode uses. Ask for changes by name ("rules.chain.pickMs to 3000", "rules.spirit.pairPct
// to 40"). The cards, skeletons and fights are SHARED with modes A and B (src/core/cards.js);
// each card's spirit number is cards.<id>.spirit.
import { HERO, CARDS, STARTER_DECK, REWARD_POOL, ENEMIES, FIGHTS } from '../core/cards.js';

export const KAITOS = {
  mode: 'kaitos',
  hero: HERO,
  cards: CARDS,
  starterDeck: STARTER_DECK,
  rewardPool: REWARD_POOL,
  enemies: ENEMIES,
  fights: FIGHTS,

  rules: {
    energy: 0, // no energy in C: the combo limit and the timer are the budget
    draw: 6, // one more than the limit, so every turn leaves a choice
    handMax: 10,
    // The combo: up to `limit` cards a turn. The first has no timer; each next card must be
    // picked within pickMs of the one before (?tune=rules.chain.pickMs:3000). Finishers need
    // finisherMin cards before them and end the combo. An empty hand ends it too.
    chain: { limit: 5, pickMs: 2500, finisherMin: 3, finisherEnds: true },
    // Spirit numbers: a card matching the last card's number (a pair) or continuing a run of
    // consecutive numbers, up or down, to 3+ (a straight) gets extra damage and block:
    // pair +pairPct %; straight +straightPct % at 3 cards, x2 at 4, x3 at 5.
    spirit: { pairPct: 30, straightPct: 25, straightMin: 3 },
    // The shared combo moment from A and B still applies from the 3rd card on.
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
    delayMs: 900, // the bot takes this long to pick each card after the first (under pickMs)
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
    enemyMs: 620,
    turnGapMs: 250,
    fightGapMs: 900,
  },

  simRuns: 300,
};
