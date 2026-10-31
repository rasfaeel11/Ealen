// Gerado por art/gerar_arte.py (register): não edite à mão. Ver docs/arte.md.
import type { MapSheetDef } from "./mapSprites";

/** As folhas de mapa geradas, pela chave de quem representam (ver MAP_SHEETS). */
export const GENERATED_SHEETS: Record<string, MapSheetDef> = {
  "person:Endyru": { url: "sprites/endyru.png", frameWidth: 48, frameHeight: 48 },
  "person:Jarupã": { url: "sprites/jarupa.png", frameWidth: 48, frameHeight: 48 },
  "person:Xanduí": { url: "sprites/xandui.png", frameWidth: 48, frameHeight: 48 },
  "person:Oryndu": { url: "sprites/oryndu.png", frameWidth: 48, frameHeight: 48 },
  "person:Conselheira": { url: "sprites/conselheira.png", frameWidth: 48, frameHeight: 48 },
  "person:Escrivão da Mesa": { url: "sprites/escrivao.png", frameWidth: 48, frameHeight: 48 },
  "person:Mestre da guilda": { url: "sprites/mestre_da_guilda.png", frameWidth: 48, frameHeight: 48 },
  "person:Thrykar": { url: "sprites/thrykar.png", frameWidth: 48, frameHeight: 48 },
  "person:Mercador": { url: "sprites/mercador.png", frameWidth: 48, frameHeight: 48 },
  "person:Família no cais": { url: "sprites/familia.png", frameWidth: 48, frameHeight: 48 },
  "person:Guarda do portão": { url: "sprites/guarda_do_portao.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-castelao": { url: "sprites/mbyraku.png", frameWidth: 48, frameHeight: 48 },
  "person:Mbyraku": { url: "sprites/mbyraku.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-jurendy": { url: "sprites/jurendy.png", frameWidth: 48, frameHeight: 48 },
  "person:Jurendy": { url: "sprites/jurendy.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-saqueador-do-dique": { url: "sprites/saqueador.png", frameWidth: 48, frameHeight: 48 },
  "person:Saqueador": { url: "sprites/saqueador.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-saqueadora-do-dique": { url: "sprites/saqueadora.png", frameWidth: 48, frameHeight: 48 },
  "person:Saqueadora": { url: "sprites/saqueadora.png", frameWidth: 48, frameHeight: 48 },
  "person:Contratada": { url: "sprites/contratada.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-aventureiro-contratado": { url: "sprites/contratado.png", frameWidth: 48, frameHeight: 48 },
  "person:Contratado": { url: "sprites/contratado.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-guarda-do-pedagio": { url: "sprites/guarda_do_pedagio.png", frameWidth: 48, frameHeight: 48 },
  "person:Guarda do pedágio": { url: "sprites/guarda_do_pedagio.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-besteiro-do-pedagio": { url: "sprites/besteiro.png", frameWidth: 48, frameHeight: 48 },
  "person:Besteiro": { url: "sprites/besteiro.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-espada-de-ymboripe": { url: "sprites/espada_de_ymboripe.png", frameWidth: 48, frameHeight: 48 },
  "person:Espada de Ymboripe": { url: "sprites/espada_de_ymboripe.png", frameWidth: 48, frameHeight: 48 },
  "creature:encounter-lanca-de-ymboripe": { url: "sprites/lanca_de_ymboripe.png", frameWidth: 48, frameHeight: 48 },
  "person:Lança de Ymboripe": { url: "sprites/lanca_de_ymboripe.png", frameWidth: 48, frameHeight: 48 },
  "person:Espada do vale": { url: "sprites/espada_do_vale.png", frameWidth: 48, frameHeight: 48 },
  "person:Lança da serra": { url: "sprites/lanca_da_serra.png", frameWidth: 48, frameHeight: 48 },
  "person:Escudeiro": { url: "sprites/escudeiro.png", frameWidth: 48, frameHeight: 48 },
};

/** Os retratos gerados, pelo nome de quem fala (ver PORTRAITS). */
export const GENERATED_PORTRAITS: Record<string, { url: string; smooth?: boolean }> = {
  "Endyru": { url: "sprites/portraits/endyru.png", smooth: true },
  "Jarupã": { url: "sprites/portraits/jarupa.png", smooth: true },
  "Xanduí": { url: "sprites/portraits/xandui.png", smooth: true },
  "Oryndu": { url: "sprites/portraits/oryndu.png", smooth: true },
  "Conselheira": { url: "sprites/portraits/conselheira.png", smooth: true },
  "Escrivão da Mesa": { url: "sprites/portraits/escrivao.png", smooth: true },
  "Mestre da guilda": { url: "sprites/portraits/mestre_da_guilda.png", smooth: true },
  "Thrykar": { url: "sprites/portraits/thrykar.png", smooth: true },
  "Mercador": { url: "sprites/portraits/mercador.png", smooth: true },
  "Mulher da família": { url: "sprites/portraits/familia.png", smooth: true },
  "Vendedora do cais": { url: "sprites/portraits/vendedora.png", smooth: true },
  "Sargento do pedágio": { url: "sprites/portraits/sargento.png", smooth: true },
  "Mbyraku": { url: "sprites/portraits/mbyraku.png", smooth: true },
  "Jurendy": { url: "sprites/portraits/jurendy.png", smooth: true },
};

/** As ilustrações de tela cheia (título, mapa do mundo, splash de cada um), pelo id. */
export const SPLASHES: Record<string, string> = {
  "oryndu": "art/oryndu.jpg",
  "mundo": "art/mundo.jpg",
};
