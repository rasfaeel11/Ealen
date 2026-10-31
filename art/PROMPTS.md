# Prompts da arte

Gerado por `python art/gerar_arte.py prompts` a partir de `art/manifest.json`: não edite aqui, edite o manifesto
e gere de novo.

## Como usar (Gemini na web, Nano Banana Pro)

1. Uma conversa nova por personagem. Cole os prompts dele NA ORDEM: a ficha de design primeiro; o retrato e a
   folha usam a ficha que acabou de sair (se a conversa perder o fio, anexe a ficha de novo). Quem foi
   redesenhado começa do zero: em conversa nova, sem anexar nenhuma imagem antiga, ou o rosto velho volta.
2. Baixe cada imagem com o nome indicado (`endyru.design.png`, `endyru.portrait.png`...), todas na mesma pasta.
   Pode ser png, jpg ou webp.
3. Rode `python art/gerar_arte.py importar <a pasta>`: recorta o fundo verde, converte (o retrato pra 640x800, a
   folha pra 48x48 em pixel art) e registra no jogo. Depois, `npm run dev` e veja.
4. Ficou ruim? Gere de novo na mesma conversa ("de novo, mas...") e importe por cima. Saiu velho demais?
   Diga "the same character, ten years younger, no lines on the face", ou recomece numa conversa nova.

O que está marcado *proposta* tem aparência proposta pelo co-autor, ainda não conferida com a ficha da história.


## Endyru — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `endyru.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Endyru, a student barely twenty who looks eighteen: a gangly, skinny boy who has not finished growing, all elbows and wrists, too thin from skipping meals. A boyish oval face with soft cheeks and a pointed chin, slightly big ears, a thin straight nose, big quick dark eyes under thick eyebrows, a cocky lopsided grin of someone about to correct you, and only the first faint shadow of a moustache. Short, thick, curly black hair, uncombed, sticking up at the crown. A smear of white chalk on his jaw and black ink on his fingertips. A rust-brown wool doublet he has outgrown, the sleeves ending above the wrists, over a once-white linen shirt with an ink stain on the cuff; a short, dark teal hooded road cape, frayed at the hem and fastened with a wooden toggle; patched grey-brown breeches and scuffed, too-big boots. A cracked leather satchel at the hip, stuffed with folded papers and stubs of chalk; a knotted measuring cord looped at his belt, one knot every palm. A plain ash walking staff just taller than he is. Accent color: dark teal.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `endyru.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Endyru, a student barely twenty who looks eighteen: a gangly, skinny boy who has not finished growing, all elbows and wrists, too thin from skipping meals. A boyish oval face with soft cheeks and a pointed chin, slightly big ears, a thin straight nose, big quick dark eyes under thick eyebrows, a cocky lopsided grin of someone about to correct you, and only the first faint shadow of a moustache. Short, thick, curly black hair, uncombed, sticking up at the crown. A smear of white chalk on his jaw and black ink on his fingertips. A rust-brown wool doublet he has outgrown, the sleeves ending above the wrists, over a once-white linen shirt with an ink stain on the cuff; a short, dark teal hooded road cape, frayed at the hem and fastened with a wooden toggle; patched grey-brown breeches and scuffed, too-big boots. A cracked leather satchel at the hip, stuffed with folded papers and stubs of chalk; a knotted measuring cord looped at his belt, one knot every palm. A plain ash walking staff just taller than he is. Accent color: dark teal.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `endyru.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Endyru, a student barely twenty who looks eighteen: a gangly, skinny boy who has not finished growing, all elbows and wrists, too thin from skipping meals. A boyish oval face with soft cheeks and a pointed chin, slightly big ears, a thin straight nose, big quick dark eyes under thick eyebrows, a cocky lopsided grin of someone about to correct you, and only the first faint shadow of a moustache. Short, thick, curly black hair, uncombed, sticking up at the crown. A smear of white chalk on his jaw and black ink on his fingertips. A rust-brown wool doublet he has outgrown, the sleeves ending above the wrists, over a once-white linen shirt with an ink stain on the cuff; a short, dark teal hooded road cape, frayed at the hem and fastened with a wooden toggle; patched grey-brown breeches and scuffed, too-big boots. A cracked leather satchel at the hip, stuffed with folded papers and stubs of chalk; a knotted measuring cord looped at his belt, one knot every palm. A plain ash walking staff just taller than he is. Accent color: dark teal.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```

### Splash art → salve como `endyru.splash.png`

```
Use the character design sheet above (or attached) as the reference for the character.

Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Endyru, young and thin, kneels in the mud of a riverbank at dusk, chalk in hand, scratching a circle of measured symbols into the wet ground, tongue between his teeth, the knotted cord pulled taut from a stake beside it, rain beginning, a flat barge and grey water behind him.

The character: Endyru, a student barely twenty who looks eighteen: a gangly, skinny boy who has not finished growing, all elbows and wrists, too thin from skipping meals. A boyish oval face with soft cheeks and a pointed chin, slightly big ears, a thin straight nose, big quick dark eyes under thick eyebrows, a cocky lopsided grin of someone about to correct you, and only the first faint shadow of a moustache. Short, thick, curly black hair, uncombed, sticking up at the crown. A smear of white chalk on his jaw and black ink on his fingertips. A rust-brown wool doublet he has outgrown, the sleeves ending above the wrists, over a once-white linen shirt with an ink stain on the cuff; a short, dark teal hooded road cape, frayed at the hem and fastened with a wooden toggle; patched grey-brown breeches and scuffed, too-big boots. A cracked leather satchel at the hip, stuffed with folded papers and stubs of chalk; a knotted measuring cord looped at his belt, one knot every palm. A plain ash walking staff just taller than he is. Accent color: dark teal.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```


## Jarupã — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `jarupa.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Jarupã, a young man of twenty-three who escorts river barges with his sword: a big, heavy-boned farm boy gone to the road, thick neck and huge forearms, sunburnt nose and neck on a broad, round, cheerful young face, a wide gap-toothed grin, a blunt nose, short-cropped sandy-brown hair with a full hairline, and a patchy young beard that will not grow in. A fresh shallow cut on the forearm he has not bothered to wrap. A sweat-stained linen shirt with the sleeves rolled to the shoulder, a scarred oxblood leather jerkin left unlaced, a rope belt. His weapon is a long, heavy two-handed greatsword: a perfectly straight double-edged steel blade ending in a sharp point, a plain cross guard, a long grip, a few small nicks along the edge. He carries it flat across one shoulder, one hand on the grip. It is unmistakably a sword in every view, with nothing at the tip: no hook, no axe head, no hoe blade. Loud, cheerful, utterly sure of a bad idea. Accent color: oxblood red.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `jarupa.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Jarupã, a young man of twenty-three who escorts river barges with his sword: a big, heavy-boned farm boy gone to the road, thick neck and huge forearms, sunburnt nose and neck on a broad, round, cheerful young face, a wide gap-toothed grin, a blunt nose, short-cropped sandy-brown hair with a full hairline, and a patchy young beard that will not grow in. A fresh shallow cut on the forearm he has not bothered to wrap. A sweat-stained linen shirt with the sleeves rolled to the shoulder, a scarred oxblood leather jerkin left unlaced, a rope belt. His weapon is a long, heavy two-handed greatsword: a perfectly straight double-edged steel blade ending in a sharp point, a plain cross guard, a long grip, a few small nicks along the edge. He carries it flat across one shoulder, one hand on the grip. It is unmistakably a sword in every view, with nothing at the tip: no hook, no axe head, no hoe blade. Loud, cheerful, utterly sure of a bad idea. Accent color: oxblood red.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `jarupa.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Jarupã, a young man of twenty-three who escorts river barges with his sword: a big, heavy-boned farm boy gone to the road, thick neck and huge forearms, sunburnt nose and neck on a broad, round, cheerful young face, a wide gap-toothed grin, a blunt nose, short-cropped sandy-brown hair with a full hairline, and a patchy young beard that will not grow in. A fresh shallow cut on the forearm he has not bothered to wrap. A sweat-stained linen shirt with the sleeves rolled to the shoulder, a scarred oxblood leather jerkin left unlaced, a rope belt. His weapon is a long, heavy two-handed greatsword: a perfectly straight double-edged steel blade ending in a sharp point, a plain cross guard, a long grip, a few small nicks along the edge. He carries it flat across one shoulder, one hand on the grip. It is unmistakably a sword in every view, with nothing at the tip: no hook, no axe head, no hoe blade. Loud, cheerful, utterly sure of a bad idea. Accent color: oxblood red.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```

### Splash art → salve como `jarupa.splash.png`

```
Use the character design sheet above (or attached) as the reference for the character.

Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Jarupã, big and young, charges first across a wet stone bridge in the rain, the long two-handed greatsword already swinging, grinning; soldiers of different noble houses, in bright mismatched tabards of crimson, green and white, each with the same blue band on the sleeve, brace at the far end.

The character: Jarupã, a young man of twenty-three who escorts river barges with his sword: a big, heavy-boned farm boy gone to the road, thick neck and huge forearms, sunburnt nose and neck on a broad, round, cheerful young face, a wide gap-toothed grin, a blunt nose, short-cropped sandy-brown hair with a full hairline, and a patchy young beard that will not grow in. A fresh shallow cut on the forearm he has not bothered to wrap. A sweat-stained linen shirt with the sleeves rolled to the shoulder, a scarred oxblood leather jerkin left unlaced, a rope belt. His weapon is a long, heavy two-handed greatsword: a perfectly straight double-edged steel blade ending in a sharp point, a plain cross guard, a long grip, a few small nicks along the edge. He carries it flat across one shoulder, one hand on the grip. It is unmistakably a sword in every view, with nothing at the tip: no hook, no axe head, no hoe blade. Loud, cheerful, utterly sure of a bad idea. Accent color: oxblood red.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```


## Xanduí — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `xandui.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Xanduí, a woman of about twenty-two who escorts river barges with her sword. Lean and wiry, weather-tanned, high cheekbones, strong straight eyebrows, dark eyes that measure you without hurry. Black hair in one tight practical braid, a few strands stuck to her temple by river damp. A dull, much-repaired leather jerkin over a faded ochre wool shirt, the jerkin's inner pocket bulging slightly. Her hand rests on the pommel of a plain straight sword, the grip worn dark by her palm. Dry, patient, unimpressed, the corner of her mouth almost but not quite amused. Accent color: faded ochre.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `xandui.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Xanduí, a woman of about twenty-two who escorts river barges with her sword. Lean and wiry, weather-tanned, high cheekbones, strong straight eyebrows, dark eyes that measure you without hurry. Black hair in one tight practical braid, a few strands stuck to her temple by river damp. A dull, much-repaired leather jerkin over a faded ochre wool shirt, the jerkin's inner pocket bulging slightly. Her hand rests on the pommel of a plain straight sword, the grip worn dark by her palm. Dry, patient, unimpressed, the corner of her mouth almost but not quite amused. Accent color: faded ochre.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `xandui.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Xanduí, a woman of about twenty-two who escorts river barges with her sword. Lean and wiry, weather-tanned, high cheekbones, strong straight eyebrows, dark eyes that measure you without hurry. Black hair in one tight practical braid, a few strands stuck to her temple by river damp. A dull, much-repaired leather jerkin over a faded ochre wool shirt, the jerkin's inner pocket bulging slightly. Her hand rests on the pommel of a plain straight sword, the grip worn dark by her palm. Dry, patient, unimpressed, the corner of her mouth almost but not quite amused. Accent color: faded ochre.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```

### Splash art → salve como `xandui.splash.png`

```
Use the character design sheet above (or attached) as the reference for the character.

Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Xanduí stands perfectly still in waist-high river reeds at dawn, sword still in its sheath, hand on the pommel, waiting for the other one to move first; mist around her, a dark shape in the water behind the reeds.

The character: Xanduí, a woman of about twenty-two who escorts river barges with her sword. Lean and wiry, weather-tanned, high cheekbones, strong straight eyebrows, dark eyes that measure you without hurry. Black hair in one tight practical braid, a few strands stuck to her temple by river damp. A dull, much-repaired leather jerkin over a faded ochre wool shirt, the jerkin's inner pocket bulging slightly. Her hand rests on the pommel of a plain straight sword, the grip worn dark by her palm. Dry, patient, unimpressed, the corner of her mouth almost but not quite amused. Accent color: faded ochre.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```


## Oryndu

### Ficha de design (frente, 3/4, perfil, costas) → salve como `oryndu.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Oryndu, a river boatman of about fifty. Small and hard as a knot of driftwood, skin cured dark by sun and water, deep creases around eyes narrowed against river glare, a white stubble. A shapeless wide-brimmed hat of plaited reeds, darkened by rain; a collarless undyed linen shirt, a tar-stained canvas vest, a rope belt with a fishing knife. He holds a long, smooth, grey boat pole worn pale where his hands go. Patient, sceptical, unhurried. Accent color: river green-grey.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `oryndu.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Oryndu, a river boatman of about fifty. Small and hard as a knot of driftwood, skin cured dark by sun and water, deep creases around eyes narrowed against river glare, a white stubble. A shapeless wide-brimmed hat of plaited reeds, darkened by rain; a collarless undyed linen shirt, a tar-stained canvas vest, a rope belt with a fishing knife. He holds a long, smooth, grey boat pole worn pale where his hands go. Patient, sceptical, unhurried. Accent color: river green-grey.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `oryndu.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Oryndu, a river boatman of about fifty. Small and hard as a knot of driftwood, skin cured dark by sun and water, deep creases around eyes narrowed against river glare, a white stubble. A shapeless wide-brimmed hat of plaited reeds, darkened by rain; a collarless undyed linen shirt, a tar-stained canvas vest, a rope belt with a fishing knife. He holds a long, smooth, grey boat pole worn pale where his hands go. Patient, sceptical, unhurried. Accent color: river green-grey.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```

### Splash art → salve como `oryndu.splash.png`

```
Use the character design sheet above (or attached) as the reference for the character.

Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Oryndu at the stern of his flat river barge at dusk, tapping the hull slowly with the long pole to listen to the water, the river too still, crabs climbing the reeds.

The character: Oryndu, a river boatman of about fifty. Small and hard as a knot of driftwood, skin cured dark by sun and water, deep creases around eyes narrowed against river glare, a white stubble. A shapeless wide-brimmed hat of plaited reeds, darkened by rain; a collarless undyed linen shirt, a tar-stained canvas vest, a rope belt with a fishing knife. He holds a long, smooth, grey boat pole worn pale where his hands go. Patient, sceptical, unhurried. Accent color: river green-grey.

Aspect ratio 16:9, at the highest resolution you can.
```


## Conselheira

### Ficha de design (frente, 3/4, perfil, costas) → salve como `conselheira.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A councillor of a free trade city run by merchant guilds, a woman of about fifty. Grey hair pinned hard under a dark linen coif, a long narrow face, tired heavy-lidded eyes that have counted every coin twice, thin pressed lips. A sober, expensive charcoal wool gown with a high collar, a chain of small brass guild seals at her belt, a thick ledger bound in calfskin held against her chest. Accent color: dull brass.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `conselheira.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A councillor of a free trade city run by merchant guilds, a woman of about fifty. Grey hair pinned hard under a dark linen coif, a long narrow face, tired heavy-lidded eyes that have counted every coin twice, thin pressed lips. A sober, expensive charcoal wool gown with a high collar, a chain of small brass guild seals at her belt, a thick ledger bound in calfskin held against her chest. Accent color: dull brass.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `conselheira.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A councillor of a free trade city run by merchant guilds, a woman of about fifty. Grey hair pinned hard under a dark linen coif, a long narrow face, tired heavy-lidded eyes that have counted every coin twice, thin pressed lips. A sober, expensive charcoal wool gown with a high collar, a chain of small brass guild seals at her belt, a thick ledger bound in calfskin held against her chest. Accent color: dull brass.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Escrivão da Mesa — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `escrivao.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: An old clerk of a contracts office, a man of about seventy. Bald and spotted, thin white wisps over the ears, a long nose with a drip at the end, small wet watchful eyes. A grey goose quill behind one ear, black ink crusted under every nail. A long, threadbare black wool overcoat too big for him, matte cloth gone shiny only at the elbows and cuffs, buttoned to the neck with a small plain collar, no lapels, not leather; soft old shoes. Under one arm, always the same arm, he clutches exactly one heavy register book with iron corners: one book only, in every view, never two. Accent color: iron-gall ink black.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `escrivao.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: An old clerk of a contracts office, a man of about seventy. Bald and spotted, thin white wisps over the ears, a long nose with a drip at the end, small wet watchful eyes. A grey goose quill behind one ear, black ink crusted under every nail. A long, threadbare black wool overcoat too big for him, matte cloth gone shiny only at the elbows and cuffs, buttoned to the neck with a small plain collar, no lapels, not leather; soft old shoes. Under one arm, always the same arm, he clutches exactly one heavy register book with iron corners: one book only, in every view, never two. Accent color: iron-gall ink black.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `escrivao.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: An old clerk of a contracts office, a man of about seventy. Bald and spotted, thin white wisps over the ears, a long nose with a drip at the end, small wet watchful eyes. A grey goose quill behind one ear, black ink crusted under every nail. A long, threadbare black wool overcoat too big for him, matte cloth gone shiny only at the elbows and cuffs, buttoned to the neck with a small plain collar, no lapels, not leather; soft old shoes. Under one arm, always the same arm, he clutches exactly one heavy register book with iron corners: one book only, in every view, never two. Accent color: iron-gall ink black.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Mestre da guilda

### Ficha de design (frente, 3/4, perfil, costas) → salve como `mestre_da_guilda.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: The master of the boatmen's guild, a man of about sixty. Broad as a barrel, a grizzled beard cut square, a nose broken more than once, forearms like hawsers crossed with old rope burns. A heavy oiled canvas coat over a fisherman's sweater, a thick coil of tarred rope over one shoulder, a guild token of carved bone on a cord. Gruff, proud, grieving his city. Accent color: tar brown.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `mestre_da_guilda.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: The master of the boatmen's guild, a man of about sixty. Broad as a barrel, a grizzled beard cut square, a nose broken more than once, forearms like hawsers crossed with old rope burns. A heavy oiled canvas coat over a fisherman's sweater, a thick coil of tarred rope over one shoulder, a guild token of carved bone on a cord. Gruff, proud, grieving his city. Accent color: tar brown.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `mestre_da_guilda.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: The master of the boatmen's guild, a man of about sixty. Broad as a barrel, a grizzled beard cut square, a nose broken more than once, forearms like hawsers crossed with old rope burns. A heavy oiled canvas coat over a fisherman's sweater, a thick coil of tarred rope over one shoulder, a guild token of carved bone on a cord. Gruff, proud, grieving his city. Accent color: tar brown.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Thrykar — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `thrykar.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Thrykar, a demon blacksmith in a human river city, a man who looks about fifty. Demons here are simply a people, not monsters: an ordinary human body and human skin, with NO horns, NO tail, NO fangs, NO red skin and nothing glowing. The only marks of his people: ears a little more pointed than a human's, fingernails a little longer and more pointed, and mismatched eyes, one amber and one grey. Broad, short-necked, enormous forge-scarred hands and forearms, a closed, deadpan face that has never told a joke on purpose, a singed black beard, soot in every crease. A burned leather apron over bare arms, a heavy hammer. Accent color: forge-ember orange.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `thrykar.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Thrykar, a demon blacksmith in a human river city, a man who looks about fifty. Demons here are simply a people, not monsters: an ordinary human body and human skin, with NO horns, NO tail, NO fangs, NO red skin and nothing glowing. The only marks of his people: ears a little more pointed than a human's, fingernails a little longer and more pointed, and mismatched eyes, one amber and one grey. Broad, short-necked, enormous forge-scarred hands and forearms, a closed, deadpan face that has never told a joke on purpose, a singed black beard, soot in every crease. A burned leather apron over bare arms, a heavy hammer. Accent color: forge-ember orange.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `thrykar.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Thrykar, a demon blacksmith in a human river city, a man who looks about fifty. Demons here are simply a people, not monsters: an ordinary human body and human skin, with NO horns, NO tail, NO fangs, NO red skin and nothing glowing. The only marks of his people: ears a little more pointed than a human's, fingernails a little longer and more pointed, and mismatched eyes, one amber and one grey. Broad, short-necked, enormous forge-scarred hands and forearms, a closed, deadpan face that has never told a joke on purpose, a singed black beard, soot in every crease. A burned leather apron over bare arms, a heavy hammer. Accent color: forge-ember orange.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Mercador

### Ficha de design (frente, 3/4, perfil, costas) → salve como `mercador.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A salt merchant of the river trade, a man of about forty-five. Soft, plump, pink-cheeked, a careful little beard, small anxious eyes, damp curls stuck to his forehead. A good burgundy coat with a fur collar soaked and dark from river spray, rings on fat fingers, a heavy purse held close to his belly with both hands. Stingy, frightened, insistent. Accent color: wet burgundy.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `mercador.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A salt merchant of the river trade, a man of about forty-five. Soft, plump, pink-cheeked, a careful little beard, small anxious eyes, damp curls stuck to his forehead. A good burgundy coat with a fur collar soaked and dark from river spray, rings on fat fingers, a heavy purse held close to his belly with both hands. Stingy, frightened, insistent. Accent color: wet burgundy.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `mercador.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A salt merchant of the river trade, a man of about forty-five. Soft, plump, pink-cheeked, a careful little beard, small anxious eyes, damp curls stuck to his forehead. A good burgundy coat with a fur collar soaked and dark from river spray, rings on fat fingers, a heavy purse held close to his belly with both hands. Stingy, frightened, insistent. Accent color: wet burgundy.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Mulher da família

### Ficha de design (frente, 3/4, perfil, costas) → salve como `familia.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A mother from the docks of a dying river city, a woman of about thirty-five. Thin, hollow-cheeked, hair escaping a frayed headscarf, a child's wooden toy tucked in her apron, a big bundle of belongings tied in a blanket on her back. A patched brown wool dress. Exhausted, decided. Accent color: faded madder red.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `familia.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A mother from the docks of a dying river city, a woman of about thirty-five. Thin, hollow-cheeked, hair escaping a frayed headscarf, a child's wooden toy tucked in her apron, a big bundle of belongings tied in a blanket on her back. A patched brown wool dress. Exhausted, decided. Accent color: faded madder red.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `familia.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A mother from the docks of a dying river city, a woman of about thirty-five. Thin, hollow-cheeked, hair escaping a frayed headscarf, a child's wooden toy tucked in her apron, a big bundle of belongings tied in a blanket on her back. A patched brown wool dress. Exhausted, decided. Accent color: faded madder red.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Vendedora do cais

### Ficha de design (frente, 3/4, perfil, costas) → salve como `vendedora.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A woman who sells bread at a stall on the docks, about forty. Big, strong-armed, flour to the elbows, a red face shiny from the oven, a stained apron, a knife for cutting bread stuck in her belt, a basket of hard dark travel loaves. Shrewd, loud, honest. Accent color: oven orange.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `vendedora.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A woman who sells bread at a stall on the docks, about forty. Big, strong-armed, flour to the elbows, a red face shiny from the oven, a stained apron, a knife for cutting bread stuck in her belt, a basket of hard dark travel loaves. Shrewd, loud, honest. Accent color: oven orange.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```


## Sargento do pedágio

### Ficha de design (frente, 3/4, perfil, costas) → salve como `sargento.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: The sergeant of a river toll castle, a man of about forty-five. Fleshy face, small greedy eyes, a drooping moustache, a red drinker's nose. A greasy padded gambeson under a faded tabard of the toll castle, dull yellow with a black chain across it; an iron kettle helmet pushed back on his head; a bill polearm leaning on his shoulder. Bored and greedy. Accent color: dull yellow.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `sargento.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: The sergeant of a river toll castle, a man of about forty-five. Fleshy face, small greedy eyes, a drooping moustache, a red drinker's nose. A greasy padded gambeson under a faded tabard of the toll castle, dull yellow with a black chain across it; an iron kettle helmet pushed back on his head; a bill polearm leaning on his shoulder. Bored and greedy. Accent color: dull yellow.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```


## Guarda do portão — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `guarda_do_portao.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A young gate guard of a river toll castle, about eighteen. Thin, pimpled, trying to look hard, a helmet slightly too big. A padded gambeson under the toll castle tabard, strong mustard yellow with a black chain across it; a short sword at the hip. Accent color: strong mustard yellow.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `guarda_do_portao.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A young gate guard of a river toll castle, about eighteen. Thin, pimpled, trying to look hard, a helmet slightly too big. A padded gambeson under the toll castle tabard, strong mustard yellow with a black chain across it; a short sword at the hip. Accent color: strong mustard yellow.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `guarda_do_portao.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A young gate guard of a river toll castle, about eighteen. Thin, pimpled, trying to look hard, a helmet slightly too big. A padded gambeson under the toll castle tabard, strong mustard yellow with a black chain across it; a short sword at the hip. Accent color: strong mustard yellow.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Mbyraku

### Ficha de design (frente, 3/4, perfil, costas) → salve como `mbyraku.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Mbyraku, the castellan of a river toll castle, a man in his forties. A hard, flat, closed face, a clipped iron-grey beard, cold pale eyes that appraise what you are worth, an old scar across the bridge of the nose. A coat of small blackened iron scales over a quilted gambeson, a dull yellow sash of the toll castle, a heavy ring of keys at his belt, a straight sword. He never raises his voice. Accent color: blackened iron.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `mbyraku.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Mbyraku, the castellan of a river toll castle, a man in his forties. A hard, flat, closed face, a clipped iron-grey beard, cold pale eyes that appraise what you are worth, an old scar across the bridge of the nose. A coat of small blackened iron scales over a quilted gambeson, a dull yellow sash of the toll castle, a heavy ring of keys at his belt, a straight sword. He never raises his voice. Accent color: blackened iron.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `mbyraku.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Mbyraku, the castellan of a river toll castle, a man in his forties. A hard, flat, closed face, a clipped iron-grey beard, cold pale eyes that appraise what you are worth, an old scar across the bridge of the nose. A coat of small blackened iron scales over a quilted gambeson, a dull yellow sash of the toll castle, a heavy ring of keys at his belt, a straight sword. He never raises his voice. Accent color: blackened iron.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Jurendy — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `jurendy.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Jurendy, a young mage of twenty-one, a former classmate of Endyru from a rich family, now in the pay of the upper duchy. Well fed, smooth skin, a soft chin, neatly oiled dark hair, a mild smug half-smile, clean fingernails. A fine, spotless travelling cloak in vivid royal blue over a black coat with silver buttons and a linen collar, the crest of the upper duchy embroidered on the chest: a white three-peaked mountain over a white wavy line on royal blue. A polished, iron-shod wooden staff; a bound book of his own notes under his arm. Not a villain in his own eyes: someone who did the sums. Accent color: royal blue with silver.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `jurendy.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: Jurendy, a young mage of twenty-one, a former classmate of Endyru from a rich family, now in the pay of the upper duchy. Well fed, smooth skin, a soft chin, neatly oiled dark hair, a mild smug half-smile, clean fingernails. A fine, spotless travelling cloak in vivid royal blue over a black coat with silver buttons and a linen collar, the crest of the upper duchy embroidered on the chest: a white three-peaked mountain over a white wavy line on royal blue. A polished, iron-shod wooden staff; a bound book of his own notes under his arm. Not a villain in his own eyes: someone who did the sums. Accent color: royal blue with silver.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `jurendy.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: Jurendy, a young mage of twenty-one, a former classmate of Endyru from a rich family, now in the pay of the upper duchy. Well fed, smooth skin, a soft chin, neatly oiled dark hair, a mild smug half-smile, clean fingernails. A fine, spotless travelling cloak in vivid royal blue over a black coat with silver buttons and a linen collar, the crest of the upper duchy embroidered on the chest: a white three-peaked mountain over a white wavy line on royal blue. A polished, iron-shod wooden staff; a bound book of his own notes under his arm. Not a villain in his own eyes: someone who did the sums. Accent color: royal blue with silver.

AGE IS THE MOST IMPORTANT THING IN THIS IMAGE. This is a young person and must look young at first glance: a fresh, full-cheeked face, smooth unlined skin, a soft jaw, clear bright eyes, a full hairline. Absolutely no wrinkles, no crow's feet, no forehead lines, no creases beside the mouth, no bags under the eyes, no sunken cheeks, no grey hair, no heavy beard. Paint the face in broad, simple, smooth planes of color, never with the deep creases of an old man's portrait. If in doubt, make them look younger.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Saqueador — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `saqueador.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A caravan mercenary turned looter, a man of about thirty. Gaunt, unshaven, hollow hungry eyes, a ragged ear, hair matted with river damp. A battered leather jerkin with the stitching gone, a stolen coil of rope over his shoulder, a heavy two-handed sword with a rusty blade. Accent color: rust.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `saqueador.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A caravan mercenary turned looter, a man of about thirty. Gaunt, unshaven, hollow hungry eyes, a ragged ear, hair matted with river damp. A battered leather jerkin with the stitching gone, a stolen coil of rope over his shoulder, a heavy two-handed sword with a rusty blade. Accent color: rust.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `saqueador.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A caravan mercenary turned looter, a man of about thirty. Gaunt, unshaven, hollow hungry eyes, a ragged ear, hair matted with river damp. A battered leather jerkin with the stitching gone, a stolen coil of rope over his shoulder, a heavy two-handed sword with a rusty blade. Accent color: rust.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Saqueadora — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `saqueadora.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A caravan mercenary turned looter, a woman of about twenty-eight. Wiry, short-cropped hair, a scar across her chin, a split lip, mocking eyes. A cracked leather jerkin, a stolen oil flask at her belt, a straight sword held low. Accent color: rust.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `saqueadora.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A caravan mercenary turned looter, a woman of about twenty-eight. Wiry, short-cropped hair, a scar across her chin, a split lip, mocking eyes. A cracked leather jerkin, a stolen oil flask at her belt, a straight sword held low. Accent color: rust.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `saqueadora.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A caravan mercenary turned looter, a woman of about twenty-eight. Wiry, short-cropped hair, a scar across her chin, a split lip, mocking eyes. A cracked leather jerkin, a stolen oil flask at her belt, a straight sword held low. Accent color: rust.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Contratada — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `contratada.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A hired scout paid by the upper duchy, a woman of about thirty. Lean, freckled, red-brown hair under a deep hood, a crooked knowing smile, a professional's calm. A mud-green hooded travel cloak, mismatched pieces of leather armour, a straight sword. Accent color: mud green.

Aspect ratio 16:9, at the highest resolution you can.
```

### Retrato (caixa de diálogo) → salve como `contratada.portrait.png`

```
Use the character design sheet above (or attached) as the reference: the same person, same face, hair, outfit and colors.

A character portrait for a dark adult fantasy RPG, painted as a heavy expressionist oil painting: thick impasto, visible palette-knife and brush strokes, rough unfinished edges where the figure dissolves into the background. A restrained palette of river mud, rust, bone and slate with one accent color specific to the character. Strong chiaroscuro from a single low light source on the left; the right side of the face sinking into shadow. Not glossy, not airbrushed, not digital-smooth, not a generic fantasy hero: a specific person caught in a characteristic expression, exactly the age described. Chest-up, three-quarter view, the body cut at the bottom edge of the image.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A hired scout paid by the upper duchy, a woman of about thirty. Lean, freckled, red-brown hair under a deep hood, a crooked knowing smile, a professional's calm. A mud-green hooded travel cloak, mismatched pieces of leather armour, a straight sword. Accent color: mud green.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 3:4, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `contratada.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A hired scout paid by the upper duchy, a woman of about thirty. Lean, freckled, red-brown hair under a deep hood, a crooked knowing smile, a professional's calm. A mud-green hooded travel cloak, mismatched pieces of leather armour, a straight sword. Accent color: mud green.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Contratado — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `contratado.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A hired scout paid by the upper duchy, a man of about thirty-five. Lanky, bearded, a hood, a mud-green travel cloak, mismatched leather armour pieces, a straight sword. Accent color: mud green.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `contratado.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A hired scout paid by the upper duchy, a man of about thirty-five. Lanky, bearded, a hood, a mud-green travel cloak, mismatched leather armour pieces, a straight sword. Accent color: mud green.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Guarda do pedágio — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `guarda_do_pedagio.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A soldier of a river toll castle. A padded gambeson under a dull yellow tabard with a black chain across it, an iron kettle helmet, a long bill polearm. Accent color: strong mustard yellow.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `guarda_do_pedagio.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A soldier of a river toll castle. A padded gambeson under a dull yellow tabard with a black chain across it, an iron kettle helmet, a long bill polearm. Accent color: strong mustard yellow.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Besteiro — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `besteiro.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A crossbowman of a river toll castle. A linen tunic under a dull yellow tabard with a black chain across it, a quiver of bolts at the hip, a heavy crossbow with a winding crank. Accent color: strong mustard yellow.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `besteiro.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A crossbowman of a river toll castle. A linen tunic under a dull yellow tabard with a black chain across it, a quiver of bolts at the hip, a heavy crossbow with a winding crank. Accent color: strong mustard yellow.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Espada de Ymboripe — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `espada_de_ymboripe.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A soldier from a noble house sworn to the upper duchy. A leather jerkin under a bright crimson tabard bearing a golden pike fish, a steel cap, a heavy two-handed sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: crimson and gold.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `espada_de_ymboripe.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A soldier from a noble house sworn to the upper duchy. A leather jerkin under a bright crimson tabard bearing a golden pike fish, a steel cap, a heavy two-handed sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: crimson and gold.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Lança de Ymboripe — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `lanca_de_ymboripe.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A soldier from a noble house sworn to the upper duchy. A leather jerkin under a white tabard bearing a black otter, a steel cap, a long bill polearm held upright. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: white and black.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `lanca_de_ymboripe.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A soldier from a noble house sworn to the upper duchy. A leather jerkin under a white tabard bearing a black otter, a steel cap, a long bill polearm held upright. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: white and black.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Espada do vale — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `espada_do_vale.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A soldier from another noble house sworn to the upper duchy. A leather jerkin under a bright forest-green tabard bearing a white heron, a steel cap, a heavy two-handed sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: forest green and white.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `espada_do_vale.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A soldier from another noble house sworn to the upper duchy. A leather jerkin under a bright forest-green tabard bearing a white heron, a steel cap, a heavy two-handed sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: forest green and white.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Lança da serra — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `lanca_da_serra.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A soldier from another noble house sworn to the upper duchy. A leather jerkin under a bright orange tabard bearing a black boar, a steel cap, a long bill polearm held upright. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: orange and black.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `lanca_da_serra.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A soldier from another noble house sworn to the upper duchy. A leather jerkin under a bright orange tabard bearing a black boar, a steel cap, a long bill polearm held upright. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: orange and black.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## Escudeiro — *proposta*

### Ficha de design (frente, 3/4, perfil, costas) → salve como `escudeiro.design.png`

```
A professional character design turnaround sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and the same restrained palette (river mud, rust, bone, slate, plus the character's accent color). The same character shown full body, standing in a relaxed neutral pose, four times side by side at exactly the same scale and height: front view, three-quarter view, side profile facing right, back view. Every detail of the outfit, weapon and gear identical between the views and clearly readable, the same number of objects in the same hand in all four; both legs fully painted in every view: this sheet is the reference for the game sprite and the portrait. A small strip of 6 to 8 flat color swatches of the character's palette in the bottom corner. Plain flat light grey background, soft even light, no cast shadows on the background, no text, no labels.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character: A young squire of a minor noble family, in service at a toll castle. A padded gambeson under a wine-red tabard bearing a golden mill wheel, a round shield painted the same, a short sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: wine red and gold.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `escudeiro.sheet.png`

```
Use the character design sheet above (or attached) as the reference for every direction: front, sides and back, same outfit and colors.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors with the character's accent color, strong readable silhouette, chunky but detailed. The character is about 2.5 heads tall, slightly stylized, keeping the face shape, hair, outfit and colors of the reference. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one full-body figure per cell, feet at the bottom of each cell, nothing crossing into the neighbouring cell. Exactly 4 columns, never more. Row 1: walking toward the viewer. Row 2: walking to the left, with head, chest and toes all pointing left in all 4 cells. Row 3: walking to the right, with head, chest and toes all pointing right in all 4 cells. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle that moves only the legs and arms a little; the same stride and the same pose in the rest of the body. The same character in every cell, carrying the same things in the same hand: nothing changes side, nothing is added or doubled from one cell to the next. Draw no grid lines and no borders between the cells, no ground, no cast shadows, no text.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

The character, exactly as in the reference: A young squire of a minor noble family, in service at a toll castle. A padded gambeson under a wine-red tabard bearing a golden mill wheel, a round shield painted the same, a short sword. On the left sleeve, a band of royal blue with a small white three-peaked mountain, the mark of the upper duchy he serves. Disciplined, clean, well fed. Accent color: wine red and gold.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## ykurua

### Ficha de design da criatura → salve como `ykurua.design.png`

```
A professional creature design sheet for a dark adult fantasy RPG, painted concept art with visible oil-like brushwork and a restrained earthy palette. The same creature shown whole four times at the same scale: front view, side view facing right, back view and top-down view, plus a close-up study of its head and hide texture. Plain flat light grey background, no text, no labels, a small human silhouette beside the side view for scale.

The Ykuruã: a colossal river amphibian the size of a cargo barge, low, wide and heavy. Thick grey-brown hide like the bark of an old tree, furrowed and plated, crusted with river mud, weed and clusters of dark river shells. A huge wide flat head, a mouth like a catfish crossed with a caiman, with short barbels; tiny, almost blind, milky eyes. Short powerful legs. An animal, not a monster of myth: no glow, no markings, no symbols, no spikes.

Aspect ratio 16:9, at the highest resolution you can.
```

### Folha de sprite 4x4 → salve como `ykurua.sheet.png`

```
Use the creature design sheet above (or attached) as the reference for every direction.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one whole creature per cell, its belly at the bottom of each cell. Row 1: crawling toward the viewer. Row 2: crawling to the left. Row 3: crawling to the right. Row 4: crawling away from the viewer. Each row is a 4-frame crawl cycle. The same creature in every cell. No grid lines, no ground, no water, no text.

The Ykuruã: a colossal river amphibian the size of a cargo barge, low, wide and heavy. Thick grey-brown hide like the bark of an old tree, furrowed and plated, crusted with river mud, weed and clusters of dark river shells. A huge wide flat head, a mouth like a catfish crossed with a caiman, with short barbels; tiny, almost blind, milky eyes. Short powerful legs. An animal, not a monster of myth: no glow, no markings, no symbols, no spikes.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```

### Folha de sprite 4x4, fora d'água → salve como `ykurua.seco.png`

```
Use the creature design sheet above (or attached) as the reference for every direction.

A detailed pixel art sprite sheet for a top-down three-quarter view tactical RPG, in the quality of the best modern pixel art games: hand-placed pixels, selective dark outlines, 2 to 3 shades per material, a limited earthy palette of about 24 colors. A grid of exactly 4 rows and 4 columns of evenly spaced cells, one whole creature per cell, its belly at the bottom of each cell. Row 1: crawling toward the viewer. Row 2: crawling to the left. Row 3: crawling to the right. Row 4: crawling away from the viewer. Each row is a 4-frame crawl cycle. The same creature in every cell. No grid lines, no ground, no water, no text.

The Ykuruã: a colossal river amphibian the size of a cargo barge, low, wide and heavy. Thick grey-brown hide like the bark of an old tree, furrowed and plated, crusted with river mud, weed and clusters of dark river shells. A huge wide flat head, a mouth like a catfish crossed with a caiman, with short barbels; tiny, almost blind, milky eyes. Short powerful legs. An animal, not a monster of myth: no glow, no markings, no symbols, no spikes.

The same creature stranded on dry land: the mud on its hide dried pale grey and cracked open in deep fissures, shells flaking off, its body heavy and sagging.

BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a transparent background.

Aspect ratio 1:1, at the highest resolution you can.
```


## titulo

### Ilustração → salve como `titulo.splash.png`

```
Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Two young sword-carrying escorts, a young student with a satchel and a staff, and an old boatman with a long pole stand on a flat river barge at dusk. The barge is stopped before a heavy iron chain stretched across a wide grey river, between the banks, under a squat stone toll castle. Rain-heavy sky, warm lantern light on the barge, mist on the water. Leave the top third calm and dark for the title.

Aspect ratio 16:9, at the highest resolution you can.
```


## baixios

### Ilustração → salve como `baixios.splash.png`

```
Key art for a dark adult low-fantasy tactical RPG, painted as a large expressionist oil painting: thick impasto, visible strokes, a restrained palette of river mud, rust, bone and slate lit by one warm light against cold grey. A cinematic, specific moment, not a pose: weather, mud and water in the air, figures small against the landscape when the place matters. The painting fills the whole frame from edge to edge, in sharp focus, with no blur and no blank or grey band. Not glossy, not airbrushed.

A dark, adult low-fantasy river country of many rivers, wet forests and hills, a patchwork of rival duchies, toll castles and free trade cities, before firearms. Everything is used and repaired: wool, linen, oiled leather, rope, tar, rust, river mud. People are real, specific people with slightly asymmetric faces; nobody is glamorous. Each person looks exactly the age stated in their description, no older. Heraldry is the one loud thing in this muddy world: tabards, shields and banners are painted in vivid, flat medieval colors, each noble house with its own. No modern items, no text, no logos, no watermarks, no frames.

Grey river shallows under low fog: ankle-deep water over mud flats, reeds, a half-sunk grain barge, and the long bark-like back of a colossal river amphibian breaking the surface, covered in shells. Small human figures on the bank for scale. Dread, stillness.

Aspect ratio 16:9, at the highest resolution you can.
```


## mundo

### Mapa do mundo → salve como `mundo.map.png`

```
A hand-drawn fantasy world map on aged parchment, ink line art with soft watercolor washes, compass rose, no sea monsters or creatures other than the ones written below, place names lettered in a clean old serif hand, exactly as written below. Legend box in a corner: a star = important place; a skull = dungeon; crossed swords = old battlefield.

WORLD SHAPE: the whole landmass is an UPSIDE-DOWN HEART. The sharp point is at the TOP (north) and is a frozen ice bridge. The two rounded lobes are at the bottom (south). A long deep ocean channel splits the two lobes from the south coast all the way up to the ice bridge. Open sea surrounds everything.

North point: "Ponta de Gelo", a narrow bridge of ice and snow joining both lobes. Tiny camps of ice guides.
Central channel: "Mar da Fenda", a dark, deep sea between the lobes, with pirate ships, shipwrecks and glinting sunken relics.

WEST LOBE: "Yrandupe" (humans and elves)
Northwest: "Zvenoles", dense ancient elven forest and horse meadows. Star "Svyrlogor" (elven seat, deep in the forest). Star "Zorinitsa" (elven star observatory school). Star "Zlatena" (a giant golden tree).
North: "Mboraguá", farmlands and logged forest edges biting into Zvenoles, with stumps along the border. Star "Akaraupe" (capital, big cathedral). Star "Tajyguá" (lumber port on the channel coast). "Kyrape" (small farming village). "Kururupe" (last village, at the snow line). Star "Muro Velho" (an ancient ruined wall in the far north, just below the ice, at the end of a snowy road).
East coast, facing the channel: "Tanguratyba", a coastal kingdom. Star "Ygarupe" (naval shipyards, north coast). Star "Itamoguá" (big port city, central coast), with star "Jekuatyba" (school of magic) inside it. Star "Jaguatyba" (royal capital, south of Itamoguá). Star "Ysyrype" (customs city at the river mouth, southern coast). "Embyrepe" (old battlefield turned forest park, inland near the western border, crossed swords).
Southwest and center interior: "Xerumbetyba", a land of many rivers, hills and forests. The great river "Ymonhã" starts in the western mountains and flows east to the sea at Ysyrype. Star "Ymboripe" (capital, in the western mountains at the river source). Star "Kuatiarape" (university city of libraries, mid-river). Star "Ybytuguá" (old river trade city, downstream, with shallows below it).

EAST LOBE: "Hravgarn" (demons and dragons)
West coast, facing the channel: "Throsvek", a demon kingdom. Star "Brimheld" (port city, under falling ash).
Behind the coast, a long north-south chain of active volcanoes: "Cinzeira". Thick ash clouds blow WEST over Throsvek; the east slopes are clear. One tallest peak, with wild dragons circling it. Star "Throsvek" (capital with huge glowing forges, at the western foot of the volcanoes). Small ruined forge-dungeons inside the mountains (skulls).
East of the volcanoes: "Zakhamur", vast open plains of the dragon people, cut by straight roads, canals and mines climbing the clear east slopes. Star "Garshaaki" (dragon capital, center of the plains). Scattered ruined nests and vaults (skulls).
South, between the end of the volcanoes and the plains: "Ilgaadur" (the Areal), a vast desert full of ruins, forts, tombs and dungeon icons (skulls). A single impossible river, "Idnuur" (the Teimoso), springs from the sand in the middle of the desert and runs southwest to the mouth of the channel, with green banks. Star "Vau-de-Osso" (adventurer town at the river ford).

Aspect ratio 4:3, at the highest resolution you can.
```
