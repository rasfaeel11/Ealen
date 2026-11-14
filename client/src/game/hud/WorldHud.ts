import * as Phaser from "phaser";
import { tileAt, type AreaMap, type PixelPos } from "@jogo/shared";
import { CLOCK_BAR_BOTTOM, RIGHT_COLUMN_LEFT, RIGHT_COLUMN_TOP, RIGHT_COLUMN_WIDTH } from "../ClockBar";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import { settings } from "../settings";
import type { IconName } from "../icons";
import { Tooltip, UiSlot, addBodyText, addPanel, drawPanel, type AddHud, type TipContent } from "../ui";
import { PartyColumn, type PartyEntry } from "./PartyColumn";

/** Um quadrado da barra de exploração. */
export interface FieldButton {
  icon: IconName;
  label: string;
  hotkey?: string;
  count?: number;
  /** Aceso: Q com o grupo agachado. */
  selected?: boolean;
  meta?: string;
  body?: string;
  onClick: () => void;
}

/** O que está ao alcance agora: falar, emboscar. Uma pílula sobre a barra. */
export interface FieldPrompt {
  key: string;
  label: string;
  onClick?: () => void;
}

/** Dentro do grupo, a depth abaixo de tudo: os painéis abrem por cima, mesmo os mais antigos. */
const DEPTH = -100;
const SLOT = 44;
const SLOT_GAP = 4;
const ABILITY_SLOTS = 8;
const MENU_SLOTS = 7;
const PAD = 10;
const SEPARATOR = 18;
const BAR_HEIGHT = SLOT + PAD * 2;
const BAR_Y = GAME_HEIGHT - BAR_HEIGHT - 8;
const MAP_HEIGHT = 124;
/** De quanto em quanto tempo o minimapa redesenha os pontos. */
const MINIMAP_MS = 120;
/** Com a barra "só parado", quanto tempo parado até ela voltar. */
const BAR_BACK_MS = 300;

function mapTextureKey(areaId: string): string {
  return `minimap:${areaId}`;
}

/**
 * O minimapa de uma área: o chão pintado, encolhido até cada quadrado virar um
 * pixel, e o que barra a vista escurece.
 */
function paintMinimap(c: CanvasRenderingContext2D, map: AreaMap, ground: CanvasImageSource): void {
  c.imageSmoothingEnabled = true;
  // O chão pintado é furado onde há água: a cor de baixo é a do rio.
  c.fillStyle = "#3a4d44";
  c.fillRect(0, 0, map.grid.width, map.grid.height);
  c.drawImage(ground, 0, 0, map.grid.width, map.grid.height);
  c.fillStyle = "rgba(10, 8, 7, 0.75)";
  for (let y = 0; y < map.grid.height; y++) {
    for (let x = 0; x < map.grid.width; x++) {
      if (tileAt(map.grid, { x, y })?.blocksSight) c.fillRect(x, y, 1, 1);
    }
  }
}

/**
 * A interface de quem anda pelo mundo: o grupo à esquerda, a barra embaixo
 * (o que o protagonista sabe fazer daqui e os painéis), o minimapa à direita
 * e, sobre a barra, o que está ao alcance. Não sabe nada de regra: a cena
 * entrega o que mostrar e recebe os cliques.
 */
export class WorldHud {
  private readonly party: PartyColumn;
  private readonly barFrame: Phaser.GameObjects.Graphics;
  private readonly barZone: Phaser.GameObjects.Zone;
  private readonly slots: UiSlot[];
  private buttons: (FieldButton | undefined)[] = [];
  private readonly tip: Tooltip;
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly promptFrame: Phaser.GameObjects.Graphics;
  private readonly promptZone: Phaser.GameObjects.Zone;
  private promptAction?: () => void;
  private promptKey = "";
  private readonly mapFrame: Phaser.GameObjects.Graphics;
  private readonly mapImage: Phaser.GameObjects.Image;
  private readonly mapDots: Phaser.GameObjects.Graphics;
  private readonly mapScale: number;
  private readonly mapOrigin: PixelPos;
  /** O objetivo de agora, embaixo do minimapa (ver currentObjective em shared/story/objectives.ts). */
  private readonly goalFrame: Phaser.GameObjects.Graphics;
  private readonly goalTitle: Phaser.GameObjects.Text;
  private readonly goalText: Phaser.GameObjects.Text;
  private readonly goalTop: number;
  private goal = "";
  private sinceDots = 0;
  private buttonsKey = "";
  private shown = true;
  private stillFor = BAR_BACK_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    private readonly map: AreaMap,
    ground: CanvasImageSource,
    areaId: string,
    clockShown: boolean,
    onSelectMember: (id: string) => void,
  ) {
    const add: AddHud = (object) => {
      addHud(object);
      (object as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
      return object;
    };

    this.party = new PartyColumn(scene, add, onSelectMember);

    this.barFrame = add(scene.add.graphics());
    // A barra segura o clique: ela não é chão.
    this.barZone = add(scene.add.zone(0, BAR_Y, 10, BAR_HEIGHT).setOrigin(0).setInteractive());

    this.tip = new Tooltip(scene);
    this.slots = Array.from({ length: ABILITY_SLOTS + MENU_SLOTS }, (_, i) => {
      const slot: UiSlot = new UiSlot(scene, 0, BAR_Y + PAD, SLOT, {
        over: () => {
          const button = this.buttons[i];
          if (!button) return;
          const content: TipContent = { title: button.label, meta: button.meta, body: button.body };
          this.tip.show(slot.root.x + SLOT / 2, BAR_Y - 8, content);
        },
        out: () => this.tip.hide(),
        down: () => this.buttons[i]?.onClick(),
      });
      add(slot.root);
      return slot;
    });
    // O cartão fica por cima dos quadrados.
    add(this.tip.root).setDepth(DEPTH + 10);

    this.promptFrame = add(scene.add.graphics());
    this.prompt = add(
      addBodyText(scene, GAME_WIDTH / 2, BAR_Y - 28, "", { fontSize: "16px", color: TEXT_COLORS.goldBright, align: "center" }).setOrigin(0.5),
    );
    this.promptZone = add(scene.add.zone(0, 0, 10, 10).setOrigin(0));
    this.promptZone.on(Phaser.Input.Events.POINTER_DOWN, () => this.promptAction?.());

    // O minimapa: o chão da área, um quadro por área, e os pontos de quem está ali.
    const top = clockShown ? CLOCK_BAR_BOTTOM : RIGHT_COLUMN_TOP;
    this.mapFrame = add(addPanel(scene, RIGHT_COLUMN_LEFT, top, RIGHT_COLUMN_WIDTH, MAP_HEIGHT + 10, true));
    const key = mapTextureKey(areaId);
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, map.grid.width, map.grid.height);
      const c = texture?.getContext();
      if (texture && c) {
        paintMinimap(c, map, ground);
        texture.refresh();
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    const room = { w: RIGHT_COLUMN_WIDTH - 16, h: MAP_HEIGHT - 6 };
    this.mapScale = Math.min(room.w / map.grid.width, room.h / map.grid.height);
    this.mapOrigin = {
      x: RIGHT_COLUMN_LEFT + (RIGHT_COLUMN_WIDTH - map.grid.width * this.mapScale) / 2,
      y: top + 8 + (room.h - map.grid.height * this.mapScale) / 2,
    };
    this.mapImage = add(scene.add.image(this.mapOrigin.x, this.mapOrigin.y, key).setOrigin(0).setScale(this.mapScale));
    this.mapDots = add(scene.add.graphics());

    this.goalTop = top + MAP_HEIGHT + 16;
    this.goalFrame = add(scene.add.graphics());
    this.goalTitle = add(
      addBodyText(scene, RIGHT_COLUMN_LEFT + 12, this.goalTop + 8, "OBJETIVO", { fontSize: "12px", color: TEXT_COLORS.gold }),
    );
    this.goalText = add(
      addBodyText(scene, RIGHT_COLUMN_LEFT + 12, this.goalTop + 26, "", {
        fontSize: "14px",
        color: TEXT_COLORS.ink,
        wordWrap: { width: RIGHT_COLUMN_WIDTH - 24 },
      }),
    );
    this.applySettings();
  }

  /** O que as opções mudam: o minimapa e a barra aparecem, ou não. */
  applySettings(): void {
    this.setVisible(this.shown);
  }

  /** O grupo está andando agora: a barra "só parado" sai da frente, e volta quando ele para. */
  setWalking(walking: boolean, delta: number): void {
    this.stillFor = walking ? 0 : this.stillFor + delta;
    if (settings().bar === "parado") this.showBar();
  }

  private get barOn(): boolean {
    const mode = settings().bar;
    return this.shown && (mode === "sempre" || (mode === "parado" && this.stillFor >= BAR_BACK_MS));
  }

  private showBar(): void {
    const on = this.barOn;
    if (this.barFrame.visible === on) return;
    this.barFrame.setVisible(on);
    this.barZone.setVisible(on);
    if (on) this.barZone.setInteractive();
    else this.barZone.disableInteractive();
    this.slots.forEach((slot, i) => slot.root.setVisible(on && this.buttons[i] !== undefined));
    if (!on) this.tip.hide();
  }

  setParty(entries: PartyEntry[]): void {
    this.party.set(entries);
  }

  /** Os quadrados da barra: as habilidades à esquerda, os painéis à direita. Quadrado vazio não aparece: a barra tem o tamanho do que ela oferece. */
  setButtons(abilities: FieldButton[], menus: FieldButton[]): void {
    const key = JSON.stringify([...abilities, ...menus].map((button) => [button.icon, button.hotkey, button.count, button.selected]));
    if (key === this.buttonsKey) {
      // Nada a redesenhar, mas os retornos podem ter mudado.
      this.buttons = this.placeButtons(abilities, menus);
      return;
    }
    this.buttonsKey = key;
    this.buttons = this.placeButtons(abilities, menus);
    this.slots.forEach((slot, i) => {
      const button = this.buttons[i];
      slot.set(button ? { icon: button.icon, hotkey: button.hotkey, count: button.count, selected: button.selected } : {});
    });
    this.layoutBar(abilities.length);
  }

  /** Só os quadrados com alguma coisa, centrados, com o espaço entre as habilidades e os painéis. */
  private layoutBar(abilities: number): void {
    const used = this.buttons.filter(Boolean).length;
    const gap = abilities > 0 ? SEPARATOR : 0;
    const width = PAD * 2 + used * (SLOT + SLOT_GAP) - SLOT_GAP + gap;
    const left = (GAME_WIDTH - width) / 2;
    let x = left + PAD;
    this.slots.forEach((slot, i) => {
      if (i === ABILITY_SLOTS) x += gap;
      slot.root.setVisible(this.barOn && this.buttons[i] !== undefined);
      if (!this.buttons[i]) return;
      slot.root.setX(x);
      x += SLOT + SLOT_GAP;
    });
    this.barFrame.clear();
    drawPanel(this.barFrame, left, BAR_Y, width, BAR_HEIGHT);
    this.barZone.setX(left).setSize(width, BAR_HEIGHT);
    (this.barZone.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setSize(width, BAR_HEIGHT);
  }

  private placeButtons(abilities: FieldButton[], menus: FieldButton[]): (FieldButton | undefined)[] {
    const row: (FieldButton | undefined)[] = Array.from({ length: ABILITY_SLOTS + MENU_SLOTS });
    abilities.slice(0, ABILITY_SLOTS).forEach((button, i) => (row[i] = button));
    menus.slice(0, MENU_SLOTS).forEach((button, i) => (row[ABILITY_SLOTS + i] = button));
    return row;
  }

  /** O que dá pra fazer aqui: uma linha por opção, ou nada. */
  setPrompts(prompts: FieldPrompt[]): void {
    const key = prompts.map((prompt) => `${prompt.key}:${prompt.label}`).join("|");
    this.promptAction = prompts[0]?.onClick;
    if (key === this.promptKey) return;
    this.promptKey = key;
    const text = prompts.map((prompt) => (prompt.key ? `[${prompt.key}]  ${prompt.label}` : prompt.label)).join("\n");
    this.prompt.setText(text);
    const visible = text !== "" && this.shown;
    this.prompt.setVisible(visible);
    this.promptFrame.setVisible(visible);
    this.promptFrame.clear();
    this.promptZone.disableInteractive();
    if (text === "") return;
    const width = this.prompt.width + 36;
    const height = this.prompt.height + 14;
    const bottom = BAR_Y - 8;
    const x = (GAME_WIDTH - width) / 2;
    const y = bottom - height;
    this.prompt.setY(y + height / 2);
    drawPanel(this.promptFrame, x, y, width, height, true);
    this.promptZone.setPosition(x, y).setSize(width, height);
    this.promptZone.setInteractive({ useHandCursor: prompts[0]?.onClick !== undefined });
  }

  /** O objetivo de agora, numa caixa embaixo do minimapa. Vazio, a caixa some. */
  setObjective(text: string): void {
    if (text === this.goal) return;
    this.goal = text;
    this.goalText.setText(text);
    this.goalFrame.clear();
    if (text !== "") drawPanel(this.goalFrame, RIGHT_COLUMN_LEFT, this.goalTop, RIGHT_COLUMN_WIDTH, this.goalText.height + 36, true);
    this.setVisible(this.shown);
  }

  /** Redesenha os pontos do minimapa, de tempos em tempos. `dots` em pixels do mapa; `ring` desenha um anel (o objetivo). */
  tick(delta: number, dots: { x: number; y: number; color: number; radius?: number; ring?: boolean }[]): void {
    this.sinceDots += delta;
    if (this.sinceDots < MINIMAP_MS) return;
    this.sinceDots = 0;
    const per = this.mapScale / this.map.tileSize;
    this.mapDots.clear();
    for (const dot of dots) {
      const at = { x: this.mapOrigin.x + dot.x * per, y: this.mapOrigin.y + dot.y * per };
      if (dot.ring) {
        // O objetivo pulsa: o anel cresce e encolhe com o tempo.
        const pulse = 1 + 0.35 * Math.sin(this.scene.time.now / 260);
        this.mapDots.lineStyle(2, dot.color, 1);
        this.mapDots.strokeCircle(at.x, at.y, (dot.radius ?? 4) * pulse);
        continue;
      }
      this.mapDots.fillStyle(dot.color, 1);
      this.mapDots.fillCircle(at.x, at.y, dot.radius ?? 2);
    }
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.party.setVisible(visible);
    for (const object of [this.mapFrame, this.mapImage, this.mapDots]) {
      (object as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible && settings().minimap);
    }
    const goal = visible && this.goal !== "";
    this.goalFrame.setVisible(goal);
    this.goalTitle.setVisible(goal);
    this.goalText.setVisible(goal);
    this.barFrame.setVisible(!this.barOn);
    this.showBar();
    this.prompt.setVisible(visible && this.prompt.text !== "");
    this.promptFrame.setVisible(visible && this.prompt.text !== "");
    this.promptZone.setVisible(visible);
    if (!visible) this.tip.hide();
  }
}
