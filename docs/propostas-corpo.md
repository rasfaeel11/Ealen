# Propostas: o corpo do jogo (tasks 71 a 80)

Escrito em 2026-11-13, pra o autor aprovar, cortar ou mudar antes de qualquer coisa entrar (AGENTS.md §1). Cada task diz
qual cena do roteiro (`docs/roteiro.md`) a pediria, o que entraria, e a recomendação: **entra**, **entra menor** ou
**não entra**. A regra que pesa em todas: *sistema que nenhuma cena pede não entra*. Os nomes de gente e de coisa que
aparecem aqui são pelo papel; nome próprio novo, nenhum.

O repositório da história não estava à mão quando isto foi escrito: o que vai abaixo confere com o `jogo.md`, o
`docs/roteiro.md` e o `docs/mundo.md`, não com as fichas. Tudo que tocar ficha precisa da conferência do autor.

Resumo: entram, mais ou menos, a **71 e a 72 juntas** (a receita de Thrykar), a **73 menor** (conversas de
acampamento), a **78 menor** (a passarela que o bicho parte) e a **79** (dicas de primeira vez). A **80** precisa de
uma decisão de número e de uma correção na IA. Não entram a **74**, a **76** e a **77**.

---

## 71 + 72. A receita de Thrykar (relíquia e coleta, numa coisa só) — entra

**A cena que pede:** a forja de Thrykar (cena 1.2). O roteiro diz que ele "oferece uma receita absurda para endurecer
lâmina e couraça contra dente de bicho d'água: banha de bagre velho, três pregos de barco afundado e trinta marretadas
cantando pra sogra morrer", e que Endyru reconhece ali um Verso cantado no compasso da bigorna. Hoje a receita é só
fala: as duas espadas temperadas não fazem nada contra o Ykuruã.

**O que entraria:**
- **Coleta (72):** os três pregos saem da barcaça de grãos afundada, nos baixios, na primeira ida (cena 1.3: o grupo
  "encontra os destroços de uma barcaça de grãos"). Um objeto no chão (`thing` da task 68), depois da luta. A banha de
  bagre sai da guilda dos barqueiros, que tira os barcos da água (cena 1.2), ou da banca do cais. São dois materiais,
  que a mochila guarda como item-chave enquanto a receita não sai.
- **Relíquia (71):** com os dois na mochila, Thrykar faz o serviço (as trinta marretadas, que Endyru conta e para no
  vinte, como já está). A arma de quem leva ganha um efeito que não se gasta: contra bicho de rio, o golpe dela fura a
  Muralha da água em 2 (ou: a Bocada do Ykuruã não sangra quem veste a couraça). É o "endurecer contra dente de bicho
  d'água" virando regra, e só vale no Ykuruã.
- **Sem sistema geral de receitas:** é uma receita, de um ferreiro, pra um bicho. Não entra bancada de preparo, nem
  lista de materiais pelo mapa.

**O autor decide:** se a receita funciona de verdade (o roteiro diz que "funciona"); se é a lâmina, a couraça ou as
duas; onde está a banha; e se o efeito é furar a água ou proteger da Bocada.

---

## 73. Companheiros como gente — entra menor

**A cena que pede:** a estrada da floresta (cena 2.1) já tem três momentos que "constroem a relação dos três", e o
fecho (4.1 a 4.3) depende de o jogador ter visto essa relação. Afinidade, missão pessoal e discordar de uma escolha não
têm cena: o trio chega ao Livro 1 com vinte anos de amizade, e o jogo não pode deixar o jogador estragá-la.

**O que entraria:**
- **Conversa de acampamento:** uma por noite acampada, até três, em ordem, cada uma num momento diferente da história
  (depois do contrato; na floresta; na véspera da cheia). Curtas, na voz do guia de falas (§6 do roteiro), sem
  explicar o que os dois já sabem. Ideias pra o autor escrever ou aprovar:
  - Depois do contrato: Jarupã contando o dinheiro que ainda não tem; Xanduí pedindo que Endyru leia de novo a
    cláusula do pagamento "pra ver se mudou" (o segredo, só pela forma).
  - Na floresta: o círculo de giz e o placar de dados (já existe, no acampamento antes do vau).
  - Na véspera da cheia: Oryndu batendo o remo no casco, sem falar; Endyru refazendo a conta da corda.
- **Comentário no meio da conversa dos outros:** só onde o roteiro já põe os dois juntos (a Mesa, Thrykar, a
  conselheira). Uma fala de Jarupã ou de Xanduí em cada, no máximo.
- **Não entram:** afinidade, missão pessoal, discordar de escolha.

**O autor decide:** se quer as três conversas e quais; o texto é dele (ou passa por ele).

---

## 74. Reputação — não entra

Nenhuma cena pede. Pior: o tema do fecho é que o trio não muda nada — Ybytuguá assina com Ymboripe "mesmo assim" (cena
4.2). Um número de reputação com a cidade, ou com o ducado, promete ao jogador uma escolha que a história não dá. O
que já existe (a guilda paga depois do armazém, a conselheira recebe a carta) faz o papel sem sistema.

---

## 76. Mais apoios — não entra

O único que acompanha sem lutar é Oryndu, e a morte dele no ato 3 é o preço do jogo: depois dela, a luta "não aceita
atalho" (cena 3.2). Um apoio novo depois de Oryndu tiraria peso dessa perda, e antes dela não há quem o roteiro ponha
junto do grupo. Se o autor quiser um apoio, o lugar seria a primeira ida (os barqueiros velhos), mas eles se recusam a
guiar ("Quem espera a cheia baixar vive até a seca").

---

## 77. Invocação e criatura aliada — não entra

Atração e repulsão não invoca nada (`magia` §3.5: arremessa, desarma, desvia, puxa-se), e o único bicho do bestiário é
o Ykuruã. Uma criatura aliada seria fato novo de magia e de bestiário ao mesmo tempo, sem cena.

---

## 78. Terreno que muda — entra menor

**A cena que pede:** a primeira ida (cena 1.3): o Ykuruã "avança como uma onda, partindo a passarela de madeira". A
task 36 deixou a passarela de fora porque o destrutível não aceitava `if`/`unless`; agora aceita (task 39).

**O que entraria:**
- **A passarela que o bicho parte:** um destrutível de madeira nos baixios, só na primeira ida, que o bote do Ykuruã
  quebra; quem está em cima cai na água rasa. Nada de novo no mundo: é o que o roteiro já descreve.
- **A chuva que aperta na final:** a cena 3.2 diz que "a chuva aperta" na virada. Já há a subida da água (`rise`); a
  chuva podia, além disso, cortar a vista a 4 quadrados até o fim da luta (o tiro de longe perde, ninguém se esconde
  de mais longe). Só se o autor quiser: a cena funciona sem.
- **Não entram:** lama (o lodo dos baixios já custa passo dobrado), ponte que cai (a ponte da clareira é de pedra, e
  cair seria fato novo), porta que fecha, hora do dia (nenhuma cena pede).

**O autor decide:** a passarela (sim ou não) e a chuva.

---

## 79. Tutorial — entra

**A cena que pede:** a abertura inteira é o tutorial (cena 0.2), e o roteiro pede "sem texto de tutorial chato": a
luta ensina pelo que acontece (o voto de Xanduí, o "Deixa que eu abro", o "Não no rio, rapaz").

**O que entraria:** dicas de primeira vez, uma linha cada, que aparecem uma vez só, na hora em que a coisa acontece
pela primeira vez, e nunca mais. Desligáveis nas Opções (Jogo, Dicas: sim/não). São texto da interface, como o resto
dos cartões, não fala de ninguém. As que a abertura pede:
- Primeiro turno do grupo: o que é ação, bônus e passo (a barra já mostra; a dica aponta pra ela).
- Primeira mira: as três faixas (pleno, com custo, falha) e o que a falha faz.
- Primeiro verbo que pega: a cadeia (emendar no mesmo alvo por Fôlego).
- Primeira recitação de Endyru: sai no turno seguinte, e apanhar no meio quebra.
- O voto de Xanduí: o botão apagado já diz por quê; a dica só aparece se o jogador clicar nele.
- Primeira luta com o guincho: o objetivo vence a luta.
- Primeira área com inimigo de olhar (a floresta): `Q` agacha, `F` embosca ou investe.

**O autor decide:** se quer as dicas, e se alguma sobra (ou falta).

---

## 80. Balanceamento — decisão de número, e uma correção na IA

O `balance:grupo` mostrou (task 103) que o grupo vence tudo, e que a final não pede o "jeito lento": as espadas
comem o Ykuruã dentro d'água. Testei duas mudanças, sem gravar nada no código (100 lutas por linha, a IA dos dois
lados):

| | Pedágio | Patrulha | Ponte | Final (com preparo) | Final (sem preparo) |
|---|---|---|---|---|---|
| Hoje | 100% / 2,3 rodadas | 100% / 1,3 | 100% / 2,4 | 100% / 3,9 | 100% / 3,9 |
| Água mais forte (Muralha 6→12, cura 6→10) | igual | igual | igual | 43% / 56 rodadas, Endyru cai 57% | igual à com preparo |
| Água mais forte e Golpe Pesado ×1,8→×1,4 | igual | 100% / 1,4 | 100% / 2,6 | 26% / 72 rodadas | igual à com preparo |

O que isso diz:
- **A água mais forte faz a final ser a luta difícil que o roteiro pede**, mas vira uma luta de 50 a 70 rodadas.
- **Com e sem preparo dá sempre o mesmo número.** A IA do grupo não puxa o bicho pra fora da água nem acende os
  círculos da margem: ela só bate. Um jogador que puxasse (o que o roteiro quer) venceria muito mais rápido. Esta parte
  não é número: é a IA, e conserto sem fato novo nenhum. Proposta: a IA de Endyru dá valor a tirar o Ykuruã da água
  (puxão e círculo), e a dos espadachins a segurar o bicho no seco (Segurar o Bote).
- **O Golpe Pesado** pesa nas lutas de gente (a patrulha cai num turno), não na final.

**O autor decide:** quanto a água protege o Ykuruã (Muralha e cura); se o Golpe Pesado baixa; e se eu conserto a IA
antes de medir de novo (recomendo: primeiro a IA, depois o número, porque com a IA certa a luta pode não precisar
de tanta água).
