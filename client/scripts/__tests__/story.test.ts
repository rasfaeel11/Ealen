import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AREAS,
  StoryRunner,
  aftermath,
  cueEnding,
  parseTiledMap,
  partyCondition,
  type Character,
  type DialogueStep,
  type StoryHost,
} from "@ealen/shared";
import { compileStory } from "../compileStory";

/**
 * A rede de segurança de quem escreve: a história DE VERDADE (client/story)
 * compila; tudo que os mapas abrem nela (`npc`, inimigo que fala, queda de
 * grupo, gatilho, deixa de luta) é um trecho que existe; toda condição de mapa é uma
 * variável declarada; e todo trecho pode ser percorrido até o fim por
 * qualquer caminho — passando e falhando nos testes — sem estourar (item que
 * não existe, atributo errado, trecho que não leva a lugar nenhum) e sem
 * pedir ao jogo uma luta ou uma viagem que o mapa não tem.
 */
const PUBLIC_DIR = new URL("../../public/", import.meta.url);
const story = compileStory();

const maps = Object.fromEntries(
  Object.values(AREAS).map((area) => [
    area.id,
    parseTiledMap(JSON.parse(readFileSync(new URL(area.map, PUBLIC_DIR), "utf8"))),
  ]),
);

/** Tudo no mapa que abre um trecho da história: com quem se fala, os gatilhos, a queda de um grupo e as deixas de uma luta. */
interface Opening {
  area: string;
  /** Quem abre, pra mensagem de erro. */
  name: string;
  dialog: string;
  /** Abre no MEIO de uma luta que continua depois dele (uma deixa que não a encerra). */
  midFight?: boolean;
}

const openings: Opening[] = Object.entries(maps).flatMap(([area, map]) => [
  ...map.npcs.map((npc) => ({ area, name: npc.name, dialog: npc.dialog })),
  ...map.enemies.flatMap((enemy) => [
    ...(enemy.dialog !== undefined ? [{ area, name: enemy.name, dialog: enemy.dialog }] : []),
    ...(enemy.onDefeat !== undefined ? [{ area, name: `a queda de ${enemy.group}`, dialog: enemy.onDefeat }] : []),
  ]),
  ...map.triggers.map((trigger) => ({ area, name: `o gatilho ${trigger.id}`, dialog: trigger.dialog })),
  ...map.cues.flatMap((cue) =>
    cue.dialog !== undefined
      ? [{ area, name: `a deixa ${cue.id} da luta com ${cue.group}`, dialog: cue.dialog, midFight: cueEnding(cue) === undefined }]
      : [],
  ),
]);

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
  return { character, companions: [], rng: { rngState: seed }, isDefeated: () => seed % 2 === 0 };
}

/** O que o trecho de uma deixa que NÃO encerra a luta não pode fazer: mexer na ficha ou no grupo. */
const MID_FIGHT_FORBIDDEN: ReadonlySet<string> = new Set(["item", "itemTaken", "xp", "joined", "left"]);

/** Quantas escolhas seguidas uma conversa aguenta antes de ser considerada um laço sem saída. */
const MAX_DEPTH = 6;

/**
 * Percorre todas as escolhas de uma conversa, em profundidade, e devolve
 * quantos fins encontrou. Cada ramo é jogado de novo desde o começo, numa
 * história zerada, pra um caminho não gastar as escolhas do outro.
 */
function crawl(knot: string, host: () => StoryHost, seen: (steps: DialogueStep[]) => void, path: number[] = []): number {
  const runner = new StoryRunner(story, host());
  const steps: DialogueStep[] = [runner.start(knot)];
  for (const index of path) steps.push(runner.choose(index));
  const step = steps.at(-1)!;

  if (step.choices.length === 0) {
    seen(steps);
    return 1;
  }
  if (path.length >= MAX_DEPTH) return 0;

  let endings = 0;
  for (const choice of step.choices) endings += crawl(knot, host, seen, [...path, choice.index]);
  return endings;
}

test("a história compila, e tudo que o mapa abre nela é um trecho que existe", () => {
  const runner = new StoryRunner(story, makeHost(5, 1));
  assert.ok(openings.length > 0, "nenhum mapa abre trecho nenhum");
  for (const opening of openings) {
    assert.ok(runner.hasKnot(opening.dialog), `${opening.area}: ${opening.name} abre o trecho "${opening.dialog}", que não existe`);
  }
});

test("toda condição (`if`/`unless`) de um objeto do mapa é uma variável que a história declara", () => {
  const runner = new StoryRunner(story, makeHost(5, 1));
  for (const [area, map] of Object.entries(maps)) {
    for (const object of [...map.npcs, ...map.enemies, ...map.triggers, ...map.exits, ...map.cues]) {
      for (const name of [object.if, object.unless]) {
        if (name === undefined) continue;
        assert.notEqual(
          partyCondition(name, []) ?? runner.flag(name),
          undefined,
          `${area}: um objeto depende de "${name}", que não é variável da história (VAR) nem companheiro (party:chave)`,
        );
      }
    }
  }
});

for (const opening of openings) {
  test(`${opening.area}: o trecho "${opening.dialog}" (${opening.name}) chega ao fim por todos os caminhos, e o que ele pede ao jogo existe`, () => {
    const map = maps[opening.area];
    const check = (steps: DialogueStep[]) => {
      const { fight, travel } = aftermath(steps);
      if (fight !== undefined) {
        assert.ok(
          map.enemies.some((enemy) => enemy.group === fight),
          `"${opening.dialog}" começa uma luta com "${fight}", grupo que não existe em ${opening.area}`,
        );
      }
      if (travel) {
        assert.ok(
          maps[travel.area]?.spawns[travel.spawn],
          `"${opening.dialog}" leva a "${travel.area}"/"${travel.spawn}", ponto de chegada que não existe`,
        );
      }
      if (!opening.midFight) return;
      // A luta segue depois deste trecho e ainda pode ser perdida: aí a história volta atrás, e a ficha não.
      for (const beat of steps.flatMap((step) => step.beats)) {
        if (beat.kind !== "event") continue;
        assert.ok(
          !MID_FIGHT_FORBIDDEN.has(beat.event.type),
          `"${opening.dialog}" abre no meio de uma luta que continua, e não pode dar nem tirar nada nem mexer no grupo (${beat.event.type})`,
        );
      }
    };
    for (const attribute of [100, -100]) {
      for (const seed of [2, 5]) {
        const endings = crawl(opening.dialog, () => makeHost(attribute, seed), check);
        assert.ok(endings > 0, `"${opening.dialog}" não termina nunca`);
      }
    }
  });
}

test("o que a conversa deixa salvo abre de novo, e a segunda visita também chega ao fim", () => {
  for (const opening of openings) {
    const host = makeHost(100, 2);
    const first = new StoryRunner(story, host);
    let step = first.start(opening.dialog);
    for (let turn = 0; turn < MAX_DEPTH && step.choices.length > 0; turn++) step = first.choose(step.choices[0].index);

    const second = new StoryRunner(story, host, first.save());
    step = second.start(opening.dialog);
    for (let turn = 0; turn < 40 && step.choices.length > 0; turn++) step = second.choose(step.choices.at(-1)!.index);
    assert.deepEqual(step.choices, [], `a segunda visita a "${opening.dialog}" não termina pela última escolha`);
  }
});

test("a história é compilada lembrando todo trecho lido: é o que gasta um gatilho de uma vez só", () => {
  const once = openings.find((opening) => maps[opening.area].triggers.some((trigger) => trigger.once && trigger.dialog === opening.dialog));
  assert.ok(once, "nenhum mapa tem um gatilho de uma vez só pra conferir");
  const runner = new StoryRunner(story, makeHost(5, 1));
  assert.equal(runner.visited(once.dialog), false);
  runner.start(once.dialog);
  assert.equal(runner.visited(once.dialog), true);
});
