"""
Pinta o cenário das quatro áreas em 48 pixels por quadrado, a partir dos próprios mapas.

Os `.tmj` continuam mandando na regra (o que barra, o que é água, onde cada um fica); este script só lê o que tem em
cada quadrado e desenha por cima. Mudou o mapa no Tiled, rode de novo. Só precisa do Pillow, e o resultado é sempre o
mesmo (a semente é fixa). A regra do que sai daqui está em `docs/arte.md`.

    python art/pintar_cenario.py            # pinta tudo
    python art/pintar_cenario.py ymonha     # só uma área
    python art/pintar_cenario.py --previa <pasta>   # também monta uma prévia de cada área

Sai em `client/public/scenes/`:
    <area>.ground.png   o chão inteiro, com a água furada (a água animada corre por baixo)
    <area>.atlas.png    as peças de pé daquela área
    <area>.json         os quadros do atlas e onde cada peça fica
    agua.png, agua-brilho.png, bruma.png, props.png + props.json   o que todas usam
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MAPS = ROOT / "client" / "public" / "maps"
OUT = ROOT / "client" / "public" / "scenes"

T = 48  # pixels de arte por quadrado
LOGIC_T = 16  # o quadrado do mapa, em pixels de mundo

# Os gids do chão, como estão nos mapas.
GRASS, FLOWERS, DIRT, PAVE, TALL, DEEP, SAND, WOOD = 1, 2, 3, 4, 5, 6, 7, 8
HIGH, FACE = 17, 18
# Na camada `relief`: a altura 2 e a face dela. A altura 1 e a face dela são HIGH e FACE.
HIGH2, FACE2 = 19, 20
SHALLOW, MUD, CHAIN = 21, 22, 23
# Os gids de pé.
TREE, ROCK, WALL, POST, COLUMN = 9, 10, 11, 12, 13


Color = tuple[int, int, int]


# ---------------------------------------------------------------- ruído e máscaras


def noise(w: int, h: int, scale: float, rng: random.Random, octaves: int = 3) -> Image.Image:
    """Ruído fractal em cinza, do tamanho pedido. `scale` é o tamanho do maior borrão, em pixels."""
    out: Image.Image | None = None
    weight = 1.0
    total = 0.0
    for _ in range(octaves):
        sw, sh = max(2, int(w / scale) + 2), max(2, int(h / scale) + 2)
        layer = Image.frombytes("L", (sw, sh), rng.randbytes(sw * sh)).resize((w, h), Image.BICUBIC)
        total += weight
        out = layer if out is None else Image.blend(out, layer, weight / total)
        scale = max(1.0, scale / 2.2)
        weight *= 0.6
    assert out is not None
    # O borrão de bytes ao acaso se junta no meio: estica de volta pro cinza inteiro.
    return out.point(lambda v: max(0, min(255, int((v - 128) * 2.6 + 128))))


def ramp(gray: Image.Image, stops: list[Color]) -> Image.Image:
    """Troca o cinza por faixas de cor, sem degradê: é isso que dá cara de pixel art ao ruído."""
    n = len(stops)
    lut: list[int] = []
    for channel in range(3):
        lut += [stops[min(n - 1, v * n // 256)][channel] for v in range(256)]
    return gray.convert("RGB").point(lut)


def threshold(mask: Image.Image, low: int, high: int | None = None) -> Image.Image:
    high = 255 if high is None else high
    return mask.point(lambda v: 255 if low <= v <= high else 0)


def shade(img: Image.Image, mask: Image.Image, color: Color, alpha: float) -> None:
    """Pinta `color` por cima de `img` onde a máscara manda, com a opacidade dada."""
    tint = Image.new("RGBA", img.size, color + (255,))
    tint.putalpha(mask.point(lambda v: int(v * alpha)))
    img.alpha_composite(tint)


def mix(a: Color, b: Color, t: float) -> Color:
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))  # type: ignore[return-value]


def lit(c: Color, f: float) -> Color:
    """Clareia (f > 0) puxando pro ocre, ou escurece (f < 0) puxando pro azul: a luz vem de um céu nublado."""
    if f >= 0:
        return mix(c, (235, 225, 190), f)
    return mix(c, (18, 20, 34), -f)


# ---------------------------------------------------------------- o mapa


class Area:
    def __init__(self, area_id: str):
        self.id = area_id
        self.data = json.loads((MAPS / f"{area_id}.tmj").read_text(encoding="utf8"))
        self.w: int = self.data["width"]
        self.h: int = self.data["height"]
        self.ground = self._layer("ground")
        self.sorted = self._layer("sorted")
        has_relief = any(l["name"] == "relief" for l in self.data["layers"])
        self.relief = self._layer("relief") if has_relief else [[0] * self.w for _ in range(self.h)]
        # A altura de cada quadrado, em degraus, como o motor a lê (a maior das camadas).
        level = {HIGH: 1, HIGH2: 2}
        self.elevation = [[max(level.get(self.ground[y][x], 0), level.get(self.relief[y][x], 0)) for x in range(self.w)] for y in range(self.h)]
        self.objects = next(l for l in self.data["layers"] if l["type"] == "objectgroup")["objects"]

    def _layer(self, name: str) -> list[list[int]]:
        raw = next(l for l in self.data["layers"] if l["name"] == name)["data"]
        return [[raw[y * self.w + x] & 0x1FFFFFFF for x in range(self.w)] for y in range(self.h)]

    def tile_mask(self, gids: set[int], layer: list[list[int]] | None = None) -> Image.Image:
        """Uma máscara do tamanho do chão pintado, com os quadrados pedidos em branco e bordas duras."""
        layer = layer or self.ground
        small = Image.new("L", (self.w, self.h), 0)
        px = small.load()
        for y in range(self.h):
            for x in range(self.w):
                if layer[y][x] in gids:
                    px[x, y] = 255
        return small.resize((self.w * T, self.h * T), Image.NEAREST)

    def where(self, test) -> Image.Image:
        """A máscara dos quadrados em que `test(x, y)` vale, com bordas duras."""
        small = Image.new("L", (self.w, self.h), 0)
        px = small.load()
        for y in range(self.h):
            for x in range(self.w):
                if test(x, y):
                    px[x, y] = 255
        return small.resize((self.w * T, self.h * T), Image.NEAREST)

    def organic(self, gids: set[int], rng: random.Random, soft: int = 12, rough: float = 0.28) -> Image.Image:
        """A mesma máscara, com a borda torta: nada do cenário acaba em linha reta de quadrado."""
        base = self.tile_mask(gids).filter(ImageFilter.GaussianBlur(soft))
        n = noise(base.width, base.height, 42, rng, 3)
        # Soma o ruído só onde a borda está indecisa.
        mixed = ImageChops.add(base.point(lambda v: int(v * (1 - rough))), n.point(lambda v: int(v * rough)))
        return threshold(mixed, 128)


# ---------------------------------------------------------------- pequenos desenhos


def outline(img: Image.Image, color: Color = (24, 20, 22), alpha: int = 255) -> Image.Image:
    """Um contorno de um pixel em volta do que já está desenhado, como nos bonecos."""
    a = img.getchannel("A").point(lambda v: 255 if v > 90 else 0)
    grown = a.filter(ImageFilter.MaxFilter(3))
    edge = Image.new("RGBA", img.size, color + (0,))
    edge.putalpha(ImageChops.subtract(grown, a).point(lambda v: min(v, alpha)))
    edge.alpha_composite(img)
    return edge


def blob(draw: ImageDraw.ImageDraw, x: float, y: float, r: float, color: Color, rng: random.Random) -> None:
    """Um tufo: um disco de borda roída."""
    points = []
    steps = 9
    for i in range(steps):
        a = i / steps * math.tau
        rr = r * rng.uniform(0.72, 1.12)
        points.append((x + math.cos(a) * rr, y + math.sin(a) * rr * 0.86))
    draw.polygon(points, fill=color + (255,))


def tree_broad(rng: random.Random, palette: list[Color], w: int, h: int, trunk: Color) -> Image.Image:
    """Carvalho ou faia: copa de tufos, clara em cima à esquerda e funda embaixo à direita."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, base = w / 2, h - 5
    crown_cy = h * 0.40
    rx, ry = w * 0.46, h * 0.36
    trunk_w = w * 0.052
    # O tronco, com a raiz abrindo e a casca riscada.
    d.polygon(
        [(cx - trunk_w * 1.7, base), (cx - trunk_w, base - h * 0.14), (cx - trunk_w * 0.8, crown_cy + 6),
         (cx + trunk_w * 0.8, crown_cy + 6), (cx + trunk_w, base - h * 0.14), (cx + trunk_w * 1.8, base)],
        fill=trunk + (255,),
    )
    for _ in range(26):
        x = cx + rng.uniform(-trunk_w * 0.9, trunk_w * 0.9)
        y = rng.uniform(crown_cy + 6, base - 1)
        d.line([(x, y), (x + rng.uniform(-1, 1), y + rng.uniform(2, 7))], fill=lit(trunk, rng.uniform(-0.45, 0.2)) + (255,))
    d.line([(cx - trunk_w, base - 2), (cx - trunk_w * 0.7, crown_cy + 8)], fill=lit(trunk, 0.22) + (255,))
    d.line([(cx + trunk_w, base - 2), (cx + trunk_w * 0.7, crown_cy + 8)], fill=lit(trunk, -0.5) + (255,))

    # Os tufos, de trás pra frente: primeiro os escuros de baixo, por último a luz de cima.
    lobes = [(rng.uniform(-rx * 0.62, rx * 0.62), rng.uniform(-ry * 0.6, ry * 0.6), rng.uniform(0.42, 0.56)) for _ in range(12)]
    lobes.append((0.0, 0.0, 0.8))
    clumps: list[tuple[float, float, float, float]] = []
    for lx, ly, lr in lobes:
        for _ in range(34):
            a = rng.uniform(0, math.tau)
            s = math.sqrt(rng.random())
            x = lx + math.cos(a) * s * rx * lr
            y = ly + math.sin(a) * s * ry * lr
            # A luz: o quanto o tufo olha pra cima e pra esquerda, somado ao acaso.
            light = (-x / rx * 0.42 - y / ry * 0.82) * 0.5 + 0.5 + rng.uniform(-0.17, 0.17)
            clumps.append((x, y, light, rng.uniform(w * 0.032, w * 0.062)))
    clumps.sort(key=lambda c: c[2])
    for x, y, light, r in clumps:
        color = palette[max(0, min(len(palette) - 1, int(light * len(palette))))]
        blob(d, cx + x, crown_cy + y, r, color, rng)
    # Folhas soltas, um pixel, pra quebrar as manchas.
    for x, y, light, _ in clumps[len(clumps) // 3 :]:
        if rng.random() < 0.65:
            color = lit(palette[max(0, min(len(palette) - 1, int(light * len(palette))))], rng.uniform(-0.2, 0.2))
            d.point((cx + x + rng.uniform(-5, 5), crown_cy + y + rng.uniform(-5, 5)), fill=color + (255,))
    return outline(img)


def tree_spruce(rng: random.Random, palette: list[Color], w: int, h: int, trunk: Color) -> Image.Image:
    """Abeto de serra: andares de galho caído, do largo embaixo ao fino em cima."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, base = w / 2, h - 4
    d.rectangle([cx - 3, base - 16, cx + 3, base], fill=trunk + (255,))
    d.line([(cx - 3, base - 16), (cx - 3, base)], fill=lit(trunk, 0.2) + (255,))
    tiers = 8
    top = 3
    bottom = base - 11
    for i in range(tiers):
        t = i / (tiers - 1)
        y = bottom - (bottom - top) * t * 0.88
        half = (w * 0.47) * (1 - t) ** 0.85 + 4
        height = (bottom - top) / tiers * 1.9
        for side in (-1, 1):
            for b in range(int(half) * 2):
                f = rng.random()
                bx = side * f * half
                by = y - height * (1 - f) + rng.uniform(0, height * 0.9) * (0.35 + f * 0.65) + f * 8
                light = 0.62 - side * 0.28 + (t * 0.22) - ((by - (y - height)) / height) * 0.5 + rng.uniform(-0.14, 0.14)
                color = palette[max(0, min(len(palette) - 1, int(light * len(palette))))]
                d.line([(cx + bx, by), (cx + bx + side * rng.uniform(1, 4), by + rng.uniform(1, 4))], fill=color + (255,), width=2)
    return outline(img)


def tree_willow(rng: random.Random, palette: list[Color], w: int, h: int, trunk: Color) -> Image.Image:
    """Salgueiro de beira de rio: o tronco torto e os ramos caindo até quase o chão."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, base = w / 2, h - 5
    lean = rng.choice((-1, 1)) * 5
    d.polygon(
        [(cx - 7, base), (cx - 4 + lean, h * 0.5), (cx + 4 + lean, h * 0.5), (cx + 8, base)],
        fill=trunk + (255,),
    )
    d.line([(cx - 6, base - 1), (cx - 3 + lean, h * 0.5)], fill=lit(trunk, 0.22) + (255,))
    crown = h * 0.28
    strands = []
    for _ in range(int(w * 1.5)):
        a = rng.uniform(-1, 1)
        x0 = cx + lean + a * w * 0.42
        y0 = crown + rng.uniform(-h * 0.2, h * 0.14) * (1 - abs(a) * 0.5)
        length = rng.uniform(h * 0.26, h * 0.56) * (1.0 - abs(a) * 0.2)
        strands.append((y0, x0, length, a))
    strands.sort()
    for y0, x0, length, a in strands:
        light = 0.72 - a * 0.25 - (y0 / h) * 0.55 + rng.uniform(-0.2, 0.2)
        color = palette[max(0, min(len(palette) - 1, int(light * len(palette))))]
        sway = rng.uniform(-3, 3)
        d.line([(x0, y0), (x0 + sway, y0 + length)], fill=color + (255,), width=rng.choice((1, 2, 2)))
    return outline(img)


def rock(rng: random.Random, w: int, h: int, base: Color = (112, 110, 104)) -> Image.Image:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    points = []
    steps = 9
    for i in range(steps):
        a = i / steps * math.tau
        points.append((w / 2 + math.cos(a) * w * 0.44 * rng.uniform(0.78, 1), h * 0.56 + math.sin(a) * h * 0.4 * rng.uniform(0.8, 1)))
    d.polygon(points, fill=base + (255,))
    for _ in range(int(w * h / 7)):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        light = (-(x - w / 2) / w - (y - h / 2) / h) * 0.9
        d.point((x, y), fill=lit(base, max(-0.6, min(0.5, light + rng.uniform(-0.18, 0.18)))) + (255,))
    # O corte da pedra e o musgo.
    d.line([(w * 0.3, h * 0.3), (w * 0.5, h * 0.6), (w * 0.44, h * 0.85)], fill=lit(base, -0.55) + (255,))
    for _ in range(int(w * 0.7)):
        x, y = rng.uniform(w * 0.1, w * 0.9), rng.uniform(h * 0.55, h * 0.98)
        d.point((x, y), fill=(82, 96, 52, 255))
    keep = Image.new("L", (w, h), 0)
    ImageDraw.Draw(keep).polygon(points, fill=255)
    img.putalpha(keep)
    return outline(img)


def planks(w: int, h: int, rng: random.Random, base: Color, vertical: bool = False, board: int = 8) -> Image.Image:
    """Tábuas de madeira velha, com veio, junta e prego."""
    img = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(img)
    span, across = (w, h) if not vertical else (h, w)
    for i in range(0, across, board):
        tone = lit(base, rng.uniform(-0.22, 0.14))
        for j in range(board):
            line = [(0, i + j), (span, i + j)] if not vertical else [(i + j, 0), (i + j, span)]
            d.line(line, fill=tone)
        for _ in range(span // 9):
            a = rng.randint(0, span)
            b = a + rng.randint(4, 22)
            o = i + rng.randint(1, board - 1)
            line = [(a, o), (b, o)] if not vertical else [(o, a), (o, b)]
            d.line(line, fill=lit(tone, rng.uniform(-0.22, 0.12)))
        line = [(0, i), (span, i)] if not vertical else [(i, 0), (i, span)]
        d.line(line, fill=lit(base, -0.58))
        for k in range(rng.randint(0, 40), span, rng.randint(56, 96)):
            at = (k, i + board // 2) if not vertical else (i + board // 2, k)
            d.point(at, fill=lit(base, -0.7))
    return img


def cobbles(w: int, h: int, rng: random.Random, base: Color, size: int = 9) -> Image.Image:
    """Calçamento de pedra de rio: seixos irregulares em argamassa escura."""
    img = Image.new("RGB", (w, h), lit(base, -0.55))
    d = ImageDraw.Draw(img)
    for row in range(-1, h // size + 2):
        offset = rng.randint(0, size)
        x = -offset
        while x < w + size:
            sw = rng.randint(size - 2, size + 5)
            tone = lit(base, rng.uniform(-0.15, 0.12))
            top = row * size + rng.randint(-1, 1)
            d.rounded_rectangle([x + 1, top + 1, x + sw - 1, top + size - 1], radius=2, fill=tone)
            d.line([(x + 2, top + 1), (x + sw - 2, top + 1)], fill=lit(tone, 0.2))
            d.line([(x + 2, top + size - 1), (x + sw - 2, top + size - 1)], fill=lit(tone, -0.3))
            x += sw
    return img


def masonry(w: int, h: int, rng: random.Random, base: Color, course: int = 11) -> Image.Image:
    """Pedra aparelhada grossa, em fiadas, com a junta funda e o musgo descendo de baixo."""
    img = Image.new("RGB", (w, h), lit(base, -0.6))
    d = ImageDraw.Draw(img)
    for row, y in enumerate(range(0, h, course)):
        x = -rng.randint(0, 16) - (row % 2) * 8
        while x < w:
            sw = rng.randint(14, 30)
            tone = lit(base, rng.uniform(-0.25, 0.14))
            d.rectangle([x + 1, y + 1, x + sw - 1, y + course - 1], fill=tone)
            d.line([(x + 1, y + 1), (x + sw - 1, y + 1)], fill=lit(tone, 0.22))
            d.line([(x + sw - 1, y + 1), (x + sw - 1, y + course - 1)], fill=lit(tone, -0.3))
            for _ in range(sw // 3):
                d.point((rng.randint(x + 1, x + sw - 1), rng.randint(y + 1, y + course - 1)), fill=lit(tone, rng.uniform(-0.2, 0.1)))
            x += sw
    return img


# ---------------------------------------------------------------- a casa de enxaimel


PLASTERS: list[Color] = [(196, 183, 152), (178, 162, 128), (188, 158, 118), (164, 154, 134), (180, 142, 110)]
TIMBERS: list[Color] = [(52, 36, 28), (64, 44, 30), (46, 34, 32)]
ROOFS: list[Color] = [(122, 66, 48), (98, 60, 50), (82, 80, 88), (68, 68, 78), (112, 76, 56)]


def roof_tiles(w: int, h: int, rng: random.Random, base: Color, moss: bool = True) -> Image.Image:
    """Fiadas de telha em escama, um pouco tortas, com musgo onde a água demora."""
    img = Image.new("RGB", (w, h), lit(base, -0.5))
    d = ImageDraw.Draw(img)
    row_h, tile_w = 6, 7
    for row, y in enumerate(range(0, h, row_h)):
        x = -(row % 2) * tile_w // 2 - rng.randint(0, 1)
        while x < w:
            tone = lit(base, rng.uniform(-0.18, 0.15))
            d.rectangle([x, y, x + tile_w - 2, y + row_h - 2], fill=tone)
            d.line([(x, y + row_h - 2), (x + tile_w - 2, y + row_h - 2)], fill=lit(tone, -0.42))
            d.line([(x, y), (x + tile_w - 3, y)], fill=lit(tone, 0.12))
            x += tile_w
    if moss:
        n = noise(w, h, 30, rng, 2)
        mask = threshold(n, 226).filter(ImageFilter.GaussianBlur(0.6))
        grain = Image.frombytes("L", (w, h), rng.randbytes(w * h)).point(lambda v: 255 if v > 150 else 0)
        mask = ImageChops.multiply(mask, grain)
        rgba = img.convert("RGBA")
        shade(rgba, mask, (86, 92, 52), 0.5)
        img = rgba.convert("RGB")
    return img


def window(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, timber: Color, rng: random.Random, shutters: bool = True, glow: bool = False) -> None:
    """Janela pequena de vidro em losango, com a moldura e, às vezes, os postigos abertos."""
    glass = (214, 170, 96) if glow else (44, 52, 62)
    d.rectangle([x - 1, y - 1, x + w, y + h], fill=lit(timber, -0.2))
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=glass)
    for i in range(x, x + w, 3):
        d.line([(i, y), (i, y + h - 1)], fill=lit(glass, -0.35))
    for j in range(y, y + h, 3):
        d.line([(x, j), (x + w - 1, j)], fill=lit(glass, -0.35))
    d.line([(x, y), (x + w - 1, y)], fill=lit(glass, 0.3))
    d.rectangle([x - 2, y + h, x + w + 1, y + h + 1], fill=timber)
    if shutters and rng.random() < 0.75:
        color = rng.choice([(86, 74, 56), (72, 62, 52), (92, 66, 48), (66, 72, 66)])
        d.rectangle([x - 5, y - 1, x - 2, y + h], fill=color)
        d.rectangle([x + w + 1, y - 1, x + w + 4, y + h], fill=lit(color, -0.15))


def half_timbered(w: int, h: int, rng: random.Random, plaster: Color, timber: Color, door: int | None = None, plinth: int = 12, glow: bool = False, sign: Color | None = None) -> Image.Image:
    """Uma fachada: reboco manchado, a grade de vigas com as escoras em K, o embasamento de pedra, janelas e porta."""
    img = Image.new("RGB", (w, h), plaster)
    # O reboco, com a mancha de chuva que desce das vigas.
    tone = noise(w, h, 18, rng, 2)
    stains = ramp(tone, [lit(plaster, -0.14), lit(plaster, -0.06), plaster, plaster, lit(plaster, 0.06)])
    img.paste(stains)
    d = ImageDraw.Draw(img)
    wall_h = h - plinth
    floors = max(1, round(wall_h / 46))
    floor_h = wall_h // floors
    bay = rng.randint(26, 32)
    bays = max(1, round(w / bay))
    bay = w / bays
    beam = 3
    for f in range(floors):
        top = f * floor_h
        low = top + floor_h
        # As escoras primeiro, as vigas por cima.
        for b in range(bays):
            x0, x1 = int(b * bay), int((b + 1) * bay)
            kind = rng.random() if not (door is not None and x0 <= door < x1 and f == floors - 1) else 1.0
            if kind < 0.3:
                d.line([(x0, low), (x1, top)], fill=timber, width=beam)
                d.line([(x0, top), (x1, low)], fill=timber, width=beam)
            elif kind < 0.55:
                mid = (top + low) // 2
                d.line([(x0, mid), (x0 + (x1 - x0) // 2, top)], fill=timber, width=beam - 1)
                d.line([(x0, mid), (x0 + (x1 - x0) // 2, low)], fill=timber, width=beam - 1)
            elif kind < 0.78:
                mid = (top + low) // 2
                d.line([(x1, mid), (x1 - (x1 - x0) // 2, top)], fill=timber, width=beam - 1)
                d.line([(x1, mid), (x1 - (x1 - x0) // 2, low)], fill=timber, width=beam - 1)
            elif x1 - x0 >= 18 and not (door is not None and x0 <= door < x1):
                window(d, (x0 + x1) // 2 - 5, top + floor_h // 2 - 7, 11, 13, timber, rng, x1 - x0 >= 26, glow)
        for b in range(bays + 1):
            x = int(b * bay)
            d.rectangle([x - beam // 2 - 1, top, x + beam // 2, low], fill=timber)
            d.line([(x - beam // 2 - 1, top), (x - beam // 2 - 1, low)], fill=lit(timber, 0.2))
        d.rectangle([0, top, w, top + beam], fill=timber)
        d.line([(0, top), (w, top)], fill=lit(timber, 0.2))
        d.rectangle([0, low - beam, w, low], fill=timber)
        # O andar de cima avança sobre o de baixo: a sombra do balanço.
        if f < floors - 1:
            for y in range(low + 1, low + 5):
                d.line([(0, y), (w, y)], fill=None)
    # A sombra debaixo do beiral.
    overlay = img.convert("RGBA")
    grad = Image.new("L", (1, 9))
    for i in range(9):
        grad.putpixel((0, i), int(150 * (1 - i / 9)))
    overlay.paste((10, 10, 18, 255), (0, 0, w, 9), grad.resize((w, 9)))
    img = overlay.convert("RGB")
    # O embasamento de pedra.
    if plinth:
        img.paste(masonry(w, plinth, rng, (112, 106, 96), 6), (0, h - plinth))
    d = ImageDraw.Draw(img)
    if door is not None:
        dw, dh = 22, 34
        left = door - dw // 2
        top = h - dh
        img.paste(planks(dw, dh, rng, (70, 48, 32), True, 6), (left, top))
        d = ImageDraw.Draw(img)
        d.rectangle([left - 3, top - 3, left - 1, h], fill=timber)
        d.rectangle([left + dw, top - 3, left + dw + 2, h], fill=timber)
        d.rectangle([left - 3, top - 4, left + dw + 2, top - 1], fill=timber)
        d.rectangle([left + 15, top + 16, left + 17, top + 18], fill=(140, 124, 90))
        if sign:
            # A tabuleta do ofício pendurada do lado da porta (sem letra nem brasão: quem conta é o texto).
            sx = left + dw + 8
            d.rectangle([sx, top + 2, sx + 11, top + 3], fill=(30, 26, 26))
            d.line([(sx + 2, top + 3), (sx + 2, top + 6)], fill=(30, 26, 26))
            d.line([(sx + 9, top + 3), (sx + 9, top + 6)], fill=(30, 26, 26))
            d.rectangle([sx, top + 6, sx + 11, top + 15], fill=sign, outline=(30, 26, 26))
    return img


def house_eaves(tiles_w: float, tiles_d: float, rng: random.Random, plaster: Color | None = None, roof: Color | None = None, door: int | None = None, wall_h: int = 96, glow: bool = False, sign: Color | None = None, chimney: bool = True, stone: bool = False) -> Image.Image:
    """Casa com a calha pra frente: fachada comprida embaixo, o telhado íngreme subindo atrás."""
    w = int(tiles_w * T)
    h = int(tiles_d * T) + T  # a cumeeira passa um quadrado do fundo
    plaster = plaster or rng.choice(PLASTERS)
    timber = rng.choice(TIMBERS)
    roof = roof or rng.choice(ROOFS)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    roof_h = h - wall_h + 8
    tiles = roof_tiles(w, roof_h, rng, roof)
    # A água do telhado: mais clara na cumeeira, mais funda no beiral.
    rgba = tiles.convert("RGBA")
    grad = Image.new("L", (1, roof_h))
    for y in range(roof_h):
        grad.putpixel((0, y), int(70 * (y / roof_h) ** 1.5))
    shade(rgba, grad.resize((w, roof_h)), (20, 16, 26), 1.0)
    img.paste(rgba, (0, 0))
    d = ImageDraw.Draw(img)
    # A cumeeira corre a um terço da altura; atrás dela, a água de lá, que foge e fica no escuro.
    ridge = int(roof_h * 0.3)
    img.alpha_composite(Image.new("RGBA", (w, ridge), (10, 10, 22, 120)))
    d.rectangle([0, ridge - 2, w, ridge + 1], fill=lit(roof, -0.45))
    d.line([(0, ridge + 2), (w, ridge + 2)], fill=lit(roof, 0.25))
    # As pontas em quatro águas: um triângulo de cada lado, um claro, o outro no escuro.
    hip = min(int(roof_h * 0.62), w // 3)
    img.alpha_composite(_hip(w, roof_h, hip, ridge, True, roof))
    img.alpha_composite(_hip(w, roof_h, hip, ridge, False, roof))
    d = ImageDraw.Draw(img)
    face = half_timbered(w, wall_h, rng, plaster, timber, door=door, glow=glow, sign=sign, plinth=30 if stone else 12)
    img.paste(face, (0, h - wall_h))
    d = ImageDraw.Draw(img)
    # O beiral que projeta sombra na fachada.
    d.rectangle([0, h - wall_h - 3, w, h - wall_h], fill=lit(roof, -0.55))
    # Mansardas.
    if w >= 3 * T:
        for i in range(max(1, int(tiles_w // 3))):
            dx = int((i + 0.5) * w / max(1, int(tiles_w // 3))) + rng.randint(-8, 8)
            dy = rng.randint(int(roof_h * 0.32), int(roof_h * 0.5))
            dormer(img, dx, dy, roof, timber, rng, glow)
    if chimney:
        chimney_at(img, rng.randint(14, w - 24), rng.randint(4, 12))
    return outline(img)


def _hip(w: int, h: int, hip: int, ridge: int, left: bool, roof: Color) -> Image.Image:
    """A água de ponta do telhado: tira o quadrado do canto e deixa o telhado com volume."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if left:
        d.polygon([(0, 0), (hip, ridge), (0, h)], fill=lit(roof, 0.16) + (150,))
        d.line([(0, 0), (hip, ridge)], fill=lit(roof, -0.45) + (255,), width=2)
        d.line([(hip, ridge), (0, h)], fill=lit(roof, -0.45) + (255,), width=2)
    else:
        d.polygon([(w, 0), (w - hip, ridge), (w, h)], fill=lit(roof, -0.45) + (170,))
        d.line([(w, 0), (w - hip, ridge)], fill=lit(roof, -0.6) + (255,), width=2)
        d.line([(w - hip, ridge), (w, h)], fill=lit(roof, -0.6) + (255,), width=2)
    return layer


def dormer(img: Image.Image, cx: int, y: int, roof: Color, timber: Color, rng: random.Random, glow: bool) -> None:
    d = ImageDraw.Draw(img)
    w, h = 22, 22
    d.polygon([(cx - w // 2 - 2, y + 8), (cx, y - 3), (cx + w // 2 + 2, y + 8)], fill=lit(roof, -0.2))
    d.line([(cx - w // 2 - 2, y + 8), (cx, y - 3)], fill=lit(roof, 0.25))
    d.line([(cx, y - 3), (cx + w // 2 + 2, y + 8)], fill=lit(roof, -0.5))
    d.rectangle([cx - w // 2 + 2, y + 8, cx + w // 2 - 2, y + h - 2], fill=lit((180, 164, 134), -0.1))
    d.rectangle([cx - w // 2 + 2, y + 8, cx + w // 2 - 2, y + h - 2], outline=timber)
    window(d, cx - 4, y + 10, 8, 8, timber, rng, False, glow)
    d.rectangle([cx - w // 2 - 1, y + h - 2, cx + w // 2 + 1, y + h], fill=lit(roof, -0.5))


def chimney_at(img: Image.Image, x: int, y: int) -> None:
    d = ImageDraw.Draw(img)
    base = (118, 86, 72)
    d.rectangle([x, y, x + 11, y + 16], fill=base, outline=(34, 26, 26))
    for j in range(y + 3, y + 16, 3):
        d.line([(x + 1, j), (x + 10, j)], fill=lit(base, -0.3))
    d.rectangle([x - 1, y - 2, x + 12, y + 1], fill=lit(base, -0.25), outline=(34, 26, 26))
    d.line([(x + 2, y - 1), (x + 9, y - 1)], fill=(20, 18, 22))


def house_gable(tiles_w: float, tiles_d: float, rng: random.Random, plaster: Color | None = None, roof: Color | None = None, wall_h: int = 86) -> Image.Image:
    """Casa estreita de rua de cidade do rio: o oitão pra frente, alto, e o telhado fugindo pro fundo."""
    w = int(tiles_w * T)
    gable_h = int(w * 0.62)
    h = int(tiles_d * T) + T
    plaster = plaster or rng.choice(PLASTERS)
    timber = rng.choice(TIMBERS)
    roof = roof or rng.choice(ROOFS)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    apex_y = max(2, h - wall_h - gable_h)
    # As duas águas vistas de cima, do oitão até o fundo.
    left_roof = roof_tiles(w // 2, h, rng, lit(roof, 0.05))
    right_roof = roof_tiles(w - w // 2, h, rng, lit(roof, -0.28))
    img.paste(left_roof, (0, 0))
    img.paste(right_roof, (w // 2, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([w // 2 - 1, 0, w // 2 + 1, h], fill=lit(roof, -0.45))
    d.line([(0, 0), (0, h)], fill=lit(roof, -0.5))
    d.line([(w - 1, 0), (w - 1, h)], fill=lit(roof, -0.6))
    # A parede de frente com o oitão em triângulo.
    face_h = wall_h + gable_h
    face = half_timbered(w, face_h, rng, plaster, timber, plinth=12)
    mask = Image.new("L", (w, face_h), 0)
    ImageDraw.Draw(mask).polygon([(0, gable_h), (w // 2, 0), (w, gable_h), (w, face_h), (0, face_h)], fill=255)
    img.paste(face, (0, h - face_h), mask)
    d = ImageDraw.Draw(img)
    # A barra do telhado acompanhando o triângulo.
    top = h - face_h
    d.line([(0, top + gable_h), (w // 2, top)], fill=lit(roof, -0.5), width=3)
    d.line([(w // 2, top), (w, top + gable_h)], fill=lit(roof, -0.6), width=3)
    d.line([(0, top + gable_h - 2), (w // 2, top - 2)], fill=lit(roof, 0.2))
    window(d, w // 2 - 5, top + gable_h // 2 - 2, 10, 12, timber, rng, False)
    _ = apex_y
    return outline(img)


# ---------------------------------------------------------------- a água


def paint_water() -> None:
    """A água que corre por baixo do chão. Duas camadas que emendam, pra andarem em velocidades diferentes."""
    size = 384
    rng = random.Random(4100)

    def tile(img_size: int, cells: int, seed: random.Random, octaves: int = 3) -> Image.Image:
        # Ruído que emenda: a grade pequena se repete em volta de si mesma antes de ampliar, e corta-se o miolo.
        out: Image.Image | None = None
        total, weight = 0.0, 1.0
        for _ in range(octaves):
            small = Image.frombytes("L", (cells, cells), seed.randbytes(cells * cells))
            wrapped = Image.new("L", (cells * 3, cells * 3))
            for i in range(3):
                for j in range(3):
                    wrapped.paste(small, (i * cells, j * cells))
            big = wrapped.resize((img_size * 3, img_size * 3), Image.BICUBIC).crop((img_size, img_size, img_size * 2, img_size * 2))
            total += weight
            out = big if out is None else Image.blend(out, big, weight / total)
            cells *= 2
            weight *= 0.6
        assert out is not None
        return out.point(lambda v: max(0, min(255, int((v - 128) * 2.6 + 128))))

    base = tile(size, 6, rng)
    water = ramp(base, [(52, 68, 62), (54, 71, 64), (56, 74, 66), (58, 77, 68), (61, 80, 70), (64, 84, 73)])
    # O fio da correnteza: riscos compridos na horizontal, escuros.
    d = ImageDraw.Draw(water)
    for _ in range(190):
        x, y = rng.randint(0, size), rng.randint(0, size)
        length = rng.randint(12, 44)
        color = rng.choice([(40, 54, 54), (44, 58, 58), (76, 98, 86)])
        for i in range(length):
            yy = (y + int(math.sin(i * 0.2) * 1.4)) % size
            d.point(((x + i) % size, yy), fill=color)
    water.save(OUT / "agua.png")

    # O brilho: traços curtos do céu nublado, que a outra camada desliza por cima.
    glint = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glint)
    for _ in range(120):
        x, y = rng.randint(0, size), rng.randint(0, size)
        length = rng.randint(4, 18)
        color = rng.choice([(150, 170, 160, 150), (178, 192, 178, 120), (120, 146, 136, 150)])
        for i in range(length):
            d.point(((x + i) % size, y), fill=color)
            if rng.random() < 0.3:
                d.point(((x + i) % size, (y + 1) % size), fill=color[:3] + (70,))
    glint.save(OUT / "agua-brilho.png")

    # A bruma dos baixios: manchas moles, sem borda.
    mist_size = 512
    m = tile(mist_size, 4, rng).filter(ImageFilter.GaussianBlur(10))
    alpha = m.point(lambda v: max(0, min(255, int((v - 112) * 1.5))))
    mist = Image.new("RGBA", (mist_size, mist_size), (196, 204, 200, 255))
    mist.putalpha(alpha)
    mist.save(OUT / "bruma.png")


# ---------------------------------------------------------------- o chão


GRASS_TONES = {
    "rio": [(58, 70, 42), (64, 78, 44), (70, 84, 48), (78, 90, 50), (88, 98, 56)],
    "cidade": [(66, 72, 46), (72, 78, 48), (80, 84, 52), (90, 90, 58), (100, 98, 66)],
    "lodo": [(56, 62, 40), (62, 68, 42), (70, 72, 46), (78, 78, 50), (88, 84, 56)],
    "mata": [(38, 50, 34), (44, 56, 36), (50, 62, 38), (56, 68, 42), (64, 74, 46)],
}


def paint_grass(area: Area, rng: random.Random, kind: str) -> Image.Image:
    w, h = area.w * T, area.h * T
    tones = GRASS_TONES[kind]
    field = noise(w, h, 90, rng, 4)
    # A grama ganha mancha larga e grão fino, cada um por conta.
    grain = noise(w, h, 3, rng, 2)
    mixed = Image.blend(field, grain, 0.38)
    img = ramp(mixed, tones).convert("RGBA")
    d = ImageDraw.Draw(img)
    # Folhas de capim: riscos de dois ou três pixels, muitos.
    for _ in range(w * h // 70):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        tone = rng.choice(tones)
        tone = lit(tone, rng.uniform(-0.25, 0.22))
        d.line([(x, y), (x + rng.choice((-1, 0, 0, 1)), y - rng.randint(1, 3))], fill=tone + (255,))
    return img


def road_texture(w: int, h: int, rng: random.Random, kind: str) -> Image.Image:
    """Terra batida com sulco de carroça, pedrinha e poça de cheia."""
    stops = {
        "rio": [(84, 68, 50), (92, 74, 54), (102, 82, 58), (112, 92, 66), (122, 102, 74)],
        "mata": [(64, 52, 40), (72, 58, 44), (80, 64, 46), (90, 72, 52), (100, 82, 60)],
    }[kind]
    img = ramp(Image.blend(noise(w, h, 40, rng, 3), noise(w, h, 3, rng, 2), 0.45), stops).convert("RGBA")
    d = ImageDraw.Draw(img)
    for _ in range(w * h // 260):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        tone = lit(rng.choice(stops), rng.uniform(-0.3, 0.3))
        d.rectangle([x, y, x + rng.randint(0, 2), y + rng.randint(0, 1)], fill=tone + (255,))
    return img


def mud_texture(w: int, h: int, rng: random.Random, dry: bool) -> Image.Image:
    stops = (
        [(92, 80, 60), (102, 90, 66), (112, 98, 72), (124, 110, 82), (138, 124, 94)]
        if dry
        else [(50, 46, 36), (58, 52, 40), (66, 60, 44), (76, 68, 50), (86, 78, 58)]
    )
    img = ramp(Image.blend(noise(w, h, 30, rng, 3), noise(w, h, 3, rng, 2), 0.4), stops).convert("RGBA")
    d = ImageDraw.Draw(img)
    # Cascalho e concha.
    for _ in range(w * h // 700):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        tone = rng.choice([(166, 158, 136), (120, 112, 96), (70, 64, 52), (186, 178, 158)])
        d.rectangle([x, y, x + rng.randint(0, 2), y + rng.randint(0, 1)], fill=tone + (255,))
    return img


class Canvas:
    """O chão de uma área, de baixo pra cima, com as peças de pé anotadas à parte."""

    def __init__(self, area: Area, rng: random.Random, grass: str):
        self.area = area
        self.rng = rng
        self.grass = grass
        self.w, self.h = area.w * T, area.h * T
        self.img = paint_grass(area, rng, grass)
        self.water_alpha: Image.Image | None = None
        self.stand: list[dict] = []
        self.frames: dict[str, Image.Image] = {}

    # O que está de pé -----------------------------------------------------------------------------------------------

    def put(self, frame: str, image: Image.Image, cx: float, base_y: float, depth_y: float | None = None, **extra) -> dict:
        """Uma peça de pé: `cx` e `base_y` em pixels de arte, com o pé no meio da base."""
        self.frames.setdefault(frame, image)
        entry = {"frame": frame, "x": round(cx / T * LOGIC_T, 2), "y": round(base_y / T * LOGIC_T, 2)}
        if depth_y is not None:
            entry["depth"] = round(depth_y / T * LOGIC_T, 2)
        entry.update(extra)
        self.stand.append(entry)
        return entry

    def shadow(self, cx: float, cy: float, rx: float, ry: float, alpha: int = 110) -> None:
        """Sombra macia pintada no chão, puxada pra baixo e pra direita, como a luz manda."""
        pad = 8
        box = (int(cx - rx - pad), int(cy - ry - pad), int(cx + rx + pad), int(cy + ry + pad))
        w, h = box[2] - box[0], box[3] - box[1]
        if w <= 0 or h <= 0:
            return
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse([pad, pad, w - pad, h - pad], fill=alpha)
        mask = mask.filter(ImageFilter.GaussianBlur(3))
        patch = Image.new("RGBA", (w, h), (14, 16, 22, 255))
        patch.putalpha(mask)
        self.img.alpha_composite(patch, dest=(max(0, box[0]), max(0, box[1])), source=(max(0, -box[0]), max(0, -box[1])))

    def wall_shadow(self, x0: float, y0: float, x1: float, y1: float, alpha: int = 90) -> None:
        pad = 10
        box = (int(x0) - pad, int(y0) - pad, int(x1) + pad, int(y1) + pad)
        w, h = box[2] - box[0], box[3] - box[1]
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rectangle([pad, pad, w - pad, h - pad], fill=alpha)
        mask = mask.filter(ImageFilter.GaussianBlur(4))
        patch = Image.new("RGBA", (w, h), (14, 16, 22, 255))
        patch.putalpha(mask)
        self.img.alpha_composite(patch, dest=(max(0, box[0]), max(0, box[1])), source=(max(0, -box[0]), max(0, -box[1])))

    # O chão ---------------------------------------------------------------------------------------------------------

    def lay(self, texture: Image.Image, mask: Image.Image, edge: Color | None = None) -> None:
        """Assenta uma textura onde a máscara manda, com uma borda fina escura pra descolar do que está embaixo."""
        if edge:
            rim = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(5)), mask)
            shade(self.img, rim, edge, 0.5)
        layer = texture.copy().convert("RGBA")
        layer.putalpha(mask)
        self.img.alpha_composite(layer)

    def open_water(self, mask: Image.Image) -> None:
        """Fura a água no chão. Na beira ela fica rasa: o lodo aparece pelo fundo e some aos poucos."""
        # A margem molhada, em terra: escurece.
        wet = ImageChops.subtract(mask.filter(ImageFilter.GaussianBlur(10)).point(lambda v: min(255, v * 3)), mask)
        shade(self.img, wet, (34, 30, 24), 0.55)
        rim = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(3)), mask)
        shade(self.img, rim, (26, 24, 22), 0.7)
        # Da beira pro fundo, o raso: a imagem de cima vai ficando transparente.
        depth = mask.filter(ImageFilter.GaussianBlur(14))
        inner = depth.point(lambda v: max(0, min(255, int((v - 128) * 2))))
        steps = inner.point(lambda v: (v // 42) * 42)
        keep = steps.point(lambda v: int((255 - v) * 0.62))
        mud = Image.new("RGBA", self.img.size, (84, 78, 56, 255))
        hard = mask.point(lambda v: 255 if v > 127 else 0)
        alpha = Image.composite(keep, Image.new("L", self.img.size, 255), hard)
        base = self.img.copy()
        base.paste(mud, (0, 0), hard)
        # A espuma suja da beira: uma linha pontilhada onde o rio bate.
        foam = ImageChops.subtract(hard, hard.filter(ImageFilter.MinFilter(5)))
        grain = noise(self.w, self.h, 7, self.rng, 2).point(lambda v: 255 if v > 150 else 0)
        foam = ImageChops.multiply(foam, grain)
        shade(base, foam, (170, 172, 150), 0.5)
        alpha = ImageChops.lighter(alpha, foam.point(lambda v: int(v * 0.6)))
        base.putalpha(alpha)
        self.img = base
        self.water_alpha = mask

    def on_water(self, image: Image.Image, x: int, y: int) -> None:
        """Algo pousado sobre a água (cais, casco): opaco, mesmo onde o chão está furado."""
        self.img.alpha_composite(image.convert("RGBA"), dest=(x, y))

    def water_shadow(self, x: int, y: int, w: int, h: int, alpha: int = 110) -> None:
        patch = Image.new("RGBA", (w, h), (8, 12, 16, alpha))
        self.img.alpha_composite(patch, dest=(x, y))

    # O relevo --------------------------------------------------------------------------------------------------------

    def relief(self, wall: Color = (112, 106, 94), slope: Color = (40, 36, 26)) -> None:
        """
        Os patamares do mapa (`elevation`), um degrau por vez, de baixo pra cima: o topo um pouco mais claro, a borda
        de cima com luz, o talude escuro descendo pro sul (é a face que se vê), os lados com sombra fina e, embaixo, a
        sombra que o patamar joga. Onde o mapa põe a face que barra o passo (FACE), é muro de pedra; o vão no meio dele
        é escada. Pinta por cima do chão e por baixo do que está de pé, e não toca na água.
        """
        a = self.area
        top_level = max(max(row) for row in a.elevation)
        if top_level == 0:
            return
        dry = ImageChops.invert(a.tile_mask({DEEP, SHALLOW, CHAIN}))
        if self.water_alpha is not None:
            dry = ImageChops.multiply(dry, self.water_alpha.point(lambda v: 255 if v < 128 else 0))
        faces = {FACE, FACE2}
        is_face = lambda x, y: a.relief[y][x] in faces or a.ground[y][x] in faces
        wall_mask = a.where(is_face)
        drop = 22
        for level in range(1, top_level + 1):
            hard = a.where(lambda x, y, level=level: a.elevation[y][x] >= level)
            soft = hard.filter(ImageFilter.GaussianBlur(13))
            n = noise(self.w, self.h, 30, self.rng, 3)
            top = threshold(ImageChops.add(soft.point(lambda v: int(v * 0.66)), n.point(lambda v: int(v * 0.34))), 128)
            top = ImageChops.multiply(top, dry)
            # A sombra que o patamar joga no chão de baixo, pro sul e pro leste.
            cast = ImageChops.subtract(ImageChops.offset(top, 10, drop + 12).filter(ImageFilter.GaussianBlur(9)), top)
            shade(self.img, ImageChops.multiply(cast, dry), (14, 16, 22), 0.32)
            # O talude: a faixa logo abaixo da borda de baixo, escura em cima e sumindo embaixo.
            band = Image.new("L", top.size, 0)
            for i in range(1, drop + 1):
                step = ImageChops.subtract(ImageChops.offset(top, 0, i), top)
                band = ImageChops.lighter(band, step.point(lambda v, i=i: int(v * (1 - (i - 1) / drop))))
            band = ImageChops.multiply(ImageChops.subtract(band, wall_mask), dry)
            shade(self.img, band, slope, 0.62)
            grain = noise(self.w, self.h, 4, self.rng, 2).point(lambda v: 255 if v > 150 else 0)
            shade(self.img, ImageChops.multiply(band, grain), lit(slope, -0.3), 0.5)
            # O pé do talude: uma linha fina mais escura onde ele encontra o chão de baixo.
            foot = ImageChops.subtract(ImageChops.offset(top, 0, drop).filter(ImageFilter.MaxFilter(3)), ImageChops.offset(top, 0, drop - 2))
            shade(self.img, ImageChops.multiply(ImageChops.subtract(foot, top), dry), (16, 14, 12), 0.45)
            # Os lados: sombra estreita do lado de fora.
            sides = ImageChops.subtract(ImageChops.lighter(ImageChops.offset(top, 11, 0), ImageChops.offset(top, -11, 0)), top)
            sides = ImageChops.multiply(ImageChops.subtract(sides, band), dry)
            shade(self.img, sides, slope, 0.5)
            shade(self.img, ImageChops.subtract(sides, sides.filter(ImageFilter.MinFilter(5))), (18, 16, 14), 0.4)
            # O topo e a borda de cima, onde a luz bate.
            shade(self.img, top, (232, 222, 180), 0.07)
            rim = ImageChops.subtract(top, ImageChops.offset(top, 0, 4))
            shade(self.img, rim, (238, 230, 196), 0.34)
            lip = ImageChops.subtract(top, ImageChops.offset(top, 0, -3))
            shade(self.img, lip, (24, 20, 16), 0.55)
        # O muro de arrimo: pedra aparelhada no quadrado da face, com a capa em cima e o musgo embaixo.
        if wall_mask.getbbox():
            stone = masonry(self.w, self.h, self.rng, wall, 12).convert("RGBA")
            stone.putalpha(wall_mask)
            self.img.alpha_composite(stone)
            cap = ImageChops.subtract(wall_mask, ImageChops.offset(wall_mask, 0, 7))
            shade(self.img, cap, lit(wall, 0.35), 0.85)
            shade(self.img, ImageChops.subtract(ImageChops.offset(cap, 0, 7), cap), (18, 16, 16), 0.5)
            grain = noise(self.w, self.h, 6, self.rng, 2).point(lambda v: 255 if v > 120 else 0)
            moss = ImageChops.multiply(ImageChops.subtract(wall_mask, ImageChops.offset(wall_mask, 0, -12)), grain)
            shade(self.img, moss, (58, 76, 44), 0.6)
            foot = ImageChops.subtract(ImageChops.offset(wall_mask, 6, 14).filter(ImageFilter.GaussianBlur(5)), wall_mask)
            shade(self.img, foot, (12, 14, 20), 0.4)
        # A escada: o vão do muro, ao lado de uma face, ganha degraus de pedra.
        d = ImageDraw.Draw(self.img)
        for y in range(1, a.h):
            for x in range(a.w):
                if is_face(x, y) or a.elevation[y - 1][x] <= a.elevation[y][x]:
                    continue
                if not ((x > 0 and is_face(x - 1, y)) or (x + 1 < a.w and is_face(x + 1, y))):
                    continue
                x0, y0 = x * T, y * T
                for k in range(6):
                    tone = lit(wall, 0.2 - k * 0.07)
                    d.rectangle([x0, y0 + k * 8, x0 + T - 1, y0 + k * 8 + 7], fill=tone + (255,))
                    d.line([(x0, y0 + k * 8), (x0 + T - 1, y0 + k * 8)], fill=lit(tone, 0.3) + (255,))
                    d.line([(x0, y0 + k * 8 + 7), (x0 + T - 1, y0 + k * 8 + 7)], fill=(30, 26, 24, 255))

    # Enfeites --------------------------------------------------------------------------------------------------------

    def tufts(self, where: Image.Image, count: int, colors: list[Color], tall: int = 7) -> None:
        d = ImageDraw.Draw(self.img)
        px = where.load()
        for _ in range(count):
            x, y = self.rng.randint(2, self.w - 3), self.rng.randint(8, self.h - 3)
            if not px[x, y]:
                continue
            for _ in range(self.rng.randint(3, 6)):
                ox = x + self.rng.randint(-3, 3)
                top = y - self.rng.randint(tall // 2, tall)
                d.line([(ox, y), (ox + self.rng.randint(-2, 2), top)], fill=self.rng.choice(colors) + (255,))

    def flowers(self, where: Image.Image, count: int, colors: list[Color]) -> None:
        d = ImageDraw.Draw(self.img)
        px = where.load()
        for _ in range(count):
            cx, cy = self.rng.randint(2, self.w - 3), self.rng.randint(2, self.h - 3)
            if not px[cx, cy]:
                continue
            color = self.rng.choice(colors)
            for _ in range(self.rng.randint(2, 7)):
                x, y = cx + self.rng.randint(-8, 8), cy + self.rng.randint(-6, 6)
                d.line([(x, y), (x, y + 2)], fill=(52, 72, 40, 255))
                d.point((x, y - 1), fill=color + (255,))

    def pebbles(self, where: Image.Image, count: int) -> None:
        d = ImageDraw.Draw(self.img)
        px = where.load()
        for _ in range(count):
            x, y = self.rng.randint(2, self.w - 5), self.rng.randint(2, self.h - 4)
            if not px[x, y]:
                continue
            tone = self.rng.choice([(120, 116, 106), (98, 94, 86), (142, 138, 124)])
            d.ellipse([x, y, x + self.rng.randint(2, 5), y + self.rng.randint(1, 3)], fill=tone + (255,))
            d.point((x + 1, y), fill=lit(tone, 0.3) + (255,))

    def reeds(self, where: Image.Image, count: int) -> None:
        """Junco: pintado no chão só nas margens, com a cabeça escura."""
        d = ImageDraw.Draw(self.img)
        px = where.load()
        for _ in range(count):
            x, y = self.rng.randint(3, self.w - 4), self.rng.randint(14, self.h - 3)
            if not px[x, y]:
                continue
            for _ in range(self.rng.randint(4, 9)):
                ox = x + self.rng.randint(-5, 5)
                length = self.rng.randint(8, 17)
                tip = ox + self.rng.randint(-3, 3)
                color = self.rng.choice([(96, 104, 58), (116, 114, 62), (78, 92, 52), (136, 126, 72)])
                d.line([(ox, y), (tip, y - length)], fill=color + (255,))
                if self.rng.random() < 0.4:
                    d.rectangle([tip - 1, y - length - 3, tip, y - length], fill=(70, 50, 34, 255))

    def post(self, x: int, y: int, h: int = 22, color: Color = (70, 52, 38)) -> None:
        d = ImageDraw.Draw(self.img)
        d.rectangle([x, y - h, x + 3, y], fill=color + (255,), outline=(24, 20, 20, 255))
        d.line([(x + 1, y - h + 1), (x + 1, y - 1)], fill=lit(color, 0.2) + (255,))

    # Bosques ---------------------------------------------------------------------------------------------------------

    def trees_from_grid(self, kit: list[tuple[str, Image.Image, float]], skip: set[tuple[int, int]] | None = None, jitter: int = 11) -> None:
        """Cada quadrado de árvore do mapa ganha uma, sorteada do kit, um pouco fora da linha."""
        skip = skip or set()
        area = self.area
        weights = [k[2] for k in kit]
        hedges = [bush(self.rng, [(30, 44, 30), (40, 56, 34), (54, 70, 40), (70, 84, 46), (88, 98, 52)]) for _ in range(3)]
        for y in range(area.h):
            for x in range(area.w):
                if area.sorted[y][x] != TREE or (x, y) in skip:
                    continue
                if y == 0 and area.id != "floresta":
                    index = self.rng.randrange(len(hedges))
                    self.put(f"sebe{index}", hedges[index], x * T + T / 2 + self.rng.randint(-8, 8), T + self.rng.randint(0, 8))
                    continue
                name, image, _ = self.rng.choices(kit, weights)[0]
                cx = x * T + T / 2 + self.rng.randint(-jitter, jitter)
                base = (y + 1) * T - 5 + self.rng.randint(-5, 3)
                self.shadow(cx + 7, base - 1, image.width * 0.34, 9, 120)
                self.put(name, image, cx, base)


def forest_kit(rng: random.Random, dark: bool = False) -> list[tuple[str, Image.Image, float]]:
    trunk = (58, 44, 36)
    birch_green = [(36, 54, 34), (46, 66, 38), (60, 80, 44), (78, 96, 50), (102, 114, 60), (128, 134, 72)]
    oak = [(28, 42, 32), (36, 52, 34), (48, 64, 36), (62, 76, 40), (80, 88, 46), (100, 102, 54)]
    spruce = [(20, 34, 32), (26, 42, 36), (32, 52, 40), (42, 64, 46), (56, 78, 52)]
    if dark:
        oak = [lit(c, -0.18) for c in oak]
    kit: list[tuple[str, Image.Image, float]] = []
    for i in range(4):
        kit.append((f"carvalho{i}", tree_broad(rng, oak, rng.randint(96, 118), rng.randint(122, 142), trunk), 3))
    for i in range(3):
        kit.append((f"faia{i}", tree_broad(rng, birch_green, rng.randint(80, 96), rng.randint(128, 150), (92, 88, 78)), 2))
    for i in range(3):
        kit.append((f"abeto{i}", tree_spruce(rng, spruce, rng.randint(70, 86), rng.randint(136, 168), (48, 36, 30)), 3 if dark else 1.5))
    return kit


def field_kit(rng: random.Random) -> list[tuple[str, Image.Image, float]]:
    trunk = (58, 44, 36)
    oak = [(32, 46, 32), (42, 58, 36), (56, 72, 40), (72, 86, 46), (92, 100, 54), (116, 116, 62)]
    lime = [(40, 60, 36), (54, 76, 40), (72, 92, 46), (94, 108, 54), (120, 126, 66)]
    kit: list[tuple[str, Image.Image, float]] = []
    for i in range(3):
        kit.append((f"carvalho{i}", tree_broad(rng, oak, rng.randint(100, 124), rng.randint(122, 146), trunk), 3))
    for i in range(2):
        kit.append((f"tilia{i}", tree_broad(rng, lime, rng.randint(84, 100), rng.randint(118, 138), trunk), 2))
    return kit


def willow_kit(rng: random.Random) -> list[tuple[str, Image.Image, float]]:
    palette = [(52, 66, 40), (66, 80, 44), (84, 96, 50), (106, 112, 58), (130, 130, 70)]
    return [(f"salgueiro{i}", tree_willow(rng, palette, rng.randint(92, 110), rng.randint(104, 124), (64, 56, 46)), 1) for i in range(3)]


def bush(rng: random.Random, palette: list[Color], w: int = 96, h: int = 72) -> Image.Image:
    """A sebe da borda do mapa: só copa, que uma árvore de verdade ali ficaria sem cabeça, cortada pela câmera."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    clumps = []
    for _ in range(170):
        x, y = rng.uniform(w * 0.08, w * 0.92), rng.uniform(h * 0.16, h * 0.9)
        clumps.append((1 - y / h + rng.uniform(-0.2, 0.2), x, y))
    clumps.sort()
    for light, x, y in clumps:
        blob(d, x, y, rng.uniform(5, 9), palette[max(0, min(len(palette) - 1, int(light * len(palette))))], rng)
    return outline(img)


def boat(rng: random.Random, w: int = 118, h: int = 40, hull: Color = (72, 52, 36), upturned: bool = False, load: bool = False) -> Image.Image:
    """Barca de rio de fundo chato, vista de lado e de cima. Virada de casco pra cima, é só uma corcova."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if upturned:
        d.polygon([(2, h - 4), (12, 8), (w - 14, 6), (w - 2, h - 5), (w - 10, h - 1), (10, h - 1)], fill=hull + (255,))
        for i in range(8, h - 2, 5):
            d.line([(10 + (h - i) // 4, i), (w - 10 - (h - i) // 4, i - 1)], fill=lit(hull, -0.42) + (255,))
        d.line([(14, 8), (w - 16, 6)], fill=lit(hull, 0.3) + (255,), width=2)
        for x in range(16, w - 14, 20):
            d.line([(x, 8), (x + 1, h - 3)], fill=lit(hull, -0.3) + (255,))
        return outline(img)
    # O casco: o bordo de cá embaixo, o miolo em cima, o bordo de lá.
    mid = h // 2
    d.polygon([(0, 8), (w - 1, 6), (w - 8, h - 4), (10, h - 2)], fill=lit(hull, -0.32) + (255,))
    d.polygon([(8, 7), (w - 10, 6), (w - 16, mid), (14, mid + 1)], fill=lit(hull, -0.5) + (255,))
    for x in range(16, w - 18, 14):
        d.line([(x, 8), (x, mid)], fill=lit(hull, -0.2) + (255,), width=3)
    for y in range(mid + 2, h - 3, 5):
        d.line([(12, y), (w - 12, y - 1)], fill=lit(hull, -0.55) + (255,))
    d.line([(0, 8), (w - 1, 6)], fill=lit(hull, 0.3) + (255,), width=2)
    d.line([(9, mid + 1), (w - 12, mid)], fill=lit(hull, 0.18) + (255,), width=2)
    if load:
        for x in (26, 44, 62):
            d.rounded_rectangle([x, 2, x + 15, mid - 2], radius=3, fill=(140, 122, 92, 255), outline=(40, 32, 26, 255))
            d.line([(x + 2, 6), (x + 13, 6)], fill=(94, 80, 60, 255))
    return outline(img)


def chain_link_row(w: int) -> Image.Image:
    img = Image.new("RGBA", (w, 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x in range(0, w, 11):
        if (x // 11) % 2:
            d.ellipse([x, 3, x + 12, 9], outline=(32, 30, 32, 255), width=2)
            d.line([(x + 3, 4), (x + 9, 4)], fill=(120, 112, 100, 255))
        else:
            d.rectangle([x + 2, 5, x + 10, 7], fill=(58, 54, 54, 255))
            d.line([(x + 3, 5), (x + 9, 5)], fill=(128, 120, 108, 255))
    return img


def tower(rng: random.Random, tiles_w: float, height: int, stone: Color = (108, 104, 96), roof: Color | None = (80, 72, 70), timber_top: bool = False, banner: tuple[Color, Color] | None = None, cone: bool = True) -> Image.Image:
    """Torre redonda de pedra de rio, com o telhado em cone. O brasão, quando há, é só cor (ver docs/arte.md)."""
    w = int(tiles_w * T)
    cone_h = int(w * 0.95) if cone and roof else 0
    pole = 26 if banner else 0
    h = height + cone_h + pole
    img = Image.new("RGBA", (w + 28, h), (0, 0, 0, 0))
    left = 14
    wall = masonry(w, height, rng, stone, 9).convert("RGBA")
    # O cilindro: escuro nas pontas, claro um pouco à esquerda.
    for x in range(w):
        f = (x / w - 0.42) * 2
        dark = int(max(0.0, abs(f) ** 2.2) * 150)
        strip = Image.new("RGBA", (1, height), (10, 10, 20, dark))
        wall.alpha_composite(strip, dest=(x, 0))
    img.alpha_composite(wall, dest=(left, h - height))
    d = ImageDraw.Draw(img)
    if timber_top:
        band_h = 26
        band = planks(w + 8, band_h, rng, (72, 54, 38), True, 7)
        img.paste(band, (left - 4, h - height), None)
        d = ImageDraw.Draw(img)
        d.rectangle([left - 4, h - height + band_h, left + w + 3, h - height + band_h + 2], fill=(30, 24, 22, 255))
        for x in range(left + 6, left + w - 4, 16):
            d.rectangle([x, h - height + 10, x + 4, h - height + 18], fill=(16, 14, 16, 255))
    for y in range(h - height + 40, h - 22, 44):
        d.rectangle([left + w // 2 - 2, y, left + w // 2 + 2, y + 12], fill=(16, 14, 18, 255))
    if cone_h:
        top = h - height
        d.polygon([(left - 6, top + 3), (left + w // 2, top - cone_h), (left + w + 5, top + 3)], fill=roof + (255,))
        for i in range(2, cone_h, 6):
            span = (i / cone_h) * (w / 2 + 6)
            for x in range(int(left + w // 2 - span), int(left + w // 2 + span), 6):
                f = (x - (left + w / 2)) / (w / 2 + 6)
                tone = lit(roof, (-f * 0.34 - 0.04) + rng.uniform(-0.08, 0.08))  # type: ignore[arg-type]
                d.rectangle([x, top - cone_h + i, x + 4, top - cone_h + i + 4], fill=tone + (255,))
        d.line([(left - 6, top + 3), (left + w + 5, top + 3)], fill=(26, 22, 24, 255), width=2)
    if banner:
        px = left + w // 2
        top = h - height - cone_h
        d.line([(px, top), (px, top - pole + 2)], fill=(36, 30, 28, 255), width=2)
        field, charge = banner
        d.polygon([(px + 1, top - pole + 2), (px + 24, top - pole + 6), (px + 19, top - pole + 11), (px + 24, top - pole + 17), (px + 1, top - pole + 17)], fill=field + (255,), outline=(24, 22, 22, 255))
        d.line([(px + 3, top - pole + 9), (px + 16, top - pole + 10)], fill=charge + (255,), width=2)
    return outline(img)


def treadwheel_crane(rng: random.Random) -> Image.Image:
    """O guindaste de roda do cais, de madeira, de telhado próprio e pescoço virado pro rio."""
    w, h = 112, 170
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = planks(58, 96, rng, (86, 64, 44), True, 8)
    img.paste(body, (20, h - 96))
    d = ImageDraw.Draw(img)
    d.rectangle([20, h - 96, 77, h - 1], outline=(30, 24, 22, 255))
    # A roda, vista pela porta larga.
    cx, cy, r = 49, h - 40, 22
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(26, 20, 18, 255), outline=(128, 98, 64, 255), width=3)
    for i in range(8):
        a = i / 8 * math.tau
        d.line([(cx, cy), (cx + math.cos(a) * r, cy + math.sin(a) * r)], fill=(112, 86, 58, 255), width=2)
    # O telhado em pirâmide.
    d.polygon([(10, h - 94), (49, h - 142), (88, h - 94)], fill=(78, 62, 54, 255))
    for i in range(0, 46, 5):
        span = (i / 46) * 38
        d.line([(49 - span, h - 140 + i), (49 + span, h - 140 + i)], fill=(52, 42, 40, 255))
    d.line([(49, h - 142), (88, h - 94)], fill=(40, 32, 32, 255), width=2)
    d.line([(10, h - 94), (49, h - 142)], fill=(116, 96, 80, 255))
    # O pescoço pro rio, com a corda e o gancho.
    d.line([(49, h - 120), (104, h - 150)], fill=(70, 52, 38, 255), width=5)
    d.line([(49, h - 120), (104, h - 150)], fill=(100, 78, 54, 255), width=1)
    d.line([(103, h - 150), (103, h - 110)], fill=(44, 38, 34, 255))
    d.line([(99, h - 110), (107, h - 110)], fill=(70, 66, 62, 255), width=2)
    return outline(img)


def wooden_prop(kind: str, rng: random.Random) -> Image.Image:
    w, h = 48, 72
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if kind == "crate":
        body = planks(38, 28, rng, (116, 88, 56), False, 7)
        lid = planks(38, 16, rng, (136, 106, 70), False, 7)
        img.paste(lid, (5, h - 46))
        img.paste(body, (5, h - 30))
        d = ImageDraw.Draw(img)
        d.rectangle([5, h - 46, 42, h - 3], outline=(34, 26, 22, 255))
        d.line([(5, h - 30), (42, h - 30)], fill=(34, 26, 22, 255))
        d.line([(6, h - 4), (41, h - 29)], fill=(74, 54, 36, 255), width=3)
        d.rectangle([5, h - 30, 9, h - 3], fill=(84, 62, 42, 255))
        d.rectangle([38, h - 30, 42, h - 3], fill=(84, 62, 42, 255))
    elif kind == "barrel":
        cx = w // 2
        top, bottom = h - 46, h - 3
        for y in range(top, bottom):
            f = (y - top) / (bottom - top)
            half = 14 + 4 * math.sin(f * math.pi)
            for x in range(int(cx - half), int(cx + half) + 1):
                s = (x - cx) / half
                tone = lit((104, 72, 44), -s * 0.32 - 0.02 + (-0.16 if int(x * 0.9) % 6 == 0 else 0))
                d.point((x, y), fill=tone + (255,))
        for f in (0.14, 0.3, 0.72, 0.88):
            y = top + int(f * (bottom - top))
            half = 14 + 4 * math.sin(f * math.pi)
            d.line([(cx - half, y), (cx + half, y)], fill=(44, 40, 40, 255), width=2)
            d.line([(cx - half + 3, y - 1), (cx - 2, y - 1)], fill=(116, 108, 96, 255))
        d.ellipse([cx - 14, top - 5, cx + 14, top + 5], fill=(70, 50, 34, 255), outline=(34, 26, 22, 255))
        # Óleo: a mancha que escorreu da tampa, que é o aviso de que isso queima.
        d.ellipse([cx - 8, top - 3, cx + 8, top + 3], fill=(40, 30, 22, 255))
        d.line([(cx + 5, top + 4), (cx + 6, top + 18)], fill=(36, 28, 22, 255), width=2)
    elif kind == "winch":
        d.rectangle([9, h - 44, 13, h - 3], fill=(76, 56, 38, 255), outline=(28, 22, 20, 255))
        d.rectangle([34, h - 44, 38, h - 3], fill=(76, 56, 38, 255), outline=(28, 22, 20, 255))
        d.rectangle([4, h - 8, 43, h - 3], fill=(62, 46, 32, 255), outline=(28, 22, 20, 255))
        d.rectangle([12, h - 36, 35, h - 24], fill=(54, 50, 50, 255), outline=(26, 24, 24, 255))
        for x in range(13, 35, 4):
            d.line([(x, h - 35), (x, h - 25)], fill=(108, 102, 94, 255))
        d.line([(4, h - 30), (43, h - 30)], fill=(92, 72, 50, 255), width=3)
        d.line([(43, h - 30), (43, h - 46)], fill=(92, 72, 50, 255), width=3)
        d.line([(4, h - 30), (4, h - 16)], fill=(92, 72, 50, 255), width=3)
        d.rectangle([40, h - 50, 46, h - 45], fill=(120, 110, 96, 255), outline=(26, 24, 24, 255))
    elif kind == "bell":
        d.rectangle([8, h - 60, 12, h - 3], fill=(66, 50, 36, 255), outline=(26, 22, 20, 255))
        d.rectangle([35, h - 60, 39, h - 3], fill=(66, 50, 36, 255), outline=(26, 22, 20, 255))
        d.rectangle([5, h - 63, 42, h - 58], fill=(78, 60, 42, 255), outline=(26, 22, 20, 255))
        d.polygon([(18, h - 54), (29, h - 54), (33, h - 30), (14, h - 30)], fill=(150, 112, 56, 255), outline=(40, 30, 22, 255))
        d.line([(20, h - 52), (17, h - 32)], fill=(212, 178, 104, 255))
    elif kind == "circle":
        # O círculo riscado de giz com as estacas: desenhado deitado, no próprio chão.
        d.ellipse([3, h - 42, 44, h - 4], outline=(214, 212, 192, 255), width=2)
        d.ellipse([10, h - 36, 37, h - 10], outline=(180, 178, 160, 255))
        for i in range(12):
            a = i / 12 * math.tau
            x, y = 23.5 + math.cos(a) * 16.5, h - 23 + math.sin(a) * 15
            d.line([(x - 1, y - 1), (x + 1, y + 1)], fill=(224, 222, 204, 255))
        for x, y in ((3, h - 23), (44, h - 23), (23, h - 44), (23, h - 2)):
            d.rectangle([x - 1, y - 7, x + 1, y], fill=(82, 60, 40, 255), outline=(26, 22, 20, 255))
        return img
    elif kind == "walkway":
        # A passarela: tábuas deitadas por cima da água, de um quadrado, com as duas estacas do lado de baixo.
        deck = planks(48, 40, rng, (112, 86, 58), True, 8)
        img.paste(deck, (0, h - 44))
        d = ImageDraw.Draw(img)
        d.rectangle([0, h - 44, 47, h - 5], outline=(40, 30, 22, 255))
        for x in (6, 41):
            d.rectangle([x - 2, h - 8, x + 2, h - 1], fill=(70, 52, 36, 255), outline=(26, 22, 20, 255))
        d.line([(1, h - 43), (46, h - 43)], fill=(150, 120, 84, 255))
        return img
    elif kind in ("chest", "chest_open"):
        # A arca de tábua com cinta de ferro. Aberta, a tampa fica de pé atrás e o fundo escuro aparece.
        body = planks(38, 22, rng, (104, 74, 46), False, 6)
        img.paste(body, (5, h - 25))
        d = ImageDraw.Draw(img)
        if kind == "chest":
            lid = planks(38, 14, rng, (124, 90, 56), False, 6)
            img.paste(lid, (5, h - 38))
            d = ImageDraw.Draw(img)
            d.line([(5, h - 25), (42, h - 25)], fill=(30, 24, 20, 255))
        else:
            lid = planks(38, 18, rng, (118, 86, 54), False, 6)
            img.paste(lid, (5, h - 46))
            d = ImageDraw.Draw(img)
            d.rectangle([7, h - 28, 40, h - 24], fill=(20, 16, 14, 255))
        for x in (9, 36):
            d.rectangle([x, h - (46 if kind == "chest_open" else 38), x + 3, h - 3], fill=(70, 68, 66, 255), outline=(28, 26, 26, 255))
        d.rectangle([21, h - 26, 26, h - 19], fill=(150, 132, 84, 255), outline=(30, 26, 20, 255))
    elif kind in ("door", "door_open"):
        # A porta de tábua num batente de pedra. Aberta, só o batente e o vão escuro.
        d.rectangle([2, h - 66, 45, h - 2], fill=(98, 94, 86, 255), outline=(28, 26, 24, 255))
        d.rectangle([7, h - 60, 40, h - 2], fill=(18, 16, 16, 255))
        if kind == "door":
            leaf = planks(34, 58, rng, (98, 70, 44), True, 8)
            img.paste(leaf, (7, h - 60))
            d = ImageDraw.Draw(img)
            for y in (h - 50, h - 18):
                d.rectangle([7, y, 40, y + 3], fill=(66, 64, 62, 255), outline=(28, 26, 26, 255))
            d.ellipse([33, h - 34, 37, h - 30], fill=(150, 132, 84, 255), outline=(30, 26, 20, 255))
        else:
            leaf = planks(8, 58, rng, (90, 64, 40), True, 8)
            img.paste(leaf, (7, h - 60))
            d = ImageDraw.Draw(img)
    elif kind in ("lever", "lever_on"):
        # O pino de pedra com a alavanca de ferro: pra cima, ou puxada pra baixo.
        d.rectangle([14, h - 18, 33, h - 3], fill=(108, 104, 96, 255), outline=(30, 28, 26, 255))
        d.line([(15, h - 18), (32, h - 18)], fill=(146, 142, 130, 255))
        tip = (34, h - 44) if kind == "lever" else (40, h - 12)
        d.line([(23, h - 14), tip], fill=(62, 60, 58, 255), width=4)
        d.ellipse([tip[0] - 4, tip[1] - 4, tip[0] + 4, tip[1] + 4], fill=(120, 60, 44, 255), outline=(30, 22, 20, 255))
    elif kind == "trap":
        # O dente de ferro meio enterrado: deitado no chão, como o círculo.
        d.ellipse([8, h - 22, 39, h - 6], outline=(52, 50, 48, 255), width=3)
        for i in range(8):
            a = i / 8 * math.tau
            x, y = 23.5 + math.cos(a) * 14, h - 14 + math.sin(a) * 7
            d.polygon([(x - 2, y), (x + 2, y), (23.5 + math.cos(a) * 8, h - 14 + math.sin(a) * 4)], fill=(150, 146, 136, 255))
        d.rectangle([21, h - 16, 26, h - 12], fill=(92, 90, 86, 255))
        return outline(img)
    elif kind == "sack":
        # O que está no chão: um saco amarrado.
        d.ellipse([12, h - 26, 36, h - 3], fill=(150, 126, 86, 255), outline=(40, 32, 24, 255))
        d.polygon([(19, h - 27), (29, h - 27), (26, h - 33), (22, h - 33)], fill=(132, 108, 72, 255), outline=(40, 32, 24, 255))
        d.line([(19, h - 26), (29, h - 26)], fill=(84, 60, 36, 255), width=2)
        d.line([(16, h - 16), (24, h - 20)], fill=(176, 152, 108, 255))
    return outline(img)


# ---------------------------------------------------------------- as áreas


def interior(canvas: Canvas, x0: int, y0: int, x1: int, y1: int, floor: Image.Image, door_x: int, plaster: Color, timber: Color) -> None:
    """O corte de um prédio de que se entra: o chão de dentro, a parede de trás em pé e as outras de topo. Fica no
    chão pintado, e o telhado de fora (uma peça de pé) o cobre até alguém entrar."""
    rng = canvas.rng
    px0, py0, px1, py1 = x0 * T, y0 * T, (x1 + 1) * T, (y1 + 1) * T
    canvas.img.paste(floor.crop((0, 0, px1 - px0, py1 - py0)), (px0, py0))
    # A parede do fundo, vista de frente, ocupa o quadrado de cima.
    canvas.img.paste(half_timbered(px1 - px0, T, rng, plaster, timber, plinth=7), (px0, py0))
    # A sombra que a parede de trás joga no chão.
    shadow = Image.new("RGBA", (px1 - px0 - 2 * T, 18), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(18):
        sd.line([(0, i), (shadow.width, i)], fill=(8, 8, 14, int(120 * (1 - i / 18))))
    canvas.img.alpha_composite(shadow, dest=(px0 + T, py0 + T))
    d = ImageDraw.Draw(canvas.img)
    # O topo das paredes do lado e da frente: a viga cortada.
    top = (70, 52, 38)
    edge = (28, 22, 20)
    for rect in (
        (px0, py0 + T - 4, px0 + T - 1, py1 - 1),
        (px1 - T, py0 + T - 4, px1 - 1, py1 - 1),
        (px0, py1 - T, door_x * T - 1, py1 - 1),
        ((door_x + 1) * T, py1 - T, px1 - 1, py1 - 1),
    ):
        band = planks(rect[2] - rect[0] + 1, rect[3] - rect[1] + 1, rng, top, rect[3] - rect[1] > rect[2] - rect[0], 7)
        canvas.img.paste(band, (rect[0], rect[1]))
        d = ImageDraw.Draw(canvas.img)
        d.rectangle(rect, outline=edge + (255,))
        d.line([(rect[0] + 1, rect[1] + 1), (rect[2] - 1, rect[1] + 1)], fill=lit(top, 0.25) + (255,))
    # A soleira da porta.
    canvas.img.paste(planks(T, T, rng, (92, 74, 54), False, 8), (door_x * T, py1 - T))


def shelves(canvas: Canvas, x: int, y: int, w: int, rng: random.Random) -> None:
    """Estante na parede do fundo: tábua e o que estiver em cima."""
    d = ImageDraw.Draw(canvas.img)
    for row in (y + 8, y + 26):
        d.rectangle([x, row, x + w, row + 2], fill=(92, 68, 44, 255), outline=(30, 24, 22, 255))
        cx = x + 3
        while cx < x + w - 4:
            kind = rng.random()
            if kind < 0.45:
                bw = rng.randint(3, 5)
                bh = rng.randint(9, 13)
                d.rectangle([cx, row - bh, cx + bw, row - 1], fill=rng.choice([(104, 62, 46), (70, 72, 58), (112, 90, 56), (60, 56, 72)]) + (255,), outline=(26, 22, 22, 255))
                cx += bw + 1
            elif kind < 0.7:
                d.rectangle([cx, row - 7, cx + 8, row - 1], fill=(144, 128, 96, 255), outline=(40, 32, 26, 255))
                cx += 10
            else:
                cx += rng.randint(3, 9)


def table_long(rng: random.Random, tiles: float, with_papers: bool = True) -> Image.Image:
    """A mesa comprida de tábua, com tinteiro, papel e lacre. Barra o passo: o mapa marca."""
    w = int(tiles * T)
    h = 60
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    top = planks(w - 4, 26, rng, (112, 80, 50), False, 7)
    img.paste(top, (2, h - 42))
    front = planks(w - 8, 15, rng, (70, 50, 34), False, 15)
    img.paste(front, (4, h - 16))
    d = ImageDraw.Draw(img)
    d.rectangle([2, h - 42, w - 3, h - 16], outline=(28, 22, 20, 255))
    d.rectangle([4, h - 16, w - 5, h - 1], outline=(28, 22, 20, 255))
    d.rectangle([6, h - 15, 10, h - 1], fill=(44, 32, 24, 255))
    d.rectangle([w - 11, h - 15, w - 7, h - 1], fill=(44, 32, 24, 255))
    if with_papers:
        for _ in range(int(tiles * 2.5)):
            x = rng.randint(8, w - 26)
            y = rng.randint(h - 40, h - 28)
            pw, ph = rng.randint(9, 15), rng.randint(7, 10)
            d.rectangle([x, y, x + pw, y + ph], fill=(206, 196, 164, 255), outline=(96, 86, 66, 255))
            for ly in range(y + 2, y + ph - 1, 2):
                d.line([(x + 2, ly), (x + pw - 2, ly)], fill=(120, 110, 90, 255))
            if rng.random() < 0.4:
                d.rectangle([x + pw - 4, y + ph - 3, x + pw - 2, y + ph - 1], fill=(146, 44, 36, 255))
        ix = rng.randint(12, w - 14)
        d.rectangle([ix, h - 40, ix + 4, h - 35], fill=(30, 28, 34, 255), outline=(14, 12, 14, 255))
    return outline(img)


def hearth(rng: random.Random) -> Image.Image:
    """A forja: chaminé de tijolo, a brasa acesa na boca e a bigorna pesada do lado."""
    w, h = 96, 122
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    brick = masonry(w - 8, h - 10, rng, (108, 72, 58), 7)
    img.paste(brick, (4, 10))
    d = ImageDraw.Draw(img)
    d.rectangle([4, 10, w - 5, h - 1], outline=(26, 20, 20, 255))
    mx, my = 16, h - 42
    d.rectangle([mx, my, w - 17, h - 12], fill=(20, 14, 14, 255), outline=(40, 26, 22, 255))
    for _ in range(90):
        x = rng.randint(mx + 2, w - 19)
        y = rng.randint(h - 26, h - 14)
        d.point((x, y), fill=rng.choice([(236, 142, 46), (250, 196, 86), (192, 76, 30), (120, 44, 24)]) + (255,))
    d.rectangle([12, h - 12, w - 13, h - 3], fill=(92, 88, 82, 255), outline=(30, 26, 26, 255))
    return outline(img)


def anvil(rng: random.Random) -> Image.Image:
    img = Image.new("RGBA", (48, 56), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = (60, 60, 66)
    d.rectangle([17, 30, 31, 53], fill=(82, 60, 42, 255), outline=(28, 22, 20, 255))
    d.polygon([(4, 18), (42, 18), (42, 28), (33, 34), (15, 34), (12, 26)], fill=body + (255,), outline=(20, 20, 24, 255))
    d.line([(6, 19), (41, 19)], fill=(150, 150, 156, 255), width=2)
    return outline(img)


def paint_ymonha(canvas: Canvas) -> None:
    """A abertura: o rio largo, o Castelo da Volta na margem norte e, do outro lado, gente que vive das estações."""
    area, rng = canvas, canvas.rng
    a = canvas.area
    w, h = canvas.w, canvas.h

    # A estrada, torta, que chega por oeste e encosta no muro.
    road = a.organic({DIRT}, rng, soft=10)
    canvas.lay(road_texture(w, h, rng, "rio"), road, (40, 34, 24))

    # O sul é dos camponeses: uma encosta de vinha em terraços e faixas de lavoura, que não se pisa (não tem ponte).
    south_start = 18 * T + 18
    d = ImageDraw.Draw(canvas.img)
    # As faixas de lavoura, de cores do outono.
    strips = [(60, 46, 34), (78, 62, 40), (108, 92, 52), (56, 62, 36), (118, 100, 58), (72, 54, 38), (92, 86, 48)]
    x = -20
    i = 0
    while x < w:
        sw = rng.randint(84, 170)
        color = strips[i % len(strips)]
        tilt = rng.randint(-8, 8)
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.polygon([(x, south_start + 18), (x + sw, south_start + 14 + tilt), (x + sw - 14, 22 * T + 6), (x - 14, 22 * T + 6)], fill=color + (255,))
        for row in range(x - 16, x + sw, 7):
            ld.line([(row, south_start + 16), (row - 14, 22 * T + 6)], fill=lit(color, rng.uniform(-0.28, -0.1)) + (255,))
        grain = noise(w, h, 5, rng, 2).point(lambda v: 255 if v > 86 else 170)
        layer.putalpha(ImageChops.multiply(layer.getchannel("A"), grain))
        canvas.img.alpha_composite(layer)
        x += sw + rng.randint(4, 16)
        i += 1
    # Sebe de separação.
    d = ImageDraw.Draw(canvas.img)
    for x in range(0, w, 4):
        y = 22 * T + 8 + int(math.sin(x * 0.03) * 3)
        d.ellipse([x, y, x + rng.randint(5, 9), y + rng.randint(5, 9)], fill=rng.choice([(38, 50, 30), (46, 60, 34), (56, 70, 38)]) + (255,))
    # A vinha, em fileiras de estaca no talude de baixo.
    for row, y in enumerate(range(22 * T + 26, 25 * T - 4, 15)):
        d.line([(0, y + 8), (w, y + 8)], fill=(64, 54, 40, 255))
        x = (row % 2) * 8
        while x < w:
            d.line([(x, y - 3), (x, y + 8)], fill=(58, 44, 34, 255))
            for _ in range(5):
                vx, vy = x + rng.randint(-5, 5), y + rng.randint(-1, 7)
                d.point((vx, vy), fill=rng.choice([(86, 96, 44), (112, 100, 44), (136, 96, 42), (70, 84, 40)]) + (255,))
            x += 16

    # O calçamento do cais, com a borda de pedra.
    pave_mask = a.tile_mask({PAVE})
    canvas.lay(cobbles(w, h, rng, (112, 106, 94)), pave_mask, (24, 22, 20))

    # A margem de cascalho e lodo.
    bank = a.organic({SAND}, rng, soft=14)
    canvas.lay(mud_texture(w, h, rng, True), bank, (36, 32, 26))

    # O rio. A margem de baixo anda: não é uma régua.
    water = a.organic({DEEP, CHAIN}, rng, soft=16)
    canvas.open_water(water)

    # Junco, onde a margem não é cais.
    margin = ImageChops.subtract(water.filter(ImageFilter.MaxFilter(23)), water)
    keep = Image.new("L", (w, h), 255)
    ImageDraw.Draw(keep).rectangle([14 * T, 9 * T, 30 * T, 13 * T], fill=0)
    canvas.reeds(ImageChops.multiply(margin, keep), 330)

    # Enfeites do campo.
    grass = a.tile_mask({GRASS, FLOWERS})
    canvas.tufts(grass, 1100, [(92, 104, 56), (104, 112, 60), (74, 86, 46)])
    canvas.flowers(a.tile_mask({FLOWERS}), 90, [(214, 204, 150), (180, 88, 72), (172, 160, 200)])
    canvas.pebbles(road, 300)
    # A terra alta da margem norte, a plataforma do guincho, o outeiro e as lombas da lavoura.
    canvas.relief(wall=(110, 104, 94), slope=(42, 36, 26))

    # O cais de madeira, sobre a água.
    dock = a.tile_mask({WOOD})
    bbox = dock.getbbox()
    if bbox:
        floor = planks(w, h, rng, (98, 74, 50), True, 9)
        hard = dock
        rgba = floor.convert("RGBA")
        rgba.putalpha(hard)
        # Primeiro a sombra na água, depois as estacas, e a tábua por cima.
        shadow = ImageChops.offset(hard, 5, 9)
        tint = Image.new("RGBA", (w, h), (6, 10, 14, 150))
        tint.putalpha(shadow.point(lambda v: min(v, 130)))
        canvas.img.alpha_composite(tint)
        canvas.img.alpha_composite(rgba)
        d = ImageDraw.Draw(canvas.img)
        outline_mask = ImageChops.subtract(hard.filter(ImageFilter.MaxFilter(3)), hard)
        shade(canvas.img, outline_mask, (22, 18, 16), 0.9)
        for x in range(bbox[0] + 4, bbox[2], T):
            for y in range(bbox[1] + 4, bbox[3], T):
                if dock.getpixel((x, y)) and not dock.getpixel((x, min(y + T, h - 1))):
                    canvas.post(x + 6, y + T - 2, 16)
                    canvas.post(x + T - 12, y + T - 2, 16)

    # A corrente: a linha de elos de pilar a pilar, um pouco acima da água.
    chain_x = 30 * T + T // 2 - 6
    links = chain_link_row(5 * T + 40).rotate(90, expand=True)
    canvas.img.alpha_composite(links, dest=(chain_x, 12 * T - 20))
    for y in range(12 * T + 30, 17 * T, 34):
        d = ImageDraw.Draw(canvas.img)
        d.arc([chain_x - 7, y, chain_x + 21, y + 8], 0, 180, fill=(178, 186, 172, 140))

    # Os dois pilares da corrente.
    pillar = tower(rng, 1.0, 74, (98, 94, 88), None, cone=False)
    for row in (11, 17):
        canvas.shadow(30 * T + 30, (row + 1) * T - 2, 28, 8, 130)
        canvas.put(f"pilar{row}", pillar, 30 * T + 24, (row + 1) * T - 1)

    # A barca do mercador parada na corrente: é por ela que o jogo começa.
    barca = boat(rng, 162, 58, (78, 58, 40), load=True)
    canvas.water_shadow(24 * T, 14 * T + 30, 158, 10, 70)
    canvas.on_water(barca, 24 * T - 4, 13 * T + 8)

    paint_castle(canvas)

    # Mata à esquerda, à direita e no fundo.
    canvas.trees_from_grid(field_kit(rng))
    for y in range(a.h):
        for x in range(a.w):
            if a.sorted[y][x] == ROCK:
                stone = rock(rng, 42, 34)
                canvas.shadow(x * T + 28, (y + 1) * T - 3, 20, 7, 110)
                canvas.put(f"pedra{x}_{y}", stone, x * T + 24, (y + 1) * T - 2)
    # Um salgueiro em cada ponta, com a raiz na água.
    kit = willow_kit(rng)
    for tx, ty in ((7, 8), (37, 10), (9, 18), (22, 18), (34, 18)):
        name, image, _ = rng.choice(kit)
        canvas.shadow(tx * T + 28, (ty + 1) * T, 42, 9, 110)
        canvas.put(name, image, tx * T + 24, (ty + 1) * T - 2)
    # Dois casebres no outro lado, com a fumaça de quem não foi embora.
    for tx, ty, tw in ((6, 21, 3), (28, 21, 3)):
        hut = house_eaves(tw, 2.0, rng, wall_h=64, roof=(92, 76, 56))
        canvas.wall_shadow(tx * T, (ty + 1) * T - 10, (tx + tw) * T + 12, (ty + 1) * T + 10)
        canvas.put(f"casebre{tx}", hut, (tx + tw / 2) * T, (ty + 1) * T, smoke=[hut.width // 2 - 40, -hut.height + 8])


def paint_castle(canvas: Canvas) -> None:
    """O Castelo da Volta, como na ficha: pedra embaixo, madeira em cima, de costas pra estrada e aberto pro rio."""
    rng = canvas.rng
    x0, y0, x1, y1 = 14, 2, 25, 8
    gate = 20
    stone: Color = (104, 100, 90)
    # O pátio, de chão batido e pedra velha.
    yw, yh = (x1 - x0 + 1) * T, (y1 - y0 + 1) * T
    yard = road_texture(yw, yh, rng, "mata").convert("RGB")
    flags = cobbles(yw, yh, rng, (96, 92, 78), 14)
    path = Image.new("L", (yw, yh), 0)
    ImageDraw.Draw(path).rectangle([(gate - x0) * T - 8, 2 * T, (gate - x0 + 1) * T + 8, yh], fill=255)
    ImageDraw.Draw(path).rectangle([T + 8, 2 * T + 12, yw - T - 8, 3 * T + 12], fill=255)
    wear = threshold(noise(yw, yh, 24, rng, 3), 90)
    yard.paste(flags, (0, 0), ImageChops.multiply(path, wear))
    canvas.img.paste(yard, (x0 * T, y0 * T))
    # O telheiro de madeira encostado no muro do fundo, com a lenha empilhada.
    d = ImageDraw.Draw(canvas.img)
    shed = planks(5 * T, T - 8, rng, (92, 70, 46), True, 8)
    canvas.img.paste(shed, ((x0 + 2) * T, (y0 + 1) * T + 4))
    d.rectangle([(x0 + 2) * T, (y0 + 1) * T + 4, (x0 + 7) * T - 1, (y0 + 2) * T - 5], outline=(26, 20, 18, 255))
    for x in range((x0 + 8) * T, (x0 + 10) * T, 7):
        d.ellipse([x, (y0 + 1) * T + 16, x + 8, (y0 + 1) * T + 24], fill=(116, 86, 56, 255), outline=(40, 30, 22, 255))
        d.ellipse([x + 3, (y0 + 1) * T + 8, x + 11, (y0 + 1) * T + 16], fill=(124, 94, 62, 255), outline=(40, 30, 22, 255))

    wall_h = 112
    mustard: Color = (198, 158, 46)
    black: Color = (28, 26, 26)

    def wall(tiles: int, tall: int) -> Image.Image:
        """Um pano de muro: pedra na base e o caminho de ronda de madeira por cima, com as frestas."""
        w = tiles * T
        img = Image.new("RGBA", (w, tall), (0, 0, 0, 0))
        img.paste(masonry(w, tall, rng, stone, 10), (0, 0))
        band = 30
        wood = planks(w, band, rng, (78, 58, 40), True, 8)
        img.paste(wood, (0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle([0, band, w, band + 2], fill=(24, 20, 18, 255))
        d.rectangle([0, band + 3, w, band + 7], fill=(38, 34, 34, 255))
        for x in range(7, w - 8, 16):
            d.rectangle([x, 10, x + 3, 20], fill=(14, 12, 14, 255))
        # Um telhadinho de tábua cobrindo o caminho de ronda.
        for x in range(0, w, 8):
            d.line([(x, 0), (x, 5)], fill=(50, 38, 30, 255), width=2)
        d.line([(0, 6), (w, 6)], fill=(26, 20, 18, 255))
        for _ in range(w // 3):
            x, y = rng.randint(0, w - 1), rng.randint(tall - 26, tall - 1)
            d.point((x, y), fill=(74, 86, 50, 255))
        return img

    # O muro de trás, o de costas pra estrada: o mais alto.
    north_img = wall(x1 - x0 + 1, wall_h + 26)
    nd = ImageDraw.Draw(north_img)
    for bx in range(T, (x1 - x0 + 1) * T - T, 2 * T):
        nd.rectangle([bx, 44, bx + 14, wall_h + 25], fill=(92, 88, 80, 255), outline=(30, 28, 26, 255))
        nd.line([(bx + 1, 45), (bx + 1, wall_h + 24)], fill=(126, 120, 108, 255))
    north = outline(north_img)
    canvas.wall_shadow((x0 + 1) * T, (y0 + 1) * T - 2, x1 * T, (y0 + 1) * T + 20, 120)
    canvas.put("muro_norte", north, (x0 + (x1 - x0 + 1) / 2) * T, (y0 + 1) * T)

    # Os muros dos lados, de topo: uma faixa de pedra vista de cima, com o caminho de ronda.
    side_h = (y1 - y0 + 1) * T
    for x, name in ((x0, "muro_oeste"), (x1, "muro_leste")):
        side = Image.new("RGBA", (T, side_h), (0, 0, 0, 0))
        side.paste(planks(T, side_h, rng, (84, 62, 42), False, 8), (0, 0))
        sd = ImageDraw.Draw(side)
        sd.rectangle([0, 0, 7, side_h], fill=(92, 88, 80, 255))
        sd.rectangle([T - 8, 0, T - 1, side_h], fill=(72, 68, 62, 255))
        canvas.put(name, outline(side), (x + 0.5) * T, (y1 + 1) * T - T // 2)

    # O muro da frente, de cada lado do portão. Some quando há gente no pátio.
    tall = 86
    rect = {"x": x0 + 1, "y": y0 + 1, "w": x1 - x0 - 1, "h": y1 - y0 - 1}
    left = outline(wall(gate - x0, tall))
    canvas.wall_shadow(x0 * T, (y1 + 1) * T - 2, gate * T + 8, (y1 + 1) * T + 18, 100)
    canvas.put("muro_sul_a", left, (x0 + (gate - x0) / 2) * T, (y1 + 1) * T, fade=rect, fadeTo=0.28)
    right = outline(wall(x1 - gate, tall))
    canvas.wall_shadow((gate + 1) * T, (y1 + 1) * T - 2, (x1 + 1) * T + 8, (y1 + 1) * T + 18, 100)
    canvas.put("muro_sul_b", right, (gate + 1 + (x1 - gate) / 2) * T, (y1 + 1) * T, fade=rect, fadeTo=0.28)

    # O arco do portão, aberto pro rio, com o pano do Castelo da Volta de cada lado.
    arch = Image.new("RGBA", (T + 20, tall + 18), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arch)
    ad.rectangle([0, 0, 9, tall + 17], fill=(96, 92, 84, 255))
    ad.rectangle([T + 10, 0, T + 19, tall + 17], fill=(80, 76, 70, 255))
    ad.rectangle([0, 0, T + 19, 26], fill=(84, 62, 42, 255))
    ad.line([(0, 26), (T + 19, 26)], fill=(22, 18, 16, 255), width=2)
    for x in range(4, T + 16, 9):
        ad.line([(x, 2), (x, 24)], fill=(60, 44, 32, 255))
    canvas.frames["portao"] = outline(arch)
    canvas.put("portao", canvas.frames["portao"], (gate + 0.5) * T, (y1 + 1) * T, fade=rect, fadeTo=0.28)

    # O pano amarelo com a corrente preta (`docs/arte.md`).
    for bx in (gate - 1, gate + 2):
        cloth = Image.new("RGBA", (22, 40), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cloth)
        cd.polygon([(0, 0), (21, 0), (21, 31), (10, 39), (0, 31)], fill=mustard + (255,), outline=(38, 30, 18, 255))
        for y in range(4, 32, 6):
            cd.ellipse([8, y, 13, y + 6], outline=black + (255,))
        canvas.put(f"pano{bx}", outline(cloth), bx * T + 24, (y1 + 1) * T - 22, depth_y=(y1 + 1) * T + 1, fade=rect, fadeTo=0.28)

    # As torres dos cantos.
    for x, y, tall_px in ((x0, y0, 170), (x1, y0, 170)):
        t = tower(rng, 1.3, tall_px, stone, (70, 60, 56), timber_top=True, banner=None)
        canvas.put(f"torre{x}{y}", t, (x + 0.5) * T, (y + 1) * T)
    for x, y, tall_px in ((x0, y1, 124), (x1, y1, 124)):
        t = tower(rng, 1.3, tall_px, stone, (70, 60, 56), timber_top=True, banner=(mustard, black) if x == x0 else None)
        canvas.shadow((x + 0.5) * T + 8, (y + 1) * T - 2, 42, 8, 130)
        canvas.put(f"torre{x}{y}", t, (x + 0.5) * T, (y + 1) * T)


def split_block(rng: random.Random, x0: int, x1: int, y0: int, y1: int, canvas: Canvas, kinds: str = "gable") -> None:
    """Um quarteirão de casas fechadas: quadrados de `x0..x1` e `y0..y1` viram uma fila de empenas coladas."""
    x = x0
    while x <= x1:
        left = x1 - x + 1
        width = left if left <= 3 else rng.choice((2, 3))
        if left - width == 1:
            width += 1
        tiles_d = y1 - y0 + 1
        plaster = rng.choice(PLASTERS)
        roof = rng.choice(ROOFS)
        if width >= 2 and rng.random() < 0.85:
            image = house_gable(width, tiles_d, rng, plaster, roof, wall_h=rng.randint(78, 102))
        else:
            image = house_eaves(width, tiles_d, rng, plaster, roof, wall_h=rng.randint(70, 92))
        canvas.wall_shadow(x * T, (y1 + 1) * T - 2, (x + width) * T + 6, (y1 + 1) * T + 14, 110)
        canvas.put(f"casa{x}_{y0}", image, (x + width / 2) * T, (y1 + 1) * T)
        x += width


def fence(canvas: Canvas, x0: int, y0: int, x1: int, y1: int) -> None:
    """Cerca de vara, deitada no chão: não barra nada, é só o limite do quintal de alguém."""
    d = ImageDraw.Draw(canvas.img)
    color: Color = (84, 64, 44)
    steps = max(abs(x1 - x0), abs(y1 - y0)) // 11 + 1
    for i in range(steps + 1):
        x, y = x0 + (x1 - x0) * i // steps, y0 + (y1 - y0) * i // steps
        d.rectangle([x - 1, y - 11, x + 1, y], fill=color + (255,), outline=(30, 24, 20, 255))
    for off in (3, 7):
        d.line([(x0, y0 - off), (x1, y1 - off)], fill=lit(color, 0.14) + (255,))
        d.line([(x0, y0 - off + 1), (x1, y1 - off + 1)], fill=lit(color, -0.4) + (255,))


def garden(canvas: Canvas, x: int, y: int, w: int, h: int) -> None:
    """Uma horta de quem ainda não foi embora: canteiros de terra escura com a couve em fila."""
    rng = canvas.rng
    d = ImageDraw.Draw(canvas.img)
    for row in range(y, y + h, 14):
        d.rectangle([x, row, x + w, row + 9], fill=(50, 40, 30, 255))
        d.line([(x, row), (x + w, row)], fill=(78, 64, 46, 255))
        for px in range(x + 4, x + w - 3, 9):
            tone = rng.choice([(70, 92, 52), (88, 106, 58), (58, 78, 50)])
            d.ellipse([px - 3, row, px + 4, row + 6], fill=tone + (255,), outline=(36, 44, 30, 255))
    fence(canvas, x - 4, y - 2, x + w + 4, y - 2)
    fence(canvas, x - 4, y + h + 2, x + w + 4, y + h + 2)


def paint_yards(canvas: Canvas) -> None:
    """Os quintais de Ybytuguá, no que sobrou de chão entre as casas. Só o chão: nada aqui barra o passo."""
    garden(canvas, 3 * T, 10 * T + 6, 6 * T, 2 * T + 8)
    garden(canvas, 33 * T + 8, 9 * T + 8, 5 * T, 1 * T + 12)
    garden(canvas, 29 * T, 23 * T, 5 * T, 1 * T + 12)
    fence(canvas, 28 * T, 19 * T + 8, 31 * T - 8, 19 * T + 8)


def paint_ybytugua(canvas: Canvas) -> None:
    """A cidade livre: rua de terra e pedra, casas de enxaimel coladas, a Mesa, o cais parado com os barcos virados."""
    a, rng = canvas.area, canvas.rng
    w, h = canvas.w, canvas.h

    # A rua: pedra no miolo (é cidade de dinheiro) e terra na beira.
    street = a.organic({DIRT}, rng, soft=8)
    canvas.lay(road_texture(w, h, rng, "rio"), street, (40, 34, 24))
    # O calçamento de pedra no meio da rua, gasto: some e volta.
    core = a.tile_mask({DIRT}).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(5))
    wear = noise(w, h, 32, rng, 3)
    worn = threshold(ImageChops.multiply(core, wear.point(lambda v: min(255, v + 80))), 110)
    canvas.lay(cobbles(w, h, rng, (104, 96, 80), 7), worn)

    # Chão de todas as construções, por baixo.
    bank = a.organic({SAND}, rng, soft=12)
    canvas.lay(mud_texture(w, h, rng, False), bank, (30, 26, 20))
    # O barro do cais, pisoteado até longe da água.
    water = a.organic({DEEP}, rng, soft=10)
    canvas.open_water(water)

    # Cidade não tem gramado: da rua e das paredes pra fora é terreiro pisado, e o capim só sobrevive longe.
    built = a.tile_mask({WALL, COLUMN}, a.sorted)
    near = ImageChops.lighter(
        built.filter(ImageFilter.GaussianBlur(40)).point(lambda v: min(255, v * 4)),
        a.tile_mask({DIRT, SAND}).filter(ImageFilter.GaussianBlur(44)).point(lambda v: min(255, v * 3)),
    )
    yard = threshold(ImageChops.add(near.point(lambda v: int(v * 0.72)), noise(w, h, 30, rng, 3).point(lambda v: int(v * 0.28))), 108)
    keep = ImageChops.invert(ImageChops.lighter(street, a.tile_mask({SAND, WOOD, DEEP})))
    canvas.lay(road_texture(w, h, rng, "rio"), ImageChops.multiply(yard, keep))
    grass = a.tile_mask({GRASS, FLOWERS})
    canvas.tufts(ImageChops.multiply(grass, ImageChops.invert(yard)), 800, [(94, 100, 58), (108, 110, 64), (78, 86, 48)])
    canvas.tufts(ImageChops.multiply(grass, yard), 160, [(84, 92, 54), (96, 100, 58)])
    paint_yards(canvas)
    canvas.flowers(a.tile_mask({FLOWERS}), 60, [(214, 204, 150), (186, 96, 70)])
    canvas.pebbles(street, 500)
    margin = ImageChops.subtract(water.filter(ImageFilter.MaxFilter(17)), water)
    canvas.reeds(margin, 140)
    # Os três patamares: o cais, a cidade do meio e a cidade alta, com o muro de arrimo e as duas escadas.
    canvas.relief(wall=(118, 110, 96), slope=(46, 38, 28))

    # O cais de madeira.
    dock = a.tile_mask({WOOD})
    floor = planks(w, h, rng, (96, 72, 48), True, 9).convert("RGBA")
    shadow = ImageChops.offset(dock, 5, 9)
    tint = Image.new("RGBA", (w, h), (6, 10, 14, 150))
    tint.putalpha(shadow.point(lambda v: min(v, 130)))
    canvas.img.alpha_composite(tint)
    floor.putalpha(dock)
    canvas.img.alpha_composite(floor)
    shade(canvas.img, ImageChops.subtract(dock.filter(ImageFilter.MaxFilter(3)), dock), (22, 18, 16), 0.9)
    for x, y in ((6, 27), (7, 27), (8, 27), (5, 25), (9, 25)):
        canvas.post(x * T + 6, (y + 1) * T - 3, 18)

    # A barca de Oryndu, encostada, e as outras: o texto as quer "fora d'água, viradas de casco pra cima no barro".
    canvas.water_shadow(10 * T - 8, 28 * T - 2, 130, 10, 70)
    canvas.on_water(boat(rng, 132, 46, (76, 56, 40)), 9 * T + 8, 26 * T + 28)
    for bx, by in ((14, 25), (19, 25), (30, 25), (36, 25), (24, 25)):
        hull = boat(rng, rng.randint(90, 118), 36, rng.choice([(70, 52, 38), (84, 64, 44), (62, 50, 42)]), upturned=True)
        canvas.shadow(bx * T + hull.width / 2 + 4, by * T + 28, hull.width * 0.5, 7, 110)
        canvas.put(f"casco{bx}", hull, bx * T + hull.width / 2, by * T + 30)

    plank_floor = planks(w, h, rng, (108, 82, 56), False, 9)
    mesa_floor = planks(w, h, rng, (98, 72, 48), False, 12)
    packed = mud_texture(w, h, rng, True)

    def building(x0: int, y0: int, x1: int, y1: int, door: int, floor: Image.Image, frame: str, plaster: Color, roof: Color, sign: Color | None = None, stone: bool = False, wall_h: int = 96, smoke: bool = True) -> None:
        timber = TIMBERS[0]
        interior(canvas, x0, y0, x1, y1, floor, door, plaster, timber)
        image = house_eaves(x1 - x0 + 1, y1 - y0 + 1, rng, plaster, roof, door=(door - x0) * T + T // 2, wall_h=wall_h, sign=sign, stone=stone)
        canvas.wall_shadow(x0 * T, (y1 + 1) * T - 2, (x1 + 1) * T + 10, (y1 + 1) * T + 14, 110)
        entry = canvas.put(
            frame,
            image,
            (x0 + (x1 - x0 + 1) / 2) * T,
            (y1 + 1) * T,
            fade={"x": x0, "y": y0, "w": x1 - x0 + 1, "h": y1 - y0 + 1},
            fadeTo=0,
        )
        if smoke:
            entry["smoke"] = [-image.width // 2 + 22, -image.height + 8]

    # A Mesa dos Contratos: o prédio maior, com embasamento alto.
    building(16, 3, 27, 9, 21, mesa_floor, "mesa", (192, 178, 146), (88, 84, 90), stone=True, wall_h=112)
    mesa_front = canvas.frames["mesa"]
    porch = house_gable(4, 3, rng, (196, 182, 150), (88, 84, 90), wall_h=100)
    pw = porch.width
    # O oitão cobriria a porta: ela volta por cima dele.
    pd = ImageDraw.Draw(porch)
    pd.rectangle([pw // 2 - 14, porch.height - 40, pw // 2 + 13, porch.height - 2], fill=(26, 20, 16, 255))
    porch.paste(planks(24, 36, rng, (70, 48, 32), True, 6), (pw // 2 - 12, porch.height - 37))
    mesa_front.alpha_composite(porch, dest=((21 - 16) * T + T // 2 - pw // 2, mesa_front.height - porch.height))
    chimney_at(mesa_front, 60, 8)
    chimney_at(mesa_front, mesa_front.width - 80, 8)
    # O balcão da Mesa, encostado na parede do fundo.
    shelves(canvas, 18 * T, 3 * T + 6, 8 * T, rng)
    shelves(canvas, 23 * T + 6, 3 * T + 6, 3 * T, rng)
    for tx, frames in ((18, "balcao_a"), (23, "balcao_b")):
        image = table_long(rng, 3)
        canvas.put(frames, image, (tx + 1.5) * T, 5 * T)
    # O quadro de contratos, com os editais pregados, na parede do fundo.
    d = ImageDraw.Draw(canvas.img)
    d.rectangle([21 * T + 2, 3 * T + 5, 23 * T - 3, 4 * T - 8], fill=(64, 46, 32, 255), outline=(26, 20, 18, 255))
    for _ in range(9):
        px, py = rng.randint(21 * T + 7, 23 * T - 20), rng.randint(3 * T + 8, 4 * T - 22)
        d.rectangle([px, py, px + 12, py + 13], fill=(204, 194, 160, 255), outline=(98, 88, 68, 255))
        for ly in range(py + 3, py + 12, 2):
            d.line([(px + 2, ly), (px + 10, ly)], fill=(122, 112, 90, 255))
    # A rua de cima e a torre da Mesa.
    # A guilda dos barqueiros.
    building(2, 14, 10, 19, 6, plank_floor, "guilda", (176, 158, 124), (116, 72, 50), sign=(82, 104, 112))
    shelves(canvas, 3 * T + 8, 14 * T + 6, 7 * T, rng)
    d = ImageDraw.Draw(canvas.img)
    for rx in (3, 8):
        for ry in range(15, 18):
            d.arc([rx * T + 2, ry * T + 8, rx * T + 40, ry * T + 34], 0, 360, fill=(116, 96, 66, 255), width=2)
            d.arc([rx * T + 8, ry * T + 13, rx * T + 34, ry * T + 29], 0, 360, fill=(90, 74, 52, 255), width=2)
    # O armazém, de chão de taipa, como no texto.
    building(12, 14, 20, 19, 16, packed, "armazem", (154, 138, 110), (96, 62, 46), smoke=False, wall_h=86)
    shelves(canvas, 13 * T + 8, 14 * T + 6, 7 * T, rng)
    # A forja de Thrykar.
    building(31, 14, 39, 19, 35, packed, "forja", (146, 128, 104), (68, 66, 72), sign=(120, 66, 46))
    canvas.put("lareira", hearth(rng), 37 * T + 4, 16 * T - 2)
    canvas.put("bigorna", anvil(rng), 33 * T + 24, 16 * T - 4)

    # Os quarteirões fechados: empenas coladas, a cara da cidade.
    split_block(rng, 3, 9, 4, 8, canvas)
    split_block(rng, 28, 31, 4, 7, canvas)
    split_block(rng, 34, 38, 4, 8, canvas)
    split_block(rng, 25, 28, 15, 18, canvas)

    # A torre do cais, com o estandarte da cidade (sem brasão: o texto só diz que ele desce).
    tw = tower(rng, 1.8, 150, (112, 106, 96), (78, 70, 70), banner=((168, 158, 132), (92, 84, 72)))
    canvas.shadow(20 * T + 8, 25 * T - 4, 56, 10, 130)
    canvas.put("torre_cais", tw, 20 * T, 25 * T - 2)

    # O guindaste de roda, no fim do cais de pedra.
    crane = treadwheel_crane(rng)
    canvas.shadow(40 * T, 24 * T + 34, 46, 10, 130)
    canvas.put("guindaste", crane, 40 * T - 8, 24 * T + 38)

    # A cerca de árvores das pontas é a muralha que a cidade não tem.
    canvas.trees_from_grid(field_kit(rng), jitter=7)

    # Coisas da rua.
    stall = Image.new("RGBA", (T * 2, 76), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stall)
    sd.rectangle([6, 20, 8, 75], fill=(70, 52, 38, 255))
    sd.rectangle([T * 2 - 9, 20, T * 2 - 7, 75], fill=(70, 52, 38, 255))
    for i, x in enumerate(range(0, T * 2, 12)):
        sd.polygon([(x, 8), (x + 12, 8), (x + 12, 32), (x + 6, 37), (x, 32)], fill=((168, 140, 104) if i % 2 else (116, 74, 56)) + (255,))
    sd.line([(0, 8), (T * 2, 8)], fill=(40, 30, 24, 255), width=2)
    sd.rectangle([4, 50, T * 2 - 5, 62], fill=(102, 76, 50, 255), outline=(30, 24, 20, 255))
    for x in range(10, T * 2 - 12, 9):
        sd.ellipse([x, 42, x + 8, 51], fill=rng.choice([(190, 150, 90), (168, 130, 76), (206, 172, 112)]) + (255,), outline=(70, 50, 34, 255))
    canvas.put("banca", outline(stall), 25 * T, 23 * T - 2)


def paint_baixios(canvas: Canvas) -> None:
    """Lodo, junco, ilhota e água turva debaixo de uma bruma baixa. O casco afundado da barcaça de grãos, e nada mais."""
    a, rng = canvas.area, canvas.rng
    w, h = canvas.w, canvas.h

    road = a.organic({DIRT}, rng, soft=10)
    canvas.lay(road_texture(w, h, rng, "rio"), road, (36, 30, 22))
    tall = a.organic({SAND, WOOD}, rng, soft=20, rough=0.45)
    canvas.lay(mud_texture(w, h, rng, True), tall, (36, 32, 24))
    # A faixa de lodo escuro da beira.
    mud = a.organic({MUD, SAND}, rng, soft=22, rough=0.45)
    canvas.lay(mud_texture(w, h, rng, False), mud, (24, 22, 18))
    # A margem seca de oeste, alta: a cheia não sobe nela.
    canvas.relief(slope=(34, 30, 22))

    # A água: raso em quase tudo, e o canal fundo no canto.
    water = a.organic({SHALLOW, DEEP}, rng, soft=22, rough=0.45)
    canvas.open_water(water)
    # O raso é barrento: a camada de lama translúcida sobre a água.
    shallow = a.organic({SHALLOW}, rng, soft=26)
    deep = a.tile_mask({DEEP}).filter(ImageFilter.GaussianBlur(30))
    cloud = noise(w, h, 74, rng, 3).point(lambda v: int(70 + v * 0.34))
    # Bancos de lodo quase à tona: mais opacos onde a água é pouca.
    silt = ImageChops.subtract(ImageChops.multiply(shallow, cloud), deep)
    silted = Image.new("RGBA", (w, h), (86, 80, 56, 255))
    silted.putalpha(silt)
    canvas.img = Image.alpha_composite(canvas.img, silted)
    # O canal fundo barra o passo, e tem de parecer: escuro, sem fundo à vista, com a linha de espuma onde o raso cai.
    sharp = a.tile_mask({DEEP}).filter(ImageFilter.GaussianBlur(9))
    dark = Image.new("RGBA", (w, h), (10, 22, 28, 255))
    dark.putalpha(sharp.point(lambda v: int(v * 0.62)))
    canvas.img = Image.alpha_composite(canvas.img, dark)
    rim = ImageChops.subtract(a.tile_mask({DEEP}).filter(ImageFilter.MaxFilter(9)), a.tile_mask({DEEP}))
    rim = ImageChops.multiply(rim.filter(ImageFilter.GaussianBlur(3)), noise(w, h, 9, rng, 2).point(lambda v: 255 if v > 120 else 60))
    foam = Image.new("RGBA", (w, h), (176, 178, 160, 255))
    foam.putalpha(rim.point(lambda v: int(v * 0.5)))
    canvas.img = Image.alpha_composite(canvas.img, foam)

    # As ilhotas de areia ganham lodo em volta e junco alto em cima.
    canvas.tufts(a.tile_mask({GRASS, FLOWERS}), 700, [(96, 100, 56), (112, 110, 62), (76, 84, 46)])
    margin = ImageChops.subtract(mud.filter(ImageFilter.MaxFilter(47)), mud.filter(ImageFilter.MinFilter(9)))
    canvas.reeds(margin, 1500)
    islets = a.tile_mask({SAND})
    canvas.reeds(ImageChops.subtract(islets.filter(ImageFilter.MaxFilter(31)), islets.filter(ImageFilter.MinFilter(21))), 800)
    canvas.pebbles(tall, 500)
    # Junco solto no raso: o caranguejo sobe nele.
    tufts_in_water = threshold(noise(w, h, 60, rng, 3), 168)
    canvas.reeds(ImageChops.multiply(tufts_in_water, a.tile_mask({SHALLOW})), 2400)

    # O rastro das tábuas que a cheia trouxe.
    d = ImageDraw.Draw(canvas.img)
    for _ in range(18):
        x, y = rng.randint(14 * T, w - 40), rng.randint(40, h - 20)
        l = rng.randint(14, 34)
        d.line([(x, y), (x + l, y + rng.randint(-2, 2))], fill=(70, 54, 40, 255), width=2)

    # O casco da barcaça de grãos, onde o mapa manda (`Casco afundado`).
    wreck = boat(rng, 186, 74, (62, 50, 40), upturned=True)
    wd = ImageDraw.Draw(wreck)
    # A quilha pro céu, o rombo por onde a água entrou e o limo que já subiu.
    wd.line([(18, 12), (168, 9)], fill=(40, 32, 28, 255), width=4)
    wd.polygon([(96, 30), (122, 26), (130, 44), (108, 54), (92, 44)], fill=(16, 16, 18, 255))
    for x in range(98, 126, 7):
        wd.line([(x, 30), (x + 3, 50)], fill=(70, 56, 44, 255), width=2)
    for _ in range(170):
        wd.point((rng.randint(12, 172), rng.randint(46, 70)), fill=rng.choice([(74, 86, 52), (60, 72, 46), (172, 164, 140)]) + (255,))
    canvas.on_water(wreck, 24 * T + 14, 20 * T + 8)

    # O barco de Oryndu: tirado da água, como os velhos fazem. Afunda na luta final, e aí não está mais lá.
    hullboat = boat(rng, 136, 46, (78, 58, 40))
    canvas.shadow(10 * T + 18, 13 * T + 40, 74, 8, 110)
    canvas.put("barco_oryndu", hullboat, 10 * T + 18, 13 * T + 42, unless="ykurua_morto")

    # O rochedo da margem, com a cinza de giz e a pedra queimada.
    big = rock(rng, 74, 58, (104, 100, 94))
    bd = ImageDraw.Draw(big)
    for _ in range(46):
        bd.point((rng.randint(14, 58), rng.randint(16, 44)), fill=rng.choice([(190, 188, 176), (48, 44, 44), (30, 28, 30)]) + (255,))
    canvas.shadow(12 * T + 28, 9 * T + 38, 38, 9, 130)
    canvas.put("rochedo", big, 12 * T + 24, 9 * T + 38)

    # Mata só na margem de cá: salgueiro e amieiro, que gostam de pé molhado.
    canvas.trees_from_grid(willow_kit(rng) + field_kit(rng)[:3], jitter=14)
    # Pedra no raso.
    for y in range(a.h):
        for x in range(a.w):
            if a.sorted[y][x] == ROCK:
                stone = rock(rng, rng.randint(40, 60), rng.randint(28, 40), (92, 90, 84))
                canvas.put(f"pedra{x}_{y}", stone, x * T + 24, (y + 1) * T - 2)


def paint_floresta(canvas: Canvas) -> None:
    """A mata entre as bacias: faia e abeto, chão de folha, a estrada estreita, o vau e a ponte de pedra do afluente."""
    a, rng = canvas.area, canvas.rng
    w, h = canvas.w, canvas.h

    # O chão da clareira vai de capim a folha seca conforme a sombra chega.
    litter = ramp(Image.blend(noise(w, h, 22, rng, 3), noise(w, h, 3, rng, 2), 0.5), [(50, 42, 30), (62, 50, 34), (76, 58, 38), (90, 68, 42), (104, 82, 48)]).convert("RGBA")
    near_trees = a.tile_mask({TREE}, a.sorted).filter(ImageFilter.GaussianBlur(44))
    mask = threshold(ImageChops.add(near_trees, noise(w, h, 26, rng, 3).point(lambda v: int(v * 0.42))), 136)
    canvas.lay(litter, mask)

    road = a.organic({DIRT}, rng, soft=9)
    canvas.lay(road_texture(w, h, rng, "mata"), road, (28, 24, 18))
    canvas.pebbles(road, 340)

    # O barranco alto de Jurendy, a colina da clareira e o morro do sul (o relevo do mapa).
    canvas.relief(wall=(100, 92, 78), slope=(40, 34, 26))
    canvas.tufts(a.where(lambda x, y: a.elevation[y][x] > 0), 300, [(104, 110, 62), (122, 122, 70), (84, 94, 52)], 8)

    # A areia da margem do Ymonhã.
    bank = a.organic({SAND}, rng, soft=10)
    canvas.lay(mud_texture(w, h, rng, True), bank, (30, 26, 20))
    # A pedra de encontro da margem, de calçamento velho.
    canvas.lay(cobbles(w, h, rng, (98, 94, 82), 10), a.organic({PAVE}, rng, soft=6), (22, 20, 18))

    # O vau: água pela canela no meio da estrada. Mais clara, pisada de carroça.
    water = a.organic({DEEP, SHALLOW, CHAIN}, rng, soft=8)
    canvas.open_water(water)
    ford = a.organic({SHALLOW}, rng, soft=12)
    cloud = noise(w, h, 18, rng, 2).point(lambda v: int(70 + v * 0.45))
    silt = Image.new("RGBA", (w, h), (104, 92, 66, 255))
    silt.putalpha(ImageChops.multiply(ford, cloud))
    canvas.img = Image.alpha_composite(canvas.img, silt)
    stones_in_ford = ImageChops.multiply(ford, threshold(noise(w, h, 12, rng, 2), 128))
    canvas.pebbles(stones_in_ford, 500)

    # A ponte de pedra do afluente: dois quadrados de largura, no vão que o mapa deixa.
    bx0, bx1 = 9 * T, 11 * T
    by0, by1 = 7 * T - 8, 8 * T + 6
    span = cobbles(bx1 - bx0, by1 - by0, rng, (118, 112, 98), 8).convert("RGBA")
    canvas.water_shadow(bx0, by1 - 4, bx1 - bx0, 8, 110)
    canvas.img.alpha_composite(span, dest=(bx0, by0))
    d = ImageDraw.Draw(canvas.img)
    for x in (bx0, bx1 - 7):
        d.rectangle([x, by0 - 2, x + 6, by1 + 2], fill=(132, 126, 110, 255), outline=(30, 28, 26, 255))
        for y in range(by0 + 2, by1, 9):
            d.line([(x + 1, y), (x + 5, y)], fill=(88, 84, 74, 255))
    # O arco, visto de baixo.
    arch = Image.new("RGBA", (bx1 - bx0, 14), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arch)
    ad.rectangle([0, 0, bx1 - bx0, 13], fill=(92, 88, 78, 255))
    ad.ellipse([12, 2, bx1 - bx0 - 13, 28], fill=(20, 22, 26, 255))
    ad.line([(0, 0), (bx1 - bx0, 0)], fill=(136, 130, 112, 255))
    canvas.img.alpha_composite(arch, dest=(bx0, by1))

    # A samambaia e o fungo da sombra.
    canvas.tufts(a.tile_mask({GRASS, FLOWERS}), 900, [(62, 80, 44), (74, 92, 50), (52, 68, 38)], 9)
    canvas.tufts(a.tile_mask({TALL}), 230, [(86, 104, 58), (104, 116, 66), (72, 92, 50)], 14)
    margin = ImageChops.subtract(water.filter(ImageFilter.MaxFilter(15)), water)
    canvas.reeds(margin, 180)
    canvas.flowers(a.tile_mask({GRASS}), 60, [(190, 180, 130), (170, 160, 196)])

    # As árvores: a mata é a maior parte do mapa, e fechada.
    canvas.trees_from_grid(forest_kit(rng, dark=True), jitter=13)

    # O marco de pedra da encruzilhada, com as letras e o selo novo.
    marco = Image.new("RGBA", (34, 60), (0, 0, 0, 0))
    md = ImageDraw.Draw(marco)
    md.polygon([(4, 59), (6, 10), (17, 2), (28, 10), (30, 59)], fill=(112, 108, 96, 255))
    md.line([(6, 10), (6, 59)], fill=(146, 142, 126, 255))
    md.line([(29, 12), (29, 58)], fill=(70, 66, 60, 255), width=2)
    for y in range(16, 42, 5):
        md.line([(10, y), (24, y)], fill=(54, 50, 46, 255))
    md.ellipse([12, 44, 22, 54], fill=(42, 66, 118, 255), outline=(22, 26, 34, 255))
    canvas.shadow(23 * T + 28, 11 * T + 42, 18, 6, 120)
    canvas.put("marco", outline(marco), 23 * T + 24, 11 * T + 44)

    # A tabuleta caída de fronteira.
    board = Image.new("RGBA", (44, 26), (0, 0, 0, 0))
    bd = ImageDraw.Draw(board)
    bd.polygon([(3, 8), (40, 3), (42, 15), (5, 21)], fill=(92, 72, 50, 255), outline=(30, 24, 20, 255))
    for i in range(10, 36, 4):
        bd.line([(i, 7 + (40 - i) // 8), (i + 2, 13 + (40 - i) // 8)], fill=(36, 30, 26, 255))
    canvas.put("tabuleta", outline(board), 18 * T + 24, 13 * T + 38, depth_y=13 * T + 2)

    # A pedra do mapa, no pé da árvore.
    for y in range(a.h):
        for x in range(a.w):
            if a.sorted[y][x] == ROCK and (x, y) != (23, 11):
                canvas.put(f"pedra{x}_{y}", rock(rng, 44, 36), x * T + 24, (y + 1) * T - 2)


PAINTERS = {
    "ymonha": (paint_ymonha, "rio", [34, 0]),
    "ybytugua": (paint_ybytugua, "cidade", [34, 0]),
    "baixios": (paint_baixios, "lodo", [8, 3]),
    "floresta": (paint_floresta, "mata", [34, 0]),
}


def pack(frames: dict[str, Image.Image]) -> tuple[Image.Image, dict]:
    """Empacota as peças num atlas: em prateleiras, do maior pro menor, com 2 pixels de folga."""
    items = sorted(frames.items(), key=lambda kv: -kv[1].height)
    width = 2048
    x = y = shelf = 0
    placed: dict[str, dict] = {}
    for name, image in items:
        if x + image.width + 2 > width:
            x = 0
            y += shelf + 2
            shelf = 0
        placed[name] = {"x": x, "y": y, "w": image.width, "h": image.height}
        x += image.width + 2
        shelf = max(shelf, image.height)
    atlas = Image.new("RGBA", (width, y + shelf + 2), (0, 0, 0, 0))
    for name, image in items:
        at = placed[name]
        atlas.alpha_composite(image.convert("RGBA"), dest=(at["x"], at["y"]))
    return atlas, placed


def save_png(img: Image.Image, path: Path) -> None:
    """Cinco bits por cor: a imagem fica leve sem a paleta inventar matiz (a de 256 cores punha verde nas tábuas)."""
    r, g, b, a = img.convert("RGBA").split()
    five = [v & 0xF8 for v in range(256)]
    Image.merge("RGBA", (r.point(five), g.point(five), b.point(five), a.point(lambda v: 255 if v > 247 else v & 0xF0))).save(path, optimize=True)


def paint_area(area_id: str, preview: Path | None) -> None:
    painter, grass, flow = PAINTERS[area_id]
    # A semente depende só do nome: uma área não muda quando outra muda.
    rng = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(area_id)) * 7919)
    area = Area(area_id)
    canvas = Canvas(area, rng, grass)
    painter(canvas)

    save_png(canvas.img, OUT / f"{area_id}.ground.png")
    atlas, frames = pack(canvas.frames)
    save_png(atlas, OUT / f"{area_id}.atlas.png")
    stand = sorted(canvas.stand, key=lambda s: s.get("depth", s["y"]))
    (OUT / f"{area_id}.json").write_text(
        json.dumps({"scale": LOGIC_T / T, "flow": flow, "mist": area_id == "baixios", "frames": frames, "stand": stand}, ensure_ascii=False),
        encoding="utf8",
    )
    print(f"{area_id}: {len(stand)} peças, {len(frames)} quadros, atlas {atlas.width}x{atlas.height}")
    if preview:
        compose_preview(canvas, stand, preview / f"{area_id}.png")


def compose_preview(canvas: Canvas, stand: list[dict], path: Path) -> None:
    water = Image.open(OUT / "agua.png").convert("RGBA")
    out = Image.new("RGBA", (canvas.w, canvas.h), (0, 0, 0, 255))
    for y in range(0, canvas.h, water.height):
        for x in range(0, canvas.w, water.width):
            out.paste(water, (x, y))
    out.alpha_composite(canvas.img)
    for entry in stand:
        image = canvas.frames[entry["frame"]].convert("RGBA")
        x = int(entry["x"] / LOGIC_T * T - image.width / 2)
        y = int(entry["y"] / LOGIC_T * T - image.height)
        sx, sy = max(0, -x), max(0, -y)
        if sx < image.width and sy < image.height and x < out.width and y < out.height:
            out.alpha_composite(image, dest=(max(0, x), max(0, y)), source=(sx, sy))
    out.convert("RGB").save(path)


def paint_props() -> None:
    rng = random.Random(77)
    frames = {
        kind: wooden_prop(kind, rng)
        for kind in ("crate", "barrel", "winch", "bell", "circle", "walkway", "chest", "chest_open", "door", "door_open", "lever", "lever_on", "trap", "sack")
    }
    atlas, placed = pack(frames)
    atlas.save(OUT / "props.png", optimize=True)
    (OUT / "props.json").write_text(json.dumps({"scale": LOGIC_T / T, "frames": placed}), encoding="utf8")


def main() -> None:
    args = sys.argv[1:]
    preview: Path | None = None
    if "--previa" in args:
        at = args.index("--previa")
        preview = Path(args[at + 1])
        del args[at : at + 2]
    OUT.mkdir(parents=True, exist_ok=True)
    paint_water()
    paint_props()
    for area_id in args or PAINTERS:
        paint_area(area_id, preview)


if __name__ == "__main__":
    main()
