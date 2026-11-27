const status = document.getElementById('status');
const importButton = document.getElementById('import-photos');
const photoTestMode = new URLSearchParams(window.location.search).has('testPhotos');
const captureButton = document.getElementById('capture');
const detectButton = document.getElementById('detect');
const savedPath = document.getElementById('saved-path');
const cameraBadge = document.getElementById('camera-badge');
const printMockup = document.getElementById('print-mockup');
const printPhotos = document.getElementById('print-photos');
const newspaperPage = document.getElementById('newspaper-page');
const selectedTemplate = document.getElementById('selected-template');
const webcamButton = document.getElementById('test-webcam');
const videoSourceSelect = document.getElementById('video-source');
const webcamPreview = document.getElementById('webcam-preview');
const videoSignalNotice = document.getElementById('video-signal-notice');
const usbPreview = document.getElementById('usb-preview');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTime = document.getElementById('recording-time');
const videoSaved = document.getElementById('video-saved');
const watchVideoButtons = [
  document.getElementById('watch-video-selection'),
  document.getElementById('watch-video-template')
];
const videoScreen = document.getElementById('video-screen');
const sessionVideo = document.getElementById('session-video');
const closeVideoButton = document.getElementById('close-video');
const stageBottomNote = document.getElementById('stage-bottom-note');
const stageFooterHint = document.getElementById('stage-footer-hint');
const shootOverlay = document.getElementById('shoot-overlay');
const shootProgress = document.getElementById('shoot-progress');
const shootNumber = document.getElementById('shoot-number');
const initialDelayInput = document.getElementById('initial-delay');
const shotIntervalInput = document.getElementById('shot-interval');
const captureLabel = document.getElementById('capture-label');
const captureDescription = document.getElementById('capture-description');
const cancelButton = document.getElementById('cancel-capture');
const selectionPanel = document.getElementById('selection-panel');
const selectionInstruction = document.getElementById('selection-instruction');
const selectionCount = document.getElementById('selection-count');
const photoGallery = document.getElementById('photo-gallery');
const confirmButton = document.getElementById('confirm-selection');
const templatePanel = document.getElementById('template-panel');
const templateGrid = document.getElementById('template-grid');
const templateFilters = document.getElementById('template-filters');
const templateTotal = document.getElementById('template-total');
const templateStep = document.getElementById('template-step');
const templateTitle = document.getElementById('template-title');
const templateHelp = document.getElementById('template-help');
const workspace = document.getElementById('workspace');
const setupControls = document.getElementById('setup-controls');
const layoutSection = document.getElementById('layout-section');
const changeTemplateButton = document.getElementById('change-template');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const retakeButton = document.getElementById('retake-from-gallery');
const editSelectionButton = document.getElementById('edit-selection');
const finalConfirmButton = document.getElementById('final-confirm');
const qrScreen = document.getElementById('qr-screen');
const sessionQr = document.getElementById('session-qr');
const qrTimer = document.getElementById('qr-timer');
const nextGuestButton = document.getElementById('next-guest');
const printHeading = document.querySelector('.print-heading');
const printFooter = document.querySelector('.print-footer');
const templateExportStatus = document.getElementById('template-export-status');
const exportStatus = document.getElementById('export-status');
const VIDEO_FPS = 18;
const SHOT_COUNT = 8;
let photoMode = 'color';
const photoModeButtons = document.querySelectorAll('[data-photo-mode]');
photoModeButtons.forEach((button) => button.addEventListener('click', () => {
  photoMode = button.dataset.photoMode;
  photoModeButtons.forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  renderGallery();
  updatePreview();
}));

let capturedPhotos = [];
let chosenIndices = [];
const newspaperPositions = new Map();
let templateUnlocked = false;
let activeTemplateId = null;
let activeFilter = 'all';
let qrTimerHandle = null;
let lastVideoUrl = null;
let activeSessionToken = null;
let qrStatusTimer;
let displayedSessionToken;
let lastWatchButton = null;

function updateWatchButtons() {
  watchVideoButtons.forEach((button) => { button.hidden = !lastVideoUrl; });
}

function closeVideoScreen() {
  sessionVideo.pause();
  sessionVideo.removeAttribute('src');
  sessionVideo.load();
  videoScreen.hidden = true;
  lastWatchButton?.focus();
}

watchVideoButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!lastVideoUrl) return;
    lastWatchButton = button;
    sessionVideo.src = lastVideoUrl;
    videoScreen.hidden = false;
    sessionVideo.play().catch(() => {});
    closeVideoButton.focus();
  });
});
closeVideoButton.addEventListener('click', closeVideoScreen);

const layouts = {
  newspaper: { label: 'Báo Củ Chi · 1 ảnh', count: 1 },
  strip: { label: 'Dải ảnh 1 × 4', count: 4 },
  grid: { label: 'Lưới vuông 2 × 2', count: 4 },
  group: { label: 'Ảnh nhóm 2 × 3', count: 6 }
};
const templates = window.PHOTO_TEMPLATES;
const defaultNewspaper = templates.find((design) => design.newspaper);

const categoryNames = {
  minimal: 'Tối giản', pastel: 'Pastel', vintage: 'Film & Retro'
};

function createFrameSamplePhoto(index) {
  const image = document.createElement('img');
  image.className = 'frame-sample-photo';
  image.src = `assets/frame-sample-${index + 1}.jpg`;
  image.alt = '';
  return image;
}

function selected(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function newspaperPositionKey(design) {
  return `${design.id}:${chosenIndices[0]}`;
}

function enableNewspaperPositioning(canvas, design, image, mode, key) {
  const box = design.newspaper.layout.photo;
  const [x, y, w, h] = box;
  const crop = window.newspaperPhotoCrop(image, box);
  const travelX = crop.overflowX * crop.scale;
  const travelY = crop.overflowY * crop.scale;
  if (travelX < .001 && travelY < .001) return;

  const adjustment = document.createElement('button');
  adjustment.type = 'button';
  adjustment.className = 'newspaper-photo-adjustment';
  adjustment.setAttribute('aria-label', 'Căn ảnh bằng phím mũi tên. Nhấn Home để đưa ảnh về giữa.');
  Object.assign(adjustment.style, {
    left: `${x / 432 * 100}%`, top: `${y / 620 * 100}%`,
    width: `${w / 432 * 100}%`, height: `${h / 620 * 100}%`
  });
  newspaperPage.append(adjustment);

  const getPosition = () => newspaperPositions.get(key) || { x: .5, y: .5 };
  function moveFrom(start, dx, dy) {
    if (finalConfirmButton.disabled) return;
    const clamp = (value) => Math.min(1, Math.max(0, value));
    const position = {
      x: travelX >= .001 ? clamp(start.x - dx / travelX) : .5,
      y: travelY >= .001 ? clamp(start.y - dy / travelY) : .5
    };
    newspaperPositions.set(key, position);
    window.drawCuChiNewspaper(canvas, design, image, mode, 2, position);
  }

  let drag;
  adjustment.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag || finalConfirmButton.disabled) return;
    adjustment.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, position: getPosition() };
  });
  adjustment.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    moveFrom(drag.position, (event.clientX - drag.x) * 432 / bounds.width, (event.clientY - drag.y) * 620 / bounds.height);
  });
  adjustment.addEventListener('lostpointercapture', () => { drag = undefined; });
  adjustment.addEventListener('keydown', (event) => {
    const offsets = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    if (event.key === 'Home') {
      event.preventDefault();
      moveFrom({ x: .5, y: .5 }, 0, 0);
    } else if (Object.hasOwn(offsets, event.key)) {
      event.preventDefault();
      moveFrom(getPosition(), ...offsets[event.key]);
    }
  });
}

function updatePreview() {
  const layout = selected('template');
  const design = templateUnlocked ? templates.find((item) => item.id === activeTemplateId)
    : layout === 'newspaper' ? defaultNewspaper : null;
  printMockup.className = design
    ? `print-mockup design-${design.id} ${design.newspaper ? 'design-cu-chi-paper' : 'frame-template'}`
    : 'print-mockup theme-neutral';
  printHeading.firstChild.textContent = design ? `${design.title} ` : 'little moments ';
  printHeading.lastElementChild.textContent = design ? design.icon : '✳';
  printFooter.firstElementChild.textContent = design?.footer || 'PHOTOBOOTH · 2026';
  printFooter.lastElementChild.textContent = design ? design.icon : '✦ ✦ ✦';
  const isNews = Boolean(design?.newspaper);
  newspaperPage.hidden = !isNews;
  if (isNews) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Bản xem trước mẫu báo ${design.name}`);
    newspaperPage.replaceChildren(canvas);
    const photo = capturedPhotos[chosenIndices[0]];
    const mode = photoMode;
    const key = newspaperPositionKey(design);
    window.drawCuChiNewspaper(canvas, design);
    if (photo) {
      window.loadNewspaperPhoto(photo.dataUrl).then((image) => {
        if (newspaperPage.hidden || !canvas.isConnected) return;
        window.drawCuChiNewspaper(canvas, design, image, mode, 2, newspaperPositions.get(key));
        if (document.body.dataset.screen === 'template') enableNewspaperPositioning(canvas, design, image, mode, key);
      }).catch((error) => console.warn('Không đọc được ảnh xem trước của trang báo.', error));
    }
  }
  printPhotos.className = `print-photos layout-${layout}`;
  printPhotos.replaceChildren(...Array.from({ length: layouts[layout].count }, (_, index) => {
    const slot = document.createElement('div');
    slot.className = 'print-slot';
    const photo = capturedPhotos[chosenIndices[index]];
    if (photo) {
      const image = document.createElement('img');
      image.src = photo.dataUrl;
      image.classList.toggle('photo-bw', photoMode === 'bw');
      image.alt = `Ảnh đã chọn số ${index + 1}`;
      slot.append(image);
    } else {
      slot.textContent = String(index + 1).padStart(2, '0');
      if (design && !isNews) slot.append(createFrameSamplePhoto(index));
    }
    return slot;
  }));
  selectedTemplate.textContent = design && templateUnlocked ? `${layouts[layout].label} · ${design.name}` : layouts[layout].label;
}

function renderTemplates() {
  const picking = document.body.dataset.screen === 'template-start';
  const layout = selected('template');
  const isNewsLayout = layout === 'newspaper';
  templateFilters.hidden = !picking || isNewsLayout;
  templateGrid.classList.toggle('newspaper-grid', isNewsLayout);
  const available = picking
    ? templates.filter((item) => Boolean(item.newspaper) === isNewsLayout)
    : templates.filter((item) => item.id === activeTemplateId);
  const shown = activeFilter === 'all' ? available : available.filter((item) => item.category === activeFilter);
  templateTotal.textContent = `${shown.length} mẫu`;
  templateGrid.replaceChildren(...shown.map((design) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `template-choice design-${design.id}`;
    button.dataset.templateId = design.id;
    button.classList.toggle('selected', activeTemplateId === design.id);
    button.setAttribute('aria-pressed', String(activeTemplateId === design.id));
    button.setAttribute('aria-label', `Chọn template ${design.name}`);
    const sample = document.createElement(design.newspaper ? 'canvas' : 'span');
    if (design.newspaper) {
      sample.className = 'newspaper-sample';
      sample.setAttribute('aria-hidden', 'true');
      window.drawCuChiNewspaper(sample, design, null, null, 0.5);
    } else {
      sample.className = `template-sample frame-template frame-sample-${layout}`;
      sample.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.className = 'template-sample-title';
      title.textContent = design.title;
      const photos = document.createElement('span');
      photos.className = 'template-sample-photos';
      for (let index = 0; index < layouts[layout].count; index++) photos.append(createFrameSamplePhoto(index));
      const footer = document.createElement('span');
      footer.className = 'template-sample-footer';
      footer.textContent = design.footer;
      sample.append(title, photos, footer);
    }
    const name = document.createElement('strong');
    name.textContent = design.name;
    const category = document.createElement('small');
    category.textContent = design.newspaper ? 'Báo Củ Chi' : categoryNames[design.category];
    button.append(sample, name, category);
    button.addEventListener('click', () => {
      activeTemplateId = design.id;
      templateUnlocked = true;
      finalConfirmButton.disabled = false;
      updatePreview();
      templateGrid.querySelectorAll('.template-choice').forEach((choice) => {
        const isSelected = choice.dataset.templateId === design.id;
        choice.classList.toggle('selected', isSelected);
        choice.setAttribute('aria-pressed', String(isSelected));
      });
      stageFooterHint.textContent = `${layouts[selected('template')].label} · ${design.name}`;
    });
    return button;
  }));
}

templateFilters.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  activeFilter = button.dataset.category;
  templateFilters.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  renderTemplates();
});

document.querySelectorAll('input[name="template"]').forEach((input) => {
  input.addEventListener('change', () => {
    const activeDesign = templates.find((design) => design.id === activeTemplateId);
    if (Boolean(activeDesign?.newspaper) !== (input.value === 'newspaper')) {
      activeTemplateId = null;
      templateUnlocked = false;
      finalConfirmButton.disabled = true;
    }
    activeFilter = 'all';
    templateFilters.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('active', button.dataset.category === 'all');
    });
    updatePreview();
    renderTemplates();
    stageFooterHint.textContent = layouts[input.value].label;
    if (!selectionPanel.hidden) updateSelection();
  });
});
updatePreview();
renderTemplates();

let cameraConnected = false;
let hasCheckedCamera = false;
let detecting = false;
let capturing = false;
let webcamStarting = false;
let webcamStream = null;
let videoSignalReady = false;
let videoSignalTimer;
let captureUsesVideo = false;
let captureSource = 'gphoto';
let cancelRequested = false;
let activeVideoDeviceId = '';
let activeVideoLabel = '';
let mirrorVideo = false;
let videoDeviceFingerprint = '';
let videoScanRunning = false;
let autoVideoSuppressed = false;
let manualVideoChoice = false;
let hasScannedVideoDevices = false;
let templateChosen = false;
let pendingAutoVideoDeviceId = '';
let usbPreviewReady = false;
let usbPreviewRunning = false;
let usbPreviewPaused = false;
let usbPreviewFailures = 0;
let usbPreviewRetryAt = 0;

const captureCardName = /capture|hdmi|cam link|usb video|usb camera|video grabber|ezcap|elgato|avermedia|game capture/i;
const builtInCameraName = /integrated|built.in|facetime|internal|laptop|front camera|webcam|web cam/i;

function videoDevicesOnly(devices) {
  return devices.filter((device) => device.kind === 'videoinput');
}

function fillVideoSources(devices) {
  const previous = activeVideoDeviceId || videoSourceSelect.value;
  videoSourceSelect.replaceChildren(...devices.map((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `Nguồn video ${index + 1}`;
    return option;
  }));
  if (!devices.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Chưa có nguồn video';
    videoSourceSelect.append(option);
  } else if (devices.some((device) => device.deviceId === previous)) {
    videoSourceSelect.value = previous;
  }
}

function preferredVideoDevice(devices, addedIds, allowNewDevice) {
  return devices.find((device) => captureCardName.test(device.label)) ||
    (allowNewDevice ? devices.find((device) => addedIds.includes(device.deviceId)) : null) ||
    (devices.length === 1 && devices[0].label && !builtInCameraName.test(devices[0].label) ? devices[0] : null);
}

function updateCaptureButton() {
  const captureCardWithoutUsb = webcamStream && captureCardName.test(activeVideoLabel) && !cameraConnected;
  captureButton.disabled = !templateChosen || capturing || detecting || webcamStarting || (webcamStream && !videoSignalReady) ||
    (captureSource === 'gphoto' && !cameraConnected) ||
    (captureSource === 'webcam' && (!webcamStream || captureCardWithoutUsb));
  detectButton.disabled = detecting || capturing;
  webcamButton.disabled = webcamStarting || capturing;
  videoSourceSelect.disabled = webcamStarting || capturing;
  [initialDelayInput, shotIntervalInput].forEach((input) => { input.disabled = capturing; });
  captureLabel.textContent = `Bắt đầu chụp ${SHOT_COUNT} ảnh`;
  captureDescription.textContent = cameraConnected && webcamStream
    ? `Xem trực tiếp · lưu ${SHOT_COUNT} ảnh gốc từ máy ảnh USB.`
    : captureCardWithoutUsb
      ? 'Capture card chỉ cho xem trước. Kết nối USB máy ảnh để chụp ảnh gốc và dùng flash.'
    : `Chụp ${SHOT_COUNT} tấm, sau đó chọn ${layouts[selected('template')].count} tấm.`;
}

function setCameraBadge(connected, label) {
  cameraBadge.classList.toggle('connected', connected);
  cameraBadge.lastChild.textContent = ` ${label}`;
}

async function checkCamera(manual = false) {
  if (photoTestMode || detecting || capturing) return;
  detecting = true;
  updateCaptureButton();
  if (manual && captureSource === 'gphoto') status.textContent = 'Đang kiểm tra camera…';
  try {
    const result = await window.photobooth.detectCamera();
    const changed = !hasCheckedCamera || cameraConnected !== result.connected;
    cameraConnected = result.connected;
    if (changed) {
      usbPreviewFailures = 0;
      usbPreviewRetryAt = 0;
      if (!cameraConnected) usbPreviewReady = false;
      syncStagePreview();
    }
    if (captureSource === 'gphoto') setCameraBadge(cameraConnected, cameraConnected ? 'Đã kết nối' : 'Đang chờ camera');
    if (captureSource === 'webcam' && webcamStream) {
      stageBottomNote.lastChild.textContent = ` ${activeVideoLabel} · Live view${cameraConnected ? ' · Ảnh gốc từ máy ảnh USB' : ''}`;
      if (changed && cameraConnected) status.textContent = 'Capture card đang hiện live view; ảnh sẽ được chụp và tải từ máy ảnh qua USB.';
      if (changed && !cameraConnected && captureCardName.test(activeVideoLabel)) status.textContent = 'Capture card chỉ truyền live view. Kết nối USB máy ảnh để chụp ảnh gốc và dùng flash.';
    }
    if ((changed || manual) && captureSource === 'gphoto') {
      status.textContent = cameraConnected
        ? `Đã tìm thấy: ${result.cameras.join(', ')}. Có thể bắt đầu chụp.`
        : 'Chưa thấy camera. Cắm USB và bật máy ảnh; app sẽ tự nhận diện.';
    }
  } catch (error) {
    const wasConnected = cameraConnected;
    cameraConnected = false;
    usbPreviewReady = false;
    syncStagePreview();
    if (captureSource === 'gphoto') {
      setCameraBadge(false, 'Lỗi kiểm tra camera');
      if (!hasCheckedCamera || manual || wasConnected) status.textContent = error.message;
    }
  } finally {
    hasCheckedCamera = true;
    detecting = false;
    updateCaptureButton();
  }
}

detectButton.addEventListener('click', () => checkCamera(true));
checkCamera();
if (!photoTestMode) setInterval(() => checkCamera(), 4000);
window.addEventListener('focus', () => checkCamera());

function stopWebcam(suppressAuto = false) {
  if (suppressAuto) autoVideoSuppressed = true;
  clearInterval(videoSignalTimer);
  videoSignalReady = false;
  webcamStream?.getTracks().forEach((track) => track.stop());
  webcamStream = null;
  activeVideoDeviceId = '';
  activeVideoLabel = '';
  mirrorVideo = false;
  webcamPreview.srcObject = null;
  webcamPreview.hidden = true;
  webcamPreview.classList.remove('mirrored');
  printMockup.hidden = false;
  captureSource = 'gphoto';
  webcamButton.textContent = 'Mở nguồn hình';
  stageBottomNote.lastChild.textContent = ' Bản xem trước bố cục · Chưa có live view';
  syncStagePreview();
  setCameraBadge(cameraConnected, cameraConnected ? 'Đã kết nối' : 'Đang chờ camera');
  updateCaptureButton();
}

function syncStagePreview() {
  const showLiveView = Boolean(webcamStream && document.body.dataset.screen === 'setup');
  const showUsbPreview = Boolean(!webcamStream && cameraConnected && usbPreviewReady && document.body.dataset.screen === 'setup');
  webcamPreview.hidden = !showLiveView;
  usbPreview.hidden = !showUsbPreview;
  printMockup.hidden = capturing || showLiveView || showUsbPreview;
  const videoDisconnected = capturing && captureUsesVideo && !webcamStream;
  videoSignalNotice.hidden = !videoDisconnected && !(showLiveView && !videoSignalReady);
  const message = videoDisconnected ? 'Nguồn video đã ngắt kết nối.' : 'Đang chờ tín hiệu camera…';
  if (videoSignalNotice.textContent !== message) videoSignalNotice.textContent = message;
}

function videoFrameIsUsable() {
  const track = webcamStream?.getVideoTracks()[0];
  return Boolean(track && track.readyState === 'live' && !track.muted &&
    !webcamPreview.paused && webcamPreview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    webcamPreview.videoWidth && webcamPreview.videoHeight && !hasVideoTestPattern(webcamPreview));
}

function watchVideoSignal(stream) {
  clearInterval(videoSignalTimer);
  let lastFrames = -1;
  let lastFrameAt = performance.now();
  function check() {
    if (webcamStream !== stream || webcamPreview.srcObject !== stream || webcamPreview.hidden) return;
    const frames = webcamPreview.getVideoPlaybackQuality().totalVideoFrames;
    const now = performance.now();
    if (frames !== lastFrames) {
      lastFrames = frames;
      lastFrameAt = now;
    }
    const ready = frames > 0 && now - lastFrameAt < 1500 && videoFrameIsUsable();
    if (ready === videoSignalReady) return;
    videoSignalReady = ready;
    syncStagePreview();
    updateCaptureButton();
  }
  check();
  videoSignalTimer = setInterval(check, 250);
}

async function refreshUsbPreview() {
  if (!cameraConnected || webcamStream || !templateChosen || document.body.dataset.screen !== 'setup' ||
      usbPreviewPaused || usbPreviewRunning || Date.now() < usbPreviewRetryAt) return;
  usbPreviewRunning = true;
  try {
    const frame = await window.photobooth.previewCamera();
    if (!frame) throw new Error('Camera chưa sẵn sàng cho live preview.');
    if (!cameraConnected || webcamStream || document.body.dataset.screen !== 'setup') return;
    usbPreview.src = frame;
    usbPreviewReady = true;
    usbPreviewFailures = 0;
    stageBottomNote.lastChild.textContent = ' Canon USB · Live preview';
    syncStagePreview();
  } catch (error) {
    usbPreviewFailures++;
    if (usbPreviewFailures >= 3) {
      usbPreviewRetryAt = Date.now() + 5000;
      usbPreviewFailures = 0;
      if (!capturing) usbPreviewReady = false;
      syncStagePreview();
      status.textContent = `Không mở được live preview USB: ${error.message}. Vẫn có thể chụp ảnh gốc.`;
    }
  } finally {
    usbPreviewRunning = false;
  }
}

setInterval(refreshUsbPreview, 1200);

async function openVideoSource(deviceId, automatic = false) {
  if (capturing || webcamStarting) return;
  webcamStarting = true;
  updateCaptureButton();
  status.textContent = 'Đang mở nguồn hình…';
  const previousStream = webcamStream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Electron không hỗ trợ nguồn video trong phiên này.');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    webcamPreview.srcObject = stream;
    await webcamPreview.play();
    webcamStream = stream;
    videoSignalReady = false;
    activeVideoDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId || deviceId || '';
    const devices = videoDevicesOnly(await navigator.mediaDevices.enumerateDevices().catch(() => []));
    previousStream?.getTracks().forEach((track) => track.stop());
    fillVideoSources(devices);
    if (activeVideoDeviceId) videoSourceSelect.value = activeVideoDeviceId;
    const label = devices.find((device) => device.deviceId === activeVideoDeviceId)?.label || stream.getVideoTracks()[0]?.label || 'Nguồn video';
    activeVideoLabel = label;
    mirrorVideo = !captureCardName.test(label);
    webcamPreview.classList.toggle('mirrored', mirrorVideo);
    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (webcamStream !== stream) return;
      stopWebcam();
      status.textContent = 'Nguồn hình đã ngắt kết nối. Đang chờ capture card…';
    }, { once: true });
    captureSource = 'webcam';
    syncStagePreview();
    watchVideoSignal(stream);
    webcamButton.textContent = 'Tắt nguồn hình';
    stageBottomNote.lastChild.textContent = ` ${label} · Live view${cameraConnected ? ' · Ảnh gốc từ máy ảnh USB' : ''}`;
    setCameraBadge(true, captureCardName.test(label) ? 'Capture card sẵn sàng' : 'Nguồn hình sẵn sàng');
    status.textContent = cameraConnected
      ? `${label} đang hiện live view; ảnh gốc sẽ được chụp và tải từ máy ảnh qua USB.`
      : captureCardName.test(label)
        ? 'Capture card chỉ truyền live view. Kết nối USB máy ảnh để chụp ảnh gốc và dùng flash.'
      : `${label} đã sẵn sàng. Hình trực tiếp ở khung bên trái.`;
    if (!automatic) {
      autoVideoSuppressed = false;
      manualVideoChoice = true;
    } else manualVideoChoice = false;
  } catch (error) {
    webcamPreview.srcObject?.getTracks().forEach((track) => {
      if (webcamPreview.srcObject !== previousStream) track.stop();
    });
    webcamPreview.srcObject = previousStream;
    if (!previousStream) stopWebcam();
    else if (activeVideoDeviceId) videoSourceSelect.value = activeVideoDeviceId;
    status.textContent = `Không mở được nguồn hình: ${error.message}`;
  } finally {
    webcamStarting = false;
    updateCaptureButton();
  }
}

async function scanVideoDevices() {
  if (videoScanRunning || webcamStarting || capturing || !navigator.mediaDevices?.enumerateDevices) return;
  videoScanRunning = true;
  try {
    let devices = videoDevicesOnly(await navigator.mediaDevices.enumerateDevices());
    const fingerprint = devices.map((device) => device.deviceId).sort().join('|');
    const previousIds = videoDeviceFingerprint ? videoDeviceFingerprint.split('|') : [];
    const changed = fingerprint !== videoDeviceFingerprint;
    const allowNewDevice = hasScannedVideoDevices && changed;
    videoDeviceFingerprint = fingerprint;
    if (changed && devices.length && devices.every((device) => !device.label)) {
      let probe;
      try {
        probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        devices = videoDevicesOnly(await navigator.mediaDevices.enumerateDevices());
      } catch { /* The user can still select a source if Chromium lists it. */ }
      finally { probe?.getTracks().forEach((track) => track.stop()); }
    }
    fillVideoSources(devices);
    if (captureSource === 'webcam' && !devices.some((device) => device.deviceId === activeVideoDeviceId)) {
      stopWebcam();
      status.textContent = 'Nguồn hình đã ngắt kết nối. Đang chờ capture card…';
    }
    if (changed) autoVideoSuppressed = false;
    const preferred = preferredVideoDevice(devices, devices.filter((device) => !previousIds.includes(device.deviceId)).map((device) => device.deviceId), allowNewDevice);
    const newlyAdded = preferred && !previousIds.includes(preferred.deviceId);
    if (!templateChosen) pendingAutoVideoDeviceId = preferred?.deviceId || '';
    if (preferred && templateChosen && !autoVideoSuppressed && (!manualVideoChoice || newlyAdded) && preferred.deviceId !== activeVideoDeviceId) {
      videoSourceSelect.value = preferred.deviceId;
      await openVideoSource(preferred.deviceId, true);
    }
  } catch (error) {
    if (captureSource !== 'webcam') status.textContent = `Không quét được nguồn video: ${error.message}`;
  } finally {
    hasScannedVideoDevices = true;
    videoScanRunning = false;
  }
}

webcamButton.addEventListener('click', () => {
  if (captureSource === 'webcam') {
    stopWebcam(true);
    status.textContent = 'Đã tắt nguồn hình.';
  } else openVideoSource(videoSourceSelect.value);
});
videoSourceSelect.addEventListener('change', () => {
  if (videoSourceSelect.value) openVideoSource(videoSourceSelect.value);
});
if (!photoTestMode) {
  navigator.mediaDevices?.addEventListener?.('devicechange', scanVideoDevices);
  scanVideoDevices();
  setInterval(scanVideoDevices, 3000);
}
window.addEventListener('beforeunload', stopWebcam);

function configValue(input, min, max) {
  const number = Number(input.value);
  const value = Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : min;
  input.value = String(value);
  return value;
}
initialDelayInput.addEventListener('change', () => configValue(initialDelayInput, 0, 30));
shotIntervalInput.addEventListener('change', () => configValue(shotIntervalInput, 1, 15));

function renderGallery() {
  photoGallery.replaceChildren(...capturedPhotos.map((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-choice';
    const position = chosenIndices.indexOf(index);
    if (position !== -1) button.classList.add('selected');
    button.setAttribute('aria-pressed', String(position !== -1));
    button.setAttribute('aria-label', `Ảnh ${index + 1}`);
    const image = document.createElement('img');
    image.src = photo.dataUrl;
    image.classList.toggle('photo-bw', photoMode === 'bw');
    image.alt = '';
    const number = document.createElement('span');
    number.className = 'photo-number';
    number.textContent = String(index + 1).padStart(2, '0');
    button.append(image, number);
    if (position !== -1) {
      const order = document.createElement('span');
      order.className = 'chosen-order';
      order.textContent = String(position + 1);
      button.append(order);
    }
    button.addEventListener('click', () => {
      const existing = chosenIndices.indexOf(index);
      const needed = layouts[selected('template')].count;
      if (existing !== -1) chosenIndices.splice(existing, 1);
      else if (chosenIndices.length < needed) chosenIndices.push(index);
      else {
        selectionInstruction.textContent = `Đã đủ ${needed} ảnh. Bỏ chọn một ảnh trước khi đổi.`;
        return;
      }
      updateSelection();
    });
    return button;
  }));
}

function updateSelection() {
  const needed = layouts[selected('template')].count;
  if (chosenIndices.length > needed) chosenIndices = chosenIndices.slice(0, needed);
  selectionInstruction.textContent = capturedPhotos.length >= needed
    ? `Chọn ${needed} ảnh yêu thích trong ${capturedPhotos.length} ảnh. Thứ tự chọn là thứ tự trên khung.`
    : `Buổi chụp dừng sớm, mới có ${capturedPhotos.length}/${needed} ảnh. Hãy chụp lại.`;
  selectionCount.textContent = `Đã chọn ${chosenIndices.length}/${needed}`;
  confirmButton.disabled = chosenIndices.length !== needed;
  confirmButton.textContent = selected('template') === 'newspaper' ? 'Xem bản báo →' : 'Xem ảnh trên template →';
  renderGallery();
  updatePreview();
}

function showScreen(screen) {
  document.body.dataset.screen = screen;
  syncStagePreview();
  workspace.hidden = screen === 'selection';
  selectionPanel.hidden = screen !== 'selection';
  setupControls.hidden = screen !== 'setup';
  templatePanel.hidden = !['template-start', 'template'].includes(screen);
  editSelectionButton.hidden = screen !== 'template';
  importButton.hidden = !photoTestMode || screen !== 'template-start';
  finalConfirmButton.textContent = screen === 'template-start'
    ? 'Vào live preview →'
    : 'Xác nhận →';
  templateStep.textContent = screen === 'template-start' ? 'BƯỚC 1 · CHỌN BỐ CỤC' : 'BƯỚC 4 · XEM LẠI';
  templateTitle.textContent = screen === 'template-start' ? 'Chọn bố cục' : 'Xem lại thành phẩm';
  templateHelp.textContent = screen === 'template-start'
    ? 'Chọn bố cục, sau đó chọn mẫu phù hợp.'
    : selected('template') === 'newspaper' && screen === 'template'
      ? 'Kéo ảnh trong khung để căn lại phần hiển thị, hoặc dùng phím mũi tên khi khung ảnh được chọn.'
      : 'Ảnh đã chọn nằm trên mẫu ở bên trái.';
  layoutSection.hidden = screen !== 'template-start';
  finalConfirmButton.hidden = photoTestMode && screen === 'template-start';
  const copy = {
    'template-start': photoTestMode
      ? ['Chạy thử bằng ảnh có sẵn.', 'Chọn bố cục và mẫu, rồi nạp ảnh từ máy.']
      : ['Chọn bố cục cho bộ ảnh.', 'Chọn bố cục và mẫu, rồi xem trực tiếp và chụp 8 ảnh.'],
    setup: ['Sẵn sàng cho buổi chụp.', 'Kiểm tra live preview và chụp 8 ảnh.'],
    selection: ['Chọn những tấm ảnh bạn thích nhất.', 'Chọn ảnh để đưa vào template đã chọn.'],
    template: ['Xem lại thành phẩm của bạn.', 'Kiểm tra ảnh trên template trước khi lưu.']
  };
  pageTitle.textContent = copy[screen][0];
  pageSubtitle.textContent = copy[screen][1];
  if (['template-start', 'template'].includes(screen)) renderTemplates();
  window.scrollTo(0, 0);
}

showScreen('template-start');
window.newspaperAssetsReady.then(() => {
  if (selected('template') === 'newspaper') updatePreview();
  if (['template-start', 'template'].includes(document.body.dataset.screen)) renderTemplates();
});

confirmButton.addEventListener('click', () => {
  const needed = layouts[selected('template')].count;
  if (chosenIndices.length !== needed) return;
  finalConfirmButton.disabled = !activeTemplateId;
  showScreen('template');
  updatePreview();
  status.textContent = `Đã chọn ${needed} ảnh. Kiểm tra thành phẩm trước khi lưu.`;
  stageFooterHint.textContent = `Đã chọn ${needed} ảnh`;
});

function resetSession() {
  activeSessionToken = null;
  newspaperPositions.clear();
  templateChosen = false;
  stopWebcam();
  photoMode = 'color';
  photoModeButtons.forEach((button) => {
    const active = button.dataset.photoMode === 'color';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  capturedPhotos = [];
  chosenIndices = [];
  activeTemplateId = null;
  templateExportStatus.textContent = '';
  activeFilter = 'all';
  templateUnlocked = false;
  document.querySelector('input[name="template"][value="newspaper"]').checked = true;
  initialDelayInput.value = '10';
  shotIntervalInput.value = '3';
  templateFilters.querySelectorAll('button').forEach((item) => {
    item.classList.toggle('active', item.dataset.category === 'all');
  });
  finalConfirmButton.disabled = true;
  savedPath.textContent = '';
  lastVideoUrl = null;
  updateWatchButtons();
  videoSaved.textContent = 'Ảnh gốc đã được lưu trong máy.';
  photoGallery.replaceChildren();
  stageFooterHint.textContent = 'Chọn bố cục → live preview → chụp';
  updatePreview();
  showScreen('template-start');
  updateCaptureButton();
  status.textContent = webcamStream
    ? `${activeVideoLabel} đã sẵn sàng cho bộ mới.`
    : cameraConnected ? 'Sẵn sàng chụp bộ mới.' : 'Cắm máy ảnh USB hoặc chọn nguồn hình để bắt đầu.';
}

retakeButton.addEventListener('click', resetSession);
changeTemplateButton.addEventListener('click', () => {
  if (capturing) return;
  templateChosen = false;
  stopWebcam();
  showScreen('template-start');
  updateCaptureButton();
});
editSelectionButton.addEventListener('click', () => {
  updatePreview();
  showScreen('selection');
});

function closeQrScreen() {
  if (qrTimerHandle) clearInterval(qrTimerHandle);
  qrTimerHandle = null;
  clearInterval(qrStatusTimer);
  qrStatusTimer = null;
  displayedSessionToken = null;
  sessionQr.hidden = true;
  sessionQr.removeAttribute('src');
  qrScreen.hidden = true;
  templateGrid.querySelector('.template-choice')?.focus();
}

function showSessionQr(token, result) {
  displayedSessionToken = token;
  function update(result) {
    exportStatus.textContent = ({
      queued: 'Ảnh đã lưu trên máy. Quét QR để chờ album đồng bộ.',
      ready: 'Album đã sẵn sàng. Quét QR để xem và tải ảnh.',
      expired: 'Link album đã hết hạn. Các file vẫn được lưu trên máy.',
      local: 'Ảnh đã lưu trên máy. Gallery online chưa được cấu hình.'
    })[result.state] || 'Đang chuẩn bị album.';
    if (result.state === 'expired') sessionQr.hidden = true;
    if (result.state !== 'queued') clearInterval(qrStatusTimer);
  }
  if (result.qr) {
    sessionQr.src = result.qr;
    sessionQr.hidden = false;
  }
  update(result);
  if (result.state === 'queued') {
    qrStatusTimer = setInterval(async () => {
      const next = await window.photobooth.gallerySessionStatus(token).catch(() => null);
      if (next && displayedSessionToken === token) update(next);
    }, 1800);
  }
}

nextGuestButton.addEventListener('click', closeQrScreen);

function openPhotoPicker() {
  if (!activeTemplateId) templateGrid.querySelector('.template-choice')?.click();
  if (!activeTemplateId) return;
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp';
  picker.multiple = true;
  picker.hidden = true;
  document.body.append(picker);
  picker.addEventListener('cancel', () => picker.remove(), { once: true });
  picker.addEventListener('change', async () => {
    const files = Array.from(picker.files);
    picker.remove();
    const needed = layouts[selected('template')].count;
    if (files.length < needed) {
      templateExportStatus.textContent = `Chọn ít nhất ${needed} ảnh để thử bố cục này.`;
      return;
    }
    finalConfirmButton.disabled = true;
    importButton.disabled = true;
    layoutSection.inert = templateGrid.inert = templateFilters.inert = true;
    templateExportStatus.textContent = 'Đang nạp ảnh thử…';
    try {
      const photos = [];
      const failures = [];
      for (const file of files) {
        const url = URL.createObjectURL(file);
        try {
          const image = await window.loadNewspaperPhoto(url);
          const canvas = document.createElement('canvas');
          const ratio = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
          const context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          photos.push(await window.photobooth.saveWebcamPhoto(canvas.toDataURL('image/jpeg', .92)));
        } catch {
          failures.push(file.name);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (photos.length < needed) {
        templateExportStatus.textContent = `Chỉ nạp được ${photos.length}/${needed} ảnh cần thiết. Hãy chọn ảnh khác.`;
        return;
      }
      templateExportStatus.textContent = '';
      activeSessionToken = await window.photobooth.startGallerySession();
      for (const photo of photos) await window.photobooth.recordGalleryAsset(activeSessionToken, 'original', photo.filePath);
      newspaperPositions.clear();
      capturedPhotos = photos;
      chosenIndices = [];
      if (failures.length) videoSaved.textContent = `Không nạp được: ${failures.join(', ')}.`;
      updateSelection();
      showScreen('selection');
    } catch (error) {
      templateExportStatus.textContent = `Không mở được phiên ảnh: ${error.message}`;
    } finally {
      layoutSection.inert = templateGrid.inert = templateFilters.inert = false;
      importButton.disabled = false;
      finalConfirmButton.disabled = !activeTemplateId;
    }
  }, { once: true });
  picker.click();
}

importButton.addEventListener('click', openPhotoPicker);

finalConfirmButton.addEventListener('click', async () => {
  if (document.body.dataset.screen === 'template-start') {
    if (!activeTemplateId) return;
    templateChosen = true;
    showScreen('setup');
    updateCaptureButton();
    if (pendingAutoVideoDeviceId) openVideoSource(pendingAutoVideoDeviceId, true);
    else scanVideoDevices();
    return;
  }
  if (!templateUnlocked || !activeTemplateId) return;
  finalConfirmButton.disabled = true;
  editSelectionButton.disabled = true;
  templateExportStatus.textContent = 'Đang xuất ảnh đã chọn ở độ phân giải gốc…';
  let galleryResult;
  const token = activeSessionToken;
  try {
    const selectedPhotos = [];
    for (const index of chosenIndices) {
      const dataUrl = await window.photobooth.fullPhoto(capturedPhotos[index].filePath);
      const image = await window.loadNewspaperPhoto(dataUrl);
      selectedPhotos.push(image);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (photoMode === 'bw') {
        context.filter = 'grayscale(1) contrast(1.04)';
      }
      context.drawImage(image, 0, 0);
      await window.photobooth.saveExport(canvas.toDataURL('image/jpeg', .94));
    }
    const design = templates.find((item) => item.id === activeTemplateId);
    await window.newspaperAssetsReady;
    let dataUrl;
    if (design.newspaper) {
      const composite = document.createElement('canvas');
      window.drawCuChiNewspaper(composite, design, selectedPhotos[0], photoMode, 4.5, newspaperPositions.get(newspaperPositionKey(design)));
      dataUrl = composite.toDataURL('image/jpeg', .96);
    } else {
      dataUrl = await window.renderFrameExport(printMockup, selected('template'), selectedPhotos, photoMode);
    }
    const file = await window.photobooth.saveExport(dataUrl);
    galleryResult = await window.photobooth.publishGallerySession(token, file);
  } catch (error) {
    templateExportStatus.textContent = `Không xuất được ảnh: ${error.message}`;
    finalConfirmButton.disabled = false;
    editSelectionButton.disabled = false;
    return;
  }
  resetSession();
  editSelectionButton.disabled = false;
  qrScreen.hidden = false;
  showSessionQr(token, galleryResult);
  nextGuestButton.focus();
  let remaining = 20;
  qrTimer.textContent = `Tự trở về màn đầu sau ${remaining} giây`;
  if (qrTimerHandle) clearInterval(qrTimerHandle);
  qrTimerHandle = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) closeQrScreen();
    else qrTimer.textContent = `Tự trở về màn đầu sau ${remaining} giây`;
  }, 1000);
});

cancelButton.addEventListener('click', () => {
  cancelRequested = true;
  cancelButton.disabled = true;
  status.textContent = 'Đang dừng sau ảnh hiện tại…';
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function countdown(seconds, heading) {
  if (!seconds) return;
  shootNumber.hidden = false;
  try {
    for (let remaining = seconds; remaining > 0; remaining--) {
      if (cancelRequested) throw new Error('Đã dừng buổi chụp.');
      shootNumber.textContent = String(remaining);
      status.textContent = `${heading}: ${remaining} giây`;
      await wait(1000);
    }
  } finally {
    shootNumber.hidden = true;
  }
}

async function captureWebcamPhoto() {
  if (!videoSignalReady || !videoFrameIsUsable()) throw new Error('Nguồn video chưa có tín hiệu để chụp.');
  const width = Math.min(webcamPreview.videoWidth, 3840);
  if (!width || !webcamPreview.videoHeight) throw new Error('Webcam chưa có hình ảnh. Hãy thử mở lại webcam.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * webcamPreview.videoHeight / webcamPreview.videoWidth);
  const context = canvas.getContext('2d');
  if (mirrorVideo) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(webcamPreview, 0, 0, canvas.width, canvas.height);
  return window.photobooth.saveWebcamPhoto(canvas.toDataURL('image/jpeg', 0.95), activeSessionToken);
}

async function startSessionVideo() {
  const mimeType = ['video/mp4;codecs=avc1.42001f', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp8', 'video/webm']
    .find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('Electron không hỗ trợ ghi video trên máy này.');
  const width = Math.min(webcamPreview.videoWidth, 960);
  if (!width || !webcamPreview.videoHeight) throw new Error('Webcam chưa có hình để quay video.');
  const height = Math.round(width * webcamPreview.videoHeight / webcamPreview.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const draw = () => {
    if (!videoSignalReady || !videoFrameIsUsable()) return false;
    context.setTransform(mirrorVideo ? -1 : 1, 0, 0, 1, mirrorVideo ? width : 0, 0);
    context.drawImage(webcamPreview, 0, 0, width, height);
    return true;
  };
  if (!draw()) throw new Error('Nguồn video chưa có tín hiệu để quay.');
  const stream = canvas.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0];
  let drawTimer = null;
  let id;
  try {
    ({ id } = await window.photobooth.beginVideo(mimeType));
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    let queue = Promise.resolve();
    let resolveFinished;
    let rejectFinished;
    const finished = new Promise((resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    });
    finished.catch(() => {});
    recorder.addEventListener('dataavailable', (event) => {
      if (!event.data.size) return;
      queue = queue.then(async () => {
        const chunk = new Uint8Array(await event.data.arrayBuffer());
        await window.photobooth.appendVideo(id, chunk);
      });
      queue.catch(() => {});
    });
    recorder.addEventListener('stop', async () => {
      clearInterval(drawTimer);
      stream.getTracks().forEach((track) => track.stop());
      recordingIndicator.hidden = true;
      try {
        await queue;
        resolveFinished(await window.photobooth.endVideo(id));
      } catch (error) {
        await window.photobooth.abortVideo(id);
        rejectFinished(error);
      }
    }, { once: true });
    recorder.addEventListener('error', (event) => {
      rejectFinished(event.error || new Error('Không thể ghi video.'));
    }, { once: true });
    recorder.start(1000);
    videoTrack.requestFrame();
    drawTimer = setInterval(() => {
      if (draw()) videoTrack.requestFrame();
    }, 1000 / VIDEO_FPS);
    const startedAt = Date.now();
    recordingTime.textContent = '00:00';
    recordingIndicator.hidden = false;
    const clockTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      recordingTime.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
    return {
      stop() {
        clearInterval(clockTimer);
        if (recorder.state === 'recording') recorder.stop();
        return finished;
      }
    };
  } catch (error) {
    clearInterval(drawTimer);
    stream.getTracks().forEach((track) => track.stop());
    if (id) await window.photobooth.abortVideo(id);
    throw error;
  }
}

async function waitForCaptureSignal() {
  if (!captureUsesVideo) return;
  const deadline = performance.now() + 7000;
  while (performance.now() < deadline) {
    if (cancelRequested) throw new Error('Đã dừng buổi chụp.');
    if (!webcamStream) throw new Error('Nguồn video đã ngắt kết nối.');
    if (videoSignalReady && videoFrameIsUsable()) return;
    await wait(150);
  }
  throw new Error('Nguồn video vẫn chưa có tín hiệu.');
}

captureButton.addEventListener('click', async () => {
  if (!templateChosen || capturing || detecting || (!cameraConnected && !webcamStream) ||
      (webcamStream && (!videoSignalReady || !videoFrameIsUsable()))) return;
  if (!cameraConnected && captureCardName.test(activeVideoLabel)) {
    status.textContent = 'Chưa nhận máy ảnh qua USB. Capture card chỉ cung cấp live view, không thể chụp ảnh gốc hoặc kích flash.';
    return;
  }
  const count = SHOT_COUNT;
  const initialDelay = configValue(initialDelayInput, 0, 30);
  const interval = configValue(shotIntervalInput, 1, 15);
  let source = cameraConnected ? 'gphoto' : 'webcam';
  let videoController = null;
  capturing = true;
  captureUsesVideo = Boolean(webcamStream);
  cancelRequested = false;
  newspaperPositions.clear();
  capturedPhotos = [];
  chosenIndices = [];
  lastVideoUrl = null;
  updateWatchButtons();
  showScreen('setup');
  shootProgress.textContent = `1/${count}`;
  shootOverlay.hidden = false;
  stageFooterHint.textContent = 'Chụp → chọn ảnh → xem thành phẩm';
  cancelButton.hidden = false;
  cancelButton.disabled = false;
  document.body.classList.add('shooting');
  updateCaptureButton();
  updatePreview();
  try {
    activeSessionToken = await window.photobooth.startGallerySession();
    if (webcamStream) {
      try { videoController = await startSessionVideo(); }
      catch (error) { videoSaved.textContent = `Không quay được video: ${error.message}`; }
    }
    for (let index = 0; index < count; index++) {
      shootProgress.textContent = `${index + 1}/${count}`;
      await countdown(index ? interval : initialDelay, index ? 'ẢNH TIẾP THEO' : 'BẮT ĐẦU SAU');
      if (cancelRequested) throw new Error('Đã dừng buổi chụp.');
      await waitForCaptureSignal();
      status.textContent = `Đang chụp ảnh ${index + 1}/${count}…`;
      let result;
      if (source === 'gphoto') {
        try {
          usbPreviewPaused = true;
          result = await window.photobooth.capturePhoto(activeSessionToken);
        } catch (error) {
          if (!webcamStream || captureCardName.test(activeVideoLabel)) {
            throw new Error(`Máy ảnh USB chụp không thành công: ${error.message}. Kiểm tra kết nối USB và chế độ điều khiển từ máy tính.`);
          }
          source = 'webcam';
          status.textContent = `Máy ảnh USB không chụp được; tiếp tục lấy ảnh từ ${activeVideoLabel}.`;
          result = await captureWebcamPhoto();
        } finally {
          usbPreviewPaused = false;
          usbPreviewRetryAt = Math.max(usbPreviewRetryAt, Date.now() + 350);
        }
      } else result = await captureWebcamPhoto();
      capturedPhotos.push(result);
      savedPath.textContent = `Ảnh gốc lưu tại: ${result.filePath}`;
    }
    status.textContent = `Đã chụp ${capturedPhotos.length} ảnh. Hãy chọn ${layouts[selected('template')].count} ảnh yêu thích.`;
  } catch (error) {
    status.textContent = `${error.message} Đã lưu ${capturedPhotos.length} ảnh.`;
  } finally {
    if (videoController) {
      try {
        const video = await videoController.stop();
        lastVideoUrl = video.fileUrl;
        await window.photobooth.recordGalleryAsset(activeSessionToken, 'video', video.filePath);
        updateWatchButtons();
        videoSaved.textContent = `Video buổi chụp đã lưu: ${video.filePath}`;
      } catch (error) {
        videoSaved.textContent = `Không lưu được video: ${error.message}`;
      }
    }
    capturing = false;
    captureUsesVideo = false;
    document.body.classList.remove('shooting');
    shootOverlay.hidden = true;
    cancelButton.hidden = true;
    if (capturedPhotos.length > 0) {
      updateSelection();
      showScreen('selection');
    } else syncStagePreview();
    updateCaptureButton();
    checkCamera();
  }
});
