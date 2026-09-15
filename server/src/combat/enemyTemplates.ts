import type { Character } from "@ealen/shared";

/**
 * Inimigos mockados em memória, indexados pelo `encounterId` referenciado
 * em MapNode. Reaproveitam o shape de Character por simplicidade — quando
 * o bestiário crescer, isso pode virar um tipo Enemy próprio.
 */
export const ENEMY_TEMPLATES: Record<string, Character> = {
  "encounter-lobo-cinzento": {
    id: "enemy-lobo-cinzento",
    name: "Lobo Cinzento",
    race: "kelbar",
    characterClass: "guardiao",
    level: 4,
    xp: 0,
    attributes: { dain: 6, eir: 1, nath: 5, il: 5, or: 4, len: 1, ul: 1 },
    currentHp: 30,
    maxHp: 30,
    currentNodeId: "node-clareira-do-eco",
  },
};
