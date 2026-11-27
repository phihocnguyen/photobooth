// Match the standard HDMI test bars in two separate horizontal rows.
const signalCanvas = document.createElement('canvas');
signalCanvas.width = 42;
signalCanvas.height = 8;
const signalContext = signalCanvas.getContext('2d', { willReadFrequently: true });
const barColors = [7, 6, 3, 2, 5, 4, 1]; // White, yellow, cyan, green, magenta, red, blue.

function hasVideoTestPattern(video) {
  signalContext.drawImage(video, 0, 0, signalCanvas.width, signalCanvas.height);
  const pixels = signalContext.getImageData(0, 0, signalCanvas.width, signalCanvas.height).data;
  function matches(colors) {
    return [1, 3].every((y) => colors.every((expected, index) => {
      const x = Math.floor((index + .5) * signalCanvas.width / colors.length);
      const offset = (y * signalCanvas.width + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const high = Math.max(red, green, blue);
      const low = Math.min(red, green, blue);
      if (expected === 7) return high >= 100 && high - low < 42;
      if (high < 105 || high - low < 55) return false;
      const middle = (high + low) / 2;
      const actual = (red > middle ? 4 : 0) + (green > middle ? 2 : 0) + (blue > middle ? 1 : 0);
      return actual === expected;
    }));
  }
  return matches(barColors) || matches(barColors.slice(1));
}
