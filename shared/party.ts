import { createStartingAttributes, createStartingInventory, startingMaxHp } from "./characterCreation";
import { restoreBreath } from "./breath";
import { startingEquipment } from "./equipment";
import { applyXpGain, xpToNextLevel } from "./leveling";
import { MOCK_MAP_NODES } from "./mock/seed";
import type { GiftId } from "./tactics/abilities";
import type { StyleId } from "./tactics/styles";
import type { SupportId } from "./tactics/supports";
import type { Character } from "./types/character";
import type { Equipment } from "./types/inventory";
import { CLASS_INFO, type CharacterClass } from "./types/characterClass";
import type { Race } from "./types/race";

/**
 * O elenco: a protagonista, que é sempre a mesma, e quem pode andar com ela.
 *
 * O jogo não tem criação de personagem. Quem joga é Halmira; o que pode mudar
 * num jogo novo é a ORDEM dela, e só entre as que o jogador já destravou (ver
 * ./save/profile.ts) — sem nada destravado, não há o que escolher.
 *
 * Um companheiro é uma ficha inteira, como a dela: tem nível, vida e XP
 * próprios, entra na luta como unidade do lado do jogador e é comandado por
 * ele. Quem entra e quem sai do grupo é a história que decide (`join_party` e
 * `leave_party` no texto, ver ./story/runner.ts).
 *
 * Há quem acompanhe SEM lutar (`support` no elenco): anda na fila como os
 * outros, mas numa luta não é unidade — fica de fora da grade e oferece um
 * apoio que o grupo chama (ver ./tactics/supports.ts).
 *
 * As Ordens aqui são PROVISÓRIAS: cada um ganhou o kit da Ordem que mais se
 * parece com o papel dele. O que a história diz de cada um está no ESTILO
 * (`style`: Maré, Viés ou Baluarte, e o grau — ver ./tactics/styles.ts), no
 * que só ele sabe fazer (`gifts`, ver GIFTS em ./tactics/abilities.ts) e no
 * que ele traz no corpo (`gear`, ver ./equipment.ts). Estilo e habilidade
 * própria vêm daqui a cada luta, não da ficha salva: mudar o elenco muda quem
 * já está jogando. O equipamento é só o de COMEÇO — depois é da ficha, e o
 * jogador troca.
 */

/** Id fixo da protagonista: só precisa diferir dos ids dos companheiros e das criaturas. */
export const HERO_ID = "hero";

export interface CastMember {
  name: string;
  race: Race;
  /** A Ordem dá o kit de quem luta e, por enquanto, a cara de todos no mapa. */
  characterClass: CharacterClass;
  /** Acompanha sem lutar: numa luta não é unidade, e oferece este apoio. */
  support?: SupportId;
  /** O estilo de luta e o grau nele. Sem isto, fica fora do triângulo. */
  style?: { id: StyleId; grade: number };
  /** O que só ele sabe fazer, além do kit da Ordem. */
  gifts?: readonly GiftId[];
  /** Com o que ele chega: os ids das peças (ver ./mock/equipment.ts). Sem isto, o que a Ordem dele dá. */
  gear?: Equipment;
}

export const PROTAGONIST: CastMember = {
  name: "Halmira",
  race: "miraven",
  characterClass: "guardiao",
  style: { id: "mare", grade: 3 },
  // Mergulhadora: a lâmina de cortar corda, a túnica e a rede no ombro — que ela também sabe abrir em cima de alguém.
  gifts: ["net_cast"],
  gear: { weapon: "gear-lamina-de-mergulho", armor: "gear-tunica-de-linho", accessory: "gear-rede-de-coleta" },
};

/** Quem pode entrar no grupo, pela chave que o texto usa (`join_party("lish")`). */
export const COMPANIONS: Record<string, CastMember> = {
  lish: {
    name: "Lish",
    race: "kelbar",
    characterClass: "sombrilico",
    style: { id: "vies", grade: 3 },
    // A faca de lado na cintura, e o corpo fora de prumo de propósito.
    gifts: ["crooked_step"],
    gear: { weapon: "gear-faca-larga", armor: "gear-manto-de-viagem" },
  },
  // Não tem estilo de luta: o que ele tem é a maré, e ela cobra.
  varel: {
    name: "Varel",
    race: "miraven",
    characterClass: "cantor_de_ealen",
    gifts: ["tide_pull"],
    gear: { weapon: "gear-corda-de-nos", armor: "gear-tunica-de-linho" },
  },
  // Não luta: anota. A Ordem é só a cara dele no mapa, por enquanto.
  gil: { name: "Gil", race: "althirim", characterClass: "luminar", support: "annotate" },
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

/** O apoio que a ficha `character` oferece numa luta, se ela é de quem acompanha sem lutar. Undefined em quem luta. */
export function supportOf(character: Pick<Character, "id">): SupportId | undefined {
  return character.id === HERO_ID ? undefined : castOf(character)?.support;
}

/** O id, na luta e no save, de quem o texto chama de `who`: "hero" é Halmira, o resto são as chaves de COMPANIONS. Undefined se não existe. */
export function castId(who: string): string | undefined {
  if (who === HERO_ID) return HERO_ID;
  return isCompanionKey(who) ? companionId(who) : undefined;
}

/** Entra na luta como unidade? Só não entra quem acompanha sem lutar. */
export function fights(character: Pick<Character, "id">): boolean {
  return supportOf(character) === undefined;
}

export function isOrder(value: unknown): value is CharacterClass {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CLASS_INFO, value);
}

/**
 * Com o que a ficha `character` começa: o que o elenco diz dela, se ela está
 * na Ordem em que o elenco a conhece; senão, a arma e a armadura da Ordem que
 * tem (a lâmina de mergulho não serve a quem virou Cantora), com o acessório
 * que é dela. Quem não é do elenco começa com o que a Ordem dá.
 */
export function startingLoadout(character: Pick<Character, "id" | "characterClass">): Equipment {
  const member = castOf(character);
  const fromOrder = startingEquipment(character.characterClass);
  if (!member?.gear) return fromOrder;
  if (member.characterClass === character.characterClass) return { ...member.gear };
  return member.gear.accessory ? { ...fromOrder, accessory: member.gear.accessory } : fromOrder;
}

function createSheet(id: string, member: CastMember, characterClass: CharacterClass): Character {
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
    currentNodeId: MOCK_MAP_NODES[0].id,
    // Quem só acompanha não veste nada pra luta.
    ...(member.support ? {} : { equipment: startingLoadout({ id, characterClass }) }),
  };
}

/** Halmira no nível 1, com a mochila inicial e o que ela veste. `order` só difere da dela num jogo novo com Ordem destravada. */
export function createProtagonist(order: CharacterClass = PROTAGONIST.characterClass): Character {
  return { ...createSheet(HERO_ID, PROTAGONIST, order), inventory: createStartingInventory(), gear: [...STARTING_STASH] };
}

/** O que a protagonista leva guardado ao começar: o gancho de coleta, que todo mergulhador tem e que é outra arma pra quem quiser. */
export const STARTING_STASH: readonly string[] = ["gear-gancho-de-coleta"];

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
    member = { character: createSheet(companionId(key), cast, cast.characterClass), present: false };
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

/** Vida e Fôlego cheios pra todo mundo que já andou com ela, presente ou não. */
export function restoreParty(hero: Character, members: readonly PartyMember[]): void {
  for (const character of [hero, ...members.map((member) => member.character)]) {
    character.currentHp = character.maxHp;
    restoreBreath(character);
  }
}
