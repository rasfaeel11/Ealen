import { Router } from "express";
import type { CombatAction, CombatEvent, LevelUpResult } from "@ealen/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { rowToCharacter, type CharacterRow } from "../lib/characterMapper";
import { getOrCreateEnemy, clearEnemy } from "../combat/sessions";
import { resolveCombatTurn } from "../combat/engine";
import { applyXpGain, xpForEnemy } from "../combat/leveling";

const router = Router();

router.use(requireAuth);

const VALID_ACTIONS: CombatAction[] = ["attack", "defend", "heal"];

router.post("/:nodeId/action", async (req, res) => {
  const { supabase } = req as unknown as AuthedRequest;
  const { nodeId } = req.params;
  const { characterId, action } = req.body as { characterId?: string; action?: string };

  if (!characterId || !action) {
    res.status(400).json({ error: "characterId e action são obrigatórios" });
    return;
  }
  if (!VALID_ACTIONS.includes(action as CombatAction)) {
    res.status(400).json({ error: `action inválida. Use uma de: ${VALID_ACTIONS.join(", ")}` });
    return;
  }

  // RLS garante que só o dono do personagem consegue lê-lo aqui.
  const { data: row, error: fetchError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .maybeSingle<CharacterRow>();

  if (fetchError) {
    res.status(500).json({ error: fetchError.message });
    return;
  }
  if (!row) {
    res.status(404).json({ error: "Personagem não encontrado" });
    return;
  }

  const character = rowToCharacter(row);
  if (character.currentHp <= 0) {
    res.status(400).json({ error: "Personagem está incapacitado e não pode agir" });
    return;
  }

  const enemy = getOrCreateEnemy(characterId, nodeId);
  if (!enemy) {
    res.status(404).json({ error: "Nenhum encontro de combate ativo neste nó" });
    return;
  }

  const events: CombatEvent[] = resolveCombatTurn(character, enemy, action as CombatAction);
  const victoryEvent = events.find(
    (event): event is Extract<CombatEvent, { type: "victory" }> => event.type === "victory",
  );

  let levelUp: LevelUpResult = { leveledUp: false };
  let xpGained = 0;

  if (victoryEvent) {
    clearEnemy(characterId, nodeId);

    const playerWon = victoryEvent.winner === character.id;
    xpGained = playerWon ? xpForEnemy(enemy) : 0;
    if (playerWon) {
      levelUp = applyXpGain(character, xpGained);
    }

    // "Salão das Lendas": histórico de combates concluídos. Não bloqueia a
    // resposta se falhar — é um registro secundário, não crítico pro jogo.
    const { error: logError } = await supabase.from("combat_log").insert({
      character_id: character.id,
      enemy_name: enemy.name,
      result: playerWon ? "victory" : "defeat",
      xp_gained: xpGained,
    });
    if (logError) console.error("[ealen-server] falha ao registrar combat_log:", logError.message);

    if (levelUp.newAbility) {
      const { error: abilityError } = await supabase.from("character_abilities").insert({
        character_id: character.id,
        ability_id: levelUp.newAbility.id,
      });
      if (abilityError) console.error("[ealen-server] falha ao registrar character_abilities:", abilityError.message);
    }
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("characters")
    .update({
      current_hp: character.currentHp,
      xp: character.xp,
      level: character.level,
      attributes: character.attributes,
      max_hp: character.maxHp,
    })
    .eq("id", character.id)
    .select("*")
    .single<CharacterRow>();

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.json({
    events,
    characterState: rowToCharacter(updatedRow),
    enemyState: enemy,
    xpGained,
    levelUp,
  });
});

export default router;
