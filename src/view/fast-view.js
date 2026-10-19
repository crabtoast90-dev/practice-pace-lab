import * as THREE from 'three';
import { createRun, act, canPlay } from '../core/sim.js';
import { botAction } from '../core/bot.js';
import { digest } from '../core/rng.js';
import { createBattlePlayer } from './battle-player.js';
import { cardHtml } from './card-face.js';

// Mode A, FAST: tap a card and it plays at once on the selected skeleton (tap a skeleton
// or its plate to select). Taps can run ahead of the animations; End turn hands over to
// the skeletons. 1x / 2x and Skip speed the playback up. Laptop keys: 1-9 play a card,
// Space ends the turn, Tab picks the next skeleton, S skips, X toggles speed.
export function createFastView({ data, seed, figures, stage, rig, vfx, camera, canvas, $, onRestart }) {
  const run = createRun(data, seed);
  const player = createBattlePlayer({ data, pace: data.pace, figures, stage, rig, vfx, camera, ui: { plates: $('plates'), numbers: $('numbers'), banner: $('banner'), flash: $('flash') } });
  player.push(run.events.slice());
  let target = 0;
  let renderedKey = '';
  let speedIndex = 0;

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.76, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  stage.group.add(ring);

  $('fast-hud').hidden = false;
  $('reward').hidden = true;
  $('run-end').hidden = true;

  const inputReady = () => run.phase === 'fight' && player.info.turnKey === `${run.fightIndex}:${run.fight.turn}`;
  const alive = (i) => run.fight?.enemies[i]?.alive;
  function fixTarget() { if (!alive(target)) target = Math.max(0, run.fight.enemies.findIndex((e) => e.alive)); }
  function send(action) { player.push(act(data, run, action)); fixTarget(); render(); }

  function playUid(uid) {
    if (!inputReady()) return;
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
    send({ type: 'play', hand: h, target });
  }
  function endTurn() { if (inputReady()) send({ type: 'end' }); }
  function pick(card) { if (run.phase === 'reward' && !player.busy()) { target = 0; send({ type: 'pick', card }); } }
  function select(i) { if (run.phase === 'fight' && alive(i)) { target = i; render(); } }
  function toggleSpeed() { speedIndex = (speedIndex + 1) % data.pace.speeds.length; player.setSpeed(data.pace.speeds[speedIndex]); render(); }
  function skip() { if (player.busy()) { player.skip(); render(); } }

  // ---- input ----
  const onHand = (e) => { const b = e.target.closest('.card'); if (b) playUid(Number(b.dataset.uid)); };
  const onPlates = (e) => { const p = e.target.closest('.plate.foe'); if (p) select(Number(p.dataset.target)); };
  const onReward = (e) => { const b = e.target.closest('.card'); if (b) pick(b.dataset.card); };
  const raycaster = new THREE.Raycaster();
  const onCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    for (let i = 0; i < player.foeCount(); i++) {
      const f = player.foeFigure(i);
      const box = new THREE.Box3().setFromObject(f.group).expandByScalar(0.25);
      if (raycaster.ray.intersectsBox(box)) return select(i);
    }
  };
  const onKey = (e) => {
    if (e.key >= '1' && e.key <= '9') { const c = run.fight?.hand[Number(e.key) - 1]; if (c) playUid(c.uid); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endTurn(); }
    else if (e.key === 'Tab') { e.preventDefault(); const n = run.fight.enemies.length; for (let k = 1; k <= n; k++) if (alive((target + k) % n)) { select((target + k) % n); break; } }
    else if (e.key === 's' || e.key === 'S') skip();
    else if (e.key === 'x' || e.key === 'X') toggleSpeed();
  };
  $('hand').addEventListener('click', onHand);
  $('plates').addEventListener('click', onPlates);
  $('reward-cards').addEventListener('click', onReward);
  canvas.addEventListener('pointerdown', onCanvas);
  addEventListener('keydown', onKey);
  $('end-turn').onclick = endTurn;
  $('speed').onclick = toggleSpeed;
  $('skip').onclick = skip;
  $('reward-skip').onclick = () => pick(null);
  $('again').onclick = onRestart;

  // ---- HUD ----
  function render() {
    const f = run.fight;
    const ready = inputReady();
    const busy = player.busy();
    const showReward = run.phase === 'reward' && !busy;
    const showEnd = (run.phase === 'won' || run.phase === 'lost') && !busy;
    const key = [ready, busy, run.phase, run.fightIndex, f.turn, player.info.turnKey, f.hand.map((c) => c.uid), f.energy, f.played, f.hero.str, target, speedIndex, showReward, showEnd].join('|');
    if (key === renderedKey) return;
    renderedKey = key;
    $('fight-label').textContent = `Fight ${run.fightIndex + 1}/${data.fights.length} · Turn ${f.turn}`;
    $('energy').textContent = `${ready ? f.energy : 0}/${data.rules.energy}`;
    $('energy').classList.toggle('empty', ready && f.energy === 0);
    $('piles').textContent = `Deck ${f.draw.length} · Discard ${f.discard.length}`;
    $('end-turn').disabled = !ready;
    $('speed').textContent = `${data.pace.speeds[speedIndex]}x`;
    $('skip').disabled = !busy;
    const comboAt = data.rules.combo.at;
    const chain = $('chain');
    chain.hidden = !ready || f.played === 0;
    chain.className = f.played >= comboAt ? 'hot' : f.played === comboAt - 1 ? 'next' : '';
    chain.textContent = f.played >= comboAt ? `COMBO ×${f.played}` : f.played === comboAt - 1 ? `${f.played} cards · next is a COMBO` : `${f.played} card`;
    const hand = $('hand');
    if (ready) {
      hand.innerHTML = f.hand.map((c, i) => {
        const card = data.cards[c.id];
        return `<button class="card${card.cost > f.energy ? ' off' : ''}" data-uid="${c.uid}" data-family="${card.family}" style="--c:${card.look.color}"><span class="key">${i + 1}</span>${cardHtml(data, f, card)}</button>`;
      }).join('');
      $('turn-note').hidden = true;
    } else {
      hand.innerHTML = '';
      $('turn-note').hidden = run.phase !== 'fight';
      $('turn-note').textContent = busy && player.info.turnKey === `${run.fightIndex}:${f.turn - 1}` ? 'Skeletons attack…' : '…';
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
    run,
    update(dtMs) {
      player.update(dtMs);
      const t = run.phase === 'fight' && alive(target) && player.foeFigure(target);
      ring.visible = !!t && inputReady();
      if (t) ring.position.set(t.home.x, 0.03, t.home.z);
      render();
    },
    // The bot's next move, as what to tap: the check plays the run through the real buttons.
    bot() {
      const a = botAction(data, run);
      if (!a) return null;
      if (a.type === 'play') {
        const c = run.fight.hand[a.hand];
        const card = data.cards[c.id];
        return { type: 'play', uid: c.uid, id: c.id, target: card.dmg && !card.all ? a.target : null };
      }
      return a;
    },
    state() {
      const f = run.fight;
      return {
        phase: run.phase, fight: run.fightIndex, turn: f.turn, inputReady: inputReady(), busy: player.busy(), pending: player.pending(), beats: player.beatsPlayed(),
        energy: f.energy, played: f.played, target, hand: f.hand.map((c) => c.id), reward: run.reward, speed: data.pace.speeds[speedIndex],
        hp: { hero: player.shown.hero.hp, foes: player.shown.enemies.map((e) => e.hp) }, simHp: { hero: f.hero.hp, foes: f.enemies.map((e) => e.hp) },
        ...player.info, hitStop: player.hitStopping(), result: run.result, digest: digest(run.events),
      };
    },
    stateLine() {
      const s = this.state();
      return `fast: fight ${s.fight + 1} turn ${s.turn}, phase ${s.phase}, ${s.inputReady ? 'your move' : s.busy ? `playing (${s.pending} beats queued)` : 'waiting'}; hero HP ${s.hp.hero}, skeletons ${s.hp.foes.join('/')}; energy ${s.energy}; hand ${s.hand.join(', ') || '-'}; impacts ${s.impacts}, combos ${s.combos}, finishers ${s.finishers}${s.result ? `; result ${s.result}` : ''}`;
    },
    dispose() {
      player.dispose();
      stage.group.remove(ring);
      $('hand').removeEventListener('click', onHand);
      $('plates').removeEventListener('click', onPlates);
      $('reward-cards').removeEventListener('click', onReward);
      canvas.removeEventListener('pointerdown', onCanvas);
      removeEventListener('keydown', onKey);
      $('fast-hud').hidden = true;
    },
  };
}
