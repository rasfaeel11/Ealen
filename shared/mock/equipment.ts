import type { EquipmentItem } from "../types/inventory";

/**
 * O equipamento de Talys: armas, armaduras e acessórios. O que cada lugar
 * faz está em `EquipmentData` (../types/inventory.ts); as regras de vestir,
 * em ../equipment.ts.
 *
 * Como os consumíveis, nada aqui é "espada +1": a descrição diz o que a
 * coisa É, os números dizem o que ela faz. TUDO PROVISÓRIO — as peças do
 * capítulo (a lâmina de mergulho, o gancho, o gibão da Companhia) vêm do que
 * a história já descreve; o resto existe pra dar a cada Ordem com o que
 * começar e ao jogador alguma coisa pra achar e trocar.
 *
 * Régua: o dado de quem luta sem nada na mão é 1d6. Arma leve acerta mais
 * (d6, +1), arma pesada fere mais e acerta menos (d10, -1). Armadura vai de
 * +1 (pano) a +3 (placa, que pesa: -1 de movimento).
 */
export const EQUIPMENT: EquipmentItem[] = [
  // --- Armas de perto -------------------------------------------------------
  {
    id: "gear-lamina-de-mergulho",
    name: "Lâmina de Mergulho",
    description:
      "Curta e curva como uma foice, feita pra cortar corda debaixo d'água. Um cordão preto a prende ao pulso: quem mergulha não pode deixar cair.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 1, toHit: 1 },
  },
  {
    id: "gear-faca-larga",
    name: "Faca Larga",
    description: "Lâmina curta e larga, cabo liso, usada de lado na cintura. Não tem nada que o olho segure — como o dono.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 1, toHit: 1 },
  },
  {
    id: "gear-gancho-de-coleta",
    name: "Gancho de Coleta",
    description:
      "Ferro de puxar do fundo o que afundou, com cabo de madeira e um cordão em nó duplo. Alcança um passo além do braço.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 2, toHit: -1 },
  },
  {
    id: "gear-bastao-de-aferir",
    name: "Bastão de Aferir",
    description: "A vara marcada com que a Companhia mede o que sobe da água. Serve pra outra coisa quando alguém insiste.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 1 },
  },
  {
    id: "gear-espada-de-prumo",
    name: "Espada de Prumo",
    description: "Lâmina reta de Luminar, pesada no ponto exato. Diz-se que só corta o que estava fora do lugar.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 1, orders: ["luminar", "guardiao"] },
  },
  {
    id: "gear-maca-de-lastro",
    name: "Maça de Lastro",
    description: "Uma cabeça de ferro que pesa mais do que o tamanho explica. Lenta de erguer; o resto é a queda.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 10 }, range: 1, toHit: -1, orders: ["guardiao", "luminar"] },
  },
  {
    id: "gear-adaga-fosca",
    name: "Adaga Fosca",
    description: "O metal foi lixado até não devolver luz nenhuma. Ninguém a vê sair da bainha, e é esse o ponto.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 1, toHit: 2, orders: ["sombrilico", "rachador"] },
  },
  // --- Armas de longe e focos -----------------------------------------------
  {
    id: "gear-arco-torto",
    name: "Arco Torto",
    description: "Um braço mais curto que o outro, de propósito. Quem aprendeu a atirar com ele acerta o que os arcos certos erram.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 6, orders: ["rachador", "sombrilico"] },
  },
  {
    id: "gear-arpao-de-fundo",
    name: "Arpão de Fundo",
    description: "Haste curta de mergulhador, com a corda enrolada no antebraço. Feito pra acertar o que se mexe no escuro.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 5, orders: ["rachador", "sombrilico"] },
  },
  {
    id: "gear-diapasao-de-haste",
    name: "Diapasão de Haste",
    description: "Um garfo de bronze do comprimento de um braço. Não faz som sozinho: carrega o de quem canta até onde a voz não chegaria.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 5, orders: ["cantor_de_ealen", "luminar"] },
  },
  {
    id: "gear-corda-de-nos",
    name: "Corda de Nós",
    description:
      "Nós grandes e pequenos, alternados, da viga até o chão: a maré contada à mão. Quem a lê sabe onde a água vai estar antes de ela chegar.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 6, toHit: 1, orders: ["cantor_de_ealen"] },
  },
  {
    id: "gear-ampulheta-rachada",
    name: "Ampulheta Rachada",
    description: "A areia escorre pela trinca, não pelo gargalo. O tempo que sai por ali cai em cima de quem o Entropista aponta.",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 6 }, range: 5, orders: ["entropista"] },
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
    id: "gear-manto-de-viagem",
    name: "Manto de Viagem",
    description: "Camadas de pano pardo, capuz curto. Quem o veste parece um pouco mais longe do que está.",
    category: "equipment",
    rarity: "common",
    data: { slot: "armor", defense: 1 },
  },
  {
    id: "gear-gibao-da-companhia",
    name: "Gibão da Companhia",
    description: "Acolchoado azul de fiscal, com o escudo redondo de aro de ferro que vem junto. Feito pra quem não pretende sair do lugar.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "armor", defense: 2 },
  },
  {
    id: "gear-cota-de-escamas",
    name: "Cota de Escamas",
    description: "Placas pequenas costuradas como as de um peixe. Os Miraven dizem que é o único ferro que não envergonha quem nada.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "armor", defense: 2 },
  },
  {
    id: "gear-placa-de-servo",
    name: "Placa de Servo",
    description: "O peito de um autômato taharim, desmontado e afivelado num corpo que não foi feito pra ele. Quase nada passa. Quase nada se move.",
    category: "equipment",
    rarity: "rare",
    data: { slot: "armor", defense: 3, speed: -1 },
  },
  // --- Acessórios -----------------------------------------------------------
  {
    id: "gear-rede-de-coleta",
    name: "Rede de Coleta",
    description: "A rede enrolada no ombro de todo mergulhador. O peso dela ensina o corpo a ficar onde está.",
    category: "equipment",
    rarity: "common",
    data: { slot: "accessory", attributes: { or: 1 } },
  },
  {
    id: "gear-presa-de-bruma",
    name: "Presa de Bruma",
    description: "Dente de um lobo que aprendeu a não estar onde se olha. Quem o carrega passa a reparar no canto do olho.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "accessory", attributes: { il: 2 } },
  },
  {
    id: "gear-sinete-da-companhia",
    name: "Sinete da Companhia",
    description: "Um anel de cera azul endurecida. Não dá autoridade nenhuma — mas quem fala com ele no dedo é ouvido até o fim.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "accessory", attributes: { len: 2 } },
  },
  {
    id: "gear-tabua-de-mare",
    name: "Tábua de Maré",
    description: "Ardósia gravada em colunas miúdas. Quem a consulta antes de falar erra menos sobre o que já aconteceu.",
    category: "equipment",
    rarity: "rare",
    data: { slot: "accessory", attributes: { ul: 2, eir: 1 } },
  },
  {
    id: "gear-conta-de-forja",
    name: "Conta de Forja",
    description: "Uma esfera de ferro que ainda guarda o calor de quando foi feita. O braço que a leva no pulso bate como se tivesse pressa.",
    category: "equipment",
    rarity: "uncommon",
    data: { slot: "accessory", attributes: { dain: 2 } },
  },
];

/** Busca uma peça do catálogo pelo id. */
export function findEquipment(itemId: string): EquipmentItem | undefined {
  return EQUIPMENT.find((item) => item.id === itemId);
}
