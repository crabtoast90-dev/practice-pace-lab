// Mode A, FAST: every number this mode uses. Ask for changes by name
// ("rules.energy to 4", "cards.strike.dmg to 7", "pace.enemyMs to 500").
// The cards, skeletons and fights are SHARED with modes B and C (src/core/cards.js);
// they are copied in here so ?tune reaches them by the same names.
import { HERO, CARDS, STARTER_DECK, REWARD_POOL, ENEMIES, FIGHTS } from '../core/cards.js';

export const FAST = {
  mode: 'fast',
  hero: HERO,
  cards: CARDS,
  starterDeck: STARTER_DECK,
  rewardPool: REWARD_POOL,
  enemies: ENEMIES,
  fights: FIGHTS,

  // Turn rules (the sim).
  rules: {
    energy: 3, // per turn
    draw: 5, // cards drawn each turn
    handMax: 10,
    combo: { at: 3, bonusPct: 25 }, // the 3rd card of a turn onward deals +25%: the combo moment
    exposePct: 50, // an exposed skeleton takes +50% damage
    rewardChoices: 3, // pick 1 of 3 after each fight (or skip)
    healAfterFight: 0, // HP carries over as it is
    maxTurns: 30, // safety stop: a fight this long counts as a loss
  },

  // Targets Brian set; npm run sim says pass / fail for each in BALANCE.md.
  targets: {
    runWinRate: { aim: 62, min: 55, max: 70 }, // % of seeded runs the bot wins
    fightTurns: { min: 4, max: 7 }, // average turns per fight, every fight
  },

  // The "decent player" bot (src/core/bot.js): how it values things, and its card picks.
  bot: {
    killBonus: 10, // + 2 x the dead skeleton's next attack
    blockWeight: 1.3, // block that stops an incoming hit is worth a bit more than damage
    drawValue: 5, // per card drawn
    exposeValue: 6,
    strTurnsDiv: 18, // strength is worth more while the skeletons have lots of HP left
    pickMin: 3, // skip the reward if nothing scores at least this
    pick: { heavy: 9, whirl: 8, verdict: 8, twin: 7, cry: 7, sweep: 6, bash: 6, wall: 6, comet: 6, sunder: 5, focus: 5, jab: 4 },
  },

  // On screen only (the sim ignores these). Milliseconds. Each card's own length is
  // cards.<id>.look.ms (0.4-0.8 s; finishers 2 s); src/view/families.js holds the rest
  // of each family's feel (clip, hit-stop, shake, camera).
  pace: {
    speeds: [1, 2], // the 1x / 2x toggle
    enemyMs: 620, // one skeleton's attack
    turnGapMs: 250, // pause before the hand is dealt
    fightGapMs: 900, // after the last skeleton falls, before the reward
  },

  simRuns: 600, // how many seeded runs npm run sim plays
};
