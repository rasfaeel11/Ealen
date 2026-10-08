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
