import assert from "node:assert/strict";
import { test } from "node:test";
import { LONG_SHOT_TO_HIT, POINT_BLANK_TO_HIT, abilityTargets, attackEdge, findUnit, gridFromAscii, isShot, startEncounter, usesLeft } from "../index";
import { makeUnit, setup } from "./helpers";

/** O combate à distância: alcance curto e longo, tiro com inimigo colado, altura e munição. */

function shooter(rows: string[]) {
  const { encounter } = setup(rows, (at) => [
    makeUnit("A", "party", at("A"), { equipment: { weapon: "gear-besta" } }),
    makeUnit("B", "enemy", at("B")),
  ]);
  const actor = findUnit(encounter, "A")!;
  return { encounter, actor, target: findUnit(encounter, "B")!, shot: actor.abilities.find((ability) => ability.id.endsWith(".attack"))! };
}

test("a besta atira, a espada não", () => {
  const { shot } = shooter(["A..B"]);
  assert.ok(isShot(shot));
  const { encounter } = setup(["A.B"], (at) => [makeUnit("A", "party", at("A"), { equipment: { weapon: "gear-espada-reta" } }), makeUnit("B", "enemy", at("B"))]);
  assert.ok(!isShot(findUnit(encounter, "A")!.abilities.find((ability) => ability.id.endsWith(".attack"))!));
});

test("na primeira metade do alcance o tiro não perde nada; na segunda, perde", () => {
  const near = shooter(["A..B...."]);
  assert.equal(attackEdge(near.encounter, near.actor, near.shot, near.target).far, false);
  const far = shooter(["A.....B."]);
  const edge = attackEdge(far.encounter, far.actor, far.shot, far.target);
  assert.equal(edge.far, true);
  assert.equal(edge.toHit, -LONG_SHOT_TO_HIT);
});

test("com um inimigo colado o tiro perde, mesmo em outro alvo", () => {
  const { encounter } = setup(["AC.B"], (at) => [
    makeUnit("A", "party", at("A"), { equipment: { weapon: "gear-besta" } }),
    makeUnit("B", "enemy", at("B")),
    makeUnit("C", "enemy", at("C")),
  ]);
  const actor = findUnit(encounter, "A")!;
  const shot = actor.abilities.find((ability) => ability.id.endsWith(".attack"))!;
  const edge = attackEdge(encounter, actor, shot, findUnit(encounter, "B")!);
  assert.equal(edge.crowded, true);
  assert.equal(edge.toHit, -POINT_BLANK_TO_HIT);
});

test("quem atira de cima alcança um quadrado a mais", () => {
  const { grid, markers } = gridFromAscii(["A......B"]);
  const flat = startEncounter({
    grid,
    seed: 1,
    units: [makeUnit("A", "party", markers.A[0], { equipment: { weapon: "gear-besta" } }), makeUnit("B", "enemy", markers.B[0])],
  }).encounter;
  const actor = findUnit(flat, "A")!;
  const shot = actor.abilities.find((ability) => ability.id.endsWith(".attack"))!;
  assert.equal(abilityTargets(flat, actor, shot).length, 0, "de sete quadrados, no plano, não alcança");
  flat.grid.tiles[0] = { ...flat.grid.tiles[0], elevation: 1 };
  assert.equal(abilityTargets(flat, actor, shot).length, 1, "de cima, os sete quadrados entram");
});

test("a besta tem munição contada por luta", () => {
  const { actor, shot } = shooter(["A..B"]);
  assert.equal(usesLeft(actor, shot), 12);
  actor.used = { [shot.id]: 12 };
  assert.equal(usesLeft(actor, shot), 0);
});
