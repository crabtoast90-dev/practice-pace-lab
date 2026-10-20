import * as THREE from 'three';
import { createRun, act, canPlay } from '../core/sim.js';
import { botAction } from '../core/bot.js';
import { digest } from '../core/rng.js';
import { createBattlePlayer } from './battle-player.js';
import { cardHtml } from './card-face.js';

// Mode C, SPIRIT COMBO (Baten Kaitos-style): no energy, a combo of up to 5 cards a turn.
// The first card has no timer; each next one must be picked within the timer
// (rules.chain.pickMs) while the attacks play, or the combo ends ("Too slow!"). Spirit numbers
// (the card's corner) pay for pairs and straights. Finishers need 3 cards first and end the
// combo; an empty hand ends it too. "End combo" stops early. Laptop keys: 1-9 pick a card,
// Space ends the combo, Tab picks the next skeleton, S skips the skeletons' turn.
// The timer runs on the game clock; each pick enters the sim with how long it took.
export function createKaitosView({ data, seed, figures, stage, rig, vfx, camera, canvas, $, onRestart }) {
  const run = createRun(data, seed);
  const player = createBattlePlayer({ data, pace: data.pace, figures, stage, rig, vfx, camera, ui: { plates: $('plates'), numbers: $('numbers'), banner: $('banner'), flash: $('flash') } });
  player.push(run.events.slice());
  const ch = data.rules.chain;
  let target = 0;
  let renderedKey = '';
  let now = 0; // game clock, ms
  let lastPick = 0; // when the last card of this combo was picked
  let timeouts = 0;

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.76, 40), new THREE.MeshBasicMaterial({ color: 0xc8a0ff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  stage.group.add(ring);

  const hud = $('battle-hud');
  hud.hidden = false;
  hud.classList.add('kaitos');
  $('reward').hidden = true;
  $('run-end').hidden = true;
  $('speed').hidden = true;

  const inputReady = () => run.phase === 'fight' && player.info.turnKey === `${run.fightIndex}:${run.fight.turn}`;
  const comboOpen = () => inputReady() && run.fight.played > 0;
  const timeLeft = () => (comboOpen() ? Math.max(0, ch.pickMs - (now - lastPick)) : ch.pickMs);
  const alive = (i) => run.fight?.enemies[i]?.alive;
  function fixTarget() { if (run.fight && !alive(target)) target = Math.max(0, run.fight.enemies.findIndex((e) => e.alive)); }
  function send(action) { player.push(act(data, run, action)); fixTarget(); render(); }

  function pickUid(uid) {
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
    const atMs = run.fight.played > 0 ? Math.round(now - lastPick) : 0;
    lastPick = now;
    send({ type: 'play', hand: h, target, atMs });
  }
  function endCombo() { if (inputReady()) send({ type: 'end', reason: 'stop' }); }
  function pick(card) { if (run.phase === 'reward' && !player.busy()) { target = 0; send({ type: 'pick', card }); } }
  function select(i) { if (run.phase === 'fight' && alive(i)) { target = i; render(); } }
  function skip() { if (player.busy() && !comboOpen()) { player.skip(); render(); } }

  // ---- input ----
  const onHand = (e) => { const b = e.target.closest('.card'); if (b) pickUid(Number(b.dataset.uid)); };
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
    if (e.key >= '1' && e.key <= '9') { const c = run.fight?.hand[Number(e.key) - 1]; if (c) pickUid(c.uid); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endCombo(); }
    else if (e.key === 'Tab') { e.preventDefault(); const n = run.fight.enemies.length; for (let k = 1; k <= n; k++) if (alive((target + k) % n)) { select((target + k) % n); break; } }
    else if (e.key === 's' || e.key === 'S') skip();
  };
  $('hand').addEventListener('click', onHand);
  $('plates').addEventListener('click', onPlates);
  $('reward-cards').addEventListener('click', onReward);
  canvas.addEventListener('pointerdown', onCanvas);
  addEventListener('keydown', onKey);
  $('end-turn').onclick = endCombo;
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
    // The timer bar redraws every frame; the rest only when something changes.
    const left = timeLeft();
    $('timer').hidden = !comboOpen();
    $('timer').style.setProperty('--left', (left / ch.pickMs).toFixed(3));
    $('timer').classList.toggle('low', left < ch.pickMs * 0.3);
    $('timer-text').textContent = `Next card: ${(left / 1000).toFixed(1)} s`;
    const key = [ready, busy, run.phase, run.fightIndex, f.turn, player.info.turnKey, f.hand.map((c) => c.uid), f.played, f.hero.str, target, showReward, showEnd].join('|');
    if (key === renderedKey) return;
    renderedKey = key;
    $('fight-label').textContent = `Fight ${run.fightIndex + 1}/${data.fights.length} · Turn ${f.turn}`;
    $('energy').textContent = `${ready ? f.played : 0}/${ch.limit}`;
    $('energy').classList.toggle('empty', ready && f.played >= ch.limit);
    $('piles').textContent = `Deck ${f.draw.length} · Discard ${f.discard.length}`;
    $('end-turn').disabled = !ready;
    $('end-turn').textContent = ready && f.played > 0 ? 'End combo' : 'End turn';
    $('skip').disabled = !busy || ready;
    const chain = $('chain');
    chain.hidden = !ready || f.played === 0;
    const sp = f.spirits ?? [];
    chain.className = 'spirits';
    chain.innerHTML = sp.map((n) => `<i>${n}</i>`).join('');
    const hand = $('hand');
    if (ready) {
      hand.innerHTML = f.hand.map((c, i) => {
        const card = data.cards[c.id];
        return `<button class="card${canPlay(data, run, i) ? '' : ' off'}" data-uid="${c.uid}" data-family="${card.family}" style="--c:${card.look.color}"><span class="key">${i + 1}</span>${cardHtml(data, f, card)}</button>`;
      }).join('');
      $('turn-note').hidden = true;
    } else {
      hand.innerHTML = '';
      $('turn-note').hidden = run.phase !== 'fight';
      $('turn-note').textContent = busy ? 'Skeletons attack…' : '…';
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
      now += dtMs;
      player.update(dtMs);
      // The timer ran out: the combo ends where it stands.
      if (comboOpen() && now - lastPick > ch.pickMs) { timeouts++; send({ type: 'end', reason: 'timeout' }); }
      const t = run.phase === 'fight' && alive(target) && player.foeFigure(target);
      ring.visible = !!t && inputReady();
      if (t) ring.position.set(t.home.x, 0.03, t.home.z);
      render();
    },
    // The bot's next move as what to tap, and how long after the last pick to tap it
    // (its fixed decision delay), so the browser run matches Node to the millisecond.
    bot() {
      const a = botAction(data, run);
      if (!a) return null;
      if (a.type === 'play') {
        const c = run.fight.hand[a.hand];
        const card = data.cards[c.id];
        return { type: 'play', uid: c.uid, id: c.id, target: card.dmg && !card.all ? a.target : null, atMs: a.atMs, waitMs: a.atMs ? Math.max(0, a.atMs - (now - lastPick)) : 0 };
      }
      return a;
    },
    state() {
      const f = run.fight;
      return {
        phase: run.phase, fight: run.fightIndex, turn: f.turn, inputReady: inputReady(), comboOpen: comboOpen(), timeLeft: Math.round(timeLeft()), busy: player.busy(), pending: player.pending(), beats: player.beatsPlayed(),
        played: f.played, spirits: (f.spirits ?? []).slice(), picks: run.events.filter((e) => e.type === 'card').map((e) => e.pickMs), target, hand: f.hand.map((c) => c.id), reward: run.reward, timeouts,
        hp: { hero: player.shown.hero.hp, foes: player.shown.enemies.map((e) => e.hp) }, simHp: { hero: f.hero.hp, foes: f.enemies.map((e) => e.hp) },
        ...player.info, hitStop: player.hitStopping(), result: run.result, digest: digest(run.events),
      };
    },
    stateLine() {
      const s = this.state();
      return `kaitos: fight ${s.fight + 1} turn ${s.turn}, phase ${s.phase}, ${s.comboOpen ? `combo ${s.played}/${ch.limit} (${s.spirits.join('-')}), ${s.timeLeft} ms left` : s.inputReady ? 'pick the first card' : s.busy ? `playing (${s.pending} beats queued)` : 'waiting'}; hero HP ${s.hp.hero}, skeletons ${s.hp.foes.join('/')}; hand ${s.hand.join(', ') || '-'}; spirit moments ${s.spiritMoments}, combo ends ${s.comboEnds.join(', ') || '-'}${s.result ? `; result ${s.result}` : ''}`;
    },
    dispose() {
      player.dispose();
      stage.group.remove(ring);
      $('hand').removeEventListener('click', onHand);
      $('plates').removeEventListener('click', onPlates);
      $('reward-cards').removeEventListener('click', onReward);
      canvas.removeEventListener('pointerdown', onCanvas);
      removeEventListener('keydown', onKey);
      hud.classList.remove('kaitos');
      $('speed').hidden = false;
      $('end-turn').textContent = 'End turn';
      $('timer').hidden = true;
      $('chain').className = '';
      hud.hidden = true;
    },
  };
}
