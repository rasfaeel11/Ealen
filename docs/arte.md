# A arte

Decisão do co-autor (2026-10-30, com a autorização do autor): **48x48**.

## A escala

- **Um quadrado do mapa tem 48 pixels de arte.** O boneco de gente é 48x48; o Ykuruã é 96x96 (dois quadrados de
  largura na tela, um só na regra). A câmera do mundo amplia o mapa até um quadrado ter 48 pixels na tela, então a
  arte de 48 aparece pixel por pixel, nítida, na resolução interna (1280x720).
- Os mapas continuam em quadrados de 16: é a medida da regra. Tudo que se desenha por cima deles, boneco ou cenário, sai na escala 1/3 (`sheetScale` em `client/src/game/mapSprites.ts`, `scale` em `Scenery.ts`), e a câmera (zoom 3) devolve a 1. O provisório, desenhado a 16, sai na escala 1.
- **Tiles**: não há. O cenário é pintado por `art/pintar_cenario.py` (abaixo). Os tilesets `placeholder` só servem pra abrir e editar os mapas no Tiled.
- **Retratos da caixa de diálogo**: pintados, não pixel art, em 640x800 (o dobro do busto na tela, 320x400), fundo
  transparente, o busto encostado na borda de baixo. Escalam com suavização (`smooth`).
- **Ilustrações** (título, splash de cada um do grupo, os baixios): 1280x720. **Mapa do mundo**: 1536x1024, guardado
  como reserva da tela de título: o `M` abre o mapa da região, pintado do cenário.
- **Ícones de habilidade**: 32x32, quando houver (a barra de luta ainda é de texto).

## O cenário

`python art/pintar_cenario.py` (só precisa do Pillow; `--previa <pasta>` monta uma imagem de cada área) lê os `.tmj` e escreve em
`client/public/scenes/`. O mapa manda na regra, e o script só lê o que há em cada quadrado: mudou o mapa, rode de novo. A semente é fixa, e cada área
tem a dela. Quem desenha na tela é `client/src/game/Scenery.ts`, e a regra nunca lê nada de lá.

- **O chão** (`<area>.ground.png`): uma imagem só, sem tile repetido, com a borda de cada terreno torta. A água é um furo: `agua.png` e `agua-brilho.png`
  correm por baixo em velocidades diferentes, e na beira o chão vai ficando transparente, que é o raso.
- **O que fica de pé** (`<area>.atlas.png` + `<area>.json`): árvore, casa, torre, cada uma com o pé num ponto e ordenada por Y junto com os personagens.
  Cada quadrado de árvore do mapa ganha uma, sorteada; na primeira linha do mapa, sebe, porque a câmera cortaria a copa.
- **`fade`**: um retângulo em quadrados. Com alguém dentro, a peça some (o telhado, até 0) ou clareia (o muro do pátio, `fadeTo`), na exploração e na luta.
  O prédio de que se entra tem o corte pintado no chão: piso, parede do fundo e o topo das outras.
- **`unless`**: a peça sai de cena com aquela variável da história (o barco de Oryndu, depois da cheia). **`smoke`**: de onde sobe a fumaça.
- **Peça nova que barra**: pinte no script e ponha no mapa um tile que barre o passo (o `gid` 12, que o pintor não desenha). O pintor não muda a regra sozinho.
- **Os destrutíveis** (`props.png`): pelo `kind`, não pelo tile que o mapa usa.

O que a região pede, e o script segue: terra como a Alemanha antes da unificação (AGENTS.md, decisões do autor), céu nublado de cheia, paleta de lodo. Cidade tem
terreiro e horta, não gramado. O castelo é o da ficha. O estandarte da cidade não tem brasão, porque o cânone não deu um. Nada de letra legível em placa.

## A folha de sprite

4 linhas x 4 colunas, um quadro por célula: frente, esquerda, direita, costas, quatro passos de caminhada cada. Não
precisa desenhar o parado: o jogo o tira dos passos (`client/src/game/idlePose.ts`), com a pose de pé, a respiração e
os gestos. O pé fica no meio da base do quadro. Quem tem arte própria além da classe
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
  pé no meio da base (o meio do corpo, sem contar a vara ou a espada que sai pro lado), faz da linha da direita o
  espelho da esquerda (a API erra o lado), reduz a paleta a 32 cores e
  deixa a transparência de tudo ou nada. É pixel art de verdade, mas não é a mão de um artista: quadro que sair torto
  se refaz ou se retoca.
- a folha sai do retrato: a API recebe o retrato bruto como referência, pra o boneco ter a mesma cara.
- o resto é recorte e escala.

- o recorte: na folha some só o que é da cor do fundo (`key_sheet`), pra não furar nem desbotar quem veste verde; o
  retrato, de pincelada solta, usa o `key_green`, mais largo. A paleta da folha é octree de 64 cores, que guarda a cor
  rara: a faixa azul na manga, o brasão no peito.
- o passo: nos quadros pares o corpo sobe um pixel. Folha cujo perfil vem com as pernas paradas ganha um quadro de
  passagem, com as canelas juntas, montado no bruto: passada, passagem, passada, passagem.

As folhas vêm do Gemini com erros: quadro virado pro lado errado, sem a arma, sem a capa, coluna a mais. Cada bruto em
`art/raw/` foi montado só com os quadros bons. O Escudeiro é o guarda do pedágio recolorido, e o guarda do portão é a
mesma folha do guarda.

O mapa (`mundo`) foi retocado à mão sobre o que o autor gerou: saíram "Ice guide", "Camps" e a Kuatiarape repetida, e
Kuatiarape e Ybytuguá foram pro Ymonhã. Gerar de novo perde o retoque.

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
ela: o rosto assimétrico, o gesto, a roupa remendada, a cor. Do primeiro lote, do prompt antigo, os retratos de Jarupã
e Xanduí ficam: têm a idade e a arma certas, e as folhas saem deles.

Só entra na conta o que a tela usa: a ficha de design é referência e pode faltar pra quem não tem retrato, as splash de
personagem e a dos baixios nenhuma tela mostra ainda, e quem é NPC fica parado no mapa, então só o quadro de pé importa.

## O cânone

O `look` de cada um é a aparência, e o que a tela mostra vira cânone (AGENTS.md §1). O autor aprovou em 2026-10-31 a
arte de quem já entrou; `proposal: true` marca quem ele ainda não viu desenhado. O **Thrykar** segue a ficha do povo
demônio: gente, sem chifre nem rabo, com a orelha e a unha um pouco mais pontudas e os olhos de cores diferentes.

## Os brasões

Antes da unificação cada casa tem o seu, em cores fortes: a heráldica é a única coisa berrante num mundo de lama.
Quem serve a Ymboripe leva a cor da própria família no tabardo e a marca do ducado numa faixa na manga, como o texto diz.
A folha sai pelo nome de quem está no mapa, então duas casas no mesmo grupo são dois nomes (`Espada` e `Espada do vale`).

| De quem | Brasão | Quem veste |
|---|---|---|
| Ymboripe, depois o reino | azul forte, montanha branca de três picos sobre linha d'água branca | Jurendy; a faixa na manga dos vassalos |
| Castelo da Volta | amarelo-mostarda, corrente preta | Mbyraku, o sargento, os guardas, o besteiro |
| Casa vassala | vermelho, lúcio dourado | `Espada` |
| Casa vassala | verde, garça branca | `Espada do vale` |
| Casa vassala | branco, lontra preta | `Lança` |
| Casa vassala | laranja, javali preto | `Lança da serra` |
| Família menor | vinho, roda de moinho dourada | `Escudeiro` |

## Pra quem é jovem não sair velho

O rosto velho vinha do estilo, que pedia pele curtida e "história no rosto" pra todo mundo, e isso vencia o "vinte anos"
da descrição. Agora a idade é de cada um, e quem é jovem leva `young: true`, que acrescenta o bloco `style.young` no fim
do prompt. Quem é redesenhado começa em conversa nova, sem imagem antiga anexada.
