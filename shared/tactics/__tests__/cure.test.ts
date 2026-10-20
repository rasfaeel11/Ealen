import assert from "node:assert/strict";
import { test } from "node:test";
import { HEAL_PER_BREATH, HUNGER, healCap, healToll } from "../../breath";
import { mend } from "../../world/field";
import { lingeringMarks } from "../../world/encounters";
import { findUnit, gridFromAscii, startEncounter, type Ability, type Encounter, type Unit } from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * A cura cobra do paciente (`magia` §4.3): ela acelera o que o corpo faria
 * sozinho, e quem paga é o corpo de quem a recebe — Fôlego, e a fome, que
 * fica até o descanso e dobra o preço da próxima.
 */

function stage(patient: Partial<Unit>): Encounter {
  const { grid, markers } = gridFromAscii(["CP...E"]);
  const caster = makeUnit("C", "party", markers.C[0], { characterClass: "luminar", attributes: { olho: FIRST, fator: 6 } });
  const hurt = Object.assign(makeUnit("P", "party", markers.P[0], { currentHp: 5, maxHp: 60 }), patient);
  return startEncounter({ grid, units: [caster, hurt, makeUnit("E", "enemy", markers.E[0])], seed: 3 }).encounter;
}

test("a conta: cada 3 de vida custam 1 de Fôlego a quem recebe, e com fome o dobro", () => {
  assert.equal(HEAL_PER_BREATH, 3);
  assert.equal(healCap(4), 12);
  assert.equal(healCap(4, true), 6);
  assert.equal(healCap(0), 0);
  assert.equal(healToll(7), 3);
  assert.equal(healToll(7, true), 5);
  assert.equal(healToll(0), 0);
});

test("na luta, quem recebe a cura paga em Fôlego e fica com fome; e ela sai da luta com ele", () => {
  const encounter = stage({});
  const patient = findUnit(encounter, "P")!;
  const before = patient.breath;
  const events = run(encounter, { type: "ability", unitId: "C", abilityId: "luminar.heal", target: patient.pos });

  const [heal] = eventsOf(events, "heal");
  assert.ok(heal.amount > 0);
  const toll = healToll(heal.amount);
  assert.deepEqual(eventsOf(events, "breathDrained"), [{ type: "breathDrained", unit: "P", amount: toll, remaining: before - toll }]);
  // O preço vem antes da vida, e a fome depois.
  assert.ok(events.findIndex((event) => event.type === "breathDrained") < events.indexOf(heal));
  assert.deepEqual(
    eventsOf(events, "statusApplied").map((event) => [event.target, event.statusId, event.turns]),
    [["P", HUNGER, Infinity]],
  );
  assert.deepEqual(lingeringMarks(encounter, [{ id: "C" }, { id: "P" }]), { P: [HUNGER] });
  // Quem fez a cura paga o dele, à parte: o Fôlego da habilidade.
  assert.deepEqual(eventsOf(events, "breathSpent").map((event) => event.unit), ["C"]);
});

test("a cura não vai além do que o corpo pode pagar, e sem Fôlego nada se acelera", () => {
  const poor = stage({ breath: 1 });
  const patient = findUnit(poor, "P")!;
  const [heal] = eventsOf(run(poor, { type: "ability", unitId: "C", abilityId: "luminar.heal", target: patient.pos }), "heal");
  // 1d6 + Fator 6 dá pelo menos 7; quem tem 1 de Fôlego só paga 3.
  assert.equal(heal.amount, healCap(1));
  assert.equal(patient.breath, 0);

  const empty = stage({ breath: 0 });
  const starving = findUnit(empty, "P")!;
  const events = run(empty, { type: "ability", unitId: "C", abilityId: "luminar.heal", target: starving.pos });
  assert.deepEqual(eventsOf(events, "healDenied"), [{ type: "healDenied", target: "P", name: "Sem fôlego" }]);
  assert.deepEqual(eventsOf(events, "heal"), []);
  assert.equal(starving.currentHp, 5);
});

test("com fome, a próxima cura custa o dobro", () => {
  const encounter = stage({});
  const patient = findUnit(encounter, "P")!;
  patient.statuses.push({ id: HUNGER, name: "Fome", hunger: true, untilRest: true, turnsLeft: Infinity });
  const before = patient.breath;
  const events = run(encounter, { type: "ability", unitId: "C", abilityId: "luminar.heal", target: patient.pos });
  const [heal] = eventsOf(events, "heal");
  assert.equal(patient.breath, before - healToll(heal.amount, true));
  // Já com fome, não há fome nova a anunciar.
  assert.deepEqual(eventsOf(events, "statusApplied"), []);
});

test("fora de luta, a cura cobra o paciente do mesmo jeito", () => {
  const caster = makeCharacter("C", { characterClass: "luminar", attributes: { fator: 6 } });
  const patient = makeCharacter("P", { currentHp: 5, maxHp: 60 });
  const heal: Ability = {
    id: "luminar.heal",
    name: "Cura",
    flavor: "",
    cost: "action",
    range: 4,
    targets: "ally",
    effects: [{ kind: "heal", dice: { count: 1, sides: 6 }, attribute: "fator" }],
    breath: 2,
  };

  const healed = mend(caster, heal, patient, { rngState: 4 })!;
  assert.ok(healed > 0);
  assert.equal(patient.breath, 6 - healToll(healed));
  assert.equal(caster.breath, 6 - 2);

  // Com fome, o dobro; sem Fôlego, nada — e nada se gasta.
  const hungry = makeCharacter("Q", { currentHp: 5, maxHp: 60 });
  const doubled = mend(caster, heal, hungry, { rngState: 4 }, true)!;
  assert.equal(hungry.breath, 6 - healToll(doubled, true));
  const empty = makeCharacter("R", { currentHp: 5, maxHp: 60, breath: 0 });
  const spent = caster.breath;
  assert.equal(mend(caster, heal, empty, { rngState: 4 }), undefined);
  assert.equal(caster.breath, spent);
});
