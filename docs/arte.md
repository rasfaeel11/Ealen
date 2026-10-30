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

`art/gerar_arte.py` pede as imagens com os prompts de `art/manifest.json` e converte. Quem gera (`--via`):

- **`agy`, o padrão**: o Antigravity CLI, pelo subagente `image-generator` dele, na assinatura do autor. Ele só gera
  com o `gemini-3.1-flash-image` (o Nano Banana Pro não está disponível pra ele), e a cota desse modelo é à parte da
  dos modelos de texto: na primeira vez, acabou depois de 9 imagens e voltou em umas 5 horas.
  Cada imagem é pedida numa pasta temporária fora do projeto (`%TEMP%/jogo-arte/<id>`), com permissão de escrita só
  lá, e leva perto de um minuto e meio. O Imagen não faz fundo transparente: pede-se verde puro, e o script o recorta
  (`key_green`). O prompt é escrito aqui, no manifesto; o Antigravity só desenha.
- **`gemini`**: a API do Gemini direto, com o Nano Banana Pro (`gemini-3-pro-image-preview`, ou o de
  `GEMINI_IMAGE_MODEL`), em 2K, com `GEMINI_API_KEY` (Google AI Studio). Fundo verde recortado, como no `agy`.
- **`openai`**: a API de imagens da OpenAI (`gpt-image-1`, ou o de `OPENAI_IMAGE_MODEL`), com `OPENAI_API_KEY`.

A conversão:

- a folha: a API desenha a grade em 1024x1024; o script recorta cada quadro pelo corpo, põe todos na mesma escala, o
  pé no meio da base, faz da linha da direita o espelho da esquerda (a API erra o lado), reduz a paleta a 32 cores e
  deixa a transparência de tudo ou nada. É pixel art de verdade, mas não é a mão de um artista: quadro que sair torto
  se refaz ou se retoca.
- a folha sai do retrato: a API recebe o retrato bruto como referência, pra o boneco ter a mesma cara.
- o resto é recorte e escala.

O bruto fica em `art/raw/` (fora do git) e `process` refaz a conversão sem chamar a API. O registro
(`client/src/game/generatedArt.ts`) é escrito pelo script com o que existe em `client/public/`. A skill
`gerar-arte` (`.claude/skills/gerar-arte`) tem os comandos.

## Pelo navegador

O jeito de gerar sem API: o Gemini na web (Nano Banana Pro). `python art/gerar_arte.py prompts` escreve
`art/PROMPTS.md`, com cada prompt pronto pra colar, na ordem, e o nome com que salvar cada imagem. Por personagem,
uma conversa:

1. a **ficha de design** (`<id>.design`): o corpo inteiro de frente, de 3/4, de perfil e de costas, com a paleta. É
   a referência de tudo e fica em `art/design/`, no git;
2. o **retrato** (`<id>.portrait`), a partir da ficha;
3. a **folha de sprite** (`<id>.sheet`), a partir da ficha, que já mostra todos os lados;
4. a **splash**, pra quem tem.

`python art/gerar_arte.py importar <pasta>` pega o que foi baixado (png, jpg ou webp; o " (1)" que o navegador põe
no nome repetido é ignorado), recorta o fundo verde, converte e registra no jogo.

## A direção de arte

O primeiro lote saiu genérico: os prompts pediam "retrato de RPG pintado" e uma descrição curta, e é isso que dá rosto
de banco de imagem. Desde 2026-10-30 o manifesto pede óleo expressionista (empaste, pincelada à vista, claro-escuro de
uma luz só, paleta de lodo, ferrugem, osso e ardósia com uma cor de cada um) e descreve cada pessoa pelo que a faz
ela: o rosto assimétrico, o gesto, a roupa remendada, a cor. Os 7 retratos do primeiro lote são do prompt antigo e
devem ser refeitos (`gen <id> --only portrait --force`), e as folhas a partir deles.

## O cânone

O `look` de cada um é a aparência, e o que a tela mostra vira cânone (AGENTS.md §1). Hoje toda aparência do
manifesto é **proposta** (`proposal: true`): o que o `jogo.md` garante (idade, ofício, arma, roupa de estrada) mais o
que o co-autor propôs (cabelo, rosto, cores). Confira com a ficha antes de gerar, ou gere e confira depois. O
**Thrykar** não se gera até o `look` vir da ficha do povo demônio (`needsSheet`). As cores da libré de Ymboripe
(azul-ardósia e preto) e a do Castelo da Volta também são proposta.
