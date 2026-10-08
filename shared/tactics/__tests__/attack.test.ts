import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COVER_DEFENSE,
  FLANK_TO_HIT,
  HEIGHT_TO_HIT,
  attackEdge,
  attackOdds,
  findUnit,
  planTurn,
  type Encounter,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

function ability(unit: Unit, stance: string) {
  return unit.abilities.find((candidate) => candidate.id.endsWith(`.${stance}`))!;
}

/** A vantagem de posição do ataque comum de `actorId` em `targetId`. */
function edge(encounter: Encounter, actorId: string, targetId: string) {
  const actor = findUnit(encounter, actorId)!;
  return attackEdge(encounter, actor, ability(actor, "attack"), findUnit(encounter, targetId)!);
}

function duel(rows: string[], actorClass: "rachador" | "guardiao" = "rachador", seed = 1) {
  return setup(
    rows,
    (at) => [
      makeUnit("A", "party", at("A"), { characterClass: actorClass, attributes: { il: FIRST } }),
      makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
    ],
    seed,
  ).encounter;
}

// --- Cobertura --------------------------------------------------------------

test("quem está colado numa pedra tem cobertura de quem atira do outro lado dela", () => {
  assert.equal(edge(duel(["A...oE"]), "A", "E").cover, true);
  assert.equal(edge(duel(["A...oE"]), "A", "E").defense, COVER_DEFENSE);

  // A pedra colada em quem atira não atrapalha o tiro; a que está no meio do caminho, longe do alvo, também não.
  assert.equal(edge(duel(["Ao...E"]), "A", "E").cover, false);
  assert.equal(edge(duel(["A.o..E"]), "A", "E").cover, false);
  // Fora da linha do tiro, a pedra não protege.
  assert.equal(edge(duel(["A....E", "....o."]), "A", "E").cover, false);
  // De perto não há atrás do que se esconder.
  assert.equal(edge(duel(["AE", "o."], "guardiao"), "A", "E").cover, false);
});

test("a cobertura entra na defesa que a rolagem precisa alcançar", () => {
  const open = duel(["A....E"]);
  const covered = duel(["A...oE"]);
  const target = { x: 5, y: 0 };
  const [plain] = eventsOf(run(open, { type: "ability", unitId: "A", abilityId: "rachador.attack", target }), "attackRoll");
  const [hidden] = eventsOf(
    run(covered, { type: "ability", unitId: "A", abilityId: "rachador.attack", target }),
    "attackRoll",
  );

  assert.equal(plain.cover, false);
  assert.equal(hidden.cover, true);
  assert.equal(hidden.defense, plain.defense + COVER_DEFENSE);
  // A mesma seed rola o mesmo d20: só a defesa mudou.
  assert.equal(hidden.total, plain.total);
});

test("numa área, a cobertura é medida do ponto de impacto, não de quem lançou", () => {
  const { encounter } = setup(["A.....", "...oE.", "......"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "cantor_de_ealen", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const caster = findUnit(encounter, "A")!;
  const victim = findUnit(encounter, "E")!;
  const blast = ability(caster, "heavy_attack");

  // Mirado do lado da pedra em que o alvo está, o estouro não tem pedra nenhuma no caminho.
  assert.equal(attackEdge(encounter, caster, blast, victim, { x: 5, y: 1 }).cover, false);
  // Um tiro reto do mesmo lugar teria.
  assert.equal(attackEdge(encounter, caster, ability(caster, "attack"), victim).cover, true);
});

// --- Flanco -----------------------------------------------------------------

function pincer(rows: string[]) {
  return setup(rows, (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
  ]).encounter;
}

test("um aliado do outro lado do alvo flanqueia; ao lado de quem bate, não", () => {
  assert.equal(edge(pincer(["AEB"]), "A", "E").flanked, true);
  assert.equal(edge(pincer(["..B", "AE."]), "A", "E").flanked, true);
  assert.equal(edge(pincer(["A..", ".E.", "..B"]), "A", "E").flanked, true);

  assert.equal(edge(pincer([".B.", "AE."]), "A", "E").flanked, false);
  assert.equal(edge(pincer(["B..", "AE."]), "A", "E").flanked, false);
  // O aliado precisa estar colado no alvo.
  assert.equal(edge(pincer(["AE.B"]), "A", "E").flanked, false);
});

test("aliado caído não flanqueia, e flanco é só de corpo a corpo", () => {
  const fallen = pincer(["AEB"]);
  findUnit(fallen, "B")!.currentHp = 0;
  assert.equal(edge(fallen, "A", "E").flanked, false);

  const { encounter } = setup(["A.EB"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "rachador", attributes: { il: FIRST } }),
    makeUnit("B", "party", at("B")),
    makeUnit("E", "enemy", at("E")),
  ]);
  assert.equal(edge(encounter, "A", "E").flanked, false);
});

test("o flanco entra no total da rolagem", () => {
  const alone = duel(["AE"], "guardiao");
  const flanking = pincer(["AEB"]);
  // Três iniciativas roladas em vez de duas: iguala o dado pra comparar a mesma rolagem.
  flanking.rngState = alone.rngState;
  const target = { x: 1, y: 0 };
  const [plain] = eventsOf(run(alone, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target }), "attackRoll");
  const [flanked] = eventsOf(
    run(flanking, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target }),
    "attackRoll",
  );

  assert.equal(flanked.flanked, true);
  assert.equal(flanked.natural, plain.natural);
  assert.equal(flanked.total, plain.total + FLANK_TO_HIT);
});

// --- Altura -----------------------------------------------------------------

test("atacar de cima soma no ataque; de baixo, tira o mesmo tanto", () => {
  const { encounter } = setup(["A....E"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "rachador", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E"), { characterClass: "rachador" }),
  ]);
  encounter.grid.tiles[0].elevation = 1;

  assert.deepEqual(
    { height: edge(encounter, "A", "E").height, toHit: edge(encounter, "A", "E").toHit },
    { height: 1, toHit: HEIGHT_TO_HIT },
  );
  assert.deepEqual(
    { height: edge(encounter, "E", "A").height, toHit: edge(encounter, "E", "A").toHit },
    { height: -1, toHit: -HEIGHT_TO_HIT },
  );

  const [roll] = eventsOf(
    run(encounter, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: { x: 5, y: 0 } }),
    "attackRoll",
  );
  assert.equal(roll.height, 1);
});

// --- A conta das chances ----------------------------------------------------

test("a chance que attackOdds promete é a que o dado entrega", () => {
  const SEEDS = 600;
  const scenes: [string, () => Encounter][] = [
    ["campo aberto", () => duel(["A....E"])],
    ["cobertura", () => duel(["A...oE"])],
  ];

  for (const [name, scene] of scenes) {
    const sample = scene();
    const actor = findUnit(sample, "A")!;
    const odds = attackOdds(sample, actor, ability(actor, "attack"), findUnit(sample, "E")!);

    let landed = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const encounter = scene();
      encounter.rngState = seed * 7919;
      const [roll] = eventsOf(
        run(encounter, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: { x: 5, y: 0 } }),
        "attackRoll",
      );
      if (roll.outcome === "hit" || roll.outcome === "crit") landed++;
    }
    const promised = odds.hit + odds.crit;
    assert.ok(Math.abs(landed / SEEDS - promised) < 0.06, `${name}: prometeu ${promised}, entregou ${landed / SEEDS}`);
  }
});

// --- A IA usa a posição -----------------------------------------------------

test("a IA dá a volta pra flanquear quando custa o mesmo que não dar", () => {
  const { encounter } = setup(["..A..", ".....", ".BE..", "....."], (at) => [
    makeUnit("A", "enemy", at("A"), { attributes: { il: FIRST } }),
    makeUnit("B", "enemy", at("B")),
    makeUnit("E", "party", at("E")),
  ]);
  const plan = planTurn(encounter);
  assert.equal(plan.tile.x, 3, "deveria parar do lado oposto ao aliado");
  assert.ok(plan.action);
});

test("a IA que atira prefere o chão alto", () => {
  const { encounter } = setup(["A.^....E", "........"], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "entropista", attributes: { il: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]);
  assert.deepEqual(planTurn(encounter).tile, { x: 2, y: 0 });
});

test("a IA sob fogo atira de trás da pedra", () => {
  const { encounter } = setup(["A....o...R", "..........", ".........."], (at) => [
    makeUnit("A", "enemy", at("A"), { characterClass: "entropista", attributes: { il: FIRST } }),
    makeUnit("R", "party", at("R"), { characterClass: "rachador" }),
  ]);
  const plan = planTurn(encounter);
  assert.deepEqual(plan.tile, { x: 4, y: 0 });
  assert.ok(plan.action, "de trás da pedra ainda alcança o alvo");
});
