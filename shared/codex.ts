/**
 * O códice: o que o jogador já viu. Só guarda o que passou pela tela — quem
 * o grupo enfrentou, com quem falou, por onde andou — e só mostra o que a luta
 * ou a conversa já mostrou: o nome, a escola, a aura, a arma e os golpes de
 * cada criatura (os mesmos nomes do registro da luta), quantas vezes o grupo a
 * enfrentou e venceu, e onde. Nenhum texto novo do mundo: o `lore` e o
 * `summary` do bestiário não aparecem no jogo, e o códice não os mostra
 * (AGENTS.md §1: tudo que o jogo mostra vira cânone).
 */
import { AREAS } from "./world/areas";
import { findBestiaryEntry } from "./data/bestiary";
import { findEquipment } from "./data/equipment";
import { auraName, styleLabel } from "./tactics/styles";

export interface CodexCreature {
  /** Quantas lutas o grupo teve com ela (cada uma conta uma vez, por mais que fossem dois ou três). */
  met: number;
  /** Quantas o grupo derrubou. */
  beaten: number;
  /** As áreas onde o grupo a enfrentou, na ordem. */
  areas: string[];
}

export interface Codex {
  /** Pela id do bestiário. */
  creatures: Record<string, CodexCreature>;
  /** Pelo nome como sai na conversa: as áreas onde o grupo a ouviu. */
  people: Record<string, string[]>;
}

export function emptyCodex(): Codex {
  return { creatures: {}, people: {} };
}

/**
 * Uma luta acabou em `areaId`: `fought` são as ids do bestiário de quem estava do
 * outro lado (repetidas, uma por pessoa), `beaten` as de quem caiu.
 */
export function noteFight(codex: Codex, areaId: string, fought: readonly string[], beaten: readonly string[]): void {
  for (const id of new Set(fought)) {
    if (!findBestiaryEntry(id)) continue;
    const entry = (codex.creatures[id] ??= { met: 0, beaten: 0, areas: [] });
    entry.met += 1;
    if (!entry.areas.includes(areaId)) entry.areas.push(areaId);
  }
  for (const id of beaten) {
    const entry = codex.creatures[id];
    if (entry) entry.beaten += 1;
  }
}

/** Alguém falou (`Nome: ...`) em `areaId`. Quem conta a história (`hero`) não entra: o códice é dos outros. */
export function notePerson(codex: Codex, name: string, areaId: string, hero: string): void {
  if (!name || name === hero) return;
  const areas = (codex.people[name] ??= []);
  if (!areas.includes(areaId)) areas.push(areaId);
}

/** O que a tela mostra de uma criatura. */
export interface CodexCreatureView {
  id: string;
  name: string;
  /** "Gryskar II", "Ipojy", ou vazio pra quem não tem escola. */
  style: string;
  /** "Fio", "Corpo"..., ou vazio. */
  aura: string;
  weapon: string;
  /** Os nomes dos golpes, como saem no registro da luta. */
  arts: string[];
  met: number;
  beaten: number;
  areas: string[];
}

export function codexCreatures(codex: Codex): CodexCreatureView[] {
  return Object.entries(codex.creatures).flatMap(([id, seen]) => {
    const entry = findBestiaryEntry(id);
    if (!entry) return [];
    const { template } = entry;
    const weaponId = template.equipment?.weapon;
    return [
      {
        id,
        name: template.name,
        style: entry.style ? styleLabel({ style: entry.style.id, grade: entry.style.grade }) : "",
        aura: entry.aura ? auraName(entry.aura) : "",
        weapon: (weaponId && findEquipment(weaponId)?.name) || "",
        arts: [...new Set(Object.values(template.arts ?? {}).filter((art): art is string => !!art))],
        met: seen.met,
        beaten: seen.beaten,
        areas: seen.areas.map((area) => AREAS[area]?.name ?? area),
      },
    ];
  });
}

export function codexPeople(codex: Codex): { name: string; areas: string[] }[] {
  return Object.entries(codex.people).map(([name, areas]) => ({ name, areas: areas.map((area) => AREAS[area]?.name ?? area) }));
}

/** Lê o códice de um save, aceitando o que não tem (o save de antes) e jogando fora o que não confere. */
export function readCodex(raw: unknown): Codex {
  const codex = emptyCodex();
  if (!raw || typeof raw !== "object") return codex;
  const { creatures, people } = raw as Partial<Record<keyof Codex, unknown>>;
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
  if (creatures && typeof creatures === "object") {
    for (const [id, seen] of Object.entries(creatures as Record<string, unknown>)) {
      if (!findBestiaryEntry(id) || !seen || typeof seen !== "object") continue;
      const { met, beaten, areas } = seen as Record<string, unknown>;
      codex.creatures[id] = { met: count(met), beaten: count(beaten), areas: strings(areas).filter((area) => area in AREAS) };
    }
  }
  if (people && typeof people === "object") {
    for (const [name, areas] of Object.entries(people as Record<string, unknown>)) {
      if (name) codex.people[name] = strings(areas).filter((area) => area in AREAS);
    }
  }
  return codex;
}
