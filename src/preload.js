const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('photobooth', {
  detectCamera: () => ipcRenderer.invoke('camera:detect'),
  previewCamera: () => ipcRenderer.invoke('camera:preview'),
  capturePhoto: (token) => ipcRenderer.invoke('camera:capture', token),
  saveWebcamPhoto: (dataUrl, token) => ipcRenderer.invoke('webcam:save-photo', dataUrl, token),
  fullPhoto: (filePath) => ipcRenderer.invoke('photo:full', filePath),
  saveExport: (dataUrl) => ipcRenderer.invoke('photo:save-export', dataUrl),
  beginVideo: (mimeType) => ipcRenderer.invoke('video:begin', mimeType),
  appendVideo: (id, chunk) => ipcRenderer.invoke('video:append', id, chunk),
  endVideo: (id) => ipcRenderer.invoke('video:end', id),
  abortVideo: (id) => ipcRenderer.invoke('video:abort', id),
  startGallerySession: () => ipcRenderer.invoke('gallery:start'),
  recordGalleryAsset: (token, kind, filePath) => ipcRenderer.invoke('gallery:record', token, kind, filePath),
  publishGallerySession: (token, composite) => ipcRenderer.invoke('gallery:publish', token, composite),
  gallerySessionStatus: (token) => ipcRenderer.invoke('gallery:status', token)
});
