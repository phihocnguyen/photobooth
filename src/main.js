const {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  session,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { detectCamera, capturePhoto, capturePreview } = require("./gphoto");

const videoSessions = new Map();
const photoTestMode = process.argv.includes("--test-photos");

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    fullscreen: !photoTestMode,
    frame: photoTestMode,
    autoHideMenuBar: true,
    backgroundColor: "#0c1021",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.setMenuBarVisibility(false);
  const renderer = path.join(__dirname, "renderer", "index.html");
  if (photoTestMode) window.loadFile(renderer, { query: { testPhotos: "1" } });
  else window.loadFile(renderer);
}

app.whenReady().then(() => {
  const uiUrl = pathToFileURL(
    path.join(__dirname, "renderer", "index.html"),
  ).href;
  const allowLocalCamera = (webContents, permission) =>
    permission === "media" && webContents.getURL() === uiUrl;
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(allowLocalCamera(webContents, permission));
    },
  );
  session.defaultSession.setPermissionCheckHandler(allowLocalCamera);

  ipcMain.handle("camera:detect", () => detectCamera());
  ipcMain.handle("camera:preview", async () => {
    try {
      const jpeg = await capturePreview();
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    } catch {
      return null;
    }
  });
  ipcMain.handle("camera:capture", async () => {
    const outputDir = path.join(app.getPath("userData"), "captures");
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${Date.now()}.jpg`);
    await capturePhoto(filePath);
    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) {
      throw new Error(
        "Không đọc được ảnh từ camera. Hãy chọn định dạng JPEG trên camera.",
      );
    }
    return { dataUrl: image.resize({ width: 720 }).toDataURL(), filePath };
  });
  ipcMain.handle("webcam:save-photo", async (_event, dataUrl) => {
    if (
      typeof dataUrl !== "string" ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) ||
      dataUrl.length > 20_000_000
    ) {
      throw new Error("Dữ liệu ảnh webcam không hợp lệ.");
    }
    const outputDir = path.join(app.getPath("userData"), "captures");
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `webcam-${Date.now()}-${crypto.randomUUID()}.jpg`);
    const data = Buffer.from(
      dataUrl.slice("data:image/jpeg;base64,".length),
      "base64",
    );
    await fs.writeFile(filePath, data);
    const image = nativeImage.createFromBuffer(data);
    if (image.isEmpty()) throw new Error("Không đọc được ảnh webcam.");
    return { dataUrl: image.resize({ width: 720 }).toDataURL(), filePath };
  });
  ipcMain.handle("photo:full", async (_event, filePath) => {
    const captureDir = path.join(app.getPath("userData"), "captures");
    if (
      typeof filePath !== "string" ||
      path.dirname(path.resolve(filePath)) !== captureDir
    )
      throw new Error("Đường dẫn ảnh không hợp lệ.");
    return nativeImage.createFromPath(filePath).toDataURL();
  });
  ipcMain.handle("photo:save-export", async (_event, dataUrl) => {
    if (
      typeof dataUrl !== "string" ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) ||
      dataUrl.length > 60_000_000
    ) {
      throw new Error("Ảnh xuất không hợp lệ.");
    }
    const outputDir = path.join(app.getPath("userData"), "exports");
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(
      outputDir,
      `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`,
    );
    await fs.writeFile(
      filePath,
      Buffer.from(dataUrl.slice("data:image/jpeg;base64,".length), "base64"),
      { flag: "wx" },
    );
    return filePath;
  });
  ipcMain.handle("video:begin", async (event) => {
    const outputDir = path.join(app.getPath("userData"), "videos");
    await fs.mkdir(outputDir, { recursive: true });
    const id = crypto.randomUUID();
    const filePath = path.join(
      outputDir,
      `session-${Date.now()}-${id.slice(0, 8)}.webm`,
    );
    await fs.writeFile(filePath, Buffer.alloc(0), { flag: "wx" });
    videoSessions.set(id, {
      senderId: event.sender.id,
      filePath,
      bytes: 0,
      queue: Promise.resolve(),
    });
    return { id };
  });
  ipcMain.handle("video:append", async (event, id, chunk) => {
    const entry = videoSessions.get(id);
    if (
      !entry ||
      entry.senderId !== event.sender.id ||
      !(chunk instanceof Uint8Array)
    ) {
      throw new Error("Phiên ghi video không hợp lệ.");
    }
    const data = Buffer.from(chunk);
    if (data.length > 5_000_000 || entry.bytes + data.length > 250_000_000) {
      throw new Error("Video vượt quá dung lượng cho phép.");
    }
    entry.bytes += data.length;
    entry.queue = entry.queue.then(() => fs.appendFile(entry.filePath, data));
    await entry.queue;
  });
  ipcMain.handle("video:end", async (event, id) => {
    const entry = videoSessions.get(id);
    if (!entry || entry.senderId !== event.sender.id)
      throw new Error("Phiên ghi video không hợp lệ.");
    await entry.queue;
    videoSessions.delete(id);
    if (!entry.bytes) {
      await fs.unlink(entry.filePath);
      throw new Error("Video không có dữ liệu.");
    }
    return {
      filePath: entry.filePath,
      fileUrl: pathToFileURL(entry.filePath).href,
      bytes: entry.bytes,
    };
  });
  ipcMain.handle("video:abort", async (event, id) => {
    const entry = videoSessions.get(id);
    if (!entry || entry.senderId !== event.sender.id) return;
    videoSessions.delete(id);
    await entry.queue.catch(() => {});
    await fs.unlink(entry.filePath).catch(() => {});
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
