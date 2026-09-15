import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserClient, supabaseAnon } from "../lib/supabase";

export interface AuthedRequest extends Request {
  user: { id: string; email: string | undefined };
  supabase: SupabaseClient;
}

/**
 * Exige um JWT válido do Supabase no header Authorization (Bearer <token>).
 * Em caso de sucesso, anexa `user` (id/email do usuário autenticado) e
 * `supabase` (cliente PostgREST escopado a esse usuário, respeitando RLS)
 * ao request, pra as rotas usarem.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acesso ausente" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Token de acesso inválido ou expirado" });
    return;
  }

  const authedReq = req as AuthedRequest;
  authedReq.user = { id: data.user.id, email: data.user.email };
  authedReq.supabase = createUserClient(token);

  next();
}
