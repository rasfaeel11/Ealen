import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Compiler, CompilerOptions } from "inkjs/full";

/**
 * Compila a história (os .ink de client/story) pro JSON que o jogo carrega.
 *
 * Roda em Node, nunca no navegador: quem chama é o Vite (ver vite.config.ts,
 * que recompila a cada mudança num .ink) e o teste da história. O jogo só
 * conhece o resultado, `public/story.json` — que por isso não vai pro git.
 */

export const STORY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../story");
export const STORY_ENTRY = "main.ink";

/** O JSON da história compilada. Erro de Ink vira exceção, com arquivo e linha na mensagem. */
export function compileStory(dir: string = STORY_DIR): string {
  const read = (filename: string) => readFileSync(filename, "utf8");
  const problems: string[] = [];

  const compiler = new Compiler(
    read(resolve(dir, STORY_ENTRY)),
    new CompilerOptions(
      STORY_ENTRY,
      [],
      // Conta as visitas de todo trecho, não só dos que o texto consulta: é o que gasta os gatilhos de uma vez só.
      true,
      // Aviso (falta de -> END, por exemplo) também barra: é quase sempre uma conversa que trava.
      (message) => problems.push(message),
      {
        ResolveInkFilename: (filename) => resolve(dir, filename),
        LoadInkFileContents: read,
      },
    ),
  );

  const story = compiler.Compile();
  if (problems.length > 0 || !story) throw new Error(`A história não compila:\n${problems.join("\n")}`);
  return story.ToJson() as string;
}
