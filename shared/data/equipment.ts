import type { EquipmentItem } from "../types/inventory";

/**
 * O equipamento: armas, armaduras e acessórios. O que cada lugar
 * faz está em `EquipmentData` (../types/inventory.ts); as regras de vestir,
 * em ../equipment.ts.
 *
 * Como os consumíveis, nada aqui é "espada +1": a descrição diz o que a
 * coisa É, os números dizem o que ela faz. TUDO PROVISÓRIO. As do trio (a
 * espada reta, a espada pesada, o bordão, o gibão de couro) são de ferro-cru,
 * o primeiro nível do cânone (`magia` §7.4), e a espada de cada um é a arma
 * preferida da escola dele; as temperadas são do ferreiro de Ybytuguá. O
 * resto é o que a gente do rio e de Ymboripe veste. Acessório o jogo ainda
 * não tem nenhum: o lugar existe, e os testes o exercitam com peças deles.
 *
 * Régua: o dado de quem luta sem nada na mão é 1d6. Arma leve acerta mais
 * (d6, +1), arma pesada fere mais e acerta menos (d10, -1). Armadura vai de
 * +1 (pano) a +3 (placa, que pesa: -1 de movimento).
 */
export const EQUIPMENT: EquipmentItem[] = [
  // --- O do trio -------------------------------------------------------------
  {
    id: "gear-espada-reta",
    name: "Espada Reta",
    description: "Lâmina reta de dois gumes, de ferro-cru. É a arma da Espera: espera o golpe do outro e corta na volta.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 1, classes: ["espadachim"] },
  },
  {
    id: "gear-espada-pesada",
    name: "Espada Pesada",
    description: "Larga e pesada, de ferro-cru. Pede o golpe que decide logo, o do Bate-Primeiro.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 10 }, range: 1, toHit: -1, classes: ["espadachim"] },
  },
  {
    id: "gear-bordao",
    name: "Bordão",
    description: "Vara de madeira de quem anda a pé. Não tem texto nenhum gravado: é madeira.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 1, classes: ["atracao_repulsao"] },
  },
  {
    id: "gear-gibao-de-couro",
    name: "Gibão de Couro",
    description: "Couro grosso costurado em camadas, de quem escolta barco. Segura corte; não segura queda na água.",
    category: "equipment",
    rarity: "common",
    data: { slot: "armor", defense: 2 },
  },
  // Temperadas pelo ferreiro de Ybytuguá, na receita dele (o segundo nível do cânone, `magia` §7.4). A receita é
  // absurda e funciona: é entropia disfarçada de tradição de oficina.
  {
    id: "gear-espada-reta-temperada",
    name: "Espada Reta Temperada",
    description: "A mesma espada reta, temperada na receita do ferreiro de Ybytuguá. O fio entra em couro que antes só riscava.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "weapon", dice: { count: 1, sides: 10 }, range: 1, toHit: 1, classes: ["espadachim"] },
  },
  {
    id: "gear-espada-pesada-temperada",
    name: "Espada Pesada Temperada",
    description: "A espada pesada, temperada na receita do ferreiro de Ybytuguá. Ainda pesa; agora pesa onde bate.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "weapon", dice: { count: 1, sides: 12 }, range: 1, classes: ["espadachim"] },
  },
  // --- A gente do rio e de Ymboripe ----------------------------------------
  {
    id: "gear-chuco",
    name: "Chuço",
    description: "Ponta de ferro-cru num cabo comprido. Arma de quem guarda corrente e cais: segura o outro longe.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 2, toHit: -1, classes: ["espadachim"] },
  },
  {
    id: "gear-besta",
    name: "Besta",
    description: "Arco atravessado numa coronha, com manivela. Qualquer um aprende a usar numa tarde; é por isso que os castelos gostam.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 6, classes: ["espadachim"] },
  },
  // --- Armaduras ------------------------------------------------------------
  {
    id: "gear-tunica-de-linho",
    name: "Túnica de Linho",
    description: "Sem mangas, desbotada de mar, cintada com corda. Não segura golpe nenhum; só não atrapalha.",
    category: "equipment",
    rarity: "common",
    data: { slot: "armor", defense: 1 },
  },
  {
    id: "gear-cota-de-escamas",
    name: "Cota de Escamas",
    description: "Placas pequenas de ferro costuradas umas sobre as outras, como as de um peixe. Pesa no ombro e segura o corte.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "armor", defense: 2 },
  },
];

/** Busca uma peça do catálogo pelo id. */
export function findEquipment(itemId: string): EquipmentItem | undefined {
  return EQUIPMENT.find((item) => item.id === itemId);
}
