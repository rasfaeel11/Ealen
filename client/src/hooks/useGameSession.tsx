import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Character,
  CharacterClass,
  CombatAction,
  CombatActionResult,
  MapNode,
  Race,
} from "@ealen/shared";
import { createStartingAttributes, startingMaxHp } from "@ealen/shared";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabaseClient";
import { apiFetch, ApiError } from "../lib/api";
import {
  activateGuestMode,
  clearGuestSession,
  generateGuestCharacterId,
  isGuestActive,
  loadGuestCharacter,
  saveGuestCharacter,
} from "../lib/guestStorage";

export type SessionMode = "account" | "guest";

export interface NewCharacterInput {
  name: string;
  race: Race;
  characterClass: CharacterClass;
  currentNodeId: string;
}

interface GameSessionValue {
  /** null enquanto não sabemos se há sessão (conta ou convidado), ou se não há nenhuma. */
  mode: SessionMode | null;
  loading: boolean;
  character: Character | null;
  needsCharacter: boolean;
  createCharacter(input: NewCharacterInput): Promise<Character>;
  moveCharacter(destinationNodeId: string, mapNodes: MapNode[]): Promise<{ character: Character; node: MapNode }>;
  resolveCombatAction(nodeId: string, action: CombatAction): Promise<CombatActionResult>;
  enterGuestMode(): void;
  exitSession(): Promise<void>;
}

const GameSessionContext = createContext<GameSessionValue | null>(null);

/**
 * Unifica os dois jeitos de jogar Eälen atrás de uma única API:
 * - "account": personagem persistido no Supabase, atrelado ao usuário logado.
 * - "guest": personagem só no localStorage deste navegador, sem conta e sem
 *   nada no Supabase — as mesmas rotas de combate/mapa funcionam, mas via
 *   um endpoint de combate que não persiste (ver server/src/routes/combat.ts).
 */
export function GameSessionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [guestActive, setGuestActive] = useState(() => isGuestActive());
  const [character, setCharacterState] = useState<Character | null>(null);
  const [characterLoaded, setCharacterLoaded] = useState(false);

  const mode: SessionMode | null = user ? "account" : guestActive ? "guest" : null;

  // Se um login por conta "vence" um modo convidado ativo, descarta o
  // progresso local de convidado — a partir daqui o personagem é o da conta.
  useEffect(() => {
    if (user && guestActive) {
      clearGuestSession();
      setGuestActive(false);
    }
  }, [user, guestActive]);

  useEffect(() => {
    let active = true;

    if (mode === "guest") {
      setCharacterState(loadGuestCharacter());
      setCharacterLoaded(true);
      return;
    }

    if (mode === "account") {
      setCharacterLoaded(false);
      apiFetch<Character>("/api/characters/me")
        .then((data) => {
          if (active) setCharacterState(data);
        })
        .catch((err) => {
          if (!active) return;
          if (err instanceof ApiError && err.status === 404) {
            setCharacterState(null);
            return;
          }
          throw err;
        })
        .finally(() => {
          if (active) setCharacterLoaded(true);
        });
      return () => {
        active = false;
      };
    }

    setCharacterState(null);
    setCharacterLoaded(false);
  }, [mode]);

  const setCharacter = useCallback(
    (next: Character) => {
      setCharacterState(next);
      if (mode === "guest") saveGuestCharacter(next);
    },
    [mode],
  );

  const createCharacter = useCallback(
    async (input: NewCharacterInput): Promise<Character> => {
      const attributes = createStartingAttributes(input.race, input.characterClass);
      const maxHp = startingMaxHp(attributes);

      if (mode === "account") {
        const created = await apiFetch<Character>("/api/characters", {
          method: "POST",
          body: JSON.stringify({ ...input, attributes, maxHp }),
        });
        setCharacterState(created);
        return created;
      }

      const guestCharacter: Character = {
        id: generateGuestCharacterId(),
        name: input.name,
        race: input.race,
        characterClass: input.characterClass,
        level: 1,
        xp: 0,
        attributes,
        currentHp: maxHp,
        maxHp,
        currentNodeId: input.currentNodeId,
      };
      saveGuestCharacter(guestCharacter);
      setCharacterState(guestCharacter);
      return guestCharacter;
    },
    [mode],
  );

  const moveCharacter = useCallback(
    async (destinationNodeId: string, mapNodes: MapNode[]) => {
      if (!character) throw new Error("Nenhum personagem ativo");

      if (mode === "account") {
        const result = await apiFetch<{ character: Character; node: MapNode }>(
          `/api/characters/${character.id}/move`,
          { method: "POST", body: JSON.stringify({ destinationNodeId }) },
        );
        setCharacterState(result.character);
        return result;
      }

      const currentNode = mapNodes.find((n) => n.id === character.currentNodeId);
      if (!currentNode || !currentNode.connections.includes(destinationNodeId)) {
        throw new Error("Destino não é uma conexão válida a partir do nó atual");
      }
      const destinationNode = mapNodes.find((n) => n.id === destinationNodeId);
      if (!destinationNode) throw new Error("Nó de destino não existe");

      const updated: Character = { ...character, currentNodeId: destinationNodeId };
      setCharacter(updated);
      return { character: updated, node: destinationNode };
    },
    [character, mode, setCharacter],
  );

  const resolveCombatAction = useCallback(
    async (nodeId: string, action: CombatAction): Promise<CombatActionResult> => {
      if (!character) throw new Error("Nenhum personagem ativo");

      const path = mode === "account" ? `/api/combat/${nodeId}/action` : `/api/combat/${nodeId}/guest-action`;
      const body = mode === "account" ? { characterId: character.id, action } : { character, action };

      const result = await apiFetch<CombatActionResult>(path, { method: "POST", body: JSON.stringify(body) });
      setCharacter(result.characterState);
      return result;
    },
    [character, mode, setCharacter],
  );

  const enterGuestMode = useCallback(() => {
    activateGuestMode();
    setGuestActive(true);
  }, []);

  const exitSession = useCallback(async () => {
    if (mode === "account") {
      await supabase.auth.signOut();
    } else if (mode === "guest") {
      clearGuestSession();
      setGuestActive(false);
    }
    setCharacterState(null);
  }, [mode]);

  const loading = authLoading || (mode !== null && !characterLoaded);

  const value = useMemo<GameSessionValue>(
    () => ({
      mode,
      loading,
      character,
      needsCharacter: mode !== null && characterLoaded && character === null,
      createCharacter,
      moveCharacter,
      resolveCombatAction,
      enterGuestMode,
      exitSession,
    }),
    [
      mode,
      loading,
      character,
      characterLoaded,
      createCharacter,
      moveCharacter,
      resolveCombatAction,
      enterGuestMode,
      exitSession,
    ],
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

export function useGameSession(): GameSessionValue {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error("useGameSession precisa estar dentro de <GameSessionProvider>");
  return ctx;
}
