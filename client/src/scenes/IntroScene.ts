import * as Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES, TEXT_COLORS } from "../game/config";
import { addBodyText, addTitleText } from "../game/ui";
import { setPadMode } from "../game/gamepad";

/**
 * O MUNDO EM SEIS FRASES: o que quem começa precisa saber pra não ficar perdido,
 * antes da primeira cena. Tudo já está no cânone (AGENTS.md §2, §3.1, §5.2); nada
 * aqui explica o que a história mostra depois. Espaço, Enter ou o clique adiantam
 * a frase; Esc pula tudo.
 */
export const INTRO_LINES = [
  "Xerumbetyba ainda não é um reino.",
  "É uma colcha de ducados, senhorios e cidades livres, costurada por um rio só: o Ymonhã.",
  "Cada senhor dono de uma margem cobra de quem desce. Corrente atravessada no rio, ponte fechada.",
  "Rio abaixo, a cidade livre de Ybytuguá vive do comércio. Este ano, a cheia veio cedo.",
  "Endyru estuda em Kuatiarape e não tem dinheiro pra terminar. Desce o rio atrás de um contrato.",
  "Na cheia, ninguém conjura no rio.",
];

/** Quanto cada frase fica na tela sozinha, e quanto dura o aparecer. */
const LINE_MS = 4200;
const FADE_MS = 700;

export default class IntroScene extends Phaser.Scene {
  private index = -1;
  private lines: Phaser.GameObjects.Text[] = [];
  private timer?: Phaser.Time.TimerEvent;
  private done = false;

  constructor() {
    super(SCENES.intro);
  }

  create(): void {
    this.index = -1;
    this.lines = [];
    this.done = false;
    setPadMode("menu");
    this.cameras.main.setBackgroundColor(COLORS.panelDeep);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const top = GAME_HEIGHT / 2 - (INTRO_LINES.length * 46) / 2;
    this.lines = INTRO_LINES.map((line, i) =>
      addBodyText(this, GAME_WIDTH / 2, top + i * 46, line, {
        fontSize: "22px",
        color: i === INTRO_LINES.length - 1 ? TEXT_COLORS.goldBright : TEXT_COLORS.ink,
        align: "center",
        wordWrap: { width: GAME_WIDTH - 240 },
      })
        .setOrigin(0.5)
        .setAlpha(0),
    );
    addTitleText(this, GAME_WIDTH - 32, GAME_HEIGHT - 28, "Espaço  adianta    ·    Esc  pula", {
      fontSize: "13px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(1, 0.5);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.code === "Escape") this.finish();
      else if (["Space", "Enter", "NumpadEnter"].includes(event.code)) this.next();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.next());
    this.next();
  }

  /** A próxima frase aparece; depois da última, o jogo começa. */
  private next(): void {
    if (this.done) return;
    this.timer?.remove();
    // A que estava aparecendo termina de aparecer na hora.
    const current = this.lines[this.index];
    if (current) {
      this.tweens.killTweensOf(current);
      current.setAlpha(1);
    }
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }
    this.tweens.add({ targets: this.lines[this.index], alpha: 1, duration: FADE_MS });
    this.timer = this.time.delayedCall(LINE_MS, () => this.next());
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.timer?.remove();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.world));
  }
}
