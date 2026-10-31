import * as Phaser from "phaser";
import { AREAS, type AreaExit, type AreaMap, type PixelPos } from "@jogo/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import type { Scenery } from "./Scenery";
import { addBodyText, addCloseButton, addHeading, drawDiamond, type AddHud } from "./ui";

/** Quanto da tela o mapa pode ocupar. */
const ROOM_W = GAME_WIDTH - 160;
const ROOM_H = GAME_HEIGHT - 150;
const TOP = 88;
const TEXTURE_KEY = "regionMap";
/** A tecla que abriu o mapa não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

export interface RegionMapView {
  name: string;
  map: AreaMap;
  scenery: Scenery;
  flag: (name: string) => unknown;
  /** Onde o grupo está, em pixels do mapa. */
  pos: PixelPos;
  /** Quem está de pé na área, em pixels do mapa. Inimigo não entra: quem vê é o olho, não o mapa. */
  people: PixelPos[];
  /** As saídas abertas agora. */
  exits: AreaExit[];
}

/** A seta que aponta pra fora do mapa, pelo lado em que a saída fica. */
function exitArrow(exit: AreaExit, map: AreaMap): string {
  const size = map.tileSize;
  if (exit.x < size) return "◂";
  if (exit.y < size) return "▴";
  if (exit.x + exit.width > (map.grid.width - 1) * size) return "▸";
  return "▾";
}

/**
 * O mapa da região, por cima do mundo parado: a área em que o grupo está,
 * pintada inteira, com o lugar dele, a gente que está ali e por onde se sai.
 * O mundo não aparece: esta história cabe num trecho de rio.
 *
 * Esc, M ou Enter fecham.
 */
export class RegionMapPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    view: RegionMapView,
    private readonly onClose: () => void,
  ) {
    const { map } = view;
    const worldWidth = map.grid.width * map.tileSize;
    const worldHeight = map.grid.height * map.tileSize;
    const per = Math.min(ROOM_W / worldWidth, ROOM_H / worldHeight);
    const width = Math.round(worldWidth * per);
    const height = Math.round(worldHeight * per);
    const left = Math.round((GAME_WIDTH - width) / 2);
    const top = TOP;

    if (scene.textures.exists(TEXTURE_KEY)) scene.textures.remove(TEXTURE_KEY);
    const texture = scene.textures.createCanvas(TEXTURE_KEY, width, height);
    const context = texture?.getContext();
    if (texture && context) {
      view.scenery.paintRegion(context, width, height, view.flag);
      texture.refresh();
    }

    this.objects.push(addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.88).setOrigin(0).setInteractive()));
    const heading = addHeading(scene, GAME_WIDTH / 2, 44, view.name.toUpperCase(), Math.min(width, 760), 24);
    this.objects.push(addHud(heading.rule), addHud(heading.label));
    this.objects.push(addHud(scene.add.image(left, top, TEXTURE_KEY).setOrigin(0)));
    this.objects.push(addHud(scene.add.rectangle(left + width / 2, top + height / 2, width + 6, height + 6).setStrokeStyle(2, COLORS.gold, 1)));
    this.objects.push(addHud(addCloseButton(scene, left + width + 22, top + 8, () => this.onClose())));

    const marks = addHud(scene.add.graphics());
    this.objects.push(marks);
    for (const person of view.people) {
      marks.fillStyle(0x0a0807, 0.9);
      marks.fillCircle(left + person.x * per, top + person.y * per, 5);
      marks.fillStyle(COLORS.ink, 1);
      marks.fillCircle(left + person.x * per, top + person.y * per, 3.5);
    }
    drawDiamond(marks, left + view.pos.x * per, top + view.pos.y * per, 9, COLORS.goldBright);

    for (const exit of view.exits) {
      const x = left + (exit.x + exit.width / 2) * per;
      const y = top + (exit.y + exit.height / 2) * per;
      const label = addHud(
        addBodyText(scene, x, y, `${exitArrow(exit, map)} ${AREAS[exit.area]?.name ?? exit.area}`, {
          fontSize: "15px",
          color: TEXT_COLORS.goldBright,
          backgroundColor: "rgba(10, 8, 7, 0.85)",
          padding: { x: 7, y: 3 },
        }).setOrigin(0.5),
      );
      // O nome fica inteiro dentro do mapa, encostado na borda de onde se sai.
      label.setX(Math.max(left + label.width / 2 + 4, Math.min(left + width - label.width / 2 - 4, x)));
      label.setY(Math.max(top + label.height / 2 + 4, Math.min(top + height - label.height / 2 - 4, y)));
      this.objects.push(label);
    }

    this.objects.push(
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 26, "◆ o grupo   ·   ● gente   ·   Esc: fechar", {
          fontSize: "15px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );
    this.openedAt = scene.time.now;
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of this.objects) object.destroy();
    if (this.scene.textures.exists(TEXTURE_KEY)) this.scene.textures.remove(TEXTURE_KEY);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "Escape" || event.code === "KeyM" || event.code === "Enter") this.onClose();
  }
}
