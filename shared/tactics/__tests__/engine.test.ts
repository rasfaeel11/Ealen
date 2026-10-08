import assert from "node:assert/strict";
import { test } from "node:test";
import { addItemToInventory } from "../../inventoryEffects";
import { findItemTemplate } from "../../mock/items";
import {
  activeUnit,
  applyCommand,
  findUnit,
  gridFromAscii,
  reachableTiles,
  startEncounter,
  unitFromCharacter,
  type Encounter,
  type Pos,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, playOut, run, setup } from "./helpers";

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

function unit(encounter: Encounter, id: string) {
  return findUnit(encounter, id)!;
}

// --- Turnos -----------------------------------------------------------------

test("quem tem mais Il age primeiro, e a ordem dá a volta abrindo rodada nova", () => {
  const { encounter, events } = setup(["A...E"], (at) => [
    makeUnit("E", "enemy", at("E")),
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
  ]);

  assert.deepEqual(encounter.order, ["A", "E"]);
  assert.equal(eventsOf(events, "turnStarted")[0].unit, "A");

  run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(activeUnit(encounter)!.id, "E");

  const wrap = run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(encounter.round, 2);
  assert.deepEqual(eventsOf(wrap, "roundStarted"), [{ type: "roundStarted", round: 2 }]);
  assert.equal(activeUnit(encounter)!.id, "A");
});

test("só quem está no turno pode agir", () => {
  const { encounter } = setup(["A...E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.deepEqual(applyCommand(encounter, { type: "endTurn", unitId: "E" }), { ok: false, reason: "not_your_turn" });
});

// --- Movimento --------------------------------------------------------------

test("andar gasta movimento, e terreno difícil gasta o dobro", () => {
  const { encounter } = setup(["A.~.......E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const events = run(encounter, { type: "move", unitId: "A", to: { x: 3, y: 0 } });

  assert.deepEqual(unit(encounter, "A").pos, { x: 3, y: 0 });
  assert.equal(unit(encounter, "A").turn.movement, 6 - 4);
  assert.equal(eventsOf(events, "moved")[0].path.length, 3);
});

test("movimento além do alcance é recusado sem mudar nada", () => {
  const { encounter } = setup(["A.........E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const before = structuredClone(encounter);

  assert.deepEqual(applyCommand(encounter, { type: "move", unitId: "A", to: { x: 7, y: 0 } }), {
    ok: false,
    reason: "unreachable",
  });
  assert.deepEqual(encounter, before);
});

test("inimigo barra o corredor; aliado deixa passar mas não deixa parar em cima", () => {
  const corridor = setup(["#####", "A.E..", "#####"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]).encounter;
  assert.deepEqual(
    reachableTiles(corridor, unit(corridor, "A")).map((tile) => tile.pos),
    [{ x: 1, y: 1 }],
  );

  const withAlly = setup(["#####", "AB..E", "#####"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E")),
  ]).encounter;
  assert.deepEqual(
    reachableTiles(withAlly, unit(withAlly, "A")).map((tile) => tile.pos),
    [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  );
});

// --- Habilidades ------------------------------------------------------------

test("corpo a corpo não alcança de longe, e tiro não atravessa parede", () => {
  const { encounter } = setup(["A.#.E"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.deepEqual(
    applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: { x: 4, y: 0 } }),
    { ok: false, reason: "invalid_target" },
  );

  const sniper = setup(["A.#.E"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "rachador", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]).encounter;
  assert.deepEqual(
    applyCommand(sniper, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: { x: 4, y: 0 } }),
    { ok: false, reason: "invalid_target" },
  );
});

test("um ataque gasta a ação; o golpe rápido cabe na ação bônus do mesmo turno", () => {
  let hits = 0;
  for (const seed of SEEDS) {
    const { encounter } = setup(
      ["AE"],
      (at) => [
        makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
        makeUnit("E", "enemy", at("E"), { currentHp: 200, maxHp: 200 }),
      ],
      seed,
    );
    const target = { x: 1, y: 0 };
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target });

    const [roll] = eventsOf(events, "attackRoll");
    const damage = eventsOf(events, "damage");
    if (roll.outcome === "hit" || roll.outcome === "crit") {
      hits += 1;
      assert.equal(damage.length, 1);
      assert.equal(unit(encounter, "E").currentHp, 200 - damage[0].amount);
    } else {
      assert.equal(damage.length, 0);
      assert.equal(unit(encounter, "E").currentHp, 200);
    }

    assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target }), {
      ok: false,
      reason: "resource_spent",
    });
    assert.equal(
      applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.quick_attack", target }).ok,
      true,
    );
  }
  assert.ok(hits > 0 && hits < SEEDS.length, "o dado deveria acertar umas e errar outras");
});

test("sair de perto de um inimigo corpo a corpo provoca um ataque de oportunidade, uma vez", () => {
  const { encounter } = setup(["...AE", "....F"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST }, currentHp: 500, maxHp: 500 }),
    makeUnit("E", "enemy", at("E")),
    makeUnit("F", "enemy", at("F"), { characterClass: "rachador" }),
  ]);
  const events = run(encounter, { type: "move", unitId: "A", to: { x: 0, y: 0 } });

  // Só o Guardião reage: o Rachador luta de longe e não ameaça quem passa.
  const reactions = eventsOf(events, "abilityUsed");
  assert.deepEqual(
    reactions.map((event) => [event.unit, event.reaction]),
    [["E", true]],
  );
  assert.equal(events[0].type, "abilityUsed", "o golpe vem antes do passo");
  assert.equal(unit(encounter, "E").turn.reaction, false);
  assert.deepEqual(unit(encounter, "A").pos, { x: 0, y: 0 });
});

test("o Guardião arremessa o alvo, e a parede segura o arremesso", () => {
  let pushes = 0;
  for (const seed of SEEDS) {
    const { encounter } = setup(
      ["AE.#"],
      (at) => [
        makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
        makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
      ],
      seed,
    );
    const events = run(encounter, {
      type: "ability",
      unitId: "A",
      abilityId: "guardiao.heavy_attack",
      target: { x: 1, y: 0 },
    });

    const [roll] = eventsOf(events, "attackRoll");
    const landed = roll.outcome === "hit" || roll.outcome === "crit";
    // Empurrão de 2, mas só há um quadrado livre antes da parede.
    assert.deepEqual(unit(encounter, "E").pos, { x: landed ? 2 : 1, y: 0 });
    assert.equal(eventsOf(events, "pushed").length, landed ? 1 : 0);
    if (landed) pushes += 1;
  }
  assert.ok(pushes > 0);
});

test("área acerta todo mundo no raio, aliado inclusive", () => {
  const { encounter } = setup(["A...E", "....F", "....B"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E")),
    makeUnit("F", "enemy", at("F")),
  ]);
  const events = run(encounter, {
    type: "ability",
    unitId: "A",
    abilityId: "cantor_de_ealen.heavy_attack",
    target: { x: 4, y: 1 },
  });

  assert.deepEqual(
    eventsOf(events, "attackRoll")
      .map((event) => event.target)
      .sort(),
    ["B", "E", "F"],
  );
});

test("a guarda reduz o dano e cai no começo do próprio turno seguinte", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const raised = run(encounter, {
    type: "ability",
    unitId: "A",
    abilityId: "guardiao.defend",
    target: { x: 0, y: 0 },
  });
  assert.equal(eventsOf(raised, "statusApplied")[0].statusId, "guarding");
  run(encounter, { type: "endTurn", unitId: "A" });

  const strike = run(encounter, {
    type: "ability",
    unitId: "E",
    abilityId: "guardiao.attack",
    target: { x: 0, y: 0 },
  });
  const landed = ["hit", "crit"].includes(eventsOf(strike, "attackRoll")[0].outcome);
  assert.equal(eventsOf(strike, "blocked").length, landed ? 1 : 0);

  const back = run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(eventsOf(back, "statusExpired")[0].statusId, "guarding");
  assert.deepEqual(unit(encounter, "A").statuses, []);
});

// --- Itens ------------------------------------------------------------------

test("item custa a ação bônus, cura e sai da mochila", () => {
  const character = makeCharacter("A", { currentHp: 10, attributes: { il: FIRST } });
  addItemToInventory(character, findItemTemplate("item-lagrima-de-eir")!);
  addItemToInventory(character, findItemTemplate("item-oleo-da-coruja-de-miraven")!);

  const { encounter } = setup(["AE"], (at) => [
    unitFromCharacter(character, { team: "party", pos: at("A") }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const events = run(encounter, { type: "useItem", unitId: "A", itemId: "item-lagrima-de-eir" });

  assert.equal(unit(encounter, "A").currentHp, 25);
  assert.equal(eventsOf(events, "heal")[0].amount, 15);
  assert.equal(unit(encounter, "A").inventory!.slots.length, 1);
  assert.equal(character.currentHp, 10, "a ficha salva não é tocada pela luta");

  assert.deepEqual(applyCommand(encounter, { type: "useItem", unitId: "A", itemId: "item-oleo-da-coruja-de-miraven" }), {
    ok: false,
    reason: "resource_spent",
  });
  assert.deepEqual(applyCommand(encounter, { type: "useItem", unitId: "A", itemId: "item-que-nao-existe" }), {
    ok: false,
    reason: "item_unavailable",
  });
});

test("Foco garante o crítico do próximo ataque e se gasta nele", () => {
  const character = makeCharacter("A", { attributes: { il: FIRST } });
  addItemToInventory(character, findItemTemplate("item-oleo-da-coruja-de-miraven")!);

  const { encounter } = setup(["AE"], (at) => [
    unitFromCharacter(character, { team: "party", pos: at("A") }),
    makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
  ]);
  run(encounter, { type: "useItem", unitId: "A", itemId: "item-oleo-da-coruja-de-miraven" });
  const events = run(encounter, {
    type: "ability",
    unitId: "A",
    abilityId: "guardiao.attack",
    target: { x: 1, y: 0 },
  });

  assert.equal(eventsOf(events, "attackRoll")[0].outcome, "crit");
  assert.deepEqual(unit(encounter, "A").statuses, []);
});

// --- Lutas inteiras ---------------------------------------------------------

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
  );
}

test("toda luta 3 contra 3 termina com um vencedor, e depois disso nada mais é aceito", () => {
  for (const seed of SEEDS) {
    const { encounter } = arena(seed);
    const log = playOut(encounter);

    assert.ok(encounter.winner, `seed ${seed} não terminou`);
    assert.deepEqual(log.at(-1), { type: "battleEnded", winner: encounter.winner });
    const losers = encounter.units.filter((other) => other.team !== encounter.winner);
    assert.ok(losers.every((other) => other.currentHp === 0));
    assert.deepEqual(applyCommand(encounter, { type: "endTurn", unitId: encounter.order[0] }), {
      ok: false,
      reason: "battle_over",
    });
  }
});

test("mesma seed e mesmos comandos dão exatamente a mesma luta", () => {
  const first = arena(7);
  const second = arena(7);
  assert.deepEqual(first.events, second.events);
  assert.deepEqual(playOut(first.encounter), playOut(second.encounter));

  assert.notDeepEqual(playOut(arena(8).encounter), playOut(arena(9).encounter));
});

test("uma cópia da luta continua igual à original, sem gastar o dado dela", () => {
  const { encounter } = arena(3);
  playOut(encounter, 12);

  const copy = structuredClone(encounter);
  const rngBefore = encounter.rngState;
  const future = playOut(copy);

  assert.equal(encounter.rngState, rngBefore);
  assert.deepEqual(playOut(encounter), future);
});

// --- Surpresa ---------------------------------------------------------------

test("quem é pego de surpresa perde o primeiro turno, mesmo ganhando a iniciativa, e só ele", () => {
  const { grid, markers } = gridFromAscii(["A....E"]);
  const { encounter, events } = startEncounter({
    grid,
    units: [
      makeUnit("E", "enemy", markers.E[0], { attributes: { il: FIRST } }),
      makeUnit("A", "party", markers.A[0]),
    ],
    surprised: "enemy",
    seed: 1,
  });

  assert.deepEqual(encounter.order, ["E", "A"]);
  assert.equal(eventsOf(events, "battleStarted")[0].surprised, "enemy");
  assert.deepEqual(eventsOf(events, "statusApplied").map((event) => [event.target, event.statusId]), [["E", "surprised"]]);
  // A vez de E chega, passa sozinha, e quem age é A.
  assert.deepEqual(eventsOf(events, "turnSkipped"), [{ type: "turnSkipped", unit: "E", name: "Surpreso" }]);
  assert.equal(activeUnit(encounter)!.id, "A");
  assert.deepEqual(unit(encounter, "E").statuses, []);

  // Na rodada seguinte E joga normalmente.
  const next = run(encounter, { type: "endTurn", unitId: "A" });
  assert.deepEqual(eventsOf(next, "turnSkipped"), []);
  assert.equal(activeUnit(encounter)!.id, "E");
  assert.equal(unit(encounter, "E").turn.action, true);
});

test("o surpreendido não tem reação até a própria vez: quem passa por ele não leva ataque de oportunidade", () => {
  const rows = ["..A..", "..E..", "....."];
  const place = (at: (marker: string) => Pos) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ];
  const away = { type: "move", unitId: "A", to: { x: 0, y: 0 } } as const;

  const plain = setup(rows, place);
  assert.equal(eventsOf(run(plain.encounter, away), "abilityUsed").filter((event) => event.reaction).length, 1);

  const { grid, markers } = gridFromAscii(rows);
  const ambush = startEncounter({ grid, units: place((marker) => markers[marker][0]), surprised: "enemy", seed: 1 });
  assert.deepEqual(eventsOf(run(ambush.encounter, away), "abilityUsed"), []);

  // Passada a vez perdida, a reação volta.
  run(ambush.encounter, { type: "endTurn", unitId: "A" });
  assert.equal(unit(ambush.encounter, "E").turn.reaction, true);
});

test("uma emboscada joga até o fim com a IA, e a mesma seed dá a mesma luta", () => {
  const fight = (seed: number) => {
    const { grid, markers } = gridFromAscii(["A.....E", "......F"]);
    const { encounter, events } = startEncounter({
      grid,
      units: [
        makeUnit("A", "party", markers.A[0]),
        makeUnit("E", "enemy", markers.E[0]),
        makeUnit("F", "enemy", markers.F[0]),
      ],
      surprised: "enemy",
      seed,
    });
    return [...events, ...playOut(encounter)];
  };
  for (const seed of SEEDS.slice(0, 8)) {
    const log = fight(seed);
    assert.equal(eventsOf(log, "turnSkipped").length, 2);
    assert.equal(eventsOf(log, "battleEnded").length, 1);
    assert.deepEqual(log, fight(seed));
  }
});
