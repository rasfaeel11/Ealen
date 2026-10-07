/**
 * Matriz de taxa de vitória, rodada pelo motor REAL do jogo (não pelo
 * simulador em Python do projeto irmão): cada Ordem, no nível 1, contra cada
 * criatura do bestiário, com um jogador ingênuo que só ataca.
 *
 *     npm run balance:matrix --workspace=server
 *
 * Existe por causa da integração com o `ealen-IA` (ver INTEGRACAO_COM_O_JOGO.md):
 * o auto-tuner de lá garante 50/50 no modelo DELE, que não é este. A única
 * forma honesta de saber o que os números importados fizeram com o jogo é
 * medir aqui dentro. Use isto depois de cada reexportação do artefato, ou
 * depois de mexer em BASELINE_BLEND / no bestiário.
 *
 * O jogador simulado não cura nem usa itens, então Ordens com cura
 * (Luminar, Entropista, Cantor) aparecem piores do que são nas mãos de
 * alguém. A matriz serve pra comparar ANTES/DEPOIS de uma mudança, não como
 * medida absoluta de dificuldade.
 */
import {
  BESTIARY,
  CLASS_INFO,
  createStartingAttributes,
  enemyGuardSurvives,
  resolveCombatTurn,
  startingMaxHp,
  type Character,
  type CharacterClass,
  type CombatAction,
} from "@ealen/shared";

const N = 300;

function makePlayer(characterClass: CharacterClass): Character {
  const attributes = createStartingAttributes("althirim", characterClass);
  const maxHp = startingMaxHp(attributes);
  return {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass,
    level: 1,
    xp: 0,
    attributes,
    currentHp: maxHp,
    maxHp,
    currentNodeId: "n",
  };
}

/** Jogador ingênuo: ataca sempre, defende quando está abaixo de 25% de HP. */
function playerAction(player: Character): CombatAction {
  return player.currentHp / player.maxHp < 0.25 ? "defend" : "attack";
}

function fight(characterClass: CharacterClass, encounterId: string): boolean {
  const player = makePlayer(characterClass);
  const enemy = structuredClone(BESTIARY[encounterId].template);
  let guardUp = false;

  for (let turn = 0; turn < 60; turn++) {
    const events = resolveCombatTurn(player, enemy, playerAction(player), { enemyGuardUp: guardUp });
    guardUp = enemyGuardSurvives(enemy.id, player.id, events);
    if (enemy.currentHp <= 0) return true;
    if (player.currentHp <= 0) return false;
  }
  return false;
}

const encounters = Object.keys(BESTIARY);
const classes = Object.keys(CLASS_INFO) as CharacterClass[];

const header = ["Ordem".padEnd(28), ...encounters.map((e) => BESTIARY[e].template.name.slice(0, 14).padEnd(15))].join("");
console.log(header);
for (const characterClass of classes) {
  const cells = encounters.map((encounterId) => {
    let wins = 0;
    for (let i = 0; i < N; i++) if (fight(characterClass, encounterId)) wins++;
    return `${Math.round((wins / N) * 100)}%`.padEnd(15);
  });
  console.log([CLASS_INFO[characterClass].name.padEnd(28), ...cells].join(""));
}
console.log(
  `\n(nivel 1, povo althirim, ${N} combates por celula, jogador ingenuo: ataca sempre, defende abaixo de 25% de HP)`,
);
console.log("niveis das criaturas:", encounters.map((e) => `${BESTIARY[e].template.name}=${BESTIARY[e].template.level}`).join(", "));
