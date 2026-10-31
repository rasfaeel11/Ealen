import { GAME_WIDTH, widthForWindow } from "./config";
import { STORAGE_PREFIX } from "./storage";

const RESUME_KEY = `${STORAGE_PREFIX}retomar`;
const SETTLE_MS = 400;
/** Em luta ou conversa, a troca espera: de tanto em tanto, olha de novo. */
const RETRY_MS = 1000;

let playing: { slot: number; calm: () => boolean } | null = null;

/** A cena do mundo diz qual partida está aberta e quando dá pra recarregar sem perder nada. */
export function setPlaying(slot: number | null, calm: () => boolean = () => true): void {
  playing = slot === null ? null : { slot, calm };
}

/** O espaço a retomar depois de uma recarga pedida aqui, uma vez só. */
export function takeResumeSlot(): number | null {
  try {
    const slot = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return slot === null ? null : Number(slot);
  } catch {
    return null;
  }
}

/**
 * A largura interna do jogo é decidida ao abrir, e a interface inteira é
 * medida por ela. Se a janela muda de formato (F11, arrastar a borda), a
 * página recarrega com a largura nova, pra não voltarem as barras pretas: no
 * meio de uma luta ou de uma conversa, espera acabar. A cena do mundo grava ao
 * sair da página, e o título retoma de onde parou.
 */
export function watchWindowShape(): void {
  let timer: number | undefined;
  const check = () => {
    if (widthForWindow(window.innerWidth, window.innerHeight) === GAME_WIDTH) return;
    if (playing && !playing.calm()) {
      timer = window.setTimeout(check, RETRY_MS);
      return;
    }
    try {
      if (playing) sessionStorage.setItem(RESUME_KEY, `${playing.slot}`);
    } catch {
      // Sem onde guardar, a recarga cai no título: o jogo já está gravado.
    }
    window.location.reload();
  };
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(check, SETTLE_MS);
  });
}
