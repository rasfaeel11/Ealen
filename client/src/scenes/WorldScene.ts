import * as Phaser from "phaser";
import {
  AREAS,
  FOLLOW_GAP,
  STARTING_AREA,
  STARTING_SPAWN,
  StoryRunner,
  aftermath,
  aggroedGroup,
  ambushableGroup,
  brokenInArea,
  distance,
  exitAt,
  extendTrail,
  fightCues,
  findUnit,
  firedTrigger,
  grantEncounterRewards,
  isActive,
  isBlocked,
  isDefeated,
  markBroken,
  markDefeated,
  npcInReach,
  parseTiledMap,
  chargeSavedClock,
  fights,
  clockCondition,
  partyCondition,
  peopleTiles,
  pixelOfTile,
  placeParty,
  presentCompanions,
  restoreParty,
  standAreaProps,
  standPeople,
  startAreaEncounter,
  stepToward,
  syncCharacterFromUnit,
  syncPartyFromEncounter,
  syncUnitInventory,
  talkers,
  tileOfPixel,
  trailPoint,
  unusedItems,
  walk,
  type Aftermath,
  type AreaDef,
  type AreaEnemy,
  type AreaExit,
  type AreaMap,
  type AreaNpc,
  type Character,
  type CharacterClass,
  type DialogueStep,
  type Encounter,
  type GameSave,
  type PixelPos,
  type Prop,
  type StoryEvent,
  type TeamId,
  type Trail,
  type WalkBody,
} from "@ealen/shared";
import { CLOCK_BAR_BOTTOM, ClockBar } from "../game/ClockBar";
import { CombatController } from "../game/combat/CombatController";
import { DialogueBox, isSilent } from "../game/dialogue/DialogueBox";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { JournalGlimpse, JournalPanel } from "../game/JournalPanel";
import { MapActor } from "../game/MapActor";
import { classSpriteKey, creatureSpriteKey, type Facing } from "../game/mapSprites";
import { PartyPanel } from "../game/PartyPanel";
import { unlockOrders } from "../game/profile";
import type { GameSession } from "../game/session";
import { Menu, addBodyText, addPanel, addTitleText } from "../game/ui";
import { STORY_KEY, mapKey, tilesetKey } from "../game/worldAssets";

/** Quantos pixels de tela vale um pixel do mapa. Com tiles de 16px, cabem ~27 x 15 quadrados na tela. */
const ZOOM = 3;
/** Pixels do mapa por segundo (6 quadrados de 16px). */
const WALK_SPEED = 96;
/** Quem segue anda mais rápido que quem vai na frente: é o que o deixa alcançar depois de ficar pra trás. */
const FOLLOW_SPEED = WALK_SPEED * 1.6;
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

const EXPLORE_HINT = "WASD ou setas: andar  ·  R: descansar  ·  C: grupo  ·  Esc: pausa";
/** O que a história rola nos testes dela. Um dado por sessão de jogo basta. */
const STORY_RNG = { rngState: Math.floor(Math.random() * 0xffffffff) };

/** Um companheiro no mapa: a ficha dele, o ator e onde ele está. */
interface Follower {
  character: Character;
  actor: MapActor;
  pos: PixelPos;
}

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
  /** Quem anda com o personagem agora, em fila atrás dele, e o rastro que a fila segue (ver shared/world/follow.ts). */
  private followers: Follower[] = [];
  private trail: Trail = [];
  /**
   * Quem está no mapa AGORA, pelo que a história diz (ver `syncPresence`):
   * os inimigos ainda de pé, quem dá pra encontrar e as saídas abertas.
   */
  private enemies: AreaEnemy[] = [];
  private enemyActors = new Map<string, MapActor>();
  private npcs: AreaNpc[] = [];
  private npcActors = new Map<string, MapActor>();
  private exits: AreaExit[] = [];
  /** Os gatilhos em que o personagem já está: só ENTRAR num deles o dispara. */
  private insideTriggers = new Set<string>();
  /** Alguém apareceu no quadrado em que o personagem está: só passa a ocupá-lo quando ele sair. */
  private peoplePending = false;
  /** Pra onde a história mandou ir depois da luta que ela mesma começou, se for vencida. */
  private travelAfterFight?: { area: string; spawn: string };
  /**
   * O que a história disse no MEIO da luta em andamento (as deixas dela). Só
   * vale se a luta não for perdida: numa derrota a história volta ao que era
   * antes dela, junto com a área.
   */
  private fightSteps: DialogueStep[] = [];
  /** Destrutíveis ainda de pé nesta área (já escritos na grade), e a imagem de cada um. */
  private props: Prop[] = [];
  private propImages = new Map<string, Phaser.GameObjects.Image>();
  private tilesets: Phaser.Tilemaps.Tileset[] = [];
  private combat?: CombatController;
  private story!: StoryRunner;
  /** Verdadeiro enquanto uma conversa está na tela: o mundo espera. */
  private talking = false;
  private leaving = false;
  /** O que está aberto por cima do mundo parado: o menu de pausa, o diário ou a ficha do grupo. */
  private pause?: { destroy: () => void };
  private clockBar!: ClockBar;
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
    this.followers = [];
    this.trail = [];
    this.enemies = [];
    this.enemyActors = new Map();
    this.npcs = [];
    this.npcActors = new Map();
    this.exits = [];
    this.insideTriggers = new Set();
    this.peoplePending = false;
    this.travelAfterFight = undefined;
    this.fightSteps = [];
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
    this.story = new StoryRunner(
      this.cache.text.get(STORY_KEY) as string,
      { character, companions: save.companions, rng: STORY_RNG, isDefeated: (key) => isDefeated(save, key) },
      save.story,
    );
    this.player = this.addActor(classSpriteKey(character.characterClass), this.pos);
    this.trail = [{ ...this.pos }];
    this.syncPresence();

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
    this.clockBar = new ClockBar(this, (object) => this.addHud(object));
    this.clockBar.set(this.story.clock());
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
    keyboard.on("keydown-F", this.ambush, this);
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
    if (this.peoplePending) this.occupy();

    // Um gatilho dispara com o personagem parado também: é assim que a cena de chegada de uma área abre.
    const trigger = firedTrigger(this.map, this.pos, this.insideTriggers, this.flag, (knot) => this.story.visited(knot));
    if (trigger) {
      void this.converse(trigger.dialog);
      return;
    }

    const dx = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const dy = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);
    if (dx === 0 && dy === 0) {
      this.player.setWalking(false);
      // Parado, quem ficou pra trás ainda chega.
      this.moveFollowers(delta);
      return;
    }

    // Na diagonal o passo é dividido entre os eixos: não se anda mais rápido de lado.
    const step = (WALK_SPEED * Math.min(delta, MAX_FRAME_MS)) / 1000 / Math.hypot(dx, dy);
    this.pos = walk(this.map, this.pos, dx * step, dy * step, BODY);
    this.player.place(this.pos);

    const facing: Facing = dx !== 0 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.player.face(facing);
    this.player.setWalking(true);
    this.moveFollowers(delta);

    const exit = exitAt(this.map, this.pos, this.exits);
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

  /** O que uma condição (`if`/`unless`) de um objeto do mapa pergunta: uma variável da história, ou quem está no grupo. */
  private readonly flag = (name: string): unknown =>
    partyCondition(name, this.save.companions) ?? clockCondition(name, this.story.clock()) ?? this.story.flag(name);

  /**
   * Acerta o mapa com a história: quem as variáveis dela dizem que está aqui
   * agora aparece, quem não está some, e as saídas se abrem ou se fecham.
   * Chamado ao chegar, depois de cada conversa e depois de cada luta — é o
   * único lugar que decide quem está de pé.
   */
  private syncPresence(): void {
    this.npcs = this.map.npcs.filter((npc) => isActive(npc, this.flag));
    this.exits = this.map.exits.filter((exit) => isActive(exit, this.flag));
    this.enemies = this.map.enemies.filter(
      (enemy) => !isDefeated(this.save, this.groupKey(enemy.group)) && isActive(enemy, this.flag),
    );

    // Quem tem cara (`look`) fica de pé; os outros `npc` são só pontos pra examinar no que o mapa já desenha.
    const standing = this.npcs.filter((npc) => npc.look !== undefined);
    this.syncActors(this.npcActors, standing, (npc) => classSpriteKey(npc.look as CharacterClass));
    this.syncActors(this.enemyActors, this.enemies, (enemy) => creatureSpriteKey(enemy.creature));
    this.syncParty();
    this.occupy();
  }

  /** Acerta a fila com o grupo: quem a história pôs nele aparece junto do personagem, quem saiu some. */
  private syncParty(): void {
    const present = presentCompanions(this.save.companions);
    this.followers = this.followers.filter((follower) => {
      if (present.includes(follower.character)) return true;
      follower.actor.destroy();
      return false;
    });
    for (const character of present) {
      if (this.followers.some((follower) => follower.character === character)) continue;
      const pos = { ...this.pos };
      this.followers.push({ character, pos, actor: this.addActor(classSpriteKey(character.characterClass), pos) });
    }
  }

  /**
   * Cada companheiro dá um passo pro lugar dele na fila: um ponto do rastro do
   * personagem, cada um mais atrás que o anterior. Não colidem com nada — o
   * rastro já passou por onde dá pra passar.
   */
  private moveFollowers(delta: number): void {
    extendTrail(this.trail, this.pos, (this.followers.length + 1) * FOLLOW_GAP);
    const reach = (FOLLOW_SPEED * Math.min(delta, MAX_FRAME_MS)) / 1000;
    this.followers.forEach((follower, index) => {
      const next = stepToward(follower.pos, trailPoint(this.trail, (index + 1) * FOLLOW_GAP), reach);
      const moved = next.x !== follower.pos.x || next.y !== follower.pos.y;
      if (moved) {
        follower.actor.faceToward(next);
        follower.pos = next;
        follower.actor.place(next);
      }
      follower.actor.setWalking(moved);
    });
  }

  /** O mundo parou (conversa, pausa, luta, saída): ninguém fica marchando no lugar. */
  private halt(): void {
    this.player.setWalking(false);
    for (const follower of this.followers) follower.actor.setWalking(false);
  }

  /** Cria o ator de quem chegou e desfaz o de quem saiu. */
  private syncActors<T extends PixelPos & { id: string }>(
    actors: Map<string, MapActor>,
    present: T[],
    spriteKey: (who: T) => string,
  ): void {
    for (const [id, actor] of actors) {
      if (present.some((who) => who.id === id)) continue;
      actor.destroy();
      actors.delete(id);
    }
    for (const who of present) {
      if (actors.has(who.id)) continue;
      actors.set(who.id, this.addActor(spriteKey(who), pixelOfTile(this.map, tileOfPixel(this.map, who))));
    }
  }

  /**
   * Escreve na grade os quadrados de quem está de pé e não se atravessa: `npc`
   * com cara e inimigo `passive`. `fighting` são os que entraram numa luta —
   * lá quem ocupa o quadrado é a unidade, que anda.
   */
  private occupy(fighting: AreaEnemy[] = []): void {
    const tiles = peopleTiles(
      this.map,
      this.npcs,
      this.enemies.filter((enemy) => !fighting.includes(enemy)),
    );
    standPeople(this.map, tiles);
    // Quem aparece em cima do personagem não o prende: espera ele sair de perto pra ocupar o quadrado.
    this.peoplePending = isBlocked(this.map, this.pos, BODY);
    if (!this.peoplePending) return;
    const here = tileOfPixel(this.map, this.pos);
    standPeople(
      this.map,
      tiles.filter((tile) => distance(tile, here) > 1),
    );
  }

  private groupKey(group: string): string {
    return `${this.area.id}:${group}`;
  }

  // -------------------------------------------------------------- interface

  private refreshStatus(): void {
    const { name, level, currentHp, maxHp } = this.character;
    // Quem acompanha sem lutar não tem vida que importe mostrar.
    const company = this.followers.map(({ character }) =>
      fights(character) ? `   |   ${character.name}  ${character.currentHp}/${character.maxHp}` : `   |   ${character.name}`,
    );
    this.statusText.setText(`${name}  ·  Nível ${level}  ·  HP ${currentHp}/${maxHp}${company.join("")}`);
  }

  /** Com quem dá pra falar daqui, se houver alguém. */
  private talkerInReach() {
    return npcInReach(this.map, this.pos, talkers(this.npcs, this.enemies));
  }

  /** A dica do pé da tela: como andar e, conforme o que há por perto, como falar e como emboscar. */
  private refreshHint(): void {
    const talker = this.talkerInReach();
    const talk = talker ? `  ·  E: ${talker.stands ? "falar com" : "examinar"} ${talker.name}` : "";
    const prey = ambushableGroup(this.map, this.enemies, tileOfPixel(this.map, this.pos));
    const journal = this.story.journal().length > 0 ? "  ·  J: diário" : "";
    this.hintText.setText(EXPLORE_HINT + journal + talk + (prey ? "  ·  F: emboscar" : ""));
  }

  /** Um título no alto da tela, sumindo sozinho (nome da área, avisos). */
  private showBanner(text: string): void {
    const banner = this.addHud(
      addTitleText(this, GAME_WIDTH / 2, 72, text, { fontSize: "36px" }).setOrigin(0.5).setShadow(0, 2, "#000000", 6),
    );
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 800, onComplete: () => banner.destroy() });
  }

  /** Provisório, no lugar de acampamento/estalagem: recupera todo o HP do grupo, em qualquer lugar fora de luta. */
  private rest(): void {
    if (this.combat || this.leaving || this.talking || this.pause) return;
    restoreParty(this.character, this.save.companions);
    // Descansar gasta o tempo do relógio, se a história disse que gasta — e o que o tempo fecha, fecha.
    if (this.story.spend("rest")) {
      this.save.story = this.story.save();
      this.clockBar.set(this.story.clock());
      this.syncPresence();
    }
    this.persist();
    this.refreshStatus();
    this.showBanner("Você descansa.");
  }

  // ----------------------------------------------------------------- conversa

  private interact(): void {
    if (this.combat || this.leaving || this.talking || this.pause) return;
    const talker = this.talkerInReach();
    if (talker) void this.converse(talker.dialog, talker);
  }

  /**
   * Um trecho da história, do começo ao fim: ela diz o que mostrar, a caixa
   * mostra e devolve a escolha. Quem abre é uma conversa (`E` perto de
   * alguém, que fica em `toward`), um gatilho no chão ou a queda de um grupo.
   * No fim, o que o texto mudou (flags, mochila, XP) vai pro save, o mapa se
   * acerta com as flags e a cena cumpre o que ele pediu pra depois: uma luta,
   * uma viagem.
   */
  private async converse(knot: string, toward?: PixelPos): Promise<void> {
    this.halt();
    if (toward) this.player.faceToward(pixelOfTile(this.map, tileOfPixel(this.map, toward)));

    let steps: DialogueStep[] = [];
    try {
      steps = await this.read(knot);
    } finally {
      this.save.story = this.story.save();
      this.syncPresence();
      this.persist();
      this.refreshStatus();
      this.refreshHint();
    }
    this.settle(aftermath(steps));
  }

  /**
   * Lê um trecho da história na caixa, do começo ao fim, e devolve o que ele
   * trouxe. Só isso: gravar, acertar o mapa e cumprir o que o texto pediu é de
   * quem chamou — uma conversa faz tudo na hora (`converse`), uma deixa no
   * meio da luta espera a luta acabar (`playCue`).
   */
  private async read(knot: string): Promise<DialogueStep[]> {
    this.talking = true;
    const steps: DialogueStep[] = [];
    const hud = [this.statusText, this.hintText].filter((text) => text.visible);
    let box: DialogueBox | undefined;
    try {
      let step = this.story.start(knot);
      for (;;) {
        steps.push(step);
        // Um trecho que só mexe em flags (ou decide que não tem nada a dizer) passa sem abrir a caixa.
        if (!box && !isSilent(step)) {
          for (const text of hud) text.setVisible(false);
          box = new DialogueBox(this, (object) => this.addHud(object), (event) => this.onStoryEvent(event));
        }
        const choice = box ? await box.play(step) : null;
        if (choice === null) break;
        step = this.story.choose(choice);
      }
    } finally {
      // Um erro no texto não pode deixar o jogador preso numa conversa que não fecha.
      box?.destroy();
      for (const text of hud) text.setVisible(true);
      // Um trecho que passou sem abrir a caixa também pode ter mexido no relógio.
      this.clockBar.set(this.story.clock());
      this.talking = false;
    }
    return steps;
  }

  /**
   * O que a tela faz na hora em que a conversa chega num acontecimento, além
   * do que a caixa anuncia: o relógio anda, e o diário se apaga (ou se refaz)
   * À VISTA — a página fica aberta enquanto a caixa fala disso, e o que ela
   * devolve aqui é como fechá-la.
   */
  private onStoryEvent(event: StoryEvent): (() => void) | void {
    if (event.type === "clock") {
      this.clockBar.set(event.clock);
    } else if (event.type === "forgot" || event.type === "recalled") {
      const glimpse = new JournalGlimpse(
        this,
        (object) => this.addHud(object),
        this.story.journal(),
        event.entries,
        event.type,
        this.clockBar.visible ? CLOCK_BAR_BOTTOM + 8 : 24,
      );
      return () => glimpse.destroy();
    }
  }

  /** Cumpre o que o texto deixou pra depois da última fala: o que destravou, uma luta, uma viagem. */
  private settle({ fight, travel, unlocks }: Aftermath): void {
    // O que o texto destravou é do jogador, não desta partida: vai pro perfil.
    unlockOrders(unlocks);
    if (fight !== undefined && this.enemies.some((enemy) => enemy.group === fight)) {
      // A viagem pedida junto com a luta fica pra depois dela, e só pra quem vence.
      this.travelAfterFight = travel;
      this.startCombat(fight);
      return;
    }
    if (fight !== undefined) console.warn(`A história pediu luta com "${fight}", mas não há ninguém desse grupo de pé aqui.`);
    if (travel) this.leave(travel);
  }

  // ----------------------------------------------------------------- combate

  /** `F`: ataca primeiro o grupo mais próximo que ainda não percebeu o personagem. Ele entra na luta surpreso. */
  private ambush(): void {
    if (this.combat || this.leaving || this.talking || this.pause) return;
    const group = ambushableGroup(this.map, this.enemies, tileOfPixel(this.map, this.pos));
    if (group !== undefined) this.startCombat(group, "enemy");
  }

  /**
   * A luta com um grupo de inimigos começa, onde cada um está: porque ele
   * percebeu o personagem, porque a história mandou ou — com `surprised` —
   * porque o personagem o emboscou. Se o mapa tem deixas (`cue`) pra esse
   * grupo, a luta tem roteiro: elas entram junto.
   */
  private startCombat(group: string, surprised?: TeamId): void {
    const fighters = this.enemies.filter((enemy) => enemy.group === group);
    const cues = this.map.cues.filter((cue) => cue.group === group && isActive(cue, this.flag));
    this.fightSteps = [];
    const playerTile = tileOfPixel(this.map, this.pos);
    // Quem estava parado ocupando um quadrado agora é uma unidade, que anda.
    this.occupy(fighters);

    // No combate todo mundo fica no meio de um quadrado: o personagem no dele, cada companheiro no que couber.
    this.halt();
    this.pos = pixelOfTile(this.map, playerTile);
    this.player.place(this.pos);
    // Todo mundo ganha um quadrado só seu pra ficar de pé, mas quem acompanha sem lutar não vira unidade: vira apoio.
    const placed = placeParty(
      this.map,
      this.character,
      playerTile,
      this.followers.map((follower) => ({ character: follower.character, at: follower.pos })),
      fighters.map((enemy) => tileOfPixel(this.map, enemy)),
    );
    const party = placed.filter((fighter) => fights(fighter.character));
    const onlookers = this.followers.filter((follower) => !fights(follower.character));

    const actors = new Map<string, MapActor>([[this.character.id, this.player]]);
    for (const enemy of fighters) actors.set(enemy.id, this.enemyActors.get(enemy.id)!);
    // Quem só olha também entra aqui: o combate precisa saber onde ele está pra mostrar o apoio saindo dele.
    for (const follower of this.followers) {
      const tile = placed.find((fighter) => fighter.character === follower.character)?.tile;
      if (!tile) continue;
      follower.pos = pixelOfTile(this.map, tile);
      follower.actor.place(follower.pos);
      follower.actor.faceToward(this.pos);
      actors.set(follower.character.id, follower.actor);
    }

    const seed = Math.floor(Math.random() * 0xffffffff);
    const { encounter, events } = startAreaEncounter(
      this.map,
      party,
      fighters,
      seed,
      this.props,
      surprised,
      fightCues(
        this.map,
        cues,
        fighters,
        party.map((fighter) => fighter.character.id),
      ),
      onlookers.map((follower) => follower.character),
      // O que a história pôs em alguém e que dura entre lutas entra com ele.
      this.story.afflictions(),
    );

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
        onCue: (id) => this.playCue(encounter, cues.find((cue) => cue.id === id)?.dialog),
        // O tempo corre dentro da luta também, se a história disse que corre. Vale como o resto do que ela diz
        // no meio da luta: só se a luta não for perdida (a perdida cobra as rodadas dela em `endCombat`).
        onRound: () => {
          if (this.story.spend("round")) this.clockBar.set(this.story.clock());
        },
        goals: cues.flatMap((cue) => (cue.goal !== undefined ? [{ cue: cue.id, text: cue.goal }] : [])),
        goalsTop: this.clockBar.visible ? CLOCK_BAR_BOTTOM + 8 : undefined,
      },
      encounter,
      (winner) => void this.endCombat(encounter, group, fighters, winner),
    );
    void this.combat.start(events);
  }

  /**
   * Uma deixa da luta disparou e tem o que dizer: a história fala ali mesmo,
   * com a luta parada. Ela lê a mochila como a luta a deixou, e o que der ou
   * tirar já vale pra quem está lutando. Nada é gravado nem cumprido agora —
   * isso fica pro fim da luta, e só se ela não for perdida (`endCombat`).
   */
  private async playCue(encounter: Encounter, knot: string | undefined): Promise<void> {
    const { character } = this;
    const unit = findUnit(encounter, character.id);
    if (knot === undefined || !unit) return;

    // A ficha só fica com a cara da luta enquanto a história fala: quem fecha o jogo no meio da luta a tem como era antes.
    const { currentHp, inventory } = character;
    syncCharacterFromUnit(character, unit);
    try {
      this.fightSteps.push(...(await this.read(knot)));
    } finally {
      syncUnitInventory(unit, character);
      character.currentHp = currentHp;
      character.inventory = inventory;
    }
  }

  /**
   * A luta acabou: devolve à ficha o que ela gastou, paga a vitória (ou cobra
   * a derrota) e volta a andar. Sem `winner`, uma deixa a parou: ninguém
   * venceu, não há recompensa nem castigo, e o grupo de inimigos sai do mapa
   * como o vencido sai.
   */
  private async endCombat(
    encounter: Encounter,
    group: string,
    fighters: AreaEnemy[],
    winner: TeamId | undefined,
  ): Promise<void> {
    const combat = this.combat!;
    const { character } = this;
    const unit = findUnit(encounter, character.id)!;
    const company = this.followers.map((follower) => follower.character);
    syncPartyFromEncounter(encounter, [character, ...company], winner !== "enemy");
    // O que a história pediu pra depois: no meio da luta (as deixas) e, antes disso, na conversa que a começou.
    const after = aftermath(this.fightSteps);
    after.travel ??= this.travelAfterFight;
    this.fightSteps = [];
    this.travelAfterFight = undefined;

    if (winner === "enemy") {
      await combat.showResult(
        "DERROTA",
        [company.length > 0 ? "O grupo cai." : `${character.name} cai.`, "Você desperta inteiro, na entrada da área."],
        TEXT_COLORS.danger,
      );
      restoreParty(character, this.save.companions);
      // O que a história disse na luta não vale, mas o tempo que ela gastou, sim: tentar de novo custa.
      this.save.story = chargeSavedClock(chargeSavedClock(this.save.story, "round", encounter.round - 1), "fight");
      // O lugar gravado continua o de antes da luta; a área de destino grava o novo ao abrir.
      this.session.commit();
      this.leaving = true;
      this.scene.restart({ areaId: this.area.id } satisfies WorldSceneData);
      return;
    }

    const rewards =
      winner === "party"
        ? grantEncounterRewards(
            character,
            fighters.map((enemy) => enemy.creature),
            encounter,
            unusedItems(encounter, "enemy"),
            company,
          )
        : undefined;
    markDefeated(this.save, this.groupKey(group));
    // O que quebrou na luta fica quebrado; numa derrota a área inteira volta ao que era.
    markBroken(
      this.save,
      this.props.filter((prop) => prop.hp <= 0).map((prop) => `${this.area.id}:${prop.id}`),
    );
    this.props = this.props.filter((prop) => prop.hp > 0);
    // A vitória vai pro save inteira, de uma vez: ficha, espólio, grupo vencido e o lugar onde a luta acabou.
    this.pos = pixelOfTile(this.map, unit.pos);
    // A fila recomeça de onde cada um terminou a luta.
    for (const follower of this.followers) {
      const fought = findUnit(encounter, follower.character.id);
      if (fought) follower.pos = pixelOfTile(this.map, fought.pos);
    }
    this.trail = [{ ...this.pos }, ...this.followers.map((follower) => ({ ...follower.pos }))];
    // Agora o que as deixas disseram vale: a luta não foi perdida. E ela gastou o tempo que a história cobra.
    this.story.spend("fight");
    this.clockBar.set(this.story.clock());
    this.save.story = this.story.save();
    this.persist();

    // Numa luta que parou, o resultado é o que a história acabou de dizer: não há painel.
    if (rewards) {
      const lines = [`+${rewards.xpGained} de XP`];
      if (rewards.levelUp.leveledUp) lines.push(`Subiu para o nível ${rewards.levelUp.newLevel}!`);
      for (const { name, level } of rewards.companionLevels) lines.push(`${name} subiu para o nível ${level}!`);
      lines.push(
        rewards.loot.length > 0
          ? `Encontrou: ${rewards.loot.map((item) => item.name).join(", ")}`
          : "Nada ficou pra trás.",
      );
      await combat.showResult("VITÓRIA", lines, TEXT_COLORS.goldBright);
    }

    combat.destroy();
    this.combat = undefined;
    // Quem caiu numa luta vencida se levanta (com 1 de vida, ver syncPartyFromEncounter).
    for (const member of [{ character, actor: this.player }, ...this.followers]) {
      if ((findUnit(encounter, member.character.id)?.currentHp ?? 1) <= 0) member.actor.rise();
    }
    this.player.place(this.pos);
    for (const follower of this.followers) follower.actor.place(follower.pos);
    this.syncPresence();

    this.cameras.main.startFollow(this.player.followTarget, true, 0.2, 0.2);
    this.statusText.setVisible(true);
    this.hintText.setVisible(true);
    this.refreshStatus();
    this.refreshHint();

    // O que a história tem a dizer sobre a queda do grupo (se ele caiu), e depois o que ela tinha deixado marcado.
    const knot = winner === "party" ? fighters.find((enemy) => enemy.onDefeat !== undefined)?.onDefeat : undefined;
    if (knot !== undefined) await this.converse(knot);
    if (!this.combat && !this.leaving) this.settle(after);
  }

  // ------------------------------------------------------------------ pausa

  private onKey(event: KeyboardEvent): void {
    if (this.pause || this.combat || this.leaving || this.talking) return;
    if (event.code === "Escape") this.openPause();
    else if (event.code === "KeyJ") this.openJournal();
    else if (event.code === "KeyC") this.openParty();
  }

  /** `C`: a ficha de cada um do grupo e a mochila, por cima do mundo parado. Usar um item ali já grava. */
  private openParty(): void {
    this.halt();
    this.pause = new PartyPanel(
      this,
      (object) => this.addHud(object),
      [this.character, ...this.followers.map((follower) => follower.character)],
      this.story.afflictions(),
      () => {
        this.persist();
        this.refreshStatus();
      },
      () => this.closePause(),
    );
  }

  /** `J`: o diário de pistas, por cima do mundo parado. */
  private openJournal(): void {
    this.halt();
    const panel = new JournalPanel(this, (object) => this.addHud(object), this.story.journal(), () => this.closePause());
    this.pause = panel;
  }

  private openPause(): void {
    this.halt();
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
    this.pause = {
      destroy: () => {
        menu.destroy();
        for (const object of objects) object.destroy();
      },
    };
  }

  private closePause(): void {
    if (!this.pause) return;
    const open = this.pause;
    this.pause = undefined;
    // No quadro seguinte: a opção clicada (ou a tecla) ainda está no meio do próprio evento.
    this.time.delayedCall(0, () => open.destroy());
  }

  // ------------------------------------------------------------------ saída

  /** Sai pra outra área (ou pra outro ponto desta): por uma saída do mapa, ou levado pela história. */
  private leave(exit: { area: string; spawn: string }): void {
    this.leaving = true;
    this.halt();
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
