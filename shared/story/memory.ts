/**
 * O que a história guarda além das variáveis dela: o DIÁRIO de pistas e o
 * RELÓGIO que corre por cima de um trecho do jogo (a cheia).
 *
 * Os dois são estado da história — quem escreve e faz o tempo andar é
 * o texto — e por isso viajam com ela: `StoryRunner.save` devolve os dois
 * junto com o estado do Ink, num texto só (`packStory`). Assim o save não
 * ganha campo, e o que acontece com a história acontece com eles: o que uma
 * deixa disse no meio de uma luta perdida some junto, diário e relógio
 * inclusive.
 *
 * Como o resto de shared/, isto é dado puro e não desenha nada.
 */

/** Uma anotação do diário. Guarda FATOS, na ordem em que foram anotados; a conclusão é de quem lê. */
export interface JournalEntry {
  /** Único no diário: é por ele que o texto pergunta (`noted`). */
  id: string;
  text: string;
}

/**
 * O que gasta o tempo do relógio sem o texto mandar: descansar (`rest`), uma
 * luta (`fight`: vencida, parada ou perdida, cobrada uma vez, no fim) e cada
 * rodada que VIRA dentro dela (`round`: a primeira é a abertura e não conta —
 * uma luta que acaba na rodada 4 gastou 3).
 */
export const CLOCK_COSTS = ["rest", "fight", "round"] as const;
export type ClockCost = (typeof CLOCK_COSTS)[number];

export function isClockCost(what: unknown): what is ClockCost {
  return CLOCK_COSTS.some((cost) => cost === what);
}

/**
 * Um relógio: um número que sobe de onde começou até `limit`. O que acontece
 * quando ele chega em algum ponto é do texto e do mapa (a condição `clock:N`
 * num `if`/`unless`) — acabar o tempo não mata ninguém, fecha opções.
 */
export interface StoryClock {
  /** O que a barra mostra: "Vazante", "A conta". */
  label: string;
  value: number;
  limit: number;
  /** Quanto cada coisa gasta sozinha; 0 = não gasta. */
  costs: Record<ClockCost, number>;
}

export interface StoryMemory {
  journal: JournalEntry[];
  /** Null = não há relógio correndo. */
  clock: StoryClock | null;
  /**
   * As condições que a história pôs em alguém e que duram ENTRE lutas (o
   * braço de Lish), pelo id da ficha: quem as tem entra em toda luta com
   * elas, até a história tirar. São ids de STATUSES (../tactics/statuses.ts).
   */
  afflictions: Record<string, string[]>;
}

export function emptyMemory(): StoryMemory {
  return { journal: [], clock: null, afflictions: {} };
}

/** Põe a condição `status` em quem tem a ficha `id`. Devolve se mudou. */
export function afflict(afflictions: Record<string, string[]>, id: string, status: string): boolean {
  const list = (afflictions[id] ??= []);
  if (list.includes(status)) return false;
  list.push(status);
  return true;
}

/** Tira a condição. Devolve se havia. */
export function cure(afflictions: Record<string, string[]>, id: string, status: string): boolean {
  const list = afflictions[id];
  if (!list?.includes(status)) return false;
  afflictions[id] = list.filter((other) => other !== status);
  if (afflictions[id].length === 0) delete afflictions[id];
  return true;
}

/**
 * O descanso: tira de todo mundo as condições que só duram até ele
 * (`passes`, a pergunta de quem sabe o que cada uma é — a marca da mana).
 * Devolve se tirou alguma.
 */
export function restAfflictions(afflictions: Record<string, string[]>, passes: (status: string) => boolean): boolean {
  let changed = false;
  for (const [id, list] of Object.entries(afflictions)) {
    for (const status of list.filter(passes)) changed = cure(afflictions, id, status) || changed;
  }
  return changed;
}

// --- Diário -----------------------------------------------------------------

/**
 * Anota `text` no fim do diário. Anotar de novo o mesmo `id` não duplica:
 * troca o texto. Devolve a anotação se o diário mudou.
 */
export function noteEntry(journal: JournalEntry[], id: string, text: string): JournalEntry | undefined {
  const known = journal.find((entry) => entry.id === id);
  if (!known) {
    const entry = { id, text };
    journal.push(entry);
    return entry;
  }
  if (known.text === text) return undefined;
  known.text = text;
  return known;
}

/** Está no diário? */
export function isNoted(journal: readonly JournalEntry[], id: string): boolean {
  return journal.some((entry) => entry.id === id);
}


// --- Relógio ----------------------------------------------------------------

export function startClock(label: string, value: number, limit: number): StoryClock {
  const top = Math.max(0, Math.floor(limit));
  return { label, value: clamp(Math.floor(value), top), limit: top, costs: { rest: 0, fight: 0, round: 0 } };
}

function clamp(value: number, limit: number): number {
  return Math.max(0, Math.min(limit, value));
}

/** Cobra do relógio o que `what` custa, `times` vezes. Devolve se o tempo andou. */
export function chargeClock(clock: StoryClock, what: ClockCost, times = 1): boolean {
  return tickClock(clock, clock.costs[what] * Math.max(0, Math.floor(times)));
}

/** Faz o tempo andar `amount` (negativo volta), sem passar de `limit` nem de zero. Devolve se mudou. */
export function tickClock(clock: StoryClock, amount: number): boolean {
  const next = clamp(clock.value + Math.floor(amount), clock.limit);
  if (next === clock.value) return false;
  clock.value = next;
  return true;
}

/** O prefixo de uma condição de mapa que pergunta pelo relógio em vez de por um VAR: `clock:8`. */
export const CLOCK_CONDITION = "clock:";

/** O número de uma condição `clock:N`. Undefined se `name` não é uma pergunta dessas, ou se N não é um número inteiro. */
export function clockThreshold(name: string): number | undefined {
  if (!name.startsWith(CLOCK_CONDITION)) return undefined;
  const text = name.slice(CLOCK_CONDITION.length);
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

/**
 * O que uma condição `clock:N` responde: se o relógio já chegou em N. Sem
 * relógio correndo, não chegou. Undefined se `name` não é uma pergunta
 * dessas, ou se N não é um número.
 */
export function clockCondition(name: string, clock: StoryClock | null): boolean | undefined {
  const threshold = clockThreshold(name);
  if (threshold === undefined) return undefined;
  return clock !== null && clock.value >= threshold;
}

// --- O texto guardado -------------------------------------------------------

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return [];
  const journal: JournalEntry[] = [];
  for (const entry of raw) {
    if (!isObject(entry) || typeof entry.id !== "string" || typeof entry.text !== "string") continue;
    if (journal.some((other) => other.id === entry.id)) continue;
    journal.push({ id: entry.id, text: entry.text });
  }
  return journal;
}

function readClock(raw: unknown): StoryClock | null {
  if (!isObject(raw) || typeof raw.label !== "string") return null;
  if (typeof raw.value !== "number" || typeof raw.limit !== "number") return null;
  if (!Number.isFinite(raw.value) || !Number.isFinite(raw.limit)) return null;

  const clock = startClock(raw.label, raw.value, raw.limit);
  const costs = isObject(raw.costs) ? raw.costs : {};
  for (const what of CLOCK_COSTS) {
    const cost = costs[what];
    if (typeof cost === "number" && Number.isFinite(cost) && cost > 0) clock.costs[what] = Math.floor(cost);
  }
  return clock;
}

function readAfflictions(raw: unknown): Record<string, string[]> {
  const afflictions: Record<string, string[]> = {};
  if (!isObject(raw)) return afflictions;
  for (const [id, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    const statuses = [...new Set(list.filter((status): status is string => typeof status === "string"))];
    if (statuses.length > 0) afflictions[id] = statuses;
  }
  return afflictions;
}

/** Junta o estado do Ink (`ink`, o JSON dele) com o resto do que a história guarda no texto que vai pro save. */
export function packStory(ink: string, memory: StoryMemory): string {
  return JSON.stringify({
    ealen: 1,
    ink: JSON.parse(ink) as unknown,
    journal: memory.journal,
    clock: memory.clock,
    afflictions: memory.afflictions,
  });
}

/**
 * O contrário: separa o que `packStory` juntou. Um texto que é só o estado
 * do Ink (como se gravava antes de haver diário) volta inteiro em `ink`, com
 * diário vazio e sem relógio. Pedaço mal formado volta ao padrão; nunca lança.
 */
export function unpackStory(saved: string): { ink: string; memory: StoryMemory } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return { ink: saved, memory: emptyMemory() };
  }
  if (!isObject(parsed) || !("ealen" in parsed) || !isObject(parsed.ink)) return { ink: saved, memory: emptyMemory() };
  return {
    ink: JSON.stringify(parsed.ink),
    memory: {
      journal: readJournal(parsed.journal),
      clock: readClock(parsed.clock),
      afflictions: readAfflictions(parsed.afflictions),
    },
  };
}

/**
 * Cobra do relógio de uma história JÁ GUARDADA o que `what` custa, sem abrir
 * a história: é como uma luta perdida gasta tempo, se o resto do que ela
 * disse não vale. `times` é quantas vezes cobrar (as rodadas que a luta
 * durou). Sem relógio (ou sem custo), devolve o texto como veio.
 */
export function chargeSavedClock(saved: string | null, what: ClockCost, times = 1): string | null {
  if (saved === null) return null;
  const { ink, memory } = unpackStory(saved);
  if (!memory.clock || !chargeClock(memory.clock, what, times)) return saved;
  return packStory(ink, memory);
}

/**
 * O descanso numa história JÁ GUARDADA (ver `restAfflictions`), sem abri-la:
 * é como quem perde uma luta e desperta inteiro sai das marcas que só duram
 * até o descanso. Sem nenhuma, devolve o texto como veio.
 */
export function restSavedStory(saved: string | null, passes: (status: string) => boolean): string | null {
  if (saved === null) return null;
  const { ink, memory } = unpackStory(saved);
  if (!restAfflictions(memory.afflictions, passes)) return saved;
  return packStory(ink, memory);
}
