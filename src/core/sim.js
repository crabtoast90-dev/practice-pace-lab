// SHARED sim core: one run (3 fights, card picks, HP carries over). Pure and deterministic:
// no three.js, no DOM, no Math.random, no clock. Same data + same seed + same actions =
// same events, in Node and the browser. The view only plays back the events.
//
// Player input enters as actions (data):
//   { type: 'play', hand: <index in hand>, target: <enemy index> }
//   { type: 'end' }                       end the turn; the skeletons act
//   { type: 'pick', card: <card id> | null }  after a fight: take a card or skip
// Turn rules come from data.rules (energy, draw...), so each pace mode passes its own.
import { rand, shuffle } from './rng.js';

export function createRun(data, seed = 1) {
  const run = {
    seed,
    rng: seed >>> 0 || 1,
    maxHp: data.hero.hp,
    hp: data.hero.hp,
    deck: [],
    uid: 0,
    fightIndex: -1,
    fight: null,
    phase: 'fight', // fight (player's turn) | reward | won | lost
    reward: null,
    result: null,
    stats: [], // one entry per fight: turns, HP lost, cards played by family
    events: [],
  };
  for (const id of data.starterDeck) run.deck.push(newCard(run, id));
  startFight(data, run);
  return run;
}

const newCard = (run, id) => ({ uid: ++run.uid, id });
const emit = (run, ev) => (run.events.push(ev), ev);

export const intentOf = (data, e) => {
  const m = data.enemies[e.key].moves[e.move % data.enemies[e.key].moves.length];
  return { ...m, atk: m.atk ? m.atk + e.str : 0, hits: m.hits ?? 1 };
};
export const intentDamage = (data, e) => (e.alive ? intentOf(data, e).atk * intentOf(data, e).hits : 0);

// What the screen needs after any event: everyone's HP, block, strength and next move.
export function snap(data, f) {
  return {
    hero: { ...f.hero },
    energy: f.energy,
    enemies: f.enemies.map((e) => ({ hp: e.hp, block: e.block, str: e.str, exposed: e.exposed, alive: e.alive, intent: e.alive ? intentOf(data, e) : null })),
  };
}

function startFight(data, run) {
  run.fightIndex++;
  const spec = data.fights[run.fightIndex];
  const f = {
    turn: 0,
    hero: { hp: run.hp, block: 0, str: 0 },
    enemies: spec.enemies.map((key, i) => {
      const e = data.enemies[key];
      return { i, key, name: e.name, hp: e.hp, maxHp: e.hp, block: 0, str: 0, exposed: 0, alive: true, move: Math.floor(rand(run) * e.moves.length) };
    }),
    draw: shuffle(run, run.deck),
    discard: [],
    hand: [],
    energy: 0,
    played: 0,
    hpAtStart: run.hp,
    families: {},
  };
  run.fight = f;
  run.phase = 'fight';
  emit(run, {
    type: 'fightStart',
    fight: run.fightIndex,
    name: spec.name,
    elite: !!spec.elite,
    enemies: f.enemies.map((e) => ({ key: e.key, name: e.name, model: data.enemies[e.key].model, maxHp: e.maxHp })),
    snap: snap(data, f),
  });
  startTurn(data, run);
}

function drawCards(data, run, n) {
  const f = run.fight;
  const drawn = [];
  for (let i = 0; i < n && f.hand.length < data.rules.handMax; i++) {
    if (!f.draw.length) {
      if (!f.discard.length) break;
      f.draw = shuffle(run, f.discard);
      f.discard = [];
    }
    const c = f.draw.pop();
    f.hand.push(c);
    drawn.push(c);
  }
  return drawn;
}

function startTurn(data, run) {
  const f = run.fight;
  f.turn++;
  f.hero.block = 0;
  f.energy = data.rules.energy;
  f.played = 0;
  drawCards(data, run, data.rules.draw);
  emit(run, { type: 'turnStart', turn: f.turn, hand: f.hand.map((c) => ({ ...c })), drawPile: f.draw.length, discardPile: f.discard.length, snap: snap(data, f) });
}

// The card's numbers as they would land right now (strength, combo, per-card bonus):
// the hand shows these, and the plan preview in mode B uses them too.
// The combo reward this card's family gets if it is played now (rules.combo.bonus).
export const comboBonus = (data, card, playedBefore) => (playedBefore + 1 >= data.rules.combo.at ? data.rules.combo.bonus[card.family] ?? {} : {});

export function cardDamage(data, f, card, playedBefore = f.played) {
  if (!card.dmg) return 0;
  const d = card.dmg + (card.perCard ?? 0) * playedBefore + f.hero.str;
  return Math.floor(d * (1 + (comboBonus(data, card, playedBefore).dmgPct ?? 0) / 100));
}
export const cardBlock = (data, f, card, playedBefore = f.played) => (card.block ? Math.floor(card.block * (1 + (comboBonus(data, card, playedBefore).blockPct ?? 0) / 100)) : 0);
export const cardStr = (data, f, card, playedBefore = f.played) => (card.str ? card.str + (comboBonus(data, card, playedBefore).str ?? 0) : 0);
export const cardDraw = (data, f, card, playedBefore = f.played) => (card.draw ? card.draw + (comboBonus(data, card, playedBefore).draw ?? 0) : 0);

const firstAlive = (f) => f.enemies.findIndex((e) => e.alive);

// Resolve one card on a fight. Pure on the fight object (the bot plans with copies);
// drawing is left to the caller because a reshuffle needs the run's random numbers.
export function resolveCard(data, f, card, target) {
  const out = { hits: [], block: 0, str: 0, expose: 0, broke: 0, combo: f.played + 1 >= data.rules.combo.at, chain: f.played + 1 };
  if (!(f.enemies[target]?.alive)) target = firstAlive(f);
  const perHit = cardDamage(data, f, card);
  if (card.breakBlock && target >= 0) {
    out.broke = f.enemies[target].block;
    f.enemies[target].block = 0;
  }
  if (card.dmg) {
    for (let h = 0; h < (card.hits ?? 1); h++) {
      for (const e of card.all ? f.enemies : [f.enemies[target]]) {
        if (!e?.alive) continue;
        const amount = Math.floor(perHit * (e.exposed > 0 ? 1 + data.rules.exposePct / 100 : 1));
        const blocked = Math.min(e.block, amount);
        e.block -= blocked;
        e.hp = Math.max(0, e.hp - (amount - blocked));
        if (e.hp === 0) e.alive = false;
        out.hits.push({ target: e.i, hit: h, amount: amount - blocked, blocked, hpLeft: e.hp, killed: !e.alive });
      }
    }
  }
  if (card.block) f.hero.block += (out.block = cardBlock(data, f, card));
  if (card.str) f.hero.str += (out.str = cardStr(data, f, card));
  if (card.expose && f.enemies[target]?.alive) f.enemies[target].exposed = Math.max(f.enemies[target].exposed, (out.expose = card.expose));
  out.target = target;
  return out;
}

export function canPlay(data, run, handIndex) {
  const f = run.fight;
  const c = f?.hand[handIndex];
  return run.phase === 'fight' && !!c && data.cards[c.id].cost <= f.energy;
}

function play(data, run, handIndex, target) {
  const f = run.fight;
  const [inst] = f.hand.splice(handIndex, 1);
  const card = data.cards[inst.id];
  f.energy -= card.cost;
  const drawN = cardDraw(data, f, card);
  const r = resolveCard(data, f, card, target);
  f.played++;
  f.families[card.family] = (f.families[card.family] ?? 0) + 1;
  f.discard.push(inst);
  const drew = drawN ? drawCards(data, run, drawN).map((c) => ({ ...c })) : [];
  emit(run, { type: 'card', uid: inst.uid, id: inst.id, family: card.family, ...r, drew, snap: snap(data, f) });
  if (f.enemies.every((e) => !e.alive)) winFight(data, run);
}

function endTurn(data, run) {
  const f = run.fight;
  f.discard.push(...f.hand.splice(0));
  for (const e of f.enemies) {
    if (!e.alive) continue;
    e.block = 0;
    const m = intentOf(data, e);
    const hits = [];
    for (let h = 0; h < (m.atk ? m.hits : 0); h++) {
      const blocked = Math.min(f.hero.block, m.atk);
      f.hero.block -= blocked;
      f.hero.hp = Math.max(0, f.hero.hp - (m.atk - blocked));
      hits.push({ amount: m.atk - blocked, blocked, hpLeft: f.hero.hp });
      if (!f.hero.hp) break;
    }
    if (m.block) e.block += m.block;
    if (m.str) e.str += m.str;
    if (m.strAll) for (const o of f.enemies) if (o.alive) o.str += m.strAll;
    e.move++;
    emit(run, { type: 'enemy', who: e.i, move: m, hits, snap: snap(data, f) });
    if (!f.hero.hp) return loseRun(data, run);
  }
  for (const e of f.enemies) if (e.exposed > 0) e.exposed--;
  if (f.turn >= data.rules.maxTurns) return loseRun(data, run); // safety stop: a stalled fight is a loss
  startTurn(data, run);
}

function record(run, won) {
  const f = run.fight;
  run.stats.push({ fight: run.fightIndex, turns: f.turn, hpLost: f.hpAtStart - f.hero.hp, won, families: { ...f.families } });
}

function winFight(data, run) {
  const f = run.fight;
  run.hp = f.hero.hp;
  record(run, true);
  emit(run, { type: 'fightWon', fight: run.fightIndex, turns: f.turn, hp: run.hp });
  if (run.fightIndex === data.fights.length - 1) {
    run.phase = 'won';
    run.result = 'win';
    emit(run, { type: 'runEnd', result: 'win', hp: run.hp });
    return;
  }
  run.hp = Math.min(run.maxHp, run.hp + data.rules.healAfterFight);
  const options = shuffle(run, data.rewardPool).slice(0, data.rules.rewardChoices);
  run.phase = 'reward';
  run.reward = options;
  emit(run, { type: 'reward', options, hp: run.hp });
}

function loseRun(data, run) {
  run.hp = run.fight.hero.hp;
  record(run, false);
  run.phase = 'lost';
  run.result = 'lose';
  emit(run, { type: 'runEnd', result: 'lose', hp: run.hp });
}

// Apply one player action. Returns the events it caused (also kept in run.events).
export function act(data, run, action) {
  const before = run.events.length;
  if (action.type === 'play' && canPlay(data, run, action.hand)) play(data, run, action.hand, action.target ?? 0);
  else if (action.type === 'end' && run.phase === 'fight') endTurn(data, run);
  else if (action.type === 'pick' && run.phase === 'reward') {
    if (action.card && run.reward.includes(action.card)) run.deck.push(newCard(run, action.card));
    emit(run, { type: 'picked', card: action.card && run.reward.includes(action.card) ? action.card : null });
    run.reward = null;
    startFight(data, run);
  }
  return run.events.slice(before);
}
