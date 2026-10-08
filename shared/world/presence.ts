import { tileAt, type Pos } from "../tactics/grid";
import {
  tileOfPixel,
  triggersAt,
  type AreaCondition,
  type AreaEnemy,
  type AreaMap,
  type AreaNpc,
  type AreaTrigger,
  type PixelPos,
} from "./tiledMap";

/**
 * Quem (e o quê) está no mapa AGORA.
 *
 * O mapa do Tiled diz tudo que pode existir numa área; a história diz o que
 * existe neste momento, pelas variáveis dela: um `npc`, `enemy`, `trigger`
 * ou `exit` com `if`/`unless` só vale enquanto a condição bater. É assim que
 * alguém aparece depois de uma conversa, um grupo some sem luta, um gatilho
 * se arma e uma saída se destranca — sem lista nenhuma fora do texto.
 *
 * Nada aqui guarda estado: pergunta-se de novo sempre que a história anda.
 */

/** Lê uma variável da história (StoryRunner.flag). */
export type FlagReader = (name: string) => unknown;

/** Vale agora? Variável que a história não declara conta como falsa. */
export function isActive(condition: AreaCondition, flag: FlagReader): boolean {
  if (condition.if !== undefined && !flag(condition.if)) return false;
  if (condition.unless !== undefined && flag(condition.unless)) return false;
  return true;
}

/** Alguém com quem se fala: um `npc`, ou um inimigo `passive` com `dialog`. */
export interface Talker extends PixelPos {
  id: string;
  name: string;
  dialog: string;
  /** Está de pé no quadrado (tem corpo), ou é só um ponto pra examinar? */
  stands: boolean;
}

/**
 * Com quem dá pra falar agora: os `npc` presentes e os inimigos de pé que
 * têm o que dizer. `npcs` e `enemies` já filtrados por quem está no mapa.
 */
export function talkers(npcs: readonly AreaNpc[], enemies: readonly AreaEnemy[]): Talker[] {
  return [
    ...npcs.map((npc) => ({ id: npc.id, name: npc.name, dialog: npc.dialog, stands: npc.look !== undefined, x: npc.x, y: npc.y })),
    ...enemies.flatMap((enemy) =>
      enemy.passive && enemy.dialog !== undefined
        ? [{ id: enemy.id, name: enemy.name, dialog: enemy.dialog, stands: true, x: enemy.x, y: enemy.y }]
        : [],
    ),
  ];
}

/**
 * Os quadrados que a gente de pé ocupa: `npc` com cara e inimigo `passive`
 * (o hostil não: chegar perto dele já é a luta). `npcs` e `enemies` já
 * filtrados por quem está no mapa.
 */
export function peopleTiles(map: AreaMap, npcs: readonly AreaNpc[], enemies: readonly AreaEnemy[]): Pos[] {
  return [
    ...npcs.filter((npc) => npc.look !== undefined),
    ...enemies.filter((enemy) => enemy.passive),
  ].map((person) => tileOfPixel(map, person));
}

/**
 * Faz de `tiles` os quadrados ocupados por gente de pé, na grade da área:
 * ninguém anda nem luta por cima deles. Chamar de novo troca a lista inteira
 * — quem saiu devolve o chão que havia embaixo. Muta `map.grid`.
 */
export function standPeople(map: AreaMap, tiles: readonly Pos[]): void {
  for (const { pos, blocksMove } of map.occupied.reverse()) tileAt(map.grid, pos)!.blocksMove = blocksMove;
  map.occupied = [];

  for (const pos of tiles) {
    const tile = tileAt(map.grid, pos);
    if (!tile) continue;
    map.occupied.push({ pos: { ...pos }, blocksMove: tile.blocksMove });
    tile.blocksMove = true;
  }
}

/**
 * O gatilho que dispara com o personagem em `pos`, se algum. Um gatilho
 * dispara ao ENTRAR nele: `inside` são os ids daqueles em que o personagem
 * já estava (e é atualizado aqui), pra ficar parado dentro de um não o
 * disparar de novo. `seen` diz se um trecho da história já foi lido — é o
 * que gasta um gatilho de uma vez só.
 *
 * Um por vez: com dois prontos no mesmo lugar, o segundo sai na chamada
 * seguinte. E um gatilho desarmado (`if`/`unless`) não conta como "já estava
 * dentro": armado com o personagem em cima, dispara.
 */
export function firedTrigger(
  map: AreaMap,
  pos: PixelPos,
  inside: Set<string>,
  flag: FlagReader,
  seen: (knot: string) => boolean,
): AreaTrigger | undefined {
  const here = triggersAt(map, pos).filter((trigger) => isActive(trigger, flag));
  const ready = here.filter((trigger) => !inside.has(trigger.id) && !(trigger.once && seen(trigger.dialog)));
  const [fired, ...waiting] = ready;

  inside.clear();
  for (const trigger of here) if (!waiting.includes(trigger)) inside.add(trigger.id);
  return fired;
}
