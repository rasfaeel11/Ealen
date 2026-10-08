import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AREAS, StoryRunner, parseTiledMap, type Character, type DialogueStep, type StoryHost } from "@ealen/shared";
import { compileStory } from "../compileStory";

/**
 * A rede de segurança de quem escreve: a história DE VERDADE (client/story)
 * compila, todo `npc` dos mapas aponta pra um trecho que existe, e toda
 * conversa pode ser percorrida até o fim por qualquer caminho — passando e
 * falhando nos testes — sem estourar (item que não existe, atributo errado,
 * trecho que não leva a lugar nenhum).
 */
const PUBLIC_DIR = new URL("../../public/", import.meta.url);
const story = compileStory();

const npcs = Object.values(AREAS).flatMap((area) => {
  const map = parseTiledMap(JSON.parse(readFileSync(new URL(area.map, PUBLIC_DIR), "utf8")));
  return map.npcs.map((npc) => ({ area: area.id, ...npc }));
});

/** `attribute` em todos os atributos: 100 passa em qualquer teste, -100 falha em todos (menos no 1 e no 20 naturais). */
function makeHost(attribute: number, seed: number): StoryHost {
  const character: Character = {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass: "luminar",
    level: 1,
    xp: 0,
    attributes: { dain: attribute, eir: attribute, nath: attribute, il: attribute, or: attribute, len: attribute, ul: attribute },
    currentHp: 30,
    maxHp: 30,
    currentNodeId: "",
  };
  return { character, rng: { rngState: seed }, isDefeated: () => seed % 2 === 0 };
}

/** Quantas escolhas seguidas uma conversa aguenta antes de ser considerada um laço sem saída. */
const MAX_DEPTH = 6;

/**
 * Percorre todas as escolhas de uma conversa, em profundidade, e devolve
 * quantos fins encontrou. Cada ramo é jogado de novo desde o começo, numa
 * história zerada, pra um caminho não gastar as escolhas do outro.
 */
function crawl(knot: string, host: () => StoryHost, path: number[] = []): number {
  const runner = new StoryRunner(story, host());
  let step: DialogueStep = runner.start(knot);
  for (const index of path) step = runner.choose(index);

  if (step.choices.length === 0) return 1;
  if (path.length >= MAX_DEPTH) return 0;

  let endings = 0;
  for (const choice of step.choices) endings += crawl(knot, host, [...path, choice.index]);
  return endings;
}

test("a história compila e todo npc dos mapas abre um trecho que existe", () => {
  const runner = new StoryRunner(story, makeHost(5, 1));
  assert.ok(npcs.length > 0, "nenhum mapa tem com quem falar");
  for (const npc of npcs) {
    assert.ok(runner.hasKnot(npc.dialog), `${npc.area}: "${npc.name}" abre o trecho "${npc.dialog}", que não existe`);
  }
});

for (const npc of npcs) {
  test(`${npc.area}: a conversa de "${npc.name}" chega ao fim por todos os caminhos, passando ou falhando nos testes`, () => {
    for (const attribute of [100, -100]) {
      for (const seed of [2, 5]) {
        const endings = crawl(npc.dialog, () => makeHost(attribute, seed));
        assert.ok(endings > 0, `"${npc.dialog}" não termina nunca`);
      }
    }
  });
}

test("o que a conversa deixa salvo abre de novo, e a segunda visita também chega ao fim", () => {
  for (const npc of npcs) {
    const host = makeHost(100, 2);
    const first = new StoryRunner(story, host);
    let step = first.start(npc.dialog);
    for (let turn = 0; turn < MAX_DEPTH && step.choices.length > 0; turn++) step = first.choose(step.choices[0].index);

    const second = new StoryRunner(story, host, first.save());
    step = second.start(npc.dialog);
    for (let turn = 0; turn < 40 && step.choices.length > 0; turn++) step = second.choose(step.choices.at(-1)!.index);
    assert.deepEqual(step.choices, [], `a segunda visita a "${npc.dialog}" não termina pela última escolha`);
  }
});
