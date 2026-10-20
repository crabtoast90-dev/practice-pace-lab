import * as THREE from 'three';
import { FAMILIES, COMBO, ENEMY, LABELS } from './families.js';

// SHARED battle player: turns the sim's events into what happens on screen, one beat per
// event, on the game clock. No rules here: every number on screen comes from the events
// (each carries a snapshot of the fight after it). Modes A, B and C feed it events;
// how fast and in what order the player gets to act is the mode view's job.
//
// Impact = hit-stop (everything freezes), camera shake, screen flash, the struck figure
// lights up, a VFX burst in the card's color, a damage number. The 3rd card of a turn
// adds the combo banner and a camera punch-in; finishers are a directed 2 s shot.
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function createBattlePlayer({ data, pace, figures, stage, rig, vfx, camera, ui }) {
  const hero = figures.spawn('hero', 'hero', stage.spots.hero);
  const queue = [];
  const tweens = [];
  const timers = [];
  const labels = [];
  let beat = null;
  let hitStop = 0;
  let flash = 0;
  let letterbox = 0;
  let letterboxGoal = 0;
  let speed = 1;
  let skipping = false;
  let banner = null;
  let beatsPlayed = 0;
  let foes = [];
  let preview = null; // mode B: what the plates will read after the planned turn
  const shown = { hero: { hp: data.hero.hp, block: 0, str: 0 }, enemies: [] };
  const info = { turnKey: null, fight: -1, chain: 0, lastCard: null, cinematic: false, lastEvent: null, impacts: 0, combos: 0, finishers: 0, cuts: 0, spiritMoments: 0, comboEnds: [] };

  // ---- small helpers on the game clock ----
  const after = (ms, fn) => timers.push({ ms, fn });
  function tween(fig, to, ms, arc = 0) {
    const from = fig.group.position.clone();
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].fig === fig) tweens.splice(i, 1);
    if (skipping || ms <= 0) return void fig.group.position.copy(to);
    tweens.push({ fig, from, to: to.clone(), ms, t: 0, arc });
  }
  const chest = (fig) => fig.group.position.clone().add(V(0, fig.height * 0.55, 0));
  const foeFig = (i) => foes[i]?.fig;
  const far = () => (camera.aspect < 1 ? stage.cinematic.portraitPull : 1); // phones see less sideways: pull the cuts back

  function stop(ms) { if (!skipping) hitStop = Math.max(hitStop, ms); }
  function shake(m) { if (!skipping) rig.shake(m); }
  function screenFlash(a) { if (!skipping) flash = Math.max(flash, a); }
  function glow(fig, color, amount, ms = 110) {
    if (skipping || !fig) return;
    fig.glow(color, amount);
    after(ms, () => fig.glow(0x000000, 0));
  }
  function burst(kinds, at, color, opts = {}) {
    if (skipping) return;
    for (const k of kinds) {
      if (k === 'slash') vfx.slash(at, color, { tilt: opts.tilt ?? 0.6, size: opts.big ? 1.4 : 1.1 });
      if (k === 'ring') vfx.ring(at, color, { radius: opts.big ? 3.6 : 2.2 });
      if (k === 'sparks') vfx.sparks(at, color, { count: opts.big ? 26 : 14, speed: opts.big ? 6 : 4 });
      if (k === 'pillar') vfx.pillar(at, color);
      if (k === 'light') vfx.light(at, color, opts.big ? 60 : 30);
      if (k === 'bubble') vfx.bubble(at, color);
      if (k === 'rise') vfx.rise(at, color);
    }
  }
  function number(at, text, cls) {
    if (skipping) return;
    const el = document.createElement('div');
    el.className = `num ${cls}`;
    el.textContent = text;
    ui.numbers.append(el);
    labels.push({ el, at: at.clone().add(V(0, 0.55, 0)), t: 0, ms: LABELS.numberMs * (cls.includes('big') ? 1.5 : 1), drift: (labels.length % 3 - 1) * 0.25 });
  }
  function showBanner(text, color, cls = '') {
    if (skipping) return;
    ui.banner.textContent = text;
    ui.banner.className = `banner ${cls}`;
    ui.banner.style.color = color ?? '';
    ui.banner.hidden = false;
    banner = { t: 0, ms: cls.includes('combo') ? COMBO.bannerMs : LABELS.bannerMs };
  }
  function dimLights(k) {
    const { lights } = stage;
    lights.key.intensity = lights.base.key * k;
    lights.rim.intensity = lights.base.rim * (k < 1 ? 1.6 : 1);
    lights.hemi.intensity = lights.base.hemi * k;
  }
  function applySnap(s) {
    shown.hero = { ...s.hero };
    shown.enemies = s.enemies.map((e) => ({ ...e }));
  }

  // ---- plates (name, HP, block, intent) that follow each figure ----
  function plate(cls) {
    const el = document.createElement('div');
    el.className = `plate ${cls}`;
    el.innerHTML = '<div class="intent"></div><div class="pname"></div><div class="prow"><div class="bar hp"><i></i></div><span class="hpt"></span></div><div class="tags"></div>';
    ui.plates.append(el);
    return el;
  }
  const heroPlate = plate('hero');
  heroPlate.querySelector('.pname').textContent = data.hero.name;
  const cache = new Map();
  function setHtml(el, key, html) {
    if (cache.get(el) === html) return;
    cache.set(el, html);
    el.querySelector(key).innerHTML = html;
  }
  const tags = (u) => [u.block ? `<span class="tag blk">${u.block} block</span>` : '', u.str ? `<span class="tag str">+${u.str} str</span>` : '', u.exposed ? `<span class="tag exp">exposed ${u.exposed}</span>` : ''].join('');
  function intentHtml(m) {
    if (!m) return '';
    const parts = [];
    if (m.atk) parts.push(`<span class="ib atk">ATK ${m.atk}${m.hits > 1 ? `×${m.hits}` : ''}</span>`);
    if (m.block) parts.push('<span class="ib def">DEFEND</span>');
    if (m.str || m.strAll) parts.push(`<span class="ib buf">BUFF${m.strAll ? ' ALL' : ''}</span>`);
    return parts.join('');
  }
  // pv: the HP this figure will have after the planned turn (mode B), or undefined.
  function placePlate(el, fig, hp, max, pv) {
    const p = fig.group.position.clone().add(V(0, fig.height + 0.25, 0)).project(camera);
    const w = ui.plates.clientWidth;
    const h = ui.plates.clientHeight;
    el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -100%)`;
    const bar = el.querySelector('.bar i');
    const showPv = pv !== undefined && pv !== hp;
    bar.style.width = `${(100 * (showPv ? pv : hp)) / max}%`;
    el.querySelector('.bar').style.setProperty('--was', `${(100 * hp) / max}%`);
    el.classList.toggle('preview', showPv);
    setHtml(el, '.hpt', showPv ? `${hp} <span class="arrow">→</span> <b class="pv">${pv}</b>` : `${hp}/${max}`);
  }
  function placeAll() {
    placePlate(heroPlate, hero, shown.hero.hp, data.hero.hp, preview?.hero.hp);
    setHtml(heroPlate, '.tags', tags(preview ? { ...shown.hero, block: preview.hero.block, str: preview.hero.str } : shown.hero));
    foes.forEach((f, i) => {
      const s = shown.enemies[i];
      if (!s) return;
      placePlate(f.plate, f.fig, s.hp, f.maxHp, preview?.enemies[i]?.hp);
      f.plate.classList.toggle('dead', !s.alive);
      f.plate.classList.toggle('doomed', !!preview && s.alive && !preview.enemies[i]?.alive);
      setHtml(f.plate, '.intent', s.alive ? intentHtml(s.intent) : '');
      setHtml(f.plate, '.tags', tags(preview?.enemies[i] ? { ...s, block: preview.enemies[i].block, exposed: preview.enemies[i].exposed } : s));
    });
    for (const l of labels) {
      const k = l.t / l.ms;
      const p = l.at.clone().add(V(l.drift * k, LABELS.numberRise * Math.sqrt(k), 0)).project(camera);
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.7 : 1.3 - Math.min(0.3, (k - 0.12) * 1.2);
      l.el.style.transform = `translate(${((p.x + 1) / 2) * ui.numbers.clientWidth}px, ${((1 - p.y) / 2) * ui.numbers.clientHeight}px) translate(-50%, -50%) scale(${pop.toFixed(3)})`;
      l.el.style.opacity = k < 0.7 ? 1 : (1 - k) / 0.3;
    }
  }

  // ---- beats: one per sim event ----
  function setupFight(ev) {
    for (const f of foes) { figures.remove(f.fig.id); f.plate.remove(); }
    foes = ev.enemies.map((e, i) => {
      const spot = stage.spots.foes[i];
      const fig = figures.spawn(`foe${i}`, e.model, spot);
      fig.group.position.y = -fig.height; // they climb out of the floor
      tween(fig, spot.position, 420);
      const p = plate('foe');
      p.dataset.target = i;
      p.querySelector('.pname').textContent = e.name;
      return { ...e, fig, plate: p };
    });
    hero.group.position.copy(hero.home);
    if (hero.animation === 'death') hero.play('idle');
    applySnap(ev.snap);
    info.fight = ev.fight;
    showBanner(ev.elite ? `Elite · ${ev.name}` : `Fight ${ev.fight + 1} · ${ev.name}`, ev.elite ? '#ff9a7a' : '#f4d58d', 'title');
  }

  function strikeTargets(ev, card, fam) {
    // Where the hero runs to: in front of the target, or in front of the whole group.
    if (!ev.hits.length && !card.dmg) return null;
    const dash = fam.dash ?? (card.dmg ? 'target' : null);
    if (!dash) return null;
    const struck = [...new Set(ev.hits.map((h) => h.target))].map(foeFig).filter(Boolean);
    if (!struck.length) return null;
    if (dash === 'centre' || card.all) {
      const minX = Math.min(...struck.map((f) => f.home.x));
      const z = struck.reduce((s, f) => s + f.home.z, 0) / struck.length;
      return V(minX - 1.0, 0, z);
    }
    const t = foeFig(ev.target) ?? struck[0];
    return V(t.home.x - (fam.reach || 1.2), 0, t.home.z);
  }

  function impact(ev, card, fam, group, k, big) {
    const color = card.look.color;
    info.impacts++;
    for (const h of group) {
      const f = foeFig(h.target);
      if (!f) continue;
      shown.enemies[h.target].hp = h.hpLeft;
      if (h.killed) shown.enemies[h.target].alive = false;
      const at = chest(f);
      number(at, h.amount ? `${h.amount}` : 'blocked', `${big ? 'big ' : ''}${ev.combo ? 'combo' : 'dmg'}`);
      glow(f, color, fam.glow);
      burst(fam.vfx, at, color, { tilt: k % 2 ? -0.7 : 0.6, big });
      if (h.killed) f.play('death');
      else {
        f.play('hit', 1.4);
        const back = f.home.clone().add(V(big ? 0.5 : 0.22, 0, 0));
        tween(f, back, 60);
        after(fam.hitStopMs + 80, () => tween(f, f.home, 160));
      }
    }
    stop(fam.hitStopMs + (moment(ev) ? COMBO.extraHitStopMs : 0));
    shake(fam.shake * (moment(ev) ? 1.35 : 1));
    screenFlash(fam.flash + (moment(ev) ? COMBO.flash : 0));
    if (k === 0 && moment(ev) && !big) {
      info.combos++;
      showBanner(momentText(ev), color, 'combo');
      const t = foeFig(group[0]?.target);
      if (t && !skipping) rig.punch(chest(t), COMBO.punch);
    }
  }

  // A combo moment: the shared 3rd-card combo, or (mode C) a spirit pair / straight.
  const moment = (ev) => ev.combo || !!ev.spirit?.kind;
  function momentText(ev) {
    if (ev.spirit?.kind === 'pair') { info.spiritMoments++; return `PAIR +${ev.spirit.pct}%`; }
    if (ev.spirit?.kind === 'straight') { info.spiritMoments++; return `STRAIGHT ×${ev.spirit.len}  +${ev.spirit.pct}%`; }
    return ev.chain === data.rules.combo.at ? 'COMBO!' : `COMBO ×${ev.chain}`;
  }

  function selfEffect(ev, card) {
    const color = card.look.color;
    const at = chest(hero);
    if (moment(ev) && !ev.hits.length && !skipping) {
      // Block and buffs land the combo too: banner, flash, a bigger burst and a punch-in.
      info.combos++;
      showBanner(momentText(ev), color, 'combo');
      burst(['ring', 'sparks'], hero.group.position.clone().add(V(0, 0.4, 0)), color, { big: true });
      rig.punch(at, COMBO.punch);
      screenFlash(COMBO.flash);
      stop(COMBO.extraHitStopMs);
    }
    if (ev.block) { burst(['bubble'], at, color); number(at, `+${ev.block} block`, ev.combo ? 'blk combo' : 'blk'); }
    if (ev.str) { burst(['rise'], hero.group.position, color); number(at, `+${ev.str} strength`, ev.combo ? 'buf combo' : 'buf'); }
    if (ev.drew?.length) { burst(['rise'], hero.group.position, color); number(at, `draw ${ev.drew.length}`, 'buf'); }
    glow(hero, color, 0.06, 200);
  }

  function cardBeat(ev) {
    const card = data.cards[ev.id];
    const fam = FAMILIES[card.family];
    const M = card.look.ms * (card.family === 'finisher' ? 1 : pace.cardMs ?? 1);
    const hitAt = M * fam.hitFrac;
    const dest = strikeTargets(ev, card, fam);
    const groups = [];
    for (const h of ev.hits) (groups[h.hit] ??= []).push(h);
    const cues = [];
    const cue = (at, fn) => cues.push({ at, fn });
    const big = card.family === 'finisher';
    const lastHit = hitAt + Math.max(0, groups.length - 1) * fam.gapMs;

    cue(0, () => {
      info.chain = ev.chain;
      info.lastCard = ev.id;
      if (pace.director && !big) directorCut(ev, card);
      hero.play(fam.clip, (fam.clipHit * 1000) / hitAt);
      glow(hero, card.look.color, big ? 0.06 : 0.04, big ? M * fam.releaseAt : 140);
      if (card.block && card.dmg) selfEffect(ev, card); // Shield Bash: shield up as it charges
    });
    if (big) {
      info.finishers++;
      const lift = M * fam.leapAt;
      cue(0, () => {
        info.cinematic = true;
        letterboxGoal = skipping ? 0 : 1;
        if (!skipping) {
          dimLights(fam.dim);
          const c = stage.cinematic.windup;
          rig.cut({ position: hero.home.clone().add(c.offset.clone().multiplyScalar(far())), target: hero.home.clone().add(c.look), fov: c.fov });
        }
        showBanner(card.name, card.look.color, 'title finisher');
      });
      if (dest) cue(lift, () => tween(hero, dest, hitAt - lift, 1.6));
      cue(hitAt - 1, () => {
        const t = foeFig(ev.target) ?? foeFig(groups[0]?.[0]?.target);
        const c = stage.cinematic.impact;
        if (t && !skipping) rig.cut({ position: t.home.clone().add(c.offset.clone().multiplyScalar(far())), target: t.home.clone().add(c.look), fov: c.fov });
      });
    } else if (dest) {
      cue(0, () => tween(hero, dest, Math.min(hitAt * 0.55, 180)));
    }
    groups.forEach((g, k) => cue(hitAt + k * fam.gapMs, () => impact(ev, card, fam, g, k, big)));
    if (!ev.hits.length || (ev.block && !ev.hits.length)) cue(hitAt, () => selfEffect(ev, card));
    cue(lastHit + 1, () => applySnap(ev.snap));
    if (big) {
      cue(M * fam.returnAt, () => tween(hero, hero.home, M * (fam.releaseAt - fam.returnAt)));
      cue(M * fam.releaseAt, () => { rig.release(); letterboxGoal = 0; dimLights(1); info.cinematic = false; });
    } else if (dest) {
      const back = Math.min(180, M * 0.25);
      cue(Math.max(lastHit + 60, M - back), () => tween(hero, hero.home, back));
    }
    return { cues, dur: Math.max(M, lastHit + 80) + (pace.cardGapMs ?? 0) };
  }

  // Mode B: a hard cut to this card family's shot (stage.shots), held through the card.
  function directorCut(ev, card) {
    if (skipping) return;
    const shot = stage.shots[card.family];
    if (!shot) return;
    const struck = [...new Set(ev.hits.map((h) => h.target))].map(foeFig).filter(Boolean);
    const target = foeFig(ev.target) ?? struck[0] ?? foeFig(0);
    const centre = struck.length ? struck.reduce((s, f) => s.add(f.home), V()).multiplyScalar(1 / struck.length) : target?.home.clone() ?? V();
    const point = (which) => (which === 'hero' ? hero.home.clone() : which === 'centre' ? centre.clone() : (target?.home ?? centre).clone());
    rig.cut({ position: point(shot.anchor).add(shot.offset.clone().multiplyScalar(far())), target: point(shot.aim).add(shot.look), fov: shot.fov });
    info.cuts++;
  }

  function enemyBeat(ev) {
    const f = foeFig(ev.who);
    const m = ev.move;
    const M = pace.enemyMs;
    const cues = [];
    const cue = (at, fn) => cues.push({ at, fn });
    if (pace.director) cue(0, () => { if (rig.cutting && !info.cinematic) rig.release(); });
    const hitAt = M * ENEMY.hitFrac;
    if (m.atk) {
      const dest = V(hero.home.x + ENEMY.reach, 0, hero.home.z);
      cue(0, () => { tween(f, dest, Math.min(180, hitAt * 0.5)); f.play('attack', (ENEMY.clipHit * 1000) / hitAt); });
      ev.hits.forEach((h, k) => cue(hitAt + k * ENEMY.gapMs, () => {
        shown.hero.hp = h.hpLeft;
        shown.hero.block = Math.max(0, shown.hero.block - h.blocked);
        const at = chest(hero);
        info.impacts++;
        if (h.amount) {
          number(at, `${h.amount}`, 'hurt');
          glow(hero, ENEMY.color, ENEMY.glow);
          burst(['slash', 'sparks'], at, ENEMY.color, { tilt: k % 2 ? -0.6 : 0.8 });
          hero.play(h.hpLeft ? 'hit' : 'death', 1.3);
          shake(ENEMY.shake);
        } else {
          number(at, 'blocked', 'blk');
          burst(['bubble', 'sparks'], at, '#8fd3ff');
          hero.play('blockHit', 1.6);
          shake(ENEMY.shake * 0.5);
        }
        if (!h.hpLeft) hero.play('death');
        stop(ENEMY.hitStopMs);
      }));
      const end = hitAt + Math.max(0, ev.hits.length - 1) * ENEMY.gapMs;
      cue(end + 60, () => tween(f, f.home, Math.max(60, M - end - 60)));
    } else {
      cue(0, () => f.play(m.block && !m.str && !m.strAll ? 'guard' : 'buff', 1.4));
    }
    cue(hitAt + 1, () => {
      const at = chest(f);
      if (m.block) { burst(['bubble'], at, '#9ab8ff'); number(at, `+${m.block} block`, 'blk'); }
      if (m.str) { burst(['rise'], f.group.position, '#ff5050'); number(at, `+${m.str} strength`, 'buf'); }
      if (m.strAll) foes.forEach((o, i) => { if (ev.snap.enemies[i].alive) { burst(['rise'], o.fig.group.position, '#ff5050'); number(chest(o.fig), `+${m.strAll} strength`, 'buf'); } });
    });
    const dur = M + Math.max(0, ev.hits.length - 1) * ENEMY.gapMs;
    cue(dur - 1, () => applySnap(ev.snap));
    return { cues, dur };
  }

  function makeBeat(ev) {
    info.lastEvent = ev.type;
    if (ev.type === 'card') return cardBeat(ev);
    if (ev.type === 'enemy') return enemyBeat(ev);
    if (ev.type === 'fightStart') return { dur: 700, cues: [{ at: 0, fn: () => setupFight(ev) }] };
    if (ev.type === 'turnStart') {
      return { dur: pace.turnGapMs, cues: [{ at: 0, fn: () => { applySnap(ev.snap); info.chain = 0; } }, { at: pace.turnGapMs, fn: () => { info.turnKey = `${info.fight}:${ev.turn}`; } }] };
    }
    if (ev.type === 'fightWon') return { dur: pace.fightGapMs, cues: [{ at: 0, fn: () => { if (pace.director && !info.cinematic) rig.release(); } }, { at: 250, fn: () => showBanner('Fight won', '#9fe89f', 'title') }] };
    if (ev.type === 'runEnd') {
      return { dur: 700, cues: [{ at: 0, fn: () => { if (ev.result === 'win') { hero.play('buff'); burst(['rise', 'ring'], hero.group.position, '#ffe27a'); } } }] };
    }
    if (ev.type === 'comboEnd') {
      // Mode C: why the combo stopped. A timeout gets its own beat so it reads as a miss.
      const text = { timeout: 'Too slow!', limit: `Full combo · ${ev.cards}`, empty: 'Hand empty' }[ev.reason];
      return { dur: text ? 420 : 0, cues: [{ at: 0, fn: () => { info.comboEnds.push(ev.reason); if (text) showBanner(text, ev.reason === 'timeout' ? '#ff8a6a' : '#ffe08a', 'title'); } }] };
    }
    return { dur: 0, cues: [] }; // reward, picked: the mode view shows those
  }

  function runBeat(dt) {
    let budget = dt;
    for (;;) {
      if (!beat) {
        if (!queue.length) return;
        beat = makeBeat(queue.shift());
        beat.t = 0;
        beat.cues.sort((a, b) => a.at - b.at);
        beat.i = 0;
      }
      beat.t += budget;
      while (beat.i < beat.cues.length && beat.cues[beat.i].at <= beat.t) {
        beat.cues[beat.i++].fn();
        if (hitStop > 0) { beat.t = Math.min(beat.t, beat.cues[beat.i - 1].at); return; } // freeze from the impact on
      }
      if (beat.t < beat.dur || beat.i < beat.cues.length) return;
      budget = beat.t - beat.dur;
      beat = null;
      beatsPlayed++;
      if (budget <= 0) return;
    }
  }

  function step(dt) {
    // Timers and tweens freeze during hit-stop, like the figures.
    for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].ms -= dt) <= 0) timers.splice(i, 1)[0].fn();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.ms);
      const e = 1 - (1 - k) * (1 - k);
      tw.fig.group.position.lerpVectors(tw.from, tw.to, e);
      if (tw.arc) tw.fig.group.position.y += Math.sin(Math.PI * k) * tw.arc;
      if (k >= 1) tweens.splice(i, 1);
    }
  }

  return {
    info,
    shown,
    hero,
    foeFigure: foeFig,
    foeCount: () => foes.length,
    push(events) { queue.push(...events); },
    setPreview(p) { preview = p; },
    busy: () => !!beat || queue.length > 0,
    pending: () => queue.length + (beat ? 1 : 0),
    beatsPlayed: () => beatsPlayed,
    get speed() { return speed; },
    setSpeed(s) { speed = s; },
    hitStopping: () => hitStop > 0,
    update(dtMs) {
      const dt = dtMs * speed;
      rig.update(dt);
      vfx.update(hitStop > 0 ? dt * 0.25 : dt);
      flash = Math.max(0, flash - dt / 160);
      ui.flash.style.opacity = flash.toFixed(3);
      letterbox += (letterboxGoal - letterbox) * Math.min(1, dt / 90);
      document.body.style.setProperty('--letterbox', letterbox.toFixed(3));
      document.body.classList.toggle('cinematic', info.cinematic);
      for (let i = labels.length - 1; i >= 0; i--) {
        const l = labels[i];
        if ((l.t += dt) >= l.ms) { l.el.remove(); labels.splice(i, 1); }
      }
      if (banner && (banner.t += dt) >= banner.ms) { ui.banner.hidden = true; banner = null; }
      if (hitStop > 0) {
        hitStop = Math.max(0, hitStop - dt);
      } else {
        figures.update(dt / 1000);
        step(dt);
        runBeat(dt);
      }
      placeAll();
    },
    // Skip: play every queued event to its end at once (numbers land, no effects).
    skip() {
      skipping = true;
      for (;;) {
        if (!beat) {
          if (!queue.length) break;
          beat = makeBeat(queue.shift());
          beat.cues.sort((a, b) => a.at - b.at);
          beat.i = 0;
        }
        while (beat.i < beat.cues.length) beat.cues[beat.i++].fn();
        beat = null;
        beatsPlayed++;
      }
      for (const t of timers.splice(0)) t.fn();
      for (const tw of tweens.splice(0)) tw.fig.group.position.copy(tw.to);
      hitStop = 0;
      flash = 0;
      letterboxGoal = letterbox = 0;
      for (const l of labels.splice(0)) l.el.remove();
      ui.banner.hidden = true;
      banner = null;
      vfx.clear();
      rig.reset();
      dimLights(1);
      info.cinematic = false;
      skipping = false;
    },
    dispose() {
      for (const l of labels.splice(0)) l.el.remove();
      ui.plates.replaceChildren();
      ui.banner.hidden = true;
      flash = 0;
      ui.flash.style.opacity = 0;
      document.body.style.setProperty('--letterbox', 0);
      document.body.classList.remove('cinematic');
      vfx.clear();
      rig.reset();
      dimLights(1);
    },
  };
}
