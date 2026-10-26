import type { MapNode } from "../types";

/**
 * O mapa da jornada do Eälen, em nós: é o que o servidor opcional (../../server)
 * ainda serve em `/map`. O jogo não o usa (anda pelos mapas do Tiled); fica até
 * o servidor ser revisto, e não é cânone de Três na Estrada.
 *
 * O mapa é uma trilha com uma bifurcação de folga: dois nós de lenda
 * (Mirante e Santuário) ficam fora do caminho crítico, pra quem quiser
 * entender o mundo antes de apanhar dele.
 */

export const MOCK_MAP_NODES: MapNode[] = [
  {
    id: "node-portas-de-tiran",
    name: "Portas de Tirán",
    description:
      "Duas lajes de pedra gravadas com as sete runas, plantadas onde as terras medidas acabam. Ninguém sabe quem as ergueu; sabe-se que quem passa por elas volta diferente, quando volta.",
    connections: ["node-clareira-do-eco"],
    encounterType: "none",
  },
  {
    id: "node-clareira-do-eco",
    name: "Clareira do Eco",
    description:
      "Os sussurros da mata se repetem aqui fora de ordem — respostas chegam antes das perguntas. Alguma coisa pequena e barulhenta se move entre as árvores.",
    connections: ["node-portas-de-tiran", "node-mirante-das-constantes", "node-vau-de-bruma"],
    encounterType: "combat",
    encounterId: "encounter-fiapo-de-ruido",
  },
  {
    id: "node-mirante-das-constantes",
    name: "Mirante das Constantes",
    description:
      "Do alto do penhasco dá pra ver a cicatriz: uma faixa do céu onde as estrelas não ficam paradas nos lugares certos. Os Guardiões usam este mirante há gerações para medir o quanto a fenda cresceu no ano. A pedra ao seu lado tem marcas de medição — e as mais recentes estão bem mais longe da borda do que as antigas.",
    connections: ["node-clareira-do-eco"],
    encounterType: "lore",
    encounterId: "lore-a-cicatriz",
  },
  {
    id: "node-vau-de-bruma",
    name: "Vau de Bruma",
    description:
      "Uma travessia rasa coberta por névoa que não se dissipa nem ao meio-dia. Aqui as coisas deixam de ser observadas por tempo demais, e algumas gostam disso.",
    connections: ["node-clareira-do-eco", "node-oficina-morta"],
    encounterType: "combat",
    encounterId: "encounter-lobo-de-bruma",
  },
  {
    id: "node-oficina-morta",
    name: "A Oficina Morta",
    description:
      "Galpão de mineração taharim, parado há séculos. As bigornas ainda estão quentes — a Entropia come a ordem das coisas, não o calor delas. Algo grande se levanta quando a porta range.",
    connections: ["node-vau-de-bruma", "node-santuario-primeiras-luzes", "node-arquivo-submerso"],
    encounterType: "combat",
    encounterId: "encounter-servo-enferrujado",
  },
  {
    id: "node-santuario-primeiras-luzes",
    name: "Santuário das Primeiras Luzes",
    description:
      "Ruínas de um templo construído em torno de nada — só um espaço vazio no centro, onde o ar vibra sem vento. É aqui que os Cantores vêm aprender que Eälen não responde a orações: responde a afinação. Encoste a mão na coluna e você sente o Canto ainda passando, na mesma frequência desde o primeiro instante do universo.",
    connections: ["node-oficina-morta"],
    encounterType: "lore",
    encounterId: "lore-canto-primordial",
  },
  {
    id: "node-arquivo-submerso",
    name: "Arquivo Submerso de Miraven",
    description:
      "Salões inundados onde os Miraven guardam o que não pode ser esquecido. A maré está baixa, e alguma coisa está lendo as prateleiras antes de você.",
    connections: ["node-oficina-morta", "node-umbral"],
    encounterType: "combat",
    encounterId: "encounter-coletor-de-lembrancas",
  },
  {
    id: "node-umbral",
    name: "O Umbral",
    description:
      "Um vão de porta sem porta e sem parede, de pé no meio do campo aberto. Atravessar deveria ser trivial. Não é: tem coisa aqui que foi deixada com uma única ordem.",
    connections: ["node-arquivo-submerso", "node-fenda-de-prumo"],
    encounterType: "combat",
    encounterId: "encounter-vigia-do-umbral",
  },
  {
    id: "node-fenda-de-prumo",
    name: "Fenda de Prumo",
    description:
      "O chão aqui não é simétrico com ele mesmo: pedras idênticas caem em velocidades diferentes. Os Rachadores chamam este lugar de escola. Alguma coisa se formou nas aulas.",
    connections: ["node-umbral", "node-anfiteatro-silente"],
    encounterType: "combat",
    encounterId: "encounter-cisma-errante",
  },
  {
    id: "node-anfiteatro-silente",
    name: "Anfiteatro do Silêncio",
    description:
      "Uma arena escavada na rocha, projetada para carregar a voz até a última fileira. Hoje não carrega nada: fale aqui e a palavra some antes de sair da boca. No centro, algo está terminando de apagar o lugar.",
    connections: ["node-fenda-de-prumo"],
    encounterType: "combat",
    encounterId: "encounter-coro-mudo",
  },
];
