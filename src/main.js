import * as THREE from 'three';
import { createStage, basePose } from './view/stage.js';
import { createFigures } from './view/units.js';
import { createCameraRig } from './view/camera.js';
import { createVfx } from './view/vfx.js';
import { createClock, STEP } from './clock.js';
import { createDebugOverlay } from './debug.js';
import { applyTune, applyDeck } from './tune.js';
import { FAST as FAST_DATA } from './fast/data.js';
import { createFastView } from './view/fast-view.js';
import { PLAN as PLAN_DATA } from './plan/data.js';
import { createPlanView } from './view/plan-view.js';
import { KAITOS as KAITOS_DATA } from './kaitos/data.js';
import { createKaitosView } from './view/kaitos-view.js';

// Start screen picks a pace mode; each mode is one view over the same arena. Rules live
// in the sim (src/core/sim.js + each mode's data file); this file only shows what they hold.
const params = new URLSearchParams(location.search);
const TEST = params.has('test'); // ?test: the clock only moves when the check calls advance()
const seed = Number(params.get('seed') ?? 1); // ?seed=N picks the run
const tuned = (d) => applyDeck(applyTune(d, params.get('tune')), params.get('deck')); // ?tune=rules.energy:4  ?deck=strike,verdict
const DATA = { fast: tuned(FAST_DATA), plan: tuned(PLAN_DATA), kaitos: tuned(KAITOS_DATA) };
const VIEWS = { fast: createFastView, plan: createPlanView, kaitos: createKaitosView };
const MODES = Object.keys(VIEWS);
const $ = (id) => document.getElementById(id);

const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
const rig = createCameraRig(camera);
const figures = createFigures(scene);
const vfx = createVfx(scene);
let loaded = false;
figures.ready.then(() => {
  loaded = true;
  $('loading').hidden = true;
  for (const b of document.querySelectorAll('.mode')) b.disabled = !MODES.includes(b.dataset.mode);
  const start = params.get('mode'); // ?mode=fast skips the start screen
  if (MODES.includes(start)) enter(start);
}).catch((e) => console.error(`models failed to load: ${e.message}`));

let screen = 'start';
let stage = null;
let view = null; // the mode on screen

function enter(mode) {
  leave();
  screen = mode;
  $('start').hidden = true;
  $('back').hidden = false;
  document.body.classList.add('in-mode');
  stage = createStage(scene, 'arena');
  rig.setStage(stage, innerWidth / innerHeight);
  view = VIEWS[mode]({ data: DATA[mode], seed, figures, stage, rig, vfx, camera, canvas, $, onRestart: () => enter(mode) });
  resize();
}

function leave() {
  view?.dispose();
  view = null;
  figures.clear();
  vfx.clear();
  stage?.dispose();
  stage = null;
  screen = 'start';
  $('start').hidden = false;
  $('back').hidden = true;
  document.body.classList.remove('in-mode');
  scene.background = new THREE.Color(0x111522);
}

for (const b of document.querySelectorAll('.mode')) b.addEventListener('click', () => enter(b.dataset.mode));
$('back').addEventListener('click', leave);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  rig.setAspect(innerWidth / innerHeight);
}
addEventListener('resize', resize);
resize();

const clock = createClock({ manual: TEST });
const debug = params.has('debug') ? createDebugOverlay($('fps'), renderer) : null; // ?debug: FPS

function render() {
  if (stage) renderer.render(scene, camera);
  else renderer.clear();
  debug?.frame();
}
function step(dt) {
  clock.tick(dt);
  if (view) view.update(dt * 1000); // the view runs figures, VFX and camera (hit-stop, 2x)
  else figures.update(dt);
}

// Where each figure's feet and head land on screen (-1..1), measured from the resting
// camera pose (not a shake or a cinematic cut), for the check's framing test.
function framing() {
  const cam = camera.clone();
  const pose = basePose(stage, innerWidth / innerHeight);
  cam.position.copy(pose.position);
  cam.fov = pose.fov;
  cam.lookAt(pose.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return figures.all().map((f) => {
    const feet = f.home.clone().project(cam);
    const head = f.home.clone().add(new THREE.Vector3(0, f.height, 0)).project(cam);
    return { id: f.id, feet: [+feet.x.toFixed(2), +feet.y.toFixed(2)], head: [+head.x.toFixed(2), +head.y.toFixed(2)] };
  });
}

function stateText() {
  const lines = [`screen: ${screen}; models ${loaded ? 'loaded' : 'loading'}; seed ${seed}; test clock ${TEST ? `on (${clock.time.toFixed(2)} s)` : 'off'}${params.get('tune') ? `; tune ${params.get('tune')}` : ''}${params.get('deck') ? `; deck ${params.get('deck')}` : ''}`];
  if (view) lines.push(view.stateLine());
  for (const f of figures.list()) lines.push(`  figure ${f.id}: ${f.model}, ${f.animation}`);
  return lines.join('\n');
}

window.__game = {
  state: () => ({ screen, loaded, seed, time: clock.time, figures: figures.list(), framing: stage ? framing() : [], mode: view?.state() ?? null }),
  stateText,
  enter,
  leave,
  bot: () => view?.bot() ?? null, // the bot's next move as what to tap (the check uses it)
  events: () => view?.run.events ?? [], // the sim's full event list, to find where a run differs from Node
  // Test clock: advance simulated time in fixed steps, then draw one frame.
  advance(ms) {
    for (let t = 0; t < ms / 1000 - 1e-9; t += STEP) step(STEP);
    render();
  },
};

if (TEST) render();
else {
  let last = performance.now();
  renderer.setAnimationLoop((t) => {
    step(Math.min(0.1, (t - last) / 1000));
    last = t;
    render();
  });
}
