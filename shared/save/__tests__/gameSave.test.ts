import assert from "node:assert/strict";
import { test } from "node:test";
import { joinParty, leaveParty } from "../../party";
import { packStory, unpackStory } from "../../story/memory";
import type { Character } from "../../types/character";
import {
  SAVE_VERSION,
  brokenInArea,
  formatPlayTime,
  isDefeated,
  markBroken,
  markDefeated,
  newGame,
  parseSave,
  serializeSave,
  summarizeSave,
  type GameSave,
} from "../index";

function makeCharacter(): Character {
  return {
    id: "hero",
    name: "Herói",
    race: "humano",
    characterClass: "atracao_repulsao",
    level: 3,
    xp: 40,
    attributes: { forca: 5, fator: 5, vigor: 5, olho: 5, couro: 5, labia: 5, saber: 5 },
    currentHp: 22,
    maxHp: 30,
    inventory: { slots: [], maxSlots: 12 },
  };
}

function read(raw: unknown): GameSave {
  const parsed = parseSave(raw);
  assert.ok(parsed.ok, "o save deveria ser aceito");
  return parsed.save;
}

test("um save vai pra texto e volta igual", () => {
  const save = newGame(makeCharacter());
  save.location = { areaId: "ruinas", x: 120, y: 88 };
  markDefeated(save, "estrada:lobos");
  markBroken(save, ["ruinas:caixote-1"]);
  save.story = '{"flags":true}';
  save.playTimeMs = 90_000;
  save.savedAt = 1_700_000_000_000;
  joinParty(save.companions, "jarupa", 3);
  joinParty(save.companions, "xandui", 3);
  leaveParty(save.companions, "xandui");

  assert.deepEqual(read(serializeSave(save)), save);
});

test("jogo novo começa sem lugar, sem nada vencido e na versão atual", () => {
  const save = newGame(makeCharacter());
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.location, null);
  assert.deepEqual(save.defeated, []);
  assert.equal(save.story, null);
});

test("o que não é um save é recusado sem lançar", () => {
  const broken: unknown[] = [
    "{isto não é json",
    "null",
    "[]",
    "42",
    {},
    { version: "2", character: makeCharacter() },
    { version: SAVE_VERSION },
    { version: SAVE_VERSION, character: { ...makeCharacter(), characterClass: "bardo" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), race: "toString" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), level: "3" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), attributes: { forca: 5 } }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), breath: "cheio" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), mana: "cheia" }, story: null },
    { version: SAVE_VERSION, character: { ...makeCharacter(), engraved: ["puxão", 3] }, story: null },
    { version: SAVE_VERSION, character: makeCharacter(), story: 12 },
    // Versão sem caminho de migração.
    { version: 0, character: makeCharacter() },
  ];
  for (const raw of broken) {
    assert.deepEqual(parseSave(raw), { ok: false, problem: "invalid" }, JSON.stringify(raw));
  }
});

test("o Fôlego gasto vai no save, e a ficha de antes de ele existir abre sem ele (cheia)", () => {
  const spent = parseSave(serializeSave(newGame({ ...makeCharacter(), breath: 2 })));
  assert.equal(spent.ok && spent.save.character.breath, 2);

  const old = parseSave(serializeSave(newGame(makeCharacter())));
  assert.equal(old.ok && old.save.character.breath, undefined);
});

test("save de uma versão mais nova do jogo é recusado com o motivo", () => {
  const raw = { ...newGame(makeCharacter()), version: SAVE_VERSION + 1 };
  assert.deepEqual(parseSave(raw), { ok: false, problem: "newer" });
});

test("save da versão 1 é atualizado, com o que morava em chaves soltas", () => {
  const bare = read({ version: 1, character: makeCharacter() });
  assert.equal(bare.version, SAVE_VERSION);
  assert.equal(bare.location, null);
  assert.deepEqual(bare.defeated, []);
  assert.equal(bare.playTimeMs, 0);

  const full = read({
    version: 1,
    character: makeCharacter(),
    location: { areaId: "estrada", x: 40, y: 56 },
    defeated: ["estrada:lobos"],
    broken: ["estrada:barril-1"],
    story: "{}",
  });
  assert.deepEqual(full.location, { areaId: "estrada", x: 40, y: 56 });
  assert.ok(isDefeated(full, "estrada:lobos"));
  assert.deepEqual([...brokenInArea(full, "estrada")], ["barril-1"]);
  assert.equal(full.story, "{}");
});

test("pedaço mal formado do mundo não estraga o save: volta ao padrão", () => {
  const save = read({
    ...newGame(makeCharacter()),
    location: { areaId: "ruinas", x: "muito" },
    defeated: ["a:b", 7, "a:b", null],
    broken: "tudo",
    playTimeMs: -5,
    savedAt: "ontem",
  });
  assert.equal(save.location, null);
  assert.deepEqual(save.defeated, ["a:b"]);
  assert.deepEqual(save.broken, []);
  assert.equal(save.playTimeMs, 0);
  assert.equal(save.savedAt, 0);
});

test("vencidos e quebrados não se repetem, e os quebrados saem por área", () => {
  const save = newGame(makeCharacter());
  markDefeated(save, "estrada:lobos");
  markDefeated(save, "estrada:lobos");
  assert.deepEqual(save.defeated, ["estrada:lobos"]);
  assert.ok(!isDefeated(save, "ruinas:lobos"));

  markBroken(save, ["ruinas:caixote-1", "estrada:barril-1"]);
  markBroken(save, ["ruinas:caixote-1", "ruinas:barril-2"]);
  assert.deepEqual([...brokenInArea(save, "ruinas")].sort(), ["barril-2", "caixote-1"]);
  assert.deepEqual([...brokenInArea(save, "clareira")], []);
});

test("o resumo diz quem é, onde está e há quanto tempo joga", () => {
  const save = newGame(makeCharacter());
  assert.equal(summarizeSave(save).areaName, "—");

  save.location = { areaId: "ybytugua", x: 0, y: 0 };
  save.playTimeMs = 2 * 3_600_000 + 5 * 60_000 + 999;
  const summary = summarizeSave(save);
  assert.equal(summary.name, "Herói");
  assert.equal(summary.className, "Mago de atração e repulsão");
  assert.equal(summary.level, 3);
  assert.equal(summary.areaName, "Ybytuguá");
  assert.equal(summary.playTime, "2h 05min");

  assert.equal(formatPlayTime(0), "0min");
  assert.equal(formatPlayTime(47 * 60_000), "47min");
});

test("save da versão 2 ganha um grupo vazio, e companheiro com a ficha estragada fica de fora", () => {
  const { companions: _none, ...old } = newGame(makeCharacter());
  assert.deepEqual(read({ ...old, version: 2 }).companions, []);

  const save = newGame(makeCharacter());
  const jarupa = joinParty(save.companions, "jarupa", 1)!;
  const read2 = read({
    ...save,
    companions: [...save.companions, { character: { name: "Sem ficha" }, present: true }, { character: jarupa, present: true }, "nada"],
  });
  assert.deepEqual(read2.companions, [{ character: jarupa, present: true }]);
});

test("save da versão 4, do elenco do Eälen, vira o do elenco de agora: mesmo nível, mesma mochila, o que vestia guardado", () => {
  // Fichas como o save antigo as guardava: raças, Ordens e peças do Eälen que o jogo de hoje não tem.
  const halmira = {
    ...makeCharacter(),
    name: "Halmira",
    race: "miraven",
    characterClass: "guardiao",
    level: 3,
    xp: 40,
    breath: 1,
    equipment: { weapon: "gear-lamina-de-mergulho", armor: "gear-tunica-de-linho", accessory: "gear-rede-de-coleta" },
    gear: ["gear-gancho-de-coleta"],
  };
  const lish = { ...makeCharacter(), id: "companion:lish", name: "Lish", race: "kelbar", characterClass: "sombrilico", level: 3, equipment: { weapon: "gear-faca-larga" } };
  const gil = { ...makeCharacter(), id: "companion:gil", name: "Gil", race: "althirim", characterClass: "luminar", level: 2, inventory: undefined };
  const story = packStory(JSON.stringify({ flows: {} }), {
    journal: [],
    clock: null,
    afflictions: { "companion:lish": ["wounded_arm"], hero: ["wounded_arm"] },
  });
  const old = {
    ...newGame(halmira as unknown as Character),
    version: 4,
    companions: [
      { character: lish, present: true },
      { character: gil, present: false },
    ],
    story,
  };

  const save = read(old);
  const hero = save.character;
  assert.deepEqual([hero.id, hero.name, hero.race, hero.characterClass, hero.level, hero.xp], ["hero", "Endyru", "humano", "atracao_repulsao", 3, 40]);
  assert.equal(hero.currentHp, hero.maxHp);
  assert.equal(hero.breath, undefined);
  assert.deepEqual(hero.equipment, { weapon: "gear-bordao", armor: "gear-tunica-de-linho" });
  assert.deepEqual(hero.inventory, halmira.inventory);
  // O que cada um vestia foi pro guardado de quem leva a mochila.
  // A túnica, Endyru veste no mesmo lugar: fica no corpo, não vai pro guardado.
  assert.deepEqual(hero.gear, ["gear-gancho-de-coleta", "gear-faca-larga", "gear-lamina-de-mergulho", "gear-rede-de-coleta"]);

  assert.deepEqual(
    save.companions.map(({ character, present }) => [character.id, character.name, character.characterClass, character.level, present]),
    [
      ["companion:jarupa", "Jarupã", "espadachim", 3, true],
      ["companion:oryndu", "Oryndu", "espadachim", 2, false],
    ],
  );
  // O que a história pôs em Lish agora está em Jarupã; o resto da história fica como estava.
  const { memory } = unpackStory(save.story!);
  assert.deepEqual(memory.afflictions, { "companion:jarupa": ["wounded_arm"], hero: ["wounded_arm"] });
});

test("save da versão 5 troca as runas do Eälen pelos atributos do mundo, na ficha e no item que soma um", () => {
  const runes = { dain: 1, eir: 2, nath: 3, il: 4, or: 5, len: 6, ul: 7 };
  const tonic = {
    slotIndex: 0,
    quantity: 1,
    item: {
      id: "item-tonico",
      name: "Tônico",
      category: "consumable",
      data: { effect: { kind: "buff_stat", stat: "len", bonus: 2, durationTurns: 3 }, usesRemaining: 1, maxUses: 1 },
    },
  };
  const hero = { ...makeCharacter(), attributes: runes, inventory: { slots: [tonic], maxSlots: 12 } };
  const jarupa = { ...makeCharacter(), id: "companion:jarupa", attributes: runes };
  const save = read({ ...newGame(makeCharacter()), version: 5, character: hero, companions: [{ character: jarupa, present: true }] });

  const named = { forca: 1, fator: 2, vigor: 3, olho: 4, couro: 5, labia: 6, saber: 7 };
  assert.deepEqual(save.character.attributes, named);
  assert.deepEqual(save.companions[0].character.attributes, named);
  const [slot] = save.character.inventory!.slots;
  assert.deepEqual(slot.item.data.effect, { kind: "buff_stat", stat: "labia", bonus: 2, durationTurns: 3 });
});

test("save da versão 6 troca os ids do Eälen dos dois itens do jogo pelos de agora, na mochila de quem os tinha", () => {
  const slot = (slotIndex: number, id: string) => ({
    slotIndex,
    quantity: 2,
    item: { id, name: "x", category: "consumable", data: { effect: { kind: "heal_hp", amount: 1 }, usesRemaining: 1, maxUses: 1 } },
  });
  const slots = [slot(0, "item-lagrima-de-eir"), slot(1, "item-pao-de-cinza"), slot(2, "item-outro")];
  const hero = { ...makeCharacter(), inventory: { slots, maxSlots: 12 } };
  const save = read({ ...newGame(makeCharacter()), version: 6, character: hero });

  assert.deepEqual(
    save.character.inventory!.slots.map((each) => [each.item.id, each.quantity]),
    [["item-unguento-de-barqueiro", 2], ["item-pao-de-viagem", 2], ["item-outro", 2]],
  );
});
