import { Router } from "express";
import type { CombatAction } from "@ealen/shared";
import { getCharacter } from "../state/characters";
import { getOrCreateEnemy, clearEnemy } from "../combat/sessions";
import { resolveCombatTurn } from "../combat/engine";

const router = Router();

const VALID_ACTIONS: CombatAction[] = ["attack", "defend", "heal"];

router.post("/:nodeId/action", (req, res) => {
  const { nodeId } = req.params;
  const { characterId, action } = req.body as { characterId?: string; action?: string };

  if (!characterId || !action) {
    return res.status(400).json({ error: "characterId e action são obrigatórios" });
  }
  if (!VALID_ACTIONS.includes(action as CombatAction)) {
    return res.status(400).json({ error: `action inválida. Use uma de: ${VALID_ACTIONS.join(", ")}` });
  }

  const character = getCharacter(characterId);
  if (!character) {
    return res.status(404).json({ error: "Personagem não encontrado" });
  }
  if (character.currentHp <= 0) {
    return res.status(400).json({ error: "Personagem está incapacitado e não pode agir" });
  }

  const enemy = getOrCreateEnemy(characterId, nodeId);
  if (!enemy) {
    return res.status(404).json({ error: "Nenhum encontro de combate ativo neste nó" });
  }

  const events = resolveCombatTurn(character, enemy, action as CombatAction);

  // Combate terminou (vitória ou derrota) — encerra a sessão do inimigo.
  if (character.currentHp <= 0 || enemy.currentHp <= 0) {
    clearEnemy(characterId, nodeId);
  }

  res.json({ events, characterState: character, enemyState: enemy });
});

export default router;
