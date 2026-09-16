import type { Character } from "@ealen/shared";

/**
 * Persistência do personagem convidado: só neste navegador, via
 * localStorage. Não é "salvar o jogo" de verdade — é o que permite o
 * modo convidado sobreviver a um F5 sem exigir conta.
 */
const GUEST_ACTIVE_KEY = "ealen:guestActive";
const GUEST_CHARACTER_KEY = "ealen:guestCharacter";

export function isGuestActive(): boolean {
  return localStorage.getItem(GUEST_ACTIVE_KEY) === "true";
}

export function activateGuestMode(): void {
  localStorage.setItem(GUEST_ACTIVE_KEY, "true");
}

export function loadGuestCharacter(): Character | null {
  const raw = localStorage.getItem(GUEST_CHARACTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

export function saveGuestCharacter(character: Character): void {
  localStorage.setItem(GUEST_CHARACTER_KEY, JSON.stringify(character));
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_ACTIVE_KEY);
  localStorage.removeItem(GUEST_CHARACTER_KEY);
}

export function generateGuestCharacterId(): string {
  return `guest-${crypto.randomUUID()}`;
}
