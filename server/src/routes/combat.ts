import { Router } from "express";
import type { Character, CombatAction } from "@ealen/shared";
import { ATTRIBUTE_KEYS } from "@ealen/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { rowToCharacter, type CharacterRow } from "../lib/characterMapper";
import { getOrCreateSession, clearSession } from "../combat/sessions";
import { resolveCombatTurn } from "../combat/engine";
import { settleCombat } from "../combat/settle";
import { tickBuffs } from "../combat/buffs";

const router = Router();

const VALID_ACTIONS: CombatAction[] = ["attack", "quick_attack", "heavy_attack", "defend", "heal", "use_item"];

function isValidGuestCharacter(value: unknown): value is Character {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== "string" || !c.id.startsWith("guest-")) return false;
  if (typeof c.currentHp !== "number" || typeof c.maxHp !== "number") return false;
  if (typeof c.attributes !== "object" || c.attributes === null) return false;
  const attrs = c.attributes as Record<string, unknown>;
  return ATTRIBUTE_KEYS.every((key) => typeof attrs[key] === "number");
}

// POST /api/combat/:nodeId/guest-action — modo convidado: não exige login e
// não toca o Supabase. O cliente manda o personagem completo (guardado só
// no navegador) e recebe de volta o mesmo shape que o modo autenticado usa.
router.post("/:nodeId/guest-action", (req, res) => {
  const { nodeId } = req.params;
  const { character, action, itemId } = req.body as { character?: unknown; action?: string; itemId?: string };

  if (!isValidGuestCharacter(character)) {
    res.status(400).json({ error: "Personagem de convidado inválido" });
    return;
  }
  if (!action || !VALID_ACTIONS.includes(action as CombatAction)) {
    res.status(400).json({ error: `action inválida. Use uma de: ${VALID_ACTIONS.join(", ")}` });
    return;
  }
  if (character.currentHp <= 0) {
    res.status(400).json({ error: "Personagem está incapacitado e não pode agir" });
    return;
  }

  const session = getOrCreateSession(character.id, nodeId);
  if (!session) {
    res.status(404).json({ error: "Nenhum encontro de combate ativo neste nó" });
    return;
  }

  const events = resolveCombatTurn(character, session.enemy, action as CombatAction, {
    itemId,
    activeBuffs: session.buffs,
  });
  tickBuffs(session.buffs);

  const { combatEnded, xpGained, levelUp } = settleCombat(character, session.enemy, events);
  if (combatEnded) clearSession(character.id, nodeId);

  res.json({ events, characterState: character, enemyState: session.enemy, xpGained, levelUp });
});

router.use(requireAuth);

router.post("/:nodeId/action", async (req, res) => {
  const { supabase } = req as unknown as AuthedRequest;
  const { nodeId } = req.params;
  const { characterId, action, itemId } = req.body as {
    characterId?: string;
    action?: string;
    itemId?: string;
  };

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

  const session = getOrCreateSession(characterId, nodeId);
  if (!session) {
    res.status(404).json({ error: "Nenhum encontro de combate ativo neste nó" });
    return;
  }

  const events = resolveCombatTurn(character, session.enemy, action as CombatAction, {
    itemId,
    activeBuffs: session.buffs,
  });
  tickBuffs(session.buffs);

  const { combatEnded, playerWon, xpGained, levelUp } = settleCombat(character, session.enemy, events);

  if (combatEnded) {
    clearSession(characterId, nodeId);

    // "Salão das Lendas": histórico de combates concluídos. Não bloqueia a
    // resposta se falhar — é um registro secundário, não crítico pro jogo.
    const { error: logError } = await supabase.from("combat_log").insert({
      character_id: character.id,
      enemy_name: session.enemy.name,
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
      inventory: character.inventory,
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
    enemyState: session.enemy,
    xpGained,
    levelUp,
  });
});

export default router;
