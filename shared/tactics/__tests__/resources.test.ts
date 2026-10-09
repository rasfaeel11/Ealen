import assert from "node:assert/strict";
import { test } from "node:test";
import { breathOf, maxBreath, restoreBreath } from "../../breath";
import {
  applyCommand,
  cooldownLeft,
  findUnit,
  gridFromAscii,
  planTurn,
  readiness,
  startEncounter,
  syncCharacterFromUnit,
  unitFromCharacter,
  type Command,
  type Encounter,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run, setup } from "./helpers";

/**
 * O que uma habilidade custa além da ação do turno: o Fôlego, que não volta
 * sozinho (ver ../../breath.ts), e a recarga, contada em turnos de quem a usou.
 */

const HEAVY = "guardiao.heavy_attack";
const GUARD = "guardiao.defend";

function unit(encounter: Encounter, id: string) {
  return findUnit(encounter, id)!;
}

function ability(encounter: Encounter, id: string, abilityId: string) {
  return unit(encounter, id).abilities.find((candidate) => candidate.id === abilityId)!;
}

/** A com a primeira vez, colado em E, que aguenta apanhar a luta inteira. */
function duel(seed = 1) {
  return setup(
    ["AE"],
    (at) => [
      makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
      makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900 }),
    ],
    seed,
  );
}

/** A passa a vez, E passa a vez: a vez volta pra A. */
function nextRound(encounter: Encounter): void {
  run(encounter, { type: "endTurn", unitId: "A" });
  run(encounter, { type: "endTurn", unitId: "E" });
}

function heavy(encounter: Encounter): Command {
  return { type: "ability", unitId: "A", abilityId: HEAVY, target: unit(encounter, "E").pos };
}

test("o Fôlego de quem está descansado cresce com o nível e com Nath, e ficha que nunca gastou está cheia", () => {
  const fresh = makeCharacter("x", { level: 1, attributes: { nath: 5 } });
  assert.equal(maxBreath(fresh), 6);
  assert.equal(maxBreath(makeCharacter("x", { level: 4, attributes: { nath: 8 } })), 11);
  assert.equal(breathOf(fresh), 6);
  assert.equal(breathOf({ ...fresh, breath: 2 }), 2);
  // O que não é um número que caiba volta pro lugar.
  assert.equal(breathOf({ ...fresh, breath: 99 }), 6);
  assert.equal(breathOf({ ...fresh, breath: -3 }), 0);

  const spent = { ...fresh, breath: 0 };
  restoreBreath(spent);
  assert.equal(spent.breath, 6);
});

test("o golpe pesado cobra Fôlego antes de sair, e o golpe comum não cansa", () => {
  const { encounter } = duel();
  assert.equal(unit(encounter, "A").breath, 6);

  const events = run(encounter, heavy(encounter));
  assert.deepEqual(eventsOf(events, "breathSpent"), [{ type: "breathSpent", unit: "A", amount: 2, remaining: 4 }]);
  const types = events.map((event) => event.type);
  assert.ok(types.indexOf("breathSpent") < types.indexOf("abilityUsed"));
  assert.equal(unit(encounter, "A").breath, 4);

  nextRound(encounter);
  const plain = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: unit(encounter, "E").pos });
  assert.deepEqual(eventsOf(plain, "breathSpent"), []);
  assert.equal(unit(encounter, "A").breath, 4);
});

test("sem Fôlego a habilidade é recusada, e a recusa não muda nada", () => {
  const { encounter } = duel();
  unit(encounter, "A").breath = 1;
  assert.equal(readiness(unit(encounter, "A"), ability(encounter, "A", HEAVY)), "breath");

  const before = structuredClone(encounter);
  assert.deepEqual(applyCommand(encounter, heavy(encounter)), { ok: false, reason: "no_breath" });
  assert.deepEqual(encounter, before);
});

test("a recarga conta turnos de quem usou: com 1, o golpe pesado não sai em dois turnos seguidos", () => {
  const { encounter } = duel();
  const me = () => unit(encounter, "A");
  const skill = ability(encounter, "A", HEAVY);
  assert.equal(skill.cooldown, 1);

  run(encounter, heavy(encounter));
  assert.equal(cooldownLeft(me(), skill), 1);

  nextRound(encounter);
  assert.equal(readiness(me(), skill), "recharging");
  assert.equal(cooldownLeft(me(), skill), 1);
  const before = structuredClone(encounter);
  assert.deepEqual(applyCommand(encounter, heavy(encounter)), { ok: false, reason: "recharging" });
  assert.deepEqual(encounter, before);

  nextRound(encounter);
  assert.equal(readiness(me(), skill), "ready");
  assert.equal(cooldownLeft(me(), skill), 0);
  assert.equal(me().cooldowns, undefined);
  run(encounter, heavy(encounter));
});

test("turno perdido também conta na recarga", () => {
  const { encounter } = duel();
  run(encounter, heavy(encounter));
  // Perde o turno seguinte (como quem adiantou a maré): a recarga anda do mesmo jeito.
  unit(encounter, "A").statuses.push({ id: "winded", name: "Sem fôlego", skipsTurn: true, turnsLeft: 1 });

  run(encounter, { type: "endTurn", unitId: "A" });
  const skipped = run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(eventsOf(skipped, "turnSkipped").length, 1);
  run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(readiness(unit(encounter, "A"), ability(encounter, "A", HEAVY)), "ready");
});

test("quem se põe em guarda toma fôlego, até o que tem descansado", () => {
  const { encounter } = duel();
  const guard: Command = { type: "ability", unitId: "A", abilityId: GUARD, target: unit(encounter, "A").pos };

  // Cheio, não há o que recuperar.
  assert.deepEqual(eventsOf(run(encounter, guard), "breathRecovered"), []);
  nextRound(encounter);

  unit(encounter, "A").breath = 0;
  assert.deepEqual(eventsOf(run(encounter, guard), "breathRecovered"), [
    { type: "breathRecovered", unit: "A", amount: 1, remaining: 1 },
  ]);
  assert.equal(unit(encounter, "A").breath, 1);
});

test("o golpe de abertura paga o Fôlego, e a recarga dele já conta o primeiro turno", () => {
  const { grid, markers } = gridFromAscii(["AE"]);
  const start = (breath?: number) =>
    startEncounter({
      grid,
      units: [
        unitFromCharacter(makeCharacter("A", { breath }), { team: "party", pos: markers.A[0] }),
        makeUnit("E", "enemy", markers.E[0], { attributes: { il: FIRST }, currentHp: 900, maxHp: 900 }),
      ],
      surprised: "enemy",
      opening: { unitId: "A", abilityId: HEAVY, target: markers.E[0] },
      seed: 1,
    });

  const { encounter, events } = start();
  assert.equal(eventsOf(events, "breathSpent")[0].remaining, 4);
  assert.equal(readiness(unit(encounter, "A"), ability(encounter, "A", HEAVY)), "recharging");
  nextRound(encounter);
  assert.equal(readiness(unit(encounter, "A"), ability(encounter, "A", HEAVY)), "ready");

  // Sem Fôlego pra ele, o golpe de abertura não acontece: a luta começa sem ele.
  const dry = start(1);
  assert.deepEqual(eventsOf(dry.events, "abilityUsed"), []);
  assert.equal(unit(dry.encounter, "A").breath, 1);
});

test("a reação paga como qualquer uso: sem Fôlego pro golpe, quem sai de perto não apanha", () => {
  const leave = (breath: number) => {
    const { encounter } = setup(["AE.."], (at) => [
      makeUnit("E", "enemy", at("E"), { attributes: { il: FIRST } }),
      makeUnit("A", "party", at("A")),
    ]);
    const guard = unit(encounter, "A");
    guard.abilities = guard.abilities.map((candidate) => (candidate.opportunity ? { ...candidate, breath: 2 } : candidate));
    guard.breath = breath;
    const events = run(encounter, { type: "move", unitId: "E", to: { x: 3, y: 0 } });
    return { events, guard };
  };

  const paid = leave(2);
  assert.equal(eventsOf(paid.events, "abilityUsed").length, 1);
  assert.equal(paid.guard.breath, 0);

  const dry = leave(1);
  assert.deepEqual(eventsOf(dry.events, "abilityUsed"), []);
  assert.equal(dry.guard.turn.reaction, true, "a reação nem foi gasta");
});

test("a IA não propõe o que não pode pagar, nem o que está em recarga", () => {
  const { encounter } = duel();
  // De guarda o golpe comum não passa: é o pesado que a IA quer aqui.
  unit(encounter, "E").statuses.push({ id: "exposed", name: "Sem guarda", attributeBonus: { or: -3 }, turnsLeft: 9 });
  assert.equal(planTurn(encounter).action?.ability.id, HEAVY);

  unit(encounter, "A").breath = 1;
  assert.notEqual(planTurn(encounter).action?.ability.id, HEAVY);

  unit(encounter, "A").breath = 6;
  unit(encounter, "A").cooldowns = { [HEAVY]: 1 };
  assert.notEqual(planTurn(encounter).action?.ability.id, HEAVY);
});

test("a ficha entra na luta com o Fôlego que tem e sai com o que sobrou", () => {
  const character = makeCharacter("A", { breath: 3, attributes: { il: FIRST } });
  const { encounter } = setup(["AE"], (at) => [
    unitFromCharacter(character, { team: "party", pos: at("A") }),
    makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900 }),
  ]);
  assert.equal(unit(encounter, "A").breath, 3);
  assert.equal(unit(encounter, "A").maxBreath, 6);

  run(encounter, heavy(encounter));
  assert.equal(character.breath, 3, "a luta não mexe na ficha");
  syncCharacterFromUnit(character, unit(encounter, "A"));
  assert.equal(character.breath, 1);
});
