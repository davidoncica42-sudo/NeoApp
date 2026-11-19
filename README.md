# NeoApp

**NeoApp Photo Studio** es el inicio de un editor fotográfico para PC y tablet. La interfaz se adapta a pantallas táctiles y de escritorio; las fotos se abren, editan y exportan en el propio dispositivo.

## Lo que funciona ahora

- Abrir JPG, PNG, WebP, AVIF y GIF desde el dispositivo o arrastrarlos al lienzo.
- Ajustar exposición, contraste, iluminaciones, sombras, temperatura y saturación con vista previa inmediata.
- Aplicar cinco estilos de color y comparar la foto original con el resultado.
- Recortar al centro en proporciones libre, 1:1, 4:5, 3:2 o 16:9; girar y voltear horizontalmente.
- Cambiar la visibilidad y opacidad de la capa de imagen.
- Deshacer y rehacer cambios de ajustes; usar atajos de teclado.
- Exportar a JPEG, PNG o WebP.
- Instalar como aplicación web progresiva cuando se sirva por HTTPS.
- Empaquetar la versión de escritorio de Windows con Tauri 2.

La imagen de muestra del editor es una ilustración vectorial incluida en el proyecto. Sirve para probar los controles antes de abrir una foto propia.

## Plataformas

**Windows 11:** ventana de escritorio nativa mediante Tauri 2. La interfaz funciona en tamaños de escritorio y el instalador se genera con Tauri.

**Tablets:** versión web progresiva adaptable, instalable desde un navegador compatible cuando la app se publique en un sitio HTTPS.

## Desarrollo

Requisitos: Node.js 20.19 o posterior (o 22.12 o posterior) para Vite 8. Para compilar la aplicación de Windows también se necesitan Rust y los componentes de compilación de escritorio requeridos por Tauri.

Instala las dependencias y abre el editor en modo desarrollo:

    npm install
    npm run dev

Para ver la interfaz desde una tablet en la misma red local durante el desarrollo:

    npm run dev -- --host 0.0.0.0

Genera la versión web:

    npm run build

Abre o empaqueta NeoApp para Windows:

    npm run tauri -- dev
    npm run tauri -- build

El instalador de Windows queda dentro de src-tauri/target/release/bundle/.

## Organización del código

- src/App.tsx: interfaz y flujo principal del editor.
- src/components/: controles reutilizables, vista del histograma, iconos y diálogo de exportación.
- src/data/presets.ts: estilos de color incluidos.
- src/hooks/useEditorState.ts: ajustes e historial de deshacer/rehacer.
- src/lib/imageProcessing.ts: filtros, lectura del histograma y exportación mediante Canvas.
- public/: icono, manifiesto PWA, caché sin conexión e ilustración de muestra.
- src-tauri/: configuración y punto de entrada de escritorio para Tauri 2.

## Privacidad y límites de esta primera versión

- Las fotos no se cargan a un servidor. La vista previa y el archivo exportado se generan en el dispositivo.
- Se aceptan archivos de hasta 100 MB y 100 megapíxeles. La exportación limita el tamaño a 48 megapíxeles y 12.000 px por lado para controlar el uso de memoria.
- Los ajustes de color se aplican con filtros Canvas del navegador. Iluminaciones y sombras tienen un efecto aproximado; las curvas y el revelado RAW todavía no están implementados.
- Esta versión contiene una sola capa de imagen, con control de visibilidad y opacidad. Las capas múltiples, máscaras, selecciones, eliminación de fondo y guardado de proyectos son trabajo futuro.
- El historial cubre los ajustes y estilos; el recorte y la transformación se configuran por separado.
- El navegador puede consumir memoria adicional al abrir fotos grandes. Cerrar o reemplazar una foto libera la vista previa anterior.

## Tecnologías

| Tecnología | Uso |
|---|---|
| React + TypeScript | Interfaz adaptable y controles |
| Vite | Desarrollo y compilación web |
| Canvas 2D | Previsualización y exportación local |
| Tauri 2 + Rust | Aplicación de escritorio para Windows |
| PWA | Instalación web para tablets |

**Versión:** 0.2.0 · **Estado:** primera versión funcional en desarrollo.

© 2026 NeoApp.
