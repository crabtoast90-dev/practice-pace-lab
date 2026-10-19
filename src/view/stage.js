import * as THREE from 'three';

// SHARED by every pace mode: one plain crypt floor (the brief says polish goes to hits
// and camera, not the arena). The stage owns its lights, the figure spots and the
// camera poses: laptop (wide), phone (portrait, a 3/4 angle so the line of fighters
// runs into the screen) and the finisher close-ups.

function sky(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Flagstones drawn once on a canvas: enough texture to read motion and shake against.
function stones() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3b3a44';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 52 + ((x * 7 + y * 13) % 5) * 5;
    g.fillStyle = `rgb(${v},${v - 2},${v + 8})`;
    g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 64 + 2, 60, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

function arenaStage() {
  const group = new THREE.Group();
  const key = new THREE.DirectionalLight(0xffe2c0, 2.4);
  key.position.set(-4, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0x7fa0ff, 1.4);
  rim.position.set(6, 5, -6);
  const hemi = new THREE.HemisphereLight(0x8c9ad0, 0x221a18, 1.1);
  group.add(key, rim, hemi);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshStandardMaterial({ map: stones(), roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  // A few broken pillars at the edge, so the camera cuts have something to read depth by.
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x55525e, roughness: 0.9 });
  for (const [x, z, h] of [[-6, -5, 3.2], [-2, -7, 4.2], [3, -7.5, 2.4], [7, -4.5, 3.6], [-8, 1, 1.6], [8.5, 2, 2.2]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, h, 10), pillarMat);
    p.position.set(x, h / 2, z);
    p.castShadow = p.receiveShadow = true;
    group.add(p);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    group,
    lights: { key, rim, hemi, base: { key: key.intensity, rim: rim.intensity, hemi: hemi.intensity } },
    background: sky('#1b1f33', '#3a3550'),
    fog: new THREE.Fog(0x2e2b40, 12, 30),
    // Hero on the left facing right; up to three skeletons on the right.
    spots: {
      hero: { position: V(-2.3, 0, 0.3), facing: Math.PI / 2 },
      foes: [
        { position: V(1.1, 0, -0.2), facing: -Math.PI / 2 },
        { position: V(2.7, 0, 0.7), facing: -Math.PI / 2 },
        { position: V(2.9, 0, -1.2), facing: -Math.PI / 2 },
      ],
    },
    camera: { position: V(-0.2, 3.1, 8.2), target: V(0.25, 1.05, 0), fov: 40 },
    // Phone: from behind the knight's left shoulder, so the line of fighters runs into the
    // screen and fits between the top bar and the hand (found by a search, see DECISIONS).
    portrait: { position: V(-8.63, 5.16, 5.21), target: V(0.4, 0.3, 0), fov: 44 },
    // Finisher cuts, relative to the hero (x toward the target).
    cinematic: {
      windup: { offset: V(-2.6, 0.5, 4.6), look: V(1.6, 1.1, 0), fov: 48 },
      impact: { offset: V(-0.4, 0.6, 4.4), look: V(-0.4, 1.1, 0), fov: 50 },
      portraitPull: 1.9, // phone: the cuts sit this many times further back
    },
  };
}

const STAGES = { arena: arenaStage };

export function createStage(scene, name = 'arena') {
  const st = STAGES[name]();
  scene.add(st.group);
  scene.background = st.background;
  scene.fog = st.fog;
  return { ...st, dispose() { scene.remove(st.group); } };
}

// The resting camera pose for this screen shape.
export function basePose(st, aspect) {
  const c = aspect < 1 && st.portrait ? st.portrait : st.camera;
  return { position: c.position.clone(), target: c.target.clone(), fov: c.fov };
}
