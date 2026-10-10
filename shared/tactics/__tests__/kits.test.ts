import assert from "node:assert/strict";
import { test } from "node:test";
import { CLASS_COMBAT_ARTS, CLASS_TECHNIQUES, STANCE_ORDER } from "../../combatArts";
import { addItemToInventory } from "../../inventoryEffects";
import { applyXpGain, xpToNextLevel } from "../../leveling";
import { BESTIARY } from "../../mock/bestiary";
import { findItemTemplate } from "../../mock/items";
import { CLASS_INFO, type CharacterClass } from "../../types/characterClass";
import {
  GIFTS,
  STATUSES,
  abilitiesFor,
  attackOdds,
  findUnit,
  isStatusId,
  kitOf,
  learnedAt,
  movementOf,
  planTurn,
  unitFromCharacter,
  type Encounter,
  type StatusId,
  type TacticalEvent,
} from "../index";
import { FIRST, eventsOf, makeCharacter, makeUnit, run, setup } from "./helpers";

/**
 * Os kits das Ordens (../abilities.ts) e as peças de regra que eles pedem ao
 * motor: esquiva, dano recebido a mais ou a menos, dano por turno, passo
 * preso, quem não sai do lugar, quem não se cura, o golpe que fura a
 * armadura, o que devolve vida e o que leva Fôlego.
 */

const ORDERS = Object.keys(CLASS_INFO) as CharacterClass[];

function unit(encounter: Encounter, id: string) {
  return findUnit(encounter, id)!;
}

/** Põe em `id` a condição `statusId`, como se alguém a tivesse aplicado. */
function afflict(encounter: Encounter, id: string, statusId: StatusId, turns = 2): void {
  unit(encounter, id).statuses.push({ ...STATUSES[statusId], turnsLeft: turns });
}

/** O dano que o primeiro golpe de `events` causou em `target` (0 se errou). */
function damageOn(events: TacticalEvent[], target: string): number {
  return eventsOf(events, "damage")
    .filter((event) => event.target === target)
    .reduce((sum, event) => sum + event.amount, 0);
}

/** A primeira seed em que `scene` faz `check` valer: é como se escolhe uma luta em que o golpe pega. */
function seedWhere<T>(scene: (seed: number) => T, check: (result: T) => boolean): T {
  for (let seed = 1; seed < 400; seed++) {
    const result = scene(seed);
    if (check(result)) return result;
  }
  throw new Error("nenhuma seed serviu");
}

test("cada Ordem tem o kit dela: as Artes no nível 1, e as Técnicas chegam com o nível", () => {
  for (const order of ORDERS) {
    const arts = STANCE_ORDER.filter((stance) => CLASS_COMBAT_ARTS[order][stance] !== null);
    const novice = abilitiesFor(makeCharacter("x", { characterClass: order, level: 1 }));
    assert.deepEqual(novice.map((ability) => ability.id).sort(), arts.map((stance) => `${order}.${stance}`).sort(), order);

    const techniques = Object.entries(CLASS_TECHNIQUES[order]);
    assert.equal(techniques.length, 2, `${order} tem duas Técnicas`);
    for (const [slug, technique] of techniques) {
      assert.ok(technique.level > 1, `${order}.${slug} não é do nível 1`);
      const has = (level: number) =>
        abilitiesFor(makeCharacter("x", { characterClass: order, level })).some((ability) => ability.id === `${order}.${slug}`);
      assert.equal(has(technique.level - 1), false, `${order}.${slug} antes da hora`);
      assert.equal(has(technique.level), true, `${order}.${slug} no nível dela`);
      assert.deepEqual(learnedAt(order, technique.level).map((ability) => ability.id), [`${order}.${slug}`]);
    }

    // O kit inteiro: toda chave tem nome e flavor, e toda condição que ele põe existe.
    const kit = kitOf({ characterClass: order });
    assert.equal(kit.length, arts.length + 2, `${order}: toda Técnica nomeada tem o que fazer, e vice-versa`);
    assert.equal(new Set(kit.map((entry) => entry.ability.id)).size, kit.length);
    for (const { ability } of kit) {
      assert.ok(ability.name && ability.flavor, ability.id);
      for (const effect of ability.effects) {
        if (effect.kind === "status") assert.ok(isStatusId(effect.statusId), `${ability.id} põe ${effect.statusId}`);
      }
    }
  }
});

test("as posturas não são mais as mesmas em toda Ordem: cada kit faz o que o Princípio dele faz", () => {
  const kit = (order: CharacterClass, slug: string) =>
    kitOf({ characterClass: order }).find((entry) => entry.slug === slug)!.ability;
  const puts = (order: CharacterClass, slug: string) =>
    kit(order, slug).effects.flatMap((effect) => (effect.kind === "status" ? [effect.statusId] : []));

  // O golpe rápido: o Guardião puxa de longe, o Entropista enferruja, o Rachador trinca.
  assert.equal(kit("guardiao", "quick_attack").range, 3);
  assert.ok(kit("guardiao", "quick_attack").effects.some((effect) => effect.kind === "push" && effect.distance < 0));
  assert.deepEqual(puts("entropista", "quick_attack"), ["rusted"]);
  assert.deepEqual(puts("rachador", "quick_attack"), ["cracked"]);
  // A guarda: a do Sombrílico e a do Rachador não bloqueiam, tiram do caminho.
  assert.deepEqual(puts("guardiao", "defend"), ["guarding"]);
  assert.deepEqual(puts("sombrilico", "defend"), ["unseen"]);
  assert.deepEqual(puts("rachador", "defend"), ["oblique"]);
  // O golpe do Sombrílico leva Fôlego; o pesado do Cantor é uma área.
  assert.ok(kit("sombrilico", "attack").effects.some((effect) => effect.kind === "breath" && effect.amount < 0));
  assert.equal(kit("cantor_de_ealen", "heavy_attack").radius, 1);
});

test("uma criatura sabe só o que nomeia, com o nome dela — e o bestiário não nomeia o que a Ordem não tem", () => {
  for (const [key, entry] of Object.entries(BESTIARY)) {
    const { template } = entry;
    const named = Object.entries(template.arts ?? {});
    const abilities = abilitiesFor(template);
    assert.equal(abilities.length, named.length, `${key} nomeia uma habilidade que ${template.characterClass} não tem`);
    for (const [slug, name] of named) {
      assert.equal(abilities.find((ability) => ability.id === `${template.characterClass}.${slug}`)?.name, name, `${key}.${slug}`);
    }
  }
  // O nível não entra: o Lobo (nível 3) não ganha a Técnica do nível 6 só por ser Sombrílico.
  const wolf = BESTIARY["encounter-lobo-de-bruma"].template;
  assert.equal(abilitiesFor({ ...wolf, level: 9 }).some((ability) => ability.id.endsWith("corte_do_nao_dito")), false);
});

test("subir de nível devolve as Técnicas aprendidas, e a ficha já as tem", () => {
  const hero = makeCharacter("x", { characterClass: "guardiao", level: 1 });
  const first = applyXpGain(hero, xpToNextLevel(1));
  assert.deepEqual(first.learned?.map((ability) => ability.name), ["Puxão de Maré"]);
  assert.ok(abilitiesFor(hero).some((ability) => ability.id === "guardiao.puxao_de_mare"));

  // O nível 3 do Guardião não ensina nada; do 3 ao 5 de uma vez, vem a do 5.
  assert.deepEqual(applyXpGain(hero, xpToNextLevel(2)).learned, []);
  const jump = applyXpGain(hero, xpToNextLevel(3) + xpToNextLevel(4));
  assert.equal(hero.level, 5);
  assert.deepEqual(jump.learned?.map((ability) => ability.id), ["guardiao.ancora_da_singularidade"]);
});

test("a esquiva soma na defesa de quem a carrega, e só dificulta o acerto", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const strike = unit(encounter, "A").abilities.find((ability) => ability.id === "guardiao.attack")!;
  const before = attackOdds(encounter, unit(encounter, "A"), strike, unit(encounter, "E")).hit;
  afflict(encounter, "E", "unseen");
  const after = attackOdds(encounter, unit(encounter, "A"), strike, unit(encounter, "E")).hit;
  assert.equal(Math.round((before - after) * 20), STATUSES.unseen.evasion);
});

test("Trincado soma em cada golpe recebido, e Ancorado tira — e não sai do lugar", () => {
  const scene = (seed: number, status?: StatusId) => {
    const { encounter } = setup(
      ["AE.."],
      (at) => [makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300 })],
      seed,
    );
    if (status) afflict(encounter, "E", status);
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: "guardiao.heavy_attack", target: unit(encounter, "E").pos });
    return { encounter, events, damage: damageOn(events, "E") };
  };
  const plain = seedWhere(
    (seed) => ({ seed, ...scene(seed) }),
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  // O golpe pesado do Guardião arremessa.
  assert.equal(eventsOf(plain.events, "pushed").length, 1);

  assert.equal(scene(plain.seed, "cracked").damage, plain.damage + STATUSES.cracked.damageTaken);
  const anchored = scene(plain.seed, "anchored");
  assert.equal(anchored.damage, plain.damage + STATUSES.anchored.damageTaken);
  assert.equal(eventsOf(anchored.events, "pushed").length, 0);
  assert.deepEqual(unit(anchored.encounter, "E").pos, { x: 1, y: 0 });
});

test("o golpe que fura não encontra a armadura, e o Corte do Não-Dito não rola ataque", () => {
  const scene = (seed: number, abilityId: string) => {
    const { encounter } = setup(
      ["A...E"],
      (at) => [
        unitFromCharacter(makeCharacter("A", { characterClass: "rachador", level: 2, attributes: { il: FIRST } }), { team: "party", pos: at("A") }),
        makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900, attributes: { or: 8 } }),
      ],
      seed,
    );
    const events = run(encounter, { type: "ability", unitId: "A", abilityId, target: unit(encounter, "E").pos });
    return { events, damage: damageOn(events, "E") };
  };
  const plain = seedWhere(
    (seed) => ({ seed, ...scene(seed, "rachador.attack") }),
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  // Mesmo dado, mesmo golpe: a diferença é a armadura (metade do Or) que o golpe não encontra.
  assert.equal(scene(plain.seed, "rachador.falha_no_padrao").damage, plain.damage + Math.floor(8 / 2));

  const { encounter } = setup(["AE"], (at) => [
    unitFromCharacter(makeCharacter("A", { characterClass: "sombrilico", level: 6, attributes: { il: FIRST } }), { team: "party", pos: at("A") }),
    makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900 }),
  ]);
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: "sombrilico.corte_do_nao_dito", target: unit(encounter, "E").pos });
  assert.equal(eventsOf(events, "attackRoll").length, 0);
  assert.ok(damageOn(events, "E") > 0);
});

test("Decaindo fere no começo de cada turno de quem a carrega, pelos turnos que dura, e depois passa", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300 }),
  ]);
  afflict(encounter, "E", "decaying", 2);

  const ticks: number[] = [];
  for (let round = 0; round < 3; round++) {
    const events = run(encounter, { type: "endTurn", unitId: "A" });
    const triggered = eventsOf(events, "statusTriggered");
    if (triggered.length > 0) {
      assert.equal(triggered[0].unit, "E");
      // O `damage` vem logo depois de quem o causou, e depois de a vez começar.
      const at = events.indexOf(triggered[0]);
      assert.equal(events[at + 1].type, "damage");
      assert.ok(events.findIndex((event) => event.type === "turnStarted") < at);
      ticks.push(damageOn(events, "E"));
    }
    run(encounter, { type: "endTurn", unitId: "E" });
  }
  assert.equal(ticks.length, 2);
  assert.ok(ticks.every((amount) => amount >= 1 && amount <= 4));
  assert.equal(unit(encounter, "E").currentHp, 300 - ticks[0] - ticks[1]);
  assert.equal(unit(encounter, "E").statuses.length, 0);
});

test("quem não tem vida pra perder não decai", () => {
  const { encounter } = setup(["AE"], (at) => {
    const ghost = makeUnit("E", "enemy", at("E"));
    ghost.invulnerable = true;
    return [makeUnit("A", "party", at("A"), { attributes: { il: FIRST } }), ghost];
  });
  afflict(encounter, "E", "decaying", 2);
  const events = run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(eventsOf(events, "statusTriggered").length, 0);
  assert.equal(unit(encounter, "E").currentHp, unit(encounter, "E").maxHp);
});

test("a rede de Halmira prende o passo de quem pega, pelos turnos que dura", () => {
  const cast = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["A..E"],
        (at) => [
          unitFromCharacter(makeCharacter("A", { attributes: { il: FIRST } }), { team: "party", pos: at("A"), gifts: ["net_cast"] }),
          makeUnit("E", "enemy", at("E")),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: GIFTS.net_cast.id, target: unit(encounter, "E").pos });
      return { encounter, events };
    },
    ({ events }) => eventsOf(events, "statusApplied").some((event) => event.statusId === "netted"),
  );
  const { encounter } = cast;
  const foe = unit(encounter, "E");
  assert.equal(movementOf(foe), foe.speed + STATUSES.netted.speed);
  // Custou a ação bônus e Fôlego, e entra em recarga; a ação do turno continua de pé.
  assert.equal(unit(encounter, "A").turn.action, true);
  assert.equal(unit(encounter, "A").turn.bonus, false);

  run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(foe.turn.movement, foe.speed + STATUSES.netted.speed);
  run(encounter, { type: "endTurn", unitId: "E" });
  run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(foe.turn.movement, foe.speed + STATUSES.netted.speed, "o segundo turno ainda é preso");
  run(encounter, { type: "endTurn", unitId: "E" });
  run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(foe.turn.movement, foe.speed);
});

test("o corte do Sombrílico leva Fôlego de quem apanha, até o que ele tem", () => {
  const hit = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["AE"],
        (at) => [
          unitFromCharacter(makeCharacter("A", { characterClass: "sombrilico", attributes: { il: FIRST } }), { team: "party", pos: at("A") }),
          makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300, breath: 1 }),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: "sombrilico.heavy_attack", target: unit(encounter, "E").pos });
      return { encounter, events };
    },
    ({ events }) => eventsOf(events, "damage").length > 0,
  );
  // O golpe pesado tira 2, mas ele só tinha 1.
  assert.deepEqual(
    eventsOf(hit.events, "breathDrained").map(({ unit: who, amount, remaining }) => ({ who, amount, remaining })),
    [{ who: "E", amount: 1, remaining: 0 }],
  );
  assert.equal(unit(hit.encounter, "E").breath, 0);
});

test("quem está Irreversível não se cura: nem por habilidade, nem por item — e purificar tira a trava", () => {
  const scene = () => {
    const wounded = makeCharacter("W", { currentHp: 5, attributes: { il: FIRST } });
    addItemToInventory(wounded, findItemTemplate("item-lagrima-de-eir")!);
    addItemToInventory(wounded, findItemTemplate("item-incenso-purificador-de-althir")!);
    const { encounter } = setup(["HW.E"], (at) => [
      unitFromCharacter(makeCharacter("H", { characterClass: "luminar", attributes: { il: 50 } }), { team: "party", pos: at("H") }),
      unitFromCharacter(wounded, { team: "party", pos: at("W") }),
      makeUnit("E", "enemy", at("E")),
    ]);
    afflict(encounter, "W", "irreversible", 3);
    return encounter;
  };

  const sealed = scene();
  const drunk = run(sealed, { type: "useItem", unitId: "W", itemId: "item-lagrima-de-eir" });
  assert.equal(eventsOf(drunk, "heal").length, 0);
  assert.deepEqual(eventsOf(drunk, "healDenied").map((event) => event.target), ["W"]);
  run(sealed, { type: "endTurn", unitId: "W" });
  const sung = run(sealed, { type: "ability", unitId: "H", abilityId: "luminar.heal", target: unit(sealed, "W").pos });
  assert.equal(eventsOf(sung, "heal").length, 0);
  assert.equal(eventsOf(sung, "healDenied").length, 1);
  assert.equal(unit(sealed, "W").currentHp, 5);

  const cleansed = scene();
  const events = run(cleansed, { type: "useItem", unitId: "W", itemId: "item-incenso-purificador-de-althir" });
  assert.ok(eventsOf(events, "statusExpired").some((event) => event.statusId === "irreversible"));
  assert.ok(unit(cleansed, "W").currentHp > 5);
});

test("purificar não tira o que a história pôs pra durar", () => {
  const sick = makeCharacter("W", { attributes: { il: FIRST } });
  addItemToInventory(sick, findItemTemplate("item-incenso-purificador-de-althir")!);
  const { encounter } = setup(["W.E"], (at) => [unitFromCharacter(sick, { team: "party", pos: at("W") }), makeUnit("E", "enemy", at("E"))]);
  afflict(encounter, "W", "wounded_arm", Infinity);
  afflict(encounter, "W", "muffled", 2);
  run(encounter, { type: "useItem", unitId: "W", itemId: "item-incenso-purificador-de-althir" });
  assert.deepEqual(unit(encounter, "W").statuses.map((status) => status.id), ["wounded_arm"]);
});

test("a Antífona devolve a quem bate o que o golpe tirou, até a vida cheia", () => {
  const hit = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["AE"],
        (at) => [
          unitFromCharacter(makeCharacter("A", { characterClass: "luminar", level: 4, currentHp: 10, attributes: { il: FIRST } }), {
            team: "party",
            pos: at("A"),
          }),
          makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300 }),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: "luminar.antifona_de_aurora", target: unit(encounter, "E").pos });
      return { encounter, events };
    },
    ({ events }) => eventsOf(events, "damage").length > 0,
  );
  const dealt = damageOn(hit.events, "E");
  const healed = eventsOf(hit.events, "heal").filter((event) => event.target === "A");
  assert.equal(healed.length, 1);
  assert.equal(healed[0].amount, Math.min(dealt, 30 - 10));
  assert.equal(unit(hit.encounter, "A").currentHp, 10 + healed[0].amount);
});

test("a Muralha de Prumo põe uma guarda na frente de um aliado, e ela cai quando a vez dele chega", () => {
  const { encounter } = setup(["LA.E"], (at) => [
    unitFromCharacter(makeCharacter("L", { characterClass: "luminar", level: 2, attributes: { il: FIRST } }), { team: "party", pos: at("L") }),
    makeUnit("A", "party", at("A"), { attributes: { il: 1 } }),
    makeUnit("E", "enemy", at("E"), { attributes: { il: 50 } }),
  ]);
  run(encounter, { type: "ability", unitId: "L", abilityId: "luminar.muralha_de_prumo", target: unit(encounter, "A").pos });
  assert.ok(unit(encounter, "A").statuses.some((status) => status.guard));
  // É a ação bônus: o golpe do turno continua de pé.
  assert.equal(unit(encounter, "L").turn.action, true);
  run(encounter, { type: "endTurn", unitId: "L" });
  run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(unit(encounter, "A").statuses.some((status) => status.guard), false);
});

test("a IA dá valor ao que os kits fazem: abre a trinca antes de bater, some quando apanha, e não cura quem não se cura", () => {
  // O Rachador da IA usa a ação bônus na Trinca e a ação no golpe, no mesmo alvo.
  const sniper = setup(["A....E"], (at) => [
    unitFromCharacter(makeCharacter("A", { characterClass: "rachador", attributes: { il: FIRST } }), { team: "enemy", pos: at("A") }),
    makeUnit("E", "party", at("E"), { currentHp: 300, maxHp: 300 }),
  ]).encounter;
  const shot = planTurn(sniper);
  assert.equal(shot.bonus?.ability.id, "rachador.quick_attack");
  assert.ok(shot.action && shot.action.ability.effects.some((effect) => effect.kind === "damage"));

  // A esquiva vale o dano que poupa: sem ninguém que o alcance, ficar Despercebido não vale o gesto.
  const safe = setup(["A.......E"], (at) => [
    unitFromCharacter(makeCharacter("A", { characterClass: "sombrilico", attributes: { il: FIRST } }), { team: "enemy", pos: at("A") }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
  const idle = unit(safe, "A");
  idle.turn.movement = 0;
  idle.breath = idle.maxBreath;
  assert.notEqual(planTurn(safe).action?.ability.id, "sombrilico.defend");

  // Um curandeiro não gasta a cura em quem a cura não pega.
  const ward = setup(["HW......E"], (at) => [
    unitFromCharacter(makeCharacter("H", { characterClass: "luminar", attributes: { il: FIRST } }), { team: "enemy", pos: at("H") }),
    makeUnit("W", "enemy", at("W"), { currentHp: 3 }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
  assert.equal(planTurn(ward).action?.ability.id, "luminar.heal");
  afflict(ward, "W", "irreversible", 3);
  assert.notEqual(planTurn(ward).action?.ability.id, "luminar.heal");
});
