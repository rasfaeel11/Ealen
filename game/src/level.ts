import * as THREE from 'three';
import type { Level } from '@jogo/sim';

// Greybox: cada tipo de bloco numa cor, para ler o espaço sem arte (docs/assets.md, "O provisório").
const COLORS = { ground: 0x6b6b60, wall: 0x9a9488, ramp: 0x7d8a6a, ledge: 0x857a68 } as const;
const PROP_COLORS = { crate: 0xa0703c, barrel: 0x6e4a2a, dummy: 0xc8b48a } as const;

export function buildLevel(level: Level): THREE.Group {
  const root = new THREE.Group();
  root.name = level.id;

  for (const b of level.blocks) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), new THREE.MeshStandardMaterial({ color: COLORS[b.kind] }));
    mesh.position.set(...b.pos);
    if (b.kind === 'ramp') mesh.rotation.x = Math.asin(2 / b.size[2]); // sobe até a plataforma de 2 m
    if (b.rotY) mesh.rotation.y = b.rotY;
    mesh.castShadow = b.kind !== 'ground';
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  for (const w of level.water) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...w.size),
      new THREE.MeshStandardMaterial({ color: 0x2f5a6e, transparent: true, opacity: 0.75 }),
    );
    mesh.position.set(...w.pos);
    root.add(mesh);
  }

  for (const p of level.props) {
    const geo =
      p.kind === 'crate' ? new THREE.BoxGeometry(1, 1, 1)
      : p.kind === 'barrel' ? new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16)
      : new THREE.CapsuleGeometry(0.35, 1.1, 4, 12);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: PROP_COLORS[p.kind] }));
    mesh.position.set(...p.pos);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
