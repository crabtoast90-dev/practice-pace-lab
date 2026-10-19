import * as THREE from 'three';
import { createRun, act, canPlay, snap } from '../core/sim.js';
import { botAction } from '../core/bot.js';
import { digest } from '../core/rng.js';
import { createBattlePlayer } from './battle-player.js';
import { cardHtml } from './card-face.js';

// Mode B, PLAN THEN WATCH: tap cards to queue the whole turn (each on the selected
// skeleton), see exactly what it will do, then press GO and watch it play as one directed
// sequence; the skeletons answer after it.
// Exact previews come from the sim itself: a queued card is really played in the sim at
// once, only its animation waits for GO. Un-queueing rewinds the turn to its start and
// replays the rest of the queue. A draw card resolves when queued (its cards join the
// hand), so it and everything before it lock. Laptop keys: 1-9 queue a card, Backspace
// un-queues the last one, Space / Enter is GO, Tab picks the next skeleton, S skips.
export function createPlanView({ data, seed, figures, stage, rig, vfx, camera, canvas, $, onRestart }) {
  let run = createRun(data, seed);
  const player = createBattlePlayer({ data, pace: data.pace, figures, stage, rig, vfx, camera, ui: { plates: $('plates'), numbers: $('numbers'), banner: $('banner'), flash: $('flash') } });
  player.push(run.events.slice());
  let target = 0;
  let renderedKey = '';
  let start = null; // the run as it stood when this turn's planning began
  let queue = []; // [{ uid, id, target, ev }] in play order
  let held = []; // the queued cards' events, played on GO
  let lockedTo = -1; // queue index up to which cards can't be un-queued (a draw card resolved)
  let previewEnd = null; // the fight after the skeletons answer this plan (for the hero's HP)
  let gos = 0;

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.76, 40), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  stage.group.add(ring);

  const hud = $('battle-hud');
  hud.hidden = false;
  hud.classList.add('plan');
  $('reward').hidden = true;
  $('run-end').hidden = true;
  $('speed').hidden = true;
  $('end-turn').textContent = 'GO ▸';

  const planning = () => run.phase === 'fight' && player.info.turnKey === `${run.fightIndex}:${run.fight.turn}` && !player.busy();
  // A queue that ends the fight leaves the sim on the reward / result: GO still plays it.
  const planReady = () => planning() || (queue.length > 0 && !player.busy() && run.phase !== 'fight');
  const alive = (i) => run.fight?.enemies[i]?.alive;
  function fixTarget() { if (run.fight && !alive(target)) target = Math.max(0, run.fight.enemies.findIndex((e) => e.alive)); }

  function beginPlan() {
    start = structuredClone(run);
    queue = [];
    held = [];
    lockedTo = -1;
    refreshPreview();
  }

  // Play one queued card in the sim now; its events wait for GO.
  function playNow(uid, tgt) {
    const h = run.fight.hand.findIndex((c) => c.uid === uid);
    if (h < 0 || !canPlay(data, run, h)) return null;
    const evs = act(data, run, { type: 'play', hand: h, target: tgt });
    const card = evs.find((e) => e.type === 'card');
    held.push(...evs);
    queue.push({ uid, id: card.id, target: tgt, ev: card });
    if (data.cards[card.id].draw) lockedTo = queue.length - 1;
    return card;
  }

  function refreshPreview() {
    if (!start) return player.setPreview(null);
    const f = run.fight;
    const s = snap(data, f);
    previewEnd = null;
    if (run.phase === 'fight') {
      const after = structuredClone(run);
      act(data, after, { type: 'end' });
      previewEnd = after.fight?.hero ?? { hp: after.hp };
    }
    player.setPreview(queue.length || previewEnd ? { hero: { hp: run.phase === 'fight' ? previewEnd.hp : f.hero.hp, block: s.hero.block, str: s.hero.str }, enemies: s.enemies } : null);
  }

  function queueUid(uid) {
    if (!planning()) return;
    const h = run.fight.hand.findIndex((c) => c.uid === uid);
    if (h < 0) return;
    if (!canPlay(data, run, h)) {
      const el = $('hand').querySelector(`[data-uid="${uid}"]`);
      el?.classList.remove('nope');
      void el?.offsetWidth;
      el?.classList.add('nope');
      return;
    }
    fixTarget();
    playNow(uid, target);
    fixTarget();
    refreshPreview();
    render();
  }

  // Take card i out of the queue: rewind to the turn start, replay the others.
  function unqueue(i) {
    if (!queue[i] || i <= lockedTo || !(planning() || planReady())) return;
    const keep = queue.filter((_, k) => k !== i);
    run = structuredClone(start);
    queue = [];
    held = [];
    lockedTo = -1;
    for (const q of keep) playNow(q.uid, q.target);
    fixTarget();
    refreshPreview();
    render();
  }

  function go() {
    if (!planReady()) return;
    const evs = held.slice();
    if (run.phase === 'fight') evs.push(...act(data, run, { type: 'end' }));
    player.setPreview(null);
    player.push(evs);
    gos++;
    start = null;
    queue = [];
    held = [];
    lockedTo = -1;
    fixTarget();
    render();
  }

  function pick(card) { if (run.phase === 'reward' && !player.busy() && !queue.length) { target = 0; player.push(act(data, run, { type: 'pick', card })); render(); } }
  function select(i) { if ((planning() || planReady()) && alive(i)) { target = i; render(); } }
  function skip() { if (player.busy()) { player.skip(); render(); } }

  // ---- input ----
  const onHand = (e) => { const b = e.target.closest('.card'); if (b) queueUid(Number(b.dataset.uid)); };
  const onQueue = (e) => { const b = e.target.closest('.qcard'); if (b) unqueue(Number(b.dataset.i)); };
  const onPlates = (e) => { const p = e.target.closest('.plate.foe'); if (p) select(Number(p.dataset.target)); };
  const onReward = (e) => { const b = e.target.closest('.card'); if (b) pick(b.dataset.card); };
  const raycaster = new THREE.Raycaster();
  const onCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    for (let i = 0; i < player.foeCount(); i++) {
      const box = new THREE.Box3().setFromObject(player.foeFigure(i).group).expandByScalar(0.25);
      if (raycaster.ray.intersectsBox(box)) return select(i);
    }
  };
  const onKey = (e) => {
    if (e.key >= '1' && e.key <= '9') { const c = run.fight?.hand[Number(e.key) - 1]; if (c) queueUid(c.uid); }
    else if (e.key === 'Backspace') { e.preventDefault(); unqueue(queue.length - 1); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); }
    else if (e.key === 'Tab') { e.preventDefault(); const n = run.fight.enemies.length; for (let k = 1; k <= n; k++) if (alive((target + k) % n)) { select((target + k) % n); break; } }
    else if (e.key === 's' || e.key === 'S') skip();
  };
  $('hand').addEventListener('click', onHand);
  $('queue').addEventListener('click', onQueue);
  $('plates').addEventListener('click', onPlates);
  $('reward-cards').addEventListener('click', onReward);
  canvas.addEventListener('pointerdown', onCanvas);
  addEventListener('keydown', onKey);
  $('end-turn').onclick = go;
  $('skip').onclick = skip;
  $('reward-skip').onclick = () => pick(null);
  $('again').onclick = onRestart;

  // ---- HUD ----
  function queueChip(q, i) {
    const card = data.cards[q.id];
    const ev = q.ev;
    const dmg = ev.hits.reduce((s, h) => s + h.amount, 0);
    const parts = [];
    if (card.dmg) parts.push(`${dmg} dmg${card.all ? ' all' : ''}`);
    if (ev.block) parts.push(`+${ev.block} blk`);
    if (ev.str) parts.push(`+${ev.str} str`);
    if (ev.drew.length) parts.push(`drew ${ev.drew.length}`);
    if (ev.expose) parts.push('expose');
    if (ev.hits.some((h) => h.killed)) parts.push('KO');
    const tgt = card.dmg && !card.all ? `→ ${run.fight?.enemies[ev.target]?.name?.replace('Bone ', '') ?? ''}` : '';
    return `<button class="qcard${i <= lockedTo ? ' locked' : ''}${ev.combo ? ' combo' : ''}" data-i="${i}" style="--c:${card.look.color}"><span class="qn">${i + 1}</span><b>${card.name}</b><span class="qv">${parts.join(' · ')}</span><span class="qt">${tgt}</span></button>`;
  }

  function render() {
    const f = run.fight;
    const ready = planning();
    const canGo = planReady();
    const busy = player.busy();
    const showReward = run.phase === 'reward' && !busy && !queue.length;
    const showEnd = (run.phase === 'won' || run.phase === 'lost') && !busy && !queue.length;
    const key = [ready, canGo, busy, run.phase, run.fightIndex, f.turn, player.info.turnKey, f.hand.map((c) => c.uid), queue.map((q) => `${q.uid}.${q.target}`), f.energy, target, showReward, showEnd].join('|');
    if (key === renderedKey) return;
    renderedKey = key;
    $('fight-label').textContent = `Fight ${run.fightIndex + 1}/${data.fights.length} · Turn ${f.turn}`;
    $('energy').textContent = `${canGo ? f.energy : 0}/${data.rules.energy}`;
    $('energy').classList.toggle('empty', canGo && f.energy === 0);
    $('piles').textContent = `Deck ${f.draw.length} · Discard ${f.discard.length}`;
    $('end-turn').disabled = !canGo;
    $('end-turn').classList.toggle('ready', canGo && queue.length > 0);
    $('skip').disabled = !busy;
    const comboAt = data.rules.combo.at;
    const chain = $('chain');
    chain.hidden = !canGo || queue.length === 0;
    chain.className = queue.length >= comboAt ? 'hot' : queue.length === comboAt - 1 ? 'next' : '';
    chain.textContent = queue.length >= comboAt ? `COMBO ×${queue.length}` : queue.length === comboAt - 1 ? `${queue.length} queued · next is a COMBO` : `${queue.length} queued`;
    $('queue').hidden = !canGo;
    $('queue').innerHTML = queue.length ? queue.map(queueChip).join('') : '<span class="qhint">Tap cards to plan the turn, then GO</span>';
    const hand = $('hand');
    if (ready) {
      hand.innerHTML = f.hand.map((c, i) => {
        const card = data.cards[c.id];
        return `<button class="card${card.cost > f.energy ? ' off' : ''}" data-uid="${c.uid}" data-family="${card.family}" style="--c:${card.look.color}"><span class="key">${i + 1}</span>${cardHtml(data, f, card)}</button>`;
      }).join('');
      $('turn-note').hidden = true;
    } else {
      hand.innerHTML = '';
      $('turn-note').hidden = run.phase !== 'fight' || canGo;
      $('turn-note').textContent = busy ? 'Watching the turn…' : '…';
    }
    $('reward').hidden = !showReward;
    if (showReward) {
      $('reward-hp').textContent = `HP ${run.hp}/${run.maxHp} carries into the next fight.`;
      $('reward-cards').innerHTML = run.reward.map((id) => { const card = data.cards[id]; return `<button class="card" data-card="${id}" data-family="${card.family}" style="--c:${card.look.color}">${cardHtml(data, null, card)}</button>`; }).join('');
    }
    $('run-end').hidden = !showEnd;
    if (showEnd) {
      $('run-result').textContent = run.result === 'win' ? 'Victory' : 'Defeat';
      $('run-stats').textContent = run.result === 'win' ? `All ${data.fights.length} fights won with ${run.hp}/${run.maxHp} HP.` : `Fell in fight ${run.fightIndex + 1} of ${data.fights.length}.`;
    }
  }
  render();

  return {
    get run() { return run; },
    update(dtMs) {
      player.update(dtMs);
      if (planning() && !start) beginPlan();
      const t = run.fight && alive(target) && player.foeFigure(target);
      ring.visible = !!t && (planning() || planReady());
      if (t) ring.position.set(t.home.x, 0.03, t.home.z);
      render();
    },
    // The bot's next move as what to tap. Its card plays become queue taps; its "end the
    // turn" becomes GO. The check plays whole runs this way.
    bot() {
      if (run.phase !== 'fight' && queue.length) return { type: 'go' };
      const a = botAction(data, run);
      if (!a) return null;
      if (a.type === 'play') {
        const c = run.fight.hand[a.hand];
        const card = data.cards[c.id];
        return { type: 'play', uid: c.uid, id: c.id, target: card.dmg && !card.all ? a.target : null };
      }
      if (a.type === 'end') return { type: 'go' };
      return a;
    },
    state() {
      const f = run.fight;
      return {
        phase: run.phase, fight: run.fightIndex, turn: f.turn, inputReady: planning() || planReady(), planning: planning(), busy: player.busy(), pending: player.pending(), beats: player.beatsPlayed(),
        energy: f.energy, played: f.played, target, hand: f.hand.map((c) => c.id), reward: run.reward, gos,
        queue: queue.map((q) => q.id), locked: lockedTo,
        preview: start ? { foes: f.enemies.map((e) => e.hp), hero: previewEnd?.hp ?? f.hero.hp, heroBlock: f.hero.block } : null,
        hp: { hero: player.shown.hero.hp, foes: player.shown.enemies.map((e) => e.hp) }, simHp: { hero: f.hero.hp, foes: f.enemies.map((e) => e.hp) },
        ...player.info, hitStop: player.hitStopping(), result: run.result, digest: digest(run.events),
      };
    },
    stateLine() {
      const s = this.state();
      return `plan: fight ${s.fight + 1} turn ${s.turn}, phase ${s.phase}, ${s.planning ? `planning (queue: ${s.queue.join(', ') || '-'})` : s.busy ? `watching (${s.pending} beats queued)` : 'waiting'}; hero HP ${s.hp.hero}, skeletons ${s.hp.foes.join('/')}; energy ${s.energy}; hand ${s.hand.join(', ') || '-'}; impacts ${s.impacts}, camera cuts ${s.cuts}, combos ${s.combos}, finishers ${s.finishers}${s.result ? `; result ${s.result}` : ''}`;
    },
    dispose() {
      player.dispose();
      stage.group.remove(ring);
      $('hand').removeEventListener('click', onHand);
      $('queue').removeEventListener('click', onQueue);
      $('plates').removeEventListener('click', onPlates);
      $('reward-cards').removeEventListener('click', onReward);
      canvas.removeEventListener('pointerdown', onCanvas);
      removeEventListener('keydown', onKey);
      hud.classList.remove('plan');
      $('speed').hidden = false;
      $('end-turn').textContent = 'End turn';
      $('queue').hidden = true;
      hud.hidden = true;
    },
  };
}
