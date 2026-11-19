import type { CSSProperties } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onBegin: () => void;
  onChange: (value: number) => void;
  onCommit: () => void;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, unit = '', onBegin, onChange, onCommit, disabled = false }: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className={'slider-row' + (disabled ? ' is-disabled' : '')}>
      <span className="slider-heading">
        <span>{label}</span>
        <span className="slider-value">{value > 0 ? '+' : ''}{value}{unit}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ '--range-progress': progress + '%' } as CSSProperties}
        onPointerDown={onBegin}
        onPointerUp={onCommit}
        onKeyDown={onBegin}
        onKeyUp={onCommit}
        onBlur={onCommit}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
