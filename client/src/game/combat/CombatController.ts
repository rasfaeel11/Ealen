import * as Phaser from "phaser";
import {
  CONCEPTS,
  COVER_DEFENSE,
  FLANK_TO_HIT,
  HEAL_PER_BREATH,
  HEIGHT_TO_HIT,
  PROPS,
  STATUSES,
  STYLE_TO_HIT,
  SUPPORTS,
  SURFACES,
  abilityTargets,
  activeUnit,
  applyCommand,
  attackOdds,
  chooseCommand,
  findPath,
  findUnit,
  interactTargets,
  itemTargets,
  isThrown,
  findInventorySlot,
  type ConsumableItem,
  ITEM_REACH,
  isAlive,
  isBlow,
  isOver,
  isRecited,
  isSworn,
  pixelOfTile,
  propAt,
  propTemplate,
  tileAt,
  reachableTiles,
  readiness,
  readyable,
  samePos,
  styleLabel,
  supportTargets,
  tileOfPixel,
  unitAt,
  vowForbids,
  cooldownLeft,
  type Ability,
  HERO_ID,
  LIFT_SHARE,
  LONG_SHOT_TO_HIT,
  POINT_BLANK_TO_HIT,
  liftable,
  type AreaMap,
  type AttackOutcome,
  type Command,
  type CommandError,
  type AiOrder,
  type DamageType,
  type CueWhen,
  type Encounter,
  type PixelPos,
  type Pos,
  type StatusId,
  type StatusTemplate,
  type Supporter,
  type SurfaceId,
  type TacticalEvent,
  type TeamId,
  type Unit,
} from "@jogo/shared";
import { sfx } from "../audio";
import { COLORS, TEXT_COLORS } from "../config";
import { setOption, settings } from "../settings";
import type { PartyEntry } from "../hud/PartyColumn";
import { abilityIcon, itemIcon } from "../icons";
import type { MapActor } from "../MapActor";
import { standingFrame } from "../mapSprites";
import { portraitRef, type FaceRef } from "../ui";
import { CombatHud, type ActionButton, type AddHud } from "./CombatHud";
import { drawArea, drawBrackets, drawReach, drawStop, drawTrail } from "./marks";

/** O que a cena do mundo empresta ao combate. */
export interface CombatHost {
  scene: Phaser.Scene;
  map: AreaMap;
  /** Quem está na luta, pelo id da unidade — e quem a acompanha sem lutar, pelo id do apoio. */
  actors: Map<string, MapActor>;
  /** A imagem de cada destrutível de pé na área, pelo id. O combate apaga a de quem quebrar. */
  props: Map<string, Phaser.GameObjects.Image>;
  /** Põe um objeto na cena de modo que só a câmera do mundo o desenhe. */
  addWorld: <T extends Phaser.GameObjects.GameObject>(object: T) => T;
  addHud: AddHud;
  /** Uma deixa do roteiro da luta disparou: a cena faz o que ela pede (uma fala) e a luta espera. */
  onCue: (id: string) => Promise<void>;
  /** Uma rodada virou (da segunda em diante): é quando o tempo da história anda sozinho no meio da luta. */
  onRound?: (round: number) => void;
  /** Os objetivos da luta: o texto de cada deixa que tem um (`goal` no mapa), pelo id dela. */
  goals?: { cue: string; text: string }[];
  /** A altura da tela em que o registro começa: embaixo do relógio, quando há relógio. */
  logTop: number;
}

/** As condições de uma unidade como a coluna do grupo as mostra. O que atrapalha vem em vermelho. */
function statusChips(unit: Unit): NonNullable<PartyEntry["statuses"]> {
  return unit.statuses.map((status) => {
    const note = describeStatus(status);
    const bad =
      status.skipsTurn === true ||
      status.harm !== undefined ||
      status.hunger === true ||
      status.noHeal === true ||
      (status.toHit ?? 0) < 0 ||
      (status.speed ?? 0) < 0 ||
      (status.damageTaken ?? 0) > 0 ||
      Object.values(status.attributeBonus ?? {}).some((points) => (points ?? 0) < 0);
    return { name: status.name, bad, note: note || undefined };
  });
}

/** Entre o chão e tudo que fica de pé: as marcas no chão passam por baixo de árvores e personagens. */
const OVERLAY_DEPTH = 0;
/** Faíscas e anéis ficam por cima de quem está de pé, abaixo das barras de vida. */
const FX_DEPTH = 1_500_000;
const STEP_MS = 110;
const ENEMY_THINK_MS = 380;
/** Quanto dura na tela a vez de quem a perdeu (surpreso). */
const SKIPPED_TURN_MS = 420;
/** Quanto tempo o que um inimigo vai atingir fica marcado antes do golpe. */
const ENEMY_TELEGRAPH_MS = 300;
/** A pausa de um golpe que pega, e a de um que pega forte (crítico ou fatal). */
const HIT_STOP_MS = 55;
const HEAVY_HIT_STOP_MS = 120;

const COLOR_MOVE = 0x6fa8dc;
const COLOR_TARGET = 0xe0566c;
const COLOR_ALLY = 0x7fb069;
/** Os objetos em que dá pra mexer. */
const COLOR_USE = 0xe0b85a;
/** A cor de cada superfície no chão. */
const SURFACE_COLOR: Record<SurfaceId, number> = { fire: 0xe8792b, frost: 0x9fd8e8 };
/** A água que a cheia trouxe pra dentro da luta: barrenta, como a do Ymonhã. */
const FLOOD_COLOR = 0x4f6f6a;
/** A água que a mana gasta de uma vez sacode, do mago até o bicho que a sente. */
const COLOR_WATER = 0x9fd8e8;
/** A marca de atração e repulsão é sangue pelo nariz: quem a carrega pinga. */
const NOSEBLEED: string = CONCEPTS.atracao_repulsao.mark;

/** A tecla que troca o modo da luta (manual ou automático). */
const MODE_KEY = "KeyG";

/** A ordem de um companheiro, em palavras. Mirar alguém que já caiu é o mesmo que avançar. */
function orderLabel(order: AiOrder | undefined, encounter: Encounter): string {
  const name = (id: string) => encounter.units.find((unit) => unit.id === id)?.name ?? "alguém";
  if (order?.kind === "hold") return "segurar posição";
  if (order?.kind === "guard") return `proteger ${name(order.unit)}`;
  if (order?.kind === "focus" && encounter.units.some((unit) => unit.id === order.unit && isAlive(unit))) return `mirar ${name(order.unit)}`;
  return "avançar";
}

/** O ícone da ordem, no botão do companheiro. */
function orderIcon(order: AiOrder | undefined): "shield" | "grip" | "sword" | "move" {
  if (order?.kind === "hold") return "shield";
  if (order?.kind === "guard") return "grip";
  if (order?.kind === "focus") return "sword";
  return "move";
}

/** O tipo de um dano, como a linha da habilidade o diz. */
const DAMAGE_LABEL: Record<DamageType, string> = {
  corte: "corte",
  perfuracao: "perfuração",
  impacto: "impacto",
  atracao_repulsao: "atração e repulsão",
};

const ERROR_TEXT: Record<CommandError, string> = {
  battle_over: "A luta já acabou.",
  not_your_turn: "Não é a sua vez.",
  unreachable: "Não dá pra chegar lá neste turno.",
  unknown_ability: "Habilidade desconhecida.",
  resource_spent: "Você já gastou isso neste turno.",
  no_breath: "Falta Fôlego pra isso.",
  no_mana: "Falta mana pra isso.",
  reciting: "Já está recitando: uma magia de cada vez.",
  recharging: "Ainda está em recarga.",
  silenced: "Calado: não sai magia nenhuma.",
  invalid_target: "Alvo fora de alcance ou fora de vista.",
  item_unavailable: "Esse item não está na mochila.",
};

/** O que uma condição faz a quem a carrega, pelas marcas dela: "Couro -3", "esquiva +4", "1d4 de dano por turno"... */
export function describeStatus(status: StatusTemplate): string {
  const notes: string[] = [];
  for (const [stat, points] of Object.entries(status.attributeBonus ?? {})) {
    notes.push(`${stat.charAt(0).toUpperCase()}${stat.slice(1)} ${points > 0 ? "+" : ""}${points}`);
  }
  if (status.guard) notes.push("bloqueia parte de cada golpe");
  if (status.evasion) notes.push(`esquiva +${status.evasion}`);
  if (status.toHit) notes.push(`acerto ${status.toHit > 0 ? "+" : ""}${status.toHit}`);
  if (status.damageTaken) notes.push(status.damageTaken > 0 ? `sofre +${status.damageTaken} por golpe` : `sofre ${status.damageTaken} por golpe`);
  if (status.harm) notes.push(`${status.harm.count}d${status.harm.sides} de dano por turno`);
  if (status.speed) notes.push(`movimento ${status.speed > 0 ? "+" : ""}${status.speed}`);
  if (status.immovable) notes.push("nada o tira do lugar");
  if (status.noHeal) notes.push("não pode ser curado");
  if (status.silenced) notes.push("não conjura");
  if (status.hunger) notes.push("a cura custa o dobro de Fôlego");
  if (status.untilRest) notes.push("até o descanso");
  if (status.guaranteedCrit) notes.push("o próximo golpe é crítico");
  if (status.breaksGuard) notes.push("derruba a guarda");
  if (status.skipsTurn) notes.push("perde a vez");
  return notes.join(", ");
}

/** O que uma habilidade faz, em uma linha — pra quem vai decidir se usa. */
export function describeAbility(ability: Ability): string {
  const parts: string[] = [ability.cost === "action" ? "Ação" : "Ação bônus"];

  if (ability.targets === "self") parts.push("em si");
  else if (ability.targets === "foes") parts.push("todo inimigo de pé");
  else if (ability.others) parts.push("num aliado colado");
  else parts.push(ability.range === 1 ? "corpo a corpo" : `alcance ${ability.range}`);
  if (ability.radius !== undefined) {
    const side = ability.radius * 2 + 1;
    parts.push(`área ${side}x${side} (acerta aliados)`);
  }
  if (ability.attack) parts.push(`acerto ${ability.attack.toHit >= 0 ? "+" : ""}${ability.attack.toHit}`);

  for (const effect of ability.effects) {
    if (effect.kind === "damage") {
      const dice = `${effect.dice.count}d${effect.dice.sides}`;
      parts.push(effect.multiplier ? `dano ${dice} x${effect.multiplier}` : `dano ${dice}`);
      if (effect.type) parts.push(DAMAGE_LABEL[effect.type]);
      if (effect.piercing) parts.push("fura a armadura");
      if (effect.leech) parts.push(effect.leech === 1 ? "devolve como vida o que tirar" : `devolve ${Math.round(effect.leech * 100)}% como vida`);
    } else if (effect.kind === "heal") {
      parts.push(`cura ${effect.dice.count}d${effect.dice.sides}, e quem recebe paga 1 de Fôlego a cada ${HEAL_PER_BREATH} (o dobro com fome)`);
    } else if (effect.kind === "status") {
      const status = STATUSES[effect.statusId];
      const what = describeStatus(status);
      const span = effect.turns === 1 ? "até o próximo turno" : `por ${effect.turns} turnos`;
      parts.push(effect.statusId === "guarding" ? "em guarda até o próximo turno" : `${status.name} ${span}${what ? ` (${what})` : ""}`);
    }
    else if (effect.kind === "breath") parts.push(effect.amount < 0 ? `tira ${-effect.amount} de Fôlego do alvo` : `devolve ${effect.amount} de Fôlego`);
    else if (effect.kind === "stride") parts.push("anda o passo inteiro de novo neste turno");
    else parts.push(effect.distance > 0 ? `empurra ${effect.distance}` : `puxa ${-effect.distance}`);
  }
  if (ability.surface) parts.push(`deixa ${SURFACES[ability.surface.id].name} por ${ability.surface.rounds} rodadas`);
  if (ability.limit !== undefined) parts.push(ability.limit === 1 ? "uma vez por luta" : `${ability.limit} vezes por luta`);
  if (ability.breath) parts.push(`custa ${ability.breath} de Fôlego`);
  if (ability.mana) parts.push(`custa ${ability.mana} de mana`);
  if (ability.engraved) parts.push("gravada: sai na hora, uma vez");
  else if (isRecited(ability)) parts.push("recitada: sai no começo do seu próximo turno, e apanhar no meio pode quebrar");
  if (ability.cooldown) parts.push(ability.cooldown === 1 ? "não sai em dois turnos seguidos" : `recarga de ${ability.cooldown} turnos`);
  if (ability.backlash) parts.push(`cobra de você: ${STATUSES[ability.backlash.statusId].name}`);
  return parts.join(" · ");
}

/** O que a posição e o confronto de escolas fizeram a um ataque, em palavras: "flanqueado +2", "cobertura +2 na defesa"... */
function describeEdge(edge: { cover: boolean; flanked: boolean; height: -1 | 0 | 1; style: -1 | 0 | 1; styleToHit?: number; far?: boolean; crowded?: boolean }): string[] {
  const notes: string[] = [];
  const style = Math.abs(edge.styleToHit ?? STYLE_TO_HIT);
  if (edge.style > 0) notes.push(`escola leva vantagem +${style}`);
  if (edge.style < 0) notes.push(`escola em desvantagem -${style}`);
  if (edge.flanked) notes.push(`flanqueado +${FLANK_TO_HIT}`);
  if (edge.height > 0) notes.push(`de cima +${HEIGHT_TO_HIT}, por cima da mureta`);
  if (edge.height < 0) notes.push(`de baixo -${HEIGHT_TO_HIT}`);
  if (edge.cover) notes.push(`cobertura +${COVER_DEFENSE} na defesa`);
  if (edge.far) notes.push(`longe -${LONG_SHOT_TO_HIT}`);
  if (edge.crowded) notes.push(`atirando colado -${POINT_BLANK_TO_HIT}`);
  return notes;
}

/**
 * Uma luta acontecendo no mapa. Faz duas coisas e nenhuma regra:
 *
 * - ENTRADA: transforma cliques e teclas num `Command` e entrega ao motor.
 *   O que dá pra clicar (quadrados alcançáveis, alvos válidos) é perguntado
 *   ao próprio motor, então a interface nunca oferece o que ele recusaria.
 * - SAÍDA: reproduz, um por um, os eventos que o motor devolve.
 *
 * Os turnos dos inimigos passam pelo mesmo caminho, com a IA no lugar do
 * clique.
 */
export class CombatController {
  private readonly hud: CombatHud;
  /** As superfícies no chão, como os eventos as foram deixando — não como o motor já as tem no fim da jogada. */
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly surfaces = new Map<string, { pos: Pos; id: SurfaceId }>();
  /** O chão que a cheia alagou nesta luta (`waterRose`): o mapa desenha seco, a luta o pinta de água por cima. */
  private readonly flooded: Pos[] = [];
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly cursor: Phaser.GameObjects.Graphics;
  /** Os quadrados que o inimigo da vez está prestes a atingir. */
  private readonly intent: Phaser.GameObjects.Graphics;
  /** O golpe em andamento: de quem veio e como saiu a última rolagem. É o que dá peso ao dano que vem depois. */
  private blow: { actor?: string; target?: string; outcome?: AttackOutcome } = {};
  /** Verdadeiro enquanto eventos estão sendo reproduzidos ou um inimigo joga: a entrada fica surda. */
  private busy = true;
  /** A habilidade escolhida; null = modo de movimento. */
  private selected: Ability | null = null;
  /** Mirando outra coisa que não uma habilidade: um objeto pra mexer (`interact`) ou o alvo de um apoio (`support`). */
  private aim:
    | { kind: "interact" }
    | { kind: "support"; supporter: Supporter }
    | { kind: "item"; itemId: string; name: string; thrown: boolean }
    | { kind: "order"; unitId: string }
    /** Preparar: escolhe-se depois QUAL habilidade fica pronta (um dos botões dela). */
    | { kind: "ready" }
    | null = null;
  /** O que cada inimigo anotado pretende fazer na vez dele: onde parar e o que vai atingir. Some quando a vez dele passa. */
  private readonly foreseen = new Map<string, { tile: Pos; areas: { target: Pos; radius: number }[] }>();
  private readonly foresight: Phaser.GameObjects.Graphics;
  /** A marca no chão de quem está sob o mouse, na ordem dos turnos. */
  private readonly hoverMark: Phaser.GameObjects.Graphics;
  /** Os objetivos ainda em aberto: as deixas com `goal` que não dispararam. */
  private goals: { id: string; text: string; when: CueWhen }[] = [];
  /** A rodada e os objetos usados como os eventos os mostraram até agora — é o que os objetivos contam. */
  private shownRound = 1;
  private readonly usedProps = new Set<string>();
  /** Os quadrados clicáveis no modo atual. Não se desenham todos: ver `drawOptions`. */
  private options: Pos[] = [];
  private hover: Pos | null = null;
  /** Onde o cursor está na TELA: é onde a etiqueta dele aparece. */
  private chipAt?: { x: number; y: number };

  constructor(
    private readonly host: CombatHost,
    private readonly encounter: Encounter,
    /** Sem `winner`, a luta parou sem vencedor (uma deixa a encerrou). */
    private readonly onEnd: (winner: TeamId | undefined) => void,
  ) {
    const { scene } = host;
    this.hud = new CombatHud(scene, host.addHud, host.logTop, (unit) => this.faceOf(unit));
    this.hud.onHoverUnit = (unit) => this.markUnit(unit);
    this.drawMode();
    this.ground = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH - 1));
    scene.tweens.add({ targets: this.ground, alpha: { from: 1, to: 0.6 }, duration: 650, yoyo: true, repeat: -1 });
    this.overlay = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH));
    this.cursor = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 1));
    this.intent = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 2));
    this.foresight = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 2));
    this.hoverMark = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 3));

    // Quem não tem vida pra perder não mostra barra de vida.
    for (const unit of encounter.units) {
      if (!unit.invulnerable) host.actors.get(unit.id)?.setHp(unit.currentHp, unit.maxHp);
      // O que já vem no corpo: o bicho na água ou em seco, a marca de uma luta anterior.
      for (const status of unit.statuses) this.wear(unit.id, status.id, true);
    }
    this.goals = encounter.cues.flatMap((cue) => {
      const goal = host.goals?.find((candidate) => candidate.cue === cue.id);
      return goal ? [{ id: cue.id, text: goal.text, when: cue.when }] : [];
    });
    this.refreshGoals();

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.on("keydown", this.onKey, this);
    // A velocidade das opções vale pra tudo que anda durante a luta: os golpes, as esperas e a vez dos inimigos.
    this.setSpeed(settings().animSpeed);
  }

  private setSpeed(speed: number): void {
    const { scene } = this.host;
    scene.tweens.timeScale = speed;
    scene.time.timeScale = speed;
    scene.anims.globalTimeScale = speed;
  }

  private shake(ms: number, intensity: number): void {
    if (settings().shake) this.host.scene.cameras.main.shake(ms, intensity);
  }

  /** Reproduz a abertura da luta (iniciativa, primeiro turno) e entrega a vez a quem for. */
  async start(events: TacticalEvent[]): Promise<void> {
    for (const actor of this.host.actors.values()) actor.setAlert(true);
    const ambush = events.some((event) => event.type === "battleStarted" && event.surprised === "enemy");
    this.hud.log(ambush ? "Emboscada! Eles perdem a primeira vez." : "Combate!");
    await this.play(events);
    await this.proceed();
  }

  /** Onde cada um está agora, em quadrados: quem luta dentro de uma casa tira o telhado dela da frente. */
  positions(): Pos[] {
    return this.encounter.units.map((unit) => unit.pos);
  }

  showResult(title: string, lines: string[], titleColor: string): Promise<void> {
    return this.hud.showResult(title, lines, titleColor);
  }

  destroy(): void {
    const { scene } = this.host;
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.off("keydown", this.onKey, this);

    this.setSpeed(1);
    for (const actor of this.host.actors.values()) {
      actor.hideHp();
      actor.setTurn(false);
      actor.setBleeding(false);
      actor.setAlert(false);
    }
    scene.tweens.killTweensOf(this.ground);
    this.ground.destroy();
    this.overlay.destroy();
    this.cursor.destroy();
    this.intent.destroy();
    this.foresight.destroy();
    this.hoverMark.destroy();
    this.hud.destroy();
  }

  // ----------------------------------------------------------------- fluxo

  /** Entrega um comando do jogador ao motor e reproduz o que aconteceu. */
  private async issue(command: Command): Promise<void> {
    if (this.busy) return;

    const result = applyCommand(this.encounter, command);
    if (!result.ok) {
      sfx("deny");
      this.hud.warn(ERROR_TEXT[result.reason]);
      return;
    }

    this.busy = true;
    this.clearHighlights();
    await this.play(result.events);
    await this.proceed();
  }

  /** Joga os turnos dos inimigos até a vez voltar pro jogador (ou a luta acabar). */
  private async proceed(): Promise<void> {
    const { encounter } = this;

    while (!isOver(encounter) && this.playsItself(activeUnit(encounter))) {
      this.refreshHud();
      const command = chooseCommand(encounter);
      await this.wait(ENEMY_THINK_MS);
      if (command.type === "ability") await this.telegraph(command.abilityId, command.target);

      let result = applyCommand(encounter, command);
      // Uma IA que peça o impossível não pode travar a luta: perde a vez.
      if (!result.ok) result = applyCommand(encounter, { type: "endTurn", unitId: activeUnit(encounter)!.id });
      if (!result.ok) break;
      await this.play(result.events);
    }

    if (isOver(encounter)) {
      this.refreshRoster();
      this.onEnd(encounter.winner);
      return;
    }

    this.busy = false;
    this.selected = null;
    this.aim = null;
    this.refresh();
  }

  /**
   * Troca o modo da luta: manual, o jogador comanda o grupo inteiro; automático,
   * a IA comanda os companheiros e o jogador só Endyru. Vale na hora: se a vez é
   * de um companheiro, ela passa pra IA (ou volta pro jogador no próximo comando).
   */
  private toggleMode(): void {
    setOption("companionsAuto", !settings().companionsAuto);
    sfx("uiSelect");
    this.drawMode();
    if (this.busy || isOver(this.encounter)) return;
    if (this.playsItself(activeUnit(this.encounter))) {
      this.busy = true;
      this.clearHighlights();
      void this.proceed();
    } else {
      this.refresh();
    }
  }

  private drawMode(): void {
    const auto = settings().companionsAuto;
    this.hud.setMode(`Modo: ${auto ? "automático" : "manual"}  ·  ${MODE_KEY.slice(3)}`, () => this.toggleMode());
  }

  /** A vez que o jogador não comanda: a do outro lado e, se as opções pedem, a dos companheiros. */
  private playsItself(unit: Unit | undefined): boolean {
    if (!unit) return false;
    return unit.team === "enemy" || (settings().companionsAuto && unit.id !== HERO_ID);
  }

  // --------------------------------------------------------------- entrada

  private select(ability: Ability | null): void {
    if (this.busy) return;
    const unit = activeUnit(this.encounter)!;

    // Habilidade em si mesmo, ou que pega todo inimigo, não tem o que mirar: dispara na hora.
    if (ability?.targets === "self" || ability?.targets === "foes") {
      void this.issue({ type: "ability", unitId: unit.id, abilityId: ability.id, target: unit.pos });
      return;
    }
    sfx(ability ? "uiSelect" : "uiCancel");
    this.selected = ability;
    this.aim = null;
    this.refresh();
  }

  /** O botão de Preparar: os botões das habilidades passam a ser o que fica pronto. De novo, volta ao normal. */
  private chooseReady(): void {
    if (this.busy) return;
    sfx(this.aim?.kind === "ready" ? "uiCancel" : "uiSelect");
    this.selected = null;
    this.aim = this.aim?.kind === "ready" ? null : { kind: "ready" };
    this.refresh();
  }

  /** O botão de um apoio: escolhe-se depois em quem (um inimigo de pé). */
  private chooseSupport(supporter: Supporter): void {
    if (this.busy) return;
    sfx("uiSelect");
    this.selected = null;
    this.aim = { kind: "support", supporter };
    this.refresh();
  }

  /**
   * O botão de um item: sem aliado ao alcance, usa em si na hora; com, deixa escolher em quem (ele mesmo incluso).
   * O que se joga sempre pede o inimigo.
   */
  private chooseItem(item: ConsumableItem): void {
    if (this.busy) return;
    const unit = activeUnit(this.encounter)!;
    const thrown = isThrown(item);
    if (!thrown && itemTargets(this.encounter, unit).length === 1) {
      void this.issue({ type: "useItem", unitId: unit.id, itemId: item.id });
      return;
    }
    sfx("uiSelect");
    this.selected = null;
    this.aim = { kind: "item", itemId: item.id, name: item.name, thrown };
    this.refresh();
  }

  /**
   * O botão da ordem de um companheiro: escolhe-se depois em quem — nele mesmo,
   * segurar posição; num aliado, proteger; num inimigo, mirar só nele. Clicar no
   * botão de novo manda avançar.
   */
  private chooseOrder(companion: Unit): void {
    if (this.busy) return;
    const unit = activeUnit(this.encounter)!;
    if (this.aim?.kind === "order" && this.aim.unitId === companion.id) {
      void this.issue({ type: "order", unitId: unit.id, targetId: companion.id, order: { kind: "advance" } });
      return;
    }
    sfx("uiSelect");
    this.selected = null;
    this.aim = { kind: "order", unitId: companion.id };
    this.refresh();
  }

  /** A ordem que clicar em `target` dá a `companion`. */
  private orderFor(companion: Unit, target: Unit): AiOrder {
    if (target === companion) return companion.order?.kind === "hold" ? { kind: "advance" } : { kind: "hold" };
    return target.team === companion.team ? { kind: "guard", unit: target.id } : { kind: "focus", unit: target.id };
  }

  /** O botão de mexer: com um objeto só ao alcance, mexe nele; com mais de um, deixa escolher. */
  private chooseInteract(): void {
    if (this.busy) return;
    const unit = activeUnit(this.encounter)!;
    const targets = interactTargets(this.encounter, unit);
    if (targets.length === 1) {
      void this.issue({ type: "interact", unitId: unit.id, target: targets[0].pos });
      return;
    }
    sfx("uiSelect");
    this.selected = null;
    this.aim = { kind: "interact" };
    this.refresh();
  }

  private endTurn(): void {
    const unit = activeUnit(this.encounter);
    if (unit) void this.issue({ type: "endTurn", unitId: unit.id });
  }

  private onKey(event: KeyboardEvent): void {
    // O modo se troca a qualquer hora, até no meio da vez de um companheiro.
    if (event.code === MODE_KEY) {
      this.toggleMode();
      return;
    }
    if (this.busy) return;

    if (event.code.startsWith("Digit")) this.hud.press((Number(event.code.slice(5)) + 9) % 10);
    else if (event.code === "Space" || event.code === "Enter") this.endTurn();
    else if (event.code === "Escape") this.select(null);
  }

  private tileUnder(pointer: Phaser.Input.Pointer): Pos {
    const point = this.host.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return tileOfPixel(this.host.map, point);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // Em cima de um botão a explicação é dele, não do quadrado que está embaixo.
    if (over.length > 0) {
      this.hud.setChip("");
      return;
    }
    const tile = this.tileUnder(pointer);
    this.chipAt = { x: pointer.x, y: pointer.y };
    if (this.hover && samePos(this.hover, tile)) {
      this.drawChip();
      return;
    }
    this.hover = tile;
    this.drawCursor();
  }

  /** Junto do cursor: a chance de acertar quem está na mira, ou quem é quem está ali. */
  private drawChip(): void {
    const unit = activeUnit(this.encounter);
    const under = !this.busy && this.hover ? unitAt(this.encounter, this.hover) : undefined;
    if (!unit || !under || !this.chipAt) {
      this.hud.setChip("");
      return;
    }
    const aiming = this.selected;
    const inRange = this.options.some((option) => samePos(option, this.hover!));
    if (aiming?.attack && aiming.radius === undefined && inRange && !under.invulnerable) {
      const odds = attackOdds(this.encounter, unit, aiming, under);
      this.hud.setChip(`${Math.round((odds.hit + odds.crit) * 100)}%  ·  ${under.name}`, this.chipAt.x, this.chipAt.y);
      return;
    }
    const life = under.invulnerable ? "" : `  ${under.currentHp}/${under.maxHp}`;
    this.hud.setChip(`${under.name}${life}`, this.chipAt.x, this.chipAt.y);
  }

  /** Marca no mapa quem está sob o mouse, na ordem dos turnos. */
  private markUnit(unit: Unit | null): void {
    this.hoverMark.clear();
    if (unit) drawBrackets(this.hoverMark, unit.pos, this.host.map.tileSize, COLORS.goldBright, 1);
  }

  /** O rosto de quem luta: o retrato pelo nome; sem retrato, o quadro parado do boneco no mapa. */
  private faceOf(unit: Unit): FaceRef {
    const portrait = portraitRef(this.host.scene, unit.name);
    if (portrait) return portrait;
    const sheet = this.actor(unit.id)?.sheetKey;
    return sheet ? { key: sheet, frame: standingFrame("down") } : { key: "__DEFAULT" };
  }

  /** O grupo e a ordem dos turnos, como a luta os deixou agora. */
  private refreshRoster(): void {
    const { encounter } = this;
    const active = activeUnit(encounter);
    this.hud.setTurnOrder(encounter);
    const entries: PartyEntry[] = encounter.units
      .filter((unit) => unit.team === "party")
      .map((unit) => ({
        id: unit.id,
        name: unit.name,
        face: this.faceOf(unit),
        level: unit.level,
        hp: { now: unit.currentHp, max: unit.maxHp },
        breath: { now: unit.breath, max: unit.maxBreath },
        mana: unit.mana !== undefined ? { now: unit.mana, max: unit.maxMana ?? unit.mana } : undefined,
        active: unit === active,
        down: !isAlive(unit),
        statuses: statusChips(unit),
        calling: unit.style ? styleLabel(unit) : undefined,
      }));
    // Quem acompanha sem lutar fica no fim: mostra se o apoio dele ainda vale nesta rodada.
    for (const supporter of encounter.supporters) {
      entries.push({
        id: supporter.id,
        name: supporter.name,
        face: portraitRef(this.host.scene, supporter.name) ?? { key: "__DEFAULT" },
        support: { name: SUPPORTS[supporter.support].name, ready: supporter.ready },
      });
    }
    this.hud.setParty(entries);
  }

  /** O que a barra mostra de `unit`. Sem `withTurn`, a vez é do outro lado e os recursos do turno não são da conta de ninguém. */
  private resourcesOf(unit: Unit, withTurn: boolean) {
    return {
      name: unit.name,
      style: unit.style ? styleLabel(unit) : undefined,
      face: this.faceOf(unit),
      hp: unit.currentHp,
      maxHp: unit.maxHp,
      turn: withTurn
        ? {
            movement: unit.turn.movement,
            speed: unit.speed,
            action: unit.turn.action,
            bonus: unit.turn.bonus,
            breath: unit.breath,
            maxBreath: unit.maxBreath,
            mana:
              unit.mana !== undefined
                ? { now: unit.mana, max: unit.maxMana ?? unit.mana, spent: unit.manaSpent ?? 0, limit: unit.manaLimit ?? 0 }
                : undefined,
          }
        : undefined,
    };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // Clique num botão da interface não é clique no mapa.
    if (this.busy || over.length > 0) return;
    if (pointer.rightButtonDown()) {
      this.select(null);
      return;
    }

    const unit = activeUnit(this.encounter)!;
    const tile = this.tileUnder(pointer);
    if (!this.options.some((option) => samePos(option, tile))) {
      if (this.selected || this.aim) {
        sfx("deny");
        this.hud.warn(ERROR_TEXT.invalid_target);
      }
      return;
    }

    if (this.aim?.kind === "interact") void this.issue({ type: "interact", unitId: unit.id, target: tile });
    else if (this.aim?.kind === "item") void this.issue({ type: "useItem", unitId: unit.id, itemId: this.aim.itemId, target: tile });
    else if (this.aim?.kind === "support") {
      void this.issue({ type: "support", unitId: unit.id, supporterId: this.aim.supporter.id, target: tile });
    } else if (this.aim?.kind === "order") {
      const companion = this.unit(this.aim.unitId);
      const target = unitAt(this.encounter, tile)!;
      void this.issue({ type: "order", unitId: unit.id, targetId: companion.id, order: this.orderFor(companion, target) });
    } else if (this.selected) void this.issue({ type: "ability", unitId: unit.id, abilityId: this.selected.id, target: tile });
    else void this.issue({ type: "move", unitId: unit.id, to: tile });
  }

  // ------------------------------------------------------------- interface

  private refreshHud(): void {
    this.refreshRoster();
    const unit = activeUnit(this.encounter);
    if (!unit || unit.team !== "party" || this.busy) {
      // Uma jogada se reproduzindo ainda é de quem jogou: a barra continua com a cara dele, sem o que clicar.
      this.hud.setActions([], unit ? this.resourcesOf(unit, unit.team === "party") : null);
      this.hud.setDetail("");
      this.hud.setChip("");
    }
  }

  /** Vez do jogador: recalcula o que dá pra fazer e redesenha a barra e as marcas no chão. */
  private refresh(): void {
    const { encounter } = this;
    const unit = activeUnit(encounter)!;
    this.refreshRoster();

    const canPay = (ability: Ability) => readiness(unit, ability) === "ready";
    // O que ela custa, no cartão do quadrado: a ação, o Fôlego e, em recarga, em quantos turnos volta.
    const price = (ability: Ability) => {
      const wait = cooldownLeft(unit, ability);
      return [
        ability.cost === "action" ? "Ação" : "Bônus",
        ...(ability.breath ? [`${ability.breath} de fôlego`] : []),
        ...(ability.mana ? [`${ability.mana} de mana`] : []),
        ...(isRecited(ability) ? ["recitada"] : []),
        ...(wait > 0 ? [`volta em ${wait}`] : []),
      ].join("  ·  ");
    };
    // Por que o botão de uma habilidade está apagado: o voto primeiro, depois o que falta pagar, depois o alvo.
    const why = (ability: Ability): string | undefined => {
      if (isBlow(ability) && vowForbids(encounter, unit)) {
        return `O voto da Ipojy: ${unit.name} não dá o primeiro golpe da luta. Espere alguém abrir.`;
      }
      const ready = readiness(unit, ability);
      if (ready === "spent") return ability.cost === "action" ? "A ação deste turno já foi gasta." : "A ação bônus deste turno já foi gasta.";
      if (ready === "limit") return `${ability.name} já foi usada todas as vezes que esta luta permite.`;
      if (ready === "recharging") return `${ability.name} está em recarga: volta em ${cooldownLeft(unit, ability)} turno(s).`;
      if (ready === "breath") return ERROR_TEXT.no_breath;
      if (ready === "mana") return ERROR_TEXT.no_mana;
      if (ready === "reciting") return ERROR_TEXT.reciting;
      if (ready === "silenced") return ERROR_TEXT.silenced;
      if (abilityTargets(encounter, unit, ability).length > 0) return undefined;
      const surprised = encounter.units.some(
        (other) => other.team !== unit.team && isAlive(other) && other.statuses.some((status) => status.id === "surprised"),
      );
      if (isBlow(ability) && isSworn(unit.style) && surprised) return "O voto da Ipojy: não se bate em quem está Surpreso.";
      return "Ninguém ao alcance pra isso.";
    };
    // O botão de mexer existe enquanto esta luta espera que mexam em alguma coisa (uma deixa `used`), ou com algo
    // de mexer ao alcance — um sino do outro lado do mapa não é assunto dela. Acende com quem está colado nele.
    const inReach = interactTargets(encounter, unit);
    const wanted = new Set(encounter.cues.flatMap((cue) => (cue.when.kind === "used" ? cue.when.props : [])));
    const usable = encounter.props.filter(
      (prop) => prop.hp > 0 && !prop.used && propTemplate(prop).interact !== undefined && (wanted.has(prop.id) || inReach.includes(prop)),
    );
    const buttons: ActionButton[] = [
      {
        label: "Mover",
        icon: "move",
        tag: `${unit.turn.movement} de ${unit.speed} de passo`,
        body: "Aponte pra onde ir: a linha mostra o caminho, até onde o movimento deste turno alcança.",
        enabled: unit.turn.movement > 0,
        why: "O movimento deste turno acabou.",
        selected: this.selected === null && !this.aim,
        onClick: () => this.select(null),
      },
      ...unit.abilities.map((ability): ActionButton => {
        // Preparando: o botão é o da habilidade que fica pronta, e só acende o que se prepara.
        if (this.aim?.kind === "ready") {
          const fits = readyable(ability) && readiness(unit, ability, true) === "ready";
          return {
            label: ability.name,
            icon: abilityIcon(ability),
            tag: "Preparar",
            cost: "action",
            body: `Deixa ${ability.name} pronta: até a sua próxima vez, sai no primeiro inimigo que entrar no alcance dela, na reação.\n${describeAbility(ability)}`,
            enabled: fits,
            why: readyable(ability) ? why(ability) : "Isso não se prepara: só o que mira um inimigo e não se recita.",
            onClick: () => void this.issue({ type: "ready", unitId: unit.id, abilityId: ability.id }),
          };
        }
        return {
          label: ability.name,
          icon: abilityIcon(ability),
          tag: price(ability),
          cost: ability.cost === "action" ? "action" : "bonus",
          wait: cooldownLeft(unit, ability) || undefined,
          body: `${ability.flavor}\n${describeAbility(ability)}`,
          enabled: canPay(ability) && abilityTargets(encounter, unit, ability).length > 0,
          why: ability.unseen && canPay(ability) && abilityTargets(encounter, unit, ability).length === 0 ? "Algum inimigo está vendo: saia da vista dele antes (atrás de parede, pedra alta ou barranco)." : why(ability),
          selected: this.selected?.id === ability.id,
          onClick: () => this.select(ability),
        };
      }),
      // Preparar: o Vigiar de outra habilidade. Escolhe-se depois qual, num dos botões delas.
      ...(unit.team === "party" && unit.abilities.some(readyable)
        ? [
            {
              label: this.aim?.kind === "ready" ? "Preparar: escolha o quê" : "Preparar",
              icon: "hourglass",
              tag: "Ação",
              cost: "action",
              body: "Gasta a ação deixando uma habilidade pronta: até a sua próxima vez, ela sai no primeiro inimigo que entrar no alcance dela, na reação. Clique e escolha qual. O que se recita não se prepara.",
              enabled: unit.turn.action && !vowForbids(encounter, unit),
              why: unit.turn.action ? `O voto da Ipojy: ${unit.name} não dá o primeiro golpe da luta. Espere alguém abrir.` : "A ação deste turno já foi gasta.",
              selected: this.aim?.kind === "ready",
              onClick: () => this.chooseReady(),
            } satisfies ActionButton,
          ]
        : []),
      ...(usable.length > 0
        ? [
            {
              label: `${propTemplate(inReach[0] ?? usable[0]).interact}: ${propTemplate(inReach[0] ?? usable[0]).name}`,
              icon: "use",
              tag: "Ação",
              cost: "action",
              enabled: unit.turn.action && inReach.length > 0,
              why: unit.turn.action ? "Chegue perto pra mexer." : "A ação deste turno já foi gasta.",
              selected: this.aim?.kind === "interact",
              onClick: () => this.chooseInteract(),
            } satisfies ActionButton,
          ]
        : []),
      // Enquanto houver alguém do grupo caído, o botão fica à vista, e diz o que falta pra ele valer.
      ...(encounter.units.some((other) => other.team === unit.team && !isAlive(other))
        ? [
            {
              label: "Levantar quem caiu",
              icon: "use",
              tag: "Ação",
              cost: "action",
              body: `Põe de pé quem está caído ao lado, com ${Math.round(LIFT_SHARE * 100)}% da vida.`,
              enabled: unit.turn.action && liftable(encounter, unit).length > 0,
              why: unit.turn.action ? "Chegue colado em quem caiu." : "A ação deste turno já foi gasta.",
              onClick: () => void this.issue({ type: "lift", unitId: unit.id, targetId: liftable(encounter, unit)[0].id }),
            } satisfies ActionButton,
          ]
        : []),
      // Os companheiros que jogam sozinhos: um botão por cabeça, que pede em quem (ele mesmo, um aliado, um inimigo).
      ...encounter.units
        .filter((other) => other.team === unit.team && other !== unit && isAlive(other) && this.playsItself(other))
        .map(
          (other): ActionButton => ({
            label: `${other.name}: ${orderLabel(other.order, this.encounter)}`,
            icon: orderIcon(other.order),
            tag: "Ordem  ·  não gasta nada",
            cost: "free",
            body: `${other.name} joga sozinho. Clique e escolha: nele, segurar posição; num aliado, proteger; num inimigo, mirar só nele. Clique de novo aqui pra avançar.`,
            enabled: true,
            selected: this.aim?.kind === "order" && this.aim.unitId === other.id,
            onClick: () => this.chooseOrder(other),
          }),
        ),
      // Quem acompanha sem lutar: o apoio de cada um, uma vez por rodada, sem gastar nada de quem chama.
      ...encounter.supporters.map(
        (supporter): ActionButton => ({
          label: `${SUPPORTS[supporter.support].name} (${supporter.name})`,
          icon: "wave",
          tag: "Uma vez por rodada  ·  não gasta a sua ação",
          cost: "free",
          body: SUPPORTS[supporter.support].flavor,
          enabled: supportTargets(encounter, unit, supporter).length > 0,
          why: `${supporter.name} não tem o que fazer agora (é uma vez por rodada).`,
          selected: this.aim?.kind === "support" && this.aim.supporter.id === supporter.id,
          onClick: () => this.chooseSupport(supporter),
        }),
      ),
      ...(unit.inventory?.slots ?? []).filter((slot) => slot.item.data.effect.kind !== "none").map(
        (slot): ActionButton => ({
          label: slot.item.name,
          icon: itemIcon(slot.item.id),
          tag: "Bônus",
          cost: "bonus",
          count: slot.quantity,
          body: slot.item.description,
          enabled: unit.turn.bonus && (!isThrown(slot.item) || itemTargets(encounter, unit, slot.item).length > 0),
          why: unit.turn.bonus ? `Nenhum inimigo à vista a até ${ITEM_REACH} quadrados.` : "A ação bônus deste turno já foi gasta.",
          selected: this.aim?.kind === "item" && this.aim.itemId === slot.item.id,
          onClick: () => this.chooseItem(slot.item),
        }),
      ),
    ];

    this.hud.setActions(buttons, this.resourcesOf(unit, true), () => this.endTurn());
    if (this.aim?.kind === "interact") this.options = inReach.map((prop) => prop.pos);
    else if (this.aim?.kind === "item") {
      const slot = findInventorySlot(unit, this.aim.itemId);
      this.options = slot ? itemTargets(encounter, unit, slot.item) : [];
    }
    // Todo mundo de pé: o companheiro (segurar), um aliado, quem dá a ordem inclusive (proteger), um inimigo (mirar).
    else if (this.aim?.kind === "order") this.options = encounter.units.filter(isAlive).map((other) => other.pos);
    else if (this.aim?.kind === "ready") this.options = [];
    else if (this.aim?.kind === "support") {
      this.options = supportTargets(encounter, unit, this.aim.supporter).map((target) => target.pos);
    } else if (this.selected) this.options = abilityTargets(encounter, unit, this.selected);
    else this.options = reachableTiles(encounter, unit).map((tile) => tile.pos);
    this.drawOptions();
    this.drawCursor();
  }

  /** Acende por um instante onde o golpe do inimigo da vez vai cair: dá pra ler a intenção antes do dano. */
  private async telegraph(abilityId: string, target: Pos): Promise<void> {
    const unit = activeUnit(this.encounter);
    const ability = unit?.abilities.find((candidate) => candidate.id === abilityId);
    if (!unit || !ability || ability.targets === "self") return;

    this.actor(unit.id)?.faceToward(pixelOfTile(this.host.map, target));
    const color = ability.targets === "ally" ? COLOR_ALLY : COLOR_TARGET;
    drawReach(this.intent, unit.pos, target, this.host.map.tileSize, color);
    drawArea(this.intent, this.areaTiles(target, ability.radius ?? 0), this.host.map.tileSize, color, 0.3);
    await this.wait(ENEMY_TELEGRAPH_MS);
    this.intent.clear();
  }

  /** Os quadrados da grade a até `radius` de `center`. */
  private areaTiles(center: Pos, radius: number): Pos[] {
    const { grid } = this.host.map;
    const tiles: Pos[] = [];
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        if (x >= 0 && y >= 0 && x < grid.width && y < grid.height) tiles.push({ x, y });
      }
    }
    return tiles;
  }

  private clearHighlights(): void {
    this.options = [];
    this.overlay.clear();
    this.cursor.clear();
    this.refreshHud();
  }

  /** O que está no chão é uma mancha por superfície, não um quadrado por quadrado. */
  private drawSurfaces(): void {
    this.ground.clear();
    drawArea(this.ground, this.flooded, this.host.map.tileSize, FLOOD_COLOR, 0.55, 0.8);
    for (const id of Object.keys(SURFACE_COLOR) as SurfaceId[]) {
      const tiles = [...this.surfaces.values()].filter((surface) => surface.id === id).map((surface) => surface.pos);
      drawArea(this.ground, tiles, this.host.map.tileSize, SURFACE_COLOR[id], 0.4, 0.7);
    }
  }

  private optionColor(): number {
    if (this.aim) return COLOR_USE;
    if (!this.selected) return COLOR_MOVE;
    return this.selected.targets === "ally" ? COLOR_ALLY : COLOR_TARGET;
  }

  /**
   * Marca QUEM dá pra mirar (quatro cantos em volta de cada alvo). Pra onde
   * dá pra andar não se marca: o chão fica limpo, e o caminho aparece sob o
   * cursor (`drawCursor`). Mirar "qualquer quadrado à vista" também não —
   * seria a grade inteira; só a área sob o cursor aparece.
   */
  private drawOptions(): void {
    this.overlay.clear();
    if (!this.aim && (!this.selected || this.selected.targets === "tile")) return;
    for (const tile of this.options) drawBrackets(this.overlay, tile, this.host.map.tileSize, this.optionColor(), 0.75);
  }

  /**
   * A linha de explicação da vez do jogador: o que o clique em `hover` faria
   * (a chance de acertar quem está lá, o chão em que se vai pisar) ou, sem
   * nada sob o cursor, o que o modo atual faz.
   */
  private detailFor(unit: Unit, hover: Pos | null): string {
    const { encounter, selected } = this;
    if (this.aim?.kind === "support") {
      const { name, flavor } = SUPPORTS[this.aim.supporter.support];
      const target = hover ? unitAt(encounter, hover) : undefined;
      return target
        ? `${name}: o que ${target.name} pretende fazer na vez dele. Não gasta a sua ação.`
        : `${name} (${this.aim.supporter.name}) — ${flavor}`;
    }
    if (this.aim?.kind === "item") {
      const target = hover ? unitAt(encounter, hover) : undefined;
      if (this.aim.thrown) {
        return target && target.team !== unit.team
          ? `${this.aim.name} em ${target.name}: quebra em cima. Custa a ação bônus.`
          : `${this.aim.name}: em quem? Num inimigo à vista, até ${ITEM_REACH} quadrados. Esc ou botão direito volta.`;
      }
      return target
        ? `${this.aim.name} em ${target.name}${target === unit ? "" : ": jogado na mão dele"}. Custa a ação bônus.`
        : `${this.aim.name}: em quem? Em você, ou num aliado à vista, até ${ITEM_REACH} quadrados. Esc ou botão direito volta.`;
    }
    if (this.aim?.kind === "order") {
      const companion = this.unit(this.aim.unitId);
      const target = hover ? unitAt(encounter, hover) : undefined;
      return target
        ? `${companion.name}: ${orderLabel(this.orderFor(companion, target), encounter)}. Não gasta nada.`
        : `Ordem pra ${companion.name}: clique nele pra segurar posição, num aliado pra proteger, num inimigo pra mirar só nele. O botão de novo: avançar.`;
    }
    if (this.aim?.kind === "interact") {
      const prop = hover ? propAt(encounter, hover) : undefined;
      return prop
        ? `${propTemplate(prop).interact}: ${propTemplate(prop).name}. Custa a ação.`
        : "Clique no objeto em que mexer. Esc ou botão direito volta a andar.";
    }
    if (!selected) {
      const level = (pos: Pos) => tileAt(encounter.grid, pos)?.elevation ?? 0;
      const hazard = hover ? (findPath(encounter, unit, hover)?.hazard ?? 0) : 0;
      if (hazard > 0) return `O caminho passa por chão que fere: cerca de ${Math.round(hazard)} de dano.`;
      if (hover && level(hover) > level(unit.pos)) {
        return `Chão alto: +${HEIGHT_TO_HIT} pra acertar quem está embaixo, e quem está embaixo acerta menos.`;
      }
      // Andar não precisa de legenda: a linha no chão já mostra o caminho, e o cartão do botão explica.
      return "";
    }

    const prop = hover && selected.radius === undefined ? propAt(encounter, hover) : undefined;
    if (prop) return `${PROPS[prop.kind].name}: ${prop.hp} de vida. Objeto não se esquiva — o golpe sempre pega.`;

    const target = hover && selected.radius === undefined ? unitAt(encounter, hover) : undefined;
    if (target?.invulnerable) return `${target.name} não tem vida pra perder: golpe nenhum o fere.`;
    if (!target || !selected.attack) return `${describeAbility(selected)} — ${selected.flavor}`;

    const odds = attackOdds(encounter, unit, selected, target);
    const chance = Math.round((odds.hit + odds.crit) * 100);
    return [`${selected.name} em ${target.name}: ${chance}% de acerto`, ...describeEdge(odds.edge)].join(" · ");
  }

  /** O que o clique faria aqui: o caminho até o quadrado, ou a área que a habilidade pega. */
  private drawCursor(): void {
    this.cursor.clear();
    if (this.busy) return;

    const unit = activeUnit(this.encounter)!;
    const hover = this.hover && this.options.some((option) => samePos(option, this.hover!)) ? this.hover : null;
    this.hud.setDetail(this.detailFor(unit, hover));
    this.drawChip();
    if (!hover) return;

    const size = this.host.map.tileSize;
    const color = this.optionColor();
    if (this.aim) {
      drawArea(this.cursor, [hover], size, color, 0.3);
      return;
    }
    if (!this.selected) {
      drawTrail(this.cursor, unit.pos, findPath(this.encounter, unit, hover)?.path ?? [], size, color);
      return;
    }

    drawReach(this.cursor, unit.pos, hover, size, color);
    drawArea(this.cursor, this.areaTiles(hover, this.selected.radius ?? 0), size, color, 0.3);
  }

  /** O que os inimigos anotados pretendem: onde cada um vai parar (o losango) e o que vai atingir de lá (a mancha). */
  private drawForeseen(): void {
    const size = this.host.map.tileSize;
    this.foresight.clear();
    for (const { tile, areas } of this.foreseen.values()) {
      drawStop(this.foresight, tile, size, COLOR_USE);
      for (const { target, radius } of areas) drawArea(this.foresight, this.areaTiles(target, radius), size, COLOR_TARGET, 0.22);
    }
  }

  /** A vez de `unit` passou (ou ele caiu): o que se sabia do plano dele não vale mais. */
  private forgetForeseen(unit: string): void {
    if (this.foreseen.delete(unit)) this.drawForeseen();
  }

  /**
   * Os objetivos em aberto, cada um com a conta que lhe cabe: a de rodadas
   * (uma deixa `round` dispara quando a rodada N COMEÇA: sobram N-1 pra jogar)
   * ou a de objetos já mexidos.
   */
  private refreshGoals(): void {
    this.hud.setGoals(
      this.goals.map(({ text, when }) => {
        if (when.kind === "round") return `${text} (rodada ${Math.min(this.shownRound, when.round - 1)} de ${when.round - 1})`;
        if (when.kind === "used" && when.props.length > 1) {
          return `${text} (${when.props.filter((id) => this.usedProps.has(id)).length}/${when.props.length})`;
        }
        return text;
      }),
    );
  }

  // ------------------------------------------------------------- reprodução

  private async play(events: TacticalEvent[]): Promise<void> {
    for (const event of events) await this.animate(event);
  }

  private unit(id: string): Unit {
    return findUnit(this.encounter, id)!;
  }

  private actor(id: string): MapActor | undefined {
    return this.host.actors.get(id);
  }

  /** Reproduz UM evento do motor. Regra nova de combate = evento novo = um `case` novo aqui. */
  private async animate(event: TacticalEvent): Promise<void> {
    switch (event.type) {
      case "battleStarted":
        if (event.charge) {
          const { roll, needed, shaken } = event.charge;
          this.hud.log(`Investida! ${roll} contra ${needed}: ${shaken ? "o outro lado está Abalado." : "ninguém se abala."}`);
        }
        return;

      case "roundStarted":
        if (event.round > 1) {
          sfx("round");
          this.hud.log(`— Rodada ${event.round} —`);
          this.host.onRound?.(event.round);
        }
        this.shownRound = event.round;
        this.refreshGoals();
        return;

      case "turnStarted": {
        const actor = this.actor(event.unit);
        for (const other of this.host.actors.values()) other.setTurn(false);
        actor?.setTurn(true, this.unit(event.unit).team === "party" ? COLORS.goldBright : COLORS.hpLow);
        if (actor) this.host.scene.cameras.main.startFollow(actor.followTarget, true, 0.12, 0.12);
        if (this.unit(event.unit).team === "party") sfx("turn");
        this.refreshHud();
        await this.wait(180);
        return;
      }

      case "turnEnded":
        this.forgetForeseen(event.unit);
        return;

      case "turnSkipped":
        sfx("skipped");
        this.floatOver(event.unit, "Perde a vez", TEXT_COLORS.inkDim, -22, 20);
        this.hud.log(`${this.unit(event.unit).name} está ${event.name.toLowerCase()} e perde a vez.`);
        await this.wait(SKIPPED_TURN_MS);
        return;

      case "moved": {
        const actor = this.actor(event.unit);
        if (!actor) return;
        actor.setWalking(true);
        for (const step of event.path) {
          sfx("step");
          await this.glide(actor, pixelOfTile(this.host.map, step), STEP_MS, true);
        }
        actor.setWalking(false);
        return;
      }

      case "abilityUsed": {
        const actor = this.actor(event.unit);
        const unit = this.unit(event.unit);
        this.hud.log(`${unit.name} usa ${event.name}${event.reaction ? " (reação)" : ""}.`);
        this.blow = { actor: event.unit };
        if (!actor) return;

        const home = actor.pos;
        const target = pixelOfTile(this.host.map, event.target);
        if (target.x === home.x && target.y === home.y) {
          await this.wait(200);
          return;
        }
        // Um bote curto na direção do alvo, e de volta. A reação (o Contragolpe) é mais larga e mais rápida.
        sfx("swing");
        actor.faceToward(target);
        const reach = Math.min(1, (event.reaction ? 10 : 6) / Math.hypot(target.x - home.x, target.y - home.y));
        const lunge = { x: home.x + (target.x - home.x) * reach, y: home.y + (target.y - home.y) * reach };
        await this.glide(actor, lunge, event.reaction ? 50 : 70, false);
        await this.glide(actor, home, 90, false);
        return;
      }

      case "breathSpent":
      case "manaSpent":
        // Quem age pelo jogador vê o Fôlego e a mana na barra; o golpe que ele pagou vem logo depois.
        return;

      case "recitationStarted": {
        // Começou a ler: a magia sai no próximo turno dele, e até lá o texto está à vista de quem quiser quebrá-lo.
        sfx("uiOpen");
        this.floatOver(event.unit, "Recitando...", TEXT_COLORS.goldBright, -30, 20);
        this.hud.log(`${this.unit(event.unit).name} começa a recitar ${event.name}.`);
        this.refreshRoster();
        await this.wait(200);
        return;
      }

      case "recitationBroken": {
        sfx("deny");
        const why = { hit: "o golpe quebrou o texto", lost: "o alvo sumiu", skipped: "perdeu a vez", spent: "faltou com que pagar" }[event.reason];
        this.floatOver(event.unit, "Recitação perdida", TEXT_COLORS.inkDim, -30, 20);
        this.hud.log(`${this.unit(event.unit).name} perde ${event.name}: ${why}.`);
        this.refreshRoster();
        await this.wait(220);
        return;
      }

      case "manaDrawn": {
        // O bicho sentiu a mana e vem: a água leva a batida até ele, e o turno a mais dele vem quando a vez de quem age acabar.
        const caster = this.actor(event.caster);
        const beast = this.actor(event.unit);
        sfx("rumble");
        if (caster && beast) await this.waterWave(caster.pos, beast.pos);
        beast?.flash(COLOR_WATER, 160);
        this.floatOver(event.unit, "Sentiu a mana", TEXT_COLORS.danger, -30, 20);
        this.hud.log(`${this.unit(event.unit).name} sente a mana de ${this.unit(event.caster).name} e vem atrás.`);
        await this.wait(320);
        return;
      }

      case "manaBurst": {
        // Mana demais de uma vez: o corpo cobra na hora, e o chão sente. A marca vem logo depois, como condição.
        const actor = this.actor(event.unit);
        sfx("burst");
        this.shake(320, 0.008);
        if (actor) {
          actor.flash(0xffffff, 140);
          this.ring(actor.pos, COLOR_WATER);
          this.spark(this.center(actor), COLOR_WATER, 14);
        }
        this.floatOver(event.unit, "Passou do limite", TEXT_COLORS.danger, -30, 22);
        this.hud.log(`${this.unit(event.unit).name} gasta mana demais de uma vez (${event.spent}, e o corpo aguenta ${event.limit}).`);
        await this.wait(380);
        return;
      }

      case "breathRecovered":
        this.hud.log(`${this.unit(event.unit).name} toma fôlego (+${event.amount}).`);
        return;

      case "strode":
        this.floatOver(event.unit, `+${event.amount} passos`, TEXT_COLORS.goldBright, -22, 20);
        this.hud.log(`${this.unit(event.unit).name} dispara (+${event.amount} de passo).`);
        return;

      case "breathDrained":
        sfx("sting");
        this.floatOver(event.unit, `-${event.amount} fôlego`, TEXT_COLORS.inkDim, -22, 20);
        this.hud.log(`${this.unit(event.unit).name} perde ${event.amount} de Fôlego.`);
        return;

      case "healDenied":
        sfx("deny");
        this.floatOver(event.target, "Nada se restaura", TEXT_COLORS.inkDim, -22, 20);
        this.hud.log(`${this.unit(event.target).name} está ${event.name.toLowerCase()}: a cura não pega.`);
        await this.wait(220);
        return;

      case "statusTriggered": {
        const actor = this.actor(event.unit);
        // O dano que vem agora é da condição: ninguém bateu, ninguém recua de ninguém.
        this.blow = {};
        // A condição que fere (Decaindo) ou a que refaz (Submerso, o bicho de rio na água).
        const mends = (STATUSES[event.statusId as StatusId] as StatusTemplate | undefined)?.regen !== undefined;
        sfx(mends ? "heal" : "sting");
        this.hud.log(
          mends
            ? `${this.unit(event.unit).name} se refaz, ${event.name.toLowerCase()}.`
            : `${this.unit(event.unit).name} sofre por estar ${event.name.toLowerCase()}.`,
        );
        this.floatOver(event.unit, event.name, mends ? TEXT_COLORS.goldBright : TEXT_COLORS.danger, -22, 20);
        if (actor) this.ring(actor.pos, COLORS.guard);
        return;
      }

      case "attackRoll": {
        const target = this.unit(event.target);
        const edge = describeEdge(event);
        const sum = [`${event.total} contra ${event.defense}`, ...edge].join(", ");
        this.blow = { actor: event.actor, target: event.target, outcome: event.outcome };
        if (event.outcome === "crit") sfx("crit");
        else if (event.outcome !== "hit") sfx("miss");
        if (event.outcome === "crit") {
          this.floatOver(event.target, "Crítico!", TEXT_COLORS.goldBright, -30, 32);
          this.hud.log(`Acerto crítico em ${target.name}!`);
        } else if (event.outcome === "miss" && event.cover && event.total >= event.defense - COVER_DEFENSE) {
          // Teria acertado em campo aberto: quem segurou o golpe foi a cobertura.
          this.floatOver(event.target, "Cobertura", TEXT_COLORS.guard);
          this.hud.log(`A cobertura salva ${target.name} (${sum}).`);
          await this.dodge(event.target, event.actor);
        } else if (event.outcome === "fumble") {
          this.floatOver(event.actor, "Falha crítica", TEXT_COLORS.danger);
          this.hud.log(`Falha crítica (1 natural).`);
        } else if (event.outcome === "miss") {
          this.floatOver(event.target, "Errou", TEXT_COLORS.inkDim);
          this.hud.log(`Errou ${target.name} (${sum}).`);
          await this.dodge(event.target, event.actor);
        } else {
          this.hud.log(`Acertou ${target.name} (${sum}).`);
        }
        await this.wait(event.outcome === "hit" ? 40 : event.outcome === "crit" ? 120 : 220);
        return;
      }

      case "readied": {
        this.floatOver(event.unit, "Pronto", TEXT_COLORS.goldBright, -22);
        this.hud.log(`${this.unit(event.unit).name} prepara ${event.name} pra quem chegar.`);
        await this.wait(120);
        return;
      }

      case "revealed": {
        this.actor(event.unit)?.setHidden(false);
        this.floatOver(event.unit, "Visto!", TEXT_COLORS.danger, -22);
        this.hud.log(`${this.unit(event.unit).name} foi descoberto.`);
        await this.wait(100);
        return;
      }

      case "parried": {
        const actor = this.actor(event.unit);
        sfx("block");
        this.floatOver(event.unit, `Aparou ${event.amount}`, TEXT_COLORS.guard, -22);
        if (actor) this.spark(this.center(actor), COLORS.goldBright, 9);
        this.hud.log(`${this.unit(event.unit).name} apara com a lâmina: ${event.amount} a menos.`);
        await this.wait(100);
        return;
      }

      case "intercepted": {
        const actor = this.actor(event.unit);
        const ally = this.actor(event.ally);
        sfx("block");
        this.floatOver(event.unit, "Na frente!", TEXT_COLORS.guard, -22, 24);
        if (actor && ally) this.slash(this.center(ally), this.center(actor));
        this.hud.log(`${this.unit(event.unit).name} entra na frente de ${this.unit(event.ally).name}.`);
        await this.wait(160);
        return;
      }

      case "watchTriggered": {
        // Quem vigiava bate em quem entrou: aparece sobre ele, antes do golpe.
        this.floatOver(event.unit, "Vigia!", TEXT_COLORS.goldBright, -22, 24);
        this.hud.log(`${this.unit(event.target).name} entrou no alcance de ${this.unit(event.unit).name}, que vigiava.`);
        await this.wait(160);
        return;
      }

      case "styleTrait": {
        // O traço da escola de quem bate: aparece sobre ele, antes do dano que ele engrossa (ou do golpe que ele devolve).
        const text = event.trait === "wave" ? `${event.name} x${(event.hits ?? 0) + 1}` : `${event.name}!`;
        this.floatOver(event.unit, text, TEXT_COLORS.goldBright, -22, event.trait === "counter" ? 28 : 22);
        if (event.trait === "counter") {
          // A Espera responde: quem errou vê o golpe vir de volta antes de saber se pega.
          const actor = this.actor(event.unit);
          const target = this.actor(event.target);
          sfx("block");
          actor?.flash(COLORS.goldBright, 160);
          if (actor && target) this.slash(this.center(actor), this.center(target));
          await this.wait(180);
        }
        const actor = this.unit(event.unit).name;
        const target = this.unit(event.target).name;
        this.hud.log(
          event.trait === "wave"
            ? `${actor} insiste em ${target}: ${event.name} (${(event.hits ?? 0) + 1} golpes seguidos).`
            : event.trait === "counter"
              ? `${target} errou: ${event.name} de ${actor}.`
              : `${target} se repetiu: ${event.name} de ${actor}.`,
        );
        await this.wait(140);
        return;
      }

      case "blocked": {
        const actor = this.actor(event.unit);
        sfx("block");
        this.floatOver(event.unit, `Bloqueou ${event.amount}`, TEXT_COLORS.guard, -22);
        if (actor) this.spark(this.center(actor), COLORS.guard, 7);
        return;
      }

      case "damage": {
        const unit = this.unit(event.target);
        const actor = this.actor(event.target);
        // O peso do golpe: quanto da vida do alvo ele levou, e se foi crítico ou fatal.
        const weight = Math.min(1, event.amount / unit.maxHp);
        const critical = this.blow.outcome === "crit" && this.blow.target === event.target;
        const heavy = critical || event.remainingHp === 0;

        sfx(heavy ? "heavyHit" : "hit");
        actor?.flash(0xffffff, heavy ? 170 : 110);
        actor?.setHp(event.remainingHp, unit.maxHp);
        this.floatOver(event.target, `-${event.amount}`, TEXT_COLORS.danger, 0, 24 + Math.round(18 * weight) + (critical ? 8 : 0));
        this.hud.log(`${unit.name} sofre ${event.amount} de dano.`);
        this.refreshRoster();

        if (actor) this.spark(this.center(actor), critical ? COLORS.goldBright : 0xffffff, 6 + 8 * weight + (critical ? 4 : 0));
        this.shake(heavy ? 200 : 120, 0.002 + 0.01 * weight + (critical ? 0.004 : 0));
        await this.hitStop(heavy ? HEAVY_HIT_STOP_MS : HIT_STOP_MS);
        await this.recoil(event.target, this.blow.actor, 2 + 5 * weight);
        await this.wait(170);
        return;
      }

      case "immune": {
        const actor = this.actor(event.target);
        sfx("immune");
        this.floatOver(event.target, "Nada o fere", TEXT_COLORS.inkDim, -22, 22);
        if (actor) this.ring(actor.pos, COLORS.guard);
        this.hud.log(`O golpe atravessa ${this.unit(event.target).name} sem tirar nada.`);
        await this.wait(260);
        return;
      }

      case "heal": {
        const unit = this.unit(event.target);
        const actor = this.actor(event.target);
        sfx("heal");
        actor?.flash(0x7fb069);
        if (actor) this.ring(actor.pos, COLORS.hp);
        actor?.setHp(event.remainingHp, unit.maxHp);
        this.floatOver(event.target, `+${event.amount}`, TEXT_COLORS.hp);
        this.hud.log(`${unit.name} recupera ${event.amount} de HP.`);
        this.refreshRoster();
        await this.wait(320);
        return;
      }

      case "pushed": {
        const actor = this.actor(event.unit);
        sfx("push");
        this.hud.log(`${this.unit(event.unit).name} é tirado do lugar.`);
        if (actor) await this.glide(actor, pixelOfTile(this.host.map, event.to), 160, false);
        return;
      }

      case "fell": {
        sfx("block");
        this.shake(160, 0.007);
        this.hud.log(`${this.unit(event.unit).name} cai do barranco${event.steps > 1 ? `, ${event.steps} degraus` : ""}.`);
        this.floatOver(event.unit, "Caiu!", TEXT_COLORS.danger, -22);
        await this.wait(140);
        return;
      }

      case "slammed": {
        const name = this.unit(event.unit).name;
        sfx("block");
        this.shake(140, 0.006);
        this.hud.log(
          event.into === "wall" ? `${name} bate na parede.` : `${name} bate ${event.into === "prop" ? "no" : "em"} ${event.name}.`,
        );
        await this.wait(120);
        return;
      }

      case "statusApplied": {
        const actor = this.actor(event.target);
        this.wear(event.target, event.statusId, true);
        if (actor) this.ring(actor.pos, COLORS.guard);
        sfx("status");
        this.floatOver(event.target, event.name, TEXT_COLORS.guard, -22);
        this.hud.log(`${this.unit(event.target).name}: ${event.name}.`);
        this.refreshRoster();
        await this.wait(200);
        return;
      }

      case "statusExpired":
        this.wear(event.target, event.statusId, false);
        this.refreshRoster();
        return;

      case "surfaceCreated":
        for (const pos of event.tiles) this.surfaces.set(`${pos.x},${pos.y}`, { pos, id: event.surfaceId });
        this.drawSurfaces();
        sfx("surface");
        this.hud.log(`${event.name} no chão por ${event.rounds} rodadas.`);
        await this.wait(220);
        return;

      case "surfaceExpired":
        for (const pos of event.tiles) this.surfaces.delete(`${pos.x},${pos.y}`);
        this.drawSurfaces();
        this.hud.log(`${event.name} se desfaz.`);
        return;

      case "surfaceTriggered": {
        const actor = this.actor(event.unit);
        // O dano que vem agora é do chão: ninguém bateu, ninguém recua de ninguém.
        this.blow = {};
        sfx("sting");
        this.hud.log(`${this.unit(event.unit).name} é pego por ${event.name}.`);
        this.floatOver(event.unit, event.name, TEXT_COLORS.danger, -22, 20);
        if (actor) this.ring(actor.pos, SURFACE_COLOR[event.surfaceId]);
        return;
      }

      case "propDamaged": {
        const image = this.host.props.get(event.prop);
        const at = this.tileCenter(event.pos);
        this.floatAt(at, `-${event.amount}`, TEXT_COLORS.inkDim, 0, 22);
        sfx("propHit");
        this.spark(at, 0xd9c7a0, 7);
        this.hud.log(`${event.name} leva ${event.amount} de dano.`);
        if (image) {
          const home = image.x;
          this.host.scene.tweens.add({
            targets: image,
            x: home + 1.5,
            duration: 40,
            yoyo: true,
            repeat: 2,
            onComplete: () => image.setX(home),
          });
        }
        await this.wait(200);
        return;
      }

      case "propDestroyed": {
        const at = this.tileCenter(event.pos);
        this.host.props.get(event.prop)?.destroy();
        this.host.props.delete(event.prop);
        sfx("propBreak");
        this.spark(at, 0xd9c7a0, 14);
        this.shake(140, 0.004);
        this.hud.log(`${event.name} se despedaça.`);
        await this.wait(220);
        return;
      }

      case "propUsed": {
        const at = this.tileCenter(event.pos);
        const image = this.host.props.get(event.prop);
        this.actor(event.unit)?.faceToward(at);
        this.usedProps.add(event.prop);
        sfx("bell");
        this.refreshGoals();
        this.floatAt(at, event.verb, TEXT_COLORS.goldBright, -10, 24);
        this.ring({ x: at.x, y: at.y + this.host.map.tileSize / 2 }, COLORS.gold);
        this.hud.log(`${this.unit(event.unit).name}: ${event.verb.toLowerCase()} — ${event.name}.`);
        if (image) {
          this.host.scene.tweens.add({ targets: image, scaleX: 1.12, scaleY: 0.92, duration: 80, yoyo: true, repeat: 1 });
        }
        await this.wait(360);
        return;
      }

      case "ordered":
        this.hud.log(`${this.unit(event.unit).name} a ${this.unit(event.target).name}: ${orderLabel(event.order, this.encounter)}.`);
        sfx("uiSelect");
        return;

      case "lifted": {
        const target = this.encounter.units.find((other) => other.id === event.target);
        const actor = this.actor(event.target);
        actor?.rise();
        actor?.setHp(event.hp, target?.maxHp ?? event.hp);
        sfx("heal");
        if (target) this.hud.log(`${this.encounter.units.find((other) => other.id === event.unit)?.name} levanta ${target.name}.`);
        await this.wait(350);
        break;
      }
      case "itemUsed": {
        const actor = this.actor(event.unit);
        const onto = event.target ? ` em ${this.unit(event.target).name}` : "";
        this.hud.log(`${this.unit(event.unit).name} usa ${event.itemName}${onto}: ${event.description}`);
        sfx("item");
        const receiver = event.target ?? event.unit;
        this.floatOver(receiver, event.itemName, TEXT_COLORS.gold, -22, 20);
        const where = this.actor(receiver) ?? actor;
        if (where) this.ring(where.pos, COLORS.gold);
        await this.wait(380);
        return;
      }

      case "supportUsed": {
        const actor = this.actor(event.supporter);
        this.hud.log(`${event.supporterName}: ${event.name.toLowerCase()}.`);
        sfx("support");
        this.floatOver(event.supporter, event.name, TEXT_COLORS.gold, -22, 20);
        if (actor) this.ring(actor.pos, COLORS.gold);
        await this.wait(260);
        return;
      }

      case "waterRose":
        this.flooded.push(...event.tiles);
        this.drawSurfaces();
        sfx("rumble");
        this.hud.log("A água sobe.");
        await this.wait(380);
        return;

      case "supporterLost": {
        // A deixa já contou o que houve; aqui some quem era e o apoio que ele dava.
        sfx("deny");
        this.refreshRoster();
        await this.actor(event.id)?.collapse(420);
        return;
      }

      case "intentRevealed": {
        const unit = this.unit(event.unit);
        const actor = this.actor(event.unit);
        if (actor) this.ring(actor.pos, COLOR_USE);
        if (event.skips) {
          this.hud.log(`${unit.name} vai perder a vez.`);
          await this.wait(320);
          return;
        }

        const moves = !samePos(event.tile, unit.pos);
        const acts = [...event.abilities.map((ability) => `usar ${ability.name}`), ...(event.item ? [`usar ${event.item}`] : [])];
        const plan = [...(moves ? ["andar"] : []), ...acts];
        this.hud.log(`${unit.name} pretende ${plan.length > 0 ? plan.join(" e ") : "ficar onde está"}.`);
        this.floatOver(event.unit, event.abilities[0]?.name ?? (moves ? "Vai andar" : "Vai esperar"), TEXT_COLORS.goldBright, -22, 20);
        this.foreseen.set(event.unit, {
          tile: event.tile,
          areas: event.abilities.map((ability) => ({
            target: ability.target,
            radius: unit.abilities.find((candidate) => candidate.id === ability.abilityId)?.radius ?? 0,
          })),
        });
        this.drawForeseen();
        await this.wait(420);
        return;
      }

      case "death":
        this.forgetForeseen(event.unit);
        sfx("death");
        this.hud.log(`${this.unit(event.unit).name} cai.`);
        await this.actor(event.unit)?.collapse(420);
        return;

      case "cue":
        // A história fala no meio da luta: a interface do combate sai da frente da caixa.
        this.hud.setVisible(false);
        sfx("cue");
        await this.host.onCue(event.id);
        this.hud.setVisible(true);
        // O objetivo que ela era está cumprido (ou perdido): sai da lista.
        this.goals = this.goals.filter((goal) => goal.id !== event.id);
        this.refreshGoals();
        return;

      case "battleEnded":
        await this.wait(300);
        return;
    }
  }

  /** Leva um ator até `to` em linha reta. `turn` faz ele olhar pra onde vai. */
  private glide(actor: MapActor, to: PixelPos, duration: number, turn: boolean): Promise<void> {
    const from = actor.pos;
    if (turn) {
      actor.faceToward(to);
      // A direção mudou: a animação de caminhada precisa trocar de linha.
      actor.setWalking(true);
    }
    return new Promise((resolve) => {
      this.host.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 1;
          actor.place({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
        },
        onComplete: () => {
          actor.place(to);
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------------- impacto

  /** O meio de um quadrado, no mapa. */
  private tileCenter(tile: Pos): PixelPos {
    const size = this.host.map.tileSize;
    return { x: (tile.x + 0.5) * size, y: (tile.y + 0.5) * size };
  }

  /** O meio do corpo de alguém: onde o golpe pega. */
  private center(actor: MapActor): PixelPos {
    return { x: actor.pos.x, y: (actor.pos.y + actor.top.y) / 2 };
  }

  /** Congela as animações por um instante: é o que faz o golpe "pegar". */
  private async hitStop(ms: number): Promise<void> {
    const { tweens } = this.host.scene;
    tweens.timeScale = 0;
    await this.wait(ms);
    tweens.timeScale = settings().animSpeed;
  }

  /** Um tranco curto pra longe de `from`, e de volta. */
  private async nudge(actor: MapActor, direction: PixelPos, pixels: number, out: number, back: number): Promise<void> {
    const length = Math.hypot(direction.x, direction.y);
    if (length === 0) return;
    const home = actor.pos;
    const away = { x: home.x + (direction.x / length) * pixels, y: home.y + (direction.y / length) * pixels };
    await this.glide(actor, away, out, false);
    await this.glide(actor, home, back, false);
  }

  /** Quem levou o golpe é jogado pra trás, na direção contrária a quem bateu. */
  private async recoil(targetId: string, attackerId: string | undefined, pixels: number): Promise<void> {
    const target = this.actor(targetId);
    const attacker = attackerId === undefined ? undefined : this.actor(attackerId);
    if (!target || !attacker || target === attacker) return;
    await this.nudge(target, { x: target.pos.x - attacker.pos.x, y: target.pos.y - attacker.pos.y }, pixels, 45, 110);
  }

  /** Quem escapou do golpe dá um passo de lado, atravessado à linha do ataque. */
  private async dodge(targetId: string, attackerId: string): Promise<void> {
    const target = this.actor(targetId);
    const attacker = this.actor(attackerId);
    if (!target || !attacker || target === attacker) return;
    await this.nudge(target, { x: attacker.pos.y - target.pos.y, y: target.pos.x - attacker.pos.x }, 4, 60, 100);
  }

  /** Estilhaço no ponto do impacto: riscos que abrem e somem. */
  private spark(at: PixelPos, color: number, size: number): void {
    const { scene } = this.host;
    const burst = this.host.addWorld(scene.add.graphics().setDepth(FX_DEPTH).setPosition(at.x, at.y));
    burst.lineStyle(1, color, 1);
    const rays = 6;
    const twist = Math.random() * Math.PI;
    for (let i = 0; i < rays; i++) {
      const angle = twist + (Math.PI * 2 * i) / rays;
      burst.lineBetween(
        Math.cos(angle) * size * 0.35,
        Math.sin(angle) * size * 0.35,
        Math.cos(angle) * size,
        Math.sin(angle) * size,
      );
    }
    scene.tweens.add({
      targets: burst,
      scale: { from: 0.5, to: 1.3 },
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  /** Anel que se abre no chão, aos pés de alguém (cura, condição, item). */
  private ring(at: PixelPos, color: number): void {
    const { scene } = this.host;
    const ring = this.host.addWorld(scene.add.ellipse(at.x, at.y - 1, 14, 6).setStrokeStyle(1, color, 1).setDepth(FX_DEPTH));
    scene.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 1, to: 0 },
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * O que uma condição muda no corpo de quem a carrega: o bicho de rio
   * Submerso ou Em seco, o sangue da marca. A que sai não desfaz a água: a
   * do chão novo entra logo depois.
   */
  private wear(unitId: string, statusId: string, on: boolean): void {
    const actor = this.actor(unitId);
    if (!actor) return;
    if (on && statusId === STATUSES.submerged.id) actor.setImmersion("submerged");
    if (on && statusId === STATUSES.beached.id) actor.setImmersion("beached");
    if (statusId === NOSEBLEED) actor.setBleeding(on);
    if (statusId === STATUSES.hidden.id) actor.setHidden(on);
  }

  /** Um corte de luz de `from` a `to` que some depressa: o golpe de reação, antes de ele chegar. */
  private slash(from: PixelPos, to: PixelPos): void {
    const { scene } = this.host;
    const line = this.host.addWorld(scene.add.graphics().setDepth(FX_DEPTH));
    line.lineStyle(2, COLORS.goldBright, 1).lineBetween(from.x, from.y, to.x, to.y);
    line.lineStyle(1, 0xffffff, 1).lineBetween(from.x, from.y, to.x, to.y);
    scene.tweens.add({ targets: line, alpha: { from: 1, to: 0 }, duration: 260, ease: "Cubic.easeIn", onComplete: () => line.destroy() });
  }

  /** A batida da mana correndo pela água, de `from` a `to`: anéis que se abrem um depois do outro. */
  private async waterWave(from: PixelPos, to: PixelPos): Promise<void> {
    const { scene } = this.host;
    const steps = Math.max(3, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 10));
    const gap = 45;
    for (let i = 0; i <= steps; i++) {
      const at = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
      scene.time.delayedCall(i * gap, () => {
        const ripple = this.host.addWorld(scene.add.ellipse(at.x, at.y - 1, 10, 4).setStrokeStyle(1, COLOR_WATER, 1).setDepth(FX_DEPTH));
        scene.tweens.add({
          targets: ripple,
          scale: { from: 0.6, to: 2.2 },
          alpha: { from: 0.9, to: 0 },
          duration: 480,
          ease: "Cubic.easeOut",
          onComplete: () => ripple.destroy(),
        });
      });
    }
    await this.wait(steps * gap + 200);
  }

  /** Texto que sobe da cabeça de alguém. */
  private floatOver(unitId: string, text: string, color: string, offsetY = 0, size?: number): void {
    const actor = this.actor(unitId);
    if (actor) this.floatAt(actor.top, text, color, offsetY, size);
  }

  /** Texto que sobe de um ponto do MAPA. O mundo tem zoom e a interface não: converte mapa -> tela. */
  private floatAt(at: PixelPos, text: string, color: string, offsetY = 0, size?: number): void {
    const camera = this.host.scene.cameras.main;
    this.hud.float(
      (at.x - camera.worldView.x) * camera.zoom,
      (at.y - camera.worldView.y) * camera.zoom + offsetY,
      text,
      color,
      size,
    );
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.host.scene.time.delayedCall(ms, resolve));
  }
}
