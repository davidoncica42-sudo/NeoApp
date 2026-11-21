import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { ExportDialog } from './components/ExportDialog';
import { Histogram } from './components/Histogram';
import { Icon, type IconName } from './components/Icon';
import { Slider } from './components/Slider';
import { PRESETS } from './data/presets';
import { useEditorState } from './hooks/useEditorState';
import { createHistogram, exportImage, filterForAdjustments, loadImage, type ExportOverlay } from './lib/imageProcessing';
import { INITIAL_ADJUSTMENTS, type AdjustmentKey, type EditorTool, type ExportFormat } from './types';

const DEMO_IMAGE = import.meta.env.BASE_URL + 'demo-landscape.svg';
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 100_000_000;
const MAX_IMAGE_LAYERS = 20;

const tools: { id: EditorTool; label: string; icon: IconName }[] = [
  { id: 'adjust', label: 'Ajustes', icon: 'adjust' },
  { id: 'crop', label: 'Recortar', icon: 'crop' },
  { id: 'looks', label: 'Estilos', icon: 'looks' },
  { id: 'layers', label: 'Capas', icon: 'layers' },
];

const adjustmentRows: { key: AdjustmentKey; label: string; min: number; max: number }[] = [
  { key: 'exposure', label: 'Exposición', min: -100, max: 100 },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
  { key: 'highlights', label: 'Iluminaciones', min: -100, max: 100 },
  { key: 'shadows', label: 'Sombras', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperatura', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturación', min: -100, max: 100 },
  { key: 'vibrance', label: 'Intensidad', min: -100, max: 100 },
  { key: 'hue', label: 'Matiz', min: -180, max: 180 },
];

const cropOptions: { label: string; ratio: number | null }[] = [
  { label: 'Original', ratio: null },
  { label: '1 : 1', ratio: 1 },
  { label: '4 : 5', ratio: 4 / 5 },
  { label: '3 : 2', ratio: 3 / 2 },
  { label: '16 : 9', ratio: 16 / 9 },
  { label: '2 : 3', ratio: 2 / 3 },
  { label: '5 : 7', ratio: 5 / 7 },
  { label: '9 : 16', ratio: 9 / 16 },
  { label: '16 : 10', ratio: 16 / 10 },
];

interface OverlayLayer extends ExportOverlay {
  id: string;
  name: string;
  src: string;
}

interface PhotoMeta {
  name: string;
  width: number;
  height: number;
}

export function App() {
  const editor = useEditorState();
  const fileInput = useRef<HTMLInputElement>(null);
  const addLayerInput = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [meta, setMeta] = useState<PhotoMeta>({ name: 'Quiet coast.svg', width: 1800, height: 1200 });
  const [histogram, setHistogram] = useState<number[]>([]);
  const [activeTool, setActiveTool] = useState<EditorTool>('adjust');
  const [cropRatio, setCropRatio] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(100);
  const [layerVisible, setLayerVisible] = useState(true);
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayer[]>([]);
  const overlayLayersRef = useRef<OverlayLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState('base');
  const [isComparing, setIsComparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  }, []);

  const acceptImage = useCallback(async (file: File, addAsLayer = false) => {
    if (!file.type.startsWith('image/')) {
      showToast('Elige un archivo de imagen, como JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('El archivo supera el límite de 100 MB.');
      return;
    }

    const token = addAsLayer ? null : ++loadTokenRef.current;
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      if (!addAsLayer && token !== loadTokenRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(objectUrl);
        showToast('La imagen supera el límite de 100 megapíxeles.');
        return;
      }
      if (addAsLayer) {
        if (overlayLayers.length >= MAX_IMAGE_LAYERS - 1) {
          URL.revokeObjectURL(objectUrl);
          showToast('El documento admite hasta 20 capas en total, incluido el fondo.');
          return;
        }
        const layer: OverlayLayer = {
          id: window.crypto.randomUUID(), name: file.name, src: objectUrl, image,
          visible: true, opacity: 100, x: 50, y: 50, scale: 50,
        };
        setOverlayLayers((layers) => [...layers, layer]);
        setSelectedLayerId(layer.id);
        showToast('Imagen añadida como capa.');
      } else {
        if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
        overlayLayers.forEach((layer) => URL.revokeObjectURL(layer.src));
        setOverlayLayers([]);
        setSelectedLayerId('base');
        fileUrlRef.current = objectUrl;
        photoRef.current = image;
        setPhoto(image);
        setMeta({ name: file.name, width: image.naturalWidth, height: image.naturalHeight });
        setHistogram(createHistogram(image));
        editor.applyAdjustments(INITIAL_ADJUSTMENTS);
        setCropRatio(null);
        setRotation(0);
        setZoom(100);
        setFlipHorizontal(false);
        setLayerOpacity(100);
        setLayerVisible(true);
        showToast('Imagen lista para editar.');
      }
    } catch {
      URL.revokeObjectURL(objectUrl);
      showToast('No se pudo abrir esa imagen. Prueba con otro archivo.');
    }
  }, [editor, overlayLayers, showToast]);

  useEffect(() => {
    overlayLayersRef.current = overlayLayers;
  }, [overlayLayers]);

  useEffect(() => {
    let cancelled = false;
    loadImage(DEMO_IMAGE).then((image) => {
      if (cancelled) return;
      photoRef.current = image;
      setPhoto(image);
      setHistogram(createHistogram(image));
    }).catch(() => {
      if (!cancelled) showToast('No se pudo cargar la imagen de muestra.');
    });
    return () => {
      cancelled = true;
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      overlayLayersRef.current.forEach((layer) => URL.revokeObjectURL(layer.src));
    };
  }, [showToast]);

  const filter = useMemo(() => filterForAdjustments(editor.adjustments), [editor.adjustments]);
  const photoMegapixels = (meta.width * meta.height / 1_000_000).toFixed(1);
  const cropLabel = cropOptions.find((option) => option.ratio === cropRatio)?.label ?? 'Libre';
  const originalRatio = meta.width / Math.max(1, meta.height);
  const frameRatio = cropRatio ?? originalRatio;
  const rotatedFrameRatio = rotation % 180 === 0 ? frameRatio : 1 / frameRatio;
  const frameWidth = Math.max(240, Math.min(980, Math.round(Math.min(650, window.innerHeight * 0.64) * rotatedFrameRatio)));
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const exportScale = Math.min(1, 12000 / Math.max(meta.width, meta.height), Math.sqrt(48000000 / (meta.width * meta.height)));
  const rotatedWidth = normalizedRotation === 90 || normalizedRotation === 270 ? meta.height : meta.width;
  const rotatedHeight = normalizedRotation === 90 || normalizedRotation === 270 ? meta.width : meta.height;
  const exportWidth = cropRatio ? Math.min(rotatedWidth, rotatedHeight * cropRatio) : rotatedWidth;
  const exportHeight = cropRatio ? Math.min(rotatedHeight, rotatedWidth / cropRatio) : rotatedHeight;

  const openPicker = useCallback(() => fileInput.current?.click(), []);
  const openAddLayerPicker = useCallback(() => addLayerInput.current?.click(), []);
  const selectedOverlay = overlayLayers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedOpacity = selectedOverlay?.opacity ?? layerOpacity;

  function updateSelectedOverlay(update: Partial<OverlayLayer>) {
    if (!selectedOverlay) return;
    setOverlayLayers((layers) => layers.map((layer) => layer.id === selectedOverlay.id ? { ...layer, ...update } : layer));
  }

  function removeOverlay(id: string) {
    const layer = overlayLayers.find((item) => item.id === id);
    if (!layer) return;
    URL.revokeObjectURL(layer.src);
    setOverlayLayers((layers) => layers.filter((item) => item.id !== id));
    if (selectedLayerId === id) setSelectedLayerId('base');
  }

  function moveOverlay(id: string, step: -1 | 1) {
    setOverlayLayers((layers) => {
      const index = layers.findIndex((layer) => layer.id === id);
      const next = index + step;
      if (index < 0 || next < 0 || next >= layers.length) return layers;
      const reordered = [...layers];
      [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
      return reordered;
    });
  }

  const undo = useCallback(() => {
    editor.undo();
    editor.commitAdjustment();
  }, [editor]);

  const redo = useCallback(() => {
    editor.redo();
    editor.commitAdjustment();
  }, [editor]);

  const exportNow = useCallback(async (format: ExportFormat, name: string, quality: number) => {
    const image = photoRef.current;
    if (!image) {
      showToast('Primero abre una imagen.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportImage(image, {
        format,
        quality,
        cropRatio,
        rotation,
        flipHorizontal,
        opacity: layerOpacity / 100,
        visible: layerVisible,
      }, editor.adjustments, overlayLayers);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const extension = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
      anchor.href = url;
      anchor.download = name.trim() + '.' + extension;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setShowExport(false);
      showToast('Exportación descargada.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo exportar la imagen.');
    } finally {
      setIsExporting(false);
    }
  }, [cropRatio, editor.adjustments, flipHorizontal, layerOpacity, layerVisible, overlayLayers, rotation, showToast]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const shortcut = event.ctrlKey || event.metaKey;
      if (shortcut && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        openPicker();
      } else if (shortcut && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setShowExport(true);
      } else if (shortcut && event.key.toLowerCase() === 'z' && !event.shiftKey && !isTyping) {
        event.preventDefault();
        editor.undo();
      } else if (shortcut && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) && !isTyping) {
        event.preventDefault();
        editor.redo();
      } else if (event.code === 'Space' && !isTyping && !event.repeat) {
        event.preventDefault();
        setIsComparing(true);
      } else if (event.key === 'Escape') {
        setShowExport(false);
        setIsComparing(false);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') setIsComparing(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [editor, openPicker]);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void acceptImage(file);
  }

  function choosePreset(presetId: string) {
    const preset = PRESETS.find((candidate) => candidate.id === presetId);
    if (preset) editor.applyAdjustments(preset.adjustments);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark" aria-hidden="true"><span>N</span></div>
          <div className="brand-copy"><strong>neoapp</strong><span>PHOTO STUDIO</span></div>
          <div className="topbar-divider" />
          <div className="document-title">
            <span className="document-name">{meta.name}</span>
            <span className="save-indicator"><i /> Procesado en este dispositivo</span>
          </div>
        </div>

        <div className="topbar-center"><span className="workspace-dot" /> Studio <span className="topbar-slash">/</span> Edición</div>

        <div className="topbar-actions">
          <div className="history-actions" aria-label="Historial de edición">
            <button className="icon-button" type="button" title="Deshacer (Ctrl + Z)" aria-label="Deshacer" disabled={!editor.canUndo} onClick={undo}><Icon name="undo" /></button>
            <button className="icon-button" type="button" title="Rehacer (Ctrl + Shift + Z)" aria-label="Rehacer" disabled={!editor.canRedo} onClick={redo}><Icon name="redo" /></button>
          </div>
          <button
            className={'compare-button' + (isComparing ? ' is-active' : '')}
            type="button"
            onPointerDown={(event) => { event.preventDefault(); setIsComparing(true); }}
            onPointerUp={() => setIsComparing(false)}
            onPointerLeave={() => setIsComparing(false)}
            onBlur={() => setIsComparing(false)}
            aria-pressed={isComparing}
            title="Mantén pulsado o usa la barra espaciadora para comparar"
          >
            <Icon name="compare" size={17} /><span>Antes / después</span>
          </button>
          <button className="open-button" type="button" onClick={openPicker}><Icon name="upload" size={17} /><span>Abrir foto</span></button>
          <button className="primary-button top-export" type="button" onClick={() => setShowExport(true)}><Icon name="export" size={17} /><span>Exportar</span></button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void acceptImage(file);
            event.currentTarget.value = '';
          }} />
          <input ref={addLayerInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void acceptImage(file, true);
            event.currentTarget.value = '';
          }} />
        </div>
      </header>

      <div className="workspace">
        <nav className="tool-rail" aria-label="Herramientas">
          <div className="rail-tools">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={'rail-tool' + (activeTool === tool.id ? ' is-active' : '')}
                aria-label={tool.label}
                aria-pressed={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id)}
              >
                <Icon name={tool.icon} size={20} />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
          <div className="rail-bottom">
            <button className="rail-tool" type="button" aria-label="Información" title="Atajos y uso local" onClick={() => showToast('Ctrl + O abre una foto · Ctrl + Z deshace · Ctrl + E exporta')}><Icon name="info" size={19} /><span>Ayuda</span></button>
            <div className="profile-mark" aria-label="NeoApp Studio">N</div>
          </div>
        </nav>

        <main
          className={'stage-area' + (isDragging ? ' is-dragging' : '')}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <div className="stage-toolbar">
            <div className="stage-breadcrumb">
              <span className="stage-file-icon"><Icon name="image" size={15} /></span>
              <span className="stage-title">Lienzo</span>
              <span className="breadcrumb-divider">/</span>
              <span className="stage-subtitle">{cropRatio ? cropLabel + ' · ' : ''}{meta.width} × {meta.height}</span>
            </div>
            <div className="zoom-controls" aria-label="Controles del lienzo">
              <button className="zoom-button" type="button" aria-label="Reducir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))}><Icon name="minus" size={15} /></button>
              <span>{zoom}%</span>
              <button className="zoom-button" type="button" aria-label="Ampliar zoom" onClick={() => setZoom((value) => Math.min(150, value + 10))}><Icon name="plus" size={15} /></button>
            </div>
          </div>

          <section className={'stage-canvas' + (zoom > 100 ? ' is-zoomed' : '')} aria-label="Vista previa de la fotografía">
            {photo ? (
              <div
                className="photo-frame"
                style={{ width: Math.round(frameWidth * zoom / 100) + 'px', maxWidth: 'none', aspectRatio: String(rotatedFrameRatio) }}
              >
                <img
                  className="photo-preview"
                  src={photo.src}
                  alt={meta.name}
                  draggable={false}
                  style={{
                    filter: isComparing ? 'none' : filter,
                    opacity: layerVisible ? layerOpacity / 100 : 0,
                    transform: 'rotate(' + rotation + 'deg) scaleX(' + (flipHorizontal ? -1 : 1) + ')',
                    objectFit: cropRatio ? 'cover' : 'contain',
                  }}
                />
                {overlayLayers.map((layer) => (
                  <img
                    key={layer.id}
                    className="photo-preview photo-overlay"
                    src={layer.src}
                    alt={layer.name}
                    draggable={false}
                    style={{
                      left: layer.x + '%', top: layer.y + '%', width: layer.scale + '%', height: 'auto',
                      opacity: layer.visible ? layer.opacity / 100 : 0,
                      filter: isComparing ? 'none' : filter,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}
                {!layerVisible && <div className="hidden-layer-notice"><Icon name="eye" size={16} /> Capa oculta</div>}
                {isComparing && <span className="compare-badge">ORIGINAL</span>}
                {meta.name === 'Quiet coast.svg' && <span className="sample-badge"><Icon name="spark" size={13} /> Imagen de muestra</span>}
              </div>
            ) : (
              <button className="empty-stage" type="button" onClick={openPicker}>
                <span className="empty-stage-icon"><Icon name="upload" size={27} /></span>
                <strong>Empieza con una foto</strong>
                <span>Elige una imagen de tu dispositivo o arrástrala aquí.</span>
                <em>JPG · PNG · WEBP · AVIF · hasta 100 MB</em>
              </button>
            )}
            {isDragging && <div className="drop-overlay"><span><Icon name="upload" size={24} /> Suelta la foto para abrirla</span></div>}
          </section>

          <footer className="stage-footer">
            <div className="stage-footer-left"><span className="footer-status-dot" /> {photo ? photoMegapixels + ' MP' : 'Sin imagen'} <span className="footer-separator">·</span> {photo ? 'Edición en este dispositivo' : 'Arrastra una foto para comenzar'}</div>
            <div className="stage-footer-right"><span>ESPACIO</span> Comparar <span className="footer-separator">·</span> <span>CTRL + Z</span> Deshacer</div>
          </footer>
        </main>

        <aside className="inspector" aria-label="Panel de edición">
          <div className="inspector-header">
            <div><span className="eyebrow">ESTUDIO</span><h1>{activeTool === 'adjust' ? 'Ajustes' : activeTool === 'crop' ? 'Recortar' : activeTool === 'looks' ? 'Estilos' : 'Capas'}</h1></div>
            <button className="reset-button" type="button" onClick={() => {
              if (activeTool === 'adjust' || activeTool === 'looks') editor.reset();
              else if (activeTool === 'crop') { setCropRatio(null); setRotation(0); setFlipHorizontal(false); }
              else if (selectedOverlay) updateSelectedOverlay({ opacity: 100, visible: true, x: 50, y: 50, scale: 50 });
              else { setLayerOpacity(100); setLayerVisible(true); }
              showToast('Cambios restaurados.');
            }}><Icon name="reset" size={14} /> Restablecer</button>
          </div>

          {activeTool === 'adjust' && (
            <div className="inspector-content">
              <section className="inspector-section histogram-section">
                <div className="section-heading"><div><span className="eyebrow">TONO</span><h2>Luz y color</h2></div><span className="section-index">01</span></div>
                <div className="histogram-wrap">{histogram.length ? <Histogram values={histogram} /> : <div className="histogram-empty" />}</div>
                <div className="histogram-scale"><span>Sombras</span><span>Medios tonos</span><span>Luz</span></div>
              </section>
              <section className="inspector-section slider-section">
                <div className="section-heading"><div><span className="eyebrow">BÁSICOS</span><h2>Balance de imagen</h2></div><button className="tiny-reset" type="button" title="Restablecer ajustes" onClick={() => editor.reset()}><Icon name="reset" size={14} /></button></div>
                <div className="slider-list">
                  {adjustmentRows.map((row) => (
                    <Slider
                      key={row.key}
                      label={row.label}
                      value={editor.adjustments[row.key]}
                      min={row.min}
                      max={row.max}
                      unit={row.key === 'temperature' ? '°' : ''}
                      onBegin={editor.beginAdjustment}
                      onChange={(value) => editor.changeAdjustment(row.key, value)}
                      onCommit={editor.commitAdjustment}
                    />
                  ))}
                </div>
              </section>
              <div className="inspector-note"><Icon name="device" size={15} /><span>Los cambios se aplican localmente y puedes deshacerlos.</span></div>
            </div>
          )}

          {activeTool === 'crop' && (
            <div className="inspector-content">
              <section className="inspector-section crop-section">
                <div className="section-heading"><div><span className="eyebrow">COMPOSICIÓN</span><h2>Proporción</h2></div><span className="section-index">02</span></div>
                <div className="ratio-grid">
                  {cropOptions.map((option) => (
                    <button key={option.label} className={'ratio-option' + (cropRatio === option.ratio ? ' is-selected' : '')} type="button" onClick={() => setCropRatio(option.ratio)}>
                      <span className={'ratio-shape ratio-' + option.label.replace(/[^0-9]/g, '')} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="panel-description">El recorte se centra en la imagen y se aplica al exportar.</p>
              </section>
              <section className="inspector-section crop-section">
                <div className="section-heading"><div><span className="eyebrow">ORIENTACIÓN</span><h2>Transformar</h2></div></div>
                <div className="transform-actions">
                  <button type="button" className="transform-button" onClick={() => setRotation((value) => (value + 270) % 360)}><Icon name="rotate" size={17} /> Girar izquierda</button>
                  <button type="button" className="transform-button" onClick={() => setRotation((value) => (value + 90) % 360)}><Icon name="rotate" size={17} /> Girar derecha</button>
                  <button type="button" className={'transform-button' + (flipHorizontal ? ' is-selected' : '')} onClick={() => setFlipHorizontal((value) => !value)}><Icon name="flip" size={17} /> Voltear horizontal</button>
                </div>
              </section>
              <div className="crop-summary"><span>Recorte activo</span><strong>{cropRatio ? cropLabel : 'Original'} <Icon name="chevron" size={14} /></strong></div>
            </div>
          )}

          {activeTool === 'looks' && (
            <div className="inspector-content">
              <section className="inspector-section looks-section">
                <div className="section-heading"><div><span className="eyebrow">PUNTO DE PARTIDA</span><h2>Estilos Neo</h2></div><span className="section-index">03</span></div>
                <p className="panel-description">Prueba una atmósfera y después afínala desde Ajustes.</p>
                <div className="preset-list">
                  {PRESETS.map((preset) => {
                    const active = Object.keys(preset.adjustments).every((key) => preset.adjustments[key as AdjustmentKey] === editor.adjustments[key as AdjustmentKey]);
                    return (
                      <button key={preset.id} className={'preset-card' + (active ? ' is-selected' : '')} type="button" onClick={() => choosePreset(preset.id)}>
                        <span className="preset-art" style={{ background: 'linear-gradient(135deg, ' + preset.swatches.join(', ') + ')' }}>
                          {preset.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                        </span>
                        <span className="preset-copy"><strong>{preset.name}</strong><small>{preset.description}</small></span>
                        {active && <span className="preset-check"><Icon name="check" size={14} /></span>}
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="inspector-note"><Icon name="spark" size={15} /><span>Los estilos cambian tus ajustes y se pueden modificar después.</span></div>
            </div>
          )}

          {activeTool === 'layers' && (
            <div className="inspector-content">
              <section className="inspector-section layer-section">
                <div className="section-heading"><div><span className="eyebrow">DOCUMENTO</span><h2>Capas</h2></div><span className="section-index">04</span></div>
                <div className="layer-list">
                  {[...overlayLayers].reverse().map((layer) => (
                    <div className={'layer-card' + (selectedLayerId === layer.id ? ' is-selected' : '')} key={layer.id}>
                      <button className={'layer-visibility' + (layer.visible ? ' is-visible' : '')} type="button" aria-label={layer.visible ? 'Ocultar capa' : 'Mostrar capa'} onClick={() => setOverlayLayers((items) => items.map((item) => item.id === layer.id ? { ...item, visible: !item.visible } : item))}><Icon name={layer.visible ? 'eye' : 'close'} size={16} /></button>
                      <button className="layer-select" type="button" onClick={() => setSelectedLayerId(layer.id)} aria-pressed={selectedLayerId === layer.id}>
                        <span className="layer-thumb"><img src={layer.src} alt="" /></span>
                        <span className="layer-copy"><strong>{layer.name}</strong><small>Imagen · Superpuesta</small></span>
                      </button>
                      <span className="layer-order">
                        <button type="button" aria-label="Subir capa" onClick={() => moveOverlay(layer.id, 1)}>↑</button>
                        <button type="button" aria-label="Bajar capa" onClick={() => moveOverlay(layer.id, -1)}>↓</button>
                        <button type="button" aria-label="Eliminar capa" onClick={() => removeOverlay(layer.id)}>×</button>
                      </span>
                    </div>
                  ))}
                  <div className={'layer-card' + (selectedLayerId === 'base' ? ' is-selected' : '')}>
                    <button className={'layer-visibility' + (layerVisible ? ' is-visible' : '')} type="button" aria-label={layerVisible ? 'Ocultar capa base' : 'Mostrar capa base'} onClick={() => setLayerVisible((value) => !value)}><Icon name={layerVisible ? 'eye' : 'close'} size={16} /></button>
                    <button className="layer-select" type="button" onClick={() => setSelectedLayerId('base')} aria-pressed={selectedLayerId === 'base'}>
                      <span className="layer-thumb"><img src={photo?.src ?? DEMO_IMAGE} alt="" /></span>
                      <span className="layer-copy"><strong>{meta.name}</strong><small>Imagen · Fondo</small></span>
                    </button>
                    <span className="layer-lock"><span /></span>
                  </div>
                </div>
                <label className="slider-row opacity-control">
                  <span className="slider-heading"><span>Opacidad</span><span className="slider-value">{selectedOpacity}%</span></span>
                  <input aria-label="Opacidad de capa" type="range" min="0" max="100" value={selectedOpacity} style={{ '--range-progress': selectedOpacity + '%' } as CSSProperties} onChange={(event) => selectedOverlay ? updateSelectedOverlay({ opacity: Number(event.currentTarget.value) }) : setLayerOpacity(Number(event.currentTarget.value))} />
                </label>
                {selectedOverlay && <>
                  <label className="slider-row layer-size-control">
                    <span className="slider-heading"><span>Tamaño</span><span className="slider-value">{selectedOverlay.scale}%</span></span>
                    <input aria-label="Tamaño de capa" type="range" min="10" max="150" value={selectedOverlay.scale} style={{ '--range-progress': Math.min(100, selectedOverlay.scale / 1.5) + '%' } as CSSProperties} onChange={(event) => updateSelectedOverlay({ scale: Number(event.currentTarget.value) })} />
                  </label>
                  <label className="slider-row layer-size-control">
                    <span className="slider-heading"><span>Posición horizontal</span><span className="slider-value">{selectedOverlay.x}%</span></span>
                    <input aria-label="Posición horizontal de capa" type="range" min="0" max="100" value={selectedOverlay.x} style={{ '--range-progress': selectedOverlay.x + '%' } as CSSProperties} onChange={(event) => updateSelectedOverlay({ x: Number(event.currentTarget.value) })} />
                  </label>
                  <label className="slider-row layer-size-control">
                    <span className="slider-heading"><span>Posición vertical</span><span className="slider-value">{selectedOverlay.y}%</span></span>
                    <input aria-label="Posición vertical de capa" type="range" min="0" max="100" value={selectedOverlay.y} style={{ '--range-progress': selectedOverlay.y + '%' } as CSSProperties} onChange={(event) => updateSelectedOverlay({ y: Number(event.currentTarget.value) })} />
                  </label>
                </>}
                <button className="add-layer-button" type="button" onClick={openAddLayerPicker}><Icon name="upload" size={16} /> Añadir imagen</button>
                <button className="replace-layer-button" type="button" onClick={openPicker}>Reemplazar imagen de fondo</button>
              </section>
              <div className="inspector-note"><Icon name="info" size={15} /><span>Ordena, oculta, cambia el tamaño y coloca hasta 20 capas, incluido el fondo. La exportación combina las capas visibles.</span></div>
            </div>
          )}

          <div className="inspector-bottom"><span className="local-shield"><Icon name="check" size={13} /></span><span>Tus fotos permanecen en tu dispositivo.</span></div>
        </aside>
      </div>

      {toast && <div className="toast" role="status"><span className="toast-mark"><Icon name="check" size={14} /></span>{toast}</div>}
      {showExport && photo && (
        <ExportDialog
          fileName={meta.name}
          width={Math.round(exportWidth * exportScale)}
          height={Math.round(exportHeight * exportScale)}
          onClose={() => setShowExport(false)}
          onExport={(format, name, quality) => void exportNow(format, name, quality)}
        />
      )}
      {isExporting && <div className="exporting-indicator" role="status"><span className="loading-dot" /> Preparando exportación…</div>}
    </div>
  );
}

