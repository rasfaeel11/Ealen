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

const PLAYER_DEPTH = 10;
/** Camadas cujo nome começa com isto são desenhadas POR CIMA do personagem (copas, telhados). */
const ABOVE_LAYER_PREFIX = "above";
const ABOVE_DEPTH = 20;

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
    this.player = this.add
      .sprite(this.pos.x, this.pos.y, spriteKey, standingFrame(this.facing))
      .setOrigin(0.5, 1)
      .setDepth(PLAYER_DEPTH);
    world.push(this.player);

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
    this.player.setPosition(this.pos.x, this.pos.y);

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

  /** Desenha as camadas do mapa e devolve os objetos criados (pra câmera da interface ignorar). */
  private drawMap(): Phaser.GameObjects.GameObject[] {
    const tilemap = this.make.tilemap({ key: mapKey(this.area.id) });
    const tilesets = tilemap.tilesets
      .map((tileset) => tilemap.addTilesetImage(tileset.name, tilesetKey(tileset.name)))
      .filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);

    const layers: Phaser.GameObjects.GameObject[] = [];
    tilemap.layers.forEach((data, index) => {
      const layer = tilemap.createLayer(data.name, tilesets);
      if (!layer) return;
      layer.setDepth(data.name.startsWith(ABOVE_LAYER_PREFIX) ? ABOVE_DEPTH : index);
      layers.push(layer);
    });
    return layers;
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
