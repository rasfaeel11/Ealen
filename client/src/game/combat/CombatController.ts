import * as Phaser from "phaser";
import {
  abilityTargets,
  activeUnit,
  applyCommand,
  chooseCommand,
  findPath,
  findUnit,
  pixelOfTile,
  reachableTiles,
  samePos,
  tileOfPixel,
  type Ability,
  type AreaMap,
  type AttackOutcome,
  type Command,
  type CommandError,
  type Encounter,
  type PixelPos,
  type Pos,
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
  /** Quem está na luta, pelo id da unidade. */
  actors: Map<string, MapActor>;
  /** Põe um objeto na cena de modo que só a câmera do mundo o desenhe. */
  addWorld: <T extends Phaser.GameObjects.GameObject>(object: T) => T;
  addHud: AddHud;
}

/** Entre o chão e tudo que fica de pé: os quadrados acesos passam por baixo de árvores e personagens. */
const OVERLAY_DEPTH = 0;
/** Faíscas e anéis ficam por cima de quem está de pé, abaixo das barras de vida. */
const FX_DEPTH = 1_500_000;
const STEP_MS = 110;
const ENEMY_THINK_MS = 380;
/** Quanto tempo os quadrados que um inimigo vai atingir ficam acesos antes do golpe. */
const ENEMY_TELEGRAPH_MS = 300;
/** A pausa de um golpe que pega, e a de um que pega forte (crítico ou fatal). */
const HIT_STOP_MS = 55;
const HEAVY_HIT_STOP_MS = 120;

const COLOR_MOVE = 0x6fa8dc;
const COLOR_TARGET = 0xe0566c;
const COLOR_ALLY = 0x7fb069;

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
  else parts.push(ability.range === 1 ? "corpo a corpo" : `alcance ${ability.range}`);
  if (ability.radius !== undefined) {
    const side = ability.radius * 2 + 1;
    parts.push(`área ${side}x${side} (acerta aliados)`);
  }
  if (ability.attack) parts.push(`acerto ${ability.attack.toHit >= 0 ? "+" : ""}${ability.attack.toHit}`);

  for (const effect of ability.effects) {
    if (effect.kind === "damage") parts.push(effect.multiplier ? `dano x${effect.multiplier}` : "dano");
    else if (effect.kind === "heal") parts.push("cura");
    else if (effect.kind === "status") parts.push(effect.statusId === "guarding" ? "em guarda até o próximo turno" : effect.statusId);
    else parts.push(effect.distance > 0 ? `empurra ${effect.distance}` : `puxa ${-effect.distance}`);
  }
  return parts.join(" · ");
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
  /** Os quadrados clicáveis no modo atual. */
  private options: Pos[] = [];
  private hover: Pos | null = null;

  constructor(
    private readonly host: CombatHost,
    private readonly encounter: Encounter,
    private readonly onEnd: (winner: TeamId) => void,
  ) {
    const { scene } = host;
    this.hud = new CombatHud(scene, host.addHud);
    this.overlay = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH));
    this.cursor = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 1));
    this.intent = host.addWorld(scene.add.graphics().setDepth(OVERLAY_DEPTH + 2));

    for (const unit of encounter.units) host.actors.get(unit.id)?.setHp(unit.currentHp, unit.maxHp);

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  /** Reproduz a abertura da luta (iniciativa, primeiro turno) e entrega a vez a quem for. */
  async start(events: TacticalEvent[]): Promise<void> {
    this.hud.log("Combate!");
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
    this.overlay.destroy();
    this.cursor.destroy();
    this.intent.destroy();
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

    while (!encounter.winner && activeUnit(encounter)?.team === "enemy") {
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

    if (encounter.winner) {
      this.hud.setTurnOrder(encounter);
      this.onEnd(encounter.winner);
      return;
    }

    this.busy = false;
    this.selected = null;
    this.refresh();
  }

  // --------------------------------------------------------------- entrada

  private select(ability: Ability | null): void {
    if (this.busy) return;
    const unit = activeUnit(this.encounter)!;

    // Habilidade em si mesmo não tem o que mirar: dispara na hora.
    if (ability?.targets === "self") {
      void this.issue({ type: "ability", unitId: unit.id, abilityId: ability.id, target: unit.pos });
      return;
    }
    this.selected = ability;
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
      if (this.selected) this.hud.warn(ERROR_TEXT.invalid_target);
      return;
    }

    void this.issue(
      this.selected
        ? { type: "ability", unitId: unit.id, abilityId: this.selected.id, target: tile }
        : { type: "move", unitId: unit.id, to: tile },
    );
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

    const canPay = (ability: Ability) => (ability.cost === "action" ? unit.turn.action : unit.turn.bonus);
    const buttons: ActionButton[] = [
      {
        label: "Mover",
        enabled: unit.turn.movement > 0,
        selected: this.selected === null,
        onClick: () => this.select(null),
      },
      ...unit.abilities.map((ability) => ({
        label: ability.name,
        tag: ability.cost === "action" ? "Ação" : "Bônus",
        enabled: canPay(ability) && abilityTargets(encounter, unit, ability).length > 0,
        selected: this.selected?.id === ability.id,
        onClick: () => this.select(ability),
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
      `${unit.name}   ·   Movimento ${unit.turn.movement}/${unit.speed}   ·   Ação ${dot(unit.turn.action)}   ·   Bônus ${dot(unit.turn.bonus)}`,
    );
    this.hud.setDetail(
      this.selected
        ? `${describeAbility(this.selected)} — ${this.selected.flavor}`
        : "Clique num quadrado azul pra andar. Esc ou botão direito volta pra cá.",
    );

    this.options = this.selected
      ? abilityTargets(encounter, unit, this.selected)
      : reachableTiles(encounter, unit).map((tile) => tile.pos);
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

  private optionColor(): number {
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

  /** O que o clique faria aqui: o caminho até o quadrado, ou a área que a habilidade pega. */
  private drawCursor(): void {
    this.cursor.clear();
    const { hover } = this;
    if (this.busy || !hover || !this.options.some((option) => samePos(option, hover))) return;

    const unit = activeUnit(this.encounter)!;
    this.cursor.fillStyle(this.optionColor(), 0.45);

    if (!this.selected) {
      for (const step of findPath(this.encounter, unit, hover)?.path ?? []) this.fillTile(this.cursor, step);
      return;
    }

    for (const tile of this.areaTiles(hover, this.selected.radius ?? 0)) this.fillTile(this.cursor, tile);
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
        if (event.round > 1) this.hud.log(`— Rodada ${event.round} —`);
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
        const sum = `${event.total} contra ${event.defense}`;
        this.blow = { actor: event.actor, target: event.target, outcome: event.outcome };
        if (event.outcome === "crit") {
          this.floatOver(event.target, "Crítico!", TEXT_COLORS.goldBright, -30, 32);
          this.hud.log(`Acerto crítico em ${target.name}!`);
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

      case "itemUsed": {
        const actor = this.actor(event.unit);
        this.hud.log(`${this.unit(event.unit).name} usa ${event.itemName}: ${event.description}`);
        this.floatOver(event.unit, event.itemName, TEXT_COLORS.gold, -22, 20);
        if (actor) this.ring(actor.pos, COLORS.gold);
        await this.wait(380);
        return;
      }

      case "death":
        this.hud.log(`${this.unit(event.unit).name} cai.`);
        await this.actor(event.unit)?.collapse(420);
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

  /** Texto que sobe da cabeça de alguém. O mundo tem zoom e a interface não: converte mapa -> tela. */
  private floatOver(unitId: string, text: string, color: string, offsetY = 0, size?: number): void {
    const actor = this.actor(unitId);
    if (!actor) return;
    const camera = this.host.scene.cameras.main;
    const top = actor.top;
    this.hud.float(
      (top.x - camera.worldView.x) * camera.zoom,
      (top.y - camera.worldView.y) * camera.zoom + offsetY,
      text,
      color,
      size,
    );
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.host.scene.time.delayedCall(ms, resolve));
  }
}
