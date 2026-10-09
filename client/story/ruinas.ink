// PROVISÓRIO, como o resto: um ponto pra examinar (npc sem `look`), com um
// teste de Ul de uma tentativa só e uma flag que muda o que se lê depois.

VAR inscricao_lida = false

=== inscricao ===
{inscricao_lida:
    As runas na parede do patamar. Você já sabe o que dizem: "aqui se guardava a luz para a noite longa".
    -> END
}
Há runas talhadas na parede do fundo do patamar, gastas quase até sumir.
* [Tentar ler. # check: ul 13]
    {passed():
        ~ inscricao_lida = true
        Os traços se arrumam aos poucos em notação Tirán: "aqui se guardava a luz para a noite longa".
        Um depósito de óleo, então. Faz sentido que ainda haja barris pelo salão.
        ~ grant_xp(15)
    - else:
        Os traços não viram palavra nenhuma. O que estava escrito aqui, a pedra não devolve mais a você.
    }
    -> END
+ [Deixar pra lá.]
    -> END

// PROVISÓRIO: a Sentinela exercita o que a história faz com o mapa. É um
// inimigo `passive` com `dialog` (dá pra falar com ele; não ataca nem pode
// ser emboscado), cercado por um `trigger` de `once` = false que avisa toda
// vez que se chega perto. Os dois têm `unless` = sentinela_fora: mudar essa
// variável tira a Sentinela e o aviso do mapa, com luta ou sem.

VAR sentinela_fora = false

=== sentinela_aviso ===
Sentinela: Alto. Este canto está sob guarda.
-> END

=== sentinela ===
Um servo de metal fosco, de pé num canto onde não sobrou nada pra guardar. A cabeça acompanha você com um rangido.
-> opcoes

= opcoes
* [Perguntar o que ela guarda.]
    Sentinela: O depósito. Entrada restrita ao turno da noite.
    O depósito é um retângulo de chão mais claro, e nada mais.
    -> opcoes
* [Dizer que o turno acabou. # check: len 13]
    {passed():
        Sentinela: Turno... encerrado. Registro aceito.
        Os ombros dela descem um dedo. A luz atrás dos olhos apaga devagar, como quem enfim tem licença pra isso.
        ~ sentinela_fora = true
        ~ grant_xp(20)
        -> END
    - else:
        Sentinela: Registro inválido. O turno não acaba por pedido.
        -> opcoes
    }
* [Oferecer um Pão de Cinza.]
    {take_item("item-pao-de-cinza"):
        Ela segura o pão sem saber o que fazer com ele, e não devolve.
        Sentinela: Suprimento recebido.
    - else:
        Você procura na mochila e não acha nenhum.
    }
    -> opcoes
+ [Atacar.]
    Sentinela: Intrusão.
    ~ start_fight("sentinela")
    -> END
+ [Deixá-la em paz.]
    -> END

// O `onDefeat` do grupo dela: abre quando ele cai.
=== sentinela_caiu ===
~ sentinela_fora = true
Entre as peças no chão, uma coisa que não é ferrugem.
~ give_item("item-estilhaco-de-prumo")
-> END

// PROVISÓRIO: as lutas com roteiro. Uma deixa (`cue`) no mapa abre um trecho
// NO MEIO da luta, e pode encerrá-la.
//
// A da Sentinela é a luta que acaba numa rodada (`when` = round 4, `ends` =
// stop): quem aguenta três rodadas vê o turno dela acabar sozinho. Ninguém
// vence, não há XP nem espólio — o estilhaço é de quem a derruba antes.
=== sentinela_fim_do_turno ===
~ sentinela_fora = true
O braço dela para no meio do golpe. Lá dentro, alguma coisa termina de contar.
Sentinela: Fim do turno da noite. Posto entregue.
A luz atrás dos olhos apaga. Ela fica de pé onde estava, e não é mais guarda de nada.
-> END

// As do salão são a luta que acaba num objetivo. A primeira (`when` = round
// 2, sem `ends`) só fala, e a luta segue: é a dica. A segunda (`when` = down
// Fiapo, `ends` = win) dá a vitória quando o Fiapo cai, com o servo de pé.
=== salao_compasso ===
O servo não bate a esmo. Cada golpe cai junto com o zumbido do fiapo, como quem segue um compasso.
Cale o fiapo, e o servo fica sem ter o que seguir.
-> END

=== salao_silencio ===
O zumbido some. O servo dá mais meio passo no compasso que não existe mais, e desaba sobre o próprio peso.
-> END
