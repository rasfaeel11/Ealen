// Copia o build do jogo (client/dist) pra dentro do app desktop (desktop/game). O build já usa caminhos relativos
// (`base: "./"` no vite.config), então o mesmo dist/ abre no navegador e aqui. Sem build, avisa e para.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = resolve(here, "../../client/dist");
const to = resolve(here, "../game");

if (!existsSync(resolve(from, "index.html"))) {
  console.error("Não há build do jogo em client/dist. Rode `npm run build --workspace=client` antes (ou `npm run desktop` na raiz).");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`Jogo copiado: ${from} -> ${to}`);
