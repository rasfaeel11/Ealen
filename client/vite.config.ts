import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { STORY_DIR, compileStory } from "./scripts/compileStory";

/**
 * A história (client/story/*.ink) vira `public/story.json` antes de o jogo
 * subir ou ser empacotado, e de novo a cada .ink salvo durante o dev — a
 * página recarrega sozinha. Um erro de Ink aparece no terminal e, no build,
 * derruba o build.
 */
function inkStory(): Plugin {
  const output = resolve(__dirname, "public/story.json");
  const compile = () => writeFileSync(output, compileStory());

  return {
    name: "ealen-ink-story",
    buildStart: compile,
    configureServer(server) {
      server.watcher.add(STORY_DIR);
      server.watcher.on("change", (file) => {
        if (!file.endsWith(".ink")) return;
        try {
          compile();
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          server.config.logger.error(String(error instanceof Error ? error.message : error));
        }
      });
    },
  };
}

export default defineConfig({
  // Caminhos relativos no build: o mesmo dist/ abre por http ou por file://
  // (é o que um empacotador tipo Electron carrega).
  base: "./",
  plugins: [inkStory()],
  server: {
    port: 5173,
  },
});
