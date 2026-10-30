"""
A arte gerada do jogo: lê art/manifest.json, pede as imagens a quem gera e as
converte pro que o jogo usa. Ver docs/arte.md.

    python art/gerar_arte.py list                  o que existe e o que falta
    python art/gerar_arte.py gen endyru jarupa     gera (retrato, folha, splash) de quem for pedido
    python art/gerar_arte.py gen --all             gera tudo que ainda não tem arquivo
    python art/gerar_arte.py gen titulo --force    gera de novo, por cima
    python art/gerar_arte.py gen endyru --only sheet
    python art/gerar_arte.py process --all         refaz a conversão a partir do bruto, sem chamar a API
    python art/gerar_arte.py register              reescreve client/src/game/generatedArt.ts

Quem gera (`--via`):
  - agy     (o padrão) o Antigravity CLI, pelo subagente image-generator dele (Imagen),
            na assinatura do autor. Roda numa pasta temporária fora do projeto, uma
            imagem por vez. O Imagen não faz fundo transparente: pede-se fundo verde
            puro, e o script o recorta.
  - openai  a API de imagens da OpenAI. Precisa de OPENAI_API_KEY (e, se quiser
            outro modelo, OPENAI_IMAGE_MODEL; o padrão é gpt-image-1).
Só usa a biblioteca padrão e o Pillow.

O bruto (a imagem como veio, 1024 ou 1536 px) fica em art/raw/, fora do git: é
de onde `process` refaz a conversão. A conversão vai pra client/public/:
  - retrato  -> sprites/portraits/<id>.png   640x800, pintado, fundo transparente
  - folha    -> sprites/<id>.png             4x4 quadros de 48x48 (pixel art), a criatura 96x96
  - splash   -> art/<id>.jpg                 1280x720
  - mapa     -> art/<id>.jpg                 1536x1024
A folha é gerada a partir do retrato (a API recebe o retrato como referência),
pra o boneco ter a mesma cara; gere o retrato antes.
"""

import base64
import io
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "art" / "manifest.json"
RAW = ROOT / "art" / "raw"
PUBLIC = ROOT / "client" / "public"
REGISTRY = ROOT / "client" / "src" / "game" / "generatedArt.ts"

API = "https://api.openai.com/v1/images"
MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")

# A pasta de trabalho do Antigravity: fora do projeto, pra ele não ter o repositório ao alcance.
AGY_STAGE = Path(tempfile.gettempdir()) / "jogo-arte"
AGY_TIMEOUT = "15m"
# A proporção que se pede ao Imagen, por tipo (ele não aceita tamanho em pixels).
AGY_ASPECT = {
    "portrait": "3:4 (portrait)",
    "sheet": "1:1 (square)",
    "beast": "1:1 (square)",
    "beast_dry": "1:1 (square)",
    "splash": "16:9 (landscape)",
    "scene": "16:9 (landscape)",
    "map": "4:3 (landscape)",
}
GREEN_SCREEN = (
    "BACKGROUND: a solid, flat, pure green (#00FF00) everywhere behind the figure(s), with no gradient, no floor, "
    "no shadow and no green anywhere on the figure, so it can be keyed out. This overrides any mention of a "
    "transparent background."
)

# A densidade da arte do mapa (ver ART_PX_PER_TILE em client/src/game/mapSprites.ts).
TILE = 48
BEAST_TILES = 2
PORTRAIT_SIZE = (640, 800)
SPLASH_SIZE = (1280, 720)
SHEET_COLORS = 32


# ------------------------------------------------------------------ manifesto

def load_manifest():
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def jobs(manifest):
    """Cada imagem que o manifesto pede, como (id da imagem, tipo, de quem)."""
    out = []
    for who in manifest["characters"]:
        if who.get("portrait"):
            out.append((f"{who['id']}.portrait", "portrait", who))
        if who.get("sheet"):
            out.append((f"{who['id']}.sheet", "sheet", who))
        if who.get("splash"):
            out.append((f"{who['id']}.splash", "splash", who))
    for beast in manifest["beasts"]:
        out.append((f"{beast['id']}.sheet", "beast", beast))
        if beast.get("dry"):
            out.append((f"{beast['id']}.seco", "beast_dry", beast))
    for splash in manifest["splashes"]:
        out.append((f"{splash['id']}.splash", "scene", splash))
    for world in manifest["maps"]:
        out.append((f"{world['id']}.map", "map", world))
    return out


def output_path(job_id, kind):
    who, part = job_id.split(".")
    if kind == "portrait":
        return PUBLIC / "sprites" / "portraits" / f"{who}.png"
    if kind == "sheet":
        return PUBLIC / "sprites" / f"{who}.png"
    if kind == "beast":
        return PUBLIC / "sprites" / f"{who}.png"
    if kind == "beast_dry":
        return PUBLIC / "sprites" / f"{who}-seco.png"
    if kind in ("splash", "scene"):
        return PUBLIC / "art" / f"{who}.jpg"
    return PUBLIC / "art" / f"{who}.jpg"


def raw_path(job_id):
    return RAW / f"{job_id}.png"


def prompt_for(manifest, kind, who):
    style = manifest["style"]
    world = style["world"]
    if kind == "portrait":
        return f"{style['portrait']}\n\n{world}\n\nThe character: {who['look']}"
    if kind == "sheet":
        return (
            f"{style['sheet']}\n\n{world}\n\nThe character, exactly as in the reference portrait: {who['look']}"
        )
    if kind == "splash":
        return f"{style['splash']}\n\n{world}\n\n{who['splash']}\n\nThe character: {who['look']}"
    if kind == "beast":
        return f"{style['beast']}\n\n{who['look']}"
    if kind == "beast_dry":
        return f"{style['beast']}\n\n{who['look']}\n\n{who['dry']}"
    if kind == "scene":
        return f"{style['splash']}\n\n{world}\n\n{who['prompt']}"
    return who["prompt"]


def blocked(who):
    """Por que essa imagem não pode ser gerada ainda (ou None)."""
    if who.get("needsSheet"):
        return "a aparência espera a ficha (needsSheet)"
    return None


# ------------------------------------------------------------------------ API

def api_key():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("Falta OPENAI_API_KEY no ambiente.")
    return key


def request(url, body, content_type):
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {api_key()}")
    req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=600) as response:
            data = json.loads(response.read())
    except urllib.error.HTTPError as error:
        sys.exit(f"A API recusou ({error.code}): {error.read().decode('utf-8', 'replace')}")
    return base64.b64decode(data["data"][0]["b64_json"])


def generate(prompt, size, transparent):
    body = {"model": MODEL, "prompt": prompt, "size": size, "quality": "high", "n": 1}
    if transparent:
        body["background"] = "transparent"
        body["output_format"] = "png"
    return request(f"{API}/generations", json.dumps(body).encode("utf-8"), "application/json")


def edit(prompt, size, transparent, reference):
    """Gera a partir de uma imagem de referência (a folha a partir do retrato)."""
    boundary = uuid.uuid4().hex
    parts = []

    def field(name, value):
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode("utf-8"))

    field("model", MODEL)
    field("prompt", prompt)
    field("size", size)
    field("quality", "high")
    if transparent:
        field("background", "transparent")
        field("output_format", "png")
    mime = mimetypes.guess_type(reference.name)[0] or "image/png"
    parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"{reference.name}\"\r\n"
        f"Content-Type: {mime}\r\n\r\n".encode("utf-8")
        + reference.read_bytes()
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    return request(f"{API}/edits", b"".join(parts), f"multipart/form-data; boundary={boundary}")


# ---------------------------------------------------------------- Antigravity

def agy_binary():
    found = shutil.which("agy")
    if found:
        return found
    local = Path(os.environ.get("LOCALAPPDATA", "")) / "agy" / "bin" / "agy.exe"
    if local.exists():
        return str(local)
    sys.exit("Não achei o agy (Antigravity CLI) no PATH.")


def generate_agy(job_id, kind, prompt, transparent, reference):
    """
    Pede a imagem ao subagente image-generator do Antigravity, numa pasta só
    dela fora do projeto (com a referência copiada pra lá, se houver), e devolve
    os bytes do PNG. O fundo verde, quem tira é key_green.
    """
    stage = AGY_STAGE / job_id
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    out_name = "imagem.png"
    lines = [
        f"Use your image-generator subagent to create exactly ONE image and save it in the current folder as {out_name}.",
        "Do not create, edit or delete anything else, and do not touch any other folder.",
        f"Aspect ratio: {AGY_ASPECT[kind]}, at the highest resolution available.",
    ]
    if reference is not None:
        shutil.copy(reference, stage / "referencia.png")
        lines.append(
            "Use referencia.png in the current folder as the reference image: the same character, same face, "
            "same outfit and colors, redrawn as described below."
        )
    lines += ["", prompt]
    if transparent:
        lines += ["", GREEN_SCREEN]
    lines += ["", f"When done, reply only with the file name and its pixel size."]
    (stage / "pedido.txt").write_text("\n".join(lines), encoding="utf-8")

    result = subprocess.run(
        [agy_binary(), "-p", "\n".join(lines), "--mode", "accept-edits", "--sandbox", "--output-format", "json",
         "--print-timeout", AGY_TIMEOUT],
        cwd=stage, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    try:
        reply = json.loads(result.stdout[result.stdout.index("{"):])
    except ValueError:
        sys.exit(f"O agy não respondeu JSON:\n{result.stdout[-2000:]}\n{result.stderr[-2000:]}")
    image = stage / out_name
    if reply.get("status") != "SUCCESS" or not image.exists():
        sys.exit(f"O agy não gerou {job_id} ({reply.get('status')}): {str(reply.get('response'))[:1500]}")
    return image.read_bytes()


def key_green(image):
    """Tira o fundo verde puro (o do Imagen, que não faz transparência) e o verde que vazou nas bordas."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if g > 120 and g > r * 1.35 and g > b * 1.35:
                pixels[x, y] = (0, 0, 0, 0)
            elif g > max(r, b):
                # A franja: o verde do fundo refletido na borda volta à cor do resto.
                pixels[x, y] = (r, max(r, b), b, a)
    return rgba


# ------------------------------------------------------------------ conversão

def fit_cover(image, size):
    """Corta e escala pra cobrir `size` inteiro, pelo meio."""
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def alpha_box(image, threshold=40):
    return image.getchannel("A").point(lambda a: 255 if a > threshold else 0).getbbox()


def to_portrait(raw):
    """O busto pintado, encostado na borda de baixo, em 640x800 com fundo transparente."""
    image = raw.convert("RGBA")
    box = alpha_box(image)
    if box:
        image = image.crop((box[0], box[1], box[2], image.height))
    width, height = PORTRAIT_SIZE
    scale = min(width / image.width, height / image.height)
    bust = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", PORTRAIT_SIZE, (0, 0, 0, 0))
    canvas.paste(bust, ((width - bust.width) // 2, height - bust.height), bust)
    return canvas


def pixelize(sheet):
    """Pixel art de verdade: paleta curta e transparência de tudo ou nada."""
    alpha = sheet.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    rgb = Image.new("RGB", sheet.size, (0, 0, 0))
    rgb.paste(sheet.convert("RGB"), mask=alpha)
    quantized = rgb.quantize(colors=SHEET_COLORS, method=Image.Quantize.MEDIANCUT).convert("RGB")
    out = quantized.convert("RGBA")
    out.putalpha(alpha)
    return out


def to_sheet(raw, cell):
    """
    A grade 4x4 que veio da API vira a folha do jogo: cada quadro recortado pelo
    que tem de corpo, todos na MESMA escala (a do maior), com o pé no meio da base
    do quadro de `cell` pixels. A linha da direita é a da esquerda espelhada: a
    API erra o lado mais do que acerta, e o espelho nunca erra.
    """
    image = raw.convert("RGBA")
    width, height = image.width // 4, image.height // 4
    figures = {}
    for row in range(4):
        for col in range(4):
            frame = image.crop((col * width, row * height, (col + 1) * width, (row + 1) * height))
            box = alpha_box(frame)
            figures[(row, col)] = frame.crop(box) if box else None
    present = [figure for figure in figures.values() if figure is not None]
    if not present:
        sys.exit("A folha veio vazia.")
    tallest = max(figure.height for figure in present)
    widest = max(figure.width for figure in present)
    scale = min((cell - 2) / tallest, (cell - 2) / widest)

    sheet = Image.new("RGBA", (cell * 4, cell * 4), (0, 0, 0, 0))
    for (row, col), figure in figures.items():
        if row == 2:
            figure = figures[(1, col)]
            figure = figure.transpose(Image.FLIP_LEFT_RIGHT) if figure else None
        if figure is None:
            continue
        small = figure.resize((max(1, round(figure.width * scale)), max(1, round(figure.height * scale))), Image.LANCZOS)
        x = col * cell + (cell - small.width) // 2
        y = row * cell + cell - small.height - 1
        sheet.paste(small, (x, y), small)
    return pixelize(sheet)


def convert(kind, raw):
    if kind == "portrait":
        return to_portrait(raw)
    if kind == "sheet":
        return to_sheet(raw, TILE)
    if kind in ("beast", "beast_dry"):
        return to_sheet(raw, TILE * BEAST_TILES)
    if kind in ("splash", "scene"):
        return fit_cover(raw.convert("RGB"), SPLASH_SIZE)
    return raw.convert("RGB")


def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".jpg":
        image.convert("RGB").save(path, quality=88, optimize=True)
    else:
        image.save(path, optimize=True)


# ------------------------------------------------------------------- registro

def ts(value):
    return json.dumps(value, ensure_ascii=False)


def register(manifest):
    """Escreve generatedArt.ts com o que existe em client/public: é por ele que o jogo carrega a arte."""
    sheets, portraits, splashes = [], [], []
    for who in manifest["characters"]:
        if who.get("portrait") and output_path(f"{who['id']}.portrait", "portrait").exists():
            url = "sprites/portraits/" + who["id"] + ".png"
            portraits.append(f"  {ts(who['name'])}: {{ url: {ts(url)}, smooth: true }},")
        if who.get("sheet") and output_path(f"{who['id']}.sheet", "sheet").exists():
            url = f"sprites/{who['id']}.png"
            names = {who.get("sheetName", who["name"])}
            if who.get("creature"):
                sheets.append(f"  {ts('creature:' + who['creature'])}: {{ url: {ts(url)}, frameWidth: {TILE}, frameHeight: {TILE} }},")
            for name in sorted(names):
                sheets.append(f"  {ts('person:' + name)}: {{ url: {ts(url)}, frameWidth: {TILE}, frameHeight: {TILE} }},")
        if who.get("splash") and output_path(f"{who['id']}.splash", "splash").exists():
            splashes.append(f"  {ts(who['id'])}: {ts('art/' + who['id'] + '.jpg')},")
    for beast in manifest["beasts"]:
        size = TILE * BEAST_TILES
        for suffix, kind, file in (("", "beast", f"{beast['id']}.png"), (":seco", "beast_dry", f"{beast['id']}-seco.png")):
            job = f"{beast['id']}.sheet" if kind == "beast" else f"{beast['id']}.seco"
            if not output_path(job, kind).exists():
                continue
            for creature in beast["creatures"]:
                sheets.append(
                    f"  {ts('creature:' + creature + suffix)}: {{ url: {ts('sprites/' + file)}, frameWidth: {size}, frameHeight: {size} }},"
                )
    for splash in manifest["splashes"] + manifest["maps"]:
        if output_path(splash["id"] + ".splash", "scene").exists():
            splashes.append(f"  {ts(splash['id'])}: {ts('art/' + splash['id'] + '.jpg')},")

    body = "\n".join(
        [
            "// Gerado por art/gerar_arte.py (register): não edite à mão. Ver docs/arte.md.",
            'import type { MapSheetDef } from "./mapSprites";',
            "",
            "/** As folhas de mapa geradas, pela chave de quem representam (ver MAP_SHEETS). */",
            "export const GENERATED_SHEETS: Record<string, MapSheetDef> = {",
            *sheets,
            "};",
            "",
            "/** Os retratos gerados, pelo nome de quem fala (ver PORTRAITS). */",
            "export const GENERATED_PORTRAITS: Record<string, { url: string; smooth?: boolean }> = {",
            *portraits,
            "};",
            "",
            "/** As ilustrações de tela cheia (título, mapa do mundo, splash de cada um), pelo id. */",
            "export const SPLASHES: Record<string, string> = {",
            *splashes,
            "};",
            "",
        ]
    )
    REGISTRY.write_text(body, encoding="utf-8", newline="\n")
    print(f"registrado: {len(sheets)} folhas, {len(portraits)} retratos, {len(splashes)} ilustrações")


# ------------------------------------------------------------------- comandos

SIZES = {
    "portrait": ("1024x1536", True),
    "sheet": ("1024x1024", True),
    "beast": ("1024x1024", True),
    "beast_dry": ("1024x1024", True),
    "splash": ("1536x1024", False),
    "scene": ("1536x1024", False),
    "map": ("1536x1024", False),
}


def selected(all_jobs, args):
    values = {args[args.index(flag) + 1] for flag in ("--only", "--via") if flag in args}
    wanted = [arg for arg in args if not arg.startswith("--") and arg not in values]
    only = args[args.index("--only") + 1] if "--only" in args else None
    chosen = []
    for job_id, kind, who in all_jobs:
        owner, part = job_id.split(".")
        if "--all" not in args and owner not in wanted and job_id not in wanted:
            continue
        if only and part != only and kind != only:
            continue
        chosen.append((job_id, kind, who))
    return chosen


def command_list(manifest):
    for job_id, kind, who in jobs(manifest):
        out = output_path(job_id, kind)
        state = "pronto" if out.exists() else ("bruto" if raw_path(job_id).exists() else "falta")
        why = blocked(who)
        print(f"{job_id:28} {state:7} {'(' + why + ')' if why else ('proposta' if who.get('proposal') else '')}")


def command_gen(manifest, args):
    via = args[args.index("--via") + 1] if "--via" in args else "agy"
    if via not in ("agy", "openai"):
        sys.exit("--via é agy ou openai.")
    all_jobs = jobs(manifest)
    # O retrato vem antes da folha: ela o usa de referência.
    order = {"portrait": 0, "sheet": 1}
    for job_id, kind, who in sorted(selected(all_jobs, args), key=lambda job: order.get(job[1], 2)):
        why = blocked(who)
        if why:
            print(f"{job_id}: pulado, {why}")
            continue
        raw = raw_path(job_id)
        if raw.exists() and "--force" not in args:
            print(f"{job_id}: já tem bruto (use --force pra gerar de novo)")
        else:
            size, transparent = SIZES[kind]
            prompt = prompt_for(manifest, kind, who)
            reference = raw_path(f"{who['id']}.portrait") if kind == "sheet" else None
            if reference is not None and not reference.exists():
                reference = None
            print(f"{job_id}: gerando ({via if via == 'agy' else MODEL}{', com o retrato de referência' if reference else ''})...")
            raw.parent.mkdir(parents=True, exist_ok=True)
            if via == "agy":
                data = generate_agy(job_id, kind, prompt, transparent, reference)
                image = Image.open(io.BytesIO(data))
                (key_green(image) if transparent else image.convert("RGB")).save(raw)
            else:
                data = edit(prompt, size, transparent, reference) if reference else generate(prompt, size, transparent)
                raw.write_bytes(data)
        save(convert(kind, Image.open(raw)), output_path(job_id, kind))
        print(f"{job_id}: -> {output_path(job_id, kind).relative_to(ROOT)}")
    register(manifest)


def command_process(manifest, args):
    for job_id, kind, who in selected(jobs(manifest), args):
        raw = raw_path(job_id)
        if not raw.exists():
            continue
        save(convert(kind, Image.open(raw)), output_path(job_id, kind))
        print(f"{job_id}: -> {output_path(job_id, kind).relative_to(ROOT)}")
    register(manifest)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    manifest = load_manifest()
    command, args = sys.argv[1], sys.argv[2:]
    if command == "list":
        command_list(manifest)
    elif command == "gen":
        command_gen(manifest, args)
    elif command == "process":
        command_process(manifest, args)
    elif command == "register":
        register(manifest)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
