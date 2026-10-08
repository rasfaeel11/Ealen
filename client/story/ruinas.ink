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
