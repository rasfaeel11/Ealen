import type { CombatEvent } from "@ealen/shared";

/**
 * Passos de animação derivados da lista bruta de CombatEvent. O motor do
 * servidor emite eventos atômicos (roll, hit/miss, damage...); aqui a gente
 * agrupa os que formam uma única "jogada" visual (ex: roll + criticalHit +
 * hit + block + damage viram um só passo "attack"), na mesma ordem em que
 * foram emitidos por server/src/combat/engine.ts — os dois primeiros "roll"
 * são sempre a iniciativa, o resto são ações de turno.
 */
export type AnimStep =
  | { kind: "initiative"; characterRoll: number; enemyRoll: number; firstActorId: string }
  | {
      kind: "attack";
      actorId: string;
      targetId: string;
      roll: number;
      dc: number;
      hit: boolean;
      critical: boolean;
      fumble: boolean;
      damage?: number;
      remainingHp?: number;
      blocked?: { blockedAmount: number; remainingDamage: number };
    }
  | { kind: "status"; targetId: string; status: string }
  | { kind: "heal"; targetId: string; amount: number; remainingHp: number }
  | { kind: "death"; actorId: string }
  | { kind: "victory"; winnerId: string };

export function groupCombatEvents(events: CombatEvent[], characterId: string, enemyId: string): AnimStep[] {
  const otherSide = (id: string) => (id === characterId ? enemyId : characterId);
  const steps: AnimStep[] = [];
  let i = 0;

  const first = events[0];
  const second = events[1];
  if (first?.type === "roll" && second?.type === "roll") {
    steps.push({
      kind: "initiative",
      characterRoll: first.actor === characterId ? first.value : second.value,
      enemyRoll: first.actor === enemyId ? first.value : second.value,
      firstActorId: first.value >= second.value ? first.actor : second.actor,
    });
    i = 2;
  }

  while (i < events.length) {
    const event = events[i];

    if (event.type === "roll") {
      const rollEvent = event;
      let j = i + 1;

      const maybeCritical = events[j];
      const criticalEvent = maybeCritical?.type === "criticalHit" ? maybeCritical : undefined;
      if (criticalEvent) j += 1;

      const maybeFumble = events[j];
      const fumbleEvent = maybeFumble?.type === "fumble" ? maybeFumble : undefined;
      if (fumbleEvent) j += 1;

      const hitEvent = events[j];
      if (!hitEvent || (hitEvent.type !== "hit" && hitEvent.type !== "miss")) {
        i += 1;
        continue;
      }
      j += 1;

      const maybeBlock = events[j];
      const blockEvent = maybeBlock?.type === "block" ? maybeBlock : undefined;
      if (blockEvent) j += 1;

      const maybeDamage = events[j];
      const damageEvent = maybeDamage?.type === "damage" ? maybeDamage : undefined;
      if (damageEvent) j += 1;

      steps.push({
        kind: "attack",
        actorId: rollEvent.actor,
        targetId: damageEvent?.target ?? blockEvent?.defender ?? otherSide(rollEvent.actor),
        roll: rollEvent.value,
        dc: rollEvent.target,
        hit: hitEvent.type === "hit",
        critical: criticalEvent !== undefined,
        fumble: fumbleEvent !== undefined,
        damage: damageEvent?.amount,
        remainingHp: damageEvent?.remainingHp,
        blocked: blockEvent && { blockedAmount: blockEvent.blockedAmount, remainingDamage: blockEvent.remainingDamage },
      });
      i = j;
      continue;
    }

    if (event.type === "statusApplied") {
      steps.push({ kind: "status", targetId: event.target, status: event.status });
      i += 1;
      continue;
    }
    if (event.type === "heal") {
      steps.push({ kind: "heal", targetId: event.target, amount: event.amount, remainingHp: event.remainingHp });
      i += 1;
      continue;
    }
    if (event.type === "death") {
      steps.push({ kind: "death", actorId: event.actor });
      i += 1;
      continue;
    }
    if (event.type === "victory") {
      steps.push({ kind: "victory", winnerId: event.winner });
      i += 1;
      continue;
    }

    i += 1;
  }

  return steps;
}

export function narrateStep(step: AnimStep, nameOf: (id: string) => string): string {
  switch (step.kind) {
    case "initiative":
      return `Iniciativa — ${nameOf(step.firstActorId)} age primeiro (${step.characterRoll} x ${step.enemyRoll}).`;
    case "attack": {
      if (step.fumble) {
        return `FALHA CRÍTICA (1)! A lâmina de ${nameOf(step.actorId)} desliza em falso e ${nameOf(
          step.actorId,
        )} perde o equilíbrio (Desequilibrado: -3 Or até o próximo turno).`;
      }

      const criticalPrefix = step.critical ? "20 NATURAL! Um golpe devastador que fende a armadura! " : "";
      const base = `${criticalPrefix}${nameOf(step.actorId)} ataca ${nameOf(step.targetId)}: ${step.roll} vs CA ${
        step.dc
      } — ${step.hit ? "ACERTOU" : "ERROU"}!`;

      if (!step.hit) return base;
      if (step.blocked) {
        if (step.blocked.remainingDamage === 0) {
          return `${base} ${nameOf(step.targetId)} bloqueia o golpe por completo com Or!`;
        }
        return `${base} ${nameOf(step.targetId)} bloqueia ${step.blocked.blockedAmount} de dano — ${
          step.blocked.remainingDamage
        } passam.`;
      }
      return step.damage !== undefined ? `${base} ${step.damage} de dano.` : base;
    }
    case "status":
      return `${nameOf(step.targetId)} recebe o status "${step.status}".`;
    case "heal":
      return `${nameOf(step.targetId)} se cura em ${step.amount} (HP: ${step.remainingHp}).`;
    case "death":
      return `${nameOf(step.actorId)} caiu em combate!`;
    case "victory":
      return `${nameOf(step.winnerId)} venceu o combate!`;
  }
}

export function stepDurationMs(step: AnimStep): number {
  switch (step.kind) {
    case "initiative":
      return 900;
    case "attack":
      if (step.fumble) return 1300;
      if (step.critical) return 1900;
      return step.hit ? 1500 : 950;
    case "status":
      return 500;
    case "heal":
      return 700;
    case "death":
      return 900;
    case "victory":
      return 400;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
