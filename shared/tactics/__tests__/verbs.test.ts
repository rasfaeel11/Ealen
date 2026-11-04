import assert from "node:assert/strict";
import { test } from "node:test";
import { PARRY_BREATH, abilityTargets, activeUnit, applyCommand, findUnit, type Encounter, type TacticalEvent, type Unit } from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/**
 * Os verbos de luta que faltavam (AGENTS.md, task 63): esconder-se no meio da luta, preparar outra ação que não o
 * golpe, e as reações além do ataque de oportunidade — aparar e interceptar.
 */

const HIDE = "espadachim.esconder";

/** Quem é de escola de espada (a Gryskar, no grau 2): é quem apara. */
function schooled(unit: Unit): Unit {
  unit.style = "gryskar";
  unit.grade = 2;
  return unit;
}

/** Joga `unitId` até a vez de `who` chegar, passando a dos outros. */
function passTo(encounter: Encounter, who: string): void {
  for (let guard = 0; guard < 20 && activeUnit(encounter)!.id !== who; guard++) {
    run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
  }
  assert.equal(activeUnit(encounter)!.id, who);
}

// --- Esconder-se --------------------------------------------------------------------------------------------------

test("à vista de um inimigo não se esconde; atrás da parede, sim", () => {
  const open = setup(["A....E"], (at) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"))]);
  const hero = findUnit(open.encounter, "A")!;
  assert.deepEqual(abilityTargets(open.encounter, hero, hero.abilities.find((ability) => ability.id === HIDE)!), []);

  const behind = setup(["A#...E"], (at) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"))]);
  const sneak = findUnit(behind.encounter, "A")!;
  const events = run(behind.encounter, { type: "ability", unitId: "A", abilityId: HIDE, target: sneak.pos });
  assert.equal(eventsOf(events, "statusApplied")[0]?.statusId, "hidden");
});

test("Escondido, de longe ninguém o mira; colado, sim", () => {
  const { encounter } = setup(["A#.....", ".#....E", "......."], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { kit: [] }),
  ]);
  const hero = findUnit(encounter, "A")!;
  run(encounter, { type: "ability", unitId: "A", abilityId: HIDE, target: hero.pos });
  run(encounter, { type: "endTurn", unitId: "A" });
  // O inimigo dá a volta e fica à vista, mas longe: não tem como mirar.
  const foe = findUnit(encounter, "E")!;
  foe.pos = { x: 4, y: 2 };
  foe.turn.movement = 0;
  const shot = foe.abilities.find((ability) => ability.id === "espadachim.attack")!;
  assert.deepEqual(abilityTargets(encounter, foe, { ...shot, range: 6 }), []);
  // Colado, acha.
  foe.pos = { x: 0, y: 1 };
  assert.ok(abilityTargets(encounter, foe, shot).some((pos) => pos.x === 0 && pos.y === 0));
});

test("o golpe que sai do esconderijo entra mais certo, e descobre quem bateu", () => {
  const { encounter } = setup(["A#", "E."], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
  ]);
  // O E está colado e vê A: quem se esconde é o A com a parede entre ele e um inimigo que ainda não chegou.
  const hero = findUnit(encounter, "A")!;
  hero.statuses.push({ id: "hidden", name: "Escondido", concealed: true, toHit: 2, turnsLeft: 2 });
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: findUnit(encounter, "E")!.pos });
  assert.ok(eventsOf(events, "revealed").some((event) => event.unit === "A"));
  assert.ok(!hero.statuses.some((status) => status.concealed));
});

test("quem termina de andar à vista de um inimigo perto é descoberto", () => {
  const { encounter } = setup(["A#....", "......", "....E."], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const hero = findUnit(encounter, "A")!;
  hero.statuses.push({ id: "hidden", name: "Escondido", concealed: true, toHit: 2, turnsLeft: 2 });
  const events = run(encounter, { type: "move", unitId: "A", to: { x: 2, y: 1 } });
  assert.ok(eventsOf(events, "revealed").some((event) => event.unit === "A"));
});

// --- Preparar -----------------------------------------------------------------------------------------------------

test("o que se prepara sai em quem entra no alcance, na reação, no lugar do golpe da arma", () => {
  const { encounter } = setup(["A....E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
  ]);
  const ready = run(encounter, { type: "ready", unitId: "A", abilityId: "espadachim.heavy_attack" });
  assert.equal(eventsOf(ready, "readied")[0]?.abilityId, "espadachim.heavy_attack");
  assert.equal(findUnit(encounter, "A")!.turn.action, false);
  run(encounter, { type: "endTurn", unitId: "A" });

  const events = run(encounter, { type: "move", unitId: "E", to: { x: 1, y: 0 } });
  const blow = eventsOf(events, "abilityUsed").find((event) => event.unit === "A");
  assert.equal(blow?.abilityId, "espadachim.heavy_attack");
  assert.equal(blow?.reaction, true);
  // O preço sai quando sai o golpe: o Fôlego do golpe pesado.
  assert.ok(eventsOf(events, "breathSpent").some((event) => event.unit === "A"));
  assert.equal(findUnit(encounter, "A")!.readied, undefined);
});

test("não se prepara o que se recita, nem o que não mira inimigo", () => {
  const { encounter } = setup(["A....E"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "atracao_repulsao", attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const refuse = (abilityId: string) => {
    const result = applyCommand(encounter, { type: "ready", unitId: "A", abilityId });
    assert.equal(result.ok, false, abilityId);
  };
  refuse("atracao_repulsao.heavy_attack");
  refuse("atracao_repulsao.defend");
  assert.equal(applyCommand(encounter, { type: "ready", unitId: "A", abilityId: "atracao_repulsao.attack" }).ok, true);
});

// --- Aparar ---------------------------------------------------------------------------------------------------------

/** E bate em A, colado, até acertar; A é de escola. */
function struck(parryBreath = 10): { events: TacticalEvent[]; hero: Unit } {
  for (let seed = 1; seed <= 40; seed++) {
    const { encounter } = setup(
      ["EA"],
      (at) => [
        makeUnit("E", "enemy", at("E"), { attributes: { olho: FIRST, forca: 12 } }),
        schooled(makeUnit("A", "party", at("A"), { currentHp: 200, maxHp: 200 })),
      ],
      seed,
    );
    const hero = findUnit(encounter, "A")!;
    hero.breath = parryBreath;
    passTo(encounter, "E");
    const events = run(encounter, { type: "ability", unitId: "E", abilityId: "espadachim.heavy_attack", target: hero.pos });
    const roll = eventsOf(events, "attackRoll")[0]?.outcome;
    if (roll === "hit" || roll === "crit") return { events, hero };
  }
  throw new Error("nenhuma semente acertou");
}

test("quem é de escola apara o golpe de perto que pegou: tira dano, gasta a reação e Fôlego", () => {
  const { events, hero } = struck();
  const [parried] = eventsOf(events, "parried");
  assert.ok(parried && parried.amount > 0);
  assert.equal(hero.turn.reaction, false);
  assert.ok(eventsOf(events, "breathSpent").some((event) => event.unit === "A" && event.amount === PARRY_BREATH));
});

test("sem Fôlego não se apara", () => {
  const { events } = struck(0);
  assert.equal(eventsOf(events, "parried").length, 0);
});

// --- Interceptar ----------------------------------------------------------------------------------------------------

test("quem está em guarda, colado no aliado, entra na frente do golpe e leva no lugar dele", () => {
  const { encounter } = setup(["E.", "AB"], (at) => [
    makeUnit("E", "enemy", at("E"), { attributes: { olho: FIRST } }),
    makeUnit("A", "party", at("A")),
    makeUnit("B", "party", at("B")),
  ]);
  const guard = findUnit(encounter, "B")!;
  guard.statuses.push({ id: "guarding", name: "Em guarda", guard: true, turnsLeft: 1 });
  const events = run(encounter, { type: "ability", unitId: "E", abilityId: "espadachim.attack", target: findUnit(encounter, "A")!.pos });
  const [intercepted] = eventsOf(events, "intercepted");
  assert.deepEqual([intercepted?.unit, intercepted?.ally], ["B", "A"]);
  assert.ok(eventsOf(events, "attackRoll").every((event) => event.target === "B"));
  assert.equal(guard.turn.reaction, false);
});

test("longe de quem bate, ninguém intercepta", () => {
  const { encounter } = setup(["E..", "A.B"], (at) => [
    makeUnit("E", "enemy", at("E"), { attributes: { olho: FIRST } }),
    makeUnit("A", "party", at("A")),
    makeUnit("B", "party", at("B")),
  ]);
  findUnit(encounter, "B")!.statuses.push({ id: "guarding", name: "Em guarda", guard: true, turnsLeft: 1 });
  const events = run(encounter, { type: "ability", unitId: "E", abilityId: "espadachim.attack", target: findUnit(encounter, "A")!.pos });
  assert.equal(eventsOf(events, "intercepted").length, 0);
});
