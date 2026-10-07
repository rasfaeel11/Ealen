/**
 * As áreas do mundo. Cada área é um mapa desenhado no Tiled; o mundo é o
 * grafo que as saídas desses mapas formam. Este arquivo só diz quais áreas
 * existem — PRA ONDE cada uma leva está dentro do próprio mapa, nos objetos
 * de saída (ver ./tiledMap.ts), pra não haver dois lugares dizendo a mesma
 * coisa.
 *
 * As três áreas abaixo são provisórias: existem pra exercitar andar, câmera
 * e troca de área enquanto a geografia de verdade não foi escrita.
 */
export interface AreaDef {
  id: string;
  name: string;
  /** Caminho do mapa, relativo a client/public (sem barra inicial). */
  map: string;
}

export const AREAS: Record<string, AreaDef> = {
  clareira: { id: "clareira", name: "Clareira (provisório)", map: "maps/clareira.tmj" },
  estrada: { id: "estrada", name: "Estrada (provisório)", map: "maps/estrada.tmj" },
  ruinas: { id: "ruinas", name: "Ruínas (provisório)", map: "maps/ruinas.tmj" },
};

/** Onde um jogo novo começa. */
export const STARTING_AREA = "clareira";
export const STARTING_SPAWN = "default";
