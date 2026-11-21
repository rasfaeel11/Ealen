# O jogo (título a definir)

Jogo de ação 3D em terceira pessoa para navegador, em three.js. A câmera fica no ombro, como num shooter em
terceira pessoa, e a arma é a magia: o jogador mira e conjura. Joga-se sozinho. O mundo é o da série de Karuã; a
história é nova e ainda está sendo escrita (`docs/historia.md`).

Este arquivo vale para qualquer IA que trabalhe aqui (Claude, Gemini, Antigravity, outras). É curto de propósito:
traz as regras e o mapa do projeto. O resto mora em `docs/`, e cada doc trata de uma coisa só.

> Os jogos de antes estão guardados: o RPG tático 2D *Três na Estrada* na tag `tatico-2d`, e o AGENTS, o roteiro e
> os docs dele em `docs/legado/`. Consulte para ver como uma regra do mundo virou mecânica, sem copiar a forma.

## 1. O que manda

1. **A gameplay vem primeiro.** O jogo pode ser feio, mas precisa ser divertido. Entre arte e sensação de jogo
   (resposta do controle, peso da magia, leitura do inimigo), ganha a sensação. Tudo começa com provisório
   (manequim, caixa), e o jogo nunca espera pela arte.
2. **O cânone manda no mundo.** A história mora em `../historiav2` (bíblia, fichas, `referencias/`), e o jogo
   obedece. Fato novo (nome, lugar, criatura, regra de magia) não se inventa no código: vai como proposta para o
   autor (`docs/decisoes.md`) e só entra depois de aprovado. Tudo o que o jogo mostra vira cânone que os livros
   terão de respeitar. Na dúvida, mostre menos.
3. **Todo sistema serve a uma cena.** Sistema que nenhuma luta, lugar ou momento da história pede não entra.
4. **A regra se testa sem tela.** A simulação roda em Node, sem three.js nem DOM, e todo comportamento de jogo
   tem teste. Ver §4.

## 2. O que o jogo nunca pode fazer (cânone)

- Nenhum rosto do Enganador aparece (Jupimã, Nhambiku, Zimridar ou um rosto novo).
- Mito, árvore, canto e profecia nunca se confirmam nem se desmentem. Nenhum vestígio da singularidade em cena:
  a singularidade está perdida (`magia` §3.6).
- Nenhuma caixa misteriosa nova sem a resposta escrita na bíblia antes.
- Personagem dos livros que aparecer chega aos livros como os livros o mostram: sem morte, marca ou segredo
  revelado que os contradiga (o segredo de Xanduí, por exemplo, nunca é dito).
- Vethrun, Sem-Ferrugem, dragões de alto nível e o Descendente não aparecem.
- A magia segue `../historiav2/referencias/magia.md`: tem custo, deixa marca, se recita ou se grava. Magia sem
  custo não existe.
- Nome real de pessoa, lugar ou obra, nunca. Criatura de folclore real, também não.
- Nomes humanos seguem `../historiav2/alfabeto.md` (tupi-guarani: sem l, f, z, v nem rr; sílaba termina em
  vogal; lugares em -tyba, -guá, -pe). Demônio, elfo e dragão seguem as listas deles.

Tom: adulto e sombrio, humor só dos personagens, mostrar e não contar. O tema da série é **respeitar o tempo**:
a magia cobra a pressa.

## 3. Os pilares de gameplay

Toda mecânica nova se mede por estes cinco. São proposta do co-autor (`docs/decisoes.md`); detalhe em
`docs/combate.md`.

1. **A magia é física.** O conceito de partida é atração e repulsão: puxar, empurrar, arremessar, desarmar,
   desviar projétil, puxar-se até um ponto (`magia` §3.6). Gente, bicho e coisa voam. O cenário é munição.
2. **Recitar leva tempo.** Segurar para recitar, soltar para conjurar. Apanhar no meio quebra o texto, e ele
   recomeça do começo (`magia` §2.7). Encurtar o cântico sai mais rápido e cobra no corpo (§2.6).
3. **O tamanho certo é o mais barato.** Todo feitiço tem um tamanho padrão; maior ou menor custa mais mana
   (`magia` §2.8). Acertar o ponto é habilidade.
4. **A pressa cobra.** Gastar mana demais de uma vez deixa a marca (sangue, tremor na mira) e chama o que sente
   mana, como o Ykuruã (`bestiario` §1). Quem prepara e mede vence.
5. **Preparar antes vale.** A magia gravada (círculo no chão, objeto) se escreve fora da luta e se ativa na
   hora. Chegar preparado num lugar muda a luta.

## 4. Arquitetura

Detalhe e motivos em `docs/arquitetura.md`. O resumo que toda IA precisa saber:

```
sim/       A simulação. TypeScript puro + Rapier (física, WASM, roda em Node). Sem three.js, sem DOM, sem window,
           sem fetch, sem Date.now/Math.random. Passo fixo de 60 Hz, RNG com semente. Intenção entra, evento sai.
game/      O client. three.js (render e animação), câmera no ombro, input, áudio, HUD em DOM (Preact). Lê o
           estado da sim e reproduz os eventos; nunca decide regra. Vite.
content/   Dados: feitiços, inimigos, itens, números de jogo, níveis, história (Ink). Sem código.
tools/     Scripts: Blender → GLB e marcadores do nível, navmesh, conferência de assets, bots que jogam sem tela.
desktop/   Electron (empacota game/ para a Steam). Já existe.
art/       Fonte da arte (.blend, prompts). O que o jogo carrega vai para game/public/assets/.
```

As regras que não se quebram:

- **A sim não conhece o render.** `game/` importa `sim/`; `sim/` nunca importa `game/` nem `three`. O jogo
  inteiro roda em Node sem tela: é assim que bot testa luta, número e história.
- **Intenção entra, evento sai.** O input vira intenção (`move`, `look`, `aim {origem, direção}`, `recite`,
  `release`, `jump`, `dodge`, `interact`...); a sim muda o estado e solta eventos (`hit`, `pulled`, `thrown`,
  `recitationBroken`, `manaBurst`, `died`...). Som, partícula, tremida e número na tela saem dos eventos.
- **A física é da sim.** Corpos, colisão, o controlador do personagem (cápsula cinemática) e os objetos que
  voam vivem no Rapier, dentro da sim. O render só copia posição e rotação, interpolando entre ticks.
- **A animação é enfeite.** Quem decide onde o corpo está e quando o golpe sai é a sim, pelos números de
  `content/`. A animação se ajusta ao tempo da regra, nunca o contrário (sem root motion).
- **A câmera é do client.** Mola com colisão, troca de ombro, zoom ao mirar. A mira vira intenção com origem e
  direção do raio da câmera, e a sim acha o ponto.
- **Tudo que é número está em `content/`**, não no código, e se ajusta com o jogo rodando (`F1`, só no dev).
- **Asset é GLB.** 1 unidade = 1 metro, Y para cima, origem no pé, clipes com os nomes de `docs/assets.md`.
  Asset que falta cai no provisório e nunca quebra o jogo.
- **Save é JSON com versão**, com migração a cada versão nova.
- Sem servidor no caminho do jogo. O alvo é navegador e Electron/Steam.

O que vem do jogo 2D e se aproveita (o runner de Ink, o save, a ponte com o cânone, o Electron) passa para
`sim/`, `content/` e `game/` pelas tarefas. Até lá `client/` e `shared/` são legado: não se cresce neles.

## 5. Como trabalhar aqui

- **Tarefas** em `docs/tarefas.md`: uma por vez, com o critério de pronto escrito. Ao terminar, tire-a da lista e
  ponha uma linha em `docs/historico.md` dizendo o que entrou. **Toda tarefa terminada é um commit. O push é do
  autor.**
- **Decisões** em `docs/decisoes.md`: uma entrada por decisão (data, o que, por quê, quem decidiu). Decisão que
  toca o cânone espera o autor.
- **Antes do commit**, `npm run check` (tipos e testes) passa. Se mudou número de luta, rode também os bots
  (`tools/bots`) e diga no histórico o que mudou.
- **Mudou uma peça, muda o doc dela.** Cada doc de `docs/` é dono de um assunto; não repita texto entre eles.
- Nome no código em inglês; texto do jogo e docs em português. Termo do mundo sem tradução boa fica em português
  também no código (`folego`, `recite`, `gravada`).
- Diga o que foi visto e o que não foi. "Testado na sim, não visto na tela" é uma frase válida e obrigatória.

### Mapa dos docs

| Doc | O que tem |
|---|---|
| `docs/arquitetura.md` | As pastas, o laço da sim, a física, a câmera, intenções e eventos, os motivos |
| `docs/combate.md` | A luta: controles, mira, recitação, tamanho, custo, marca, inimigos |
| `docs/historia.md` | O mundo que o jogo usa, e a história nova (em escrita) |
| `docs/mundo.md` | O mapa do mundo, na descrição do autor |
| `docs/assets.md` | Formato, escala, esqueleto, clipes, o caminho Blender → jogo, o provisório |
| `docs/arte.md` | Direção de arte e brasões (parte é do 2D e vai sendo revista) |
| `docs/escolhas.md` | Decisões do co-autor sobre o cânone, do tempo do 2D |
| `docs/decisoes.md` | Registro de decisões daqui em diante |
| `docs/tarefas.md` | A lista de tarefas |
| `docs/historico.md` | O que entrou, tarefa por tarefa |

## 6. Várias IAs no projeto

- Este arquivo é a porta de entrada de todas. `CLAUDE.md` e `GEMINI.md` só o importam.
- Leia só o doc do assunto da tarefa, não `docs/` inteiro.
- **Texto do jogo e fato do mundo** (fala, nome, descrição, história) só com o cânone aberto do lado, e vão para o
  autor antes de entrar. Nenhuma IA inventa mundo sozinha.
- Código vindo de outra IA é rascunho até passar em `npm run check` e ser lido por quem faz o commit.
- Blender por IA (MCP ou script) segue `docs/assets.md`; todo modelo é olhado antes de entrar.
- O Antigravity (`agy`, pelo subagente `antigravity-delegate`) serve para ler muito material, gerar boilerplate,
  testes repetitivos e imagens. Não para arquitetura, bug sutil ou revisão final. Nunca mande segredo.
- Ao fim de uma tarefa, diga o que foi delegado a outra IA e o que foi corrigido.
