-- Eälen: O Canto das Primeiras Luzes
-- Schema do Supabase (rodar no SQL editor do projeto).

create extension if not exists pgcrypto;

-- ============================================================
-- characters
-- ============================================================
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  race text not null
    check (race in ('althirim', 'miraven', 'taharim', 'kelbar')),
  character_class text not null
    check (character_class in ('luminar', 'entropista', 'cantor_de_ealen', 'guardiao', 'sombrilico', 'rachador')),
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  attributes jsonb not null,
  current_hp integer not null check (current_hp >= 0),
  max_hp integer not null check (max_hp >= 1),
  current_node_id text not null,
  -- Inventory<ConsumableItem> (ver /shared/types/inventory.ts) — os itens em
  -- si (efeito, raridade, descrição) são dados estáticos definidos em
  -- código; aqui só persistimos quais o personagem tem e em que quantidade.
  inventory jsonb not null default '{"slots":[],"maxSlots":12}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters (user_id);

-- ============================================================
-- combat_log ("Salão das Lendas")
-- ============================================================
create table if not exists public.combat_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  enemy_name text not null,
  result text not null check (result in ('victory', 'defeat')),
  xp_gained integer not null default 0 check (xp_gained >= 0),
  created_at timestamptz not null default now()
);

create index if not exists combat_log_character_id_idx on public.combat_log (character_id);

-- ============================================================
-- Row Level Security — cada usuário só vê/edita seus próprios personagens
-- e o histórico de combate ligado a eles.
-- ============================================================
alter table public.characters enable row level security;
alter table public.combat_log enable row level security;

create policy "characters_select_own" on public.characters
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "characters_insert_own" on public.characters
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "characters_update_own" on public.characters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "characters_delete_own" on public.characters
  for delete to authenticated using ((select auth.uid()) = user_id);

-- combat_log não tem user_id direto; a posse é resolvida via characters.user_id.
create policy "combat_log_select_own" on public.combat_log
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = combat_log.character_id and c.user_id = (select auth.uid())
    )
  );

create policy "combat_log_insert_own" on public.combat_log
  for insert to authenticated with check (
    exists (
      select 1 from public.characters c
      where c.id = combat_log.character_id and c.user_id = (select auth.uid())
    )
  );

-- Nota: quando o "Salão das Lendas" virar um leaderboard público, essas
-- policies de combat_log vão precisar de uma policy de select adicional
-- (ex: liberar leitura pública, ou uma view materializada agregada) —
-- por ora, cada usuário só lê o próprio histórico, como pedido.

-- ============================================================
-- character_abilities — habilidades desbloqueadas por level up (Prompt 6)
-- ============================================================
-- As habilidades em si (id, nome, descrição, atributo de escala, unlockLevel)
-- são dados estáticos definidos em /shared (não há tabela "abilities" — o
-- ability_id aqui referencia o Ability.id definido em código). Esta tabela
-- só registra QUAIS habilidades cada personagem já desbloqueou.
create table if not exists public.character_abilities (
  character_id uuid not null references public.characters(id) on delete cascade,
  ability_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (character_id, ability_id)
);

-- Nenhum índice extra em character_id: a primary key (character_id, ability_id)
-- já serve como índice para buscas por character_id (coluna mais à esquerda).

alter table public.character_abilities enable row level security;

create policy "character_abilities_select_own" on public.character_abilities
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_abilities.character_id and c.user_id = (select auth.uid())
    )
  );

create policy "character_abilities_insert_own" on public.character_abilities
  for insert to authenticated with check (
    exists (
      select 1 from public.characters c
      where c.id = character_abilities.character_id and c.user_id = (select auth.uid())
    )
  );
