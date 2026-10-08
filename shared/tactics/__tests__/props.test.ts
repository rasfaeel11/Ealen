import assert from "node:assert/strict";
import { test } from "node:test";
import {
  abilityTargets,
  attackEdge,
  findUnit,
  gridFromAscii,
  planTurn,
  propAt,
  reachableTiles,
  samePos,
  standProp,
  startEncounter,
  tileAt,
  type Encounter,
  type Pos,
  type PropId,
  type Unit,
} from "../index";
import { FIRST, eventsOf, makeUnit, run } from "./helpers";

const PROP_MARKERS: Record<string, PropId> = { c: "crate", b: "barrel" };

/** Monta uma luta a partir de um desenho em que `c` é um caixote e `b` um barril de óleo. */
function setup(rows: string[], place: (at: (marker: string) => Pos) => Unit[], seed = 1): Encounter {
  const { grid, markers } = gridFromAscii(rows);
  const props = Object.entries(PROP_MARKERS).flatMap(([marker, kind]) =>
    (markers[marker] ?? []).map((pos, index) => standProp(grid, `${kind}-${index}`, kind, pos)),
  );
  return startEncounter({ grid, units: place((marker) => markers[marker][0]), props, seed }).encounter;
}

function duel(rows: string[], actorClass: "rachador" | "guardiao" | "cantor_de_ealen" = "rachador", seed = 1) {
  return setup(
    rows,
    (at) => [
      makeUnit("A", "party", at("A"), { characterClass: actorClass, attributes: { il: FIRST } }),
      makeUnit("E", "enemy", at("E"), { currentHp: 500, maxHp: 500 }),
    ],
    seed,
  );
}

test("um caixote de pé barra o passo e dá cobertura a quem se esconde atrás", () => {
  const encounter = duel(["A...cE"]);
  const actor = findUnit(encounter, "A")!;

  assert.ok(!reachableTiles(encounter, actor).some((tile) => samePos(tile.pos, { x: 4, y: 0 })));
  assert.equal(attackEdge(encounter, actor, actor.abilities[1], findUnit(encounter, "E")!).cover, true);
});

test("golpe que fere mira o destrutível, sempre pega e, quebrando, abre o quadrado", () => {
  const encounter = duel(["A...cE"]);
  const actor = findUnit(encounter, "A")!;
  const crate = { x: 4, y: 0 };
  const attack = actor.abilities.find((ability) => ability.id === "rachador.attack")!;
  assert.ok(abilityTargets(encounter, actor, attack).some((pos) => samePos(pos, crate)));

  let broken = false;
  for (let turn = 0; turn < 6 && !broken; turn++) {
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: crate });
    // Objeto não se esquiva: não há rolagem de ataque, e o dano entra inteiro.
    assert.equal(eventsOf(events, "attackRoll").length, 0);
    assert.equal(eventsOf(events, "propDamaged").length, 1);
    assert.equal(actor.turn.action, false);

    broken = eventsOf(events, "propDestroyed").length === 1;
    if (!broken) {
      run(encounter, { type: "endTurn", unitId: "A" });
      run(encounter, { type: "endTurn", unitId: "E" });
    }
  }
  assert.ok(broken, "o caixote deveria ter quebrado");

  assert.equal(propAt(encounter, crate), undefined);
  assert.deepEqual(tileAt(encounter.grid, crate), { blocksMove: false, blocksSight: false, moveCost: 1, cover: false, elevation: 0 });
  assert.equal(attackEdge(encounter, actor, attack, findUnit(encounter, "E")!).cover, false);
  // Quebrado, não é mais alvo de nada.
  assert.ok(!abilityTargets(encounter, actor, attack).some((pos) => samePos(pos, crate)));
});

test("cura e guarda não miram destrutível", () => {
  const encounter = setup(["Ac.E"], (at) => [
    makeUnit("A", "party", at("A"), { characterClass: "luminar", attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const actor = findUnit(encounter, "A")!;
  const crate = { x: 1, y: 0 };

  for (const ability of actor.abilities) {
    const aims = abilityTargets(encounter, actor, ability).some((pos) => samePos(pos, crate));
    const harms = ability.effects.some((effect) => effect.kind === "damage");
    assert.equal(aims, harms && ability.range >= 1, ability.id);
  }
});

test("o barril arrebentado derrama chamas em volta, e elas queimam quem está ali", () => {
  const encounter = duel(["A....b.", "......E"]);
  const barrel = { x: 5, y: 0 };

  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "rachador.attack", target: barrel });
  assert.deepEqual(
    events.map((event) => event.type),
    ["abilityUsed", "propDamaged", "propDestroyed", "surfaceCreated"],
  );
  const [fire] = eventsOf(events, "surfaceCreated");
  assert.equal(fire.surfaceId, "fire");
  // O quadrado do barril e os cinco vizinhos que existem neste mapa de duas linhas.
  assert.equal(fire.tiles.length, 6);
  assert.ok(fire.tiles.some((pos) => samePos(pos, barrel)));

  const turn = run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(eventsOf(turn, "surfaceTriggered")[0].unit, "E");
});

test("uma área quebra os destrutíveis do raio junto com quem estiver nele", () => {
  const encounter = duel(["A.....", "...bE.", "......"], "cantor_de_ealen");
  const events = run(encounter, {
    type: "ability",
    unitId: "A",
    abilityId: "cantor_de_ealen.heavy_attack",
    target: { x: 4, y: 1 },
  });

  assert.equal(eventsOf(events, "propDestroyed").length, 1);
  assert.equal(eventsOf(events, "attackRoll").length, 1);
  // A geada da própria habilidade vem por último e fica por cima do fogo derramado.
  assert.deepEqual(
    eventsOf(events, "surfaceCreated").map((event) => event.surfaceId),
    ["fire", "frost"],
  );
});

test("a luta clonada quebra os próprios caixotes, não os da original", () => {
  const encounter = duel(["Ab...E"], "guardiao");
  const copy = structuredClone(encounter);
  run(copy, { type: "ability", unitId: "A", abilityId: "guardiao.attack", target: { x: 1, y: 0 } });

  assert.equal(tileAt(copy.grid, { x: 1, y: 0 })!.blocksMove, false);
  assert.equal(tileAt(encounter.grid, { x: 1, y: 0 })!.blocksMove, true);
  assert.equal(encounter.props[0].hp, 4);
});

test("a IA arrebenta o barril ao lado de quem ela não consegue ferir de frente", () => {
  // O Rachador ataca com Il: a vez dele vem de o alvo ser lento, não de ele ser rápido.
  const scene = (rows: string[]) =>
    setup(rows, (at) => [
      makeUnit("A", "enemy", at("A"), { characterClass: "rachador" }),
      makeUnit("E", "party", at("E"), { attributes: { or: 40, il: -100 } }),
    ]);

  const plan = planTurn(scene(["A....bE", "......."]));
  assert.deepEqual(plan.action?.target, { x: 5, y: 0 });

  // Sem ninguém por perto, barril não vale o golpe.
  const aim = planTurn(scene(["A...b..", ".......", "......E"])).action?.target;
  assert.ok(!aim || !samePos(aim, { x: 4, y: 0 }));
});
