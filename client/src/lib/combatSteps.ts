import type { CombatAction, CombatEvent } from "@ealen/shared";

/**
 * Passos de animação derivados da lista bruta de CombatEvent. O motor do
 * servidor emite eventos atômicos (action, roll, hit/miss, damage...); aqui
 * a gente agrupa os que formam uma única "jogada" visual — ex: action +
 * roll + criticalHit + hit + block + damage viram um só passo "attack" — na
 * mesma ordem em que foram emitidos por server/src/combat/engine.ts. Os
 * dois primeiros "roll" são sempre a iniciativa; do terceiro evento em
 * diante, cada jogada começa por um evento "action" anunciando a Arte.
 */
export type AnimStep =
  | { kind: "initiative"; characterRoll: number; enemyRoll: number; firstActorId: string }
  | {
      kind: "attack";
      actorId: string;
      targetId: string;
      artName: string;
      roll: number;
      dc: number;
      hit: boolean;
      critical: boolean;
      fumble: boolean;
      damage?: number;
      remainingHp?: number;
      blocked?: { blockedAmount: number; remainingDamage: number };
    }
  | { kind: "guard"; actorId: string; artName: string; status: string }
  | { kind: "status"; targetId: string; status: string }
  | { kind: "heal"; targetId: string; artName: string | null; amount: number; remainingHp: number }
  | { kind: "item"; actorId: string; itemName: string; effectDescription: string }
  | { kind: "death"; actorId: string }
  | { kind: "victory"; winnerId: string };

interface PendingArt {
  action: CombatAction;
  artName: string;
}

export function groupCombatEvents(events: CombatEvent[], characterId: string, enemyId: string): AnimStep[] {
  const otherSide = (id: string) => (id === characterId ? enemyId : characterId);
  const steps: AnimStep[] = [];
  let pendingArt: PendingArt | null = null;
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

    // Anúncio da Arte: guarda o nome e deixa que a próxima jogada o consuma.
    if (event.type === "action") {
      pendingArt = { action: event.action, artName: event.artName };
      i += 1;
      continue;
    }

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
        artName: pendingArt?.artName ?? "Investida",
        roll: rollEvent.value,
        dc: rollEvent.target,
        hit: hitEvent.type === "hit",
        critical: criticalEvent !== undefined,
        fumble: fumbleEvent !== undefined,
        damage: damageEvent?.amount,
        remainingHp: damageEvent?.remainingHp,
        blocked: blockEvent && { blockedAmount: blockEvent.blockedAmount, remainingDamage: blockEvent.remainingDamage },
      });
      pendingArt = null;
      i = j;
      continue;
    }

    if (event.type === "statusApplied") {
      // Um status logo depois de uma Arte de guarda é a própria postura;
      // sem Arte pendente é um efeito avulso (ex: debuff de item).
      if (pendingArt?.action === "defend") {
        steps.push({ kind: "guard", actorId: event.target, artName: pendingArt.artName, status: event.status });
        pendingArt = null;
      } else {
        steps.push({ kind: "status", targetId: event.target, status: event.status });
      }
      i += 1;
      continue;
    }
    if (event.type === "heal") {
      steps.push({
        kind: "heal",
        targetId: event.target,
        artName: pendingArt?.action === "heal" ? pendingArt.artName : null,
        amount: event.amount,
        remainingHp: event.remainingHp,
      });
      pendingArt = null;
      i += 1;
      continue;
    }
    if (event.type === "itemUsed") {
      steps.push({
        kind: "item",
        actorId: event.actor,
        itemName: event.itemName,
        effectDescription: event.effectDescription,
      });
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

/**
 * Narra um passo como uma sequência de falas curtas, no espírito da caixa
 * de texto de um RPG de turno: primeiro o anúncio ("Fulano usa X!"), depois
 * o que isso causou. A caixa mostra uma fala por vez; o log guarda todas.
 */
export function narrateStep(step: AnimStep, nameOf: (id: string) => string): string[] {
  switch (step.kind) {
    case "initiative":
      return [`Iniciativa: ${nameOf(step.firstActorId)} age primeiro (${step.characterRoll} x ${step.enemyRoll}).`];

    case "attack": {
      const announce = `${nameOf(step.actorId)} usa ${step.artName}!`;

      if (step.fumble) {
        return [announce, `FALHA CRÍTICA (1)! O golpe desliza em falso e ${nameOf(step.actorId)} perde o prumo — Desequilibrado (-3 Or).`];
      }
      if (step.critical) {
        const damage = step.damage !== undefined ? ` ${step.damage} de dano!` : "";
        return [announce, `20 NATURAL! O golpe encontra a frequência exata do alvo.${damage}`];
      }
      if (!step.hit) {
        return [announce, `${step.roll} contra Guarda ${step.dc} — errou.`];
      }
      if (step.blocked) {
        if (step.blocked.remainingDamage === 0) {
          return [announce, `${nameOf(step.targetId)} absorve o golpe inteiro com Densidade. Nenhum dano.`];
        }
        return [
          announce,
          `${nameOf(step.targetId)} bloqueia ${step.blocked.blockedAmount} — ${step.blocked.remainingDamage} de dano passam.`,
        ];
      }
      return [announce, `${step.roll} contra Guarda ${step.dc} — acertou. ${step.damage ?? 0} de dano.`];
    }

    case "guard":
      return [`${nameOf(step.actorId)} usa ${step.artName}!`, `${nameOf(step.actorId)} se firma e espera o golpe.`];

    case "status":
      return [`${nameOf(step.targetId)}: ${step.status}.`];

    case "heal": {
      // Curar com a vida cheia devolve 0 — narrar "recupera 0 de HP" faria
      // parecer bug, quando na verdade o turno só foi desperdiçado.
      const result =
        step.amount > 0
          ? `${nameOf(step.targetId)} recupera ${step.amount} de HP.`
          : `${nameOf(step.targetId)} já está inteiro — nada a restaurar.`;
      return step.artName ? [`${nameOf(step.targetId)} usa ${step.artName}!`, result] : [result];
    }

    case "item":
      return [`${nameOf(step.actorId)} usa ${step.itemName}!`, step.effectDescription];

    case "death":
      return [`${nameOf(step.actorId)} não tem mais como se sustentar.`];

    case "victory":
      return [`${nameOf(step.winnerId)} venceu o combate!`];
  }
}

export function stepDurationMs(step: AnimStep): number {
  switch (step.kind) {
    case "initiative":
      return 900;
    case "attack":
      if (step.fumble) return 1500;
      if (step.critical) return 2000;
      return step.hit ? 1600 : 1200;
    case "guard":
      return 1100;
    case "status":
      return 700;
    case "heal":
      return 1100;
    case "item":
      return 1300;
    case "death":
      return 1100;
    case "victory":
      return 600;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
