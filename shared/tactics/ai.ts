import { distance, samePos, type Pos } from "./grid";
import { reachableTiles } from "./movement";
import { abilityTargets } from "./targeting";
import type { Command, Encounter } from "./types";
import { activeUnit, isAlive } from "./units";

/**
 * A IA de inimigo PROVISÓRIA: bate em quem alcança, senão anda na direção
 * do inimigo mais próximo, senão passa a vez. Não foge, não cura, não
 * protege ninguém, não pensa em terreno.
 *
 * Existe pra que o combate seja jogável e testável de ponta a ponta. A IA
 * de verdade (pontuar todas as jogadas possíveis, com pesos por criatura)
 * substitui esta função sem mudar quem a chama: recebe a luta, devolve o
 * próximo comando de quem está no turno.
 */
export function basicCommand(encounter: Encounter): Command {
  const unit = activeUnit(encounter);
  if (!unit) throw new Error("A luta acabou: não há quem comandar.");
  const enemies = encounter.units.filter((other) => other.team !== unit.team && isAlive(other));

  for (const ability of unit.abilities) {
    if (ability.targets === "self" || ability.targets === "ally") continue;
    if (!(ability.cost === "action" ? unit.turn.action : unit.turn.bonus)) continue;

    const target = abilityTargets(encounter, unit, ability).find((pos) =>
      enemies.some((enemy) => samePos(enemy.pos, pos)),
    );
    if (target) return { type: "ability", unitId: unit.id, abilityId: ability.id, target };
  }

  // Um movimento por turno: sem isto, quem não alcança ninguém ficaria andando em passos de um.
  if (unit.turn.movement === unit.speed) {
    const gap = (pos: Pos) => Math.min(...enemies.map((enemy) => distance(enemy.pos, pos)));
    let best: Pos | undefined;
    for (const tile of reachableTiles(encounter, unit)) {
      if (gap(tile.pos) < gap(best ?? unit.pos)) best = tile.pos;
    }
    if (best) return { type: "move", unitId: unit.id, to: best };
  }

  return { type: "endTurn", unitId: unit.id };
}
