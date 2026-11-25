import * as THREE from 'three/webgpu';

// Lightweight, camera-following weather for the iPad edition.
// Rain is opt-in; dust motes remain subtle and use a single Points draw call.
function createWeatherEffects(scene, { reduced = false } = {}) {
  const rainCount = reduced ? 260 : 620;
  const dustCount = reduced ? 70 : 150;
  const rainData = Array.from({ length: rainCount }, () => ({
    x: (Math.random() - 0.5) * 46,
    y: Math.random() * 34,
    z: (Math.random() - 0.5) * 46,
    speed: 17 + Math.random() * 12
  }));

  const rainGeometry = new THREE.BoxGeometry(0.018, 0.48, 0.018);
  const rainMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8cce8, transparent: true, opacity: 0.48,
    depthWrite: false, toneMapped: false
  });
  const rain = new THREE.InstancedMesh(rainGeometry, rainMaterial, rainCount);
  rain.name = 'IPadRainParticles';
  rain.frustumCulled = false;
  rain.visible = false;
  rain.renderOrder = 2;
  scene.add(rain);

  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocity = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 32;
    dustPositions[i * 3 + 1] = Math.random() * 13;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    dustVelocity[i * 3] = (Math.random() - 0.5) * 0.12;
    dustVelocity[i * 3 + 1] = 0.025 + Math.random() * 0.07;
    dustVelocity[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xf0d8b4, size: reduced ? 0.055 : 0.075,
    transparent: true, opacity: 0.20, depthWrite: false,
    sizeAttenuation: true, toneMapped: false
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'IPadAtmosphericDust';
  dust.frustumCulled = false;
  scene.add(dust);

  const dummy = new THREE.Object3D();
  let rainEnabled = false;
  function toggleRain() {
    rainEnabled = !rainEnabled;
    rain.visible = rainEnabled;
    return rainEnabled;
  }

  function update(dt, focus, camera) {
    const step = Math.min(dt, 0.05);
    dust.position.set(focus.x, 0, focus.z);
    for (let i = 0; i < dustCount; i++) {
      const j = i * 3;
      dustPositions[j] += dustVelocity[j] * step;
      dustPositions[j + 1] += dustVelocity[j + 1] * step;
      dustPositions[j + 2] += dustVelocity[j + 2] * step;
      if (dustPositions[j + 1] > 14) {
        dustPositions[j + 1] = 0;
        dustPositions[j] = (Math.random() - 0.5) * 32;
        dustPositions[j + 2] = (Math.random() - 0.5) * 32;
      }
    }
    dustGeometry.attributes.position.needsUpdate = true;

    if (!rainEnabled) return;
    const windX = Math.sin(performance.now() * 0.00018) * 2.2;
    for (let i = 0; i < rainCount; i++) {
      const p = rainData[i];
      p.y -= p.speed * step;
      p.x += windX * step;
      if (p.y < -1) {
        p.y = 22 + Math.random() * 13;
        p.x = (Math.random() - 0.5) * 46;
        p.z = (Math.random() - 0.5) * 46;
      }
      dummy.position.set(focus.x + p.x, focus.y + p.y, focus.z + p.z);
      dummy.rotation.set(0, 0, -0.12 - windX * 0.018);
      dummy.updateMatrix();
      rain.setMatrixAt(i, dummy.matrix);
    }
    rain.instanceMatrix.needsUpdate = true;
    rain.position.set(0, 0, 0);
  }

  function dispose() {
    scene.remove(rain, dust);
    rainGeometry.dispose();
    rainMaterial.dispose();
    dustGeometry.dispose();
    dustMaterial.dispose();
  }

  return { update, toggleRain, get rainEnabled() { return rainEnabled; }, dispose };
}

export { createWeatherEffects };
