# Tarefas

Uma por vez, na ordem. Terminou: sai daqui, entra uma linha em `docs/historico.md`, e vira commit. O critério de
pronto é o que se testa ou se vê; "visto na tela" quer dizer jogado no navegador.

A ordem segue o primeiro pilar: **a luta divertida antes de tudo**. A história, o save e a arte vêm depois de a
primeira arena ser boa de jogar.

## Marco 1 — A luta é divertida

Uma arena greybox, Endyru contra a gente do pedágio, com Jarupã e Xanduí. Sem história, sem menu.

| # | Tarefa | Pronto quando |
|---|---|---|
| 1 | **Os pacotes.** Workspaces `sim/`, `game/`, `content/`; `npm run check` na raiz (tipos e testes); `npm run dev` abre `game/`. | `npm run check` passa; a página abre com uma cena vazia do three.js |
| 2 | **O laço da sim.** Tick fixo, RNG com semente, entidades, intenção `move`, colisão de círculo com parede e com corpo, grade de alturas. | Testes: anda, para na parede, não atravessa corpo, mesma semente dá o mesmo resultado |
| 3 | **A arena na tela.** Greybox em JSON desenhado com caixas, Endyru em cápsula, câmera fixa que segue, WASD e mira no mouse, interpolação entre ticks. | Visto na tela: anda liso a 60 fps, a câmera não enjoa |
| 4 | **O golpe tem peso.** Bordão, vida, `hit`, morte; um boneco de treino; hit-stop, tremida, número, partícula e som saindo dos eventos; painel de ajuste (`F1`). | Visto na tela: bater no boneco é gostoso; números ajustáveis com o jogo rodando |
| 5 | **Puxão e Empurrão.** Recitar segurando, soltar; o círculo das linhas; empurrão com atrito; choque em parede e corpo (Prensado); água funda; quebra ao apanhar. | Testes das três faixas da recitação; visto: jogar um no outro e na parede é divertido |
| 6 | **A gente do pedágio.** Guarda de chuço e besteiro com IA por intenções; guarda, aparar, Exposto, esquiva; as três faixas do golpe. | Testes das faixas; visto: os dois se leem antes de bater (aviso do golpe) |
| 7 | **Jarupã e Xanduí.** IA dos dois com as escolas (Gryskar abre; Ipojy nunca abre, apara e devolve); ordens no `Tab`; cair e levantar. | Testes do voto e do contragolpe; visto: os dois ajudam sem roubar a luta |
| 8 | **Mana e a marca.** Mana que não volta na luta, limite por janela, `manaBurst`, sangue e tremor na mira. | Testes do limite e da marca; visto: dá para sentir quando se passou |
| 9 | **A simulação em lote.** `tools/sim-lote`: bots dos dois lados, N lutas, vitória, tempo, dano. | Roda a arena 200 vezes e imprime a tabela |
| 10 | **Mbyraku.** O primeiro chefe, da Tsvirana: troca de golpe e pune quem repete. | Visto: dá para perder apertando sempre o mesmo botão, e ganhar variando |

## Marco 2 — O Ykuruã

| # | Tarefa | Pronto quando |
|---|---|---|
| 11 | **O bicho na água.** Submerso, couro duro, se refaz, escolhe onde subir; Oryndu lê a água (marca no chão). | Testes da água; visto: dá medo e se lê |
| 12 | **Tirar da água.** Puxão aos poucos com peso; em seco, lento; couro racha depois de um tempo; volta e se refaz. | Testes; visto: a luta pede paciência e é boa |
| 13 | **A pressa chama.** A marca chama o bicho em quem conjurou; círculos gravados na margem. | Visto: apertar tudo perde, preparar ganha |

## Marco 3 — O jogo de verdade

| # | Tarefa | Pronto quando |
|---|---|---|
| 14 | **A história.** O runner de Ink do 2D passa para `sim/`; `.ink` para `content/story/`; caixa de diálogo em DOM; gatilhos no nível. | O teste do roteiro joga a história inteira na sim |
| 15 | **As quatro áreas em greybox.** Ymonhã, Ybytuguá, os baixios, a floresta, com as saídas, a gente e as lutas do roteiro. | Dá para jogar do pedágio ao fim, feio |
| 16 | **O que todo RPG tem.** Save com versão, mochila e itens, descanso (e gravar no descanso), XP e nível, a bolsa de cobre e prata. | Testes; o save continua depois de fechar |
| 17 | **Electron.** `desktop/` passa a empacotar `game/`. | O app abre e salva |
| 18 | **O legado sai.** Saem `client/` e `shared/`. | Nada importa deles; `npm run check` passa |

## Marco 4 — A cara

| # | Tarefa | Pronto quando |
|---|---|---|
| 19 | **O caminho do Blender.** `tools/blender/export.py`, `tools/assets-check`, `content/assets.json`. | Um GLB de teste entra pelo caminho e passa na conferência |
| 20 | **O trio, Oryndu e o Ykuruã em 3D.** Modelos low-poly, esqueleto comum, clipes de `docs/assets.md`. | Vistos na tela, no lugar das cápsulas |
| 21 | **A gente, o cenário e o som.** O resto do elenco, os níveis com arte, som gravado. | — |
