const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openLearning", {
  getState: () => ipcRenderer.invoke("board:get-state"),
  select: (ids) => ipcRenderer.invoke("board:select", ids),
  onState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("board:state", handler);
    return () => ipcRenderer.removeListener("board:state", handler);
  }
});
