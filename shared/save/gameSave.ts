import { ATTRIBUTE_KEYS } from "../types/attributes";
import type { Character } from "../types/character";
import { CLASS_INFO } from "../types/characterClass";
import { RACE_INFO } from "../types/principle";
import type { PartyMember } from "../party";
import { AREAS } from "../world/areas";

/**
 * O save do jogo: UM objeto com tudo que uma partida é — o personagem, onde
 * ele está e o que já aconteceu no mundo. É dado puro: vira texto com
 * `serializeSave` e volta com `parseSave`, que é a única porta de entrada
 * (confere o formato e atualiza saves de versões antigas). Onde esse texto
 * fica guardado — localStorage, arquivo, nuvem — é problema de quem chama.
 *
 * Campo novo no save: acrescentar em `GameSave`, subir `SAVE_VERSION` e
 * escrever em `MIGRATIONS` como um save da versão anterior ganha esse campo.
 */
export const SAVE_VERSION = 3;

/** Onde o personagem está: a área e o ponto do mapa dela, em pixels. */
export interface SaveLocation {
  areaId: string;
  x: number;
  y: number;
}

export interface GameSave {
  version: number;
  character: Character;
  /** Quem já andou com o personagem, com a ficha de cada um; `present` diz quem está no grupo agora. */
  companions: PartyMember[];
  /** Null num jogo que ainda não pisou no mundo: começa-se no início dele. */
  location: SaveLocation | null;
  /** Grupos de inimigos já vencidos, como "área:grupo". Vencido não volta. */
  defeated: string[];
  /** Destrutíveis já quebrados, como "área:id". Quebrado não volta. */
  broken: string[];
  /** O estado da história (flags, trechos lidos, escolhas gastas), como o StoryRunner o entrega. */
  story: string | null;
  /** Tempo de jogo, em milissegundos. */
  playTimeMs: number;
  /** Quando foi gravado pela última vez (ms desde 1970). 0 = nunca, ou não se sabe. */
  savedAt: number;
}

export type SaveProblem =
  /** Não é um save do jogo, ou está estragado. */
  | "invalid"
  /** Foi gravado por uma versão mais nova do jogo do que esta. */
  | "newer";

export type ParsedSave = { ok: true; save: GameSave } | { ok: false; problem: SaveProblem };

type Json = Record<string, unknown>;

/**
 * Como um save de cada versão vira o da seguinte. A chave é a versão de
 * ORIGEM; `parseSave` aplica uma depois da outra até chegar em SAVE_VERSION.
 */
const MIGRATIONS: Record<number, (old: Json) => Json> = {
  // A versão 1 só tinha o personagem; o resto morava em chaves soltas, que
  // quem lê o save antigo junta no mesmo objeto antes de passar por aqui.
  1: (old) => ({
    ...old,
    version: 2,
    location: old.location ?? null,
    defeated: old.defeated ?? [],
    broken: old.broken ?? [],
    story: old.story ?? null,
    playTimeMs: 0,
    savedAt: 0,
  }),
  // A versão 2 não tinha companheiros.
  2: (old) => ({ ...old, version: 3, companions: [] }),
};

export function newGame(character: Character): GameSave {
  return {
    version: SAVE_VERSION,
    character,
    companions: [],
    location: null,
    defeated: [],
    broken: [],
    story: null,
    playTimeMs: 0,
    savedAt: 0,
  };
}

export function serializeSave(save: GameSave): string {
  return JSON.stringify(save);
}

/**
 * Lê um save, de texto ou já como objeto. Nunca lança: o que não for um save
 * que este jogo entende volta como problema, com o motivo.
 */
export function parseSave(raw: unknown): ParsedSave {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, problem: "invalid" };
    }
  }
  if (!isObject(data) || !Number.isInteger(data.version)) return { ok: false, problem: "invalid" };
  if ((data.version as number) > SAVE_VERSION) return { ok: false, problem: "newer" };

  let current = data;
  while (current.version !== SAVE_VERSION) {
    const migrate = MIGRATIONS[current.version as number];
    if (!migrate) return { ok: false, problem: "invalid" };
    current = migrate(current);
  }

  const { character, story } = current;
  if (!isCharacter(character)) return { ok: false, problem: "invalid" };
  if (story !== null && typeof story !== "string") return { ok: false, problem: "invalid" };

  return {
    ok: true,
    save: {
      version: SAVE_VERSION,
      character,
      companions: readCompanions(current.companions),
      location: readLocation(current.location),
      defeated: readKeys(current.defeated),
      broken: readKeys(current.broken),
      story,
      playTimeMs: readCount(current.playTimeMs),
      savedAt: readCount(current.savedAt),
    },
  };
}

// ------------------------------------------------------------ o que aconteceu

export function isDefeated(save: GameSave, key: string): boolean {
  return save.defeated.includes(key);
}

export function markDefeated(save: GameSave, key: string): void {
  if (!save.defeated.includes(key)) save.defeated.push(key);
}

export function markBroken(save: GameSave, keys: string[]): void {
  for (const key of keys) if (!save.broken.includes(key)) save.broken.push(key);
}

/** Os ids dos destrutíveis já quebrados numa área. */
export function brokenInArea(save: GameSave, areaId: string): Set<string> {
  const prefix = `${areaId}:`;
  return new Set(save.broken.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)));
}

// ------------------------------------------------------------------ resumo

/** O que a lista de jogos salvos mostra de cada um. */
export interface SaveSummary {
  name: string;
  className: string;
  level: number;
  areaName: string;
  playTime: string;
}

export function summarizeSave(save: GameSave): SaveSummary {
  const { character, location } = save;
  return {
    name: character.name,
    className: CLASS_INFO[character.characterClass].name,
    level: character.level,
    areaName: AREAS[location?.areaId ?? ""]?.name ?? "—",
    playTime: formatPlayTime(save.playTimeMs),
  };
}

/** "47min", "2h 05min". */
export function formatPlayTime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, "0")}min` : `${minutes}min`;
}

// ---------------------------------------------------------------- conferência

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Confere o que o jogo quebraria sem: quem é o personagem e os números da
 * ficha. A mochila não é conferida item a item.
 */
function isCharacter(value: unknown): value is Character {
  if (!isObject(value)) return false;
  const { attributes, inventory } = value;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.race === "string" &&
    hasKey(RACE_INFO, value.race) &&
    typeof value.characterClass === "string" &&
    hasKey(CLASS_INFO, value.characterClass) &&
    isNumber(value.level) &&
    isNumber(value.xp) &&
    isNumber(value.currentHp) &&
    isNumber(value.maxHp) &&
    // De antes de o Fôlego existir, a ficha não o tem: vale cheio (ver ../breath.ts), sem migração.
    (value.breath === undefined || isNumber(value.breath)) &&
    isObject(attributes) &&
    ATTRIBUTE_KEYS.every((key) => isNumber(attributes[key])) &&
    (inventory === undefined || (isObject(inventory) && Array.isArray(inventory.slots)))
  );
}

/** Um lugar mal formado não estraga o save: o personagem só volta ao começo do mundo. */
function readLocation(value: unknown): SaveLocation | null {
  if (!isObject(value)) return null;
  const { areaId, x, y } = value;
  return typeof areaId === "string" && isNumber(x) && isNumber(y) ? { areaId, x, y } : null;
}

/** Companheiro com a ficha estragada é deixado de fora: a história o põe de volta quando o chamar. */
function readCompanions(value: unknown): PartyMember[] {
  if (!Array.isArray(value)) return [];
  const members: PartyMember[] = [];
  for (const entry of value) {
    if (!isObject(entry) || !isCharacter(entry.character)) continue;
    const { character } = entry;
    if (members.some((member) => member.character.id === character.id)) continue;
    members.push({ character, present: entry.present === true });
  }
  return members;
}

function readKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((key): key is string => typeof key === "string"))];
}

function readCount(value: unknown): number {
  return isNumber(value) && value > 0 ? value : 0;
}

/** `in` aceitaria "toString": só vale o que a tabela declara. */
function hasKey(table: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(table, key);
}
