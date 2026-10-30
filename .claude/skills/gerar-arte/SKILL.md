---
name: gerar-arte
description: Gera a arte do jogo pelo Antigravity (Imagen, na assinatura do autor) ou pela API de imagens da OpenAI: retratos pintados, folhas de sprite 48x48 em pixel art, splash arts e o mapa do mundo, a partir de art/manifest.json, e registra no código. Use quando pedirem pra gerar, refazer ou acrescentar arte, retrato, sprite, splash ou mapa.
---

# Gerar arte

A arte gerada mora em três lugares:

- `art/manifest.json`: os prompts (em inglês) e a aparência (`look`) de cada personagem, criatura, splash e mapa.
- `art/gerar_arte.py`: chama a API, guarda o bruto em `art/raw/` (fora do git) e converte pro jogo em `client/public/`.
- `client/src/game/generatedArt.ts`: o registro que o jogo lê. É escrito pelo script, nunca à mão.

A regra completa (tamanhos, escala, como cada tipo entra no jogo) está em `docs/arte.md`. Leia antes de mudar o pipeline.

## Antes de gerar

1. **Cânone primeiro (AGENTS.md §1).** O `look` vira cânone quando aparece na tela. Personagem com `proposal: true`
   tem aparência proposta pelo co-autor e ainda não conferida com a ficha (`historiav2/fichas`): avise o autor disso
   ao gerar. Com `needsSheet: true` o script se recusa a gerar: a aparência tem de vir da ficha (o Thrykar espera a
   do povo demônio). Nunca invente traço de povo, marca, símbolo ou vestígio (§1.1).
2. O padrão é `--via agy`: o Antigravity CLI (`agy`, logado na assinatura do autor) gera pelo subagente
   `image-generator`, numa pasta temporária fora do projeto, cerca de um minuto e meio por imagem. Rode lotes grandes
   em segundo plano. `--via openai` usa a API da OpenAI e precisa de `OPENAI_API_KEY` (nunca a escreva em arquivo do
   repositório).
3. Gere só o que foi pedido; `--all` só quando o usuário pedir tudo.

## Comandos

O autor gera pelo navegador (Gemini na web, Nano Banana Pro): `prompts` escreve `art/PROMPTS.md` com cada prompt e o
nome do arquivo, e `importar <pasta>` traz o que ele baixou. Mudou o manifesto, rode `prompts` de novo.

```
python art/gerar_arte.py list                    # o que existe, o que falta, o que é proposta
python art/gerar_arte.py gen endyru              # retrato, folha e splash de Endyru (o retrato primeiro)
python art/gerar_arte.py gen endyru --only sheet # só a folha
python art/gerar_arte.py gen titulo mundo        # a tela de título e o mapa do mundo
python art/gerar_arte.py gen --all               # tudo que ainda não tem bruto
python art/gerar_arte.py gen jarupa --force      # de novo, por cima
python art/gerar_arte.py process --all           # refaz a conversão do bruto, sem chamar a API
```

`gen` já registra no fim. A folha usa o retrato bruto como referência: gere o retrato antes, pra o boneco ter a mesma
cara.

## Depois de gerar

1. Olhe cada imagem convertida (Read no PNG/JPG) antes de dizer que ficou boa: a folha tem de ter 4 linhas
   (frente, esquerda, direita, costas) com o mesmo boneco, o pé embaixo e nada vazando pro quadro do lado. Folha
   ruim: `gen <id> --only sheet --force`, ou ajuste o prompt no manifesto.
2. Rode `npm test` e o build do client (`npm run build -w @jogo/client`).
3. Faça o commit da conversão (`client/public/...`), do `generatedArt.ts` e do manifesto, se mudou. O bruto não vai.
4. Diga ao usuário o que foi gerado, o que é proposta a conferir com a ficha e o que ficou de fora.
