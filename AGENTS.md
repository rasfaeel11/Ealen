# AGENTS.md — Eälen: O Canto das Primeiras Luzes

> RPG de navegador (React + Node + Supabase). Cole cada prompt abaixo no Cursor/Claude Code, na ordem. Rode um, teste, confirme que funciona, só então vá pro próximo — não cole os 6 de uma vez numa sessão só, o agente perde contexto e mistura decisões de passos diferentes.

## Projeto relacionado (repo separado, sem dependência de código)

Existe um segundo projeto, "Balanceador de Combate + IA de Inimigo" (Python, standalone), em outro repositório. Ele reimplementa as regras de combate isoladamente em Python pra balancear classes numericamente e treinar um agente de IA. Não há import de código entre os dois repos — a única ligação é conceitual (mesmas classes/atributos como referência). Se algum dia os parâmetros balanceados por aquele projeto forem incorporados aqui, isso entra como um valor de configuração (ex: JSON com os números finais), não como dependência de código — não assuma isso agora.

## Referência: Sistema de Atributos (Tirán)

| Atributo | Runa | Tipo | Governa |
|---|---|---|---|
| Dain | Força | Combate | Dano corpo-a-corpo |
| Eir | Ressonância/Espírito | Combate | Dano/cura mágica |
| Nath | Vitalidade | Combate | HP máximo |
| Il | Percepção | Combate | Precisão / chance de crítico |
| Or | Densidade | Combate | Defesa/armadura |
| Len | Som/Voz | Interação | Carisma — checks de diálogo/persuasão |
| Ul | Mistério | Interação | Sabedoria/Intelecto — checks de lore/enigma |

**Povos:** Althirim, Miraven, Taharim, Kelbar
**Ordens (classes):** Luminar (Tank/Suporte), Entropista (Debuffer), Cantor de Eälen (Controle), Guardião (Tank Ofensivo), Sombrílico (Anti-Mago), Rachador (Sniper Físico)

## Prompt 1 — Estrutura do monorepo + modelagem de dados

```
Quero criar um monorepo novo do zero pra um RPG de navegador chamado "Eälen: O Canto das Primeiras Luzes".

Estrutura:
- Monorepo com npm workspaces
- /client: React + Vite + TypeScript + Tailwind CSS
- /server: Node.js + Express + TypeScript
- /shared: pasta de tipos TS compartilhados entre client e server

Configure os workspaces no package.json raiz, com scripts "dev:client" e "dev:server".

Em /shared/types, crie os seguintes tipos TypeScript:

1. Attributes: objeto com 7 chaves numéricas: dain, eir, nath, il, or, len, ul (atributos do RPG, nomeados a partir de runas de um alfabeto sagrado do mundo)

2. Race: union type com os valores "althirim" | "miraven" | "taharim" | "kelbar", e um objeto RACE_MODIFIERS que dá +1/-1 em atributos específicos por raça (pode propor valores coerentes com: Althirim = povo da contemplação/sabedoria, Miraven = povo da memória/lua, Taharim = povo do trabalho/sol, Kelbar = povo da sombra/compaixão)

3. CharacterClass: union type com "luminar" | "entropista" | "cantor_de_ealen" | "guardiao" | "sombrilico" | "rachador", e um objeto CLASS_INFO com role (ex: "Tank/Suporte") e atributo(s) primário(s) de cada classe

4. Character: { id, name, race: Race, characterClass: CharacterClass, level, xp, attributes: Attributes, currentHp, maxHp, currentNodeId }

5. MapNode: { id, name, description, connections: string[] (ids de outros nós), encounterType: "combat" | "dialogue" | "lore" | "none", encounterId?: string }

6. Ability: { id, name, characterClass: CharacterClass, scalingAttribute: keyof Attributes, description, unlockLevel }

Depois de criar os tipos, crie 2-3 exemplos concretos de cada (personagens, nós de mapa, habilidades) num arquivo de seed/mock, só pra eu conseguir visualizar os dados fazendo sentido.

Não crie nenhuma UI ou rota ainda — só a estrutura de pastas e os tipos.
```

## Prompt 2 — Motor de combate no backend (como sequência de eventos)

```
No /server, crie um motor de combate por turnos. Regra central: o combate NUNCA anima nada no servidor — ele só calcula e retorna uma lista ORDENADA de eventos, que o frontend vai consumir depois pra animar.

Crie o tipo CombatEvent (union type) com variantes como:
- { type: "roll", actor: string, value: number, target: number } (ex: rolagem de d20 vs CA)
- { type: "hit" | "miss", actor: string }
- { type: "damage", target: string, amount: number, remainingHp: number }
- { type: "statusApplied", target: string, status: string } (ex: debuff de Tháran aplicado por um Entropista)
- { type: "death", actor: string }
- { type: "victory", winner: string }

Crie a função resolveCombatTurn(character: Character, enemy: Character, action: string): CombatEvent[] que:
1. Calcula iniciativa (baseado em "il")
2. Resolve o ataque: d20 + atributo relevante vs defesa do oponente (baseado em "or")
3. Se acertar, calcula dano baseado no atributo primário da classe do atacante
4. Gera a lista de eventos na ordem em que aconteceram

Crie uma IA simples pro inimigo: se HP do inimigo < 30%, prioriza ação defensiva/cura se a classe tiver; senão ataca.

Crie o endpoint POST /api/combat/:nodeId/action que recebe { characterId, action }, roda o motor, e retorna { events: CombatEvent[], characterState, enemyState }.

Por enquanto pode usar personagens mockados em memória (sem banco ainda, isso é o próximo passo).
```

## Prompt 3 — Supabase: autenticação e persistência

```
Configure o Supabase no /server (cliente supabase-js) e no /client.

Crie o schema no Supabase (me dê o SQL das tabelas):
1. characters: id, user_id (FK para auth.users), name, race, character_class, level, xp, attributes (jsonb), current_hp, max_hp, current_node_id, created_at
2. combat_log: id, character_id, enemy_name, result ("victory" | "defeat"), xp_gained, created_at (isso vira o "Salão das Lendas"/leaderboard)

Configure Row Level Security nas tabelas pra cada usuário só ver/editar seus próprios personagens.

No /client, implemente autenticação por magic link (email) usando o Supabase Auth. Crie:
- Uma tela de login simples (input de email + botão "enviar link")
- Um hook useAuth() que expõe o usuário atual e estado de loading
- Proteção de rota: se não tiver usuário logado, redireciona pra tela de login

No /server, crie os endpoints:
- GET /api/characters/me (retorna o personagem do usuário logado, ou 404 se não tiver)
- POST /api/characters (cria personagem novo pro usuário)
- PATCH /api/characters/:id (atualiza HP, XP, nível, posição no mapa)

Valide o JWT do Supabase em cada request autenticada (middleware de auth no Express).
```

## Prompt 4 — Mapa em grafo navegável (React Flow)

```
No /client, instale e configure a biblioteca @xyflow/react (React Flow).

Crie a tela /map que:
1. Busca os MapNodes do backend (crie o endpoint GET /api/map/nodes no server, retornando os nós mockados do Prompt 1 por enquanto)
2. Renderiza cada MapNode como um nó do React Flow, e cada "connections" como uma edge
3. Destaca visualmente o nó onde o personagem está atualmente (currentNodeId), com uma cor/borda diferente
4. Nós NÃO conectados ao nó atual aparecem meio apagados/desabilitados (não clicáveis)
5. Clicar num nó conectado dispara uma chamada POST /api/characters/:id/move (crie esse endpoint, que valida se o destino é realmente uma conexão válida do nó atual, e atualiza currentNodeId no Supabase)
6. Depois de mover, se o novo nó tiver encounterType "combat", navega pra tela de combate; se "lore", mostra um modal com texto; se "none", só atualiza a posição

Estilize com Tailwind numa estética "códice místico": fundo escuro, dourado como cor de destaque, fonte serifada (pode usar a fonte "Cinzel" do Google Fonts pros títulos). Evite gradientes genéricos de template — quero que pareça um manuscrito antigo, não um dashboard SaaS.
```

## Prompt 5 — Tela de combate animada (Framer Motion)

```
No /client, instale framer-motion.

Crie a tela de combate que:
1. Ao entrar num nó de combate, chama o endpoint de combate do Prompt 2 e recebe o array de CombatEvent
2. Anima os eventos EM SEQUÊNCIA (não tudo de uma vez): cada evento tem sua própria animação antes do próximo aparecer
   - "roll": mostra um número de dado "rolando" (troca de números rápido por ~600ms antes de fixar no valor final)
   - "hit"/"miss": flash de cor (vermelho pra hit, cinza pra miss) no personagem alvo
   - "damage": número de dano "voando" pra cima e desaparecendo, barra de HP animando (tween) até o novo valor
   - "statusApplied": ícone de debuff aparecendo com fade-in ao lado do retrato do personagem
   - "death": personagem "cai" (rotação + fade) e sai da tela
   - "victory": modal de vitória com resumo (XP ganho, dano total causado)
3. Um log de texto ao lado narrando cada evento em português, tipo "Rafael ataca o Goblin: 17 vs CA 15 — ACERTOU! 6 de dano."
4. Botões de ação (Atacar, Defender, Habilidade) desabilitados enquanto a animação da sequência anterior não terminar

Use os mesmos tokens visuais (Cinzel, dourado, fundo escuro) da tela de mapa.
```

## Prompt 6 — Sistema de leveling

```
Implemente o sistema de progressão de nível, ligando o que já existe:

No /server:
1. Crie a fórmula de XP necessário por nível (ex: xpParaProximoNivel = nivel * 100, ajuste se quiser algo com curva mais suave)
2. Ao final de um combate vitorioso (evento "victory"), calcule XP ganho baseado no nível do inimigo, some ao personagem no Supabase
3. Se o XP passar do threshold, suba de nível: incremente level, resete xp pro excedente, aumente os atributos do personagem (o atributo primário da classe sobe mais que os outros — puxe do CLASS_INFO do Prompt 1)
4. Se o novo nível bater com o unlockLevel de alguma Ability da classe do personagem, adicione essa habilidade à lista de habilidades desbloqueadas do personagem (crie a coluna/tabela pra isso no Supabase)
5. Retorne no response do endpoint de combate um campo levelUp: { leveledUp: boolean, newLevel?, newAbility?: Ability }

No /client:
1. Se levelUp.leveledUp vier true na resposta do combate, mostre um modal/animação de "SUBIU DE NÍVEL" depois da sequência de combate terminar, com Framer Motion (algo celebratório — luz dourada expandindo, por exemplo, coerente com a estética de "Primeiras Luzes")
2. Se ganhou habilidade nova, mostre ela destacada no mesmo modal
```

## Depois desses 6

Len e Ul (carisma e sabedoria/intelecto) ainda não são usados em nenhum desses prompts — eles existem no tipo `Attributes` mas não têm mecânica ainda. Isso é intencional: diálogo e enigmas são um sistema à parte (telas de diálogo com múltiplas escolhas, checks de Len/Ul pra desbloquear respostas ou resolver puzzles de lore), que vale construir só depois que mapa + combate + leveling estiverem de pé e jogáveis.

Toda vez que terminar uma tarefa, faca o commit. O push eu que faco.
