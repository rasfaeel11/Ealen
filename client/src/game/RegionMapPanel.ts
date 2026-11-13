import * as Phaser from "phaser";
import { AREAS, type AreaExit, type AreaMap, type PixelPos, type TravelSpot, type WorldLink } from "@jogo/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import type { Scenery } from "./Scenery";
import { isAction } from "./settings";
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
  /** A página da viagem (`Tab`): o grafo das áreas e aonde se pode ir. Sem ela, só a região. */
  travel?: TravelView;
}

export interface TravelView {
  /** A área em que o grupo está. */
  here: string;
  /** As áreas já pisadas. */
  visited: readonly string[];
  /** Os mapas, pra saber de que lado fica cada saída. */
  maps: Readonly<Record<string, AreaMap>>;
  /** As ligações abertas agora entre todas as áreas (ver worldLinks). */
  links: readonly WorldLink[];
  /** Aonde a viagem leva (ver travelSpots). */
  spots: readonly TravelSpot[];
  /** Por que não se viaja agora, se não se viaja. */
  blocked?: string;
  onTravel: (spot: TravelSpot) => void;
}

/** O passo, na grade do desenho do mundo, de quem sai pelo lado de cada seta. */
const ARROW_STEP: Record<string, { x: number; y: number }> = {
  "◂": { x: -1, y: 0 },
  "▸": { x: 1, y: 0 },
  "▴": { x: 0, y: -1 },
  "▾": { x: 0, y: 1 },
};

/**
 * Onde cada área fica no desenho do mundo: a partir da de agora, cada vizinha
 * do lado por onde a saída sai (a floresta ao norte se a saída pra ela é a do
 * norte). Nada inventado: é o que os mapas já dizem. Quem cairia em cima de
 * outra anda mais um passo.
 */
function layoutAreas(view: TravelView, areas: readonly string[]): Map<string, { x: number; y: number }> {
  const at = new Map<string, { x: number; y: number }>([[view.here, { x: 0, y: 0 }]]);
  const taken = (spot: { x: number; y: number }) => [...at.values()].some((other) => other.x === spot.x && other.y === spot.y);
  const queue = [view.here];
  while (queue.length > 0) {
    const from = queue.shift()!;
    for (const link of view.links) {
      const forward = link.from === from && !at.has(link.to);
      const backward = link.to === from && !at.has(link.from);
      if (!forward && !backward) continue;
      const area = forward ? link.to : link.from;
      if (!areas.includes(area)) continue;
      const step = ARROW_STEP[exitArrow(link.exit, view.maps[link.from])];
      const sign = forward ? 1 : -1;
      const origin = at.get(from)!;
      let spot = { x: origin.x + step.x * sign, y: origin.y + step.y * sign };
      while (taken(spot)) spot = { x: spot.x + step.x * sign, y: spot.y + step.y * sign };
      at.set(area, spot);
      queue.push(area);
    }
  }
  return at;
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
  private region: Phaser.GameObjects.GameObject[] = [];
  private travel?: TravelView;
  private travelPage: Phaser.GameObjects.GameObject[] = [];
  private travelRows: Phaser.GameObjects.Text[] = [];
  private showingTravel = false;
  private choice = 0;

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
    const regionFrom = this.objects.length;
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

    const tab = view.travel ? "   ·   Tab: viagem" : "";
    this.objects.push(
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 26, `◆ o grupo   ·   ● gente${tab}   ·   Esc: fechar`, {
          fontSize: "15px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );
    this.region = this.objects.slice(regionFrom);
    if (view.travel) {
      this.travel = view.travel;
      this.travelPage = this.buildTravel(addHud, view.travel);
      this.flip(false);
    }
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
    if (event.code === "Tab" && this.travel) {
      event.preventDefault();
      this.flip(!this.showingTravel);
      return;
    }
    if (this.showingTravel && this.travel && this.travel.spots.length > 0) {
      const count = this.travel.spots.length;
      if (event.code === "ArrowUp" || event.code === "KeyW") return this.pick((this.choice + count - 1) % count);
      if (event.code === "ArrowDown" || event.code === "KeyS") return this.pick((this.choice + 1) % count);
      if (event.code === "Enter") return this.go(this.choice);
    }
    if (event.code === "Escape" || isAction(event, "map") || event.code === "Enter") this.onClose();
  }

  /** Troca entre a região e a viagem. */
  private flip(travel: boolean): void {
    this.showingTravel = travel;
    const show = (objects: Phaser.GameObjects.GameObject[], visible: boolean) => {
      for (const object of objects) (object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(visible);
    };
    show(this.region, !travel);
    show(this.travelPage, travel);
  }

  private pick(index: number): void {
    this.choice = index;
    this.travelRows.forEach((row, i) => row.setColor(i === index ? TEXT_COLORS.goldBright : TEXT_COLORS.ink));
  }

  private go(index: number): void {
    const travel = this.travel;
    const spot = travel?.spots[index];
    if (!travel || !spot || travel.blocked) return;
    travel.onTravel(spot);
  }

  /**
   * A página da viagem: o desenho do mundo (as áreas já pisadas e as vizinhas
   * que uma saída aberta delas mostra, ligadas pelas saídas, com o grupo na de
   * agora) e a lista de aonde se pode ir, com quantas áreas se cruza.
   */
  private buildTravel(addHud: AddHud, travel: TravelView): Phaser.GameObjects.GameObject[] {
    const { scene } = this;
    const page: Phaser.GameObjects.GameObject[] = [];
    const heading = addHeading(scene, GAME_WIDTH / 2, 44, "VIAGEM", 760, 24);
    page.push(addHud(heading.rule), addHud(heading.label));

    // As áreas no desenho: as pisadas e as que uma saída aberta de uma pisada mostra.
    const known = new Set(travel.visited);
    known.add(travel.here);
    const shown = new Set(known);
    for (const link of travel.links) if (known.has(link.from)) shown.add(link.to);
    const layout = layoutAreas(travel, [...shown]);
    const cells = [...layout.values()];
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const boxLeft = 80;
    const boxWidth = GAME_WIDTH * 0.55;
    const boxTop = TOP + 40;
    const boxHeight = GAME_HEIGHT - boxTop - 120;
    const stepX = Math.min(260, boxWidth / Math.max(1, maxX - minX + 1));
    const stepY = Math.min(170, boxHeight / Math.max(1, maxY - minY + 1));
    const screen = (cell: { x: number; y: number }) => ({
      x: boxLeft + boxWidth / 2 + (cell.x - (minX + maxX) / 2) * stepX,
      y: boxTop + boxHeight / 2 + (cell.y - (minY + maxY) / 2) * stepY,
    });

    const lines = addHud(scene.add.graphics());
    page.push(lines);
    lines.lineStyle(3, COLORS.inkDim, 0.8);
    const drawn = new Set<string>();
    for (const link of travel.links) {
      const a = layout.get(link.from);
      const b = layout.get(link.to);
      const key = [link.from, link.to].sort().join(">");
      if (!a || !b || drawn.has(key) || !known.has(link.from)) continue;
      drawn.add(key);
      const pa = screen(a);
      const pb = screen(b);
      lines.lineBetween(pa.x, pa.y, pb.x, pb.y);
    }
    const marks = addHud(scene.add.graphics());
    page.push(marks);
    for (const [area, cell] of layout) {
      const { x, y } = screen(cell);
      const seen = known.has(area);
      if (area === travel.here) drawDiamond(marks, x, y, 12, COLORS.goldBright);
      else {
        marks.fillStyle(0x0a0807, 0.95);
        marks.fillCircle(x, y, 9);
        marks.fillStyle(seen ? COLORS.ink : COLORS.inkDim, 1);
        marks.fillCircle(x, y, seen ? 6.5 : 4);
      }
      page.push(
        addHud(
          addBodyText(scene, x, y + 22, AREAS[area]?.name ?? area, {
            fontSize: "15px",
            color: area === travel.here ? TEXT_COLORS.goldBright : seen ? TEXT_COLORS.ink : TEXT_COLORS.inkDim,
            align: "center",
            wordWrap: { width: Math.max(140, stepX - 16) },
          }).setOrigin(0.5, 0),
        ),
      );
    }

    // A lista de aonde se vai.
    const listLeft = boxLeft + boxWidth + 40;
    const listWidth = GAME_WIDTH - listLeft - 60;
    const top = boxTop;
    page.push(addHud(addBodyText(scene, listLeft, top, "Ir para", { fontSize: "19px", color: TEXT_COLORS.goldBright })));
    const rowsTop = top + 40;
    this.travelRows = travel.spots.map((spot, index) => {
      const steps = spot.steps === 1 ? "logo ali" : `${spot.steps} áreas no caminho`;
      const row = addHud(
        addBodyText(scene, listLeft, rowsTop + index * 56, `${AREAS[spot.area]?.name ?? spot.area}\n  ${steps}`, {
          fontSize: "17px",
          color: TEXT_COLORS.ink,
          lineSpacing: 2,
          wordWrap: { width: listWidth },
        }),
      );
      if (travel.blocked) row.setAlpha(0.5);
      else {
        row.setInteractive({ useHandCursor: true });
        row.on("pointerover", () => this.pick(index));
        row.on("pointerdown", () => this.go(index));
      }
      return row;
    });
    page.push(...this.travelRows);
    const note =
      travel.blocked ??
      (travel.spots.length === 0
        ? "Nenhum lugar já visto a que se chegue daqui."
        : "Cada área no caminho gasta o tempo como se o grupo tivesse entrado nela.");
    page.push(
      addHud(
        addBodyText(scene, listLeft, rowsTop + Math.max(1, travel.spots.length) * 56 + 12, note, {
          fontSize: "15px",
          color: travel.blocked ? TEXT_COLORS.danger : TEXT_COLORS.inkDim,
          wordWrap: { width: listWidth },
        }),
      ),
    );
    page.push(
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 26, "◆ o grupo   ·   ↑↓ e Enter: ir   ·   Tab: região   ·   Esc: fechar", {
          fontSize: "15px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );
    this.pick(0);
    this.objects.push(...page);
    return page;
  }
}
