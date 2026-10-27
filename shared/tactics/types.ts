import type { Attributes } from "../types/attributes";
import type { CharacterClass } from "../types/characterClass";
import type { ConsumableItem, Inventory } from "../types/inventory";
import type { Grid, Pos } from "./grid";
import type { Prop } from "./props";
import type { Dice } from "./rng";
import type { ConceptId } from "../mana";
import type { ActiveStatus, StatusId } from "./statuses";
import type { StyleId } from "./styles";
import type { SupportId, Supporter } from "./supports";
import type { Surface, SurfaceId } from "./surfaces";

export type TeamId = "party" | "enemy";

/** Um atributo Tirán, ou "primary" = o primeiro atributo primário da Ordem de quem age. */
export type AttributeRef = keyof Attributes | "primary";

/**
 * O que uma habilidade FAZ a cada alvo, em ordem. Os efeitos são peças: uma
 * habilidade nova é uma lista delas, sem código novo no motor.
 */
export type Effect =
  /**
   * Dano: (atributo + dados) x multiplicador + bônus, dobrado em crítico,
   * menos metade do Couro do alvo (mínimo 1).
   */
  | {
      kind: "damage";
      dice: Dice;
      attribute?: AttributeRef;
      multiplier?: number;
      /** Soma fixa de `attribute / divisor`, arredondada pra baixo. */
      bonus?: { attribute: keyof Attributes; divisor: number };
      /** Fura a armadura: o Couro do alvo não tira nada deste dano (a guarda e a Muralha ainda seguram). */
      piercing?: boolean;
      /** Devolve a quem bate esta fração do dano que de fato entrou, como vida (arredondada pra baixo). */
      leech?: number;
    }
  /** Cura: atributo + dados, limitada ao HP que falta. */
  | { kind: "heal"; dice: Dice; attribute?: AttributeRef }
  | { kind: "status"; statusId: StatusId; turns: number }
  /**
   * Devolve Fôlego ao alvo (ver ../breath.ts), até o que ele tem descansado.
   * Negativo, TIRA: o alvo perde até esse tanto do Fôlego que tem.
   */
  | { kind: "breath"; amount: number }
  /**
   * Empurra o alvo pra longe de quem usou, até `distance` quadrados
   * (negativo puxa). Para na primeira parede ou corpo no caminho.
   */
  | { kind: "push"; distance: number };

export type AbilityCost = "action" | "bonus";

/**
 * Uma habilidade como dado. Quem ela pode mirar, de quão longe, o que
 * acontece — tudo aqui; o motor só interpreta.
 */
export interface Ability {
  id: string;
  name: string;
  /** O que a habilidade é, no mundo — não o que ela faz em números. */
  flavor: string;
  cost: AbilityCost;
  /** Alcance em quadrados. 1 = corpo a corpo; 0 = só em si mesmo. */
  range: number;
  /**
   * "tile" mira um quadrado qualquer à vista — é o que as áreas usam. "foes"
   * não mira: sai de quem usa e pega TODO inimigo de pé, onde estiver.
   */
  targets: "enemy" | "ally" | "self" | "tile" | "foes";
  /**
   * Área: atinge TODO MUNDO a até `radius` quadrados do ponto mirado,
   * aliados inclusive. Sem isto, só quem está no quadrado mirado.
   */
  radius?: number;
  /**
   * Rola d20 + atributo primário + `toHit` contra 10 + Couro do alvo, com cobertura,
   * flanco e altura por cima (ver ./attack.ts). Sem isto, sempre funciona.
   */
  attack?: { toHit: number };
  effects: Effect[];
  /**
   * Deixa uma superfície no quadrado mirado (ou na área toda) por `rounds`
   * rodadas, acerte ou erre o golpe. Ver ./surfaces.ts.
   */
  surface?: { id: SurfaceId; rounds: number };
  /** Pode ser usada como ataque de oportunidade, gastando a reação. */
  opportunity?: boolean;
  /** Quantas vezes dá pra usar numa luta. Sem isto, quantas o turno pagar. */
  limit?: number;
  /** O que ela cobra de quem usa, depois de feita: uma condição sobre ele mesmo (o fôlego que a magia leva). */
  backlash?: { statusId: StatusId; turns: number };
  /** Quanto Fôlego custa a quem usa (ver ../breath.ts). Sem isto, nada: o golpe comum não cansa. */
  breath?: number;
  /**
   * Quanta mana custa (ver ../mana.ts): é magia, e só quem conjura a usa. O
   * que passa do limite do turno de quem a usa cobra do corpo dele.
   *
   * Magia é RECITADA (`magia` §2.5): o texto lido em voz alta leva tempo. O
   * comando só a declara; ela sai no começo do turno seguinte de quem a leu, e
   * apanhar no meio pode quebrá-la (ver `Unit.reciting`). A que foi GRAVADA
   * antes (`engraved`) não tem esse tempo.
   */
  mana?: number;
  /**
   * Gravada: o texto foi escrito antes, no descanso, num objeto ou num
   * círculo no chão (ver engrave em ../world/field.ts). Na luta só se ativa — sai na hora,
   * paga a mana na ativação — e cada gravação serve uma vez.
   */
  engraved?: boolean;
  /**
   * Recarga: por quantos turnos de quem a usou ela fica sem poder ser usada
   * de novo. Com 1, não sai em dois turnos seguidos. Sem isto, volta na hora.
   */
  cooldown?: number;
}

/** O que um combatente ainda pode gastar no turno atual. */
export interface TurnResources {
  /** Quadrados de movimento restantes. */
  movement: number;
  action: boolean;
  bonus: boolean;
  /** Uma por rodada, gasta fora do próprio turno (ataque de oportunidade). */
  reaction: boolean;
}

/**
 * Como um combatente comandado pela IA pesa as próprias jogadas (ver
 * ./ai.ts). Cada peso multiplica uma parcela da nota de uma jogada: 1 é o
 * normal, 0 é "não liga pra isso". É o que faz dois inimigos com o mesmo kit
 * lutarem de jeitos diferentes.
 */
export interface AiProfile {
  /** Quanto vale ferir um inimigo. */
  aggression: number;
  /** Quanto vale a chance de DERRUBAR alguém neste golpe — é o que faz escolher o alvo ferido. */
  finisher: number;
  /** Quanto vale curar e fortalecer aliados (ele mesmo inclusive). */
  support: number;
  /** Quanto pesa o dano que pode levar: pôr-se em guarda, sair da linha de tiro, não dar as costas a quem pune. */
  caution: number;
}

/**
 * Manias de quem a IA comanda: não são pesos, são regras de comportamento
 * (ver ./ai.ts). Vêm de `quirks` na entrada do bestiário.
 */
export interface AiQuirks {
  /**
   * Só bate em quem vem atacando há pelo menos este número de turnos
   * seguidos (ver `habit.attackTurns`): o guarda que não revida ao primeiro
   * empurrão. Enquanto ninguém chega lá, anda e se defende.
   */
  retaliates?: number;
  /** O id de uma unidade: na ação do turno, repete o TIPO da última ação dela (golpe, golpe pesado, guarda...) quando tem um igual pra usar. */
  mirrors?: string;
}

/**
 * Quando uma deixa dispara:
 * - `round`: ao começar a rodada N (a 1 é a abertura da luta);
 * - `down`: quando a unidade `unit` cai;
 * - `broken`: quando o destrutível `prop` quebra;
 * - `used`: quando alguém já mexeu em TODOS os `props` (ver o comando `interact`);
 * - `defeat`: quando o grupo do jogador inteiro está no chão — NO LUGAR da
 *   derrota, que não acontece;
 * - `burst`: quando alguém passou do limite de mana num turno (o evento
 *   `manaBurst`, ver ../mana.ts).
 */
export type CueWhen =
  | { kind: "round"; round: number }
  | { kind: "down"; unit: string }
  | { kind: "broken"; prop: string }
  | { kind: "used"; props: string[] }
  | { kind: "defeat" }
  | { kind: "burst" };

/**
 * A condição que uma deixa põe em quem está na luta ao disparar: é a história
 * mexendo nas regras (o velho adianta a maré e os fiscais perdem a guarda).
 * `units` são os ids de quem a recebe; quem já caiu fica de fora.
 */
export interface CueStatus {
  statusId: StatusId;
  turns: number;
  units: string[];
}

/** Como uma deixa encerra a luta: `win` é vitória do grupo do jogador, com inimigo de pé e tudo; `stop` é a luta que para, sem vencedor. */
export type CueEnding = "win" | "stop";

/**
 * Uma deixa: o ponto de uma luta com roteiro em que alguma coisa acontece
 * fora das regras — alguém fala, uma condição cai sobre um lado, a luta acaba
 * antes de um lado cair. O motor só sabe QUANDO ela dispara, que condição ela
 * aplica e se ela encerra a luta; o que se diz nessa hora é de quem reproduz
 * o evento `cue`. Cada uma dispara uma vez só.
 */
export interface Cue {
  id: string;
  when: CueWhen;
  /** A condição que ela aplica ao disparar, logo depois do evento `cue`. */
  apply?: CueStatus;
  /** Encerra a luta ao disparar. Uma deixa `defeat` sempre encerra: sem isto, vale `stop`. */
  ends?: CueEnding;
  /**
   * Quem gasta, nessa hora, toda a mana que tem de uma vez: a pressa que o
   * roteiro impõe (o encantamento grande de Endyru no ato 3). Passa do limite
   * como qualquer gasto (`manaBurst`, a marca, o bicho que sente), sem ser
   * escolha de quem joga. Quem não tem mana, ou já caiu, não gasta nada.
   */
  burst?: string;
  /** Quem acompanha o grupo sem lutar e sai da luta nessa hora (o apoio dele some): o id da ficha. */
  dismiss?: string;
  /** A água sobe um anel nessa hora (ver Flood), conte ou não pro relógio da cheia da luta. */
  rise?: boolean;
}

/**
 * A cheia dentro da luta: de `every` em `every` rodadas (na 1 + every, na
 * 1 + 2·every...), a água come um anel da margem — todo chão seco, que não
 * barra o passo, vizinho de água vira água — até `rises` vezes. O bicho de rio
 * que estiver ali volta a ficar Submerso. `risen` conta as que já vieram
 * (as das deixas com `rise` também).
 */
export interface Flood {
  every: number;
  rises: number;
  risen: number;
}

/**
 * Um combatente dentro de uma luta. É uma CÓPIA do que importa da ficha
 * (ver unitFromCharacter em ./units.ts): a luta nunca mexe no personagem
 * salvo, e o estado inteiro continua sendo dado puro, clonável.
 */
export interface Unit {
  id: string;
  name: string;
  team: TeamId;
  characterClass: CharacterClass;
  level: number;
  attributes: Attributes;
  currentHp: number;
  maxHp: number;
  pos: Pos;
  /** Quadrados de movimento por turno, já com o peso do que veste. As condições entram por cima (ver movementOf em ./units.ts). */
  speed: number;
  /** O que a armadura soma na defesa dele: o número que a rolagem de quem o ataca precisa alcançar (ver ../equipment.ts). */
  defense?: number;
  abilities: Ability[];
  statuses: ActiveStatus[];
  inventory?: Inventory<ConsumableItem>;
  /** Pesos da IA, quando fogem do padrão. Ignorado em quem o jogador comanda. */
  ai?: Partial<AiProfile>;
  /** Manias da IA (ver AiQuirks). Ignorado em quem o jogador comanda. */
  quirks?: AiQuirks;
  /**
   * A escola de espada (ou o Baluarte de uma criatura) e a proficiência nela,
   * já limitada pelo nível de aura (ver ./styles.ts). Sem estilo, não entra no
   * triângulo nem tem traço.
   */
  style?: StyleId;
  grade?: number;
  /** O nível de aura do espadachim, 1 a 7 (ver AURA_LEVELS em ./styles.ts). Só o que a interface mostra. */
  aura?: number;
  /** A Onda: em quem ele vem acertando em seguida, e quantos golpes já pegaram. */
  streak?: { target: string; hits: number };
  /**
   * O que ele vem fazendo com a AÇÃO do turno: `now` é a habilidade usada
   * neste turno, `last` a do turno que passou, e `repeated` diz se o último
   * turno inteiro repetiu o anterior. `attackTurns` conta há quantos turnos
   * seguidos a ação dele foi um golpe. Fechado ao fim de cada turno dele.
   */
  habit?: { now?: string; last?: string; repeated: boolean; attackTurns: number };
  /** Quantas vezes já usou, nesta luta, cada habilidade que tem `limit`. */
  used?: Record<string, number>;
  /** O Fôlego que resta e o de quem está descansado (ver ../breath.ts). Na luta só volta por um efeito `breath`. */
  breath: number;
  maxBreath: number;
  /**
   * Quem conjura (ver ../mana.ts): a mana que resta e a de quem está
   * descansado, quanto ele gasta num turno sem o corpo pagar (`manaLimit`),
   * quanto já gastou desde que o turno dele começou (`manaSpent`) e o conceito,
   * que diz a marca de quem passa do limite. Quem não conjura não tem nada disto.
   */
  mana?: number;
  maxMana?: number;
  manaLimit?: number;
  manaSpent?: number;
  concept?: ConceptId;
  /**
   * O que ele está recitando (ver `mana` em Ability): a magia declarada, onde
   * foi mirada e, se mirou alguém, quem — ela segue o alvo. Sai no começo do
   * próximo turno dele; apanhar até lá pode quebrá-la.
   */
  reciting?: { abilityId: string; target: Pos; unit?: string };
  /**
   * As marcas que o corpo levou nesta luta e que saem com ele dela (as de
   * `untilRest`, ver ./statuses.ts): o mundo as passa pra história no fim.
   * Ficam aqui mesmo que ele caia, quando as condições se apagam.
   */
  marks?: StatusId[];
  /**
   * As habilidades em recarga: quantos FINS de turno dele ainda faltam pra
   * cada uma voltar. A pergunta certa é `cooldownLeft` (./units.ts).
   */
  cooldowns?: Record<string, number>;
  /**
   * Não tem vida pra perder: golpe e chão que fere não lhe tiram nada (evento
   * `immune`), e ele nunca cai. Condição e empurrão pegam normalmente. A luta
   * com um destes só acaba por uma deixa.
   */
  invulnerable?: boolean;
  /**
   * Bicho de rio (o Ykuruã): na água fica Submerso, em seco fica Em seco (ver
   * soak em ./engine.ts). Quem põe e tira as duas é o chão em que ele está.
   */
  river?: boolean;
  /** Quantos turnos dele o bicho de rio já começou em seco, desde que saiu da água: o couro racha com o tempo. */
  dryTurns?: number;
  /** O peso dele: cada empurrão ou puxão o desloca esse tanto de quadrados a menos. Bicho grande se puxa aos poucos. */
  heft?: number;
  /**
   * Sente mana gasta de uma vez: quando alguém do outro lado passa do limite
   * (`manaBurst`), ele ganha um turno a mais, logo depois da vez de quem está
   * agindo, e vai pra cima de quem conjurou (`prey`).
   */
  drawnToMana?: boolean;
  /** Atrás de quem ele vai no próximo turno: quem passou do limite de mana. Sai quando esse turno acaba. */
  prey?: string;
  turn: TurnResources;
}

/**
 * Uma luta em andamento, inteira. Dado puro (sem classe, sem função, sem
 * closure): `structuredClone(encounter)` é uma luta independente que
 * continua do mesmo ponto, com os mesmos dados por rolar.
 */
export interface Encounter {
  grid: Grid;
  /** Todos que entraram na luta — os mortos ficam aqui, com 0 de HP. */
  units: Unit[];
  /** Ids em ordem de iniciativa, rolada uma vez no começo. */
  order: string[];
  /** Posição em `order` de quem está agindo. */
  turnIndex: number;
  round: number;
  /** Os destrutíveis da luta, os já quebrados inclusive (ver ./props.ts). Os de pé estão escritos em `grid`. */
  props: Prop[];
  /** O que há no chão por cima do terreno (ver ./surfaces.ts). No máximo uma por quadrado. */
  surfaces: Surface[];
  /** As deixas que ainda não dispararam, na ordem em que foram declaradas (ver Cue). */
  cues: Cue[];
  /** Quem acompanha o grupo do jogador sem lutar, e o apoio de cada um (ver ./supports.ts). */
  supporters: Supporter[];
  /**
   * Alguém, de qualquer lado, já deu o primeiro golpe: usou uma habilidade
   * hostil (ver `isBlow` em ./targeting.ts), acertando ou não. Até lá, quem é
   * da Ipojy não levanta a mão (o voto, ver ./styles.ts).
   */
  opened?: boolean;
  /** Quantas vezes alguém já passou do limite de mana nesta luta: é o que a deixa `burst` espera. */
  bursts?: number;
  /**
   * Turnos a mais, fora da ordem (o bicho atraído pela mana, ver `drawnToMana`
   * em Unit): os ids, na fila. Cada um acontece quando a vez de quem está
   * agindo acaba, e depois a ordem segue de onde estava.
   */
  bonusTurns?: string[];
  /** De quem é o turno a mais que está acontecendo agora. Enquanto houver, é ele quem age (ver activeUnit em ./units.ts). */
  interlude?: string;
  rngState: number;
  /** Preenchido quando um dos lados acaba, ou quando uma deixa dá a vitória. Depois disso nenhum comando é aceito. */
  winner?: TeamId;
  /** Uma deixa parou a luta sem vencedor. Como `winner`, encerra tudo (ver isOver em ./units.ts). */
  stopped?: boolean;
  /** A cheia desta luta, se ela tem uma (ver Flood). */
  flood?: Flood;
  /**
   * A água já subiu nesta luta, e a grade é uma cópia da do mapa: o que a
   * cheia alaga fica na luta e não vai pro mapa da área.
   */
  ownGrid?: boolean;
}

/** O que um combatente pede pra fazer. Só quem está no turno pode pedir. */
export type Command =
  | { type: "move"; unitId: string; to: Pos }
  | { type: "ability"; unitId: string; abilityId: string; target: Pos }
  | { type: "useItem"; unitId: string; itemId: string }
  /** Mexe no objeto em `target` (um destrutível com `interact`, ver ./props.ts), colado nele. Custa a ação. */
  | { type: "interact"; unitId: string; target: Pos }
  /** Chama o apoio de quem acompanha sem lutar (ver ./supports.ts) sobre `target`. Não gasta nada de quem chama; uma vez por rodada. */
  | { type: "support"; unitId: string; supporterId: string; target: Pos }
  | { type: "endTurn"; unitId: string };

export type AttackOutcome = "hit" | "miss" | "crit" | "fumble";

/**
 * O que aconteceu, em ordem. O motor nunca anima nada: devolve esta lista
 * e a cena reproduz. Regra nova de combate vira evento novo aqui.
 */
export type TacticalEvent =
  /** `surprised` é o lado pego de surpresa, se houve emboscada. */
  | { type: "battleStarted"; order: { unit: string; initiative: number }[]; surprised?: TeamId }
  | { type: "roundStarted"; round: number }
  | { type: "turnStarted"; unit: string }
  | { type: "turnEnded"; unit: string }
  /** A vez de `unit` começou e passou sem ele agir, por causa da condição `name` (ver `skipsTurn`). */
  | { type: "turnSkipped"; unit: string; name: string }
  /** `path` não inclui `from`. Um movimento interrompido por um ataque de oportunidade vira dois destes. */
  | { type: "moved"; unit: string; from: Pos; path: Pos[] }
  /** `unit` pagou o Fôlego de uma habilidade. O `abilityUsed` dela vem logo depois. */
  | { type: "breathSpent"; unit: string; amount: number; remaining: number }
  /** `unit` recuperou Fôlego (o efeito `breath`). */
  | { type: "breathRecovered"; unit: string; amount: number; remaining: number }
  /** `unit` PERDEU Fôlego pelo golpe de outro (o efeito `breath` negativo). */
  | { type: "breathDrained"; unit: string; amount: number; remaining: number }
  /** `unit` pagou a mana de uma magia. O `abilityUsed` dela vem logo depois (ou o `manaBurst`, antes dele). */
  | { type: "manaSpent"; unit: string; amount: number; remaining: number }
  /**
   * `unit` passou do limite de mana do turno: gastou `spent` desde que a vez
   * dele começou, e o corpo aguentava `limit`. A marca do conceito dele vem
   * logo depois (`statusApplied`). É uma vez por turno: passar mais no mesmo
   * turno não dispara de novo.
   */
  | { type: "manaBurst"; unit: string; spent: number; limit: number }
  /** `unit` sentiu a mana de `caster` e vem atrás dele: ganhou um turno a mais (ver `drawnToMana` em Unit). Vem logo depois do `manaBurst`. */
  | { type: "manaDrawn"; unit: string; caster: string }
  | { type: "abilityUsed"; unit: string; abilityId: string; name: string; target: Pos; reaction: boolean }
  /** `unit` começou a recitar a magia `abilityId`, mirada em `target`: ela sai no começo do próximo turno dele. */
  | { type: "recitationStarted"; unit: string; abilityId: string; name: string; target: Pos }
  /**
   * A recitação de `unit` não saiu: `hit` é o golpe que a quebrou no meio,
   * `lost` o alvo que sumiu (caiu, saiu do alcance ou da vista), `skipped` a
   * vez que ele perdeu, e `spent` o que faltou pra pagar na hora (a mana).
   */
  | { type: "recitationBroken"; unit: string; abilityId: string; name: string; reason: "hit" | "lost" | "skipped" | "spent" }
  | {
      type: "attackRoll";
      actor: string;
      target: string;
      /** O d20 puro. */
      natural: number;
      total: number;
      defense: number;
      outcome: AttackOutcome;
      /** A posição, já contada em `total` e `defense` (ver ./attack.ts). */
      cover: boolean;
      flanked: boolean;
      height: -1 | 0 | 1;
      /** O confronto de estilos: 1 = quem ataca leva vantagem, -1 = desvantagem (ver ./styles.ts). */
      style: -1 | 0 | 1;
    }
  | { type: "blocked"; unit: string; amount: number }
  /**
   * O traço da escola de `unit` pesou no golpe em `target`: `wave` é a Onda
   * do Gryskar (com `hits` golpes seguidos somando no dano) e `crack` a
   * Rachadura da Tsvirana (o alvo se repetiu e o dano dobrou) — o `damage`
   * vem logo depois. `counter` é o Contragolpe da Ipojy: `target` o atacou e
   * errou, e o `abilityUsed` (de reação) de `unit` contra ele vem logo depois.
   */
  | { type: "styleTrait"; unit: string; target: string; trait: "wave" | "crack" | "counter"; name: string; hits?: number }
  | { type: "damage"; target: string; amount: number; remainingHp: number }
  /** O golpe pegou em quem não tem vida pra perder (`invulnerable`): nada acontece. */
  | { type: "immune"; target: string }
  | { type: "heal"; target: string; amount: number; remainingHp: number }
  /** Uma cura ia pegar em `target` e não pegou, por causa da condição `name` (ver `noHeal`). */
  | { type: "healDenied"; target: string; name: string }
  /** A condição `name` feriu `unit` no começo do turno dele (ver `harm`). O `damage` vem logo depois. */
  | { type: "statusTriggered"; unit: string; statusId: string; name: string }
  | { type: "pushed"; unit: string; from: Pos; to: Pos }
  | { type: "statusApplied"; target: string; statusId: string; name: string; turns: number }
  | { type: "statusExpired"; target: string; statusId: string; name: string }
  | { type: "surfaceCreated"; surfaceId: SurfaceId; name: string; tiles: Pos[]; rounds: number }
  | { type: "surfaceExpired"; surfaceId: SurfaceId; name: string; tiles: Pos[] }
  /** A superfície pegou alguém (entrou nela ou começou o turno nela). O `damage` vem logo depois. */
  | { type: "surfaceTriggered"; unit: string; surfaceId: SurfaceId; name: string }
  | { type: "propDamaged"; prop: string; name: string; pos: Pos; amount: number; remainingHp: number }
  | { type: "propDestroyed"; prop: string; name: string; pos: Pos }
  /** `unit` mexeu no objeto `prop`; `verb` é o que se faz com ele ("Tocar"). */
  | { type: "propUsed"; unit: string; prop: string; name: string; verb: string; pos: Pos }
  | { type: "itemUsed"; unit: string; itemId: string; itemName: string; description: string }
  /** `supporter` (que não luta) deu o apoio dele, chamado por `unit`. O que o apoio fez vem logo depois. */
  | { type: "supportUsed"; supporter: string; supporterName: string; support: SupportId; name: string; unit: string }
  /** Quem acompanhava o grupo sem lutar saiu da luta por uma deixa (`dismiss`): o apoio dele não está mais lá. */
  | { type: "supporterLost"; id: string }
  /** A água subiu: estes quadrados, que eram secos, agora são água (ver Flood). */
  | { type: "waterRose"; tiles: Pos[] }
  /**
   * O que `unit` pretende fazer na vez dele, pelo que a luta é agora: onde
   * parar (`tile`; o próprio quadrado se não vai andar), que habilidades usar
   * de lá e em quê, e que item. Com `skips`, ele vai perder a vez.
   */
  | {
      type: "intentRevealed";
      unit: string;
      tile: Pos;
      abilities: { abilityId: string; name: string; target: Pos }[];
      item?: string;
      skips?: boolean;
    }
  | { type: "death"; unit: string }
  /** A deixa `id` disparou. Se ela encerra a luta, o `battleEnded` vem logo depois. */
  | { type: "cue"; id: string }
  /** Sem `winner`, a luta parou sem vencedor (uma deixa `stop`). */
  | { type: "battleEnded"; winner?: TeamId };

/** Por que um comando foi recusado. Um comando recusado não muda nada na luta. */
export type CommandError =
  | "battle_over"
  | "not_your_turn"
  | "unreachable"
  | "unknown_ability"
  | "resource_spent"
  /** Falta Fôlego pra habilidade. */
  | "no_breath"
  /** Falta mana pra magia (ou quem a pediu não conjura). */
  | "no_mana"
  /** Já está recitando outra magia: uma de cada vez. */
  | "reciting"
  /** A habilidade ainda está em recarga. */
  | "recharging"
  | "invalid_target"
  | "item_unavailable";

export type CommandResult = { ok: true; events: TacticalEvent[] } | { ok: false; reason: CommandError };
