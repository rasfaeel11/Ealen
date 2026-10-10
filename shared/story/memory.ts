/**
 * O que a história guarda além das variáveis dela: o DIÁRIO de pistas e o
 * RELÓGIO que corre por cima de um trecho do jogo (a vazante, a conta de
 * Halmira).
 *
 * Os dois são estado da história — quem escreve, apaga e faz o tempo andar é
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
  /** Único no diário: é por ele que o texto pergunta (`noted`) e devolve (`recall`). */
  id: string;
  text: string;
  /** Apagada (`forget`): continua no lugar dela, em branco, até alguém devolver. */
  lost?: boolean;
}

/**
 * O que gasta o tempo do relógio sem o texto mandar: descansar, uma luta
 * (vencida, parada ou perdida) e cada rodada que VIRA dentro de uma — a
 * primeira não conta, é a luta começando.
 */
export type ClockCost = "rest" | "fight" | "round";

const CLOCK_COSTS: readonly ClockCost[] = ["rest", "fight", "round"];

export function isClockCost(what: unknown): what is ClockCost {
  return CLOCK_COSTS.includes(what as ClockCost);
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

// --- Diário -----------------------------------------------------------------

/**
 * Anota `text` no fim do diário. Anotar de novo o mesmo `id` não duplica:
 * troca o texto e, se a anotação estava apagada, devolve-a. Devolve a
 * anotação se o diário mudou.
 */
export function noteEntry(journal: JournalEntry[], id: string, text: string): JournalEntry | undefined {
  const known = journal.find((entry) => entry.id === id);
  if (!known) {
    const entry = { id, text };
    journal.push(entry);
    return entry;
  }
  if (known.text === text && !known.lost) return undefined;
  known.text = text;
  delete known.lost;
  return known;
}

/** Está no diário, e legível? */
export function isNoted(journal: readonly JournalEntry[], id: string): boolean {
  return journal.some((entry) => entry.id === id && !entry.lost);
}

/**
 * Apaga as `count` anotações mais RECENTES que ainda se leem. As antigas não
 * somem: quem leva lembrança só leva o que é novo. Devolve as apagadas, da
 * mais recente pra mais antiga.
 */
export function forgetRecent(journal: JournalEntry[], count: number): JournalEntry[] {
  const lost: JournalEntry[] = [];
  for (let index = journal.length - 1; index >= 0 && lost.length < count; index--) {
    const entry = journal[index];
    if (entry.lost) continue;
    entry.lost = true;
    lost.push(entry);
  }
  return lost;
}

/** Devolve a anotação apagada de id `id` — ou, sem `id`, todas. Devolve as que voltaram, na ordem do diário. */
export function recallEntries(journal: JournalEntry[], id?: string): JournalEntry[] {
  const back = journal.filter((entry) => entry.lost && (id === undefined || entry.id === id));
  for (const entry of back) delete entry.lost;
  return back;
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
    journal.push({ id: entry.id, text: entry.text, ...(entry.lost === true ? { lost: true } : {}) });
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
 * Cobra do relógio de uma história JÁ GUARDADA o que `what` custa (`times`
 * vezes), sem abrir a história: é como uma luta perdida gasta tempo, se o
 * resto do que ela disse não vale. Sem relógio (ou sem custo), devolve o
 * texto como veio.
 */
export function chargeSavedClock(saved: string | null, what: ClockCost, times = 1): string | null {
  if (saved === null) return null;
  const { ink, memory } = unpackStory(saved);
  if (!memory.clock || !chargeClock(memory.clock, what, times)) return saved;
  return packStory(ink, memory);
}
