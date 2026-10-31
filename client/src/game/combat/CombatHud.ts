import * as Phaser from "phaser";
import { activeUnit, isAlive, styleLabel, type Encounter, type Unit } from "@jogo/shared";
import { sfx } from "../audio";
import { RIGHT_COLUMN_LEFT, RIGHT_COLUMN_WIDTH } from "../ClockBar";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import { PartyColumn, type PartyEntry } from "../hud/PartyColumn";
import { iconKey, type IconName } from "../icons";
import {
  Tooltip,
  UiSlot,
  addBodyText,
  addPanel,
  addTitleText,
  drawBar,
  drawDiamond,
  fitFace,
  hpColor,
  type AddHud,
  type FaceRef,
} from "../ui";

export type { AddHud };

/** Uma opção da barra de ações: mover, uma habilidade, um item, um apoio. */
export interface ActionButton {
  label: string;
  icon: IconName;
  /** O custo por extenso: "Ação · 2 de fôlego". Fica no cartão. */
  tag?: string;
  /** A marca no canto do quadrado. */
  cost?: "action" | "bonus" | "free";
  /** A quantidade (itens) e em quantos turnos volta (recarga). */
  count?: number;
  wait?: number;
  /** O que faz, no cartão. */
  body?: string;
  enabled: boolean;
  /** Apagado: por quê. Aparece no cartão ao passar o mouse, e como aviso ao clicar ou apertar a tecla. */
  why?: string;
  selected?: boolean;
  onClick: () => void;
}

/** O que a barra mostra de quem tem a vez: rosto, vida e o que resta do turno. */
export interface TurnResources {
  name: string;
  style?: string;
  face: FaceRef;
  hp: number;
  maxHp: number;
  /** Sem isto, a vez é do outro lado: a barra só mostra quem é. */
  turn?: {
    movement: number;
    speed: number;
    action: boolean;
    bonus: boolean;
    breath: number;
    maxBreath: number;
    mana?: { now: number; max: number; spent: number; limit: number };
  };
}

/** Abaixo dos painéis e da caixa de diálogo, que abrem por cima sem precisar saber da barra. */
const DEPTH = -50;
const BAR_WIDTH = 900;
const BAR_HEIGHT = 136;
const BAR_X = (GAME_WIDTH - BAR_WIDTH) / 2;
const BAR_Y = GAME_HEIGHT - BAR_HEIGHT - 8;
const FACE_W = 88;
const FACE_H = 92;
const SLOT = 44;
const SLOT_GAP = 4;
const COLS = 13;
const ROWS = 2;
const GRID_X = BAR_X + 112;
const GRID_Y = BAR_Y + 38;
const END_X = BAR_X + BAR_WIDTH - 66;
const END_Y = BAR_Y + 58;
const END_R = 38;
/** A ordem dos turnos, no alto. */
const TILE_W = 48;
const TILE_H = 60;
const TILE_GAP = 4;
const TILE_Y = 12;
const LOG_LINES = 12;
const LOG_HEIGHT = 196;

/** Um quadro da ordem dos turnos: rosto, cor do lado e a vida embaixo. Anda sozinho quando a ordem gira. */
class TurnTile {
  readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Image;
  private placed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    unit: Unit,
    face: FaceRef,
    handlers: { over: () => void; out: () => void },
  ) {
    this.frame = scene.add.graphics();
    this.face = scene.add.image(0, 0, face.key, face.frame);
    fitFace(this.face, face, 1, 1, TILE_W - 2, TILE_H - 8, unit.name);
    const bars = scene.add.graphics();
    const zone = scene.add.zone(0, 0, TILE_W, TILE_H).setOrigin(0).setInteractive();
    zone.on(Phaser.Input.Events.POINTER_OVER, handlers.over);
    zone.on(Phaser.Input.Events.POINTER_OUT, handlers.out);
    // A moldura vem por cima do rosto: é ela quem diz de que lado ele está.
    this.root = scene.add.container(0, TILE_Y, [this.face, this.frame, bars, zone]);
    this.bars = bars;
  }

  private readonly bars: Phaser.GameObjects.Graphics;

  /** `scale`: quem age aparece maior. */
  place(x: number, active: boolean): void {
    if (!this.placed) this.root.setX(x);
    else if (this.root.x !== x) this.scene.tweens.add({ targets: this.root, x, duration: 220, ease: "Cubic.easeOut" });
    this.placed = true;
    this.root.setScale(active ? 1.12 : 1);
    this.root.setY(TILE_Y);
  }

  draw(unit: Unit, active: boolean): void {
    const side = unit.team === "party" ? COLORS.ally : COLORS.enemy;
    this.frame.clear();
    this.frame.lineStyle(active ? 2 : 1, active ? COLORS.goldBright : side, 1);
    this.frame.strokeRect(0, 0, TILE_W, TILE_H);
    this.frame.fillStyle(side, 1);
    this.frame.fillRect(0, 0, TILE_W, 3);
    this.bars.clear();
    this.bars.fillStyle(0x0a0807, 1);
    this.bars.fillRect(1, TILE_H - 7, TILE_W - 2, 6);
    if (!unit.invulnerable) {
      const ratio = unit.maxHp > 0 ? unit.currentHp / unit.maxHp : 0;
      this.bars.fillStyle(hpColor(ratio), 1);
      this.bars.fillRect(1, TILE_H - 7, Math.round((TILE_W - 2) * ratio), 6);
    }
    // A recitação à vista: quem está lendo é em quem vale bater agora.
    if (unit.reciting) drawDiamond(this.bars, TILE_W - 8, 10, 5, COLORS.mana);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.destroy();
  }
}

/**
 * A interface do combate: o grupo à esquerda, a ordem dos turnos no alto, o
 * registro à direita e, embaixo, a barra de quem tem a vez — rosto, recursos,
 * a grade de ações e o botão de encerrar. Vive em coordenadas de TELA (a
 * câmera da interface não tem zoom) e não sabe nada de regra — recebe o que
 * mostrar e avisa o que foi clicado.
 */
export class CombatHud {
  private readonly add: AddHud;
  private readonly party: PartyColumn;
  private readonly tiles = new Map<string, TurnTile>();
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly logFrame: Phaser.GameObjects.Graphics;
  private readonly logText: Phaser.GameObjects.Text;
  private readonly goals: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly barZone: Phaser.GameObjects.Zone;
  private readonly face: Phaser.GameObjects.Image;
  private readonly resources: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly who: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly slots: UiSlot[];
  private readonly endFrame: Phaser.GameObjects.Graphics;
  private readonly endIcon: Phaser.GameObjects.Image;
  private readonly endLabel: Phaser.GameObjects.Text;
  private readonly endZone: Phaser.GameObjects.Zone;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly warning: Phaser.GameObjects.Text;
  private readonly chip: Phaser.GameObjects.Text;
  private readonly tip: Tooltip;
  private buttons: ActionButton[] = [];
  private onEnd?: () => void;
  private endEnabled = false;
  private endHover = false;
  private logLines: string[] = [];
  private readonly resultObjects: Phaser.GameObjects.GameObject[] = [];
  private hasGoals = false;
  private detailText = "";
  /** Falso enquanto a história fala no meio da luta (ver setVisible). */
  private shown = true;
  private tipShown = false;
  /** O mouse parou no quadro de alguém, na ordem dos turnos: quem cuida do mapa marca o boneco. */
  onHoverUnit?: (unit: Unit | null) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    /** Onde começa a coluna da direita: mais embaixo quando o relógio da história ocupa o alto dela. */
    logTop: number,
    /** O rosto de cada um: o retrato, ou o quadro da folha do mapa. */
    private readonly faceOf: (unit: Unit) => FaceRef,
  ) {
    this.add = (object) => {
      addHud(object);
      (object as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
      return object;
    };
    const { add } = this;

    this.party = new PartyColumn(scene, add);

    this.roundText = add(
      addTitleText(scene, 0, TILE_Y + TILE_H / 2, "", { fontSize: "14px", align: "center" }).setOrigin(1, 0.5).setShadow(0, 2, "#000000", 4),
    );

    this.logFrame = add(addPanel(scene, RIGHT_COLUMN_LEFT - 110, logTop, RIGHT_COLUMN_WIDTH + 110, LOG_HEIGHT, true));
    this.logText = add(
      addBodyText(scene, RIGHT_COLUMN_LEFT - 98, logTop + 10, "", {
        fontSize: "13px",
        lineSpacing: 2,
        color: TEXT_COLORS.inkDim,
        wordWrap: { width: RIGHT_COLUMN_WIDTH + 86 },
      }),
    );

    this.goals = add(
      addBodyText(scene, GAME_WIDTH / 2, TILE_Y + TILE_H + 16, "", {
        fontSize: "16px",
        lineSpacing: 3,
        align: "center",
        color: TEXT_COLORS.goldBright,
        wordWrap: { width: 620 },
        backgroundColor: "rgba(10, 8, 7, 0.8)",
        padding: { x: 14, y: 6 },
      })
        .setOrigin(0.5, 0)
        .setVisible(false),
    );

    this.bar = add(addPanel(scene, BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT));
    // A barra segura o clique: ela não é chão.
    this.barZone = add(scene.add.zone(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT).setOrigin(0).setInteractive());
    this.face = add(scene.add.image(0, 0, "__DEFAULT").setVisible(false));
    this.resources = add(scene.add.graphics());
    this.who = add(
      addTitleText(scene, BAR_X + 12, BAR_Y - 6, "", { fontSize: "16px", color: TEXT_COLORS.goldBright }).setOrigin(0, 1).setShadow(0, 2, "#000000", 4),
    );
    this.hpText = add(
      addBodyText(scene, BAR_X + 12 + FACE_W / 2, BAR_Y + 112, "", { fontSize: "14px", color: TEXT_COLORS.white })
        .setOrigin(0.5, 0)
        .setShadow(0, 1, "#000000", 3),
    );

    this.tip = new Tooltip(scene);
    this.slots = Array.from({ length: COLS * ROWS }, (_, i) => {
      const x = GRID_X + (i % COLS) * (SLOT + SLOT_GAP);
      const y = GRID_Y + Math.floor(i / COLS) * (SLOT + SLOT_GAP);
      const slot = new UiSlot(scene, x, y, SLOT, {
        over: () => this.showSlotTip(i, x + SLOT / 2),
        out: () => this.hideTip(),
        down: () => this.press(i),
      });
      add(slot.root);
      return slot;
    });

    this.endFrame = add(scene.add.graphics());
    this.endIcon = add(scene.add.image(END_X, END_Y - 2, iconKey("hourglass")).setDisplaySize(34, 34));
    this.endLabel = add(addBodyText(scene, END_X, END_Y + END_R + 7, "Encerrar [Espaço]", { fontSize: "13px" }).setOrigin(0.5));
    this.endZone = add(scene.add.zone(END_X - END_R, END_Y - END_R, END_R * 2, END_R * 2).setOrigin(0).setInteractive({ useHandCursor: true }));
    this.endZone.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.endHover = true;
      this.drawEnd();
    });
    this.endZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.endHover = false;
      this.drawEnd();
    });
    this.endZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.endEnabled) this.onEnd?.();
    });
    this.drawEnd();

    this.detail = add(
      addBodyText(scene, GAME_WIDTH / 2 + 80, BAR_Y - 6, "", {
        fontSize: "15px",
        fontStyle: "italic",
        align: "center",
        color: TEXT_COLORS.ink,
        wordWrap: { width: 600 },
        backgroundColor: "rgba(10, 8, 7, 0.82)",
        padding: { x: 12, y: 5 },
      })
        .setOrigin(0.5, 1)
        .setVisible(false),
    );
    this.warning = add(
      addBodyText(scene, GAME_WIDTH / 2, BAR_Y - 56, "", { fontSize: "20px", color: TEXT_COLORS.danger })
        .setOrigin(0.5)
        .setShadow(0, 2, "#000000", 4)
        .setAlpha(0),
    );
    this.chip = add(
      addBodyText(scene, 0, 0, "", {
        fontSize: "14px",
        color: TEXT_COLORS.goldBright,
        backgroundColor: "rgba(10, 8, 7, 0.9)",
        padding: { x: 7, y: 3 },
      })
        .setOrigin(0, 1)
        .setVisible(false),
    );
    // O cartão fica por cima de tudo que é da barra.
    add(this.tip.root).setDepth(DEPTH + 10);
  }

  // ----------------------------------------------------------------- o grupo

  /** A coluna do grupo, como a luta o deixou agora. */
  setParty(entries: PartyEntry[]): void {
    this.party.set(entries);
  }

  // ------------------------------------------------------- a ordem dos turnos

  /** Quem luta, na ordem de iniciativa, a partir de quem tem a vez. Quem caiu sai da fila. */
  setTurnOrder(encounter: Encounter): void {
    const active = activeUnit(encounter);
    const alive = encounter.order
      .map((id) => encounter.units.find((candidate) => candidate.id === id)!)
      .filter((unit) => isAlive(unit));
    const start = Math.max(0, active ? alive.indexOf(active) : 0);
    const turning = [...alive.slice(start), ...alive.slice(0, start)];

    // Quem caiu sai da fila, e a fila anda.
    for (const [id, tile] of this.tiles) {
      if (!turning.some((unit) => unit.id === id)) {
        tile.destroy();
        this.tiles.delete(id);
      }
    }
    const total = turning.length * (TILE_W + TILE_GAP) - TILE_GAP;
    const left = (GAME_WIDTH - total) / 2;
    turning.forEach((unit, i) => {
      let tile = this.tiles.get(unit.id);
      if (!tile) {
        tile = new TurnTile(this.scene, unit, this.faceOf(unit), {
          over: () => this.showUnitTip(unit),
          out: () => {
            this.tip.hide();
            this.onHoverUnit?.(null);
          },
        });
        this.tiles.set(unit.id, tile);
        this.add(tile.root);
        if (!this.shown) tile.root.setVisible(false);
      }
      tile.place(left + i * (TILE_W + TILE_GAP), unit === active);
      tile.draw(unit, unit === active);
    });
    this.roundText.setText(`RODADA\n${encounter.round}`).setX(left - 14);
  }

  private showUnitTip(unit: Unit): void {
    this.onHoverUnit?.(unit);
    const lines = [
      ...(unit.invulnerable ? ["Não tem vida pra perder."] : [`Vida ${unit.currentHp}/${unit.maxHp}`]),
      ...unit.statuses.map((status) => status.name),
      ...(unit.reciting ? [`Recitando ${unit.abilities.find((ability) => ability.id === unit.reciting!.abilityId)?.name ?? ""}`] : []),
    ];
    // A escola fica à vista: é o que diz quem leva vantagem sobre quem.
    const tile = this.tiles.get(unit.id);
    this.tip.showBelow((tile?.root.x ?? GAME_WIDTH / 2) + TILE_W / 2, TILE_Y + TILE_H + 10, {
      title: unit.name,
      meta: unit.style ? styleLabel(unit) : undefined,
      body: lines.join("\n"),
    });
  }

  /** Os objetivos da luta em aberto, no alto da tela. Sem nenhum, a caixa some. */
  setGoals(lines: string[]): void {
    this.hasGoals = lines.length > 0;
    this.goals.setText(lines.map((line) => `◆ ${line}`).join("\n")).setVisible(this.hasGoals && this.shown);
  }

  // ------------------------------------------------------------------ a barra

  /** Troca o que a barra mostra. Os nove primeiros quadrados ganham as teclas 1 a 9. */
  setActions(buttons: ActionButton[], resources: TurnResources | null, onEnd?: () => void): void {
    this.buttons = buttons.slice(0, this.slots.length);
    this.onEnd = onEnd;
    this.endEnabled = onEnd !== undefined;
    this.drawEnd();
    this.slots.forEach((slot, i) => {
      const button = this.buttons[i];
      slot.set(
        button
          ? {
              icon: button.icon,
              hotkey: i < 9 ? `${i + 1}` : i === 9 ? "0" : undefined,
              count: button.count,
              wait: button.wait,
              cost: button.cost,
              enabled: button.enabled,
              selected: button.selected,
            }
          : {},
      );
    });
    this.drawResources(resources);
    this.hideTip();
  }

  private drawResources(resources: TurnResources | null): void {
    const g = this.resources;
    g.clear();
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;
    this.face.setVisible(resources !== null && this.shown);
    this.who.setText("");
    this.hpText.setText("");
    if (!resources) return;

    fitFace(this.face, resources.face, BAR_X + 12, BAR_Y + 14, FACE_W, FACE_H, resources.name);
    g.lineStyle(1, COLORS.gold, 1);
    g.strokeRect(BAR_X + 12, BAR_Y + 14, FACE_W, FACE_H);
    const ratio = resources.maxHp > 0 ? resources.hp / resources.maxHp : 0;
    drawBar(g, BAR_X + 12, BAR_Y + 110, FACE_W, 18, ratio, hpColor(ratio));
    this.hpText.setText(`${resources.hp}/${resources.maxHp}`);
    this.who.setText(`${resources.name}${resources.style ? `  ·  ${resources.style}` : ""}`);

    const { turn } = resources;
    const top = BAR_Y + 12;
    if (!turn) {
      this.label(GRID_X, top, `Vez de ${resources.name}`, TEXT_COLORS.inkDim, 15);
      return;
    }

    let x = GRID_X;
    // Ação: o círculo verde. Bônus: o triângulo laranja. Apagados, já foram gastos.
    g.fillStyle(COLORS.action, turn.action ? 1 : 0.18);
    g.fillCircle(x + 8, top + 9, 8);
    g.lineStyle(1, COLORS.action, 1);
    g.strokeCircle(x + 8, top + 9, 8);
    this.label(x + 20, top, "Ação", turn.action ? TEXT_COLORS.ink : TEXT_COLORS.inkDim);
    x += 62;
    g.fillStyle(COLORS.bonus, turn.bonus ? 1 : 0.18);
    g.fillTriangle(x, top + 17, x + 17, top + 17, x + 8.5, top + 1);
    g.lineStyle(1, COLORS.bonus, 1);
    g.strokeTriangle(x, top + 17, x + 17, top + 17, x + 8.5, top + 1);
    this.label(x + 21, top, "Bônus", turn.bonus ? TEXT_COLORS.ink : TEXT_COLORS.inkDim);
    x += 72;

    const meter = (width: number, name: string, now: number, max: number, color: number) => {
      drawBar(g, x, top + 2, width, 14, max > 0 ? now / max : 0, color);
      this.label(x + width / 2, top, `${name} ${now}/${max}`, TEXT_COLORS.white, 12, 0.5).setShadow(0, 1, "#000000", 3);
      x += width + 8;
    };
    meter(120, "Passo", turn.movement, turn.speed, COLORS.movement);
    meter(110, "Fôlego", turn.breath, turn.maxBreath, COLORS.breath);
    if (turn.mana) {
      // Quem conjura vê a mana e quanto do limite do turno já gastou: passar dele cobra do corpo.
      meter(90, "Mana", turn.mana.now, turn.mana.max, COLORS.mana);
      const over = turn.mana.spent >= turn.mana.limit;
      this.label(x, top, `limite ${turn.mana.spent}/${turn.mana.limit}`, over ? TEXT_COLORS.danger : TEXT_COLORS.inkDim, 12);
    }
  }

  private label(x: number, y: number, text: string, color: string, size = 13, origin = 0): Phaser.GameObjects.Text {
    const label = this.add(addBodyText(this.scene, x, y, text, { fontSize: `${size}px`, color }).setOrigin(origin, 0));
    label.setVisible(this.shown);
    this.labels.push(label);
    return label;
  }

  private drawEnd(): void {
    const g = this.endFrame;
    g.clear();
    const lit = this.endEnabled && this.endHover;
    g.fillStyle(0x0a0807, 1);
    g.fillCircle(END_X, END_Y, END_R);
    g.fillStyle(this.endEnabled ? 0x3a2a12 : 0x1a1512, 1);
    g.fillCircle(END_X, END_Y, END_R - 5);
    g.lineStyle(2, lit ? COLORS.goldBright : COLORS.gold, this.endEnabled ? 1 : 0.4);
    g.strokeCircle(END_X, END_Y, END_R);
    g.lineStyle(1, COLORS.bronze, 0.8);
    g.strokeCircle(END_X, END_Y, END_R - 5);
    this.endIcon?.setAlpha(this.endEnabled ? 1 : 0.3);
    this.endLabel?.setColor(this.endEnabled ? TEXT_COLORS.ink : TEXT_COLORS.inkDim);
  }

  private showSlotTip(index: number, x: number): void {
    const button = this.buttons[index];
    if (!button) return;
    this.tipShown = true;
    this.detail.setVisible(false);
    this.tip.show(x, BAR_Y - 8, {
      title: button.label,
      meta: button.tag,
      body: button.body,
      warn: button.enabled ? undefined : button.why,
    });
  }

  private hideTip(): void {
    this.tip.hide();
    this.tipShown = false;
    this.showDetail();
  }

  /** Aciona a opção de número `index` (0 = a primeira), como se tivesse sido clicada. */
  press(index: number): void {
    const button = this.buttons[index];
    if (button?.enabled) button.onClick();
    else if (button?.why) this.deny(button.why);
  }

  private deny(why: string): void {
    sfx("deny");
    this.warn(why);
  }

  /** A linha de explicação sobre a barra: o que o clique faria. */
  setDetail(text: string): void {
    this.detailText = text;
    this.showDetail();
  }

  private showDetail(): void {
    this.detail.setText(this.detailText);
    this.detail.setVisible(this.shown && !this.tipShown && this.detailText !== "");
  }

  /** A etiqueta junto do cursor: a chance de acertar, ou quem é. Vazia, some. */
  setChip(text: string, x = 0, y = 0): void {
    this.chip.setText(text).setPosition(x + 14, y - 6).setVisible(text !== "" && this.shown);
    if (this.chip.x + this.chip.width > GAME_WIDTH - 8) this.chip.setX(x - this.chip.width - 14);
  }

  // ---------------------------------------------------------------- o registro

  log(line: string): void {
    this.logLines = [...this.logLines, line].slice(-LOG_LINES);
    this.logText.setText(this.logLines.join("\n"));
    // Fala comprida quebra em mais de uma linha: o que passa do quadro sai por cima.
    while (this.logText.height > LOG_HEIGHT - 20 && this.logLines.length > 1) {
      this.logLines.shift();
      this.logText.setText(this.logLines.join("\n"));
    }
  }

  /** Aviso que aparece e some (comando recusado). */
  warn(text: string): void {
    this.warning.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.warning);
    this.scene.tweens.add({ targets: this.warning, alpha: 0, delay: 900, duration: 500 });
  }

  /** Número ou palavra que sobe e some a partir de um ponto da TELA. */
  float(x: number, y: number, text: string, color: string, size = 26): void {
    const label = this.addHud(
      addTitleText(this.scene, x, y, text, {
        fontSize: `${size}px`,
        color,
        stroke: "#141110",
        strokeThickness: 5,
      }).setOrigin(0.5),
    );
    // Nasce maior e assenta: o número "bate" antes de subir.
    this.scene.tweens.add({ targets: label, scale: { from: 1.6, to: 1 }, duration: 160, ease: "Back.easeOut" });
    this.scene.tweens.add({
      targets: label,
      y: y - 54,
      alpha: 0,
      duration: 950,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  /** O fim da luta: uma faixa de lado a lado. A promessa resolve quando o jogador confirma (Enter, Espaço ou clique). */
  showResult(title: string, lines: string[], titleColor: string): Promise<void> {
    const centerX = GAME_WIDTH / 2;
    // O escuro nasce antes da faixa: o que nasce depois fica na frente.
    this.resultObjects.push(this.addHud(this.scene.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.45)));
    const band = this.scene.add.graphics();
    const body = addBodyText(this.scene, centerX, 0, lines.join("\n"), {
      fontSize: "20px",
      align: "center",
      lineSpacing: 6,
      wordWrap: { width: 720 },
    }).setOrigin(0.5, 0);
    const height = 140 + body.height;
    const top = (GAME_HEIGHT - height) / 2;
    body.setY(top + 92);
    band.fillStyle(0x070605, 0.94);
    band.fillRect(0, top, GAME_WIDTH, height);
    band.lineStyle(2, COLORS.gold, 1);
    band.lineBetween(0, top, GAME_WIDTH, top);
    band.lineBetween(0, top + height, GAME_WIDTH, top + height);
    band.lineStyle(1, COLORS.bronze, 0.6);
    band.lineBetween(0, top + 6, GAME_WIDTH, top + 6);
    band.lineBetween(0, top + height - 6, GAME_WIDTH, top + height - 6);
    drawDiamond(band, centerX, top, 7);
    drawDiamond(band, centerX, top + height, 7);
    this.resultObjects.push(
      this.addHud(band),
      this.addHud(addTitleText(this.scene, centerX, top + 50, title, { fontSize: "46px", color: titleColor }).setOrigin(0.5)),
      this.addHud(body),
      this.addHud(
        addBodyText(this.scene, centerX, top + height - 26, "Enter pra continuar", {
          fontSize: "15px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );

    return new Promise((resolve) => {
      const keyboard = this.scene.input.keyboard!;
      const confirm = () => {
        keyboard.off("keydown-ENTER", confirm);
        keyboard.off("keydown-SPACE", confirm);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, confirm);
        resolve();
      };
      // Um instante de folga: o clique ou a tecla que deu o golpe final não fecha o painel.
      this.scene.time.delayedCall(350, () => {
        keyboard.on("keydown-ENTER", confirm);
        keyboard.on("keydown-SPACE", confirm);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, confirm);
      });
    });
  }

  /** Tudo que é da barra e fica de pé durante a luta. */
  private get fixedObjects(): { setVisible(visible: boolean): unknown }[] {
    return [
      this.roundText,
      this.logFrame,
      this.logText,
      this.bar,
      this.barZone,
      this.resources,
      this.who,
      this.hpText,
      this.endFrame,
      this.endIcon,
      this.endLabel,
      this.endZone,
      this.warning,
      ...this.labels,
      ...this.slots.map((slot) => slot.root),
      ...[...this.tiles.values()].map((tile) => tile.root),
    ];
  }

  /** Tira a interface da frente (e a devolve) enquanto a história fala no meio da luta. */
  setVisible(visible: boolean): void {
    this.shown = visible;
    for (const object of this.fixedObjects) object.setVisible(visible);
    this.party.setVisible(visible);
    this.face.setVisible(visible && this.who.text !== "");
    this.goals.setVisible(visible && this.hasGoals);
    this.showDetail();
    if (!visible) {
      this.tip.hide();
      this.chip.setVisible(false);
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.warning);
    this.party.destroy();
    this.tip.destroy();
    for (const tile of this.tiles.values()) tile.destroy();
    this.tiles.clear();
    for (const slot of this.slots) slot.destroy();
    for (const object of [
      this.roundText,
      this.logFrame,
      this.logText,
      this.goals,
      this.bar,
      this.barZone,
      this.face,
      this.resources,
      this.who,
      this.hpText,
      this.endFrame,
      this.endIcon,
      this.endLabel,
      this.endZone,
      this.detail,
      this.warning,
      this.chip,
      ...this.labels,
      ...this.resultObjects,
    ]) {
      object.destroy();
    }
  }
}
