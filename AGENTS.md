# O jogo (título a definir)

Jogo de ação 3D em terceira pessoa para navegador, em three.js. A câmera fica no ombro, como num shooter em
terceira pessoa, e a arma é a magia: o jogador mira e conjura. Joga-se sozinho. O mundo é o da série de Karuã; a
história é nova e ainda está sendo escrita (`docs/historia.md`).

Este arquivo vale para qualquer IA que trabalhe aqui (Claude, Gemini, Antigravity, outras). É a porta de entrada:
as regras, o mapa do projeto e **o TODO (§7), que diz em que fase o projeto está**. O resto mora em `docs/`, um
assunto por doc.

## 0. Fase atual

> **Fase: 0, só documentação.** Não existe código. A arquitetura, a luta e o caminho dos assets estão
> decididos no papel (`docs/`); a história nova ainda não. O próximo passo é a tarefa 1 do TODO (§7).
>
> *Atualizado em 2026-11-20.* Quem terminar uma tarefa atualiza esta caixa e o TODO no mesmo commit.

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
5. **O repositório fica enxuto.** Só entra o que o jogo usa agora. Nada de pasta "para depois", cópia de
   referência ou doc duplicado.

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

Toda mecânica nova se mede por estes cinco. São proposta do co-autor (`docs/decisoes.md`); o detalhe está em
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

O detalhe e os motivos estão em `docs/arquitetura.md`. Hoje nenhuma dessas pastas existe; elas nascem pelas
tarefas do TODO.

```
sim/       A simulação. TypeScript puro + Rapier (física, WASM, roda em Node). Sem three.js, sem DOM, sem window,
           sem fetch, sem Date.now/Math.random. Passo fixo de 60 Hz, RNG com semente. Intenção entra, evento sai.
game/      O client. three.js (render e animação), câmera no ombro, input, áudio, HUD em DOM (Preact). Lê o
           estado da sim e reproduz os eventos; nunca decide regra. Vite.
content/   Dados: feitiços, inimigos, itens, números de jogo, níveis, história (Ink). Sem código.
tools/     Scripts: Blender → GLB e marcadores do nível, navmesh, conferência de assets, bots que jogam sem tela.
desktop/   Electron (empacota game/ para a Steam). Vem na tarefa 17.
art/       Fonte da arte (.blend, prompts). O que o jogo carrega vai para game/public/assets/.
```

As regras que não se quebram:

- **A sim não conhece o render.** `game/` importa `sim/`; `sim/` nunca importa `game/` nem `three`. O jogo
  inteiro roda em Node sem tela: é assim que bot testa luta, número e história.
- **Intenção entra, evento sai.** O input vira intenção (`move`, `aim {origem, direção}`, `recite`, `release`,
  `jump`, `dodge`, `interact`...); a sim muda o estado e solta eventos (`hit`, `pulled`, `thrown`,
  `recitationBroken`, `manaBurst`, `died`...). Som, partícula, tremida e número na tela saem dos eventos.
- **A física é da sim.** Corpos, colisão, o controlador do personagem (cápsula cinemática) e os objetos que
  voam vivem no Rapier, dentro da sim. O render só copia posição e rotação, interpolando entre ticks.
- **A animação é enfeite.** Quem decide onde o corpo está e quando o golpe sai é a sim, pelos números de
  `content/`. A animação se ajusta ao tempo da regra, nunca o contrário (sem root motion).
- **A câmera é do client.** Tem mola com colisão, troca de ombro e zoom ao mirar. A mira vira intenção com a
  origem e a direção do raio da câmera, e a sim acha o ponto.
- **Todo número fica em `content/`**, não no código, e se ajusta com o jogo rodando (`F1`, só no dev).
- **Asset é GLB.** 1 unidade = 1 metro, Y para cima, origem no pé, clipes com os nomes de `docs/assets.md`.
  Asset que falta cai no provisório e nunca quebra o jogo.
- **Save é JSON com versão**, com migração a cada versão nova.
- Sem servidor no caminho do jogo. O alvo é navegador e Electron/Steam.

## 5. O que veio antes

Os jogos anteriores saíram do repositório e ficam na tag **`tatico-2d`** (o RPG tático 2D *Três na Estrada*, em
Phaser: código, arte, roteiro, AGENTS com o histórico inteiro). Não procure por eles nas pastas. Para pegar algo
de lá:

```bash
git show tatico-2d:<caminho>          # ler um arquivo
git checkout tatico-2d -- <caminho>   # trazer um arquivo de volta
```

O que vale trazer quando a tarefa pedir: o runner de Ink (`shared/story/runner.ts`), o save
(`shared/save/gameSave.ts`), o Electron (`desktop/main.cjs`), e como referência de mundo o roteiro
(`docs/roteiro.md`) e o resumo da história (`AGENTS.md` §2 a §6, ou `docs/historia.md` no commit `69d35bc`).
A arte gerada bruta do 2D foi para fora do repositório, em `../Ealen-arte-bruta`.

## 6. Como trabalhar aqui

- **Uma tarefa do TODO (§7) por vez**, na ordem. Ao terminar: marque-a como feita no TODO, atualize a caixa da
  fase (§0), ponha uma linha em `docs/historico.md` dizendo o que entrou e faça o commit. **Toda tarefa terminada
  é um commit. O push é do autor.**
- **Decisões** vão para `docs/decisoes.md`: uma entrada por decisão (data, o que, por quê, quem decidiu). Decisão
  que toca o cânone espera o autor.
- **Antes do commit**, `npm run check` (tipos e testes) tem de passar, depois que a tarefa 1 o criar. Se mudou
  número de luta, rode também os bots (`tools/bots`) e diga no histórico o que mudou.
- **Mudou uma peça, muda o doc dela.** Cada doc de `docs/` é dono de um assunto; não repita texto entre eles.
- Nome no código em inglês; texto do jogo e docs em português. Termo do mundo sem tradução boa fica em português
  também no código (`folego`, `recite`, `gravada`).
- Diga o que foi visto e o que não foi. "Testado na sim, não visto na tela" é uma frase válida e obrigatória.

### Os docs

| Doc | O que tem |
|---|---|
| `docs/arquitetura.md` | As pastas, o laço da sim, a física, a câmera, intenções e eventos, os motivos |
| `docs/combate.md` | A luta: controles, mira, recitação, tamanho, custo, marca, inimigos |
| `docs/historia.md` | O que a história nova precisa decidir e respeitar, e o mundo à mão |
| `docs/assets.md` | Formato, escala, esqueleto, clipes, o caminho Blender → jogo, o provisório |
| `docs/decisoes.md` | O registro de decisões |
| `docs/historico.md` | O que entrou, tarefa por tarefa |

### Várias IAs no projeto

- Este arquivo é a porta de entrada de todas. `CLAUDE.md` e `GEMINI.md` só o importam.
- Leia só o doc do assunto da tarefa, não `docs/` inteiro.
- **Texto do jogo e fato do mundo** (fala, nome, descrição, história) só com o cânone aberto do lado, e vão para o
  autor antes de entrar. Nenhuma IA inventa mundo sozinha.
- Código vindo de outra IA é rascunho até passar em `npm run check` e ser lido por quem faz o commit.
- Blender por IA (MCP ou script) segue `docs/assets.md`; todo modelo é olhado antes de entrar.
- O Antigravity (`agy`, pelo subagente `antigravity-delegate`) serve para ler muito material, gerar boilerplate,
  testes repetitivos e imagens. Não para arquitetura, bug sutil ou revisão final. Nunca mande segredo.
- Ao fim de uma tarefa, diga o que foi delegado a outra IA e o que foi corrigido.

## 7. TODO

`[ ]` a fazer · `[~]` em andamento · `[x]` feito (fica até o fim do marco, depois sai; o histórico guarda).
"Visto na tela" quer dizer jogado no navegador.

### Esperando o autor
- [ ] Aprovar ou trocar o conceito do protagonista: atração e repulsão (`docs/decisoes.md`). Bloqueia a tarefa 5.
- [ ] Aprovar as três faixas da Camada 1 decididas pela recitação (`docs/decisoes.md`). Bloqueia a tarefa 7.
- [ ] **H1. A história nova**: responder às perguntas de `docs/historia.md` §1. O co-autor pode trazer
  propostas, e o autor escolhe e grava os fatos no cânone. Bloqueia o Marco 3.
- [ ] **H2. O roteiro** cena a cena, com níveis e lutas, em `docs/roteiro.md`.

### Marco 1 — O brinquedo (fase atual)
Uma sala greybox com caixas, barris, uma beirada e água, e bonecos de treino. Sem história e sem menu. Andar,
mirar e jogar coisas com magia tem de ser gostoso antes de qualquer outra coisa.

- [ ] **1. Os pacotes.** Workspaces `sim/`, `game/`, `content/`; `npm run check` na raiz (tipos e testes);
  `npm run dev` abre `game/`; `.claude/launch.json` para o preview. *Pronto:* `check` passa; a página abre com
  uma cena vazia do three.js.
- [ ] **2. O laço da sim.** Tick fixo, RNG com semente, Rapier carregado, mundo e entidades, a sala em
  `level.json`. *Pronto:* testes em Node; a mesma semente dá o mesmo resultado.
- [ ] **3. Andar.** Controlador cinemático (rampa, degrau, pulo, queda), `move` e `jump`, esquiva com Fôlego.
  *Pronto:* testes de rampa, parede e degrau.
- [ ] **4. A câmera no ombro.** Render da sala, manequim com animações de biblioteca em oito direções, câmera com
  mola e colisão, troca de ombro, zoom ao mirar, pointer lock, interpolação. *Pronto:* visto, liso a 60 fps, sem
  atravessar parede.
- [ ] **5. Puxão e Empurrão.** A mira vira raio na sim; alcance, massa, impulso, dano por impacto. Só o toque
  (encurtado) por enquanto. *Pronto:* testes de impulso e impacto; visto: jogar caixa no boneco é divertido.
- [ ] **6. O peso.** Parada no impacto, tremida, partícula, som, número; painel `F1` com os números de
  `content/`. *Pronto:* visto: cada impacto se sente.
- [ ] **7. Recitar.** O cântico linha por linha, o alvo que trava nos corpos, o anel do tamanho, as três faixas,
  o encurtado, a quebra ao apanhar. *Pronto:* testes das faixas e do tamanho; visto: recitar inteiro compensa.
- [ ] **8. Mana e a marca.** Mana, limite por janela, `manaBurst`, sangue e tremor na mira. *Pronto:* testes;
  visto: dá para sentir quando se passou do limite.

### Marco 2 — Quem luta de volta
- [ ] **9. Navmesh e a primeira IA.** Um espadachim que persegue, avisa o golpe e bate; Caído e Prensado.
- [ ] **10. As três escolas.** Gryskar avança, Ipojy espera e contragolpeia, Tsvirana troca e pune quem repete.
- [ ] **11. Besteiro, Desviar, Arremesso, Desarmar, Puxar-se.** Uma sala de três inimigos com vários jeitos de
  resolver.
- [ ] **12. Os bots.** `tools/bots`: N lutas, com vitória, tempo, dano, mana e marcas.
- [ ] **13. A gravada.** Ponto de descanso, escrever o círculo, ativar na luta.

### Marco 3 — O jogo (depende de H1 e H2)
- [ ] **14. A história no motor.** Runner de Ink (trazer da tag) em `sim/`, diálogo em DOM, gatilhos no nível.
- [ ] **15. Os níveis em greybox**, do começo ao fim, jogáveis e feios.
- [ ] **16. O que todo jogo tem.** Save com versão, itens, nível de mago, menus, opções.
- [ ] **17. Electron.** `desktop/` (trazer `main.cjs` da tag) empacotando `game/`.

### Marco 4 — A cara
- [ ] **18. O caminho do Blender.** `tools/blender/export.py`, `tools/assets-check`, `content/assets.json`.
- [ ] **19. O protagonista**, o modelo mais visto, no esqueleto comum.
- [ ] **20. A gente, o cenário e o som.**
