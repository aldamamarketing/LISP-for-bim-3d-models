import JSZip from 'jszip';
import fileSaver from 'file-saver';
const { saveAs } = fileSaver;

/**
 * Convierte un string SVG a un Blob PNG usando Canvas
 */
const svgToPngBlob = (svgString, width, height, colorCode, accentColor) => {
  return new Promise((resolve, reject) => {
    // Reemplazar currentColor por el color deseado (Dark mode = blanco, Light mode = negro)
    let coloredSvg = svgString.replace(/currentColor/g, colorCode);
    
    // Reemplazar la variable CSS dinámica por el color de acento hexadecimal real para la exportación a PNG
    if (accentColor) {
      coloredSvg = coloredSvg.replace(/var\(--icon-accent\)/g, accentColor);
    }
    
    // Crear Blob del SVG
    const svgBlob = new Blob([coloredSvg], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Dibujar la imagen escalada en el canvas
      ctx.drawImage(img, 0, 0, width, height);
      DOMURL.revokeObjectURL(url);
      
      // Obtener el blob PNG
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Fallo al convertir a Blob"));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      DOMURL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

/**
 * Empaqueta la lista de iconos seleccionados en un ZIP
 * @param {Array} selectedIcons - Array de { filename, svgCode }
 */
export const exportIconsToZip = async (selectedIcons, accentColor = '#f26d21') => {
  const zip = new JSZip();
  
  // Carpetas organizativas
  const folderDark = zip.folder("Dark_Theme_Icons");
  const folderLight = zip.folder("Light_Theme_Icons");
  const folderSVG = zip.folder("Source_SVG");

  // Colores para forzar en AutoCAD
  const COLOR_DARK_THEME = "#FFFFFF"; // Para que resalte en el fondo gris oscuro de AutoCAD
  const COLOR_LIGHT_THEME = "#1A1A1A"; // Para el fondo claro

  for (const icon of selectedIcons) {
    const baseName = icon.filename;
    
    // 1. Guardar el original en SVG (reemplazando la variable por el color real si es necesario, o dejándola para uso web)
    const finalSvgCode = icon.svgCode.replace(/var\(--icon-accent\)/g, accentColor);
    folderSVG.file(`${baseName}.svg`, finalSvgCode);

    try {
      // 2. Generar PNGs para DARK THEME (Color Blanco)
      const png16Dark = await svgToPngBlob(icon.svgCode, 16, 16, COLOR_DARK_THEME, accentColor);
      const png32Dark = await svgToPngBlob(icon.svgCode, 32, 32, COLOR_DARK_THEME, accentColor);
      
      folderDark.file(`${baseName}_16x16.png`, png16Dark);
      folderDark.file(`${baseName}_32x32.png`, png32Dark);

      // 3. Generar PNGs para LIGHT THEME (Color Negro/Oscuro)
      const png16Light = await svgToPngBlob(icon.svgCode, 16, 16, COLOR_LIGHT_THEME, accentColor);
      const png32Light = await svgToPngBlob(icon.svgCode, 32, 32, COLOR_LIGHT_THEME, accentColor);
      
      folderLight.file(`${baseName}_16x16.png`, png16Light);
      folderLight.file(`${baseName}_32x32.png`, png32Light);
      
    } catch (error) {
      console.error(`Error procesando el icono ${baseName}:`, error);
    }
  }

  // Generar y descargar el archivo final
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "AutoCAD_IconPack.zip");
};
