import * as Phaser from "phaser";
import {
  AREAS,
  STARTING_AREA,
  STARTING_SPAWN,
  aggroedGroup,
  exitAt,
  findUnit,
  grantEncounterRewards,
  parseTiledMap,
  pixelOfTile,
  startAreaEncounter,
  unusedItems,
  syncCharacterFromUnit,
  tileOfPixel,
  walk,
  type AreaDef,
  type AreaEnemy,
  type AreaExit,
  type AreaMap,
  type Character,
  type Encounter,
  type PixelPos,
  type TeamId,
  type WalkBody,
} from "@ealen/shared";
import { CombatController } from "../game/combat/CombatController";
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_CHARACTER, SCENES, TEXT_COLORS } from "../game/config";
import { MapActor } from "../game/MapActor";
import { classSpriteKey, creatureSpriteKey, type Facing } from "../game/mapSprites";
import { loadDefeated, loadLocation, markDefeated, writeLocation, writeSave } from "../game/save";
import { addBodyText, addTitleText } from "../game/ui";
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

const EXPLORE_HINT = "WASD ou setas: andar  ·  R: descansar";

interface WorldSceneData {
  /** Chegando por uma saída (ou voltando de uma derrota): a área e o ponto de chegada nela. */
  areaId?: string;
  spawn?: string;
}

type MoveKeys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

/**
 * O mundo: uma área por vez, com o personagem andando livre por ela — e as
 * lutas, que acontecem aqui mesmo, sem trocar de cena. Só desenha e lê o
 * teclado: o que é chão, parede, saída ou inimigo vem do mapa interpretado
 * por shared/world, e o combate inteiro é do motor em shared/tactics.
 */
export default class WorldScene extends Phaser.Scene {
  private arrival: WorldSceneData = {};
  private character!: Character;
  private area!: AreaDef;
  private map!: AreaMap;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private player!: MapActor;
  private pos!: PixelPos;
  private keys!: MoveKeys;
  /** Inimigos ainda de pé nesta área, e o ator de cada um. */
  private enemies: AreaEnemy[] = [];
  private enemyActors = new Map<string, MapActor>();
  private combat?: CombatController;
  private leaving = false;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.world);
  }

  init(data: WorldSceneData): void {
    this.arrival = data ?? {};
    this.leaving = false;
    this.combat = undefined;
    this.enemies = [];
    this.enemyActors = new Map();
  }

  create(): void {
    const character = this.registry.get(REGISTRY_CHARACTER) as Character | undefined;
    if (!character) {
      this.scene.start(SCENES.title);
      return;
    }
    this.character = character;

    // Duas câmeras: a do mundo amplia e segue o personagem; a da interface fica parada, sem zoom.
    // Todo objeto da cena passa por addWorld ou addHud pra ser desenhado por uma só.
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.enterArea();
    this.drawMap();
    this.player = this.addActor(classSpriteKey(character.characterClass), this.pos);
    this.spawnEnemies();

    this.statusText = this.addHud(
      addBodyText(this, 24, 20, "", { fontSize: "18px", color: TEXT_COLORS.gold }).setShadow(0, 2, "#000000", 4),
    );
    this.hintText = this.addHud(
      addBodyText(this, 24, GAME_HEIGHT - 40, EXPLORE_HINT, { fontSize: "16px", color: TEXT_COLORS.inkDim }).setShadow(
        0,
        2,
        "#000000",
        4,
      ),
    );
    this.refreshStatus();
    this.showBanner(this.area.name);

    const camera = this.cameras.main;
    camera.setZoom(ZOOM);
    camera.setBounds(0, 0, this.map.grid.width * this.map.tileSize, this.map.grid.height * this.map.tileSize);
    camera.startFollow(this.player.followTarget, true, 0.2, 0.2);
    camera.fadeIn(FADE_MS);

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
    keyboard.on("keydown-R", this.rest, this);
    // O botão direito cancela a mira no combate; o menu do navegador só atrapalharia.
    this.input.mouse?.disableContextMenu();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.saveLocation, this);
    this.saveLocation();
  }

  update(_time: number, delta: number): void {
    if (this.leaving || this.combat) return;

    const dx = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const dy = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);
    if (dx === 0 && dy === 0) {
      this.player.setWalking(false);
      return;
    }

    // Na diagonal o passo é dividido entre os eixos: não se anda mais rápido de lado.
    const step = (WALK_SPEED * Math.min(delta, MAX_FRAME_MS)) / 1000 / Math.hypot(dx, dy);
    this.pos = walk(this.map, this.pos, dx * step, dy * step, BODY);
    this.player.place(this.pos);

    const facing: Facing = dx !== 0 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.player.face(facing);
    this.player.setWalking(true);

    const exit = exitAt(this.map, this.pos);
    if (exit) {
      this.leave(exit);
      return;
    }

    const group = aggroedGroup(this.map, this.enemies, tileOfPixel(this.map, this.pos));
    if (group) this.startCombat(group);
  }

  // ------------------------------------------------------------- montagem

  /** Só a câmera do mundo desenha este objeto. */
  private addWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.uiCamera.ignore(object);
    return object;
  }

  /** Só a câmera da interface desenha este objeto. */
  private addHud<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.cameras.main.ignore(object);
    return object;
  }

  private addActor(spriteKey: string, pos: PixelPos): MapActor {
    const actor = new MapActor(this, spriteKey, pos);
    for (const object of actor.objects) this.addWorld(object);
    return actor;
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

  private drawMap(): void {
    const tilemap = this.make.tilemap({ key: mapKey(this.area.id) });
    const tilesets = tilemap.tilesets
      .map((tileset) => tilemap.addTilesetImage(tileset.name, tilesetKey(tileset.name)))
      .filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);

    tilemap.layers.forEach((data, index) => {
      if (data.name.startsWith(SORTED_LAYER_PREFIX)) {
        this.drawSortedLayer(tilemap, data, tilesets);
        return;
      }
      const layer = tilemap.createLayer(data.name, tilesets);
      if (!layer) return;
      layer.setDepth((data.name.startsWith(ABOVE_LAYER_PREFIX) ? ABOVE_DEPTH : FLOOR_DEPTH) + index);
      this.addWorld(layer);
    });
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
  ): void {
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
      this.addWorld(
        this.add
          .image(tile.x * tilemap.tileWidth, base, tileset.image.key, frame)
          .setOrigin(0, 1)
          .setDepth(base),
      );
    }
  }

  /** Põe no mapa os inimigos da área cujo grupo ainda não foi vencido. */
  private spawnEnemies(): void {
    const defeated = loadDefeated();
    this.enemies = this.map.enemies.filter((enemy) => !defeated.has(this.groupKey(enemy.group)));
    for (const enemy of this.enemies) {
      const feet = pixelOfTile(this.map, tileOfPixel(this.map, enemy));
      this.enemyActors.set(enemy.id, this.addActor(creatureSpriteKey(enemy.creature), feet));
    }
  }

  private groupKey(group: string): string {
    return `${this.area.id}:${group}`;
  }

  // -------------------------------------------------------------- interface

  private refreshStatus(): void {
    const { name, level, currentHp, maxHp } = this.character;
    this.statusText.setText(`${name}  ·  Nível ${level}  ·  HP ${currentHp}/${maxHp}`);
  }

  /** Um título no alto da tela, sumindo sozinho (nome da área, avisos). */
  private showBanner(text: string): void {
    const banner = this.addHud(
      addTitleText(this, GAME_WIDTH / 2, 72, text, { fontSize: "36px" }).setOrigin(0.5).setShadow(0, 2, "#000000", 6),
    );
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 800, onComplete: () => banner.destroy() });
  }

  /** Provisório, no lugar de acampamento/estalagem: recupera todo o HP, em qualquer lugar fora de luta. */
  private rest(): void {
    if (this.combat || this.leaving) return;
    this.character.currentHp = this.character.maxHp;
    writeSave(this.character);
    this.refreshStatus();
    this.showBanner("Você descansa.");
  }

  // ----------------------------------------------------------------- combate

  /** Um grupo de inimigos percebeu o personagem: a luta começa onde cada um está. */
  private startCombat(group: string): void {
    const fighters = this.enemies.filter((enemy) => enemy.group === group);
    const playerTile = tileOfPixel(this.map, this.pos);

    // No combate todo mundo fica no meio de um quadrado.
    this.pos = pixelOfTile(this.map, playerTile);
    this.player.setWalking(false);
    this.player.place(this.pos);

    const seed = Math.floor(Math.random() * 0xffffffff);
    const { encounter, events } = startAreaEncounter(this.map, this.character, playerTile, fighters, seed);

    const actors = new Map<string, MapActor>([[this.character.id, this.player]]);
    for (const enemy of fighters) actors.set(enemy.id, this.enemyActors.get(enemy.id)!);

    this.statusText.setVisible(false);
    this.hintText.setVisible(false);
    this.combat = new CombatController(
      {
        scene: this,
        map: this.map,
        actors,
        addWorld: (object) => this.addWorld(object),
        addHud: (object) => this.addHud(object),
      },
      encounter,
      (winner) => void this.endCombat(encounter, group, fighters, winner),
    );
    void this.combat.start(events);
  }

  /** A luta acabou: devolve à ficha o que ela gastou, paga a vitória (ou cobra a derrota) e volta a andar. */
  private async endCombat(encounter: Encounter, group: string, fighters: AreaEnemy[], winner: TeamId): Promise<void> {
    const combat = this.combat!;
    const { character } = this;
    const unit = findUnit(encounter, character.id)!;
    syncCharacterFromUnit(character, unit);

    if (winner === "enemy") {
      await combat.showResult(
        "DERROTA",
        [`${character.name} cai.`, "Você desperta inteiro, na entrada da área."],
        TEXT_COLORS.danger,
      );
      character.currentHp = character.maxHp;
      writeSave(character);
      this.leaving = true;
      this.scene.restart({ areaId: this.area.id } satisfies WorldSceneData);
      return;
    }

    const rewards = grantEncounterRewards(
      character,
      fighters.map((enemy) => enemy.creature),
      encounter,
      unusedItems(encounter, "enemy"),
    );
    markDefeated(this.groupKey(group));
    writeSave(character);

    const lines = [`+${rewards.xpGained} de XP`];
    if (rewards.levelUp.leveledUp) lines.push(`Subiu para o nível ${rewards.levelUp.newLevel}!`);
    lines.push(
      rewards.loot.length > 0
        ? `Encontrou: ${rewards.loot.map((item) => item.name).join(", ")}`
        : "Nada ficou pra trás.",
    );
    await combat.showResult("VITÓRIA", lines, TEXT_COLORS.goldBright);

    combat.destroy();
    this.combat = undefined;
    this.enemies = this.enemies.filter((enemy) => enemy.group !== group);
    for (const enemy of fighters) {
      this.enemyActors.get(enemy.id)?.destroy();
      this.enemyActors.delete(enemy.id);
    }

    this.pos = pixelOfTile(this.map, unit.pos);
    this.player.place(this.pos);
    this.cameras.main.startFollow(this.player.followTarget, true, 0.2, 0.2);
    this.statusText.setVisible(true);
    this.hintText.setVisible(true);
    this.refreshStatus();
    this.saveLocation();
  }

  // ------------------------------------------------------------------ saída

  private leave(exit: AreaExit): void {
    this.leaving = true;
    this.player.setWalking(false);
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ areaId: exit.area, spawn: exit.spawn } satisfies WorldSceneData);
    });
  }

  private saveLocation(): void {
    // Saindo por uma saída (ou derrotado), quem grava o lugar novo é a área de destino, ao abrir.
    if (!this.leaving) writeLocation({ areaId: this.area.id, x: this.pos.x, y: this.pos.y });
  }
}
