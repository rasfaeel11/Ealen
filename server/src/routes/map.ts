import { Router } from "express";
import { MOCK_MAP_NODES } from "@ealen/shared";

const router = Router();

// GET /api/map/nodes
// Dado público (não depende de usuário) — por enquanto retorna os nós
// mockados de /shared; futuramente vem de uma tabela `map_nodes`.
router.get("/nodes", (_req, res) => {
  res.json(MOCK_MAP_NODES);
});

export default router;
