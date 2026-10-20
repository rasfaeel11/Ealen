/**
 * As áreas do mundo. Cada área é um mapa desenhado no Tiled; o mundo é o
 * grafo que as saídas desses mapas formam. Este arquivo só diz quais áreas
 * existem — PRA ONDE cada uma leva está dentro do próprio mapa, nos objetos
 * de saída (ver ./tiledMap.ts), pra não haver dois lugares dizendo a mesma
 * coisa.
 *
 * As áreas são as do cânone (AGENTS.md §2): um trecho do Ymonhã com o
 * castelo de pedágio, a cidade livre de Ybytuguá, os baixios abaixo dela e a
 * floresta entre as bacias. O jogo começa no barco de Oryndu, parado na
 * corrente do pedágio.
 */
export interface AreaDef {
  id: string;
  name: string;
  /** Caminho do mapa, relativo a client/public (sem barra inicial). */
  map: string;
}

export const AREAS: Record<string, AreaDef> = {
  ymonha: { id: "ymonha", name: "O Ymonhã, no castelo de pedágio", map: "maps/ymonha.tmj" },
  ybytugua: { id: "ybytugua", name: "Ybytuguá", map: "maps/ybytugua.tmj" },
  baixios: { id: "baixios", name: "Os baixios", map: "maps/baixios.tmj" },
  floresta: { id: "floresta", name: "A floresta entre as bacias", map: "maps/floresta.tmj" },
};

/** Onde um jogo novo começa: no barco, parado na corrente. */
export const STARTING_AREA = "ymonha";
export const STARTING_SPAWN = "barco";
