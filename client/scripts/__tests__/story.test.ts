import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AREAS,
  StoryRunner,
  aftermath,
  cueEnding,
  parseTiledMap,
  clockThreshold,
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
    attributes: { forca: attribute, fator: attribute, vigor: attribute, olho: attribute, couro: attribute, labia: attribute, saber: attribute },
    currentHp: 30,
    maxHp: 30,
    currentNodeId: "",
  };
  return { character, companions: [], rng: { rngState: seed }, isDefeated: () => seed % 2 === 0 };
}

/** O que o trecho de uma deixa que NÃO encerra a luta não pode fazer: mexer na ficha ou no grupo. */
const MID_FIGHT_FORBIDDEN: ReadonlySet<string> = new Set(["item", "itemTaken", "coins", "xp", "joined", "left", "mageRose"]);

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
          partyCondition(name, []) ?? clockThreshold(name) ?? runner.flag(name),
          undefined,
          `${area}: um objeto depende de "${name}", que não é variável da história (VAR), companheiro (party:chave) nem ponto do relógio (clock:N)`,
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

test("o caminho inteiro: do pedágio ao fim, cada ato abre o seguinte, e a bolsa, o grupo e o nível de mago andam junto", () => {
  const host = makeHost(5, 3);
  host.character.characterClass = "atracao_repulsao";
  host.character.mageLevel = 3;
  let runner = new StoryRunner(story, host);
  /** Abre `knot` e vai escolhendo, em ordem, as escolhas cujo texto começa com cada pedaço de `picks`. */
  const play = (knot: string, ...picks: string[]) => {
    let step = runner.start(knot);
    const steps = [step];
    for (const pick of picks) {
      const choice = step.choices.find((candidate) => candidate.text.startsWith(pick));
      assert.ok(choice, `"${knot}" não oferece "${pick}" (oferece: ${step.choices.map((c) => c.text).join(" | ")})`);
      step = runner.choose(choice.index);
      steps.push(step);
    }
    assert.deepEqual(step.choices, [], `"${knot}" não terminou depois de ${picks.join(", ")}`);
    return aftermath(steps);
  };
  const present = () => host.companions.filter((member) => member.present).map((member) => member.character.name).sort();

  // Abertura: o barco na corrente. Paga a cabeça, e o grupo da descida está todo no barco.
  play("abertura", "Pagar a sua cabeça");
  assert.equal(runner.flag("pedagio_resolvido"), true);
  assert.deepEqual(host.character.purse, { cobre: 6 });
  assert.deepEqual(present(), ["Jarupã", "Oryndu", "Xanduí"]);
  assert.deepEqual(play("barco_ymonha", "Descer"), { travel: { area: "ybytugua", spawn: "cais" } });

  // Ato 1: a escolta acaba no cais, e o trio se forma na Mesa.
  play("chegada_ybytugua");
  assert.deepEqual(present(), ["Oryndu"]);
  play("conselheira", "Aceitar");
  assert.equal(runner.flag("contrato"), true);
  assert.deepEqual(present(), ["Jarupã", "Oryndu", "Xanduí"]);
  assert.equal(runner.clock()?.label, "Cheia");
  assert.equal(host.character.purse?.prata, 2);

  // O ferreiro tempera as duas espadas com a prata do adiantamento.
  play("ferreiro", "Pagar dois de prata");
  assert.equal(runner.flag("temperadas"), true);
  assert.equal(host.character.purse?.prata, 0);

  // A primeira ida não se vence: a deixa da rodada 3 encerra a luta e abre o ato 2.
  assert.deepEqual(play("primeira_ida", "Entrar na água"), { fight: "primeira" });
  play("primeira_oryndu");
  assert.equal(runner.flag("ato2"), true);

  // Ato 2: a margem (o Círculo), a leitura na floresta, o papel, o castelão e o livro.
  play("margem");
  assert.equal(host.character.mageLevel, 4);
  assert.deepEqual(play("leitura_na_margem", "Ir pra cima"), { fight: "recitador" });
  play("recitador_caiu");
  assert.equal(runner.flag("papel_do_recitador"), true);
  assert.deepEqual(play("castelao", "Pedir o livro"), { fight: "castelo" });
  play("castelao_caiu");
  assert.equal(runner.flag("prova"), true);

  // Ato 3: o conselho chama, a cheia, e o fim.
  play("conselheira");
  assert.equal(runner.flag("ato3"), true);
  assert.deepEqual(play("a_cheia", "Entrar na água"), { fight: "final" });
  assert.deepEqual(play("final_fim"), { travel: { area: "ybytugua", spawn: "depois" } });
  assert.equal(runner.flag("ykurua_morto"), true);
  assert.deepEqual(present(), ["Jarupã", "Xanduí"]);

  runner = new StoryRunner(story, host, runner.save());
  play("fim");
  assert.equal(runner.clock(), null);
  assert.equal(host.character.purse?.prata, 4, "seis da pilha dele, menos duas pra parte de quem fica");
});
