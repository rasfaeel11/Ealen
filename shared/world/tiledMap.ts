import type { Grid, Pos, Tile } from "../tactics/grid";

/**
 * Lê um mapa do Tiled (.tmj) e tira dele o que é REGRA: onde dá pra pisar,
 * onde se nasce, por onde se sai. Desenhar o mapa é assunto do client; aqui
 * o JSON entra e sai dado puro.
 *
 * O contrato com quem desenha o mapa:
 *
 * - Camadas de tiles: quantas quiser. O terreno de um quadrado é a soma de
 *   todos os tiles empilhados nele. O NOME da camada só importa pro desenho
 *   (prefixos `sorted` e `above`, ver WorldScene no client). Um tile mais
 *   alto que o quadrado (uma árvore de 16x32) ocupa só o quadrado da base.
 * - Propriedades de tile, definidas NO TILESET (não no mapa):
 *     `blocksMove` (bool)  ninguém pisa
 *     `blocksSight` (bool) não se enxerga através
 *     `moveCost` (int)     custo de entrar em combate; padrão 1
 *   Assim, pintar uma árvore já faz dela um obstáculo — não existe camada
 *   de colisão separada pra esquecer de atualizar.
 * - Camada de objetos, com o campo "Class"/"Type" de cada objeto dizendo o
 *   que ele é:
 *     `spawn`  ponto; o Nome é o id do ponto de chegada
 *     `exit`   retângulo; propriedades `area` (id da área de destino) e
 *              `spawn` (ponto de chegada lá)
 *
 * Limites do formato: mapa ortogonal, finito, camadas sem compressão
 * (Tile Layer Format = CSV) e tileset embutido no mapa — o Phaser não lê
 * tileset externo (.tsx).
 */

export interface PixelPos {
  x: number;
  y: number;
}

export interface AreaExit {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Id da área de destino. */
  area: string;
  /** Ponto de chegada na área de destino. */
  spawn: string;
}

export interface AreaMap {
  /** Lado de um quadrado, em pixels do mapa. */
  tileSize: number;
  /** O terreno — a mesma grade que o combate usa. */
  grid: Grid;
  spawns: Record<string, PixelPos>;
  exits: AreaExit[];
}

interface TiledProperty {
  name: string;
  value: unknown;
}

interface TiledObject {
  name?: string;
  type?: string;
  /** Tiled 1.9 chamava o campo "type" de "class". */
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

interface TiledLayer {
  type: string;
  data?: unknown;
  objects?: TiledObject[];
  layers?: TiledLayer[];
}

interface TiledTileset {
  firstgid: number;
  source?: string;
  tiles?: { id: number; properties?: TiledProperty[] }[];
}

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation?: string;
  infinite?: boolean;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

/** Os três bits altos do gid guardam espelhamento/rotação do tile, não qual tile é. */
const GID_MASK = 0x1fffffff;

function propertiesOf(source: { properties?: TiledProperty[] }): Record<string, unknown> {
  return Object.fromEntries((source.properties ?? []).map((property) => [property.name, property.value]));
}

/** Camadas de grupo viram uma lista só. */
function flattenLayers(layers: TiledLayer[]): TiledLayer[] {
  return layers.flatMap((layer) => (layer.type === "group" ? flattenLayers(layer.layers ?? []) : [layer]));
}

/** gid -> propriedades de terreno, pra todo tile de todo tileset que declare alguma. */
function terrainByGid(tilesets: TiledTileset[]): Map<number, Partial<Tile>> {
  const terrain = new Map<number, Partial<Tile>>();
  for (const tileset of tilesets) {
    if (tileset.source) {
      throw new Error(`Tileset externo (${tileset.source}) não é suportado: embuta o tileset no mapa.`);
    }
    for (const tile of tileset.tiles ?? []) {
      const properties = propertiesOf(tile);
      terrain.set(tileset.firstgid + tile.id, {
        blocksMove: properties.blocksMove === true ? true : undefined,
        blocksSight: properties.blocksSight === true ? true : undefined,
        moveCost: typeof properties.moveCost === "number" ? properties.moveCost : undefined,
      });
    }
  }
  return terrain;
}

export function parseTiledMap(raw: unknown): AreaMap {
  const map = raw as TiledMap;
  if (map.infinite) throw new Error("Mapa infinito não é suportado: desmarque Infinite nas propriedades do mapa.");
  if (map.orientation && map.orientation !== "orthogonal") {
    throw new Error(`Orientação "${map.orientation}" não é suportada: o mapa precisa ser ortogonal.`);
  }
  if (map.tilewidth !== map.tileheight) throw new Error("Os tiles precisam ser quadrados.");

  const layers = flattenLayers(map.layers);
  const terrain = terrainByGid(map.tilesets);
  const tiles: Tile[] = Array.from({ length: map.width * map.height }, () => ({
    blocksMove: false,
    blocksSight: false,
    moveCost: 1,
  }));

  for (const layer of layers) {
    if (layer.type !== "tilelayer") continue;
    if (!Array.isArray(layer.data)) {
      throw new Error("Camada de tiles comprimida não é suportada: use Tile Layer Format = CSV.");
    }
    layer.data.forEach((gid: number, index: number) => {
      const properties = terrain.get(gid & GID_MASK);
      if (!properties) return;
      const tile = tiles[index];
      tile.blocksMove ||= properties.blocksMove ?? false;
      tile.blocksSight ||= properties.blocksSight ?? false;
      tile.moveCost = Math.max(tile.moveCost, properties.moveCost ?? 1);
    });
  }

  const spawns: Record<string, PixelPos> = {};
  const exits: AreaExit[] = [];
  for (const layer of layers) {
    for (const object of layer.objects ?? []) {
      const kind = object.type || object.class;
      if (kind === "spawn") {
        spawns[object.name ?? ""] = { x: object.x, y: object.y };
      } else if (kind === "exit") {
        const { area, spawn } = propertiesOf(object);
        if (typeof area !== "string" || typeof spawn !== "string") {
          throw new Error(`Saída "${object.name ?? ""}" precisa das propriedades "area" e "spawn".`);
        }
        exits.push({ x: object.x, y: object.y, width: object.width ?? 0, height: object.height ?? 0, area, spawn });
      }
    }
  }

  return {
    tileSize: map.tilewidth,
    grid: { width: map.width, height: map.height, tiles },
    spawns,
    exits,
  };
}

/** O quadrado da grade em que um ponto do mapa cai. */
export function tileOfPixel(map: AreaMap, pos: PixelPos): Pos {
  return { x: Math.floor(pos.x / map.tileSize), y: Math.floor(pos.y / map.tileSize) };
}

/** A saída que contém este ponto, se houver. */
export function exitAt(map: AreaMap, pos: PixelPos): AreaExit | undefined {
  return map.exits.find(
    (exit) => pos.x >= exit.x && pos.x < exit.x + exit.width && pos.y >= exit.y && pos.y < exit.y + exit.height,
  );
}
