import * as Phaser from "phaser";
import {
  STANCE_MECHANICS,
  STANCE_ORDER,
  artsFor,
  playBattleTurn,
  startBattle,
  type BattleState,
  type BattleTurnResult,
  type Character,
  type CombatAction,
} from "@ealen/shared";
import { groupCombatEvents, narrateStep, type AnimStep } from "../game/combatSteps";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, REGISTRY_CHARACTER, SCENES, TEXT_COLORS } from "../game/config";
import { writeSave } from "../game/save";
import { animKey, classSpriteKey, enemySpriteKey, spriteDisplayScale, type SpriteAnim } from "../game/sprites";
import { Menu, addBodyText, addPanel, addTitleText, type MenuOption } from "../game/ui";

const PLAYER_X = 360;
const ENEMY_X = 920;
const GROUND_Y = 440;
const LUNGE_DISTANCE = 150;

const STATUS_BOX = { width: 420, height: 96, y: 30 };
const BOTTOM_Y = 490;
const BOTTOM_HEIGHT = 200;

/** A caixa de menu comporta 7 linhas; uma delas é "Voltar". */
const MAX_ITEMS_SHOWN = 6;

interface BattlerConfig {
  name: string;
  level: number;
  spriteKey: string;
  x: number;
  /** 1 = olha pra direita (jogador); -1 = olha pra esquerda (inimigo). */
  facing: 1 | -1;
  boxX: number;
  hp: number;
  maxHp: number;
}

/** Um lado da luta na tela: o sprite animado e a caixa de status dele. */
class Battler {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly homeX: number;
  readonly facing: 1 | -1;
  private readonly spriteKey: string;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly boxX: number;
  private shownHp: number;
  private maxHp: number;

  constructor(
    private readonly scene: Phaser.Scene,
    config: BattlerConfig,
  ) {
    this.homeX = config.x;
    this.facing = config.facing;
    this.spriteKey = config.spriteKey;
    this.boxX = config.boxX;
    this.shownHp = config.hp;
    this.maxHp = config.maxHp;

    this.sprite = scene.add
      .sprite(config.x, GROUND_Y, config.spriteKey, 0)
      .setOrigin(0.5, 1)
      .setScale(spriteDisplayScale(scene, config.spriteKey))
      .setFlipX(config.facing === -1);
    this.play("idle");

    addPanel(scene, config.boxX, STATUS_BOX.y, STATUS_BOX.width, STATUS_BOX.height, true);
    addTitleText(scene, config.boxX + 20, STATUS_BOX.y + 12, config.name, { fontSize: "22px" });
    this.levelText = addBodyText(scene, config.boxX + STATUS_BOX.width - 20, STATUS_BOX.y + 14, "", {
      fontSize: "18px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(1, 0);
    this.setLevel(config.level);

    this.hpBar = scene.add.graphics();
    this.hpText = addBodyText(scene, config.boxX + 20, STATUS_BOX.y + 64, "", { fontSize: "17px" });
    this.statusText = addBodyText(scene, config.boxX + STATUS_BOX.width - 20, STATUS_BOX.y + 64, "", {
      fontSize: "17px",
      color: TEXT_COLORS.guard,
    }).setOrigin(1, 0);
    this.drawHp();
  }

  /** Toca uma animação. Ataque e dano voltam sozinhos pro idle; morte fica no último quadro. */
  play(anim: SpriteAnim): void {
    this.sprite.play(animKey(this.spriteKey, anim));
    if (anim === "attack" || anim === "hurt") this.sprite.chain(animKey(this.spriteKey, "idle"));
  }

  /** Anima a barra até `hp`. Passe `maxHp` quando ele também mudou (level up). */
  setHp(hp: number, maxHp: number = this.maxHp): void {
    this.maxHp = maxHp;
    this.scene.tweens.addCounter({
      from: this.shownHp,
      to: hp,
      duration: 450,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        this.shownHp = tween.getValue() ?? hp;
        this.drawHp();
      },
    });
  }

  setLevel(level: number): void {
    this.levelText.setText(`Nível ${level}`);
  }

  setStatus(status: string | null): void {
    this.statusText.setText(status ?? "");
  }

  private drawHp(): void {
    const x = this.boxX + 20;
    const y = STATUS_BOX.y + 46;
    const width = STATUS_BOX.width - 40;
    const ratio = Phaser.Math.Clamp(this.shownHp / this.maxHp, 0, 1);

    this.hpBar.clear();
    this.hpBar.fillStyle(COLORS.bg, 1);
    this.hpBar.fillRect(x, y, width, 12);
    this.hpBar.fillStyle(ratio < 0.3 ? COLORS.hpLow : COLORS.hp, 1);
    this.hpBar.fillRect(x, y, width * ratio, 12);
    this.hpBar.lineStyle(1, COLORS.border, 1);
    this.hpBar.strokeRect(x, y, width, 12);

    this.hpText.setText(`HP ${Math.round(this.shownHp)} / ${this.maxHp}`);
  }
}

/**
 * A cena de combate. Ela não calcula nada: pede um turno ao motor
 * (playBattleTurn, em shared/combat), recebe a lista ordenada de eventos e
 * só então anima, um passo por vez, com o menu travado até o fim.
 */
export default class BattleScene extends Phaser.Scene {
  private encounterId = "";
  private character!: Character;
  private battle!: BattleState;
  private player!: Battler;
  private enemy!: Battler;
  private message!: Phaser.GameObjects.Text;
  private menu!: Menu;

  constructor() {
    super(SCENES.battle);
  }

  init(data: { encounterId: string }): void {
    this.encounterId = data.encounterId;
  }

  create(): void {
    const character = this.registry.get(REGISTRY_CHARACTER) as Character | undefined;
    const battle = startBattle(this.encounterId);
    if (!character || !battle) {
      this.scene.start(SCENES.arena);
      return;
    }
    // Ninguém entra numa luta já caído.
    if (character.currentHp <= 0) character.currentHp = character.maxHp;

    this.character = character;
    this.battle = battle;

    this.drawArena();

    this.player = new Battler(this, {
      name: character.name,
      level: character.level,
      spriteKey: classSpriteKey(character.characterClass),
      x: PLAYER_X,
      facing: 1,
      boxX: 60,
      hp: character.currentHp,
      maxHp: character.maxHp,
    });
    this.enemy = new Battler(this, {
      name: battle.enemy.name,
      level: battle.enemy.level,
      spriteKey: enemySpriteKey(this.encounterId),
      x: ENEMY_X,
      facing: -1,
      boxX: GAME_WIDTH - 60 - STATUS_BOX.width,
      hp: battle.enemy.currentHp,
      maxHp: battle.enemy.maxHp,
    });

    addPanel(this, 40, BOTTOM_Y, 740, BOTTOM_HEIGHT);
    this.message = addBodyText(this, 64, BOTTOM_Y + 20, "", { fontSize: "22px", lineSpacing: 6, wordWrap: { width: 692 } });

    addPanel(this, 800, BOTTOM_Y, 440, BOTTOM_HEIGHT);
    this.menu = new Menu(this, 822, BOTTOM_Y + 10, this.actionOptions(), { lineHeight: 26, fontSize: 20 });

    this.say(`${battle.enemy.name} está no caminho.`);
  }

  private drawArena(): void {
    const g = this.add.graphics();

    // Chão quadriculado do códice, do pé dos combatentes pra baixo.
    g.lineStyle(1, COLORS.gold, 0.07);
    for (let y = GROUND_Y - 40; y < BOTTOM_Y; y += 20) g.lineBetween(0, y, GAME_WIDTH, y);
    for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, GROUND_Y - 40, x, BOTTOM_Y);

    // Plataformas.
    g.fillStyle(COLORS.border, 0.9);
    g.fillEllipse(PLAYER_X, GROUND_Y, 260, 40);
    g.fillEllipse(ENEMY_X, GROUND_Y, 260, 40);
  }

  // ---------------------------------------------------------------- menus

  private actionOptions(): MenuOption[] {
    const arts = artsFor(this.character.characterClass);
    const options: MenuOption[] = [];

    for (const stance of STANCE_ORDER) {
      const art = arts[stance];
      if (!art) continue; // a Ordem não tem essa Arte (ex: Guardião não cura)
      options.push({
        label: art.name,
        onSelect: () => void this.takeTurn(stance),
        onFocus: () => this.say(`${STANCE_MECHANICS[stance]}\n${art.flavor}`),
      });
    }

    const hasItems = (this.character.inventory?.slots.length ?? 0) > 0;
    options.push(
      {
        label: "Mochila",
        disabled: !hasItems,
        onSelect: () => this.menu.setOptions(this.itemOptions()),
        onFocus: () => this.say("Usar um item gasta o turno."),
      },
      {
        label: "Recuar",
        onSelect: () => this.leave(),
        onFocus: () => this.say("Abandona a luta e volta pra arena."),
      },
    );
    return options;
  }

  private itemOptions(): MenuOption[] {
    const slots = (this.character.inventory?.slots ?? []).slice(0, MAX_ITEMS_SHOWN);
    const options: MenuOption[] = slots.map((slot) => ({
      label: `${slot.item.name} ×${slot.quantity}`,
      onSelect: () => void this.takeTurn("use_item", slot.item.id),
      onFocus: () => this.say(slot.item.description),
    }));
    options.push({
      label: "Voltar",
      onSelect: () => this.menu.setOptions(this.actionOptions()),
      onFocus: () => this.say("Fecha a mochila."),
    });
    return options;
  }

  // ---------------------------------------------------------------- turno

  private async takeTurn(action: CombatAction, itemId?: string): Promise<void> {
    this.menu.setActive(false);
    this.player.setStatus(null);
    this.enemy.setStatus(null);

    // O motor resolve o turno inteiro de uma vez e já muta as fichas; daqui
    // pra frente é só reproduzir o que aconteceu, na ordem.
    const result = playBattleTurn(this.character, this.battle, action, itemId);
    const steps = groupCombatEvents(result.events, this.character.id, this.battle.enemy.id);
    const nameOf = (id: string) => (id === this.character.id ? this.character.name : this.battle.enemy.name);

    for (const step of steps) {
      const [announce, ...outcome] = narrateStep(step, nameOf);
      this.say(announce);
      if (outcome.length > 0) await this.wait(450);

      await this.animateStep(step);

      if (outcome.length > 0) this.say(outcome.join("\n"));
      await this.wait(950);
    }

    if (result.combatEnded) {
      this.showResult(result);
      return;
    }

    // setActive antes de setOptions: o foco inicial só anuncia a dica da Arte com o menu ativo.
    this.menu.setActive(true);
    this.menu.setOptions(this.actionOptions());
  }

  private battlerOf(id: string): Battler {
    return id === this.character.id ? this.player : this.enemy;
  }

  private async animateStep(step: AnimStep): Promise<void> {
    switch (step.kind) {
      case "attack": {
        const actor = this.battlerOf(step.actorId);
        const target = this.battlerOf(step.targetId);

        actor.play("attack");
        this.tweens.add({
          targets: actor.sprite,
          x: actor.homeX + actor.facing * LUNGE_DISTANCE,
          duration: 150,
          ease: "Quad.easeOut",
          yoyo: true,
        });
        this.float(actor.homeX, GROUND_Y - 290, `${step.roll} × ${step.dc}`, TEXT_COLORS.ink, 24);
        await this.wait(150);

        if (step.fumble) {
          this.float(actor.homeX, GROUND_Y - 220, "FALHA CRÍTICA", TEXT_COLORS.inkDim, 30);
          actor.sprite.setTint(0x666666);
          this.time.delayedCall(700, () => actor.sprite.clearTint());
          return;
        }
        if (!step.hit) {
          this.float(target.homeX, GROUND_Y - 220, "ERROU", TEXT_COLORS.inkDim, 30);
          this.tweens.add({ targets: target.sprite, x: target.homeX - target.facing * 30, duration: 120, yoyo: true });
          return;
        }

        if (step.critical) {
          this.cameras.main.shake(260, 0.012);
          this.cameras.main.flash(200, 232, 196, 122);
        }
        if (step.blocked) {
          this.float(target.homeX, GROUND_Y - 270, "BLOQUEIO", TEXT_COLORS.guard, 28);
        }
        if (step.damage !== undefined && step.remainingHp !== undefined) {
          target.play("hurt");
          target.sprite.setTintFill(0xffffff);
          this.time.delayedCall(90, () => target.sprite.clearTint());
          this.float(
            target.homeX,
            GROUND_Y - 220,
            `-${step.damage}`,
            step.critical ? TEXT_COLORS.goldBright : TEXT_COLORS.danger,
            step.critical ? 60 : 40,
          );
          target.setHp(step.remainingHp);
        }
        return;
      }

      case "guard": {
        const actor = this.battlerOf(step.actorId);
        actor.setStatus(step.status);
        this.pulse(actor, COLORS.guard);
        return;
      }

      case "heal": {
        const target = this.battlerOf(step.targetId);
        if (step.amount > 0) this.float(target.homeX, GROUND_Y - 220, `+${step.amount}`, TEXT_COLORS.hp, 40);
        this.pulse(target, COLORS.hp);
        target.setHp(step.remainingHp);
        return;
      }

      case "item":
        this.pulse(this.battlerOf(step.actorId), COLORS.item);
        return;

      case "death": {
        const actor = this.battlerOf(step.actorId);
        actor.play("die");
        this.tweens.add({ targets: actor.sprite, alpha: 0, duration: 700, delay: 300 });
        await this.wait(600);
        return;
      }

      case "initiative":
      case "status":
      case "victory":
        return;
    }
  }

  // ---------------------------------------------------------------- fim da luta

  private showResult(result: BattleTurnResult): void {
    // A vitória já aplicou XP, level up e loot na ficha — a caixa de status alcança.
    this.player.setLevel(this.character.level);
    this.player.setHp(this.character.currentHp, this.character.maxHp);
    this.menu.setVisible(false);

    const centerX = GAME_WIDTH / 2;
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.7);

    if (result.levelUp.leveledUp) {
      // Luz dourada se abrindo por trás do painel.
      const light = this.add.circle(centerX, GAME_HEIGHT / 2, 40, COLORS.goldBright, 0.5);
      this.tweens.add({ targets: light, scale: 22, alpha: 0, duration: 1400, ease: "Cubic.easeOut" });
    }

    addPanel(this, centerX - 280, 170, 560, 360);
    addTitleText(this, centerX, 215, result.playerWon ? "VITÓRIA" : "DERROTA", {
      fontSize: "48px",
      color: result.playerWon ? TEXT_COLORS.goldBright : TEXT_COLORS.danger,
    }).setOrigin(0.5);

    const lines: string[] = [];
    if (result.playerWon) {
      lines.push(`+${result.xpGained} de XP`);
      if (result.levelUp.leveledUp) lines.push(`Subiu para o nível ${result.levelUp.newLevel}!`);
      if (result.levelUp.newAbility) lines.push(`Nova habilidade: ${result.levelUp.newAbility.name}`);
      lines.push(result.loot.length > 0 ? `Encontrou: ${result.loot.map((item) => item.name).join(", ")}` : "Nada ficou pra trás.");
    } else {
      lines.push(`${this.character.name} cai.`, "Você desperta inteiro, de volta ao começo.");
    }
    addBodyText(this, centerX, 270, lines.join("\n"), {
      fontSize: "22px",
      align: "center",
      lineSpacing: 8,
      wordWrap: { width: 500 },
    }).setOrigin(0.5, 0);

    new Menu(this, centerX - 70, 470, [
      {
        label: "Continuar",
        onSelect: () => {
          if (!result.playerWon) this.character.currentHp = this.character.maxHp;
          this.leave();
        },
      },
    ]);
  }

  private leave(): void {
    writeSave(this.character);
    this.scene.start(SCENES.arena);
  }

  // ---------------------------------------------------------------- efeitos

  private say(text: string): void {
    this.message.setText(text);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /** Número/palavra que sobe e some acima de um combatente. */
  private float(x: number, y: number, text: string, color: string, size: number): void {
    const label = addTitleText(this, x, y, text, {
      fontSize: `${size}px`,
      color,
      stroke: "#141110",
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 70,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  /** Brilho colorido breve no sprite (guarda, cura, item). */
  private pulse(battler: Battler, color: number): void {
    battler.sprite.setTint(color);
    this.time.delayedCall(450, () => battler.sprite.clearTint());
  }
}
