// SHARED by every pace mode: the hero, the 15 cards, the skeletons and the 3 fights.
// Every mode's data file imports these, so ?tune reaches them by name
// (?tune=cards.strike.dmg:8, enemies.warrior.hp:50). Ask for changes by name.
//
// Card fields (all optional except id, name, family, cost, spirit):
//   dmg       damage per hit          hits    number of hits (default 1)
//   all       hits every enemy        perCard extra damage per card played before it this turn
//   block     block gained            str     strength gained (adds to every hit this fight)
//   draw      cards drawn             expose  turns the target takes +exposePct% damage
//   breakBlock removes the target's block before hitting
//   spirit    1-9, used by mode C's pairs and straights
//   look      { color, ms }: the card's own VFX color and how long its animation lasts
//             in mode A (the family decides the clip, the camera and the impact).

export const HERO = { name: 'Knight', model: 'hero', hp: 72 };

export const FAMILIES = ['light', 'heavy', 'area', 'buff', 'block', 'finisher'];

export const CARDS = {
  // light hit
  strike: { id: 'strike', name: 'Strike', family: 'light', cost: 1, spirit: 3, dmg: 6, look: { color: '#ffd27a', ms: 520 } },
  jab: { id: 'jab', name: 'Quick Jab', family: 'light', cost: 0, spirit: 1, dmg: 3, look: { color: '#9fe8ff', ms: 420 } },
  twin: { id: 'twin', name: 'Twin Slash', family: 'light', cost: 1, spirit: 4, dmg: 4, hits: 2, look: { color: '#ff9f5a', ms: 640 } },
  // heavy hit
  heavy: { id: 'heavy', name: 'Heavy Blow', family: 'heavy', cost: 2, spirit: 8, dmg: 15, look: { color: '#ff5a3c', ms: 780 } },
  chop: { id: 'chop', name: 'Crushing Chop', family: 'heavy', cost: 2, spirit: 6, dmg: 9, expose: 2, look: { color: '#c86bff', ms: 760 } },
  sunder: { id: 'sunder', name: 'Sunder', family: 'heavy', cost: 1, spirit: 5, dmg: 8, breakBlock: true, look: { color: '#ffb347', ms: 680 } },
  // area
  sweep: { id: 'sweep', name: 'Sweep', family: 'area', cost: 1, spirit: 4, dmg: 5, all: true, look: { color: '#7affc1', ms: 620 } },
  whirl: { id: 'whirl', name: 'Whirlwind', family: 'area', cost: 2, spirit: 7, dmg: 4, hits: 2, all: true, look: { color: '#5ac8ff', ms: 800 } },
  // buff
  cry: { id: 'cry', name: 'Battle Cry', family: 'buff', cost: 1, spirit: 2, str: 2, look: { color: '#ff6b6b', ms: 560 } },
  focus: { id: 'focus', name: 'Focus', family: 'buff', cost: 0, spirit: 1, draw: 2, look: { color: '#b0a0ff', ms: 440 } },
  // block
  guard: { id: 'guard', name: 'Guard', family: 'block', cost: 1, spirit: 2, block: 5, look: { color: '#8fd3ff', ms: 440 } },
  bash: { id: 'bash', name: 'Shield Bash', family: 'block', cost: 1, spirit: 5, block: 5, dmg: 5, look: { color: '#e0e6ff', ms: 600 } },
  wall: { id: 'wall', name: 'Iron Wall', family: 'block', cost: 2, spirit: 6, block: 13, look: { color: '#6fa8ff', ms: 560 } },
  // finisher (mode A: a 2 s cinematic; mode C: needs 3+ cards before it and ends the combo)
  verdict: { id: 'verdict', name: 'Final Verdict', family: 'finisher', cost: 1, spirit: 9, dmg: 6, perCard: 4, look: { color: '#fff3a0', ms: 2000 } },
  comet: { id: 'comet', name: 'Skyfall', family: 'finisher', cost: 2, spirit: 9, dmg: 4, perCard: 3, all: true, look: { color: '#ff7ad9', ms: 2000 } },
};

export const STARTER_DECK = ['strike', 'strike', 'strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'guard', 'chop'];
export const REWARD_POOL = ['jab', 'twin', 'heavy', 'sunder', 'sweep', 'whirl', 'cry', 'focus', 'bash', 'wall', 'verdict', 'comet'];

// Skeletons. moves cycle in order from a seeded starting point; the next move shows as
// the intent. atk x hits at the hero; block for itself; str for itself, or strAll for every
// skeleton in the fight. model = a FIGURES key in src/view/units.js.
export const ENEMIES = {
  warrior: { name: 'Bone Warrior', model: 'warrior', hp: 48, moves: [{ atk: 5 }, { atk: 3, block: 6 }, { atk: 7 }] },
  minion: { name: 'Bone Minion', model: 'minion', hp: 19, moves: [{ atk: 2 }, { atk: 2, hits: 2 }] },
  rogue: { name: 'Bone Stalker', model: 'rogue', hp: 41, moves: [{ atk: 2, hits: 3 }, { atk: 5 }, { block: 8, str: 2 }] },
  mage: { name: 'Bone Caster', model: 'mage', hp: 34, moves: [{ strAll: 2 }, { atk: 4 }, { atk: 6 }] },
  champion: { name: 'Bone Champion', model: 'champion', hp: 92, moves: [{ atk: 7 }, { block: 10, str: 3 }, { atk: 4, hits: 2 }, { atk: 10 }] },
};

// The run: three fights in order; the last is the elite.
export const FIGHTS = [
  { name: 'Crypt Gate', enemies: ['warrior', 'minion'] },
  { name: 'Ossuary', enemies: ['rogue', 'mage'] },
  { name: 'Champion of Bone', elite: true, enemies: ['champion', 'minion'] },
];
