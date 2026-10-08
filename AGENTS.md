# AGENTS.md — Eälen: O Canto das Primeiras Luzes

> RPG tático pra navegador, feito como jogo de verdade: Phaser 3 + TypeScript, mundo aberto em pixel art, combate em grade travado no próprio mapa, tudo rodando no navegador. A história ainda não está escrita — os sistemas vêm primeiro, e cenários, nomes, falas e kits de habilidade são **placeholder** até ela existir.

## Arquitetura

Monorepo com npm workspaces:

- **`shared/`** — as regras do jogo, em TypeScript puro (sem DOM, sem Node, sem rede). Tipos, Ordens, Povos, bestiário, itens, o motor de combate (`shared/tactics/`) e o mundo (`shared/world/`). Tudo que é regra mora aqui.
- **`client/`** — o jogo: Phaser 3 + Vite. Só apresentação e entrada; não calcula regra nenhuma.
- **`server/`** — Express + Supabase, herdado da versão anterior. **O jogo não depende dele**: hoje só sobram as rotas de personagem/mapa e a ferramenta `balance:matrix`. Fica como base caso um dia exista save na nuvem.

### As decisões de design

- **Combate em grade quadrada, no mapa de exploração**, aos moldes de D&D/BG3, sem tela de batalha. Fora de luta o personagem anda livre; na luta o chão conta em quadrados. Diagonal custa 1.
- **Grupo opcional**: o motor aceita qualquer número de combatentes de cada lado; herói solo é só um grupo de um. (Ainda não existem companheiros — hoje o grupo é sempre o herói.)
- **Mundo aberto como grafo de áreas**: cada nó é um mapa feito à mão (Tiled), as arestas são as saídas, nenhuma travada por história. Nível de inimigo fixo por área.
- **Visual top-down 3/4** (Sea of Stars), pixel art. A altura vem da arte e da ordem de desenho, não de uma câmera inclinada — não é isométrico.
- **IA de inimigo por utilidade**: dá nota a todas as jogadas possíveis e fica com a maior, com pesos por criatura (`shared/tactics/ai.ts`).
- **Diálogos em Ink** (`inkjs`), numa caixa com fala em cima e opções embaixo; testes de Len/Ul chamados pelo texto. Ainda não existe.

Fases: (1) motor tático — **feito**; (2) mundo: andar, câmera, colisão, troca de área — **feito**; (3) combate no mapa — **feito**; (4) IA de utilidade — **feito**; (5) posição e terreno — cobertura, flanco e altura **feitos**, superfícies e destrutíveis **faltam**; (6) diálogo e flags; (7) save ampliado.

### A regra central do combate

O motor **nunca anima nada**. `applyCommand(encounter, command)` (`shared/tactics/engine.ts`) recebe UM comando de quem está no turno, valida, muta a luta e devolve uma lista ORDENADA de `TacticalEvent`; o `CombatController` do client reproduz esses eventos um por vez. Regra nova de combate entra no motor e vira evento; o client só aprende a desenhar o evento (um `case` em `CombatController.animate`).

### O motor tático (`shared/tactics/`)

- `startEncounter({ grid, units, seed })` rola a iniciativa e abre a luta; `applyCommand` aceita `move`, `ability`, `useItem` e `endTurn`. Comando recusado não muda nada.
- `Encounter` é dado puro: `structuredClone` dá uma luta independente, com o dado (seed) junto. Nada de `Math.random` aqui dentro — mesma seed e mesmos comandos dão a mesma luta.
- Cada turno tem movimento, ação, ação bônus e uma reação (ataque de oportunidade).
- Habilidades são dados (`abilities.ts`): alcance, alvo, área, rolagem de ataque e uma lista de efeitos (`damage`, `heal`, `status`, `push`). Condições também (`statuses.ts`). Os kits atuais das Ordens são provisórios, montados sobre os nomes de `shared/combatArts.ts`.
- `reachableTiles`, `abilityTargets` e `affectedUnits` são a mesma regra pra interface, pro motor e pra IA: a interface só oferece o que o motor aceitaria.
- A posição entra na rolagem de ataque por `attackEdge` (`attack.ts`), também uma regra só pros três: **cobertura** (+2 na defesa de quem está colado num quadrado `cover` atravessado pela reta do ataque; só a 2 quadrados ou mais; numa área, medida do ponto de impacto), **flanco** (+2 no ataque corpo a corpo com um aliado num dos três quadrados opostos) e **altura** (+2 atacando de um chão de `elevation` maior, -2 de um menor). `attackOdds` dá a chance sem rolar nada — é o que a IA usa e o que a interface mostra ao mirar. Os números ficam no topo do arquivo.
- `chooseCommand` (`ai.ts`) é a IA: recebe a luta, devolve o próximo comando de quem está no turno; chama-se de novo depois de cada comando, até ela devolver `endTurn`. Uma jogada é um quadrado onde parar mais o que fazer de lá, e a nota soma o que as habilidades rendem EM MÉDIA (acerto x dano, chance de derrubar, cura, guarda, fogo amigo em área) com o que a posição custa (dano a que fica exposto, ataque de oportunidade, distância andando até o inimigo). Ela não rola dado, não muta a luta e é determinística. `planTurn` devolve o plano com as notas — é o que os testes conferem.
- Os pesos (`AiProfile`: `aggression`, `finisher`, `support`, `caution`) vêm de `ai` na entrada do bestiário e viajam na `Unit`. Criatura com jeito novo de lutar é mexer nesses números; os atuais são provisórios.
- A chance de acerto da IA vem de `attackOdds`, então ela cerca, sobe e se esconde atrás de pedra sem regra própria pra isso. A conta de dano médio (`forecast`) ESPELHA o efeito `damage` do motor: mudou a regra no motor, muda na IA também. Efeito novo de habilidade precisa de um `case` em `abilityValue`, senão a IA não vê valor nele.
- `basicCommand` é a IA antiga (bate em quem alcança, senão anda em linha reta). Fica como linha de base dos testes.

### O mundo (`shared/world/` + `WorldScene`)

Cada área é um mapa do Tiled (`.tmj`) em `client/public/maps/`, registrado em `shared/world/areas.ts`. O grafo do mundo é o que as saídas dos mapas formam — não existe lista de conexões fora deles. As três áreas atuais (`clareira`, `estrada`, `ruinas`) e os tilesets `placeholder` (chão, 16x16), `placeholder-tall` (coisas de pé, 16x32) e `placeholder-high` (chão elevado, face do degrau e escada, 16x16) são provisórios.

O contrato de quem desenha um mapa (detalhado em `shared/world/tiledMap.ts`):

- Tiles de 16px, mapa ortogonal e finito, camadas em CSV, **tileset embutido no mapa** e registrado pelo nome em `client/src/game/worldAssets.ts`.
- Colisão vem de propriedades do tile, definidas no tileset: `blocksMove`, `blocksSight`, `moveCost`. Não há camada de colisão. É a mesma grade que o combate usa.
- Terreno de combate também: `cover` (pedra, mureta — barra o passo, não a visão) e `elevation` (altura do chão, em degraus). A altura é só vantagem de combate: um patamar se fecha com tiles de face (`blocksMove`) e se abre com a escada, que é um quadrado comum. O salão das `ruinas` tem um.
- Camada cujo nome começa com `sorted` fica "de pé": cada tile é ordenado pelo Y da própria base junto com os personagens, então se passa por trás de uma copa e pela frente do tronco. Coisas altas vêm de um tileset de tiles mais altos que o quadrado (ex: 16x32), com a base no quadrado que ocupam; parede se desenha com o topo em cima e a face frontal embaixo.
- Camada cujo nome começa com `above` é desenhada por cima de tudo; as demais são chão.
- Objetos: `spawn` (ponto; o nome é o id), `exit` (retângulo; propriedades `area` e `spawn`) e `enemy` (ponto; propriedades `creature`, a chave no bestiário, e `group`).

Inimigos ficam de pé no mapa. Chegar a `AGGRO_RANGE` quadrados de um deles, com linha de visão, puxa o grupo inteiro pra luta (`shared/world/encounters.ts`), na grade da própria área. Grupo vencido não volta.

Criatura pode levar consumíveis pra luta (`carries` na entrada do bestiário; `spawnCreature` monta a ficha com a mochila). A IA usa item como o jogador usa, pela ação bônus, e só quando não é desperdício. O que ela NÃO usar fica pra quem vence (`unusedItems` → `grantEncounterRewards`), além do sorteio de `drops`.

### Cenas (`client/src/scenes/`)

`Boot` (carrega sprites, mapas e tilesets) → `Title` → `Prologue` → `ClassSelect` (Povo, Ordem, nome) → `World`.

A `WorldScene` é exploração e combate na mesma cena, com duas câmeras: a do mundo (zoom 3x, segue o personagem) e a da interface (sem zoom). Todo objeto criado passa por `addWorld` ou `addHud`. O combate em si mora em `client/src/game/combat/`: `CombatController` (entrada → comando, eventos → animação) e `CombatHud` (ordem de turnos, registro, barra de ações, resultado).

O peso dos golpes é todo do client, tirado dos eventos: no `damage` o alvo pisca, a câmera treme e as animações congelam um instante (`hitStop`), tudo proporcional a quanto da vida o golpe levou e maior em crítico ou golpe fatal; o alvo recua de quem bateu, e quem escapa dá um passo de lado. Antes de um inimigo usar uma habilidade, os quadrados que ela vai pegar acendem (`telegraph`). Com uma habilidade escolhida, passar o cursor num alvo mostra a chance de acerto e o que a posição soma ou tira. Quem está na vez tem um anel no chão. Tudo isso é provisório como o resto do visual — os números ficam no topo do `CombatController`.

### Sprites

Quem está no mapa (personagem ou criatura) é uma folha 4x4: uma linha por direção, quatro quadros de caminhada, o primeiro servindo de "parado". Enquanto não há arte final, `client/src/game/mapSprites.ts` gera provisórios em tempo de execução com esse layout. Pra trocar por arte de verdade: salvar a folha em `client/public/sprites/` e registrar em `MAP_SHEETS` nesse arquivo — nada mais muda. Ataque, dano e morte hoje são efeitos (bote, clarão, faísca, recuo, achatar e sumir); animações próprias entram quando houver arte.

### Save

Em `localStorage` (`client/src/game/save.ts`): o personagem, onde ele está (área + posição) e os grupos de inimigos já vencidos. Sem login, sem servidor.

### Restrições que valem ouro

- **Nada de dependência de servidor no caminho do jogo.** O alvo de longo prazo inclui empacotar com Electron e vender na Steam; por isso o motor roda no cliente, o save é local e o Vite builda com caminhos relativos (`base: "./"`). Assets são referenciados sem barra inicial (`sprites/x.png`, não `/sprites/x.png`).
- **`shared/` continua puro.** Se precisar de `window`, `fs` ou `fetch`, não é lá. (Os testes em `__tests__/` podem usar Node.)

### Comandos

```
npm run dev:client                              # o jogo, em http://localhost:5173
npm run build --workspace=client                # typecheck + build
npm test                                        # testes sem tela: motor tático, mundo e validação dos mapas
npm run balance:matrix --workspace=server       # taxa de vitória de cada Ordem x criatura, pelo motor real
```

`npm test` lê os mapas de verdade e acusa saída pra área inexistente, ponto de chegada em parede, trecho sem acesso, criatura que não existe e inimigo colado num ponto de chegada.

### Versões anteriores

- A versão em React (mapa em React Flow, combate em Framer Motion, login por Supabase) está na tag `v0-codice`.
- O combate 1 contra 1 por posturas, com tela de batalha própria, e a integração com o balanceador em Python `ealen-IA` (política de Q-learning, `iaTuning.json`) foram removidos na fase 3 e estão no histórico do git, até o commit `7d16c97`. O `ealen-IA` está aposentado: balanceamento agora é rodar o motor real (`balance:matrix`). Dele sobraram só os atributos iniciais das Ordens, fixados em `shared/characterCreation.ts`.

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

---

Fique a vontade de mudar qualquer coisa no prompt se achar que uma solucao é melhor.
Toda vez que terminar uma tarefa, faça o commit. O push o usuário fará.
