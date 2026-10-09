import { emptyProfile, parseProfile, unlockOrder, type CharacterClass, type Profile } from "@ealen/shared";

/**
 * Onde fica o perfil do jogador (o que ele destravou, ver shared/save/profile.ts):
 * neste dispositivo, numa chave à parte dos espaços de save. Apagar uma
 * partida não mexe nele.
 */
const PROFILE_KEY = "ealen:profile";

export function readProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(PROFILE_KEY));
  } catch {
    return emptyProfile();
  }
}

/** Destrava Ordens e grava o perfil. Devolve as que eram novidade. */
export function unlockOrders(orders: readonly CharacterClass[]): CharacterClass[] {
  const profile = readProfile();
  const fresh = orders.filter((order) => unlockOrder(profile, order));
  if (fresh.length === 0) return [];
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Sem armazenamento, a Ordem vale só até a página fechar — e nem isso: não há onde guardar.
    return [];
  }
  return fresh;
}
