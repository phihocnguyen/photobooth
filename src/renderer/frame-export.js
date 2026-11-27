window.renderFrameExport = async function renderFrameExport(mockup, layout, photos, mode) {
  await document.fonts.load('850 14px Fraunces');
  const sizes = { strip: [600, 1800], grid: [1200, 1200], group: [1200, 1800] };
  const [width, height] = sizes[layout];
  const frame = mockup.getBoundingClientRect();
  if (!frame.width || !frame.height) throw new Error('Khung ảnh chưa sẵn sàng.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(width / frame.width, height / frame.height);
  const style = getComputedStyle(mockup);
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, frame.width, frame.height);
  const accent = style.getPropertyValue('--accent').trim();

  function box(element) {
    const rect = element.getBoundingClientRect();
    return [rect.x - frame.x, rect.y - frame.y, rect.width, rect.height];
  }

  function drawText(element, value, align) {
    if (!value) return;
    const computed = getComputedStyle(element);
    const [x, y, w, h] = box(element);
    ctx.fillStyle = computed.color;
    ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    ctx.fillText(value, align === 'center' ? x + w / 2 : align === 'right' ? x + w : x, y + h / 2, w);
  }

  const heading = mockup.querySelector('.print-heading');
  const footer = mockup.querySelector('.print-footer');
  drawText(heading, heading.textContent.trim(), 'center');
  drawText(footer, footer.firstElementChild.textContent, 'left');
  drawText(footer, footer.lastElementChild.textContent, 'right');

  ctx.fillStyle = ctx.strokeStyle = accent;
  if (mockup.classList.contains('design-film-noir')) {
    for (let y = 0; y < frame.height; y += 11) {
      ctx.fillRect(2, y, 2, 4);
      ctx.fillRect(frame.width - 4, y, 2, 4);
    }
  } else if (mockup.classList.contains('design-air-mail')) {
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, frame.width - 2, frame.height - 2);
  } else if (mockup.classList.contains('design-red-ribbon')) {
    ctx.strokeRect(4, 4, frame.width - 8, frame.height - 8);
  }
  for (const element of [heading, footer]) {
    const computed = getComputedStyle(element);
    const [x, y, w, h] = box(element);
    if (parseFloat(computed.borderTopWidth)) ctx.fillRect(x, y, w, 1);
    if (parseFloat(computed.borderBottomWidth)) {
      for (let left = x; left < x + w; left += 5) ctx.fillRect(left, y + h - 1, Math.min(x + w - left, 3), 1);
    }
  }

  [...mockup.querySelectorAll('.print-slot')].forEach((slot, index) => {
    const image = photos[index];
    const bounds = box(slot);
    const { w, h, overflowX, overflowY } = window.newspaperPhotoCrop(image, bounds);
    const radius = slot.getBoundingClientRect().width * (parseFloat(getComputedStyle(slot).borderRadius) || 0) / 100;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(...bounds, radius);
    ctx.clip();
    if (mode === 'bw') ctx.filter = 'grayscale(1) contrast(1.04)';
    ctx.drawImage(image, overflowX / 2, overflowY / 2, w, h, ...bounds);
    ctx.restore();
  });
  return canvas.toDataURL('image/jpeg', .96);
};
