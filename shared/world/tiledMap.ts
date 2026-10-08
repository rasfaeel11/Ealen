import { FLOOR, type Grid, type Pos, type Tile } from "../tactics/grid";

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
 *     `cover` (bool)       dá cobertura a quem se encosta nele (pedra, mureta)
 *     `elevation` (int)    altura do chão, em degraus; padrão 0. É só vantagem
 *                          de combate: quem barra a subida é o `blocksMove` da
 *                          face do degrau, e a escada é o quadrado sem ele
 *   Assim, pintar uma árvore já faz dela um obstáculo — não existe camada
 *   de colisão separada pra esquecer de atualizar.
 * - Camada de objetos, com o campo "Class"/"Type" de cada objeto dizendo o
 *   que ele é:
 *     `spawn`  ponto; o Nome é o id do ponto de chegada
 *     `exit`   retângulo; propriedades `area` (id da área de destino) e
 *              `spawn` (ponto de chegada lá)
 *     `enemy`  ponto; propriedades `creature` (id no bestiário) e `group`
 *              (inimigos do mesmo grupo entram juntos na luta; sem grupo,
 *              o inimigo luta sozinho). Opcionais: `passive` (bool; não
 *              ataca quem chega perto nem pode ser emboscado — só a história
 *              começa essa luta, com start_fight), `dialog` (um trecho da
 *              história: dá pra FALAR com ele enquanto está de pé, e o Nome
 *              do objeto é o que aparece na caixa; só vale em quem é
 *              `passive`) e `onDefeat` (o trecho que abre quando o grupo
 *              dele é vencido)
 *     `npc`    ponto; alguém (ou algo) com quem se fala. O Nome é o que
 *              aparece na caixa; a propriedade `dialog` é o trecho (knot)
 *              da história em client/story que a conversa abre. Com `look`
 *              (o id de uma Ordem, por enquanto) é um personagem de pé, que
 *              ocupa o quadrado; sem `look` é só um ponto pra examinar
 *              (uma inscrição, um altar) no que o mapa já desenha
 *     `prop`   um destrutível: um TILE posto como objeto (Insert Tile, não
 *              pintado numa camada), com a propriedade `kind` (id em PROPS,
 *              ver ../tactics/props.ts). Ocupa o quadrado em que a base do
 *              tile cai. O que ele barra vem de `kind`, não do tile.
 *     `trigger` retângulo; pisar nele abre o trecho da história em `dialog`,
 *              sem apertar nada. Uma vez só, a não ser com `once` = false
 *              (aí abre toda vez que se ENTRA nele). Cobrindo um ponto de
 *              chegada, é a cena de quem chega na área
 *
 *   `npc`, `enemy`, `trigger` e `exit` aceitam ainda `if` e `unless`: o nome
 *   de uma variável (VAR) da história. O objeto só existe enquanto a de `if`
 *   for verdadeira e a de `unless` for falsa — é como a história põe e tira
 *   gente do mapa, arma um gatilho ou tranca uma saída (ver ./presence.ts).
 *
 * Limites do formato: mapa ortogonal, finito, camadas sem compressão
 * (Tile Layer Format = CSV) e tileset embutido no mapa — o Phaser não lê
 * tileset externo (.tsx).
 */

export interface PixelPos {
  x: number;
  y: number;
}

/**
 * Quando um objeto do mapa existe, pelas variáveis da história: enquanto a
 * de `if` for verdadeira e a de `unless` for falsa. Sem nenhuma, sempre.
 */
export interface AreaCondition {
  if?: string;
  unless?: string;
}

export interface AreaExit extends AreaCondition {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Id da área de destino. */
  area: string;
  /** Ponto de chegada na área de destino. */
  spawn: string;
}

export interface AreaEnemy extends AreaCondition {
  /** Único dentro da área — é também o id da unidade dele em combate. */
  id: string;
  /** O nome do objeto no mapa: o que a caixa mostra de quem tem `dialog`. */
  name: string;
  /** Id da criatura no bestiário. */
  creature: string;
  group: string;
  /** Não ataca quem chega perto e não pode ser emboscado: só a história começa a luta dele. De pé, ocupa o quadrado. */
  passive: boolean;
  /** O trecho da história que se abre falando com ele, enquanto está de pé. */
  dialog?: string;
  /** O trecho da história que se abre quando o grupo dele é vencido. */
  onDefeat?: string;
  x: number;
  y: number;
}

/** Um pedaço do chão que abre um trecho da história quando se pisa nele. */
export interface AreaTrigger extends AreaCondition {
  /** Único dentro da área. */
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** O trecho (knot) da história que ele abre. */
  dialog: string;
  /** Só dispara se esse trecho nunca foi lido. Falso = dispara toda vez que se entra nele. */
  once: boolean;
}

export interface AreaNpc extends AreaCondition {
  /** Único dentro da área. */
  id: string;
  /** O nome mostrado ao jogador. */
  name: string;
  /** O trecho (knot) da história que a conversa abre. */
  dialog: string;
  /** Com que cara aparece no mapa: o id de uma Ordem. Ausente = não aparece, é só um ponto pra examinar. */
  look?: string;
  x: number;
  y: number;
}

export interface AreaProp {
  /** Único dentro da área. */
  id: string;
  /** Id em PROPS. Um que não exista é ignorado — o teste dos mapas acusa. */
  kind: string;
  tile: Pos;
  /** O tile que o desenha (gid do Tiled). */
  gid: number;
}

export interface AreaMap {
  /** Lado de um quadrado, em pixels do mapa. */
  tileSize: number;
  /**
   * O terreno — a mesma grade que o combate usa. Sai daqui SEM os
   * destrutíveis e SEM gente: quem os põe de pé nela é standAreaProps
   * (./encounters.ts) e standPeople (./presence.ts).
   */
  grid: Grid;
  /** Os quadrados que standPeople ocupou, com o que o terreno dizia antes. */
  occupied: { pos: Pos; blocksMove: boolean }[];
  spawns: Record<string, PixelPos>;
  exits: AreaExit[];
  enemies: AreaEnemy[];
  npcs: AreaNpc[];
  props: AreaProp[];
  triggers: AreaTrigger[];
}

interface TiledProperty {
  name: string;
  value: unknown;
}

interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  /** Tiled 1.9 chamava o campo "type" de "class". */
  class?: string;
  /** Só em objeto-tile: qual tile ele mostra. */
  gid?: number;
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

/** As propriedades `if` e `unless` de um objeto, quando ele as tem. */
function conditionOf(properties: Record<string, unknown>): AreaCondition {
  const condition: AreaCondition = {};
  if (typeof properties.if === "string" && properties.if !== "") condition.if = properties.if;
  if (typeof properties.unless === "string" && properties.unless !== "") condition.unless = properties.unless;
  return condition;
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
        cover: properties.cover === true ? true : undefined,
        elevation: typeof properties.elevation === "number" ? properties.elevation : undefined,
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
  const tiles: Tile[] = Array.from({ length: map.width * map.height }, () => ({ ...FLOOR }));

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
      tile.cover ||= properties.cover ?? false;
      tile.elevation = Math.max(tile.elevation, properties.elevation ?? 0);
    });
  }

  const spawns: Record<string, PixelPos> = {};
  const exits: AreaExit[] = [];
  const enemies: AreaEnemy[] = [];
  const npcs: AreaNpc[] = [];
  const props: AreaProp[] = [];
  const triggers: AreaTrigger[] = [];
  for (const layer of layers) {
    for (const object of layer.objects ?? []) {
      const kind = object.type || object.class;
      if (kind === "spawn") {
        spawns[object.name ?? ""] = { x: object.x, y: object.y };
      } else if (kind === "exit") {
        const properties = propertiesOf(object);
        const { area, spawn } = properties;
        if (typeof area !== "string" || typeof spawn !== "string") {
          throw new Error(`Saída "${object.name ?? ""}" precisa das propriedades "area" e "spawn".`);
        }
        exits.push({
          x: object.x,
          y: object.y,
          width: object.width ?? 0,
          height: object.height ?? 0,
          area,
          spawn,
          ...conditionOf(properties),
        });
      } else if (kind === "enemy") {
        const properties = propertiesOf(object);
        const { creature, group, dialog, onDefeat } = properties;
        if (typeof creature !== "string") {
          throw new Error(`Inimigo "${object.name ?? ""}" precisa da propriedade "creature".`);
        }
        const id = `enemy-${object.id}`;
        enemies.push({
          id,
          name: object.name ?? "",
          creature,
          group: typeof group === "string" ? group : id,
          passive: properties.passive === true,
          dialog: typeof dialog === "string" ? dialog : undefined,
          onDefeat: typeof onDefeat === "string" ? onDefeat : undefined,
          x: object.x,
          y: object.y,
          ...conditionOf(properties),
        });
      } else if (kind === "npc") {
        const properties = propertiesOf(object);
        const { dialog, look } = properties;
        if (typeof dialog !== "string") throw new Error(`"${object.name ?? ""}" precisa da propriedade "dialog".`);
        npcs.push({
          id: `npc-${object.id}`,
          name: object.name ?? "",
          dialog,
          look: typeof look === "string" ? look : undefined,
          x: object.x,
          y: object.y,
          ...conditionOf(properties),
        });
      } else if (kind === "trigger") {
        const properties = propertiesOf(object);
        const { dialog } = properties;
        if (typeof dialog !== "string") throw new Error(`Gatilho "${object.name ?? ""}" precisa da propriedade "dialog".`);
        triggers.push({
          id: `trigger-${object.id}`,
          x: object.x,
          y: object.y,
          width: object.width ?? 0,
          height: object.height ?? 0,
          dialog,
          once: properties.once !== false,
          ...conditionOf(properties),
        });
      } else if (kind === "prop") {
        const { kind: propKind } = propertiesOf(object);
        if (typeof propKind !== "string" || object.gid === undefined) {
          throw new Error(`Destrutível "${object.name ?? ""}" precisa ser um objeto-tile com a propriedade "kind".`);
        }
        // Um objeto-tile é ancorado no canto de baixo à esquerda: a base dele é a linha logo acima de `y`.
        const tile = {
          x: Math.floor((object.x + map.tilewidth / 2) / map.tilewidth),
          y: Math.floor((object.y - 1) / map.tileheight),
        };
        props.push({ id: `prop-${object.id}`, kind: propKind, tile, gid: object.gid & GID_MASK });
      }
    }
  }

  return {
    tileSize: map.tilewidth,
    grid: { width: map.width, height: map.height, tiles },
    occupied: [],
    spawns,
    exits,
    enemies,
    npcs,
    props,
    triggers,
  };
}

/** Onde ficam os pés de quem está parado num quadrado da grade: no meio, um pouco abaixo do centro. */
export function pixelOfTile(map: AreaMap, tile: Pos): PixelPos {
  return { x: (tile.x + 0.5) * map.tileSize, y: (tile.y + 0.75) * map.tileSize };
}

/** O quadrado da grade em que um ponto do mapa cai. */
export function tileOfPixel(map: AreaMap, pos: PixelPos): Pos {
  return { x: Math.floor(pos.x / map.tileSize), y: Math.floor(pos.y / map.tileSize) };
}

/** A que distância (em quadrados, do pé de quem anda ao meio do quadrado) dá pra falar com alguém. */
export const TALK_RANGE = 1.5;

/**
 * Com quem dá pra falar de `pos`: o mais próximo ao alcance, se houver.
 * `candidates` são os que estão no mapa agora (ver ./presence.ts); sem ela,
 * todos os `npc` do mapa.
 */
export function npcInReach<T extends PixelPos = AreaNpc>(
  map: AreaMap,
  pos: PixelPos,
  candidates: readonly T[] = map.npcs as unknown as T[],
): T | undefined {
  let nearest: T | undefined;
  let best = TALK_RANGE * map.tileSize;
  for (const npc of candidates) {
    const tile = tileOfPixel(map, npc);
    const gap = Math.hypot((tile.x + 0.5) * map.tileSize - pos.x, (tile.y + 0.5) * map.tileSize - pos.y);
    if (gap <= best) {
      nearest = npc;
      best = gap;
    }
  }
  return nearest;
}

function contains(rect: { x: number; y: number; width: number; height: number }, pos: PixelPos): boolean {
  return pos.x >= rect.x && pos.x < rect.x + rect.width && pos.y >= rect.y && pos.y < rect.y + rect.height;
}

/** A saída que contém este ponto, se houver. `exits` são as abertas agora; sem ela, todas as do mapa. */
export function exitAt(map: AreaMap, pos: PixelPos, exits: readonly AreaExit[] = map.exits): AreaExit | undefined {
  return exits.find((exit) => contains(exit, pos));
}

/** Os gatilhos que contêm este ponto. */
export function triggersAt(map: AreaMap, pos: PixelPos): AreaTrigger[] {
  return map.triggers.filter((trigger) => contains(trigger, pos));
}
