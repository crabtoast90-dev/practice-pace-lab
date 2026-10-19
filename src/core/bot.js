// SHARED "decent player" bot for npm run sim and the check. Pure like the sim.
// Each decision it tries every order of the cards it can afford this turn (on copies of
// the fight), scores where each order leaves the fight, and plays the first card of the
// best one; then it plans again (so drawn cards count). Its weights live in each mode's
// data file under bot (ask for changes by name).
import { resolveCard, intentDamage } from './sim.js';

function copyFight(f) {
  return { ...f, hero: { ...f.hero }, enemies: f.enemies.map((e) => ({ ...e })), hand: f.hand.slice(), drawn: f.drawn ?? 0 };
}

function score(data, f0, f) {
  const w = data.bot;
  let s = 0;
  let incoming = 0;
  const hpLeft = f.enemies.reduce((t, e) => t + (e.alive ? e.hp : 0), 0);
  const turnsLeft = Math.min(5, Math.max(0.5, hpLeft / w.strTurnsDiv));
  for (const [i, e] of f.enemies.entries()) {
    const e0 = f0.enemies[i];
    s += e0.hp - e.hp;
    if (e0.alive && !e.alive) s += w.killBonus + 2 * intentDamage(data, e0);
    if (e.alive) {
      incoming += intentDamage(data, e);
      if (e.exposed > e0.exposed) s += w.exposeValue;
    }
  }
  if (f.enemies.every((e) => !e.alive)) s += 1000;
  s += w.blockWeight * Math.min(f.hero.block, incoming);
  s += (f.hero.str - f0.hero.str) * 2 * turnsLeft;
  s += w.drawValue * (f.drawn ?? 0);
  return s;
}

// Best first move from this fight state: { score, action } (action null = end the turn).
function plan(data, f0) {
  let best = { score: score(data, f0, f0), action: null };
  const seen = new Set();
  function dfs(f, first) {
    const tried = new Set();
    for (let h = 0; h < f.hand.length; h++) {
      const card = data.cards[f.hand[h].id];
      if (card.cost > f.energy || tried.has(card.id)) continue;
      tried.add(card.id);
      const targets = card.dmg && !card.all ? f.enemies.filter((e) => e.alive).map((e) => e.i) : [Math.max(0, f.enemies.findIndex((e) => e.alive))];
      for (const t of targets) {
        const g = copyFight(f);
        g.hand.splice(h, 1);
        g.energy -= card.cost;
        resolveCard(data, g, card, t);
        g.played++;
        g.drawn += card.draw ?? 0;
        const action = first ?? { type: 'play', hand: h, target: t };
        const sc = score(data, f0, g);
        if (sc > best.score + 1e-9) best = { score: sc, action };
        const key = `${g.hand.map((c) => c.id).sort()}|${g.energy}|${g.enemies.map((e) => `${e.hp}.${e.block}.${e.exposed}`)}|${g.hero.block}.${g.hero.str}|${action.hand}.${action.target}`;
        if (seen.has(key) || g.enemies.every((e) => !e.alive)) continue;
        seen.add(key);
        dfs(g, action);
      }
    }
  }
  dfs(copyFight(f0), null);
  return best;
}

export function botAction(data, run) {
  if (run.phase === 'reward') {
    const pick = run.reward.reduce((a, id) => ((data.bot.pick[id] ?? 0) > (data.bot.pick[a] ?? 0) ? id : a), run.reward[0]);
    return { type: 'pick', card: (data.bot.pick[pick] ?? 0) >= data.bot.pickMin ? pick : null };
  }
  if (run.phase !== 'fight') return null;
  return plan(data, run.fight).action ?? { type: 'end' };
}
