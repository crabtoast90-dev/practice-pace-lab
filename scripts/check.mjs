// npm run check: build, open the site headless on laptop and phone, play every mode through
// its real buttons on the test clock, save screenshots, and fail on console errors, failed
// requests, a frozen state, figures out of frame, or a browser run that differs from the
// same run in Node. Add steps here for every feature you build (one section per mode).
//   npm run check                    build and check this checkout
//   npm run check -- --url=<live>    check a deployed site instead
//   npm run check -- --only=feel     only the runs whose name contains "feel" (quick iteration;
//                                    the full check must still pass before a merge)
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAST } from '../src/fast/data.js';
import { PLAN } from '../src/plan/data.js';
import { KAITOS } from '../src/kaitos/data.js';
import { createRun, act, canPlay } from '../src/core/sim.js';
import { botAction } from '../src/core/bot.js';
import { digest } from '../src/core/rng.js';
import { applyTune, applyDeck } from '../src/tune.js';

const RUNS = 'check-output';
const KEEP = 5;
const OUT = join(RUNS, new Date().toISOString().replace(/[:.]/g, '-')); // one folder per run
const URL_ARG = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const SEED = 1;
const LOSE_TUNE = 'hero.hp:14'; // a hero weak enough to fall, to check the Defeat path
const KAITOS_DECK = 'guard,strike,guard,twin,strike,jab'; // dealt spirits: guard 1, strike 2, guard 3, twin 4, strike 4, jab 1
const PLAN_DRAW_DECK = 'strike,focus,guard,jab,heavy,sweep,cry'; // seed 1 opens with jab, sweep, heavy, focus, cry; Focus draws strike + guard
const FEEL_DECK = 'jab,jab,strike,verdict,guard'; // turn 1 = jab, jab, strike (combo), Final Verdict (finisher), Guard (block combo)

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined; // playwright's own download, if installed
}

const failures = [];
const log = [];
const summaries = [];
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(RUNS).filter((f) => /^\d{4}-/.test(f)).sort().slice(0, -KEEP)) rmSync(join(RUNS, old), { recursive: true, force: true });

function botRun(data, seed) {
  const run = createRun(data, seed);
  while (!run.result) act(data, run, botAction(data, run));
  return run;
}

// Node determinism: the same seed must give the same run, event for event.
for (const seed of [SEED, 2, 3]) {
  const [x, y] = [botRun(FAST, seed), botRun(FAST, seed)];
  if (digest(x.events) !== digest(y.events)) failures.push(`[node] fast seed ${seed}: two runs differ`);
  else summaries.push(`[node] fast seed ${seed} run twice: identical (${x.result}, ${x.stats.map((s) => `${s.turns} turns`).join(' / ')})`);
}

// Mode C rules in Node: a finisher needs 3 cards first and ends the combo; a late pick times out.
{
  const d = applyDeck(KAITOS, 'verdict,strike,strike,strike,guard,guard');
  const r = createRun(d, SEED);
  const idx = (id) => r.fight.hand.findIndex((c) => c.id === id);
  const early = canPlay(d, r, idx('verdict'));
  for (let i = 0; i < 3; i++) act(d, r, { type: 'play', hand: idx('strike') >= 0 ? idx('strike') : idx('guard'), target: 0, atMs: i ? 500 : 0 });
  const ready = canPlay(d, r, idx('verdict'));
  const evs = act(d, r, { type: 'play', hand: idx('verdict'), target: 0, atMs: 500 });
  const ended = evs.find((e) => e.type === 'comboEnd')?.reason;
  const r2 = createRun(d, SEED);
  act(d, r2, { type: 'play', hand: 1, target: 0, atMs: 0 });
  const late = act(d, r2, { type: 'play', hand: 0, target: 0, atMs: d.rules.chain.pickMs + 1 }).find((e) => e.type === 'comboEnd')?.reason;
  if (early || !ready || ended !== 'finisher' || late !== 'timeout') failures.push(`[node] mode C rules: finisher early ${early}, after 3 ${ready}, ends combo ${ended}; late pick ${late}`);
  else summaries.push('[node] mode C rules: finisher locked until 3 cards, then ends the combo; a late pick times out');
}

let server;
let base = URL_ARG;
if (!base) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port: 4327, strictPort: false }, logLevel: 'warn' });
  base = server.resolvedUrls.local[0];
}
const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const shot = (page, name, step) => page.screenshot({ path: join(OUT, `${name}-${step}.png`) });
const state = (page) => page.evaluate(() => window.__game.state());
const advance = (page, ms) => page.evaluate((t) => window.__game.advance(t), ms);

async function run(name, contextOptions, script, extra = '') {
  if (ONLY && !name.includes(ONLY)) return;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on('console', (msg) => {
    const line = `[${name}] console.${msg.type()}: ${msg.text()}`;
    log.push(line);
    if (msg.type() === 'error') failures.push(line);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failures.push(`[${name}] HTTP ${res.status()} ${res.url()}`);
  });
  page.on('pageerror', (err) => failures.push(`[${name}] page error: ${err.message}`));
  const url = new URL(base);
  url.search = `?test&seed=${SEED}${extra}`;
  await page.goto(url.href.replace('test=', 'test'));
  await page.waitForFunction(() => window.__game?.state().loaded, null, { timeout: 60000 });
  await script(page, name);
  await context.close();
}

// Every figure's feet and head must be on screen (x within 85% so the body and weapon fit
// too; the head below the top bar; the feet above the hand).
function checkFraming(name, s, feetMin) {
  for (const f of s.framing) {
    const [fx, fy] = f.feet;
    const [hx, hy] = f.head;
    if (Math.abs(fx) > 0.85 || Math.abs(hx) > 0.85 || fy < feetMin || hy > 0.8) failures.push(`[${name}] ${f.id} out of frame (feet ${f.feet}, head ${f.head})`);
  }
}

// The test clock must move the figures' idle loops (a frozen state fails).
async function checkAlive(page, name) {
  const a = (await state(page)).figures.map((f) => f.clipTime);
  await advance(page, 300);
  const b = (await state(page)).figures.map((f) => f.clipTime);
  if (!a.length || a.every((t, i) => t === b[i])) failures.push(`[${name}] figures frozen: animation clock did not move`);
}

async function waitFor(page, name, what, test, stepMs = 50, maxMs = 30000) {
  let s = await state(page);
  for (let t = 0; t < maxMs && !test(s); t += stepMs) {
    await advance(page, stepMs);
    s = await state(page);
  }
  if (!test(s)) failures.push(`[${name}] waited ${maxMs / 1000} s for ${what}`);
  return s;
}

// ---- Mode A: play a whole run with the bot through the real buttons ----
// Taps: the target's plate (when it changes), then the card; End turn; reward cards.
async function tapBotMove(page, click, s) {
  const a = await page.evaluate(() => window.__game.bot());
  if (a.type === 'play') {
    if (a.target !== null && a.target !== s.mode.target) await click(`.plate.foe[data-target="${a.target}"]`);
    await click(`#hand .card[data-uid="${a.uid}"]`);
  } else if (a.type === 'end') await click('#end-turn');
  else if (a.type === 'pick') await click(a.card ? `#reward-cards .card[data-card="${a.card}"]` : '#reward-skip');
  return a;
}

async function playFast(page, name, click, data, { want, shots = true } = {}) {
  const node = botRun(data, SEED);
  const taken = new Set();
  const snapOnce = async (key, cond) => { if (shots && cond && !taken.has(key)) { taken.add(key); await shot(page, name, key); } };
  await click('#speed'); // the full runs play at 2x (the feel run checks 1x)
  let s = await state(page);
  let lastBeats = -1;
  let still = 0;
  let moves = 0;
  for (let i = 0; i < 6000; i++) {
    const m = s.mode;
    if (m.result && !m.busy) break;
    const rewardUp = m.phase === 'reward' && !m.busy;
    if (m.inputReady || rewardUp) {
      await snapOnce('3-reward', rewardUp);
      await snapOnce('6-elite', m.inputReady && m.fight === 2 && m.played === 0);
      const a = await tapBotMove(page, click, s);
      moves++;
      if (a.type === 'pick') { await advance(page, 120); s = await state(page); continue; }
      await advance(page, a.type === 'play' ? 140 : 60);
    } else {
      await advance(page, 100);
    }
    s = await state(page);
    await snapOnce('2-impact', s.mode.hitStop && s.mode.lastCard && s.mode.impacts > 0);
    await snapOnce('4-combo', s.mode.hitStop && s.mode.combos > 0);
    await snapOnce('5-skeleton-turn', s.mode.lastEvent === 'enemy' && s.mode.hitStop);
    if (s.mode.beats === lastBeats && !s.mode.inputReady && !(s.mode.phase === 'reward')) { if (++still > 200) { failures.push(`[${name}] playback stuck after ${lastBeats} beats`); break; } } else still = 0;
    lastBeats = s.mode.beats;
  }
  s = await waitFor(page, name, 'the result screen', (x) => x.mode.result && !x.mode.busy);
  await advance(page, 300);
  await shot(page, name, '7-result');
  if (!(await page.isVisible('#run-end'))) failures.push(`[${name}] result panel not shown`);
  const nodeDigest = digest(node.events);
  if (s.mode.result !== node.result || s.mode.digest !== nodeDigest) failures.push(`[${name}] run differs from Node (browser ${s.mode.result} ${s.mode.digest}, Node ${node.result} ${nodeDigest})`);
  else summaries.push(`[${name}] run played to the end through the buttons (${moves} taps): ${s.mode.result}, matches Node (${nodeDigest})`);
  if (s.mode.hp.hero !== node.hp) failures.push(`[${name}] screen shows hero HP ${s.mode.hp.hero}, sim says ${node.hp}`);
  if (want && s.mode.result !== want) failures.push(`[${name}] expected ${want}, got ${s.mode.result}`);
  summaries.push(`## ${name} result\n${await page.evaluate(() => window.__game.stateText())}`);
  await click('#again');
  await advance(page, 100);
  s = await state(page);
  if (s.mode.fight !== 0 || s.mode.result || s.mode.turn !== 1) failures.push(`[${name}] Play again did not restart the run`);
}

async function walk(page, name, click, feetMin) {
  await advance(page, 100);
  let s = await state(page);
  if (s.screen !== 'start') failures.push(`[${name}] expected the start screen, got ${s.screen}`);
  if (!(await page.isEnabled('.mode[data-mode="fast"]'))) failures.push(`[${name}] mode A button not enabled after loading`);
  await shot(page, name, '0-start');
  await click('.mode[data-mode="fast"]');
  s = await waitFor(page, name, 'the first hand', (x) => x.mode?.inputReady);
  if (s.screen !== 'fast' || s.figures.length !== 3) failures.push(`[${name}] fast: screen ${s.screen}, ${s.figures.length} figures (expected 3)`);
  checkFraming(name, s, feetMin);
  await checkAlive(page, name);
  if ((await page.locator('#hand .card').count()) !== FAST.rules.draw) failures.push(`[${name}] expected ${FAST.rules.draw} cards in hand`);
  await shot(page, name, '1-fight');
  summaries.push(`## ${name} fight 1\n${await page.evaluate(() => window.__game.stateText())}`);
  await playFast(page, name, click, FAST);
  await click('#back');
  await advance(page, 100);
  if ((await state(page)).screen !== 'start') failures.push(`[${name}] back did not return to the start screen`);
}

// The feel slice on a fixed deck: two jabs, Strike lands as the combo, Final Verdict's
// cinematic; then 2x speed and Skip on the skeletons' turn. Node replays the same taps.
async function feel(page, name, click) {
  const data = applyDeck(FAST, FEEL_DECK);
  let s = await waitFor(page, name, 'the first hand', (x) => x.mode?.inputReady);
  const tapCard = async (id) => {
    const uid = await page.evaluate((cid) => { const el = [...document.querySelectorAll('#hand .card')].find((e) => e.querySelector('.cname').textContent === cid); return el?.dataset.uid; }, data.cards[id].name);
    if (!uid) return failures.push(`[${name}] ${id} not in hand`);
    await click(`#hand .card[data-uid="${uid}"]`);
  };
  await tapCard('jab');
  await advance(page, 120);
  await tapCard('jab');
  await tapCard('strike'); // taps can run ahead of the animations
  s = await waitFor(page, name, 'the combo impact', (x) => x.mode.combos > 0 && x.mode.hitStop, 10);
  await shot(page, name, '1-combo');
  if (!(await page.isVisible('#banner'))) failures.push(`[${name}] no combo banner on the 3rd card`);
  if (s.mode.chain !== 3) failures.push(`[${name}] combo landed on card ${s.mode.chain}, expected the 3rd`);
  await tapCard('verdict');
  s = await waitFor(page, name, 'the finisher cinematic', (x) => x.mode.cinematic, 10);
  await advance(page, 450);
  await shot(page, name, '2-finisher-windup');
  s = await waitFor(page, name, 'the finisher impact', (x) => x.mode.finishers > 0 && x.mode.hitStop, 10);
  await advance(page, 40);
  await shot(page, name, '3-finisher-impact');
  const t0 = s.time;
  s = await waitFor(page, name, 'the finisher to end', (x) => !x.mode.cinematic && !x.mode.busy, 20);
  summaries.push(`[${name}] combo on card 3, finisher cinematic ${((s.time - t0) * 1000).toFixed(0)} ms after impact until the camera came back`);
  // Block gets its own combo reward (Brian's pick): Guard as the 5th card blocks 5 + 50%.
  const combosBefore = s.mode.combos;
  await tapCard('guard');
  s = await waitFor(page, name, 'the block combo', (x) => x.mode.combos > combosBefore, 10);
  await advance(page, 60);
  await shot(page, name, '3b-block-combo');
  s = await waitFor(page, name, 'the block combo to end', (x) => !x.mode.busy, 20);
  const wantBlock = Math.floor(data.cards.guard.block * (1 + data.rules.combo.bonus.block.blockPct / 100));
  if (s.mode.simHp && (await page.evaluate(() => window.__game.state().mode)).played !== 5) failures.push(`[${name}] Guard was not played as the 5th card`);
  const heroTags = await page.locator('.plate.hero .tags').textContent();
  if (!heroTags.includes(`${wantBlock} block`)) failures.push(`[${name}] combo Guard should show ${wantBlock} block, plate says "${heroTags}"`);
  else summaries.push(`[${name}] Guard as card 5 lands the combo: ${wantBlock} block`);
  await click('#speed');
  if ((await state(page)).mode.speed !== 2) failures.push(`[${name}] speed toggle did not switch to 2x`);
  await click('#end-turn');
  await advance(page, 300);
  await shot(page, name, '4-skeleton-turn-2x');
  await click('#skip');
  await advance(page, 20);
  s = await state(page);
  if (s.mode.busy) failures.push(`[${name}] Skip left animations queued`);
  if (s.mode.hp.hero !== s.mode.simHp.hero || s.mode.hp.foes.join() !== s.mode.simHp.foes.join()) failures.push(`[${name}] after Skip the screen HP ${JSON.stringify(s.mode.hp)} differs from the sim ${JSON.stringify(s.mode.simHp)}`);
  s = await waitFor(page, name, 'turn 2', (x) => x.mode.inputReady);
  await shot(page, name, '5-turn-2');
  // Node: the same taps on the same deck and seed.
  const node = createRun(data, SEED);
  for (const id of ['jab', 'jab', 'strike', 'verdict', 'guard']) act(data, node, { type: 'play', hand: node.fight.hand.findIndex((c) => c.id === id), target: 0 });
  act(data, node, { type: 'end' });
  if (s.mode.digest !== digest(node.events)) failures.push(`[${name}] feel run differs from Node (browser ${s.mode.digest}, Node ${digest(node.events)})`);
  else summaries.push(`[${name}] feel run matches Node (${digest(node.events)}); 2x and Skip work`);
}

// ?mode skips the start screen; ?tune changes numbers by name (Node applies the same string).
async function tunedLoss(page, name, click) {
  await advance(page, 100);
  if ((await state(page)).screen !== 'fast') failures.push(`[${name}] ?mode=fast did not skip the start screen`);
  await playFast(page, name, click, applyTune(FAST, LOSE_TUNE), { want: 'lose', shots: false });
}

// ?debug shows the FPS overlay.
async function debugOverlay(page, name) {
  await advance(page, 100);
  if (!(await page.isVisible('#fps'))) failures.push(`[${name}] ?debug did not show the FPS overlay`);
  summaries.push(`[${name}] ?debug overlay visible`);
}

// ---- Mode B: Plan then Watch ----
const planState = async (page) => (await state(page)).mode;

// Turn 1 by hand: queue the bot's cards, un-queue one and re-queue it, read the previews,
// GO, and check the screen lands exactly on the previews. Then the rest of the run with the
// bot (Skip after each GO, to keep the check short), compared with Node.
async function walkPlan(page, name, click, feetMin) {
  await advance(page, 100);
  if (!(await page.isEnabled('.mode[data-mode="plan"]'))) failures.push(`[${name}] mode B button not enabled`);
  await click('.mode[data-mode="plan"]');
  let s = await waitFor(page, name, 'the first plan', (x) => x.mode?.planning);
  checkFraming(name, s, feetMin);
  await shot(page, name, '1-plan-empty');
  const startFoes = s.mode.hp.foes.join('/');
  // Queue the bot's first card, take it back out, put it back.
  let a = await page.evaluate(() => window.__game.bot());
  if (a.target !== null && a.target !== s.mode.target) await click(`.plate.foe[data-target="${a.target}"]`);
  await click(`#hand .card[data-uid="${a.uid}"]`);
  await advance(page, 50);
  s = await state(page);
  if (s.mode.queue.length !== 1 || s.mode.busy) failures.push(`[${name}] queueing a card should not play it (queue ${s.mode.queue}, busy ${s.mode.busy})`);
  await click('#queue .qcard[data-i="0"]');
  await advance(page, 50);
  s = await state(page);
  if (s.mode.queue.length !== 0 || s.mode.preview.foes.join('/') !== startFoes) failures.push(`[${name}] un-queue did not restore the turn (queue ${s.mode.queue}, preview ${s.mode.preview.foes})`);
  // Plan the whole turn with the bot.
  for (let i = 0; i < 12; i++) {
    a = await page.evaluate(() => window.__game.bot());
    if (a.type !== 'play') break;
    s = await state(page);
    if (a.target !== null && a.target !== s.mode.target) await click(`.plate.foe[data-target="${a.target}"]`);
    await click(`#hand .card[data-uid="${a.uid}"]`);
    await advance(page, 40);
  }
  s = await state(page);
  const pv = s.mode.preview;
  const shownPv = await page.locator('.plate.foe .pv').allTextContents();
  await shot(page, name, '2-plan-queued');
  summaries.push(`[${name}] planned ${s.mode.queue.join(', ')}: preview skeletons ${pv.foes.join('/')}, hero ends the round at ${pv.hero} HP (plates show ${shownPv.join('/') || 'no change'})`);
  if (!s.mode.queue.length) failures.push(`[${name}] the bot planned nothing on turn 1`);
  await click('#end-turn');
  s = await waitFor(page, name, 'a camera cut', (x) => x.mode.cuts > 0 && x.mode.hitStop, 10, 8000);
  await shot(page, name, '3-watch-cut');
  s = await waitFor(page, name, 'the turn to play out', (x) => !x.mode.busy && (x.mode.planning || x.mode.phase !== 'fight'), 50);
  if (s.mode.hp.foes.join('/') !== pv.foes.join('/') || s.mode.hp.hero !== pv.hero) failures.push(`[${name}] the turn did not land on its preview (screen skeletons ${s.mode.hp.foes}, hero ${s.mode.hp.hero}; preview ${pv.foes}, ${pv.hero})`);
  else summaries.push(`[${name}] GO played ${s.mode.cuts} camera cuts and landed exactly on the preview`);
  await shot(page, name, '4-turn-2');
  // The rest of the run.
  const node = botRun(PLAN, SEED);
  let taps = 0;
  for (let i = 0; i < 3000; i++) {
    s = await state(page);
    if (s.mode.result && !s.mode.busy && !s.mode.queue.length) break; // a plan that wins still needs its GO
    const rewardUp = s.mode.phase === 'reward' && !s.mode.busy && !s.mode.queue.length;
    if (!s.mode.inputReady && !rewardUp) { await advance(page, 100); continue; }
    a = await page.evaluate(() => window.__game.bot());
    taps++;
    if (a.type === 'play') {
      if (a.target !== null && a.target !== s.mode.target) await click(`.plate.foe[data-target="${a.target}"]`);
      await click(`#hand .card[data-uid="${a.uid}"]`);
    } else if (a.type === 'go') {
      await click('#end-turn');
      await advance(page, 100);
      if ((await page.isVisible('#skip')) && (await page.isEnabled('#skip'))) await click('#skip');
    } else if (a.type === 'pick') {
      if (!taken.reward) { taken.reward = true; await shot(page, name, '5-reward'); }
      await click(a.card ? `#reward-cards .card[data-card="${a.card}"]` : '#reward-skip');
    }
    await advance(page, 60);
  }
  s = await waitFor(page, name, 'the result screen', (x) => x.mode.result && !x.mode.busy && !x.mode.queue.length);
  await advance(page, 300);
  await shot(page, name, '6-result');
  if (!(await page.isVisible('#run-end'))) failures.push(`[${name}] result panel not shown`);
  if (s.mode.hp.foes.join() !== s.mode.simHp.foes.join() || s.mode.hp.hero !== s.mode.simHp.hero) failures.push(`[${name}] final screen HP ${JSON.stringify(s.mode.hp)} differs from the sim ${JSON.stringify(s.mode.simHp)}`);
  if (s.mode.digest !== digest(node.events)) failures.push(`[${name}] run differs from Node (browser ${s.mode.result} ${s.mode.digest}, Node ${node.result} ${digest(node.events)})`);
  else summaries.push(`[${name}] run planned to the end through the buttons (${taps} taps): ${s.mode.result}, matches Node (${digest(node.events)})`);
  summaries.push(`## ${name} result\n${await page.evaluate(() => window.__game.stateText())}`);
}
const taken = {};

// Draw cards resolve when queued and lock; cards after them still un-queue.
async function planDraw(page, name, click) {
  const data = applyDeck(PLAN, PLAN_DRAW_DECK);
  let s = await waitFor(page, name, 'the first plan', (x) => x.mode?.planning);
  const tap = async (id) => {
    const uid = await page.evaluate((cname) => [...document.querySelectorAll('#hand .card')].find((e) => e.querySelector('.cname').textContent === cname)?.dataset.uid, data.cards[id].name);
    if (!uid) return failures.push(`[${name}] ${id} not in hand`);
    await click(`#hand .card[data-uid="${uid}"]`);
    await advance(page, 40);
  };
  await tap('jab');
  await tap('focus');
  s = await state(page);
  if (!s.mode.hand.includes('strike') || !s.mode.hand.includes('guard')) failures.push(`[${name}] Focus did not draw at once (hand ${s.mode.hand})`);
  await tap('sweep');
  await tap('strike');
  await shot(page, name, '1-draw-locked');
  await click('#queue .qcard[data-i="1"]'); // Focus: locked
  await advance(page, 40);
  if ((await planState(page)).queue.join() !== 'jab,focus,sweep,strike') failures.push(`[${name}] a locked draw card came out of the queue`);
  await click('#queue .qcard[data-i="2"]'); // Sweep: free
  await advance(page, 40);
  s = await state(page);
  if (s.mode.queue.join() !== 'jab,focus,strike') failures.push(`[${name}] Sweep did not un-queue (queue ${s.mode.queue})`);
  await click('#end-turn');
  s = await waitFor(page, name, 'the next plan', (x) => x.mode.planning && x.mode.turn === 2, 50);
  const node = createRun(data, SEED);
  for (const id of ['jab', 'focus', 'strike']) act(data, node, { type: 'play', hand: node.fight.hand.findIndex((c) => c.id === id), target: 0 });
  act(data, node, { type: 'end' });
  if (s.mode.digest !== digest(node.events)) failures.push(`[${name}] draw test differs from Node (browser ${s.mode.digest}, Node ${digest(node.events)})`);
  else summaries.push(`[${name}] Focus drew on queueing and locked; Sweep un-queued; matches Node (${digest(node.events)})`);
}

// ---- Mode C: Spirit Combo ----
// A whole run with the bot, tapping each card exactly bot.delayMs after the last (the
// game clock makes that exact), compared with Node.
async function walkKaitos(page, name, click, feetMin) {
  await advance(page, 100);
  if (!(await page.isEnabled('.mode[data-mode="kaitos"]'))) failures.push(`[${name}] mode C button not enabled`);
  await click('.mode[data-mode="kaitos"]');
  let s = await waitFor(page, name, 'the first hand', (x) => x.mode?.inputReady);
  checkFraming(name, s, feetMin);
  if ((await page.locator('#hand .card').count()) !== KAITOS.rules.draw) failures.push(`[${name}] expected ${KAITOS.rules.draw} cards in hand`);
  await shot(page, name, '1-hand');
  const node = botRun(KAITOS, SEED);
  let taps = 0;
  let midShot = false;
  for (let i = 0; i < 4000; i++) {
    s = await state(page);
    if (s.mode.result && !s.mode.busy) break;
    if (s.mode.phase === 'reward' && !s.mode.busy) {
      const a = await page.evaluate(() => window.__game.bot());
      if (!taken.kreward) { taken.kreward = true; await shot(page, name, '4-reward'); }
      await click(a.card ? `#reward-cards .card[data-card="${a.card}"]` : '#reward-skip');
      taps++;
      await advance(page, 100);
      continue;
    }
    if (!s.mode.inputReady) {
      await advance(page, 100);
      if ((await page.isVisible('#skip')) && (await page.isEnabled('#skip'))) await click('#skip');
      continue;
    }
    const a = await page.evaluate(() => window.__game.bot());
    taps++;
    if (a.type === 'play') {
      if (a.waitMs) await advance(page, a.waitMs);
      if (!midShot && s.mode.played >= 2) { midShot = true; await shot(page, name, '2-mid-combo'); }
      if (a.target !== null && a.target !== s.mode.target) await click(`.plate.foe[data-target="${a.target}"]`);
      await click(`#hand .card[data-uid="${a.uid}"]`);
    } else if (a.type === 'end') {
      await click('#end-turn');
      await advance(page, 60);
    }
  }
  s = await waitFor(page, name, 'the result screen', (x) => x.mode.result && !x.mode.busy);
  await advance(page, 300);
  await shot(page, name, '5-result');
  if (!(await page.isVisible('#run-end'))) failures.push(`[${name}] result panel not shown`);
  const nodePicks = node.events.filter((e) => e.type === 'card').map((e) => e.pickMs).join();
  if (s.mode.digest !== digest(node.events)) {
    const evs = await page.evaluate(() => window.__game.events());
    const i = evs.findIndex((e, k) => JSON.stringify(e) !== JSON.stringify(node.events[k]));
    if (i >= 0) failures.push(`[${name}] first difference at event ${i}: browser ${JSON.stringify(evs[i]).slice(0, 300)} / Node ${JSON.stringify(node.events[i]).slice(0, 300)}`);
  }
  if (s.mode.digest !== digest(node.events)) failures.push(`[${name}] run differs from Node (browser ${s.mode.result} ${s.mode.digest}, Node ${node.result} ${digest(node.events)}; picks browser ${s.mode.picks.join()} / Node ${nodePicks})`);
  else summaries.push(`[${name}] run combo'd to the end through the buttons (${taps} taps, picks ${KAITOS.bot.delayMs} ms apart): ${s.mode.result}, matches Node (${digest(node.events)})`);
  summaries.push(`## ${name} result\n${await page.evaluate(() => window.__game.stateText())}`);
}

// Scripted picks on a fixed deck: a straight (3-4-5), a pair (2-2), the 5-card limit; then
// next turn one card and a late pick (the timer runs out). Node replays the same picks.
async function kaitosFeel(page, name, click) {
  const data = applyDeck(KAITOS, KAITOS_DECK);
  const GAP = 600; // ms between picks (36 frames: exact on the game clock)
  let s = await waitFor(page, name, 'the first hand', (x) => x.mode?.inputReady);
  // A card by name and spirit number (two Guards differ only by their number).
  const tap = async (id, sp) => {
    const uid = await page.evaluate(([cname, n]) => [...document.querySelectorAll('#hand .card')].find((e) => e.querySelector('.cname').textContent === cname && (n === undefined || e.querySelector('.cost').textContent === String(n)))?.dataset.uid, [data.cards[id].name, sp]);
    if (!uid) return failures.push(`[${name}] ${id} ${sp ?? ''} not in hand`);
    await click(`#hand .card[data-uid="${uid}"]`);
  };
  // Wait `ms` frame by frame (so a moment can be caught on screen), then pick `id`.
  const waitTap = async (id, ms, shotName, when) => {
    for (let f = 0; f < Math.round((ms * 60) / 1000); f++) {
      await advance(page, 1000 / 60);
      if (shotName && !taken[name + shotName]) {
        const m = (await state(page)).mode;
        if (when(m)) { taken[name + shotName] = true; await shot(page, name, shotName); }
      }
    }
    await tap(...id);
  };
  await tap('guard', 1);
  await waitTap(['strike', 2], GAP, '1-timer', (m) => m.comboOpen && m.timeLeft < KAITOS.rules.chain.pickMs - 300);
  await waitTap(['guard', 3], GAP);
  await waitTap(['twin', 4], GAP, '2-straight', (m) => m.spiritMoments > 0 && m.hitStop);
  await waitTap(['strike', 4], GAP);
  s = await waitFor(page, name, 'the pair', (x) => x.mode.spiritMoments >= 2 && x.mode.hitStop, 10);
  await shot(page, name, '3-pair');
  s = await waitFor(page, name, 'turn 2', (x) => x.mode.inputReady && x.mode.turn === 2, 50);
  if (!s.mode.comboEnds.includes('limit')) failures.push(`[${name}] 5 cards did not end the combo (ends: ${s.mode.comboEnds})`);
  const first = s.mode.hand[0];
  await tap(first);
  for (let t = 0; t < KAITOS.rules.chain.pickMs + 400; t += 100) {
    await advance(page, 100);
    if (!taken[name + 'slow'] && (await state(page)).mode.comboEnds.includes('timeout')) { taken[name + 'slow'] = true; await advance(page, 120); await shot(page, name, '4-too-slow'); }
  }
  s = await waitFor(page, name, 'turn 3', (x) => x.mode.inputReady && x.mode.turn === 3, 50);
  if (!s.mode.comboEnds.includes('timeout')) failures.push(`[${name}] the timer did not end the combo`);
  const node = createRun(data, SEED);
  const pickN = (id, atMs, sp) => act(data, node, { type: 'play', hand: node.fight.hand.findIndex((c) => c.id === id && (sp === undefined || (c.spirit ?? data.cards[c.id].spirit) === sp)), target: 0, atMs });
  pickN('guard', 0, 1);
  for (const [id, sp] of [['strike', 2], ['guard', 3], ['twin', 4], ['strike', 4]]) pickN(id, GAP, sp);
  pickN(first, 0);
  act(data, node, { type: 'end', reason: 'timeout' });
  if (s.mode.digest !== digest(node.events)) failures.push(`[${name}] scripted combo differs from Node (browser ${s.mode.digest}, Node ${digest(node.events)})`);
  else summaries.push(`[${name}] straight 1-2-3-4 and pair 4-4 paid, 5 cards ended the combo, a late pick timed out; matches Node (${digest(node.events)})`);
}

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel), -0.45],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel), -0.45],
};
for (const [name, [opts, input, feetMin]] of Object.entries(DEVICES)) {
  await run(name, opts, (page) => walk(page, name, input(page), feetMin));
  await run(`${name}-feel`, opts, (page) => feel(page, `${name}-feel`, input(page)), `&mode=fast&deck=${FEEL_DECK}`);
  await run(`${name}-defeat`, opts, (page) => tunedLoss(page, `${name}-defeat`, input(page)), `&mode=fast&tune=${LOSE_TUNE}`);
  await run(`${name}-plan`, opts, (page) => walkPlan(page, `${name}-plan`, input(page), feetMin));
  await run(`${name}-plan-draw`, opts, (page) => planDraw(page, `${name}-plan-draw`, input(page)), `&mode=plan&deck=${PLAN_DRAW_DECK}`);
  await run(`${name}-kaitos`, opts, (page) => walkKaitos(page, `${name}-kaitos`, input(page), feetMin));
  await run(`${name}-kaitos-feel`, opts, (page) => kaitosFeel(page, `${name}-kaitos-feel`, input(page)), `&mode=kaitos&deck=${KAITOS_DECK}`);
}
await run('laptop-debug', DEVICES.laptop[0], (page) => debugOverlay(page, 'laptop-debug'), '&debug');

await browser.close();
await server?.close();

const report = [
  `# Check ${failures.length ? 'FAILED' : 'passed'}${ONLY ? ` (ONLY runs matching "${ONLY}")` : ''} — ${new Date().toISOString()}`,
  `target: ${base}`,
  '',
  ...summaries,
  '',
  '## failures',
  ...(failures.length ? failures : ['none']),
  '',
  '## console',
  ...(log.length ? log : ['(empty)']),
].join('\n');
writeFileSync(join(OUT, 'summary.txt'), report + '\n');
console.log(report);
console.log(`\nScreenshots and summary in ${OUT}/`);
process.exit(failures.length ? 1 : 0);
