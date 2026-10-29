import { createStartingAttributes, createStartingInventory, startingMaxHp } from "./characterCreation";
import { restoreBreath } from "./breath";
import { restoreMana, type Magic } from "./mana";
import { startingEquipment } from "./equipment";
import { applyXpGain, xpToNextLevel } from "./leveling";
import type { GiftId } from "./tactics/abilities";
import { isSworn, type StyleId } from "./tactics/styles";
import type { SupportId } from "./tactics/supports";
import type { Character } from "./types/character";
import type { Equipment } from "./types/inventory";
import type { CharacterClass } from "./types/characterClass";
import type { Race } from "./types/race";

/**
 * O elenco: o protagonista, que é sempre o mesmo, e quem pode andar com ele.
 * Quem são está no repositório da história (as fichas `endyru`, `jarupa`,
 * `xandui` e `oryndu`): o jogo só diz como cada um luta.
 *
 * O jogo não tem criação de personagem. Quem joga é Endyru, jovem: estudante
 * da universidade de Xerumbetyba, mago de atração e repulsão, no nível de
 * Página. No caminho, forma o grupo com Jarupã (Gryskar) e Xanduí (Ipojy), e
 * Oryndu, o barqueiro, os acompanha sem lutar.
 *
 * Um companheiro é uma ficha inteira, como a dele: tem nível, vida e XP
 * próprios, entra na luta como unidade do lado do jogador e é comandado por
 * ele. Quem entra e quem sai do grupo é a história que decide (`join_party` e
 * `leave_party` no texto, ver ./story/runner.ts).
 *
 * Há quem acompanhe SEM lutar (`support` no elenco): anda na fila como os
 * outros, mas numa luta não é unidade — fica de fora da grade e oferece um
 * apoio que o grupo chama (ver ./tactics/supports.ts).
 *
 * Cada um é o que é (`characterClass`: o mago pelo conceito, o espadachim pela
 * lâmina), e o que a história diz dele está aqui: a escola de espada e a aura
 * (`style`, `aura` — ver ./tactics/styles.ts), a magia (`magic`, ver
 * ./mana.ts) e o que traz no corpo (`gear`, ver ./equipment.ts). Escola, aura
 * e magia vêm daqui a cada luta, não da ficha salva: mudar o elenco muda quem
 * já está jogando. O equipamento é só o de COMEÇO — depois é da ficha, e o
 * jogador troca.
 */

/** Id fixo da protagonista: só precisa diferir dos ids dos companheiros e das criaturas. */
export const HERO_ID = "hero";

export interface CastMember {
  name: string;
  race: Race;
  /** O que ele é numa luta: dá o kit de quem luta e, por enquanto, a cara de todos no mapa. */
  characterClass: CharacterClass;
  /** O que ele é, na ficha, quando não é o nome da classe (o barqueiro). */
  calling?: string;
  /** Acompanha sem lutar: numa luta não é unidade, e oferece este apoio. */
  support?: SupportId;
  /** A escola de espada e a proficiência nela. Sem isto, fica fora do triângulo. */
  style?: { id: StyleId; grade: number };
  /** O nível de aura com que ele CHEGA, 1 a 7 (o texto o sobe, ver auraOf): a proficiência na escola nunca passa dele. */
  aura?: number;
  /** O que só ele sabe fazer, além do kit da classe. */
  gifts?: readonly GiftId[];
  /** Conjura: o conceito do sangue dele e o nível de mago (ver ./mana.ts). Sem isto, não tem mana nem paga magia. */
  magic?: Magic;
  /** Com o que ele chega: os ids das peças (ver ./mock/equipment.ts). Sem isto, o que a classe dele dá. */
  gear?: Equipment;
}

/** Endyru, jovem: estudante de Kuatiarape, mago de atração e repulsão. Começa na Página (o texto o sobe a Círculo). Não tem escola de espada. */
export const PROTAGONIST: CastMember = {
  name: "Endyru",
  race: "humano",
  characterClass: "atracao_repulsao",
  magic: { concept: "atracao_repulsao", level: 3 },
  gear: { weapon: "gear-bordao", armor: "gear-tunica-de-linho" },
};

/** Quem pode entrar no grupo, pela chave que o texto usa (`join_party("jarupa")`). */
export const COMPANIONS: Record<string, CastMember> = {
  // Do Gryskar, o Bate-Primeiro: bate primeiro e pergunta depois. Aura baixa (Fio), e a espada pesada da escola. O
  // grau 3 é o que ele sabe da escola; até a aura chegar ao Corpo (`aura_rise`), a proficiência fica no 2.
  jarupa: {
    name: "Jarupã",
    race: "humano",
    characterClass: "espadachim",
    style: { id: "gryskar", grade: 3 },
    aura: 2,
    gifts: ["shoulder"],
    gear: { weapon: "gear-espada-pesada", armor: "gear-gibao-de-couro" },
  },
  // Da Ipojy, a Espera: nunca dá o primeiro golpe (o voto). Aura baixa (Fio), e a espada reta da escola. Como
  // Jarupã, sabe a escola no grau 3, e a aura o corta no 2 até o Corpo.
  xandui: {
    name: "Xanduí",
    race: "humano",
    characterClass: "espadachim",
    style: { id: "ipojy", grade: 3 },
    aura: 2,
    gifts: ["hold_the_lunge"],
    gear: { weapon: "gear-espada-reta", armor: "gear-gibao-de-couro" },
  },
  // Não luta: lê a água. A classe é só a cara dele no mapa, por enquanto.
  oryndu: { name: "Oryndu", race: "humano", characterClass: "espadachim", calling: "Barqueiro", support: "read_water" },
};

export function isCompanionKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(COMPANIONS, key);
}

/** O id da ficha (e da unidade, numa luta) do companheiro de chave `key`. */
export function companionId(key: string): string {
  return `${COMPANION_ID}${key}`;
}

const COMPANION_ID = "companion:";

/** Quem do elenco é o dono da ficha `character`. Undefined em quem não é do elenco (uma criatura). */
export function castOf(character: Pick<Character, "id">): CastMember | undefined {
  if (character.id === HERO_ID) return PROTAGONIST;
  if (!character.id.startsWith(COMPANION_ID)) return undefined;
  const key = character.id.slice(COMPANION_ID.length);
  return isCompanionKey(key) ? COMPANIONS[key] : undefined;
}

/**
 * O conceito e o nível de mago de quem tem a ficha `character`, se ele conjura (ver ./mana.ts): o conceito vem do
 * elenco; o nível, da ficha (`mageLevel`, que o texto sobe), e na ficha que nunca o guardou, o do elenco.
 */
export function magicOf(character: Pick<Character, "id" | "mageLevel">): Magic | undefined {
  const magic = castOf(character)?.magic;
  return magic ? { ...magic, level: character.mageLevel ?? magic.level } : undefined;
}

/**
 * O nível de aura de quem tem a ficha `character`, se ele luta de espada (ver ./tactics/styles.ts): o da ficha
 * (`aura`, que o texto sobe), e na ficha que nunca o guardou, o do elenco.
 */
export function auraOf(character: Pick<Character, "id" | "aura">): number | undefined {
  const cast = castOf(character);
  return cast?.aura === undefined ? undefined : (character.aura ?? cast.aura);
}

/** O apoio que a ficha `character` oferece numa luta, se ela é de quem acompanha sem lutar. Undefined em quem luta. */
export function supportOf(character: Pick<Character, "id">): SupportId | undefined {
  return character.id === HERO_ID ? undefined : castOf(character)?.support;
}

/** O id, na luta e no save, de quem o texto chama de `who`: "hero" é Endyru, o resto são as chaves de COMPANIONS. Undefined se não existe. */
export function castId(who: string): string | undefined {
  if (who === HERO_ID) return HERO_ID;
  return isCompanionKey(who) ? companionId(who) : undefined;
}

/**
 * Quem é do elenco e da Ipojy jurou nunca dar o primeiro golpe: não embosca
 * nem dá golpe de abertura (ver o voto em ./tactics/styles.ts). Dentro da
 * luta, quem guarda o voto é o motor, pela escola da unidade.
 */
export function keepsVow(character: Pick<Character, "id">): boolean {
  return isSworn(castOf(character)?.style?.id);
}

/** Entra na luta como unidade? Só não entra quem acompanha sem lutar. */
export function fights(character: Pick<Character, "id">): boolean {
  return supportOf(character) === undefined;
}

/** Com o que a ficha `character` começa: o que o elenco diz dela; quem não é do elenco (ou não diz), o que a classe dá. */
export function startingLoadout(character: Pick<Character, "id" | "characterClass">): Equipment {
  const member = castOf(character);
  return member?.gear ? { ...member.gear } : startingEquipment(character.characterClass);
}

function createSheet(id: string, member: CastMember): Character {
  const { characterClass } = member;
  const attributes = createStartingAttributes(member.race, characterClass);
  const maxHp = startingMaxHp(attributes);
  return {
    id,
    name: member.name,
    race: member.race,
    characterClass,
    level: 1,
    xp: 0,
    attributes,
    currentHp: maxHp,
    maxHp,
    ...(member.magic ? { mageLevel: member.magic.level } : {}),
    // Quem só acompanha não veste nada pra luta.
    ...(member.support ? {} : { equipment: startingLoadout({ id, characterClass }) }),
  };
}

/** Endyru no nível 1, com a mochila inicial e o que ele veste. */
export function createProtagonist(): Character {
  return { ...createSheet(HERO_ID, PROTAGONIST), inventory: createStartingInventory(), gear: [...STARTING_STASH] };
}

/** O que o protagonista leva guardado ao começar: nada além do que veste. */
export const STARTING_STASH: readonly string[] = [];

/**
 * A ficha nova de quem é do elenco, com o id `id` (o do protagonista ou o de
 * um companheiro), já no nível `level`, de vida cheia — sem mochila nem
 * guardado. Undefined em quem não é do elenco. É como um save de antes do
 * elenco de agora ganha as fichas dele (ver ./save/gameSave.ts).
 */
export function castSheet(id: string, level: number): Character | undefined {
  const member = castOf({ id });
  if (!member) return undefined;
  const sheet = createSheet(id, member);
  raiseToLevel(sheet, level);
  return sheet;
}

/** Sobe a ficha até `level`, com a vida cheia. Não desce ninguém. */
export function raiseToLevel(character: Character, level: number): void {
  while (character.level < level) applyXpGain(character, xpToNextLevel(character.level) - character.xp);
  character.currentHp = character.maxHp;
}

/**
 * Alguém que já andou com a protagonista. A ficha fica guardada mesmo quando
 * ele não está no grupo (`present` falso): quem volta, volta como era.
 */
export interface PartyMember {
  character: Character;
  present: boolean;
}

/** As fichas de quem está no grupo agora, na ordem em que entraram. */
export function presentCompanions(members: readonly PartyMember[]): Character[] {
  return members.filter((member) => member.present).map((member) => member.character);
}

export function isInParty(members: readonly PartyMember[], key: string): boolean {
  return members.some((member) => member.present && member.character.id === companionId(key));
}

/** O prefixo de uma condição de mapa que pergunta pelo grupo: `unless` = `party:lish`. */
const PARTY_CONDITION = "party:";

/**
 * O que uma condição de mapa (`if`/`unless`) vale quando pergunta pelo grupo
 * em vez de por uma variável da história: `party:lish` é verdadeiro enquanto
 * Lish anda com o personagem. Undefined se `name` não é uma pergunta dessas,
 * ou se pergunta por alguém que não existe.
 */
export function partyCondition(name: string, members: readonly PartyMember[]): boolean | undefined {
  if (!name.startsWith(PARTY_CONDITION)) return undefined;
  const key = name.slice(PARTY_CONDITION.length);
  return isCompanionKey(key) ? isInParty(members, key) : undefined;
}

/**
 * Põe no grupo o companheiro de chave `key`. Na primeira vez a ficha é
 * criada, sem mochila (a do grupo é a da protagonista); em toda entrada ele
 * chega pelo menos no nível `level` — o de quem ele vai acompanhar — pra não
 * ficar pra trás por ter estado fora. Muta `members`. Devolve a ficha, ou
 * undefined se ele já estava no grupo.
 */
export function joinParty(members: PartyMember[], key: string, level: number): Character | undefined {
  const cast = COMPANIONS[key];
  if (!cast || !isCompanionKey(key)) throw new Error(`Não existe companheiro com a chave "${key}"`);

  let member = members.find((other) => other.character.id === companionId(key));
  if (member?.present) return undefined;
  if (!member) {
    member = { character: createSheet(companionId(key), cast), present: false };
    members.push(member);
  }
  member.present = true;
  raiseToLevel(member.character, level);
  return member.character;
}

/** Tira do grupo o companheiro de chave `key`, guardando a ficha. Devolve-a, ou undefined se ele não estava. */
export function leaveParty(members: PartyMember[], key: string): Character | undefined {
  if (!isCompanionKey(key)) throw new Error(`Não existe companheiro com a chave "${key}"`);
  const member = members.find((other) => other.present && other.character.id === companionId(key));
  if (!member) return undefined;
  member.present = false;
  return member.character;
}

/** Vida, Fôlego e mana cheios pra todo mundo que já andou com ela, presente ou não. */
export function restoreParty(hero: Character, members: readonly PartyMember[]): void {
  for (const character of [hero, ...members.map((member) => member.character)]) {
    character.currentHp = character.maxHp;
    restoreBreath(character);
    const magic = magicOf(character);
    if (magic) restoreMana(character, magic);
  }
}
