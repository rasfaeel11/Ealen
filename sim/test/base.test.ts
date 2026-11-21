import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createRng, parseLevel, TICK } from '../src/index.ts';
import sala from '../../content/levels/sala/level.json' with { type: 'json' };

test('a mesma semente dá a mesma sequência', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('a sala de teste é um nível válido', () => {
  const lv = parseLevel(sala);
  assert.ok(lv.blocks.length > 0 && lv.props.length > 0 && lv.water.length > 0);
});

test('o Rapier sobe em Node e uma caixa cai no chão da sala', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = TICK;
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.5, 10).setTranslation(0, -0.5, 0));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 3, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body);
  for (let i = 0; i < 180; i++) world.step();
  assert.ok(Math.abs(body.translation().y - 0.5) < 0.05, `y=${body.translation().y}`);
});
