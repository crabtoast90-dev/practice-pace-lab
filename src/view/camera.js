import * as THREE from 'three';
import { basePose } from './stage.js';

// SHARED camera rig: the resting pose from the stage, plus shake, a punch-in toward a
// point (combo hits) and hard cuts to a held pose (finisher cinematics). Runs on the
// game clock only, so the test clock gives the same frames every run.
export function createCameraRig(camera) {
  let stage = null;
  let aspect = 1;
  let time = 0;
  let shake = 0; // metres, decays
  const punch = { amount: 0, at: new THREE.Vector3() };
  let cut = null; // { position, target, fov } while a cinematic holds the camera

  function apply() {
    if (!stage) return;
    const base = basePose(stage, aspect);
    const pose = cut ?? base;
    const pos = pose.position.clone();
    const target = pose.target.clone();
    if (punch.amount > 0) pos.lerp(punch.at, punch.amount);
    if (shake > 0.001) {
      pos.x += Math.sin(time * 91.7) * shake;
      pos.y += Math.sin(time * 73.3 + 1.7) * shake * 0.8;
      target.x += Math.sin(time * 67.1 + 0.4) * shake * 0.5;
    }
    camera.fov = pose.fov;
    camera.aspect = aspect;
    camera.position.copy(pos);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }

  return {
    setStage(st, a) { stage = st; aspect = a; apply(); },
    setAspect(a) { aspect = a; apply(); },
    shake(amount) { shake = Math.max(shake, amount); },
    punch(at, amount) { punch.at.copy(at); punch.amount = Math.max(punch.amount, amount); },
    cut(pose) { cut = pose; apply(); },
    release() { cut = null; apply(); },
    get cutting() { return !!cut; },
    reset() { shake = 0; punch.amount = 0; cut = null; apply(); },
    update(dtMs) {
      time += dtMs / 1000;
      shake *= Math.exp(-dtMs / 90);
      punch.amount *= Math.exp(-dtMs / 160);
      apply();
    },
  };
}
