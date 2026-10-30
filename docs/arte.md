# A arte

Decisão do co-autor (2026-10-30, com a autorização do autor): **48x48**.

## A escala

- **Um quadrado do mapa tem 48 pixels de arte.** O boneco de gente é 48x48; o Ykuruã é 96x96 (dois quadrados de
  largura na tela, um só na regra). A câmera do mundo amplia o mapa até um quadrado ter 48 pixels na tela, então a
  arte de 48 aparece pixel por pixel, nítida, na resolução interna (1280x720).
- Os mapas ainda são de quadrados de 16 (os tilesets provisórios). O ator se encolhe pro quadrado do mapa
  (`sheetScale` em `client/src/game/mapSprites.ts`): arte de 48 num mapa de 16 sai na escala 1/3, que a câmera
  (zoom 3) devolve a 1. O provisório, desenhado a 16, sai na escala 1.
- **Tiles**: o retoque dos mapas (task 15) deve vir em 48x48. Quando vier, o mapa passa a ter quadrados de 48 e a
  câmera, zoom 1; o que está em pixels de 16 no client (velocidade de andar, o corpo, o que a luta desenha) passa a
  sair do tamanho do quadrado. Até lá, os mapas ficam em 16.
- **Retratos da caixa de diálogo**: pintados, não pixel art, em 640x800 (o dobro do busto na tela, 320x400), fundo
  transparente, o busto encostado na borda de baixo. Escalam com suavização (`smooth`).
- **Ilustrações** (título, splash de cada um do grupo, os baixios): 1280x720. **Mapa do mundo**: 1536x1024, aberto
  com `M` (ou Mapa, na pausa).
- **Ícones de habilidade**: 32x32, quando houver (a barra de luta ainda é de texto).

## A folha de sprite

4 linhas x 4 colunas, um quadro por célula: frente, esquerda, direita, costas, quatro passos de caminhada cada, o
primeiro de cada linha servindo de "parado". O pé fica no meio da base do quadro. Quem tem arte própria além da classe
é registrado pelo nome, como está no mapa e na ficha (`person:Jarupã`, `person:Contratada`); inimigo, pela criatura do
bestiário (`creature:encounter-castelao`); o Ykuruã fora d'água tem a folha seca (`creature:...:seco`).

## O gerador

`art/gerar_arte.py` pede as imagens à API de imagens da OpenAI (modelo `gpt-image-1`, ou o de `OPENAI_IMAGE_MODEL`)
com os prompts de `art/manifest.json`, e converte:

- a folha: a API desenha a grade em 1024x1024; o script recorta cada quadro pelo corpo, põe todos na mesma escala, o
  pé no meio da base, faz da linha da direita o espelho da esquerda (a API erra o lado), reduz a paleta a 32 cores e
  deixa a transparência de tudo ou nada. É pixel art de verdade, mas não é a mão de um artista: quadro que sair torto
  se refaz ou se retoca.
- a folha sai do retrato: a API recebe o retrato bruto como referência, pra o boneco ter a mesma cara.
- o resto é recorte e escala.

O bruto fica em `art/raw/` (fora do git) e `process` refaz a conversão sem chamar a API. O registro
(`client/src/game/generatedArt.ts`) é escrito pelo script com o que existe em `client/public/`. A skill
`gerar-arte` (`.claude/skills/gerar-arte`) tem os comandos.

## O cânone

O `look` de cada um é a aparência, e o que a tela mostra vira cânone (AGENTS.md §1). Hoje toda aparência do
manifesto é **proposta** (`proposal: true`): o que o `jogo.md` garante (idade, ofício, arma, roupa de estrada) mais o
que o co-autor propôs (cabelo, rosto, cores). Confira com a ficha antes de gerar, ou gere e confira depois. O
**Thrykar** não se gera até o `look` vir da ficha do povo demônio (`needsSheet`). As cores da libré de Ymboripe
(azul-ardósia e preto) e a do Castelo da Volta também são proposta.
