# O que eu decidi no seu lugar

Em 2026-11-04 você pediu que eu fizesse as tasks que esperavam por você, decidindo sozinho, e
listasse aqui as escolhas. Cada uma tem o porquê e o que mudar se você não gostar. Nada disto foi
gravado no repositório da história: se aprovar, é você quem passa pra lá (§1 do AGENTS.md).

## 89. Como o grau da escola vale e como sobe

**O que decidi**
- O grau **não sobe na árvore**. No cânone, o grau é o quanto se domina a escola, e quem o limita é a
  aura (`magia` §5.6). Jarupã e Xanduí já sabem a escola no grau 3, e o Fio os corta no 2 até o Corpo
  (`aura_rise`). O grau 4 traria o golpe-selo, que só vem por iniciação de mestre, e ninguém inicia o
  trio. Pôr um nó "Gryskar III → IV" na árvore seria dar golpe-selo por ponto de nível, e isso
  contradiz o cânone.
- O grau **rende no traço da escola**, não na força bruta:
  - vantagem no triângulo: +2 de acerto como antes, e mais 1 por grau acima do 2 (grau 3: +3). A
    desvantagem continua -2;
  - Onda (Gryskar): acumula até o grau mais 1 golpes seguidos (grau 3: 4, igual ao de antes);
  - Rachadura (Tsvirana): multiplica por 1,5 mais um quarto por grau (grau 2: o dobro, como antes;
    grau 3: 2,25);
  - Contragolpe (Ipojy): não cresce. A Espera rende pela vantagem sobre o Gryskar.

**Por quê**: assim, o Corpo de Jarupã e Xanduí na ponte passa a valer na luta (o grau sai de 2 pra
3), sem inventar técnica nova.

**Pra mudar**: os números estão em `momentumCap`, `crackFactor` e `styleEdgeBonus`
(`shared/tactics/styles.ts`).

## 87. Os nomes da árvore, a loja e as missões

**O que decidi**
- Os 20 nós ficam com o nome e a fala provisórios. Li um por um contra o tom (§1.2) e o cânone, e
  nenhum inventa técnica nem fato: são o costume de cada um ("Pé de Convés", "Cabo Escorregadio",
  "Página Certa").
- Uma troca: o **Fôlego de Biblioteca** dava Fôlego a Endyru, que não gasta Fôlego em nada. Virou
  **Anos de Biblioteca**: +2 de mana máxima, com a fala "Anos lendo em voz alta pra sala vazia. O
  texto dura mais que a voz." Quem já tinha o nó velho ganha o ponto de volta.
- **Sem ramo da Tsvirana**: ninguém do grupo é dela, e sistema que nenhuma cena pede não entra.
- **A Cura não ganha ramo próprio**: ela já mora no Preparo (Leitura Sem Pressa), que é o ramo do tema.
- A banca continua com **6 pães e 4 unguentos**, e compra de volta pela metade.
- O texto das três missões fica como está: sai só do que já se diz no roteiro.

**Pra mudar**: os nós estão em `shared/skillTree.ts`, e a banca em `shared/shop.ts`.

## 57. Pote de óleo, besteiro que vigia, e o virote que não entra

**O que decidi**
- **O item que se joga é o Pote de Óleo**: o óleo de lampião do armazém da guilda (os barris que
  Endyru lê na cena: "Óleo de lampião. Doze medidas."). Quebra em cima do inimigo sem rolagem, 1d4,
  e o quadrado pega fogo por 2 rodadas. Na água não pega, então não serve contra o Ykuruã submerso:
  é pra gente, não pro bicho, e o tema continua (o bicho se vence tirando da água).
- **De onde vem**: o mestre da guilda dá dois depois do armazém. Falas novas:
  - narração: "Jarupã volta do armazém com dois potes de óleo debaixo do braço, um de cada lado."
  - Mestre da guilda: "Óleo eu tenho. Barco pra levar, não. Leva."
  Essa é a única fala nova; o comércio parado já é o assunto da cidade.
- **O besteiro do pedágio vigia**, com o nome "Mira na Corrente": quem chega perto do guincho leva o
  virote antes. É o único do mundo que vigia.
- **O virote como item não entra**: ninguém do grupo usa besta, e sistema que nenhuma cena pede não
  entra (cabeçalho do AGENTS.md). Se um dia alguém do grupo pegar uma besta, entra aí.

**Pra mudar**: o pote está em `shared/data/items.ts`, a fala em `client/story/ybytugua.ink`
(`saqueadores_caem`), o besteiro em `shared/data/bestiary.ts`.
