import { FLOOR, type Grid, type Pos, type Tile } from "../tactics/grid";
import type { CueEnding } from "../tactics/types";
import { CLASS_INFO } from "../types/characterClass";

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
 *     `water` (bool)       água (o rio, o baixio): é onde bicho de rio se cura
 *                          e se esconde; pra quem anda, use `moveCost` junto
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
 *              dele é vencido). E `flood` ("3 2"): a luta do grupo dele tem
 *              cheia — a água come um anel da margem de 3 em 3 rodadas, até
 *              2 vezes (ver Flood em ../tactics/types.ts)
 *     `npc`    ponto; alguém (ou algo) com quem se fala. O Nome é o que
 *              aparece na caixa; a propriedade `dialog` é o trecho (knot)
 *              da história em client/story que a conversa abre. Com `look`
 *              (uma classe, ou uma das caras de NPC_LOOKS) é um personagem
 *              de pé, que ocupa o quadrado; sem `look` é só um ponto pra examinar
 *              (uma inscrição, um altar) no que o mapa já desenha
 *     `prop`   um destrutível: um TILE posto como objeto (Insert Tile, não
 *              pintado numa camada), com a propriedade `kind` (id em PROPS,
 *              ver ../tactics/props.ts). Ocupa o quadrado em que a base do
 *              tile cai. O que ele barra vem de `kind`, não do tile. Há os
 *              que não se quebram, se MEXEM, na luta (um sino): também vêm
 *              de `kind`
 *     `trigger` retângulo; pisar nele abre o trecho da história em `dialog`,
 *              sem apertar nada. Uma vez só, a não ser com `once` = false
 *              (aí abre toda vez que se ENTRA nele). Cobrindo um ponto de
 *              chegada, é a cena de quem chega na área
 *     `cue`    ponto (onde fica não importa); uma DEIXA: o que faz de uma luta
 *              uma luta com roteiro. Propriedades `group` (o grupo de inimigos
 *              de cuja luta ela é) e `when` (quando dispara, uma vez por luta):
 *                `round 3`        ao começar a rodada 3
 *                `hurt Nome 50`   quando quem `down` chamaria assim chega à
 *                                 metade da vida (ou ao tanto por cento dito)
 *                `down Nome`      quando cai o inimigo desse grupo cujo objeto
 *                                 tem esse Nome; `down hero` é a protagonista,
 *                                 `down party:lish` um companheiro
 *                `broken Nome`    quando quebra o destrutível com esse Nome
 *                `used Nome`      quando alguém do grupo mexe no objeto com
 *                                 esse Nome; `used A, B, C` espera os três
 *                `defeat`         quando o grupo do jogador cairia inteiro: a
 *                                 deixa acontece NO LUGAR da derrota
 *                `burst`          quando alguém passa do limite de mana num
 *                                 turno (ver ../mana.ts)
 *              Opcionais: `dialog` (o trecho da história que abre nessa hora,
 *              no meio da luta) e `ends` — `win` (a luta acaba ali, vencida,
 *              com quem estiver de pé) ou `stop` (a luta para, sem vencedor
 *              nem recompensa, e o grupo não volta). Sem `ends` a luta segue;
 *              a de `defeat` sempre encerra (`stop`, se não disser outra coisa).
 *              `apply` é a condição que cai sobre alguém nessa hora — o id em
 *              STATUSES e por quantos turnos (`exposed 2`; sem número, 1) — e
 *              `on` diz sobre quem: `enemies` (o padrão), `party`, `hero`,
 *              `party:lish` ou o Nome de um inimigo do grupo. `goal` é o
 *              objetivo que a deixa representa, escrito pro jogador ("Toque o
 *              sino"): fica à vista durante a luta até ela disparar, com a
 *              conta de rodadas (numa de `round`) ou de objetos (numa de `used`).
 *              `burst` (`hero` ou `party:chave`) faz esse alguém gastar toda a
 *              mana de uma vez nessa hora, passando do limite (ver ../mana.ts):
 *              a pressa que o roteiro impõe. `dismiss` (`party:chave`) tira
 *              da luta quem acompanha sem lutar: o apoio dele some. `rise`
 *              (bool) faz a água subir um anel nessa hora
 *
 *   `npc`, `enemy`, `trigger`, `exit`, `cue` e `prop` aceitam ainda `if` e `unless`: o nome
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
  /** A luta do grupo dele tem cheia: a água sobe de `every` em `every` rodadas, até `rises` vezes (ver Flood no motor). */
  flood?: { every: number; rises: number };
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
  /** Com que cara aparece no mapa (ver isLook). Ausente = não aparece, é só um ponto pra examinar. */
  look?: string;
  x: number;
  y: number;
}

/**
 * As caras de quem aparece de pé no mapa sem lutar e sem ser do elenco: a
 * gente de Ybytuguá, pelo papel. Quem luta (ou se parece com quem luta) usa a
 * da classe (`espadachim`, `atracao_repulsao`). O desenho de cada uma é do
 * client (client/src/game/mapSprites.ts).
 */
export const NPC_LOOKS = ["conselheira", "escrivao", "mestre_da_guilda", "ferreiro", "familia", "mercador"] as const;

/** `look` é uma cara que existe: uma classe, ou uma de NPC_LOOKS. */
export function isLook(look: string): boolean {
  return look in CLASS_INFO || (NPC_LOOKS as readonly string[]).includes(look);
}

/** Quando uma deixa dispara, como o mapa escreve: com NOMES, que só viram ids na hora da luta (ver fightCues em ./encounters.ts). */
export type AreaCueWhen =
  | { kind: "round"; round: number }
  /** O Nome de um inimigo do grupo, `hero` ou `party:chave`. */
  | { kind: "down"; who: string }
  /** Quando quem é chamado assim (como em `down`) chega a `share`% da vida ou menos. */
  | { kind: "hurt"; who: string; share: number }
  /** O Nome de um destrutível da área. */
  | { kind: "broken"; prop: string }
  /** Os Nomes dos objetos da área em que é preciso mexer — todos. */
  | { kind: "used"; props: string[] }
  | { kind: "defeat" }
  | { kind: "burst" };

/** Uma deixa de luta (ver Cue em ../tactics/types.ts): o roteiro da luta com um grupo. */
export interface AreaCue extends AreaCondition {
  /** Único dentro da área — é também o id da deixa na luta. */
  id: string;
  group: string;
  when: AreaCueWhen;
  /** O trecho da história que abre quando ela dispara, no meio da luta. */
  dialog?: string;
  ends?: CueEnding;
  /** A condição que ela aplica ao disparar: o id em STATUSES, por quantos turnos e sobre quem (ver o contrato acima). */
  apply?: { status: string; turns: number; on: string };
  /** O objetivo que ela representa, como o jogador o lê durante a luta. */
  goal?: string;
  /** Quem gasta toda a mana de uma vez quando ela dispara (`hero`, `party:chave`): a pressa que o roteiro impõe. */
  burst?: string;
  /** Quem acompanha sem lutar e sai da luta quando ela dispara (`party:chave`). */
  dismiss?: string;
  /** A água sobe um anel quando ela dispara (ver Flood no motor). */
  rise?: boolean;
}

/** Sobre quem cai a condição de uma deixa que não diz: todos os inimigos da luta. */
export const CUE_ON_ENEMIES = "enemies";

/** Lê a propriedade `when` de uma deixa. Undefined se não der pra entender. */
export function parseCueWhen(text: string): AreaCueWhen | undefined {
  const [, kind, rest = ""] = /^(\S+)\s*(.*)$/.exec(text.trim()) ?? [];
  if (kind === "defeat" || kind === "burst") return rest === "" ? { kind } : undefined;
  if (kind === "round") return /^[1-9]\d*$/.test(rest) ? { kind, round: Number(rest) } : undefined;
  if (rest === "") return undefined;
  if (kind === "down") return { kind, who: rest };
  if (kind === "hurt") {
    const [, who, share] = /^(.+?)\s+(\d+)$/.exec(rest) ?? [];
    const percent = Number(share);
    return who !== undefined && percent >= 1 && percent <= 99 ? { kind, who, share: percent } : undefined;
  }
  if (kind === "broken") return { kind, prop: rest };
  if (kind === "used") {
    const props = rest.split(",").map((name) => name.trim());
    return props.every((name) => name !== "") ? { kind, props } : undefined;
  }
  return undefined;
}

/** Lê a propriedade `apply` de uma deixa: `exposed 2`, ou só `exposed` (1 turno). */
export function parseCueApply(text: string): { status: string; turns: number } | undefined {
  const [, status, turns] = /^(\S+)(?:\s+([1-9]\d*))?$/.exec(text.trim()) ?? [];
  return status === undefined ? undefined : { status, turns: turns === undefined ? 1 : Number(turns) };
}

export interface AreaProp extends AreaCondition {
  /** Único dentro da área. */
  id: string;
  /** O nome do objeto no mapa: é por ele que uma deixa `broken` ou `used` o aponta. */
  name: string;
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
  /** As deixas de todas as lutas da área (ver AreaCue). */
  cues: AreaCue[];
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

/** A propriedade `flood` de um inimigo: "3 2" é a água subindo de 3 em 3 rodadas, até 2 vezes. */
function floodOf(name: string, flood: unknown): { flood?: { every: number; rises: number } } {
  if (flood === undefined || flood === "") return {};
  const match = typeof flood === "string" ? /^\s*(\d+)\s+(\d+)\s*$/.exec(flood) : null;
  const every = match ? Number(match[1]) : 0;
  const rises = match ? Number(match[2]) : 0;
  if (every < 1 || rises < 1) throw new Error(`Inimigo "${name}": "flood" é de quantas em quantas rodadas a água sobe e quantas vezes ("3 2").`);
  return { flood: { every, rises } };
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
        water: properties.water === true ? true : undefined,
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
      if (properties.water) tile.water = true;
    });
  }

  const spawns: Record<string, PixelPos> = {};
  const exits: AreaExit[] = [];
  const enemies: AreaEnemy[] = [];
  const npcs: AreaNpc[] = [];
  const props: AreaProp[] = [];
  const triggers: AreaTrigger[] = [];
  const cues: AreaCue[] = [];
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
          ...floodOf(object.name ?? "", properties.flood),
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
        props.push({
          id: `prop-${object.id}`,
          name: object.name ?? "",
          kind: propKind,
          tile,
          gid: object.gid & GID_MASK,
          ...conditionOf(propertiesOf(object)),
        });
      } else if (kind === "cue") {
        const properties = propertiesOf(object);
        const { group, dialog, ends, on, goal, burst, dismiss } = properties;
        const when = typeof properties.when === "string" ? parseCueWhen(properties.when) : undefined;
        if (typeof group !== "string" || !when) {
          throw new Error(
            `Deixa "${object.name ?? ""}" precisa das propriedades "group" e "when" (round N, down Nome, hurt Nome 50, broken Nome, used Nome, defeat ou burst).`,
          );
        }
        const wantsApply = typeof properties.apply === "string" && properties.apply !== "";
        const apply = wantsApply ? parseCueApply(properties.apply as string) : undefined;
        if (wantsApply && !apply) {
          throw new Error(`Deixa "${object.name ?? ""}": "apply" é uma condição e, se quiser, os turnos ("exposed 2").`);
        }
        if (ends !== undefined && ends !== "" && ends !== "win" && ends !== "stop") {
          throw new Error(`Deixa "${object.name ?? ""}": "ends" é "win" ou "stop", não "${String(ends)}".`);
        }
        cues.push({
          id: `cue-${object.id}`,
          group,
          when,
          ...(typeof dialog === "string" && dialog !== "" ? { dialog } : {}),
          ...(ends === "win" || ends === "stop" ? { ends } : {}),
          ...(apply ? { apply: { ...apply, on: typeof on === "string" && on !== "" ? on : CUE_ON_ENEMIES } } : {}),
          ...(typeof goal === "string" && goal !== "" ? { goal } : {}),
          ...(typeof burst === "string" && burst !== "" ? { burst } : {}),
          ...(typeof dismiss === "string" && dismiss !== "" ? { dismiss } : {}),
          ...(properties.rise === true ? { rise: true } : {}),
          ...conditionOf(properties),
        });
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
    cues,
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
