import * as Phaser from "phaser";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  RACE_INFO,
  STATUSES,
  STYLES,
  breathOf,
  canAfford,
  castOf,
  fieldUse,
  fights,
  maxBreath,
  sheetAbilities,
  styleLabel,
  xpToNextLevel,
  type Ability,
  type Attributes,
  type Character,
  type StatusId,
} from "@ealen/shared";
import { describeAbility } from "./combat/CombatController";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { classSpriteKey, standingFrame, walkAnimKey } from "./mapSprites";
import { Menu, addBodyText, addPanel, addTitleText, type MenuOption } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const WIDTH = 1040;
const HEIGHT = 610;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TOP = Y + 92;
/** As três colunas: quem é, os atributos, o que sabe fazer. */
const WHO_X = X + 36;
const PORTRAIT = 190;
const STATS_X = X + 290;
const STATS_WIDTH = 230;
const SKILLS_X = X + 580;
const SKILLS_WIDTH = WIDTH - (SKILLS_X - X) - 36;
const SKILL_LINE = 32;
/** A tecla que abriu a ficha não pode ser a mesma que a fecha. */
const INPUT_GRACE_MS = 200;

/** O que cada runa governa, em uma palavra (ver a tabela de atributos no AGENTS.md). */
const ATTRIBUTE_LABEL: Record<keyof Attributes, [string, string]> = {
  dain: ["Dain", "Força"],
  eir: ["Eir", "Ressonância"],
  nath: ["Nath", "Vitalidade"],
  il: ["Il", "Percepção"],
  or: ["Or", "Densidade"],
  len: ["Len", "Voz"],
  ul: ["Ul", "Mistério"],
};

/** O que cada traço de estilo faz, em uma linha. */
const TRAIT_TEXT: Record<keyof typeof STYLES, string> = {
  mare: "cada golpe seguido no mesmo alvo soma no dano do próximo",
  vies: "dobra o dano em quem repete a ação do turno anterior",
  baluarte: "tira um tanto fixo de cada golpe que recebe",
};

export interface SheetHost {
  /** As fichas a mostrar: a protagonista primeiro, depois quem anda com ela. */
  members: Character[];
  /** As condições que a história pôs em cada um e que duram entre lutas, pelo id da ficha. */
  afflictions: Record<string, StatusId[]>;
  /** `caster` cura `target` com `ability`, agora. Devolve quanto curou; undefined se não curou nada. */
  onMend: (caster: Character, ability: Ability, target: Character) => number | undefined;
  /** A protagonista quer abrir uma luta com `ability`. Falso se não há em quem: a ficha continua aberta. */
  onOpening: (ability: Ability) => boolean;
  onBag: () => void;
  onClose: () => void;
}

/**
 * A ficha de quem está no grupo, aberta por cima do mundo parado: o retrato
 * (o mesmo boneco do mapa, ampliado e andando no lugar), quem é, os
 * atributos, o estilo, as condições que carrega e o que sabe fazer.
 *
 * É daqui que se usa uma habilidade FORA de luta: uma cura, em alguém do
 * grupo; um golpe, pra abrir uma luta (ver shared/world/field.ts). A regra é
 * de lá — a ficha só mostra e pergunta.
 *
 * ←/→ (ou A/D) trocam de personagem; ↑/↓ escolhem a habilidade; Enter usa;
 * I vai pra mochila; Esc ou C fecham.
 */
export class SheetPanel {
  private readonly frame: Phaser.GameObjects.GameObject[] = [];
  private page: Phaser.GameObjects.GameObject[] = [];
  private menu?: Menu;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly notice: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private index = 0;
  /** Escolhendo em quem usar uma cura: a lista de habilidades virou a lista do grupo. */
  private targeting = false;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly host: SheetHost,
  ) {
    this.frame.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
      addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 46, "FICHA", { fontSize: "32px" }).setOrigin(0.5)),
      addHud(addPanel(scene, WHO_X, TOP, PORTRAIT, PORTRAIT, true)),
      addHud(addTitleText(scene, STATS_X, TOP, "ATRIBUTOS", { fontSize: "18px" })),
      addHud(addTitleText(scene, SKILLS_X, TOP, "HABILIDADES", { fontSize: "18px" })),
    );
    this.detail = addHud(
      addBodyText(scene, SKILLS_X, 0, "", { fontSize: "17px", lineSpacing: 4, wordWrap: { width: SKILLS_WIDTH } }),
    );
    this.notice = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 66, "", { fontSize: "18px", color: TEXT_COLORS.goldBright }).setOrigin(0.5),
    );
    this.footer = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 34, "", { fontSize: "16px", color: TEXT_COLORS.inkDim }).setOrigin(0.5),
    );
    this.frame.push(this.detail, this.notice, this.footer);

    this.openedAt = scene.time.now;
    this.show();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.menu?.destroy();
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

  /** Redesenha a página do personagem da vez. */
  private show(): void {
    for (const object of this.page) object.destroy();
    this.page = [];
    this.targeting = false;
    const { scene, character } = this;
    const cast = castOf(character);

    // O retrato: o boneco do mapa, grande, andando no lugar.
    const spriteKey = classSpriteKey(character.characterClass);
    const feet = { x: WHO_X + PORTRAIT / 2, y: TOP + PORTRAIT - 22 };
    this.add(scene.add.ellipse(feet.x, feet.y - 2, 90, 22, 0x000000, 0.35));
    const sprite = this.add(scene.add.sprite(feet.x, feet.y, spriteKey, standingFrame("down")));
    sprite.setOrigin(0.5, 1).setScale((PORTRAIT - 50) / sprite.height);
    sprite.play(walkAnimKey(spriteKey, "down"));

    const info = CLASS_INFO[character.characterClass];
    const lines = [
      `${RACE_INFO[character.race].name}  ·  ${info.name}`,
      info.role,
      `Nível ${character.level}  ·  XP ${character.xp}/${xpToNextLevel(character.level)}`,
      fights(character)
        ? `Vida ${character.currentHp}/${character.maxHp}  ·  Fôlego ${breathOf(character)}/${maxBreath(character)}`
        : "Acompanha sem lutar",
    ];
    if (cast?.style) {
      lines.push(`${styleLabel({ style: cast.style.id, grade: cast.style.grade })}  ·  ${STYLES[cast.style.id].trait}`);
    }
    let y = TOP + PORTRAIT + 14;
    y += this.add(addTitleText(scene, WHO_X, y, character.name, { fontSize: "26px" })).height + 6;
    y += this.add(addBodyText(scene, WHO_X, y, lines.join("\n"), { fontSize: "17px", lineSpacing: 5 })).height + 8;
    if (cast?.style) {
      const trait = `${STYLES[cast.style.id].trait}: ${TRAIT_TEXT[cast.style.id]}.`;
      const style = { fontSize: "15px", color: TEXT_COLORS.inkDim, wordWrap: { width: 236 } };
      y += this.add(addBodyText(scene, WHO_X, y, trait, style)).height + 8;
    }
    const afflictions = (this.host.afflictions[character.id] ?? []).map((id) => STATUSES[id].name);
    if (afflictions.length > 0) {
      this.add(addBodyText(scene, WHO_X, y, `Carrega: ${afflictions.join(", ")}`, { fontSize: "17px", color: TEXT_COLORS.danger }));
    }

    const primary = info.primaryAttributes;
    ATTRIBUTE_KEYS.forEach((key, row) => {
      const [rune, meaning] = ATTRIBUTE_LABEL[key];
      const color = primary.includes(key) ? TEXT_COLORS.goldBright : TEXT_COLORS.ink;
      const lineY = TOP + 40 + row * 34;
      this.add(addBodyText(scene, STATS_X, lineY, rune, { fontSize: "20px", color }));
      this.add(addBodyText(scene, STATS_X + 56, lineY + 3, meaning, { fontSize: "16px", color: TEXT_COLORS.inkDim }));
      this.add(addBodyText(scene, STATS_X + STATS_WIDTH, lineY, String(character.attributes[key]), { fontSize: "20px", color })).setOrigin(1, 0);
    });
    this.add(
      addBodyText(scene, STATS_X, TOP + 40 + ATTRIBUTE_KEYS.length * 34 + 10, `Em dourado, o que a Ordem dela escala.\n\n"${info.creed}"`, {
        fontSize: "15px",
        fontStyle: "italic",
        color: TEXT_COLORS.inkDim,
        wordWrap: { width: STATS_WIDTH },
      }),
    );

    this.listAbilities();
    const many = this.host.members.length > 1;
    this.footer.setText(`${many ? "←/→: trocar de personagem  ·  " : ""}↑/↓: habilidade  ·  Enter: usar  ·  I: mochila  ·  Esc: fechar`);
  }

  private setMenu(options: MenuOption[], onCancel: () => void): void {
    this.menu?.destroy();
    this.detail.setY(TOP + 40 + options.length * SKILL_LINE + 14);
    this.menu = new Menu(this.scene, SKILLS_X, TOP + 40, options, {
      lineHeight: SKILL_LINE,
      fontSize: 20,
      onCancel,
      adopt: (item) => this.addHud(item),
    });
  }

  /** O que dá pra fazer com `ability` agora, fora de luta — o rótulo da lista e a linha da descrição. */
  private usage(ability: Ability): { tag: string; text: string } {
    const use = fights(this.character) ? fieldUse(ability) : undefined;
    // Fora de luta ela custa o mesmo Fôlego que dentro, e só o descanso o devolve.
    if (use !== undefined && (use === "mend" || this.index === 0) && !canAfford(this.character, ability)) {
      return {
        tag: "  ·  sem fôlego",
        text: `Falta Fôlego: custa ${ability.breath}, e ${this.character.name} tem ${breathOf(this.character)}. Descansar devolve.`,
      };
    }
    if (use === "mend") return { tag: "  ·  cura", text: "Enter: usar agora em alguém do grupo." };
    if (use === "opening" && this.index === 0) {
      return {
        tag: "  ·  abre luta",
        text: "Enter: mirar em quem ainda não te percebeu. O golpe sai antes da luta, e o grupo dele perde a primeira vez.",
      };
    }
    if (use === "opening") return { tag: "", text: `Fora de luta, quem dá o primeiro golpe é ${this.host.members[0].name}.` };
    return { tag: "", text: "Só serve dentro de uma luta." };
  }

  private listAbilities(): void {
    this.targeting = false;
    const abilities = sheetAbilities(this.character);
    this.setMenu(
      abilities.map((ability) => {
        const { tag, text } = this.usage(ability);
        return {
          label: `${ability.name}${tag}`,
          onFocus: () => this.detail.setText(`${ability.flavor}\n\n${describeAbility(ability)}\n\n${text}`),
          onSelect: () => this.use(ability),
        };
      }),
      () => this.host.onClose(),
    );
  }

  private use(ability: Ability): void {
    const use = fights(this.character) ? fieldUse(ability) : undefined;
    if (use !== undefined && !canAfford(this.character, ability)) this.say(this.usage(ability).text);
    else if (use === "mend") this.chooseTarget(ability);
    else if (use === "opening" && this.index === 0) {
      if (!this.host.onOpening(ability)) this.say("Ninguém ao alcance que ainda não tenha te percebido.");
    } else this.say(this.usage(ability).text);
  }

  /** A lista de habilidades vira a do grupo: em quem a cura vai. */
  private chooseTarget(ability: Ability): void {
    const caster = this.character;
    const targets = ability.targets === "self" ? [caster] : this.host.members.filter(fights);
    this.targeting = true;
    this.detail.setText(`${ability.name}: em quem?`);
    this.setMenu(
      [
        ...targets.map((target) => ({
          label: `${target.name}  ${target.currentHp}/${target.maxHp}`,
          disabled: target.currentHp >= target.maxHp,
          onSelect: () => {
            const healed = this.host.onMend(caster, ability, target);
            this.show();
            this.say(healed === undefined ? `${target.name} não precisa.` : `${target.name} recupera ${healed} de vida.`);
          },
        })),
        { label: "Voltar", onSelect: () => this.listAbilities() },
      ],
      () => this.listAbilities(),
    );
  }

  private say(text: string): void {
    this.notice.setText(text).setAlpha(1);
    this.scene.tweens.killTweensOf(this.notice);
    this.scene.tweens.add({ targets: this.notice, alpha: 0, delay: 2200, duration: 500 });
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "KeyC") this.host.onClose();
    else if (event.code === "KeyI") this.host.onBag();
    else if (!this.targeting && this.host.members.length > 1) {
      const step = event.code === "ArrowLeft" || event.code === "KeyA" ? -1 : event.code === "ArrowRight" || event.code === "KeyD" ? 1 : 0;
      if (step === 0) return;
      const count = this.host.members.length;
      this.index = (this.index + step + count) % count;
      this.show();
    }
  }
}
