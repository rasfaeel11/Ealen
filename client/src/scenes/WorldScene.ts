import * as Phaser from "phaser";
import {
  AREAS,
  STARTING_AREA,
  STARTING_SPAWN,
  StoryRunner,
  aggroedGroup,
  brokenInArea,
  exitAt,
  findUnit,
  grantEncounterRewards,
  isBlocked,
  isDefeated,
  markBroken,
  markDefeated,
  npcInReach,
  parseTiledMap,
  pixelOfTile,
  standAreaProps,
  startAreaEncounter,
  unusedItems,
  syncCharacterFromUnit,
  tileOfPixel,
  walk,
  type AreaDef,
  type AreaEnemy,
  type AreaExit,
  type AreaMap,
  type AreaNpc,
  type Character,
  type CharacterClass,
  type Encounter,
  type GameSave,
  type PixelPos,
  type Prop,
  type TeamId,
  type WalkBody,
} from "@ealen/shared";
import { CombatController } from "../game/combat/CombatController";
import { DialogueBox } from "../game/dialogue/DialogueBox";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { MapActor } from "../game/MapActor";
import { classSpriteKey, creatureSpriteKey, type Facing } from "../game/mapSprites";
import type { GameSession } from "../game/session";
import { Menu, addBodyText, addPanel, addTitleText } from "../game/ui";
import { STORY_KEY, mapKey, tilesetKey } from "../game/worldAssets";

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

const EXPLORE_HINT = "WASD ou setas: andar  ·  R: descansar  ·  Esc: pausa";
/** O que a história rola nos testes dela. Um dado por sessão de jogo basta. */
const STORY_RNG = { rngState: Math.floor(Math.random() * 0xffffffff) };

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
  private session!: GameSession;
  /** O save da partida aberta: a cena o muda e pede à sessão que grave (`persist`). */
  private save!: GameSave;
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
  /** Destrutíveis ainda de pé nesta área (já escritos na grade), e a imagem de cada um. */
  private props: Prop[] = [];
  private propImages = new Map<string, Phaser.GameObjects.Image>();
  private tilesets: Phaser.Tilemaps.Tileset[] = [];
  private combat?: CombatController;
  private story!: StoryRunner;
  /** Verdadeiro enquanto uma conversa está na tela: o mundo espera. */
  private talking = false;
  private leaving = false;
  /** O menu de pausa, enquanto está aberto: o mundo espera. */
  private pause?: { menu: Menu; objects: Phaser.GameObjects.GameObject[] };
  /** Pra avisar uma vez só, e não a cada gravação, que o dispositivo não está gravando. */
  private saveFailed = false;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.world);
  }

  init(data: WorldSceneData): void {
    this.arrival = data ?? {};
    this.leaving = false;
    this.talking = false;
    this.pause = undefined;
    this.saveFailed = false;
    this.combat = undefined;
    this.enemies = [];
    this.enemyActors = new Map();
    this.props = [];
    this.propImages = new Map();
  }

  create(): void {
    const session = this.registry.get(REGISTRY_SESSION) as GameSession | undefined;
    if (!session) {
      this.scene.start(SCENES.title);
      return;
    }
    this.session = session;
    this.save = session.save;
    this.character = session.character;
    const { character, save } = this;

    // Duas câmeras: a do mundo amplia e segue o personagem; a da interface fica parada, sem zoom.
    // Todo objeto da cena passa por addWorld ou addHud pra ser desenhado por uma só.
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.enterArea();
    this.drawMap();
    this.standProps();
    this.standNpcs();
    this.story = new StoryRunner(
      this.cache.text.get(STORY_KEY) as string,
      { character, rng: STORY_RNG, isDefeated: (key) => isDefeated(save, key) },
      save.story,
    );
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
    this.refreshHint();
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
    keyboard.on("keydown-E", this.interact, this);
    keyboard.on("keydown", this.onKey, this);
    // O botão direito cancela a mira no combate; o menu do navegador só atrapalharia.
    this.input.mouse?.disableContextMenu();

    // O jogo grava sozinho: ao chegar numa área, ao sair da cena e quando a aba some ou fecha.
    const onHide = () => {
      // No meio de uma conversa não: a ficha já pode ter ganho o que a história ainda não registrou ter dado.
      if (!this.talking) this.persist();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      this.persist();
    });
    this.persist();
  }

  update(_time: number, delta: number): void {
    // Quadro longo demais é aba em segundo plano: não conta como tempo de jogo.
    if (!this.pause) this.save.playTimeMs += Math.min(delta, MAX_FRAME_MS);
    if (this.leaving || this.combat || this.talking || this.pause) return;

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
    if (group) {
      this.startCombat(group);
      return;
    }
    this.refreshHint();
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
    const saved = this.arrival.areaId ? null : this.save.location;
    this.area = AREAS[this.arrival.areaId ?? saved?.areaId ?? ""] ?? AREAS[STARTING_AREA];
    this.map = parseTiledMap(this.cache.tilemap.get(mapKey(this.area.id)).data);

    const spawn =
      this.map.spawns[this.arrival.spawn ?? ""] ??
      this.map.spawns[STARTING_SPAWN] ??
      Object.values(this.map.spawns)[0];
    const resumed = saved && saved.areaId === this.area.id ? { x: saved.x, y: saved.y } : null;
    // O mapa pode ter mudado desde o save: quem ficaria dentro de uma parede volta pro ponto de chegada.
    this.pos = resumed && !isBlocked(this.map, resumed, BODY) ? resumed : { ...spawn };
  }

  private drawMap(): void {
    const tilemap = this.make.tilemap({ key: mapKey(this.area.id) });
    const tilesets = tilemap.tilesets
      .map((tileset) => tilemap.addTilesetImage(tileset.name, tilesetKey(tileset.name)))
      .filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);
    this.tilesets = tilesets;

    tilemap.layers.forEach((data, index) => {
      if (data.name.startsWith(SORTED_LAYER_PREFIX)) {
        this.drawSortedLayer(tilemap, data);
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
  private drawSortedLayer(tilemap: Phaser.Tilemaps.Tilemap, data: Phaser.Tilemaps.LayerData): void {
    for (const tile of data.data.flat()) this.standTile(tile.index, tile.x, tile.y, tilemap.tileWidth);
  }

  /**
   * Um tile de pé no quadrado (x, y): uma imagem solta, ancorada na base do
   * quadrado e com a profundidade dela. Undefined se o gid não é de nenhum
   * tileset (o quadrado vazio de uma camada).
   */
  private standTile(gid: number, x: number, y: number, tileSize: number): Phaser.GameObjects.Image | undefined {
    const tileset = this.tilesets.find((candidate) => candidate.containsTileIndex(gid));
    const coordinates = tileset?.getTileTextureCoordinates(gid) as { x: number; y: number } | null | undefined;
    if (!tileset?.image || !coordinates) return undefined;

    // O tileset é uma imagem só; cada tile usado ganha um quadro com nome nela.
    const frame = `tile:${gid - tileset.firstgid}`;
    if (!tileset.image.has(frame)) {
      tileset.image.add(frame, 0, coordinates.x, coordinates.y, tileset.tileWidth, tileset.tileHeight);
    }

    const base = (y + 1) * tileSize;
    return this.addWorld(this.add.image(x * tileSize, base, tileset.image.key, frame).setOrigin(0, 1).setDepth(base));
  }

  /**
   * Põe de pé os destrutíveis que ainda não foram quebrados: na grade (pra
   * barrarem o passo, na exploração e na luta) e na tela, ordenados por Y
   * como tudo que fica de pé.
   */
  private standProps(): void {
    this.props = standAreaProps(this.map, brokenInArea(this.save, this.area.id));

    for (const prop of this.props) {
      const { gid } = this.map.props.find((candidate) => candidate.id === prop.id)!;
      const image = this.standTile(gid, prop.pos.x, prop.pos.y, this.map.tileSize);
      if (image) this.propImages.set(prop.id, image);
    }
  }

  /** Põe no mapa quem tem cara (`look`). Os outros são só pontos pra examinar no que o mapa já desenha. */
  private standNpcs(): void {
    for (const npc of this.map.npcs) {
      if (!npc.look) continue;
      this.addActor(classSpriteKey(npc.look as CharacterClass), pixelOfTile(this.map, tileOfPixel(this.map, npc)));
    }
  }

  /** Põe no mapa os inimigos da área cujo grupo ainda não foi vencido. */
  private spawnEnemies(): void {
    this.enemies = this.map.enemies.filter((enemy) => !isDefeated(this.save, this.groupKey(enemy.group)));
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

  /** A dica do pé da tela: como andar e, perto de alguém, como falar com ele. */
  private refreshHint(): void {
    const npc = npcInReach(this.map, this.pos);
    const talk = npc ? `  ·  E: ${npc.look ? "falar com" : "examinar"} ${npc.name}` : "";
    this.hintText.setText(EXPLORE_HINT + talk);
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
    if (this.combat || this.leaving || this.talking || this.pause) return;
    this.character.currentHp = this.character.maxHp;
    this.persist();
    this.refreshStatus();
    this.showBanner("Você descansa.");
  }

  // ----------------------------------------------------------------- conversa

  private interact(): void {
    if (this.combat || this.leaving || this.talking || this.pause) return;
    const npc = npcInReach(this.map, this.pos);
    if (npc) void this.talk(npc);
  }

  /**
   * Uma conversa, do começo ao fim: a história diz o que mostrar, a caixa
   * mostra e devolve a escolha. No fim, o que ela mudou (flags, mochila, XP)
   * vai pro save.
   */
  private async talk(npc: AreaNpc): Promise<void> {
    this.talking = true;
    this.player.setWalking(false);
    this.player.faceToward(pixelOfTile(this.map, tileOfPixel(this.map, npc)));
    this.statusText.setVisible(false);
    this.hintText.setVisible(false);

    const box = new DialogueBox(this, (object) => this.addHud(object));
    try {
      let step = this.story.start(npc.dialog);
      for (;;) {
        const choice = await box.play(step);
        if (choice === null) break;
        step = this.story.choose(choice);
      }
    } finally {
      // Um erro no texto não pode deixar o jogador preso numa conversa que não fecha.
      box.destroy();
      this.save.story = this.story.save();
      this.persist();
      this.statusText.setVisible(true);
      this.hintText.setVisible(true);
      this.refreshStatus();
      this.talking = false;
    }
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
    const { encounter, events } = startAreaEncounter(this.map, this.character, playerTile, fighters, seed, this.props);

    const actors = new Map<string, MapActor>([[this.character.id, this.player]]);
    for (const enemy of fighters) actors.set(enemy.id, this.enemyActors.get(enemy.id)!);

    this.statusText.setVisible(false);
    this.hintText.setVisible(false);
    this.combat = new CombatController(
      {
        scene: this,
        map: this.map,
        actors,
        props: this.propImages,
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
      // O lugar gravado continua o de antes da luta; a área de destino grava o novo ao abrir.
      this.session.commit();
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
    markDefeated(this.save, this.groupKey(group));
    // O que quebrou na luta fica quebrado; numa derrota a área inteira volta ao que era.
    markBroken(
      this.save,
      this.props.filter((prop) => prop.hp <= 0).map((prop) => `${this.area.id}:${prop.id}`),
    );
    this.props = this.props.filter((prop) => prop.hp > 0);
    // A vitória vai pro save inteira, de uma vez: ficha, espólio, grupo vencido e o lugar onde a luta acabou.
    this.pos = pixelOfTile(this.map, unit.pos);
    this.persist();

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

    this.player.place(this.pos);
    this.cameras.main.startFollow(this.player.followTarget, true, 0.2, 0.2);
    this.statusText.setVisible(true);
    this.hintText.setVisible(true);
    this.refreshStatus();
  }

  // ------------------------------------------------------------------ pausa

  private onKey(event: KeyboardEvent): void {
    if (event.code !== "Escape" || this.pause || this.combat || this.leaving || this.talking) return;
    this.openPause();
  }

  private openPause(): void {
    this.player.setWalking(false);
    const width = 420;
    const height = 220;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    const objects = [
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0),
      addPanel(this, x, y, width, height),
      addTitleText(this, GAME_WIDTH / 2, y + 48, "PAUSA", { fontSize: "32px" }).setOrigin(0.5),
    ].map((object) => this.addHud(object));

    const menu = new Menu(
      this,
      x + 60,
      y + 100,
      [
        { label: "Voltar ao jogo", onSelect: () => this.closePause() },
        // Ao fechar, a cena grava o jogo (SHUTDOWN chama persist).
        { label: "Salvar e sair pro título", onSelect: () => this.scene.start(SCENES.title) },
      ],
      { lineHeight: 44, fontSize: 24, onCancel: () => this.closePause(), adopt: (item) => this.addHud(item) },
    );
    this.pause = { menu, objects };
  }

  private closePause(): void {
    if (!this.pause) return;
    const { menu, objects } = this.pause;
    this.pause = undefined;
    // No quadro seguinte: a opção clicada ainda está no meio do próprio evento.
    this.time.delayedCall(0, () => {
      menu.destroy();
      for (const object of objects) object.destroy();
    });
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

  /**
   * Grava o jogo. Saindo por uma saída (ou derrotado), o lugar gravado fica
   * o anterior: quem grava o novo é a área de destino, ao abrir.
   */
  private persist(): void {
    if (!this.leaving) this.save.location = { areaId: this.area.id, x: this.pos.x, y: this.pos.y };
    if (this.session.commit() || this.saveFailed) return;
    this.saveFailed = true;
    this.showBanner("Não foi possível gravar o jogo neste dispositivo.");
  }
}
