import { Router } from "express";
import type { Race, CharacterClass, Attributes } from "@ealen/shared";
import { ATTRIBUTE_KEYS, MOCK_MAP_NODES } from "@ealen/shared";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { rowToCharacter, type CharacterRow } from "../lib/characterMapper";

const router = Router();

router.use(requireAuth);

const VALID_RACES: Race[] = ["althirim", "miraven", "taharim", "kelbar"];
const VALID_CLASSES: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

function isValidAttributes(value: unknown): value is Attributes {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return ATTRIBUTE_KEYS.every((key) => typeof record[key] === "number");
}

// GET /api/characters/me
router.get("/me", async (req, res) => {
  const { user, supabase } = req as unknown as AuthedRequest;

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<CharacterRow>();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Você ainda não tem um personagem" });
    return;
  }

  res.json(rowToCharacter(data));
});

// POST /api/characters
router.post("/", async (req, res) => {
  const { user, supabase } = req as unknown as AuthedRequest;
  const body = req.body as {
    name?: string;
    race?: string;
    characterClass?: string;
    attributes?: unknown;
    maxHp?: number;
    currentNodeId?: string;
  };

  if (!body.name || typeof body.name !== "string") {
    res.status(400).json({ error: "name é obrigatório" });
    return;
  }
  if (!body.race || !VALID_RACES.includes(body.race as Race)) {
    res.status(400).json({ error: `race inválida. Use uma de: ${VALID_RACES.join(", ")}` });
    return;
  }
  if (!body.characterClass || !VALID_CLASSES.includes(body.characterClass as CharacterClass)) {
    res.status(400).json({ error: `characterClass inválida. Use uma de: ${VALID_CLASSES.join(", ")}` });
    return;
  }
  if (!isValidAttributes(body.attributes)) {
    res.status(400).json({ error: `attributes deve conter valores numéricos para: ${ATTRIBUTE_KEYS.join(", ")}` });
    return;
  }
  if (!body.maxHp || typeof body.maxHp !== "number" || body.maxHp < 1) {
    res.status(400).json({ error: "maxHp é obrigatório e deve ser >= 1" });
    return;
  }
  if (!body.currentNodeId || typeof body.currentNodeId !== "string") {
    res.status(400).json({ error: "currentNodeId é obrigatório" });
    return;
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      user_id: user.id,
      name: body.name,
      race: body.race,
      character_class: body.characterClass,
      level: 1,
      xp: 0,
      attributes: body.attributes,
      current_hp: body.maxHp,
      max_hp: body.maxHp,
      current_node_id: body.currentNodeId,
    })
    .select("*")
    .single<CharacterRow>();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(rowToCharacter(data));
});

// PATCH /api/characters/:id
router.patch("/:id", async (req, res) => {
  const { supabase } = req as unknown as AuthedRequest;
  const { id } = req.params;
  const body = req.body as {
    currentHp?: number;
    xp?: number;
    level?: number;
    currentNodeId?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.currentHp !== undefined) updates.current_hp = body.currentHp;
  if (body.xp !== undefined) updates.xp = body.xp;
  if (body.level !== undefined) updates.level = body.level;
  if (body.currentNodeId !== undefined) updates.current_node_id = body.currentNodeId;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo válido pra atualizar (currentHp, xp, level, currentNodeId)" });
    return;
  }

  // RLS garante que só o dono do personagem consegue de fato atualizar a
  // linha; se o id não existir (ou não for dele), a query retorna 0 linhas.
  const { data, error } = await supabase
    .from("characters")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle<CharacterRow>();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Personagem não encontrado" });
    return;
  }

  res.json(rowToCharacter(data));
});

// POST /api/characters/:id/move
// Move o personagem pra um nó vizinho no mapa. Valida que o destino é uma
// conexão real do nó atual antes de persistir no Supabase.
router.post("/:id/move", async (req, res) => {
  const { supabase } = req as unknown as AuthedRequest;
  const { id } = req.params;
  const { destinationNodeId } = req.body as { destinationNodeId?: string };

  if (!destinationNodeId || typeof destinationNodeId !== "string") {
    res.status(400).json({ error: "destinationNodeId é obrigatório" });
    return;
  }

  // RLS garante que só o dono do personagem consegue lê-lo aqui.
  const { data: characterRow, error: fetchError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle<CharacterRow>();

  if (fetchError) {
    res.status(500).json({ error: fetchError.message });
    return;
  }
  if (!characterRow) {
    res.status(404).json({ error: "Personagem não encontrado" });
    return;
  }

  const currentNode = MOCK_MAP_NODES.find((node) => node.id === characterRow.current_node_id);
  if (!currentNode) {
    res.status(409).json({ error: "Nó atual do personagem é desconhecido" });
    return;
  }
  if (!currentNode.connections.includes(destinationNodeId)) {
    res.status(400).json({ error: "Destino não é uma conexão válida a partir do nó atual" });
    return;
  }

  const destinationNode = MOCK_MAP_NODES.find((node) => node.id === destinationNodeId);
  if (!destinationNode) {
    res.status(404).json({ error: "Nó de destino não existe" });
    return;
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("characters")
    .update({ current_node_id: destinationNodeId })
    .eq("id", id)
    .select("*")
    .single<CharacterRow>();

  if (updateError) {
    res.status(400).json({ error: updateError.message });
    return;
  }

  res.json({ character: rowToCharacter(updatedRow), node: destinationNode });
});

export default router;
