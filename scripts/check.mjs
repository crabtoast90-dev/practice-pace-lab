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
import { createRun, act } from '../src/core/sim.js';
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
const FEEL_DECK = 'jab,jab,strike,verdict,guard'; // turn 1 = jab, jab, strike (combo), Final Verdict (finisher)

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
  for (const m of ['plan', 'kaitos']) if (await page.isEnabled(`.mode[data-mode="${m}"]`)) failures.push(`[${name}] mode ${m} should show as coming (disabled)`);
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
  for (const id of ['jab', 'jab', 'strike', 'verdict']) act(data, node, { type: 'play', hand: node.fight.hand.findIndex((c) => c.id === id), target: 0 });
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

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel), -0.45],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel), -0.45],
};
for (const [name, [opts, input, feetMin]] of Object.entries(DEVICES)) {
  await run(name, opts, (page) => walk(page, name, input(page), feetMin));
  await run(`${name}-feel`, opts, (page) => feel(page, `${name}-feel`, input(page)), `&mode=fast&deck=${FEEL_DECK}`);
  await run(`${name}-defeat`, opts, (page) => tunedLoss(page, `${name}-defeat`, input(page)), `&mode=fast&tune=${LOSE_TUNE}`);
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
