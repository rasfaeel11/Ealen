import assert from "node:assert/strict";
import { test } from "node:test";
import { addItemToInventory } from "../../inventoryEffects";
import { BESTIARY, spawnCreature } from "../../mock/bestiary";
import { findItemTemplate } from "../../mock/items";
import type { CharacterClass } from "../../types/characterClass";
import {
  activeUnit,
  affectedUnits,
  applyCommand,
  basicCommand,
  chooseCommand,
  distance,
  findUnit,
  planTurn,
  unitFromCharacter,
  type AiProfile,
  type Command,
  type Encounter,
  type TacticalEvent,
  type TeamId,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run, setup } from "./helpers";

type Brain = (encounter: Encounter) => Command;

/** Joga a luta até acabar (ou até `maxCommands`), cada lado com a própria IA. Todo comando TEM que ser aceito. */
function play(encounter: Encounter, brains: Record<TeamId, Brain>, maxCommands = 3000): TacticalEvent[] {
  const log: TacticalEvent[] = [];
  for (let i = 0; i < maxCommands && !encounter.winner; i++) {
    log.push(...run(encounter, brains[activeUnit(encounter)!.team](encounter)));
  }
  return log;
}

const SMART: Record<TeamId, Brain> = { party: chooseCommand, enemy: chooseCommand };

/** Joga o turno de quem está na vez até ele passar a vez. */
function playTurn(encounter: Encounter): TacticalEvent[] {
  const unitId = activeUnit(encounter)!.id;
  const log: TacticalEvent[] = [];
  while (!encounter.winner && activeUnit(encounter)!.id === unitId) {
    const command = chooseCommand(encounter);
    log.push(...run(encounter, command));
    if (command.type === "endTurn") break;
  }
  return log;
}

function withProfile(encounter: Encounter, id: string, ai: Partial<AiProfile>): void {
  findUnit(encounter, id)!.ai = ai;
}

// --- Escolher o golpe -------------------------------------------------------

test("com o inimigo ao alcance, bate em vez de andar", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]);

  const command = chooseCommand(encounter);
  assert.equal(command.type, "ability");
  assert.deepEqual(command.type === "ability" && command.target, findUnit(encounter, "E")!.pos);
});

test("entre dois alvos ao alcance, escolhe o que dá pra derrubar", () => {
  const { encounter } = setup(["XAY"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("X", "party", at("X")),
    makeUnit("Y", "party", at("Y"), { currentHp: 3 }),
  ]);

  const plan = planTurn(encounter);
  assert.deepEqual(plan.action?.target, findUnit(encounter, "Y")!.pos);
});

test("cura o aliado por um fio em vez de bater — a não ser que não ligue pra aliado", () => {
  const { encounter } = setup(["B.AE"], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "luminar", attributes: { il: FIRST } }),
    makeUnit("B", "enemy", at("B"), { currentHp: 4 }),
    makeUnit("E", "party", at("E")),
  ]);

  const caring = planTurn(encounter);
  assert.equal(caring.action?.ability.id, "luminar.heal");
  assert.deepEqual(caring.action?.target, findUnit(encounter, "B")!.pos);

  withProfile(encounter, "A", { support: 0 });
  const callous = planTurn(encounter);
  assert.notEqual(callous.action?.ability.id, "luminar.heal");
  assert.deepEqual(callous.action?.target, findUnit(encounter, "E")!.pos);
});

test("uma área pega dois inimigos juntos, mas não é jogada em cima de um aliado", () => {
  const grouped = setup(["A...X", "....Y"], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("X", "party", at("X")),
    makeUnit("Y", "party", at("Y")),
  ]).encounter;

  const blast = planTurn(grouped).action!;
  assert.equal(blast.ability.id, "cantor_de_ealen.heavy_attack");
  assert.equal(affectedUnits(grouped, blast.ability, blast.target).length, 2);

  // O mesmo desenho com um aliado no lugar de um dos alvos.
  const mixed = setup(["A...X", "....B"], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("X", "party", at("X")),
    makeUnit("B", "enemy", at("B")),
  ]).encounter;

  const careful = planTurn(mixed).action!;
  assert.deepEqual(
    affectedUnits(mixed, careful.ability, careful.target).map((unit) => unit.id),
    ["X"],
  );
});

// --- Usar a mochila ---------------------------------------------------------

/** Uma luta corpo a corpo de A (da IA, com `itemId` na mochila) contra E. */
function withItem(itemId: string, rows: string[], hp = 30) {
  const carrier = makeCharacter("A", { currentHp: hp, attributes: { il: FIRST } });
  addItemToInventory(carrier, findItemTemplate(itemId)!);
  return setup(rows, (at) => [
    unitFromCharacter(carrier, { team: "enemy", pos: at("A") }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
}

test("ferido, bebe a poção antes de bater; inteiro, guarda", () => {
  const hurt = withItem("item-lagrima-de-eir", ["AE"], 10);
  assert.deepEqual(chooseCommand(hurt), { type: "useItem", unitId: "A", itemId: "item-lagrima-de-eir" });

  const events = playTurn(hurt);
  assert.equal(eventsOf(events, "itemUsed").length, 1);
  assert.ok(eventsOf(events, "attackRoll").length > 0, "bebeu e esqueceu de atacar");

  const scratched = withItem("item-lagrima-de-eir", ["AE"], 25);
  assert.equal(planTurn(scratched).item, undefined);
  assert.equal(findUnit(scratched, "A")!.inventory!.slots.length, 1);
});

test("o Foco é bebido ANTES do golpe, e o golpe sai crítico", () => {
  const encounter = withItem("item-oleo-da-coruja-de-miraven", ["AE"]);
  const events = playTurn(encounter);

  const used = events.findIndex((event) => event.type === "itemUsed");
  const rolled = events.findIndex((event) => event.type === "attackRoll");
  assert.ok(used >= 0 && used < rolled);
  assert.equal(eventsOf(events, "attackRoll")[0].outcome, "crit");
});

test("reforço não é gasto no caminho: só com o inimigo ao alcance", () => {
  const far = withItem("item-balsamo-de-pedra-de-taharim", ["A..................E"]);
  assert.equal(eventsOf(playTurn(far), "itemUsed").length, 0);

  const close = withItem("item-balsamo-de-pedra-de-taharim", ["AE"]);
  assert.equal(chooseCommand(close).type, "useItem");
  // Já reforçado, não bebe outro igual.
  findUnit(close, "A")!.inventory!.slots[0].quantity += 1;
  run(close, chooseCommand(close));
  assert.equal(planTurn(close).item, undefined);
});

// --- Escolher onde ficar ----------------------------------------------------

test("quem luta de longe para no limite do alcance, não em cima do inimigo", () => {
  const { encounter } = setup(["A........E"], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "entropista", attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]);

  const plan = planTurn(encounter);
  assert.equal(distance(plan.tile, findUnit(encounter, "E")!.pos), 5);
  assert.ok(plan.action, "chegou ao alcance e não atacou");
});

test("contorna a parede que a linha reta não atravessa", () => {
  const WALLED = ["A...#...E", "....#....", "....#....", "....#....", "....#....", "....#....", "........."];
  const fighters = (at: (marker: string) => { x: number; y: number }) => [
    makeUnit("A", "enemy", at("A")),
    makeUnit("E", "party", at("E")),
  ];

  // A linha de base encosta na parede e fica lá: é o defeito que a IA de verdade resolve.
  const stuck = setup(WALLED, fighters).encounter;
  play(stuck, { party: basicCommand, enemy: basicCommand }, 400);
  assert.equal(stuck.winner, undefined);

  const { encounter } = setup(WALLED, fighters);
  play(encounter, SMART, 400);
  assert.ok(encounter.winner);
});

test("avançando sob fogo sem alcançar ninguém, gasta a ação se pondo em guarda", () => {
  const { encounter } = setup(["A...........R"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("R", "party", at("R"), { characterClass: "rachador" }),
  ]);
  withProfile(encounter, "A", { caution: 1 });

  const plan = planTurn(encounter);
  assert.equal(distance(plan.tile, findUnit(encounter, "R")!.pos), 6);
  assert.equal(plan.action?.ability.id, "guardiao.defend");

  const events = playTurn(encounter);
  assert.equal(eventsOf(events, "statusApplied")[0]?.statusId, "guarding");
});

test("ninguém se põe em guarda longe de qualquer ameaça", () => {
  const { encounter } = setup(["A..................E"], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]);
  withProfile(encounter, "A", { caution: 3 });

  const plan = planTurn(encounter);
  assert.equal(plan.action, undefined);
  assert.equal(distance(plan.tile, findUnit(encounter, "E")!.pos), 13);
});

test("a cautela decide se vale largar um inimigo pra derrubar outro", () => {
  const scene = () =>
    setup(["AE...", ".....", ".....", ".....", "W...."], (at) => [
      makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
      makeUnit("E", "party", at("E")),
      makeUnit("W", "party", at("W"), { currentHp: 2 }),
    ]).encounter;

  // O bruto dá as costas, leva o ataque de oportunidade e vai buscar o ferido.
  const reckless = scene();
  withProfile(reckless, "A", { caution: 0 });
  assert.equal(distance(planTurn(reckless).tile, findUnit(reckless, "W")!.pos), 1);
  const rush = playTurn(reckless);
  assert.ok(eventsOf(rush, "attackRoll").some((roll) => roll.actor === "E"));
  assert.ok(eventsOf(rush, "attackRoll").some((roll) => roll.actor === "A" && roll.target === "W"));

  // O cauteloso fica onde está e bate em quem está na frente.
  const wary = scene();
  withProfile(wary, "A", { caution: 3 });
  const hold = planTurn(wary);
  assert.deepEqual(hold.tile, findUnit(wary, "A")!.pos);
  assert.deepEqual(hold.action?.target, findUnit(wary, "E")!.pos);
});

// --- Contrato ---------------------------------------------------------------

const ARENA = ["A.....#....E", "B...o......F", "C.....#..~.G"];

function arena(seed: number) {
  return setup(
    ARENA,
    (at) => [
      makeUnit("A", "party", at("A"), { characterClass: "guardiao" }),
      makeUnit("B", "party", at("B"), { characterClass: "cantor_de_ealen" }),
      makeUnit("C", "party", at("C"), { characterClass: "rachador" }),
      makeUnit("E", "enemy", at("E"), { characterClass: "luminar" }),
      makeUnit("F", "enemy", at("F"), { characterClass: "entropista" }),
      makeUnit("G", "enemy", at("G"), { characterClass: "sombrilico" }),
    ],
    seed,
  ).encounter;
}

test("planejar não mexe na luta nem gasta o dado, e a mesma luta dá sempre o mesmo comando", () => {
  const encounter = arena(4);
  play(encounter, SMART, 9);

  const before = structuredClone(encounter);
  const command = chooseCommand(encounter);
  assert.deepEqual(encounter, before);
  assert.deepEqual(chooseCommand(structuredClone(encounter)), command);
});

test("toda luta 3 contra 3 jogada pela IA acaba, e o motor aceita tudo que ela pede", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const encounter = arena(seed);
    play(encounter, SMART);
    assert.ok(encounter.winner, `seed ${seed} não terminou`);
  }
});

test("cada criatura do bestiário, com os pesos dela, luta até o fim contra cada Ordem", () => {
  const classes: CharacterClass[] = ["luminar", "entropista", "cantor_de_ealen", "guardiao", "sombrilico", "rachador"];

  for (const [creatureId, creature] of Object.entries(BESTIARY)) {
    for (const itemId of creature.carries ?? []) {
      assert.ok(findItemTemplate(itemId), `${creatureId} carrega um item que não existe: ${itemId}`);
    }
    for (const [index, characterClass] of classes.entries()) {
      const { encounter } = setup(
        ["H.....#.....", "....o.....E.", "......#..~.."],
        (at) => [
          unitFromCharacter(makeCharacter("H", { characterClass, currentHp: 60, maxHp: 60 }), {
            team: "party",
            pos: at("H"),
          }),
          unitFromCharacter(spawnCreature(creature), { team: "enemy", pos: at("E"), ai: creature.ai }),
        ],
        index + 1,
      );
      play(encounter, SMART);
      assert.ok(encounter.winner, `${creatureId} contra ${characterClass} não terminou`);
    }
  }
});

test("a IA vence a linha de base bem mais do que perde, com as mesmas peças dos dois lados", () => {
  let smartWins = 0;
  let basicWins = 0;

  for (let seed = 1; seed <= 30; seed++) {
    for (const smartTeam of ["party", "enemy"] as const) {
      const encounter = arena(seed);
      // Lados espelhados: as mesmas três Ordens de cada lado.
      const mirror: Record<string, CharacterClass> = { E: "guardiao", F: "cantor_de_ealen", G: "rachador" };
      const mirrored = setup(
        ARENA,
        (at) =>
          encounter.units.map((unit) =>
            makeUnit(unit.id, unit.team, at(unit.id), { characterClass: mirror[unit.id] ?? unit.characterClass }),
          ),
        seed,
      ).encounter;

      play(mirrored, {
        party: smartTeam === "party" ? chooseCommand : basicCommand,
        enemy: smartTeam === "enemy" ? chooseCommand : basicCommand,
      });
      if (mirrored.winner === smartTeam) smartWins++;
      else if (mirrored.winner) basicWins++;
    }
  }

  assert.ok(smartWins > basicWins * 2, `IA ${smartWins} x ${basicWins} linha de base`);
  console.log(`      IA ${smartWins} x ${basicWins} linha de base`);
});
