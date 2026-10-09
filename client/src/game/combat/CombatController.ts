import * as Phaser from "phaser";
import {
  COVER_DEFENSE,
  FLANK_TO_HIT,
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
  isOver,
  pixelOfTile,
  propAt,
  propTemplate,
  tileAt,
  reachableTiles,
  samePos,
  styleLabel,
  supportTargets,
  tileOfPixel,
  unitAt,
  usesLeft,
  type Ability,
  type AreaMap,
  type AttackOutcome,
  type Command,
  type CommandError,
  type CueWhen,
  type Encounter,
  type PixelPos,
  type Pos,
  type Supporter,
  type SurfaceId,
  type TacticalEvent,
  type TeamId,
  type Unit,
} from "@ealen/shared";
import { COLORS, TEXT_COLORS } from "../config";
import type { MapActor } from "../MapActor";
import { CombatHud, type ActionButton, type AddHud } from "./CombatHud";

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
  /** A altura da tela em que a caixa dos objetivos começa, quando o alto dela já tem dono (o relógio). */
  goalsTop?: number;
}

/** Entre o chão e tudo que fica de pé: os quadrados acesos passam por baixo de árvores e personagens. */
const OVERLAY_DEPTH = 0;
/** Faíscas e anéis ficam por cima de quem está de pé, abaixo das barras de vida. */
const FX_DEPTH = 1_500_000;
const STEP_MS = 110;
const ENEMY_THINK_MS = 380;
/** Quanto dura na tela a vez de quem a perdeu (surpreso). */
const SKIPPED_TURN_MS = 420;
/** Quanto tempo os quadrados que um inimigo vai atingir ficam acesos antes do golpe. */
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

const ERROR_TEXT: Record<CommandError, string> = {
  battle_over: "A luta já acabou.",
  not_your_turn: "Não é a sua vez.",
  unreachable: "Não dá pra chegar lá neste turno.",
  unknown_ability: "Habilidade desconhecida.",
  resource_spent: "Você já gastou isso neste turno.",
  invalid_target: "Alvo fora de alcance ou fora de vista.",
  item_unavailable: "Esse item não está na mochila.",
};

/** O que uma habilidade faz, em uma linha — pra quem vai decidir se usa. */
function describeAbility(ability: Ability): string {
  const parts: string[] = [ability.cost === "action" ? "Ação" : "Ação bônus"];

  if (ability.targets === "self") parts.push("em si");
  else if (ability.targets === "foes") parts.push("todo inimigo de pé");
  else parts.push(ability.range === 1 ? "corpo a corpo" : `alcance ${ability.range}`);
  if (ability.radius !== undefined) {
    const side = ability.radius * 2 + 1;
    parts.push(`área ${side}x${side} (acerta aliados)`);
  }
  if (ability.attack) parts.push(`acerto ${ability.attack.toHit >= 0 ? "+" : ""}${ability.attack.toHit}`);

  for (const effect of ability.effects) {
    if (effect.kind === "damage") parts.push(effect.multiplier ? `dano x${effect.multiplier}` : "dano");
    else if (effect.kind === "heal") parts.push("cura");
    else if (effect.kind === "status") {
      parts.push(effect.statusId === "guarding" ? "em guarda até o próximo turno" : `${STATUSES[effect.statusId].name} por ${effect.turns} turnos`);
    }
    else parts.push(effect.distance > 0 ? `empurra ${effect.distance}` : `puxa ${-effect.distance}`);
  }
  if (ability.surface) parts.push(`deixa ${SURFACES[ability.surface.id].name} por ${ability.surface.rounds} rodadas`);
  if (ability.limit !== undefined) parts.push(ability.limit === 1 ? "uma vez por luta" : `${ability.limit} vezes por luta`);
  if (ability.backlash) parts.push(`cobra de você: ${STATUSES[ability.backlash.statusId].name}`);
  return parts.join(" · ");
}

/** O que a posição e o confronto de estilos fizeram a um ataque, em palavras: "flanqueado +2", "cobertura +2 na defesa"... */
function describeEdge(edge: { cover: boolean; flanked: boolean; height: -1 | 0 | 1; style: -1 | 0 | 1 }): string[] {
  const notes: string[] = [];
  if (edge.style > 0) notes.push(`estilo leva vantagem +${STYLE_TO_HIT}`);
  if (edge.style < 0) notes.push(`estilo em desvantagem -${STYLE_TO_HIT}`);
  if (edge.flanked) notes.push(`flanqueado +${FLANK_TO_HIT}`);
  if (edge.height > 0) notes.push(`de cima +${HEIGHT_TO_HIT}`);
  if (edge.height < 0) notes.push(`de baixo -${HEIGHT_TO_HIT}`);
  if (edge.cover) notes.push(`cobertura +${COVER_DEFENSE} na defesa`);
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
  private aim: { kind: "interact" } | { kind: "support"; supporter: Supporter } | null = null;
  /** O que cada inimigo anotado pretende fazer na vez dele: onde parar e o que vai atingir. Some quando a vez dele passa. */
  private readonly foreseen = new Map<string, { tile: Pos; areas: { target: Pos; radius: number }[] }>();
  private readonly foresight: Phaser.GameObjects.Graphics;
  /** Os objetivos ainda em aberto: as deixas com `goal` que não dispararam. */
  private goals: { id: string; text: string; when: CueWhen }[] = [];
  /** A rodada e os objetos usados como os eventos os mostraram até agora — é o que os objetivos contam. */
  private shownRound = 1;
  private readonly usedProps = new Set<string>();
  /** Os quadrados clicáveis no modo atual. */
  private options: Pos[] = [];
  private hover: Pos | null = null;

  constructor(
    private readonly host: CombatHost,
    private readonly encounter: Encounter,
    /** Sem `winner`, a luta parou sem vencedor (uma deixa a encerrou). */
    private readonly onEnd: (winner: TeamId | undefined) => void,
  ) {
    const { scene } = host;
    this.hud = new CombatHud(scene, host.addHud, host.goalsTop);
    this.ground = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH - 1));
    scene.tweens.add({ targets: this.ground, alpha: { from: 1, to: 0.6 }, duration: 650, yoyo: true, repeat: -1 });
    this.overlay = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH));
    this.cursor = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 1));
    this.intent = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 2));
    this.foresight = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 2));

    // Quem não tem vida pra perder não mostra barra de vida.
    for (const unit of encounter.units) {
      if (!unit.invulnerable) host.actors.get(unit.id)?.setHp(unit.currentHp, unit.maxHp);
    }
    this.goals = encounter.cues.flatMap((cue) => {
      const goal = host.goals?.find((candidate) => candidate.cue === cue.id);
      return goal ? [{ id: cue.id, text: goal.text, when: cue.when }] : [];
    });
    this.refreshGoals();

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  /** Reproduz a abertura da luta (iniciativa, primeiro turno) e entrega a vez a quem for. */
  async start(events: TacticalEvent[]): Promise<void> {
    const ambush = events.some((event) => event.type === "battleStarted" && event.surprised === "enemy");
    this.hud.log(ambush ? "Emboscada! Eles perdem a primeira vez." : "Combate!");
    await this.play(events);
    await this.proceed();
  }

  showResult(title: string, lines: string[], titleColor: string): Promise<void> {
    return this.hud.showResult(title, lines, titleColor);
  }

  destroy(): void {
    const { scene } = this.host;
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.off("keydown", this.onKey, this);

    scene.tweens.timeScale = 1;
    for (const actor of this.host.actors.values()) {
      actor.hideHp();
      actor.setTurn(false);
    }
    scene.tweens.killTweensOf(this.ground);
    this.ground.destroy();
    this.overlay.destroy();
    this.cursor.destroy();
    this.intent.destroy();
    this.foresight.destroy();
    this.hud.destroy();
  }

  // ----------------------------------------------------------------- fluxo

  /** Entrega um comando do jogador ao motor e reproduz o que aconteceu. */
  private async issue(command: Command): Promise<void> {
    if (this.busy) return;

    const result = applyCommand(this.encounter, command);
    if (!result.ok) {
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

    while (!isOver(encounter) && activeUnit(encounter)?.team === "enemy") {
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
      this.hud.setTurnOrder(encounter);
      this.onEnd(encounter.winner);
      return;
    }

    this.busy = false;
    this.selected = null;
    this.aim = null;
    this.refresh();
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
    this.selected = ability;
    this.aim = null;
    this.refresh();
  }

  /** O botão de um apoio: escolhe-se depois em quem (um inimigo de pé). */
  private chooseSupport(supporter: Supporter): void {
    if (this.busy) return;
    this.selected = null;
    this.aim = { kind: "support", supporter };
    this.refresh();
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
    this.selected = null;
    this.aim = { kind: "interact" };
    this.refresh();
  }

  private endTurn(): void {
    const unit = activeUnit(this.encounter);
    if (unit) void this.issue({ type: "endTurn", unitId: unit.id });
  }

  private onKey(event: KeyboardEvent): void {
    if (this.busy) return;

    if (event.code.startsWith("Digit")) this.hud.press(Number(event.code.slice(5)) - 1);
    else if (event.code === "Space" || event.code === "Enter") this.endTurn();
    else if (event.code === "Escape") this.select(null);
  }

  private tileUnder(pointer: Phaser.Input.Pointer): Pos {
    const point = this.host.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return tileOfPixel(this.host.map, point);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const tile = this.tileUnder(pointer);
    if (this.hover && samePos(this.hover, tile)) return;
    this.hover = tile;
    this.drawCursor();
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
      if (this.selected || this.aim) this.hud.warn(ERROR_TEXT.invalid_target);
      return;
    }

    if (this.aim?.kind === "interact") void this.issue({ type: "interact", unitId: unit.id, target: tile });
    else if (this.aim?.kind === "support") {
      void this.issue({ type: "support", unitId: unit.id, supporterId: this.aim.supporter.id, target: tile });
    } else if (this.selected) void this.issue({ type: "ability", unitId: unit.id, abilityId: this.selected.id, target: tile });
    else void this.issue({ type: "move", unitId: unit.id, to: tile });
  }

  // ------------------------------------------------------------- interface

  private refreshHud(): void {
    this.hud.setTurnOrder(this.encounter);
    const unit = activeUnit(this.encounter);
    if (!unit || unit.team !== "party" || this.busy) {
      this.hud.setActions([], unit ? `Vez de ${unit.name}` : "");
      this.hud.setDetail("");
    }
  }

  /** Vez do jogador: recalcula o que dá pra fazer e redesenha a barra e os quadrados acesos. */
  private refresh(): void {
    const { encounter } = this;
    const unit = activeUnit(encounter)!;
    this.hud.setTurnOrder(encounter);

    const canPay = (ability: Ability) =>
      (ability.cost === "action" ? unit.turn.action : unit.turn.bonus) && usesLeft(unit, ability) > 0;
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
        enabled: unit.turn.movement > 0,
        selected: this.selected === null && !this.aim,
        onClick: () => this.select(null),
      },
      ...unit.abilities.map((ability) => ({
        label: ability.name,
        tag: ability.cost === "action" ? "Ação" : "Bônus",
        enabled: canPay(ability) && abilityTargets(encounter, unit, ability).length > 0,
        selected: this.selected?.id === ability.id,
        onClick: () => this.select(ability),
      })),
      ...(usable.length > 0
        ? [
            {
              label: `${propTemplate(inReach[0] ?? usable[0]).interact}: ${propTemplate(inReach[0] ?? usable[0]).name}`,
              tag: "Ação",
              enabled: unit.turn.action && inReach.length > 0,
              selected: this.aim?.kind === "interact",
              onClick: () => this.chooseInteract(),
            },
          ]
        : []),
      // Quem acompanha sem lutar: o apoio de cada um, uma vez por rodada, sem gastar nada de quem chama.
      ...encounter.supporters.map((supporter) => ({
        label: `${SUPPORTS[supporter.support].name} (${supporter.name})`,
        tag: "1 por rodada",
        enabled: supportTargets(encounter, unit, supporter).length > 0,
        selected: this.aim?.kind === "support" && this.aim.supporter.id === supporter.id,
        onClick: () => this.chooseSupport(supporter),
      })),
      ...(unit.inventory?.slots ?? []).map((slot) => ({
        label: `${slot.item.name} ×${slot.quantity}`,
        tag: "Bônus",
        enabled: unit.turn.bonus,
        onClick: () => void this.issue({ type: "useItem", unitId: unit.id, itemId: slot.item.id }),
      })),
      { label: "Encerrar turno (Espaço)", enabled: true, onClick: () => this.endTurn() },
    ];

    const dot = (available: boolean) => (available ? "●" : "○");
    this.hud.setActions(
      buttons,
      [
        `${unit.name}${unit.style ? ` (${styleLabel(unit)})` : ""}`,
        `Movimento ${unit.turn.movement}/${unit.speed}`,
        `Ação ${dot(unit.turn.action)}`,
        `Bônus ${dot(unit.turn.bonus)}`,
      ].join("   ·   "),
    );
    if (this.aim?.kind === "interact") this.options = inReach.map((prop) => prop.pos);
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
    this.intent.fillStyle(ability.targets === "ally" ? COLOR_ALLY : COLOR_TARGET, 0.5);
    for (const tile of this.areaTiles(target, ability.radius ?? 0)) this.fillTile(this.intent, tile);
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

  private fillTile(graphics: Phaser.GameObjects.Graphics, tile: Pos): void {
    const size = this.host.map.tileSize;
    graphics.fillRect(tile.x * size + 0.5, tile.y * size + 0.5, size - 1, size - 1);
  }

  private drawSurfaces(): void {
    this.ground.clear();
    for (const surface of this.surfaces.values()) {
      this.ground.fillStyle(SURFACE_COLOR[surface.id], 0.5);
      this.fillTile(this.ground, surface.pos);
    }
  }

  private optionColor(): number {
    if (this.aim) return COLOR_USE;
    if (!this.selected) return COLOR_MOVE;
    return this.selected.targets === "ally" ? COLOR_ALLY : COLOR_TARGET;
  }

  /** Acende os quadrados clicáveis: pra onde andar, ou quem dá pra mirar. */
  private drawOptions(): void {
    this.overlay.clear();
    // Mirar "qualquer quadrado à vista" acende muita coisa: mais fraco, pra não tapar o mapa.
    this.overlay.fillStyle(this.optionColor(), this.selected?.targets === "tile" ? 0.16 : 0.3);
    for (const tile of this.options) this.fillTile(this.overlay, tile);
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
      return "Clique num quadrado azul pra andar. Esc ou botão direito volta pra cá.";
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
    if (!hover) return;

    this.cursor.fillStyle(this.optionColor(), 0.45);
    if (this.aim) {
      this.fillTile(this.cursor, hover);
      return;
    }
    if (!this.selected) {
      for (const step of findPath(this.encounter, unit, hover)?.path ?? []) this.fillTile(this.cursor, step);
      return;
    }

    for (const tile of this.areaTiles(hover, this.selected.radius ?? 0)) this.fillTile(this.cursor, tile);
  }

  /** O que os inimigos anotados pretendem: o quadrado em que cada um vai parar (contorno) e o que vai atingir de lá (cheio). */
  private drawForeseen(): void {
    const size = this.host.map.tileSize;
    this.foresight.clear();
    for (const { tile, areas } of this.foreseen.values()) {
      this.foresight.lineStyle(1, COLOR_USE, 0.95);
      this.foresight.strokeRect(tile.x * size + 1, tile.y * size + 1, size - 2, size - 2);
      this.foresight.fillStyle(COLOR_TARGET, 0.3);
      for (const { target, radius } of areas) {
        for (const hit of this.areaTiles(target, radius)) this.fillTile(this.foresight, hit);
      }
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
        return;

      case "roundStarted":
        if (event.round > 1) {
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
        this.refreshHud();
        await this.wait(180);
        return;
      }

      case "turnEnded":
        this.forgetForeseen(event.unit);
        return;

      case "turnSkipped":
        this.floatOver(event.unit, "Perde a vez", TEXT_COLORS.inkDim, -22, 20);
        this.hud.log(`${this.unit(event.unit).name} está ${event.name.toLowerCase()} e perde a vez.`);
        await this.wait(SKIPPED_TURN_MS);
        return;

      case "moved": {
        const actor = this.actor(event.unit);
        if (!actor) return;
        actor.setWalking(true);
        for (const step of event.path) await this.glide(actor, pixelOfTile(this.host.map, step), STEP_MS, true);
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
        // Um bote curto na direção do alvo, e de volta.
        actor.faceToward(target);
        const reach = Math.min(1, 6 / Math.hypot(target.x - home.x, target.y - home.y));
        const lunge = { x: home.x + (target.x - home.x) * reach, y: home.y + (target.y - home.y) * reach };
        await this.glide(actor, lunge, 70, false);
        await this.glide(actor, home, 90, false);
        return;
      }

      case "attackRoll": {
        const target = this.unit(event.target);
        const edge = describeEdge(event);
        const sum = [`${event.total} contra ${event.defense}`, ...edge].join(", ");
        this.blow = { actor: event.actor, target: event.target, outcome: event.outcome };
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

      case "styleTrait": {
        // O traço do estilo de quem bate: aparece sobre ele, antes do dano que ele engrossa.
        const text = event.trait === "wave" ? `${event.name} x${(event.hits ?? 0) + 1}` : `${event.name}!`;
        this.floatOver(event.unit, text, TEXT_COLORS.goldBright, -22, 22);
        this.hud.log(
          event.trait === "wave"
            ? `${this.unit(event.unit).name} insiste em ${this.unit(event.target).name}: ${event.name} (${(event.hits ?? 0) + 1} golpes seguidos).`
            : `${this.unit(event.target).name} se repetiu: ${event.name} de ${this.unit(event.unit).name}.`,
        );
        await this.wait(140);
        return;
      }

      case "blocked": {
        const actor = this.actor(event.unit);
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

        actor?.flash(0xffffff, heavy ? 170 : 110);
        actor?.setHp(event.remainingHp, unit.maxHp);
        this.floatOver(event.target, `-${event.amount}`, TEXT_COLORS.danger, 0, 24 + Math.round(18 * weight) + (critical ? 8 : 0));
        this.hud.log(`${unit.name} sofre ${event.amount} de dano.`);
        this.hud.setTurnOrder(this.encounter);

        if (actor) this.spark(this.center(actor), critical ? COLORS.goldBright : 0xffffff, 6 + 8 * weight + (critical ? 4 : 0));
        this.host.scene.cameras.main.shake(heavy ? 200 : 120, 0.002 + 0.01 * weight + (critical ? 0.004 : 0));
        await this.hitStop(heavy ? HEAVY_HIT_STOP_MS : HIT_STOP_MS);
        await this.recoil(event.target, this.blow.actor, 2 + 5 * weight);
        await this.wait(170);
        return;
      }

      case "immune": {
        const actor = this.actor(event.target);
        this.floatOver(event.target, "Nada o fere", TEXT_COLORS.inkDim, -22, 22);
        if (actor) this.ring(actor.pos, COLORS.guard);
        this.hud.log(`O golpe atravessa ${this.unit(event.target).name} sem tirar nada.`);
        await this.wait(260);
        return;
      }

      case "heal": {
        const unit = this.unit(event.target);
        const actor = this.actor(event.target);
        actor?.flash(0x7fb069);
        if (actor) this.ring(actor.pos, COLORS.hp);
        actor?.setHp(event.remainingHp, unit.maxHp);
        this.floatOver(event.target, `+${event.amount}`, TEXT_COLORS.hp);
        this.hud.log(`${unit.name} recupera ${event.amount} de HP.`);
        this.hud.setTurnOrder(this.encounter);
        await this.wait(320);
        return;
      }

      case "pushed": {
        const actor = this.actor(event.unit);
        this.hud.log(`${this.unit(event.unit).name} é arremessado.`);
        if (actor) await this.glide(actor, pixelOfTile(this.host.map, event.to), 160, false);
        return;
      }

      case "statusApplied": {
        const actor = this.actor(event.target);
        if (actor) this.ring(actor.pos, COLORS.guard);
        this.floatOver(event.target, event.name, TEXT_COLORS.guard, -22);
        this.hud.log(`${this.unit(event.target).name}: ${event.name}.`);
        await this.wait(200);
        return;
      }

      case "statusExpired":
        return;

      case "surfaceCreated":
        for (const pos of event.tiles) this.surfaces.set(`${pos.x},${pos.y}`, { pos, id: event.surfaceId });
        this.drawSurfaces();
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
        this.hud.log(`${this.unit(event.unit).name} é pego por ${event.name}.`);
        this.floatOver(event.unit, event.name, TEXT_COLORS.danger, -22, 20);
        if (actor) this.ring(actor.pos, SURFACE_COLOR[event.surfaceId]);
        return;
      }

      case "propDamaged": {
        const image = this.host.props.get(event.prop);
        const at = this.tileCenter(event.pos);
        this.floatAt(at, `-${event.amount}`, TEXT_COLORS.inkDim, 0, 22);
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
        this.spark(at, 0xd9c7a0, 14);
        this.host.scene.cameras.main.shake(140, 0.004);
        this.hud.log(`${event.name} se despedaça.`);
        await this.wait(220);
        return;
      }

      case "propUsed": {
        const at = this.tileCenter(event.pos);
        const image = this.host.props.get(event.prop);
        this.actor(event.unit)?.faceToward(at);
        this.usedProps.add(event.prop);
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

      case "itemUsed": {
        const actor = this.actor(event.unit);
        this.hud.log(`${this.unit(event.unit).name} usa ${event.itemName}: ${event.description}`);
        this.floatOver(event.unit, event.itemName, TEXT_COLORS.gold, -22, 20);
        if (actor) this.ring(actor.pos, COLORS.gold);
        await this.wait(380);
        return;
      }

      case "supportUsed": {
        const actor = this.actor(event.supporter);
        this.hud.log(`${event.supporterName}: ${event.name.toLowerCase()}.`);
        this.floatOver(event.supporter, event.name, TEXT_COLORS.gold, -22, 20);
        if (actor) this.ring(actor.pos, COLORS.gold);
        await this.wait(260);
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
        this.hud.log(`${this.unit(event.unit).name} cai.`);
        await this.actor(event.unit)?.collapse(420);
        return;

      case "cue":
        // A história fala no meio da luta: a interface do combate sai da frente da caixa.
        this.hud.setVisible(false);
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
    tweens.timeScale = 1;
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
