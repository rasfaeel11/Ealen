import { samePos, tileIndex, type Grid, type Pos, type Tile } from "./grid";
import type { SurfaceId } from "./surfaces";
import type { Encounter } from "./types";

/**
 * Destrutíveis: coisas postas em cima do chão que barram o passo até alguém
 * quebrá-las — um caixote atrás do qual se esconde, um barril que derrama
 * fogo quando arrebenta.
 *
 * Um destrutível de pé é TERRENO: `standProp` escreve na grade o que ele
 * barra, e `fellProp` devolve o chão que havia embaixo. Por isso movimento,
 * linha de visão e cobertura não precisam saber que ele existe. Qualquer
 * habilidade que cause dano pode mirá-lo; objeto não se esquiva nem tem
 * armadura, então o golpe sempre pega e o dano entra inteiro.
 *
 * Como o resto, é só dados: destrutível novo é uma linha em `PROPS`.
 */
export interface PropTemplate {
  id: string;
  name: string;
  hp: number;
  /** Tapa a visão enquanto está de pé. */
  blocksSight?: boolean;
  /** Dá cobertura a quem se encosta nele (ver ./attack.ts). */
  cover?: boolean;
  /** Ao quebrar, deixa esta superfície no próprio quadrado e em volta dele. */
  spill?: { surface: SurfaceId; rounds: number; radius: number };
}

export const PROPS = {
  crate: { id: "crate", name: "Caixote", hp: 8, cover: true },
  barrel: { id: "barrel", name: "Barril de óleo", hp: 4, spill: { surface: "fire", rounds: 2, radius: 1 } },
} satisfies Record<string, PropTemplate>;

export type PropId = keyof typeof PROPS;

export function isPropId(kind: unknown): kind is PropId {
  return typeof kind === "string" && kind in PROPS;
}

/** Um destrutível num quadrado. Quebrado, fica na lista com 0 de vida — como os mortos em `Encounter.units`. */
export interface Prop {
  id: string;
  kind: PropId;
  pos: Pos;
  hp: number;
  /** O chão que havia no quadrado antes dele, pra devolver quando quebrar. */
  under: Tile;
}

/** Põe um destrutível de pé em `pos`: a grade passa a tratá-lo como obstáculo. Muta `grid`. */
export function standProp(grid: Grid, id: string, kind: PropId, pos: Pos): Prop {
  const template: PropTemplate = PROPS[kind];
  const index = tileIndex(grid, pos);
  const under = grid.tiles[index];
  grid.tiles[index] = {
    ...under,
    blocksMove: true,
    blocksSight: under.blocksSight || template.blocksSight === true,
    cover: under.cover || template.cover === true,
  };
  return { id, kind, pos: { ...pos }, hp: template.hp, under };
}

/** Tira da grade um destrutível quebrado: o quadrado volta a ser o chão que era. Muta `grid`. */
export function fellProp(grid: Grid, prop: Prop): void {
  grid.tiles[tileIndex(grid, prop.pos)] = prop.under;
}

/** O destrutível de pé neste quadrado, se houver. */
export function propAt(encounter: Encounter, pos: Pos): Prop | undefined {
  return encounter.props.find((prop) => prop.hp > 0 && samePos(prop.pos, pos));
}
