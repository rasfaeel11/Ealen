# A luta

Como a magia do cânone (`../historiav2/referencias/magia.md`) e a Camada 1 do combate (`referencias/combate.md`)
viram luta de ação em terceira pessoa. O cânone manda; este doc só diz como se joga com mouse e controle. Os
números moram em `content/`, não aqui.

> **Estado: proposta do co-autor (2026-11-20), esperando o autor.** Supõe um protagonista mago de atração e
> repulsão, que é o conceito com mais detalhe no cânone e o que mais rende num jogo de física (`docs/historia.md`
> diz por quê). O que muda de sentido em relação ao livro está marcado com ⚠.

## 1. Os controles

| Teclado e mouse | Controle | O que faz |
|---|---|---|
| WASD | analógico esquerdo | anda (de lado, quando mira) |
| mouse | analógico direito | olha |
| botão direito (segurar) | LT | mira: a câmera aproxima e o personagem encara a mira |
| botão esquerdo (segurar) | RT | **recita** o feitiço escolhido; soltar conjura |
| botão esquerdo (toque) | RT (toque) | **cântico encurtado**: sai na hora e cobra mais (§3) |
| roda do mouse, 1 a 4 | cruz | escolhe o feitiço |
| Espaço | A | pula |
| Shift | B | esquiva (gasta Fôlego) |
| V | RB | Bordão: golpe de perto, sem mana |
| F | X | ativa a gravada mais perto |
| E | Y | interage |
| Q | L3 | troca de ombro |

## 2. Os feitiços (atração e repulsão)

O repertório cresce com o nível de mago (`magia` §3.6, §7.1). Começa na Página, chega ao Círculo; o Tomo fica
fora do alcance.

| Feitiço | Nível | O que faz no jogo |
|---|---|---|
| Puxão | Verso | puxa o que está na mira até perto. Objeto leve chega à mão; gente tropeça e cai |
| Empurrão | Verso | empurra para longe, em cone curto. Contra parede, prensa; da beirada, derruba |
| Arremesso | Círculo | segura um objeto no ar diante do corpo e o atira para onde se mira, com força de impacto |
| Desarmar | Círculo | arranca a arma da mão do alvo, e a arma vira objeto no chão |
| Desviar | Círculo | segurando, o primeiro projétil que viria passa ao lado, ou volta |
| Puxar-se | Círculo | puxa o próprio corpo até o ponto mirado numa superfície: subir, fugir, cruzar o vão |
| Cura | Página | primeiros socorros: acelera, e quem paga é o corpo (fome, Fôlego) (`magia` §4.3) |

O feitiço age entre dois corpos que o mago escolhe, perto e rápido (`magia` §3.6). Por isso todo feitiço tem
alcance curto ou médio, e a massa decide: pedra pesada se puxa devagar; barco não se puxa sem passar do limite.

## 3. Recitar

O cântico tem ordem (`magia` §2.6), e o jogo a mostra numa faixa embaixo da mira, linha por linha, enquanto se
segura o botão:

1. **Duas saudações**, à força que puxa e à que empurra. Não fazem nada, mas são o que deixa o feitiço barato.
2. **Os dois corpos nomeados.** Nesse momento o alvo **trava** onde a mira estiver. Mirar bem é mirar nessa hora.
3. **A medida**, dita em voz alta. É aqui que se escolhe o **tamanho** (§4).
4. **As rimas de lembrar.** Ao fim delas, soltar conjura pelo custo padrão.

- **Apanhou no meio, quebrou**, e recomeça do começo (`magia` §2.7). Quem recita fica à mostra.
- **Cântico encurtado** (toque em vez de segurar): larga as saudações e as rimas e fica só com os dois corpos e o
  verbo. Sai quase na hora e cobra no corpo: mais mana, e mais perto da marca (`magia` §2.6).
- **A gravada** (círculo riscado no chão, objeto) se escreve fora da luta, nos pontos de descanso, e na luta só se
  ativa (`F`): sai na hora, no tamanho padrão, e serve uma vez (`magia` §2.5). Chegar preparado é a vantagem.

## 4. O tamanho

Todo feitiço tem um tamanho padrão escrito na medida (`magia` §2.8). Durante a medida, um anel cresce em volta da
mira e passa por uma marca: o padrão.

- Soltar **no padrão** sai pelo custo padrão.
- **Maior** que o padrão empurra mais longe e puxa mais peso, e custa mais mana.
- **Menor** que o padrão também custa mais (as escolas ensinam isso sem explicar, e o jogo também não explica).
- A gravada sai sempre no padrão.

## 5. As três faixas

Toda conjuração termina numa faixa da Camada 1 (`combate` §2), e o evento `spellCast` leva a faixa.

| Faixa | Quando |
|---|---|
| **Plena** | cântico inteiro, solto no tamanho padrão |
| **Com custo** | cântico encurtado, ou fora do padrão: sai inteira e cobra mana a mais, que pode dar a marca |
| **Falha** | o texto quebrou: o tempo foi perdido, e quem recitava fica à mostra |

⚠ No livro a faixa sai do dado; aqui, da mão do jogador. O dado fica só no **improvável** (`combate` §5.2): uma
chance pequena de um impacto sair muito acima do esperado, que some contra quem está muito acima no nível.

## 6. O custo e a marca

- **Mana**: volta devagar quando não se gasta; o descanso enche. Os números estão em `content/tuning.json`.
- **Fôlego**: a esquiva, o pulo longo e o Bordão. Volta rápido.
- **O limite**: gastar numa janela curta mais do que o nível de mago aguenta passa do limite. Vem a **marca
  leve** de atração e repulsão: sangue pelo nariz e pelos olhos e tremor (a mira treme, o limite cai), até o
  descanso (`magia` §4.2).
- **O que sente mana vem.** Gasto grande de uma vez se sente de longe: o Ykuruã e as criaturas que o autor
  aprovar com essa regra vêm até onde a mana bateu (`bestiario` §1).
- ⚠ O gasto enorme (a marca permanente) não acontece: o jogo para antes, com o corpo do personagem recusando.

## 7. Quem se enfrenta

- **Espadachins.** Nos níveis baixos, o espadachim amassa o mago (`magia` §5.3, §7.3). Perto, eles são o maior
  perigo; o mago luta mantendo distância, usando o cenário e preparando o chão. As escolas viram jeitos de lutar
  (`combate` §4):
  - **Gryskar (Bate-Primeiro)**: avança direto e pesado; o segundo golpe sai fraco. Empurrão no avanço vira
    abertura.
  - **Ipojy (a Espera)**: nunca dá o primeiro golpe. Quem chega perto dela e erra leva o contragolpe pleno. Não se
    luta de perto com ela: se arremessa coisa.
  - **Tsvirana (a Correnteza)**: troca de golpe no meio e **pune quem repete**: o jogador que usa o mesmo feitiço
    três vezes seguidas fica exposto. Ensina a variar.
- **Besteiros e arqueiros**: o Desviar e a cobertura respondem a eles.
- **Magos**: recitam como o jogador, e quebram quando apanham, como o jogador.
- **Criaturas**: só as do bestiário da história. Hoje há uma, o Ykuruã: na água se cura e não se fere; se vence
  tirando-o da água aos poucos, sem passar do limite. Criatura nova vai para o autor antes (AGENTS §1).

## 8. As condições

Estado curto, com sinal claro na tela.

| Condição | O que faz | Vem de |
|---|---|---|
| Caído | levanta devagar; golpe nele sai pleno | Puxão, impacto |
| Prensado | não se mexe | Empurrão contra parede |
| Desarmado | sem arma até pegar de volta | Desarmar |
| Exposto | o próximo golpe nele sai pleno | falha, Tsvirana |
| Marca da mana | mira treme, limite menor | passar do limite |
