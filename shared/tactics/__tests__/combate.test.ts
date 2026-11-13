import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COST_BAND,
  CHAIN_MAX,
  CURVE_TO_HIT,
  activeUnit,
  applyCommand,
  attackEdge,
  canBeImprobable,
  findUnit,
  gridFromAscii,
  startEncounter,
  type Encounter,
  type Pos,
  type StyleId,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run, setup } from "./helpers";

/**
 * A Camada 1 do combate (`referencias/combate.md` no repositório da história,
 * decidida pelo autor em 2026-11-05): as três faixas, o custo que sai do mundo,
 * a falha que expõe, os verbos que se encadeiam e criam condição, as escolas
 * como jeito de encadear, e a chance da curva de poder e da diferença de nível.
 */

const styled = (unit: Unit, style: StyleId, grade = 2): Unit => Object.assign(unit, { style, grade });
/** Bate sempre (menos no 1 natural): a rolagem sobra pro pleno. */
const STRONG = { forca: 60, olho: FIRST };
const TOUGH = { currentHp: 900, maxHp: 900 };
const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

/** A primeira semente de 1 a 200 em que `scene` satisfaz `check`. */
function seedWhere<T>(scene: (seed: number) => T, check: (result: T) => boolean): T {
  for (let seed = 1; seed <= 200; seed++) {
    const result = scene(seed);
    if (check(result)) return result;
  }
  throw new Error("nenhuma semente serviu");
}

function duel(rows: string[], seed: number, attacker: Parameters<typeof makeUnit>[3] = {}, defender: Parameters<typeof makeUnit>[3] = {}) {
  return setup(
    rows,
    (at) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST }, ...attacker }), makeUnit("E", "enemy", at("E"), { ...TOUGH, ...defender })],
    seed,
  ).encounter;
}

const strike = (encounter: Encounter, abilityId = "espadachim.attack", target?: Pos) =>
  run(encounter, { type: "ability", unitId: "A", abilityId, target: target ?? findUnit(encounter, "E")!.pos });

test("toda rolagem cai numa de três faixas: pleno com folga, com custo na defesa, falha abaixo", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 120; seed++) {
    const encounter = duel(["AE"], seed);
    const [roll] = eventsOf(strike(encounter), "attackRoll");
    seen.add(roll.outcome);
    if (roll.natural === 1 || roll.natural === 20) continue;
    const band = roll.total >= roll.defense + COST_BAND ? "hit" : roll.total >= roll.defense ? "cost" : "miss";
    assert.equal(roll.outcome, band, `semente ${seed}`);
  }
  for (const outcome of ["hit", "cost", "miss"]) assert.ok(seen.has(outcome), `a faixa ${outcome} deveria aparecer`);
});

test("a falha não é nada: quem errou fica Exposto, e o golpe contra ele sai mais fácil", () => {
  const { encounter, events } = seedWhere(
    (seed) => {
      const encounter = duel(["AE"], seed, {}, { attributes: { couro: 30 } });
      return { encounter, events: strike(encounter) };
    },
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "miss",
  );
  const statuses = eventsOf(events, "statusApplied").filter((event) => event.target === "A").map((event) => event.statusId);
  assert.deepEqual(statuses, ["exposto"]);
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;
  const blow = enemy.abilities.find((ability) => ability.id === "espadachim.attack")!;
  // A defesa dele cai 2: o Exposto é esquiva negativa.
  assert.ok(hero.statuses.some((status) => status.id === "exposto" && status.evasion === -2));
  assert.equal(attackEdge(encounter, enemy, blow, hero).toHit, 0);
});

test("o sucesso com custo cobra do mundo: Fôlego de quem tem, a ferida própria de quem não tem", () => {
  const costly = (breath: number) =>
    seedWhere(
      (seed) => {
        const encounter = duel(["AE"], seed, { breath }, { breath: 0 });
        return { encounter, events: strike(encounter) };
      },
      ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "cost",
    );

  const tired = costly(4);
  assert.deepEqual(
    eventsOf(tired.events, "costPaid").map((event) => [event.unit, event.kind, event.amount]),
    [["A", "breath", 1]],
  );

  const spent = costly(0);
  const [wound] = eventsOf(spent.events, "costPaid");
  assert.equal(wound.kind, "wound");
  assert.ok(wound.amount >= 1 && wound.amount <= 4);
  const hero = findUnit(spent.encounter, "A")!;
  assert.equal(hero.currentHp, hero.maxHp - wound.amount);
});

test("verbos encadeados: Agarrar, Empurrar contra a parede, Golpear — a ação abre, o Fôlego segue, e a cadeia enche", () => {
  const { encounter, grab } = seedWhere(
    (seed) => {
      const encounter = duel(["AE#"], seed, { attributes: STRONG, breath: 6 }, { breath: 0 });
      return { encounter, grab: strike(encounter, "espadachim.agarrar") };
    },
    ({ grab }) => eventsOf(grab, "attackRoll")[0].outcome === "hit",
  );
  const hero = findUnit(encounter, "A")!;
  const enemy = findUnit(encounter, "E")!;
  assert.ok(enemy.statuses.some((status) => status.id === "agarrado"));
  assert.equal(hero.turn.action, false);
  assert.deepEqual(hero.turn.chain, { target: "E", verbs: 1, last: "espadachim.agarrar", struck: false });

  const shove = strike(encounter, "espadachim.empurrar");
  if (eventsOf(shove, "attackRoll")[0].outcome === "fumble") return;
  // O segundo verbo: 1 de Fôlego da cadeia, mais o 1 que o Empurrar custa.
  assert.deepEqual(eventsOf(shove, "chained"), [{ type: "chained", unit: "A", verbs: 2, breath: 1 }]);
  assert.ok(enemy.statuses.some((status) => status.id === "prensado"), "contra a parede, Prensado");

  const blow = strike(encounter);
  if (eventsOf(blow, "attackRoll")[0].outcome === "fumble") return;
  assert.equal(eventsOf(blow, "chained")[0].verbs, CHAIN_MAX);
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: enemy.pos }), {
    ok: false,
    reason: "resource_spent",
  });
});

test("a cadeia só segue no mesmo alvo, e andar a solta", () => {
  const { encounter } = seedWhere(
    (seed) => {
      const encounter = setup(
        ["FAE.", "...."],
        (at) => [
          makeUnit("A", "party", at("A"), { attributes: STRONG, breath: 6 }),
          makeUnit("E", "enemy", at("E"), TOUGH),
          makeUnit("F", "enemy", at("F"), TOUGH),
        ],
        seed,
      ).encounter;
      return { encounter, events: strike(encounter) };
    },
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: findUnit(encounter, "F")!.pos }), {
    ok: false,
    reason: "invalid_target",
  });
  run(encounter, { type: "move", unitId: "A", to: { x: 1, y: 1 } });
  assert.equal(findUnit(encounter, "A")!.turn.chain, undefined);
});

test("Agarrado no meio do texto: a recitação se perde, e ele não anda", () => {
  const { encounter, events } = seedWhere(
    (seed) => {
      const encounter = duel(["AE"], seed, { attributes: STRONG }, { breath: 0 });
      findUnit(encounter, "E")!.reciting = { abilityId: "espadachim.attack", target: { x: 0, y: 0 } };
      return { encounter, events: strike(encounter, "espadachim.agarrar") };
    },
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  assert.equal(eventsOf(events, "recitationBroken")[0]?.unit, "E");
  pass(encounter);
  assert.equal(findUnit(encounter, "E")!.turn.movement, 0);
});

test("Empurrar no aberto derruba; Caído levanta no começo da vez com metade do passo", () => {
  const { encounter } = seedWhere(
    (seed) => {
      const encounter = duel(["AE..."], seed, { attributes: STRONG }, { breath: 0 });
      return { encounter, events: strike(encounter, "espadachim.empurrar") };
    },
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  const enemy = findUnit(encounter, "E")!;
  assert.deepEqual(enemy.pos, { x: 2, y: 0 });
  assert.ok(enemy.statuses.some((status) => status.id === "caido"));
  const full = enemy.speed;
  const turn = pass(encounter);
  assert.equal(eventsOf(turn, "stoodUp")[0]?.unit, "E");
  assert.equal(enemy.turn.movement, Math.floor(full / 2));
  assert.ok(!enemy.statuses.some((status) => status.id === "caido"));
});

test("Desarmado não dá golpe de arma, mas ainda agarra, empurra e derruba", () => {
  const encounter = duel(["AE"], 1);
  const hero = findUnit(encounter, "A")!;
  hero.statuses.push({ id: "disarmed", name: "Desarmado", unarmed: true, turnsLeft: 2 });
  assert.deepEqual(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: { x: 1, y: 0 } }), {
    ok: false,
    reason: "disarmed",
  });
  assert.equal(applyCommand(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.derrubar", target: { x: 1, y: 0 } }).ok, true);
});

test("Gryskar: paga Fôlego pra abrir a ordem, e o segundo golpe da cadeia sai fraco", () => {
  const { encounter, events } = setup(
    ["AE"],
    (at) => [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), styled(makeUnit("E", "enemy", at("E"), { ...TOUGH, breath: 3 }), "gryskar")],
    3,
  );
  assert.equal(activeUnit(encounter)!.id, "E", "o Gryskar abre, mesmo com menos Olho");
  assert.deepEqual(
    eventsOf(events, "costPaid").map((event) => [event.unit, event.kind, event.first]),
    [["E", "breath", true]],
  );
  assert.equal(findUnit(encounter, "E")!.breath, 2);

  // O segundo golpe da cadeia: os mesmos dados, com e sem a aura gasta no primeiro.
  const second = (struck: boolean, seed: number) => {
    const encounter = duel(["AE"], seed, { attributes: STRONG, breath: 6 }, { breath: 0, attributes: { couro: 0 } });
    const hero = styled(findUnit(encounter, "A")!, "gryskar");
    hero.turn.action = false;
    hero.turn.chain = { target: "E", verbs: 1, last: "espadachim.attack", struck };
    const events = strike(encounter);
    return { events, damage: eventsOf(events, "damage").filter((event) => event.target === "E").reduce((sum, event) => sum + event.amount, 0) };
  };
  const seed = seedWhere((seed) => ({ seed, ...second(true, seed) }), ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit").seed;
  assert.ok(second(true, seed).damage < second(false, seed).damage);
});

test("Gryskar: quem leva a investida não paga pra abrir a ordem, que já é do outro lado", () => {
  const { grid, markers } = gridFromAscii(["A.E"]);
  const units = [makeUnit("A", "party", markers.A[0]), styled(makeUnit("E", "enemy", markers.E[0], { ...TOUGH, breath: 3 }), "gryskar")];
  const { encounter, events } = startEncounter({ grid, units, seed: 3, charge: "party" });
  assert.equal(activeUnit(encounter)!.id, "A", "quem deu a investida vem antes");
  assert.deepEqual(eventsOf(events, "costPaid"), []);
  assert.equal(findUnit(encounter, "E")!.breath, 3);
});

test("Tsvirana: trocar de verbo no meio da cadeia sai sem Fôlego, e não se apara nem se devolve", () => {
  const encounter = duel(["AE"], 5, { attributes: STRONG, breath: 6 }, { breath: 6 });
  styled(findUnit(encounter, "A")!, "tsvirana");
  styled(findUnit(encounter, "E")!, "ipojy");
  const hero = findUnit(encounter, "A")!;
  hero.turn.action = false;
  hero.turn.chain = { target: "E", verbs: 1, last: "espadachim.agarrar", struck: false };
  encounter.opened = true;
  const events = strike(encounter);
  assert.deepEqual(eventsOf(events, "chained"), [{ type: "chained", unit: "A", verbs: 2, breath: 0, feint: true }]);
  assert.deepEqual(eventsOf(events, "parried"), []);
  assert.deepEqual(eventsOf(events, "styleTrait").filter((event) => event.trait === "counter"), []);
});

test("Ipojy: o Contragolpe sai como sucesso pleno, sem rolar", () => {
  const { events } = seedWhere(
    (seed) => {
      const encounter = duel(["AE"], seed, {}, { attributes: { couro: 200 } });
      styled(findUnit(encounter, "E")!, "ipojy");
      return { events: strike(encounter) };
    },
    ({ events }) => eventsOf(events, "styleTrait").some((event) => event.trait === "counter"),
  );
  // Uma rolagem só: a de quem errou. A dela não rola.
  assert.deepEqual(eventsOf(events, "attackRoll").map((event) => event.actor), ["A"]);
  assert.ok(eventsOf(events, "damage").some((event) => event.target === "A"));
});

test("a curva de poder e a diferença de nível mexem na chance; três níveis abaixo, o improvável não entra", () => {
  const encounter = duel(["AE"], 1);
  const sword = Object.assign(findUnit(encounter, "A")!, { aura: 2 });
  const mage = Object.assign(findUnit(encounter, "E")!, { concept: "atracao_repulsao", manaLimit: 3 }) as Unit;
  const blow = sword.abilities.find((ability) => ability.id === "espadachim.attack")!;
  // Página (3): o espadachim leva a curva, e está um nível abaixo.
  assert.equal(attackEdge(encounter, sword, blow, mage).levelToHit, CURVE_TO_HIT - 1);
  // Círculo (4): a curva empata.
  mage.manaLimit = 4;
  assert.equal(attackEdge(encounter, sword, blow, mage).levelToHit, -2);
  // A partir do 5, o mago passa; e de três níveis acima, o de baixo nem tem o improvável.
  mage.manaLimit = 5;
  assert.equal(attackEdge(encounter, sword, blow, mage).levelToHit, -CURVE_TO_HIT - 3);
  assert.equal(canBeImprobable(sword, mage), false);
  assert.equal(canBeImprobable(mage, sword), true);
});

test("Esquivar: quem não é de escola de espada sai da frente do golpe que pegaria por pouco", () => {
  const { encounter, events } = seedWhere(
    (seed) => {
      const encounter = duel(["AE"], seed, {}, { breath: 4 });
      return { encounter, events: strike(encounter) };
    },
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "cost",
  );
  assert.deepEqual(eventsOf(events, "dodged"), [{ type: "dodged", unit: "E", attacker: "A" }]);
  assert.deepEqual(eventsOf(events, "damage"), []);
  const enemy = findUnit(encounter, "E")!;
  assert.equal(enemy.breath, 2);
  assert.equal(enemy.turn.reaction, false);
  // Não errou: quem bateu não fica Exposto.
  assert.ok(!findUnit(encounter, "A")!.statuses.some((status) => status.id === "exposto"));
  const none: TacticalEvent[] = eventsOf(events, "costPaid");
  assert.deepEqual(none, []);
});
