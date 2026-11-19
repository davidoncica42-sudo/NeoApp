import { useState, type FormEvent } from 'react';
import { Icon } from './Icon';
import type { ExportFormat } from '../types';

interface ExportDialogProps {
  fileName: string;
  width: number;
  height: number;
  onClose: () => void;
  onExport: (format: ExportFormat, name: string, quality: number) => void;
}

const formats: { id: ExportFormat; label: string; note: string }[] = [
  { id: 'image/jpeg', label: 'JPEG', note: 'Ligero · compatible' },
  { id: 'image/png', label: 'PNG', note: 'Sin pérdida · transparencia' },
  { id: 'image/webp', label: 'WebP', note: 'Alta calidad · compacto' },
];

export function ExportDialog({ fileName, width, height, onClose, onExport }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('image/jpeg');
  const [quality, setQuality] = useState(92);
  const [name, setName] = useState(fileName.replace(/\.[^.]+$/, '') || 'neoapp-edit');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onExport(format, name.trim() || 'neoapp-edit', quality / 100);
  }

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">LISTO PARA COMPARTIR</span>
            <h2 id="export-title">Exportar imagen</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
        </div>
        <p className="dialog-caption">Tu archivo se procesa en este dispositivo. La foto no se sube a ningún servidor.</p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="export-name">Nombre del archivo</label>
          <div className="file-name-field">
            <input id="export-name" autoFocus value={name} onChange={(event) => setName(event.currentTarget.value)} />
            <span>.{format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'}</span>
          </div>

          <span className="field-label">Formato</span>
          <div className="format-options">
            {formats.map((option) => (
              <button
                key={option.id}
                type="button"
                className={'format-option' + (format === option.id ? ' is-selected' : '')}
                onClick={() => setFormat(option.id)}
              >
                <span className="format-name">{option.label}</span>
                <span className="format-note">{option.note}</span>
                {format === option.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>

          {format !== 'image/png' && (
            <label className="quality-field">
              <span className="slider-heading"><span>Calidad</span><span className="slider-value">{quality}%</span></span>
              <input aria-label="Calidad de exportación" type="range" min="60" max="100" value={quality} onChange={(event) => setQuality(Number(event.currentTarget.value))} />
            </label>
          )}

          <div className="export-meta"><Icon name="image" size={16} /> {width} × {height} px <span>•</span> Sin marca de agua</div>
          <button className="primary-button export-submit" type="submit"><Icon name="export" size={17} /> Descargar archivo</button>
        </form>
      </section>
    </div>
  );
}
