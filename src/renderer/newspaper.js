// One drawing path keeps the gallery, preview, and full-resolution JPEG in sync.
const newspaperPhotos = new Map();
const newspaperFont = '"Fraunces", Georgia, serif';
const newspaperDateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric'
});
const newspaperFontsReady = document.fonts.load('900 32px "Fraunces"', 'CÓ HẸN VỚI CỦ CHI')
  .catch((error) => console.warn('Không tải được font trang báo.', error));

window.newspaperPhotoCrop = function newspaperPhotoCrop(photo, [, , width, height]) {
  const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
  const w = width / scale;
  const h = height / scale;
  return { w, h, overflowX: Math.max(0, photo.naturalWidth - w), overflowY: Math.max(0, photo.naturalHeight - h), scale };
};

window.drawCuChiNewspaper = function drawCuChiNewspaper(canvas, design, photo, mode, scale = 2, position = { x: .5, y: .5 }) {
  const { paper, accent, ink, folio, bottom, masthead, caption, copy, layout } = design.newspaper;
  const { photo: photoBox, art, articles, headline, issue } = layout;
  canvas.width = 432 * scale;
  canvas.height = 620 * scale;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(scale, scale);

  function rect([x, y, w, h], color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function line(x, y, endX, endY, color = ink) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  function text(value, x, y, width, font, color = ink, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = font + ' ' + newspaperFont;
    ctx.textAlign = align;
    ctx.fillText(value.normalize('NFC'), x, y, width);
  }

  function paragraph(value, [x, y, width], bottom) {
    const font = '400 5.6px';
    const columns = Math.ceil(width / 150);
    const gutter = 8;
    const w = (width - (columns - 1) * gutter) / columns;
    ctx.font = font + ' ' + newspaperFont;
    const lines = [];
    let row = [];
    for (const word of value.normalize('NFC').split(' ')) {
      if (row.length && ctx.measureText([...row, word].join(' ')).width > w) {
        lines.push(row);
        row = [];
      }
      row.push(word);
    }
    if (row.length) lines.push(row);
    const leading = 7.1;
    const capacity = Math.max(1, Math.floor((bottom - y) / leading) + 1);
    const perColumn = Math.min(capacity, Math.ceil(lines.length / columns));
    const visible = lines.slice(0, perColumn * columns);
    visible.forEach((words, index) => {
      const xStart = x + Math.floor(index / perColumn) * (w + gutter);
      const baseline = y + (index % perColumn) * leading;
      if (index === visible.length - 1 && visible.length < lines.length) {
        while (words.length && ctx.measureText(words.join(' ') + '…').width > w) words.pop();
        text(words.join(' ') + '…', xStart, baseline, w, font, ink, 'left');
      } else if (index === lines.length - 1) {
        text(words.join(' '), xStart, baseline, w, font, ink, 'left');
      } else {
        const widths = words.map((part) => ctx.measureText(part).width);
        const gap = words.length > 1 ? (w - widths.reduce((sum, wordWidth) => sum + wordWidth, 0)) / (words.length - 1) : 0;
        let left = xStart;
        words.forEach((part, wordIndex) => {
          text(part, left, baseline, w, font, ink, 'left');
          left += widths[wordIndex] + gap;
        });
      }
    });
  }

  rect([0, 0, 432, 620], paper);
  for (let y = 0; y < 620; y += 5) {
    for (let x = y % 7; x < 432; x += 11) rect([x, y, .5, .5], '#5c422416');
  }

  ctx.strokeStyle = ink;
  ctx.strokeRect(14, 18, 404, 83);
  ctx.strokeRect(17, 21, 398, 77);
  line(77, 35, 77, 84);
  line(355, 35, 355, 84);
  text(issue === 'ĐB' ? 'ĐẶC BIỆT' : 'SỐ ' + issue, 47, 53, 50, 'bold 12px');
  text(newspaperDateFormat.format(Date.now()), 47, 70, 50, '700 8px');
  text('CỦ CHI', 385, 53, 48, 'bold 11px');
  text('✦', 385, 73, 40, '13px', accent);
  line(180, 38, 204, 38, accent);
  line(228, 38, 252, 38, accent);
  text('✦', 216, 42, 16, '11px', accent);
  text(masthead, 216, 70, 252, '900 29px');
  text(caption, 216, 88, 251, '8px');

  const [hx, hy, hw, fontSize = 33] = headline;
  rect([hx, hy, hw, 18], accent);
  text(folio, hx + hw / 2, hy + 13, hw - 9, 'bold 9px', paper);
  text(design.title, hx + hw / 2, hy + 55, hw, '900 ' + fontSize + 'px');
  line(hx, hy + 64, hx + hw, hy + 64);
  line(hx, hy + 67, hx + hw, hy + 67);

  const [px, py, pw, ph] = photoBox;
  if (photo) {
    const { w, h, overflowX, overflowY } = window.newspaperPhotoCrop(photo, photoBox);
    ctx.save();
    if (mode === 'bw') ctx.filter = 'grayscale(1) contrast(1.04)';
    ctx.drawImage(photo, overflowX * position.x, overflowY * position.y, w, h, px, py, pw, ph);
    ctx.restore();
  } else {
    rect(photoBox, '#d5d3cc');
    text('ẢNH CỦA BẠN', px + pw / 2, py + ph / 2 + 5, pw - 10, 'bold 13px', '#57534e');
  }
  ctx.strokeStyle = ink;
  ctx.strokeRect(px, py, pw, ph);

  const editorialPhoto = newspaperPhotos.get(design.id);
  if (editorialPhoto) {
    const { w, h, overflowX, overflowY } = window.newspaperPhotoCrop(editorialPhoto, art);
    ctx.save();
    ctx.filter = 'saturate(.64) sepia(.12)';
    ctx.drawImage(editorialPhoto, overflowX / 2, overflowY / 2, w, h, ...art);
    ctx.restore();
  }
  for (const x of layout.columnRules || []) line(x, articles[0][1] - 19, x, 566, '#887d70');
  const obstacles = [art, photoBox, ...articles.map(([x, y, w]) => [x, y - 10, w])];
  articles.forEach(([x, y, w], index) => {
    const bottom = Math.min(566, ...obstacles
      .filter(([left, top, width]) => top > y && left < x + w && left + width > x)
      .map(([, top]) => top - 6));
    line(x, y - 10, x + w, y - 10, accent);
    paragraph(copy[index] + ' ' + design.newspaper.extraCopy[index], [x, y, w], bottom);
  });

  line(14, 580, 418, 580);
  text('✦  ' + bottom + '  ✦', 216, 600, 380, 'bold 10px', accent);
};

window.loadNewspaperPhoto = async function loadNewspaperPhoto(url) {
  const photo = new Image();
  photo.src = url;
  await photo.decode();
  return photo;
};

window.newspaperAssetsReady = Promise.all([
  newspaperFontsReady,
  ...window.PHOTO_TEMPLATES.filter((design) => design.newspaper).map(async (design) => {
    try {
      const photo = await window.loadNewspaperPhoto('assets/news-' + design.newspaper.editorialPhoto + '.jpg');
      newspaperPhotos.set(design.id, photo);
    } catch (error) {
      console.warn('Unable to load newspaper photo:', design.id, error);
    }
  })
]);

window.renderCuChiNewspaper = async function renderCuChiNewspaper(photoUrl, mode, design, position) {
  const [photo] = await Promise.all([window.loadNewspaperPhoto(photoUrl), window.newspaperAssetsReady]);
  const canvas = document.createElement('canvas');
  window.drawCuChiNewspaper(canvas, design, photo, mode, 4.5, position);
  return canvas.toDataURL('image/jpeg', .96);
};
