import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  CONCEPTS,
  EQUIPMENT_SLOTS,
  RACE_INFO,
  STATUSES,
  STYLES,
  attributePoints,
  auraName,
  auraOf,
  branchesFor,
  breathOf,
  canAfford,
  describeSkill,
  learnRefusal,
  learnSkill,
  unlearnSkills,
  skillPoints,
  castOf,
  engravingSlots,
  equipRefusal,
  fieldUse,
  fights,
  gearBonus,
  gearedAttributes,
  isBlow,
  isRecited,
  kitOf,
  magicOf,
  mageLevelName,
  manaLimit,
  manaOf,
  maxBreath,
  maxMana,
  missing,
  proficiency,
  raiseAttribute,
  sheetAbilities,
  toggleBenched,
  storedGear,
  styleLabel,
  wornItem,
  xpToNextLevel,
  type Ability,
  type Attributes,
  type Character,
  type EquipError,
  type EquipmentItem,
  type EquipmentSlot,
  type EquipResult,
  type SkillNode,
  type SkillRefusal,
  type StatusId,
} from "@jogo/shared";
import { describeAbility } from "./combat/CombatController";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { isAction, keyLabel } from "./settings";
import { abilityIcon, gearIcon, type IconName } from "./icons";
import { sfx } from "./audio";
import { classSpriteKey, ownSpriteKey, standingFrame } from "./mapSprites";
import {
  Menu,
  SlotGrid,
  UiSlot,
  addBodyText,
  addCloseButton,
  addHeading,
  addModalDim,
  addPanel,
  addTitleText,
  drawBar,
  fitFace,
  hpColor,
  portraitRef,
  type AddHud,
  type FaceRef,
  type GridOption,
  type MenuOption,
} from "./ui";

const WIDTH = 1220;
const HEIGHT = 670;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TOP = Y + 66;
/** As abas de quem está no grupo. */
const TABS_X = X + 22;
const TAB_W = 62;
const TAB_H = 74;
/** As três colunas: quem é, os atributos, o que sabe fazer. */
const WHO_X = X + 102;
const FACE_W = 222;
const FACE_H = 276;
const GEAR_X = WHO_X + FACE_W + 8;
const GEAR_SLOT = 62;
const STATS_X = X + 420;
const STATS_WIDTH = 300;
const TILE_H = 54;
const SKILLS_X = X + 750;
const SKILLS_WIDTH = WIDTH - (SKILLS_X - X) - 30;
const SKILL_SLOT = 58;
const SKILL_GAP = 6;
const SKILL_COLS = 7;
const SKILL_ROWS = 2;
const SKILL_LINE = 32;
/** A árvore: o quadrado de cada nó e a distância de um nó ao de baixo. */
const TREE_SLOT = 54;
const TREE_STEP = 78;
/** A tecla que abriu a ficha não pode ser a mesma que a fecha. */
const INPUT_GRACE_MS = 200;

/** O nome de cada atributo e o que ele governa, em uma palavra (ver a tabela de atributos em docs/motor.md). */
const ATTRIBUTE_LABEL: Record<keyof Attributes, [string, string]> = {
  forca: ["Força", "dano"],
  fator: ["Fator", "magia"],
  vigor: ["Vigor", "vida"],
  olho: ["Olho", "acerto"],
  couro: ["Couro", "defesa"],
  labia: ["Lábia", "conversa"],
  saber: ["Saber", "estudo"],
};

/** O que cada traço de escola faz, em uma linha. */
const TRAIT_TEXT: Record<keyof typeof STYLES, string> = {
  ipojy: "quem a ataca e erra leva o golpe de volta, na reação",
  gryskar: "cada golpe seguido no mesmo alvo soma no dano do próximo",
  tsvirana: "dobra o dano em quem repete a ação do turno anterior",
  baluarte: "tira um tanto fixo de cada golpe que recebe",
};

export const SLOT_LABEL: Record<EquipmentSlot, string> = { weapon: "Arma", armor: "Armadura", accessory: "Acessório" };

const EQUIP_REFUSAL: Record<EquipError, string> = {
  not_owned: "Essa peça não está mais guardada.",
  wrong_class: "Isso não é arma de quem ele é.",
};

/** O que uma peça faz, em números. `brief` é a linha curta da ficha: sem dizer quem pode usar. */
export function describeEquipment(item: EquipmentItem, brief = false): string {
  const { data } = item;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  if (data.slot === "weapon") {
    return [
      `dano ${data.dice.count}d${data.dice.sides}`,
      data.range === 1 ? (brief ? "de perto" : "corpo a corpo") : `alcance ${data.range}`,
      ...(data.toHit ? [`acerto ${signed(data.toHit)}`] : []),
      ...(data.classes && !brief ? [`só ${data.classes.map((each) => CLASS_INFO[each].name).join(", ")}`] : []),
    ].join(" · ");
  }
  if (data.slot === "armor") return [`defesa ${signed(data.defense)}`, ...(data.speed ? [`movimento ${signed(data.speed)}`] : [])].join(" · ");
  return Object.entries(data.attributes)
    .map(([stat, bonus]) => `${ATTRIBUTE_LABEL[stat as keyof Attributes][0]} ${signed(bonus)}`)
    .join(" · ");
}

export interface SheetHost {
  /** Alguém mudou o que leva pra luta. */
  onPacked: () => void;
  /** O grupo está no acampamento: dá pra refazer a árvore (`U`, ver unlearnSkills). */
  campfire?: boolean;
  /** A dona da mochila: é com ela que fica guardado o equipamento que ninguém veste. */
  owner: Character;
  /** As fichas a mostrar: a protagonista primeiro, depois quem anda com ela. */
  members: Character[];
  /** Em quem a ficha abre: a posição em `members`. */
  start?: number;
  /** As condições que a história pôs em cada um e que duram entre lutas, pelo id da ficha. */
  afflictions: Record<string, StatusId[]>;
  /** `caster` cura `target` com `ability`, agora. Devolve quanto curou; undefined se não curou nada. */
  onMend: (caster: Character, ability: Ability, target: Character) => number | undefined;
  /** A protagonista quer abrir uma luta com `ability`. Falso se não há em quem: a ficha continua aberta. */
  onOpening: (ability: Ability) => boolean;
  /** `wearer` veste a peça guardada `itemId` (ver equip em shared/equipment.ts). */
  onEquip: (wearer: Character, itemId: string) => EquipResult;
  /** `wearer` tira o que tem em `slot`, que volta pro guardado. */
  onUnequip: (wearer: Character, slot: EquipmentSlot) => void;
  onBag: () => void;
  onClose: () => void;
}

/**
 * A ficha de quem está no grupo, aberta por cima do mundo parado: o retrato,
 * os três lugares do que veste ao lado dele, os atributos em quadros, as
 * barras, a escola, as condições que carrega e, numa grade, o que sabe fazer —
 * e, apagado, o que ele ainda vai aprender.
 *
 * É daqui que se usa uma habilidade FORA de luta: uma cura, em alguém do
 * grupo; um golpe, pra abrir uma luta (ver shared/world/field.ts). E é daqui
 * que se EQUIPA (E, ou clicando num lugar): a coluna da direita abre os três
 * lugares, e cada lugar abre o que há guardado pra ele (ver shared/equipment.ts).
 * As regras são de lá — a ficha só mostra e pergunta.
 *
 * Tab troca de personagem; setas (ou WASD) andam na grade; Enter usa; E equipa;
 * R abre a árvore de habilidades (ver shared/skillTree.ts); I vai pra mochila;
 * Esc ou C fecham.
 */
export class SheetPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private page: Phaser.GameObjects.GameObject[] = [];
  private readonly grid: SlotGrid;
  private menu?: Menu;
  private readonly heading: ReturnType<typeof addHeading>;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly notice: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private index: number;
  /** Escolhendo em quem usar uma cura, ou o que vestir: a grade virou lista, e Tab não troca de personagem. */
  private targeting = false;
  /** A coluna da direita é a árvore (`U` refaz). */
  private treeOpen = false;
  /** O que a árvore pôs na tela, e os nós dela por coluna (ramo) e linha. */
  private treeParts: Phaser.GameObjects.GameObject[] = [];
  private treeSlots: { slot: UiSlot; node: SkillNode; describe: () => void }[][] = [];
  private treeFocus = { col: 0, row: 0 };
  /** A habilidade sob o cursor, se dá pra deixá-la de fora (`X`). */
  private focusedAbility?: Ability;
  private closed = false;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: SheetHost,
  ) {
    this.index = Math.max(0, Math.min(host.members.length - 1, host.start ?? 0));
    this.frame.push(addHud(addModalDim(scene)), addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)));
    const title = addHeading(scene, X + 560, Y + 34, "FICHA", 980, 26);
    this.frame.push(addHud(title.rule), addHud(title.label));
    this.heading = addHeading(scene, SKILLS_X + SKILLS_WIDTH / 2, TOP + 8, "HABILIDADES", SKILLS_WIDTH, 16);
    this.frame.push(
      addHud(this.heading.rule),
      addHud(this.heading.label),
      addHud(addCloseButton(scene, X + WIDTH - 26, Y + 26, () => this.host.onClose())),
    );
    this.detailName = addHud(addTitleText(scene, SKILLS_X, 0, "", { fontSize: "17px", color: TEXT_COLORS.goldBright, wordWrap: { width: SKILLS_WIDTH } }));
    this.detail = addHud(addBodyText(scene, SKILLS_X, 0, "", { fontSize: "15px", lineSpacing: 3, wordWrap: { width: SKILLS_WIDTH } }));
    this.notice = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 58, "", { fontSize: "17px", color: TEXT_COLORS.goldBright }).setOrigin(0.5).setShadow(0, 2, "#000000", 4),
    );
    this.footer = addHud(addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 24, "", { fontSize: "14px", color: TEXT_COLORS.inkDim }).setOrigin(0.5));
    this.frame.push(this.detailName, this.detail, this.notice, this.footer);
    this.grid = new SlotGrid(scene, SKILLS_X, TOP + 28, {
      cols: SKILL_COLS,
      rows: SKILL_ROWS,
      size: SKILL_SLOT,
      gap: SKILL_GAP,
      onCancel: () => this.host.onClose(),
      adopt: (root) => addHud(root),
    });

    this.openedAt = scene.time.now;
    this.show();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.closed = true;
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.clearTree();
    this.menu?.destroy();
    this.grid.destroy();
    for (const object of [...this.frame, ...this.page]) object.destroy();
    this.page = [];
  }

  private get character(): Character {
    return this.host.members[this.index];
  }

  private add<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.page.push(this.addHud(object));
    return object;
  }

  /** O rosto de `member`: o retrato, ou o boneco do mapa. */
  private faceOf(member: Character): FaceRef {
    return (
      portraitRef(this.scene, member.name) ?? {
        key: ownSpriteKey(this.scene, member.name, classSpriteKey(member.characterClass)),
        frame: standingFrame("down"),
      }
    );
  }

  /** No quadro seguinte: o que foi clicado ainda está no meio do próprio evento, e a troca o destrói. */
  private later(action: () => void): void {
    this.scene.time.delayedCall(0, () => {
      if (!this.closed) action();
    });
  }

  /** Redesenha a página do personagem da vez. */
  private show(): void {
    for (const object of this.page) object.destroy();
    this.page = [];
    this.targeting = false;
    const { scene, character } = this;
    const cast = castOf(character);

    this.drawTabs();

    // O retrato grande, numa moldura.
    this.add(scene.add.rectangle(WHO_X, TOP, FACE_W, FACE_H, 0x0a0807, 1).setOrigin(0).setStrokeStyle(1, COLORS.gold, 1));
    const portrait = this.add(scene.add.image(0, 0, "__DEFAULT"));
    fitFace(portrait, this.faceOf(character), WHO_X + 1, TOP + 1, FACE_W - 2, FACE_H - 2, character.name);

    // Os lugares do corpo, ao lado do retrato.
    if (fights(character)) {
      EQUIPMENT_SLOTS.forEach((slot, i) => this.drawGearSlot(slot, GEAR_X, TOP + i * (GEAR_SLOT + 8)));
    }

    const info = CLASS_INFO[character.characterClass];
    let y = TOP + FACE_H + 10;
    y += this.add(addTitleText(scene, WHO_X, y, character.name, { fontSize: "24px", color: TEXT_COLORS.goldBright })).height + 2;
    const lines = [
      `${RACE_INFO[character.race].name}  ·  ${cast?.calling ?? info.name}`,
      ...(fights(character) ? [info.role] : ["Acompanha sem lutar"]),
    ];
    // Quem conjura: o conceito e o nível de mago.
    const magic = magicOf(character);
    if (magic) lines.push(`${CONCEPTS[magic.concept].name}  ·  ${mageLevelName(magic.level)}`);
    if (cast?.style) {
      const level = auraOf(character);
      const grade = proficiency(cast.style.grade, level);
      const aura = level !== undefined ? `  ·  aura ${auraName(level)}` : "";
      lines.push(`${styleLabel({ style: cast.style.id, grade })}${aura}`);
    }
    y += this.add(addBodyText(scene, WHO_X, y, lines.join("\n"), { fontSize: "15px", lineSpacing: 3, wordWrap: { width: 296 } })).height + 6;
    if (cast?.style) {
      const trait = `${STYLES[cast.style.id].trait}: ${TRAIT_TEXT[cast.style.id]}.`;
      y += this.add(addBodyText(scene, WHO_X, y, trait, { fontSize: "14px", color: TEXT_COLORS.inkDim, wordWrap: { width: 296 } })).height + 4;
    }
    const afflictions = (this.host.afflictions[character.id] ?? []).map((id) => STATUSES[id].name);
    if (afflictions.length > 0) {
      this.add(addBodyText(scene, WHO_X, y, `Carrega: ${afflictions.join(", ")}`, { fontSize: "15px", color: TEXT_COLORS.danger, wordWrap: { width: 296 } }));
    }

    this.drawStats();
    this.listAbilities();
  }

  /** Quem está no grupo, em abas na beirada do painel. */
  private drawTabs(): void {
    const { scene } = this;
    this.host.members.forEach((member, i) => {
      const y = TOP + i * (TAB_H + 8);
      const on = i === this.index;
      const face = this.add(scene.add.image(0, 0, "__DEFAULT"));
      fitFace(face, this.faceOf(member), TABS_X, y, TAB_W, TAB_H, member.name);
      face.setAlpha(on ? 1 : 0.55);
      const edge = this.add(scene.add.rectangle(TABS_X, y, TAB_W, TAB_H).setOrigin(0));
      edge.setStrokeStyle(on ? 2 : 1, on ? COLORS.goldBright : COLORS.bronze, 1);
      edge.setInteractive({ useHandCursor: true });
      edge.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (i === this.index || this.targeting) return;
        this.later(() => {
          this.index = i;
          this.show();
        });
      });
    });
  }

  /** Um lugar do corpo: o quadrado com a peça; o mouse mostra o que ela faz, o clique abre o que trocar. */
  private drawGearSlot(slot: EquipmentSlot, x: number, y: number): void {
    const item = wornItem(this.character, slot);
    const fallback: Record<EquipmentSlot, IconName> = { weapon: "sword", armor: "armor", accessory: "ring" };
    const view = new UiSlot(this.scene, x, y, GEAR_SLOT, {
      over: () => {
        if (this.targeting) return;
        this.detailName.setText(`${SLOT_LABEL[slot]}: ${item?.name ?? "vazio"}`);
        this.detail.setY(this.detailName.y + this.detailName.height + 4);
        this.detail.setText(
          item
            ? `${item.description}\n\n${describeEquipment(item)}\n\nClique: trocar ou tirar.`
            : `Lugar vazio — ${this.bareText(slot)}.\n\nClique: vestir uma peça guardada.`,
        );
      },
      down: () => this.later(() => this.listGear(slot)),
    });
    // Lugar vazio: o sinal apagado do que vai ali.
    view.set(item ? { icon: gearIcon(item) } : { icon: fallback[slot], enabled: false });
    this.add(view.root);
  }

  /** Os recursos e os atributos, em quadros. */
  private drawStats(): void {
    const { scene, character } = this;
    let y = TOP;
    const bars = this.add(scene.add.graphics());
    const meter = (name: string, now: number, max: number, color: number) => {
      this.add(addBodyText(scene, STATS_X, y, name, { fontSize: "14px", color: TEXT_COLORS.inkDim }));
      this.add(addBodyText(scene, STATS_X + STATS_WIDTH, y, `${now}/${max}`, { fontSize: "14px" })).setOrigin(1, 0);
      drawBar(bars, STATS_X, y + 20, STATS_WIDTH, 9, max > 0 ? now / max : 0, color);
      y += 36;
    };
    this.add(addBodyText(scene, STATS_X, y, `Nível ${character.level}`, { fontSize: "17px", color: TEXT_COLORS.goldBright }));
    y += 26;
    const magic = magicOf(character);
    if (fights(character)) {
      meter("Vida", character.currentHp, character.maxHp, hpColor(character.maxHp > 0 ? character.currentHp / character.maxHp : 0));
      meter("Fôlego", breathOf(character), maxBreath(character), COLORS.breath);
      if (magic) meter(`Mana  (limite ${manaLimit(magic)} por turno)`, manaOf(character, magic), maxMana(character, magic), COLORS.mana);
    }
    meter("Experiência", character.xp, xpToNextLevel(character.level), COLORS.gold);
    if (magic) {
      const engraved = `Gravadas ${character.engraved?.length ?? 0}/${engravingSlots(character)}  ·  grava-se no descanso`;
      y += this.add(addBodyText(scene, STATS_X, y, engraved, { fontSize: "14px", color: TEXT_COLORS.inkDim })).height + 8;
    }

    // Os atributos já com o que ele veste; o que o acessório soma fica ao lado, entre parênteses. Em dourado, o que a classe escala.
    const primary = CLASS_INFO[character.characterClass].primaryAttributes;
    const geared = gearedAttributes(character);
    const bonus = gearBonus(character);
    const tileWidth = (STATS_WIDTH - 8) / 2;
    ATTRIBUTE_KEYS.forEach((key, i) => {
      const [name, meaning] = ATTRIBUTE_LABEL[key];
      const tx = STATS_X + (i % 2) * (tileWidth + 8);
      const ty = y + Math.floor(i / 2) * (TILE_H + 6);
      const main = primary.includes(key);
      const color = main ? TEXT_COLORS.goldBright : TEXT_COLORS.ink;
      this.add(scene.add.rectangle(tx, ty, tileWidth, TILE_H, 0x0a0807, 0.9).setOrigin(0).setStrokeStyle(1, main ? COLORS.gold : COLORS.bronze, main ? 1 : 0.6));
      this.add(addBodyText(scene, tx + 8, ty + 6, name, { fontSize: "16px", color }));
      this.add(addBodyText(scene, tx + 8, ty + 29, meaning, { fontSize: "13px", color: TEXT_COLORS.inkDim }));
      const extra = bonus[key] ? ` (${bonus[key]! > 0 ? "+" : ""}${bonus[key]})` : "";
      this.add(addTitleText(scene, tx + tileWidth - 8, ty + TILE_H / 2, `${geared[key]}${extra}`, { fontSize: "22px", color })).setOrigin(1, 0.5);
    });
  }

  /** O que vale num lugar vazio. */
  private bareText(slot: EquipmentSlot): string {
    return slot === "weapon" ? "mãos vazias: 1d6" : "nada";
  }

  private setFooter(text: string): void {
    const many = !this.targeting && this.host.members.length > 1;
    this.footer.setText(`${many ? "Tab: trocar de personagem  ·  " : ""}${text}`);
  }

  /** A coluna da direita vira lista: em quem, ou o que vestir. A grade sai da frente. */
  private setMenu(options: MenuOption[], onCancel: () => void, focus?: number): void {
    this.clearTree();
    this.menu?.destroy();
    this.grid.setVisible(false);
    const top = TOP + 28;
    this.detailName.setText("");
    this.detail.setY(top + options.length * SKILL_LINE + 12);
    this.menu = new Menu(this.scene, SKILLS_X, top, options, {
      lineHeight: SKILL_LINE,
      fontSize: 17,
      width: SKILLS_WIDTH,
      onCancel,
      adopt: (item) => this.addHud(item),
    });
    if (focus !== undefined) this.menu.focusOn(focus);
  }

  /** O que dá pra fazer com `ability` agora, fora de luta — a etiqueta e a linha da descrição. */
  private usage(ability: Ability): { tag: string; text: string } {
    const use = fights(this.character) ? fieldUse(ability) : undefined;
    // Fora de luta ela custa o mesmo Fôlego e a mesma mana que dentro, e só o descanso os devolve.
    const short = use !== undefined && (use === "mend" || this.index === 0) ? missing(this.character, ability) : undefined;
    if (short === "breath") {
      return {
        tag: "sem fôlego",
        text: `Falta Fôlego: custa ${ability.breath}, e ${this.character.name} tem ${breathOf(this.character)}. Descansar devolve.`,
      };
    }
    if (short === "mana") {
      const magic = magicOf(this.character);
      const has = magic ? `, e ${this.character.name} tem ${manaOf(this.character, magic)}` : `, e ${this.character.name} não conjura`;
      return { tag: "sem mana", text: `Falta mana: custa ${ability.mana}${has}. Descansar devolve.` };
    }
    if (use === "mend") return { tag: "cura", text: "Enter ou clique: usar agora em alguém do grupo." };
    if (use === "opening" && this.index === 0) {
      return {
        tag: "abre luta",
        text: "Enter ou clique: mirar em quem ainda não te percebeu. O golpe sai antes da luta, e o grupo dele perde a primeira vez.",
      };
    }
    if (use === "opening") return { tag: "", text: `Fora de luta, quem dá o primeiro golpe é ${this.host.members[0].name}.` };
    if (isRecited(ability) && isBlow(ability)) {
      return { tag: "", text: "Recitada: leva tempo, então não abre luta. Gravada no descanso, sai na hora — e abre." };
    }
    return { tag: "", text: "Só serve dentro de uma luta." };
  }

  private showAbility(ability: Ability, text: string, tag = ""): void {
    this.detailName.setText(`${ability.name}${tag ? `  ·  ${tag}` : ""}`);
    this.detail.setY(this.detailName.y + this.detailName.height + 4);
    this.detail.setText(`${ability.flavor}\n\n${describeAbility(ability)}\n\n${text}`);
  }

  /** A coluna da direita volta a ser a grade de habilidades. */
  private listAbilities(focus = 0): void {
    this.targeting = false;
    this.clearTree();
    this.menu?.destroy();
    this.menu = undefined;
    this.grid.setVisible(true);
    this.grid.setActive(true);
    this.heading.setText("HABILIDADES");
    this.detailName.setY(TOP + 28 + SKILL_ROWS * (SKILL_SLOT + SKILL_GAP) + 8);
    const { character } = this;
    const abilities = sheetAbilities(character);
    // O que a classe ainda vai ensinar: à vista, apagado, com o nível (ou o nível de mago) em que chega.
    const known = new Set(abilities.map((ability) => ability.id));
    const ahead = fights(character) && !character.arts ? kitOf(character).filter((entry) => !known.has(entry.ability.id)) : [];
    const when = (entry: (typeof ahead)[number]) =>
      entry.mage !== undefined && entry.mage > (magicOf(character)?.level ?? 0) ? `no ${mageLevelName(entry.mage)}` : `no nível ${entry.level}`;
    const options: GridOption[] = [
      ...abilities.map((ability): GridOption => {
        const { tag, text } = this.usage(ability);
        const benched = character.benched?.includes(ability.id) === true;
        const canBench = fights(character) && !ability.engraved;
        const packing = canBench ? (benched ? "\n\nFica de fora das lutas. X: levar." : "\n\nX: deixar de fora das lutas.") : "";
        return {
          icon: abilityIcon(ability),
          cost: ability.cost === "action" ? "action" : "bonus",
          enabled: !benched,
          onFocus: () => {
            this.focusedAbility = canBench ? ability : undefined;
            this.showAbility(ability, text + packing, tag);
          },
          onSelect: () => this.use(ability),
        };
      }),
      ...ahead.map(
        (entry): GridOption => ({
          icon: abilityIcon(entry.ability),
          enabled: false,
          onFocus: () => {
            this.focusedAbility = undefined;
            this.showAbility(entry.ability, `Ainda não sabe: chega ${when(entry)}.`);
          },
          onSelect: () => undefined,
        }),
      ),
    ];
    this.grid.setOptions(options, focus);
    if (options.length === 0) {
      this.detailName.setText("");
      this.detail.setY(this.detailName.y).setText("Não aprendeu nada que sirva numa luta.");
    }
    const points = fights(character) && !character.arts ? skillPoints(character) : 0;
    const tree = fights(character) ? `  ·  R: árvore${points > 0 ? ` (${points} ponto${points > 1 ? "s" : ""})` : ""}` : "";
    const spare = attributePoints(character);
    const raise = spare > 0 ? `  ·  T: atributos (${spare} ponto${spare > 1 ? "s" : ""})` : "";
    this.setFooter(`Setas: habilidade  ·  Enter: usar  ·  ${keyLabel("interact")}: equipar  ·  ${keyLabel("bag")}: mochila${tree}${raise}  ·  Esc: fechar`);
  }

  /** `R`: a coluna da direita vira a árvore de habilidades: um ramo por coluna, de cima pra baixo, com o que cada nó pede. */
  private listTree(focus?: { col: number; row: number }): void {
    const { character, scene } = this;
    if (!fights(character)) {
      this.say(`${character.name} acompanha sem lutar: não tem o que aprender pra luta.`);
      return;
    }
    this.clearTree();
    this.menu?.destroy();
    this.menu = undefined;
    this.grid.setVisible(false);
    this.focusedAbility = undefined;

    const branches = branchesFor(character.characterClass, castOf(character)?.style?.id);
    const known = sheetAbilities(character);
    const kit = kitOf(character).map((entry) => entry.ability);
    const abilityById = new Map([...kit, ...known].map((ability) => [ability.id, ability]));
    const points = skillPoints(character);
    this.targeting = true;
    this.treeOpen = true;
    this.heading.setText(`ÁRVORE  ·  ${points} PONTO${points === 1 ? "" : "S"}`);

    const top = TOP + 28;
    const colW = SKILLS_WIDTH / branches.length;
    const lines = scene.add.graphics();
    this.treeParts.push(this.addHud(lines));
    this.treeSlots = branches.map((branch, col) => {
      const cx = SKILLS_X + colW * col + colW / 2;
      const label = addTitleText(scene, cx, top, branch.name.toUpperCase(), { fontSize: "14px", color: TEXT_COLORS.gold }).setOrigin(0.5, 0);
      this.treeParts.push(this.addHud(label));
      return branch.nodes.map((node, row) => {
        const x = cx - TREE_SLOT / 2;
        const y = top + 24 + row * TREE_STEP;
        const refusal = learnRefusal(character, node);
        const learned = refusal === "known";
        // A linha que sobe até o nó de cima: dourada se os dois já se aprenderam.
        if (row > 0) {
          const lit = learned;
          lines.lineStyle(lit ? 3 : 2, lit ? COLORS.goldBright : COLORS.bronze, lit ? 1 : 0.5);
          lines.lineBetween(cx, y - (TREE_STEP - TREE_SLOT), cx, y);
        }
        if (learned) {
          lines.fillStyle(COLORS.goldBright, 1);
          lines.fillCircle(x + TREE_SLOT - 2, y + 2, 6);
        }
        const slot = new UiSlot(scene, x, y, TREE_SLOT, {
          over: () => this.focusTree(col, row),
          down: () => this.later(() => this.learnAt(col, row)),
        });
        slot.set({ icon: this.nodeIcon(node, abilityById), enabled: learned || refusal === undefined || refusal === "points" });
        this.treeParts.push(this.addHud(slot.root));
        return { slot, node, describe: () => this.describeNode(node, refusal, abilityById) };
      });
    });

    this.detailName.setY(top + 24 + 3 * TREE_STEP + 4);
    const start = focus ?? this.firstOpen();
    this.focusTree(start.col, start.row);
    this.setFooter(`Setas: nó  ·  Enter: aprender${this.host.campfire ? "  ·  U: refazer a árvore" : ""}  ·  Esc: voltar`);
  }

  /** O primeiro nó que dá pra aprender agora; sem nenhum, o primeiro de todos. */
  private firstOpen(): { col: number; row: number } {
    for (const [col, column] of this.treeSlots.entries()) {
      const row = column.findIndex(({ node }) => learnRefusal(this.character, node) === undefined);
      if (row >= 0) return { col, row };
    }
    return { col: 0, row: 0 };
  }

  /** O ícone de um nó: o da habilidade que ele melhora, ou o do corpo que ele mexe. */
  private nodeIcon(node: SkillNode, abilities: Map<string, Ability>): IconName {
    const target = Object.keys(node.tweaks ?? {})
      .map((id) => abilities.get(id))
      .find((ability) => ability !== undefined);
    if (target) return abilityIcon(target);
    const passive = node.passive ?? {};
    if (passive.engravings) return "engrave";
    if (passive.speed) return "move";
    if (passive.breath) return "wave";
    return "armor";
  }

  private describeNode(node: SkillNode, refusal: SkillRefusal | undefined, abilities: Map<string, Ability>): void {
    this.detailName.setText(`${node.name}${this.treeTag(node, refusal)}`);
    this.detail.setY(this.detailName.y + this.detailName.height + 4);
    this.detail.setText(`${node.flavor}\n\n${describeSkill(node, (id) => abilities.get(id)?.name)}\n\n${this.treeHint(node, refusal)}`);
  }

  /** Põe o cursor no nó da coluna `col`, linha `row` (presa ao que existe). */
  private focusTree(col: number, row: number): void {
    if (this.treeSlots.length === 0) return;
    const c = Math.max(0, Math.min(this.treeSlots.length - 1, col));
    const r = Math.max(0, Math.min(this.treeSlots[c].length - 1, row));
    this.treeFocus = { col: c, row: r };
    this.treeSlots.forEach((column, i) => column.forEach(({ slot }, j) => slot.setFocused(i === c && j === r)));
    this.treeSlots[c][r].describe();
  }

  /** Enter ou clique num nó: aprende, ou diz o que falta. */
  private learnAt(col: number, row: number): void {
    const entry = this.treeSlots[col]?.[row];
    if (!entry) return;
    const { character } = this;
    const result = learnSkill(character, entry.node.id);
    if (result) {
      this.say(result === "unknown" ? "Esse não existe mais." : this.treeHint(entry.node, result));
      return;
    }
    sfx("uiOpen");
    this.host.onPacked();
    this.show();
    this.listTree({ col, row });
    this.say(`${character.name} aprendeu ${entry.node.name}.`);
  }

  /** As teclas da árvore. Devolve se a tecla era dela. */
  private onTreeKey(event: KeyboardEvent): boolean {
    const { col, row } = this.treeFocus;
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        this.focusTree(col - 1, row);
        return true;
      case "ArrowRight":
      case "KeyD":
        this.focusTree(col + 1, row);
        return true;
      case "ArrowUp":
      case "KeyW":
        this.focusTree(col, row - 1);
        return true;
      case "ArrowDown":
      case "KeyS":
        this.focusTree(col, row + 1);
        return true;
      case "Enter":
      case "Space":
        this.later(() => this.learnAt(col, row));
        return true;
      case "Escape":
        this.later(() => this.listAbilities());
        return true;
      case "KeyU":
        this.unlearn();
        return true;
    }
    return false;
  }

  /** Tira a árvore da coluna da direita. */
  private clearTree(): void {
    for (const part of this.treeParts) part.destroy();
    this.treeParts = [];
    this.treeSlots = [];
    this.treeOpen = false;
  }

  /** `U`, na árvore e no acampamento: os pontos voltam todos, pra escolher de novo. */
  private unlearn(): void {
    const { character } = this;
    if (!this.host.campfire) {
      this.say("Só no acampamento, com tempo pra pensar.");
      return;
    }
    const forgot = unlearnSkills(character);
    if (forgot === 0) {
      this.say(`${character.name} não aprendeu nada da árvore ainda.`);
      return;
    }
    this.host.onPacked();
    this.later(() => {
      this.show();
      this.listTree();
      this.say(`${character.name} tem ${skillPoints(character)} ponto${skillPoints(character) === 1 ? "" : "s"} pra escolher de novo.`);
    });
  }

  /** O que vai ao lado do nome do nó, na lista: aprendido, ou o que falta. */
  private treeTag(node: SkillNode, refusal: SkillRefusal | undefined): string {
    if (refusal === "known") return "  ·  aprendido";
    if (refusal === "level") return `  ·  nível ${node.level}`;
    if (refusal === "mage") return `  ·  ${mageLevelName(node.mage ?? 0)}`;
    if (refusal === "previous") return "  ·  pede o anterior";
    return "";
  }

  /** A linha do fim da descrição: o que Enter faz, ou por que não faz. */
  private treeHint(node: SkillNode, refusal: SkillRefusal | undefined): string {
    const who = this.character.name;
    switch (refusal) {
      case undefined:
        return "Enter: aprender (gasta um ponto).";
      case "known":
        return `${who} já sabe.`;
      case "school":
        return "Não é da escola dele.";
      case "previous":
        return "Pede o nó de cima, no mesmo ramo.";
      case "level":
        return `Chega no nível ${node.level}.`;
      case "mage":
        return `Só no ${mageLevelName(node.mage ?? 0)}.`;
      case "points":
        return `${who} não tem ponto pra gastar: cada nível dá um.`;
    }
  }

  /** `T`: a coluna da direita vira a lista dos atributos, pra pôr os pontos que o nível deu (ver raiseAttribute). */
  private listAttributes(focus = 0): void {
    const { character } = this;
    if (attributePoints(character) < 1) {
      this.say(`${character.name} não tem ponto de atributo: cada nível dá um.`);
      return;
    }
    this.heading.setText("ATRIBUTOS");
    const options = ATTRIBUTE_KEYS.map((key): MenuOption => {
      const [name, meaning] = ATTRIBUTE_LABEL[key];
      const now = character.attributes[key];
      return {
        label: `${name}  ${now} → ${now + 1}`,
        onFocus: () =>
          this.detail.setText(
            `${name}: ${meaning}.${key === "vigor" ? " Cada ponto dá 3 de vida máxima." : ""}

Enter: pôr um ponto. Sobra${attributePoints(character) > 1 ? "m" : ""} ${attributePoints(character)}. Não se tira depois.`,
          ),
        onSelect: () => this.later(() => this.raiseAt(key, ATTRIBUTE_KEYS.indexOf(key))),
      };
    });
    this.setMenu(options, () => this.later(() => this.listAbilities()), focus);
    this.setFooter("Setas: atributo  ·  Enter: pôr um ponto  ·  Esc: voltar");
  }

  private raiseAt(key: keyof Attributes, focus: number): void {
    const { character } = this;
    if (!raiseAttribute(character, key)) return;
    sfx("uiOpen");
    this.host.onPacked();
    this.show();
    this.say(`${character.name}: ${ATTRIBUTE_LABEL[key][0]} ${character.attributes[key]}.`);
    if (attributePoints(character) > 0) this.listAttributes(focus);
  }

  /** `E`: a coluna da direita vira a dos três lugares do corpo. */
  private listSlots(focus?: EquipmentSlot): void {
    const { character } = this;
    if (!fights(character)) {
      this.say(`${character.name} acompanha sem lutar: não veste nada pra luta.`);
      return;
    }
    this.targeting = true;
    this.heading.setText("EQUIPAR");
    this.setMenu(
      [
        ...EQUIPMENT_SLOTS.map((slot) => {
          const item = wornItem(character, slot);
          const spare = storedGear(this.host.owner, slot).length;
          return {
            label: `${SLOT_LABEL[slot]}: ${item?.name ?? "—"}${spare > 0 ? `  ·  ${spare} guardada${spare > 1 ? "s" : ""}` : ""}`,
            onFocus: () =>
              this.detail.setText(
                item
                  ? `${item.description}\n\n${describeEquipment(item)}\n\nEnter: trocar ou tirar.`
                  : `Lugar vazio — ${this.bareText(slot)}.\n\n${spare > 0 ? "Enter: vestir uma das peças guardadas." : "Nada guardado serve aqui."}`,
              ),
            onSelect: () => this.later(() => this.listGear(slot)),
          };
        }),
        { label: "Voltar", onSelect: () => this.later(() => this.listAbilities()) },
      ],
      () => this.later(() => this.listAbilities()),
      focus ? EQUIPMENT_SLOTS.indexOf(focus) : undefined,
    );
    this.setFooter("Setas: lugar  ·  Enter: trocar  ·  Esc: voltar");
  }

  /** O que há guardado pra `slot`: vestir uma peça, ou tirar a que está. */
  private listGear(slot: EquipmentSlot): void {
    const wearer = this.character;
    const worn = wornItem(wearer, slot);
    // Peças iguais aparecem uma vez, com a conta.
    const stored = storedGear(this.host.owner, slot);
    const kinds = [...new Map(stored.map((item) => [item.id, item])).values()];
    const done = (text: string) => {
      // A página se redesenha (os números mudaram) e volta pros lugares, com o cursor onde estava.
      this.later(() => {
        this.show();
        this.listSlots(slot);
        this.say(text);
      });
    };

    this.targeting = true;
    this.heading.setText(`EQUIPAR  ·  ${SLOT_LABEL[slot].toUpperCase()}`);
    this.setMenu(
      [
        ...kinds.map((item) => {
          const refusal = equipRefusal(wearer, item);
          const count = stored.filter((other) => other.id === item.id).length;
          return {
            label: `${item.name}${count > 1 ? `  x${count}` : ""}${refusal ? "  ·  não é arma dele" : ""}`,
            onFocus: () =>
              this.detail.setText(
                `${item.description}\n\n${describeEquipment(item)}\n\n${
                  refusal ? EQUIP_REFUSAL[refusal] : worn ? `Enter: vestir no lugar de ${worn.name}.` : "Enter: vestir."
                }`,
              ),
            onSelect: () => {
              const result = this.host.onEquip(wearer, item.id);
              if (!result.ok) this.say(EQUIP_REFUSAL[result.reason]);
              else done(`${wearer.name} veste ${item.name}.${result.replaced ? ` ${result.replaced.name} volta pro guardado.` : ""}`);
            },
          };
        }),
        ...(worn
          ? [
              {
                label: `Tirar ${worn.name}`,
                onFocus: () => this.detail.setText(`${worn.name} volta pro guardado. O lugar fica vazio — ${this.bareText(slot)}.`),
                onSelect: () => {
                  this.host.onUnequip(wearer, slot);
                  done(`${wearer.name} guarda ${worn.name}.`);
                },
              },
            ]
          : []),
        { label: "Voltar", onSelect: () => this.later(() => this.listSlots(slot)) },
      ],
      () => this.later(() => this.listSlots(slot)),
    );
    if (kinds.length === 0 && !worn) this.detail.setText("Nada guardado serve aqui.");
    this.setFooter("Setas: peça  ·  Enter: vestir  ·  Esc: voltar");
  }

  private use(ability: Ability): void {
    const use = fights(this.character) ? fieldUse(ability) : undefined;
    if (use !== undefined && !canAfford(this.character, ability)) this.say(this.usage(ability).text);
    else if (use === "mend") this.later(() => this.chooseTarget(ability));
    else if (use === "opening" && this.index === 0) {
      if (!this.host.onOpening(ability)) this.say("Ninguém ao alcance que ainda não tenha te percebido.");
    } else this.say(this.usage(ability).text);
  }

  /** A grade vira a lista do grupo: em quem a cura vai. */
  private chooseTarget(ability: Ability): void {
    const caster = this.character;
    const targets = ability.targets === "self" ? [caster] : this.host.members.filter(fights);
    this.targeting = true;
    this.setFooter("Setas: em quem  ·  Enter: usar  ·  Esc: voltar");
    this.setMenu(
      [
        ...targets.map((target) => ({
          label: `${target.name}  ${target.currentHp}/${target.maxHp}`,
          disabled: target.currentHp >= target.maxHp,
          onSelect: () => {
            const healed = this.host.onMend(caster, ability, target);
            this.later(() => {
              this.show();
              this.say(healed === undefined ? `${target.name} não precisa.` : `${target.name} recupera ${healed} de vida.`);
            });
          },
        })),
        { label: "Voltar", onSelect: () => this.later(() => this.listAbilities()) },
      ],
      () => this.later(() => this.listAbilities()),
    );
    this.detail.setText(`${ability.name}: em quem?`);
  }

  private say(text: string): void {
    this.notice.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.notice);
    this.scene.tweens.add({ targets: this.notice, alpha: 0, delay: 2200, duration: 500 });
  }

  /** `X`: leva a habilidade em foco pra luta, ou a deixa de fora. */
  private toggleFocused(ability: Ability): void {
    if (!toggleBenched(this.character, ability.id)) {
      this.say("Ninguém entra numa luta sem poder bater.");
      return;
    }
    const focus = this.grid.focusIndex;
    this.host.onPacked();
    this.listAbilities(focus);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (this.treeOpen && !isAction(event, "sheet") && !isAction(event, "bag") && this.onTreeKey(event)) return;
    if (isAction(event, "sheet")) this.host.onClose();
    else if (isAction(event, "bag")) this.host.onBag();
    else if (isAction(event, "interact") && !this.targeting) this.listSlots();
    else if (event.code === "KeyR" && !this.targeting) this.listTree();
    else if (event.code === "KeyT" && !this.targeting) this.listAttributes();
    else if (event.code === "KeyX" && !this.targeting && this.focusedAbility) this.toggleFocused(this.focusedAbility);
    else if (event.code === "Tab" && !this.targeting && this.host.members.length > 1) {
      event.preventDefault();
      this.index = (this.index + 1) % this.host.members.length;
      this.show();
    }
  }
}
