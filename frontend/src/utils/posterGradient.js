const DEFAULT_DETAIL_GRADIENT =
  'linear-gradient(140deg, rgba(56, 217, 255, 0.3) 0%, rgba(255, 102, 122, 0.22) 42%, rgba(5, 12, 22, 0.92) 100%)';

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const colorDistance = (a, b) => {
  const r = a[0] - b[0];
  const g = a[1] - b[1];
  const bDiff = a[2] - b[2];
  return Math.sqrt((r * r) + (g * g) + (bDiff * bDiff));
};

const withAlpha = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

const blendColor = (base, target, factor) => {
  const next = [0, 0, 0];

  for (let i = 0; i < 3; i += 1) {
    next[i] = clampChannel(base[i] + ((target[i] - base[i]) * factor));
  }

  return next;
};

const parseBucketKey = (key) => key.split('-').map((value) => Number(value));

const pickSecondaryColor = (primary, palette) => {
  const distinct = palette.find((color) => colorDistance(primary, color) > 85);

  if (distinct) {
    return distinct;
  }

  return blendColor(primary, [255, 160, 112], 0.3);
};

const extractPalette = (pixelData) => {
  const bucketCounts = new Map();

  for (let i = 0; i < pixelData.length; i += 16) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];
    const alpha = pixelData[i + 3];

    if (alpha < 110) {
      continue;
    }

    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    if (brightness < 24 || brightness > 245 || saturation < 16) {
      continue;
    }

    const bucket = [
      Math.round(r / 24) * 24,
      Math.round(g / 24) * 24,
      Math.round(b / 24) * 24
    ];

    const key = `${bucket[0]}-${bucket[1]}-${bucket[2]}`;
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
  }

  return Array.from(bucketCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => parseBucketKey(key));
};

const loadImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';

  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load image for palette extraction'));

  image.src = url;
});

export const buildPosterGradient = async (imageUrl) => {
  if (!imageUrl) {
    return DEFAULT_DETAIL_GRADIENT;
  }

  try {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return DEFAULT_DETAIL_GRADIENT;
    }

    canvas.width = 42;
    canvas.height = 42;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const palette = extractPalette(pixelData);

    if (!palette.length) {
      return DEFAULT_DETAIL_GRADIENT;
    }

    const primary = palette[0];
    const secondary = pickSecondaryColor(primary, palette.slice(1));

    return `linear-gradient(140deg, ${withAlpha(primary, 0.56)} 0%, ${withAlpha(secondary, 0.35)} 44%, rgba(5, 12, 22, 0.92) 100%)`;
  } catch {
    return DEFAULT_DETAIL_GRADIENT;
  }
};

export { DEFAULT_DETAIL_GRADIENT };