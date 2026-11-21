// O client (AGENTS §4): desenha o que a sim diz e nunca decide regra.
// Por enquanto só desenha a sala greybox; a câmera no ombro é a tarefa 4.
import * as THREE from 'three';
import { parseLevel } from '@jogo/sim';
import salaRaw from '../../content/levels/sala/level.json';
import { buildLevel } from './level.ts';

const level = parseLevel(salaRaw);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa3b0);
scene.fog = new THREE.Fog(0x8fa3b0, 30, 70);
scene.add(new THREE.HemisphereLight(0xdde8f0, 0x4a4030, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(12, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
scene.add(sun);
scene.add(buildLevel(level));

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const spawn = level.spawns.find((s) => s.id === 'player')!;
camera.position.set(spawn.pos[0] + 6, 12, spawn.pos[2] + 10);
camera.lookAt(0, 0, 0);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
