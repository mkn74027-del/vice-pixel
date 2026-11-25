import * as THREE from 'three/webgpu';
import { createGodRayMaterial } from './tsl-materials.js';

// Low-cost screen-space sun shafts for the iPad edition.
// Three camera-facing, depth-tested planes are placed around the projected sun.
// Nearby buildings occlude them naturally; no ray-marching or extra shadow pass is used.
function createSunShafts(scene, { reduced = false } = {}) {
  const material = createGodRayMaterial();
  const geometry = new THREE.PlaneGeometry(1, 1);
  const count = reduced ? 2 : 3;
  const meshes = [];
  const offsets = reduced
    ? [{ x: -0.34, y: 0.05, r: -0.10 }, { x: 0.32, y: -0.04, r: 0.12 }]
    : [{ x: -0.42, y: 0.04, r: -0.13 }, { x: 0.02, y: 0.12, r: 0.035 }, { x: 0.40, y: -0.06, r: 0.14 }];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'IPadSunShaft' + i;
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    mesh.visible = false;
    mesh.scale.set(reduced ? 15 : 19, reduced ? 58 : 72, 1);
    mesh.rotation.z = offsets[i].r;
    mesh.position.set(offsets[i].x * 18, offsets[i].y * 12, 0);
    scene.add(mesh);
    meshes.push(mesh);
  }

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  const localSun = new THREE.Vector3();
  const inverseCameraRotation = new THREE.Quaternion();
  const anchor = new THREE.Vector3();
  const lookDistance = reduced ? 62 : 72;
  let enabled = true;

  function update(dt, camera, sunLight) {
    if (!enabled || !camera || !sunLight || sunLight.intensity < 0.12) {
      for (const mesh of meshes) mesh.visible = false;
      return;
    }

    sunDir.copy(sunLight.position).normalize();
    if (sunDir.y < 0.035) {
      for (const mesh of meshes) mesh.visible = false;
      return;
    }

    camera.getWorldDirection(forward);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    inverseCameraRotation.copy(camera.quaternion).invert();
    localSun.copy(sunDir).applyQuaternion(inverseCameraRotation);

    // Sun must be in front of the camera and within a generous screen margin.
    if (localSun.z > -0.08) {
      for (const mesh of meshes) mesh.visible = false;
      return;
    }

    const depth = lookDistance;
    const screenX = THREE.MathUtils.clamp(localSun.x / -localSun.z, -1.15, 1.15);
    const screenY = THREE.MathUtils.clamp(localSun.y / -localSun.z, -0.9, 0.9);
    anchor.copy(camera.position)
      .addScaledVector(forward, depth)
      .addScaledVector(right, screenX * depth * 0.48);
    anchor.y += screenY * depth * 0.28;

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      mesh.position.copy(anchor)
        .addScaledVector(right, offsets[i].x * 7.5)
      ;
      mesh.position.y += offsets[i].y * 5.5;
      mesh.quaternion.copy(camera.quaternion);
      mesh.rotateZ(offsets[i].r);
      mesh.visible = true;
      mesh.updateMatrixWorld();
    }
  }

  function dispose() {
    for (const mesh of meshes) scene.remove(mesh);
    geometry.dispose();
    material.dispose();
  }

  return { update, dispose };
}

export { createSunShafts };
