import type { Race } from "@ealen/shared";

/**
 * Nomes e sobrenomes por Povo, no mesmo espírito dos personagens de exemplo
 * de shared/mock/seed.ts (ex: "Faelan Orwen", "Mira Duskveil"). Só pra
 * alimentar o botão de aleatorização da criação de personagem — não tem
 * peso narrativo além disso.
 */
const FIRST_NAMES: Record<Race, string[]> = {
  althirim: ["Faelan", "Ithren", "Solace", "Maren", "Cael", "Elowen", "Thariel", "Nyra"],
  miraven: ["Mira", "Selwyn", "Vaelis", "Coralie", "Isendra", "Tovin", "Lyra", "Esmen"],
  taharim: ["Toran", "Brakka", "Gorim", "Hadrasa", "Kael", "Vorna", "Dresk", "Amira"],
  kelbar: ["Ashen", "Ysolde", "Ravik", "Sable", "Nissa", "Corvane", "Thessa", "Umbrel"],
};

const SURNAMES: Record<Race, string[]> = {
  althirim: ["Orwen", "Windvale", "Solmere", "Quietfall", "Amberlin", "Highreach"],
  miraven: ["Duskveil", "Tidecaller", "Moonwell", "Saltdeep", "Greywater", "Farshore"],
  taharim: ["Ashgrave", "Ironhearth", "Stonefist", "Brandforge", "Emberkin", "Deephammer"],
  kelbar: ["Nightshade", "Fadewalker", "Grimlow", "Hollowmere", "Duskthorn", "Veilborn"],
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Gera "Nome Sobrenome" coerente com o Povo escolhido. */
export function randomCharacterName(race: Race): string {
  return `${pick(FIRST_NAMES[race])} ${pick(SURNAMES[race])}`;
}
