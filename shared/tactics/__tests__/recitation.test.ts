import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  applyCommand,
  engravedAbilities,
  engravedId,
  findUnit,
  gridFromAscii,
  startEncounter,
  syncCharacterFromUnit,
  unitFromCharacter,
  type Ability,
  type Encounter,
  type EncounterSetup,
  type Pos,
  type Unit,
} from "../index";
import { fieldUse } from "../../world/field";
import type { Magic } from "../../mana";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * Os modos de conjurar (`magia` §2.5): a magia RECITADA é declarada num turno
 * e sai no começo do seguinte, e apanhar no meio pode quebrá-la; a GRAVADA no
 * descanso sai na hora, uma vez, e é a que abre luta.
 */

const PAGE: Magic = { concept: "atracao_repulsao", level: 3 };

/** Um empurrão de 2 de mana, recitado: o texto lido na hora. */
const SHOVE: Ability = {
  id: "test.shove",
  name: "Empurrão",
  flavor: "",
  cost: "action",
  range: 4,
  targets: "enemy",
  effects: [{ kind: "push", distance: 1 }],
  mana: 2,
};
/** Um bônus recitado, pra ver que não se recita duas de uma vez. */
const NUDGE: Ability = { ...SHOVE, id: "test.nudge", name: "Cutucão", cost: "bonus" };

function stage(rows: string[], place: (at: (marker: string) => Pos) => Unit[], extra: Partial<EncounterSetup> = {}) {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed: 9, ...extra });
}

function mage(pos: Pos, ul = 5): Unit {
  const unit = unitFromCharacter(makeCharacter("M", { attributes: { olho: FIRST, saber: ul } }), { team: "party", pos, magic: PAGE });
  unit.abilities.push({ ...SHOVE }, { ...NUDGE });
  return unit;
}

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
const TOUGH = { currentHp: 9000, maxHp: 9000 };

test("a recitada é só declarada: gasta a ação, nada acontece ainda, e ela sai no começo do próximo turno dele", () => {
  const { encounter } = stage(["M..E...."], (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const caster = findUnit(encounter, "M")!;
  const enemy = findUnit(encounter, "E")!;

  const declared = run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: enemy.pos });
  assert.deepEqual(declared.map((event) => event.type), ["recitationStarted"]);
  assert.deepEqual(caster.reciting, { abilityId: SHOVE.id, target: { x: 3, y: 0 }, unit: "E" });
  assert.equal(caster.turn.action, false);
  assert.equal(caster.mana, 8);

  // O inimigo anda dois pra direita: a magia segue quem foi mirado.
  pass(encounter);
  run(encounter, { type: "move", unitId: "E", to: { x: 4, y: 0 } });
  const released = pass(encounter);
  const types = released.map((event) => event.type);
  assert.deepEqual(types.slice(types.indexOf("turnStarted")), ["turnStarted", "manaSpent", "abilityUsed", "pushed"]);
  assert.deepEqual(eventsOf(released, "abilityUsed")[0].target, { x: 4, y: 0 });
  assert.deepEqual(enemy.pos, { x: 5, y: 0 });
  assert.equal(caster.reciting, undefined);
  assert.equal(caster.mana, 6);
  // E o turno é todo dele: a magia saiu antes, de graça.
  assert.equal(activeUnit(encounter)!.id, "M");
  assert.equal(caster.turn.action, true);
});

test("uma recitação de cada vez; a gravada não tem tempo de recitar e sai junto", () => {
  const { encounter } = stage(["M..E.."], (at) => {
    const caster = mage(at("M"));
    caster.abilities.push({ ...NUDGE, id: "test.nudge#gravada1", engraved: true, limit: 1 });
    return [caster, makeUnit("E", "enemy", at("E"), TOUGH)];
  });
  const enemy = findUnit(encounter, "E")!;
  run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: enemy.pos });
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "M", abilityId: NUDGE.id, target: enemy.pos }), {
    ok: false,
    reason: "reciting",
  });
  const engraved = run(encounter, { type: "ability", unitId: "M", abilityId: "test.nudge#gravada1", target: enemy.pos });
  assert.equal(eventsOf(engraved, "pushed").length, 1);
});

test("alvo que sumiu: a recitação se perde, e a mana fica", () => {
  const { encounter } = stage(["M..E"], (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const caster = findUnit(encounter, "M")!;
  const enemy = findUnit(encounter, "E")!;
  run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: enemy.pos });
  enemy.currentHp = 0;
  pass(encounter);
  // Com o único inimigo no chão a luta já acabou; numa luta que seguisse, a perda viria no turno dele.
  assert.ok(encounter.winner);

  const { encounter: other } = stage(["M..E.F"], (at) => [
    mage(at("M")),
    makeUnit("E", "enemy", at("E"), TOUGH),
    makeUnit("F", "enemy", at("F"), TOUGH),
  ]);
  const aimed = findUnit(other, "E")!;
  run(other, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: aimed.pos });
  aimed.currentHp = 0;
  const lost = [...pass(other), ...pass(other), ...pass(other)];
  assert.deepEqual(eventsOf(lost, "recitationBroken"), [
    { type: "recitationBroken", unit: "M", abilityId: SHOVE.id, name: "Empurrão", reason: "lost" },
  ]);
  assert.deepEqual(eventsOf(lost, "manaSpent"), []);
  assert.equal(findUnit(other, "M")!.mana, 8);
});

test("apanhar recitando pode quebrar o texto: d20 + Saber contra 10 mais metade do golpe", () => {
  const { encounter } = stage(["ME"], (at) => [
    mage(at("M"), 0),
    makeUnit("E", "enemy", at("E"), { ...TOUGH, attributes: { couro: 80 } }),
  ]);
  const caster = findUnit(encounter, "M")!;
  caster.currentHp = caster.maxHp = 9000;
  run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: findUnit(encounter, "E")!.pos });
  pass(encounter);

  // Um golpe de mais de 60: nem um 20 natural segura o texto.
  const hit = run(encounter, { type: "ability", unitId: "E", abilityId: "guardiao.attack", target: caster.pos });
  const [damage] = eventsOf(hit, "damage");
  assert.ok(damage.amount > 60, `o golpe deu ${damage.amount}`);
  assert.deepEqual(eventsOf(hit, "recitationBroken"), [
    { type: "recitationBroken", unit: "M", abilityId: SHOVE.id, name: "Empurrão", reason: "hit" },
  ]);
  assert.ok(hit.indexOf(damage) < hit.findIndex((event) => event.type === "recitationBroken"));
  assert.equal(caster.reciting, undefined);
  const next = pass(encounter);
  assert.deepEqual(eventsOf(next, "abilityUsed"), []);
});

test("quem perde a vez perde a recitação junto", () => {
  const { encounter } = stage(["M..E"], (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), TOUGH)]);
  const caster = findUnit(encounter, "M")!;
  run(encounter, { type: "ability", unitId: "M", abilityId: SHOVE.id, target: findUnit(encounter, "E")!.pos });
  caster.statuses.push({ id: "winded", name: "Sem fôlego", skipsTurn: true, turnsLeft: 1 });
  const round = [...pass(encounter), ...pass(encounter)];
  assert.deepEqual(eventsOf(round, "recitationBroken").map((event) => event.reason), ["skipped"]);
  assert.deepEqual(eventsOf(round, "turnSkipped").map((event) => event.unit), ["M"]);
});

test("magia recitada não abre luta; a gravada abre — é o círculo preparado antes", () => {
  const recited = stage(
    ["M..E"],
    (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), TOUGH)],
    { surprised: "enemy", opening: { unitId: "M", abilityId: SHOVE.id, target: { x: 3, y: 0 } } },
  );
  assert.deepEqual(eventsOf(recited.events, "abilityUsed"), []);
  assert.equal(findUnit(recited.encounter, "M")!.reciting, undefined);

  const circle = { ...SHOVE, id: engravedId(SHOVE.id, 0), engraved: true, limit: 1 };
  const engraved = stage(
    ["M..E"],
    (at) => {
      const caster = mage(at("M"));
      caster.abilities.push(circle);
      return [caster, makeUnit("E", "enemy", at("E"), TOUGH)];
    },
    { surprised: "enemy", opening: { unitId: "M", abilityId: circle.id, target: { x: 3, y: 0 } } },
  );
  assert.deepEqual(eventsOf(engraved.events, "abilityUsed").map((event) => event.abilityId), [circle.id]);

  // Fora de luta, é a mesma pergunta: a recitada que se mira em alguém não abre nada.
  assert.equal(fieldUse(SHOVE), undefined);
  assert.equal(fieldUse(circle), "opening");
  const heal: Ability = { ...SHOVE, targets: "ally", effects: [{ kind: "heal", dice: { count: 1, sides: 6 } }] };
  assert.equal(fieldUse(heal), "mend");
  assert.equal(fieldUse({ ...heal, engraved: true }), undefined);
});

test("as gravações da ficha entram na luta como magias de um uso só, e a usada sai da ficha", () => {
  assert.deepEqual(engravedAbilities([SHOVE], ["test.shove", "nada", "test.shove"]).map((ability) => [ability.id, ability.name, ability.engraved, ability.limit]), [
    ["test.shove#gravada1", "Empurrão (gravada)", true, 1],
    ["test.shove#gravada3", "Empurrão (gravada)", true, 1],
  ]);
  // Golpe sem mana não se grava.
  const strike: Ability = { ...SHOVE, id: "test.strike", mana: undefined };
  assert.deepEqual(engravedAbilities([strike], ["test.strike"]), []);

  const character = makeCharacter("M", { engraved: ["test.shove", "test.shove"] });
  const unit = unitFromCharacter(character, { team: "party", pos: { x: 0, y: 0 }, magic: PAGE });
  unit.used = { [engravedId("test.shove", 1)]: 1 };
  syncCharacterFromUnit(character, unit);
  assert.deepEqual(character.engraved, ["test.shove"]);
  unit.used = { [engravedId("test.shove", 0)]: 1 };
  syncCharacterFromUnit(character, unit);
  assert.equal(character.engraved, undefined);
});
