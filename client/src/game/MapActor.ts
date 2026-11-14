import * as Phaser from "phaser";
import type { PixelPos } from "@jogo/shared";
import { COLORS } from "./config";
import { drySpriteKey, fidgetAnimKeys, idleAnimKey, standingFrame, walkAnimKey, type Facing } from "./mapSprites";

/** A barra de vida fica por cima de tudo: não pode sumir atrás de uma árvore. */
const HP_BAR_DEPTH = 2_000_000;
const HP_BAR_WIDTH = 14;
/** Quanto o pedaço de vida recém-perdido fica aceso antes de escorrer. */
const HP_TRAIL_DELAY_MS = 250;
const HP_TRAIL_MS = 300;
/** Quanto do corpo fica abaixo da linha d'água quando submerso. */
const SUBMERGED_SHARE = 0.5;
const WATER_COLOR = 0x9fd8e8;
/** O sangue da marca: de quanto em quanto tempo pinga, e a que altura da cabeça fica o nariz (em pixels da folha). */
const DRIP_EVERY_MS = 1100;
const NOSE_FROM_TOP = 9;
const BLOOD_COLOR = 0xa8202a;
/** Quanto a caminhada ainda toca depois de parar: quem hesita um instante (o companheiro na fila) não fica piscando. */
const WALK_SETTLE_MS = 90;
/** De quanto em quanto tempo quem está parado faz um gesto. */
const FIDGET_MIN_MS = 7000;
const FIDGET_MAX_MS = 15000;
/** Na luta, o fôlego é mais curto. */
const ALERT_PACE = 1.5;

/** Onde o corpo está em relação à água: só o bicho de rio muda disso. */
export type Immersion = "none" | "submerged" | "beached";

/**
 * Alguém de pé no mapa: o sprite, a sombra e (em combate) a barra de vida
 * e o anel de "é a vez dele".
 * A posição é a dos PÉS, e é ela que decide quem desenha na frente de quem
 * — a mesma ordenação por Y das camadas "de pé" do mapa.
 *
 * O tamanho vem do quadro da folha: quem é maior que o quadrado (o Ykuruã)
 * ganha sombra, anel e barra do tamanho dele.
 */
export class MapActor {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly turnRing: Phaser.GameObjects.Ellipse;
  /** A água em volta de quem está submerso: o que se vê do resto do corpo. */
  private readonly ripple: Phaser.GameObjects.Ellipse;
  /** A gota de sangue que pinga do nariz de quem carrega a marca da mana. */
  private readonly drop: Phaser.GameObjects.Graphics;
  private readonly barWidth: number;
  /** Fração da vida na barra, e o rastro (o que ela era antes do último golpe). */
  private hp?: { ratio: number; trail: number };
  private hpTween?: Phaser.Tweens.Tween;
  private facing: Facing = "down";
  private feet: PixelPos;
  /** A folha em uso: a do personagem, ou a seca dele. */
  private sheet: string;
  private immersion: Immersion = "none";
  /** Quantos pixels do corpo ficam abaixo dos pés (o que a água esconde). */
  private sink = 0;
  private bleeding?: Phaser.Time.TimerEvent;
  private walking = false;
  /** A caminhada acabou, e ela ainda toca até este tempo passar. */
  private settling?: Phaser.Time.TimerEvent;
  /** O próximo gesto de quem está parado. */
  private fidget?: Phaser.Time.TimerEvent;
  /** Cada um respira no seu ritmo, pra multidão não subir e descer junta. */
  private readonly pace = Phaser.Math.FloatBetween(0.88, 1.12);
  /** Em luta: fôlego curto e nenhum gesto, que ninguém olha em volta com uma espada na frente. */
  private alert = false;
  private crouched = false;
  private fallen = false;
  private downTween?: Phaser.Tweens.Tween;

  /**
   * `scale`: quanto a folha encolhe pra caber no quadrado do mapa (ver
   * sheetScale em ./mapSprites.ts) — a arte final é mais densa que o mapa.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spriteKey: string,
    pos: PixelPos,
    private readonly scale = 1,
  ) {
    this.sheet = spriteKey;
    this.sprite = scene.add.sprite(0, 0, spriteKey, standingFrame(this.facing)).setOrigin(0.5, 1).setScale(scale);
    const width = this.sprite.displayWidth;
    this.barWidth = Math.max(HP_BAR_WIDTH, Math.round(width * 0.5));
    this.shadow = scene.add.ellipse(0, 0, Math.max(12, width * 0.75), Math.max(5, width * 0.2), 0x000000, 0.3);
    this.turnRing = scene.add.ellipse(0, 0, Math.max(16, width * 0.8), Math.max(7, width * 0.25)).setVisible(false);
    scene.tweens.add({ targets: this.turnRing, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    this.ripple = scene.add.ellipse(0, 0, width * 0.95, 7).setStrokeStyle(1, WATER_COLOR, 0.8).setVisible(false);
    scene.tweens.add({ targets: this.ripple, scaleX: { from: 0.92, to: 1.06 }, alpha: { from: 0.9, to: 0.5 }, duration: 900, yoyo: true, repeat: -1 });
    this.drop = scene.add.graphics().fillStyle(BLOOD_COLOR, 1).fillRect(0, 0, 1, 2).setVisible(false);
    this.hpBar = scene.add.graphics().setDepth(HP_BAR_DEPTH);
    this.feet = { ...pos };
    this.place(pos);
    // Gesto acabado volta a respirar. Só o que não é laço chega ao fim.
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.idle());
    this.idle();
  }

  /** Tudo que este ator pôs na cena (pra câmera da interface ignorar). */
  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.shadow, this.turnRing, this.ripple, this.sprite, this.drop, this.hpBar];
  }

  /** A folha de sprite: é dela que sai o rosto de quem não tem retrato. */
  get sheetKey(): string {
    return this.spriteKey;
  }

  get pos(): PixelPos {
    return { ...this.feet };
  }

  /** Onde fica a cabeça — de onde sobem os números de dano. Submerso, é o alto do que está fora da água. */
  get top(): PixelPos {
    return { x: this.feet.x, y: this.feet.y - (this.sprite.displayHeight - this.sink) };
  }

  /** O que a câmera segue. */
  get followTarget(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  place(pos: PixelPos): void {
    this.feet = { ...pos };
    this.sprite.setPosition(pos.x, pos.y + this.sink).setDepth(pos.y);
    this.shadow.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.5);
    this.turnRing.setPosition(pos.x, pos.y - 1).setDepth(pos.y - 0.4);
    // A água fica na frente do corpo: é a linha que o corta.
    this.ripple.setPosition(pos.x, pos.y).setDepth(pos.y + 0.1);
    this.hpBar.setPosition(pos.x, this.top.y - 4);
  }

  face(facing: Facing): void {
    if (facing === this.facing) return;
    this.facing = facing;
    this.idle();
  }

  /** Vira pra um ponto do mapa. No empate entre os eixos, prefere o horizontal. */
  faceToward(target: PixelPos): void {
    const dx = target.x - this.feet.x;
    const dy = target.y - this.feet.y;
    if (dx === 0 && dy === 0) return;
    this.face(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  /** Agachado, esgueirando (ver shared/world/stealth.ts): mais baixo e mais apagado. */
  setSneaking(sneaking: boolean): void {
    this.crouched = sneaking;
    this.sprite.setAlpha(sneaking ? 0.6 : 1).setScale(this.scale, this.scale * (sneaking ? 0.88 : 1));
  }

  setWalking(walking: boolean): void {
    if (walking) {
      this.settling?.remove();
      this.settling = undefined;
      this.fidget?.remove();
      this.walking = true;
      this.sprite.anims.play({ key: walkAnimKey(this.sheet, this.facing), timeScale: 1 }, true);
    } else if (this.walking && !this.settling) {
      this.settling = this.scene.time.delayedCall(WALK_SETTLE_MS, () => {
        this.settling = undefined;
        this.walking = false;
        this.idle();
      });
    }
  }

  /** Em luta (ou fora dela): ver `alert`. */
  setAlert(alert: boolean): void {
    if (alert === this.alert) return;
    this.alert = alert;
    this.idle();
  }

  /** De pé e respirando, olhando pra onde olha. Cada um entra num ponto qualquer do laço. */
  private idle(): void {
    if (this.walking || this.fallen) return;
    this.fidget?.remove();
    const key = idleAnimKey(this.sheet, this.facing);
    if (!this.scene.anims.exists(key)) {
      this.sprite.anims.stop();
      this.sprite.setFrame(standingFrame(this.facing));
      return;
    }
    const timeScale = this.pace * (this.alert ? ALERT_PACE : 1);
    this.sprite.anims.play({ key, timeScale, startFrame: Phaser.Math.Between(0, 3) });
    this.fidget = this.scene.time.delayedCall(Phaser.Math.Between(FIDGET_MIN_MS, FIDGET_MAX_MS), () => this.playFidget());
  }

  private playFidget(): void {
    const fidgets = fidgetAnimKeys(this.sheet, this.facing).filter((key) => this.scene.anims.exists(key));
    if (this.alert || this.crouched || fidgets.length === 0) {
      this.idle();
      return;
    }
    this.sprite.anims.play({ key: Phaser.Utils.Array.GetRandom(fidgets), timeScale: 1 });
  }

  /**
   * Põe o corpo na água ou fora dela. Submerso, metade dele some abaixo da
   * linha d'água (a ondulação marca onde ela corta) e não há sombra; em seco,
   * a folha troca pela seca, de couro rachado, quando existe.
   */
  setImmersion(immersion: Immersion): void {
    if (immersion === this.immersion) return;
    this.immersion = immersion;

    const dry = drySpriteKey(this.spriteKey);
    const sheet = immersion === "beached" && this.scene.textures.exists(dry) ? dry : this.spriteKey;
    if (sheet !== this.sheet) {
      this.sheet = sheet;
      this.sprite.setTexture(sheet, standingFrame(this.facing));
      if (this.walking) this.sprite.anims.play({ key: walkAnimKey(sheet, this.facing), timeScale: 1 });
      else this.idle();
    }

    // O corte é no quadro da folha; o que afunda, em pixels do mapa.
    const { width, height } = this.sprite;
    const sunk = immersion === "submerged" ? Math.round(height * SUBMERGED_SHARE) : 0;
    this.sink = sunk * this.scale;
    if (sunk > 0) this.sprite.setCrop(0, 0, width, height - sunk);
    else this.sprite.setCrop();
    this.shadow.setVisible(this.sink === 0);
    this.ripple.setVisible(this.sink > 0);
    this.place(this.feet);
  }

  /** Liga (ou desliga) o sangue pingando do nariz: a marca da mana gasta de uma vez. */
  /** Escondido (na luta): o corpo fica meio apagado, pra quem joga saber que de longe ninguém o mira. */
  setHidden(hidden: boolean): void {
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: hidden ? 0.45 : 1, duration: 220 });
  }

  /**
   * Caído (na luta): o corpo deita pro lado em que olha, girando nos pés, e levanta quando a condição sai. A folha não
   * tem pose de chão; o giro basta pra quem joga ver de longe quem está no chão.
   */
  setDown(down: boolean): void {
    if (this.fallen) return;
    const side = this.facing === "left" ? -1 : 1;
    this.downTween?.stop();
    this.downTween = this.scene.tweens.add({ targets: this.sprite, angle: down ? 78 * side : 0, duration: down ? 180 : 260, ease: down ? "Cubic.easeIn" : "Back.easeOut" });
  }

  setBleeding(bleeding: boolean): void {
    if (!bleeding) {
      this.bleeding?.remove();
      this.bleeding = undefined;
      return;
    }
    if (this.bleeding) return;
    this.drip();
    this.bleeding = this.scene.time.addEvent({ delay: DRIP_EVERY_MS, loop: true, callback: () => this.drip() });
  }

  private drip(): void {
    // De costas, o nariz não aparece.
    if (this.facing === "up" || !this.sprite.visible) return;
    const side = (this.facing === "left" ? -6 : this.facing === "right" ? 6 : 0) * this.scale;
    const at = { x: this.feet.x + side, y: this.top.y + NOSE_FROM_TOP * this.scale };
    this.scene.tweens.killTweensOf(this.drop);
    this.drop.setPosition(at.x, at.y).setDepth(this.feet.y + 0.2).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: this.drop,
      y: at.y + 6,
      alpha: 0,
      duration: 650,
      ease: "Quad.easeIn",
      onComplete: () => this.drop.setVisible(false),
    });
  }

  /**
   * Mostra a barra de vida com este valor. Vida perdida não some na hora:
   * o pedaço fica aceso um instante e escorre — dá pra ver o tamanho do golpe.
   */
  setHp(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    const hp = (this.hp = { ratio, trail: Math.max(ratio, this.hp?.trail ?? ratio) });
    this.hpTween?.stop();
    this.hpTween = undefined;
    this.drawHp();

    if (hp.trail > ratio) {
      this.hpTween = this.scene.tweens.add({
        targets: hp,
        trail: ratio,
        delay: HP_TRAIL_DELAY_MS,
        duration: HP_TRAIL_MS,
        onUpdate: () => this.drawHp(),
      });
    }
  }

  private drawHp(): void {
    const { hp, barWidth } = this;
    this.hpBar.clear();
    if (!hp) return;

    this.hpBar.fillStyle(0x000000, 0.8);
    this.hpBar.fillRect(-barWidth / 2 - 1, -1, barWidth + 2, 4);
    this.hpBar.fillStyle(0xffffff, 0.9);
    this.hpBar.fillRect(-barWidth / 2, 0, Math.ceil(barWidth * hp.trail), 2);
    this.hpBar.fillStyle(hp.ratio > 0.3 ? COLORS.hp : COLORS.hpLow, 1);
    this.hpBar.fillRect(-barWidth / 2, 0, Math.ceil(barWidth * hp.ratio), 2);
  }

  hideHp(): void {
    this.hpTween?.stop();
    this.hpTween = undefined;
    this.hp = undefined;
    this.hpBar.clear();
  }

  /** Acende (ou apaga) o anel no chão de quem está na vez. */
  setTurn(active: boolean, color = 0xffffff): void {
    this.turnRing.setVisible(active).setStrokeStyle(1, color, 0.9);
  }

  /** Clarão breve no sprite (levou dano, foi curado...). */
  flash(color: number, duration = 110): void {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(duration, () => this.sprite.clearTint());
  }

  /**
   * Cai. Com `side` (1 pra direita, -1 pra esquerda), tomba pro lado, girando
   * nos pés, e se apaga; sem ele (0, o bicho na água), clareia, achata contra o
   * chão e some, como quem afunda.
   */
  collapse(duration: number, side = 0): Promise<void> {
    this.fallen = true;
    this.walking = false;
    this.settling?.remove();
    this.settling = undefined;
    this.fidget?.remove();
    this.sprite.anims.stop();
    this.hideHp();
    this.setTurn(false);
    this.setBleeding(false);
    this.scene.tweens.killTweensOf(this.ripple);
    this.scene.tweens.add({ targets: [this.shadow, this.ripple], alpha: 0, duration });
    if (side !== 0) {
      this.downTween?.stop();
      this.sprite.setTint(0xd8c8c8);
      return new Promise((resolve) => {
        this.scene.tweens.add({
          targets: this.sprite,
          angle: 84 * side,
          duration: duration * 0.45,
          ease: "Quad.easeIn",
          onComplete: () =>
            this.scene.tweens.add({
              targets: this.sprite,
              alpha: 0,
              delay: duration * 0.25,
              duration: duration * 0.3,
              onComplete: () => resolve(),
            }),
        });
      });
    }
    this.sprite.setTintFill(0xffffff);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: this.scale * 1.35,
        scaleY: this.scale * 0.2,
        duration,
        ease: "Cubic.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  /** Desfaz `collapse`: quem caiu numa luta vencida está de pé de novo. */
  rise(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.shadow]);
    this.sprite.clearTint().setAlpha(1).setScale(this.scale).setAngle(0);
    this.shadow.setAlpha(1);
    this.fallen = false;
    this.idle();
  }

  destroy(): void {
    this.hpTween?.stop();
    this.bleeding?.remove();
    this.settling?.remove();
    this.fidget?.remove();
    this.scene.tweens.killTweensOf([this.turnRing, this.sprite, this.shadow, this.ripple, this.drop]);
    this.sprite.destroy();
    this.shadow.destroy();
    this.turnRing.destroy();
    this.ripple.destroy();
    this.drop.destroy();
    this.hpBar.destroy();
  }
}
