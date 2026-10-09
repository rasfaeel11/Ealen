import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  applyCommand,
  chooseCommand,
  findUnit,
  foresee,
  gridFromAscii,
  startEncounter,
  supportTargets,
  type Encounter,
  type Pos,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run } from "./helpers";

/**
 * Quem acompanha o grupo sem lutar: não é unidade, e o apoio dele é chamado
 * por quem está na vez, sem gastar nada dela, uma vez por rodada.
 */

function withScribe(
  rows: string[],
  place: (at: (marker: string) => Pos) => Unit[],
  surprised?: "enemy",
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({
    grid,
    units: place((marker) => markers[marker][0]),
    supporters: [{ id: "gil", name: "Gil", support: "annotate" }],
    surprised,
    seed: 3,
  });
}

const duel = (at: (marker: string) => Pos) => [
  makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
  makeUnit("E", "enemy", at("E")),
];

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

test("quem acompanha sem lutar não entra na iniciativa nem conta pra vitória", () => {
  const { encounter, events } = withScribe(["A....E"], duel);
  assert.deepEqual(encounter.order.sort(), ["A", "E"]);
  assert.deepEqual(encounter.supporters, [{ id: "gil", name: "Gil", support: "annotate", ready: true }]);
  assert.ok(!eventsOf(events, "battleStarted")[0].order.some((entry) => entry.unit === "gil"));
});

test("Anotar mostra o plano que a IA tem pro inimigo, sem gastar nada de quem chamou", () => {
  const { encounter } = withScribe(["A....E"], duel);
  const hero = activeUnit(encounter)!;
  const enemy = findUnit(encounter, "E")!;
  const [scribe] = encounter.supporters;
  assert.deepEqual(supportTargets(encounter, hero, scribe), [enemy]);

  const plan = foresee(encounter, "E");
  const before = structuredClone(encounter);
  const events = run(encounter, { type: "support", unitId: "A", supporterId: "gil", target: enemy.pos });

  assert.deepEqual(events[0], { type: "supportUsed", supporter: "gil", supporterName: "Gil", support: "annotate", name: "Anotar", unit: "A" });
  const [intent] = eventsOf(events, "intentRevealed");
  assert.equal(intent.unit, "E");
  assert.deepEqual(intent.tile, plan.tile);
  assert.deepEqual(
    intent.abilities.map((ability) => ability.abilityId),
    [plan.action, plan.bonus].flatMap((choice) => (choice ? [choice.ability.id] : [])),
  );
  // Quem anda cinco quadrados até o alvo e bate: o plano tem pra onde ir e em quem.
  assert.notDeepEqual(intent.tile, enemy.pos);
  assert.ok(intent.abilities.some((ability) => ability.target.x === hero.pos.x));

  // Só o apoio se gastou: a vez de quem chamou está inteira, e a luta é a mesma (dado inclusive).
  assert.deepEqual(hero.turn, { movement: hero.speed, action: true, bonus: true, reaction: true });
  assert.equal(scribe.ready, false);
  assert.deepEqual({ ...encounter, supporters: before.supporters }, before);
});

test("o plano anotado é o que o inimigo faz, se nada mudar até a vez dele", () => {
  const { encounter } = withScribe(["A....E"], duel);
  const enemy = findUnit(encounter, "E")!;
  const [intent] = eventsOf(run(encounter, { type: "support", unitId: "A", supporterId: "gil", target: enemy.pos }), "intentRevealed");
  pass(encounter);

  const used: string[] = [];
  for (let i = 0; i < 10 && activeUnit(encounter)?.id === "E"; i++) {
    const command = chooseCommand(encounter);
    if (command.type === "ability") used.push(command.abilityId);
    run(encounter, command);
    if (command.type === "move") assert.deepEqual(enemy.pos, intent.tile);
  }
  assert.ok(used.length > 0);
  assert.equal(used[0], intent.abilities.find((ability) => ability.abilityId === used[0])?.abilityId);
});

test("o apoio vale uma vez por rodada, e volta quando a rodada vira", () => {
  const { encounter } = withScribe(["A..........E"], duel);
  const enemy = findUnit(encounter, "E")!;
  const again = { type: "support", unitId: "A", supporterId: "gil", target: enemy.pos } as const;

  run(encounter, again);
  assert.deepEqual(applyCommand(encounter, again), { ok: false, reason: "resource_spent" });
  assert.deepEqual(supportTargets(encounter, activeUnit(encounter)!, encounter.supporters[0]), []);

  pass(encounter);
  pass(encounter);
  assert.equal(encounter.round, 2);
  assert.equal(encounter.supporters[0].ready, true);
  assert.equal(applyCommand(encounter, again).ok, true);
});

test("apoio que não existe, alvo que não é inimigo e inimigo chamando são recusados", () => {
  const { encounter } = withScribe(["A....E"], duel);
  const hero = activeUnit(encounter)!;
  const enemy = findUnit(encounter, "E")!;

  assert.deepEqual(applyCommand(encounter, { type: "support", unitId: "A", supporterId: "ninguém", target: enemy.pos }), {
    ok: false,
    reason: "unknown_ability",
  });
  for (const target of [hero.pos, { x: 2, y: 0 }]) {
    assert.deepEqual(applyCommand(encounter, { type: "support", unitId: "A", supporterId: "gil", target }), { ok: false, reason: "invalid_target" });
  }
  assert.equal(encounter.supporters[0].ready, true);

  pass(encounter);
  assert.deepEqual(applyCommand(encounter, { type: "support", unitId: "E", supporterId: "gil", target: hero.pos }), {
    ok: false,
    reason: "invalid_target",
  });
});

test("de quem vai perder a vez, o que se anota é isso", () => {
  const { encounter } = withScribe(["A....E"], duel, "enemy");
  const enemy = findUnit(encounter, "E")!;
  const events = run(encounter, { type: "support", unitId: "A", supporterId: "gil", target: enemy.pos });
  assert.deepEqual(eventsOf(events, "intentRevealed"), [{ type: "intentRevealed", unit: "E", tile: enemy.pos, abilities: [], skips: true }]);
});
