import assert from "node:assert/strict";
import { test } from "node:test";
import { CLASS_COMBAT_ARTS, CLASS_TECHNIQUES, STANCE_ORDER } from "../../combatArts";
import { addItemToInventory } from "../../inventoryEffects";
import { applyXpGain, xpToNextLevel } from "../../leveling";
import { BESTIARY, creaturePlacement, spawnCreature } from "../../mock/bestiary";
import { findItemTemplate } from "../../mock/items";
import { CLASS_INFO, type CharacterClass } from "../../types/characterClass";
import {
  GIFTS,
  applyCommand,
  STATUSES,
  abilitiesFor,
  attackOdds,
  findUnit,
  isRecited,
  isStatusId,
  kitOf,
  learnedAt,
  learnedAtMage,
  movementOf,
  planTurn,
  unitFromCharacter,
  type Encounter,
  type StatusId,
  type TacticalEvent,
} from "../index";
import { FIRST, TEST_ITEMS, TEST_KIT, eventsOf, makeCharacter, makeUnit, run, setup } from "./helpers";

/**
 * Os kits das classes (../abilities.ts) e as peças de regra do motor que eles
 * (ou o kit de teste, ver TEST_KIT) exercitam: esquiva, dano recebido a mais
 * ou a menos, dano por turno, passo preso, quem não sai do lugar, quem não se
 * cura, o golpe que fura a armadura, o que devolve vida e o que leva Fôlego.
 */

const CLASSES = Object.keys(CLASS_INFO) as CharacterClass[];

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

/** Quantas Técnicas cada classe ensina: duas pro mago (as do Círculo); o espadachim, nenhuma (o golpe-selo é por iniciação). */
const TECHNIQUES = (order: CharacterClass) => (order === "espadachim" ? 0 : 2);

test("cada classe tem o kit dela: as Artes no nível 1, e as Técnicas chegam com o nível", () => {
  for (const order of CLASSES) {
    const arts = STANCE_ORDER.filter((stance) => CLASS_COMBAT_ARTS[order][stance] !== null);
    const novice = abilitiesFor(makeCharacter("x", { characterClass: order, level: 1 }));
    assert.deepEqual(novice.map((ability) => ability.id).sort(), arts.map((stance) => `${order}.${stance}`).sort(), order);

    const techniques = Object.entries(CLASS_TECHNIQUES[order]);
    assert.equal(techniques.length, TECHNIQUES(order), `${order} tem ${TECHNIQUES(order)} Técnicas`);
    for (const [slug, technique] of techniques) {
      const id = `${order}.${slug}`;
      if (technique.mage !== undefined) {
        // A do nível de mago chega com ele, em qualquer nível; e não se "aprende" subindo de nível.
        const has = (mageLevel: number) =>
          abilitiesFor(makeCharacter("x", { characterClass: order, level: 1, mageLevel })).some((ability) => ability.id === id);
        assert.equal(has(technique.mage - 1), false, `${id} antes do nível de mago dela`);
        assert.equal(has(technique.mage), true, `${id} no nível de mago dela`);
        assert.ok(learnedAtMage(order, technique.mage).some((ability) => ability.id === id));
        assert.ok(!learnedAt(order, technique.level).some((ability) => ability.id === id));
        continue;
      }
      assert.ok(technique.level > 1, `${id} não é do nível 1`);
      const has = (level: number) =>
        abilitiesFor(makeCharacter("x", { characterClass: order, level })).some((ability) => ability.id === id);
      assert.equal(has(technique.level - 1), false, `${id} antes da hora`);
      assert.equal(has(technique.level), true, `${id} no nível dela`);
      assert.deepEqual(learnedAt(order, technique.level).map((ability) => ability.id), [id]);
    }

    // O kit inteiro: toda chave tem nome e flavor, e toda condição que ele põe existe.
    const kit = kitOf({ characterClass: order });
    assert.equal(kit.length, arts.length + TECHNIQUES(order), `${order}: toda Técnica nomeada tem o que fazer, e vice-versa`);
    assert.equal(new Set(kit.map((entry) => entry.ability.id)).size, kit.length);
    for (const { ability } of kit) {
      assert.ok(ability.name && ability.flavor, ability.id);
      for (const effect of ability.effects) {
        if (effect.kind === "status") assert.ok(isStatusId(effect.statusId), `${ability.id} põe ${effect.statusId}`);
      }
    }
  }
});

test("o mago de atração e repulsão paga a magia em mana e a recita; o bordão e a guarda são de graça", () => {
  const kit = Object.fromEntries(kitOf({ characterClass: "atracao_repulsao" }).map((entry) => [entry.slug, entry]));
  // Puxão, Empurrão, Cura, Desarmar e Arremesso: magia — custa mana, não Fôlego, e é recitada.
  for (const slug of ["quick_attack", "heavy_attack", "heal", "desarmar", "arremesso"]) {
    const { ability } = kit[slug];
    assert.ok((ability.mana ?? 0) > 0, `${slug} custa mana`);
    assert.equal(ability.breath, undefined, `${slug} não custa Fôlego`);
    assert.equal(isRecited(ability), true, `${slug} é recitada`);
  }
  for (const slug of ["attack", "defend"]) assert.equal(kit[slug].ability.mana, undefined, `${slug} é de graça`);
  assert.ok(kit.quick_attack.ability.effects.some((effect) => effect.kind === "push" && effect.distance < 0));
  assert.ok(kit.heavy_attack.ability.effects.some((effect) => effect.kind === "push" && effect.distance > 0));
  assert.ok(kit.arremesso.ability.effects.some((effect) => effect.kind === "push" && effect.distance >= 3));
  assert.deepEqual(kit.desarmar.ability.effects.map((effect) => (effect.kind === "status" ? effect.statusId : effect.kind)), ["disarmed"]);
  // Desarmar e Arremesso são do Círculo (`magia` §3.5): chegam com o nível de mago 4, e o Arremesso gasta o limite
  // inteiro de um Círculo num turno.
  assert.deepEqual([kit.desarmar.mage, kit.arremesso.mage], [4, 4]);
  assert.equal(kit.arremesso.ability.mana, 4);

  // O espadachim: a lâmina, e o que pesa custa Fôlego.
  const blade = Object.fromEntries(kitOf({ characterClass: "espadachim" }).map((entry) => [entry.slug, entry.ability]));
  assert.deepEqual(Object.keys(blade).sort(), ["attack", "defend", "heavy_attack", "quick_attack"]);
  assert.ok(Object.values(blade).every((ability) => ability.mana === undefined));
  assert.equal(blade.heavy_attack.breath, 2);
});

test("uma criatura sabe só o que nomeia, com o nome dela — e o bestiário não nomeia o que a classe não tem", () => {
  for (const [key, entry] of Object.entries(BESTIARY)) {
    const { template } = entry;
    const named = Object.entries(template.arts ?? {});
    const abilities = abilitiesFor(template);
    assert.equal(abilities.length, named.length, `${key} nomeia uma habilidade que ${template.characterClass} não tem`);
    for (const [slug, name] of named) {
      assert.equal(abilities.find((ability) => ability.id === `${template.characterClass}.${slug}`)?.name, name, `${key}.${slug}`);
    }
  }
  // O nível não entra: o recitador (Página) não ganha o Desarmar, que é do Círculo, por mais nível que tenha.
  const reader = BESTIARY["encounter-recitador-de-ymboripe"].template;
  assert.equal(abilitiesFor({ ...reader, level: 9 }).some((ability) => ability.id.endsWith("desarmar")), false);
});

test("subir de nível não ensina Técnica a ninguém do mundo: o mago aprende pelo nível de mago", () => {
  // O espadachim só tem o golpe-selo, por iniciação (`magia` §5.6): subir de nível não dá botão.
  const blade = makeCharacter("x", { level: 1 });
  assert.deepEqual(applyXpGain(blade, xpToNextLevel(1) + xpToNextLevel(2) + xpToNextLevel(3)).learned, []);
  assert.equal(blade.level, 4);

  // O de atração e repulsão também não: o que é do Círculo chega quando ele chega ao Círculo.
  const mage = makeCharacter("y", { characterClass: "atracao_repulsao", level: 1, mageLevel: 3 });
  assert.deepEqual(applyXpGain(mage, xpToNextLevel(1)).learned, []);
  assert.deepEqual(learnedAtMage("atracao_repulsao", 4).map((ability) => ability.id), [
    "atracao_repulsao.desarmar",
    "atracao_repulsao.arremesso",
  ]);
});

test("a esquiva soma na defesa de quem a carrega, e só dificulta o acerto", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E")),
  ]);
  const strike = unit(encounter, "A").abilities.find((ability) => ability.id === "espadachim.attack")!;
  const before = attackOdds(encounter, unit(encounter, "A"), strike, unit(encounter, "E")).hit;
  afflict(encounter, "E", "unseen");
  const after = attackOdds(encounter, unit(encounter, "A"), strike, unit(encounter, "E")).hit;
  assert.equal(Math.round((before - after) * 20), STATUSES.unseen.evasion);
});

test("Trincado soma em cada golpe recebido, e Ancorado tira — e não sai do lugar", () => {
  const scene = (seed: number, status?: StatusId) => {
    const { encounter } = setup(
      ["AE.."],
      (at) => [
        makeUnit("A", "party", at("A"), { kit: [TEST_KIT.empurrao], attributes: { olho: FIRST } }),
        makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300 }),
      ],
      seed,
    );
    if (status) afflict(encounter, "E", status);
    const events = run(encounter, { type: "ability", unitId: "A", abilityId: TEST_KIT.empurrao.id, target: unit(encounter, "E").pos });
    return { encounter, events, damage: damageOn(events, "E") };
  };
  const plain = seedWhere(
    (seed) => ({ seed, ...scene(seed) }),
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  // O golpe pesado que empurra arremessa.
  assert.equal(eventsOf(plain.events, "pushed").length, 1);

  assert.equal(scene(plain.seed, "cracked").damage, plain.damage + STATUSES.cracked.damageTaken);
  const anchored = scene(plain.seed, "anchored");
  assert.equal(anchored.damage, plain.damage + STATUSES.anchored.damageTaken);
  assert.equal(eventsOf(anchored.events, "pushed").length, 0);
  assert.deepEqual(unit(anchored.encounter, "E").pos, { x: 1, y: 0 });
});

test("o golpe que fura não encontra a armadura, e o corte sem rolagem não rola ataque", () => {
  const scene = (seed: number, abilityId: string) => {
    const { encounter } = setup(
      ["A...E"],
      (at) => [
        makeUnit("A", "party", at("A"), { kit: [TEST_KIT.tiro, TEST_KIT.furo], attributes: { olho: FIRST } }),
        makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900, attributes: { couro: 8 } }),
      ],
      seed,
    );
    const events = run(encounter, { type: "ability", unitId: "A", abilityId, target: unit(encounter, "E").pos });
    return { events, damage: damageOn(events, "E") };
  };
  const plain = seedWhere(
    (seed) => ({ seed, ...scene(seed, TEST_KIT.tiro.id) }),
    ({ events }) => eventsOf(events, "attackRoll")[0].outcome === "hit",
  );
  // Mesmo dado, mesmo golpe: a diferença é a armadura (metade do Couro) que o golpe não encontra.
  assert.equal(scene(plain.seed, TEST_KIT.furo.id).damage, plain.damage + Math.floor(8 / 2));

  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { kit: [TEST_KIT.corte], attributes: { olho: FIRST } }),
    makeUnit("E", "enemy", at("E"), { currentHp: 900, maxHp: 900 }),
  ]);
  const events = run(encounter, { type: "ability", unitId: "A", abilityId: TEST_KIT.corte.id, target: unit(encounter, "E").pos });
  assert.equal(eventsOf(events, "attackRoll").length, 0);
  assert.ok(damageOn(events, "E") > 0);
});

test("Decaindo fere no começo de cada turno de quem a carrega, pelos turnos que dura, e depois passa", () => {
  const { encounter } = setup(["AE"], (at) => [
    makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }),
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
    return [makeUnit("A", "party", at("A"), { attributes: { olho: FIRST } }), ghost];
  });
  afflict(encounter, "E", "decaying", 2);
  const events = run(encounter, { type: "endTurn", unitId: "A" });
  assert.equal(eventsOf(events, "statusTriggered").length, 0);
  assert.equal(unit(encounter, "E").currentHp, unit(encounter, "E").maxHp);
});

test("a rede prende o passo de quem pega, pelos turnos que dura", () => {
  const cast = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["A..E"],
        (at) => [
          unitFromCharacter(makeCharacter("A", { attributes: { olho: FIRST } }), { team: "party", pos: at("A"), gifts: ["net_cast"] }),
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

test("o golpe que sufoca leva Fôlego de quem apanha, até o que ele tem", () => {
  const hit = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["AE"],
        (at) => [
          makeUnit("A", "party", at("A"), { kit: [TEST_KIT.sufoco], attributes: { olho: FIRST } }),
          makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300, breath: 1 }),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: TEST_KIT.sufoco.id, target: unit(encounter, "E").pos });
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
    const wounded = makeCharacter("W", { currentHp: 5, attributes: { olho: FIRST } });
    addItemToInventory(wounded, findItemTemplate("item-unguento-de-barqueiro")!);
    addItemToInventory(wounded, TEST_ITEMS.purificar);
    const { encounter } = setup(["HW.E"], (at) => [
      makeUnit("H", "party", at("H"), { kit: [TEST_KIT.cura], attributes: { olho: 50 } }),
      unitFromCharacter(wounded, { team: "party", pos: at("W") }),
      makeUnit("E", "enemy", at("E")),
    ]);
    afflict(encounter, "W", "irreversible", 3);
    return encounter;
  };

  const sealed = scene();
  const drunk = run(sealed, { type: "useItem", unitId: "W", itemId: "item-unguento-de-barqueiro" });
  assert.equal(eventsOf(drunk, "heal").length, 0);
  assert.deepEqual(eventsOf(drunk, "healDenied").map((event) => event.target), ["W"]);
  run(sealed, { type: "endTurn", unitId: "W" });
  const sung = run(sealed, { type: "ability", unitId: "H", abilityId: TEST_KIT.cura.id, target: unit(sealed, "W").pos });
  assert.equal(eventsOf(sung, "heal").length, 0);
  assert.equal(eventsOf(sung, "healDenied").length, 1);
  assert.equal(unit(sealed, "W").currentHp, 5);

  const cleansed = scene();
  const events = run(cleansed, { type: "useItem", unitId: "W", itemId: TEST_ITEMS.purificar.id });
  assert.ok(eventsOf(events, "statusExpired").some((event) => event.statusId === "irreversible"));
  assert.ok(unit(cleansed, "W").currentHp > 5);
});

test("purificar não tira o que a história pôs pra durar", () => {
  const sick = makeCharacter("W", { attributes: { olho: FIRST } });
  addItemToInventory(sick, TEST_ITEMS.purificar);
  const { encounter } = setup(["W.E"], (at) => [unitFromCharacter(sick, { team: "party", pos: at("W") }), makeUnit("E", "enemy", at("E"))]);
  afflict(encounter, "W", "wounded_arm", Infinity);
  afflict(encounter, "W", "muffled", 2);
  run(encounter, { type: "useItem", unitId: "W", itemId: TEST_ITEMS.purificar.id });
  assert.deepEqual(unit(encounter, "W").statuses.map((status) => status.id), ["wounded_arm"]);
});

test("o golpe que drena devolve a quem bate o que o golpe tirou, até a vida cheia", () => {
  const hit = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["AE"],
        (at) => [
          makeUnit("A", "party", at("A"), { kit: [TEST_KIT.dreno], currentHp: 10, attributes: { olho: FIRST } }),
          makeUnit("E", "enemy", at("E"), { currentHp: 300, maxHp: 300 }),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: TEST_KIT.dreno.id, target: unit(encounter, "E").pos });
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

test("a guarda posta na frente de um aliado cai quando a vez dele chega", () => {
  const { encounter } = setup(["LA.E"], (at) => [
    makeUnit("L", "party", at("L"), { kit: [TEST_KIT.muralha], attributes: { olho: FIRST } }),
    makeUnit("A", "party", at("A"), { attributes: { olho: 1 } }),
    makeUnit("E", "enemy", at("E"), { attributes: { olho: 50 } }),
  ]);
  run(encounter, { type: "ability", unitId: "L", abilityId: TEST_KIT.muralha.id, target: unit(encounter, "A").pos });
  assert.ok(unit(encounter, "A").statuses.some((status) => status.guard));
  // É a ação bônus: o golpe do turno continua de pé.
  assert.equal(unit(encounter, "L").turn.action, true);
  run(encounter, { type: "endTurn", unitId: "L" });
  run(encounter, { type: "endTurn", unitId: "E" });
  assert.equal(unit(encounter, "A").statuses.some((status) => status.guard), false);
});

test("a IA dá valor ao que os kits fazem: abre a trinca antes de bater, some quando apanha, e não cura quem não se cura", () => {
  // Quem atira usa a ação bônus na Trinca e a ação no golpe, no mesmo alvo.
  const sniper = setup(["A....E"], (at) => [
    makeUnit("A", "enemy", at("A"), { kit: [TEST_KIT.trinca, TEST_KIT.tiro], attributes: { olho: FIRST } }),
    makeUnit("E", "party", at("E"), { currentHp: 300, maxHp: 300 }),
  ]).encounter;
  // Parado: o golpe rápido de perto não entra na conta, só o que alcança daqui.
  unit(sniper, "A").turn.movement = 0;
  const shot = planTurn(sniper);
  assert.equal(shot.bonus?.ability.id, TEST_KIT.trinca.id);
  assert.ok(shot.action && shot.action.ability.effects.some((effect) => effect.kind === "damage"));

  // A esquiva vale o dano que poupa: sem ninguém que o alcance, ficar Despercebido não vale o gesto.
  const safe = setup(["A.......E"], (at) => [
    makeUnit("A", "enemy", at("A"), { kit: [TEST_KIT.sumir], attributes: { olho: FIRST } }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
  const idle = unit(safe, "A");
  idle.turn.movement = 0;
  idle.breath = idle.maxBreath;
  assert.notEqual(planTurn(safe).action?.ability.id, TEST_KIT.sumir.id);

  // Um curandeiro não gasta a cura em quem a cura não pega.
  const ward = setup(["HW......E"], (at) => [
    makeUnit("H", "enemy", at("H"), { kit: [TEST_KIT.cura], attributes: { olho: FIRST } }),
    makeUnit("W", "enemy", at("W"), { currentHp: 3 }),
    makeUnit("E", "party", at("E")),
  ]).encounter;
  assert.equal(planTurn(ward).action?.ability.id, TEST_KIT.cura.id);
  afflict(ward, "W", "irreversible", 3);
  assert.notEqual(planTurn(ward).action?.ability.id, TEST_KIT.cura.id);
});

test("a gente do mundo luta com o que é: humano, da escola dela, com o que veste; o recitador de Ymboripe conjura", () => {
  const people = Object.entries(BESTIARY).filter(([, entry]) => entry.person && entry.template.race === "humano");
  assert.ok(people.length >= 7);
  for (const [id, entry] of people) {
    assert.ok(entry.template.equipment?.weapon, `${id} luta com uma arma`);
  }

  const reader = BESTIARY["encounter-recitador-de-ymboripe"];
  const unit = unitFromCharacter(spawnCreature(reader), { team: "enemy", pos: { x: 0, y: 0 }, ...creaturePlacement(reader, "hero") });
  assert.deepEqual([unit.manaLimit, unit.concept], [3, "atracao_repulsao"]);
  assert.ok(unit.mana! > 0);
  assert.ok(unit.abilities.some((ability) => isRecited(ability)));
});

test("a Ombrada de Jarupã empurra um quadrado, e contra a parede quem apanha bate nela", () => {
  const { events } = seedWhere(
    (seed) => {
      const { encounter } = setup(
        ["AE#"],
        (at) => [
          unitFromCharacter(makeCharacter("A", { attributes: { olho: FIRST } }), { team: "party", pos: at("A"), gifts: ["shoulder"] }),
          makeUnit("E", "enemy", at("E")),
        ],
        seed,
      );
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: GIFTS.shoulder.id, target: unit(encounter, "E").pos });
      return { encounter, events };
    },
    ({ events }) => eventsOf(events, "slammed").length > 0,
  );
  assert.equal(eventsOf(events, "slammed")[0].into, "wall");
});

test("Segurar o Bote prende o passo de quem Xanduí segura, e o voto vale: antes de a luta abrir, ela não segura ninguém", () => {
  const scene = (seed: number) => {
    const { encounter } = setup(
      ["AE"],
      (at) => [
        unitFromCharacter(makeCharacter("A", { attributes: { olho: FIRST } }), { team: "party", pos: at("A"), style: { id: "ipojy", grade: 2 }, gifts: ["hold_the_lunge"] }),
        makeUnit("E", "enemy", at("E")),
      ],
      seed,
    );
    return encounter;
  };
  const closed = scene(1);
  assert.ok(findUnit(closed, "A")!.abilities.some((ability) => ability.id === GIFTS.hold_the_lunge.id));
  // Ninguém bateu ainda: o comando é recusado.
  assert.equal(applyCommand(closed, { type: "ability", unitId: "A", abilityId: GIFTS.hold_the_lunge.id, target: unit(closed, "E").pos }).ok, false);

  const held = seedWhere(
    (seed) => {
      const encounter = scene(seed);
      encounter.opened = true;
      const events = run(encounter, { type: "ability", unitId: "A", abilityId: GIFTS.hold_the_lunge.id, target: unit(encounter, "E").pos });
      return { encounter, events };
    },
    ({ events }) => eventsOf(events, "statusApplied").some((event) => event.statusId === "held"),
  );
  const foe = unit(held.encounter, "E");
  assert.equal(movementOf(foe), Math.max(0, foe.speed + STATUSES.held.speed));
});
