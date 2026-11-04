import * as Phaser from "phaser";
import {
  AREAS,
  CLASS_INFO,
  STATUSES,
  castOf,
  BESTIARY,
  FOLLOW_GAP,
  HUNGER,
  STARTING_AREA,
  STARTING_SPAWN,
  StoryRunner,
  aftermath,
  ambushableGroup,
  brokenInArea,
  distance,
  exitAt,
  extendTrail,
  breathOf,
  burstMark,
  canAfford,
  engrave,
  engravable,
  engravingSlots,
  fieldUse,
  maxBreath,
  maxMana,
  missing,
  fightCues,
  findUnit,
  firedTrigger,
  grantEncounterRewards,
  isActive,
  keepsVow,
  isBlocked,
  isDefeated,
  lingeringMarks,
  magicOf,
  manaOf,
  markBroken,
  markDefeated,
  mend,
  npcInReach,
  openingStrikes,
  payOutside,
  propTemplate,
  parseTiledMap,
  chargeSavedClock,
  fights,
  clockCondition,
  partyCondition,
  passesWithRest,
  peopleTiles,
  pixelOfTile,
  placeParty,
  presentCompanions,
  restoreParty,
  sentryAt,
  sightTiles,
  wary,
  watch,
  type Suspicion,
  SHORT_RESTS,
  camp,
  campMeals,
  campMouths,
  shortRest,
  restSavedStory,
  samePos,
  sheetAbilities,
  standAreaProps,
  fellProp,
  standPeople,
  startAreaEncounter,
  stepToward,
  syncCharacterFromUnit,
  syncPartyFromEncounter,
  syncUnitInventory,
  talkers,
  tileAt,
  tileOfPixel,
  trailPoint,
  unusedItems,
  useItemOutside,
  autoLearn,
  autoRaise,
  discardItem,
  passItem,
  buyFrom,
  findShop,
  sellTo,
  equip,
  unequip,
  walk,
  type Ability,
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
  type FightClock,
  type GameSave,
  type Opening,
  type OpeningStrike,
  type PixelPos,
  type Pos,
  type Prop,
  type StoryEvent,
  type TeamId,
  type Trail,
  type WalkBody,
} from "@jogo/shared";
import { areaMusic, playMusic, sfx } from "../game/audio";
import { BagPanel } from "../game/BagPanel";
import { EngravePanel } from "../game/EngravePanel";
import { CLOCK_BAR_BOTTOM, ClockBar, RIGHT_COLUMN_TOP } from "../game/ClockBar";
import { WorldHud, type FieldButton, type FieldPrompt } from "../game/hud/WorldHud";
import type { PartyEntry } from "../game/hud/PartyColumn";
import { abilityIcon } from "../game/icons";
import { CombatController } from "../game/combat/CombatController";
import { drawArea, drawBrackets, drawReach, drawStop } from "../game/combat/marks";
import { DialogueBox, isSilent } from "../game/dialogue/DialogueBox";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { JournalPanel } from "../game/JournalPanel";
import { ShopPanel } from "../game/ShopPanel";
import { RegionMapPanel } from "../game/RegionMapPanel";
import { MapActor } from "../game/MapActor";
import { SheetPanel } from "../game/SheetPanel";
import { OptionsPanel } from "../game/OptionsPanel";
import { setPadMode } from "../game/gamepad";
import { isAction, keyLabel, keyOf, settings } from "../game/settings";
import { classSpriteKey, creatureSpriteKey, lookSpriteKey, ownSpriteKey, sheetScale, type Facing, standingFrame } from "../game/mapSprites";
import type { GameSession } from "../game/session";
import { Menu, addBodyText, addHeading, addModalDim, addPanel, addTitleText, portraitRef } from "../game/ui";
import { Scenery } from "../game/Scenery";
import { setPlaying } from "../game/viewport";
import { STORY_KEY, mapKey } from "../game/worldAssets";

/** A escala do "?" de quem desconfia: acompanha o zoom da câmera de sempre, pra não borrar. */
const ZOOM = 3;
/** Pixels do mapa por segundo (6 quadrados de 16px). */
const WALK_SPEED = 96;
/** Esgueirando, anda-se na metade. */
const SNEAK_FACTOR = 0.5;
/** Quem segue anda mais rápido que quem vai na frente: é o que o deixa alcançar depois de ficar pra trás. */
const FOLLOW_SPEED = WALK_SPEED * 1.6;
/** A caixa dos pés: mais estreita que um quadrado, pra passar em corredor de um de largura. */
const BODY: WalkBody = { halfWidth: 5, height: 6 };
const FADE_MS = 220;
/** De quantos em quantos pixels andados se ouve um passo. */
const FOOTSTEP_PX = 15;
/** Um quadro mais longo que isto (aba em segundo plano) não vira um salto pelo mapa. */
const MAX_FRAME_MS = 50;

const AIM_HINT = "←/→: trocar de alvo  ·  Enter ou clique: atacar  ·  Esc: desistir";
/** As marcas de quem mira um golpe de abertura: por cima do chão, por baixo de quem está de pé. */
const AIM_DEPTH = -1;
/** O olhar pintado no chão de quem se esgueira. */
const SIGHT_ALPHA = 0.14;
/** O "?" de quem desconfia fica por cima de todo mundo. */
const WARY_DEPTH = 100000;
const AIM_TARGET_COLOR = 0xe0566c;
const AIM_STEP_COLOR = 0x6fa8dc;
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
  /** Quanto o personagem andou desde o último passo que se ouviu. */
  private strode = 0;
  /**
   * Quem está no mapa AGORA, pelo que a história diz (ver `syncPresence`):
   * os inimigos ainda de pé, quem dá pra encontrar e as saídas abertas.
   */
  private enemies: AreaEnemy[] = [];
  private enemyActors = new Map<string, MapActor>();
  /** Esgueirando (`Q`): devagar, agachado, e quem olha desconfia antes de ver (ver shared/world/stealth.ts). */
  private sneaking = false;
  /** Acabou de acampar e ainda não deu um passo nem lutou: a árvore se refaz (ver unlearnSkills). */
  private campfire = false;
  /** O quanto cada inimigo já desconfia, de 0 a 1, pelo id. */
  private suspicion: Suspicion = {};
  /** Os segundos de exploração desde que a área abriu: é o relógio de quem vira a cabeça e de quem faz ronda. */
  private sentryClock = 0;
  /** Onde e pra onde olhava cada vigia no último quadro: mudou, o olhar pintado no chão se refaz. */
  private sentryMarks = new Map<string, string>();
  /** O olhar dos inimigos pintado no chão, enquanto se esgueira. */
  private sightMarks?: Phaser.GameObjects.Graphics;
  /** O "?" em cima de quem desconfia, pelo id. */
  private wariness = new Map<string, Phaser.GameObjects.Text>();
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
  private combat?: CombatController;
  private story!: StoryRunner;
  /** Verdadeiro enquanto uma conversa está na tela: o mundo espera. */
  private talking = false;
  private leaving = false;
  /** O menu de pausa, enquanto está aberto: o mundo espera. */
  /** O que está aberto por cima do mundo parado: o menu de pausa, ou o diário. */
  private pause?: { destroy: () => void };
  /**
   * Mirando um golpe de abertura (ver shared/world/field.ts): a habilidade, em
   * quem ela pode abrir a luta daqui, e qual deles está escolhido. O mundo espera.
   */
  private aiming?: {
    ability: Ability;
    /** Quem dá o golpe: a protagonista, ou um companheiro (pela ficha dele). */
    striker: Character;
    strikes: OpeningStrike[];
    index: number;
    marks: Phaser.GameObjects.Graphics;
    /** Quando a mira começou: o clique que a abriu (numa opção da ficha) não é um clique num alvo. */
    since: number;
  };
  private clockBar!: ClockBar;
  /** Pra avisar uma vez só, e não a cada gravação, que o dispositivo não está gravando. */
  private saveFailed = false;
  private hud!: WorldHud;
  private scenery!: Scenery;

  constructor() {
    super(SCENES.world);
  }

  init(data: WorldSceneData): void {
    this.arrival = data ?? {};
    this.leaving = false;
    this.talking = false;
    this.pause = undefined;
    this.aiming = undefined;
    this.saveFailed = false;
    this.combat = undefined;
    this.followers = [];
    this.trail = [];
    this.enemies = [];
    this.enemyActors = new Map();
    this.sentryClock = 0;
    this.sentryMarks = new Map();
    this.sneaking = false;
    this.suspicion = {};
    this.sightMarks = undefined;
    this.wariness = new Map();
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
    this.story = new StoryRunner(
      this.cache.text.get(STORY_KEY) as string,
      { character, companions: save.companions, rng: STORY_RNG, isDefeated: (key) => isDefeated(save, key) },
      save.story,
    );
    // Chegar numa área por uma saída (ou viagem) gasta o relógio, se a história disse que gasta. Continuar um jogo, não.
    if (this.arrival.areaId && this.story.spend("area")) save.story = this.story.save();
    this.player = this.addActor(ownSpriteKey(this, character.name, classSpriteKey(character.characterClass)), this.pos);
    this.trail = [{ ...this.pos }];
    this.syncPresence();

    this.clockBar = new ClockBar(this, (object) => this.addHud(object));
    this.clockBar.set(this.story.clock());
    this.hud = new WorldHud(
      this,
      (object) => this.addHud(object),
      this.map,
      this.scenery.groundSource,
      this.area.id,
      this.clockBar.visible,
      (id) => this.onMemberClick(id),
    );
    this.refreshStatus();
    this.refreshHint();
    this.showBanner(this.area.name);
    playMusic(areaMusic(this.area.id));

    const camera = this.cameras.main;
    // Quantos pixels de tela vale um pixel do mapa. Com tiles de 16px e zoom 3, cabem ~27 x 15 quadrados na tela.
    camera.setZoom(settings().zoom);
    camera.setBounds(0, 0, this.map.grid.width * this.map.tileSize, this.map.grid.height * this.map.tileSize);
    camera.startFollow(this.player.followTarget, true, 0.2, 0.2);
    camera.fadeIn(FADE_MS);

    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: keyOf("up").keyCode,
      a: keyOf("left").keyCode,
      s: keyOf("down").keyCode,
      d: keyOf("right").keyCode,
    }) as MoveKeys;
    keyboard.on("keydown", this.onKey, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onAimPointer, this);
    // O botão direito cancela a mira no combate; o menu do navegador só atrapalharia.
    this.input.mouse?.disableContextMenu();

    // O jogo grava sozinho: ao chegar numa área, ao sair da cena e quando a aba some ou fecha.
    const onHide = () => {
      // No meio de uma conversa não: a ficha já pode ter ganho o que a história ainda não registrou ter dado.
      if (!this.talking) this.persist();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    setPlaying(session.slot, () => !this.combat && !this.talking && !this.leaving && !this.aiming);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setPlaying(null);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      this.persist();
    });
    this.persist();
  }

  update(_time: number, delta: number): void {
    setPadMode(this.combat && !this.talking ? "fight" : this.pause || this.talking || this.leaving || this.aiming || this.combat ? "menu" : "field");
    this.scenery.tick(delta, this.combat ? this.combat.positions() : [tileOfPixel(this.map, this.pos)]);
    // Quadro longo demais é aba em segundo plano: não conta como tempo de jogo.
    if (!this.pause) this.save.playTimeMs += Math.min(delta, MAX_FRAME_MS);
    if (!this.combat) this.hud.tick(delta, this.minimapDots());
    if (this.leaving || this.combat || this.talking || this.pause || this.aiming) return;
    if (this.peoplePending) this.occupy();

    // Um gatilho dispara com o personagem parado também: é assim que a cena de chegada de uma área abre.
    const trigger = firedTrigger(this.map, this.pos, this.insideTriggers, this.flag, (knot) => this.story.visited(knot));
    if (trigger) {
      void this.converse(trigger.dialog);
      return;
    }

    this.moveSentries(delta);
    if (this.lookout(delta)) return;

    const dx = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const dy = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);
    this.hud.setWalking(dx !== 0 || dy !== 0, delta);
    if (dx === 0 && dy === 0) {
      this.player.setWalking(false);
      // Parado, quem ficou pra trás ainda chega.
      this.moveFollowers(delta);
      return;
    }

    // Na diagonal o passo é dividido entre os eixos: não se anda mais rápido de lado.
    const speed = this.sneaking ? WALK_SPEED * SNEAK_FACTOR : WALK_SPEED;
    const step = (speed * Math.min(delta, MAX_FRAME_MS)) / 1000 / Math.hypot(dx, dy);
    const from = this.pos;
    this.pos = walk(this.map, this.pos, dx * step, dy * step, BODY);
    this.player.place(this.pos);
    // Quem empurra uma parede não anda, e não faz barulho de passo.
    this.strode += Math.hypot(this.pos.x - from.x, this.pos.y - from.y);
    if (this.strode >= FOOTSTEP_PX) {
      this.strode = 0;
      this.campfire = false;
      sfx("step");
    }

    const facing: Facing = dx !== 0 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.player.face(facing);
    this.player.setWalking(true);
    this.moveFollowers(delta);

    const exit = exitAt(this.map, this.pos, this.exits);
    if (exit) {
      this.leave(exit);
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
    const actor = new MapActor(this, spriteKey, pos, sheetScale(spriteKey, this.map.tileSize) * settings().actorSize);
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
    this.scenery = new Scenery(
      this,
      this.area.id,
      (object) => this.addWorld(object),
      this.map.grid.width * this.map.tileSize,
      this.map.grid.height * this.map.tileSize,
    );
  }

  /**
   * Acerta os destrutíveis com a história: põe de pé os que não foram
   * quebrados e que as condições (`if`/`unless`) põem aqui agora — na grade
   * (pra barrarem o passo, na exploração e na luta) e na tela, ordenados por Y
   * como tudo que fica de pé —, e tira os que a história tirou.
   */
  private standProps(): void {
    const broken = brokenInArea(this.save, this.area.id);
    const wanted = new Set(
      this.map.props.filter((prop) => !broken.has(prop.id) && isActive(prop, this.flag)).map((prop) => prop.id),
    );
    this.props = this.props.filter((prop) => {
      if (wanted.has(prop.id)) return true;
      fellProp(this.map.grid, prop);
      this.propImages.get(prop.id)?.destroy();
      this.propImages.delete(prop.id);
      return false;
    });
    const standing = new Set(this.props.map((prop) => prop.id));
    const fresh = standAreaProps(this.map, broken, (prop) => wanted.has(prop.id) && !standing.has(prop.id));
    for (const prop of fresh) {
      this.propImages.set(prop.id, this.scenery.standProp(prop.kind, prop.pos.x, prop.pos.y, this.map.tileSize));
    }
    this.props.push(...fresh);
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
    this.scenery.sync(this.flag);
    this.standProps();
    this.npcs = this.map.npcs.filter((npc) => isActive(npc, this.flag));
    this.exits = this.map.exits.filter((exit) => isActive(exit, this.flag));
    this.enemies = this.map.enemies.filter(
      (enemy) => !isDefeated(this.save, this.groupKey(enemy.group)) && isActive(enemy, this.flag),
    );

    // Quem tem cara (`look`) fica de pé; os outros `npc` são só pontos pra examinar no que o mapa já desenha.
    const standing = this.npcs.filter((npc) => npc.look !== undefined);
    this.syncActors(this.npcActors, standing, (npc) => ownSpriteKey(this, npc.name, lookSpriteKey(npc.look!)));
    this.syncActors(this.enemyActors, this.enemies, (enemy) => ownSpriteKey(this, enemy.name, creatureSpriteKey(enemy.creature)));
    for (const enemy of this.enemies) this.enemyActors.get(enemy.id)?.face(enemy.facing ?? "down");
    this.drawSight();
    // O bicho de rio parado no mapa: meio corpo na água, ou inteiro no seco.
    for (const enemy of this.enemies) {
      if (!BESTIARY[enemy.creature]?.river) continue;
      const wet = tileAt(this.map.grid, tileOfPixel(this.map, enemy))?.water === true;
      this.enemyActors.get(enemy.id)?.setImmersion(wet ? "submerged" : "beached");
    }
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
      const spriteKey = ownSpriteKey(this, character.name, classSpriteKey(character.characterClass));
      this.followers.push({ character, pos, actor: this.addActor(spriteKey, pos) });
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
    const afflictions = this.story.afflictions();
    const entries = this.company().map((member): PartyEntry => {
      const face = portraitRef(this, member.name) ?? {
        key: ownSpriteKey(this, member.name, classSpriteKey(member.characterClass)),
        frame: standingFrame("down"),
      };
      const statuses = (afflictions[member.id] ?? []).map((id) => ({ name: STATUSES[id].name, bad: true }));
      if (!fights(member)) return { id: member.id, name: member.name, face, calling: castOf(member)?.calling, statuses };
      const magic = magicOf(member);
      return {
        id: member.id,
        name: member.name,
        face,
        level: member.level,
        hp: { now: member.currentHp, max: member.maxHp },
        breath: { now: breathOf(member), max: maxBreath(member) },
        mana: magic ? { now: manaOf(member, magic), max: maxMana(member, magic) } : undefined,
        calling: castOf(member)?.calling ?? CLASS_INFO[member.characterClass].name,
        statuses,
      };
    });
    this.hud.setParty(entries);
  }

  /** Clique num retrato da coluna do grupo: abre a ficha dele. */
  private onMemberClick(id: string): void {
    if (this.combat || this.leaving || this.talking || this.pause || this.aiming) return;
    this.openSheet(Math.max(0, this.company().findIndex((member) => member.id === id)));
  }

  /** Os pontos do minimapa: o grupo em ouro e a gente da área. Inimigo não aparece: quem vê é o olho, não o mapa. */
  private minimapDots(): { x: number; y: number; color: number; radius?: number }[] {
    return [
      ...[...this.npcActors.values()].map((actor) => ({ ...actor.pos, color: 0xcfc6b8, radius: 1.5 })),
      ...this.followers.map((follower) => ({ x: follower.pos.x, y: follower.pos.y, color: COLORS.gold, radius: 1.5 })),
      { x: this.pos.x, y: this.pos.y, color: COLORS.goldBright, radius: 2.5 },
    ];
  }

  /** Com quem dá pra falar daqui, se houver alguém. */
  private talkerInReach() {
    return npcInReach(this.map, this.pos, talkers(this.npcs, this.enemies));
  }

  /** A barra de quem anda: o que o protagonista sabe fazer daqui, os painéis e, em cima, o que está ao alcance. */
  private refreshHint(): void {
    const talker = this.talkerInReach();
    const prey = ambushableGroup(this.map, this.enemies, tileOfPixel(this.map, this.pos), this.character);
    const prompts: FieldPrompt[] = [];
    if (talker) prompts.push({ key: keyLabel("interact"), label: `${talker.stands ? "Falar com" : "Examinar"} ${talker.name}`, onClick: () => this.interact() });
    if (prey !== undefined) prompts.push({ key: keyLabel("ambush"), label: this.hidden(prey) ? "Emboscar" : "Investida", onClick: () => this.ambush() });
    this.hud.setPrompts(prompts);

    const abilities = this.fieldAbilities().map(
      (ability, index): FieldButton => ({
        icon: abilityIcon(ability),
        label: ability.name,
        hotkey: `${index + 1}`,
        meta: fieldUse(ability) === "mend" ? "Fora de luta: cura, pela ficha" : "Fora de luta: abre a luta",
        body: ability.flavor,
        onClick: () => this.useFieldAbility(index),
      }),
    );
    const menu = (icon: FieldButton["icon"], label: string, hotkey: string, onClick: () => void, extra: Partial<FieldButton> = {}): FieldButton => ({
      icon,
      label,
      hotkey,
      onClick: () => {
        if (!(this.combat || this.leaving || this.talking || this.pause || this.aiming)) onClick();
      },
      ...extra,
    });
    this.hud.setButtons(abilities, [
      menu("sneak", this.sneaking ? "Levantar" : "Esgueirar", keyLabel("sneak"), () => this.toggleSneak(), {
        selected: this.sneaking,
        body: "Agachado o grupo anda devagar, e o olhar de quem vigia fica pintado no chão.",
      }),
      menu("camp", "Descansar", keyLabel("rest"), () => this.openRest()),
      menu("sheet", "Ficha", keyLabel("sheet"), () => this.openSheet()),
      menu("bag", "Mochila", keyLabel("bag"), () => this.openBag()),
      menu("book", "Diário", keyLabel("journal"), () => this.openJournal()),
      menu("map", "Mapa", keyLabel("map"), () => this.openRegionMap()),
      menu("gear", "Pausa", "Esc", () => this.openPause()),
    ]);
  }

  /** As habilidades da protagonista que servem fora de luta, na ordem das teclas 1, 2, 3... */
  private fieldAbilities(): Ability[] {
    return sheetAbilities(this.character).filter((ability) => fieldUse(ability) !== undefined && !this.character.benched?.includes(ability.id));
  }

  /** Um título no alto da tela, sumindo sozinho (nome da área, avisos). */
  private showBanner(text: string): void {
    const banner = this.addHud(
      addTitleText(this, GAME_WIDTH / 2, 56, text, { fontSize: "34px", color: TEXT_COLORS.goldBright }).setOrigin(0.5).setShadow(0, 2, "#000000", 8),
    );
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 800, onComplete: () => banner.destroy() });
  }

  /**
   * `Z`: o descanso, em qualquer lugar fora de luta (a regra é de
   * shared/world/rest.ts). Abre a escolha entre a pausa curta e o
   * acampamento, com o que cada um custa: descansar nunca sai por acaso.
   */
  private openRest(): void {
    if (this.combat || this.leaving || this.talking || this.pause || this.aiming) return;
    this.halt();
    sfx("uiOpen");
    const width = 620;
    const height = 420;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    const meals = campMeals(this.character, this.save.companions);
    const mouths = campMouths(this.character, this.save.companions);
    const left = this.save.shortRests;
    const night = this.story.clock() ? " A noite gasta o tempo da Cheia." : "";
    const detail = addBodyText(this, x + 40, y + 250, "", {
      fontSize: "17px",
      lineSpacing: 4,
      color: TEXT_COLORS.inkDim,
      wordWrap: { width: width - 80 },
    });
    const dimmed = [this.addHud(addModalDim(this)), this.addHud(addPanel(this, x, y, width, height))];
    const heading = addHeading(this, GAME_WIDTH / 2, y + 46, "DESCANSAR", width - 80, 28);
    this.children.bringToTop(detail);
    const objects = [...dimmed, this.addHud(heading.rule), this.addHud(heading.label), this.addHud(detail)];

    const hunger = mouths - Math.min(meals, mouths);
    const menu = new Menu(
      this,
      x + 60,
      y + 100,
      [
        {
          label: `Pausa curta  ·  ${left}/${SHORT_RESTS}`,
          disabled: left <= 0,
          onFocus: () =>
            detail.setText(
              left > 0
                ? "Água, atadura, fôlego. Volta o Fôlego e metade da vida que falta. A mana e a marca ficam pra noite."
                : "As pausas acabaram: o corpo pede uma noite.",
            ),
          onSelect: () => this.restShort(),
        },
        {
          label: `Acampar  ·  ${Math.min(meals, mouths)}/${mouths} refeições`,
          onFocus: () =>
            detail.setText(
              (hunger === 0
                ? "Fogo, comida e uma noite. Volta tudo, a marca e a fome passam, e quem conjura grava."
                : `Fogo e uma noite, mas falta comida pra ${hunger}: quem não come acorda com metade do que faltava, e com fome.`) +
                night,
            ),
          onSelect: () => this.restCamp(),
        },
        { label: "Seguir", onFocus: () => detail.setText(""), onSelect: () => this.closePause() },
      ],
      { lineHeight: 44, fontSize: 22, width: width - 120, onCancel: () => this.closePause(), adopt: (item) => this.addHud(item) },
    );
    this.pause = {
      destroy: () => {
        menu.destroy();
        for (const object of objects) object.destroy();
      },
    };
  }

  /** A pausa curta: Fôlego e metade da vida que falta. Não gasta o relógio. */
  private restShort(): void {
    if (this.save.shortRests <= 0) return;
    this.closePause(true);
    shortRest(this.character, this.save.companions);
    this.save.shortRests -= 1;
    sfx("rest");
    this.persist();
    this.refreshStatus();
    this.showBanner("Uma pausa na estrada.");
  }

  /**
   * O acampamento: come da mochila, volta tudo pra quem comeu, a marca e a
   * fome passam; quem não comeu acorda com fome. Gasta o relógio, se a
   * história disse que gasta — e o que o tempo fecha, fecha.
   */
  private restCamp(): void {
    this.closePause(true);
    const { hungry } = camp(this.character, this.save.companions);
    this.save.shortRests = SHORT_RESTS;
    this.campfire = true;
    sfx("rest");
    let changed = this.story.rest();
    for (const id of hungry) changed = this.story.mark(id, HUNGER) || changed;
    if (this.story.spend("rest")) {
      this.clockBar.set(this.story.clock());
      this.syncPresence();
      changed = true;
    }
    if (changed) this.save.story = this.story.save();
    this.persist();
    this.refreshStatus();
    this.showBanner(hungry.length > 0 ? "Uma noite de barriga vazia." : "Uma noite inteira.");
    this.openEngrave();
  }

  /** O descanso de quem conjura: gravar, num objeto ou num círculo, o que na luta vai sair sem o tempo de recitar. */
  private openEngrave(): void {
    const casters = this.company().filter((member) => engravingSlots(member) > 0 && engravable(member).length > 0);
    if (casters.length === 0) return;
    this.halt();
    this.pause = new EngravePanel(this, (object) => this.addHud(object), {
      casters,
      onEngrave: (caster, abilityId) => {
        const done = engrave(caster, abilityId);
        if (done) this.persist();
        return done;
      },
      onClose: () => this.closePause(),
    });
  }

  // ----------------------------------------------------------------- conversa

  private interact(): void {
    if (this.combat || this.leaving || this.talking || this.pause || this.aiming) return;
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
    // Numa deixa da luta quem sai da frente é a interface dela; a de andar já não está na tela.
    const walking = !this.combat;
    let box: DialogueBox | undefined;
    try {
      let step = this.story.start(knot);
      for (;;) {
        steps.push(step);
        // Um trecho que só mexe em flags (ou decide que não tem nada a dizer) passa sem abrir a caixa.
        if (!box && !isSilent(step)) {
          if (walking) this.hud.setVisible(false);
          box = new DialogueBox(this, (object) => this.addHud(object), (event) => this.onStoryEvent(event));
        }
        const choice = box ? await box.play(step) : null;
        if (choice === null) break;
        step = this.story.choose(choice);
      }
    } finally {
      // Um erro no texto não pode deixar o jogador preso numa conversa que não fecha.
      box?.destroy();
      if (walking) this.hud.setVisible(true);
      // Um trecho que passou sem abrir a caixa também pode ter mexido no relógio.
      this.clockBar.set(this.story.clock());
      this.talking = false;
    }
    return steps;
  }

  /** O que a tela faz na hora em que a conversa chega num acontecimento, além do que a caixa anuncia: o relógio anda. */
  private onStoryEvent(event: StoryEvent): (() => void) | void {
    if (event.type === "clock") this.clockBar.set(event.clock);
    if (event.type === "xp") this.autoLearnCompanions();
  }

  /** Se as opções pedem, os companheiros gastam sozinhos os pontos da árvore (ver autoLearn). Devolve o que cada um aprendeu, pra anunciar. */
  private autoLearnCompanions(): string[] {
    if (!settings().skillsAuto) return [];
    const lines = this.company()
      .filter((member) => member.id !== this.character.id && fights(member))
      .flatMap((member) => {
        const learned = autoLearn(member);
        const raised = autoRaise(member);
        return [
          ...(learned.length > 0 ? [`${member.name} aprendeu ${learned.map((node) => node.name).join(" e ")}.`] : []),
          ...(raised.length > 0 ? [`${member.name} pôs ${raised.length} ponto${raised.length > 1 ? "s" : ""} de atributo.`] : []),
        ];
      });
    if (lines.length > 0) this.persist();
    return lines;
  }

  /** Cumpre o que o texto deixou pra depois da última fala: uma luta, uma viagem, uma loja. */
  private settle({ fight, travel, shop }: Aftermath): void {
    if (shop !== undefined && fight === undefined && !travel) {
      this.openShop(shop);
      return;
    }
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

  /**
   * `F`: começa a luta com o grupo mais próximo que ainda não percebeu o
   * personagem. Escondido, é emboscada: ele entra Surpreso. À vista, é a
   * investida: o grupo do jogador age antes, e a Força pode abalar o outro.
   */
  private ambush(): void {
    if (this.combat || this.leaving || this.talking || this.pause || this.aiming) return;
    const group = ambushableGroup(this.map, this.enemies, tileOfPixel(this.map, this.pos), this.character);
    if (group === undefined) return;
    if (this.hidden(group)) this.startCombat(group, "enemy");
    else this.startCombat(group, undefined, undefined, "party");
  }

  /** O grupo `group` não sabe do personagem: ele se esgueira e ninguém dali desconfia. */
  private hidden(group: string): boolean {
    return this.sneaking && !wary(this.enemies, group, this.suspicion);
  }

  /** `Q`: agacha e anda devagar, ou levanta. */
  private toggleSneak(): void {
    if (this.combat || this.leaving || this.talking || this.pause || this.aiming) return;
    this.sneaking = !this.sneaking;
    this.player.setSneaking(this.sneaking);
    for (const follower of this.followers) follower.actor.setSneaking(this.sneaking);
    this.drawSight();
    this.refreshHint();
  }

  /**
   * O olhar dos inimigos, a cada quadro fora de luta (ver shared/world/stealth.ts).
   * Andando à vista, quem vê começa a luta; esgueirando, desconfia, e quem
   * pega o grupo no meio do bote o pega Surpreso. Devolve se a luta começou.
   */
  private lookout(delta: number): boolean {
    const seen = watch(
      this.map,
      this.enemies,
      tileOfPixel(this.map, this.pos),
      this.sneaking,
      Math.min(delta, MAX_FRAME_MS) / 1000,
      this.suspicion,
    );
    this.showWariness();
    if (seen.kind === "unseen") {
      if (this.sneaking) this.refreshHint();
      return false;
    }
    if (seen.kind === "caught") {
      this.showBanner("Pegos!");
      this.startCombat(seen.group, "party");
    } else {
      this.startCombat(seen.group);
    }
    return true;
  }

  /**
   * Quem vira a cabeça e quem anda de ronda (ver sentryAt em shared/world/stealth.ts): a posição e o lado vão pro
   * próprio inimigo, que é o que o olhar lê, e pro boneco dele. Só corre explorando: na conversa e na pausa o mundo para.
   */
  private moveSentries(delta: number): void {
    this.sentryClock += Math.min(delta, MAX_FRAME_MS) / 1000;
    let changed = false;
    for (const enemy of this.enemies) {
      if (enemy.passive) continue;
      const sentry = sentryAt(this.map, enemy, this.sentryClock);
      if (!sentry) continue;
      enemy.x = sentry.x;
      enemy.y = sentry.y;
      enemy.facing = sentry.facing;
      const actor = this.enemyActors.get(enemy.id);
      actor?.place(sentry);
      actor?.face(sentry.facing);
      actor?.setWalking(sentry.walking);
      const tile = tileOfPixel(this.map, sentry);
      const mark = `${tile.x},${tile.y},${sentry.facing}`;
      if (this.sentryMarks.get(enemy.id) !== mark) {
        this.sentryMarks.set(enemy.id, mark);
        changed = true;
      }
    }
    if (changed && this.sneaking) this.drawSight();
  }

  /** O "?" em cima de quem desconfia: mais forte e mais vermelho quanto mais perto de ver. */
  private showWariness(): void {
    for (const [id, mark] of this.wariness) {
      if (this.suspicion[id] !== undefined) continue;
      mark.destroy();
      this.wariness.delete(id);
    }
    for (const [id, level] of Object.entries(this.suspicion)) {
      const actor = this.enemyActors.get(id);
      if (!actor) continue;
      let mark = this.wariness.get(id);
      if (!mark) {
        mark = this.addWorld(
          addTitleText(this, 0, 0, "?", { fontSize: "12px" }).setOrigin(0.5, 1).setResolution(ZOOM).setDepth(WARY_DEPTH),
        );
        this.wariness.set(id, mark);
      }
      const { x, y } = actor.top;
      mark.setPosition(x, y - 3).setAlpha(0.4 + level * 0.6).setColor(level > 0.6 ? TEXT_COLORS.danger : TEXT_COLORS.goldBright);
    }
  }

  /** Esgueirando, o chão que cada inimigo vê fica pintado: dá pra planejar a volta. */
  private drawSight(): void {
    this.sightMarks?.destroy();
    this.sightMarks = undefined;
    if (!this.sneaking || this.combat) return;
    const size = this.map.tileSize;
    const marks = this.addWorld(this.add.graphics()).setDepth(AIM_DEPTH);
    marks.fillStyle(COLORS.hpLow, SIGHT_ALPHA);
    for (const enemy of this.enemies) {
      if (enemy.passive) continue;
      for (const tile of sightTiles(this.map, enemy)) marks.fillRect(tile.x * size, tile.y * size, size, size);
    }
    this.sightMarks = marks;
  }

  /** Começou uma luta: ninguém mais desconfia de nada, e o chão não mostra olhar. */
  private forgetSuspicion(): void {
    this.suspicion = {};
    this.showWariness();
    this.sightMarks?.destroy();
    this.sightMarks = undefined;
  }

  /**
   * A luta com um grupo de inimigos começa, onde cada um está: porque ele
   * percebeu o personagem, porque a história mandou ou — com `surprised` —
   * porque o personagem o emboscou. Se o mapa tem deixas (`cue`) pra esse
   * grupo, a luta tem roteiro: elas entram junto. Com `opening`, ela abre com
   * o golpe que o personagem deu de fora (ver `aimOpening`).
   */
  private startCombat(group: string, surprised?: TeamId, opening?: Opening, charge?: TeamId): void {
    this.campfire = false;
    this.forgetSuspicion();
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
      // O quadrado até onde o personagem corre pra dar o primeiro golpe também tem dono.
      [...fighters.map((enemy) => tileOfPixel(this.map, enemy)), ...(opening?.from ? [opening.from] : [])],
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
      opening,
      charge,
      settings().difficulty,
      this.fightClock(),
    );

    this.hud.setVisible(false);
    playMusic("battle");
    sfx(surprised === "enemy" ? "ambush" : "fightStart");
    this.combat = new CombatController(
      {
        scene: this,
        map: this.map,
        actors,
        props: this.propImages,
        addWorld: (object) => this.addWorld(object),
        addHud: (object) => this.addHud(object),
        onCue: (id) => this.playCue(encounter, cues.find((cue) => cue.id === id)?.dialog),
        // Cada rodada que vira gasta o tempo do relógio, se a história disse que gasta. Como o resto do que acontece na luta, só fica se ela não for perdida (a perdida cobra em `endCombat`).
        onRound: () => {
          if (this.story.spend("round")) this.clockBar.set(this.story.clock());
        },
        goals: cues.flatMap((cue) => (cue.goal !== undefined ? [{ cue: cue.id, text: cue.goal }] : [])),
        logTop: this.clockBar.visible ? CLOCK_BAR_BOTTOM : RIGHT_COLUMN_TOP,
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
    const { currentHp, breath, mana, engraved, inventory } = character;
    syncCharacterFromUnit(character, unit);
    try {
      this.fightSteps.push(...(await this.read(knot)));
    } finally {
      syncUnitInventory(unit, character);
      character.currentHp = currentHp;
      character.breath = breath;
      character.mana = mana;
      character.engraved = engraved;
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
      playMusic(null);
      sfx("defeat");
      await combat.showResult(
        "DERROTA",
        [company.length > 0 ? "O grupo cai." : `${character.name} cai.`, "Você desperta inteiro, na entrada da área."],
        TEXT_COLORS.danger,
      );
      restoreParty(character, this.save.companions);
      // O que a história disse na luta não vale, mas o tempo que ela gastou, sim: tentar de novo custa — as rodadas que viraram e a luta em si.
      // Quem desperta inteiro desperta também sem a marca leve da mana, como quem descansou.
      this.save.story = restSavedStory(
        chargeSavedClock(chargeSavedClock(this.save.story, "round", encounter.round - 1), "fight"),
        passesWithRest,
      );
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
    // A marca de quem passou do limite de mana sai da luta com ele e fica até o descanso.
    for (const [id, marks] of Object.entries(lingeringMarks(encounter, [character, ...company]))) {
      for (const mark of marks) this.story.mark(id, mark);
    }
    this.story.spend("fight");
    this.clockBar.set(this.story.clock());
    this.save.story = this.story.save();
    this.persist();

    // Numa luta que parou, o resultado é o que a história acabou de dizer: não há painel.
    if (rewards) {
      const lines = [`+${rewards.xpGained} de XP`];
      const learnt = (learned: { name: string }[] = []) => (learned.length > 0 ? ` Aprendeu ${learned.map((ability) => ability.name).join(" e ")}.` : "");
      if (rewards.levelUp.leveledUp) lines.push(`Subiu para o nível ${rewards.levelUp.newLevel}!${learnt(rewards.levelUp.learned)}`);
      for (const { name, level, learned } of rewards.companionLevels) lines.push(`${name} subiu para o nível ${level}!${learnt(learned)}`);
      lines.push(...this.autoLearnCompanions());
      if (rewards.levelUp.leveledUp || (rewards.companionLevels.length > 0 && !settings().skillsAuto)) {
        lines.push(`Ponto novo na árvore: ${keyLabel("sheet")}, depois R.`);
      }
      lines.push(
        rewards.loot.length > 0
          ? `Encontrou: ${rewards.loot.map((item) => item.name).join(", ")}`
          : "Nada ficou pra trás.",
      );
      playMusic(null);
      sfx("victory");
      await combat.showResult("VITÓRIA", lines, TEXT_COLORS.goldBright);
    }
    playMusic(areaMusic(this.area.id));

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
    this.hud.setVisible(true);
    this.refreshStatus();
    this.refreshHint();

    // O que a história tem a dizer sobre a queda do grupo (se ele caiu), e depois o que ela tinha deixado marcado.
    const knot = winner === "party" ? fighters.find((enemy) => enemy.onDefeat !== undefined)?.onDefeat : undefined;
    if (knot !== undefined) await this.converse(knot);
    if (!this.combat && !this.leaving) this.settle(after);
  }

  // ------------------------------------------------------------------ pausa

  private onKey(event: KeyboardEvent): void {
    if (this.aiming) {
      this.onAimKey(event);
      return;
    }
    if (this.pause || this.combat || this.leaving || this.talking) return;
    if (event.code === "Escape") this.openPause();
    else if (isAction(event, "interact")) this.interact();
    else if (isAction(event, "ambush")) this.ambush();
    else if (isAction(event, "sneak")) this.toggleSneak();
    else if (isAction(event, "rest")) this.openRest();
    else if (isAction(event, "journal")) this.openJournal();
    else if (isAction(event, "map")) this.openRegionMap();
    else if (isAction(event, "sheet")) this.openSheet();
    else if (isAction(event, "bag")) this.openBag();
    // 1, 2, 3...: a habilidade de mesmo número na barra.
    else if (/^(Digit|Numpad)[1-9]$/.test(event.code)) this.useFieldAbility(Number(event.code.slice(-1)) - 1);
  }

  /** Usa, fora de luta, a habilidade da posição `index` na barra. */
  private useFieldAbility(index: number): void {
    if (this.pause || this.combat || this.leaving || this.talking || this.aiming) return;
    const ability = this.fieldAbilities()[index];
    if (!ability) return;
    if (fieldUse(ability) === "mend") this.openSheet();
    else if (!canAfford(this.character, ability)) {
      this.showBanner(missing(this.character, ability) === "mana" ? "Falta mana pra isso." : "Falta Fôlego pra isso.");
    }
    else if (keepsVow(this.character)) this.showBanner("Quem é da Espera não dá o primeiro golpe.");
    else if (!this.aimOpening(ability)) this.showBanner("Ninguém ao alcance que ainda não tenha te percebido.");
  }

  /** Quem a ficha e a mochila mostram: a protagonista e quem anda com ela agora. */
  private company(): Character[] {
    return [this.character, ...this.followers.map((follower) => follower.character)];
  }

  /** `C`: a ficha do grupo, por cima do mundo parado. É dela que se usa uma habilidade fora de luta. */
  private openSheet(start = 0): void {
    this.halt();
    sfx("uiOpen");
    this.pause = new SheetPanel(this, (object) => this.addHud(object), {
      owner: this.character,
      members: this.company(),
      start,
      campfire: this.campfire,
      // Vestir e tirar valem na hora e ficam gravados, como usar um item.
      onEquip: (wearer, itemId) => {
        const result = equip(this.character, wearer, itemId);
        if (result.ok) this.persist();
        return result;
      },
      onUnequip: (wearer, slot) => {
        unequip(this.character, wearer, slot);
        this.persist();
      },
      afflictions: this.story.afflictions(),
      onPacked: () => {
        this.persist();
        this.refreshHint();
      },
      onMend: (caster, ability, target) => this.mendOutside(caster, ability, target),
      onOpening: (ability, striker) => {
        if (!this.aimOpening(ability, striker)) return false;
        this.closePause();
        return true;
      },
      onBag: () => {
        this.closePause(true);
        this.openBag();
      },
      onClose: () => this.closePause(),
    });
  }

  /** `I`: a mochila do grupo. O que cura se usa ali mesmo; o resto fica pra luta. */
  private openBag(): void {
    this.halt();
    sfx("uiOpen");
    this.pause = new BagPanel(this, (object) => this.addHud(object), {
      owner: this.character,
      members: this.company(),
      onUse: (holder, itemId, target) => {
        const result = useItemOutside(holder, itemId, target);
        if (result.ok) {
          this.persist();
          this.refreshStatus();
        }
        return result;
      },
      onPass: (from, to, itemId) => {
        const result = passItem(from, to, itemId);
        if (result === "ok") this.persist();
        return result;
      },
      onDiscard: (holder, itemId) => {
        const result = discardItem(holder, itemId);
        if (result === "ok") this.persist();
        return result;
      },
      onSorted: () => this.persist(),
      onSheet: () => {
        this.closePause(true);
        this.openSheet();
      },
      onClose: () => this.closePause(),
    });
  }

  /**
   * Uma cura feita fora de luta. Custa o Fôlego de quem a faz e o de quem a recebe, que fica com fome (ver `mend`), e
   * tempo — o de uma rodada, se a história está contando.
   */
  /** O relógio da história como a luta o lê (a deixa `clock N`): quanto marca, quanto cada rodada gasta, onde para. */
  private fightClock(): FightClock | undefined {
    const clock = this.story.clock();
    return clock ? { value: clock.value, perRound: clock.costs.round, limit: clock.limit } : undefined;
  }

  private mendOutside(caster: Character, ability: Ability, target: Character): number | undefined {
    // Quem paga a cura é o paciente: com fome, o dobro — e a fome fica até o descanso.
    const hungry = this.story.afflictions()[target.id]?.includes(HUNGER) ?? false;
    const healed = mend(caster, ability, target, STORY_RNG, hungry);
    if (healed === undefined) return undefined;
    // Magia que custa mais que o limite de uma vez cobra do corpo também fora de luta.
    const mark = burstMark(caster, ability);
    let marked = false;
    if (mark) marked = this.story.mark(caster.id, mark) || marked;
    if (healed > 0) marked = this.story.mark(target.id, HUNGER) || marked;
    if (this.story.spend("round")) {
      this.save.story = this.story.save();
      this.clockBar.set(this.story.clock());
      this.syncPresence();
    } else if (marked) {
      this.save.story = this.story.save();
    }
    this.persist();
    this.refreshStatus();
    return healed;
  }

  // ------------------------------------------------------ golpe de abertura

  /**
   * Começa a mirar `ability` em quem ainda não percebeu o personagem: o golpe
   * sai antes da luta e o grupo do alvo entra nela surpreso. Falso se não há
   * ninguém ao alcance — aí nada muda.
   */
  private aimOpening(ability: Ability, striker: Character = this.character): boolean {
    const strikes = openingStrikes(this.map, striker, this.tileOf(striker), ability, this.enemies, this.props);
    if (strikes.length === 0) return false;
    this.halt();
    sfx("uiOpen");
    const marks = this.addWorld(this.add.graphics().setDepth(AIM_DEPTH));
    this.aiming = { ability, striker, strikes, index: 0, marks, since: this.time.now };
    this.cameras.main.stopFollow();
    this.drawAim();
    return true;
  }

  /** O quadrado em que `member` está agora: a protagonista onde ela anda, um companheiro onde vem atrás dela. */
  private tileOf(member: Character): Pos {
    const follower = this.followers.find((candidate) => candidate.character === member);
    return tileOfPixel(this.map, follower ? follower.pos : this.pos);
  }

  /** O boneco de `member` no mapa. */
  private actorOf(member: Character): MapActor {
    return this.followers.find((candidate) => candidate.character === member)?.actor ?? this.player;
  }

  /** Marca os alvos possíveis (quatro cantos), o escolhido (cheio) e até onde o personagem corre pra bater. */
  private drawAim(): void {
    if (!this.aiming) return;
    const { ability, striker, strikes, index, marks } = this.aiming;
    const size = this.map.tileSize;
    const strike = strikes[index];
    const who = striker === this.character ? "" : `${striker.name}: `;

    marks.clear();
    // O que não mira pega o grupo inteiro; o resto, um alvo por vez. O destrutível e o quadrado de área também contam.
    const whole = ability.targets === "foes";
    for (const enemy of this.enemies) {
      const tile = tileOfPixel(this.map, enemy);
      const chosen = whole ? enemy.group === strike.enemy?.group : !strike.prop && samePos(strike.target, tile);
      if (chosen) drawArea(marks, [tile], size, AIM_TARGET_COLOR, 0.3);
      else if (strikes.some((other) => other.enemy === enemy && !other.prop)) drawBrackets(marks, tile, size, AIM_TARGET_COLOR, 0.6);
    }
    for (const other of strikes) {
      if (other.prop && other !== strike) drawBrackets(marks, other.target, size, AIM_TARGET_COLOR, 0.6);
    }
    if (strike.prop || ability.radius !== undefined) drawArea(marks, [strike.target], size, AIM_TARGET_COLOR, 0.3);
    const here = this.tileOf(striker);
    if (!samePos(strike.from, here)) drawStop(marks, strike.from, size, AIM_STEP_COLOR);
    drawReach(marks, strike.from, strike.target, size, AIM_TARGET_COLOR);

    const aimed = pixelOfTile(this.map, strike.target);
    this.actorOf(striker).faceToward(aimed);
    // A câmera fica entre quem bate e quem apanha: o alvo pode estar fora da tela.
    const from = pixelOfTile(this.map, here);
    this.cameras.main.pan((from.x + aimed.x) / 2, (from.y + aimed.y) / 2, 160, "Sine.easeOut", true);
    const run = samePos(strike.from, here) ? "" : " (correndo até lá)";
    const what = strike.prop ? `o ${propTemplate(strike.prop).name.toLowerCase()}` : ability.radius !== undefined && !strike.enemy ? "o chão" : (strike.enemy?.name ?? "o chão");
    const price = !strike.enemy
      ? "ninguém por perto: só quebra"
      : this.hidden(strike.enemy.group)
        ? `${strike.prop ? `${strike.enemy.name} acorda com o barulho; ` : ""}o grupo perde a primeira vez, e o golpe é a ação do primeiro turno`
        : `${strike.prop ? `${strike.enemy.name} acorda com o barulho; ` : ""}à vista, o grupo não perde a vez`;
    this.hud.setPrompts([{ key: "", label: `${who}${ability.name} em ${what}${run}: ${price}.\n${AIM_HINT}` }]);
  }

  private onAimKey(event: KeyboardEvent): void {
    const aiming = this.aiming!;
    const count = aiming.strikes.length;
    switch (event.code) {
      case "Escape":
      case "Backspace":
        sfx("uiCancel");
        this.stopAiming();
        this.cameras.main.startFollow(this.player.followTarget, true, 0.2, 0.2);
        this.refreshHint();
        return;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        this.strikeFirst();
        return;
      case "Tab":
        event.preventDefault();
      // falls through
      case "ArrowRight":
      case "ArrowDown":
      case "KeyD":
      case "KeyS":
        aiming.index = (aiming.index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "KeyA":
      case "KeyW":
        aiming.index = (aiming.index - 1 + count) % count;
        break;
      default:
        return;
    }
    if (count > 1) sfx("uiMove");
    this.drawAim();
  }

  /** Clicar num alvo aceso dá o golpe nele; o botão direito desiste. */
  private onAimPointer(pointer: Phaser.Input.Pointer): void {
    const aiming = this.aiming;
    if (!aiming || aiming.since === this.time.now) return;
    if (pointer.rightButtonDown()) {
      this.onAimKey({ code: "Escape" } as KeyboardEvent);
      return;
    }
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = tileOfPixel(this.map, point);
    const index = aiming.strikes.findIndex((strike) => samePos(strike.target, tile) || (strike.enemy !== undefined && samePos(tileOfPixel(this.map, strike.enemy), tile)));
    if (index === -1) return;
    aiming.index = index;
    this.strikeFirst();
  }

  private stopAiming(): void {
    this.aiming?.marks.destroy();
    this.aiming = undefined;
  }

  /** O golpe escolhido abre a luta com o grupo do alvo, que entra nela surpreso. */
  private strikeFirst(): void {
    const { ability, striker, strikes, index } = this.aiming!;
    const strike = strikes[index];
    this.stopAiming();
    if (!strike.enemy) {
      this.breakOutside(striker, ability, strike);
      return;
    }
    // Escondido, o golpe pega o grupo surpreso; à vista, só o golpe.
    this.startCombat(strike.enemy.group, this.hidden(strike.enemy.group) ? "enemy" : undefined, {
      unitId: striker.id,
      abilityId: ability.id,
      target: strike.target,
      from: strike.from,
    });
  }

  /**
   * O golpe num destrutível sem ninguém por perto: ele quebra ali mesmo, fora de luta, e fica quebrado (como os que
   * quebram numa luta). Paga o Fôlego e a mana do golpe, como pagaria abrindo a luta.
   */
  private breakOutside(striker: Character, ability: Ability, strike: OpeningStrike): void {
    const prop = strike.prop!;
    payOutside(striker, ability);
    fellProp(this.map.grid, prop);
    this.props = this.props.filter((other) => other !== prop);
    this.propImages.get(prop.id)?.destroy();
    this.propImages.delete(prop.id);
    markBroken(this.save, [`${this.area.id}:${prop.id}`]);
    sfx(prop.kind === "barrel" ? "burst" : "block");
    this.cameras.main.startFollow(this.player.followTarget, true, 0.2, 0.2);
    this.showBanner(`${striker.name} quebra o ${propTemplate(prop).name.toLowerCase()}.`);
    this.persist();
    this.refreshStatus();
    this.refreshHint();
  }

  /** `J`: o diário de pistas, por cima do mundo parado. */
  /** `M`: o mapa da região, por cima do mundo parado. */
  private openRegionMap(): void {
    this.halt();
    sfx("uiOpen");
    this.pause = new RegionMapPanel(
      this,
      (object) => this.addHud(object),
      {
        name: this.area.name,
        map: this.map,
        scenery: this.scenery,
        flag: this.flag,
        pos: this.pos,
        people: [...this.npcActors.values()].map((actor) => actor.pos),
        exits: this.exits,
      },
      () => this.closePause(),
    );
  }

  /** A loja `id` (ver shared/shop.ts), aberta pelo texto. O que se vende fica no estado da história, e grava-se a cada troca. */
  private openShop(id: string): void {
    const shop = findShop(id);
    if (!shop) return;
    this.halt();
    sfx("uiOpen");
    const ledger = this.story.ledger();
    const traded = <T>(refusal: T | undefined): T | undefined => {
      if (refusal === undefined) {
        this.save.story = this.story.save();
        this.persist();
      }
      return refusal;
    };
    this.pause = new ShopPanel(this, (object) => this.addHud(object), {
      shop,
      owner: this.character,
      ledger,
      onBuy: (itemId) => traded(buyFrom(shop, this.character, itemId, ledger)),
      onSell: (itemId) => traded(sellTo(shop, this.character, itemId, ledger)),
      onClose: () => this.closePause(),
    });
  }

  private openJournal(): void {
    this.halt();
    sfx("uiOpen");
    const panel = new JournalPanel(this, (object) => this.addHud(object), this.story.journal(), this.story.quests(), () => this.closePause());
    this.pause = panel;
  }

  /** As opções, a partir da pausa. O que os bonecos e a câmera já receberam só muda abrindo a cena de novo. */
  private openOptions(): void {
    const { actorSize, zoom, keys } = settings();
    this.pause = new OptionsPanel(this, (object) => this.addHud(object), () => {
      this.closePause();
      const now = settings();
      if (now.actorSize !== actorSize || now.zoom !== zoom || now.keys !== keys) {
        this.persist();
        this.leaving = true;
        this.scene.restart({} satisfies WorldSceneData);
        return;
      }
      this.hud.applySettings();
      this.refreshStatus();
      this.refreshHint();
    });
  }

  private openPause(): void {
    this.halt();
    sfx("uiOpen");
    const width = 420;
    const height = 482;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    const dimmed = [this.addHud(addModalDim(this)), this.addHud(addPanel(this, x, y, width, height))];
    const heading = addHeading(this, GAME_WIDTH / 2, y + 46, "PAUSA", width - 60, 28);
    const objects = [...dimmed, this.addHud(heading.rule), this.addHud(heading.label)];

    const menu = new Menu(
      this,
      x + 40,
      y + 88,
      [
        { label: "Voltar ao jogo", onSelect: () => this.closePause() },
        { label: "Descansar", onSelect: () => this.swapPause(() => this.openRest()) },
        { label: "Ficha", onSelect: () => this.swapPause(() => this.openSheet()) },
        { label: "Mochila", onSelect: () => this.swapPause(() => this.openBag()) },
        { label: "Diário", onSelect: () => this.swapPause(() => this.openJournal()) },
        { label: "Mapa", onSelect: () => this.swapPause(() => this.openRegionMap()) },
        { label: "Opções", onSelect: () => this.swapPause(() => this.openOptions()) },
        // Ao fechar, a cena grava o jogo (SHUTDOWN chama persist).
        { label: "Salvar e sair pro título", onSelect: () => this.scene.start(SCENES.title) },
      ],
      { lineHeight: 44, fontSize: 22, width: width - 80, onCancel: () => this.closePause(), adopt: (item) => this.addHud(item) },
    );
    this.pause = {
      destroy: () => {
        menu.destroy();
        for (const object of objects) object.destroy();
      },
    };
  }

  /** Fecha o que está aberto por cima do mundo e abre outra coisa no lugar. */
  private swapPause(open: () => void): void {
    this.closePause(true);
    open();
  }

  /** `quiet`: outra coisa abre no lugar, e o som é o dela. */
  private closePause(quiet = false): void {
    if (!this.pause) return;
    if (!quiet) sfx("uiCancel");
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
    sfx("travel");
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
