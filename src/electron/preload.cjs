const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openLearning", {
  copyMarketplaceUrl: () => ipcRenderer.invoke("plugin:copy-marketplace-url"),
  answer: (input) => ipcRenderer.invoke("board:answer", input),
  getState: () => ipcRenderer.invoke("board:get-state"),
  getPluginStatus: () => ipcRenderer.invoke("plugin:get-status"),
  select: (ids) => ipcRenderer.invoke("board:select", ids),
  tapBlank: () => ipcRenderer.invoke("board:tap-blank"),
  onState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("board:state", handler);
    return () => ipcRenderer.removeListener("board:state", handler);
  }
});
