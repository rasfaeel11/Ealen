/**
 * O prefixo de tudo que o jogo guarda no localStorage deste dispositivo: os
 * espaços de save, o último jogado e o volume.
 */
export const STORAGE_PREFIX = "jogo:";

/** O prefixo de antes, do Eälen: o que estiver guardado com ele muda de casa (ver adoptOldKeys). */
const OLD_PREFIX = "ealen:";

/** As chaves do formato de save da versão 1, que save.ts junta e apaga sozinho: estas ficam onde estão. */
const LEFT_TO_SAVE = new Set(["save", "location", "defeated", "broken", "story"]);

let adopted = false;

/**
 * Passa pro prefixo de agora o que o jogo guardou com o de antes (os espaços,
 * o último jogado, o volume) e apaga a chave velha. Não sobrescreve o que já
 * existe no prefixo novo. Uma vez por sessão; sem armazenamento, não faz nada.
 */
export function adoptOldKeys(): void {
  if (adopted) return;
  adopted = true;
  try {
    const old: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(OLD_PREFIX) && !LEFT_TO_SAVE.has(key.slice(OLD_PREFIX.length))) old.push(key);
    }
    for (const key of old) {
      const name = STORAGE_PREFIX + key.slice(OLD_PREFIX.length);
      const value = localStorage.getItem(key);
      if (value !== null && localStorage.getItem(name) === null) localStorage.setItem(name, value);
      localStorage.removeItem(key);
    }
  } catch {
    // Armazenamento cheio ou bloqueado: tenta de novo na próxima vez que o jogo abrir.
    adopted = false;
  }
}
