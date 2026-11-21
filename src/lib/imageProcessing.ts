import type { AdjustmentValues, ExportFormat } from '../types';

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  cropRatio: number | null;
  rotation: number;
  flipHorizontal: boolean;
  opacity: number;
  visible: boolean;
}

export interface ExportOverlay {
  image: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
}

export function filterForAdjustments(adjustments: AdjustmentValues) {
  const brightness = Math.max(0.25, 1 + adjustments.exposure / 100 + adjustments.shadows / 500);
  const contrast = Math.max(0.25, 1 + adjustments.contrast / 100 - adjustments.highlights / 800);
  const saturation = Math.max(0, 1 + (adjustments.saturation + adjustments.vibrance * 0.55) / 100);
  const sepia = Math.max(0, adjustments.temperature) / 100 * 0.2;
  const hue = adjustments.temperature < 0 ? ' hue-rotate(' + (adjustments.temperature * 0.22) + 'deg)' : '';
  return [
    'brightness(' + brightness.toFixed(3) + ')',
    'contrast(' + contrast.toFixed(3) + ')',
    'saturate(' + saturation.toFixed(3) + ')',
    'sepia(' + sepia.toFixed(3) + ')',
  ].join(' ') + hue + ' hue-rotate(' + adjustments.hue + 'deg)';
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo abrir esta imagen.'));
    image.src = src;
  });
}

export function createHistogram(image: HTMLImageElement): number[] {
  const canvas = document.createElement('canvas');
  const width = 128;
  const height = 80;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return Array.from({ length: 32 }, () => 0);

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const bins = Array.from({ length: 32 }, () => 0);
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round((pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 8);
    bins[Math.min(31, luminance)] += 1;
  }
  const peak = Math.max(...bins, 1);
  return bins.map((value) => value / peak);
}

export async function exportImage(image: HTMLImageElement, options: ExportOptions, adjustments: AdjustmentValues, overlays: ExportOverlay[] = []): Promise<Blob> {
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
    throw new Error('La imagen todavía no está lista.');
  }

  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const pixels = sourceWidth * sourceHeight;
  const scale = Math.min(1, 12000 / Math.max(sourceWidth, sourceHeight), Math.sqrt(48000000 / pixels));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const normalizedRotation = ((options.rotation % 360) + 360) % 360;
  const quarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
  const rotated = document.createElement('canvas');
  rotated.width = quarterTurn ? height : width;
  rotated.height = quarterTurn ? width : height;
  const rotatedContext = rotated.getContext('2d');
  if (!rotatedContext) throw new Error('El navegador no pudo preparar la imagen.');
  rotatedContext.translate(rotated.width / 2, rotated.height / 2);
  rotatedContext.rotate((normalizedRotation * Math.PI) / 180);
  rotatedContext.scale(options.flipHorizontal ? -1 : 1, 1);
  if (options.visible) {
    rotatedContext.globalAlpha = Math.max(0, Math.min(1, options.opacity));
    rotatedContext.drawImage(image, -width / 2, -height / 2, width, height);
  }

  let sx = 0;
  let sy = 0;
  let sw = rotated.width;
  let sh = rotated.height;
  if (options.cropRatio && options.cropRatio > 0) {
    if (sw / sh > options.cropRatio) {
      const croppedWidth = sh * options.cropRatio;
      sx = (sw - croppedWidth) / 2;
      sw = croppedWidth;
    } else {
      const croppedHeight = sw / options.cropRatio;
      sy = (sh - croppedHeight) / 2;
      sh = croppedHeight;
    }
  }

  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(sw));
  output.height = Math.max(1, Math.round(sh));
  const context = output.getContext('2d');
  if (!context) throw new Error('El navegador no pudo crear la exportación.');

  if (options.format === 'image/jpeg') {
    context.fillStyle = '#111315';
    context.fillRect(0, 0, output.width, output.height);
  }
  if (options.visible) {
    context.filter = filterForAdjustments(adjustments);
    context.globalAlpha = Math.max(0, Math.min(1, options.opacity));
    context.drawImage(rotated, sx, sy, sw, sh, 0, 0, output.width, output.height);
  }
  context.filter = filterForAdjustments(adjustments);
  overlays.forEach((overlay) => {
    if (!overlay.visible || !overlay.image.complete) return;
    const overlayWidth = output.width * Math.max(0.05, Math.min(1.5, overlay.scale / 100));
    const overlayHeight = overlayWidth * overlay.image.naturalHeight / Math.max(1, overlay.image.naturalWidth);
    context.globalAlpha = Math.max(0, Math.min(1, overlay.opacity / 100));
    context.drawImage(overlay.image, output.width * overlay.x / 100 - overlayWidth / 2, output.height * overlay.y / 100 - overlayHeight / 2, overlayWidth, overlayHeight);
  });
  context.globalAlpha = 1;

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, options.format, options.quality));
  rotated.width = 0;
  rotated.height = 0;
  output.width = 0;
  output.height = 0;
  if (!blob) throw new Error('No se pudo generar el archivo. Prueba con otro formato.');
  return blob;
}

