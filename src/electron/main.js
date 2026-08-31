import { app, BrowserWindow, clipboard, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BoardStore } from "../board-state.js";
import { createBoardIpcServer } from "../local-ipc.js";
import { checkOpenLearningPlugin } from "../plugin-status.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const store = new BoardStore();
let mainWindow;
let localServer;

app.setName("Open Learning");
const hasSingleInstanceLock = app.requestSingleInstanceLock();

function sendState(state = store.snapshot()) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("board:state", state);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: "#fafafa",
    title: "Open Learning",
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.loadFile(path.join(here, "../../dist/renderer/index.html"));
  mainWindow.webContents.once("did-finish-load", () => sendState());
}

function requestQuit() {
  app.quit();
}

ipcMain.handle("board:get-state", () => store.snapshot());
ipcMain.handle("board:select", (_event, ids) => {
  const state = store.select(ids);
  sendState(state);
  return state;
});
ipcMain.handle("plugin:get-status", () => checkOpenLearningPlugin());
ipcMain.handle("plugin:copy-marketplace-url", () => {
  clipboard.writeText("https://github.com/xmili233/open_learning");
});

if (!hasSingleInstanceLock) app.quit();

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  localServer = await createBoardIpcServer({
    store,
    runtimeFile: path.join(app.getPath("userData"), "runtime.json"),
    onChange: sendState
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", (event) => {
  if (!localServer) return;
  event.preventDefault();
  const server = localServer;
  localServer = null;
  server.close().then(() => app.quit(), (error) => {
    console.error(error);
    app.exit(1);
  });
});

process.once("SIGINT", requestQuit);
process.once("SIGTERM", requestQuit);
