// Using global THREE (UMD build) so the page works when opened without an HTTP server (file://).

// Three.js scene
const container = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2.2, 7.5);

const hemi = new THREE.HemisphereLight(0x404040, 0x0a0a0f, 0.8); scene.add(hemi);
const keyLight = new THREE.PointLight(0xffc176, 1.2, 30); keyLight.position.set(2, 3, 2); scene.add(keyLight);
const fillLight = new THREE.PointLight(0x66ccff, 0.7, 25); fillLight.position.set(-2.5, 1.5, 3.5); scene.add(fillLight);

const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshStandardMaterial({ color: 0x18161f, roughness: 0.9, metalness: 0.05 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

const columnMat = new THREE.MeshStandardMaterial({ color: 0x2a2735, roughness: 0.8 });
for (let i = 0; i < 6; i++) {
  const h = 2.6 + Math.random() * 0.4;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, h, 16), columnMat);
  const a = (i / 6) * Math.PI * 2;
  col.position.set(Math.cos(a) * 3.2, h / 2, Math.sin(a) * 3.2);
  scene.add(col);
}

const artifacts = [];
const loader = new THREE.GLTFLoader();
// artifactData: name, optional model file (assets/models/<name>.glb), color fallback, position
const artifactData = [
  { name: 'about', model: 'about.glb', color: 0xe9c46a, x: -1.6, z: -0.6 },
  { name: 'skills', model: 'skills.glb', color: 0x2a9d8f, x: -0.2, z: 0.8 },
  { name: 'projects', model: 'projects.glb', color: 0xf4a261, x: 1.4, z: -0.3, game: true },
  { name: 'contact', model: 'contact.glb', color: 0x00d4ff, x: 0.2, z: -1.4 }
];

function addPrimitiveArtifact(d, i) {
  // Create a distinct procedural shape per artifact name so models appear without GLB files
  let geo;
  const size = 0.28;
  switch (d.name) {
    case 'about':
      geo = new THREE.ConeGeometry(size * 1.1, size * 2.2, 12);
      break;
    case 'skills':
      geo = new THREE.TorusGeometry(size * 1.2, size * 0.35, 16, 48);
      break;
    case 'projects':
      geo = new THREE.BoxGeometry(size * 1.6, size * 1.2, size * 1.2);
      break;
    case 'contact':
      geo = new THREE.SphereGeometry(size * 1.1, 24, 18);
      break;
    default:
      geo = new THREE.IcosahedronGeometry(size, 1);
  }

  const mat = new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.35, roughness: 0.3, emissive: d.color, emissiveIntensity: 0.12 });
  const mesh = new THREE.Mesh(geo, mat);
  // tweak initial position and slight offsets per index for natural layout
  mesh.position.set(d.x, 1.0 + (i % 2) * 0.2, d.z);
  mesh.userData.panel = d.name;
  if (d.game) mesh.userData.game = true;
  // shape marker used by the animate loop for per-shape idle motion
  mesh.userData._proto = true;
  mesh.userData.shape = d.name;
  scene.add(mesh);
  artifacts.push(mesh);
}

artifactData.forEach((d, i) => {
  if (d.model) {
    const url = `assets/models/${d.model}`;
    // attempt to load a GLTF model; fallback to primitive on error
    loader.load(url, (gltf) => {
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) { addPrimitiveArtifact(d, i); return; }
      // normalize scale and position a bit
      root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
      root.position.set(d.x, 0.8 + (i % 2) * 0.2, d.z);
      root.scale.setScalar(0.9);
      root.userData = root.userData || {};
      root.userData.panel = d.name;
      if (d.game) root.userData.game = true;
      scene.add(root);
      // if the GLTF has animations, create a mixer and play the first clip
      if (gltf.animations && gltf.animations.length > 0) {
        try {
          const mixer = new THREE.AnimationMixer(root);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
          mixers.push(mixer);
        } catch (e) {
          console.warn('Failed to create animation mixer for', url, e);
        }
      }
      artifacts.push(root);
    }, undefined, (err) => {
      // load failed (file missing or CORS) — fallback to primitive
      console.warn('GLTF load failed for', url, err);
      addPrimitiveArtifact(d, i);
    });
  } else {
    addPrimitiveArtifact(d, i);
  }
});

const pGeo = new THREE.BufferGeometry();
const pCount = 400;
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  pPos[i * 3 + 0] = (Math.random() - 0.5) * 12;
  pPos[i * 3 + 1] = Math.random() * 5 + 0.2;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.01, transparent: true, opacity: 0.75 }));
scene.add(particles);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(artifacts, true);
  if (hit[0]) {
    const obj = hit[0].object;
    // prefer panel if specified
    if (obj.userData?.game) {
      openMiniGame();
    } else if (obj.userData?.panel) {
      openPanel(obj.userData.panel);
    }
    // camera focus tween (works for primitives and gltf roots)
    const pos = hit[0].object.parent && artifacts.includes(hit[0].object.parent) ? hit[0].object.parent.position : hit[0].object.position;
    const dest = new THREE.Vector3(pos.x + 2.2, pos.y + 1.6, pos.z + 3);
    if (window.gsap) window.gsap.to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: 1.2, ease: 'power2.out' });
  }
});

const panels = {
  about: document.getElementById('panel-about'),
  skills: document.getElementById('panel-skills'),
  projects: document.getElementById('panel-projects'),
  contact: document.getElementById('panel-contact')
};
function openPanel(name) {
  Object.values(panels).forEach(p => p.classList.remove('active'));
  if (panels[name]) panels[name].classList.add('active');
}
document.querySelectorAll('[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => openPanel(btn.getAttribute('data-panel')));
});

const target = new THREE.Vector3();
window.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / window.innerWidth) - 0.5;
  const ny = (e.clientY / window.innerHeight) - 0.5;
  if (window.gsap) window.gsap.to(target, { x: nx * 0.8, y: ny * -0.3 + 1.6, duration: 0.8, overwrite: true });
  // hover highlight + scale animation
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(artifacts, true);
  // reset previous hover state
  artifacts.forEach((m) => {
    // only attempt if mesh material exists
    if (m.material) m.material.emissiveIntensity = 0.15;
    // restore scale
    if (m.userData._hovered) {
      m.userData._hovered = false;
      if (window.gsap) gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'power3.out' });
      else { m.scale.setScalar(1); }
    }
  });
  if (hit[0]) {
    // find top-level parent that represents the artifact (some GLTF nodes may be nested)
    let top = hit[0].object;
    while (top.parent && !artifacts.includes(top)) top = top.parent;
    const targetArtifact = artifacts.includes(top) ? top : hit[0].object;
    if (targetArtifact.material) targetArtifact.material.emissiveIntensity = 0.4;
    if (!targetArtifact.userData._hovered) {
      targetArtifact.userData._hovered = true;
      if (window.gsap) gsap.to(targetArtifact.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.35, ease: 'power3.out' });
      else { targetArtifact.scale.setScalar(1.12); }
    }
  }
});

const clock = new THREE.Clock();
const mixers = [];
function animate() {
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();
  artifacts.forEach((m, i) => {
    // base vertical bob
    const baseY = 1.0 + Math.sin(t + i) * 0.15;
    // per-shape idle behaviors for procedural placeholders (GLTFs fall back to default)
    const shape = m.userData?.shape;
    switch (shape) {
      case 'about':
        // cone: slow spin and wobble
        m.rotation.x += 0.01;
        m.rotation.y += 0.008;
        m.rotation.z = Math.sin(t * 1.8 + i) * 0.25;
        m.position.y = baseY + Math.sin(t * 2 + i) * 0.06;
        break;
      case 'skills':
        // torus: tilt and gentle rotation
        m.rotation.x = Math.sin(t * 0.9 + i) * 0.2;
        m.rotation.y += 0.01;
        m.rotation.z = Math.sin(t * 1.2 + i) * 0.6;
        m.position.y = baseY;
        break;
      case 'projects':
        // box: steady spin (also the 'game' artifact)
        m.rotation.x += 0.004 + i * 0.0005;
        m.rotation.y += 0.02 + i * 0.0007;
        m.position.y = baseY;
        break;
      case 'contact':
        // sphere: pulse scale
        const pulse = 1 + Math.sin(t * 3 + i) * 0.06;
        if (!m.userData._hovered) m.scale.set(pulse, pulse, pulse);
        m.position.y = baseY;
        break;
      default:
        // default gentle rotation for GLTFs or unknown shapes
        m.rotation.x += 0.004 + i * 0.0005;
        m.rotation.y += 0.006 + i * 0.0007;
        m.position.y = baseY;
    }
  });
  particles.rotation.y = t * 0.02;
  // advance any GLTF animation mixers
  mixers.forEach(m => m.update(delta));
  camera.position.x += (target.x - camera.position.x) * 0.06;
  camera.position.y += (target.y - camera.position.y) * 0.06;
  camera.lookAt(0, 1.2, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// expose for external scripts
window.scene = scene; window.camera = camera; window.artifacts = artifacts; window.renderer = renderer; window.THREE = THREE;

// Scroll-triggered animations
if (window.gsap && window.ScrollTrigger) {
  window.gsap.registerPlugin(window.ScrollTrigger);
  const sections = document.querySelectorAll('.section .container');
  sections.forEach((box) => {
    window.gsap.from(box, {
      y: 60,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: box, start: 'top 80%' }
    });
  });
}

// Smooth scroll for anchor nav
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id && id.length > 1) {
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Helper to open the mini-game UI and start it programmatically.
function openMiniGame() {
  // reveal the DOM section and scroll to it so the user sees it
  const scene = document.getElementById('scene-minigame');
  scene?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // try to click the start button (minigame.js wires #startGame)
  const startBtn = document.getElementById('startGame');
  if (startBtn) {
    // small delay so the scroll/paint can settle
    setTimeout(() => startBtn.click(), 500);
  }
}


