export interface AdjustmentValues {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  saturation: number;
}

export type AdjustmentKey = keyof AdjustmentValues;

export const INITIAL_ADJUSTMENTS: AdjustmentValues = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  saturation: 0,
};

export interface Preset {
  id: string;
  name: string;
  description: string;
  adjustments: AdjustmentValues;
  swatches: [string, string, string];
}

export type EditorTool = 'adjust' | 'crop' | 'looks' | 'layers';

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';
