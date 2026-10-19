import * as THREE from 'three';

// SHARED VFX, all made in code (no textures). Every effect runs on the game clock
// (update(dtMs)), so the test clock replays them frame for frame. Colors come from each
// card's look.color; sizes and lengths are the defaults below unless a family overrides.
const add = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // fixed "random" spread

export function createVfx(scene) {
  const live = [];
  const root = new THREE.Group();
  scene.add(root);
  const impactLight = new THREE.PointLight(0xffffff, 0, 7, 1.6);
  root.add(impactLight);
  let lightLeft = 0;
  let lightMs = 1;
  let lightPeak = 0;
  let n = 0;

  function spawn(obj, ms, tick) {
    root.add(obj);
    live.push({ obj, ms, t: 0, tick });
  }

  const fx = {
    // A crescent swipe across the target, facing the camera side (+z).
    slash(at, color, { size = 1.1, tilt = 0.6, ms = 240 } = {}) {
      const m = new THREE.Mesh(new THREE.RingGeometry(size * 0.78, size, 40, 1, 0, Math.PI * 0.85), add(color));
      m.position.copy(at);
      m.rotation.set(0, 0, tilt);
      spawn(m, ms, (k) => {
        m.rotation.z = tilt - k * 1.4;
        m.scale.setScalar(0.7 + k * 0.5);
        m.material.opacity = 1 - k * k;
      });
      const core = new THREE.Mesh(new THREE.RingGeometry(size * 0.9, size * 0.96, 40, 1, 0, Math.PI * 0.85), add(0xffffff));
      core.position.copy(at);
      core.rotation.set(0, 0, tilt);
      spawn(core, ms * 0.7, (k) => { core.rotation.z = tilt - k * 1.4; core.scale.setScalar(0.7 + k * 0.5); core.material.opacity = 1 - k; });
    },
    // A flat shockwave on the floor.
    ring(at, color, { radius = 2.4, ms = 420, width = 0.18 } = {}) {
      const m = new THREE.Mesh(new THREE.RingGeometry(1 - width, 1, 48), add(color));
      m.rotation.x = -Math.PI / 2;
      m.position.set(at.x, 0.04, at.z);
      spawn(m, ms, (k) => { m.scale.setScalar(0.2 + radius * Math.sqrt(k)); m.material.opacity = 1 - k; });
    },
    // A burst of glowing chips flying out of the hit point.
    sparks(at, color, { count = 14, speed = 4, ms = 380 } = {}) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const vel = [];
      for (let i = 0; i < count; i++) {
        const a = hash(n * 31 + i) * Math.PI * 2;
        const up = hash(n * 17 + i * 3);
        vel.push(new THREE.Vector3(Math.cos(a) * (0.4 + up), 0.6 + up * 1.4, Math.sin(a) * (0.4 + up)).multiplyScalar(speed * 0.6));
      }
      n++;
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      p.position.copy(at);
      spawn(p, ms, (k) => {
        const t = (k * ms) / 1000;
        for (let i = 0; i < count; i++) {
          pos[i * 3] = vel[i].x * t;
          pos[i * 3 + 1] = vel[i].y * t - 6 * t * t;
          pos[i * 3 + 2] = vel[i].z * t;
        }
        geo.attributes.position.needsUpdate = true;
        p.material.opacity = 1 - k;
      });
    },
    // A column of light dropping onto a spot (finishers).
    pillar(at, color, { radius = 0.7, height = 7, ms = 700 } = {}) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.3, height, 24, 1, true), add(color, 0.6));
      m.position.set(at.x, height / 2, at.z);
      spawn(m, ms, (k) => { m.scale.set(1 - k * 0.7, 1, 1 - k * 0.7); m.material.opacity = 0.6 * (1 - k); });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, height, 12, 1, true), add(0xffffff));
      core.position.copy(m.position);
      spawn(core, ms * 0.6, (k) => { core.material.opacity = 0.7 * (1 - k); });
    },
    // A shield bubble around a figure (block).
    bubble(at, color, { radius = 1.15, ms = 560 } = {}) {
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), add(color, 0.25));
      const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.01, 1), add(color, 0.9));
      wire.material.wireframe = true;
      for (const m of [shell, wire]) {
        m.position.set(at.x, at.y, at.z);
        spawn(m, ms, (k) => {
          const pop = k < 0.2 ? 0.6 + (k / 0.2) * 0.45 : 1.05 - (k - 0.2) * 0.06;
          m.scale.setScalar(pop);
          m.rotation.y = k * 1.2;
          m.material.opacity = (m === wire ? 0.9 : 0.25) * (k < 0.7 ? 1 : (1 - k) / 0.3);
        });
      }
    },
    // Rings rising around a figure (buffs).
    rise(at, color, { ms = 700, rings = 3 } = {}) {
      for (let i = 0; i < rings; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 32), add(color));
        m.rotation.x = Math.PI / 2;
        spawn(m, ms, (k) => {
          const q = Math.max(0, Math.min(1, k * 1.5 - i * 0.22));
          m.position.set(at.x, 0.1 + q * 2.2, at.z);
          m.scale.setScalar(1 - q * 0.45);
          m.material.opacity = q > 0 ? 1 - q : 0;
        });
      }
    },
    // A quick light at the hit point, so the figures light up from the impact.
    light(at, color, intensity = 30, ms = 220) {
      impactLight.position.set(at.x, at.y + 0.3, at.z + 0.6);
      impactLight.color.set(color);
      impactLight.intensity = lightPeak = intensity;
      lightLeft = lightMs = ms;
    },
    update(dtMs) {
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i];
        e.t += dtMs;
        const k = Math.min(1, e.t / e.ms);
        e.tick(k);
        if (k >= 1) {
          root.remove(e.obj);
          e.obj.geometry.dispose();
          e.obj.material.dispose();
          live.splice(i, 1);
        }
      }
      if (lightLeft > 0) {
        lightLeft = Math.max(0, lightLeft - dtMs);
        impactLight.intensity = lightPeak * (lightLeft / lightMs) ** 2;
      }
    },
    count: () => live.length,
    clear() {
      for (const e of live.splice(0)) { root.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
      impactLight.intensity = 0;
      lightLeft = 0;
    },
    dispose() { fx.clear(); scene.remove(root); },
  };
  return fx;
}
