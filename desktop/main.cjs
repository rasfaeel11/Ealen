// O jogo no desktop (Electron): uma janela, o build do client e nada mais. Não há servidor nem rede no caminho do
// jogo (AGENTS.md §7.1). O jogo é servido por um protocolo próprio, `app://jogo/`, e não por file://: o Phaser lê
// a história e os mapas por XHR, e file:// não serve isso do mesmo jeito em todo sistema. O protocolo também dá ao
// localStorage (onde ficam os saves) uma origem fixa, que não muda se a pasta do jogo mudar de lugar.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const GAME_DIR = path.join(__dirname, "game");
const ORIGIN = "app://jogo";

// O nome fixa a pasta dos dados (saves, opções) no sistema: não pode mudar entre versões. Sem acento: o Electron
// põe o nome no User-Agent, e um "ê" ali derruba todo pedido do protocolo do jogo. O título da janela tem acento.
app.setName("Tres na Estrada");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function serveGame() {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.normalize(path.join(GAME_DIR, relative));
    // Nada fora da pasta do jogo.
    if (!file.startsWith(GAME_DIR + path.sep)) return new Response("", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function openWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: "Três na Estrada",
    backgroundColor: "#141110",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once("ready-to-show", () => win.show());

  // O jogo não navega pra lugar nenhum: link de fora abre no navegador do sistema, e o resto é recusado.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN)) event.preventDefault();
  });
  // F11 (ou Alt+Enter) troca a tela cheia. A janela muda de formato, e o jogo já sabe lidar (viewport.ts).
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11" || (input.alt && input.key === "Enter")) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  void win.loadURL(`${ORIGIN}/index.html`);
  return win;
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  serveGame();
  openWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
