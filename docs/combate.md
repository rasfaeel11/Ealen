# A luta

Como a Camada 1 da história (`../historiav2/referencias/combate.md`) vira luta de action RPG. A Camada 1 manda:
este doc só diz como ela se joga com controle na mão. Os números moram em `content/`, não aqui.

> **Estado: proposta do co-autor (2026-11-20), esperando o autor.** A Camada 1 foi escrita para o dado; aqui
> quem decide a faixa é o tempo e a posição do jogador. O que muda de sentido está marcado com ⚠.

## 1. Os controles

| Tecla | Controle | O que faz |
|---|---|---|
| WASD | analógico esquerdo | anda |
| mouse | analógico direito | mira |
| botão esquerdo | RT | Bordão: golpe de perto, fraco, sem mana |
| botão direito (segurar) | LT | **Puxão**: recita enquanto segura, solta para sair |
| Q (segurar) | LB | **Empurrão**: o mesmo, para longe |
| Espaço | A | esquiva (gasta Fôlego); pula um degrau baixo |
| F | X | ativa a gravada mais perto |
| E | Y | interage, fala |
| 1, 2 | cruz | item |
| Tab | RB | ordem aos companheiros |

O que vem com o Círculo (Arremesso, Desarmar, Desviar, Puxar-se) entra nos mesmos botões, com segurar mais longo
ou com modificador; o desenho fica para a tarefa da magia.

## 2. As três faixas

Toda ação de luta termina numa faixa, e o evento leva a faixa.

| Ação | Plena | Com custo | Falha |
|---|---|---|---|
| Golpe (de qualquer um) | entra limpo: alvo sem guarda, de costas, de cima, Prensado, Caído | alvo de guarda: entra pouco, e quem bateu paga Fôlego | aparado ou esquivado: quem bateu fica **Exposto** |
| Recitação de Endyru | lida até o fim, dentro do limite | **solta antes do fim**: sai inteira, mas custa mais mana (pode passar do limite) | apanhou no meio: o texto quebra, e a mana da linha lida se perde |
| Esquiva | na janela: nada pega | fora da janela: pega pela metade | sem Fôlego: não sai |
| Aparar (espadachim) | na janela: o golpe para e o outro fica Exposto | tarde: para, e quem aparou paga Fôlego | fora: pega inteiro |

- ⚠ **O dado quase sai.** No livro, rola-se a pergunta; no jogo, a mão do jogador é a pergunta. O dado fica só no
  **improvável** (`combate` §5.2): uma chance pequena de o golpe sair dobrado, que some com diferença grande de
  nível, como na Camada 1.
- **Soltar antes do fim é a pressa.** É o cap-01 do roteiro do livro (Karuã encurta o cântico e paga): o botão
  que o jogador apressa é o que chama o bicho.
- **A falha nunca é "nada acontece"** (`combate` §2.3): Exposto é uma janela curta em que o golpe seguinte nele
  sai pleno.

## 3. Os custos

Do mundo, nunca um número solto (`combate` §2.2). Cada custo é um evento com a sua resposta na tela.

- **Fôlego**: a barra dos espadachins e da esquiva. Volta parado, devagar.
- **Mana**: a de Endyru. **Não volta na luta**; só o descanso devolve.
- **A marca**: passou do limite (mana gasta numa janela curta acima do nível de mago), vem sangue pelo nariz e
  tremor (a mira treme) e o limite cai. **E o Ykuruã sente**, onde estiver.
- **Tempo**: a recitação longa deixa Endyru parado e à mostra.
- **Posição**: quem bate de cima desce; quem bate de costas para a parede sai Prensado.
- **Gente em volta**: o que cai em quem estava perto. É o preço de Oryndu.

## 4. Verbos e condições

A cadeia da Camada 1 (`combate` §3) vira **combo**: o verbo que pega abre uma janela curta, e o verbo seguinte
no mesmo alvo sai mais barato e mais forte.

- Endyru encadeia com magia: Puxão (tira do lugar) → Bordão no que chegou; Empurrão contra a parede → Prensado →
  o golpe de Jarupã entra pleno.
- Os espadachins e a gente das lutas encadeiam com o corpo: Agarrar → Empurrar → Golpear.

As condições são estado da entidade, com duração curta e um sinal claro na tela:

| Condição | O que faz |
|---|---|
| Exposto | o próximo golpe nele sai pleno |
| Prensado | não se mexe, não apara |
| Caído | levanta devagar; golpe nele sai pleno |
| Agarrado | não anda nem recita |
| Desarmado | só verbos do corpo |
| Marca da mana | mira treme, limite menor |

## 5. As escolas

O triângulo sai do jeito de encadear (`combate` §4), não de bônus.

- **Ipojy, a Espera (Xanduí, a lança de Ymboripe).** Nunca dá o primeiro golpe da luta. Apara, e quando o outro
  falha, o contragolpe sai pleno sem rolar nada. Na IA de Xanduí: ela fica perto, de guarda, e pune.
- **Gryskar, o Bate-Primeiro (Jarupã, a espada de Ymboripe).** Toda a força no primeiro golpe: avança antes de
  todos, golpe pesado; o segundo da sequência sai fraco. Não recua antes do primeiro golpe.
- **Tsvirana, a Correnteza (Mbyraku, os batedores).** Troca de golpe no meio da sequência, e o golpe trocado não
  se apara. **Pune quem repete**: o jogador que faz a mesma coisa três vezes seguidas fica Exposto. É o inimigo que
  ensina a não apertar sempre o mesmo botão.

## 6. A magia

- **Recitada** (§2): segurar, soltar. O círculo aos pés de Endyru mostra quantas linhas já saíram. Uma de cada vez.
- **Gravada**: escrita no descanso, num objeto ou círculo; na luta, ativa na hora (`F`) e serve uma vez. O círculo
  gravado tem lugar no mapa: é a armadilha do mago, posta antes da luta.
- **Cura**: primeiros socorros, separada do conceito. Quem paga é o paciente (Fôlego, fome).
- Nos níveis baixos o espadachim amassa o mago (`magia` §5.3): Endyru é controle e preparo; quem mata são os dois.

## 7. Os companheiros

- Jarupã e Xanduí jogam pela IA, com as mesmas intenções do jogador. A ordem (`Tab`) troca o jeito: seguir,
  segurar posição, ir num alvo.
- Caído não morre: levanta com um aliado do lado. Todos caídos é derrota.
- ⚠ Jogar com eles (trocar de personagem) fica fora por enquanto: quem joga é Endyru (`docs/decisoes.md`).

## 8. O Ykuruã

O chefe do jogo e a prova dos pilares (`docs/historia.md`, `bestiario` §1).

- **Na água**: só as costas à mostra, couro duro (quase nada entra), se refaz. Escolhe onde subir; Oryndu, na
  margem, **lê a água** e o lugar aparece marcado no chão um pouco antes.
- **Sente a pressa**: a cada marca (§3), vai direto em quem conjurou.
- **Se vence tirando da água**: Puxão aos poucos, sem passar do limite, e os círculos gravados na margem. Em
  seco fica lento; depois de uns segundos fora d'água o couro racha, e aí a espada entra. Volta para a água, o
  couro se refaz.
- **O ato 3** continua de roteiro: na metade da vida dele, Endyru solta a página inteira, o bicho vem, o barco de
  Oryndu vira. Depois, só o jeito lento vence.
