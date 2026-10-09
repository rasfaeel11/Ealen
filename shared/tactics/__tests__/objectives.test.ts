import assert from "node:assert/strict";
import { test } from "node:test";
import {
  abilityTargets,
  activeUnit,
  affectedProps,
  applyCommand,
  chooseCommand,
  effectiveAttribute,
  gridFromAscii,
  interactTargets,
  isAlive,
  isOver,
  standProp,
  startEncounter,
  type Cue,
  type Encounter,
  type Pos,
  type PropId,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run } from "./helpers";

/**
 * O que uma luta com roteiro pede além das deixas de sempre: objeto em que se
 * MEXE em vez de quebrar, inimigo que não tem vida, e a história pondo uma
 * condição em quem luta.
 */

/** Monta uma luta a partir de um desenho; `s` é um sino (ids "sino-0", "sino-1"...) e `c` um caixote. */
function staged(
  rows: string[],
  place: (at: (marker: string) => Pos) => Unit[],
  cues: Cue[] = [],
  seed = 1,
): { encounter: Encounter; events: TacticalEvent[] } {
  const { grid, markers } = gridFromAscii(rows);
  const stand = (marker: string, kind: PropId, name: string) =>
    (markers[marker] ?? []).map((pos, index) => standProp(grid, `${name}-${index}`, kind, pos));
  const props = [...stand("s", "bell", "sino"), ...stand("c", "crate", "caixote")];
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), props, cues, seed });
}

const pair = (at: (marker: string) => Pos) => [
  makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
  makeUnit("E", "enemy", at("E")),
];

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

test("mexer num objeto pede estar colado nele, custa a ação e só vale uma vez", () => {
  const { encounter } = staged(["A..s.....E"], pair);
  const [bell] = encounter.props;
  const hero = activeUnit(encounter)!;

  // De longe, não dá: o motor não oferece e recusa.
  assert.deepEqual(interactTargets(encounter, hero), []);
  assert.deepEqual(applyCommand(encounter, { type: "interact", unitId: "A", target: bell.pos }), { ok: false, reason: "invalid_target" });

  run(encounter, { type: "move", unitId: "A", to: { x: 2, y: 0 } });
  assert.deepEqual(interactTargets(encounter, hero), [bell]);
  const events = run(encounter, { type: "interact", unitId: "A", target: bell.pos });
  assert.deepEqual(events, [{ type: "propUsed", unit: "A", prop: "sino-0", name: "Sino de bronze", verb: "Tocar", pos: bell.pos }]);
  assert.equal(bell.used, true);
  assert.equal(hero.turn.action, false);

  // Usado, não se oferece de novo — nem no turno seguinte, com a ação de volta.
  assert.deepEqual(interactTargets(encounter, hero), []);
  pass(encounter);
  pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.deepEqual(applyCommand(encounter, { type: "interact", unitId: "A", target: bell.pos }), { ok: false, reason: "invalid_target" });
});

test("mexer sem a ação do turno é recusado, e o objeto continua por usar", () => {
  const { encounter } = staged(["As.......E"], pair);
  const [bell] = encounter.props;
  run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.defend", target: { x: 0, y: 0 } });
  assert.deepEqual(applyCommand(encounter, { type: "interact", unitId: "A", target: bell.pos }), { ok: false, reason: "resource_spent" });
  assert.equal(bell.used, undefined);
});

test("só o grupo do jogador mexe em objeto", () => {
  const { encounter } = staged(["A.......sE"], pair);
  pass(encounter);
  const enemy = activeUnit(encounter)!;
  assert.equal(enemy.id, "E");
  assert.deepEqual(interactTargets(encounter, enemy), []);
  assert.deepEqual(applyCommand(encounter, { type: "interact", unitId: "E", target: encounter.props[0].pos }), { ok: false, reason: "invalid_target" });
});

test("o que não se quebra não é alvo de golpe nenhum, nem em área", () => {
  const { encounter } = staged(["Asc.....E"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const hero = activeUnit(encounter)!;
  const [bell, crate] = encounter.props;

  const strike = hero.abilities.find((ability) => ability.id === "cantor_de_ealen.attack")!;
  const targets = abilityTargets(encounter, hero, strike);
  assert.ok(targets.some((pos) => pos.x === crate.pos.x), "o caixote é alvo");
  assert.ok(!targets.some((pos) => pos.x === bell.pos.x), "o sino não é");

  // A área do Cantor cai em cima dos dois: só o caixote sente.
  const blast = hero.abilities.find((ability) => ability.id === "cantor_de_ealen.heavy_attack")!;
  assert.deepEqual(affectedProps(encounter, blast, bell.pos), [crate]);
  run(encounter, { type: "ability", unitId: "A", abilityId: blast.id, target: bell.pos });
  assert.equal(bell.hp, 1);
});

test("a deixa `used` dispara quando mexem no objeto dela, e pode dar a vitória com o inimigo de pé", () => {
  const { encounter } = staged(["As.......E"], pair, [{ id: "sino", when: { kind: "used", props: ["sino-0"] }, ends: "win" }]);
  const events = run(encounter, { type: "interact", unitId: "A", target: encounter.props[0].pos });

  assert.deepEqual(events.slice(-2), [{ type: "cue", id: "sino" }, { type: "battleEnded", winner: "party" }]);
  assert.equal(encounter.winner, "party");
  assert.ok(isAlive(encounter.units.find((unit) => unit.id === "E")!));
});

test("a deixa `used` de vários objetos espera todos", () => {
  const { encounter } = staged(["sAs......E"], pair, [{ id: "os dois", when: { kind: "used", props: ["sino-0", "sino-1"] }, ends: "stop" }]);
  const [left, right] = encounter.props;

  assert.equal(eventsOf(run(encounter, { type: "interact", unitId: "A", target: left.pos }), "cue").length, 0);
  pass(encounter);
  pass(encounter);
  const events = run(encounter, { type: "interact", unitId: "A", target: right.pos });
  assert.deepEqual(events.slice(-2), [{ type: "cue", id: "os dois" }, { type: "battleEnded" }]);
  assert.equal(encounter.stopped, true);
});

test("quem não tem vida não perde nenhuma: o golpe vira `immune`, e condição e empurrão pegam", () => {
  const ghost = (at: (marker: string) => Pos) => {
    const enemy = makeUnit("E", "enemy", at("E"));
    enemy.invulnerable = true;
    // Dain alto: só um 1 natural erra.
    return [makeUnit("A", "party", at("A"), { attributes: { il: FIRST, dain: 60, or: 60 } }), enemy];
  };
  // Procura uma seed em que o golpe pesado (dano + empurrão) pega.
  for (let seed = 1; seed < 30; seed++) {
    const { encounter } = staged(["AE......"], ghost, [], seed);
    const enemy = encounter.units.find((unit) => unit.id === "E")!;
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.heavy_attack", target: enemy.pos });
    const [roll] = eventsOf(events, "attackRoll");
    if (roll.outcome !== "hit" && roll.outcome !== "crit") continue;

    assert.deepEqual(eventsOf(events, "immune"), [{ type: "immune", target: "E" }]);
    assert.equal(eventsOf(events, "damage").length, 0);
    assert.equal(enemy.currentHp, enemy.maxHp);
    assert.equal(eventsOf(events, "pushed").length, 1, "o empurrão do Guardião ainda pega");
    assert.equal(isOver(encounter), false);
    return;
  }
  assert.fail("nenhuma seed acertou o golpe");
});

test("chão que fere não fere quem não tem vida", () => {
  const { encounter } = staged(["A...E..."], (at) => {
    const enemy = makeUnit("E", "enemy", at("E"));
    enemy.invulnerable = true;
    return [makeUnit("A", "party", at("A"), { characterClass: "entropista", attributes: { il: FIRST } }), enemy];
  });
  const enemy = encounter.units.find((unit) => unit.id === "E")!;
  // As Chamas do Entropista ficam no chão dele, acerte ou erre.
  run(encounter, { type: "ability", unitId: "A", abilityId: "entropista.heavy_attack", target: enemy.pos });
  assert.equal(encounter.surfaces.length, 1);
  const events = pass(encounter);
  assert.equal(activeUnit(encounter)!.id, "E");
  assert.equal(eventsOf(events, "surfaceTriggered").length, 0);
  assert.equal(enemy.currentHp, enemy.maxHp);
});

test("a IA não vê valor em bater em quem não tem vida, e não trava por isso", () => {
  const { encounter } = staged(["AE......"], (at) => {
    const hero = makeUnit("A", "party", at("A"));
    hero.invulnerable = true;
    return [hero, makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST } })];
  });
  for (let i = 0; i < 12 && activeUnit(encounter)?.id === "E"; i++) {
    const command = chooseCommand(encounter);
    assert.notEqual(command.type === "ability" && command.abilityId.endsWith("attack"), true, "gastou golpe em quem não se fere");
    run(encounter, command);
  }
  assert.equal(activeUnit(encounter)!.id, "A");
});

test("a deixa que traz uma condição a aplica ao disparar, em quem está de pé, e derruba a guarda", () => {
  const { encounter } = staged(
    ["A....E...F"],
    (at) => [
      makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
      makeUnit("E", "enemy", at("E"), { attributes: { il: 50 } }),
      makeUnit("F", "enemy", at("F"), { currentHp: 0 }),
    ],
    [{ id: "repuxo", when: { kind: "round", round: 2 }, apply: { statusId: "exposed", turns: 2, units: ["E", "F", "ninguém"] } }],
  );
  const enemy = encounter.units.find((unit) => unit.id === "E")!;
  const before = effectiveAttribute(enemy, "or");

  pass(encounter);
  run(encounter, { type: "ability", unitId: "E", abilityId: "guardiao.defend", target: enemy.pos });
  assert.ok(enemy.statuses.some((status) => status.guard));
  const events = pass(encounter);

  // Depois da deixa, antes de a vez de alguém começar: a guarda cai e a condição entra. Quem já caiu fica de fora.
  const cue = events.findIndex((event) => event.type === "cue");
  assert.deepEqual(events.slice(cue, cue + 3), [
    { type: "cue", id: "repuxo" },
    { type: "statusExpired", target: "E", statusId: "guarding", name: "Em guarda" },
    { type: "statusApplied", target: "E", statusId: "exposed", name: "Sem guarda", turns: 2 },
  ]);
  assert.equal(eventsOf(events, "statusApplied").length, 1);
  assert.ok(!enemy.statuses.some((status) => status.guard));
  assert.deepEqual(enemy.statuses.map((status) => status.id), ["exposed"]);
  assert.equal(effectiveAttribute(enemy, "or"), before - 3);
});
