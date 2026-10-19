// npm run sim: play many seeded runs with the bot and rewrite BALANCE.md in plain words
// against the targets in each mode's data file. Rerun after any tuning change and quote
// the headline back. One section per mode; each lane edits only its own mode's section.
import { writeFileSync } from 'node:fs';
import { FAST } from '../src/fast/data.js';
import { createRun, act } from '../src/core/sim.js';
import { botAction } from '../src/core/bot.js';
import { digest } from '../src/core/rng.js';

const out = [];
const line = (s = '') => out.push(s);
const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const pct = (n, d) => `${Math.round((100 * n) / (d || 1))}%`;

export function playRun(data, seed) {
  const run = createRun(data, seed);
  while (!run.result) act(data, run, botAction(data, run));
  return run;
}

// Everything the report says about one mode, measured from N seeded bot runs.
function measure(data) {
  const N = data.simRuns;
  const runs = Array.from({ length: N }, (_, i) => playRun(data, i + 1));
  const fights = data.fights.map((spec, i) => {
    const st = runs.flatMap((r) => r.stats.filter((s) => s.fight === i));
    return { spec, reached: st.length, won: st.filter((s) => s.won).length, turns: avg(st.map((s) => s.turns)), shortest: Math.min(...st.map((s) => s.turns)), longest: Math.max(...st.map((s) => s.turns)), hpLost: avg(st.map((s) => s.hpLost)) };
  });
  const plays = {};
  const chains = [];
  let turns = 0;
  for (const r of runs) {
    let chain = 0;
    for (const ev of r.events) {
      if (ev.type === 'card') { plays[ev.id] = (plays[ev.id] ?? 0) + 1; chain = ev.chain; }
      if (ev.type === 'turnStart' || ev.type === 'fightWon' || ev.type === 'runEnd') { if (ev.type !== 'turnStart' || chain) chains.push(chain); if (ev.type === 'turnStart') turns++; chain = 0; }
    }
  }
  const picks = {};
  const offers = {};
  for (const r of runs) for (const ev of r.events) {
    if (ev.type === 'reward') for (const o of ev.options) offers[o] = (offers[o] ?? 0) + 1;
    if (ev.type === 'picked' && ev.card) picks[ev.card] = (picks[ev.card] ?? 0) + 1;
  }
  const wins = runs.filter((r) => r.result === 'win').length;
  return { N, runs, fights, plays, chains, turns, picks, offers, winPct: (100 * wins) / N, wins, hpLeft: avg(runs.filter((r) => r.result === 'win').map((r) => r.hp)) };
}

function section(title, data, m) {
  const T = data.targets;
  const winPass = m.winPct >= T.runWinRate.min && m.winPct <= T.runWinRate.max;
  const winLine = `Bot run win rate ${Math.round(m.winPct)}% against target ${T.runWinRate.aim}% (accepting ${T.runWinRate.min}-${T.runWinRate.max}%): **${winPass ? 'PASSES' : 'FAILS'}**${winPass ? '' : m.winPct > T.runWinRate.max ? ' (too easy)' : ' (too hard)'}.`;
  const lenBad = m.fights.filter((f) => f.reached && (f.turns < T.fightTurns.min || f.turns > T.fightTurns.max));
  const lenLine = `Fight length ${m.fights.map((f) => f.turns.toFixed(1)).join(' / ')} turns against target ${T.fightTurns.min}-${T.fightTurns.max}: **${lenBad.length ? 'FAILS' : 'PASSES'}**${lenBad.length ? ` (${lenBad.map((f) => f.spec.name).join(', ')} out of range)` : ''}.`;
  const sameTwice = digest(playRun(data, 1).events) === digest(playRun(data, 1).events);
  const head = `${title}: ${winPass && !lenBad.length ? 'all targets pass' : 'misses a target'}. Wins ${Math.round(m.winPct)}%, fights ${m.fights.map((f) => f.turns.toFixed(1)).join(' / ')} turns.`;

  const body = [];
  const b = (s = '') => body.push(s);
  b(`## Mode: ${title}`);
  b();
  b(`${m.N} seeded runs (seeds 1-${m.N}), played by the bot (src/core/bot.js).`);
  b();
  b(`- ${winLine}`);
  b(`- ${lenLine}`);
  b(`- Winning runs end with ${m.hpLeft.toFixed(0)} of ${data.hero.hp} HP on average.`);
  b(`- Same seed, same run: ${sameTwice ? 'yes (seed 1 played twice gives identical events)' : 'NO, the sim is not deterministic'}.`);
  b();
  b('### Fights');
  b();
  b('fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)');
  b('--- | --- | --- | --- | ---');
  for (const f of m.fights) b(`${f.spec.name}${f.spec.elite ? ' (elite)' : ''} | ${f.reached} | ${pct(f.won, f.reached)} | ${f.turns.toFixed(1)} (${f.shortest}-${f.longest}) | ${f.hpLost.toFixed(1)}`);
  b();
  b('### Combo moments');
  b();
  const reach3 = m.chains.filter((c) => c >= data.rules.combo.at).length;
  b(`- Turns where the bot plays ${data.rules.combo.at}+ cards (the combo moment): ${pct(reach3, m.chains.length)} of ${m.chains.length} turns.`);
  b(`- Cards per turn: ${avg(m.chains).toFixed(1)} on average; ${[1, 2, 3, 4, 5].map((n) => `${n}${n === 5 ? '+' : ''}: ${pct(m.chains.filter((c) => (n === 5 ? c >= 5 : c === n)).length, m.chains.length)}`).join(', ')}.`);
  b();
  b('### Does every card get used?');
  b();
  b('card | family | cost | offered | picked | played (all runs)');
  b('--- | --- | --- | --- | --- | ---');
  for (const c of Object.values(data.cards)) b(`${c.name} | ${c.family} | ${c.cost} | ${m.offers[c.id] ?? (data.starterDeck.includes(c.id) ? 'starter' : 0)} | ${m.picks[c.id] ?? '-'} | ${m.plays[c.id] ?? 0}`);
  const unused = Object.values(data.cards).filter((c) => !m.plays[c.id]);
  b();
  b(`- ${unused.length ? `Never played: ${unused.map((c) => c.name).join(', ')}.` : 'Every card was played at least once.'}`);
  return { head, body };
}

const A = section('A Fast', FAST, measure(FAST));

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Do not edit by hand.`);
line();
line('## Headline');
line();
line(`- ${A.head}`);
line('- B Plan then Watch: coming (not built yet).');
line('- C Spirit Combo: coming (not built yet).');
line();
for (const s of A.body) line(s);

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
