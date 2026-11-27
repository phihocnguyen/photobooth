// Draw the complete page at print resolution. Text and rules are rendered from
// code; the selected original is sampled only once into its photo window.
window.renderCuChiNewspaper = async function renderCuChiNewspaper(photoUrl, mode) {
  await Promise.all([
    document.fonts.load('italic 700 25px "News Condensed"'),
    document.fonts.load('700 31px "News Condensed"')
  ]);
  const loadImage = (url) => new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => resolve(source);
    source.onerror = () => reject(new Error('Không đọc được ảnh để in báo.'));
    source.src = url;
  });
  const [image, tunnel] = await Promise.all([
    photoUrl, 'assets/cu-chi-tunnel.jpg'
  ].map(loadImage));
  const canvas = document.createElement('canvas');
  const scale = 4.5;
  canvas.width = Math.round(432 * scale);
  canvas.height = Math.round(620 * scale);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(scale, scale);
  const ink = '#464338';
  const red = '#aa463b';
  ctx.fillStyle = '#f4f0e5';
  ctx.fillRect(0, 0, 432, 620);
  // Restrained paper grain, drawn at the final canvas resolution.
  ctx.fillStyle = 'rgba(110,92,65,.045)';
  for (let y = 0; y < 620; y += 7) {
    for (let x = (y * 17) % 11; x < 432; x += 13) ctx.fillRect(x, y, .45, .45);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = .8;
  ctx.strokeRect(16, 19, 400, 72);
  ctx.strokeRect(19, 22, 394, 66);
  ctx.strokeStyle = red;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(29, 32); ctx.lineTo(257, 32); ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(29, 77); ctx.lineTo(257, 77); ctx.stroke();
  ctx.fillStyle = '#34352f';
  ctx.font = 'italic 700 25px "News Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BẢN TIN CỦ CHI', 143, 63, 222);
  ctx.fillStyle = ink;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('ĐẤT THÉP', 340, 47);
  ctx.fillText('THÀNH ĐỒNG', 340, 61);
  ctx.font = '8px Georgia, serif';
  ctx.fillText('✳ Số đặc biệt ✳', 340, 75);
  ctx.strokeStyle = red;
  ctx.lineWidth = .7;
  ctx.beginPath(); ctx.arc(397, 35, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.font = 'bold 6px Georgia, serif';
  ctx.fillStyle = red;
  ctx.fillText('CC', 397, 37);
  ctx.strokeStyle = '#8e897d';
  ctx.lineWidth = .5;
  ctx.beginPath(); ctx.moveTo(104, 101); ctx.lineTo(155, 101); ctx.moveTo(277, 101); ctx.lineTo(328, 101); ctx.stroke();
  ctx.fillStyle = '#686358';
  ctx.font = '8px Georgia, serif';
  ctx.fillText('✦  MỘT NGÀY Ở CỦ CHI  ✦', 216, 104);
  ctx.fillStyle = ink;
  ctx.font = '700 31px "News Condensed", sans-serif';
  ctx.fillText('CÓ HẸN VỚI CỦ CHI', 216, 140, 400);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(16, 157, 400, 198);
  const target = { x: 17, y: 158, w: 398, h: 196 };
  function drawCover(source, box, vintage = false) {
    const ratio = Math.max(box.w / source.naturalWidth, box.h / source.naturalHeight);
    const w = box.w / ratio;
    const h = box.h / ratio;
    const sx = (source.naturalWidth - w) / 2;
    const sy = (source.naturalHeight - h) / 2;
    ctx.save();
    if (vintage) ctx.filter = 'sepia(.27) saturate(.78)';
    ctx.drawImage(source, sx, sy, w, h, box.x, box.y, box.w, box.h);
    ctx.restore();
  }
  ctx.save();
  if (mode === 'bw') ctx.filter = 'grayscale(1) contrast(1.04)';
  drawCover(image, target);
  ctx.restore();
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#777365';
  ctx.fillText('────── ✳ ────── ✳ ────── ✳ ──────', 216, 374);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#aaa391';
  ctx.lineWidth = .5;
  ctx.beginPath(); ctx.moveTo(146, 382); ctx.lineTo(146, 566); ctx.moveTo(280, 382); ctx.lineTo(280, 566); ctx.stroke();
  drawCover(tunnel, { x: 286, y: 481, w: 128, h: 77 }, true);
  const columns = [
    'Địa đạo Củ Chi là dấu ấn của vùng đất thép thành đồng. Những lối đi dưới lòng đất lưu giữ câu chuyện về sự bền bỉ, sáng tạo và tình yêu quê hương. Mỗi chuyến ghé thăm lại mở ra một cách nhìn gần hơn với lịch sử. Giữa nhịp sống hôm nay, nơi ấy vẫn nhắc ta trân trọng những ngày bình yên. Khu di tích đưa người xem đến gần hơn với một thời gian khó và những con người đã đi qua thời ấy.',
    'Củ Chi còn có những con đường rợp bóng cây và một nhịp sống gần gũi. Đi cùng bạn bè, ta có thể dừng chân, trò chuyện và lưu lại vài tấm ảnh thật vui. Một buổi chiều nắng nhẹ cũng đủ thành kỷ niệm. Trang báo nhỏ này dành cho khoảnh khắc mà bạn muốn mang theo sau chuyến đi. Rồi khi xem lại, từng khuôn hình sẽ nhắc về tiếng cười và cảm giác được ở bên nhau.',
    'Có hẹn với Củ Chi là có hẹn với những câu chuyện cũ và niềm vui mới. Hãy giữ lại một nụ cười, một cuộc gặp và cả cảm giác háo hức của ngày hôm nay. Chuyến đi ngắn cũng có thể để lại một kỷ niệm dài lâu.'
  ];
  const boxes = [[17, 126], [152, 124], [286, 128]];
  ctx.fillStyle = ink;
  ctx.font = '9.4px Georgia, serif';
  columns.forEach((copy, index) => {
    const [left, width] = boxes[index];
    const words = copy.split(' ');
    let line = '';
    let y = 395;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        if (y > (index === 2 ? 475 : 558)) break;
        ctx.fillText(line, left, y);
        y += 12;
        line = word;
      } else line = next;
    }
    if (line && y <= (index === 2 ? 475 : 558)) ctx.fillText(line, left, y);
  });
  ctx.strokeStyle = ink;
  ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(16, 579); ctx.lineTo(416, 579); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '10px Georgia, serif';
  ctx.fillText('✦  CỦ CHI · MỘT NGÀY THẬT ĐẸP  ✦', 216, 597);
  return canvas.toDataURL('image/jpeg', .96);
};
