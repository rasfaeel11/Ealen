import * as Phaser from "phaser";
import {
  AREAS,
  STARTING_AREA,
  STARTING_SPAWN,
  exitAt,
  parseTiledMap,
  walk,
  type AreaDef,
  type AreaExit,
  type AreaMap,
  type Character,
  type PixelPos,
  type WalkBody,
} from "@ealen/shared";
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_CHARACTER, SCENES, TEXT_COLORS } from "../game/config";
import { loadLocation, writeLocation } from "../game/save";
import { addBodyText, addTitleText } from "../game/ui";
import { classWalkKey, standingFrame, walkAnimKey, type Facing } from "../game/walkSprites";
import { mapKey, tilesetKey } from "../game/worldAssets";

/** Quantos pixels de tela vale um pixel do mapa. Com tiles de 16px, cabem ~27 x 15 quadrados na tela. */
const ZOOM = 3;
/** Pixels do mapa por segundo (6 quadrados de 16px). */
const WALK_SPEED = 96;
/** A caixa dos pés: mais estreita que um quadrado, pra passar em corredor de um de largura. */
const BODY: WalkBody = { halfWidth: 5, height: 6 };
const FADE_MS = 220;
/** Um quadro mais longo que isto (aba em segundo plano) não vira um salto pelo mapa. */
const MAX_FRAME_MS = 50;

/**
 * A profundidade é o que dá altura a um mapa chapado. Tudo que fica de pé
 * (personagem, árvore, parede) é desenhado na ordem do Y da própria BASE:
 * quem está mais ao sul cobre quem está mais ao norte. É assim que o
 * personagem passa por trás de uma copa e pela frente do tronco.
 */
const FLOOR_DEPTH = -1000;
const ABOVE_DEPTH = 1_000_000;
/** Camadas cujo nome começa com isto ficam de pé e entram na ordenação por Y, junto com os personagens. */
const SORTED_LAYER_PREFIX = "sorted";
/** Camadas cujo nome começa com isto são desenhadas POR CIMA de tudo (pontes altas, telhados). */
const ABOVE_LAYER_PREFIX = "above";

interface WorldSceneData {
  /** Chegando por uma saída: a área de destino e o ponto de chegada nela. */
  areaId?: string;
  spawn?: string;
}

type MoveKeys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

/**
 * O mundo: uma área por vez, com o personagem andando livre por ela. Só
 * desenha e lê o teclado — o que é chão, parede ou saída vem do mapa já
 * interpretado por shared/world.
 */
export default class WorldScene extends Phaser.Scene {
  private arrival: WorldSceneData = {};
  private area!: AreaDef;
  private map!: AreaMap;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private pos!: PixelPos;
  private facing: Facing = "down";
  private keys!: MoveKeys;
  private leaving = false;

  constructor() {
    super(SCENES.world);
  }

  init(data: WorldSceneData): void {
    this.arrival = data ?? {};
    this.leaving = false;
  }

  create(): void {
    const character = this.registry.get(REGISTRY_CHARACTER) as Character | undefined;
    if (!character) {
      this.scene.start(SCENES.title);
      return;
    }

    this.enterArea();
    const world = this.drawMap();

    const spriteKey = classWalkKey(character.characterClass);
    this.shadow = this.add.ellipse(0, 0, 12, 5, 0x000000, 0.3);
    this.player = this.add.sprite(0, 0, spriteKey, standingFrame(this.facing)).setOrigin(0.5, 1);
    this.placePlayer();
    world.push(this.shadow, this.player);

    const hud = [
      this.showAreaName(),
      addBodyText(this, 24, GAME_HEIGHT - 40, "WASD ou setas: andar  ·  T: arena de teste", {
        fontSize: "16px",
        color: TEXT_COLORS.inkDim,
      }),
    ];

    // Duas câmeras: a do mundo amplia e segue o personagem; a da interface fica parada, sem zoom.
    const camera = this.cameras.main;
    camera.setZoom(ZOOM);
    camera.setBounds(0, 0, this.map.grid.width * this.map.tileSize, this.map.grid.height * this.map.tileSize);
    camera.startFollow(this.player, true, 0.2, 0.2);
    camera.ignore(hud);
    camera.fadeIn(FADE_MS);
    this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT).ignore(world);

    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MoveKeys;
    // Provisório: a arena some quando o combate novo entrar no mapa.
    keyboard.on("keydown-T", () => this.scene.start(SCENES.arena));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.saveLocation, this);
    this.saveLocation();
  }

  update(_time: number, delta: number): void {
    if (this.leaving) return;

    const dx = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const dy = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);

    if (dx === 0 && dy === 0) {
      this.player.anims.stop();
      this.player.setFrame(standingFrame(this.facing));
      return;
    }

    // Na diagonal o passo é dividido entre os eixos: não se anda mais rápido de lado.
    const step = (WALK_SPEED * Math.min(delta, MAX_FRAME_MS)) / 1000 / Math.hypot(dx, dy);
    this.pos = walk(this.map, this.pos, dx * step, dy * step, BODY);
    this.placePlayer();

    this.facing = dx !== 0 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.player.anims.play(walkAnimKey(this.player.texture.key, this.facing), true);

    const exit = exitAt(this.map, this.pos);
    if (exit) this.leave(exit);
  }

  /**
   * Decide em que área e em que ponto o personagem aparece: chegando por
   * uma saída, no ponto que ela indica; continuando um jogo, onde ele
   * parou; jogo novo, no começo do mundo.
   */
  private enterArea(): void {
    const saved = this.arrival.areaId ? null : loadLocation();
    this.area = AREAS[this.arrival.areaId ?? saved?.areaId ?? ""] ?? AREAS[STARTING_AREA];
    this.map = parseTiledMap(this.cache.tilemap.get(mapKey(this.area.id)).data);

    const spawn =
      this.map.spawns[this.arrival.spawn ?? ""] ??
      this.map.spawns[STARTING_SPAWN] ??
      Object.values(this.map.spawns)[0];
    this.pos = saved && saved.areaId === this.area.id ? { x: saved.x, y: saved.y } : { ...spawn };
  }

  /** Põe o personagem (e a sombra dele) em `pos`, na profundidade dos próprios pés. */
  private placePlayer(): void {
    this.player.setPosition(this.pos.x, this.pos.y).setDepth(this.pos.y);
    this.shadow.setPosition(this.pos.x, this.pos.y - 1).setDepth(this.pos.y - 0.5);
  }

  /** Desenha as camadas do mapa e devolve os objetos criados (pra câmera da interface ignorar). */
  private drawMap(): Phaser.GameObjects.GameObject[] {
    const tilemap = this.make.tilemap({ key: mapKey(this.area.id) });
    const tilesets = tilemap.tilesets
      .map((tileset) => tilemap.addTilesetImage(tileset.name, tilesetKey(tileset.name)))
      .filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);

    const objects: Phaser.GameObjects.GameObject[] = [];
    tilemap.layers.forEach((data, index) => {
      if (data.name.startsWith(SORTED_LAYER_PREFIX)) {
        objects.push(...this.drawSortedLayer(tilemap, data, tilesets));
        return;
      }
      const layer = tilemap.createLayer(data.name, tilesets);
      if (!layer) return;
      layer.setDepth((data.name.startsWith(ABOVE_LAYER_PREFIX) ? ABOVE_DEPTH : FLOOR_DEPTH) + index);
      objects.push(layer);
    });
    return objects;
  }

  /**
   * Uma camada "de pé": cada tile vira uma imagem solta, ancorada na base do
   * próprio quadrado e com a profundidade dessa base. Tiles mais altos que
   * um quadrado (árvore, parede) sobem por cima do quadrado ao norte.
   */
  private drawSortedLayer(
    tilemap: Phaser.Tilemaps.Tilemap,
    data: Phaser.Tilemaps.LayerData,
    tilesets: Phaser.Tilemaps.Tileset[],
  ): Phaser.GameObjects.Image[] {
    const images: Phaser.GameObjects.Image[] = [];
    for (const tile of data.data.flat()) {
      const tileset = tilesets.find((candidate) => candidate.containsTileIndex(tile.index));
      const coordinates = tileset?.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null | undefined;
      if (!tileset?.image || !coordinates) continue;

      // O tileset é uma imagem só; cada tile usado ganha um quadro com nome nela.
      const frame = `tile:${tile.index - tileset.firstgid}`;
      if (!tileset.image.has(frame)) {
        tileset.image.add(frame, 0, coordinates.x, coordinates.y, tileset.tileWidth, tileset.tileHeight);
      }

      const base = (tile.y + 1) * tilemap.tileHeight;
      images.push(
        this.add
          .image(tile.x * tilemap.tileWidth, base, tileset.image.key, frame)
          .setOrigin(0, 1)
          .setDepth(base),
      );
    }
    return images;
  }

  /** O nome da área, no alto da tela, sumindo sozinho. */
  private showAreaName(): Phaser.GameObjects.Text {
    const banner = addTitleText(this, GAME_WIDTH / 2, 56, this.area.name, { fontSize: "36px" })
      .setOrigin(0.5)
      .setShadow(0, 2, "#000000", 6);
    this.tweens.add({ targets: banner, alpha: 0, delay: 2200, duration: 900 });
    return banner;
  }

  private leave(exit: AreaExit): void {
    this.leaving = true;
    this.player.anims.stop();
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ areaId: exit.area, spawn: exit.spawn } satisfies WorldSceneData);
    });
  }

  private saveLocation(): void {
    // Saindo por uma saída, quem grava o lugar novo é a área de destino, ao abrir.
    if (!this.leaving) writeLocation({ areaId: this.area.id, x: this.pos.x, y: this.pos.y });
  }
}
