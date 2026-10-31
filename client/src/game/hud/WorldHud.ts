import * as Phaser from "phaser";
import { tileAt, type AreaMap, type PixelPos } from "@jogo/shared";
import { CLOCK_BAR_BOTTOM, RIGHT_COLUMN_LEFT, RIGHT_COLUMN_TOP, RIGHT_COLUMN_WIDTH } from "../ClockBar";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "../config";
import type { IconName } from "../icons";
import { Tooltip, UiSlot, addBodyText, addPanel, addTitleText, drawPanel, type AddHud, type TipContent } from "../ui";
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
const BAR_WIDTH = PAD * 2 + ABILITY_SLOTS * (SLOT + SLOT_GAP) + SEPARATOR + MENU_SLOTS * (SLOT + SLOT_GAP) - SLOT_GAP;
const BAR_HEIGHT = SLOT + PAD * 2;
const BAR_X = (GAME_WIDTH - BAR_WIDTH) / 2;
const BAR_Y = GAME_HEIGHT - BAR_HEIGHT - 8;
const MAP_HEIGHT = 124;
/** De quanto em quanto tempo o minimapa redesenha os pontos. */
const MINIMAP_MS = 120;

function mapTextureKey(areaId: string): string {
  return `minimap:${areaId}`;
}

/**
 * O minimapa de uma área: cada quadrado do chão vira um pixel, tirado do próprio
 * tile (o canvas tira a média ao encolher), e o que barra a vista escurece.
 */
function paintMinimap(c: CanvasRenderingContext2D, map: AreaMap, tilemap: Phaser.Tilemaps.Tilemap): void {
  c.imageSmoothingEnabled = true;
  c.fillStyle = "#17120e";
  c.fillRect(0, 0, map.grid.width, map.grid.height);
  for (const layer of tilemap.layers) {
    if (!layer.tilemapLayer) continue;
    for (const row of layer.data) {
      for (const tile of row) {
        const set = tile.index > 0 ? tile.tileset : null;
        const at = set?.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null | undefined;
        const source = set?.image?.getSourceImage() as CanvasImageSource | undefined;
        if (set && at && source) c.drawImage(source, at.x, at.y, set.tileWidth, set.tileHeight, tile.x, tile.y, 1, 1);
      }
    }
  }
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
  private readonly keysHint: Phaser.GameObjects.Text;
  private readonly mapFrame: Phaser.GameObjects.Graphics;
  private readonly mapName: Phaser.GameObjects.Text;
  private readonly mapImage: Phaser.GameObjects.Image;
  private readonly mapDots: Phaser.GameObjects.Graphics;
  private readonly mapScale: number;
  private readonly mapOrigin: PixelPos;
  private sinceDots = 0;
  private buttonsKey = "";
  private shown = true;

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    private readonly map: AreaMap,
    tilemap: Phaser.Tilemaps.Tilemap,
    areaId: string,
    areaName: string,
    clockShown: boolean,
    onSelectMember: (id: string) => void,
  ) {
    const add: AddHud = (object) => {
      addHud(object);
      (object as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH);
      return object;
    };

    this.party = new PartyColumn(scene, add, onSelectMember);

    this.barFrame = add(addPanel(scene, BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT));
    // A barra segura o clique: ela não é chão.
    this.barZone = add(scene.add.zone(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT).setOrigin(0).setInteractive());

    this.tip = new Tooltip(scene);
    this.slots = Array.from({ length: ABILITY_SLOTS + MENU_SLOTS }, (_, i) => {
      const x = BAR_X + PAD + i * (SLOT + SLOT_GAP) + (i >= ABILITY_SLOTS ? SEPARATOR : 0);
      const y = BAR_Y + PAD;
      const slot = new UiSlot(scene, x, y, SLOT, {
        over: () => {
          const button = this.buttons[i];
          if (!button) return;
          const content: TipContent = { title: button.label, meta: button.meta, body: button.body };
          this.tip.show(x + SLOT / 2, BAR_Y - 8, content);
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

    this.keysHint = add(
      addBodyText(scene, GAME_WIDTH - 12, GAME_HEIGHT - 10, "WASD ou setas: andar", { fontSize: "13px", color: TEXT_COLORS.ink })
        .setOrigin(1, 1)
        .setShadow(0, 1, "#000000", 3),
    );

    // O minimapa: o chão da área, um quadro por área, e os pontos de quem está ali.
    const top = clockShown ? CLOCK_BAR_BOTTOM : RIGHT_COLUMN_TOP;
    this.mapFrame = add(addPanel(scene, RIGHT_COLUMN_LEFT, top, RIGHT_COLUMN_WIDTH, MAP_HEIGHT + 40, true));
    this.mapName = add(
      addTitleText(scene, RIGHT_COLUMN_LEFT + RIGHT_COLUMN_WIDTH / 2, top + 19, areaName, {
        fontSize: "12px",
        align: "center",
        wordWrap: { width: RIGHT_COLUMN_WIDTH - 24 },
      }).setOrigin(0.5),
    );
    const key = mapTextureKey(areaId);
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, map.grid.width, map.grid.height);
      const c = texture?.getContext();
      if (texture && c) {
        paintMinimap(c, map, tilemap);
        texture.refresh();
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    const room = { w: RIGHT_COLUMN_WIDTH - 16, h: MAP_HEIGHT - 6 };
    this.mapScale = Math.min(room.w / map.grid.width, room.h / map.grid.height);
    this.mapOrigin = {
      x: RIGHT_COLUMN_LEFT + (RIGHT_COLUMN_WIDTH - map.grid.width * this.mapScale) / 2,
      y: top + 36 + (room.h - map.grid.height * this.mapScale) / 2,
    };
    this.mapImage = add(scene.add.image(this.mapOrigin.x, this.mapOrigin.y, key).setOrigin(0).setScale(this.mapScale));
    this.mapDots = add(scene.add.graphics());
  }

  setParty(entries: PartyEntry[]): void {
    this.party.set(entries);
  }

  /** Os quadrados da barra: as habilidades à esquerda, os painéis à direita. */
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

  /** Redesenha os pontos do minimapa, de tempos em tempos. `dots` em pixels do mapa. */
  tick(delta: number, dots: { x: number; y: number; color: number; radius?: number }[]): void {
    this.sinceDots += delta;
    if (this.sinceDots < MINIMAP_MS) return;
    this.sinceDots = 0;
    const per = this.mapScale / this.map.tileSize;
    this.mapDots.clear();
    for (const dot of dots) {
      this.mapDots.fillStyle(dot.color, 1);
      this.mapDots.fillCircle(this.mapOrigin.x + dot.x * per, this.mapOrigin.y + dot.y * per, dot.radius ?? 2);
    }
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.party.setVisible(visible);
    for (const object of [this.barFrame, this.barZone, this.keysHint, this.mapFrame, this.mapName, this.mapImage, this.mapDots]) {
      (object as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    }
    for (const slot of this.slots) slot.root.setVisible(visible);
    this.prompt.setVisible(visible && this.prompt.text !== "");
    this.promptFrame.setVisible(visible && this.prompt.text !== "");
    this.promptZone.setVisible(visible);
    if (!visible) this.tip.hide();
  }
}
