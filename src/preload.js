const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('photobooth', {
  detectCamera: () => ipcRenderer.invoke('camera:detect'),
  previewCamera: () => ipcRenderer.invoke('camera:preview'),
  capturePhoto: () => ipcRenderer.invoke('camera:capture'),
  saveWebcamPhoto: (dataUrl) => ipcRenderer.invoke('webcam:save-photo', dataUrl),
  fullPhoto: (filePath) => ipcRenderer.invoke('photo:full', filePath),
  saveExport: (dataUrl) => ipcRenderer.invoke('photo:save-export', dataUrl),
  beginVideo: () => ipcRenderer.invoke('video:begin'),
  appendVideo: (id, chunk) => ipcRenderer.invoke('video:append', id, chunk),
  endVideo: (id) => ipcRenderer.invoke('video:end', id),
  abortVideo: (id) => ipcRenderer.invoke('video:abort', id)
});
