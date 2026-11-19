import type { Preset } from '../types';

export const PRESETS: Preset[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Luz natural y color real.',
    adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, saturation: 0 },
    swatches: ['#d9a879', '#819a91', '#263c43'],
  },
  {
    id: 'golden',
    name: 'Golden hour',
    description: 'Un brillo cálido y suave.',
    adjustments: { exposure: 5, contrast: 7, highlights: -16, shadows: 10, temperature: 22, saturation: 7 },
    swatches: ['#edbd82', '#d39470', '#526d72'],
  },
  {
    id: 'cinema',
    name: 'Cinema',
    description: 'Sombras profundas y tonos serenos.',
    adjustments: { exposure: -5, contrast: 20, highlights: -18, shadows: -3, temperature: -8, saturation: -9 },
    swatches: ['#d2a47a', '#607f80', '#182d3a'],
  },
  {
    id: 'soft',
    name: 'Soft focus',
    description: 'Contraste bajo y luz difusa.',
    adjustments: { exposure: 8, contrast: -12, highlights: -8, shadows: 15, temperature: 7, saturation: -5 },
    swatches: ['#f1c99c', '#a8b8a5', '#75817e'],
  },
  {
    id: 'mono',
    name: 'Monochrome',
    description: 'Una lectura en blanco y negro.',
    adjustments: { exposure: 0, contrast: 15, highlights: -8, shadows: 4, temperature: 0, saturation: -100 },
    swatches: ['#e2dfd8', '#878986', '#252a2b'],
  },
];
