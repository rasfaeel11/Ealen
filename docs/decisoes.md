# Decisões

Uma entrada por decisão, da mais nova para a mais velha: data, o que, por quê, quem. Decisão que toca o cânone
espera o autor e diz isso. As decisões do tempo do jogo 2D estão em `docs/escolhas.md` e no
`docs/legado/AGENTS-tatico-2d.md`.

## 2026-11-20 — O jogo vira action RPG 3D (autor)

O jogo tático 2D não estava engajando, nem na cara nem na gameplay. Passa a ser action RPG 3D de navegador, em
three.js, no mesmo mundo e com a mesma história. A gameplay vem antes da arte: pode ser feio, precisa ser
divertido. Sem protótipo descartável: o jogo novo começa já na arquitetura final.

O jogo 2D fica na tag `tatico-2d`.

## 2026-11-20 — A arquitetura (co-autor)

Detalhe em `docs/arquitetura.md`.

- **Mesmo repositório, branch nova.** Vêm junto a história em Ink, os docs, a ponte com o cânone, o save, o
  Electron e a forma "intenção entra, evento sai" do motor 2D. O motor tático em si não serve a um action RPG e não
  se porta: se reescreve em `sim/`.
- **Simulação pura em passo fixo**, separada do render, determinística: bot testa luta e roteiro em Node.
- **Regra no plano do chão** com altura, colisão própria, sem motor de física.
- **Câmera fixa de cima**, sem rotação livre.
- **Números em `content/`**, com painel de ajuste no dev.
- **UI em DOM** (Preact) por cima do three.js.
- **GLB** como único formato de modelo; provisório por código para tudo.
- **`AGENTS.md` curto** como porta de todas as IAs (`CLAUDE.md` e `GEMINI.md` o importam), docs por assunto,
  tarefas e histórico fora dele.

## 2026-11-20 — Quem joga é Endyru (co-autor, espera o autor)

O jogador controla só Endyru; Jarupã e Xanduí são IA com ordens. Motivos: o cânone diz que quem joga é Endyru; o
mago de atração e repulsão é o jeito de jogar mais novo que o jogo tem; trocar de personagem dobra o trabalho de
controle e de câmera. Pode-se rever depois da primeira luta jogável.

## 2026-11-20 — A Camada 1 no action RPG (co-autor, espera o autor)

As três faixas ficam, decididas pelo tempo e pela posição (golpe limpo, de guarda, aparado; recitação inteira,
encurtada, quebrada) em vez do dado. O dado fica só no improvável. As escolas viram jeitos de lutar da IA (a
Tsvirana pune quem repete). Detalhe em `docs/combate.md`. Toca a decisão do autor de 2026-11-05 (livro e jogo na
mesma Camada 1): a regra é a mesma, muda quem decide a faixa.
