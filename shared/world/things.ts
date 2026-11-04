import { distance, tileAt, type Pos } from "../tactics/grid";
import { rollDice, type RngHolder } from "../tactics/rng";
import type { AreaMap, AreaThing } from "./tiledMap";

/**
 * As coisas do mundo fora de luta: o baú, a porta, a alavanca, a armadilha e
 * o que está no chão pra pegar. Vêm do Tiled (os objetos `chest`, `door`,
 * `lever`, `trap` e `pickup`, ver ./tiledMap.ts) e mudam de estado uma vez só:
 * o baú aberto fica aberto, a porta destrancada fica aberta, a alavanca puxada
 * fica puxada, a armadilha que disparou (ou se desarmou) não dispara mais, e o
 * que se pegou não volta. Esse "já foi" mora no save, como "área:id" (ver
 * `things` em ../save/gameSave.ts); aqui só a regra, pura.
 *
 * - O BAÚ e a ALAVANCA ocupam o quadrado; a PORTA também, enquanto fechada. O
 *   que está no chão e a armadilha, não.
 * - Mexe-se no que está colado no personagem (`thingInReach`). Trancado
 *   (`key`, o id de um item-chave), só abre com a chave na mochila, e a chave
 *   fica. A porta sem chave que uma alavanca abre (`opens` na alavanca) não
 *   abre na mão.
 * - A ARMADILHA fica escondida até alguém do grupo passar perto e ter Olho pra
 *   vê-la: 10 + o maior Olho do grupo contra o `spot` dela (sem dado: é o olho
 *   treinado, não a sorte). Vista, aparece e dá pra contorná-la ou desarmá-la
 *   (10 + o maior Fator contra o mesmo número; errando, ela dispara). Quem
 *   pisa nela sem ver leva o dano dela.
 */

/** De quantos quadrados uma armadilha escondida pode ser vista. */
export const TRAP_SIGHT = 2;

/** O que já foi feito nas coisas de uma área: os ids. */
export type ThingsDone = ReadonlySet<string>;

/** Esta coisa ocupa o quadrado (ninguém pisa, ninguém luta em cima)? */
export function thingBlocks(thing: AreaThing, done: ThingsDone): boolean {
  if (thing.kind === "chest" || thing.kind === "lever") return true;
  if (thing.kind === "door") return !done.has(thing.id);
  return false;
}

/**
 * Faz das coisas que ocupam o quadrado obstáculos na grade da área, como
 * standPeople faz com a gente de pé. Chamar de novo troca a lista inteira (a
 * porta que abriu devolve o chão). Muta `map.grid`.
 */
export function standThings(map: AreaMap, things: readonly AreaThing[], done: ThingsDone): void {
  for (const { pos, blocksMove } of (map.closed ?? []).reverse()) tileAt(map.grid, pos)!.blocksMove = blocksMove;
  map.closed = [];
  for (const thing of things) {
    if (!thingBlocks(thing, done)) continue;
    const tile = tileAt(map.grid, thing.tile);
    if (!tile) continue;
    map.closed.push({ pos: { ...thing.tile }, blocksMove: tile.blocksMove });
    tile.blocksMove = true;
  }
}

/** Dá pra mexer nisto agora? O que já foi feito não se refaz; a armadilha só depois de vista. */
function usable(thing: AreaThing, done: ThingsDone, seen: ThingsDone): boolean {
  if (done.has(thing.id)) return false;
  return thing.kind !== "trap" || seen.has(thing.id);
}

/** A coisa em que o personagem, em `tile`, mexe agora: a colada nele (ou embaixo dele), a mais perto. */
export function thingInReach(things: readonly AreaThing[], tile: Pos, done: ThingsDone, seen: ThingsDone = new Set()): AreaThing | undefined {
  return things
    .filter((thing) => usable(thing, done, seen) && distance(thing.tile, tile) <= 1)
    .sort((a, b) => distance(a.tile, tile) - distance(b.tile, tile))[0];
}

export type ThingOutcome =
  /** Abriu (baú) ou pegou (do chão): o que veio. Quem chama põe na mochila e na bolsa. */
  | { kind: "loot"; loot: { item: string; count: number }[]; coins: number }
  /** Trancado: falta a chave `key`. */
  | { kind: "locked"; key: string }
  /** A porta abriu. */
  | { kind: "opened" }
  /** A porta não abre na mão: é de alavanca. */
  | { kind: "stuck" }
  /** A alavanca foi puxada: as portas que ela abre, pelos ids. */
  | { kind: "pulled"; opens: string[] }
  /** A armadilha vista foi desarmada, ou disparou na mão de quem tentou. */
  | { kind: "disarmed" }
  | { kind: "sprung"; damage: number };

/** O que dá pra saber do grupo pra mexer nas coisas: as chaves que ele tem e os melhores atributos. */
export interface ThingHands {
  hasItem: (itemId: string) => boolean;
  /** O maior Fator do grupo (desarmar). */
  fator: number;
}

/**
 * Mexe em `thing`. Não muta nada: diz o que aconteceu, e quem chama anota no
 * save que ela já foi (menos quando está trancada ou é de alavanca), entrega o
 * que veio e abre as portas da alavanca. `things` são as da área (a alavanca
 * acha as portas pelo Nome).
 */
export function useThing(thing: AreaThing, things: readonly AreaThing[], hands: ThingHands, rng: RngHolder): ThingOutcome {
  switch (thing.kind) {
    case "chest":
    case "pickup":
      if (thing.key && !hands.hasItem(thing.key)) return { kind: "locked", key: thing.key };
      return { kind: "loot", loot: thing.loot ?? [], coins: thing.coins ?? 0 };
    case "door":
      if (thing.key) return hands.hasItem(thing.key) ? { kind: "opened" } : { kind: "locked", key: thing.key };
      return things.some((other) => other.kind === "lever" && other.opens?.includes(thing.name)) ? { kind: "stuck" } : { kind: "opened" };
    case "lever":
      return {
        kind: "pulled",
        opens: things.filter((other) => other.kind === "door" && thing.opens?.includes(other.name)).map((door) => door.id),
      };
    case "trap":
      return 10 + hands.fator >= (thing.spot ?? 10) ? { kind: "disarmed" } : { kind: "sprung", damage: trapDamage(thing, rng) };
  }
}

function trapDamage(thing: AreaThing, rng: RngHolder): number {
  return thing.damage ? rollDice(rng, thing.damage) : 0;
}

/**
 * As armadilhas que o grupo, com o personagem em `tile` e o melhor Olho dele
 * `olho`, vê agora: as escondidas a até TRAP_SIGHT dele cujo `spot` o olho
 * alcança. Quem chama as anota como vistas.
 */
export function spotTraps(things: readonly AreaThing[], tile: Pos, olho: number, done: ThingsDone, seen: ThingsDone): AreaThing[] {
  return things.filter(
    (thing) =>
      thing.kind === "trap" &&
      !done.has(thing.id) &&
      !seen.has(thing.id) &&
      distance(thing.tile, tile) <= TRAP_SIGHT &&
      10 + olho >= (thing.spot ?? 10),
  );
}

/** A armadilha que dispara com o personagem pisando em `tile`, se alguma: a que ainda não foi (vista ou não). */
export function trapUnder(things: readonly AreaThing[], tile: Pos, done: ThingsDone): AreaThing | undefined {
  return things.find((thing) => thing.kind === "trap" && !done.has(thing.id) && thing.tile.x === tile.x && thing.tile.y === tile.y);
}

/** O dano de quem pisa na armadilha. */
export function springTrap(thing: AreaThing, rng: RngHolder): number {
  return trapDamage(thing, rng);
}

