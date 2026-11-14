import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeUnit,
  findUnit,
  gridFromAscii,
  startEncounter,
  unitFromCharacter,
  type Ability,
  type Encounter,
  type EncounterSetup,
  type Magic,
  type Pos,
  type TacticalEvent,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run } from "./helpers";

/**
 * Os custos que faltavam da `combate` §2.2 (task 98, decidido pelo co-autor em
 * 2026-11-14): tempo, posição, gente em volta, equipamento e lei. Cada um tem a
 * hora dele de cair (ver payCost em ../engine.ts).
 */

const TOUGH = { currentHp: 900, maxHp: 900, breath: 0 };

function stage(rows: string[], place: (at: (marker: string) => Pos) => Unit[], seed: number, extra: Partial<EncounterSetup> = {}) {
  const { grid, markers } = gridFromAscii(rows);
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), seed, ...extra }).encounter;
}

/** A primeira semente em que o primeiro golpe de `scene` pega com custo. */
function costly(scene: (seed: number) => { encounter: Encounter; events: TacticalEvent[] }) {
  for (let seed = 1; seed <= 300; seed++) {
    const result = scene(seed);
    if (eventsOf(result.events, "attackRoll")[0]?.outcome === "cost") return result;
  }
  throw new Error("nenhuma semente deu sucesso com custo");
}

const kinds = (events: TacticalEvent[]) => eventsOf(events, "costPaid").map((event) => event.kind);

test("posição: o golpe de perto dado de cima perde a altura — quem bateu desce colado no alvo", () => {
  const { encounter, events } = costly((seed) => {
    const encounter = stage(["AE", ".."], (at) => [makeUnit("A", "party", at("A"), { breath: 6, attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"), TOUGH)], seed);
    encounter.grid.tiles[0] = { ...encounter.grid.tiles[0], elevation: 1 };
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: { x: 1, y: 0 } });
    return { encounter, events };
  });
  assert.deepEqual(kinds(events), ["position"]);
  const hero = findUnit(encounter, "A")!;
  assert.equal(hero.pos.y, 1);
  assert.equal(hero.breath, 6, "a posição foi o custo: o Fôlego fica");
});

test("posição: de costas pra parede, quem bateu sai Prensado no lugar do Fôlego", () => {
  const { encounter, events } = costly((seed) => {
    const encounter = stage(["#AE"], (at) => [makeUnit("A", "party", at("A"), { breath: 6, attributes: { olho: FIRST } }), makeUnit("E", "enemy", at("E"), TOUGH)], seed);
    return { encounter, events: run(encounter, { type: "ability", unitId: "A", abilityId: "espadachim.attack", target: { x: 2, y: 0 } }) };
  });
  assert.deepEqual(kinds(events), ["position"]);
  assert.ok(findUnit(encounter, "A")!.statuses.some((status) => status.id === "prensado"));
});

test("gente em volta: o tiro que pega por pouco raspa no aliado colado no alvo", () => {
  const { encounter, events } = costly((seed) => {
    const encounter = stage(
      ["A...E", "....B"],
      (at) => [
        makeUnit("A", "party", at("A"), { breath: 6, equipment: { weapon: "gear-besta" }, attributes: { olho: FIRST } }),
        makeUnit("B", "party", at("B"), TOUGH),
        makeUnit("E", "enemy", at("E"), TOUGH),
      ],
      seed,
    );
    return { encounter, events: run(encounter, { type: "ability", unitId: "A", abilityId: findUnit(encounter, "A")!.abilities.find((a) => a.id.endsWith(".attack"))!.id, target: { x: 4, y: 0 } }) };
  });
  const [paid] = eventsOf(events, "costPaid");
  assert.equal(paid.kind, "bystander");
  assert.equal(paid.bystander, "B");
  assert.equal(findUnit(encounter, "B")!.currentHp, 900 - paid.amount);
});

const PAGE: Magic = { concept: "atracao_repulsao", level: 3 };
/** Um golpe recitado de 3 de mana: com o custo, passaria do limite da Página. */
const BOLT: Ability = {
  id: "test.bolt",
  name: "Pancada",
  flavor: "",
  cost: "action",
  range: 4,
  targets: "enemy",
  attack: { toHit: 0 },
  effects: [{ kind: "damage", dice: { count: 1, sides: 4 }, attribute: "primary" }],
  mana: 3,
};

function mage(pos: Pos): Unit {
  const unit = unitFromCharacter(makeCharacter("M", { attributes: { olho: FIRST, saber: 5 } }), { team: "party", pos, magic: PAGE });
  unit.abilities.push({ ...BOLT });
  return unit;
}

const pass = (encounter: Encounter) => run(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });

test("tempo: a recitada que passaria do limite pelo custo come a ação do turno em que sai, e não estoura", () => {
  const { encounter, events } = costly((seed) => {
    const encounter = stage(["M..E"], (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), { ...TOUGH, kit: [] })], seed);
    run(encounter, { type: "ability", unitId: "M", abilityId: BOLT.id, target: { x: 3, y: 0 } });
    pass(encounter);
    return { encounter, events: pass(encounter) };
  });
  assert.deepEqual(kinds(events), ["time"]);
  assert.equal(eventsOf(events, "manaBurst").length, 0);
  const caster = findUnit(encounter, "M")!;
  assert.equal(activeUnit(encounter)!.id, "M");
  assert.equal(caster.turn.action, false);
});

test("lei: na rua da cidade, o custo da magia sai da lei, e a luta conta", () => {
  const { encounter, events } = costly((seed) => {
    const encounter = stage(["M..E"], (at) => [mage(at("M")), makeUnit("E", "enemy", at("E"), { ...TOUGH, kit: [] })], seed, { law: true });
    run(encounter, { type: "ability", unitId: "M", abilityId: BOLT.id, target: { x: 3, y: 0 } });
    pass(encounter);
    return { encounter, events: pass(encounter) };
  });
  assert.deepEqual(kinds(events), ["law"]);
  assert.equal(encounter.lawBroken, 1);
  assert.equal(findUnit(encounter, "M")!.turn.action, true);
});
